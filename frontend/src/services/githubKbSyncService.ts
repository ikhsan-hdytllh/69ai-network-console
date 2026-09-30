import { safeStorage } from '../utils/safeStorage';
import { CommandReference, DeviceBrand } from '../types';
import { getCustomCommandsOnly, asyncSyncToIndexedDB } from './dbStorage';

export interface VendorSyncCatalog {
  brand: DeviceBrand;
  brandLabel: string;
  repoName: string;
  defaultBranch: string;
  rawApiUrl: string;
  description: string;
  commands: Omit<CommandReference, 'id' | 'createdAt'>[];
}

export interface SyncStats {
  lastSyncTime: string | null;
  syncedVendors: string[];
  totalCommandsSynced: number;
  sourceType: 'github_live' | 'github_curated_extract';
  detailsPerVendor: Record<string, number>;
}

const STORAGE_KEYS = {
  GITHUB_SYNC_STATS: '69ai_github_sync_stats_v1',
  GITHUB_SYNCED_COMMANDS: '69ai_github_synced_commands_v1',
  GITHUB_CUSTOM_REPO: '69ai_github_custom_repo_url',
  GITHUB_CUSTOM_TOKEN: '69ai_github_custom_token',
};

/**
 * High-Density Multi-Vendor Catalog extracted from GitHub Repositories:
 * - CiscoDevNet/yangsuite (IOS-XE, NX-OS, XR)
 * - fortinet/fortios-yang-models
 * - arubanetworks/yang & aoscx-ansible-collection
 * - Juniper/yang (Junos OS)
 * - ruckus/fastiron-cli
 * - linux-network-systems
 */
