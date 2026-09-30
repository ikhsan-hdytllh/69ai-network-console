import React, { useState } from 'react';
import { 
  Info, 
  X, 
  Server, 
  Network, 
  Cpu, 
  Wifi, 
  Usb, 
  Bluetooth, 
  Globe, 
  Terminal as TerminalIcon, 
  Copy, 
  Check, 
  ShieldCheck, 
  Activity, 
  RefreshCw,
  Hash,
  FileText
} from 'lucide-react';
import { DeviceProfile } from '../types';

interface ConnectionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: DeviceProfile | null;
  currentMode?: string;
  currentHostname?: string;
  effectivePrompt?: string;
  logText?: string;
  commandCount?: number;
  onReconnect?: () => void;
}

export const ConnectionInfoModal: React.FC<ConnectionInfoModalProps> = ({
  isOpen,
  onClose,
  device,
  currentMode = 'exec',
  currentHostname,
  effectivePrompt = '>',
  logText = '',
  commandCount = 0,
  onReconnect,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !device) return null;

  const getDeviceTypeIcon = (type: DeviceProfile['type']) => {
    switch (type) {
      case 'serial_cable':
        return <Usb className="w-5 h-5 text-amber-400" />;
      case 'serial_bluetooth':
        return <Bluetooth className="w-5 h-5 text-blue-400" />;
      case 'ssh':
        return <Network className="w-5 h-5 text-emerald-400" />;
      case 'telnet':
        return <Globe className="w-5 h-5 text-cyan-400" />;
      default:
        return <Server className="w-5 h-5 text-purple-400" />;
    }
  };

  const lineCount = logText ? logText.split('\n').length : 0;
  const bufferBytes = new Blob([logText || '']).size;
  const bufferKb = (bufferBytes / 1024).toFixed(1);

  const formatTypeLabel = (type: DeviceProfile['type']) => {
    switch (type) {
      case 'ssh':
        return 'SSH (Secure Shell / Port 22)';
      case 'telnet':
        return 'Telnet (Port 23 / RFC 854)';
      case 'serial_cable':
        return 'Serial Console (USB-to-UART / FTDI / CH340)';
      case 'serial_bluetooth':
        return 'Bluetooth Serial (SPP / BLE)';
      default:
        return 'Virtual Network Device (Simulator)';
    }
  };

  const handleCopySummary = () => {
    const infoText = `=== 69 AI TERMINAL CONNECTION INFO ===
Perangkat: ${device.name}
Brand: ${(device.brand || 'Cisco').toUpperCase()}
Status: ${device.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
Tipe Koneksi: ${formatTypeLabel(device.type)}
Host/IP: ${device.host || device.ipOrPortLabel || 'N/A'}
Port: ${device.port || (device.type === 'ssh' ? 22 : device.type === 'telnet' ? 23 : 'N/A')}
Username: ${device.username || 'admin'}
Baud Rate: ${device.baudRate || 9600} bps
Line Ending: ${(device.lineEnding || 'cr').toUpperCase()}
Hostname Aktif: ${currentHostname || device.hostname || device.name}
CLI Mode: ${currentMode}
Prompt: ${effectivePrompt}
Ukuran Buffer Log: ${bufferKb} KB (${lineCount} baris)
Riwayat Perintah: ${commandCount} perintah
======================================`;

    navigator.clipboard.writeText(infoText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/70 border border-cyan-700/50 text-cyan-300">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Informasi Koneksi Terminal</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  device.status === 'connected' 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60' 
                    : 'bg-rose-950 text-rose-300 border border-rose-500/60'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                  {device.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
                </span>
              </h3>
              <p className="text-xs text-neutral-400 font-mono">
                {device.name} &bull; {(device.brand || 'cisco').toUpperCase()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 space-y-3.5 overflow-y-auto font-sans text-xs text-neutral-200">
          {/* 1. Device & Network Identity Card */}
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
              <div className="flex items-center gap-2">
                {getDeviceTypeIcon(device.type)}
                <div>
                  <div className="text-xs font-semibold text-white">{device.name}</div>
                  <div className="text-[10.5px] text-neutral-400">{formatTypeLabel(device.type)}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/80 font-mono text-[10px] font-bold">
                {(device.brand || 'CISCO').toUpperCase()}
              </span>
            </div>

            {/* Grid Attributes */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase font-sans">IP / Host Address</span>
                <span className="text-cyan-300 font-semibold font-mono break-all select-all">
                  {device.host || device.ipOrPortLabel || '127.0.0.1 (Local)'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase font-sans">Port / Socket</span>
                <span className="text-white font-semibold font-mono">
                  {device.port || (device.type === 'ssh' ? '22 (SSH)' : device.type === 'telnet' ? '23 (Telnet)' : 'Virtual / TTY')}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase font-sans">Username / Auth</span>
                <span className="text-emerald-300 font-semibold font-mono">
                  {device.username || 'admin'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-[10px] text-neutral-500 block uppercase font-sans">Baud Rate / Kecepatan</span>
                <span className="text-amber-300 font-semibold font-mono">
                  {device.baudRate || 9600} bps
                </span>
              </div>
            </div>
          </div>

          {/* 2. Active CLI State & Prompt */}
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
              <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Status CLI & State Mesin Terminal</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-[9.5px] text-neutral-500 block font-sans uppercase">Hostname</span>
                <span className="text-white font-semibold truncate block">
                  {currentHostname || device.hostname || device.name}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-[9.5px] text-neutral-500 block font-sans uppercase">Mode CLI</span>
                <span className="text-amber-300 font-semibold uppercase block truncate">
                  {currentMode}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-[9.5px] text-neutral-500 block font-sans uppercase">Line Ending</span>
                <span className="text-cyan-300 font-semibold uppercase block">
                  {device.lineEnding || 'CR (0x0D)'}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-[11px] font-mono">
              <span className="text-neutral-400">Active Prompt:</span>
              <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-black/60 border border-emerald-500/40">
                {effectivePrompt}
              </span>
            </div>
          </div>

          {/* 3. Session Diagnostics & Buffer Stats */}
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Statistik & Buffer Log Sesi</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-neutral-400 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-neutral-500" />
                  <span>Panjang Buffer</span>
                </span>
                <span className="text-white font-semibold">
                  {lineCount} baris ({bufferKb} KB)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-neutral-400 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-neutral-500" />
                  <span>Riwayat Perintah</span>
                </span>
                <span className="text-white font-semibold">
                  {commandCount} cmd
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Info Lengkap</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {onReconnect && (
              <button
                type="button"
                onClick={() => {
                  onReconnect();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-black font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reconnect Sesi</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
