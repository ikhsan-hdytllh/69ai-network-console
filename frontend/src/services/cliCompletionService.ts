import { DeviceBrand } from '../types';

export interface CliHelpItem {
  command: string;
  description: string;
}

export interface TabCompletionResult {
  completedInput: string;
  isCompleted: boolean;
  candidates: string[];
  helpOutput?: string;
}

// Universal CLI Command Tree Dictionary
const CISCO_COMMAND_TREE: Record<string, CliHelpItem[]> = {
  '': [
    { command: 'clear', description: 'Reset functions and counters' },
    { command: 'clock', description: 'Manage the system clock' },
    { command: 'configure', description: 'Enter configuration mode' },
    { command: 'connect', description: 'Open a terminal connection' },
    { command: 'controller', description: 'Configure a specific controller (cellular, E1, T1)' },
    { command: 'copy', description: 'Copy from one file to another (e.g. running-config startup-config)' },
    { command: 'debug', description: 'Debugging functions' },
    { command: 'delete', description: 'Delete a file' },
    { command: 'dir', description: 'List files on a filesystem' },
    { command: 'disable', description: 'Turn off privileged commands' },
    { command: 'disconnect', description: 'Disconnect an existing network connection' },
    { command: 'enable', description: 'Turn on privileged commands' },
    { command: 'exit', description: 'Exit from the EXEC mode' },
    { command: 'format', description: 'Format a device' },
    { command: 'help', description: 'Description of the interactive help system' },
    { command: 'mkdir', description: 'Create new directory' },
    { command: 'more', description: 'Display the contents of a file' },
    { command: 'no', description: 'Negate a command or set its defaults' },
    { command: 'ping', description: 'Send echo messages to target address' },
    { command: 'quit', description: 'Exit from current mode' },
    { command: 'reload', description: 'Halt and perform a cold restart' },
    { command: 'resume', description: 'Resume an active network connection' },
    { command: 'send', description: 'Send message to terminals' },
    { command: 'show', description: 'Show running system information' },
    { command: 'ssh', description: 'Open a secure shell client connection' },
    { command: 'telnet', description: 'Open a telnet connection' },
    { command: 'terminal', description: 'Set terminal line parameters' },
    { command: 'traceroute', description: 'Trace route to destination' },
    { command: 'undebug', description: 'Disable debugging functions' },
    { command: 'verify', description: 'Verify a file integrity' },
    { command: 'where', description: 'List active connections' },
    { command: 'write', description: 'Save running configuration to NVRAM' },
  ],
  'show': [
    { command: 'access-lists', description: 'List access control lists (ACLs)' },
    { command: 'arp', description: 'ARP table' },
    { command: 'bgp', description: 'BGP routing information' },
    { command: 'boot', description: 'Boot variables & environmental parameters' },
    { command: 'cdp', description: 'Cisco Discovery Protocol information' },
    { command: 'cellular', description: 'Cellular 4G/5G radio & GPS subcommands' },
    { command: 'clock', description: 'Display the system clock' },
    { command: 'configuration', description: 'Configuration information' },
    { command: 'crypto', description: 'Cryptographic IPsec/IKE subsystem' },
    { command: 'dhcp', description: 'Dynamic Host Configuration Protocol' },
    { command: 'environment', description: 'Environmental monitor power/fan/temp status' },
    { command: 'flash:', description: 'Display file list in flash memory' },
    { command: 'history', description: 'Display the session command history' },
    { command: 'interfaces', description: 'Interface status and configuration' },
    { command: 'inventory', description: 'Show physical chassis and module inventory' },
    { command: 'ip', description: 'IP information (bgp, route, interface, nat, ospf)' },
    { command: 'ipv6', description: 'IPv6 information' },
    { command: 'lldp', description: 'Link Layer Discovery Protocol information' },
    { command: 'logging', description: 'Show system logging buffer' },
    { command: 'mac', description: 'MAC address-table configuration and entries' },
    { command: 'memory', description: 'Memory allocation statistics' },
    { command: 'modules', description: 'Installed hardware module info' },
    { command: 'ntp', description: 'Network Time Protocol status and associations' },
    { command: 'ospf', description: 'OSPF routing protocol information' },
    { command: 'power', description: 'Power supply status' },
    { command: 'processes', description: 'Active process CPU statistics' },
    { command: 'running-config', description: 'Current operating configuration in RAM' },
    { command: 'sessions', description: 'Active Telnet/SSH sessions' },
    { command: 'standby', description: 'HSRP / VRRP standby status' },
    { command: 'startup-config', description: 'Contents of NVRAM startup configuration' },
    { command: 'tech-support', description: 'Compile complete system diagnostics' },
    { command: 'terminal', description: 'Display terminal line configuration parameters' },
    { command: 'users', description: 'Display information about terminal users' },
    { command: 'version', description: 'System hardware and software release version' },
    { command: 'vlan', description: 'VLAN status and brief mapping' },
    { command: 'vrf', description: 'Virtual Routing and Forwarding instances' },
  ],
  'show ip': [
    { command: 'access-lists', description: 'IP access-list configuration' },
    { command: 'arp', description: 'IP ARP resolution table' },
    { command: 'bgp', description: 'BGP routing table & neighbors' },
    { command: 'cef', description: 'Cisco Express Forwarding routing table' },
    { command: 'dhcp', description: 'DHCP snooping and binding pool' },
    { command: 'eigrp', description: 'EIGRP routing protocol' },
    { command: 'flow', description: 'NetFlow cache & export statistics' },
    { command: 'igmp', description: 'IGMP multicast group membership' },
    { command: 'interface', description: 'IP interface status and configuration' },
    { command: 'mroute', description: 'IP multicast routing table' },
    { command: 'nat', description: 'IP Network Address Translation statistics' },
    { command: 'ospf', description: 'OSPF routing protocol' },
    { command: 'pim', description: 'PIM multicast routing information' },
    { command: 'prefix-list', description: 'IP prefix-list filter entries' },
    { command: 'protocols', description: 'Active IP routing protocols' },
    { command: 'rip', description: 'RIP routing protocol' },
    { command: 'route', description: 'IP routing table' },
    { command: 'vrf', description: 'VPN Routing/Forwarding instances' },
  ],
  'show ip bgp': [
    { command: 'summary', description: 'BGP neighbor summary & prefix count' },
    { command: 'neighbors', description: 'Detailed BGP neighbor states' },
    { command: 'ipv4', description: 'BGP IPv4 address-family routing table' },
    { command: 'ipv6', description: 'BGP IPv6 address-family routing table' },
    { command: 'vpnv4', description: 'BGP VPNv4 VRF routing table' },
    { command: 'paths', description: 'BGP path table information' },
    { command: 'regexp', description: 'Filter BGP table by AS-Path regular expression' },
  ],
  'show ip route': [
    { command: 'summary', description: 'Routing table summary' },
    { command: 'bgp', description: 'BGP derived routes' },
    { command: 'ospf', description: 'OSPF derived routes' },
    { command: 'static', description: 'Static routes' },
    { command: 'connected', description: 'Connected network routes' },
    { command: 'vrf', description: 'Show routing table for specific VRF' },
  ],
  'show ip interface': [
    { command: 'brief', description: 'Summary of interface IP status (UP/DOWN/IP)' },
    { command: 'GigabitEthernet', description: 'GigabitEthernet interface details' },
    { command: 'FastEthernet', description: 'FastEthernet interface details' },
    { command: 'TenGigabitEthernet', description: '10-Gigabit interface details' },
    { command: 'Loopback', description: 'Loopback interface details' },
    { command: 'Vlan', description: 'VLAN virtual interface details' },
    { command: 'Cellular', description: 'Cellular interface details' },
  ],
  'show interfaces': [
    { command: 'status', description: 'Port status, duplex, speed, and vlan' },
    { command: 'brief', description: 'Brief interface state table' },
    { command: 'description', description: 'User-configured interface descriptions' },
    { command: 'counters', description: 'Traffic, error and drop packet counters' },
    { command: 'switchport', description: 'L2 switchport trunk/access parameters' },
    { command: 'trunk', description: 'Trunking status and allowed VLANs' },
    { command: 'GigabitEthernet', description: 'GigabitEthernet physical port details' },
    { command: 'FastEthernet', description: 'FastEthernet physical port details' },
    { command: 'TenGigabitEthernet', description: '10G physical port details' },
    { command: 'Loopback', description: 'Loopback virtual port details' },
    { command: 'Vlan', description: 'VLAN SVI interface details' },
    { command: 'Port-channel', description: 'LACP / EtherChannel port-channel details' },
    { command: 'Cellular', description: 'Cellular modem port details' },
  ],
  'show cellular': [
    { command: '0/4/0', description: 'Cellular interface slot 0/4/0' },
    { command: '0/1/0', description: 'Cellular interface slot 0/1/0' },
    { command: 'all', description: 'All cellular interfaces' },
  ],
  'show cellular 0/4/0': [
    { command: 'gps', description: 'GPS status, coordinates, altitude, satellites & fix info' },
    { command: 'network', description: 'Cellular operator, signal RSSI/RSRP, band info' },
    { command: 'radio', description: 'Radio power, antenna status, technology mode' },
    { command: 'all', description: 'Complete cellular modem status diagnostics' },
    { command: 'profile', description: 'APN profile configuration' },
    { command: 'security', description: 'SIM card status, PIN, IMSI, IMEI' },
  ],
  'show ntp': [
    { command: 'status', description: 'NTP synchronization state, stratum, offset' },
    { command: 'associations', description: 'NTP peer server list and jitter' },
  ],
  'show running-config': [
    { command: 'interface', description: 'Show config for specific interface' },
    { command: '|', description: 'Pipe output through filter (include, begin, section)' },
    { command: 'all', description: 'Show complete running configuration including defaults' },
  ],
  'configure': [
    { command: 'terminal', description: 'Configure from the terminal' },
    { command: 'memory', description: 'Configure from NVRAM memory' },
    { command: 'network', description: 'Configure from a TFTP/SCP network host' },
    { command: 'replace', description: 'Replace running config with target config file' },
  ],
  'copy': [
    { command: 'running-config', description: 'Copy active running-config from RAM' },
    { command: 'startup-config', description: 'Copy startup-config from NVRAM' },
    { command: 'flash:', description: 'Copy from local flash storage' },
    { command: 'tftp:', description: 'Copy from TFTP network server' },
    { command: 'scp:', description: 'Copy from SCP secure copy server' },
    { command: 'ftp:', description: 'Copy from FTP server' },
  ],
  'copy running-config': [
    { command: 'startup-config', description: 'Save current running-config to startup NVRAM' },
    { command: 'flash:', description: 'Backup running-config to flash' },
    { command: 'tftp:', description: 'Export running-config to TFTP server' },
    { command: 'scp:', description: 'Export running-config to SCP server' },
  ],
  'write': [
    { command: 'memory', description: 'Write running configuration to memory (same as copy run start)' },
    { command: 'erase', description: 'Erase NVRAM startup configuration' },
    { command: 'terminal', description: 'Display configuration to terminal' },
  ],
  'config': [
    { command: 'hostname', description: 'Set system network name' },
    { command: 'controller', description: 'Configure controller (cellular 0/4/0, cellular 0/5/0, E1, T1)' },
    { command: 'interface', description: 'Select an interface to configure' },
    { command: 'router', description: 'Enable a routing process (bgp, ospf, eigrp)' },
    { command: 'ip', description: 'Global IP configuration commands' },
    { command: 'ipv6', description: 'Global IPv6 configuration commands' },
    { command: 'vlan', description: 'VLAN configuration commands' },
    { command: 'line', description: 'Configure a terminal line (vty, console)' },
    { command: 'username', description: 'Establish User Name Authentication' },
    { command: 'enable', description: 'Modify enable password parameters' },
    { command: 'banner', description: 'Define a login/MOTD banner' },
    { command: 'ntp', description: 'Configure NTP servers and synchronization' },
    { command: 'service', description: 'Modify use of network based services' },
    { command: 'snmp-server', description: 'Modify SNMP engine parameters' },
    { command: 'logging', description: 'Modify message logging facilities' },
    { command: 'crypto', description: 'Encryption / IPsec / PKI configuration' },
    { command: 'do', description: 'Execute an EXEC-level command from config mode' },
    { command: 'end', description: 'Exit from configure mode' },
    { command: 'exit', description: 'Exit from configure mode' },
    { command: 'no', description: 'Negate a command or set its defaults' },
  ],
  'controller': [
    { command: 'cellular', description: 'Cellular modem controller slot (0/4/0, 0/5/0, 0/1/0)' },
    { command: 'E1', description: 'E1 digital line controller' },
    { command: 'T1', description: 'T1 digital line controller' },
    { command: 'sonet', description: 'SONET controller' },
  ],
  'controller cellular': [
    { command: '0/4/0', description: 'Cellular controller slot 0/4/0' },
    { command: '0/5/0', description: 'Cellular controller slot 0/5/0' },
    { command: '0/1/0', description: 'Cellular controller slot 0/1/0' },
    { command: '0/2/0', description: 'Cellular controller slot 0/2/0' },
  ],
  'config-controller': [
    { command: 'lte', description: 'LTE radio & SIM card settings' },
    { command: 'mode', description: 'Network technology mode (auto, lte, 5g, 3g)' },
    { command: 'radio', description: 'Radio power status (on/off)' },
    { command: 'sim', description: 'SIM selection (slot 0/1)' },
    { command: 'description', description: 'Controller description' },
    { command: 'shutdown', description: 'Shutdown controller' },
    { command: 'no', description: 'Negate a command' },
    { command: 'exit', description: 'Exit controller configuration mode' },
  ],
  'config-interface': [
    { command: 'description', description: 'Interface specific description' },
    { command: 'ip', description: 'Interface IP address and features' },
    { command: 'ipv6', description: 'IPv6 interface subcommands' },
    { command: 'shutdown', description: 'Shut down the selected interface' },
    { command: 'no', description: 'Negate command (e.g. no shutdown, no ip address)' },
    { command: 'switchport', description: 'Set switching characteristics of the interface' },
    { command: 'speed', description: 'Configure interface speed' },
    { command: 'duplex', description: 'Configure interface duplex' },
    { command: 'mtu', description: 'Set MTU size on interface' },
    { command: 'bandwidth', description: 'Set bandwidth informational parameter' },
    { command: 'encapsulation', description: 'Set encapsulation type (dot1q)' },
    { command: 'standby', description: 'HSRP standby group configuration' },
    { command: 'vrrp', description: 'VRRP group configuration' },
    { command: 'exit', description: 'Exit from interface configuration mode' },
    { command: 'end', description: 'Exit from configure mode to privileged EXEC' },
  ],
  'config-interface ip': [
    { command: 'address', description: 'Set interface IP address and subnet mask' },
    { command: 'nat', description: 'Enable NAT inside/outside on this interface' },
    { command: 'ospf', description: 'OSPF interface configuration' },
    { command: 'access-group', description: 'Apply ACL packet filter to interface' },
    { command: 'helper-address', description: 'DHCP relay helper address' },
  ],
  'config-interface switchport': [
    { command: 'mode', description: 'Set trunk or access mode' },
    { command: 'access', description: 'Set access VLAN' },
    { command: 'trunk', description: 'Set trunk allowed VLANs' },
    { command: 'nonegotiate', description: 'Disable DTP negotiation' },
    { command: 'voice', description: 'Configure voice VLAN' },
  ],
  'config-interface switchport mode': [
    { command: 'access', description: 'Set interface to access mode' },
    { command: 'trunk', description: 'Set interface to trunking mode' },
    { command: 'dot1q-tunnel', description: 'Set interface to 802.1Q tunnel mode' },
  ],
  'config-interface switchport access': [
    { command: 'vlan', description: 'Set 802.1Q access VLAN ID' },
  ],
  'config-interface switchport trunk': [
    { command: 'allowed', description: 'Set allowed VLANs on trunk' },
    { command: 'native', description: 'Set native VLAN on trunk' },
    { command: 'encapsulation', description: 'Set trunk encapsulation (dot1q)' },
  ],
  'config-interface no': [
    { command: 'shutdown', description: 'Enable interface (no shut)' },
    { command: 'ip address', description: 'Remove configured IP address' },
    { command: 'switchport', description: 'Convert to routed L3 port' },
  ],
  'config interface': [
    { command: 'GigabitEthernet', description: 'GigabitEthernet IEEE 802.3z' },
    { command: 'FastEthernet', description: 'FastEthernet IEEE 802.3u' },
    { command: 'TenGigabitEthernet', description: '10-Gigabit Ethernet IEEE 802.3ae' },
    { command: 'FortyGigabitEthernet', description: '40-Gigabit Ethernet IEEE 802.3ba' },
    { command: 'HundredGigE', description: '100-Gigabit Ethernet' },
    { command: 'Loopback', description: 'Software loopback virtual interface' },
    { command: 'Vlan', description: 'Catalyst VLAN virtual interface' },
    { command: 'Port-channel', description: 'EtherChannel port aggregation' },
    { command: 'Cellular', description: '4G LTE / 5G cellular modem interface' },
    { command: 'Tunnel', description: 'GRE / IPsec tunnel interface' },
    { command: 'Serial', description: 'Serial synchronous interface' },
  ],
  'config-router': [
    { command: 'network', description: 'Enable routing on an IP network' },
    { command: 'neighbor', description: 'Specify a neighbor router' },
    { command: 'router-id', description: 'Manually configure router ID' },
    { command: 'redistribute', description: 'Redistribute routes from another protocol' },
    { command: 'default-information', description: 'Control distribution of default information' },
    { command: 'passive-interface', description: 'Suppress routing updates on an interface' },
    { command: 'version', description: 'Set protocol version (e.g. version 2)' },
    { command: 'exit', description: 'Exit from routing protocol configuration mode' },
    { command: 'end', description: 'Exit to privileged EXEC mode' },
  ],
  'config-vlan': [
    { command: 'name', description: 'Ascii name of the VLAN' },
    { command: 'state', description: 'Operational state of the VLAN (active/suspend)' },
    { command: 'shutdown', description: 'Shut down VLAN' },
    { command: 'no shutdown', description: 'Enable VLAN' },
    { command: 'exit', description: 'Apply and exit from VLAN configuration mode' },
    { command: 'end', description: 'Exit to privileged EXEC mode' },
  ],
  'config-line': [
    { command: 'password', description: 'Set a password' },
    { command: 'login', description: 'Enable password checking' },
    { command: 'transport input', description: 'Define which protocols to use when connecting (ssh/all)' },
    { command: 'exec-timeout', description: 'Set the EXEC timeout' },
    { command: 'logging synchronous', description: 'Synchronize unsolicited messages and output' },
    { command: 'exit', description: 'Exit from line configuration mode' },
    { command: 'end', description: 'Exit to privileged EXEC mode' },
  ],
  'config ip': [
    { command: 'route', description: 'Establish static routes' },
    { command: 'address', description: 'Set IP address' },
    { command: 'dhcp', description: 'Configure DHCP server parameters' },
    { command: 'access-list', description: 'Specify access control list' },
    { command: 'domain-name', description: 'Define the default domain name' },
    { command: 'name-server', description: 'Specify address of name server to use' },
    { command: 'default-gateway', description: 'Specify default gateway' },
    { command: 'ssh', description: 'Configure SSH server parameters' },
    { command: 'nat', description: 'Network Address Translation' },
  ],
  'config router': [
    { command: 'ospf', description: 'Open Shortest Path First (OSPF)' },
    { command: 'bgp', description: 'Border Gateway Protocol (BGP)' },
    { command: 'eigrp', description: 'Enhanced Interior Gateway Routing Protocol' },
    { command: 'rip', description: 'Routing Information Protocol' },
  ],
  'config line': [
    { command: 'vty', description: 'Virtual terminal line' },
    { command: 'console', description: 'Primary console terminal line' },
    { command: 'aux', description: 'Auxiliary line' },
  ],
  'config line vty': [
    { command: '0 4', description: 'Virtual terminal lines 0 through 4' },
    { command: '0 15', description: 'Virtual terminal lines 0 through 15' },
  ],
  'config line console': [
    { command: '0', description: 'Primary console port 0' },
  ],
};

