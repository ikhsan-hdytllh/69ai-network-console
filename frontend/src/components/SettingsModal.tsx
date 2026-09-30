import { safeStorage } from "../utils/safeStorage";
import React, { useState, useEffect } from 'react';
import { SixtyNineAiLogo } from './SixtyNineAiLogo';
import { ProviderLoginModal } from './ProviderLoginModal';
import { AiProviderSettings } from './AiProviderSettings';
import { testApiKeyDirectly } from '../services/aiClientService';
import { 
  X, 
  Settings, 
  Cpu, 
  Terminal, 
  Database, 
  Sparkles, 
  Check,
  Key,
  Globe,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Lock,
  UserCheck,
  Download,
  Upload,
  Trash2,
  HardDrive,
  BookOpen,
  Laptop,
  Smartphone,
  Layers,
  FileCode,
  Search,
  Radio,
  Bluetooth,
  Cable,
  Zap,
  Sliders,
  ShieldCheck,
  LogIn,
  LogOut,
  User,
  ArrowLeft,
  GitBranch
} from 'lucide-react';
import { 
  getLocalDatabaseStats, 
  exportLocalDatabaseJson, 
  importLocalDatabaseJson, 
  getOnlineSearchDocs,
  deleteOnlineSearchDoc,
  clearLocalDatabase
} from '../services/dbStorage';
import { 
  AIProviderId, 
  AIProviderAccount, 
  getSavedProviderAccounts, 
  logoutProviderAccount,
  saveApiKeyDirectly
} from '../services/providerAuthService';
import { LocalDatabaseStats, OnlineSearchDoc } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenIrxonAt?: () => void;
  onOpenOfflineKb?: (tab?: 'list' | 'add_command' | 'brands' | 'backup' | 'sync_github') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenIrxonAt,
  onOpenOfflineKb,
}) => {
  const [activeTab, setActiveTab] = useState<'ai_account' | 'storage' | 'terminal' | 'irxon'>('ai_account');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalProvider, setLoginModalProvider] = useState<AIProviderId>('gemini');
  const [providerAccounts, setProviderAccounts] = useState<Record<AIProviderId, AIProviderAccount>>(() => getSavedProviderAccounts());

  // AI Account & Operator States
  const [operatorName, setOperatorName] = useState<string>(() => {
    return safeStorage.getItem('69ai_operator_name') || 'Yoga (NOC Admin)';
  });
  const [aiProvider, setAiProvider] = useState<string>(() => {
    return safeStorage.getItem('69ai_user_provider') || 'gemini';
  });

  // Dedicated Keys per provider
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    return safeStorage.getItem('69ai_api_key_gemini') || safeStorage.getItem('69ai_user_api_key') || '';
  });
  const [openaiKey, setOpenaiKey] = useState<string>(() => {
    return safeStorage.getItem('69ai_api_key_openai') || '';
  });
  const [claudeKey, setClaudeKey] = useState<string>(() => {
    return safeStorage.getItem('69ai_api_key_claude') || '';
  });
  const [deepseekKey, setDeepseekKey] = useState<string>(() => {
    return safeStorage.getItem('69ai_api_key_deepseek') || '';
  });

  const [enableOnlineSearch, setEnableOnlineSearch] = useState<boolean>(() => {
    const saved = safeStorage.getItem('69ai_enable_online_search');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Per-provider verification states
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Terminal & Storage options
  const [defaultBaud, setDefaultBaud] = useState<number>(() => {
    return Number(safeStorage.getItem('69ai_default_baud')) || 115200;
  });
  const [autoScrollTerminal, setAutoScrollTerminal] = useState<boolean>(() => {
    const saved = safeStorage.getItem('69ai_autoscroll');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [autoSyncLearned, setAutoSyncLearned] = useState<boolean>(() => {
    const saved = safeStorage.getItem('69ai_autosync_learned');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [terminalFontSizeSetting, setTerminalFontSizeSetting] = useState<number>(() => {
    const saved = safeStorage.getItem('69ai_terminal_font_size');
    return saved ? Number(saved) : 13;
  });

  // Local Database Stats & Management States
  const [dbStats, setDbStats] = useState<LocalDatabaseStats | null>(null);
  const [onlineDocs, setOnlineDocs] = useState<OnlineSearchDoc[]>([]);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [dbActionMsg, setDbActionMsg] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setVerifyResults({});
      setDbActionMsg(null);
      loadDatabaseStats();

      // Synchronize latest values from safeStorage whenever settings modal is opened
      const storedGemini = safeStorage.getItem('69ai_api_key_gemini') || safeStorage.getItem('69ai_user_api_key') || '';
      const storedOpenai = safeStorage.getItem('69ai_api_key_openai') || '';
      const storedClaude = safeStorage.getItem('69ai_api_key_claude') || '';
      const storedDeepseek = safeStorage.getItem('69ai_api_key_deepseek') || '';
      const storedProvider = safeStorage.getItem('69ai_user_provider') || 'gemini';
      const storedOperator = safeStorage.getItem('69ai_operator_name') || 'Yoga (NOC Admin)';

      setGeminiKey(storedGemini);
      setOpenaiKey(storedOpenai);
      setClaudeKey(storedClaude);
      setDeepseekKey(storedDeepseek);
      setAiProvider(storedProvider);
      setOperatorName(storedOperator);
      setProviderAccounts(getSavedProviderAccounts());
    }
  }, [isOpen]);

  // Keep modal state synchronized if keys are updated anywhere in the app
  useEffect(() => {
    const handleSyncFromStorage = () => {
      setGeminiKey(safeStorage.getItem('69ai_api_key_gemini') || safeStorage.getItem('69ai_user_api_key') || '');
      setOpenaiKey(safeStorage.getItem('69ai_api_key_openai') || '');
      setClaudeKey(safeStorage.getItem('69ai_api_key_claude') || '');
      setDeepseekKey(safeStorage.getItem('69ai_api_key_deepseek') || '');
      setAiProvider(safeStorage.getItem('69ai_user_provider') || 'gemini');
      setProviderAccounts(getSavedProviderAccounts());
    };
    window.addEventListener('69ai_settings_updated', handleSyncFromStorage);
    window.addEventListener('69ai_auth_updated', handleSyncFromStorage);
    window.addEventListener('storage', handleSyncFromStorage);
    return () => {
      window.removeEventListener('69ai_settings_updated', handleSyncFromStorage);
      window.removeEventListener('69ai_auth_updated', handleSyncFromStorage);
      window.removeEventListener('storage', handleSyncFromStorage);
    };
  }, []);

  const loadDatabaseStats = async () => {
    try {
      const stats = await getLocalDatabaseStats();
      setDbStats(stats);
      setOnlineDocs(getOnlineSearchDocs());
    } catch (err) {
      console.warn('Failed to load DB stats', err);
    }
  };

  const handleTestProvider = async (provider: 'gemini' | 'openai' | 'claude' | 'deepseek') => {
    const key = provider === 'gemini' 
      ? geminiKey.trim() 
      : provider === 'openai' 
      ? openaiKey.trim() 
      : provider === 'claude' 
      ? claudeKey.trim() 
      : deepseekKey.trim();

    if (!key) {
      setVerifyResults(prev => ({
        ...prev,
        [provider]: { success: false, message: `Masukkan API Key ${provider.toUpperCase()} terlebih dahulu.` }
      }));
      return;
    }

    setTestingProvider(provider);
    setVerifyResults(prev => ({ ...prev, [provider]: { success: false, message: '' } }));

    try {
      let isVerified = false;
      let successMsg = '';
      let errMsg = '';

      try {
        const directResult = await testApiKeyDirectly(provider, key);
        if (directResult.success) {
          isVerified = true;
          successMsg = directResult.message;
        } else {
          errMsg = directResult.message;
        }
      } catch (directErr) {
        // Fallback to server endpoint
        try {
          const res = await fetch('/api/ai/test-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiKey: key,
              provider,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            isVerified = true;
            successMsg = data.message;
          } else {
            errMsg = data?.error || 'Verifikasi gagal';
          }
        } catch (serverErr: any) {
          errMsg = serverErr?.message || 'Gagal menghubungi server verifikasi';
        }
      }

      if (isVerified) {
        setVerifyResults(prev => ({
          ...prev,
          [provider]: { 
            success: true, 
            message: successMsg || `Akun ${provider.toUpperCase()} terhubung & siap digunakan!` 
          }
        }));
        
        // Auto-save this key
        if (provider === 'gemini') {
          safeStorage.setItem('69ai_api_key_gemini', key);
          safeStorage.setItem('69ai_user_api_key', key);
        } else if (provider === 'openai') {
          safeStorage.setItem('69ai_api_key_openai', key);
        } else if (provider === 'claude') {
          safeStorage.setItem('69ai_api_key_claude', key);
        } else if (provider === 'deepseek') {
          safeStorage.setItem('69ai_api_key_deepseek', key);
        }

        window.dispatchEvent(new CustomEvent('69ai_settings_updated'));
      } else {
        setVerifyResults(prev => ({
          ...prev,
          [provider]: { 
            success: false, 
            message: errMsg || 'Verifikasi gagal. Pastikan API key valid dan memiliki kuota/kredit.' 
          }
        }));
      }
    } catch (err: any) {
      setVerifyResults(prev => ({
        ...prev,
        [provider]: { success: false, message: 'Koneksi gagal: ' + err.message }
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  // Export Local Database to JSON file
  const handleExportDatabase = async () => {
    try {
      const jsonStr = await exportLocalDatabaseJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `69ai_local_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDbActionMsg({ success: true, text: 'Backup database lokal berhasil di-download.' });
    } catch (err: any) {
      setDbActionMsg({ success: false, text: `Gagal export database: ${err.message}` });
    }
  };

  // Import Local Database from JSON file
  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await importLocalDatabaseJson(content);
        if (res.success) {
          setDbActionMsg({ success: true, text: res.message });
          loadDatabaseStats();
          window.dispatchEvent(new CustomEvent('69ai_settings_updated'));
        } else {
          setDbActionMsg({ success: false, text: res.message });
        }
      } catch (err: any) {
        setDbActionMsg({ success: false, text: `Gagal membaca file: ${err.message}` });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteDoc = (id: string) => {
    const updated = deleteOnlineSearchDoc(id);
    setOnlineDocs(updated);
    loadDatabaseStats();
  };

  const handleClearCache = async () => {
    if (window.confirm('Kosongkan semua cache pencarian dan dokumentasi lokal?')) {
      await clearLocalDatabase();
      loadDatabaseStats();
      setDbActionMsg({ success: true, text: 'Cache online berhasil dibersihkan.' });
    }
  };

  const handleSaveAndClose = () => {
    safeStorage.setItem('69ai_operator_name', operatorName.trim() || 'Yoga (NOC Admin)');
    
    // Preserve active provider from storage or state
    const currentProvider = (safeStorage.getItem('69ai_user_provider') as AIProviderId) || (aiProvider as AIProviderId) || 'gemini';
    safeStorage.setItem('69ai_user_provider', currentProvider);

    // CRITICAL: NEVER wipe or overwrite API keys with empty/stale state!
    // AiProviderSettings handles individual key saves directly.
    // Preserve whatever valid keys exist in storage, falling back to local state only if non-empty.
    const effectiveGemini = safeStorage.getItem('69ai_api_key_gemini') || safeStorage.getItem('69ai_user_api_key') || geminiKey.trim();
    const effectiveOpenai = safeStorage.getItem('69ai_api_key_openai') || openaiKey.trim();
    const effectiveClaude = safeStorage.getItem('69ai_api_key_claude') || claudeKey.trim();
    const effectiveDeepseek = safeStorage.getItem('69ai_api_key_deepseek') || deepseekKey.trim();

    if (effectiveGemini) saveApiKeyDirectly('gemini', effectiveGemini);
    if (effectiveOpenai) saveApiKeyDirectly('openai', effectiveOpenai);
    if (effectiveClaude) saveApiKeyDirectly('claude', effectiveClaude);
    if (effectiveDeepseek) saveApiKeyDirectly('deepseek', effectiveDeepseek);

    safeStorage.setItem('69ai_enable_online_search', JSON.stringify(enableOnlineSearch));
    safeStorage.setItem('69ai_default_baud', String(defaultBaud));
    safeStorage.setItem('69ai_autoscroll', JSON.stringify(autoScrollTerminal));
    safeStorage.setItem('69ai_autosync_learned', JSON.stringify(autoSyncLearned));
    safeStorage.setItem('69ai_terminal_font_size', String(terminalFontSizeSetting));
    
    // Notify application components
    window.dispatchEvent(new CustomEvent('69ai_settings_updated'));
    window.dispatchEvent(new CustomEvent('69ai_auth_updated'));
    try {
      window.dispatchEvent(new Event('storage'));
    } catch (e) {}
    onClose();
  };

  const filteredDocs = (onlineDocs || []).filter(d => 
    d && (
      (d.title || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      (d.query || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      (d.content || '').toLowerCase().includes(docSearchQuery.toLowerCase()) ||
      (d.brand || '').toLowerCase().includes(docSearchQuery.toLowerCase())
    )
  );

  if (!isOpen) return null;

  return (
    <div 
      id="modal-settings-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div 
        id="modal-settings-box"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <SixtyNineAiLogo size="md" showGlow={true} />
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-slate-100">Pengaturan 69 AI & Database Lokal</h3>
              <p className="text-[11px] text-slate-400">Gemini, ChatGPT, Claude, DeepSeek & Offline Database (Windows/Mac/Android)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-return-app-settings-header"
              onClick={handleSaveAndClose}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Kembali ke Layar Terminal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kembali ke Aplikasi</span>
              <span className="sm:hidden">Kembali</span>
            </button>
            <button 
              type="button"
              id="btn-close-settings"
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Tutup Pengaturan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 text-xs">
          <button
            type="button"
            id="tab-settings-ai-account"
            onClick={() => setActiveTab('ai_account')}
            className={`pb-2 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'ai_account'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Integrasi AI (Gemini / GPT / Claude)</span>
          </button>
          <button
            type="button"
            id="tab-settings-storage"
            onClick={() => setActiveTab('storage')}
            className={`pb-2 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'storage'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Database Lokal & Offline KB</span>
          </button>
          <button
            type="button"
            id="tab-settings-terminal"
            onClick={() => setActiveTab('terminal')}
            className={`pb-2 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'terminal'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Terminal & Serial</span>
          </button>
          <button
            type="button"
            id="tab-settings-irxon"
            onClick={() => setActiveTab('irxon')}
            className={`pb-2 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'irxon'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>IRXON Bluetooth AT</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs text-slate-300 overflow-y-auto flex-1">
          {activeTab === 'ai_account' && (
            <AiProviderSettings onReturnToApp={handleSaveAndClose} />
          )}

          {activeTab === 'storage' && (
            <div className="space-y-4">
              {/* Local Device Database Banner */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200 text-xs sm:text-sm">Database Lokal di Device (Windows / Mac / Android)</p>
                      <p className="text-[11px] text-slate-400">Tersimpan lokal di penyimpanan internal device untuk pencarian offline & dokumentasi online</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    <span>{dbStats?.engine || 'IndexedDB'}</span>
                  </span>
                </div>

                {/* Database Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                    <p className="text-[10px] text-slate-400">Perintah Offline</p>
                    <p className="text-sm font-semibold text-blue-400">{dbStats?.totalOfflineCommands || 0}</p>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                    <p className="text-[10px] text-slate-400">Dokumentasi Online</p>
                    <p className="text-sm font-semibold text-emerald-400">{dbStats?.totalOnlineDocs || 0}</p>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                    <p className="text-[10px] text-slate-400">Profil Perangkat</p>
                    <p className="text-sm font-semibold text-indigo-400">{dbStats?.totalDevices || 0}</p>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                    <p className="text-[10px] text-slate-400">Ukuran Storage</p>
                    <p className="text-sm font-semibold text-amber-400">~{dbStats?.estimatedSizeKb || 1} KB</p>
                  </div>
                </div>

                {/* Platform Support Indicators */}
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><Laptop className="w-3.5 h-3.5 text-blue-400" /> Windows / Mac / Linux</span>
                  <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Android PWA / Installed</span>
                </div>
              </div>

              {/* GitHub Multi-Vendor Command Sync Integration Card */}
              <div className="p-3.5 bg-gradient-to-r from-purple-950/40 via-slate-950 to-slate-900 border border-purple-800/40 rounded-xl space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30 flex-shrink-0 mt-0.5">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-semibold text-slate-200 text-xs">
                          Sync with GitHub (Multi-Vendor: Cisco, Fortinet, Aruba, Juniper, Ruckus, Linux)
                        </h5>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                          Offline DB
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Ekstrak katalog command CLI dan playbook konfigurasi resmi dari repositori GitHub (Cisco YANG Suite, FortiOS, Aruba AOS-CX, Junos, FastIron, Linux) langsung ke IndexedDB lokal perangkat.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-900">
                  <span className="text-[10px] text-slate-500 font-mono">
                    💾 100% Offline • Terbawa saat build DMG, Windows EXE, & Android APK
                  </span>
                  <button
                    type="button"
                    id="btn-settings-open-github-sync"
                    onClick={() => {
                      if (onOpenOfflineKb) {
                        onOpenOfflineKb('sync_github');
                      }
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Buka Sync GitHub di Modal Offline KB</span>
                  </button>
                </div>
              </div>

              {/* Database Actions: Export & Import */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <p className="font-semibold text-slate-200 text-xs">Backup & Pulihkan Database Lokal</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportDatabase}
                    className="px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Backup Database (.json)</span>
                  </button>

                  <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Restore / Import Database</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleImportDatabase}
                      className="hidden" 
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleClearCache}
                    className="px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/40 text-red-300 border border-red-800/50 text-xs font-medium flex items-center gap-1.5 transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bersihkan Cache Online</span>
                  </button>
                </div>

                {dbActionMsg && (
                  <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                    dbActionMsg.success
                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                      : 'bg-red-950/60 border-red-800/80 text-red-300'
                  }`}>
                    {dbActionMsg.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                    <span>{dbActionMsg.text}</span>
                  </div>
                )}
              </div>

              {/* Online Search Docs Collection */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <p className="font-semibold text-slate-200 text-xs">Koleksi Dokumentasi Hasil Pencarian Online ({onlineDocs.length})</p>
                  </div>
                </div>

                {onlineDocs.length > 0 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari dokumentasi tersimpan..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredDocs.length > 0 ? (
                    filteredDocs.map((doc) => (
                      <div 
                        key={doc.id}
                        className="p-2.5 bg-slate-900/90 border border-slate-800/80 rounded-lg flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <p className="font-medium text-slate-200 text-xs truncate">{doc.title}</p>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{doc.summary || doc.content}</p>
                          <div className="flex items-center gap-2 pt-1 text-[9px] text-slate-500">
                            <span className="uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">{doc.brand}</span>
                            <span className="uppercase text-blue-400">{doc.provider}</span>
                            <span>{new Date(doc.savedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                          title="Hapus dokumentasi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-500 text-xs">
                      {onlineDocs.length === 0 
                        ? 'Belum ada dokumentasi online yang tersimpan. Saat Anda mencari solusi di AI Assistant, hasil dokumentasi dapat disimpan secara otomatis di sini.'
                        : 'Tidak ada dokumentasi yang cocok dengan pencarian.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'terminal' && (
            <div className="space-y-4">
              {/* IRXON Adapter Quick Link in Terminal Tab */}
              <div className="p-3.5 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-800/60 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-cyan-900/60 border border-cyan-700 text-cyan-300">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100 text-xs">Adaptor Bluetooth IRXON (BT578 / BT580)</h4>
                    <p className="text-[11px] text-slate-300">Konfigurasi Baud Rate, mode AT Command nirkabel & kabel USB Config</p>
                  </div>
                </div>

                {onOpenIrxonAt && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenIrxonAt();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Buka Tool IRXON</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Default Baud Rate Serial:</label>
                <select
                  value={defaultBaud}
                  onChange={(e) => setDefaultBaud(Number(e.target.value))}
                  className="w-full bg-slate-950 text-slate-200 border border-slate-700 rounded-lg p-2 focus:outline-none focus:border-blue-500 font-mono text-xs"
                >
                  <option value={9600}>9600 bps (Cisco Switch / Fortinet Standard)</option>
                  <option value={115200}>115200 bps (Aruba CX / Linux Serial / MikroTik / High Speed)</option>
                  <option value={57600}>57600 bps</option>
                  <option value={19200}>19200 bps</option>
                </select>
              </div>

              {/* Terminal Display Density / Font Size Setting */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Ukuran Font Terminal & Kepadatan Piksel:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Kompak (10px)', val: 10, desc: 'Maksimal Baris' },
                    { label: 'Kecil (11.5px)', val: 11.5, desc: 'Optimal HP / Tablet' },
                    { label: 'Normal (13px)', val: 13, desc: 'Standar Laptop' },
                    { label: 'Besar (15px)', val: 15, desc: 'Monitor Besar' },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setTerminalFontSizeSetting(item.val)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        terminalFontSizeSetting === item.val
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <p className="font-semibold text-xs">{item.label}</p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div>
                  <p className="text-slate-200 font-medium">Auto-Scroll Layar Terminal</p>
                  <p className="text-[11px] text-slate-400">Otomatis menggulir layar saat command baru masuk</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoScrollTerminal}
                  onChange={(e) => setAutoScrollTerminal(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div>
                  <p className="text-slate-200 font-medium">Auto-Sync AI Jawaban ke Database Offline</p>
                  <p className="text-[11px] text-slate-400">Simpan command rekomendasi AI ke cache lokal IndexedDB</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSyncLearned}
                  onChange={(e) => setAutoSyncLearned(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </div>
            </div>
          )}

          {activeTab === 'irxon' && (
            <div className="space-y-4">
              {/* Main Launch Card */}
              <div className="p-4 bg-gradient-to-br from-cyan-950/80 via-slate-950 to-blue-950/80 border border-cyan-700/60 rounded-xl space-y-3 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center flex-shrink-0">
                      <Radio className="w-5 h-5 animate-pulse text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-slate-100 font-semibold text-sm">
                        IRXON BT578 / BT580 AT Command Configurator
                      </h4>
                      <p className="text-[11px] text-cyan-200/90">
                        Tool Resmi Pengaturan Baud Rate, Nama Bluetooth, PIN Pairing & Mode AT
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-900/80 text-cyan-300 border border-cyan-700/80 flex-shrink-0">
                    BLE & SPP COM
                  </span>
                </div>

                <p className="text-[11.5px] text-slate-300 leading-relaxed">
                  Adaptor nirkabel IRXON memiliki dua mode kerja: <strong>Transparent Data Mode</strong> (meneruskan data ke port DB9 konsol router/switch) dan <strong>AT Command Mode</strong> (mengubah pengaturan internal Bluetooth).
                </p>

                {onOpenIrxonAt && (
                  <div className="pt-1">
                    <button
                      type="button"
                      id="btn-open-irxon-modal-from-settings"
                      onClick={() => {
                        onClose();
                        onOpenIrxonAt();
                      }}
                      className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-900/40 transition-all cursor-pointer"
                    >
                      <Sliders className="w-4 h-4 text-cyan-100" />
                      <span>Buka IRXON AT Configurator & Live Console Monitor</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Hardware Guide & Diagnostics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode & LED Guide */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Lampu Hijau & Mode Transparan</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Jika lampu <strong className="text-emerald-400">HIJAU</strong> menyala saat mengirim data, artinya hardware IRXON berfungsi normal menyemburkan data ke pin DB9 fisik RS-232.
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    Untuk mengubah baud rate tanpa kabel, gunakan tombol <em>Escape Mode (+++)</em> pada tool configurator, atau gunakan <em>Kabel USB Config</em> bawaan kotak IRXON.
                  </p>
                </div>

                {/* Preset Baud Rates & Specs */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs">
                    <Cable className="w-3.5 h-3.5" />
                    <span>Rekomendasi Parameter Perangkat</span>
                  </div>
                  <ul className="text-[10.5px] text-slate-300 space-y-1">
                    <li>• <strong className="text-slate-100">Cisco / Fortinet / Juniper:</strong> 9600 bps, 8N1</li>
                    <li>• <strong className="text-slate-100">MikroTik / Linux Console:</strong> 115200 bps, 8N1</li>
                    <li>• <strong className="text-slate-100">PIN Pairing Default:</strong> <span className="font-mono text-cyan-300">1234</span> atau <span className="font-mono text-cyan-300">0000</span></li>
                    <li>• <strong className="text-slate-100">Saklar DTE/DCE:</strong> Geser ke DTE untuk Cisco DB9 female</li>
                  </ul>
                </div>
              </div>

              {/* USB Cable vs Wireless Config */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-medium text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2 Metode Konfigurasi Chip IRXON</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <strong className="text-slate-200 block mb-0.5">1. Kabel USB Config (Paling Stabil):</strong>
                    Colok kabel USB-to-DB9 bawaan IRXON ke laptop. Buka tool dengan opsi <em>USB Cable / COM</em> @ 9600 bps.
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <strong className="text-slate-200 block mb-0.5">2. Nirkabel (Bluetooth Escape +++):</strong>
                    Hubungkan via Bluetooth, jalankan Escape Mode dengan jeda hening 1,1 detik agar modul masuk ke menu AT.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-return-app-settings-footer"
              onClick={handleSaveAndClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Aplikasi</span>
            </button>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              69 AI Terminal v2.6.0 Local Database Ready
            </span>
          </div>
          <button
            id="btn-save-settings"
            onClick={handleSaveAndClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Simpan & Selesai</span>
          </button>
        </div>
      </div>

      {/* Embedded Provider Login Dialog */}
      <ProviderLoginModal
        isOpen={isLoginModalOpen}
        initialProvider={loginModalProvider}
        onClose={() => {
          setIsLoginModalOpen(false);
          // Refresh provider accounts and input keys
          setProviderAccounts(getSavedProviderAccounts());
          setGeminiKey(safeStorage.getItem('69ai_api_key_gemini') || '');
          setOpenaiKey(safeStorage.getItem('69ai_api_key_openai') || '');
          setClaudeKey(safeStorage.getItem('69ai_api_key_claude') || '');
          setDeepseekKey(safeStorage.getItem('69ai_api_key_deepseek') || '');
        }}
        onProviderSelected={(pId) => {
          setAiProvider(pId);
          setProviderAccounts(getSavedProviderAccounts());
          setGeminiKey(safeStorage.getItem('69ai_api_key_gemini') || '');
          setOpenaiKey(safeStorage.getItem('69ai_api_key_openai') || '');
          setClaudeKey(safeStorage.getItem('69ai_api_key_claude') || '');
          setDeepseekKey(safeStorage.getItem('69ai_api_key_deepseek') || '');
        }}
      />
    </div>
  );
};
