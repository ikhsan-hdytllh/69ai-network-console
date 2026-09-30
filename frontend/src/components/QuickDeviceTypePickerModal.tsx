import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Cpu, 
  Cable, 
  Bluetooth, 
  Terminal, 
  Layers, 
  Zap, 
  ChevronRight,
  ShieldCheck,
  Server,
  Radio
} from 'lucide-react';
import { DeviceBrand, DeviceProfile, ConnectionType } from '../types';
import { getUnifiedBrandCatalog } from '../services/dbStorage';

export interface QuickDeviceSelectionData {
  name: string;
  brand: DeviceBrand;
  model: string;
  type: ConnectionType;
  baudRate: number;
  ipOrPortLabel: string;
  serialPortPath?: string;
  bluetoothName?: string;
  bluetoothAddress?: string;
}

interface QuickDeviceTypePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: QuickDeviceSelectionData) => void;
  initialPortOrDevice?: {
    name: string;
    pathOrAddress: string;
    type?: 'serial' | 'ble' | 'spp';
    chipType?: string;
  } | null;
}

interface VendorPreset {
  id: DeviceBrand;
  name: string;
  category: string;
  defaultBaud: number;
  models: string[];
  color: string;
  badge: string;
  iconType: 'cisco' | 'mikrotik' | 'huawei' | 'fortinet' | 'juniper' | 'linux' | 'alliedtelesis' | 'generic';
}

const VENDOR_PRESETS: VendorPreset[] = [
  {
    id: 'cisco',
    name: 'Cisco Systems',
    category: 'Catalyst Switch / ISR Router / Nexus',
    defaultBaud: 9600,
    models: ['Catalyst 9300 / 9200', 'Catalyst 2960-X / 3850', 'ISR 4300 / 4400', 'Nexus 9000 / 3000', 'Cisco Generic IOS/IOS-XE'],
    color: 'border-blue-500/50 bg-blue-950/30 text-blue-300',
    badge: 'CISCO IOS/XE',
    iconType: 'cisco'
  },
  {
    id: 'alliedtelesis',
    name: 'Allied Telesis',
    category: 'AW+ Switch (x-Series) / AR Router / TQ AP',
    defaultBaud: 9600,
    models: ['x950 / x930 / x530 / x510 / x230 Switch (AW+)', 'CentreCOM GS980MX / GS950 Series', 'AR4050S / AR3050S / AR2050V UTM Router', 'TQ6702e / TQ6602 / TQ5403 Wireless AP (AWC)'],
    color: 'border-sky-500/50 bg-sky-950/30 text-sky-300',
    badge: 'ALLIEDWARE+',
    iconType: 'alliedtelesis'
  },
  {
    id: 'mikrotik',
    name: 'MikroTik',
    category: 'RouterBOARD / Cloud Core (CCR/CRS)',
    defaultBaud: 115200,
    models: ['CCR2004 / CCR2116', 'RB5009 / RB4011', 'CRS326 / CRS328 Cloud Switch', 'hAP ax / ac Series', 'MikroTik RouterOS v7'],
    color: 'border-rose-500/50 bg-rose-950/30 text-rose-300',
    badge: 'ROUTEROS',
    iconType: 'mikrotik'
  },
  {
    id: 'huawei',
    name: 'Huawei Enterprise',
    category: 'CloudEngine / Quidway VRP',
    defaultBaud: 9600,
    models: ['CloudEngine S5700 / S6700', 'NetEngine AR6000 Router', 'USG6000 Next-Gen Firewall', 'Huawei VRP Generic'],
    color: 'border-red-500/50 bg-red-950/30 text-red-300',
    badge: 'VRP CORE',
    iconType: 'huawei'
  },
  {
    id: 'fortinet',
    name: 'Fortinet FortiGate',
    category: 'Next-Gen Firewall / FortiSwitch',
    defaultBaud: 9600,
    models: ['FortiGate 100F / 60F', 'FortiGate 200F / 400F', 'FortiSwitch 124E / 448E', 'FortiOS 7.x Appliance'],
    color: 'border-red-600/50 bg-red-950/30 text-red-400',
    badge: 'FORTIOS',
    iconType: 'fortinet'
  },
  {
    id: 'juniper',
    name: 'Juniper Networks',
    category: 'EX Series Switch / SRX Gateway / MX',
    defaultBaud: 9600,
    models: ['EX4400 / EX3400 Switch', 'SRX300 / SRX380 Security Gateway', 'MX204 / MX10003 Router', 'Junos OS Generic'],
    color: 'border-teal-500/50 bg-teal-950/30 text-teal-300',
    badge: 'JUNOS OS',
    iconType: 'juniper'
  },
  {
    id: 'linux',
    name: 'Linux / Unix Server',
    category: 'Ubuntu / Debian / CentOS / Embedded',
    defaultBaud: 115200,
    models: ['Ubuntu 24.04 / 22.04 LTS', 'Debian 12 Bookworm', 'Raspberry Pi / Embedded ARM', 'Generic Linux Serial TTY'],
    color: 'border-amber-500/50 bg-amber-950/30 text-amber-300',
    badge: 'BASH / TTY',
    iconType: 'linux'
  },
  {
    id: 'generic',
    name: 'Generic Serial / RS-232',
    category: 'Standard Network & IoT Console',
    defaultBaud: 9600,
    models: ['Standard 9600 8N1 Console', 'High-Speed 115200 8N1 Console', 'Custom Serial Terminal'],
    color: 'border-purple-500/50 bg-purple-950/30 text-purple-300',
    badge: 'RAW VT100',
    iconType: 'generic'
  }
];

