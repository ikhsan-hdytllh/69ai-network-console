import { safeStorage } from "../utils/safeStorage";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SixtyNineAiLogo } from './SixtyNineAiLogo';
import { 
  Terminal as TerminalIcon, 
  Power, 
  Trash2, 
  Copy, 
  Check, 
  Info, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Cable, 
  Bluetooth, 
  Server,
  Bot,
  Sparkles,
  Plus,
  X,
  ChevronDown,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Slash,
  Square,
  Smartphone,
  ExternalLink,
  HardDrive,
  Palette,
  Radio,
  ZoomIn,
  ZoomOut,
  Sliders,
  HelpCircle,
  ArrowRightToLine,
  Ban,
  ChevronsDown,
  FastForward,
  MoreHorizontal,
  Lock,
  Eye,
  EyeOff,
  Zap,
  AlertTriangle,
  GitCompare,
  Camera,
  Split,
  Rows,
  ArrowRightLeft,
  Send
} from 'lucide-react';
import { DeviceProfile } from '../types';
import { 
  DEFAULT_INITIAL_TERMINAL_LOG, 
  simulateCommandExecution, 
  executeCliCommand,
  extractModeFromPrompt,
  getDevicePrompt,
  extractHostnameFromOutput,
  resolveDeviceRealHostname,
  connectWebSerialPort,
  startSerialDataStream,
  writeToActiveSerialDevice,
  sendSerialWakeupPulse,
  sendSerialBreakSignal,
  disconnectSerialSession,
  connectWebBluetoothSerial,
  setSessionDataListener,
  registerDesktopSerialSession,
  testSshBackendConnection,
  executeSshBackendCommand,
  isVirtualSession
} from '../services/serialConnection';
import { 
  handleCliTabCompletion, 
  handleCliContextHelp 
} from '../services/cliCompletionService';
import { bleBridgeService } from '../services/bleBridgeService';
import { AndroidIrxonModal } from './AndroidIrxonModal';
import { ConfigSnapshotModal } from './ConfigSnapshotModal';
import { LiveTerminalDiffModal } from './LiveTerminalDiffModal';
import { ConnectionInfoModal } from './ConnectionInfoModal';
import { SingleTerminalPaneView } from './SingleTerminalPaneView';
import { copyToClipboard } from '../utils/clipboard';
import { detectTerminalAnomalies, DetectedTerminalAnomaly } from '../services/terminalAnalyzer';
import { 
  getDeviceSnapshots, 
  saveDeviceSnapshot, 
  createSnapshotFromConfig, 
  detectRunningConfigInText,
  getDeviceEffectiveConfig,
  isSaveConfigurationCommand,
  isSaveConfigConfirmationOutput,
  captureRunningConfigViaBackgroundExec,
  getRunningConfigCommandForBrand
} from '../services/configSnapshotService';

// Comprehensive Token Regex for Network Terminals
const TERMINAL_TOKEN_REGEX = /(\[[✓✔]\]|\[[✕✗X]\]|\[\*\]|\[!\]|\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2}|:\d{1,5})?\b|\b(?:[a-fA-F0-9]{1,4}:){2,7}[a-fA-F0-9]{1,4}(?:\/\d{1,3})?\b|::1\/\d{1,3}|fe80::[a-fA-F0-9:]+|\b(?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}\b|\b(?:[0-9a-fA-F]{4}\.){2}[0-9a-fA-F]{4}\b|\b(?:DOWN|down|FAILED|Failed|failed|ERROR|Error|error|CRITICAL|Critical|critical|DISABLED|Disabled|disabled|DISCONNECTED|Disconnected|disconnected|UNREACHABLE|Unreachable|unreachable|ADMIN_DOWN|admin down|TIMEOUT|Timeout|timeout|DEAD|Dead|dead|SHUTDOWN|Shutdown|shutdown|DROPPED|DENIED|FAIL)\b|\b(?:UP|up|ESTABLISHED|Established|established|CONNECTED|Connected|connected|SUCCESS|Success|success|ACTIVE|Active|active|RUNNING|Running|running|ONLINE|Online|online|READY|Ready|ready|OK|PASS|LOWER_UP|FORWARDING|FULL)\b|\b(?:WARNING|Warning|warning|WARN|Warn|warn|UNKNOWN|Unknown|unknown|INIT|Init|init|CONNECTING|Connecting|connecting|STANDBY|Standby|standby|DEGRADED|Degraded|degraded|EXPIRED|LEARNING|DISCARDING)\b|\b(?:(?:GigabitEthernet|FastEthernet|TenGigabitEthernet|Serial|Cellular|Vlan|Loopback|Ethernet|Port-channel|Gi|Fa|Te|Se|Ce|Po)\d+(?:\/\d+)*(?:\.\d+)?|ens\d+|enp\d+s\d+|enx[0-9a-fA-F]+|eth\d+|lo:?)\b|\b(?:BGP|OSPF|EIGRP|RIP|NTP|DNS|DHCP|SNMP|LLDP|CDP|VRF|MPLS|MTU|VLAN|TCP|UDP|ICMP|SSH|TELNET)\b)/g;

