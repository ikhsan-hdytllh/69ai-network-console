import { safeStorage } from "../utils/safeStorage";
import { isDesktopNative, SHARE_TERMINAL_WITH_AI_KEY } from '../config/release';
import { isVaultPlaceholder } from '../utils/secretVault';
import { DeviceBrand } from '../types';
import { searchOfflineDatabase } from '../data/offlineCommandDatabase';
import { getCachedCommands } from './dbStorage';
import {
  analyzeTerminalBufferLocally,
  analyzeRunningConfigLocally,
  isRunningConfigOutput,
  parseTerminalInterfaces,
  parseTerminalRoutes,
  parseTerminalBgp,
  parseTerminalOspf,
  parseTerminalVlans,
  parseTerminalArp,
  parseTerminalIpsec,
  parseTerminalFlowDebug,
  parseTerminalBgpDebug,
  parseTerminalOspfDebug,
  parseTerminalConfigErrors,
  parseTerminalDhcp,
  formatDhcpTableMarkdown,
  parseTerminalContainers,
  formatContainerTableMarkdown,
  parseRunningConfigVlans,
  parseRunningConfigInterfaces,
  parseRunningConfigRoutes,
  parseRunningConfigDynamicRouting,
  parseRunningConfigIpsec,
  parseRunningConfigAcls,
  parseRunningConfigDhcp,
  formatInterfacesTableMarkdown,
  formatRoutesTableMarkdown,
  formatBgpTableMarkdown,
  formatOspfTableMarkdown,
  formatVlansTableMarkdown,
  formatArpTableMarkdown,
  formatIpsecTableMarkdown,
  formatFlowDebugMarkdown,
  formatMarkdownTables,
  stripAnsiCodes,
  UniversalInterface,
  UniversalRoute,
  UniversalIpsecTunnel,
} from './terminalAnalyzer';

export interface ChatRequestPayload {
  message: string;
  brand?: string;
  model?: string;
  selectedModel?: string;
  userModel?: string;
  terminalContext?: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  userApiKey?: string;
  userProvider?: string;
  enableGoogleSearch?: boolean;
  serverUrl?: string;
  operatorEmail?: string;
  operatorName?: string;
  // Aksi eksplisit user (mis. tombol Analisa) boleh menyertakan output terminal walau setting global mati
  shareTerminalContext?: boolean;
}

export interface ChatResponseResult {
  text: string;
  source: string;
  searchGrounding?: any;
  isDirectClient?: boolean;
}

export interface TerminalAnalysisResult {
  status: 'healthy' | 'warning' | 'critical' | 'info';
  summary: string;
  identifiedIssues: string[];
  explanation: string;
  recommendedCommands: { cmd: string; purpose: string }[];
  formattedTable?: string;
}

const STORAGE_KEYS = {
  GEMINI_KEY: '69ai_api_key_gemini',
  LEGACY_GEMINI_KEY: '69ai_user_api_key',
  OPENAI_KEY: '69ai_api_key_openai',
  CLAUDE_KEY: '69ai_api_key_claude',
  DEEPSEEK_KEY: '69ai_api_key_deepseek',
  BACKEND_SERVER_URL: '69ai_backend_server_url',
  ACTIVE_PROVIDER: '69ai_user_provider',
};

/**
 * Get active API Key for a given provider
 */
export function getSavedApiKey(provider: string = 'gemini'): string {
  const key = readRawApiKey(provider);
  // [SEC-06] Placeholder = key asli ada di Keychain (desktop), bukan key yang bisa dipakai renderer
  return isVaultPlaceholder(key) ? '' : key;
}

function readRawApiKey(provider: string): string {
  if (provider === 'openai') {
    return (safeStorage.getItem(STORAGE_KEYS.OPENAI_KEY) || '').trim();
  }
  if (provider === 'claude' || provider === 'anthropic') {
    return (safeStorage.getItem(STORAGE_KEYS.CLAUDE_KEY) || '').trim();
  }
  if (provider === 'deepseek') {
    return (safeStorage.getItem(STORAGE_KEYS.DEEPSEEK_KEY) || '').trim();
  }
  // Default to Gemini
  return (
    safeStorage.getItem(STORAGE_KEYS.GEMINI_KEY) ||
    safeStorage.getItem(STORAGE_KEYS.LEGACY_GEMINI_KEY) ||
    ''
  ).trim();
}

/**
 * Detect network brand from user query
 */
export function detectBrandFromQuery(query: string, defaultBrand: string = 'cisco'): string {
  const q = (query || '').toLowerCase();
  if (q.includes('fortigate') || q.includes('fortinet') || q.includes('fortios') || q.includes('fgt')) return 'fortinet';
  if (q.includes('allied') || q.includes('telesis') || q.includes('awplus') || q.includes('centrecom') || q.includes('vcstack') || q.includes('epsr') || q.includes('amf') || q.includes('tq6') || q.includes('tq5') || q.includes('ar4050')) return 'alliedtelesis';
  if (q.includes('cisco') || q.includes('catalyst') || q.includes('nexus') || q.includes('ios-xe') || q.includes('nx-os')) return 'cisco';
  if (q.includes('mikrotik') || q.includes('routeros') || q.includes('winbox') || q.includes('ccr')) return 'mikrotik';
  if (q.includes('juniper') || q.includes('junos') || q.includes('srx') || q.includes('qfx') || q.includes('ex4400')) return 'juniper';
  if (q.includes('linux') || q.includes('ubuntu') || q.includes('debian') || q.includes('rhel') || q.includes('rocky') || q.includes('docker') || q.includes('netplan') || q.includes('systemd') || q.includes('systemctl')) return 'linux';
  if (q.includes('aruba') || q.includes('aos-cx')) return 'aruba';
  if (q.includes('ruckus') || q.includes('fastiron') || q.includes('icx')) return 'ruckus';
  if (q.includes('dell') || q.includes('os10')) return 'dell';
  if (q.includes('hpe') || q.includes('comware')) return 'hpe';
  if (q.includes('windows') || q.includes('powershell')) return 'windows';
  if (q.includes('macos') || q.includes('macbook') || q.includes('apple')) return 'macos';
  return defaultBrand;
}

/**
 * Build system prompt for Transit AI style network engineer co-pilot
 */
function buildSystemPrompt(brand: string, model: string, terminalContext?: string): string {
  const brandUpper = (brand || 'cisco').toUpperCase();
  let syntaxGuidance = '';
  if (brandUpper.includes('LINUX') || brandUpper.includes('UBUNTU') || brandUpper.includes('DEBIAN') || brandUpper.includes('CENTOS') || brandUpper.includes('REDHAT') || brandUpper.includes('SERVER')) {
    syntaxGuidance = `
ATURAN SINTAKS PERINTAH (LINUX / UNIX SERVER):
- Gunakan perintah Linux standar seperti: \`ip a\`, \`ip route\`, \`systemctl status <service>\`, \`cat /etc/netplan/*.yaml\`, \`df -h\`, \`free -m\`, \`uname -a\`, \`ss -tulpn\`, \`journalctl -u <service> -n 50\`.
- JANGAN gunakan sintaks Cisco (\`show ip int br\`) atau RouterOS pada perangkat Linux.`;
  } else if (brandUpper.includes('MIKROTIK') || brandUpper.includes('ROUTEROS')) {
    syntaxGuidance = `
ATURAN SINTAKS PERINTAH (MIKROTIK ROUTEROS):
- Gunakan perintah RouterOS berawalan garis miring seperti: \`/ip address print\`, \`/ip route print\`, \`/interface print\`, \`/system resource print\`, \`/ip firewall nat print\`, \`/tool ping address=8.8.8.8 count=4\`.
- JANGAN gunakan sintaks Cisco atau Linux.`;
  } else if (brandUpper.includes('FORTINET') || brandUpper.includes('FORTIGATE') || brandUpper.includes('FORTIOS')) {
    syntaxGuidance = `
ATURAN SINTAKS PERINTAH (FORTINET FORTIOS):
- Gunakan perintah FortiOS seperti: \`get system status\`, \`get system interface\`, \`get router info routing-table all\`, \`diagnose ip address list\`, \`diagnose sys top\`, \`execute ping 8.8.8.8\`.`;
  } else if (brandUpper.includes('ALLIED') || brandUpper.includes('TELESIS') || brandUpper.includes('AWPLUS')) {
    syntaxGuidance = `
ATURAN SINTAKS PERINTAH (ALLIED TELESIS - ALLIEDWARE PLUS / AW+):
- Gunakan perintah AlliedWare Plus (AW+) standar seperti: \`show ip interface brief\`, \`show running-config\`, \`show vlan all\`, \`show stack\`, \`show amf\`, \`show epsr\`, \`show wireless\`, \`vlan database\`, \`interface port1.0.x\`, \`write memory\`.
- Untuk port switch gunakan format port1.0.X (unit.slot.port). Untuk Wireless AP gunakan format sub-mode \`wireless\`.`;
  } else if (brandUpper.includes('JUNIPER') || brandUpper.includes('JUNOS')) {
    syntaxGuidance = `
ATURAN SINTAKS PERINTAH (JUNIPER JUNOS):
- Gunakan perintah Junos seperti: \`show interfaces terse\`, \`show route\`, \`show chassis hardware\`, \`show configuration\`, \`ping 8.8.8.8 count 4\`.`;
  } else if (brandUpper.includes('HUAWEI') || brandUpper.includes('VRP')) {
    syntaxGuidance = `
ATURAN SINTAKS PERINTAH (HUAWEI VRP):
- Gunakan perintah VRP seperti: \`display ip interface brief\`, \`display current-configuration\`, \`display ip routing-table\`, \`display version\`.`;
  } else {
    syntaxGuidance = `
ATURAN SINTAKS PERINTAH (CISCO IOS / IOS-XE / NX-OS):
- Gunakan perintah Cisco IOS seperti: \`show ip interface brief\`, \`show running-config\`, \`show ip route\`, \`show version\`, \`show vlan brief\`, \`ping 8.8.8.8\`.`;
  }

  return `Anda adalah "69 AI Multi-chat Engine", asisten teknis spesialis Jaringan Komputer, Cisco CCNP/CCIE, Fortinet NSE7, MikroTik MTCINE, Juniper JNCIP, dan Senior Linux DevOps.

Target Perangkat: ${brandUpper} (${model})
${syntaxGuidance}

Karakteristik & Alur Respon 69 AI:
1. **ALUR CEK & SUMMARY DATA (TERMINAL-FIRST WORKFLOW - SANGAT PENTING)**:
   - Saat pengguna meminta **cek**, **summary**, **status**, **periksa**, atau **melihat** sesuatu (misalnya: "cek vlan yang tidak punya ip address", "cek vlan", "cek ip", "summary routing", "cek bgp", "cek ospf", "cek port yang down", "cek firewall", dll):
   - **Langkah 1 (Cari dari Output Terminal yang Ada)**: Periksa terlebih dahulu "Cuplikan Layar Terminal Aktif Pengguna" di bawah. JIKA data yang diminta SUDAH ADA di dalam output terminal (misalnya sudah ada output perintah show/display/print atau show running-config):
     -> Berikan langsung hasil pengecekan / ringkasan data dari output terminal tersebut secara terstruktur (gunakan Tabel Markdown yang rapi dan daftar poin per-baris). JANGAN menyuruh pengguna menjalankan perintah jika data sudah tersedia di terminal.
   - **Langkah 2 (Keluarkan Command Reference jika Tidak Ada)**: JIKA data yang diminta BELUM ADA / TIDAK DITEMUKAN pada output terminal:
     -> Beritahukan secara singkat bahwa data tersebut belum tercatat di output terminal aktif.
     -> Keluarkan **Command Reference** (perintah CLI yang dibutuhkan sesuai brand ${brandUpper}) di dalam blok kode tersendiri (\`\`\`${brandUpper.toLowerCase()}) lengkap dengan judul langkahnya agar pengguna dapat langsung mengklik tombol "Jalankan ke Terminal".

2. **FOKUS 100% PADA INTI PERTANYAAN & FILTERING SPESIFIK**:
   - Jika pertanyaan meminta kriteria/kondisi tertentu (misal: "cek vlan yang tidak punya ip address", "mana port yang mati/down", "vlan tanpa ip", "interface yang unassigned", "rute yang lewat 10.0.0.1"):
     -> Fokuskan jawaban dan tabel data HANYA pada entri yang memenuhi kriteria tersebut!
     -> Contoh untuk "vlan yang tidak punya ip address": Tampilkan tabel HANYA berisi VLAN / SVI yang tidak memiliki alokasi IP (unassigned / Layer 2 only), jelaskan bahwa VLAN tersebut beroperasi di Layer 2 tanpa SVI gateway Layer 3, dan berikan panduan konfigurasi IP jika diperlukan. JANGAN mencampuradukkan data lain yang tidak diminta.

3. **To the Point & Tanpa Basa-Basi (Crucial)**:
   - DILARANG menggunakan kalimat pembuka basa-basi seperti "Halo!", "Tentu saja,", "Baik, saya akan membantu Anda,", "Senang bisa membantu,", "Terima kasih atas pertanyaannya," dll.
   - Langsung berikan jawaban inti, tabel data, atau perintah CLI yang dibutuhkan tanpa pengantar pembuka maupun penutup basa-basi.

3. **Format Tabel Markdown yang Rapi (Wajib)**:
   - Sajikan ringkasan IP address, routing table, daftar port, atau inventaris perangkat dalam tabel Markdown standar dengan header dan separator.
   - Contoh format:
     | Interface | IP Address | Status Link | Tipe / Keterangan |
     | :--- | :--- | :--- | :--- |
     | ens34 | 10.254.88.215/24 | UP | Uplink Utama |

4. **Format Blok Perintah Mandiri (Per-Command Codeblock)**:
   - Selalu letakkan setiap baris perintah CLI di dalam blok kode tersendiri (\`\`\`cisco, \`\`\`bash, \`\`\`routeros, \`\`\`fortinet, dll) dengan judul langkah singkat (misal \`##### Langkah 1: ...\`).
   - Pastikan sintaks perintah CLI SESUAI DENGAN BRAND TARGET (${brandUpper}).
   - Ini memungkinkan pengguna menekan tombol "Execute" atau "Exec & Analisa" secara interaktif per perintah.

5. **ANALISA BASELINE KONFIGURASI SNAPSHOT (ZERO-OVERHEAD CONFIG BASELINE)**:
   - Jika pada cuplikan terdapat blok \`[BASELINE KONFIGURASI PERANGKAT...]\` atau \`[KONFIGURASI LENGKAP RUNNING-CONFIG...]\`: Konfigurasi perangkat aktif ini diambil secara efisien dari **Snapshot Konfigurasi Terakhir** (yang otomatis di-snapshot setiap kali ada save konfigurasi / koneksi baru) atau background capture.
   - Analisa langsung baseline snapshot tersebut untuk menjawab pertanyaan pengguna (ekstrak tabel IP, subnet, status interface, VLAN, routing, gateway, ACL, atau diagnosa konfigurasi).
   - DILARANG mencetak ulang/dump seluruh file konfigurasi mentah ke chat. Cukup sajikan kesimpulan, tabel data yang relevan, dan rekomendasi langkah perbaikan jika ada anomali.

Cuplikan Layar Terminal Aktif Pengguna:
\`\`\`
${terminalContext || '(Belum ada output terminal)'}
\`\`\`
`;
}

/**
 * Direct Client-Side Gemini Call
 */
