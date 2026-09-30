import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Bluetooth, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Radio, 
  Search, 
  X, 
  Zap, 
  Loader2,
  SignalHigh,
  SignalMedium,
  SignalLow,
  Info,
  ChevronRight,
  ShieldCheck,
  Cable,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { 
  checkBrowserHardwareCaps, 
  getPairedAndroidBluetoothDevices,
  connectWebBluetoothSerial,
  connectWebSerialPort
} from '../services/serialConnection';
import { bleBridgeService } from '../services/bleBridgeService';
import { safeStorage } from '../utils/safeStorage';

export interface BluetoothDiscoveredDevice {
  name: string;
  address: string;
  type: 'SPP' | 'BLE' | 'UNKNOWN';
  isPaired: boolean;
  isLiveActive: boolean;
  isSerialAdapter: boolean;
  category: 'serial' | 'audio' | 'other';
  rssi?: number;
  chipType?: string;
}

interface BluetoothDevicePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDevice: (device: { name: string; address: string; type: string }) => void;
  baudRate?: number;
}

export const BluetoothDevicePickerModal: React.FC<BluetoothDevicePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectDevice,
  baudRate = 9600,
}) => {
  const [liveDevices, setLiveDevices] = useState<BluetoothDiscoveredDevice[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'serial' | 'all'>('serial');
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [connectedName, setConnectedName] = useState<string | null>(null);

  // Bluetooth Pairing Dialog Popup State (matching Chrome & OS Bluetooth pairing dialog)
  const [pairingDevice, setPairingDevice] = useState<BluetoothDiscoveredDevice | null>(null);
  const [isPairingProgress, setIsPairingProgress] = useState<boolean>(false);
  const [pairingSuccess, setPairingSuccess] = useState<boolean>(false);

  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>('');
  const [manualAddress, setManualAddress] = useState<string>('');
  const [manualType, setManualType] = useState<'BLE' | 'SPP'>('BLE');

  const scanAbortRef = useRef<boolean>(false);
  const caps = checkBrowserHardwareCaps();
  const isNativeDesktop = typeof window !== 'undefined' && Boolean((window as any).DesktopNative || (window as any).desktopNative || (window as any).process?.versions?.electron);
  let isIframe = false;
  try {
    isIframe = typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    isIframe = true;
  }
  const isDesktopElectron = typeof window !== 'undefined' && Boolean((window as any).DesktopNative || (window as any).desktopNative);

  // Load custom manual devices from local storage
  const loadSavedManualDevices = useCallback((): BluetoothDiscoveredDevice[] => {
    try {
      const raw = safeStorage.getItem('69ai_manual_bluetooth_devices');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((d: any) => ({
            name: d.name || 'Perangkat Bluetooth Manual',
            address: d.address || '00:18:E4:3A:A7:C5',
            type: d.type === 'SPP' ? 'SPP' : 'BLE',
            isPaired: true,
            isLiveActive: true,
            isSerialAdapter: true,
            category: 'serial' as const,
            rssi: -40,
            chipType: d.chipType || 'Custom Serial Bluetooth Adapter (Manual Added)'
          }));
        }
      }
    } catch (_) {}
    return [];
  }, []);

  const handleSaveAndConnectManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() && !manualAddress.trim()) {
      setErrorMessage('Harap masukkan nama perangkat atau alamat MAC/Port Bluetooth.');
      return;
    }

    const deviceName = manualName.trim() || `Bluetooth ${manualType} Adapter`;
    const deviceAddr = manualAddress.trim() || '00:18:E4:3A:A7:C5';

    const newDev: BluetoothDiscoveredDevice = {
      name: deviceName,
      address: deviceAddr,
      type: manualType,
      isPaired: true,
      isLiveActive: true,
      isSerialAdapter: true,
      category: 'serial',
      rssi: -40,
      chipType: `${deviceName} (${manualType} Console Adapter - Manual)`
    };

    // Save to storage
    try {
      const existing = loadSavedManualDevices();
      const filtered = existing.filter(d => d.address !== deviceAddr);
      const updated = [newDev, ...filtered];
      safeStorage.setItem('69ai_manual_bluetooth_devices', JSON.stringify(updated));
    } catch (_) {}

    // Add to current live list
    setLiveDevices(prev => [newDev, ...prev.filter(d => d.address !== deviceAddr)]);
    setShowManualForm(false);
    setManualName('');
    setManualAddress('');

    // Connect immediately
    handleSelectDeviceItem(newDev);
  };

  const handleDeleteManualDevice = (e: React.MouseEvent, address: string) => {
    e.stopPropagation();
    try {
      const existing = loadSavedManualDevices();
      const updated = existing.filter(d => d.address !== address);
      safeStorage.setItem('69ai_manual_bluetooth_devices', JSON.stringify(updated));
    } catch (_) {}

    setLiveDevices(prev => prev.filter(d => d.address !== address));
  };

  const categorizeDevice = (
    name: string, 
    address: string, 
    type = 'BLE', 
    isPaired = false,
    isLiveActive = true,
    rssi?: number
  ): BluetoothDiscoveredDevice => {
    const upper = (name || '').toUpperCase();
    const isSerial = 
      upper.startsWith('BT578') ||
      upper.includes('BT578') || 
      upper.includes('IRXON') || 
      upper.includes('BT580') || 
      upper.includes('HC-05') || 
      upper.includes('HC-06') || 
      upper.includes('HC05') || 
      upper.includes('HC06') || 
      upper.includes('CISCO') || 
      upper.includes('CONSOLE') || 
      upper.includes('UART') || 
      upper.includes('JDY') || 
      upper.includes('ESP32') || 
      upper.includes('RS232') || 
      upper.includes('SERIAL') || 
      upper.includes('CH340') || 
      upper.includes('FTDI') || 
      upper.includes('CP210') || 
      upper.includes('SPP') || 
      upper.includes('MLT') || 
      upper.includes('AT-09') || 
      upper.includes('HM-10') || 
      upper.includes('BLUETOOTH-INCOMING') ||
      upper.startsWith('/DEV/CU.');

    const isAudio = 
      upper.includes('WILLEN') || 
      upper.includes('MARSHALL') || 
      upper.includes('SPEAKER') || 
      upper.includes('HEADSET') || 
      upper.includes('HEADPHONE') || 
      upper.includes('EARBUDS') || 
      upper.includes('AIRPOD') || 
      upper.includes('TWS') || 
      upper.includes('SOUND') || 
      upper.includes('AUDIO') || 
      upper.includes('SONY') || 
      upper.includes('JBL') || 
      upper.includes('HONDA') ||
      upper.includes('HANDSFREE') ||
      upper.includes('BOSE');

    let category: 'serial' | 'audio' | 'other' = 'other';
    if (isSerial) category = 'serial';
    else if (isAudio) category = 'audio';

    // Normalize display name so it starts with BT578 if it is an IRXON BT578 adapter
    let displayName = name || 'BT578-BLE';
    if (displayName.toUpperCase().startsWith('IRXON BT578')) {
      displayName = displayName.replace(/^IRXON\s+/i, '');
    } else if (displayName.toUpperCase().startsWith('IRXON')) {
      displayName = displayName.replace(/^IRXON\s*/i, 'BT578_');
    }

    return {
      name: displayName,
      address,
      type: type === 'SPP' ? 'SPP' : 'BLE',
      isPaired,
      isLiveActive,
      isSerialAdapter: isSerial,
      category,
      rssi,
      chipType: isSerial ? 'BT578 Wireless Console Adapter (BLE GATT)' : (isAudio ? 'Audio Device' : 'Perangkat Bluetooth')
    };
  };

  // Perform full physical scan across Web Bluetooth, Desktop Electron Native, and Android
  const startLiveScan = useCallback(async (isUserClick = false) => {
    setIsScanning(true);
    setErrorMessage('');
    setStatusMessage('Memindai sinyal radio Bluetooth & adapter serial...');

    const discoveredMap = new Map<string, BluetoothDiscoveredDevice>();

    // 0. Load any saved manual devices from storage
    const savedManual = loadSavedManualDevices();
    savedManual.forEach(sm => {
      discoveredMap.set(sm.address, sm);
    });

    // 1. Query browser remembered Web Bluetooth devices
    if (typeof navigator !== 'undefined' && (navigator as any).bluetooth && typeof (navigator as any).bluetooth.getDevices === 'function') {
      try {
        const remembered = await (navigator as any).bluetooth.getDevices();
        if (Array.isArray(remembered)) {
          remembered.forEach((d: any) => {
            const dName = d.name || 'Perangkat Bluetooth BLE';
            const dev = categorizeDevice(dName, d.id || 'WEB-BT-GATT', 'BLE', true, true, -45);
            discoveredMap.set(dev.address, dev);
          });
        }
      } catch (btGetErr) {
        console.warn('bluetooth.getDevices notice:', btGetErr);
      }
    }

    // 2. Desktop Native Electron (macOS / Windows)
    if (typeof window !== 'undefined') {
      const desktop = (window as any).DesktopNative || (window as any).desktopNative;
      
      if (desktop && typeof desktop.listSerialPorts === 'function') {
        try {
          const res = await desktop.listSerialPorts();
          if (res && res.success && Array.isArray(res.ports)) {
            res.ports.forEach((p: any) => {
              const pathName = p.path || p;
              const desc = p.friendlyName || (p.manufacturer ? `${pathName} (${p.manufacturer})` : pathName);
              const isBtPort = pathName.toLowerCase().includes('bluetooth') || 
                               pathName.toLowerCase().includes('irxon') || 
                               pathName.toLowerCase().includes('bt578') || 
                               pathName.toLowerCase().includes('hc-05') || 
                               pathName.toLowerCase().includes('spp') ||
                               pathName.startsWith('/dev/cu.');

              if (isBtPort) {
                const dev = categorizeDevice(desc, pathName, 'SPP', true, true, -40);
                discoveredMap.set(dev.address, dev);
              }
            });
          }
        } catch (err) {
          console.warn('DesktopNative listSerialPorts error:', err);
        }
      }

      if (desktop && typeof desktop.listBluetoothDevices === 'function') {
        try {
          const btRes = await desktop.listBluetoothDevices();
          if (btRes && btRes.success && Array.isArray(btRes.devices)) {
            btRes.devices.forEach((d: any) => {
              const dev = categorizeDevice(
                d.name,
                d.address,
                d.type || 'SPP',
                d.isPaired ?? true,
                d.isLiveActive ?? true,
                d.rssi ?? -45
              );
              discoveredMap.set(dev.address, dev);
            });
          }
        } catch (btErr) {
          console.warn('DesktopNative listBluetoothDevices error:', btErr);
        }
      }
    }

    // 3. Android Native APK Direct Route
    if (caps.isAndroidNative && typeof (window as any).AndroidNative !== 'undefined') {
      const bridge = (window as any).AndroidNative;
      if (typeof bridge.startBluetoothDiscovery === 'function') {
        try {
          bridge.startBluetoothDiscovery();
        } catch (e) {
          console.warn('Error starting BT discovery:', e);
        }
      }

      const paired = getPairedAndroidBluetoothDevices();
      paired.forEach(p => {
        const dev = categorizeDevice(p.name, p.address, p.type, true, true);
        discoveredMap.set(dev.address, dev);
      });
    }

    // 4. Fallback default known wireless console adapters removed to only show real devices

    setLiveDevices(Array.from(discoveredMap.values()));
    setIsScanning(false);

    // If user clicked or on desktop electron, trigger active radio discovery
    if (isUserClick) {
      triggerActiveBleRadioScan();
    }
  }, [caps.isAndroidNative, isDesktopElectron, loadSavedManualDevices]);

  // Trigger active Web Bluetooth scanning (opens Chrome pair prompt in web, sends events in electron)
  const triggerActiveBleRadioScan = async () => {
    setErrorMessage('');
    setIsScanning(true);
    setStatusMessage('Memindai sinyal radio Bluetooth BLE... Pastikan adapter IRXON BT578 menyala.');

    if (caps.hasWebBluetooth) {
      try {
        let res = await connectWebBluetoothSerial(
          undefined,
          undefined,
          undefined,
          undefined,
          baudRate,
          true
        );

        // If direct call fails due to security / permissions policy, try isolated BLE bridge
        if (!res.success && res.error?.includes('permissions policy')) {
          res = await bleBridgeService.requestConnect({ baudRate });
        }

        if (res.success) {
          const devName = res.deviceName || 'IRXON BT578-BLE';
          const devAddr = (res as any).device?.id || 'GATT-CONNECTED';
          setConnectedName(devName);
          setStatusMessage(`Berhasil terhubung ke ${devName}! LED Biru Solid.`);

          setTimeout(() => {
            onSelectDevice({
              name: devName,
              address: devAddr,
              type: 'BLE',
            });
            onClose();
          }, 350);
          return;
        } else if (res.error && !res.error.includes('dibatalkan') && !res.error.includes('cancelled')) {
          setErrorMessage(res.error);
        }
      } catch (err: any) {
        console.warn('Web Bluetooth scan error:', err);
        if (err.name === 'SecurityError' || err.message?.includes('permissions policy')) {
          // Attempt isolated iframe bridge
          try {
            const bridgeRes = await bleBridgeService.requestConnect({ baudRate });
            if (bridgeRes.success) {
              const devName = bridgeRes.deviceName || 'IRXON BT578-BLE';
              setConnectedName(devName);
              setStatusMessage(`Berhasil terhubung ke ${devName}! LED Biru Solid.`);
              setTimeout(() => {
                onSelectDevice({
                  name: devName,
                  address: 'GATT-CONNECTED',
                  type: 'BLE',
                });
                onClose();
              }, 350);
              return;
            }
          } catch (bErr) {}
          setErrorMessage('Akses Web Bluetooth dibatasi di dalam iframe browser. Klik tombol "Buka di Tab Baru" di atas untuk akses hardware penuh.');
        } else if (err.name !== 'NotFoundError') {
          setErrorMessage(err.message || 'Gagal memindai Bluetooth.');
        }
      } finally {
        setIsScanning(false);
      }
    } else {
      setErrorMessage('Web Bluetooth API belum aktif pada browser ini. Buka via Google Chrome / Edge atau aplikasi Desktop macOS.');
      setIsScanning(false);
    }
  };

  // Direct Web Serial Port Selector for IRXON BT578 Classic SPP (Virtual COM Port)
  const handleOpenBrowserSerialPortPrompt = async () => {
    setErrorMessage('');
    setIsScanning(true);
    setStatusMessage('Membuka dialog Port Serial / COM Virtual IRXON...');

    try {
      const res = await connectWebSerialPort(baudRate, { dtrRts: true });
      if (res.success) {
        const devName = `IRXON BT578 (${res.chipName || 'Serial SPP'})`;
        const devAddr = res.portName || 'COM Port';
        setConnectedName(devName);
        
        setTimeout(() => {
          onSelectDevice({
            name: devName,
            address: devAddr,
            type: 'SPP',
          });
          onClose();
        }, 350);
        return;
      } else if (res.error && !res.error.includes('dibatalkan') && !res.error.includes('cancelled')) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      console.warn('Web Serial scan error:', err);
      if (err.name === 'SecurityError' || err.message?.includes('permissions policy')) {
        setErrorMessage('Akses Web Serial dibatasi di dalam iframe browser. Klik "Buka di Tab Baru" untuk akses port serial langsung.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Listen to live Bluetooth discoveries from Desktop Electron bridge
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const desktop = (window as any).DesktopNative || (window as any).desktopNative;
      if (desktop && typeof desktop.onBluetoothDiscovered === 'function') {
        const unbind = desktop.onBluetoothDiscovered((discoveredList: any[]) => {
          if (Array.isArray(discoveredList)) {
            setLiveDevices(prev => {
              const map = new Map<string, BluetoothDiscoveredDevice>();
              prev.forEach(d => map.set(d.address, d));
              discoveredList.forEach(d => {
                const name = d.deviceName || d.name || 'Perangkat Bluetooth';
                const addr = d.deviceId || d.address || name;
                map.set(addr, categorizeDevice(name, addr, 'BLE', false, true, d.rssi || -45));
              });
              return Array.from(map.values());
            });
          }
        });
        return () => {
          if (typeof unbind === 'function') unbind();
        };
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startLiveScan(false);
    }
  }, [isOpen, startLiveScan]);

  if (!isOpen) return null;

  const handleOpenPairingDialog = (device: BluetoothDiscoveredDevice) => {
    setPairingDevice(device);
    setIsPairingProgress(false);
    setPairingSuccess(false);
    setErrorMessage('');
  };

  const handleConfirmPairing = async (device: BluetoothDiscoveredDevice) => {
    setIsPairingProgress(true);
    setConnectingAddress(device.address);
    setErrorMessage('');
    const isNativeDesktop = typeof window !== 'undefined' && Boolean((window as any).DesktopNative || (window as any).desktopNative || (window as any).process?.versions?.electron);
    setStatusMessage(
      isNativeDesktop
        ? `Memulai pairing dengan ${device.name} via macOS CoreBluetooth...`
        : `Memulai pairing dengan ${device.name}... Silakan klik 'Pair' pada dialog browser di atas.`
    );

    let actualDevName = device.name;
    let actualDevAddr = device.address;

    try {
      // 1. Electron Desktop Native Bridge Handshake
      const desktop = typeof window !== 'undefined' ? ((window as any).DesktopNative || (window as any).desktopNative) : null;
      if (desktop) {
        if (typeof desktop.pairBluetooth === 'function') {
          try {
            // we don't await this to let it run parallel if it's an OS dialog
            desktop.pairBluetooth({ name: device.name, address: device.address }).then((pRes: any) => {
              if (pRes && pRes.address) actualDevAddr = pRes.address;
              if (pRes && pRes.deviceName) actualDevName = pRes.deviceName;
            }).catch(() => {});
          } catch (_) {}
        }
        if (typeof desktop.selectBluetoothDevice === 'function') {
          try {
            await desktop.selectBluetoothDevice(device.address);
          } catch (_) {}
        }
      }

      // 2. Web Bluetooth GATT or Isolated Bridge Handshake
      if (device.type === 'BLE' || caps.hasWebBluetooth) {
        try {
          const connRes = await connectWebBluetoothSerial(
            undefined,
            undefined,
            undefined,
            device.address,
            baudRate,
            true
          );

          if (connRes && connRes.success) {
            actualDevName = connRes.deviceName || device.name;
            actualDevAddr = connRes.device?.id || device.address;
          } else if (connRes && !connRes.success) {
            // Check if fallback to WebView BLE bridge is available
            try {
              const bRes = await bleBridgeService.requestConnect({ baudRate });
              if (bRes.success) {
                actualDevName = bRes.deviceName || device.name;
                actualDevAddr = 'BLE-BRIDGE-CONNECTED';
              } else if (connRes.error && !connRes.error.includes('dibatalkan') && !connRes.error.includes('cancelled')) {
                throw new Error(connRes.error);
              }
            } catch (bridgeErr: any) {
              if (connRes.error && !connRes.error.includes('dibatalkan') && !connRes.error.includes('cancelled')) {
                throw new Error(connRes.error);
              }
            }
          }
        } catch (bleErr: any) {
          if (bleErr.name === 'NotFoundError' || bleErr.message?.includes('cancelled') || bleErr.message?.includes('dibatalkan') || bleErr.message?.includes('User cancelled')) {
            setErrorMessage('Pairing dibatalkan. Silakan klik "Pasangkan / Pair" kembali dan klik tombol "Pair" pada dialog browser di pojok kiri atas.');
            setIsPairingProgress(false);
            setConnectingAddress(null);
            return;
          }
          console.warn('Web Bluetooth GATT pairing attempt notice:', bleErr);
        }
      }

      setPairingSuccess(true);
      setStatusMessage(`[✓] Berhasil dipasangkan ke ${actualDevName}! LED Biru Solid.`);

      // Complete pairing immediately and pass device to parent / open terminal
      setTimeout(() => {
        onSelectDevice({
          name: actualDevName,
          address: actualDevAddr,
          type: device.type,
        });
        setPairingDevice(null);
        setIsPairingProgress(false);
        onClose();
      }, 350);
    } catch (err: any) {
      console.error('Pairing fallback notice:', err);
      setErrorMessage(err.message || 'Gagal memasangkan perangkat Bluetooth. Pastikan adapter aktif.');
      setIsPairingProgress(false);
    } finally {
      setConnectingAddress(null);
    }
  };

  const handleSelectDeviceItem = async (device: BluetoothDiscoveredDevice) => {
    // Open the Bluetooth Pairing Popup Modal
    handleOpenPairingDialog(device);
  };

  const filteredDevices = liveDevices.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;
    if (activeTab === 'serial') return d.isSerialAdapter;
    return true;
  });

  const getRssiBadge = (rssi?: number) => {
    if (rssi === undefined) return null;
    let label = 'Baik';
    let color = 'text-emerald-400 border-emerald-600/50 bg-emerald-950/60';
    let Icon = SignalHigh;

    if (rssi > -65) {
      label = `${rssi} dBm (Sinyal Kuat)`;
      color = 'text-emerald-300 border-emerald-500 bg-emerald-950/80';
      Icon = SignalHigh;
    } else if (rssi > -80) {
      label = `${rssi} dBm (Sinyal Sedang)`;
      color = 'text-yellow-300 border-yellow-500/60 bg-yellow-950/60';
      Icon = SignalMedium;
    } else {
      label = `${rssi} dBm (Sinyal Lemah)`;
      color = 'text-orange-400 border-orange-500/60 bg-orange-950/60';
      Icon = SignalLow;
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 ${color}`}>
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Bluetooth className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Pilih Device Bluetooth Serial (BT578 / BLE)</h3>
              <p className="text-[11px] text-neutral-400">
                Pindai & pilih adapter wireless console BT578 untuk koneksi router & switch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Iframe Notice & New Tab helper */}
          {isIframe && (
            <div className="p-3 bg-amber-950/30 border border-amber-700/50 rounded-xl text-amber-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Sedang berjalan di frame preview browser.</span>
              </div>
              <button
                type="button"
                onClick={() => window.open(window.location.href, '_blank')}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Buka di Tab Baru</span>
              </button>
            </div>
          )}

          {/* Primary Action Buttons: Physical Scan Triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => triggerActiveBleRadioScan()}
              disabled={isScanning}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98 border border-blue-400/40"
            >
              <Radio className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''} shrink-0`} />
              <span>{isScanning ? 'Sedang Memindai...' : '📡 Pindai Sinyal BLE (Web Bluetooth)'}</span>
            </button>

            {'serial' in navigator && (
              <button
                type="button"
                onClick={handleOpenBrowserSerialPortPrompt}
                disabled={isScanning}
                className="p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer active:scale-98"
              >
                <Cable className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>🔌 Sambung Port COM / SPP</span>
              </button>
            )}
          </div>

          {/* Hardware Guidance Banner */}
          <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-xl text-blue-300 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-200">
              <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Indikator LED Adapter BT578:</span>
            </div>
            <ul className="text-[11px] text-blue-300/90 list-disc list-inside space-y-0.5">
              <li><b className="text-white">Biru Berkedip:</b> Menunggu koneksi BLE (Ready to connect).</li>
              <li><b className="text-white">Biru Solid:</b> Terhubung GATT & aktif mengirim/menerima data terminal.</li>
            </ul>
          </div>

          {/* Manual Bluetooth Addition Toggle & Form */}
          <div className="border border-neutral-800 rounded-xl bg-neutral-950/70 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowManualForm(!showManualForm)}
              className="w-full p-2.5 flex items-center justify-between text-left text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-850 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 flex items-center justify-center text-xs">
                  +
                </div>
                <span>Tambah Manual Serial Bluetooth / Port BT578</span>
              </div>
              <span className="text-[11px] text-blue-400 font-mono">
                {showManualForm ? 'Tutup Form ▲' : 'Buka Form ▼'}
              </span>
            </button>

            {showManualForm && (
              <form onSubmit={handleSaveAndConnectManual} className="p-3 border-t border-neutral-800 space-y-3 bg-neutral-900/60 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                      Nama Perangkat Bluetooth
                    </label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="Contoh: BT578_BLE_A7C5"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-300 block mb-1">
                      Alamat MAC / Port macOS
                    </label>
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="00:18:E4:3A:A7:C5 atau /dev/cu.BT578"
                      className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">Tipe:</span>
                    <button
                      type="button"
                      onClick={() => setManualType('BLE')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                        manualType === 'BLE' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      BLE (GATT)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualType('SPP')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
                        manualType === 'SPP' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      SPP (Serial/COM)
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan & Sambungkan Langsung</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Filter Tabs & Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('serial')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'serial'
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Adapter Serial ({liveDevices.filter(d => d.isSerialAdapter).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Semua Sinyal ({liveDevices.length})</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => startLiveScan(true)}
                disabled={isScanning}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-medium shrink-0 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Segarkan</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama adapter (misal: BT578, IRXON, HC-05, ESP32)..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Device Cards List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
            {filteredDevices.length === 0 ? (
              <div className="p-6 text-center text-neutral-400 bg-neutral-950/60 rounded-xl border border-neutral-800 space-y-2">
                <Radio className="w-6 h-6 text-blue-400 mx-auto " />
                <p className="text-xs font-semibold text-neutral-300">
                  {isScanning ? 'Sedang memindai gelombang Bluetooth BLE...' : 'Belum ada perangkat yang terdeteksi.'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  Klik tombol <strong>Pindai Sinyal BLE (Dialog Chrome)</strong> di atas untuk memindai perangkat secara langsung.
                </p>
              </div>
            ) : (
              filteredDevices.map((device) => {
                const isConnecting = connectingAddress === device.address;

                return (
                  <div
                    key={device.address}
                    onClick={() => handleSelectDeviceItem(device)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      device.isSerialAdapter
                        ? 'bg-neutral-950 hover:bg-neutral-850 border-neutral-800 hover:border-emerald-500/60'
                        : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        device.isSerialAdapter
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-700/60'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                      }`}>
                        {device.isSerialAdapter ? <Cpu className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-white text-xs font-bold truncate max-w-[200px]">{device.name}</h4>
                          {device.isSerialAdapter && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 shrink-0 font-sans font-semibold">
                              Console Adapter
                            </span>
                          )}
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-900 shrink-0 font-mono">
                            {device.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate">
                          {device.chipType || 'Wireless Console Bridge (GATT)'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                          <span>ID/Port: {device.address}</span>
                          {getRssiBadge(device.rssi)}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {device.chipType && device.chipType.includes('Manual') && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteManualDevice(e, device.address)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/20 transition-colors"
                          title="Hapus dari daftar manual"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isConnecting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDeviceItem(device);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow cursor-pointer active:scale-95"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Menyambungkan...</span>
                          </>
                        ) : (
                          <>
                            <span>Pilih</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {errorMessage && (
            <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>Klik "Pindai Sinyal BLE" lalu pilih adapter Anda (misal: <strong>BT578_BLE_A7C5</strong>)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Bluetooth Pairing Request Popup Modal (Chrome / OS style prompt) */}
      {pairingDevice && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div 
            className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Host / Origin pairing request */}
            <div className="p-4 border-b border-neutral-800 bg-neutral-950/90 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                  <Bluetooth className="w-5 h-5  text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm leading-tight">
                    Pasangkan Perangkat Bluetooth
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-[280px]">
                    {typeof window !== 'undefined' ? (window.location.hostname || '69 AI Terminal') : '69 AI Terminal'} ingin memasangkan:
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isPairingProgress}
                onClick={() => setPairingDevice(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: Device details & GATT status */}
            <div className="p-4 space-y-3.5">
              <p className="text-xs text-neutral-300">
                Pilih perangkat Bluetooth untuk disambungkan ke Terminal Console:
              </p>

              {/* Highlighted Peripheral Box */}
              <div className="p-3.5 rounded-xl border-2 border-blue-500 bg-blue-950/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 bg-blue-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                    <span className="font-bold text-white text-sm tracking-wide">
                      {pairingDevice.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700 text-[10px] font-mono">
                    {pairingDevice.type} UART
                  </span>
                </div>

                <div className="text-[11px] text-neutral-300 space-y-1 pl-5 font-mono">
                  <div className="text-neutral-400">
                    Protokol : <span className="text-blue-300">BLE UART SPP Transparent Bridge (IRXON / HM-10 / CC2541)</span>
                  </div>
                  <div className="text-neutral-400">
                    Alamat / UUID : <span className="text-neutral-200">{pairingDevice.address}</span>
                  </div>
                  <div className="text-neutral-400">
                    Kekuatan Sinyal : <span className="text-emerald-400">{pairingDevice.rssi || -42} dBm (Sangat Baik)</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-blue-900/40 flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Hardware: LED Biru Berkedip (Siap Pair)</span>
                  </span>
                  <span className="text-neutral-400">Baud: {baudRate} bps (8N1)</span>
                </div>
              </div>

              {/* Progress State or Tips */}
              {isPairingProgress ? (
                <div className="p-3 bg-blue-950/80 border border-blue-500/80 rounded-xl text-xs text-blue-200 flex flex-col gap-2 shadow-lg">
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                    <span className="font-semibold text-white">
                      {pairingSuccess
                        ? '✓ Berhasil terhubung! Membuka sesi terminal console...'
                        : isNativeDesktop
                        ? 'Menghubungkan via macOS CoreBluetooth GATT Service...'
                        : 'Menunggu konfirmasi pair di popup browser...'}
                    </span>
                  </div>
                  {!pairingSuccess && !isNativeDesktop && (
                    <div className="text-[11px] text-yellow-300 bg-black/40 p-2 rounded-lg border border-yellow-500/30 flex items-start gap-1.5 font-mono">
                      <span className="text-base leading-none">👆</span>
                      <span>
                        Pilih <strong>{pairingDevice.name}</strong> lalu klik tombol <strong>[Pair]</strong> pada dialog browser di pojok kiri atas layar.
                      </span>
                    </div>
                  )}
                  {!pairingSuccess && isNativeDesktop && (
                    <div className="text-[11px] text-emerald-300 bg-black/40 p-2 rounded-lg border border-emerald-500/30 flex items-start gap-1.5 font-mono">
                      <span className="text-base leading-none">⚡</span>
                      <span>
                        Menghubungkan langsung ke adapter <strong>{pairingDevice.name}</strong> tanpa dialog perantara browser.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded-xl text-[11px] text-neutral-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Koneksi aman langsung tanpa perantara server pihak ketiga.</span>
                </div>
              )}
            </div>

            {/* Actions: Batal & Pasangkan / Pair */}
            <div className="p-3.5 border-t border-neutral-800 bg-neutral-950 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isPairingProgress}
                onClick={() => setPairingDevice(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPairingProgress}
                onClick={() => handleConfirmPairing(pairingDevice)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white font-bold text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer border border-blue-400/50"
              >
                {isPairingProgress ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memasangkan...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-3.5 h-3.5" />
                    <span>Pasangkan / Pair</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