// Huawei VRP Command Tree
const HUAWEI_COMMAND_TREE: Record<string, CliHelpItem[]> = {
  '': [
    { command: 'display', description: 'Display system and protocol status' },
    { command: 'system-view', description: 'Enter system view (configuration mode)' },
    { command: 'ping', description: 'Send ICMP Echo request packets' },
    { command: 'tracert', description: 'Trace route to remote host' },
    { command: 'save', description: 'Save current configuration to flash' },
    { command: 'reboot', description: 'Reboot the device' },
    { command: 'quit', description: 'Exit from current view' },
    { command: 'return', description: 'Return to user view from any view' },
    { command: 'undo', description: 'Negate a command or restore defaults' },
  ],
  'display': [
    { command: 'current-configuration', description: 'Display current running configuration' },
    { command: 'ip interface brief', description: 'Display brief IP interface status' },
    { command: 'interface description', description: 'Display interface descriptions' },
    { command: 'interface', description: 'Display interface statistics and status' },
    { command: 'ip routing-table', description: 'Display IPv4 routing table' },
    { command: 'ospf peer', description: 'Display OSPF neighbor states' },
    { command: 'bgp peer', description: 'Display BGP peer states' },
    { command: 'vlan', description: 'Display VLAN configuration and status' },
    { command: 'mac-address', description: 'Display MAC address forwarding table' },
    { command: 'version', description: 'Display system hardware and VRP version' },
    { command: 'device', description: 'Display device board status' },
    { command: 'logbuffer', description: 'Display system log buffer' },
  ],
  'config': [
    { command: 'sysname', description: 'Set system hostname' },
    { command: 'interface', description: 'Enter interface view' },
    { command: 'vlan', description: 'Create and enter VLAN view' },
    { command: 'ospf', description: 'Enable OSPF process' },
    { command: 'bgp', description: 'Enable BGP process' },
    { command: 'ip route-static', description: 'Configure IPv4 static route' },
    { command: 'user-interface', description: 'Enter user interface view (vty/console)' },
    { command: 'quit', description: 'Exit to previous view' },
    { command: 'return', description: 'Return to user view' },
    { command: 'undo', description: 'Cancel command or delete entry' },
  ],
};