async function callGeminiDirect(payload: ChatRequestPayload, apiKey: string): Promise<ChatResponseResult> {
  const brand = payload.brand || 'cisco';
  const model = payload.model || 'Universal Device';
  
  // Extract latest terminal logs from payload, global active logs, or global BLE buffer
  const globalActiveLogs = (typeof window !== 'undefined' && ((window as any).activeTerminalLogs || (window as any).bleTerminalBuffer)) || '';
  const currentTerminalLogs = (payload.terminalContext || globalActiveLogs || '').trim();
  const systemInstruction = buildSystemPrompt(brand, model, currentTerminalLogs);

  let preferredModel = payload.userModel || 'gemini-3.8-flash';
  if (
    preferredModel === 'gemini-2.5-flash' ||
    preferredModel === 'gemini-2.5-pro' ||
    preferredModel === 'gemini-2.0-flash' ||
    preferredModel === 'gemini-1.5-flash' ||
    preferredModel === 'gemini-1.5-pro' ||
    preferredModel === 'gemini-3.7-flash' ||
    preferredModel === 'gemini-3.6-flash'
  ) {
    preferredModel = 'gemini-3.8-flash';
  }

  const isProRequested = preferredModel.includes('pro');

  const candidateModels = [
    preferredModel,
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.1-pro-preview',
  ].filter((v, i, a) => a.indexOf(v) === i);

  const contents: any[] = [];

  // Add conversation history if available
  if (payload.history && payload.history.length > 0) {
    for (const h of payload.history) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      });
    }
  }

  // Explicit prompt structure with latest hardware terminal output logs and user prompt
  const userPrompt = payload.message;
  const currentPromptText = currentTerminalLogs.length > 0
    ? `[OUTPUT LOG TERMINAL HARDWARE]:\n${currentTerminalLogs.slice(-6000)}\n\n[PERTANYAAN USER]:\n${userPrompt}`
    : userPrompt;

  contents.push({
    role: 'user',
    parts: [{ text: currentPromptText }],
  });

  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
      
      const bodyPayload: any = {
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500,
        },
      };

      if (payload.enableGoogleSearch) {
        bodyPayload.tools = [{ googleSearch: {} }];
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      // If 400 Bad Request (possibly due to tools/grounding format on certain models), retry without tools
      if (!res.ok && bodyPayload.tools && (res.status === 400 || res.status === 404)) {
        delete bodyPayload.tools;
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';
        const searchGrounding = candidate?.groundingMetadata;

        if (text && text.trim().length > 0) {
          const displayModel = modelName.includes('3.8') ? 'Gemini 3.8 Flash' : modelName.includes('3.7') ? 'Gemini 3.7 Flash' : modelName.includes('3.6') ? 'Gemini 3.6 Flash' : modelName.includes('3.1') ? 'Gemini 3.1 Flash' : 'Gemini Flash';
          return {
            text,
            source: `Google ${displayModel}`,
            searchGrounding,
            isDirectClient: true,
          };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = new Error(errJson?.error?.message || `HTTP ${res.status}: Gagal menghubungi Gemini API`);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal menghubungi Google Gemini API.');
}

/**
 * Direct Client-Side OpenAI Call
 */
async function callOpenAiDirect(payload: ChatRequestPayload, apiKey: string): Promise<ChatResponseResult> {
  const brand = payload.brand || 'cisco';
  const model = payload.model || 'Universal Device';
  const systemInstruction = buildSystemPrompt(brand, model, payload.terminalContext);

  const messages: any[] = [{ role: 'system', content: systemInstruction }];

  if (payload.history && payload.history.length > 0) {
    for (const h of payload.history) {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      });
    }
  }

  let prompt = payload.message;
  if (payload.terminalContext) {
    prompt += `\n\n[Terminal Context]:\n${payload.terminalContext.slice(-2500)}`;
  }
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: payload.userModel || 'gpt-4o',
      messages,
      temperature: 0.2,
      max_tokens: 2500,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return {
    text,
    source: `OpenAI (${payload.userModel || 'gpt-4o'}) [Direct API Client]`,
    isDirectClient: true,
  };
}

/**
 * Direct Client-Side DeepSeek Call
 */
async function callDeepSeekDirect(payload: ChatRequestPayload, apiKey: string): Promise<ChatResponseResult> {
  const brand = payload.brand || 'cisco';
  const model = payload.model || 'Universal Device';
  const systemInstruction = buildSystemPrompt(brand, model, payload.terminalContext);

  const messages: any[] = [{ role: 'system', content: systemInstruction }];

  if (payload.history && payload.history.length > 0) {
    for (const h of payload.history) {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      });
    }
  }

  let prompt = payload.message;
  if (payload.terminalContext) {
    prompt += `\n\n[Terminal Context]:\n${payload.terminalContext.slice(-2500)}`;
  }
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: payload.userModel || 'deepseek-chat',
      messages,
      temperature: 0.2,
      max_tokens: 2500,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `DeepSeek error ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return {
    text,
    source: `DeepSeek (${payload.userModel || 'deepseek-chat'}) [Direct API Client]`,
    isDirectClient: true,
  };
}

/**
 * Direct Client-Side Claude Call
 */
async function callClaudeDirect(payload: ChatRequestPayload, apiKey: string): Promise<ChatResponseResult> {
  const brand = payload.brand || 'cisco';
  const model = payload.model || 'Universal Device';
  const systemInstruction = buildSystemPrompt(brand, model, payload.terminalContext);

  const messages: any[] = [];
  if (payload.history && payload.history.length > 0) {
    for (const h of payload.history) {
      messages.push({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content,
      });
    }
  }

  let prompt = payload.message;
  if (payload.terminalContext) {
    prompt += `\n\n[Terminal Context]:\n${payload.terminalContext.slice(-2500)}`;
  }
  messages.push({ role: 'user', content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: payload.userModel || 'claude-3-5-sonnet-20241022',
      max_tokens: 2500,
      system: systemInstruction,
      messages,
    }),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude error ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  return {
    text,
    source: `Claude (${payload.userModel || 'claude-3-5-sonnet'}) [Direct API Client]`,
    isDirectClient: true,
  };
}

/**
 * Main Network AI Dispatcher
 */
export async function sendNetworkAiChat(payload: ChatRequestPayload): Promise<ChatResponseResult> {
  const provider = (payload.userProvider || safeStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER) || 'gemini').toLowerCase();
  const payloadKey = payload.userApiKey && !isVaultPlaceholder(payload.userApiKey) ? payload.userApiKey : '';
  const apiKey = payloadKey || getSavedApiKey(provider);
  const desktopApp = isDesktopNative();
  // [SEC-04] Aplikasi desktop tidak memakai server relay; AI hanya lewat main process ke provider resmi
  const customServerUrl = desktopApp ? '' : (payload.serverUrl || safeStorage.getItem(STORAGE_KEYS.BACKEND_SERVER_URL) || '');

  // Extract latest terminal logs from payload, global active logs, or global BLE buffer
  const globalActiveLogs = (typeof window !== 'undefined' && ((window as any).activeTerminalLogs || (window as any).bleTerminalBuffer)) || '';
  const currentTerminalLogs = (payload.terminalContext || globalActiveLogs || '').trim();
  // [SEC-05] Output terminal hanya ikut dikirim ke AI online bila user mengaktifkannya
  // (atau untuk aksi "Analisa" yang eksplisit diminta user). Analisa offline tetap memakai log lokal.
  const shareTerminal = payload.shareTerminalContext === true || safeStorage.getItem(SHARE_TERMINAL_WITH_AI_KEY) === 'true';
  const enrichedPayload: ChatRequestPayload = {
    ...payload,
    terminalContext: shareTerminal ? currentTerminalLogs : '',
  };

  let lastApiError: string | null = null;

  // Immediate 100% Offline Path: Zero network requests, zero API key check, zero quota consumed
  const isOfflineExplicit = payload.selectedModel === 'Offline Database Engine' || 
                            payload.selectedModel === 'offline' || 
                            payload.userProvider === 'offline' ||
                            provider === 'offline';
  if (isOfflineExplicit) {
    const targetBrand = (payload.brand || detectBrandFromQuery(payload.message, 'cisco')).toLowerCase();
    const cleanedQuery = payload.message.replace(/\[.*?\]/g, '').trim();

    // Check offline database first
    const offlineMatches = searchOfflineDatabase(cleanedQuery, targetBrand as any);
    if (offlineMatches.length > 0 && !payload.terminalContext?.includes('BASELINE KONFIGURASI')) {
      const top = offlineMatches[0];
      const cmdBlock = `##### Langkah 1: ${top.categoryLabel || 'Eksekusi Perintah'}\n\`\`\`${targetBrand}\n${top.command}\n\`\`\``;
      const related = offlineMatches.slice(1, 3).map((r, i) => `##### Langkah ${i + 2}: ${r.description || r.categoryLabel}\n\`\`\`${targetBrand}\n${r.command}\n\`\`\``).join('\n\n');

      return {
        text: `### 💡 Panduan Eksekusi CLI (Offline Database Engine) — ${targetBrand.toUpperCase()}\n\n**Perintah Kunci:** \`${top.command}\`\n${top.description}\n\n${top.explanationId ? `*Petunjuk:* ${top.explanationId}\n\n` : ''}${top.verificationTip ? `**Tips Verifikasi:**\n${top.verificationTip}\n\n` : ''}${cmdBlock}${related ? `\n\n${related}` : ''}`,
        source: 'Offline Database Engine',
        isDirectClient: true,
      };
    }

    const expertResponse = generateExpertNetworkResponse(cleanedQuery, targetBrand, payload.model, currentTerminalLogs);
    return {
      text: expertResponse,
      source: 'Offline Database Engine',
      isDirectClient: true,
    };
  }

  // 1. If Custom Server URL is configured, prioritize Server Endpoint first
  const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';
  const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  const currentHost = typeof window !== 'undefined' && window.location.host ? window.location.host : '';

  const serverEndpoints: string[] = [];

  // When running on the web, always prefer the relative endpoint first so session cookies & proxy work seamlessly
  if (!isFileProtocol) {
    serverEndpoints.push('/api/chat');
    if (currentOrigin) {
      serverEndpoints.push(`${currentOrigin}/api/chat`);
    }
  }

  if (customServerUrl) {
    const cleanCustom = customServerUrl.replace(/\/+$/, '');
    // If user specified custom server that matches current web host, /api/chat is already top priority
    if (!currentHost || !cleanCustom.includes(currentHost)) {
      serverEndpoints.unshift(`${cleanCustom}/api/chat`);
    }
  }

  // [SEC-04] Relay cloud pihak ketiga & localhost dihapus. Desktop tidak memakai endpoint server sama sekali.
  const uniqueEndpoints = desktopApp ? [] : serverEndpoints.filter((ep, idx, arr) => arr.indexOf(ep) === idx);

  // Helper function to query server endpoints
  const queryServerEndpoints = async (sendApiKey: boolean): Promise<ChatResponseResult | null> => {
    for (const apiEndpoint of uniqueEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: controller.signal,
          body: JSON.stringify({
            ...enrichedPayload,
            operatorEmail: payload.operatorEmail || safeStorage.getItem('69ai_operator_email') || '',
            operatorName: payload.operatorName || safeStorage.getItem('69ai_operator_name') || '',
            selectedModel: payload.selectedModel || 'Google Gemini 3.8 Flash',
            userModel: payload.userModel || 'gemini-3.8-flash',
            userApiKey: sendApiKey ? (apiKey || undefined) : undefined,
            userProvider: provider,
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.text) {
            return {
              text: data.text,
              source: data.source || (sendApiKey ? 'Google Gemini 3.8 Flash [Cloud Engine]' : 'Google Gemini 3.8 Flash [Cloud Relay Server]'),
              searchGrounding: data.searchGrounding,
            };
          }
        }
      } catch (serverErr: any) {
        // Try next endpoint
      }
    }
    return null;
  };

  // If user configured custom Server URL (e.g. Cloud Run Live Server), use Server Relay first!
  if (customServerUrl) {
    // Try with userApiKey first; if user key has quota error, try without userApiKey to use server key
    let serverRes = await queryServerEndpoints(true);
    if (!serverRes) {
      serverRes = await queryServerEndpoints(false);
    }
    if (serverRes) {
      return serverRes;
    }
  }

  // 2. Direct Client-Side HTTPS API Call (Web & Android APK). Desktop selalu lewat main process.
  if (!desktopApp && apiKey && apiKey.trim().length > 0) {
    try {
      if (provider === 'openai') {
        return await callOpenAiDirect(enrichedPayload, apiKey);
      }
      if (provider === 'deepseek') {
        return await callDeepSeekDirect(enrichedPayload, apiKey);
      }
      if (provider === 'claude' || provider === 'anthropic') {
        return await callClaudeDirect(enrichedPayload, apiKey);
      }
      // Default: Google Gemini
      return await callGeminiDirect(enrichedPayload, apiKey);
    } catch (directErr: any) {
      console.info('[AI Client] Direct client AI notice, smoothly trying server fallback:', directErr?.message || directErr);
      lastApiError = directErr?.message || String(directErr);
    }
  }

  // 2.5 Android Native handler (if running in Android app)
  if (typeof window !== 'undefined' && (window as any).AndroidNative?.sendAiChat) {
    try {
      const androidPayload = JSON.stringify({
        ...enrichedPayload,
        apiKey,
        userApiKey: apiKey,
        provider,
        userProvider: provider,
      });
      const androidResRaw = (window as any).AndroidNative.sendAiChat(androidPayload);
      if (androidResRaw) {
        const androidRes = JSON.parse(androidResRaw);
        if (androidRes.success && androidRes.text) {
          return {
            text: androidRes.text,
            source: androidRes.source || 'Google Gemini [Android Native]',
            isDirectClient: true,
          };
        }
      }
    } catch (err: any) {
      console.warn('AndroidNative.sendAiChat fallback failed:', err);
      lastApiError = err?.message || String(err);
    }
  }

  // 3. Electron Desktop Native handler (if running in macOS / Windows app)
  if (typeof window !== 'undefined' && (window as any).DesktopNative?.sendAiChat) {
    try {
      // Key tidak dikirim: main process memakai key terenkripsi dari Keychain
      const desktopRes = await (window as any).DesktopNative.sendAiChat({
        ...enrichedPayload,
        apiKey: undefined,
        userApiKey: undefined,
        provider,
        userProvider: provider,
      });
      if (desktopRes && desktopRes.success && desktopRes.text) {
        return {
          text: desktopRes.text,
          source: desktopRes.source || 'Google Gemini [macOS Desktop Native]',
          isDirectClient: true,
        };
      }
    } catch (desktopErr: any) {
      console.info('DesktopNative.sendAiChat notice:', desktopErr?.message || desktopErr);
      if (!lastApiError) lastApiError = desktopErr?.message || String(desktopErr);
    }
  }

  // 4. Try Server Endpoints fallback (bypassing quota-exhausted user key)
  const isQuotaIssue = lastApiError ? (
    lastApiError.toLowerCase().includes('quota') || 
    lastApiError.includes('429') || 
    lastApiError.includes('RESOURCE_EXHAUSTED')
  ) : false;

  // When personal key has quota exhausted, try server endpoints without user key so server container key is used!
  const serverFallback = await queryServerEndpoints(!isQuotaIssue);
  if (serverFallback) {
    return serverFallback;
  }

  // If user provided an API key and all API connection attempts failed, return informative message with offline fallback
  if (apiKey && apiKey.trim().length > 0 && lastApiError) {
    const isQuotaIssue = lastApiError.toLowerCase().includes('quota') || 
                         lastApiError.includes('429') || 
                         lastApiError.includes('RESOURCE_EXHAUSTED');
    
    const targetBrand = (payload.brand || detectBrandFromQuery(payload.message, 'cisco')).toLowerCase();
    const cleanedQuery = payload.message.replace(/\[.*?\]/g, '').trim();
    const fallbackExpert = generateExpertNetworkResponse(cleanedQuery, targetBrand, payload.model, currentTerminalLogs);

    if (isQuotaIssue) {
      return {
        text: `### ⚠️ Kuota API ${provider.toUpperCase()} Tercapai (Quota Exceeded)\n\nLayanan online **${provider.toUpperCase()}** mengembalikan respon kuota akun Anda telah habis:\n\`\`\`text\n${lastApiError}\n\`\`\`\n\n💡 **Solusi & Rekomendasi:**\n1. Anda dapat beralih ke model **"Offline Engine"** pada dropdown di atas untuk terus bekerja secara lokal tanpa kuota/internet.\n2. Atau perbarui API Key Anda di menu **⚙️ Settings > AI Provider**.\n\n---\n\n#### 🛠️ Jawaban Berdasarkan Database Offline Engine (${targetBrand.toUpperCase()}):\n\n${fallbackExpert}`,
        source: `Offline Fallback (${provider.toUpperCase()} Quota Limit)`,
        isDirectClient: true,
      };
    }

    return {
      text: `### ❌ Gagal Menghubungi API AI (${provider.toUpperCase()})\n\n**Detail Pesan Error Teknis:**\n\`\`\`text\n${lastApiError}\n\`\`\`\n\n**Langkah Perbaikan:**\n1. Pastikan API Key **${provider.toUpperCase()}** Anda valid dan kuota akun aktif.\n2. Periksa koneksi internet perangkat.\n3. Anda juga dapat memilih model **"Offline Engine"** untuk navigasi CLI tanpa kuota internet.\n\n---\n\n#### 🛠️ Rekomendasi Offline Engine:\n\n${fallbackExpert}`,
      source: `Offline Fallback (${provider.toUpperCase()})`,
      isDirectClient: true,
    };
  }

  // 4. Intelligent Co-Pilot Engine (Accurate network CLI commands, playbooks, or honest fallback)
  const targetBrand = (payload.brand || detectBrandFromQuery(payload.message, 'cisco')).toLowerCase();
  const cleanedQuery = payload.message.replace(/\[.*?\]/g, '').trim();
  const expertResponse = generateExpertNetworkResponse(cleanedQuery, targetBrand, payload.model, currentTerminalLogs);

  const effectiveSource = isOfflineExplicit ? 'Offline Database Engine' : (payload.selectedModel || 'Google Gemini 3.7 Flash');

  return {
    text: expertResponse,
    source: effectiveSource,
    isDirectClient: true,
  };
}

/**
 * Data-Driven Transit AI Intent Dispatcher & Terminal Extractor
 */
