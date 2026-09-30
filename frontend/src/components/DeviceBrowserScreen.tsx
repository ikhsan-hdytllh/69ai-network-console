import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  ExternalLink, 
  Sparkles, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Plus,
  X,
  Search,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  Bookmark,
  Star,
  Edit3,
  Trash2,
  MoreVertical,
  RotateCcw,
  Tag,
  Settings2,
  FolderPlus,
  ArrowUpRight,
  Share2,
  Home,
  Bot,
  Terminal,
  Shield,
  Activity,
  Cloud,
  Server,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Send,
  HelpCircle,
  Cpu,
  Layers,
  Zap,
  Sliders,
  Boxes
} from 'lucide-react';
import { DeviceProfile } from '../types';
import { 
  analyzeWebGuiScreenLocally, 
  WebGuiDiagnosisResult, 
} from '../services/webGuiAnalyzer';
import { analyzeWebGuiScreenDirect } from '../services/aiClientService';
import { copyToClipboard } from '../utils/clipboard';
import { getProxyUrl } from '../utils/apiBase';
import { safeStorage } from '../utils/safeStorage';
import { GoogleSearchView } from './GoogleSearchView';
import { CiscoCcwPanel } from './CiscoCcwPanel';

export interface DeviceBrowserScreenProps {
  activeDevice?: DeviceProfile | null;
  devices?: DeviceProfile[];
  onSelectDevice?: (id: string) => void;
  onUpdateDeviceBrand?: (brand: string) => void;
  isAiPanelOpen?: boolean;
  onToggleAiPanel?: () => void;
  onSendToAiAssistant?: (prompt: string, contextPayload?: any) => void;
  onExecuteInTerminal?: (cmd: string) => void;
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  protocol: 'http' | 'https';
  host: string;
  port: string;
  brand: string;
  isSimulator: boolean;
  favicon?: string;
  environmentType?: 'cloud' | 'onprem';
  history?: string[];
  historyIndex?: number;
}

export interface UserBookmarkItem {
  id: string;
  title: string;
  url: string;
  host: string;
  port: string;
  protocol: 'http' | 'https';
  brand: string;
  environmentType?: 'cloud' | 'onprem' | 'docs';
}

// Device Brand / Type Metadata Preset Interface (For AI Context)
export interface BrandPreset {
  id: string;
  name: string;
  shortName: string;
  badgeColor: string;
  defaultHost?: string;
  defaultPort?: string;
  protocol?: 'http' | 'https';
  environmentType?: 'cloud' | 'onprem';
}

