import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APP_VERSION } from './config/release';
import { Terminal, Server, Bot, Settings, Wrench, Sparkles, Plus, BookOpen, Radio, Network, Key, Activity, GitCompare } from 'lucide-react';
import { LeftSidebar } from './components/LeftSidebar';
import { TerminalScreen } from './components/TerminalScreen';
import { TrafficGeneratorScreen } from './components/TrafficGeneratorScreen';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { UnifiedDeviceTabBar } from './components/UnifiedDeviceTabBar';
import { AddConnectionModal } from './components/AddConnectionModal';
import { OfflineKbModal } from './components/OfflineKbModal';
import { SettingsModal } from './components/SettingsModal';
import { ProviderLoginModal } from './components/ProviderLoginModal';
import { IrxonAtCommandModal } from './components/IrxonAtCommandModal';
import { FtpTftpModal } from './components/FtpTftpModal';
import { BleWebViewBridge } from './components/BleWebViewBridge';
import { DeviceProfile } from './types';
import { SixtyNineAiLogo } from './components/SixtyNineAiLogo';
import { QuickDeviceSelectionData } from './components/QuickDeviceTypePickerModal';
import { 
  getSavedDevices, 
  saveDevices, 
  getSavedOpenTabs, 
  saveOpenTabs, 
  deleteDeviceFromStorage, 
  updateDeviceInStorage 
} from './services/dbStorage';
import { disconnectSerialSession } from './services/serialConnection';
import { safeStorage } from './utils/safeStorage';

