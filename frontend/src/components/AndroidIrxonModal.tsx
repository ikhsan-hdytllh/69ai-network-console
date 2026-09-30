import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Bluetooth, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  HelpCircle, 
  RefreshCw, 
  Radio, 
  Cable, 
  Server,
  Zap,
  Info
} from 'lucide-react';
import { checkBrowserHardwareCaps, BrowserHardwareCaps } from '../services/serialConnection';

interface AndroidIrxonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTelnetBridge?: () => void;
  onOpenIrxonAt?: () => void;
}

export const AndroidIrxonModal: React.FC<AndroidIrxonModalProps> = ({
  isOpen,
  onClose,
  onSelectTelnetBridge,
  onOpenIrxonAt,
}) => {
  const [caps, setCaps] = useState<BrowserHardwareCaps>(checkBrowserHardwareCaps());
  const [isTestingBt, setIsTestingBt] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });

  useEffect(() => {
    if (isOpen) {
      setCaps(checkBrowserHardwareCaps());
      setTestResult({ status: 'idle', message: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestBluetooth = async () => {
    setIsTestingBt(true);
    setTestResult({ status: 'idle', message: 'Membuka dialog pencarian Bluetooth Android...' });

    try {
      if (!('bluetooth' in navigator)) {
        throw new Error('Web Bluetooth API tidak tersedia di browser ini. Gunakan Google Chrome atau Microsoft Edge untuk Android.');
      }

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000fee7-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        ],
      });

      setTestResult({
        status: 'success',
        message: `[BERHASIL] Perangkat Bluetooth terdeteksi: "${device.name || 'Unknown Device'}" (ID: ${device.id.slice(0, 10)}...). Web Bluetooth BLE di Android Anda berfungsi dengan normal!`,
      });
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        setTestResult({
          status: 'error',
          message: 'Pencarian dibatalkan atau perangkat IRXON tidak ditemukan di daftar pop-up. Pastikan GPS/Lokasi HP Android menyala dan IRXON dalam mode pairing.',
        });
      } else if (err.name === 'SecurityError' || err.message?.includes('permissions policy')) {
        setTestResult({
          status: 'error',
          message: 'Izin Bluetooth dibatasi di dalam iframe preview. Silakan klik tombol "Buka di Tab Baru" di atas untuk menjalankannya.',
        });
      } else {
        setTestResult({
          status: 'error',
          message: `Error pengujian: ${err.message || 'Gagal mengakses Bluetooth'}`,
        });
      }
    } finally {
      setIsTestingBt(false);
    }
  };

  const handleOpenStandalone = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-950/60 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Diagnosa & Panduan IRXON Bluetooth di Android
              </h2>
              <p className="text-xs text-slate-400">
                Solusi lengkap menghubungkan adapter IRXON BT578/BT580 dari browser Android
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Iframe Warning if inside preview */}
          {caps.isIframe && (
            <div className="p-3 bg-amber-950/40 border border-amber-600/50 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <div className="font-semibold text-amber-200 text-xs sm:text-sm">
                  Aplikasi Berjalan di Dalam Frame Pratinjau (Iframe Sandbox)
                </div>
                <p className="text-xs text-amber-300/80">
                  Browser Android memblokir akses perangkat keras (Bluetooth & Serial) jika halaman dibuka di dalam frame pratinjau. Buka di tab baru agar browser dapat membuka pop-up pairing.
                </p>
                <button
                  type="button"
                  onClick={handleOpenStandalone}
                  className="mt-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Buka di Tab Baru (Standalone Mode)
                </button>
              </div>
            </div>
          )}

          {/* Browser Hardware Capabilities Grid */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-400" />
                Status Kompatibilitas Browser HP Anda:
              </span>
              <button
                type="button"
                onClick={() => setCaps(checkBrowserHardwareCaps())}
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">OS HP</span>
                <span className={caps.isAndroid ? 'text-emerald-400 font-bold' : 'text-slate-200'}>
                  {caps.isAndroid ? 'Android OS' : 'Desktop / iOS'}
                </span>
              </div>

              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Web Bluetooth</span>
                <span className={caps.hasWebBluetooth ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                  {caps.hasWebBluetooth ? '✓ Didukung' : '✕ Tidak Ada'}
                </span>
              </div>

              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">HTTPS / Secure</span>
                <span className={caps.isSecureContext ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                  {caps.isSecureContext ? '✓ HTTPS Aktif' : '✕ Insecure'}
                </span>
              </div>

              <div className="p-2 bg-slate-900 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">WebUSB / OTG</span>
                <span className={caps.hasWebUsb ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {caps.hasWebUsb ? '✓ Didukung' : '✕ Tidak Ada'}
                </span>
              </div>
            </div>
          </div>

          {/* Direct Bluetooth BLE Test Button */}
          <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-blue-400" />
                Uji Coba Langsung Scan Bluetooth BLE:
              </span>
              <button
                type="button"
                onClick={handleTestBluetooth}
                disabled={isTestingBt}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                {isTestingBt ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memindai...
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-3.5 h-3.5" /> Pindai IRXON BLE Sekarang
                  </>
                )}
              </button>
            </div>

            {testResult.message && (
              <div
                className={`p-2.5 rounded font-mono text-xs ${
                  testResult.status === 'success'
                    ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-200'
                    : testResult.status === 'error'
                    ? 'bg-rose-950/60 border border-rose-700/60 text-rose-200'
                    : 'bg-slate-900 border border-slate-800 text-slate-300'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>

          {/* The 2 Essential Explanations for IRXON on Android */}
          <div className="space-y-3 pt-1">
            <h3 className="font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Mengapa IRXON Normal di Aplikasi Lain, Tapi Belum Terkoneksi di Browser?
            </h3>

            {/* Explanation 1: Classic SPP vs BLE */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                <span>1. Perbedaan Bluetooth Classic (SPP) vs Bluetooth Low Energy (BLE)</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Aplikasi Android native (seperti <em>Serial USB Terminal</em> atau <em>BlueSerial</em>) menggunakan API Java internal Android yang mendukung <strong>Bluetooth Classic 2.1 RFCOMM (SPP)</strong>.
              </p>
              <p className="text-slate-300 text-xs leading-relaxed">
                Sedangkan standar dunia Web Browser (Chrome & Edge di semua HP) <strong>hanya mengizinkan Bluetooth Low Energy (BLE GATT)</strong>. Jika adapter Anda adalah <strong>IRXON BT578 V2/V3 Classic</strong>, browser tidak dapat membuka socket RFCOMM secara langsung tanpa jembatan (bridge).
              </p>
            </div>

            {/* Solution Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Solution A: Local Telnet/TCP Bridge */}
              <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-lg space-y-2 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5 mb-1">
                    <Server className="w-4 h-4 text-emerald-400" />
                    Solusi A: Local TCP Bridge (Paling Direkomendasikan)
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Karena IRXON Anda sudah normal terhubung di aplikasi Android (seperti <em>Serial USB Terminal</em>):
                  </p>
                  <ol className="list-decimal list-inside text-slate-400 text-xs space-y-1 mt-1.5">
                    <li>Buka menu Settings aplikasi tersebut, aktifkan <strong>"TCP Server"</strong> (port contoh: <code>8080</code> atau <code>2323</code>).</li>
                    <li>Di aplikasi 69 AI ini, pilih jenis koneksi <strong>Telnet / TCP</strong>.</li>
                    <li>Isi Host <code>127.0.0.1</code> dan Port <code>8080</code>.</li>
                  </ol>
                </div>
                {onSelectTelnetBridge && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectTelnetBridge();
                    }}
                    className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5" /> Buat Koneksi Telnet/TCP Localhost
                  </button>
                )}
              </div>

              {/* Solution B: USB-C OTG Direct Cable */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2 flex flex-col justify-between">
                <div>
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                    <Cable className="w-4 h-4 text-amber-400" />
                    Solusi B: Kabel USB-C OTG Direct
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Hubungkan port USB IRXON atau kabel Cisco Console (RJ45-to-USB) langsung ke port USB-C HP Android Anda menggunakan converter OTG.
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    Gunakan browser <strong>Kiwi Browser</strong> atau <strong>Chrome</strong> dengan flag <code>#enable-experimental-web-platform-features</code> untuk serial USB langsung.
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist for IRXON BLE */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Checklist Jika Menggunakan IRXON BT578-BLE / BT580:
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Pastikan <strong>GPS / Lokasi HP</strong> aktif (Syarat mutlak OS Android untuk scan BLE di browser).</li>
                <li>Pastikan Bluetooth HP aktif dan IRXON tidak sedang terhubung ke perangkat HP lain.</li>
                <li>Buka web di Google Chrome atau Microsoft Edge di tab utama.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenStandalone}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
            </button>
            {onOpenIrxonAt && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenIrxonAt();
                }}
                className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Buka Menu IRXON AT Command</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
