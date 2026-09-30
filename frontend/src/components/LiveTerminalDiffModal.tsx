import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  ArrowRightLeft, 
  Filter, 
  Maximize2, 
  Minimize2,
  Server,
  FileText
} from 'lucide-react';
import { DeviceProfile } from '../types';
import { copyToClipboard } from '../utils/clipboard';
import { sanitizeTerminalLog } from './TerminalScreen';

interface LiveTerminalDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceA: DeviceProfile | null;
  deviceB: DeviceProfile | null;
  logA: string;
  logB: string;
  onSendToAiAssistant?: (promptText: string) => void;
}

interface DiffLine {
  type: 'same' | 'added' | 'removed' | 'empty';
  textA?: string;
  textB?: string;
  lineNumA?: number;
  lineNumB?: number;
}

export const LiveTerminalDiffModal: React.FC<LiveTerminalDiffModalProps> = ({
  isOpen,
  onClose,
  deviceA,
  deviceB,
  logA,
  logB,
  onSendToAiAssistant,
}) => {
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('split');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [onlyDifferences, setOnlyDifferences] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const cleanLogA = useMemo(() => sanitizeTerminalLog(logA || '').trim(), [logA]);
  const cleanLogB = useMemo(() => sanitizeTerminalLog(logB || '').trim(), [logB]);

  const nameA = deviceA?.hostname || deviceA?.name || 'Perangkat A';
  const nameB = deviceB?.hostname || deviceB?.name || 'Perangkat B';

  // Compute Line-by-Line LCS Diff Algorithm
  const diffLines = useMemo(() => {
    const linesA = cleanLogA ? cleanLogA.split('\n') : [];
    const linesB = cleanLogB ? cleanLogB.split('\n') : [];

    // Filter by query if user types in search
    const filteredA = filterQuery 
      ? linesA.filter(l => l.toLowerCase().includes(filterQuery.toLowerCase())) 
      : linesA;
    const filteredB = filterQuery 
      ? linesB.filter(l => l.toLowerCase().includes(filterQuery.toLowerCase())) 
      : linesB;

    const result: DiffLine[] = [];
    const maxLen = Math.max(filteredA.length, filteredB.length);

    // Simple robust pairwise line matching with lookahead
    let i = 0;
    let j = 0;
    let lineNumA = 1;
    let lineNumB = 1;

    while (i < filteredA.length || j < filteredB.length) {
      const a = filteredA[i];
      const b = filteredB[j];

      if (i < filteredA.length && j < filteredB.length) {
        if (a === b) {
          if (!onlyDifferences) {
            result.push({
              type: 'same',
              textA: a,
              textB: b,
              lineNumA: lineNumA++,
              lineNumB: lineNumB++,
            });
          } else {
            lineNumA++;
            lineNumB++;
          }
          i++;
          j++;
        } else {
          // Check next line in B for match (insertion in B)
          const matchInB = filteredB.slice(j + 1, j + 6).indexOf(a);
          // Check next line in A for match (deletion in A)
          const matchInA = filteredA.slice(i + 1, i + 6).indexOf(b);

          if (matchInB !== -1 && (matchInA === -1 || matchInB <= matchInA)) {
            // Lines in B before match are added in B
            for (let k = 0; k <= matchInB; k++) {
              result.push({
                type: 'added',
                textA: undefined,
                textB: filteredB[j + k],
                lineNumA: undefined,
                lineNumB: lineNumB++,
              });
            }
            j += matchInB + 1;
          } else if (matchInA !== -1) {
            // Lines in A before match are removed from A
            for (let k = 0; k <= matchInA; k++) {
              result.push({
                type: 'removed',
                textA: filteredA[i + k],
                textB: undefined,
                lineNumA: lineNumA++,
                lineNumB: undefined,
              });
            }
            i += matchInA + 1;
          } else {
            // Single line mismatch
            result.push({
              type: 'removed',
              textA: a,
              textB: undefined,
              lineNumA: lineNumA++,
              lineNumB: undefined,
            });
            result.push({
              type: 'added',
              textA: undefined,
              textB: b,
              lineNumA: undefined,
              lineNumB: lineNumB++,
            });
            i++;
            j++;
          }
        }
      } else if (i < filteredA.length) {
        result.push({
          type: 'removed',
          textA: a,
          textB: undefined,
          lineNumA: lineNumA++,
          lineNumB: undefined,
        });
        i++;
      } else {
        result.push({
          type: 'added',
          textA: undefined,
          textB: b,
          lineNumA: undefined,
          lineNumB: lineNumB++,
        });
        j++;
      }

      if (result.length > 3000) break; // Safeguard
    }

    return result;
  }, [cleanLogA, cleanLogB, filterQuery, onlyDifferences]);

  const stats = useMemo(() => {
    let diffCount = 0;
    diffLines.forEach(l => {
      if (l.type === 'added' || l.type === 'removed') diffCount++;
    });
    return {
      diffCount,
      totalA: cleanLogA ? cleanLogA.split('\n').length : 0,
      totalB: cleanLogB ? cleanLogB.split('\n').length : 0,
    };
  }, [diffLines, cleanLogA, cleanLogB]);

  if (!isOpen) return null;

  const handleCopyDiff = () => {
    const linesText = diffLines.map(l => {
      if (l.type === 'same') return `  ${l.textA || ''}`;
      if (l.type === 'removed') return `- [${nameA}] ${l.textA || ''}`;
      if (l.type === 'added') return `+ [${nameB}] ${l.textB || ''}`;
      return '';
    }).join('\n');

    copyToClipboard(linesText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleAskAiToCompare = () => {
    if (!onSendToAiAssistant) return;
    const prompt = `Analisa perbandingan output terminal antara 2 perangkat jaringan ini untuk troubleshooting:\n\n=== PERANGKAT A: ${nameA} (${deviceA?.brand || 'Cisco'} - ${deviceA?.ipOrPortLabel || deviceA?.type}) ===\n${cleanLogA.slice(-2500)}\n\n=== PERANGKAT B: ${nameB} (${deviceB?.brand || 'Cisco'} - ${deviceB?.ipOrPortLabel || deviceB?.type}) ===\n${cleanLogB.slice(-2500)}\n\nInstruksi Analisa:\n1. Jelaskan perbedaan penting antara kedua perangkat (status antarmuka, routing BGP/OSPF, subnet, MTU, atau error).\n2. Identifikasi potensi ketidakcocokan (mismatch) atau akar masalah jika salah satu link/perangkat bermasalah.\n3. Berikan rekomendasi perintah CLI perbaikan yang presisi untuk kedua perangkat.`;
    
    onSendToAiAssistant(prompt);
    onClose();
  };

  return (
    <div 
      id="modal-live-terminal-diff"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`bg-[#0d1117] border border-neutral-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-neutral-200 transition-all ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-full max-w-6xl h-[88vh] max-h-[900px]'
        }`}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 bg-[#161b22] border-b border-neutral-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-950/80 border border-blue-700/60 text-blue-400">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                <span>Live Terminal Diff & Comparison</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                  {stats.diffCount} Perbedaan
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400 truncate">
                Membandingkan output <strong className="text-cyan-300 font-mono">{nameA}</strong> vs <strong className="text-emerald-300 font-mono">{nameB}</strong>
              </p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-2">
            {onSendToAiAssistant && (
              <button
                type="button"
                id="btn-diff-ask-ai"
                onClick={handleAskAiToCompare}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-blue-950/50 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Analisa Perbedaan dengan 69 AI</span>
              </button>
            )}

            <button
              type="button"
              id="btn-diff-copy"
              onClick={handleCopyDiff}
              title="Copy teks perbandingan diff"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              id="btn-diff-fullscreen"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer hidden sm:flex"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              id="btn-diff-close"
              onClick={onClose}
              title="Tutup Modal Diff"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-900/60 hover:text-rose-200 text-neutral-400 border border-neutral-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar Filter & View Controls */}
        <div className="px-4 py-2 bg-[#0d1117] border-b border-neutral-800 flex items-center justify-between gap-3 flex-wrap text-xs flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Filter className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <input
              type="text"
              id="input-diff-filter"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter teks (misal: 'BGP', 'GigabitEthernet', 'vlan', 'ip route')..."
              className="bg-neutral-900 border border-neutral-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 outline-none focus:border-blue-500 w-full font-mono"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                className="text-neutral-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Only Differences */}
            <label className="flex items-center gap-1.5 text-[11px] text-neutral-400 cursor-pointer select-none bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800 hover:text-neutral-200">
              <input
                type="checkbox"
                checked={onlyDifferences}
                onChange={(e) => setOnlyDifferences(e.target.checked)}
                className="rounded border-neutral-700 text-blue-600 focus:ring-0"
              />
              <span>Hanya Tampilkan Perbedaan</span>
            </label>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setDiffViewMode('split')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  diffViewMode === 'split'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setDiffViewMode('unified')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  diffViewMode === 'unified'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Unified Diff
              </button>
            </div>
          </div>
        </div>

        {/* Diff Device Headers */}
        <div className="grid grid-cols-2 bg-[#161b22] border-b border-neutral-800 text-xs font-mono select-none flex-shrink-0">
          <div className="px-4 py-2 border-r border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-semibold text-cyan-300 truncate">{nameA}</span>
              <span className="text-[10px] text-neutral-500 font-sans">({deviceA?.brand || 'Cisco'})</span>
            </div>
            <span className="text-[10px] text-neutral-500">{stats.totalA} baris</span>
          </div>
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-emerald-300 truncate">{nameB}</span>
              <span className="text-[10px] text-neutral-500 font-sans">({deviceB?.brand || 'Cisco'})</span>
            </div>
            <span className="text-[10px] text-neutral-500">{stats.totalB} baris</span>
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-y-auto font-mono text-[11.5px] leading-relaxed p-0 bg-black selection:bg-blue-600 selection:text-white">
          {diffLines.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 flex flex-col items-center justify-center">
              <FileText className="w-8 h-8 text-neutral-600 mb-2" />
              <p>Tidak ada baris yang cocok atau kedua output terminal kosong.</p>
              {onlyDifferences && (
                <p className="text-xs text-neutral-400 mt-1">Output kedua perangkat identik (sama persis).</p>
              )}
            </div>
          ) : diffViewMode === 'split' ? (
            /* Split View (2 Kolom Kiri - Kanan) */
            <div className="divide-y divide-neutral-900">
              {diffLines.map((line, idx) => (
                <div 
                  key={idx} 
                  className={`grid grid-cols-2 group hover:bg-neutral-900/60 transition-colors ${
                    line.type === 'removed' 
                      ? 'bg-rose-950/25' 
                      : line.type === 'added' 
                      ? 'bg-emerald-950/25' 
                      : ''
                  }`}
                >
                  {/* Left Column: Device A */}
                  <div className={`px-2 py-0.5 border-r border-neutral-800/80 flex items-start gap-2 overflow-x-auto scrollbar-none ${
                    line.type === 'removed' ? 'bg-rose-950/40 text-rose-200' : 'text-neutral-300'
                  }`}>
                    <span className="w-7 text-right text-[10px] text-neutral-600 select-none font-mono flex-shrink-0">
                      {line.lineNumA ?? ''}
                    </span>
                    <span className="w-3 text-center text-[11px] font-bold select-none flex-shrink-0 text-rose-400">
                      {line.type === 'removed' ? '-' : ' '}
                    </span>
                    <span className="break-all whitespace-pre-wrap flex-1">
                      {line.textA ?? ''}
                    </span>
                  </div>

                  {/* Right Column: Device B */}
                  <div className={`px-2 py-0.5 flex items-start gap-2 overflow-x-auto scrollbar-none ${
                    line.type === 'added' ? 'bg-emerald-950/40 text-emerald-200' : 'text-neutral-300'
                  }`}>
                    <span className="w-7 text-right text-[10px] text-neutral-600 select-none font-mono flex-shrink-0">
                      {line.lineNumB ?? ''}
                    </span>
                    <span className="w-3 text-center text-[11px] font-bold select-none flex-shrink-0 text-emerald-400">
                      {line.type === 'added' ? '+' : ' '}
                    </span>
                    <span className="break-all whitespace-pre-wrap flex-1">
                      {line.textB ?? ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Unified Diff View */
            <div className="divide-y divide-neutral-900">
              {diffLines.map((line, idx) => {
                if (line.type === 'same') {
                  return (
                    <div key={idx} className="px-4 py-0.5 flex items-start gap-3 hover:bg-neutral-900 text-neutral-300">
                      <span className="w-8 text-right text-[10px] text-neutral-600 select-none font-mono">{line.lineNumA}</span>
                      <span className="w-8 text-right text-[10px] text-neutral-600 select-none font-mono">{line.lineNumB}</span>
                      <span className="w-4 text-neutral-600 select-none"> </span>
                      <span className="whitespace-pre-wrap break-all flex-1">{line.textA}</span>
                    </div>
                  );
                }
                if (line.type === 'removed') {
                  return (
                    <div key={idx} className="px-4 py-0.5 flex items-start gap-3 bg-rose-950/40 text-rose-200 border-l-2 border-rose-500">
                      <span className="w-8 text-right text-[10px] text-rose-400/80 select-none font-mono">{line.lineNumA}</span>
                      <span className="w-8 text-right text-[10px] text-neutral-600 select-none font-mono">-</span>
                      <span className="w-4 text-rose-400 font-bold select-none">-</span>
                      <span className="whitespace-pre-wrap break-all flex-1">{line.textA}</span>
                    </div>
                  );
                }
                if (line.type === 'added') {
                  return (
                    <div key={idx} className="px-4 py-0.5 flex items-start gap-3 bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500">
                      <span className="w-8 text-right text-[10px] text-neutral-600 select-none font-mono">-</span>
                      <span className="w-8 text-right text-[10px] text-emerald-400/80 select-none font-mono">{line.lineNumB}</span>
                      <span className="w-4 text-emerald-400 font-bold select-none">+</span>
                      <span className="whitespace-pre-wrap break-all flex-1">{line.textB}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-[#161b22] border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80 inline-block" />
              <span>Unik di {nameA} (-)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 inline-block" />
              <span>Unik di {nameB} (+)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
