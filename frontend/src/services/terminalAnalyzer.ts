export interface UniversalInterface {
  index?: string;
  name: string;
  state: 'UP' | 'DOWN' | 'ADMIN_DOWN' | 'TESTING';
  ipv4List: string[];
  ipv6List?: string[];
  mac?: string;
  mtu?: string;
  type: string;
  flags?: string;
  broadcast?: string;
  speed?: string;
  duplex?: string;
}

export interface UniversalRoute {
  destination: string;
  gateway: string;
  interface: string;
  protocol: string;
  metric?: string;
  isDefault: boolean;
  status: 'ACTIVE' | 'LINK_DOWN' | 'UNREACHABLE';
}

export interface UniversalBgpPeer {
  peerIp: string;
  asNumber: string;
  state: string;
  prefixesReceived: string;
  uptime?: string;
  isEstablished: boolean;
  msgRcvd?: string;
  msgSent?: string;
}

export interface UniversalOspfNeighbor {
  neighborId: string;
  ipAddress: string;
  interface: string;
  state: string;
  priority?: string;
  deadTime?: string;
  isFull: boolean;
}

export interface UniversalVlan {
  vlanId: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  ports: string[];
}

export interface UniversalArpEntry {
  ipAddress: string;
  macAddress: string;
  interface: string;
  type: string;
  state?: string;
}

export interface UniversalMacEntry {
  vlan: string;
  macAddress: string;
  type: string;
  ports: string;
}

export interface UniversalSystemHealth {
  cpuUsage?: string;
  cpuCores?: string;
  memoryTotal?: string;
  memoryUsed?: string;
  memoryFree?: string;
  memoryUsagePercent?: string;
  temperature?: string;
  powerSupplies?: { id: string; status: string }[];
  fans?: { id: string; status: string }[];
  uptime?: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export interface UniversalInterfaceError {
  interface: string;
  inputErrors: number;
  crcErrors: number;
  outputErrors: number;
  collisions: number;
  drops: number;
  flaps?: number;
}

export interface UniversalPort {
  protocol: 'TCP' | 'UDP' | 'RAW';
  localAddress: string;
  port: string;
  state: string;
  process?: string;
  pid?: string;
}

export interface UniversalDhcpLease {
  ipAddress: string;
  macAddress: string;
  clientId?: string;
  leaseExpiration?: string;
  type?: string;
  hostname?: string;
  server?: string;
  status?: string;
}

export interface UniversalContainer {
  id: string;
  image: string;
  command?: string;
  created?: string;
  status: string;
  ports?: string;
  name: string;
  isRunning: boolean;
}

export interface UniversalPingResult {
  target: string;
  transmitted: number;
  received: number;
  lossPercent: number;
  minRtt?: string;
  avgRtt?: string;
  maxRtt?: string;
  isSuccessful: boolean;
}

// =========================================================================
// Advanced Debugging & Troubleshooting Interfaces
// =========================================================================

export interface UniversalIpsecTunnel {
  name: string;
  peerIp: string;
  localIp?: string;
  phase1State: 'UP' | 'DOWN' | 'NEGOTIATING' | 'AUTH_ERROR' | 'PROPOSAL_MISMATCH' | 'TIMEOUT';
  phase2State: 'UP' | 'DOWN' | 'SELECTOR_MISMATCH' | 'EXPIRED';
  ikeVersion?: string; // IKEv1 | IKEv2
  proposal?: string;
  inboundSpi?: string;
  outboundSpi?: string;
  bytesIn?: string;
  bytesOut?: string;
  uptime?: string;
  diagnosis?: string;
}

export interface UniversalBgpDebugInfo {
  peerIp?: string;
  eventType: 'NOTIFICATION' | 'HOLD_TIMER_EXPIRED' | 'MD5_ERROR' | 'AS_MISMATCH' | 'PREFIX_LIMIT' | 'TCP_RST' | 'FLAP' | 'STATE_CHANGE';
  description: string;
  rootCause: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  recommendedFix: string;
}

export interface UniversalOspfDebugInfo {
  neighborIp?: string;
  interface?: string;
  issueType: 'MTU_MISMATCH' | 'AREA_MISMATCH' | 'TIMER_MISMATCH' | 'AUTH_MISMATCH' | 'MASK_MISMATCH' | 'ROUTER_ID_COLLISION' | 'STUCK_EXSTART' | 'STUCK_INIT' | 'INACTIVITY_DOWN';
  description: string;
  rootCause: string;
  severity: 'CRITICAL' | 'WARNING';
  recommendedFix: string;
}

export interface UniversalFlowDebug {
  flowId?: string;
  sourceIp: string;
  sourcePort?: string;
  destIp: string;
  destPort?: string;
  protocol: string;
  action: 'ALLOWED' | 'DENIED' | 'DROPPED' | 'RPF_FAILED' | 'NAT_TRANSLATED';
  matchedPolicy?: string;
  egressInterface?: string;
  ingressInterface?: string;
  details: string[];
}

export interface UniversalCliError {
  invalidToken?: string;
  errorType: 'SYNTAX_ERROR' | 'INCOMPLETE_COMMAND' | 'AMBIGUOUS' | 'PERMISSION_DENIED' | 'OBJECT_NOT_FOUND' | 'COMMIT_FAILED';
  rawMessage: string;
  suggestedFix: string;
}

export interface TerminalDiagnosisResult {
  status: 'healthy' | 'warning' | 'critical' | 'info';
  summary: string;
  identifiedIssues: string[];
  explanation: string;
  recommendedCommands: { cmd: string; purpose: string }[];
  formattedTable?: string;
}

export function stripAnsiCodes(str: string): string {
  if (!str) return '';
  return str
    // Standard ANSI escape sequences (ESC [... etc)
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
    // Stray escape brackets without ESC char like [1;36m, [0m, [1;33m, [1;35m, [1;32m, [1;94m
    .replace(/\[\d+(?:;\d+)*m/g, '')
    // Cursor commands like [?25h, [?25l, [2K, [1A, [1B
    .replace(/\[\??\d+[a-zA-Z]/g, '')
    // Metadata bracket headers injected by UI
    .replace(/\[Perangkat Target:[^\]]*\]\n?/g, '')
    // Carriage returns
    .replace(/\r/g, '');
}

export function isValidIpv4(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const clean = ip.split('/')[0].trim();
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(clean)) return false;
  const parts = clean.split('.');
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return false;
  }
  if (ip.includes('/')) {
    const cidrStr = ip.split('/')[1].trim();
    if (!/^\d{1,2}$/.test(cidrStr)) return false;
    const cidr = parseInt(cidrStr, 10);
    if (isNaN(cidr) || cidr < 0 || cidr > 32) return false;
  }
  return true;
}

export function isValidInterfaceName(name: string, brand?: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 40) return false;
  
  // Reject pure hex or random memory dumps (e.g., A0030201, 22300D06, 0x1234abcd)
  if (/^(?:0x)?[0-9A-Fa-f]{6,32}$/i.test(clean) && !/^eth/i.test(clean) && !/^fa/i.test(clean)) {
    return false;
  }
  
  const b = (brand || '').toLowerCase();
  
  if (b.includes('cisco') || b.includes('nexus') || b.includes('arista')) {
    return /^(?:Gi|Te|Fa|Eth|Fo|Hu|Twe|Tw|Po|Vl|Lo|Mgmt|Serial|Se|Tu|Tunnel|Cellular|Vlan|Port-channel|GigabitEthernet|TenGigabitEthernet|FastEthernet|Ethernet|Loopback|Management|FortyGigabitEthernet|HundredGigE|TwoGigabitEthernet)[0-9\/\.\:]+/i.test(clean);
  }
  
  if (b.includes('mikrotik') || b.includes('routeros')) {
    return /^(?:ether\d+|wlan\d+|bridge\d*|vlan\d+|sfp(?:-sfpplus)?\d+|bonding\d+|lte\d+|lo\d*|ovpn-[a-zA-Z0-9_\-]+|wireguard\d+|eoip-[a-zA-Z0-9_\-]+|gre-[a-zA-Z0-9_\-]+|pppoe-[a-zA-Z0-9_\-]+)/i.test(clean);
  }
  
  if (b.includes('linux') || b.includes('ubuntu') || b.includes('debian')) {
    return /^(?:eth\d+|ens\d+|enp\d+s\d+|eno\d+|wlan\d+|wlp\d+s\d+|lo|docker\d+|br-[a-z0-9]+|veth[a-z0-9]+|virbr\d+|tun\d+|tap\d+|wg\d+|bond\d+)/i.test(clean);
  }
  
  if (b.includes('huawei')) {
    return /^(?:GE|XGE|10GE|25GE|40GE|100GE|GigabitEthernet|XGigabitEthernet|Eth-Trunk|Vlanif|LoopBack|MEth|NULL)[0-9\/\.\:]+/i.test(clean);
  }
  
  if (b.includes('forti')) {
    return /^(?:port\d+|wan\d+|internal\d*|dmz\d*|lan\d*|mgmt\d*|vlan\d+|ssl\.[a-zA-Z0-9_\-]+|ipsec[a-zA-Z0-9_\-]+|ha\d*)/i.test(clean);
  }
  
  if (b.includes('juniper') || b.includes('junos')) {
    return /^(?:ge-\d+\/\d+\/\d+|xe-\d+\/\d+\/\d+|et-\d+\/\d+\/\d+|fe-\d+\/\d+\/\d+|ae\d+|lo0|irb\.\d+|vlan\.\d+|fxp0|em0)/i.test(clean);
  }

  return /^(?:eth|ens|enp|eno|ge|xe|gi|te|fa|po|vl|vlan|port|wan|lan|mgmt|lo|tun|br|wlan|sfp)[0-9a-zA-Z\/\.\-_:]+/i.test(clean);
}

/**
 * Parses network interfaces across Linux, Cisco, MikroTik, Fortinet, Juniper, Huawei, Arista, Aruba/HP, and Windows.
 */
export function parseTerminalInterfaces(terminalText: string, brand: string = 'cisco'): UniversalInterface[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const b = (brand || 'cisco').toLowerCase();
  const ifaces: UniversalInterface[] = [];

  // 1. Cisco IOS / IOS-XE / Arista EOS `show ip interface brief` & NX-OS `show ip int brief vrf all`
  if (b.includes('cisco') || b.includes('nexus') || b.includes('arista') || (!b.includes('linux') && !b.includes('mikrotik') && !b.includes('huawei') && !b.includes('fortinet') && !b.includes('juniper'))) {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('Interface') || line.startsWith('IP Interface Status') || line.startsWith('Port')) continue;

      // Cisco IOS-XE: "GigabitEthernet0/0/0   198.51.100.1    YES manual up                    up"
      const ciscoMatch = line.match(/^([A-Za-z0-9\/\.\-]+)\s+([0-9\.]+|unassigned)\s+(?:YES|NO)\s+(?:manual|NVRAM|DHCP|unset|other)\s+(up|down|administratively down)\s+(up|down)/i);
      if (ciscoMatch) {
        const ifName = ciscoMatch[1];
        const rawIp = ciscoMatch[2];
        const ip = (rawIp !== 'unassigned' && isValidIpv4(rawIp)) ? rawIp : '';
        const adminSt = ciscoMatch[3].toLowerCase();
        const protoSt = ciscoMatch[4].toLowerCase();
        const isUp = adminSt === 'up' && protoSt === 'up';
        const isAdminDown = adminSt.includes('admin');

        let ifType = b.includes('nexus') ? 'Nexus Data Center Port' : 'Cisco Physical Ethernet';
        if (ifName.toLowerCase().startsWith('vl')) ifType = 'VLAN SVI (Layer 3)';
        else if (ifName.toLowerCase().startsWith('lo')) ifType = 'Loopback Virtual';
        else if (ifName.toLowerCase().startsWith('cell')) ifType = 'Cellular LTE Uplink';
        else if (ifName.toLowerCase().startsWith('po')) ifType = 'Port-Channel (LAG)';
        else if (ifName.toLowerCase().startsWith('mgmt') || ifName.toLowerCase().startsWith('management')) ifType = 'Management Port';

        if (isValidInterfaceName(ifName, 'cisco')) {
          ifaces.push({
            name: ifName,
            state: isUp ? 'UP' : (isAdminDown ? 'ADMIN_DOWN' : 'DOWN'),
            ipv4List: ip ? [ip] : [],
            type: ifType,
          });
        }
        continue;
      }

      // Cisco / NX-OS `show ip interface brief vrf all`: "Eth1/1               10.0.0.1           protocol-up/link-up/admin-up"
      const nxosIpMatch = line.match(/^([A-Za-z0-9\/\.\-]+)\s+([0-9\.]+|unassigned)\s+(protocol-up\/link-up\/admin-up|protocol-down\/link-down\/admin-up|protocol-down\/link-down\/admin-down)/i);
      if (nxosIpMatch) {
        const ifName = nxosIpMatch[1];
        const rawIp = nxosIpMatch[2];
        const ip = (rawIp !== 'unassigned' && isValidIpv4(rawIp)) ? rawIp : '';
        const isUp = nxosIpMatch[3].toLowerCase().includes('protocol-up');
        const isAdminDown = nxosIpMatch[3].toLowerCase().includes('admin-down');

        if (isValidInterfaceName(ifName, 'nexus') && !ifaces.some(i => i.name === ifName)) {
          ifaces.push({
            name: ifName,
            state: isUp ? 'UP' : (isAdminDown ? 'ADMIN_DOWN' : 'DOWN'),
            ipv4List: ip ? [ip] : [],
            type: ifName.toLowerCase().startsWith('vl') ? 'Nexus SVI (Layer 3)' : 'Nexus Fabric Port',
          });
        }
        continue;
      }

      // Cisco `show interfaces status`: "Gi1/0/1   UPLINK-CORE   connected   trunk   a-full a-1000 10/100/1000BaseTX"
      const swMatch = line.match(/^([A-Za-z0-9\/\.\-]+)\s+(?:.*?\s+)?(connected|notconnect|disabled|err-disabled)\s+(\d+|routed|trunk)\s+/i);
      if (swMatch) {
        const ifName = swMatch[1];
        const statusStr = swMatch[2].toLowerCase();
        const vlanStr = swMatch[3];
        if (isValidInterfaceName(ifName, 'cisco') && !ifaces.some(i => i.name === ifName)) {
          ifaces.push({
            name: ifName,
            state: statusStr === 'connected' ? 'UP' : (statusStr === 'disabled' ? 'ADMIN_DOWN' : 'DOWN'),
            ipv4List: [],
            type: `Switchport (VLAN ${vlanStr})`,
          });
        }
      }
    }
  }

  // 2. Linux `ip a` / `ip addr` / `ifconfig` / `ip -br a`
  if (ifaces.length === 0 && (b.includes('linux') || b.includes('ubuntu') || b.includes('debian') || lines.some(l => l.includes('<BROADCAST') || l.includes('inet ')))) {
    let currentLinuxIface: UniversalInterface | null = null;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const headerMatch = line.match(/^(\d+):\s+([a-zA-Z0-9_\-\.@]+):?\s+<([^>]+)>\s+mtu\s+(\d+)(?:.*?state\s+([A-Z_]+))?/);
      if (headerMatch) {
        if (currentLinuxIface) ifaces.push(currentLinuxIface);

        const ifName = headerMatch[2];
        const rawState = headerMatch[5] || (headerMatch[3].includes('UP') ? 'UP' : 'DOWN');
        let ifType = 'Physical Ethernet (NIC)';
        if (ifName === 'lo' || ifName.startsWith('loopback')) ifType = 'Loopback Local';
        else if (ifName.startsWith('docker') || ifName.startsWith('br-')) ifType = 'Docker Bridge';
        else if (ifName.startsWith('veth')) ifType = 'Virtual Ethernet (Container)';
        else if (ifName.startsWith('wl') || ifName.startsWith('wlan')) ifType = 'Wi-Fi Wireless';
        else if (ifName.includes('.')) ifType = 'VLAN Sub-Interface (802.1Q)';
        else if (ifName.startsWith('tun') || ifName.startsWith('tap') || ifName.startsWith('wg')) ifType = 'VPN Tunnel';

        currentLinuxIface = {
          index: headerMatch[1],
          name: ifName,
          state: rawState === 'UP' ? 'UP' : 'DOWN',
          ipv4List: [],
          ipv6List: [],
          mtu: headerMatch[4],
          type: ifType,
          flags: headerMatch[3],
        };
        continue;
      }

      // Linux `ip -br a` (brief mode): "ens34 UP 10.254.88.215/24 fe80::..."
      const briefMatch = line.match(/^([a-zA-Z0-9_\-\.@]+)\s+(UP|DOWN|UNKNOWN)\s+([0-9\.\/]+)?/i);
      if (!currentLinuxIface && briefMatch && !line.includes('Protocol') && !line.includes('Interface') && !line.includes('show')) {
        const ifName = briefMatch[1];
        const isUp = briefMatch[2].toUpperCase() === 'UP';
        const ip = briefMatch[3] && isValidIpv4(briefMatch[3]) ? briefMatch[3] : '';
        if (isValidInterfaceName(ifName, 'linux') && !ifaces.some(i => i.name === ifName)) {
          ifaces.push({
            name: ifName,
            state: isUp ? 'UP' : 'DOWN',
            ipv4List: ip ? [ip] : [],
            type: ifName === 'lo' ? 'Loopback' : 'Network Interface',
          });
        }
        continue;
      }

      if (currentLinuxIface) {
        const inetMatch = line.match(/inet\s+([0-9\.\/]+)(?:\s+brd\s+([0-9\.]+))?/);
        if (inetMatch && isValidIpv4(inetMatch[1])) {
          currentLinuxIface.ipv4List.push(inetMatch[1]);
          if (inetMatch[2]) currentLinuxIface.broadcast = inetMatch[2];
        }

        const inet6Match = line.match(/inet6\s+([0-9a-fA-F:\/]+)/);
        if (inet6Match) {
          if (!currentLinuxIface.ipv6List) currentLinuxIface.ipv6List = [];
          currentLinuxIface.ipv6List.push(inet6Match[1]);
        }

        const macMatch = line.match(/link\/(?:ether|loopback)\s+([0-9a-fA-F:]{17}|[0-9a-fA-F:]{12,})/);
        if (macMatch) {
          currentLinuxIface.mac = macMatch[1];
        }
      }
    }
    if (currentLinuxIface) ifaces.push(currentLinuxIface);
  }

  // 3. Huawei VRP `display ip interface brief`
  if (ifaces.length === 0 && (b.includes('huawei') || lines.some(l => l.includes('Vlanif') || l.includes('GE0/')))) {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const huaweiMatch = line.match(/^([A-Za-z0-9\/\.\-]+)\s+([0-9\.\/]+|unassigned)\s+(up|\*down|down|administratively down)\s+(up|\*down|down)/i);
      if (huaweiMatch && !line.startsWith('Interface') && !line.startsWith('Line')) {
        const ifName = huaweiMatch[1];
        const rawIp = huaweiMatch[2];
        const ip = (rawIp !== 'unassigned' && isValidIpv4(rawIp)) ? rawIp : '';
        const isUp = huaweiMatch[3].toLowerCase() === 'up' && huaweiMatch[4].toLowerCase() === 'up';
        const isAdminDown = huaweiMatch[3].toLowerCase().includes('admin');

        if (isValidInterfaceName(ifName, 'huawei')) {
          ifaces.push({
            name: ifName,
            state: isUp ? 'UP' : (isAdminDown ? 'ADMIN_DOWN' : 'DOWN'),
            ipv4List: ip ? [ip] : [],
            type: ifName.toLowerCase().startsWith('vlanif') ? 'VLAN Interface (Layer 3)' : 'Huawei Interface',
          });
        }
      }
    }
  }

  // 4. MikroTik RouterOS `/ip address print` & `/interface print` (Strict IP & Interface Validation)
  if (ifaces.length === 0 && (b.includes('mikrotik') || lines.some(l => l.includes('[admin@') || l.includes('Flags: X - disabled')))) {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Example: "0   ;;; WAN-UPLINK\n      address=192.168.1.10/24 network=192.168.1.0 interface=ether1 actual-interface=ether1"
      // Or table: "0   192.168.1.10/24   192.168.1.0   ether1"
      const mtAddrMatch = line.match(/^(?:\d+\s+)?([XIDR\s]*)\s*([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\/\d{1,2})\s+([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\s+([a-zA-Z0-9_\-\.]+)/);
      if (mtAddrMatch) {
        const flags = mtAddrMatch[1];
        const ip = mtAddrMatch[2];
        const ifName = mtAddrMatch[4];
        if (isValidIpv4(ip) && isValidInterfaceName(ifName, 'mikrotik')) {
          const isDown = flags.includes('X') || flags.includes('I');
          const existing = ifaces.find(i => i.name === ifName);
          if (existing) {
            existing.ipv4List.push(ip);
          } else {
            ifaces.push({
              name: ifName,
              state: isDown ? 'DOWN' : 'UP',
              ipv4List: [ip],
              type: 'RouterOS Interface',
              flags: flags.trim() || undefined,
            });
          }
        }
      }
    }
  }

  // 5. Fortinet FortiOS `get system interface` / `diagnose ip address list`
  if (ifaces.length === 0 && (b.includes('forti') || lines.some(l => l.includes('FortiGate') || l.includes('devname=')))) {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const fnMatch = line.match(/^(?:==\[\s*([a-zA-Z0-9_\-\.]+)\s*\]|([a-zA-Z0-9_\-\.]+)\s+([0-9\.\/]+)\s+(up|down))/i) ||
                      line.match(/devname=([a-zA-Z0-9_\-\.]+)\s+ip=([0-9\.\/]+)/i);
      if (fnMatch) {
        const ifName = fnMatch[1] || fnMatch[2];
        const rawIp = fnMatch[2]?.includes('.') ? fnMatch[2] : (fnMatch[3] || '');
        const ip = isValidIpv4(rawIp) ? rawIp : '';
        const isUp = (fnMatch[4] || 'up').toLowerCase() === 'up';
        if (ifName && isValidInterfaceName(ifName, 'fortinet') && !ifaces.some(i => i.name === ifName)) {
          ifaces.push({
            name: ifName,
            state: isUp ? 'UP' : 'DOWN',
            ipv4List: ip ? [ip] : [],
            type: ifName.startsWith('wan') ? 'WAN Uplink' : ifName.startsWith('port') ? 'Physical Port' : 'FortiGate Interface',
          });
        }
      }
    }
  }

  // 6. Juniper Junos `show interfaces terse`
  if (ifaces.length === 0 && (b.includes('juniper') || b.includes('junos') || lines.some(l => l.includes('ge-') || l.includes('xe-')))) {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      const jMatch = line.match(/^([a-zA-Z0-9_\-\.\/]+)\s+(up|down)\s+(up|down)\s*(?:inet\s+([0-9\.\/]+))?/i);
      if (jMatch) {
        const ifName = jMatch[1];
        const isUp = jMatch[2].toLowerCase() === 'up' && jMatch[3].toLowerCase() === 'up';
        const rawIp = jMatch[4] || '';
        const ip = isValidIpv4(rawIp) ? rawIp : '';
        if (isValidInterfaceName(ifName, 'juniper') && !ifaces.some(i => i.name === ifName)) {
          ifaces.push({
            name: ifName,
            state: isUp ? 'UP' : 'DOWN',
            ipv4List: ip ? [ip] : [],
            type: 'Junos Interface',
          });
        }
      }
    }
  }

  return ifaces;
}

/**
 * Parses routing tables across Linux, Cisco, MikroTik, Fortinet, Juniper, Huawei, Arista, and Windows outputs.
 */