export default function App() {
  const [devices, setDevices] = useState<DeviceProfile[]>(getSavedDevices());
  
  // Environment detection: Check if running as Native Desktop (macOS/Electron) or Native Android APK
  const isNativeApp = typeof window !== 'undefined' && (
    !!(window as any).DesktopNative?.isElectron ||
    !!(window as any).DesktopNative?.isDesktopNative ||
    !!(window as any).nativeMacApi ||
    !!(window as any).NativeBrowser ||
    !!(window as any).AndroidNative ||
    !!(window as any).androidNativeApi ||
    !!(window as any).Android ||
    /Electron|SixtyNineAndroid|AndroidNative/i.test(navigator.userAgent || '')
  );

  // Array of open device IDs in terminal tabs
  const [openTabIds, setOpenTabIds] = useState<string[]>(() => {
    const savedTabs = getSavedOpenTabs();
    const existing = savedTabs.filter((id) => devices.some((d) => d.id === id));
    if (existing.length > 0) return existing;
    return devices.length > 0 ? [devices[0].id] : [];
  });

  // Active focused device ID
  const [activeDeviceId, setActiveDeviceId] = useState<string>(() => {
    return openTabIds[0] || devices[0]?.id || '';
  });
  
  // Sidebar visibility / collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('69ai_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Mobile active view state ('terminal' | 'traffic_gen' | 'devices' | 'ai' | 'tools')
  const [mobileActiveView, setMobileActiveView] = useState<'terminal' | 'traffic_gen' | 'devices' | 'ai' | 'tools'>('terminal');

  // Main Workspace screen mode ('terminal' | 'traffic_gen')
  const [workspaceMode, setWorkspaceMode] = useState<'terminal' | 'traffic_gen'>('terminal');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingDevice, setEditingDevice] = useState<DeviceProfile | null>(null);
  const [isOfflineKbOpen, setIsOfflineKbOpen] = useState<boolean>(false);
  const [offlineKbInitialTab, setOfflineKbInitialTab] = useState<'list' | 'add_command' | 'brands' | 'backup' | 'sync_github'>('list');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isProviderLoginOpen, setIsProviderLoginOpen] = useState<boolean>(false);
  const [isIrxonAtModalOpen, setIsIrxonAtModalOpen] = useState<boolean>(false);
  const [isFtpTftpOpen, setIsFtpTftpOpen] = useState<boolean>(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState<boolean>(true);
  const [aiPanelMode, setAiPanelMode] = useState<'docked' | 'floating'>(() => {
    return (safeStorage.getItem('69ai_ui_ai_mode') as 'docked' | 'floating') || 'docked';
  });
  const [aiPanelWidth, setAiPanelWidth] = useState<'standard' | 'wide' | 'split'>(() => {
    return (safeStorage.getItem('69ai_ui_ai_width') as 'standard' | 'wide' | 'split') || 'standard';
  });
  const [splitTerminalMode, setSplitTerminalMode] = useState<'none' | 'horizontal' | 'vertical'>(() => {
    try {
      const saved = safeStorage.getItem('69ai_split_terminal_mode');
      if (saved === 'horizontal' || saved === 'vertical') return saved;
    } catch {}
    return 'none';
  });
  const [secondaryDeviceId, setSecondaryDeviceId] = useState<string>(() => {
    try {
      const saved = safeStorage.getItem('69ai_secondary_device_id');
      if (saved) return saved;
    } catch {}
    return '';
  });

  // Terminal context & execution triggers
  const [currentTerminalText, setCurrentTerminalText] = useState<string>('');
  const [externalCommandTrigger, setExternalCommandTrigger] = useState<{ 
    command: string; 
    id: number;
    inspectAfter?: boolean;
    autoShowAll?: boolean;
    onCompleted?: (result: { command: string; output: string; fullLog: string }) => void;
  } | null>(null);
  const [inspectTrigger, setInspectTrigger] = useState<{ 
    id: number; 
    text?: string;
    commandExecuted?: string;
    commandOutput?: string;
    isCommandOutputOnly?: boolean;
    isAnomalyOrError?: boolean;
    anomalyTitle?: string;
    rawErrorLine?: string;
    suggestedAction?: string;
    anomalyType?: string;
    recommendedCommands?: { cmd: string; purpose: string }[];
  } | undefined>(undefined);
  const pendingInspectCommandRef = useRef<{ command: string; id: number } | null>(null);

  // Persist sidebar state
  useEffect(() => {
    try {
      safeStorage.setItem('69ai_sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
    } catch {}
  }, [isSidebarCollapsed]);

  // Persist open tabs whenever they change
  useEffect(() => {
    saveOpenTabs(openTabIds);
  }, [openTabIds]);

  const activeDevice = devices.find((d) => d.id === activeDeviceId) || null;
  const openDevices = openTabIds
    .map((id) => devices.find((d) => d.id === id))
    .filter((d): d is DeviceProfile => d !== undefined);

  // Select a device from sidebar: if not open in tabs, open it and switch active tab to it
  const handleSelectDevice = useCallback((id: string) => {
    setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveDeviceId(id);
    setWorkspaceMode('terminal');
    setMobileActiveView('terminal');
  }, []);

  // Open device tab explicitly
  const handleOpenTab = useCallback((id: string) => {
    setOpenTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveDeviceId(id);
    setWorkspaceMode('terminal');
    setMobileActiveView('terminal');
  }, []);

  // Close specific terminal tab
  const handleCloseTab = useCallback((deviceIdToClose: string) => {
    disconnectSerialSession(deviceIdToClose);
    setOpenTabIds((prev) => {
      const nextTabs = prev.filter((id) => id !== deviceIdToClose);
      return nextTabs;
    });

    setActiveDeviceId((current) => {
      if (current === deviceIdToClose) {
        return '';
      }
      return current;
    });
  }, []);

  // Add new device
  const handleAddDevice = useCallback((newDev: DeviceProfile) => {
    setDevices((prev) => {
      const updated = [newDev, ...prev];
      saveDevices(updated);
      return updated;
    });
    setOpenTabIds((prev) => (prev.includes(newDev.id) ? prev : [...prev, newDev.id]));
    setActiveDeviceId(newDev.id);
    setMobileActiveView('terminal');
  }, []);

  // Edit existing device
  const handleUpdateDevice = useCallback((updatedDev: DeviceProfile) => {
    const updated = updateDeviceInStorage(updatedDev);
    setDevices(updated);
  }, []);

  // Delete device from list
  const handleDeleteDevice = useCallback((deviceIdToDelete: string) => {
    disconnectSerialSession(deviceIdToDelete);
    const updated = deleteDeviceFromStorage(deviceIdToDelete);
    setDevices(updated);
    setOpenTabIds((prev) => prev.filter((id) => id !== deviceIdToDelete));
    setActiveDeviceId((current) => (current === deviceIdToDelete ? (updated[0]?.id || '') : current));
  }, []);

  const handleOpenEditModal = useCallback((device: DeviceProfile) => {
    setEditingDevice(device);
    setIsAddModalOpen(true);
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setEditingDevice(null);
    setIsAddModalOpen(true);
  }, []);

  const handleUpdateDeviceStatus = useCallback((deviceId: string, status: 'connected' | 'disconnected' | 'connecting') => {
    setDevices((prev) => {
      const target = prev.find((d) => d.id === deviceId);
      if (target && target.status === status) return prev;
      const updated = prev.map((d) => (d.id === deviceId ? { ...d, status } : d));
      saveDevices(updated);
      return updated;
    });
  }, []);

  const handleUpdateDeviceHostname = useCallback((deviceId: string, realHostname: string) => {
    if (!deviceId || !realHostname) return;
    setDevices((prev) => {
      const target = prev.find((d) => d.id === deviceId);
      if (!target || target.hostname === realHostname) return prev;
      const updated = prev.map((d) => (d.id === deviceId ? { ...d, hostname: realHostname } : d));
      saveDevices(updated);
      return updated;
    });
  }, []);

  const handleUpdateDeviceBrand = useCallback((deviceId: string, brand: string) => {
    if (!deviceId || !brand) return;
    setDevices((prev) => {
      const updated = prev.map((d) => (d.id === deviceId ? { ...d, brand: brand as any } : d));
      saveDevices(updated);
      return updated;
    });
  }, []);

  const handleTerminalLogChange = useCallback((log: string) => {
    setCurrentTerminalText((prev) => (prev === log ? prev : log));
  }, []);

  const handleSplitModeChange = useCallback((mode: 'none' | 'horizontal' | 'vertical') => {
    setSplitTerminalMode(mode);
    try {
      safeStorage.setItem('69ai_split_terminal_mode', mode);
    } catch {}
    if (mode !== 'none') {
      setSecondaryDeviceId((current) => {
        if (!current || current === activeDeviceId) {
          const candidate = openTabIds.find((id) => id !== activeDeviceId) || devices.find((d) => d.id !== activeDeviceId)?.id || '';
          if (candidate) {
            try { safeStorage.setItem('69ai_secondary_device_id', candidate); } catch {}
            return candidate;
          }
        }
        return current;
      });
    }
  }, [activeDeviceId, openTabIds, devices]);

  const handleSecondaryDeviceChange = useCallback((id: string) => {
    setSecondaryDeviceId(id);
    try {
      safeStorage.setItem('69ai_secondary_device_id', id);
    } catch {}
  }, []);

  const handleExecuteInTerminal = useCallback((command: string, options?: { autoShowAll?: boolean }) => {
    setExternalCommandTrigger({ 
      command, 
      id: Date.now(),
      autoShowAll: options?.autoShowAll ?? true,
    });
    setMobileActiveView('terminal');
  }, []);

  const handleCommandExecutionComplete = useCallback((command: string, output: string, fullLog: string) => {
    setCurrentTerminalText((prev) => (prev === fullLog ? prev : fullLog));
    if (pendingInspectCommandRef.current && pendingInspectCommandRef.current.command === command) {
      pendingInspectCommandRef.current = null;
      setInspectTrigger({
        id: Date.now(),
        text: fullLog,
        commandExecuted: command,
        commandOutput: output,
        isCommandOutputOnly: true,
      });
      setIsAiPanelOpen(true);
    }
  }, []);

  const handleExecuteAndInspectInTerminal = useCallback((command: string, targetDeviceId?: string, options?: { keepMobileView?: boolean }) => {
    if (targetDeviceId) {
      handleSelectDevice(targetDeviceId);
    }
    const execId = Date.now();
    pendingInspectCommandRef.current = { command, id: execId };
    setExternalCommandTrigger({
      command,
      id: execId,
      inspectAfter: true,
      autoShowAll: true,
      onCompleted: (res) => {
        handleCommandExecutionComplete(res.command, res.output, res.fullLog);
      },
    });
    setWorkspaceMode('terminal');
    if (!options?.keepMobileView) {
      setMobileActiveView('terminal');
    }
    setIsAiPanelOpen(true);
  }, [handleSelectDevice, handleCommandExecutionComplete]);

  const handleCompareWithAi = useCallback((prompt: string) => {
    setIsAiPanelOpen(true);
    setInspectTrigger({
      id: Date.now(),
      text: prompt,
      isCommandOutputOnly: false,
    });
  }, []);

  const handleOpenIrxonAtModal = useCallback(() => {
    setIsIrxonAtModalOpen(true);
  }, []);

  const handleToggleAiPanel = useCallback(() => {
    setIsAiPanelOpen((prev) => !prev);
  }, []);

  const handleInspectTerminal = useCallback((
    terminalText: string,
    options?: {
      isAnomalyOrError?: boolean;
      anomalyTitle?: string;
      anomalySnippet?: string;
      rawErrorLine?: string;
      suggestedAction?: string;
      anomalyType?: string;
      recommendedCommands?: { cmd: string; purpose: string }[];
    }
  ) => {
    setCurrentTerminalText((prev) => (prev === terminalText ? prev : terminalText));
    setInspectTrigger({
      id: Date.now(),
      text: terminalText,
      isCommandOutputOnly: false,
      isAnomalyOrError: options?.isAnomalyOrError,
      anomalyTitle: options?.anomalyTitle,
      commandOutput: options?.anomalySnippet,
      rawErrorLine: options?.rawErrorLine,
      suggestedAction: options?.suggestedAction,
      anomalyType: options?.anomalyType,
      recommendedCommands: options?.recommendedCommands,
    });
    setIsAiPanelOpen(true);
  }, []);

  // 1-Click Quick Connect from Transit AI status bar (Auto-creates or selects device and connects)
  const handleQuickConnectDevice = (data: QuickDeviceSelectionData) => {
    let existing = devices.find(d => 
      (data.serialPortPath && d.serialPortPath === data.serialPortPath) ||
      (data.bluetoothAddress && d.bluetoothAddress === data.bluetoothAddress) ||
      d.ipOrPortLabel === data.ipOrPortLabel
    );

    if (!existing) {
      const newDev: DeviceProfile = {
        id: `dev-${Date.now()}`,
        name: data.name,
        type: data.type,
        brand: data.brand,
        model: data.model,
        baudRate: data.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        dtrRts: true,
        lineEnding: 'cr',
        ipOrPortLabel: data.ipOrPortLabel,
        serialPortPath: data.serialPortPath,
        bluetoothName: data.bluetoothName,
        bluetoothAddress: data.bluetoothAddress,
        status: 'connecting',
        lastConnected: new Date().toISOString()
      };
      setDevices(prev => {
        const updated = [...prev, newDev];
        saveDevices(updated);
        return updated;
      });
      existing = newDev;
    } else {
      const updated: DeviceProfile = { 
        ...existing, 
        name: data.name || existing.name,
        brand: data.brand, 
        model: data.model, 
        baudRate: data.baudRate, 
        status: 'connecting'
      };
      setDevices(prev => {
        const list = prev.map(d => d.id === updated.id ? updated : d);
        saveDevices(list);
        return list;
      });
      existing = updated;
    }

    handleOpenTab(existing.id);
    setActiveDeviceId(existing.id);
    setWorkspaceMode('terminal');
    setMobileActiveView('terminal');
  };

  return (
    <div id="app-root-container" className="flex flex-col h-screen w-full bg-black text-white font-sans overflow-hidden">
      {/* Top Header: Responsive with Brand, Mode Tabs and Quick Action Shortcuts */}
      <header id="app-top-header" className="h-11 border-b border-neutral-800 flex items-center justify-between px-3 sm:px-4 bg-black flex-shrink-0 gap-2">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <SixtyNineAiLogo size="sm" showGlow={true} />
          <h1 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
            <span>69 AI Terminal</span>
            <span className="hidden sm:inline text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800/80 font-mono">
              v{APP_VERSION}
            </span>
          </h1>
        </div>

        {/* Primary Workspace Mode Switcher & Tools (Terminal / Traffic Generator / FTP-TFTP / Offline KB) */}
        <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 rounded-lg p-0.5">
          <button
            type="button"
            id="tab-workspace-terminal"
            onClick={() => {
              setWorkspaceMode('terminal');
              setMobileActiveView('terminal');
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              workspaceMode === 'terminal'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Terminal CLI Multi-Tab (SSH & Serial Session)"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal</span>
          </button>

          <button
            type="button"
            id="tab-workspace-traffic-gen"
            onClick={() => {
              setWorkspaceMode('traffic_gen');
              setMobileActiveView('traffic_gen');
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              workspaceMode === 'traffic_gen'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-800'
            }`}
            title="Traffic Generator & Packet Analyzer (IT, IoT, OT, Benchmark 1G/10G)"
          >
            <Activity className="w-3.5 h-3.5 text-amber-300" />
            <span>Traffic Generator</span>
          </button>

          <button
            type="button"
            id="btn-header-ftp-tftp"
            onClick={() => setIsFtpTftpOpen(true)}
            className="px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800"
            title="FTP & TFTP Server Lokal (Backup Config & Firmware Upgrade)"
          >
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>FTP / TFTP Server</span>
          </button>

          {!isNativeApp && (
            <button
              type="button"
              id="btn-header-offline-kb"
              onClick={() => setIsOfflineKbOpen(true)}
              className="px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer text-neutral-400 hover:text-cyan-300 hover:bg-neutral-800 hidden lg:flex"
              title="Offline Knowledge Base & Multi-Brand Playbook"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Offline KB</span>
            </button>
          )}
        </div>

        {/* Quick Header Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            id="btn-header-settings"
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Pengaturan Aplikasi & AI"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace (Side Menu in Simulation, Full-Width in Native Apps) */}
      <div id="main-workspace-container" className="flex flex-1 overflow-hidden bg-black relative">
        {/* Left Side: Device Connections, Search, Edit & Delete + Export Tools (Simulation Only) */}
        {!isNativeApp && (
          <div className={`h-full flex-shrink-0 ${
            mobileActiveView === 'devices' 
              ? 'w-full block absolute inset-0 z-30 bg-black md:relative md:w-auto md:block' 
              : 'hidden md:block'
          }`}>
            <LeftSidebar
              devices={devices}
              activeDeviceId={activeDeviceId}
              openDeviceIds={openTabIds}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => {
                const next = !isSidebarCollapsed;
                setIsSidebarCollapsed(next);
                safeStorage.setItem('69ai_sidebar_collapsed', JSON.stringify(next));
              }}
              onSelectDevice={handleSelectDevice}
              onEditDevice={handleOpenEditModal}
              onDeleteDevice={handleDeleteDevice}
              onOpenAddModal={handleOpenAddModal}
              onOpenOfflineKb={() => setIsOfflineKbOpen(true)}
              onOpenFtpTftp={() => setIsFtpTftpOpen(true)}
              onOpenTrafficGenerator={() => {
                setWorkspaceMode('traffic_gen');
                setMobileActiveView('traffic_gen');
              }}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenIrxonAt={() => setIsIrxonAtModalOpen(true)}
              onQuickConnectDevice={handleQuickConnectDevice}
              onOpenBleScanner={() => setIsAddModalOpen(true)}
              onOpenSnapshotDiff={(dev) => {
                if (dev && dev.id !== activeDeviceId) {
                  setActiveDeviceId(dev.id);
                  if (!openTabIds.includes(dev.id)) {
                    setOpenTabIds([...openTabIds, dev.id]);
                  }
                }
                window.dispatchEvent(new CustomEvent('69ai_open_snapshot_diff', {
                  detail: { deviceId: dev ? dev.id : activeDeviceId }
                }));
              }}
            />
          </div>
        )}

        {/* Middle & Right Workspace Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          {/* Top Unified Device Tab Bar (Always visible above both Terminal & AI Chat) */}
          {workspaceMode === 'terminal' && (
            <UnifiedDeviceTabBar
              devices={devices}
              openDevices={openDevices}
              activeDeviceId={activeDeviceId}
              onSelectTab={setActiveDeviceId}
              onCloseTab={handleCloseTab}
              onOpenTab={handleOpenTab}
              onOpenAddModal={handleOpenAddModal}
              isAiPanelOpen={isAiPanelOpen}
              onToggleAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)}
              aiPanelMode={aiPanelMode}
              onChangeAiPanelMode={(mode) => {
                setAiPanelMode(mode);
                safeStorage.setItem('69ai_ui_ai_mode', mode);
              }}
              aiPanelWidth={aiPanelWidth}
              onChangeAiPanelWidth={(width) => {
                setAiPanelWidth(width);
                safeStorage.setItem('69ai_ui_ai_width', width);
              }}
              splitTerminalMode={splitTerminalMode}
              onChangeSplitTerminalMode={handleSplitModeChange}
            />
          )}

          {/* Workspace Body: Terminal / Traffic Gen + AI (Docked / Floating) */}
          <div className="flex-1 flex min-w-0 overflow-hidden relative">
            {/* Terminal Screen / Traffic Generator Screen */}
            <div 
              className={`h-full flex flex-col min-w-0 overflow-hidden transition-all ${
                !isAiPanelOpen || aiPanelMode === 'floating'
                  ? 'w-full flex-1'
                  : aiPanelWidth === 'standard'
                  ? 'w-full md:w-[60%] flex-1'
                  : aiPanelWidth === 'wide'
                  ? 'w-full md:w-1/2 flex-1'
                  : 'w-full md:w-[42%] flex-1'
              }`}
            >
              <div className={`h-full w-full ${workspaceMode === 'terminal' && mobileActiveView === 'terminal' ? 'flex flex-col' : 'hidden'}`}>
                <TerminalScreen
                  activeDevice={activeDevice}
                  openDevices={openDevices}
                  allDevices={devices}
                  onSelectTab={setActiveDeviceId}
                  onCloseTab={handleCloseTab}
                  onOpenTab={handleOpenTab}
                  onOpenAddModal={handleOpenAddModal}
                  onInspectTerminal={handleInspectTerminal}
                  onTerminalLogChange={handleTerminalLogChange}
                  onUpdateDeviceStatus={handleUpdateDeviceStatus}
                  onUpdateDeviceHostname={handleUpdateDeviceHostname}
                  onUpdateDevice={handleUpdateDevice}
                  onOpenIrxonAt={handleOpenIrxonAtModal}
                  externalCommandTrigger={externalCommandTrigger}
                  onCommandExecutionComplete={handleCommandExecutionComplete}
                  isAiPanelOpen={isAiPanelOpen}
                  onToggleAiPanel={handleToggleAiPanel}
                  hideTabsInHeader={true}
                  splitMode={splitTerminalMode}
                  onSplitModeChange={handleSplitModeChange}
                  secondaryDeviceId={secondaryDeviceId}
                  onSelectSecondaryDevice={handleSecondaryDeviceChange}
                  onCompareWithAi={handleCompareWithAi}
                />
              </div>

              <div className={`h-full w-full ${workspaceMode === 'traffic_gen' || mobileActiveView === 'traffic_gen' ? 'flex flex-col' : 'hidden'}`}>
                <TrafficGeneratorScreen
                  activeDeviceIp={activeDevice?.ipOrPortLabel?.split(':')[0] || '192.168.1.1'}
                  isAiPanelOpen={isAiPanelOpen}
                  onToggleAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)}
                  onSendToAiAssistant={(promptText, contextPayload) => {
                    setIsAiPanelOpen(true);
                    setInspectTrigger({ 
                      id: Date.now(), 
                      text: promptText,
                      isCommandOutputOnly: false
                    });
                  }}
                  onExecuteInTerminal={(cmd) => {
                    handleExecuteInTerminal(cmd);
                    setWorkspaceMode('terminal');
                    setMobileActiveView('terminal');
                  }}
                />
              </div>
            </div>

            {/* AI Assistant Panel (Docked Mode) */}
            {isAiPanelOpen && aiPanelMode === 'docked' && (
              <div 
                className={`h-full flex flex-col min-w-0 overflow-hidden z-20 border-l border-neutral-800 transition-all ${
                  aiPanelWidth === 'standard' 
                    ? 'w-full md:w-[40%] flex-1' 
                    : aiPanelWidth === 'wide' 
                    ? 'w-full md:w-1/2 flex-1' 
                    : 'w-full md:w-[58%] flex-1'
                }`}
              >
                <AiAssistantPanel
                  activeDevice={activeDevice || devices[0]}
                  devices={devices}
                  openDevices={openDevices}
                  onSelectActiveDevice={handleSelectDevice}
                  onExecuteInTerminal={(cmd, targetDevId) => {
                    if (targetDevId && targetDevId !== activeDeviceId) {
                      handleSelectDevice(targetDevId);
                    }
                    handleExecuteInTerminal(cmd);
                  }}
                  onExecuteAndInspect={(cmd, targetDevId, opts) => {
                    handleExecuteAndInspectInTerminal(cmd, targetDevId, opts);
                  }}
                  terminalContextText={currentTerminalText}
                  isOpen={isAiPanelOpen}
                  onClosePanel={() => setIsAiPanelOpen(false)}
                  onOpenPanel={() => setIsAiPanelOpen(true)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  inspectTrigger={inspectTrigger}
                />
              </div>
            )}

            {/* AI Assistant Panel (Floating Glassmorphism Mode) */}
            {isAiPanelOpen && aiPanelMode === 'floating' && (
              <div 
                className="absolute right-3 bottom-3 top-3 w-[460px] max-w-[calc(100%-24px)] z-40 rounded-2xl shadow-2xl border border-neutral-700/80 bg-neutral-950/95 backdrop-blur-2xl flex flex-col overflow-hidden animate-fadeIn"
              >
                <AiAssistantPanel
                  activeDevice={activeDevice || devices[0]}
                  devices={devices}
                  openDevices={openDevices}
                  onSelectActiveDevice={handleSelectDevice}
                  onExecuteInTerminal={(cmd, targetDevId) => {
                    if (targetDevId && targetDevId !== activeDeviceId) {
                      handleSelectDevice(targetDevId);
                    }
                    handleExecuteInTerminal(cmd);
                  }}
                  onExecuteAndInspect={(cmd, targetDevId, opts) => {
                    handleExecuteAndInspectInTerminal(cmd, targetDevId, opts);
                  }}
                  terminalContextText={currentTerminalText}
                  isOpen={isAiPanelOpen}
                  onClosePanel={() => setIsAiPanelOpen(false)}
                  onOpenPanel={() => setIsAiPanelOpen(true)}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  inspectTrigger={inspectTrigger}
                />
              </div>
            )}
          </div>
        </div>

        {/* 4. Mobile Tools Grid Drawer View */}
        {mobileActiveView === 'tools' && (
          <div className="md:hidden absolute inset-0 z-30 bg-slate-950 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-cyan-400" />
                <span>Menu Alat & Utilitas Jaringan</span>
              </h2>
              <button
                type="button"
                onClick={() => setMobileActiveView('terminal')}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
              >
                Tutup
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                id="btn-mobile-tool-traffic-gen"
                onClick={() => {
                  setMobileActiveView('traffic_gen');
                  setWorkspaceMode('traffic_gen');
                }}
                className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-left space-y-1"
              >
                <Activity className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white block">Traffic Generator</span>
                <span className="text-[10px] text-slate-400 block">IT, IoT, OT & Stress 1G/10G</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileActiveView('terminal');
                  setIsProviderLoginOpen(true);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500 text-left space-y-1"
              >
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white block">Login AI Gemini</span>
                <span className="text-[10px] text-slate-400 block">Hubungkan Sesi Gemini</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileActiveView('terminal');
                  handleOpenAddModal();
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 text-left space-y-1"
              >
                <Plus className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-white block">Tambah Perangkat</span>
                <span className="text-[10px] text-slate-400 block">SSH / Serial / Bluetooth</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileActiveView('terminal');
                  setIsFtpTftpOpen(true);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500 text-left space-y-1"
              >
                <Network className="w-5 h-5 text-blue-400" />
                <span className="font-semibold text-white block">Server FTP / TFTP</span>
                <span className="text-[10px] text-slate-400 block">Transfer Firmware & Backup</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileActiveView('terminal');
                  window.dispatchEvent(new CustomEvent('69ai_open_snapshot_diff', {
                    detail: { deviceId: activeDeviceId }
                  }));
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-left space-y-1"
              >
                <GitCompare className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-white block">Bandingkan Snapshot & Diff</span>
                <span className="text-[10px] text-slate-400 block">Visual Diff & Auto Rollback</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileActiveView('terminal');
                  setIsOfflineKbOpen(true);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500 text-left space-y-1"
              >
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span className="font-semibold text-white block">Database Offline</span>
                <span className="text-[10px] text-slate-400 block">100+ Perintah Router</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileActiveView('terminal');
                  setIsIrxonAtModalOpen(true);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-left space-y-1"
              >
                <Radio className="w-5 h-5 text-cyan-400" />
                <span className="font-semibold text-white block">IRXON AT Mode</span>
                <span className="text-[10px] text-slate-400 block">Config BT578/BT580</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileActiveView('terminal');
                  setIsSettingsOpen(true);
                }}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500 text-left space-y-1"
              >
                <Settings className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-white block">Pengaturan</span>
                <span className="text-[10px] text-slate-400 block">Baud rate, font, theme</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Android APK & Responsive) */}
      <div id="mobile-bottom-nav-bar" className="md:hidden h-12 bg-slate-950 border-t border-slate-800 flex items-center justify-around px-1.5 flex-shrink-0 z-40 text-[10px]">
        <button
          type="button"
          id="btn-mobile-nav-terminal"
          onClick={() => {
            setMobileActiveView('terminal');
            setWorkspaceMode('terminal');
            setIsAiPanelOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all ${
            mobileActiveView === 'terminal' && !isAiPanelOpen
              ? 'text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4 mb-0.5" />
          <span>Terminal</span>
        </button>

        <button
          type="button"
          id="btn-mobile-nav-traffic-gen"
          onClick={() => {
            setMobileActiveView('traffic_gen');
            setWorkspaceMode('traffic_gen');
            setIsAiPanelOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all ${
            mobileActiveView === 'traffic_gen' && !isAiPanelOpen
              ? 'text-amber-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>Traffic Gen</span>
        </button>

        <button
          type="button"
          id="btn-mobile-nav-devices"
          onClick={() => setMobileActiveView(mobileActiveView === 'devices' ? 'terminal' : 'devices')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-all ${
            mobileActiveView === 'devices'
              ? 'text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4 mb-0.5" />
          <span>Perangkat</span>
        </button>

        <button
          type="button"
          id="btn-mobile-nav-ai"
          onClick={() => {
            setIsAiPanelOpen(!isAiPanelOpen);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all relative ${
            isAiPanelOpen
              ? 'text-blue-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4 mb-0.5 text-amber-300" />
          <span>69 AI Chat</span>
          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          type="button"
          id="btn-mobile-nav-tools"
          onClick={() => setMobileActiveView(mobileActiveView === 'tools' ? 'terminal' : 'tools')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all ${
            mobileActiveView === 'tools'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4 mb-0.5" />
          <span>Alat</span>
        </button>
      </div>

      {/* Modals */}
      <AddConnectionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDevice(null);
        }}
        onAddDevice={handleAddDevice}
        onUpdateDevice={handleUpdateDevice}
        initialDevice={editingDevice}
        onOpenIrxonAt={() => setIsIrxonAtModalOpen(true)}
      />

      <OfflineKbModal
        isOpen={isOfflineKbOpen}
        onClose={() => setIsOfflineKbOpen(false)}
        onExecuteCommand={handleExecuteInTerminal}
        initialTab={offlineKbInitialTab}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenIrxonAt={() => setIsIrxonAtModalOpen(true)}
        onOpenOfflineKb={(tab) => {
          setOfflineKbInitialTab(tab || 'sync_github');
          setIsOfflineKbOpen(true);
        }}
      />

      <ProviderLoginModal
        isOpen={isProviderLoginOpen}
        onClose={() => setIsProviderLoginOpen(false)}
      />

      <IrxonAtCommandModal
        isOpen={isIrxonAtModalOpen}
        onClose={() => setIsIrxonAtModalOpen(false)}
      />

      <FtpTftpModal
        isOpen={isFtpTftpOpen}
        onClose={() => setIsFtpTftpOpen(false)}
        activeDevice={activeDevice || undefined}
        onExecuteCommand={handleExecuteInTerminal}
      />

      {/* Isolated Web Bluetooth Bridge for Irxon BT578 V3 BLE */}
      <BleWebViewBridge />
    </div>
  );
}