export const QuickDeviceTypePickerModal: React.FC<QuickDeviceTypePickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialPortOrDevice
}) => {
  const isBle = initialPortOrDevice?.type === 'ble' || (initialPortOrDevice?.name || '').toLowerCase().includes('bt578') || (initialPortOrDevice?.pathOrAddress || '').includes(':');
  
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand>('cisco');
  const [selectedModel, setSelectedModel] = useState<string>('Catalyst 9300 / 9200');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [deviceName, setDeviceName] = useState<string>('');

  React.useEffect(() => {
    if (initialPortOrDevice) {
      const portPath = initialPortOrDevice.pathOrAddress || '';
      const portName = initialPortOrDevice.name || '';
      
      // Guess brand from device name if applicable
      let guessedBrand: DeviceBrand = 'cisco';
      if (/mikrotik|routeros/i.test(portName)) guessedBrand = 'mikrotik';
      else if (/huawei|vrp/i.test(portName)) guessedBrand = 'huawei';
      else if (/forti/i.test(portName)) guessedBrand = 'fortinet';
      else if (/juniper|junos/i.test(portName)) guessedBrand = 'juniper';
      else if (/linux|ubuntu/i.test(portName)) guessedBrand = 'linux';

      setSelectedBrand(guessedBrand);
      const preset = VENDOR_PRESETS.find(p => p.id === guessedBrand) || VENDOR_PRESETS[0];
      setSelectedModel(preset.models[0]);
      setBaudRate(preset.defaultBaud);

      // Auto-generate clean friendly name
      const cleanName = portName || (isBle ? 'IRXON BT578 Wireless Console' : `Serial Console (${portPath.split('/').pop() || portPath})`);
      setDeviceName(cleanName);
    }
  }, [initialPortOrDevice, isBle]);

  if (!isOpen) return null;

  const handleBrandChange = (brandId: DeviceBrand) => {
    setSelectedBrand(brandId);
    const preset = VENDOR_PRESETS.find(p => p.id === brandId);
    if (preset) {
      setSelectedModel(preset.models[0]);
      setBaudRate(preset.defaultBaud);
    }
  };

  const handleProceed = () => {
    const connType: ConnectionType = isBle ? 'serial_bluetooth' : 'serial_cable';
    const pathOrAddr = initialPortOrDevice?.pathOrAddress || (isBle ? 'BLE-CONSOLE-01' : '/dev/cu.usbserial');
    
    onConfirm({
      name: deviceName.trim() || `${selectedBrand.toUpperCase()} Console`,
      brand: selectedBrand,
      model: selectedModel,
      type: connType,
      baudRate: Number(baudRate) || 9600,
      ipOrPortLabel: pathOrAddr,
      serialPortPath: !isBle ? pathOrAddr : undefined,
      bluetoothName: isBle ? deviceName : undefined,
      bluetoothAddress: isBle ? pathOrAddr : undefined
    });
    onClose();
  };

  const currentPreset = VENDOR_PRESETS.find(p => p.id === selectedBrand) || VENDOR_PRESETS[0];

  return (
    <div 
      id="quick-device-type-picker-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              {isBle ? <Bluetooth className="w-5 h-5 text-blue-400" /> : <Cable className="w-5 h-5 text-cyan-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-white">
                  Pilih Tipe Perangkat (Device Profile)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                  {isBle ? 'BLUETOOTH BLE' : 'SERIAL KABEL'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Target Port: <span className="font-mono text-cyan-300 font-medium">{initialPortOrDevice?.pathOrAddress || 'Auto Port'}</span>
                {initialPortOrDevice?.chipType && <span className="text-neutral-500"> • {initialPortOrDevice.chipType}</span>}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* 1. Device Name Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Nama Profil Sesi Terminal:
            </label>
            <input 
              id="input-quick-device-name"
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Contoh: Cisco-Core-SW-01, MikroTik-HQ, etc."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          {/* 2. Vendor / Brand Grid Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Pilih Vendor & Sistem Operasi Jaringan:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {VENDOR_PRESETS.map((preset) => {
                const isSelected = selectedBrand === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    id={`btn-preset-vendor-${preset.id}`}
                    onClick={() => handleBrandChange(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected 
                        ? `${preset.color} border-blue-500 ring-1 ring-blue-500 shadow-md` 
                        : 'bg-neutral-900/70 border-neutral-800/80 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white">
                          {preset.name}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/50 border border-neutral-700">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {preset.category}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-neutral-400 font-mono">
                        <span>Baud: {preset.defaultBaud}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Model & Baud Rate Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Model / Seri Perangkat:
              </label>
              <select 
                id="select-quick-device-model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                {currentPreset.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Baud Rate (Kecepatan Serial):
              </label>
              <select 
                id="select-quick-device-baudrate"
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value={9600}>9600 baud (Standar Cisco / Huawei / Fortinet / Juniper)</option>
                <option value={115200}>115200 baud (Standar MikroTik / Linux / High-Speed)</option>
                <option value={57600}>57600 baud</option>
                <option value={38400}>38400 baud</option>
                <option value={19200}>19200 baud</option>
                <option value={4800}>4800 baud</option>
                <option value={2400}>2400 baud</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-neutral-800 flex items-center justify-between bg-neutral-900/50 gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Siap terhubung via 8N1 Raw Serial Terminal</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-confirm-quick-device-connect"
              onClick={handleProceed}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Buka & Sambungkan Konsol</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
