import React, { useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  Cable, 
  Bluetooth, 
  Terminal, 
  Plus, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Pencil, 
  RefreshCw, 
  Cpu, 
  Eye, 
  EyeOff, 
  Radio, 
  Smartphone, 
  Sliders,
  HelpCircle
} from 'lucide-react';
import { ConnectionType, DeviceBrand, DeviceProfile } from '../types';
import { 
  getGrantedWebSerialPorts, 
  testSshBackendConnection, 
  connectWebSerialPort,
  connectWebBluetoothSerial,
  checkBrowserHardwareCaps,
  getPairedAndroidBluetoothDevices,
  getAvailableAndroidUsbDevices,
  connectAndroidUsbSerialPort,
  SshTestResult, 
  extractHostnameFromOutput 
} from '../services/serialConnection';
import { STANDARD_DEVICE_OPTIONS, StandardDeviceOption } from '../data/deviceCatalog';
import { AndroidIrxonModal } from './AndroidIrxonModal';
import { BluetoothDevicePickerModal } from './BluetoothDevicePickerModal';
import { SerialPortPickerModal } from './SerialPortPickerModal';

interface AddConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDevice: (device: DeviceProfile) => void;
  onUpdateDevice?: (device: DeviceProfile) => void;
  initialDevice?: DeviceProfile | null;
  onOpenIrxonAt?: () => void;
}