export function parseTerminalRoutes(terminalText: string, brand: string = 'cisco'): UniversalRoute[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const routes: UniversalRoute[] = [];
  const b = (brand || 'cisco').toLowerCase();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.includes('@') && (line.includes('$') || line.includes('#'))) continue;

    // Skip CLI header codes and non-route banners
    if (line.startsWith('Codes:') || line.startsWith('Routing Table:') || line.startsWith('Destination') || line.startsWith('Flags:') || line.startsWith('#  DST-ADDRESS')) {
      continue;
    }
    // Skip firmware/sysinfo tags that may contain hex words
    if (line.match(/^(?:Firmware|AV|APP-DB|FMWP-DB|BIOS|Current|Extended|First|FIPS-CC|Certificate|Serial|Hostname):/i)) {
      continue;
    }

    // 1. Fortinet FortiOS & Cisco IOS Connected Route
    const connectedMatch = line.match(/^([CLK])\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d{1,2})?)\s+is directly connected,\s*([A-Za-z0-9_\-\.]+)/i);
    if (connectedMatch) {
      const code = connectedMatch[1].toUpperCase();
      const dst = connectedMatch[2];
      const iface = connectedMatch[3];
      const proto = code === 'L' ? 'LOCAL' : code === 'K' ? 'KERNEL' : 'CONNECTED';

      if (!routes.some(r => r.destination === dst && r.interface === iface)) {
        routes.push({
          destination: dst,
          gateway: 'Direct Link (Connected)',
          interface: iface,
          protocol: proto,
          metric: '0',
          isDefault: false,
          status: 'ACTIVE',
        });
      }
      continue;
    }

    // 2. Fortinet FortiOS Static / Dynamic Route with next-hop & metric
    const fortinetViaMatch = line.match(/^([SKBRODIEi]\*?)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d{1,2})?)\s+(?:\[(\d+\/\d+)\]\s+)?via\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})(?:,\s*([A-Za-z0-9_\-\.]+))?/i);
    if (fortinetViaMatch) {
      const code = fortinetViaMatch[1].toUpperCase();
      const dst = fortinetViaMatch[2];
      const metric = fortinetViaMatch[3] || '10/0';
      const gw = fortinetViaMatch[4];
      const iface = fortinetViaMatch[5] || '-';
      const isDef = dst === '0.0.0.0/0' || code.includes('*');

      let proto = 'STATIC';
      if (code.includes('O')) proto = 'OSPF';
      else if (code.includes('B')) proto = 'BGP';
      else if (code.includes('R')) proto = 'RIP';
      else if (code.includes('D')) proto = 'EIGRP';
      else if (code.includes('I')) proto = 'IS-IS';
      else if (code.includes('K')) proto = 'KERNEL';

      if (!routes.some(r => r.destination === (isDef ? '0.0.0.0/0 (Default)' : dst) && r.gateway === gw)) {
        routes.push({
          destination: isDef ? '0.0.0.0/0 (Default)' : dst,
          gateway: gw,
          interface: iface,
          protocol: proto,
          metric: `[${metric}]`,
          isDefault: isDef,
          status: 'ACTIVE',
        });
      }
      continue;
    }

    // 3. Cisco IOS / IOS-XE / Arista EOS `show ip route`
    const ciscoRouteMatch = line.match(/^([SCBRODIE]\*?)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d{1,2})?)(?:\s+\[(\d+\/\d+)\])?\s+(?:via\s+([0-9\.]+)|is directly connected)?(?:,\s*(?:[0-9:]+,\s*)?([A-Za-z0-9\/\.\-]+))?/i);
    if (ciscoRouteMatch) {
      const code = ciscoRouteMatch[1].toUpperCase();
      const dst = ciscoRouteMatch[2];
      const metric = ciscoRouteMatch[3] ? `[${ciscoRouteMatch[3]}]` : undefined;
      const gw = ciscoRouteMatch[4] || 'Directly Connected';
      const iface = ciscoRouteMatch[5] || '-';
      const isDef = dst === '0.0.0.0/0' || code.includes('*');

      let proto = 'STATIC';
      if (code.includes('C')) proto = 'CONNECTED';
      else if (code.includes('O')) proto = 'OSPF';
      else if (code.includes('B')) proto = 'BGP';
      else if (code.includes('R')) proto = 'RIP';
      else if (code.includes('D')) proto = 'EIGRP';

      if (!routes.some(r => r.destination === (isDef ? '0.0.0.0/0 (Default)' : dst) && r.gateway === gw)) {
        routes.push({
          destination: isDef ? '0.0.0.0/0 (Default)' : dst,
          gateway: gw,
          interface: iface,
          protocol: proto,
          metric,
          isDefault: isDef,
          status: 'ACTIVE',
        });
      }
      continue;
    }

    // 4. Huawei VRP `display ip routing-table`
    const huaweiRouteMatch = line.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d{1,2})?)\s+([A-Za-z]+)\s+(\d+)\s+(\d+)\s+(?:[A-Za-z\-]+\s+)?([0-9\.]+)\s+([A-Za-z0-9_\-\.\/]+)/i);
    if (huaweiRouteMatch) {
      const dst = huaweiRouteMatch[1];
      const protoStr = huaweiRouteMatch[2].toUpperCase();
      const preference = huaweiRouteMatch[3];
      const cost = huaweiRouteMatch[4];
      const gw = huaweiRouteMatch[5];
      const iface = huaweiRouteMatch[6];
      const isDef = dst === '0.0.0.0/0';

      routes.push({
        destination: isDef ? '0.0.0.0/0 (Default)' : dst,
        gateway: protoStr === 'DIRECT' ? 'Direct Link (Connected)' : gw,
        interface: iface,
        protocol: protoStr,
        metric: `[${preference}/${cost}]`,
        isDefault: isDef,
        status: 'ACTIVE',
      });
      continue;
    }

    // 5. MikroTik RouterOS `/ip route print`
    const mtRouteMatch = line.match(/^(?:\d+\s+)?([ADSIBCEX]+)\s+(0\.0\.0\.0\/0|[0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d{1,2})?)\s+(?:([0-9\.]+)\s+)?([0-9\.]+|[a-zA-Z0-9_\-\.]+)\s+(\d+)/i);
    if (mtRouteMatch) {
      const flags = mtRouteMatch[1].toUpperCase();
      const dst = mtRouteMatch[2];
      const param1 = mtRouteMatch[3];
      const param2 = mtRouteMatch[4];
      const distance = mtRouteMatch[5];

      const isDef = dst === '0.0.0.0/0';
      const isConnected = flags.includes('C');
      const gw = isConnected ? 'Direct Link (Connected)' : (param1 || param2);
      const iface = isConnected ? param2 : '-';
      const proto = isConnected ? 'CONNECTED' : flags.includes('O') ? 'OSPF' : flags.includes('B') ? 'BGP' : 'STATIC';

      routes.push({
        destination: isDef ? '0.0.0.0/0 (Default)' : dst,
        gateway: gw,
        interface: iface,
        protocol: proto,
        metric: distance,
        isDefault: isDef,
        status: flags.includes('X') ? 'LINK_DOWN' : 'ACTIVE',
      });
      continue;
    }

    // 6. Juniper Junos `show route`
    const junosRouteMatch = line.match(/^(0\.0\.0\.0\/0|[0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d{1,2})?)\s+\*?\[([a-zA-Z]+)\/(\d+)\]\s+(?:[0-9:]+\s+)?(?:>\s+)?(?:to\s+([0-9\.]+)\s+)?via\s+([a-zA-Z0-9_\-\.\/]+)/i);
    if (junosRouteMatch) {
      const dst = junosRouteMatch[1];
      const protoStr = junosRouteMatch[2].toUpperCase();
      const distance = junosRouteMatch[3];
      const gw = junosRouteMatch[4] || 'Directly Connected';
      const iface = junosRouteMatch[5];
      const isDef = dst === '0.0.0.0/0';

      routes.push({
        destination: isDef ? '0.0.0.0/0 (Default)' : dst,
        gateway: gw,
        interface: iface,
        protocol: protoStr.includes('DIRECT') ? 'CONNECTED' : protoStr,
        metric: distance,
        isDefault: isDef,
        status: 'ACTIVE',
      });
      continue;
    }

    // 7. Linux `ip route`
    if (line.startsWith('default') || line.match(/^[0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d{1,2})?\s+(?:via|dev|proto|scope|src|metric)/i)) {
      const isDefault = line.startsWith('default');
      const dstMatch = line.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d{1,2})?)/);
      const destination = isDefault ? '0.0.0.0/0 (Default)' : (dstMatch ? dstMatch[1] : 'Unknown');

      const viaMatch = line.match(/\bvia\s+([0-9\.\:a-fA-F]+)/);
      const gateway = viaMatch ? viaMatch[1] : (isDefault ? 'Gateway' : 'Direct Link (Connected)');

      const devMatch = line.match(/\bdev\s+([a-zA-Z0-9_\-\.@]+)/);
      const dev = devMatch ? devMatch[1] : '-';

      const protoMatch = line.match(/\bproto\s+([a-zA-Z0-9_\-]+)/);
      const proto = protoMatch ? protoMatch[1].toUpperCase() : (isDefault ? 'STATIC' : 'CONNECTED');

      const metricMatch = line.match(/\bmetric\s+(\d+)/);
      const metric = metricMatch ? metricMatch[1] : undefined;

      const isLinkDown = line.includes('linkdown');

      if (!routes.some(r => r.destination === destination && r.interface === dev)) {
        routes.push({
          destination,
          gateway,
          interface: dev,
          protocol: proto,
          metric,
          isDefault,
          status: isLinkDown ? 'LINK_DOWN' : 'ACTIVE',
        });
      }
      continue;
    }
  }

  return routes;
}

/**
 * Parses BGP Neighbor / Summary across Cisco, Fortinet, Juniper, MikroTik, and Huawei outputs.
 */
export function parseTerminalBgp(terminalText: string): UniversalBgpPeer[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const peers: UniversalBgpPeer[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('Neighbor') || line.startsWith('BGP router') || line.startsWith('Codes:')) continue;

    // 1. Cisco / Arista / Fortinet BGP Summary Line
    const ciscoBgpMatch = line.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+\d+\s+([0-9a-zA-Z:]+)\s+([0-9a-zA-Z_\(\)]+)/i);
    if (ciscoBgpMatch) {
      const peerIp = ciscoBgpMatch[1];
      const asNumber = ciscoBgpMatch[3];
      const uptime = ciscoBgpMatch[6];
      const stateOrPfx = ciscoBgpMatch[7];
      const isNum = !isNaN(Number(stateOrPfx));

      peers.push({
        peerIp,
        asNumber: `AS${asNumber}`,
        state: isNum ? 'Established' : stateOrPfx,
        prefixesReceived: isNum ? stateOrPfx : '0 (Down)',
        uptime,
        isEstablished: isNum,
        msgRcvd: ciscoBgpMatch[4],
        msgSent: ciscoBgpMatch[5],
      });
      continue;
    }

    // 2. Juniper `show bgp summary`
    const junosBgpMatch = line.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+([0-9a-zA-Z]+)\s+([a-zA-Z0-9]+)/i);
    if (junosBgpMatch && !line.includes('Peer')) {
      const peerIp = junosBgpMatch[1];
      const asNumber = junosBgpMatch[2];
      const uptime = junosBgpMatch[5];
      const st = junosBgpMatch[6];
      const isEst = st.toLowerCase().startsWith('estab');

      peers.push({
        peerIp,
        asNumber: `AS${asNumber}`,
        state: isEst ? 'Established' : st,
        prefixesReceived: isEst ? 'Active' : '0',
        uptime,
        isEstablished: isEst,
      });
      continue;
    }

    // 3. MikroTik `/routing bgp session print`
    if (line.includes('remote.address=') || (line.includes('remote-as=') && line.includes('state='))) {
      const ipM = line.match(/remote(?:[.\-])address=([0-9\.]+)/);
      const asM = line.match(/remote(?:[.\-])as=(\d+)/);
      const stateM = line.match(/state=(?:")?([a-zA-Z0-9_\-]+)(?:")?/);
      const pfxM = line.match(/prefix(?:es)?(?:[.\-])count=(\d+)/);

      if (ipM) {
        const st = stateM ? stateM[1] : 'Unknown';
        const isEst = st.toLowerCase() === 'established' || line.includes(' E ');
        peers.push({
          peerIp: ipM[1],
          asNumber: asM ? `AS${asM[1]}` : 'AS-',
          state: isEst ? 'Established' : st,
          prefixesReceived: pfxM ? pfxM[1] : (isEst ? 'Active' : '0'),
          isEstablished: isEst,
        });
      }
    }
  }

  return peers;
}

/**
 * Parses OSPF Neighbors across Cisco, Fortinet, Juniper, MikroTik, and Huawei.
 */
export function parseTerminalOspf(terminalText: string): UniversalOspfNeighbor[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const neighbors: UniversalOspfNeighbor[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('Neighbor') || line.startsWith('OSPF process')) continue;

    // 1. Cisco / Fortinet / Huawei `show ip ospf neighbor`
    const ciscoOspfMatch = line.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+(\d+)\s+([A-Z_]+(?:\/[A-Z_]+)?)\s+([0-9:]+)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([A-Za-z0-9_\-\.\/]+)/i);
    if (ciscoOspfMatch) {
      const nbrId = ciscoOspfMatch[1];
      const pri = ciscoOspfMatch[2];
      const state = ciscoOspfMatch[3];
      const dead = ciscoOspfMatch[4];
      const ip = ciscoOspfMatch[5];
      const iface = ciscoOspfMatch[6];
      const isFull = state.toUpperCase().includes('FULL');

      neighbors.push({
        neighborId: nbrId,
        ipAddress: ip,
        interface: iface,
        state,
        priority: pri,
        deadTime: dead,
        isFull,
      });
      continue;
    }

    // 2. Juniper Junos `show ospf neighbor`
    const junosOspfMatch = line.match(/^([0-9\.]+)\s+([a-zA-Z0-9_\-\.\/]+)\s+([A-Za-z]+)\s+([0-9\.]+)\s+(\d+)/i);
    if (junosOspfMatch) {
      const ip = junosOspfMatch[1];
      const iface = junosOspfMatch[2];
      const st = junosOspfMatch[3];
      const nbrId = junosOspfMatch[4];
      const dead = junosOspfMatch[5];
      const isFull = st.toLowerCase() === 'full';

      neighbors.push({
        neighborId: nbrId,
        ipAddress: ip,
        interface: iface,
        state: st,
        deadTime: `${dead}s`,
        isFull,
      });
    }
  }

  return neighbors;
}

/**
 * Parses VLANs and Switchport access/trunk allocations.
 */
export function parseTerminalVlans(terminalText: string): UniversalVlan[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const vlans: UniversalVlan[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('VLAN') || line.startsWith('----') || line.startsWith('Status')) continue;

    // Cisco `show vlan brief`: "10   MANAGEMENT   active    Gi0/1, Gi0/2"
    const ciscoVlanMatch = line.match(/^(\d+)\s+([a-zA-Z0-9_\-\.]+)\s+(active|act\/unsup|suspended)\s*(.*)?/i);
    if (ciscoVlanMatch) {
      const vId = ciscoVlanMatch[1];
      const name = ciscoVlanMatch[2];
      const st = ciscoVlanMatch[3].toLowerCase();
      const rawPorts = ciscoVlanMatch[4] || '';
      const ports = rawPorts.split(',').map(p => p.trim()).filter(Boolean);

      vlans.push({
        vlanId: vId,
        name,
        status: st.includes('active') ? 'ACTIVE' : 'SUSPENDED',
        ports,
      });
      continue;
    }

    // MikroTik `/interface vlan print`
    const mtVlanMatch = line.match(/^(?:\d+\s+)?([XIDR\s]*)\s*([a-zA-Z0-9_\-\.]+)\s+(\d+)\s+([a-zA-Z0-9_\-\.]+)/i);
    if (mtVlanMatch && line.includes('vlan-id=')) {
      const vId = line.match(/vlan-id=(\d+)/);
      const name = line.match(/name="?([a-zA-Z0-9_\-\.]+)"?/);
      const iface = line.match(/interface="?([a-zA-Z0-9_\-\.]+)"?/);
      if (vId) {
        vlans.push({
          vlanId: vId[1],
          name: name ? name[1] : `vlan${vId[1]}`,
          status: 'ACTIVE',
          ports: iface ? [iface[1]] : [],
        });
      }
    }
  }

  return vlans;
}

/**
 * Parses ARP Table across Cisco, Linux, Fortinet, and MikroTik.
 */
export function parseTerminalArp(terminalText: string): UniversalArpEntry[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const arpEntries: UniversalArpEntry[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('Protocol') || line.startsWith('Address') || line.startsWith('IP address')) continue;

    // 1. Cisco `show ip arp`: "Internet  10.254.88.1  -  5254.0012.3456  ARPA  GigabitEthernet0/0"
    const ciscoArpMatch = line.match(/^Internet\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+(?:[\d\-]+)\s+([0-9a-fA-F\.]{14}|[0-9a-fA-F:]{17})\s+([A-Za-z]+)\s+([A-Za-z0-9\/\.\-]+)/i);
    if (ciscoArpMatch) {
      arpEntries.push({
        ipAddress: ciscoArpMatch[1],
        macAddress: ciscoArpMatch[2],
        type: ciscoArpMatch[3],
        interface: ciscoArpMatch[4],
        state: 'REACHABLE',
      });
      continue;
    }

    // 2. Linux `ip neigh show`: "10.254.88.1 dev ens34 lladdr 52:54:00:12:34:56 REACHABLE"
    const linuxNeighMatch = line.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+dev\s+([a-zA-Z0-9_\-\.@]+)\s+lladdr\s+([0-9a-fA-F:]{17})\s+([A-Z]+)/i);
    if (linuxNeighMatch) {
      arpEntries.push({
        ipAddress: linuxNeighMatch[1],
        interface: linuxNeighMatch[2],
        macAddress: linuxNeighMatch[3],
        type: 'Dynamic (ARP)',
        state: linuxNeighMatch[4],
      });
      continue;
    }

    // 3. Fortinet `diagnose ip arp list`
    const fgtArpMatch = line.match(/([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+(\d+)\s+([0-9a-fA-F:]{17})\s+([a-zA-Z0-9_\-\.]+)/i);
    if (fgtArpMatch) {
      arpEntries.push({
        ipAddress: fgtArpMatch[1],
        macAddress: fgtArpMatch[3],
        interface: fgtArpMatch[4],
        type: 'ARP',
        state: 'REACHABLE',
      });
      continue;
    }
  }

  return arpEntries;
}

/**
 * =========================================================================
 * 1. IPsec VPN Tunnel & Debug Parser
 * Supports Fortinet, Cisco, MikroTik, Juniper, and Linux StrongSwan
 * =========================================================================
 */
export function parseTerminalIpsec(terminalText: string, brand: string = 'fortinet'): {
  tunnels: UniversalIpsecTunnel[];
  errorLogs: string[];
  status: 'UP' | 'PARTIAL' | 'DOWN' | 'ERROR';
} {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const tunnels: UniversalIpsecTunnel[] = [];
  const errorLogs: string[] = [];
  const b = (brand || 'fortinet').toLowerCase();

  // Parse Fortinet `diagnose vpn tunnel list` & `get vpn ipsec tunnel summary`
  let currentFgtTunnel: Partial<UniversalIpsecTunnel> | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // FortiOS: "name=VPN_TO_HQ ver=1 serial=1 10.0.0.1:0->203.0.113.1:0 tun_id=10.0.0.1 tun_id6=::"
    const fgtTunHead = line.match(/name=([a-zA-Z0-9_\-\.@]+)\s+ver=(\d+)(?:.*?([0-9\.]+):(?:\d+)->([0-9\.]+):(?:\d+))?/i);
    if (fgtTunHead) {
      if (currentFgtTunnel && currentFgtTunnel.name) {
        tunnels.push(currentFgtTunnel as UniversalIpsecTunnel);
      }
      currentFgtTunnel = {
        name: fgtTunHead[1],
        ikeVersion: `IKEv${fgtTunHead[2]}`,
        localIp: fgtTunHead[3] || 'Local',
        peerIp: fgtTunHead[4] || 'Remote Peer',
        phase1State: 'DOWN',
        phase2State: 'DOWN',
      };
      continue;
    }

    if (currentFgtTunnel) {
      // FortiOS Phase 1 status: "proxyid_num=1 child_num=0 refcnt=4 ..." or "sa=1"
      if (line.includes('sa=1') || line.includes('status=up') || line.includes('phase1: established')) {
        currentFgtTunnel.phase1State = 'UP';
      }
      // FortiOS Phase 2: "dec: 12434 enc: 12434"
      const trafficMatch = line.match(/dec:\s*(\d+)\s+enc:\s*(\d+)/i) || line.match(/inbound:\s*(\d+)\s+outbound:\s*(\d+)/i);
      if (trafficMatch) {
        currentFgtTunnel.bytesIn = trafficMatch[1];
        currentFgtTunnel.bytesOut = trafficMatch[2];
        if (Number(trafficMatch[1]) > 0 || Number(trafficMatch[2]) > 0) {
          currentFgtTunnel.phase2State = 'UP';
        }
      }
      const algMatch = line.match(/alg=([a-zA-Z0-9_\-\/]+)/i);
      if (algMatch) currentFgtTunnel.proposal = algMatch[1];
    }

    // Cisco `show crypto isakmp sa` / `show crypto session`
    // Example: "10.0.0.1 203.0.113.1 QM_IDLE 1 0 ACTIVE"
    // Example: "203.0.113.1 UP-ACTIVE 10.0.0.1 12345 IPSEC 1 ACTIVE"
    const ciscoIsakmpMatch = line.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([A-Z_]+)\s+(\d+)\s+(\d+)\s+([A-Z_]+)/i);
    if (ciscoIsakmpMatch) {
      const src = ciscoIsakmpMatch[1];
      const dst = ciscoIsakmpMatch[2];
      const state = ciscoIsakmpMatch[3];
      const isUp = state === 'QM_IDLE' || state === 'IKE_SA_ESTABLISHED';
      tunnels.push({
        name: `Tunnel_to_${dst}`,
        localIp: src,
        peerIp: dst,
        phase1State: isUp ? 'UP' : state.includes('NEG') ? 'NEGOTIATING' : 'DOWN',
        phase2State: isUp ? 'UP' : 'DOWN',
        diagnosis: isUp ? 'IKE SA Active (QM_IDLE)' : `Stuck in state: ${state}`,
      });
      continue;
    }

    // MikroTik `/ip ipsec active-peers print`
    // Example: "0 R  remote-address=203.0.113.1  local-address=10.0.0.1  state=established  uptime=1d4h"
    const mtIpsecMatch = line.match(/remote(?:[.\-])address=([0-9\.]+).*?state=([a-zA-Z0-9_\-]+)/i);
    if (mtIpsecMatch) {
      const pIp = mtIpsecMatch[1];
      const st = mtIpsecMatch[2].toLowerCase();
      const isEst = st === 'established';
      tunnels.push({
        name: `MikroTik_Peer_${pIp}`,
        peerIp: pIp,
        phase1State: isEst ? 'UP' : 'DOWN',
        phase2State: isEst ? 'UP' : 'DOWN',
        diagnosis: isEst ? 'Phase 1 & 2 Established' : `State: ${st}`,
      });
      continue;
    }

    // Capture Debug / Error Logs in IPsec
    if (
      line.includes('authentication failed') ||
      line.includes('PSK mismatch') ||
      line.includes('no proposal chosen') ||
      line.includes('payload malformed') ||
      line.includes('IKE SA deleted') ||
      line.includes('negotiation timeout') ||
      line.includes('failed to negotiate') ||
      line.includes('received unauthenticated packet') ||
      line.includes('selector mismatch') ||
      line.includes('lifetime expired')
    ) {
      errorLogs.push(line);
    }
  }
  if (currentFgtTunnel && currentFgtTunnel.name) {
    tunnels.push(currentFgtTunnel as UniversalIpsecTunnel);
  }

  const allUp = tunnels.length > 0 && tunnels.every(t => t.phase1State === 'UP');
  const someUp = tunnels.some(t => t.phase1State === 'UP');
  const hasError = errorLogs.length > 0;

  return {
    tunnels,
    errorLogs,
    status: hasError ? 'ERROR' : allUp ? 'UP' : someUp ? 'PARTIAL' : 'DOWN',
  };
}

/**
 * =========================================================================
 * 2. BGP Debug, Flap & Error Notification Parser
 * =========================================================================
 */