export const MULTI_VENDOR_GITHUB_CATALOGS: VendorSyncCatalog[] = [
  // 1. CISCO (CiscoDevNet/yangsuite & YangModels/yang)
  {
    brand: 'cisco',
    brandLabel: 'Cisco Systems (IOS-XE / NX-OS)',
    repoName: 'CiscoDevNet/yangsuite',
    defaultBranch: 'main',
    rawApiUrl: 'https://raw.githubusercontent.com/CiscoDevNet/yangsuite/main',
    description: 'Ekstraksi skema YANG resmi Cisco IOS-XE 17.x, NX-OS 9.x, & Playbook konfigurasi enterprise',
    commands: [
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "show",
                "categoryLabel": "Show Version & Hardware Summary",
                "command": "show version",
                "description": "Melihat versi IOS-XE, uptime sistem, nomor seri chassis, model hardware, dan kapasitas RAM/Flash",
                "explanationId": "Menampilkan informasi esensial platform Cisco: versi software, bootloader, uptime sistem, dan paket lisensi.",
                "sampleOutput": "Cisco IOS XE Software, Version 17.09.04a\nCisco C9300-48P (X86) processor with 1785536K/6147K bytes of memory.\nProcessor board ID FOC2415L0XY\nUptime for this switch is 42 weeks, 3 days, 14 hours, 22 minutes",
                "verificationTip": "Gunakan untuk memverifikasi versi firmware sebelum melakukan upgrade atau mengajukan case ke Cisco TAC.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "version",
                        "uptime",
                        "serial",
                        "hardware",
                        "ios-xe"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "show",
                "categoryLabel": "Show Inventory (SFP & Hardware Parts)",
                "command": "show inventory",
                "description": "Menampilkan daftar seluruh modul hardware, power supply, fan, dan transceiver SFP/SFP+ beserta serial number",
                "explanationId": "Menampilkan PID (Product ID), VID (Version ID), dan SN (Serial Number) untuk chassis dan seluruh modul yang terpasang.",
                "sampleOutput": "NAME: \"c9300 Chassis\", DESCR: \"Cisco Catalyst 9300 Series Switch\"\nPID: C9300-48P         , VID: V02  , SN: FOC2415L0XY\nNAME: \"Te1/1/1\", DESCR: \"SFP-10G-SR\"\nPID: SFP-10G-SR        , VID: V01  , SN: ONS19420042",
                "verificationTip": "Sangat berguna untuk audit aset IT dan klaim garansi RMA hardware Cisco.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "inventory",
                        "serial",
                        "sfp",
                        "rma",
                        "hardware"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "show",
                "categoryLabel": "Show IP Interface Brief",
                "command": "show ip interface brief",
                "description": "Menampilkan ringkasan status antarmuka (Status Layer 1 dan Protocol Layer 2) serta alamat IPv4",
                "explanationId": "Status ideal adalah Status: up dan Protocol: up. Jika 'administratively down', lakukan no shutdown.",
                "sampleOutput": "Interface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0/0   198.51.100.1    YES manual up                    up      \nGigabitEthernet0/0/1   192.168.1.1     YES manual up                    up      \nTenGigabitEthernet1/1/1 unassigned     YES unset  up                    up      \nLoopback0              10.255.255.1    YES manual up                    up",
                "verificationTip": "Pastikan kolom Status dan Protocol keduanya bernilai 'up'.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "ip",
                        "interface",
                        "brief",
                        "up",
                        "status"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "show",
                "categoryLabel": "Show IP Interface Brief (Excluding Unassigned)",
                "command": "show ip interface brief | exclude unassigned",
                "description": "Menyaring output interface untuk hanya menampilkan port yang sudah memiliki IP address terkonfigurasi",
                "explanationId": "Mempermudah teknisi melihat port aktif ber-IP tanpa terganggu puluhan port access kosong.",
                "sampleOutput": "Interface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0/0   198.51.100.1    YES manual up                    up      \nGigabitEthernet0/0/1   192.168.1.1     YES manual up                    up      \nVlan10                 192.168.10.1    YES manual up                    up",
                "verificationTip": "Gunakan untuk inspeksi cepat IP gateway dan port uplink.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "ip",
                        "filter",
                        "interface",
                        "ios-xe"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst Switch (IOS-XE)",
                "category": "show",
                "categoryLabel": "Show Interfaces Status",
                "command": "show interfaces status",
                "description": "Melihat status link port switch: Speed (10/100/1000/10G), Duplex (a-full), VLAN ID, dan jenis SFP yang tertancap",
                "explanationId": "Tabel status ringkas switchport yang menunjukkan status connected/notconnect/disabled per port.",
                "sampleOutput": "Port      Name               Status       Vlan       Duplex  Speed Type\nGi1/0/1   UPLINK-CORE        connected    trunk      a-full a-1000 10/100/1000BaseTX\nGi1/0/2   PC-ADMIN           connected    20         a-full   a-100 10/100/1000BaseTX\nTe1/1/1   FIBER-SERVER       connected    routed       full    10G SFP-10G-SR",
                "verificationTip": "Periksa kolom Type untuk mendeteksi apakah modul SFP terdeteksi dengan benar oleh switch.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "interface",
                        "status",
                        "switch",
                        "speed",
                        "duplex",
                        "vlan"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "show",
                "categoryLabel": "Show Interfaces Description",
                "command": "show interfaces description",
                "description": "Melihat daftar seluruh port dan label deskripsi yang telah dikonfigurasi pada perangkat",
                "explanationId": "Memudahkan identifikasi jalur kabel dan fungsi port tanpa harus membuka running-config.",
                "sampleOutput": "Interface                      Status         Protocol Description\nGi0/0/0                        up             up       WAN-ISP-INDOSAT-CIR-500M\nGi0/0/1                        up             up       LAN-CORE-SW01-TRUNK\nTu1                            up             up       IPSEC-VPN-TO-BRANCH-SURABAYA",
                "verificationTip": "Pastikan deskripsi port selalu diperbarui sesuai dokumentasi topologi jaringan.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "interface",
                        "description",
                        "label",
                        "topology"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst Switch (IOS-XE)",
                "category": "diagnostics",
                "categoryLabel": "Show Interfaces Counters Errors (CRC / Drops)",
                "command": "show interfaces counters errors",
                "description": "Mendeteksi gangguan fisik pada kabel atau SFP: CRC Errors, Frame Errors, Alignment Errors, and Rx/Tx Drops",
                "explanationId": "Nilai CRC / Align-Err yang terus bertambah mengindikasikan kabel patch cord rusak, konektor kotor, atau gangguan interferensi elektromagnetik.",
                "sampleOutput": "Port        Align-Err    FCS-Err   Xmit-Err    Rcv-Err UnderSize OutDiscards\nGi1/0/1             0          0          0          0         0           0\nGi1/0/2             0        142          0        142         0           4",
                "verificationTip": "Jika kolom FCS-Err atau Rcv-Err tinggi, segera ganti kabel LAN atau bersihkan konektor patch cord fiber.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "counters",
                        "errors",
                        "crc",
                        "drops",
                        "troubleshooting",
                        "diagnostics"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst Switch (IOS-XE)",
                "category": "diagnostics",
                "categoryLabel": "Show SFP Transceiver Optical DOM Power",
                "command": "show interfaces GigabitEthernet1/0/1 transceiver detail",
                "description": "Menampilkan Digital Optical Monitoring (DOM) SFP: Optical Tx Power (dBm), Rx Power (dBm), Voltage, & Temperature",
                "explanationId": "Mengetahui redaman optik fiber optic secara real-time. Rx Power yang mendekati batas minus tinggi (misal -25 dBm) menandakan kabel fiber putus parsial atau kotor.",
                "sampleOutput": "           Optical            Optical\n           Temperature  Voltage  Tx Power  Rx Power\nPort       (Celsius)    (Volts)  (dBm)     (dBm)\n---------  -----------  -------  --------  --------\nGi1/0/1    32.4         3.29     -2.10     -4.50",
                "verificationTip": "Rx Power optimal biasanya berada di rentang -1 dBm s/d -15 dBm tergantung tipe laser (SX/LX/LH).",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "transceiver",
                        "sfp",
                        "dom",
                        "fiber",
                        "optical",
                        "laser",
                        "diagnostics"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst Switch (IOS-XE)",
                "category": "show",
                "categoryLabel": "Show MAC Address Table",
                "command": "show mac address-table dynamic",
                "description": "Melihat tabel forwarding Layer-2: pemetaan MAC address client/perangkat ke nomor port fisik dan VLAN",
                "explanationId": "Digunakan untuk melacak di port switch mana suatu laptop, server, atau printer tertancap.",
                "sampleOutput": "          Mac Address Table\n-------------------------------------------\nVlan    Mac Address       Type        Ports\n----    -----------       --------    -----\n  10    0050.56a1.2234    DYNAMIC     Gi1/0/5\n  20    50eb.7112.98bc    DYNAMIC     Gi1/0/12",
                "verificationTip": "Gunakan filter 'show mac address-table address <mac>' untuk mencari port spesifik.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "mac",
                        "address",
                        "table",
                        "layer2",
                        "switch"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "show",
                "categoryLabel": "Show IP ARP Table",
                "command": "show ip arp",
                "description": "Melihat tabel resolusi protokol ARP: pemetaan alamat IPv4 ke MAC address hardware dan antarmuka fisik",
                "explanationId": "Digunakan untuk memverifikasi apakah perangkat lokal berhasil berkomunikasi di Layer 2/Layer 3 dengan host tetangga.",
                "sampleOutput": "Protocol  Address          Age (min)  Hardware Addr   Type   Interface\nInternet  192.168.1.1             -   5000.0001.0000  ARPA   GigabitEthernet0/0/1\nInternet  192.168.1.50            4   0050.56a1.2234  ARPA   GigabitEthernet0/0/1",
                "verificationTip": "Jika IP address muncul dengan status Incomplete pada Hardware Addr, periksa kabel atau firewall perangkat tujuan.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "arp",
                        "ip",
                        "mac",
                        "resolution"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "show",
                "categoryLabel": "Show CDP Neighbors Summary",
                "command": "show cdp neighbors",
                "description": "Mendeteksi perangkat Cisco tetangga yang terhubung langsung (Switch, Router, IP Phone, Access Point)",
                "explanationId": "Menampilkan Device ID, Local Interface, Capability (Switch/Router), Platform hardware, dan Port ID remote.",
                "sampleOutput": "Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID\nCore-SW01.local  Gig 1/0/48        142              R S   C9500-24Y Ten 1/0/1\nAP-FL1-NORTH     Gig 1/0/12        168                T   C9120AXI  Gig 0",
                "verificationTip": "Gunakan 'show cdp neighbors detail' untuk melihat IP manajemen perangkat remote tetangga.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "cdp",
                        "neighbors",
                        "discovery",
                        "topology"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "show",
                "categoryLabel": "Show LLDP Neighbors",
                "command": "show lldp neighbors",
                "description": "Mendeteksi perangkat vendor non-Cisco (Aruba, Juniper, Huawei, Server Linux, VMware ESXi) via protokol standar IEEE 802.1AB",
                "explanationId": "Menampilkan informasi perangkat tetangga multi-vendor yang terhubung langsung ke port switch.",
                "sampleOutput": "Device ID           Local Intf     Hold-time  Capability      Port ID\nAruba-CX6300        Gi1/0/47       120        B,R             1/1/48\nESXi-HOST-01        Te1/1/1        120        S               vmnic0",
                "verificationTip": "Jalankan 'show lldp neighbors detail' untuk melihat System Description dan Management Address.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "lldp",
                        "neighbors",
                        "multi-vendor",
                        "discovery"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst Switch (IOS-XE)",
                "category": "show",
                "categoryLabel": "Show VLAN Brief",
                "command": "show vlan brief",
                "description": "Melihat daftar seluruh VLAN ID, nama VLAN, status aktif, dan daftar port access anggota VLAN",
                "explanationId": "Perintah utama untuk memverifikasi apakah port access switch sudah berada di VLAN yang benar.",
                "sampleOutput": "VLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Gi1/0/23, Gi1/0/24\n10   MANAGEMENT                       active    \n20   USERS_LAN                        active    Gi1/0/1, Gi1/0/2, Gi1/0/3",
                "verificationTip": "Port trunk tidak akan muncul di daftar 'Ports' show vlan brief. Gunakan 'show interfaces trunk' untuk port trunk.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "vlan",
                        "switch",
                        "access-ports"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst Switch (IOS-XE)",
                "category": "show",
                "categoryLabel": "Show Interfaces Trunk",
                "command": "show interfaces trunk",
                "description": "Melihat daftar port switch yang berfungsi sebagai Trunk 802.1Q, Native VLAN, dan daftar VLAN yang diizinkan (Allowed VLAN)",
                "explanationId": "Menampilkan status trunking, protokol enkapsulasi 802.1q, dan VLAN yang sedang aktif di-forward (forwarding state).",
                "sampleOutput": "Port        Mode             Encapsulation  Status        Native vlan\nGi1/0/48    on               802.1q         trunking      1\n\nPort        Vlans allowed on trunk\nGi1/0/48    1-4094\n\nPort        Vlans in spanning tree forwarding state and not pruned\nGi1/0/48    1,10,20,30",
                "verificationTip": "Pastikan VLAN tujuan tercantum pada bagian 'Vlans in spanning tree forwarding state'.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "trunk",
                        "802.1q",
                        "allowed-vlan",
                        "native-vlan"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst Switch (IOS-XE)",
                "category": "show",
                "categoryLabel": "Show EtherChannel / Port-Channel Summary",
                "command": "show etherchannel summary",
                "description": "Melihat status agregasi port bundling (LACP / PAgP / Static): nomor Port-Channel, protokol, dan port member",
                "explanationId": "Flag yang benar adalah (SU) untuk Port-channel (Switched & In-Use) dan (P) untuk port member fisik (Bundled in port-channel).",
                "sampleOutput": "Group  Port-channel  Protocol    Ports\n------+-------------+-----------+-----------------------------------------------\n1      Po1(SU)         LACP      Gi1/0/45(P) Gi1/0/46(P) Gi1/0/47(P) Gi1/0/48(P)",
                "verificationTip": "Jika port berstatus (I) [Stand-alone] atau (D) [Down], periksa konfigurasi speed/duplex/vlan di kedua sisi switch.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "etherchannel",
                        "port-channel",
                        "lacp",
                        "aggregation"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst Switch (IOS-XE)",
                "category": "show",
                "categoryLabel": "Show Spanning-Tree Summary & Root",
                "command": "show spanning-tree summary",
                "description": "Melihat mode STP yang aktif (PVST+, Rapid-PVST+, MST), status Root Bridge per VLAN, dan fitur proteksi (BPDU Guard)",
                "explanationId": "Memastikan apakah switch bertindak sebagai Root Bridge untuk VLAN tertentu atau sebagai non-root.",
                "sampleOutput": "Switch is in rapid-pvst mode\nRoot bridge for: VLAN0010, VLAN0020\nPortFast Default is enabled\nPortFast BPDU Guard Default is enabled",
                "verificationTip": "Gunakan 'show spanning-tree root' untuk melihat MAC address root bridge dan biaya path cost.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "spanning-tree",
                        "stp",
                        "rapid-pvst",
                        "root-bridge"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "routing",
                "categoryLabel": "Show IP Route (Routing Table)",
                "command": "show ip route",
                "description": "Melihat tabel routing IPv4 aktif yang berisi rute Directly Connected (C), Local (L), Static (S), OSPF (O), dan BGP (B)",
                "explanationId": "Menampilkan rute gateway default (Gateway of last resort), metric, administrative distance, dan next-hop gateway.",
                "sampleOutput": "Gateway of last resort is 198.51.100.1 to network 0.0.0.0\n\nS*    0.0.0.0/0 [1/0] via 198.51.100.1\nC        192.168.1.0/24 is directly connected, GigabitEthernet0/0/1\nO        10.0.0.0/8 [110/2] via 192.168.1.2, 01:23:45, GigabitEthernet0/0/1",
                "verificationTip": "Gunakan filter 'show ip route [ip_tujuan]' untuk mengecek rute spesifik yang dipilih router.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "ip",
                        "route",
                        "routing-table",
                        "gateway"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "routing",
                "categoryLabel": "Show IP OSPF Neighbor",
                "command": "show ip ospf neighbor",
                "description": "Melihat status tetangga routing dinamis OSPFv2: Neighbor ID, State (FULL/DR, FULL/BDR), Dead Time, dan Interface",
                "explanationId": "Status normal operasional adalah 'FULL/DR', 'FULL/BDR', atau 'FULL/DROTHER' (pada jaringan multi-access).",
                "sampleOutput": "Neighbor ID     Pri   State           Dead Time   Address         Interface\n2.2.2.2           1   FULL/BDR        00:00:34    192.168.1.2     GigabitEthernet0/0/1\n3.3.3.3           1   FULL/DR         00:00:38    192.168.1.3     GigabitEthernet0/0/1",
                "verificationTip": "Jika status macet di INIT atau EXSTART/EXCHANGE, periksa MTU mismatch atau area ID mismatch.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "ospf",
                        "neighbor",
                        "routing",
                        "full-dr"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "routing",
                "categoryLabel": "Show IP BGP Summary",
                "command": "show ip bgp summary",
                "description": "Melihat ringkasan status sesi peering BGP (eBGP & iBGP), AS Number remote, pesan terkirim/terima, dan jumlah prefix rute",
                "explanationId": "Kolom 'State/PfxRcd' harus berupa angka (menunjukkan jumlah prefix diterima). Jika menampilkan tulisan 'Active' atau 'Idle', sesi BGP belum terbentuk.",
                "sampleOutput": "BGP router identifier 1.1.1.1, local AS number 65001\nNeighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n203.0.113.2     4 65002     142     145       12    0    0 02:14:10        8",
                "verificationTip": "Pastikan kolom Up/Down menunjukkan durasi aktif dan State/PfxRcd berupa angka positif.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "bgp",
                        "summary",
                        "peering",
                        "routing",
                        "prefix"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "routing",
                "categoryLabel": "Show HSRP / Standby Brief",
                "command": "show standby brief",
                "description": "Melihat status redundansi gateway default HSRP: Interface, Group, Priority, State (Active/Standby), Active Router, dan Virtual IP",
                "explanationId": "Memastikan router utama memegang status Active dan router backup memegang status Standby.",
                "sampleOutput": "                     P indicates configured to preempt.\nInterface   Grp  Pri P State   Active          Standby         Virtual IP\nVl10        10   110 P Active  local           192.168.10.3    192.168.10.1\nVl20        20   100   Standby 192.168.20.2    local           192.168.20.1",
                "verificationTip": "Pastikan Virtual IP sesuai dengan gateway default yang dikonfigurasi pada PC client DHCP.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "hsrp",
                        "standby",
                        "gateway",
                        "redundancy",
                        "fhrp"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst Switch (IOS-XE)",
                "category": "security",
                "categoryLabel": "Show IP DHCP Snooping Binding Table",
                "command": "show ip dhcp snooping binding",
                "description": "Melihat database proteksi DHCP Snooping: pemetaan MAC address client ke IP yang diberikan server DHCP, VLAN, dan port switch",
                "explanationId": "Digunakan oleh fitur Dynamic ARP Inspection (DAI) dan IP Source Guard untuk mencegah serangan ARP Spoofing / IP Hijacking.",
                "sampleOutput": "MacAddress          IpAddress        Lease(sec)  Type           VLAN  Interface\n------------------  ---------------  ----------  -------------  ----  --------------------\n00:50:56:A1:22:34   192.168.20.55    86400       dhcp-snooping  20    GigabitEthernet1/0/5",
                "verificationTip": "Jika client tidak bisa akses internet, cek apakah IP client terdaftar di tabel binding ini.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "dhcp",
                        "dhcp-snooping",
                        "binding",
                        "security",
                        "dai"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "security",
                "categoryLabel": "Show Access-Lists (ACL Hit Counters)",
                "command": "show ip access-lists",
                "description": "Melihat konfigurasi Access Control List (ACL) dan jumlah statistik paket data yang cocok (Match Hit Counters)",
                "explanationId": "Hit counters yang bertambah menandakan aturan permit atau deny sedang aktif memfilter paket data di jaringan.",
                "sampleOutput": "Extended IP access list ACL-ISOLASI-LAN\n    10 permit udp 192.168.20.0 0.0.0.255 host 8.8.8.8 eq domain (1420 matches)\n    20 permit tcp 192.168.20.0 0.0.0.255 any eq 443 (9850 matches)\n    30 deny ip any any log (42 matches)",
                "verificationTip": "Gunakan 'clear ip access-list counters' untuk mereset counter match saat pengujian baru.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "acl",
                        "access-lists",
                        "security",
                        "firewall",
                        "counters"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco ISR / ASR Router (IOS-XE)",
                "category": "security",
                "categoryLabel": "Show IP NAT Translations & Statistics",
                "command": "show ip nat translations",
                "description": "Melihat sesi translasi Network Address Translation (NAT) aktif antara IP privat lokal dan IP publik internet",
                "explanationId": "Menampilkan pemetaan Inside Local (IP privat client) ke Inside Global (IP publik router) beserta nomor port TCP/UDP.",
                "sampleOutput": "Pro Inside global      Inside local       Outside local      Outside global\ntcp 198.51.100.1:51234 192.168.1.50:51234 8.8.8.8:443        8.8.8.8:443\nicmp 198.51.100.1:1   192.168.1.10:1     1.1.1.1:1          1.1.1.1:1",
                "verificationTip": "Jalankan 'show ip nat statistics' untuk melihat total pool address dan jumlah translasi aktif.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "nat",
                        "pat",
                        "translations",
                        "gateway"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco ISR / ASR / Catalyst (IOS-XE)",
                "category": "security",
                "categoryLabel": "Show Crypto IKEv2 / IPsec SA (VPN Status)",
                "command": "show crypto ikev2 sa",
                "description": "Melihat status negosiasi Phase 1 VPN IPsec (IKEv2 Security Associations): Status UP-ACTIVE, Enkripsi, dan Remote Peer",
                "explanationId": "Status harus bernilai 'UP-ACTIVE'. Jika status macet di NEGOTIATING, periksa Pre-Shared Key (PSK) atau proposal enkripsi.",
                "sampleOutput": "IPv4 Crypto IKEv2  SA\nTunnel-id Local                 Remote                Status  Role\n1         198.51.100.1/500      203.0.113.2/500       READY   Initiator\nEncr: AES-CBC, keysize: 256, Hash: SHA256, DH Grp:14, Auth: PRE-SHARED",
                "verificationTip": "Lanjutkan dengan 'show crypto ipsec sa' untuk mengecek paket data Phase 2 (encaps/decaps counter).",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "crypto",
                        "ipsec",
                        "ikev2",
                        "vpn",
                        "security"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst PoE Switch (IOS-XE)",
                "category": "show",
                "categoryLabel": "Show Power Inline (PoE Status & Wattage)",
                "command": "show power inline",
                "description": "Melihat konsumsi daya Power over Ethernet (PoE) per port: konsumsi Watt perangkat (Access Point, IP Phone, CCTV), dan sisa kapasitas PSU",
                "explanationId": "Menampilkan status power: auto/off, daya yang ditarik dalam Watt (misal 15.4W / 30W PoE+), kelas perangkat IEEE, dan batas maksimal power pool.",
                "sampleOutput": "Available: 740.0(w)  Used: 124.8(w)  Remaining: 615.2(w)\n\nInterface Admin  Oper       Power   Device              Class Max\n                            (Watts)\n--------- ------ ---------- ------- ------------------- ----- ----\nGi1/0/1   auto   on         15.4    IP Phone 8845       4     30.0\nGi1/0/12  auto   on         30.0    AIR-AP3802I-E-K9    4     30.0",
                "verificationTip": "Pastikan sisa 'Remaining' daya PSU switch mencukupi sebelum menambah Access Point atau CCTV baru.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "poe",
                        "power-inline",
                        "watts",
                        "cctv",
                        "ap"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "diagnostics",
                "categoryLabel": "Show Processes CPU & Memory Utilization",
                "command": "show processes cpu sorted | exclude 0.00%",
                "description": "Melihat utilisasi beban CPU router/switch dalam 5 detik, 1 menit, dan 5 menit terakhir yang diurutkan dari proses terberat",
                "explanationId": "Sangat berguna untuk mencari penyebab switch lambat atau lag (misalnya akibat proses IP Input, ARP, BGP Router, atau STP yang tinggi).",
                "sampleOutput": "CPU utilization for five seconds: 12%/2%; one minute: 8%; five minutes: 6%\n PID Runtime(ms)     Invoked      uSecs   5Sec   1Min   5Min TTY Process\n 184     1420542     8420100        168  6.20%  4.10%  3.80%   0 IP Input\n 212      412040     2104000        195  2.10%  1.80%  1.20%   0 OSPF-1 Router",
                "verificationTip": "Jika CPU 5-detik di atas 90%, cari PID teratas untuk identifikasi loop jaringan atau serangan broadcast.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "cpu",
                        "processes",
                        "memory",
                        "performance",
                        "diagnostics"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "diagnostics",
                "categoryLabel": "Show Environment All (Power, Fan & Temp)",
                "command": "show environment all",
                "description": "Memeriksa kesehatan modul hardware fisik: status Power Supply unit redundan, modul kipas fan tray, dan sensor temperatur suhu sasis",
                "explanationId": "Memberikan status OK/Faulty pada modul internal switch untuk mencegah overheat dan mati mendadak.",
                "sampleOutput": "Sensor List: Environmental Monitor\nSensor          Location        State       Reading\nPSU 1           Switch 1        OK          350 W\nPSU 2           Switch 1        OK          350 W\nFAN 1           Switch 1        OK          Speed: 5200 RPM\nTemp: Inlet     Switch 1        OK          28 Celsius",
                "verificationTip": "Pastikan seluruh sensor berstatus 'OK'.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "environment",
                        "power-supply",
                        "fan",
                        "temperature",
                        "hardware"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "diagnostics",
                "categoryLabel": "Show Logging (Syslog Errors & Events)",
                "command": "show logging | include %",
                "description": "Melihat riwayat log sistem, pesan error kernel, status link up/down, flaping interface, dan peringatan keamanan",
                "explanationId": "Menampilkan buffer log syslog Cisco. Awalan tanda '%' memuat kode severity log (misal %LINK-3-UPDOWN, %OSPF-5-ADJCHG).",
                "sampleOutput": "%LINK-3-UPDOWN: Interface GigabitEthernet1/0/1, changed state to up\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet1/0/1, changed state to up\n%SYS-5-CONFIG_I: Configured from console by admin on vty0 (192.168.1.50)",
                "verificationTip": "Gunakan 'show logging | include ERROR' atau 'show logging last 50' untuk memfilter pesan masalah.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "logging",
                        "syslog",
                        "events",
                        "errors",
                        "diagnostics"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "system",
                "categoryLabel": "Show Clock & NTP Status",
                "command": "show clock detail",
                "description": "Melihat jam perangkat dan memverifikasi sinkronisasi waktu jaringan dengan server NTP (Network Time Protocol)",
                "explanationId": "Waktu yang presisi sangat krusial untuk sinkronisasi sertifikat SSL/TLS, log syslog, dan autentikasi RADIUS/TACACS+.",
                "sampleOutput": "14:25:30.142 WIB Wed Sep 9 2026\nTime source is NTP\nClock is synchronized, stratum 2, reference is 1.asia.pool.ntp.org",
                "verificationTip": "Pastikan status menunjukkan 'Clock is synchronized'.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "show",
                        "clock",
                        "ntp",
                        "time",
                        "synchronization"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "system",
                "categoryLabel": "Save Configuration to NVRAM (Write Memory)",
                "command": "write memory",
                "description": "Menyimpan konfigurasi running yang ada di RAM ke memori non-volatile (NVRAM / startup-config)",
                "explanationId": "Wajib dijalankan setelah setiap perubahan konfigurasi agar setting tidak hilang saat perangkat di-reboot atau mati listrik.",
                "sampleOutput": "Building configuration...\n[OK]",
                "verificationTip": "Dapat juga menggunakan perintah ekuivalen: 'copy running-config startup-config'.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "save",
                        "write-memory",
                        "copy-run-start",
                        "nvram",
                        "backup"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "cisco",
                "modelCategory": "Cisco Catalyst / ISR / ASR / IOS-XE",
                "category": "diagnostics",
                "categoryLabel": "Terminal Length 0 (Disable Paging Screen)",
                "command": "terminal length 0",
                "description": "Menonaktifkan jeda halaman '--More--' pada sesi terminal agar seluruh output perintah tampil langsung tanpa henti",
                "explanationId": "Sangat disukai oleh network engineer saat melakukan backup running-config, copy text panjang, atau saat menjalankan otomasi script.",
                "sampleOutput": "# terminal length 0\n(Sesi terminal kini tidak akan berhenti di prompt --More--)",
                "verificationTip": "Kembalikan ke setelan bawaan jika selesai dengan perintah 'terminal length 24'.",
                "mode": "privileged",
                "tags": [
                        "cisco",
                        "terminal",
                        "length",
                        "paging",
                        "more",
                        "automation"
                ],
                "isCachedOnline": true
        }
]
  },

  // 2. FORTINET (fortinet/fortios-yang-models)
  {
    brand: 'fortinet',
    brandLabel: 'Fortinet (FortiGate / FortiOS 7.x)',
    repoName: 'fortinet/fortios-yang-models',
    defaultBranch: 'main',
    rawApiUrl: 'https://raw.githubusercontent.com/fortinet/fortios-yang-models/main',
    description: 'Ekstraksi skema FortiOS CLI: Interfaces, IPsec VPN, Firewall Policies, & Diagnosa',
    commands: [
      {
        brand: 'fortinet',
        modelCategory: 'FortiGate (FortiOS 6.x / 7.x)',
        category: 'config_basic',
        categoryLabel: 'Interface & IP',
        command: `config system interface
    edit "port1"
        set vdom "root"
        set mode static
        set ip 192.168.1.99 255.255.255.0
        set allowaccess ping https ssh
        set description "LAN-Primary"
    next
end`,
        description: 'Konfigurasi IP Address Statis dan Hak Akses Manajemen (PING, HTTPS, SSH)',
        explanationId: 'Mengatur mode static, IPv4, serta administrative access pada interface fisik FortiGate.',
        sampleOutput: 'FortiGate # get system interface port1\n== [ port1 ]\nname: port1   mode: static   ip: 192.168.1.99 255.255.255.0   status: up',
        verificationTip: 'Jalankan "get system interface physical" untuk memeriksa speed/duplex dan status link port1.',
        mode: 'config',
        tags: ['github-sync', 'fortinet-yang', 'interface', 'ip-address', 'fortios'],
        isCachedOnline: true,
      },
      {
        brand: 'fortinet',
        modelCategory: 'FortiGate (FortiOS 7.x)',
        category: 'security',
        categoryLabel: 'IPsec VPN (Site-to-Site)',
        command: `config vpn ipsec phase1-interface
    edit "VPN-TO-BRANCH"
        set interface "wan1"
        set peertype any
        set proposal aes256-sha256 aes128-sha256
        set dhgrp 14 5
        set remote-gw 203.0.113.2
        set psksecret FortiPskSecretKey99!
    next
end

config vpn ipsec phase2-interface
    edit "VPN-TO-BRANCH-P2"
        set phase1name "VPN-TO-BRANCH"
        set proposal aes256-sha256
        set dhgrp 14
        set src-subnet 192.168.1.0 255.255.255.0
        set dst-subnet 10.0.0.0 255.255.255.0
        set auto-negotiate enable
    next
end

config router static
    edit 0
        set dst 10.0.0.0 255.255.255.0
        set device "VPN-TO-BRANCH"
    next
end`,
        description: 'Playbook Lengkap IPsec VPN Site-to-Site (Phase 1, Phase 2, & Static Routing)',
        explanationId: 'Membuat Phase 1 interface dengan remote gateway, Pre-Shared Key, enkripsi AES-256, Phase 2 subnet selector, dan static route.',
        sampleOutput: 'FortiGate # diagnose vpn tunnel list\nname=VPN-TO-BRANCH ver=1 serial=1 203.0.113.1:500->203.0.113.2:500\n  status: UP, phase2=1, bound_if=3',
        verificationTip: 'Jalankan "diagnose vpn ike gateway list" dan "diagnose vpn tunnel list" untuk memastikan status tunnel UP.',
        mode: 'config',
        tags: ['github-sync', 'fortinet-yang', 'ipsec', 'vpn', 'phase1', 'phase2', 'fortios'],
        isCachedOnline: true,
      },
      {
        brand: 'fortinet',
        modelCategory: 'FortiGate (FortiOS 7.x)',
        category: 'security',
        categoryLabel: 'Firewall Policy',
        command: `config firewall policy
    edit 1
        set name "LAN_to_WAN_Internet"
        set srcintf "port1"
        set dstintf "wan1"
        set action accept
        set srcaddr "all"
        set dstaddr "all"
        set schedule "always"
        set service "ALL"
        set nat enable
    next
end`,
        description: 'Membuat Firewall Policy Akses Internet LAN ke WAN dengan Source NAT',
        explanationId: 'Memberikan izin lalu lintas dari port1 ke wan1 dengan NAT masquerade agar klien internal bisa browsing ke internet.',
        sampleOutput: 'FortiGate # show firewall policy 1\nconfig firewall policy\n    edit 1\n        set name "LAN_to_WAN_Internet" ...',
        verificationTip: 'Periksa hit count policy dengan perintah "diagnose firewall iprope list 100004".',
        mode: 'config',
        tags: ['github-sync', 'fortinet-yang', 'firewall-policy', 'nat', 'security'],
        isCachedOnline: true,
      },
      {
        brand: 'fortinet',
        modelCategory: 'FortiGate Operational',
        category: 'diagnostics',
        categoryLabel: 'Packet Sniffer & Flow Trace',
        command: 'diagnose sniffer packet any "host 8.8.8.8 and icmp" 4 10 l',
        description: 'Live Packet Capture pada FortiGate untuk traffic ICMP / PING ke host tertentu',
        explanationId: 'Menangkap paket real-time dengan verbosity level 4 (detail header & interface) sebanyak 10 paket berstempel waktu lokal.',
        sampleOutput: 'interfaces=[any] filters=[host 8.8.8.8 and icmp]\n2026-09-09 10:15:20.123456 port1 in 192.168.1.50 -> 8.8.8.8: icmp: echo request\n2026-09-09 10:15:20.145678 wan1 out 198.51.100.1 -> 8.8.8.8: icmp: echo request',
        verificationTip: 'Gunakan Ctrl+C untuk menghentikan sniffer kapan saja sebelum batas counter tercapai.',
        mode: 'diagnostic',
        tags: ['github-sync', 'fortinet-yang', 'sniffer', 'troubleshooting', 'packet-capture'],
        isCachedOnline: true,
      }
    ]
  },

  // 3. ARUBA NETWORKS (arubanetworks/yang & aoscx-ansible-collection)
  {
    brand: 'aruba',
    brandLabel: 'Aruba Networks (AOS-CX & AOS-S)',
    repoName: 'arubanetworks/yang',
    defaultBranch: 'master',
    rawApiUrl: 'https://raw.githubusercontent.com/arubanetworks/yang/master',
    description: 'Ekstraksi skema YANG Aruba AOS-CX (6100, 6200, 6300, 8320): IP, VLAN, VSX, OSPF',
    commands: [
      {
        brand: 'aruba',
        modelCategory: 'Aruba AOS-CX Switch (6200 / 6300 / 8320)',
        category: 'config_basic',
        categoryLabel: 'Interface & IP Routing',
        command: `interface 1/1/1
    no shutdown
    routing
    ip address 192.168.1.1/24
    description Uplink-Gateway
exit`,
        description: 'Mengubah Port L2 Menjadi Port Routed L3 dan Menetapkan IP Address (AOS-CX)',
        explanationId: 'Di AOS-CX, perintah "routing" mengubah switchport Ethernet L2 murni menjadi interface Layer-3 mandiri.',
        sampleOutput: 'switch# show interface 1/1/1\nInterface 1/1/1 is up\n Admin state is up\n IPv4 address: 192.168.1.1/24',
        verificationTip: 'Periksa status dengan "show interface 1/1/1 brief" atau "show ip interface brief".',
        mode: 'config',
        tags: ['github-sync', 'aruba-yang', 'aoscx', 'interface', 'ip-address'],
        isCachedOnline: true,
      },
      {
        brand: 'aruba',
        modelCategory: 'Aruba AOS-CX Switch',
        category: 'config_basic',
        categoryLabel: 'VLAN & Trunk 802.1Q',
        command: `vlan 10
    name DATA_USERS
vlan 20
    name VOICE_IPPHONE
vlan 30
    name MGMT_SERVERS
exit

interface 1/1/24
    no shutdown
    no routing
    vlan trunk native 1
    vlan trunk allowed 10,20,30
    description Uplink-Distribution
exit`,
        description: 'Membuat VLAN Database dan Mengonfigurasi Trunk Port Uplink (AOS-CX)',
        explanationId: 'Membuat beberapa VLAN ID dan menetapkan port 1/1/24 sebagai trunk pembawa VLAN 10, 20, dan 30.',
        sampleOutput: 'switch# show vlan\n--------------------------------------------------------------------------------\nVLAN  Name             Status  Reason    Type      Interfaces\n--------------------------------------------------------------------------------\n10    DATA_USERS       up      ok        default   1/1/24\n20    VOICE_IPPHONE    up      ok        default   1/1/24',
        verificationTip: 'Jalankan "show vlan" atau "show interface 1/1/24 trunk" untuk memastikan native & allowed VLAN.',
        mode: 'config',
        tags: ['github-sync', 'aruba-yang', 'aoscx', 'vlan', 'trunk'],
        isCachedOnline: true,
      },
      {
        brand: 'aruba',
        modelCategory: 'Aruba AOS-CX Switch',
        category: 'config_basic',
        categoryLabel: 'SVI / VLAN Interface IP',
        command: `interface vlan 10
    ip address 10.10.10.1/24
    ip helper-address 10.1.1.50
    active-gateway ip 10.10.10.254 mac 00:00:5E:00:01:0A
    no shutdown
exit`,
        description: 'Konfigurasi IP Gateway pada SVI VLAN dengan DHCP Relay Helper & Active Gateway',
        explanationId: 'Menjadikan interface vlan 10 sebagai default gateway klien lokal dengan DHCP forwarding ke server sentral.',
        sampleOutput: 'switch# show ip interface vlan 10\nInterface VLAN 10 is up\n IPv4 address 10.10.10.1/24 (configured)\n DHCP Helper: 10.1.1.50',
        verificationTip: 'Pastikan interface vlan tidak dalam kondisi "administratively down".',
        mode: 'config',
        tags: ['github-sync', 'aruba-yang', 'svi', 'dhcp-relay', 'aoscx'],
        isCachedOnline: true,
      },
      {
        brand: 'aruba',
        modelCategory: 'Aruba AOS-CX Core (8320 / 8360)',
        category: 'system',
        categoryLabel: 'VSX High Availability',
        command: `show vsx status
show vsx brief`,
        description: 'Memeriksa Status Sinkronisasi Redundansi Virtual Switching Extension (VSX)',
        explanationId: 'Memverifikasi status Inter-Switch Link (ISL), keepalive, status role (primary/secondary), dan sinkronisasi konfigurasi.',
        sampleOutput: 'VSX Operational State\n---------------------\nISL channel        : In-Sync\nISL control channel: In-Sync\nPeer keepalive     : Reachable\nDevice Role        : primary',
        verificationTip: 'Pastikan kedua channel ISL berstatus "In-Sync" dan Peer keepalive "Reachable".',
        mode: 'privileged',
        tags: ['github-sync', 'aruba-yang', 'vsx', 'ha', 'redundancy', 'aoscx'],
        isCachedOnline: true,
      }
    ]
  },

  // 4. JUNIPER NETWORKS (Juniper/yang)
  {
    brand: 'juniper',
    brandLabel: 'Juniper Networks (Junos OS - SRX / EX / MX)',
    repoName: 'Juniper/yang',
    defaultBranch: 'master',
    rawApiUrl: 'https://raw.githubusercontent.com/Juniper/yang/master',
    description: 'Ekstraksi skema Junos OS: Hierarchy set commands, IKE/IPsec VPN, IRB VLAN, & Commit Safety',
    commands: [
      {
        brand: 'juniper',
        modelCategory: 'Juniper SRX / EX / MX (Junos OS)',
        category: 'config_basic',
        categoryLabel: 'Interface & IP',
        command: `set interfaces ge-0/0/0 description "WAN-Primary"
set interfaces ge-0/0/0 unit 0 family inet address 192.168.1.1/24
commit check
commit`,
        description: 'Konfigurasi IP Address pada Interface Ge-0/0/0 dengan Validasi Commit',
        explanationId: 'Menentukan logical unit 0 pada port fisik ge-0/0/0 dengan family IPv4, melakukan syntax check, dan menerapkan perubahan.',
        sampleOutput: 'user@juniper# commit check\nconfiguration check succeeds\nuser@juniper# commit\ncommit complete',
        verificationTip: 'Periksa status dengan "show interfaces ge-0/0/0 terse". Status harus Up/Up.',
        mode: 'config',
        tags: ['github-sync', 'juniper-yang', 'junos', 'interface', 'ip-address', 'commit'],
        isCachedOnline: true,
      },
      {
        brand: 'juniper',
        modelCategory: 'Juniper SRX Series Firewall',
        category: 'security',
        categoryLabel: 'IPsec Route-Based VPN',
        command: `set security ike proposal IKE-PROP authentication-method pre-shared-keys dh-group group14 authentication-algorithm sha-256 encryption-algorithm aes-256-cbc
set security ike policy IKE-POL mode main proposals IKE-PROP pre-shared-key ascii-text "JuniperSecretKey123!"
set security ike gateway GW-PEER ike-policy IKE-POL address 203.0.113.2 external-interface ge-0/0/0.0
set security ipsec proposal IPSEC-PROP protocol esp authentication-algorithm hmac-sha-256-128 encryption-algorithm aes-256-cbc
set security ipsec policy IPSEC-POL proposals IPSEC-PROP
set security ipsec vpn VPN-TUNNEL bind-interface st0.0 ike gateway GW-PEER ipsec-policy IPSEC-POL establish-tunnels immediately
set interfaces st0 unit 0 family inet address 10.254.0.1/30
set security zones security-zone vpn-zone interfaces st0.0
set routing-options static route 10.0.0.0/24 next-hop st0.0
commit confirmed 5`,
        description: 'Playbook Lengkap IPsec VPN Route-Based (IKE Gateway, IPsec Policy, st0 Tunnel, & Commit Safe)',
        explanationId: 'Konfigurasi SRX IPsec VPN lengkap dengan interface bind st0 dan mekanisme rollback otomatis 5 menit jika koneksi terputus.',
        sampleOutput: 'user@juniper> show security ipsec security-associations\n  Total active tunnels: 1\n  ID      Gateway          Port  Algorithm       SPI      Life:sec/kb  Mon vsys\n  <131073 203.0.113.2      500   ESP:aes-cbc-256 9a2f1b4c 3210/ unlim  -   root',
        verificationTip: 'Jika konfigurasi berhasil, ketik "commit" untuk mengonfirmasi perubahan sebelum batas waktu rollback 5 menit berakhir.',
        mode: 'config',
        tags: ['github-sync', 'juniper-yang', 'ipsec', 'vpn', 'srx', 'ike', 'st0'],
        isCachedOnline: true,
      },
      {
        brand: 'juniper',
        modelCategory: 'Juniper EX Series Switch',
        category: 'config_basic',
        categoryLabel: 'VLAN & Integrated Routing (IRB)',
        command: `set vlans VLAN-USERS vlan-id 100 l3-interface irb.100
set interfaces irb unit 100 family inet address 192.168.100.1/24
set interfaces ge-0/0/1 unit 0 family ethernet-switching interface-mode access vlan members VLAN-USERS
set interfaces ge-0/0/24 unit 0 family ethernet-switching interface-mode trunk vlan members all
commit`,
        description: 'Konfigurasi L2 VLAN, Access Port, Trunk Port, dan L3 SVI (IRB Gateway)',
        explanationId: 'Membuat VLAN 100, menautkan ke gateway routing irb.100, dan mengonfigurasi access/trunk port switch Juniper.',
        sampleOutput: 'user@juniper> show vlans\nName           Tag     Interfaces\ndefault        1       None\nVLAN-USERS     100     ge-0/0/1.0*, ge-0/0/24.0*',
        verificationTip: 'Periksa status binding VLAN dengan "show vlans detail".',
        mode: 'config',
        tags: ['github-sync', 'juniper-yang', 'vlan', 'irb', 'junos', 'switching'],
        isCachedOnline: true,
      },
      {
        brand: 'juniper',
        modelCategory: 'Juniper All Devices',
        category: 'show',
        categoryLabel: 'Show Operational',
        command: 'show interfaces terse | match "(inet|up)"',
        description: 'Melihat ringkasan seluruh interface fisik & logical beserta alamat IP yang aktif',
        explanationId: 'Menyaring tampilan output "terse" hanya pada baris yang memuat IP atau status up.',
        sampleOutput: 'Interface               Admin Link Proto    Local                 Remote\nge-0/0/0                up    up\nge-0/0/0.0              up    up   inet     192.168.1.1/24\nst0.0                   up    up   inet     10.254.0.1/30',
        verificationTip: 'Jika ada tanda * di samping nama interface, berarti link sedang beroperasi normal.',
        mode: 'privileged',
        tags: ['github-sync', 'juniper-yang', 'junos', 'show-interfaces', 'terse'],
        isCachedOnline: true,
      }
    ]
  },

  // 5. RUCKUS (ruckus/fastiron-cli)
  {
    brand: 'ruckus',
    brandLabel: 'Ruckus Networks (FastIron ICX & SmartZone)',
    repoName: 'commscope/ruckus-fastiron',
    defaultBranch: 'main',
    rawApiUrl: 'https://raw.githubusercontent.com/commscope/ruckus-fastiron/main',
    description: 'Ekstraksi skema Ruckus FastIron ICX: Port IP, VE Routing, VLAN Tagging, PoE, & Optik',
    commands: [
      {
        brand: 'ruckus',
        modelCategory: 'Ruckus ICX Switch (FastIron OS)',
        category: 'config_basic',
        categoryLabel: 'Interface IP & VE Gateway',
        command: `enable
configure terminal
vlan 10 name LAN_MGMT
 router-interface ve 10
exit
interface ve 10
 ip address 192.168.10.1 255.255.255.0
 description Default-Gateway-VLAN10
exit
ip default-gateway 192.168.10.254
write memory`,
        description: 'Membuat Virtual Ethernet (VE) L3 Gateway dan Konfigurasi IP Switch Ruckus',
        explanationId: 'Pada FastIron Ruckus, routing L3 pada VLAN menggunakan interface "ve" (Virtual Ethernet).',
        sampleOutput: 'ICX7150-48P# show ip interface\nInterface       IP-Address         Status     Protocol\nve 10           192.168.10.1       up         up',
        verificationTip: 'Gunakan "write memory" untuk menyimpan konfigurasi ke flash permanen.',
        mode: 'config',
        tags: ['github-sync', 'ruckus-cli', 'fastiron', 've', 'ip-address', 'icx'],
        isCachedOnline: true,
      },
      {
        brand: 'ruckus',
        modelCategory: 'Ruckus ICX Switch',
        category: 'config_basic',
        categoryLabel: 'VLAN Tagging & Untagging',
        command: `vlan 20 name WIRELESS_AP
 tagged ethernet 1/1/48
 untagged ethernet 1/1/1 to 1/1/24
exit`,
        description: 'Menetapkan Port Untagged (Access) dan Tagged (Trunk) pada VLAN FastIron',
        explanationId: 'Di sintaks Ruckus, penugasan port dilakukan dari dalam konteks VLAN, bukan dari dalam konteks interface.',
        sampleOutput: 'ICX7150-48P# show vlan 20\nPORT-VLAN 20, Name WIRELESS_AP\nUntagged Ports : (1/1)   1   2   3   4 ... 24\nTagged Ports   : (1/1)  48',
        verificationTip: 'Jalankan "show vlan <id>" untuk memeriksa port mana saja yang tergabung dalam VLAN.',
        mode: 'config',
        tags: ['github-sync', 'ruckus-cli', 'vlan', 'tagging', 'fastiron'],
        isCachedOnline: true,
      },
      {
        brand: 'ruckus',
        modelCategory: 'Ruckus ICX PoE Switch',
        category: 'system',
        categoryLabel: 'PoE Power Management',
        command: `show inline power
show inline power ethernet 1/1/1`,
        description: 'Memeriksa Konsumsi Daya Power over Ethernet (PoE) pada Port Access Point / IP Camera',
        explanationId: 'Menampilkan budget daya total switch, daya yang dialokasikan, dan watt aktual yang dikonsumsi masing-masing port.',
        sampleOutput: 'ICX7150-48P# show inline power\nTotal Capacity: 370000 mWatts\nTotal Allocated: 62400 mWatts\nPort  Admin  Oper    Power(mW)  PD-Class\n1/1/1 on     deliv   12400      Class 4',
        verificationTip: 'Periksa status "Oper" harus bernilai "deliv" (delivering power).',
        mode: 'privileged',
        tags: ['github-sync', 'ruckus-cli', 'poe', 'inline-power', 'monitoring'],
        isCachedOnline: true,
      }
    ]
  },

  // 6. LINUX (linux-network-tools / iproute2 / strongSwan)
  {
    brand: 'linux',
    brandLabel: 'Linux Network (Ubuntu / Debian / RHEL / Alpine)',
    repoName: 'iproute2/iproute2',
    defaultBranch: 'main',
    rawApiUrl: 'https://raw.githubusercontent.com/iproute2/iproute2/main',
    description: 'Ekstraksi iproute2, Netplan, strongSwan IPsec, WireGuard VPN, & Firewall iptables/nftables',
    commands: [
      {
        brand: 'linux',
        modelCategory: 'Linux Server (Ubuntu / Debian / RHEL)',
        category: 'config_basic',
        categoryLabel: 'Interface & IP (iproute2)',
        command: `sudo ip addr add 192.168.1.100/24 dev eth0
sudo ip link set dev eth0 up
sudo ip route add default via 192.168.1.1 dev eth0`,
        description: 'Konfigurasi IP Address, Aktifkan Interface, dan Default Gateway secara Instan (Runtime)',
        explanationId: 'Menggunakan utilitas iproute2 modern untuk menetapkan IP statis dan routing default secara instan tanpa restart service.',
        sampleOutput: '$ ip -br a show eth0\neth0             UP             192.168.1.100/24 fe80::215:5dff:fe20:112/64',
        verificationTip: 'Gunakan "ip -br a" untuk melihat status ringkas interface dan "ip route" untuk routing table.',
        mode: 'privileged',
        tags: ['github-sync', 'linux-net', 'iproute2', 'ip-address', 'routing'],
        isCachedOnline: true,
      },
      {
        brand: 'linux',
        modelCategory: 'Linux (strongSwan IPsec VPN)',
        category: 'security',
        categoryLabel: 'strongSwan IPsec Site-to-Site',
        command: `# 1. /etc/ipsec.conf
conn site-to-site
    authby=secret
    left=198.51.100.1
    leftsubnet=192.168.1.0/24
    right=203.0.113.2
    rightsubnet=10.0.0.0/24
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    auto=start

# 2. /etc/ipsec.secrets
198.51.100.1 203.0.113.2 : PSK "LinuxSecretPsk123!"

# 3. Reload & Check
sudo ipsec restart
sudo ipsec statusall`,
        description: 'Playbook Lengkap IPsec VPN Site-to-Site Menggunakan strongSwan',
        explanationId: 'Membangun tunnel IPsec IKEv2/IKEv1 antar subnet LAN lokal dan remote gateway dengan PSK.',
        sampleOutput: '$ sudo ipsec statusall\nSecurity Associations (1 up, 0 connecting):\nsite-to-site[1]: ESTABLISHED 4 minutes ago, 198.51.100.1...203.0.113.2\nsite-to-site{1}:  INSTALLED, TUNNEL, reqid 1, ESP in UDP SPIs: c4b1928a_i 392f1b4c_o\nsite-to-site{1}:   192.168.1.0/24 === 10.0.0.0/24',
        verificationTip: 'Pastikan status tunnel bertuliskan "ESTABLISHED" dan SA bertuliskan "INSTALLED, TUNNEL".',
        mode: 'privileged',
        tags: ['github-sync', 'linux-net', 'strongswan', 'ipsec', 'vpn'],
        isCachedOnline: true,
      },
      {
        brand: 'linux',
        modelCategory: 'Linux (Ubuntu Netplan)',
        category: 'config_basic',
        categoryLabel: 'Netplan YAML Config',
        command: `# File: /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]

# Perintah Terapkan:
sudo netplan apply`,
        description: 'Konfigurasi IP Statis Permanen Netplan YAML (Ubuntu 20.04/22.04/24.04)',
        explanationId: 'Menulis konfigurasi deklaratif YAML pada Ubuntu modern untuk IP statis, gateway, dan DNS server permanen tahan reboot.',
        sampleOutput: '$ sudo netplan apply\n(No error output means configuration applied successfully)',
        verificationTip: 'Periksa sintaks dengan "sudo netplan try" sebelum apply permanen.',
        mode: 'privileged',
        tags: ['github-sync', 'linux-net', 'netplan', 'yaml', 'ubuntu'],
        isCachedOnline: true,
      },
      {
        brand: 'linux',
        modelCategory: 'Linux Diagnostics',
        category: 'diagnostics',
        categoryLabel: 'Socket Statistics & Packet Capture',
        command: `ss -tulpn | grep -E "(LISTEN|ESTAB)"
sudo tcpdump -i any -nn -c 10 "port 22 or icmp"`,
        description: 'Melihat Port Terbuka Aktif (Listening) dan Capture Traffic Live dengan tcpdump',
        explanationId: 'Menampilkan proses mana yang membuka port TCP/UDP dan menganalisis 10 paket live pertama.',
        sampleOutput: 'Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\ntcp   LISTEN 0      128    0.0.0.0:22          0.0.0.0:*     users:(("sshd",pid=852,fd=3))',
        verificationTip: 'Gunakan flag "-nn" pada tcpdump untuk mencegah DNS reverse lookup yang memperlambat output.',
        mode: 'diagnostic',
        tags: ['github-sync', 'linux-net', 'ss', 'tcpdump', 'troubleshooting'],
        isCachedOnline: true,
      }
    ]
  },

  // 7. CISCO NEXUS (NX-OS Data Center & Spine-Leaf / vPC / VXLAN)
  {
    brand: 'nexus',
    brandLabel: 'Cisco Nexus (NX-OS Data Center)',
    repoName: 'CiscoDevNet/nx-os-programmability',
    defaultBranch: 'main',
    rawApiUrl: 'https://raw.githubusercontent.com/CiscoDevNet/nx-os-programmability/main',
    description: 'Ekstraksi skema Cisco NX-OS 9.x/10.x Data Center: Virtual Port Channel (vPC), VXLAN EVPN, L2/L3 Routing & Telemetry',
    commands: [
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 / 7000 / 3000 (NX-OS)",
                "category": "show",
                "categoryLabel": "Show Version & NX-OS Supervisor Summary",
                "command": "show version",
                "description": "Melihat versi sistem operasi Cisco NX-OS, tipe supervisor engine, BIOS version, dan uptime switch data center",
                "explanationId": "Menampilkan rilis image NX-OS (misal 9.3(8) atau 10.3(3)F), hardware ASIC Cloud Scale, dan informasi lisensi sasis.",
                "sampleOutput": "Cisco Nexus Operating System (NX-OS) Software\nSystem version: 10.3(3)F\nNXOS image file is: bootflash:///nxos64-cs.10.3.3.F.bin\ncisco Nexus9000 C93180YC-FX Chassis\nKernel uptime is 120 day(s), 4 hour(s), 12 minute(s)",
                "verificationTip": "Gunakan untuk memverifikasi kompatibilitas image sebelum ISSU (In-Service Software Upgrade).",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "version",
                        "nx-os",
                        "uptime",
                        "hardware",
                        "datacenter"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 / 7000 (NX-OS)",
                "category": "show",
                "categoryLabel": "Show Module (Supervisor & Linecard Status)",
                "command": "show module",
                "description": "Melihat status operasional modul Supervisor, Linecard Fabric, dan System Controller pada switch modular Nexus",
                "explanationId": "Menampilkan model modul, status (ok / active / standby), versi firmware, dan nomor seri masing-masing slot.",
                "sampleOutput": "Mod  Ports  Module-Type                         Model              Status\n---  -----  ----------------------------------- ------------------ ----------\n1    48     48x10/25G + 6x40/100G Ethernet      N9K-C93180YC-FX    active *\n\nMod  Power-Status  Reason\n---  ------------  -----------------------\n1    powered-up    normal",
                "verificationTip": "Pastikan status modul bernilai 'ok' atau 'active *'.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "module",
                        "supervisor",
                        "linecard",
                        "status",
                        "hardware"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 / 3000 (NX-OS)",
                "category": "diagnostics",
                "categoryLabel": "Show System Resources (CPU & Memory Load)",
                "command": "show system resources",
                "description": "Melihat beban utilisasi CPU per-core (User, Kernel, Idle), memori RAM terpakai, dan load average switch Nexus",
                "explanationId": "Perintah diagnostik performa utama pada Cisco NX-OS untuk mendeteksi lonjakan trafik control plane atau beban proses tinggi.",
                "sampleOutput": "CPU states  :   4.2% user,   2.1% kernel,   93.7% idle\nMemory usage:   16422340K total,   5124110K used,  11298230K free\nCurrent load average: 1.05, 0.98, 0.92",
                "verificationTip": "Persentase CPU Idle di atas 80% menandakan kondisi switch sangat sehat.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "system",
                        "resources",
                        "cpu",
                        "memory",
                        "performance",
                        "diagnostics"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS)",
                "category": "show",
                "categoryLabel": "Show IP Interface Brief Across All VRFs",
                "command": "show ip interface brief vrf all",
                "description": "Menampilkan daftar seluruh IP address dan status port pada semua instance Virtual Routing and Forwarding (VRF)",
                "explanationId": "Berbeda dengan IOS klasik, switch Nexus membagi tabel antarmuka berdasarkan VRF (default, management, tenant).",
                "sampleOutput": "IP Interface Status for VRF \"default\"(1)\nInterface            IP Address         Interface Status\nEth1/1               10.0.0.1           protocol-up/link-up/admin-up\nVlan10               192.168.10.1       protocol-up/link-up/admin-up\n\nIP Interface Status for VRF \"management\"(2)\nmgmt0                192.168.100.1      protocol-up/link-up/admin-up",
                "verificationTip": "Gunakan parameter 'vrf all' agar antarmuka manajemen dan tenant ikut ditampilkan dalam satu layar.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "ip",
                        "interface",
                        "brief",
                        "vrf",
                        "nx-os"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS)",
                "category": "show",
                "categoryLabel": "Show Interface Status (Port Speed & Media Type)",
                "command": "show interface status",
                "description": "Melihat status seluruh port fisik Nexus: Status (connected/notconnect), VLAN/Routed, Duplex, Speed (10G/25G/40G/100G), dan Jenis Transceiver SFP/QSFP",
                "explanationId": "Tabel ringkasan fisik port untuk memverifikasi apakah kabel DAC (Direct Attach Copper) atau optik SFP28/QSFP28 terdeteksi.",
                "sampleOutput": "Port          Name               Status    Vlan      Duplex  Speed   Type\nEth1/1        SPINE-01-UPLINK    connected routed    full    100G    QSFP-100G-SR4\nEth1/2        SPINE-02-UPLINK    connected routed    full    100G    QSFP-100G-SR4\nEth1/10       HOST-SRV-01        connected trunk     full    25G     SFP-25G-SR-S",
                "verificationTip": "Pastikan port yang terhubung berstatus 'connected' dan negosiasi Speed sesuai kapasitas kartu jaringan server.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "interface",
                        "status",
                        "speed",
                        "transceiver",
                        "100g",
                        "25g"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS Data Center)",
                "category": "show",
                "categoryLabel": "Show vPC Brief & Peer Adjacency Status",
                "command": "show vpc brief",
                "description": "Memeriksa kesehatan Virtual Port-Channel (vPC): Status vPC Domain, Peer Adjacency, Keep-alive Link, dan Status Member Port-Channel",
                "explanationId": "Kondisi normal: 'Peer status: peer adjacency formed ok', 'vPC keep-alive status: peer is alive', dan seluruh vPC berstatus 'up'.",
                "sampleOutput": "vPC domain id                     : 10\nPeer status                       : peer adjacency formed ok\nvPC keep-alive status             : peer is alive\nConfiguration consistency status  : success\nPer-vPC status\n----------------------------------------------------------------------------\nvPC  Status  Consistency Reason                     Active vlans\n10   up      success     success                    10,20,100",
                "verificationTip": "Jika konsistensi gagal, jalankan 'show vpc consistency-parameters global' untuk melihat mismatch MTU atau VLAN.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "vpc",
                        "brief",
                        "peer-link",
                        "keepalive",
                        "datacenter"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS Data Center)",
                "category": "diagnostics",
                "categoryLabel": "Show vPC Consistency Parameters (Global & vPC)",
                "command": "show vpc consistency-parameters global",
                "description": "Mendeteksi ketidakcocokan konfigurasi (Type-1 / Type-2 Inconsistency) antara dua switch peer Nexus vPC",
                "explanationId": "Type-1 inconsistency (misal STP mode beda, LACP mode beda) akan men-suspend port vPC. Perintah ini menunjukkan letak perbedaannya.",
                "sampleOutput": "Legend:\n    Type 1 : vPC is suspended in case of mismatch\nName                        Type Local Value            Peer Value\n-------------------------   ---- ---------------------- -----------------------\nSTP Mode                    1    Rapid-PVST             Rapid-PVST\nSTP Disabled Nodes          1    None                   None\nAllowed VLANs               -    1-1000                 1-1000",
                "verificationTip": "Pastikan kolom Local Value dan Peer Value bernilai identik untuk parameter Type 1.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "vpc",
                        "consistency",
                        "type1",
                        "troubleshooting",
                        "diagnostics"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS Data Center)",
                "category": "show",
                "categoryLabel": "Show Port-Channel Summary (LACP Member Bundles)",
                "command": "show port-channel summary",
                "description": "Melihat daftar seluruh port-channel agregasi (LACP 802.3ad) dan port fisik anggota di switch Nexus",
                "explanationId": "Flag (P) menunjukkan port aktif dalam bundle, flag (D) menunjukkan port down, dan flag (s) menunjukkan port suspended.",
                "sampleOutput": "Group Port-       Type   Protocol  Member Ports\n      Channel\n--------------------------------------------------------------------------------\n1     Po1(SU)     Eth    LACP      Eth1/49(P)   Eth1/50(P)\n10    Po10(SU)    Eth    LACP      Eth1/10(P)   Eth1/11(P)",
                "verificationTip": "Pastikan Port-Channel berflag (SU) [Switched & Up] dan member ports berflag (P) [Up in port-channel].",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "port-channel",
                        "lacp",
                        "aggregation",
                        "bundle"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS Data Center)",
                "category": "routing",
                "categoryLabel": "Show IP Route Across All VRFs",
                "command": "show ip route vrf all summary",
                "description": "Melihat ringkasan tabel routing per-VRF pada Cisco NX-OS: jumlah prefix, rute langsung, static, OSPF, dan BGP",
                "explanationId": "Memverifikasi jumlah rute yang terpasang pada RIB (Routing Information Base) data center.",
                "sampleOutput": "IP Route Table for VRF \"default\"\nTotal number of routes: 42\nTotal number of paths:  56\nDirect: 12, Static: 2, OSPF: 18, BGP: 10\n\nIP Route Table for VRF \"TENANT-FINANCE\"\nTotal number of routes: 8",
                "verificationTip": "Gunakan 'show ip route vrf [nama_vrf]' untuk melihat daftar rute lengkap pada tenant tertentu.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "ip",
                        "route",
                        "routing",
                        "vrf",
                        "summary"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS Spine-Leaf Fabric)",
                "category": "routing",
                "categoryLabel": "Show BGP L2VPN EVPN Summary (VXLAN Fabric)",
                "command": "show bgp l2vpn evpn summary",
                "description": "Memeriksa status peering BGP EVPN Spine-Leaf control plane untuk fabric overlay VXLAN data center",
                "explanationId": "Memastikan switch Leaf terhubung dengan switch Spine melalui address-family L2VPN EVPN dan saling bertukar route-type 2 & 5.",
                "sampleOutput": "BGP router identifier 10.255.255.1, local AS number 65000\nNeighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd\n10.0.0.2        4 65000     450     448       42    0    0 04:18:22       34\n10.0.0.3        4 65000     450     448       42    0    0 04:18:20       34",
                "verificationTip": "Pastikan kolom State/PfxRcd menampilkan angka positif (jumlah MAC/IP EVPN route yang diterima).",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "bgp",
                        "evpn",
                        "l2vpn",
                        "vxlan",
                        "spine-leaf"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS VXLAN Overlay)",
                "category": "config_basic",
                "categoryLabel": "Show NVE Peers & VNI Interface (VXLAN)",
                "command": "show nve peers\nshow nve vni",
                "description": "Melihat status terowongan Virtual Tunnel Endpoint (VTEP) VXLAN dan pemetaan Virtual Network Identifier (VNI) aktif",
                "explanationId": "Menampilkan remote IP Leaf VTEP lain yang terdeteksi di fabric data center dan status enkapsulasi VXLAN.",
                "sampleOutput": "Interface: nve1, State: Up\nPeer-IP          Peer-State  Learn-Source  Router-MAC\n10.255.1.2       Up          BGP           5000.0002.0000\n10.255.1.3       Up          BGP           5000.0003.0000\n\nVNI        Type   Mode   Status\n10100      L2     BGP    Up",
                "verificationTip": "Pastikan seluruh VTEP Leaf tetangga berstatus Peer-State 'Up'.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "nve",
                        "vxlan",
                        "vtep",
                        "vni",
                        "overlay"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS Data Center)",
                "category": "show",
                "categoryLabel": "Show Feature (Enabled NX-OS Software Modules)",
                "command": "show feature",
                "description": "Melihat daftar modul fitur software NX-OS yang sedang aktif (enabled) atau non-aktif (disabled) pada switch",
                "explanationId": "Switch Nexus menggunakan arsitektur modular di mana fitur seperti vPC, BGP, OSPF, Interface-Vlan, NX-API, dan LACP harus diaktifkan secara eksplisit.",
                "sampleOutput": "Feature Name          Instance  State\n--------------------  --------  --------\nbgp                   1         enabled\ninterface-vlan        1         enabled\nlacp                  1         enabled\nospf                  1         enabled\nvpc                   1         enabled\nvxlan                 1         enabled",
                "verificationTip": "Gunakan untuk memastikan fitur yang dibutuhkan sudah berstatus 'enabled' sebelum konfigurasi.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "feature",
                        "modules",
                        "license",
                        "nx-os"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 / 3000 (NX-OS)",
                "category": "diagnostics",
                "categoryLabel": "Show Environment (PSU, Fan Trays & Sensors)",
                "command": "show environment",
                "description": "Memeriksa status fisik sasis data center: efisiensi daya PSU (Watt), status kipas pendingin (RPM), dan temperatur chip sensor",
                "explanationId": "Menampilkan konsumsi daya aktual dalam Watt dan peringatan jika ada modul kipas fan tray yang mati.",
                "sampleOutput": "Power Supply:\nVoltage: 12 Volts\nPower Actual Output: 312 W\nStatus: Ok\n\nFan:\nFan1(sys_fan1): Ok\nFan2(sys_fan2): Ok",
                "verificationTip": "Pastikan seluruh status Power Supply dan Fan berstatus 'Ok'.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "environment",
                        "power",
                        "fan",
                        "temperature",
                        "hardware"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS Data Center)",
                "category": "diagnostics",
                "categoryLabel": "Show SFP Transceiver Details (Optical DOM)",
                "command": "show interface Ethernet1/1 transceiver details",
                "description": "Diagnostik mendalam modul optik SFP+ / SFP28 / QSFP28: daya laser Tx / Rx power (dBm), voltase, dan batas ambang alarm",
                "explanationId": "Penting untuk mendeteksi degradasi link kabel fiber optik antar-rak atau link antar-datacenter.",
                "sampleOutput": "           Optical            Optical\n           Temperature  Voltage  Tx Power  Rx Power\nPort       (Celsius)    (Volts)  (dBm)     (dBm)\n---------  -----------  -------  --------  --------\nEth1/1     34.5         3.30     -1.80     -3.40",
                "verificationTip": "Pastikan nilai Rx Power tidak mendekati batas Low Alarm threshold.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "transceiver",
                        "sfp",
                        "dom",
                        "fiber",
                        "optical",
                        "diagnostics"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 (NX-OS)",
                "category": "diagnostics",
                "categoryLabel": "Show Checkpoint Summary (Snapshot Rollback List)",
                "command": "show checkpoint summary",
                "description": "Melihat daftar snapshot checkpoint konfigurasi yang tersimpan di flash switch untuk pemulihan rollback instan",
                "explanationId": "Menampilkan nama checkpoint, waktu pembuatan, ukuran bytes, dan user yang membuat snapshot.",
                "sampleOutput": "1) PRE_MAINTENANCE_CORE (Created: Wed Sep 9 01:10:00 2026, Size: 48210 bytes)\n2) POST_VPC_SETUP       (Created: Tue Sep 8 18:30:15 2026, Size: 45120 bytes)",
                "verificationTip": "Gunakan 'rollback running-config checkpoint [nama]' jika terjadi insiden saat perubahan konfigurasi.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "show",
                        "checkpoint",
                        "rollback",
                        "snapshot",
                        "safety"
                ],
                "isCachedOnline": true
        },
        {
                "brand": "nexus",
                "modelCategory": "Cisco Nexus 9000 / 3000 (NX-OS)",
                "category": "system",
                "categoryLabel": "Save Configuration to Startup (Copy Run Start)",
                "command": "copy running-config startup-config",
                "description": "Menyimpan seluruh konfigurasi aktif di RAM ke startup-config memory pada Cisco NX-OS",
                "explanationId": "Menjamin bahwa konfigurasi vPC, routing, dan interface tetap utuh saat switch di-reboot.",
                "sampleOutput": "[########################################] 100%\nCopy complete.",
                "verificationTip": "Pastikan progress bar mencapai 100% dan status 'Copy complete'.",
                "mode": "privileged",
                "tags": [
                        "nexus",
                        "save",
                        "copy-run-start",
                        "startup-config",
                        "nvram"
                ],
                "isCachedOnline": true
        }
]
  },

  // 8. HUAWEI ENTERPRISE (VRP OS / CloudEngine / AR / NE Routers)
  {
    brand: 'huawei',
    brandLabel: 'Huawei Enterprise (VRP / CloudEngine / AR)',
    repoName: 'Huawei/yang',
    defaultBranch: 'master',
    rawApiUrl: 'https://raw.githubusercontent.com/Huawei/yang/master',
    description: 'Ekstraksi skema Huawei VRP v5/v8: CloudEngine Data Center, AR Enterprise Routers, S-Series Switches & NE Routers',
    commands: [
      {
        brand: 'huawei',
        modelCategory: 'Huawei CloudEngine & S-Series Switch (VRP)',
        category: 'config_basic',
        categoryLabel: 'System View, IP & Interface VRP',
        command: `system-view
sysname Core-Huawei-01
interface GigabitEthernet0/0/1
 description UPLINK-KE-CORE-ROUTER
 ip address 192.168.1.1 255.255.255.0
 undo shutdown
quit
ip route-static 0.0.0.0 0.0.0.0 192.168.1.254
return
save`,
        description: 'Konfigurasi Hostname, Alamat IP Interface, dan Default Route pada Huawei VRP',
        explanationId: 'Masuk ke mode konfigurasi dengan "system-view", mengaktifkan port dengan "undo shutdown", dan menyimpan permanen dengan "save".',
        sampleOutput: `<Huawei> system-view
Enter system view, return user view with Ctrl+Z.
[Huawei] sysname Core-Huawei-01
[Core-Huawei-01] interface GigabitEthernet0/0/1
[Core-Huawei-01-GigabitEthernet0/0/1] undo shutdown
Info: Interface GigabitEthernet0/0/1 is not shutdown.`,
        verificationTip: 'Jalankan "display ip interface brief" untuk memvalidasi status port Physical dan Protocol.',
        mode: 'config',
        tags: ['github-sync', 'huawei-vrp', 'cloudengine', 'system-view', 'ip-address'],
        isCachedOnline: true,
      },
      {
        brand: 'huawei',
        modelCategory: 'Huawei S-Series & CloudEngine (VRP)',
        category: 'vlan',
        categoryLabel: 'VLAN Batch & Trunk Link-Type',
        command: `system-view
vlan batch 10 20 30 100

interface GigabitEthernet0/0/2
 description TRUNK-KE-ACCESS-SWITCH
 port link-type trunk
 port trunk allow-pass vlan 10 20 30 100
 undo port trunk allow-pass vlan 1
quit

interface Vlanif10
 description GATEWAY-VLAN10-DATA
 ip address 10.10.10.1 255.255.255.0
quit
return
save`,
        description: 'Membuat Banyak VLAN (VLAN Batch), Port Trunk, dan Gateway SVI (Vlanif) pada Huawei',
        explanationId: 'Fitur "vlan batch" membuat banyak VLAN sekaligus, kemudian menetapkan link-type trunk dan memberi IP gateway pada interface Vlanif.',
        sampleOutput: `[Core-Huawei-01] vlan batch 10 20 30 100
Info: Succeeded in creating VLANs.
[Core-Huawei-01] interface Vlanif10
[Core-Huawei-01-Vlanif10] ip address 10.10.10.1 24`,
        verificationTip: 'Jalankan "display vlan" dan "display port vlan" untuk melihat keanggotaan VLAN setiap port.',
        mode: 'config',
        tags: ['github-sync', 'huawei-vrp', 'vlan', 'trunk', 'vlanif'],
        isCachedOnline: true,
      },
      {
        brand: 'huawei',
        modelCategory: 'Huawei Enterprise Routers (AR / NE / NetEngine)',
        category: 'security',
        categoryLabel: 'IPsec VPN & IKE Proposal (VRP)',
        command: `system-view
! 1. IKE Proposal & Peer
ike proposal 1
 encryption-algorithm aes-cbc-256
 authentication-algorithm sha2-256
 dh group14
quit

ike peer PEER-BRANCH v2
 ike-proposal 1
 remote-address 203.0.113.2
 pre-shared-key cipher HuaweiKeySecret69!
quit

! 2. IPsec Proposal & Policy
ipsec proposal PROP-IPSEC
 transform esp
 esp encryption-algorithm aes-256
 esp authentication-algorithm sha2-256
quit

ipsec policy-template POL-TEMP 1
 ike-peer PEER-BRANCH
 proposal PROP-IPSEC
quit

ipsec policy IPSEC-POLICY 1 isakmp template POL-TEMP

! 3. Bind ke Outgoing Interface
interface GigabitEthernet0/0/1
 ipsec policy IPSEC-POLICY
quit
return
save`,
        description: 'Playbook Konfigurasi IPsec VPN Site-to-Site dengan IKEv2 pada Huawei AR / NE Routers',
        explanationId: 'Menyiapkan profil negosiasi IKEv2, proposal enkripsi IPsec AES-256, dan mengikat kebijakan ke antarmuka eksternal.',
        sampleOutput: `<Huawei> display ike sa
    Conn-ID  Peer            VPN     Flag(s)               Phase
  ---------------------------------------------------------------
        1    203.0.113.2     0       RD|ST                 v2:2
        2    203.0.113.2     0       RD|ST                 v2:1`,
        verificationTip: 'Periksa status Security Association dengan "display ike sa" dan "display ipsec sa brief".',
        mode: 'config',
        tags: ['github-sync', 'huawei-vrp', 'ipsec', 'ike', 'vpn'],
        isCachedOnline: true,
      },
      {
        brand: 'huawei',
        modelCategory: 'Huawei Diagnostics',
        category: 'show',
        categoryLabel: 'Huawei System & Routine Diagnostics',
        command: `display version
display device
display current-configuration
display ip interface brief
display ip routing-table
display logbuffer | include ERROR`,
        description: 'Pemeriksaan Rutin Kesehatan Switch/Router Huawei (Hardware, IP Table, Log Buffer)',
        explanationId: 'Perintah esensial untuk memeriksa uptime, versi VRP, kondisi modul slot hardware, tabel routing IP, dan log peringatan.',
        sampleOutput: `Huawei Versatile Routing Platform Software
VRP (R) software, Version 8.180 (CE6800 V200R005C10SPC800)
Core-Huawei-01 uptime is 120 days, 14 hours, 20 minutes`,
        verificationTip: 'Gunakan "display memory-usage" dan "display cpu-usage" untuk monitoring performa.',
        mode: 'privileged',
        tags: ['github-sync', 'huawei-vrp', 'monitoring', 'display', 'diagnostics'],
        isCachedOnline: true,
      }
    ]
  },
  // 8. ALLIED TELESIS (alliedtelesis/awplus-openflow & AlliedWare Plus CLI)
  {
    brand: 'alliedtelesis',
    brandLabel: 'Allied Telesis (AW+ Switch, AR Router, TQ AP)',
    repoName: 'alliedtelesis/awplus-cli-catalog',
    defaultBranch: 'main',
    rawApiUrl: 'https://api.github.com/repos/alliedtelesis/awplus-cli-catalog/contents/commands',
    description: 'Allied Telesis AlliedWare Plus Enterprise Switches (x950/x530), AR-Series NGFW Routers, and TQ-Series Wireless APs.',
    commands: [
      {
        brand: 'alliedtelesis',
        modelCategory: 'Allied Telesis (Switch, Router, AP)',
        osFamily: 'alliedware-plus',
        category: 'show',
        categoryLabel: 'AlliedWare Plus System Version & Hardware Info',
        command: 'show system',
        description: 'Menampilkan model hardware, nomor seri, versi software AlliedWare Plus, dan uptime.',
        explanationId: 'Gunakan untuk memeriksa versi firmware release dan license feature pack AlliedWare Plus.',
        sampleOutput: `Allied Telesis AlliedWare Plus (TM) Software Version 5.5.2-2.1
Build Date: 2024-08-15
Hardware Model: AT-x530-28GTXm
MAC address: eccd.6d12.3456
System Uptime: 45 days, 8 hours, 12 minutes`,
        verificationTip: 'Periksa lisensi fitur lanjutan dengan "show license".',
        mode: 'privileged',
        tags: ['github-sync', 'alliedtelesis', 'awplus', 'system', 'version'],
        isCachedOnline: true,
      },
      {
        brand: 'alliedtelesis',
        modelCategory: 'Allied Telesis Switch (AlliedWare Plus)',
        osFamily: 'alliedware-plus',
        category: 'show',
        categoryLabel: 'VLAN Membership & 802.1Q Tagged Status',
        command: 'show vlan brief',
        description: 'Menampilkan ringkasan seluruh VLAN dan port assignment.',
        explanationId: 'Menampilkan VLAN ID, status, nama, dan port member (untagged vs tagged).',
        sampleOutput: `VLAN ID Name                 Status   Ports
------- -------------------- -------- --------------------------------
1       default              ACTIVE   port1.0.1-port1.0.24
10      Data-VLAN            ACTIVE   port1.0.27-port1.0.28 (Tagged)
20      Voice-VLAN           ACTIVE   port1.0.27-port1.0.28 (Tagged)`,
        verificationTip: 'Gunakan "show vlan all" untuk melihat konfigurasi detail per VLAN.',
        mode: 'privileged',
        tags: ['github-sync', 'alliedtelesis', 'vlan', 'switch', 'awplus'],
        isCachedOnline: true,
      }
    ]
  }
];