// MikroTik RouterOS Command Tree
const MIKROTIK_COMMAND_TREE: Record<string, CliHelpItem[]> = {
  '': [
    { command: '/ip address print', description: 'Print IP addresses assigned to interfaces' },
    { command: '/ip route print', description: 'Print IP routing table' },
    { command: '/ip firewall filter print', description: 'Print firewall filter rules' },
    { command: '/ip firewall nat print', description: 'Print firewall NAT rules' },
    { command: '/ip dhcp-server lease print', description: 'Print active DHCP server leases' },
    { command: '/ip pool print', description: 'Print IP address pools' },
    { command: '/interface print', description: 'Print network interfaces and states' },
    { command: '/interface ethernet print', description: 'Print Ethernet physical interfaces' },
    { command: '/interface wireless print', description: 'Print wireless interfaces' },
    { command: '/routing bgp peer print', description: 'Print BGP peers' },
    { command: '/routing ospf neighbor print', description: 'Print OSPF neighbors' },
    { command: '/system resource print', description: 'Print CPU, memory, uptime, board name' },
    { command: '/system identity print', description: 'Print device identity hostname' },
    { command: '/system reboot', description: 'Reboot MikroTik RouterOS' },
    { command: '/tool ping', description: 'Ping remote IP address' },
    { command: '/tool traceroute', description: 'Traceroute to remote destination' },
  ],
};