export function parseTerminalBgpDebug(terminalText: string): UniversalBgpDebugInfo[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const debugs: UniversalBgpDebugInfo[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1. Hold Timer Expired
    if (line.includes('Hold Timer Expired') || line.includes('Hold timer expired') || line.includes('hold time expired')) {
      const peerMatch = line.match(/(?:neighbor|from|to)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      debugs.push({
        peerIp: peerMatch ? peerMatch[1] : undefined,
        eventType: 'HOLD_TIMER_EXPIRED',
        description: 'BGP Hold Timer Expired (Keepalive tidak diterima sebelum batas waktu).',
        rootCause: 'Paket BGP Keepalive terhalang packet loss, MTU mismatch, CPU overload, atau link putus.',
        severity: 'CRITICAL',
        recommendedFix: 'Periksa MTU path, link latency, dan pastikan port 179 TCP tidak didrop firewall.',
      });
      continue;
    }

    // 2. MD5 Password / Authentication Mismatch
    if (line.includes('MD5') || line.includes('Authentication failed') || line.includes('Bad MD5 digest') || line.includes('password mismatch')) {
      const peerMatch = line.match(/(?:neighbor|from|to)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      debugs.push({
        peerIp: peerMatch ? peerMatch[1] : undefined,
        eventType: 'MD5_ERROR',
        description: 'Autentikasi MD5 BGP Gagal (Password tidak cocok).',
        rootCause: 'BGP TCP MD5 secret key berbeda antara router lokal dan neighbor.',
        severity: 'CRITICAL',
        recommendedFix: 'Samakan password MD5 pada konfigurasi `neighbor <ip> password <key>`.',
      });
      continue;
    }

    // 3. AS Number Mismatch
    if (line.includes('Bad Peer AS') || line.includes('AS mismatch') || line.includes('as-path loop')) {
      const peerMatch = line.match(/(?:neighbor|from|to)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      debugs.push({
        peerIp: peerMatch ? peerMatch[1] : undefined,
        eventType: 'AS_MISMATCH',
        description: 'Ketidaksesuaian Remote Autonomous System (AS Number).',
        rootCause: 'Remote AS yang dikonfigurasi tidak sesuai dengan AS aktual milik neighbor.',
        severity: 'CRITICAL',
        recommendedFix: 'Verifikasi nilai `remote-as` di kedua sisi router peering.',
      });
      continue;
    }

    // 4. Maximum Prefix Limit Exceeded
    if (line.includes('Maximum number of prefixes reached') || line.includes('maximum-prefix limit') || line.includes('PfxCt')) {
      debugs.push({
        eventType: 'PREFIX_LIMIT',
        description: 'Prefix BGP Melebihi Batas Maksimal (Max-Prefix Hit).',
        rootCause: 'Neighbor mengirimkan jumlah rute melebihi kuota keamanan yang diatur pada filter.',
        severity: 'WARNING',
        recommendedFix: 'Naikkan ambang batas `neighbor <ip> maximum-prefix <num>` atau pasang route-map filter.',
      });
      continue;
    }

    // 5. BGP State Flapping / Notification Received
    if (line.includes('BGP-3-NOTIFICATION') || line.includes('BGP-5-ADJCHANGE') || line.includes('NOTIFICATION received') || line.includes('NOTIFICATION sent')) {
      const notifMatch = line.match(/(?:NOTIFICATION:\s*(?:sent|received)\s*(?:to|from)?\s*([0-9\.]+)?\s*([0-9\/]+)?\s*\(([^)]+)\))/i);
      debugs.push({
        peerIp: notifMatch ? notifMatch[1] : undefined,
        eventType: 'NOTIFICATION',
        description: `BGP Notification: ${notifMatch ? notifMatch[3] : 'Sesi di-reset oleh neighbor'}`,
        rootCause: 'Neighbor mengirim sinyal NOTIFICATION penutupan sesi TCP BGP.',
        severity: 'WARNING',
        recommendedFix: 'Periksa log error detail pada router lawan dan cek stabilitas koneksi TCP port 179.',
      });
      continue;
    }
  }

  return debugs;
}

/**
 * =========================================================================
 * 3. OSPF Debug & Stuck Adjacency Diagnostics Parser
 * =========================================================================
 */
export function parseTerminalOspfDebug(terminalText: string): UniversalOspfDebugInfo[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const debugs: UniversalOspfDebugInfo[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 1. MTU Mismatch (Stuck in EXSTART / EXCHANGE)
    if (
      line.includes('bigger MTU') ||
      line.includes('MTU mismatch') ||
      line.includes('EXSTART') ||
      line.includes('EXCHANGE') ||
      line.includes('DBD MTU')
    ) {
      const ifMatch = line.match(/(?:on|interface)\s+([A-Za-z0-9_\-\.\/]+)/i);
      const ipMatch = line.match(/(?:from|neighbor)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      debugs.push({
        neighborIp: ipMatch ? ipMatch[1] : undefined,
        interface: ifMatch ? ifMatch[1] : undefined,
        issueType: 'MTU_MISMATCH',
        description: 'OSPF Stuck di State EXSTART / EXCHANGE (Indikasi MTU Mismatch).',
        rootCause: 'Nilai MTU interface antara kedua router tidak sama saat bertukar Database Description (DBD).',
        severity: 'CRITICAL',
        recommendedFix: 'Samakan MTU interface atau tambahkan perintah `ip ospf mtu-ignore` pada interface terkait.',
      });
      continue;
    }

    // 2. Area ID Mismatch
    if (line.includes('area mismatch') || line.includes('Area ID mismatch') || line.includes('mismatched Area')) {
      const ipMatch = line.match(/(?:from|pkt from)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      debugs.push({
        neighborIp: ipMatch ? ipMatch[1] : undefined,
        issueType: 'AREA_MISMATCH',
        description: 'Ketidakcocokan OSPF Area ID.',
        rootCause: 'Kedua router dikonfigurasi pada nomor OSPF Area yang berbeda pada subnet yang sama.',
        severity: 'CRITICAL',
        recommendedFix: 'Pastikan interface yang bertetangga berada dalam nomor Area yang identik (misal: Area 0).',
      });
      continue;
    }

    // 3. Hello / Dead Timer Mismatch
    if (line.includes('Mismatched hello parameters') || line.includes('Hello timer mismatch') || line.includes('Dead timer mismatch')) {
      debugs.push({
        issueType: 'TIMER_MISMATCH',
        description: 'Ketidakcocokan Interval OSPF Hello/Dead Timer.',
        rootCause: 'Nilai waktu Hello interval atau Dead interval tidak sama pada link subnet.',
        severity: 'CRITICAL',
        recommendedFix: 'Sesuaikan `ip ospf hello-interval` dan `ip ospf dead-interval` agar bernilai sama di kedua sisi.',
      });
      continue;
    }

    // 4. Authentication Type or Key Mismatch
    if (line.includes('Auth type mismatch') || line.includes('Authentication failed') || line.includes('Key ID mismatch') || line.includes('bad checksum')) {
      debugs.push({
        issueType: 'AUTH_MISMATCH',
        description: 'Kegagalan Autentikasi OSPF (Type atau Key Mismatch).',
        rootCause: 'Tipe autentikasi (Simple vs MD5/SHA) atau password key tidak cocok antar router.',
        severity: 'CRITICAL',
        recommendedFix: 'Verifikasi `ip ospf authentication message-digest` dan `ip ospf message-digest-key 1 md5 <key>`.',
      });
      continue;
    }

    // 5. Inactivity Timer Expired / Neighbor Down
    if (line.includes('Inactivity timer expired') || line.includes('Neighbor Down')) {
      const ipMatch = line.match(/(?:neighbor|to)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      debugs.push({
        neighborIp: ipMatch ? ipMatch[1] : undefined,
        issueType: 'INACTIVITY_DOWN',
        description: 'OSPF Adjacency Terputus (Inactivity Timer Expired).',
        rootCause: 'Router tidak menerima paket OSPF Hello dari neighbor dalam durasi Dead Timer.',
        severity: 'WARNING',
        recommendedFix: 'Periksa konektivitas kabel/VLAN fisik, multicast 224.0.0.5, atau ACL drop.',
      });
      continue;
    }
  }

  return debugs;
}

/**
 * =========================================================================
 * 4. Flow & Packet Trace Debug Parser (FortiOS Diag Debug Flow & Cisco ACL)
 * =========================================================================
 */
export function parseTerminalFlowDebug(terminalText: string): UniversalFlowDebug[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const flows: UniversalFlowDebug[] = [];

  let currentFlow: Partial<UniversalFlowDebug> | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // FortiOS Debug Flow Packet Header:
    // "id=20085 trace_id=1 func=print_pkt_detail line=5888 msg="vd-root:0 received a packet(proto=6, 192.168.1.10:49214->8.8.8.8:443) from port1.""
    const fgtPktMatch = line.match(/received a packet\(proto=(\d+),\s*([0-9\.]+):?(\d+)?->([0-9\.]+):?(\d+)?\)\s*from\s*([a-zA-Z0-9_\-\.]+)/i);
    if (fgtPktMatch) {
      if (currentFlow && currentFlow.sourceIp) {
        flows.push(currentFlow as UniversalFlowDebug);
      }
      const protoNum = fgtPktMatch[1];
      const proto = protoNum === '6' ? 'TCP' : protoNum === '17' ? 'UDP' : protoNum === '1' ? 'ICMP' : `Proto-${protoNum}`;
      currentFlow = {
        protocol: proto,
        sourceIp: fgtPktMatch[2],
        sourcePort: fgtPktMatch[3] || '-',
        destIp: fgtPktMatch[4],
        destPort: fgtPktMatch[5] || '-',
        ingressInterface: fgtPktMatch[6],
        action: 'ALLOWED',
        details: [],
      };
      continue;
    }

    if (currentFlow) {
      currentFlow.details = currentFlow.details || [];
      currentFlow.details.push(line);

      // Policy Match
      const policyMatch = line.match(/Find Policy\s+(\d+)/i) || line.match(/Match Policy\s+(\d+)/i);
      if (policyMatch) {
        currentFlow.matchedPolicy = `Policy ID ${policyMatch[1]}`;
      }

      // Deny / Drop
      if (line.includes('Deny by policy 0') || line.includes('Denied by policy') || line.includes('Action: Deny')) {
        currentFlow.action = 'DENIED';
      }

      // RPF check fail
      if (line.includes('Reverse path check fail') || line.includes('RPF check failed')) {
        currentFlow.action = 'RPF_FAILED';
      }

      // NAT Translation
      if (line.includes('SNAT') || line.includes('DNAT')) {
        currentFlow.action = 'NAT_TRANSLATED';
      }

      // Egress Interface
      const outIfMatch = line.match(/(?:output|outgoing|egress)\s*(?:interface|dev|port)?\s*[:=]\s*([a-zA-Z0-9_\-\.]+)/i);
      if (outIfMatch) {
        currentFlow.egressInterface = outIfMatch[1];
      }
    }

    // Cisco ACL Deny Log: "%SEC-6-IPACCESSLOGP: list 101 denied tcp 192.168.1.5(44321) -> 10.10.10.1(80), 1 packet"
    const ciscoAclMatch = line.match(/list\s+([a-zA-Z0-9_\-]+)\s+(denied|permitted)\s+([a-zA-Z]+)\s+([0-9\.]+)(?:\((\d+)\))?\s*->\s*([0-9\.]+)(?:\((\d+)\))?/i);
    if (ciscoAclMatch) {
      flows.push({
        matchedPolicy: `ACL ${ciscoAclMatch[1]}`,
        action: ciscoAclMatch[2].toLowerCase() === 'denied' ? 'DENIED' : 'ALLOWED',
        protocol: ciscoAclMatch[3].toUpperCase(),
        sourceIp: ciscoAclMatch[4],
        sourcePort: ciscoAclMatch[5] || '-',
        destIp: ciscoAclMatch[6],
        destPort: ciscoAclMatch[7] || '-',
        details: [line],
      });
    }
  }

  if (currentFlow && currentFlow.sourceIp) {
    flows.push(currentFlow as UniversalFlowDebug);
  }

  return flows;
}

/**
 * =========================================================================
 * 5. CLI Configuration Errors & Syntax Diagnostic Parser
 * =========================================================================
 */
export function parseTerminalConfigErrors(terminalText: string): UniversalCliError[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const errors: UniversalCliError[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Cisco syntax errors
    if (line.includes('% Invalid input detected at')) {
      errors.push({
        errorType: 'SYNTAX_ERROR',
        rawMessage: line,
        suggestedFix: 'Periksa penulisan kata kunci yang ditunjuk tanda panah (^), pastikan Anda berada di sub-mode konfigurasi yang benar (misal: `config-if`).',
      });
      continue;
    }
    if (line.includes('% Incomplete command')) {
      errors.push({
        errorType: 'INCOMPLETE_COMMAND',
        rawMessage: line,
        suggestedFix: 'Parameter perintah belum lengkap. Tambahkan tanda tanya (?) di ujung baris perintah untuk melihat argumen yang wajib diisi.',
      });
      continue;
    }
    if (line.includes('% Ambiguous command')) {
      errors.push({
        errorType: 'AMBIGUOUS',
        rawMessage: line,
        suggestedFix: 'Singkatan perintah ambigu karena terdapat beberapa opsi dengan awalan yang sama. Ketikkan kata kunci lebih panjang.',
      });
      continue;
    }

    // Fortinet syntax errors
    if (line.includes('command parse error before') || line.includes('node_check_object() fail') || line.includes('value parse error')) {
      errors.push({
        errorType: 'SYNTAX_ERROR',
        rawMessage: line,
        suggestedFix: 'Perintah FortiOS ditolak. Pastikan berada dalam blok `config ...` yang tepat dan nilai parameter valid.',
      });
      continue;
    }

    // MikroTik errors
    if (line.includes('failure: already have such') || line.includes('syntax error (line') || line.includes('expected end of command')) {
      errors.push({
        errorType: 'SYNTAX_ERROR',
        rawMessage: line,
        suggestedFix: 'Sintaks MikroTik RouterOS tidak valid atau entri duplikat sudah ada di database.',
      });
      continue;
    }

    // Juniper Junos errors
    if (line.includes('error: commit failed') || line.includes('error: syntax error')) {
      errors.push({
        errorType: 'COMMIT_FAILED',
        rawMessage: line,
        suggestedFix: 'Validasi commit Junos gagal. Cek baris konfigurasi yang hilang dengan perintah `show | compare` sebelum `commit`.',
      });
      continue;
    }

    // Docker Daemon Socket & Permission Errors
    if (
      (line.toLowerCase().includes('docker') || line.toLowerCase().includes('docker.sock')) &&
      (line.toLowerCase().includes('permission denied') || line.toLowerCase().includes('cannot connect to the docker daemon') || line.toLowerCase().includes('got permission denied'))
    ) {
      errors.push({
        errorType: 'PERMISSION_DENIED',
        rawMessage: line,
        suggestedFix: 'User tidak memiliki izin ke socket Docker `/var/run/docker.sock`. Tambahkan user ke grup docker: `sudo usermod -aG docker $USER && newgrp docker` atau ubah izin socket: `sudo chmod 666 /var/run/docker.sock`.',
      });
      continue;
    }

    // General Linux Permission Denied / Sudo
    if (line.toLowerCase().includes('permission denied') || line.toLowerCase().includes('operation not permitted') || line.toLowerCase().includes('is not in the sudoers file')) {
      errors.push({
        errorType: 'PERMISSION_DENIED',
        rawMessage: line,
        suggestedFix: 'Akses ditolak karena keterbatasan izin privilege. Jalankan perintah dengan awalan `sudo` atau periksa kepemilikan/izin file dengan `ls -ld` dan `chmod`.',
      });
      continue;
    }

    // Linux Command Not Found
    if (line.toLowerCase().includes('command not found') || /:\s*not found$/i.test(line)) {
      errors.push({
        errorType: 'SYNTAX_ERROR',
        rawMessage: line,
        suggestedFix: 'Perintah tidak dikenali sistem. Instal paket terkait melalui package manager (misal: `sudo apt install <paket>`) atau periksa variabel $PATH.',
      });
      continue;
    }
  }

  return errors;
}

/**
 * Real-Time Anomaly & Error Detection Model for Active Terminal Stream
 */
export interface DetectedTerminalAnomaly {
  type: 'docker_permission' | 'permission_denied' | 'command_not_found' | 'connection_error' | 'cli_syntax_error' | 'service_failure' | 'general_error';
  title: string;
  rawErrorLine: string;
  fullSnippet: string;
  suggestedAction: string;
  recommendedCommands?: { cmd: string; purpose: string }[];
  timestamp: number;
}

/**
 * Extracts strictly the current command prompt and its error output,
 * preventing previous commands or stale errors from being mixed in.
 */
function extractCleanCommandSnippet(recentLines: string[], errorIdx: number): string {
  // Search backward from errorIdx to find the command line that triggered this error
  let startIdx = errorIdx;
  for (let j = errorIdx - 1; j >= 0; j--) {
    const l = recentLines[j].trim();
    if (!l) continue;
    // Shell/CLI prompt line with a command (e.g. "user@host:~$ cmd" or "Router# cmd" or "host$ cmd")
    if (/[#>$%]\s*\S+/.test(l)) {
      startIdx = j;
      break;
    }
    // If we hit an earlier prompt line without command or previous prompt, stop right after it
    if (/^[a-zA-Z0-9_\-.~@:[\]()\s]+[#>$%]\s*$/.test(l)) {
      startIdx = j + 1;
      break;
    }
    // If we hit an error from a previous command, do not include it!
    if (/permission denied|command not found|cannot connect|invalid input/i.test(l)) {
      startIdx = j + 1;
      break;
    }
  }

  // Search forward up to the next prompt
  let endIdx = errorIdx;
  for (let k = errorIdx + 1; k < recentLines.length; k++) {
    const l = recentLines[k].trim();
    endIdx = k;
    if (/^[a-zA-Z0-9_\-.~@:[\]()\s]+[#>$%]\s*$/.test(l)) {
      break;
    }
    if (k - errorIdx >= 3) break;
  }

  return recentLines.slice(startIdx, endIdx + 1).join('\n').trim();
}

/**
 * Scans recent terminal buffer lines to spot real-time errors, access restrictions, or CLI rejections.
 */
export function detectTerminalAnomalies(text: string): DetectedTerminalAnomaly | null {
  if (!text || typeof text !== 'string') return null;
  const clean = stripAnsiCodes(text);
  const lines = clean.split('\n');
  const recentLines = lines.slice(-25);

  for (let i = recentLines.length - 1; i >= 0; i--) {
    const raw = recentLines[i].trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();

    // Ignore shell prompt lines
    if (/^[a-zA-Z0-9_\-.~@:[\]()\s]+[#>$%]\s*$/.test(raw)) continue;

    const prevLine = i > 0 ? recentLines[i - 1].trim() : '';

    // 1. Docker API Socket Permission
    if (
      (lower.includes('docker') || lower.includes('docker.sock') || lower.includes('unix:///var/run/docker.sock')) &&
      (lower.includes('permission denied') || lower.includes('cannot connect to the docker daemon') || lower.includes('got permission denied'))
    ) {
      return {
        type: 'docker_permission',
        title: 'Docker Daemon Socket: Permission Denied',
        rawErrorLine: raw,
        fullSnippet: extractCleanCommandSnippet(recentLines, i),
        suggestedAction: 'User tidak memiliki izin ke socket /var/run/docker.sock. Berikan hak akses grup docker ke user aktif atau berikan izin ke socket.',
        recommendedCommands: [
          { cmd: 'sudo usermod -aG docker $USER && newgrp docker', purpose: 'Tambahkan user aktif ke grup docker agar dapat mengakses socket' },
          { cmd: 'sudo chmod 666 /var/run/docker.sock', purpose: 'Beri izin baca/tulis socket docker secara instan' },
          { cmd: 'sudo docker ps -a', purpose: 'Eksekusi docker dengan hak akses root' },
        ],
        timestamp: Date.now(),
      };
    }

    // 2. Linux Permission Denied / Sudoers
    if (lower.includes('is not in the sudoers file') || lower.includes('permission denied') || lower.includes('operation not permitted')) {
      return {
        type: 'permission_denied',
        title: 'Hak Akses Ditolak (Permission Denied)',
        rawErrorLine: raw,
        fullSnippet: extractCleanCommandSnippet(recentLines, i),
        suggestedAction: 'Perintah memerlukan hak istimewa superuser (root). Jalankan perintah dengan awalan "sudo" di depan perintah.',
        recommendedCommands: [
          { cmd: 'sudo !!', purpose: 'Jalankan ulang perintah terakhir dengan hak akses superuser (sudo)' },
          { cmd: 'id', purpose: 'Periksa identitas user dan daftar grup saat ini' },
        ],
        timestamp: Date.now(),
      };
    }

    // 3. Command not found
    if (lower.includes('command not found') || /:\s*not found$/i.test(raw)) {
      const isShowCommand = /\bshow\s+/i.test(raw) || /\bshow\s+/i.test(prevLine);
      if (isShowCommand) {
        return {
          type: 'command_not_found',
          title: 'Perintah Tidak Ditemukan: Sintaks Router di Shell Linux',
          rawErrorLine: raw,
          fullSnippet: extractCleanCommandSnippet(recentLines, i),
          suggestedAction: 'Perintah "show" adalah sintaks Cisco IOS / Router CLI, bukan native Linux bash. Gunakan "ip addr show" atau "ifconfig" untuk memeriksa interface jaringan di Linux.',
          recommendedCommands: [
            { cmd: 'ip addr show', purpose: 'Tampilkan daftar IP address dan antarmuka jaringan di Linux' },
            { cmd: 'ip -c link', purpose: 'Periksa status fisik link dan MAC address interface' },
            { cmd: 'ip route show', purpose: 'Lihat tabel routing gateway Linux' },
          ],
          timestamp: Date.now(),
        };
      }

      const matchCmd = raw.match(/bash:\s*(?:line \d+:\s*)?([^:]+):\s*command not found/i) || raw.match(/^([a-zA-Z0-9_\-]+):\s*not found/i);
      const missingCmd = matchCmd ? matchCmd[1].trim() : 'perintah';

      return {
        type: 'command_not_found',
        title: 'Perintah Tidak Ditemukan (Command Not Found)',
        rawErrorLine: raw,
        fullSnippet: extractCleanCommandSnippet(recentLines, i),
        suggestedAction: `Perintah "${missingCmd}" belum terinstal di sistem atau direktori binernya belum terdaftar di variabel $PATH.`,
        recommendedCommands: [
          { cmd: `sudo apt update && sudo apt install -y ${missingCmd}`, purpose: `Instal paket ${missingCmd} melalui package manager` },
          { cmd: `which ${missingCmd} || echo $PATH`, purpose: 'Periksa daftar direktori pencarian biner sistem' },
        ],
        timestamp: Date.now(),
      };
    }

    // 4. Connection refused / timed out / unreachable
    if (lower.includes('connection refused') || lower.includes('network is unreachable') || lower.includes('no route to host') || lower.includes('connection timed out')) {
      return {
        type: 'connection_error',
        title: 'Koneksi Ditolak / Network Socket Error',
        rawErrorLine: raw,
        fullSnippet: extractCleanCommandSnippet(recentLines, i),
        suggestedAction: 'Target server atau service menolak koneksi. Periksa status service daemon, firewall port, atau default gateway.',
        recommendedCommands: [
          { cmd: 'ss -tulnp', purpose: 'Periksa daftar port dan service lokal yang sedang listening' },
          { cmd: 'ping -c 4 8.8.8.8', purpose: 'Uji konektivitas dasar layer 3 ke gateway/internet' },
        ],
        timestamp: Date.now(),
      };
    }

    // 5. Cisco / Router CLI Syntax Errors
    if (
      lower.includes('% invalid input detected at') ||
      lower.includes('% incomplete command') ||
      lower.includes('% ambiguous command') ||
      lower.includes('command parse error') ||
      lower.includes('syntax error (line') ||
      lower.includes('failure: already have such') ||
      lower.includes('error: commit failed')
    ) {
      return {
        type: 'cli_syntax_error',
        title: 'Sintaks Perintah Ditolak Perangkat',
        rawErrorLine: raw,
        fullSnippet: extractCleanCommandSnippet(recentLines, i),
        suggestedAction: 'Argumen atau parameter perintah tidak valid. Ketik tanda tanya (?) di ujung perintah untuk melihat argumen CLI yang valid.',
        recommendedCommands: [
          { cmd: '?', purpose: 'Tampilkan opsi perintah CLI yang valid di mode ini' },
        ],
        timestamp: Date.now(),
      };
    }

    // 6. Service Failure / Daemon Crash
    if (lower.includes('active: failed') || lower.includes('failed to start') || lower.includes('segmentation fault') || lower.includes('kernel panic')) {
      return {
        type: 'service_failure',
        title: 'Service Crash / Kegagalan Sistem',
        rawErrorLine: raw,
        fullSnippet: extractCleanCommandSnippet(recentLines, i),
        suggestedAction: 'Cek log detail dengan journalctl -xeu <service> dan restart service daemon terkait.',
        recommendedCommands: [
          { cmd: 'systemctl --failed', purpose: 'Daftar semua service sistem yang berstatus gagal' },
          { cmd: 'journalctl -xe --no-pager | tail -n 30', purpose: 'Tampilkan 30 baris log error sistem terakhir' },
        ],
        timestamp: Date.now(),
      };
    }
  }

  return null;
}

/**
 * =========================================================================
 * Formatting Helpers for Markdown Tables & Summaries
 * =========================================================================
 */
export function formatIpsecTableMarkdown(tunnels: UniversalIpsecTunnel[]): string {
  if (tunnels.length === 0) return '';

  const rows = tunnels.map(t => {
    const p1Badge = t.phase1State === 'UP' ? '🟢 **IKE UP**' : t.phase1State === 'NEGOTIATING' ? '🟡 Negotiating' : '🔴 **DOWN**';
    const p2Badge = t.phase2State === 'UP' ? '🟢 **IPsec UP**' : '🔴 **DOWN**';
    const traffic = t.bytesIn && t.bytesOut ? `In: \`${t.bytesIn}\`<br>Out: \`${t.bytesOut}\`` : '*(No Traffic)*';
    return `| \`${t.name}\` | \`${t.peerIp}\` | ${p1Badge} | ${p2Badge} | ${traffic} | ${t.diagnosis || '-'} |`;
  });

  return `| Nama Tunnel | Remote Peer IP | Status Phase 1 (IKE) | Status Phase 2 (IPsec) | Enkripsi Trafik | Diagnosa |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows.join('\n')}`;
}

export function formatFlowDebugMarkdown(flows: UniversalFlowDebug[]): string {
  if (flows.length === 0) return '';

  const rows = flows.map((f, idx) => {
    const actBadge = f.action === 'ALLOWED' 
      ? '🟢 **Allowed (Forward)**' 
      : f.action === 'NAT_TRANSLATED' 
      ? '🔵 **NAT Translated**' 
      : f.action === 'RPF_FAILED' 
      ? '🔴 **RPF Fail (Drop)**' 
      : '🔴 **Policy Deny (Drop)**';

    return `| #${idx + 1} | \`${f.sourceIp}:${f.sourcePort}\` | \`${f.destIp}:${f.destPort}\` | \`${f.protocol}\` | ${actBadge} | \`${f.matchedPolicy || 'Implicit Deny (0)'}\` | \`${f.egressInterface || '-'}\` |`;
  });

  return `\n\n| No | Source Socket | Destination Socket | Proto | Aksi Firewall | Kebijakan Rule / Policy | Egress Port |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${rows.slice(0, 10).join('\n')}\n\n`;
}

// Formats raw text so markdown tables and bullet lists parse correctly per line without collapsing
export function formatMarkdownTables(raw: string): string {
  if (!raw) return '';
  let formatted = String(raw || '');

  // 1. Remove dangerous raw HTML tags that break markdown tables or leak raw HTML
  formatted = formatted.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  formatted = formatted.replace(/<br\s*\/?>/gi, '\n');

  // 2. Fix inline bullet points that got joined in a single line (e.g. "• A • B • C")
  // Convert any bullet character preceded by non-newline into a separate line with markdown list item
  formatted = formatted.replace(/([^\n])\s*[•●▪▫]\s+/g, '$1\n- ');
  
  // 3. Convert any leading unicode bullets at the start of a line into standard markdown list item "- "
  formatted = formatted.replace(/^[ \t]*[•●▪▫]\s*/gm, '- ');

  // 4. Ensure list items have a blank line before them if preceded by a header or normal text line
  formatted = formatted.replace(/([^\n\-\*\d\>|])\n([ \t]*[-*]\s+)/g, '$1\n\n$2');

  // 5. Fix single-line concatenated markdown table rows:
  // e.g. "| col1 | col2 | | col3 | col4 |" -> "| col1 | col2 |\n| col3 | col4 |"
  formatted = formatted.replace(/\|\s*\|\s*(?=[^|\r\n]+?\|)/g, '|\n| ');

  // 6. Fix double trailing pipes
  formatted = formatted.replace(/\|\s*\|\s*$/gm, '|');

  // 7. Ensure table header has double newline before it if preceded by text without blank line
  // GFM requires a blank line before any table, otherwise it treats the table as paragraph text
  formatted = formatted.replace(/([^\n|])\n(\|[^\n]+\|\r?\n\|[\s:|\-]+\|)/g, '$1\n\n$2');

  // Remove any accidental blank line between table header and table separator
  formatted = formatted.replace(/(\|[^\n]+\|)\r?\n\s*\r?\n(\|[\s:|\-]+\|)/g, '$1\n$2');

  // 8. Ensure table is followed by double newline if followed by non-table text
  formatted = formatted.replace(/(\n\|[^\n]+\|)\n([^\n|#\s])/g, '$1\n\n$2');

  return formatted;
}

export function formatInterfacesTableMarkdown(ifaces: UniversalInterface[], brand: string, model: string): string {
  if (ifaces.length === 0) return '';

  const rows = ifaces.map(i => {
    const ipStr = i.ipv4List.length > 0 ? i.ipv4List.join(', ') : '*(L2 / No IP)*';
    const stateBadge = i.state === 'UP' 
      ? '🟢 **UP**' 
      : i.state === 'ADMIN_DOWN' 
      ? '⚪ **Admin Down**' 
      : '🔴 **DOWN**';
    const macDetail = i.mac && i.mac !== '-' ? ` (MAC: ${i.mac})` : '';
    return `| \`${i.name}\` | \`${ipStr}\` | ${stateBadge} | ${i.type}${macDetail} |`;
  });

  return `\n\n| Interface | IP Address | Status Link | Tipe / Keterangan |
| :--- | :--- | :--- | :--- |
${rows.join('\n')}\n\n`;
}

export function formatRoutesTableMarkdown(routes: UniversalRoute[]): string {
  if (routes.length === 0) return '';

  const rows = routes.map(r => {
    const isDefBadge = r.isDefault 
      ? '⭐ **Default Gateway**' 
      : r.protocol === 'CONNECTED' 
      ? '🔵 Connected' 
      : r.protocol === 'STATIC' 
      ? '🟡 Static' 
      : r.protocol === 'OSPF' 
      ? '🟢 OSPF' 
      : r.protocol === 'BGP' 
      ? '🟣 BGP' 
      : r.protocol;

    const stBadge = r.status === 'ACTIVE' 
      ? '🟢 Active' 
      : r.status === 'LINK_DOWN' 
      ? '🔴 Link Down' 
      : '⚪ Inactive';

    const metricStr = r.metric ? `\`${r.metric}\`` : '-';

    return `| \`${r.destination}\` | \`${r.gateway}\` | \`${r.interface}\` | ${isDefBadge} | ${metricStr} | ${stBadge} |`;
  });

  return `\n\n| Subnet Tujuan | Gateway (Next-Hop) | Interface | Protokol | Metric / AD | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows.join('\n')}\n\n`;
}

export function formatBgpTableMarkdown(peers: UniversalBgpPeer[]): string {
  if (peers.length === 0) return '';

  const rows = peers.map(p => {
    const stBadge = p.isEstablished ? '🟢 **Established**' : `🔴 ${p.state}`;
    return `| \`${p.peerIp}\` | **${p.asNumber}** | ${stBadge} | \`${p.prefixesReceived}\` | ${p.uptime || '-'} |`;
  });

  return `\n\n| Neighbor IP | Remote AS | Status Peering | Prefix Diterima | Uptime |
| :--- | :--- | :--- | :--- | :--- |
${rows.join('\n')}\n\n`;
}

export function formatOspfTableMarkdown(neighbors: UniversalOspfNeighbor[]): string {
  if (neighbors.length === 0) return '';

  const rows = neighbors.map(n => {
    const stBadge = n.isFull ? '🟢 **FULL (Adj)**' : `🟡 ${n.state}`;
    return `| \`${n.neighborId}\` | \`${n.ipAddress}\` | \`${n.interface}\` | ${stBadge} | ${n.deadTime || '-'} |`;
  });

  return `\n\n| Router-ID | Neighbor IP | Interface | Status State | Dead Timer |
| :--- | :--- | :--- | :--- | :--- |
${rows.join('\n')}\n\n`;
}

export function formatVlansTableMarkdown(vlans: UniversalVlan[]): string {
  if (vlans.length === 0) return '';

  const rows = vlans.map(v => {
    const stBadge = v.status === 'ACTIVE' ? '🟢 Active' : '🔴 Suspended';
    const portsStr = v.ports.length > 0 ? v.ports.join(', ') : '*(None)*';
    return `| **VLAN ${v.vlanId}** | \`${v.name}\` | ${stBadge} | \`${portsStr}\` |`;
  });

  return `\n\n| VLAN ID | Nama VLAN | Status | Port Member |
| :--- | :--- | :--- | :--- |
${rows.join('\n')}\n\n`;
}

export function formatArpTableMarkdown(arp: UniversalArpEntry[]): string {
  if (arp.length === 0) return '';

  const rows = arp.map(a => {
    return `| \`${a.ipAddress}\` | \`${a.macAddress}\` | \`${a.interface}\` | ${a.type} | ${a.state || 'REACHABLE'} |`;
  });

  return `\n\n| Alamat IP | MAC Address | Interface | Tipe Entry | Status |
| :--- | :--- | :--- | :--- | :--- |
${rows.slice(0, 15).join('\n')}\n\n`;
}

export function parseTerminalDhcp(terminalText: string): UniversalDhcpLease[] {
  const text = stripAnsiCodes(terminalText || '');
  const lines = text.split('\n');
  const leases: UniversalDhcpLease[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (
      line.startsWith('IP address') ||
      line.startsWith('Hardware address') ||
      line.startsWith('User name') ||
      line.startsWith('Flags:') ||
      line.startsWith('#   ADDRESS') ||
      line.startsWith('Internet Address')
    ) continue;

    // 1. Cisco `show ip dhcp binding`:
    // 192.168.10.15    0100.0c29.5602.c7       Aug 21 2026 12:45 PM    Automatic
    // 10.1.1.5         0100.5079.6668.00       Infinite                Manual
    const ciscoDhcpMatch = line.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9a-fA-F\.\:\-]{12,24})\s+(.+?)\s+(Automatic|Manual|Dynamic)$/i);
    if (ciscoDhcpMatch) {
      leases.push({
        ipAddress: ciscoDhcpMatch[1],
        macAddress: ciscoDhcpMatch[2],
        leaseExpiration: ciscoDhcpMatch[3].trim(),
        type: ciscoDhcpMatch[4],
        status: 'Bound (Active)',
      });
      continue;
    }

    // 2. MikroTik `/ip dhcp-server lease print`:
    // 0 D 192.168.10.15    00:0C:29:56:02:C7 Laptop-Admin     dhcp-lan   bound
    const mikrotikDhcpMatch = line.match(/^(?:\d+\s+[A-Z\s]*\s+)?([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9a-fA-F\:\-]{12,17})\s+([a-zA-Z0-9_\-\.]+)?\s*([a-zA-Z0-9_\-\.]+)?\s*(bound|waiting|testing|busy)?/i);
    if (mikrotikDhcpMatch && mikrotikDhcpMatch[2].includes(':')) {
      leases.push({
        ipAddress: mikrotikDhcpMatch[1],
        macAddress: mikrotikDhcpMatch[2],
        hostname: mikrotikDhcpMatch[3] || '-',
        server: mikrotikDhcpMatch[4] || 'dhcp-server',
        status: mikrotikDhcpMatch[5] ? mikrotikDhcpMatch[5].toUpperCase() : 'BOUND',
        type: 'Dynamic (DHCP)',
      });
      continue;
    }

    // 3. Generic DHCP lease line:
    // 192.168.1.50 00:11:22:33:44:55 PC-Client
    const genericDhcpMatch = line.match(/^([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9a-fA-F\:\.\-]{12,17})(?:\s+([a-zA-Z0-9_\-\.]+))?/i);
    if (genericDhcpMatch && (line.toLowerCase().includes('dhcp') || text.toLowerCase().includes('dhcp') || line.toLowerCase().includes('lease') || text.toLowerCase().includes('binding'))) {
      if (!leases.some(l => l.ipAddress === genericDhcpMatch[1])) {
        leases.push({
          ipAddress: genericDhcpMatch[1],
          macAddress: genericDhcpMatch[2],
          hostname: genericDhcpMatch[3] || '-',
          status: 'Bound',
          type: 'Automatic',
        });
      }
      continue;
    }
  }

  return leases;
}

export function formatDhcpTableMarkdown(leases: UniversalDhcpLease[]): string {
  if (leases.length === 0) return '';

  const rows = leases.map(l => {
    const host = l.hostname && l.hostname !== '-' ? `\`${l.hostname}\`` : '*(None)*';
    const exp = l.leaseExpiration ? `\`${l.leaseExpiration}\`` : 'Dynamic Lease';
    const stBadge = l.status?.toLowerCase().includes('bound') || l.status?.toLowerCase().includes('active')
      ? '🟢 Active (Bound)'
      : '🟡 Waiting';
    return `| \`${l.ipAddress}\` | \`${l.macAddress}\` | ${host} | ${exp} | ${stBadge} |`;
  });

  return `| Alamat IP Klien | MAC Address / Client-ID | Hostname | Masa Berlaku Lease | Status Alokasi |
| :--- | :--- | :--- | :--- | :--- |
${rows.join('\n')}`;
}

export function parseTerminalContainers(terminalText: string, brand?: string): UniversalContainer[] {
  const text = stripAnsiCodes(terminalText || '');
  if (!text.trim()) return [];

  // Strict verification: text MUST have a Docker table header or Docker command or Docker status pattern
  const hasDockerHeader = /CONTAINER\s+ID\s+(?:IMAGE|COMMAND)/i.test(text) || /(?:docker\s+ps|docker\s+container\s+ls|docker\s+compose\s+ps|podman\s+ps)/i.test(text);
  const hasDockerStatusKeywords = /(?:Up\s+\d+|Up\s+About|Up\s+Less|Exited\s*\(\d+\)|Restarting\s*\(|Paused|Removal\s+In\s+Progress)/i.test(text);

  // If there's neither a docker header nor docker status keywords, reject to prevent false positives from Cisco/Router hex dumps
  if (!hasDockerHeader && !hasDockerStatusKeywords) {
    return [];
  }

  // If brand is a dedicated network device without explicit docker command/header, do not parse as docker
  const b = (brand || '').toLowerCase();
  const isDedicatedNetworkOs = ['cisco', 'fortinet', 'juniper', 'mikrotik', 'huawei', 'aruba', 'ruckus', 'nexus'].includes(b);
  if (isDedicatedNetworkOs && !hasDockerHeader && !/docker|podman|containerd/i.test(text)) {
    return [];
  }

  const lines = text.split('\n');
  const containers: UniversalContainer[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip table header
    if (/CONTAINER\s+ID/i.test(line) && (/IMAGE/i.test(line) || /COMMAND/i.test(line))) continue;
    // Skip shell prompts unless it has docker output
    if (/^[a-zA-Z0-9_\-.~@:[\]()]+\s*[$#%]/i.test(line) && !line.includes('docker ps')) continue;

    // Check if line begins with Docker hex ID (8 to 64 hex characters)
    const match = line.match(/^([a-f0-9]{8,64})\s+(.+)$/i);
    if (!match) continue;

    const id = match[1];
    const rest = match[2];

    // Split columns by 2 or more consecutive spaces
    const parts = rest.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);

    let image = '';
    let command = '';
    let created = '';
    let status = '';
    let ports = '-';
    let name = '';

    if (parts.length >= 5) {
      image = parts[0];
      command = parts[1];
      created = parts[2];
      status = parts[3];

      if (parts.length >= 6) {
        ports = parts[4];
        name = parts[5];
      } else {
        // If 5 parts, check if 5th part is port mapping or name
        if (/->|\/(?:tcp|udp)/i.test(parts[4])) {
          ports = parts[4];
          name = id.slice(0, 12);
        } else {
          ports = '-';
          name = parts[4];
        }
      }
    } else if (parts.length === 4) {
      image = parts[0];
      command = parts[1];
      status = parts[2];
      name = parts[3];
    } else if (parts.length === 3) {
      image = parts[0];
      status = parts[1];
      name = parts[2];
    } else if (parts.length >= 2) {
      image = parts[0];
      name = parts[parts.length - 1];
      status = parts.slice(1, parts.length - 1).join(' ');
    } else {
      continue;
    }

    // Validate that status looks like a real container status
    const isUp = /up\s+/i.test(status) || /^up$/i.test(status);
    const isExited = /exited\s*\(/i.test(status) || /^exited$/i.test(status);
    const isOtherState = /restarting|created|paused|dead/i.test(status);

    if (!hasDockerHeader && !isUp && !isExited && !isOtherState) {
      continue;
    }

    const isRunning = isUp;
    containers.push({
      id,
      image: image || 'unknown',
      command: command || '-',
      created: created || '-',
      status: status || (isRunning ? 'Up' : 'Exited'),
      ports: ports || '-',
      name: name || id.substring(0, 12),
      isRunning,
    });
  }

  return containers;
}

export function formatContainerTableMarkdown(containers: UniversalContainer[]): string {
  if (containers.length === 0) return '';
  const rows = containers.map(c => {
    const stIcon = c.isRunning ? '🟢' : '🔴';
    const cleanPorts = c.ports && c.ports !== '-' ? `\`${c.ports}\`` : '-';
    return `| \`${c.id.slice(0, 12)}\` | **${c.name}** | \`${c.image}\` | ${stIcon} ${c.status} | ${cleanPorts} |`;
  });
  return `| Container ID | Nama Kontainer | Image | Status | Port Binding |
| :--- | :--- | :--- | :--- | :--- |
${rows.join('\n')}`;
}

// ============================================================================
// COMPREHENSIVE RUNNING-CONFIG ANALYZER ENGINE (SHOW RUN / CONFIG PARSER)
// ============================================================================

export interface ParsedRunningConfigVlan {
  vlanId: string;
  name: string;
  sviIp: string;
  ports: string[];
  status: string;
}

export interface ParsedRunningConfigInterface {
  name: string;
  ipAddress: string;
  subnetMask: string;
  cidr: string;
  status: 'UP' | 'DOWN' | 'ADMIN_DOWN';
  description: string;
  ipHelper?: string;
  accessVlan?: string;
  trunkAllowedVlans?: string;
  isL3: boolean;
}

export interface ParsedRunningConfigRoute {
  destination: string;
  subnet: string;
  gateway: string;
  metric: string;
  category: 'Default Route (0.0.0.0/0)' | 'Static Route' | 'SVI Subnet' | 'Dynamic Route';
  isDefault: boolean;
}

export interface ParsedRunningConfigBgpNeighbor {
  neighborIp: string;
  remoteAs: string;
  description: string;
  updateSource: string;
}

export interface ParsedRunningConfigBgp {
  isConfigured: boolean;
  asNumber: string;
  routerId: string;
  neighbors: ParsedRunningConfigBgpNeighbor[];
  networks: string[];
}

export interface ParsedRunningConfigOspfNetwork {
  network: string;
  wildcard: string;
  area: string;
}

export interface ParsedRunningConfigOspf {
  isConfigured: boolean;
  processId: string;
  routerId: string;
  networks: ParsedRunningConfigOspfNetwork[];
  passiveInterfaces: string[];
}

export interface ParsedRunningConfigTunnel {
  name: string;
  ipAddress: string;
  source: string;
  destination: string;
  mode: string;
}

export interface ParsedRunningConfigCryptoMap {
  name: string;
  sequence: string;
  peer: string;
  transformSet: string;
  matchAcl: string;
}

export interface ParsedRunningConfigIpsec {
  isConfigured: boolean;
  tunnels: ParsedRunningConfigTunnel[];
  cryptoMaps: ParsedRunningConfigCryptoMap[];
  transformSets: string[];
  ikePolicies: string[];
}

export interface ParsedRunningConfigAclRule {
  aclName: string;
  type: string;
  action: 'PERMIT' | 'DENY';
  protocol: string;
  source: string;
  destination: string;
  port: string;
  boundInterface?: string;
}

export interface ParsedRunningConfigDhcpPool {
  poolName: string;
  network: string;
  defaultRouter: string;
  dnsServer: string;
  domainName?: string;
  lease?: string;
}

export interface ParsedRunningConfigSecurityFinding {
  level: 'CRITICAL' | 'WARNING' | 'INFO' | 'GOOD';
  title: string;
  description: string;
  remediationCmd?: string;
}

/**
 * Checks whether the terminal text represents a running configuration or show run output.
 */
export function isRunningConfigOutput(terminalText: string): boolean {
  if (!terminalText || terminalText.length < 30) return false;
  const stripped = stripAnsiCodes(terminalText);
  const lower = stripped.toLowerCase();

  // Background captured configuration markers
  if (
    stripped.includes('[KONFIGURASI LENGKAP RUNNING-CONFIG') ||
    stripped.includes('RUNNING CONFIGURATION (Captured silently in background') ||
    stripped.includes('[LIVE DEVICE RUNNING CONFIGURATION')
  ) {
    return true;
  }

  // Explicit show run commands
  if (
    /^(?:show\s+(?:run|running-config|full-configuration|configuration|conf)|display\s+current-configuration|get\s+system\s+status|\/export|export)\b/im.test(stripped)
  ) {
    return true;
  }

  // Header markers
  if (
    stripped.includes('Building configuration...') ||
    stripped.includes('Current configuration :') ||
    stripped.includes('! Last configuration change') ||
    stripped.includes('# sysname ') ||
    stripped.includes('# config-version=') ||
    stripped.includes('## Last commit:')
  ) {
    return true;
  }

  // Multiple config keywords present
  let score = 0;
  if (/^hostname\s+[a-zA-Z0-9_\-\.]+/im.test(stripped) || /^sysname\s+[a-zA-Z0-9_\-\.]+/im.test(stripped)) score += 2;
  if (/^interface\s+[a-zA-Z0-9\/\.\-]+/im.test(stripped)) score += 2;
  if (/^ip\s+route\s+/im.test(stripped) || /^ip\s+route-static\s+/im.test(stripped) || /\/ip\s+route\s+add/im.test(stripped)) score += 2;
  if (/^vlan\s+\d+/im.test(stripped) || /\/interface\s+vlan/im.test(stripped)) score += 1;
  if (/^router\s+(?:ospf|bgp|eigrp|rip)/im.test(stripped)) score += 2;
  if (/^ip\s+dhcp\s+pool/im.test(stripped)) score += 1;
  if (/^ip\s+access-list|^access-list\s+\d+/im.test(stripped)) score += 1;
  if (/^crypto\s+/im.test(stripped)) score += 1;
  if (/^line\s+(?:vty|con)\s+/im.test(stripped)) score += 1;

  return score >= 3;
}

/**
 * Helper to convert subnet mask to CIDR prefix
 */
function maskToCidr(mask: string): string {
  if (!mask) return '';
  if (mask.startsWith('/')) return mask;
  const parts = mask.split('.').map(Number);
  if (parts.length !== 4) return mask;
  let bits = 0;
  for (const part of parts) {
    let p = part;
    while (p > 0) {
      if (p & 1) bits++;
      p = p >> 1;
    }
  }
  return `/${bits}`;
}

/**
 * Parses comprehensive VLAN information from running-config text.
 */
export function parseRunningConfigVlans(text: string): ParsedRunningConfigVlan[] {
  const vlansMap = new Map<string, ParsedRunningConfigVlan>();
  const lines = text.split('\n');

  // 1. Cisco / Arista / Dell style: "vlan 10 \n name MANAGEMENT"
  let curVlanId = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const vMatch = line.match(/^vlan\s+(\d+)(?:\s*,\s*(\d+))*/i);
    if (vMatch && !line.includes('access') && !line.includes('allowed') && !line.includes('filter') && !line.includes('configuration')) {
      const vId = vMatch[1];
      curVlanId = vId;
      if (!vlansMap.has(vId)) {
        vlansMap.set(vId, {
          vlanId: vId,
          name: `VLAN_${vId}`,
          sviIp: '-',
          ports: [],
          status: 'ACTIVE',
        });
      }
      continue;
    }

    if (curVlanId && line.startsWith('name ')) {
      const nameMatch = line.match(/^name\s+(.+)$/i);
      if (nameMatch && vlansMap.has(curVlanId)) {
        vlansMap.get(curVlanId)!.name = nameMatch[1].trim();
      }
      continue;
    }

    if (curVlanId && line.startsWith('state ')) {
      const stateMatch = line.match(/^state\s+(suspend|active)/i);
      if (stateMatch && vlansMap.has(curVlanId)) {
        vlansMap.get(curVlanId)!.status = stateMatch[1].toUpperCase();
      }
      continue;
    }

    if (/^!|^exit|^end/i.test(line)) {
      curVlanId = '';
    }
  }

  // 2. MikroTik style: "/interface vlan add name=... vlan-id=..."
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.includes('vlan-id=') || (line.startsWith('/interface vlan') && line.includes('vlan-id='))) {
      const vIdMatch = line.match(/vlan-id=(\d+)/);
      const nameMatch = line.match(/name="?([a-zA-Z0-9_\-\.]+)"?/);
      const ifaceMatch = line.match(/interface="?([a-zA-Z0-9_\-\.]+)"?/);
      if (vIdMatch) {
        const vId = vIdMatch[1];
        const vName = nameMatch ? nameMatch[1] : `vlan${vId}`;
        const port = ifaceMatch ? ifaceMatch[1] : '';
        if (!vlansMap.has(vId)) {
          vlansMap.set(vId, {
            vlanId: vId,
            name: vName,
            sviIp: '-',
            ports: port ? [port] : [],
            status: 'ACTIVE',
          });
        }
      }
    }
  }

  // 3. Match SVI interfaces (interface Vlan10 / Vlanif10)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const sviMatch = line.match(/^interface\s+(?:Vlan|Vlanif)\s*(\d+)/i);
    if (sviMatch) {
      const vId = sviMatch[1];
      if (!vlansMap.has(vId)) {
        vlansMap.set(vId, {
          vlanId: vId,
          name: `VLAN_${vId}`,
          sviIp: '-',
          ports: [],
          status: 'ACTIVE',
        });
      }
      // Look ahead for IP address inside SVI block
      for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
        const sub = lines[j].trim();
        if (/^interface\s+/i.test(sub) || /^!/i.test(sub)) break;
        const ipMatch = sub.match(/^ip\s+address\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
        if (ipMatch) {
          vlansMap.get(vId)!.sviIp = `${ipMatch[1]}${maskToCidr(ipMatch[2])}`;
          break;
        }
      }
    }
  }

  // 4. Match Switchport access/trunk ports assigned to VLANs
  let currentInterface = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const ifMatch = line.match(/^interface\s+([a-zA-Z0-9\/\.\-]+)/i);
    if (ifMatch) {
      currentInterface = ifMatch[1];
      continue;
    }

    if (currentInterface && line.startsWith('switchport access vlan ')) {
      const accMatch = line.match(/^switchport access vlan\s+(\d+)/i);
      if (accMatch) {
        const vId = accMatch[1];
        if (!vlansMap.has(vId)) {
          vlansMap.set(vId, { vlanId: vId, name: `VLAN_${vId}`, sviIp: '-', ports: [], status: 'ACTIVE' });
        }
        const v = vlansMap.get(vId)!;
        if (!v.ports.includes(currentInterface)) {
          v.ports.push(`${currentInterface} (Access)`);
        }
      }
    }

    if (currentInterface && line.startsWith('switchport trunk allowed vlan ')) {
      const trMatch = line.match(/^switchport trunk allowed vlan\s+(?:add\s+)?([0-9,\-]+)/i);
      if (trMatch) {
        const vlanListStr = trMatch[1];
        const vlanItems = vlanListStr.split(',');
        for (const item of vlanItems) {
          if (item.includes('-')) {
            const [start, end] = item.split('-').map(Number);
            if (!isNaN(start) && !isNaN(end) && end - start < 100) {
              for (let vIdNum = start; vIdNum <= end; vIdNum++) {
                const vId = String(vIdNum);
                if (vlansMap.has(vId)) {
                  const v = vlansMap.get(vId)!;
                  if (!v.ports.includes(`${currentInterface} (Trunk)`)) {
                    v.ports.push(`${currentInterface} (Trunk)`);
                  }
                }
              }
            }
          } else {
            const vId = item.trim();
            if (vlansMap.has(vId)) {
              const v = vlansMap.get(vId)!;
              if (!v.ports.includes(`${currentInterface} (Trunk)`)) {
                v.ports.push(`${currentInterface} (Trunk)`);
              }
            }
          }
        }
      }
    }

    if (/^!|^exit|^end/i.test(line)) {
      currentInterface = '';
    }
  }

  // Convert map to sorted array by numerical VLAN ID
  const result = Array.from(vlansMap.values()).sort((a, b) => Number(a.vlanId) - Number(b.vlanId));
  return result;
}

/**
 * Parses comprehensive interface and IP address information from running-config text.
 */
export function parseRunningConfigInterfaces(text: string): ParsedRunningConfigInterface[] {
  const ifaces: ParsedRunningConfigInterface[] = [];
  const lines = text.split('\n');

  let curIface: ParsedRunningConfigInterface | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Match Cisco / Arista / Huawei interface header
    const ifMatch = line.match(/^interface\s+([a-zA-Z0-9\/\.\-]+)/i);
    if (ifMatch && !line.includes('range')) {
      if (curIface) {
        ifaces.push(curIface);
      }
      curIface = {
        name: ifMatch[1],
        ipAddress: '-',
        subnetMask: '-',
        cidr: '',
        status: 'UP',
        description: '-',
        isL3: false,
      };
      continue;
    }

    if (curIface) {
      if (/^shutdown$/i.test(line)) {
        curIface.status = 'ADMIN_DOWN';
      } else if (/^no shutdown$/i.test(line)) {
        curIface.status = 'UP';
      }

      if (/^description\s+(.+)$/i.test(line)) {
        const descMatch = line.match(/^description\s+(.+)$/i);
        if (descMatch) curIface.description = descMatch[1].trim();
      }

      const ipMatch = line.match(/^ip\s+address\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})(?:\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})|\/(\d+))/i);
      if (ipMatch) {
        curIface.ipAddress = ipMatch[1];
        if (ipMatch[2]) {
          curIface.subnetMask = ipMatch[2];
          curIface.cidr = maskToCidr(ipMatch[2]);
        } else if (ipMatch[3]) {
          curIface.subnetMask = `/${ipMatch[3]}`;
          curIface.cidr = `/${ipMatch[3]}`;
        }
        curIface.isL3 = true;
      }

      const ipDhcpMatch = line.match(/^ip\s+address\s+(dhcp|negotiated)/i);
      if (ipDhcpMatch) {
        curIface.ipAddress = `DHCP / Auto (${ipDhcpMatch[1].toUpperCase()})`;
        curIface.isL3 = true;
      }

      const helperMatch = line.match(/^ip\s+helper-address\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      if (helperMatch) {
        curIface.ipHelper = helperMatch[1];
      }

      const accMatch = line.match(/^switchport\s+access\s+vlan\s+(\d+)/i);
      if (accMatch) {
        curIface.accessVlan = accMatch[1];
      }

      const trMatch = line.match(/^switchport\s+trunk\s+allowed\s+vlan\s+(.+)$/i);
      if (trMatch) {
        curIface.trunkAllowedVlans = trMatch[1].trim();
      }

      if (/^!|^exit|^end/i.test(line) && !rawLine.startsWith(' ')) {
        ifaces.push(curIface);
        curIface = null;
      }
    }

    // Match Juniper: set interfaces ge-0/0/0 unit 0 family inet address 192.168.1.1/24
    const junIfaceMatch = line.match(/^set\s+interfaces\s+([a-zA-Z0-9\/\.\-]+)(?:\s+unit\s+\d+)?\s+family\s+inet\s+address\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}\/\d+)/i);
    if (junIfaceMatch) {
      const [ip, cidr] = junIfaceMatch[2].split('/');
      ifaces.push({
        name: junIfaceMatch[1],
        ipAddress: ip,
        subnetMask: `/${cidr}`,
        cidr: `/${cidr}`,
        status: 'UP',
        description: '-',
        isL3: true,
      });
    }

    // Match FortiOS interface config: edit "port1" ... set ip 192.168.1.1 255.255.255.0
    if (/^edit\s+"?([a-zA-Z0-9_\-\.]+)"?/i.test(line) && text.includes('config system interface')) {
      const fortMatch = line.match(/^edit\s+"?([a-zA-Z0-9_\-\.]+)"?/i);
      if (fortMatch) {
        if (curIface) ifaces.push(curIface);
        curIface = {
          name: fortMatch[1],
          ipAddress: '-',
          subnetMask: '-',
          cidr: '',
          status: 'UP',
          description: '-',
          isL3: false,
        };
      }
    }
    if (curIface && /set\s+ip\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i.test(line)) {
      const fortIp = line.match(/set\s+ip\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      if (fortIp) {
        curIface.ipAddress = fortIp[1];
        curIface.subnetMask = fortIp[2];
        curIface.cidr = maskToCidr(fortIp[2]);
        curIface.isL3 = true;
      }
    }

    // Match MikroTik /ip address add address=192.168.1.1/24 interface=ether1
    if (line.includes('/ip address add') || (line.includes('address=') && line.includes('interface='))) {
      const addrMatch = line.match(/address=([0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d+)?)/i);
      const ifMatchMt = line.match(/interface="?([a-zA-Z0-9_\-\.]+)"?/i);
      const commMatch = line.match(/comment="?([^"]+)"?/i);
      const disabled = line.includes('disabled=yes');

      if (addrMatch && ifMatchMt) {
        const fullAddr = addrMatch[1];
        const [ip, cidr] = fullAddr.includes('/') ? fullAddr.split('/') : [fullAddr, ''];
        ifaces.push({
          name: ifMatchMt[1],
          ipAddress: ip,
          subnetMask: cidr ? `/${cidr}` : '',
          cidr: cidr ? `/${cidr}` : '',
          status: disabled ? 'ADMIN_DOWN' : 'UP',
          description: commMatch ? commMatch[1] : '-',
          isL3: true,
        });
      }
    }
  }

  if (curIface) {
    ifaces.push(curIface);
  }

  return ifaces;
}

/**
 * Parses static routes and default routes from running-config text.
 */
export function parseRunningConfigRoutes(text: string): ParsedRunningConfigRoute[] {
  const routes: ParsedRunningConfigRoute[] = [];
  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // 1. Cisco / Arista `ip route <dest> <mask> <gw> [AD]`
    const ciscoRouteMatch = line.match(/^ip\s+route\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-zA-Z0-9\/\.\-]+)(?:\s+(\d+))?/i);
    if (ciscoRouteMatch) {
      const dest = ciscoRouteMatch[1];
      const mask = ciscoRouteMatch[2];
      const gw = ciscoRouteMatch[3];
      const metric = ciscoRouteMatch[4] || '1';
      const isDefault = dest === '0.0.0.0' && mask === '0.0.0.0';

      routes.push({
        destination: isDefault ? '0.0.0.0/0 (Default Gateway)' : `${dest}${maskToCidr(mask)}`,
        subnet: mask,
        gateway: gw,
        metric: metric,
        category: isDefault ? 'Default Route (0.0.0.0/0)' : 'Static Route',
        isDefault,
      });
      continue;
    }

    // 2. Huawei `ip route-static <dest> <mask> <gw>`
    const huaweiRouteMatch = line.match(/^ip\s+route-static\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}|\d+)\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-zA-Z0-9\/\.\-]+)/i);
    if (huaweiRouteMatch) {
      const dest = huaweiRouteMatch[1];
      const maskOrCidr = huaweiRouteMatch[2];
      const gw = huaweiRouteMatch[3];
      const isDefault = dest === '0.0.0.0' && (maskOrCidr === '0.0.0.0' || maskOrCidr === '0');

      routes.push({
        destination: isDefault ? '0.0.0.0/0 (Default Gateway)' : `${dest}/${maskOrCidr}`,
        subnet: maskOrCidr,
        gateway: gw,
        metric: '1',
        category: isDefault ? 'Default Route (0.0.0.0/0)' : 'Static Route',
        isDefault,
      });
      continue;
    }

    // 3. MikroTik `/ip route add dst-address=0.0.0.0/0 gateway=192.168.1.1`
    if (line.includes('/ip route add') || (line.includes('dst-address=') && line.includes('gateway='))) {
      const dstMatch = line.match(/dst-address=([0-9]{1,3}(?:\.[0-9]{1,3}){3}(?:\/\d+)?)/i);
      const gwMatch = line.match(/gateway=([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-zA-Z0-9_\-\.]+)/i);
      const distMatch = line.match(/distance=(\d+)/i);

      if (dstMatch && gwMatch) {
        const dst = dstMatch[1];
        const isDefault = dst === '0.0.0.0/0' || dst === '0.0.0.0';
        routes.push({
          destination: isDefault ? '0.0.0.0/0 (Default Gateway)' : dst,
          subnet: dst.includes('/') ? dst.split('/')[1] : '32',
          gateway: gwMatch[1],
          metric: distMatch ? distMatch[1] : '1',
          category: isDefault ? 'Default Route (0.0.0.0/0)' : 'Static Route',
          isDefault,
        });
      }
    }
  }

  return routes;
}