// Badge Color Options for Custom Brands
export const BADGE_COLORS = [
  { label: 'Cyan Blue', value: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { label: 'Royal Blue', value: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { label: 'Emerald Green', value: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { label: 'Ruby Red', value: 'bg-red-500/20 text-red-300 border-red-500/40' },
  { label: 'Rose Pink', value: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { label: 'Amber Orange', value: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { label: 'Purple / Violet', value: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { label: 'Indigo / Navy', value: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { label: 'Teal', value: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { label: 'Slate Gray', value: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
];

// Initial Device Type / Brand Presets (As AI context info)
export const DEFAULT_BRAND_PRESETS: BrandPreset[] = [
  { id: 'cisco-meraki', name: 'Cisco - Meraki (Cloud)', shortName: 'Meraki Cloud', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', environmentType: 'cloud' },
  { id: 'cisco-ios-xe', name: 'Cisco - IOS XE (On-Prem)', shortName: 'IOS XE', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40', environmentType: 'onprem' },
  { id: 'cisco-nexus-os', name: 'Cisco - Nexus-OS (On-Prem)', shortName: 'Nexus-OS', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', environmentType: 'onprem' },
  { id: 'cisco-aci-apic', name: 'Cisco - ACI / APIC', shortName: 'ACI / APIC', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40', environmentType: 'onprem' },
  { id: 'cisco-firepower', name: 'Cisco - Firepower', shortName: 'Firepower', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', environmentType: 'onprem' },
  { id: 'cisco-fmc', name: 'Cisco - FMC', shortName: 'FMC', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', environmentType: 'onprem' },
  { id: 'fortinet-fortigate', name: 'Fortinet - Fortigate', shortName: 'FortiGate', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40', environmentType: 'onprem' },
  { id: 'fortinet-fmg', name: 'Fortinet - FMG (Manager)', shortName: 'FortiManager', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', environmentType: 'onprem' },
  { id: 'fortinet-faz', name: 'Fortinet - FAZ (Analyzer)', shortName: 'FortiAnalyzer', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40', environmentType: 'onprem' },
  { id: 'palo-alto-firewall', name: 'Palo Alto - Firewall (PAN-OS)', shortName: 'Palo Alto', badgeColor: 'bg-amber-600/20 text-amber-300 border-amber-600/40', environmentType: 'onprem' },
  { id: 'f5-web-firewall', name: 'F5 - Web Firewall (BIG-IP)', shortName: 'F5 BIG-IP', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', environmentType: 'onprem' },
  { id: 'ruijie', name: 'Ruijie (Reyee / Switch)', shortName: 'Ruijie', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40', environmentType: 'onprem' },
  { id: 'mikrotik-routeros', name: 'MikroTik - RouterOS (WebFig)', shortName: 'MikroTik', badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-600/40', environmentType: 'onprem' },
  { id: 'openwrt-luci', name: 'OpenWrt - LuCI Gateway', shortName: 'OpenWrt', badgeColor: 'bg-cyan-600/20 text-cyan-300 border-cyan-600/40', environmentType: 'onprem' },
  { id: 'pfsense-firewall', name: 'pfSense / OPNsense Firewall', shortName: 'pfSense', badgeColor: 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40', environmentType: 'onprem' },
  { id: 'juniper-junos', name: 'Juniper - Junos', shortName: 'Junos', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', environmentType: 'onprem' },
  { id: 'aruba-aoscx', name: 'Aruba - AOS-CX', shortName: 'Aruba CX', badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40', environmentType: 'onprem' },
  { id: 'huawei-vrp', name: 'Huawei - VRP', shortName: 'Huawei', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', environmentType: 'onprem' },
  { id: 'aws-console', name: 'AWS Cloud Console', shortName: 'AWS Cloud', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', environmentType: 'cloud' },
  { id: 'forticloud-portal', name: 'FortiCloud Security Portal', shortName: 'FortiCloud', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40', environmentType: 'cloud' },
];

// Initial default bookmarks - empty by user request (no pre-loaded default bookmarks)
const DEFAULT_BOOKMARKS: UserBookmarkItem[] = [];

const LOCAL_STORAGE_BOOKMARKS_KEY = 'device_browser_bookmarks_v3';
const LOCAL_STORAGE_BRANDS_KEY = 'device_browser_brands_v2';

export const DeviceBrowserScreen: React.FC<DeviceBrowserScreenProps> = ({
  activeDevice,
  devices,
  onSelectDevice,
  onUpdateDeviceBrand,
  isAiPanelOpen = false,
  onToggleAiPanel,
  onSendToAiAssistant,
  onExecuteInTerminal,
}) => {
  // Brand Presets State (Editable & Deletable with LocalStorage Persistence)
  const [brands, setBrands] = useState<BrandPreset[]>(() => {
    try {
      const saved = safeStorage.getItem(LOCAL_STORAGE_BRANDS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_BRAND_PRESETS;
  });

  // Tabs State (Like Google Chrome tabs)
  const initialProtocol: 'http' | 'https' = activeDevice?.port === 80 ? 'http' : 'https';
  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: activeDevice ? `${activeDevice.name || activeDevice.host}` : 'Google Search',
      url: activeDevice?.host ? `${initialProtocol}://${activeDevice.host}:${activeDevice.port || (initialProtocol === 'http' ? 80 : 443)}` : 'https://www.google.com',
      protocol: initialProtocol,
      host: activeDevice?.host || 'google.com',
      port: activeDevice?.port ? String(activeDevice.port) : '443',
      brand: activeDevice?.brand || '',
      isSimulator: false,
      history: [activeDevice?.host ? `${initialProtocol}://${activeDevice.host}:${activeDevice.port || (initialProtocol === 'http' ? 80 : 443)}` : 'https://www.google.com'],
      historyIndex: 0,
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Omnibox URL Input (supports host, full URL, port, or search query)
  const [urlInput, setUrlInput] = useState<string>(activeDevice?.host || 'google.com');
  const [portInput, setPortInput] = useState<string>(activeDevice?.port ? String(activeDevice.port) : '443');
  const [protocol, setProtocol] = useState<'http' | 'https'>(initialProtocol);
  const [selectedBrand, setSelectedBrand] = useState<string>(activeDevice?.brand || '');
  
  // Navigation & Dropdowns
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState<boolean>(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const [isOmniboxFocused, setIsOmniboxFocused] = useState<boolean>(false);
  const [isChromeMenuOpen, setIsChromeMenuOpen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Integrated Chrome AI Sidekick Chat Panel State
  const [isAiSidekickOpen, setIsAiSidekickOpen] = useState<boolean>(true);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingSidekickChat, setIsSendingSidekickChat] = useState<boolean>(false);
  const [sidekickMessages, setSidekickMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    text: string;
    timestamp: Date;
    cliCommands?: string[];
    contextInfo?: string;
  }>>([
    {
      id: 'init-1',
      role: 'assistant',
      text: 'Halo! Saya **Asisten Chat AI Chrome** terintegrasi. Saya siap membantu Anda menganalisa layar konfigurasi web, membuat skrip CLI otomatis untuk Cisco, Fortinet, Palo Alto, F5, MikroTik, maupun portal Cloud, serta mengirimkan perintah langsung ke Terminal Router/Switch.',
      timestamp: new Date(),
    }
  ]);

  // Bookmarks Management State
  const [bookmarks, setBookmarks] = useState<UserBookmarkItem[]>(() => {
    try {
      const saved = safeStorage.getItem(LOCAL_STORAGE_BOOKMARKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_BOOKMARKS;
  });

  // Bookmark Modal State
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState<boolean>(false);
  const [editingBookmark, setEditingBookmark] = useState<UserBookmarkItem | null>(null);
  const [bookmarkMenuOpenId, setBookmarkMenuOpenId] = useState<string | null>(null);

  // Brand Type Add / Edit Modal & Manager Modal State
  const [isBrandModalOpen, setIsBrandModalOpen] = useState<boolean>(false);
  const [editingBrand, setEditingBrand] = useState<BrandPreset | null>(null);
  const [isBrandManagerOpen, setIsBrandManagerOpen] = useState<boolean>(false);

  // AI Diagnostics State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [latestDiagnosis, setLatestDiagnosis] = useState<WebGuiDiagnosisResult | null>(null);
  const [isDiagnosisOpen, setIsDiagnosisOpen] = useState<boolean>(false);
  const [isCiscoCcwOpen, setIsCiscoCcwOpen] = useState<boolean>(false);
  const [copiedCliIndex, setCopiedCliIndex] = useState<number | null>(null);

  // Interactive Form Data Simulation
  const [formData, setFormData] = useState<Record<string, string>>({
    wan_connection_type: 'Static IP',
    wan_ip: '203.0.113.10',
    wan_netmask: '255.255.255.252',
    wan_gateway: '203.0.113.9',
    lan_ip: '192.168.1.1',
    lan_netmask: '255.255.255.0',
    dhcp_enabled: 'true',
    nat_enabled: 'true',
    firewall_profile: 'High-Security Strict',
    optical_rx: '-19.5 dBm',
    cpu_load: '14%',
    uptime: '28 days, 12:45:00',
  });

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Save Bookmarks & Brands to LocalStorage
  useEffect(() => {
    try {
      safeStorage.setItem(LOCAL_STORAGE_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      safeStorage.setItem(LOCAL_STORAGE_BRANDS_KEY, JSON.stringify(brands));
    } catch {
      // ignore
    }
  }, [brands]);

  // Helper to format clean display URL for omnibox input
  const getDisplayUrlString = (url: string, host?: string, port?: string, proto?: 'http' | 'https') => {
    if (!url) return '';
    if (url.includes('google.com/search?q=')) {
      return decodeURIComponent(url.split('search?q=')[1]?.split('&')[0] || '');
    }
    if (host === 'google.com' || url === 'https://www.google.com' || url === 'https://google.com') {
      return 'google.com';
    }
    if (host) {
      if ((proto === 'https' && (port === '443' || !port)) || (proto === 'http' && (port === '80' || !port))) {
        return host;
      }
      return `${host}:${port || (proto === 'https' ? '443' : '80')}`;
    }
    return url;
  };

  // Sync inputs whenever active tab changes
  useEffect(() => {
    if (activeTab) {
      setUrlInput(getDisplayUrlString(activeTab.url, activeTab.host, activeTab.port, activeTab.protocol));
      setPortInput(activeTab.port || '443');
      setProtocol(activeTab.protocol || 'https');
      setSelectedBrand(activeTab.brand || '');
    }
  }, [activeTabId]);

  // Sync when activeDevice changes (Only sync if device is configured for Web HTTP/HTTPS or has web ports)
  useEffect(() => {
    if (activeDevice?.host) {
      const isCliDevice = activeDevice.port === 22 || 
                          activeDevice.port === 23 || 
                          (activeDevice as any).connectionType === 'ssh' || 
                          (activeDevice as any).connectionType === 'telnet' ||
                          (activeDevice as any).connectionType === 'serial_cable' ||
                          (activeDevice as any).connectionType === 'serial_bluetooth';

      if (!isCliDevice) {
        const devHost = activeDevice.host;
        const devPort = activeDevice.port ? String(activeDevice.port) : '443';
        const devBrand = activeDevice.brand || 'cisco-ios-xe';
        const devProto = activeDevice.port === 80 ? 'http' : 'https';

        setTabs(prev => prev.map(t => {
          if (t.id === activeTabId) {
            return {
              ...t,
              title: `${activeDevice.name || devHost}`,
              host: devHost,
              port: devPort,
              brand: devBrand,
              protocol: devProto,
              url: `${devProto}://${devHost}:${devPort}`,
            };
          }
          return t;
        }));
        setUrlInput(devHost);
        setPortInput(devPort);
        setProtocol(devProto);
        setSelectedBrand(devBrand);
      }
    }
  }, [activeDevice]);

  // Check if current page is bookmarked
  const currentIsBookmarked = bookmarks.some(
    bm => (bm.host === urlInput || bm.host === activeTab.host) && bm.port === portInput
  );

  // Filtered brands for search
  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(brandSearchQuery.toLowerCase()) ||
    b.shortName.toLowerCase().includes(brandSearchQuery.toLowerCase()) ||
    b.id.toLowerCase().includes(brandSearchQuery.toLowerCase())
  );

  // Get current active brand object (if any selected)
  const currentBrandInfo = selectedBrand ? brands.find(b => b.id === selectedBrand) || null : null;

  // Helper to parse any raw input into clean URL, host, port, protocol, and title
  const parseBrowserInput = (rawInput: string, fallbackProtocol: 'http' | 'https' = 'https', fallbackPort: string = '443') => {
    let clean = rawInput.trim();
    if (!clean) return null;

    // 1. If starts with http:// or https://
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      try {
        const u = new URL(clean);
        const targetProtocol = u.protocol.replace(':', '') as 'http' | 'https';
        const targetHost = u.hostname;
        const targetPort = u.port || (targetProtocol === 'https' ? '443' : '80');
        const displayTitle = u.hostname + (u.pathname && u.pathname !== '/' ? u.pathname : '');
        return {
          url: u.href,
          title: displayTitle,
          host: targetHost,
          port: targetPort,
          protocol: targetProtocol,
        };
      } catch {
        // ignore
      }
    }

    // 2. Check if query is a search keyword or a direct domain / IP
    const hasDot = clean.includes('.');
    const isLocalhost = clean.toLowerCase().startsWith('localhost');
    const isIp = /^(\d{1,3}\.){3}\d{1,3}/.test(clean);

    if (clean.includes(' ') || (!hasDot && !isLocalhost && !isIp)) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
      return {
        url: searchUrl,
        title: `Google: ${clean}`,
        host: 'google.com',
        port: '443',
        protocol: 'https' as const,
      };
    }

    // 3. Domain or IP with optional port and path (e.g., dashboard.meraki.com, 192.168.1.1:8080/gui, 10.0.0.1:8443)
    let inferredProtocol = fallbackProtocol;
    if (clean.includes(':80') && !clean.includes(':8080')) {
      inferredProtocol = 'http';
    } else if (clean.includes(':443') || clean.includes(':8443')) {
      inferredProtocol = 'https';
    }

    let testUrl = clean;
    if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
      // If port is not in clean string and fallbackPort is specified (and not 443/80), append
      if (!clean.includes(':') && fallbackPort && fallbackPort !== '443' && fallbackPort !== '80') {
        testUrl = `${inferredProtocol}://${clean}:${fallbackPort}`;
      } else {
        testUrl = `${inferredProtocol}://${clean}`;
      }
    }

    try {
      const u = new URL(testUrl);
      const targetProtocol = u.protocol.replace(':', '') as 'http' | 'https';
      const targetHost = u.hostname;
      const targetPort = u.port || fallbackPort || (targetProtocol === 'https' ? '443' : '80');
      const displayTitle = u.hostname + (u.pathname && u.pathname !== '/' ? u.pathname : '');
      return {
        url: u.href,
        title: displayTitle,
        host: targetHost,
        port: targetPort,
        protocol: targetProtocol,
      };
    } catch {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
      return {
        url: searchUrl,
        title: `Google: ${clean}`,
        host: 'google.com',
        port: '443',
        protocol: 'https' as const,
      };
    }
  };

  // Navigate to URL or Search Query
  const navigateToUrl = (rawInput: string, explicitPort?: string, explicitProtocol?: 'http' | 'https', explicitBrand?: string, isHistoryNav: boolean = false) => {
    const parsed = parseBrowserInput(rawInput, explicitProtocol || protocol, explicitPort || portInput || '443');
    if (!parsed) return;

    // Auto-detect brand from domain / URL if not explicitly specified
    let detectedBrand = explicitBrand;
    if (detectedBrand === undefined) {
      const lowerHost = parsed.host.toLowerCase();
      const lowerUrl = parsed.url.toLowerCase();
      if (lowerHost.includes('meraki') || lowerUrl.includes('meraki')) {
        detectedBrand = 'cisco-meraki';
      } else if (lowerHost.includes('fortinet') || lowerHost.includes('fortigate') || lowerUrl.includes('forti')) {
        detectedBrand = 'fortinet-fortigate';
      } else if (lowerHost.includes('paloaltonetworks') || lowerHost.includes('pan-os') || lowerUrl.includes('paloalto')) {
        detectedBrand = 'palo-alto-firewall';
      } else if (lowerHost.includes('f5') || lowerHost.includes('bigip')) {
        detectedBrand = 'f5-web-firewall';
      } else if (lowerHost.includes('mikrotik') || lowerUrl.includes('webfig')) {
        detectedBrand = 'mikrotik-routeros';
      } else if (lowerHost.includes('openwrt') || lowerUrl.includes('luci')) {
        detectedBrand = 'openwrt-luci';
      } else if (lowerHost.includes('pfsense') || lowerHost.includes('opnsense')) {
        detectedBrand = 'pfsense-firewall';
      } else if (lowerHost.includes('juniper') || lowerHost.includes('junos')) {
        detectedBrand = 'juniper-junos';
      } else if (lowerHost.includes('aruba') || lowerHost.includes('aoscx')) {
        detectedBrand = 'aruba-aoscx';
      } else if (lowerHost.includes('huawei')) {
        detectedBrand = 'huawei-vrp';
      } else if (lowerHost.includes('aws') || lowerHost.includes('amazon')) {
        detectedBrand = 'aws-console';
      }
    }

    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 400);

    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        let newHistory = t.history || [t.url];
        let newHistoryIndex = t.historyIndex ?? (newHistory.length - 1);

        if (!isHistoryNav) {
          if (newHistory[newHistoryIndex] !== parsed.url) {
            newHistory = [...newHistory.slice(0, newHistoryIndex + 1), parsed.url];
            newHistoryIndex = newHistory.length - 1;
          }
        }

        return {
          ...t,
          title: parsed.title,
          url: parsed.url,
          host: parsed.host,
          port: parsed.port,
          protocol: parsed.protocol,
          brand: detectedBrand !== undefined ? detectedBrand : (selectedBrand || t.brand),
          history: newHistory,
          historyIndex: newHistoryIndex,
        };
      }
      return t;
    }));

    setUrlInput(getDisplayUrlString(parsed.url, parsed.host, parsed.port, parsed.protocol));
    setPortInput(parsed.port);
    setProtocol(parsed.protocol);
    if (detectedBrand !== undefined) {
      setSelectedBrand(detectedBrand);
      if (onUpdateDeviceBrand) onUpdateDeviceBrand(detectedBrand);
    }
  };

  // Browser Navigation History (Back & Forward)
  const canGoBack = (activeTab.historyIndex ?? 0) > 0;
  const canGoForward = (activeTab.historyIndex ?? 0) < ((activeTab.history?.length ?? 1) - 1);

  const handleGoBack = () => {
    if (!activeTab.history || activeTab.history.length <= 1) return;
    const currentIndex = activeTab.historyIndex ?? (activeTab.history.length - 1);
    if (currentIndex > 0) {
      const prevUrl = activeTab.history[currentIndex - 1];
      const parsed = parseBrowserInput(prevUrl, activeTab.protocol, activeTab.port);
      if (parsed) {
        setTabs(prev => prev.map(t => {
          if (t.id === activeTabId) {
            return {
              ...t,
              title: parsed.title,
              url: parsed.url,
              host: parsed.host,
              port: parsed.port,
              protocol: parsed.protocol,
              historyIndex: currentIndex - 1,
            };
          }
          return t;
        }));
        setUrlInput(getDisplayUrlString(parsed.url, parsed.host, parsed.port, parsed.protocol));
        setPortInput(parsed.port);
        setProtocol(parsed.protocol);
      }
    }
  };

  const handleGoForward = () => {
    if (!activeTab.history) return;
    const currentIndex = activeTab.historyIndex ?? (activeTab.history.length - 1);
    if (currentIndex < activeTab.history.length - 1) {
      const nextUrl = activeTab.history[currentIndex + 1];
      const parsed = parseBrowserInput(nextUrl, activeTab.protocol, activeTab.port);
      if (parsed) {
        setTabs(prev => prev.map(t => {
          if (t.id === activeTabId) {
            return {
              ...t,
              title: parsed.title,
              url: parsed.url,
              host: parsed.host,
              port: parsed.port,
              protocol: parsed.protocol,
              historyIndex: currentIndex + 1,
            };
          }
          return t;
        }));
        setUrlInput(getDisplayUrlString(parsed.url, parsed.host, parsed.port, parsed.protocol));
        setPortInput(parsed.port);
        setProtocol(parsed.protocol);
      }
    }
  };

  // Add new tab
  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: 'Google Search',
      url: 'https://www.google.com',
      protocol: 'https',
      host: 'google.com',
      port: '443',
      brand: selectedBrand,
      isSimulator: false,
      history: ['https://www.google.com'],
      historyIndex: 0,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setUrlInput('google.com');
    setPortInput('443');
    setProtocol('https');
  };

  // Open URL in new tab
  const handleOpenInNewTab = (url: string, title?: string) => {
    const parsed = parseBrowserInput(url, protocol, portInput);
    if (!parsed) return;

    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: title || parsed.title,
      url: parsed.url,
      protocol: parsed.protocol,
      host: parsed.host,
      port: parsed.port,
      brand: selectedBrand,
      isSimulator: false,
      history: [parsed.url],
      historyIndex: 0,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setUrlInput(getDisplayUrlString(parsed.url, parsed.host, parsed.port, parsed.protocol));
    setPortInput(parsed.port);
    setProtocol(parsed.protocol);
  };

  // Listen to postMessage from proxied web iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'BROWSER_NAVIGATE' && event.data.url) {
        navigateToUrl(event.data.url);
      } else if (event.data.type === 'BROWSER_NEW_TAB' && event.data.url) {
        handleOpenInNewTab(event.data.url, event.data.title);
      } else if (event.data.type === 'BROWSER_OPEN_GOOGLE') {
        navigateToUrl('google.com');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeTabId, selectedBrand]);

  // Close tab
  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setTabs([{
        id: 'tab-1',
        title: 'Tab Baru',
        url: 'https://www.google.com',
        protocol: 'https',
        host: 'google.com',
        port: '443',
        brand: 'cisco-ios-xe',
        isSimulator: false,
      }]);
      setActiveTabId('tab-1');
      return;
    }

    const filtered = tabs.filter(t => t.id !== id);
    setTabs(filtered);
    if (activeTabId === id) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  // Select Brand / Device Type Context (for AI information without forcing IP or URL navigation)
  const handleSelectBrand = (preset: BrandPreset) => {
    setSelectedBrand(preset.id);
    setIsBrandDropdownOpen(false);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, brand: preset.id } : t));
    onUpdateDeviceBrand?.(preset.id);
  };

  // --- BRAND MANAGEMENT ACTIONS (ADD, EDIT, DELETE, RESET) ---

  const handleStartAddBrand = () => {
    setEditingBrand({
      id: `brand-${Date.now()}`,
      name: '',
      shortName: '',
      badgeColor: BADGE_COLORS[0].value,
    });
    setIsBrandModalOpen(true);
    setIsBrandDropdownOpen(false);
  };

  const handleStartEditBrand = (brand: BrandPreset, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBrand({ ...brand });
    setIsBrandModalOpen(true);
    setIsBrandDropdownOpen(false);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand || !editingBrand.name.trim()) return;

    const formattedShortName = editingBrand.shortName.trim() || editingBrand.name.split('-')[0].trim();
    const finalBrand: BrandPreset = {
      ...editingBrand,
      name: editingBrand.name.trim(),
      shortName: formattedShortName,
    };

    setBrands(prev => {
      const exists = prev.some(b => b.id === finalBrand.id);
      if (exists) {
        return prev.map(b => b.id === finalBrand.id ? finalBrand : b);
      } else {
        return [...prev, finalBrand];
      }
    });

    setIsBrandModalOpen(false);
    setEditingBrand(null);
  };

  const handleDeleteBrand = (brandId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (brands.length <= 1) {
      alert('Minimal harus tersisa 1 tipe brand.');
      return;
    }

    const brandToDelete = brands.find(b => b.id === brandId);
    if (confirm(`Hapus tipe brand "${brandToDelete?.name || brandId}"?`)) {
      setBrands(prev => prev.filter(b => b.id !== brandId));
      if (selectedBrand === brandId) {
        const remaining = brands.filter(b => b.id !== brandId);
        if (remaining.length > 0) {
          setSelectedBrand(remaining[0].id);
        }
      }
    }
  };

  const handleResetBrands = () => {
    if (confirm('Kembalikan seluruh daftar tipe brand ke 12 data awal standar?')) {
      setBrands(DEFAULT_BRAND_PRESETS);
    }
  };

  // --- BOOKMARK ACTIONS ---

  const handleToggleCurrentBookmark = () => {
    if (currentIsBookmarked) {
      setBookmarks(prev => prev.filter(bm => !(bm.host === urlInput && bm.port === portInput)));
    } else {
      setEditingBookmark({
        id: `bm-${Date.now()}`,
        title: activeTab.title || urlInput,
        url: activeTab.url,
        host: urlInput,
        port: portInput,
        protocol: protocol,
        brand: selectedBrand,
      });
      setIsBookmarkModalOpen(true);
    }
  };

  const handleSaveBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookmark || !editingBookmark.title.trim() || !editingBookmark.host.trim()) return;

    setBookmarks(prev => {
      const exists = prev.some(b => b.id === editingBookmark.id);
      if (exists) {
        return prev.map(b => b.id === editingBookmark.id ? editingBookmark : b);
      } else {
        return [...prev, editingBookmark];
      }
    });

    setIsBookmarkModalOpen(false);
    setEditingBookmark(null);
  };

  const handleDeleteBookmark = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarks(prev => prev.filter(bm => bm.id !== id));
    setBookmarkMenuOpenId(null);
  };

  const handleStartEditBookmark = (bm: UserBookmarkItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBookmark({ ...bm });
    setIsBookmarkModalOpen(true);
    setBookmarkMenuOpenId(null);
  };

  const handleResetBookmarks = () => {
    if (confirm('Kembalikan daftar bookmark ke standar awal?')) {
      setBookmarks(DEFAULT_BOOKMARKS);
    }
  };

  // Autocomplete Suggestions
  const autocompleteSuggestions = [
    // Bookmarks
    ...bookmarks.map(bm => ({
      title: bm.title,
      subtitle: `${bm.protocol}://${bm.host}:${bm.port}`,
      url: bm.host,
      port: bm.port,
      protocol: bm.protocol,
      brand: bm.brand,
      type: 'bookmark' as const,
      isCloud: bm.environmentType === 'cloud' || bm.title.includes('Cloud'),
    })),
    // Popular Quick Links
    { title: 'Google Search Engine', subtitle: 'https://www.google.com', url: 'google.com', port: '443', protocol: 'https' as const, brand: '', type: 'search' as const, isCloud: true },
    { title: 'Cisco Official Documentation', subtitle: 'https://www.cisco.com', url: 'cisco.com', port: '443', protocol: 'https' as const, brand: 'cisco-ios-xe', type: 'web' as const, isCloud: true },
    { title: 'Fortinet Document Library', subtitle: 'https://docs.fortinet.com', url: 'docs.fortinet.com', port: '443', protocol: 'https' as const, brand: 'fortinet-fortigate', type: 'web' as const, isCloud: true },
    { title: 'MikroTik Official Wiki & Docs', subtitle: 'https://wiki.mikrotik.com', url: 'wiki.mikrotik.com', port: '443', protocol: 'https' as const, brand: 'mikrotik-routeros', type: 'web' as const, isCloud: true },
  ].filter(item => {
    if (!urlInput.trim()) return true;
    const q = urlInput.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q);
  }).slice(0, 8);

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 175));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 60));
  const handleZoomReset = () => setZoomLevel(100);

  // Home navigation
  const handleGoHome = () => {
    navigateToUrl('google.com');
  };

  // AI Analysis Handler
  const handleRunAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    setIsDiagnosisOpen(true);

    try {
      const localResult = analyzeWebGuiScreenLocally({
        url: `${protocol}://${urlInput}:${portInput}`,
        brand: selectedBrand,
        pageTitle: activeTab.title,
        formData: formData,
      });

      const deepAi = await analyzeWebGuiScreenDirect({
        url: `${protocol}://${urlInput}:${portInput}`,
        brand: selectedBrand,
        pageTitle: activeTab.title,
        formData: formData,
        userQuestion: 'Berikan diagnosis konfigurasi web ini, fungsi setiap parameter, dan rekomendasi optimasi.',
      });

      if (deepAi && deepAi.summary) {
        setLatestDiagnosis({
          ...localResult,
          summary: deepAi.summary || localResult.summary,
          status: (deepAi.status as any) || localResult.status,
          identifiedIssues: deepAi.identifiedIssues || localResult.identifiedIssues,
          explanation: deepAi.explanation || localResult.explanation,
          recommendedSettings: deepAi.recommendedSettings || localResult.recommendedSettings,
          equivalentCliCommands: deepAi.equivalentCliCommands || localResult.equivalentCliCommands,
        });
      } else {
        setLatestDiagnosis(localResult);
      }
    } catch {
      const fallback = analyzeWebGuiScreenLocally({
        url: `${protocol}://${urlInput}:${portInput}`,
        brand: selectedBrand,
        pageTitle: activeTab.title,
        formData: formData,
      });
      setLatestDiagnosis(fallback);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Chrome AI Copilot Sidekick Chat Handler
  const handleSendSidekickMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || isSendingSidekickChat) return;

    const userMsgId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const targetLabel = currentBrandInfo ? currentBrandInfo.name : (activeTab.title || activeTab.host || 'Web');
    const newMessages = [
      ...sidekickMessages,
      {
        id: userMsgId,
        role: 'user' as const,
        text: textToSend,
        timestamp: new Date(),
        contextInfo: `${targetLabel} (${activeTab.url})`,
      }
    ];

    setSidekickMessages(newMessages);
    setChatInput('');
    setIsSendingSidekickChat(true);

    try {
      // Analyze current web GUI & synthesize intelligent response
      const brandObj = currentBrandInfo;
      const isCloudEnv = activeTab.url.includes('meraki') || activeTab.url.includes('cloud') || activeTab.url.includes('aws');
      const deepAi = await analyzeWebGuiScreenDirect({
        url: activeTab.url,
        brand: selectedBrand,
        pageTitle: activeTab.title,
        formData: formData,
        userQuestion: textToSend,
      });

      let responseText = '';
      let extractedCli: string[] = [];

      if (deepAi && deepAi.summary) {
        responseText = `${deepAi.summary}\n\n${deepAi.explanation || ''}`;
        if (deepAi.recommendedSettings && deepAi.recommendedSettings.length > 0) {
          responseText += '\n\n**Rekomendasi Konfigurasi:**\n' + deepAi.recommendedSettings.map(s => `• **${s.parameter}**: \`${s.recommendedValue}\` — ${s.reason}`).join('\n');
        }
        if (deepAi.equivalentCliCommands && deepAi.equivalentCliCommands.length > 0) {
          extractedCli = deepAi.equivalentCliCommands.map(c => c.cliSyntax);
        }
      } else {
        // Fallback knowledge response
        if (brandObj) {
          responseText = `Berikut adalah panduan untuk **${brandObj.name}** pada menu/halaman **${activeTab.title}** (${protocol}://${urlInput}:${portInput}):\n\n1. **Mode Lingkungan**: ${isCloudEnv ? '☁️ Cloud-Based' : '🏢 On-Premises Gateway'}\n2. **Rekomendasi**: Pastikan port ${portInput} terproteksi oleh ACL / Security Group dan gunakan enkripsi TLS.\n3. **Perintah CLI Terkait**: Disesuaikan dengan arsitektur ${brandObj.shortName}.`;
          if (brandObj.id.includes('cisco')) {
            extractedCli = [`show ip interface brief\nshow running-config\nshow version`];
          } else if (brandObj.id.includes('fortinet')) {
            extractedCli = [`get system status\nshow system interface\ndiagnose sys top`];
          } else if (brandObj.id.includes('palo')) {
            extractedCli = [`show system info\nshow interface management`];
          } else if (brandObj.id.includes('mikrotik')) {
            extractedCli = [`/system resource print\n/ip address print\n/ip firewall filter print`];
          }
        } else {
          responseText = `Berikut adalah ringkasan teknis untuk halaman **${activeTab.title || activeTab.host}** (${activeTab.url}):\n\n1. **Tipe Halaman**: ${isCloudEnv ? '☁️ Layanan Cloud / Portal Web' : '🌐 Web Umum / Dokumentasi'}\n2. **URL Target**: \`${activeTab.url}\`\n3. **Analisa**: Halaman siap dianalisa atau disinkronkan dengan perintah terminal. Silakan pilih tipe brand jika halaman ini merupakan GUI perangkat router/switch/firewall.`;
        }
      }

      setSidekickMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          role: 'assistant',
          text: responseText,
          timestamp: new Date(),
          cliCommands: extractedCli,
        }
      ]);
    } catch {
      setSidekickMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          role: 'assistant',
          text: `Maaf, terjadi kendala saat memproses pertanyaan Anda. Namun halaman ${currentBrandInfo?.name || activeTab.title || 'web ini'} dapat Anda periksa melalui CLI Terminal atau dokumen resmi.`,
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsSendingSidekickChat(false);
    }
  };

  // Quick Action in Chrome AI Copilot
  const handleQuickSidekickAction = (actionType: 'analyze' | 'cli' | 'audit' | 'troubleshoot' | 'summary') => {
    const brandLabel = currentBrandInfo ? currentBrandInfo.name : (activeTab.title || 'perangkat / web');
    if (actionType === 'summary') {
      handleSendSidekickMessage(`Tolong buatkan analisa dan ringkasan (summary) teknis lengkap dari referensi produk / dokumen web yang sedang dibuka ini (${activeTab.title} - ${activeTab.url}):
1. Tinjauan arsitektur (Cloud-Base vs On-Premises) & fungsi utamanya.
2. Spesifikasi teknis penting & fitur kunci.
3. Rekomendasi langkah implementasi & best practice konfigurasi.
4. Perintah CLI / skrip konfigurasi setara.`);
    } else if (actionType === 'analyze') {
      handleSendSidekickMessage(`Tolong analisa seluruh halaman GUI ${brandLabel} yang sedang dibuka saat ini (${activeTab.url}) dan jelaskan fungsi parameter utamanya.`);
    } else if (actionType === 'cli') {
      handleSendSidekickMessage(`Buatkan skrip perintah CLI lengkap untuk ${brandLabel} yang setara dengan konfigurasi pada halaman ini agar bisa langsung saya jalankan di terminal.`);
    } else if (actionType === 'audit') {
      handleSendSidekickMessage(`Lakukan audit keamanan terhadap ${brandLabel} di port ${portInput}. Apa saja celah keamanan, port yang harus ditutup, dan best practice pengamanannya?`);
    } else if (actionType === 'troubleshoot') {
      handleSendSidekickMessage(`Bagaimana langkah-langkah troubleshooting jika koneksi atau konfigurasi di ${brandLabel} ini bermasalah?`);
    }
  };

  // Summarize Current Active Web Page / Product
  const handleSummarizeCurrentPage = () => {
    setIsAiSidekickOpen(true);
    handleQuickSidekickAction('summary');
  };

  // Send context to AI Chat Panel
  const handleSendToChat = (customPrompt?: string) => {
    if (onToggleAiPanel && !isAiPanelOpen) {
      onToggleAiPanel();
    }

    const brandName = brands.find(b => b.id === selectedBrand)?.name || selectedBrand;
    const prompt = customPrompt || `Saya sedang membuka web browser perangkat ${brandName} di alamat ${protocol}://${urlInput}:${portInput}.
Tolong bantu jelaskan cara konfigurasi, fungsi setiap parameter pada tampilan ini, dan apa saja rekomendasi best practice nya.`;

    if (onSendToAiAssistant) {
      onSendToAiAssistant(prompt, {
        url: `${protocol}://${urlInput}:${portInput}`,
        host: urlInput,
        port: portInput,
        protocol: protocol,
        brand: selectedBrand,
        formData: formData,
      });
    }
  };

  const [useProxyBypass, setUseProxyBypass] = useState<boolean>(false);
  const [iframeErrorState, setIframeErrorState] = useState<{ hasError: boolean; url: string }>({ hasError: false, url: '' });

  const handleOpenInExternalBrowser = (targetUrl?: string) => {
    const finalUrl = targetUrl || directWebUrl;
    const brandToPass = selectedBrand || 'cisco';
    if (typeof window !== 'undefined') {
      const desktop = (window as any).DesktopNative || (window as any).desktopNative;
      if (desktop && typeof desktop.openInNativeBrowser === 'function') {
        try {
          desktop.openInNativeBrowser(finalUrl, brandToPass);
          return;
        } catch (e) {
          console.warn('DesktopNative.openInNativeBrowser error:', e);
        }
      }
      if ((window as any).AndroidNative?.openInNativeBrowser) {
        try {
          const opened = (window as any).AndroidNative.openInNativeBrowser(finalUrl, brandToPass);
          if (opened) return;
        } catch (e) {
          console.warn('AndroidNative.openInNativeBrowser error:', e);
        }
      }
      if ((window as any).AndroidNative?.openExternalBrowser) {
        try {
          const opened = (window as any).AndroidNative.openExternalBrowser(finalUrl);
          if (opened) return;
        } catch (e) {
          console.warn('AndroidNative.openExternalBrowser error:', e);
        }
      }
    }
    try {
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
  };

  const directWebUrl = activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://')
    ? activeTab.url
    : `${protocol}://${activeTab.url}`;

  const proxyUrl = getProxyUrl(activeTab.url);
  const effectiveIframeUrl = useProxyBypass ? proxyUrl : directWebUrl;

  return (
    <div className="h-full w-full flex flex-col bg-black text-white overflow-hidden font-sans">
      {/* 1. Google Chrome Tab Bar */}
      <div className="h-10 bg-black border-b border-neutral-800 flex items-end px-2 gap-1 overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isGoogleTab = tab.url.includes('google.com') || tab.host === 'google.com';
          const isCloudTab = tab.environmentType === 'cloud' || tab.url.includes('meraki') || tab.url.includes('cloud') || tab.url.includes('aws');

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group relative flex items-center gap-2 max-w-[220px] min-w-[130px] h-8 px-3 rounded-t-lg text-xs font-medium cursor-pointer transition-all border-t border-x ${
                isActive
                  ? 'bg-neutral-900 text-white border-neutral-700 shadow-sm'
                  : 'bg-black text-neutral-400 border-transparent hover:bg-neutral-900/80 hover:text-white'
              }`}
            >
              {isGoogleTab ? (
                <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-blue-400' : 'text-neutral-500'}`} />
              ) : isCloudTab ? (
                <Cloud className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-neutral-500'}`} />
              ) : (
                <Server className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-amber-400' : 'text-neutral-500'}`} />
              )}
              <span className="truncate flex-1 text-[11.5px] text-white">{tab.title}</span>
              <button
                type="button"
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-opacity"
                title="Tutup Tab"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddTab}
          title="Buka Tab Baru (Ctrl+T)"
          className="p-1.5 mb-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Chrome Omnibox Navigation & Tool Bar */}
      <div className="h-12 bg-black border-b border-neutral-800 flex items-center px-3 gap-2 flex-shrink-0 shadow-sm z-30 relative">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1 text-neutral-400">
          <button
            type="button"
            onClick={handleGoBack}
            disabled={!canGoBack}
            title={canGoBack ? "Kembali ke Halaman Sebelumnya" : "Tidak ada halaman sebelumnya"}
            className="p-1.5 rounded-lg hover:bg-neutral-900 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleGoForward}
            disabled={!canGoForward}
            title={canGoForward ? "Maju ke Halaman Berikutnya" : "Tidak ada halaman berikutnya"}
            className="p-1.5 rounded-lg hover:bg-neutral-900 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigateToUrl(urlInput, portInput, protocol)}
            title="Muat Ulang (Reload)"
            className={`p-1.5 rounded-lg hover:bg-neutral-900 hover:text-white ${isLoading ? 'animate-spin text-blue-400' : ''}`}
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleGoHome}
            title="Halaman Utama / Google Search"
            className="p-1.5 rounded-lg hover:bg-neutral-900 hover:text-white text-neutral-400"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox Address Bar */}
        <div className="flex-1 relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setIsOmniboxFocused(false);
              navigateToUrl(urlInput);
            }}
            className="flex items-center bg-neutral-950 border border-neutral-800 focus-within:border-blue-500 rounded-full px-3 py-1.5 gap-2 shadow-inner text-xs transition-colors"
          >
            {/* Protocol / Lock Icon */}
            <div 
              className="flex items-center text-neutral-400 pl-0.5"
              title={protocol === 'https' ? 'Koneksi Aman (HTTPS)' : 'Koneksi HTTP'}
            >
              {protocol === 'https' ? (
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>

            {/* URL / IP / Search Full Input */}
            <input
              type="text"
              value={urlInput}
              onFocus={() => setIsOmniboxFocused(true)}
              onBlur={() => setTimeout(() => setIsOmniboxFocused(false), 200)}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Ketik URL, IP (contoh: 192.168.1.1:8080), domain (meraki.com), atau cari di Google..."
              className="flex-1 bg-transparent text-white placeholder:text-neutral-500 focus:outline-none text-xs font-mono"
            />

            {/* ⭐ Star / Bookmark Button */}
            <button
              type="button"
              id="btn-star-bookmark-current"
              onClick={handleToggleCurrentBookmark}
              title={currentIsBookmarked ? 'Halaman ini sudah dibookmark (Klik untuk hapus/ubah)' : 'Bookmark halaman ini (Bintang)'}
              className={`p-1 rounded-full transition-all ${
                currentIsBookmarked 
                  ? 'text-amber-400 hover:text-amber-300 scale-110' 
                  : 'text-neutral-500 hover:text-amber-400 hover:bg-neutral-900'
              }`}
            >
              <Star className={`w-4 h-4 ${currentIsBookmarked ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Go / Submit Button */}
            <button
              type="submit"
              title="Buka Halaman (Enter)"
              className="p-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors flex-shrink-0"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Autocomplete Suggestions Dropdown */}
          {isOmniboxFocused && autocompleteSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-neutral-900 border border-neutral-750 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
              <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 border-b border-neutral-800 flex items-center justify-between">
                <span>Rekomendasi & Bookmark Cepat (Cloud & On-Premises)</span>
                <span className="text-neutral-500">Tekan Enter untuk buka</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {autocompleteSuggestions.map((sug, idx) => (
                  <button
                    key={`${sug.url}-${idx}`}
                    type="button"
                    onMouseDown={() => {
                      navigateToUrl(sug.url, sug.port, sug.protocol, sug.brand);
                      setIsOmniboxFocused(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-800/90 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {sug.isCloud ? (
                        <Cloud className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      ) : (
                        <Server className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="text-xs text-neutral-200 group-hover:text-white font-medium truncate">{sug.title}</div>
                        <div className="text-[10px] text-neutral-500 font-mono truncate">{sug.subtitle}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-500 group-hover:text-cyan-400 font-mono px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800">
                      {sug.type === 'bookmark' ? 'Bookmark' : sug.type === 'search' ? 'Search' : 'Web'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: Tipe Device (Replacing AI Copilot Button) + Diagnostics + Chrome Menu */}
        <div className="flex items-center gap-1.5">
          {/* 🏷️ Tipe Device / Brand Selector Dropdown (Replaces AI Copilot button) */}
          <div className="relative">
            {currentBrandInfo ? (
              <div className="flex items-center">
                <button
                  type="button"
                  id="btn-brand-selector-active"
                  onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg border text-xs font-semibold shadow-sm transition-all ${currentBrandInfo.badgeColor}`}
                  title="Tipe Perangkat Aktif (Klik untuk ganti tipe device)"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>{currentBrandInfo.shortName}</span>
                  <ChevronDown className="w-3 h-3 opacity-75" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBrand('');
                    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, brand: '' } : t));
                  }}
                  className={`px-2 py-1.5 rounded-r-lg border-y border-r text-xs font-medium transition-all hover:bg-neutral-800 text-neutral-400 hover:text-white ${currentBrandInfo.badgeColor}`}
                  title="Hapus tipe brand (Jadikan web umum)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-brand-selector-empty"
                onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}
                className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-750 transition-all shadow-sm"
                title="Pilih tipe perangkat konfigurasi jika web ini adalah GUI Router/Switch/Firewall/Cloud"
              >
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tipe Device</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
            )}

            {isBrandDropdownOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-neutral-750 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search & Header */}
                <div className="px-3 py-1.5 border-b border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-300">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Pilih Tipe Device / Brand ({brands.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBrandManagerOpen(true);
                        setIsBrandDropdownOpen(false);
                      }}
                      className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
                      title="Buka Pengelola Brand"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>Kelola</span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      value={brandSearchQuery}
                      onChange={(e) => setBrandSearchQuery(e.target.value)}
                      placeholder="Cari Cisco, Fortinet, F5, Ruijie..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Brand List */}
                <div className="max-h-60 overflow-y-auto py-1">
                  {/* Option: None / Non-Device (Web Umum) */}
                  <div
                    className={`group px-3 py-1.5 text-xs flex items-center justify-between transition-colors border-b border-neutral-800/60 ${
                      !selectedBrand ? 'bg-blue-600/15 text-blue-300 font-medium' : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBrand('');
                        setIsBrandDropdownOpen(false);
                        setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, brand: '' } : t));
                      }}
                      className="flex-1 text-left flex items-center gap-2 truncate"
                    >
                      <Globe className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Tanpa Tipe (Bukan Perangkat Konfigurasi)</span>
                    </button>
                  </div>

                  {filteredBrands.map((preset) => {
                    const isSelected = preset.id === selectedBrand;
                    return (
                      <div
                        key={preset.id}
                        className={`group px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-blue-600/15 text-blue-300' : 'text-neutral-200 hover:bg-neutral-800/80 hover:text-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectBrand(preset)}
                          className="flex-1 text-left flex items-center gap-2 truncate"
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-blue-400' : 'bg-neutral-600 group-hover:bg-cyan-400'}`} />
                          <span className="truncate font-medium">{preset.name}</span>
                        </button>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-1">
                          <button
                            type="button"
                            onClick={(e) => handleStartEditBrand(preset, e)}
                            className="p-1 rounded text-neutral-400 hover:text-blue-400 hover:bg-neutral-700/80"
                            title="Edit Tipe Brand Ini"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBrand(preset.id, e)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-700/80"
                            title="Hapus Tipe Brand Ini"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredBrands.length === 0 && (
                    <div className="px-3 py-3 text-center text-neutral-500 text-xs">
                      Tidak ada tipe brand ditemukan.
                    </div>
                  )}
                </div>

                {/* Footer: Add Brand & Reset Actions */}
                <div className="px-2 pt-1.5 pb-1 border-t border-neutral-800 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={handleStartAddBrand}
                    className="flex-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Brand Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetBrands}
                    className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
                    title="Reset ke 12 Brand Awal"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 🌐 Open in 69 AI Native Browser / Chrome Tab */}
          <button
            type="button"
            id="btn-browser-open-external"
            onClick={() => handleOpenInExternalBrowser(activeTab.url)}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-md shadow-cyan-950/40 transition-all flex items-center gap-1.5 text-xs font-semibold flex-shrink-0"
            title="Luncurkan 69 AI Browser (Browser Mandiri Native Bebas Blokir Frame, Full Cookies & SSO)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11.5px] font-semibold">69 AI Browser</span>
            <ExternalLink className="w-3 h-3 text-cyan-200" />
          </button>

          {/* 🔷 Cisco CCW Specialist Toggle */}
          <button
            type="button"
            id="btn-browser-cisco-ccw"
            onClick={() => setIsCiscoCcwOpen(!isCiscoCcwOpen)}
            className={`p-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-all ${
              isCiscoCcwOpen
                ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30 font-bold'
                : 'bg-sky-950/80 text-sky-300 hover:bg-sky-900 border border-sky-700/60'
            }`}
            title="Buka Cisco CCW AI BoQ Specialist & Option Explainer"
          >
            <Boxes className={`w-3.5 h-3.5 ${isCiscoCcwOpen ? 'text-slate-950' : 'text-sky-400'}`} />
            <span className="hidden md:inline font-mono text-[11px]">CCW AI</span>
          </button>

          {/* ✨ 69 AI Chat & Diagnostics Toggle */}
          <button
            type="button"
            id="btn-browser-ai-diagnose"
            onClick={() => onToggleAiPanel?.()}
            className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-medium transition-all ${
              isAiPanelOpen 
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-semibold' 
                : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-750'
            }`}
            title="Buka / Tutup 69 AI Assistant & Chat Panel"
          >
            <Sparkles className={`w-4 h-4 ${isAiPanelOpen ? 'text-black fill-black' : 'text-amber-400'}`} />
          </button>

          {/* ⋮ Chrome 3-Dots Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsChromeMenuOpen(!isChromeMenuOpen)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Menu Google Chrome"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isChromeMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-2 w-56 bg-neutral-900 border border-neutral-750 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-neutral-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 border-b border-neutral-800 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-neutral-400">Zoom Tampilan:</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={handleZoomOut} className="p-1 hover:bg-neutral-800 rounded" title="Perkecil">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-cyan-400 px-1">{zoomLevel}%</span>
                    <button type="button" onClick={handleZoomIn} className="p-1 hover:bg-neutral-800 rounded" title="Perbesar">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={handleZoomReset} className="text-[10px] text-neutral-400 hover:text-white ml-1">
                      Reset
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleAddTab();
                    setIsChromeMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tab Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenInExternalBrowser(activeTab.url);
                    setIsChromeMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Buka di Tab Asli Browser</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(activeTab.url);
                    setIsChromeMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Salin URL Halaman</span>
                </button>

                <div className="border-t border-neutral-800 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsBrandManagerOpen(true);
                    setIsChromeMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pengelola 12 Brand & Presets</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleResetBookmarks();
                    setIsChromeMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center gap-2 text-neutral-400 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Reset Semua Bookmark Standar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Interactive Bookmarks Bar */}
      <div className="h-8 bg-black border-b border-neutral-800 px-2 flex items-center gap-1.5 overflow-x-auto text-[11px] flex-shrink-0">
        {/* Leftmost AI Summary Icon Button */}
        <button
          type="button"
          onClick={handleSummarizeCurrentPage}
          className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-cyan-300 hover:text-white border border-neutral-700 transition-all flex items-center justify-center flex-shrink-0 shadow-sm"
          title="Summary AI: Analisa & Rangkum halaman/perangkat ini dengan AI Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        </button>

        <div className="h-4 w-px bg-neutral-800 flex-shrink-0" />

        {/* Dynamic Bookmarks */}
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
          {bookmarks.map((bm) => {
            const isCurrent = (bm.host === urlInput || bm.host === activeTab.host) && bm.port === portInput;
            const isMenuOpen = bookmarkMenuOpenId === bm.id;
            const isCloud = bm.environmentType === 'cloud' || bm.title.includes('Cloud') || bm.title.includes('Meraki');

            return (
              <div 
                key={bm.id} 
                className="relative group flex items-center flex-shrink-0"
              >
                <button
                  type="button"
                  onClick={() => navigateToUrl(bm.host, bm.port, bm.protocol, bm.brand)}
                  className={`px-2 py-0.5 rounded flex items-center gap-1.5 transition-all whitespace-nowrap text-[11px] ${
                    isCurrent 
                      ? 'bg-neutral-900 text-blue-300 font-semibold border border-neutral-700' 
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                  }`}
                  title={`${bm.title} (${bm.protocol}://${bm.host}:${bm.port}) - Klik untuk buka`}
                >
                  {isCloud ? (
                    <Cloud className="w-3 h-3 text-cyan-400" />
                  ) : (
                    <Server className="w-3 h-3 text-amber-400" />
                  )}
                  <span>{bm.title}</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBookmarkMenuOpenId(isMenuOpen ? null : bm.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-700 text-neutral-400 hover:text-white transition-opacity ml-[-2px]"
                  title="Menu Bookmark (Edit / Hapus)"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>

                {isMenuOpen && (
                  <div 
                    className="absolute left-0 top-full mt-1 w-36 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setBookmarkMenuOpenId(null)}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleStartEditBookmark(bm, e)}
                      className="w-full text-left px-2.5 py-1 text-xs text-neutral-200 hover:bg-neutral-800 flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3 h-3 text-blue-400" />
                      <span>Edit Bookmark</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteBookmark(bm.id, e)}
                      className="w-full text-left px-2.5 py-1 text-xs text-rose-400 hover:bg-neutral-800 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus Bookmark</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Bookmark Button */}
        <button
          type="button"
          id="btn-add-new-bookmark"
          onClick={() => {
            setEditingBookmark({
              id: `bm-${Date.now()}`,
              title: activeTab.title || 'Bookmark Baru',
              url: activeTab.url,
              host: urlInput,
              port: portInput,
              protocol: protocol,
              brand: selectedBrand,
            });
            setIsBookmarkModalOpen(true);
          }}
          className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors flex items-center gap-1 ml-1 flex-shrink-0"
          title="Tambah Bookmark Baru"
        >
          <Plus className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] hidden md:inline text-neutral-400">Tambah</span>
        </button>
      </div>

      {/* 4. Main Chrome Stage (Split View: Web Browser Left + Integrated Chrome AI Copilot Right) */}
      <div className="flex-1 relative flex flex-row min-h-0 bg-neutral-950 overflow-hidden">
        {/* Left / Center: Browser Viewport */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-neutral-900">
          {isLoading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse z-20" />
          )}

          {activeTab.url.includes('google.com') || activeTab.host === 'google.com' ? (
            <div className="flex-1 w-full h-full overflow-y-auto" style={{ zoom: `${zoomLevel}%` }}>
              <GoogleSearchView
                initialQuery={(() => {
                  try {
                    if (activeTab.url.includes('search?q=')) {
                      return decodeURIComponent(activeTab.url.split('search?q=')[1]?.split('&')[0] || '');
                    }
                    if (activeTab.url.includes('?q=')) {
                      return decodeURIComponent(activeTab.url.split('?q=')[1]?.split('&')[0] || '');
                    }
                  } catch {
                    // ignore
                  }
                  return '';
                })()}
                onNavigateCurrentTab={(url, title) => navigateToUrl(url)}
                onOpenInNewTab={(url, title) => handleOpenInNewTab(url, title)}
                onSendToAiAssistant={onSendToAiAssistant}
                onExecuteInTerminal={onExecuteInTerminal}
              />
            </div>
          ) : (
            <div className="flex-1 w-full h-full flex flex-col relative" style={{ zoom: `${zoomLevel}%` }}>
              {/* Standalone Web Action & Status Bar */}
              <div className="h-9 bg-neutral-950 border-b border-neutral-800 px-3 flex items-center justify-between text-[11px] text-neutral-300 flex-shrink-0 z-10 gap-2">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${useProxyBypass ? 'bg-cyan-400' : 'bg-emerald-400'} animate-pulse`} />
                  <span className="font-mono text-cyan-300 truncate max-w-[220px] sm:max-w-[320px]">
                    {directWebUrl}
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9.5px] bg-neutral-800 text-neutral-400 border border-neutral-700">
                    {useProxyBypass ? 'Bypass Proxy Active' : 'Direct Web Mode'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setUseProxyBypass(!useProxyBypass)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-medium border flex items-center gap-1 transition-colors ${
                      useProxyBypass 
                        ? 'bg-cyan-950/60 border-cyan-700 text-cyan-300 hover:bg-cyan-900/60' 
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                    }`}
                    title={useProxyBypass ? "Matikan proxy (Gunakan koneksi direct)" : "Nyalakan Anti-Blokir Proxy (Hapus X-Frame-Options/CSP)"}
                  >
                    <Shield className="w-3 h-3 text-cyan-400" />
                    <span className="hidden xs:inline">{useProxyBypass ? 'Anti-Blokir' : 'Direct'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenInExternalBrowser(directWebUrl)}
                    className="px-2.5 py-1 rounded bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-[10.5px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                    title="Buka langsung di 69 AI Native Browser (bebas batasan frame, login SSO aktif)"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Luncurkan 69 AI Browser</span>
                    <ExternalLink className="w-2.5 h-2.5 text-cyan-200" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendSidekickMessage(`Tolong analisa konfigurasi dan rekomendasi untuk halaman web: ${directWebUrl}`)}
                    className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10.5px] flex items-center gap-1 border border-neutral-700 transition-colors"
                    title="Tanya AI Copilot tentang halaman ini"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span className="hidden sm:inline">Tanya AI</span>
                  </button>
                </div>
              </div>

              {typeof window !== 'undefined' && (window as any).DesktopNative?.isElectron ? (
                // Native Chromium WebView on macOS Desktop (Bypasses iframe & X-Frame-Options, enables full login for Meraki/AWS/Google)
                React.createElement('webview', {
                  src: directWebUrl,
                  className: 'w-full flex-1 border-none bg-white',
                  allowpopups: 'true',
                  webpreferences: 'contextIsolation=no, nodeIntegration=no, sandbox=no',
                })
              ) : (
                <div className="w-full flex-1 relative bg-neutral-900">
                  <iframe
                    ref={iframeRef}
                    key={`${activeTab.id}-${effectiveIframeUrl}`}
                    src={effectiveIframeUrl}
                    title={activeTab.title}
                    className="w-full h-full border-none bg-white"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-downloads allow-top-navigation-by-user-activation"
                    onError={() => {
                      setIframeErrorState({ hasError: true, url: directWebUrl });
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* AI Diagnostics Drawer (Bottom expandable) */}
          {isDiagnosisOpen && latestDiagnosis && (
            <div className="h-64 bg-neutral-900 border-t border-neutral-800 flex flex-col flex-shrink-0 shadow-2xl z-30 animate-in slide-in-from-bottom duration-200">
              <div className="h-9 bg-neutral-950 px-3 border-b border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-xs text-white">Hasil Diagnosis AI Layar Web:</span>
                  <span className="text-[11px] text-neutral-400 font-mono">({protocol}://{urlInput}:{portInput})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendSidekickMessage(`Hasil diagnosis web: ${latestDiagnosis.summary}. Tolong jelaskan lebih detail cara memperbaiki masalah ini.`)}
                    className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Tanyakan ke AI Sidekick</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDiagnosisOpen(false)}
                    className="p-1 text-neutral-400 hover:text-white rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
                  <div className="font-medium text-cyan-300 mb-1">Ringkasan Diagnosis:</div>
                  <p className="text-neutral-300 leading-relaxed">{latestDiagnosis.summary}</p>
                </div>

                {latestDiagnosis.recommendedSettings && latestDiagnosis.recommendedSettings.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
                    <div className="font-medium text-emerald-300 mb-1.5">Rekomendasi Konfigurasi Optimal:</div>
                    <div className="space-y-1">
                      {latestDiagnosis.recommendedSettings.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2 text-neutral-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-mono text-cyan-300">{rec.parameter}</span>: Ubah ke <span className="font-mono text-emerald-300 font-semibold">{rec.recommendedValue}</span> ({rec.reason})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Integrated Chrome AI Copilot Chat Panel */}
        {isAiSidekickOpen && (
          <div className="w-80 md:w-96 border-l border-neutral-800 bg-neutral-950 flex flex-col h-full z-20 flex-shrink-0 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="h-11 px-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Chrome AI Copilot</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-full font-mono">Live</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono truncate max-w-[170px]">
                    {currentBrandInfo ? `${currentBrandInfo.shortName} • ` : ''}{activeTab.host}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAiSidekickOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800"
                title="Tutup Panel AI"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Context Banner */}
            <div className="px-3 py-1.5 bg-neutral-900/40 border-b border-neutral-800/80 flex items-center justify-between text-[10.5px]">
              <div className="flex items-center gap-1 text-neutral-400">
                <span>Target:</span>
                <span className="text-cyan-400 font-semibold truncate max-w-[120px]">
                  {currentBrandInfo ? currentBrandInfo.name : (activeTab.title || activeTab.host || 'Web')}
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono">
                Port {portInput}
              </span>
            </div>

            {/* Quick Prompt Chips */}
            <div className="p-2 border-b border-neutral-800/60 bg-neutral-950 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleQuickSidekickAction('summary')}
                className="px-2 py-1 rounded bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 hover:text-white text-[10.5px] font-medium flex items-center gap-1 border border-cyan-800/60 transition-colors"
                title="Ringkas referensi produk / dokumen web aktif"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>✨ Ringkas Halaman</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickSidekickAction('analyze')}
                className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[10.5px] flex items-center gap-1 border border-neutral-800 transition-colors"
              >
                <FileText className="w-3 h-3 text-blue-400" />
                <span>Analisa GUI</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickSidekickAction('cli')}
                className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-emerald-300 hover:text-emerald-200 text-[10.5px] flex items-center gap-1 border border-neutral-800 transition-colors"
              >
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Buatkan Skrip CLI</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickSidekickAction('audit')}
                className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 text-[10.5px] flex items-center gap-1 border border-neutral-800 transition-colors"
              >
                <Shield className="w-3 h-3 text-amber-400" />
                <span>Audit Port</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickSidekickAction('troubleshoot')}
                className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-blue-300 hover:text-blue-200 text-[10.5px] flex items-center gap-1 border border-neutral-800 transition-colors"
              >
                <HelpCircle className="w-3 h-3 text-blue-400" />
                <span>Troubleshoot</span>
              </button>
            </div>

            {/* Messages List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              {sidekickMessages.map((msg, sIdx) => (
                <div
                  key={`${msg.id || 'sk-msg'}-${sIdx}`}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-3 rounded-xl max-w-[92%] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                        : 'bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-[11.5px]">{msg.text}</div>

                    {/* Extracted CLI Commands with 1-click Execute in Terminal */}
                    {msg.cliCommands && msg.cliCommands.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-800 space-y-2">
                        <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Perintah CLI Otomatis:</div>
                        {msg.cliCommands.map((cli, ci) => (
                          <div key={ci} className="bg-neutral-950 p-2 rounded border border-neutral-800 font-mono text-[10.5px] text-emerald-400 relative group">
                            <pre className="whitespace-pre-wrap overflow-x-auto">{cli}</pre>
                            <div className="mt-1.5 flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(cli)}
                                className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-[10px] flex items-center gap-1"
                                title="Salin skrip CLI"
                              >
                                <Copy className="w-2.5 h-2.5" />
                                <span>Salin</span>
                              </button>
                              {onExecuteInTerminal && (
                                <button
                                  type="button"
                                  onClick={() => onExecuteInTerminal(cli)}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1"
                                  title="Kirim dan jalankan langsung di Terminal Router/Switch"
                                >
                                  <Terminal className="w-2.5 h-2.5" />
                                  <span>Jalankan di Terminal</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-neutral-500 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {isSendingSidekickChat && (
                <div className="flex items-center gap-2 text-neutral-400 p-2 bg-neutral-900 rounded-lg text-xs animate-pulse">
                  <Bot className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span>AI Copilot sedang menganalisa konfigurasi...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendSidekickMessage();
              }}
              className="p-2.5 bg-neutral-900/90 border-t border-neutral-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Tanya AI seputar ${currentBrandInfo ? currentBrandInfo.shortName : 'web ini'}...`}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingSidekickChat}
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white transition-colors flex-shrink-0"
                title="Kirim Pertanyaan"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Right Side: Cisco CCW AI Specialist & BoQ Builder Panel */}
        {isCiscoCcwOpen && (
          <div className="w-80 md:w-96 border-l border-neutral-800 bg-slate-950 flex flex-col h-full z-20 flex-shrink-0 shadow-2xl animate-in slide-in-from-right duration-200">
            <CiscoCcwPanel
              activeUrl={directWebUrl}
              onClose={() => setIsCiscoCcwOpen(false)}
              onSendToAiAssistant={onSendToAiAssistant}
              onExecuteInTerminal={onExecuteInTerminal}
            />
          </div>
        )}
      </div>

      {/* 5. Bookmark Add / Edit Modal */}
      {isBookmarkModalOpen && editingBookmark && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <h3 className="font-semibold text-sm text-white">
                  {bookmarks.some(b => b.id === editingBookmark.id) ? 'Edit Bookmark' : 'Tambah Bookmark Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBookmarkModalOpen(false);
                  setEditingBookmark(null);
                }}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBookmark} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Nama / Judul Bookmark:</label>
                <input
                  type="text"
                  required
                  value={editingBookmark.title}
                  onChange={(e) => setEditingBookmark({ ...editingBookmark, title: e.target.value })}
                  placeholder="Contoh: Cisco IOS-XE Core Switch"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-neutral-300 font-medium mb-1">IP Address / Domain:</label>
                  <input
                    type="text"
                    required
                    value={editingBookmark.host}
                    onChange={(e) => setEditingBookmark({ ...editingBookmark, host: e.target.value })}
                    placeholder="192.168.1.1"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Port Bebas:</label>
                  <input
                    type="text"
                    required
                    value={editingBookmark.port}
                    onChange={(e) => setEditingBookmark({ ...editingBookmark, port: e.target.value })}
                    placeholder="443"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-cyan-300 font-mono text-center focus:outline-none focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Protokol Web:</label>
                  <select
                    value={editingBookmark.protocol}
                    onChange={(e) => setEditingBookmark({ ...editingBookmark, protocol: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                  >
                    <option value="https">HTTPS (Secure/SSL)</option>
                    <option value="http">HTTP (Standar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Tipe / Brand Perangkat:</label>
                  <select
                    value={editingBookmark.brand}
                    onChange={(e) => setEditingBookmark({ ...editingBookmark, brand: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                  >
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-neutral-800">
                {bookmarks.some(b => b.id === editingBookmark.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteBookmark(editingBookmark.id);
                      setIsBookmarkModalOpen(false);
                      setEditingBookmark(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBookmarkModalOpen(false);
                      setEditingBookmark(null);
                    }}
                    className="px-3 py-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-md"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Bookmark</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Brand / Type Add & Edit Modal */}
      {isBrandModalOpen && editingBrand && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-sm text-white">
                  {brands.some(b => b.id === editingBrand.id) ? 'Edit Tipe / Brand' : 'Tambah Tipe / Brand Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsBrandModalOpen(false);
                  setEditingBrand(null);
                }}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">Nama Lengkap Brand / Tipe:</label>
                <input
                  type="text"
                  required
                  value={editingBrand.name}
                  onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })}
                  placeholder="Contoh: Cisco - Meraki, Fortinet - Fortigate, Ruijie"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Nama Singkat / Label Badge:</label>
                <input
                  type="text"
                  value={editingBrand.shortName}
                  onChange={(e) => setEditingBrand({ ...editingBrand, shortName: e.target.value })}
                  placeholder="Contoh: Meraki, FortiGate, Ruijie"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">Warna Badge / Tema:</label>
                <select
                  value={editingBrand.badgeColor}
                  onChange={(e) => setEditingBrand({ ...editingBrand, badgeColor: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-xs"
                >
                  {BADGE_COLORS.map((c, i) => (
                    <option key={i} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-neutral-800">
                {brands.some(b => b.id === editingBrand.id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteBrand(editingBrand.id);
                      setIsBrandModalOpen(false);
                      setEditingBrand(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 hover:bg-rose-900 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBrandModalOpen(false);
                      setEditingBrand(null);
                    }}
                    className="px-3 py-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-md"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Brand</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Comprehensive Brand / Type Manager Modal */}
      {isBrandManagerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                <h3 className="font-semibold text-sm text-white">Kelola Tipe / Brand Perangkat ({brands.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBrandManagerOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between gap-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={brandSearchQuery}
                  onChange={(e) => setBrandSearchQuery(e.target.value)}
                  placeholder="Cari tipe brand..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartAddBrand}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Brand</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetBrands}
                  className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Kembalikan ke daftar brand awal"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Awal</span>
                </button>
              </div>
            </div>

            {/* Brands Table / List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredBrands.map((preset, idx) => (
                <div 
                  key={preset.id}
                  className="bg-neutral-950 border border-neutral-800/90 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-neutral-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-neutral-500 font-mono text-xs w-5 text-right">{idx + 1}.</span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-medium ${preset.badgeColor}`}>
                      {preset.shortName}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate">{preset.name}</div>
                      <div className="text-[11px] text-neutral-400">
                        Informasi AI Context & Diagnosis
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectBrand(preset);
                        setIsBrandManagerOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs transition-colors"
                      title="Gunakan tipe perangkat ini sebagai konteks AI"
                    >
                      Pilih
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEditBrand(preset)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-400 hover:bg-neutral-800 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBrand(preset.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {filteredBrands.length === 0 && (
                <div className="py-8 text-center text-neutral-500 text-xs">
                  Tidak ada tipe brand ditemukan.
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-neutral-950 border-t border-neutral-800 text-right flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsBrandManagerOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
