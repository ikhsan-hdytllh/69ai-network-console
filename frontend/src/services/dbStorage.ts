import { safeStorage } from "../utils/safeStorage";
import { DEVICE_PASSWORD_PLACEHOLDER, deviceSecretName, isVaultPlaceholder, vaultAvailable, vaultSet } from '../utils/secretVault';
import { CommandReference, DeviceProfile, ChatSession, OnlineSearchDoc, LocalDatabaseStats, DeviceModelOption, DeviceBrand } from '../types';
import { OFFLINE_COMMAND_DATABASE } from '../data/offlineCommandDatabase';
import { BRAND_CATALOG, BrandInfo } from '../data/deviceCatalog';

const STORAGE_KEYS = {
  DEVICES: '69ai_devices_v2',
  CACHED_COMMANDS: '69ai_cached_commands_v2',
  CUSTOM_BRANDS: '69ai_custom_brands_v2',
  CUSTOM_MODELS: '69ai_custom_models_v2',
  ONLINE_DOCS: '69ai_online_docs_v2',
  CHAT_SESSIONS: '69ai_chat_sessions_v2',
  ACTIVE_DEVICE_ID: '69ai_active_device_id',
  OPEN_TAB_IDS: '69ai_open_tab_ids_v2',
};

const DB_NAME = '69AI_LOCAL_DATABASE';
const DB_VERSION = 2;

// Default seed devices is empty - only device model variants catalog is preserved
export const DEFAULT_DEVICES: DeviceProfile[] = [];

// Open native IndexedDB with promise wrapper
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported in current environment'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        try {
          const db = event.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains('devices')) {
            db.createObjectStore('devices', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('cached_commands')) {
            db.createObjectStore('cached_commands', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('online_docs')) {
            db.createObjectStore('online_docs', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('chat_sessions')) {
            db.createObjectStore('chat_sessions', { keyPath: 'id' });
          }
        } catch (err) {
          reject(err);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

// Background sync to IndexedDB for persistent storage across Windows, Mac, Android
export async function asyncSyncToIndexedDB(storeName: string, items: any[]) {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
  } catch (err) {
    // Non-fatal, safeStorage handles fallback
  }
}

// ==========================================
// 1. DEVICE STORAGE (Local Device Profiles)
// ==========================================
export function getSavedDevices(): DeviceProfile[] {
  try {
    // One-time cleanup of legacy dummy seed devices and cached dummy logs
    const cleanedFlag = safeStorage.getItem('69ai_cleaned_initial_dummies_v5');
    if (!cleanedFlag) {
      safeStorage.setItem('69ai_cleaned_initial_dummies_v5', 'true');
      safeStorage.removeItem('69ai_terminal_logs_v2');
      safeStorage.removeItem('69ai_terminal_logs_backup');
      safeStorage.removeItem('69ai_terminal_logs_v1');
      const dummyIds = new Set([
        'dev-usb-cp2102n', 'dev-cv-10254', 'dev-phr-router', 'dev-linux-prod',
        'dev-mikrotik-core', 'dev-fg-100f', 'dev-juniper-ex', 'dev-aruba-cx', 'dev-bt-console'
      ]);
      const raw = safeStorage.getItem(STORAGE_KEYS.DEVICES) || safeStorage.getItem('69ai_devices_v1');
      if (raw) {
        try {
          const existing = JSON.parse(raw);
          if (Array.isArray(existing)) {
            const userCreated = existing.filter((d: DeviceProfile) => d && !dummyIds.has(d.id)).map(d => ({ ...d, status: 'disconnected' as const }));
            saveDevices(userCreated);
            return userCreated;
          }
        } catch {}
      }
      safeStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify([]));
      asyncSyncToIndexedDB('devices', []);
      return [];
    }

    const raw = safeStorage.getItem(STORAGE_KEYS.DEVICES);
    if (!raw) {
      return [];
    }
    const rawParsed = JSON.parse(raw);
    if (!Array.isArray(rawParsed)) {
      return [];
    }
    return rawParsed.filter(Boolean).map((d: DeviceProfile) => {
      // Ensure all devices start as disconnected until an actual physical/SSH handshake occurs
      const dev: DeviceProfile = {
        ...d,
        status: 'disconnected',
      };
      // Ensure Serial & Bluetooth devices use single Carriage Return (CR)
      if (dev.type === 'serial_cable' || dev.type === 'serial_bluetooth') {
        if (!dev.lineEnding || dev.lineEnding === 'crlf') {
          dev.lineEnding = 'cr' as const;
        }
      }
      return dev;
    });
  } catch (e) {
    return [];
  }
}

// [SEC-06] Di desktop, password perangkat disimpan di Keychain; yang tersimpan di
// localStorage/IndexedDB hanya placeholder. Main process memakai secret itu saat SSH.
function stripDevicePasswords(devices: DeviceProfile[]): DeviceProfile[] {
  if (!vaultAvailable()) return devices;
  return devices.map((dev) => {
    if (!dev || !dev.password || isVaultPlaceholder(dev.password)) return dev;
    const name = deviceSecretName(dev);
    if (!name) return dev;
    void vaultSet(name, dev.password);
    return { ...dev, password: DEVICE_PASSWORD_PLACEHOLDER };
  });
}

export function migrateDevicePasswordsToVault(): void {
  if (!vaultAvailable()) return;
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.DEVICES);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.some((d: DeviceProfile) => d?.password && !isVaultPlaceholder(d.password))) {
      saveDevices(parsed);
    }
  } catch (_) {}
}

