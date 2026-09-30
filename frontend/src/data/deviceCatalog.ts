import { DeviceBrand, DeviceModelOption } from '../types';

export interface BrandInfo {
  id: DeviceBrand;
  name: string;
  badgeColor: string;
  defaultPrompt: string;
  models: DeviceModelOption[];
}

export interface StandardDeviceOption {
  id: string;
  name: string;
  brand: DeviceBrand;
  brandLabel: string;
  osType: string;
  defaultBaud: number;
  samplePrompt: string;
  badgeColor: string;
}

/**
 * Standardized Device Catalog categorized by Brand and OS Type
 */
export const STANDARD_DEVICE_OPTIONS: StandardDeviceOption[] = [
  // 1. Juniper Networks
  {
    id: 'juniper-junos',
    name: 'Juniper - Junos',
    brand: 'juniper',
    brandLabel: 'Juniper',
    osType: 'Junos OS',
    defaultBaud: 9600,
    samplePrompt: 'user@juniper>',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },

  // 2. Cisco Systems
  {
    id: 'cisco-ios',
    name: 'Cisco - IOS',
    brand: 'cisco',
    brandLabel: 'Cisco',
    osType: 'Cisco IOS Classic',
    defaultBaud: 9600,
    samplePrompt: 'Router#',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'cisco-ios-xe',
    name: 'Cisco - IOS - XE',
    brand: 'cisco',
    brandLabel: 'Cisco',
    osType: 'Cisco IOS-XE',
    defaultBaud: 9600,
    samplePrompt: 'Catalyst#',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'cisco-ios-xr',
    name: 'Cisco - IOS - XR',
    brand: 'cisco',
    brandLabel: 'Cisco',
    osType: 'Cisco IOS-XR',
    defaultBaud: 115200,
    samplePrompt: 'RP/0/RP0/CPU0:Router#',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  {
    id: 'cisco-nexus-os',
    name: 'Cisco - Nexus OS',
    brand: 'cisco',
    brandLabel: 'Cisco',
    osType: 'Cisco NX-OS',
    defaultBaud: 9600,
    samplePrompt: 'N9K-Switch#',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },

  // 3. Arista Networks
  {
    id: 'arista-eos',
    name: 'Arista - EOS',
    brand: 'arista',
    brandLabel: 'Arista',
    osType: 'Arista EOS',
    defaultBaud: 9600,
    samplePrompt: 'Arista#',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },

  // 4. Palo Alto Networks
  {
    id: 'paloalto-pan-os',
    name: 'Palo Alto - PAN OS',
    brand: 'paloalto',
    brandLabel: 'Palo Alto',
    osType: 'PAN-OS Firewall',
    defaultBaud: 9600,
    samplePrompt: 'admin@PA-NGFW> ',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },

  // 5. Ubiquiti Networks
  {
    id: 'ubiquiti-unifi',
    name: 'Ubiquiti - UniFi OS',
    brand: 'ubiquiti',
    brandLabel: 'Ubiquiti',
    osType: 'UniFi OS',
    defaultBaud: 115200,
    samplePrompt: 'ubnt@unifi:~# ',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  {
    id: 'ubiquiti-edgeos',
    name: 'Ubiquiti - EdgeOS',
    brand: 'ubiquiti',
    brandLabel: 'Ubiquiti',
    osType: 'EdgeOS (EdgeRouter / EdgeSwitch)',
    defaultBaud: 115200,
    samplePrompt: 'ubnt@EdgeRouter:~$ ',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },

  // 6. Linux / Unix Server
  {
    id: 'linux-unix-server',
    name: 'Linux / unix Server',
    brand: 'linux',
    brandLabel: 'Linux / Unix',
    osType: 'Linux / Unix Server (Ubuntu, Debian, RHEL, BSD)',
    defaultBaud: 115200,
    samplePrompt: 'root@server:~# ',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },

  // 7. Fortinet Security
  {
    id: 'fortinet-fortigate',
    name: 'Fortinet - Fortigate',
    brand: 'fortinet',
    brandLabel: 'Fortinet',
    osType: 'FortiOS (FortiGate NGFW)',
    defaultBaud: 9600,
    samplePrompt: 'FortiGate # ',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  {
    id: 'fortinet-fortimanager',
    name: 'Fortinet - Fortimanager',
    brand: 'fortinet',
    brandLabel: 'Fortinet',
    osType: 'FortiManager OS',
    defaultBaud: 9600,
    samplePrompt: 'FortiManager # ',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
  },
  {
    id: 'fortinet-fortianalyzer',
    name: 'Fortinet - FortiAnalzer',
    brand: 'fortinet',
    brandLabel: 'Fortinet',
    osType: 'FortiAnalyzer OS',
    defaultBaud: 9600,
    samplePrompt: 'FortiAnalyzer # ',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
  },

  // 8. MikroTik
  {
    id: 'mikrotik-routeros-v7',
    name: 'MikroTik - RouterOS v7',
    brand: 'mikrotik',
    brandLabel: 'MikroTik',
    osType: 'RouterOS v7',
    defaultBaud: 115200,
    samplePrompt: '[admin@MikroTik] > ',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  },
  {
    id: 'mikrotik-routeros-v6',
    name: 'MikroTik - RouterOS v6',
    brand: 'mikrotik',
    brandLabel: 'MikroTik',
    osType: 'RouterOS v6',
    defaultBaud: 115200,
    samplePrompt: '[admin@MikroTik] > ',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  },
  {
    id: 'mikrotik-swos',
    name: 'MikroTik - SwOS',
    brand: 'mikrotik',
    brandLabel: 'MikroTik',
    osType: 'SwOS (Cloud Router Switch)',
    defaultBaud: 115200,
    samplePrompt: '[admin@SwOS] > ',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  },

  // 9. Huawei
  {
    id: 'huawei-vrp',
    name: 'Huawei - VRP',
    brand: 'huawei',
    brandLabel: 'Huawei',
    osType: 'Huawei VRP (CloudEngine / AR / NE Series)',
    defaultBaud: 9600,
    samplePrompt: '<Huawei>',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },

  // 10. Aruba / HPE
  {
    id: 'aruba-aoscx',
    name: 'Aruba - AOS-CX',
    brand: 'aruba',
    brandLabel: 'Aruba / HPE',
    osType: 'ArubaOS-CX (CX 6000 / 8000 / 10000)',
    defaultBaud: 115200,
    samplePrompt: 'Aruba-CX# ',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },
  {
    id: 'aruba-aoss',
    name: 'Aruba - AOS-S',
    brand: 'aruba',
    brandLabel: 'Aruba / HPE',
    osType: 'ArubaOS-Switch / Provision (2930 / 3810 / 5400)',
    defaultBaud: 9600,
    samplePrompt: 'HP-Switch# ',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  },
  {
    id: 'hpe-comware',
    name: 'HPE - Comware 7',
    brand: 'hpe',
    brandLabel: 'HPE',
    osType: 'HPE Comware 7 (FlexFabric 5900 / 5700)',
    defaultBaud: 9600,
    samplePrompt: '<HPE>',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },

  // 11. Ruckus
  {
    id: 'ruckus-fastiron',
    name: 'Ruckus - FastIron',
    brand: 'ruckus',
    brandLabel: 'Ruckus',
    osType: 'FastIron OS (ICX 7150 / 7450 / 7850)',
    defaultBaud: 9600,
    samplePrompt: 'ICX# ',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },

  // 12. Dell Technologies
  {
    id: 'dell-os10',
    name: 'Dell - SmartFabric OS10',
    brand: 'dell',
    brandLabel: 'Dell',
    osType: 'Dell OS10 (PowerSwitch S/Z-Series)',
    defaultBaud: 115200,
    samplePrompt: 'OS10# ',
    badgeColor: 'bg-blue-600/10 text-blue-400 border-blue-600/30',
  },

  // 13. Allied Telesis (Switch, Router, AP)
  {
    id: 'alliedtelesis-awplus-switch',
    name: 'Allied Telesis - Switch (AlliedWare Plus)',
    brand: 'alliedtelesis',
    brandLabel: 'Allied Telesis',
    osType: 'AlliedWare Plus / AW+ (x950 / x930 / x530 / x510 / x230 / GS980MX / SBx8100 / SBx908)',
    defaultBaud: 9600,
    samplePrompt: 'awplus# ',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  {
    id: 'alliedtelesis-ar-router',
    name: 'Allied Telesis - Router & UTM Firewall (AR Series)',
    brand: 'alliedtelesis',
    brandLabel: 'Allied Telesis',
    osType: 'AlliedWare Plus NGFW / VPN Router (AR4050S / AR3050S / AR2050V / AR1050V)',
    defaultBaud: 9600,
    samplePrompt: 'awplus-router# ',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },
  {
    id: 'alliedtelesis-tq-ap',
    name: 'Allied Telesis - Wireless AP (TQ / TQm Series & AWC)',
    brand: 'alliedtelesis',
    brandLabel: 'Allied Telesis',
    osType: 'Allied Telesis Wireless AP OS (TQ6702e / TQ6602 / TQ5403 / TQm5403 / TQ1402 / TQ4600)',
    defaultBaud: 115200,
    samplePrompt: 'TQ-AP# ',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  },

  // 14. OpenWrt / VyOS / pfSense
  {
    id: 'openwrt',
    name: 'OpenWrt',
    brand: 'openwrt',
    brandLabel: 'OpenWrt',
    osType: 'OpenWrt Linux',
    defaultBaud: 115200,
    samplePrompt: 'root@OpenWrt:~# ',
    badgeColor: 'bg-cyan-600/10 text-cyan-400 border-cyan-600/30',
  },
  {
    id: 'pfsense',
    name: 'pfSense / OPNsense',
    brand: 'generic',
    brandLabel: 'pfSense / OPNsense',
    osType: 'FreeBSD Firewall CLI',
    defaultBaud: 115200,
    samplePrompt: 'root@pfsense:~ # ',
    badgeColor: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/30',
  },

  // 14. Generic Console
  {
    id: 'generic-console',
    name: 'Generic / Custom CLI',
    brand: 'generic',
    brandLabel: 'Generic',
    osType: 'Universal Serial / SSH CLI',
    defaultBaud: 9600,
    samplePrompt: 'console# ',
    badgeColor: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  },
];

export const BRAND_CATALOG: Record<string, BrandInfo> = {
  juniper: {
    id: 'juniper',
    name: 'Juniper',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    defaultPrompt: 'user@juniper>',
    models: [
      {
        id: 'juniper-junos',
        name: 'Juniper - Junos',
        category: 'Juniper Networks',
        osType: 'Junos OS (EX, MX, SRX, QFX)',
        defaultBaud: 9600,
        samplePrompt: 'user@juniper>',
      },
    ],
  },
  cisco: {
    id: 'cisco',
    name: 'Cisco',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    defaultPrompt: 'Router#',
    models: [
      {
        id: 'cisco-ios',
        name: 'Cisco - IOS',
        category: 'Cisco Systems',
        osType: 'Cisco IOS Classic (Catalyst 2960, 3750, ISR)',
        defaultBaud: 9600,
        samplePrompt: 'Router#',
      },
      {
        id: 'cisco-ios-xe',
        name: 'Cisco - IOS - XE',
        category: 'Cisco Systems',
        osType: 'Cisco IOS-XE (Catalyst 9000, Cat 8000, ISR 4000)',
        defaultBaud: 9600,
        samplePrompt: 'Catalyst#',
      },
      {
        id: 'cisco-ios-xr',
        name: 'Cisco - IOS - XR',
        category: 'Cisco Systems',
        osType: 'Cisco IOS-XR (ASR 9000, NCS 5500, 8000)',
        defaultBaud: 115200,
        samplePrompt: 'RP/0/RP0/CPU0:Router#',
      },
      {
        id: 'cisco-nexus-os',
        name: 'Cisco - Nexus OS',
        category: 'Cisco Systems',
        osType: 'Cisco NX-OS (Nexus 9000, 7000, 5000, 3000)',
        defaultBaud: 9600,
        samplePrompt: 'N9K-Switch#',
      },
    ],
  },
  arista: {
    id: 'arista',
    name: 'Arista',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    defaultPrompt: 'Arista#',
    models: [
      {
        id: 'arista-eos',
        name: 'Arista - EOS',
        category: 'Arista Networks',
        osType: 'Arista EOS (Extensible Operating System)',
        defaultBaud: 9600,
        samplePrompt: 'Arista#',
      },
    ],
  },
  paloalto: {
    id: 'paloalto',
    name: 'Palo Alto',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    defaultPrompt: 'admin@PA-NGFW> ',
    models: [
      {
        id: 'paloalto-pan-os',
        name: 'Palo Alto - PAN OS',
        category: 'Palo Alto Networks',
        osType: 'PAN-OS NGFW (PA-400, PA-1400, PA-3400, PA-5400, VM-Series)',
        defaultBaud: 9600,
        samplePrompt: 'admin@PA-NGFW> ',
      },
    ],
  },
  ubiquiti: {
    id: 'ubiquiti',
    name: 'Ubiquiti',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    defaultPrompt: 'ubnt@unifi:~# ',
    models: [
      {
        id: 'ubiquiti-unifi',
        name: 'Ubiquiti - UniFi OS',
        category: 'Ubiquiti Networks',
        osType: 'UniFi OS (UDM-Pro, Cloud Gateway, UAP)',
        defaultBaud: 115200,
        samplePrompt: 'ubnt@unifi:~# ',
      },
      {
        id: 'ubiquiti-edgeos',
        name: 'Ubiquiti - EdgeOS',
        category: 'Ubiquiti Networks',
        osType: 'EdgeOS (EdgeRouter, EdgeSwitch)',
        defaultBaud: 115200,
        samplePrompt: 'ubnt@EdgeRouter:~$ ',
      },
    ],
  },
  linux: {
    id: 'linux',
    name: 'Linux / unix Server',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    defaultPrompt: 'root@server:~# ',
    models: [
      {
        id: 'linux-unix-server',
        name: 'Linux / unix Server',
        category: 'Linux / Unix',
        osType: 'Linux / Unix Server (Ubuntu, Debian, RHEL, CentOS, FreeBSD)',
        defaultBaud: 115200,
        samplePrompt: 'root@server:~# ',
      },
    ],
  },
  fortinet: {
    id: 'fortinet',
    name: 'Fortinet',
    badgeColor: 'bg-red-500/10 text-red-400 border-red-500/30',
    defaultPrompt: 'FortiGate # ',
    models: [
      {
        id: 'fortinet-fortigate',
        name: 'Fortinet - Fortigate',
        category: 'Fortinet Security',
        osType: 'FortiOS (FortiGate NGFW 40F-1000F, VM)',
        defaultBaud: 9600,
        samplePrompt: 'FortiGate # ',
      },
      {
        id: 'fortinet-fortimanager',
        name: 'Fortinet - Fortimanager',
        category: 'Fortinet Management',
        osType: 'FortiManager OS (FMG)',
        defaultBaud: 9600,
        samplePrompt: 'FortiManager # ',
      },
      {
        id: 'fortinet-fortianalyzer',
        name: 'Fortinet - FortiAnalzer',
        category: 'Fortinet Analytics',
        osType: 'FortiAnalyzer OS (FAZ)',
        defaultBaud: 9600,
        samplePrompt: 'FortiAnalyzer # ',
      },
    ],
  },
  mikrotik: {
    id: 'mikrotik',
    name: 'MikroTik',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    defaultPrompt: '[admin@MikroTik] > ',
    models: [
      {
        id: 'mikrotik-routeros-v7',
        name: 'MikroTik - RouterOS v7',
        category: 'MikroTik RouterBOARD',
        osType: 'RouterOS v7 (CCR, RB, Cloud Hosted Router)',
        defaultBaud: 115200,
        samplePrompt: '[admin@MikroTik] > ',
      },
      {
        id: 'mikrotik-routeros-v6',
        name: 'MikroTik - RouterOS v6',
        category: 'MikroTik RouterBOARD',
        osType: 'RouterOS v6 Legacy',
        defaultBaud: 115200,
        samplePrompt: '[admin@MikroTik] > ',
      },
      {
        id: 'mikrotik-swos',
        name: 'MikroTik - SwOS',
        category: 'MikroTik Switches',
        osType: 'SwOS (CRS / CSS Series)',
        defaultBaud: 115200,
        samplePrompt: '[admin@SwOS] > ',
      },
    ],
  },
  huawei: {
    id: 'huawei',
    name: 'Huawei',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    defaultPrompt: '<Huawei>',
    models: [
      {
        id: 'huawei-vrp',
        name: 'Huawei - VRP',
        category: 'Huawei Enterprise',
        osType: 'VRP (CloudEngine, NetEngine, AR Series)',
        defaultBaud: 9600,
        samplePrompt: '<Huawei>',
      },
    ],
  },
  aruba: {
    id: 'aruba',
    name: 'Aruba / HPE',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    defaultPrompt: 'Aruba-CX# ',
    models: [
      {
        id: 'aruba-aoscx',
        name: 'Aruba - AOS-CX',
        category: 'Aruba Networks',
        osType: 'ArubaOS-CX (CX 6000 / 6300 / 8320 / 10000)',
        defaultBaud: 115200,
        samplePrompt: 'Aruba-CX# ',
      },
      {
        id: 'aruba-aoss',
        name: 'Aruba - AOS-S',
        category: 'Aruba Networks',
        osType: 'ArubaOS-Switch / Provision (2930F / 3810M / 5400R)',
        defaultBaud: 9600,
        samplePrompt: 'HP-Switch# ',
      },
    ],
  },
  hpe: {
    id: 'hpe',
    name: 'HPE',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    defaultPrompt: '<HPE>',
    models: [
      {
        id: 'hpe-comware',
        name: 'HPE - Comware 7',
        category: 'Hewlett Packard Enterprise',
        osType: 'Comware 7 (FlexFabric 5900 / 5700)',
        defaultBaud: 9600,
        samplePrompt: '<HPE>',
      },
    ],
  },
  ruckus: {
    id: 'ruckus',
    name: 'Ruckus',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    defaultPrompt: 'ICX# ',
    models: [
      {
        id: 'ruckus-fastiron',
        name: 'Ruckus - FastIron',
        category: 'Ruckus / CommScope',
        osType: 'FastIron OS (ICX 7150 / 7450 / 7850)',
        defaultBaud: 9600,
        samplePrompt: 'ICX# ',
      },
    ],
  },
  dell: {
    id: 'dell',
    name: 'Dell',
    badgeColor: 'bg-blue-600/10 text-blue-400 border-blue-600/30',
    defaultPrompt: 'OS10# ',
    models: [
      {
        id: 'dell-os10',
        name: 'Dell - SmartFabric OS10',
        category: 'Dell Technologies',
        osType: 'Dell OS10 (PowerSwitch S/Z-Series)',
        defaultBaud: 115200,
        samplePrompt: 'OS10# ',
      },
    ],
  },
  alliedtelesis: {
    id: 'alliedtelesis',
    name: 'Allied Telesis',
    badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    defaultPrompt: 'awplus# ',
    models: [
      {
        id: 'alliedtelesis-switch-awplus',
        name: 'Allied Telesis - Switch (AlliedWare Plus / AW+)',
        category: 'Allied Telesis Enterprise Switch',
        osType: 'AlliedWare Plus (x950 / x930 / x530 / x510 / x230 / GS980MX / SBx8100 / SBx908)',
        defaultBaud: 9600,
        samplePrompt: 'awplus# ',
      },
      {
        id: 'alliedtelesis-switch-centrecom',
        name: 'Allied Telesis - Switch (CentreCOM Legacy)',
        category: 'Allied Telesis Access Switch',
        osType: 'CentreCOM CLI (AT-GS950 / AT-8000S / AT-9000)',
        defaultBaud: 9600,
        samplePrompt: 'Manager# ',
      },
      {
        id: 'alliedtelesis-router-ngfw',
        name: 'Allied Telesis - Router & UTM Firewall (AR Series)',
        category: 'Allied Telesis Next-Gen Router',
        osType: 'AlliedWare Plus NGFW / VPN Router (AR4050S / AR3050S / AR2050V / AR1050V)',
        defaultBaud: 9600,
        samplePrompt: 'awplus-router# ',
      },
      {
        id: 'alliedtelesis-wireless-ap',
        name: 'Allied Telesis - Wireless AP (TQ / TQm Series & AWC)',
        category: 'Allied Telesis Wireless AP',
        osType: 'Allied Telesis AP OS (TQ6702e / TQ6602 / TQ5403 / TQm5403 / TQ1402 / TQ4600)',
        defaultBaud: 115200,
        samplePrompt: 'TQ-AP# ',
      },
    ],
  },
  openwrt: {
    id: 'openwrt',
    name: 'OpenWrt',
    badgeColor: 'bg-cyan-600/10 text-cyan-400 border-cyan-600/30',
    defaultPrompt: 'root@OpenWrt:~# ',
    models: [
      {
        id: 'openwrt',
        name: 'OpenWrt',
        category: 'Open Source',
        osType: 'OpenWrt Linux Router OS',
        defaultBaud: 115200,
        samplePrompt: 'root@OpenWrt:~# ',
      },
    ],
  },
  generic: {
    id: 'generic',
    name: 'Generic / Custom CLI',
    badgeColor: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    defaultPrompt: 'console#',
    models: [
      {
        id: 'generic-console',
        name: 'Generic Console / SSH',
        category: 'General Terminal',
        osType: 'Universal CLI',
        defaultBaud: 9600,
        samplePrompt: 'console#',
      },
    ],
  },
};
