export type ConnectionType = 'ssh' | 'serial_cable' | 'serial_bluetooth' | 'telnet';

export type DeviceBrand = 
  | 'juniper'
  | 'cisco' 
  | 'nexus'
  | 'huawei'
  | 'arista'
  | 'paloalto'
  | 'ubiquiti'
  | 'alliedtelesis'
  | 'linux'
  | 'fortinet'
  | 'aruba' 
  | 'ruckus' 
  | 'hpe' 
  | 'dell' 
  | 'macos' 
  | 'windows' 
  | 'android' 
  | 'mikrotik' 
  | 'openwrt' 
  | 'custom' 
  | 'generic'
  | (string & {});

export interface DeviceModelOption {
  id: string;
  name: string;
  category: string;
  osType: string;
  defaultBaud?: number;
  samplePrompt: string;
}

export interface DeviceProfile {
  id: string;
  name: string;
  type: ConnectionType;
  brand: DeviceBrand;
  model: string;
  host?: string;
  hostname?: string; // Real CLI prompt hostname (e.g. PHR-Site2, Ubuntu-Prod-01)
  port?: number;
  username?: string;
  password?: string;
  baudRate?: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  flowControl?: 'none' | 'hardware';
  dtrRts?: boolean;
  lineEnding?: 'crlf' | 'cr' | 'lf';
  bluetoothName?: string;
  bluetoothAddress?: string;
  serialPortPath?: string; // Real OS hardware device node path (e.g. /dev/cu.usbserial-10, COM3)
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: string;
  ipOrPortLabel: string;
  description?: string;
}

export interface CommandReference {
  id: string;
  brand: DeviceBrand;
  modelCategory: string; // e.g. "Cisco IOS-XE (Catalyst 9000 / Cat 8000)", "FortiOS 7.x", "Junos OS", "Dell OS10", "HPE Comware 7", "Ubuntu/Linux", "macOS Terminal", "Windows PowerShell", "Android ADB"
  osFamily?: string; // Standardized shared OS family (e.g. "ios-xe", "junos", "fortios", "aoscx", "fastiron", "comware", "os10", "linux", "macos", "windows", "android")
  category: 'staging_ssh' | 'show' | 'config_basic' | 'bgp' | 'ospf' | 'vlan' | 'interface' | 'vpn' | 'system' | 'wireless' | 'security' | 'cellular_gps' | 'routing' | 'nat' | 'ha_failover' | 'sdwan' | 'server_admin' | 'docker_web' | 'diagnostics' | 'playbook';
  categoryLabel: string;
  command: string;
  description: string;
  explanationId?: string; // Indonesian explanation & guidance
  sampleOutput?: string;
  verificationTip?: string;
  mode?: 'user' | 'privileged' | 'config' | 'diagnostic';
  tags: string[];
  isCachedOnline?: boolean;
  isPlaybook?: boolean;
  isAiLearned?: boolean;
  sourceQuery?: string;
  createdAt?: string;
}

export interface OnlineSearchDoc {
  id: string;
  title: string;
  query: string;
  provider: 'gemini' | 'openai' | 'claude' | 'deepseek' | 'offline';
  summary: string;
  content: string;
  groundingUrls?: { title: string; url: string }[];
  tags: string[];
  savedAt: string;
  brand: DeviceBrand;
}

export interface LocalDatabaseStats {
  engine: 'IndexedDB' | 'LocalStorage';
  totalOfflineCommands: number;
  totalOnlineDocs: number;
  totalDevices: number;
  totalChatSessions: number;
  estimatedSizeKb: number;
  lastUpdated: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  brandContext?: DeviceBrand;
  modelContext?: string;
  commands?: {
    cmd: string;
    explanation?: string;
  }[];
  isFromOfflineDb?: boolean;
  modelUsed?: string;
  searchGrounding?: { title?: string; uri: string }[];
  terminalDiagnosis?: {
    status: 'healthy' | 'warning' | 'critical' | 'info';
    summary: string;
    identifiedIssues: string[];
    recommendedCommands?: { cmd: string; purpose?: string }[] | string[];
    explanation?: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  brand: DeviceBrand;
  model: string;
  assignedDeviceId?: string | null; // null or 'auto' for auto-following active terminal, or specific deviceId
  mappingMode?: 'auto' | 'pinned';
  messages: ChatMessage[];
  createdAt: string;
  updatedAt?: string;
}

export interface TerminalLogEntry {
  id: string;
  timestamp: string;
  type: 'stdin' | 'stdout' | 'stderr' | 'system' | 'info';
  text: string;
}

export interface SystemNetworkInterface {
  name: string;
  hardwarePort?: string;
  displayName: string;
  type: 'ethernet' | 'wifi' | 'loopback' | 'virtual' | 'other';
  typeLabel: string;
  mac: string;
  ipv4: string | null;
  ipv6: string | null;
  netmask: string | null;
  cidr: string | null;
  subnetPrefix: string;
  isInternal: boolean;
  status: 'UP' | 'DOWN';
  speedHint?: string;
  isDefault?: boolean;
  isRealTime?: boolean;
}

export type SnapshotType = 'pre_change' | 'post_change' | 'auto_show_run' | 'manual' | 'uploaded';

export interface ConfigSnapshot {
  id: string;
  deviceId: string;
  deviceName: string;
  brand: DeviceBrand;
  timestamp: string; // ISO string
  label: string; // e.g., "Pre-Change Baseline", "Post-Change (10:35)", "show running-config #2", "Manual Snapshot"
  type: SnapshotType;
  rawConfig: string;
  normalizedConfig: string;
  commandSource?: string; // e.g. "show running-config", "show configuration", "display current-configuration"
  lineCount: number;
}

export interface ConfigDiffChange {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  lineNumberA?: number;
  lineNumberB?: number;
  content: string;
  oldContent?: string;
  blockContext?: string; // e.g. "interface GigabitEthernet0/1"
}

export interface ConfigDiffResult {
  snapshotA: ConfigSnapshot;
  snapshotB: ConfigSnapshot;
  changes: ConfigDiffChange[];
  stats: {
    additions: number;
    deletions: number;
    modifications: number;
    unchanged: number;
  };
  summary: string;
  rollbackScript: string;
}

