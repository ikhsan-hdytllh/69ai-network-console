// Service to generate 100% dynamic, context-driven AI prompts for Traffic Generator & Analyzer
// Eliminates all hardcoded strings, static templates, and generic boilerplates.

import { 
  CapturedPacket, 
  ThroughputBenchmarkResult, 
  TrafficAnalysisSummary,
  PacketProtocolDef
} from './trafficGeneratorService';
import { SystemNetworkInterface } from '../types';
import { generatePacketDiagnostic } from './packetDiagnosticsService';

export interface TrafficAiPromptContext {
  activeTab: 'analyzer' | 'switch_mirror' | 'capacity' | 'dummy_gen' | 'tcp_replay';
  selectedInterface: SystemNetworkInterface | null;
  // Analyzer Context
  targetHost: string;
  trafficTestMode: string;
  customPort: number;
  packetCount: number;
  packetIntervalMs: number;
  payloadSizeBytes: number;
  analysisSummary: TrafficAnalysisSummary | null;
  capturedPackets: CapturedPacket[];
  selectedPacket: CapturedPacket | null;
  // Switch Mirror Context
  switchMirrorPackets: CapturedPacket[];
  selectedMirrorPacket: CapturedPacket | null;
  isSpanCapturing: boolean;
  spanFilterDirection: 'all' | 'in' | 'out';
  spanDetailSubTab: 'all' | 'mac_header' | 'diagnosa_l2_l7' | 'payload_hex';
  // Dummy Generator Context
  selectedCategories: { IT: boolean; IoT: boolean; OT: boolean };
  selectedProtocolIds: string[];
  protocolCatalog: PacketProtocolDef[];
  dummyPacketRate: number;
  dummySourceSubnet: string;
  dummyDestSubnet: string;
  isDummyGenerating: boolean;
  generatedCount: number;
  dummyCapturedPackets: CapturedPacket[];
  customSrcIp: string;
  customSrcMac: string;
  isManualSrcOverride: boolean;
  // TCP Replay Context
  replaySourceType: 'dummy' | 'pcap_file' | 'live_capture';
  replayDummyListType: 'ot' | 'it' | 'iot' | 'all' | 'custom_selected';
  replayTargetOs: 'mac' | 'windows' | 'linux' | 'android';
  scannedOsName: string;
  uploadedFileName?: string;
  uploadedFileSizeKb?: number;
  uploadedFilePacketsCount?: number;
  replayLoopCount: number;
  replayMbps: number;
  cliCommand: string;
  isInlineReplaying: boolean;
  inlineFramesSent: number;
  inlineElapsedSec: number;
  inlineCurrentMbps: number;
  inlineCurrentPps: number;
  inlineRecentLogs: string[];
  // Capacity Context
  selectedProfileId: string;
  customSpeedUnit: 'mbps' | 'gbps';
  customSpeedValue: number;
  stressDurationSec: number;
  stressStreams: number;
  stressTestType: 'throughput' | 'jitter' | 'jumbo_frame';
  stressBenchmarkResult: ThroughputBenchmarkResult | null;
  isStressRunning: boolean;
  stressProgressSec: number;
  currentSpeedMbps: number;
  currentPps: number;
  currentJitterMs: number;
  stressTransferredMB: number;
}

export interface GeneratedAiPromptResult {
  prompt: string;
  contextPayload: Record<string, any>;
}

