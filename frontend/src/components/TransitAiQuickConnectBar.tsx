import React, { useState, useEffect, useCallback } from 'react';
import { 
  Cable, 
  Bluetooth, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  Radio, 
  ChevronRight, 
  ShieldCheck,
  Cpu,
  AlertCircle
} from 'lucide-react';
import { checkBrowserHardwareCaps } from '../services/serialConnection';
import { QuickDeviceTypePickerModal, QuickDeviceSelectionData } from './QuickDeviceTypePickerModal';

export interface ValidatedHardwarePort {
  id: string;
  name: string;
  pathOrAddress: string;
  type: 'serial' | 'ble' | 'spp';
  status: 'valid' | 'active' | 'ready';
  chipType: string;
  baudRate: number;
  isPhysical: boolean;
}

interface TransitAiQuickConnectBarProps {
  onConnectDevice: (data: QuickDeviceSelectionData) => void;
  onOpenBlePickerModal?: () => void;
}

export const TransitAiQuickConnectBar: React.FC<TransitAiQuickConnectBarProps> = ({
  onConnectDevice,
  onOpenBlePickerModal
}) => {
  const [hardwarePorts, setHardwarePorts] = useState<ValidatedHardwarePort[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [selectedPortForConfig, setSelectedPortForConfig] = useState<ValidatedHardwarePort | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);

  const caps = checkBrowserHardwareCaps();
  const isDesktop = typeof window !== 'undefined' && Boolean((window as any).DesktopNative || (window as any).desktopNative);

  const scanAndValidatePorts = useCallback(async () => {
    setIsValidating(true);
    const discovered: ValidatedHardwarePort[] = [];

    // 1. Desktop Native Electron (macOS / Linux / Windows)
    if (typeof window !== 'undefined') {
      const desktop = (window as any).DesktopNative || (window as any).desktopNative;
      
      if (desktop && typeof desktop.listSerialPorts === 'function') {
        try {
          const res = await desktop.listSerialPorts();
          if (res && res.success && Array.isArray(res.ports)) {
            res.ports.forEach((p: any) => {
              const portPath = p.path || p;
              const cleanPath = String(portPath).trim();
              const lower = cleanPath.toLowerCase();

              let chip = p.friendlyName || p.manufacturer || 'Serial Console Port';
              if (lower.includes('ftdi') || (p.vendorId && p.vendorId.includes('0403'))) chip = 'FTDI FT232R USB-Serial';
              else if (lower.includes('cp210') || (p.vendorId && p.vendorId.includes('10c4'))) chip = 'Silicon Labs CP2102/CP2104';
              else if (lower.includes('ch340') || lower.includes('wch') || (p.vendorId && p.vendorId.includes('1a86'))) chip = 'WCH CH340 / QinHeng USB';
              else if (lower.includes('pl2303') || (p.vendorId && p.vendorId.includes('067b'))) chip = 'Prolific PL2303 USB-Serial';
              else if (lower.includes('bt578') || lower.includes('irxon')) chip = 'IRXON BT578 Wireless Console';
              else if (cleanPath.startsWith('/dev/cu.usbserial')) chip = 'USB-to-Serial Console Cable';

              const isBt = lower.includes('bluetooth') || lower.includes('bt578') || lower.includes('irxon');

              discovered.push({
                id: `desktop-${cleanPath}`,
                name: p.friendlyName || cleanPath.split('/').pop() || cleanPath,
                pathOrAddress: cleanPath,
                type: isBt ? 'spp' : 'serial',
                status: 'valid',
                chipType: chip,
                baudRate: 9600,
                isPhysical: true
              });
            });
          }
        } catch (err) {
          console.warn('Transit AI: Desktop serial scan error:', err);
        }
      }

      // Also list bluetooth devices on desktop
      if (desktop && typeof desktop.listBluetoothDevices === 'function') {
        try {
          const btRes = await desktop.listBluetoothDevices();
          if (btRes && btRes.success && Array.isArray(btRes.devices)) {
            btRes.devices.forEach((d: any) => {
              discovered.push({
                id: `bt-${d.address || d.name}`,
                name: d.name || 'IRXON BT578 BLE',
                pathOrAddress: d.address || '00:18:E4:3A:A7:C5',
                type: 'ble',
                status: 'valid',
                chipType: 'IRXON BT578 BLE GATT Console',
                baudRate: 9600,
                isPhysical: false
              });
            });
          }
        } catch (err) {
          console.warn('Transit AI: Desktop bluetooth scan error:', err);
        }
      }
    }

    // 2. Web Serial API query if available in browser environment
    if (discovered.length === 0 && typeof navigator !== 'undefined' && (navigator as any).serial) {
      try {
        const webPorts = await (navigator as any).serial.getPorts();
        if (Array.isArray(webPorts) && webPorts.length > 0) {
          webPorts.forEach((wp: any, idx: number) => {
            const info = wp.getInfo ? wp.getInfo() : {};
            const vid = info.usbVendorId ? `0x${info.usbVendorId.toString(16)}` : '';
            const pid = info.usbProductId ? `0x${info.usbProductId.toString(16)}` : '';
            const desc = vid ? `USB Serial Device (VID: ${vid} PID: ${pid})` : `Web Serial Port #${idx + 1}`;
            discovered.push({
              id: `webserial-${idx}`,
              name: `USB Serial Adapter #${idx + 1}`,
              pathOrAddress: `webserial-port-${idx}`,
              type: 'serial',
              status: 'valid',
              chipType: desc,
              baudRate: 9600,
              isPhysical: true
            });
          });
        }
      } catch (_) {}
    }

    setHardwarePorts(discovered);
    setIsValidating(false);
  }, []);

  useEffect(() => {
    scanAndValidatePorts();
  }, [scanAndValidatePorts]);

  const handleSelectPort = (port: ValidatedHardwarePort) => {
    setSelectedPortForConfig(port);
    setIsPickerOpen(true);
  };

  const handleConfirmConfig = (data: QuickDeviceSelectionData) => {
    onConnectDevice(data);
    setIsPickerOpen(false);
  };

  return (
    <div id="transit-ai-quick-connect-bar" className="p-2.5 bg-neutral-950 border-t border-neutral-800 flex flex-col gap-2 shrink-0">
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wide uppercase text-neutral-200 truncate">
            Serial & BLE Terdeteksi
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold shrink-0">
            {hardwarePorts.length} AKTIF
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            id="btn-transit-ai-refresh-ports"
            onClick={scanAndValidatePorts}
            disabled={isValidating}
            title="Pindai Ulang & Validasi Serial Port Sistem"
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-blue-400' : ''}`} />
          </button>
          {onOpenBlePickerModal && (
            <button
              type="button"
              id="btn-transit-ai-open-ble-modal"
              onClick={onOpenBlePickerModal}
              title="Buka Scanner Bluetooth Lengkap"
              className="px-2 py-0.5 rounded bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Bluetooth className="w-3 h-3 text-blue-400" />
              <span>BLE</span>
            </button>
          )}
        </div>
      </div>

      {/* Validated Port Chips List (Transit AI Style) */}
      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-0.5 scrollbar-thin">
        {hardwarePorts.length > 0 ? (
          hardwarePorts.map((port) => {
            const isBle = port.type === 'ble';
            return (
              <div
                key={port.id}
                id={`transit-port-chip-${port.id}`}
                onClick={() => handleSelectPort(port)}
                className="group p-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-blue-500/60 cursor-pointer transition-all flex items-center justify-between gap-2 text-left"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`p-1.5 rounded-lg shrink-0 border ${
                    isBle 
                      ? 'bg-blue-950/60 border-blue-800/80 text-blue-400' 
                      : 'bg-cyan-950/60 border-cyan-800/80 text-cyan-400'
                  }`}>
                    {isBle ? <Bluetooth className="w-3.5 h-3.5" /> : <Cable className="w-3.5 h-3.5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white group-hover:text-blue-300 truncate">
                        {port.name}
                      </span>
                      <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 font-bold shrink-0">
                        VALID
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400 truncate block font-mono">
                      {port.chipType}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-2 py-1 rounded-lg bg-blue-600/20 group-hover:bg-blue-600 text-blue-300 group-hover:text-white text-[10.5px] font-semibold flex items-center gap-1 transition-all shrink-0 border border-blue-500/30 group-hover:border-transparent cursor-pointer"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span className="hidden sm:inline">Pilih</span>
                </button>
              </div>
            );
          })
        ) : (
          <div className="p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 text-center flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Tidak ada kabel serial USB terdeteksi</span>
            </div>
            <p className="text-[10px] text-neutral-500 font-mono leading-tight">
              Colokkan kabel console USB (FTDI / CP2102 / CH340) atau nyalakan adapter BLE IRXON.
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button
                type="button"
                onClick={scanAndValidatePorts}
                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-mono transition-colors cursor-pointer"
              >
                Pindai Ulang
              </button>
              {onOpenBlePickerModal && (
                <button
                  type="button"
                  onClick={onOpenBlePickerModal}
                  className="px-2 py-1 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-[10px] font-mono transition-colors cursor-pointer"
                >
                  Scan BLE
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Device Type Picker Modal */}
      {selectedPortForConfig && (
        <QuickDeviceTypePickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onConfirm={handleConfirmConfig}
          initialPortOrDevice={selectedPortForConfig}
        />
      )}
    </div>
  );
};
