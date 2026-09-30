import { CommandReference, DeviceBrand } from '../types';
import { STAGING_COMMAND_DATABASE } from './stagingCommandCatalog';

const BASE_OFFLINE_COMMAND_DATABASE: CommandReference[] = [
  // =========================================================================
  // 1. CISCO (IOS-XE 17.x: Catalyst 9000 & Cat 8000 & WLC 9800; NX-OS: Nexus 9000)
  // Shared single OS-XE reference for Catalyst 9200/9300/9400/9500/9600 & Cat 8000
  // =========================================================================
  {
    id: 'cisco-show-run',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000 / ISR)',
    osFamily: 'ios-xe',
    category: 'show',
    categoryLabel: 'Melihat Konfigurasi (Running Config)',
    command: 'show running-config',
    description: 'Menampilkan seluruh konfigurasi aktif yang sedang berjalan di memori RAM router/switch Cisco.',
    explanationId: 'Gunakan command ini untuk memeriksa seluruh konfigurasi aktif. Tambahkan pipa filter seperti "| section ospf" atau "| include interface" untuk mempercepat pencarian.',
    sampleOutput: `Building configuration...
Current configuration : 4820 bytes
!
version 17.9
service timestamps debug datetime msec
service timestamps log datetime msec
hostname Catalyst-C9300-Core
!
boot-start-marker
boot-end-marker
!
vrf definition Mgmt-vrf
 address-family ipv4
 exit-address-family`,
    verificationTip: 'Periksa apakah ada perubahan yang belum disimpan. Simpan konfigurasi permanen ke NVRAM dengan "write memory" atau "copy running-config startup-config".',
    mode: 'privileged',
    tags: ['cisco', 'show', 'running-config', 'config', 'ios-xe', 'catalyst', 'cat9000', 'cat8000'],
  },
  {
    id: 'cisco-show-ip-int-br',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000)',
    osFamily: 'ios-xe',
    category: 'show',
    categoryLabel: 'Status Interface & IP Address Ringkas',
    command: 'show ip interface brief',
    description: 'Menampilkan ringkasan status fisik L1 (Status), protokol L2 (Protocol), dan alamat IPv4 pada seluruh interface.',
    explanationId: 'Status ideal untuk link aktif yang siap dilewati trafik adalah "Status: up" dan "Protocol: up". Jika Status "administratively down", jalankan "no shutdown". Jika Status "up" tapi Protocol "down", periksa speed, duplex, atau kabel fiber/RJ45.',
    sampleOutput: `Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet1/0/1   10.254.88.1     YES manual up                    up      
GigabitEthernet1/0/2   192.168.10.1    YES manual up                    up      
TenGigabitEthernet1/1/1 10.0.0.1       YES manual up                    up      
Vlan1                  unassigned      YES manual administratively down down    
Vlan10                 172.16.10.1     YES manual up                    up`,
    verificationTip: 'Pastikan Status dan Protocol keduanya "up".',
    mode: 'privileged',
    tags: ['cisco', 'show', 'interface', 'ip', 'status', 'up', 'down', 'ios-xe'],
  },
  {
    id: 'cisco-show-ip-route',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000)',
    osFamily: 'ios-xe',
    category: 'show',
    categoryLabel: 'Routing Table (Tabel Routing IPv4)',
    command: 'show ip route',
    description: 'Menampilkan tabel routing IPv4 (RIB), default gateway (Gateway of last resort), rute terhubung (C), static (S), OSPF (O), dan BGP (B).',
    explanationId: 'Melihat jalur keluar traffic. Jika "Gateway of last resort is not set", traffic internet ke IP publik tidak dapat diteruskan keluar.',
    sampleOutput: `Gateway of last resort is 203.0.113.1 to network 0.0.0.0

S*    0.0.0.0/0 [1/0] via 203.0.113.1, GigabitEthernet1/0/1
C        10.254.88.0/24 is directly connected, GigabitEthernet1/0/2
L        10.254.88.1/32 is directly connected, GigabitEthernet1/0/2
O        172.16.0.0/16 [110/2] via 10.0.0.2, 04:12:30, TenGigabitEthernet1/1/1
B        198.51.100.0/24 [20/0] via 10.0.0.2, 02:15:00`,
    verificationTip: 'Periksa baris S* 0.0.0.0/0 untuk memastikan default route terdaftar.',
    mode: 'privileged',
    tags: ['cisco', 'show', 'routing', 'route', 'gateway', 'rib', 'ios-xe'],
  },
  {
    id: 'cisco-show-bgp-summary',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000)',
    osFamily: 'ios-xe',
    category: 'bgp',
    categoryLabel: 'BGP Peering Summary',
    command: 'show ip bgp summary',
    description: 'Menampilkan ringkasan status neighbor BGP, AS number, state (Established/Active/Idle), dan jumlah prefix rute yang diterima.',
    explanationId: 'Kolom State/PfxRcd harus bernilai integer (misal: 24). Jika bernilai "Active" atau "Idle", koneksi TCP port 179 BGP sedang putus atau diblokir firewall.',
    sampleOutput: `BGP router identifier 10.254.88.1, local AS number 65001
BGP table version is 142, main routing table version 142
Neighbor        V           AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.0.0.2        4        65002   14209   14198      142    0    0 04:12:30       24
10.0.0.3        4        65003       0       0        1    0    0 00:00:00      Idle`,
    verificationTip: 'Jika Idle, uji konektivitas IP dengan "ping 10.0.0.3" dan pastikan port 179 terbuka.',
    mode: 'privileged',
    tags: ['cisco', 'bgp', 'show', 'peering', 'as', 'neighbor', 'established'],
  },
  {
    id: 'cisco-show-ospf-neighbor',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000)',
    osFamily: 'ios-xe',
    category: 'ospf',
    categoryLabel: 'OSPF Neighbor Adjacency',
    command: 'show ip ospf neighbor',
    description: 'Mengecek status adjacency OSPF v2 dengan router tetangga (Neighbor ID, State, Dead Time, Address, Interface).',
    explanationId: 'State OSPF normal harus "FULL/DR", "FULL/BDR", atau "FULL/ - " (pada link point-to-point). Jika "EXSTART" atau "2WAY", periksa kesesuaian MTU dan subnet mask.',
    sampleOutput: `Neighbor ID     Pri   State           Dead Time   Address         Interface
10.255.255.2      1   FULL/DR         00:00:34    10.0.0.2        TenGigabitEthernet1/1/1
10.255.255.3      1   FULL/BDR        00:00:38    10.0.0.3        TenGigabitEthernet1/1/2`,
    verificationTip: 'Dead Time harus selalu mereset countdown dari 40s (atau interval yang ditentukan).',
    mode: 'privileged',
    tags: ['cisco', 'ospf', 'neighbor', 'adjacency', 'full', 'dr', 'bdr'],
  },
  {
    id: 'cisco-show-ipsec-sa',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Cat 8000 / ISR / Catalyst Router)',
    osFamily: 'ios-xe',
    category: 'vpn',
    categoryLabel: 'IPsec VPN Tunnel SA Status',
    command: 'show crypto ipsec sa',
    description: 'Menampilkan detail Security Association (SA) IPsec Phase 2, status enkapsulasi ESP, dan jumlah paket encrypt/decrypt.',
    explanationId: 'Memverifikasi apakah traffic IPsec VPN mengalir dua arah. Jumlah "#pkts encaps" dan "#pkts decaps" harus sama-sama terus bertambah.',
    sampleOutput: `interface: Tunnel1
   Crypto map tag: Tunnel1-head-0, local addr 203.0.113.10
   protected vrf: (none)
   local  ident (addr/mask/prot/port): (192.168.10.0/255.255.255.0/0/0)
   remote ident (addr/mask/prot/port): (192.168.20.0/255.255.255.0/0/0)
   current_peer 198.51.100.20 port 500
     #pkts encaps: 14500, #pkts encrypt: 14500, #pkts digest: 14500
     #pkts decaps: 14480, #pkts decrypt: 14480, #pkts verify: 14480`,
    verificationTip: 'Jika #pkts decaps 0, traffic dari remote router diblokir ISP atau ada masalah NAT traversal UDP 4500.',
    mode: 'privileged',
    tags: ['cisco', 'ipsec', 'vpn', 'crypto', 'sa', 'phase2', 'esp'],
  },
  {
    id: 'cisco-config-basic-suite',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000)',
    osFamily: 'ios-xe',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi Dasar: Hostname, NTP, Interface IP, VLAN & Static Route',
    command: `configure terminal
hostname Catalyst-C9300-Core
ip domain-name enterprise.local
ntp server 10.254.88.254 prefer
!
vlan 10
 name DATA_USERS
vlan 20
 name VOICE_MGMT
!
interface GigabitEthernet1/0/1
 description UPLINK-TO-FIREWALL
 no switchport
 ip address 10.254.88.215 255.255.255.0
 no shutdown
!
interface GigabitEthernet1/0/2
 description ACCESS-PORT-VLAN10
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 no shutdown
!
ip route 0.0.0.0 0.0.0.0 10.254.88.1
end
write memory`,
    description: 'Template konfigurasi dasar Cisco IOS-XE lengkap: penetapan hostname, NTP server, pembuatan VLAN 10/20, konfigurasi interface L3/L2, dan default routing.',
    explanationId: 'Jalankan blok konfigurasi ini di mode privilege (#). Perintah "write memory" akan menyimpan konfigurasi secara permanen ke NVRAM.',
    verificationTip: 'Cek hasil konfigurasi dengan "show running-config" dan simpan ke NVRAM.',
    mode: 'config',
    tags: ['cisco', 'config', 'hostname', 'ntp', 'vlan', 'interface', 'static', 'route'],
  },
  {
    id: 'cisco-config-bgp-ospf-nat',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000 Router)',
    osFamily: 'ios-xe',
    category: 'routing',
    categoryLabel: 'Konfigurasi BGP, OSPF & NAT Overload',
    command: `configure terminal
! 1. OSPF Routing
router ospf 1
 router-id 10.255.255.1
 network 10.0.0.0 0.0.0.3 area 0
 network 172.16.10.0 0.0.0.255 area 0
!
! 2. BGP Routing
router bgp 65001
 bgp router-id 10.254.88.1
 bgp log-neighbor-changes
 neighbor 10.0.0.2 remote-as 65002
 neighbor 10.0.0.2 description PEER-TO-ISP
 address-family ipv4 unicast
  neighbor 10.0.0.2 activate
  network 192.168.10.0 mask 255.255.255.0
 exit-address-family
!
! 3. NAT Overload (PAT)
ip access-list standard NAT_LAN
 permit 192.168.10.0 0.0.0.255
ip nat inside source list NAT_LAN interface GigabitEthernet1/0/1 overload
end
write memory`,
    description: 'Konfigurasi routing dinamis OSPF Area 0, BGP Peering eBGP AS65001-AS65002, dan Source NAT Overload (PAT) untuk akses internet LAN.',
    explanationId: 'Template standar untuk enterprise router yang terhubung ke ISP dan jaringan internal core OSPF.',
    verificationTip: 'Verifikasi dengan "show ip bgp summary", "show ip ospf neighbor", dan "show ip nat translations".',
    mode: 'config',
    tags: ['cisco', 'bgp', 'ospf', 'nat', 'pat', 'routing', 'config'],
  },

  // =========================================================================
  // 2. FORTINET (FortiOS 7.2 / 7.4: FortiGate 40F - 1000F, FMG, FAZ)
  // Shared single FortiOS reference for all FortiGate models
  // =========================================================================
  {
    id: 'forti-show-config',
    brand: 'fortinet',
    modelCategory: 'Fortinet FortiOS 7.x (FortiGate NGFW)',
    osFamily: 'fortios',
    category: 'show',
    categoryLabel: 'Melihat Seluruh Konfigurasi (Show Full-Config)',
    command: 'show full-configuration',
    description: 'Menampilkan seluruh konfigurasi firewall FortiGate termasuk nilai parameter default sistem.',
    explanationId: 'Untuk melihat bagian tertentu saja, gunakan "show system interface" atau "show router bgp" atau "show firewall policy".',
    sampleOutput: `config system global
    set hostname "FG-100F-HQ"
    set timezone 55
    set admintimeout 30
end`,
    verificationTip: 'Gunakan "| grep <kata>" untuk menyaring output di FortiOS CLI.',
    mode: 'privileged',
    tags: ['fortinet', 'fortigate', 'show', 'config', 'fortios', 'full-configuration'],
  },
  {
    id: 'forti-show-int-status',
    brand: 'fortinet',
    modelCategory: 'Fortinet FortiOS 7.x (FortiGate NGFW)',
    osFamily: 'fortios',
    category: 'show',
    categoryLabel: 'Status Interface Fisik & Hardware NIC',
    command: 'get system interface physical',
    description: 'Melihat status fisik port, speed/duplex (1000Mbps Full), MAC address, dan link UP/DOWN seluruh port FortiGate.',
    explanationId: 'Command tercepat untuk mendeteksi apakah kabel jaringan fisik terhubung dan negosiasi duplex normal.',
    sampleOutput: `Interface wan1: mode=static, link=up, speed=1000Mbps, duplex=full, mtu=1500
Interface wan2: mode=dhcp, link=up, speed=1000Mbps, duplex=full, mtu=1500
Interface internal1: mode=static, link=up, speed=1000Mbps, duplex=full, mtu=1500
Interface internal2: mode=static, link=down, speed=0Mbps, duplex=half, mtu=1500`,
    verificationTip: 'Port harus menunjukkan "link=up, speed=1000Mbps, duplex=full".',
    mode: 'privileged',
    tags: ['fortinet', 'fortigate', 'interface', 'status', 'nic', 'link', 'speed'],
  },
  {
    id: 'forti-show-route-bgp-ospf',
    brand: 'fortinet',
    modelCategory: 'Fortinet FortiOS 7.x (FortiGate NGFW)',
    osFamily: 'fortios',
    category: 'routing',
    categoryLabel: 'Tabel Routing & Status BGP / OSPF FortiOS',
    command: 'get router info routing-table all\nget router info bgp summary\nget router info ospf neighbor',
    description: 'Melihat tabel routing lengkap, status sesi peering BGP, dan status neighbor OSPF pada FortiOS.',
    explanationId: 'Memeriksa jalur keluar traffic firewall dan status konektivitas routing dinamis.',
    sampleOutput: `Routing table:
S*      0.0.0.0/0 [10/0] via 203.0.113.1, wan1
C       10.254.88.0/24 is directly connected, internal1
B       172.16.0.0/16 [20/0] via 10.0.0.2, 02:45:10

BGP summary:
Neighbor        V         AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.0.0.2        4      65002    1450    1452       28    0    0 01:23:45           12`,
    verificationTip: 'Periksa baris S* 0.0.0.0/0 untuk memastikan konektivitas WAN aktif.',
    mode: 'privileged',
    tags: ['fortinet', 'fortigate', 'routing', 'bgp', 'ospf', 'table'],
  },
  {
    id: 'forti-show-ipsec',
    brand: 'fortinet',
    modelCategory: 'Fortinet FortiOS 7.x (FortiGate NGFW)',
    osFamily: 'fortios',
    category: 'vpn',
    categoryLabel: 'Status IPsec VPN Tunnel Phase 1 & 2',
    command: 'diagnose vpn ike gateway list\ndiagnose vpn tunnel list',
    description: 'Memeriksa status tunnel VPN IPsec Phase 1 (IKE SA) dan Phase 2 (ESP packets in/out).',
    explanationId: 'Status Phase 1 harus "established". Pada "diagnose vpn tunnel list", parameter "enc: packets" dan "dec: packets" keduanya harus bertambah aktif.',
    sampleOutput: `vd: root/0
name: HQ_BRANCH_VPN
version: 2
interface: wan1 5
addr: 203.0.113.10:500 -> 198.51.100.20:500
status: established 1-1
lifetime: 28800/24280s

name=HQ_BRANCH_VPN_0 ver=2 serial=1
  tun_id=10.0.0.1 tun_mtu=1440
  dec: packets=14520 bytes=1858560 err=0
  enc: packets=14600 bytes=1920000 err=0`,
    verificationTip: 'Jika status negotiating atau down, periksa Pre-Shared Key (PSK) dan Phase 1 Proposal.',
    mode: 'diagnostic',
    tags: ['fortinet', 'vpn', 'ipsec', 'ike', 'phase1', 'phase2', 'tunnel'],
  },
  {
    id: 'forti-config-basic-sdwan',
    brand: 'fortinet',
    modelCategory: 'Fortinet FortiOS 7.x (FortiGate NGFW)',
    osFamily: 'fortios',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi Dasar FortiOS: Hostname, NTP, Interface, Static Route & SD-WAN',
    command: `config system global
    set hostname "FG-100F-HQ"
    set timezone 55
end
config system ntp
    set ntpsync enable
    set server-mode disable
    config ntpserver
        edit 1
            set server "10.254.88.254"
        next
    end
end
config system interface
    edit "wan1"
        set mode static
        set ip 203.0.113.10 255.255.255.0
        set allowaccess ping https ssh
    next
    edit "lan"
        set mode static
        set ip 192.168.10.1 255.255.255.0
        set allowaccess ping https ssh fabric
    next
end
config router static
    edit 1
        set gateway 203.0.113.1
        set device "wan1"
    next
end
config firewall policy
    edit 1
        set name "LAN-TO-INTERNET"
        set srcintf "lan"
        set dstintf "wan1"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set nat enable
    next
end`,
    description: 'Konfigurasi lengkap FortiOS: Hostname, NTP sync, interface WAN & LAN IP, default static route, dan Firewall Policy NAT enable.',
    explanationId: 'Menyediakan policy firewall dasar untuk meneruskan traffic dari LAN ke WAN dengan fitur Source NAT aktif.',
    verificationTip: 'Uji ping ke internet dari client LAN untuk memverifikasi NAT policy.',
    mode: 'config',
    tags: ['fortinet', 'fortigate', 'config', 'hostname', 'ntp', 'interface', 'nat', 'policy'],
  },
  {
    id: 'forti-config-ha-failover',
    brand: 'fortinet',
    modelCategory: 'Fortinet FortiOS 7.x (FortiGate NGFW)',
    osFamily: 'fortios',
    category: 'ha_failover',
    categoryLabel: 'Konfigurasi High Availability (HA) Active-Passive Cluster',
    command: `config system ha
    set group-id 10
    set group-name "FG-HQ-CLUSTER"
    set mode a-p
    set hbdev "ha1" 50 "ha2" 50
    set session-pickup enable
    set override disable
    set priority 200
end`,
    description: 'Konfigurasi HA Active-Passive cluster pada FortiGate dengan dedicated heartbeat ports (ha1, ha2) dan session synchronization.',
    explanationId: 'Node dengan priority lebih tinggi (misal: 200 vs 100) akan bertindak sebagai Primary node.',
    verificationTip: 'Periksa status sinkronisasi cluster dengan command "get system ha status".',
    mode: 'config',
    tags: ['fortinet', 'ha', 'cluster', 'failover', 'active-passive', 'sync'],
  },

  // =========================================================================
  // 3. JUNIPER (Junos OS 21.x/22.x/23.x: EX Switches, QFX, MX Routers, SRX Firewalls)
  // Shared single Junos OS reference
  // =========================================================================
  {
    id: 'juniper-show-config',
    brand: 'juniper',
    modelCategory: 'Juniper Junos OS (EX / QFX / MX / SRX)',
    osFamily: 'junos',
    category: 'show',
    categoryLabel: 'Melihat Konfigurasi (Show Configuration)',
    command: 'show configuration | display set',
    description: 'Menampilkan seluruh konfigurasi Junos OS dalam format "set" baris-per-baris yang mudah disalin atau dimodifikasi.',
    explanationId: 'Format "display set" sangat efisien untuk troubleshooting dan migrasi konfigurasi.',
    sampleOutput: `set version 22.4R1.10
set system host-name EX4400-Core
set system time-zone Asia/Jakarta
set interfaces ge-0/0/0 unit 0 family inet address 10.254.88.215/24
set routing-options static route 0.0.0.0/0 next-hop 10.254.88.1`,
    verificationTip: 'Untuk melihat struktur hirarki, gunakan "show configuration".',
    mode: 'privileged',
    tags: ['juniper', 'junos', 'show', 'config', 'display set', 'ex4400', 'srx'],
  },
  {
    id: 'juniper-show-terse-route',
    brand: 'juniper',
    modelCategory: 'Juniper Junos OS (EX / QFX / MX / SRX)',
    osFamily: 'junos',
    category: 'show',
    categoryLabel: 'Status Interface Terse & Routing Table (inet.0)',
    command: 'show interfaces terse\nshow route',
    description: 'Melihat status link fisik dan protokol interface ge-, xe-, et-, ae-, serta tabel routing inet.0 pada Junos OS.',
    explanationId: 'Periksa apakah status Admin dan Link keduanya "up".',
    sampleOutput: `Interface               Admin Link Proto    Local                 Remote
ge-0/0/0                up    up
ge-0/0/0.0              up    up   inet     10.254.88.215/24
ge-0/0/1                up    up   eth-switch

inet.0: 4 destinations, 4 routes (4 active, 0 holddown, 0 hidden)
+ = Active Route, - = Last Active, * = Both
0.0.0.0/0          *[Static/5] 04:12:30
                    > to 10.254.88.1 via ge-0/0/0.0
10.254.88.0/24     *[Direct/0] 04:12:30
                    > via ge-0/0/0.0`,
    verificationTip: 'Pastikan baris default route 0.0.0.0/0 memiliki tanda bintang (*) sebagai active route.',
    mode: 'privileged',
    tags: ['juniper', 'junos', 'interface', 'terse', 'route', 'inet.0'],
  },
  {
    id: 'juniper-show-bgp-ospf-ipsec',
    brand: 'juniper',
    modelCategory: 'Juniper Junos OS (EX / QFX / MX / SRX)',
    osFamily: 'junos',
    category: 'routing',
    categoryLabel: 'Status BGP Summary, OSPF Neighbor & IPsec SA',
    command: 'show bgp summary\nshow ospf neighbor\nshow security ipsec security-associations',
    description: 'Mengecek peering BGP, OSPF neighbor adjacency, dan status Security Association IPsec pada Juniper Junos OS.',
    explanationId: 'Pada Junos OS, status BGP aktif ditandai "Establ" dan OSPF ditandai "Full".',
    sampleOutput: `Groups: 1 Peers: 1 Down peers: 0
Peer                     AS      InPkt     OutPkt    OutQ   Flaps Last Up/Dwn State|#Active/Received/Accepted/Damped...
10.0.0.2              65002       3201       3200       0       0     04:12:30 Establ
  inet.0: 24/24/24/0

Address          Interface              State     ID               Pri  Dead
10.0.0.2         ge-0/0/1.0             Full      10.255.255.2     128    36`,
    verificationTip: 'Gunakan "show security ipsec statistics" pada SRX firewall untuk melihat packet loss.',
    mode: 'privileged',
    tags: ['juniper', 'junos', 'bgp', 'ospf', 'ipsec', 'srx', 'established'],
  },
  {
    id: 'juniper-config-basic-suite',
    brand: 'juniper',
    modelCategory: 'Juniper Junos OS (EX / QFX / MX / SRX)',
    osFamily: 'junos',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi Dasar Junos: Hostname, NTP, Interface, VLAN & Commit',
    command: `configure
set system host-name EX4400-Core
set system time-zone Asia/Jakarta
set system ntp server 10.254.88.254 prefer
!
set vlans DATA_VLAN vlan-id 10
set vlans VOICE_VLAN vlan-id 20
!
set interfaces ge-0/0/0 unit 0 family inet address 10.254.88.215/24
set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access
set interfaces ge-0/0/1 unit 0 family ethernet-switching vlan members DATA_VLAN
!
set routing-options static route 0.0.0.0/0 next-hop 10.254.88.1
commit check
commit and-quit`,
    description: 'Konfigurasi dasar Junos OS lengkap: penetapan host-name, NTP server, pembuatan VLAN 10/20, konfigurasi interface IP/switchport, default route, dan commit.',
    explanationId: 'Junos OS memerlukan perintah "commit" agar perubahan konfigurasi diterapkan ke sistem.',
    verificationTip: 'Gunakan "commit check" untuk memvalidasi sintaks sebelum "commit".',
    mode: 'config',
    tags: ['juniper', 'junos', 'config', 'hostname', 'ntp', 'vlan', 'interface', 'commit'],
  },

  // =========================================================================
  // 4. ARUBA (ArubaOS-CX 10.x: 6000, 6100, 6200, 6300, 6400, 8325, 8360, 8400)
  // Shared single ArubaOS-CX reference
  // =========================================================================
  {
    id: 'aruba-cx-show-all',
    brand: 'aruba',
    modelCategory: 'Aruba AOS-CX 10.x (Switch 6000 / 6300 / 8325 / 8360)',
    osFamily: 'aoscx',
    category: 'show',
    categoryLabel: 'Melihat Konfigurasi, Interface & Routing AOS-CX',
    command: 'show running-config\nshow interface brief\nshow ip route\nshow bgp all-vrf summary\nshow ospf neighbors',
    description: 'Suite lengkap perintah show pada ArubaOS-CX switch: konfigurasi aktif, status port brief, IP route, BGP all-VRF, dan OSPF neighbor.',
    explanationId: 'Aruba CX menggunakan sintaks modern berbasis Linux Network NOS.',
    sampleOutput: `Aruba-CX-6300# show interface brief
--------------------------------------------------------------------------------
Port  Native  Mode   Type      Enabled Status  Reason     Speed  Duplex
--------------------------------------------------------------------------------
1/1/1 --      routed 10G-BaseT yes     up      --         10000  full
1/1/2 10      access 10G-BaseT yes     up      --         1000   full

VRF: default
BGP router identifier 10.254.88.1, local AS number 65001
Neighbor        V   AS       MsgRcvd   MsgSent   TblVer  InQ  OutQ  Up/Down    State/PfxRcd
10.0.0.2        4   65002    1240      1242      85      0    0     04:12:30   Established (24)`,
    verificationTip: 'Periksa State "Established" pada BGP dan Status "up" pada port.',
    mode: 'privileged',
    tags: ['aruba', 'aoscx', 'cx6300', 'cx8325', 'show', 'bgp', 'ospf', 'route'],
  },
  {
    id: 'aruba-cx-config-basic-vsx',
    brand: 'aruba',
    modelCategory: 'Aruba AOS-CX 10.x (Switch 6000 / 6300 / 8325)',
    osFamily: 'aoscx',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi Dasar AOS-CX: Hostname, NTP, Interface, VLAN & VSX HA',
    command: `configure
hostname Aruba-CX-6300-Core
ntp server 10.254.88.254 prefer
!
vlan 10
    name DATA_USERS
vlan 20
    name VOICE_MGMT
!
interface 1/1/1
    no shutdown
    description UPLINK-ROUTER
    ip address 10.254.88.215/24
!
interface 1/1/2
    no shutdown
    description ACCESS-USER-VLAN10
    vlan access 10
!
ip route 0.0.0.0/0 10.254.88.1
!
router bgp 65001
    router-id 10.254.88.1
    neighbor 10.0.0.2 remote-as 65002
    address-family ipv4 unicast
        neighbor 10.0.0.2 activate
        network 192.168.10.0/24
    exit
exit`,
    description: 'Konfigurasi standar ArubaOS-CX switch: hostname, NTP, pembuatan VLAN, port routed/access, static route, dan BGP peering.',
    explanationId: 'Konfigurasi langsung tersimpan ke running-config. Jalankan "copy running-config startup-config" untuk menyimpan permanen.',
    verificationTip: 'Gunakan "show running-config" untuk meninjau perubahan.',
    mode: 'config',
    tags: ['aruba', 'aoscx', 'config', 'hostname', 'vlan', 'interface', 'bgp', 'route'],
  },

  // =========================================================================
  // 5. RUCKUS (FastIron 09.x / 10.x: ICX 7150, ICX 7450, ICX 7650, ICX 7850, ICX 8200)
  // Shared single Ruckus FastIron reference
  // =========================================================================
  {
    id: 'ruckus-icx-show-all',
    brand: 'ruckus',
    modelCategory: 'Ruckus FastIron (ICX 7150 / 7450 / 7850 / 8200)',
    osFamily: 'fastiron',
    category: 'show',
    categoryLabel: 'Melihat Konfigurasi, VLAN & Interface ICX FastIron',
    command: 'show running-config\nshow ip interface\nshow ip route\nshow vlan brief\nshow stack',
    description: 'Suite perintah show pada switch Ruckus FastIron: running-config, IP interface, VLAN tagging, dan status stack ring.',
    explanationId: 'Pada Ruckus FastIron CLI, port yang membawa banyak VLAN dikonfigurasi sebagai "tagged".',
    sampleOutput: `Total VLANs : 2
VLAN  Name             Status   Ports
----  ---------------  -------  ----------------------------------------
1     DEFAULT-VLAN     ACTIVE   Untagged: 1/1/1 to 1/1/24
10    DATA_VLAN        ACTIVE   Tagged: 1/2/1, 1/2/2  Untagged: 1/1/25 to 1/1/48

Topology: Ring
Unit  Type          Role      MAC Address     Pri  State
1     ICX7850-48FS  active    d4:c1:9e:11:22:01 128  local
2     ICX7850-48FS  standby   d4:c1:9e:11:22:02 100  remote`,
    verificationTip: 'Pastikan status stack bertuliskan "Topology: Ring".',
    mode: 'privileged',
    tags: ['ruckus', 'icx', 'fastiron', 'show', 'vlan', 'stack', 'running-config'],
  },
  {
    id: 'ruckus-icx-config-basic',
    brand: 'ruckus',
    modelCategory: 'Ruckus FastIron (ICX 7150 / 7450 / 7850 / 8200)',
    osFamily: 'fastiron',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi Dasar Ruckus FastIron: Hostname, NTP, VLAN Tagging & Routing',
    command: `configure terminal
hostname ICX7850-Core
ntp server 10.254.88.254
!
vlan 10 name DATA_USERS
 tagged ethernet 1/2/1 ethernet 1/2/2
 untagged ethernet 1/1/1 to 1/1/24
 router-interface ve 10
!
interface ve 10
 ip address 192.168.10.1 255.255.255.0
!
ip route 0.0.0.0 0.0.0.0 10.254.88.1
end
write memory`,
    description: 'Konfigurasi dasar Ruckus FastIron: Hostname, NTP, Virtual Ethernet (ve) SVI L3, tagging port uplink, untagged access ports, dan default route.',
    explanationId: 'Perintah "write memory" akan menyimpan konfigurasi ke flash startup config.',
    verificationTip: 'Verifikasi dengan "show ip route" dan "show vlan brief".',
    mode: 'config',
    tags: ['ruckus', 'icx', 'fastiron', 'config', 'vlan', 've', 'tagged', 'untagged'],
  },

  // =========================================================================
  // 6. HPE (Comware 7: FlexFabric 5940, 5900, 5710, 5130 & ArubaOS-S)
  // Shared single HPE Comware 7 reference
  // =========================================================================
  {
    id: 'hpe-comware-show-all',
    brand: 'hpe',
    modelCategory: 'HPE Comware 7 (FlexFabric 5940 / 5900 / 5710 / 5130)',
    osFamily: 'comware',
    category: 'show',
    categoryLabel: 'Melihat Konfigurasi & Status Interface Comware 7',
    command: 'display current-configuration\ndisplay interface brief\ndisplay ip routing-table\ndisplay bgp peer ipv4\ndisplay ospf peer',
    description: 'Suite lengkap perintah display pada HPE Comware 7: current-configuration, status interface brief, routing-table, BGP peer, dan OSPF peer.',
    explanationId: 'Pada HPE Comware CLI, semua perintah monitoring diawali kata "display".',
    sampleOutput: `<HPE-5940> display interface brief
Brief information on interfaces in bridge mode:
Interface            Link Speed   Duplex Type PVID Description
GE1/0/1              UP   1G(a)   F(a)   A    1    UPLINK-FIREWALL
GE1/0/2              UP   10G(a)  F(a)   T    1    TRUNK-TO-CORE

<HPE-5940> display bgp peer ipv4
 BGP local router ID : 10.254.88.1
 Local AS number : 65001
 Total number of peers : 1                 Peers in established state : 1

  Peer                    AS  MsgRcvd  MsgSent OutQ PrefRcv Up/Down  State
  10.0.0.2             65002     1420     1422    0      24 04:12:30 Established`,
    verificationTip: 'Periksa kolom Link "UP" dan BGP State "Established".',
    mode: 'privileged',
    tags: ['hpe', 'comware', 'flexfabric', 'display', 'show', 'bgp', 'ospf', 'routing'],
  },
  {
    id: 'hpe-comware-config-basic',
    brand: 'hpe',
    modelCategory: 'HPE Comware 7 (FlexFabric 5940 / 5900 / 5710 / 5130)',
    osFamily: 'comware',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi Dasar HPE Comware: Sysname, NTP, VLAN, Interface & Static Route',
    command: `system-view
sysname HPE-5940-Core
ntp-service enable
ntp-service unicast-server 10.254.88.254
!
vlan 10
 description DATA_USERS
vlan 20
 description VOICE_MGMT
!
interface GigabitEthernet1/0/1
 port link-mode route
 ip address 10.254.88.215 255.255.255.0
 quit
!
interface Vlan-interface10
 ip address 192.168.10.1 255.255.255.0
 quit
!
ip route-static 0.0.0.0 0.0.0.0 10.254.88.1
!
save force
return`,
    description: 'Template konfigurasi dasar HPE Comware 7: sysname, NTP, VLAN 10/20, Vlan-interface SVI, port routed L3, default static route, dan save force.',
    explanationId: 'Pada Comware, masuk ke mode konfigurasi dengan "system-view" dan simpan dengan "save force".',
    verificationTip: 'Verifikasi dengan "display ip routing-table".',
    mode: 'config',
    tags: ['hpe', 'comware', 'config', 'sysname', 'vlan', 'ntp', 'interface', 'static'],
  },

  // =========================================================================
  // 7. DELL (Dell SmartFabric OS10: PowerSwitch S4100, S5200, Z9264F)
  // Shared single Dell OS10 reference
  // =========================================================================
  {
    id: 'dell-os10-show-all',
    brand: 'dell',
    modelCategory: 'Dell SmartFabric OS10 (PowerSwitch S4100 / S5200 / Z9264F)',
    osFamily: 'os10',
    category: 'show',
    categoryLabel: 'Melihat Konfigurasi, Interface & Routing Dell OS10',
    command: 'show running-configuration\nshow interface status\nshow ip route\nshow ip bgp summary\nshow ip ospf neighbor',
    description: 'Suite lengkap perintah show pada Dell PowerSwitch OS10: running-config, status port physical, routing table, BGP summary, dan OSPF neighbor.',
    explanationId: 'Dell OS10 menggunakan sintaks CLI standar industri dengan performa switching tinggi.',
    sampleOutput: `OS10-S5248# show interface status
Port       Description  Status Speed   Duplex Mode Vlan Tagged-Vlans
ethernet1/1/1           up     25G     full   L3   --   --
ethernet1/1/2           up     25G     full   T    1    10,20

OS10-S5248# show ip bgp summary
BGP router identifier 10.254.88.1, local AS number 65001
Neighbor        AS          MsgRcvd MsgSent Up/Down  State/PfxRcd
10.0.0.2        65002       1420    1422    04:12:30 Established(24)`,
    verificationTip: 'Periksa status port "up" dan BGP State "Established".',
    mode: 'privileged',
    tags: ['dell', 'os10', 'powerswitch', 'show', 'bgp', 'ospf', 'routing', 's5200'],
  },
  {
    id: 'dell-os10-config-basic',
    brand: 'dell',
    modelCategory: 'Dell SmartFabric OS10 (PowerSwitch S4100 / S5200 / Z9264F)',
    osFamily: 'os10',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi Dasar Dell OS10: Hostname, NTP, Interface, VLAN & Routing',
    command: `configure terminal
hostname OS10-S5248-Core
ntp server 10.254.88.254
!
interface vlan10
 description DATA_USERS
 ip address 192.168.10.1/24
 no shutdown
!
interface ethernet1/1/1
 description UPLINK-ROUTER
 no switchport
 ip address 10.254.88.215/24
 no shutdown
!
interface ethernet1/1/2
 description TRUNK-TO-ACCESS
 switchport mode trunk
 switchport trunk allowed vlan 10,20
 no shutdown
!
ip route 0.0.0.0/0 10.254.88.1
end
write memory`,
    description: 'Konfigurasi dasar Dell OS10: Hostname, NTP sync, VLAN SVI L3, port L3 routed, port L2 trunk, static route, dan write memory.',
    explanationId: 'Template standar untuk data center switch Dell PowerSwitch OS10.',
    verificationTip: 'Gunakan "show running-configuration" dan simpan dengan "write memory".',
    mode: 'config',
    tags: ['dell', 'os10', 'config', 'hostname', 'vlan', 'ntp', 'interface', 'static'],
  },

  // =========================================================================
  // 8. LINUX SERVER (Ubuntu 24.04/22.04 LTS, Debian 12, RHEL 9, Rocky 9, Alpine)
  // Shared single Linux Server reference
  // =========================================================================
  {
    id: 'linux-show-all-status',
    brand: 'linux',
    modelCategory: 'Linux Server (Ubuntu / Debian / RHEL / Rocky)',
    osFamily: 'linux-server',
    category: 'show',
    categoryLabel: 'Melihat IP Address, Interface, Routing Table & Listening Ports',
    command: 'ip a\nip route show\nss -tulpn\nsystemctl list-units --type=service --state=running',
    description: 'Melihat konfigurasi seluruh antarmuka jaringan (IP address, MAC, MTU), tabel rute default gateway, port socket TCP/UDP yang sedang listening, dan service systemd aktif.',
    explanationId: 'Command primer untuk sysadmin memeriksa status jaringan dan service server Linux secara instan.',
    sampleOutput: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    inet 127.0.0.1/8 scope host lo
2: ens34: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP
    inet 10.254.88.215/24 brd 10.254.88.255 scope global ens34

default via 10.254.88.1 dev ens34 proto static onlink 
10.254.88.0/24 dev ens34 proto kernel scope link src 10.254.88.215

Netid  State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process
tcp    LISTEN  0       128      0.0.0.0:22           0.0.0.0:*          users:(("sshd",pid=845,fd=3))
tcp    LISTEN  0       511      0.0.0.0:80           0.0.0.0:*          users:(("nginx",pid=1204,fd=6))
tcp    LISTEN  0       4096     0.0.0.0:443          0.0.0.0:*          users:(("nginx",pid=1204,fd=7))`,
    verificationTip: 'Periksa baris default via untuk memastikan default gateway terkonfigurasi.',
    mode: 'privileged',
    tags: ['linux', 'ip', 'interface', 'route', 'ss', 'systemctl', 'show', 'ubuntu', 'debian', 'rhel'],
  },
  {
    id: 'linux-config-hostname-netplan-dns',
    brand: 'linux',
    modelCategory: 'Linux Server (Ubuntu / Debian / RHEL)',
    osFamily: 'linux-server',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi Hostname, IP Static (Netplan/nmcli), DNS & DHCP',
    command: `# 1. Set Hostname Permanen
sudo hostnamectl set-hostname ubuntu-prod-01

# 2. Konfigurasi IP Static Netplan (Ubuntu / Debian)
cat << 'EOF' | sudo tee /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens34:
      dhcp4: no
      addresses:
        - 10.254.88.215/24
      routes:
        - to: default
          via: 10.254.88.1
      nameservers:
        addresses: [10.254.88.254, 8.8.8.8, 1.1.1.1]
EOF
sudo netplan apply

# 3. Verifikasi DNS Resolv
resolvectl status ens34`,
    description: 'Konfigurasi lengkap Linux Server: penetapan hostname via hostnamectl, IP static dan default gateway via Netplan YAML, nameservers DNS resolver, dan netplan apply.',
    explanationId: 'Gunakan netplan apply untuk menerapkan perubahan konfigurasi IP address secara permanen di Ubuntu/Debian.',
    verificationTip: 'Verifikasi hasil dengan "hostname" dan "ip a" serta "resolvectl status".',
    mode: 'config',
    tags: ['linux', 'hostname', 'netplan', 'ip', 'static', 'dns', 'dhcp', 'ubuntu'],
  },
  {
    id: 'linux-domain-join-ad',
    brand: 'linux',
    modelCategory: 'Linux Server (Ubuntu / Debian / RHEL)',
    osFamily: 'linux-server',
    category: 'server_admin',
    categoryLabel: 'Join Domain Active Directory (realm join / SSSD / Samba)',
    command: `# 1. Install paket Active Directory integration
sudo apt update && sudo apt install -y realmd sssd sssd-tools adcli samba-common-bin packagekit

# 2. Discover Domain Controller
realm discover enterprise.local

# 3. Join Server Linux ke Domain Windows Active Directory
sudo realm join -U Administrator enterprise.local

# 4. Izinkan login user domain dan buat home directory otomatis
sudo pam-auth-update --enable mkhomedir
sudo realm permit -g "Domain Admins"

# 5. Verifikasi status domain join
realm list
id "administrator@enterprise.local"`,
    description: 'Panduan langkah demi langkah menggabungkan (join) server Linux ke domain Windows Active Directory menggunakan realmd dan SSSD.',
    explanationId: 'Setelah join domain berhasil, user Active Directory dapat langsung melakukan login SSH ke server Linux dengan credential domain.',
    verificationTip: 'Periksa baris "configured: kerberos-member" pada output "realm list".',
    mode: 'privileged',
    tags: ['linux', 'ad', 'active-directory', 'domain', 'join', 'realm', 'sssd', 'samba', 'windows-ad'],
  },
  {
    id: 'linux-docker-full-suite',
    brand: 'linux',
    modelCategory: 'Linux Server (Ubuntu / Debian / RHEL)',
    osFamily: 'linux-server',
    category: 'docker_web',
    categoryLabel: 'Instalasi & Manajemen Docker Engine + Docker Compose',
    command: `# 1. Install Docker Engine Resmi (Ubuntu)
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo "\$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 2. Tambahkan user ke group docker
sudo usermod -aG docker $USER && newgrp docker

# 3. Perintah Utama Docker Operasional
docker ps -a
docker logs -f --tail=100 <container_name>
docker stats --no-stream
docker compose up -d`,
    description: 'Instalasi resmi Docker Engine, perbaikan izin non-root socket docker, serta perintah operasional harian container docker.',
    explanationId: 'Perintah ini menyelesaikan error "permission denied on /var/run/docker.sock" dan memasang Docker Compose v2.',
    verificationTip: 'Uji dengan "docker run --rm hello-world".',
    mode: 'privileged',
    tags: ['linux', 'docker', 'compose', 'install', 'container', 'ps', 'logs', 'stats'],
  },
  {
    id: 'linux-web-server-nginx',
    brand: 'linux',
    modelCategory: 'Linux Server (Ubuntu / Debian / RHEL)',
    osFamily: 'linux-server',
    category: 'docker_web',
    categoryLabel: 'Instalasi Web Server Nginx / Apache & Konfigurasi Virtual Host',
    command: `# 1. Install Nginx & UFW Firewall
sudo apt update && sudo apt install -y nginx ufw
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

# 2. Buat Virtual Host / Server Block Nginx
cat << 'EOF' | sudo tee /etc/nginx/sites-available/app.conf
server {
    listen 80;
    server_name portal.enterprise.local;

    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx`,
    description: 'Instalasi web server Nginx, konfigurasi firewall UFW port 80/443, dan setup reverse proxy virtual host.',
    explanationId: 'Perintah "nginx -t" memvalidasi sintaks konfigurasi sebelum reload agar web server tidak crash.',
    verificationTip: 'Pastikan output "nginx -t" menghasilkan "syntax is ok" dan "test is successful".',
    mode: 'privileged',
    tags: ['linux', 'nginx', 'apache', 'webserver', 'proxy', 'reverse-proxy', 'ufw'],
  },

  // =========================================================================
  // 9. MACBOOK / MACOS (Apple macOS Sequoia 15 / Sonoma 14 Desktop Terminal CLI)
  // Local offline desktop reference
  // =========================================================================
  {
    id: 'mac-network-diagnostics',
    brand: 'macos',
    modelCategory: 'MacBook / macOS Terminal (Zsh CLI)',
    osFamily: 'macos',
    category: 'diagnostics',
    categoryLabel: 'Diagnosa Jaringan macOS: IP, Wi-Fi SSID, DNS & Gateway',
    command: `# 1. Lihat IP Address seluruh Interface (Wi-Fi en0 / Ethernet en1)
ifconfig en0
ipconfig getifaddr en0

# 2. Cek Detail Informasi Wi-Fi (SSID, BSSID, Channel, RSSI, Noise)
/System/Library/PrivateFrameworks/Apple80211.framework/Resources/airport -I

# 3. Cek Default Gateway & Tabel Routing macOS
netstat -nr | grep default
route get 8.8.8.8

# 4. Cek DNS Server yang dikonfigurasi di macOS
scutil --dns | grep nameserver

# 5. Flush Cache DNS macOS (Sonoma / Sequoia)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`,
    description: 'Suite perintah diagnostik jaringan lengkap di terminal macOS: cek IP Wi-Fi, RSSI sinyal Wi-Fi, gateway route, nameservers, dan flush DNS cache.',
    explanationId: 'Bekerja 100% offline di terminal Zsh/Bash MacBook tanpa membutuhkan koneksi internet.',
    sampleOutput: `en0: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 1500
    inet 192.168.1.50 netmask 0xffffff00 broadcast 192.168.1.255

route to: 8.8.8.8
destination: default
       mask: default
    gateway: 192.168.1.1
  interface: en0
      flags: <UP,GATEWAY,DONE,STATIC,PRCLONING>`,
    verificationTip: 'Gunakan "route get 8.8.8.8" untuk melihat interface dan gateway yang digunakan MacBook.',
    mode: 'user',
    tags: ['macos', 'macbook', 'zsh', 'terminal', 'ifconfig', 'scutil', 'dns', 'wifi', 'gateway', 'flushcache'],
  },
  {
    id: 'mac-networksetup-config',
    brand: 'macos',
    modelCategory: 'MacBook / macOS Terminal (Zsh CLI)',
    osFamily: 'macos',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi IP Static, Wi-Fi & Proxy via networksetup CLI',
    command: `# 1. List semua Network Service di Mac
networksetup -listallnetworkservices

# 2. Set IP Static pada Wi-Fi (IP, Subnet Mask, Gateway Router)
sudo networksetup -setmanual "Wi-Fi" 192.168.1.50 255.255.255.0 192.168.1.1

# 3. Set DNS Server pada Wi-Fi
sudo networksetup -setdnsservers "Wi-Fi" 10.254.88.254 8.8.8.8 1.1.1.1

# 4. Kembalikan ke DHCP Otomatis
sudo networksetup -setdhcp "Wi-Fi"

# 5. Cek Port yang sedang Terbuka (Listening) di MacBook
sudo lsof -iTCP -sTCP:LISTEN -n -P`,
    description: 'Konfigurasi alamat IP static, DNS server, DHCP, dan pemeriksaan listening port di macOS menggunakan utility native networksetup.',
    explanationId: 'Utility networksetup adalah tool CLI bawaan macOS resmi dari Apple untuk mengelola System Settings Network.',
    verificationTip: 'Periksa dengan "networksetup -getinfo Wi-Fi".',
    mode: 'privileged',
    tags: ['macos', 'macbook', 'networksetup', 'ip', 'static', 'dhcp', 'dns', 'lsof'],
  },

  // =========================================================================
  // 10. WINDOWS (Windows 11 / 10 & Windows Server: PowerShell 7 & CMD netsh)
  // Local offline desktop reference
  // =========================================================================
  {
    id: 'win-network-diagnostics',
    brand: 'windows',
    modelCategory: 'Windows Desktop (PowerShell 7 & CMD)',
    osFamily: 'windows',
    category: 'diagnostics',
    categoryLabel: 'Diagnosa Jaringan Windows: ipconfig, Get-NetAdapter, Test-NetConnection',
    command: `# 1. Cek Detail IP Address, Subnet, Gateway & DNS (CMD / PowerShell)
ipconfig /all

# 2. Cek Status Adapter Jaringan (PowerShell)
Get-NetAdapter | Select-Object Name, InterfaceDescription, Status, LinkSpeed

# 3. Cek Default Gateway & Tabel Routing Windows
Get-NetRoute -DestinationPrefix "0.0.0.0/0"
route print

# 4. Uji Konektivitas Port TCP & Ping (PowerShell)
Test-NetConnection -ComputerName 8.8.8.8 -Port 443
Test-NetConnection -ComputerName 10.254.88.215 -Port 22

# 5. Flush DNS Cache & Reset Winsock
ipconfig /flushdns
netsh winsock reset`,
    description: 'Diagnosa lengkap jaringan Windows 10/11 & Server: ipconfig detail, status adapter fisik, routing table, port test, dan DNS flush.',
    explanationId: 'Bekerja 100% secara offline di PowerShell dan CMD Windows.',
    sampleOutput: `Ethernet adapter Ethernet:
   Connection-specific DNS Suffix  . : enterprise.local
   IPv4 Address. . . . . . . . . . . : 192.168.1.50
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 192.168.1.1
   DNS Servers . . . . . . . . . . . : 10.254.88.254
                                       8.8.8.8

ComputerName     : 10.254.88.215
RemotePort       : 22
TcpTestSucceeded : True`,
    verificationTip: 'Periksa baris TcpTestSucceeded: True pada Test-NetConnection.',
    mode: 'user',
    tags: ['windows', 'powershell', 'cmd', 'ipconfig', 'netsh', 'route', 'test-netconnection', 'flushdns'],
  },
  {
    id: 'win-netsh-config-basic',
    brand: 'windows',
    modelCategory: 'Windows Desktop (PowerShell 7 & CMD netsh)',
    osFamily: 'windows',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi IP Static, DNS & Firewall via netsh & PowerShell',
    command: `# 1. Konfigurasi IP Static (PowerShell Admin)
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress "192.168.1.50" -PrefixLength 24 -DefaultGateway "192.168.1.1"
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("10.254.88.254", "8.8.8.8")

# 2. Atau Menggunakan CMD netsh (Alternatif)
netsh interface ipv4 set address name="Ethernet" static 192.168.1.50 255.255.255.0 192.168.1.1
netsh interface ipv4 set dns name="Ethernet" static 10.254.88.254
netsh interface ipv4 add dns name="Ethernet" 8.8.8.8 index=2

# 3. Kembalikan Adapter ke DHCP Otomatis
netsh interface ipv4 set address name="Ethernet" source=dhcp
netsh interface ipv4 set dns name="Ethernet" source=dhcp

# 4. Periksa Port Listening di Windows
netstat -ano | findstr LISTEN`,
    description: 'Konfigurasi IP Static IPv4, DNS Server, DHCP, dan firewall port di Windows menggunakan PowerShell cmdlet dan netsh CLI.',
    explanationId: 'Gunakan Run as Administrator saat menjalankan perintah konfigurasi adapter jaringan.',
    verificationTip: 'Periksa dengan "Get-NetIPAddress -InterfaceAlias Ethernet".',
    mode: 'privileged',
    tags: ['windows', 'netsh', 'powershell', 'static-ip', 'dns', 'dhcp', 'netstat'],
  },

  // =========================================================================
  // 11. ANDROID (Android 15 / 14: ADB Shell & Termux Mobile CLI)
  // Local offline mobile reference
  // =========================================================================
  {
    id: 'android-adb-diagnostics',
    brand: 'android',
    modelCategory: 'Android Mobile (ADB Shell & Termux CLI)',
    osFamily: 'android',
    category: 'diagnostics',
    categoryLabel: 'Diagnosa Jaringan Android: ADB Shell, IP wlan0, Wi-Fi & Dumpsys',
    command: `# 1. Cek Alamat IP Wi-Fi (wlan0) & Cellular (rmnet) via ADB
adb shell ip addr show wlan0

# 2. Cek Default Gateway & Tabel Rute Android
adb shell ip route show

# 3. Uji Ping & Latensi dari Smartphone Android
adb shell ping -c 4 8.8.8.8

# 4. Cek Informasi Wi-Fi Detail (SSID, BSSID, RSSI dBm, Link Speed Mbps)
adb shell dumpsys wifi | grep -i "mNetworkInfo\\|curState\\|mWifiInfo"

# 5. Cek Penggunaan Data Jaringan per-Aplikasi
adb shell dumpsys netstats detail | grep -i "uid="

# 6. Filter Log Jaringan Real-Time (Logcat)
adb shell logcat -d | grep -iE "network|wifi|connectivity|dns"`,
    description: 'Diagnosa lengkap jaringan perangkat Android via ADB Shell: interface wlan0, gateway routing, dumpsys wifi, dumpsys netstats, dan live network logcat.',
    explanationId: 'Sangat bermanfaat saat melakukan site survey Wi-Fi dan uji konektivitas lapangan langsung dari smartphone Android.',
    sampleOutput: `30: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP
    inet 192.168.1.105/24 brd 192.168.1.255 scope global wlan0

default via 192.168.1.1 dev wlan0 proto static 
192.168.1.0/24 dev wlan0 proto kernel scope link src 192.168.1.105

mWifiInfo SSID: Enterprise_Wi-Fi, BSSID: 00:0c:29:56:02:c7, RSSI: -54, Link speed: 866Mbps, Frequency: 5180MHz`,
    verificationTip: 'Nilai RSSI > -65 dBm menunjukkan kekuatan sinyal Wi-Fi yang sangat baik.',
    mode: 'user',
    tags: ['android', 'adb', 'termux', 'wifi', 'dumpsys', 'wlan0', 'ping', 'logcat', 'mobile'],
  },
  {
    id: 'android-termux-terminal-suite',
    brand: 'android',
    modelCategory: 'Android Mobile (Termux Terminal Environment)',
    osFamily: 'android',
    category: 'config_basic',
    categoryLabel: 'Termux Terminal CLI: Paket Network Tools, SSH Client, Nmap & Curl',
    command: `# 1. Update Repository & Install Paket Tool Jaringan Lengkap di Android
pkg update && pkg install -y curl wget nmap openssh git iproute2 termux-api

# 2. Cek Socket Listening & Port di Termux
ss -tulpn

# 3. Scan Port / Host Lokal dari Smartphone Android (Nmap)
nmap -sT -p 22,80,443,8080 192.168.1.0/24

# 4. SSH Remote Langsung dari Android
ssh admin@10.254.88.215 -p 22`,
    description: 'Panduan lengkap terminal Termux pada Android: instalasi tool audit jaringan (nmap, ssh, curl, iproute2) dan scanning port lokal.',
    explanationId: 'Menjadikan smartphone Android sebagai tool portable console terminal teknisi jaringan di lapangan.',
    verificationTip: 'Jalankan "ssh -V" dan "nmap --version" di Termux untuk memvalidasi instalasi.',
    mode: 'user',
    tags: ['android', 'termux', 'nmap', 'ssh', 'curl', 'network-tools', 'pkg'],
  },

  // =========================================================================
  // 12. MIKROTIK (RouterOS v7: CCR2004, CCR2116, CRS326, RB5009, CHR)
  // Shared single RouterOS reference
  // =========================================================================
  {
    id: 'mikrotik-show-all',
    brand: 'mikrotik',
    modelCategory: 'MikroTik RouterOS v7 (CCR / CRS / RB)',
    osFamily: 'routeros',
    category: 'show',
    categoryLabel: 'Melihat Konfigurasi, IP Address, Routing Table & BGP/OSPF',
    command: `/export compact\n/ip address print\n/ip route print\n/routing bgp session print\n/routing ospf neighbor print`,
    description: 'Suite lengkap perintah monitoring MikroTik RouterOS: export konfigurasi compact, daftar IP address, tabel rute, status sesi BGP, dan OSPF neighbor.',
    explanationId: 'Format "/export compact" hanya menampilkan konfigurasi non-default yang diubah oleh admin.',
    sampleOutput: `Flags: X - disabled, I - invalid, D - dynamic, A - active, C - connect, S - static, b - bgp, o - ospf
 #     DST-ADDRESS        GATEWAY       DISTANCE
 DAb   0.0.0.0/0          10.254.88.1          20
 DAC   10.254.88.0/24     ether1                0
 DAC   192.168.88.0/24    bridge-lan            0

Flags: E - established
 #   NAME       PEER        REMOTE-AS  STATE        UPTIME
 0 E bgp-isp    10.0.0.2    65002      established  4h12m`,
    verificationTip: 'Periksa flag "E" pada BGP session dan flag "DAb / DAC" pada IP route.',
    mode: 'privileged',
    tags: ['mikrotik', 'routeros', 'export', 'route', 'bgp', 'ospf', 'ip'],
  },
  {
    id: 'mikrotik-config-basic-nat',
    brand: 'mikrotik',
    modelCategory: 'MikroTik RouterOS v7 (CCR / CRS / RB)',
    osFamily: 'routeros',
    category: 'config_basic',
    categoryLabel: 'Konfigurasi Dasar MikroTik: Identity, IP Address, Bridge VLAN & NAT Masquerade',
    command: `/system identity set name="CCR2004-Core"
/system clock set time-zone-name="Asia/Jakarta"
/system ntp client set enabled=yes
/system ntp client servers add address=10.254.88.254
!
/interface bridge add name=bridge-lan vlan-filtering=yes
/interface bridge port add bridge=bridge-lan interface=ether2
/interface bridge port add bridge=bridge-lan interface=ether3
!
/ip address add address=10.254.88.215/24 interface=ether1 network=10.254.88.0
/ip address add address=192.168.88.1/24 interface=bridge-lan network=192.168.88.0
!
/ip route add dst-address=0.0.0.0/0 gateway=10.254.88.1
!
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="NAT Internet"`,
    description: 'Konfigurasi standar RouterOS: Identity hostname, IP address WAN/LAN, Bridge VLAN hardware offloading, default route, dan NAT Masquerade.',
    explanationId: 'Template dasar router gateway MikroTik untuk kantor cabang maupun core network.',
    verificationTip: 'Cek koneksi dengan "/ping 8.8.8.8".',
    mode: 'config',
    tags: ['mikrotik', 'routeros', 'config', 'identity', 'bridge', 'nat', 'masquerade', 'vlan'],
  },

  // =========================================================================
  // 12. ENTERPRISE CONFIGURATION PLAYBOOKS (MULTI-VENDOR & OFFLINE READY)
  // =========================================================================
  {
    id: 'cisco-playbook-ipsec-vpn-vti',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000 / ISR / ASR)',
    osFamily: 'ios-xe',
    category: 'playbook',
    categoryLabel: 'Playbook: IPsec VPN Site-to-Site (VTI Tunnel)',
    isPlaybook: true,
    command: `! === PLAYBOOK IPSEC VPN SITE-TO-SITE (VTI) CISCO IOS-XE ===
configure terminal

! 1. Konfigurasi IKEv2 Proposal & Policy (Phase 1)
crypto ikev2 proposal IKEV2-PROPOSAL-ENTERPRISE
 encryption aes-cbc-256
 integrity sha256
 group 14
exit

crypto ikev2 policy IKEV2-POLICY-ENTERPRISE
 proposal IKEV2-PROPOSAL-ENTERPRISE
exit

! 2. Konfigurasi IKEv2 Keyring & Pre-Shared Key
crypto ikev2 keyring IKEV2-KEYRING-HQ
 peer BRANCH-OFFICE
  address 203.0.113.2 255.255.255.255
  pre-shared-key EnterpriseSecretKey2026!
 exit
exit

! 3. Konfigurasi IKEv2 Profile
crypto ikev2 profile IKEV2-PROFILE-HQ
 match identity remote address 203.0.113.2 255.255.255.255
 authentication remote pre-share
 authentication local pre-share
 keyring local IKEV2-KEYRING-HQ
 lifetime 86400
 dpd 10 5 on-demand
exit

! 4. Konfigurasi IPsec Transform-Set & IPsec Profile (Phase 2)
crypto ipsec transform-set IPSEC-TS-AES256-SHA esp-aes 256 esp-sha256-hmac
 mode transport
exit

crypto ipsec profile IPSEC-PROFILE-VTI
 set transform-set IPSEC-TS-AES256-SHA
 set ikev2-profile IKEV2-PROFILE-HQ
exit

! 5. Konfigurasi Virtual Tunnel Interface (VTI)
interface Tunnel100
 description VTI-IPSEC-VPN-TO-BRANCH
 ip address 10.100.100.1 255.255.255.252
 ip mtu 1400
 ip tcp adjust-mss 1360
 tunnel source GigabitEthernet0/0/0
 tunnel mode ipsec ipv4
 tunnel destination 203.0.113.2
 tunnel protection ipsec profile IPSEC-PROFILE-VTI
 no shutdown
exit

! 6. Konfigurasi Routing Melalui Tunnel VPN
ip route 192.168.20.0 255.255.255.0 Tunnel100

! 7. Simpan Konfigurasi Permanen
end
write memory`,
    description: 'Playbook lengkap membangun IPsec VPN Site-to-Site berbasis Virtual Tunnel Interface (VTI) IKEv2 dengan enkripsi AES-256 dan SHA-256 pada Cisco IOS-XE.',
    explanationId: 'VTI menyederhanakan konfigurasi VPN tanpa memerlukan access-list (crypto map) yang rumit. Tunnel langsung bertindak sebagai interface L3 yang dapat dilewati routing static maupun dinamis (OSPF/BGP).',
    sampleOutput: `Tunnel100 is up, line protocol is up
Crypto Session [1]
  Peer: 203.0.113.2 port 500 fvrf: (none) ivrf: (none)
  Phase1: IKEv2 SA UP
  Phase2: IPSEC SA UP`,
    verificationTip: 'Jalankan "show crypto session" dan "show crypto ikev2 sa" untuk memeriksa Phase 1 & 2 UP.',
    mode: 'config',
    tags: ['cisco', 'playbook', 'ipsec', 'vpn', 'vti', 'ikev2', 'ios-xe', 'tunnel', 'crypto'],
  },
  {
    id: 'cisco-playbook-ospf-multi-area',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9000 / Cat 8000 / ISR)',
    osFamily: 'ios-xe',
    category: 'playbook',
    categoryLabel: 'Playbook: OSPF Routing Multi-Area & Tuning',
    isPlaybook: true,
    command: `! === PLAYBOOK OSPF ROUTING MULTI-AREA CISCO IOS-XE ===
configure terminal

! 1. Buat Loopback Interface sebagai Router-ID Stabil
interface Loopback0
 description OSPF-ROUTER-ID
 ip address 10.255.255.1 255.255.255.255
 no shutdown
exit

! 2. Konfigurasi OSPF Process & Tuning Parameter
router ospf 1
 router-id 10.255.255.1
 auto-cost reference-bandwidth 100000
 passive-interface default
 no passive-interface GigabitEthernet0/0/0
 no passive-interface GigabitEthernet0/0/1
 log-adjacency-changes detail
exit

! 3. Aktifkan OSPF pada Interface (Recommended Per-Interface Method)
interface GigabitEthernet0/0/0
 description UPLINK-TO-CORE-AREA-0
 ip ospf 1 area 0
 ip ospf network point-to-point
 ip ospf hello-interval 10
 ip ospf dead-interval 40
 exit

interface GigabitEthernet0/0/1
 description ACCESS-AREA-10
 ip ospf 1 area 10
 ip ospf network point-to-point
 exit

interface Vlan10
 description LAN-USERS-PASSIVE
 ip ospf 1 area 10
 exit

! 4. Simpan Konfigurasi Permanen
end
write memory`,
    description: 'Playbook konfigurasi OSPFv2 Multi-Area dengan Router-ID Loopback, reference-bandwidth 100G, passive-interface default, dan aktivasi per-interface.',
    explanationId: 'Menggunakan "passive-interface default" adalah best practice keamanan jaringan agar OSPF hello packet tidak dikirim ke segmen user/VLAN yang tidak memiliki router neighbor.',
    sampleOutput: `Neighbor ID     Pri   State           Dead Time   Address         Interface
10.255.255.2      0   FULL/  -        00:00:36    10.0.0.2        GigabitEthernet0/0/0`,
    verificationTip: 'Jalankan "show ip ospf neighbor" dan pastikan State adalah FULL/- atau FULL/BDR.',
    mode: 'config',
    tags: ['cisco', 'playbook', 'ospf', 'routing', 'multi-area', 'router-id', 'ios-xe'],
  },
  {
    id: 'cisco-playbook-vlan-trunk-svi',
    brand: 'cisco',
    modelCategory: 'Cisco IOS-XE (Catalyst 9200 / 9300 / 9500)',
    osFamily: 'ios-xe',
    category: 'playbook',
    categoryLabel: 'Playbook: VLAN, 802.1Q Trunk & SVI Inter-VLAN Routing',
    isPlaybook: true,
    command: `! === PLAYBOOK VLAN, TRUNK & SVI ROUTING CISCO IOS-XE ===
configure terminal

! 1. Buat VLAN Database
vlan 10
 name MANAGEMENT-CORP
vlan 20
 name USERS-DATA
vlan 30
 name IP-PHONE-VOICE
vlan 99
 name NATIVE-UNUSED
exit

! 2. Konfigurasi Port Trunk 802.1Q Uplink ke Switch Core/Distribution
interface GigabitEthernet1/0/48
 description UPLINK-TRUNK-TO-CORE
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30
 switchport trunk native vlan 99
 switchport nonegotiate
 spanning-tree guard root
 no shutdown
exit

! 3. Konfigurasi Port Access & Voice VLAN untuk User
interface range GigabitEthernet1/0/1 - 24
 description USER-WORKSTATION-VOICE
 switchport mode access
 switchport access vlan 20
 switchport voice vlan 30
 spanning-tree portfast
 spanning-tree bpduguard enable
 no shutdown
exit

! 4. Konfigurasi SVI (Switch Virtual Interface) untuk Inter-VLAN Routing (Layer 3 Switch)
interface Vlan10
 description SVI-MANAGEMENT
 ip address 10.254.10.1 255.255.255.0
 no shutdown
exit

interface Vlan20
 description SVI-USERS-DATA
 ip address 192.168.20.1 255.255.255.0
 ip helper-address 10.254.88.254
 no shutdown
exit

! 5. Aktifkan Routing IP
ip routing

! 6. Simpan Konfigurasi Permanen
end
write memory`,
    description: 'Playbook komprehensif setup VLAN database, Trunking 802.1Q dengan native VLAN aman, Access port dengan BPDU Guard/PortFast, dan SVI Inter-VLAN routing.',
    explanationId: 'PortFast dan BPDU Guard mencegah bridging loop saat user mencolokkan hub/switch liar, serta mempercepat port langsung ke status forwarding.',
    sampleOutput: `VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
10   MANAGEMENT-CORP                  active    Gi1/0/48, Vl10
20   USERS-DATA                       active    Gi1/0/1, Gi1/0/2...
30   IP-PHONE-VOICE                   active    Gi1/0/1, Gi1/0/2...`,
    verificationTip: 'Periksa "show vlan brief" dan "show interfaces trunk".',
    mode: 'config',
    tags: ['cisco', 'playbook', 'vlan', 'trunk', 'svi', '802.1q', 'inter-vlan', 'portfast', 'bpduguard'],
  },
  {
    id: 'forti-playbook-ipsec-vpn-site2site',
    brand: 'fortinet',
    modelCategory: 'Fortinet FortiOS 7.x (FortiGate NGFW)',
    osFamily: 'fortios',
    category: 'playbook',
    categoryLabel: 'Playbook: IPsec VPN Site-to-Site (FortiOS)',
    isPlaybook: true,
    command: `# === PLAYBOOK IPSEC VPN SITE-TO-SITE FORTINET FORTIOS ===
# 1. Konfigurasi Phase 1 Interface (IKEv2)
config vpn ipsec phase1-interface
    edit "VPN-TO-BRANCH"
        set interface "wan1"
        set ike-version 2
        set keylife 86400
        set peertype any
        set proposal aes256-sha256 aes128-sha256
        set dhgrp 14 19
        set remote-gw 203.0.113.2
        set psksecret EnterpriseSecretKey2026!
        set dpd-retryinterval 10
    next
end

# 2. Konfigurasi Phase 2 Interface
config vpn ipsec phase2-interface
    edit "VPN-TO-BRANCH-P2"
        set phase1name "VPN-TO-BRANCH"
        set proposal aes256-sha256
        set dhgrp 14 19
        set keylife 43200
        set auto-negotiate enable
        set src-subnet 192.168.10.0 255.255.255.0
        set dst-subnet 192.168.20.0 255.255.255.0
    next
end

# 3. Konfigurasi Static Route Menuju Subnet Cabang via Tunnel VPN
config router static
    edit 0
        set dst 192.168.20.0 255.255.255.0
        set device "VPN-TO-BRANCH"
        set comment "Route to Branch LAN via IPsec"
    next
end

# 4. Konfigurasi Firewall Policy (Outbound & Inbound VPN)
config firewall policy
    edit 0
        set name "VPN-LAN-TO-BRANCH"
        set srcintf "internal"
        set dstintf "VPN-TO-BRANCH"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set logtraffic all
    next
    edit 0
        set name "VPN-BRANCH-TO-LAN"
        set srcintf "VPN-TO-BRANCH"
        set dstintf "internal"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set logtraffic all
    next
end`,
    description: 'Playbook lengkap konfigurasi IPsec VPN Site-to-Site IKEv2 pada Fortinet FortiGate, mencakup Phase 1, Phase 2, Static Route, dan Firewall Security Policy dua arah.',
    explanationId: 'FortiOS mewajibkan policy firewall dua arah agar trafik dari interface internal ke tunnel VPN dan sebaliknya diizinkan.',
    sampleOutput: `ike 0:VPN-TO-BRANCH: established IKE SA
IPsec SA: VPN-TO-BRANCH-P2: tun_id=1 ... status=UP`,
    verificationTip: 'Jalankan "get vpn ipsec tunnel summary" dan "diagnose vpn ike gateway list".',
    mode: 'config',
    tags: ['fortinet', 'fortios', 'playbook', 'ipsec', 'vpn', 'site-to-site', 'firewall-policy', 'ikev2'],
  },
  {
    id: 'mikrotik-playbook-vlan-bridge',
    brand: 'mikrotik',
    modelCategory: 'MikroTik RouterOS v7 (CCR / CRS / RB)',
    osFamily: 'routeros',
    category: 'playbook',
    categoryLabel: 'Playbook: VLAN Filtering Bridge & DHCP Server',
    isPlaybook: true,
    command: `# === PLAYBOOK VLAN FILTERING BRIDGE & DHCP SERVER MIKROTIK ROUTEROS V7 ===

# 1. Buat Bridge Utama dengan VLAN Filtering Aktif
/interface bridge add name=bridge-core vlan-filtering=yes

# 2. Assign Port ke Bridge (ether2 Trunk, ether3 Access VLAN 10, ether4 Access VLAN 20)
/interface bridge port
add bridge=bridge-core interface=ether2 comment="TRUNK to Switch"
add bridge=bridge-core interface=ether3 pvid=10 comment="ACCESS VLAN 10 Management"
add bridge=bridge-core interface=ether4 pvid=20 comment="ACCESS VLAN 20 Staff"

# 3. Konfigurasi VLAN Table (Tagged & Untagged)
/interface bridge vlan
add bridge=bridge-core tagged=bridge-core,ether2 untagged=ether3 vlan-ids=10
add bridge=bridge-core tagged=bridge-core,ether2 untagged=ether4 vlan-ids=20

# 4. Buat Sub-Interface VLAN pada Bridge untuk Gateway Inter-VLAN Routing
/interface vlan
add interface=bridge-core name=vlan10-mgmt vlan-id=10
add interface=bridge-core name=vlan20-staff vlan-id=20

# 5. Pasang IP Address pada Setiap SVI VLAN
/ip address
add address=10.254.10.1/24 interface=vlan10-mgmt network=10.254.10.0
add address=192.168.20.1/24 interface=vlan20-staff network=192.168.20.0

# 6. Konfigurasi IP Pool & DHCP Server untuk VLAN 20 Staff
/ip pool add name=pool-staff ranges=192.168.20.50-192.168.20.200
/ip dhcp-server add address-pool=pool-staff interface=vlan20-staff name=dhcp-staff disabled=no
/ip dhcp-server network add address=192.168.20.0/24 dns-server=1.1.1.1,8.8.8.8 gateway=192.168.20.1`,
    description: 'Playbook RouterOS v7 untuk membangun Bridge VLAN filtering modern dengan hardware offloading, trunking port, access port, dan DHCP Server otomatis.',
    explanationId: 'Metode "vlan-filtering=yes" pada bridge tunggal adalah standar resmi MikroTik RouterOS v7 yang memanfaatkan ASIC hardware switch chip untuk throughput maksimal.',
    sampleOutput: `/interface bridge vlan print
Flags: X - disabled, D - dynamic
 #   BRIDGE       VLAN-IDS  CURRENT-TAGGED    CURRENT-UNTAGGED
 0   bridge-core  10        bridge-core,ether2 ether3
 1   bridge-core  20        bridge-core,ether2 ether4`,
    verificationTip: 'Periksa dengan "/interface bridge vlan print" dan pastikan flag aktif.',
    mode: 'config',
    tags: ['mikrotik', 'routeros', 'playbook', 'vlan', 'bridge', 'vlan-filtering', 'dhcp-server'],
  },
  {
    id: 'juniper-playbook-route-based-ipsec',
    brand: 'juniper',
    modelCategory: 'Juniper Junos OS (SRX Series Services Gateway)',
    osFamily: 'junos',
    category: 'playbook',
    categoryLabel: 'Playbook: Route-Based IPsec VPN (SRX st0)',
    isPlaybook: true,
    command: `# === PLAYBOOK ROUTE-BASED IPSEC VPN JUNIPER JUNOS (SRX) ===
configure

# 1. Konfigurasi Interface Tunnel st0.0
set interfaces st0 unit 0 family inet address 10.100.100.1/30
set interfaces ge-0/0/0 unit 0 family inet address 203.0.113.1/30

# 2. Konfigurasi IKE Proposal, Policy & Gateway (Phase 1)
set security ike proposal IKE-PROP-ENTERPRISE authentication-method pre-shared-keys
set security ike proposal IKE-PROP-ENTERPRISE dh-group group14
set security ike proposal IKE-PROP-ENTERPRISE authentication-algorithm sha-256
set security ike proposal IKE-PROP-ENTERPRISE encryption-algorithm aes-256-cbc

set security ike policy IKE-POL-ENTERPRISE proposals IKE-PROP-ENTERPRISE
set security ike policy IKE-POL-ENTERPRISE mode main
set security ike policy IKE-POL-ENTERPRISE pre-shared-key ascii-text "EnterpriseSecretKey2026!"

set security ike gateway IKE-GW-BRANCH ike-policy IKE-POL-ENTERPRISE
set security ike gateway IKE-GW-BRANCH address 203.0.113.2
set security ike gateway IKE-GW-BRANCH external-interface ge-0/0/0.0
set security ike gateway IKE-GW-BRANCH version v2-only

# 3. Konfigurasi IPsec Proposal, Policy & VPN (Phase 2)
set security ipsec proposal IPSEC-PROP-ENTERPRISE protocol esp
set security ipsec proposal IPSEC-PROP-ENTERPRISE authentication-algorithm hmac-sha-256-128
set security ipsec proposal IPSEC-PROP-ENTERPRISE encryption-algorithm aes-256-cbc

set security ipsec policy IPSEC-POL-ENTERPRISE perfect-forward-secrecy keys group14
set security ipsec policy IPSEC-POL-ENTERPRISE proposals IPSEC-PROP-ENTERPRISE

set security ipsec vpn IPSEC-VPN-BRANCH bind-interface st0.0
set security ipsec vpn IPSEC-VPN-BRANCH ike gateway IKE-GW-BRANCH
set security ipsec vpn IPSEC-VPN-BRANCH ike ipsec-policy IPSEC-POL-ENTERPRISE
set security ipsec vpn IPSEC-VPN-BRANCH establish-tunnels immediately

# 4. Security Zone & Policy
set security zones security-zone vpn-zone interfaces st0.0
set security zones security-zone trust interfaces ge-0/0/1.0
set security policies from-zone trust to-zone vpn-zone policy ALLOW-TO-BRANCH match source-address any destination-address any application any
set security policies from-zone trust to-zone vpn-zone policy ALLOW-TO-BRANCH then permit
set security policies from-zone vpn-zone to-zone trust policy ALLOW-FROM-BRANCH match source-address any destination-address any application any
set security policies from-zone vpn-zone to-zone trust policy ALLOW-FROM-BRANCH then permit

# 5. Routing Static Menuju Cabang via st0.0
set routing-options static route 192.168.20.0/24 next-hop st0.0

# 6. Komit Konfigurasi
commit and-quit`,
    description: 'Playbook Route-Based IPsec VPN Junos SRX menggunakan bind-interface st0.0, IKEv2, AES-256, Security Zone, dan Security Policy.',
    explanationId: 'Di Junos SRX, interface st0.0 harus dimasukkan ke dalam Security Zone (misal: vpn-zone) agar firewall engine memproses trafik tunnel.',
    sampleOutput: `show security ipsec security-associations
  Total active tunnels: 1
  ID      Gateway          Port  Algorithm       SPI      Life:sec/kb  Mon vsys
  <131073 203.0.113.2      500   ESP:aes-256/sha 8b4a7d1e 3542/ unlim   -   root`,
    verificationTip: 'Periksa dengan "show security ike security-associations" dan "show security ipsec security-associations".',
    mode: 'config',
    tags: ['juniper', 'junos', 'srx', 'playbook', 'ipsec', 'vpn', 'st0', 'route-based', 'ikev2'],
  },

  // =========================================================================
  // ALLIED TELESIS (AlliedWare Plus / AW+ Switch, AR Router/UTM & TQ Wireless AP)
  // =========================================================================
  {
    id: 'allied-show-run',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis (Switch x-Series, AR Router, TQ AP)',
    osFamily: 'alliedware-plus',
    category: 'show',
    categoryLabel: 'Melihat Konfigurasi Aktif (Running Config)',
    command: 'show running-config',
    description: 'Menampilkan seluruh konfigurasi aktif yang sedang berjalan pada switch, router, atau AP Allied Telesis (AW+).',
    explanationId: 'AlliedWare Plus (AW+) menggunakan hierarki konfigurasi modular yang kompatibel dengan standar industri CLI. Gunakan "show running-config full" jika ingin melihat parameter default yang tidak tampil.',
    sampleOutput: `!
service password-encryption
!
hostname AT-x530-Core
!
vlan database
 vlan 10 name "Corporate-Data"
 vlan 20 name "Voice-VoIP"
!
interface port1.0.1-port1.0.24
 switchport mode access
 switchport access vlan 10
!
interface port1.0.27-port1.0.28
 switchport mode trunk
 switchport trunk allowed vlan add 10,20
!
interface vlan10
 ip address 10.10.10.1/24
!
ip route 0.0.0.0/0 10.10.10.254`,
    verificationTip: 'Simpan konfigurasi ke flash secara permanen dengan menjalankan "write memory" atau "copy running-config startup-config".',
    mode: 'privileged',
    tags: ['alliedtelesis', 'allied', 'awplus', 'show', 'running-config', 'switch', 'router'],
  },
  {
    id: 'allied-show-ip-int-br',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis (Switch x-Series & AR Router)',
    osFamily: 'alliedware-plus',
    category: 'show',
    categoryLabel: 'Status Interface & IP Address',
    command: 'show ip interface brief',
    description: 'Menampilkan ringkasan status port fisik (port1.0.x), VLAN virtual interface (vlanX), dan IP address.',
    explanationId: 'Pada AlliedWare Plus, penomoran port switch tunggal menggunakan format "port1.0.X" (port<unit>.<slot>.<port>), sedangkan stack menggunakan "port2.0.X", dst.',
    sampleOutput: `Interface       IP-Address          Status   Protocol
port1.0.1       unassigned          up       up
port1.0.2       unassigned          up       up
vlan1           192.168.1.1/24      up       up
vlan10          10.10.10.1/24       up       up
eth1 (WAN)      203.0.113.10/29     up       up
lo              127.0.0.1/8         up       up`,
    verificationTip: 'Pastikan Status dan Protocol keduanya "up". Jika "admin down", masuk ke interface dan ketik "no shutdown".',
    mode: 'privileged',
    tags: ['alliedtelesis', 'allied', 'awplus', 'interface', 'ip', 'show', 'status'],
  },
  {
    id: 'allied-show-vlan',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis Switch (x950/x930/x530/x510/x230/GS980MX)',
    osFamily: 'alliedware-plus',
    category: 'show',
    categoryLabel: 'Daftar VLAN & Status Port Membership',
    command: 'show vlan all',
    description: 'Menampilkan seluruh VLAN yang terdaftar beserta mapping port tagged (trunk) dan untagged (access).',
    explanationId: 'Menampilkan ringkasan VLAN ID, nama VLAN, serta port mana saja yang menjadi member untagged maupun tagged (802.1Q).',
    sampleOutput: `VLAN ID: 1   Name: default
  Status: Static  Type: Default
  Untagged Ports: None
  Tagged Ports: None

VLAN ID: 10  Name: Corporate-Data
  Status: Static  Type: Port
  Untagged Ports: port1.0.1-port1.0.24
  Tagged Ports: port1.0.27-port1.0.28

VLAN ID: 20  Name: Voice-VoIP
  Status: Static  Type: Port
  Untagged Ports: None
  Tagged Ports: port1.0.27-port1.0.28`,
    verificationTip: 'Periksa apakah port uplink trunk sudah membawa VLAN ID yang diperlukan.',
    mode: 'privileged',
    tags: ['alliedtelesis', 'allied', 'vlan', 'show', 'switch', 'awplus'],
  },
  {
    id: 'allied-switch-vlan-config',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis Switch (AlliedWare Plus)',
    osFamily: 'alliedware-plus',
    category: 'vlan',
    categoryLabel: 'Konfigurasi VLAN & Access / Trunk Port',
    command: `configure terminal
!
vlan database
 vlan 10 name "Data-User"
 vlan 20 name "Voice-VoIP"
 vlan 30 name "Management"
!
interface port1.0.1-port1.0.20
 switchport mode access
 switchport access vlan 10
!
interface port1.0.27-port1.0.28
 switchport mode trunk
 switchport trunk allowed vlan add 10,20,30
!
interface vlan30
 ip address 192.168.30.2/24
!
exit`,
    description: 'Playbook pembuatan VLAN Database, penetapan port Access untuk PC klien, dan konfigurasi port Trunk 802.1Q Uplink.',
    explanationId: 'Pada AlliedWare Plus, pembuatan VLAN dilakukan di sub-mode "vlan database", sedangkan pemberian mode access/trunk dilakukan langsung di interface context.',
    sampleOutput: `AT-x530(config)# vlan database
AT-x530(config-vlan)# vlan 10 name "Data-User"
AT-x530(config-vlan)# exit
AT-x530(config)# interface port1.0.1-port1.0.20
AT-x530(config-if)# switchport mode access
AT-x530(config-if)# switchport access vlan 10`,
    verificationTip: 'Verifikasi dengan "show vlan all" dan uji ping ke SVI interface "vlan30".',
    mode: 'config',
    tags: ['alliedtelesis', 'allied', 'vlan', 'trunk', 'access', 'switchport', 'awplus'],
  },
  {
    id: 'allied-vcstack-status',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis Switch (x950/x930/x530/SBx8100/SBx908)',
    osFamily: 'alliedware-plus',
    category: 'show',
    categoryLabel: 'Status Virtual Chassis Stacking (VCStack)',
    command: 'show stack',
    description: 'Menampilkan status Virtual Chassis Stacking (VCStack) Allied Telesis: Master, Backup Member, dan status Stack Link.',
    explanationId: 'VCStack menggabungkan hingga 8 unit switch fisik menjadi satu logical management switch dengan throughput backplane tinggi dan zero-downtime failover.',
    sampleOutput: `Virtual Chassis Stacking summary information:
ID   Pending ID  Role     MAC address        Priority  Status
1    -           Master   eccd.6d01.2340     15        Ready (Active)
2    -           Backup   eccd.6d01.5678     10        Ready (Active)

Operational Status: Normal
Stack Link 1 Status: Up (port1.0.27 - port2.0.27)
Stack Link 2 Status: Up (port1.0.28 - port2.0.28)`,
    verificationTip: 'Pastikan Stack Master dan Backup memiliki status "Ready (Active)" dan Stack Link "Up".',
    mode: 'privileged',
    tags: ['alliedtelesis', 'allied', 'vcstack', 'stack', 'show', 'redundancy'],
  },
  {
    id: 'allied-amf-status',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis Switch & Router (AMF Network)',
    osFamily: 'alliedware-plus',
    category: 'show',
    categoryLabel: 'Allied Telesis Management Framework (AMF)',
    command: 'show amf',
    description: 'Menampilkan status AMF (Allied Telesis Management Framework): Controller, Master node, Member node, auto-backup, dan auto-recovery.',
    explanationId: 'AMF memungkinkan manajemen terpusat seluruh switch, router, dan AP Allied Telesis dalam satu jaringan dengan auto-provisioning dan zero-touch replacement.',
    sampleOutput: `AMF Status: Enabled
AMF Role: Master
Network Name: HQ-CAMPUS
Master ID: 1 (Active)
Total Nodes: 14 nodes (1 Master, 13 Members)
Auto-backup: Enabled (Daily at 02:00)
Auto-recovery: Enabled`,
    verificationTip: 'Periksa apakah seluruh node switch terdeteksi dengan "show amf node".',
    mode: 'privileged',
    tags: ['alliedtelesis', 'allied', 'amf', 'automation', 'management', 'show'],
  },
  {
    id: 'allied-epsr-status',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis Switch (EPSR Ring Protection)',
    osFamily: 'alliedware-plus',
    category: 'show',
    categoryLabel: 'Ethernet Protection Switched Ring (EPSR)',
    command: 'show epsr',
    description: 'Menampilkan status ring proteksi EPSR (Master Node, Transit Node, Primary Port, Secondary Port) dengan failover < 50ms.',
    explanationId: 'EPSR adalah teknologi ring redundancy performa tinggi dari Allied Telesis yang memberikan waktu pemulihan link kurang dari 50 milidetik jika kabel fiber putus.',
    sampleOutput: `EPSR Ring 1 summary:
  Bridge Domain: 1
  Control VLAN: 4094
  Node Role: Master
  State: Complete (Ring Closed & Protected)
  Primary Port: port1.0.25 (State: Forwarding)
  Secondary Port: port1.0.26 (State: Blocking / Standby)
  Health-check interval: 100ms`,
    verificationTip: 'Pada kondisi normal, Master node harus berstatus "Complete" dan Secondary Port "Blocking".',
    mode: 'privileged',
    tags: ['alliedtelesis', 'allied', 'epsr', 'ring', 'failover', 'redundancy'],
  },
  {
    id: 'allied-ar-router-nat-fw',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis Router (AR4050S / AR3050S / AR2050V / AR1050V)',
    osFamily: 'alliedware-plus',
    category: 'nat',
    categoryLabel: 'Konfigurasi Router WAN, NAT Masquerade & Firewall',
    command: `configure terminal
!
firewall enable
!
zone private
 network lan
  ip subnet 192.168.1.0/24 interface vlan1
!
zone public
 host wan-ip
  ip address 203.0.113.10 interface eth1
!
rule 10 permit any from private to public
!
nat enable
nat rule 1 ip private to public
!
ip route 0.0.0.0/0 203.0.113.9
!
exit`,
    description: 'Playbook konfigurasi Next-Gen Router Allied Telesis AR-Series: Zone Firewall, Policy NAT Masquerade, dan Default Route WAN.',
    explanationId: 'Allied Telesis AR-Series router menggunakan konsep Zone-Based Firewall (Private vs Public) dan rule NAT stateful inspection terintegrasi.',
    sampleOutput: `AT-AR4050S(config)# firewall enable
AT-AR4050S(config)# zone private
AT-AR4050S(config-zone)# network lan
AT-AR4050S(config-zone-network)# ip subnet 192.168.1.0/24 interface vlan1
AT-AR4050S(config)# nat enable
AT-AR4050S(config)# nat rule 1 ip private to public`,
    verificationTip: 'Periksa session NAT aktif dengan "show nat table" dan rule firewall dengan "show firewall rule".',
    mode: 'config',
    tags: ['alliedtelesis', 'allied', 'router', 'nat', 'firewall', 'ar4050s', 'ngfw'],
  },
  {
    id: 'allied-tq-ap-show-wireless',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis Wireless AP (TQ6702e / TQ6602 / TQ5403 / TQm Series)',
    osFamily: 'allied-ap',
    category: 'wireless',
    categoryLabel: 'Status Wireless AP & Autonomous Wave Controller (AWC)',
    command: 'show wireless',
    description: 'Menampilkan status radio 2.4GHz / 5GHz / 6GHz (Wi-Fi 6/6E), SSID aktif, dan jumlah klien terhubung pada AP Allied Telesis.',
    explanationId: 'Menampilkan ringkasan channel RF, power output dBm, AWC autonomous tuning channel, dan asosiasi client wireless.',
    sampleOutput: `Wireless Access Point Summary:
Model: TQ6702e (802.11ax 8x8 Wi-Fi 6)
Radio 1 (2.4 GHz): Channel 6, Power 20 dBm, Status: Up
Radio 2 (5.0 GHz): Channel 36 (AWC Optimized), Power 23 dBm, Status: Up
Active VAPs:
  - VAP 0 (Radio 1): SSID "Corp-Wireless", Security: WPA3/WPA2-Enterprise, Clients: 18
  - VAP 1 (Radio 2): SSID "Corp-Wireless-5G", Security: WPA3-SAE, Clients: 42
AWC Mode: Autonomous Wave Controller Active`,
    verificationTip: 'Periksa kekuatan sinyal dan channel overlap dengan "show wireless radio" dan "show wireless client".',
    mode: 'privileged',
    tags: ['alliedtelesis', 'allied', 'wireless', 'ap', 'tq', 'awc', 'wifi6'],
  },
  {
    id: 'allied-tq-ap-ssid-config',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis Wireless AP (TQ / TQm Series)',
    osFamily: 'allied-ap',
    category: 'wireless',
    categoryLabel: 'Konfigurasi SSID & Security WPA3/WPA2',
    command: `configure terminal
!
wireless
 radio 1
  channel auto
  power 20
  vap 0
   ssid "Office-Enterprise"
   security wpa-personal
   wpa-passphrase "AlliedSecure2026!"
   vlan 10
   no shutdown
!
 radio 2
  channel auto
  power 23
  vap 0
   ssid "Office-Enterprise"
   security wpa-personal
   wpa-passphrase "AlliedSecure2026!"
   vlan 10
   no shutdown
!
exit`,
    description: 'Playbook konfigurasi SSID Dual-Band (2.4GHz & 5GHz) pada Wireless AP Allied Telesis dengan keamanan WPA2/WPA3 Personal dan mapping VLAN.',
    explanationId: 'VAP (Virtual Access Point) memetakan SSID ke VLAN ID jaringan LAN agar trafik wireless terisolasi dengan aman.',
    sampleOutput: `TQ-AP(config)# wireless
TQ-AP(config-wireless)# radio 1
TQ-AP(config-radio)# vap 0
TQ-AP(config-vap)# ssid "Office-Enterprise"
TQ-AP(config-vap)# security wpa-personal
TQ-AP(config-vap)# wpa-passphrase "AlliedSecure2026!"
TQ-AP(config-vap)# no shutdown`,
    verificationTip: 'Periksa status broadcast SSID dengan "show wireless vap" dan uji asosiasi koneksi laptop/HP.',
    mode: 'config',
    tags: ['alliedtelesis', 'allied', 'wireless', 'ap', 'ssid', 'wpa3', 'wpa2', 'tq5403'],
  },
  {
    id: 'allied-write-memory',
    brand: 'alliedtelesis',
    modelCategory: 'Allied Telesis (Switch, Router, AP)',
    osFamily: 'alliedware-plus',
    category: 'system',
    categoryLabel: 'Menyimpan Konfigurasi ke Flash (Save Config)',
    command: 'write memory',
    description: 'Menyimpan seluruh konfigurasi dari RAM ke startup-config di internal flash card switch/router Allied Telesis.',
    explanationId: 'Gunakan "write memory" atau "copy running-config startup-config" agar konfigurasi tidak hilang saat perangkat di-reboot.',
    sampleOutput: `AT-x530# write memory
Building configuration...
[OK]
Configuration saved to flash:default.cfg`,
    verificationTip: 'Pastikan pesan "[OK]" muncul sebagai konfirmasi penyimpanan berhasil.',
    mode: 'privileged',
    tags: ['alliedtelesis', 'allied', 'save', 'write', 'memory', 'awplus', 'backup'],
  },
];

