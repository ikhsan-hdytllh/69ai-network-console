import { safeStorage } from "../utils/safeStorage";
import { SHARE_TERMINAL_WITH_AI_KEY } from '../config/release';
import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Bot, 
  Sparkles, 
  Layers, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  X, 
  Play, 
  Square,
  Activity,
  Copy, 
  Check, 
  Bookmark, 
  BookmarkCheck, 
  Terminal, 
  Trash2, 
  Pin, 
  Link, 
  Server,
  CheckCircle2, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Plus,
  MessageSquare,
  Edit2,
  FolderPlus,
  MoreVertical,
  UserCheck,
  LogIn,
  Mail,
  History,
  Search,
  ArrowUpRight,
  HelpCircle,
  HardDrive,
  Maximize2,
  Minimize2,
  Key,
  RotateCcw
} from 'lucide-react';
import { DeviceBrand, DeviceProfile, ChatMessage } from '../types';
import { searchOfflineDatabase } from '../data/offlineCommandDatabase';
import { analyzeTerminalBufferLocally, analyzeRunningConfigLocally, detectTerminalAnomalies, TerminalDiagnosisResult } from '../services/terminalAnalyzer';
import { resolveDeviceRealHostname } from '../services/serialConnection';
import { addCachedCommand, saveOnlineSearchDoc, getUnifiedBrandCatalog, autoHarvestAiResponseToOfflineKb } from '../services/dbStorage';
import { ProviderLoginModal } from './ProviderLoginModal';
import { getSavedProviderAccounts, AIProviderId, validateAiConnection, AIValidationResult } from '../services/providerAuthService';
import { copyToClipboard } from '../utils/clipboard';
import { sendNetworkAiChat, analyzeTerminalScreenDirect, generateExpertNetworkResponse } from '../services/aiClientService';
import { 
  getLatestDeviceSnapshot, 
  saveDeviceSnapshot, 
  createSnapshotFromConfig, 
  captureRunningConfigViaBackgroundExec, 
  getRunningConfigCommandForBrand 
} from '../services/configSnapshotService';

/**
 * Check if a single CLI line is a read-only show/get/display/diagnostic inspection command
 */
export function isLineReadOnlyInspection(rawLine: string): boolean {
  const line = (rawLine || '').trim().toLowerCase();
  if (!line) return false;

  // MikroTik read-only print/monitor/export/get
  if (line.startsWith('/')) {
    if (
      line.includes(' add ') || 
      line.includes(' set ') || 
      line.includes(' remove ') || 
      line.includes(' disable ') || 
      line.includes(' enable ') ||
      line.includes(' reset')
    ) {
      return false;
    }
    if (
      line.includes(' print') || 
      line.includes(' monitor') || 
      line.includes(' export') || 
      line.includes(' get') ||
      line.startsWith('/ping') ||
      line.startsWith('/tool traceroute') ||
      line.startsWith('/tool profile')
    ) {
      return true;
    }
  }

  // Common show/display/get inspection starters across Cisco, Fortinet, Juniper, Huawei, Linux, etc.
  // Note: Handles pipe filters like "| include up", "| inc up", "| grep ...", "| begin ...", "| section ..."
  const readOnlyStarters = [
    'show ', 'show', 'sh ', 'sh',
    'display ', 'display', 'disp ', 'disp',
    'get ', 'diagnose ', 'diag ',
    'execute ping', 'execute traceroute',
    'ping ', 'ping', 'traceroute ', 'traceroute', 'tracert ', 'mtr ', 'tracepath ',
    'ip a', 'ip addr', 'ip -br', 'ip link', 'ip route', 'ip neigh', 'ip rule',
    'cat ', 'grep ', 'uname', 'uptime', 'free', 'df ', 'ps ', 'top', 'htop', 'netstat ', 'ss ', 'ethtool ',
    'systemctl status ', 'service ', 'journalctl ',
    'curl ', 'wget ', 'tcpdump '
  ];

  return readOnlyStarters.some(starter => line === starter || line.startsWith(starter));
}

/**
 * Check if a single CLI line modifies device configuration or enters configuration mode
 */
export function isLineConfigChanging(rawLine: string): boolean {
  const line = (rawLine || '').trim().toLowerCase();
  if (!line) return false;

  // If the command is a read-only inspection command (even with pipes like | include, | begin, | grep), it is NEVER a config command!
  if (isLineReadOnlyInspection(line)) {
    return false;
  }

  // MikroTik configuration command
  if (line.startsWith('/')) {
    return (
      line.includes(' add ') || 
      line.includes(' set ') || 
      line.includes(' remove ') || 
      line.includes(' disable ') || 
      line.includes(' enable ') ||
      line.includes(' reset') ||
      line.endsWith(' add') ||
      line.endsWith(' set') ||
      line.endsWith(' remove') ||
      line.endsWith(' reset')
    );
  }

  // Exact prefix matchers for config mode & configuration statements
  // MUST match at start of line (startsWith) to avoid false positives with show commands or pipe filters!
  const configPrefixes = [
    // Configuration Mode Entry
    'configure terminal', 'config terminal', 'conf t', 'config t', 'conf term', 'config term',
    'configure private', 'configure exclusive', 'configure dynamic', 'configure batch',
    'config global', 'config system', 'config router', 'config firewall', 'config vpn', 'config switch', 'config user',
    
    // Subsystem & Interface Configuration
    'interface ', 'int gi', 'int fa', 'int te', 'int eth', 'int vlan', 'int lo', 'int tw', 'int fo', 'int hu', 'int ser',
    'router ospf', 'router bgp', 'router rip', 'router eigrp', 'router isis',
    'ip address ', 'ipv6 address ', 'ip route ', 'ipv6 route ', 'ip default-gateway ',
    'switchport ', 'vlan ', 'encapsulation dot1q', 'channel-group ', 'port-channel ',
    'spanning-tree ',
    
    // Fortinet / Junos configuration verbs
    'set ', 'unset ', 'edit ', 'next', 'end',
    
    // Deletion & Interface State verbs
    'no ', 'shutdown', 'no shutdown', 'no shut',
    
    // Device & Identity configuration
    'hostname ', 'host ', 'username ', 'user ', 'password ', 'secret ', 'enable secret', 'enable password',
    'crypto ', 'tunnel ', 'access-list ', 'ip access-list', 'ipv6 access-list', 'permit ', 'deny ',
    'line con', 'line vty', 'line aux', 'transport input', 'login local',
    'service password-encryption', 'service dhcp',
    'ip dhcp pool', 'network ', 'default-router ', 'dns-server ',
    
    // Write & Commit & Reboot
    'commit', 'write memory', 'write mem', 'wr', 'copy run start', 'copy running-config',
    'reload', 'reboot',
    
    // Linux system configuration
    'iptables -', 'ufw ', 'systemctl restart', 'systemctl stop', 'systemctl start', 'systemctl enable', 'systemctl disable',
    'netplan apply', 'apt install', 'apt remove', 'yum install', 'dnf install', 'apk add'
  ];

  return configPrefixes.some(kw => line === kw.trim() || line.startsWith(kw));
}

/**
 * Check if a command enters configuration mode or modifies device configuration
 */
export function isConfigChangingCommand(lineOrBlock: string): boolean {
  if (!lineOrBlock) return false;
  const lines = lineOrBlock.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  return lines.some(line => isLineConfigChanging(line));
}

/**
 * Check if a command is a read-only show/get/display/diagnostic inspection command
 */
export function isReadOnlyInspectionCommand(lineOrBlock: string): boolean {
  if (!lineOrBlock) return false;
  const lines = lineOrBlock.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  return lines.every(line => isLineReadOnlyInspection(line)) && !lines.some(line => isLineConfigChanging(line));
}

/**
 * Maps common natural language inspection queries to device-specific read-only CLI commands
 */
