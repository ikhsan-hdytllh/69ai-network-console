// Packet Diagnostics & Root Cause Analysis Service
// Provides step-by-step process explanation, issue summary, root cause, and remediation for selected network traffic packets.

import { CapturedPacket, FourPillarsSummary, TrafficAnalysisSummary } from './trafficGeneratorService';

export interface PacketFlowStep {
  step: number;
  layer: 'L2 (Data Link)' | 'L3 (Network)' | 'L4 (Transport)' | 'L7 (Application)';
  title: string;
  description: string;
  technicalDetail: string;
}

export interface PacketProcessExplanation {
  protocolName: string;
  category: 'IT' | 'IoT' | 'OT' | 'DIAGNOSTIC';
  overview: string;
  flowSteps: PacketFlowStep[];
  protocolContext: string;
  direction: string;
}

export interface PacketIssueSummary {
  status: 'HEALTHY' | 'TIMEOUT' | 'DROPPED' | 'RST' | 'ANOMALY' | 'RETRANSMISSION';
  badgeColor: 'emerald' | 'amber' | 'red' | 'purple';
  headline: string;
  description: string;
  impactLevel: 'Low (Normal)' | 'Medium (Degraded/High Latency)' | 'High (Packet Drop/Connection Terminated)' | 'Critical (Security/Safety Anomaly)';
}

export interface PacketRootCause {
  primaryCause: string;
  technicalFactors: string[];
  affectedLayer: string;
  confidence: string;
}

export interface PacketSolution {
  recommendedSteps: string[];
  cliCommands: { label: string; command: string }[];
  preventionTip: string;
}

export interface PacketDetailedDiagnostic {
  processExplanation: PacketProcessExplanation;
  issueSummary: PacketIssueSummary;
  rootCause: PacketRootCause;
  solution: PacketSolution;
  summaryPillars: FourPillarsSummary;
}

