import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  ExternalLink,
  Plus,
  Copy,
  Check,
  Sparkles,
  ArrowUpRight,
  BookOpen,
  Terminal,
  ShieldCheck,
  Compass,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';
import { getSearchApiUrl } from '../utils/apiBase';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  displayUrl: string;
  domain: string;
  badge?: string;
}

export interface GoogleSearchViewProps {
  initialQuery?: string;
  onNavigateCurrentTab: (url: string, title?: string) => void;
  onOpenInNewTab: (url: string, title?: string) => void;
  onSendToAiAssistant?: (prompt: string, contextPayload?: any) => void;
  onExecuteInTerminal?: (cmd: string) => void;
}

const NETWORK_POPULAR_TOPICS = [
  { label: 'Cisco IOS-XE VLAN & Trunking Guide', query: 'cisco ios-xe vlan trunk configuration guide' },
  { label: 'FortiGate SSL-VPN & Firewall Policy', query: 'fortigate ssl-vpn configuration tutorial' },
  { label: 'Palo Alto NAT & Security Policy', query: 'palo alto pan-os nat policy configuration' },
  { label: 'F5 BIG-IP Virtual Server & Pool', query: 'f5 big-ip virtual server and pool configuration' },
  { label: 'Ruijie Reyee Cloud Web Management', query: 'ruijie reyee cloud web management guide' },
  { label: 'BGP vs OSPF Routing Best Practice', query: 'bgp vs ospf routing configuration enterprise' },
  { label: 'MikroTik RouterOS v7 WireGuard', query: 'mikrotik routeros v7 wireguard setup' },
  { label: 'Python Netmiko Network Automation', query: 'python netmiko network automation cisco' },
];

