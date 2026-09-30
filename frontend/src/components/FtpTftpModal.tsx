import { safeStorage } from "../utils/safeStorage";
import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Server,
  Play,
  Square,
  Upload,
  Download,
  Trash2,
  FileText,
  FileUp,
  HardDrive,
  Copy,
  Check,
  Terminal,
  Activity,
  RefreshCw,
  FolderSync,
  ShieldCheck,
  Zap,
  Globe,
  RotateCcw,
  Edit3,
  Sliders,
  Send,
  HelpCircle,
  Clock,
  ArrowRight,
  Code
} from 'lucide-react';
import { DeviceProfile } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { fetchSystemNetworkInterfaces, getBestDefaultInterface } from '../services/networkInterfaceService';

export interface ServerFile {
  id: string;
  name: string;
  sizeBytes: number;
  uploadedAt: string;
  type: 'firmware' | 'config' | 'script' | 'package' | 'other';
  checksumMd5?: string;
  description?: string;
}

interface TransferLog {
  id: string;
  timestamp: string;
  protocol: 'TFTP' | 'FTP';
  clientIp: string;
  action: 'READ (RRQ/RETR)' | 'WRITE (WRQ/STOR)';
  filename: string;
  sizeBytes: number;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'ERROR';
  speedKbps?: number;
  progressPercent?: number;
  errorDetail?: string;
}

interface FtpTftpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDevice?: DeviceProfile;
  onExecuteCommand?: (cmd: string) => void;
}

const DEFAULT_FILES: ServerFile[] = [
  {
    id: 'f-1',
    name: 'c2960-lanbasek9-mz.152-7.E7.bin',
    sizeBytes: 15728640, // ~15 MB
    uploadedAt: '2026-08-20 10:15',
    type: 'firmware',
    checksumMd5: 'a8f9c2d1e4b506172839405162738495',
    description: 'Cisco Catalyst 2960 Series IOS Release 15.2(7)E7'
  },
  {
    id: 'f-2',
    name: 'routeros-7.14.3-arm.npk',
    sizeBytes: 13631488, // ~13 MB
    uploadedAt: '2026-08-21 14:30',
    type: 'package',
    checksumMd5: '9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e',
    description: 'MikroTik RouterOS v7.14.3 for ARM (CCR2004/RB4011/RB5009)'
  },
  {
    id: 'f-3',
    name: 'junos-srxsme-21.4R3-S5.4.tgz',
    sizeBytes: 31457280, // ~30 MB
    uploadedAt: '2026-08-22 09:00',
    type: 'firmware',
    checksumMd5: '3f4e5d6c7b8a90123456789abcdef012',
    description: 'Juniper SRX Series Junos OS Recommended Branch'
  },
  {
    id: 'f-4',
    name: 'core_sw_backup_baseline.cfg',
    sizeBytes: 49152, // ~48 KB
    uploadedAt: '2026-08-23 08:20',
    type: 'config',
    checksumMd5: '5d41402abc4b2a76b9719d911017c592',
    description: 'Running configuration golden baseline template'
  },
  {
    id: 'f-5',
    name: 'fortios_v7.4.3.F_build2573.out',
    sizeBytes: 41943040, // ~40 MB
    uploadedAt: '2026-08-22 16:45',
    type: 'firmware',
    checksumMd5: '1234567890abcdef1234567890abcdef',
    description: 'Fortinet FortiGate FortiOS 7.4.3 Firmware'
  }
];