export const OFFLINE_COMMAND_DATABASE: CommandReference[] = [
  ...STAGING_COMMAND_DATABASE,
  ...BASE_OFFLINE_COMMAND_DATABASE,
];

import { safeStorage } from '../utils/safeStorage';

// Helper to get all offline commands including cached, AI-learned, and GitHub-synced
export function getAllOfflineAndCachedCommands(): CommandReference[] {
  try {
    const raw = safeStorage.getItem('69ai_cached_commands_v2') || safeStorage.getItem('69ai_cached_commands_v1');
    const custom: CommandReference[] = raw ? JSON.parse(raw) : [];
    return [...custom, ...OFFLINE_COMMAND_DATABASE];
  } catch (e) {
    return OFFLINE_COMMAND_DATABASE;
  }
}

// Helper to search offline database across brands, models, and OS families (including AI-learned playbooks & commands)
export function searchOfflineDatabase(query: string, brand?: DeviceBrand): CommandReference[] {
  const allCmds = getAllOfflineAndCachedCommands();
  if (!query || !query.trim()) {
    if (brand && brand !== 'generic' && brand !== 'custom') {
      return allCmds.filter(c => c.brand === brand);
    }
    return allCmds;
  }

  const q = query.toLowerCase().trim();
  const searchTokens = q.split(/\s+/).filter(t => t.length > 1);

  return allCmds.filter(item => {
    if (brand && brand !== 'generic' && brand !== 'custom' && item.brand !== brand && item.brand !== 'all') {
      return false;
    }

    const matchCmd = item.command.toLowerCase().includes(q);
    const matchDesc = item.description.toLowerCase().includes(q);
    const matchCat = (item.categoryLabel || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
    const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(q));
    const matchModel = (item.modelCategory || '').toLowerCase().includes(q);
    const matchExpl = (item.explanationId || '').toLowerCase().includes(q);
    const matchSourceQuery = (item.sourceQuery || '').toLowerCase().includes(q);

    if (matchCmd || matchDesc || matchCat || matchTags || matchModel || matchExpl || matchSourceQuery) {
      return true;
    }

    // Token match for multi-word queries (e.g. "cara setting bgp", "cek route default")
    if (searchTokens.length > 1) {
      const combined = `${item.command} ${item.description} ${item.categoryLabel} ${item.sourceQuery || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      return searchTokens.every(token => combined.includes(token));
    }

    return false;
  });
}