// Fortinet FortiOS Command Tree
const FORTINET_COMMAND_TREE: Record<string, CliHelpItem[]> = {
  '': [
    { command: 'get', description: 'Display system and subsystem status' },
    { command: 'show', description: 'Display configuration settings' },
    { command: 'diagnose', description: 'Run diagnostics and troubleshooting commands' },
    { command: 'execute', description: 'Execute administrative functions (ping, backup, reboot)' },
    { command: 'config', description: 'Enter configuration tree' },
    { command: 'exit', description: 'Exit from current mode' },
    { command: 'end', description: 'Save and exit from current config block' },
    { command: 'clear', description: 'Clear terminal screen' },
  ],
  'get': [
    { command: 'system', description: 'System status, performance, interfaces, HA' },
    { command: 'router', description: 'Routing tables, BGP, OSPF information' },
    { command: 'firewall', description: 'Firewall policies, address objects, VIPs' },
    { command: 'vpn', description: 'IPsec and SSL-VPN runtime status' },
    { command: 'log', description: 'Log settings and device status' },
  ],
  'get system': [
    { command: 'status', description: 'Firmware version, serial number, uptime, license' },
    { command: 'performance status', description: 'CPU usage, memory, session rate' },
    { command: 'interface', description: 'Interface IP, physical link, MTU' },
    { command: 'interface physical', description: 'Physical link speed, duplex, transceiver optical power' },
    { command: 'arp', description: 'ARP cache table' },
    { command: 'dns', description: 'DNS servers and lookup latency' },
    { command: 'ha', description: 'High Availability cluster status and sync' },
    { command: 'ntp', description: 'NTP server synchronization status' },
  ],
  'get router info': [
    { command: 'bgp summary', description: 'BGP peer summary and prefix count' },
    { command: 'bgp neighbors', description: 'Detailed BGP neighbor states' },
    { command: 'routing-table all', description: 'Active kernel routing table' },
    { command: 'ospf neighbor', description: 'OSPF neighbor adjacency list' },
  ],
  'diagnose': [
    { command: 'sys top', description: 'Interactive process top monitor (CPU & Memory)' },
    { command: 'hardware sysinfo cpu', description: 'CPU hardware core details' },
    { command: 'hardware sysinfo memory', description: 'RAM physical allocation' },
    { command: 'vpn ike gateway list', description: 'Phase 1 IKE IPsec tunnel state' },
    { command: 'vpn tunnel list', description: 'Phase 2 IPsec active security associations' },
    { command: 'debug flow', description: 'Packet flow tracing engine' },
    { command: 'sniffer packet', description: 'Live packet capture on interface' },
  ],
  'execute': [
    { command: 'ping', description: 'Send ICMP echo packets' },
    { command: 'traceroute', description: 'Trace network hops to destination' },
    { command: 'backup config', description: 'Backup configuration file to USB/TFTP/FTP' },
    { command: 'restore config', description: 'Restore configuration from file' },
    { command: 'reboot', description: 'Reboot the FortiGate firewall' },
    { command: 'factoryreset', description: 'Reset system to factory default settings' },
  ],
  'config': [
    { command: 'system interface', description: 'Configure interface IP, VLAN, and administrative access' },
    { command: 'router bgp', description: 'Configure BGP routing engine' },
    { command: 'router static', description: 'Configure static routing routes' },
    { command: 'firewall policy', description: 'Configure security firewall policies' },
    { command: 'firewall address', description: 'Configure firewall address objects' },
    { command: 'vpn ipsec phase1-interface', description: 'Configure IPsec Phase 1 parameters' },
    { command: 'vpn ipsec phase2-interface', description: 'Configure IPsec Phase 2 proposals' },
    { command: 'system global', description: 'Configure hostname, timezone, admin port' },
    { command: 'system dns', description: 'Configure DNS server IP addresses' },
  ],
};

