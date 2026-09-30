/**
 * Web GUI Screen Analyzer & Parameter Guide Engine
 * Provides local diagnostics, error detection, parameter explanations, and CLI translation
 * for Network Device Web Management Interfaces (MikroTik, OpenWrt, Cisco, GPON ONU, pfSense, Ruijie, Fortinet, Juniper, Huawei, etc.)
 */

export interface WebGuiParameterItem {
  key: string;
  label: string;
  value: string;
  category: 'wan' | 'lan' | 'wireless' | 'firewall' | 'routing' | 'system' | 'pon' | 'security';
  description: string;
  recommendation: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  rfcStandard?: string;
  commonErrors?: string[];
}

export interface WebGuiDiagnosisResult {
  status: 'healthy' | 'warning' | 'critical' | 'info';
  brand: string;
  model: string;
  pageTitle: string;
  url: string;
  summary: string;
  identifiedIssues: string[];
  explanation: string;
  parameterGuides: WebGuiParameterItem[];
  recommendedSettings: { parameter: string; recommendedValue: string; reason: string }[];
  equivalentCliCommands: { title: string; cliSyntax: string; description: string }[];
}

/**
 * Universal Parameter Dictionary for Networking Web GUIs
 */
export const WEB_PARAMETER_DICTIONARY: Record<string, Omit<WebGuiParameterItem, 'key' | 'value'>> = {
  // WAN Parameters
  'wan_connection_type': {
    label: 'WAN Connection Type (Mode WAN)',
    category: 'wan',
    description: 'Menentukan metode autentikasi dan alokasi IP publik/uplink dari ISP. Pilihan umum: PPPoE (sering digunakan Fiber ISP seperti Indihome/Biznet/MyRepublic), Static IP (IP Statis leased-line), DHCP Client / IPoE (otomatis dari modem upstream).',
    recommendation: 'Gunakan PPPoE jika berlangganan broadband rumahan/kantor dengan username & password ISP. Gunakan Static IP untuk dedicated internet.',
    impactLevel: 'critical',
    commonErrors: ['PPPoE Authentication Failed (Username/Password salah)', 'DHCP No Lease Offered (Kabel WAN lepas/salah port)'],
  },
  'wan_mtu': {
    label: 'WAN MTU (Maximum Transmission Unit)',
    category: 'wan',
    description: 'Ukuran paket data Ethernet terbesar (dalam byte) yang dapat ditransmisikan tanpa fragmentasi.',
    recommendation: 'Untuk koneksi PPPoE, atur ke 1480 atau 1492 (karena ada 8-byte PPPoE header overhead). Untuk koneksi Ethernet/DHCP standar, atur ke 1500.',
    impactLevel: 'high',
    rfcStandard: 'RFC 2516 (A Method for Transmitting PPP Over Ethernet)',
    commonErrors: ['MTU 1500 pada PPPoE menyebabkan beberapa website (seperti perbankan/streaming) tidak bisa dibuka (Black Hole MTU).'],
  },
  'vlan_id': {
    label: 'VLAN ID / 802.1Q Tag',
    category: 'wan',
    description: 'Virtual LAN identifier (1 - 4094) untuk memisahkan traffic layer 2 (misal: VLAN 100 untuk Internet, VLAN 200 untuk IPTV/UseeTV, VLAN 300 untuk VoIP).',
    recommendation: 'Masukkan VLAN ID sesuai instruksi ISP jika modem GPON dalam mode Bridge. Kosongkan (Untagged) jika port upstream sudah access port.',
    impactLevel: 'high',
    rfcStandard: 'IEEE 802.1Q',
  },
  'nat_masquerade': {
    label: 'NAT (Network Address Translation) / Masquerade',
    category: 'firewall',
    description: 'Menerjemahkan seluruh IP privat lokal (192.168.x.x / 10.x.x.x) ke satu IP publik WAN saat mengakses internet keluar.',
    recommendation: 'Wajib DIAKTIFKAN (Enabled) pada antarmuka WAN router gateway agar perangkat klien LAN bisa mengakses internet.',
    impactLevel: 'critical',
    rfcStandard: 'RFC 3022',
  },
  'dns_primary': {
    label: 'Primary DNS Server',
    category: 'lan',
    description: 'Server penerjemah nama domain (URL) menjadi alamat IP yang digunakan router dan disebarkan ke klien via DHCP.',
    recommendation: 'Gunakan DNS publik berkecepatan tinggi: 1.1.1.1 (Cloudflare), 8.8.8.8 (Google), atau 9.9.9.9 (Quad9 untuk malware filtering).',
    impactLevel: 'medium',
  },
  'dns_secondary': {
    label: 'Secondary / Backup DNS Server',
    category: 'lan',
    description: 'Server DNS cadangan jika server DNS utama mengalami timeout atau gangguan.',
    recommendation: 'Gunakan 1.0.0.1 (Cloudflare Secondary) atau 8.8.4.4 (Google Secondary).',
    impactLevel: 'medium',
  },
  'dhcp_pool_start': {
    label: 'DHCP Pool Start - End Range',
    category: 'lan',
    description: 'Rentang alokasi alamat IP dinamis yang dibagikan ke laptop, smartphone, dan perangkat klien di jaringan lokal.',
    recommendation: 'Sisakan blok IP awal (misal .2 s/d .50) untuk perangkat dengan Static IP (seperti Server, Printer, Access Point, Switch, NVR CCTV), dan atur pool DHCP di .51 s/d .254.',
    impactLevel: 'medium',
  },
  'dhcp_lease_time': {
    label: 'DHCP Lease Time',
    category: 'lan',
    description: 'Durasi waktu sebuah perangkat klien diizinkan memegang alamat IP sebelum harus memperpanjang (renew) sewa IP ke router.',
    recommendation: 'Untuk kantor/rumah: 12 - 24 Jam (720 - 1440 menit). Untuk kafe/hotspot publik dengan perputaran tamu tinggi: 30 - 60 menit agar pool IP tidak cepat habis.',
    impactLevel: 'medium',
  },
  'wlan_ssid': {
    label: 'Wi-Fi SSID (Network Name)',
    category: 'wireless',
    description: 'Nama sinyal Wi-Fi yang dipancarkan oleh Access Point / Router nirkabel.',
    recommendation: 'Gunakan nama yang jelas. Pisahkan SSID 2.4GHz (jangkauan luas) dan 5GHz (kecepatan tinggi) jika tidak menggunakan Band Steering.',
    impactLevel: 'medium',
  },
  'wlan_security': {
    label: 'Wi-Fi Security & Encryption',
    category: 'security',
    description: 'Protokol keamanan enkripsi sandi nirkabel. Pilihan: Open (tanpa sandi), WPA2-PSK (AES), WPA3-SAE (paling aman).',
    recommendation: 'Gunakan mode WPA2/WPA3 Mixed Mode (AES) dengan password minimal 10-12 karakter kombinasi angka dan huruf.',
    impactLevel: 'high',
  },
  'pon_optical_rx': {
    label: 'GPON Optical Rx Power (Daya Terima Serat Optik)',
    category: 'pon',
    description: 'Tingkat intensitas daya cahaya laser optik yang diterima oleh modem ONT/ONU dari perangkat OLT sentral (dalam satuan dBm).',
    recommendation: 'Rentang normal yang sehat: antara -15.0 dBm hingga -24.0 dBm. Nilai di bawah -27.0 dBm menandakan redaman terlalu tinggi / kabel fiber optic tertekuk atau kotor.',
    impactLevel: 'critical',
  },
  'firewall_syn_flood': {
    label: 'SYN Flood / DoS Protection',
    category: 'firewall',
    description: 'Fitur pertahanan router untuk menolak serangan TCP SYN flood yang mencoba menghabiskan memory koneksi router.',
    recommendation: 'Aktifkan (Enabled) dengan limit threshold adaptif.',
    impactLevel: 'medium',
  },
  'stp_priority': {
    label: 'STP / RSTP Bridge Priority',
    category: 'routing',
    description: 'Prioritas Spanning Tree Protocol untuk menentukan Root Bridge switch dalam topologi redundansi layer 2.',
    recommendation: 'Atur switch Core utama ke nilai prioritas terendah: 4096 atau 0, switch Distribution ke 8192, dan switch Access ke 32768.',
    impactLevel: 'high',
    rfcStandard: 'IEEE 802.1D / 802.1w',
  }
};

