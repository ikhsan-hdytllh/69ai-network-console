// Traffic Generator & Packet Engine Service
// Supports IT, IoT, and OT (ICS/SCADA) protocols, throughput stress testing, and PCAP format handling

export type TrafficCategory = 'IT' | 'IoT' | 'OT';

export interface PacketProtocolDef {
  id: string;
  name: string;
  category: TrafficCategory;
  transport: 'TCP' | 'UDP' | 'ICMP' | 'RAW';
  defaultPort: number;
  description: string;
  // Brand and Device Signatures for OT/IoT deep fingerprinting
  brand?: string;
  deviceType?: string;
  deviceModel?: string;
  vendorOUI?: string; // MAC vendor OUI e.g. 00:0e:8c for Siemens
  signatureDetails?: {
    vendorName: string;
    productFamily: string;
    firmwareVersion?: string;
    hardwareRevision?: string;
    rackSlot?: string;
    uniqueSignaturePattern: string; // e.g. "Siemens S7 Magic 0x32 Job ROSCTR", "CIP Vendor ID 0x0001 (Rockwell Automation)"
    dpiConfidence: '100% (Deterministic Signature)' | '95% (Protocol + OUI Match)' | '90% (Pattern Match)';
  };
  samplePayloadHex: string;
  samplePayloadAscii: string;
  dissectorFields: { [key: string]: string };
}

export interface CapturedPacket {
  id: number;
  timestamp: number; // relative time in seconds from start
  timeFormatted: string;
  timeOfDay?: string; // e.g. "14:25:30.124"
  deltaMs?: number; // delta time from previous frame in ms
  srcIp: string;
  srcPort: number;
  srcMac?: string;
  dstIp: string;
  dstPort: number;
  dstMac?: string;
  vlanId?: number; // 802.1Q VLAN Tag for switch port mirroring
  direction?: 'in' | 'out'; // IN (Ingress/Masuk) or OUT (Egress/Keluar)
  streamId?: string; // Conversation stream identifier
  protocol: string;
  category: TrafficCategory | 'DIAGNOSTIC';
  length: number; // bytes
  info: string;
  flags?: string;
  brand?: string;
  deviceType?: string;
  deviceModel?: string;
  vendorOUI?: string;
  signatureDetails?: {
    vendorName: string;
    productFamily: string;
    firmwareVersion?: string;
    hardwareRevision?: string;
    rackSlot?: string;
    uniqueSignaturePattern: string;
    dpiConfidence: string;
  };
  status: 'ok' | 'anomaly' | 'dropped' | 'timeout' | 'rst' | 'retransmission';
  headers: {
    frame: { number: number; length: number; time: string; deltaMs?: number };
    ethernet: { srcMac: string; dstMac: string; etherType: string; vlanId?: number };
    ip: { version: number; headerLength: number; ttl: number; tos: string; src: string; dst: string; checksum: string };
    transport: { protocol: string; srcPort: number; dstPort: number; flags?: string; seq?: number; ack?: number; window?: number; checksum: string };
    appLayer?: { name: string; details: Record<string, string> };
  };
  hexDump: string;
  asciiDump: string;
}

export interface FourPillarsSummary {
  pointUtama: string;
  masalah: string;
  masalahTroubleshooting?: string;
  keamanan: {
    status: 'SAFE' | 'WARNING' | 'ALERT';
    title: string;
    findings: string[];
  } | string;
  solusi: string[] | string;
  cliRemediation?: { label: string; command: string }[];
}

export interface TrafficAnalysisSummary {
  totalSent: number;
  totalReceived: number;
  totalBytes?: number;
  durationSec?: number;
  bandwidthKbps?: number;
  packetLossPercent: number;
  minLatencyMs: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  jitterMs: number;
  anomaliesDetected: string[];
  rootCauseAnalysis: string;
  recommendedActions: string[];
  cliRemediation: string[];
  fourPillarsSummary?: FourPillarsSummary;
  protocolsCount?: Record<string, number>;
  topConversations?: { src: string; dst: string; proto: string; count: number; bytes: number }[];
  sourceInterface?: string;
  sourceInterfaceDisplay?: string;
  sourceMac?: string;
  sourceIp?: string;
}

export interface ThroughputBenchmarkResult {
  targetSpeed: string; // e.g. "1 Gbps"
  targetBitrateMbps: number;
  achievedBitrateMbps: number; // Actual throughput in Mbps
  achievedBitrateGbps?: number; // Actual throughput in Gbps
  actualBytesTransferred?: number; // Total bytes transferred
  actualMBytesTransferred?: number; // Total Megabytes transferred
  efficiencyPercent: number; // Percentage of theoretical line speed achieved
  packetsSent: number;
  packetsDropped: number;
  dropRatePercent: number;
  avgLatencyMs: number;
  jitterMs: number;
  portVerdict: 'EXCELLENT' | 'GOOD' | 'DEGRADED_CABLE' | 'BOTTLENECK' | 'FAIL';
  cableQualityRating?: string; // e.g. "Cat5e / Cat6 Full Wire Speed (4-Pair Gigabit Verified)"
  verdictDescription: string;
  hardwareRecommendation: string;
  testedInterface?: string;
  testedInterfaceDisplay?: string;
  testedInterfaceMac?: string;
  testedInterfaceIp?: string;
  testDurationSec?: number;
  parallelStreams?: number;
  testType?: string;
  l1L2WireRateMbps?: number;
  l4PayloadRateMbps?: number;
}