export const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  isOpen,
  onClose,
  onAddDevice,
  onUpdateDevice,
  initialDevice,
  onOpenIrxonAt,
}) => {
  const isEditing = !!initialDevice;

  const [connType, setConnType] = useState<ConnectionType>('ssh');
  
  // Universal fields
  const [deviceName, setDeviceName] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand>('cisco');
  const [selectedModelId, setSelectedModelId] = useState<string>('cisco-ios-xe');

  // SSH / Telnet fields
  const [host, setHost] = useState<string>('192.168.1.1');
  const [port, setPort] = useState<number>(22);
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // SSH Live Test state
  const [isTestingSsh, setIsTestingSsh] = useState<boolean>(false);
  const [sshTestResult, setSshTestResult] = useState<SshTestResult | null>(null);

  // Serial & COM fields
  const isMac = typeof navigator !== 'undefined' && (
    /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent || '') || 
    (navigator as any).userAgentData?.platform === 'macOS' ||
    navigator.platform?.toUpperCase().includes('MAC') ||
    (typeof window !== 'undefined' && (window as any).DesktopNative?.platform === 'darwin')
  );
  const isWindows = typeof navigator !== 'undefined' && (
    /Win/i.test(navigator.userAgent || '') ||
    (navigator as any).userAgentData?.platform === 'Windows' ||
    navigator.platform?.toUpperCase().includes('WIN') ||
    (typeof window !== 'undefined' && (window as any).DesktopNative?.platform === 'win32')
  );
  const isDesktopNative = typeof window !== 'undefined' && Boolean((window as any).DesktopNative?.isDesktopNative);

  const [selectedComPort, setSelectedComPort] = useState<string>(isMac ? '/dev/cu.usbserial' : 'COM3');
  const [customComName, setCustomComName] = useState<string>(isMac ? '/dev/cu.usbserial' : 'COM3');
  const [grantedPorts, setGrantedPorts] = useState<Array<{ id: string; name: string; path?: string }>>([]);
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [dataBits, setDataBits] = useState<number>(8);
  const [stopBits, setStopBits] = useState<number>(1);
  const [parity, setParity] = useState<'none' | 'even' | 'odd'>('none');
  const [flowControl, setFlowControl] = useState<'none' | 'hardware'>('none');
  const [dtrRts, setDtrRts] = useState<boolean>(true);
  const [lineEnding, setLineEnding] = useState<'crlf' | 'cr' | 'lf'>('cr');
  
  // Bluetooth fields
  const [bluetoothName, setBluetoothName] = useState<string>('IRXON-BT578-Console');

  // Hardware scan states
  const [hardwareDetectedName, setHardwareDetectedName] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectError, setDetectError] = useState<string>('');
  const [showSerialAdvanced, setShowSerialAdvanced] = useState<boolean>(false);
  const [showAndroidModal, setShowAndroidModal] = useState<boolean>(false);

  // Available OS options filtered by brand
  const availableOsOptions = STANDARD_DEVICE_OPTIONS.filter(d => d.brand === selectedBrand);

  // Find currently selected model object
  const currentModelOption = STANDARD_DEVICE_OPTIONS.find(m => m.id === selectedModelId) || availableOsOptions[0] || STANDARD_DEVICE_OPTIONS[0];

  // Load granted serial ports on mount/open
  useEffect(() => {
    if (isOpen && (connType === 'serial_cable' || connType === 'serial_bluetooth')) {
      loadGrantedSerialPorts();
    }
  }, [isOpen, connType]);

  const loadGrantedSerialPorts = async () => {
    try {
      const list: Array<{ id: string; name: string; path?: string }> = [];

      // 1. If running in Desktop Native (Electron macOS .dmg / Windows .exe)
      if (typeof window !== 'undefined' && (window as any).DesktopNative?.listSerialPorts) {
        try {
          const res = await (window as any).DesktopNative.listSerialPorts();
          if (res && res.success && Array.isArray(res.ports)) {
            res.ports.forEach((p: any, idx: number) => {
              const pathName = p.path || p;
              const desc = p.manufacturer ? ` (${p.manufacturer})` : '';
              list.push({
                id: `desktop-native-${idx}-${pathName}`,
                name: `${pathName}${desc}`,
                path: pathName,
              });
            });
          }
        } catch (e) {
          console.warn('DesktopNative listSerialPorts error:', e);
        }
      }

      // 2. WebSerial API granted ports
      const ports = await getGrantedWebSerialPorts();
      ports.forEach(p => {
        if (!list.some(existing => existing.path === p.name || existing.name.includes(p.name))) {
          list.push({ id: p.id, name: p.name, path: p.name });
        }
      });

      setGrantedPorts(list);

      // Auto select primary active port if current value is default/empty
      if (list.length > 0) {
        if (!customComName || customComName === 'COM3' || customComName === '/dev/cu.usbserial' || isMac && customComName.startsWith('COM')) {
          const firstPath = list[0].path || list[0].name;
          setCustomComName(firstPath);
          setHardwareDetectedName(list[0].name);
        }
      } else if (isMac && (customComName === 'COM3' || customComName === 'COM1' || customComName === 'COM2')) {
        setCustomComName('/dev/cu.usbserial');
      }
    } catch (e) {
      console.warn('Could not read granted ports:', e);
    }
  };

  // Sync initialDevice for edit mode
  useEffect(() => {
    if (initialDevice) {
      setConnType(initialDevice.type);
      setDeviceName(initialDevice.name || '');
      setHost(initialDevice.host || '192.168.1.1');
      setPort(initialDevice.port || (initialDevice.type === 'telnet' ? 23 : 22));
      setUsername(initialDevice.username || 'admin');
      setPassword(initialDevice.password || '');
      setBaudRate(initialDevice.baudRate || 9600);
      setDataBits(initialDevice.dataBits || 8);
      setStopBits(initialDevice.stopBits || 1);
      setParity(initialDevice.parity || 'none');
      setFlowControl(initialDevice.flowControl || 'none');
      setDtrRts(initialDevice.dtrRts !== undefined ? initialDevice.dtrRts : true);
      setLineEnding(initialDevice.lineEnding || 'cr');
      setBluetoothName(initialDevice.bluetoothName || 'IRXON-BT578-Console');
      setHardwareDetectedName(initialDevice.type === 'serial_cable' ? initialDevice.name : '');
      setDetectError('');

      // Match model id & brand
      const matched = STANDARD_DEVICE_OPTIONS.find(m => m.name.toLowerCase() === (initialDevice.model || '').toLowerCase() || m.brand === initialDevice.brand);
      if (matched) {
        setSelectedBrand(matched.brand);
        setSelectedModelId(matched.id);
      }
    } else {
      // Reset defaults for Add mode
      setConnType('ssh');
      setDeviceName('');
      setSelectedBrand('cisco');
      setSelectedModelId('cisco-ios-xe');
      setHost('192.168.1.1');
      setPort(22);
      setUsername('admin');
      setPassword('');
      setBaudRate(9600);
      setDataBits(8);
      setStopBits(1);
      setParity('none');
      setFlowControl('none');
      setDtrRts(true);
      setLineEnding('cr');
      setBluetoothName('IRXON-BT578-Console');
      setHardwareDetectedName('');
      setDetectError('');
      setSshTestResult(null);
    }
  }, [initialDevice, isOpen]);

  const handleConnTypeChange = (type: ConnectionType) => {
    setConnType(type);
    setDetectError('');
    if (type === 'telnet' && port === 22) {
      setPort(23);
    } else if (type === 'ssh' && port === 23) {
      setPort(22);
    }

    if (type === 'serial_cable') {
      if (!deviceName || deviceName.includes('192.168') || deviceName.startsWith('SSH')) {
        setDeviceName('Serial Console (COM)');
      }
      loadGrantedSerialPorts();
    } else if (type === 'serial_bluetooth') {
      if (!deviceName || deviceName.includes('192.168') || deviceName.startsWith('SSH')) {
        setDeviceName('BT578 Console');
      }
    }
  };

  const handleBrandChange = (brand: DeviceBrand) => {
    setSelectedBrand(brand);
    const osList = STANDARD_DEVICE_OPTIONS.filter(d => d.brand === brand);
    if (osList.length > 0) {
      const first = osList[0];
      setSelectedModelId(first.id);
      if (connType === 'serial_cable' || connType === 'serial_bluetooth') {
        setBaudRate(first.defaultBaud || 9600);
      }
      if (!deviceName || deviceName === '192.168.1.1' || deviceName.startsWith('New Device')) {
        setDeviceName(first.name);
      }
    }
  };

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    const m = STANDARD_DEVICE_OPTIONS.find(opt => opt.id === modelId);
    if (m) {
      setSelectedBrand(m.brand);
      if (connType === 'serial_cable' || connType === 'serial_bluetooth') {
        if (m.defaultBaud) {
          setBaudRate(m.defaultBaud);
        }
      }
      // Auto-suggest name if empty
      if (!deviceName || deviceName === '192.168.1.1' || deviceName.startsWith('New Device')) {
        setDeviceName(`${m.name}`);
      }
    }
  };

  // Web & Desktop Native Serial Port detection (Direct Modal Pop-up Chooser)
  const [showSerialPickerModal, setShowSerialPickerModal] = useState<boolean>(false);

  const handleDetectSerialPort = () => {
    setDetectError('');
    // Open dedicated interactive COM Port Picker pop-up modal listing all active hardware
    setShowSerialPickerModal(true);
  };

  const handleSelectSerialPort = (port: { path: string; name: string; chipType?: string }) => {
    setHardwareDetectedName(port.name);
    setSelectedComPort(port.path);
    setCustomComName(port.path);
    if (!deviceName || deviceName.startsWith('Serial') || deviceName.startsWith('COM') || deviceName.includes('/dev/') || deviceName.startsWith('New Device')) {
      setDeviceName(`${currentModelOption.name} (${port.path})`);
    }
  };

  // Web & Native Bluetooth detection and direct connection for Serial Adapters & BLE
  const [isBtGattConnected, setIsBtGattConnected] = useState<boolean>(false);
  const [pairedBtDevices, setPairedBtDevices] = useState<Array<{ name: string; address: string; type: string }>>([]);
  const [selectedPairedAddress, setSelectedPairedAddress] = useState<string>('');
  const [showBtPickerModal, setShowBtPickerModal] = useState<boolean>(false);

  const caps = checkBrowserHardwareCaps();

  useEffect(() => {
    if (caps.isAndroidNative) {
      const devices = getPairedAndroidBluetoothDevices();
      setPairedBtDevices(devices);
    }
  }, [caps.isAndroidNative, isOpen]);

  const refreshPairedDevices = () => {
    if (caps.isAndroidNative) {
      const devices = getPairedAndroidBluetoothDevices();
      setPairedBtDevices(devices);
    }
  };

  const handleDetectBluetooth = () => {
    setDetectError('');
    setShowBtPickerModal(true);
  };

  const handleSelectBluetoothDevice = (device: { name: string; address: string; type: string }) => {
    setBluetoothName(device.name);
    setSelectedPairedAddress(device.address);
    setHardwareDetectedName(device.name);
    setIsBtGattConnected(true);
    if (!deviceName || deviceName.startsWith('New Device') || deviceName.startsWith('Serial') || deviceName.includes('Bluetooth') || deviceName.includes('IRXON') || deviceName === 'BT578 Console') {
      setDeviceName(`${currentModelOption.name} (${device.name})`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedModel = currentModelOption;
    let cleanHost = host.trim();
    let cleanPort = Number(port) || 22;
    if (cleanHost.includes(':') && !cleanHost.startsWith('http://') && !cleanHost.startsWith('https://') && !cleanHost.startsWith('[')) {
      const parts = cleanHost.split(':');
      cleanHost = parts[0].trim();
      const parsedPort = Number(parts[1]);
      if (!isNaN(parsedPort) && parsedPort >= 1 && parsedPort <= 65535) {
        cleanPort = parsedPort;
      }
    }

    let finalName = deviceName.trim();
    let cleanSerialPath = '';
    if (connType === 'serial_cable') {
      const candidate = selectedComPort || customComName || hardwareDetectedName || '';
      const devMatch = candidate.match(/\/dev\/(?:cu|tty)\.[a-zA-Z0-9_.-]+/i) ||
                       candidate.match(/\/dev\/tty[a-zA-Z0-9_.-]+/i) ||
                       candidate.match(/\/dev\/[a-zA-Z0-9_.-]+/i) ||
                       candidate.match(/\bCOM\d+\b/i);
      cleanSerialPath = devMatch ? devMatch[0] : (candidate.startsWith('/dev/') ? candidate.split(' ')[0] : candidate || (isMac ? '/dev/cu.usbserial' : 'COM3'));
    }

    if (!finalName) {
      if (connType === 'ssh' || connType === 'telnet') {
        finalName = cleanHost || selectedModel.name;
      } else if (connType === 'serial_cable') {
        finalName = `${selectedModel.name} (${cleanSerialPath})`;
      } else {
        finalName = bluetoothName || `${selectedModel.name} (Bluetooth)`;
      }
    }

    let ipOrPortLabel = '';
    if (connType === 'ssh' || connType === 'telnet') {
      ipOrPortLabel = `${cleanHost}:${cleanPort}`;
    } else if (connType === 'serial_cable') {
      ipOrPortLabel = `${cleanSerialPath} (${baudRate} 8N1)`;
    } else {
      ipOrPortLabel = `${bluetoothName} (${baudRate} 8N1)`;
    }

    const brand = selectedModel.brand;
    const modelName = selectedModel.name;

    if (isEditing && initialDevice) {
      const updatedDev: DeviceProfile = {
        ...initialDevice,
        name: finalName,
        type: connType,
        brand,
        model: modelName,
        host: connType === 'ssh' || connType === 'telnet' ? cleanHost : undefined,
        port: connType === 'ssh' || connType === 'telnet' ? cleanPort : undefined,
        username: connType === 'ssh' || connType === 'telnet' ? username.trim() : undefined,
        password: connType === 'ssh' || connType === 'telnet' ? password : undefined,
        baudRate: connType === 'serial_cable' || connType === 'serial_bluetooth' ? baudRate : undefined,
        dataBits,
        stopBits,
        parity,
        flowControl,
        dtrRts,
        lineEnding,
        serialPortPath: connType === 'serial_cable' ? cleanSerialPath : undefined,
        bluetoothName: connType === 'serial_bluetooth' ? bluetoothName : undefined,
        bluetoothAddress: connType === 'serial_bluetooth' ? (selectedPairedAddress || initialDevice.bluetoothAddress) : undefined,
        status: (connType === 'serial_bluetooth' && (isBtGattConnected || Boolean(selectedPairedAddress || bluetoothName))) ? 'connected' : initialDevice.status,
        lastConnected: (connType === 'serial_bluetooth' && (isBtGattConnected || Boolean(selectedPairedAddress || bluetoothName))) ? 'Baru saja' : initialDevice.lastConnected,
        ipOrPortLabel,
        description: connType === 'ssh' ? `SSH ${cleanHost}:${cleanPort} • ${modelName}` : `${modelName} • ${ipOrPortLabel}`,
      };

      if (onUpdateDevice) {
        onUpdateDevice(updatedDev);
      } else {
        onAddDevice(updatedDev);
      }
    } else {
      const isConnectedInitially = connType === 'serial_bluetooth' && (isBtGattConnected || Boolean(selectedPairedAddress || bluetoothName));
      const newDev: DeviceProfile = {
        id: `dev-${Date.now()}`,
        name: finalName,
        type: connType,
        brand,
        model: modelName,
        host: connType === 'ssh' || connType === 'telnet' ? cleanHost : undefined,
        port: connType === 'ssh' || connType === 'telnet' ? cleanPort : undefined,
        username: connType === 'ssh' || connType === 'telnet' ? username.trim() : undefined,
        password: connType === 'ssh' || connType === 'telnet' ? password : undefined,
        baudRate: connType === 'serial_cable' || connType === 'serial_bluetooth' ? baudRate : undefined,
        dataBits,
        stopBits,
        parity,
        flowControl,
        dtrRts,
        lineEnding,
        serialPortPath: connType === 'serial_cable' ? cleanSerialPath : undefined,
        bluetoothName: connType === 'serial_bluetooth' ? bluetoothName : undefined,
        bluetoothAddress: connType === 'serial_bluetooth' ? selectedPairedAddress : undefined,
        status: isConnectedInitially ? 'connected' : 'disconnected',
        lastConnected: isConnectedInitially ? 'Baru saja' : 'Belum terhubung',
        ipOrPortLabel,
        description: connType === 'ssh' ? `SSH ${cleanHost}:${cleanPort} • ${modelName}` : `${modelName} • ${ipOrPortLabel}`,
      };

      onAddDevice(newDev);
    }

    onClose();
  };

  if (!isOpen) return null;

  // Group the 12 standard models by Brand for clean UI optgroup
  const brandGroups = [
    { brandLabel: 'Juniper', items: STANDARD_DEVICE_OPTIONS.filter(d => d.brand === 'juniper') },
    { brandLabel: 'Cisco', items: STANDARD_DEVICE_OPTIONS.filter(d => d.brand === 'cisco') },
    { brandLabel: 'Arista', items: STANDARD_DEVICE_OPTIONS.filter(d => d.brand === 'arista') },
    { brandLabel: 'Palo Alto', items: STANDARD_DEVICE_OPTIONS.filter(d => d.brand === 'paloalto') },
    { brandLabel: 'Ubiquiti', items: STANDARD_DEVICE_OPTIONS.filter(d => d.brand === 'ubiquiti') },
    { brandLabel: 'Linux / Unix', items: STANDARD_DEVICE_OPTIONS.filter(d => d.brand === 'linux') },
    { brandLabel: 'Fortinet', items: STANDARD_DEVICE_OPTIONS.filter(d => d.brand === 'fortinet') },
  ];

  return (
    <div 
      id="modal-add-connection-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div 
        id="modal-add-connection-box"
        className="w-full max-w-lg bg-black border border-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] text-white"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isEditing ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
              {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-white">
                {isEditing ? 'Edit Perangkat' : 'Tambah Perangkat Baru'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {connType === 'ssh' ? 'Koneksi SSH Jarak Jauh' : connType === 'serial_cable' ? 'Koneksi Serial Kabel (COM Port)' : connType === 'serial_bluetooth' ? 'Koneksi Bluetooth Serial (IRXON / SPP)' : 'Koneksi Telnet'}
              </p>
            </div>
          </div>

          <button 
            id="btn-close-add-modal"
            onClick={onClose} 
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Connection Type Switcher */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1.5">Metode Koneksi:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'ssh', label: 'SSH', icon: Server, desc: 'Jaringan IP' },
                { id: 'serial_cable', label: 'Serial Kabel', icon: Cable, desc: 'USB-to-COM' },
                { id: 'serial_bluetooth', label: 'Bluetooth', icon: Bluetooth, desc: 'IRXON / SPP' },
              ].map((t) => {
                const Icon = t.icon;
                const isSel = connType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    id={`conn-type-btn-${t.id}`}
                    onClick={() => handleConnTypeChange(t.id as ConnectionType)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all ${
                      isSel
                        ? 'bg-blue-950/40 border-blue-500 text-blue-300 shadow-xs'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isSel ? 'text-blue-400' : 'text-neutral-400'}`} />
                    <span className="text-xs font-medium text-white">{t.label}</span>
                    <span className="text-[10px] text-neutral-400">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. NAMA DEVICE (All Modes - Used as display name & icon label) */}
          <div>
            <label className="block text-neutral-300 font-medium mb-1">
              Nama Device: <span className="text-neutral-500 font-normal text-[11px]">(Akan menjadi nama di list dan icon tab)</span>
            </label>
            <input
              id="input-device-name"
              type="text"
              placeholder={connType === 'ssh' ? 'Contoh: Core-SW-Junos, Cisco-Edge-Router, Server-Ubuntu' : 'Contoh: Console-Cisco-Rack1, IRXON-Console-01'}
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-xs placeholder:text-neutral-600 font-medium"
              required
            />
          </div>

          {/* 2. BRAND & OS TYPE SELECTION (AI Auto-Model discovery) */}
          <div className="space-y-2.5 p-3 bg-neutral-950/80 rounded-xl border border-neutral-800/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Brand Selector */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  1. Pilih Brand:
                </label>
                <select
                  id="select-device-brand"
                  value={selectedBrand}
                  onChange={(e) => handleBrandChange(e.target.value as DeviceBrand)}
                  className="w-full bg-black text-white border border-neutral-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-xs font-medium"
                >
                  <option value="cisco">Cisco Systems</option>
                  <option value="alliedtelesis">Allied Telesis (Switch, Router, AP)</option>
                  <option value="mikrotik">MikroTik</option>
                  <option value="juniper">Juniper</option>
                  <option value="fortinet">Fortinet</option>
                  <option value="huawei">Huawei</option>
                  <option value="arista">Arista</option>
                  <option value="paloalto">Palo Alto</option>
                  <option value="ubiquiti">Ubiquiti</option>
                  <option value="aruba">Aruba / HPE</option>
                  <option value="hpe">HPE Comware</option>
                  <option value="ruckus">Ruckus (ICX)</option>
                  <option value="dell">Dell Technologies</option>
                  <option value="linux">Linux / Unix</option>
                  <option value="openwrt">OpenWrt / FreeBSD</option>
                  <option value="generic">Generic / Custom CLI</option>
                </select>
              </div>

              {/* OS Type Selector */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  2. Pilih OS Type:
                </label>
                <select
                  id="select-device-os-type"
                  value={selectedModelId}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-black text-white border border-neutral-800 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-xs font-medium"
                >
                  {availableOsOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.osType} ({opt.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* AI Auto-Model Detection Card */}
            <div className="p-2 bg-blue-950/20 border border-blue-800/40 rounded-lg flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-blue-400 shrink-0">✨ AI Auto-Model:</span>
                <span className="text-neutral-200 font-medium truncate">{currentModelOption.name}</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${currentModelOption.badgeColor}`}>
                {currentModelOption.osType}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. SSH SPECIFIC FORM FIELDS */}
          {/* ========================================================================= */}
          {connType === 'ssh' && (
            <div className="space-y-3 pt-1 border-t border-neutral-900">
              {/* IP Address / URL & Port */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-neutral-300 font-medium mb-1">IP Address / URL:</label>
                  <input
                    id="input-ssh-host"
                    type="text"
                    placeholder="Contoh: 192.168.1.1 atau gateway.lokal:2222"
                    value={host}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes(':') && !val.startsWith('http://') && !val.startsWith('https://')) {
                        const parts = val.split(':');
                        if (parts.length === 2 && !isNaN(Number(parts[1]))) {
                          setHost(parts[0]);
                          const parsedPort = Number(parts[1]);
                          if (parsedPort >= 1 && parsedPort <= 65535) {
                            setPort(parsedPort);
                          }
                          return;
                        }
                      }
                      setHost(val);
                    }}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-mono text-xs placeholder:text-neutral-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Port (1-65535):</label>
                  <input
                    id="input-ssh-port"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder="22"
                    value={port}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPort(val);
                    }}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-mono text-xs"
                    required
                  />
                </div>
              </div>

              {/* Private IP / Local Server Info Notice */}
              {/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|localhost)/i.test(host.trim()) && (
                <div className="p-2.5 bg-blue-950/30 border border-blue-800/40 rounded-lg text-[11px] text-blue-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-blue-200">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Koneksi ke Server Lokal / IP Private:</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed text-[10.5px]">
                    Aplikasi Cloud Run tidak dapat menjangkau IP private lokal secara langsung. Untuk menghubungkan server lokal dari web ini:
                  </p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10.5px] text-neutral-300">
                    <li><strong className="text-cyan-300">Reverse Tunnel Gratis (Pinggy):</strong> Jalankan <code className="text-amber-300 font-mono bg-black/40 px-1 py-0.5 rounded">ssh -p 443 -R0:localhost:22 a.pinggy.io</code> di server lokal Anda, lalu masukkan hostname & port publik yang muncul ke form ini.</li>
                    <li><strong className="text-cyan-300">Aplikasi Desktop / Android:</strong> Gunakan installer Desktop (Mac/Windows) atau APK Android 69 AI yang terhubung langsung di jaringan LAN lokal yang sama.</li>
                  </ul>
                </div>
              )}

              {/* User & Password */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">User (Username):</label>
                  <input
                    id="input-ssh-username"
                    type="text"
                    placeholder="admin / root / cisco"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 text-xs placeholder:text-neutral-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Password:</label>
                  <div className="relative">
                    <input
                      id="input-ssh-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg p-2.5 pr-8 focus:outline-none focus:border-blue-500 font-mono text-xs placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Test Connection Button */}
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-lg flex items-center justify-between">
                <span className="text-[11px] text-neutral-400">Uji koneksi TCP/SSH handshake:</span>
                <button
                  type="button"
                  id="btn-test-ssh-connection"
                  disabled={isTestingSsh || !host.trim()}
                  onClick={async () => {
                    setIsTestingSsh(true);
                    setSshTestResult(null);
                    const res = await testSshBackendConnection(host, port, username, password);
                    setSshTestResult(res);
                    setIsTestingSsh(false);
                  }}
                  className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-neutral-200 text-xs rounded border border-neutral-700 transition-colors flex items-center gap-1.5"
                >
                  {isTestingSsh ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                      <span>Menguji...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Test Koneksi</span>
                    </>
                  )}
                </button>
              </div>

              {sshTestResult && (
                <div className={`p-2.5 rounded-lg border text-[11px] font-mono space-y-1.5 ${sshTestResult.success ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-red-950/40 border-red-800 text-red-300'}`}>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{sshTestResult.success ? '✓ KONEKSI SSH BERHASIL' : '✕ KONEKSI SSH GAGAL'}</span>
                  </div>
                  {sshTestResult.error && <p className="text-[10.5px] text-red-400">{sshTestResult.error}</p>}
                  {sshTestResult.troubleshooting && sshTestResult.troubleshooting.length > 0 && (
                    <div className="pt-1.5 mt-1 border-t border-red-900/50 space-y-1 font-sans">
                      <p className="text-[10px] font-semibold text-neutral-300">Saran Pemecahan Masalah:</p>
                      <ul className="list-disc pl-4 text-[10px] text-neutral-400 space-y-0.5">
                        {sshTestResult.troubleshooting.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. SERIAL KABEL SPECIFIC FORM FIELDS (USB-UART / RS232) */}
          {/* ========================================================================= */}
          {connType === 'serial_cable' && (
            <div className="space-y-3 pt-1 border-t border-neutral-900">
              {/* COM Port Picker Action Banner */}
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-xs">Port COM Serial Fisik</h4>
                      <p className="text-[11px] text-neutral-400">
                        {isMac ? 'Pilih adapter USB console Mac (/dev/cu.*)' : 'Pilih port hardware USB-UART / RS232'}
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-scan-web-serial"
                    type="button"
                    onClick={handleDetectSerialPort}
                    disabled={isDetecting}
                    className="w-full sm:w-auto px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 active:scale-95 cursor-pointer shrink-0"
                  >
                    <Cable className="w-4 h-4" />
                    <span>{customComName ? 'Ganti Port COM' : 'Pilih Port COM'}</span>
                  </button>
                </div>

                {customComName || hardwareDetectedName ? (
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/80 rounded-xl flex items-center justify-between gap-2 text-emerald-300 font-mono text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate font-semibold text-white">Port Terpilih: {hardwareDetectedName || customComName}</span>
                    </div>
                    <span className="text-[10px] text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-600 font-sans shrink-0">
                      HARDWARE AKTIF
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-neutral-400 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Cable className="w-3.5 h-3.5 text-blue-400" />
                      <span>Klik <strong>Pilih Port COM</strong> untuk membuka pop-up perangkat hardware</span>
                    </span>
                    <span className="font-mono text-blue-400 text-[10px]">
                      {isMac ? 'macOS /dev/cu.*' : 'Web Serial / COM'}
                    </span>
                  </div>
                )}

                {detectError && (
                  <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{detectError}</span>
                  </div>
                )}
              </div>

              {/* Baud Rate (Speed) Selection */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1 text-xs">Baud Rate (Kecepatan Console):</label>
                <select
                  id="select-serial-baud"
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-mono text-xs"
                >
                  <option value={9600}>9600 (Standar Cisco / Juniper / Fortinet)</option>
                  <option value={115200}>115200 (Linux / Ubiquiti / High-Speed)</option>
                  <option value={57600}>57600</option>
                  <option value={38400}>38400</option>
                  <option value={19200}>19200</option>
                  <option value={4800}>4800</option>
                </select>
              </div>

              {/* Toggle Advanced Serial Settings */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowSerialAdvanced(!showSerialAdvanced)}
                  className="text-neutral-400 hover:text-white text-[11px] flex items-center gap-1 font-medium transition-colors"
                >
                  <Sliders className="w-3 h-3 text-blue-400" />
                  <span>{showSerialAdvanced ? 'Sembunyikan Pengaturan Serial Lanjutan' : 'Pengaturan Serial Lanjutan (Data Bits, Parity, DTR/RTS, Line Ending)'}</span>
                </button>

                {showSerialAdvanced && (
                  <div className="mt-2 p-3 bg-neutral-950 border border-neutral-800 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">Data Bits:</label>
                      <select
                        value={dataBits}
                        onChange={(e) => setDataBits(Number(e.target.value))}
                        className="w-full bg-neutral-900 text-white border border-neutral-700 rounded p-1.5 text-xs font-mono"
                      >
                        <option value={8}>8 Bits</option>
                        <option value={7}>7 Bits</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">Stop Bits:</label>
                      <select
                        value={stopBits}
                        onChange={(e) => setStopBits(Number(e.target.value))}
                        className="w-full bg-neutral-900 text-white border border-neutral-700 rounded p-1.5 text-xs font-mono"
                      >
                        <option value={1}>1 Bit</option>
                        <option value={2}>2 Bits</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">Parity:</label>
                      <select
                        value={parity}
                        onChange={(e) => setParity(e.target.value as any)}
                        className="w-full bg-neutral-900 text-white border border-neutral-700 rounded p-1.5 text-xs font-mono"
                      >
                        <option value="none">None (N)</option>
                        <option value="even">Even (E)</option>
                        <option value="odd">Odd (O)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">Line Ending:</label>
                      <select
                        value={lineEnding}
                        onChange={(e) => setLineEnding(e.target.value as any)}
                        className="w-full bg-neutral-900 text-white border border-neutral-700 rounded p-1.5 text-xs font-mono"
                      >
                        <option value="crlf">CRLF (\r\n)</option>
                        <option value="cr">CR (\r)</option>
                        <option value="lf">LF (\n)</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-4 pt-1 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                        <input
                          type="checkbox"
                          checked={dtrRts}
                          onChange={(e) => setDtrRts(e.target.checked)}
                          className="rounded border-neutral-700 text-blue-600 focus:ring-0"
                        />
                        <span className="text-[11px]">Aktifkan DTR/RTS (Wajib untuk RS232 Transceiver)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. SERIAL BLUETOOTH SPECIFIC FORM FIELDS (STREAMLINED SCAN BLE & SPP) */}
          {/* ========================================================================= */}
          {connType === 'serial_bluetooth' && (
            <div className="space-y-3 pt-1 border-t border-neutral-900">
              {/* Main Minimalist Scan Bluetooth Card */}
              <div className="p-4 bg-gradient-to-r from-blue-950/40 via-neutral-950 to-indigo-950/40 border border-blue-900/60 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-inner">
                      <Bluetooth className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">Bluetooth Serial Adapter</h4>
                      <p className="text-[11px] text-neutral-400">
                        Scan BLE & sambungkan adapter BT578 / HC-05 console
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-scan-bluetooth"
                    type="button"
                    onClick={handleDetectBluetooth}
                    disabled={isDetecting}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 active:scale-95 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
                    <span>{isDetecting ? 'Membuka Pop-up BLE...' : 'Pindai & Pilih Device Bluetooth'}</span>
                  </button>
                </div>

                {/* Device Status Banner */}
                {hardwareDetectedName ? (
                  <div className="p-3 bg-emerald-950/70 border border-emerald-600/80 rounded-lg flex items-center justify-between text-emerald-300 font-mono text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                      <span className="truncate font-semibold text-white">Device Terpilih: {hardwareDetectedName}</span>
                    </div>
                    <span className="text-[10.5px] text-emerald-300 bg-emerald-900/90 px-2.5 py-0.5 rounded border border-emerald-500 shrink-0 font-bold">
                      {isBtGattConnected ? '🔵 TERHUBUNG / LED SOLID' : 'READY'}
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-neutral-400 bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-blue-400" />
                      <span>Klik <strong>Pindai & Pilih Device Bluetooth</strong> untuk membuka pop-up BLE device (BT578)</span>
                    </span>
                    <span className="font-mono text-blue-400 text-[10px]">
                      {caps.isAndroidNative ? 'Android SPP/BLE' : 'Bluetooth BLE (BT578)'}
                    </span>
                  </div>
                )}

                {detectError && (
                  <div className="p-2.5 bg-amber-950/50 border border-amber-800/70 rounded-lg text-amber-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>{detectError}</span>
                  </div>
                )}
              </div>

              {/* Bluetooth Settings (Name & Baud Rate) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Nama Device Bluetooth:</label>
                  <input
                    id="input-bluetooth-name"
                    type="text"
                    value={bluetoothName}
                    onChange={(e) => setBluetoothName(e.target.value)}
                    placeholder="Contoh: BT578-BLE, BT578_v3, HC-05"
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Baud Rate (Kecepatan Console):</label>
                  <select
                    id="select-bluetooth-baud"
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 font-mono text-xs"
                  >
                    <option value={9600}>9600 (Standar Cisco / Juniper / Switch)</option>
                    <option value={115200}>115200 (Ubiquiti / MikroTik / High-Speed)</option>
                    <option value={57600}>57600</option>
                    <option value={38400}>38400</option>
                    <option value={19200}>19200</option>
                    <option value={4800}>4800</option>
                  </select>
                </div>
              </div>

              {/* Toggle Advanced Bluetooth Serial Settings */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowSerialAdvanced(!showSerialAdvanced)}
                  className="text-neutral-400 hover:text-white text-[11px] flex items-center gap-1 font-medium transition-colors"
                >
                  <Sliders className="w-3 h-3 text-blue-400" />
                  <span>{showSerialAdvanced ? 'Sembunyikan Pengaturan Lanjutan' : 'Pengaturan Lanjutan (Parity, DTR/RTS Wakeup, Line Ending)'}</span>
                </button>

                {showSerialAdvanced && (
                  <div className="mt-2 p-3 bg-neutral-950 border border-neutral-800 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">Data Bits:</label>
                      <select
                        value={dataBits}
                        onChange={(e) => setDataBits(Number(e.target.value))}
                        className="w-full bg-neutral-900 text-white border border-neutral-700 rounded p-1.5 text-xs font-mono"
                      >
                        <option value={8}>8 Bits</option>
                        <option value={7}>7 Bits</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">Stop Bits:</label>
                      <select
                        value={stopBits}
                        onChange={(e) => setStopBits(Number(e.target.value))}
                        className="w-full bg-neutral-900 text-white border border-neutral-700 rounded p-1.5 text-xs font-mono"
                      >
                        <option value={1}>1 Bit</option>
                        <option value={2}>2 Bits</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">Parity:</label>
                      <select
                        value={parity}
                        onChange={(e) => setParity(e.target.value as any)}
                        className="w-full bg-neutral-900 text-white border border-neutral-700 rounded p-1.5 text-xs font-mono"
                      >
                        <option value="none">None (Tanpa Paritas)</option>
                        <option value="even">Even (Genap)</option>
                        <option value="odd">Odd (Ganjil)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-neutral-400 text-[10px] mb-1">Line Ending (Enter):</label>
                      <select
                        value={lineEnding}
                        onChange={(e) => setLineEnding(e.target.value as any)}
                        className="w-full bg-neutral-900 text-white border border-neutral-700 rounded p-1.5 text-xs font-mono"
                      >
                        <option value="cr">CR (\r) [Standar Router / 1x Enter]</option>
                        <option value="crlf">CRLF (\r\n) [Windows CLI]</option>
                        <option value="lf">LF (\n) [Unix / Linux Raw]</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
            <button
              id="btn-cancel-add-connection"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-medium transition-colors text-xs"
            >
              Batal
            </button>
            <button
              id="btn-save-connection"
              type="submit"
              className={`px-4 py-2 rounded-lg text-white font-medium shadow-md flex items-center gap-1.5 transition-colors text-xs ${
                isEditing ? 'bg-amber-600 hover:bg-amber-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isEditing ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              <span>{isEditing ? 'Simpan Perubahan' : 'Simpan & Hubungkan'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Android IRXON Diagnostic Modal */}
      <AndroidIrxonModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
        onSelectTelnetBridge={() => {
          setConnType('ssh');
          setHost('127.0.0.1');
          setPort(8022);
          setDeviceName('Android Termux SSH');
          setSelectedModelId('linux-unix-server');
        }}
      />

      {/* Bluetooth Device Picker Modal */}
      <BluetoothDevicePickerModal
        isOpen={showBtPickerModal}
        onClose={() => setShowBtPickerModal(false)}
        baudRate={baudRate}
        onSelectDevice={handleSelectBluetoothDevice}
      />

      {/* Serial COM Port Picker Modal */}
      <SerialPortPickerModal
        isOpen={showSerialPickerModal}
        onClose={() => setShowSerialPickerModal(false)}
        baudRate={baudRate}
        onSelectPort={handleSelectSerialPort}
      />
    </div>
  );
};