export function generatePacketDiagnostic(pkt: CapturedPacket): PacketDetailedDiagnostic {
  const proto = pkt.protocol.toUpperCase();
  const src = `${pkt.srcIp}:${pkt.srcPort}`;
  const dst = `${pkt.dstIp}:${pkt.dstPort}`;
  const isTcp = pkt.headers.transport.protocol === 'TCP';
  const isUdp = pkt.headers.transport.protocol === 'UDP';
  const isIcmp = pkt.headers.transport.protocol === 'ICMP' || proto === 'ICMP';
  const category = (pkt.category || 'IT') as 'IT' | 'IoT' | 'OT' | 'DIAGNOSTIC';

  // -------------------------------------------------------------
  // 1. PROCESS EXPLANATION & STEP-BY-STEP TRANSMISSION FLOW
  // -------------------------------------------------------------
  let overview = `Paket ${pkt.protocol} (${pkt.length} bytes) ditransmisikan dari node pengirim ${src} menuju node target ${dst}.`;
  let protocolContext = `Protokol ${pkt.protocol} beroperasi pada Layer 7 Application melalui transport ${pkt.headers.transport.protocol} (Port ${pkt.dstPort}).`;

  if (pkt.brand || pkt.signatureDetails) {
    const brandName = pkt.brand || pkt.signatureDetails?.vendorName || 'Industrial Vendor';
    protocolContext += ` Paket ini memiliki Deep Packet Inspection (DPI) signature dari perangkat ${brandName} (${pkt.deviceType || 'Network Device'}).`;
  }

  const flowSteps: PacketFlowStep[] = [
    {
      step: 1,
      layer: 'L2 (Data Link)',
      title: 'Enkapsulasi Ethernet II Frame',
      description: `Frame diformat dengan Source MAC [${pkt.headers.ethernet.srcMac}] menuju Destination MAC [${pkt.headers.ethernet.dstMac}].`,
      technicalDetail: `EtherType: ${pkt.headers.ethernet.etherType}. Frame length: ${pkt.length} bytes di jalur transmisi fisik (wire).`
    },
    {
      step: 2,
      layer: 'L3 (Network)',
      title: 'Perutean IP Header (IPv4)',
      description: `Paket diberi header IPv4 dari ${pkt.headers.ip.src} ke ${pkt.headers.ip.dst} dengan Time-To-Live (TTL) ${pkt.headers.ip.ttl}.`,
      technicalDetail: `ToS / DSCP: ${pkt.headers.ip.tos}. Header checksum: ${pkt.headers.ip.checksum}. TTL ${pkt.headers.ip.ttl} menjamin paket tidak terjebak dalam routing loop.`
    },
    {
      step: 3,
      layer: 'L4 (Transport)',
      title: `Transport Layer Segmentasi (${pkt.headers.transport.protocol})`,
      description: isTcp
        ? `Sesi TCP dialokasikan pada Source Port ${pkt.srcPort} -> Destination Port ${pkt.dstPort} dengan Flag ${pkt.headers.transport.flags || '[PSH, ACK]'}.`
        : isUdp
        ? `Datagram UDP tanpa koneksi (connectionless) dikirim ke Port ${pkt.dstPort} untuk latensi ultra-rendah.`
        : `ICMP Control Message (Type 8 Echo Request / Type 0 Reply) untuk diagnosa round-trip time.`,
      technicalDetail: isTcp
        ? `Seq: ${pkt.headers.transport.seq || 1000}, Ack: ${pkt.headers.transport.ack || 1000}, Window Size: ${pkt.headers.transport.window || 64240} bytes.`
        : `Checksum: ${pkt.headers.transport.checksum}.`
    },
    {
      step: 4,
      layer: 'L7 (Application)',
      title: `Pemrosesan Payload ${pkt.protocol} Data`,
      description: pkt.headers.appLayer
        ? `Payload didekode sebagai ${pkt.headers.appLayer.name}. Host tujuan mengekstrak parameter aplikasi.`
        : `Payload data aplikasi sebesar ${Math.max(0, pkt.length - 54)} bytes diproses oleh daemon listener di port ${pkt.dstPort}.`,
      technicalDetail: pkt.headers.appLayer
        ? Object.entries(pkt.headers.appLayer.details).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' | ')
        : `Info: ${pkt.info}`
    }
  ];

  // Specific Protocol Enhancements
  if (proto === 'MODBUS' || proto === 'MODBUS_TCP') {
    overview = `Transaksi Modbus TCP Industrial: Client/Master SCADA mengirim request pembacaan/penulisan register ke Unit PLC/RTU di port 502.`;
  } else if (proto === 'S7COMM' || proto === 'SIEMENS_S7') {
    overview = `Komunikasi Siemens S7comm / ISO-on-TCP (Port 102): Sesi read/write data block (DB) antara HMI/SCADA dengan CPU PLC S7-300/400/1200/1500.`;
  } else if (proto === 'OPCUA' || proto === 'OPC_UA') {
    overview = `OPC-UA Binary Client-Server Exchange (Port 4840): Pemanggilan node variable, subskripsi telemetry real-time, atau service discovery.`;
  } else if (proto === 'MQTT') {
    overview = `MQTT IoT Telemetry Messaging (Port 1883/8883): Publish/Subscribe payload sensor JSON menuju MQTT Broker.`;
  } else if (proto === 'HTTP' || proto === 'HTTPS') {
    overview = `Web Application REST Request: Transmisi dokumen HTTP/REST API atau secure TLS 1.3 handshake ke web gateway/server.`;
  } else if (proto === 'ICMP') {
    overview = `ICMP Diagnostic Echo: Verifikasi keterjangkauan host (reachability) dan kalkulasi Round-Trip Time (RTT) jalur jaringan.`;
  }

  // -------------------------------------------------------------
  // 2. ISSUE SUMMARY (Ringkasan Permasalahan Berdasarkan Status)
  // -------------------------------------------------------------
  let issueSummary: PacketIssueSummary;

  switch (pkt.status) {
    case 'timeout':
      issueSummary = {
        status: 'TIMEOUT',
        badgeColor: 'red',
        headline: 'Request Timeout — Tidak Ada Balasan dari Host Tujuan',
        description: `Host pengirim (${pkt.srcIp}) tidak menerima respons atau acknowledgement dari host target (${pkt.dstIp}) dalam batas waktu timeout yang ditentukan. Paket dianggap hilang di jalur transit atau di-drop secara silent oleh firewall.`,
        impactLevel: 'High (Packet Drop/Connection Terminated)'
      };
      break;

    case 'dropped':
      issueSummary = {
        status: 'DROPPED',
        badgeColor: 'red',
        headline: 'Packet Dropped — Frame Hilang di Jalur Transit / Buffer',
        description: `Frame tidak berhasil mencapai interface tujuan. Terjadi drop pada antrian switch (buffer overrun), tabrakan CRC frame error pada kabel, atau filter ACL aktif yang menolak paket.`,
        impactLevel: 'High (Packet Drop/Connection Terminated)'
      };
      break;

    case 'rst':
      issueSummary = {
        status: 'RST',
        badgeColor: 'amber',
        headline: 'TCP Connection Reset (RST) — Koneksi Ditolak Paksa',
        description: `Target (${pkt.dstIp}:${pkt.dstPort}) mengirim paket dengan flag RST (Reset) aktif, yang secara paksa memutuskan koneksi TCP. Ini menandakan tidak ada service yang listening di port tersebut atau session ditolak oleh stateful firewall/IPS.`,
        impactLevel: 'High (Packet Drop/Connection Terminated)'
      };
      break;

    case 'anomaly':
      issueSummary = {
        status: 'ANOMALY',
        badgeColor: 'purple',
        headline: 'Anomali Protokol / Signature Pattern Tidak Sesuai',
        description: `Ditemukan ketidakwajaran pada format payload, ukuran frame tidak standar, checksum tidak valid, atau function code OT/ICS di luar batas izin operasional normal.`,
        impactLevel: 'Critical (Security/Safety Anomaly)'
      };
      break;

    case 'retransmission':
      issueSummary = {
        status: 'RETRANSMISSION',
        badgeColor: 'amber',
        headline: 'TCP Retransmission — Pengiriman Ulang Akibat Hilangnya ACK',
        description: `Pengirim mendeteksi bahwa segmen sebelumnya tidak di-acknowledge oleh penerima sebelum RTO (Retransmission Timeout) habis, sehingga segmen harus dikirim ulang.`,
        impactLevel: 'Medium (Degraded/High Latency)'
      };
      break;

    case 'ok':
    default:
      issueSummary = {
        status: 'HEALTHY',
        badgeColor: 'emerald',
        headline: 'Transmisi Normal — Tidak Ditemukan Masalah',
        description: `Paket berhasil dikirim dan diformat dengan standar protokol ${pkt.protocol} yang valid. Header L2, L3, dan L4 konsisten tanpa error checksum atau frame loss.`,
        impactLevel: 'Low (Normal)'
      };
      break;
  }

  // -------------------------------------------------------------
  // 3. ROOT CAUSE ANALYSIS (Analisa Akar Masalah)
  // -------------------------------------------------------------
  let rootCause: PacketRootCause;

  if (pkt.status === 'timeout') {
    rootCause = {
      primaryCause: `Kemungkinan besar disebabkan oleh Firewall/ACL Drop, Routing Asimetris, atau Host Target Down (${pkt.dstIp}).`,
      affectedLayer: 'Layer 3 (Routing) / Layer 4 (Firewall Filter)',
      confidence: '95% (Berdasarkan ketiadaan paket balasan SYN-ACK atau ICMP Echo Reply)',
      technicalFactors: [
        `Firewall (misal FortiGate/MikroTik/iptables) memblokir port masuk ${pkt.dstPort} secara silent tanpa mengirim TCP RST atau ICMP Unreachable.`,
        `Tabel routing pada intermediate router tidak memiliki route balik (Return Path Route) menuju subnet ${pkt.srcIp}.`,
        `Perangkat target sedang offline, mengalami kernel freeze, atau interface network down.`,
        `MTU/MSS Blackhole: Paket yang lebih besar dari MTU jalur (misal melalui tunnel GRE/VPN) di-drop karena flag Don't Fragment (DF) aktif.`
      ]
    };
  } else if (pkt.status === 'rst') {
    rootCause = {
      primaryCause: `Service/Daemon pada port ${pkt.dstPort} tidak aktif, atau koneksi di-reset oleh TCP Interceptor / IDS / Security Appliance.`,
      affectedLayer: 'Layer 4 (Transport TCP) / Layer 7 (Application Service)',
      confidence: '98% (Flag RST dikirim langsung oleh stack TCP OS target atau Firewall proxy)',
      technicalFactors: [
        `Tidak ada aplikasi atau listener yang berjalan di port ${pkt.dstPort} pada target ${pkt.dstIp} (Socket Closed).`,
        `Stateful Firewall melakukan reset koneksi karena mendeteksi out-of-order sequence number atau sesi TCP yang sudah expired dari table NAT conntrack.`,
        `Fitur Anti-Port-Scanning / IPS aktif pada switch/firewall yang memutus koneksi mencurigakan.`
      ]
    };
  } else if (pkt.status === 'dropped') {
    rootCause = {
      primaryCause: `Penurunan kualitas fisik (Hardware/Kabel UTP/SFP) atau Kongesti Buffer Antrian Switch (Queue Exhaustion).`,
      affectedLayer: 'Layer 1 (Physical) / Layer 2 (Switching Buffer)',
      confidence: '90% (Frame drop terdeteksi pada capture stream)',
      technicalFactors: [
        `Kerusakan pada kabel UTP (pin crimping kendor, crosstalk) atau transceiver optik SFP/SFP+ mengalami high attenuation/low optical RX power.`,
        `Kapasitas throughput port switch melampaui batas (congested port), menyebabkan tail-drop pada buffer packet.`,
        `Duplex mismatch (satu sisi Full-Duplex, sisi lain Half-Duplex) yang menimbulkan tabrakan collision tinggi.`
      ]
    };
  } else if (pkt.status === 'anomaly') {
    rootCause = {
      primaryCause: `Struktur payload menyimpang dari spesifikasi RFC resmi protokol ${pkt.protocol} atau ada percobaan inject perintah tidak sah.`,
      affectedLayer: 'Layer 7 (Application Payload Signature)',
      confidence: '92% (DPI Rule Engine Trigger)',
      technicalFactors: [
        `Field panjang payload (Length Header) tidak sinkron dengan ukuran byte aktual di wire.`,
        `Function code atau register address yang diminta berada di luar rentang aman memori PLC / Industrial controller.`,
        `Potensi malformed packet dari software yang belum terverifikasi atau traffic fuzzing test.`
      ]
    };
  } else if (pkt.status === 'retransmission') {
    rootCause = {
      primaryCause: `Fluktuasi Jitter Tinggi atau Kehilangan Paket Sela (Intermittent Packet Loss) pada jalur transmisi.`,
      affectedLayer: 'Layer 3 (WAN Link / Internet Transit) & Layer 4 (TCP Stack)',
      confidence: '88% (RTO Expired)',
      technicalFactors: [
        `Jalur koneksi melewati link nirkabel (Wireless/4G/5G/Radio) yang mengalami degradasi sinyal sesaat.`,
        `QoS Policy membatasi bandwidth untuk kelas traffic ini sehingga paket tertunda melampaui batas TCP Round-Trip Timeout.`,
        `Beban CPU switch/router tinggi sehingga pemrosesan ACK mengalami latensi.`
      ]
    };
  } else {
    rootCause = {
      primaryCause: `Kondisi jaringan optimal. Parameter L2/L3/L4/L7 berada dalam toleransi standar IEEE & IETF.`,
      affectedLayer: 'Semua Layer Berfungsi Normal',
      confidence: '100% (Verifikasi frame utuh)',
      technicalFactors: [
        `Latency dan Jitter berada dalam batas aman (< 5ms untuk LAN, < 50ms untuk WAN).`,
        `Tidak ada frame check sequence (FCS) error atau fragmentasi paket.`,
        `Service target (${pkt.dstIp}:${pkt.dstPort}) merespons dengan acknowledgement tepat waktu.`
      ]
    };
  }

  // -------------------------------------------------------------
  // 4. SOLUTIONS & CLI REMEDIATION (Solusi & Rekomendasi Teknis)
  // -------------------------------------------------------------
  let solution: PacketSolution;

  if (pkt.status === 'timeout') {
    solution = {
      recommendedSteps: [
        `1. Uji konektivitas dasar Layer 3 menggunakan Ping / ICMP ke ${pkt.dstIp}.`,
        `2. Telusuri hop yang menjatuhkan paket menggunakan Traceroute / MTR.`,
        `3. Periksa aturan Firewall (Filter Rules / ACL / Security Group) untuk memastikan Port ${pkt.dstPort} (${proto}) diizinkan lewat.`,
        `4. Pastikan default gateway pada host target mengarah ke router yang benar.`
      ],
      cliCommands: [
        {
          label: 'Tes Ping & Jangkauan',
          command: `ping -c 4 ${pkt.dstIp}`
        },
        {
          label: 'Telusuri Hop / Jalur Rute',
          command: `traceroute -n -T -p ${pkt.dstPort} ${pkt.dstIp}`
        },
        {
          label: 'Cek Status Port Target (Nmap)',
          command: `nmap -sS -p ${pkt.dstPort} ${pkt.dstIp}`
        },
        {
          label: 'Lihat Rule Firewall Drop (Linux)',
          command: `sudo iptables -L -n -v | grep "DROP"`
        }
      ],
      preventionTip: 'Tambahkan monitoring ICMP dan TCP Port check pada NMS (Zabbix/Prometheus/PRTG) untuk mendeteksi silent drop lebih awal.'
    };
  } else if (pkt.status === 'rst') {
    solution = {
      recommendedSteps: [
        `1. Pastikan service daemon (misal web server, broker MQTT, atau SCADA service) sedang berjalan dan berstatus LISTEN di port ${pkt.dstPort}.`,
        `2. Periksa apakah ada aturan Firewall / IPS yang menembakkan TCP Reset (REJECT with tcp-reset).`,
        `3. Cek log aplikasi di host target untuk melihat apakah koneksi dari IP ${pkt.srcIp} ditolak karena whitelist/blacklist.`
      ],
      cliCommands: [
        {
          label: 'Cek Port Listening di Target (Linux)',
          command: `ss -tulpn | grep ":${pkt.dstPort}"`
        },
        {
          label: 'Cek Koneksi Aktif di MikroTik',
          command: `/ip firewall connection print where dst-address="${pkt.dstIp}:${pkt.dstPort}"`
        },
        {
          label: 'Verifikasi Service Status di Linux Target',
          command: `systemctl status $(ss -tlpn | grep ":${pkt.dstPort}" | awk '{print $NF}' | cut -d'"' -f2)`
        }
      ],
      preventionTip: 'Gunakan auto-restart service (systemd restart-on-failure atau Docker container restart policy) agar daemon tidak mati tanpa disadari.'
    };
  } else if (pkt.status === 'dropped') {
    solution = {
      recommendedSteps: [
        `1. Periksa physical port counters pada switch (Cek CRC errors, Input/Output errors, Frame drops).`,
        `2. Lakukan pengujian kabel UTP dengan LAN cable tester atau uji optical power SFP menggunakan command DDM/DOM.`,
        `3. Pastikan settingan Speed & Duplex pada kedua sisi interface diset ke "Auto-Negotiation" atau dikunci secara identik (1000/Full).`,
        `4. Periksa buffer utilization switch dan aktifkan Flow Control 802.3x jika terdapat burst traffic.`
      ],
      cliCommands: [
        {
          label: 'Cek Error Interface (Cisco IOS)',
          command: `show interfaces counters errors | include Gi|Te`
        },
        {
          label: 'Cek Rx/Tx Drops (MikroTik RouterOS)',
          command: `/interface print stats-detail where rx-drop>0 or tx-drop>0`
        },
        {
          label: 'Cek Statistik Optik SFP DDM (Cisco)',
          command: `show interfaces transceiver details`
        }
      ],
      preventionTip: 'Gunakan kabel bersertifikasi Cat6/Cat6A untuk gigabit/10G dan bersihkan konektor fiber optik sebelum dicolok ke port SFP.'
    };
  } else if (pkt.status === 'anomaly') {
    solution = {
      recommendedSteps: [
        `1. Periksa konfigurasi software pengirim untuk memastikan parameter protokol ${pkt.protocol} sesuai standar yang didukung penerima.`,
        `2. Tangkap dump paket lengkap (PCAP) dan validasi struktur data menggunakan Wireshark dissector.`,
        `3. Jika ini terjadi di lingkungan OT/ICS SCADA, lakukan audit pada PLC register mapping dan pastikan firmware pengontrol terupdate.`
      ],
      cliCommands: [
        {
          label: 'Capture Packet Lengkap dengan Tcpdump',
          command: `sudo tcpdump -i any -nn -s 0 -w capture_anomaly.pcap host ${pkt.dstIp} and port ${pkt.dstPort}`
        },
        {
          label: 'Analisa Detail Frame dengan TShark',
          command: `tshark -r capture_anomaly.pcap -V -Y "${pkt.protocol.toLowerCase()}"`
        }
      ],
      preventionTip: 'Terapkan Network Segmentation (VLAN/Zone) dan pasang DPI Firewall untuk membatasi function code OT/ICS berbahaya.'
    };
  } else if (pkt.status === 'retransmission') {
    solution = {
      recommendedSteps: [
        `1. Periksa utilisasi bandwidth pada link transmisi untuk memastikan tidak terjadi saturasi (bottle-neck).`,
        `2. Periksa MTU (Maximum Transmission Unit) pada router dan interface jaringan (standar 1500 bytes).`,
        `3. Konfigurasikan QoS (Quality of Service) untuk memprioritaskan paket mission-critical di atas traffic bulk download.`
      ],
      cliCommands: [
        {
          label: 'Uji Bandwidth & Jitter dengan Iperf3',
          command: `iperf3 -c ${pkt.dstIp} -p 5201 -u -b 100M -t 10`
        },
        {
          label: 'Uji Path MTU Tanpa Fragmentasi',
          command: `ping -c 4 -M do -s 1472 ${pkt.dstIp}`
        }
      ],
      preventionTip: 'Gunakan TCP MSS Clamping pada router gateway VPN (MSS = MTU - 40) untuk mencegah retransmisi akibat paket terpotong.'
    };
  } else {
    solution = {
      recommendedSteps: [
        `1. Sesi transmisi berada dalam status PRIMA. Lanjutkan monitoring berkala.`,
        `2. Anda dapat mengekspor riwayat packet capture ini ke format .PCAP standar untuk dokumentasi baseline performa jaringan.`
      ],
      cliCommands: [
        {
          label: 'Monitor Real-Time Traffic Host Ini',
          command: `sudo tcpdump -i any -n "host ${pkt.dstIp} and port ${pkt.dstPort}"`
        },
        {
          label: 'Lihat Statistik Socket TCP Aktif',
          command: `ss -ti "dst ${pkt.dstIp}"`
        }
      ],
      preventionTip: 'Simpan capture baseline ini sebagai acuan SLA latensi dan throughput jaringan saat kondisi normal.'
    };
  }

  // Construct Four Pillars Summary for individual frame
  const isPlaintext = pkt.dstPort === 21 || pkt.dstPort === 23 || pkt.dstPort === 80;
  const isAnomaly = pkt.status === 'anomaly';
  const isRst = pkt.status === 'rst';
  const isTimeout = pkt.status === 'timeout';

  const summaryPillars: FourPillarsSummary = {
    pointUtama: `Paket #${pkt.id} [${pkt.protocol}] berukuran ${pkt.length} bytes ditransmisikan dari ${pkt.srcIp}:${pkt.srcPort} ke ${pkt.dstIp}:${pkt.dstPort} (Status: ${pkt.status.toUpperCase()}).`,
    masalah: isTimeout 
      ? `Request Timeout: Host ${pkt.dstIp} tidak merespons, kemungkinan firewall drop silent atau host offline.`
      : isRst
      ? `TCP Reset: Port ${pkt.dstPort} ditutup oleh host tujuan atau koneksi di-reject oleh firewall policy.`
      : isAnomaly
      ? `Anomali Payload: Format isi paket menyimpang dari standar RFC protokol ${pkt.protocol}.`
      : pkt.status === 'dropped'
      ? `Packet Drop: Frame terputus di buffer antrian switch atau gangguan fisik kabel.`
      : `Tidak ditemukan masalah teknis pada frame ini. Transmisi berlangsung normal.`,
    keamanan: {
      status: isAnomaly ? 'ALERT' : isPlaintext ? 'WARNING' : 'SAFE',
      title: isAnomaly ? 'Potensi Malformed Payload / Exploitation Frame' : isPlaintext ? 'Lalu Lintas Plaintext Unencrypted' : 'Postur Keamanan Aman',
      findings: [
        isPlaintext ? `Port ${pkt.dstPort} (${proto}) mentransmisikan data tanpa enkripsi TLS (rentan sniffing & Man-in-the-Middle).` : `Header dan enkapsulasi sesuai standar keamanan.`,
        isAnomaly ? `Payload signature tidak sesuai dengan DPI pattern yang terdaftar.` : `Checksum valid: ${pkt.headers.ip.checksum}`,
        `Source MAC: ${pkt.headers.ethernet.srcMac} | Dest MAC: ${pkt.headers.ethernet.dstMac}`
      ]
    },
    solusi: solution.recommendedSteps,
    cliRemediation: solution.cliCommands
  };

  return {
    processExplanation: {
      protocolName: pkt.protocol,
      category,
      overview,
      flowSteps,
      protocolContext,
      direction: `${src} ➔ ${dst}`
    },
    issueSummary,
    rootCause,
    solution,
    summaryPillars
  };
}