export const FtpTftpModal: React.FC<FtpTftpModalProps> = ({
  isOpen,
  onClose,
  activeDevice,
  onExecuteCommand,
}) => {
  const [activeTab, setActiveTab] = useState<'servers' | 'files' | 'commands' | 'logs' | 'native'>('servers');
  
  // Server Status States
  const [isTftpRunning, setIsTftpRunning] = useState<boolean>(true);
  const [isFtpRunning, setIsFtpRunning] = useState<boolean>(true);
  const [serverIp, setServerIp] = useState<string>('192.168.1.100');
  const [networkInterfaces, setNetworkInterfaces] = useState<{name: string, displayName: string, ipv4: string}[]>([]);
  const [tftpPort, setTftpPort] = useState<number>(69);
  const [ftpPort, setFtpPort] = useState<number>(21);
  const [ftpUser, setFtpUser] = useState<string>('admin');
  const [ftpPassword, setFtpPassword] = useState<string>('69ai_pass');
  const [allowUploads, setAllowUploads] = useState<boolean>(true);
  const [tftpBlockSize, setTftpBlockSize] = useState<number>(1468); // Optimized for Ethernet MTU
  
  // File Repository State
  const [files, setFiles] = useState<ServerFile[]>(() => {
    try {
      const saved = safeStorage.getItem('69ai_ftptftp_files');
      return saved ? JSON.parse(saved) : DEFAULT_FILES;
    } catch {
      return DEFAULT_FILES;
    }
  });

  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id || '');
  const [selectedTargetBrand, setSelectedTargetBrand] = useState<string>(activeDevice?.brand || 'cisco');
  const [customDestinationPath, setCustomDestinationPath] = useState<string>('flash:');
  const [copiedCmdIndex, setCopiedCmdIndex] = useState<string | null>(null);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');
  const [editedCommands, setEditedCommands] = useState<Record<string, string>>({});

  // Transfer Logs State
  const [logs, setLogs] = useState<TransferLog[]>([
    {
      id: 'log-1',
      timestamp: '08:24:11',
      protocol: 'TFTP',
      clientIp: '192.168.1.1 (Cisco-Core-SW)',
      action: 'READ (RRQ/RETR)',
      filename: 'c2960-lanbasek9-mz.152-7.E7.bin',
      sizeBytes: 15728640,
      status: 'SUCCESS',
      speedKbps: 2450,
      progressPercent: 100
    },
    {
      id: 'log-2',
      timestamp: '08:41:05',
      protocol: 'FTP',
      clientIp: '192.168.1.254 (MikroTik-GW)',
      action: 'WRITE (WRQ/STOR)',
      filename: 'mikrotik_backup_auto.rsc',
      sizeBytes: 32768,
      status: 'SUCCESS',
      speedKbps: 840,
      progressPercent: 100
    }
  ]);

  const [activeTransfer, setActiveTransfer] = useState<TransferLog | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync files to localStorage
  useEffect(() => {
    try {
      safeStorage.setItem('69ai_ftptftp_files', JSON.stringify(files));
    } catch (e) {
      // ignore
    }
  }, [files]);

  useEffect(() => {
    if (isOpen) {
      fetchSystemNetworkInterfaces().then(ifaces => {
        setNetworkInterfaces(ifaces);
        const best = getBestDefaultInterface(ifaces);
        if (best && best.ipv4) {
          setServerIp(best.ipv4);
        }
      }).catch(err => {
        console.warn('Gagal mengambil network interfaces:', err);
      });
    }
  }, [isOpen]);

  // Update selected target brand when activeDevice changes
  useEffect(() => {
    if (activeDevice?.brand) {
      setSelectedTargetBrand(activeDevice.brand);
    }
  }, [activeDevice]);

  if (!isOpen) return null;

  const selectedFile = files.find((f) => f.id === selectedFileId) || files[0];

  // Helper formatting
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload file handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const newFiles: ServerFile[] = Array.from(uploadedFiles).map((file, idx) => {
      let type: ServerFile['type'] = 'other';
      if (file.name.endsWith('.bin') || file.name.endsWith('.tar') || file.name.endsWith('.out') || file.name.endsWith('.img') || file.name.endsWith('.tgz')) {
        type = 'firmware';
      } else if (file.name.endsWith('.cfg') || file.name.endsWith('.rsc') || file.name.endsWith('.conf') || file.name.endsWith('.txt')) {
        type = 'config';
      } else if (file.name.endsWith('.npk') || file.name.endsWith('.deb') || file.name.endsWith('.ipk')) {
        type = 'package';
      } else if (file.name.endsWith('.sh') || file.name.endsWith('.py')) {
        type = 'script';
      }

      // Generate dummy md5 checksum for display
      const pseudoHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      return {
        id: `f-${Date.now()}-${idx}`,
        name: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type,
        checksumMd5: pseudoHash,
        description: `Uploaded from local storage (${formatBytes(file.size)})`
      };
    });

    setFiles((prev) => [...newFiles, ...prev]);
    if (newFiles[0]) {
      setSelectedFileId(newFiles[0].id);
    }
  };

  // Delete file handler
  const handleDeleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selectedFileId === id) {
      const remaining = files.filter((f) => f.id !== id);
      setSelectedFileId(remaining[0]?.id || '');
    }
  };

  // Download file to local computer disk (Export / Save)
  const handleDownloadFileToLocalDisk = (file: ServerFile) => {
    try {
      let content = `# 69ai NetEng Tools - Saved File: ${file.name}\n# Checksum MD5: ${file.checksumMd5 || 'N/A'}\n# Timestamp: ${file.uploadedAt}\n# Type: ${file.type}\n\n`;
      if (file.type === 'config') {
        content += `! Golden Configuration Baseline\nversion 15.2\nservice timestamps debug datetime msec\nservice timestamps log datetime msec\nno service password-encryption\nhostname Switch-Core\n!\nspanning-tree mode rapid-pvst\n!\ninterface GigabitEthernet0/1\n description Trunk-to-Distribution\n switchport mode trunk\n!\ninterface Vlan1\n ip address 192.168.1.1 255.255.255.0\n no shutdown\n!\nend\n`;
      } else {
        content += `[69ai Binary / Firmware Container Payload for ${file.name}]\nSize: ${file.sizeBytes} bytes\nValid Checksum: ${file.checksumMd5}\n`;
      }

      const blob = new Blob([content], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  // Simulate receiving incoming backup file from network device
  const handleSimulateDeviceUpload = (brandName: string = 'Cisco') => {
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(/:/g, '-');
    const filename = brandName.toLowerCase() === 'mikrotik'
      ? `mikrotik_backup_${timestamp}.rsc`
      : `${brandName.toLowerCase()}_running_config_${timestamp}.cfg`;

    const newIncomingFile: ServerFile = {
      id: `f-rx-${Date.now()}`,
      name: filename,
      sizeBytes: Math.floor(Math.random() * 64000) + 16000,
      uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: 'config',
      checksumMd5: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      description: `Diterima otomatis dari perangkat (${brandName} @ ${serverIp})`
    };

    setFiles((prev) => [newIncomingFile, ...prev]);
    setSelectedFileId(newIncomingFile.id);

    const clientLabel = activeDevice 
      ? `${activeDevice.ipOrPortLabel.split(' ')[0]} (${activeDevice.name})` 
      : `192.168.1.1 (${brandName}-Device)`;

    const incomingLog: TransferLog = {
      id: `tr-rx-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      protocol: 'TFTP',
      clientIp: clientLabel,
      action: 'WRITE (WRQ/STOR)',
      filename: filename,
      sizeBytes: newIncomingFile.sizeBytes,
      status: 'SUCCESS',
      speedKbps: 1980,
      progressPercent: 100
    };

    setLogs((prev) => [incomingLog, ...prev]);
  };

  // Simulate a live file transfer test
  const handleSimulateTransfer = (protocol: 'TFTP' | 'FTP', fileToTransfer?: ServerFile) => {
    const targetFile = fileToTransfer || selectedFile || files[0];
    if (!targetFile) return;

    const clientLabel = activeDevice 
      ? `${activeDevice.ipOrPortLabel.split(' ')[0]} (${activeDevice.name})` 
      : '192.168.1.50 (Switch-Client)';

    const newTransfer: TransferLog = {
      id: `tr-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      protocol,
      clientIp: clientLabel,
      action: 'READ (RRQ/RETR)',
      filename: targetFile.name,
      sizeBytes: targetFile.sizeBytes,
      status: 'IN_PROGRESS',
      speedKbps: protocol === 'TFTP' ? 1850 : 3400,
      progressPercent: 5
    };

    setActiveTransfer(newTransfer);

    // Progressive transfer simulation
    let progress = 5;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setActiveTransfer(null);
        
        const completedLog: TransferLog = {
          ...newTransfer,
          progressPercent: 100,
          status: 'SUCCESS'
        };
        setLogs((prev) => [completedLog, ...prev]);
      } else {
        setActiveTransfer((prev) => prev ? { ...prev, progressPercent: progress } : null);
      }
    }, 400);
  };

  // Copy to clipboard helper
  const handleCopyCommand = (cmd: string, key: string) => {
    copyToClipboard(cmd);
    setCopiedCmdIndex(key);
    setTimeout(() => setCopiedCmdIndex(null), 2000);
  };

  // Execute directly in terminal
  const handleExecute = (cmd: string) => {
    if (onExecuteCommand) {
      onExecuteCommand(cmd);
      onClose();
    }
  };

  // Generate dynamic commands according to vendor & protocol
  const generateCommands = () => {
    const fn = selectedFile?.name || 'firmware.bin';
    const ip = serverIp;
    const user = ftpUser;
    const pass = ftpPassword;
    const dest = customDestinationPath || 'flash:';

    const cmdList: {
      category: string;
      title: string;
      protocol: 'TFTP' | 'FTP';
      command: string;
      description: string;
    }[] = [];

    // Cisco IOS Commands
    if (selectedTargetBrand === 'cisco' || selectedTargetBrand === 'all') {
      cmdList.push(
        {
          category: 'Cisco IOS',
          title: 'TFTP: Download Firmware / IOS Image ke Flash',
          protocol: 'TFTP',
          command: `copy tftp://${ip}/${fn} ${dest}`,
          description: 'Menyalin file firmware dari TFTP server langsung ke penyimpanan flash internal switch/router.'
        },
        {
          category: 'Cisco IOS',
          title: 'TFTP: Backup Running-Config ke TFTP Server',
          protocol: 'TFTP',
          command: `copy running-config tftp://${ip}/cisco_backup_${new Date().toISOString().slice(0,10)}.cfg`,
          description: 'Mencadangkan konfigurasi aktif perangkat ke TFTP server.'
        },
        {
          category: 'Cisco IOS',
          title: 'FTP: Download File via FTP Autentikasi',
          protocol: 'FTP',
          command: `copy ftp://${user}:${pass}@${ip}/${fn} ${dest}`,
          description: 'Mengunduh file berkecepatan tinggi via FTP dengan kredensial login.'
        },
        {
          category: 'Cisco IOS (ROMMON Recovery)',
          title: 'ROMMON: TFTP Boot Recovery (Mode Darurat)',
          protocol: 'TFTP',
          command: `IP_ADDRESS=192.168.1.50\nIP_SUBNET_MASK=255.255.255.0\nDEFAULT_GATEWAY=${ip}\nTFTP_SERVER=${ip}\nTFTP_FILE=${fn}\ntftpdnld`,
          description: 'Perintah pemulihan firmware saat Cisco masuk mode rommon 1 >.'
        }
      );
    }

    // MikroTik RouterOS Commands
    if (selectedTargetBrand === 'mikrotik' || selectedTargetBrand === 'all') {
      cmdList.push(
        {
          category: 'MikroTik RouterOS',
          title: 'TFTP / Fetch: Download Paket NPK RouterOS',
          protocol: 'TFTP',
          command: `/tool fetch url="tftp://${ip}/${fn}" mode=tftp`,
          description: 'Mengunduh package update MikroTik NPK via TFTP ke root storage.'
        },
        {
          category: 'MikroTik RouterOS',
          title: 'FTP: Upload / Backup Konfigurasi RSC ke FTP Server',
          protocol: 'FTP',
          command: `/export file=backup_today\n/tool fetch address=${ip} port=${ftpPort} user=${user} password=${pass} src-path=backup_today.rsc dst-path=mikrotik_backup.rsc mode=ftp upload=yes`,
          description: 'Ekspor konfigurasi script RouterOS dan upload ke FTP server.'
        },
        {
          category: 'MikroTik Netinstall',
          title: 'Netinstall (PXE/TFTP Server IP Boot)',
          protocol: 'TFTP',
          command: `# Set Client IP: 192.168.1.88, Server Boot IP: ${ip}\n# Jalankan netinstall dengan paket: ${fn}`,
          description: 'Format re-flash RouterOS via Netinstall TFTP boot.'
        }
      );
    }

    // Juniper Junos Commands
    if (selectedTargetBrand === 'juniper' || selectedTargetBrand === 'all') {
      cmdList.push(
        {
          category: 'Juniper Junos',
          title: 'TFTP: Upgrade Software Junos OS',
          protocol: 'TFTP',
          command: `request system software add tftp://${ip}/${fn} reboot`,
          description: 'Mengunduh dan langsung memverifikasi paket firmware Junos, kemudian reboot.'
        },
        {
          category: 'Juniper Junos',
          title: 'FTP: Salin File Konfigurasi / Rescue',
          protocol: 'FTP',
          command: `file copy ftp://${user}:${pass}@${ip}/${fn} /var/tmp/`,
          description: 'Menyalin file dari FTP server ke direktori lokal /var/tmp/ Junos.'
        }
      );
    }

    // Fortinet FortiOS Commands
    if (selectedTargetBrand === 'fortinet' || selectedTargetBrand === 'all') {
      cmdList.push(
        {
          category: 'Fortinet FortiOS',
          title: 'TFTP: Restore Firmware Image FortiGate',
          protocol: 'TFTP',
          command: `execute restore image tftp ${fn} ${ip}`,
          description: 'Memperbarui firmware FortiOS melalui server TFTP.'
        },
        {
          category: 'Fortinet FortiOS',
          title: 'TFTP: Backup / Restore Konfigurasi',
          protocol: 'TFTP',
          command: `execute backup config tftp backup_fgt.conf ${ip}\nexecute restore config tftp ${fn} ${ip}`,
          description: 'Pencadangan atau pemulihan file konfigurasi firewall.'
        }
      );
    }

    // Linux / OpenWrt / Generic Unix
    if (selectedTargetBrand === 'linux' || selectedTargetBrand === 'openwrt' || selectedTargetBrand === 'custom' || selectedTargetBrand === 'all') {
      cmdList.push(
        {
          category: 'Linux / OpenWrt CLI',
          title: 'TFTP Client: Get File (tftp-hpa / busybox)',
          protocol: 'TFTP',
          command: `tftp -g -r ${fn} ${ip}`,
          description: 'Mengunduh file dari TFTP server menggunakan tool standar tftp Linux/OpenWrt.'
        },
        {
          category: 'Linux / OpenWrt CLI',
          title: 'Wget / Curl: Unduh via FTP Anonymous / Auth',
          protocol: 'FTP',
          command: `wget ftp://${user}:${pass}@${ip}:${ftpPort}/${fn} -O /tmp/${fn}`,
          description: 'Download file via wget FTP stream.'
        },
        {
          category: 'Linux / OpenWrt CLI',
          title: 'TFTP Client: Upload / Put File ke Server',
          protocol: 'TFTP',
          command: `tftp -p -l /etc/config/network -r openwrt_network_backup.cfg ${ip}`,
          description: 'Mengirimkan file lokal Linux ke TFTP server direktori.'
        }
      );
    }

    return cmdList;
  };

  const filteredFiles = files.filter((f) => 
    f.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  return (
    <div 
      id="modal-ftp-tftp-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
    >
      <div 
        id="modal-ftp-tftp-box"
        className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-200"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-base">
                  FTP & TFTP File Server
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  UDP 69 / TCP 21
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800 hidden sm:inline">
                  Firmware & Config Depot
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pusat transfer berkas, firmware OS image, dan backup konfigurasi ke perangkat jaringan (Cisco, MikroTik, Juniper, Fortinet, Linux)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className={`w-2 h-2 rounded-full ${isTftpRunning || isFtpRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="font-mono text-slate-300 text-[11px]">
                {isTftpRunning && isFtpRunning ? 'TFTP & FTP ACTIVE' : isTftpRunning ? 'TFTP ACTIVE' : isFtpRunning ? 'FTP ACTIVE' : 'SERVERS STOPPED'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-4 sm:px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('servers')}
              className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'servers'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>1. Status & Konfigurasi Server</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'files'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>2. File Repository ({files.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('commands')}
              className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'commands'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>3. Command Generator & Eksekusi CLI</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>4. Transfer Logs & Monitor</span>
              {logs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                  {logs.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('native')}
              className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'native'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>5. Script Daemon On-Premise</span>
            </button>
          </div>

          {/* Quick Active Device Badge */}
          {activeDevice && (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300 font-medium">Target: {activeDevice.name}</span>
            </div>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* TAB 1: SERVERS CONFIGURATION & CONTROLS */}
          {activeTab === 'servers' && (
            <div className="space-y-5">
              {/* Top Server Control Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* TFTP Server Card */}
                <div className={`p-4 rounded-xl border transition-all ${
                  isTftpRunning
                    ? 'bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-amber-800/60 shadow-md'
                    : 'bg-slate-950 border-slate-800 opacity-80'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${isTftpRunning ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                          TFTP Server Service
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isTftpRunning ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isTftpRunning ? 'RUNNING' : 'STOPPED'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">Trivial File Transfer Protocol (RFC 1350, UDP Port {tftpPort})</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsTftpRunning(!isTftpRunning)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                        isTftpRunning
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isTftpRunning ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Service</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Service</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs pt-2 border-t border-slate-800/80">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Port UDP TFTP:</label>
                        <input
                          type="number"
                          value={tftpPort}
                          onChange={(e) => setTftpPort(parseInt(e.target.value) || 69)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Blocksize (MTU Optimization):</label>
                        <select
                          value={tftpBlockSize}
                          onChange={(e) => setTftpBlockSize(parseInt(e.target.value) || 512)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-500 focus:outline-hidden"
                        >
                          <option value={512}>512 bytes (Standard RFC 1350)</option>
                          <option value={1468}>1468 bytes (Fast Ethernet / MTU 1500)</option>
                          <option value={8192}>8192 bytes (High Speed Jumbo Frame)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Protokol Transport: <strong>UDP Datagram</strong></span>
                      <button
                        onClick={() => handleSimulateTransfer('TFTP')}
                        className="text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Uji Transfer TFTP</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* FTP Server Card */}
                <div className={`p-4 rounded-xl border transition-all ${
                  isFtpRunning
                    ? 'bg-gradient-to-br from-blue-950/40 via-slate-950 to-slate-900 border-blue-800/60 shadow-md'
                    : 'bg-slate-950 border-slate-800 opacity-80'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${isFtpRunning ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                          FTP Server Service
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isFtpRunning ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {isFtpRunning ? 'RUNNING' : 'STOPPED'}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">File Transfer Protocol (TCP Control {ftpPort} + Data)</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsFtpRunning(!isFtpRunning)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                        isFtpRunning
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {isFtpRunning ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Service</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Service</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs pt-2 border-t border-slate-800/80">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Port TCP FTP:</label>
                        <input
                          type="number"
                          value={ftpPort}
                          onChange={(e) => setFtpPort(parseInt(e.target.value) || 21)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Username:</label>
                        <input
                          type="text"
                          value={ftpUser}
                          onChange={(e) => setFtpUser(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[11px] block mb-1">Password:</label>
                        <input
                          type="text"
                          value={ftpPassword}
                          onChange={(e) => setFtpPassword(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white font-mono text-xs focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Mode: <strong>Passive (PASV) & Active</strong></span>
                      <button
                        onClick={() => handleSimulateTransfer('FTP')}
                        className="text-blue-400 hover:text-blue-300 font-medium underline flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        <span>Uji Transfer FTP</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* IP Binding & Network Settings */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xs text-slate-200 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Konfigurasi IP Binding & Akses Jaringan Lokal</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Pilih IP yang berada dalam 1 subnet dengan perangkat router/switch</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs block mb-1">IP Server (Pilih / Ketik):</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={serverIp}
                        onChange={(e) => setServerIp(e.target.value)}
                        placeholder="192.168.1.100"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Interface Adapter Fisik Laptop/PC:</label>
                    <select
                      onChange={(e) => setServerIp(e.target.value)}
                      value={serverIp}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-hidden"
                    >
                      {networkInterfaces.length > 0 ? (
                        <>
                          <optgroup label="Physical/Virtual Interfaces">
                            {networkInterfaces.map(iface => (
                              <option key={iface.name} value={iface.ipv4 || ''}>
                                {iface.ipv4} ({iface.displayName || iface.name})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Presets Default">
                            <option value="192.168.1.100">192.168.1.100 (Default LAN Subnet 1)</option>
                            <option value="192.168.88.100">192.168.88.100 (MikroTik Default Subnet)</option>
                            <option value="10.0.0.100">10.0.0.100 (Class A Management)</option>
                            <option value="172.16.1.100">172.16.1.100 (Class B Enterprise)</option>
                            <option value="127.0.0.1">127.0.0.1 (Localhost Loopback)</option>
                          </optgroup>
                        </>
                      ) : (
                        <>
                          <option value="192.168.1.100">192.168.1.100 (Default LAN Subnet 1)</option>
                          <option value="192.168.88.100">192.168.88.100 (MikroTik Default Subnet)</option>
                          <option value="10.0.0.100">10.0.0.100 (Class A Management)</option>
                          <option value="172.16.1.100">172.16.1.100 (Class B Enterprise)</option>
                          <option value="127.0.0.1">127.0.0.1 (Localhost Loopback)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 text-xs block mb-1">Izin Tulis / Upload Klien:</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="allow-upload-check"
                        checked={allowUploads}
                        onChange={(e) => setAllowUploads(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                      />
                      <label htmlFor="allow-upload-check" className="text-xs text-slate-300 cursor-pointer">
                        Izinkan perangkat upload backup (WRQ / STOR)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Active Transfer Banner if any */}
              {activeTransfer && (
                <div className="p-3.5 bg-amber-950/50 border border-amber-700 rounded-xl space-y-2 animate-pulse">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Sedang Mentransfer: {activeTransfer.filename}</span>
                    </div>
                    <span className="font-mono text-amber-200">{activeTransfer.progressPercent}% ({activeTransfer.speedKbps} KB/s)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${activeTransfer.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FILE REPOSITORY MANAGEMENT */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              {/* File Action & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <input
                    type="text"
                    placeholder="Cari file firmware, image, config backup..."
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs placeholder-slate-500 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File ke Server</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateDeviceUpload(activeDevice?.brand || 'Cisco')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    title="Simulasikan penerimaan file backup dari router/switch ke server"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>+ Terima File dr Perangkat (Simulasi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sampleConfig: ServerFile = {
                        id: `f-${Date.now()}`,
                        name: `custom_golden_config_${new Date().toISOString().slice(0,10)}.cfg`,
                        sizeBytes: 16384,
                        uploadedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        type: 'config',
                        checksumMd5: '3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
                        description: 'Custom Golden Config Template dibuat dari editor'
                      };
                      setFiles((prev) => [sampleConfig, ...prev]);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>+ Template Config</span>
                  </button>
                </div>
              </div>

              {/* Files Table List */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                      <tr>
                        <th className="p-3">Nama Berkas (Root Storage)</th>
                        <th className="p-3">Tipe</th>
                        <th className="p-3">Ukuran</th>
                        <th className="p-3">Checksum MD5</th>
                        <th className="p-3">Tanggal Unggah</th>
                        <th className="p-3 text-right">Aksi & Download</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredFiles.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500">
                            Tidak ada berkas yang cocok dalam direktori server. Klik tombol Upload untuk menambahkan file firmware atau config.
                          </td>
                        </tr>
                      ) : (
                        filteredFiles.map((file) => {
                          const isSelected = selectedFileId === file.id;
                          return (
                            <tr 
                              key={file.id}
                              onClick={() => setSelectedFileId(file.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-amber-950/30 text-amber-200 font-medium' 
                                  : 'hover:bg-slate-900/60 text-slate-300'
                              }`}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <FileUp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                                  <div>
                                    <div className="font-mono text-white text-xs">{file.name}</div>
                                    {file.description && (
                                      <div className="text-[10.5px] text-slate-400 truncate max-w-sm">{file.description}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${
                                  file.type === 'firmware' 
                                    ? 'bg-purple-950 text-purple-300 border-purple-800' 
                                    : file.type === 'config'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : file.type === 'package'
                                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}>
                                  {file.type}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-300">
                                {formatBytes(file.sizeBytes)}
                              </td>
                              <td className="p-3 font-mono text-[10.5px] text-slate-400">
                                {file.checksumMd5 ? (
                                  <span className="truncate block max-w-[140px]" title={file.checksumMd5}>
                                    {file.checksumMd5}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="p-3 font-mono text-[11px] text-slate-400">
                                {file.uploadedAt}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {/* Direct Download to Computer Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadFileToLocalDisk(file)}
                                    className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                                    title="Download / Simpan berkas ini ke laptop/komputer lokal"
                                  >
                                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Download</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedFileId(file.id);
                                      setActiveTab('commands');
                                    }}
                                    className="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 text-[11px] font-medium transition-colors"
                                    title="Buat perintah CLI untuk file ini"
                                  >
                                    CLI
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                                    title="Hapus file dari server"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COMMAND GENERATOR & TERMINAL EXECUTION */}
          {activeTab === 'commands' && (
            <div className="space-y-4">
              {/* Parameters Setup Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-amber-400" />
                    <h4 className="font-semibold text-xs text-white">
                      Parameter & Berkas Pengiriman ke Perangkat
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>IP Server: <strong className="text-cyan-400 font-mono">{serverIp}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      Semua perintah dapat diedit bebas
                    </span>
                  </div>
                </div>

                {/* Quick File Selector Chips */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 text-[11px] font-medium flex items-center justify-between">
                    <span>Pilih Berkas yang Mau Dikirim ({files.length} berkas tersedia):</span>
                    <span className="text-amber-400/90 font-mono text-[10px]">Aktif: {selectedFile?.name || '-'}</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-900/60 rounded-lg border border-slate-800/80">
                    {files.map((f) => {
                      const isSelected = f.id === selectedFileId;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFileId(f.id)}
                          className={`px-2.5 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 transition-all text-left ${
                            isSelected
                              ? 'bg-amber-600 text-white font-semibold shadow-xs ring-1 ring-amber-400'
                              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                          }`}
                        >
                          <FileUp className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                          <span className="truncate max-w-[200px]">{f.name}</span>
                          <span className={`text-[10px] px-1 py-0.2 rounded ${isSelected ? 'bg-amber-700 text-amber-100' : 'bg-slate-900 text-slate-400'}`}>
                            {formatBytes(f.sizeBytes)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  {/* Dropdown File Selector as backup */}
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Dropdown Berkas:</label>
                    <select
                      value={selectedFileId}
                      onChange={(e) => setSelectedFileId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-500 focus:outline-hidden"
                    >
                      {files.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({formatBytes(f.sizeBytes)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Brand Selector */}
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Vendor / Sistem Operasi Target:</label>
                    <select
                      value={selectedTargetBrand}
                      onChange={(e) => setSelectedTargetBrand(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-hidden"
                    >
                      <option value="all">Semua Vendor (Tampilkan Semua)</option>
                      <option value="cisco">Cisco Systems (IOS / IOS-XE / ROMMON)</option>
                      <option value="mikrotik">MikroTik (RouterOS v6/v7 & Fetch)</option>
                      <option value="juniper">Juniper Networks (Junos OS)</option>
                      <option value="fortinet">Fortinet (FortiOS FortiGate)</option>
                      <option value="linux">Linux / OpenWrt / BusyBox CLI</option>
                    </select>
                  </div>

                  {/* Destination Path */}
                  <div>
                    <label className="text-slate-400 text-[11px] block mb-1">Lokasi Tujuan di Perangkat:</label>
                    <input
                      type="text"
                      value={customDestinationPath}
                      onChange={(e) => setCustomDestinationPath(e.target.value)}
                      placeholder="flash: atau /var/tmp/"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:border-amber-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Generated Commands List with Direct In-Place Editor */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>Daftar Perintah Siap Pakai ({generateCommands().length} opsi):</span>
                    <span className="text-[11px] text-slate-400 font-normal">(Klik dan ketik langsung di kotak perintah untuk mengedit)</span>
                  </span>
                  
                  {Object.keys(editedCommands).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditedCommands({})}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Semua Edit ke Default</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {generateCommands().map((item, idx) => {
                    const cmdKey = `cmd-${idx}-${item.protocol}-${selectedFileId}`;
                    const isEdited = editedCommands[cmdKey] !== undefined;
                    const commandText = isEdited ? editedCommands[cmdKey] : item.command;
                    const isCopied = copiedCmdIndex === cmdKey;

                    return (
                      <div 
                        key={cmdKey}
                        className={`p-3.5 bg-slate-950 border rounded-xl space-y-2.5 transition-colors ${
                          isEdited ? 'border-amber-600/70 shadow-xs' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              item.protocol === 'TFTP' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                            }`}>
                              {item.protocol}
                            </span>
                            <span className="font-semibold text-xs text-white">{item.title}</span>
                            <span className="text-[10px] text-slate-500">({item.category})</span>
                            {isEdited && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700/60 flex items-center gap-1">
                                <Edit3 className="w-2.5 h-2.5" />
                                Diedit
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isEdited && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditedCommands((prev) => {
                                    const next = { ...prev };
                                    delete next[cmdKey];
                                    return next;
                                  });
                                }}
                                className="px-2 py-1 rounded-md text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                                title="Kembalikan perintah ke template default"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleCopyCommand(commandText, cmdKey)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
                                isCopied
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                              title="Salin perintah ke clipboard"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Salin Command</span>
                                </>
                              )}
                            </button>

                            {onExecuteCommand && (
                              <button
                                type="button"
                                onClick={() => handleExecute(commandText)}
                                className="px-3 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs"
                                title="Kirim dan jalankan langsung ke terminal yang sedang aktif"
                              >
                                <Send className="w-3 h-3" />
                                <span>Kirim ke Terminal</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive Editable Command Textarea */}
                        <div className="relative">
                          <textarea
                            value={commandText}
                            rows={commandText.includes('\n') ? Math.min(commandText.split('\n').length, 7) : 1}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditedCommands((prev) => ({
                                ...prev,
                                [cmdKey]: val
                              }));
                            }}
                            placeholder="Ketik atau sesuaikan perintah CLI..."
                            className="w-full bg-slate-900 p-2.5 pr-8 rounded-lg border border-slate-800 focus:border-amber-500 font-mono text-xs text-amber-300 focus:text-amber-200 outline-hidden transition-all resize-y leading-relaxed"
                            spellCheck={false}
                          />
                          <div className="absolute right-2.5 top-2.5 text-slate-500 pointer-events-none" title="Dapat diedit langsung">
                            <Edit3 className="w-3.5 h-3.5 opacity-60" />
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSFER LOGS & MONITOR */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white">Riwayat & Sesi Transfer Berkas</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateTransfer('TFTP')}
                    className="px-3 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Uji Transfer TFTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogs([])}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors"
                  >
                    Bersihkan Log
                  </button>
                </div>
              </div>

              {/* Logs Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                      <tr>
                        <th className="p-3">Waktu</th>
                        <th className="p-3">Protokol</th>
                        <th className="p-3">IP Klien / Perangkat</th>
                        <th className="p-3">Operasi</th>
                        <th className="p-3">Nama Berkas</th>
                        <th className="p-3">Ukuran</th>
                        <th className="p-3">Kecepatan</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                            Belum ada riwayat aktivitas transfer. Kirim berkas dari perangkat atau klik "Uji Transfer TFTP".
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-900/60">
                            <td className="p-3 text-slate-400">{log.timestamp}</td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                log.protocol === 'TFTP' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-blue-950 text-blue-400 border border-blue-800'
                              }`}>
                                {log.protocol}
                              </span>
                            </td>
                            <td className="p-3 text-slate-300 font-sans">{log.clientIp}</td>
                            <td className="p-3 text-slate-300">{log.action}</td>
                            <td className="p-3 text-white">{log.filename}</td>
                            <td className="p-3 text-slate-400">{formatBytes(log.sizeBytes)}</td>
                            <td className="p-3 text-slate-300">{log.speedKbps ? `${log.speedKbps} KB/s` : '-'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : log.status === 'IN_PROGRESS'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                                  : 'bg-red-950 text-red-300 border border-red-800'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ON-PREMISE DAEMON SCRIPTS */}
          {activeTab === 'native' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <h4 className="font-semibold text-xs text-white flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  <span>Jalankan Native Socket TFTP & FTP Server di Laptop / Komputer Lokal Anda</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Jika Anda ingin membuka port socket UDP 69 & TCP 21 langsung pada sistem operasi host (Linux, macOS, atau Windows) di lapangan tanpa instalasi software berbayar (seperti SolarWinds / Tftpd32), gunakan one-liner Python atau script di bawah ini:
                </p>
              </div>

              {/* One-Liner Python TFTP & FTP Script */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Python TFTP Daemon */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-amber-400 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5" />
                      1. Python Standalone TFTP Server
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand(
                        `python3 -c "import tftpy; server = tftpy.TftpServer('/path/to/tftp_root'); server.listen('0.0.0.0', 69)"`,
                        'py-tftp'
                      )}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
                    >
                      {copiedCmdIndex === 'py-tftp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Salin Python</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-200 select-all overflow-x-auto whitespace-pre-wrap">
{`# Install library (hanya sekali)
pip install tftpy

# Jalankan server di port 69
sudo python3 -c "
import tftpy
server = tftpy.TftpServer('.')
server.listen('0.0.0.0', 69)
"`}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Menjadikan folder saat ini sebagai direktori root TFTP dengan binding ke semua IP (`0.0.0.0`).
                  </p>
                </div>

                {/* Python FTP Daemon */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-blue-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      2. Python Standalone FTP Server
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCommand(
                        `sudo python3 -m pyftpdlib -p 21 -w -u admin -P 69ai_pass`,
                        'py-ftp'
                      )}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs flex items-center gap-1"
                    >
                      {copiedCmdIndex === 'py-ftp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Salin Python</span>
                    </button>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-blue-200 select-all overflow-x-auto whitespace-pre-wrap">
{`# Install library pyftpdlib
pip install pyftpdlib

# Jalankan server FTP dengan write-permission
sudo python3 -m pyftpdlib -p 21 -w -u admin -P 69ai_pass`}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Membuka server FTP port 21 dengan user `admin` dan password `69ai_pass`.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>File di Root: <strong className="text-white">{files.length} berkas</strong> ({formatBytes(files.reduce((acc, f) => acc + f.sizeBytes, 0))})</span>
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline">IP Server: <strong className="text-cyan-300 font-mono">{serverIp}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('commands')}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Buka Generator Perintah CLI</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-medium transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
