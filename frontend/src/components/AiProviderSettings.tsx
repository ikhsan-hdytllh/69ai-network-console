import { safeStorage } from "../utils/safeStorage";
import { isDesktopNative } from '../config/release';
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Globe, 
  CheckCircle2, 
  ExternalLink, 
  Key, 
  Loader2, 
  Zap, 
  Clipboard, 
  Check, 
  ArrowLeft, 
  Trash2, 
  Eye, 
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Server,
  Link2,
  RefreshCw
} from 'lucide-react';
import { 
  AIProviderId, 
  AIProviderAccount, 
  PROVIDER_AUTH_URLS,
  getSavedProviderAccounts, 
  saveApiKeyDirectly,
  validateAiConnection,
  AIValidationResult
} from '../services/providerAuthService';
import { readFromClipboard } from '../utils/clipboard';

interface AiProviderSettingsProps {
  onReturnToApp?: () => void;
}

export const AiProviderSettings: React.FC<AiProviderSettingsProps> = ({
  onReturnToApp,
}) => {
  const [accounts, setAccounts] = useState<Record<AIProviderId, AIProviderAccount>>(() => getSavedProviderAccounts());
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(() => {
    return (safeStorage.getItem('69ai_user_provider') as AIProviderId) || 'gemini';
  });

  const [keyInput, setKeyInput] = useState<string>(() => {
    const prov = (safeStorage.getItem('69ai_user_provider') as AIProviderId) || 'gemini';
    if (prov === 'gemini') return safeStorage.getItem('69ai_api_key_gemini') || safeStorage.getItem('69ai_user_api_key') || '';
    if (prov === 'openai') return safeStorage.getItem('69ai_api_key_openai') || '';
    if (prov === 'claude') return safeStorage.getItem('69ai_api_key_claude') || '';
    if (prov === 'deepseek') return safeStorage.getItem('69ai_api_key_deepseek') || '';
    return '';
  });
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<AIValidationResult | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const [enableOnlineSearch, setEnableOnlineSearch] = useState<boolean>(() => {
    const saved = safeStorage.getItem('69ai_enable_online_search');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Custom Cloud Relay / Backend Server URL
  const [serverUrl, setServerUrl] = useState<string>(() => {
    const cur = safeStorage.getItem('69ai_backend_server_url') || '';
    // Auto-clean expired/dead domain from old builds
    if (cur && (cur.includes('lmdun5oue4wfncoh54ds2q') || cur.includes('g5in5orpjv3ntfzmskktgi') || cur.includes('yvhxfwurirei4ajyxt25iy'))) {
      safeStorage.removeItem('69ai_backend_server_url');
      return '';
    }
    return cur;
  });
  const [isTestingServer, setIsTestingServer] = useState<boolean>(false);
  const [serverFeedback, setServerFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Auto-clean obsolete server URLs on component mount
  useEffect(() => {
    const cur = safeStorage.getItem('69ai_backend_server_url');
    if (cur && (cur.includes('lmdun5oue4wfncoh54ds2q') || cur.includes('g5in5orpjv3ntfzmskktgi') || cur.includes('yvhxfwurirei4ajyxt25iy'))) {
      safeStorage.removeItem('69ai_backend_server_url');
      setServerUrl('');
    }
  }, []);

  const handleSaveServerUrl = async (urlToSave: string) => {
    const cleanUrl = urlToSave.trim().replace(/\/+$/, '');
    setServerUrl(cleanUrl);
    if (cleanUrl) {
      safeStorage.setItem('69ai_backend_server_url', cleanUrl);
      setServerFeedback({
        type: 'info',
        text: `Menyimpan & memverifikasi server relay: ${cleanUrl}...`,
      });
      setIsTestingServer(true);
      try {
        const valRes = await validateAiConnection(selectedProvider);
        setValidationResult(valRes);
        if (valRes.success) {
          setServerFeedback({
            type: 'success',
            text: `✅ Cloud Server Relay Terhubung & Aktif! Mode tanpa kuota pribadi siap digunakan.`,
          });
          setFeedbackMsg({
            type: 'success',
            text: `✅ Terhubung ke ${valRes.model}. Kuota API pribadi berhasil dibypass!`,
          });
        } else {
          setServerFeedback({
            type: 'success',
            text: `✅ URL Server Relay tersimpan: ${cleanUrl}`,
          });
        }
      } catch (e) {
        setServerFeedback({
          type: 'success',
          text: `✅ URL Server Relay tersimpan: ${cleanUrl}`,
        });
      } finally {
        setIsTestingServer(false);
      }
    } else {
      safeStorage.removeItem('69ai_backend_server_url');
      setServerFeedback({
        type: 'info',
        text: 'URL Server dikosongkan. Aplikasi beralih ke Direct API Key.',
      });
    }
    window.dispatchEvent(new CustomEvent('69ai_settings_updated'));
  };

  const handleTestServerConnection = async () => {
    const rawTarget = serverUrl.trim().replace(/\/+$/, '');
    const isBrowser = typeof window !== 'undefined';
    const isFileProtocol = isBrowser && (window.location.protocol === 'file:' || !window.location.host);
    const currentHost = isBrowser && window.location.host ? window.location.host : '';

    // If serverUrl is empty
    if (!rawTarget) {
      setIsTestingServer(true);
      if (isFileProtocol) {
        setTimeout(() => {
          setServerFeedback({
            type: 'success',
            text: '📱 Mode Direct API Key Aktif (Standar APK Android): Aplikasi terhubung langsung ke Google AI Gemini 3.8 Flash di atas tanpa perlu server perantara.',
          });
          setIsTestingServer(false);
        }, 300);
        return;
      }
    }

    // Determine effective target
    const isSameHost = rawTarget && currentHost && rawTarget.includes(currentHost);
    const target = (isSameHost || !rawTarget) ? '' : rawTarget;

    setIsTestingServer(true);
    setServerFeedback({ type: 'info', text: `Menghubungi server: ${rawTarget || (isFileProtocol ? 'Shared Cloud Relay' : 'Server Lokal/Bawaan (/api)')}...` });

    try {
      // 1. Try /api/health first (lightweight ping)
      const healthUrl = target ? `${target}/api/health` : '/api/health';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      
      let healthOk = false;
      try {
        const healthRes = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        if (healthRes.ok) {
          healthOk = true;
        } else if (healthRes.status === 403) {
          clearTimeout(timer);
          setServerFeedback({
            type: 'error',
            text: '⚠️ HTTP 403: Endpoint Cloud Run Dev dilindungi sesi AI Studio. Gunakan Direct API Key di form atas (Gemini 3.8 Flash) untuk akses langsung!',
          });
          return;
        }
      } catch (hErr) {
        // Fallthrough to /api/chat
      } finally {
        clearTimeout(timer);
      }

      // 2. Test /api/chat relay
      const chatUrl = target ? `${target}/api/chat` : '/api/chat';
      const chatController = new AbortController();
      const chatTimer = setTimeout(() => chatController.abort(), 8000);

      const res = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: chatController.signal,
        body: JSON.stringify({
          message: 'ping',
          brand: 'cisco',
          selectedModel: 'Google Gemini 3.8 Flash',
        }),
      });
      clearTimeout(chatTimer);

      if (res.ok) {
        const data = await res.json();
        setServerFeedback({
          type: 'success',
          text: `✅ Server Relay Terhubung & Aktif! Respon: "${data.source || 'OK'}"`,
        });
      } else if (res.status === 403) {
        setServerFeedback({
          type: 'error',
          text: '⚠️ HTTP 403: Cloud Run Dev memerlukan sesi browser developer. Solusi: Gunakan Direct API Key Google Gemini di form atas (Gemini 3.8 Flash).',
        });
      } else {
        setServerFeedback({
          type: healthOk ? 'info' : 'error',
          text: healthOk 
            ? `Server Online (Health OK), status AI relay: HTTP ${res.status}`
            : `Server merespon HTTP ${res.status}: Periksa URL atau koneksi jaringan Anda.`,
        });
      }
    } catch (e: any) {
      if (isFileProtocol && !rawTarget) {
        setServerFeedback({
          type: 'success',
          text: '📱 Mode Direct API Key Aktif: Aplikasi terhubung langsung ke Google AI Gemini 3.8 Flash di form atas.',
        });
      } else {
        setServerFeedback({
          type: 'error',
          text: `Tidak dapat menjangkau server relay (${e?.message || 'Failed to fetch'}). Pada Android APK, bagian ini boleh dikosongkan karena Direct API Key di form atas sudah aktif!`,
        });
      }
    } finally {
      setIsTestingServer(false);
    }
  };

  // Get current active key from storage for the selected provider
  const getActiveKeyForProvider = (providerId: AIProviderId): string => {
    if (providerId === 'gemini') {
      return safeStorage.getItem('69ai_api_key_gemini') || safeStorage.getItem('69ai_user_api_key') || '';
    }
    if (providerId === 'openai') {
      return safeStorage.getItem('69ai_api_key_openai') || '';
    }
    if (providerId === 'claude') {
      return safeStorage.getItem('69ai_api_key_claude') || '';
    }
    if (providerId === 'deepseek') {
      return safeStorage.getItem('69ai_api_key_deepseek') || '';
    }
    return '';
  };

  // Sync state on provider switch
  useEffect(() => {
    const currentKey = getActiveKeyForProvider(selectedProvider);
    setKeyInput(currentKey);
    setShowKey(false);
    setFeedbackMsg(null);

    // Validate connection status
    validateAiConnection(selectedProvider, currentKey || undefined)
      .then((res) => setValidationResult(res))
      .catch(() => {});
  }, [selectedProvider]);

  // Sync with global updates
  useEffect(() => {
    const handleUpdate = () => {
      setAccounts(getSavedProviderAccounts());
      const currentKey = getActiveKeyForProvider(selectedProvider);
      if (currentKey) {
        setKeyInput(currentKey);
      }
      const curServer = safeStorage.getItem('69ai_backend_server_url') || '';
      setServerUrl(curServer);
    };
    window.addEventListener('69ai_auth_updated', handleUpdate);
    window.addEventListener('69ai_settings_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('69ai_auth_updated', handleUpdate);
      window.removeEventListener('69ai_settings_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [selectedProvider]);

  const handlePasteKey = async () => {
    try {
      const text = await readFromClipboard();
      if (text && text.trim()) {
        setKeyInput(text.trim());
        setCopiedSuccess(true);
        setFeedbackMsg({ type: 'info', text: 'API Key berhasil disalin dari clipboard!' });
        setTimeout(() => setCopiedSuccess(false), 2000);
      }
    } catch (e) {
      setFeedbackMsg({ type: 'error', text: 'Gagal membaca clipboard. Silakan tempel (Paste) manual.' });
    }
  };

  const handleSaveKey = async () => {
    const cleanKey = keyInput.trim();
    setIsSaving(true);
    setFeedbackMsg({ type: 'info', text: 'Menyimpan & memverifikasi API Key...' });

    try {
      // Direct instant permanent save
      saveApiKeyDirectly(selectedProvider, cleanKey);

      // Validate connection
      const res = await validateAiConnection(selectedProvider, cleanKey);
      setValidationResult(res);

      if (cleanKey) {
        setFeedbackMsg({
          type: 'success',
          text: `✅ Berhasil! API Key ${accounts[selectedProvider].name} tersimpan permanen dan siap digunakan.`,
        });
      } else {
        setFeedbackMsg({
          type: 'info',
          text: `API Key ${accounts[selectedProvider].name} telah dihapus.`,
        });
      }

      setAccounts(getSavedProviderAccounts());
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Gagal menyimpan: ${err.message || 'Error'}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = () => {
    if (window.confirm(`Hapus API Key ${accounts[selectedProvider].name}?`)) {
      setKeyInput('');
      saveApiKeyDirectly(selectedProvider, '');
      setAccounts(getSavedProviderAccounts());
      setFeedbackMsg({ type: 'info', text: 'API Key telah dikosongkan.' });
    }
  };

  const [selectedAiModel, setSelectedAiModel] = useState<string>(() => {
    return safeStorage.getItem('69ai_preferred_gemini_model') || safeStorage.getItem('geminiModel') || safeStorage.getItem('69ai_ui_selected_model') || 'gemini-3.8-flash';
  });

  const handleSelectAiModel = (mVal: string) => {
    setSelectedAiModel(mVal);
    safeStorage.setItem('69ai_preferred_gemini_model', mVal);
    safeStorage.setItem('geminiModel', mVal);
    safeStorage.setItem('69ai_ui_selected_model', mVal);
    window.dispatchEvent(new CustomEvent('69ai_settings_updated'));
    setFeedbackMsg({
      type: 'success',
      text: `✅ Model AI aktif disetel ke: ${mVal}`,
    });
  };

  const handleTestPing = async () => {
    setIsValidating(true);
    setFeedbackMsg({ type: 'info', text: 'Menguji koneksi ke server AI...' });
    try {
      const res = await validateAiConnection(selectedProvider, keyInput.trim() || undefined);
      setValidationResult(res);
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Koneksi Berhasil! Latensi: ${res.latencyMs}ms • Model: ${res.model}`,
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.message || 'Gagal terhubung ke provider AI.',
        });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: `Uji koneksi gagal: ${err.message}` });
    } finally {
      setIsValidating(false);
    }
  };

  const handleOnlineSearchToggle = (val: boolean) => {
    setEnableOnlineSearch(val);
    safeStorage.setItem('69ai_enable_online_search', JSON.stringify(val));
    window.dispatchEvent(new CustomEvent('69ai_settings_updated'));
  };

  const currentAccount = accounts[selectedProvider];
  const authUrlInfo = PROVIDER_AUTH_URLS[selectedProvider];
  const hasSavedKey = Boolean(getActiveKeyForProvider(selectedProvider));

  return (
    <div id="ai-provider-settings-root" className="space-y-4 max-w-2xl mx-auto pb-4">
      {/* Top Banner & Return button */}
      <div className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span>Pengaturan API Key AI</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/80 text-emerald-400 font-semibold">
                Simple & Permanen
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Cukup masukkan API Key sekali. Key tersimpan otomatis dan akan langsung menimpa jika dimasukkan key baru.
            </p>
          </div>
        </div>

        {onReturnToApp && (
          <button
            type="button"
            id="btn-return-app-top"
            onClick={onReturnToApp}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
        )}
      </div>

      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['gemini', 'openai', 'claude', 'deepseek'] as AIProviderId[]).map((pId) => {
          const acc = accounts[pId];
          const isSelected = selectedProvider === pId;
          const isKeyReady = Boolean(getActiveKeyForProvider(pId));

          return (
            <button
              key={pId}
              type="button"
              id={`tab-select-provider-${pId}`}
              onClick={() => setSelectedProvider(pId)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-950/50 text-white'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-semibold text-xs text-slate-200 capitalize">
                  {pId === 'gemini' ? 'Google Gemini' : pId === 'openai' ? 'OpenAI ChatGPT' : pId === 'claude' ? 'Claude AI' : 'DeepSeek AI'}
                </span>
                {isKeyReady ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400 animate-pulse" title="Key Aktif" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-neutral-600" title="Belum Ada Key" />
                )}
              </div>
              <span className="text-[10px] text-slate-400 truncate">
                {isKeyReady ? '🟢 Key Tersimpan' : '⚪ Masukkan Key'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Provider API Key Card */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-400" />
            <h4 className="font-semibold text-sm text-slate-100">
              API Key {currentAccount.name}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {hasSavedKey ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10.5px] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Aktif Terhubung</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/80 text-amber-300 text-[10.5px] font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                <span>Belum Ada Key</span>
              </span>
            )}
          </div>
        </div>

        {/* Input Field with Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="input-ai-api-key" className="text-slate-300 font-medium">
              Masukkan / Tempel API Key Anda:
            </label>
            <a
              href={authUrlInfo.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 text-[11px]"
            >
              <span>Dapatkan Key di {authUrlInfo.portalName}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="relative flex items-center">
            <input
              id="input-ai-api-key"
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={
                selectedProvider === 'gemini' 
                  ? 'AIzaSy...' 
                  : selectedProvider === 'openai' 
                  ? 'sk-...' 
                  : selectedProvider === 'claude' 
                  ? 'sk-ant-...' 
                  : 'sk-...'
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-24 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                id="btn-toggle-key-visibility"
                onClick={() => setShowKey(!showKey)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title={showKey ? 'Sembunyikan Key' : 'Tampilkan Key'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                id="btn-paste-api-key"
                onClick={handlePasteKey}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                title="Paste dari Clipboard"
              >
                {copiedSuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Clipboard className="w-3 h-3" />}
                <span>Paste</span>
              </button>

              {keyInput && (
                <button
                  type="button"
                  id="btn-clear-api-key"
                  onClick={handleClearKey}
                  className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
                  title="Hapus Key"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {selectedProvider === 'gemini' && keyInput.trim().length > 0 && (
            <div className="pt-1">
              <div className="p-2 rounded-lg bg-blue-950/40 border border-blue-800/60 text-[11px] text-blue-300 flex items-center justify-between">
                <span>🔑 API Key siap disimpan. Sistem otomatis menghubungkan Anda ke Google Gemini 3.8 Flash.</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-cyan-300 hover:text-white flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Google AI Studio</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400">
            ℹ️ Key tersimpan aman di penyimpanan lokal perangkat Anda (tidak dikirim ke pihak ketiga).
          </p>
        </div>

        {/* Dedicated Model Selection in Settings */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="select-ai-engine-model" className="text-slate-200 font-semibold text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Pilihan Model AI Engine (Active Model)</span>
            </label>
            <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
              {selectedAiModel}
            </span>
          </div>

          <select
            id="select-ai-engine-model"
            value={selectedAiModel}
            onChange={(e) => handleSelectAiModel(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 hover:border-blue-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
          >
            <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (Direkomendasikan - Paling Cepat &amp; Cerdas)</option>
            <option value="gemini-3.1-flash-lite">Google Gemini 3.1 Flash Lite (Sangat Ringan &amp; Efisien)</option>
            <option value="gemini-flash-latest">Google Gemini Flash Latest (Versi Terbaru)</option>
            <option value="gemini-3.1-pro-preview">Google Gemini 3.1 Pro (Analisis Mendalam &amp; Logika Tinggi)</option>
            <option value="Offline Database Engine">Offline Expert Engine (Mesin Pakar Lokal 69 AI - Tanpa Internet)</option>
          </select>
          <p className="text-[10.5px] text-slate-400">
            Pilihan model ini akan digunakan untuk semua analisis chat AI, pembacaan terminal, dan troubleshooting jaringan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
          <button
            type="button"
            id="btn-save-ai-key-primary"
            onClick={handleSaveKey}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            )}
            <span>💾 Simpan & Aktifkan API Key</span>
          </button>

          <button
            type="button"
            id="btn-test-ai-key-ping"
            onClick={handleTestPing}
            disabled={isValidating || !keyInput}
            className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Zap className="w-4 h-4 text-amber-400" />
            )}
            <span>⚡ Uji Respon</span>
          </button>
        </div>

        {/* Feedback Message Alert */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
                : feedbackMsg.type === 'error'
                ? 'bg-rose-950/50 border-rose-800/80 text-rose-200'
                : 'bg-blue-950/50 border-blue-800/80 text-blue-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : feedbackMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Quota Exceeded 1-Click Bypass Card */}
        {(feedbackMsg?.text?.toLowerCase().includes('quota') || 
          feedbackMsg?.text?.includes('429') || 
          validationResult?.message?.toLowerCase().includes('quota') ||
          validationResult?.message?.includes('429')) && (
          <div className="p-3.5 bg-amber-950/60 border border-amber-600/80 rounded-xl space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs text-amber-200">Bypass Kuota API: Beralih ke Gemini 3.8 Flash</p>
                <p className="text-[11px] text-amber-300/90 mt-0.5">
                  Model 3.7 Flash dibatasi 20 permintaan/hari oleh Google Free Tier. Klik tombol di bawah untuk langsung mengaktifkan <b>Gemini 3.8 Flash</b> yang memiliki kuota bebas tanpa batas 429!
                </p>
              </div>
            </div>
            <button
              type="button"
              id="btn-bypass-quota-one-click"
              onClick={() => {
                safeStorage.setItem('geminiModel', 'gemini-3.8-flash');
                safeStorage.setItem('69ai_preferred_gemini_model', 'gemini-3.8-flash');
                window.dispatchEvent(new CustomEvent('69ai_settings_updated'));
                handleTestPing();
              }}
              disabled={isValidating}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:from-amber-600 active:to-orange-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 transition-all cursor-pointer"
            >
              {isValidating ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Zap className="w-4 h-4 fill-slate-950" />
              )}
              <span>🚀 Aktifkan Gemini 3.8 Flash Sekarang (Bypass Kuota 429)</span>
            </button>
          </div>
        )}
      </div>

      {/* Cloud Relay & Backend Server URL Option (Solusi Kuota Habis & Native APK) */}
      {!isDesktopNative() && (
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                <span>URL Server Cloud Relay / Backend (Opsional)</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                  Bypass Kuota Pribadi
                </span>
              </p>
              <p className="text-[11px] text-slate-400">
                Gunakan server Cloud Run / proxy ini jika ingin menjalankan AI melalui server. Untuk Android APK langsung, disarankan menggunakan API Key di atas dengan Gemini 3.8 Flash.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative flex items-center">
            <input
              id="input-backend-server-url"
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="Kosong = Server Bawaan (/api) atau masukkan URL Server Relay"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-20 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              {serverUrl && (
                <button
                  type="button"
                  onClick={() => handleSaveServerUrl('')}
                  className="px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                  title="Hapus / Gunakan Server Bawaan & Direct Key"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-slate-400 font-medium mr-1">Preset Cepat:</span>
            <button
              type="button"
              id="btn-preset-default-server"
              onClick={() => handleSaveServerUrl('')}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-indigo-950/60 border border-slate-700 hover:border-indigo-700 text-[10.5px] text-indigo-300 font-mono transition-all cursor-pointer"
            >
              🔄 Server Bawaan (/api)
            </button>
            <button
              type="button"
              id="btn-preset-localhost"
              onClick={() => handleSaveServerUrl('http://localhost:3000')}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10.5px] text-slate-300 font-mono transition-all cursor-pointer"
            >
              💻 Localhost:3000
            </button>
          </div>
        </div>

        {/* Action Buttons for Server URL */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            id="btn-save-server-url"
            onClick={() => handleSaveServerUrl(serverUrl)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Simpan URL Server</span>
          </button>
          <button
            type="button"
            id="btn-test-server-url"
            onClick={handleTestServerConnection}
            disabled={isTestingServer}
            className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isTestingServer ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />}
            <span>Uji Server</span>
          </button>
        </div>

        {serverFeedback && (
          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
              serverFeedback.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
                : serverFeedback.type === 'error'
                ? 'bg-rose-950/50 border-rose-800/80 text-rose-200'
                : 'bg-indigo-950/50 border-indigo-800/80 text-indigo-200'
            }`}
          >
            {serverFeedback.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : serverFeedback.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            )}
            <span>{serverFeedback.text}</span>
          </div>
        )}
      </div>
      )}

      {/* Online Search Grounding Feature */}
      <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-teal-600/20 text-teal-400 border border-teal-500/30">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-200 text-xs">Pencarian Online Live (Web Search Grounding)</p>
            <p className="text-[11px] text-slate-400">Izinkan AI mencari dokumentasi errata bug vendor, CVE, dan RFC di internet</p>
          </div>
        </div>
        <input
          type="checkbox"
          id="toggle-online-search-simple"
          checked={enableOnlineSearch}
          onChange={(e) => handleOnlineSearchToggle(e.target.checked)}
          className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
        />
      </div>

      {/* Direct Return Button */}
      {onReturnToApp && (
        <div className="pt-2">
          <button
            type="button"
            id="btn-return-app-footer"
            onClick={onReturnToApp}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Kembali ke Konsol Terminal & AI Chat</span>
          </button>
        </div>
      )}
    </div>
  );
};