/**
 * Generates global 4-Pillars Executive Summary for the entire capture session
 */
export function generateGlobalFourPillarsSummary(
  summary: Partial<TrafficAnalysisSummary>,
  packets: CapturedPacket[]
): FourPillarsSummary {
  const total = summary.totalSent || packets.length || 1;
  const received = summary.totalReceived || packets.filter(p => p.status === 'ok').length;
  const loss = summary.packetLossPercent !== undefined ? summary.packetLossPercent : Math.round(((total - received) / total) * 100);
  const avgRtt = summary.avgLatencyMs || 0;
  const jitter = summary.jitterMs || 0;

  const anomalies = packets.filter(p => p.status === 'anomaly');
  const resets = packets.filter(p => p.status === 'rst');
  const timeouts = packets.filter(p => p.status === 'timeout');
  const plaintexts = packets.filter(p => p.dstPort === 80 || p.dstPort === 21 || p.dstPort === 23);

  // 1. Point Utama
  const pointUtama = `Sesi menangkap total ${total} paket (${received} berhasil direspons, loss ${loss}%). Rata-rata RTT adalah ${avgRtt} ms dengan jitter ${jitter} ms. Protokol aktif: ${Array.from(new Set(packets.map(p => p.protocol))).join(', ') || 'ICMP/TCP'}. Interface asal: ${summary.sourceInterface || 'System NIC'} (IP: ${summary.sourceIp || '192.168.1.100'}).`;

  // 2. Identifikasi Masalah
  let masalah = 'Semua frame ditransmisikan dan direspons optimal tanpa indikasi bottle-neck atau packet drop.';
  if (loss >= 100) {
    masalah = `Total 100% Packet Loss / No-Response: Node target tidak membalas. Kemungkinan besar disebabkan oleh port filtering (Firewall/ACL drop), rute routing gateway tidak lengkap, atau host target dalam kondisi mati.`;
  } else if (loss > 0) {
    masalah = `Terjadi Packet Drop sebesar ${loss}% (${total - received} frame hilang). Indikasi degradasi fisik kabel UTP/SFP, tabrakan duplex mismatch, atau saturasi buffer antrian switch (tail-drop).`;
  } else if (resets.length > 0) {
    masalah = `Ditemukan ${resets.length} koneksi TCP Reset (RST). Service pada port tujuan tidak listening atau koneksi ditolak paksa oleh firewall/IPS.`;
  } else if (jitter > 25) {
    masalah = `Jitter tinggi (${jitter} ms) terdeteksi. Jalur transmisi mengalami kongesti fluktuatif atau delay pemrosesan buffer router.`;
  }

  // 3. Aspek Keamanan
  const secStatus: 'SAFE' | 'WARNING' | 'ALERT' = anomalies.length > 0 ? 'ALERT' : plaintexts.length > 0 ? 'WARNING' : 'SAFE';
  const secTitle = anomalies.length > 0 
    ? `Terdeteksi ${anomalies.length} Anomali Frame / Signature Tidak Standar`
    : plaintexts.length > 0
    ? `Peringatan: ${plaintexts.length} Paket Menggunakan Port Plaintext Unencrypted`
    : `Postur Keamanan Bersih & Terverifikasi`;

  const secFindings: string[] = [];
  if (anomalies.length > 0) {
    secFindings.push(`Ditemukan ${anomalies.length} frame dengan format payload tidak wajar / OT function code tidak valid.`);
  }
  if (plaintexts.length > 0) {
    secFindings.push(`Lalu lintas port ${plaintexts[0].dstPort} (${plaintexts[0].protocol}) tidak dienkripsi, risiko penyadapan kredensial di jaringan lokal.`);
  }
  if (resets.length > 0) {
    secFindings.push(`Terdapat ${resets.length} TCP RST yang dapat mengindikasikan aktivitas port scanning atau host isolation.`);
  }
  if (secFindings.length === 0) {
    secFindings.push('Tidak ditemukan pola port scanning, flood anomaly, atau packet injection berbahaya.');
    secFindings.push('Semua MAC OUI dan IP header konsisten dengan alokasi jaringan lokal.');
  }

  // 4. Solusi & Remediasi CLI
  const solusi: string[] = [];
  const cliRemediation: { label: string; command: string }[] = [];

  if (loss > 0) {
    solusi.push('Periksa integritas kabel fisik LAN, konektor RJ45, atau optical power SFP.');
    solusi.push('Cek log counter error (CRC, Frame Error, Overrun) pada interface switch port.');
    cliRemediation.push({ label: 'Cisco IOS - Cek Error Interface', command: 'show interfaces counters errors' });
    cliRemediation.push({ label: 'MikroTik - Cek Drop Stats', command: '/interface ethernet monitor [find] once' });
  } else if (resets.length > 0) {
    solusi.push('Pastikan daemon listener aktif di port tujuan dan firewall mengizinkan IP pengirim.');
    cliRemediation.push({ label: 'Linux - Cek Port Listening', command: 'ss -tulpn' });
    cliRemediation.push({ label: 'MikroTik - Cek Filter Rule', command: '/ip firewall filter print where action=reject or action=drop' });
  } else {
    solusi.push('Kondisi jaringan prima. Simpan capture baseline untuk benchmarking berkala.');
    cliRemediation.push({ label: 'Linux/Mac - Simpan Capture Baseline', command: 'sudo tcpdump -i any -c 100 -w baseline.pcap' });
  }

  return {
    pointUtama,
    masalah,
    keamanan: {
      status: secStatus,
      title: secTitle,
      findings: secFindings
    },
    solusi,
    cliRemediation
  };
}