/**
 * Intelligent Local Diagnostics for Network Web GUI Screens
 */
export function analyzeWebGuiScreenLocally(params: {
  url: string;
  brand?: string;
  pageTitle?: string;
  errorText?: string;
  formData?: Record<string, string>;
  rawHtmlOrText?: string;
  userQuestion?: string;
}): WebGuiDiagnosisResult {
  const { 
    url, 
    brand = 'mikrotik', 
    pageTitle = 'Device Web Management', 
    errorText = '', 
    formData = {}, 
    rawHtmlOrText = '',
    userQuestion = '',
  } = params;

  const combinedContext = `${url} ${pageTitle} ${errorText} ${JSON.stringify(formData)} ${rawHtmlOrText}`.toLowerCase();
  const qLower = (userQuestion || '').toLowerCase();
  const bLower = (brand || '').toLowerCase();

  const identifiedIssues: string[] = [];
  const parameterGuides: WebGuiParameterItem[] = [];
  const recommendedSettings: { parameter: string; recommendedValue: string; reason: string }[] = [];
  const equivalentCliCommands: { title: string; cliSyntax: string; description: string }[] = [];

  // Extract IPs found in context
  const ipMatches = combinedContext.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
  const uniqueIps = Array.from(new Set(ipMatches)).filter(ip => !ip.startsWith('0.') && !ip.startsWith('127.'));
  const detectedLanIp = formData['lan_ip'] || uniqueIps.find(ip => ip.startsWith('192.168.') || ip.startsWith('10.')) || '192.168.1.1';
  const detectedWanIp = formData['wan_ip'] || uniqueIps.find(ip => !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.16.')) || '203.0.113.10';

  let status: 'healthy' | 'warning' | 'critical' | 'info' = 'healthy';
  let summary = `Analisis Web GUI ${brand.toUpperCase()} (${pageTitle}) berhasil diproses.`;
  let explanation = `Parameter tampilan web manajemen ${brand.toUpperCase()} terpantau aktif.`;

  const isSettingIntent = qLower.includes('setting') || qLower.includes('konfigurasi') || qLower.includes('cara') || qLower.includes('langkah') || qLower.includes('setup') || qLower.includes('panduan');

  // 1. Check for WAN / Internet / PPPoE Issues
  if (combinedContext.includes('authentication failed') || combinedContext.includes('chap auth fail') || combinedContext.includes('auth error') || combinedContext.includes('bad credentials')) {
    status = 'critical';
    summary = 'Autentikasi WAN PPPoE Gagal! Username atau password akun ISP tidak cocok.';
    identifiedIssues.push('PPPoE Session Terminated: Auth Failure (Kode LCP / PAP / CHAP menolak login)');
    identifiedIssues.push('Router tidak mendapatkan IP Publik dari ISP');
    explanation = 'Server BRAS/PPPoE ISP menolak kredensial yang dimasukkan. Periksa kembali username (pastikan format domain ISP benar, misal @telkom.net atau @biznet) dan password akun.';
    recommendedSettings.push({
      parameter: 'PPPoE Username / Password',
      recommendedValue: 'Format lengkap sesuai SPK ISP',
      reason: 'Mencegah penolakan sesi pada BRAS Gateway'
    });
    recommendedSettings.push({
      parameter: 'WAN MTU',
      recommendedValue: '1480 atau 1492',
      reason: 'Mengakomodasi 8-byte PPPoE header'
    });
  } else if (combinedContext.includes('no carrier') || combinedContext.includes('link down') || combinedContext.includes('wan disconnected') || combinedContext.includes('physically down')) {
    status = 'critical';
    summary = 'Port WAN Terputus Fisik (Physical Link DOWN).';
    identifiedIssues.push('Kabel Ethernet WAN tidak terhubung atau modem upstream mati.');
    identifiedIssues.push('Interface PHY negotiate 0 Mbps.');
    explanation = 'Kabel UTP patch-cord WAN pada port 1/WAN tidak mendeteksi sinyal listrik. Pastikan modem ONT dalam kondisi menyala dan kabel UTP RJ45 terpasang rapat.';
    recommendedSettings.push({
      parameter: 'Link Speed Negotiation',
      recommendedValue: 'Auto-Negotiation (1000Mbps Full Duplex)',
      reason: 'Mencegah duplex mismatch dengan port modem ISP'
    });
  }

  // 2. Check for Optical Power / GPON Fiber Issues
  if (combinedContext.includes('rx optical') || combinedContext.includes('optical power') || combinedContext.includes('gpon') || combinedContext.includes('onu') || combinedContext.includes('olt')) {
    const rxMatch = combinedContext.match(/[-]?\d+\.?\d*\s*dbm/);
    const rxVal = rxMatch ? parseFloat(rxMatch[0]) : -21.5;

    if (rxVal < -27.0) {
      status = 'critical';
      summary = `Redaman Fiber Optik Sangat Buruk (${rxVal} dBm)! Risiko Loss of Signal (LOS).`;
      identifiedIssues.push(`Optical Rx Power (${rxVal} dBm) di luar batas aman standar GPON Class B+ (-8 dBm s/d -27 dBm).`);
      identifiedIssues.push('Tingkat error frame optik (BIP error) tinggi menyebabkan drop paket internet.');
      explanation = 'Sinyal cahaya dari OLT terlalu redup. Kemungkinan penyebab: kabel patchcord SC/UPC tertekuk (macro-bending), konektor berdebu, atau ada redaman sambungan splitter pasif yang tinggi.';
      recommendedSettings.push({
        parameter: 'Optical Rx Power Target',
        recommendedValue: '-18.0 s/d -22.0 dBm',
        reason: 'Menjamin stabilitas link optik jangka panjang tanpa fluktuasi BER'
      });
    } else if (rxVal > -8.0) {
      status = 'warning';
      summary = `Daya Optik Terlalu Tinggi (${rxVal} dBm) - Optical Receiver Overload.`;
      identifiedIssues.push(`Optical Rx Power (${rxVal} dBm) berlebih, dapat merusak fotodioda receiver ONU.`);
    } else {
      identifiedIssues.push(`Optical Rx Power: ${rxVal} dBm (🟢 Normal / Optimal Range)`);
    }
  }

  // 3. Check for Subnet & IP Overlap
  if (formData['wan_ip'] && formData['lan_ip']) {
    const wanIp = formData['wan_ip'].trim();
    const lanIp = formData['lan_ip'].trim();
    if (wanIp.startsWith('192.168.1.') && lanIp.startsWith('192.168.1.')) {
      status = 'critical';
      summary = 'Konflik Alamat IP: Subnet WAN dan Subnet LAN Menggunakan Blok yang Sama (192.168.1.0/24)!';
      identifiedIssues.push('IP Subnet Overlap: Router tidak dapat merutekan paket karena gateway WAN dan interface lokal bertabrakan.');
      explanation = 'Jika modem ISP memberikan IP 192.168.1.x, maka LAN router HARUS diubah ke subnet berbeda, misalnya 192.168.2.1/24 atau 192.168.88.1/24.';
      recommendedSettings.push({
        parameter: 'LAN IP Address',
        recommendedValue: '192.168.10.1/24 atau 192.168.88.1/24',
        reason: 'Menghindari tabrakan routing dengan subnet modem upstream'
      });
    }
  }

  // 4. Populate relevant parameter guides based on vendor / page context
  const targetKeys = ['wan_connection_type', 'wan_mtu', 'nat_masquerade', 'dns_primary', 'dns_secondary', 'dhcp_pool_start', 'dhcp_lease_time', 'wlan_security'];
  for (const k of targetKeys) {
    const dictItem = WEB_PARAMETER_DICTIONARY[k];
    if (dictItem) {
      parameterGuides.push({
        key: k,
        label: dictItem.label,
        value: formData[k] || (k === 'wan_mtu' ? '1492' : k === 'dns_primary' ? '1.1.1.1' : k === 'dns_secondary' ? '8.8.8.8' : 'Configured'),
        category: dictItem.category,
        description: dictItem.description,
        recommendation: dictItem.recommendation,
        impactLevel: dictItem.impactLevel,
        rfcStandard: dictItem.rfcStandard,
        commonErrors: dictItem.commonErrors,
      });
    }
  }

  // 5. Build Dynamic Guidance & CLI based on User Intent & Selected Brand
  if (isSettingIntent || qLower.includes('dhcp') || qLower.includes('ip') || qLower.includes('vlan') || qLower.includes('nat') || qLower.includes('wifi') || qLower.includes('routing')) {
    summary = `Panduan Langkah Konfigurasi & Skrip CLI untuk ${brand.toUpperCase()} (${pageTitle})`;
    explanation = `Berikut adalah langkah-langkah setting interaktif pada Web GUI ${brand.toUpperCase()} serta padanan perintah CLI yang siap Anda copy-paste ke terminal.`;
  }

  // Multi-Vendor CLI Synthesis
  if (bLower.includes('mikrotik') || bLower.includes('routeros')) {
    equivalentCliCommands.push({
      title: '1. Konfigurasi IP Address & Gateway (MikroTik CLI)',
      cliSyntax: `/ip address add address=${detectedLanIp}/24 interface=bridge-lan comment="LAN Gateway"\n/ip route add dst-address=0.0.0.0/0 gateway=${formData['wan_gateway'] || '192.168.1.1'} check-gateway=ping`,
      description: 'Menetapkan IP lokal router dan routing default gateway ke ISP.'
    });
    equivalentCliCommands.push({
      title: '2. Setup DHCP Server & DNS Resolver',
      cliSyntax: `/ip pool add name=dhcp-pool ranges=${detectedLanIp.replace(/\.\d+$/, '.50')}-${detectedLanIp.replace(/\.\d+$/, '.250')}\n/ip dhcp-server add name=dhcp-lan interface=bridge-lan address-pool=dhcp-pool lease-time=12h disabled=no\n/ip dhcp-server network add address=${detectedLanIp.replace(/\.\d+$/, '.0')}/24 gateway=${detectedLanIp} dns-server=1.1.1.1,8.8.8.8\n/ip dns set servers=1.1.1.1,8.8.8.8 allow-remote-requests=yes`,
      description: 'Mendistribusikan IP dinamis ke semua perangkat klien LAN.'
    });
    equivalentCliCommands.push({
      title: '3. Setup NAT Internet Masquerade & Firewall',
      cliSyntax: `/ip firewall nat add chain=srcnat out-interface-list=WAN action=masquerade comment="NAT Out"\n/ip firewall filter add chain=forward action=fasttrack-connection connection-state=established,related comment="FastTrack"`,
      description: 'Mengaktifkan translasi NAT agar klien lokal bisa browsing ke internet.'
    });
  } else if (bLower.includes('fortinet') || bLower.includes('fortigate')) {
    equivalentCliCommands.push({
      title: '1. Konfigurasi Antarmuka LAN & WAN (FortiOS CLI)',
      cliSyntax: `config system interface\n    edit "lan"\n        set mode static\n        set ip ${detectedLanIp} 255.255.255.0\n        set allowaccess ping https ssh\n    next\n    edit "wan1"\n        set mode static\n        set ip ${detectedWanIp} 255.255.255.252\n    next\nend`,
      description: 'Konfigurasi IP address dan akses management interface di FortiOS.'
    });
    equivalentCliCommands.push({
      title: '2. Konfigurasi Static Default Route',
      cliSyntax: `config router static\n    edit 1\n        set dst 0.0.0.0 0.0.0.0\n        set gateway ${formData['wan_gateway'] || '203.0.113.9'}\n        set device "wan1"\n    next\nend`,
      description: 'Mengarahkan seluruh traffic keluar ke next-hop gateway ISP.'
    });
    equivalentCliCommands.push({
      title: '3. Konfigurasi Firewall Policy & NAT Masquerade',
      cliSyntax: `config firewall policy\n    edit 1\n        set name "LAN_TO_INTERNET"\n        set srcintf "lan"\n        set dstintf "wan1"\n        set srcaddr "all"\n        set dstaddr "all"\n        set action accept\n        set schedule "always"\n        set service "ALL"\n        set nat enable\n    next\nend`,
      description: 'Memberikan izin akses internet untuk subnet lokal dengan fitur NAT.'
    });
  } else if (bLower.includes('juniper') || bLower.includes('junos')) {
    equivalentCliCommands.push({
      title: '1. Konfigurasi Interface & Routing (Juniper Junos)',
      cliSyntax: `configure\nset interfaces ge-0/0/0 unit 0 family inet address ${detectedWanIp}/30\nset interfaces ge-0/0/1 unit 0 family inet address ${detectedLanIp}/24\nset routing-options static route 0.0.0.0/0 next-hop ${formData['wan_gateway'] || '203.0.113.9'}\ncommit and-quit`,
      description: 'Menetapkan IP antarmuka WAN/LAN dan default routing static pada Junos OS.'
    });
  } else if (bLower.includes('huawei') || bLower.includes('vrp')) {
    equivalentCliCommands.push({
      title: '1. Konfigurasi Interface & NAT (Huawei VRP CLI)',
      cliSyntax: `system-view\ninterface GigabitEthernet0/0/1\n ip address ${detectedLanIp} 255.255.255.0\n quit\ninterface GigabitEthernet0/0/0\n ip address ${detectedWanIp} 255.255.255.252\n nat outbound 2000\n quit\nip route-static 0.0.0.0 0.0.0.0 ${formData['wan_gateway'] || '203.0.113.9'}\nreturn\nsave`,
      description: 'Menetapkan antarmuka IP dan konfigurasi NAT Outbound di Huawei Router/Switch.'
    });
  } else if (bLower.includes('openwrt') || bLower.includes('luci')) {
    equivalentCliCommands.push({
      title: '1. Konfigurasi Network Interfaces (OpenWrt UCI CLI)',
      cliSyntax: `uci set network.lan.ipaddr='${detectedLanIp}'\nuci set network.lan.netmask='255.255.255.0'\nuci set network.wan.proto='static'\nuci set network.wan.ipaddr='${detectedWanIp}'\nuci set network.wan.netmask='255.255.255.252'\nuci set network.wan.gateway='${formData['wan_gateway'] || '203.0.113.9'}\nuci set network.wan.dns='1.1.1.1 8.8.8.8'\nuci commit network\n/etc/init.d/network restart`,
      description: 'Menerapkan konfigurasi LAN dan WAN via unified configuration interface (uci).'
    });
  } else {
    // Default Cisco IOS / IOS-XE
    equivalentCliCommands.push({
      title: '1. Konfigurasi VLAN, SVI Interface & IP Gateway (Cisco IOS)',
      cliSyntax: `configure terminal\nvlan 10\n name LAN_USERS\nexit\ninterface Vlan10\n ip address ${detectedLanIp} 255.255.255.0\n no shutdown\nexit\ninterface GigabitEthernet0/0/1\n switchport mode access\n switchport access vlan 10\n no shutdown\nend\nwrite memory`,
      description: 'Membuat VLAN 10, mengalokasikan subnet gateway SVI, dan assign port access.'
    });
    equivalentCliCommands.push({
      title: '2. Konfigurasi DHCP Pool & NAT Overload',
      cliSyntax: `configure terminal\nip dhcp excluded-address ${detectedLanIp} ${detectedLanIp.replace(/\.\d+$/, '.20')}\nip dhcp pool LAN_POOL\n network ${detectedLanIp.replace(/\.\d+$/, '.0')} 255.255.255.0\n default-router ${detectedLanIp}\n dns-server 1.1.1.1 8.8.8.8\nexit\naccess-list 1 permit ${detectedLanIp.replace(/\.\d+$/, '.0')} 0.0.0.255\nip nat inside source list 1 interface GigabitEthernet0/0/0 overload\nend\nwrite memory`,
      description: 'Menyediakan DHCP otomatis untuk perangkat klien dan NAT internet overload.'
    });
  }

  // Append detected parameters into recommendations
  if (formData && Object.keys(formData).length > 0) {
    for (const [k, v] of Object.entries(formData)) {
      if (k.includes('ip') || k.includes('mask') || k.includes('gateway') || k.includes('dns') || k.includes('mtu')) {
        recommendedSettings.push({
          parameter: k.toUpperCase().replace(/_/g, ' '),
          recommendedValue: v,
          reason: 'Terverifikasi dari parameter aktif pada halaman Web GUI'
        });
      }
    }
  }

  return {
    status,
    brand: brand.toUpperCase(),
    model: 'Web Management Interface',
    pageTitle,
    url,
    summary,
    identifiedIssues,
    explanation,
    parameterGuides,
    recommendedSettings,
    equivalentCliCommands,
  };
}