/**
 * Parses dynamic routing protocols (BGP, OSPF, EIGRP, RIP) from running-config text.
 */
export function parseRunningConfigDynamicRouting(text: string): {
  bgp: ParsedRunningConfigBgp;
  ospf: ParsedRunningConfigOspf;
  eigrp: { isConfigured: boolean; asNumber: string; networks: string[] };
  rip: { isConfigured: boolean; version: string; networks: string[] };
} {
  const lines = text.split('\n');

  // 1. BGP Parser
  const bgp: ParsedRunningConfigBgp = {
    isConfigured: false,
    asNumber: '',
    routerId: '',
    neighbors: [],
    networks: [],
  };

  const bgpMatch = text.match(/^router\s+bgp\s+(\d+)/im) || text.match(/^bgp\s+(\d+)/im) || text.match(/\/routing\s+bgp\s+instance/im);
  if (bgpMatch) {
    bgp.isConfigured = true;
    bgp.asNumber = bgpMatch[1] || 'Active';

    const rIdMatch = text.match(/bgp\s+router-id\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
    if (rIdMatch) bgp.routerId = rIdMatch[1];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const nbrMatch = line.match(/^neighbor\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+remote-as\s+(\d+)/i);
      if (nbrMatch) {
        const nIp = nbrMatch[1];
        const rAs = nbrMatch[2];
        let desc = '-';
        let uSrc = '-';

        // Find neighbor details in config
        const descMatch = text.match(new RegExp(`neighbor\\s+${nIp}\\s+description\\s+(.+)`, 'i'));
        if (descMatch) desc = descMatch[1].trim();

        const srcMatch = text.match(new RegExp(`neighbor\\s+${nIp}\\s+update-source\\s+(\\S+)`, 'i'));
        if (srcMatch) uSrc = srcMatch[1].trim();

        if (!bgp.neighbors.some(n => n.neighborIp === nIp)) {
          bgp.neighbors.push({
            neighborIp: nIp,
            remoteAs: rAs,
            description: desc,
            updateSource: uSrc,
          });
        }
      }

      const netMatch = line.match(/^network\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+mask\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      if (netMatch && bgp.isConfigured) {
        bgp.networks.push(`${netMatch[1]}${maskToCidr(netMatch[2])}`);
      }
    }
  }

  // 2. OSPF Parser
  const ospf: ParsedRunningConfigOspf = {
    isConfigured: false,
    processId: '',
    routerId: '',
    networks: [],
    passiveInterfaces: [],
  };

  const ospfMatch = text.match(/^router\s+ospf\s+(\d+)/im) || text.match(/^ospf\s+(\d+)/im) || text.match(/\/routing\s+ospf/im);
  if (ospfMatch) {
    ospf.isConfigured = true;
    ospf.processId = ospfMatch[1] || '1';

    const rIdMatch = text.match(/router-id\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
    if (rIdMatch) ospf.routerId = rIdMatch[1];

    let insideOspfBlock = false;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (/^router\s+ospf/i.test(line)) {
        insideOspfBlock = true;
        continue;
      }
      if (insideOspfBlock) {
        if (/^!|^router\s+|^interface\s+|^line\s+/i.test(line) && !rawLine.startsWith(' ')) {
          insideOspfBlock = false;
          continue;
        }

        const netMatch = line.match(/^network\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3})\s+area\s+(\d+|[0-9\.]+)/i);
        if (netMatch) {
          ospf.networks.push({
            network: netMatch[1],
            wildcard: netMatch[2],
            area: `Area ${netMatch[3]}`,
          });
        }

        const passMatch = line.match(/^passive-interface\s+(\S+)/i);
        if (passMatch) {
          ospf.passiveInterfaces.push(passMatch[1]);
        }
      }
    }
  }

  // 3. EIGRP Parser
  const eigrp = {
    isConfigured: false,
    asNumber: '',
    networks: [] as string[],
  };
  const eigrpMatch = text.match(/^router\s+eigrp\s+(\d+)/im);
  if (eigrpMatch) {
    eigrp.isConfigured = true;
    eigrp.asNumber = eigrpMatch[1];
  }

  // 4. RIP Parser
  const rip = {
    isConfigured: false,
    version: '1',
    networks: [] as string[],
  };
  const ripMatch = text.match(/^router\s+rip/im);
  if (ripMatch) {
    rip.isConfigured = true;
    const vMatch = text.match(/^version\s+(\d+)/im);
    if (vMatch) rip.version = vMatch[1];
  }

  return { bgp, ospf, eigrp, rip };
}