// Juniper Junos Command Tree
const JUNIPER_COMMAND_TREE: Record<string, CliHelpItem[]> = {
  '': [
    { command: 'show', description: 'Show system and network status' },
    { command: 'configure', description: 'Enter configuration mode' },
    { command: 'edit', description: 'Enter or edit configuration hierarchy' },
    { command: 'monitor', description: 'Real-time traffic or interface monitor' },
    { command: 'ping', description: 'Send ICMP echo request packets' },
    { command: 'traceroute', description: 'Trace route to remote host' },
    { command: 'request', description: 'Perform system requests (reboot, storage, license)' },
    { command: 'clear', description: 'Clear counters or session state' },
    { command: 'exit', description: 'Exit from CLI session' },
  ],
  'show': [
    { command: 'interfaces', description: 'Show interface status and statistics' },
    { command: 'interfaces terse', description: 'Concise table of interface link state & IP' },
    { command: 'interfaces descriptions', description: 'Configured interface descriptions' },
    { command: 'bgp summary', description: 'BGP session summary and received routes' },
    { command: 'bgp neighbor', description: 'Detailed BGP neighbor states' },
    { command: 'route', description: 'Show routing table (inet.0)' },
    { command: 'route summary', description: 'Route summary per protocol' },
    { command: 'chassis hardware', description: 'Physical chassis, FPC, SFP optics inventory' },
    { command: 'chassis environment', description: 'Temperature, fans, and power supply' },
    { command: 'system uptime', description: 'Current time, uptime, load averages' },
    { command: 'system storage', description: 'Filesystem usage of storage media' },
    { command: 'system alarms', description: 'Active hardware and software alarms' },
    { command: 'configuration', description: 'Display candidate or committed configuration' },
    { command: 'log messages', description: 'Show syslog messages buffer' },
    { command: 'lldp neighbors', description: 'LLDP neighbor discoveries' },
    { command: 'version', description: 'Junos OS software version' },
  ],
  'configure': [
    { command: 'set', description: 'Set a configuration parameter' },
    { command: 'delete', description: 'Delete a configuration parameter' },
    { command: 'commit', description: 'Commit candidate configuration to active' },
    { command: 'commit check', description: 'Check syntax without committing' },
    { command: 'commit confirmed', description: 'Commit with automatic rollback timer' },
    { command: 'rollback', description: 'Roll back to previous configuration (0-49)' },
    { command: 'show | compare', description: 'View diff of candidate vs active config' },
    { command: 'run', description: 'Run operational command from config mode' },
    { command: 'exit', description: 'Exit configuration mode' },
  ],
};

