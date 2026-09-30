import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Camera, GitCompare, ArrowRightLeft, Copy, Check, Download, 
  Trash2, Sparkles, RotateCcw, 
  Play, Upload, Search, 
  Layers, Clock, CheckCircle2,
  ChevronDown, ChevronUp, Terminal, SplitSquareVertical
} from 'lucide-react';
import { DeviceProfile, ConfigSnapshot, ConfigDiffResult, SnapshotType, ConfigDiffChange } from '../types';
import { 
  getDeviceSnapshots, 
  saveDeviceSnapshot, 
  deleteDeviceSnapshot, 
  clearDeviceSnapshots, 
  computeConfigDiff, 
  createSnapshotFromConfig,
  normalizeConfiguration,
  getDeviceEffectiveConfig,
  captureRunningConfigViaBackgroundExec,
  getRunningConfigCommandForBrand,
  downloadSnapshotAsConfigFile,
  downloadAllSnapshotsAsBundle
} from '../services/configSnapshotService';

interface ConfigSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDevice: DeviceProfile | null;
  currentTerminalLog?: string;
  onExecuteRollbackScript?: (script: string) => void;
  initialSide?: 'diff' | 'list';
}

type FilterViewMode = 'all_changes' | 'added' | 'removed' | 'modified' | 'full_config';

