import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  Sparkles, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Bluetooth, 
  Zap, 
  Radio, 
  Columns, 
  Layers, 
  AppWindow,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  Rows,
  Split,
  GitCompare,
  ArrowRightLeft
} from 'lucide-react';
import { DeviceProfile } from '../types';

interface UnifiedDeviceTabBarProps {
  devices: DeviceProfile[];
  openDevices: DeviceProfile[];
  activeDeviceId: string;
  onSelectTab: (deviceId: string) => void;
  onCloseTab: (deviceId: string) => void;
  onOpenTab: (deviceId: string) => void;
  onOpenAddModal: () => void;
  isAiPanelOpen: boolean;
  onToggleAiPanel: () => void;
  aiPanelMode: 'docked' | 'floating';
  onChangeAiPanelMode: (mode: 'docked' | 'floating') => void;
  aiPanelWidth: 'standard' | 'wide' | 'split';
  onChangeAiPanelWidth: (width: 'standard' | 'wide' | 'split') => void;
  isAiOnline?: boolean;
  splitTerminalMode?: 'none' | 'horizontal' | 'vertical';
  onChangeSplitTerminalMode?: (mode: 'none' | 'horizontal' | 'vertical') => void;
}

export function UnifiedDeviceTabBar({
  devices,
  openDevices,
  activeDeviceId,
  onSelectTab,
  onCloseTab,
  onOpenTab,
  onOpenAddModal,
  isAiPanelOpen,
  onToggleAiPanel,
  aiPanelMode,
  onChangeAiPanelMode,
  aiPanelWidth,
  onChangeAiPanelWidth,
  isAiOnline = true,
  splitTerminalMode = 'none',
  onChangeSplitTerminalMode,
}: UnifiedDeviceTabBarProps) {
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showSplitMenu, setShowSplitMenu] = useState(false);
  const tabMenuRef = useRef<HTMLDivElement>(null);
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const splitMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tabMenuRef.current && !tabMenuRef.current.contains(event.target as Node)) {
        setShowNewTabMenu(false);
      }
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(event.target as Node)) {
        setShowLayoutMenu(false);
      }
      if (splitMenuRef.current && !splitMenuRef.current.contains(event.target as Node)) {
        setShowSplitMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unopenedDevices = devices.filter((d) => !openDevices.some((open) => open.id === d.id));

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'serial_bluetooth':
        return <Bluetooth className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'serial_cable':
        return <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'telnet':
        return <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'ssh':
      default:
        return <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 180;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div
      id="unified-persistent-device-tab-bar"
      className="h-11 bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-800/90 px-2 sm:px-3 flex items-center justify-between text-neutral-300 select-none flex-shrink-0 gap-2 z-20"
    >
      {/* 1. Left Side: Device Tabs with Smooth Scroll */}
      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden py-1">
        {/* Scroll Left Button */}
        <button
          type="button"
          id="btn-unified-scroll-left"
          onClick={() => handleScroll('left')}
          title="Geser Tab ke Kiri"
          className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scrollable Tabs List */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0 flex-1 py-0.5"
        >
          {openDevices.length === 0 ? (
            <div className="text-xs text-neutral-500 italic px-2">
              Tidak ada terminal terbuka. Klik (+) untuk membuka sesi perangkat.
            </div>
          ) : (
            openDevices.map((dev) => {
              const isActive = dev.id === activeDeviceId;
              const displayHostname = dev.hostname || dev.name;

              return (
                <div
                  key={dev.id}
                  id={`unified-tab-${dev.id}`}
                  onClick={() => onSelectTab(dev.id)}
                  title={`${dev.name} (${dev.ipOrPortLabel || dev.type})`}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer border transition-all select-none whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'bg-neutral-900 text-white border-cyan-500/50 shadow-md shadow-cyan-950/40 font-semibold ring-1 ring-cyan-500/30'
                      : 'bg-neutral-950/70 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border-neutral-800/80'
                  }`}
                >
                  {/* Status Indicator Dot with Subtle Glow */}
                  <span className="relative flex h-2 w-2 shrink-0">
                    {dev.status === 'connected' && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        dev.status === 'connected'
                          ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                          : dev.status === 'connecting'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-neutral-600'
                      }`}
                    />
                  </span>

                  {getConnectionIcon(dev.type)}

                  <div className="flex flex-col min-w-0 max-w-[110px] sm:max-w-[150px] md:max-w-[180px] text-left">
                    <span className="truncate font-medium text-[11.5px] leading-tight">
                      {displayHostname}
                    </span>
                    {dev.hostname && dev.hostname !== dev.name && (
                      <span className="truncate text-[9px] text-neutral-500 font-sans leading-none">
                        {dev.name}
                      </span>
                    )}
                  </div>

                  {/* Close Tab Button */}
                  <button
                    type="button"
                    id={`btn-close-unified-tab-${dev.id}`}
                    title={`Tutup tab ${dev.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(dev.id);
                    }}
                    className="p-0.5 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Scroll Right Button */}
        <button
          type="button"
          id="btn-unified-scroll-right"
          onClick={() => handleScroll('right')}
          disabled={openDevices.length <= 1}
          title="Geser Tab ke Kanan"
          className="p-1 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent text-neutral-400 hover:text-white rounded transition-colors flex-shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Always-Visible Pinned Add Tab (+) Button & Dropdown (Fixed outside overflow container) */}
      <div className="relative flex-shrink-0 flex items-center" ref={tabMenuRef}>
        <button
          type="button"
          id="btn-unified-add-tab"
          onClick={() => {
            if (unopenedDevices.length === 0) {
              onOpenAddModal();
            } else {
              setShowNewTabMenu(!showNewTabMenu);
            }
          }}
          title={unopenedDevices.length === 0 ? "Tambah Koneksi Baru (+)" : "Buka / Tambah Tab Terminal (+)"}
          className="flex items-center justify-center p-1.5 text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-700/60 hover:border-cyan-400 rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-cyan-400 hover:text-cyan-300" />
        </button>

        {/* New Tab Dropdown Menu */}
        {showNewTabMenu && (
          <div
            id="dropdown-unified-tab-menu"
            className="absolute left-0 top-full mt-1.5 w-64 bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl py-1.5 z-50 text-xs backdrop-blur-xl animate-fadeIn"
          >
            <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 flex items-center justify-between">
              <span>Buka Tab Sesi Terminal</span>
              <span className="text-[9px] text-cyan-400 font-mono">
                {openDevices.length}/{devices.length} Terbuka
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto py-1">
              {unopenedDevices.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-neutral-500 text-center">
                  Semua perangkat ({devices.length}) sudah dibuka di tab.
                </div>
              ) : (
                unopenedDevices.map((dev) => (
                  <button
                    key={dev.id}
                    type="button"
                    id={`unified-menu-open-device-${dev.id}`}
                    onClick={() => {
                      onOpenTab(dev.id);
                      setShowNewTabMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between text-neutral-200 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {getConnectionIcon(dev.type)}
                      <span className="truncate font-medium text-[11.5px]">
                        {dev.hostname || dev.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {dev.ipOrPortLabel?.split(' ')[0]}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-neutral-800 pt-1 px-1">
              <button
                type="button"
                id="unified-menu-create-device"
                onClick={() => {
                  setShowNewTabMenu(false);
                  onOpenAddModal();
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-950/50 text-cyan-400 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Koneksi Baru...</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Right Side Controls: Session Counter, Split Terminal Mode, Layout Switcher & AI Toggle */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Active Session Counter Badge */}
        <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[10.5px] font-mono text-neutral-400">
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span>{openDevices.length} Tab</span>
        </div>

        {/* Multi-Terminal Split Screen Selector */}
        {onChangeSplitTerminalMode && (
          <div className="relative flex-shrink-0" ref={splitMenuRef}>
            <button
              type="button"
              id="btn-toggle-split-terminal-menu"
              onClick={() => setShowSplitMenu(!showSplitMenu)}
              title={
                splitTerminalMode === 'horizontal'
                  ? "Split Terminal: 2 Terminal Berdampingan (Kiri & Kanan). Klik untuk ubah."
                  : splitTerminalMode === 'vertical'
                  ? "Split Terminal: 2 Terminal Bertumpuk (Atas & Bawah). Klik untuk ubah."
                  : "Buka 2 Terminal Berdampingan (Dual Terminal Split) untuk troubleshooting"
              }
              className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                splitTerminalMode !== 'none'
                  ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-200 hover:bg-cyan-900/60 shadow-[0_0_10px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/40'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {splitTerminalMode === 'horizontal' ? (
                <Split className="w-3.5 h-3.5 text-cyan-400" />
              ) : splitTerminalMode === 'vertical' ? (
                <Rows className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5 text-neutral-400" />
              )}
              <span className="text-[11px] hidden xs:inline">
                {splitTerminalMode === 'horizontal' 
                  ? '2 Berdampingan' 
                  : splitTerminalMode === 'vertical' 
                  ? '2 Bertumpuk' 
                  : 'Split Terminal'}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {/* Split Screen Options Dropdown */}
            {showSplitMenu && (
              <div
                id="dropdown-split-terminal-options"
                className="absolute right-0 top-full mt-1.5 w-64 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1.5 backdrop-blur-xl animate-fadeIn"
              >
                <div className="px-1.5 py-0.5 border-b border-neutral-800">
                  <span className="font-semibold text-neutral-200 block text-[11px]">
                    Layout Multi-Terminal
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Buka & bandingkan 2 perangkat bersamaan
                  </span>
                </div>

                {/* Option 1: Single Terminal */}
                <button
                  type="button"
                  id="btn-split-mode-none"
                  onClick={() => {
                    onChangeSplitTerminalMode('none');
                    setShowSplitMenu(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2 cursor-pointer ${
                    splitTerminalMode === 'none'
                      ? 'bg-blue-950/40 border-blue-500/60 text-blue-200'
                      : 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <Terminal className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <span>1 Terminal Penuh (Single)</span>
                      {splitTerminalMode === 'none' && (
                        <span className="text-[9px] px-1 bg-blue-900 text-blue-200 rounded">Aktif</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 block leading-tight">
                      Satu layar konsol perangkat fokus.
                    </span>
                  </div>
                </button>

                {/* Option 2: Split Horizontal (Side by Side) */}
                <button
                  type="button"
                  id="btn-split-mode-horizontal"
                  onClick={() => {
                    onChangeSplitTerminalMode('horizontal');
                    setShowSplitMenu(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2 cursor-pointer ${
                    splitTerminalMode === 'horizontal'
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                      : 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <Split className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <span>2 Terminal Berdampingan (Kiri & Kanan)</span>
                      {splitTerminalMode === 'horizontal' && (
                        <span className="text-[9px] px-1 bg-cyan-900 text-cyan-200 rounded">Aktif</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 block leading-tight">
                      Ideal untuk membandingkan output, rute & status 2 router/switch berdampingan.
                    </span>
                  </div>
                </button>

                {/* Option 3: Split Vertical (Top and Bottom) */}
                <button
                  type="button"
                  id="btn-split-mode-vertical"
                  onClick={() => {
                    onChangeSplitTerminalMode('vertical');
                    setShowSplitMenu(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2 cursor-pointer ${
                    splitTerminalMode === 'vertical'
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <Rows className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <span>2 Terminal Bertumpuk (Atas & Bawah)</span>
                      {splitTerminalMode === 'vertical' && (
                        <span className="text-[9px] px-1 bg-emerald-900 text-emerald-200 rounded">Aktif</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 block leading-tight">
                      Memantau 2 stream log console yang lebar secara bersamaan.
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Layout Mode Selector (Docked Split vs Floating Glass Drawer) */}
        {isAiPanelOpen && (
          <div className="relative flex-shrink-0" ref={layoutMenuRef}>
            <button
              type="button"
              id="btn-toggle-ai-layout-menu"
              onClick={() => setShowLayoutMenu(!showLayoutMenu)}
              title={`Mode Tampilan AI: ${aiPanelMode === 'floating' ? 'Floating Glass (Melayang)' : 'Docked (Berdampingan)'}. Klik untuk opsi.`}
              className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                aiPanelMode === 'floating'
                  ? 'bg-purple-950/50 border-purple-600/60 text-purple-300 hover:bg-purple-900/60'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              {aiPanelMode === 'floating' ? (
                <AppWindow className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <Columns className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden sm:inline text-[11px]">
                {aiPanelMode === 'floating' ? 'Floating Glass' : 'Split View'}
              </span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {/* Layout Options Dropdown */}
            {showLayoutMenu && (
              <div
                id="dropdown-ai-layout-options"
                className="absolute right-0 top-full mt-1.5 w-60 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-2 z-50 text-xs space-y-2 backdrop-blur-xl"
              >
                <div className="px-1.5 py-0.5 border-b border-neutral-800">
                  <span className="font-semibold text-neutral-200 block text-[11px]">
                    Mode Tampilan AI & Terminal
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Pilih layout yang paling nyaman untuk macOS Anda
                  </span>
                </div>

                {/* Mode Option 1: Split View (Docked) */}
                <button
                  type="button"
                  onClick={() => {
                    onChangeAiPanelMode('docked');
                    setShowLayoutMenu(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2 ${
                    aiPanelMode === 'docked'
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200'
                      : 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <Columns className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <span>Berdampingan (Docked Split)</span>
                      {aiPanelMode === 'docked' && (
                        <span className="text-[9px] px-1 bg-cyan-900 text-cyan-200 rounded">Aktif</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 block leading-tight">
                      Terminal & Chat AI membagi layar rapi tanpa tumpang tindih.
                    </span>
                  </div>
                </button>

                {/* Mode Option 2: Floating Glass Drawer */}
                <button
                  type="button"
                  onClick={() => {
                    onChangeAiPanelMode('floating');
                    setShowLayoutMenu(false);
                  }}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex items-start gap-2 ${
                    aiPanelMode === 'floating'
                      ? 'bg-purple-950/40 border-purple-500/60 text-purple-200'
                      : 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <AppWindow className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-[11px] flex items-center gap-1">
                      <span>Floating Glass (Melayang)</span>
                      {aiPanelMode === 'floating' && (
                        <span className="text-[9px] px-1 bg-purple-900 text-purple-200 rounded">Aktif</span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 block leading-tight">
                      Terminal tetap 100% lebar penuh, AI melayang elegan di sisi kanan.
                    </span>
                  </div>
                </button>

                {/* Width presets */}
                <div className="pt-1.5 border-t border-neutral-800">
                  <span className="text-[10px] font-semibold text-neutral-400 block px-1 mb-1">
                    Lebar Panel AI:
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => onChangeAiPanelWidth('standard')}
                      className={`py-1 rounded text-[10px] font-mono border text-center transition-all ${
                        aiPanelWidth === 'standard'
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                      }`}
                    >
                      Kompak
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeAiPanelWidth('wide')}
                      className={`py-1 rounded text-[10px] font-mono border text-center transition-all ${
                        aiPanelWidth === 'wide'
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                      }`}
                    >
                      Lebar
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeAiPanelWidth('split')}
                      className={`py-1 rounded text-[10px] font-mono border text-center transition-all ${
                        aiPanelWidth === 'split'
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                      }`}
                    >
                      50 / 50
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gemini AI Assistant Master Toggle Button */}
        <button
          type="button"
          id="btn-unified-toggle-ai"
          onClick={onToggleAiPanel}
          title={isAiPanelOpen ? 'Sembunyikan Panel AI Assistant' : 'Buka Panel Gemini AI Assistant'}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
            isAiPanelOpen
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-900/40 ring-1 ring-blue-400/50'
              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800'
          }`}
        >
          <Sparkles
            className={`w-3.5 h-3.5 ${
              isAiPanelOpen ? 'text-amber-300 animate-pulse' : 'text-blue-400'
            }`}
          />
          <span className="hidden xs:inline">Gemini AI</span>
          {/* Status Dot */}
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isAiOnline ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.9)]' : 'bg-amber-400'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