// Linux / Unix Server Command Tree
const LINUX_COMMAND_TREE: Record<string, CliHelpItem[]> = {
  '': [
    { command: 'ip', description: 'Show / manipulate routing, devices, policy routing and tunnels' },
    { command: 'systemctl', description: 'Control the systemd system and service manager' },
    { command: 'journalctl', description: 'Query the systemd journal logs' },
    { command: 'uname -a', description: 'Print system information and kernel release' },
    { command: 'df -h', description: 'Report file system disk space usage in human readable' },
    { command: 'free -m', description: 'Display amount of free and used memory in MB' },
    { command: 'top', description: 'Display Linux processes and real-time CPU load' },
    { command: 'htop', description: 'Interactive process viewer' },
    { command: 'ps aux', description: 'Report a snapshot of the current processes' },
    { command: 'cat /etc/os-release', description: 'Show Linux OS distribution release info' },
    { command: 'cat /etc/resolv.conf', description: 'Show DNS resolver configuration' },
    { command: 'ss -tulpn', description: 'Investigate sockets and listening ports' },
    { command: 'netstat -tuln', description: 'Print network connections and listening ports' },
    { command: 'dmesg -T', description: 'Print kernel ring buffer messages with timestamps' },
    { command: 'ping', description: 'Send ICMP ECHO_REQUEST to network hosts' },
    { command: 'traceroute', description: 'Print the route packets trace to network host' },
    { command: 'curl -I', description: 'Fetch HTTP response headers' },
    { command: 'ufw status', description: 'Show Uncomplicated Firewall status and rules' },
    { command: 'iptables -L -n -v', description: 'List IPv4 packet filter rules' },
    { command: 'docker ps', description: 'List active Docker containers' },
    { command: 'docker logs', description: 'Fetch the logs of a container' },
    { command: 'clear', description: 'Clear the terminal screen' },
    { command: 'exit', description: 'Close current shell session' },
  ],
  'ip': [
    { command: 'a', description: 'Show all IP addresses (alias for ip addr show)' },
    { command: 'addr', description: 'Protocol address management' },
    { command: 'route', description: 'Routing table management' },
    { command: 'link', description: 'Network device configuration' },
    { command: 'neigh', description: 'Neighbor/ARP table management' },
  ],
  'systemctl': [
    { command: 'status', description: 'Show runtime status of unit/service' },
    { command: 'restart', description: 'Restart one or more units' },
    { command: 'start', description: 'Start one or more units' },
    { command: 'stop', description: 'Stop one or more units' },
    { command: 'enable', description: 'Enable one or more unit files' },
    { command: 'disable', description: 'Disable one or more unit files' },
  ],
};

// Helper to expand interface abbreviations (e.g. gi0/1 -> GigabitEthernet0/1, fa0/24 -> FastEthernet0/24)
export function expandInterfaceToken(token: string): string {
  const ifaceMap: Record<string, string> = {
    gi: 'GigabitEthernet',
    gig: 'GigabitEthernet',
    gigabitethernet: 'GigabitEthernet',
    fa: 'FastEthernet',
    fast: 'FastEthernet',
    fastethernet: 'FastEthernet',
    te: 'TenGigabitEthernet',
    tengig: 'TenGigabitEthernet',
    tengigabitethernet: 'TenGigabitEthernet',
    fo: 'FortyGigabitEthernet',
    hu: 'HundredGigE',
    lo: 'Loopback',
    loopback: 'Loopback',
    vl: 'Vlan',
    vlan: 'Vlan',
    po: 'Port-channel',
    'port-channel': 'Port-channel',
    ce: 'Cellular',
    cellular: 'Cellular',
    se: 'Serial',
    serial: 'Serial',
    tu: 'Tunnel',
    tunnel: 'Tunnel',
  };
  const m = token.match(/^([a-zA-Z-]+)(\d.*)$/);
  if (m) {
    const prefix = m[1].toLowerCase();
    const rest = m[2];
    for (const [k, v] of Object.entries(ifaceMap)) {
      if (k === prefix || k.startsWith(prefix)) {
        return `${v}${rest}`;
      }
    }
  }
  return token;
}

// Select the matching command tree for brand
function getCommandTreeForBrand(brand: string): Record<string, CliHelpItem[]> {
  const b = (brand || '').toLowerCase();
  if (b === 'fortinet') return FORTINET_COMMAND_TREE;
  if (b === 'juniper') return JUNIPER_COMMAND_TREE;
  if (b === 'huawei') return HUAWEI_COMMAND_TREE;
  if (b === 'mikrotik') return MIKROTIK_COMMAND_TREE;
  if (b === 'linux') return LINUX_COMMAND_TREE;
  // Cisco, Arista EOS, HP/Aruba, Dell OS and Generic network switches
  return CISCO_COMMAND_TREE;
}

/**
 * Handle Tab Key Autocompletion
 * Progressive multi-token CLI autocompletion matching PuTTY, SecureCRT, and Transit IT standards.
 * Supports interface expansion (gi0/1 -> GigabitEthernet0/1), submodes (config, config-if, config-router),
 * and multi-level commands (e.g. "conf t", "sh ip int br", "sh run", "cop run start").
 */
