export interface CiscoCcwLineItem {
  id: string;
  sku: string;
  description: string;
  qty: number;
  category: 'chassis' | 'license' | 'psu' | 'transceiver' | 'cable' | 'service' | 'accessory' | 'other';
  subOptions?: Array<{
    group: string;
    selectedSku: string;
    description: string;
  }>;
  unitListPriceUsd?: number;
  status: 'valid' | 'invalid' | 'warning' | 'pending';
  validationMessage?: string;
  suggestedFix?: string;
}

export interface CiscoCcwConfigComparison {
  title: string;
  groupName: string;
  options: Array<{
    sku: string;
    name: string;
    description: string;
    features: string[];
    useCase: string;
    priceTier: string;
    isRecommended?: boolean;
    recommendationReason?: string;
  }>;
}

/**
 * Knowledge Base for Cisco License & Option Comparisons
 */
export const CISCO_LICENSE_KNOWLEDGE_BASE: Record<string, CiscoCcwConfigComparison> = {
  'dna_switching': {
    title: 'Perbandingan Lisensi Cisco DNA Switching (Catalyst 9200 / 9300 / 9400 / 9500 / 9600)',
    groupName: 'Cisco DNA Subscription License Tier',
    options: [
      {
        sku: 'C9300-DNA-E-3Y / 5Y / 7Y',
        name: 'Cisco DNA Essentials',
        description: 'Lisensi switching dasar enterprise untuk operasional jaringan Layer 2/3 standard.',
        features: [
          'Switching Layer 2 & Basic Layer 3 (Static Routing, RIP, OSPF routed access max 1000 routes)',
          'Automated Topology Discovery & Device Health Monitoring di Cisco Catalyst Center (DNA Center)',
          'Software Image Management (SWIM) otomatis',
          'Network Plug and Play (PnP) zero-touch deployment',
          'Telemetry dasar (NetFlow / Flexible NetFlow export)'
        ],
        useCase: 'Cocok untuk kantor cabang, jaringan akses gedung standar tanpa kebutuhan segmentasi VXLAN Fabric atau SD-Access.',
        priceTier: 'Ekonomis (Termasuk di baseline quote)'
      },
      {
        sku: 'C9300-DNA-A-3Y / 5Y / 7Y',
        name: 'Cisco DNA Advantage',
        description: 'Lisensi full-feature untuk Enterprise Architecture, SD-Access Fabric, dan Advanced Analytics.',
        features: [
          'Semua fitur DNA Essentials',
          'Full Layer 3 Routing (BGP, IS-IS, OSPF full, EIGRP, VRF-Lite / Multi-VRF)',
          'Cisco SD-Access Border / Control Plane / Edge node integration',
          'VXLAN Fabric Encapsulation & EVPN',
          'Micro-segmentation berbasis Security Group Tag (Cisco ISE SGT & TrustSec)',
          'AI Network Analytics & Encrypted Traffic Analytics (ETA)',
          'Cisco ThousandEyes Enterprise Agent embedded support'
        ],
        useCase: 'Wajib dipilih jika perusahaan menerapkan arsitektur SD-Access, multi-tenant segmentation (VRF), BGP core routing, atau analitik AI proaktif.',
        priceTier: 'Premium (+20% s/d +35% vs Essentials)',
        isRecommended: true,
        recommendationReason: 'Standar de-facto untuk deployment Campus Network modern dan integrasi Cisco ISE / SD-Access.'
      },
      {
        sku: 'C9300-DNA-P-3Y / 5Y',
        name: 'Cisco DNA Premier',
        description: 'Paket bundling all-in-one DNA Advantage + Cisco ISE Base/Plus License + Cisco Stealthwatch/Secure Network Analytics.',
        features: [
          'Semua fitur DNA Advantage',
          'Termasuk bundle lisensi Cisco ISE (Identity Services Engine) endpoint',
          'Termasuk bundle lisensi Cisco Secure Network Analytics (Stealthwatch)',
          'Cisco DNA Spaces Extend indoor location IoT license'
        ],
        useCase: 'Untuk enterprise besar yang sekaligus membeli solusi NAC Cisco ISE & Security Analytics dalam satu BoQ tanpa beli lisensi ISE terpisah.',
        priceTier: 'Full Suite'
      }
    ]
  },
  'dna_wireless': {
    title: 'Perbandingan Lisensi Cisco DNA Wireless (Catalyst 9800 WLC & Wi-Fi 6E/7 AP)',
    groupName: 'Cisco DNA Wireless License',
    options: [
      {
        sku: 'AIR-DNA-E',
        name: 'DNA Spaces / Wireless Essentials',
        description: 'Manajemen Access Point dan RF Optimization dasar via Catalyst Center.',
        features: ['WLAN management, Rogue AP detection, Basic RF Analytics, Basic Guest Portal'],
        useCase: 'Deploy Wi-Fi kantor standar tanpa kebutuhan IoT Tracking akurat.',
        priceTier: 'Standard'
      },
      {
        sku: 'AIR-DNA-A',
        name: 'DNA Spaces / Wireless Advantage',
        description: 'High-density client assurance, AI RRM (Radio Resource Management), dan integrasi BLE/IoT tracking.',
        features: ['Semua fitur Essentials', 'AI Enhanced RRM', 'Intelligent Capture & Packet Trace over-the-air', '3D Floor Plan Wi-Fi Heatmap', 'Cisco DNA Spaces ACT license'],
        useCase: 'Rumah sakit, universitas, mall, gudang (warehouse tracking), dan kantor enterprise.',
        priceTier: 'Advantage',
        isRecommended: true
      }
    ]
  },
  'catalyst_psu': {
    title: 'Perbandingan Modul Power Supply (PSU) Catalyst 9300 / 9300L / 9200',
    groupName: 'Power Supply & PoE Budget Options',
    options: [
      {
        sku: 'PWR-C1-350WAC-P',
        name: '350W AC Platinum PSU',
        description: 'PSU untuk switch Non-PoE (Model 24/48 Data port).',
        features: ['Memberikan daya penuh untuk sistem switch tanpa PoE out'],
        useCase: 'Switch model C9300-24T, C9300-48T (Data only).',
        priceTier: 'Entry'
      },
      {
        sku: 'PWR-C1-715WAC-P',
        name: '715W AC Platinum PSU',
        description: 'PSU standar untuk model 24/48-port PoE+ (30W per port).',
        features: ['Menghasilkan 430W PoE Power Budget pada 1 PSU', 'Mendukung hingga 14 port PoE+ 30W penuh atau 28 port PoE 15.4W'],
        useCase: 'Kebutuhan standar IP Phone & Access Point Wi-Fi 6 kantor.',
        priceTier: 'Standard PoE+'
      },
      {
        sku: 'PWR-C1-1100WAC-P',
        name: '1100W AC Platinum PSU',
        description: 'High-Power PSU untuk Switch 48-port Full PoE+ atau UPOE (60W).',
        features: ['Menghasilkan 830W PoE Power Budget pada 1 PSU', 'Mendukung Full 24-48 port PoE+ serentak atau PTZ CCTV Kamera / Wi-Fi 6E/7 AP daya tinggi'],
        useCase: 'Deploy CCTV IP Camera Outdoor, Video Phone, Access Point Tri-Band Wi-Fi 6E/7 yang butuh daya >30W.',
        priceTier: 'High Power',
        isRecommended: true,
        recommendationReason: 'Mencegah underpower jika di kemudian hari memasang AP Wi-Fi 7 atau IP Kamera PoE berdaya besar.'
      }
    ]
  },
  'smartnet_service': {
    title: 'Perbandingan Service Level Cisco Smart Net Total Care (SNTC)',
    groupName: 'Cisco Service & Maintenance (SNTC)',
    options: [
      {
        sku: 'CON-SNT-xxx (8x5xNBD)',
        name: 'Smart Net 8x5xNBD (Next Business Day)',
        description: 'Layanan RMA penggantian hardware tiba di hari kerja berikutnya + akses TAC 24x7.',
        features: ['Pengiriman sparepart pengganti hari kerja berikutnya', 'Akses Cisco TAC 24x7x365 untuk support software/troubleshooting', 'Download update OS IOS-XE'],
        useCase: 'Perangkat Access Switch, Distribusi non-kritis, atau kantor yang memiliki unit spare cadangan.',
        priceTier: 'Standard Enterprise'
      },
      {
        sku: 'CON-SNTP-xxx (24x7x4)',
        name: 'Smart Net 24x7x4 (4-Hour Response)',
        description: 'Sparepart hardware pengganti diantar tiba di lokasi dalam 4 jam setelah diagnosa TAC.',
        features: ['Sparepart tiba dalam 4 jam 24 jam sehari 7 hari seminggu', 'Prioritas antrean TAC Severity 1 & 2', 'Engineer lapangan onsite (jika opsi Onsite dipilih)'],
        useCase: 'Core Switch, Firewall Data Center, Router Gateway Utama Internet / WAN kantor pusat.',
        priceTier: 'Mission Critical',
        isRecommended: true,
        recommendationReason: 'Wajib untuk link backbone Data Center / Core agar downtime tidak melebihi SLA perusahaan.'
      }
    ]
  }
};