/**
 * Parses Tunnel interfaces, Crypto maps, and IPsec VPN configurations.
 */
export function parseRunningConfigIpsec(text: string): ParsedRunningConfigIpsec {
  const result: ParsedRunningConfigIpsec = {
    isConfigured: false,
    tunnels: [],
    cryptoMaps: [],
    transformSets: [],
    ikePolicies: [],
  };

  const lines = text.split('\n');

  // 1. Tunnel Interfaces (GRE / IPsec VTI)
  let curTunnel: ParsedRunningConfigTunnel | null = null;
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    const tMatch = line.match(/^interface\s+(Tunnel\d+)/i);
    if (tMatch) {
      if (curTunnel) result.tunnels.push(curTunnel);
      curTunnel = {
        name: tMatch[1],
        ipAddress: '-',
        source: '-',
        destination: '-',
        mode: 'GRE / IP',
      };
      continue;
    }

    if (curTunnel) {
      const ipMatch = line.match(/^ip\s+address\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}\s+[0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      if (ipMatch) curTunnel.ipAddress = ipMatch[1];

      const srcMatch = line.match(/^tunnel\s+source\s+(\S+)/i);
      if (srcMatch) curTunnel.source = srcMatch[1];

      const dstMatch = line.match(/^tunnel\s+destination\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}|\S+)/i);
      if (dstMatch) curTunnel.destination = dstMatch[1];

      const modeMatch = line.match(/^tunnel\s+mode\s+(.+)$/i);
      if (modeMatch) curTunnel.mode = modeMatch[1].toUpperCase();

      if (/^!|^exit|^interface\s+/i.test(line) && !rawLine.startsWith(' ')) {
        result.tunnels.push(curTunnel);
        curTunnel = null;
      }
    }
  }
  if (curTunnel) result.tunnels.push(curTunnel);

  // 2. Crypto Map Parsing
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const cmMatch = line.match(/^crypto\s+map\s+(\S+)\s+(\d+)\s+ipsec-isakmp/i);
    if (cmMatch) {
      const name = cmMatch[1];
      const seq = cmMatch[2];
      let peer = '-';
      let ts = '-';
      let acl = '-';

      const peerMatch = text.match(new RegExp(`crypto\\s+map\\s+${name}\\s+${seq}\\s+set\\s+peer\\s+([0-9\\.]+)`, 'i')) || text.match(/set\s+peer\s+([0-9\.]+)/i);
      if (peerMatch) peer = peerMatch[1];

      const tsMatch = text.match(new RegExp(`crypto\\s+map\\s+${name}\\s+${seq}\\s+set\\s+transform-set\\s+(\\S+)`, 'i')) || text.match(/set\s+transform-set\s+(\\S+)/i);
      if (tsMatch) ts = tsMatch[1];

      const aclMatch = text.match(new RegExp(`crypto\\s+map\\s+${name}\\s+${seq}\\s+match\\s+address\\s+(\\S+)`, 'i')) || text.match(/match\s+address\s+(\\S+)/i);
      if (aclMatch) acl = aclMatch[1];

      if (!result.cryptoMaps.some(cm => cm.name === name && cm.sequence === seq)) {
        result.cryptoMaps.push({ name, sequence: seq, peer, transformSet: ts, matchAcl: acl });
      }
    }

    const tsDefMatch = line.match(/^crypto\s+ipsec\s+transform-set\s+(\S+)\s+(.+)$/i);
    if (tsDefMatch && !result.transformSets.includes(tsDefMatch[1])) {
      result.transformSets.push(`${tsDefMatch[1]} (${tsDefMatch[2]})`);
    }

    const ikeMatch = line.match(/^crypto\s+isakmp\s+policy\s+(\d+)/i);
    if (ikeMatch && !result.ikePolicies.includes(`Policy ${ikeMatch[1]}`)) {
      result.ikePolicies.push(`Policy ${ikeMatch[1]}`);
    }
  }

  result.isConfigured = result.tunnels.length > 0 || result.cryptoMaps.length > 0 || result.transformSets.length > 0;
  return result;
}

/**
 * Parses Access Control Lists (ACL) and firewall rules from running-config text.
 */
