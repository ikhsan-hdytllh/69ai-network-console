import React, { useRef, useEffect, useState } from 'react';
import { 
  Power, 
  Trash2, 
  Copy, 
  Check, 
  Info, 
  Bluetooth, 
  Sparkles, 
  ChevronDown, 
  CornerDownLeft, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  HelpCircle, 
  ArrowRightToLine, 
  Ban, 
  FastForward, 
  MoreHorizontal, 
  Lock, 
  Eye, 
  EyeOff, 
  GitCompare, 
  Camera, 
  Bot,
  ChevronsDown,
  Server
} from 'lucide-react';
import { DeviceProfile } from '../types';
import { ConnectionInfoModal } from './ConnectionInfoModal';

interface SingleTerminalPaneViewProps {
  paneLabel: string;
  paneColor: 'cyan' | 'emerald' | 'blue';
  device: DeviceProfile | null;
  allDevices: DeviceProfile[];
  openDevices: DeviceProfile[];
  log: string;
  currentInput: string;
  onChangeInput: (val: string) => void;
  effectivePrompt: string;
  isConnecting: boolean;
  fontSize: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onExecute: (cmd: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onClear: () => void;
  onCopy: () => void;
  isCopied: boolean;
  onSelectDevice: (deviceId: string) => void;
  onInspectAi?: () => void;
  onTakeSnapshot?: () => void;
  onOpenSnapshotDiff?: () => void;
  snapshotCount?: number;
  isPagerActive?: boolean;
  pagerLabel?: string;
  onPageNext?: () => void;
  onPageNextLine?: () => void;
  onPageQuit?: () => void;
  onPageAll?: () => void;
  autoShowAllOnExec?: boolean;
  onToggleAutoShowAllOnExec?: () => void;
  isPasswordInput?: boolean;
  isMaskedPassword?: boolean;
  showPasswordPlainText?: boolean;
  onTogglePasswordMask?: () => void;
  onToggleShowPasswordPlainText?: () => void;
  onTabKey?: () => void;
  onCtrlC?: () => void;
  onCtrlZ?: () => void;
  onHelpKey?: () => void;
  onHistoryUp?: () => void;
  onHistoryDown?: () => void;
  ColorizedTerminalOutputComponent: React.ComponentType<{
    rawText: string;
    onPageNext?: () => void;
    onPageNextLine?: () => void;
    onPageQuit?: () => void;
    onPageAll?: () => void;
  }>;
}

export const SingleTerminalPaneView: React.FC<SingleTerminalPaneViewProps> = ({
  paneLabel,
  paneColor,
  device,
  allDevices,
  openDevices,
  log,
  currentInput,
  onChangeInput,
  effectivePrompt,
  isConnecting,
  fontSize,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExecute,
  onConnect,
  onDisconnect,
  onClear,
  onCopy,
  isCopied,
  onSelectDevice,
  onInspectAi,
  onTakeSnapshot,
  onOpenSnapshotDiff,
  snapshotCount = 0,
  isPagerActive,
  pagerLabel,
  onPageNext,
  onPageNextLine,
  onPageQuit,
  onPageAll,
  autoShowAllOnExec,
  onToggleAutoShowAllOnExec,
  isPasswordInput,
  isMaskedPassword,
  showPasswordPlainText,
  onTogglePasswordMask,
  onToggleShowPasswordPlainText,
  onTabKey,
  onCtrlC,
  onCtrlZ,
  onHelpKey,
  onHistoryUp,
  onHistoryDown,
  ColorizedTerminalOutputComponent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDeviceMenu, setShowDeviceMenu] = React.useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const deviceMenuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on log changes
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }, [log, currentInput, effectivePrompt]);

  // Click outside listener for device dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(e.target as Node)) {
        setShowDeviceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTerminalClick = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().length === 0) {
      inputRef.current?.focus();
    }
  };

  const colorClasses = {
    cyan: {
      badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
      headerBg: 'bg-[#0f141c]',
      prompt: 'text-cyan-400',
    },
    emerald: {
      badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60',
      headerBg: 'bg-[#0f1814]',
      prompt: 'text-emerald-400',
    },
    blue: {
      badge: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
      headerBg: 'bg-[#0f141c]',
      prompt: 'text-blue-400',
    },
  }[paneColor];

  if (!device) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black text-neutral-400 h-full">
        <Server className="w-8 h-8 text-neutral-600 mb-2" />
        <h4 className="font-semibold text-neutral-200 text-xs mb-1">{paneLabel}: Belum Ada Perangkat</h4>
        <p className="text-[11px] text-neutral-500 mb-3">Pilih salah satu perangkat untuk ditampilkan di panel ini.</p>
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {allDevices.slice(0, 4).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelectDevice(d.id)}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-mono"
            >
              {d.hostname || d.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const deviceName = device.hostname || device.name;
  const isConnected = device.status === 'connected';

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-black relative border-t md:border-t-0 border-neutral-800">
      {/* 1. Pane Header Toolbar */}
      <div className={`px-2.5 py-1.5 ${colorClasses.headerBg} border-b border-neutral-800/80 flex items-center justify-between gap-1.5 flex-shrink-0 z-10 select-none text-xs`}>
        {/* Left: Pane Identifier & Device Selector Dropdown */}
        <div className="flex items-center gap-1.5 min-w-0" ref={deviceMenuRef}>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${colorClasses.badge} uppercase tracking-wider shrink-0`}>
            {paneLabel}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDeviceMenu(!showDeviceMenu)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-white font-mono text-xs font-semibold cursor-pointer truncate max-w-[140px] sm:max-w-[200px]"
              title="Klik untuk mengganti perangkat di panel terminal ini"
            >
              <Server className="w-3 h-3 text-neutral-400 shrink-0" />
              <span className="truncate">{deviceName}</span>
              <ChevronDown className="w-3 h-3 text-neutral-400 shrink-0" />
            </button>

            {showDeviceMenu && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1">
                <div className="px-2 py-1 text-[10px] text-neutral-400 uppercase font-mono tracking-wider border-b border-neutral-800">
                  Pilih Perangkat untuk {paneLabel}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {allDevices.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        onSelectDevice(d.id);
                        setShowDeviceMenu(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between font-mono text-xs transition-colors ${
                        d.id === device.id
                          ? 'bg-blue-600/30 text-blue-200 border border-blue-500/40'
                          : 'hover:bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      <span className="truncate font-medium">{d.hostname || d.name}</span>
                      <span className="text-[10px] text-neutral-500 font-sans uppercase">
                        {d.brand || d.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status Indicator */}
          <span 
            className={`w-2 h-2 rounded-full shrink-0 ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-neutral-600'
            }`}
            title={isConnected ? 'Terkoneksi' : isConnecting ? 'Menghubungkan...' : 'Terputus'}
          />
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Connect / Disconnect (Icon Only) */}
          <button
            type="button"
            onClick={isConnected ? onDisconnect : onConnect}
            disabled={isConnecting}
            className={`p-1 rounded border transition-all cursor-pointer flex items-center justify-center ${
              isConnected
                ? 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-neutral-300'
                : isConnecting
                ? 'bg-amber-950 border-amber-700 text-amber-300'
                : 'bg-emerald-950 border-emerald-700 hover:bg-emerald-900 text-emerald-300'
            }`}
            title={isConnected ? 'Putus Koneksi Terminal' : isConnecting ? 'Sedang Menghubungkan...' : 'Sambungkan Terminal'}
          >
            {isConnecting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Power className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Info Koneksi Terminal & IP Button (Icon Only) */}
          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            title="Informasi Detail Koneksi Terminal & IP"
            className="p-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer flex items-center justify-center"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Direct AI Inspect */}
          {onInspectAi && (
            <button
              type="button"
              onClick={onInspectAi}
              title={`Analisa output ${deviceName} dengan AI`}
              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-blue-400 hover:text-blue-300 border border-neutral-700 transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Snapshot Direct */}
          {onTakeSnapshot && (
            <button
              type="button"
              onClick={onTakeSnapshot}
              title="Ambil Snapshot Manual Konfigurasi"
              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-400 border border-neutral-700 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Snapshot Diff Modal */}
          {onOpenSnapshotDiff && (
            <button
              type="button"
              onClick={onOpenSnapshotDiff}
              title="Buka Perbandingan Snapshot Konfigurasi"
              className="relative p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-400 border border-neutral-700 transition-colors cursor-pointer"
            >
              <GitCompare className="w-3.5 h-3.5" />
              {snapshotCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 min-w-[13px] h-[13px] flex items-center justify-center text-[8.5px] font-mono font-bold bg-cyan-500 text-black rounded-full">
                  {snapshotCount > 9 ? '9+' : snapshotCount}
                </span>
              )}
            </button>
          )}

          {/* Copy Buffer */}
          <button
            type="button"
            onClick={onCopy}
            title="Copy Semua Log Panel Ini"
            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-0.5 bg-neutral-900 border border-neutral-800 rounded px-1">
            <button
              type="button"
              onClick={onZoomOut}
              title="Kecilkan Font"
              className="p-0.5 text-neutral-400 hover:text-white transition-colors"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onResetZoom}
              title="Reset Font"
              className="px-1 text-[9.5px] font-mono text-cyan-400"
            >
              {fontSize}px
            </button>
            <button
              type="button"
              onClick={onZoomIn}
              title="Perbesar Font"
              className="p-0.5 text-neutral-400 hover:text-white transition-colors"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {/* Clear Buffer */}
          <button
            type="button"
            onClick={onClear}
            title="Hapus Layar (Clear Screen)"
            className="p-1 rounded bg-neutral-800 hover:bg-rose-950/70 text-neutral-400 hover:text-rose-300 border border-neutral-700 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Quick Key Helper Row */}
      <div className="bg-neutral-950 border-b border-neutral-800/80 px-2 py-0.5 flex items-center justify-between gap-1 select-none flex-shrink-0 z-10 text-xs">
        <div className="flex items-center gap-1 flex-wrap">
          {/* TAB */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onTabKey}
            title="TAB (Auto-complete)"
            className="p-1 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono flex items-center justify-center cursor-pointer"
          >
            <ArrowRightToLine className="w-3 h-3" />
          </button>

          {/* ^C */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCtrlC}
            title="Ctrl+C / ^C (Interrupt / Cancel)"
            className="p-1 px-2 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono flex items-center justify-center cursor-pointer"
          >
            <Ban className="w-3 h-3" />
          </button>

          {/* ^Z */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCtrlZ}
            title="Ctrl+Z (Exit Config Mode)"
            className="px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[9.5px] font-mono font-bold cursor-pointer"
          >
            ^Z
          </button>

          {/* ? */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onHelpKey}
            title="? (Context Help)"
            className="p-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-[10px] cursor-pointer"
          >
            <HelpCircle className="w-3 h-3" />
          </button>

          {/* Up */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onHistoryUp}
            title="Panah Atas (History Up)"
            className="p-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] cursor-pointer"
          >
            <ArrowUp className="w-3 h-3" />
          </button>

          {/* Down */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onHistoryDown}
            title="Panah Bawah (History Down)"
            className="p-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] cursor-pointer"
          >
            <ArrowDown className="w-3 h-3" />
          </button>

          {/* Password Mask */}
          {onTogglePasswordMask && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onTogglePasswordMask}
              title={isMaskedPassword ? "Karakter sandi disamarkan" : "Masking sandi"}
              className="p-1 px-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 cursor-pointer"
            >
              <Lock className="w-3 h-3 text-neutral-400" />
            </button>
          )}
        </div>

        {/* Enter Key */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (device.status === 'disconnected') {
              onConnect();
              return;
            }
            if (isPagerActive && onPageNext) {
              onPageNext();
              return;
            }
            onExecute(currentInput);
          }}
          title="ENTER (Kirim)"
          className="p-1 px-2.5 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shrink-0"
        >
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </div>

      {/* 3. Output Stream Canvas Body */}
      <div 
        ref={containerRef}
        onClick={handleTerminalClick}
        className="flex-1 overflow-y-auto p-2 sm:p-3 font-mono leading-relaxed text-slate-100 bg-black cursor-text select-text will-change-scroll overscroll-contain min-w-0"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: `${Math.max(1.35, fontSize * 0.12)}`,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {log && (
          <ColorizedTerminalOutputComponent 
            rawText={log} 
            onPageNext={onPageNext}
            onPageNextLine={onPageNextLine}
            onPageQuit={onPageQuit}
            onPageAll={onPageAll}
          />
        )}

        {/* Interactive CLI Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (device.status === 'disconnected') {
              onConnect();
              return;
            }
            if (isPagerActive && onPageNext) {
              onPageNext();
              return;
            }
            onExecute(currentInput);
          }}
          className="flex items-center font-mono mt-0.5 leading-normal w-full flex-nowrap min-w-0"
          style={{ fontSize: `${fontSize}px` }}
        >
          <span className={`${colorClasses.prompt} font-mono font-bold whitespace-pre select-none flex-shrink-0`}>
            {effectivePrompt}
          </span>
          <input
            ref={inputRef}
            type={isMaskedPassword ? "password" : "text"}
            enterKeyHint={isPagerActive ? 'next' : 'go'}
            value={currentInput}
            onChange={(e) => onChangeInput(e.target.value)}
            style={{ fontSize: `${fontSize}px` }}
            className="flex-1 bg-transparent border-none outline-none font-mono text-white caret-white p-0 m-0 min-w-0 w-full"
            spellCheck={false}
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={
              device.status === 'disconnected'
                ? ' (Tekan Enter / Connect untuk menyambungkan)'
                : isPagerActive
                ? ' (Tekan Spasi untuk lanjut)'
                : isMaskedPassword
                ? '•••••••• (Sandi Terproteksi)'
                : ''
            }
          />
        </form>

        {device.status === 'disconnected' && (
          <div className="mt-2 text-amber-400 text-[10.5px] font-mono select-none flex items-center justify-between gap-2">
            <span>remote disconnected — tekan Enter untuk mencoba kembali</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsInfoModalOpen(true)}
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-400 border border-neutral-700 transition-colors cursor-pointer"
                title="Informasi Koneksi Terminal & IP"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onConnect}
                className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[9.5px] transition-colors cursor-pointer"
              >
                Reconnect
              </button>
            </div>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Connection Info & IP Modal */}
      <ConnectionInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        device={device}
        effectivePrompt={effectivePrompt}
        logText={log}
        onReconnect={onConnect}
      />
    </div>
  );
};