export function handleCliTabCompletion(
  input: string,
  brand: string = 'cisco',
  currentMode: string = 'privileged'
): TabCompletionResult {
  const leadingSpace = input.match(/^\s*/)?.[0] || '';
  const trimmed = input.trimStart();
  const tree = getCommandTreeForBrand(brand);

  // If input is empty, complete to primary command
  if (!trimmed) {
    const defaultWord = brand === 'fortinet' ? 'get ' : brand === 'linux' ? 'ip a ' : brand === 'mikrotik' ? '/ip address print ' : brand === 'huawei' ? 'display ' : 'show ';
    return {
      completedInput: defaultWord,
      isCompleted: true,
      candidates: [defaultWord.trim()],
    };
  }

  // Handle 'do ' prefix in config modes
  let isDoPrefix = false;
  let workInput = trimmed;
  if (currentMode.startsWith('config') && workInput.toLowerCase().startsWith('do ')) {
    isDoPrefix = true;
    workInput = workInput.slice(3).trimStart();
  }

  // Determine starting root pool
  let rootPoolKey = '';
  if (!isDoPrefix) {
    if (currentMode === 'config-if') rootPoolKey = 'config-interface';
    else if (currentMode === 'config-router') rootPoolKey = 'config-router';
    else if (currentMode === 'config-vlan') rootPoolKey = 'config-vlan';
    else if (currentMode === 'config-line') rootPoolKey = 'config-line';
    else if (currentMode.startsWith('config') || currentMode.includes('config')) rootPoolKey = 'config';
  }

  let currentPool = (rootPoolKey && tree[rootPoolKey]) ? tree[rootPoolKey] : (tree[''] || []);
  let currentPath = rootPoolKey;
  const isEndingWithSpace = input.endsWith(' ');
  const tokens = workInput.split(/\s+/);
  const resolvedTokens: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const rawToken = tokens[i];
    const isLast = i === tokens.length - 1;
    const tok = rawToken.toLowerCase();

    // Check interface abbreviation (e.g. gi0/1, fa0/24)
    const expandedIface = expandInterfaceToken(rawToken);
    const hasExpandedIface = expandedIface !== rawToken;

    if (!isLast || isEndingWithSpace) {
      // Completed token: resolve against currentPool
      let match = currentPool.find((item) => item.command.toLowerCase() === tok);
      if (!match) {
        // Prefix match
        const prefixMatches = currentPool.filter((item) => item.command.toLowerCase().startsWith(tok));
        if (prefixMatches.length === 1) {
          match = prefixMatches[0];
        }
      }

      if (match) {
        resolvedTokens.push(match.command);
        currentPath = currentPath ? `${currentPath} ${match.command}` : match.command;
        currentPool = tree[currentPath] || [];
      } else if (hasExpandedIface) {
        resolvedTokens.push(expandedIface);
      } else {
        resolvedTokens.push(rawToken);
        currentPath = currentPath ? `${currentPath} ${tok}` : tok;
        currentPool = tree[currentPath] || [];
      }
    } else {
      // Last token being typed without trailing space: AUTOCOMPLETE CANDIDATE
      if (hasExpandedIface) {
        resolvedTokens.push(expandedIface);
        const prefixStr = isDoPrefix ? 'do ' : '';
        return {
          completedInput: leadingSpace + prefixStr + resolvedTokens.join(' ') + ' ',
          isCompleted: true,
          candidates: [expandedIface],
        };
      }

      // Match against currentPool
      let matches = currentPool.filter((item) => item.command.toLowerCase().startsWith(tok));

      // If no matches in current submode pool and this is the first token, check root pool
      if (matches.length === 0 && i === 0 && currentPath !== '') {
        const rootMatches = (tree[''] || []).filter((item) => item.command.toLowerCase().startsWith(tok));
        if (rootMatches.length > 0) {
          matches = rootMatches;
          currentPool = tree[''] || [];
          currentPath = '';
        }
      }

      if (matches.length === 0) {
        // Check if token matches standard interface type names (e.g. "gi" -> GigabitEthernet)
        const ifaceList = ['GigabitEthernet', 'FastEthernet', 'TenGigabitEthernet', 'FortyGigabitEthernet', 'HundredGigE', 'Loopback', 'Vlan', 'Port-channel', 'Cellular', 'Tunnel', 'Serial'];
        const ifaceMatches = ifaceList.filter((iface) => iface.toLowerCase().startsWith(tok));
        if (ifaceMatches.length === 1) {
          resolvedTokens.push(ifaceMatches[0]);
          const prefixStr = isDoPrefix ? 'do ' : '';
          return {
            completedInput: leadingSpace + prefixStr + resolvedTokens.join(' ') + ' ',
            isCompleted: true,
            candidates: [ifaceMatches[0]],
          };
        } else if (ifaceMatches.length > 1) {
          const common = getLongestCommonPrefix(ifaceMatches);
          resolvedTokens.push(common);
          const prefixStr = isDoPrefix ? 'do ' : '';
          return {
            completedInput: leadingSpace + prefixStr + resolvedTokens.join(' '),
            isCompleted: false,
            candidates: ifaceMatches,
          };
        }

        // No matches at all: return input as is
        return {
          completedInput: input,
          isCompleted: false,
          candidates: [],
        };
      }

      if (matches.length === 1) {
        // Exact single match found!
        resolvedTokens.push(matches[0].command);
        const prefixStr = isDoPrefix ? 'do ' : '';
        return {
          completedInput: leadingSpace + prefixStr + resolvedTokens.join(' ') + ' ',
          isCompleted: true,
          candidates: [matches[0].command],
        };
      }

      // Multiple matches: find longest common prefix
      const matchStrings = matches.map((m) => m.command);
      const commonPrefix = getLongestCommonPrefix(matchStrings);
      const chosenToken = commonPrefix.length > tok.length ? commonPrefix : tok;
      resolvedTokens.push(chosenToken);
      const prefixStr = isDoPrefix ? 'do ' : '';
      const formattedHelp = formatCandidatesHelpTable(matches, currentPath);

      return {
        completedInput: leadingSpace + prefixStr + resolvedTokens.join(' '),
        isCompleted: false,
        candidates: matchStrings,
        helpOutput: formattedHelp,
      };
    }
  }

  // If input ended with space (e.g. user typed "conf " or "show ip ")
  const prefixStr = isDoPrefix ? 'do ' : '';
  if (isEndingWithSpace) {
    if (currentPool.length === 1) {
      return {
        completedInput: leadingSpace + prefixStr + resolvedTokens.join(' ') + ' ' + currentPool[0].command + ' ',
        isCompleted: true,
        candidates: [currentPool[0].command],
      };
    } else if (currentPool.length > 1) {
      const formattedHelp = formatCandidatesHelpTable(currentPool, currentPath);
      return {
        completedInput: leadingSpace + prefixStr + resolvedTokens.join(' ') + ' ',
        isCompleted: false,
        candidates: currentPool.map((c) => c.command),
        helpOutput: formattedHelp,
      };
    }
  }

  return {
    completedInput: leadingSpace + prefixStr + resolvedTokens.join(' ') + (isEndingWithSpace ? ' ' : ''),
    isCompleted: true,
    candidates: [],
  };
}

