import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Bluetooth, 
  Cable, 
  Send, 
  RefreshCw, 
  Settings, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Wrench,
  Trash2, 
  Copy, 
  Cpu, 
  Sliders, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Zap,
  Info,
  Terminal as TerminalIcon,
  Sparkles,
  X,
  Layers,
  PanelLeft,
  Maximize2
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface IrxonAtCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LogEntry {
  id: string;
  time: string;
  type: 'tx' | 'rx' | 'info' | 'error' | 'success';
  text: string;
}

export const IrxonAtCommandModal: React.FC<IrxonAtCommandModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Connection states
  const [connectionType, setConnectionType] = useState<'ble' | 'serial' | 'sim'>('ble');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Hardware objects
  const [btDevice, setBtDevice] = useState<any>(null);
  const [btRxChar, setBtRxChar] = useState<any>(null);
  const [btTxChar, setBtTxChar] = useState<any>(null);
  const [serialPort, setSerialPort] = useState<any>(null);
  const [serialWriter, setSerialWriter] = useState<any>(null);

  // View Layout Modes: 'settings' | 'console' | 'split'
  const [activeViewMode, setActiveViewMode] = useState<'settings' | 'console' | 'split'>('settings');

  // Active AT settings form state
  const [selectedBaud, setSelectedBaud] = useState<string>('9600');
  const [baudSyntax, setBaudSyntax] = useState<'standard' | 'extended' | 'nordic'>('standard');
  const [customName, setCustomName] = useState<string>('IRXON-CONSOLE');
  const [customPin, setCustomPin] = useState<string>('1234');
  const [selectedParity, setSelectedParity] = useState<string>('none');
  const [selectedRole, setSelectedRole] = useState<string>('slave');
  const [lineEnding, setLineEnding] = useState<string>('crlf'); // 'crlf', 'cr', 'lf', 'none'
  const [customCommand, setCustomCommand] = useState<string>('AT');
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [showTroubleshootBanner, setShowTroubleshootBanner] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'troubleshoot' | 'guide'>('presets');
  const [lastRxMessage, setLastRxMessage] = useState<{ text: string; time: string; type: string } | null>(null);

  // Logs & History
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      type: 'info',
      text: 'IRXON AT Command & Hardware Configurator siap. Pilih mode koneksi (Web Bluetooth BLE atau Web Serial COM) lalu hubungkan ke adaptor IRXON.',
    }
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>(['AT', 'AT+VERSION', 'AT+BAUD?', 'AT+NAME?']);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleSafeClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSafeClose = () => {
    // If device is actively connected in serial/ble, safely disconnect or close writer
    try {
      if (serialPort && serialWriter) {
        serialWriter.releaseLock?.();
      }
    } catch (e) {
      console.warn('Error during close cleanup:', e);
    }
    onClose();
  };

  const appendLog = (type: LogEntry['type'], text: string) => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      time: new Date().toLocaleTimeString(),
      type,
      text,
    };
    setLogs((prev) => [...prev, entry]);
    if (type === 'rx' || type === 'success' || type === 'error' || type === 'tx') {
      setLastRxMessage({ text, time: entry.time, type });
    }
  };

  // 1. Connect via Web Bluetooth (BLE)
  const handleConnectBle = async () => {
    setIsConnecting(true);
    setStatusMessage('Membuka pencarian Web Bluetooth...');
    appendLog('info', 'Mencari perangkat IRXON Bluetooth (BLE)...');

    try {
      if (!('bluetooth' in navigator)) {
        throw new Error('Web Bluetooth API tidak didukung di browser ini. Gunakan Chrome/Edge di Android atau Desktop.');
      }

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000ffe0-0000-1000-8000-00805f9b34fb', // Standard HM-10 / Irxon BLE UART
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent Serial
          '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / Realtek BLE
          '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
        ],
      });

      appendLog('info', `Menghubungkan ke GATT Server: ${device.name || 'IRXON Device'}...`);
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Gagal menghubungkan ke GATT Server');

      // Try discovering UART service
      let uartService: any = null;
      const serviceUUIDs = [
        '0000ffe0-0000-1000-8000-00805f9b34fb',
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000fee7-0000-1000-8000-00805f9b34fb',
      ];

      for (const uuid of serviceUUIDs) {
        try {
          uartService = await server.getPrimaryService(uuid);
          if (uartService) break;
        } catch (e) {
          // try next
        }
      }

      if (!uartService) {
        // Fallback: list all services
        const services = await server.getPrimaryServices();
        if (services.length > 0) {
          uartService = services[0];
        }
      }

      if (!uartService) {
        throw new Error('Layanan BLE UART/Serial tidak ditemukan pada perangkat ini.');
      }

      // Discover characteristics
      const chars = await uartService.getCharacteristics();
      let writeChar: any = null;
      let notifyChar: any = null;

      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          writeChar = c;
        }
        if (c.properties.notify || c.properties.indicate || c.properties.read) {
          notifyChar = c;
        }
      }

      if (!writeChar && notifyChar) writeChar = notifyChar;
      if (!notifyChar && writeChar) notifyChar = writeChar;

      if (!writeChar) {
        throw new Error('Karakteristik Write untuk mengirim AT Command tidak ditemukan.');
      }

      // Start notifications if available
      if (notifyChar && (notifyChar.properties.notify || notifyChar.properties.indicate)) {
        try {
          await notifyChar.startNotifications();
          notifyChar.addEventListener('characteristicvaluechanged', (event: any) => {
            const value = event.target.value;
            const decoder = new TextDecoder();
            const text = decoder.decode(value);
            const rawBytes = Array.from(new Uint8Array(value.buffer)).map(b => b.toString(16).padStart(2,'0').toUpperCase()).join(' ');
            appendLog('rx', `${text.trim() || `[Hex: ${rawBytes}]`}`);
          });
        } catch (e) {
          console.warn('Could not start notifications:', e);
        }
      }

      setBtDevice(device);
      setBtTxChar(writeChar);
      setBtRxChar(notifyChar);
      setIsConnected(true);
      setConnectedDeviceName(device.name || 'IRXON Bluetooth Adapter');
      appendLog('success', `[TERHUBUNG] Sukses terkoneksi ke "${device.name || 'IRXON Adapter'}" via Bluetooth GATT.`);
      setStatusMessage(`Terhubung: ${device.name || 'IRXON'}`);

    } catch (err: any) {
      appendLog('error', `Gagal koneksi Bluetooth: ${err.message}`);
      setStatusMessage('Gagal koneksi');
    } finally {
      setIsConnecting(false);
    }
  };

  // 2. Connect via Web Serial (Virtual COM / USB Config Cable)
  const handleConnectSerial = async () => {
    setIsConnecting(true);
    setStatusMessage('Membuka dialog Web Serial COM Port...');
    appendLog('info', `Membuka Web Serial Port pada baud rate ${selectedBaud} bps...`);

    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API tidak didukung di browser ini. Gunakan Chrome atau Edge.');
      }

      const port = await (navigator as any).serial.requestPort();
      await port.open({
        baudRate: parseInt(selectedBaud, 10) || 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });

      const writer = port.writable.getWriter();
      setSerialPort(port);
      setSerialWriter(writer);
      setIsConnected(true);
      setConnectedDeviceName(`Serial COM (${selectedBaud} bps)`);
      appendLog('success', `[TERHUBUNG] Port Serial COM terbuka pada baud rate ${selectedBaud} bps. Siap mengirim AT Command.`);
      setStatusMessage(`Terhubung: Serial COM (${selectedBaud})`);

      // Start direct byte reading loop
      readSerialDirectLoop(port);

    } catch (err: any) {
      appendLog('error', `Gagal koneksi Serial: ${err.message}`);
      setStatusMessage('Gagal koneksi serial');
    } finally {
      setIsConnecting(false);
    }
  };

  // Read serial direct chunk loop without stream buffering
  const readSerialDirectLoop = async (port: any) => {
    try {
      while (port.readable) {
        const reader = port.readable.getReader();
        const decoder = new TextDecoder();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value && value.length > 0) {
              const text = decoder.decode(value);
              const hex = Array.from(value).map((b: any) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
              appendLog('rx', `${text.trim() || `[Hex: ${hex}]`}`);
            }
          }
        } catch (error) {
          console.warn('Serial read loop error:', error);
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err) {
      console.warn('Port readable error:', err);
    }
  };

  // 3. Connect Simulator Mode
  const handleConnectSim = () => {
    setIsConnected(true);
    setConnectedDeviceName('IRXON BT578 Simulator (V3.2)');
    appendLog('success', '[SIMULATOR] Mode Simulasi Hardware IRXON BT578 diaktifkan. Anda dapat mencoba semua variasi AT Command dengan respons instan.');
    setStatusMessage('Simulasi IRXON Aktif');
  };

  // Disconnect
  const handleDisconnect = async () => {
    try {
      if (btDevice && btDevice.gatt?.connected) {
        btDevice.gatt.disconnect();
      }
      if (serialWriter) {
        await serialWriter.close();
      }
      if (serialPort) {
        await serialPort.close();
      }
    } catch (e) {
      // ignore
    }
    setIsConnected(false);
    setBtDevice(null);
    setBtTxChar(null);
    setSerialPort(null);
    setSerialWriter(null);
    setConnectedDeviceName('');
    appendLog('info', 'Koneksi ke IRXON terputus.');
    setStatusMessage('Terputus');
  };

  // Format line endings
  const formatPayload = (cmd: string, customEnding?: string) => {
    const ending = customEnding !== undefined ? customEnding : lineEnding;
    switch (ending) {
      case 'crlf': return `${cmd}\r\n`;
      case 'cr': return `${cmd}\r`;
      case 'lf': return `${cmd}\n`;
      case 'none': return cmd;
      default: return `${cmd}\r\n`;
    }
  };

  // Send raw command across active transport
  const sendCommand = async (rawCmd: string, forceEnding?: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    appendLog('tx', `${trimmed} [Format: ${forceEnding || lineEnding}]`);

    // Save to history
    setCommandHistory((prev) => [trimmed, ...prev.filter((c) => c !== trimmed)].slice(0, 30));
    setHistoryIndex(-1);

    if (connectionType === 'sim' || !isConnected) {
      handleSimulatedResponse(trimmed);
      return;
    }

    if (connectionType === 'ble' && btTxChar) {
      await executeRawCommand(trimmed, btTxChar, forceEnding);
    } else if (connectionType === 'serial' && serialWriter) {
      await sendSerialCommand(trimmed, serialWriter, forceEnding);
    } else {
      appendLog('error', 'Tidak ada media transmisi yang aktif. Hubungkan perangkat terlebih dahulu.');
    }
  };

  const executeRawCommand = async (cmd: string, char: any, forceEnding?: string) => {
    try {
      const payload = formatPayload(cmd, forceEnding);
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);

      if (char.writeValueWithResponse) {
        await char.writeValueWithResponse(data);
      } else if (char.writeValueWithoutResponse) {
        await char.writeValueWithoutResponse(data);
      } else if (char.writeValue) {
        await char.writeValue(data);
      }
    } catch (e: any) {
      appendLog('error', `Gagal mengirim ke BLE: ${e.message}`);
    }
  };

  const sendSerialCommand = async (cmd: string, writer: any, forceEnding?: string) => {
    try {
      const payload = formatPayload(cmd, forceEnding);
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(payload));
    } catch (e: any) {
      appendLog('error', `Gagal menulis ke Serial Port: ${e.message}`);
    }
  };

  // Precise Guard-Time Escape Sequence (1s silence -> +++ -> 1s silence -> a / AT)
  const handleGuardTimeEscape = async () => {
    if (!isConnected && connectionType !== 'sim') {
      appendLog('error', 'Hubungkan IRXON terlebih dahulu sebelum mengirim Escape Sequence.');
      return;
    }

    setIsProbing(true);
    appendLog('info', '⏳ [ESCAPE MODE] Langkah 1: Memberikan 1100ms waktu hening (Guard Time Silence)...');
    await new Promise((r) => setTimeout(r, 1100));

    appendLog('info', '⚡ [ESCAPE MODE] Langkah 2: Mengirim karakter escape "+++" tanpa akhiran baris...');
    await sendCommand('+++', 'none');

    appendLog('info', '⏳ [ESCAPE MODE] Langkah 3: Memberikan 1100ms waktu hening pasca-escape...');
    await new Promise((r) => setTimeout(r, 1100));

    appendLog('info', '📡 [ESCAPE MODE] Langkah 4: Mengirim sinyal konfirmasi AT command...');
    await sendCommand('AT', 'crlf');

    setIsProbing(false);
    appendLog('info', '🏁 [ESCAPE MODE SELESAI] Jika lampu hijau berhenti berkedip diam dan beralih ke mode command, IRXON akan membalas OK.');
  };

  // Auto-Probe Sequence to find responsive syntax
  const handleAutoProbe = async () => {
    if (!isConnected && connectionType !== 'sim') {
      appendLog('error', 'Hubungkan IRXON terlebih dahulu sebelum menjalankan Auto-Probe.');
      return;
    }

    setIsProbing(true);
    appendLog('info', '🔍 [AUTO-PROBE] Memulai pengetesan otomatis respon AT Command IRXON...');
    appendLog('info', '💡 Petunjuk: Jika lampu HIJAU di adaptor IRXON menyala saat probe, itu membuktikan sinyal berhasil sampai di adaptor!');

    const probeVariants = [
      { cmd: '+++', ending: 'none', label: 'Escape Sequence [+++]' },
      { cmd: 'AT', ending: 'none', label: 'Raw [AT] (Tanpa Line Ending)' },
      { cmd: 'AT', ending: 'crlf', label: '[AT\\r\\n] (CRLF Standar)' },
      { cmd: 'AT', ending: 'cr', label: '[AT\\r] (CR)' },
      { cmd: 'AT', ending: 'lf', label: '[AT\\n] (LF)' },
      { cmd: 'AT+VERSION', ending: 'crlf', label: '[AT+VERSION\\r\\n]' },
      { cmd: 'AT+BAUD?', ending: 'crlf', label: '[AT+BAUD?\\r\\n]' },
    ];

    for (const p of probeVariants) {
      appendLog('info', `Menguji: ${p.label}...`);
      await sendCommand(p.cmd, p.ending);
      await new Promise((r) => setTimeout(r, 700));
    }

    setIsProbing(false);
    appendLog('info', '🏁 [AUTO-PROBE SELESAI]');
    appendLog('info', '📌 Jika lampu HIJAU menyala tetapi belum ada balasan OK: Adaptor berada di mode Transparent Data (meneruskan data ke port DB9 fisik). Silakan gunakan tab "USB Cable / Virtual COM" dengan kabel setting bawaan IRXON atau klik tombol "Escape Mode".');
  };

  // Realistic Simulator Response Engine for IRXON BT578 / BT580
  const handleSimulatedResponse = (cmd: string) => {
    const upper = cmd.toUpperCase();

    setTimeout(() => {
      if (upper === 'AT') {
        appendLog('rx', 'OK');
      } else if (upper.startsWith('AT+VERSION')) {
        appendLog('rx', 'IRXON BT578 V3.2 EDR Firmware 2026.04.18 OK');
      } else if (upper.startsWith('AT+BAUD')) {
        if (upper.includes('?') || upper === 'AT+BAUD') {
          appendLog('rx', `+BAUD:${selectedBaud},OK`);
        } else {
          // e.g. AT+BAUD4 or AT+BAUD=115200
          appendLog('rx', `OK+Set:BAUD ${cmd.replace(/AT\+BAUD=?/i, '')}`);
          appendLog('info', '⚠️ Catatan: Baud rate fisik IRXON telah tersimpan di flash memory adaptor. Sambungkan ulang dengan baud rate baru.');
        }
      } else if (upper.startsWith('AT+NAME')) {
        if (upper.includes('?') || upper === 'AT+NAME') {
          appendLog('rx', `+NAME:${customName},OK`);
        } else {
          const newName = cmd.replace(/AT\+NAME=?/i, '');
          setCustomName(newName);
          appendLog('rx', `OK+Set:NAME "${newName}"`);
        }
      } else if (upper.startsWith('AT+PIN')) {
        if (upper.includes('?') || upper === 'AT+PIN') {
          appendLog('rx', `+PIN:${customPin},OK`);
        } else {
          const newPin = cmd.replace(/AT\+PIN=?/i, '');
          setCustomPin(newPin);
          appendLog('rx', `OK+Set:PIN "${newPin}"`);
        }
      } else if (upper.startsWith('AT+ADDR')) {
        appendLog('rx', '+ADDR:00:1B:DC:06:9A:88,OK');
      } else if (upper.startsWith('AT+ROLE')) {
        if (upper.includes('?') || upper === 'AT+ROLE') {
          appendLog('rx', `+ROLE:${selectedRole === 'slave' ? 'S' : 'M'},OK`);
        } else {
          appendLog('rx', `OK+Set:ROLE ${cmd.includes('M') ? 'Master' : 'Slave'}`);
        }
      } else if (upper.startsWith('AT+DEFAULT') || upper.startsWith('AT+RESET')) {
        appendLog('rx', 'OK+RESTORE_FACTORY_DEFAULTS (9600,8,N,1 PIN:1234)');
      } else if (upper.startsWith('AT+HELP')) {
        appendLog('rx', 'AVAILABLE: AT, AT+VERSION, AT+BAUD, AT+NAME, AT+PIN, AT+ROLE, AT+ADDR, AT+DEFAULT');
      } else {
        appendLog('rx', 'OK');
      }
    }, 250);
  };

  // Helper to generate AT command for Baud rate
  const getBaudCommand = (baud: string) => {
    if (baudSyntax === 'standard') {
      // IRXON standard baud index
      const mapping: Record<string, string> = {
        '1200': 'AT+BAUD1',
        '2400': 'AT+BAUD2',
        '4800': 'AT+BAUD3',
        '9600': 'AT+BAUD4',
        '19200': 'AT+BAUD5',
        '38400': 'AT+BAUD6',
        '57600': 'AT+BAUD7',
        '115200': 'AT+BAUD8',
        '230400': 'AT+BAUD9',
      };
      return mapping[baud] || `AT+BAUD=${baud}`;
    } else if (baudSyntax === 'extended') {
      return `AT+BAUD=${baud}`;
    } else {
      return `AT+BAUD:${baud}`;
    }
  };

  const handleApplyBaud = () => {
    const cmd = getBaudCommand(selectedBaud);
    sendCommand(cmd);
  };

  const handleApplyName = () => {
    if (!customName.trim()) return;
    const cmd = baudSyntax === 'extended' ? `AT+NAME=${customName.trim()}` : `AT+NAME${customName.trim()}`;
    sendCommand(cmd);
  };

  const handleApplyPin = () => {
    if (!customPin.trim()) return;
    const cmd = baudSyntax === 'extended' ? `AT+PIN=${customPin.trim()}` : `AT+PIN${customPin.trim()}`;
    sendCommand(cmd);
  };

  const handleApplyParity = () => {
    if (selectedParity === 'even') sendCommand('AT+PE');
    else if (selectedParity === 'odd') sendCommand('AT+PO');
    else sendCommand('AT+PN');
  };

  const handleApplyRole = () => {
    if (selectedRole === 'master') sendCommand('AT+ROLE=M');
    else sendCommand('AT+ROLE=S');
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendCommand(customCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const nextIdx = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(nextIdx);
        setCustomCommand(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setCustomCommand(commandHistory[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCustomCommand('');
      }
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
    copyToClipboard(text);
    appendLog('info', '📋 Log AT Command disalin ke clipboard.');
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  if (!isOpen) return null;

  return (
    <div 
      id="modal-irxon-at-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSafeClose();
        }
      }}
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div 
        id="modal-irxon-at-box"
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  IRXON AT Command & Hardware Configurator
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-semibold">
                  BT578 / BT580
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ubah Baud Rate, Nama Bluetooth, PIN Pairing, dan Paritas adaptor IRXON langsung lewat Bluetooth atau Serial Port
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-irxon-at-modal-header"
            onClick={handleSafeClose}
            aria-label="Tutup Menu IRXON"
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Connection Bar */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Connection Mode Radios */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => { setConnectionType('ble'); }}
              disabled={isConnected}
              className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all text-xs ${
                connectionType === 'ble'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bluetooth className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Web Bluetooth (BLE)</span>
              <span className="sm:hidden">BLE</span>
            </button>

            <button
              onClick={() => { setConnectionType('serial'); }}
              disabled={isConnected}
              className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all text-xs ${
                connectionType === 'serial'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cable className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">USB Cable / COM</span>
              <span className="sm:hidden">USB/COM</span>
            </button>

            <button
              onClick={() => { setConnectionType('sim'); }}
              disabled={isConnected}
              className={`px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all text-xs ${
                connectionType === 'sim'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden sm:inline">Simulator</span>
              <span className="sm:hidden">Sim</span>
            </button>
          </div>

          {/* Action Connect / Disconnect */}
          <div className="flex items-center gap-2 ml-auto">
            {isConnected ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono font-medium text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {connectedDeviceName || 'Connected'}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-md transition-colors text-xs"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={
                  connectionType === 'ble'
                    ? handleConnectBle
                    : connectionType === 'serial'
                    ? handleConnectSerial
                    : handleConnectSim
                }
                disabled={isConnecting}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold rounded-md shadow-md flex items-center gap-1.5 transition-all text-xs"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Hubungkan IRXON</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Bar (Mobile & Desktop View Control) */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveViewMode('settings')}
              className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                activeViewMode === 'settings'
                  ? 'bg-cyan-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>1. Panel Setting & Presets</span>
            </button>

            <button
              onClick={() => setActiveViewMode('console')}
              className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all ${
                activeViewMode === 'console'
                  ? 'bg-cyan-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>2. AT Console Monitor</span>
              {logs.filter(l => l.type === 'rx').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-900 text-emerald-300 font-mono text-[10px]">
                  {logs.filter(l => l.type === 'rx').length} RX
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveViewMode('split')}
              className={`hidden lg:flex px-3 py-1 rounded-md font-medium items-center gap-1.5 transition-all ${
                activeViewMode === 'split'
                  ? 'bg-slate-700 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Split (Berdampingan)</span>
            </button>
          </div>

          {/* Quick Info & Active Status */}
          {lastRxMessage && (
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 truncate max-w-xs">
              <span className="text-emerald-400 font-bold">RX:</span>
              <span className="truncate text-emerald-300 font-semibold">{lastRxMessage.text}</span>
            </div>
          )}
        </div>

        {/* Main Content Layout */}
        <div className={`flex-1 overflow-hidden min-h-0 ${
          activeViewMode === 'split' 
            ? 'grid grid-cols-1 lg:grid-cols-12' 
            : 'flex flex-col'
        }`}>
          
          {/* Left Column: Configurator & Presets (Visible when activeViewMode is 'settings' or 'split') */}
          <div className={`${
            activeViewMode === 'console' ? 'hidden' : 'flex'
          } ${
            activeViewMode === 'split' ? 'lg:col-span-7 lg:border-r border-slate-800' : 'w-full'
          } flex-col overflow-y-auto p-4 space-y-4`}>
            
            {/* Tabs */}
            <div className="flex items-center border-b border-slate-800 pb-2 gap-2 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab('presets')}
                className={`pb-1 px-2 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'presets'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Parameter Konfigurasi</span>
              </button>

              <button
                onClick={() => setActiveTab('custom')}
                className={`pb-1 px-2 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'custom'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>Custom AT Manual</span>
              </button>

              <button
                onClick={() => setActiveTab('troubleshoot')}
                className={`pb-1 px-2 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'troubleshoot'
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Solusi Tidak Ada Respon</span>
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`pb-1 px-2 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  activeTab === 'guide'
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Petunjuk Hardware</span>
              </button>
            </div>

            {/* Quick Auto-Probe Bar with Green LED Diagnostic */}
            <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-950 to-emerald-950/40 border border-amber-800/40 rounded-xl flex flex-col gap-2.5 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping mt-1 shrink-0" />
                  <div>
                    <span className="font-bold text-amber-200 flex items-center gap-1.5">
                      Lampu Hijau Menyala Saat Kirim Teks tapi Tidak Ada Balasan "OK"?
                    </span>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      <strong>Lampu Hijau = Data berhasil sampai di IRXON!</strong> Lampu hijau membuktikan sinyal Anda aktif dan sedang diteruskan ke port DB9 fisik (Transparent Bridge Mode). Untuk mengubah baud rate / nama modul, gunakan salah satu solusi di bawah:
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                <button
                  onClick={handleGuardTimeEscape}
                  disabled={isProbing}
                  title="Mengirim Escape Sequence +++ dengan jeda hening 1.1 detik sebelum dan sesudah untuk memaksa IRXON masuk ke Command Mode"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-xs"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>⚡ Escape Mode (1s Guard Time)</span>
                </button>

                <button
                  onClick={handleAutoProbe}
                  disabled={isProbing}
                  className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all text-xs"
                >
                  {isProbing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menguji Probe...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Auto-Probe Line Ending</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('troubleshoot')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-800/40 rounded-lg text-xs font-medium transition-colors ml-auto flex items-center gap-1"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Panduan Kabel Setting USB &gt;</span>
                </button>
              </div>
            </div>

            {/* TAB 1: PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-4 text-xs">
                
                {/* 1. BAUD RATE CONFIGURATOR */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      1. Ganti Baud Rate Internal IRXON
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Perintah: <code className="text-cyan-300">{getBaudCommand(selectedBaud)}</code>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {['1200', '2400', '4800', '9600', '19200', '38400', '57600', '115200', '230400'].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setSelectedBaud(rate)}
                        className={`p-1.5 rounded text-center font-mono font-medium transition-all ${
                          selectedBaud === rate
                            ? 'bg-cyan-600 text-white font-bold ring-2 ring-cyan-400/50 shadow'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                        }`}
                      >
                        {rate}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Format Sintaks:</span>
                      <select
                        value={baudSyntax}
                        onChange={(e) => setBaudSyntax(e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                      >
                        <option value="standard">Standard IRXON (AT+BAUD4/8)</option>
                        <option value="extended">Extended (AT+BAUD=115200)</option>
                        <option value="nordic">Nordic/BLE (AT+BAUD:115200)</option>
                      </select>
                    </div>

                    <button
                      onClick={handleApplyBaud}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-md shadow flex items-center gap-1 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      Set Baud Rate
                    </button>
                  </div>
                </div>

                {/* 2. DEVICE NAME & PIN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Name */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-400" />
                      2. Ganti Nama Bluetooth
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Contoh: IRXON-CISCO"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:border-cyan-500 outline-none"
                      />
                      <button
                        onClick={handleApplyName}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
                      >
                        Set
                      </button>
                    </div>
                  </div>

                  {/* PIN */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      3. Ganti PIN Pairing (4-Digit)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customPin}
                        maxLength={8}
                        onChange={(e) => setCustomPin(e.target.value)}
                        placeholder="Default: 1234"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:border-amber-500 outline-none"
                      />
                      <button
                        onClick={handleApplyPin}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium transition-colors"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. PARITY & ROLE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Parity */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-200">4. Paritas Serial</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedParity}
                        onChange={(e) => setSelectedParity(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                      >
                        <option value="none">None (8-N-1 Default)</option>
                        <option value="even">Even (8-E-1)</option>
                        <option value="odd">Odd (8-O-1)</option>
                      </select>
                      <button
                        onClick={handleApplyParity}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-medium"
                      >
                        Kirim
                      </button>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <span className="font-semibold text-slate-200">5. Mode Role</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-slate-200"
                      >
                        <option value="slave">Slave Mode (Default untuk HP/PC)</option>
                        <option value="master">Master Mode (Hubungkan ke adapter lain)</option>
                      </select>
                      <button
                        onClick={handleApplyRole}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-medium"
                      >
                        Kirim
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. QUICK DIAGNOSTICS */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-300">Diagnosa & Ping Cepat:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => sendCommand('AT')}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[11px]"
                    >
                      AT (Ping Test)
                    </button>
                    <button
                      onClick={() => sendCommand('AT+VERSION')}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[11px]"
                    >
                      AT+VERSION
                    </button>
                    <button
                      onClick={() => sendCommand('AT+ADDR')}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[11px]"
                    >
                      AT+ADDR (MAC)
                    </button>
                    <button
                      onClick={() => sendCommand('AT+BAUD?')}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[11px]"
                    >
                      AT+BAUD? (Cek Baud)
                    </button>
                    <button
                      onClick={() => sendCommand('AT+DEFAULT')}
                      className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 rounded font-mono text-[11px]"
                    >
                      AT+DEFAULT (Reset Pabrik)
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: MANUAL CUSTOM AT */}
            {activeTab === 'custom' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="font-semibold text-slate-200 flex items-center justify-between">
                    <span>Daftar Cheat-Sheet AT Command IRXON BT578/BT580</span>
                    <span className="text-[11px] text-slate-400">Klik perintah untuk mengisi</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                    {[
                      { cmd: 'AT', desc: 'Uji respon (OK)' },
                      { cmd: 'AT+VERSION', desc: 'Cek versi firmware' },
                      { cmd: 'AT+BAUD4', desc: 'Set baud 9600 bps' },
                      { cmd: 'AT+BAUD8', desc: 'Set baud 115200 bps' },
                      { cmd: 'AT+BAUD=115200', desc: 'Set baud 115200 (format extended)' },
                      { cmd: 'AT+NAME=IRXON_ROUTER', desc: 'Ganti nama broadcast Bluetooth' },
                      { cmd: 'AT+PIN=1234', desc: 'Ganti password pairing PIN' },
                      { cmd: 'AT+PN', desc: 'Paritas: None (8N1)' },
                      { cmd: 'AT+PE', desc: 'Paritas: Even (8E1)' },
                      { cmd: 'AT+PO', desc: 'Paritas: Odd (8O1)' },
                      { cmd: 'AT+ROLE=S', desc: 'Set ke Slave Role' },
                      { cmd: 'AT+ROLE=M', desc: 'Set ke Master Role' },
                      { cmd: 'AT+DEFAULT', desc: 'Kembali ke pengaturan pabrik' },
                      { cmd: 'AT+RESET', desc: 'Reboot modul IRXON' },
                    ].map((item) => (
                      <button
                        key={item.cmd}
                        onClick={() => setCustomCommand(item.cmd)}
                        className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-left flex items-center justify-between group transition-colors"
                      >
                        <span className="text-cyan-300 font-bold group-hover:text-cyan-200">{item.cmd}</span>
                        <span className="text-slate-400 text-[10px]">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: TROUBLESHOOTING (SOLUSI TIDAK ADA RESPON) */}
            {activeTab === 'troubleshoot' && (
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Analisa & Solusi Jika IRXON Tidak Membalas AT Command
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    Adaptor IRXON (BT578/BT580) memiliki arsitektur firmware khusus. Jika perintah <code>AT</code> tidak menghasilkan respons <code>OK</code> di RX Monitor, periksa 4 penyebab utama berikut:
                  </p>
                </div>

                {/* Highlight Khusus: Lampu Hijau Menyala */}
                <div className="p-4 bg-emerald-950/40 border border-emerald-700/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                      🟢 Gejala: Lampu Hijau IRXON Menyala Tapi Tidak Ada Balasan "OK"
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 border border-emerald-600 font-semibold">
                      Hardware Normal 100%
                    </span>
                  </div>
                  
                  <div className="text-slate-300 leading-relaxed text-xs space-y-2">
                    <p>
                      <strong>Artinya apa?</strong> Lampu hijau di bodi IRXON adalah <strong>LED Aktivitas RS-232 TxD/RxD</strong>. Saat lampu hijau menyala ketika Anda mengirim teks, artinya transmisi Bluetooth Anda <strong>berhasil 100%</strong> dan teks tersebut diteruskan keluar melalui pin DB9 serial fisik.
                    </p>
                    <p className="text-amber-200">
                      <strong>Mengapa tidak ada balasan "OK"?</strong> Karena IRXON sedang bekerja dalam mode <em>"Transparent Cable Bridge"</em> (jembatan kabel nirkabel). IRXON menganggap teks Anda ditujukan untuk perangkat di ujung port DB9 (seperti Switch/Router), bukan perintah internal untuk dirinya sendiri.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-2.5">
                    <div className="font-semibold text-cyan-300 text-xs">Pilih Solusi Konfigurasi:</div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {/* Solusi 1 */}
                      <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                            <Cable className="w-3.5 h-3.5 text-cyan-400" />
                            1. Gunakan Kabel Setting USB (Resmi)
                          </span>
                          <p className="text-slate-400 text-[11px] mt-1">
                            Gunakan kabel USB config bawaan IRXON (USB to DB9). Sambungkan ke laptop & pilih mode <strong>"USB Cable / Virtual COM"</strong> di menu atas. Pada mode kabel DB9 inilah chip IRXON membaca AT command dan membalas OK.
                          </p>
                        </div>
                        <button
                          onClick={() => { setConnectionType('serial'); }}
                          className="mt-2 w-full py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-medium text-xs transition-colors"
                        >
                          Pindah ke Mode USB Cable / COM
                        </button>
                      </div>

                      {/* Solusi 2 */}
                      <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1.5 flex flex-col justify-between">
                        <div>
                          <span className="font-bold text-white text-[11px] flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            2. Paksa Mode Escape Nirkabel
                          </span>
                          <p className="text-slate-400 text-[11px] mt-1">
                            Kirim escape sequence <code>+++</code> dengan jeda hening (Guard Time) 1.1 detik agar adaptor berhenti meneruskan data ke DB9 dan beralih membaca AT command.
                          </p>
                        </div>
                        <button
                          onClick={handleGuardTimeEscape}
                          disabled={isProbing}
                          className="mt-2 w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-xs transition-colors"
                        >
                          Kirim Escape Mode (1s Guard Time)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1. Mode Transparan Pass-Through */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-900/80 text-amber-300 text-[11px] font-bold flex items-center justify-center">1</span>
                      Adapter Terjebak di "Transparent Data Mode" (LED Biru Diam)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">Paling Sering Terjadi</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Saat koneksi Bluetooth aktif dan LED Biru menyala diam (solid), IRXON otomatis menganggap semua teks yang dikirim adalah data untuk port DB9 (ke Router/Switch), <strong>bukan untuk chip AT modulnya sendiri!</strong>
                  </p>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                    <div className="font-semibold text-cyan-300 text-[11px]">Langkah Perbaikan:</div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1 text-[11px]">
                      <li>Klik tombol <strong>+++ (Escape)</strong> di atas untuk memaksa modul keluar dari data stream ke command mode.</li>
                      <li>Lepaskan sambungan kabel DB9 dari Router/Switch terlebih dahulu saat ingin mengubah konfigurasi baud rate/nama.</li>
                    </ul>
                  </div>
                </div>

                {/* 2. Format Akhiran Baris (Line Ending) */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-900/80 text-cyan-300 text-[11px] font-bold flex items-center justify-center">2</span>
                    Perbedaan Format Firmware IRXON (CRLF vs None / Raw)
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Beberapa batch firmware IRXON BT578 v2.0 menuntut perintah dikirim dalam <strong>huruf kapital murni TANPA \r\n (None / Raw String)</strong>, sedangkan versi v3.0 menuntut <strong>CRLF (\r\n)</strong>.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleAutoProbe}
                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Jalankan Auto-Probe Sekarang</span>
                    </button>
                    <span className="text-[11px] text-slate-400">Sistem akan mencoba semua kombinasi secara bergantian.</span>
                  </div>
                </div>

                {/* 3. Salah Baud Rate Awal pada Kabel Setting USB */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-900/80 text-cyan-300 text-[11px] font-bold flex items-center justify-center">3</span>
                    Baud Rate Port COM Fisik Belum Sesuai (Jika lewat Kabel USB)
                  </span>
                  <p className="text-slate-400 leading-relaxed">
                    Jika menggunakan kabel USB Config (Prolific/FTDI/CH340), port serial di browser harus dibuka pada baud rate saat ini milik IRXON (Default pabrik: <strong>9600 bps</strong> atau <strong>115200 bps</strong>). Jika dibuka pada 9600 sedangkan modul diset 115200, modul tidak akan merespons.
                  </p>
                  <p className="text-slate-300 font-mono text-[11px]">
                    👉 Solusi: Disconnect, ubah dropdown baud rate ke <strong>9600</strong> lalu coba Connect. Jika belum ada respon, Disconnect dan coba pada <strong>115200</strong>.
                  </p>
                </div>

                {/* 4. Saklar Geser Fisik */}
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-900/80 text-cyan-300 text-[11px] font-bold flex items-center justify-center">4</span>
                    Posisi Saklar Fisik DCE / DTE & Master / Slave
                  </span>
                  <ul className="list-disc list-inside text-slate-400 space-y-1 pl-2">
                    <li>Pastikan saklar Role berada di posisi <strong>S (Slave)</strong>.</li>
                    <li>Jika modul memiliki saklar <strong>DCE/DTE</strong>, geser ke posisi <strong>DCE</strong> saat menghubungkan ke PC/Kabel USB.</li>
                  </ul>
                </div>

              </div>
            )}

            {/* TAB 4: HARDWARE GUIDE */}
            {activeTab === 'guide' && (
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="p-3.5 bg-blue-950/40 border border-blue-800/60 rounded-xl space-y-2">
                  <div className="font-bold text-blue-300 flex items-center gap-1.5 text-xs sm:text-sm">
                    <Info className="w-4 h-4 text-blue-400" />
                    Cara Memasukkan IRXON ke Mode AT Command
                  </div>
                  <p className="leading-relaxed">
                    Sesuai buku panduan resmi IRXON BT578/BT580, adaptor Bluetooth ini hanya akan menerima AT Command saat berada dalam <strong>Command State</strong> (belum terkoneksi stream data ke router).
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-900 text-cyan-300 text-[11px] font-bold flex items-center justify-center">1</span>
                      Posisi Saklar Fisik (Slide Switch):
                    </div>
                    <ul className="list-disc list-inside text-slate-400 pl-4 space-y-1">
                      <li><strong>Posisi S (Slave):</strong> Digunakan untuk koneksi normal ke HP/Laptop. Saat lampu LED biru berkedip cepat (belum tersambung ke aplikasi terminal lain), adaptor menerima AT Command.</li>
                      <li><strong>Posisi M (Master):</strong> Digunakan jika menghubungkan dua adapter IRXON secara peer-to-peer.</li>
                      <li><strong>Posisi C / Command (jika ada pada tipe tertentu):</strong> Khusus untuk konfigurasi lewat kabel USB data.</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-900 text-cyan-300 text-[11px] font-bold flex items-center justify-center">2</span>
                      Status Lampu Indikator LED IRXON:
                    </div>
                    <ul className="list-disc list-inside text-slate-400 pl-4 space-y-1">
                      <li><strong>Berkedip Cepat (Fast Blinking):</strong> Siap menerima AT Command dan pairing Bluetooth.</li>
                      <li><strong>Menyala Terus (Steady ON):</strong> Terhubung dalam mode transmisi data RS232 transparan (AT Command dinonaktifkan).</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-900 text-cyan-300 text-[11px] font-bold flex items-center justify-center">3</span>
                      Setelah Mengganti Baud Rate:
                    </div>
                    <p className="text-slate-400 pl-4">
                      Setelah berhasil mengirim perintah ganti baud rate (misal: <code>AT+BAUD8</code> untuk 115200), matikan saklar daya IRXON lalu hidupkan kembali (Power Cycle) agar baud rate baru tersimpan permanen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Status Bar on Settings Panel */}
            <div className="mt-2 p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className={`w-2 h-2 rounded-full ${
                  lastRxMessage?.type === 'rx' || lastRxMessage?.type === 'success'
                    ? 'bg-emerald-400 animate-pulse'
                    : lastRxMessage?.type === 'error'
                    ? 'bg-rose-400'
                    : 'bg-slate-500'
                }`} />
                <span className="text-slate-400 font-mono text-[11px] truncate">
                  {lastRxMessage ? (
                    <span>
                      <strong className={
                        lastRxMessage.type === 'rx' || lastRxMessage.type === 'success' 
                          ? 'text-emerald-400' 
                          : 'text-slate-300'
                      }>
                        [{lastRxMessage.time}]
                      </strong> {lastRxMessage.text}
                    </span>
                  ) : (
                    'Belum ada perintah yang dikirim. Pilih parameter di atas untuk kirim 1-click.'
                  )}
                </span>
              </div>

              <button
                onClick={() => setActiveViewMode('console')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded-lg font-medium text-xs flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>Lihat Console Monitor &gt;</span>
              </button>
            </div>

          </div>

          {/* Right Column: Live AT Terminal Logs & Input Bar (Visible when activeViewMode is 'console' or 'split') */}
          <div className={`${
            activeViewMode === 'settings' ? 'hidden' : 'flex'
          } ${
            activeViewMode === 'split' ? 'lg:col-span-5 lg:flex' : 'w-full'
          } flex-col bg-black min-h-[300px] flex-1`}>
            
            {/* Terminal Header */}
            <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono font-semibold text-slate-200">AT Console Monitor</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyLogs}
                  title="Copy Semua Log"
                  className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleClearLogs}
                  title="Hapus Layar Log"
                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Terminal Log Area */}
            <div 
              ref={logContainerRef}
              className="flex-1 p-3 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1 select-text bg-black"
            >
              {logs.map((log) => {
                if (log.type === 'tx') {
                  return (
                    <div key={log.id} className="text-cyan-300">
                      <span className="text-slate-600 select-none">[{log.time}] </span>
                      <span className="text-cyan-400 font-bold select-none">&gt;&gt; TX: </span>
                      <span className="font-semibold text-white">{log.text}</span>
                    </div>
                  );
                }
                if (log.type === 'rx') {
                  return (
                    <div key={log.id} className="text-emerald-400">
                      <span className="text-slate-600 select-none">[{log.time}] </span>
                      <span className="text-emerald-500 font-bold select-none">&lt;&lt; RX: </span>
                      <span className="font-bold text-emerald-300">{log.text}</span>
                    </div>
                  );
                }
                if (log.type === 'error') {
                  return (
                    <div key={log.id} className="text-rose-400">
                      <span className="text-slate-600 select-none">[{log.time}] </span>
                      <span className="text-rose-500 font-bold select-none">[ERR] </span>
                      <span>{log.text}</span>
                    </div>
                  );
                }
                if (log.type === 'success') {
                  return (
                    <div key={log.id} className="text-emerald-400 font-medium">
                      <span className="text-slate-600 select-none">[{log.time}] </span>
                      <span>{log.text}</span>
                    </div>
                  );
                }
                return (
                  <div key={log.id} className="text-slate-400 italic">
                    <span className="text-slate-600 select-none">[{log.time}] </span>
                    <span>{log.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Terminal Input Bar */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Akhiran Baris:</span>
                <select
                  value={lineEnding}
                  onChange={(e) => setLineEnding(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5"
                >
                  <option value="crlf">CRLF (\r\n) [Standar IRXON]</option>
                  <option value="cr">CR (\r)</option>
                  <option value="lf">LF (\n)</option>
                  <option value="none">None (Raw String)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-cyan-400 font-bold text-xs select-none">&gt;</span>
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  onKeyDown={handleCustomKeyDown}
                  placeholder="Ketik AT command (misal: AT+BAUD8)..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-white font-mono text-xs focus:border-cyan-500 outline-none"
                />
                <button
                  onClick={() => sendCommand(customCommand)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-medium text-xs flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3 h-3" />
                  <span>Kirim</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Bar */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Format baud rate standar IRXON: <code>AT+BAUD4</code> (9600) / <code>AT+BAUD8</code> (115200).</span>
          </div>

          <div className="flex items-center gap-2">
            {activeViewMode === 'console' ? (
              <button
                type="button"
                onClick={() => setActiveViewMode('settings')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Panel Setting</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveViewMode('console')}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <TerminalIcon className="w-3.5 h-3.5" />
                <span>Console Log ({logs.length})</span>
              </button>
            )}

            <button
              type="button"
              id="btn-close-irxon-at-modal-footer"
              onClick={handleSafeClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