export function saveDevices(devices: DeviceProfile[]): void {
  try {
    const stored = stripDevicePasswords(devices);
    safeStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(stored));
    asyncSyncToIndexedDB('devices', stored);
  } catch (e) {
    console.error('Failed to save devices to safeStorage', e);
  }
}

export function deleteDeviceFromStorage(deviceId: string): DeviceProfile[] {
  const current = getSavedDevices();
  const updated = current.filter(d => d.id !== deviceId);
  saveDevices(updated);
  return updated;
}

export function updateDeviceInStorage(device: DeviceProfile): DeviceProfile[] {
  const current = getSavedDevices();
  const updated = current.map(d => d.id === device.id ? device : d);
  saveDevices(updated);
  return updated;
}

// ==========================================
// 2. OPEN TABS STORAGE
// ==========================================
export function getSavedOpenTabs(): string[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.OPEN_TAB_IDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

export function saveOpenTabs(tabIds: string[]): void {
  try {
    safeStorage.setItem(STORAGE_KEYS.OPEN_TAB_IDS, JSON.stringify(tabIds));
  } catch (e) {
    console.error('Failed to save open tabs to safeStorage', e);
  }
}

// ==========================================
// 3. OFFLINE & ONLINE-CACHED COMMANDS STORAGE
// ==========================================
export function getCachedCommands(): CommandReference[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.CACHED_COMMANDS) || safeStorage.getItem('69ai_cached_commands_v1');
    const custom: CommandReference[] = raw ? JSON.parse(raw) : [];
    return [...custom, ...OFFLINE_COMMAND_DATABASE];
  } catch (e) {
    return OFFLINE_COMMAND_DATABASE;
  }
}

export function getCustomCommandsOnly(): CommandReference[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.CACHED_COMMANDS) || safeStorage.getItem('69ai_cached_commands_v1');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addCachedCommand(cmd: Partial<CommandReference>): CommandReference {
  const newEntry: CommandReference = {
    id: cmd.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    brand: cmd.brand || 'generic',
    modelCategory: cmd.modelCategory || 'Universal',
    category: cmd.category || 'diagnostics',
    categoryLabel: cmd.categoryLabel || 'Diagnostics',
    command: cmd.command || '',
    description: cmd.description || '',
    explanationId: cmd.explanationId || '',
    sampleOutput: cmd.sampleOutput || '',
    verificationTip: cmd.verificationTip || '',
    mode: cmd.mode || 'privileged',
    tags: cmd.tags || [],
    isCachedOnline: true,
    isPlaybook: cmd.isPlaybook || cmd.category === 'playbook',
    isAiLearned: cmd.isAiLearned || false,
    sourceQuery: cmd.sourceQuery || '',
    createdAt: cmd.createdAt || new Date().toISOString(),
  };

  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.CACHED_COMMANDS) || safeStorage.getItem('69ai_cached_commands_v1');
    const list: CommandReference[] = raw ? JSON.parse(raw) : [];
    
    // Check if updating existing or inserting (deduplicate by exact command & brand)
    const existingIndex = list.findIndex(c => 
      c.id === newEntry.id || 
      (c.brand === newEntry.brand && c.command.trim().toLowerCase() === newEntry.command.trim().toLowerCase())
    );
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        ...newEntry,
        id: list[existingIndex].id,
      };
    } else {
      list.unshift(newEntry);
    }
    safeStorage.setItem(STORAGE_KEYS.CACHED_COMMANDS, JSON.stringify(list));
    asyncSyncToIndexedDB('cached_commands', list);
    window.dispatchEvent(new Event('69ai_commands_updated'));
  } catch (e) {
    console.error('Failed to add cached command', e);
  }

  return newEntry;
}