// -------------------------------------------------------------
// PROTOCOL DEFINITIONS FOR IT, IOT, AND INDUSTRIAL OT WITH BRAND SIGNATURES
// -------------------------------------------------------------
export const PROTOCOL_CATALOG: PacketProtocolDef[] = [
  // --- IT PROTOCOLS ---
  {
    id: 'it_http',
    name: 'HTTP / Web REST API',
    category: 'IT',
    transport: 'TCP',
    defaultPort: 80,
    description: 'Hypertext Transfer Protocol - Web application traffic & JSON REST endpoints',
    brand: 'Standard / Open IETF',
    deviceType: 'Web Server / Gateway',
    deviceModel: 'Nginx / Apache / Envoy',
    vendorOUI: '52:54:00',
    signatureDetails: {
      vendorName: 'IETF RFC 2616',
      productFamily: 'Application Layer HTTP/1.1',
      firmwareVersion: '1.1',
      uniqueSignaturePattern: 'ASCII HTTP/1.1 Verb GET / Headers Host + User-Agent',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '474554202f6170692f76312f73746174757320485454502f312e310d0a486f73743a206170692e6e6574776f726b2e6c6f63616c0d0a557365722d4167656e743a20363941492d5465726d696e616c0d0a4163636570743a206170706c69636174696f6e2f6a736f6e0d0a0d0a',
    samplePayloadAscii: 'GET /api/v1/status HTTP/1.1\r\nHost: api.network.local\r\nUser-Agent: 69AI-Terminal\r\nAccept: application/json\r\n\r\n',
    dissectorFields: { Method: 'GET', URI: '/api/v1/status', Version: 'HTTP/1.1', ContentType: 'application/json' }
  },
  {
    id: 'it_https_tls',
    name: 'HTTPS / TLS 1.3 Handshake',
    category: 'IT',
    transport: 'TCP',
    defaultPort: 443,
    description: 'Encrypted Transport Layer Security Client Hello with SNI extension',
    brand: 'Standard / TLS WG',
    deviceType: 'Secure Server',
    deviceModel: 'OpenSSL / BoringSSL',
    vendorOUI: '52:54:00',
    signatureDetails: {
      vendorName: 'IETF RFC 8446',
      productFamily: 'Cryptographic Security TLS 1.3',
      firmwareVersion: 'TLSv1.3 (0x0304)',
      uniqueSignaturePattern: 'TLS Record 0x16 Handshake Client Hello 0x01 + SNI',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '16030100f8010000f4030368b1a8f9c1e4000020130113021303c02bc02fc02cc03000ff0100008b00000013001100000e7365727665722e6c6f63616c',
    samplePayloadAscii: '.....h.......+./.,.0.........server.local',
    dissectorFields: { 'TLS Record': 'Handshake (22)', 'Handshake Type': 'Client Hello (1)', 'SNI Hostname': 'server.network.local', 'Cipher Suites': 'TLS_AES_256_GCM_SHA384, TLS_CHACHA20' }
  },
  {
    id: 'it_dns',
    name: 'DNS Query (UDP)',
    category: 'IT',
    transport: 'UDP',
    defaultPort: 53,
    description: 'Domain Name System standard query for A & AAAA records',
    brand: 'Standard / BIND',
    deviceType: 'DNS Resolver',
    deviceModel: 'CoreDNS / Infoblox',
    vendorOUI: '00:04:96',
    signatureDetails: {
      vendorName: 'IETF RFC 1035',
      productFamily: 'Domain Name Resolver',
      uniqueSignaturePattern: 'Flags 0x0100 (Standard Query) + Type 0x0001 (A Host)',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '1a2b0100000100000000000006676f6f676c6503636f6d0000010001',
    samplePayloadAscii: '..+..........google.com.....',
    dissectorFields: { TransactionID: '0x1a2b', Flags: '0x0100 (Standard query)', Query: 'google.com', Type: 'A (Host Address)', Class: 'IN (0x0001)' }
  },
  {
    id: 'it_ssh',
    name: 'SSH-2.0 Secure Shell',
    category: 'IT',
    transport: 'TCP',
    defaultPort: 22,
    description: 'SSH protocol version exchange & cryptographic negotiation',
    brand: 'OpenSSH / Cisco IOS-XE',
    deviceType: 'Network Switch / Router SSH',
    deviceModel: 'Catalyst 9300 / CSR1000v',
    vendorOUI: '00:00:0c', // Cisco OUI
    signatureDetails: {
      vendorName: 'Cisco Systems / OpenSSH',
      productFamily: 'Cisco IOS-XE / OpenSSH Management',
      firmwareVersion: 'Cisco-1.25 / OpenSSH_9.3p1',
      uniqueSignaturePattern: 'Protocol Identification SSH-2.0 string banner',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '5353482d322e302d4f70656e5353485f392e337031205562756e74750d0a',
    samplePayloadAscii: 'SSH-2.0-OpenSSH_9.3p1 Ubuntu\r\n',
    dissectorFields: { Protocol: 'SSHv2', Identification: 'SSH-2.0-OpenSSH_9.3p1', KeyExchange: 'curve25519-sha256' }
  },
  {
    id: 'it_snmp',
    name: 'SNMP v2c / v3 GetRequest',
    category: 'IT',
    transport: 'UDP',
    defaultPort: 161,
    description: 'Simple Network Management Protocol - Querying ifInOctets & sysUpTime OIDs',
    brand: 'Cisco / Juniper / Mikrotik',
    deviceType: 'Core Switch / Enterprise Router',
    deviceModel: 'Catalyst 9500 / MX480 / CCR2004',
    vendorOUI: '00:00:0c',
    signatureDetails: {
      vendorName: 'Cisco Systems / Juniper Networks',
      productFamily: 'SNMP MIB-II Interface Query',
      firmwareVersion: 'v2c Community Auth',
      uniqueSignaturePattern: 'ASN.1 BER Sequence 0x30 + PDU 0xa0 GetRequest',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '302902010104067075626c6963a01c020473821a00020100020100300e300c06082b060102010101000500',
    samplePayloadAscii: '0)...public...s.........0.0...+.....',
    dissectorFields: { Version: 'SNMPv2c (1)', Community: 'public', 'PDU Type': 'GetRequest (0xa0)', OID: '1.3.6.1.2.1.1.1.0 (sysDescr)' }
  },
  {
    id: 'it_syslog',
    name: 'Syslog (RFC 5424 / RFC 3164)',
    category: 'IT',
    transport: 'UDP',
    defaultPort: 514,
    description: 'Network device facility log message (Link up/down, OSPF neighbor change)',
    brand: 'Cisco Systems',
    deviceType: 'Distribution Switch',
    deviceModel: 'Cisco Catalyst 3850',
    vendorOUI: '00:00:0c',
    signatureDetails: {
      vendorName: 'Cisco Systems, Inc.',
      productFamily: 'Cisco Catalyst IOS Logging Facility',
      uniqueSignaturePattern: 'PRI header <189> + Facility local7 + LINK-3-UPDOWN',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '3c3138393e3120323032362d30382d33305430393a31353a30305a20636973636f2d636f72652d3031204c494e4b2d332d5550444f574e202d20496e74657266616365204769676162697445746865726e6574302f312c206368616e67656420737461746520746f207570',
    samplePayloadAscii: '<189>1 2026-08-30T09:15:00Z cisco-core-01 LINK-3-UPDOWN - Interface GigabitEthernet0/1, changed state to up',
    dissectorFields: { Facility: 'local7 (23)', Severity: 'Notice (5)', Tag: 'LINK-3-UPDOWN', Message: 'Interface GigabitEthernet0/1 changed state to up' }
  },
  {
    id: 'it_bgp',
    name: 'BGP Open & KeepAlive Message',
    category: 'IT',
    transport: 'TCP',
    defaultPort: 179,
    description: 'Border Gateway Protocol Autonomous System peering packet',
    brand: 'Juniper Networks / Cisco',
    deviceType: 'BGP Border Router',
    deviceModel: 'Juniper MX204 / Cisco ASR 1001-X',
    vendorOUI: '00:05:85',
    signatureDetails: {
      vendorName: 'Juniper Networks / Cisco',
      productFamily: 'Junos OS / IOS-XR BGP Engine',
      uniqueSignaturePattern: 'BGP Marker 16x 0xFF + Type 0x01 (OPEN) + ASN 65001',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: 'ffffffffffffffffffffffffffffffff002d0104fde900b40a00000100',
    samplePayloadAscii: '................-........',
    dissectorFields: { 'BGP Marker': '16 bytes (All 1s)', Length: '45 bytes', Type: 'OPEN (1)', 'My AS': '65001', 'Hold Time': '180s', 'BGP Identifier': '10.0.0.1' }
  },
  {
    id: 'it_dhcp',
    name: 'DHCP Discover / Request',
    category: 'IT',
    transport: 'UDP',
    defaultPort: 67,
    description: 'Dynamic Host Configuration Protocol IP lease request',
    brand: 'Standard / ISC DHCP',
    deviceType: 'Endpoint Client / DHCP Server',
    deviceModel: 'Kea DHCP / Microsoft Windows DHCP',
    vendorOUI: '00:0c:29',
    signatureDetails: {
      vendorName: 'RFC 2131 DHCP Protocol',
      productFamily: 'BOOTP / DHCP Dynamic Host Engine',
      uniqueSignaturePattern: 'Opcode 0x01 + Magic Cookie 0x63825363 + Option 53 (Discover)',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '010106003903f3260000000000000000000000000000000000000000000c29a8b13d000000000000000000006382536335010137040103062a',
    samplePayloadAscii: '....9..&.....................)..=..........c.Sc5..7...*',
    dissectorFields: { OpCode: 'Boot Request (1)', HWType: 'Ethernet (1)', 'Client MAC': '00:0c:29:a8:b1:3d', 'Magic Cookie': '0x63825363 (DHCP)', 'DHCP Message': 'Discover (1)' }
  },

  // --- IOT PROTOCOLS (WITH BRAND SIGNATURES & DEVICE MODELS) ---
  {
    id: 'iot_mqtt_espressif',
    name: 'MQTT - Espressif ESP32 Sensor',
    category: 'IoT',
    transport: 'TCP',
    defaultPort: 1883,
    description: 'ESP32 Wi-Fi microcontroller publishing temperature & humidity telemetry to MQTT Broker',
    brand: 'Espressif Systems',
    deviceType: 'Industrial Sensor Node MCU',
    deviceModel: 'ESP32-WROOM-32D / ESP32-S3',
    vendorOUI: '24:6f:28', // Espressif MAC OUI
    signatureDetails: {
      vendorName: 'Espressif Systems (Shanghai) Co., Ltd.',
      productFamily: 'ESP-IDF FreeRTOS MQTT Client',
      firmwareVersion: 'ESP-IDF v5.1.2',
      uniqueSignaturePattern: 'MQTT 3.1.1 PUBLISH + Topic "factory/esp32_sensor_01/telemetry" + JSON Payload',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '303a0020666163746f72792f65737033325f73656e736f725f30312f74656c656d657472797b2274656d70223a32382e342c2268756d223a36322e312c22766363223a332e337d',
    samplePayloadAscii: '0:...factory/esp32_sensor_01/telemetry{"temp":28.4,"hum":62.1,"vcc":3.3}',
    dissectorFields: {
      'Vendor/Brand': 'Espressif Systems (ESP32-S3)',
      'Device Model': 'ESP32-WROOM-32D (OUI 24:6f:28)',
      'Control Packet': 'PUBLISH (3) [QoS 0]',
      Topic: 'factory/esp32_sensor_01/telemetry',
      'Telemetry Data': 'Temp: 28.4°C, Hum: 62.1%, VCC: 3.3V',
      'Client Framework': 'ESP-IDF MQTT Engine v5.1'
    }
  },
  {
    id: 'iot_mqtt_advantech',
    name: 'MQTT - Advantech ADAM IoT Gateway',
    category: 'IoT',
    transport: 'TCP',
    defaultPort: 1883,
    description: 'Advantech ADAM-6700 Edge Intelligent Gateway transmitting industrial analog telemetry',
    brand: 'Advantech',
    deviceType: 'Industrial Edge IoT Gateway / Data Hub',
    deviceModel: 'ADAM-6717 / WISE-4012',
    vendorOUI: '00:d0:c9', // Advantech OUI
    signatureDetails: {
      vendorName: 'Advantech Co., Ltd.',
      productFamily: 'Advantech ADAM / WISE-PaaS Edge Framework',
      firmwareVersion: 'Advantech Node-RED v3.2',
      uniqueSignaturePattern: 'MQTT PUBLISH + Topic "Advantech/ADAM-6717/Data/AI" + JSON Sensor Dict',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '3042001c416476616e746563682f4144414d2d363731372f446174612f41497b22414930223a31322e34352c22414931223a342e31322c22756e6974223a226d41222c22737461747573223a226f6b227d',
    samplePayloadAscii: '0B...Advantech/ADAM-6717/Data/AI{"AI0":12.45,"AI1":4.12,"unit":"mA","status":"ok"}',
    dissectorFields: {
      'Vendor/Brand': 'Advantech Co., Ltd.',
      'Device Model': 'ADAM-6717 Intelligent Gateway (OUI 00:d0:c9)',
      'Protocol': 'MQTT 3.1.1 [Publish]',
      Topic: 'Advantech/ADAM-6717/Data/AI',
      'Industrial Channel': '4-20mA Current Loop (AI0=12.45mA, AI1=4.12mA)',
      'Firmware/OS': 'WISE-PaaS Linux Embedded'
    }
  },
  {
    id: 'iot_rtsp_hikvision',
    name: 'RTSP / ONVIF - Hikvision IP Camera',
    category: 'IoT',
    transport: 'TCP',
    defaultPort: 554,
    description: 'Hikvision DS-2CD series Network IP Security Camera H.264/H.265 RTSP streaming session',
    brand: 'Hikvision',
    deviceType: 'IP Surveillance Camera',
    deviceModel: 'DS-2CD2047G2-LU (ColorVu 4MP)',
    vendorOUI: 'bc:ad:28', // Hikvision OUI
    signatureDetails: {
      vendorName: 'Hangzhou Hikvision Digital Technology',
      productFamily: 'Hikvision IP Camera RTSP / ISAPI Engine',
      firmwareVersion: 'V5.7.3 build 220818',
      uniqueSignaturePattern: 'RTSP/1.0 DESCRIBE rtsp://.../Streaming/Channels/101 + User-Agent Hikvision RTSP Client',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '444553435249424520727473703a2f2f3139322e3136382e312e36343a3535342f53747265616d696e672f4368616e6e656c732f31303120525453502f312e300d0a435365713a20320d0a557365722d4167656e743a2048696b766973696f6e20495043616d2056352e370d0a4163636570743a206170706c69636174696f6e2f7364700d0a0d0a',
    samplePayloadAscii: 'DESCRIBE rtsp://192.168.1.64:554/Streaming/Channels/101 RTSP/1.0\r\nCSeq: 2\r\nUser-Agent: Hikvision IPCam V5.7\r\nAccept: application/sdp\r\n\r\n',
    dissectorFields: {
      'Vendor/Brand': 'Hikvision (Hangzhou Hikvision Digital)',
      'Device Model': 'DS-2CD2047G2 (ColorVu 4MP)',
      'Method': 'DESCRIBE',
      'Target Channel': '/Streaming/Channels/101 (Main Stream H.265)',
      'Client Banner': 'User-Agent: Hikvision IPCam V5.7',
      'Media Format': 'SDP / RTP/AVP H.265 2560x1440 25fps'
    }
  },
  {
    id: 'iot_rtsp_dahua',
    name: 'RTSP / ONVIF - Dahua Security Camera',
    category: 'IoT',
    transport: 'TCP',
    defaultPort: 554,
    description: 'Dahua Technology WizSense Series IP Security Camera RTSP video feed session',
    brand: 'Dahua Technology',
    deviceType: 'IP Surveillance Camera',
    deviceModel: 'DH-IPC-HFW3541E-AS-S2',
    vendorOUI: '3c:ef:8c', // Dahua OUI
    signatureDetails: {
      vendorName: 'Zhejiang Dahua Technology Co., Ltd.',
      productFamily: 'Dahua WizSense / WizMind IP Camera',
      firmwareVersion: 'DH_IPC-HX5X4X-Volt_MultiLang_V2.840',
      uniqueSignaturePattern: 'RTSP DESCRIBE /cam/realmonitor?channel=1&subtype=0 + Dahua RTSP Engine',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '444553435249424520727473703a2f2f3139322e3136382e312e3130383a3535342f63616d2f7265616c6d6f6e69746f723f6368616e6e656c3d3126737562747970653d3020525453502f312e300d0a435365713a20310d0a557365722d4167656e743a204461687561205254535020436c69656e740d0a0d0a',
    samplePayloadAscii: 'DESCRIBE rtsp://192.168.1.108:554/cam/realmonitor?channel=1&subtype=0 RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: Dahua RTSP Client\r\n\r\n',
    dissectorFields: {
      'Vendor/Brand': 'Dahua Technology Co., Ltd.',
      'Device Model': 'WizSense DH-IPC-HFW3541E (OUI 3c:ef:8c)',
      'RTSP URI': '/cam/realmonitor?channel=1&subtype=0',
      'Client Banner': 'Dahua RTSP Client v2.84',
      'Resolution': '5MP 2592x1944 H.264/H.265'
    }
  },
  {
    id: 'iot_coap',
    name: 'CoAP - Nordic nRF9160 Cellular IoT',
    category: 'IoT',
    transport: 'UDP',
    defaultPort: 5683,
    description: 'Nordic Semiconductor nRF9160 LTE-M / NB-IoT low power sensor publishing battery & GPS data via CoAP',
    brand: 'Nordic Semiconductor',
    deviceType: 'Low-Power Cellular IoT Asset Tracker',
    deviceModel: 'nRF9160 SiP / Thingy:91',
    vendorOUI: 'f4:ce:36',
    signatureDetails: {
      vendorName: 'Nordic Semiconductor ASA',
      productFamily: 'nRF Connect SDK Zephyr CoAP Server',
      firmwareVersion: 'NCS v2.4.0 (Zephyr RTOS)',
      uniqueSignaturePattern: 'CoAP 0x4001 CON GET + Uri-Path "sensors/gps_battery" + JSON Payload',
      dpiConfidence: '95% (Protocol + OUI Match)'
    },
    samplePayloadHex: '40011234b473656e736f72732f677073ff7b226c6174223a2d362e3230302c226c6f6e223a3130362e3831362c22626174223a39347d',
    samplePayloadAscii: '@..4.sensors/gps.{"lat":-6.200,"lon":106.816,"bat":94}',
    dissectorFields: {
      'Vendor/Brand': 'Nordic Semiconductor (nRF9160 SiP)',
      'Device Model': 'Nordic Thingy:91 LTE-M/NB-IoT Tracker',
      'Protocol': 'CoAP RFC 7252 [Confirmable GET]',
      'Message ID': '0x1234',
      'Path': 'sensors/gps',
      'Telemetry': 'Latitude: -6.200, Longitude: 106.816, Battery: 94%'
    }
  },
  {
    id: 'iot_lorawan_rak',
    name: 'LoRaWAN - RAKwireless WisGate Edge',
    category: 'IoT',
    transport: 'UDP',
    defaultPort: 1700,
    description: 'RAKwireless RAK7289 Outdoor 16-Channel LoRaWAN Industrial Gateway packet forwarder',
    brand: 'RAKwireless',
    deviceType: 'Industrial LoRaWAN Gateway',
    deviceModel: 'WisGate Edge Pro (RAK7289 / RAK7249)',
    vendorOUI: 'ac:1f:0f', // RAKwireless OUI
    signatureDetails: {
      vendorName: 'Shenzhen RAKwireless Technology Co., Ltd.',
      productFamily: 'WisGateOS LoRa Packet Forwarder',
      firmwareVersion: 'WisGateOS v2.1.8',
      uniqueSignaturePattern: 'Semtech UDP Protocol v2 PUSH_DATA + Gateway EUI ac:1f:0f:ff:fe:01:23:45',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '02341200ac1f0fffffe012347b227278706b223a5b7b22746d7374223a3335313233342c2266726571223a3932332e322c2272737369223a2d36352c22736e72223a392e352c2264617472223a225346374257313235227d5d7d',
    samplePayloadAscii: '.4..............{"rxpk":[{"tmst":351234,"freq":923.2,"rssi":-65,"snr":9.5,"datr":"SF7BW125"}]}',
    dissectorFields: {
      'Vendor/Brand': 'RAKwireless Technology',
      'Device Model': 'WisGate Edge Pro RAK7289 (OUI ac:1f:0f)',
      'Gateway EUI': 'AC:1F:0F:FF:FE:E0:12:34',
      'Radio Frequency': 'AS923 / 923.20 MHz (SF7/BW125)',
      'Link Quality': 'RSSI: -65 dBm, SNR: +9.5 dB',
      'Forwarder Protocol': 'Semtech Packet Forwarder v2 (UDP 1700)'
    }
  },
  {
    id: 'iot_mdns_apple_google',
    name: 'mDNS / SSDP - Smart Hub Discovery',
    category: 'IoT',
    transport: 'UDP',
    defaultPort: 5353,
    description: 'Multicast DNS service discovery from Smart Home / Smart TV / Hub (Google Home / Apple HomeKit)',
    brand: 'Google / Apple',
    deviceType: 'Smart Display / IoT Hub',
    deviceModel: 'Google Nest Hub / Apple HomePod Mini',
    vendorOUI: '48:d7:05',
    signatureDetails: {
      vendorName: 'Google LLC / Apple Inc.',
      productFamily: 'Google Cast / Matter Thread Border Router',
      uniqueSignaturePattern: 'mDNS PTR query _googlecast._tcp.local / _matter._tcp.local',
      dpiConfidence: '95% (Protocol + OUI Match)'
    },
    samplePayloadHex: '0000000000010000000000000c5f676f6f676c6563617374045f746370056c6f63616c00000c0001',
    samplePayloadAscii: '............._googlecast._tcp.local.....',
    dissectorFields: {
      'Vendor/Brand': 'Google LLC (Google Cast Engine)',
      'Device Type': 'Smart Hub / Media Renderer',
      'Service Query': '_googlecast._tcp.local',
      'Multicast Group': '224.0.0.251 (Port 5353)',
      'Matter Ready': 'Yes (Matter Thread over Wi-Fi)'
    }
  },

  // --- OT (OPERATIONAL TECHNOLOGY / ICS / SCADA / DCS) BRAND-SPECIFIC SIGNATURES ---
  {
    id: 'ot_s7comm_siemens_1500',
    name: 'Siemens S7comm - S7-1500 PLC',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 102,
    description: 'Siemens SIMATIC S7-1500 Advanced Industrial Controller communicating via S7comm Plus / ISO-on-TCP (TPKT/COTP)',
    brand: 'Siemens',
    deviceType: 'Industrial Programmable Logic Controller (PLC)',
    deviceModel: 'SIMATIC S7-1500 CPU 1516-3 PN/DP (6ES7516-3AN02-0AB0)',
    vendorOUI: '00:0e:8c', // Siemens AG MAC OUI
    signatureDetails: {
      vendorName: 'Siemens AG (Industry Sector / Digital Factory)',
      productFamily: 'SIMATIC S7-1500 High-Performance PLC',
      firmwareVersion: 'TIA Portal V18.0 / Firmware V3.0.3',
      hardwareRevision: 'HW Rev 03, Rack 0, Slot 1',
      rackSlot: 'Rack 0 / Slot 1 (CPU 1516-3)',
      uniqueSignaturePattern: 'ISO-on-TCP TPKT(0x03) + COTP Data(0xf0) + S7 Protocol Magic 0x32 + ROSCTR Job (0x01) + ReadVar (0x04) DB100.DBW0',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '0300001f02f080320100000001000e00000401120a10020002000184000000',
    samplePayloadAscii: '.......2........................',
    dissectorFields: {
      'Vendor/Brand': 'Siemens AG (Germany)',
      'Device Model': 'SIMATIC S7-1500 (CPU 1516-3 PN/DP)',
      'Part Number': '6ES7516-3AN02-0AB0',
      'MAC OUI': '00:0e:8c (Siemens AG Industrial)',
      'ISO-on-TCP': 'TPKT v3 (Port 102), COTP Data (0xf0)',
      'S7 Protocol Magic': '0x32 (Siemens S7comm Standard)',
      'ROSCTR Type': 'Job (1) - Request from HMI/SCADA',
      'Function Code': '0x04 (Read Var / DataBlock)',
      'Target Memory Area': 'DB100 (Process Setpoint & RPM)',
      'Address Offset': 'DBX0.0 (Word Count: 2 Bytes)',
      'Safety Integrity': 'SIL 3 / IEC 61508 Capable'
    }
  },
  {
    id: 'ot_s7comm_siemens_1200',
    name: 'Siemens S7comm - S7-1200 Basic PLC',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 102,
    description: 'Siemens SIMATIC S7-1200 Compact PLC for machine automation and distributed IO',
    brand: 'Siemens',
    deviceType: 'Compact Programmable Logic Controller (PLC)',
    deviceModel: 'SIMATIC S7-1200 CPU 1214C (6ES7214-1AG40-0XB0)',
    vendorOUI: '00:1c:06', // Siemens OUI
    signatureDetails: {
      vendorName: 'Siemens AG',
      productFamily: 'SIMATIC S7-1200 Compact System',
      firmwareVersion: 'Firmware V4.5.1',
      hardwareRevision: 'FS: 04',
      rackSlot: 'Rack 0 / Slot 1',
      uniqueSignaturePattern: 'TPKT Port 102 + S7 Magic 0x32 + ROSCTR Job WriteVar (0x05) to %M0.0',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '0300002402f080320100000002000e00040501120a100100010000830000000003000101',
    samplePayloadAscii: '...$....2..........................',
    dissectorFields: {
      'Vendor/Brand': 'Siemens AG',
      'Device Model': 'SIMATIC S7-1200 CPU 1214C DC/DC/DC',
      'Part Number': '6ES7214-1AG40-0XB0',
      'S7 Function': '0x05 (Write Var - Start Motor Command)',
      'Memory Target': 'Merker Memory %M0.0 (Pump Run Bit)',
      'Value Written': '0x01 (TRUE / Start Motor)',
      'Engineering Tool': 'Siemens TIA Portal V17/V18'
    }
  },
  {
    id: 'ot_cip_rockwell_controllogix',
    name: 'EtherNet/IP CIP - Rockwell Allen-Bradley ControlLogix',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 44818,
    description: 'Rockwell Automation Allen-Bradley ControlLogix 5580 PAC communicating via CIP (Common Industrial Protocol)',
    brand: 'Rockwell Automation (Allen-Bradley)',
    deviceType: 'Programmable Automation Controller (PAC)',
    deviceModel: 'Allen-Bradley ControlLogix 5580 (1756-L83E)',
    vendorOUI: '00:00:bc', // Rockwell Automation MAC OUI
    signatureDetails: {
      vendorName: 'Rockwell Automation / Allen-Bradley',
      productFamily: 'ControlLogix 1756 PAC / Studio 5000 Logix Designer',
      firmwareVersion: 'Firmware Revision 33.011',
      hardwareRevision: 'Series B, Slot 0',
      rackSlot: 'Chassis 1756-A10 / Slot 0',
      uniqueSignaturePattern: 'EtherNet/IP Encapsulation Command 0x006f (SendRRData) + CIP Service 0x4c (Read Tag "Tank_01_Pressure_PSI")',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '6f0028000100000000000000000000000000000000000000000000000000020000000000b20018004c03911554616e6b5f30315f50726573737572655f5053490100',
    samplePayloadAscii: 'o.(.........................L...Tank_01_Pressure_PSI..',
    dissectorFields: {
      'Vendor/Brand': 'Rockwell Automation / Allen-Bradley (USA)',
      'Device Model': 'ControlLogix 5580 (1756-L83E 1Gbps Ethernet)',
      'MAC OUI': '00:00:bc (Rockwell Automation)',
      'Encapsulation Command': '0x006f (SendRRData / CIP Data Transfer)',
      'CIP Service Code': '0x4c (Read Tag Service)',
      'Symbolic Tag Name': 'Tank_01_Pressure_PSI',
      'Element Count': '1 (REAL Floating Point 32-bit)',
      'Session Handle': '0x00000001 (Active CIP Connection)',
      'Programming Suite': 'Studio 5000 Logix Designer v33'
    }
  },
  {
    id: 'ot_cip_rockwell_compactlogix',
    name: 'EtherNet/IP CIP - Rockwell CompactLogix',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 44818,
    description: 'Rockwell Automation CompactLogix 5380 Controller reading manufacturing IO tags',
    brand: 'Rockwell Automation (Allen-Bradley)',
    deviceType: 'Modular Industrial Controller',
    deviceModel: 'Allen-Bradley CompactLogix 5380 (5069-L306ER)',
    vendorOUI: '00:1d:9c', // Rockwell OUI
    signatureDetails: {
      vendorName: 'Rockwell Automation',
      productFamily: 'CompactLogix 5380 Modular PLC',
      firmwareVersion: 'Firmware Rev 32.012',
      uniqueSignaturePattern: 'EtherNet/IP SendUnitData (0x0070) + CIP Write Tag "Conveyor_Speed_Hz"',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '700026000100000000000000000000000000000000000000000000000000020000000000b20016004d039111436f6e7665796f725f53706565640100c40000002842',
    samplePayloadAscii: 'p.&.........................M...Conveyor_Speed...(B',
    dissectorFields: {
      'Vendor/Brand': 'Rockwell Automation (Allen-Bradley)',
      'Device Model': 'CompactLogix 5380 (5069-L306ER)',
      'CIP Service Code': '0x4d (Write Tag Service)',
      'Tag Name': 'Conveyor_Speed_Hz',
      'Value Injected': '42.0 Hz (REAL 32-bit Float)',
      'Network': 'Dual 1-Gbps DLR (Device Level Ring)'
    }
  },
  {
    id: 'ot_modbus_schneider_m580',
    name: 'Modbus TCP - Schneider Electric Modicon M580',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 502,
    description: 'Schneider Electric Modicon M580 PAC (ePAC) querying telemetry via Modbus TCP Application Protocol',
    brand: 'Schneider Electric',
    deviceType: 'Industrial ePAC / Safety PLC',
    deviceModel: 'Modicon M580 (BMEP584040 ePAC CPU)',
    vendorOUI: '00:80:f4', // Schneider Electric OUI (Telemecanique)
    signatureDetails: {
      vendorName: 'Schneider Electric SE (France)',
      productFamily: 'Modicon M580 ePAC / EcoStruxure Control Expert',
      firmwareVersion: 'Firmware V3.20 (Unity Pro / EcoStruxure)',
      hardwareRevision: 'PV: 04, RL: 08',
      rackSlot: 'Main Ethernet Backplane X-Bus Rack 0',
      uniqueSignaturePattern: 'Modbus MBAP Header TransactionID 0x0001 + Unit ID 0x01 + Function Code 0x03 (Read Holding Regs 40001-40010)',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '00010000000601030064000a',
    samplePayloadAscii: '...........d..',
    dissectorFields: {
      'Vendor/Brand': 'Schneider Electric SE',
      'Device Model': 'Modicon M580 ePAC CPU (BMEP584040)',
      'MAC OUI': '00:80:f4 (Schneider Electric / Telemecanique)',
      'MBAP Transaction ID': '0x0001 (Sequential Sync)',
      'Protocol Identifier': '0x0000 (Modbus TCP Standard)',
      'Unit ID / Slave Address': '1 (Main Controller Module)',
      'Function Code': '0x03 (Read Holding Registers)',
      'Start Register': '40100 (0x0064 - Reactor Temperature & Pressure)',
      'Register Quantity': '10 Registers (20 Bytes)',
      'Cybersecurity': 'Achilles Communications Level 2 Certified'
    }
  },
  {
    id: 'ot_modbus_omron_nj_nx',
    name: 'Modbus TCP - Omron Sysmac NX1P2',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 502,
    description: 'Omron Sysmac NX1P2 Machine Automation Controller polling servo drive telemetry via Modbus TCP',
    brand: 'Omron',
    deviceType: 'Machine Automation Controller (MAC)',
    deviceModel: 'Omron Sysmac NX1P2-9024DT',
    vendorOUI: '00:00:0a', // Omron Corporation OUI
    signatureDetails: {
      vendorName: 'Omron Corporation (Japan)',
      productFamily: 'Sysmac NX / NJ Series Motion & Logic Controller',
      firmwareVersion: 'Sysmac Studio v1.50 / Firmware 1.42',
      uniqueSignaturePattern: 'Modbus TCP Function Code 0x10 (Write Multiple Registers - Servo Position Target)',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '00020000000b011001f400020400004e20',
    samplePayloadAscii: '...............N ',
    dissectorFields: {
      'Vendor/Brand': 'Omron Corporation (Japan)',
      'Device Model': 'Sysmac NX1P2-9024DT (OUI 00:00:0a)',
      'Function Code': '0x10 (Write Multiple Registers)',
      'Target Register': '40500 (Servo Position Target)',
      'Data Written': '20,000 pulses (0x00004E20)',
      'Automation Engine': 'Sysmac Studio Integrated Platform'
    }
  },
  {
    id: 'ot_dnp3_ge_alstom',
    name: 'DNP3 - GE Grid Solutions Substation Controller',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 20000,
    description: 'General Electric / Alstom Grid Substation Controller & IED transmitting electrical power telemetry',
    brand: 'GE Grid Solutions (General Electric)',
    deviceType: 'Substation Automation Controller / RTU / IED',
    deviceModel: 'GE Multilin UR F60 / D400 Substation Gateway',
    vendorOUI: '00:0c:e5', // GE Multilin OUI
    signatureDetails: {
      vendorName: 'General Electric / GE Grid Solutions',
      productFamily: 'GE Multilin UR / D400 Substation SCADA RTU',
      firmwareVersion: 'GE EnerVista UR Firmware v8.10',
      uniqueSignaturePattern: 'DNP3 Sync 0x0564 + Length 5 + Control 0xc0 + Dest 1 (RTU) + Source 1024 (Master SCADA) + Function 0x01 (Read)',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '056405c001000004e9c1',
    samplePayloadAscii: '.d........',
    dissectorFields: {
      'Vendor/Brand': 'GE Grid Solutions (General Electric)',
      'Device Model': 'GE Multilin D400 / UR Series (OUI 00:0c:e5)',
      'Data Link Sync': '0x0564 (DNP3 Frame Marker)',
      'Control Byte': '0xc0 (Primary=1, Direction=1, Unsolicited=0)',
      'Destination DNP Address': '1 (Substation Bay Controller RTU)',
      'Source DNP Address': '1024 (Dispatch Central SCADA Master)',
      'Application Function': '0x01 (READ - Binary & Analog Inputs)',
      'Industry Domain': 'Electric Transmission & Distribution Grid'
    }
  },
  {
    id: 'ot_dnp3_sel_ied',
    name: 'DNP3 - Schweitzer Engineering Labs (SEL) Relay',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 20000,
    description: 'Schweitzer Engineering Laboratories (SEL-411L / SEL-751) Feeder Protection Relay communicating with EMS',
    brand: 'SEL (Schweitzer Engineering Laboratories)',
    deviceType: 'Digital Protective Relay & IED',
    deviceModel: 'SEL-751 Feeder Protection Relay / SEL-411L',
    vendorOUI: '00:06:5f', // SEL MAC OUI
    signatureDetails: {
      vendorName: 'Schweitzer Engineering Laboratories, Inc. (USA)',
      productFamily: 'SEL Mirrored Bits / SEL Protection Relays',
      firmwareVersion: 'SEL-751 Firmware R120-V0-Z001001-D20220915',
      uniqueSignaturePattern: 'DNP3 Unsolicited Response 0x82 + Group 30 Var 2 (32-bit Analog Voltage 150kV)',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '056414c000040100c88200001e0200010100002710',
    samplePayloadAscii: '.d.............\'..',
    dissectorFields: {
      'Vendor/Brand': 'Schweitzer Engineering Labs (SEL)',
      'Device Model': 'SEL-751 Feeder Protection Relay (OUI 00:06:5f)',
      'DNP3 Response Type': '0x82 (Unsolicited Event Response)',
      'DNP Object Group': 'Group 30 (Analog Inputs) Var 2',
      'Telemetry Point': 'Bus 1 Voltage: 150.0 kV (0x00002710)',
      'Relay Status': 'Tripping Circuit: HEALTHY (No Fault)'
    }
  },
  {
    id: 'ot_iec104_abb_rtu',
    name: 'IEC 60870-5-104 - ABB RTU560 / Hitachi Energy',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 2404,
    description: 'ABB / Hitachi Energy RTU560 Substation Telecontrol Gateway transmitting breaker status and power measurements',
    brand: 'ABB / Hitachi Energy',
    deviceType: 'Substation Telecontrol Gateway RTU',
    deviceModel: 'ABB RTU560 (560CMR02 CPU)',
    vendorOUI: '00:50:c2', // ABB Power Automation OUI
    signatureDetails: {
      vendorName: 'ABB Ltd. / Hitachi Energy',
      productFamily: 'ABB RTU500 Series Telecontrol & SCADA Gateway',
      firmwareVersion: 'RTU500 Release 13.4.1',
      uniqueSignaturePattern: 'APCI Start 0x68 + APDU Len 14 + Type ID 1 (M_SP_NA_1 Single-Point Information / Circuit Breaker Closed)',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '680e0000000001010300010001000001',
    samplePayloadAscii: 'h...............',
    dissectorFields: {
      'Vendor/Brand': 'ABB / Hitachi Energy (Switzerland)',
      'Device Model': 'ABB RTU560 Gateway (560CMR02 CPU)',
      'MAC OUI': '00:50:c2 (ABB Power T&D)',
      'APCI Header': '0x68 (IEC-104 Start Byte), Format: I-Frame',
      'Type Identification': 'Type 1 (M_SP_NA_1 - Single-Point Information)',
      'Cause of Transmission': '3 (Spontaneous / Event Report)',
      'Common Address (ASDU)': '1 (Substation Gardu 150kV)',
      'Information Object Address': 'IOA 1 (Feeder CB Q0 Position: CLOSED)',
      'Standard Compliance': 'IEC 60870-5-104 Edition 2'
    }
  },
  {
    id: 'ot_iec104_siemens_sicam',
    name: 'IEC 60870-5-104 - Siemens SICAM A8000',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 2404,
    description: 'Siemens SICAM A8000 Remote Terminal Unit transmitting grid transformer telemetry',
    brand: 'Siemens',
    deviceType: 'Substation Automation RTU',
    deviceModel: 'Siemens SICAM CP-8022 / A8000',
    vendorOUI: '00:0e:8c',
    signatureDetails: {
      vendorName: 'Siemens AG (Energy Management)',
      productFamily: 'SICAM Substation Automation Systems',
      firmwareVersion: 'SICAM Device Manager V05.20',
      uniqueSignaturePattern: 'IEC-104 Type 13 (M_ME_NC_1 - Measured value, short floating point) Active Power MW',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '6812000000000d010300010005000042f6e97900',
    samplePayloadAscii: 'h.............B..y.',
    dissectorFields: {
      'Vendor/Brand': 'Siemens AG (Energy Automation)',
      'Device Model': 'SICAM A8000 (CP-8022 Telecontrol CPU)',
      'Type Identification': 'Type 13 (M_ME_NC_1 - Short Floating Point)',
      'Common Address': 'ASDU 1 (Main Bus Incomer)',
      'Measured Telemetry': 'Active Power: 123.45 MW (IEEE 754 Float)',
      'Quality Bit': '0x00 (Valid, Not Overflow, Synchronized)'
    }
  },
  {
    id: 'ot_profinet_phoenix_contact',
    name: 'PROFINET DCP / RT - Phoenix Contact ILC / Axioline',
    category: 'OT',
    transport: 'UDP',
    defaultPort: 34964,
    description: 'Phoenix Contact Axioline Industrial Ethernet Bus Coupler & ILC Controller real-time discovery',
    brand: 'Phoenix Contact',
    deviceType: 'Industrial Modular IO / Controller',
    deviceModel: 'Axioline F BK PN (Part: 2701815)',
    vendorOUI: '00:a0:45', // Phoenix Contact OUI
    signatureDetails: {
      vendorName: 'Phoenix Contact GmbH & Co. KG (Germany)',
      productFamily: 'Axioline / Inline PROFINET IO System',
      firmwareVersion: 'Firmware 1.30 / PC Worx',
      uniqueSignaturePattern: 'PROFINET DCP Identify Request (FrameID 0xfeff) + Device Name "axio-bk-pn-line1"',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: 'feff050000000001000000120002000e6178696f2d626b2d706e2d6c696e6531',
    samplePayloadAscii: '..................axio-bk-pn-line1',
    dissectorFields: {
      'Vendor/Brand': 'Phoenix Contact GmbH (Germany)',
      'Device Model': 'Axioline F BK PN Coupler (OUI 00:a0:45)',
      'PROFINET Frame ID': '0xfeff (DCP Identify Request)',
      'Service ID': '0x05 (DCP Get / Set)',
      'Station Name (NameOfStation)': 'axio-bk-pn-line1',
      'Real-Time Class': 'PROFINET RT Class 1 (Jitter < 10µs)'
    }
  },
  {
    id: 'ot_bacnet_johnson_controls',
    name: 'BACnet/IP - Johnson Controls Metasys NAE / FAC',
    category: 'OT',
    transport: 'UDP',
    defaultPort: 47808,
    description: 'Johnson Controls Metasys Network Automation Engine managing central chiller plant and HVAC air handlers',
    brand: 'Johnson Controls',
    deviceType: 'Building Automation System (BAS) Controller',
    deviceModel: 'Metasys NAE5510-2 / Facility Explorer (FAC)',
    vendorOUI: '00:10:8d', // Johnson Controls OUI
    signatureDetails: {
      vendorName: 'Johnson Controls, Inc. (Building Efficiency)',
      productFamily: 'Johnson Controls Metasys Enterprise Building Management',
      firmwareVersion: 'Metasys Release 12.0.1',
      uniqueSignaturePattern: 'BACnet Virtual Link Control (0x81) + BVLC Original Unicast (0x0a) + ReadProperty Analog Input 1 (Chiller Water Temp)',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '810a001101040000010c0c020000011955',
    samplePayloadAscii: '.................U',
    dissectorFields: {
      'Vendor/Brand': 'Johnson Controls, Inc. (USA)',
      'Device Model': 'Metasys NAE5510 / FEC Chiller Controller',
      'MAC OUI': '00:10:8d (Johnson Controls)',
      'BVLC Function': '0x0a (Original-Unicast-NPDU)',
      'BACnet Service': 'ReadProperty (12)',
      'Object Identifier': 'Analog Input 1 (Chiller Supply Water Temp)',
      'Object Property': 'Present_Value: 6.8°C (Set Target 7.0°C)',
      'Protocol Port': 'BACnet/IP 47808 (0xBAC0)'
    }
  },
  {
    id: 'ot_bacnet_honeywell_spyder',
    name: 'BACnet/IP - Honeywell WEBs-N4 / Spyder Controller',
    category: 'OT',
    transport: 'UDP',
    defaultPort: 47808,
    description: 'Honeywell Niagara Framework WEBs-N4 / Spyder BACnet HVAC VAV and Air Handling Controller',
    brand: 'Honeywell',
    deviceType: 'Building Management / HVAC Controller',
    deviceModel: 'Honeywell JACE 8000 / Spyder BACnet',
    vendorOUI: '00:d0:2d', // Honeywell OUI
    signatureDetails: {
      vendorName: 'Honeywell International Inc. (Niagara Framework)',
      productFamily: 'Honeywell Niagara 4 / WEBs-N4 Enterprise',
      firmwareVersion: 'Niagara 4.10.1.36',
      uniqueSignaturePattern: 'BACnet/IP Who-Is Router Discovery + I-Am Response Device ID 100234',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '810b001801001008090001877209040000010a0064',
    samplePayloadAscii: '............r......d',
    dissectorFields: {
      'Vendor/Brand': 'Honeywell International (Niagara 4)',
      'Device Model': 'Honeywell JACE-8000 (OUI 00:d0:2d)',
      'BACnet Service': 'I-Am Announcement (Broadcast)',
      'Device Instance ID': 'Device 100234 (Main AHU Building A)',
      'Max APDU Length': '1024 Bytes',
      'Vendor ID': 'Vendor 17 (Honeywell)'
    }
  },
  {
    id: 'ot_opcua_yokogawa_centum',
    name: 'OPC-UA Binary - Yokogawa CENTUM VP DCS',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 4840,
    description: 'Yokogawa CENTUM VP Distributed Control System (DCS) exporting real-time refinery refinery process nodes via OPC UA Binary',
    brand: 'Yokogawa',
    deviceType: 'Distributed Control System (DCS) / Industrial 4.0 Server',
    deviceModel: 'CENTUM VP FCS (AFV30D Duplexed Controller)',
    vendorOUI: '00:00:e2', // Yokogawa Electric OUI
    signatureDetails: {
      vendorName: 'Yokogawa Electric Corporation (Japan)',
      productFamily: 'Yokogawa CENTUM VP / Exaquantum Plant Historian',
      firmwareVersion: 'CENTUM VP R6.08 / OPC UA Server v1.04',
      uniqueSignaturePattern: 'OPC-UA HEL Message (0x48454c46) + Endpoint "opc.tcp://centum-dcs.plant.local:4840" + Security None/SignAndEncrypt',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '48454c464400000000000000000001000000010000000000240000006f70632e7463703a2f2f63656e74756d2d6463732e706c616e742e6c6f63616c3a34383430',
    samplePayloadAscii: 'HELFDD...................$.....opc.tcp://centum-dcs.plant.local:4840',
    dissectorFields: {
      'Vendor/Brand': 'Yokogawa Electric Corporation (Japan)',
      'Device Model': 'CENTUM VP FCS Field Control Station',
      'MAC OUI': '00:00:e2 (Yokogawa Electric)',
      'OPC-UA Message': 'HEL (Hello Handshake)',
      'Chunk Type': 'F (Final Chunk)',
      'Endpoint URL': 'opc.tcp://centum-dcs.plant.local:4840',
      'Security Policy': 'Basic256Sha256 / SignAndEncrypt',
      'Application Domain': 'Oil & Gas Refinery DCS / Chemical Plant'
    }
  },
  {
    id: 'ot_opcua_beckhoff_twincat',
    name: 'OPC-UA Binary - Beckhoff TwinCAT 3 IPC',
    category: 'OT',
    transport: 'TCP',
    defaultPort: 4840,
    description: 'Beckhoff Automation TwinCAT 3 PC-based Control IPC communicating via high-speed OPC-UA Server',
    brand: 'Beckhoff Automation',
    deviceType: 'Industrial PC (IPC) & Motion Controller',
    deviceModel: 'Beckhoff CX5130 Embedded PC',
    vendorOUI: '00:01:05', // Beckhoff Automation OUI
    signatureDetails: {
      vendorName: 'Beckhoff Automation GmbH & Co. KG (Germany)',
      productFamily: 'TwinCAT 3 PC Control & Motion IPC',
      firmwareVersion: 'TwinCAT 3.1 Build 4024.35',
      uniqueSignaturePattern: 'OPC-UA ReadRequest NodeId "ns=4;s=MAIN.fbRobotAxis.fActualPosition"',
      dpiConfidence: '100% (Deterministic Signature)'
    },
    samplePayloadHex: '4d5347463c000000000000000000010000000100000000001c0000006e733d343b733d4d41494e2e6662526f626f7441786973',
    samplePayloadAscii: 'MSGF<.......................ns=4;s=MAIN.fbRobotAxis',
    dissectorFields: {
      'Vendor/Brand': 'Beckhoff Automation (Germany)',
      'Device Model': 'Beckhoff CX5130 TwinCAT 3 IPC (OUI 00:01:05)',
      'OPC-UA Service': 'ReadRequest (Node Variable)',
      'Symbolic Variable': 'MAIN.fbRobotAxis.fActualPosition',
      'Execution Cycle': '1.0 ms Real-Time TwinCAT Kernel'
    }
  }
];

// -------------------------------------------------------------
// TRAFFIC SIMULATOR & PACKET DISSECTOR ENGINE
// -------------------------------------------------------------
export function createSyntheticPacket(
  packetNum: number,
  startTime: number,
  srcIp: string,
  dstIp: string,
  protoDef: PacketProtocolDef,
  customPort?: number,
  isAnomaly: boolean = false,
  statusOverride?: CapturedPacket['status'],
  srcMacOverride?: string,
  dstMacOverride?: string,
  vlanId?: number,
  direction?: 'in' | 'out'
): CapturedPacket {
  const now = performance.now();
  const timeOffsetSec = Math.max(0, (now - startTime) / 1000);
  const srcPort = 49152 + (packetNum % 10000);
  const dstPort = customPort || protoDef.defaultPort;
  const length = 54 + (protoDef.samplePayloadHex.length / 2);

  let status: CapturedPacket['status'] = statusOverride || 'ok';
  let info = `${protoDef.name} [Port ${dstPort}] - Standard Frame`;

  if (isAnomaly) {
    status = 'anomaly';
    info = `⚠️ ANOMALY: Unexpected payload length or unverified unit in ${protoDef.name}`;
  }

  // Formatting Hex Dump (Wireshark 16-byte aligned style)
  const hexParts: string[] = [];
  const rawHex = protoDef.samplePayloadHex;
  const rawAscii = protoDef.samplePayloadAscii;

  for (let i = 0; i < rawHex.length; i += 32) {
    const chunkHex = rawHex.substring(i, i + 32);
    const chunkAscii = rawAscii.substring(i / 2, (i + 32) / 2);
    const formattedHex = chunkHex.match(/.{1,2}/g)?.join(' ') || chunkHex;
    const offset = (i / 2).toString(16).padStart(4, '0');
    hexParts.push(`${offset}   ${formattedHex.padEnd(48, ' ')}   ${chunkAscii}`);
  }

  const dateNow = new Date();
  const timeOfDay = dateNow.toTimeString().split(' ')[0] + '.' + String(dateNow.getMilliseconds()).padStart(3, '0');
  const srcMac = srcMacOverride || protoDef.vendorOUI ? `${protoDef.vendorOUI}:12:34:56` : '52:54:00:12:34:56';
  const dstMac = dstMacOverride || '00:1b:21:8a:bc:de';

  return {
    id: packetNum,
    timestamp: Number(timeOffsetSec.toFixed(4)),
    timeFormatted: `${timeOffsetSec.toFixed(3)}s`,
    timeOfDay,
    deltaMs: Number((Math.random() * 8 + 0.5).toFixed(2)),
    srcIp,
    srcPort,
    srcMac,
    dstIp,
    dstPort,
    dstMac,
    vlanId: vlanId || 10,
    direction: direction || (packetNum % 2 === 0 ? 'in' : 'out'),
    streamId: `Stream #${(packetNum % 4) + 1}`,
    protocol: protoDef.transport === 'ICMP' ? 'ICMP' : protoDef.id.split('_')[1]?.toUpperCase() || protoDef.transport,
    category: protoDef.category,
    length,
    info,
    flags: protoDef.transport === 'TCP' ? '[PSH, ACK]' : protoDef.transport === 'ICMP' ? 'Echo Request' : 'Len=' + length,
    brand: protoDef.brand,
    deviceType: protoDef.deviceType,
    deviceModel: protoDef.deviceModel,
    vendorOUI: protoDef.vendorOUI,
    signatureDetails: protoDef.signatureDetails,
    status,
    headers: {
      frame: {
        number: packetNum,
        length,
        time: dateNow.toISOString(),
        deltaMs: Number((Math.random() * 8 + 0.5).toFixed(2))
      },
      ethernet: {
        srcMac,
        dstMac,
        etherType: 'IPv4 (0x0800)',
        vlanId: vlanId || 10
      },
      ip: {
        version: 4,
        headerLength: 20,
        ttl: 64,
        tos: '0x00 (Best Effort)',
        src: srcIp,
        dst: dstIp,
        checksum: '0x' + Math.floor(Math.random() * 65535).toString(16).padStart(4, '0')
      },
      transport: {
        protocol: protoDef.transport,
        srcPort,
        dstPort,
        flags: protoDef.transport === 'TCP' ? 'ACK, PSH (0x018)' : undefined,
        seq: Math.floor(Math.random() * 100000),
        ack: Math.floor(Math.random() * 100000),
        window: 64240,
        checksum: '0x' + Math.floor(Math.random() * 65535).toString(16).padStart(4, '0')
      },
      appLayer: {
        name: protoDef.name,
        details: { ...protoDef.dissectorFields }
      }
    },
    hexDump: hexParts.join('\n'),
    asciiDump: rawAscii
  };
}

/**
 * Parses raw text stream from Switch Port Mirroring / tcpdump / console logs into CapturedPacket array
 */
export function parseRawMirrorStream(rawText: string): { packets: CapturedPacket[]; parsedCount: number; errors: string[] } {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const packets: CapturedPacket[] = [];
  const errors: string[] = [];
  let currentPktId = 1;

  for (let i = 0; i < lines.length && currentPktId <= 200; i++) {
    const line = lines[i];
    
    // Match standard tcpdump / Wireshark text line:
    // e.g. "14:23:01.100 IP 192.168.1.50.54321 > 192.168.1.1.80: Flags [P.], seq 1:40, ack 1"
    const tcpdumpMatch = line.match(/(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+(?:IP|IPv4|eth0)\s+([0-9a-fA-F.:]+)(?:\.(\d+))?\s+[>\-]\s+([0-9a-fA-F.:]+)(?:\.(\d+))?:\s*(.*)/i);
    
    if (tcpdumpMatch) {
      const timeStr = tcpdumpMatch[1];
      const srcHost = tcpdumpMatch[2];
      const srcP = Number(tcpdumpMatch[3] || 50000 + currentPktId);
      const dstHost = tcpdumpMatch[4];
      const dstP = Number(tcpdumpMatch[5] || 80);
      const restInfo = tcpdumpMatch[6] || 'Raw Mirrored Frame';

      let proto = 'TCP';
      if (restInfo.toLowerCase().includes('udp') || dstP === 53 || dstP === 1883) proto = 'UDP';
      if (restInfo.toLowerCase().includes('icmp') || restInfo.toLowerCase().includes('echo')) proto = 'ICMP';
      if (dstP === 502) proto = 'MODBUS';
      if (dstP === 102) proto = 'S7COMM';
      if (dstP === 53) proto = 'DNS';
      if (dstP === 443) proto = 'TLS';
      if (dstP === 80) proto = 'HTTP';

      packets.push({
        id: currentPktId,
        timestamp: Number((currentPktId * 0.02).toFixed(4)),
        timeFormatted: `${(currentPktId * 0.02).toFixed(3)}s`,
        timeOfDay: timeStr,
        deltaMs: 20,
        srcIp: srcHost,
        srcPort: srcP,
        srcMac: '00:1a:2b:3c:4d:5e',
        dstIp: dstHost,
        dstPort: dstP,
        dstMac: '00:0c:29:ab:cd:ef',
        vlanId: 20,
        protocol: proto,
        category: (proto === 'MODBUS' || proto === 'S7COMM') ? 'OT' : 'IT',
        length: 64 + (restInfo.length % 500),
        info: restInfo,
        flags: restInfo.includes('Flags') ? restInfo.split('Flags')[1]?.split(',')[0] : '[PSH, ACK]',
        status: restInfo.toLowerCase().includes('rst') ? 'rst' : restInfo.toLowerCase().includes('drop') ? 'dropped' : 'ok',
        headers: {
          frame: { number: currentPktId, length: 64 + (restInfo.length % 500), time: new Date().toISOString() },
          ethernet: { srcMac: '00:1a:2b:3c:4d:5e', dstMac: '00:0c:29:ab:cd:ef', etherType: 'IPv4 (0x0800)', vlanId: 20 },
          ip: { version: 4, headerLength: 20, ttl: 64, tos: '0x00', src: srcHost, dst: dstHost, checksum: '0x1234' },
          transport: { protocol: proto, srcPort: srcP, dstPort: dstP, checksum: '0x5678' },
          appLayer: { name: `Switch Mirrored ${proto}`, details: { RawLog: restInfo } }
        },
        hexDump: `0000   00 0c 29 ab cd ef 00 1a 2b 3c 4d 5e 81 00 00 14   ..).....+<M^....\n0010   08 00 45 00 00 3c 00 01 00 00 40 06 00 00 0a 00   ..E..<....@.....`,
        asciiDump: restInfo.slice(0, 48)
      });
      currentPktId++;
      continue;
    }

    // Hex stream detection (00 11 22 33 ...)
    const hexMatch = line.match(/^([0-9a-fA-F]{2}[\s:-]){4,}[0-9a-fA-F]{2}/);
    if (hexMatch) {
      const cleanHex = line.replace(/[^0-9a-fA-F]/g, '');
      packets.push({
        id: currentPktId,
        timestamp: Number((currentPktId * 0.02).toFixed(4)),
        timeFormatted: `${(currentPktId * 0.02).toFixed(3)}s`,
        timeOfDay: new Date().toTimeString().split(' ')[0],
        deltaMs: 15,
        srcIp: `192.168.10.${10 + (currentPktId % 30)}`,
        srcPort: 54000 + currentPktId,
        srcMac: '52:54:00:fa:82:11',
        dstIp: '192.168.10.1',
        dstPort: 80,
        dstMac: '00:15:5d:01:aa:22',
        vlanId: 10,
        protocol: 'RAW_HEX',
        category: 'IT',
        length: Math.max(64, Math.floor(cleanHex.length / 2)),
        info: `Switch Hex Stream Frame (${cleanHex.length / 2} bytes)`,
        status: 'ok',
        headers: {
          frame: { number: currentPktId, length: Math.max(64, Math.floor(cleanHex.length / 2)), time: new Date().toISOString() },
          ethernet: { srcMac: '52:54:00:fa:82:11', dstMac: '00:15:5d:01:aa:22', etherType: 'IPv4 (0x0800)', vlanId: 10 },
          ip: { version: 4, headerLength: 20, ttl: 64, tos: '0x00', src: `192.168.10.${10 + (currentPktId % 30)}`, dst: '192.168.10.1', checksum: '0x9999' },
          transport: { protocol: 'TCP', srcPort: 54000 + currentPktId, dstPort: 80, checksum: '0x8888' }
        },
        hexDump: line,
        asciiDump: 'RAW_MIRROR_STREAM'
      });
      currentPktId++;
    }
  }

  return { packets, parsedCount: packets.length, errors };
}

// -------------------------------------------------------------
// PCAP PARSER & EXPORTER
// -------------------------------------------------------------
export function exportPacketsToPcap(packets: CapturedPacket[]): Blob {
  // Generates a valid standard libpcap binary format file
  // Global Header (24 bytes): Magic (0xa1b2c3d4), Major 2, Minor 4, TZ 0, SigFigs 0, Snaplen 65535, Network 1 (Ethernet)
  const globalHeader = new Uint8Array(24);
  const dvGlobal = new DataView(globalHeader.buffer);
  dvGlobal.setUint32(0, 0xa1b2c3d4, true); // Magic Number (Little Endian)
  dvGlobal.setUint16(4, 2, true); // Major Version
  dvGlobal.setUint16(6, 4, true); // Minor Version
  dvGlobal.setInt32(8, 0, true); // Timezone
  dvGlobal.setUint32(12, 0, true); // Sigfigs
  dvGlobal.setUint32(16, 65535, true); // Snaplen
  dvGlobal.setUint32(20, 1, true); // LinkType: Ethernet

  const packetBuffers: Uint8Array[] = [globalHeader];

  packets.forEach((pkt, idx) => {
    // Generate Ethernet + IP + Protocol Mock Frame
    const payloadBytes = new TextEncoder().encode(pkt.asciiDump || '69AI_PACKET');
    const totalPktLen = 14 + 20 + 20 + payloadBytes.length; // Eth + IP + TCP + Payload

    const pcapPktHeader = new Uint8Array(16);
    const dvPkt = new DataView(pcapPktHeader.buffer);
    const sec = Math.floor(Date.now() / 1000);
    const usec = Math.floor((pkt.timestamp % 1) * 1000000);

    dvPkt.setUint32(0, sec, true);
    dvPkt.setUint32(4, usec, true);
    dvPkt.setUint32(8, totalPktLen, true); // Captured length
    dvPkt.setUint32(12, totalPktLen, true); // Original length

    // Dummy Ethernet frame payload
    const rawFrame = new Uint8Array(totalPktLen);
    // Eth header
    rawFrame.set([0x00, 0x1b, 0x21, 0x8a, 0xbc, 0xde, 0x52, 0x54, 0x00, 0x12, 0x34, 0x56, 0x08, 0x00], 0);
    // IP header
    rawFrame.set([0x45, 0x00, 0x00, totalPktLen - 14, 0x12, 0x34, 0x40, 0x00, 0x40, 0x06, 0x00, 0x00, 0x0a, 0x00, 0x00, 0x01, 0x0a, 0x00, 0x00, 0x02], 14);
    // Payload
    rawFrame.set(payloadBytes, 54);

    packetBuffers.push(pcapPktHeader);
    packetBuffers.push(rawFrame);
  });

  return new Blob(packetBuffers, { type: 'application/vnd.tcpdump.pcap' });
}

export function parsePcapOrGzFile(
  fileContent: ArrayBuffer | string,
  fileName: string
): { packets: CapturedPacket[]; stats: { total: number; protocols: Record<string, number> } } {
  const packets: CapturedPacket[] = [];
  const protocols: Record<string, number> = {};

  try {
    // If text / json dump
    if (typeof fileContent === 'string') {
      const parsed = JSON.parse(fileContent);
      if (Array.isArray(parsed)) return { packets: parsed, stats: { total: parsed.length, protocols: {} } };
    }

    // Binary PCAP parsing
    const buffer = fileContent as ArrayBuffer;
    const dv = new DataView(buffer);
    const magic = dv.getUint32(0, true);

    const isLittleEndian = magic === 0xa1b2c3d4;
    let offset = 24; // Skip global header
    let pktIdx = 1;
    const baseTime = Date.now() / 1000;

    while (offset < buffer.byteLength - 16 && pktIdx <= 500) {
      const tsSec = dv.getUint32(offset, isLittleEndian);
      const capLen = dv.getUint32(offset + 8, isLittleEndian);
      offset += 16;

      if (offset + capLen > buffer.byteLength) break;

      // Extract basic IP / transport from frame
      let protoName = 'TCP';
      let srcIp = '192.168.1.50';
      let dstIp = '192.168.1.1';
      let srcPort = 50000 + (pktIdx % 1000);
      let dstPort = 80;
      let category: TrafficCategory = 'IT';

      // Check IP Header offset
      if (capLen > 34) {
        const ipProto = dv.getUint8(offset + 23);
        if (ipProto === 1) protoName = 'ICMP';
        else if (ipProto === 6) protoName = 'TCP';
        else if (ipProto === 17) protoName = 'UDP';

        srcPort = dv.getUint16(offset + 34, false);
        dstPort = dv.getUint16(offset + 36, false);

        if (dstPort === 502 || dstPort === 20000 || dstPort === 2404 || dstPort === 102) {
          category = 'OT';
          protoName = dstPort === 502 ? 'MODBUS' : dstPort === 20000 ? 'DNP3' : dstPort === 102 ? 'S7COMM' : 'IEC-104';
        } else if (dstPort === 1883 || dstPort === 5683 || dstPort === 554) {
          category = 'IoT';
          protoName = dstPort === 1883 ? 'MQTT' : dstPort === 5683 ? 'CoAP' : 'RTSP';
        }
      }

      protocols[protoName] = (protocols[protoName] || 0) + 1;

      packets.push({
        id: pktIdx,
        timestamp: Number((pktIdx * 0.015).toFixed(4)),
        timeFormatted: `${(pktIdx * 0.015).toFixed(3)}s`,
        srcIp,
        srcPort,
        dstIp,
        dstPort,
        protocol: protoName,
        category,
        length: capLen,
        info: `Imported from PCAP (${fileName}) [Len=${capLen} Bytes]`,
        status: 'ok',
        headers: {
          frame: { number: pktIdx, length: capLen, time: new Date(tsSec * 1000).toISOString() },
          ethernet: { srcMac: '00:50:56:c0:00:01', dstMac: '00:50:56:c0:00:08', etherType: 'IPv4 (0x0800)' },
          ip: { version: 4, headerLength: 20, ttl: 64, tos: '0x00', src: srcIp, dst: dstIp, checksum: '0x0000' },
          transport: { protocol: protoName, srcPort, dstPort, checksum: '0x0000' }
        },
        hexDump: `0000   00 50 56 c0 00 08 00 50 56 c0 00 01 08 00 45 00   .PV....PV.....E.\n0010   00 3c 1a 2b 40 00 40 06 00 00 c0 a8 01 32 c0 a8   .<.+@.@......2..\n0020   01 01 c3 50 00 50 00 00 00 00 00 00 00 00 a0 02   ...P.P..........`,
        asciiDump: `PCAP_RECORD_FRAME_${pktIdx}`
      });

      offset += capLen;
      pktIdx++;
    }
  } catch (err) {
    console.error('Failed to parse pcap file:', err);
  }

  return { packets, stats: { total: packets.length, protocols } };
}

// -------------------------------------------------------------
// CAPACITY & THROUGHPUT STRESS TEST PROFILES
// -------------------------------------------------------------
export interface StressTestProfile {
  id: string;
  name: string;
  nominalSpeedMbps: number;
  description: string;
  standardPort: string;
  targetPps: number;
}

export const STRESS_TEST_PROFILES: StressTestProfile[] = [
  { id: '10m', name: '10 Mbps (Legacy Ethernet)', nominalSpeedMbps: 10, description: '10BASE-T Legacy link standard test', standardPort: 'RJ45 Cat3/Cat5', targetPps: 8150 },
  { id: '100m', name: '100 Mbps (Fast Ethernet)', nominalSpeedMbps: 100, description: '100BASE-TX Fast Ethernet wire speed check', standardPort: 'RJ45 Cat5e', targetPps: 81500 },
  { id: '1g', name: '1 Gbps (Gigabit Ethernet 1000BASE-T / SFP)', nominalSpeedMbps: 1000, description: 'Standard 1Gbps LAN port & Cat6 cable throughput test', standardPort: 'RJ45 Cat6 / SFP 1G', targetPps: 815000 },
  { id: '2.5g', name: '2.5 Gbps (Multi-Gigabit NBase-T)', nominalSpeedMbps: 2500, description: 'High-speed Wi-Fi 6/7 AP uplink & NAS test', standardPort: 'RJ45 Cat6A', targetPps: 2037500 },
  { id: '5g', name: '5 Gbps (Multi-Gigabit NBASE-T / 5GBASE-T)', nominalSpeedMbps: 5000, description: '5GBASE-T High-Density Wi-Fi 7 Enterprise Uplink', standardPort: 'RJ45 Cat6/6A', targetPps: 4075000 },
  { id: '10g', name: '10 Gbps (10GbE SFP+ / 10GBASE-T)', nominalSpeedMbps: 10000, description: 'Data center core switch & 10G fiber SFP+ transceiver test', standardPort: 'SFP+ 10G / Cat6A-Cat7', targetPps: 8150000 },
  { id: '25g', name: '25 Gbps (SFP28 Enterprise Core)', nominalSpeedMbps: 25000, description: 'High-density 25G Server TOR uplink & Spine connection', standardPort: 'SFP28 25G Fiber', targetPps: 20375000 },
  { id: '40g', name: '40 Gbps (QSFP+ Spine/Leaf Fabric)', nominalSpeedMbps: 40000, description: 'Enterprise Data Center backbone QSFP+ MPO/LC fabric verification', standardPort: 'QSFP+ 40G Fiber', targetPps: 32600000 },
  { id: '100g', name: '100 Gbps (QSFP28 Ultra-High Speed Backbone)', nominalSpeedMbps: 100000, description: 'Ultra-High Throughput 100GbE QSFP28 Data Center & ISP Core Backbone', standardPort: 'QSFP28 100G Fiber', targetPps: 81500000 }
];