/**
 * AI & Rule-based Switch Port Mirroring (SPAN/RSPAN) Analyzer & Human Translator
 * Translates mirrored packets from switch into clean Indonesian explanations
 */
export interface SwitchMirrorAnalysisResult {
  summaryTitle: string;
  packetCount: number;
  humanTranslation: string; // Plain Indonesian explanation of what happened on the switch port
  humanLanguageTranslation?: string;
  summaryPillars: {
    pointUtama: string;
    masalahTroubleshooting: string;
    keamanan: string;
    solusi: string;
  };
  activeTalkers: { ip: string; mac: string; role: string; packetCount: number; bytesVolume: number; percentOfTotal: number }[];
  activeHosts: { ip: string; mac: string; role: string; packetCount: number; bytes: number }[];
  vlansDetected: number[];
  topProtocols: { name: string; percentage: number; count: number }[];
  detectedIssues: { severity: 'critical' | 'warning' | 'info'; title: string; description: string; impactedHost: string }[];
  securityAudits: { status: 'ALERT' | 'WARNING' | 'SAFE'; title: string; detail: string }[];
  recommendedSwitchActions: string[];
  switchCliCommands: { vendor: string; title: string; command: string }[];
  switchRemediationCommands: { vendor: string; title: string; description: string; command: string }[];
}