function cleanTerminalStreamForDisplay(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\x1b\[\?2004[hl]/g, '')
    .replace(/\x1b\[\?1[hl]/g, '')
    .replace(/\x1b\[[0-9;]*[KJH]/g, '')
    .replace(/\x1b[=>]/g, '');
}

function renderTokenizedLine(text: string, lineKey: string | number) {
  if (!text) return null;
  const cleaned = cleanTerminalStreamForDisplay(text);
  const parts = cleaned.split(TERMINAL_TOKEN_REGEX);

  return parts.map((part, idx) => {
    if (!part) return null;
    const key = `${lineKey}-${idx}`;

    // 1. Status Icons
    if (part === '[✓]' || part === '[✔]') {
      return <span key={key} className="text-emerald-400 font-bold">{part}</span>;
    }
    if (part === '[✕]' || part === '[✗]' || part === '[X]') {
      return <span key={key} className="text-rose-400 font-bold">{part}</span>;
    }
    if (part === '[*]') {
      return <span key={key} className="text-cyan-400 font-bold">{part}</span>;
    }
    if (part === '[!]') {
      return <span key={key} className="text-amber-400 font-bold">{part}</span>;
    }

    // 2. IP Addresses (IPv4 or IPv6 with subnet or port)
    if (/^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2}|:\d{1,5})?$/.test(part) || /^(?:[a-fA-F0-9]{1,4}:){2,7}[a-fA-F0-9]{1,4}(?:\/\d{1,3})?$|^::1\/\d{1,3}$|^fe80::[a-fA-F0-9:]+$/.test(part)) {
      return <span key={key} className="text-cyan-300 font-semibold tracking-tight">{part}</span>;
    }

    // 3. MAC Addresses
    if (/^(?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$|^(?:[0-9a-fA-F]{4}\.){2}[0-9a-fA-F]{4}$/.test(part)) {
      return <span key={key} className="text-amber-300 font-medium">{part}</span>;
    }

    // 4. Critical Down / Error Statuses
    if (/^(DOWN|down|FAILED|Failed|failed|ERROR|Error|error|CRITICAL|Critical|critical|DISABLED|Disabled|disabled|DISCONNECTED|Disconnected|disconnected|UNREACHABLE|Unreachable|unreachable|ADMIN_DOWN|admin down|TIMEOUT|Timeout|timeout|DEAD|Dead|dead|SHUTDOWN|Shutdown|shutdown|DROPPED|DENIED|FAIL)$/.test(part)) {
      return <span key={key} className="text-rose-400 font-bold bg-rose-950/60 px-1 py-0.2 rounded-xs border border-rose-800/60">{part}</span>;
    }

    // 5. Success / Up / Active / Established Statuses
    if (/^(UP|up|ESTABLISHED|Established|established|CONNECTED|Connected|connected|SUCCESS|Success|success|ACTIVE|Active|active|RUNNING|Running|running|ONLINE|Online|online|READY|Ready|ready|OK|PASS|LOWER_UP|FORWARDING|FULL)$/.test(part)) {
      return <span key={key} className="text-emerald-300 font-bold bg-emerald-950/50 px-1 py-0.2 rounded-xs border border-emerald-800/50">{part}</span>;
    }

    // 6. Warning / Degraded Statuses
    if (/^(WARNING|Warning|warning|WARN|Warn|warn|UNKNOWN|Unknown|unknown|INIT|Init|init|CONNECTING|Connecting|connecting|STANDBY|Standby|standby|DEGRADED|Degraded|degraded|EXPIRED|LEARNING|DISCARDING)$/.test(part)) {
      return <span key={key} className="text-amber-400 font-bold bg-amber-950/50 px-1 py-0.2 rounded-xs border border-amber-800/50">{part}</span>;
    }

    // 7. Interfaces
    if (/^(?:(?:GigabitEthernet|FastEthernet|TenGigabitEthernet|Serial|Cellular|Vlan|Loopback|Ethernet|Port-channel|Gi|Fa|Te|Se|Ce|Po)\d+(?:\/\d+)*(?:\.\d+)?|ens\d+|enp\d+s\d+|enx[0-9a-fA-F]+|eth\d+|lo:?)$/.test(part)) {
      return <span key={key} className="text-sky-300 font-semibold">{part}</span>;
    }

    // 8. Protocols & Tech terms
    if (/^(BGP|OSPF|EIGRP|RIP|NTP|DNS|DHCP|SNMP|LLDP|CDP|VRF|MPLS|MTU|VLAN|TCP|UDP|ICMP|SSH|TELNET)$/.test(part)) {
      return <span key={key} className="text-purple-300 font-medium">{part}</span>;
    }

    // Default text in white/light-gray terminal palette
    return <span key={key} className="text-slate-100">{part}</span>;
  });
}

interface ColorizedTerminalOutputProps {
  rawText: string;
  onPageNext?: () => void;
  onPageNextLine?: () => void;
  onPageQuit?: () => void;
  onPageAll?: () => void;
}

const ColorizedTerminalOutput: React.FC<ColorizedTerminalOutputProps> = React.memo(({ 
  rawText,
  onPageNext,
  onPageNextLine,
  onPageQuit,
  onPageAll,
}) => {
  const [showAllLines, setShowAllLines] = useState<boolean>(false);
  if (!rawText) return null;

  // Strip trailing newlines to ensure no phantom empty line right above the active input line
  const cleanText = rawText.replace(/\n+$/, '');
  if (!cleanText) return null;

  const allLines = cleanText.split('\n');
  const maxInitialLines = 250;
  const isTruncated = allLines.length > maxInitialLines && !showAllLines;
  const lines = isTruncated ? allLines.slice(-maxInitialLines) : allLines;
  const startIndex = isTruncated ? allLines.length - maxInitialLines : 0;

  return (
    <pre className="whitespace-pre-wrap font-mono break-words min-w-0 selection:bg-blue-600 selection:text-white font-normal m-0 p-0 text-slate-100 leading-relaxed">
      {isTruncated && (
        <div className="mb-2 pb-1 border-b border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => setShowAllLines(true)}
            className="text-[11px] font-sans text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-800/50 rounded px-2.5 py-1 transition-colors cursor-pointer"
          >
            🔼 Tampilkan {allLines.length - maxInitialLines} baris log sebelumnya...
          </button>
        </div>
      )}
      {lines.map((line, lineOffset) => {
        const lineIdx = startIndex + lineOffset;
        // Empty lines
        if (!line || line.trim() === '') {
          return (
            <div key={lineIdx} className="min-h-[1.25em]">
              &nbsp;
            </div>
          );
        }

        // Pager line highlight (--More--, ---- More ----, --- more ---, etc.)
        if (isPagerLine(line)) {
          return (
            <div key={lineIdx} className="my-0.5 text-amber-300 font-bold tracking-wider select-none font-mono">
              <span>{line.trim()}</span>
            </div>
          );
        }

        // Comment lines (! or #)
        if (/^\s*[!#]/.test(line)) {
          return (
            <div key={lineIdx} className="text-slate-500 italic">
              {line}
            </div>
          );
        }

        // Table & Box Borders (====, ----, ┌───, etc.)
        if (/^[=\-─┌└├│┼┐┘┤┬┴]{4,}$/.test(line.trim())) {
          return (
            <div key={lineIdx} className="text-slate-600 select-none">
              {line}
            </div>
          );
        }

        // Syslog Notice line (*Mar 1 ... %LINK-3-UPDOWN: ...)
        const syslogMatch = line.match(/^(\*[A-Za-z]{3}\s+\d+\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?:)\s+(%[A-Z0-9_\-]+:\s*)(.*)$/);
        if (syslogMatch) {
          const [, timeStr, facility, rest] = syslogMatch;
          const isErrorFacility = /-(?:[1-3])-[A-Z0-9_]+/i.test(facility);
          return (
            <div key={lineIdx}>
              <span className="text-amber-400/80 font-medium">{timeStr} </span>
              <span className={isErrorFacility ? 'text-rose-400 font-bold' : 'text-cyan-400 font-semibold'}>{facility}</span>
              {renderTokenizedLine(rest, lineIdx)}
            </div>
          );
        }

        // CLI Prompt line (e.g. yoga@yoga-cvsensor:~$ ip a or CISCO-CORE-SW-01# show ip bgp or PHR-Site2#)
        const promptMatch = line.match(/^([a-zA-Z0-9_\-\.]+@[a-zA-Z0-9_\-\.]+:~?[\$#]|\[[a-zA-Z0-9_\-\.]+@[a-zA-Z0-9_\-\.]+\s*[^\]]*\]\s*[\/>\$#]|<[a-zA-Z0-9_\-\.]+>|\[[a-zA-Z0-9_\-\.]+\]|[a-zA-Z0-9_\-\.]+(?:\([a-zA-Z0-9_\-]+\))?\s*[>#])\s*(.*)$/);
        if (promptMatch) {
          const [, promptPart, cmdPart] = promptMatch;
          return (
            <div key={lineIdx}>
              <span className="text-emerald-400 font-bold">{promptPart} </span>
              <span className="text-white font-medium">{cmdPart}</span>
            </div>
          );
        }

        return (
          <div key={lineIdx}>
            {renderTokenizedLine(line, lineIdx) || line}
          </div>
        );
      })}
    </pre>
  );
});

interface TerminalScreenProps {
  activeDevice?: DeviceProfile | null;
  openDevices: DeviceProfile[];
  allDevices: DeviceProfile[];
  onSelectTab: (deviceId: string) => void;
  onCloseTab: (deviceId: string) => void;
  onOpenTab: (deviceId: string) => void;
  onOpenAddModal: () => void;
  onInspectTerminal: (
    terminalText: string,
    options?: {
      isAnomalyOrError?: boolean;
      anomalyTitle?: string;
      anomalySnippet?: string;
      rawErrorLine?: string;
      suggestedAction?: string;
      anomalyType?: string;
      recommendedCommands?: { cmd: string; purpose: string }[];
    }
  ) => void;
  onTerminalLogChange?: (log: string) => void;
  onUpdateDeviceStatus: (deviceId: string, status: 'connected' | 'disconnected' | 'connecting') => void;
  onUpdateDeviceHostname?: (deviceId: string, hostname: string) => void;
  onUpdateDevice?: (device: DeviceProfile) => void;
  onOpenIrxonAt?: () => void;
  externalCommandTrigger?: { 
    command: string; 
    id: number;
    inspectAfter?: boolean;
    autoShowAll?: boolean;
    onCompleted?: (result: { command: string; output: string; fullLog: string }) => void;
  } | null;
  onCommandExecutionComplete?: (command: string, output: string, fullLog: string) => void;
  isAiPanelOpen?: boolean;
  onToggleAiPanel?: () => void;
  hideTabsInHeader?: boolean;
  splitMode?: 'none' | 'horizontal' | 'vertical';
  onSplitModeChange?: (mode: 'none' | 'horizontal' | 'vertical') => void;
  secondaryDeviceId?: string;
  onSelectSecondaryDevice?: (deviceId: string) => void;
  onCompareWithAi?: (prompt: string) => void;
}

export function sanitizeTerminalLog(log: string): string {
  if (!log) return '';
  // 1. Strip all ANSI escape sequences (CSI, OSC, DEC private modes, color codes, cursor movements)
  let text = log
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '')
    .replace(/\x1b[=>NOM]/g, '')
    .replace(/\x1b/g, '')
    .replace(/\[\??\d+(?:;\d+)*[a-zA-Z]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n\r/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 2. Remove excess consecutive empty lines down to maximum 1
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

// Pager line regex that matches Cisco, Huawei, Juniper, Fortinet, MikroTik, Linux and generic --More-- lines
export const PAGER_LINE_REGEX = /(?:^|\n)\s*(?:--(?:More|more)(?:\s*(?:\(\d+%\)|\d+%\s*))?--(?:\s*\([^)]+\))?|----?\s*More\s*----?|---\s*\(more(?:\s*\d+%)?\)\s*---|---\s*more\s*---|\[(?:Q to quit|Space for next page|Key: \[Space\]|q to quit)[^\]]*\]|--More--[^\n\r]*)\s*$/i;

export function isPagerLine(line: string): boolean {
  if (!line || !line.trim()) return false;
  return (
    /^\s*--(?:More|more)(?:\s*(?:\(\d+%\)|\d+%\s*))?--(?:\s*\([^)]+\))?\s*$/i.test(line) ||
    /^\s*----?\s*More\s*----?\s*$/i.test(line) ||
    /^\s*---\s*\(more(?:\s*\d+%)?\)\s*---\s*$/i.test(line) ||
    /^\s*---\s*more\s*---\s*$/i.test(line) ||
    /^\s*\[(?:Q to quit|Space for next page|Key: \[Space\]|q to quit)/i.test(line)
  );
}

export function detectTerminalPager(rawLog: string): { isPager: boolean; pagerLabel: string } {
  if (!rawLog || !rawLog.trim()) return { isPager: false, pagerLabel: '' };
  const sanitized = sanitizeTerminalLog(rawLog).trimEnd();
  const tail = sanitized.slice(-300);

  // 1. Cisco IOS / IOS-XE / NX-OS / HP: --More-- or --More (28%)-- or --More-- (Key: [Space] Page, [Enter] Line, [q] Quit)
  const ciscoMatch = tail.match(/(?:^|\n|\r)\s*(--(?:More|more)(?:\s*(?:\(\d+%\)|\d+%\s*))?--(?:\s*\([^)]+\))?)\s*$/i);
  if (ciscoMatch) {
    return { isPager: true, pagerLabel: ciscoMatch[1].trim() };
  }

  // 2. Huawei / H3C: ---- More ----
  const huaweiMatch = tail.match(/(?:^|\n|\r)\s*(----?\s*More\s*----?)\s*$/i);
  if (huaweiMatch) {
    return { isPager: true, pagerLabel: huaweiMatch[1].trim() };
  }

  // 3. Juniper Junos: ---(more)--- or ---(more 42%)---
  const junosMatch = tail.match(/(?:^|\n|\r)\s*(---\s*\(more(?:\s*\d+%)?\)\s*---)\s*$/i);
  if (junosMatch) {
    return { isPager: true, pagerLabel: junosMatch[1].trim() };
  }

  // 4. Fortinet FortiOS: --- more ---
  const fortiMatch = tail.match(/(?:^|\n|\r)\s*(---\s*more\s*---)\s*$/i);
  if (fortiMatch) {
    return { isPager: true, pagerLabel: fortiMatch[1].trim() };
  }

  // 5. MikroTik RouterOS / Generic: [Q to quit, Space for next page]
  const mikrotikMatch = tail.match(/(?:^|\n|\r)\s*(\[(?:Q to quit|Space for next page|q to quit)[^\]]*\])\s*$/i);
  if (mikrotikMatch) {
    return { isPager: true, pagerLabel: mikrotikMatch[1].trim() };
  }

  // 6. Generic Linux less/more: --More--
  const genericMatch = tail.match(/(?:^|\n|\r)\s*(--(?:More|more)[^\n\r]*--)\s*$/i);
  if (genericMatch) {
    return { isPager: true, pagerLabel: genericMatch[1].trim() };
  }

  return { isPager: false, pagerLabel: '' };
}

export function splitLogAndTrailingPrompt(
  rawLog: string, 
  expectedPrompt: string
): { 
  logHistory: string; 
  activePrompt: string; 
  isPagerActive: boolean; 
  pagerLabel: string;
} {
  const cleanExpected = (expectedPrompt || '').trim();
  const fallbackPrompt = cleanExpected ? (cleanExpected.endsWith(' ') ? cleanExpected : `${cleanExpected} `) : 'terminal:~$ ';

  if (!rawLog || !rawLog.trim()) {
    return { logHistory: '', activePrompt: fallbackPrompt, isPagerActive: false, pagerLabel: '' };
  }

  const sanitized = sanitizeTerminalLog(rawLog);

  // Check if output stream is currently paused at a Pager prompt (--More--, etc.)
  const pagerInfo = detectTerminalPager(sanitized);
  if (pagerInfo.isPager) {
    return {
      logHistory: sanitized.replace(/\n+$/, ''),
      activePrompt: '',
      isPagerActive: true,
      pagerLabel: pagerInfo.pagerLabel,
    };
  }

  // Filter out status bracket noise like [OK], [DONE], [PASS], [SUCCESS], [FAILED], [ERROR], [INFO], [WARN], [CRITICAL]
  const statusCodes = new Set(['ok', 'done', 'pass', 'success', 'failed', 'error', 'info', 'warn', 'warning', 'critical', 'fail', 'debug', 'trace']);

  // Match trailing prompt at the end of sanitized log
  // Handles Cisco (#, >), MikroTik ([admin@MikroTik] >), Linux (user@host:~$ or root@host:~#), Huawei (<Huawei>),
  // as well as interactive device prompts (e.g. [confirm], [yes/no], Password:, [sudo: authenticate] Password:, Destination filename:, etc.)
  const trailingPromptRegex = /(?:^|\n)([^\n\r]*\[(?:confirm|yes\/no|y\/n|Y\/n|y\/N|yes\/no\/quit)\]:?\s*|[^\n\r]*\((?:yes\/no|y\/n|Y\/n|y\/N)\):?\s*|[^\n\r]*(?:[Pp]assword|[Uu]sername|[Ll]ogin|[Pp]asscode|[Vv]erification code|[Dd]estination filename|[Ee]nter PIN|[Pp]ress RETURN to get started|[Pp]ress Enter to continue)[^\n\r]*[:\?]\s*|[^\n\r]+\?\s*\[[a-zA-Z0-9_\-\/]+\]:?\s*|[a-zA-Z0-9_\-\.]+@[a-zA-Z0-9_\-\.]+:~?[\$#]\s*|\[[a-zA-Z0-9_\-\.]+@[a-zA-Z0-9_\-\.]+\s*[^\]]*\]\s*[\/>\$#]\s*|<[a-zA-Z0-9_\-\.]+>\s*|\[(?:Huawei|H3C|RouterOS|admin|root)[a-zA-Z0-9_\-\./]*\]\s*|rommon\s*\d+\s*>\s*|[a-zA-Z0-9_\-\.]+(?:\([a-zA-Z0-9_\-]+\))?\s*[>#]\s*)[\s]*$/;

  const match = sanitized.match(trailingPromptRegex);
  if (match && match[1]) {
    const matchedPrompt = match[1];
    const cleaned = matchedPrompt.trim();
    const cleanLower = cleaned.toLowerCase().replace(/^[\[<]+|[\]>#:\s]+$/g, '');

    // Ensure status brackets like [OK] or OK# are not treated as genuine prompts
    if (!statusCodes.has(cleanLower) && cleaned !== 'OK#' && cleaned !== 'OK>' && !/^\[\s*(ok|pass|done|fail|success)\s*\]$/i.test(cleaned)) {
      const lastIndex = sanitized.lastIndexOf(matchedPrompt);
      if (lastIndex >= 0) {
        const logHistory = sanitized.slice(0, lastIndex).replace(/\n+$/, '');
        return {
          logHistory,
          activePrompt: `${cleaned} `,
          isPagerActive: false,
          pagerLabel: '',
        };
      }
    }
  }

  // 3. Generic hardware fallback: if the last line has no newline and ends with typical prompt chars
  const lastLineMatch = sanitized.match(/(?:^|\n)([^\n]{1,60})$/);
  if (lastLineMatch) {
    const lastLine = lastLineMatch[1];
    if (lastLine.match(/[>#\$%\]:\?]\s*$/)) {
      const lastIndex = sanitized.lastIndexOf(lastLine);
      const logHistory = sanitized.slice(0, lastIndex).replace(/\n+$/, '');
      return {
        logHistory,
        activePrompt: lastLine,
        isPagerActive: false,
        pagerLabel: '',
      };
    }
  }

  // Also check if sanitized ends with expectedPrompt
  if (cleanExpected && sanitized.endsWith(cleanExpected)) {
    const idx = sanitized.lastIndexOf(cleanExpected);
    if (idx >= 0) {
      const logHistory = sanitized.slice(0, idx).replace(/\n+$/, '');
      return {
        logHistory,
        activePrompt: fallbackPrompt,
        isPagerActive: false,
        pagerLabel: '',
      };
    }
  }

  return {
    logHistory: sanitized.replace(/\n+$/, ''),
    activePrompt: fallbackPrompt,
    isPagerActive: false,
    pagerLabel: '',
  };
}

/**
 * Detects whether the current active CLI prompt or tail log segment is requesting a password,
 * passcode, passphrase, PIN, or secret key.
 */
export function isTerminalPasswordPrompt(prompt: string, tailLog = ''): boolean {
  const cleanPrompt = (prompt || '').trim();
  // Check if prompt itself requests password/secret/PIN
  // Matches: "Password:", "password:", "Password for admin:", "[sudo] password for user:", "secret:", "PIN:", "Enter PIN:", "Kata sandi:", "Passphrase:", etc.
  const promptRegex = /(?:password|passcode|passphrase|secret|pin|kata\s*sandi)\b.*[:\?>\s]*$/i;
  if (promptRegex.test(cleanPrompt)) {
    return true;
  }

  // Also check if the trailing log segment indicates a password prompt
  if (tailLog) {
    const lastChunk = tailLog.trim().slice(-120);
    if (/(?:password|passphrase|passcode|secret|enter\s*pin|kata\s*sandi)[\s\w@\.\-_\[\]]*[:\?>]\s*$/i.test(lastChunk)) {
      return true;
    }
  }

  return false;
}

export function buildNextTerminalLog(
  currentDisplayLog: string,
  currentPrompt: string,
  command: string,
  output?: string,
  nextPrompt?: string | null,
  isPassword = false
): string {
  const cleanPrompt = (currentPrompt || '').trim();
  const cleanCmd = (command || '').trim();
  const cleanNextPrompt = nextPrompt === null ? null : (nextPrompt || currentPrompt || '').trim();

  const lines: string[] = [];

  if (currentDisplayLog && currentDisplayLog.trim()) {
    lines.push(currentDisplayLog.trimEnd());
  }

  // Add the executed line:
  // For password prompts, never echo the password in plain text (standard Unix / Cisco terminal security)
  if (isPassword) {
    lines.push(cleanPrompt);
  } else if (cleanCmd) {
    lines.push(`${cleanPrompt} ${cleanCmd}`);
  } else {
    lines.push(cleanPrompt);
  }

  // Add command output if present
  if (output && output.trim()) {
    lines.push(output.trim());
  }

  // Add the next active prompt line so it gets picked up as the new activePrompt by splitLogAndTrailingPrompt
  if (cleanNextPrompt !== null) {
    lines.push(cleanNextPrompt);
  }

  return sanitizeTerminalLog(lines.join('\n'));
}

export const TerminalScreen: React.FC<TerminalScreenProps> = ({
  activeDevice,
  openDevices,
  allDevices,
  onSelectTab,
  onCloseTab,
  onOpenTab,
  onOpenAddModal,
  onInspectTerminal,
  onTerminalLogChange,
  onUpdateDeviceStatus,
  onUpdateDeviceHostname,
  onUpdateDevice,
  onOpenIrxonAt,
  externalCommandTrigger,
  onCommandExecutionComplete,
  isAiPanelOpen,
  onToggleAiPanel,
  hideTabsInHeader = false,
  splitMode = 'none',
  onSplitModeChange,
  secondaryDeviceId,
  onSelectSecondaryDevice,
  onCompareWithAi,
}) => {
  // Determine secondary device when in split mode
  const secondaryDevice = 
    allDevices.find((d) => d.id === secondaryDeviceId) ||
    openDevices.find((d) => d.id !== activeDevice?.id) ||
    allDevices.find((d) => d.id !== activeDevice?.id) ||
    null;

  const [isLiveDiffModalOpen, setIsLiveDiffModalOpen] = useState<boolean>(false);
  const [isConnectionInfoOpen, setIsConnectionInfoOpen] = useState<boolean>(false);
  const [broadcastInput, setBroadcastInput] = useState<string>('');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);

  // Independent terminal logs mapped by device ID with localStorage persistence
  const [logsByDevice, setLogsByDevice] = useState<Record<string, string>>(() => {
    try {
      const saved = safeStorage.getItem('69ai_terminal_logs_v5');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // fallback
    }
    return {};
  });

  const [currentInputs, setCurrentInputs] = useState<Record<string, string>>({});
  const [modesByDevice, setModesByDevice] = useState<Record<string, string>>({});
  const [hostnamesByDevice, setHostnamesByDevice] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {};
    (allDevices || []).forEach((d) => {
      if (d.hostname) {
        initialMap[d.id] = d.hostname;
      } else {
        const resolved = resolveDeviceRealHostname(d);
        if (resolved && resolved !== 'Terminal' && resolved !== 'terminal') {
          initialMap[d.id] = resolved;
        }
      }
    });
    try {
      const savedLogs = safeStorage.getItem('69ai_terminal_logs_v5');
      const parsedLogs = savedLogs ? JSON.parse(savedLogs) : {};
      Object.entries(parsedLogs).forEach(([devId, log]) => {
        if (typeof log === 'string' && log.trim()) {
          const extracted = extractHostnameFromOutput(log);
          if (extracted) initialMap[devId] = extracted;
        }
      });
    } catch (e) {}
    return initialMap;
  });
  const [commandHistories, setCommandHistories] = useState<Record<string, string[]>>(() => {
    try {
      const saved = safeStorage.getItem('69ai_cmd_history_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // fallback
    }
    return {
      default: ['show cellular 0/4/0 gps', 'show ntp status', 'show ip bgp summary', 'configure terminal', 'ip a'],
    };
  });
  const [historyIndexes, setHistoryIndexes] = useState<Record<string, number>>({});
  
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showAndroidModal, setShowAndroidModal] = useState<boolean>(false);
  const [showNewTabMenu, setShowNewTabMenu] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [terminalFontSize, setTerminalFontSize] = useState<number>(() => {
    try {
      const saved = safeStorage.getItem('69ai_terminal_font_size');
      if (saved) return Number(saved);
    } catch (e) {}
    // Auto-detect mobile vs desktop default
    return typeof window !== 'undefined' && window.innerWidth < 640 ? 11.5 : 13;
  });

  const handleZoomIn = () => {
    setTerminalFontSize((prev) => {
      const next = Math.min(prev + 1, 24);
      try { safeStorage.setItem('69ai_terminal_font_size', String(next)); } catch (e) {}
      return next;
    });
  };

  const handleZoomOut = () => {
    setTerminalFontSize((prev) => {
      const next = Math.max(prev - 1, 9);
      try { safeStorage.setItem('69ai_terminal_font_size', String(next)); } catch (e) {}
      return next;
    });
  };

  const handleResetZoom = () => {
    const def = typeof window !== 'undefined' && window.innerWidth < 640 ? 11.5 : 13;
    setTerminalFontSize(def);
    try { safeStorage.setItem('69ai_terminal_font_size', String(def)); } catch (e) {}
  };

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabMenuRef = useRef<HTMLDivElement>(null);
  const lastExecTimeByDeviceRef = useRef<Record<string, number>>({});
  const isExecutingByDeviceRef = useRef<Record<string, boolean>>({});
  const webSshEventSourcesRef = useRef<Map<string, EventSource>>(new Map());

  // Cleanup active Web SSH SSE streams on component unmount
  useEffect(() => {
    return () => {
      webSshEventSourcesRef.current.forEach((es, devId) => {
        try { es.close(); } catch (_) {}
        fetch(`/api/ssh/session/${encodeURIComponent(devId)}/close`, { method: 'POST' }).catch(() => {});
      });
      webSshEventSourcesRef.current.clear();
    };
  }, []);

  const currentDeviceId = activeDevice?.id || '';
  const currentLog = (activeDevice && logsByDevice[currentDeviceId]) !== undefined
    ? logsByDevice[currentDeviceId]
    : '';

  const currentInput = (activeDevice && currentInputs[currentDeviceId]) || '';
  const currentHistory = (activeDevice && commandHistories[currentDeviceId]) || commandHistories.default || [];
  const currentHistoryIndex = (activeDevice && historyIndexes[currentDeviceId]) ?? -1;

  const [virtualPagerBuffers, setVirtualPagerBuffers] = useState<Record<string, {
    pendingLines: string[];
    nextPrompt: string;
    pageSize: number;
  }>>({});

  // Real-time Error & Anomaly Detection State
  const [activeAnomaly, setActiveAnomaly] = useState<DetectedTerminalAnomaly | null>(null);
  const [autoInspectErrors, setAutoInspectErrors] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('69ai_auto_inspect_errors');
      // Default to false: Never auto-send terminal text to online AI in the background!
      // Output is only sent when user clicks "Exec & Analisa" or AI performs automated execution.
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [dismissedAnomalySnippet, setDismissedAnomalySnippet] = useState<string>('');
  const lastInspectedAnomalyRef = useRef<string>('');
  const autoInspectTimerRef = useRef<any>(null);

  // Auto-Show All Output during automated executions (automatically bypasses --More-- pager for seamless AI analysis)
  const [autoShowAllOnExec, setAutoShowAllOnExec] = useState<boolean>(() => {
    try {
      const saved = safeStorage.getItem('69ai_auto_show_all_exec');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const isAutoExecRunningRef = useRef<boolean>(false);
  const logsByDeviceRef = useRef<Record<string, string>>(logsByDevice);
  const hostnamesByDeviceRef = useRef<Record<string, string>>(hostnamesByDevice);

  useEffect(() => {
    logsByDeviceRef.current = logsByDevice;
  }, [logsByDevice]);

  useEffect(() => {
    hostnamesByDeviceRef.current = hostnamesByDevice;
  }, [hostnamesByDevice]);

  const toggleAutoShowAllOnExec = () => {
    const next = !autoShowAllOnExec;
    setAutoShowAllOnExec(next);
    try {
      safeStorage.setItem('69ai_auto_show_all_exec', String(next));
    } catch {}
  };

  const toggleAutoInspect = () => {
    const next = !autoInspectErrors;
    setAutoInspectErrors(next);
    try {
      safeStorage.setItem('69ai_auto_inspect_errors', String(next));
    } catch {}
  };

  // Real-time error scanner on active terminal output
  useEffect(() => {
    if (!currentLog) {
      setActiveAnomaly(null);
      return;
    }

    const anomaly = detectTerminalAnomalies(currentLog);
    if (!anomaly) {
      setActiveAnomaly(null);
      return;
    }

    // Ignore if dismissed by user
    if (anomaly.rawErrorLine === dismissedAnomalySnippet) {
      return;
    }

    setActiveAnomaly(anomaly);

    // Auto-inspect if enabled
    if (autoInspectErrors) {
      if (lastInspectedAnomalyRef.current === anomaly.rawErrorLine) {
        return;
      }
      if (autoInspectTimerRef.current) {
        clearTimeout(autoInspectTimerRef.current);
      }
      autoInspectTimerRef.current = setTimeout(() => {
        lastInspectedAnomalyRef.current = anomaly.rawErrorLine;
        onInspectTerminal(currentLog, {
          isAnomalyOrError: true,
          anomalyTitle: anomaly.title,
          anomalySnippet: anomaly.fullSnippet,
          rawErrorLine: anomaly.rawErrorLine,
          suggestedAction: anomaly.suggestedAction,
          anomalyType: anomaly.type,
          recommendedCommands: anomaly.recommendedCommands,
        });
      }, 350);
    }
  }, [currentLog, autoInspectErrors, dismissedAnomalySnippet, onInspectTerminal]);

  const handleInspectAnomaly = (anomaly: DetectedTerminalAnomaly) => {
    lastInspectedAnomalyRef.current = anomaly.rawErrorLine;
    onInspectTerminal(currentLog, {
      isAnomalyOrError: true,
      anomalyTitle: anomaly.title,
      anomalySnippet: anomaly.fullSnippet,
      rawErrorLine: anomaly.rawErrorLine,
      suggestedAction: anomaly.suggestedAction,
      anomalyType: anomaly.type,
      recommendedCommands: anomaly.recommendedCommands,
    });
  };

  const currentMode = (activeDevice && modesByDevice[currentDeviceId]) || 'privileged';
  const currentHostname = (activeDevice && (hostnamesByDevice[currentDeviceId] || activeDevice.hostname || resolveDeviceRealHostname(activeDevice))) || '';
  const isVirtual = isVirtualSession(currentDeviceId);
  const expectedPrompt = activeDevice 
    ? getDevicePrompt(activeDevice, currentMode, currentHostname) 
    : 'terminal:~$ ';

  const { 
    logHistory: displayLog, 
    activePrompt: effectivePrompt,
    isPagerActive,
    pagerLabel
  } = splitLogAndTrailingPrompt(currentLog, expectedPrompt);
  const currentPrompt = effectivePrompt !== '' ? effectivePrompt : expectedPrompt;

  // Password / Secret Input Masking State & Detection
  const [manualPasswordMask, setManualPasswordMask] = useState(false);
  const [showPasswordPlainText, setShowPasswordPlainText] = useState(false);

  // Configuration Snapshot & Diff State
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotModalInitialSide, setSnapshotModalInitialSide] = useState<'diff' | 'list'>('diff');
  const [snapshotToastMessage, setSnapshotToastMessage] = useState<string | null>(null);
  const initialConnectionSnapshotTakenRef = useRef<Record<string, boolean>>({});
  const [snapshotCount, setSnapshotCount] = useState<number>(() => {
    if (!currentDeviceId) return 0;
    return getDeviceSnapshots(currentDeviceId).length;
  });
  const lastScannedConfigLogLengthRef = useRef<number>(0);
  const lastAutoSnapshotHashRef = useRef<string>('');

  // Auto-hide toast notification
  useEffect(() => {
    if (!snapshotToastMessage) return;
    const t = setTimeout(() => setSnapshotToastMessage(null), 3800);
    return () => clearTimeout(t);
  }, [snapshotToastMessage]);

  // Trigger 1: Tombol Snapshot Manual (Eksekusi show run real di balik layar)
  const handleTakeSnapshotManual = useCallback(async () => {
    if (!activeDevice) return;
    const devHostname = hostnamesByDevice[activeDevice.id] || '';
    const cmd = getRunningConfigCommandForBrand(activeDevice.brand);
    setSnapshotToastMessage(`⏳ Menjalankan '${cmd}' di balik layar...`);
    try {
      const res = await captureRunningConfigViaBackgroundExec(activeDevice, devHostname);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newSnap = createSnapshotFromConfig(
        activeDevice.id,
        activeDevice.name,
        activeDevice.brand,
        res.config,
        'manual',
        `Snapshot Manual (${timeStr})`,
        res.commandUsed
      );
      const updated = saveDeviceSnapshot(newSnap);
      setSnapshotCount(updated.length);
      setSnapshotToastMessage(`✓ Snapshot manual berhasil disimpan (${newSnap.lineCount} baris via real '${res.commandUsed}' di balik layar)`);
    } catch (e: any) {
      console.warn('handleTakeSnapshotManual error:', e);
      setSnapshotToastMessage(`✕ Gagal mengambil snapshot: ${e?.message || e}`);
    }
  }, [activeDevice, hostnamesByDevice]);

  // Helper to trigger automatic snapshot upon save configuration or baseline via real background show run
  const triggerAutoConfigSnapshot = useCallback(async (
    triggerCmd: string,
    type: 'post_change' | 'pre_change' | 'auto_show_run' = 'post_change',
    customLabel?: string
  ) => {
    if (!activeDevice) return;
    try {
      const devHostname = hostnamesByDevice[activeDevice.id] || activeDevice.hostname || '';
      const res = await captureRunningConfigViaBackgroundExec(activeDevice, devHostname);
      if (res.config && res.config.trim()) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const label = customLabel || (type === 'post_change' ? `Simpan Konfigurasi (${triggerCmd.trim()}) - ${timeStr}` : undefined);
        const snap = createSnapshotFromConfig(
          activeDevice.id,
          activeDevice.name,
          activeDevice.brand,
          res.config,
          type,
          label,
          res.commandUsed || triggerCmd.trim()
        );
        const updated = saveDeviceSnapshot(snap);
        setSnapshotCount(updated.length);
        if (type === 'post_change') {
          setSnapshotToastMessage(`✓ Snapshot otomatis disimpan (${snap.lineCount} baris) via real '${res.commandUsed}' di balik layar`);
        }
      }
    } catch (e) {
      console.warn('triggerAutoConfigSnapshot error:', e);
    }
  }, [activeDevice, hostnamesByDevice]);

  // Trigger 2: Saat pertama perangkat konek (Baseline Snapshot Otomatis via real background show run)
  useEffect(() => {
    if (!activeDevice) return;
    const isConnected = activeDevice.status === 'connected';
    if (!isConnected) return;

    if (initialConnectionSnapshotTakenRef.current[activeDevice.id]) return;

    // Check existing snapshots: if none exists for this device, take initial baseline snapshot
    const existing = getDeviceSnapshots(activeDevice.id);
    if (existing.length === 0) {
      initialConnectionSnapshotTakenRef.current[activeDevice.id] = true;
      const devHostname = hostnamesByDevice[activeDevice.id] || '';
      captureRunningConfigViaBackgroundExec(activeDevice, devHostname).then((res) => {
        if (res.config && res.config.trim()) {
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const baselineSnap = createSnapshotFromConfig(
            activeDevice.id,
            activeDevice.name,
            activeDevice.brand,
            res.config,
            'pre_change',
            `Baseline Awal (Koneksi Pertama) - ${timeStr}`,
            res.commandUsed
          );
          const updated = saveDeviceSnapshot(baselineSnap);
          setSnapshotCount(updated.length);
          setSnapshotToastMessage(`✓ Baseline awal otomatis disimpan via real '${res.commandUsed}' di balik layar (${baselineSnap.lineCount} baris)`);
        }
      }).catch((e) => {
        console.warn('Initial connection baseline capture error:', e);
      });
    } else {
      initialConnectionSnapshotTakenRef.current[activeDevice.id] = true;
    }
  }, [activeDevice, hostnamesByDevice]);

  // Update snapshot count when active device changes or snapshots event fires
  useEffect(() => {
    if (!currentDeviceId) {
      setSnapshotCount(0);
      return;
    }
    setSnapshotCount(getDeviceSnapshots(currentDeviceId).length);

    const handleSnapUpdate = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (!customEvt.detail?.deviceId || customEvt.detail.deviceId === currentDeviceId) {
        setSnapshotCount(getDeviceSnapshots(currentDeviceId).length);
      }
    };

    const handleOpenDiffEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.deviceId && customEvt.detail.deviceId !== currentDeviceId) {
        onSelectTab(customEvt.detail.deviceId);
      }
      setSnapshotModalInitialSide('diff');
      setIsSnapshotModalOpen(true);
    };

    window.addEventListener('69ai_snapshots_updated', handleSnapUpdate);
    window.addEventListener('69ai_open_snapshot_diff', handleOpenDiffEvent);
    return () => {
      window.removeEventListener('69ai_snapshots_updated', handleSnapUpdate);
      window.removeEventListener('69ai_open_snapshot_diff', handleOpenDiffEvent);
    };
  }, [currentDeviceId, onSelectTab]);

  const isAutoPasswordPrompt = isTerminalPasswordPrompt(effectivePrompt, currentLog);
  const isPasswordInput = isAutoPasswordPrompt || manualPasswordMask;
  const isMaskedPassword = isPasswordInput && !showPasswordPlainText;

  // Reset plain-text visibility whenever password prompt finishes or changes
  useEffect(() => {
    if (!isAutoPasswordPrompt) {
      setShowPasswordPlainText(false);
    }
  }, [isAutoPasswordPrompt]);

  // Synchronize hostnames whenever allDevices prop updates
  useEffect(() => {
    setHostnamesByDevice((prev) => {
      let changed = false;
      const next = { ...prev };
      (allDevices || []).forEach((dev) => {
        if (dev.hostname && next[dev.id] !== dev.hostname) {
          next[dev.id] = dev.hostname;
          changed = true;
        } else if (!next[dev.id]) {
          const resolved = resolveDeviceRealHostname(dev);
          if (resolved && resolved !== 'Terminal' && resolved !== 'terminal') {
            next[dev.id] = resolved;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [allDevices]);

  // Debounced save logs and command history to local storage (prevents UI freeze during heavy streams)
  const saveLogsTimeoutRef = useRef<any>(null);
  const pendingHardwareExecRef = useRef<{
    deviceId: string;
    command: string;
    startLogLength: number;
    timer?: any;
    options?: { inspectAfter?: boolean; onCompleted?: (result: { command: string; output: string; fullLog: string }) => void; autoShowAll?: boolean };
  } | null>(null);
  const pendingSudoAuthCmdRef = useRef<{
    deviceId: string;
    command: string;
  } | null>(null);
  useEffect(() => {
    if (saveLogsTimeoutRef.current) clearTimeout(saveLogsTimeoutRef.current);
    saveLogsTimeoutRef.current = setTimeout(() => {
      try {
        const trimmedLogs: Record<string, string> = {};
        Object.entries(logsByDevice).forEach(([k, v]) => {
          trimmedLogs[k] = typeof v === 'string' && v.length > 150000 ? v.slice(-150000) : v;
        });
        safeStorage.setItem('69ai_terminal_logs_v5', JSON.stringify(trimmedLogs));
      } catch (e) {
        // quota or private mode
      }
    }, 600);

    return () => {
      if (saveLogsTimeoutRef.current) clearTimeout(saveLogsTimeoutRef.current);
    };
  }, [logsByDevice]);

  useEffect(() => {
    try {
      safeStorage.setItem('69ai_cmd_history_v2', JSON.stringify(commandHistories));
    } catch (e) {
      // quota or private mode
    }
  }, [commandHistories]);

  // Auto-connect and initialize connection process if newly opened device has no log yet or is connected
  useEffect(() => {
    if (activeDevice) {
      if (activeDevice.type === 'ssh' || activeDevice.type === 'telnet' || activeDevice.type === 'serial_bluetooth' || activeDevice.type === 'serial_cable') {
        const currentLog = logsByDevice[activeDevice.id];
        const hasLog = Boolean(currentLog);
        const isBtAndNeedsConnect = activeDevice.type === 'serial_bluetooth' && (!hasLog || !currentLog.includes('BLUETOOTH SERIAL CONNECTED'));
        const isCableAndNeedsConnect = activeDevice.type === 'serial_cable' && (!hasLog || !currentLog.includes('SERIAL CABLE CONNECTED'));
        if (!hasLog || (activeDevice.status === 'connected' && !hasLog) || isBtAndNeedsConnect || isCableAndNeedsConnect) {
          handleConnectDevice(activeDevice);
        }
      }
    }
  }, [currentDeviceId]);

  // Synchronize dynamic background incoming serial/bluetooth stream to terminal logs
  useEffect(() => {
    const handleChunkArrivalForAutoExec = (devId: string, chunk: string) => {
      if (pendingHardwareExecRef.current && pendingHardwareExecRef.current.deviceId === devId) {
        if (pendingHardwareExecRef.current.timer) {
          clearTimeout(pendingHardwareExecRef.current.timer);
        }

        const isAuto = Boolean(
          pendingHardwareExecRef.current.options?.inspectAfter ||
          pendingHardwareExecRef.current.options?.autoShowAll ||
          isAutoExecRunningRef.current ||
          autoShowAllOnExec
        );

        // Check if device stream paused at pager (--More--)
        const tailCheck = chunk.slice(-120);
        const isPagerPrompt = PAGER_LINE_REGEX.test(chunk) || detectTerminalPager(tailCheck).isPager;

        if (isPagerPrompt && isAuto) {
          // Hardware paused at pager during automated analysis execution:
          // Immediately send Space to fetch next chunk, keeping stream going
          handlePageNext();
          pendingHardwareExecRef.current.timer = setTimeout(() => {
            if (pendingHardwareExecRef.current && pendingHardwareExecRef.current.deviceId === devId) {
              const latestLog = (window as any).activeTerminalLogs || logsByDeviceRef.current[devId] || logsByDevice[devId] || '';
              const produced = latestLog.slice(pendingHardwareExecRef.current.startLogLength).trim();
              const cmd = pendingHardwareExecRef.current.command;
              const opts = pendingHardwareExecRef.current.options;
              pendingHardwareExecRef.current = null;
              isAutoExecRunningRef.current = false;
              try {
                (window as any).activeTerminalLogs = latestLog;
                (window as any).lastExecutedCommandOutput = {
                  command: cmd,
                  output: produced,
                  timestamp: Date.now(),
                };
                window.dispatchEvent(new CustomEvent('terminal-command-completed', {
                  detail: { command: cmd, output: produced, fullLog: latestLog }
                }));
              } catch (e) {}
              if (onTerminalLogChange) onTerminalLogChange(latestLog);
              if (opts?.onCompleted) opts.onCompleted({ command: cmd, output: produced, fullLog: latestLog });
              if (onCommandExecutionComplete) onCommandExecutionComplete(cmd, produced, latestLog);
            }
          }, 2500);
          return;
        }

        const promptRegex = /[#>$%]\s*$/;
        const delay = promptRegex.test(chunk) ? 200 : 700;
        pendingHardwareExecRef.current.timer = setTimeout(() => {
          if (pendingHardwareExecRef.current && pendingHardwareExecRef.current.deviceId === devId) {
            const latestLog = (window as any).activeTerminalLogs || logsByDeviceRef.current[devId] || logsByDevice[devId] || '';
            const produced = latestLog.slice(pendingHardwareExecRef.current.startLogLength).trim();
            const cmd = pendingHardwareExecRef.current.command;
            const opts = pendingHardwareExecRef.current.options;
            pendingHardwareExecRef.current = null;
            isAutoExecRunningRef.current = false;
            try {
              (window as any).activeTerminalLogs = latestLog;
              (window as any).lastExecutedCommandOutput = {
                command: cmd,
                output: produced,
                timestamp: Date.now(),
              };
              window.dispatchEvent(new CustomEvent('terminal-command-completed', {
                detail: { command: cmd, output: produced, fullLog: latestLog }
              }));
            } catch (e) {}
            if (onTerminalLogChange) onTerminalLogChange(latestLog);
            if (opts?.onCompleted) opts.onCompleted({ command: cmd, output: produced, fullLog: latestLog });
            if (onCommandExecutionComplete) onCommandExecutionComplete(cmd, produced, latestLog);
          }
        }, delay);
      }
    };

    if (currentDeviceId && activeDevice) {
      setSessionDataListener(currentDeviceId, (chunk) => {
        // Live data arriving means active connection is alive
        onUpdateDeviceStatus(currentDeviceId, 'connected');
        setIsConnecting(false);
        handleChunkArrivalForAutoExec(currentDeviceId, chunk);

        const devId = currentDeviceId;
        const prevFull = logsByDeviceRef.current[devId] || '';
        const newFull = sanitizeTerminalLog(prevFull + chunk);
        const tail = newFull.slice(-3500);
        const detectedHost = extractHostnameFromOutput(tail) || extractHostnameFromOutput(chunk);
        if (detectedHost) {
          setHostnamesByDevice((hPrev) => {
            if (hPrev[devId] !== detectedHost) {
              return { ...hPrev, [devId]: detectedHost };
            }
            return hPrev;
          });
          if (onUpdateDeviceHostname) {
            onUpdateDeviceHostname(devId, detectedHost);
          }
        }

        setLogsByDevice((prev) => {
          return {
            ...prev,
            [devId]: sanitizeTerminalLog((prev[devId] || '') + chunk),
          };
        });
      });
    }

    const handleAndroidSshData = (event: any) => {
      const detail = event?.detail;
      if (!detail) return;
      const targetId = typeof detail === 'string' ? currentDeviceId : (detail.deviceId || currentDeviceId);
      const chunk = typeof detail === 'string' ? detail : (detail.text || '');
      if (!chunk || typeof chunk !== 'string') return;
      handleChunkArrivalForAutoExec(targetId, chunk);

      const prevFull = logsByDeviceRef.current[targetId] || '';
      const newFull = sanitizeTerminalLog(prevFull + chunk);
      const tail = newFull.slice(-3500);
      const detectedHost = extractHostnameFromOutput(tail) || extractHostnameFromOutput(chunk);
      if (detectedHost) {
        setHostnamesByDevice((hPrev) => {
          if (hPrev[targetId] !== detectedHost) {
            return { ...hPrev, [targetId]: detectedHost };
          }
          return hPrev;
        });
        if (onUpdateDeviceHostname) {
          onUpdateDeviceHostname(targetId, detectedHost);
        }
      }

      setLogsByDevice((prev) => {
        return {
          ...prev,
          [targetId]: sanitizeTerminalLog((prev[targetId] || '') + chunk),
        };
      });
    };

    const handleAndroidSshClosed = (event: any) => {
      const detail = event?.detail;
      const targetId = detail?.deviceId || currentDeviceId;
      onUpdateDeviceStatus(targetId, 'disconnected');
      setLogsByDevice((prev) => ({
        ...prev,
        [targetId]: sanitizeTerminalLog(`${prev[targetId] || ''}\n[session ended: SSH disconnected]\n`),
      }));
    };

    // Desktop Native Stream Listeners (macOS .dmg / Windows .exe)
    let unhookDesktopSsh: (() => void) | undefined;
    let unhookDesktopSerial: (() => void) | undefined;
    const desktop = (window as any).DesktopNative;
    if (desktop) {
      if (typeof desktop.onSshData === 'function') {
        // DELETED global desktop.onSshData hook from TerminalScreen to prevent cross-contamination.
        // Data routing by deviceId is correctly handled centrally in serialConnection.ts.
      }
      if (typeof desktop.onSerialData === 'function') {
        if (activeDevice?.type === 'serial_cable') {
          // Keep registration so session is kept alive on tab switch, but rely on serialConnection.ts for the global hook.
          // Note: The global listener in serialConnection.ts will invoke the onDataListener
          // that was set by setSessionDataListener below (or during initial connect).
          registerDesktopSerialSession(
            currentDeviceId,
            (activeDevice as any)?.serialPortPath || (activeDevice as any)?.ipOrPortLabel || 'default',
            activeDevice
          );
        }
        // DELETED global desktop.onSerialData hook from TerminalScreen to prevent cross-contamination.
        // Data routing by port path is correctly handled centrally in serialConnection.ts.
      }
    }

    (window as any).onAndroidSshData = (devId: string, text: string) => {
      handleAndroidSshData({ detail: { deviceId: devId, text } });
    };

    window.addEventListener('android-ssh-data' as any, handleAndroidSshData);
    window.addEventListener('android-ssh-closed' as any, handleAndroidSshClosed);
    return () => {
      try {
        delete (window as any).onAndroidSshData;
      } catch (e) {}
      window.removeEventListener('android-ssh-data' as any, handleAndroidSshData);
      window.removeEventListener('android-ssh-closed' as any, handleAndroidSshClosed);
      if (unhookDesktopSsh) unhookDesktopSsh();
      if (unhookDesktopSerial) unhookDesktopSerial();
    };
  }, [currentDeviceId, activeDevice?.id, activeDevice?.type, onUpdateDeviceHostname]);

  // Robust multi-pass scroll to bottom for desktop native macOS, web & mobile
  const scrollToBottom = useCallback((force = false) => {
    try {
      if (containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
      if (terminalEndRef.current && typeof terminalEndRef.current.scrollIntoView === 'function') {
        terminalEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    } catch {}
  }, []);

  // ResizeObserver to automatically re-align scroll when AI Panel opens or window resizes
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    try {
      const observer = new ResizeObserver(() => {
        try {
          scrollToBottom();
        } catch {}
      });
      observer.observe(el);
      return () => {
        try {
          observer.disconnect();
        } catch {}
      };
    } catch {}
  }, [scrollToBottom]);

  // High-performance instant scroll & debounced parent synchronization for smooth 60fps on Desktop & Android APK
  const logSyncTimeoutRef = useRef<any>(null);
  const syncedHostnamesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // Immediate scroll on log update
    scrollToBottom();
    const frameId = requestAnimationFrame(() => {
      scrollToBottom();
    });

    if (logSyncTimeoutRef.current) clearTimeout(logSyncTimeoutRef.current);
    logSyncTimeoutRef.current = setTimeout(() => {
      // Continuously sync active terminal buffer to parent for AI assistant
      if (onTerminalLogChange) {
        onTerminalLogChange(currentLog || '');
      }
      // Auto-detect dynamic genuine hostname from terminal buffer of active device
      if (currentDeviceId && currentLog) {
        const tail = currentLog.slice(-3500);
        const detected = extractHostnameFromOutput(tail) || extractHostnameFromOutput(currentLog);
        const currentStoredHostname = hostnamesByDeviceRef.current[currentDeviceId];
        if (detected && detected !== currentStoredHostname) {
          hostnamesByDeviceRef.current[currentDeviceId] = detected;
          setHostnamesByDevice((prev) => (prev[currentDeviceId] !== detected ? { ...prev, [currentDeviceId]: detected } : prev));
          if (onUpdateDeviceHostname && syncedHostnamesRef.current[currentDeviceId] !== detected) {
            syncedHostnamesRef.current[currentDeviceId] = detected;
            onUpdateDeviceHostname(currentDeviceId, detected);
          }
        }
      }
    }, 200);

    return () => {
      cancelAnimationFrame(frameId);
      if (logSyncTimeoutRef.current) clearTimeout(logSyncTimeoutRef.current);
    };
  }, [currentLog, currentDeviceId, onTerminalLogChange, onUpdateDeviceHostname, scrollToBottom]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tabMenuRef.current && !tabMenuRef.current.contains(event.target as Node)) {
        setShowNewTabMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle external execution commands triggered from AI Assistant panel
  useEffect(() => {
    if (externalCommandTrigger && externalCommandTrigger.command && activeDevice) {
      isAutoExecRunningRef.current = true;
      // If previous command left pager active in virtual buffer, flush it immediately
      if (virtualPagerBuffers[currentDeviceId]) {
        handlePageAll();
      }
      handleExecuteCommand(externalCommandTrigger.command, {
        inspectAfter: externalCommandTrigger.inspectAfter,
        autoShowAll: true,
        onCompleted: (res) => {
          isAutoExecRunningRef.current = false;
          if (externalCommandTrigger.onCompleted) {
            externalCommandTrigger.onCompleted(res);
          }
        },
      });
    }
  }, [externalCommandTrigger]);

  // Automatically bypass and show all output if pager pops up during automated exec
  useEffect(() => {
    if (isPagerActive && isAutoExecRunningRef.current) {
      handlePageAll();
    }
  }, [isPagerActive]);

  const handleTerminalBodyClick = () => {
    inputRef.current?.focus();
  };

  const handleConnectDevice = async (deviceToConnect: DeviceProfile) => {
    if (!deviceToConnect) return;
    const devId = deviceToConnect.id;
    const devMode = modesByDevice[devId] || 'privileged';
    const devHostname = hostnamesByDevice[devId] || '';
    const prompt = getDevicePrompt(deviceToConnect, devMode, devHostname);
    setIsConnecting(true);

    // Preserve existing terminal logs across reconnects (terminal is only cleared when manually cleared)
    if (deviceToConnect.type === 'ssh' || deviceToConnect.type === 'telnet') {
      onUpdateDeviceStatus(devId, 'connecting');

      let targetHostStr = (deviceToConnect.host || '').trim();
      let targetPortNum = Number(deviceToConnect.port) || 22;

      if (!targetHostStr && deviceToConnect.ipOrPortLabel) {
        targetHostStr = deviceToConnect.ipOrPortLabel.trim();
      }

      if (targetHostStr.includes(':') && !targetHostStr.startsWith('http://') && !targetHostStr.startsWith('https://') && !targetHostStr.startsWith('[')) {
        const parts = targetHostStr.split(':');
        targetHostStr = parts[0].trim();
        const parsedPort = Number(parts[1]);
        if (!isNaN(parsedPort) && parsedPort >= 1 && parsedPort <= 65535) {
          targetPortNum = parsedPort;
        }
      }
      if (!targetHostStr) {
        targetHostStr = '127.0.0.1';
      }

      const targetUser = deviceToConnect.username || 'admin';

      const headerLog = `======================================================================
69 AI SSH Terminal Client (OpenSSH 2.0 Protocol / RFC 4253)
Target Host : ${targetHostStr}
Port        : ${targetPortNum}
User        : ${targetUser}
Waktu       : ${new Date().toLocaleString()}
======================================================================\n`;

      // 1. Android Native Direct PTY Handshake
      const android = (window as any).AndroidNative;
      if (android && typeof android.connectSsh === 'function') {
        setLogsByDevice((prev) => ({
          ...prev,
          [devId]: `${prev[devId] ? prev[devId] + '\n' : ''}${headerLog}[*] Membuka socket TCP & negosiasi enkripsi SSH ke ${targetHostStr}:${targetPortNum} (Android Native)...\n[*] Melakukan autentikasi untuk user '${targetUser}'...\n`,
        }));

        try {
          const rawRes = android.connectSsh(devId, targetHostStr, targetPortNum, targetUser, deviceToConnect.password || '');
          let parsed: any = null;
          try {
            parsed = typeof rawRes === 'string' ? JSON.parse(rawRes) : rawRes;
          } catch (e) {
            parsed = { success: true };
          }

          if (parsed && parsed.success) {
            onUpdateDeviceStatus(devId, 'connected');
            setLogsByDevice((prev) => ({
              ...prev,
              [devId]: `${prev[devId] || ''}[✓] Koneksi SSH Android Native Terhubung! Sesi interactive shell aktif.\n======================================================================\n`,
            }));
            setIsConnecting(false);
            return;
          } else {
            throw new Error(parsed?.error || 'Gagal memulai interactive shell SSH di Android');
          }
        } catch (androidSshErr: any) {
          console.warn('AndroidNative.connectSsh error:', androidSshErr);
          onUpdateDeviceStatus(devId, 'disconnected');
          setLogsByDevice((prev) => ({
            ...prev,
            [devId]: `${prev[devId] || ''}\n┌────────────────────────────────────────────────────────────────────────┐
│ ✕ STATUS: KONEKSI SSH KE ${targetHostStr}:${targetPortNum} GAGAL
│ Alasan : ${androidSshErr?.message || androidSshErr}
├────────────────────────────────────────────────────────────────────────┤
│ ANALISA & PANDUAN PEMECAHAN MASALAH:
│ • Pastikan smartphone terhubung ke WiFi/LAN/VPN yang sama dengan host target
│ • Pastikan port ${targetPortNum} terbuka dan service SSH daemon aktif
│ • Periksa apakah user '${targetUser}' dan password perangkat sudah sesuai
└────────────────────────────────────────────────────────────────────────┘\n`,
          }));
          setIsConnecting(false);
          return;
        }
      }

      // 2. Desktop Native Direct PTY Handshake
      const desktop = (window as any).DesktopNative;
      if (desktop && typeof desktop.connectSsh === 'function') {
        setLogsByDevice((prev) => ({
          ...prev,
          [devId]: `${prev[devId] ? prev[devId] + '\n' : ''}${headerLog}[*] Membuka socket TCP & negosiasi enkripsi SSH ke ${targetHostStr}:${targetPortNum}...\n[*] Melakukan autentikasi untuk user '${targetUser}'...\n`,
        }));

        try {
          const connRes = await desktop.connectSsh({
            deviceId: devId,
            host: targetHostStr,
            port: targetPortNum,
            username: targetUser,
            password: deviceToConnect.password || '',
          });

          if (connRes && connRes.success) {
            onUpdateDeviceStatus(devId, 'connected');
            // REGISTER the SSH session so that serialConnection.ts knows about it!
            registerDesktopSerialSession(devId, `ssh-${targetHostStr}`, deviceToConnect, (chunk) => {
              setLogsByDevice((prev) => {
                const prevFull = prev[devId] || '';
                return {
                  ...prev,
                  [devId]: sanitizeTerminalLog(prevFull + chunk),
                };
              });
            });
            setLogsByDevice((prev) => ({
              ...prev,
              [devId]: `${prev[devId] || ''}[✓] Koneksi SSH Desktop Native Terhubung! Sesi interactive shell siap.\n======================================================================\n`,
            }));
            setIsConnecting(false);
            return;
          } else {
            throw new Error(connRes?.error || 'Gagal memulai interactive shell SSH');
          }
        } catch (desktopSshErr: any) {
          console.warn('DesktopNative.connectSsh error:', desktopSshErr);
          onUpdateDeviceStatus(devId, 'disconnected');
          setLogsByDevice((prev) => ({
            ...prev,
            [devId]: `${prev[devId] || ''}\n┌────────────────────────────────────────────────────────────────────────┐
│ ✕ STATUS: KONEKSI SSH KE ${targetHostStr}:${targetPortNum} GAGAL
│ Alasan : ${desktopSshErr?.message || desktopSshErr}
├────────────────────────────────────────────────────────────────────────┤
│ ANALISA & PANDUAN PEMECAHAN MASALAH:
│ • Pastikan host ${targetHostStr} aktif dan port ${targetPortNum} dapat diakses
│ • Periksa apakah firewall mengizinkan koneksi SSH masuk
│ • Pastikan username '${targetUser}' dan password perangkat sudah benar
└────────────────────────────────────────────────────────────────────────┘\n`,
          }));
          setIsConnecting(false);
          return;
        }
      }

      // 3. Web / Cloud Simulation Backend (Standard Interactive Terminal via PTY + SSE)
      setLogsByDevice((prev) => ({
        ...prev,
        [devId]: `${prev[devId] ? prev[devId] + '\n' : ''}${headerLog}[*] Memulai handshake sesi terminal SSH interaktif ke ${targetHostStr}:${targetPortNum}...\n[*] Mengalokasikan PTY shell xterm-256color...`,
      }));

      try {
        const connRes = await fetch('/api/ssh/session/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: devId,
            deviceId: devId,
            host: targetHostStr,
            port: targetPortNum,
            username: targetUser,
            password: deviceToConnect.password || '',
            cols: 120,
            rows: 35,
          }),
        });

        const resData = await connRes.json();

        if (resData.success) {
          onUpdateDeviceStatus(devId, 'connected');

          // Close any previous SSE event source for this device
          if (webSshEventSourcesRef.current.has(devId)) {
            webSshEventSourcesRef.current.get(devId)?.close();
            webSshEventSourcesRef.current.delete(devId);
          }

          // Open real-time SSE stream
          const es = new EventSource(`/api/ssh/session/${encodeURIComponent(devId)}/stream`);
          webSshEventSourcesRef.current.set(devId, es);

          es.onmessage = (event) => {
            try {
              const payload = JSON.parse(event.data);
              if (payload.type === 'data' && payload.chunk) {
                setLogsByDevice((prev) => {
                  const prevFull = prev[devId] || '';
                  return {
                    ...prev,
                    [devId]: sanitizeTerminalLog(prevFull + payload.chunk),
                  };
                });

                const autoHost = extractHostnameFromOutput(payload.chunk);
                if (autoHost) {
                  setHostnamesByDevice((p) => ({ ...p, [devId]: autoHost }));
                  if (onUpdateDeviceHostname) onUpdateDeviceHostname(devId, autoHost);
                }

                const targetMode = extractModeFromPrompt(payload.chunk, activeDevice.brand);
                if (targetMode) {
                  setModesByDevice((p) => ({ ...p, [devId]: targetMode }));
                }
              } else if (payload.type === 'close') {
                onUpdateDeviceStatus(devId, 'disconnected');
                es.close();
                webSshEventSourcesRef.current.delete(devId);
              }
            } catch (_) {}
          };

          es.onerror = () => {
            console.warn('[WebSSH] SSE connection lost or closed for', devId);
          };

          setLogsByDevice((prev) => ({
            ...prev,
            [devId]: `${prev[devId] || ''}\n${headerLog}[✓] Koneksi SSH PTY Shell Terhubung! Standard interactive terminal aktif.\n======================================================================\n`,
          }));
          setIsConnecting(false);
          return;
        }
      } catch (connectErr) {
        console.warn('Interactive SSH connection attempt failed, running diagnostics:', connectErr);
      }

      // If interactive connect fails or is not supported on this port/network, perform diagnostic test to get detailed troubleshooting logs
      const res = await testSshBackendConnection(
        targetHostStr,
        targetPortNum,
        deviceToConnect.username,
        deviceToConnect.password,
        9000
      );

      const logLines = res.logs.map((l) => `[${l.timestamp}] ${l.message}`).join('\n');

      if (res.success) {
        onUpdateDeviceStatus(devId, 'connected');
        const foundHost = res.detectedHostname || (res.banner ? extractHostnameFromOutput(res.banner) : null);
        if (foundHost) {
          setHostnamesByDevice((prev) => ({ ...prev, [devId]: foundHost }));
          if (onUpdateDeviceHostname) {
            onUpdateDeviceHostname(devId, foundHost);
          }
        }

        const effectiveHost = foundHost || devHostname;
        const bannerToShow = res.banner || '';

        setLogsByDevice((prev) => ({
          ...prev,
          [devId]: `${prev[devId] ? prev[devId] + '\n' : ''}${logLines}\n\n[✓] Koneksi SSH Terhubung Berhasil! Sesi shell aktif.\n${bannerToShow ? bannerToShow.trim() + '\n' : ''}`,
        }));
      } else {
        onUpdateDeviceStatus(devId, 'disconnected');
        const troubleshootingText = (res.troubleshooting || [
          `Pastikan port ${deviceToConnect.port || 22} dibuka pada firewall (UFW/iptables/Security Group) server '${deviceToConnect.host}'`,
          `Periksa apakah service OpenSSH daemon (sshd) aktif di server`,
          `Pastikan host atau domain '${deviceToConnect.host}' dapat diakses melalui internet`
        ]).map((t) => `│ • ${t}`).join('\n');

        const errorBox = `\n${logLines}

┌────────────────────────────────────────────────────────────────────────┐
│ ✕ STATUS: KONEKSI SSH KE ${targetHostStr}:${targetPortNum} GAGAL
│ Alasan : ${res.error || 'Connection timed out / unreachable'}
├────────────────────────────────────────────────────────────────────────┤
│ ANALISA & PANDUAN PEMECAHAN MASALAH:                                   │
${troubleshootingText}
└────────────────────────────────────────────────────────────────────────┘

[Tekan 'Enter' atau klik tombol 'Connect' di pojok kanan atas untuk mencoba menghubungkan kembali]\n`;

        setLogsByDevice((prev) => ({
          ...prev,
          [devId]: `${prev[devId] ? prev[devId] + '\n' : ''}${errorBox}`,
        }));
      }
      setIsConnecting(false);
      return;
    }

    if (deviceToConnect.type === 'serial_cable') {
      onUpdateDeviceStatus(devId, 'connecting');
      const targetBaud = deviceToConnect.baudRate || 9600;
      const desktop = (window as any).DesktopNative || (window as any).desktopNative;


      // 1. Desktop Native Serial (macOS .dmg / Windows)
      if (desktop && (typeof desktop.connectSerial === 'function' || typeof desktop.openSerialPort === 'function')) {
        const rawCandidate = deviceToConnect.serialPortPath ||
                             deviceToConnect.ipOrPortLabel ||
                             deviceToConnect.name ||
                             '';
        const devMatch = rawCandidate.match(/\/dev\/(?:cu|tty)\.[a-zA-Z0-9_.-]+/i) ||
                         rawCandidate.match(/\/dev\/tty[a-zA-Z0-9_.-]+/i) ||
                         rawCandidate.match(/\/dev\/[a-zA-Z0-9_.-]+/i) ||
                         rawCandidate.match(/\bCOM\d+\b/i);
        
        const isMacOS = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent || navigator.platform || '');
        let targetPath = devMatch 
          ? devMatch[0] 
          : (rawCandidate.startsWith('/dev/') ? rawCandidate.split(' ')[0] : (isMacOS ? '/dev/cu.usbserial' : 'COM3'));

        // CRITICAL FOR MACOS: Always use /dev/cu.* instead of /dev/tty.* to prevent hardware blocking lockups.
        if (isMacOS && targetPath.startsWith('/dev/tty.')) {
          targetPath = targetPath.replace('/dev/tty.', '/dev/cu.');
        }

        const connectFn = desktop.connectSerial || desktop.openSerialPort;
        try {
          const res = await connectFn(targetPath, targetBaud);
          if (res && res.success) {
            onUpdateDeviceStatus(devId, 'connected');
            registerDesktopSerialSession(devId, res.path || targetPath, deviceToConnect, (chunk) => {
              setLogsByDevice((prev) => {
                const prevFull = prev[devId] || '';
                const newFull = sanitizeTerminalLog(prevFull + chunk);
                return { ...prev, [devId]: newFull };
              });
            });
            const serialBanner = `\n======================================================================
[✓] SERIAL CABLE CONNECTED (macOS / Desktop Native): ${res.path || targetPath}
    Baud Rate : ${targetBaud} bps (8-N-1)
    Status    : ${res?.reused ? 'Hardware Serial Aktif (Sesi Terhubung Otomatis)' : 'Hardware Serial Langsung'}
======================================================================\n`;
            setLogsByDevice((prev) => ({ ...prev, [devId]: (prev[devId] || '') + serialBanner }));
            setIsConnecting(false);
            return;
          } else if (res && !res.success) {
            onUpdateDeviceStatus(devId, 'disconnected');
            const errorBox = `\n======================================================================
[X] GAGAL TERHUBUNG KE KABEL SERIAL: ${targetPath}
    Pesan Error : ${res.error || 'Port ditolak atau EBUSY'}
======================================================================\n`;
            setLogsByDevice((prev) => ({ ...prev, [devId]: (prev[devId] || '') + errorBox }));
            setIsConnecting(false);
            return;
          }
        } catch (err: any) {
          console.warn('DesktopNative.connectSerial error fallback to Web Serial', err);
        }
      }

      // 2. Web Serial API (Chrome / Edge)
      const res = await connectWebSerialPort(targetBaud, {
        dataBits: deviceToConnect.dataBits || 8,
        stopBits: deviceToConnect.stopBits || 1,
        parity: deviceToConnect.parity || 'none',
        flowControl: deviceToConnect.flowControl || 'none',
        dtrRts: deviceToConnect.dtrRts ?? true,
      });

      if (res.success && res.port) {
        onUpdateDeviceStatus(devId, 'connected');
        
        const serialBanner = `\n======================================================================
[✓] WEB SERIAL CONNECTED: ${res.portName || deviceToConnect.name}
    Kecepatan Baud : ${targetBaud} bps (8-N-1)
    Sinyal Hardware: DTR=ON, RTS=ON (Transceiver IRXON/RS232 Aktif)
    Tips IRXON     : Tekan Enter 1-2x untuk memunculkan prompt console router
======================================================================\n`;

        setLogsByDevice((prev) => ({
          ...prev,
          [devId]: (prev[devId] ? prev[devId] + '\n' : '') + serialBanner,
        }));

        // Start live background streaming from the Serial COM port
        await startSerialDataStream(
          devId,
          res.port,
          deviceToConnect,
          (chunk) => {
            setLogsByDevice((prev) => {
              const prevFull = prev[devId] || '';
              const newFull = prevFull + chunk;
              const tail = newFull.slice(-3500);
              const detectedHost = extractHostnameFromOutput(tail) || extractHostnameFromOutput(chunk);
              if (detectedHost) {
                setHostnamesByDevice((hPrev) => {
                  if (hPrev[devId] !== detectedHost) {
                    return { ...hPrev, [devId]: detectedHost };
                  }
                  return hPrev;
                });
                if (onUpdateDeviceHostname) {
                  onUpdateDeviceHostname(devId, detectedHost);
                }
              }
              const detectedMode = extractModeFromPrompt(tail, deviceToConnect.brand) || extractModeFromPrompt(chunk, deviceToConnect.brand);
              if (detectedMode) {
                setModesByDevice((mPrev) => {
                  if (mPrev[devId] !== detectedMode) {
                    return { ...mPrev, [devId]: detectedMode };
                  }
                  return mPrev;
                });
              }
              return {
                ...prev,
                [devId]: newFull,
              };
            });
          },
          (err) => {
            console.warn('Serial stream warning:', err);
          }
        );
      } else {
        onUpdateDeviceStatus(devId, 'disconnected');
        const errText = `\n[✕] Gagal membuka port Serial / Irxon Bluetooth: ${res.error || 'Port dibatalkan'}
[!] PANDUAN PEMECAHAN MASALAH IRXON BLUETOOTH / SERIAL:
    1. Pastikan kabel console USB atau Bluetooth sudah terpasang/dipasangkan di komputer Anda.
    2. Pada pop-up browser, pilih Port COM Virtual / USB yang sesuai.
    3. Pastikan Baud Rate diset ke 9600 (default Cisco/Switch) atau 115200.
    4. Klik tombol 'Connect' atau tekan Enter untuk mencoba kembali.\n`;

        setLogsByDevice((prev) => ({
          ...prev,
          [devId]: (prev[devId] ? prev[devId] + '\n' : '') + errText,
        }));
      }
      setIsConnecting(false);
      return;
    }

    if (deviceToConnect.type === 'serial_bluetooth') {
      onUpdateDeviceStatus(devId, 'connecting');

      // Safety timeout to ensure connecting spinner is never permanently stuck
      const safetyTimeout = setTimeout(() => {
        setIsConnecting(false);
      }, 7000);

      try {
        const desktop = (window as any).DesktopNative || (window as any).desktopNative;
        const btAddr = deviceToConnect.bluetoothAddress || deviceToConnect.bluetoothName || '';
        

        // A. If running in macOS Desktop Native and device is an actual POSIX SPP port (/dev/cu.* or /dev/tty.*)
        if (desktop && typeof desktop.connectSerial === 'function' && (btAddr.startsWith('/dev/cu.') || btAddr.startsWith('/dev/tty.') || btAddr.startsWith('COM'))) {
          let targetPort = btAddr;
          const isMacOS = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent || navigator.platform || '');
          if (isMacOS && targetPort.startsWith('/dev/tty.')) {
            targetPort = targetPort.replace('/dev/tty.', '/dev/cu.');
          }
          const serialRes = await desktop.connectSerial(targetPort, deviceToConnect.baudRate || 9600);
          
          if (serialRes && serialRes.success) {
            clearTimeout(safetyTimeout);
            registerDesktopSerialSession(devId, serialRes.path || targetPort, deviceToConnect, (chunk) => {
              setLogsByDevice((prev) => {
                const prevFull = prev[devId] || '';
                return { ...prev, [devId]: sanitizeTerminalLog(prevFull + chunk) };
              });
            });
            onUpdateDeviceStatus(devId, 'connected');
            const btBanner = `\n======================================================================
[✓] BLUETOOTH SPP SERIAL CONNECTED: ${targetPort}
    Protokol : Bluetooth SPP (macOS Native Direct Binding)
    Status   : Port Serial Terbuka (Baud Rate ${deviceToConnect.baudRate || 9600} bps 8N1)
    Hardware : LED Biru Solid
======================================================================\n\nRouter> `;
            setLogsByDevice((prev) => ({
              ...prev,
              [devId]: `${prev[devId] || ''}${btBanner}`,
            }));
            setIsConnecting(false);
            return;
          } else if (serialRes && !serialRes.success) {
            onUpdateDeviceStatus(devId, 'disconnected');
            const errorBox = `\n======================================================================
[X] GAGAL TERHUBUNG KE BLUETOOTH SPP: ${targetPort}
    Pesan Error : ${serialRes.error || 'Port ditolak atau EBUSY'}
======================================================================\n`;
            setLogsByDevice((prev) => ({
              ...prev,
              [devId]: (prev[devId] || '') + errorBox,
            }));
            setIsConnecting(false);
            return;
          }
        }

        // B. Connect via Web Bluetooth GATT / BLE Bridge
        if (desktop && typeof desktop.selectBluetoothDevice === 'function') {
          const targetAddrOrName = deviceToConnect.bluetoothAddress || deviceToConnect.bluetoothName || deviceToConnect.name || 'BT578';
          desktop.selectBluetoothDevice(targetAddrOrName).catch(() => {});
        }

        let res = await connectWebBluetoothSerial(
          (chunk) => {
            setLogsByDevice((prev) => {
              const prevFull = prev[devId] || '';
              const newFull = sanitizeTerminalLog(prevFull + chunk);
              const tail = newFull.slice(-3500);
              const detectedHost = extractHostnameFromOutput(tail) || extractHostnameFromOutput(chunk);
              if (detectedHost) {
                setHostnamesByDevice((hPrev) => {
                  if (hPrev[devId] !== detectedHost) {
                    return { ...hPrev, [devId]: detectedHost };
                  }
                  return hPrev;
                });
                if (onUpdateDeviceHostname) {
                  onUpdateDeviceHostname(devId, detectedHost);
                }
              }
              return {
                ...prev,
                [devId]: newFull,
              };
            });
          },
          devId,
          undefined,
          deviceToConnect.bluetoothAddress || deviceToConnect.bluetoothName || deviceToConnect.name || 'IRXON BT578-BLE',
          deviceToConnect.baudRate || 9600,
          false
        );

        // If direct GATT returned not successful, fallback to isolated WebView / Iframe BLE Bridge
        if (!res.success) {
          try {
            const bridgeRes = await bleBridgeService.requestConnect({ baudRate: deviceToConnect.baudRate || 9600 });
            if (bridgeRes.success) {
              res = {
                success: true,
                deviceName: bridgeRes.deviceName || deviceToConnect.bluetoothName || 'IRXON BT578 V3 (WebView BLE Bridge)',
              };
              bleBridgeService.onData((chunk) => {
                setLogsByDevice((prev) => {
                  const prevFull = prev[devId] || '';
                  const newFull = sanitizeTerminalLog(prevFull + chunk);
                  const tail = newFull.slice(-3500);
                  const detectedHost = extractHostnameFromOutput(tail) || extractHostnameFromOutput(chunk);
                  if (detectedHost) {
                    setHostnamesByDevice((hPrev) => {
                      if (hPrev[devId] !== detectedHost) {
                        return { ...hPrev, [devId]: detectedHost };
                      }
                      return hPrev;
                    });
                    if (onUpdateDeviceHostname) {
                      onUpdateDeviceHostname(devId, detectedHost);
                    }
                  }
                  return {
                    ...prev,
                    [devId]: newFull,
                  };
                });
              });
            }
          } catch (_) {}
        }

        // If still not connected (e.g. after ~10 min idle on macOS where peripheral link went stale), retry with forcePrompt=true to trigger auto-pairing dialog
        if (!res.success) {
          console.log('[Terminal] Fast reconnect tidak berhasil, mencoba auto-pairing dialog (forcePrompt = true)...');
          try {
            res = await connectWebBluetoothSerial(
              (chunk) => {
                setLogsByDevice((prev) => {
                  const prevFull = prev[devId] || '';
                  const newFull = sanitizeTerminalLog(prevFull + chunk);
                  const tail = newFull.slice(-3500);
                  const detectedHost = extractHostnameFromOutput(tail) || extractHostnameFromOutput(chunk);
                  if (detectedHost) {
                    setHostnamesByDevice((hPrev) => {
                      if (hPrev[devId] !== detectedHost) {
                        return { ...hPrev, [devId]: detectedHost };
                      }
                      return hPrev;
                    });
                    if (onUpdateDeviceHostname) {
                      onUpdateDeviceHostname(devId, detectedHost);
                    }
                  }
                  return {
                    ...prev,
                    [devId]: newFull,
                  };
                });
              },
              devId,
              undefined,
              deviceToConnect.bluetoothAddress || deviceToConnect.bluetoothName || deviceToConnect.name || 'IRXON BT578-BLE',
              deviceToConnect.baudRate || 9600,
              true
            );
          } catch (retryErr) {
            console.warn('[Terminal] Auto-pair retry error:', retryErr);
          }
        }

        clearTimeout(safetyTimeout);

        if (res.success) {
          onUpdateDeviceStatus(devId, 'connected');
          const isAndroid = typeof window !== 'undefined' && typeof (window as any).AndroidNative !== 'undefined';
          const protocolLabel = res.note?.includes('SPP') 
            ? 'Android Native Bluetooth SPP (RFCOMM / IRXON)' 
            : (isAndroid ? 'Android Native Bluetooth (SPP / BLE Direct)' : 'BLE UART SPP Transparent Bridge (IRXON / HM-10 / CC2541)');
          const methodLabel = isAndroid ? 'Android OS Native Bluetooth Socket' : 'WebView / Iframe Isolated BLE Bridge Transceiver (FFE0/FFE1)';

          const btBanner = `\n======================================================================
[✓] BLUETOOTH SERIAL CONNECTED: ${res.deviceName || 'IRXON BT578'}
    Protokol : ${protocolLabel}
    Metode   : ${methodLabel}
    Status   : Jalur RX/TX Aktif (Baud Rate ${deviceToConnect.baudRate || 9600} bps 8N1)
    Hardware : LED Biru Solid (Terkoneksi ke Console Router)
    Tips     : Tekan tombol Enter 1-2x untuk memunculkan prompt
======================================================================\n\nRouter> `;

          setLogsByDevice((prev) => ({
            ...prev,
            [devId]: `${prev[devId] || ''}${btBanner}`,
          }));
        } else {
          onUpdateDeviceStatus(devId, 'disconnected');
          const btErrText = `\n[✕] Gagal menyambungkan Bluetooth Serial: ${res.error || 'Perangkat dibatalkan'}
[!] TIPS UNTUK IRXON BT578:
    Jika menggunakan mode Bluetooth SPP standar (bukan BLE), gunakan menu 'Serial Kabel (COM)' lalu pilih COM Port IRXON (/dev/cu.BT578*).\n`;

          setLogsByDevice((prev) => ({
            ...prev,
            [devId]: `${prev[devId] || ''}${btErrText}`,
          }));
        }
      } catch (btErr: any) {
        clearTimeout(safetyTimeout);
        onUpdateDeviceStatus(devId, 'disconnected');
        setLogsByDevice((prev) => ({
          ...prev,
          [devId]: `\n[✕] Bluetooth Serial Error: ${btErr?.message || 'Koneksi terputus'}\n`,
        }));
      } finally {
        setIsConnecting(false);
      }
      return;
    }

    onUpdateDeviceStatus(devId, 'connected');
    setLogsByDevice((prev) => ({
      ...prev,
      [devId]: `${prev[devId] || ''}\n[Session Connected: ${deviceToConnect.name} (${deviceToConnect.ipOrPortLabel})]\n`,
    }));
    setIsConnecting(false);
  };

  const handleExecuteCommand = async (
    cmd: string, 
    options?: { 
      inspectAfter?: boolean; 
      onCompleted?: (result: { command: string; output: string; fullLog: string }) => void;
      autoShowAll?: boolean;
      targetDev?: DeviceProfile | null;
    }
  ) => {
    const targetDevice = options?.targetDev || activeDevice;
    if (!targetDevice) return;
    const targetDeviceId = targetDevice.id;

    // Strict debounce per device to prevent duplicate execution while allowing concurrent broadcast
    const now = Date.now();
    const lastDevTime = lastExecTimeByDeviceRef.current[targetDeviceId] || 0;
    if (now - lastDevTime < 150 || isExecutingByDeviceRef.current[targetDeviceId]) {
      return;
    }
    lastExecTimeByDeviceRef.current[targetDeviceId] = now;
    isExecutingByDeviceRef.current[targetDeviceId] = true;

    const targetLog = logsByDevice[targetDeviceId] || '';
    const targetMode = modesByDevice[targetDeviceId] || 'exec';
    const targetHostname = hostnamesByDevice[targetDeviceId] || targetDevice.hostname || targetDevice.name;
    const targetPrompt = getDevicePrompt(targetDevice, targetMode, targetHostname);

    const isAutoExec = Boolean(
      options?.inspectAfter || 
      options?.autoShowAll || 
      externalCommandTrigger?.inspectAfter ||
      (autoShowAllOnExec && Boolean(options?.onCompleted))
    );
    if (isAutoExec) {
      isAutoExecRunningRef.current = true;
    }

    // Synchronously clear the input element for target device
    setCurrentInputs((prev) => ({ ...prev, [targetDeviceId]: '' }));
    if (targetDeviceId === currentDeviceId && inputRef.current) {
      inputRef.current.value = '';
    }

    const notifyExecutionCompleted = (cmdExecuted: string, outputProduced: string, fullLogResult: string) => {
      try {
        if (targetDeviceId === activeDevice?.id) {
          (window as any).activeTerminalLogs = fullLogResult;
        }
        (window as any).lastExecutedCommandOutput = {
          command: cmdExecuted,
          output: outputProduced,
          deviceId: targetDeviceId,
          timestamp: Date.now(),
        };
        window.dispatchEvent(new CustomEvent('terminal-command-completed', {
          detail: { command: cmdExecuted, output: outputProduced, fullLog: fullLogResult, deviceId: targetDeviceId }
        }));
      } catch (e) {}

      // Auto-Capture Config Snapshot on 'show run', saving configuration, or baseline
      try {
        if (targetDevice) {
          const normCmd = cmdExecuted.trim().toLowerCase();
          const devHostname = hostnamesByDevice[targetDevice.id] || targetDevice.hostname || targetDevice.name;
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          // Trigger 3: Saat menyimpan konfigurasi (write memory / wr / copy run start / commit / save)
          const isSaveConfigCmd = isSaveConfigurationCommand(cmdExecuted);

          if (isSaveConfigCmd) {
            captureRunningConfigViaBackgroundExec(targetDevice, devHostname).then((res) => {
              if (res.config && res.config.trim()) {
                const snap = createSnapshotFromConfig(
                  targetDevice.id,
                  targetDevice.name,
                  targetDevice.brand,
                  res.config,
                  'post_change',
                  `Simpan Konfigurasi (${cmdExecuted.trim()}) - ${timeStr}`,
                  res.commandUsed
                );
                const updated = saveDeviceSnapshot(snap);
                setSnapshotCount(updated.length);
                setSnapshotToastMessage(`✓ Snapshot otomatis disimpan (${snap.lineCount} baris) via real '${res.commandUsed}' di balik layar`);
              }
            }).catch((err) => console.warn('Auto save snapshot capture error:', err));
          } else {
            // Show run / configuration commands
            const isShowRunCmd = /^(?:show\s+(?:run|running-config|full-configuration|configuration|conf)|display\s+current-configuration|get\s+system\s+status|\/export|export)/i.test(normCmd);
            
            if (isShowRunCmd) {
              captureRunningConfigViaBackgroundExec(targetDevice, devHostname).then((res) => {
                if (res.config && res.config.trim()) {
                  const snap = createSnapshotFromConfig(
                    targetDevice.id,
                    targetDevice.name,
                    targetDevice.brand,
                    res.config,
                    'auto_show_run',
                    `Live Show Run (${timeStr})`,
                    res.commandUsed
                  );
                  saveDeviceSnapshot(snap);
                }
              }).catch((err) => console.warn('Show run background capture error:', err));
            } else if (/^(?:conf(?:igure)?\s+t(?:erminal)?|config\s+system|system-view)/i.test(normCmd)) {
              // Entering config mode: automatically preserve Baseline (Pre-Change) snapshot if not yet taken recently
              const existing = getDeviceSnapshots(targetDevice.id);
              const hasRecentPre = existing.some(s => s.type === 'pre_change' && (Date.now() - new Date(s.timestamp).getTime() < 10 * 60 * 1000));
              if (!hasRecentPre) {
                captureRunningConfigViaBackgroundExec(targetDevice, devHostname).then((res) => {
                  if (res.config && res.config.trim()) {
                    const snap = createSnapshotFromConfig(
                      targetDevice.id,
                      targetDevice.name,
                      targetDevice.brand,
                      res.config,
                      'pre_change',
                      `Pre-Change Baseline (${timeStr})`,
                      res.commandUsed
                    );
                    const updated = saveDeviceSnapshot(snap);
                    setSnapshotCount(updated.length);
                  }
                }).catch((err) => console.warn('Pre-change baseline capture error:', err));
              }
            }
          }
        }
      } catch (snapErr) {
        console.warn('Auto config snapshot capture error:', snapErr);
      }

      if (targetDeviceId === activeDevice?.id && onTerminalLogChange) {
        onTerminalLogChange(fullLogResult);
      }
      if (options?.onCompleted) {
        options.onCompleted({ command: cmdExecuted, output: outputProduced, fullLog: fullLogResult });
      }
      if (onCommandExecutionComplete) {
        onCommandExecutionComplete(cmdExecuted, outputProduced, fullLogResult);
      }
      isAutoExecRunningRef.current = false;
    };

    try {
      const isCurrentPasswordPrompt = isTerminalPasswordPrompt(targetPrompt, targetLog);
      const isPassword = isCurrentPasswordPrompt || manualPasswordMask;
      const payload = isPassword ? cmd.replace(/[\r\n]+$/, '') : cmd.trim();
      const trimmed = payload;

      // Reset password toggle states upon sending
      if (manualPasswordMask) setManualPasswordMask(false);
      if (showPasswordPlainText) setShowPasswordPlainText(false);

      // Handle interactive sudo / privilege escalation password input
      if (isCurrentPasswordPrompt && pendingSudoAuthCmdRef.current && pendingSudoAuthCmdRef.current.deviceId === targetDeviceId) {
        const pendingCmd = pendingSudoAuthCmdRef.current.command;
        pendingSudoAuthCmdRef.current = null;

        if (targetDevice) {
          targetDevice.password = payload;
          if (onUpdateDevice) {
            onUpdateDevice({ ...targetDevice, password: payload });
          }
        }

        setLogsByDevice((prev) => {
          const prevDevLog = prev[targetDeviceId] || '';
          const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
          const nextLog = buildNextTerminalLog(
            curDisplay,
            targetPrompt,
            '',
            undefined,
            null,
            true
          );
          return {
            ...prev,
            [targetDeviceId]: nextLog,
          };
        });

        if (targetDevice.host) {
          const execRes = await executeSshBackendCommand(
            targetDevice.host,
            targetDevice.port || 22,
            targetDevice.username || 'admin',
            payload,
            pendingCmd
          );

          if (execRes.success) {
            if (execRes.requiresAuth) {
              // Remote server is still requesting password (e.g. incorrect attempt)
              pendingSudoAuthCmdRef.current = {
                deviceId: targetDeviceId,
                command: pendingCmd,
              };
              setLogsByDevice((prev) => {
                const prevDevLog = prev[targetDeviceId] || '';
                const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
                const nextLog = buildNextTerminalLog(
                  curDisplay,
                  targetPrompt,
                  '',
                  execRes.output?.trim(),
                  null,
                  false
                );
                return {
                  ...prev,
                  [targetDeviceId]: nextLog,
                };
              });
              return;
            }

            const autoHost = execRes.output ? extractHostnameFromOutput(execRes.output) : null;
            if (autoHost) {
              setHostnamesByDevice((prev) => ({ ...prev, [targetDeviceId]: autoHost }));
              if (onUpdateDeviceHostname) {
                onUpdateDeviceHostname(targetDeviceId, autoHost);
              }
            }
            setLogsByDevice((prev) => {
              const prevDevLog = prev[targetDeviceId] || '';
              const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
              const nextLog = buildNextTerminalLog(
                curDisplay,
                targetPrompt,
                '',
                execRes.output?.trim(),
                nextPrompt || targetPrompt,
                false
              );
              notifyExecutionCompleted(pendingCmd, execRes.output?.trim() || '', nextLog);
              return {
                ...prev,
                [targetDeviceId]: nextLog,
              };
            });
            return;
          } else {
            setLogsByDevice((prev) => {
              const prevDevLog = prev[targetDeviceId] || '';
              const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
              const errMsg = `[✕] Gagal mengeksekusi perintah SSH: ${execRes.error || 'Autentikasi gagal'}`;
              const nextLog = buildNextTerminalLog(
                curDisplay,
                targetPrompt,
                '',
                errMsg,
                targetPrompt,
                false
              );
              notifyExecutionCompleted(pendingCmd, errMsg, nextLog);
              return {
                ...prev,
                [targetDeviceId]: nextLog,
              };
            });
            return;
          }
        }
      }

      if (!trimmed) {
        // User pressed enter without command -> transmit single CR '\r' (0x0D) to hardware or SSH PTY stream
        if (targetDevice.type === 'serial_cable' || targetDevice.type === 'serial_bluetooth') {
          const written = await writeToActiveSerialDevice(targetDeviceId, '', targetDevice.lineEnding || 'cr');
          if (!written || targetDevice.status !== 'connected') {
            setLogsByDevice((prev) => {
              const prevDevLog = prev[targetDeviceId] || '';
              const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
              const nextLog = buildNextTerminalLog(curDisplay, targetPrompt, '', undefined, targetPrompt);
              notifyExecutionCompleted('', '', nextLog);
              return {
                ...prev,
                [targetDeviceId]: nextLog,
              };
            });
          }
        } else if (targetDevice.type === 'ssh' || targetDevice.type === 'telnet') {
          const android = (window as any).AndroidNative;
          const desktop = (window as any).DesktopNative;
          let sentNative = false;
          if (android && typeof android.writeSsh === 'function') {
            try {
              // Interactive VT100 SSH PTY requires strictly single CR ('\r') on Enter to avoid double newlines
              sentNative = android.writeSsh(targetDeviceId, '\r');
            } catch (e) {}
          } else if (desktop && typeof desktop.writeSsh === 'function') {
            try {
              await desktop.writeSsh(targetDeviceId, '\r');
              sentNative = true;
            } catch (e) {}
          }
          if (!sentNative) {
            setLogsByDevice((prev) => {
              const prevDevLog = prev[targetDeviceId] || '';
              const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
              const nextLog = buildNextTerminalLog(curDisplay, targetPrompt, '', undefined, targetPrompt);
              notifyExecutionCompleted('', '', nextLog);
              return {
                ...prev,
                [targetDeviceId]: nextLog,
              };
            });
          }
        } else {
          setLogsByDevice((prev) => {
            const prevDevLog = prev[targetDeviceId] || '';
            const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
            const nextLog = buildNextTerminalLog(curDisplay, targetPrompt, '', undefined, targetPrompt);
            notifyExecutionCompleted('', '', nextLog);
            return {
              ...prev,
              [targetDeviceId]: nextLog,
            };
          });
        }
        return;
      }

      // Save history (never save passwords to history or persistent storage for security standards)
      if (!isPassword) {
        setCommandHistories((prev) => ({
          ...prev,
          [targetDeviceId]: [...(prev[targetDeviceId] || []), trimmed],
        }));
      }
      setHistoryIndexes((prev) => ({ ...prev, [targetDeviceId]: -1 }));

      if (targetDevice.status === 'disconnected') {
        handleConnectDevice(targetDevice);
        return;
      }

      // Automatically capture snapshot whenever a save configuration command is executed
      if (isSaveConfigurationCommand(trimmed)) {
        triggerAutoConfigSnapshot(trimmed, 'post_change');
      } else if (/^(?:conf(?:igure)?\s+t(?:erminal)?|config\s+system|system-view)/i.test(trimmed)) {
        // Entering configuration mode -> check baseline
        const existing = getDeviceSnapshots(targetDevice.id);
        const hasRecentPre = existing.some(s => s.type === 'pre_change' && (Date.now() - new Date(s.timestamp).getTime() < 10 * 60 * 1000));
        if (!hasRecentPre) {
          triggerAutoConfigSnapshot(trimmed, 'pre_change');
        }
      }

      const isVirtual = isVirtualSession(targetDeviceId);
      // Pre-calculate CLI transition using device state machine
      const simResult = executeCliCommand(trimmed, targetDevice, targetMode, targetHostname);
      let nextPrompt = targetPrompt;

      if (simResult.newMode !== undefined) {
        setModesByDevice((prev) => ({ ...prev, [targetDeviceId]: simResult.newMode! }));
      }
      if (simResult.newHostname !== undefined) {
        setHostnamesByDevice((prev) => ({ ...prev, [targetDeviceId]: simResult.newHostname! }));
        if (onUpdateDeviceHostname) {
          onUpdateDeviceHostname(targetDeviceId, simResult.newHostname!);
        }
      }

      nextPrompt = getDevicePrompt(
        targetDevice,
        simResult.newMode !== undefined ? simResult.newMode : targetMode,
        simResult.newHostname !== undefined ? simResult.newHostname : targetHostname
      );

      // If target device is SSH and has host configured
      if (targetDevice.type === 'ssh' || targetDevice.type === 'telnet') {
        const android = (window as any).AndroidNative;
        if (android && typeof android.writeSsh === 'function') {
          try {
            // Interactive VT100 SSH PTY requires strictly single CR ('\r') on Enter
            const ok = android.writeSsh(targetDeviceId, trimmed + '\r');
            if (ok) {
              if (options?.inspectAfter || options?.onCompleted) {
                const curLog = logsByDevice[targetDeviceId] || '';
                if (pendingHardwareExecRef.current?.timer) {
                  clearTimeout(pendingHardwareExecRef.current.timer);
                }
                pendingHardwareExecRef.current = {
                  deviceId: targetDeviceId,
                  command: trimmed,
                  startLogLength: curLog.length,
                  options,
                  timer: setTimeout(() => {
                    if (pendingHardwareExecRef.current && pendingHardwareExecRef.current.deviceId === targetDeviceId) {
                      const latestLog = (window as any).activeTerminalLogs || logsByDevice[targetDeviceId] || '';
                      const produced = latestLog.slice(pendingHardwareExecRef.current.startLogLength).trim();
                      notifyExecutionCompleted(trimmed, produced, latestLog);
                      pendingHardwareExecRef.current = null;
                    }
                  }, 3000),
                };
              }
              return;
            }
          } catch (androidStreamErr) {
            console.warn('AndroidNative.writeSsh error:', androidStreamErr);
          }
        }

        const desktop = (window as any).DesktopNative;
        if (desktop && typeof desktop.writeSsh === 'function') {
          try {
            const writeRes = await desktop.writeSsh(targetDeviceId, trimmed + '\r');
            if (writeRes === true || (writeRes && writeRes.success !== false)) {
              if (options?.inspectAfter || options?.onCompleted) {
                const curLog = logsByDevice[targetDeviceId] || '';
                if (pendingHardwareExecRef.current?.timer) {
                  clearTimeout(pendingHardwareExecRef.current.timer);
                }
                pendingHardwareExecRef.current = {
                  deviceId: targetDeviceId,
                  command: trimmed,
                  startLogLength: curLog.length,
                  options,
                  timer: setTimeout(() => {
                    if (pendingHardwareExecRef.current && pendingHardwareExecRef.current.deviceId === targetDeviceId) {
                      const latestLog = (window as any).activeTerminalLogs || logsByDevice[targetDeviceId] || '';
                      const produced = latestLog.slice(pendingHardwareExecRef.current.startLogLength).trim();
                      notifyExecutionCompleted(trimmed, produced, latestLog);
                      pendingHardwareExecRef.current = null;
                    }
                  }, 3000),
                };
              }
              return;
            }
          } catch (streamErr) {
            console.warn('DesktopNative.writeSsh fallback:', streamErr);
          }
        }

        // Web Persistent Interactive SSH (Real-time PTY stream)
        if (webSshEventSourcesRef.current.has(targetDeviceId)) {
          try {
            await fetch(`/api/ssh/session/${encodeURIComponent(targetDeviceId)}/write`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: trimmed + '\r' }),
            });
            if (options?.inspectAfter || options?.onCompleted) {
              const curLog = logsByDevice[targetDeviceId] || '';
              if (pendingHardwareExecRef.current?.timer) {
                clearTimeout(pendingHardwareExecRef.current.timer);
              }
              pendingHardwareExecRef.current = {
                deviceId: targetDeviceId,
                command: trimmed,
                startLogLength: curLog.length,
                options,
                timer: setTimeout(() => {
                  if (pendingHardwareExecRef.current && pendingHardwareExecRef.current.deviceId === targetDeviceId) {
                    const latestLog = (window as any).activeTerminalLogs || logsByDevice[targetDeviceId] || '';
                    const produced = latestLog.slice(pendingHardwareExecRef.current.startLogLength).trim();
                    notifyExecutionCompleted(trimmed, produced, latestLog);
                    pendingHardwareExecRef.current = null;
                  }
                }, 3000),
              };
            }
            return;
          } catch (streamErr) {
            console.warn('WebSSH write failed, falling back to exec:', streamErr);
          }
        }

        if (targetDevice.host) {
          const execRes = await executeSshBackendCommand(
            targetDevice.host,
            targetDevice.port || 22,
            targetDevice.username || 'admin',
            targetDevice.password,
            trimmed,
            targetDevice.brand || 'cisco',
            targetMode,
            targetHostname
          );

          if (execRes.success) {
            if (execRes.requiresAuth) {
              // Remote command stopped at password authentication prompt (e.g. sudo)
              pendingSudoAuthCmdRef.current = {
                deviceId: targetDeviceId,
                command: trimmed,
              };
              setLogsByDevice((prev) => {
                const prevDevLog = prev[targetDeviceId] || '';
                const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
                const nextLog = buildNextTerminalLog(
                  curDisplay,
                  targetPrompt,
                  trimmed,
                  execRes.output?.trim(),
                  null,
                  isPassword
                );
                return {
                  ...prev,
                  [targetDeviceId]: nextLog,
                };
              });
              return;
            }

            // Detect mode change from SSH output or CLI state engine (e.g. conf t -> config mode)
            const detectedMode = execRes.newMode || (execRes.output ? extractModeFromPrompt(execRes.output, targetDevice.brand) : null) || simResult.newMode;
            if (detectedMode && detectedMode !== targetMode) {
              setModesByDevice((prev) => ({ ...prev, [targetDeviceId]: detectedMode }));
            }

            const autoHost = execRes.newHostname || (execRes.output ? extractHostnameFromOutput(execRes.output) : null) || simResult.newHostname;
            if (autoHost && autoHost !== targetHostname) {
              setHostnamesByDevice((prev) => ({ ...prev, [targetDeviceId]: autoHost }));
              if (onUpdateDeviceHostname) {
                onUpdateDeviceHostname(targetDeviceId, autoHost);
              }
            }

            const effectiveMode = detectedMode || targetMode;
            const effectiveHost = autoHost || targetHostname;
            const resolvedPrompt = getDevicePrompt(targetDevice, effectiveMode, effectiveHost);

            setLogsByDevice((prev) => {
              const prevDevLog = prev[targetDeviceId] || '';
              const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
              const nextLog = buildNextTerminalLog(
                curDisplay,
                targetPrompt,
                trimmed,
                execRes.output?.trim(),
                resolvedPrompt,
                isPassword
              );
              notifyExecutionCompleted(trimmed, execRes.output?.trim() || '', nextLog);
              return {
                ...prev,
                [targetDeviceId]: nextLog,
              };
            });
            return;
          } else {
            setLogsByDevice((prev) => {
              const prevDevLog = prev[targetDeviceId] || '';
              const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
              const errMsg = `[✕] Gagal mengeksekusi perintah SSH: ${execRes.error || 'Server tidak merespons'}`;
              const nextLog = buildNextTerminalLog(
                curDisplay,
                targetPrompt,
                trimmed,
                errMsg,
                targetPrompt,
                isPassword
              );
              notifyExecutionCompleted(trimmed, errMsg, nextLog);
              return {
                ...prev,
                [targetDeviceId]: nextLog,
              };
            });
            return;
          }
        }
      }

      // Real Web Serial & Bluetooth Hardware Command Transmission
      if (targetDevice.type === 'serial_cable' || targetDevice.type === 'serial_bluetooth') {
        const lineEndingMode = targetDevice.lineEnding || 'cr';

        const written = await writeToActiveSerialDevice(
          targetDeviceId,
          trimmed,
          lineEndingMode
        );

        if (isVirtual) {
          if (simResult.output === '__CLEAR__') {
            setVirtualPagerBuffers((prev) => {
              const next = { ...prev };
              delete next[targetDeviceId];
              return next;
            });
            setLogsByDevice((prev) => {
              notifyExecutionCompleted(trimmed, '', '');
              return {
                ...prev,
                [targetDeviceId]: '',
              };
            });
          } else {
            const rawOutput = simResult.output ? simResult.output.trim() : '';
            const outputLines = rawOutput ? rawOutput.split('\n') : [];
            const shouldPageOutput = !autoShowAllOnExec && !isAutoExec && !options?.autoShowAll && !options?.inspectAfter && outputLines.length > 22;

            if (shouldPageOutput) {
              const firstChunk = outputLines.slice(0, 20).join('\n');
              const remaining = outputLines.slice(20);

              setVirtualPagerBuffers((prev) => ({
                ...prev,
                [targetDeviceId]: {
                  pendingLines: remaining,
                  nextPrompt,
                  pageSize: 20,
                },
              }));

              setLogsByDevice((prev) => {
                const prevDevLog = prev[targetDeviceId] || '';
                const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
                const nextLog = buildNextTerminalLog(
                  curDisplay,
                  targetPrompt,
                  trimmed,
                  `${firstChunk}\n--More--`,
                  '',
                  isPassword
                );
                notifyExecutionCompleted(trimmed, rawOutput, nextLog);
                return {
                  ...prev,
                  [targetDeviceId]: nextLog,
                };
              });
            } else {
              setVirtualPagerBuffers((prev) => {
                const next = { ...prev };
                delete next[targetDeviceId];
                return next;
              });
              setLogsByDevice((prev) => {
                const prevDevLog = prev[targetDeviceId] || '';
                const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
                const nextLog = buildNextTerminalLog(
                  curDisplay,
                  targetPrompt,
                  trimmed,
                  rawOutput || undefined,
                  nextPrompt,
                  isPassword
                );
                notifyExecutionCompleted(trimmed, rawOutput, nextLog);
                return {
                  ...prev,
                  [targetDeviceId]: nextLog,
                };
              });
            }
          }
          return;
        }

        if (!written) {
          onUpdateDeviceStatus(targetDeviceId, 'disconnected');
          setLogsByDevice((prev) => {
            const errMsg = `[✕] Gagal mengirim data ke port serial '${targetDevice.name}' (koneksi terputus). Silakan klik 'Connect' di pojok kanan atas untuk menghubungkan kabel serial.`;
            const nextLog = `${prev[targetDeviceId] || ''}\n${errMsg}\n`;
            notifyExecutionCompleted(trimmed, errMsg, nextLog);
            return {
              ...prev,
              [targetDeviceId]: nextLog,
            };
          });
        } else if (options?.inspectAfter || options?.onCompleted) {
          const curLog = logsByDevice[targetDeviceId] || '';
          if (pendingHardwareExecRef.current?.timer) {
            clearTimeout(pendingHardwareExecRef.current.timer);
          }
          pendingHardwareExecRef.current = {
            deviceId: targetDeviceId,
            command: trimmed,
            startLogLength: curLog.length,
            options,
            timer: setTimeout(() => {
              if (pendingHardwareExecRef.current && pendingHardwareExecRef.current.deviceId === targetDeviceId) {
                const latestLog = (window as any).activeTerminalLogs || logsByDevice[targetDeviceId] || '';
                const produced = latestLog.slice(pendingHardwareExecRef.current.startLogLength).trim();
                notifyExecutionCompleted(trimmed, produced, latestLog);
                pendingHardwareExecRef.current = null;
              }
            }, 3000),
          };
        }
        return;
      }

      // Default fallback
      if (simResult.output === '__CLEAR__') {
        setVirtualPagerBuffers((prev) => {
          const next = { ...prev };
          delete next[targetDeviceId];
          return next;
        });
        setLogsByDevice((prev) => {
          notifyExecutionCompleted(trimmed, '', '');
          return {
            ...prev,
            [targetDeviceId]: '',
          };
        });
      } else {
        const rawOutput = simResult.output ? simResult.output.trim() : '';
        const outputLines = rawOutput ? rawOutput.split('\n') : [];
        const shouldPageOutput = !autoShowAllOnExec && !isAutoExec && !options?.autoShowAll && !options?.inspectAfter && outputLines.length > 22;

        if (shouldPageOutput) {
          const firstChunk = outputLines.slice(0, 20).join('\n');
          const remaining = outputLines.slice(20);

          setVirtualPagerBuffers((prev) => ({
            ...prev,
            [targetDeviceId]: {
              pendingLines: remaining,
              nextPrompt,
              pageSize: 20,
            },
          }));

          setLogsByDevice((prev) => {
            const prevDevLog = prev[targetDeviceId] || '';
            const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
            const nextLog = buildNextTerminalLog(
              curDisplay,
              targetPrompt,
              trimmed,
              `${firstChunk}\n--More--`,
              '',
              isPassword
            );
            notifyExecutionCompleted(trimmed, rawOutput, nextLog);
            return {
              ...prev,
              [targetDeviceId]: nextLog,
            };
          });
        } else {
          setVirtualPagerBuffers((prev) => {
            const next = { ...prev };
            delete next[targetDeviceId];
            return next;
          });
          setLogsByDevice((prev) => {
            const prevDevLog = prev[targetDeviceId] || '';
            const { logHistory: curDisplay } = splitLogAndTrailingPrompt(prevDevLog, targetPrompt);
            const nextLog = buildNextTerminalLog(
              curDisplay,
              targetPrompt,
              trimmed,
              rawOutput || undefined,
              nextPrompt,
              isPassword
            );
            notifyExecutionCompleted(trimmed, rawOutput, nextLog);
            return {
              ...prev,
              [targetDeviceId]: nextLog,
            };
          });
        }
      }
    } finally {
      setTimeout(() => {
        isExecutingByDeviceRef.current[targetDeviceId] = false;
      }, 100);
    }
  };

  const handleWakeupPulse = async () => {
    if (!activeDevice) return;
    if (activeDevice.type === 'serial_cable' || activeDevice.type === 'serial_bluetooth') {
      await sendSerialWakeupPulse(activeDevice.id);
      const isVirtual = isVirtualSession(activeDevice.id);
      setLogsByDevice((prev) => ({
        ...prev,
        [currentDeviceId]: `${prev[currentDeviceId] || ''}\n[* Sinyal Wakeup (DTR/RTS & CR) terkirim ke port ${activeDevice.name} *]\n${isVirtual ? '\nRouter> ' : ''}`,
      }));
    } else {
      handleExecuteCommand('');
    }
  };

  const handleSendBreak = async () => {
    if (!activeDevice) return;
    const currentDeviceId = activeDevice.id;
    const isVirtual = isVirtualSession(currentDeviceId);

    try {
      await sendSerialBreakSignal(currentDeviceId);
      setLogsByDevice((prev) => {
        const cur = prev[currentDeviceId] || '';
        const breakNotice = `\n[⚡ Sinyal BREAK (Hardware Break / 350ms) terkirim ke ${activeDevice.name}]\n`;
        const simFeedback = isVirtual ? `\n*** BREAK SIGNAL RECEIVED BY BOOTLOADER ***\nSystem bootstrap, Version 15.4(3)M2\nEntering ROM Monitor recovery mode...\n\nrommon 1 > ` : '';
        return {
          ...prev,
          [currentDeviceId]: cur + breakNotice + simFeedback,
        };
      });

      if (isVirtual) {
        setHostnamesByDevice((prev) => ({ ...prev, [currentDeviceId]: 'rommon 1 >' }));
      }
    } catch (err: any) {
      setLogsByDevice((prev) => ({
        ...prev,
        [currentDeviceId]: `${prev[currentDeviceId] || ''}\n[✕ Gagal mengirim sinyal BREAK: ${err?.message || 'Error'}]\n`,
      }));
    }
  };

  const handleLineEndingChange = (newEnding: 'cr' | 'crlf' | 'lf') => {
    if (!activeDevice) return;
    activeDevice.lineEnding = newEnding;
    setLogsByDevice((prev) => ({
      ...prev,
      [currentDeviceId]: `${prev[currentDeviceId] || ''}\n[* Format Line Ending Enter diubah ke: ${newEnding.toUpperCase()} *]\n`,
    }));
  };

  const handleSwapDevices = () => {
    if (!activeDevice || !secondaryDevice) return;
    const oldPrimary = activeDevice.id;
    const oldSecondary = secondaryDevice.id;
    onSelectTab(oldSecondary);
    if (onSelectSecondaryDevice) {
      onSelectSecondaryDevice(oldPrimary);
    }
  };

  const handleCompareWithAiDual = () => {
    if (!activeDevice || !secondaryDevice) return;
    const logA = sanitizeTerminalLog(logsByDevice[activeDevice.id] || '');
    const logB = sanitizeTerminalLog(logsByDevice[secondaryDevice.id] || '');
    const devAName = hostnamesByDevice[activeDevice.id] || activeDevice.hostname || activeDevice.name;
    const devBName = hostnamesByDevice[secondaryDevice.id] || secondaryDevice.hostname || secondaryDevice.name;

    const comparativePrompt = `Halo 69 AI, tolong lakukan perbandingan teknis dan troubleshooting antara dua perangkat jaringan berikut:

--- PERANGKAT 1: ${devAName} (${activeDevice.brand || activeDevice.type}, IP/Port: ${activeDevice.ipOrPortLabel || 'N/A'}) ---
\`\`\`
${logA.slice(-3000)}
\`\`\`

--- PERANGKAT 2: ${devBName} (${secondaryDevice.brand || secondaryDevice.type}, IP/Port: ${secondaryDevice.ipOrPortLabel || 'N/A'}) ---
\`\`\`
${logB.slice(-3000)}
\`\`\`

Tolong berikan analisa mendalam:
1. **Perbandingan Status & Konfigurasi** (Status interface UP/DOWN, IP/Subnet, routing BGP/OSPF, VLAN, MTU).
2. **Identifikasi Masalah & Ketidaksesuaian (Mismatch/Anomaly)** antara kedua perangkat.
3. **Rekomendasi Perintah CLI Lanjutan & Solusi Perbaikan** langkah demi langkah.`;

    if (onCompareWithAi) {
      onCompareWithAi(comparativePrompt);
    } else {
      onInspectTerminal(comparativePrompt);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = broadcastInput.trim();
    if (!cmd || isBroadcasting) return;
    setIsBroadcasting(true);
    setBroadcastInput('');

    try {
      const tasks: Promise<any>[] = [];
      if (activeDevice) {
        tasks.push(handleExecuteCommand(cmd, { targetDev: activeDevice }));
      }
      if (secondaryDevice && secondaryDevice.id !== activeDevice?.id) {
        tasks.push(handleExecuteCommand(cmd, { targetDev: secondaryDevice }));
      }
      await Promise.allSettled(tasks);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleBaudRateChange = async (newBaud: number) => {
    if (!activeDevice) return;
    activeDevice.baudRate = newBaud;
    setLogsByDevice((prev) => ({
      ...prev,
      [currentDeviceId]: `${prev[currentDeviceId] || ''}\n[* Kecepatan Baud diubah ke ${newBaud} bps. Menghubungkan ulang port... *]\n`,
    }));
    await disconnectSerialSession(activeDevice.id);
    handleConnectDevice(activeDevice);
  };

  const isAutoPagingRef = useRef<boolean>(false);
  const autoPagingTimerRef = useRef<any>(null);

  const handlePageNext = async () => {
    if (!activeDevice) return;

    if (activeDevice.type === 'serial_cable' || activeDevice.type === 'serial_bluetooth') {
      // Send raw Space character without extra newline/CR
      await writeToActiveSerialDevice(currentDeviceId, ' ', 'none');
    } else if (activeDevice.type === 'ssh' || activeDevice.type === 'telnet') {
      const android = (window as any).AndroidNative;
      const desktop = (window as any).DesktopNative;
      if (android && typeof android.writeSsh === 'function') {
        try { android.writeSsh(currentDeviceId, ' '); } catch (e) {}
      } else if (desktop && typeof desktop.writeSsh === 'function') {
        try { await desktop.writeSsh(currentDeviceId, ' '); } catch (e) {}
      } else if (webSshEventSourcesRef.current.has(currentDeviceId)) {
        fetch(`/api/ssh/session/${encodeURIComponent(currentDeviceId)}/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: ' ' }),
        }).catch(() => {});
      }
    }

    const buf = virtualPagerBuffers[currentDeviceId];
    if (buf && buf.pendingLines.length > 0) {
      const chunkSize = buf.pageSize || 20;
      const chunk = buf.pendingLines.slice(0, chunkSize);
      const remaining = buf.pendingLines.slice(chunkSize);

      setLogsByDevice((prev) => {
        const cur = (prev[currentDeviceId] || '').replace(PAGER_LINE_REGEX, '');
        const chunkText = chunk.join('\n');
        if (remaining.length > 0) {
          return {
            ...prev,
            [currentDeviceId]: `${cur ? cur + '\n' : ''}${chunkText}\n--More--`,
          };
        } else {
          return {
            ...prev,
            [currentDeviceId]: `${cur ? cur + '\n' : ''}${chunkText}\n${buf.nextPrompt || currentPrompt}`,
          };
        }
      });

      if (remaining.length > 0) {
        setVirtualPagerBuffers((prev) => ({
          ...prev,
          [currentDeviceId]: { ...buf, pendingLines: remaining },
        }));
      } else {
        setVirtualPagerBuffers((prev) => {
          const next = { ...prev };
          delete next[currentDeviceId];
          return next;
        });
      }
    } else {
      // Fallback: If virtual buffer is missing or finished, clean pager marker and restore prompt
      setLogsByDevice((prev) => {
        const cur = prev[currentDeviceId] || '';
        if (PAGER_LINE_REGEX.test(cur)) {
          const cleaned = cur.replace(PAGER_LINE_REGEX, '');
          return {
            ...prev,
            [currentDeviceId]: `${cleaned}\n${currentPrompt}`,
          };
        }
        return prev;
      });
    }
  };

  const handlePageNextLine = async () => {
    if (!activeDevice) return;

    if (activeDevice.type === 'serial_cable' || activeDevice.type === 'serial_bluetooth') {
      // Send raw CR '\r'
      await writeToActiveSerialDevice(currentDeviceId, '', 'cr');
    } else if (activeDevice.type === 'ssh' || activeDevice.type === 'telnet') {
      const android = (window as any).AndroidNative;
      const desktop = (window as any).DesktopNative;
      if (android && typeof android.writeSsh === 'function') {
        try { android.writeSsh(currentDeviceId, '\r'); } catch (e) {}
      } else if (desktop && typeof desktop.writeSsh === 'function') {
        try { await desktop.writeSsh(currentDeviceId, '\r'); } catch (e) {}
      } else if (webSshEventSourcesRef.current.has(currentDeviceId)) {
        fetch(`/api/ssh/session/${encodeURIComponent(currentDeviceId)}/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: '\r' }),
        }).catch(() => {});
      }
    }

    const buf = virtualPagerBuffers[currentDeviceId];
    if (buf && buf.pendingLines.length > 0) {
      const singleLine = buf.pendingLines[0];
      const remaining = buf.pendingLines.slice(1);

      setLogsByDevice((prev) => {
        const cur = (prev[currentDeviceId] || '').replace(PAGER_LINE_REGEX, '');
        if (remaining.length > 0) {
          return {
            ...prev,
            [currentDeviceId]: `${cur ? cur + '\n' : ''}${singleLine}\n--More--`,
          };
        } else {
          return {
            ...prev,
            [currentDeviceId]: `${cur ? cur + '\n' : ''}${singleLine}\n${buf.nextPrompt || currentPrompt}`,
          };
        }
      });

      if (remaining.length > 0) {
        setVirtualPagerBuffers((prev) => ({
          ...prev,
          [currentDeviceId]: { ...buf, pendingLines: remaining },
        }));
      } else {
        setVirtualPagerBuffers((prev) => {
          const next = { ...prev };
          delete next[currentDeviceId];
          return next;
        });
      }
    } else {
      // Fallback: If virtual buffer is missing or finished, clean pager marker and restore prompt
      setLogsByDevice((prev) => {
        const cur = prev[currentDeviceId] || '';
        if (PAGER_LINE_REGEX.test(cur)) {
          const cleaned = cur.replace(PAGER_LINE_REGEX, '');
          return {
            ...prev,
            [currentDeviceId]: `${cleaned}\n${currentPrompt}`,
          };
        }
        return prev;
      });
    }
  };

  const handlePageQuit = async () => {
    if (!activeDevice) return;
    isAutoPagingRef.current = false;
    if (autoPagingTimerRef.current) clearTimeout(autoPagingTimerRef.current);

    if (activeDevice.type === 'serial_cable' || activeDevice.type === 'serial_bluetooth') {
      await writeToActiveSerialDevice(currentDeviceId, 'q', 'none');
    } else if (activeDevice.type === 'ssh' || activeDevice.type === 'telnet') {
      const android = (window as any).AndroidNative;
      const desktop = (window as any).DesktopNative;
      if (android && typeof android.writeSsh === 'function') {
        try { android.writeSsh(currentDeviceId, 'q'); } catch (e) {}
      } else if (desktop && typeof desktop.writeSsh === 'function') {
        try { await desktop.writeSsh(currentDeviceId, 'q'); } catch (e) {}
      } else if (webSshEventSourcesRef.current.has(currentDeviceId)) {
        fetch(`/api/ssh/session/${encodeURIComponent(currentDeviceId)}/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: 'q' }),
        }).catch(() => {});
      }
    }

    const buf = virtualPagerBuffers[currentDeviceId];
    const promptToRestore = buf?.nextPrompt || currentPrompt;

    setLogsByDevice((prev) => {
      const cur = (prev[currentDeviceId] || '').replace(PAGER_LINE_REGEX, '');
      return {
        ...prev,
        [currentDeviceId]: `${cur}\n${promptToRestore}`,
      };
    });

    setVirtualPagerBuffers((prev) => {
      const next = { ...prev };
      delete next[currentDeviceId];
      return next;
    });
  };

  const handlePageAll = async () => {
    if (!activeDevice) return;

    const buf = virtualPagerBuffers[currentDeviceId];
    if (buf && buf.pendingLines.length > 0) {
      const allRemaining = buf.pendingLines.join('\n');
      setLogsByDevice((prev) => {
        const cur = (prev[currentDeviceId] || '').replace(PAGER_LINE_REGEX, '');
        return {
          ...prev,
          [currentDeviceId]: `${cur ? cur + '\n' : ''}${allRemaining}\n${buf.nextPrompt || currentPrompt}`,
        };
      });
      setVirtualPagerBuffers((prev) => {
        const next = { ...prev };
        delete next[currentDeviceId];
        return next;
      });
      return;
    }

    // Loop space transmission until pager finishes or safety limit reached
    isAutoPagingRef.current = true;
    let iterations = 0;
    const runAutoStep = async () => {
      if (!isAutoPagingRef.current || iterations >= 200) {
        isAutoPagingRef.current = false;
        return;
      }
      const curLog = (window as any).activeTerminalLogs || logsByDeviceRef.current[currentDeviceId] || logsByDevice[currentDeviceId] || '';
      const pagerInfo = detectTerminalPager(curLog);
      if (!pagerInfo.isPager && iterations > 0) {
        isAutoPagingRef.current = false;
        return;
      }
      await handlePageNext();
      iterations++;
      autoPagingTimerRef.current = setTimeout(runAutoStep, 60);
    };
    runAutoStep();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeDevice) return;

    // 1. Pager mode active handling
    if (isPagerActive) {
      if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
        e.preventDefault();
        e.stopPropagation();
        handlePageNext();
        return;
      }
      if ((e.key === 'q' || e.key === 'Q') && !currentInput) {
        e.preventDefault();
        e.stopPropagation();
        handlePageQuit();
        return;
      }
      if (e.key === 'Enter' && !currentInput) {
        e.preventDefault();
        e.stopPropagation();
        handlePageNextLine();
        return;
      }
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
        const selectedText = window.getSelection()?.toString();
        if (selectedText && selectedText.length > 0) {
          try {
            navigator.clipboard.writeText(selectedText);
          } catch (_) {}
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handlePageQuit();
        return;
      }
    }

    if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
      e.preventDefault();
      e.stopPropagation();
      if (activeDevice.status === 'disconnected') {
        handleConnectDevice(activeDevice);
        return;
      }
      if (isPagerActive) {
        handlePageNext();
        return;
      }
      handleExecuteCommand(currentInput);
    } else if (e.key === 'ArrowUp') {
      if (isMaskedPassword) return;
      e.preventDefault();
      handleHistoryUp();
    } else if (e.key === 'ArrowDown') {
      if (isMaskedPassword) return;
      e.preventDefault();
      handleHistoryDown();
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      handleCtrlL();
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')) {
      const selectedText = window.getSelection()?.toString();
      if (selectedText && selectedText.length > 0) {
        try {
          navigator.clipboard.writeText(selectedText);
        } catch (_) {}
        return;
      }
      e.preventDefault();
      handleCtrlC();
    } else if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      e.stopPropagation();
      handleCtrlZ();
    } else if (e.ctrlKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      if (inputRef.current) {
        inputRef.current.setSelectionRange(0, 0);
      }
    } else if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      if (inputRef.current) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    } else if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      setCurrentInputs((prev) => ({ ...prev, [currentDeviceId]: '' }));
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } else if (e.ctrlKey && (e.key === 'w' || e.key === 'W')) {
      e.preventDefault();
      if (inputRef.current) {
        const pos = inputRef.current.selectionStart || 0;
        const val = inputRef.current.value;
        const before = val.slice(0, pos).trimEnd();
        const lastSpace = before.lastIndexOf(' ');
        const newBefore = lastSpace === -1 ? '' : before.slice(0, lastSpace + 1);
        const after = val.slice(pos);
        const nextVal = newBefore + after;
        setCurrentInputs((prev) => ({ ...prev, [currentDeviceId]: nextVal }));
        inputRef.current.value = nextVal;
        const newPos = newBefore.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    } else if (
      e.key === 'Pause' || 
      (e.ctrlKey && (e.key === 'Pause' || e.code === 'Pause' || e.key === 'Break')) || 
      (e.ctrlKey && e.shiftKey && (e.key === 'b' || e.key === 'B'))
    ) {
      e.preventDefault();
      e.stopPropagation();
      handleSendBreak();
    } else if (e.key === 'Tab') {
      if (isMaskedPassword) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      handleTabKey();
    } else if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (isMaskedPassword) {
        // When typing password, '?' is a valid password character, do not intercept as CLI help
        return;
      }
      // Network CLI Context-sensitive Help (? key)
      e.preventDefault();
      handleContextHelpKey();
    }
  };

  // Virtual Key Helper Actions for Mobile / Touch Screens
  const handleHistoryUp = () => {
    if (currentHistory.length > 0) {
      const nextIndex = currentHistoryIndex === -1 ? currentHistory.length - 1 : Math.max(0, currentHistoryIndex - 1);
      setHistoryIndexes((prev) => ({ ...prev, [currentDeviceId]: nextIndex }));
      setCurrentInputs((prev) => ({ ...prev, [currentDeviceId]: currentHistory[nextIndex] || '' }));
    }
  };

  const handleHistoryDown = () => {
    if (currentHistoryIndex !== -1) {
      const nextIndex = currentHistoryIndex + 1;
      if (nextIndex >= currentHistory.length) {
        setHistoryIndexes((prev) => ({ ...prev, [currentDeviceId]: -1 }));
        setCurrentInputs((prev) => ({ ...prev, [currentDeviceId]: '' }));
      } else {
        setHistoryIndexes((prev) => ({ ...prev, [currentDeviceId]: nextIndex }));
        setCurrentInputs((prev) => ({ ...prev, [currentDeviceId]: currentHistory[nextIndex] || '' }));
      }
    }
  };

  const handleCtrlC = async () => {
    if (!activeDevice) return;
    if ((activeDevice.type === 'ssh' || activeDevice.type === 'telnet') && typeof window !== 'undefined') {
      const android = (window as any).AndroidNative;
      if (android && typeof android.writeSsh === 'function') {
        try {
          android.writeSsh(currentDeviceId, '\x03');
        } catch (e) {}
      }
      const desktop = (window as any).DesktopNative;
      if (desktop && typeof desktop.writeSsh === 'function') {
        try {
          await desktop.writeSsh(currentDeviceId, '\x03');
        } catch (e) {}
      }
      if (webSshEventSourcesRef.current.has(currentDeviceId)) {
        fetch(`/api/ssh/session/${encodeURIComponent(currentDeviceId)}/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: '\x03' }),
        }).catch(() => {});
      }
    }
    setLogsByDevice((prev) => ({
      ...prev,
      [currentDeviceId]: `${prev[currentDeviceId] || ''}^C\n${currentPrompt}`,
    }));
    setCurrentInputs((prev) => ({ ...prev, [currentDeviceId]: '' }));
  };

  const handleCtrlZ = async () => {
    if (!activeDevice) return;
    if ((activeDevice.type === 'ssh' || activeDevice.type === 'telnet') && typeof window !== 'undefined') {
      const android = (window as any).AndroidNative;
      if (android && typeof android.writeSsh === 'function') {
        try {
          android.writeSsh(currentDeviceId, '\x1a');
        } catch (e) {}
      }
      const desktop = (window as any).DesktopNative;
      if (desktop && typeof desktop.writeSsh === 'function') {
        try {
          await desktop.writeSsh(currentDeviceId, '\x1a');
        } catch (e) {}
      }
      if (webSshEventSourcesRef.current.has(currentDeviceId)) {
        fetch(`/api/ssh/session/${encodeURIComponent(currentDeviceId)}/write`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: '\x1a' }),
        }).catch(() => {});
      }
    }
    if (activeDevice.type === 'serial_cable' || activeDevice.type === 'serial_bluetooth') {
      try {
        await writeToActiveSerialDevice(currentDeviceId, '\x1a', 'none');
      } catch (e) {}
    }

    // In Cisco / network CLI standard: Ctrl+Z exits config mode to privileged EXEC
    const isInConfig = currentMode.startsWith('config') || currentMode.includes('config');
    const targetMode = isInConfig ? 'privileged' : currentMode;
    if (isInConfig) {
      setModesByDevice((prev) => ({ ...prev, [currentDeviceId]: 'privileged' }));
    }
    const resolvedPrompt = getDevicePrompt(activeDevice, targetMode, currentHostname);
    const msg = isInConfig ? '^Z\n%SYS-5-CONFIG_I: Configured from console by console\n' : '^Z\n';

    setLogsByDevice((prev) => ({
      ...prev,
      [currentDeviceId]: `${prev[currentDeviceId] || ''}${msg}${resolvedPrompt}`,
    }));
    setCurrentInputs((prev) => ({ ...prev, [currentDeviceId]: '' }));
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleCtrlL = async () => {
    if (!activeDevice) return;
    if ((activeDevice.type === 'ssh' || activeDevice.type === 'telnet') && typeof window !== 'undefined') {
      const android = (window as any).AndroidNative;
      if (android && typeof android.writeSsh === 'function') {
        try {
          android.writeSsh(currentDeviceId, '\x0c');
        } catch (e) {}
      }
      const desktop = (window as any).DesktopNative;
      if (desktop && typeof desktop.writeSsh === 'function') {
        try {
          await desktop.writeSsh(currentDeviceId, '\x0c');
        } catch (e) {}
      }
    }
    setLogsByDevice((prev) => ({
      ...prev,
      [currentDeviceId]: `${currentPrompt}`,
    }));
  };

  const handleTabKey = () => {
    if (!activeDevice) return;
    const brand = activeDevice.brand || 'cisco';
    const result = handleCliTabCompletion(currentInput, brand, currentMode);
    
    // TAB strictly autocompletes the input text in-place without moving line or appending enters
    if (result.completedInput && result.completedInput !== currentInput) {
      setCurrentInputs((prev) => ({
        ...prev,
        [currentDeviceId]: result.completedInput,
      }));
      // Keep focus on input element and position cursor at end
      if (inputRef.current) {
        inputRef.current.value = result.completedInput;
        inputRef.current.focus();
        const len = result.completedInput.length;
        inputRef.current.setSelectionRange(len, len);
      }
      return;
    }

    // Standard PuTTY / SecureCRT / Transit IT terminal behavior:
    // If ambiguous or user pressed Tab on partial command with multiple candidates,
    // print candidate list and re-show the prompt with the input so user can continue typing
    if (result.candidates && result.candidates.length > 1) {
      const candidatesTable = result.helpOutput || result.candidates.join('    ');
      setLogsByDevice((prev) => ({
        ...prev,
        [currentDeviceId]: `${prev[currentDeviceId] || ''}${currentPrompt}${currentInput}\n${candidatesTable}\n`,
      }));
      if (inputRef.current) {
        inputRef.current.focus();
        const len = currentInput.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  };

  const handleContextHelpKey = () => {
    if (!activeDevice) return;
    const brand = activeDevice.brand || 'cisco';
    const result = handleCliContextHelp(currentInput, brand, currentMode);
    
    setLogsByDevice((prev) => ({
      ...prev,
      [currentDeviceId]: `${prev[currentDeviceId] || ''}${currentPrompt}${currentInput}?\n${result.helpOutput}\n`,
    }));

    setCurrentInputs((prev) => ({
      ...prev,
      [currentDeviceId]: result.originalInput,
    }));
  };

  const handleCopyLogs = () => {
    copyToClipboard(currentLog);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyDeviceLog = (devId: string) => {
    const textToCopy = logsByDevice[devId] || (devId === activeDevice?.id ? currentLog : '');
    copyToClipboard(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDisconnectDevice = async (dev: DeviceProfile) => {
    onUpdateDeviceStatus(dev.id, 'disconnected');
    if (webSshEventSourcesRef.current.has(dev.id)) {
      webSshEventSourcesRef.current.get(dev.id)?.close();
      webSshEventSourcesRef.current.delete(dev.id);
      fetch(`/api/ssh/session/${encodeURIComponent(dev.id)}/close`, { method: 'POST' }).catch(() => {});
    }
    const android = (window as any).AndroidNative;
    if (android && typeof android.disconnectSsh === 'function') {
      try { android.disconnectSsh(dev.id); } catch (e) {}
    }
    const desktop = (window as any).DesktopNative;
    if (desktop && typeof desktop.disconnectSsh === 'function') {
      try { desktop.disconnectSsh(dev.id); } catch (e) {}
    }
    await disconnectSerialSession(dev.id);
    setLogsByDevice((prev) => ({
      ...prev,
      [dev.id]: `${prev[dev.id] || ''}\n\nsession ended: port/session disconnected — tekan Enter atau klik Connect untuk menghubungkan ulang\n`,
    }));
  };

  const handleClear = () => {
    if (!activeDevice) return;
    setLogsByDevice((prev) => ({
      ...prev,
      [currentDeviceId]: `${currentPrompt}`,
    }));
  };

  const handleToggleConnect = async () => {
    if (!activeDevice) return;
    if (activeDevice.status === 'connected') {
      handleDisconnectDevice(activeDevice);
    } else {
      handleConnectDevice(activeDevice);
    }
  };

  const handleDirectInspect = () => {
    if (activeAnomaly) {
      handleInspectAnomaly(activeAnomaly);
    } else {
      onInspectTerminal(currentLog);
    }
  };

  const getConnectionIcon = (type: string) => {
    switch (type) {
      case 'serial_cable':
        return <Cable className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
      case 'serial_bluetooth':
        return <Bluetooth className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
      case 'ssh':
        return <Server className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
      default:
        return <TerminalIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />;
    }
  };

  // Switch to next/previous tab
  const handlePrevTab = () => {
    if (openDevices.length <= 1) return;
    const currentIndex = openDevices.findIndex((d) => d.id === currentDeviceId);
    const prevIndex = (currentIndex - 1 + openDevices.length) % openDevices.length;
    onSelectTab(openDevices[prevIndex].id);
  };

  const handleNextTab = () => {
    if (openDevices.length <= 1) return;
    const currentIndex = openDevices.findIndex((d) => d.id === currentDeviceId);
    const nextIndex = (currentIndex + 1) % openDevices.length;
    onSelectTab(openDevices[nextIndex].id);
  };

  // Devices not yet opened in tabs
  const unopenedDevices = allDevices.filter(
    (dev) => !openDevices.some((open) => open.id === dev.id)
  );

  return (
    <div 
      id="terminal-screen-main-container"
      ref={containerRef}
      className={`flex-1 flex flex-col h-full bg-black border-slate-800 overflow-hidden w-full ${
        isFullscreen ? 'fixed inset-0 z-50' : 'relative'
      }`}
    >
      {/* 1. Multi-Tab Navigation Bar at Top - Responsive for Mobile & Desktop */}
      <div 
        id="terminal-tabs-header-bar"
        className="h-10 sm:h-11 bg-slate-950 border-b border-slate-800 px-2 sm:px-3 flex items-center justify-between text-slate-300 select-none flex-shrink-0 gap-1.5"
      >
        {/* Left Side: Active Session Badge (when hideTabsInHeader) OR Full Tab Switcher */}
        {hideTabsInHeader && !isFullscreen ? (
          <div className="flex items-center gap-2 min-w-0 flex-1 py-1">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
              <span 
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  activeDevice?.status === 'connected' 
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' 
                    : activeDevice?.status === 'connecting' 
                    ? 'bg-amber-400 animate-pulse' 
                    : 'bg-slate-600'
                }`} 
              />
              {activeDevice && getConnectionIcon(activeDevice.type)}
              <span className="font-semibold text-white truncate max-w-[160px] sm:max-w-[220px]">
                {currentHostname || activeDevice?.hostname || resolveDeviceRealHostname(activeDevice || undefined) || activeDevice?.name || 'Terminal'}
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Left Side: Tabs List & Tab Switcher with touch smooth scroll */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0 flex-1 py-1">
              <button 
                id="btn-prev-tab"
                onClick={handlePrevTab}
                disabled={openDevices.length <= 1}
                title="Tab Sebelumnya"
                className="p-1.5 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Render individual device tabs */}
              {openDevices.map((dev) => {
                const isActive = dev.id === currentDeviceId;
                return (
                  <div
                    key={dev.id}
                    id={`terminal-tab-${dev.id}`}
                    onClick={() => onSelectTab(dev.id)}
                    className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-md text-xs font-mono cursor-pointer border-t border-x transition-all select-none whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-black text-white border-slate-700 shadow-xs'
                        : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border-transparent'
                    }`}
                  >
                    {/* Status Dot */}
                    <span 
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        dev.status === 'connected' ? 'bg-emerald-400' : dev.status === 'connecting' ? 'bg-amber-400 ' : 'bg-slate-600'
                      }`} 
                    />

                    {getConnectionIcon(dev.type)}

                    <div className="flex flex-col min-w-0 max-w-[100px] sm:max-w-[140px] text-left">
                      <span className="truncate font-sans font-medium text-[11px] sm:text-xs">
                        {hostnamesByDevice[dev.id] || dev.hostname || resolveDeviceRealHostname(dev) || dev.name}
                      </span>
                      {(hostnamesByDevice[dev.id] || dev.hostname || resolveDeviceRealHostname(dev)) && (hostnamesByDevice[dev.id] || dev.hostname || resolveDeviceRealHostname(dev)) !== dev.name && (
                        <span className="truncate text-[9px] text-slate-400 font-mono leading-none">
                          {dev.name}
                        </span>
                      )}
                    </div>

                    {/* Close Tab Button */}
                    <button
                      type="button"
                      id={`btn-close-tab-${dev.id}`}
                      title={`Tutup terminal ${dev.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab(dev.id);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              <button 
                id="btn-next-tab"
                onClick={handleNextTab}
                disabled={openDevices.length <= 1}
                title="Tab Berikutnya"
                className="p-1.5 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ALWAYS-VISIBLE PINNED ADD TAB BUTTON (FIXED OUTSIDE SCROLL CONTAINER - ICON ONLY) */}
            <div className="relative flex-shrink-0 flex items-center" ref={tabMenuRef}>
              <button
                id="btn-add-new-tab"
                onClick={() => setShowNewTabMenu(!showNewTabMenu)}
                title="Tambah / Buka Tab Terminal Baru (+)"
                className="flex items-center justify-center p-1.5 text-blue-300 hover:text-white bg-blue-950/70 hover:bg-blue-900 border border-blue-500/50 hover:border-blue-400 rounded-md transition-all shadow-xs active:scale-95 cursor-pointer select-none"
              >
                <Plus className="w-4 h-4 text-blue-400 hover:text-blue-300" />
              </button>

              {/* New Tab Dropdown */}
              {showNewTabMenu && (
                <div 
                  id="dropdown-new-tab-menu"
                  className="absolute left-0 top-full mt-1 w-60 sm:w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 z-50 text-xs animate-fadeIn"
                >
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    Buka Tab Sesi Terminal
                  </div>

                  <div className="max-h-48 overflow-y-auto py-1">
                    {unopenedDevices.length === 0 ? (
                      <div className="px-3 py-2 text-[11px] text-slate-500 text-center">
                        Semua perangkat sudah terbuka di tab.
                      </div>
                    ) : (
                      unopenedDevices.map((dev) => (
                        <button
                          key={dev.id}
                          id={`menu-open-device-${dev.id}`}
                          onClick={() => {
                            onOpenTab(dev.id);
                            setShowNewTabMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between text-slate-200 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {getConnectionIcon(dev.type)}
                            <span className="truncate font-medium">{hostnamesByDevice[dev.id] || dev.hostname || resolveDeviceRealHostname(dev) || dev.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {dev.ipOrPortLabel.split(' ')[0]}
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      id="menu-btn-create-new-device"
                      onClick={() => {
                        setShowNewTabMenu(false);
                        onOpenAddModal();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-blue-600/20 text-blue-400 flex items-center gap-1.5 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Perangkat Baru...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Right side controls - Clean icon-only row starting from Connect up to Bersihkan */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {activeDevice && (
            <>
              {/* Connect / Close Button (Icon Only) */}
              <button
                id="btn-terminal-close"
                onClick={handleToggleConnect}
                disabled={isConnecting}
                title={
                  activeDevice.status === 'connected'
                    ? 'Putus Koneksi Terminal (Close)'
                    : isConnecting
                    ? 'Sedang Menghubungkan...'
                    : 'Hubungkan Terminal (Connect)'
                }
                className={`p-1.5 rounded border transition-colors cursor-pointer flex items-center justify-center ${
                  activeDevice.status === 'connected'
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                    : isConnecting
                    ? 'bg-amber-950 border-amber-700 text-amber-300'
                    : 'bg-emerald-950 border-emerald-700 hover:bg-emerald-900 text-emerald-300'
                }`}
              >
                {isConnecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Power className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Informasi Koneksi Terminal & IP Button (Icon Only) */}
              <button
                type="button"
                id="btn-terminal-connection-info"
                onClick={() => setIsConnectionInfoOpen(true)}
                title="Informasi Detail Koneksi Terminal (IP, Port, Status & Log)"
                className="p-1.5 rounded border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-cyan-400 hover:text-cyan-200 transition-colors cursor-pointer flex items-center justify-center"
              >
                <Info className="w-3.5 h-3.5" />
              </button>

              {/* Direct AI Chat Toggle (Icon-only: Hide / Show Chat AI) */}
              <button
                type="button"
                id="btn-direct-inspect-terminal"
                onClick={() => onToggleAiPanel?.()}
                title={isAiPanelOpen ? "Sembunyikan Chat AI" : "Tampilkan Chat AI"}
                className={`flex items-center justify-center p-1.5 rounded font-medium border shadow-xs cursor-pointer transition-all ${
                  isAiPanelOpen
                    ? 'bg-blue-600/40 text-blue-200 border-blue-400/80 hover:bg-blue-600/60'
                    : 'bg-slate-800/90 text-blue-400 border-slate-700 hover:bg-slate-700 hover:text-blue-300'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              </button>

              {/* Tombol Snapshot (Ambil Snapshot Manual Langsung - Icon Only) */}
              <button
                type="button"
                id="btn-take-snapshot-direct"
                onClick={handleTakeSnapshotManual}
                title="Ambil Snapshot Konfigurasi Saat Ini (Manual)"
                className="flex items-center justify-center p-1.5 rounded font-medium border shadow-xs cursor-pointer transition-all bg-cyan-950/50 text-cyan-300 border-cyan-700/60 hover:bg-cyan-900/70 hover:border-cyan-400 active:scale-95"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              </button>

              {/* Config Snapshot & Visual Diff Compare Button (Icon Only with Badge) */}
              <button
                type="button"
                id="btn-config-snapshot-compare"
                onClick={() => {
                  setSnapshotModalInitialSide('diff');
                  setIsSnapshotModalOpen(true);
                }}
                title="Bandingkan Snapshot & Visual Diff Config (Pre vs Post Change)"
                className="relative flex items-center justify-center p-1.5 rounded font-medium border shadow-xs cursor-pointer transition-all bg-slate-800/90 text-cyan-300 border-slate-700 hover:bg-slate-700 hover:text-cyan-200 hover:border-cyan-500/60 active:scale-95"
              >
                <GitCompare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {snapshotCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-[15px] flex items-center justify-center text-[9.5px] font-mono font-bold bg-cyan-500 text-slate-950 rounded-full shadow-xs">
                    {snapshotCount > 99 ? '99+' : snapshotCount}
                  </span>
                )}
              </button>

              {/* Copy Terminal Buffer */}
              <button
                id="btn-copy-terminal-buffer"
                onClick={handleCopyLogs}
                title="Copy Semua Log Terminal"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors cursor-pointer flex items-center justify-center"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Bersihkan Layar Terminal / Chat */}
              <button
                id="btn-clear-terminal"
                onClick={handleClear}
                title="Bersihkan Layar Terminal & Chat (Ctrl+L)"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors shrink-0 cursor-pointer flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Top Quick Action Helper Toolbar - Positioned directly below tab & add row (Icon-Only Minimalist) */}
      {activeDevice && (
        <div 
          id="top-quick-keys-toolbar"
          className="bg-slate-950 border-b border-slate-800/80 px-2 sm:px-3 py-1 flex items-center justify-between gap-1 select-none flex-shrink-0 z-10"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 1. Tab Key (Icon Only) - In-place Autocomplete */}
            <button
              type="button"
              id="top-key-tab"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleTabKey();
              }}
              title="TAB (Auto-complete Command)"
              className="p-1.5 px-2.5 rounded bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-xs border border-blue-400/60 flex items-center justify-center cursor-pointer transition-colors"
            >
              <ArrowRightToLine className="w-3.5 h-3.5" />
            </button>

            {/* 2. Ctrl+C (Interrupt / Cancel SIGINT - Icon Only) */}
            <button
              type="button"
              id="top-key-ctrlc"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCtrlC();
              }}
              title="Ctrl+C / ^C (Interrupt / Cancel Command)"
              className="p-1.5 px-2.5 rounded bg-red-600/90 hover:bg-red-500 active:bg-red-700 text-white shadow-xs border border-red-400/60 flex items-center justify-center cursor-pointer transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>

            {/* 2.1 Ctrl+Z (CNTL/Z - Exit Config Mode to Privileged EXEC) */}
            <button
              type="button"
              id="top-key-ctrlz"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCtrlZ();
              }}
              title="Ctrl+Z / CNTL/Z (Exit Config Mode to Privileged EXEC)"
              className="px-2 py-1 rounded bg-amber-600/90 hover:bg-amber-500 active:bg-amber-700 text-white shadow-xs border border-amber-400/60 flex items-center justify-center text-[10px] font-mono font-bold cursor-pointer transition-colors"
            >
              ^Z
            </button>

            {/* 3. ? Context Help (Icon Only) */}
            <button
              type="button"
              id="top-key-help"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleContextHelpKey();
              }}
              title="? (Context Help / Sintaks CLI)"
              className="p-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-cyan-600 text-cyan-300 active:text-white shadow-xs border border-cyan-500/40 flex items-center justify-center cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {/* 4. Arrow Up Key (Icon Only - Command History Up) */}
            <button
              type="button"
              id="top-key-history-up"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleHistoryUp();
              }}
              title="Riwayat Perintah Sebelumnya (Panah Atas)"
              className="p-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-slate-200 active:text-white shadow-xs border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            {/* 5. Arrow Down Key (Icon Only - Command History Down) */}
            <button
              type="button"
              id="top-key-history-down"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleHistoryDown();
              }}
              title="Riwayat Perintah Berikutnya (Panah Bawah)"
              className="p-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-slate-200 active:text-white shadow-xs border border-slate-700 flex items-center justify-center cursor-pointer transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            {/* 6.1 Password Masking Security Mode Button */}
            <button
              type="button"
              id="top-key-password-mask"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isPasswordInput) {
                  setShowPasswordPlainText((prev) => !prev);
                } else {
                  setManualPasswordMask((prev) => !prev);
                }
                inputRef.current?.focus();
              }}
              title={
                isPasswordInput
                  ? showPasswordPlainText
                    ? 'Mode Sandi Terbuka: Klik untuk menyamarkan karakter (Mask)'
                    : 'Mode Sandi Terproteksi: Karakter disamarkan (••••). Klik untuk mengintip'
                  : 'Aktifkan Sensor / Masking Sandi untuk baris perintah saat ini'
              }
              className={`p-1.5 px-2.5 rounded flex items-center justify-center cursor-pointer transition-all ${
                isPasswordInput
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {isMaskedPassword ? (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              ) : isPasswordInput ? (
                <Eye className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          {/* 7. Enter Key (Icon Only) */}
          <button
            type="button"
            id="top-key-enter"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (activeDevice.status === 'disconnected') {
                handleConnectDevice(activeDevice);
                return;
              }
              if (isPagerActive) {
                handlePageNext();
                return;
              }
              handleExecuteCommand(currentInput);
            }}
            title="ENTER (Kirim / Eksekusi Perintah)"
            className="p-1.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center shadow-xs border border-emerald-400/60 cursor-pointer flex-shrink-0 transition-colors"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Info popover bar */}
      {showInfoModal && activeDevice && (
        <div 
          id="terminal-info-banner"
          className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2 text-xs flex items-center justify-between text-slate-300 select-text flex-wrap gap-2"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap font-mono text-[10px] sm:text-[11px]">
            <span><strong>Perangkat:</strong> {activeDevice.name}</span>
            <span><strong>Real Hostname:</strong> <span className="text-emerald-400 font-bold">{currentHostname || activeDevice.hostname || 'Mendeteksi...'}</span></span>
            <span><strong>Brand:</strong> {(activeDevice.brand || 'generic').toUpperCase()}</span>
            <span><strong>Model:</strong> {activeDevice.model || 'Unknown'}</span>
            <span><strong>Protokol:</strong> {(activeDevice.type || 'ssh').toUpperCase()}</span>
            <span><strong>Status:</strong> {(activeDevice.status || 'disconnected').toUpperCase()}</span>
            
            {(activeDevice.type === 'serial_cable' || activeDevice.type === 'serial_bluetooth') && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  <span className="text-slate-400">Baud Rate:</span>
                  <select
                    value={activeDevice.baudRate || 9600}
                    onChange={(e) => handleBaudRateChange(Number(e.target.value))}
                    className="bg-slate-900 text-amber-300 font-mono text-[11px] rounded px-1.5 py-0.5 border border-slate-700 outline-none cursor-pointer"
                  >
                    <option value={9600}>9600 bps (Cisco Default)</option>
                    <option value={115200}>115200 bps (Mikrotik/Linux)</option>
                    <option value={57600}>57600 bps</option>
                    <option value={38400}>38400 bps</option>
                    <option value={19200}>19200 bps</option>
                    <option value={4800}>4800 bps</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  <span className="text-slate-400">Enter Key:</span>
                  <select
                    value={activeDevice.lineEnding || 'cr'}
                    onChange={(e) => handleLineEndingChange(e.target.value as any)}
                    className="bg-slate-900 text-cyan-300 font-mono text-[11px] rounded px-1.5 py-0.5 border border-slate-700 outline-none cursor-pointer"
                  >
                    <option value="cr">CR (\r) [1x Enter Standar Router]</option>
                    <option value="crlf">CRLF (\r\n) [Windows]</option>
                    <option value="lf">LF (\n) [Unix/Linux Raw]</option>
                  </select>
                </div>

                <span className="text-emerald-400 text-[10px]">DTR/RTS: ACTIVE</span>
              </div>
            )}

            {activeDevice.type === 'serial_bluetooth' && (
              <div className="w-full mt-1.5 p-2 rounded bg-blue-950/40 border border-blue-900/50 text-[11px] font-sans text-blue-200/90 leading-relaxed">
                <div className="font-semibold text-blue-300 mb-0.5 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Petunjuk Hardware Adapter IRXON BT578:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-slate-300">
                  <li><strong>Lampu Hijau Menyala:</strong> Transmisi data (TX) aktif dari laptop ke IRXON.</li>
                  <li><strong>Jika tidak ada output balik dari router:</strong> Periksa saklar geser <strong>DCE / DTE</strong> di samping adapter IRXON. Geser ke <strong>DCE</strong> untuk kabel DB9-to-RJ45 konsol Cisco (jika di DTE, pin TX/RX terbalik).</li>
                  <li>Tekan tombol <strong>Enter 2x</strong> untuk memancing prompt router (`Router&gt;`).</li>
                  <li>Saat klik <strong>Close</strong>, koneksi GATT langsung diputus &amp; lampu LED biru kembali <strong>berkedip (blinking)</strong>.</li>
                </ul>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-android-irxon-info-bar"
              onClick={() => setShowAndroidModal(true)}
              title="Buka Diagnosa & Panduan IRXON Bluetooth di Android"
              className="px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 text-[10px] font-sans flex items-center gap-1"
            >
              <Smartphone className="w-3 h-3 text-blue-400" />
              <span>Diagnosa Android</span>
            </button>
            {onOpenIrxonAt && (
              <button
                type="button"
                id="btn-irxon-at-info-bar"
                onClick={onOpenIrxonAt}
                title="Buka Menu Khusus IRXON AT Command (Baud Rate, Name, PIN, dsb)"
                className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono flex items-center gap-1 transition-colors"
              >
                <Radio className="w-3 h-3 text-cyan-400" />
                <span>AT Command IRXON</span>
              </button>
            )}
            {activeDevice.type === 'serial_cable' && (
              <button
                type="button"
                onClick={handleWakeupPulse}
                title="Kirim Sinyal Wakeup / DTR-RTS ke Console Port"
                className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono flex items-center gap-1"
              >
                <span>⚡ Wakeup Console</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSendBreak}
              title="Kirim Sinyal Break (Hardware Break / Masuk ROMMON / Loader saat Booting)"
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>⚡ Send Break (ROMMON)</span>
            </button>
            <button 
              onClick={() => setShowInfoModal(false)}
              className="text-slate-500 hover:text-slate-200 text-xs p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Terminal Screen Canvas Body or Empty State */}
      {!activeDevice ? (
        <div 
          id="terminal-empty-state"
          className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black text-slate-400"
        >
          <div className="mb-4">
            <SixtyNineAiLogo size="xl" showGlow={true} />
          </div>
          <h3 className="font-semibold text-slate-200 text-sm mb-1">Tidak Ada Sesi Terminal Aktif</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            Pilih salah satu perangkat atau buka tab baru untuk memulai konsol CLI.
          </p>
          <div className="flex items-center gap-2">
            {allDevices.length > 0 && (
              <button
                id="btn-open-first-device-terminal"
                onClick={() => onOpenTab(allDevices[0].id)}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                Buka Terminal {allDevices[0].name.split(' ')[0]}
              </button>
            )}
            <button
              id="btn-add-device-empty-state"
              onClick={onOpenAddModal}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Tambah Perangkat
            </button>
          </div>
        </div>
      ) : splitMode !== 'none' ? (
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-black">
          {/* Split Mode Master Bar */}
          <div 
            id="split-terminal-master-bar" 
            className="bg-[#10141d] border-b border-neutral-800 px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap flex-shrink-0 z-20 text-xs"
          >
            {/* Left info & swap */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-mono text-[10.5px]">
                {splitMode === 'horizontal' ? <Split className="w-3 h-3 text-cyan-400" /> : <Rows className="w-3 h-3 text-cyan-400" />}
                <span className="font-semibold hidden xs:inline">Dual Terminal:</span>
                <span className="text-cyan-400 font-bold">{hostnamesByDevice[activeDevice.id] || activeDevice.hostname || activeDevice.name}</span>
                <ArrowRightLeft className="w-2.5 h-2.5 text-neutral-400" />
                <span className="text-emerald-400 font-bold">
                  {secondaryDevice ? (hostnamesByDevice[secondaryDevice.id] || secondaryDevice.hostname || secondaryDevice.name) : 'Pilih Perangkat 2'}
                </span>
              </div>

              {secondaryDevice && (
                <button
                  type="button"
                  id="btn-split-swap-devices"
                  onClick={handleSwapDevices}
                  title="Tukar Posisi Terminal Kiri & Kanan (Swap Panes)"
                  className="p-1 px-1.5 sm:px-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 flex items-center gap-1 transition-all cursor-pointer text-[11px]"
                >
                  <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
                  <span className="hidden sm:inline">Tukar</span>
                </button>
              )}
            </div>

            {/* Center Broadcast Form */}
            <form
              onSubmit={handleBroadcastSubmit}
              className="flex-1 max-w-sm sm:max-w-md flex items-center bg-black/60 border border-cyan-600/50 rounded-lg overflow-hidden focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-500/50 shadow-inner"
            >
              <div className="px-2 py-1 bg-cyan-950 text-cyan-300 border-r border-cyan-800 flex items-center gap-1 font-mono text-[10px] shrink-0">
                <Zap className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                <span className="font-semibold hidden sm:inline">Broadcast</span>
              </div>
              <input
                type="text"
                id="input-broadcast-command"
                value={broadcastInput}
                onChange={(e) => setBroadcastInput(e.target.value)}
                placeholder="Kirim perintah ke KEDUA perangkat..."
                disabled={isBroadcasting}
                className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder-neutral-500 outline-none font-mono min-w-0"
              />
              <button
                type="submit"
                disabled={!broadcastInput.trim() || isBroadcasting}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-medium text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Eksekusi ke kedua terminal sekaligus"
              >
                <Send className="w-3 h-3" />
                <span className="hidden xs:inline">Kirim</span>
              </button>
            </form>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {secondaryDevice && (
                <button
                  type="button"
                  id="btn-split-live-diff"
                  onClick={() => setIsLiveDiffModalOpen(true)}
                  title="Bandingkan Teks Output Live Side-by-Side (Diff)"
                  className="px-2 sm:px-2.5 py-1 rounded bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-700/60 font-medium text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                >
                  <GitCompare className="w-3 h-3 text-cyan-400" />
                  <span className="hidden xs:inline">Live Diff</span>
                </button>
              )}

              {secondaryDevice && (
                <button
                  type="button"
                  id="btn-split-ai-compare"
                  onClick={handleCompareWithAiDual}
                  title="Analisa Komparasi 2 Perangkat menggunakan 69 AI"
                  className="px-2 sm:px-2.5 py-1 rounded bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-medium text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span className="hidden md:inline">Analisa dengan 69 AI</span>
                  <span className="md:hidden">AI Diff</span>
                </button>
              )}

              <button
                type="button"
                id="btn-split-close-to-single"
                onClick={() => onSplitModeChange?.('none')}
                title="Tutup Mode Split (Kembali ke 1 Layar Penuh)"
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Panes Container: Horizontal (Side-by-Side) or Vertical (Stacked) */}
          <div className={`flex-1 ${
            splitMode === 'horizontal' 
              ? 'grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-800' 
              : 'grid grid-rows-2 divide-y divide-neutral-800'
          } overflow-hidden min-h-0 min-w-0`}>
            {/* Pane 1 (Primary / activeDevice) */}
            <SingleTerminalPaneView
              paneLabel="Terminal 1 (Utama)"
              paneColor="cyan"
              device={activeDevice}
              allDevices={allDevices}
              openDevices={openDevices}
              log={logsByDevice[activeDevice.id] || ''}
              currentInput={currentInputs[activeDevice.id] || ''}
              onChangeInput={(val) => setCurrentInputs((prev) => ({ ...prev, [activeDevice.id]: val }))}
              effectivePrompt={effectivePrompt}
              isConnecting={isConnecting}
              fontSize={terminalFontSize}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onExecute={(cmd) => handleExecuteCommand(cmd, { targetDev: activeDevice })}
              onConnect={() => handleConnectDevice(activeDevice)}
              onDisconnect={() => handleDisconnectDevice(activeDevice)}
              onClear={() => setLogsByDevice((prev) => ({ ...prev, [activeDevice.id]: '' }))}
              onCopy={() => handleCopyDeviceLog(activeDevice.id)}
              isCopied={isCopied}
              onSelectDevice={(id) => onSelectTab(id)}
              onInspectAi={() => onInspectTerminal(logsByDevice[activeDevice.id] || '')}
              onTakeSnapshot={() => triggerAutoConfigSnapshot('manual', 'post_change')}
              onOpenSnapshotDiff={() => {
                setSnapshotModalInitialSide('diff');
                setIsSnapshotModalOpen(true);
              }}
              snapshotCount={snapshotCount}
              isPagerActive={isPagerActive}
              pagerLabel={pagerLabel}
              onPageNext={handlePageNext}
              onPageNextLine={handlePageNextLine}
              onPageQuit={handlePageQuit}
              onPageAll={handlePageAll}
              autoShowAllOnExec={autoShowAllOnExec}
              onToggleAutoShowAllOnExec={toggleAutoShowAllOnExec}
              isPasswordInput={isPasswordInput}
              isMaskedPassword={isMaskedPassword}
              showPasswordPlainText={showPasswordPlainText}
              onTogglePasswordMask={() => setManualPasswordMask((prev) => !prev)}
              onToggleShowPasswordPlainText={() => setShowPasswordPlainText((prev) => !prev)}
              onTabKey={handleTabKey}
              onCtrlC={handleCtrlC}
              onCtrlZ={handleCtrlZ}
              onHelpKey={handleContextHelpKey}
              onHistoryUp={handleHistoryUp}
              onHistoryDown={handleHistoryDown}
              ColorizedTerminalOutputComponent={ColorizedTerminalOutput}
            />

            {/* Pane 2 (Secondary / secondaryDevice) */}
            <SingleTerminalPaneView
              paneLabel="Terminal 2 (Pembanding)"
              paneColor="emerald"
              device={secondaryDevice}
              allDevices={allDevices}
              openDevices={openDevices}
              log={secondaryDevice ? (logsByDevice[secondaryDevice.id] || '') : ''}
              currentInput={secondaryDevice ? (currentInputs[secondaryDevice.id] || '') : ''}
              onChangeInput={(val) => {
                if (secondaryDevice) {
                  setCurrentInputs((prev) => ({ ...prev, [secondaryDevice.id]: val }));
                }
              }}
              effectivePrompt={secondaryDevice ? getDevicePrompt(
                secondaryDevice,
                modesByDevice[secondaryDevice.id] || 'exec',
                hostnamesByDevice[secondaryDevice.id] || secondaryDevice.hostname || secondaryDevice.name
              ) : '>'}
              isConnecting={false}
              fontSize={terminalFontSize}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onExecute={(cmd) => {
                if (secondaryDevice) {
                  handleExecuteCommand(cmd, { targetDev: secondaryDevice });
                }
              }}
              onConnect={() => secondaryDevice && handleConnectDevice(secondaryDevice)}
              onDisconnect={() => secondaryDevice && handleDisconnectDevice(secondaryDevice)}
              onClear={() => secondaryDevice && setLogsByDevice((prev) => ({ ...prev, [secondaryDevice.id]: '' }))}
              onCopy={() => secondaryDevice && handleCopyDeviceLog(secondaryDevice.id)}
              isCopied={false}
              onSelectDevice={(id) => {
                if (onSelectSecondaryDevice) {
                  onSelectSecondaryDevice(id);
                }
              }}
              onInspectAi={() => secondaryDevice && onInspectTerminal(logsByDevice[secondaryDevice.id] || '')}
              onTakeSnapshot={() => {
                if (secondaryDevice) {
                  triggerAutoConfigSnapshot('manual', 'post_change');
                }
              }}
              onOpenSnapshotDiff={() => {
                setSnapshotModalInitialSide('diff');
                setIsSnapshotModalOpen(true);
              }}
              isPagerActive={false}
              onTabKey={() => {
                if (secondaryDevice) {
                  const curInput = currentInputs[secondaryDevice.id] || '';
                  const curMode = modesByDevice[secondaryDevice.id] || 'exec';
                  const res = handleCliTabCompletion(curInput, secondaryDevice.brand || 'cisco', curMode);
                  if (res.completedInput && res.completedInput !== curInput) {
                    setCurrentInputs((prev) => ({ ...prev, [secondaryDevice.id]: res.completedInput }));
                  } else if (res.candidates && res.candidates.length > 1) {
                    const prompt = getDevicePrompt(secondaryDevice, curMode, hostnamesByDevice[secondaryDevice.id] || secondaryDevice.hostname || secondaryDevice.name);
                    const table = res.helpOutput || res.candidates.join('    ');
                    setLogsByDevice((prev) => ({
                      ...prev,
                      [secondaryDevice.id]: `${prev[secondaryDevice.id] || ''}${prompt}${curInput}\n${table}\n`,
                    }));
                  }
                }
              }}
              onCtrlC={() => {
                if (secondaryDevice) {
                  setCurrentInputs((prev) => ({ ...prev, [secondaryDevice.id]: '' }));
                  const prompt = getDevicePrompt(secondaryDevice, modesByDevice[secondaryDevice.id] || 'exec', hostnamesByDevice[secondaryDevice.id] || secondaryDevice.hostname || secondaryDevice.name);
                  setLogsByDevice((prev) => ({
                    ...prev,
                    [secondaryDevice.id]: `${prev[secondaryDevice.id] || ''}^C\n${prompt}`,
                  }));
                }
              }}
              onCtrlZ={() => {
                if (secondaryDevice) {
                  setModesByDevice((prev) => ({ ...prev, [secondaryDevice.id]: 'privileged' }));
                  const prompt = getDevicePrompt(secondaryDevice, 'privileged', hostnamesByDevice[secondaryDevice.id] || secondaryDevice.hostname || secondaryDevice.name);
                  setLogsByDevice((prev) => ({
                    ...prev,
                    [secondaryDevice.id]: `${prev[secondaryDevice.id] || ''}\n% SYS-5-CONFIG_I: Configured from console by console\n${prompt}`,
                  }));
                }
              }}
              onHelpKey={() => {
                if (secondaryDevice) {
                  const curInput = currentInputs[secondaryDevice.id] || '';
                  const curMode = modesByDevice[secondaryDevice.id] || 'exec';
                  const res = handleCliContextHelp(curInput, secondaryDevice.brand || 'cisco', curMode);
                  const prompt = getDevicePrompt(secondaryDevice, curMode, hostnamesByDevice[secondaryDevice.id] || secondaryDevice.hostname || secondaryDevice.name);
                  setLogsByDevice((prev) => ({
                    ...prev,
                    [secondaryDevice.id]: `${prev[secondaryDevice.id] || ''}${prompt}${curInput}?\n${res.helpOutput}\n`,
                  }));
                }
              }}
              ColorizedTerminalOutputComponent={ColorizedTerminalOutput}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Snapshot Notification Toast */}
          {snapshotToastMessage && (
            <div 
              id="snapshot-notification-toast"
              className="bg-cyan-950/90 border-b border-cyan-500/50 px-3 py-1.5 text-xs text-cyan-200 flex items-center justify-between font-mono z-10 shrink-0"
            >
              <div className="flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{snapshotToastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSnapshotModalInitialSide('diff');
                  setIsSnapshotModalOpen(true);
                }}
                className="text-[11px] underline text-cyan-300 hover:text-white ml-2 cursor-pointer font-sans font-medium"
              >
                Lihat Diff
              </button>
            </div>
          )}
          <div 
            id="terminal-screen-body"
          ref={containerRef}
          onClick={handleTerminalBodyClick}
          className="flex-1 overflow-y-auto p-2.5 sm:p-4 font-mono leading-relaxed text-slate-100 bg-black cursor-text select-text will-change-scroll overscroll-contain min-w-0"
          style={{
            fontSize: `${terminalFontSize}px`,
            lineHeight: `${Math.max(1.35, terminalFontSize * 0.12)}`,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {displayLog && (
            <ColorizedTerminalOutput 
              rawText={displayLog} 
              onPageNext={handlePageNext}
              onPageNextLine={handlePageNextLine}
              onPageQuit={handlePageQuit}
              onPageAll={handlePageAll}
            />
          )}

          {/* Anomaly / Error Notice Banner with Manual AI Analysis Trigger */}
          {activeAnomaly && (
            <div 
              id="terminal-anomaly-alert-banner" 
              className="mx-2 mb-1 px-2.5 py-1.5 rounded-md bg-amber-950/80 border border-amber-500/50 flex items-center justify-between gap-2 text-xs select-none animate-fadeIn flex-shrink-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-amber-400 font-bold flex-shrink-0">⚠️ Error Terdeteksi:</span>
                <span className="text-amber-200 font-mono text-[11px] truncate">{activeAnomaly.title}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  id="btn-inspect-anomaly-manual"
                  onClick={() => handleInspectAnomaly(activeAnomaly)}
                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[11px] transition-colors shadow flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-black" />
                  <span>Analisa dengan AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDismissedAnomalySnippet(activeAnomaly.rawErrorLine);
                    setActiveAnomaly(null);
                  }}
                  className="px-1 py-0.5 text-amber-400 hover:text-white rounded transition-colors text-[11px] cursor-pointer"
                  title="Tutup notifikasi"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Interactive CLI Input Line with Inline Prompt & Universal Mobile Form Submit */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (activeDevice.status === 'disconnected') {
                handleConnectDevice(activeDevice);
                return;
              }
              if (isPagerActive) {
                handlePageNext();
                return;
              }
              handleExecuteCommand(currentInput);
            }}
            className="flex items-center font-mono mt-0.5 leading-normal w-full flex-nowrap min-w-0"
            style={{ fontSize: `${terminalFontSize}px` }}
          >
            <span className="text-emerald-400 font-mono font-bold whitespace-pre select-none flex-shrink-0">
              {effectivePrompt}
            </span>
            <input
              id="terminal-cli-input"
              ref={inputRef}
              type={isMaskedPassword ? "password" : "text"}
              enterKeyHint={isPagerActive ? 'next' : 'go'}
              value={currentInput}
              onChange={(e) => {
                const val = e.target.value;
                setCurrentInputs((prev) => ({ ...prev, [currentDeviceId]: val }));
              }}
              onKeyDown={handleKeyDown}
              style={{ fontSize: `${terminalFontSize}px` }}
              className="flex-1 bg-transparent border-none outline-none font-mono text-white caret-white p-0 m-0 min-w-0 w-full"
              autoFocus
              spellCheck={false}
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder={
                activeDevice.status === 'disconnected'
                  ? ' (Tekan Enter / Connect untuk menyambungkan)'
                  : isPagerActive
                  ? ' (Tekan Spasi untuk lanjut halaman, Enter untuk 1 baris, Q untuk stop)'
                  : isMaskedPassword
                  ? '•••••••• (Sandi Terproteksi / Masked)'
                  : ''
              }
            />
            {isPasswordInput && (
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0 select-none">
                <span 
                  title="Keamanan Terminal: Input ini dideteksi sebagai kata sandi dan karakter disamarkan secara aman."
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30"
                >
                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                  <span className="hidden sm:inline">Protected</span>
                </span>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPasswordPlainText((prev) => !prev);
                    inputRef.current?.focus();
                  }}
                  title={showPasswordPlainText ? "Sembunyikan karakter sandi (Mask)" : "Tampilkan karakter sandi sejenak"}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors cursor-pointer"
                >
                  {showPasswordPlainText ? (
                    <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
            )}
          </form>

          {/* Session ended status banner */}
          {activeDevice.status === 'disconnected' && (
            <div 
              id="session-ended-banner"
              className="mt-3 text-amber-400 text-[11px] sm:text-xs font-mono select-none flex items-center justify-between gap-2"
            >
              <span>session ended: remote disconnected — tekan Enter untuk mencoba kembali</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConnectionInfoOpen(true)}
                  className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-400 border border-neutral-700 transition-colors cursor-pointer"
                  title="Informasi Koneksi Terminal & IP"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleConnectDevice(activeDevice)}
                  className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] transition-colors cursor-pointer"
                >
                  Reconnect Now
                </button>
              </div>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>
        </>
      )}

      {/* Live Terminal Diff Modal */}
      {secondaryDevice && (
        <LiveTerminalDiffModal
          isOpen={isLiveDiffModalOpen}
          onClose={() => setIsLiveDiffModalOpen(false)}
          deviceA={activeDevice}
          deviceB={secondaryDevice}
          logA={logsByDevice[activeDevice?.id || ''] || ''}
          logB={logsByDevice[secondaryDevice.id] || ''}
          onSendToAiAssistant={(promptText) => {
            setIsLiveDiffModalOpen(false);
            if (onCompareWithAi) {
              onCompareWithAi(promptText);
            } else {
              onInspectTerminal(promptText);
            }
          }}
        />
      )}

      {/* Android IRXON Diagnostic & Solution Modal */}
      <AndroidIrxonModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
        onSelectTelnetBridge={() => {
          onOpenAddModal();
        }}
        onOpenIrxonAt={onOpenIrxonAt}
      />

      {/* Config Snapshot & Visual Diff Compare Modal */}
      <ConfigSnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        activeDevice={activeDevice}
        currentTerminalLog={currentLog}
        initialSide={snapshotModalInitialSide}
        onExecuteRollbackScript={async (script) => {
          if (!script || !activeDevice) return;
          const lines = script
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('!') && !l.startsWith('#'));

          for (const cmdLine of lines) {
            await handleExecuteCommand(cmdLine);
            await new Promise((resolve) => setTimeout(resolve, 180));
          }
        }}
      />

      {/* Connection Info & IP Modal */}
      <ConnectionInfoModal
        isOpen={isConnectionInfoOpen}
        onClose={() => setIsConnectionInfoOpen(false)}
        device={activeDevice}
        currentMode={modesByDevice[activeDevice?.id || ''] || 'exec'}
        currentHostname={hostnamesByDevice[activeDevice?.id || ''] || activeDevice?.hostname || activeDevice?.name}
        effectivePrompt={effectivePrompt}
        logText={currentLog}
        commandCount={(commandHistories[activeDevice?.id || ''] || []).length}
        onReconnect={() => activeDevice && handleConnectDevice(activeDevice)}
      />
    </div>
  );
};