export const ConfigSnapshotModal: React.FC<ConfigSnapshotModalProps> = ({
  isOpen,
  onClose,
  activeDevice,
  currentTerminalLog = '',
  onExecuteRollbackScript,
}) => {
  const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>([]);
  const [selectedSnapshotAId, setSelectedSnapshotAId] = useState<string>('');
  const [selectedSnapshotBId, setSelectedSnapshotBId] = useState<string>('');

  // View Filter Mode: 'all_changes' | 'added' | 'removed' | 'modified' | 'full_config'
  const [filterMode, setFilterMode] = useState<FilterViewMode>('full_config');
  const [diffSearchQuery, setDiffSearchQuery] = useState<string>('');
  const [searchMatchIndex, setSearchMatchIndex] = useState<number>(0);
  const [showAnalysisBox, setShowAnalysisBox] = useState<boolean>(false);
  const [syncScroll, setSyncScroll] = useState<boolean>(true);
  
  const [isCopiedDiff, setIsCopiedDiff] = useState<boolean>(false);
  const [isRollbackCopied, setIsRollbackCopied] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Snapshot History Manager Modal State
  const [showSnapshotManager, setShowSnapshotManager] = useState<boolean>(false);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState<string>('');

  // Manual Paste / Import Modal State
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteConfigText, setPasteConfigText] = useState<string>('');
  const [pasteLabel, setPasteLabel] = useState<string>('');
  const [pasteType, setPasteType] = useState<SnapshotType>('manual');

  // State for In-App Delete & Rollback Confirmation Modals (Replaces window.confirm blocked in sandboxed iframes)
  const [snapshotToDelete, setSnapshotToDelete] = useState<{ id: string; label: string; lineCount?: number } | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState<boolean>(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef<boolean>(false);
  const isSyncingRight = useRef<boolean>(false);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Load snapshots whenever activeDevice changes or modal opens
  useEffect(() => {
    if (!activeDevice || !isOpen) return;

    const list = getDeviceSnapshots(activeDevice.id, activeDevice);
    setSnapshots(list);

    if (list.length >= 2) {
      // Default: A is baseline (second latest / pre-change), B is target (latest / post-change)
      setSelectedSnapshotAId(list[1].id);
      setSelectedSnapshotBId(list[0].id);
    } else if (list.length === 1) {
      setSelectedSnapshotAId(list[0].id);
      setSelectedSnapshotBId(list[0].id);
    } else {
      setSelectedSnapshotAId('');
      setSelectedSnapshotBId('');
    }
  }, [activeDevice, isOpen]);

  // Listen to custom event for automatic snapshot updates
  useEffect(() => {
    const handleSnapshotUpdated = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (activeDevice && (!customEvt.detail?.deviceId || customEvt.detail.deviceId === activeDevice.id)) {
        const list = getDeviceSnapshots(activeDevice.id, activeDevice);
        setSnapshots(list);
        if (list.length >= 2 && (!selectedSnapshotAId || !selectedSnapshotBId)) {
          setSelectedSnapshotAId(list[1].id);
          setSelectedSnapshotBId(list[0].id);
        }
      }
    };

    window.addEventListener('69ai_snapshots_updated', handleSnapshotUpdated);
    return () => {
      window.removeEventListener('69ai_snapshots_updated', handleSnapshotUpdated);
    };
  }, [activeDevice, selectedSnapshotAId, selectedSnapshotBId]);

  // Synchronized scroll handlers between Left (A) and Right (B)
  const handleScrollLeft = () => {
    if (!syncScroll || !leftPaneRef.current || !rightPaneRef.current) return;
    if (isSyncingLeft.current) {
      isSyncingLeft.current = false;
      return;
    }
    isSyncingRight.current = true;
    rightPaneRef.current.scrollTop = leftPaneRef.current.scrollTop;
  };

  const handleScrollRight = () => {
    if (!syncScroll || !leftPaneRef.current || !rightPaneRef.current) return;
    if (isSyncingRight.current) {
      isSyncingRight.current = false;
      return;
    }
    isSyncingLeft.current = true;
    leftPaneRef.current.scrollTop = rightPaneRef.current.scrollTop;
  };

  // Selected Snapshot Objects
  const snapshotA = useMemo(() => {
    return snapshots.find(s => s.id === selectedSnapshotAId) || null;
  }, [snapshots, selectedSnapshotAId]);

  const snapshotB = useMemo(() => {
    return snapshots.find(s => s.id === selectedSnapshotBId) || null;
  }, [snapshots, selectedSnapshotBId]);

  // Compute Diff
  const diffResult: ConfigDiffResult | null = useMemo(() => {
    if (!snapshotA || !snapshotB) return null;
    return computeConfigDiff(snapshotA, snapshotB);
  }, [snapshotA, snapshotB]);

  // Raw lines with change annotations for Sisi Kiri (Baseline A)
  const linesA = useMemo(() => {
    if (!snapshotA) return [];
    const raw = snapshotA.rawConfig.split('\n');
    
    // Map changed line numbers in A
    const removedLineNums = new Set<number>();
    const modifiedLineNums = new Set<number>();

    if (diffResult) {
      diffResult.changes.forEach(c => {
        if (c.type === 'removed' && c.lineNumberA) {
          removedLineNums.add(c.lineNumberA);
        }
        if (c.type === 'modified' && c.lineNumberA) {
          modifiedLineNums.add(c.lineNumberA);
        }
      });
    }

    return raw.map((line, idx) => {
      const lineNum = idx + 1;
      let status: 'unchanged' | 'removed' | 'modified' = 'unchanged';
      if (removedLineNums.has(lineNum)) status = 'removed';
      if (modifiedLineNums.has(lineNum)) status = 'modified';

      return {
        lineNum,
        text: line,
        status,
      };
    });
  }, [snapshotA, diffResult]);

  // Raw lines with change annotations for Sisi Kanan (Target B)
  const linesB = useMemo(() => {
    if (!snapshotB) return [];
    const raw = snapshotB.rawConfig.split('\n');
    
    // Map changed line numbers in B
    const addedLineNums = new Set<number>();
    const modifiedLineNums = new Set<number>();

    if (diffResult) {
      diffResult.changes.forEach(c => {
        if (c.type === 'added' && c.lineNumberB) {
          addedLineNums.add(c.lineNumberB);
        }
        if (c.type === 'modified' && c.lineNumberB) {
          modifiedLineNums.add(c.lineNumberB);
        }
      });
    }

    return raw.map((line, idx) => {
      const lineNum = idx + 1;
      let status: 'unchanged' | 'added' | 'modified' = 'unchanged';
      if (addedLineNums.has(lineNum)) status = 'added';
      if (modifiedLineNums.has(lineNum)) status = 'modified';

      return {
        lineNum,
        text: line,
        status,
      };
    });
  }, [snapshotB, diffResult]);

  // Filtered diff rows based on active filter button
  const displayedRows: ConfigDiffChange[] = useMemo(() => {
    if (!diffResult) return [];
    let list = diffResult.changes;

    if (filterMode === 'added') {
      list = list.filter(c => c.type === 'added');
    } else if (filterMode === 'removed') {
      list = list.filter(c => c.type === 'removed');
    } else if (filterMode === 'modified') {
      list = list.filter(c => c.type === 'modified');
    } else if (filterMode === 'all_changes') {
      list = list.filter(c => c.type !== 'unchanged');
    }

    if (diffSearchQuery.trim()) {
      const q = diffSearchQuery.toLowerCase();
      list = list.filter(c => 
        c.content.toLowerCase().includes(q) || 
        (c.oldContent && c.oldContent.toLowerCase().includes(q)) ||
        (c.blockContext && c.blockContext.toLowerCase().includes(q))
      );
    }

    return list;
  }, [diffResult, filterMode, diffSearchQuery]);

  // All search match targets for jumping / navigating across panes
  const searchMatches = useMemo(() => {
    const q = diffSearchQuery.trim().toLowerCase();
    if (!q) return [];

    const matches: { id: string; pane: 'a' | 'b' | 'diff'; label: string; lineNum?: number }[] = [];

    if (filterMode === 'full_config') {
      // In full config mode, match lines in Pane A and Pane B
      linesA.forEach((line) => {
        if (line.text.toLowerCase().includes(q)) {
          matches.push({
            id: `config-line-a-${line.lineNum}`,
            pane: 'a',
            label: `A: Baris ${line.lineNum}`,
            lineNum: line.lineNum,
          });
        }
      });

      linesB.forEach((line) => {
        if (line.text.toLowerCase().includes(q)) {
          matches.push({
            id: `config-line-b-${line.lineNum}`,
            pane: 'b',
            label: `B: Baris ${line.lineNum}`,
            lineNum: line.lineNum,
          });
        }
      });
    } else {
      // In diff rows view
      displayedRows.forEach((row, idx) => {
        const textContent = (row.content || '').toLowerCase();
        const oldContent = (row.oldContent || '').toLowerCase();
        const blockContext = (row.blockContext || '').toLowerCase();

        if (textContent.includes(q) || oldContent.includes(q) || blockContext.includes(q)) {
          matches.push({
            id: `diff-row-${idx}`,
            pane: 'diff',
            label: `Perubahan #${idx + 1}`,
          });
        }
      });
    }

    return matches;
  }, [diffSearchQuery, filterMode, linesA, linesB, displayedRows]);

  const currentMatch = searchMatches[searchMatchIndex] || null;

  // Jump to specific match index
  const jumpToMatch = (index: number) => {
    if (searchMatches.length === 0) return;
    const boundedIndex = (index + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(boundedIndex);

    const target = searchMatches[boundedIndex];
    if (target) {
      setTimeout(() => {
        const el = document.getElementById(target.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

  const goToNextMatch = () => {
    jumpToMatch(searchMatchIndex + 1);
  };

  const goToPrevMatch = () => {
    jumpToMatch(searchMatchIndex - 1);
  };

  // Auto-jump to first match when search query changes
  useEffect(() => {
    if (diffSearchQuery.trim() && searchMatches.length > 0) {
      setSearchMatchIndex(0);
      const firstTarget = searchMatches[0];
      if (firstTarget) {
        setTimeout(() => {
          const el = document.getElementById(firstTarget.id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 50);
      }
    }
  }, [diffSearchQuery, filterMode]);

  // Filter snapshots in Manager Modal
  const filteredSnapshots = useMemo(() => {
    if (!snapshotSearchQuery.trim()) return snapshots;
    const q = snapshotSearchQuery.toLowerCase();
    return snapshots.filter(s => 
      s.label.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q) ||
      (s.commandSource && s.commandSource.toLowerCase().includes(q)) ||
      new Date(s.timestamp).toLocaleString().toLowerCase().includes(q)
    );
  }, [snapshots, snapshotSearchQuery]);

  if (!isOpen || !activeDevice) return null;

  // Handle Capture by executing 'show run' behind the scenes (dibalik layar)
  const handleCaptureLiveSnapshot = async (type: SnapshotType = 'manual', label?: string) => {
    if (!activeDevice || isCapturing) return;
    setIsCapturing(true);
    const cmd = getRunningConfigCommandForBrand(activeDevice.brand);
    showFeedback(`⏳ Menjalankan '${cmd}' di balik layar...`);

    try {
      const result = await captureRunningConfigViaBackgroundExec(activeDevice, activeDevice.hostname);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const snapLabel = label || `Snapshot (${timeStr})`;
      const newSnap = createSnapshotFromConfig(
        activeDevice.id,
        activeDevice.name,
        activeDevice.brand,
        result.config,
        type,
        snapLabel,
        result.commandUsed
      );

      const updated = saveDeviceSnapshot(newSnap);
      setSnapshots(updated);

      // Automatically set new snapshot as Target [B]
      setSelectedSnapshotBId(newSnap.id);
      if (updated.length >= 2 && selectedSnapshotAId === newSnap.id) {
        setSelectedSnapshotAId(updated[1].id);
      }

      showFeedback(`✓ Snapshot "${newSnap.label}" (${newSnap.lineCount} baris) berhasil diambil via real '${result.commandUsed}' di balik layar`);
    } catch (err: any) {
      console.error('Failed to capture snapshot:', err);
      showFeedback(`✕ Gagal mengambil snapshot: ${err.message || err}`);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle Swap Snapshot A and B
  const handleSwapSnapshots = () => {
    const temp = selectedSnapshotAId;
    setSelectedSnapshotAId(selectedSnapshotBId);
    setSelectedSnapshotBId(temp);
    showFeedback('⇄ Posisi A dan B ditukar');
  };

  // Handle Manual Paste & Upload
  const handleSavePastedConfig = () => {
    if (!pasteConfigText.trim()) {
      showFeedback('✕ Masukkan atau upload teks konfigurasi.');
      return;
    }

    const normalized = normalizeConfiguration(pasteConfigText, activeDevice.brand);
    if (!normalized.trim()) {
      showFeedback('✕ Teks tidak mengandung baris konfigurasi yang valid.');
      return;
    }

    const newSnap = createSnapshotFromConfig(
      activeDevice.id,
      activeDevice.name,
      activeDevice.brand,
      pasteConfigText,
      pasteType,
      pasteLabel.trim() || undefined,
      'Pasted/Uploaded Config'
    );

    const updated = saveDeviceSnapshot(newSnap);
    setSnapshots(updated);
    setSelectedSnapshotBId(newSnap.id);
    
    setShowPasteModal(false);
    setPasteConfigText('');
    setPasteLabel('');
    showFeedback(`✓ Snapshot "${newSnap.label}" berhasil disimpan`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setPasteConfigText(content);
        if (!pasteLabel) {
          setPasteLabel(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    };
    reader.readAsText(file);
  };

  // REQUEST DELETE SINGLE SNAPSHOT
  const requestDeleteSnapshot = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const target = snapshots.find(s => s.id === id);
    if (!target) return;
    setSnapshotToDelete({ id: target.id, label: target.label, lineCount: target.lineCount });
  };

  // CONFIRM AND EXECUTE SINGLE SNAPSHOT DELETION
  const confirmExecuteDeleteSnapshot = () => {
    if (!snapshotToDelete) return;
    const { id, label } = snapshotToDelete;
    const updated = deleteDeviceSnapshot(activeDevice.id, id);
    setSnapshots(updated);

    if (selectedSnapshotAId === id) {
      const remainingOthers = updated.filter(s => s.id !== selectedSnapshotBId);
      setSelectedSnapshotAId(remainingOthers[0]?.id || updated[0]?.id || '');
    }
    if (selectedSnapshotBId === id) {
      const remainingOthers = updated.filter(s => s.id !== selectedSnapshotAId);
      setSelectedSnapshotBId(remainingOthers[0]?.id || updated[0]?.id || '');
    }

    setSnapshotToDelete(null);
    showFeedback(`✓ Snapshot "${label}" berhasil dihapus`);
  };

  // REQUEST CLEAR ALL SNAPSHOTS
  const requestClearAllSnapshots = () => {
    if (snapshots.length === 0) return;
    setShowClearAllConfirm(true);
  };

  // CONFIRM AND EXECUTE CLEAR ALL SNAPSHOTS
  const confirmExecuteClearAll = () => {
    clearDeviceSnapshots(activeDevice.id);
    setSnapshots([]);
    setSelectedSnapshotAId('');
    setSelectedSnapshotBId('');
    setShowClearAllConfirm(false);
    showFeedback('✓ Semua riwayat snapshot untuk perangkat ini telah dibersihkan');
  };

  const handleCopyDiff = () => {
    if (!diffResult) return;
    const diffText = diffResult.changes.map(c => {
      if (c.type === 'added') return `+ ${c.content}`;
      if (c.type === 'removed') return `- ${c.content}`;
      if (c.type === 'modified') return `~ ${c.content} (sebelumnya: ${c.oldContent})`;
      return `  ${c.content}`;
    }).join('\n');

    navigator.clipboard.writeText(`=== DIFF: ${snapshotA?.label} vs ${snapshotB?.label} ===\n\n${diffResult.summary}\n\n${diffText}`);
    setIsCopiedDiff(true);
    setTimeout(() => setIsCopiedDiff(false), 2000);
    showFeedback('✓ Laporan diff berhasil disalin ke clipboard');
  };

  const handleCopyRollback = () => {
    if (!diffResult?.rollbackScript) return;
    navigator.clipboard.writeText(diffResult.rollbackScript);
    setIsRollbackCopied(true);
    setTimeout(() => setIsRollbackCopied(false), 2000);
    showFeedback('✓ Script rollback berhasil disalin ke clipboard');
  };

  const handleDownloadDiff = () => {
    if (!diffResult) return;
    const content = `======================================================================
REMIX 69 AI TERMINAL - CONFIGURATION DIFF REPORT
Perangkat   : ${activeDevice.name} (${activeDevice.brand.toUpperCase()})
Baseline (A): ${snapshotA?.label} [${snapshotA?.timestamp}]
Target   (B): ${snapshotB?.label} [${snapshotB?.timestamp}]
======================================================================

RINGKASAN EKSEKUTIF & ANALISA DAMPAK:
${diffResult.summary}

======================================================================
DETAIL PERUBAHAN BARIS:
======================================================================
` + diffResult.changes.map(c => {
      const prefix = c.type === 'added' ? '[+] ' : c.type === 'removed' ? '[-] ' : c.type === 'modified' ? '[~] ' : '    ';
      return `${prefix}${c.content}`;
    }).join('\n') + `\n\n======================================================================
ROLLBACK SCRIPT:
======================================================================
${diffResult.rollbackScript}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `config_diff_${activeDevice.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('✓ File laporan diff diunduh');
  };

  // Download Snapshot A as .cfg file
  const handleDownloadSnapshotA = () => {
    if (!snapshotA) {
      showFeedback('✕ Snapshot Baseline [A] belum dipilih');
      return;
    }
    downloadSnapshotAsConfigFile(snapshotA);
    showFeedback(`✓ Mengunduh file konfigurasi Snapshot A: ${snapshotA.label}`);
  };

  // Download Snapshot B as .cfg file
  const handleDownloadSnapshotB = () => {
    if (!snapshotB) {
      showFeedback('✕ Snapshot Target [B] belum dipilih');
      return;
    }
    downloadSnapshotAsConfigFile(snapshotB);
    showFeedback(`✓ Mengunduh file konfigurasi Snapshot B: ${snapshotB.label}`);
  };

  // Download single snapshot by object
  const handleDownloadSingleSnapshot = (snap: ConfigSnapshot, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    downloadSnapshotAsConfigFile(snap);
    showFeedback(`✓ Mengunduh file konfigurasi: ${snap.label}`);
  };

  // Download all snapshots for this device as a consolidated archive (.cfg)
  const handleDownloadAllSnapshots = () => {
    if (snapshots.length === 0) {
      showFeedback('✕ Tidak ada snapshot yang tersimpan untuk diunduh');
      return;
    }
    downloadAllSnapshotsAsBundle(snapshots, activeDevice.name);
    showFeedback(`✓ Mengunduh arsip ${snapshots.length} snapshot konfigurasi (${activeDevice.name})`);
  };

  const getTypeBadge = (type: SnapshotType) => {
    switch (type) {
      case 'post_change':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">Post-Change</span>;
      case 'pre_change':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-sky-950/80 text-sky-300 border border-sky-700/60">Pre-Change</span>;
      case 'auto_show_run':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60">Auto Show Run</span>;
      case 'manual':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-700/60">Manual</span>;
      case 'uploaded':
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">Upload</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-slate-800 text-slate-300">Snapshot</span>;
    }
  };

  // Helper to colorize command lines like Cisco show running-config
  const renderConfigLineText = (lineText: string) => {
    const trimmed = lineText.trim();
    if (!trimmed) return <span className="text-slate-600"> </span>;

    // Comments / Separator
    if (trimmed.startsWith('!') || trimmed.startsWith('#')) {
      return <span className="text-slate-500 font-medium">{lineText}</span>;
    }

    // Top block definitions (interface, router, vlan, line, acl, etc.)
    if (/^(?:interface|router|vlan|line|ip access-list|crypto|bridge-domain)\b/i.test(trimmed)) {
      return <span className="text-blue-300 font-bold">{lineText}</span>;
    }

    // Key sub-commands
    if (/^\s*(?:ip address|ipv6 address)\b/i.test(lineText)) {
      return <span className="text-cyan-200 font-semibold">{lineText}</span>;
    }

    if (/^\s*(?:no\s+shutdown|shutdown)\b/i.test(lineText)) {
      return <span className="text-amber-300 font-medium">{lineText}</span>;
    }

    if (/^\s*(?:description|hostname)\b/i.test(lineText)) {
      return <span className="text-emerald-300/90">{lineText}</span>;
    }

    return <span className="text-slate-200">{lineText}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs font-sans text-slate-100 animate-in fade-in duration-200">
      <div 
        id="modal-config-snapshot-diff"
        className="relative w-full max-w-[98vw] xl:max-w-[1560px] h-[95vh] max-h-[95vh] bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-sm"
      >
        {/* ================================================================= */}
        {/* TOP HEADER */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <GitCompare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Perbandingan Konfigurasi (Sisi Kiri: A | Sisi Kanan: B)
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-200 border border-slate-700">
                  {activeDevice.name}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-950 text-blue-300 border border-blue-800/60 font-semibold">
                  {activeDevice.brand}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {actionFeedback && (
              <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-xs animate-in fade-in font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{actionFeedback}</span>
              </span>
            )}

            <button
              onClick={() => handleCaptureLiveSnapshot('manual')}
              disabled={isCapturing}
              title="Jalankan show run di balik layar untuk menangkap output konfigurasi real"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-blue-800 text-white font-semibold text-xs shadow transition-all cursor-pointer"
            >
              {isCapturing ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isCapturing ? 'Menjalankan Show Run...' : 'Ambil Snapshot'}</span>
            </button>

            <button
              onClick={() => setShowSnapshotManager(true)}
              title="Buka pengelola riwayat snapshot"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Riwayat Snapshot ({snapshots.length})</span>
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              title="Paste atau upload file konfigurasi mentah"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Paste / Upload</span>
            </button>

            <button
              id="btn-close-snapshot-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
              title="Tutup Modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* INTERACTIVE SUMMARY FILTER BAR */}
        {/* ================================================================= */}
        <div className="px-3 py-1.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          
          {/* Segmented View Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 flex-wrap">
            
            {/* 1. Show Run (Format Asli Lengkap) */}
            <button
              type="button"
              onClick={() => setFilterMode('full_config')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'full_config'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Tampilkan semua baris konfigurasi asli (Format show running-config)"
            >
              <Terminal className="w-3.5 h-3.5 text-blue-300" />
              <span>Show Run</span>
            </button>

            {/* 2. Semua Perubahan (Diff) */}
            <button
              type="button"
              onClick={() => setFilterMode('all_changes')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'all_changes'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-purple-950/40'
              }`}
              title="Tampilkan hanya baris yang bertambah, berkurang, atau berubah"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Diff</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${
                filterMode === 'all_changes' ? 'bg-purple-800/80 text-white' : 'bg-slate-800 text-slate-300'
              }`}>
                {diffResult ? diffResult.stats.additions + diffResult.stats.deletions + diffResult.stats.modifications : 0}
              </span>
            </button>

            <div className="h-4 w-px bg-slate-800 mx-0.5" />

            {/* 3. Tombol Δ Diubah */}
            <button
              type="button"
              onClick={() => setFilterMode('modified')}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'modified'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-amber-400 hover:bg-amber-950/50'
              }`}
              title={`Tampilkan ${diffResult?.stats.modifications || 0} baris yang diubah nilainya`}
            >
              <span>Δ</span>
              <span className="font-sans font-semibold text-[11px]">{diffResult?.stats.modifications || 0}</span>
            </button>

            {/* 4. Tombol + Ditambahkan */}
            <button
              type="button"
              onClick={() => setFilterMode('added')}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'added'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-emerald-400 hover:bg-emerald-950/50'
              }`}
              title={`Tampilkan ${diffResult?.stats.additions || 0} baris konfigurasi yang ditambahkan`}
            >
              <span>+</span>
              <span className="font-sans font-semibold text-[11px]">{diffResult?.stats.additions || 0}</span>
            </button>

            {/* 5. Tombol - Dihapus */}
            <button
              type="button"
              onClick={() => setFilterMode('removed')}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                filterMode === 'removed'
                  ? 'bg-rose-500 text-slate-950 shadow-xs'
                  : 'text-rose-400 hover:bg-rose-950/50'
              }`}
              title={`Tampilkan ${diffResult?.stats.deletions || 0} baris konfigurasi yang dihapus`}
            >
              <span>-</span>
              <span className="font-sans font-semibold text-[11px]">{diffResult?.stats.deletions || 0}</span>
            </button>
          </div>

          {/* Search & Action Tools */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Sync Scroll Toggle */}
            <button
              type="button"
              onClick={() => setSyncScroll(!syncScroll)}
              title={syncScroll ? 'Scroll kedua sisi terkunci sinkron (Aktif)' : 'Scroll mandiri tiap sisi'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors border ${
                syncScroll
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span className="text-[11px]">Sync</span>
            </button>

            {/* Search Input with Jump Navigation & Match Counter */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 focus-within:border-blue-500 rounded-lg px-2 py-1 transition-all">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari..."
                value={diffSearchQuery}
                onChange={(e) => {
                  setDiffSearchQuery(e.target.value);
                  setSearchMatchIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      goToPrevMatch();
                    } else {
                      goToNextMatch();
                    }
                  }
                }}
                className="w-24 sm:w-32 bg-transparent text-xs text-slate-200 outline-hidden font-mono"
              />
              {diffSearchQuery.trim() && (
                <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 select-none px-0.5">
                    {searchMatches.length > 0 ? `${searchMatchIndex + 1}/${searchMatches.length}` : '0'}
                  </span>
                  <button
                    type="button"
                    onClick={goToPrevMatch}
                    disabled={searchMatches.length === 0}
                    title="Hasil Sebelumnya (Shift+Enter)"
                    className="p-0.5 hover:text-white text-slate-400 disabled:opacity-30 cursor-pointer transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextMatch}
                    disabled={searchMatches.length === 0}
                    title="Hasil Berikutnya (Enter)"
                    className="p-0.5 hover:text-white text-slate-400 disabled:opacity-30 cursor-pointer transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiffSearchQuery('');
                      setSearchMatchIndex(0);
                    }}
                    title="Hapus pencarian"
                    className="p-0.5 hover:text-white text-slate-400 cursor-pointer transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Copy Diff Button (Icon with Tooltip) */}
            <button
              type="button"
              onClick={handleCopyDiff}
              title={isCopiedDiff ? "Laporan diff berhasil disalin!" : "Salin Laporan Diff ke Clipboard"}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 cursor-pointer transition-colors"
            >
              {isCopiedDiff ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Download Diff Button (Icon with Tooltip) */}
            <button
              type="button"
              onClick={handleDownloadDiff}
              title="Unduh Laporan Diff (.txt)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Rollback Script Button */}
            {diffResult?.rollbackScript && (
              <button
                type="button"
                onClick={handleCopyRollback}
                title="Salin script rollback otomatis untuk membatalkan perubahan ini"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border border-amber-700/70 text-xs font-semibold cursor-pointer transition-colors"
              >
                {isRollbackCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
                <span className="text-[11px] hidden sm:inline">{isRollbackCopied ? 'Tersalin' : 'Rollback'}</span>
              </button>
            )}

            {/* Execute in Terminal Button */}
            {onExecuteRollbackScript && diffResult?.rollbackScript && (
              <button
                type="button"
                onClick={() => setShowRollbackConfirm(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors"
                title="Eksekusi script rollback langsung di terminal perangkat"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="text-[11px] hidden sm:inline">Jalankan</span>
              </button>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* AREA ANALISA DAMPAK PERUBAHAN & PENJELASAN AI */}
        {/* ================================================================= */}
        {diffResult && (
          <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-xs font-bold text-white uppercase tracking-wider shrink-0">
                  Analisa Dampak:
                </span>
                <span className="text-xs text-slate-300 font-medium truncate">
                  {filterMode === 'full_config' && `Format 'show' (${snapshotA?.lineCount || 0} vs ${snapshotB?.lineCount || 0} baris).`}
                  {filterMode === 'added' && `${displayedRows.length} baris DITAMBAHKAN (+).`}
                  {filterMode === 'removed' && `${displayedRows.length} baris DIHAPUS (-).`}
                  {filterMode === 'modified' && `${displayedRows.length} baris DIUBAH (Δ).`}
                  {filterMode === 'all_changes' && `${displayedRows.length} baris perbedaan.`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowAnalysisBox(!showAnalysisBox)}
                className="text-xs text-blue-400 hover:text-blue-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0 ml-2 transition-colors font-medium shadow-xs"
                title={showAnalysisBox ? 'Sembunyikan penjelasan analisa agar area diff lebih lega' : 'Buka detail ringkasan dampak AI'}
              >
                <span>{showAnalysisBox ? 'Sembunyikan Analisa' : 'Lihat Analisa'}</span>
                {showAnalysisBox ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showAnalysisBox && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-900/95 border border-slate-800 text-xs leading-relaxed text-slate-300 font-sans space-y-1.5 animate-in fade-in max-h-28 sm:max-h-36 overflow-y-auto select-text shadow-inner">
                {diffResult.summary.split('\n').map((line, idx) => (
                  <p key={idx} className={idx > 0 ? 'mt-0.5' : 'font-semibold text-slate-100'}>
                    {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* 2 SISI BERDAMPINGAN: SISI KIRI (BASELINE A) & SISI KANAN (TARGET B) */}
        {/* ================================================================= */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-950 font-mono">
          
          {/* PEMILIHAN A & B: HANYA ICON & DROPDOWN LIST SNAPSHOT (SANGAT RAPI & MINIMALIS) */}
          <div className="grid grid-cols-2 bg-slate-900 border-b border-slate-800 shrink-0 select-none divide-x divide-slate-800">
            
            {/* SISI KIRI: ICON A + DROPDOWN LIST SNAPSHOT A + HAPUS A */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-950/20">
              <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                A
              </span>
              <select
                value={selectedSnapshotAId}
                onChange={(e) => setSelectedSnapshotAId(e.target.value)}
                className="bg-slate-950 text-slate-100 border border-slate-700/90 rounded-lg px-2.5 py-1 text-xs outline-hidden focus:border-rose-500 font-sans font-medium w-full cursor-pointer truncate"
              >
                {snapshots.length === 0 ? (
                  <option value="">Belum ada snapshot</option>
                ) : (
                  snapshots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.lineCount} baris)
                    </option>
                  ))
                )}
              </select>
              {selectedSnapshotAId && snapshotA && (
                <button
                  type="button"
                  onClick={handleDownloadSnapshotA}
                  title={`Unduh snapshot A ini (.cfg): ${snapshotA.label}`}
                  className="p-1 rounded-md bg-slate-800/80 hover:bg-rose-900/70 text-slate-400 hover:text-rose-300 border border-slate-700/80 cursor-pointer shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              {selectedSnapshotAId && (
                <button
                  type="button"
                  onClick={() => requestDeleteSnapshot(selectedSnapshotAId)}
                  title="Hapus snapshot A yang dipilih"
                  className="p-1 rounded-md bg-slate-800/80 hover:bg-rose-900/70 text-slate-400 hover:text-rose-300 border border-slate-700/80 cursor-pointer shrink-0 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* SISI KANAN: ICON B + DROPDOWN LIST SNAPSHOT B + UNDUH B + HAPUS B + ICON TUKAR */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/20">
              <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                B
              </span>
              <select
                value={selectedSnapshotBId}
                onChange={(e) => setSelectedSnapshotBId(e.target.value)}
                className="bg-slate-950 text-slate-100 border border-slate-700/90 rounded-lg px-2.5 py-1 text-xs outline-hidden focus:border-emerald-500 font-sans font-medium w-full cursor-pointer truncate"
              >
                {snapshots.length === 0 ? (
                  <option value="">Belum ada snapshot</option>
                ) : (
                  snapshots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.lineCount} baris)
                    </option>
                  ))
                )}
              </select>
              {selectedSnapshotBId && snapshotB && (
                <button
                  type="button"
                  onClick={handleDownloadSnapshotB}
                  title={`Unduh snapshot B ini (.cfg): ${snapshotB.label}`}
                  className="p-1 rounded-md bg-slate-800/80 hover:bg-emerald-900/70 text-slate-400 hover:text-emerald-300 border border-slate-700/80 cursor-pointer shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              {selectedSnapshotBId && (
                <button
                  type="button"
                  onClick={() => requestDeleteSnapshot(selectedSnapshotBId)}
                  title="Hapus snapshot B yang dipilih"
                  className="p-1 rounded-md bg-slate-800/80 hover:bg-rose-900/70 text-slate-400 hover:text-rose-300 border border-slate-700/80 cursor-pointer shrink-0 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleSwapSnapshots}
                title="Tukar Snapshot A dan B"
                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer shrink-0"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* MAIN 2-PANE TERMINAL BODY (SELALU 2 KOLOM KIRI & KANAN) */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            
            {!snapshotA || !snapshotB ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-24 text-slate-500 font-sans">
                <GitCompare className="w-16 h-16 mx-auto mb-3 text-slate-600" />
                <p className="text-base font-semibold text-slate-300">Pilih Snapshot Baseline [A] dan Target [B]</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Pilih snapshot pada dropdown di atas untuk melihat perbandingan teks konfigurasi asli dalam format show running-config.
                </p>
              </div>
            ) : filterMode === 'full_config' ? (
              /* ======================================================= */
              /* MODE: TAMPILKAN FORMAT ASLI SHOW RUNNING-CONFIG DUA SISI */
              /* Sisi Kiri: Isi Konfigurasi Baseline A */
              /* Sisi Kanan: Isi Konfigurasi Target B */
              /* ======================================================= */
              <div className="h-full flex-1 min-h-0 grid grid-cols-2 divide-x divide-slate-800 bg-[#0a0f1d] select-text">
                
                {/* PANEL KIRI: ISI KONFIGURASI ASLI BASELINE [A] */}
                <div 
                  ref={leftPaneRef}
                  onScroll={handleScrollLeft}
                  className="h-full overflow-y-auto overflow-x-auto p-2 sm:p-3 space-y-0 text-xs sm:text-[13px] leading-relaxed font-mono select-text"
                >
                  <div className="text-[11px] text-slate-500 pb-1 mb-1 border-b border-slate-800/80 select-none flex items-center justify-between">
                    <span className="font-semibold text-rose-300">! --- KONFIGURASI ASLI: A ---</span>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-400">({linesA.length} baris)</span>
                      {snapshotA && (
                        <button
                          type="button"
                          onClick={handleDownloadSnapshotA}
                          title={`Unduh file konfigurasi A (.cfg): ${snapshotA.label}`}
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-200 border border-rose-800/80 cursor-pointer transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Unduh .cfg</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {linesA.map((line) => {
                    const isRemoved = line.status === 'removed';
                    const isModified = line.status === 'modified';
                    const isMatchSearch = diffSearchQuery.trim() && line.text.toLowerCase().includes(diffSearchQuery.toLowerCase());
                    const isCurrentMatch = currentMatch?.id === `config-line-a-${line.lineNum}`;

                    let rowClass = 'hover:bg-slate-900/60 text-slate-300';
                    let badge = null;

                    if (isRemoved) {
                      rowClass = 'bg-rose-950/45 text-rose-200 border-l-2 border-rose-500 font-semibold';
                      badge = <span className="text-[10px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 select-none ml-2">Dihapus</span>;
                    } else if (isModified) {
                      rowClass = 'bg-amber-950/40 text-amber-200 border-l-2 border-amber-500 font-semibold';
                      badge = <span className="text-[10px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 select-none ml-2">Diubah (Lama)</span>;
                    }

                    if (isCurrentMatch) {
                      rowClass += ' ring-2 ring-yellow-400 bg-yellow-500/35 text-yellow-100 font-bold z-10 shadow-md';
                    } else if (isMatchSearch) {
                      rowClass += ' ring-1 ring-yellow-400/80 bg-yellow-950/40 text-yellow-200';
                    }

                    return (
                      <div 
                        id={`config-line-a-${line.lineNum}`}
                        key={line.lineNum} 
                        className={`flex items-start px-2 py-0.5 rounded-xs transition-all ${rowClass}`}
                      >
                        <div className="w-8 sm:w-10 text-right pr-2 sm:pr-3 text-slate-600 select-none shrink-0 font-mono text-[11px] pt-0.5">
                          {line.lineNum}
                        </div>
                        <div className="w-4 text-center select-none font-bold shrink-0 pt-0.5">
                          {isRemoved ? <span className="text-rose-400">-</span> : isModified ? <span className="text-amber-400">Δ</span> : ' '}
                        </div>
                        <div className="flex-1 whitespace-pre-wrap break-all min-w-0 font-mono">
                          {renderConfigLineText(line.text)}
                          {badge}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PANEL KANAN: ISI KONFIGURASI ASLI TARGET [B] */}
                <div 
                  ref={rightPaneRef}
                  onScroll={handleScrollRight}
                  className="h-full overflow-y-auto overflow-x-auto p-2 sm:p-3 space-y-0 text-xs sm:text-[13px] leading-relaxed font-mono select-text"
                >
                  <div className="text-[11px] text-slate-500 pb-1 mb-1 border-b border-slate-800/80 select-none flex items-center justify-between">
                    <span className="font-semibold text-emerald-300">! --- KONFIGURASI ASLI: B ---</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">({linesB.length} baris)</span>
                      {snapshotB && (
                        <button
                          type="button"
                          onClick={handleDownloadSnapshotB}
                          title={`Unduh file konfigurasi B (.cfg): ${snapshotB.label}`}
                          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/80 cursor-pointer transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Unduh .cfg</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {linesB.map((line) => {
                    const isAdded = line.status === 'added';
                    const isModified = line.status === 'modified';
                    const isMatchSearch = diffSearchQuery.trim() && line.text.toLowerCase().includes(diffSearchQuery.toLowerCase());
                    const isCurrentMatch = currentMatch?.id === `config-line-b-${line.lineNum}`;

                    let rowClass = 'hover:bg-slate-900/60 text-slate-300';
                    let badge = null;

                    if (isAdded) {
                      rowClass = 'bg-emerald-950/45 text-emerald-200 border-l-2 border-emerald-500 font-semibold';
                      badge = <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 select-none ml-2">Ditambahkan</span>;
                    } else if (isModified) {
                      rowClass = 'bg-emerald-950/40 text-emerald-200 border-l-2 border-emerald-500 font-semibold';
                      badge = <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 select-none ml-2">Diubah (Baru)</span>;
                    }

                    if (isCurrentMatch) {
                      rowClass += ' ring-2 ring-yellow-400 bg-yellow-500/35 text-yellow-100 font-bold z-10 shadow-md';
                    } else if (isMatchSearch) {
                      rowClass += ' ring-1 ring-yellow-400/80 bg-yellow-950/40 text-yellow-200';
                    }

                    return (
                      <div 
                        id={`config-line-b-${line.lineNum}`}
                        key={line.lineNum} 
                        className={`flex items-start px-2 py-0.5 rounded-xs transition-all ${rowClass}`}
                      >
                        <div className="w-8 sm:w-10 text-right pr-2 sm:pr-3 text-slate-600 select-none shrink-0 font-mono text-[11px] pt-0.5">
                          {line.lineNum}
                        </div>
                        <div className="w-4 text-center select-none font-bold shrink-0 pt-0.5">
                          {isAdded ? <span className="text-emerald-400">+</span> : isModified ? <span className="text-emerald-400">Δ</span> : ' '}
                        </div>
                        <div className="flex-1 whitespace-pre-wrap break-all min-w-0 font-mono">
                          {renderConfigLineText(line.text)}
                          {badge}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ) : (
              /* ======================================================= */
              /* MODE FILTER PERUBAHAN: 2 KOLOM KIRI (A) & KANAN (B) */
              /* ======================================================= */
              <div className="h-full flex-1 min-h-0 overflow-y-auto p-2 sm:p-3 bg-[#0a0f1d] select-text">
                {displayedRows.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 text-slate-400 font-sans">
                    <Check className="w-14 h-14 mx-auto mb-2 text-emerald-400" />
                    <p className="text-base font-semibold text-slate-200">
                      {filterMode === 'added' && 'Tidak ada baris konfigurasi yang ditambahkan (+).'}
                      {filterMode === 'removed' && 'Tidak ada baris konfigurasi yang dihapus (-).'}
                      {filterMode === 'modified' && 'Tidak ada baris konfigurasi yang diubah nilainya (Δ).'}
                      {filterMode === 'all_changes' && 'Tidak ada perbedaan konfigurasi antar kedua snapshot.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFilterMode('full_config')}
                      className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Tampilkan Format Asli Show Running-Config
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden divide-y divide-slate-800/60 shadow-2xl">
                    {displayedRows.map((row, idx) => {
                      const isAdded = row.type === 'added';
                      const isRemoved = row.type === 'removed';
                      const isModified = row.type === 'modified';
                      const isCurrentMatch = currentMatch?.id === `diff-row-${idx}`;
                      const isMatchSearch = searchMatches.some(m => m.id === `diff-row-${idx}`);

                      const matchClass = isCurrentMatch 
                        ? 'ring-2 ring-yellow-400 bg-yellow-950/60 shadow-lg relative z-10' 
                        : isMatchSearch 
                        ? 'ring-1 ring-yellow-500/50 bg-yellow-950/20' 
                        : '';

                      return (
                        <div 
                          id={`diff-row-${idx}`}
                          key={idx} 
                          className={`grid grid-cols-2 text-xs sm:text-[13px] leading-relaxed transition-all hover:bg-slate-900/50 divide-x divide-slate-800 ${matchClass}`}
                        >
                          {/* SISI KIRI (BASELINE A) */}
                          <div className={`flex items-start py-1 px-2.5 min-w-0 ${
                            isRemoved 
                              ? 'bg-rose-950/50 border-l-4 border-l-rose-500 text-rose-200 font-semibold' 
                              : isModified
                              ? 'bg-amber-950/40 border-l-4 border-l-amber-500 text-amber-200 font-semibold'
                              : isAdded
                              ? 'bg-slate-950/60 opacity-30 select-none'
                              : 'text-slate-300'
                          }`}>
                            <div className="w-8 text-right pr-2 text-slate-500 select-none font-mono shrink-0 font-medium text-[11px]">
                              {row.lineNumberA || ''}
                            </div>
                            <div className="w-4 text-center select-none font-mono font-bold shrink-0">
                              {isRemoved ? <span className="text-rose-400">-</span> : isModified ? <span className="text-amber-400">Δ</span> : ' '}
                            </div>
                            <div className="flex-1 min-w-0 whitespace-pre-wrap break-all font-mono">
                              {isAdded ? (
                                <span className="text-slate-700 italic select-none">·</span>
                              ) : isModified ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="line-through text-rose-300/90">{row.oldContent}</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 select-none">
                                    Lama
                                  </span>
                                </div>
                              ) : (
                                renderConfigLineText(row.content)
                              )}
                            </div>
                          </div>

                          {/* SISI KANAN (TARGET B) */}
                          <div className={`flex items-start py-1 px-2.5 min-w-0 ${
                            isAdded 
                              ? 'bg-emerald-950/50 border-l-4 border-l-emerald-500 text-emerald-200 font-semibold' 
                              : isModified
                              ? 'bg-emerald-950/45 border-l-4 border-l-emerald-500 text-emerald-200 font-semibold'
                              : isRemoved
                              ? 'bg-slate-950/60 opacity-30 select-none'
                              : 'text-slate-300'
                          }`}>
                            <div className="w-8 text-right pr-2 text-slate-500 select-none font-mono shrink-0 font-medium text-[11px]">
                              {row.lineNumberB || ''}
                            </div>
                            <div className="w-4 text-center select-none font-mono font-bold shrink-0">
                              {isAdded ? <span className="text-emerald-400">+</span> : isModified ? <span className="text-emerald-400">Δ</span> : ' '}
                            </div>
                            <div className="flex-1 min-w-0 whitespace-pre-wrap break-all font-mono">
                              {isRemoved ? (
                                <span className="text-slate-700 italic select-none">·</span>
                              ) : isModified ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-emerald-200 font-bold">{row.content}</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 select-none">
                                    Baru
                                  </span>
                                  {row.blockContext && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 select-none border border-slate-700">
                                      {row.blockContext}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                renderConfigLineText(row.content)
                              )}

                              {row.blockContext && isAdded && (
                                <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 select-none font-mono border border-slate-700">
                                  {row.blockContext}
                                </span>
                              )}
                            </div>
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

      </div>

      {/* ================================================================= */}
      {/* MODAL RIWAYAT SNAPSHOT (DRAWER / OVERLAY) */}
      {/* ================================================================= */}
      {showSnapshotManager && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-sm">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-sm">
                  Kelola Riwayat Snapshot ({snapshots.length})
                </h3>
              </div>
              <button
                onClick={() => setShowSnapshotManager(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari snapshot..."
                    value={snapshotSearchQuery}
                    onChange={(e) => setSnapshotSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 outline-hidden"
                  />
                </div>
                {snapshots.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadAllSnapshots}
                      className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800 text-xs font-semibold cursor-pointer transition-colors"
                      title="Unduh seluruh snapshot perangkat ini sebagai arsip konfigurasi (.cfg)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Semua</span>
                    </button>
                    <button
                      type="button"
                      onClick={requestClearAllSnapshots}
                      className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Semua</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Snapshot Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredSnapshots.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Belum ada snapshot yang tersimpan.
                  </div>
                ) : (
                  filteredSnapshots.map((snap) => {
                    const isSelectedA = selectedSnapshotAId === snap.id;
                    const isSelectedB = selectedSnapshotBId === snap.id;

                    return (
                      <div
                        key={snap.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isSelectedA || isSelectedB
                            ? 'bg-slate-950 border-blue-500/70 shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs">
                                {snap.label}
                              </span>
                              {getTypeBadge(snap.type)}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                              <span className="font-mono text-slate-400">
                                {snap.lineCount} baris
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Set as A */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSnapshotAId(snap.id);
                                showFeedback(`✓ ${snap.label} dipilih sebagai Baseline [A]`);
                              }}
                              className={`px-2 py-1 rounded text-xs font-bold font-mono transition-colors cursor-pointer ${
                                isSelectedA
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-800 text-rose-300 hover:bg-slate-700'
                              }`}
                            >
                              [A] {isSelectedA ? '✓' : ''}
                            </button>

                            {/* Set as B */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSnapshotBId(snap.id);
                                showFeedback(`✓ ${snap.label} dipilih sebagai Target [B]`);
                              }}
                              className={`px-2 py-1 rounded text-xs font-bold font-mono transition-colors cursor-pointer ${
                                isSelectedB
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
                              }`}
                            >
                              [B] {isSelectedB ? '✓' : ''}
                            </button>

                            {/* Download */}
                            <button
                              type="button"
                              onClick={(e) => handleDownloadSingleSnapshot(snap, e)}
                              className="p-1.5 text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded border border-transparent hover:border-emerald-800/60 transition-colors cursor-pointer"
                              title={`Unduh file konfigurasi snapshot ini (.cfg)`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={(e) => requestDeleteSnapshot(snap.id, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Hapus snapshot ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSnapshotManager(false)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer"
              >
                Tutup & Kembali ke Diff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL PASTE / UPLOAD KONFIGURASI */}
      {/* ================================================================= */}
      {showPasteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-sm">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">
                  Paste / Upload File Konfigurasi
                </h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama / Label Snapshot:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Backup Sebelum Upgrade"
                  value={pasteLabel}
                  onChange={(e) => setPasteLabel(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 outline-hidden focus:border-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Isi Konfigurasi (Text / Running-Config):
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    Upload File (.txt, .cfg)
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.cfg,.conf,.log"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <textarea
                  rows={8}
                  placeholder="Paste isi 'show running-config' atau file teks konfigurasi di sini..."
                  value={pasteConfigText}
                  onChange={(e) => setPasteConfigText(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 font-mono outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePastedConfig}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer"
              >
                Simpan Sebagai Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL KONFIRMASI HAPUS PER SNAPSHOT */}
      {/* ================================================================= */}
      {snapshotToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-900/60 rounded-2xl shadow-2xl overflow-hidden text-sm">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-600/30">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-sm">Hapus Snapshot?</h3>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-slate-300 text-xs leading-relaxed">
                Apakah Anda yakin ingin menghapus snapshot ini secara permanen?
              </p>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
                <div className="font-semibold text-rose-300">{snapshotToDelete.label}</div>
                {snapshotToDelete.lineCount !== undefined && (
                  <div className="text-[11px] text-slate-400 mt-1">{snapshotToDelete.lineCount} baris konfigurasi</div>
                )}
              </div>
            </div>
            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSnapshotToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmExecuteDeleteSnapshot}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-semibold shadow cursor-pointer transition-colors"
              >
                Ya, Hapus Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL KONFIRMASI HAPUS SEMUA SNAPSHOT */}
      {/* ================================================================= */}
      {showClearAllConfirm && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-rose-900/80 rounded-2xl shadow-2xl overflow-hidden text-sm">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-600/30">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-sm">Hapus Semua Snapshot Perangkat?</h3>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-slate-300 text-xs leading-relaxed">
                Tindakan ini akan menghapus seluruh <strong>{snapshots.length} snapshot</strong> konfigurasi untuk perangkat{' '}
                <span className="text-rose-400 font-mono font-semibold">{activeDevice.name}</span>.
              </p>
              <p className="text-rose-300/80 text-[11px]">
                Semua riwayat snapshot akan dibersihkan dan tidak dapat dipulihkan.
              </p>
            </div>
            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmExecuteClearAll}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-semibold shadow cursor-pointer transition-colors"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL KONFIRMASI EKSEKUSI ROLLBACK */}
      {/* ================================================================= */}
      {showRollbackConfirm && diffResult?.rollbackScript && onExecuteRollbackScript && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-blue-800/80 rounded-2xl shadow-2xl overflow-hidden text-sm">
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-600/30">
                <Play className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-sm">Jalankan Script Rollback di Terminal?</h3>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-slate-300 text-xs leading-relaxed">
                Script rollback berikut akan dikirim dan dieksekusi baris per baris langsung ke terminal sesi aktif perangkat{' '}
                <span className="text-cyan-400 font-mono font-semibold">{activeDevice.name}</span>:
              </p>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto font-mono text-xs text-amber-300/90 whitespace-pre-wrap">
                {diffResult.rollbackScript}
              </div>
            </div>
            <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRollbackConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRollbackConfirm(false);
                  onExecuteRollbackScript(diffResult.rollbackScript);
                  onClose();
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Jalankan Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