/**
 * Handle '?' (Question Mark) Context-Sensitive Help
 */
export function handleCliContextHelp(
  input: string,
  brand: string = 'cisco',
  currentMode: string = 'privileged'
): { helpOutput: string; originalInput: string } {
  // Strip trailing '?' if present
  let cleanInput = input;
  if (cleanInput.endsWith('?')) {
    cleanInput = cleanInput.slice(0, -1);
  }

  const trimmed = cleanInput.trimStart();
  const tree = getCommandTreeForBrand(brand);

  // Handle 'do ' prefix in config modes
  let isDoPrefix = false;
  let workInput = trimmed;
  if (currentMode.startsWith('config') && workInput.toLowerCase().startsWith('do ')) {
    isDoPrefix = true;
    workInput = workInput.slice(3).trimStart();
  }

  // If empty input or just spaces -> show top-level commands
  if (!workInput) {
    let topPool = tree[''];
    if (!isDoPrefix) {
      if (currentMode === 'config-if') topPool = tree['config-interface'] || tree['config'];
      else if (currentMode === 'config-router') topPool = tree['config-router'] || tree['config'];
      else if (currentMode === 'config-vlan') topPool = tree['config-vlan'] || tree['config'];
      else if (currentMode === 'config-line') topPool = tree['config-line'] || tree['config'];
      else if (currentMode.startsWith('config') || currentMode.includes('config')) topPool = tree['config'] || tree[''];
    }

    const title = (!isDoPrefix && currentMode.startsWith('config')) ? 'Configuration commands:' : 'Exec commands:';
    const help = formatHelpTable(topPool || [], title);
    return {
      helpOutput: help,
      originalInput: cleanInput,
    };
  }

  const tokens = workInput.split(/\s+/);
  const isEndingWithSpace = cleanInput.endsWith(' ');

  let rootPoolKey = '';
  if (!isDoPrefix) {
    if (currentMode === 'config-if') rootPoolKey = 'config-interface';
    else if (currentMode === 'config-router') rootPoolKey = 'config-router';
    else if (currentMode === 'config-vlan') rootPoolKey = 'config-vlan';
    else if (currentMode === 'config-line') rootPoolKey = 'config-line';
    else if (currentMode.startsWith('config') || currentMode.includes('config')) rootPoolKey = 'config';
  }

  let currentPool = (rootPoolKey && tree[rootPoolKey]) ? tree[rootPoolKey] : (tree[''] || []);
  let currentPath = rootPoolKey;

  for (let i = 0; i < tokens.length; i++) {
    const rawToken = tokens[i];
    const isLast = i === tokens.length - 1;
    const tok = rawToken.toLowerCase();

    if (!isLast || isEndingWithSpace) {
      let match = currentPool.find((item) => item.command.toLowerCase() === tok);
      if (!match) {
        const prefixMatches = currentPool.filter((item) => item.command.toLowerCase().startsWith(tok));
        if (prefixMatches.length === 1) match = prefixMatches[0];
      }

      if (match) {
        currentPath = currentPath ? `${currentPath} ${match.command}` : match.command;
        currentPool = tree[currentPath] || [];
      } else {
        currentPath = currentPath ? `${currentPath} ${tok}` : tok;
        currentPool = tree[currentPath] || [];
      }
    } else {
      // Typing partial token: filter matches
      const matches = currentPool.filter((item) => item.command.toLowerCase().startsWith(tok));
      if (matches.length > 0) {
        return {
          helpOutput: formatHelpTable(matches, `Matching commands for '${tok}':`),
          originalInput: cleanInput,
        };
      }
    }
  }

  if (isEndingWithSpace && currentPool.length > 0) {
    return {
      helpOutput: formatHelpTable(currentPool, `Subcommands for '${tokens.join(' ')}':`),
      originalInput: cleanInput,
    };
  }

  return {
    helpOutput: `  <cr>                 Press Enter to execute '${tokens.join(' ')}'\n  <parameter>          Specify additional parameters/options`,
    originalInput: cleanInput,
  };
}

// Helpers for formatted CLI output table
function formatHelpTable(items: CliHelpItem[], title?: string): string {
  if (!items || items.length === 0) return '  (No additional subcommands)';
  
  const maxCmdLen = Math.max(...items.map((i) => i.command.length), 16);
  const lines: string[] = [];
  if (title) {
    lines.push(title);
  }

  items.forEach((item) => {
    const paddedCmd = item.command.padEnd(maxCmdLen + 4, ' ');
    lines.push(`  ${paddedCmd}${item.description}`);
  });

  return lines.join('\n');
}

function formatCandidatesHelpTable(items: CliHelpItem[], context: string): string {
  const maxCmdLen = Math.max(...items.map((i) => i.command.length), 16);
  const lines: string[] = [];
  
  items.forEach((item) => {
    const paddedCmd = item.command.padEnd(maxCmdLen + 4, ' ');
    lines.push(`  ${paddedCmd}${item.description}`);
  });

  return lines.join('\n');
}

function getLongestCommonPrefix(strings: string[]): string {
  if (!strings.length) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].toLowerCase().startsWith(prefix.toLowerCase())) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return '';
    }
  }
  return prefix;
}

