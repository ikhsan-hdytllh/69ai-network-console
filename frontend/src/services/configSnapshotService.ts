import { safeStorage } from '../utils/safeStorage';
import { ConfigSnapshot, ConfigDiffResult, ConfigDiffChange, DeviceBrand, SnapshotType, DeviceProfile } from '../types';
import { getSimulatedRunningConfig, executeDeviceCommandInBackground, executeCliCommand } from './serialConnection';

const SNAPSHOTS_STORAGE_KEY = '69ai_config_snapshots_v1';

// ============================================================================
// 1. STORAGE UTILITIES (Per-Device & Global Snapshots)
// ============================================================================

export function getAllSnapshotsFromStorage(): Record<string, ConfigSnapshot[]> {
  try {
    const raw = safeStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (e) {
    console.error('Failed to parse snapshots from storage', e);
    return {};
  }
}

export function getDeviceSnapshots(deviceId: string, deviceProfile?: DeviceProfile): ConfigSnapshot[] {
  if (!deviceId) return [];
  const all = getAllSnapshotsFromStorage();
  let list = all[deviceId] || [];

  // Auto-sanitize / repair any legacy truncated snapshots (e.g. 4-line snapshots saved during wr)
  let hasModified = false;
  list = list.map(s => {
    const lines = s.normalizedConfig ? s.normalizedConfig.split('\n').length : 0;
    if (lines < 8) {
      const fallbackConfig = normalizeConfiguration(getSimulatedRunningConfig(deviceId, deviceProfile), s.brand);
      if (fallbackConfig && fallbackConfig.split('\n').length > lines) {
        hasModified = true;
        const fallbackLines = fallbackConfig.split('\n').length;
        return {
          ...s,
          rawConfig: fallbackConfig,
          normalizedConfig: fallbackConfig,
          lineCount: fallbackLines,
        };
      }
    }
    return s;
  });

  if (hasModified) {
    try {
      all[deviceId] = list;
      safeStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to update sanitized snapshots in storage:', e);
    }
  }

  // Sort descending by timestamp (newest first)
  return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Retrieves the latest valid configuration snapshot for a device.
 * Used as an ultra-fast, zero-overhead baseline for AI analysis, diagnostics, and data extraction.
 */
export function getLatestDeviceSnapshot(
  deviceId: string,
  deviceProfile?: DeviceProfile
): ConfigSnapshot | null {
  if (!deviceId) return null;
  const list = getDeviceSnapshots(deviceId, deviceProfile);
  if (list && list.length > 0) {
    const latest = list[0];
    if (latest && (latest.normalizedConfig?.trim() || latest.rawConfig?.trim())) {
      return latest;
    }
  }
  return null;
}

export function saveDeviceSnapshot(snapshot: ConfigSnapshot): ConfigSnapshot[] {
  if (!snapshot || !snapshot.deviceId) return [];
  try {
    const all = getAllSnapshotsFromStorage();
    const current = all[snapshot.deviceId] || [];
    
    // Check if ID already exists (update) or prepend (new)
    const existingIndex = current.findIndex(s => s.id === snapshot.id);
    let updated: ConfigSnapshot[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = snapshot;
    } else {
      // Keep up to 30 snapshots per device to maintain clean storage
      updated = [snapshot, ...current].slice(0, 30);
    }

    all[snapshot.deviceId] = updated;
    safeStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('69ai_snapshots_updated', { detail: { deviceId: snapshot.deviceId } }));
    return updated;
  } catch (e) {
    console.error('Failed to save snapshot', e);
    return [];
  }
}

export function deleteDeviceSnapshot(deviceId: string, snapshotId: string): ConfigSnapshot[] {
  try {
    const all = getAllSnapshotsFromStorage();
    const current = all[deviceId] || [];
    const updated = current.filter(s => s.id !== snapshotId);
    all[deviceId] = updated;
    safeStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('69ai_snapshots_updated', { detail: { deviceId } }));
    return updated;
  } catch (e) {
    console.error('Failed to delete snapshot', e);
    return [];
  }
}

export function clearDeviceSnapshots(deviceId: string): void {
  try {
    const all = getAllSnapshotsFromStorage();
    delete all[deviceId];
    safeStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('69ai_snapshots_updated', { detail: { deviceId } }));
  } catch (e) {
    console.error('Failed to clear snapshots', e);
  }
}

/**
 * Checks if a typed command is a configuration saving command across major network OSes
 * (Cisco IOS, IOS-XE, NX-OS, Arista EOS, Huawei VRP, Juniper Junos, FortiOS, MikroTik RouterOS, Linux, etc.)
 */
export function isSaveConfigurationCommand(cmd: string): boolean {
  if (!cmd) return false;
  const norm = cmd.trim().toLowerCase();
  return /^(?:wr(?:ite)?(?:\s+(?:mem(?:ory)?|all|term|net|startup))?|do\s+wr(?:ite)?(?:\s+(?:mem(?:ory)?|all|startup))?|copy\s+(?:run|running-config)\s+(?:start|startup-config|bootflash:|flash:)|do\s+copy\s+(?:run|running-config)\s+(?:start|startup-config)|commit(?:\s+and-quit|\s+check|\s+confirmed|\s+comment.*)?|save(?:\s+config|\s+configuration|\s+safely|\s+force)?|save-configuration(?:\s+.*)?|\/system\s+backup\s+save|\/system\s+configuration\s+save|\/export\s+file=.*|cfg\s+save|write\s+startup|write-memory|execute\s+backup\s+config)/i.test(norm);
}

/**
 * Checks if incoming terminal output indicates a successful configuration save
 */
export function isSaveConfigConfirmationOutput(output: string): boolean {
  if (!output) return false;
  return /(?:Building configuration\.\.\.\s*\[OK\]|\[OK\]\s*$|commit complete|Configuration successfully saved|Configuration written to|Saved configuration to NVRAM|System configuration saved|System config written)/i.test(output);
}

// ============================================================================
// 2. CONFIG NORMALIZATION & NOISE FILTERING
// ============================================================================

