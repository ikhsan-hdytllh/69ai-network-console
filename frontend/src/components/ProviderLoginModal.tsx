import { safeStorage } from "../utils/safeStorage";
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Key, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Zap, 
  Clipboard,
  Check,
  Eye,
  EyeOff,
  X,
  Trash2,
  Bot,
  ChevronDown
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

interface ProviderLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProvider?: AIProviderId;
  onProviderSelected?: (providerId: AIProviderId, modelName: string) => void;
  selectedModel?: string;
  onModelChange?: (modelName: string) => void;
}

export const ProviderLoginModal: React.FC<ProviderLoginModalProps> = ({
  isOpen,
  onClose,
  initialProvider = 'gemini',
  onProviderSelected,
  selectedModel = 'Google Gemini 3.8 Flash',
  onModelChange,
}) => {
  const [accounts, setAccounts] = useState<Record<AIProviderId, AIProviderAccount>>(() => getSavedProviderAccounts());
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(initialProvider);
  const [currentModel, setCurrentModel] = useState<string>(selectedModel);
  const [keyInput, setKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<AIValidationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const getActiveKey = (pId: AIProviderId): string => {
    if (pId === 'gemini') {
      return safeStorage.getItem('69ai_api_key_gemini') || safeStorage.getItem('69ai_user_api_key') || '';
    }
    if (pId === 'openai') return safeStorage.getItem('69ai_api_key_openai') || '';
    if (pId === 'claude') return safeStorage.getItem('69ai_api_key_claude') || '';
    if (pId === 'deepseek') return safeStorage.getItem('69ai_api_key_deepseek') || '';
    return '';
  };

  useEffect(() => {
    if (isOpen) {
      const refreshed = getSavedProviderAccounts();
      setAccounts(refreshed);
      setSelectedProvider(initialProvider);
      setCurrentModel(selectedModel);
      setStatusMessage(null);
      setShowKey(false);

      const saved = getActiveKey(initialProvider);
      setKeyInput(saved);

      validateAiConnection(initialProvider, saved || undefined)
        .then((res) => setValidationResult(res))
        .catch(() => {});
    }
  }, [isOpen, initialProvider, selectedModel]);

  const handleProviderChange = (pId: AIProviderId) => {
    setSelectedProvider(pId);
    setStatusMessage(null);
    setShowKey(false);
    const saved = getActiveKey(pId);
    setKeyInput(saved);
    validateAiConnection(pId, saved || undefined)
      .then((res) => setValidationResult(res))
      .catch(() => {});
  };

  const handlePaste = async () => {
    try {
      const text = await readFromClipboard();
      if (text && text.trim()) {
        setKeyInput(text.trim());
        setCopiedSuccess(true);
        setStatusMessage({ type: 'info', text: 'API Key berhasil disalin dari clipboard!' });
        setTimeout(() => setCopiedSuccess(false), 2000);
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Gagal membaca clipboard. Silakan tempel secara manual.' });
    }
  };

  const handleSaveAndActivate = async () => {
    const cleanKey = keyInput.trim();
    setIsSaving(true);
    setStatusMessage({ type: 'info', text: 'Menyimpan API Key...' });

    try {
      saveApiKeyDirectly(selectedProvider, cleanKey);
      const res = await validateAiConnection(selectedProvider, cleanKey);
      setValidationResult(res);
      setAccounts(getSavedProviderAccounts());

      if (cleanKey) {
        setStatusMessage({
          type: 'success',
          text: `✅ API Key ${accounts[selectedProvider].name} tersimpan dan aktif selamanya!`,
        });
        if (onProviderSelected) {
          onProviderSelected(selectedProvider, accounts[selectedProvider].activeModel);
        }
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setStatusMessage({
          type: 'info',
          text: 'API Key telah dihapus.',
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Gagal: ${err.message || 'Error'}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    if (window.confirm(`Hapus API Key ${accounts[selectedProvider].name}?`)) {
      setKeyInput('');
      saveApiKeyDirectly(selectedProvider, '');
      setAccounts(getSavedProviderAccounts());
      setStatusMessage({ type: 'info', text: 'API Key telah dikosongkan.' });
    }
  };

  const handleTestKey = async () => {
    setIsValidating(true);
    setStatusMessage({ type: 'info', text: 'Menguji API Key ke server...' });
    try {
      const res = await validateAiConnection(selectedProvider, keyInput.trim() || undefined);
      setValidationResult(res);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Koneksi Berhasil! Latensi: ${res.latencyMs}ms • Model: ${res.model}`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'Gagal validasi API Key.',
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error uji: ${err.message}` });
    } finally {
      setIsValidating(false);
    }
  };

  if (!isOpen) return null;

  const currentAccount = accounts[selectedProvider];
  const authUrlInfo = PROVIDER_AUTH_URLS[selectedProvider];
  const hasSavedKey = Boolean(getActiveKey(selectedProvider));

  return (
    <div 
      id="modal-provider-api-key-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div 
        id="modal-provider-api-key-box"
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Pengaturan API Key AI</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-medium">
                  Direct & Permanent
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Masukkan API Key resmi untuk mengaktifkan asisten AI 69
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* 1. AI Model Selection Section */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="modal-select-ai-model" className="text-slate-200 font-medium flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                <span>Pilihan Model AI:</span>
              </label>
              <span className="text-[10px] text-slate-400">Model utama percakapan</span>
            </div>
            <div className="relative">
              <select
                id="modal-select-ai-model"
                value={currentModel}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentModel(val);
                  if (onModelChange) {
                    onModelChange(val);
                  }
                }}
                className="w-full bg-slate-900 hover:bg-slate-850 text-slate-100 text-xs border border-slate-700 rounded-lg px-3 py-2.5 appearance-none focus:outline-none focus:border-blue-500 cursor-pointer font-sans transition-colors"
              >
                <option value="Google Gemini 3.8 Flash">Google Gemini 3.8 Flash (Direkomendasikan - Paling Cepat & Cerdas)</option>
                <option value="Google Gemini 3.1 Flash Lite">Google Gemini 3.1 Flash Lite (Hemat Kuota & Ultra Responsif)</option>
                <option value="Google Gemini 3.1 Pro">Google Gemini 3.1 Pro (Deep Reasoning & Analisa Kompleks)</option>
                <option value="Google Gemini Flash Latest">Google Gemini Flash Latest (Model Flash Terbaru)</option>
                <option value="OpenAI ChatGPT (GPT-4o)">OpenAI ChatGPT (GPT-4o)</option>
                <option value="Anthropic Claude 3.5">Anthropic Claude 3.5 Sonnet</option>
                <option value="DeepSeek V3 / R1">DeepSeek V3 / R1</option>
                <option value="Offline Database Engine">Offline Database Engine (Lokal / Tanpa Internet)</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* 2. Provider Selection Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['gemini', 'openai', 'claude', 'deepseek'] as AIProviderId[]).map((pId) => {
              const isSelected = selectedProvider === pId;
              const hasKey = Boolean(getActiveKey(pId));
              return (
                <button
                  key={pId}
                  type="button"
                  onClick={() => handleProviderChange(pId)}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-950/50 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-semibold text-xs capitalize">
                      {pId === 'gemini' ? 'Gemini' : pId === 'openai' ? 'OpenAI' : pId === 'claude' ? 'Claude' : 'DeepSeek'}
                    </span>
                    {hasKey ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 truncate">
                    {hasKey ? '🟢 Tersimpan' : '⚪ Kosong'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Key Input Section */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="modal-input-key" className="text-slate-200 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>API Key {currentAccount.name}:</span>
              </label>
              <a
                href={authUrlInfo.loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Dapatkan API Key ↗</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative flex items-center">
              <input
                id="modal-input-key"
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={
                  selectedProvider === 'gemini' ? 'AIzaSy... / AQ...' : 'sk-...'
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-24 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1.5 rounded text-slate-400 hover:text-slate-200"
                  title={showKey ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1"
                  title="Paste dari Clipboard"
                >
                  {copiedSuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Clipboard className="w-3 h-3" />}
                  <span>Paste</span>
                </button>

                {keyInput && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 rounded text-rose-400 hover:text-rose-300"
                    title="Hapus Key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              💡 Key akan tersimpan seterusnya di perangkat ini. Jika Anda memasukkan key baru, key lama akan otomatis tertimpa.
            </p>
          </div>

          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/50 border-rose-800/80 text-rose-200'
                  : 'bg-blue-950/50 border-blue-800/80 text-blue-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isValidating || !keyInput}
            className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            {isValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
            <span>Uji Respon</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 rounded-lg bg-transparent hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              Tutup
            </button>
            <button
              type="button"
              id="btn-save-key-modal"
              onClick={handleSaveAndActivate}
              disabled={isSaving}
              className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-900/30 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />}
              <span>Simpan & Gunakan Key</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