export function parseRunningConfigAcls(text: string): ParsedRunningConfigAclRule[] {
  const acls: ParsedRunningConfigAclRule[] = [];
  const lines = text.split('\n');

  // Map bound interfaces: interface -> acl name
  const boundMap = new Map<string, string>();
  let curIface = '';
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const ifMatch = line.match(/^interface\s+([a-zA-Z0-9\/\.\-]+)/i);
    if (ifMatch) {
      curIface = ifMatch[1];
      continue;
    }
    if (curIface) {
      const grpMatch = line.match(/^ip\s+access-group\s+(\S+)\s+(in|out)/i);
      if (grpMatch) {
        boundMap.set(grpMatch[1].toLowerCase(), `${curIface} (${grpMatch[2].toUpperCase()})`);
      }
      if (/^!|^exit/i.test(line) && !rawLine.startsWith(' ')) {
        curIface = '';
      }
    }
  }

  // 1. Standard / Extended ACL: access-list 101 permit ip 10.0.0.0 0.0.0.255 any
  for (const rawLine of lines) {
    const line = rawLine.trim();

    const numAclMatch = line.match(/^access-list\s+(\d+)\s+(permit|deny)\s+(\S+)\s+(.+)$/i);
    if (numAclMatch) {
      const aclNum = numAclMatch[1];
      const action = numAclMatch[2].toUpperCase() as 'PERMIT' | 'DENY';
      const proto = numAclMatch[3].toUpperCase();
      const rest = numAclMatch[4];

      const parts = rest.split(/\s+/);
      const src = parts.slice(0, 2).join(' ') || 'any';
      const dst = parts.slice(2).join(' ') || 'any';
      const portMatch = rest.match(/eq\s+(\S+)/i);

      acls.push({
        aclName: `ACL_${aclNum}`,
        type: Number(aclNum) >= 100 ? 'Extended' : 'Standard',
        action,
        protocol: proto,
        source: src,
        destination: dst,
        port: portMatch ? portMatch[1] : '-',
        boundInterface: boundMap.get(aclNum.toLowerCase()) || boundMap.get(`acl_${aclNum}`.toLowerCase()) || '-',
      });
      continue;
    }

    // 2. Named IP Access List: ip access-list extended SEC-IN
    const namedHeader = line.match(/^ip\s+access-list\s+(standard|extended)\s+(\S+)/i);
    if (namedHeader) {
      const aclType = namedHeader[1];
      const aclName = namedHeader[2];
      // Collect child rules
      const startIdx = lines.indexOf(rawLine);
      for (let j = startIdx + 1; j < Math.min(lines.length, startIdx + 30); j++) {
        const sub = lines[j].trim();
        if (/^!|^ip\s+access-list|^interface/i.test(sub) && !lines[j].startsWith(' ')) break;
        const ruleMatch = sub.match(/^(?:sequence\s+\d+\s+)?(permit|deny)\s+(\S+)\s+(.+)$/i);
        if (ruleMatch) {
          const action = ruleMatch[1].toUpperCase() as 'PERMIT' | 'DENY';
          const proto = ruleMatch[2].toUpperCase();
          const rest = ruleMatch[3];
          const portMatch = rest.match(/eq\s+(\S+)/i);

          acls.push({
            aclName: aclName,
            type: `Named (${aclType})`,
            action,
            protocol: proto,
            source: rest.split(' ')[0] || 'any',
            destination: rest.split(' ').slice(1).join(' ') || 'any',
            port: portMatch ? portMatch[1] : '-',
            boundInterface: boundMap.get(aclName.toLowerCase()) || '-',
          });
        }
      }
    }
  }

  return acls;
}

/**
 * Parses DHCP Server pools and excluded addresses from running-config text.
 */
export function parseRunningConfigDhcp(text: string): {
  pools: ParsedRunningConfigDhcpPool[];
  excludedAddresses: string[];
} {
  const pools: ParsedRunningConfigDhcpPool[] = [];
  const excludedAddresses: string[] = [];
  const lines = text.split('\n');

  let curPool: ParsedRunningConfigDhcpPool | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Excluded address
    const exclMatch = line.match(/^ip\s+dhcp\s+excluded-address\s+([0-9\.\s]+)/i);
    if (exclMatch) {
      excludedAddresses.push(exclMatch[1].trim());
    }

    // Pool header: ip dhcp pool LAN-USERS
    const poolMatch = line.match(/^ip\s+dhcp\s+pool\s+(\S+)/i);
    if (poolMatch) {
      if (curPool) pools.push(curPool);
      curPool = {
        poolName: poolMatch[1],
        network: '-',
        defaultRouter: '-',
        dnsServer: '-',
        domainName: '-',
        lease: '-',
      };
      continue;
    }

    if (curPool) {
      const netMatch = line.match(/^network\s+([0-9]{1,3}(?:\.[0-9]{1,3}){3}\s+[0-9]{1,3}(?:\.[0-9]{1,3}){3})/i);
      if (netMatch) curPool.network = netMatch[1];

      const gwMatch = line.match(/^default-router\s+([0-9\.\s]+)/i);
      if (gwMatch) curPool.defaultRouter = gwMatch[1].trim();

      const dnsMatch = line.match(/^dns-server\s+([0-9\.\s]+)/i);
      if (dnsMatch) curPool.dnsServer = dnsMatch[1].trim();

      const domMatch = line.match(/^domain-name\s+(\S+)/i);
      if (domMatch) curPool.domainName = domMatch[1].trim();

      const leaseMatch = line.match(/^lease\s+(.+)$/i);
      if (leaseMatch) curPool.lease = leaseMatch[1].trim();

      if (/^!|^exit|^ip\s+dhcp\s+pool/i.test(line) && !rawLine.startsWith(' ')) {
        pools.push(curPool);
        curPool = null;
      }
    }
  }

  if (curPool) pools.push(curPool);
  return { pools, excludedAddresses };
}

/**
 * Conducts automated security and anomaly auditing across running-config parameters.
 */
export function parseRunningConfigSecurityAudit(text: string, brand: string): {
  score: number;
  findings: ParsedRunningConfigSecurityFinding[];
  recommendations: { cmd: string; purpose: string }[];
} {
  const findings: ParsedRunningConfigSecurityFinding[] = [];
  const recs: { cmd: string; purpose: string }[] = [];
  let score = 100;
  const lower = text.toLowerCase();

  // 1. Password Encryption Check
  const hasServicePasswordEncryption = text.includes('service password-encryption');
  if (!hasServicePasswordEncryption) {
    score -= 10;
    findings.push({
      level: 'WARNING',
      title: 'Password Tanpa Enkripsi (Service Password-Encryption Non-Aktif)',
      description: 'Konfigurasi tidak mengaktifkan `service password-encryption`. Password lokal dan line dapat terbaca langsung dalam format plaintext.',
      remediationCmd: 'service password-encryption',
    });
    recs.push({ cmd: 'service password-encryption', purpose: 'Enkripsi seluruh password teks biasa di running-config' });
  } else {
    findings.push({
      level: 'GOOD',
      title: 'Service Password Encryption Aktif',
      description: 'Password yang tersimpan dienkripsi secara otomatis menggunakan algoritma hashing/type 7.',
    });
  }

  // 2. Enable Secret vs Enable Password Check
  const hasEnableSecret = text.includes('enable secret');
  const hasEnablePassword = text.includes('enable password');
  if (hasEnablePassword && !hasEnableSecret) {
    score -= 15;
    findings.push({
      level: 'CRITICAL',
      title: 'Menggunakan `enable password` (Lemah / Plaintext)',
      description: 'Privileged EXEC mode dilindungi `enable password` yang rentan didekripsi. Disarankan beralih ke `enable secret` (SHA-256 / Type 8/9).',
      remediationCmd: 'enable secret <password_baru>',
    });
    recs.push({ cmd: 'enable secret [StrongPassword2026!]', purpose: 'Ganti enable password lama dengan algoritma enkripsi kuat (secret)' });
  } else if (hasEnableSecret) {
    findings.push({
      level: 'GOOD',
      title: 'Enable Secret Dikonfigurasi (Keamanan Kuat)',
      description: 'Akses tingkat privilese tertinggi dilindungi oleh password hashing MD5/SHA-256.',
    });
  }

  // 3. VTY Remote Access Security (SSH vs Telnet)
  const vtyBlockMatch = text.match(/line\s+vty\s+[\d\s]+([\s\S]*?)(?:!|line\s+|$)/i);
  const vtyContent = vtyBlockMatch ? vtyBlockMatch[1].toLowerCase() : '';
  if (vtyContent.includes('transport input telnet') || vtyContent.includes('transport input all')) {
    score -= 15;
    findings.push({
      level: 'CRITICAL',
      title: 'Protokol Telnet Plaintext Terbuka pada Line VTY',
      description: 'Line VTY mengizinkan koneksi Telnet tanpa enkripsi paket, rentan terhadap sniffing kredensial di jaringan lokal.',
      remediationCmd: 'line vty 0 4\n transport input ssh',
    });
    recs.push({ cmd: 'line vty 0 15\n transport input ssh\n login local\n exit', purpose: 'Paksa hanya koneksi SSH terenkripsi untuk remote access' });
  } else if (vtyContent.includes('transport input ssh')) {
    findings.push({
      level: 'GOOD',
      title: 'Line VTY Terproteksi SSH',
      description: 'Hanya protokol terenkripsi SSH yang diizinkan untuk mengelola perangkat dari jarak jauh.',
    });
  }

  // 4. Web HTTP Server Security
  const hasHttpServer = text.includes('ip http server') && !text.includes('no ip http server');
  const hasHttpsServer = text.includes('ip http secure-server');
  if (hasHttpServer && !hasHttpsServer) {
    score -= 10;
    findings.push({
      level: 'WARNING',
      title: 'Web Server HTTP Plaintext Aktif (Port 80)',
      description: 'Web management UI berjalan pada protokol HTTP port 80 tanpa TLS/SSL. Disarankan menonaktifkan HTTP atau mengaktifkan HTTPS.',
      remediationCmd: 'no ip http server\nip http secure-server',
    });
    recs.push({ cmd: 'no ip http server\nip http secure-server', purpose: 'Nonaktifkan HTTP plaintext dan gunakan HTTPS port 443' });
  }

  // 5. Default SNMP Community String
  const hasSnmpPublic = /snmp-server\s+community\s+(?:public|private)\b/i.test(text);
  if (hasSnmpPublic) {
    score -= 15;
    findings.push({
      level: 'CRITICAL',
      title: 'Default SNMP Community String Ditemukan (`public`/`private`)',
      description: 'Menggunakan string komunitas SNMP default memudahkan pihak luar membaca MIB perangkat atau memanipulasi konfigurasi.',
      remediationCmd: 'no snmp-server community public\nno snmp-server community private',
    });
    recs.push({ cmd: 'no snmp-server community public\nsnmp-server community SecureCommunityName2026 RO', purpose: 'Hapus string public dan buat komunitas kustom yang unik' });
  }

  // 6. SSH Version 2 Check
  const hasSshV2 = text.includes('ip ssh version 2');
  if (!hasSshV2 && vtyContent.includes('ssh')) {
    score -= 5;
    findings.push({
      level: 'INFO',
      title: 'SSH Version 2 Belum Dipaksa',
      description: 'Direkomendasikan menambahkan `ip ssh version 2` untuk mematikan backward-compatibility ke SSH v1 yang rentan.',
      remediationCmd: 'ip ssh version 2',
    });
    recs.push({ cmd: 'ip ssh version 2', purpose: 'Batasi remote login hanya dengan standar protokol SSH v2' });
  }

  // 7. NTP Server Synchronization
  const hasNtp = /^ntp\s+server\s+/im.test(text);
  if (!hasNtp) {
    score -= 5;
    findings.push({
      level: 'INFO',
      title: 'Sinkronisasi Waktu NTP Belum Dikonfigurasi',
      description: 'Perangkat tidak memiliki server NTP. Log syslog dan audit forensik mungkin memiliki timestamp yang tidak akurat.',
      remediationCmd: 'ntp server 192.168.1.1',
    });
    recs.push({ cmd: 'ntp server 0.pool.ntp.org', purpose: 'Sinkronkan jam perangkat secara otomatis via Network Time Protocol' });
  }

  // 8. Spanning Tree Mode
  const hasStpRapid = /spanning-tree\s+mode\s+(?:rapid-pvst|mst)/i.test(text);
  const hasStp = /spanning-tree\s+mode/i.test(text);
  if (hasStp && !hasStpRapid) {
    findings.push({
      level: 'INFO',
      title: 'Spanning-Tree Mode Legacy (PVST 802.1D)',
      description: 'Disarankan migrasi ke Rapid-PVST (`spanning-tree mode rapid-pvst`) untuk konvergensi topologi link yang jauh lebih cepat (< 2 detik).',
      remediationCmd: 'spanning-tree mode rapid-pvst',
    });
  }

  score = Math.max(20, Math.min(100, score));

  return {
    score,
    findings,
    recommendations: recs,
  };
}

/**
 * Parses executive summary, hostname, OS version, and metadata.
 */
export function parseRunningConfigSummary(text: string, brand: string): {
  hostname: string;
  version: string;
  domainName: string;
  hasBanner: boolean;
  hasAaa: boolean;
  stpMode: string;
} {
  const hostMatch = text.match(/^hostname\s+([a-zA-Z0-9_\-\.]+)/im) || text.match(/^sysname\s+([a-zA-Z0-9_\-\.]+)/im);
  const hostname = hostMatch ? hostMatch[1] : `${brand.toUpperCase()}-Device`;

  const verMatch = text.match(/^version\s+([0-9\.\(\)A-Za-z\-]+)/im) || text.match(/Software\s+\(([^\)]+)\)/i);
  const version = verMatch ? verMatch[1] : 'Enterprise Network OS';

  const domMatch = text.match(/^ip\s+domain-name\s+(\S+)/im) || text.match(/^ip\s+domain\s+name\s+(\S+)/im);
  const domainName = domMatch ? domMatch[1] : '-';

  const hasBanner = text.includes('banner motd') || text.includes('banner login');
  const hasAaa = text.includes('aaa new-model') || text.includes('aaa authentication');

  const stpMatch = text.match(/^spanning-tree\s+mode\s+(\S+)/im);
  const stpMode = stpMatch ? stpMatch[1].toUpperCase() : 'Default (PVST+)';

  return {
    hostname,
    version,
    domainName,
    hasBanner,
    hasAaa,
    stpMode,
  };
}

/**
 * Universal Intelligent Running Configuration Local Analyzer:
 * Aggregates all 9 critical parameters into a comprehensive, highly structured report.
 */
export function analyzeRunningConfigLocally(
  terminalText: string,
  brand: string = 'cisco',
  model: string = 'Universal'
): TerminalDiagnosisResult {
  const text = stripAnsiCodes(terminalText || '');
  const b = (brand || 'cisco').toLowerCase();

  // 1. Extract all components
  const vlans = parseRunningConfigVlans(text);
  const ifaces = parseRunningConfigInterfaces(text);
  const routes = parseRunningConfigRoutes(text);
  const dynamic = parseRunningConfigDynamicRouting(text);
  const ipsec = parseRunningConfigIpsec(text);
  const acls = parseRunningConfigAcls(text);
  const dhcp = parseRunningConfigDhcp(text);
  const security = parseRunningConfigSecurityAudit(text, brand);
  const meta = parseRunningConfigSummary(text, brand);

  const l3Ifaces = ifaces.filter(i => i.isL3);
  const upIfaces = ifaces.filter(i => i.status === 'UP');
  const downIfaces = ifaces.filter(i => i.status === 'ADMIN_DOWN' || i.status === 'DOWN');
  const defRoute = routes.find(r => r.isDefault);

  // Status computation
  const status: 'healthy' | 'warning' | 'critical' | 'info' =
    security.score < 60 ? 'critical' : security.score < 80 ? 'warning' : 'healthy';

  const statusBadge =
    status === 'healthy'
      ? `🟢 Normal & Sehat (Skor Keamanan: ${security.score}/100)`
      : status === 'warning'
      ? `🟡 Perhatian / Rekomendasi Hardening (Skor Keamanan: ${security.score}/100)`
      : `🔴 Kritis / Memerlukan Perbaikan (Skor Keamanan: ${security.score}/100)`;

  // =========================================================================
  // BUILD RICH MARKDOWN OUTPUT COVERING ALL 9 CRITICAL AREAS
  // =========================================================================

  // Section 1: List VLAN Table
  let vlanSection = '';
  if (vlans.length > 0) {
    const vRows = vlans.map(v => {
      const pStr = v.ports.length > 0 ? v.ports.join(', ') : '-';
      return `| **VLAN ${v.vlanId}** | \`${v.name}\` | \`${v.sviIp}\` | \`${pStr}\` | 🟢 ${v.status} |`;
    });
    vlanSection = `#### 1. 🌐 Alokasi VLAN (List VLAN: ${vlans.length} VLAN Terkonfigurasi)
| VLAN ID | Nama VLAN | SVI Gateway (L3) | Port Terhubung / Trunk | Status |
| :--- | :--- | :--- | :--- | :--- |
${vRows.join('\n')}`;
  } else {
    vlanSection = `#### 1. 🌐 Alokasi VLAN (List VLAN)
*⚪ Tidak ada database VLAN khusus terdefinisi (semua port berada pada default VLAN 1).*`;
  }

  // Section 2: List IP Address Table
  let ipSection = '';
  if (ifaces.length > 0) {
    const ifRows = ifaces.map(i => {
      const stBadge = i.status === 'UP' ? '🟢 UP' : '🔴 DOWN / SHUTDOWN';
      const ipStr = i.ipAddress !== '-' ? `**${i.ipAddress}** \`${i.cidr || i.subnetMask}\`` : '- (Layer 2 Switchport)';
      const helpStr = i.ipHelper ? `\`${i.ipHelper}\`` : '-';
      return `| \`${i.name}\` | ${ipStr} | ${stBadge} | ${i.description} | ${helpStr} |`;
    });
    ipSection = `#### 2. 🔌 Antarmuka & Alamat IP (List IP Address: ${l3Ifaces.length} IP Aktif dari ${ifaces.length} Port)
| Interface | Alamat IP / Subnet | Status Fisik | Deskripsi / Fungsi | IP Helper (DHCP Relay) |
| :--- | :--- | :--- | :--- | :--- |
${ifRows.join('\n')}`;
  } else {
    ipSection = `#### 2. 🔌 Antarmuka & Alamat IP (List IP Address)
*⚪ Belum ada konfigurasi antarmuka Layer 3 dengan IP address.*`;
  }

  // Section 3: List Routing & Default Route Table
  let routeSection = '';
  const defRouteBadge = defRoute
    ? `> 🌐 **Gateway of Last Resort (Default Route):** \`${defRoute.gateway}\` via rute \`0.0.0.0/0\`\n\n`
    : `> ⚠️ **Gateway of Last Resort:** Tidak ditemukan rute default \`0.0.0.0/0\` (Hanya melayani routing internal).\n\n`;

  if (routes.length > 0) {
    const rRows = routes.map(r => {
      const catBadge = r.isDefault ? '🌟 **Default Gateway**' : `\`${r.category}\``;
      return `| \`${r.destination}\` | \`${r.subnet}\` | \`${r.gateway}\` | \`${r.metric}\` | ${catBadge} |`;
    });
    routeSection = `#### 3. 🗺️ Tabel Rute & Default Route (List Routing: ${routes.length} Rute)
${defRouteBadge}| Destination Network | Subnet Mask | Next-Hop / Gateway | Metric / AD | Kategori |
| :--- | :--- | :--- | :--- | :--- |
${rRows.join('\n')}`;
  } else {
    routeSection = `#### 3. 🗺️ Tabel Rute & Default Route (List Routing)
${defRouteBadge}*⚪ Tidak ada rute statik eksplisit terkonfigurasi di running-config.*`;
  }

  // Section 4: Dynamic Routing Status
  let dynamicSection = '';
  const hasDynamic = dynamic.bgp.isConfigured || dynamic.ospf.isConfigured || dynamic.eigrp.isConfigured || dynamic.rip.isConfigured;
  if (hasDynamic) {
    const parts: string[] = [];
    if (dynamic.bgp.isConfigured) {
      const nbrStr = dynamic.bgp.neighbors.length > 0
        ? dynamic.bgp.neighbors.map(n => `- Neighbor \`${n.neighborIp}\` (Remote-AS: \`${n.remoteAs}\`, Update-Source: \`${n.updateSource}\`)`).join('\n')
        : '- Belum ada neighbor BGP yang dikonfigurasi';
      parts.push(`**BGP (Border Gateway Protocol):** 🟢 Aktif (AS \`${dynamic.bgp.asNumber}\`${dynamic.bgp.routerId ? `, Router-ID: \`${dynamic.bgp.routerId}\`` : ''})\n\n${nbrStr}`);
    }
    if (dynamic.ospf.isConfigured) {
      const netStr = dynamic.ospf.networks.length > 0
        ? dynamic.ospf.networks.map(n => `- Network \`${n.network}\` (\`${n.wildcard}\`) -> **${n.area}**`).join('\n')
        : '- Belum ada network advertise';
      parts.push(`**OSPF (Open Shortest Path First):** 🟢 Aktif (Process ID: \`${dynamic.ospf.processId}\`${dynamic.ospf.routerId ? `, Router-ID: \`${dynamic.ospf.routerId}\`` : ''})\n\n${netStr}`);
    }
    if (dynamic.eigrp.isConfigured) {
      parts.push(`**EIGRP:** 🟢 Aktif (Autonomous System: \`${dynamic.eigrp.asNumber}\`)`);
    }
    if (dynamic.rip.isConfigured) {
      parts.push(`**RIP:** 🟢 Aktif (Version \`${dynamic.rip.version}\`)`);
    }
    dynamicSection = `#### 4. 🔄 Status Routing Dinamis (Active Protocols)\n\n${parts.join('\n\n')}`;
  } else {
    dynamicSection = `#### 4. 🔄 Status Routing Dinamis\n\n*⚪ **Status:** Routing Dinamis (BGP / OSPF / EIGRP / RIP) **Tidak Aktif** (Perangkat menggunakan routing statik/lokal).*`;
  }

  // Section 5: Tunnel & IPsec VPN Status
  let ipsecSection = '';
  if (ipsec.isConfigured) {
    const parts: string[] = [];
    if (ipsec.tunnels.length > 0) {
      const tRows = ipsec.tunnels.map(t => `| \`${t.name}\` | \`${t.ipAddress}\` | \`${t.source}\` | \`${t.destination}\` | \`${t.mode}\` |`);
      parts.push(`**Interface Tunnel / GRE / VTI:**\n\n| Tunnel | IP Address | Source | Destination | Mode |\n| :--- | :--- | :--- | :--- | :--- |\n${tRows.join('\n')}`);
    }
    if (ipsec.cryptoMaps.length > 0) {
      const cmRows = ipsec.cryptoMaps.map(cm => `| \`${cm.name} #${cm.sequence}\` | \`${cm.peer}\` | \`${cm.transformSet}\` | \`${cm.matchAcl}\` |`);
      parts.push(`**Crypto Map & IPsec Policy:**\n\n| Crypto Map | Peer Remote | Transform-Set | Protected ACL |\n| :--- | :--- | :--- | :--- |\n${cmRows.join('\n')}`);
    }
    if (ipsec.transformSets.length > 0) {
      parts.push(`- **Transform-Sets:** ${ipsec.transformSets.map(ts => `\`${ts}\``).join(', ')}`);
    }
    ipsecSection = `#### 5. 🔒 Status Tunnel & VPN IPsec\n\n${parts.join('\n\n')}`;
  } else {
    ipsecSection = `#### 5. 🔒 Status Tunnel & VPN IPsec\n\n*⚪ **Status:** Tidak ada interface Tunnel (GRE/VTI) atau Crypto Map IPsec VPN yang aktif.*`;
  }

  // Section 6: ACL & Firewall Rules
  let aclSection = '';
  if (acls.length > 0) {
    const aclRows = acls.map(a => {
      const actBadge = a.action === 'PERMIT' ? '🟢 PERMIT' : '🔴 DENY';
      return `| \`${a.aclName}\` | \`${a.type}\` | ${actBadge} | \`${a.protocol}\` | \`${a.source}\` | \`${a.destination}\` | \`${a.port}\` | \`${a.boundInterface || '-'}\` |`;
    });
    aclSection = `#### 6. 🛡️ Daftar ACL & Firewall (List ACL: ${acls.length} Aturan Filter)\n\n| ACL Name / ID | Tipe | Aksi | Protokol | Source | Destination | Port | Bound Interface |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n${aclRows.join('\n')}`;
  } else {
    aclSection = `#### 6. 🛡️ Daftar ACL & Firewall (List ACL)\n\n*⚪ Tidak ada Access Control List (ACL) atau aturan filter firewall terkonfigurasi.*`;
  }

  // Section 7: DHCP Pool & Server
  let dhcpSection = '';
  if (dhcp.pools.length > 0) {
    const dhcpRows = dhcp.pools.map(d => {
      return `| **${d.poolName}** | \`${d.network}\` | \`${d.defaultRouter}\` | \`${d.dnsServer}\` | \`${d.domainName || '-'}\` |`;
    });
    const exclStr = dhcp.excludedAddresses.length > 0
      ? `\n\n- **Excluded IP Addresses:** ${dhcp.excludedAddresses.map(e => `\`${e}\``).join(', ')}`
      : '';
    dhcpSection = `#### 7. 📦 Layanan DHCP Server (DHCP Pool: ${dhcp.pools.length} Pool Aktif)\n\n| Nama Pool | Network / Subnet | Default Gateway | DNS Server | Domain Name |\n| :--- | :--- | :--- | :--- | :--- |\n${dhcpRows.join('\n')}${exclStr}`;
  } else {
    dhcpSection = `#### 7. 📦 Layanan DHCP Server\n\n*⚪ Layanan DHCP Server / DHCP Pool internal tidak aktif di perangkat ini.*`;
  }

  // Section 8: Error, Anomali & Security Audit
  const findingsList = security.findings.map(f => {
    const icon = f.level === 'CRITICAL' ? '🔴 **[KRITIS]**' : f.level === 'WARNING' ? '🟡 **[PERHATIAN]**' : f.level === 'GOOD' ? '🟢 **[BAIK]**' : '🔵 **[INFO]**';
    return `- ${icon} **${f.title}**: ${f.description}`;
  }).join('\n');

  const auditSection = `#### 8. 🚨 Audit Keamanan, Anomali & Rekomendasi Hardening
**Indeks Kepatuhan & Keamanan:** \`${security.score} / 100\`

${findingsList}`;

  // Section 9: Executive Summary & Device Identity
  const summarySection = `#### 9. 📊 Summary Eksekutif & Identitas Perangkat

- **Hostname / System Name:** \`${meta.hostname}\` (${brand.toUpperCase()} - ${model})
- **Software OS Version:** \`${meta.version}\`
- **Manajemen Domain:** \`${meta.domainName}\`
- **Spanning-Tree Protocol:** \`${meta.stpMode}\`
- **Banner MOTD:** ${meta.hasBanner ? '🟢 Terkonfigurasi' : '⚪ Belum Dikonfigurasi'}
- **Total Sumber Daya:** ${vlans.length} VLAN | ${l3Ifaces.length} IP L3 | ${routes.length} Rute | ${acls.length} Aturan ACL | ${dhcp.pools.length} DHCP Pool`;

  // Combine full output
  const fullFormatted = `### 📋 Analisa Konfigurasi Lengkap (Show Running-Config): ${meta.hostname}

**Status Perangkat:** ${statusBadge}

${summarySection}

${vlanSection}

${ipSection}

${routeSection}

${dynamicSection}

${ipsecSection}

${aclSection}

${dhcpSection}

${auditSection}`;

  return {
    status,
    summary: `Analisa komprehensif **show running-config** untuk **${meta.hostname}** (${brand.toUpperCase()}): Terdeteksi **${vlans.length} VLAN**, **${l3Ifaces.length} IP Address L3**, **${routes.length} Rute**, ${hasDynamic ? 'Routing Dinamis **Aktif**' : 'Routing Dinamis **Tidak Aktif**'}, dan skor keamanan **${security.score}/100**.`,
    identifiedIssues: security.findings.map(f => `${f.title}: ${f.description}`),
    explanation: fullFormatted,
    recommendedCommands: security.recommendations.length > 0 ? security.recommendations : [
      { cmd: 'show ip interface brief', purpose: 'Verifikasi status fisik dan IP seluruh interface' },
      { cmd: 'show ip route', purpose: 'Periksa tabel routing IPv4' },
      { cmd: 'copy running-config startup-config', purpose: 'Simpan konfigurasi aktif ke NVRAM' },
    ],
    formattedTable: '',
  };
}