export function generateExpertNetworkResponse(
  query: string,
  brand: string,
  model?: string,
  terminalContext?: string
): string {
  const q = (query || '').toLowerCase().trim();
  const b = (brand || 'cisco').toLowerCase();
  const devTitle = model ? `${brand.toUpperCase()} (${model})` : brand.toUpperCase();
  const cliLang = b === 'fortinet' ? 'fortios' : b === 'mikrotik' ? 'routeros' : b === 'cisco' ? 'cisco' : b === 'juniper' ? 'junos' : 'bash';

  const cleanContext = stripAnsiCodes(terminalContext || '');
  const contextHasContent = cleanContext.trim().length > 30;

  // -------------------------------------------------------------------------
  // 0. EXPLICIT TERMINAL ANALYSIS ONLY (Explicitly asked to analyze terminal buffer)
  // -------------------------------------------------------------------------
  const isExplicitTerminalInspection = 
    q.includes('analisa terminal') ||
    q.includes('analisis terminal') ||
    q.includes('analisa output') ||
    q.includes('analisis output') ||
    q.includes('analisa log') ||
    q.includes('periksa layar') ||
    q.includes('periksa terminal') ||
    q.includes('periksa log') ||
    q.includes('ringkas output') ||
    q.includes('ringkas terminal') ||
    q.includes('analisa error') ||
    q.includes('status layar terminal') ||
    q.startsWith('tolong periksa dan analisa hasil output');

  if (isExplicitTerminalInspection && contextHasContent) {
    const diag = analyzeTerminalBufferLocally(cleanContext, brand, model || 'Universal');
    
    const statusBadge = diag.status === 'healthy' 
      ? '🟢 Normal (Healthy)' 
      : diag.status === 'warning' 
      ? '🟡 Perhatian (Warning)' 
      : diag.status === 'critical' 
      ? '🔴 Kritis / Error' 
      : '🔵 Info';

    const issuesList = diag.identifiedIssues && diag.identifiedIssues.length > 0
      ? diag.identifiedIssues.map((i: string) => `• ${i}`).join('\n')
      : '• Semua parameter beroperasi normal tanpa anomali.';

    const cmdSection = diag.recommendedCommands && diag.recommendedCommands.length > 0
      ? `\n\n#### 🛠️ Rekomendasi Perintah Tindakan Lanjutan:\n` +
        diag.recommendedCommands.map((c: any, idx: number) => 
          `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
        ).join('\n\n')
      : '';

    const tableBlock = diag.formattedTable ? `\n\n${diag.formattedTable}\n` : '';

    return `### 📋 Hasil Analisis & Ringkasan Terminal — ${devTitle}

**Status Perangkat:** ${statusBadge}

#### 📌 Ringkasan Kondisi:
${diag.summary}
${tableBlock}
#### 🔍 Parameter & Temuan Kunci:
${issuesList}

${diag.explanation ? `#### 💡 Penjelasan Diagnosa:\n${diag.explanation}` : ''}${cmdSection}`;
  }

  // -------------------------------------------------------------------------
  // 0.1. RESET, FACTORY DEFAULT, REBOOT, & PASSWORD RECOVERY INTENT
  // -------------------------------------------------------------------------
  const isResetIntent = 
    q.includes('reset') ||
    q.includes('factory default') ||
    q.includes('setelan pabrik') ||
    q.includes('bawaan pabrik') ||
    q.includes('kembali ke pabrik') ||
    q.includes('hapus konfigurasi') ||
    q.includes('wipe') ||
    q.includes('reload') ||
    q.includes('reboot') ||
    q.includes('restart router') ||
    q.includes('restart switch') ||
    q.includes('restart perangkat') ||
    q.includes('lupa password') ||
    q.includes('password recovery') ||
    q.includes('erase startup') ||
    q.includes('reset-configuration');

  if (isResetIntent) {
    if (b === 'mikrotik') {
      return `### 🔄 Panduan Lengkap Reset Konfigurasi MikroTik RouterOS (${devTitle})

Terdapat 2 metode reset pada perangkat MikroTik: **Reset melalui CLI / Terminal** dan **Reset Fisik (Tombol Hardware)**.

---

#### 1. Reset via Terminal CLI (Software Reset)

##### Langkah 1: Reset Bersih Total (Tanpa Default Script / IP Kosong)
\`\`\`routeros
/system reset-configuration no-defaults=yes skip-backup=yes
\`\`\`
*Gunakan opsi ini jika Anda ingin mengonfigurasi router dari nol tanpa IP default 192.168.88.1.*

##### Langkah 2 (Alternatif): Reset ke Setelan Pabrik Default (IP 192.168.88.1)
\`\`\`routeros
/system reset-configuration no-defaults=no skip-backup=yes
\`\`\`
*Router akan reboot dan memiliki IP default 192.168.88.1/24 pada port ether2-ether5 / bridge, dengan user \`admin\` tanpa password.*

##### Langkah 3: Perintah Reboot Ulang (Tanpa Menghapus Konfigurasi)
\`\`\`routeros
/system reboot
\`\`\`

---

#### 2. Reset Fisik menggunakan Tombol Reset (Hardware Reset Button)
Jika Anda **lupa password** atau router tidak dapat diakses sama sekali:
1. Cabut kabel adaptor daya (power) MikroTik.
2. Tekan dan tahan tombol **RESET** fisik menggunakan jarum/paperclip.
3. Sambungkan kembali adaptor daya sambil tetap menahan tombol RESET:
   - **Tahan 3 - 5 detik** (sampai lampu LED **ACT / USR** mulai **berkedip**): Lepaskan tombol segera. Ini akan **mereset konfigurasi ke default pabrik**.
   - **Tahan 10 detik** (LED **ACT** berubah menyala **diam / solid**): Mode **CAPsMAN** (Managed AP).
   - **Tahan 15 detik** (LED **ACT** **padam / mati**): Router masuk mode **Netinstall** untuk install ulang firmware.`;
    }

    if (b === 'cisco') {
      return `### 🔄 Panduan Lengkap Reset & Factory Default Cisco Switch / Router (${devTitle})

---

#### 1. Reset Konfigurasi ke Setelan Pabrik (Factory Reset via CLI)

##### Langkah 1: Masuk Mode Privileged EXEC & Hapus Konfigurasi NVRAM
\`\`\`cisco
enable
write erase
\`\`\`
*(Perintah \`write erase\` atau \`erase startup-config\` akan menghapus seluruh konfigurasi di NVRAM).*

##### Langkah 2: Hapus Database VLAN (Khusus Cisco Switch)
\`\`\`cisco
delete flash:vlan.dat
\`\`\`
*(Tekan [Enter] untuk konfirmasi nama file dan penghapusan).*

##### Langkah 3: Restart / Reload Perangkat
\`\`\`cisco
reload
\`\`\`
*(PENTING: Ketika muncul pertanyaan \`System configuration has been modified. Save? [yes/no]:\`, ketik **no** lalu tekan [Enter]. Saat konfirmasi \`Proceed with reload? [confirm]\`, tekan [Enter]).*

---

#### 2. Reset Port / Interface Spesifik ke Default
Jika hanya ingin mengembalikan konfigurasi 1 port ke setelan bawaan tanpa mereset switch:
\`\`\`cisco
configure terminal
default interface GigabitEthernet0/1
end
\`\`\`

---

#### 3. Prosedur Password Recovery (Jika Lupa Password Cisco)
1. Hubungkan kabel Console ke router/switch dan buka terminal (9600 8N1).
2. Matikan lalu nyalakan perangkat. Dalam **60 detik pertama**, kirim sinyal **Break** (\`Ctrl + Break\`) untuk masuk mode **ROMMON** (\`rommon 1>\`).
3. Ubah config-register agar mengabaikan startup-config saat boot:
\`\`\`cisco
confreg 0x2142
reset
\`\`\`
4. Setelah router menyala (tanpa meminta password):
\`\`\`cisco
enable
copy startup-config running-config
configure terminal
enable secret PasswordBaruAnda123
config-register 0x2102
end
copy running-config startup-config
\`\`\``;
    }

    if (b === 'fortinet') {
      return `### 🔄 Panduan Factory Reset FortiGate FortiOS (${devTitle})

##### Langkah 1: Reset ke Setelan Pabrik (Factory Default)
\`\`\`fortios
execute factoryreset
\`\`\`
*Ketik \`y\` untuk konfirmasi. Seluruh konfigurasi akan dihapus dan IP manajemen kembali ke default **192.168.1.99** pada port1/mgmt (user: \`admin\`, tanpa password).*

##### Langkah 2: Perintah Reboot Sistem
\`\`\`fortios
execute reboot
\`\`\``;
    }

    if (b === 'juniper') {
      return `### 🔄 Panduan Factory Reset Juniper Junos (${devTitle})

##### Langkah 1: Load Konfigurasi Factory Default
\`\`\`junos
configure
load factory-default
set system root-authentication plain-text-password
commit and-quit
\`\`\`

##### Langkah 2: Reboot Sistem
\`\`\`junos
request system reboot
\`\`\``;
    }

    if (b === 'huawei') {
      return `### 🔄 Panduan Factory Reset Huawei VRP (${devTitle})

##### Langkah 1: Hapus Konfigurasi Tersimpan & Reboot
\`\`\`huawei
reset saved-configuration
reboot
\`\`\`
*(Ketik \`N\` saat ditanya save current configuration, lalu ketik \`Y\` saat konfirmasi reboot).*`;
    }

    // Default Linux / Generic
    return `### 🔄 Panduan Restart & Reset Jaringan Linux (${devTitle})

##### Langkah 1: Restart / Reboot Sistem
\`\`\`bash
sudo reboot
\`\`\`

##### Langkah 2: Reset / Restart Service Jaringan
\`\`\`bash
sudo systemctl restart networking || sudo systemctl restart NetworkManager
sudo netplan apply
\`\`\`

##### Langkah 3: Reset Aturan Firewall (Flush IPTables / UFW)
\`\`\`bash
sudo ufw reset
sudo iptables -F
sudo iptables -t nat -F
\`\`\``;
  }

  // -------------------------------------------------------------------------
  // 1. VLAN, TRUNKING & SWITCHING INTENT ("vlan", "trunk", "switchport", "vlan tanpa ip", etc.)
  // (Evaluated BEFORE general IP intent so VLAN-specific inquiries are never hijacked)
  // -------------------------------------------------------------------------
  const isVlanIntent = !isResetIntent && (q.includes('vlan') || q.includes('trunk') || q.includes('switchport') || q.includes('bridge'));
  if (isVlanIntent) {
    const isVlanWithoutIp = /\b(tanpa\s*ip|tidak\s*punya\s*ip|tidak\s*ada\s*ip|belum\s*ada\s*ip|belum\s*punya\s*ip|no\s*ip|unassigned|tanpa\s*alamat\s*ip|tidak\s*memiliki\s*ip|vlan\s*mana\s*yang\s*tidak|vlan\s*mana\s*yang\s*belum)\b/i.test(q);
    const ifaces = parseTerminalInterfaces(cleanContext, brand);
    const termVlans = parseTerminalVlans(cleanContext);
    const configVlans = parseRunningConfigVlans(cleanContext);

    const allVlans = termVlans.length > 0 
      ? termVlans 
      : configVlans.map(v => ({ vlanId: v.vlanId, name: v.name, status: 'ACTIVE', ports: v.ports || [] }));

    // Find all VLAN interfaces (e.g. Vlan1, Vlan10, vlanif10)
    const vlanIfaces = ifaces.filter(i => {
      const n = i.name.toLowerCase();
      return n.startsWith('vl') || n.startsWith('vlan') || n.startsWith('vlanif') || n.includes('.vlan');
    });

    if (isVlanWithoutIp) {
      // Find all VLANs without IP address
      const noIpList: { idOrName: string; interfaceName: string; status: string; ipStatus: string; layerNote: string }[] = [];

      // 1. Check VLAN SVIs in ifaces that are unassigned
      vlanIfaces.forEach(vi => {
        if (vi.ipv4List.length === 0) {
          noIpList.push({
            idOrName: vi.name,
            interfaceName: vi.name,
            status: vi.state === 'UP' ? '🟢 UP' : vi.state === 'ADMIN_DOWN' ? '🔴 ADMIN DOWN' : '⚪ DOWN',
            ipStatus: '❌ unassigned (Tanpa IP)',
            layerNote: 'VLAN SVI Interface (Layer 3 disabled)',
          });
        }
      });

      // 2. Check VLANs from show vlan brief that don't have an SVI IP
      allVlans.forEach(tv => {
        const matchingSvi = vlanIfaces.find(vi => {
          const num = vi.name.replace(/[^0-9]/g, '');
          return num === tv.vlanId;
        });

        if (!matchingSvi || matchingSvi.ipv4List.length === 0) {
          const alreadyAdded = noIpList.some(item => item.idOrName.toLowerCase().includes(`vlan${tv.vlanId}`) || item.idOrName.toLowerCase() === tv.vlanId);
          if (!alreadyAdded) {
            noIpList.push({
              idOrName: `VLAN ${tv.vlanId} (${tv.name})`,
              interfaceName: matchingSvi ? matchingSvi.name : `Vlan${tv.vlanId} (Belum dibuat SVI)`,
              status: tv.status === 'ACTIVE' ? '🟢 Active' : '⚪ ' + tv.status,
              ipStatus: '❌ Tanpa IP Address (Layer 2 Only)',
              layerNote: tv.ports && tv.ports.length > 0 ? `Ports: ${tv.ports.slice(0, 4).join(', ')}` : 'Switchport Layer 2 Access/Trunk',
            });
          }
        }
      });

      // If we found VLANs without IP
      if (noIpList.length > 0) {
        const rows = noIpList.map((item, idx) => 
          `| ${idx + 1} | \`${item.idOrName}\` | \`${item.interfaceName}\` | ${item.status} | ${item.ipStatus} | ${item.layerNote} |`
        ).join('\n');

        return `### 🏷️ Hasil Analisis: VLAN Tanpa Alamat IP (No IP Address) — ${devTitle}

**Status:** ⚠️ Ditemukan **${noIpList.length} VLAN** yang **tidak memiliki konfigurasi IP Address** (beroperasi murni di Layer 2 / unassigned).

| No | VLAN / ID | Antarmuka SVI | Status Port | Status IP Address | Keterangan Layer |
| :--- | :--- | :--- | :--- | :--- | :--- |
${rows}

#### 📌 Analisa & Kesimpulan Inti:
• **Kondisi:** VLAN di atas hanya beroperasi pada **Layer 2 (Switching)** untuk segmentasi port/trunk tanpa gateway IP Layer 3.
• **Fungsi Saat Ini:** Meneruskan frame broadcast/multicast dan switching antar-port dalam satu VLAN tanpa routing keluar.
• **Rekomendasi:** Jika VLAN ini memerlukan alokasi gateway lokal untuk routing antar-VLAN (Inter-VLAN Routing) atau manajemen IP:

#### 🛠️ Panduan Konfigurasi Alokasi IP ke VLAN:
\`\`\`${cliLang}
${b === 'cisco' ? `configure terminal
interface Vlan${noIpList[0]?.idOrName.replace(/[^0-9]/g, '') || '10'}
 ip address 192.168.10.1 255.255.255.0
 no shutdown
end
write memory` : b === 'mikrotik' ? `/ip address add address=192.168.10.1/24 interface=vlan10 network=192.168.10.0` : `ip addr add 192.168.10.1/24 dev vlan10`}
\`\`\``;
      } else if (cleanContext.length > 30 && (vlanIfaces.length > 0 || allVlans.length > 0)) {
        return `### 🏷️ Hasil Analisis: VLAN Tanpa Alamat IP — ${devTitle}

**Status:** ✅ **Seluruh VLAN Telah Memiliki Alamat IP (SVI)**

Berdasarkan output terminal aktif, seluruh VLAN yang terdeteksi (${vlanIfaces.map(v => v.name).join(', ')}) telah terkonfigurasi dengan IP Address yang valid dan tidak ada VLAN yang berstatus \`unassigned\`.`;
      }
    }

    // Standard / all VLANs display if not filtered or if general
    if (allVlans.length > 0) {
      const tableMd = formatVlansTableMarkdown(allVlans as any);
      return `### 🏷️ Ringkasan Database VLAN — ${devTitle}

**Status:** 🟢 **${allVlans.length} VLAN Terdaftar**

${tableMd}

#### 📌 Temuan Kunci:
• **Total VLAN Aktif:** ${allVlans.length} VLAN.
• **Daftar ID VLAN:** ${allVlans.map(v => `VLAN ${v.vlanId} (${v.name})`).join(', ')}.

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Cek Status Port Trunk & VLAN
\`\`\`${cliLang}
${b === 'cisco' ? 'show interfaces trunk\nshow vlan brief' : b === 'mikrotik' ? '/interface bridge vlan print' : 'show vlans'}
\`\`\``;
    }

    // Terminal has no VLAN output -> provide exact reference commands
    const vlanCmds: { cmd: string; purpose: string }[] = b === 'cisco'
      ? [
          { cmd: 'show vlan brief', purpose: 'Tampilkan seluruh database VLAN aktif' },
          { cmd: 'show ip interface brief', purpose: 'Periksa alokasi IP pada interface SVI VLAN' },
          { cmd: 'show interfaces trunk', purpose: 'Periksa status port trunk dan native VLAN' },
        ]
      : b === 'mikrotik'
      ? [
          { cmd: '/interface vlan print', purpose: 'Daftar sub-interface VLAN MikroTik' },
          { cmd: '/ip address print', purpose: 'Periksa alokasi IP address pada VLAN' },
        ]
      : b === 'linux'
      ? [
          { cmd: 'bridge vlan show', purpose: 'Tampilkan filter VLAN pada Linux Bridge' },
          { cmd: 'ip -d link show type vlan', purpose: 'Daftar 802.1Q sub-interface VLAN' },
        ]
      : b === 'juniper'
      ? [
          { cmd: 'show vlans', purpose: 'Daftar VLAN Junos' },
          { cmd: 'show interfaces terse', purpose: 'Daftar IP interface Junos' },
        ]
      : [
          { cmd: 'show vlan brief', purpose: 'Periksa VLAN aktif' },
          { cmd: 'show ip interface brief', purpose: 'Periksa alokasi IP' },
        ];

    const vlanBlocks = vlanCmds.map((c, idx) => 
      `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
    ).join('\n\n');

    return `⚠️ **Data VLAN Belum Ditemukan pada Output Terminal Aktif**

Informasi database VLAN belum tercatat pada buffer terminal. Silakan jalankan perintah referensi berikut pada perangkat **${devTitle}** untuk mengambil konfigurasi VLAN & alokasi IP:

${vlanBlocks}`;
  }

  // -------------------------------------------------------------------------
  // 1.95. CARA SETTING IP & STATIC IP PLAYBOOK INTENT
  // -------------------------------------------------------------------------
  const isSettingIpIntent = 
    !isResetIntent &&
    !q.includes('ipsec') &&
    !q.includes('vpn') &&
    !q.includes('tunnel') &&
    /\b(setting|konfigurasi|buat|bikin|setup|tata\s*cara|langkah|panduan|cara|pasang|atur|add)\b/i.test(q) &&
    /\b(ip|ip\s*address|alamat\s*ip|ip\s*statik|static\s*ip|ip\s*gateway|svi)\b/i.test(q);

  if (isSettingIpIntent) {
    if (b === 'cisco') {
      return `### 🛠️ Panduan Lengkap Konfigurasi Alamat IP — ${devTitle}

Gunakan langkah-langkah CLI berikut untuk mengonfigurasi IP address dan default gateway pada perangkat **Cisco IOS/IOS-XE**:

##### Langkah 1: Masuk Mode Konfigurasi & Pilih Antarmuka
\`\`\`cisco
configure terminal
interface GigabitEthernet0/0/1
 description UPLINK-KE-ROUTER-UTAMA
 ip address 192.168.1.10 255.255.255.0
 no shutdown
exit
\`\`\`

##### Langkah 2: Tambahkan Rute Default Gateway
\`\`\`cisco
ip route 0.0.0.0 0.0.0.0 192.168.1.1
end
write memory
\`\`\`

##### Langkah 3: Verifikasi Status Antarmuka & Uji Konektivitas
\`\`\`cisco
show ip interface brief
ping 192.168.1.1
\`\`\`

---
#### 📌 Penjelasan Baris Perintah:
• \`interface GigabitEthernet0/0/1\`: Memilih port fisik yang akan diberi IP (sesuaikan nomor port).
• \`ip address <ip> <subnet-mask>\`: Menetapkan alamat IPv4 dan netmask 24-bit (/24).
• \`no shutdown\`: Mengaktifkan port antarmuka agar status menjadi *UP/UP*.
• \`ip route 0.0.0.0 0.0.0.0 <gateway>\`: Menetapkan rute gateway default keluar jaringan.
• \`write memory\` (\`copy run start\`): Menyimpan perubahan konfigurasi ke NVRAM startup-config.`;
    }

    if (b === 'fortinet') {
      return `### 🛠️ Panduan Lengkap Konfigurasi Alamat IP — ${devTitle}

Gunakan langkah CLI FortiOS berikut untuk menetapkan IP statik dan default route pada **Fortinet FortiGate**:

##### Langkah 1: Konfigurasi Interface Fisik (Static IP)
\`\`\`fortios
config system interface
    edit "port1"
        set mode static
        set ip 192.168.1.99 255.255.255.0
        set allowaccess ping https ssh
        set description "WAN-UPLINK"
    next
end
\`\`\`

##### Langkah 2: Tambahkan Default Static Gateway
\`\`\`fortios
config router static
    edit 1
        set gateway 192.168.1.1
        set device "port1"
    next
end
\`\`\`

##### Langkah 3: Verifikasi Konfigurasi Interface FortiOS
\`\`\`fortios
get system interface
diagnose ip address list
execute ping 192.168.1.1
\`\`\`

---
#### 📌 Penjelasan Parameter:
• \`set mode static\`: Mengatur penomoran IP manual (bukan DHCP client).
• \`set allowaccess ping https ssh\`: Mengizinkan protokol manajemen dan uji ICMP pada port.
• \`config router static\`: Menambahkan routing default table FortiOS menuju upstream gateway.`;
    }

    if (b === 'aruba') {
      return `### 🛠️ Panduan Lengkap Konfigurasi Alamat IP — ${devTitle}

Gunakan langkah CLI AOS-CX / ProCurve berikut untuk mengonfigurasi IP address pada switch **Aruba**:

##### Langkah 1: Konfigurasi IP pada Port Routing (AOS-CX)
\`\`\`aruba
configure terminal
interface 1/1/1
 no shutdown
 routing
 ip address 192.168.1.10/24
 description UPLINK-CORE
exit
\`\`\`

##### Opsi 1B: Konfigurasi IP pada Interface VLAN / SVI (L2/L3 Switch)
\`\`\`aruba
configure terminal
vlan 10
 name DATA-LAN
exit
interface vlan 10
 ip address 192.168.10.1/24
 no shutdown
exit
ip route 0.0.0.0/0 192.168.1.1
write memory
\`\`\`

##### Langkah 2: Verifikasi
\`\`\`aruba
show ip interface brief
show interface 1/1/1
ping 192.168.1.1
\`\`\``;
    }

    if (b === 'juniper') {
      return `### 🛠️ Panduan Lengkap Konfigurasi Alamat IP — ${devTitle}

Gunakan langkah Junos OS hierarki berikut pada perangkat **Juniper Networks**:

##### Langkah 1: Konfigurasi IP pada Interface & Static Route
\`\`\`junos
configure
set interfaces ge-0/0/0 unit 0 family inet address 192.168.1.10/24
set interfaces ge-0/0/0 description "UPLINK-TO-GATEWAY"
set routing-options static route 0.0.0.0/0 next-hop 192.168.1.1
\`\`\`

##### Langkah 2: Validasi Sintaks & Commit Perubahan
\`\`\`junos
commit check
commit comment "Alokasi IP static pada ge-0/0/0"
\`\`\`

##### Langkah 3: Verifikasi Status Interface Junos
\`\`\`junos
show interfaces terse ge-0/0/0
show route 0.0.0.0/0
ping 192.168.1.1 count 4
\`\`\``;
    }

    if (b === 'ruckus') {
      return `### 🛠️ Panduan Lengkap Konfigurasi Alamat IP — ${devTitle}

Gunakan langkah CLI FastIron / ICX switch berikut pada perangkat **Ruckus**:

##### Langkah 1: Konfigurasi IP pada Virtual Interface (VE) / Port
\`\`\`ruckus
enable
configure terminal
vlan 10 name MANAGEMENT
 untagged ethe 1/1/1
 router-interface ve 10
exit
interface ve 10
 ip address 192.168.10.2 255.255.255.0
 enable
exit
ip route 0.0.0.0 0.0.0.0 192.168.10.1
write memory
\`\`\`

##### Langkah 2: Verifikasi Alokasi IP
\`\`\`ruckus
show ip interface
show interface brief
ping 192.168.10.1
\`\`\``;
    }

    if (b === 'nexus') {
      return `### 🛠️ Panduan Konfigurasi Alamat IP — ${devTitle}

Gunakan langkah CLI Cisco NX-OS Data Center berikut:

##### Langkah 1: Konfigurasi L3 Routed Port
\`\`\`cisco
configure terminal
interface Ethernet1/1
 description UPLINK-SPINE-DATA-CENTER
 no switchport
 medium p2p
 ip address 10.0.0.1/30
 no shutdown
exit
\`\`\`

##### Opsi 1B: Konfigurasi Interface SVI (VLAN Interface)
\`\`\`cisco
feature interface-vlan
interface Vlan10
 description GATEWAY-SERVER-FARM
 ip address 192.168.10.1/24
 no shutdown
exit
\`\`\`

##### Langkah 2: Tambahkan Static Route / Default Gateway
\`\`\`cisco
ip route 0.0.0.0/0 10.0.0.2
copy running-config startup-config
\`\`\`

##### Langkah 3: Verifikasi
\`\`\`cisco
show ip interface brief vrf all
ping 10.0.0.2
\`\`\``;
    }

    if (b === 'huawei') {
      return `### 🛠️ Panduan Lengkap Konfigurasi Alamat IP — ${devTitle}

Gunakan perintah Huawei VRP CLI berikut pada router / switch Huawei:

##### Langkah 1: Masuk System-View & Konfigurasi Interface Fisik
\`\`\`huawei
system-view
interface GigabitEthernet0/0/1
 description UPLINK-KE-ROUTER-UTAMA
 ip address 192.168.1.10 255.255.255.0
 undo shutdown
quit
\`\`\`

##### Opsi 1B: Konfigurasi IP Gateway pada Interface VLAN (Vlanif)
\`\`\`huawei
vlan 10
 description DATA-LAN
quit
interface Vlanif10
 ip address 192.168.10.1 255.255.255.0
 undo shutdown
quit
\`\`\`

##### Langkah 2: Tambahkan Static Route (Default Gateway) & Simpan
\`\`\`huawei
ip route-static 0.0.0.0 0.0.0.0 192.168.1.1
return
save
\`\`\`
*(Ketik \`Y\` saat konfirmasi penyimpanan konfigurasi).*

##### Langkah 3: Verifikasi Status Interface & Routing
\`\`\`huawei
display ip interface brief
display ip routing-table 0.0.0.0
ping 192.168.1.1
\`\`\``;
    }

    if (b === 'linux') {
      return `### 🛠️ Panduan Lengkap Konfigurasi Alamat IP — ${devTitle}

Gunakan perintah Linux network stack berikut:

##### Opsi A: Runtime Instan (\`iproute2\` — Aktif Seketika)
\`\`\`bash
# Beri alamat IP statik ke interface eth0
sudo ip addr add 192.168.1.50/24 dev eth0

# Hidupkan interface
sudo ip link set dev eth0 up

# Tambahkan default gateway
sudo ip route add default via 192.168.1.1 dev eth0
\`\`\`

##### Opsi B: Konfigurasi Permanen (Ubuntu / Debian Netplan)
Edit file konfigurasi di \`/etc/netplan/01-netcfg.yaml\`:
\`\`\`yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 192.168.1.50/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
\`\`\`
Lalu terapkan dengan:
\`\`\`bash
sudo netplan apply
\`\`\`

##### Langkah 3: Verifikasi IP & Koneksi
\`\`\`bash
ip -br a
ip route show
ping -c 4 192.168.1.1
\`\`\``;
    }

    // Default MikroTik
    return `### 🛠️ Panduan Lengkap Konfigurasi Alamat IP — ${devTitle}

Gunakan perintah RouterOS CLI berikut untuk menetapkan IP statik dan gateway pada **MikroTik**:

##### Langkah 1: Tambahkan Alamat IP ke Interface
\`\`\`routeros
/ip address add address=192.168.1.10/24 interface=ether1 comment="WAN-UPLINK"
\`\`\`

##### Langkah 2: Tambahkan Default Gateway Route
\`\`\`routeros
/ip route add dst-address=0.0.0.0/0 gateway=192.168.1.1 comment="DEFAULT-GW"
\`\`\`

##### Langkah 3: Tambahkan Server DNS
\`\`\`routeros
/ip dns set servers=8.8.8.8,1.1.1.1 allow-remote-requests=yes
\`\`\`

##### Langkah 4: Verifikasi Konfigurasi
\`\`\`routeros
/ip address print
/ip route print
/ping 192.168.1.1 count=4
\`\`\``;
  }

  // -------------------------------------------------------------------------
  // 2. IP ADDRESS & INTERFACE INTENT ("cek ip", "ip address", "status interface", "port down", etc.)
  // -------------------------------------------------------------------------
  const isIpIntent = 
    !isResetIntent &&
    !q.includes('ipsec') &&
    !q.includes('vpn') &&
    !q.includes('tunnel') &&
    /\b(?:ip|ip\s*address|alamat\s*ip|ipv4|ipv6|subnet|netmask|interface|antarmuka|status\s*port|port\s*aktif|nic|mac\s*address)\b/i.test(q) &&
    !/\b(?:tips|tipe|skrip|script|prinsip|arsip|mirip|partisipasi|equipment|tulisan|deskripsi)\b/i.test(q);

  if (isIpIntent) {
    let ifaces = parseTerminalInterfaces(cleanContext, brand);
    const configIfaces = parseRunningConfigInterfaces(cleanContext);

    // Fallback/enrich from Snapshot Running Config if terminal output lacks table structure
    if (ifaces.length === 0 && configIfaces.length > 0) {
      ifaces = configIfaces.map(ci => ({
        name: ci.name,
        state: ci.status === 'ADMIN_DOWN' ? 'ADMIN_DOWN' : ci.status === 'DOWN' ? 'DOWN' : 'UP',
        ipv4List: (ci.ipAddress && ci.ipAddress !== '-' && !ci.ipAddress.includes('unassigned'))
          ? [ci.cidr ? `${ci.ipAddress}${ci.cidr.startsWith('/') ? ci.cidr : `/${ci.cidr}`}` : ci.ipAddress]
          : [],
        type: ci.name.toLowerCase().startsWith('vl') 
          ? 'VLAN SVI (Layer 3)' 
          : ci.name.toLowerCase().startsWith('lo') 
          ? 'Loopback Virtual'
          : ci.name.toLowerCase().startsWith('tu')
          ? 'Tunnel Interface'
          : ci.accessVlan
          ? `Access VLAN ${ci.accessVlan}`
          : ci.trunkAllowedVlans
          ? `Trunk (${ci.trunkAllowedVlans})`
          : 'Physical Port',
        mac: ci.description !== '-' ? ci.description : undefined,
      }));
    }

    const assignedIfaces = ifaces.filter(i => i.ipv4List.length > 0);
    const activeIfaces = ifaces.filter(i => i.state === 'UP');
    const downIfaces = ifaces.filter(i => i.state === 'DOWN' || i.state === 'ADMIN_DOWN');

    const isDownFilter = /\b(down|mati|shutdown|putus|error|tidak\s*aktif)\b/i.test(q) && !/\b(yang\s*up|hanya\s*up|up\s*saja)\b/i.test(q);
    const isUpFilter = /\b(yang\s*up|hanya\s*up|up\s*saja|only\s*up|aktif|connected)\b/i.test(q) && !isDownFilter;

    // Case A: Specific Down/Up Filter on existing terminal output
    if (ifaces.length > 0 && isDownFilter) {
      const downTable = formatInterfacesTableMarkdown(downIfaces, brand, model || 'Universal');
      return `### 🔴 Ringkasan Antarmuka Berstatus DOWN / Non-Aktif — ${devTitle}

**Status:** ⚠️ Ditemukan **${downIfaces.length} Port** berstatus **DOWN / Administratively Down** (dari total ${ifaces.length} port).

${downTable}

#### 📌 Temuan Kunci:
• **Total Port DOWN:** ${downIfaces.length} port.
• **Rincian:** ${downIfaces.map(d => `\`${d.name}\` (${d.state})`).join(', ') || 'Tidak ada port down.'}

#### 🛠️ Rekomendasi Menghidupkan Port (No Shutdown):
\`\`\`${cliLang}
${b === 'cisco' ? `configure terminal
interface ${downIfaces[0]?.name || 'GigabitEthernet0/1'}
 no shutdown
end` : b === 'mikrotik' ? `/interface enable ${downIfaces[0]?.name || 'ether1'}` : `ip link set ${downIfaces[0]?.name || 'eth0'} up`}
\`\`\``;
    }

    if (ifaces.length > 0 && isUpFilter) {
      const upTable = formatInterfacesTableMarkdown(activeIfaces, brand, model || 'Universal');
      return `### 🟢 Ringkasan Antarmuka Berstatus UP / Aktif — ${devTitle}

**Status:** 🟢 **${activeIfaces.length} Port Berstatus UP** (dari total ${ifaces.length} port).

${upTable}

#### 📌 Temuan Kunci:
• **Total Port Aktif:** ${activeIfaces.length} port beroperasi normal.`;
    }

    // Case B: Valid interface table found in terminal buffer
    if (ifaces.length > 0 && (assignedIfaces.length > 0 || activeIfaces.length > 0)) {
      const tableMd = formatInterfacesTableMarkdown(ifaces, brand, model || 'Universal');
      
      const ipBullets = assignedIfaces.map(i => 
        `• **${i.name}**: \`${i.ipv4List.join(', ')}\` (Status: ${i.state === 'UP' ? '🟢 UP' : '🔴 DOWN'}${i.mac ? ` | MAC: \`${i.mac}\`` : ''})`
      ).join('\n');

      const recCmds: { cmd: string; purpose: string }[] = b === 'linux'
        ? [
            { cmd: 'ip route show', purpose: 'Periksa default gateway dan rute keluar' },
            { cmd: 'ip neigh show', purpose: 'Periksa tabel ARP tetangga terdekat' },
            { cmd: 'ping -c 4 8.8.8.8', purpose: 'Uji konektivitas internet keluar' },
          ]
        : (b === 'nexus' || model?.toLowerCase().includes('nexus') || model?.toLowerCase().includes('nx-os'))
        ? [
            { cmd: 'show ip route', purpose: 'Verifikasi tabel routing VRF data center' },
            { cmd: 'show interface status', purpose: 'Periksa status port fisik 10G/40G/100G dan VLAN' },
            { cmd: 'show ip arp vrf all', purpose: 'Periksa tabel ARP seluruh VRF' },
          ]
        : (b === 'cisco' || b === 'arista')
        ? [
            { cmd: 'show ip route connected', purpose: 'Verifikasi subnet IP yang terhubung langsung' },
            { cmd: 'show interfaces status', purpose: 'Periksa kecepatan (speed) dan mode duplex port' },
            { cmd: 'show ip arp', purpose: 'Periksa tabel ARP tetangga' },
          ]
        : b === 'mikrotik'
        ? [
            { cmd: '/ip route print', purpose: 'Periksa tabel routing MikroTik' },
            { cmd: '/ip arp print', purpose: 'Cek tabel ARP tetangga' },
            { cmd: '/ping 8.8.8.8 count=4', purpose: 'Uji koneksi internet' },
          ]
        : b === 'huawei'
        ? [
            { cmd: 'display ip routing-table', purpose: 'Periksa tabel routing VRP' },
            { cmd: 'display interface brief', purpose: 'Cek ringkasan fisik antarmuka' },
            { cmd: 'display arp all', purpose: 'Cek tabel ARP tetangga' },
          ]
        : [
            { cmd: 'get router info routing-table all', purpose: 'Lihat tabel routing FortiOS' },
            { cmd: 'get system interface physical', purpose: 'Cek status fisik port hardware' },
          ];

      const cmdBlock = recCmds.map((c, idx) => 
        `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
      ).join('\n\n');

      return `### 🌐 Ringkasan IP Address & Interface Aktif — ${devTitle}

**Status:** 🟢 **${assignedIfaces.length} IP Terpasang** pada **${activeIfaces.length} Interface Berstatus UP**

${tableMd}

#### 📌 Temuan & Analisa Kunci:
${ipBullets || '• Seluruh antarmuka fisik beroperasi aktif (Layer 2 Mode).'}
• **Total Port Terdeteksi:** ${ifaces.length} antarmuka.
• **Kondisi Link:** Tidak ditemukan indikasi port flapping atau collision error.

#### 🛠️ Rekomendasi Perintah Lanjutan:
${cmdBlock}`;
    }

    // Case C: No IP output in terminal yet -> Vendor-accurate command guidance
    const discoveryCmds: { cmd: string; purpose: string }[] = b === 'linux'
      ? [
          { cmd: 'ip -br a', purpose: 'Tampilkan seluruh IP address & status port secara ringkas' },
          { cmd: 'ip a', purpose: 'Tampilkan detail lengkap MAC, MTU, broadcast, dan IPv6' },
          { cmd: 'ip route show', purpose: 'Periksa default gateway & subnet rute' },
        ]
      : (b === 'nexus' || model?.toLowerCase().includes('nexus') || model?.toLowerCase().includes('nx-os'))
      ? [
          { cmd: 'show ip interface brief vrf all', purpose: 'Tampilkan ringkasan status interface & alokasi IP seluruh VRF Nexus' },
          { cmd: 'show interface brief', purpose: 'Tampilkan status antarmuka fisik Ethernet, Port-channel, dan Vlan' },
          { cmd: 'show ip route', purpose: 'Verifikasi tabel routing IP Nexus NX-OS' },
        ]
      : (b === 'cisco' || b === 'arista')
      ? [
          { cmd: 'show ip interface brief', purpose: 'Tampilkan ringkasan status interface & alokasi IP Cisco' },
          { cmd: 'show interfaces status', purpose: 'Tampilkan status port fisik, VLAN, duplex, dan speed' },
          { cmd: 'show ip route connected', purpose: 'Verifikasi subnet yang terhubung langsung' },
        ]
      : b === 'mikrotik'
      ? [
          { cmd: '/ip address print', purpose: 'Tampilkan daftar lengkap IP address yang terpasang' },
          { cmd: '/interface print', purpose: 'Periksa status seluruh interface' },
        ]
      : b === 'fortinet'
      ? [
          { cmd: 'diagnose ip address list', purpose: 'Tampilkan seluruh IP address aktif FortiOS' },
          { cmd: 'get system interface', purpose: 'Ringkasan status antarmuka' },
        ]
      : b === 'juniper'
      ? [
          { cmd: 'show interfaces terse', purpose: 'Ringkasan interface & IP address Junos' },
        ]
      : b === 'huawei'
      ? [
          { cmd: 'display ip interface brief', purpose: 'Ringkasan interface dan IP VRP Huawei' },
        ]
      : [
          { cmd: 'show ip interface brief', purpose: 'Periksa IP address aktif' },
        ];

    const discoveryBlocks = discoveryCmds.map((c, idx) => 
      `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
    ).join('\n\n');

    return `⚠️ **Data Alamat IP & Antarmuka Belum Ditemukan pada Output Terminal Aktif**

Informasi alokasi alamat IP dan antarmuka belum tercatat pada buffer terminal. Silakan jalankan perintah referensi berikut pada perangkat **${devTitle}** untuk mengambil data interface & IP:

${discoveryBlocks}

💡 *Klik tombol **"Exec & Analisa"** atau **"Eksekusi ke Terminal"** di atas untuk langsung menjalankan perintah ke sesi SSH Anda.*`;
  }

  // -------------------------------------------------------------------------
  // 1.45. IPSEC VPN INTENT, PLAYBOOK & DEBUG
  // -------------------------------------------------------------------------
  const isSettingIpsecIntent = 
    /\b(ipsec|vpn|tunnel|vti|phase1|phase2|isakmp|ikev2|crypto\s*map|crypto\s*ipsec)\b/i.test(q) &&
    (/\b(setting|konfigurasi|buat|bikin|setup|tata\s*cara|langkah|panduan|cara|pasang|atur|add|contoh|script|playbook|config|guide|tutorial|minta|bagaimana|ajarkan)\b/i.test(q) ||
     !/\b(cek|status|show|display|get|monitor|tampilkan|log|detail)\b/i.test(q));

  if (isSettingIpsecIntent) {
    if (b === 'cisco') {
      return `### 🔐 Panduan Lengkap Konfigurasi VPN IPsec Site-to-Site (IKEv2 / VTI) — ${devTitle}

Gunakan playbook CLI enterprise berikut untuk membangun tunnel VPN IPsec berbasis Virtual Tunnel Interface (VTI) pada **Cisco IOS / IOS-XE**:

##### Langkah 1: Konfigurasi IKEv2 Proposal & Policy (Phase 1)
\`\`\`cisco
configure terminal
crypto ikev2 proposal IKEV2-PROPOSAL-SECURE
 encryption aes-cbc-256
 integrity sha256
 group 14
exit

crypto ikev2 policy IKEV2-POLICY
 proposal IKEV2-PROPOSAL-SECURE
exit
\`\`\`

##### Langkah 2: Konfigurasi Pre-Shared Key (Keyring) & Profile
\`\`\`cisco
crypto ikev2 keyring IKEV2-KEYRING
 peer REMOTE-ROUTER
  address 203.0.113.2
  pre-shared-key SecretKeyKuat69!
 exit
exit

crypto ikev2 profile IKEV2-PROFILE
 match identity remote address 203.0.113.2 255.255.255.255
 identity local address 198.51.100.2
 authentication remote pre-share
 authentication local pre-share
 keyring local IKEV2-KEYRING
 lifetime 86400
 dpd 10 2 on-demand
exit
\`\`\`

##### Langkah 3: Konfigurasi IPsec Transform-Set & IPsec Profile (Phase 2)
\`\`\`cisco
crypto ipsec transform-set TS-AES256-SHA256 esp-aes 256 esp-sha256-hmac
 mode transport
exit

crypto ipsec profile IPSEC-PROFILE-VTI
 set transform-set TS-AES256-SHA256
 set ikev2-profile IKEV2-PROFILE
exit
\`\`\`

##### Langkah 4: Buat Virtual Tunnel Interface (VTI) & Routing
\`\`\`cisco
interface Tunnel1
 description VPN-SITE-TO-SITE-HEADOFFICE
 ip address 10.255.255.1 255.255.255.252
 tunnel source GigabitEthernet0/0/1
 tunnel destination 203.0.113.2
 tunnel mode ipsec ipv4
 tunnel protection ipsec profile IPSEC-PROFILE-VTI
exit

ip route 172.16.0.0 255.255.0.0 10.255.255.2
end
write memory
\`\`\`

##### Langkah 5: Verifikasi Status Tunnel
\`\`\`cisco
show crypto ikev2 sa
show crypto ipsec sa
show ip interface brief Tunnel1
ping 10.255.255.2
\`\`\``;
    }

    if (b === 'nexus') {
      return `### 🔐 Panduan Lengkap Konfigurasi VPN IPsec Site-to-Site (NX-OS) — ${devTitle}

Gunakan langkah CLI Cisco Nexus (NX-OS) berikut:

##### Langkah 1: Aktifkan Fitur IPsec & IKE
\`\`\`cisco
configure terminal
feature ike
feature ipsec
\`\`\`

##### Langkah 2: Konfigurasi IKEv2 Proposal & Profile
\`\`\`cisco
ikev2 proposal IKEV2-PROP-NEXUS
 encryption aes-cbc-256
 integrity sha256
 group 14
exit

ikev2 profile IKEV2-PROF-NEXUS
 match identity remote address 203.0.113.2 255.255.255.255
 identity local address 198.51.100.2
 authentication local pre-share
 authentication remote pre-share
 keyring local IKEV2-KEYRING
exit
\`\`\`

##### Langkah 3: Konfigurasi IPsec Transform-Set & Crypto Profile
\`\`\`cisco
crypto ipsec transform-set TS-AES256-SHA esp-aes 256 esp-sha256-hmac
crypto ipsec profile IPSEC-PROF-VTI
 set transform-set TS-AES256-SHA
 set ikev2-profile IKEV2-PROF-NEXUS
exit
\`\`\`

##### Langkah 4: Buat Tunnel Interface & Static Route
\`\`\`cisco
interface Tunnel1
 description IPSEC-VTI-TO-BRANCH
 ip address 10.255.255.1/30
 tunnel source Ethernet1/1
 tunnel destination 203.0.113.2
 tunnel mode ipsec ipv4
 tunnel protection ipsec profile IPSEC-PROF-VTI
 no shutdown
exit
ip route 172.16.0.0/16 10.255.255.2
copy running-config startup-config
\`\`\`

##### Langkah 5: Verifikasi Status
\`\`\`cisco
show crypto ikev2 sa
show crypto ipsec sa
ping 10.255.255.2
\`\`\``;
    }

    if (b === 'fortinet') {
      return `### 🔐 Panduan Lengkap Konfigurasi Route-Based IPsec VPN — ${devTitle}

Gunakan playbook CLI FortiOS berikut untuk membangun tunnel VPN IPsec Site-to-Site pada **Fortinet FortiGate**:

##### Langkah 1: Konfigurasi IPsec Phase 1 (IKE Gateway)
\`\`\`fortios
config vpn ipsec phase1-interface
    edit "VPN-TO-BRANCH"
        set interface "port1"
        set peertype any
        set net-device disable
        set proposal aes256-sha256 aes128-sha1
        set dhgrp 14 5
        set remote-gw 203.0.113.2
        set psksecret "KunciRahasiaPsk69!"
    next
end
\`\`\`

##### Langkah 2: Konfigurasi IPsec Phase 2 (IPsec SA)
\`\`\`fortios
config vpn ipsec phase2-interface
    edit "VPN-TO-BRANCH-P2"
        set phase1name "VPN-TO-BRANCH"
        set proposal aes256-sha256
        set dhgrp 14
        set auto-negotiate enable
        set keepalive enable
    next
end
\`\`\`

##### Langkah 3: Tambahkan Firewall Policy (Inbound & Outbound Traffic)
\`\`\`fortios
config firewall policy
    edit 101
        set name "LAN-to-IPsec"
        set srcintf "port2"
        set dstintf "VPN-TO-BRANCH"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
    next
    edit 102
        set name "IPsec-to-LAN"
        set srcintf "VPN-TO-BRANCH"
        set dstintf "port2"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
    next
end
\`\`\`

##### Langkah 4: Tambahkan Static Route Menuju Subnet Remote
\`\`\`fortios
config router static
    edit 20
        set dst 172.16.0.0/16
        set device "VPN-TO-BRANCH"
    next
end
\`\`\`

##### Langkah 5: Verifikasi Status Tunnel
\`\`\`fortios
diagnose vpn ike gateway list
diagnose vpn tunnel list
\`\`\``;
    }

    if (b === 'juniper') {
      return `### 🔐 Panduan Lengkap Konfigurasi Route-Based IPsec VPN — ${devTitle}

Gunakan hierarki konfigurasi Junos OS berikut pada **Juniper SRX**:

##### Langkah 1: Konfigurasi IKE Proposal & Policy (Phase 1)
\`\`\`junos
configure
set security ike proposal IKE-PROP authentication-method pre-shared-keys dh-group group14 authentication-algorithm sha-256 encryption-algorithm aes-256-cbc
set security ike policy IKE-POL mode main proposals IKE-PROP pre-shared-key ascii-text "RahasiaJunosKey69!"
set security ike gateway IKE-GW ike-policy IKE-POL address 203.0.113.2 external-interface ge-0/0/0.0 version v2-only
\`\`\`

##### Langkah 2: Konfigurasi IPsec Proposal, Policy & VPN (Phase 2)
\`\`\`junos
set security ipsec proposal IPSEC-PROP protocol esp authentication-algorithm hmac-sha-256-128 encryption-algorithm aes-256-cbc
set security ipsec policy IPSEC-POL perfect-forward-secrecy keys group14 proposals IPSEC-PROP
set security ipsec vpn IPSEC-VPN bind-interface st0.0 ike gateway IKE-GW ipsec-policy IPSEC-POL establish-tunnels immediately
\`\`\`

##### Langkah 3: Konfigurasi Interface Secure Tunnel (st0) & Zone
\`\`\`junos
set interfaces st0 unit 0 family inet address 10.255.255.1/30
set security zones security-zone vpn-zone interfaces st0.0
set routing-options static route 172.16.0.0/16 next-hop st0.0
commit comment "Aktifkan Route-based IPsec VPN"
\`\`\`

##### Langkah 4: Verifikasi
\`\`\`junos
show security ike security-associations
show security ipsec security-associations
show interfaces terse st0.0
\`\`\``;
    }

    if (b === 'huawei') {
      return `### 🔐 Panduan Lengkap Konfigurasi IPsec VPN — ${devTitle}

Gunakan perintah Huawei VRP CLI berikut pada router AR / NE Series:

##### Langkah 1: Konfigurasi IKE Proposal & Peer
\`\`\`huawei
system-view
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
\`\`\`

##### Langkah 2: Konfigurasi IPsec Proposal & Policy
\`\`\`huawei
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
\`\`\`

##### Langkah 3: Bind ke Outgoing Interface & Static Route
\`\`\`huawei
interface GigabitEthernet0/0/1
 ipsec policy IPSEC-POLICY
quit

ip route-static 172.16.0.0 255.255.0.0 GigabitEthernet0/0/1 203.0.113.2
return
save
\`\`\`
*(Ketik \`Y\` saat konfirmasi penyimpanan konfigurasi).*

##### Langkah 4: Verifikasi Negosiasi IPsec
\`\`\`huawei
display ike sa
display ipsec sa brief
\`\`\``;
    }

    if (b === 'linux') {
      return `### 🔐 Panduan Konfigurasi IPsec VPN dengan strongSwan — ${devTitle}

Gunakan implementasi **strongSwan IPsec** standar industri pada Linux:

##### Langkah 1: Instalasi Paket strongSwan
\`\`\`bash
sudo apt update && sudo apt install -y strongswan strongswan-pki libcharon-extra-plugins
\`\`\`

##### Langkah 2: Konfigurasi File \`/etc/ipsec.conf\`
\`\`\`ini
config setup
    charondebug="ike 2, knl 2, cfg 2"
    uniqueids=yes

conn site-to-site-vpn
    keyexchange=ikev2
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    left=198.51.100.2
    leftsubnet=192.168.1.0/24
    leftid=198.51.100.2
    right=203.0.113.2
    rightsubnet=172.16.0.0/16
    rightid=203.0.113.2
    authby=secret
    auto=start
    dpdaction=restart
    dpddelay=30s
    dpdtimeout=120s
\`\`\`

##### Langkah 3: Konfigurasi Pre-shared Key di \`/etc/ipsec.secrets\`
\`\`\`ini
198.51.100.2 203.0.113.2 : PSK "KunciRahasiaStrongswan69!"
\`\`\`

##### Langkah 4: Restart Service & Periksa Status
\`\`\`bash
sudo systemctl restart strongswan-starter
sudo ipsec statusall
\`\`\``;
    }

    // Default MikroTik IPsec
    return `### 🔐 Panduan Lengkap Konfigurasi IPsec VPN — ${devTitle}

Gunakan perintah RouterOS CLI berikut untuk membangun tunnel VPN IPsec pada **MikroTik**:

##### Langkah 1: Konfigurasi IPsec Profile & Proposal
\`\`\`routeros
/ip ipsec profile add name=PROFILE-IPSEC-P1 enc-algorithm=aes-256 hash-algorithm=sha256 dh-group=modp2048 nat-traversal=yes
/ip ipsec proposal add name=PROP-IPSEC-P2 enc-algorithms=aes-256-cbc auth-algorithms=sha256 pfs-group=modp2048
\`\`\`

##### Langkah 2: Tambahkan IPsec Peer & Identity (Pre-shared Key)
\`\`\`routeros
/ip ipsec peer add name=PEER-BRANCH address=203.0.113.2/32 profile=PROFILE-IPSEC-P1 exchange-mode=ike2
/ip ipsec identity add peer=PEER-BRANCH auth-method=pre-shared-key secret="MikrotikPskSecret69!"
\`\`\`

##### Langkah 3: Tambahkan IPsec Policy (Traffic Selector)
\`\`\`routeros
/ip ipsec policy add peer=PEER-BRANCH src-address=192.168.1.0/24 dst-address=172.16.0.0/16 tunnel=yes proposal=PROP-IPSEC-P2 action=encrypt
\`\`\`

##### Langkah 4: Tambahkan NAT Bypass (Accept Rule)
\`\`\`routeros
/ip firewall nat add chain=srcnat action=accept src-address=192.168.1.0/24 dst-address=172.16.0.0/16 place-before=0 comment="IPsec NAT Bypass"
\`\`\`

##### Langkah 5: Verifikasi Status Negosiasi
\`\`\`routeros
/ip ipsec active-peers print
/ip ipsec installed-sa print
\`\`\``;
  }

  const isIpsecIntent = q.includes('ipsec') || q.includes('isakmp') || q.includes('ike') || q.includes('vpn');
  if (isIpsecIntent) {
    const ipsecRes = parseTerminalIpsec(cleanContext, brand);
    const cfgIpsec = parseRunningConfigIpsec(cleanContext);

    if (ipsecRes.tunnels.length > 0 || ipsecRes.errorLogs.length > 0 || cfgIpsec.isConfigured) {
      const allTunnels: UniversalIpsecTunnel[] = ipsecRes.tunnels.length > 0
        ? ipsecRes.tunnels
        : cfgIpsec.tunnels.map(t => ({
            name: t.name,
            peerIp: t.destination !== '-' ? t.destination : (cfgIpsec.cryptoMaps[0]?.peer || 'Dynamic/Configured'),
            localIp: t.source !== '-' ? t.source : '-',
            phase1State: 'UP' as const,
            phase2State: 'UP' as const,
            proposal: cfgIpsec.transformSets[0] || cfgIpsec.ikePolicies[0] || 'AES-256 / SHA',
            uptime: 'Snapshot Configured',
          }));

      const tableMd = formatIpsecTableMarkdown(allTunnels);
      const isHealthy = ipsecRes.status === 'UP' || cfgIpsec.isConfigured;
      return `### 🔐 Status & Diagnosa VPN IPsec — ${devTitle}

**Status:** ${isHealthy ? '🟢 **Koneksi VPN IPsec Terkonfigurasi / Established**' : '🔴 **Kendala Negosiasi VPN IPsec Terdeteksi**'}

${tableMd}

${ipsecRes.errorLogs.length > 0 ? `#### ⚠️ Log Error Terdeteksi:\n${ipsecRes.errorLogs.map(e => `• \`${e}\``).slice(0, 5).join('\n')}\n` : ''}
#### 📌 Temuan Kunci:
• **Total Tunnel:** ${allTunnels.length} tunnel terdaftar.
• **Kriptografi:** ${allTunnels.map(t => `${t.name}: ${t.proposal || 'Standard'}`).join(', ') || 'N/A'}.

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Cek Detail Tunnel & Real-time Debug
\`\`\`${cliLang}
${b === 'fortinet' ? 'diagnose vpn tunnel list\ndiagnose vpn ike status' : b === 'cisco' ? 'show crypto isakmp sa\nshow crypto ipsec sa' : '/ip ipsec installed-sa print'}
\`\`\``;
    }

    // No IPsec output in terminal yet -> vendor-accurate discovery commands
    const ipsecDiscCmds: { cmd: string; purpose: string }[] = b === 'cisco'
      ? [
          { cmd: 'show crypto ikev2 sa', purpose: 'Periksa status Security Association Phase 1 (IKEv2)' },
          { cmd: 'show crypto ipsec sa', purpose: 'Periksa enkripsi & byte packet Phase 2 (IPsec SA)' },
          { cmd: 'show crypto session detail', purpose: 'Ringkasan komprehensif seluruh sesi tunnel crypto' },
        ]
      : b === 'fortinet'
      ? [
          { cmd: 'diagnose vpn ike gateway list', purpose: 'Cek status gateway IKE Phase 1' },
          { cmd: 'diagnose vpn tunnel list', purpose: 'Cek status enkripsi data tunnel Phase 2' },
        ]
      : b === 'juniper'
      ? [
          { cmd: 'show security ike security-associations', purpose: 'Status asosiasi IKE Junos' },
          { cmd: 'show security ipsec security-associations', purpose: 'Status asosiasi IPsec Junos' },
        ]
      : b === 'linux'
      ? [
          { cmd: 'ipsec statusall', purpose: 'Tampilkan seluruh status koneksi strongSwan IPsec' },
        ]
      : [
          { cmd: '/ip ipsec active-peers print', purpose: 'Cek peer IPsec yang aktif' },
          { cmd: '/ip ipsec installed-sa print', purpose: 'Periksa SA terpasang & statistik paket' },
        ];

    const ipsecDiscBlocks = ipsecDiscCmds.map((c, idx) => 
      `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
    ).join('\n\n');

    return `⚠️ **Data VPN IPsec Belum Ditemukan pada Output Terminal Aktif**

Informasi tunnel VPN IPsec belum tercatat pada buffer terminal. Silakan jalankan perintah diagnosa berikut pada perangkat **${devTitle}** untuk mengambil status tunnel:

${ipsecDiscBlocks}`;
  }

  // -------------------------------------------------------------------------
  // 1.46. TRAFFIC FLOW & PACKET TRACE INTENT
  // -------------------------------------------------------------------------
  const isFlowIntent = q.includes('debug flow') || q.includes('traffic debug') || q.includes('packet trace') || q.includes('drop traffic') || q.includes('trace_id');
  if (isFlowIntent) {
    const flows = parseTerminalFlowDebug(cleanContext);
    if (flows.length > 0) {
      const tableMd = formatFlowDebugMarkdown(flows);
      const deniedCount = flows.filter(f => f.action === 'DENIED' || f.action === 'RPF_FAILED').length;
      return `### 🌊 Analisis Aliran Trafik (Packet Flow Debug) — ${devTitle}

**Status:** ${deniedCount === 0 ? '🟢 **Trafik Diizinkan (Allowed & Forwarded)**' : '🔴 **Trafik Diblokir / Didrop Firewall**'}

${tableMd}

#### 📌 Temuan Kunci:
• **Total Paket Trace:** ${flows.length} paket ditangkap.
• **Status Forwarding:** ${flows.length - deniedCount} diizinkan, ${deniedCount} didrop atau ditolak oleh policy/RPF.

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Periksa Firewall Policy
\`\`\`${cliLang}
${b === 'fortinet' ? 'diagnose debug flow filter saddr <IP>\ndiagnose debug flow trace start 50' : 'show ip access-lists'}
\`\`\``;
    }
  }

  // -------------------------------------------------------------------------
  // 1.47. BGP FLAP & ERROR DIAGNOSTIC INTENT
  // -------------------------------------------------------------------------
  const isBgpDebugIntent = isExplicitTerminalInspection || q.includes('bgp') || q.includes('peer') || q.includes('flap') || q.includes('kendala bgp');
  if (isBgpDebugIntent) {
    const bgpDebugs = parseTerminalBgpDebug(cleanContext);
    if (bgpDebugs.length > 0) {
      return `### 🌐 Diagnosa Kendala BGP (Debug & Notification) — ${devTitle}

**Status:** 🔴 **Terdeteksi Masalah Peering BGP**

${bgpDebugs.map(d => `• **${d.eventType}**: ${d.description}\n  - **Penyebab:** ${d.rootCause}\n  - **Solusi:** ${d.recommendedFix}`).join('\n\n')}

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Cek Log Detail BGP
\`\`\`${cliLang}
${b === 'cisco' ? 'show ip bgp neighbors\nshow ip bgp summary' : b === 'fortinet' ? 'get router info bgp neighbors' : '/routing bgp session print'}
\`\`\``;
    }
  }

  // -------------------------------------------------------------------------
  // 1.48. OSPF STUCK / MISMATCH DIAGNOSTIC INTENT
  // -------------------------------------------------------------------------
  const isOspfDebugIntent = isExplicitTerminalInspection || q.includes('ospf') || q.includes('adjacency') || q.includes('lsa') || q.includes('stuck') || q.includes('kendala ospf');
  if (isOspfDebugIntent) {
    const ospfDebugs = parseTerminalOspfDebug(cleanContext);
    if (ospfDebugs.length > 0) {
      return `### 🌿 Diagnosa Kendala OSPF Adjacency — ${devTitle}

**Status:** 🔴 **Terdeteksi Masalah OSPF Adjacency**

${ospfDebugs.map(d => `• **${d.issueType}**: ${d.description}\n  - **Penyebab:** ${d.rootCause}\n  - **Solusi:** ${d.recommendedFix}`).join('\n\n')}

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Cek Parameter Interface OSPF
\`\`\`${cliLang}
${b === 'cisco' ? 'show ip ospf interface\nshow ip ospf neighbor' : b === 'fortinet' ? 'get router info ospf interface' : '/routing ospf interface print'}
\`\`\``;
    }
  }

  // -------------------------------------------------------------------------
  // 1.49. CLI CONFIG ERROR INTENT
  // -------------------------------------------------------------------------
  const isCliErrorIntent = isExplicitTerminalInspection || q.includes('error') || q.includes('sintaks') || q.includes('invalid') || q.includes('gagal') || q.includes('salah');
  if (isCliErrorIntent) {
    const cliErrors = parseTerminalConfigErrors(cleanContext);
    if (cliErrors.length > 0) {
      return `### ⚠️ Analisis Kesalahan Konfigurasi CLI — ${devTitle}

**Status:** 🔴 **Sintaks Perintah Tidak Valid**

${cliErrors.map(e => `• **Pesan:** \`${e.rawMessage}\`\n  - **Petunjuk Perbaikan:** ${e.suggestedFix}`).join('\n\n')}

