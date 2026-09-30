import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  Laptop, 
  Cable, 
  Radio, 
  Usb,
  ChevronRight
} from 'lucide-react';

function checkBrowserHardwareCaps() {
  const hasWebSerial = typeof navigator !== 'undefined' && 'serial' in navigator;
  const hasWebBluetooth = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const isDesktopNative = typeof window !== 'undefined' && Boolean((window as any).DesktopNative?.isDesktopNative);
  return { hasWebSerial, hasWebBluetooth, isDesktopNative };
}

export interface PhysicalSerialPort {
  id: string;
  path: string;
  name: string;
  manufacturer?: string;
  vendorId?: string;
  productId?: string;
  chipType?: string;
}

interface SerialPortPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPort: (port: { path: string; name: string; chipType?: string }) => void;
  baudRate?: number;
}

export const SerialPortPickerModal: React.FC<SerialPortPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectPort,
  baudRate = 9600,
}) => {
  const [detectedPorts, setDetectedPorts] = useState<PhysicalSerialPort[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [selectedPortId, setSelectedPortId] = useState<string | null>(null);
  const [customPortPath, setCustomPortPath] = useState<string>('');

  const caps = checkBrowserHardwareCaps();
  const isMac = typeof navigator !== 'undefined' && (
    /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent || '') || 
    (navigator as any).userAgentData?.platform === 'macOS' ||
    navigator.platform?.toUpperCase().includes('MAC') ||
    (typeof window !== 'undefined' && ((window as any).DesktopNative?.platform === 'darwin' || (window as any).desktopNative?.platform === 'darwin'))
  );

  // Identify chip model and user-friendly name from path / VID / PID
  const getChipDetails = (path: string, manufacturer?: string, vid?: string, pid?: string) => {
    const p = (path || '').toLowerCase();
    const m = (manufacturer || '').toLowerCase();
    const v = (vid || '').toUpperCase();

    if (p.includes('slab') || p.includes('cp210') || m.includes('silicon labs') || v === '10C4') {
      return { chip: 'Silicon Labs CP2102/CP2102N', brand: 'Cisco / Juniper / Arista USB Console', color: 'text-emerald-400' };
    }
    if (p.includes('wch') || p.includes('ch340') || p.includes('ch341') || m.includes('wch') || v === '1A86') {
      return { chip: 'WCH CH340 / CH341', brand: 'Standard USB-RS232 Cable', color: 'text-cyan-400' };
    }
    if (p.includes('ftdi') || p.includes('ft232') || m.includes('ftdi') || v === '0403') {
      return { chip: 'FTDI FT232R USB-UART', brand: 'Enterprise Industrial Console', color: 'text-blue-400' };
    }
    if (p.includes('pl2303') || p.includes('prolific') || m.includes('prolific') || v === '067B') {
      return { chip: 'Prolific PL2303', brand: 'Serial RS232 DB9', color: 'text-amber-400' };
    }
    if (p.includes('bluetooth') || p.includes('bt578') || p.includes('irxon')) {
      return { chip: 'IRXON / Bluetooth SPP', brand: 'Wireless Bluetooth SPP (/dev/cu.*)', color: 'text-indigo-400' };
    }
    return { chip: manufacturer || 'USB-to-Serial Console Port', brand: isMac ? 'macOS Physical Serial Port (/dev/cu.*)' : 'COM Serial Port', color: 'text-neutral-300' };
  };

  // Scan real physical serial ports from Desktop Native / Web Serial
  const scanPhysicalPorts = async (showSpinner = true) => {
    if (showSpinner) setIsScanning(true);
    setErrorMessage('');
    const portsList: PhysicalSerialPort[] = [];
    const seenPaths = new Set<string>();

    try {
      // 1. Desktop Native Electron (macOS .dmg / Windows .exe)
      const desktopFn = (window as any).DesktopNative?.listSerialPorts || (window as any).desktopNative?.listSerialPorts;
      if (typeof window !== 'undefined' && typeof desktopFn === 'function') {
        try {
          const res = await desktopFn();
          if (res && res.success && Array.isArray(res.ports)) {
            res.ports.forEach((p: any, idx: number) => {
              let pPath = String(p.path || p || '').trim();
              if (!pPath) return;

              
              
              if (!seenPaths.has(pPath)) {
                seenPaths.add(pPath);
                const info = getChipDetails(pPath, p.manufacturer, p.vendorId, p.productId);
                portsList.push({
                  id: `native-port-${idx}-${pPath}`,
                  path: pPath,
                  name: p.friendlyName ? p.friendlyName : pPath,
                  manufacturer: p.manufacturer || info.chip,
                  vendorId: p.vendorId,
                  productId: p.productId,
                  chipType: info.chip,
                });
              }
            });
          }
        } catch (e: any) {
          console.warn('Desktop native listSerialPorts error:', e);
        }
      }

      // 2. Web Serial API Granted Ports (Browser / Chromium)
      // Only query browser permissions if NOT running in Desktop Native Electron
      // (Desktop Native provides the real operating system hardware device nodes directly)
      if (!caps.isDesktopNative && typeof navigator !== 'undefined' && 'serial' in navigator && typeof (navigator as any).serial.getPorts === 'function') {
        try {
          const granted = await (navigator as any).serial.getPorts();
          if (Array.isArray(granted)) {
            granted.forEach((portObj: any, idx: number) => {
              const info = portObj.getInfo ? portObj.getInfo() : {};
              const vid = info.usbVendorId ? info.usbVendorId.toString(16).padStart(4, '0').toUpperCase() : '';
              const pid = info.usbProductId ? info.usbProductId.toString(16).padStart(4, '0').toUpperCase() : '';
              // Only add real granted hardware devices that have actual USB vendor/product IDs
              if (!vid && !pid) return;

              const chipDetails = getChipDetails('', '', vid, pid);
              const pathName = isMac ? `/dev/cu.usb-device-${vid}` : `COM${idx + 3}`;
              if (!seenPaths.has(pathName)) {
                seenPaths.add(pathName);
                portsList.push({
                  id: `web-serial-port-${idx}`,
                  path: pathName,
                  name: `${chipDetails.chip} (USB VID:${vid} PID:${pid})`,
                  manufacturer: chipDetails.chip,
                  vendorId: vid,
                  productId: pid,
                  chipType: chipDetails.chip,
                });
              }
            });
          }
        } catch (e) {
          console.warn('Web Serial getPorts notice:', e);
        }
      }

      setDetectedPorts(portsList);
      if (portsList.length === 0) {
        if (isMac) {
          setErrorMessage('Belum ada perangkat serial atau Bluetooth SPP aktif di /dev/cu.*. Pastikan IRXON/kabel terpasang, lalu klik Segarkan.');
        } else {
          setErrorMessage('Belum ada port COM serial fisik yang terdeteksi. Hubungkan kabel USB-to-Serial ke komputer Anda.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memindai port serial.');
    } finally {
      if (showSpinner) setIsScanning(false);
    }
  };

  // Safe handler to normalize any port selection to /dev/cu.* on macOS
  const handleSelectSafePort = (rawPath: string, displayName?: string, chipType?: string) => {
    let cleanPath = String(rawPath || '').trim();
    const details = getChipDetails(cleanPath);
    onSelectPort({
      path: cleanPath,
      name: displayName || `${details.chip} (${cleanPath})`,
      chipType: chipType || details.chip,
    });
    onClose();
  };

  // Trigger Native Browser Web Serial requestPort (Shows Browser Native Popup)
  const handleOpenBrowserNativeSerialPrompt = async () => {
    setIsScanning(true);
    setErrorMessage('');
    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API memerlukan Google Chrome / Edge atau aplikasi Desktop Native.');
      }

      const portObj = await (navigator as any).serial.requestPort();
      const info = portObj.getInfo ? portObj.getInfo() : {};
      const vid = info.usbVendorId ? info.usbVendorId.toString(16).padStart(4, '0').toUpperCase() : '';
      const pid = info.usbProductId ? info.usbProductId.toString(16).padStart(4, '0').toUpperCase() : '';
      const chipDetails = getChipDetails('', '', vid, pid);
      const friendlyPath = isMac ? `/dev/cu.usb-device` : `COM3 (${chipDetails.chip})`;
      const displayName = `${chipDetails.chip} (${friendlyPath})`;

      handleSelectSafePort(friendlyPath, displayName, chipDetails.chip);
    } catch (err: any) {
      if (err.name !== 'NotFoundError' && !err.message?.includes('cancelled') && !err.message?.includes('dibatalkan')) {
        setErrorMessage(err.message || 'Gagal memilih port serial.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      scanPhysicalPorts(true);
      // Real-time automatic hardware port polling every 2.5 seconds while modal is open
      const pollTimer = setInterval(() => {
        scanPhysicalPorts(false);
      }, 2500);
      return () => clearInterval(pollTimer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Usb className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Pilih Port COM Fisik (Serial Cable)</h3>
              <p className="text-[11px] text-neutral-400">
                Pilih port hardware adapter USB-UART / RS232 yang terhubung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Quick Trigger Button for Browser Chrome/Edge Native Popup */}
          {'serial' in navigator && (
            <button
              type="button"
              onClick={handleOpenBrowserNativeSerialPrompt}
              className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 transition-all cursor-pointer active:scale-98"
            >
              <Cable className="w-4 h-4" />
              <span>Buka Pop-up Pemilihan Perangkat Sistem (Browser / OS)</span>
            </button>
          )}

          {/* Scanned Hardware List Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-semibold text-neutral-200">
                Port Hardware Terdeteksi ({detectedPorts.length}):
              </span>
              <button
                type="button"
                onClick={() => scanPhysicalPorts(true)}
                disabled={isScanning}
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px] font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                <span>Segarkan Port</span>
              </button>
            </div>

            {detectedPorts.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {detectedPorts.map((port) => {
                  const details = getChipDetails(port.path, port.manufacturer, port.vendorId, port.productId);
                  const isSelected = selectedPortId === port.id;

                  return (
                    <div
                      key={port.id}
                      onClick={() => setSelectedPortId(port.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-blue-950/60 border-blue-500 ring-1 ring-blue-500/50 shadow-md' 
                          : 'bg-neutral-950 hover:bg-neutral-800/80 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0 border ${isSelected ? 'border-blue-500/50 text-blue-400' : 'border-neutral-800 text-neutral-400'}`}>
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-white text-xs font-bold font-mono truncate">{port.path}</h4>
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 shrink-0 font-sans">
                              Hardware Aktif
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate">{details.chip}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{details.brand}</p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSafePort(port.path, `${details.chip} (${port.path})`, details.chip);
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow"
                        >
                          <span>Pilih</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 bg-neutral-950 rounded-xl border border-neutral-800 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-neutral-900 flex items-center justify-center text-neutral-500">
                  <Cable className="w-6 h-6 animate-pulse text-blue-400" />
                </div>
                <h4 className="text-white font-medium text-xs">Belum ada port serial terdeteksi</h4>
                <p className="text-neutral-400 text-[11px] max-w-xs mx-auto">
                  Hubungkan kabel USB Console / FTDI / CP2102 ke laptop, lalu klik Segarkan Port atau buka Pop-up Sistem di atas.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Direct / Manual Custom Port Input & macOS Presets */}
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300">
                  {isMac ? 'Koneksi Manual / Preset macOS (/dev/cu.*):' : 'Koneksi Port Manual (COM / Path):'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPortPath}
                  onChange={(e) => setCustomPortPath(e.target.value)}
                  placeholder={isMac ? '/dev/cu.BT578_BLE_A7C5 atau /dev/cu.usbserial' : 'COM3 atau COM1'}
                  className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  disabled={!customPortPath.trim()}
                  onClick={() => {
                    const trimmed = customPortPath.trim();
                    if (!trimmed) return;
                    handleSelectSafePort(trimmed);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow"
                >
                  Gunakan
                </button>
              </div>

              {/* Quick Clickable Presets for macOS */}
              {isMac && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    '/dev/cu.usbserial',
                    '/dev/cu.SLAB_USBtoUART',
                    '/dev/cu.wchusbserial',
                    '/dev/cu.BT578',
                    '/dev/cu.Bluetooth-Incoming-Port',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCustomPortPath(preset)}
                      className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] font-mono transition-colors border border-neutral-700"
                    >
                      {preset.replace('/dev/', '')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">
            {isMac ? 'Mode: macOS Direct Device Binding (/dev/cu.*)' : 'Mode: Physical COM Serial Binding'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