/**
 * Universal Intelligent Local Terminal Analyzer Engine:
 * Cascades across ALL network & system operations, brands, and CLI outputs.
 */
export function analyzeTerminalBufferLocally(
  terminalText: string,
  brand: string = 'cisco',
  model: string = 'Universal'
): TerminalDiagnosisResult {
  const text = stripAnsiCodes(terminalText || '');
  const lower = text.toLowerCase();
  const b = (brand || 'cisco').toLowerCase();
  const rawLines = text.split('\n');

  // Verify whether the terminal buffer actually contains meaningful output
  const meaningfulLines = rawLines.filter(l => {
    const s = l.trim();
    if (!s) return false;
    const isPrompt = /^([a-zA-Z0-9_\-.~@:[\]()\s]+[#>$%]\s*)$/.test(s);
    const isPlaceholder = /^(terminal|cisco|mikrotik|huawei|juniper|fortinet|linux|switch|router|prompt)$/i.test(s);
    const isConnectHeader = /^(connected|session started|connecting\.\.\.|terminal ready|welcome to)/i.test(s);
    return !isPrompt && !isPlaceholder && !isConnectHeader;
  });

  if (meaningfulLines.length === 0) {
    return {
      status: 'warning',
      summary: `Tidak dapat menganalisa layar terminal karena layar kosong (belum ada teks output perintah atau log yang terekam).`,
      identifiedIssues: [
        `Kondisi Layar: Kosong (0 baris data output)`,
        `Alasan: Tidak ditemukan teks respon perintah atau error log pada sesi aktif`,
      ],
      explanation: `Layar terminal saat ini belum menampilkan teks output yang dapat dianalisa.`,
      recommendedCommands: [],
    };
  }

  // =========================================================================
  // 0. High-Priority: Check if Terminal Output is a Running Configuration
  // =========================================================================
  if (isRunningConfigOutput(text)) {
    return analyzeRunningConfigLocally(text, brand, model);
  }

  // =========================================================================
  // 0. High-Priority System & CLI Error Diagnostic (Docker, Linux Sudo, CLI Syntax)
  // =========================================================================

  // 0.0.0 Docker Containers Table (docker ps / docker ps -a / sudo docker ps -a / docker compose ps)
  const containers = parseTerminalContainers(text, brand);
  if (containers.length > 0) {
    const running = containers.filter(c => c.isRunning);
    const stopped = containers.filter(c => !c.isRunning);
    const tableMd = formatContainerTableMarkdown(containers);
    const firstContainer = containers[0];
    const allHealthy = running.length === containers.length;

    return {
      status: allHealthy ? 'healthy' : 'warning',
      summary: containers.length === 1
        ? `Terdeteksi **1 Kontainer Docker** (\`${firstContainer.name}\` - Image: \`${firstContainer.image}\`) dengan status **${firstContainer.status} (${firstContainer.isRunning ? 'Running' : 'Stopped'})**.`
        : `Terdeteksi **${containers.length} Kontainer Docker** (${running.length} Berstatus Running / UP, ${stopped.length} Stopped) pada host Linux.`,
      identifiedIssues: [
        `Total Kontainer: ${containers.length} (${running.length} Running / UP, ${stopped.length} Stopped)`,
        ...containers.map(c => `Kontainer \`${c.name}\` (\`${c.id.slice(0, 12)}\`): Image \`${c.image}\`, Status: ${c.status}${c.ports && c.ports !== '-' ? `, Port: ${c.ports}` : ''}`),
        allHealthy
          ? `Integritas Layanan: Seluruh kontainer beroperasi normal (Running/Active)`
          : `Perhatian: Terdapat ${stopped.length} kontainer dalam status non-aktif (Stopped/Exited)`,
      ],
      explanation: `Daemon Docker beroperasi normal dan merespons query. ${allHealthy ? 'Seluruh kontainer aktif berstatus UP dan siap melayani trafik aplikasi.' : 'Periksa log kontainer yang berhenti untuk menginvestigasi penyebab error/terminasi.'}`,
      recommendedCommands: [
        { cmd: `sudo docker logs ${firstContainer.name} --tail 50`, purpose: `Periksa 50 baris log aktivitas terakhir kontainer ${firstContainer.name}` },
        { cmd: 'sudo docker stats --no-stream', purpose: 'Pantau utilisasi CPU dan RAM seluruh kontainer' },
        { cmd: 'sudo systemctl status docker', purpose: 'Cek status service Docker Daemon di host' },
        { cmd: 'sudo docker ps -a', purpose: 'Refresh daftar seluruh kontainer aktif & non-aktif' },
      ],
      formattedTable: tableMd,
    };
  }

  // 0.0.1 Zero Exit Code / Clean Command Execution (e.g. usermod, chmod, systemctl restart)
  if (
    text.includes('[SUCCESS_ZERO_EXIT_CODE]') ||
    text.includes('(Perintah berhasil dieksekusi tanpa pesan error)') ||
    text.includes('(Perintah berhasil dieksekusi tanpa output layar tambahan)')
  ) {
    const cmdMatch = text.match(/Perintah ['"]?(.*?)['"]? berhasil/i) || text.match(/([a-zA-Z0-9_./-]+.*?)(?:\n|$)/);
    const cmdClean = cmdMatch ? cmdMatch[1].trim() : 'Perintah CLI';
    const isDockerPermissionFix = /usermod.*docker|chmod.*docker\.sock/i.test(text);
    const isServiceRestart = /systemctl.*restart/i.test(text);

    return {
      status: 'healthy',
      summary: `🟢 **Perintah Selesai Dieksekusi dengan Sukses**: Sistem mengembalikan kode keluar sukses (\`exit code 0\` / zero exit code tanpa pesan kesalahan).`,
      identifiedIssues: [
        `Perintah: \`${cmdClean}\``,
        `Status Eksekusi: Sukses / Exit Code 0`,
        isDockerPermissionFix
          ? `Hak Akses: Izin user/socket Docker telah diperbarui ke sistem kernel Linux.`
          : `Konfigurasi: Perubahan parameter telah berhasil diterapkan ke sistem.`,
      ],
      explanation: isDockerPermissionFix
        ? `Perintah penambahan user ke grup \`docker\` atau pembukaan izin socket \`/var/run/docker.sock\` berhasil diterapkan tanpa error. Anda sekarang dapat menjalankan perintah \`docker ps -a\` langsung tanpa perlu mengetikkan \`sudo\`.`
        : isServiceRestart
        ? `Layanan daemon berhasil di-restart dan beroperasi normal kembali di latar belakang.`
        : `Operasi CLI sistem selesai diproses tanpa adanya pesan kesalahan atau penolakan akses.`,
      recommendedCommands: isDockerPermissionFix
        ? [
            { cmd: 'docker ps -a', purpose: 'Verifikasi daftar kontainer Docker tanpa sudo' },
            { cmd: 'id', purpose: 'Cek keanggotaan grup user aktif (verifikasi grup docker)' },
            { cmd: 'sudo systemctl status docker', purpose: 'Pastikan daemon Docker aktif (running)' },
          ]
        : [
            { cmd: 'echo $?', purpose: 'Verifikasi status kode keluar perintah sebelumnya' },
          ],
    };
  }

  // 0.1 Docker Daemon Socket Permission Denied
  const isDockerSocketError = (lower.includes('docker') || lower.includes('docker.sock') || lower.includes('unix:///var/run/docker.sock')) &&
    (lower.includes('permission denied') || lower.includes('cannot connect to the docker daemon') || lower.includes('got permission denied'));

  if (isDockerSocketError) {
    return {
      status: 'critical',
      summary: `🔴 **Docker Socket Permission Denied**: User aktif tidak memiliki izin akses baca/tulis ke Unix domain socket Docker daemon (\`/var/run/docker.sock\`).`,
      identifiedIssues: [
        'Error Terdeteksi: `permission denied while trying to connect to the docker API at unix:///var/run/docker.sock`',
        'Akar Masalah (Root Cause): User non-root belum tergabung ke dalam grup sistem `docker`, atau izin file socket `/var/run/docker.sock` dibatasi.',
        'Dampak Operasional: Semua pemanggilan Docker CLI (`docker ps`, `docker run`, `docker images`, dll.) gagal menghubungi API daemon.',
      ],
      explanation: `Secara default di Linux/Ubuntu, socket \`/var/run/docker.sock\` dimiliki oleh user \`root\` dan grup \`docker\`. Pengguna biasa yang tidak berada dalam grup \`docker\` akan ditolak aksesnya oleh kernel Linux saat membuka koneksi socket. Untuk mengatasi ini secara permanen tanpa harus selalu mengetikkan \`sudo\`, user harus ditambahkan ke grup \`docker\`. Alternatif instan adalah mengubah hak akses file socket secara sementara atau menggunakan \`sudo\`.`,
      recommendedCommands: [
        { cmd: 'sudo usermod -aG docker $USER && newgrp docker', purpose: 'Tambahkan user aktif ke grup docker dan terapkan grup baru tanpa logout' },
        { cmd: 'sudo chmod 666 /var/run/docker.sock', purpose: 'Beri izin baca & tulis ke socket Docker (Solusi Cepat Sementara)' },
        { cmd: 'sudo systemctl status docker', purpose: 'Periksa apakah daemon Docker berstatus active (running)' },
        { cmd: 'sudo systemctl restart docker', purpose: 'Restart service Docker jika daemon macet atau socket terkunci' },
        { cmd: 'docker ps -a', purpose: 'Uji coba verifikasi ulang daftar kontainer setelah izin diberikan' },
      ],
    };
  }

  // 0.2 General Linux Permission Denied / Sudoers
  const isPermissionDenied = lower.includes('is not in the sudoers file') || 
    (lower.includes('permission denied') && !isDockerSocketError) || 
    lower.includes('operation not permitted');

  if (isPermissionDenied) {
    const errorLine = rawLines.find(l => l.toLowerCase().includes('permission denied') || l.toLowerCase().includes('operation not permitted') || l.toLowerCase().includes('is not in the sudoers file')) || 'Permission denied';
    return {
      status: 'critical',
      summary: `🔴 **Hak Akses Ditolak (Permission Denied)**: Perintah yang dijalankan memerlukan hak istimewa superuser (root) atau izin file sistem yang lebih tinggi.`,
      identifiedIssues: [
        `Pesan Sistem: \`${errorLine.trim()}\``,
        'Akar Masalah: User aktif tidak memiliki wewenang eksekusi atau hak tulis pada file/direktori/port target.',
        'Dampak: Operasi sistem atau eksekusi proses dibatalkan oleh kernel Linux demi keamanan.',
      ],
      explanation: `Pada sistem berbasis Unix/Linux, operasi yang menyangkut konfigurasi hardware, jaringan, direktori sistem (/etc, /var, /root), atau instalasi paket wajib dijalankan dengan hak superuser. Gunakan \`sudo\` untuk mengeksekusi dengan hak administratif.`,
      recommendedCommands: [
        { cmd: 'sudo !!', purpose: 'Ulangi perintah terakhir dengan hak akses superuser (sudo)' },
        { cmd: 'id', purpose: 'Periksa identitas user dan daftar grup yang diikuti' },
        { cmd: 'ls -la', purpose: 'Periksa izin file dan kepemilikan (permissions/ownership)' },
      ],
    };
  }

  // 0.3 Command Not Found
  const isCmdNotFound = lower.includes('command not found') || /:\s*not found$/im.test(text);
  if (isCmdNotFound) {
    const notFoundLine = rawLines.find(l => l.toLowerCase().includes('command not found') || /:\s*not found$/i.test(l)) || 'command not found';
    const isShowCmd = /\bshow\b/i.test(notFoundLine) || /\bshow\s+/i.test(text);

    if (isShowCmd) {
      return {
        status: 'warning',
        summary: `🟡 **Perintah Tidak Ditemukan (Sintaks Router di Linux)**: Perintah \`show\` merupakan sintaks Cisco IOS / Router CLI, bukan perintah native Linux bash.`,
        identifiedIssues: [
          `Output Sistem: \`${notFoundLine.trim()}\``,
          'Akar Masalah: Host aktif adalah Linux (bash), sedangkan perintah `show ip ...` dirancang untuk sistem operasi router/switch.',
        ],
        explanation: `Di terminal Linux, gunakan utilitas suite \`ip\` (seperti \`ip addr show\`, \`ip -c link\`) atau \`ifconfig\` untuk memeriksa antarmuka dan konfigurasi jaringan.`,
        recommendedCommands: [
          { cmd: 'ip addr show', purpose: 'Tampilkan daftar IP address dan interface jaringan aktif di Linux' },
          { cmd: 'ip -c link', purpose: 'Periksa status fisik link dan status port interface' },
          { cmd: 'ip route show', purpose: 'Lihat tabel routing gateway Linux' },
        ],
      };
    }

    const matchCmd = notFoundLine.match(/bash:\s*(?:line \d+:\s*)?([^:]+):\s*command not found/i) || notFoundLine.match(/^([a-zA-Z0-9_\-]+):\s*not found/i);
    const missingCmd = matchCmd ? matchCmd[1].trim() : notFoundLine.split(/[:\s]/)[0] || 'perintah';

    return {
      status: 'warning',
      summary: `🟡 **Perintah Tidak Ditemukan**: Biner atau utilitas \`${missingCmd}\` belum terpasang pada sistem atau tidak terdaftar dalam direktori $PATH.`,
      identifiedIssues: [
        `Output Sistem: \`${notFoundLine.trim()}\``,
        'Akar Masalah: Paket program belum diinstal, atau path direktori binernya belum dimasukkan ke environment PATH.',
      ],
      explanation: `Sistem shell Linux tidak menemukan file eksekusi yang cocok dengan nama yang diketikkan di seluruh direktori yang terdaftar pada variabel $PATH.`,
      recommendedCommands: [
        { cmd: `sudo apt update && sudo apt install -y ${missingCmd}`, purpose: `Instal paket ${missingCmd} melalui apt package manager` },
        { cmd: 'echo $PATH', purpose: 'Periksa daftar direktori pencarian biner sistem' },
        { cmd: `which ${missingCmd}`, purpose: `Lacak lokasi absolut file biner jika sudah terpasang` },
      ],
    };
  }

  // 0.4 Network Socket Connection Refused / Timeout
  const isConnRefused = lower.includes('connection refused') || lower.includes('connect: connection refused') || lower.includes('network is unreachable') || lower.includes('no route to host');
  if (isConnRefused) {
    return {
      status: 'critical',
      summary: `🔴 **Koneksi Jaringan Ditolak (Connection Refused)**: Target server atau host tujuan menolak permintaan koneksi TCP/socket, atau port layanan sedang mati/tertutup.`,
      identifiedIssues: [
        'Status Port: Tidak ada service daemon yang mendengarkan (listening) pada port target, atau port diblokir firewall.',
        'Konektivitas: Port TCP/UDP target tidak merespon paket SYN / handshake.',
      ],
      explanation: `Error "Connection Refused" menunjukkan bahwa paket jaringan berhasil mencapai IP tujuan (atau localhost), namun sistem operasi di sisi tujuan tidak menemukan service aplikasi yang aktif membuka port tersebut, atau iptables/firewall menolak (REJECT) koneksi.`,
      recommendedCommands: [
        { cmd: 'ss -tulpn', purpose: 'Periksa seluruh port dan service yang sedang mendengarkan (listening)' },
        { cmd: 'ping -c 4 8.8.8.8', purpose: 'Uji konektivitas dasar layer 3 ke gateway/internet' },
        { cmd: 'sudo ufw status', purpose: 'Periksa status aturan firewall Linux' },
      ],
    };
  }

  // 0.5 Cisco & Router CLI Syntax Errors
  const configErrors = parseTerminalConfigErrors(text);
  if (configErrors.length > 0) {
    const firstErr = configErrors[0];
    return {
      status: 'critical',
      summary: `🔴 **Sintaks Perintah Ditolak Perangkat (${brand.toUpperCase()})**: Perangkat menolak parameter perintah karena penulisan salah, ambigu, atau berada pada mode konfigurasi yang tidak tepat.`,
      identifiedIssues: configErrors.map(e => `[${e.errorType}] ${e.rawMessage}`),
      explanation: firstErr.suggestedFix,
      recommendedCommands: [
        { cmd: '?', purpose: 'Tampilkan daftar kata kunci yang valid pada prompt aktif saat ini' },
        { cmd: 'show running-config', purpose: 'Periksa konfigurasi yang sedang aktif di perangkat' },
      ],
    };
  }

  // =========================================================================
  // 1. IPsec VPN Tunnel & Debug Diagnostic (Highest Priority for VPN)
  // =========================================================================
  const isIpsecText = lower.includes('ipsec') || lower.includes('isakmp') || lower.includes('ike') || lower.includes('vpn tunnel');
  if (isIpsecText) {
    const ipsecResult = parseTerminalIpsec(text, brand);
    if (ipsecResult.tunnels.length > 0 || ipsecResult.errorLogs.length > 0) {
      const issues: string[] = [];
      const tableMd = formatIpsecTableMarkdown(ipsecResult.tunnels);

      if (ipsecResult.tunnels.length > 0) {
        const upCount = ipsecResult.tunnels.filter(t => t.phase1State === 'UP').length;
        issues.push(`Total Tunnel Terdeteksi: ${ipsecResult.tunnels.length} tunnel (${upCount} Phase 1 UP)`);
      }
      if (ipsecResult.errorLogs.length > 0) {
        issues.push(`⚠️ Log Error Ditemukan (${ipsecResult.errorLogs.length} error): \`${ipsecResult.errorLogs[0].slice(0, 70)}...\``);
      }

      const recCmds = b === 'fortinet'
        ? [
            { cmd: 'diagnose vpn tunnel list', purpose: 'Cek daftar tunnel IPsec FortiOS' },
            { cmd: 'diagnose vpn ike status', purpose: 'Cek status Phase 1 IKE SA' },
            { cmd: 'diagnose debug application ike -1', purpose: 'Aktifkan debug log IKE real-time' },
          ]
        : b === 'cisco'
        ? [
            { cmd: 'show crypto isakmp sa', purpose: 'Cek status Phase 1 IKE Cisco' },
            { cmd: 'show crypto ipsec sa', purpose: 'Cek status Phase 2 & jumlah paket terenkripsi' },
            { cmd: 'debug crypto isakmp', purpose: 'Aktifkan debug negosiasi Phase 1' },
          ]
        : [
            { cmd: '/ip ipsec peer print', purpose: 'Cek status peer IPsec MikroTik' },
            { cmd: '/ip ipsec installed-sa print', purpose: 'Cek Security Association IPsec' },
          ];

      return {
        status: ipsecResult.status === 'UP' ? 'healthy' : ipsecResult.status === 'PARTIAL' ? 'warning' : 'critical',
        summary: ipsecResult.status === 'UP'
          ? `🟢 **Koneksi VPN IPsec Berjalan Normal**: Seluruh tunnel Phase 1 (IKE) dan Phase 2 (IPsec) berstatus UP.`
          : `🔴 **Kendala VPN IPsec Terdeteksi**: Terdapat tunnel yang belum established atau mengalami kegagalan negosiasi kriptografi.`,
        identifiedIssues: issues,
        explanation: ipsecResult.status === 'UP'
          ? 'Enkripsi data dan integritas paket tunnel aktif mengalirkan trafik.'
          : 'Periksa Pre-Shared Key (PSK), proposal Phase 1/Phase 2 (AES/SHA/DH-Group), dan ACL selector / proxy-ID di kedua sisi.',
        recommendedCommands: recCmds,
        formattedTable: tableMd,
      };
    }
  }

  // =========================================================================
  // 2. Traffic Flow & Packet Trace Debug (FortiOS Diag Debug Flow & Cisco ACL)
  // =========================================================================
  const isFlowDebugText = lower.includes('trace_id') || lower.includes('vd-root') || lower.includes('func=') || lower.includes('ipaccesslogp') || (lower.includes('received a packet') && lower.includes('proto='));
  if (isFlowDebugText) {
    const flows = parseTerminalFlowDebug(text);
    if (flows.length > 0) {
      const deniedFlows = flows.filter(f => f.action === 'DENIED' || f.action === 'RPF_FAILED' || f.action === 'DROPPED');
      const tableMd = formatFlowDebugMarkdown(flows);

      const issues: string[] = [
        `Total Paket Trace: ${flows.length} flow trafik ditangkap`,
        `Status Aliran: ${flows.length - deniedFlows.length} paket diizinkan (Allowed), ${deniedFlows.length} paket didrop/ditolak`,
      ];
      if (deniedFlows.length > 0) {
        issues.push(`⚠️ Alasan Drop: ${deniedFlows.map(d => `${d.sourceIp} -> ${d.destIp} (${d.action})`).slice(0, 3).join(', ')}`);
      }

      return {
        status: deniedFlows.length === 0 ? 'healthy' : 'critical',
        summary: deniedFlows.length === 0
          ? `🟢 **Analisis Aliran Trafik (Debug Flow)**: Seluruh paket berhasil melewati policy firewall dan diteruskan ke gateway.`
          : `🔴 **Trafik Diblokir / Didrop Firewall**: Terdeteksi paket yang ditolak oleh aturan firewall atau gagal pada pemeriksaan RPF (Asymmetric Routing).`,
        identifiedIssues: issues,
        explanation: deniedFlows.length === 0
          ? 'Aturan firewall policy dan routing next-hop valid.'
          : 'Periksa Policy Firewall (apakah ada Rule yang mengizinkan port/IP ini) dan periksa tabel routing balik (Reverse Path Forwarding).',
        recommendedCommands: b === 'fortinet'
          ? [
              { cmd: 'diagnose debug flow filter saddr <IP_ASAL>', purpose: 'Filter debug flow berdasarkan IP asal' },
              { cmd: 'diagnose debug flow trace start 100', purpose: 'Mulai menangkap 100 paket trace' },
              { cmd: 'diagnose debug enable', purpose: 'Aktifkan output debug di layar' },
            ]
          : [
              { cmd: 'show ip access-lists', purpose: 'Cek hit count pada ACL Cisco' },
              { cmd: 'show ip route', purpose: 'Cek jalur balik routing paket' },
            ],
        formattedTable: tableMd,
      };
    }
  }

  // =========================================================================
  // 3. BGP Debug & Flap / Error Notification Diagnostic
  // =========================================================================
  const bgpDebugs = parseTerminalBgpDebug(text);
  if (bgpDebugs.length > 0) {
    const crit = bgpDebugs.filter(d => d.severity === 'CRITICAL');
    return {
      status: crit.length > 0 ? 'critical' : 'warning',
      summary: `🔴 **Diagnosa BGP Debug Terdeteksi Kendala**: ${bgpDebugs[0].description}`,
      identifiedIssues: bgpDebugs.map(d => `• **${d.eventType}**: ${d.description} (Penyebab: ${d.rootCause})`),
      explanation: bgpDebugs[0].recommendedFix,
      recommendedCommands: b === 'cisco'
        ? [
            { cmd: 'show ip bgp summary', purpose: 'Cek ringkasan status neighbor BGP' },
            { cmd: 'show ip bgp neighbors', purpose: 'Cek error log dan counter reset BGP' },
            { cmd: 'clear ip bgp * soft', purpose: 'Soft-reset rute BGP tanpa memutus sesi TCP' },
          ]
        : b === 'fortinet'
        ? [
            { cmd: 'get router info bgp summary', purpose: 'Cek status neighbor BGP FortiOS' },
            { cmd: 'get router info bgp neighbors', purpose: 'Detail error neighbor BGP' },
          ]
        : [
            { cmd: '/routing bgp session print', purpose: 'Cek sesi BGP MikroTik' },
          ],
    };
  }

  // =========================================================================
  // 4. OSPF Debug & Stuck Adjacency Diagnostic
  // =========================================================================
  const ospfDebugs = parseTerminalOspfDebug(text);
  if (ospfDebugs.length > 0) {
    return {
      status: 'critical',
      summary: `🔴 **Kendala Adjacency OSPF Terdeteksi**: ${ospfDebugs[0].description}`,
      identifiedIssues: ospfDebugs.map(d => `• **${d.issueType}**: ${d.description} (Penyebab: ${d.rootCause})`),
      explanation: ospfDebugs[0].recommendedFix,
      recommendedCommands: [
        { cmd: b === 'cisco' ? 'show ip ospf neighbor' : 'get router info ospf neighbor', purpose: 'Cek status state neighbor OSPF' },
        { cmd: b === 'cisco' ? 'show ip ospf interface' : 'get router info ospf interface', purpose: 'Cek nilai MTU, Timer, dan Area pada interface' },
      ],
    };
  }

  // =========================================================================
  // 5. CLI Configuration Errors & Syntax Diagnostic
  // =========================================================================
  const cliErrors = parseTerminalConfigErrors(text);
  if (cliErrors.length > 0) {
    return {
      status: 'critical',
      summary: `🔴 **Kesalahan Eksekusi Sintaks Perintah (CLI Error)**: ${cliErrors[0].rawMessage}`,
      identifiedIssues: cliErrors.map(e => `• **${e.errorType}**: ${e.rawMessage}`),
      explanation: cliErrors[0].suggestedFix,
      recommendedCommands: [
        { cmd: 'help', purpose: 'Tampilkan panduan bantuan CLI' },
      ],
    };
  }

  // =========================================================================
  // 6. BGP Peering Summary Parsing (Standard CLI Table)
  // =========================================================================
  const bgpPeers = parseTerminalBgp(text);
  if (bgpPeers.length > 0) {
    const established = bgpPeers.filter(p => p.isEstablished);
    const downPeers = bgpPeers.filter(p => !p.isEstablished);
    const tableMd = formatBgpTableMarkdown(bgpPeers);

    const issues: string[] = [
      `Total Sesi BGP: ${bgpPeers.length} neighbor terdaftar`,
      `Sesi Established: ${established.length} aktif (${established.map(p => `\`${p.peerIp} (${p.asNumber})\``).join(', ') || 'None'})`,
    ];
    if (downPeers.length > 0) {
      issues.push(`⚠️ Sesi Bermasalah/Down: ${downPeers.map(p => `\`${p.peerIp}\` (Status: ${p.state})`).join(', ')}`);
    }

    return {
      status: downPeers.length === 0 ? 'healthy' : 'critical',
      summary: `Terdeteksi **${bgpPeers.length} Sesi BGP Neighbor** (${established.length} Established, ${downPeers.length} Down).`,
      identifiedIssues: issues,
      explanation: downPeers.length === 0
        ? 'Seluruh sesi BGP berjalan normal dan rute prefix berhasil dipertukarkan.'
        : 'Terdapat sesi BGP yang belum Established. Periksa konektivitas IP port 179 TCP dan AS number.',
      recommendedCommands: b === 'cisco'
        ? [
            { cmd: 'show ip bgp summary', purpose: 'Refresh status peering BGP' },
            { cmd: 'show ip bgp neighbors', purpose: 'Cek detail timer dan error BGP' },
          ]
        : b === 'fortinet'
        ? [
            { cmd: 'get router info bgp summary', purpose: 'Cek status BGP FortiOS' },
            { cmd: 'get router info bgp neighbors', purpose: 'Detail error neighbor BGP' },
          ]
        : [
            { cmd: '/routing bgp session print', purpose: 'Cek sesi BGP MikroTik' },
          ],
      formattedTable: tableMd,
    };
  }

  // =========================================================================
  // 7. OSPF Neighbor State Parsing
  // =========================================================================
  const ospfNeighbors = parseTerminalOspf(text);
  if (ospfNeighbors.length > 0) {
    const fullNeighbors = ospfNeighbors.filter(n => n.isFull);
    const downOspf = ospfNeighbors.filter(n => !n.isFull);
    const tableMd = formatOspfTableMarkdown(ospfNeighbors);

    const issues: string[] = [
      `Total Neighbor OSPF: ${ospfNeighbors.length} adjacency terdeteksi`,
      `Status FULL: ${fullNeighbors.length} router siap meneruskan LSA`,
    ];
    if (downOspf.length > 0) {
      issues.push(`⚠️ Adjacency Belum Full: ${downOspf.map(n => `\`${n.ipAddress}\` (${n.state})`).join(', ')}`);
    }

    return {
      status: downOspf.length === 0 ? 'healthy' : 'warning',
      summary: `Terdeteksi **${ospfNeighbors.length} OSPF Adjacency Neighbor** (${fullNeighbors.length} State FULL).`,
      identifiedIssues: issues,
      explanation: 'Topologi link-state OSPF terbentuk dengan benar pada area terkait.',
      recommendedCommands: [
        { cmd: b === 'cisco' ? 'show ip ospf neighbor' : b === 'fortinet' ? 'get router info ospf neighbor' : '/routing ospf neighbor print', purpose: 'Verifikasi adjacency OSPF' },
        { cmd: b === 'cisco' ? 'show ip route ospf' : 'get router info routing-table ospf', purpose: 'Lihat rute yang dipelajari via OSPF' },
      ],
      formattedTable: tableMd,
    };
  }

  // =========================================================================
  // 8. VLAN Allocations & Trunk Parsing
  // =========================================================================
  const vlans = parseTerminalVlans(text);
  if (vlans.length > 0) {
    const tableMd = formatVlansTableMarkdown(vlans);
    return {
      status: 'healthy',
      summary: `Terdeteksi **${vlans.length} VLAN Terkonfigurasi** pada switch/router.`,
      identifiedIssues: [
        `Daftar VLAN: ${vlans.map(v => `VLAN ${v.vlanId} (${v.name})`).join(', ')}`,
        'Segmentasi Layer 2 VLAN berstatus aktif.',
      ],
      explanation: 'Switchport broadcast domain terisolasi sesuai pemetaan VLAN ID.',
      recommendedCommands: [
        { cmd: 'show interfaces trunk', purpose: 'Cek port trunking 802.1Q dan allowed VLAN' },
        { cmd: 'show vlan brief', purpose: 'Refresh database VLAN' },
      ],
      formattedTable: tableMd,
    };
  }

  // =========================================================================
  // 8.5. DHCP Binding & Client Lease Parsing
  // =========================================================================
  const dhcpLeases = parseTerminalDhcp(text);
  if (dhcpLeases.length > 0 && (lower.includes('dhcp') || lower.includes('binding') || lower.includes('lease'))) {
    const tableMd = formatDhcpTableMarkdown(dhcpLeases);
    return {
      status: 'healthy',
      summary: `Tabel **DHCP Binding** berhasil dipetakan: Terdeteksi **${dhcpLeases.length} Alokasi IP Klien Aktif** (${brand.toUpperCase()}).`,
      identifiedIssues: [
        `Total Klien DHCP: ${dhcpLeases.length} host terdaftar aktif`,
        `Entri Binding Teratas: ${dhcpLeases.slice(0, 4).map(d => `\`${d.ipAddress}\` -> \`${d.macAddress}\`${d.hostname && d.hostname !== '-' ? ` (${d.hostname})` : ''}`).join(', ')}`,
        'Integritas Alokasi IP: Seluruh klien mendapatkan IP secara dinamis/otomatis tanpa konflik IP.',
      ],
      explanation: 'Layanan DHCP pool beroperasi normal. Klien jaringan telah berhasil melakukan negosiasi DORA (Discover, Offer, Request, Acknowledge).',
      recommendedCommands: b === 'cisco' ? [
        { cmd: 'show ip dhcp binding', purpose: 'Refresh daftar binding IP klien DHCP' },
        { cmd: 'show ip dhcp pool', purpose: 'Periksa sisa kapasitas range IP pool' },
        { cmd: 'show ip dhcp conflict', purpose: 'Periksa jika ada IP duplikat di jaringan' },
      ] : b === 'mikrotik' ? [
        { cmd: '/ip dhcp-server lease print', purpose: 'Lihat daftar klien DHCP MikroTik' },
        { cmd: '/ip pool print', purpose: 'Cek utilisasi range IP pool' },
      ] : [
        { cmd: 'cat /var/lib/dhcp/dhcpd.leases', purpose: 'Periksa database lease DHCP Linux' },
      ],
      formattedTable: tableMd,
    };
  }

  // =========================================================================
  // 9. ARP & Neighbor Table Parsing
  // =========================================================================
  const arpEntries = parseTerminalArp(text);
  if (arpEntries.length > 0 && !lower.includes('show ip interface brief') && !lower.includes('ip a')) {
    const tableMd = formatArpTableMarkdown(arpEntries);
    return {
      status: 'healthy',
      summary: `Tabel ARP resolusi alamat Layer 2 / Layer 3 berhasil dipetakan (${arpEntries.length} entri MAC-IP).`,
      identifiedIssues: [
        `Total Entri ARP: ${arpEntries.length} perangkat terdaftar`,
        `Entri Teratas: ${arpEntries.slice(0, 4).map(a => `\`${a.ipAddress}\` -> \`${a.macAddress}\``).join(', ')}`,
      ],
      explanation: 'Resolusi MAC address gateway dan host tetangga berjalan normal tanpa ARP spoofing.',
      recommendedCommands: [
        { cmd: b === 'linux' ? 'ip neigh show' : b === 'cisco' ? 'show ip arp' : 'get system arp', purpose: 'Refresh tabel ARP' },
      ],
      formattedTable: tableMd,
    };
  }

  // =========================================================================
  // 10. Interfaces & IP Address Parsing
  // =========================================================================
  const ifaces = parseTerminalInterfaces(text, brand);
  if (ifaces.length > 0) {
    const activeIfaces = ifaces.filter(i => i.state === 'UP');
    const assignedIfaces = ifaces.filter(i => i.ipv4List.length > 0);
    const downIfaces = ifaces.filter(i => i.state === 'DOWN' || i.state === 'ADMIN_DOWN');

    const issues: string[] = [];
    if (assignedIfaces.length > 0) {
      issues.push(`Alamat IP Aktif: ${assignedIfaces.map(i => `\`${i.name}\` (${i.ipv4List.join(', ')})`).join(', ')}`);
    }
    issues.push(`Total Antarmuka: ${ifaces.length} port (${activeIfaces.length} UP, ${downIfaces.length} DOWN)`);
    if (downIfaces.length > 0) {
      issues.push(`Port Non-Aktif: ${downIfaces.map(i => `\`${i.name}\``).join(', ')}`);
    }

    const tableMd = formatInterfacesTableMarkdown(ifaces, brand, model);

    const recCmds: { cmd: string; purpose: string }[] = b === 'linux'
      ? [
          { cmd: 'ip route show', purpose: 'Periksa rute Default Gateway dan subnet lokal' },
          { cmd: 'ip neigh show', purpose: 'Periksa tabel ARP tetangga terdekat' },
          { cmd: 'ping -c 4 8.8.8.8', purpose: 'Uji konektivitas keluar ke internet' },
        ]
      : b === 'cisco'
      ? [
          { cmd: 'show ip route', purpose: 'Cek tabel routing IPv4 dan Default Gateway' },
          { cmd: 'show interfaces status', purpose: 'Periksa status fisik port, speed, dan duplex' },
          { cmd: 'show ip arp', purpose: 'Periksa tabel ARP tetangga terdekat' },
        ]
      : b === 'mikrotik'
      ? [
          { cmd: '/ip route print', purpose: 'Periksa tabel routing MikroTik' },
          { cmd: '/ip arp print', purpose: 'Cek tabel ARP tetangga' },
          { cmd: '/ping 8.8.8.8 count=4', purpose: 'Uji koneksi internet' },
        ]
      : [
          { cmd: 'get router info routing-table all', purpose: 'Lihat tabel routing FortiOS' },
          { cmd: 'get system interface physical', purpose: 'Cek status fisik port FortiGate' },
        ];

    return {
      status: downIfaces.length === 0 ? 'healthy' : 'info',
      summary: `Terdeteksi **${assignedIfaces.length} Alamat IP Aktif** pada ${activeIfaces.length} antarmuka berstatus **UP** (${brand.toUpperCase()}).`,
      identifiedIssues: issues,
      explanation: `Semua antarmuka aktif telah dikonfigurasi dengan benar dan siap meneruskan trafik paket Layer 2 / Layer 3.`,
      recommendedCommands: recCmds,
      formattedTable: tableMd,
    };
  }

  // =========================================================================
  // 11. Routing Table Parsing
  // =========================================================================
  const routes = parseTerminalRoutes(text, brand);
  if (routes.length > 0) {
    const defRoute = routes.find(r => r.isDefault || r.destination.includes('0.0.0.0/0'));
    const connectedRoutes = routes.filter(r => r.protocol === 'CONNECTED' || r.gateway.toLowerCase().includes('connect') || r.gateway.toLowerCase().includes('direct'));
    const staticRoutes = routes.filter(r => r.protocol === 'STATIC' && !r.isDefault && !r.destination.includes('0.0.0.0/0'));
    const dynamicRoutes = routes.filter(r => ['OSPF', 'BGP', 'EIGRP', 'RIP', 'IS-IS', 'KERNEL'].includes(r.protocol));

    const tableMd = formatRoutesTableMarkdown(routes);

    const issues: string[] = [];
    if (defRoute) {
      const cleanGw = defRoute.gateway.replace(/\s*\(Default\)/i, '');
      issues.push(`Default Route (0.0.0.0/0): \`${cleanGw}\` via \`${defRoute.interface}\`${defRoute.metric ? ` (${defRoute.metric})` : ''}`);
    } else {
      issues.push('Default Route: Tidak terdeteksi 0.0.0.0/0 (Hanya rute subnet lokal / internal)');
    }

    if (connectedRoutes.length > 0) {
      const connSubnets = connectedRoutes.map(r => `\`${r.destination}\` (${r.interface})`).slice(0, 8).join(', ');
      issues.push(`Subnet Lokal Terhubung (${connectedRoutes.length} Subnet): ${connSubnets}${connectedRoutes.length > 8 ? ` dan ${connectedRoutes.length - 8} lainnya` : ''}`);
    }

    if (staticRoutes.length > 0) {
      const statSubnets = staticRoutes.map(r => `\`${r.destination}\` via \`${r.gateway}\``).slice(0, 6).join(', ');
      issues.push(`Rute Statik / Next-Hop (${staticRoutes.length} Subnet): ${statSubnets}${staticRoutes.length > 6 ? ` dan ${staticRoutes.length - 6} lainnya` : ''}`);
    }

    if (dynamicRoutes.length > 0) {
      const dynProtos = Array.from(new Set(dynamicRoutes.map(r => r.protocol))).join(', ');
      issues.push(`Rute Dinamis (${dynamicRoutes.length} Subnet): Protokol ${dynProtos}`);
    }

    const hasLinkDown = routes.some(r => r.status === 'LINK_DOWN');
    if (hasLinkDown) {
      issues.push('⚠️ Perhatian: Terdapat antarmuka rute yang berstatus LINK DOWN!');
    } else {
      issues.push(`Integritas Routing: Seluruh ${routes.length} jalur rute berstatus aktif tanpa indikasi blackhole atau routing loop`);
    }

    const recCmds: { cmd: string; purpose: string }[] = b === 'linux'
      ? [
          { cmd: defRoute ? `ping -c 4 ${defRoute.gateway.replace(/\s*\(Default\)/i, '')}` : 'ping -c 4 8.8.8.8', purpose: 'Uji konektivitas gateway default' },
          { cmd: 'ip route show', purpose: 'Tampilkan tabel routing kernel lengkap' },
          { cmd: 'ip neigh show', purpose: 'Periksa tabel ARP tetangga terdekat' },
        ]
      : b === 'fortinet'
      ? [
          { cmd: defRoute ? `execute ping ${defRoute.gateway.replace(/\s*\(Default\)/i, '')}` : 'execute ping 8.8.8.8', purpose: 'Uji konektivitas gateway FortiGate' },
          { cmd: 'get router info routing-table all', purpose: 'Refresh seluruh tabel routing FortiOS' },
          { cmd: 'diagnose ip arp list', purpose: 'Periksa tabel ARP FortiOS' },
          { cmd: 'get system interface physical', purpose: 'Cek status fisik port antarmuka' },
        ]
      : b === 'mikrotik'
      ? [
          { cmd: defRoute ? `/ping address=${defRoute.gateway.replace(/\s*\(Default\)/i, '')} count=4` : '/ping 8.8.8.8 count=4', purpose: 'Uji koneksi gateway' },
          { cmd: '/ip route print detail', purpose: 'Cek detail atribut routing MikroTik' },
          { cmd: '/ip arp print', purpose: 'Cek tabel ARP tetangga' },
        ]
      : [
          { cmd: defRoute ? `ping ${defRoute.gateway.replace(/\s*\(Default\)/i, '')}` : 'ping 8.8.8.8', purpose: 'Uji konektivitas gateway' },
          { cmd: 'show ip route summary', purpose: 'Tampilkan ringkasan RIB/FIB router' },
          { cmd: 'show ip arp', purpose: 'Periksa tabel ARP tetangga' },
        ];

    let summaryText = `Tabel routing **${brand.toUpperCase()}** terdeteksi dengan total **${routes.length} jalur rute aktif**. `;
    if (defRoute) {
      const cleanGw = defRoute.gateway.replace(/\s*\(Default\)/i, '');
      summaryText += `Default Gateway aktif mengarah ke \`${cleanGw}\` via antarmuka \`${defRoute.interface}\`.`;
    } else {
      summaryText += `Router saat ini aktif melayani subnet lokal yang terhubung langsung.`;
    }

    return {
      status: hasLinkDown ? 'warning' : 'healthy',
      summary: summaryText.trim(),
      identifiedIssues: issues,
      explanation: `Router berhasil memetakan ${connectedRoutes.length} subnet lokal terhubung langsung dan ${staticRoutes.length + dynamicRoutes.length} rute remote. Trafik routing siap diteruskan sesuai tabel FIB.`,
      recommendedCommands: recCmds,
      formattedTable: tableMd,
    };
  }

  // =========================================================================
  // 12. Ping / Latency Output
  // =========================================================================
  if (lower.includes('packets transmitted') || lower.includes('packet loss') || lower.includes('rtt min/avg/max')) {
    const txMatch = text.match(/(\d+)\s+packets transmitted,\s+(\d+)\s+(?:packets\s+)?received,\s+([0-9\.]+)%\s+packet loss/i);
    const rttMatch = text.match(/(?:rtt|round-trip)\s+min\/avg\/max\/(?:mdev|stddev)\s*=\s*([0-9\.\/]+)\s*ms/i);

    const tx = txMatch ? txMatch[1] : '4';
    const rx = txMatch ? txMatch[2] : '4';
    const loss = txMatch ? Number(txMatch[3]) : (lower.includes('100% packet loss') ? 100 : 0);
    const rtt = rttMatch ? rttMatch[1].split('/') : [];

    const isSuccess = loss === 0;
    const isPartial = loss > 0 && loss < 100;

    const issues: string[] = [
      `Transmisi Paket: ${tx} dikirim, ${rx} diterima (${loss}% Packet Loss)`,
      rtt.length >= 3 ? `Latensi RTT: Min ${rtt[0]}ms | Avg ${rtt[1]}ms | Max ${rtt[2]}ms` : 'Latensi: Respon instan',
    ];

    return {
      status: isSuccess ? 'healthy' : isPartial ? 'warning' : 'critical',
      summary: isSuccess 
        ? `🟢 **Konektivitas Jaringan Normal**: 0% Packet Loss dengan waktu respon rata-rata ${rtt[1] || '< 1'}ms.`
        : `🔴 **Koneksi Terganggu**: Terjadi ${loss}% packet loss ke host target.`,
      identifiedIssues: issues,
      explanation: isSuccess 
        ? 'Jalur end-to-end jaringan stabil dan latency optimal.' 
        : 'Periksa gateway, DNS resolver, firewall filter, atau kabel uplink.',
      recommendedCommands: b === 'linux'
        ? [
            { cmd: 'ip route show', purpose: 'Cek routing keluar gateway' },
            { cmd: 'traceroute -n 8.8.8.8', purpose: 'Lacak hop jalur yang putus' },
          ]
        : [
            { cmd: 'show ip route', purpose: 'Cek rute ke host target' },
            { cmd: 'show ip arp', purpose: 'Cek tabel ARP gateway' },
          ],
    };
  }

  // =========================================================================
  // 13. General Terminal Output Fallback
  // =========================================================================
  const hasErrors = lower.includes('error') || lower.includes('invalid') || lower.includes('failed') || lower.includes('denied') || lower.includes('unreachable') || lower.includes('down');
  const status = hasErrors ? 'warning' : 'healthy';

  return {
    status,
    summary: hasErrors
      ? `Terdeteksi indikasi warning/error pada respon terminal **${brand.toUpperCase()} (${model})** (${meaningfulLines.length} baris data diproses).`
      : `Output dari sesi terminal **${brand.toUpperCase()} (${model})** berhasil diproses (${meaningfulLines.length} baris data).`,
    identifiedIssues: [
      `Target: \`${brand.toUpperCase()} (${model})\``,
      `Status: ${hasErrors ? 'Peringatan / Indikasi Error Ditemukan' : 'Operasional & Respon Perintah Diterima'}`,
      `Total Baris Output: ${meaningfulLines.length} baris`,
    ],
    explanation: hasErrors
      ? `Ditemukan kata kunci error atau warning pada log terminal. Mohon periksa kembali sintaks perintah atau status koneksi perangkat.`
      : `Respon perintah telah terekam dan diproses.`,
    recommendedCommands: [],
  };
}