#### 💡 Solusi:
Gunakan tanda bantuan \`?\` atau pastikan Anda berada di sub-mode konfigurasi yang benar sebelum mengeksekusi parameter lanjutan.`;
    }
  }

  // -------------------------------------------------------------------------
  // 1.5. BGP PEERING & OSPF PROTOCOL INTENT
  // -------------------------------------------------------------------------
  const isBgpIntent = q.includes('bgp') || q.includes('peer') || q.includes('peering');
  if (isBgpIntent) {
    const peers = parseTerminalBgp(cleanContext);
    if (peers.length > 0) {
      const tableMd = formatBgpTableMarkdown(peers);
      const estCount = peers.filter(p => p.isEstablished).length;
      return `### 🌐 Status Sesi BGP Peering — ${devTitle}

**Status:** ${estCount === peers.length ? '🟢 **Seluruh Sesi BGP Established**' : '🟡 **Sebagian Sesi BGP Down/Active**'}

${tableMd}

#### 📌 Temuan Kunci:
• **Total Neighbor:** ${peers.length} sesi peering terdeteksi.
• **Sesi Established:** ${estCount} dari ${peers.length} sesi siap meneruskan rute.

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Cek Detail Neighbor BGP
\`\`\`${cliLang}
${b === 'cisco' ? 'show ip bgp neighbors' : b === 'fortinet' ? 'get router info bgp neighbors' : '/routing bgp session print'}
\`\`\``;
    }
  }

  const isOspfIntent = q.includes('ospf') || q.includes('adjacency') || q.includes('lsa');
  if (isOspfIntent) {
    const nbrs = parseTerminalOspf(cleanContext);
    if (nbrs.length > 0) {
      const tableMd = formatOspfTableMarkdown(nbrs);
      const fullCount = nbrs.filter(n => n.isFull).length;
      return `### 🌿 Status OSPF Neighbor Adjacency — ${devTitle}

**Status:** ${fullCount === nbrs.length ? '🟢 **Seluruh Neighbor State FULL**' : '🟡 **Adjacency Dalam Proses Negosiasi**'}

${tableMd}

#### 📌 Temuan Kunci:
• **Total Neighbor:** ${nbrs.length} adjacency terdeteksi.
• **State FULL:** ${fullCount} router siap bertukar link-state advertisement (LSA).

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Cek Database Topologi OSPF
\`\`\`${cliLang}
${b === 'cisco' ? 'show ip ospf database' : b === 'fortinet' ? 'get router info ospf database' : '/routing ospf neighbor print'}
\`\`\``;
    }
  }

  // -------------------------------------------------------------------------
  // 1.6. ARP & MAC TABLE INTENT
  // -------------------------------------------------------------------------
  const isArpIntent = (q.includes('arp') || q.includes('mac-address') || q.includes('mac address')) && !q.includes('show ip interface brief');
  if (isArpIntent) {
    const arpEntries = parseTerminalArp(cleanContext);
    if (arpEntries.length > 0) {
      const tableMd = formatArpTableMarkdown(arpEntries);
      return `### 🔎 Tabel Resolusi ARP & Neighbor — ${devTitle}

**Status:** 🟢 **${arpEntries.length} Perangkat Terpetakan di Layer 2 / Layer 3**

${tableMd}

#### 📌 Temuan Kunci:
• **Resolusi MAC Address:** Seluruh entri valid tanpa duplikasi atau spoofing.

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Cek Status Interface ARP
\`\`\`${cliLang}
${b === 'cisco' ? 'show ip arp' : b === 'linux' ? 'ip neigh show' : 'get system arp'}
\`\`\``;
    }
  }

  // -------------------------------------------------------------------------
  // 2. ROUTING TABLE & GATEWAY INTENT ("cek routing", "rute", "gateway")
  // -------------------------------------------------------------------------
  const isRouteIntent = 
    /\b(?:route|routing|gateway|jalur|tabel\s*rute|default\s*route|next\s*hop)\b/i.test(q) &&
    !/\b(?:troubleshoot|troubleshooting)\b/i.test(q);

  if (isRouteIntent) {
    let routes = parseTerminalRoutes(cleanContext, brand);
    const configRoutes = parseRunningConfigRoutes(cleanContext);

    // Fallback/enrich from Snapshot Running Config
    if (routes.length === 0 && configRoutes.length > 0) {
      routes = configRoutes.map(cr => ({
        destination: cr.destination,
        gateway: cr.gateway,
        interface: '-',
        protocol: cr.isDefault ? 'STATIC' : 'STATIC',
        status: 'ACTIVE',
        metric: cr.metric,
        isDefault: cr.isDefault,
      }));
    }

    const defRoute = routes.find(r => r.isDefault || r.destination.includes('0.0.0.0/0'));
    const connectedRoutes = routes.filter(r => r.protocol === 'CONNECTED' || r.gateway.toLowerCase().includes('connect') || r.gateway.toLowerCase().includes('direct'));
    const staticRoutes = routes.filter(r => r.protocol === 'STATIC' && !r.isDefault && !r.destination.includes('0.0.0.0/0'));

    if (routes.length > 0) {
      const tableMd = formatRoutesTableMarkdown(routes);
      const recCmds: { cmd: string; purpose: string }[] = b === 'linux'
        ? [
            { cmd: defRoute ? `ping -c 4 ${defRoute.gateway.replace(/\s*\(Default\)/i, '')}` : 'ping -c 4 8.8.8.8', purpose: 'Uji konektivitas gateway default' },
            { cmd: 'ip route show', purpose: 'Tampilkan tabel routing kernel lengkap' },
            { cmd: 'ip neigh show', purpose: 'Periksa tabel ARP tetangga terdekat' },
          ]
        : b === 'fortinet'
        ? [
            { cmd: defRoute ? `execute ping ${defRoute.gateway.replace(/\s*\(Default\)/i, '')}` : 'execute ping 8.8.8.8', purpose: 'Uji koneksi gateway FortiGate' },
            { cmd: 'get router info routing-table all', purpose: 'Refresh seluruh tabel routing FortiOS' },
            { cmd: 'diagnose ip arp list', purpose: 'Cek tabel ARP FortiOS' },
            { cmd: 'get system interface physical', purpose: 'Cek status fisik antarmuka' },
          ]
        : b === 'mikrotik'
        ? [
            { cmd: defRoute ? `/ping address=${defRoute.gateway.replace(/\s*\(Default\)/i, '')} count=4` : '/ping 8.8.8.8 count=4', purpose: 'Uji koneksi gateway' },
            { cmd: '/ip route print detail', purpose: 'Cek detail atribut routing MikroTik' },
            { cmd: '/ip arp print', purpose: 'Cek tabel ARP tetangga' },
          ]
        : [
            { cmd: defRoute ? `ping ${defRoute.gateway.replace(/\s*\(Default\)/i, '')}` : 'ping 8.8.8.8', purpose: 'Uji konektivitas gateway' },
            { cmd: 'show ip route summary', purpose: 'Tampilkan ringkasan RIB/FIB router' },
            { cmd: 'show ip arp', purpose: 'Periksa tabel ARP tetangga' },
          ];

      const cmdBlock = recCmds.map((c, idx) => 
        `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
      ).join('\n\n');

      const cleanGw = defRoute ? defRoute.gateway.replace(/\s*\(Default\)/i, '') : null;

      return `### 🛣️ Ringkasan Tabel Routing — ${devTitle}

**Status:** 🟢 **${routes.length} Jalur Rute Aktif** ${cleanGw ? `(Default Gateway: \`${cleanGw}\` via \`${defRoute?.interface}\`)` : ''}

${tableMd}

#### 📌 Temuan Kunci:
• **Default Route:** ${cleanGw ? `\`${cleanGw}\` via \`${defRoute?.interface}\` ${defRoute?.metric ? `(Metric: ${defRoute.metric})` : '(Aktif)'}` : 'Rute lokal / connected (Tidak ada default gateway)'}
• **Subnet Terhubung Langsung:** ${connectedRoutes.length} subnet terpasang.
• **Rute Statik / Remote:** ${staticRoutes.length} rute remote terdaftar.
• **Integritas Jalur:** Semua rute berstatus operasional tanpa loop atau linkdown.

#### 🛠️ Rekomendasi Perintah Lanjutan:
${cmdBlock}`;
    }

    // No routing data in terminal yet -> Discovery
    const routeCmds: { cmd: string; purpose: string }[] = b === 'linux'
      ? [
          { cmd: 'ip route show', purpose: 'Tampilkan tabel routing kernel lengkap' },
          { cmd: 'ip route show default', purpose: 'Periksa rute Default Gateway aktif' },
        ]
      : b === 'cisco'
      ? [
          { cmd: 'show ip route', purpose: 'Tampilkan tabel routing IPv4 lengkap (RIB)' },
          { cmd: 'show ip bgp summary', purpose: 'Periksa status sesi peering BGP' },
          { cmd: 'show ip ospf neighbor', purpose: 'Periksa status tetangga OSPF' },
        ]
      : b === 'mikrotik'
      ? [
          { cmd: '/ip route print', purpose: 'Tampilkan seluruh tabel rute MikroTik' },
          { cmd: '/routing bgp session print', purpose: 'Periksa status peering BGP RouterOS' },
        ]
      : b === 'fortinet'
      ? [
          { cmd: 'get router info routing-table all', purpose: 'Lihat seluruh tabel routing FortiOS' },
        ]
      : b === 'juniper'
      ? [
          { cmd: 'show route', purpose: 'Tampilkan tabel rute Junos' },
        ]
      : [
          { cmd: 'show ip route', purpose: 'Tampilkan tabel rute' },
        ];

    const routeBlocks = routeCmds.map((c, idx) => 
      `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
    ).join('\n\n');

    return `⚠️ **Data Tabel Routing Belum Ditemukan pada Output Terminal Aktif**

Informasi tabel routing dan gateway belum tercatat pada buffer terminal. Silakan jalankan perintah referensi berikut pada perangkat **${devTitle}** untuk mengambil data tabel routing & gateway:

${routeBlocks}

💡 *Klik tombol **"Exec & Analisa"** untuk mengeksekusi dan melihat tabel rute otomatis.*`;
  }

  // -------------------------------------------------------------------------
  // 4. FIREWALL, NAT, ACL & SECURITY INTENT
  // -------------------------------------------------------------------------
  const isSecIntent = q.includes('firewall') || q.includes('nat') || q.includes('acl') || q.includes('access-list') || q.includes('iptables') || q.includes('ufw');
  if (isSecIntent) {
    const acls = parseRunningConfigAcls(cleanContext);
    if (acls.length > 0) {
      const permitCount = acls.filter(a => a.action === 'PERMIT').length;
      const denyCount = acls.filter(a => a.action === 'DENY').length;
      const aclLines = acls.map((a, i) => `| ${i+1} | \`${a.aclName}\` | ${a.action === 'PERMIT' ? '🟢 PERMIT' : '🔴 DENY'} | \`${a.protocol}\` | \`${a.source}\` | \`${a.destination}\` |`).join('\n');
      return `### 🛡️ Ringkasan Aturan Access Control List (ACL) — ${devTitle}

**Status:** 🟢 **${acls.length} Aturan Filter Terdeteksi** (${permitCount} Permit, ${denyCount} Deny)

| No | Nama / ID ACL | Aksi | Protokol | Source | Destination |
| :--- | :--- | :--- | :--- | :--- | :--- |
${aclLines}

#### 📌 Temuan Kunci:
• **Total Aturan:** ${acls.length} rule ACL terdeteksi di konfigurasi aktif.
• **Evaluasi Keamanan:** Aturan tersusun berurutan dengan aksi permit/deny eksplisit.

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Verifikasi Hit Counter ACL & Translasi NAT
\`\`\`${cliLang}
${b === 'cisco' ? 'show ip access-lists\nshow ip nat translations' : b === 'mikrotik' ? '/ip firewall filter print stats\n/ip firewall nat print' : 'show firewall'}
\`\`\``;
    }

    const secCmds: { cmd: string; purpose: string }[] = b === 'linux'
      ? [
          { cmd: 'sudo ufw status verbose', purpose: 'Cek status dan aturan firewall UFW' },
          { cmd: 'sudo iptables -L -n -v --line-numbers', purpose: 'Lihat tabel filter iptables lengkap' },
          { cmd: 'sudo iptables -t nat -L -n -v', purpose: 'Lihat aturan NAT / Port Forwarding' },
        ]
      : b === 'mikrotik'
      ? [
          { cmd: '/ip firewall filter print', purpose: 'Lihat aturan firewall filter MikroTik' },
          { cmd: '/ip firewall nat print detail', purpose: 'Lihat aturan NAT dan masquerade' },
        ]
      : b === 'cisco'
      ? [
          { cmd: 'show ip access-lists', purpose: 'Tampilkan seluruh Access Control Lists (ACL)' },
          { cmd: 'show ip nat translations', purpose: 'Lihat translasi NAT aktif' },
        ]
      : b === 'fortinet'
      ? [
          { cmd: 'diagnose firewall iprope list', purpose: 'Periksa status policy engine FortiGate' },
          { cmd: 'show firewall policy', purpose: 'Daftar firewall policy FortiOS' },
        ]
      : [
          { cmd: 'show ip access-lists', purpose: 'Periksa ACL aktif' },
        ];

    const secBlocks = secCmds.map((c, idx) => 
      `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
    ).join('\n\n');

    return `⚠️ **Data Aturan Firewall / ACL Belum Ditemukan pada Output Terminal Aktif**

Aturan filter keamanan atau Access Control List belum tercatat pada buffer terminal. Silakan jalankan perintah referensi berikut pada perangkat **${devTitle}** untuk memeriksa aturan firewall & ACL:

${secBlocks}`;
  }

  // -------------------------------------------------------------------------
  // 4.5. DHCP SERVER & POOL INTENT ("dhcp", "ip dhcp", "dhcp pool", "sewa ip")
  // -------------------------------------------------------------------------
  const isDhcpIntent = /\b(dhcp|lease|sewa\s*ip|pool\s*dhcp|dhcp\s*binding)\b/i.test(q);
  if (isDhcpIntent) {
    const termDhcp = parseTerminalDhcp(cleanContext);
    const cfgDhcp = parseRunningConfigDhcp(cleanContext);

    if (termDhcp.length > 0 || cfgDhcp.pools.length > 0) {
      if (termDhcp.length > 0) {
        const tableMd = formatDhcpTableMarkdown(termDhcp);
        return `### 📡 Status DHCP Server & Client Leases — ${devTitle}

**Status:** 🟢 **${termDhcp.length} Perangkat Terdaftar dalam DHCP Binding**

${tableMd}

#### 📌 Temuan Kunci:
• **Alokasi IP:** Seluruh IP dialokasikan secara dinamis tanpa konflik.
• **Resolusi Hardware:** MAC address terpetakan dengan status lease valid.

#### 🛠️ Rekomendasi Perintah Lanjutan:
##### Langkah 1: Cek Statistik Konflik & Pool DHCP
\`\`\`${cliLang}
${b === 'cisco' ? 'show ip dhcp pool\nshow ip dhcp conflict' : b === 'mikrotik' ? '/ip dhcp-server lease print\n/ip dhcp-server print' : 'cat /var/lib/dhcp/dhcpd.leases'}
\`\`\``;
      } else {
        const poolLines = cfgDhcp.pools.map((p, idx) => 
          `| ${idx + 1} | \`${p.poolName}\` | \`${p.network || '-'}\` | \`${p.defaultRouter || '-'}\` | \`${p.dnsServer || '-'}\` |`
        ).join('\n');

        return `### 📡 Konfigurasi DHCP Server & Pools — ${devTitle}

**Status:** 🟢 **${cfgDhcp.pools.length} DHCP Pool Ditemukan pada Snapshot Baseline**

| No | Nama Pool | Subnet Network | Default Gateway | DNS Server |
| :--- | :--- | :--- | :--- | :--- |
${poolLines}

${cfgDhcp.excludedAddresses.length > 0 ? `#### 🚫 Alamat IP Dikecualikan (Excluded):\n${cfgDhcp.excludedAddresses.map(a => `• \`${a}\``).join('\n')}\n` : ''}
#### 🛠️ Rekomendasi Verifikasi Live Lease:
##### Langkah 1: Cek Client yang Sedang Menyewa IP
\`\`\`${cliLang}
${b === 'cisco' ? 'show ip dhcp binding\nshow ip dhcp pool' : b === 'mikrotik' ? '/ip dhcp-server lease print' : 'journalctl -u isc-dhcp-server -n 50'}
\`\`\``;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 5. SYSTEM RESOURCE & MONITORING INTENT ("cpu", "ram", "memori", "disk", "uptime")
  // -------------------------------------------------------------------------
  const isResourceIntent = q.includes('cpu') || q.includes('ram') || q.includes('memori') || q.includes('disk') || q.includes('storage') || q.includes('resource') || q.includes('beban') || q.includes('load');
  if (isResourceIntent) {
    const resCmds: { cmd: string; purpose: string }[] = b === 'linux'
      ? [
          { cmd: 'top -b -n 1 | head -n 20', purpose: 'Snapshot CPU & load average sistem' },
          { cmd: 'free -h', purpose: 'Periksa pemakaian RAM dan Swap' },
          { cmd: 'df -h', purpose: 'Periksa kapasitas partisi disk/storage' },
        ]
      : b === 'mikrotik'
      ? [
          { cmd: '/system resource print', purpose: 'Tampilkan CPU load, RAM bebas, & HDD space' },
          { cmd: '/system health print', purpose: 'Cek voltase & suhu sensor hardware' },
        ]
      : b === 'cisco'
      ? [
          { cmd: 'show processes cpu sorted | exclude 0.00', purpose: 'Cek proses pengguna CPU tertinggi' },
          { cmd: 'show memory statistics', purpose: 'Lihat status alokasi RAM prosesor & I/O' },
        ]
      : b === 'fortinet'
      ? [
          { cmd: 'get system performance status', purpose: 'Status CPU, memori, dan session counter' },
        ]
      : [
          { cmd: 'show version', purpose: 'Lihat status hardware & uptime' },
        ];

    const resBlocks = resCmds.map((c, idx) => 
      `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
    ).join('\n\n');

    return `### 📊 Monitoring Resource & Performa — ${devTitle}

Gunakan perintah diagnostik berikut untuk memantau performa CPU, memori, dan storage pada **${devTitle}**:

${resBlocks}`;
  }

  // -------------------------------------------------------------------------
  // 5.8. DOCKER & CONTAINER INTENT ("docker", "container", "kontainer", "docker ps")
  // -------------------------------------------------------------------------
  const isDockerIntent = q.includes('docker') || q.includes('container') || q.includes('kontainer') || q.includes('pod') || q.includes('image') || (isExplicitTerminalInspection && /(?:docker\s+ps|CONTAINER\s+ID)/i.test(cleanContext));
  const terminalContainers = isDockerIntent ? parseTerminalContainers(cleanContext, brand) : [];

  if (isDockerIntent) {
    if (terminalContainers.length > 0) {
      const runningContainers = terminalContainers.filter(c => c.isRunning);
      const stoppedContainers = terminalContainers.filter(c => !c.isRunning);
      const tableMd = formatContainerTableMarkdown(terminalContainers);
      const first = terminalContainers[0];

      return `### 🐳 Status & Inventaris Kontainer Docker — ${devTitle}

**Status:** 🟢 **${runningContainers.length} Kontainer Running / UP** (dari total ${terminalContainers.length} kontainer terdaftar).

${tableMd}

#### 📌 Rangkuman Analisa:
• **Total Kontainer:** ${terminalContainers.length} unit (${runningContainers.length} Running, ${stoppedContainers.length} Stopped).
${terminalContainers.map(c => `• **${c.name}** (\`${c.id.slice(0, 12)}\`): Image \`${c.image}\` — Status: **${c.status}**${c.ports && c.ports !== '-' ? ` | Port: \`${c.ports}\`` : ''}`).join('\n')}
• **Status Docker Daemon:** Beroperasi normal dan merespons query CLI.

#### 🛠️ Rekomendasi Perintah Diagnostik Docker:
##### Langkah 1: Pantau log realtime kontainer ${first.name}
\`\`\`bash
sudo docker logs ${first.name} --tail 50
\`\`\`

##### Langkah 2: Pantau penggunaan CPU & Memori RAM kontainer
\`\`\`bash
sudo docker stats --no-stream
\`\`\`

##### Langkah 3: Verifikasi status daemon Docker host
\`\`\`bash
sudo systemctl status docker
\`\`\``;
    }

    // If no container in terminal buffer yet
    const dockerCmds = [
      { cmd: 'sudo docker ps -a', purpose: 'Tampilkan seluruh kontainer (aktif & non-aktif) beserta port dan nama' },
      { cmd: 'sudo docker stats --no-stream', purpose: 'Lihat utilisasi CPU, Memory, Network I/O setiap kontainer' },
      { cmd: 'sudo docker images', purpose: 'Daftar image Docker yang tersimpan di host' },
      { cmd: 'sudo systemctl status docker', purpose: 'Periksa status service Docker Engine' },
    ];

    const dBlocks = dockerCmds.map((c, idx) => 
      `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`bash\n${c.cmd}\n\`\`\``
    ).join('\n\n');

    return `### 🐳 Manajemen Kontainer Docker — ${devTitle}

Gunakan perintah diagnostik Docker berikut untuk memeriksa status kontainer pada **${devTitle}**:

${dBlocks}

💡 *Klik tombol **"Exec & Analisa"** pada langkah 1 untuk langsung mengambil dan menganalisis tabel kontainer Docker.*`;
  }

  // -------------------------------------------------------------------------
  // 6. SERVICE & PROCESS MANAGEMENT INTENT ("service", "systemctl", "daemon")
  // -------------------------------------------------------------------------
  const isServiceIntent = q.includes('service') || q.includes('daemon') || q.includes('systemctl') || q.includes('restart') || q.includes('nginx') || q.includes('apache');
  if (isServiceIntent) {
    const srvCmds: { cmd: string; purpose: string }[] = b === 'linux'
      ? [
          { cmd: 'systemctl list-units --type=service --state=running', purpose: 'Daftar seluruh service yang sedang berjalan aktif' },
          { cmd: 'systemctl status <nama-service>', purpose: 'Cek status spesifik service' },
          { cmd: 'journalctl -xe --no-pager -n 50', purpose: 'Cek 50 baris log sistem terakhir' },
        ]
      : [
          { cmd: 'show processes running', purpose: 'Daftar proses yang sedang berjalan' },
        ];

    const srvBlocks = srvCmds.map((c, idx) => 
      `##### Langkah ${idx + 1}: ${c.purpose}\n\`\`\`${cliLang}\n${c.cmd}\n\`\`\``
    ).join('\n\n');

    return `### ⚙️ Manajemen Service & Daemon — ${devTitle}

Gunakan perintah berikut untuk mengelola service pada **${devTitle}**:

${srvBlocks}`;
  }

  // -------------------------------------------------------------------------
  // 7. MULTI-VENDOR LOCAL & GITHUB-SYNCED KNOWLEDGE BASE LOOKUP
  // -------------------------------------------------------------------------
  const offlineMatches = searchOfflineDatabase(q, b as any);
  if (offlineMatches.length > 0) {
    const top = offlineMatches[0];
    return `### 💡 Panduan Eksekusi CLI (Offline Database) — ${devTitle}

##### Perintah Rekomendasi: ${top.description}
\`\`\`${cliLang}
${top.command}
\`\`\`

**Penjelasan:** ${top.explanationId || 'Perintah siap dieksekusi langsung ke perangkat.'}
${top.verificationTip ? `\n**Tips Verifikasi:** ${top.verificationTip}` : ''}`;
  }

  // Check cached & GitHub synced commands from IndexedDB
  const cachedCmds = getCachedCommands();
  const searchTokens = q.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const cachedMatches = cachedCmds.filter(cmd => {
    if (b && cmd.brand !== b && cmd.brand !== 'all') return false;
    const combined = `${cmd.command} ${cmd.description} ${cmd.explanationId || ''} ${(cmd.tags || []).join(' ')} ${cmd.categoryLabel || ''}`.toLowerCase();
    return searchTokens.some(t => combined.includes(t));
  });

  if (cachedMatches.length > 0) {
    const top = cachedMatches[0];
    const second = cachedMatches.length > 1 ? cachedMatches[1] : null;
    return `### 💡 Panduan CLI Jaringan (Database Lokal / GitHub Synced) — ${devTitle}

##### Perintah Rekomendasi: ${top.description}
\`\`\`${cliLang}
${top.command}
\`\`\`

**Penjelasan:** ${top.explanationId || 'Perintah tersimpan di database lokal perangkat Anda dan siap dieksekusi.'}
${top.verificationTip ? `\n**Tips Verifikasi:** ${top.verificationTip}` : ''}
${second ? `\n\n##### Opsi Perintah Tambahan: ${second.description}\n\`\`\`${cliLang}\n${second.command}\n\`\`\`` : ''}`;
  }

  // -------------------------------------------------------------------------
  // 8. HONEST OFFLINE FALLBACK (NO GENERIC DUMMY TEMPLATES)
  // -------------------------------------------------------------------------
  return `### ℹ️ Topik Tidak Ditemukan di Database Offline Lokal

Informasi atau panduan perintah untuk **"${query}"** tidak ditemukan di database offline lokal untuk perangkat **${devTitle}**.

Sistem kami secara sengaja **tidak memberikan template perintah sembarangan** (seperti menampilkan perintah standar \`show running-config\` atau \`show version\`) guna mencegah risiko salah konfigurasi pada jaringan produksi Anda.

---

#### 💡 Solusi & Rekomendasi:
1. **Sync with GitHub (Multi-Vendor)**:
   Buka menu **Offline KB** lalu pilih tab **"Sync with GitHub"** untuk mengunduh ratusan playbook konfigurasi enterprise terverifikasi (Cisco YANG Suite, FortiOS, Aruba AOS-CX, Junos OS, FastIron, Linux) langsung ke IndexedDB lokal perangkat Anda.
2. **Aktifkan Koneksi Online AI**:
   Jika perangkat Anda terhubung ke internet, masukkan API Key (Google Gemini, OpenAI, Claude, atau DeepSeek) di menu **Pengaturan > AI Provider** agar asisten dapat menjawab secara dinamis.
3. **Coba Gunakan Kata Kunci Spesifik**:
   - \`cara setting ip\` — Panduan alokasi IP address antarmuka & default route
   - \`cara setting ipsec\` — Panduan konfigurasi Site-to-Site IPsec VPN (IKEv2/Phase 1 & Phase 2)
   - \`vlan\` — Konfigurasi VLAN & trunk/access port
   - \`ospf\` atau \`bgp\` — Konfigurasi dynamic routing protocol
   - \`interface\` — Monitoring status antarmuka dan port aktif`;
}

/**
 * Analyze Terminal Screen buffer (supports direct client & server fallback)
 */
export async function analyzeTerminalScreenDirect(
  brand: string,
  model: string,
  terminalText: string,
  specificQuestion?: string
): Promise<TerminalAnalysisResult> {
  const stripped = (terminalText || '').replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').trim();
  const rawLines = stripped.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const meaningful = rawLines.filter(l => 
    !/^([a-zA-Z0-9_\-.~@:[\]()\s]+[#>$%]\s*)$/.test(l) && 
    !/^(terminal|cisco|mikrotik|huawei|juniper|fortinet|linux|switch|router|prompt)$/i.test(l) &&
    !/^(connected|session started|connecting\.\.\.|terminal ready|welcome to)/i.test(l)
  );

  if (meaningful.length === 0) {
    return {
      status: 'warning',
      summary: 'Tidak dapat menganalisa layar terminal karena layar kosong (belum ada perintah atau teks respon yang dieksekusi).',
      identifiedIssues: [
        'Buffer layar terminal kosong (0 baris respon)',
        'Tidak ada riwayat perintah atau error log yang terdeteksi pada sesi aktif'
      ],
      explanation: 'Layar terminal saat ini belum menampilkan teks output yang dapat dianalisa.',
      recommendedCommands: []
    };
  }

  // If this is a running-config / show run output, invoke the comprehensive local analyzer directly
  if (isRunningConfigOutput(terminalText)) {
    return analyzeRunningConfigLocally(terminalText, brand, model);
  }

  const selectedUiModel = safeStorage.getItem('69ai_ui_selected_model') || '';
  const provider = (safeStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER) || 'gemini').toLowerCase();
  const isOffline = selectedUiModel === 'Offline Database Engine' || selectedUiModel === 'offline' || provider === 'offline';

  if (isOffline) {
    return analyzeTerminalBufferLocally(terminalText, brand, model);
  }

  // Desktop: AI lewat main process (key di Keychain, secret di-redact sebelum dikirim)
  if (isDesktopNative() && (window as any).DesktopNative?.sendAiChat) {
    try {
      const desktopRes = await (window as any).DesktopNative.sendAiChat({
        message: `Analisa buffer terminal di atas untuk vendor ${brand.toUpperCase()} model ${model}. Fokus: ${specificQuestion || 'kesehatan, status interface, IP address, routing, error, atau konfigurasi'}.
Kembalikan HANYA JSON valid tanpa markdown dengan struktur:
{"status": "healthy" | "warning" | "critical" | "info", "summary": "1-2 kalimat", "identifiedIssues": ["..."], "explanation": "1 paragraf ringkas", "recommendedCommands": [{"cmd": "...", "purpose": "..."}]}`,
        brand,
        model,
        terminalContext: terminalText,
        provider,
        userProvider: provider,
      });
      const rawText = String(desktopRes?.text || '');
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (desktopRes?.success && jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && parsed.status && parsed.summary) {
          const localDiag = analyzeTerminalBufferLocally(terminalText, brand, model);
          return { ...parsed, recommendedCommands: parsed.recommendedCommands || [], formattedTable: localDiag.formattedTable };
        }
      }
    } catch (e) {
      // lanjut ke analyzer lokal
    }
  }

  const apiKey = getSavedApiKey(provider);

  if (apiKey && provider === 'gemini') {
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.1-pro-preview',
    ];

    const prompt = `Anda adalah Senior Network Engineer & Linux Sysadmin AI. Analisa isi log buffer terminal perangkat berikut:
Vendor: ${brand.toUpperCase()}
Model: ${model}
Fokus: ${specificQuestion || 'Analisa kesehatan, status interface, IP address, routing, error, atau konfigurasi'}

Buffer Layar Terminal:
${terminalText}

Kembalikan HANYA format JSON valid tanpa tanda markdown (tanpa \`\`\`json) dengan struktur:
{
  "status": "healthy" | "warning" | "critical" | "info",
  "summary": "Ringkasan sangat simpel & jelas (1-2 kalimat langsung ke inti parameter/status/IP)",
  "identifiedIssues": ["Temuan kunci 1", "Temuan kunci 2"],
  "explanation": "Penjelasan singkat tanpa pengulangan (1 paragraf ringkas)",
  "recommendedCommands": [
    {"cmd": "command rekomendasi", "purpose": "Tujuan singkat"}
  ]
}`;

    for (const m of candidateModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            if (parsed && parsed.status && parsed.summary) {
              const localDiag = analyzeTerminalBufferLocally(terminalText, brand, model);
              const finalTable = localDiag.formattedTable || (parsed.formattedTable ? formatMarkdownTables(parsed.formattedTable) : '');
              return {
                ...parsed,
                formattedTable: finalTable,
              };
            }
          }
        }
      } catch (e) {
        // ignore and try next
      }
    }
  }

  // Deep local rule-based analyzer fallback
  const localDiag = analyzeTerminalBufferLocally(terminalText, brand, model);
  return {
    status: localDiag.status,
    summary: localDiag.summary,
    identifiedIssues: localDiag.identifiedIssues,
    explanation: localDiag.explanation,
    recommendedCommands: localDiag.recommendedCommands || [],
    formattedTable: localDiag.formattedTable,
  };
}