export function detectInspectionCommandFromQuery(query: string, brand: string = 'cisco', model: string = ''): string | null {
  const q = (query || '').trim();
  if (!q) return null;
  const lower = q.toLowerCase();

  // 1. If query is directly already a valid read-only CLI command:
  const cleanCmd = q.replace(/^[`"'\s]+|[`"'\s]+$/g, '');
  if (isReadOnlyInspectionCommand(cleanCmd)) {
    return cleanCmd;
  }

// Filter out complex analytical or conditional questions (e.g. "yang tidak punya ip", "mana yang down", "kenapa error", "analisa...")
  const isAnalyticalOrFilter = /\b(tidak|tanpa|unassigned|belum|kenapa|mengapa|masalah|troubleshoot|analisa|analisis|bandingkan|mana\s*yang|yang\s*mana|yang\s*tidak|yang\s*tanpa|yang\s*belum|yang\s*down|yang\s*mati|yang\s*up|yang\s*error|berapa\s*banyak|apakah\s*ada|ringkas|summarykan)\b/i.test(lower);
  if (isAnalyticalOrFilter) {
    return null;
  }

  // If query contains config modification intentions, skip auto-exec
  const isModification = /\b(ganti|ubah|rubah|buat|bikin|tambah|hapus|delete|set|create|remove|matikan|disable|enable|konfigurasi|config)\b/i.test(lower);
  if (isModification) {
    return null;
  }

  const b = (brand || 'cisco').toLowerCase();
  const isCisco = b.includes('cisco');
  const isMikrotik = b.includes('mikrotik') || b.includes('routeros');
  const isLinux = b.includes('linux') || b.includes('ubuntu') || b.includes('debian') || b.includes('server');
  const isFortinet = b.includes('fortinet') || b.includes('fortigate') || b.includes('fortios');
  const isJuniper = b.includes('juniper') || b.includes('junos');
  const isHuawei = b.includes('huawei') || b.includes('vrp');
  const isHpe = b.includes('hpe') || b.includes('aruba');

  // Ping / ICMP test
  const pingMatch = lower.match(/\bping\s+([a-zA-Z0-9_.:\-]+)/i);
  if (pingMatch) {
    const target = pingMatch[1];
    if (isMikrotik) return `/ping ${target} count=4`;
    if (isLinux) return `ping -c 4 ${target}`;
    if (isFortinet) return `execute ping ${target}`;
    if (isJuniper) return `ping ${target} count 4`;
    return `ping ${target}`;
  }

  // VLAN (Check BEFORE generic IP address so "cek vlan" is never hijacked by IP matchers)
  if (/\b(vlan|vlans|switchport|trunk|trunking)\b/i.test(lower) && /\b(cek|lihat|tampilkan|show|ada|daftar|status|info)\b/i.test(lower)) {
    if (isMikrotik) return '/interface vlan print';
    if (isLinux) return 'ip -d link show type vlan';
    if (isFortinet) return 'get system interface';
    if (isJuniper) return 'show vlans';
    if (isHuawei) return 'display vlan';
    return 'show vlan brief';
  }

  // IP Address / Interface Status
  if (
    /\b(ip\s*address|cek\s*ip|lihat\s*ip|tampilkan\s*ip|ip\s*apa|status\s*ip|daftar\s*ip)\b/i.test(lower) ||
    (/\b(interface|port|link)\b/i.test(lower) && /\b(cek|status|lihat|tampilkan|kondisi|daftar)\b/i.test(lower))
  ) {
    const wantsOnlyUp = /\b(hanya\s*up|yang\s*up|up\s*saja|only\s*up)\b/i.test(lower);
    if (isMikrotik) return wantsOnlyUp ? '/ip address print where disabled=no' : '/ip address print';
    if (isLinux) return wantsOnlyUp ? 'ip -br link show up' : 'ip a';
    if (isFortinet) return 'get system interface';
    if (isJuniper) return 'show interfaces terse';
    if (isHuawei) return wantsOnlyUp ? 'display ip interface brief | include up' : 'display ip interface brief';
    return wantsOnlyUp ? 'show ip interface brief | include up' : 'show ip interface brief';
  }

  // ARP Table / MAC Table
  if (/\b(arp|mac\s*address|tabel\s*arp|arp\s*table)\b/i.test(lower) && /\b(cek|lihat|tampilkan|show|daftar)\b/i.test(lower)) {
    if (lower.includes('mac') && isCisco) return 'show mac address-table';
    if (isMikrotik) return '/ip arp print';
    if (isLinux) return 'ip neigh';
    if (isFortinet) return 'get system arp';
    if (isJuniper) return 'show arp';
    if (isHuawei) return 'display arp';
    return 'show ip arp';
  }

  // BGP
  if (/\b(bgp|peer\s*bgp|bgp\s*summary|tetangga\s*bgp)\b/i.test(lower)) {
    if (isMikrotik) return '/routing bgp session print';
    if (isLinux) return 'vtysh -c "show ip bgp summary"';
    if (isFortinet) return 'get router info bgp summary';
    if (isJuniper) return 'show bgp summary';
    if (isHuawei) return 'display bgp peer';
    return 'show ip bgp summary';
  }

  // OSPF
  if (/\b(ospf|neighbor\s*ospf|tetangga\s*ospf)\b/i.test(lower)) {
    if (isMikrotik) return '/routing ospf neighbor print';
    if (isLinux) return 'vtysh -c "show ip ospf neighbor"';
    if (isFortinet) return 'get router info ospf neighbor';
    if (isJuniper) return 'show ospf neighbor';
    if (isHuawei) return 'display ospf peer';
    return 'show ip ospf neighbor';
  }

  // Version / Resource / System Info / CPU / Memory
  if (
    /\b(versi|version|firmware|tipe\s*perangkat|spesifikasi|cpu|memory|ram|resource|suhu|uptime)\b/i.test(lower) &&
    /\b(cek|lihat|tampilkan|show|info|berapa|status)\b/i.test(lower)
  ) {
    if (isMikrotik) return '/system resource print';
    if (isLinux) return 'uname -a && free -h && uptime';
    if (isFortinet) return 'get system status';
    if (isJuniper) return 'show version';
    if (isHuawei) return 'display version';
    return 'show version';
  }

  // Running Configuration
  if (
    /\b(running\s*config|run\s*config|running-config|konfigurasi\s*aktif|konfigurasi\s*saat\s*ini)\b/i.test(lower) ||
    (/\b(konfigurasi|config)\b/i.test(lower) && /\b(lihat|tampilkan|show|cek|baca)\b/i.test(lower))
  ) {
    if (isMikrotik) return '/export compact';
    if (isLinux) return 'cat /etc/netplan/*.yaml 2>/dev/null || cat /etc/network/interfaces 2>/dev/null';
    if (isFortinet) return 'show full-configuration';
    if (isJuniper) return 'show configuration';
    if (isHuawei) return 'display current-configuration';
    return 'show running-config';
  }

  // Cellular / GPS / Modem
  if (/\b(cellular|modem|lte|sim|gps)\b/i.test(lower)) {
    if (lower.includes('gps')) return 'show cellular 0/4/0 gps';
    return 'show cellular 0/4/0 all';
  }

  // NTP / Clock
  if (/\b(ntp|jam|clock|waktu)\b/i.test(lower) && /\b(cek|status|lihat|tampilkan)\b/i.test(lower)) {
    if (isLinux) return 'timedatectl';
    if (isMikrotik) return '/system ntp client print';
    return 'show ntp status';
  }

  // Logs
  if (/\b(log|logging|syslog|error\s*log)\b/i.test(lower) && /\b(cek|lihat|tampilkan|show)\b/i.test(lower)) {
    if (isMikrotik) return '/log print';
    if (isLinux) return 'journalctl -n 50 --no-pager';
    if (isFortinet) return 'execute log display';
    if (isJuniper) return 'show log messages';
    return 'show logging';
  }

  return null;
}

// Check if a line is an executable device command
function isExecutableDeviceCommand(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return false;

  const validStarters = [
    'show ', 'display ', 'get ', 'diagnose ', 'execute ', 'config ', 'interface ',
    'router ', 'ip ', 'ping ', 'traceroute ', 'telnet ', 'ssh ', 'systemctl ',
    'docker ', 'journalctl ', 'cat ', 'ls ', 'ps ', 'df ', 'free ', 'uptime ',
    'top ', 'htop ', 'curl ', 'wget ', 'chmod ', 'chown ', 'sudo ', 'apt ',
    'dnf ', 'yum ', 'service ', 'ufw ', 'iptables ', 'nft ', 'netstat ', 'ss ',
    '/ip ', '/system ', '/interface ', '/routing ', '/tool ', '/log ', '/radius ',
    'cisco', 'switch', 'router', 'uname ', 'dmesg ', 'grep ', 'write ', 
    'delete ', 'copy ', 'set ', 'add ', 'commit', 'clear ', 'reset ', 
    'reboot', 'enable', 'disable', 'vlan ', 'no ', 'do ', 'mac-address ', 'mac ', 'arp ',
    'echo ', 'export ', 'cd ', 'mkdir ', 'rm ', 'mv ', 'cp ', 'tar ', 'unzip ',
    'bash ', 'sh ', 'python ', 'node ', 'npm ', 'yarn ', 'git ', 'tail ', 'head ', 'awk ', 'sed ',
    'sysctl '
  ];

  const validExact = [
    'show', 'display', 'get', 'docker ps', 'docker status', 'ip a', 'ip route',
    'reload', 'exit', 'quit', 'end', 'commit', 'write', 'enable', 'disable',
    'reset', 'reboot'
  ];

  const lower = trimmed.toLowerCase();
  return validStarters.some(starter => lower.startsWith(starter)) || 
         validExact.includes(lower);
}

// Gemini Web styled Code Block Card with interactive Pre-Execution Editing
const CodeBlockCard: React.FC<{
  codeText: string;
  lang?: string;
  msgId: string;
  activeDeviceName?: string;
  onExecute: (cmd: string) => void;
  onExecuteAndInspect: (cmd: string) => void;
  onCopy: (cmd: string) => void;
  copiedCmd: string | null;
  executedCmd: string | null;
}> = ({
  codeText,
  lang = 'text',
  activeDeviceName,
  onExecute,
  onExecuteAndInspect,
  onCopy,
  copiedCmd,
}) => {
  const [editedCode, setEditedCode] = useState<string>(codeText);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [rowEditValues, setRowEditValues] = useState<Record<number, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep editedCode in sync if original codeText updates (e.g. streaming chunks)
  useEffect(() => {
    setEditedCode(codeText);
  }, [codeText]);

  const isModified = editedCode.trim() !== codeText.trim();
  const targetLabel = activeDeviceName || 'Terminal Aktif';
  const isAllCopied = copiedCmd === editedCode || copiedCmd === codeText;

  // Split lines from current editedCode
  const lines = editedCode.split('\n');

  // Clean executable lines to send
  const executableCommands = lines
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//') && !/^\d+\.\s/.test(l) && !/^[-*]\s/.test(l))
    .map(l => l.replace(/^\$\s*/, ''))
    .filter(l => isExecutableDeviceCommand(l));

  const primaryCommand = executableCommands.length > 0 
    ? executableCommands.join('\n') 
    : lines
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.startsWith('#') && !/^\d+\.\s/.test(l) && !/^[-*]\s/.test(l))
        .map(l => l.replace(/^\$\s*/, ''))
        .filter(l => isExecutableDeviceCommand(l))
        .join('\n') || editedCode;

  const hasMultipleCommands = executableCommands.length > 1;

  const getLangDisplay = (l: string) => {
    const map: Record<string, string> = {
      'text': 'Plaintext',
      'bash': 'Bash',
      'sh': 'Shell',
      'cisco': 'Cisco IOS',
      'junos': 'Juniper Junos',
      'routeros': 'MikroTik RouterOS',
      'mikrotik': 'RouterOS',
      'linux': 'Linux CLI',
      'fortinet': 'FortiOS CLI',
      'fortios': 'FortiOS CLI',
      'alliedtelesis': 'AlliedWare+ CLI',
      'allied': 'AlliedWare Plus',
      'awplus': 'AlliedWare+ CLI'
    };
    return map[l.toLowerCase()] || (l ? l.toUpperCase() : 'Plaintext');
  };

  const handleReset = () => {
    setEditedCode(codeText);
    setRowEditValues({});
    setEditingRowIdx(null);
  };

  const handleRunPrimary = () => {
    if (!primaryCommand) return;
    onExecute(primaryCommand);
  };

  const handleInspectPrimary = () => {
    if (!primaryCommand) return;
    onExecuteAndInspect(primaryCommand);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey || e.altKey) {
        handleInspectPrimary();
      } else {
        handleRunPrimary();
      }
    }
  };

  const insertSnippet = (snippet: string, isModal = false) => {
    const target = isModal ? modalTextareaRef.current : textareaRef.current;
    if (!target) {
      setEditedCode(prev => prev + (prev.endsWith('\n') || prev.length === 0 ? '' : ' ') + snippet);
      return;
    }
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const nextText = editedCode.substring(0, start) + snippet + editedCode.substring(end);
    setEditedCode(nextText);
    setTimeout(() => {
      target.focus();
      target.selectionStart = start + snippet.length;
      target.selectionEnd = start + snippet.length;
    }, 0);
  };

  // Sync individual edited row back into editedCode
  const handleSaveRowEdit = (idx: number, newVal: string) => {
    const oldVal = executableCommands[idx];
    if (oldVal !== undefined) {
      const nextLines = [...lines];
      const lineIdx = nextLines.findIndex(l => l.trim().replace(/^\$\s*/, '') === oldVal);
      if (lineIdx !== -1) {
        nextLines[lineIdx] = newVal;
        setEditedCode(nextLines.join('\n'));
      }
    }
    setRowEditValues(prev => ({ ...prev, [idx]: newVal }));
    setEditingRowIdx(null);
  };

  return (
    <>
      <div className={`my-3 rounded-xl bg-[#131418] border transition-all select-text font-sans ${
        isEditing 
          ? 'border-blue-500/80 shadow-blue-500/10 shadow-lg ring-1 ring-blue-500/30' 
          : isModified 
            ? 'border-amber-500/60 shadow-md' 
            : 'border-slate-700/70 shadow-lg'
      }`}>
        {/* Top Bar (Action Buttons directly above the command block) */}
        <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 bg-[#1b1d22] border-b border-slate-700/60 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium font-mono text-[11px] min-w-0">
            <Terminal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-semibold text-slate-300 truncate max-w-[110px] sm:max-w-[160px]">{getLangDisplay(lang)}</span>
            {hasMultipleCommands && (
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700 shrink-0">
                {executableCommands.length} baris
              </span>
            )}
            {isModified && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                Diedit
              </span>
            )}
            {isEditing && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 font-medium shrink-0">
                Edit
              </span>
            )}
          </div>

          {/* Action Toolbar directly above the code */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            {/* Toggle Inline Edit Mode */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? 'Selesai edit dan tampilkan preview perintah' : 'Edit / sesuaikan perintah sebelum eksekusi atau analisa'}
              aria-label="Edit Perintah"
              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                isEditing
                  ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-xs'
                  : 'text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-900/60 border-amber-800/60'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            {/* Reset to Original if Modified */}
            {isModified && (
              <button
                type="button"
                onClick={handleReset}
                title="Kembalikan ke saran asli AI"
                aria-label="Reset ke Perintah Asli"
                className="p-1.5 rounded-lg text-amber-300 hover:text-amber-200 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-800/50 transition-colors cursor-pointer flex items-center justify-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Open Full Modal Editor */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              title="Buka di editor lengkap / modal"
              aria-label="Editor Lengkap"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors cursor-pointer flex items-center justify-center"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Copy Command */}
            <button
              type="button"
              onClick={() => onCopy(editedCode)}
              title={isAllCopied ? 'Tersalin ke clipboard' : 'Salin seluruh perintah'}
              aria-label="Salin Perintah"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 transition-colors cursor-pointer flex items-center justify-center"
            >
              {isAllCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            {/* Quick Execute Primary (Play Icon) */}
            {primaryCommand && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleRunPrimary}
                  title={hasMultipleCommands ? `Jalankan SEMUA perintah di terminal ${targetLabel} (Execute All)` : `Jalankan di terminal ${targetLabel} (Execute)`}
                  aria-label="Jalankan di Terminal"
                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border border-blue-500/80 shadow-xs transition-all cursor-pointer flex items-center justify-center"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                </button>
                <button
                  type="button"
                  onClick={handleInspectPrimary}
                  title={hasMultipleCommands ? `Jalankan SEMUA perintah di terminal ${targetLabel} dan analisa hasilnya dengan AI (Exec All & Analisa)` : `Jalankan di terminal ${targetLabel} dan analisa hasilnya dengan AI (Exec & Analisa)`}
                  aria-label="Jalankan dan Analisa AI"
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/80 shadow-xs transition-all cursor-pointer flex items-center justify-center"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline Editor View */}
        {isEditing ? (
          <div className="p-3 bg-[#0d0e12] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[10.5px] text-slate-400 pb-1">
              <span className="flex items-center gap-1 text-blue-300 font-medium">
                <Edit2 className="w-3 h-3 text-blue-400" />
                Ubah parameter (IP, interface, syntax) di bawah:
              </span>
              <div className="flex items-center gap-2">
                {isModified && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 hover:underline cursor-pointer"
                    title="Kembalikan ke saran asli AI"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Reset ke Asli
                  </button>
                )}
                <span className="text-[10px] text-slate-500">Ctrl+Enter untuk Eksekusi</span>
              </div>
            </div>

            {/* Quick snippet buttons */}
            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              <span className="text-slate-500 text-[9.5px]">Sisipkan:</span>
              {[
                { label: '+ Gi0/1', val: 'GigabitEthernet0/1' },
                { label: '+ IP /24', val: '192.168.1.1 255.255.255.0' },
                { label: '+ VLAN 10', val: 'vlan 10' },
                { label: '+ no shut', val: 'no shutdown' },
                { label: '+ do show', val: 'do show ' },
                { label: '+ ping', val: 'ping ' },
              ].map(snip => (
                <button
                  key={snip.label}
                  type="button"
                  onClick={() => insertSnippet(snip.val)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors font-mono text-[9.5px] cursor-pointer"
                >
                  {snip.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={Math.min(14, Math.max(3, lines.length + 1))}
                placeholder="Ketik atau edit perintah perangkat di sini..."
                className="w-full bg-[#07080a] text-emerald-300 font-mono text-[11.5px] leading-relaxed p-2.5 rounded-lg border border-blue-500/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/50 focus:outline-hidden resize-y font-normal"
                spellCheck={false}
              />
            </div>

            {/* Action buttons inside edit mode */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10.5px] font-medium transition-colors cursor-pointer"
                >
                  Selesai
                </button>
                {isModified && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-amber-300 text-[10.5px] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => onCopy(editedCode)}
                  title="Salin perintah"
                  aria-label="Salin"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                >
                  {isAllCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                <button
                  type="button"
                  onClick={handleRunPrimary}
                  title={`Jalankan perintah yang diedit ke terminal ${targetLabel} (Execute)`}
                  aria-label="Jalankan di Terminal"
                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border border-blue-500/80 shadow-xs transition-all cursor-pointer flex items-center justify-center"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                </button>

                <button
                  type="button"
                  onClick={handleInspectPrimary}
                  title={`Jalankan perintah yang diedit ke terminal ${targetLabel} dan analisa hasilnya dengan AI (Exec & Analisa)`}
                  aria-label="Jalankan dan Analisa AI"
                  className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/80 shadow-xs transition-all cursor-pointer flex items-center justify-center"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Code Text Content (Standard Display) */
          <div className="p-3 bg-[#0d0e12] overflow-x-auto text-[11.5px] leading-relaxed font-mono">
            <pre className="text-emerald-300 whitespace-pre-wrap break-all sm:break-words leading-relaxed select-all">{editedCode}</pre>
          </div>
        )}

        {/* Individual Commands Action Rows if multiple commands exist */}
        {hasMultipleCommands && !isEditing && (
          <div className="p-2 bg-[#16181f] border-t border-slate-800 space-y-2">
            <div className="px-1 text-[10.5px] font-medium text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>Perintah Individual (Dapat Dieksekusi / Disalin):</span>
              </span>
              <span className="text-[9.5px] text-slate-500">Ikon aksi di atas</span>
            </div>
            {executableCommands.map((cmd, idx) => {
              const isRowEditing = editingRowIdx === idx;
              const currentRowVal = rowEditValues[idx] !== undefined ? rowEditValues[idx] : cmd;
              const isRowCopied = copiedCmd === currentRowVal;
              const isRowModified = currentRowVal.trim() !== cmd.trim();

              if (isRowEditing) {
                return (
                  <div
                    key={`cmd-row-edit-${idx}`}
                    className="p-2 rounded-lg bg-[#0a0b0e] border border-blue-500/70 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-blue-300 font-medium">
                      <span>Edit Baris #{idx + 1}:</span>
                      <button
                        type="button"
                        onClick={() => setEditingRowIdx(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={currentRowVal}
                      onChange={(e) => setRowEditValues(prev => ({ ...prev, [idx]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveRowEdit(idx, currentRowVal);
                        }
                      }}
                      className="w-full bg-[#131418] text-cyan-300 font-mono text-[11px] px-2 py-1 rounded border border-blue-400/60 focus:outline-hidden focus:ring-1 focus:ring-blue-400"
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setEditingRowIdx(null)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveRowEdit(idx, currentRowVal)}
                        className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSaveRowEdit(idx, currentRowVal);
                          onExecute(currentRowVal);
                        }}
                        title="Jalankan baris ini ke terminal"
                        aria-label="Execute"
                        className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 flex items-center justify-center cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleSaveRowEdit(idx, currentRowVal);
                          onExecuteAndInspect(currentRowVal);
                        }}
                        title="Jalankan baris ini dan analisa hasilnya dengan AI"
                        aria-label="Exec & Analisa"
                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 flex items-center justify-center cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`cmd-row-${idx}-${cmd.slice(0, 15)}`}
                  className="p-2 rounded-lg bg-[#0d0e12] border border-slate-800/90 hover:border-slate-700 transition-colors space-y-1.5"
                >
                  {/* Top Bar: Row Label + Action Buttons Situated Above the Command */}
                  <div className="flex items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">#{idx + 1}</span>
                      {isRowModified && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 font-medium">
                          diedit
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      <button
                        type="button"
                        onClick={() => onCopy(currentRowVal)}
                        title="Salin baris perintah ini"
                        aria-label="Salin Baris"
                        className="px-2 py-1 rounded-md text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700/70 transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                      >
                        {isRowCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>Salin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRowIdx(idx);
                          if (rowEditValues[idx] === undefined) {
                            setRowEditValues(prev => ({ ...prev, [idx]: cmd }));
                          }
                        }}
                        title="Edit baris perintah ini"
                        aria-label="Edit Baris"
                        className="p-1.5 rounded-md text-amber-300 hover:text-amber-200 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/60 transition-colors cursor-pointer flex items-center justify-center"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onExecute(currentRowVal)}
                        title={`Jalankan "${currentRowVal}" di terminal (Execute)`}
                        aria-label="Jalankan Baris"
                        className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white border border-blue-500/80 shadow-xs transition-all cursor-pointer flex items-center gap-1 text-[10px] font-medium"
                      >
                        <Play className="w-3 h-3 fill-white" />
                        <span>Run</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onExecuteAndInspect(currentRowVal)}
                        title={`Jalankan "${currentRowVal}" dan analisa hasilnya dengan AI (Exec & Analisa)`}
                        aria-label="Jalankan dan Analisa Baris"
                        className="p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/80 shadow-xs transition-all cursor-pointer flex items-center justify-center"
                      >
                        <Sparkles className="w-3 h-3 text-amber-300" />
                      </button>
                    </div>
                  </div>

                  {/* Command Text: Full Width with Wrap (No truncation, completely visible) */}
                  <div className="w-full">
                    <code className="text-[11.5px] font-mono text-cyan-300 whitespace-pre-wrap break-all sm:break-words leading-relaxed select-all block bg-[#08090c] p-2 rounded-md border border-slate-900/90">
                      {currentRowVal}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Modal Editor for Complex multi-line configurations */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#121316] border border-neutral-700 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1a1b1f] border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-white">Editor Perintah Rekomendasi AI</h3>
                  <p className="text-[10.5px] text-slate-400">
                    Target: <span className="text-cyan-300 font-mono font-medium">{targetLabel}</span> ({getLangDisplay(lang)})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Notice & Snippet Toolbar */}
            <div className="p-3.5 bg-[#16181d] border-b border-neutral-800/80 space-y-2">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Silakan periksa atau ubah parameter konfigurasi (seperti IP address, interface port, VLAN ID, atau access-list) sebelum dieksekusi atau dianalisa oleh AI.
              </p>
              <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                <span className="text-slate-400 font-medium">Bantu Sisipkan:</span>
                {[
                  { label: 'GigabitEthernet0/1', val: 'GigabitEthernet0/1' },
                  { label: 'IP 192.168.1.1/24', val: '192.168.1.1 255.255.255.0' },
                  { label: 'vlan 10', val: 'vlan 10' },
                  { label: 'no shutdown', val: 'no shutdown' },
                  { label: 'do show ip int br', val: 'do show ip interface brief' },
                  { label: 'ping 8.8.8.8', val: 'ping 8.8.8.8' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => insertSnippet(item.val, true)}
                    className="px-2 py-0.5 rounded bg-[#202227] hover:bg-blue-600/30 text-slate-300 hover:text-blue-200 border border-neutral-700/80 hover:border-blue-500/50 transition-colors font-mono text-[10px] cursor-pointer"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Textarea */}
            <div className="p-4 flex-1 overflow-y-auto bg-[#0a0b0d]">
              <textarea
                ref={modalTextareaRef}
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                rows={12}
                placeholder="Ketik atau sesuaikan baris perintah perangkat di sini..."
                className="w-full bg-[#0e0f13] text-emerald-300 font-mono text-xs leading-relaxed p-3.5 rounded-xl border border-neutral-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden resize-y"
                spellCheck={false}
              />
              <div className="flex items-center justify-between text-[10.5px] text-slate-500 mt-2">
                <span>{lines.length} baris ({executableCommands.length} perintah dapat dieksekusi)</span>
                <span>Gunakan Enter untuk baris baru</span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-[#1a1b1f] border-t border-neutral-800">
              <div className="flex items-center gap-2">
                {isModified && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 text-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset ke Asli</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onCopy(editedCode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25272c] hover:bg-[#2d3036] text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
                >
                  {isAllCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{isAllCopied ? 'Tersalin' : 'Salin Semua'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleRunPrimary();
                    setIsModalOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs shadow-md transition-all cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Jalankan di Terminal</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleInspectPrimary();
                    setIsModalOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-medium text-xs shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Jalankan & Analisa AI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper to recursively extract plain text from React elements or nodes
function getPlainTextNode(node: any): string {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getPlainTextNode).join('');
  if (node.props && node.props.children) return getPlainTextNode(node.props.children);
  return '';
}

// Formats raw text so markdown tables parse correctly even if piped across single lines or concatenated
export function formatMarkdownTables(raw: string): string {
  if (!raw) return '';
  let formatted = raw;

  // 1. Remove dangerous raw HTML tags that break markdown tables or leak raw HTML
  formatted = formatted.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  formatted = formatted.replace(/<br\s*\/?>/gi, ', ');

  // 2. Fix single-line concatenated markdown table rows:
  // e.g. "| col1 | col2 | | col3 | col4 |" -> "| col1 | col2 |\n| col3 | col4 |"
  formatted = formatted.replace(/\|\s*\|\s*(?=[^|\r\n]+?\|)/g, '|\n| ');

  // 3. Fix double trailing pipes
  formatted = formatted.replace(/\|\s*\|\s*$/gm, '|');

  // 4. Ensure table header has double newline before it if preceded by text without blank line
  // GFM requires a blank line before any table, otherwise it treats the table as paragraph text
  formatted = formatted.replace(/([^\n|])\n(\|[^\n]+\|\r?\n\|[\s:|\-]+\|)/g, '$1\n\n$2');

  // Remove any accidental blank line between table header and table separator
  formatted = formatted.replace(/(\|[^\n]+\|)\r?\n\s*\r?\n(\|[\s:|\-]+\|)/g, '$1\n$2');

  // 5. Ensure table is followed by double newline if followed by non-table text
  formatted = formatted.replace(/(\n\|[^\n]+\|)\n([^\n|#\s])/g, '$1\n\n$2');

  return formatted;
}

// Render Message Body with Markdown and Actionable Code Blocks
const RenderMessageBody: React.FC<{
  text: string;
  msgId: string;
  activeDeviceName?: string;
  onExecute: (cmd: string) => void;
  onExecuteAndInspect: (cmd: string) => void;
  onCopy: (cmd: string) => void;
  copiedCmd: string | null;
  executedCmd: string | null;
}> = ({
  text,
  msgId,
  activeDeviceName,
  onExecute,
  onExecuteAndInspect,
  onCopy,
  copiedCmd,
  executedCmd,
}) => {
  const processedText = formatMarkdownTables(text);

  return (
    <div className="prose prose-invert prose-xs max-w-none text-neutral-200">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');
            const isBlock = Boolean(match || String(children).includes('\n'));

            if (!isBlock) {
              return (
                <code className="bg-[#1e2022] text-blue-300 px-1.5 py-0.5 rounded font-mono text-[11px] border border-neutral-700/60" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <CodeBlockCard
                codeText={codeContent}
                lang={match ? match[1] : 'text'}
                msgId={msgId}
                activeDeviceName={activeDeviceName}
                onExecute={onExecute}
                onExecuteAndInspect={onExecuteAndInspect}
                onCopy={onCopy}
                copiedCmd={copiedCmd}
                executedCmd={executedCmd}
              />
            );
          },
          table: ({ children }: any) => (
            <div className="my-3.5 overflow-x-auto rounded-xl border border-neutral-700/80 bg-[#161718] shadow-md">
              <table className="w-full text-left text-xs border-collapse font-sans min-w-[360px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }: any) => (
            <thead className="bg-[#202124] text-neutral-300 border-b border-neutral-700 uppercase text-[10px] tracking-wider font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }: any) => (
            <tbody className="divide-y divide-neutral-800/80 text-neutral-200">
              {children}
            </tbody>
          ),
          tr: ({ children }: any) => (
            <tr className="hover:bg-neutral-800/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }: any) => (
            <th className="px-3.5 py-2.5 font-semibold text-neutral-200 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }: any) => {
            const strVal = getPlainTextNode(children).trim();
            const isUp = /\bUP\b/i.test(strVal) && !/\bDOWN\b/i.test(strVal);
            const isDown = /\bDOWN\b/i.test(strVal) || strVal.toLowerCase().includes('admin');
            const isIp = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(strVal) || strVal.includes('.0.0.') || /^(\d{1,3}\.){3}\d{1,3}/.test(strVal);
            const isMac = /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/.test(strVal) || /([0-9a-fA-F]{4}\.[0-9a-fA-F]{4}\.[0-9a-fA-F]{4})/.test(strVal);

            return (
              <td className="px-3.5 py-2.5 text-neutral-200 leading-snug align-middle border-b border-neutral-800/50">
                {isUp ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/70 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    UP
                  </span>
                ) : isDown ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/70 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                    {strVal.toLowerCase().includes('admin') ? 'Admin Down' : 'DOWN'}
                  </span>
                ) : isIp && !strVal.includes(' ') ? (
                  <code className="font-mono text-cyan-300 bg-neutral-900/90 px-1.5 py-0.5 rounded border border-neutral-700/60 text-[11px] font-medium shadow-xs">
                    {children}
                  </code>
                ) : isMac ? (
                  <code className="font-mono text-amber-300/90 bg-neutral-900/90 px-1.5 py-0.5 rounded border border-neutral-700/60 text-[10.5px]">
                    {children}
                  </code>
                ) : (
                  children
                )}
              </td>
            );
          },
          h1: ({ children }) => <h1 className="text-sm font-bold text-neutral-100 mt-3.5 mb-2 pb-1 border-b border-neutral-800 flex items-center gap-1.5">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[13px] font-bold text-neutral-100 mt-3 mb-1.5 flex items-center gap-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[12.5px] font-semibold text-blue-300 mt-2.5 mb-1.5 flex items-center gap-1.5">{children}</h3>,
          h4: ({ children }) => <h4 className="text-[11.5px] font-semibold text-neutral-200 mt-2.5 mb-1 flex items-center gap-1">{children}</h4>,
          h5: ({ children }) => <h5 className="text-[11px] font-medium text-neutral-300 mt-2 mb-0.5">{children}</h5>,
          p: ({ children }) => <div className="mb-2 last:mb-0 leading-relaxed text-neutral-200">{children}</div>,
          pre: ({ children }) => <>{children}</>,
          ul: ({ children }) => <ul className="list-disc pl-4 space-y-1.5 mb-2 text-neutral-200">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1.5 mb-2 font-medium text-neutral-100">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed text-neutral-200">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-neutral-100">{children}</strong>,
          hr: () => <hr className="border-neutral-800 my-3" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-blue-500/80 bg-blue-950/20 px-3 py-1.5 my-2 rounded-r text-neutral-300 text-xs italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {processedText}
      </Markdown>
    </div>
  );
};

interface AiAssistantPanelProps {
  activeDevice?: DeviceProfile | null;
  devices?: DeviceProfile[];
  openDevices?: DeviceProfile[];
  onSelectActiveDevice?: (deviceId: string) => void;
  onExecuteInTerminal: (command: string, targetDeviceId?: string) => void;
  onExecuteAndInspect?: (command: string, targetDeviceId?: string, options?: { keepMobileView?: boolean }) => void;
  terminalContextText: string;
  onClosePanel?: () => void;
  onOpenPanel?: () => void;
  onOpenSettings?: () => void;
  isOpen: boolean;
  inspectTrigger?: { 
    id: number; 
    text?: string;
    commandExecuted?: string;
    commandOutput?: string;
    isCommandOutputOnly?: boolean;
    isAnomalyOrError?: boolean;
    anomalyTitle?: string;
  };
}

// Interface for Multi-Chat Sessions
export interface ChatSessionState {
  id: string;
  title: string;
  assignedDeviceId: string | null;
  mappingMode: 'auto' | 'pinned';
  brandContext: DeviceBrand;
  modelContext: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

let msgUniqueCounter = 0;
export function generateUniqueMessageId(prefix: string = 'msg'): string {
  msgUniqueCounter = (msgUniqueCounter + 1) % 1000000;
  const time = Date.now();
  const rand = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${time}-${msgUniqueCounter}-${rand}`;
}

export function sanitizeSessionMessages(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  const seenIds = new Set<string>();
  return messages.map((m, idx) => {
    let id = m.id;
    if (!id || seenIds.has(id)) {
      id = generateUniqueMessageId(id ? `${id}-dup` : `msg-${idx}`);
    }
    seenIds.add(id);
    return { ...m, id };
  });
}

// Generate device-isolated initial greeting message (empty by default as requested to eliminate opening greeting)
function createInitialGreetingForDevice(_dev?: DeviceProfile | null): ChatMessage[] {
  return [];
}

// Helper to filter out legacy initial greeting messages
function removeLegacyInitialGreeting(messages: ChatMessage[]): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  return messages.filter(m => !m.id?.startsWith('msg-init-') && !m.text?.startsWith('Halo! Saya adalah'));
}

// Helper to load or migrate initial sessions
function loadInitialChatSessions(activeDev?: DeviceProfile | null, allDevices: DeviceProfile[] = []): ChatSessionState[] {
  try {
    const saved = safeStorage.getItem('69ai_chat_sessions_v2') || safeStorage.getItem('69ai_chat_sessions_backup');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s) => ({
          ...s,
          messages: removeLegacyInitialGreeting(sanitizeSessionMessages(s.messages || [])),
        }));
      }
    }

    // Migrate from legacy per-device storage if exists
    const legacy = safeStorage.getItem('69ai_chat_messages_by_device');
    if (legacy) {
      const parsedLegacy = JSON.parse(legacy);
      const migrated: ChatSessionState[] = [];
      const keys = Object.keys(parsedLegacy);
      keys.forEach((devId, idx) => {
        const foundDev = allDevices.find(d => d.id === devId) || (devId === activeDev?.id ? activeDev : null);
        const host = foundDev ? resolveDeviceRealHostname(foundDev) : `Terminal ${devId}`;
        migrated.push({
          id: `session-${devId}-${Date.now() + idx}`,
          title: `Chat ${idx + 1}: ${host}`,
          assignedDeviceId: devId === 'global' ? null : devId,
          mappingMode: devId === 'global' ? 'auto' : 'pinned',
          brandContext: foundDev?.brand || 'cisco',
          modelContext: foundDev?.model || 'Switch Catalyst C9000',
          messages: sanitizeSessionMessages(parsedLegacy[devId] || []),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      if (migrated.length > 0) {
        return migrated;
      }
    }
  } catch (e) {
    console.warn('Failed to parse initial chat sessions:', e);
  }

  // Fresh initial session
  const defaultHost = activeDev ? resolveDeviceRealHostname(activeDev) : 'Terminal 1';
  return [
    {
      id: `session-default-${Date.now()}`,
      title: `Chat 1: ${defaultHost}`,
      assignedDeviceId: activeDev?.id || null,
      mappingMode: 'auto',
      brandContext: (activeDev?.brand || 'cisco') as DeviceBrand,
      modelContext: activeDev?.model || 'Switch Catalyst C9000',
      messages: sanitizeSessionMessages(createInitialGreetingForDevice(activeDev)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  activeDevice,
  devices = [],
  onSelectActiveDevice,
  onExecuteInTerminal,
  onExecuteAndInspect: onExternalExecuteAndInspect,
  terminalContextText,
  onClosePanel,
  onOpenPanel,
  isOpen,
  inspectTrigger,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return safeStorage.getItem('69ai_ui_selected_model') || 'Google Gemini 3.8 Flash';
  });

  // Multiple Chat Sessions State
  const [sessions, setSessions] = useState<ChatSessionState[]>(() => {
    return loadInitialChatSessions(activeDevice, devices);
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedActiveId = safeStorage.getItem('69ai_active_session_id');
    const initialList = loadInitialChatSessions(activeDevice, devices);
    if (savedActiveId && initialList.some(s => s.id === savedActiveId)) {
      return savedActiveId;
    }
    return initialList[0]?.id || 'default';
  });

  // Auto-Sync Chat Session with Active Terminal Tab Toggle
  const [autoSyncWithTerminal, setAutoSyncWithTerminal] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('69ai_auto_sync_chat_with_terminal');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const handleToggleAutoSync = () => {
    const nextVal = !autoSyncWithTerminal;
    setAutoSyncWithTerminal(nextVal);
    try {
      safeStorage.setItem('69ai_auto_sync_chat_with_terminal', JSON.stringify(nextVal));
    } catch (e) {}
    setClearSuccessFeedback(
      nextVal 
        ? 'Sync Tab Aktif: Chat otomatis mengikuti tab terminal aktif (Hanya beralih tab lokal, log terminal TIDAK dikirim ke internet).' 
        : 'Sync Tab Nonaktif: Chat tetap di sesi perangkat saat ini.'
    );
    setTimeout(() => setClearSuccessFeedback(null), 3500);
  };

  const [sessionSwitchNotification, setSessionSwitchNotification] = useState<{
    deviceName: string;
    sessionId: string;
    sessionTitle: string;
  } | null>(null);

  // Ensure activeSessionId is always synchronized to an existing session in sessions state
  useEffect(() => {
    if (sessions.length > 0 && !sessions.some(s => s.id === activeSessionId)) {
      const fallbackId = sessions[0].id;
      setActiveSessionId(fallbackId);
      try {
        safeStorage.setItem('69ai_active_session_id', fallbackId);
      } catch (e) {}
    }
  }, [sessions, activeSessionId]);

  // UI state toggles
  const [showSessionSelector, setShowSessionSelector] = useState<boolean>(false);
  const [showMappingMenu, setShowMappingMenu] = useState<boolean>(false);
  const [showClearMenu, setShowClearMenu] = useState<boolean>(false);
  const [showRequestHistoryDrawer, setShowRequestHistoryDrawer] = useState<boolean>(false);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>('');
  const [clearSuccessFeedback, setClearSuccessFeedback] = useState<string | null>(null);

  // Active Session Object
  const currentSession: ChatSessionState = sessions.find(s => s.id === activeSessionId) || sessions[0] || {
    id: `fallback-${Date.now()}`,
    title: 'Chat 1',
    assignedDeviceId: activeDevice?.id || null,
    mappingMode: 'auto',
    brandContext: (activeDevice?.brand || 'cisco') as DeviceBrand,
    modelContext: activeDevice?.model || 'Switch Catalyst C9000',
    messages: createInitialGreetingForDevice(activeDevice),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Determine effective mapped device for current active chat session
  const effectiveDevice: DeviceProfile | null = (() => {
    if (currentSession.mappingMode === 'pinned' && currentSession.assignedDeviceId) {
      const found = devices.find((d) => d.id === currentSession.assignedDeviceId);
      if (found) return found;
    }
    return activeDevice || devices[0] || null;
  })();

  const effectiveDeviceId = effectiveDevice?.id || 'global';
  const currentMessages: ChatMessage[] = currentSession.messages || [];

  // Brand & Model state synced with current session / effective device
  const [selectedBrand, setSelectedBrand] = useState<DeviceBrand>(
    currentSession.brandContext || effectiveDevice?.brand || 'cisco'
  );
  const [selectedModelName, setSelectedModelName] = useState<string>(() => {
    const b = currentSession.brandContext || effectiveDevice?.brand || 'cisco';
    const cat = getUnifiedBrandCatalog();
    return currentSession.modelContext || effectiveDevice?.model || cat[b]?.models[0]?.name || 'Switch Catalyst C9000';
  });
  const [showBrandSelector, setShowBrandSelector] = useState<boolean>(false);

  const [inputValue, setInputValue] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [executedCmd, setExecutedCmd] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});

  // Live Debug / Troubleshooting Capture State
  const [isCapturingDebug, setIsCapturingDebug] = useState<boolean>(false);
  const [debugCommand, setDebugCommand] = useState<string>('');
  const [capturedBuffer, setCapturedBuffer] = useState<string>('');
  const [capturedLinesCount, setCapturedLinesCount] = useState<number>(0);
  const debugBaselineLogRef = useRef<string>('');
  const debugCapturedChunksRef = useRef<string[]>([]);

  // Provider Accounts & Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [providerAccounts, setProviderAccounts] = useState<Record<AIProviderId, any>>(getSavedProviderAccounts());
  // [SEC-05] Default mati: output terminal tidak otomatis dikirim ke AI online
  const [shareTerminalWithAi, setShareTerminalWithAi] = useState<boolean>(() => safeStorage.getItem(SHARE_TERMINAL_WITH_AI_KEY) === 'true');
  const toggleShareTerminalWithAi = () => {
    setShareTerminalWithAi((prev) => {
      const next = !prev;
      safeStorage.setItem(SHARE_TERMINAL_WITH_AI_KEY, next ? 'true' : 'false');
      return next;
    });
  };
  const [operatorEmail, setOperatorEmail] = useState<string>(() => {
    return safeStorage.getItem('69ai_operator_email') || '';
  });
  const [operatorName, setOperatorName] = useState<string>(() => {
    return safeStorage.getItem('69ai_operator_name') || 'Network Operator';
  });
  const [aiValidation, setAiValidation] = useState<AIValidationResult | null>(() => {
    try {
      const cached = safeStorage.getItem('69ai_last_ai_validation');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    return null;
  });
  const [isValidatingAi, setIsValidatingAi] = useState<boolean>(false);
  const [isExpandedPanel, setIsExpandedPanel] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('69ai_assistant_expanded');
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      return false;
    }
  });

  // Auto-Execute Read-Only (Show / Get / Display) commands state
  const [autoExecReadOnly, setAutoExecReadOnly] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('69ai_auto_exec_readonly');
      return saved !== null ? JSON.parse(saved) : true; // Default ON as requested by user
    } catch (e) {
      return true;
    }
  });

  const pendingAutoExecRef = useRef<{
    command: string;
    userQuery: string;
    tempMsgId: string;
  } | null>(null);

  const handleToggleAutoExec = () => {
    const nextVal = !autoExecReadOnly;
    setAutoExecReadOnly(nextVal);
    try {
      safeStorage.setItem('69ai_auto_exec_readonly', JSON.stringify(nextVal));
    } catch (e) {}
  };

  // Listen to provider auth & validation changes
  useEffect(() => {
    const handleAuthUpdated = () => {
      setProviderAccounts(getSavedProviderAccounts());
      setOperatorEmail(safeStorage.getItem('69ai_operator_email') || '');
      setOperatorName(safeStorage.getItem('69ai_operator_name') || 'Network Operator');
      triggerQuickValidation();
    };
    const handleValidated = (e: any) => {
      if (e?.detail) {
        setAiValidation(e.detail);
        try {
          safeStorage.setItem('69ai_last_ai_validation', JSON.stringify(e.detail));
        } catch (err) {}
      }
    };

    window.addEventListener('69ai_auth_updated', handleAuthUpdated);
    window.addEventListener('69ai_settings_updated', handleAuthUpdated);
    window.addEventListener('69ai_auth_validated', handleValidated);

    // Initial validation
    triggerQuickValidation();

    return () => {
      window.removeEventListener('69ai_auth_updated', handleAuthUpdated);
      window.removeEventListener('69ai_settings_updated', handleAuthUpdated);
      window.removeEventListener('69ai_auth_validated', handleValidated);
    };
  }, []);

  const triggerQuickValidation = async () => {
    setIsValidatingAi(true);
    try {
      const activeProvider = (safeStorage.getItem('69ai_user_provider') as AIProviderId) || 'gemini';
      const res = await validateAiConnection(activeProvider);
      setAiValidation(res);
      try {
        safeStorage.setItem('69ai_last_ai_validation', JSON.stringify(res));
      } catch (err) {}
    } catch (e) {
      // Ignored
    } finally {
      setIsValidatingAi(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionSelectorRef = useRef<HTMLDivElement>(null);
  const mappingMenuRef = useRef<HTMLDivElement>(null);
  const clearMenuRef = useRef<HTMLDivElement>(null);
  const requestHistoryRef = useRef<HTMLDivElement>(null);

  // Sync selected brand and model when active session or effective device changes
  useEffect(() => {
    if (effectiveDevice) {
      const b = effectiveDevice.brand || 'cisco';
      setSelectedBrand(b);
      const catalog = getUnifiedBrandCatalog();
      const matched = effectiveDevice.model || catalog[b]?.models[0]?.name || effectiveDevice.name;
      if (matched) setSelectedModelName(matched);
    }
  }, [currentSession.id, effectiveDevice?.id, effectiveDevice?.brand, effectiveDevice?.model, effectiveDevice?.name]);

  // Extract all user requests and matching AI answers for this session
  const requestHistoryItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      userMsg: ChatMessage;
      aiMsg?: ChatMessage;
      index: number;
    }> = [];
    let idx = 1;
    for (let i = 0; i < currentMessages.length; i++) {
      const msg = currentMessages[i];
      if (msg.sender === 'user') {
        const nextMsg = currentMessages[i + 1];
        const aiMsg = nextMsg && nextMsg.sender === 'ai' ? nextMsg : undefined;
        items.push({
          id: `${msg.id || 'req'}-${idx}`,
          userMsg: msg,
          aiMsg,
          index: idx++,
        });
      }
    }
    return items;
  }, [currentMessages]);

  // Filter requests by search query
  const filteredHistoryItems = React.useMemo(() => {
    if (!historySearchQuery.trim()) return requestHistoryItems;
    const q = historySearchQuery.toLowerCase();
    return requestHistoryItems.filter(
      item => item.userMsg.text.toLowerCase().includes(q) || (item.aiMsg && item.aiMsg.text.toLowerCase().includes(q))
    );
  }, [requestHistoryItems, historySearchQuery]);

  // Jump smoothly to selected user request / answer and highlight it
  const handleJumpToRequest = (userMsgId: string, aiMsgId?: string) => {
    const targetId = aiMsgId || userMsgId;
    const el = document.getElementById(`chat-msg-${targetId}`) || document.getElementById(`chat-msg-${userMsgId}`);
    if (el) {
      try {
        if (typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch {}
      setHighlightedMessageId(targetId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2600);
    }
    setShowRequestHistoryDrawer(false);
  };

  // Persist sessions to localStorage & secondary backup to prevent loss when shutting down laptop
  const persistSessions = (newSessions: ChatSessionState[]) => {
    setSessions(newSessions);
    try {
      safeStorage.setItem('69ai_chat_sessions_v2', JSON.stringify(newSessions));
      safeStorage.setItem('69ai_chat_sessions_backup', JSON.stringify(newSessions));
    } catch (e) {
      console.warn('Failed to persist chat sessions:', e);
    }
  };

  // Automatically switch / assign the active Chat Session when user switches terminal tabs
  const prevActiveDevIdRef = useRef<string | undefined>(activeDevice?.id);
  useEffect(() => {
    if (!activeDevice || !autoSyncWithTerminal) return;

    const currentDevId = activeDevice.id;
    const prevDevId = prevActiveDevIdRef.current;
    prevActiveDevIdRef.current = currentDevId;

    if (!currentDevId || currentDevId === prevDevId) return;

    // 1. Look for sessions explicitly assigned/pinned to this device
    const matchingSessions = sessions.filter(
      s => s.assignedDeviceId === currentDevId
    );

    if (matchingSessions.length > 0) {
      // Pick the currently active session if it matches, or the most recent one
      const alreadyActive = matchingSessions.find(s => s.id === activeSessionId);
      const targetSession = alreadyActive || [...matchingSessions].sort((a, b) => 
        new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
      )[0];

      if (targetSession && targetSession.id !== activeSessionId) {
        setActiveSessionId(targetSession.id);
        try {
          safeStorage.setItem('69ai_active_session_id', targetSession.id);
        } catch (e) {}

        const devName = resolveDeviceRealHostname(activeDevice);
        setSessionSwitchNotification({
          deviceName: devName,
          sessionId: targetSession.id,
          sessionTitle: targetSession.title,
        });
        setTimeout(() => setSessionSwitchNotification(null), 3500);
      }
    } else {
      // 2. No session specifically assigned to this device yet.
      // Check if current active session is unpinned 'auto' and has no messages, we can assign it
      const currentSess = sessions.find(s => s.id === activeSessionId);
      if (currentSess && currentSess.mappingMode === 'auto' && (!currentSess.messages || currentSess.messages.length === 0)) {
        const updated = sessions.map(s => {
          if (s.id === currentSess.id) {
            return {
              ...s,
              assignedDeviceId: currentDevId,
              title: `Chat (${resolveDeviceRealHostname(activeDevice)})`,
              brandContext: (activeDevice.brand || 'cisco') as DeviceBrand,
              modelContext: activeDevice.model || 'Switch Catalyst C9000',
              updatedAt: new Date().toISOString(),
            };
          }
          return s;
        });
        persistSessions(updated);
      } else {
        // 3. Or create a dedicated chat workspace for this terminal so chat context is 100% isolated
        const nextNumber = sessions.length + 1;
        const newSessionId = `session-${currentDevId}-${Date.now()}`;
        const devName = resolveDeviceRealHostname(activeDevice);
        const newSession: ChatSessionState = {
          id: newSessionId,
          title: `Chat ${nextNumber} (${devName})`,
          assignedDeviceId: currentDevId,
          mappingMode: 'pinned',
          brandContext: (activeDevice.brand || 'cisco') as DeviceBrand,
          modelContext: activeDevice.model || 'Switch Catalyst C9000',
          messages: createInitialGreetingForDevice(activeDevice),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const nextList = [...sessions, newSession];
        persistSessions(nextList);
        setActiveSessionId(newSessionId);
        try {
          safeStorage.setItem('69ai_active_session_id', newSessionId);
        } catch (e) {}

        setSessionSwitchNotification({
          deviceName: devName,
          sessionId: newSessionId,
          sessionTitle: newSession.title,
        });
        setTimeout(() => setSessionSwitchNotification(null), 3500);
      }
    }
  }, [activeDevice?.id, autoSyncWithTerminal, sessions, activeSessionId]);

  const updateCurrentSessionMessages = (updater: (prev: ChatMessage[]) => ChatMessage[], queryForAutoTitle?: string) => {
    setSessions((prev) => {
      // Find the targeted session: check activeSessionId, or fallback to first session
      const targetSession = prev.find(s => s.id === activeSessionId) || prev[0];
      const targetId = targetSession ? targetSession.id : activeSessionId;

      if (!targetSession || prev.length === 0) {
        const freshSession: ChatSessionState = {
          id: activeSessionId || `session-default-${Date.now()}`,
          title: `Chat 1: ${resolveDeviceRealHostname(activeDevice)}`,
          assignedDeviceId: activeDevice?.id || null,
          mappingMode: 'auto',
          brandContext: (activeDevice?.brand || 'cisco') as DeviceBrand,
          modelContext: activeDevice?.model || 'Switch Catalyst C9000',
          messages: sanitizeSessionMessages(updater(createInitialGreetingForDevice(activeDevice))),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          safeStorage.setItem('69ai_chat_sessions_v2', JSON.stringify([freshSession]));
          safeStorage.setItem('69ai_chat_sessions_backup', JSON.stringify([freshSession]));
        } catch (e) {}
        return [freshSession];
      }

      const updated = prev.map((s) => {
        if (s.id === targetId) {
          const newMsgs = sanitizeSessionMessages(updater(s.messages || []));
          let newTitle = s.title;

          // If session still has default "Chat X" or generic title, automatically give it a descriptive title based on the first query
          const isDefaultTitle = /^Chat\s+\d+(\s*\(.*\))?$/i.test(s.title) || s.title.startsWith('Chat Baru');
          if (queryForAutoTitle && isDefaultTitle) {
            const cleanQuery = queryForAutoTitle.replace(/[\r\n]+/g, ' ').trim();
            const words = cleanQuery.split(/\s+/).slice(0, 5).join(' ');
            const targetDev = s.assignedDeviceId ? devices.find(d => d.id === s.assignedDeviceId) : null;
            const hostTag = targetDev ? ` [${resolveDeviceRealHostname(targetDev)}]` : '';
            newTitle = `${words.length > 35 ? words.substring(0, 35) + '...' : words}${hostTag}`;
          }

          return {
            ...s,
            title: newTitle,
            messages: newMsgs,
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });
      try {
        safeStorage.setItem('69ai_chat_sessions_v2', JSON.stringify(updated));
        safeStorage.setItem('69ai_chat_sessions_backup', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sessionSelectorRef.current && !sessionSelectorRef.current.contains(e.target as Node)) {
        setShowSessionSelector(false);
      }
      if (mappingMenuRef.current && !mappingMenuRef.current.contains(e.target as Node)) {
        setShowMappingMenu(false);
      }
      if (clearMenuRef.current && !clearMenuRef.current.contains(e.target as Node)) {
        setShowClearMenu(false);
      }
      if (requestHistoryRef.current && !requestHistoryRef.current.contains(e.target as Node)) {
        setShowRequestHistoryDrawer(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to bottom on message update
  useEffect(() => {
    try {
      if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch {}
  }, [currentMessages.length, isLoading, activeSessionId]);

  // 1. Action: Add New Chat Session
  const handleAddNewSession = (targetDeviceId?: string) => {
    const targetDev = targetDeviceId 
      ? devices.find(d => d.id === targetDeviceId) 
      : (activeDevice || devices[0]);
    
    const hostLabel = targetDev ? resolveDeviceRealHostname(targetDev) : 'Terminal';
    const nextNumber = sessions.length + 1;
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSessionState = {
      id: newSessionId,
      title: `Chat ${nextNumber} (${hostLabel})`,
      assignedDeviceId: targetDeviceId || (activeDevice?.id || null),
      mappingMode: targetDeviceId ? 'pinned' : 'auto',
      brandContext: (targetDev?.brand || 'cisco') as DeviceBrand,
      modelContext: targetDev?.model || 'Switch Catalyst C9000',
      messages: createInitialGreetingForDevice(targetDev),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextList = [newSession, ...sessions];
    persistSessions(nextList);
    setActiveSessionId(newSessionId);
    try {
      safeStorage.setItem('69ai_active_session_id', newSessionId);
    } catch (e) {}

    setShowSessionSelector(false);
    setClearSuccessFeedback(`Sesi baru "${newSession.title}" berhasil dibuat!`);
    setTimeout(() => setClearSuccessFeedback(null), 3000);
  };

  // 2. Action: Switch Session
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      safeStorage.setItem('69ai_active_session_id', sessionId);
    } catch (e) {}
    setShowSessionSelector(false);
  };

  const handlePrevChatTab = () => {
    if (sessions.length <= 1) return;
    const currentIdx = sessions.findIndex(s => s.id === activeSessionId);
    const prevIdx = currentIdx <= 0 ? sessions.length - 1 : currentIdx - 1;
    handleSelectSession(sessions[prevIdx].id);
  };

  const handleNextChatTab = () => {
    if (sessions.length <= 1) return;
    const currentIdx = sessions.findIndex(s => s.id === activeSessionId);
    const nextIdx = currentIdx >= sessions.length - 1 ? 0 : currentIdx + 1;
    handleSelectSession(sessions[nextIdx].id);
  };

  // 3. Action: Rename Session
  const handleStartRenameSession = (s: ChatSessionState, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditingTitleValue(s.title);
  };

  const handleSaveRenameSession = (sessionId: string) => {
    if (!editingTitleValue.trim()) {
      setEditingSessionId(null);
      return;
    }
    const updated = sessions.map(s => {
      if (s.id === sessionId) {
        return { ...s, title: editingTitleValue.trim(), updatedAt: new Date().toISOString() };
      }
      return s;
    });
    persistSessions(updated);
    setEditingSessionId(null);
  };

  // 4. Action: Delete Session
  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (sessions.length <= 1) {
      // Reset single session instead of leaving 0 sessions
      const resetGreeting = createInitialGreetingForDevice(activeDevice);
      const resetList: ChatSessionState[] = [{
        id: `session-default-${Date.now()}`,
        title: `Chat 1 (${resolveDeviceRealHostname(activeDevice)})`,
        assignedDeviceId: activeDevice?.id || null,
        mappingMode: 'auto',
        brandContext: (activeDevice?.brand || 'cisco') as DeviceBrand,
        modelContext: activeDevice?.model || 'Switch Catalyst C9000',
        messages: resetGreeting,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
      persistSessions(resetList);
      setActiveSessionId(resetList[0].id);
      return;
    }

    const filtered = sessions.filter(s => s.id !== sessionId);
    persistSessions(filtered);
    if (activeSessionId === sessionId) {
      const nextActive = filtered[0]?.id || 'default';
      setActiveSessionId(nextActive);
      try {
        safeStorage.setItem('69ai_active_session_id', nextActive);
      } catch (err) {}
    }
    setClearSuccessFeedback('Sesi chat berhasil dihapus.');
    setTimeout(() => setClearSuccessFeedback(null), 3000);
  };

  // 5. Action: Clear Current Session Messages
  const handleClearCurrentSessionMessages = () => {
    const freshGreeting = createInitialGreetingForDevice(effectiveDevice);
    updateCurrentSessionMessages(() => freshGreeting);
    setShowClearMenu(false);
    setClearSuccessFeedback(`Pesan chat "${currentSession.title}" berhasil dibersihkan!`);
    setTimeout(() => setClearSuccessFeedback(null), 3000);
  };

  // 6. Action: Reset All Chat Sessions
  const handleResetAllSessions = () => {
    const initialGreeting = createInitialGreetingForDevice(activeDevice);
    const freshList: ChatSessionState[] = [
      {
        id: `session-default-${Date.now()}`,
        title: `Chat 1 (${resolveDeviceRealHostname(activeDevice)})`,
        assignedDeviceId: activeDevice?.id || null,
        mappingMode: 'auto',
        brandContext: (activeDevice?.brand || 'cisco') as DeviceBrand,
        modelContext: activeDevice?.model || 'Switch Catalyst C9000',
        messages: initialGreeting,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    persistSessions(freshList);
    setActiveSessionId(freshList[0].id);
    try {
      safeStorage.removeItem('69ai_chat_messages_by_device');
      safeStorage.setItem('69ai_active_session_id', freshList[0].id);
    } catch (e) {}
    setShowClearMenu(false);
    setClearSuccessFeedback('Seluruh riwayat multi-chat telah dibersihkan!');
    setTimeout(() => setClearSuccessFeedback(null), 3000);
  };

  // 7. Action: Update Device Mapping for Current Active Session
  const handleSetSessionAutoMapping = () => {
    const updated = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          mappingMode: 'auto' as const,
          assignedDeviceId: null,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    persistSessions(updated);
    setShowMappingMenu(false);
  };

  const handlePinSessionToDevice = (devId: string) => {
    const updated = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          mappingMode: 'pinned' as const,
          assignedDeviceId: devId,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    persistSessions(updated);
    setShowMappingMenu(false);
  };

  const handleCopyCommand = (cmd: string) => {
    copyToClipboard(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleExecuteCommand = async (cmd: string) => {
    const lines = cmd.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      for (const line of lines) {
        onExecuteInTerminal(line, effectiveDevice?.id);
        await new Promise(r => setTimeout(r, 600)); // Delay between commands for device buffer
      }
    } else {
      onExecuteInTerminal(cmd, effectiveDevice?.id);
    }
    setExecutedCmd(cmd);
    setTimeout(() => setExecutedCmd(null), 2000);
  };

  const handleExecuteAndInspect = async (cmd: string) => {
    const lines = cmd.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Provide immediate visual indicator
    setIsLoading(true);
    setExecutedCmd(cmd);
    setTimeout(() => setExecutedCmd(null), 2000);

    if (lines.length > 1) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isLast = i === lines.length - 1;
        if (isLast) {
          if (onExternalExecuteAndInspect) {
            onExternalExecuteAndInspect(line, effectiveDevice?.id);
          } else {
            onExecuteInTerminal(line, effectiveDevice?.id);
          }
        } else {
          onExecuteInTerminal(line, effectiveDevice?.id);
          await new Promise(r => setTimeout(r, 600));
        }
      }
    } else {
      if (onExternalExecuteAndInspect) {
        onExternalExecuteAndInspect(cmd, effectiveDevice?.id);
      } else {
        onExecuteInTerminal(cmd, effectiveDevice?.id);
      }
    }
  };

  // Bookmark / Save solution to offline documentation database
  const handleSaveToDocs = (msg: ChatMessage) => {
    saveOnlineSearchDoc({
      title: `Dokumentasi Solusi: ${selectedBrand.toUpperCase()} (${selectedModelName}) - ${resolveDeviceRealHostname(effectiveDevice)}`,
      query: msg.text.slice(0, 80),
      summary: msg.text.slice(0, 180),
      content: msg.text,
      brand: selectedBrand,
      provider: selectedModel.includes('Gemini') ? 'gemini' : selectedModel.includes('ChatGPT') ? 'openai' : selectedModel.includes('Claude') ? 'claude' : selectedModel.includes('DeepSeek') ? 'deepseek' : 'offline',
      tags: [selectedBrand, 'saved-doc', effectiveDevice?.brand || 'device'],
    });

    setBookmarkedIds(prev => ({ ...prev, [msg.id]: true }));
  };

  // Helper to determine AI Provider and fetch specific user API key for selected model
  const resolveProviderAndKey = (modelName: string): { userProvider: string; userApiKey?: string } => {
    let userProvider = 'gemini';
    let userApiKey = '';

    if (modelName === 'Offline Database Engine' || modelName.toLowerCase().includes('offline')) {
      return {
        userProvider: 'offline',
        userApiKey: undefined,
      };
    }

    if (modelName.includes('ChatGPT') || modelName.includes('OpenAI')) {
      userProvider = 'openai';
      userApiKey = safeStorage.getItem('69ai_api_key_openai') || safeStorage.getItem('69ai_user_api_key') || '';
    } else if (modelName.includes('Claude')) {
      userProvider = 'claude';
      userApiKey = safeStorage.getItem('69ai_api_key_claude') || safeStorage.getItem('69ai_user_api_key') || '';
    } else if (modelName.includes('DeepSeek')) {
      userProvider = 'deepseek';
      userApiKey = safeStorage.getItem('69ai_api_key_deepseek') || safeStorage.getItem('69ai_user_api_key') || '';
    } else {
      userProvider = 'gemini';
      userApiKey = safeStorage.getItem('69ai_api_key_gemini') || safeStorage.getItem('69ai_user_api_key') || '';
    }

    return {
      userProvider,
      userApiKey: userApiKey.trim() || undefined,
    };
  };

  // Main chat submit handler
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const targetDevHost = resolveDeviceRealHostname(effectiveDevice);

    const userMsg: ChatMessage = {
      id: generateUniqueMessageId('msg-user'),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    updateCurrentSessionMessages((prev) => [...prev, userMsg], query);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const existingTerminalBuffer = (terminalContextText || '').trim();

      // Detect if user query is a check, data retrieval, or analysis inquiry
      const isInquiryIntent = /\b(cek|lihat|tampilkan|show|get|display|analisa|analisis|status|kondisi|berapa|mana|apakah|periksa|diagnosa|inspect|troubleshoot|info|ip|interface|vlan|routing|route|ospf|bgp|dhcp|port|running|config|konfigurasi|acl|firewall|nat|gateway|dns|ntp|user|uptime|version|summary|overview|kesehatan)\b/i.test(query);

      // Check if user specifically requested a fresh re-pull / refresh
      const isExplicitRefreshIntent = /\b(refresh|perbarui|update|tarik ulang|ambil ulang|show run ulang|sync config|ambil snapshot baru)\b/i.test(query);

      // =========================================================================
      // SNAPSHOT BASELINE AS PRIMARY ANALYZER (Ultra-efficient 0-overhead):
      // 1. Check if the device has a latest saved snapshot (automatically taken during connection or save-config).
      // 2. If available and not an explicit refresh request, use it directly as baseline without executing show run!
      // 3. If no snapshot exists yet, capture via background show run once and auto-save as baseline.
      // =========================================================================
      let capturedRunningConfig = '';
      let baselineSourceInfo = '';
      let capturedCommandUsed = getRunningConfigCommandForBrand(selectedBrand);

      if (effectiveDevice) {
        // Step 1: Check latest saved snapshot
        const latestSnap = !isExplicitRefreshIntent ? getLatestDeviceSnapshot(effectiveDevice.id, effectiveDevice) : null;
        
        if (latestSnap && (latestSnap.normalizedConfig?.trim() || latestSnap.rawConfig?.trim())) {
          capturedRunningConfig = (latestSnap.normalizedConfig || latestSnap.rawConfig || '').trim();
          const snapTime = new Date(latestSnap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          baselineSourceInfo = `Snapshot Baseline (${latestSnap.label || latestSnap.id} - ${snapTime}, ${latestSnap.lineCount || capturedRunningConfig.split('\n').length} baris)`;
        } else {
          // Step 2: If no snapshot exists or user explicitly requested refresh, capture silently once in background
          try {
            const bgSnapshot = await captureRunningConfigViaBackgroundExec(effectiveDevice, targetDevHost);
            if (bgSnapshot && bgSnapshot.config && bgSnapshot.config.trim().length > 10) {
              capturedRunningConfig = bgSnapshot.config.trim();
              capturedCommandUsed = bgSnapshot.commandUsed || capturedCommandUsed;
              
              // Automatically save as baseline snapshot for all subsequent queries
              const newSnap = createSnapshotFromConfig(
                effectiveDevice.id,
                effectiveDevice.name,
                effectiveDevice.brand,
                capturedRunningConfig,
                'auto_show_run',
                `Baseline AI (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                capturedCommandUsed
              );
              saveDeviceSnapshot(newSnap);
              baselineSourceInfo = `Live Background Capture (${capturedCommandUsed} - Baru saja diambil & disimpan ke Snapshot Baseline)`;
            }
          } catch (bgErr) {
            console.warn('Background running-config capture fallback:', bgErr);
          }
        }
      }

      // 100% Offline Mode Path: Zero network calls, zero quota consumed
      const isOfflineMode = selectedModel === 'Offline Database Engine' || selectedModel === 'offline';
      
      if (isOfflineMode) {
        const offlineMatches = searchOfflineDatabase(query, selectedBrand);
        let offlineText = '';
        let extractedCommands: { cmd: string; explanation?: string }[] = [];

        if (capturedRunningConfig) {
          const diag = analyzeRunningConfigLocally(capturedRunningConfig, selectedBrand, selectedModelName);
          offlineText = `### 📋 Hasil Analisis Konfigurasi Baseline (Offline Engine) — ${selectedBrand.toUpperCase()} (${targetDevHost})\n\n**Status Perangkat:** ${diag.status === 'healthy' ? '🟢 Normal' : '🟡 Perhatian'}\n\n#### 📌 Ringkasan Konfigurasi:\n${diag.summary}\n${diag.formattedTable ? `\n${diag.formattedTable}\n` : ''}\n\n#### 🔍 Temuan Kunci:\n${diag.identifiedIssues.map(i => `• ${i}`).join('\n')}\n\n${diag.explanation ? `#### 💡 Diagnosa:\n${diag.explanation}` : ''}`;
          if (diag.recommendedCommands) {
            extractedCommands = diag.recommendedCommands.map(rc => ({ cmd: rc.cmd, explanation: rc.purpose }));
          }
        } else if (offlineMatches.length > 0) {
          const top = offlineMatches[0];
          offlineText = `### 💡 Panduan Eksekusi CLI (Offline Database Engine) — ${selectedBrand.toUpperCase()}\n\n**Perintah Kunci:** \`${top.command}\`\n${top.description}\n\n${top.explanationId ? `*Petunjuk:* ${top.explanationId}\n\n` : ''}${top.verificationTip ? `**Tips Verifikasi:**\n${top.verificationTip}\n\n` : ''}##### Langkah 1: Eksekusi Perintah\n\`\`\`${selectedBrand.toLowerCase()}\n${top.command}\n\`\`\``;
          extractedCommands.push({ cmd: top.command, explanation: top.categoryLabel });

          if (offlineMatches.length > 1) {
            const extraCmds = offlineMatches.slice(1, 3);
            offlineText += `\n\n#### Perintah Terkait Lainnya:\n` + extraCmds.map((ec, idx) => 
              `##### Langkah ${idx + 2}: ${ec.categoryLabel || ec.description}\n\`\`\`${selectedBrand.toLowerCase()}\n${ec.command}\n\`\`\``
            ).join('\n\n');
            extraCmds.forEach(ec => extractedCommands.push({ cmd: ec.command, explanation: ec.categoryLabel }));
          }
        } else {
          offlineText = generateExpertNetworkResponse(query, selectedBrand, selectedModelName, existingTerminalBuffer);
          const codeBlockRegex = /```(?:bash|sh|cisco|junos|routeros|mikrotik|linux|huawei|fortios|fortinet|alliedtelesis|awplus)?\s*([\s\S]*?)```/g;
          let match;
          while ((match = codeBlockRegex.exec(offlineText)) !== null) {
            const lines = match[1].trim().split('\n');
            lines.forEach(line => {
              const clean = line.trim().replace(/^#\s*/, '').replace(/^\$\s*/, '');
              if (clean && isExecutableDeviceCommand(clean)) {
                extractedCommands.push({ cmd: clean });
              }
            });
          }
        }

        const aiMsg: ChatMessage = {
          id: generateUniqueMessageId('msg-ai'),
          sender: 'ai',
          text: offlineText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          brandContext: selectedBrand,
          modelContext: selectedModelName,
          commands: extractedCommands.length > 0 ? extractedCommands : undefined,
          isFromOfflineDb: true,
          modelUsed: 'Offline Database Engine',
        };

        updateCurrentSessionMessages((prev) => [...prev, aiMsg]);
        setIsLoading(false);
        return;
      }

      // Call Intelligent AI Service (Hybrid: Direct HTTPS API on APK/Client or Backend Server)
      const { userProvider, userApiKey } = resolveProviderAndKey(selectedModel);
      const enableGoogleSearchSaved = safeStorage.getItem('69ai_enable_online_search');
      const enableGoogleSearch = enableGoogleSearchSaved !== null ? JSON.parse(enableGoogleSearchSaved) : true;

      // Prepare clean conversation history for this specific session
      const meaningfulHistory = currentMessages
        .filter(m => !m.id.startsWith('msg-init-'))
        .slice(-8)
        .map(m => ({
          role: m.sender === 'user' ? 'user' as const : 'assistant' as const,
          content: m.text
        }));

      // Enrich terminal context with silent snapshot baseline configuration
      let enrichedTerminalContext = existingTerminalBuffer;
      if (capturedRunningConfig) {
        enrichedTerminalContext = `[BASELINE KONFIGURASI PERANGKAT (${targetDevHost} - ${selectedBrand.toUpperCase()})]:
# Sumber: ${baselineSourceInfo || 'Snapshot Konfigurasi Terakhir'}
# Mode: Snapshot Baseline Engine (Gunakan konfigurasi snapshot ini untuk menganalisa, mencari IP/subnet, VLAN, routing, status port, dan menjawab pertanyaan pengguna. JANGAN dump seluruh teks mentah show run ini ke chat!)
${capturedRunningConfig}

${enrichedTerminalContext ? `[CUPLIKAN LOG TERMINAL AKTIF LAINNYA]:\n${enrichedTerminalContext}` : ''}`;
      }

      const data = await sendNetworkAiChat({
        message: query,
        brand: selectedBrand,
        model: selectedModelName,
        selectedModel,
        terminalContext: enrichedTerminalContext,
        history: meaningfulHistory,
        userApiKey,
        userProvider,
        enableGoogleSearch,
        operatorEmail,
        operatorName,
      });

      if (!data || !data.text) {
        throw new Error('Gagal memproses respon dari server AI.');
      }

      // Extract code blocks from AI response to create actionable Execute & Inspect buttons
      const extractedCommands: { cmd: string; explanation?: string }[] = [];
      const codeBlockRegex = /```(?:bash|sh|cisco|junos|routeros|mikrotik|linux|huawei|fortios|fortinet|alliedtelesis|awplus)?\s*([\s\S]*?)```/g;
      let match;
      while ((match = codeBlockRegex.exec(data.text)) !== null) {
        const lines = match[1].trim().split('\n');
        lines.forEach(line => {
          const clean = line.trim().replace(/^#\s*/, '').replace(/^\$\s*/, '');
          if (clean && isExecutableDeviceCommand(clean)) {
            extractedCommands.push({ cmd: clean });
          }
        });
      }

      if (extractedCommands.length === 0) {
        const localMatches = searchOfflineDatabase(query, selectedBrand);
        if (localMatches.length > 0) {
          extractedCommands.push({
            cmd: localMatches[0].command,
            explanation: localMatches[0].categoryLabel,
          });
        }
      }

      // Automatically harvest and save all playbooks and commands generated by AI into IndexedDB/safeStorage
      const harvestResult = autoHarvestAiResponseToOfflineKb({
        query,
        aiText: data.text,
        brand: selectedBrand,
        model: selectedModelName,
        deviceHost: targetDevHost,
        provider: data.source || userProvider || 'gemini',
      });

      const aiMsg: ChatMessage = {
        id: generateUniqueMessageId('msg-ai'),
        sender: 'ai',
        text: data.text || 'Respon berhasil diterima.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        brandContext: selectedBrand,
        modelContext: selectedModelName,
        commands: extractedCommands.length > 0 ? extractedCommands : undefined,
        isFromOfflineDb: data.source?.includes('Offline'),
        modelUsed: data.source ? `${data.source}` : selectedModel,
      };

      updateCurrentSessionMessages((prev) => [...prev, aiMsg]);

    } catch (err: any) {
      console.error('Chat error:', err);
      const isOfflineMode = selectedModel === 'Offline Database Engine' || selectedModel === 'offline';
      
      let fallbackText = '';
      if (isOfflineMode) {
        const offlineMatches = searchOfflineDatabase(query, selectedBrand);
        fallbackText = `Database Perintah Offline (${selectedBrand.toUpperCase()} - ${targetDevHost}):\n\n`;
        if (offlineMatches.length > 0) {
          const match = offlineMatches[0];
          fallbackText += `**${match.command}**\n${match.description}\n\n*Tips:* ${match.explanationId || match.verificationTip || ''}`;
        } else {
          fallbackText += `Tidak ditemukan referensi offline untuk query tersebut.`;
        }
      } else {
        fallbackText = `⚠️ **[Koneksi Google Gemini 3.7 Flash Terkendala]**\n\nTerjadi kendala saat menghubungi layanan online Google Gemini 3.7 Flash: \`${err?.message || 'Koneksi terputus'}\`.\n\n**Solusi:**\n1. Pastikan koneksi internet Anda aktif.\n2. Buka menu **⚙️ Settings (Pengaturan AI)** di pojok kanan atas untuk memeriksa Gemini API Key.\n3. Coba kirim ulang pesan Anda.`;
      }

      updateCurrentSessionMessages((prev) => [
        ...prev,
        {
          id: generateUniqueMessageId('msg-err'),
          sender: 'ai',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          brandContext: selectedBrand,
          modelContext: selectedModelName,
          commands: undefined,
          isFromOfflineDb: isOfflineMode,
          modelUsed: isOfflineMode ? 'Database Perintah Offline' : 'Google Gemini 3.7 Flash (Koneksi Terkendala)',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to check if terminal screen/buffer is empty or contains only prompts
  const isTerminalScreenEmpty = (rawText?: string): boolean => {
    if (!rawText) return true;
    const stripped = rawText
      .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
      .replace(/\x1b\([a-zA-Z]/g, '')
      .trim();
    if (!stripped) return true;

    const lines = stripped.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return true;

    const meaningfulLines = lines.filter(line => {
      const isPrompt = /^([a-zA-Z0-9_\-.~@:[\]()\s]+[#>$%]\s*)$/.test(line);
      const isPlaceholder = /^(terminal|cisco|mikrotik|huawei|juniper|fortinet|alliedtelesis|allied|linux|switch|router|prompt)$/i.test(line);
      const isConnectHeader = /^(connected|session started|connecting\.\.\.|terminal ready|welcome to)/i.test(line);
      return !isPrompt && !isPlaceholder && !isConnectHeader;
    });

    return meaningfulLines.length === 0;
  };

  // Inspect Terminal Screen Content Action: reads all output of active terminal
  const handleInspectTerminal = async (
    customText?: string,
    options?: {
      isAnomalyOrError?: boolean;
      anomalyTitle?: string;
      anomalySnippet?: string;
      rawErrorLine?: string;
      suggestedAction?: string;
      anomalyType?: string;
      recommendedCommands?: { cmd: string; purpose: string }[];
    }
  ) => {
    if (isLoading) return;

    const targetDevHost = resolveDeviceRealHostname(effectiveDevice);
    // Prioritize full captured config if available, then customText, then active logs
    const fullLog = (window as any).activeTerminalLogs || (window as any).bleTerminalBuffer || '';
    const lastFullCfg = (window as any).lastFullRunningConfig || '';
    let targetText = (customText !== undefined && customText !== '') 
      ? customText 
      : (terminalContextText || '');

    // If the active logs or full config buffer contains more data or a running-config, use the fuller buffer
    if (lastFullCfg && lastFullCfg.length > targetText.length) {
      targetText = lastFullCfg;
    } else if (fullLog && fullLog.length > targetText.length && (fullLog.includes('Building configuration') || fullLog.includes('Current configuration') || fullLog.includes('hostname ') || fullLog.includes('interface '))) {
      targetText = fullLog;
    } else if (!targetText && fullLog) {
      targetText = fullLog;
    }

    // Check if the terminal screen is empty - answer truthfully with reason only (no boilerplate advice/recommendations)
    if (isTerminalScreenEmpty(targetText)) {
      updateCurrentSessionMessages((prev) => [
        ...prev,
        {
          id: generateUniqueMessageId('msg-inspect-empty-user'),
          sender: 'user',
          text: `🔍 [Analisa Layar Terminal: ${targetDevHost}] Memeriksa layar terminal aktif...`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: generateUniqueMessageId('msg-inspect-empty-ai'),
          sender: 'ai',
          text: `⚠️ **Tidak Dapat Menganalisa Layar Terminal**\n\n**Alasan:** Layar terminal saat ini masih kosong (belum ada teks respon perintah atau log output yang terekam pada sesi aktif).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          brandContext: selectedBrand,
          modelContext: selectedModelName,
          isFromOfflineDb: false,
          modelUsed: selectedModel,
        },
      ]);
      return;
    }

    setIsLoading(true);

    const detectedAnomaly = detectTerminalAnomalies(targetText) || (options?.rawErrorLine ? detectTerminalAnomalies(options.rawErrorLine) : null);
    const isAnomaly = Boolean(options?.isAnomalyOrError || detectedAnomaly);
    const anomalyTitle = options?.anomalyTitle || detectedAnomaly?.title || 'Error / Anomali Output Terdeteksi';
    const cleanSnippet = (options?.anomalySnippet || detectedAnomaly?.fullSnippet || '').trim() || options?.rawErrorLine || detectedAnomaly?.rawErrorLine || targetText.slice(-200).trim();

    const userPrompt = isAnomaly
      ? `Terdeteksi error/anomali pada terminal perangkat ${targetDevHost} (${selectedBrand.toUpperCase()} - ${selectedModelName}): "${anomalyTitle}".\nBaris error:\n\`\`\`\n${cleanSnippet}\n\`\`\`\nBerikan analisis ringkas akar masalah (Root Cause) dalam 1-2 kalimat padat, dan rekomendasi perintah CLI perbaikannya.`
      : `Baca dan analisa seluruh output log layar terminal perangkat ${targetDevHost} (${selectedBrand.toUpperCase()} - ${selectedModelName}) saat ini: buatkan ringkasan komprehensif, status perangkat (normal/warning/error), buatkan tabel data jika ada entri penting (seperti IP, MAC, status port, routing, atau lease), serta identifikasi masalah dan solusinya jika ada.`;
    
    updateCurrentSessionMessages((prev) => [
      ...prev,
      {
        id: generateUniqueMessageId('msg-inspect'),
        sender: 'user',
        text: isAnomaly
          ? `🚨 [Investigasi Error Terminal: ${targetDevHost}] ${anomalyTitle}\n\`\`\`bash\n${cleanSnippet}\n\`\`\``
          : `✨ [Analisa Layar Terminal: ${targetDevHost}] Membaca dan menganalisis seluruh output log terminal aktif...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    let diag: any = null;
    const isOfflineMode = selectedModel === 'Offline Database Engine' || selectedModel === 'offline';

    if (isOfflineMode) {
      diag = analyzeTerminalBufferLocally(
        isAnomaly ? cleanSnippet : targetText,
        selectedBrand,
        selectedModelName
      );
    } else {
      try {
        diag = await analyzeTerminalScreenDirect(
          selectedBrand,
          selectedModelName,
          isAnomaly ? cleanSnippet : targetText,
          userPrompt
        );
      } catch (err: any) {
        console.warn('Direct terminal analyze error, using local buffer engine:', err);
      }

      // High-accuracy fallback if API returns null/error or offline
      if (!diag) {
        diag = analyzeTerminalBufferLocally(
          isAnomaly ? cleanSnippet : targetText,
          selectedBrand,
          selectedModelName
        );
      }
    }

    let formattedText = '';
    let finalCommands = diag?.recommendedCommands || [];

    if (isAnomaly) {
      const directSolution = options?.suggestedAction || detectedAnomaly?.suggestedAction || diag?.summary || 'Periksa kembali ejaan perintah atau hak akses terminal.';
      const solutionExplanation = (diag?.explanation && !diag.explanation.includes('###') && diag.explanation !== directSolution)
        ? `\n\n${diag.explanation}`
        : '';

      const cmdsToUse = (diag?.recommendedCommands && diag.recommendedCommands.length > 0)
        ? diag.recommendedCommands
        : (options?.recommendedCommands || detectedAnomaly?.recommendedCommands || []);
      finalCommands = cmdsToUse;

      const commandsSection = cmdsToUse.length > 0
        ? `\n\n#### 🛠️ Rekomendasi Solusi & Perintah:\n` +
          cmdsToUse.map((rc: any, idx: number) => {
            const cmd = typeof rc === 'string' ? rc : rc.cmd;
            const purpose = typeof rc === 'string' ? '' : `##### Langkah ${idx + 1}: ${rc.purpose}\n`;
            return `${purpose}\`\`\`bash\n${cmd}\n\`\`\``;
          }).join('\n\n')
        : '';

      formattedText = `### 🚨 Error / Anomali Terdeteksi
> **Kategori:** \`${anomalyTitle}\`

\`\`\`bash
${options?.rawErrorLine || detectedAnomaly?.rawErrorLine || cleanSnippet}
\`\`\`

💡 **Saran Solusi:**
${directSolution}${solutionExplanation}${commandsSection}`;
    } else {
      const statusBadge = diag.status === 'healthy' 
        ? '🟢 Normal (Healthy)' 
        : diag.status === 'warning' 
        ? '🟡 Perhatian (Warning)' 
        : diag.status === 'critical' 
        ? '🔴 Kritis / Error' 
        : '🔵 Info';

      const commandsSection = diag.recommendedCommands && diag.recommendedCommands.length > 0
        ? `\n\n#### 🛠️ Rekomendasi Perintah untuk ${targetDevHost}:\n` +
          diag.recommendedCommands.map((rc: any, idx: number) => `##### Langkah ${idx + 1}: ${rc.purpose}\n\`\`\`bash\n${rc.cmd}\n\`\`\``).join('\n\n')
        : '';

      const issuesList = diag.identifiedIssues && diag.identifiedIssues.length > 0
        ? diag.identifiedIssues.map((i: string) => `- ${i}`).join('\n')
        : '- Semua parameter berjalan normal tanpa error.';

      const tableSection = diag.formattedTable ? `\n\n${diag.formattedTable.trim()}\n\n` : '';

      if (diag.explanation && diag.explanation.startsWith('### 📋 Analisa Konfigurasi')) {
        formattedText = `${diag.explanation}${commandsSection}`;
      } else {
        // Clean, direct, simple summary layout with structured table
        formattedText = `### 📋 Ringkasan & Analisa Layar: ${targetDevHost}

**Status:** ${statusBadge}

#### 📌 Ringkasan Output Layar:
${diag.summary || 'Pemeriksaan seluruh buffer layar terminal selesai.'}
${tableSection}
#### 🔍 Parameter & Temuan Kunci:
${issuesList}

${diag.explanation ? `#### 💡 Detail & Penjelasan:\n${diag.explanation}\n\n` : ''}${commandsSection}`;
      }
    }

    const aiMsg: ChatMessage = {
      id: generateUniqueMessageId('msg-diag'),
      sender: 'ai',
      text: formattedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      brandContext: selectedBrand,
      modelContext: selectedModelName,
      commands: finalCommands.map((rc: any) => ({
        cmd: typeof rc === 'string' ? rc : rc.cmd,
        explanation: typeof rc === 'string' ? '' : rc.purpose,
      })),
      isFromOfflineDb: false,
      modelUsed: selectedModel,
      terminalDiagnosis: diag,
    };

    updateCurrentSessionMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  // Listen to terminal output chunks and command events during live debug capture
  useEffect(() => {
    if (!isCapturingDebug) return;

    const handleCommandCompleted = (e: any) => {
      const detail = e.detail;
      if (detail && detail.output) {
        debugCapturedChunksRef.current.push(detail.output);
        const joined = debugCapturedChunksRef.current.join('\n');
        setCapturedBuffer(joined);
        setCapturedLinesCount(joined.split('\n').filter(Boolean).length);
      }
    };

    const handleStreamData = (e: any) => {
      const detail = e.detail;
      const text = typeof detail === 'string' ? detail : detail?.text;
      if (text) {
        debugCapturedChunksRef.current.push(text);
        const joined = debugCapturedChunksRef.current.join('\n');
        setCapturedBuffer(joined);
        setCapturedLinesCount(joined.split('\n').filter(Boolean).length);
      }
    };

    window.addEventListener('terminal-command-completed', handleCommandCompleted);
    window.addEventListener('terminal-data-stream', handleStreamData);

    return () => {
      window.removeEventListener('terminal-command-completed', handleCommandCompleted);
      window.removeEventListener('terminal-data-stream', handleStreamData);
    };
  }, [isCapturingDebug]);

  // Continuously track delta between current terminal text and baseline
  useEffect(() => {
    if (!isCapturingDebug) return;
    const cur = terminalContextText || (window as any).activeTerminalLogs || '';
    const base = debugBaselineLogRef.current;
    if (cur.length > base.length && cur.startsWith(base)) {
      const delta = cur.slice(base.length);
      if (delta.trim()) {
        const lines = delta.split('\n').filter(Boolean).length;
        setCapturedLinesCount(lines);
      }
    }
  }, [isCapturingDebug, terminalContextText]);

  // Start Debug & Troubleshooting Analysis:
  // Sends command in input field to terminal and begins capturing all output
  const handleStartDebugAnalysis = () => {
    const cmd = inputValue.trim();
    if (!cmd) {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.placeholder = 'Ketik perintah troubleshooting/debug di sini lalu klik Mulai Analisa...';
      }
      return;
    }

    const targetDevHost = resolveDeviceRealHostname(effectiveDevice);
    const baseline = terminalContextText || (window as any).activeTerminalLogs || '';
    debugBaselineLogRef.current = baseline;
    debugCapturedChunksRef.current = [];
    setCapturedBuffer('');
    setCapturedLinesCount(0);
    setDebugCommand(cmd);
    setIsCapturingDebug(true);

    // Clear input field
    setInputValue('');

    updateCurrentSessionMessages((prev) => [
      ...prev,
      {
        id: generateUniqueMessageId('msg-debug-start'),
        sender: 'user',
        text: `🔴 **[Mulai Analisa Troubleshooting / Debug]**\n- **Perintah:** \`${cmd}\`\n- **Target Host:** \`${targetDevHost}\`\n\n*Perintah dikirim ke terminal. AI sedang menangkap seluruh output yang keluar secara real-time. Klik tombol **"⏹ Stop Analisa"** di atas field chat setelah data/log yang dibutuhkan sudah cukup untuk memulai analisa & summary.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    // Send command to terminal for execution on active device
    onExecuteInTerminal(cmd, effectiveDevice?.id);
  };

  // Stop Debug & Troubleshooting Analysis:
  // Stops capturing and immediately analyzes and summarizes all captured output
  const handleStopDebugAnalysis = async () => {
    if (!isCapturingDebug) return;
    setIsCapturingDebug(false);
    setIsLoading(true);

    const targetDevHost = resolveDeviceRealHostname(effectiveDevice);
    const cur = terminalContextText || (window as any).activeTerminalLogs || '';
    const base = debugBaselineLogRef.current;

    let capturedText = '';
    if (cur.length > base.length && cur.startsWith(base)) {
      capturedText = cur.slice(base.length).trim();
    } else if (debugCapturedChunksRef.current.length > 0) {
      capturedText = debugCapturedChunksRef.current.join('\n').trim();
    } else if (cur.trim()) {
      capturedText = cur.slice(-5000).trim();
    }

    if (!capturedText) {
      capturedText = `[Perintah: ${debugCommand}]\n(Terminal tidak menghasilkan output tambahan selama sesi perekaman)`;
    }

    const lineCount = capturedText.split('\n').filter(Boolean).length;

    updateCurrentSessionMessages((prev) => [
      ...prev,
      {
        id: generateUniqueMessageId('msg-debug-stop'),
        sender: 'user',
        text: `⏹ **[Stop Analisa]** Sesi perekaman dihentikan (${lineCount} baris output tertangkap dari perintah \`${debugCommand}\`).\nAI sedang menganalisis & merangkum temuan masalah...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    const userPrompt = `Lakukan analisis troubleshooting dan debugging mendalam terhadap output log berikut dari perintah '${debugCommand}' pada perangkat ${targetDevHost} (${selectedBrand.toUpperCase()} - ${selectedModelName}).
Tolong berikan:
1. Ringkasan Status & Kesimpulan Masalah (Root Cause Analysis).
2. Temuan Anomali, Error Codes, Packet Drops, Timeout, atau Negosiasi Gagal yang terdeteksi.
3. Tabel data terstruktur untuk log event/paket kunci jika relevan.
4. Rekomendasi Solusi Perbaikan langkah demi langkah serta rekomendasi perintah konfigurasi CLI.`;

    let diag: any = null;
    const isOfflineMode = selectedModel === 'Offline Database Engine' || selectedModel === 'offline';

    if (isOfflineMode) {
      diag = analyzeTerminalBufferLocally(capturedText, selectedBrand, selectedModelName);
    } else {
      try {
        diag = await analyzeTerminalScreenDirect(
          selectedBrand,
          selectedModelName,
          capturedText,
          userPrompt
        );
      } catch (err: any) {
        console.warn('Troubleshooting analysis error, using fallback:', err);
      }

      if (!diag) {
        diag = analyzeTerminalBufferLocally(capturedText, selectedBrand, selectedModelName);
      }
    }

    const statusBadge = diag.status === 'healthy' 
      ? '🟢 Normal (Tidak Ditemukan Masalah Kritis)' 
      : diag.status === 'warning' 
      ? '🟡 Perhatian / Warning Terdeteksi' 
      : diag.status === 'critical' 
      ? '🔴 Masalah / Error Kritis Terdeteksi' 
      : '🔵 Info Troubleshooting';

    const commandsSection = diag.recommendedCommands && diag.recommendedCommands.length > 0
      ? `\n\n**Rekomendasi Perintah Solusi untuk ${targetDevHost}:**\n` +
        diag.recommendedCommands.map((rc: any) => `\`\`\`bash\n${rc.cmd}\n\`\`\`\n*Tujuan: ${rc.purpose}*`).join('\n\n')
      : '';

    const issuesList = diag.identifiedIssues && diag.identifiedIssues.length > 0
      ? diag.identifiedIssues.map((i: string) => `- ${i}`).join('\n')
      : '- Log debug/troubleshooting berjalan normal, parameter dalam batas wajar.';

    const tableSection = diag.formattedTable ? `\n\n${diag.formattedTable}\n` : '';

    const formattedText = `### 🩺 Hasil Analisis Troubleshooting & Debug: \`${debugCommand}\` (${targetDevHost})
**Status:** ${statusBadge}

**Ringkasan & Analisis Masalah:**
${diag.summary || `Analisis terhadap ${lineCount} baris output debug telah selesai.`}
${tableSection}
${diag.explanation ? `**Detail & Penjelasan Akar Masalah:**\n${diag.explanation}\n\n` : ''}**Temuan Anomali & Parameter Kunci:**
${issuesList}${commandsSection}`;

    const aiMsg: ChatMessage = {
      id: generateUniqueMessageId('msg-diag-debug'),
      sender: 'ai',
      text: formattedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      brandContext: selectedBrand,
      modelContext: selectedModelName,
      commands: diag.recommendedCommands?.map((rc: any) => ({
        cmd: rc.cmd,
        explanation: rc.purpose,
      })),
      isFromOfflineDb: false,
      modelUsed: selectedModel,
      terminalDiagnosis: diag,
    };

    updateCurrentSessionMessages((prev) => [...prev, aiMsg]);
    setIsLoading(false);
  };

  // Inspect newly executed command output specifically (Exec & Analisa)
  const handleInspectCommandOutput = async (command: string, commandOutput: string, fullLog?: string) => {
    setIsLoading(true);

    const targetDevHost = resolveDeviceRealHostname(effectiveDevice);
    
    // CRITICAL: Strictly isolate the newly executed command and its output!
    // NEVER fall back to zero exit code if the terminal buffer contains actual output (e.g. docker ps, ip a).
    let targetText = '';
    const trimmedOutput = (commandOutput !== undefined ? commandOutput : '').trim();

    if (trimmedOutput.length > 0) {
      targetText = `${targetDevHost}$ ${command}\n${trimmedOutput}`;
    } else {
      // If commandOutput was empty string, check fullLog or active terminal buffer for output of this command
      const terminalSource = fullLog || terminalContextText || (window as any).activeTerminalLogs || '';
      let extractedFromLog = '';
      if (terminalSource.trim().length > 0) {
        const lines = terminalSource.split('\n');
        const cmdIdx = lines.findIndex(l => l.includes(command));
        if (cmdIdx !== -1) {
          extractedFromLog = lines.slice(cmdIdx).join('\n').trim();
        } else {
          extractedFromLog = lines.slice(-30).join('\n').trim();
        }
      }

      if (extractedFromLog && (
        extractedFromLog.includes('CONTAINER ID') || 
        extractedFromLog.includes('IMAGE') || 
        extractedFromLog.includes('inet ') ||
        extractedFromLog.includes('UP') ||
        extractedFromLog.length > command.length + 15
      )) {
        targetText = extractedFromLog;
      } else {
        // Only classify as silent zero exit code if output is genuinely blank (e.g. usermod, chmod, export, systemctl restart)
        targetText = `${targetDevHost}$ ${command}\n[SUCCESS_ZERO_EXIT_CODE] Perintah '${command}' berhasil dieksekusi tanpa pesan error (exit code 0).`;
      }
    }

    // Pre-check for anomalies
    const initialAnomaly = detectTerminalAnomalies(trimmedOutput) || detectTerminalAnomalies(targetText);
      
    const userPrompt = initialAnomaly
      ? `Terdeteksi error saat mengeksekusi perintah '${command}' pada ${targetDevHost} (${selectedBrand.toUpperCase()} - ${selectedModelName}): "${initialAnomaly.title}".\nBaris error:\n\`\`\`\n${initialAnomaly.rawErrorLine || initialAnomaly.fullSnippet}\n\`\`\`\nBerikan analisis ringkas akar masalah (Root Cause) dalam 1-2 kalimat padat, dan rekomendasi perintah CLI perbaikannya.`
      : `Analisis hasil output terbaru dari perintah '${command}' yang baru saja dieksekusi pada perangkat ${targetDevHost} (${selectedBrand.toUpperCase()} - ${selectedModelName}). Tampilkan ringkasan status, tabel data terstruktur jika ada (seperti kontainer Docker, IP DHCP binding/lease, status interface, tabel routing, atau tabel MAC), serta identifikasi apakah normal atau terdapat masalah/error.`;

    const isAutoExec = pendingAutoExecRef.current && pendingAutoExecRef.current.command === command;
    const targetTempId = isAutoExec ? pendingAutoExecRef.current!.tempMsgId : null;

    if (!isAutoExec) {
      updateCurrentSessionMessages((prev) => [
        ...prev,
        {
          id: generateUniqueMessageId('msg-exec-inspect'),
          sender: 'user',
          text: initialAnomaly
            ? `🚨 [Investigasi Error: \`${command}\`] Terdeteksi error pada ${targetDevHost}: ${initialAnomaly.title}`
            : `⚡ [Exec & Analisa: \`${command}\`] Menganalisis output terbaru dari perangkat ${targetDevHost}...`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    let diag: any = null;
    const isOfflineMode = selectedModel === 'Offline Database Engine' || selectedModel === 'offline';

    if (isOfflineMode) {
      diag = analyzeTerminalBufferLocally(
        initialAnomaly ? (initialAnomaly.fullSnippet || targetText) : targetText,
        selectedBrand,
        selectedModelName
      );
    } else {
      try {
        diag = await analyzeTerminalScreenDirect(
          selectedBrand,
          selectedModelName,
          initialAnomaly ? (initialAnomaly.fullSnippet || targetText) : targetText,
          userPrompt
        );
      } catch (err: any) {
        console.warn('Direct terminal analyze error, using local buffer engine:', err);
      }

      // High-accuracy fallback if API returns null/error or offline
      if (!diag) {
        diag = analyzeTerminalBufferLocally(
          initialAnomaly ? (initialAnomaly.fullSnippet || targetText) : targetText,
          selectedBrand,
          selectedModelName
        );
      }
    }

    // Check if the command output contains an error/anomaly (e.g. command not found, permission denied, syntax error)
    const detectedAnomaly = initialAnomaly || detectTerminalAnomalies(targetText);
    const isErrorOrAnomaly = Boolean(
      detectedAnomaly || 
      diag.status === 'critical' || 
      (diag.status === 'warning' && diag.identifiedIssues && diag.identifiedIssues.some((i: string) => /error|failed|denied|not found|tidak ditemukan|invalid|syntax|cannot/i.test(i)))
    );

    let formattedText = '';
    let finalCommands = diag.recommendedCommands || [];

    if (isErrorOrAnomaly) {
      const anomalyTitle = detectedAnomaly?.title || (diag.status === 'critical' ? 'Error / Kegagalan Perintah' : 'Peringatan / Masalah Perintah');
      const errorSnippet = detectedAnomaly?.fullSnippet || detectedAnomaly?.rawErrorLine || targetText.slice(-300).trim();
      const directSolution = detectedAnomaly?.suggestedAction || diag.summary || 'Periksa kembali sintaksis perintah atau hak akses terminal.';
      const solutionExplanation = (diag.explanation && !diag.explanation.includes('###') && diag.explanation !== directSolution)
        ? `\n\n${diag.explanation}`
        : '';

      const cmdsToUse = (diag.recommendedCommands && diag.recommendedCommands.length > 0)
        ? diag.recommendedCommands
        : (detectedAnomaly?.recommendedCommands || []);
      finalCommands = cmdsToUse;

      const commandsSection = cmdsToUse.length > 0
        ? `\n\n#### 🛠️ Rekomendasi Solusi & Perintah:\n` +
          cmdsToUse.map((rc: any, idx: number) => {
            const c = typeof rc === 'string' ? rc : rc.cmd;
            const purpose = typeof rc === 'string' ? '' : `##### Langkah ${idx + 1}: ${rc.purpose}\n`;
            return `${purpose}\`\`\`bash\n${c}\n\`\`\``;
          }).join('\n\n')
        : '';

      formattedText = `### 🚨 Error / Anomali Terdeteksi
> **Kategori:** \`${anomalyTitle}\`

\`\`\`bash
${detectedAnomaly?.rawErrorLine || errorSnippet}
\`\`\`

💡 **Saran Solusi:**
${directSolution}${solutionExplanation}${commandsSection}`;
    } else {
      const statusBadge = diag.status === 'healthy' 
        ? '🟢 Normal (Healthy)' 
        : diag.status === 'warning' 
        ? '🟡 Perhatian (Warning)' 
        : '🔵 Info';

      const commandsSection = diag.recommendedCommands && diag.recommendedCommands.length > 0
        ? `\n\n#### 🛠️ Rekomendasi Perintah Lanjutan (${targetDevHost}):\n` +
          diag.recommendedCommands.map((rc: any, idx: number) => `##### Langkah ${idx + 1}: ${rc.purpose}\n\`\`\`bash\n${rc.cmd}\n\`\`\``).join('\n\n')
        : '';

      const issuesList = diag.identifiedIssues && diag.identifiedIssues.length > 0
        ? diag.identifiedIssues.map((i: string) => `- ${i}`).join('\n')
        : '- Output perintah berhasil diverifikasi, semua parameter beroperasi normal.';

      const tableSection = diag.formattedTable ? `\n\n${diag.formattedTable.trim()}\n\n` : '';

      formattedText = `### 📋 Hasil Analisis Output: \`${command}\` (${targetDevHost})

**Status:** ${statusBadge}

#### 📌 Ringkasan Hasil:
${diag.summary || `Output perintah '${command}' telah diperiksa.`}
${tableSection}
#### 🔍 Parameter & Temuan Kunci:
${issuesList}

${diag.explanation ? `#### 💡 Detail & Penjelasan:\n${diag.explanation}\n\n` : ''}${commandsSection}`;
    }

    const aiMsg: ChatMessage = {
      id: targetTempId || generateUniqueMessageId('msg-diag'),
      sender: 'ai',
      text: formattedText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      brandContext: selectedBrand,
      modelContext: selectedModelName,
      commands: finalCommands.map((rc: any) => ({
        cmd: typeof rc === 'string' ? rc : rc.cmd,
        explanation: typeof rc === 'string' ? rc : rc.purpose,
      })),
      isFromOfflineDb: false,
      modelUsed: selectedModel,
      terminalDiagnosis: diag,
    };

    if (isAutoExec && targetTempId) {
      pendingAutoExecRef.current = null;
      updateCurrentSessionMessages((prev) => {
        return prev.map(m => m.id === targetTempId ? aiMsg : m);
      });
    } else {
      updateCurrentSessionMessages((prev) => [...prev, aiMsg]);
    }
    setIsLoading(false);
  };

  // Watch for inspect trigger from parent TerminalScreen or App
  useEffect(() => {
    if (inspectTrigger && inspectTrigger.id) {
      if (inspectTrigger.commandExecuted && inspectTrigger.commandOutput !== undefined) {
        handleInspectCommandOutput(
          inspectTrigger.commandExecuted,
          inspectTrigger.commandOutput,
          inspectTrigger.text
        );
      } else {
        handleInspectTerminal(inspectTrigger.text, {
          isAnomalyOrError: inspectTrigger.isAnomalyOrError,
          anomalyTitle: inspectTrigger.anomalyTitle,
          anomalySnippet: inspectTrigger.commandOutput,
          rawErrorLine: (inspectTrigger as any).rawErrorLine,
          suggestedAction: (inspectTrigger as any).suggestedAction,
          anomalyType: (inspectTrigger as any).anomalyType,
          recommendedCommands: (inspectTrigger as any).recommendedCommands,
        });
      }
    }
  }, [inspectTrigger?.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow newline when Shift is pressed
        return;
      }
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentDevHostname = resolveDeviceRealHostname(effectiveDevice);

  // Helper to extract clean mapped device label for vertical chat rail buttons
  const getSessionMappedLabel = (s: ChatSessionState): string => {
    if (s.mappingMode === 'auto') {
      return 'Auto';
    }
    const mappedDev = s.assignedDeviceId ? devices.find(d => d.id === s.assignedDeviceId) : null;
    if (mappedDev) {
      return (mappedDev.hostname || mappedDev.name || mappedDev.ipOrPortLabel || 'Dev').trim();
    }
    return 'Pinned';
  };

  return (
    <div id="ai-assistant-root-container" className="flex h-full w-full min-w-0 z-30 bg-black">
      {/* 1. Main AI Assistant Chat Drawer (Rendered when isOpen is true) */}
      {isOpen && (
        <div 
          id="ai-assistant-panel"
          className="w-full h-full bg-black border-l border-neutral-800 flex flex-col z-30 shadow-2xl min-w-0"
        >
      {/* 1. Header Row (Gemini Style Top Bar) */}
      <div 
        id="ai-panel-header"
        className="h-11 px-2.5 sm:px-3 border-b border-neutral-850 flex items-center justify-between bg-[#131314] flex-shrink-0 text-xs gap-2"
      >
        {/* Left Side: Tombol Auto, Sync Tab, Indikator AI (Semua Icon Only) */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-shrink-0">
          {/* 1. Tombol Auto (Device Mapping Dropdown - Icon Only) */}
          <div className="relative flex-shrink-0" ref={mappingMenuRef}>
            <button
              id="btn-toggle-device-mapping"
              type="button"
              onClick={() => setShowMappingMenu(!showMappingMenu)}
              title={
                currentSession.mappingMode === 'auto'
                  ? `Mapping Perangkat: Auto (${effectiveDevice?.name || 'Aktif'})`
                  : `Mapping Perangkat: ${effectiveDevice?.name || 'Pinned'}`
              }
              className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer flex-shrink-0 ${
                currentSession.mappingMode === 'auto'
                  ? 'bg-blue-950/70 border-blue-800/80 text-blue-300 hover:bg-blue-900/60'
                  : 'bg-amber-950/60 border-amber-800/70 text-amber-300 hover:bg-amber-900/50'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            {/* Device Mapping Menu Dropdown */}
            {showMappingMenu && (
              <div 
                id="device-mapping-menu-dropdown"
                className="absolute left-0 top-full mt-1.5 w-64 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-50 p-2 space-y-2 backdrop-blur-md"
              >
                <div className="px-1.5 pb-1 border-b border-neutral-850">
                  <span className="font-semibold text-neutral-200 block text-[11px]">Mapping Perangkat Chat</span>
                  <span className="text-[10px] text-neutral-400">Pilih nama perangkat dari daftar</span>
                </div>

                {/* Mode 1: Auto-Follow Active Device */}
                <button
                  type="button"
                  id="btn-map-mode-auto"
                  onClick={handleSetSessionAutoMapping}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all border ${
                    currentSession.mappingMode === 'auto'
                      ? 'bg-blue-900/40 border-blue-500/60 text-blue-200'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-850 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Server className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-semibold text-[11px] block">⚡ Ikuti Tab Terminal ({effectiveDevice?.name || 'Aktif'})</span>
                  </div>
                  {currentSession.mappingMode === 'auto' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                </button>

                {/* Mode 2: List of Devices by Name */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-1 block">
                    Daftar Perangkat:
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {devices.map((dev) => {
                      const isSelected = currentSession.mappingMode === 'pinned' && currentSession.assignedDeviceId === dev.id;

                      return (
                        <div
                          key={dev.id}
                          onClick={() => handlePinSessionToDevice(dev.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs border transition-all ${
                            isSelected
                              ? 'bg-blue-950/80 border-blue-500 text-white'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-850 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dev.status === 'connected' ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
                            <span className="font-medium text-xs truncate text-white">{dev.name}</span>
                          </div>

                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Tombol Sync Tab (Icon Only) */}
          <button
            type="button"
            id="btn-toggle-auto-sync-terminal"
            onClick={handleToggleAutoSync}
            title={
              autoSyncWithTerminal
                ? "Sync Tab Terminal: AKTIF (ON) — Chat otomatis mengikuti tab terminal aktif. Klik untuk nonaktifkan."
                : "Sync Tab Terminal: NONAKTIF (OFF) — Klik untuk aktifkan auto-switch chat saat memilih tab terminal."
            }
            className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer flex-shrink-0 ${
              autoSyncWithTerminal
                ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300 hover:bg-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.25)]'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${autoSyncWithTerminal ? 'text-emerald-400' : 'text-neutral-500'}`} />
          </button>

          {/* 3. Indikator AI (Icon Only - Klik untuk Pengaturan Model & API Key) */}
          <button
            type="button"
            id="badge-ai-connection-status"
            onClick={() => {
              triggerQuickValidation();
              setIsLoginModalOpen(true);
            }}
            title={
              aiValidation?.success
                ? `🟢 AI Online (${aiValidation.latencyMs}ms). Klik untuk Pengaturan Model & API Key.`
                : `🟡 AI Siaga. Klik untuk Pengaturan Model & API Key.`
            }
            className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center cursor-pointer flex-shrink-0 relative ${
              isValidatingAi
                ? 'bg-blue-950/80 border-blue-500/60 text-blue-300'
                : aiValidation?.success
                ? 'bg-emerald-950/60 border-emerald-500/50 hover:border-emerald-400 text-emerald-400'
                : 'bg-amber-950/40 border-amber-600/50 hover:border-amber-400 text-amber-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isValidatingAi ? (
              <span className="w-1.5 h-1.5 rounded-full border border-cyan-400 border-t-transparent animate-spin absolute top-1 right-1" />
            ) : aiValidation?.success ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse absolute top-1 right-1" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-1" />
            )}
          </button>
        </div>

        {/* Right Side: Tombol Cari, Tambah (+), Clear Chat, Close (Semua Icon Only) */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Quick Search History Button */}
          <button
            id="btn-header-search-history"
            type="button"
            onClick={() => setShowRequestHistoryDrawer(!showRequestHistoryDrawer)}
            title="Cari Riwayat Percakapan"
            className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center flex-shrink-0 ${
              showRequestHistoryDrawer
                ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                : 'border-neutral-800 bg-[#1a1b1e] hover:bg-[#282a2c] text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* New Chat Session Button (+) */}
          <button
            id="btn-create-chat-session"
            type="button"
            onClick={() => handleAddNewSession()}
            title="Mulai Sesi Chat Baru (+)"
            className="w-7 h-7 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/60 text-blue-300 hover:text-white transition-all flex items-center justify-center cursor-pointer flex-shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Clear / Reset Chat Button */}
          <div className="relative flex-shrink-0" ref={clearMenuRef}>
            <button
              id="btn-open-clear-chat"
              type="button"
              onClick={() => setShowClearMenu(!showClearMenu)}
              title="Pilihan Bersihkan Chat / Hapus Sesi"
              className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center ${
                showClearMenu
                  ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                  : 'border-neutral-800 bg-[#1a1b1e] hover:bg-[#282a2c] text-neutral-400 hover:text-rose-400'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Clear Chat Dropdown Modal */}
            {showClearMenu && (
              <div 
                id="clear-chat-dropdown"
                className="absolute right-0 top-full mt-1.5 w-64 p-2 bg-[#1e1f20] border border-neutral-700 rounded-xl shadow-2xl z-50 text-xs space-y-1.5 backdrop-blur-md"
              >
                <div className="px-2 py-1 border-b border-neutral-700">
                  <span className="font-semibold text-neutral-200 block text-[11px]">Pilihan Bersihkan Chat</span>
                  <span className="text-[10px] text-neutral-400">Pilih tindakan untuk sesi chat saat ini</span>
                </div>

                <button
                  type="button"
                  id="btn-clear-current-session-messages"
                  onClick={handleClearCurrentSessionMessages}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-900/40 text-rose-200 hover:text-rose-100 flex items-start gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-[11px] block">Bersihkan Pesan Chat Ini</span>
                    <span className="text-[10px] text-neutral-400 block truncate">Hapus pesan dalam sesi "{currentSession.title}"</span>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-delete-current-session"
                  onClick={() => handleDeleteSession(currentSession.id)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/80 text-rose-300 hover:text-rose-100 flex items-start gap-2 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-[11px] block text-rose-300">Hapus Sesi Chat Ini</span>
                    <span className="text-[10px] text-neutral-400 block">Hapus sesi ini dari daftar multiple chat</span>
                  </div>
                </button>

                <button
                  type="button"
                  id="btn-clear-all-devices-chat"
                  onClick={handleResetAllSessions}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-950/60 text-neutral-300 hover:text-red-200 flex items-start gap-2 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-[11px] block text-amber-300">Reset Semua Sesi Chat</span>
                    <span className="text-[10px] text-neutral-400 block">Hapus seluruh percakapan semua sesi</span>
                  </div>
                </button>

                <div className="pt-1 border-t border-neutral-700 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowClearMenu(false)}
                    className="px-2 py-0.5 rounded text-[10px] text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close Panel Button */}
          {onClosePanel && (
            <button
              id="btn-close-ai-panel"
              type="button"
              onClick={onClosePanel}
              title="Tutup Panel Chat AI"
              className="w-7 h-7 rounded-lg border border-neutral-800 bg-[#1a1b1e] hover:bg-[#282a2c] text-neutral-400 hover:text-neutral-200 transition-all flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Multi-Chat Tabs Header Bar (Clean Minimalist, No Duplicate Buttons) */}
      <div 
        id="chat-tabs-header-bar"
        className="h-7 bg-black border-b border-neutral-800 px-1.5 flex items-center text-neutral-300 select-none flex-shrink-0"
      >
        {/* Scrollable Chat Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full py-0.5">
          {/* Render individual chat session tabs */}
          {sessions.map((s, idx) => {
            const isActive = s.id === activeSessionId;
            const chatNum = idx + 1;
            const assignedDev = s.assignedDeviceId ? devices.find(d => d.id === s.assignedDeviceId) : null;
            const devLabel = assignedDev ? resolveDeviceRealHostname(assignedDev) : (s.mappingMode === 'auto' ? 'Auto' : null);

            return (
              <div
                key={s.id}
                id={`chat-tab-${s.id}`}
                onClick={() => handleSelectSession(s.id)}
                className={`group flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono cursor-pointer border transition-all select-none whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-neutral-900 text-white border-neutral-700 shadow-xs ring-1 ring-blue-500/40'
                    : 'bg-black text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60 border-transparent'
                }`}
                title={`Chat #${chatNum}${devLabel ? ` (${devLabel})` : ''}`}
              >
                <MessageSquare className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-neutral-500'}`} />

                <span className="font-mono font-bold text-[10.5px]">
                  #{chatNum}
                </span>

                {devLabel && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-sans truncate max-w-[80px] ${
                    isActive ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' : 'bg-neutral-900 text-neutral-400'
                  }`}>
                    {devLabel}
                  </span>
                )}

                {/* Close Tab Button */}
                {sessions.length > 1 && (
                  <button
                    type="button"
                    id={`btn-close-chat-tab-${s.id}`}
                    title={`Tutup Chat #${chatNum}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(s.id, e);
                    }}
                    className="p-0.5 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors ml-0.5 opacity-60 group-hover:opacity-100"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-Sync Terminal Session Switch Notification Banner */}
      {sessionSwitchNotification && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-blue-950 via-[#162032] to-[#131314] border-b border-blue-600/80 text-blue-200 text-[11px] flex items-center justify-between animate-fadeIn flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2 truncate">
            <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 animate-pulse" />
            <span className="truncate">
              ⚡ Sesi AI beralih ke: <strong className="text-white font-mono">{sessionSwitchNotification.deviceName}</strong> <span className="text-blue-300/80 text-[10px]">({sessionSwitchNotification.sessionTitle})</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSessionSwitchNotification(null)}
            className="text-neutral-400 hover:text-white p-0.5 rounded transition-colors ml-2"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Clear Success Feedback Banner */}
      {clearSuccessFeedback && (
        <div className="px-3 py-1.5 bg-emerald-950/90 border-b border-emerald-800 text-emerald-300 text-[11px] flex items-center gap-2 animate-fadeIn flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{clearSuccessFeedback}</span>
        </div>
      )}

      {/* 3. Sleek Single Sub-bar: Brand, Device Target, and History/Auto-Saved */}
      <div 
        id="compact-sub-toolbar"
        className="px-2 py-1 bg-black border-b border-neutral-800 flex items-center justify-between text-xs flex-shrink-0 gap-1.5"
      >
        {/* Left Side: Brand Selector Trigger Pill & Target Host */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <button
            id="btn-toggle-brand-selector"
            type="button"
            onClick={() => setShowBrandSelector(!showBrandSelector)}
            title="Klik untuk ganti brand / model perangkat target"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 border border-blue-800/80 font-mono text-[10px] font-semibold uppercase flex-shrink-0 transition-colors"
          >
            <span>{selectedBrand}</span>
            <span className="text-neutral-300 font-sans font-normal truncate max-w-[90px] sm:max-w-[130px] hidden xs:inline">{selectedModelName}</span>
            <ChevronDown className="w-2.5 h-2.5 text-blue-400" />
          </button>

          <span className="text-[10px] text-neutral-400 truncate max-w-[110px] sm:max-w-[160px]">
            Target: <strong className="text-neutral-200">{currentDevHostname}</strong>
          </span>
        </div>

        {/* Right Side: Request History & Auto-Saved Persistence */}
        <div className="flex items-center gap-1 flex-shrink-0" ref={requestHistoryRef}>
          <button
            id="btn-toggle-request-history"
            type="button"
            onClick={() => setShowRequestHistoryDrawer(!showRequestHistoryDrawer)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-all ${
              showRequestHistoryDrawer
                ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                : requestHistoryItems.length > 0
                ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800'
                : 'bg-black text-neutral-500 border-neutral-850 hover:text-neutral-300'
            }`}
            title="Daftar riwayat pertanyaan di sesi chat ini"
          >
            <History className={`w-3 h-3 ${requestHistoryItems.length > 0 ? 'text-blue-400' : 'text-neutral-500'}`} />
            <span>{requestHistoryItems.length}</span>
          </button>

          <div 
            className="flex items-center gap-0.5 text-[9.5px] text-neutral-400 px-1 py-0.5 rounded bg-neutral-950 border border-neutral-850 font-mono"
            title="Auto-saved ke storage laptop"
          >
            <HardDrive className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-emerald-400 font-bold">✓</span>
          </div>
        </div>
      </div>

      {/* Expandable Brand & Model Picker Modal */}
      {showBrandSelector && (
        <div 
          id="expanded-brand-picker"
          className="mx-2 my-1 p-2 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2 text-xs flex-shrink-0 animate-fadeIn"
        >
          <div>
            <label className="text-[10px] text-neutral-400 block mb-1">Pilih Brand:</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 max-h-36 overflow-y-auto pr-1">
              {Object.values(getUnifiedBrandCatalog()).map((b) => (
                <button
                  key={b.id}
                  id={`picker-brand-${b.id}`}
                  onClick={() => {
                    setSelectedBrand(b.id as DeviceBrand);
                    setSelectedModelName(b.models[0]?.name || '');
                  }}
                  className={`py-1 px-1.5 rounded text-[10.5px] font-medium capitalize text-center border transition-all truncate ${
                    selectedBrand === b.id
                      ? 'bg-blue-600 border-blue-400 text-white shadow-xs'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 block mb-1">Pilih Tipe / Seri Model:</label>
            <select
              id="select-model-type"
              value={selectedModelName}
              onChange={(e) => setSelectedModelName(e.target.value)}
              className="w-full bg-black text-neutral-200 text-xs border border-neutral-800 rounded p-1 focus:outline-none focus:border-blue-500"
            >
              {(getUnifiedBrandCatalog()[selectedBrand]?.models || []).map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.category})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-1">
            <button
              id="btn-confirm-brand-picker"
              onClick={() => setShowBrandSelector(false)}
              className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-[10.5px] font-medium hover:bg-blue-500 shadow-xs"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}

      {/* Request History Dropdown Drawer */}
      {showRequestHistoryDrawer && (
        <div 
          id="request-history-dropdown"
          className="mx-2 my-1 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-2 space-y-2 backdrop-blur-md text-xs animate-fadeIn flex-shrink-0"
        >
          <div className="flex items-center justify-between pb-1 border-b border-neutral-850">
            <div className="flex items-center gap-1.5 text-neutral-200 font-semibold text-[11px]">
              <History className="w-3 h-3 text-blue-400" />
              <span>Riwayat Request & Konfigurasi</span>
            </div>
            <button
              type="button"
              onClick={() => setShowRequestHistoryDrawer(false)}
              className="p-0.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3 h-3 text-neutral-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Cari kata kunci (cth: interface, bgp, ssh)..."
              className="w-full bg-black border border-neutral-800 rounded-md pl-7 pr-6 py-0.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
            {historySearchQuery && (
              <button
                type="button"
                onClick={() => setHistorySearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-[10px]"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Items List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {filteredHistoryItems.length === 0 ? (
              <div className="p-2.5 text-center text-neutral-400 text-[10.5px] bg-black rounded-lg border border-neutral-800">
                {historySearchQuery 
                  ? 'Tidak ditemukan riwayat pertanyaan yang cocok.'
                  : 'Belum ada riwayat request di sesi chat ini.'}
              </div>
            ) : (
              filteredHistoryItems.map((item, hIdx) => {
                const aiModel = item.aiMsg?.modelUsed || 'AI Assistant';
                const hasAnswer = !!item.aiMsg;

                return (
                  <div
                    key={`hist-${item.id}-${hIdx}`}
                    onClick={() => {
                      handleJumpToRequest(item.userMsg.id, item.aiMsg?.id);
                      setShowRequestHistoryDrawer(false);
                    }}
                    className="group p-1.5 rounded-lg bg-neutral-900 hover:bg-blue-950/40 border border-neutral-800 hover:border-blue-700/60 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-[9.5px]">
                      <div className="flex items-center gap-1">
                        <span className="px-1 py-0.2 rounded bg-blue-900/60 text-blue-200 font-mono font-semibold">
                          #{item.index}
                        </span>
                        <span className="text-neutral-400">{item.userMsg.timestamp}</span>
                      </div>

                      <div className="flex items-center gap-0.5 text-blue-400 group-hover:text-blue-300 font-medium">
                        <span>Lompat</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </div>
                    </div>

                    <div className="flex items-start gap-1">
                      <span className="text-[9.5px] text-blue-400 font-semibold flex-shrink-0">Tanya:</span>
                      <p className="text-[10.5px] text-neutral-200 font-medium line-clamp-1 leading-tight">
                        {item.userMsg.text}
                      </p>
                    </div>

                    {hasAnswer && (
                      <div className="flex items-start gap-1 bg-black/40 p-1 rounded border border-neutral-850">
                        <span className="text-[9.5px] text-emerald-400 font-semibold flex-shrink-0">Jwb:</span>
                        <p className="text-[10px] text-neutral-300 line-clamp-1 leading-tight">
                          {item.aiMsg?.commands && item.aiMsg.commands.length > 0 
                            ? `CLI: ${item.aiMsg.commands.map(c => c.cmd).join('; ')}`
                            : (item.aiMsg?.text || '').replace(/[\r\n]+/g, ' ').substring(0, 100)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Chat Messages Scroll Area (Google Gemini Stream Experience) */}
      <div 
        id="ai-messages-scroll-area"
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 font-sans text-xs select-text bg-[#131314] overscroll-contain will-change-scroll"
        style={{
          contain: 'content',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {currentMessages.map((msg, mIdx) => {
          const isUser = msg.sender === 'user';
          const isSaved = bookmarkedIds[msg.id];
          const isHighlighted = highlightedMessageId === msg.id;
          const uniqueKey = `${msg.id || 'msg'}-${mIdx}`;

          return (
            <div
              key={uniqueKey}
              id={`chat-msg-${msg.id}`}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all duration-300 ${
                isHighlighted
                  ? 'scale-[1.01] p-1.5 rounded-2xl bg-blue-950/40 ring-1 ring-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                  : ''
              }`}
            >
              {isUser ? (
                /* User Message (Gemini Right Bubble) */
                <div className="max-w-[88%] bg-[#282a2c] text-neutral-100 border border-neutral-700/60 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs leading-relaxed shadow-sm font-sans">
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div className="flex justify-end mt-1 text-[9.5px] text-neutral-400">
                    {msg.timestamp}
                  </div>
                </div>
              ) : (
                /* Gemini Assistant Turn (Gemini Web Left Flow) */
                <div className="w-full max-w-full space-y-2">
                  {/* Gemini Avatar & Header */}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-400 p-[1px] flex items-center justify-center flex-shrink-0">
                      <div className="w-full h-full bg-[#131314] rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-blue-400" />
                      </div>
                    </div>
                    <span className="font-medium text-slate-200 text-[11.5px]">
                      {(() => {
                        const raw = msg.modelUsed || 'Gemini 3.7 Flash';
                        if (raw.includes('Siaga') || raw.includes('Co-Pilot')) return 'Gemini 3.7 Flash';
                        if (raw.startsWith('Google Gemini')) return raw.replace(/^Google /, '');
                        return raw;
                      })()}
                    </span>
                    {msg.isFromOfflineDb && !msg.modelUsed && (
                      <span className="px-1.5 py-0.2 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800 text-[9px] font-mono">
                        Offline Engine
                      </span>
                    )}
                  </div>

                  {/* Message Content Container */}
                  <div className={`rounded-2xl rounded-tl-sm p-3.5 text-xs text-neutral-200 leading-relaxed shadow-sm transition-all ${
                    msg.text.includes('🚨 Error / Anomali Terdeteksi')
                      ? 'bg-gradient-to-br from-red-950/30 via-[#1e1f20] to-[#161718] border border-red-500/50 shadow-[0_4px_20px_rgba(239,68,68,0.2)]'
                      : 'bg-[#1e1f20]/90 border border-neutral-800'
                  }`}>
                    <RenderMessageBody
                      text={msg.text}
                      msgId={msg.id}
                      activeDeviceName={currentDevHostname}
                      onExecute={handleExecuteCommand}
                      onExecuteAndInspect={handleExecuteAndInspect}
                      onCopy={handleCopyCommand}
                      copiedCmd={copiedCmd}
                      executedCmd={executedCmd}
                    />

                    {/* Gemini Search Grounding Links if available */}
                    {msg.searchGrounding && msg.searchGrounding.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-neutral-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-blue-400">
                          <Search className="w-3 h-3" />
                          <span>Google Search Sources:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.searchGrounding.map((src, sIdx) => (
                            <a
                              key={`src-ground-${sIdx}`}
                              href={src.uri}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#131314] hover:bg-[#282a2c] text-[10px] text-neutral-300 hover:text-blue-300 border border-neutral-700/80 transition-colors truncate max-w-[200px]"
                            >
                              <Link className="w-2.5 h-2.5 flex-shrink-0 text-blue-400" />
                              <span className="truncate">{src.title || src.uri}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Gemini Actions Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/80 text-[10px] text-neutral-400">
                      <div className="flex items-center gap-2">
                        {/* Copy full response button */}
                        <button
                          type="button"
                          onClick={() => {
                            const textToCopy = formatMarkdownTables(msg.text);
                            copyToClipboard(textToCopy);
                            setCopiedCmd(`full-${msg.id}`);
                            setTimeout(() => setCopiedCmd(null), 2000);
                          }}
                          title="Salin seluruh jawaban"
                          className="p-1 rounded hover:bg-[#282a2c] text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1"
                        >
                          {copiedCmd === `full-${msg.id}` ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span className="text-[9.5px]">Salin</span>
                        </button>

                        {/* Save to Local Docs */}
                        <button
                          type="button"
                          onClick={() => handleSaveToDocs(msg)}
                          title={isSaved ? "Tersimpan di Dokumen Lokal" : "Simpan solusi ke dokumen lokal"}
                          className={`p-1 rounded text-[10px] transition-colors flex items-center gap-1 ${
                            isSaved 
                              ? 'text-emerald-400' 
                              : 'hover:bg-[#282a2c] text-neutral-400 hover:text-neutral-200'
                          }`}
                        >
                          {isSaved ? <BookmarkCheck className="w-3 h-3 text-emerald-400" /> : <Bookmark className="w-3 h-3" />}
                          <span className="text-[9.5px]">{isSaved ? 'Tersimpan' : 'Simpan'}</span>
                        </button>
                      </div>

                      <span className="text-[9.5px] text-neutral-500 font-mono">{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Gemini Thinking / Analysis Pulse */}
        {isLoading && (
          <div className="w-full flex items-start gap-2.5 p-3 rounded-2xl bg-[#1e1f20] border border-neutral-800 text-neutral-200 shadow-sm animate-pulse">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-400 p-[1px] flex items-center justify-center flex-shrink-0 animate-spin">
              <div className="w-full h-full bg-[#131314] rounded-full flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-blue-400" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[11.5px] font-medium text-slate-200">Gemini sedang menganalisa...</div>
              <div className="text-[10px] text-neutral-400">
                Memeriksa buffer terminal {currentDevHostname} & sintaks {selectedBrand.toUpperCase()}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. Bar Tombol Di Atas Field Chat (Sejajar Analisa Layar) */}
      <div 
        id="quick-query-pills-bar"
        className="px-2.5 py-1.5 bg-[#131314] border-t border-neutral-850 flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0"
      >
        {/* Tombol 1: Analisa Layar */}
        <button
          id="btn-pill-inspect-screen"
          title="Baca dan analisa seluruh output terminal aktif saat ini"
          onClick={() => handleInspectTerminal()}
          disabled={isLoading || isCapturingDebug}
          className="px-3 py-1 rounded-full bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 text-[11px] border border-blue-500/40 whitespace-nowrap transition-all flex items-center gap-1.5 font-medium shadow-xs flex-shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
          <span>✨ Analisa Layar</span>
        </button>

        {/* Tombol 2: Mulai Analisa / Stop Analisa (Live Troubleshooting / Debug) */}
        {!isCapturingDebug ? (
          <button
            id="btn-pill-start-debug-analysis"
            title="Eksekusi teks perintah di field chat ke terminal dan tangkap seluruh output untuk troubleshooting/debug"
            onClick={handleStartDebugAnalysis}
            disabled={isLoading}
            className="px-3 py-1 rounded-full bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 text-[11px] border border-emerald-500/40 whitespace-nowrap transition-all flex items-center gap-1.5 font-medium shadow-xs flex-shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/40" />
            <span>▶ Mulai Analisa</span>
          </button>
        ) : (
          <button
            id="btn-pill-stop-debug-analysis"
            title="Hentikan perekaman dan mulai analisa output troubleshooting/debug"
            onClick={handleStopDebugAnalysis}
            className="px-3 py-1 rounded-full bg-red-600/30 hover:bg-red-600/50 text-red-200 text-[11px] border border-red-500/80 whitespace-nowrap transition-all flex items-center gap-1.5 font-medium shadow-md flex-shrink-0 cursor-pointer animate-pulse"
          >
            <Square className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            <span className="font-semibold">⏹ Stop Analisa</span>
            <span className="text-[9.5px] bg-red-950/80 px-1.5 py-0.2 rounded text-red-300 font-mono">
              {capturedLinesCount} baris
            </span>
          </button>
        )}

        {/* Indikator status jika sedang merekam debug */}
        {isCapturingDebug && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-2.5 py-0.5 rounded-full whitespace-nowrap">
            <Activity className="w-3 h-3 text-amber-400 animate-spin" />
            <span className="truncate max-w-[220px]">Merekam: <b>{debugCommand}</b></span>
          </div>
        )}
      </div>

      {/* 6. AI Bottom Composer Box */}
      <div 
        id="ai-assistant-input-container"
        className="p-2.5 bg-[#131314] border-t border-neutral-850 flex-shrink-0 space-y-1.5"
      >
        {/* [SEC-05] Opt-in: sertakan output terminal di pertanyaan ke AI online */}
        <label
          id="ai-share-terminal-toggle"
          className="flex items-center gap-1.5 px-1 text-[10px] text-neutral-400 cursor-pointer select-none"
          title="Jika aktif, cuplikan output terminal ikut dikirim ke provider AI online. Password, secret, dan community string disamarkan otomatis. Tombol Analisa selalu mengirim output terminal karena diminta secara eksplisit."
        >
          <input
            type="checkbox"
            checked={shareTerminalWithAi}
            onChange={toggleShareTerminalWithAi}
            className="accent-blue-500 w-3 h-3"
          />
          <span>Sertakan output terminal ke AI online</span>
          <span className="text-neutral-600">({shareTerminalWithAi ? 'aktif, secret disamarkan' : 'mati'})</span>
        </label>

        {/* Active Target Device Indicator for Current Chat */}
        <div className="flex items-center justify-between px-1 text-[10px] text-neutral-400">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-neutral-500 font-sans">Terminal Target:</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-750 text-blue-300 font-semibold font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${effectiveDevice?.status === 'connected' ? 'bg-emerald-400' : 'bg-neutral-500'}`} />
              {resolveDeviceRealHostname(effectiveDevice)}
            </span>
            {effectiveDevice?.id !== activeDevice?.id && (
              <span className="text-amber-400 text-[9.5px] font-sans">
                (Berbeda dengan tab aktif)
              </span>
            )}
          </div>
          {effectiveDevice?.id !== activeDevice?.id && onSelectActiveDevice && (
            <button
              type="button"
              onClick={() => onSelectActiveDevice(effectiveDevice.id)}
              className="text-blue-400 hover:text-blue-300 text-[9.5px] font-sans underline cursor-pointer"
            >
              Fokuskan Tab Terminal
            </button>
          )}
        </div>

        <div className="bg-[#1e1f20] border border-neutral-700/80 rounded-2xl p-2.5 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30 transition-all shadow-md">
          <textarea
            id="textarea-ai-input"
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isCapturingDebug
                ? `🔴 Sedang merekam output '${debugCommand}'... Tekan Enter untuk mengirim.`
                : `Tanyakan ke AI atau ketik perintah untuk ${currentDevHostname}... (Enter: kirim, Shift+Enter: baris baru)`
            }
            className="w-full bg-transparent text-xs text-neutral-100 placeholder-neutral-500 resize-none outline-none font-sans min-h-[34px] max-h-[140px] px-1 py-0.5 leading-relaxed"
          />
        </div>
      </div>
        </div>
      )}

      {/* Provider Account Login & AI Model Settings Modal */}
      <ProviderLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        initialProvider={
          selectedModel.includes('ChatGPT') || selectedModel.includes('OpenAI') 
            ? 'openai' 
            : selectedModel.includes('Claude') 
            ? 'claude' 
            : selectedModel.includes('DeepSeek') 
            ? 'deepseek' 
            : 'gemini'
        }
        selectedModel={selectedModel}
        onModelChange={(m) => {
          setSelectedModel(m);
          try {
            safeStorage.setItem('69ai_ui_selected_model', m);
          } catch (e) {}
        }}
        onProviderSelected={(pId, model) => {
          setSelectedModel(model);
          try {
            safeStorage.setItem('69ai_ui_selected_model', model);
          } catch (e) {}
          setIsLoginModalOpen(false);
        }}
      />
    </div>
  );
};