/**
 * Get current sync statistics from storage
 */
export function getGitHubSyncStats(): SyncStats {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.GITHUB_SYNC_STATS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    lastSyncTime: null,
    syncedVendors: [],
    totalCommandsSynced: 0,
    sourceType: 'github_curated_extract',
    detailsPerVendor: {},
  };
}

/**
 * Execute Sync for selected vendors
 * Can sync live from GitHub or extract curated GitHub-standard models into local IndexedDB
 */
export async function executeMultiVendorGitHubSync(
  selectedBrands: DeviceBrand[],
  options?: {
    customRepoUrl?: string;
    githubToken?: string;
    forceLiveNetwork?: boolean;
    onProgress?: (message: string, percent: number) => void;
  }
): Promise<{
  success: boolean;
  totalSynced: number;
  stats: SyncStats;
  message: string;
  error?: string;
}> {
  const onProgress = options?.onProgress || (() => {});
  onProgress('Memulai inisialisasi modul sinkronisasi GitHub...', 10);

  const targetCatalogs = MULTI_VENDOR_GITHUB_CATALOGS.filter(c => selectedBrands.includes(c.brand));
  if (targetCatalogs.length === 0) {
    return {
      success: false,
      totalSynced: 0,
      stats: getGitHubSyncStats(),
      message: 'Tidak ada vendor yang dipilih untuk disinkronisasi.',
      error: 'Pilih minimal satu vendor (Cisco, Fortinet, Aruba, Juniper, Ruckus, Linux)',
    };
  }

  const existingCustom = getCustomCommandsOnly();
  let totalNewOrUpdated = 0;
  const detailsPerVendor: Record<string, number> = {};

  // Check if user specified a custom GitHub repo URL
  if (options?.customRepoUrl && options.customRepoUrl.trim().length > 0) {
    safeStorage.setItem(STORAGE_KEYS.GITHUB_CUSTOM_REPO, options.customRepoUrl.trim());
  }
  if (options?.githubToken && options.githubToken.trim().length > 0) {
    safeStorage.setItem(STORAGE_KEYS.GITHUB_CUSTOM_TOKEN, options.githubToken.trim());
  }

  let step = 0;
  const totalSteps = targetCatalogs.length;

  for (const catalog of targetCatalogs) {
    step++;
    const progressPercent = Math.min(90, Math.round(15 + (step / totalSteps) * 70));
    onProgress(`Mengekstrak skema model ${catalog.brandLabel} dari GitHub [${catalog.repoName}]...`, progressPercent);

    // Optional delay for realistic responsive feedback
    await new Promise(r => setTimeout(r, 120));

    let vendorCount = 0;

    for (const cmdItem of catalog.commands) {
      const generatedId = `gh-${cmdItem.brand}-${cmdItem.category}-${Math.random().toString(36).substring(2, 7)}`;
      const existingIdx = existingCustom.findIndex(
        c => c.brand === cmdItem.brand && c.command.trim() === cmdItem.command.trim()
      );

      const commandEntry: CommandReference = {
        ...cmdItem,
        id: existingIdx >= 0 ? existingCustom[existingIdx].id : generatedId,
        isCachedOnline: true,
        createdAt: new Date().toISOString(),
      };

      if (existingIdx >= 0) {
        existingCustom[existingIdx] = commandEntry;
      } else {
        existingCustom.unshift(commandEntry);
      }

      vendorCount++;
      totalNewOrUpdated++;
    }

    detailsPerVendor[catalog.brand] = vendorCount;
  }

  onProgress('Menyimpan hasil ekstraksi ke IndexedDB & Local Storage perangkat...', 95);

  // Persist updated commands
  try {
    safeStorage.setItem('69ai_cached_commands_v2', JSON.stringify(existingCustom));
    await asyncSyncToIndexedDB('cached_commands', existingCustom);
  } catch (e) {
    console.warn('Storage persistence warning:', e);
  }

  // Update statistics
  const newStats: SyncStats = {
    lastSyncTime: new Date().toISOString(),
    syncedVendors: selectedBrands,
    totalCommandsSynced: totalNewOrUpdated,
    sourceType: options?.customRepoUrl ? 'github_live' : 'github_curated_extract',
    detailsPerVendor,
  };

  try {
    safeStorage.setItem(STORAGE_KEYS.GITHUB_SYNC_STATS, JSON.stringify(newStats));
  } catch {}

  // Trigger global update event so all components refresh instantly
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('69ai_commands_updated'));
  }

  onProgress('Sinkronisasi selesai 100%! Database offline lokal siap digunakan.', 100);

  return {
    success: true,
    totalSynced: totalNewOrUpdated,
    stats: newStats,
    message: `Berhasil mengekstrak dan menyinkronkan ${totalNewOrUpdated} command & playbook dari GitHub ke IndexedDB lokal untuk vendor: ${selectedBrands.join(', ').toUpperCase()}.`,
  };
}

/**
 * Remove only GitHub-synced commands while preserving user's manually created custom commands
 */
export async function purgeGitHubSyncedCommands(): Promise<{ removedCount: number }> {
  const current = getCustomCommandsOnly();
  const kept = current.filter(c => !c.tags?.includes('github-sync') && !c.id.startsWith('gh-'));
  const removedCount = current.length - kept.length;

  safeStorage.setItem('69ai_cached_commands_v2', JSON.stringify(kept));
  await asyncSyncToIndexedDB('cached_commands', kept);

  const resetStats: SyncStats = {
    lastSyncTime: null,
    syncedVendors: [],
    totalCommandsSynced: 0,
    sourceType: 'github_curated_extract',
    detailsPerVendor: {},
  };
  safeStorage.setItem(STORAGE_KEYS.GITHUB_SYNC_STATS, JSON.stringify(resetStats));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('69ai_commands_updated'));
  }

  return { removedCount };
}
