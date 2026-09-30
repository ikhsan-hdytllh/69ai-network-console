import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Search, 
  Copy, 
  Check, 
  Play, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Pencil, 
  Layers, 
  Tag, 
  Terminal, 
  Server, 
  Cpu, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  FolderPlus,
  RefreshCw,
  FileCode,
  ShieldCheck,
  Globe,
  GitBranch,
  Github,
  ExternalLink
} from 'lucide-react';
import { CommandReference, DeviceBrand, DeviceModelOption } from '../types';
import { BrandInfo } from '../data/deviceCatalog';
import { copyToClipboard } from '../utils/clipboard';
import { 
  getCachedCommands, 
  getCustomCommandsOnly, 
  addCachedCommand, 
  updateCachedCommand, 
  deleteCachedCommand, 
  importCommandsFromJson,
  getUnifiedBrandCatalog,
  addCustomBrand,
  deleteCustomBrand,
  addCustomModel,
  deleteCustomModel
} from '../services/dbStorage';
import {
  executeMultiVendorGitHubSync,
  getGitHubSyncStats,
  purgeGitHubSyncedCommands,
  MULTI_VENDOR_GITHUB_CATALOGS,
  SyncStats
} from '../services/githubKbSyncService';

interface OfflineKbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string) => void;
  initialTab?: 'list' | 'add_command' | 'brands' | 'backup' | 'sync_github';
  initialBrand?: string;
}

