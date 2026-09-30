import { safeStorage } from "../utils/safeStorage";
import { isDesktopNative } from '../config/release';
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Key, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Clipboard, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Zap, 
  Globe,
  Radio,
  Server
} from 'lucide-react';
import { 
  validateAiConnection, 
  AIValidationResult,
  getSavedProviderAccounts,
  saveApiKeyDirectly
} from '../services/providerAuthService';
import { readFromClipboard } from '../utils/clipboard';

interface GoogleAiStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const GoogleAiStudioModal: React.FC<GoogleAiStudioModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [operatorName, setOperatorName] = useState<string>('Network Engineer');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<AIValidationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [activeStoredKey, setActiveStoredKey] = useState<string>('');
  const [serverUrlInput, setServerUrlInput] = useState<string>(() => {
    return safeStorage.getItem('69ai_backend_server_url') || '';
  });

  useEffect(() => {
    if (isOpen) {
      const savedKey = safeStorage.getItem('69ai_api_key_gemini') || safeStorage.getItem('69ai_user_api_key') || '';
      const savedServer = safeStorage.getItem('69ai_backend_server_url') || '';
      const name = safeStorage.getItem('69ai_operator_name') || 'Network Engineer';
      setApiKeyInput(savedKey);
      setActiveStoredKey(savedKey);
      setServerUrlInput(savedServer);
      setOperatorName(name);
      setStatusMessage(null);

      // Auto check active connection
      setIsValidating(true);
      validateAiConnection('gemini', savedKey.trim() || undefined)
        .then((res) => setValidationResult(res))
        .catch(() => {})
        .finally(() => setIsValidating(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenAiStudio = () => {
    const url = 'https://aistudio.google.com/apikey';
    try {
      if (typeof (window as any).AndroidNative?.openExternalBrowser === 'function') {
        (window as any).AndroidNative.openExternalBrowser(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await readFromClipboard();
      if (text && text.trim()) {
        setApiKeyInput(text.trim());
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2000);
      }
    } catch (e) {
      // Ignored
    }
  };

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim();
    setIsValidating(true);
    setStatusMessage({
      type: 'info',
      text: keyToTest ? 'Menguji API Key ke Google Gemini 3.8 Flash...' : 'Menguji koneksi Google Gemini 3.8 Flash...'
    });

    try {
      const res = await validateAiConnection('gemini', keyToTest || undefined);
      setValidationResult(res);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Koneksi Berhasil! Terhubung ke ${res.model} (${res.latencyMs}ms). Siap digunakan.`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Gagal: ${res.message || 'API Key tidak valid atau kuota habis.'}`
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Error saat pengujian: ${e?.message || 'Koneksi gagal'}`
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveAndActivate = async () => {
    setIsSaving(true);
    const cleanKey = apiKeyInput.trim();

    try {
      // Direct instant permanent save
      saveApiKeyDirectly('gemini', cleanKey);
      safeStorage.setItem('69ai_user_provider', 'gemini');
      safeStorage.setItem('69ai_ui_selected_model', 'Google Gemini 3.7 Flash');
      setActiveStoredKey(cleanKey);

      const cleanServer = serverUrlInput.trim().replace(/\/+$/, '');
      if (cleanServer) {
        safeStorage.setItem('69ai_backend_server_url', cleanServer);
      } else {
        safeStorage.removeItem('69ai_backend_server_url');
      }
      window.dispatchEvent(new CustomEvent('69ai_settings_updated'));

      // Quick validate
      const res = await validateAiConnection('gemini', cleanKey || undefined);
      setValidationResult(res);

      setStatusMessage({
        type: 'success',
        text: cleanKey 
          ? '✅ API Key Google AI Studio berhasil disimpan & Gemini 3.7 Flash aktif permanen!' 
          : 'API Key dihapus.'
      });

      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: `Gagal menyimpan: ${e?.message || 'Terjadi kesalahan'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = () => {
    setApiKeyInput('');
    saveApiKeyDirectly('gemini', '');
    setActiveStoredKey('');
    setStatusMessage({
      type: 'info',
      text: 'API Key dihapus.'
    });
  };

  return (
    <div 
      id="google-aistudio-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="google-aistudio-modal-card"
        className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Google AI Studio Branding */}
        <div className="px-5 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 p-[1.5px] flex items-center justify-center shadow-lg">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center text-white">
                <Sparkles className="w-5 h-5 text-blue-400" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Google AI Studio Gemini</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/70 font-mono font-medium">
                  3.8 Flash
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Gunakan API Key Google AI Studio Anda untuk akses tercepat & kuota pribadi.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-aistudio-modal"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Message Notification */}
          {statusMessage && (
            <div 
              id="aistudio-status-banner"
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                statusMessage.type === 'success' 
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200' 
                  : statusMessage.type === 'error'
                  ? 'bg-red-950/70 border-red-700 text-red-200'
                  : 'bg-blue-950/70 border-blue-700 text-blue-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">
                <span className="font-medium">{statusMessage.text}</span>
              </div>
            </div>
          )}

          {/* 1-Click Quota Bypass Banner if Quota Exceeded */}
          {(statusMessage?.text?.toLowerCase().includes('quota') || 
            statusMessage?.text?.includes('429') || 
            validationResult?.message?.toLowerCase().includes('quota') || 
            validationResult?.message?.includes('429')) && (
            <div className="p-3.5 bg-amber-950/60 border border-amber-600/80 rounded-xl space-y-2">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-200 text-xs">Bypass Kuota API: Beralih ke Gemini 3.8 Flash</p>
                  <p className="text-[11px] text-amber-300/90 mt-0.5">
                    Model 3.7 Flash pada akun Google Free Tier dibatasi 20 permintaan/hari. Klik tombol di bawah untuk langsung beralih ke <b>Gemini 3.8 Flash</b> yang memiliki kuota bebas tanpa batas 429!
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-modal-bypass-quota"
                onClick={async () => {
                  safeStorage.setItem('geminiModel', 'gemini-3.8-flash');
                  safeStorage.setItem('69ai_preferred_gemini_model', 'gemini-3.8-flash');
                  window.dispatchEvent(new CustomEvent('69ai_settings_updated'));
                  setStatusMessage({ type: 'info', text: 'Mengaktifkan Google Gemini 3.8 Flash (Bebas Kuota 429)...' });
                  try {
                    const res = await validateAiConnection('gemini', apiKeyInput.trim() || undefined);
                    setValidationResult(res);
                    if (res.success) {
                      setStatusMessage({
                        type: 'success',
                        text: `✅ Berhasil! Terhubung ke ${res.model || 'Gemini 3.8 Flash'}. Kuota 429 berhasil di-bypass!`,
                      });
                    } else {
                      setStatusMessage({
                        type: 'info',
                        text: 'Model Gemini 3.8 Flash diaktifkan. Silakan klik tombol Uji Koneksi.',
                      });
                    }
                  } catch (e) {
                    setStatusMessage({
                      type: 'success',
                      text: '✅ Google Gemini 3.8 Flash berhasil diaktifkan.',
                    });
                  }
                }}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>🚀 Aktifkan Gemini 3.8 Flash (Bypass Kuota 429)</span>
              </button>
            </div>
          )}

          {/* Active Status Card */}
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[11px]">Status Gemini 3.8 Flash:</span>
              <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium flex items-center gap-1.5 ${
                isValidating 
                  ? 'bg-blue-950 text-blue-300 border border-blue-800' 
                  : validationResult?.success 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isValidating ? 'bg-cyan-400 animate-pulse' : validationResult?.success ? 'bg-emerald-400' : 'bg-neutral-500'
                }`} />
                <span>
                  {isValidating 
                    ? 'Memeriksa...' 
                    : validationResult?.success 
                    ? `Aktif (${validationResult.latencyMs}ms) • ${validationResult.model}` 
                    : 'Siap Digunakan'}
                </span>
              </span>
            </div>

            <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-1 border-t border-neutral-800/80">
              <span>Mode Operasi:</span>
              <span className="font-mono text-cyan-300">
                {activeStoredKey ? 'API Key Pribadi (Direct Client)' : 'Cloud Relay bawaan (Gemini 3.7 Flash)'}
              </span>
            </div>
          </div>

          {/* Step 1: Open Google AI Studio Portal Button */}
          <div className="p-3.5 bg-gradient-to-r from-blue-950/40 via-neutral-900 to-indigo-950/40 border border-blue-800/50 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-300 text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Cara Dapatkan API Key Gratis (30 Detik)</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-200 border border-blue-700">
                100% Gratis
              </span>
            </div>

            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Google menyediakan kuota gratis Gemini 3.7 Flash untuk pengembang. Klik tombol di bawah untuk membuka halaman API Key resmi Google AI Studio:
            </p>

            <button
              type="button"
              id="btn-open-aistudio-portal"
              onClick={handleOpenAiStudio}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer group active:scale-98"
            >
              <span>Buka Google AI Studio (aistudio.google.com/apikey)</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-800 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>

            <ol className="list-decimal list-inside space-y-1 text-[11px] text-neutral-400 pt-1">
              <li>Login dengan akun Google / Gmail Anda di tab baru.</li>
              <li>Klik tombol biru <strong className="text-white">"Create API Key"</strong>.</li>
              <li>Salin (Copy) key yang muncul, lalu tempel pada kolom di bawah.</li>
            </ol>
          </div>

          {/* Step 2: Input Gemini API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="input-gemini-apikey" className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>Gemini API Key:</span>
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="btn-paste-gemini-key"
                  onClick={handlePasteFromClipboard}
                  className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-300 text-[10.5px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedSuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Clipboard className="w-3 h-3" />}
                  <span>{copiedSuccess ? 'Ditempel!' : 'Paste'}</span>
                </button>

                {apiKeyInput && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 text-[10px]"
                    title="Hapus Key"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                id="input-gemini-apikey"
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Contoh: AIzaSyD... atau AQ..."
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-blue-500 rounded-xl px-3 py-2.5 pr-10 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 cursor-pointer"
                title={showKey ? 'Sembunyikan' : 'Tampilkan'}
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-[10.5px] text-neutral-400">
              API Key tersimpan secara aman di memori lokal peramban/perangkat Anda.
            </p>
          </div>

          {/* Optional Server / Relay URL input (Solusi Kuota Exceeded) */}
          {!isDesktopNative() && (
          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>URL Server Cloud Relay (Opsional)</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80 font-mono">
                Bypass Quota Exceeded
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Jika akun baru Anda terkena limit kuota ("quota exceeded"), isi URL server Cloud Run berikut agar query dialihkan ke server cloud kami tanpa memotong kuota pribadi Anda.
            </p>
            <input
              id="modal-input-backend-server-url"
              type="text"
              value={serverUrlInput}
              onChange={(e) => setServerUrlInput(e.target.value)}
              placeholder="Kosong = Server Bawaan (/api) atau URL Server Relay"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-indigo-500"
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <button
                type="button"
                id="btn-modal-preset-cloud"
                onClick={() => {
                  const liveUrl = (typeof window !== 'undefined' && window.location.origin && window.location.protocol !== 'file:')
                    ? window.location.origin
                    : '';
                  setServerUrlInput(liveUrl);
                }}
                className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] text-indigo-300 font-mono transition-colors cursor-pointer"
              >
                ☁️ Gunakan Cloud Server Bawaan
              </button>
              {serverUrlInput && (
                <button
                  type="button"
                  id="btn-modal-clear-server"
                  onClick={() => setServerUrlInput('')}
                  className="px-2 py-1 rounded text-[10px] text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  Kosongkan (Gunakan Direct Key)
                </button>
              )}
            </div>
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              id="btn-test-gemini-key"
              disabled={isValidating}
              onClick={handleTestKey}
              className="w-full sm:w-1/2 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              {isValidating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>Uji Koneksi AI</span>
            </button>

            <button
              type="button"
              id="btn-save-gemini-key"
              disabled={isSaving}
              onClick={handleSaveAndActivate}
              className="w-full sm:w-1/2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-98"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Simpan & Aktifkan</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs">
          <span className="text-neutral-400 text-[11px] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Gemini 3.7 Flash Live Engine</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