/**
 * Automatically harvests AI-generated Playbooks and individual CLI Commands from online Gemini/OpenAI/Claude responses
 * and saves them permanently into local IndexedDB / safeStorage for instant offline availability.
 */
export function autoHarvestAiResponseToOfflineKb(params: {
  query: string;
  aiText: string;
  brand?: DeviceBrand;
  model?: string;
  deviceHost?: string;
  provider?: string;
}): {
  harvestedPlaybooks: number;
  harvestedCommands: number;
  totalSaved: number;
  items: CommandReference[];
} {
  const { query, aiText, brand = 'generic', model = 'Universal', deviceHost = '', provider = 'gemini' } = params;
  if (!aiText || typeof aiText !== 'string' || aiText.trim().length < 10) {
    return { harvestedPlaybooks: 0, harvestedCommands: 0, totalSaved: 0, items: [] };
  }

  const harvestedItems: CommandReference[] = [];
  const cleanQ = (query || '').trim();
  const qLower = cleanQ.toLowerCase();

  // 1. Extract All Code Blocks from AI Response
  const codeBlockRegex = /```(?:bash|sh|cisco|junos|routeros|mikrotik|linux|huawei|fortios|fortinet)?\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  const blocks: { code: string; index: number }[] = [];

  while ((match = codeBlockRegex.exec(aiText)) !== null) {
    const rawCode = match[1].trim();
    if (rawCode.length > 0) {
      blocks.push({ code: rawCode, index: match.index });
    }
  }

  // 2. Extract Verification Tips from full text (e.g. "show ...", "display ...", "get router info ...")
  let globalVerificationTip = '';
  const verifMatch = aiText.match(/(?:verifikasi|uji coba|monitoring|cek status|validasi|verification)[\s\S]{0,100}?(?:perintah|command|langkah)?[:\n]+([\s\S]{0,250}?)(?=\n\n|###|$)/i);
  if (verifMatch) {
    globalVerificationTip = verifMatch[1].replace(/```/g, '').trim();
  }

  // 3. Process Each Code Block
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const rawLines = block.code.split('\n');
    const cleanLines = rawLines
      .map(l => l.trim().replace(/^#\s*/, '').replace(/^\$\s*/, ''))
      .filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('/*'));

    if (cleanLines.length === 0) continue;

    // Detect if this block is a Multiline Configuration Playbook
    const isConfigKeywords = cleanLines.some(l => 
      /^(?:conf\s+t|configure\s+terminal|interface|router\s+|ip\s+address|crypto\s+|set\s+system|set\s+firewall|\/ip\s+|\/routing\s+|system-view|vlan\s+|ip\s+route|spanning-tree|feature|port-channel|tunnel-interface|zone-member)/i.test(l)
    );
    const isPlaybook = cleanLines.length >= 2 && (isConfigKeywords || qLower.includes('cara') || qLower.includes('setting') || qLower.includes('konfigurasi') || qLower.includes('setup') || qLower.includes('playbook'));

    // Extract Heading context immediately prior to this code block
    const textBefore = aiText.substring(0, block.index);
    const headingMatches = [...textBefore.matchAll(/(?:^|\n)#{1,5}\s+(.+)/g)];
    let contextTitle = '';
    if (headingMatches.length > 0) {
      contextTitle = headingMatches[headingMatches.length - 1][1].replace(/[\*\_`]/g, '').trim();
    }

    if (isPlaybook) {
      // Determine specific Playbook category
      let playbookCatLabel = 'Playbook Konfigurasi';
      let playbookCat: CommandReference['category'] = 'playbook';
      if (qLower.includes('bgp') || block.code.toLowerCase().includes('bgp')) {
        playbookCatLabel = 'Playbook BGP Routing';
      } else if (qLower.includes('ipsec') || qLower.includes('vpn') || block.code.toLowerCase().includes('crypto') || block.code.toLowerCase().includes('ipsec')) {
        playbookCatLabel = 'Playbook IPsec VPN';
      } else if (qLower.includes('ospf') || block.code.toLowerCase().includes('ospf')) {
        playbookCatLabel = 'Playbook OSPF Routing';
      } else if (qLower.includes('vlan') || block.code.toLowerCase().includes('vlan')) {
        playbookCatLabel = 'Playbook VLAN & Trunk';
      } else if (qLower.includes('ip') || block.code.toLowerCase().includes('ip address')) {
        playbookCatLabel = 'Playbook Alokasi IP Address';
      }

      const pbTitle = contextTitle || `Playbook: ${cleanQ.substring(0, 60)}`;
      const item = addCachedCommand({
        brand: brand as DeviceBrand,
        modelCategory: model || 'Universal Enterprise',
        category: playbookCat,
        categoryLabel: playbookCatLabel,
        command: block.code,
        description: pbTitle,
        explanationId: `Disusun otomatis oleh AI (${provider.toUpperCase()}) untuk kueri: "${cleanQ}".\nScript siap dieksekusi berurutan ke terminal ${brand.toUpperCase()}.`,
        verificationTip: globalVerificationTip || undefined,
        mode: 'config',
        tags: [brand, 'ai-playbook', 'ai-generated', ...(deviceHost ? [deviceHost] : []), ...cleanQ.toLowerCase().split(/\s+/).filter(w => w.length > 2)],
        isCachedOnline: true,
        isPlaybook: true,
        isAiLearned: true,
        sourceQuery: cleanQ,
      });
      harvestedItems.push(item);
    } else {
      // Individual Commands in the block (e.g. diagnostic, show, verify, or single commands)
      for (const line of cleanLines) {
        // Skip pure comments or prompt labels
        if (/^(?:[A-Za-z0-9_\-\.]+#[#>]\s*|Device>|Router#|Switch#)/i.test(line)) continue;
        if (line.length < 3) continue;

        let cmdCat: CommandReference['category'] = 'show';
        let cmdCatLabel = 'Show & Monitoring';

        const lineLower = line.toLowerCase();
        if (lineLower.includes('route') || lineLower.includes('routing')) {
          cmdCat = 'routing';
          cmdCatLabel = 'Routing Diagnostics';
        } else if (lineLower.includes('bgp')) {
          cmdCat = 'bgp';
          cmdCatLabel = 'BGP Protocol';
        } else if (lineLower.includes('ospf')) {
          cmdCat = 'ospf';
          cmdCatLabel = 'OSPF Protocol';
        } else if (lineLower.includes('interface') || lineLower.includes('int ') || lineLower.includes('ip a') || lineLower.includes('ip addr')) {
          cmdCat = 'interface';
          cmdCatLabel = 'Interface & Link Status';
        } else if (lineLower.includes('vlan')) {
          cmdCat = 'vlan';
          cmdCatLabel = 'VLAN Management';
        } else if (lineLower.includes('ping') || lineLower.includes('traceroute') || lineLower.includes('test')) {
          cmdCat = 'diagnostics';
          cmdCatLabel = 'Konektivitas & Ping Test';
        }

        const cmdDesc = contextTitle || `Perintah untuk: ${cleanQ.substring(0, 50)}`;
        const item = addCachedCommand({
          brand: brand as DeviceBrand,
          modelCategory: model || 'Universal Enterprise',
          category: cmdCat,
          categoryLabel: cmdCatLabel,
          command: line,
          description: cmdDesc,
          explanationId: `Perintah diekstrak dari panduan AI (${provider.toUpperCase()}) untuk kueri "${cleanQ}".`,
          verificationTip: globalVerificationTip || undefined,
          mode: lineLower.startsWith('conf') || lineLower.startsWith('set ') ? 'config' : 'privileged',
          tags: [brand, 'ai-command', 'ai-generated', ...(deviceHost ? [deviceHost] : []), ...cleanQ.toLowerCase().split(/\s+/).filter(w => w.length > 2)],
          isCachedOnline: true,
          isPlaybook: false,
          isAiLearned: true,
          sourceQuery: cleanQ,
        });
        harvestedItems.push(item);
      }
    }
  }

  // 4. Save the Complete Document context to Offline Search Docs store
  saveOnlineSearchDoc({
    title: cleanQ.length > 50 ? `${cleanQ.substring(0, 50)}...` : cleanQ,
    query: cleanQ,
    provider: (provider === 'openai' ? 'openai' : provider === 'claude' ? 'claude' : provider === 'deepseek' ? 'deepseek' : 'gemini') as any,
    summary: aiText.substring(0, 200).replace(/[`#\*]/g, '').trim(),
    content: aiText,
    brand: brand as DeviceBrand,
    tags: [brand, 'ai-learned-doc', ...(deviceHost ? [deviceHost] : [])],
  });

  const numPlaybooks = harvestedItems.filter(i => i.isPlaybook || i.category === 'playbook').length;
  const numCommands = harvestedItems.length - numPlaybooks;

  return {
    harvestedPlaybooks: numPlaybooks,
    harvestedCommands: numCommands,
    totalSaved: harvestedItems.length,
    items: harvestedItems,
  };
}

export function getAiLearnedPlaybooks(): CommandReference[] {
  return getCachedCommands().filter(c => c.isPlaybook || c.category === 'playbook' || (c.tags && c.tags.includes('ai-playbook')));
}

export function getAiLearnedCommands(): CommandReference[] {
  return getCachedCommands().filter(c => c.isAiLearned || (c.tags && (c.tags.includes('ai-command') || c.tags.includes('ai-playbook') || c.tags.includes('ai-generated'))));
}

export function updateCachedCommand(cmd: CommandReference): CommandReference[] {
  try {
    const list = getCustomCommandsOnly();
    const index = list.findIndex(c => c.id === cmd.id);
    if (index >= 0) {
      list[index] = cmd;
    } else {
      list.unshift(cmd);
    }
    safeStorage.setItem(STORAGE_KEYS.CACHED_COMMANDS, JSON.stringify(list));
    asyncSyncToIndexedDB('cached_commands', list);
    window.dispatchEvent(new Event('69ai_commands_updated'));
    return list;
  } catch (e) {
    return [];
  }
}

export function deleteCachedCommand(cmdId: string): CommandReference[] {
  try {
    const list = getCustomCommandsOnly().filter(c => c.id !== cmdId);
    safeStorage.setItem(STORAGE_KEYS.CACHED_COMMANDS, JSON.stringify(list));
    asyncSyncToIndexedDB('cached_commands', list);
    window.dispatchEvent(new Event('69ai_commands_updated'));
    return list;
  } catch (e) {
    return [];
  }
}

export function importCommandsFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const items: CommandReference[] = Array.isArray(parsed) ? parsed : (parsed.commands || []);
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, count: 0, error: 'Format file JSON tidak valid atau kosong' };
    }

    const current = getCustomCommandsOnly();
    let addedCount = 0;

    for (const item of items) {
      if (item.command && item.description) {
        const id = item.id || `custom-imp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const exists = current.some(c => c.command.trim().toLowerCase() === item.command.trim().toLowerCase() && c.brand === item.brand);
        if (!exists) {
          current.unshift({
            ...item,
            id,
            brand: item.brand || 'generic',
            modelCategory: item.modelCategory || 'Universal CLI',
            category: item.category || 'diagnostics',
            categoryLabel: item.categoryLabel || 'Diagnostics',
            command: item.command,
            description: item.description,
            tags: item.tags || ['imported'],
            isCachedOnline: true,
            createdAt: new Date().toISOString(),
          });
          addedCount++;
        }
      }
    }

    safeStorage.setItem(STORAGE_KEYS.CACHED_COMMANDS, JSON.stringify(current));
    asyncSyncToIndexedDB('cached_commands', current);
    window.dispatchEvent(new Event('69ai_commands_updated'));
    return { success: true, count: addedCount };
  } catch (e: any) {
    return { success: false, count: 0, error: e.message || 'Gagal membaca format JSON' };
  }
}

// ==========================================
// 3b. CUSTOM BRANDS & CUSTOM MODELS STORAGE
// ==========================================
export function getCustomBrands(): BrandInfo[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.CUSTOM_BRANDS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveCustomBrands(brands: BrandInfo[]): void {
  try {
    safeStorage.setItem(STORAGE_KEYS.CUSTOM_BRANDS, JSON.stringify(brands));
    window.dispatchEvent(new Event('69ai_brands_updated'));
  } catch (e) {
    console.error('Failed to save custom brands', e);
  }
}

export function addCustomBrand(brand: BrandInfo): BrandInfo {
  const current = getCustomBrands();
  const index = current.findIndex(b => b.id.toLowerCase() === brand.id.toLowerCase());
  if (index >= 0) {
    current[index] = brand;
  } else {
    current.push(brand);
  }
  saveCustomBrands(current);
  return brand;
}

export function deleteCustomBrand(brandId: string): void {
  const current = getCustomBrands().filter(b => b.id.toLowerCase() !== brandId.toLowerCase());
  saveCustomBrands(current);
}

export function getCustomModels(): Record<string, DeviceModelOption[]> {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.CUSTOM_MODELS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

export function saveCustomModels(modelsRecord: Record<string, DeviceModelOption[]>): void {
  try {
    safeStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(modelsRecord));
    window.dispatchEvent(new Event('69ai_brands_updated'));
  } catch (e) {
    console.error('Failed to save custom models', e);
  }
}

export function addCustomModel(brandId: string, model: DeviceModelOption): DeviceModelOption {
  const allModels = getCustomModels();
  const list = allModels[brandId] || [];
  const index = list.findIndex(m => m.id === model.id);
  if (index >= 0) {
    list[index] = model;
  } else {
    list.push(model);
  }
  allModels[brandId] = list;
  saveCustomModels(allModels);
  return model;
}

export function deleteCustomModel(brandId: string, modelId: string): void {
  const allModels = getCustomModels();
  if (allModels[brandId]) {
    allModels[brandId] = allModels[brandId].filter(m => m.id !== modelId);
    saveCustomModels(allModels);
  }
}

export function getUnifiedBrandCatalog(): Record<string, BrandInfo> {
  const baseCatalog: Record<string, BrandInfo> = { ...BRAND_CATALOG };
  const customBrands = getCustomBrands();
  const customModels = getCustomModels();

  // 1. Merge custom brands into base catalog
  for (const cBrand of customBrands) {
    baseCatalog[cBrand.id] = {
      ...cBrand,
      models: [...(cBrand.models || [])],
    };
  }

  // 2. Merge additional custom models into each brand
  for (const [brandKey, extraModels] of Object.entries(customModels)) {
    if (baseCatalog[brandKey]) {
      const existingModelIds = new Set(baseCatalog[brandKey].models.map(m => m.id));
      for (const m of extraModels) {
        if (!existingModelIds.has(m.id)) {
          baseCatalog[brandKey].models.push(m);
        }
      }
    }
  }

  return baseCatalog;
}

// ==========================================
// 4. ONLINE SEARCH DOCUMENTATION STORAGE
// ==========================================
export function getOnlineSearchDocs(): OnlineSearchDoc[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.ONLINE_DOCS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveOnlineSearchDoc(doc: Partial<OnlineSearchDoc>): OnlineSearchDoc {
  const newDoc: OnlineSearchDoc = {
    id: doc.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: doc.title || (doc.query ? doc.query.substring(0, 50) : 'Dokumentasi AI Online'),
    query: doc.query || '',
    provider: doc.provider || 'gemini',
    summary: doc.summary || '',
    content: doc.content || '',
    groundingUrls: doc.groundingUrls || [],
    tags: doc.tags || ['online-doc'],
    savedAt: new Date().toISOString(),
    brand: doc.brand || 'generic',
  };

  try {
    const list = getOnlineSearchDocs();
    list.unshift(newDoc);
    safeStorage.setItem(STORAGE_KEYS.ONLINE_DOCS, JSON.stringify(list));
    asyncSyncToIndexedDB('online_docs', list);
  } catch (e) {
    console.error('Failed to save online doc', e);
  }

  return newDoc;
}

export function deleteOnlineSearchDoc(docId: string): OnlineSearchDoc[] {
  try {
    const list = getOnlineSearchDocs().filter(d => d.id !== docId);
    safeStorage.setItem(STORAGE_KEYS.ONLINE_DOCS, JSON.stringify(list));
    asyncSyncToIndexedDB('online_docs', list);
    return list;
  } catch (e) {
    return [];
  }
}

// ==========================================
// 5. CHAT SESSIONS STORAGE
// ==========================================
export function getChatSessions(): ChatSession[] {
  try {
    const raw = safeStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS) || safeStorage.getItem('69ai_chat_sessions_v1');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveChatSessions(sessions: ChatSession[]): void {
  try {
    safeStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(sessions));
    asyncSyncToIndexedDB('chat_sessions', sessions);
  } catch (e) {
    console.error('Failed to save chat sessions', e);
  }
}

// ==========================================
// 6. LOCAL DATABASE STATS & BACKUP/RESTORE
// ==========================================
export async function getLocalDatabaseStats(): Promise<LocalDatabaseStats> {
  const devices = getSavedDevices();
  const customCmds: CommandReference[] = JSON.parse(safeStorage.getItem(STORAGE_KEYS.CACHED_COMMANDS) || '[]');
  const onlineDocs = getOnlineSearchDocs();
  const chatSessions = getChatSessions();

  let estimatedSize = 0;
  for (const key of Object.values(STORAGE_KEYS)) {
    const item = safeStorage.getItem(key);
    if (item) estimatedSize += item.length * 2; // rough UTF-16 bytes
  }

  const hasIndexedDB = typeof window !== 'undefined' && !!window.indexedDB;

  return {
    engine: hasIndexedDB ? 'IndexedDB' : 'LocalStorage',
    totalOfflineCommands: OFFLINE_COMMAND_DATABASE.length + customCmds.length,
    totalOnlineDocs: onlineDocs.length,
    totalDevices: devices.length,
    totalChatSessions: chatSessions.length,
    estimatedSizeKb: Math.max(1, Math.round(estimatedSize / 1024)),
    lastUpdated: new Date().toLocaleTimeString(),
  };
}

export async function exportLocalDatabaseJson(): Promise<string> {
  const exportPayload = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    devices: getSavedDevices(),
    cachedCommands: JSON.parse(safeStorage.getItem(STORAGE_KEYS.CACHED_COMMANDS) || '[]'),
    onlineDocs: getOnlineSearchDocs(),
    chatSessions: getChatSessions(),
    openTabs: getSavedOpenTabs(),
  };

  return JSON.stringify(exportPayload, null, 2);
}

export async function importLocalDatabaseJson(jsonString: string): Promise<{ success: boolean; message: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Format file backup JSON tidak valid.' };
    }

    if (Array.isArray(parsed.devices) && parsed.devices.length > 0) {
      saveDevices(parsed.devices);
    }
    if (Array.isArray(parsed.cachedCommands)) {
      safeStorage.setItem(STORAGE_KEYS.CACHED_COMMANDS, JSON.stringify(parsed.cachedCommands));
      asyncSyncToIndexedDB('cached_commands', parsed.cachedCommands);
    }
    if (Array.isArray(parsed.onlineDocs)) {
      safeStorage.setItem(STORAGE_KEYS.ONLINE_DOCS, JSON.stringify(parsed.onlineDocs));
      asyncSyncToIndexedDB('online_docs', parsed.onlineDocs);
    }
    if (Array.isArray(parsed.chatSessions)) {
      saveChatSessions(parsed.chatSessions);
    }
    if (Array.isArray(parsed.openTabs)) {
      saveOpenTabs(parsed.openTabs);
    }

    return { success: true, message: 'Database lokal berhasil dipulihkan dari file backup!' };
  } catch (err: any) {
    return { success: false, message: `Gagal import database: ${err.message}` };
  }
}

export async function clearLocalDatabase(): Promise<boolean> {
  try {
    safeStorage.removeItem(STORAGE_KEYS.CACHED_COMMANDS);
    safeStorage.removeItem(STORAGE_KEYS.ONLINE_DOCS);
    safeStorage.removeItem(STORAGE_KEYS.CHAT_SESSIONS);
    safeStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(DEFAULT_DEVICES));
    return true;
  } catch (e) {
    return false;
  }
}