export const OfflineKbModal: React.FC<OfflineKbModalProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
  initialTab = 'list',
  initialBrand = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add_command' | 'brands' | 'backup' | 'sync_github'>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<CommandReference | null>(null);
  const [mobileDetailView, setMobileDetailView] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State: Add / Edit Command
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null);
  const [cmdFormBrand, setCmdFormBrand] = useState<string>('cisco');
  const [cmdFormModelCategory, setCmdFormModelCategory] = useState<string>('Cisco IOS-XE (Catalyst 9000 / Cat 8000)');
  const [cmdFormCategory, setCmdFormCategory] = useState<CommandReference['category']>('show');
  const [cmdFormCategoryLabel, setCmdFormCategoryLabel] = useState<string>('Show & Monitoring');
  const [cmdFormCommand, setCmdFormCommand] = useState<string>('');
  const [cmdFormDescription, setCmdFormDescription] = useState<string>('');
  const [cmdFormExplanation, setCmdFormExplanation] = useState<string>('');
  const [cmdFormSampleOutput, setCmdFormSampleOutput] = useState<string>('');
  const [cmdFormVerificationTip, setCmdFormVerificationTip] = useState<string>('');
  const [cmdFormMode, setCmdFormMode] = useState<'user' | 'privileged' | 'config' | 'diagnostic'>('privileged');
  const [cmdFormTags, setCmdFormTags] = useState<string>('');

  // Form State: Add Brand
  const [newBrandName, setNewBrandName] = useState<string>('');
  const [newBrandId, setNewBrandId] = useState<string>('');
  const [newBrandPrompt, setNewBrandPrompt] = useState<string>('<Device>');
  const [newBrandColor, setNewBrandColor] = useState<string>('bg-purple-500/10 text-purple-400 border-purple-500/30');

  // Form State: Add Model to Brand
  const [targetBrandForModel, setTargetBrandForModel] = useState<string>('cisco');
  const [newModelName, setNewModelName] = useState<string>('');
  const [newModelCategory, setNewModelCategory] = useState<string>('Enterprise Core Switch');
  const [newModelOsType, setNewModelOsType] = useState<string>('CLI OS');
  const [newModelBaud, setNewModelBaud] = useState<number>(9600);
  const [newModelPrompt, setNewModelPrompt] = useState<string>('Device# ');

  // Import JSON State
  const [importJsonText, setImportJsonText] = useState<string>('');

  // GitHub Sync State (Multi-Vendor: Cisco, Fortinet, Aruba, Juniper, Ruckus, Linux, Nexus, Huawei)
  const [selectedSyncVendors, setSelectedSyncVendors] = useState<DeviceBrand[]>(
    MULTI_VENDOR_GITHUB_CATALOGS.map(c => c.brand)
  );
  const [isSyncingGitHub, setIsSyncingGitHub] = useState<boolean>(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');
  const [syncProgressPercent, setSyncProgressPercent] = useState<number>(0);
  const [githubSyncStats, setGithubSyncStats] = useState<SyncStats>(getGitHubSyncStats());
  const [customGitHubRepoUrl, setCustomGitHubRepoUrl] = useState<string>('');
  const [customGitHubToken, setCustomGitHubToken] = useState<string>('');
  const [showCustomRepoInput, setShowCustomRepoInput] = useState<boolean>(false);
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);

  // Synchronize state when opened
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialBrand) setSelectedBrand(initialBrand);
      setGithubSyncStats(getGitHubSyncStats());
    }
  }, [isOpen, initialTab, initialBrand, refreshKey]);

  // Listen to DB updates
  useEffect(() => {
    const handleDbUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('69ai_commands_updated', handleDbUpdate);
    window.addEventListener('69ai_brands_updated', handleDbUpdate);
    return () => {
      window.removeEventListener('69ai_commands_updated', handleDbUpdate);
      window.removeEventListener('69ai_brands_updated', handleDbUpdate);
    };
  }, []);

  const allCommands = getCachedCommands();
  const customCommands = getCustomCommandsOnly();
  const brandCatalog = getUnifiedBrandCatalog();
  const brandList = Object.values(brandCatalog);

  const isPlaybookCheck = (cmd: CommandReference) => Boolean(cmd.isPlaybook || cmd.category === 'playbook' || (cmd.command && cmd.command.includes('\n')));
  const isAiLearnedCheck = (cmd: CommandReference) => Boolean(cmd.isAiLearned || (cmd.tags && (cmd.tags.includes('ai-generated') || cmd.tags.includes('online-learned') || cmd.tags.includes('ai-playbook') || cmd.tags.includes('ai-command'))));

  const playbookCount = allCommands.filter(isPlaybookCheck).length;
  const stagingCount = allCommands.filter(c => c.category === 'staging_ssh').length;
  const aiLearnedCount = allCommands.filter(isAiLearnedCheck).length;
  const showCount = allCommands.filter(c => c.category === 'show').length;
  const routingCount = allCommands.filter(c => c.category === 'routing' || c.category === 'bgp' || c.category === 'ospf').length;
  const vpnCount = allCommands.filter(c => c.category === 'vpn').length;

  if (!isOpen) return null;

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const filteredCommands = allCommands.filter((cmd) => {
    const matchesBrand = selectedBrand === 'all' || cmd.brand.toLowerCase() === selectedBrand.toLowerCase();
    const isCmdPlaybook = isPlaybookCheck(cmd);
    const isCmdAiLearned = isAiLearnedCheck(cmd);

    const matchesCat = 
      selectedCategory === 'all' || 
      (selectedCategory === 'playbook' && isCmdPlaybook) ||
      (selectedCategory === 'ai_learned' && isCmdAiLearned) ||
      cmd.category === selectedCategory;
    
    if (!matchesBrand || !matchesCat) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    return (
      cmd.command.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.categoryLabel.toLowerCase().includes(q) ||
      (cmd.sourceQuery && cmd.sourceQuery.toLowerCase().includes(q)) ||
      (cmd.modelCategory && cmd.modelCategory.toLowerCase().includes(q)) ||
      (cmd.tags && cmd.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const handleCopy = (id: string, text: string) => {
    copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecute = (cmd: string) => {
    onExecuteCommand(cmd);
    onClose();
  };

  const handleSelectItem = (item: CommandReference) => {
    setActiveItem(item);
    setMobileDetailView(true);
  };

  const handleEditCommandClick = (cmd: CommandReference) => {
    setEditingCommandId(cmd.id);
    setCmdFormBrand(cmd.brand);
    setCmdFormModelCategory(cmd.modelCategory);
    setCmdFormCategory(cmd.category);
    setCmdFormCategoryLabel(cmd.categoryLabel);
    setCmdFormCommand(cmd.command);
    setCmdFormDescription(cmd.description);
    setCmdFormExplanation(cmd.explanationId || '');
    setCmdFormSampleOutput(cmd.sampleOutput || '');
    setCmdFormVerificationTip(cmd.verificationTip || '');
    setCmdFormMode(cmd.mode || 'privileged');
    setCmdFormTags((cmd.tags || []).join(', '));
    setActiveTab('add_command');
  };

  const handleDeleteCommandClick = (cmdId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus referensi command ini?')) {
      deleteCachedCommand(cmdId);
      if (activeItem?.id === cmdId) {
        setActiveItem(null);
      }
      showNotification('Referensi command berhasil dihapus dari database.');
    }
  };

  const handleSaveCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdFormCommand.trim()) {
      showNotification('Sintaks command tidak boleh kosong!', 'error');
      return;
    }

    const tagsArray = cmdFormTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    if (!tagsArray.includes(cmdFormBrand.toLowerCase())) {
      tagsArray.push(cmdFormBrand.toLowerCase());
    }

    const newCmdData: CommandReference = {
      id: editingCommandId || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      brand: cmdFormBrand as DeviceBrand,
      modelCategory: cmdFormModelCategory || 'Universal CLI',
      category: cmdFormCategory,
      categoryLabel: cmdFormCategoryLabel || 'Custom Command',
      command: cmdFormCommand.trim(),
      description: cmdFormDescription.trim() || 'Perintah kustom pengguna',
      explanationId: cmdFormExplanation.trim() || undefined,
      sampleOutput: cmdFormSampleOutput.trim() || undefined,
      verificationTip: cmdFormVerificationTip.trim() || undefined,
      mode: cmdFormMode,
      tags: tagsArray,
      isCachedOnline: true,
      createdAt: new Date().toISOString(),
    };

    if (editingCommandId) {
      updateCachedCommand(newCmdData);
      showNotification(`Command '${newCmdData.command}' berhasil diperbarui.`);
    } else {
      addCachedCommand(newCmdData);
      showNotification(`Command '${newCmdData.command}' berhasil ditambahkan ke referensi.`);
    }

    // Reset Form
    setEditingCommandId(null);
    setCmdFormCommand('');
    setCmdFormDescription('');
    setCmdFormExplanation('');
    setCmdFormSampleOutput('');
    setCmdFormVerificationTip('');
    setCmdFormTags('');
    setActiveItem(newCmdData);
    setActiveTab('list');
  };

  const handleAddBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) {
      showNotification('Nama Brand wajib diisi!', 'error');
      return;
    }
    const cleanId = (newBrandId.trim() || newBrandName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')) as DeviceBrand;
    
    const brandObj: BrandInfo = {
      id: cleanId,
      name: newBrandName.trim(),
      badgeColor: newBrandColor,
      defaultPrompt: newBrandPrompt.trim() || `${cleanId}#`,
      models: [
        {
          id: `${cleanId}-default`,
          name: `${newBrandName.trim()} General Series / Universal`,
          category: 'Enterprise Device',
          osType: `${newBrandName.trim()} OS`,
          defaultBaud: 9600,
          samplePrompt: newBrandPrompt.trim() || `${cleanId}#`,
        }
      ]
    };

    addCustomBrand(brandObj);
    showNotification(`Brand '${brandObj.name}' berhasil ditambahkan ke katalog perangkat!`);
    setNewBrandName('');
    setNewBrandId('');
    setNewBrandPrompt('<Device>');
  };

  const handleAddModelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelName.trim()) {
      showNotification('Nama Model / Seri wajib diisi!', 'error');
      return;
    }

    const modelId = `${targetBrandForModel}-${Date.now().toString(36)}`;
    const modelObj: DeviceModelOption = {
      id: modelId,
      name: newModelName.trim(),
      category: newModelCategory.trim() || 'Network Device',
      osType: newModelOsType.trim() || 'CLI OS',
      defaultBaud: newModelBaud,
      samplePrompt: newModelPrompt.trim() || 'Device#',
    };

    addCustomModel(targetBrandForModel, modelObj);
    showNotification(`Model '${modelObj.name}' berhasil ditambahkan ke brand '${targetBrandForModel.toUpperCase()}'!`);
    setNewModelName('');
    setNewModelCategory('Enterprise Core Switch');
    setNewModelOsType('CLI OS');
  };

  const handleExportJson = () => {
    const dataToExport = {
      version: '69ai-command-db-v2',
      exportedAt: new Date().toISOString(),
      customCommands: customCommands,
      totalCommands: allCommands.length,
      customBrands: brandList.filter(b => !['cisco', 'fortinet', 'juniper', 'aruba', 'ruckus', 'hpe', 'dell', 'linux', 'macos', 'windows', 'android', 'mikrotik', 'openwrt', 'custom', 'generic'].includes(b.id)),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `69ai-command-catalog-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('File database JSON berhasil diexport.');
  };

  const handleImportJson = () => {
    if (!importJsonText.trim()) {
      showNotification('Silakan masukkan atau upload isi JSON terlebih dahulu', 'error');
      return;
    }

    const res = importCommandsFromJson(importJsonText);
    if (res.success) {
      showNotification(`Berhasil mengimpor ${res.count} command baru ke database lokal!`);
      setImportJsonText('');
      setActiveTab('list');
    } else {
      showNotification(res.error || 'Gagal mengimpor JSON', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setImportJsonText(content);
      }
    };
    reader.readAsText(file);
  };

  // GitHub Sync Actions
  const handleStartGitHubSync = async () => {
    if (selectedSyncVendors.length === 0) {
      showNotification('Pilih minimal satu vendor untuk sinkronisasi.', 'error');
      return;
    }
    setIsSyncingGitHub(true);
    setSyncProgressMsg('Menghubungkan ke endpoint GitHub multi-vendor...');
    setSyncProgressPercent(15);

    try {
      const res = await executeMultiVendorGitHubSync(selectedSyncVendors, {
        customRepoUrl: customGitHubRepoUrl,
        githubToken: customGitHubToken,
        onProgress: (msg, pct) => {
          setSyncProgressMsg(msg);
          setSyncProgressPercent(pct);
        }
      });

      if (res.success) {
        setGithubSyncStats(res.stats);
        showNotification(`Berhasil menyinkronkan ${res.totalSynced} command & playbook dari GitHub ke IndexedDB lokal!`);
      } else {
        showNotification(res.error || 'Gagal menyinkronkan data dari GitHub', 'error');
      }
    } catch (err: any) {
      showNotification(err?.message || 'Terjadi kesalahan saat sinkronisasi GitHub', 'error');
    } finally {
      setIsSyncingGitHub(false);
      setSyncProgressMsg('');
      setSyncProgressPercent(0);
    }
  };

  const handlePurgeGitHubData = async () => {
    try {
      const { removedCount } = await purgeGitHubSyncedCommands();
      setGithubSyncStats(getGitHubSyncStats());
      setShowPurgeModal(false);
      showNotification(`Berhasil menghapus ${removedCount} data command hasil sync GitHub dari database lokal.`);
    } catch (err: any) {
      showNotification('Gagal menghapus data sync GitHub: ' + err?.message, 'error');
    }
  };

  const toggleVendorSelection = (brand: DeviceBrand) => {
    if (selectedSyncVendors.includes(brand)) {
      setSelectedSyncVendors(selectedSyncVendors.filter(b => b !== brand));
    } else {
      setSelectedSyncVendors([...selectedSyncVendors, brand]);
    }
  };

  const selectAllVendors = () => {
    setSelectedSyncVendors(['cisco', 'fortinet', 'aruba', 'juniper', 'ruckus', 'linux']);
  };

  const deselectAllVendors = () => {
    setSelectedSyncVendors([]);
  };

  const current = activeItem || filteredCommands[0];
  const isCurrentCustom = current && (current.isCachedOnline || customCommands.some(c => c.id === current.id));

  return (
    <div 
      id="modal-offline-kb-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div 
        id="modal-offline-kb-box"
        className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[92dvh] sm:h-[86vh]"
      >
        {/* Top Header */}
        <div className="px-4 sm:px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm sm:text-base text-slate-100">Katalog Perangkat & Referensi Command CLI</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {allCommands.length} Command • {brandList.length} Brand
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Manajemen Vendor Brand, Model Perangkat, & Referensi Command CLI 100% Offline
              </p>
            </div>
          </div>

          <button 
            id="btn-close-offline-kb"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Notification Banner */}
        {notification && (
          <div className={`px-4 py-2 text-xs flex items-center gap-2 flex-shrink-0 ${
            notification.type === 'success' ? 'bg-emerald-950 text-emerald-300 border-b border-emerald-800' : 'bg-red-950 text-red-300 border-b border-red-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-3 sm:px-5 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              id="tab-kb-list"
              onClick={() => {
                setActiveTab('list');
                setSelectedCategory('all');
                setEditingCommandId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'list' && selectedCategory !== 'playbook'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Daftar Command ({allCommands.length})</span>
            </button>

            <button
              id="tab-kb-playbooks"
              onClick={() => {
                setActiveTab('list');
                setSelectedCategory('playbook');
                setEditingCommandId(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'list' && selectedCategory === 'playbook'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-md shadow-amber-900/40 border border-amber-400/50'
                  : 'bg-slate-900 text-amber-300 hover:text-amber-200 hover:bg-slate-800 border border-amber-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>📜 Playbook Konfigurasi ({playbookCount})</span>
            </button>

            <button
              id="tab-kb-add-command"
              onClick={() => {
                setActiveTab('add_command');
                if (!editingCommandId) {
                  setCmdFormCommand('');
                  setCmdFormDescription('');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'add_command'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingCommandId ? '✏️ Edit Command' : '+ Tambah Referensi / Playbook'}</span>
            </button>

            <button
              id="tab-kb-brands"
              onClick={() => setActiveTab('brands')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'brands'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-purple-400 hover:bg-slate-800'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Katalog Brand & Model ({brandList.length})</span>
            </button>

            <button
              id="tab-kb-backup"
              onClick={() => setActiveTab('backup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'backup'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup / Import JSON</span>
            </button>

            <button
              id="tab-kb-sync-github"
              onClick={() => setActiveTab('sync_github')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'sync_github'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-purple-300 hover:bg-slate-800'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-purple-400" />
              <span>Sync with GitHub (Multi-Vendor)</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-950/90 text-[10px] text-purple-300 font-mono border border-purple-800/80">
                6 Vendor
              </span>
            </button>
          </div>

          {activeTab === 'list' && (
            <button
              onClick={() => {
                setEditingCommandId(null);
                setCmdFormCommand('');
                setCmdFormDescription('');
                setCmdFormBrand(selectedBrand !== 'all' ? selectedBrand : 'cisco');
                setActiveTab('add_command');
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg flex items-center gap-1 flex-shrink-0 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tambah Command Baru</span>
            </button>
          )}
        </div>

        {/* TAB 1: LIST VIEW */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Filter Bar */}
            <div className="p-2.5 sm:p-3 bg-slate-950/80 border-b border-slate-800 space-y-2 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="input-kb-search"
                    type="text"
                    placeholder="Cari command / playbook (ipsec, vpn, bgp, ospf, vlan, trunk, staging, docker)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                {/* Brand Filter */}
                <select
                  id="select-kb-brand-filter"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 capitalize text-xs"
                >
                  <option value="all">Semua Brand Vendor ({brandList.length})</option>
                  {brandList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.models?.length || 1} model)
                    </option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  id="select-kb-category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 text-xs font-medium"
                >
                  <option value="all">Semua Kategori Perintah ({allCommands.length})</option>
                  <option value="playbook">🌟 📜 Playbook Konfigurasi ({playbookCount})</option>
                  <option value="staging_ssh">🚀 Staging Awal Pabrik -&gt; Akses SSH ({stagingCount})</option>
                  <option value="ai_learned">🤖 Hasil Auto-Harvest AI ({aiLearnedCount})</option>
                  <option value="show">Show / Melihat Status & Config ({showCount})</option>
                  <option value="config_basic">Konfigurasi Dasar (Hostname, IP, NTP, VLAN)</option>
                  <option value="interface">Interface, Trunking & LACP</option>
                  <option value="routing">Routing Table & Static Route</option>
                  <option value="bgp">BGP Peering & Prefix</option>
                  <option value="ospf">OSPF Routing & Neighbors</option>
                  <option value="vpn">IPsec VPN & Security ({vpnCount})</option>
                  <option value="ha_failover">HA, Failover & Redundancy</option>
                  <option value="server_admin">Server Admin & AD Domain</option>
                  <option value="docker_web">Docker & Web Server</option>
                  <option value="diagnostics">Diagnosa & Troubleshooting</option>
                </select>
              </div>

              {/* Quick Filter Badges / Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-thin">
                <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider mr-1 flex-shrink-0">
                  Filter Cepat:
                </span>
                
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Semua ({allCommands.length})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('playbook')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === 'playbook'
                      ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 text-white font-bold shadow-xs'
                      : 'bg-amber-950/40 border-amber-800/80 text-amber-300 hover:bg-amber-900/60 hover:text-amber-100'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>📜 Playbook Konfigurasi</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono font-bold">
                    {playbookCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('staging_ssh')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedCategory === 'staging_ssh'
                      ? 'bg-purple-600 border-purple-400 text-white font-semibold shadow-xs'
                      : 'bg-purple-950/40 border-purple-800/80 text-purple-300 hover:bg-purple-900/60 hover:text-purple-100'
                  }`}
                >
                  <span>🚀 Staging Awal Pabrik</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-[10px] font-mono">
                    {stagingCount}
                  </span>
                </button>

                {aiLearnedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('ai_learned')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      selectedCategory === 'ai_learned'
                        ? 'bg-emerald-600 border-emerald-400 text-white font-semibold shadow-xs'
                        : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 hover:text-emerald-100'
                    }`}
                  >
                    <span>🤖 Auto-Harvest AI</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-[10px] font-mono font-bold">
                      {aiLearnedCount}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedCategory('show')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap ${
                    selectedCategory === 'show'
                      ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Show / Status ({showCount})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('vpn')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap ${
                    selectedCategory === 'vpn'
                      ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  VPN & Security ({vpnCount})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory('routing')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap ${
                    selectedCategory === 'routing'
                      ? 'bg-blue-600 border-blue-500 text-white font-semibold shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  Routing & Gateway
                </button>
              </div>
            </div>

            {/* Content View: Responsive List + Detail */}
            <div className="flex-1 flex overflow-hidden text-xs relative">
              {/* Left List */}
              <div className={`w-full md:w-1/2 border-r border-slate-800 overflow-y-auto p-2.5 sm:p-3 space-y-2 bg-slate-950 ${
                mobileDetailView ? 'hidden md:block' : 'block'
              }`}>
                {filteredCommands.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-3">
                    <Database className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>Tidak ada command yang cocok dengan kriteria pencarian.</p>
                    <button
                      onClick={() => {
                        setEditingCommandId(null);
                        setCmdFormCommand(searchQuery);
                        setCmdFormBrand(selectedBrand !== 'all' ? selectedBrand : 'cisco');
                        setActiveTab('add_command');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Command '{searchQuery || 'Baru'}' ke Database</span>
                    </button>
                  </div>
                ) : (
                  filteredCommands.map((item) => {
                    const isSel = current?.id === item.id;
                    const isCustom = item.isCachedOnline || customCommands.some(c => c.id === item.id);
                    const isPlaybook = Boolean(item.isPlaybook || item.category === 'playbook' || (item.command && item.command.includes('\n')));
                    const isAiLearned = Boolean(item.isAiLearned || (item.tags && (item.tags.includes('ai-generated') || item.tags.includes('online-learned'))));
                    
                    return (
                      <div
                        key={item.id}
                        id={`kb-item-${item.id}`}
                        onClick={() => handleSelectItem(item)}
                        className={`p-2.5 sm:p-3 rounded-lg border cursor-pointer transition-all ${
                          isSel
                            ? 'bg-slate-800 border-blue-500/60 shadow-xs'
                            : 'bg-slate-900 border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-emerald-400 font-medium truncate text-xs">
                            {isPlaybook ? (item.description || item.command.split('\n')[0]) : item.command}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isPlaybook && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                Playbook
                              </span>
                            )}
                            {isAiLearned && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                AI Saved
                              </span>
                            )}
                            {isCustom && !isAiLearned && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                Kustom
                              </span>
                            )}
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {item.brand}
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-300 text-[11px] line-clamp-2 mb-1.5">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate max-w-[160px]">{item.modelCategory}</span>
                          <span className="font-mono text-blue-400">{item.categoryLabel}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Detail View */}
              <div className={`w-full md:w-1/2 overflow-y-auto p-3 sm:p-4 bg-slate-900 flex flex-col justify-between ${
                mobileDetailView ? 'flex' : 'hidden md:flex'
              }`}>
                {!current ? (
                  <div className="p-8 text-center text-slate-500 m-auto">
                    Pilih command untuk melihat rincian sintaks dan panduan.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Mobile Back Button */}
                    <div className="flex md:hidden items-center mb-1">
                      <button
                        onClick={() => setMobileDetailView(false)}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Kembali ke Daftar Command</span>
                      </button>
                    </div>

                    {/* Top Bar with actions */}
                    <div className="flex items-start justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                            {current.brand}
                          </span>
                          {(current.isPlaybook || current.category === 'playbook' || (current.command && current.command.includes('\n'))) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                              Playbook Konfigurasi
                            </span>
                          )}
                          {(current.isAiLearned || (current.tags && (current.tags.includes('ai-generated') || current.tags.includes('online-learned')))) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                              ✨ AI Auto-Saved
                            </span>
                          )}
                          {isCurrentCustom && !current.isAiLearned && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                              Kustom User
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-sm text-slate-100">{current.categoryLabel}</h4>
                        <p className="text-[11px] text-slate-400">{current.modelCategory}</p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                        {isCurrentCustom && (
                          <>
                            <button
                              id="btn-kb-edit-command"
                              onClick={() => handleEditCommandClick(current)}
                              title="Edit command ini"
                              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id="btn-kb-delete-command"
                              onClick={() => handleDeleteCommandClick(current.id)}
                              title="Hapus command ini"
                              className="p-1.5 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          id="btn-kb-copy-command"
                          onClick={() => handleCopy(current.id, current.command)}
                          className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-xs"
                        >
                          {copiedId === current.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>Copy</span>
                        </button>

                        <button
                          id="btn-kb-execute-command"
                          onClick={() => handleExecute(current.command)}
                          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 text-xs shadow-xs"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Kirim ke Terminal</span>
                        </button>
                      </div>
                    </div>

                    {/* Command Syntax Box */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-slate-400 font-medium">
                          {current.isPlaybook || current.category === 'playbook' || (current.command && current.command.includes('\n'))
                            ? '📜 Script Playbook Konfigurasi Berurutan:'
                            : 'Sintaks Command CLI:'}
                        </label>
                        {current.sourceQuery && (
                          <span className="text-[10px] text-slate-500 italic truncate max-w-[240px]" title={current.sourceQuery}>
                            Kueri Asal: "{current.sourceQuery}"
                          </span>
                        )}
                      </div>
                      <div className="p-3 rounded-lg bg-black border border-slate-800 font-mono text-xs sm:text-[13px] text-emerald-400 select-all whitespace-pre-wrap leading-relaxed shadow-inner max-h-72 overflow-y-auto">
                        {current.command}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[11px] text-slate-400 font-medium mb-1">Fungsi & Penjelasan:</label>
                      <p className="text-slate-200 leading-relaxed bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                        {current.description}
                      </p>
                      {current.explanationId && (
                        <p className="text-slate-300 text-[11px] mt-1.5 italic bg-slate-950 p-2 rounded border border-blue-900/40">
                          {current.explanationId}
                        </p>
                      )}
                    </div>

                    {/* Verification Tip */}
                    {current.verificationTip && (
                      <div>
                        <label className="block text-[11px] text-emerald-400 font-medium mb-1">Tips Verifikasi / Troubleshooting:</label>
                        <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-lg text-emerald-200 text-xs leading-relaxed font-mono">
                          {current.verificationTip}
                        </div>
                      </div>
                    )}

                    {/* Sample Output */}
                    {current.sampleOutput && (
                      <div>
                        <label className="block text-[11px] text-slate-400 font-medium mb-1">Contoh Output CLI Normal:</label>
                        <div className="bg-black border border-slate-800 p-2.5 rounded-lg text-slate-300 font-mono text-[10px] sm:text-[11px] max-h-36 overflow-y-auto leading-tight whitespace-pre-wrap">
                          {current.sampleOutput}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {current.tags && current.tags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {current.tags.map((t, idx) => (
                          <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TAMBAH / EDIT REFERENSI COMMAND FORM */}
        {activeTab === 'add_command' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900">
            <form onSubmit={handleSaveCommandSubmit} className="max-w-3xl mx-auto space-y-4 text-xs">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>{editingCommandId ? 'Edit Referensi Command' : 'Tambah Referensi Command Baru'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Tambahkan perintah CLI ke database lokal agar dapat diakses kapan saja secara offline maupun oleh AI Assistant.
                  </p>
                </div>

                {editingCommandId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommandId(null);
                      setCmdFormCommand('');
                      setCmdFormDescription('');
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Batal Edit
                  </button>
                )}
              </div>

              {/* Brand & Model Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Target Vendor Brand:</label>
                  <select
                    id="input-cmd-brand"
                    value={cmdFormBrand}
                    onChange={(e) => {
                      const b = e.target.value;
                      setCmdFormBrand(b);
                      const bInfo = brandCatalog[b];
                      if (bInfo && bInfo.models && bInfo.models[0]) {
                        setCmdFormModelCategory(bInfo.models[0].name);
                      }
                    }}
                    className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                  >
                    {brandList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Model / Seri Perangkat:</label>
                  <input
                    id="input-cmd-model-category"
                    type="text"
                    placeholder="Contoh: Catalyst C9000 / Cat 8000, FortiOS 7.x, CCR2004, dll."
                    value={cmdFormModelCategory}
                    onChange={(e) => setCmdFormModelCategory(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Category & Category Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Kategori Command:</label>
                  <select
                    id="input-cmd-category"
                    value={cmdFormCategory}
                    onChange={(e) => {
                      const cat = e.target.value as CommandReference['category'];
                      setCmdFormCategory(cat);
                      const labels: Record<string, string> = {
                        staging_ssh: 'Staging Awal & Akses SSH',
                        show: 'Show & Monitoring',
                        config_basic: 'Konfigurasi Dasar',
                        interface: 'Interface & VLAN',
                        routing: 'Routing Table & Static Route',
                        bgp: 'BGP Peering & Routing',
                        ospf: 'OSPF Dynamic Routing',
                        vpn: 'IPsec VPN & Security',
                        ha_failover: 'HA, Failover & Redundancy',
                        server_admin: 'Server Admin & Domain',
                        docker_web: 'Docker & Web Server',
                        diagnostics: 'Diagnosa & Troubleshooting',
                      };
                      setCmdFormCategoryLabel(labels[cat] || 'General');
                    }}
                    className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="show">Show & Monitoring</option>
                    <option value="config_basic">Konfigurasi Dasar (IP/Hostname/NTP)</option>
                    <option value="interface">Interface, Trunk & LACP</option>
                    <option value="routing">Routing Table & Static Route</option>
                    <option value="bgp">BGP Peering & Routing</option>
                    <option value="ospf">OSPF Dynamic Routing</option>
                    <option value="vpn">IPsec VPN & Security</option>
                    <option value="staging_ssh">Staging Awal & Akses SSH</option>
                    <option value="ha_failover">HA, Failover & Redundancy</option>
                    <option value="server_admin">Server Admin & Domain</option>
                    <option value="docker_web">Docker & Web Server</option>
                    <option value="diagnostics">Diagnosa & Troubleshooting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Judul / Label Kategori:</label>
                  <input
                    id="input-cmd-category-label"
                    type="text"
                    placeholder="Contoh: Monitoring BGP Neighbors, Konfigurasi Trunk Port"
                    value={cmdFormCategoryLabel}
                    onChange={(e) => setCmdFormCategoryLabel(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Command Syntax (Mandatory) */}
              <div>
                <label className="block text-emerald-400 font-medium mb-1">
                  Sintaks Command CLI <span className="text-red-400">*</span>:
                </label>
                <textarea
                  id="input-cmd-syntax"
                  required
                  rows={2}
                  placeholder="Contoh: show ip bgp summary | include 65000"
                  value={cmdFormCommand}
                  onChange={(e) => setCmdFormCommand(e.target.value)}
                  className="w-full bg-black text-emerald-400 font-mono border border-slate-700 rounded-lg p-2.5 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
                />
              </div>

              {/* Description (Mandatory) */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Fungsi & Deskripsi Singkat <span className="text-red-400">*</span>:
                </label>
                <input
                  id="input-cmd-description"
                  required
                  type="text"
                  placeholder="Contoh: Menampilkan ringkasan status sesi peering BGP dan jumlah prefix yang diterima"
                  value={cmdFormDescription}
                  onChange={(e) => setCmdFormDescription(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Indonesian Explanation / Best Practice */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Penjelasan Detail & Panduan Teknis (Opsional):</label>
                <textarea
                  id="input-cmd-explanation"
                  rows={2}
                  placeholder="Contoh: Pastikan status BGP State adalah 'Established' dan kolom PfxRcd menunjukkan angka bukan kata (seperti Active/Idle)."
                  value={cmdFormExplanation}
                  onChange={(e) => setCmdFormExplanation(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Verification Tip & Sample Output */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tips Verifikasi / Troubleshooting:</label>
                  <textarea
                    id="input-cmd-verification-tip"
                    rows={3}
                    placeholder="Contoh: Jika State = Active, periksa firewall port TCP 179 dan konfigurasi update-source loopback."
                    value={cmdFormVerificationTip}
                    onChange={(e) => setCmdFormVerificationTip(e.target.value)}
                    className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contoh Output CLI Normal:</label>
                  <textarea
                    id="input-cmd-sample-output"
                    rows={3}
                    placeholder="Neighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd&#10;192.168.1.2     4 65000   12401   12400      124    0    0 04:12:08       15"
                    value={cmdFormSampleOutput}
                    onChange={(e) => setCmdFormSampleOutput(e.target.value)}
                    className="w-full bg-black text-slate-300 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500 font-mono text-[10px]"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Tag Pencarian (pisahkan dengan koma):</label>
                <input
                  id="input-cmd-tags"
                  type="text"
                  placeholder="bgp, routing, peering, as-number, monitoring"
                  value={cmdFormTags}
                  onChange={(e) => setCmdFormTags(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Kembali ke Daftar
                </button>

                <button
                  id="btn-save-custom-command"
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCommandId ? 'Simpan Perubahan Command' : 'Simpan ke Database Offline'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: KATALOG BRAND & MODEL */}
        {activeTab === 'brands' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900 space-y-6 text-xs">
            {/* Top Form: Add New Brand */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-purple-600/20 text-purple-400 flex items-center justify-center">
                    <FolderPlus className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100">1. Tambah Brand / Vendor Baru</h4>
                </div>
                <span className="text-[10px] text-slate-500">Contoh: Huawei, Ubiquiti, Extreme, ZTE, Ruijie</span>
              </div>

              <form onSubmit={handleAddBrandSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Nama Brand Vendor:</label>
                  <input
                    id="input-new-brand-name"
                    required
                    type="text"
                    placeholder="Contoh: Huawei"
                    value={newBrandName}
                    onChange={(e) => {
                      setNewBrandName(e.target.value);
                      if (!newBrandId) setNewBrandId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }}
                    className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Kode / ID Brand (slug):</label>
                  <input
                    id="input-new-brand-id"
                    type="text"
                    placeholder="huawei"
                    value={newBrandId}
                    onChange={(e) => setNewBrandId(e.target.value.toLowerCase())}
                    className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Default CLI Prompt:</label>
                  <input
                    id="input-new-brand-prompt"
                    type="text"
                    placeholder="<Huawei> atau Device#"
                    value={newBrandPrompt}
                    onChange={(e) => setNewBrandPrompt(e.target.value)}
                    className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    id="btn-add-brand-submit"
                    type="submit"
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Simpan Brand</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Middle Form: Add Model / Series to an Existing Brand */}
            <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100">2. Tambah Model / Seri ke Brand Terdaftar</h4>
                </div>
                <span className="text-[10px] text-slate-500">Tambahkan seri switch, router, AP, atau firewall baru</span>
              </div>

              <form onSubmit={handleAddModelSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Pilih Brand Induk:</label>
                    <select
                      id="select-model-target-brand"
                      value={targetBrandForModel}
                      onChange={(e) => setTargetBrandForModel(e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500 capitalize"
                    >
                      {brandList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Nama Model / Seri:</label>
                    <input
                      id="input-new-model-name"
                      required
                      type="text"
                      placeholder="Contoh: CloudEngine 6800 / Catalyst 9300L"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Kategori Perangkat:</label>
                    <input
                      id="input-new-model-category"
                      type="text"
                      placeholder="Contoh: Data Center Switch / Core Router"
                      value={newModelCategory}
                      onChange={(e) => setNewModelCategory(e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Sistem Operasi (OS Type):</label>
                    <input
                      id="input-new-model-os"
                      type="text"
                      placeholder="Contoh: Huawei VRP 8.x / RouterOS v7"
                      value={newModelOsType}
                      onChange={(e) => setNewModelOsType(e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Default Baud Rate:</label>
                    <select
                      id="select-new-model-baud"
                      value={newModelBaud}
                      onChange={(e) => setNewModelBaud(Number(e.target.value))}
                      className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500 font-mono"
                    >
                      <option value={9600}>9600 (Standard)</option>
                      <option value={115200}>115200 (High Speed)</option>
                      <option value={57600}>57600</option>
                      <option value={38400}>38400</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Contoh CLI Prompt:</label>
                    <input
                      id="input-new-model-prompt"
                      type="text"
                      placeholder="<CE6800-Core>#"
                      value={newModelPrompt}
                      onChange={(e) => setNewModelPrompt(e.target.value)}
                      className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      id="btn-add-model-submit"
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Model</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* List of Registered Brands & Models */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-200">
                  Daftar Brand & Model Aktif ({brandList.length} Brand Terdaftar)
                </h4>
                <span className="text-[11px] text-slate-400">
                  Semua brand dan model tersedia pada form koneksi & asisten AI
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {brandList.map((brand) => {
                  const isBuiltIn = ['cisco', 'fortinet', 'juniper', 'aruba', 'ruckus', 'hpe', 'dell', 'linux', 'macos', 'windows', 'android', 'mikrotik', 'openwrt', 'custom', 'generic'].includes(brand.id);
                  const brandCmdCount = allCommands.filter(c => c.brand === brand.id).length;

                  return (
                    <div 
                      key={brand.id} 
                      className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded border font-mono ${brand.badgeColor || 'bg-slate-800 text-slate-200 border-slate-700'}`}>
                            {brand.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ID: {brand.id}
                          </span>
                          {isBuiltIn ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              Built-in
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                              Brand Kustom
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedBrand(brand.id);
                              setActiveTab('list');
                            }}
                            title="Lihat command brand ini"
                            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px]"
                          >
                            {brandCmdCount} Perintah
                          </button>

                          <button
                            onClick={() => {
                              setCmdFormBrand(brand.id);
                              if (brand.models && brand.models[0]) {
                                setCmdFormModelCategory(brand.models[0].name);
                              }
                              setEditingCommandId(null);
                              setActiveTab('add_command');
                            }}
                            title="Tambah referensi command untuk brand ini"
                            className="p-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          {!isBuiltIn && (
                            <button
                              onClick={() => {
                                if (confirm(`Hapus brand kustom '${brand.name}'?`)) {
                                  deleteCustomBrand(brand.id);
                                  showNotification(`Brand '${brand.name}' berhasil dihapus.`);
                                }
                              }}
                              title="Hapus brand kustom"
                              className="p-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Models List */}
                      <div className="space-y-1 pl-2 border-l-2 border-slate-800">
                        {brand.models.map((m) => (
                          <div 
                            key={m.id}
                            className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-slate-900/60 border border-slate-850"
                          >
                            <div>
                              <div className="font-medium text-slate-200">{m.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {m.category} • {m.osType} • Prompt: {m.samplePrompt}
                              </div>
                            </div>

                            {/* Delete custom model button */}
                            {m.id.includes('-') && !['cisco-cat9000', 'fortinet-fortigate', 'juniper-switch', 'aruba-switch', 'ruckus-icx', 'hpe-flexfabric', 'dell-os10', 'linux-ubuntu', 'macos-darwin', 'windows-ps', 'android-adb', 'mikrotik-routeros', 'openwrt-gateway', 'custom-appliance', 'generic-console'].includes(m.id) && (
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus model '${m.name}'?`)) {
                                    deleteCustomModel(brand.id, m.id);
                                    showNotification(`Model '${m.name}' berhasil dihapus.`);
                                  }
                                }}
                                className="text-slate-500 hover:text-red-400 p-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BACKUP / EXPORT & IMPORT JSON */}
        {activeTab === 'backup' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900 space-y-6 text-xs">
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Backup & Import Database Perintah Offline</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ekspor dan impor seluruh referensi command kustom dan brand perangkat ke dalam file JSON untuk sinkronisasi antar tim atau backup lokal.
                </p>
              </div>

              {/* Export Card */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-slate-200 text-xs sm:text-sm">Export Database Command (.JSON)</h5>
                    <p className="text-[11px] text-slate-400">
                      Download file JSON berisi {customCommands.length} command kustom dan data brand Anda.
                    </p>
                  </div>
                  <button
                    id="btn-export-kb-json"
                    onClick={handleExportJson}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-xs transition-colors flex-shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>
              </div>

              {/* Import Card */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <h5 className="font-semibold text-slate-200 text-xs sm:text-sm">Import Database Command dari File JSON</h5>
                  <p className="text-[11px] text-slate-400">
                    Pilih file JSON atau tempelkan teks format JSON untuk menambahkan command secara massal.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span>Pilih File JSON (.json)</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  rows={6}
                  placeholder={`Tempelkan format JSON di sini, contoh:
[
  {
    "brand": "cisco",
    "modelCategory": "Catalyst 9300",
    "category": "show",
    "categoryLabel": "BGP Summary",
    "command": "show ip bgp summary",
    "description": "Cek status neighbor BGP",
    "tags": ["bgp", "routing"]
  }
]`}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full bg-black text-slate-300 font-mono border border-slate-700 rounded-lg p-2.5 text-[11px] focus:outline-none focus:border-cyan-500"
                />

                <div className="flex items-center justify-end">
                  <button
                    id="btn-import-kb-json"
                    onClick={handleImportJson}
                    disabled={!importJsonText.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Impor ke Database</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. SYNC WITH GITHUB (MULTI-VENDOR) TAB */}
        {activeTab === 'sync_github' && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-900/60">
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Header Hero Banner */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-950/40 via-slate-950 to-slate-900 border border-purple-900/40 rounded-xl space-y-3 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex-shrink-0 mt-0.5">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm sm:text-base text-purple-200">
                          Sync with GitHub — Multi-Vendor Command & Playbook Database
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 border border-purple-700/60">
                          Cisco • Fortinet • Aruba • Juniper • Ruckus • Linux
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Ekstrak dan sinkronkan referensi command resmi, skema model YANG enterprise, dan playbook konfigurasi lengkap (Setting IP, IPsec VPN, VLAN, Routing OSPF/BGP, Firewall) dari repositori GitHub terverifikasi ke <strong>IndexedDB lokal perangkat</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex flex-col items-end flex-shrink-0">
                    <span className="text-[10px] text-slate-400">Penyimpanan Internal</span>
                    <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      IndexedDB Offline
                    </span>
                  </div>
                </div>

                {/* Storage Portability Note */}
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2.5">
                  <span className="text-base leading-none mt-0.5">💾</span>
                  <div className="space-y-0.5">
                    <p className="font-medium text-purple-300">Portabilitas Offline DMG, Windows EXE, & Android APK</p>
                    <p className="text-slate-400 leading-normal">
                      Data yang disinkronkan akan <strong>tersimpan permanen di IndexedDB lokal perangkat</strong>. Saat aplikasi dipackage dan dideploy sebagai <strong>macOS DMG</strong>, <strong>Windows EXE</strong>, atau <strong>Android APK</strong>, seluruh database offline ini <strong>otomatis terbawa dan berfungsi 100% tanpa butuh internet</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sync Summary & Quick Action Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Total Command Synced</span>
                  <span className="text-lg font-bold text-purple-400">{githubSyncStats.totalCommandsSynced || 0}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Vendor Tersinkron</span>
                  <span className="text-lg font-bold text-emerald-400">{githubSyncStats.syncedVendors?.length || 0} Vendor</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Terakhir Sync</span>
                  <span className="text-xs font-semibold text-slate-200 mt-1 block truncate">
                    {githubSyncStats.lastSyncTime ? new Date(githubSyncStats.lastSyncTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Belum Pernah'}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('github-sync');
                      setActiveTab('list');
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center justify-between font-medium"
                  >
                    <span>Lihat di Tab Daftar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Vendor Selection Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h5 className="font-semibold text-slate-200 text-xs sm:text-sm flex items-center gap-1.5">
                      <span>Pilih Repositori Vendor GitHub untuk Disinkronkan</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {selectedSyncVendors.length} dari {MULTI_VENDOR_GITHUB_CATALOGS.length} Dipilih
                      </span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Pilih vendor yang ingin Anda masukkan ke database offline perangkat Anda.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={selectAllVendors}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllVendors}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] transition-colors"
                    >
                      Batal Pilih
                    </button>
                  </div>
                </div>

                {/* Vendor Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {MULTI_VENDOR_GITHUB_CATALOGS.map((catalog) => {
                    const isSelected = selectedSyncVendors.includes(catalog.brand);
                    const syncedCount = githubSyncStats.detailsPerVendor?.[catalog.brand] || catalog.commands.length;

                    return (
                      <div
                        key={catalog.brand}
                        onClick={() => toggleVendorSelection(catalog.brand)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-950 border-purple-600/60 shadow-xs'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleVendorSelection(catalog.brand)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 focus:ring-purple-500 focus:ring-1"
                              />
                              <div>
                                <p className="font-semibold text-slate-200 text-xs sm:text-sm leading-tight">
                                  {catalog.brandLabel}
                                </p>
                                <span className="text-[10px] font-mono text-purple-400 flex items-center gap-1 mt-0.5">
                                  <Github className="w-3 h-3 inline" /> {catalog.repoName}
                                </span>
                              </div>
                            </div>

                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-mono border border-slate-800">
                              {syncedCount} Playbook
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 leading-normal pl-6">
                            {catalog.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 pl-6">
                          <span>Branch: {catalog.defaultBranch}</span>
                          <span className="text-emerald-400/80">IP • IPsec • VLAN • Routing</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Repo Toggle Section */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCustomRepoInput(!showCustomRepoInput)}
                  className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-slate-100"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tambahkan Repositori GitHub Custom / Internal Enterprise (Opsional)</span>
                  </span>
                  <span className="text-[10px] text-blue-400">{showCustomRepoInput ? '▲ Sembunyikan' : '▼ Tampilkan'}</span>
                </button>

                {showCustomRepoInput && (
                  <div className="pt-2 space-y-2 border-t border-slate-800/80">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">URL Repositori GitHub Kustom</label>
                      <input
                        type="text"
                        placeholder="Contoh: https://github.com/my-enterprise/network-playbooks"
                        value={customGitHubRepoUrl}
                        onChange={(e) => setCustomGitHubRepoUrl(e.target.value)}
                        className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Personal Access Token GitHub (Opsional untuk private repo)</label>
                      <input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={customGitHubToken}
                        onChange={(e) => setCustomGitHubToken(e.target.value)}
                        className="w-full bg-slate-900 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Live Progress Bar when Syncing */}
              {isSyncingGitHub && (
                <div className="p-4 bg-purple-950/40 border border-purple-800/60 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-300 font-medium flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                      {syncProgressMsg}
                    </span>
                    <span className="font-mono text-purple-200 font-bold">{syncProgressPercent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300 ease-out"
                      style={{ width: `${syncProgressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Main Action Trigger Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPurgeModal(true)}
                    className="px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bersihkan Data Sync GitHub</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    id="btn-trigger-github-sync"
                    disabled={isSyncingGitHub || selectedSyncVendors.length === 0}
                    onClick={handleStartGitHubSync}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
                  >
                    {isSyncingGitHub ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mengekstrak dari GitHub...</span>
                      </>
                    ) : (
                      <>
                        <GitBranch className="w-4 h-4" />
                        <span>Sync with GitHub Sekarang ({selectedSyncVendors.length} Vendor)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Purge Confirm Modal */}
              {showPurgeModal && (
                <div className="p-4 bg-red-950/60 border border-red-800 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h6 className="font-semibold text-red-200 text-xs sm:text-sm">Konfirmasi Hapus Data Sync GitHub</h6>
                      <p className="text-[11px] text-red-300/80 mt-0.5">
                        Tindakan ini hanya akan menghapus perintah yang diunduh dari repositori GitHub. Command kustom buatan Anda sendiri tidak akan terhapus.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPurgeModal(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handlePurgeGitHubData}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
                    >
                      Ya, Hapus Data GitHub
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