function generateClientFallbackResults(query: string): SearchResultItem[] {
  const cleanQ = query.trim();
  const lower = cleanQ.toLowerCase();
  const items: SearchResultItem[] = [];

  if (lower.includes('meraki') || lower.includes('cisco meraki')) {
    items.push(
      {
        title: 'Cisco Meraki Cloud Dashboard - Official Login Portal',
        url: 'https://dashboard.meraki.com',
        snippet: 'Official Cisco Meraki cloud networking dashboard for centralized management of MR Wireless, MS Switches, MX Security Appliances, and Systems Manager MDM.',
        displayUrl: 'dashboard.meraki.com',
        domain: 'meraki.com',
        badge: 'Cloud Portal',
      },
      {
        title: 'Cisco Meraki Documentation & Knowledge Base',
        url: 'https://documentation.meraki.com',
        snippet: 'Official configuration guides, deployment best practices, API references, troubleshooting workflows, and firmware release notes for all Cisco Meraki products.',
        displayUrl: 'documentation.meraki.com',
        domain: 'meraki.com',
        badge: 'Documentation',
      },
      {
        title: 'Cisco Meraki Dashboard API v1 Developer Hub',
        url: 'https://developer.cisco.com/meraki/api-v1/',
        snippet: 'Interactive API documentation, SDKs, webhooks, and automation tools for managing Meraki networks programmatically via REST API.',
        displayUrl: 'developer.cisco.com › meraki › api-v1',
        domain: 'cisco.com',
        badge: 'API & Dev',
      }
    );
  }

  if (lower.includes('ruijie') || lower.includes('reyee')) {
    items.push(
      {
        title: 'Ruijie Cloud Portal (Global / Asia Server)',
        url: 'https://cloud-as.ruijienetworks.com',
        snippet: 'Official Ruijie Reyee Cloud management portal: centralized Wi-Fi provisioning, Gateway & Switch remote configuration, and network topology.',
        displayUrl: 'cloud-as.ruijienetworks.com',
        domain: 'ruijienetworks.com',
        badge: 'Cloud Portal',
      },
      {
        title: 'Ruijie Networks Official Support & Documentation',
        url: 'https://www.ruijienetworks.com/resources',
        snippet: 'Manual books, firmware downloads, configuration tutorials, and technical support resources for Ruijie & Reyee products.',
        displayUrl: 'ruijienetworks.com › resources',
        domain: 'ruijienetworks.com',
        badge: 'Official',
      }
    );
  }

  if (lower.includes('kompas')) {
    items.push(
      {
        title: 'Kompas.com - Berita Terkini & Terpercaya Indonesia',
        url: 'https://www.kompas.com',
        snippet: 'Portal berita terdepan di Indonesia: Berita Nasional, Ekonomi, Tekno, Otomotif, Bola, Properti, dan Sains terlengkap.',
        displayUrl: 'kompas.com',
        domain: 'kompas.com',
        badge: 'Media',
      },
      {
        title: 'Kompas Tekno - Berita Teknologi, Gadget & Internet',
        url: 'https://tekno.kompas.com',
        snippet: 'Berita seputar perkembangan teknologi, internet, gadget, smartphone, telekomunikasi, dan aplikasi terkini.',
        displayUrl: 'tekno.kompas.com',
        domain: 'kompas.com',
        badge: 'Tekno',
      }
    );
  }

  if (lower.includes('youtube')) {
    items.push(
      {
        title: 'YouTube - Home & Video Streaming Platform',
        url: 'https://www.youtube.com',
        snippet: 'Platform berbagi video terbesar di dunia. Tonton tutorial jaringan, webinar IT, podcast teknologi, dan live streaming.',
        displayUrl: 'youtube.com',
        domain: 'youtube.com',
        badge: 'Video Streaming',
      },
      {
        title: `YouTube - Video Tutorial & Lab ${cleanQ}`,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`,
        snippet: `Temukan video pembahasan lab, simulasi Cisco Packet Tracer, EVE-NG, GNS3, dan panduan konfigurasi untuk ${cleanQ}.`,
        displayUrl: `youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`,
        domain: 'youtube.com',
        badge: 'Tutorials',
      }
    );
  }

  if (lower.includes('mikrotik') || lower.includes('routeros')) {
    items.push(
      {
        title: 'MikroTik Documentation (RouterOS v7 Manual)',
        url: 'https://help.mikrotik.com/docs/',
        snippet: 'Official RouterOS v7 documentation: IP Routing, Firewall Filter & NAT, WireGuard VPN, Queues QoS, Wireless, Bridge VLANs, and WebFig guide.',
        displayUrl: 'help.mikrotik.com › docs',
        domain: 'mikrotik.com',
        badge: 'Official Docs',
      },
      {
        title: 'MikroTik Download - Winbox, Netinstall & Packages',
        url: 'https://mikrotik.com/download',
        snippet: 'Download official Winbox v3 & v4, RouterOS packages, and Netinstall recovery utilities.',
        displayUrl: 'mikrotik.com › download',
        domain: 'mikrotik.com',
      }
    );
  }

  if (lower.includes('fortinet') || lower.includes('fortigate')) {
    items.push(
      {
        title: 'Fortinet Documentation Library - FortiGate Admin Guide',
        url: 'https://docs.fortinet.com/product/fortigate/7.4',
        snippet: 'Dokumentasi resmi FortiOS: Firewall Policy, SD-WAN, IPSec VPN, SSL-VPN, HA Clustering, dan Web GUI management.',
        displayUrl: 'docs.fortinet.com › product › fortigate',
        domain: 'docs.fortinet.com',
        badge: 'Official Docs',
      },
      {
        title: 'FortiCloud Central Management & Analytics Portal',
        url: 'https://support.fortinet.com',
        snippet: 'Fortinet Cloud portal for asset management, license activation, and cloud-managed FortiGate appliances.',
        displayUrl: 'support.fortinet.com',
        domain: 'fortinet.com',
        badge: 'Cloud Portal',
      }
    );
  }

  // Always append direct primary search engine and encyclopedia results
  items.push(
    {
      title: `${cleanQ} - Penelusuran Google Resmi`,
      url: `https://www.google.com/search?q=${encodeURIComponent(cleanQ)}`,
      snippet: `Buka langsung hasil pencarian lengkap untuk "${cleanQ}" di Google Search. Menemukan jutaan situs web dan dokumentasi resmi.`,
      displayUrl: `google.com/search?q=${encodeURIComponent(cleanQ)}`,
      domain: 'google.com',
      badge: 'Google Search',
    },
    {
      title: `${cleanQ} - GitHub Open Source Repositories & Scripts`,
      url: `https://github.com/search?q=${encodeURIComponent(cleanQ)}`,
      snippet: `Temukan skrip otomasi Python, Ansible Playbooks, modul Terraform, dan template konfigurasi jaringan untuk ${cleanQ}.`,
      displayUrl: `github.com › search › ${encodeURIComponent(cleanQ)}`,
      domain: 'github.com',
      badge: 'GitHub',
    },
    {
      title: `${cleanQ} - Video Tutorial & Panduan (YouTube)`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`,
      snippet: `Tonton panduan konfigurasi video langkah-demi-langkah, review perangkat, dan lab troubleshooting untuk ${cleanQ}.`,
      displayUrl: `youtube.com › results?search_query=${encodeURIComponent(cleanQ)}`,
      domain: 'youtube.com',
      badge: 'YouTube',
    },
    {
      title: `${cleanQ} - Ensiklopedia Wikipedia Bebas`,
      url: `https://id.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(cleanQ)}`,
      snippet: `Referensi teori, definisi protokol, standar RFC, dan penjelasan ensiklopedis mengenai ${cleanQ}.`,
      displayUrl: `id.wikipedia.org › wiki › ${encodeURIComponent(cleanQ)}`,
      domain: 'wikipedia.org',
    }
  );

  return items;
}

export const GoogleSearchView: React.FC<GoogleSearchViewProps> = ({
  initialQuery = '',
  onNavigateCurrentTab,
  onOpenInNewTab,
  onSendToAiAssistant,
  onExecuteInTerminal,
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>(() => {
    if (initialQuery.trim()) {
      return generateClientFallbackResults(initialQuery.trim());
    }
    return [];
  });
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(!!initialQuery);

  const fetchSearchResults = async (searchQueryText: string) => {
    const cleanQ = searchQueryText.trim();
    if (!cleanQ) return;

    setIsSearching(true);
    setHasSearched(true);

    // Rich client-side standalone search results immediately
    const fallbackItems = generateClientFallbackResults(cleanQ);
    setResults(fallbackItems);

    // Only try backend route if on standard web with backend server available
    if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
      try {
        const apiUrl = getSearchApiUrl(cleanQ);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(apiUrl, { 
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results) && data.results.length > 0) {
            setResults(data.results);
          }
        }
      } catch (err) {
        // Fallback items are already populated
      }
    }
    setIsSearching(false);
  };

  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      fetchSearchResults(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      fetchSearchResults(query);
    }
  };

  const handleCopy = (url: string) => {
    copyToClipboard(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Handler when user clicks on a search result title (opens in the app's browser tab)
  const handleOpenResult = (item: SearchResultItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    onNavigateCurrentTab(item.url, item.title);
  };

  // Handler to request AI summary for this specific product / documentation reference
  const handleAskAiSummary = (item: SearchResultItem) => {
    if (onSendToAiAssistant) {
      const prompt = `Tolong buatkan analisa dan summary komprehensif dari referensi produk / dokumentasi berikut:
• Judul: ${item.title}
• URL Asli: ${item.url}
• Domain: ${item.domain}
• Ringkasan Cuplikan: ${item.snippet}

Mohon jelaskan secara terstruktur:
1. **Overview & Karakteristik**: Apakah solusi ini berbasis Cloud (Cloud-Base) atau On-Premises? Apa fungsi utamanya?
2. **Spesifikasi & Fitur Kunci**: Parameter teknis, port, protokol, atau kapabilitas unggulan.
3. **Langkah Implementasi & Best Practice**: Tahapan konfigurasi yang direkomendasikan.
4. **Sintaks CLI / Scripting Ekivalen**: Perintah CLI relevan (Cisco, Fortinet, Palo Alto, dsb.) yang dapat dijalankan di terminal.`;

      onSendToAiAssistant(prompt, {
        url: item.url,
        title: item.title,
        snippet: item.snippet,
        searchQuery: query,
        isWebSearchResult: true,
        domain: item.domain,
      });
    }
  };

  // Summarize whole search results with AI
  const handleSummarizeAllResults = () => {
    if (onSendToAiAssistant && results.length > 0) {
      const topItems = results.slice(0, 5).map(r => `- ${r.title} (${r.domain}): ${r.snippet}`).join('\n');
      const prompt = `Saya sedang mencari topik "${query}". Berikut beberapa referensi teratas yang ditemukan dari Google:
${topItems}

Tolong berikan ringkasan komprehensif yang membandingkan pilihan solusi di atas, rekomendasi implementasi terbaik untuk jaringan enterprise, dan langkah konfigurasinya.`;

      onSendToAiAssistant(prompt, {
        searchQuery: query,
        isWebSearchResult: true,
        totalResults: results.length,
      });
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-neutral-950 text-neutral-100 flex flex-col items-center select-text">
      {/* 1. Google Search Header Bar */}
      <div className="w-full border-b border-neutral-800/80 bg-neutral-900/60 sticky top-0 z-20 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-3">
          {/* Authentic Google Logo */}
          <div 
            onClick={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
            }}
            className="cursor-pointer flex items-center gap-0.5 text-2xl font-bold tracking-tight select-none"
            title="Kembali ke Beranda Google"
          >
            <span className="text-[#4285F4]">G</span>
            <span className="text-[#EA4335]">o</span>
            <span className="text-[#FBBC05]">o</span>
            <span className="text-[#4285F4]">g</span>
            <span className="text-[#34A853]">l</span>
            <span className="text-[#EA4335]">e</span>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSubmit} className="flex-1 max-w-2xl relative">
            <div className="flex items-center bg-neutral-950 border border-neutral-700 focus-within:border-blue-500 rounded-full px-3.5 py-2 gap-2 shadow-lg transition-all">
              <Search className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari di Google..."
                className="flex-1 bg-transparent text-white placeholder:text-neutral-500 text-sm focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-0.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <span>Cari</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </form>
        </div>

        {/* Search Action Bar when searched (Summary All Button & Search Stats) */}
        {hasSearched && (
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-2 border-t border-neutral-800/60 text-xs">
            <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
              <span className="font-mono">Hasil Penelusuran Google: <strong>{results.length}</strong> tautan ditemukan</span>
            </div>

            {results.length > 0 && onSendToAiAssistant && (
              <button
                type="button"
                onClick={handleSummarizeAllResults}
                className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-600/30 to-cyan-600/30 hover:from-blue-600/50 hover:to-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm self-start sm:self-auto"
                title="Minta Asisten AI menganalisa dan merangkum seluruh hasil pencarian ini"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>✨ Buat Summary AI untuk Hasil Ini</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Main Content Area */}
      <div className="w-full max-w-5xl px-4 py-6 flex-1 flex flex-col">
        {/* Loading Spinner */}
        {isSearching && (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-neutral-400 animate-pulse">Menelusuri web & mengambil hasil pencarian Google...</p>
          </div>
        )}

        {/* Home Screen (When not searched yet) - Clean Minimal Google Style */}
        {!hasSearched && !isSearching && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
            <div className="text-5xl font-bold tracking-tight select-none mb-4">
              <span className="text-[#4285F4]">G</span>
              <span className="text-[#EA4335]">o</span>
              <span className="text-[#FBBC05]">o</span>
              <span className="text-[#4285F4]">g</span>
              <span className="text-[#34A853]">l</span>
              <span className="text-[#EA4335]">e</span>
            </div>
            <p className="text-sm text-neutral-400 max-w-md mb-8">
              Ketik kata kunci pencarian, dokumentasi perangkat, atau buka alamat portal cloud langsung.
            </p>

            {/* Quick Access Portals & Network Resources */}
            <div className="w-full max-w-2xl bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 text-left">
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>Akses Cepat Portal Cloud & Perangkat Populer</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { name: 'Cisco Meraki Dashboard', url: 'https://dashboard.meraki.com', desc: 'Cloud Portal', icon: '☁️' },
                  { name: 'FortiCloud Management', url: 'https://support.fortinet.com', desc: 'Fortinet Portal', icon: '🛡️' },
                  { name: 'MikroTik RouterOS Docs', url: 'https://help.mikrotik.com/docs/', desc: 'Official Manual', icon: '⚡' },
                  { name: 'AWS Cloud Console', url: 'https://console.aws.amazon.com', desc: 'Amazon AWS', icon: '☁️' },
                  { name: 'Microsoft Azure Portal', url: 'https://portal.azure.com', desc: 'Azure Cloud', icon: '🔷' },
                  { name: 'Speedtest by Ookla', url: 'https://www.speedtest.net', desc: 'Bandwidth Test', icon: '🚀' },
                ].map((portal, pIdx) => (
                  <div
                    key={pIdx}
                    onClick={() => {
                      setQuery(portal.name);
                      fetchSearchResults(portal.name);
                    }}
                    className="p-2.5 rounded-xl bg-neutral-950/80 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between text-xs font-medium text-white group-hover:text-blue-400 transition-colors">
                      <span className="truncate flex items-center gap-1.5">
                        <span>{portal.icon}</span>
                        <span>{portal.name}</span>
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-neutral-500 group-hover:text-blue-400 flex-shrink-0" />
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-1">{portal.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results Screen */}
        {hasSearched && !isSearching && (
          <div className="space-y-4">
            <div className="text-xs text-neutral-400 font-mono pb-2 border-b border-neutral-800 flex items-center justify-between">
              <span>Menampilkan sekitar <strong>{results.length}</strong> hasil untuk "<strong>{query}</strong>"</span>
              <span className="text-neutral-500 text-[11px]">Klik judul untuk membuka web asli langsung</span>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 bg-neutral-900/50 rounded-2xl border border-neutral-800 p-8 space-y-3">
                <Search className="w-8 h-8 text-neutral-500 mx-auto" />
                <h3 className="text-base font-semibold text-white">Tidak ada hasil ditemukan untuk "{query}"</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  Coba periksa ejaan kata kunci Anda atau coba gunakan istilah pencarian jaringan yang lebih umum.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Google.com Asli di Tab Baru</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((item, idx) => {
                  const isCloud = item.url.includes('meraki') || item.url.includes('aws') || item.url.includes('azure') || item.url.includes('cloud') || item.url.includes('forticloud');
                  const isOnPrem = item.url.includes('192.168.') || item.url.includes('10.') || item.url.includes('172.') || item.title.toLowerCase().includes('catalyst') || item.title.toLowerCase().includes('ios-xe') || item.title.toLowerCase().includes('fortigate');

                  return (
                    <div
                      key={idx}
                      className="bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-all shadow-md group"
                    >
                      {/* Domain & URL Breadcrumb */}
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2 truncate">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=32`}
                            alt=""
                            className="w-4 h-4 rounded-sm flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="text-emerald-400 font-mono text-[11px] truncate">
                            {item.displayUrl || item.domain}
                          </span>
                        </div>

                        {/* Badges for Cloud or On-Prem */}
                        <div className="flex items-center gap-1.5">
                          {isCloud && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono flex items-center gap-1">
                              <span>☁️</span> Cloud-Base
                            </span>
                          )}
                          {isOnPrem && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono flex items-center gap-1">
                              <span>🏢</span> On-Premises
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Result Title - Direct Click Opens Full Real Web */}
                      <h3 
                        onClick={(e) => handleOpenResult(item, e)}
                        className="text-base font-semibold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors leading-snug flex items-center gap-1.5"
                        title="Klik untuk membuka web asli secara penuh di tab baru browser"
                      >
                        <span>{item.title}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-blue-400/70 group-hover:text-blue-300 inline flex-shrink-0" />
                      </h3>

                      {/* Snippet */}
                      <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
                        {item.snippet}
                      </p>

                      {/* Action Bar (Buka Web Asli, Buka di Tab Ini, Buat Summary AI, Salin Link) */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex flex-wrap items-center gap-2 text-xs">
                        {/* 1. Buka Langsung di Web Asli (Full Chrome Experience) */}
                        <button
                          type="button"
                          onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                          className="px-3 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                          title="Buka langsung halaman web asli di tab browser normal tanpa batasan framing"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Buka Web Asli</span>
                        </button>

                        {/* 2. Buka di Tab Ini (Internal) */}
                        <button
                          type="button"
                          onClick={() => onNavigateCurrentTab(item.url, item.title)}
                          className="px-2.5 py-1 rounded-md bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] font-medium flex items-center gap-1 transition-all"
                          title="Buka situs ini di tab internal saat ini"
                        >
                          <Globe className="w-3 h-3 text-blue-400" />
                          <span>Tab Internal</span>
                        </button>

                        {/* 3. Salin Link */}
                        <button
                          type="button"
                          onClick={() => handleCopy(item.url)}
                          className="px-2.5 py-1 rounded-md bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-white text-[11px] flex items-center gap-1 transition-all"
                          title="Salin URL ke clipboard"
                        >
                          {copiedUrl === item.url ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin Link</span>
                            </>
                          )}
                        </button>

                        {/* 4. Buat Summary AI (Dedicated AI Analysis & Product Summary) */}
                        {onSendToAiAssistant && (
                          <button
                            type="button"
                            onClick={() => handleAskAiSummary(item)}
                            className="ml-auto px-3 py-1 rounded-md bg-gradient-to-r from-cyan-950/80 to-blue-950/80 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                            title="Minta Asisten AI membuat ringkasan dan analisa teknis referensi produk / dokumen ini"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>✨ Buat Summary AI</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