/**
 * Checks whether a given trimmed line represents non-configuration noise:
 * - Prompts (e.g. "CISCO-CORE-SW-01#", "Router(config)#", "<Huawei>", "[admin@MikroTik] >", "root@linux:~#")
 * - User commands typed/echoed (e.g. "show running-config", "wr", "write memory", "ping 8.8.8.8", "conf t")
 * - Execution status & banners (e.g. "Building configuration...", "Current configuration : 2842 bytes", "[OK]", "[confirm]")
 * - Pagination artifacts ("--More--")
 * - Transient timestamps ("! Last configuration change at ...", "! NVRAM config last updated at ...")
 * - Syslog and diagnostic events ("%SYS-5-CONFIG_I: ...", "%LINK-3-UPDOWN: ...")
 * - Show tabular headers ("Interface IP-Address OK? Method Status Protocol", "VLAN Name Status Ports")
 * - ICMP Ping / Traceroute outputs ("Sending 5...", "!!!!!", "Success rate is 100 percent")
 */
export function isNonConfigurationLine(trimmed: string, _brand?: DeviceBrand): boolean {
  if (!trimmed) return true;

  // 1. Terminal Prompts (alone or with command attached)
  // Standard Cisco/IOS/Arista/Dell/HPE/Generic prompt ending in # or >
  // e.g. "Router#", "Switch>", "SW-01(config)#", "SW-01(config-if)#", "CISCO-CORE-SW-01#show run"
  if (/^[a-zA-Z0-9_.-]+(?:[\(\[][^#$\]\)]*?[\)\]])?[#>]\s*$/i.test(trimmed)) {
    return true;
  }
  if (/^[a-zA-Z0-9_.-]+(?:[\(\[][^#$\]\)]*?[\)\]])?[#>]\s*(?:show|sh|display|dis|wr|write|copy|conf|config|ping|traceroute|terminal|term|exit|quit|end|enable|disable|reload|clear|cls)\b/i.test(trimmed)) {
    return true;
  }
  // MikroTik prompt
  if (/^\[.*?@.*?\]\s*[/>]?\s*$/i.test(trimmed) || /^\[.*?@.*?\]\s*[/>]?\s*(?:export|\/|ip|interface|system|ping)/i.test(trimmed)) {
    return true;
  }
  // Huawei prompt
  if (/^[<\[].*?[>\]]\s*$/i.test(trimmed) || /^[<\[].*?[>\]]\s*(?:display|dis|save|system-view|sys|quit|return|ping)/i.test(trimmed)) {
    return true;
  }
  // Linux / Unix shell prompt
  if (/^[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+:[^#$]*[#$]/i.test(trimmed)) {
    return true;
  }

  // 2. Standalone User CLI Commands typed without prompt
  if (/^(?:show\s+(?:run|running-config|config|configuration|ip|vlan|version|cdp|lldp|interfaces?|int|mac|arp|tech-support|processes|memory)|display\s+(?:current-configuration|current|ip|vlan|version|device)|write(?:\s+mem(?:ory)?)?|wr|copy\s+(?:run|running-config)\s+(?:start|startup-config)|terminal\s+length\s+\d+|term\s+len\s+\d+|configure\s+terminal|conf\s+t|system-view|commit(?:\s+and-quit|\s+check)?|enable|disable|reload)\s*$/i.test(trimmed)) {
    return true;
  }
  // Ping & Traceroute commands and results
  if (/^(?:ping|traceroute|tracert)\s+/i.test(trimmed)) {
    return true;
  }
  if (/^(?:Type escape sequence to abort|Sending \d+, \d+-byte|Success rate is \d+ percent|[!.\?]{4,})/i.test(trimmed)) {
    return true;
  }

  // 3. Status Banners, Exec confirmations, NVRAM messages
  if (
    /^Building configuration\.\.\./i.test(trimmed) ||
    /^Current configuration\s*:\s*\d+\s*bytes/i.test(trimmed) ||
    /^Using \d+ out of \d+ bytes/i.test(trimmed) ||
    /^Compressed \d+ bytes to \d+ bytes/i.test(trimmed) ||
    /^\[OK\]$/i.test(trimmed) ||
    /^\[confirm\]$/i.test(trimmed) ||
    /^Destination filename \[.*?\]\?$/i.test(trimmed) ||
    /^Erasing the nvram filesystem/i.test(trimmed) ||
    /^Erase of nvram: complete/i.test(trimmed) ||
    /^Proceed with reload\?/i.test(trimmed) ||
    /^Translating ".*?"/i.test(trimmed) ||
    /^Enter configuration commands, one per line/i.test(trimmed) ||
    /^System Bootstrap, Version/i.test(trimmed) ||
    /^Memory test passed:/i.test(trimmed) ||
    /^Loading operating system image/i.test(trimmed) ||
    /^IOS \(tm\) .* Software/i.test(trimmed) ||
    /^Compiled .* by/i.test(trimmed) ||
    /^Press RETURN to get started!/i.test(trimmed) ||
    /^\[Session Connected:/i.test(trimmed) ||
    /^session ended:/i.test(trimmed) ||
    /^Action completed successfully/i.test(trimmed) ||
    /^[*\[] (?:Kecepatan Baud diubah|Membuka socket|Melakukan autentikasi|Koneksi SSH|Jalur RX\/TX|TIPS UNTUK|STATUS: KONEKSI)/i.test(trimmed) ||
    /^[=─┌┐└┘├┤│┼]{4,}/.test(trimmed) ||
    /^----*\s+----*/.test(trimmed) ||
    /^(?:Interface\s+IP-Address|VLAN Name\s+Status|Device ID\s+Local Intrfce|Capability Codes:)/i.test(trimmed)
  ) {
    return true;
  }

  // 4. Transient Timestamps & Hardware headers
  if (
    /^!\s*(?:Last configuration change|NVRAM config last updated|Time:|Current configuration)/i.test(trimmed) ||
    /^#\s*(?:Time:|date=|time=|config-version=)/i.test(trimmed) ||
    (/^#\s*by RouterOS/i.test(trimmed) && trimmed.length < 40)
  ) {
    return true;
  }

  // 5. Syslog, Link status, and Terminal Warnings
  if (
    /^--\s*More\s*--/i.test(trimmed) ||
    /^\s*--\s*More\s*--/i.test(trimmed) ||
    /^%[A-Z0-9_-]+(?:-[0-9]+-[A-Z0-9_]+)?:\s*/.test(trimmed) ||
    /^%\s*(?:Invalid|Incomplete|Ambiguous|Unknown|Bad|Error|Aborted)\b/i.test(trimmed) ||
    /^syntax error,/i.test(trimmed) ||
    /^bad command name/i.test(trimmed) ||
    /^CLI error:/i.test(trimmed)
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts pure, pristine configuration from arbitrary terminal outputs or logs,
 * filtering out any operational noise, status messages, commands, and prompts.
 */
export function extractPureConfiguration(raw: string, brand?: DeviceBrand): string {
  if (!raw) return '';

  let cleaned = raw;
  // 1. Remove ANSI escape codes and control characters
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // 2. Remove standard terminal pagination artifacts
  cleaned = cleaned.replace(/--\s*More\s*--(?:\s*\([^\)]+\))?/gi, '');
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const rawLines = cleaned.split('\n');

  // Locate the start of the configuration block if mixed in terminal log
  let startIndex = 0;
  let endIndex = rawLines.length;

  // Search backwards for the latest configuration block header
  let foundStartIdx = -1;
  for (let i = rawLines.length - 1; i >= 0; i--) {
    const t = rawLines[i].trim();
    
    // Check if "Building configuration..." is just a save command output (followed immediately by [OK])
    if (/^Building configuration\.\.\./i.test(t)) {
      const nextLine = rawLines[i + 1]?.trim() || '';
      if (/^\[OK\]$/i.test(nextLine)) {
        // This is a "write memory" / "wr" command execution, not a "show run" output
        continue;
      }
    }

    if (
      /^Building configuration\.\.\./i.test(t) ||
      /^Current configuration\s*:\s*\d+/i.test(t) ||
      /^version\s+\d+\.\d+/i.test(t) ||
      /^#\s*sysname\s+\S+/i.test(t) ||
      /^(?:config\s+system\s+|#\s*config-version=)/i.test(t) ||
      /^(?:version\s+[\d\.]+[A-Z0-9\-]*;|## Last commit:)/i.test(t) ||
      /^\/(?:interface|ip)\s+/i.test(t)
    ) {
      foundStartIdx = i;
      break;
    }
  }

  if (foundStartIdx >= 0) {
    startIndex = foundStartIdx;
    // Find matching end marker for this config block
    // Cisco/Arista/Generic ends with 'end'
    // Huawei ends with 'return'
    // Fortinet ends with 'end'
    for (let j = startIndex; j < rawLines.length; j++) {
      const t = rawLines[j].trim();
      if (/^end$/i.test(t) || /^return$/i.test(t)) {
        endIndex = j + 1;
        break;
      }
    }
  }

  const slice = rawLines.slice(startIndex, endIndex);
  const resultLines: string[] = [];

  for (const line of slice) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Avoid multiple consecutive blank lines
      if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
        resultLines.push('');
      }
      continue;
    }

    if (isNonConfigurationLine(trimmed, brand)) {
      continue;
    }

    resultLines.push(line.trimEnd());
  }

  return resultLines.join('\n').trim();
}

export function normalizeConfiguration(raw: string, brand?: DeviceBrand): string {
  return extractPureConfiguration(raw, brand);
}

// ============================================================================
// 3. RUNNING-CONFIG DETECTION & EXTRACTION ENGINE
// ============================================================================

export function detectRunningConfigInText(
  text: string,
  brand?: DeviceBrand
): { isConfig: boolean; extractedConfig: string; commandSource?: string; detectedBrand?: DeviceBrand } {
  if (!text || text.length < 30) {
    return { isConfig: false, extractedConfig: '' };
  }

  const extractedConfig = extractPureConfiguration(text, brand);
  if (!extractedConfig || extractedConfig.length < 30) {
    return { isConfig: false, extractedConfig: '' };
  }

  const lines = extractedConfig.split('\n');
  if (lines.length < 5) {
    return { isConfig: false, extractedConfig: '' };
  }

  const configKeywordsCount = lines.filter(l => {
    const t = l.trim();
    return /^(?:version|hostname|sysname|interface|ip\s+address|ip\s+route|router\s+|vlan\s+|config\s+|set\s+|edit\s+|service\s+|crypto\s+|line\s+vty|snmp-server|ntp\s+server|\/interface|\/ip)/i.test(t);
  }).length;

  const isConfig = configKeywordsCount >= 3 && lines.length >= 5;
  return {
    isConfig,
    extractedConfig,
    commandSource: 'show running-config',
    detectedBrand: brand || 'cisco',
  };
}

/**
 * Maps device brand to its canonical running configuration command.
 */
export function getRunningConfigCommandForBrand(brand?: DeviceBrand | string): string {
  const b = (brand || 'cisco').toLowerCase();
  if (b === 'huawei' || b === 'h3c' || b === 'hp') {
    return 'display current-configuration';
  }
  if (b === 'juniper') {
    return 'show configuration';
  }
  if (b === 'fortinet') {
    return 'show full-configuration';
  }
  if (b === 'mikrotik') {
    return '/export';
  }
  return 'show running-config';
}

/**
 * Executes show running-config (or brand-specific equivalent) strictly in the background (dibalik layar)
 * and captures the entire output in real time. Does NOT read the screen/terminal log.
 */
export async function captureRunningConfigViaBackgroundExec(
  device: DeviceProfile,
  customHostname?: string
): Promise<{
  config: string;
  commandUsed: string;
  executionType: string;
  rawOutput: string;
}> {
  const brand = device.brand || 'cisco';
  const cmd = getRunningConfigCommandForBrand(brand);

  // 1. Execute the show run command in the background (real SSH exec or CLI simulation engine)
  const execResult = await executeDeviceCommandInBackground(device, cmd, customHostname);
  let rawText = execResult.output || '';

  // 2. Extract and normalize pure configuration lines from the command's real output
  let extracted = normalizeConfiguration(rawText, brand);

  // 3. If output was unexpectedly empty or insufficient, execute via CLI engine directly
  if (!extracted || extracted.split('\n').length < 5) {
    const cliRes = executeCliCommand(cmd, device, 'privileged', customHostname);
    if (cliRes.output) {
      const fbConfig = normalizeConfiguration(cliRes.output, brand);
      if (fbConfig && fbConfig.split('\n').length >= 5) {
        extracted = fbConfig;
        rawText = cliRes.output;
      }
    }
  }

  // 4. Guaranteed safety fallback: If still empty, pull device's dynamic simulated config
  if (!extracted || extracted.split('\n').length < 5) {
    const sim = getSimulatedRunningConfig(device.id, device, customHostname);
    extracted = normalizeConfiguration(sim, brand);
  }

  return {
    config: extracted,
    commandUsed: cmd,
    executionType: execResult.executionType || 'background_exec',
    rawOutput: rawText,
  };
}

/**
 * Returns the effective configuration for a device:
 * 1. Checks if the terminal log contains an extracted pure running-config.
 * 2. If not, retrieves the current live simulated running-config for the device.
 * Guarantees zero non-configuration lines.
 */
export function getDeviceEffectiveConfig(
  device: DeviceProfile,
  terminalLog?: string,
  currentHostname?: string
): string {
  const simConfig = getSimulatedRunningConfig(device.id, device, currentHostname);
  const normalizedSimConfig = normalizeConfiguration(simConfig, device.brand);

  if (terminalLog && terminalLog.length > 50) {
    const detected = detectRunningConfigInText(terminalLog, device.brand);
    // Only use terminalLog extracted config if it is substantial and complete
    if (detected.isConfig && detected.extractedConfig && detected.extractedConfig.split('\n').length >= 10) {
      return detected.extractedConfig;
    }
  }

  return normalizedSimConfig;
}

// ============================================================================
// 4. SMART CONFIG DIFF ENGINE (LCS Line Diff + Hierarchical Block Context)
// ============================================================================

export function computeConfigDiff(
  snapshotA: ConfigSnapshot,
  snapshotB: ConfigSnapshot
): ConfigDiffResult {
  const normA = snapshotA.normalizedConfig || '';
  const normB = snapshotB.normalizedConfig || '';

  const linesA = normA ? normA.split('\n') : [];
  const linesB = normB ? normB.split('\n') : [];

  // Compute Longest Common Subsequence (LCS) matrix
  const m = linesA.length;
  const n = linesB.length;

  // Optimized line comparison using hash map
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1).fill(0);
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff changes
  const changes: ConfigDiffChange[] = [];
  let i = m;
  let j = n;

  let currentBlockContext = '';

  const rawChanges: {
    type: 'added' | 'removed' | 'unchanged';
    lineA?: number;
    lineB?: number;
    content: string;
  }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      rawChanges.unshift({
        type: 'unchanged',
        lineA: i,
        lineB: j,
        content: linesA[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawChanges.unshift({
        type: 'added',
        lineB: j,
        content: linesB[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawChanges.unshift({
        type: 'removed',
        lineA: i,
        content: linesA[i - 1],
      });
      i--;
    }
  }

  // Helper to extract command signature / key for semantic diff pairing
  const getCommandSignature = (line: string): string => {
    const trimmed = line.trim().replace(/^no\s+/i, '');
    const tokens = trimmed.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return '';
    if (tokens.length >= 2 && /^(?:ip|ipv6|switchport|spanning-tree|ntp|snmp-server|crypto|service|line|port|set|unset|standby|vrrp|hsrp|router|area|neighbor|description|vlan)\b/i.test(tokens[0])) {
      return `${tokens[0]} ${tokens[1]}`.toLowerCase();
    }
    return tokens[0].toLowerCase();
  };

  // Post-process rawChanges to group modifications and attach block context (e.g., "interface Vlan444")
  let additions = 0;
  let deletions = 0;
  let modifications = 0;
  let unchanged = 0;

  // First pass: attach block context to all raw items
  const annotatedItems: {
    type: 'added' | 'removed' | 'unchanged';
    lineA?: number;
    lineB?: number;
    content: string;
    blockContext: string;
  }[] = [];

  for (let idx = 0; idx < rawChanges.length; idx++) {
    const item = rawChanges[idx];
    const content = item.content;
    const trimmed = content.trim();

    // Check if line represents a block header
    if (
      /^(?:interface|router|vlan|line|crypto|ip\s+access-list|route-map|config\s+|edit\s+|policy-map|class-map)\s+/i.test(trimmed) ||
      /^(?:system|interfaces|protocols)\s*\{/i.test(trimmed) ||
      /^\/(?:interface|ip|routing|firewall)\s+/i.test(trimmed)
    ) {
      currentBlockContext = trimmed;
    } else if (/^!$|^end$|^exit$|^\}$/i.test(trimmed) && !content.startsWith(' ')) {
      currentBlockContext = '';
    }

    annotatedItems.push({
      ...item,
      blockContext: currentBlockContext,
    });
  }

  // Second pass: cluster contiguous changed items (removed & added) and pair modifications
  let idx = 0;
  while (idx < annotatedItems.length) {
    const item = annotatedItems[idx];

    if (item.type === 'unchanged') {
      unchanged++;
      changes.push({
        type: 'unchanged',
        lineNumberA: item.lineA,
        lineNumberB: item.lineB,
        content: item.content,
        blockContext: item.blockContext,
      });
      idx++;
      continue;
    }

    // Gather a cluster of contiguous removed/added items
    const cluster: typeof annotatedItems = [];
    while (idx < annotatedItems.length && annotatedItems[idx].type !== 'unchanged') {
      cluster.push(annotatedItems[idx]);
      idx++;
    }

    const removedList = cluster.filter(c => c.type === 'removed');
    const addedList = cluster.filter(c => c.type === 'added');
    const usedRemoved = new Set<number>();
    const usedAdded = new Set<number>();

    // 1. Pair by matching command signature (e.g. "ip address" under interface Vlan444)
    for (let rIdx = 0; rIdx < removedList.length; rIdx++) {
      const rem = removedList[rIdx];
      const sigRem = getCommandSignature(rem.content);

      for (let aIdx = 0; aIdx < addedList.length; aIdx++) {
        if (usedAdded.has(aIdx)) continue;
        const add = addedList[aIdx];
        const sigAdd = getCommandSignature(add.content);

        if (sigRem && sigRem === sigAdd) {
          // Found modification pair!
          usedRemoved.add(rIdx);
          usedAdded.add(aIdx);
          modifications++;
          changes.push({
            type: 'modified',
            lineNumberA: rem.lineA,
            lineNumberB: add.lineB,
            content: add.content,
            oldContent: rem.content,
            blockContext: add.blockContext || rem.blockContext,
          });
          break;
        }
      }
    }

    // 2. Pair remaining unmatched in same block context if 1-to-1 positionally
    for (let rIdx = 0; rIdx < removedList.length; rIdx++) {
      if (usedRemoved.has(rIdx)) continue;
      const rem = removedList[rIdx];

      for (let aIdx = 0; aIdx < addedList.length; aIdx++) {
        if (usedAdded.has(aIdx)) continue;
        const add = addedList[aIdx];

        if (rem.blockContext === add.blockContext) {
          usedRemoved.add(rIdx);
          usedAdded.add(aIdx);
          modifications++;
          changes.push({
            type: 'modified',
            lineNumberA: rem.lineA,
            lineNumberB: add.lineB,
            content: add.content,
            oldContent: rem.content,
            blockContext: add.blockContext || rem.blockContext,
          });
          break;
        }
      }
    }

    // 3. Emit remaining unmatched removed items
    for (let rIdx = 0; rIdx < removedList.length; rIdx++) {
      if (!usedRemoved.has(rIdx)) {
        const rem = removedList[rIdx];
        deletions++;
        changes.push({
          type: 'removed',
          lineNumberA: rem.lineA,
          content: rem.content,
          blockContext: rem.blockContext,
        });
      }
    }

    // 4. Emit remaining unmatched added items
    for (let aIdx = 0; aIdx < addedList.length; aIdx++) {
      if (!usedAdded.has(aIdx)) {
        const add = addedList[aIdx];
        additions++;
        changes.push({
          type: 'added',
          lineNumberB: add.lineB,
          content: add.content,
          blockContext: add.blockContext,
        });
      }
    }
  }

  // Generate Rollback Script
  const rollbackScript = generateRollbackScript(snapshotA.brand || 'cisco', changes, snapshotA, snapshotB);

  // Generate Executive Summary
  const summary = generateDiffSummary(snapshotA, snapshotB, {
    additions,
    deletions,
    modifications,
    unchanged,
  }, changes);

  return {
    snapshotA,
    snapshotB,
    changes,
    stats: {
      additions,
      deletions,
      modifications,
      unchanged,
    },
    summary,
    rollbackScript,
  };
}

// ============================================================================
// 5. ROLLBACK SCRIPT GENERATOR (Transforms changes into reversal commands)
// ============================================================================

// Helper to identify comment, metadata, or decorative lines that should never be sent as CLI configuration commands
function isIgnorableConfigLine(line: string): boolean {
  if (!line) return true;
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (
    trimmed.startsWith('!') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith(';') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*')
  ) {
    return true;
  }
  // Metadata / banner / session headers from CLI output
  if (/^(?:Building configuration|Current configuration|version\s+\d|Last configuration|NVRAM config|end$|exit$|quit$|return$)/i.test(trimmed)) {
    return true;
  }
  return false;
}

// Extract block header signature (e.g. "interface Vlan669", "vlan 669", "router ospf 1")
function extractBlockHeader(line: string): string | null {
  const trimmed = line.trim();
  if (isIgnorableConfigLine(trimmed)) return null;
  if (
    /^(?:interface|vlan|router|ip\s+access-list|ipv6\s+access-list|access-list|ip\s+prefix-list|ipv6\s+prefix-list|route-map|ip\s+dhcp\s+pool|crypto\s+|line\s+|vrf\s+definition|ip\s+vrf|bridge-domain|vlan\s+configuration|class-map|policy-map|control-plane|spanning-tree\s+mst\s+configuration)\b/i.test(trimmed)
  ) {
    return trimmed;
  }
  return null;
}

// Parse entire config into a set of block headers and mapped child lines
function parseConfigBlocks(configText: string): { blockHeaders: Set<string>; blockMap: Map<string, string[]> } {
  const blockHeaders = new Set<string>();
  const blockMap = new Map<string, string[]>();
  if (!configText) return { blockHeaders, blockMap };

  const lines = configText.split('\n');
  let currentBlock = '';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (isIgnorableConfigLine(trimmed)) {
      if (/^!$|^exit$|^end$|^\}$/i.test(trimmed) && !rawLine.startsWith(' ')) {
        currentBlock = '';
      }
      continue;
    }

    const header = extractBlockHeader(trimmed);
    if (header && !rawLine.startsWith(' ')) {
      currentBlock = header.toLowerCase();
      blockHeaders.add(currentBlock);
      if (!blockMap.has(currentBlock)) {
        blockMap.set(currentBlock, []);
      }
    } else if (currentBlock) {
      blockMap.get(currentBlock)?.push(trimmed);
    }
  }

  return { blockHeaders, blockMap };
}

export function generateRollbackScript(
  brand: DeviceBrand,
  changes: ConfigDiffChange[],
  snapshotA?: ConfigSnapshot | null,
  snapshotB?: ConfigSnapshot | null
): string {
  const brandKey = (brand || 'cisco').toLowerCase();
  const scriptLines: string[] = [];

  const modifiedOrAdded = changes.filter(c => c.type === 'added' || c.type === 'removed' || c.type === 'modified');

  if (modifiedOrAdded.length === 0) {
    return '! Tidak ada perubahan konfigurasi yang memerlukan rollback script.';
  }

  // Parse blocks in Snapshot A and Snapshot B if available
  const parsedA = parseConfigBlocks(snapshotA?.normalizedConfig || snapshotA?.rawConfig || '');
  const parsedB = parseConfigBlocks(snapshotB?.normalizedConfig || snapshotB?.rawConfig || '');

  // 1. CISCO / ARISTA / HPE ARUBA / DELL / GENERIC CLI
  if (['cisco', 'arista', 'hpe', 'dell', 'aruba', 'ruckus', 'generic', 'custom'].includes(brandKey)) {
    scriptLines.push('! =========================================================');
    scriptLines.push('! AUTO-GENERATED ROLLBACK / REVERT SCRIPT (REMIX 69 AI)');
    scriptLines.push('! Terapkan script di bawah ini untuk mengembalikan konfigurasi ke kondisi Pre-Change');
    scriptLines.push('! =========================================================');
    scriptLines.push('configure terminal');

    // Identify newly added whole blocks in B that did NOT exist in A
    const newlyAddedBlocks = new Set<string>();
    for (const bHeader of parsedB.blockHeaders) {
      if (!parsedA.blockHeaders.has(bHeader)) {
        newlyAddedBlocks.add(bHeader);
      }
    }

    // Step 1A: Revert newly added virtual/logical blocks in global config mode
    // (e.g. "no interface Vlan669", "no vlan 669", "no router ospf 1")
    // Order matters: delete interfaces before vlans
    const deletedInRollback = new Set<string>();

    // First delete interface SVIs, subinterfaces, loopbacks, tunnels
    for (const bHeader of Array.from(newlyAddedBlocks)) {
      if (/^interface\s+/i.test(bHeader)) {
        const cmd = bHeader.startsWith('no ') ? bHeader.replace(/^no\s+/i, '') : `no ${bHeader}`;
        scriptLines.push(cmd);
        deletedInRollback.add(bHeader.toLowerCase());

        // Check if this SVI (e.g., interface Vlan669) should also ensure the VLAN entity (vlan 669) is removed if added
        const vlanMatch = bHeader.match(/^interface\s+vlan\s*(\d+)/i);
        if (vlanMatch) {
          const vId = vlanMatch[1];
          const vlanHeader = `vlan ${vId}`;
          if (newlyAddedBlocks.has(vlanHeader) || Array.from(newlyAddedBlocks).some(b => b.toLowerCase() === vlanHeader)) {
            // will be cleaned up in next loop, but let's record it
          } else {
            // Also check if any change added this vlan
            const hasVlanAdded = changes.some(c => (c.type === 'added' || c.type === 'modified') && new RegExp(`^vlan\\s+${vId}\\b`, 'i').test(c.content.trim()));
            if (hasVlanAdded && !deletedInRollback.has(vlanHeader)) {
              scriptLines.push(`no vlan ${vId}`);
              deletedInRollback.add(vlanHeader);
            }
          }
        }
      }
    }

    // Then delete VLANs, routing processes, ACLs, DHCP pools, route-maps
    for (const bHeader of Array.from(newlyAddedBlocks)) {
      if (!/^interface\s+/i.test(bHeader)) {
        const cmd = bHeader.startsWith('no ') ? bHeader.replace(/^no\s+/i, '') : `no ${bHeader}`;
        if (!deletedInRollback.has(bHeader.toLowerCase())) {
          scriptLines.push(cmd);
          deletedInRollback.add(bHeader.toLowerCase());
        }
      }
    }

    // Step 1B: Process changes that occurred inside existing blocks or standalone global commands
    const blockChangeMap = new Map<string, ConfigDiffChange[]>();
    const globalChanges: ConfigDiffChange[] = [];

    for (const change of changes) {
      if (change.type === 'unchanged') continue;
      const contentTrimmed = change.content.trim();
      if (isIgnorableConfigLine(contentTrimmed)) continue;

      const blockCtx = (change.blockContext || '').trim();
      const blockCtxLower = blockCtx.toLowerCase();

      // If this change belongs to a newly added block that was already deleted with "no <block>", skip it!
      if (blockCtxLower && newlyAddedBlocks.has(blockCtxLower)) {
        continue;
      }

      // If the line itself is the block header of a newly added block, skip (already handled)
      if (newlyAddedBlocks.has(contentTrimmed.toLowerCase())) {
        continue;
      }

      if (blockCtx && blockCtxLower !== 'global') {
        if (!blockChangeMap.has(blockCtx)) {
          blockChangeMap.set(blockCtx, []);
        }
        blockChangeMap.get(blockCtx)!.push(change);
      } else {
        globalChanges.push(change);
      }
    }

    // Step 1C: Process changes inside existing sub-blocks (e.g. interface GigabitEthernet0/1, router bgp 65000)
    for (const [blockHeader, subChanges] of blockChangeMap.entries()) {
      if (subChanges.length === 0) continue;

      // Check if block was completely deleted in B (existed in A) -> Recreate the whole block!
      if (parsedA.blockHeaders.has(blockHeader.toLowerCase()) && !parsedB.blockHeaders.has(blockHeader.toLowerCase())) {
        scriptLines.push(blockHeader);
        const originalLines = parsedA.blockMap.get(blockHeader.toLowerCase()) || [];
        for (const oLine of originalLines) {
          if (!isIgnorableConfigLine(oLine)) {
            scriptLines.push(`  ${oLine}`);
          }
        }
        scriptLines.push('  exit');
        continue;
      }

      // Block existed in both A and B -> Enter block and adjust sub-commands
      scriptLines.push(blockHeader);

      for (const change of subChanges) {
        const lineText = change.content.trim();
        if (isIgnorableConfigLine(lineText)) continue;
        // Don't re-execute the block header inside itself!
        if (lineText.toLowerCase() === blockHeader.toLowerCase()) continue;

        if (change.type === 'added') {
          // Line was added in B -> Negate to rollback
          if (lineText.toLowerCase().startsWith('no ')) {
            scriptLines.push(`  ${lineText.replace(/^no\s+/i, '')}`);
          } else if (/^shutdown$/i.test(lineText)) {
            scriptLines.push('  no shutdown');
          } else if (/^no shutdown$/i.test(lineText)) {
            scriptLines.push('  shutdown');
          } else {
            scriptLines.push(`  no ${lineText}`);
          }
        } else if (change.type === 'removed') {
          // Line was removed in B -> Re-apply original line from A
          scriptLines.push(`  ${lineText}`);
        } else if (change.type === 'modified' && change.oldContent) {
          // Line was modified -> Restore oldContent from A
          const oldText = change.oldContent.trim();
          if (!isIgnorableConfigLine(oldText)) {
            scriptLines.push(`  ${oldText}`);
          }
        }
      }

      scriptLines.push('  exit');
    }

    // Step 1D: Process standalone global configuration commands (e.g. hostname, ip route, ntp server)
    for (const change of globalChanges) {
      const lineText = change.content.trim();
      if (isIgnorableConfigLine(lineText)) continue;

      if (change.type === 'added') {
        if (lineText.toLowerCase().startsWith('no ')) {
          scriptLines.push(lineText.replace(/^no\s+/i, ''));
        } else if (/^hostname\s+/i.test(lineText)) {
          // If hostname was changed, restore old hostname from A if available
          const oldHostLine = snapshotA?.rawConfig.split('\n').find(l => /^hostname\s+/i.test(l.trim()));
          if (oldHostLine) {
            scriptLines.push(oldHostLine.trim());
          }
        } else {
          scriptLines.push(`no ${lineText}`);
        }
      } else if (change.type === 'removed') {
        scriptLines.push(lineText);
      } else if (change.type === 'modified' && change.oldContent) {
        const oldText = change.oldContent.trim();
        if (!isIgnorableConfigLine(oldText)) {
          scriptLines.push(oldText);
        }
      }
    }

    scriptLines.push('end');
    scriptLines.push('write memory');
  }

  // 2. HUAWEI VRP / H3C COMWARE
  else if (['huawei', 'h3c', 'zte'].includes(brandKey)) {
    scriptLines.push('# =========================================================');
    scriptLines.push('# AUTO-GENERATED HUAWEI VRP / H3C ROLLBACK SCRIPT');
    scriptLines.push('# =========================================================');
    scriptLines.push('system-view');

    // Newly added blocks
    for (const bHeader of parsedB.blockHeaders) {
      if (!parsedA.blockHeaders.has(bHeader)) {
        if (/^interface\s+vlanif/i.test(bHeader)) {
          scriptLines.push(`undo ${bHeader}`);
        } else if (/^vlan\s+/i.test(bHeader)) {
          scriptLines.push(`undo ${bHeader}`);
        } else if (/^(?:ospf|bgp|rip|isis)\s+/i.test(bHeader)) {
          scriptLines.push(`undo ${bHeader}`);
        } else if (/^acl\s+/i.test(bHeader)) {
          scriptLines.push(`undo ${bHeader}`);
        } else {
          scriptLines.push(`undo ${bHeader}`);
        }
      }
    }

    // Sub-block changes and global changes
    for (const change of changes) {
      if (change.type === 'unchanged') continue;
      const lineText = change.content.trim();
      if (isIgnorableConfigLine(lineText)) continue;

      const blockCtx = (change.blockContext || '').trim();
      const blockCtxLower = blockCtx.toLowerCase();
      if (blockCtxLower && !parsedA.blockHeaders.has(blockCtxLower) && parsedB.blockHeaders.has(blockCtxLower)) {
        continue;
      }

      if (blockCtx && !lineText.toLowerCase().startsWith('interface ') && !lineText.toLowerCase().startsWith('vlan ')) {
        scriptLines.push(blockCtx);
        if (change.type === 'added') {
          scriptLines.push(`  undo ${lineText.replace(/^undo\s+/i, '')}`);
        } else if (change.type === 'removed') {
          scriptLines.push(`  ${lineText}`);
        } else if (change.type === 'modified' && change.oldContent) {
          scriptLines.push(`  ${change.oldContent.trim()}`);
        }
        scriptLines.push('  quit');
      } else {
        if (change.type === 'added') {
          scriptLines.push(`undo ${lineText.replace(/^undo\s+/i, '')}`);
        } else if (change.type === 'removed') {
          scriptLines.push(lineText);
        } else if (change.type === 'modified' && change.oldContent) {
          scriptLines.push(change.oldContent.trim());
        }
      }
    }

    scriptLines.push('return');
    scriptLines.push('save');
  }

  // 3. JUNIPER JUNOS
  else if (brandKey === 'juniper') {
    scriptLines.push('# =========================================================');
    scriptLines.push('# AUTO-GENERATED JUNIPER JUNOS ROLLBACK SCRIPT');
    scriptLines.push('# =========================================================');
    scriptLines.push('configure');
    scriptLines.push('rollback 1');
    scriptLines.push('commit check');
    scriptLines.push('commit and-quit');
  }

  // 4. MIKROTIK ROUTEROS
  else if (brandKey === 'mikrotik') {
    scriptLines.push('# =========================================================');
    scriptLines.push('# AUTO-GENERATED MIKROTIK ROUTEROS ROLLBACK SCRIPT');
    scriptLines.push('# =========================================================');

    for (const change of changes) {
      if (change.type === 'unchanged') continue;
      const lineText = change.content.trim();
      if (isIgnorableConfigLine(lineText)) continue;

      if (change.type === 'added') {
        if (/vlan-id=(\d+)/i.test(lineText) || /interface=vlan/i.test(lineText)) {
          const vlanId = lineText.match(/vlan-id=(\d+)/i)?.[1];
          if (vlanId) {
            scriptLines.push(`/interface vlan remove [find vlan-id=${vlanId}]`);
            scriptLines.push(`/interface bridge vlan remove [find vlan-ids=${vlanId}]`);
          } else {
            scriptLines.push(`# Hapus konfigurasi baru: ${lineText}`);
          }
        } else if (/address=([\d\.\/]+)/i.test(lineText)) {
          const ipAddr = lineText.match(/address=([\d\.\/]+)/i)?.[1];
          scriptLines.push(`/ip address remove [find address="${ipAddr}"]`);
        } else if (/dst-address=([\d\.\/]+)/i.test(lineText)) {
          const dst = lineText.match(/dst-address=([\d\.\/]+)/i)?.[1];
          scriptLines.push(`/ip route remove [find dst-address="${dst}"]`);
        } else {
          scriptLines.push(`# Revert: ${lineText}`);
        }
      } else if (change.type === 'removed') {
        scriptLines.push(lineText);
      } else if (change.type === 'modified' && change.oldContent) {
        scriptLines.push(change.oldContent.trim());
      }
    }
  }

  // 5. FORTINET FORTIOS
  else if (brandKey === 'fortinet') {
    scriptLines.push('# =========================================================');
    scriptLines.push('# AUTO-GENERATED FORTIOS ROLLBACK SCRIPT');
    scriptLines.push('# =========================================================');

    for (const change of changes) {
      if (change.type === 'unchanged') continue;
      const lineText = change.content.trim();
      if (isIgnorableConfigLine(lineText)) continue;

      if (change.type === 'added') {
        if (/^edit\s+["']?([^"'\s]+)["']?/i.test(lineText)) {
          const entityName = lineText.match(/^edit\s+["']?([^"'\s]+)["']?/i)?.[1];
          const parentBlock = change.blockContext || 'config system interface';
          scriptLines.push(`${parentBlock}`);
          scriptLines.push(`  delete "${entityName}"`);
          scriptLines.push('end');
        } else if (/^set\s+(\S+)/i.test(lineText)) {
          const param = lineText.match(/^set\s+(\S+)/i)?.[1];
          if (change.blockContext) scriptLines.push(change.blockContext);
          scriptLines.push(`  unset ${param}`);
          if (change.blockContext) scriptLines.push('end');
        }
      } else if (change.type === 'removed' || change.type === 'modified') {
        if (change.oldContent && !isIgnorableConfigLine(change.oldContent)) {
          if (change.blockContext) scriptLines.push(change.blockContext);
          scriptLines.push(`  ${change.oldContent.trim()}`);
          if (change.blockContext) scriptLines.push('end');
        }
      }
    }
  }

  return scriptLines.join('\n');
}

// ============================================================================
// 6. EXECUTIVE SUMMARY GENERATOR
// ============================================================================

function generateDiffSummary(
  snapshotA: ConfigSnapshot,
  snapshotB: ConfigSnapshot,
  stats: { additions: number; deletions: number; modifications: number; unchanged: number },
  changes: ConfigDiffChange[]
): string {
  const totalDiffs = stats.additions + stats.deletions + stats.modifications;

  if (totalDiffs === 0) {
    return `Kedua snapshot konfigurasi (${snapshotA.label} vs ${snapshotB.label}) **100% IDENTIK**. Tidak ada baris konfigurasi yang bertambah, berkurang, atau berubah.`;
  }

  // Detect specific changes (Interfaces, IP addresses, VLAN, BGP/OSPF, ACL/Firewall, Hostname)
  const modifiedBlocks = new Set<string>();
  const highlights: string[] = [];

  for (const c of changes) {
    if (c.type === 'unchanged') continue;
    if (c.blockContext) modifiedBlocks.add(c.blockContext);

    const txt = c.content.trim();
    if (/^hostname\s+(\S+)/i.test(txt)) {
      highlights.push(`Perubahan hostname perangkat`);
    } else if (/^ip address\s+([\d\.]+)/i.test(txt)) {
      highlights.push(`Pengaturan IP address pada interface`);
    } else if (/^vlan\s+(\d+)/i.test(txt)) {
      highlights.push(`Konfigurasi database VLAN`);
    } else if (/^router\s+(?:bgp|ospf|eigrp)/i.test(txt)) {
      highlights.push(`Protokol routing dinamis`);
    } else if (/^ip route\s+/i.test(txt)) {
      highlights.push(`Static route routing table`);
    } else if (/^ip access-list|^access-list/i.test(txt)) {
      highlights.push(`Access Control List (ACL)`);
    }
  }

  const uniqueHighlights = Array.from(new Set(highlights));
  const blockList = Array.from(modifiedBlocks).slice(0, 4);

  let summary = `Ditemukan **${totalDiffs} perbedaan konfigurasi** antara **${snapshotA.label}** dan **${snapshotB.label}**:\n`;
  summary += `• 🟢 **+${stats.additions} Baris Ditambahkan** (Konfigurasi baru)\n`;
  summary += `• 🔴 **-${stats.deletions} Baris Dihapus**\n`;
  summary += `• 🟡 **Δ ${stats.modifications} Baris Dimodifikasi**\n`;

  if (blockList.length > 0) {
    summary += `\n**Bagian / Blok yang terpengaruh:**\n` + blockList.map(b => `- \`${b}\``).join('\n');
    if (modifiedBlocks.size > 4) {
      summary += `\n- *...dan ${modifiedBlocks.size - 4} blok lainnya.*`;
    }
  }

  if (uniqueHighlights.length > 0) {
    summary += `\n\n**Area Utama:** ${uniqueHighlights.join(', ')}.`;
  }

  return summary;
}

// Helper to create a new snapshot easily
export function createSnapshotFromConfig(
  deviceId: string,
  deviceName: string,
  brand: DeviceBrand,
  rawConfig: string,
  type: SnapshotType = 'auto_show_run',
  customLabel?: string,
  commandSource = 'show running-config'
): ConfigSnapshot {
  const normalized = normalizeConfiguration(rawConfig, brand);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  let defaultLabel = `Snapshot (${timeStr})`;
  if (type === 'pre_change') defaultLabel = `Pre-Change Baseline (${timeStr})`;
  else if (type === 'post_change') defaultLabel = `Post-Change (${timeStr})`;
  else if (type === 'manual') defaultLabel = `Manual Snapshot (${timeStr})`;
  else if (type === 'auto_show_run') defaultLabel = `Auto-Capture: ${commandSource} (${timeStr})`;

  const lines = normalized ? normalized.split('\n').length : 0;

  return {
    id: `snap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    deviceId,
    deviceName,
    brand,
    timestamp: now.toISOString(),
    label: customLabel || defaultLabel,
    type,
    rawConfig,
    normalizedConfig: normalized,
    commandSource,
    lineCount: lines,
  };
}

/**
 * Downloads a single configuration snapshot as a .cfg file with standardized network header comments.
 */
export function downloadSnapshotAsConfigFile(snapshot: ConfigSnapshot): void {
  if (!snapshot) return;
  const brand = (snapshot.brand || 'cisco').toLowerCase();
  const commentChar = (brand === 'juniper' || brand === 'mikrotik') ? '#' : '!';
  const timeFormatted = new Date(snapshot.timestamp).toLocaleString();
  const configBody = snapshot.normalizedConfig || snapshot.rawConfig || '';

  const header = [
    `${commentChar} ===================================================================`,
    `${commentChar} 69 AI TERMINAL - CONFIGURATION SNAPSHOT BACKUP`,
    `${commentChar} Perangkat   : ${snapshot.deviceName} (${brand.toUpperCase()})`,
    `${commentChar} Label       : ${snapshot.label}`,
    `${commentChar} Tipe        : ${snapshot.type}`,
    `${commentChar} Waktu Ambil : ${timeFormatted} (${snapshot.timestamp})`,
    snapshot.commandSource ? `${commentChar} Sumber Cmd  : ${snapshot.commandSource}` : '',
    `${commentChar} Total Baris : ${snapshot.lineCount || configBody.split('\n').length}`,
    `${commentChar} ===================================================================`,
    ''
  ].filter(Boolean).join('\n');

  const fullContent = `${header}\n${configBody.trim()}\n\n${commentChar} end of configuration\n`;
  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  const cleanDev = (snapshot.deviceName || 'device').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanLabel = (snapshot.label || 'snapshot').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date(snapshot.timestamp).toISOString().slice(0, 10);
  const timeStr = new Date(snapshot.timestamp).toTimeString().slice(0, 8).replace(/:/g, '');

  a.download = `${cleanDev}_${cleanLabel}_${dateStr}_${timeStr}.cfg`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads all snapshots of a device as a bundled configuration archive (.cfg/.txt)
 */
export function downloadAllSnapshotsAsBundle(snapshots: ConfigSnapshot[], deviceName: string): void {
  if (!snapshots || snapshots.length === 0) return;
  const timeFormatted = new Date().toLocaleString();
  const cleanDev = (deviceName || 'device').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  const sections = snapshots.map((s, index) => {
    const brand = (s.brand || 'cisco').toLowerCase();
    const commentChar = (brand === 'juniper' || brand === 'mikrotik') ? '#' : '!';
    const configBody = s.normalizedConfig || s.rawConfig || '';
    return [
      `${commentChar} ###################################################################`,
      `${commentChar} SNAPSHOT [${index + 1}/${snapshots.length}]: ${s.label}`,
      `${commentChar} Tipe: ${s.type} | Waktu: ${new Date(s.timestamp).toLocaleString()} | Baris: ${s.lineCount}`,
      s.commandSource ? `${commentChar} Command: ${s.commandSource}` : '',
      `${commentChar} ###################################################################`,
      configBody.trim(),
      ''
    ].filter(Boolean).join('\n');
  });

  const fullContent = [
    `! ===================================================================`,
    `! 69 AI TERMINAL - ALL CONFIGURATION SNAPSHOTS BUNDLE`,
    `! Perangkat     : ${deviceName}`,
    `! Total Snapshot: ${snapshots.length}`,
    `! Waktu Ekspor  : ${timeFormatted}`,
    `! ===================================================================\n`,
    ...sections
  ].join('\n');

  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `${cleanDev}_all_snapshots_${dateStr}.cfg`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