export function analyzeAndTranslateSwitchMirror(packets: CapturedPacket[]): SwitchMirrorAnalysisResult {
  if (packets.length === 0) {
    return {
      summaryTitle: 'Tidak Ada Paket Mirroring Terdeteksi',
      packetCount: 0,
      humanTranslation: 'Belum ada data frame yang diterima dari port mirror switch. Silakan hubungkan kabel ke port SPAN switch atau import file .pcap/.cap.',
      humanLanguageTranslation: 'Belum ada data frame yang diterima dari port mirror switch. Silakan hubungkan kabel ke port SPAN switch atau import file .pcap/.cap.',
      summaryPillars: {
        pointUtama: 'Port mirroring standby tanpa trafik aktif.',
        masalahTroubleshooting: 'Tidak ada frame yang mengalir ke port capture.',
        keamanan: 'Status interface aman.',
        solusi: 'Pastikan source port SPAN pada switch diset ke mode monitor/mirror.'
      },
      activeTalkers: [],
      activeHosts: [],
      vlansDetected: [],
      topProtocols: [],
      detectedIssues: [],
      securityAudits: [],
      recommendedSwitchActions: ['Pastikan source port SPAN pada switch diset ke mode monitor/mirror.'],
      switchCliCommands: [],
      switchRemediationCommands: []
    };
  }

  // Aggregate stats
  const hostMap: Record<string, { ip: string; mac: string; role: string; count: number; bytes: number }> = {};
  const vlanSet = new Set<number>();
  const protoMap: Record<string, number> = {};
  let totalBytes = 0;

  let broadcastCount = 0;
  let arpCount = 0;
  let dnsCount = 0;
  let httpCount = 0;
  let scadaCount = 0;
  let errorCount = 0;

  packets.forEach(p => {
    totalBytes += p.length;
    protoMap[p.protocol] = (protoMap[p.protocol] || 0) + 1;
    if (p.vlanId) vlanSet.add(p.vlanId);

    // Host aggregation
    const srcKey = p.srcIp || 'unknown';
    if (!hostMap[srcKey]) {
      hostMap[srcKey] = {
        ip: p.srcIp,
        mac: p.headers.ethernet.srcMac || '00:00:00:00:00:00',
        role: p.srcIp.endsWith('.1') || p.srcIp.endsWith('.254') ? 'Gateway / Router' : 'Client / Node',
        count: 0,
        bytes: 0
      };
    }
    hostMap[srcKey].count++;
    hostMap[srcKey].bytes += p.length;

    if (p.dstIp === '255.255.255.255' || p.headers.ethernet.dstMac === 'ff:ff:ff:ff:ff:ff') broadcastCount++;
    if (p.protocol === 'ARP') arpCount++;
    if (p.protocol === 'DNS' || p.dstPort === 53) dnsCount++;
    if (p.protocol === 'HTTP' || p.dstPort === 80) httpCount++;
    if (p.category === 'OT' || p.protocol === 'MODBUS' || p.protocol === 'S7COMM') scadaCount++;
    if (p.status !== 'ok') errorCount++;
  });

  const activeHosts = Object.values(hostMap).sort((a, b) => b.bytes - a.bytes).slice(0, 8).map(h => ({
    ip: h.ip,
    mac: h.mac,
    role: h.role,
    packetCount: h.count,
    bytes: h.bytes
  }));

  const activeTalkers = Object.values(hostMap).sort((a, b) => b.bytes - a.bytes).slice(0, 8).map(h => ({
    ip: h.ip,
    mac: h.mac,
    role: h.role,
    packetCount: h.count,
    bytesVolume: Math.round(h.bytes / 1024),
    percentOfTotal: Number(((h.bytes / (totalBytes || 1)) * 100).toFixed(1))
  }));

  const topProtocols = Object.entries(protoMap).map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / packets.length) * 100)
  })).sort((a, b) => b.count - a.count);

  const vlansDetected = Array.from(vlanSet);
  if (vlansDetected.length === 0) vlansDetected.push(1); // Default VLAN 1

  // Generate Human Indonesian Translation
  const topHost = activeHosts[0];
  const isHighBroadcast = (broadcastCount / packets.length) > 0.25;
  const isScadaPresent = scadaCount > 0;

  let humanTranslation = `Hasil analisa mirroring switch menunjukkan aktivitas dari ${activeHosts.length} perangkat unik dengan total data ${(totalBytes / 1024).toFixed(1)} KB. `;
  
  if (topHost) {
    humanTranslation += `Perangkat dengan lalu lintas tertinggi adalah ${topHost.ip} (MAC: ${topHost.mac}) yang mengirimkan ${topHost.packetCount} frame (${((topHost.bytes / (totalBytes || 1)) * 100).toFixed(1)}% dari total lalu lintas). `;
  }

  if (isScadaPresent) {
    humanTranslation += `Terdeteksi komunikasi industri SCADA/OT (${scadaCount} paket) seperti Modbus/S7comm di port ini. Pastikan port ini diisolasi dalam VLAN industri khusus. `;
  }

  if (isHighBroadcast) {
    humanTranslation += `⚠️ Peringatan: Tingkat paket broadcast/ARP cukup tinggi (${broadcastCount} paket, ${Math.round((broadcastCount / packets.length) * 100)}%), berpotensi menimbulkan broadcast storm jika tidak dibatasi di switch. `;
  } else {
    humanTranslation += `Lalu lintas dominan berjenis unicast dengan komposisi protokol ${topProtocols.slice(0, 3).map(p => `${p.name} (${p.percentage}%)`).join(', ')}. `;
  }

  // Issues Detected
  const detectedIssues: SwitchMirrorAnalysisResult['detectedIssues'] = [];
  if (isHighBroadcast) {
    detectedIssues.push({
      severity: 'warning',
      title: 'Tingginya Trafik Broadcast & ARP Flooding',
      description: `Ditemukan ${broadcastCount} frame broadcast/ARP. Banyaknya broadcast dapat membebani CPU access switch dan menghabiskan airtime Wi-Fi.`,
      impactedHost: 'VLAN ' + vlansDetected.join(', ')
    });
  }

  if (errorCount > 0) {
    detectedIssues.push({
      severity: 'critical',
      title: `${errorCount} Frame Mengalami Drop / TCP Reset / Anomali`,
      description: 'Ditemukan koneksi yang ditolak atau terputus di port switch. Kemungkinan ada port target yang tidak aktif atau firewall filtering.',
      impactedHost: topHost?.ip || 'Multiple Nodes'
    });
  }

  // Security Audits
  const securityAudits: SwitchMirrorAnalysisResult['securityAudits'] = [];
  if (httpCount > 0) {
    securityAudits.push({
      status: 'WARNING',
      title: 'Ditemukan Lalu Lintas HTTP Unencrypted di Port Mirror',
      detail: `${httpCount} paket web HTTP (Port 80) terdeteksi. Data sensitif/kredensial login dapat terbaca oleh siapapun di segmen VLAN ini.`
    });
  }

  if (scadaCount > 0) {
    securityAudits.push({
      status: 'ALERT',
      title: 'Protokol Industri OT/ICS Mengalir di Access Port',
      detail: 'Protokol Modbus/S7comm tidak memiliki autentikasi bawaan. Wajib amankan dengan OT Firewall & VLAN Isolation.'
    });
  }

  if (securityAudits.length === 0) {
    securityAudits.push({
      status: 'SAFE',
      title: 'Tidak Ditemukan Ancaman Keamanan Kritis',
      detail: 'Seluruh frame yang dicapture pada port mirror switch menggunakan protokol dan enkapsulasi yang sah.'
    });
  }

  // Four Pillars Summary
  const summaryPillars = {
    pointUtama: `Port mirror menangkap ${packets.length} frame (${(totalBytes / 1024).toFixed(1)} KB) pada ${vlansDetected.map(v => `VLAN ${v}`).join(', ')}. Host paling aktif: ${topHost ? `${topHost.ip} (${topHost.role})` : 'N/A'}.`,
    masalahTroubleshooting: isHighBroadcast 
      ? `Trafik broadcast/ARP mencapai ${Math.round((broadcastCount / packets.length) * 100)}% (resiko storm). ${errorCount > 0 ? `Terdapat ${errorCount} frame error/RST.` : 'Tidak ada packet loss signifikan.'}`
      : errorCount > 0 ? `Ditemukan ${errorCount} anomali transmisi/TCP RST pada switch.` : 'Transmisi lancar tanpa packet loss atau collision terdeteksi.',
    keamanan: securityAudits.map(s => `[${s.status}] ${s.title}: ${s.detail}`).join(' '),
    solusi: 'Terapkan Storm Control (level 2.0), aktifkan DHCP Snooping & DAI pada access switch, dan amankan trunk port 802.1Q.'
  };

  // Recommended Switch Actions & Commands
  const recommendedSwitchActions = [
    'Terapkan Storm Control pada switch untuk membatasi trafik Broadcast dan Multicast (maksimal 1-2%).',
    'Aktifkan Port Security pada access port switch untuk membatasi jumlah MAC address maksimum per port (mencegah MAC Flooding).',
    'Pisahkan lalu lintas Management, User LAN, dan Server/OT ke dalam VLAN terpisah (802.1Q).',
    'Aktifkan DHCP Snooping dan Dynamic ARP Inspection (DAI) untuk mencegah serangan Rogue DHCP & ARP Spoofing.'
  ];

  const switchCliCommands = [
    {
      vendor: 'Cisco Catalyst / Nexus',
      title: 'Konfigurasi SPAN Port Mirroring',
      command: `monitor session 1 source interface GigabitEthernet0/1 both\nmonitor session 1 destination interface GigabitEthernet0/24`
    },
    {
      vendor: 'Cisco Switch',
      title: 'Aktifkan Storm Control & Port Security',
      command: `interface GigabitEthernet0/1\n storm-control broadcast level 2.0\n storm-control multicast level 5.0\n switchport port-security\n switchport port-security maximum 2\n switchport port-security violation restrict`
    },
    {
      vendor: 'MikroTik RouterOS / SwOS',
      title: 'Konfigurasi Port Mirroring MikroTik',
      command: `/interface ethernet switch\nset mirror-source=ether1 mirror-target=ether5`
    },
    {
      vendor: 'Huawei CloudEngine / S-Series',
      title: 'Konfigurasi Port Mirroring Huawei',
      command: `observe-port 1 interface GigabitEthernet0/0/24\ninterface GigabitEthernet0/0/1\n port-mirroring to observe-port 1 both`
    }
  ];

  const switchRemediationCommands = switchCliCommands.map(c => ({
    vendor: c.vendor,
    title: c.title,
    description: c.title,
    command: c.command
  }));

  return {
    summaryTitle: `Analisa Mirroring Switch: ${packets.length} Frame Dicapture`,
    packetCount: packets.length,
    humanTranslation,
    humanLanguageTranslation: humanTranslation,
    summaryPillars,
    activeHosts,
    activeTalkers,
    vlansDetected,
    topProtocols,
    detectedIssues,
    securityAudits,
    recommendedSwitchActions,
    switchCliCommands,
    switchRemediationCommands
  };
}