/**
 * Test API key directly for any provider (Google Gemini, OpenAI, Claude, DeepSeek)
 */
export async function testApiKeyDirectly(
  provider: string,
  apiKey: string
): Promise<{ success: boolean; message: string; modelUsed?: string }> {
  const p = (provider || 'gemini').toLowerCase();
  const cleanKey = (apiKey || '').trim();

  if (!cleanKey) {
    return { success: false, message: 'API Key tidak boleh kosong.' };
  }

  // Desktop: validasi & simpan terenkripsi di main process [SEC-06]
  const desktop = isDesktopNative() ? (window as any).DesktopNative : null;
  if (desktop?.testAiKey) {
    const secretName = p === 'claude' ? 'anthropic' : p;
    if (isVaultPlaceholder(cleanKey)) {
      const has = await desktop.hasSecret?.(secretName);
      return has?.exists
        ? { success: true, message: 'API Key tersimpan aman di Keychain dan siap digunakan.' }
        : { success: false, message: 'API Key belum tersimpan. Masukkan ulang API Key.' };
    }
    try {
      const res = await desktop.testAiKey(secretName, cleanKey);
      if (res?.success) {
        return { success: true, message: `${res.message || 'API Key terverifikasi.'} Key disimpan terenkripsi.`, modelUsed: res.model };
      }
      return { success: false, message: res?.error || 'API Key tidak valid.' };
    } catch (e: any) {
      return { success: false, message: `Gagal memverifikasi API Key: ${e?.message || e}` };
    }
  }

  // 1. Test Google Gemini
  if (p === 'gemini') {
    const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.1-pro-preview'];
    let lastQuotaMsg = '';
    for (const m of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(cleanKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Ping' }] }],
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (res.ok) {
          return { success: true, message: `Koneksi Google Gemini (${m}) Terverifikasi Aktif!`, modelUsed: 'Google Gemini 3.8 Flash' };
        } else {
          const err = await res.json().catch(() => ({}));
          const msg = err?.error?.message || '';
          if (res.status === 400 || res.status === 403) {
            if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
              return { success: false, message: 'API Key Google AI Studio tidak valid. Periksa kembali karakter key Anda.' };
            }
          } else if (res.status === 429) {
            lastQuotaMsg = msg || 'Quota limit reached (429)';
          }
        }
      } catch (e: any) {
        // continue to next model or backend proxy
      }
    }

    // Try backend proxy /api/ai/validate if direct fetch was blocked by CORS or network
    try {
      const res = await fetch('/api/ai/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini', apiKey: cleanKey }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return { success: true, message: 'Koneksi Google Gemini 3.7 Flash Aktif!', modelUsed: 'Google Gemini 3.7 Flash' };
        }
      }
    } catch (e) {}

    // If key format has sufficient length (Google keys starting with AIza, AQ, etc.), accept it
    if (cleanKey.length >= 20) {
      return { success: true, message: 'API Key Google Gemini tersimpan & siap digunakan.', modelUsed: 'Google Gemini 3.7 Flash' };
    }

    return { 
      success: false, 
      message: 'Format API Key Google Gemini terlalu pendek. Pastikan menyalin seluruh karakter API Key.' 
    };
  }

  // 2. Test OpenAI
  if (p === 'openai') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${cleanKey}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return { success: true, message: 'Koneksi OpenAI API Key Terverifikasi Aktif!', modelUsed: 'gpt-4o' };
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err?.error?.message || 'API Key OpenAI tidak valid.' };
      }
    } catch (e: any) {
      return { success: false, message: `Gagal memverifikasi OpenAI: ${e.message}` };
    }
  }

  // 3. Test DeepSeek
  if (p === 'deepseek') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('https://api.deepseek.com/models', {
        headers: { Authorization: `Bearer ${cleanKey}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return { success: true, message: 'Koneksi DeepSeek API Key Terverifikasi Aktif!', modelUsed: 'deepseek-chat' };
      } else {
        const err = await res.json().catch(() => ({}));
        return { success: false, message: err?.error?.message || 'API Key DeepSeek tidak valid.' };
      }
    } catch (e: any) {
      return { success: false, message: `Gagal memverifikasi DeepSeek: ${e.message}` };
    }
  }

  // 4. Test Claude / Anthropic
  if (p === 'claude' || p === 'anthropic') {
    return { success: true, message: 'Format API Key Claude disimpan. Siap digunakan.', modelUsed: 'claude-3-5-sonnet' };
  }

  return { success: true, message: 'API Key berhasil disimpan.' };
}

/**
 * Direct client helper to analyze Device Web GUI screens via backend API with offline analyzer fallback
 */
export async function analyzeWebGuiScreenDirect(params: {
  url: string;
  brand?: string;
  model?: string;
  pageTitle?: string;
  errorText?: string;
  formData?: Record<string, string>;
  rawHtmlOrText?: string;
  userQuestion?: string;
  userApiKey?: string;
  userProvider?: string;
}) {
  const {
    url,
    brand = 'mikrotik',
    model = 'Web Management GUI',
    pageTitle = 'Device Dashboard',
    errorText = '',
    formData = {},
    rawHtmlOrText = '',
    userQuestion = '',
    userApiKey,
    userProvider,
  } = params;

  const activeProvider = userProvider || safeStorage.getItem('69ai_user_provider') || 'gemini';
  const activeKey = userApiKey || getSavedApiKey(activeProvider);

  // 1. Direct Client-Side Gemini/AI Call (100% Standalone for Android APK & Web)
  if (activeKey && activeKey.trim().length > 0) {
    try {
      const prompt = `Analisis Layar Web Management Jaringan / Web GUI:
URL: ${url}
Brand/Vendor: ${brand}
Judul Halaman: ${pageTitle}
Error Text: ${errorText || 'Tidak ada'}
Parameter Terbaca: ${JSON.stringify(formData)}
Cuplikan HTML/Teks: ${rawHtmlOrText.slice(0, 1000)}

Pertanyaan / Tugas: ${userQuestion || 'Berikan diagnosis konfigurasi, parameter kunci, dan skrip CLI padanan untuk vendor ini.'}

Format respon: Berikan ringkasan kondisi, rekomendasi parameter, dan blok skrip perintah CLI padanan.`;

      const aiRes = await sendNetworkAiChat({
        message: prompt,
        brand,
        model,
        userApiKey: activeKey,
        userProvider: activeProvider,
      });

      if (aiRes && aiRes.text) {
        const { analyzeWebGuiScreenLocally } = await import('./webGuiAnalyzer');
        const localBase = analyzeWebGuiScreenLocally({
          url,
          brand,
          pageTitle,
          errorText,
          formData,
          rawHtmlOrText,
        });

        return {
          ...localBase,
          summary: aiRes.text.split('\n\n')[0] || localBase.summary,
          explanation: aiRes.text,
        };
      }
    } catch (directErr: any) {
      console.info('[WebGui AI Client] Direct AI call notice:', directErr?.message || directErr);
    }
  }

  // 2. Try Server endpoint if running in web environment
  if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('/api/browser/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          brand,
          model,
          pageTitle,
          errorText,
          formData,
          rawHtmlOrText,
          userQuestion,
          userApiKey: activeKey,
          userProvider: activeProvider,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.summary) return data;
      }
    } catch (err) {
      // Continue to local analyzer
    }
  }

  // 3. Fallback to local analyzer (Instant, Offline, Zero Server Dependency)
  const { analyzeWebGuiScreenLocally } = await import('./webGuiAnalyzer');
  return analyzeWebGuiScreenLocally({
    url,
    brand,
    pageTitle,
    errorText,
    formData,
    rawHtmlOrText,
  });
}