export function buildDynamicTrafficAiPrompt(ctx: TrafficAiPromptContext): GeneratedAiPromptResult {
  const currentIface = ctx.selectedInterface?.name || 'NIC';
  const ifaceIp = ctx.selectedInterface?.ipv4 || 'Belum Ada IP (DHCP/Unconfigured)';
  const ifaceMac = ctx.selectedInterface?.mac || 'N/A';
  const ifaceHw = ctx.selectedInterface?.hardwarePort || ctx.selectedInterface?.typeLabel || currentIface;
  const ifaceSpeed = ctx.selectedInterface?.speedHint || '1 Gbps';
  const ifaceStatus = ctx.selectedInterface?.status || 'UP';

  let prompt = '';
  const contextPayload: Record<string, any> = {
    activeTab: ctx.activeTab,
    interface: currentIface,
    interfaceHw: ifaceHw,
    interfaceIp: ifaceIp,
    interfaceMac: ifaceMac,
    interfaceSpeed: ifaceSpeed,
    interfaceStatus: ifaceStatus,
    timestamp: new Date().toISOString()
  };

  switch (ctx.activeTab) {
    case 'analyzer': {
      // 1. ANALYZER TAB: Real-time traffic analysis & packet inspection
      if (ctx.selectedPacket) {
        // Detailed analysis of user's actively selected frame
        const pkt = ctx.selectedPacket;
        const pktDiag = generatePacketDiagnostic(pkt);
        contextPayload.selectedPacketId = pkt.id;
        contextPayload.protocol = pkt.protocol;
        contextPayload.status = pkt.status;
        contextPayload.category = pkt.category;
        contextPayload.rootCause = pktDiag.rootCause.primaryCause;
        contextPayload.issueHeadline = pktDiag.issueSummary.headline;

        prompt = `Mohon analisa teknis mendalam untuk Frame #${pkt.id} yang tertangkap pada interface ${currentIface} (${ifaceHw}):\n` +
          `• Protokol: ${pkt.protocol} [Kategori: ${pkt.category || 'IT'}, Wire Length: ${pkt.length} bytes]\n` +
          `• Source Host: ${pkt.srcIp}:${pkt.srcPort} (MAC: ${pkt.srcMac || 'N/A'})\n` +
          `• Destination Host: ${pkt.dstIp}:${pkt.dstPort} (MAC: ${pkt.dstMac || 'N/A'})\n` +
          `• Status Frame: ${pkt.status.toUpperCase()} | Arah: ${pkt.direction === 'in' ? 'IN (Ingress)' : 'OUT (Egress)'}\n` +
          `• Ringkasan Frame: "${pkt.info}"\n` +
          (pkt.deltaMs ? `• Delta Time / Inter-frame Gap: ${pkt.deltaMs} ms\n` : '') +
          `• Diagnosa Terdeteksi: ${pktDiag.issueSummary.headline} (Tingkat Dampak: ${pktDiag.issueSummary.impactLevel})\n` +
          `• Akar Masalah Teridentifikasi: ${pktDiag.rootCause.primaryCause} [Layer Terdampak: ${pktDiag.rootCause.affectedLayer}]\n` +
          (pktDiag.solution.recommendedSteps.length > 0 ? `• Langkah Solusi: ${pktDiag.solution.recommendedSteps.join('; ')}\n` : '') +
          `\nMohon berikan verifikasi menyeluruh:\n` +
          `1. Analisa apakah status ${pkt.status.toUpperCase()} ini disebabkan oleh firewall filter (ACL), MTU fragmentation, handshake rejection (TCP RST), atau kegagalan routing.\n` +
          `2. Berikan command CLI perbaikan dan verifikasi spesifik untuk perangkat switch/router utama (Cisco IOS-XE, MikroTik RouterOS, Fortinet FortiOS).`;
      } else if (ctx.analysisSummary) {
        // Summary of completed traffic probe test
        const s = ctx.analysisSummary;
        contextPayload.totalSent = s.totalSent;
        contextPayload.totalReceived = s.totalReceived;
        contextPayload.packetLossPercent = s.packetLossPercent;
        contextPayload.minLatencyMs = s.minLatencyMs;
        contextPayload.avgLatencyMs = s.avgLatencyMs;
        contextPayload.maxLatencyMs = s.maxLatencyMs;
        contextPayload.jitterMs = s.jitterMs;
        contextPayload.anomaliesDetected = s.anomaliesDetected;
        contextPayload.rootCause = s.rootCauseAnalysis;

        prompt = `Mohon evaluasi performa menyeluruh dari hasil traffic probe jaringan berikut:\n` +
          `• Interface Pengirim: ${currentIface} (${ifaceHw} - IP: ${ifaceIp}, MAC: ${ifaceMac}, Status: ${ifaceStatus})\n` +
          `• Target Host Tujuan: ${ctx.targetHost}\n` +
          `• Mode Pengujian: ${ctx.trafficTestMode.toUpperCase()} (Port ${ctx.customPort})\n` +
          `• Paket Terkirim / Diterima: ${s.totalSent} / ${s.totalReceived} frame (${s.packetLossPercent}% Packet Loss)\n` +
          `• Metrik RTT Latency: Min ${s.minLatencyMs}ms, Rata-rata ${s.avgLatencyMs}ms, Max ${s.maxLatencyMs}ms, Jitter ${s.jitterMs}ms\n` +
          `• Anomali Terdeteksi: ${s.anomaliesDetected.length > 0 ? s.anomaliesDetected.join(', ') : 'Tidak ada anomali kritis terdeteksi'}\n` +
          `• Indikasi Akar Masalah: ${s.rootCauseAnalysis}\n\n` +
          `Mohon berikan rekomendasi teknis:\n` +
          `1. Analisa korelasi antara ${s.packetLossPercent}% packet loss dan variasi jitter ${s.jitterMs}ms terhadap stabilitas link fisik dan buffer switch.\n` +
          `2. Command CLI diagnosa interface counters (CRC errors, input drops, collision) pada switch hop pertama untuk memastikan kesehatan link.`;
      } else if (ctx.capturedPackets.length > 0) {
        // Real breakdown of currently captured frames in the table
        const protoCounts: Record<string, number> = {};
        let dropsCount = 0;
        let rstCount = 0;
        let timeoutCount = 0;
        const uniqueSources = new Set<string>();
        const uniqueDests = new Set<string>();

        ctx.capturedPackets.forEach((p) => {
          protoCounts[p.protocol] = (protoCounts[p.protocol] || 0) + 1;
          if (p.status === 'dropped') dropsCount++;
          if (p.status === 'rst') rstCount++;
          if (p.status === 'timeout') timeoutCount++;
          if (p.srcIp) uniqueSources.add(p.srcIp);
          if (p.dstIp) uniqueDests.add(p.dstIp);
        });

        const protoSummary = Object.entries(protoCounts)
          .map(([proto, count]) => `${proto}: ${count}`)
          .join(', ');

        contextPayload.capturedPacketsCount = ctx.capturedPackets.length;
        contextPayload.dropsCount = dropsCount;
        contextPayload.rstCount = rstCount;
        contextPayload.timeoutCount = timeoutCount;
        contextPayload.protocols = Object.keys(protoCounts);

        prompt = `Mohon analisa capture traffic live pada interface ${currentIface} (${ifaceHw} - IP: ${ifaceIp}):\n` +
          `• Total Frame Tertangkap: ${ctx.capturedPackets.length} frame\n` +
          `• Komposisi Protokol: ${protoSummary}\n` +
          `• Statistik Frame Anomali: ${dropsCount} Dropped, ${timeoutCount} Timeout, ${rstCount} TCP RST\n` +
          `• Source Host Aktif: ${Array.from(uniqueSources).slice(0, 6).join(', ') || 'N/A'}\n` +
          `• Destination Host Aktif: ${Array.from(uniqueDests).slice(0, 6).join(', ') || 'N/A'}\n\n` +
          `Berdasarkan komposisi traffic dan anomali di atas, apakah ada indikasi port scan, flood, atau packet loss di jalur Layer-2/Layer-3? Berikan filter Wireshark/tcpdump yang disarankan untuk mengisolasi traffic bermasalah.`;
      } else {
        // Configured probe parameters prior to execution
        prompt = `Mohon panduan teknis persiapan traffic probe jaringan:\n` +
          `• Interface NIC Sumber: ${currentIface} (${ifaceHw} - IP: ${ifaceIp}, MAC: ${ifaceMac})\n` +
          `• Target Host Tujuan: ${ctx.targetHost}\n` +
          `• Protokol & Port Uji: ${ctx.trafficTestMode.toUpperCase()} pada Port ${ctx.customPort}\n` +
          `• Konfigurasi Probe: ${ctx.packetCount} paket, ukuran payload ${ctx.payloadSizeBytes} bytes, interval ${ctx.packetIntervalMs} ms\n\n` +
          `Jelaskan potensi hambatan teknis (misalnya MTU black hole, ICMP rate limiting pada target, firewall stateful inspection, atau asymmetric routing) yang perlu diantisipasi untuk target host ${ctx.targetHost}.`;
      }
      break;
    }

    case 'switch_mirror': {
      // 2. SWITCH PORT MIRRORING (SPAN/RSPAN) TAB
      const inCount = ctx.switchMirrorPackets.filter(p => p.direction === 'in').length;
      const outCount = ctx.switchMirrorPackets.filter(p => p.direction === 'out').length;
      const mirrorProtos = Array.from(new Set(ctx.switchMirrorPackets.map(p => p.protocol))).slice(0, 6).join(', ');
      const vlanTags = Array.from(new Set(ctx.switchMirrorPackets.map(p => p.vlanId).filter(Boolean)));

      contextPayload.totalMirroredFrames = ctx.switchMirrorPackets.length;
      contextPayload.ingressFrames = inCount;
      contextPayload.egressFrames = outCount;
      contextPayload.isSpanCapturing = ctx.isSpanCapturing;
      contextPayload.spanFilterDirection = ctx.spanFilterDirection;

      if (ctx.selectedMirrorPacket) {
        const mp = ctx.selectedMirrorPacket;
        const mpDiag = generatePacketDiagnostic(mp);
        contextPayload.selectedMirrorFrameId = mp.id;
        contextPayload.selectedMirrorProtocol = mp.protocol;
        contextPayload.direction = mp.direction;

        prompt = `Mohon analisa mendalam frame port mirroring (SPAN) Frame #${mp.id} yang tertangkap via NIC ${currentIface} (${ifaceHw}):\n` +
          `• Arah Traffic: ${mp.direction === 'in' ? 'IN (Ingress Masuk ke Port)' : 'OUT (Egress Keluar dari Port)'}\n` +
          `• 802.1Q VLAN Tag: ${mp.vlanId ? `VLAN ${mp.vlanId}` : 'Untagged (Native VLAN)'}\n` +
          `• Protokol: ${mp.protocol} [Panjang: ${mp.length} bytes]\n` +
          `• Source Hardware / IP: MAC ${mp.srcMac || 'N/A'} (${mp.srcIp || 'Non-IP L2'}:${mp.srcPort || ''})\n` +
          `• Destination Hardware / IP: MAC ${mp.dstMac || 'N/A'} (${mp.dstIp || 'Non-IP L2'}:${mp.dstPort || ''})\n` +
          `• Info Singkat Frame: "${mp.info}"\n` +
          `• Status Frame: ${mp.status.toUpperCase()}\n` +
          `• Diagnosa L2-L7: ${mpDiag.issueSummary.headline}\n` +
          `• Temuan Root Cause: ${mpDiag.rootCause.primaryCause}\n\n` +
          `Mohon berikan analisa:\n` +
          `1. Apakah frame ini mencerminkan traffic normal atau terdapat anomali switching (seperti MAC spoofing, loop duplikasi, atau VLAN leaking)?\n` +
          `2. Berikan command CLI konfigurasi SPAN monitor session dan filter VLAN pada switch (Cisco, MikroTik, Huawei) agar port analyzer tidak mengalami oversubscription drop.`;
      } else {
        prompt = `Mohon evaluasi hasil rekaman Switch Port Mirroring (SPAN/RSPAN) pada interface ${currentIface} (${ifaceHw}):\n` +
          `• Status Capture: ${ctx.isSpanCapturing ? 'Sedang Aktif Merekam (Listening Wire)' : 'Standby / Stopped'}\n` +
          `• Total Frame Tertangkap: ${ctx.switchMirrorPackets.length} frame\n` +
          `• Rasio Arah Traffic: ${inCount} Frame Ingress (IN), ${outCount} Frame Egress (OUT)\n` +
          `• Filter Arah Aktif: ${ctx.spanFilterDirection.toUpperCase()}\n` +
          `• Protokol Teramati di Wire: ${mirrorProtos || 'Belum ada traffic tertangkap'}\n` +
          `• VLAN Tag Terdeteksi: ${vlanTags.length > 0 ? vlanTags.map(v => `VLAN ${v}`).join(', ') : 'Untagged / Native'}\n\n` +
          `Mohon berikan evaluasi arsitektur:\n` +
          `1. Apakah perbandingan traffic IN (${inCount}) vs OUT (${outCount}) mengindikasikan asymmetric flow atau bottleneck pada uplink switch?\n` +
          `2. Bagaimana memastikan switchport analyzer menerima seluruh frame broadcast, multicast, dan error frame (CRC/Runt) tanpa di-drop oleh ASIC switch?`;
      }
      break;
    }

    case 'dummy_gen': {
      // 3. DUMMY TRAFFIC & PROTOCOL SIMULATOR (OT / IT / IoT)
      const activeCats = Object.entries(ctx.selectedCategories)
        .filter(([_, active]) => active)
        .map(([cat]) => cat)
        .join(', ');

      const selectedCatalogItems = ctx.selectedProtocolIds.map((id) => {
        const p = ctx.protocolCatalog.find((item) => item.id === id);
        return p ? `${p.name} (${p.transport} ${p.defaultPort}) [${p.category}${p.brand ? ` - ${p.brand}` : ''}]` : id;
      });

      contextPayload.selectedCategories = ctx.selectedCategories;
      contextPayload.selectedProtocolCount = ctx.selectedProtocolIds.length;
      contextPayload.dummyPacketRate = ctx.dummyPacketRate;
      contextPayload.dummySourceSubnet = ctx.dummySourceSubnet || ifaceIp;
      contextPayload.dummyDestSubnet = ctx.dummyDestSubnet;
      contextPayload.isDummyGenerating = ctx.isDummyGenerating;
      contextPayload.generatedCount = ctx.generatedCount;

      prompt = `Mohon analisa profil traffic simulator & protocol generator (IT, IoT, OT Industrial):\n` +
        `• Interface Transmisi: ${currentIface} (${ifaceHw} - MAC: ${ctx.customSrcMac || ifaceMac})\n` +
        `• Source Address: ${ctx.customSrcIp || ifaceIp} (Subnet Sumber: ${ctx.dummySourceSubnet || 'Default Interface'})\n` +
        `• Destination Target: ${ctx.dummyDestSubnet || '255.255.255.255 (Broadcast/Subnet)'}\n` +
        `• Kategori Aktif: ${activeCats || 'None'}\n` +
        `• Laju Transmisi: ${ctx.dummyPacketRate} PPS (Packets Per Second)\n` +
        `• Status Generator: ${ctx.isDummyGenerating ? 'Sedang Mentransmisikan Paket Aktif' : 'Standby / Siap'}\n` +
        `• Total Paket Diinjeksi: ${ctx.generatedCount} frame\n` +
        `• Protokol Terpilih (${ctx.selectedProtocolIds.length} protokol):\n` +
        (selectedCatalogItems.length > 0 ? selectedCatalogItems.map(item => `  - ${item}`).join('\n') : '  (Belum ada protokol yang dipilih)\n') +
        `\nMohon berikan analisa keamanan & arsitektur jaringan:\n` +
        `1. Rekomendasi Firewall Policy & Deep Packet Inspection (DPI) signatures untuk mengontrol dan mengamankan protokol-protokol di atas.\n` +
        `2. Pedoman segmentasi VLAN berdasarkan Purdue Model (IEC 62443) antara traffic OT SCADA PLC (Modbus/S7/DNP3/Profinet), IT Enterprise, dan IoT Sensors.\n` +
        `3. Dampak terhadap CPU buffer switch dan latency jika traffic diinjeksi secara berkelanjutan pada ${ctx.dummyPacketRate} PPS.`;
      break;
    }

    case 'tcp_replay': {
      // 4. INLINE TCP REPLAY TAB
      let sourceLabel = '';
      if (ctx.replaySourceType === 'dummy') {
        sourceLabel = `Katalog Protokol Dummy (${ctx.replayDummyListType.toUpperCase()})`;
      } else if (ctx.replaySourceType === 'pcap_file') {
        sourceLabel = `File PCAP: ${ctx.uploadedFileName || 'custom.pcap'} (${(ctx.uploadedFileSizeKb || 0).toFixed(1)} KB, ${ctx.uploadedFilePacketsCount || 0} frame)`;
      } else {
        sourceLabel = `Live Session Capture (${ctx.capturedPackets.length} frame)`;
      }

      contextPayload.replaySourceType = ctx.replaySourceType;
      contextPayload.replayTargetOs = ctx.replayTargetOs;
      contextPayload.replayLoopCount = ctx.replayLoopCount;
      contextPayload.replayMbps = ctx.replayMbps;
      contextPayload.cliCommand = ctx.cliCommand;
      contextPayload.isInlineReplaying = ctx.isInlineReplaying;
      contextPayload.inlineFramesSent = ctx.inlineFramesSent;

      prompt = `Mohon evaluasi teknis konfigurasi Layer-2 Packet Replay Engine (tcpreplay):\n` +
        `• Target Platform OS: ${ctx.replayTargetOs.toUpperCase()} (Host Terdeteksi: ${ctx.scannedOsName})\n` +
        `• Interface NIC Fisik: ${currentIface} (${ifaceHw} - MAC: ${ifaceMac}, IP: ${ifaceIp})\n` +
        `• Sumber Paket: ${sourceLabel}\n` +
        `• Parameter Transmisi: Loop = ${ctx.replayLoopCount === 0 ? 'Infinite (Loop 0)' : `${ctx.replayLoopCount}x`}, Kecepatan = ${ctx.replayMbps} Mbps\n` +
        `• Perintah CLI yang Diformulasikan: \`${ctx.cliCommand}\`\n` +
        `• Status Eksekusi: ${ctx.isInlineReplaying ? 'Sedang Aktif Mentransmisikan Paket ke Wire' : 'Siap / Selesai'}\n` +
        `• Telemetri Eksekusi: ${ctx.inlineFramesSent} frame terkirim dalam ${ctx.inlineElapsedSec}s (${ctx.inlineCurrentMbps} Mbps, ${ctx.inlineCurrentPps} PPS)\n\n` +
        `Mohon berikan verifikasi teknis:\n` +
        `1. Apakah permission raw socket (BPF pada macOS, Npcap driver pada Windows, AF_PACKET pada Linux, Termux root su pada Android) sudah tepat untuk interface ${currentIface}?\n` +
        `2. Bagaimana mencegah risiko broadcast storm, MAC table flapping, atau port-security error-disable pada switch tujuan saat menginjeksi paket pada ${ctx.replayMbps} Mbps?\n` +
        `3. Rekomendasi filter Wireshark dan monitor session untuk memverifikasi frame di sisi port penerima.`;
      break;
    }

    case 'capacity': {
      // 5. CAPACITY & THROUGHPUT STRESS BENCHMARK TAB
      const targetSpeedLabel = ctx.selectedProfileId.toUpperCase();
      contextPayload.selectedProfileId = ctx.selectedProfileId;
      contextPayload.stressDurationSec = ctx.stressDurationSec;
      contextPayload.stressStreams = ctx.stressStreams;
      contextPayload.stressTestType = ctx.stressTestType;

      if (ctx.stressBenchmarkResult) {
        const res = ctx.stressBenchmarkResult;
        contextPayload.achievedBitrateMbps = res.achievedBitrateMbps;
        contextPayload.efficiencyPercent = res.efficiencyPercent;
        contextPayload.dropRatePercent = res.dropRatePercent;
        contextPayload.portVerdict = res.portVerdict;
        contextPayload.avgLatencyMs = res.avgLatencyMs;
        contextPayload.jitterMs = res.jitterMs;

        prompt = `Mohon evaluasi komprehensif hasil Throughput & Bandwidth Capacity Stress Test (RFC 2544 Benchmark):\n` +
          `• Interface Diuji: ${currentIface} (${ifaceHw} - Speed: ${ifaceSpeed}, Status: ${ifaceStatus})\n` +
          `• Standar Target: ${res.targetSpeed} (${res.targetBitrateMbps} Mbps)\n` +
          `• Throughput Tercapai: ${res.achievedBitrateMbps} Mbps (Efisiensi Bandwidth: ${res.efficiencyPercent}%)\n` +
          `• Frame Drop Rate: ${res.dropRatePercent}%\n` +
          `• Latency RTT & Jitter: Rata-rata ${res.avgLatencyMs} ms, Jitter ${res.jitterMs} ms\n` +
          `• Vonis Hardware Port: "${res.portVerdict}"\n` +
          `• Temuan Diagnosa: ${res.verdictDescription}\n\n` +
          `Mohon berikan analisa perangkat keras & troubleshooting:\n` +
          `1. Berdasarkan capaian efisiensi ${res.efficiencyPercent}% dan frame drop ${res.dropRatePercent}%, apakah indikasi mengarah pada degradasi kabel/SFP optical loss, MTU mismatch, pause frames (802.3x Flow Control), atau saturasi ASIC switch buffer?\n` +
          `2. Berikan langkah verifikasi command CLI bertingkat untuk switch (Cisco, MikroTik, Aruba) guna memeriksa status link counters, pause frame, dan error discards.`;
      } else if (ctx.isStressRunning) {
        prompt = `Sedang berlangsung pengujian Stress Test Throughput Kapasitas Jaringan pada interface ${currentIface} (${ifaceHw}):\n` +
          `• Target Profil: ${targetSpeedLabel} (Tipe Uji: ${ctx.stressTestType.toUpperCase()}, ${ctx.stressStreams} Parallel Streams)\n` +
          `• Waktu Berjalan: ${ctx.stressProgressSec}s / ${ctx.stressDurationSec}s\n` +
          `• Real-time Bitrate: ${ctx.currentSpeedMbps} Mbps (${ctx.currentPps} PPS)\n` +
          `• Akumulasi Data: ${ctx.stressTransferredMB.toFixed(1)} MB tertransfer, Jitter: ${ctx.currentJitterMs.toFixed(2)} ms\n\n` +
          `Mohon analisa apakah pencapaian throughput real-time ${ctx.currentSpeedMbps} Mbps ini berada dalam batas normal untuk link interface ${ifaceSpeed}, dan jelaskan faktor yang dapat menyebabkan variasi kecepatan selama pengujian berlangsung.`;
      } else {
        prompt = `Mohon panduan teknis persiapan Stress Test Throughput Kapasitas Jaringan (RFC 2544):\n` +
          `• Interface NIC Diuji: ${currentIface} (${ifaceHw} - Speed: ${ifaceSpeed}, Status: ${ifaceStatus})\n` +
          `• Target Kecepatan: ${targetSpeedLabel} (Durasi: ${ctx.stressDurationSec}s, ${ctx.stressStreams} Streams, Mode: ${ctx.stressTestType.toUpperCase()})\n\n` +
          `Jelaskan faktor-faktor yang mempengaruhi pencapaian throughput maksimal teoritis (seperti Ethernet framing overhead, inter-frame gap 12 byte, TCP window scaling, dan interrupt moderation pada driver NIC) sebelum pengujian dijalankan.`;
      }
      break;
    }
  }

  return { prompt, contextPayload };
}
