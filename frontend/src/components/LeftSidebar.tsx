import { safeStorage } from "../utils/safeStorage";
import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Server, 
  Plus, 
  Search, 
  Database, 
  Download, 
  User,
  UserCheck, 
  Mail,
  Settings, 
  Cable, 
  Bluetooth, 
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Sparkles,
  Globe,
  Activity,
  FolderSync,
  Radio,
  GitCompare
} from 'lucide-react';
import { DeviceProfile, DeviceBrand } from '../types';
import { getUnifiedBrandCatalog } from '../services/dbStorage';
import { GoogleAiStudioModal } from './GoogleAiStudioModal';
import { getSavedProviderAccounts } from '../services/providerAuthService';
import { TransitAiQuickConnectBar } from './TransitAiQuickConnectBar';
import { QuickDeviceSelectionData } from './QuickDeviceTypePickerModal';

interface LeftSidebarProps {
  devices: DeviceProfile[];
  activeDeviceId: string;
  openDeviceIds?: string[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectDevice: (id: string) => void;
  onEditDevice?: (device: DeviceProfile) => void;
  onDeleteDevice?: (deviceId: string) => void;
  onOpenAddModal: () => void;
  onOpenOfflineKb: () => void;
  onOpenFtpTftp?: () => void;
  onOpenTrafficGenerator?: () => void;
  onOpenSettings: () => void;
  onOpenIrxonAt?: () => void;
  onOpenSnapshotDiff?: (device?: DeviceProfile) => void;
  onQuickConnectDevice?: (data: QuickDeviceSelectionData) => void;
  onOpenBleScanner?: () => void;
  isMobileView?: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  devices,
  activeDeviceId,
  openDeviceIds = [],
  isCollapsed = false,
  onToggleCollapse,
  onSelectDevice,
  onEditDevice,
  onDeleteDevice,
  onOpenAddModal,
  onOpenOfflineKb,
  onOpenFtpTftp,
  onOpenTrafficGenerator,
  onOpenSettings,
  onOpenSnapshotDiff,
  onQuickConnectDevice,
  onOpenBleScanner,
  isMobileView = false,
}) => {
  const [activeNavTab, setActiveNavTab] = useState<'ssh' | 'apis' | 'terminal' | 'files' | 'pcaps'>('terminal');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceProfile | null>(null);

  // Operator & AI Account status
  const [operatorName, setOperatorName] = useState<string>('Network Operator');
  const [operatorEmail, setOperatorEmail] = useState<string>('');
  const [isGmailConnected, setIsGmailConnected] = useState<boolean>(true);
  const [aiProvider, setAiProvider] = useState<string>('gemini');
  const [hasCustomKey, setHasCustomKey] = useState<boolean>(false);
  const [isOnlineSearch, setIsOnlineSearch] = useState<boolean>(true);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadOperatorAndAiState = () => {
      try {
        const accounts = getSavedProviderAccounts();
        const geminiAcc = accounts['gemini'];
        const savedEmail = safeStorage.getItem('69ai_operator_email') || geminiAcc?.userEmail || '';
        const name = safeStorage.getItem('69ai_operator_name') || geminiAcc?.userName || 'Network Operator';
        const prov = safeStorage.getItem('69ai_user_provider') || 'gemini';
        const key = safeStorage.getItem('69ai_user_api_key') || safeStorage.getItem('69ai_api_key_gemini') || '';
        const searchSetting = safeStorage.getItem('69ai_enable_online_search');
        
        setOperatorName(name);
        setOperatorEmail(savedEmail);
        setAiProvider(prov);
        setHasCustomKey(!!key.trim());
        setIsOnlineSearch(searchSetting !== null ? JSON.parse(searchSetting) : true);
        setIsGmailConnected(Boolean(geminiAcc?.isLoggedIn && savedEmail.includes('@')));
      } catch (e) {
        // ignore
      }
    };

    const handleOpenGmailEvent = () => {
      setIsGmailModalOpen(true);
    };

    loadOperatorAndAiState();
    window.addEventListener('storage', loadOperatorAndAiState);
    window.addEventListener('69ai_settings_updated', loadOperatorAndAiState);
    window.addEventListener('69ai_open_gmail_login', handleOpenGmailEvent);
    return () => {
      window.removeEventListener('storage', loadOperatorAndAiState);
      window.removeEventListener('69ai_settings_updated', loadOperatorAndAiState);
      window.removeEventListener('69ai_open_gmail_login', handleOpenGmailEvent);
    };
  }, []);

  const filteredDevices = (devices || []).filter((dev) => {
    if (!dev) return false;
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (dev.name || '').toLowerCase().includes(query) ||
      (dev.hostname || '').toLowerCase().includes(query) ||
      (dev.ipOrPortLabel || '').toLowerCase().includes(query) ||
      (dev.brand || '').toLowerCase().includes(query) ||
      (dev.model || '').toLowerCase().includes(query);

    const matchesBrand = filterBrand === 'all' || dev.brand === filterBrand;
    return matchesSearch && matchesBrand;
  });

  const getBrandBadge = (brand?: DeviceBrand) => {
    switch (brand) {
      case 'juniper':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-800/60 font-mono">JUNIPER</span>;
      case 'cisco':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800/60 font-mono">CISCO</span>;
      case 'arista':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-800/60 font-mono">ARISTA</span>;
      case 'paloalto':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-950/90 text-orange-300 border border-orange-800/60 font-mono">PALO ALTO</span>;
      case 'ubiquiti':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/90 text-sky-300 border border-sky-800/60 font-mono">UBIQUITI</span>;
      case 'linux':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-800/60 font-mono">LINUX</span>;
      case 'fortinet':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950/90 text-red-300 border border-red-800/60 font-mono">FORTINET</span>;
      case 'alliedtelesis':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/90 text-sky-300 border border-sky-800/60 font-mono font-semibold">ALLIED TELESIS</span>;
      case 'mikrotik':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950/90 text-teal-300 border border-teal-800/60 font-mono">MIKROTIK</span>;
      case 'huawei':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-800/60 font-mono">HUAWEI</span>;
      case 'aruba':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-950/90 text-orange-300 border border-orange-800/60 font-mono">ARUBA</span>;
      case 'ruckus':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-800/60 font-mono">RUCKUS</span>;
      case 'dell':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-800/60 font-mono">DELL</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono">DEVICE</span>;
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'serial_cable':
        return <Cable className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'serial_bluetooth':
        return <Bluetooth className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'ssh':
        return <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-neutral-400 shrink-0" />;
    }
  };

  const handleDeleteConfirm = () => {
    if (deviceToDelete && onDeleteDevice) {
      onDeleteDevice(deviceToDelete.id);
      setDeviceToDelete(null);
    }
  };

  // Minimized / Collapsed Compact Rail View
  if (isCollapsed) {
    return (
      <div 
        id="left-sidebar-collapsed-rail"
        className="w-14 sm:w-16 bg-black border-r border-neutral-800 flex flex-col items-center py-2.5 justify-between shrink-0 select-none z-20"
      >
        {/* Top: Expand Trigger */}
        <div className="flex flex-col items-center gap-2 w-full px-1">
          <button
            type="button"
            id="btn-expand-sidebar-rail"
            onClick={onToggleCollapse}
            title="Tampilkan / Buka Daftar Perangkat (Expand)"
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-all cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          <div className="w-8 h-[1px] bg-neutral-800 my-0.5" />

          {/* Quick Add Device (+) Button */}
          <button
            type="button"
            id="btn-add-device-rail"
            onClick={onOpenAddModal}
            title="Tambah Perangkat Baru (+ Add Connection)"
            className="w-10 h-8 sm:w-11 sm:h-9 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-8 h-[1px] bg-neutral-800 my-0.5" />

          {onOpenTrafficGenerator && (
            <button
              type="button"
              id="rail-nav-traffic-gen"
              onClick={onOpenTrafficGenerator}
              title="Traffic Generator & Packet Analyzer (IT • IoT • OT • Stress Test 1G/10G)"
              className="p-2 text-amber-400 hover:text-amber-300 hover:bg-neutral-900 rounded-lg transition-all"
            >
              <Activity className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            id="rail-nav-offline-kb"
            onClick={onOpenOfflineKb}
            title="Database Command Offline (100+ Perintah)"
            className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-900 rounded-lg transition-all"
          >
            <Database className="w-4 h-4" />
          </button>

          {onOpenSnapshotDiff && (
            <button
              type="button"
              id="rail-nav-snapshot-diff"
              onClick={() => onOpenSnapshotDiff()}
              title="Config Snapshot & Perbandingan Diff (Bandingkan Konfigurasi)"
              className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-neutral-900 rounded-lg transition-all"
            >
              <GitCompare className="w-4 h-4" />
            </button>
          )}

          {onOpenFtpTftp && (
            <button
              type="button"
              id="rail-nav-ftp-tftp"
              onClick={onOpenFtpTftp}
              title="FTP & TFTP File Server"
              className="p-2 text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 rounded-lg transition-all"
            >
              <FolderSync className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Rail Items */}
        <div className="flex flex-col items-center gap-2 w-full px-1">
          {/* Dedicated Gmail / Google User Icon Button in Rail */}
          <button 
            type="button"
            id="rail-nav-user-gmail"
            onClick={() => setIsGmailModalOpen(true)}
            title={`Akun Gmail (${operatorEmail}) - Terhubung ke Google Gemini Chat. Klik untuk Login / Kelola Akun.`}
            className="relative p-2 text-blue-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-all cursor-pointer group"
          >
            <div className="relative">
              <Mail className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
              <span className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-black ${
                isGmailConnected ? 'bg-emerald-400 ' : 'bg-amber-400'
              }`} />
            </div>
          </button>

          <button 
            type="button"
            id="rail-nav-settings"
            onClick={onOpenSettings}
            title="Pengaturan & Akun AI"
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="btn-expand-sidebar-bottom-rail"
            onClick={onToggleCollapse}
            title="Buka Daftar Perangkat"
            className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-neutral-900 rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="left-sidebar-container" 
      className={`flex h-full bg-black border-r border-neutral-800 select-none text-white transition-all ${
        isMobileView ? 'w-full flex-col' : 'w-72 lg:w-80'
      }`}
    >
      {/* 1. Leftmost Vertical Nav Strip */}
      {!isMobileView && (
        <div id="vertical-nav-strip" className="w-12 bg-neutral-950 border-r border-neutral-800 flex flex-col items-center py-3 justify-between shrink-0">
          <div className="flex flex-col items-center gap-2.5 w-full">
            {onToggleCollapse && (
              <button
                type="button"
                id="btn-collapse-sidebar-strip"
                onClick={onToggleCollapse}
                title="Sembunyikan / Minimalkan List Device"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

            <button
              id="nav-tab-terminal"
              onClick={() => setActiveNavTab('terminal')}
              title="Terminal Console"
              className={`p-2 rounded-lg transition-all ${
                activeNavTab === 'terminal' 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Terminal className="w-4 h-4" />
            </button>

            <button
              id="nav-tab-ssh"
              onClick={() => setActiveNavTab('ssh')}
              title="SSH Connections"
              className={`p-2 rounded-lg transition-all ${
                activeNavTab === 'ssh' 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Server className="w-4 h-4" />
            </button>

            {onOpenTrafficGenerator && (
              <button
                id="nav-tab-traffic-gen"
                onClick={onOpenTrafficGenerator}
                title="Traffic Generator & Packet Analyzer (IT • IoT • OT • Stress Test 1G/10G)"
                className="p-2 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-neutral-900 transition-all"
              >
                <Activity className="w-4 h-4" />
              </button>
            )}

            <button
              id="nav-tab-apis"
              onClick={onOpenOfflineKb}
              title="Offline Command Database"
              className="p-2 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-neutral-900 transition-all"
            >
              <Database className="w-4 h-4" />
            </button>

            {onOpenSnapshotDiff && (
              <button
                id="nav-tab-snapshot-diff"
                onClick={() => onOpenSnapshotDiff()}
                title="Config Snapshot & Perbandingan Diff"
                className="p-2 rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-neutral-900 transition-all"
              >
                <GitCompare className="w-4 h-4" />
              </button>
            )}

            {onOpenFtpTftp && (
              <button
                id="nav-tab-ftp-tftp"
                onClick={onOpenFtpTftp}
                title="FTP & TFTP File Server"
                className="p-2 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-900 transition-all"
              >
                <FolderSync className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <button 
              id="nav-settings-btn"
              onClick={onOpenSettings}
              title="Pengaturan Sistem"
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Device List & Connection Management Sub-Panel */}
      <div id="device-management-panel" className="flex-1 flex flex-col justify-between h-full bg-black overflow-hidden">
        {/* Top Header */}
        <div className="p-3 sm:p-3.5 border-b border-neutral-800 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-sm text-white tracking-tight">Daftar Perangkat</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                {devices.length}
              </span>
            </div>

            <button 
              id="btn-add-device"
              onClick={onOpenAddModal} 
              title="Tambah Koneksi Baru (SSH / Serial / BLE)" 
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mt-2">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-devices"
              placeholder="Cari perangkat, IP, host..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-neutral-900 border border-neutral-800 focus:border-blue-500 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Brand Quick Filter */}
          <div className="flex items-center gap-1 mt-2 overflow-x-auto scrollbar-none pb-0.5">
            {['all', 'cisco', 'juniper', 'fortinet', 'mikrotik', 'linux'].map((brandKey) => (
              <button
                key={brandKey}
                type="button"
                onClick={() => setFilterBrand(brandKey)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-colors cursor-pointer ${
                  filterBrand === brandKey
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800/80'
                }`}
              >
                {brandKey.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Device List */}
        <div className="p-2 space-y-1.5 flex-1 overflow-y-auto">
          {filteredDevices.length > 0 ? (
            filteredDevices.map((dev) => {
              const isActive = dev.id === activeDeviceId;
              const isOpen = openDeviceIds.includes(dev.id);

              return (
                <div
                  key={dev.id}
                  id={`device-item-${dev.id}`}
                  onClick={() => onSelectDevice(dev.id)}
                  className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isActive
                      ? 'bg-blue-950/40 border-blue-500/80 shadow-xs ring-1 ring-blue-500/20'
                      : 'bg-neutral-900/80 hover:bg-neutral-850 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg shrink-0 border ${
                      isActive 
                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' 
                        : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400 group-hover:text-white'
                    }`}>
                      {getConnectionIcon(dev.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold truncate ${
                          isActive ? 'text-blue-300' : 'text-white'
                        }`}>
                          {dev.name}
                        </span>

                        {isOpen && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Tab Terbuka" />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-neutral-400 font-mono truncate max-w-[130px]">
                          {dev.hostname || dev.ipOrPortLabel || dev.host || 'Console'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        {getBrandBadge(dev.brand)}
                        {dev.model && (
                          <span className="text-[9px] text-neutral-400 font-mono truncate max-w-[90px]">
                            {dev.model}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Snapshot Diff, Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                    {onOpenSnapshotDiff && (
                      <button
                        type="button"
                        id={`btn-snapshot-diff-device-${dev.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSnapshotDiff(dev);
                        }}
                        title="Lihat Snapshot & Bandingkan Diff Konfigurasi"
                        className="p-1 text-cyan-400 hover:text-cyan-300 hover:bg-neutral-800 rounded transition-colors"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onEditDevice && (
                      <button
                        type="button"
                        id={`btn-edit-device-${dev.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditDevice(dev);
                        }}
                        title="Edit Perangkat"
                        className="p-1 text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteDevice && (
                      <button
                        type="button"
                        id={`btn-delete-device-${dev.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeviceToDelete(dev);
                        }}
                        title="Hapus Perangkat"
                        className="p-1 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center flex flex-col items-center justify-center gap-2 text-neutral-500">
              <Server className="w-8 h-8 text-neutral-600" />
              <p className="text-xs">
                {searchQuery ? 'Tidak ada perangkat yang sesuai pencarian.' : 'Belum ada perangkat tersimpan.'}
              </p>
              <button
                type="button"
                onClick={onOpenAddModal}
                className="mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Perangkat</span>
              </button>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deviceToDelete && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm w-full p-4 space-y-3 shadow-2xl">
              <div className="flex items-center gap-2.5 text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-semibold text-white">Hapus Perangkat?</h3>
              </div>
              <p className="text-xs text-neutral-300">
                Apakah Anda yakin ingin menghapus profile <strong className="text-white">"{deviceToDelete.name}"</strong>? Konfigurasi dan riwayat sesi perangkat ini akan dihapus.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeviceToDelete(null)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Operator Status Strip & AI Studio Key Configuration */}
        <div id="bottom-operator-strip" className="p-2.5 border-t border-neutral-800 bg-neutral-950 flex flex-col gap-2 shrink-0">
          <div 
            id="btn-sidebar-aistudio-login-trigger"
            onClick={() => setIsGmailModalOpen(true)}
            className="flex items-center justify-between p-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-blue-500/50 cursor-pointer transition-all group"
            title="Klik untuk Pengaturan Google AI Studio Gemini API Key"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar with Google AI Studio Sparkle theme */}
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600/30 via-indigo-500/30 to-purple-400/20 border border-blue-500/40 flex items-center justify-center text-white group-hover:border-blue-400 transition-colors">
                  <Sparkles className="w-4 h-4 text-blue-400 group-hover:scale-105 transition-transform" />
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${
                  hasCustomKey ? 'bg-emerald-400 ' : 'bg-amber-400'
                }`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white font-semibold truncate">
                    {operatorName}
                  </span>
                </div>

                <span className={`text-[10px] font-mono block truncate max-w-[135px] ${
                  hasCustomKey ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {hasCustomKey ? 'AI Studio Key: Aktif' : 'Set Gemini API Key'}
                </span>

                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-950/90 text-blue-300 border border-blue-800/80">
                    GOOGLE AI STUDIO
                  </span>

                  {isOnlineSearch && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800 flex items-center gap-0.5">
                      <Globe className="w-2 h-2" />
                      <span>WEB</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button 
                type="button"
                id="btn-sidebar-ai-login-key"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings();
                }}
                title="Pengaturan Aplikasi & AI Provider Lain" 
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Google AI Studio Gemini Modal */}
        <GoogleAiStudioModal 
          isOpen={isGmailModalOpen} 
          onClose={() => setIsGmailModalOpen(false)} 
        />
      </div>
    </div>
  );
};
