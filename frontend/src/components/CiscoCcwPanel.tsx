import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Download,
  Terminal,
  Shield,
  Search,
  HelpCircle,
  RefreshCw,
  Cpu,
  Layers,
  Zap,
  Boxes,
  ArrowRight,
  Info,
  X,
  Code
} from 'lucide-react';
import {
  CiscoBoQItem,
  parseUploadedBoqContent,
  generateDefaultCatalystBoq,
  explainCiscoOption,
  generateCcwBulkUploadText,
  generateCcwAutomationBotScript,
  CcwOptionExplanation,
  CISCO_CCW_OPTION_KNOWLEDGE
} from '../services/ciscoCcwExtensionService';
import { copyToClipboard } from '../utils/clipboard';

export interface CiscoCcwPanelProps {
  onSendToAiAssistant?: (prompt: string, contextPayload?: any) => void;
  onExecuteInTerminal?: (cmd: string) => void;
  activeUrl?: string;
  onClose?: () => void;
}

export const CiscoCcwPanel: React.FC<CiscoCcwPanelProps> = ({
  onSendToAiAssistant,
  onExecuteInTerminal,
  activeUrl,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'boq' | 'options' | 'troubleshoot' | 'bot'>('boq');
  
  // BoQ State
  const [boqData, setBoqData] = useState<{
    items: CiscoBoQItem[];
    detectedTotalGpl: number;
    validationSummary: { passed: number; warnings: number; errors: number; details: string[] };
  }>(() => generateDefaultCatalystBoq());

  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Option Explainer State
  const [optionQuery, setOptionQuery] = useState<string>('C9300-DNA-A');
  const [optionResult, setOptionResult] = useState<CcwOptionExplanation | null>(() => explainCiscoOption('C9300-DNA-A'));

  // Error Troubleshooter State
  const [errorInput, setErrorInput] = useState<string>('Invalid Configuration: Mandatory DNA subscription term not selected for Catalyst 9300');
  const [errorAnalysisResult, setErrorAnalysisResult] = useState<{
    rootCause: string;
    missingItems: string[];
    suggestedFix: string;
    recommendedPids: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (key: string, text: string) => {
    copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Handle File Upload (Excel / CSV / PDF text)
  const handleFileUpload = (file: File) => {
    setIsParsingFile(true);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string || '';
        const parsed = parseUploadedBoqContent(text, file.name);
        setBoqData(parsed);
      } catch (err) {
        console.error('Failed to parse uploaded BoQ file:', err);
      } finally {
        setIsParsingFile(false);
      }
    };
    reader.onerror = () => setIsParsingFile(false);
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Option Explanation Trigger
  const handleExplain = (pid: string) => {
    const res = explainCiscoOption(pid);
    setOptionResult(res);
  };

  // Analyze CCW Error
  const handleAnalyzeError = () => {
    const lower = errorInput.toLowerCase();
    if (lower.includes('dna') || lower.includes('license') || lower.includes('subscription')) {
      setErrorAnalysisResult({
        rootCause: 'Cisco CCW memvalidasi bahwa setiap sasis Catalyst 9000 Series (C9200/C9300/C9500) wajib memiliki pasangan lisensi Cisco DNA Subscription (durasi 3, 5, atau 7 tahun). Kuantitas lisensi harus persis sama dengan jumlah sasis.',
        missingItems: ['C9300-DNA-A-3Y atau C9300-DNA-E-3Y (Subscription Term)', 'Network Advantage / Essentials Base Activation'],
        suggestedFix: 'Buka konfigurator line item switch di CCW, buka tab "Software Subscriptions", lalu pilih Term 3 Year (atau 5 Year) pada paket DNA Advantage / Essentials.',
        recommendedPids: ['C9300-DNA-A-3Y', 'C9300-DNA-E-3Y', 'C9200-DNA-E-3Y']
      });
    } else if (lower.includes('power') || lower.includes('poe') || lower.includes('psu') || lower.includes('watt')) {
      setErrorAnalysisResult({
        rootCause: 'Kapasitas Power Supply Unit (PSU) yang terpasang tidak mencukupi untuk beban penuh PoE+ (30W per port) pada 48 port switch. PSU 350W hanya menyediakan 430W budget yang tidak cukup.',
        missingItems: ['Power Supply Kapasitas Tinggi (715W / 1100W)', 'Secondary Redundant Power Supply (PWR-C1-.../2)'],
        suggestedFix: 'Ubah opsi Primary Power Supply ke PWR-C1-715WAC-P (minimal) atau PWR-C1-1100WAC-P. Jika memerlukan redundansi daya penuh 1+1, tambahkan PWR-C1-715WAC-P/2.',
        recommendedPids: ['PWR-C1-715WAC-P', 'PWR-C1-1100WAC-P', 'PWR-C1-715WAC-P/2']
      });
    } else if (lower.includes('optic') || lower.includes('transceiver') || lower.includes('sfp')) {
      setErrorAnalysisResult({
        rootCause: 'Modul SFP+ 10G tidak didukung pada port uplink fixed tipe 1G, atau terdapat ketidakcocokan antara modul optik Multi-Mode (SR) dengan kabel Single-Mode.',
        missingItems: ['Network Uplink Module Modular C9300-NM-8X atau C9300-NM-4G', 'Transceiver SFP Kompatibel'],
        suggestedFix: 'Pastikan memilih modul uplink modular yang tepat (C9300-NM-8X untuk 10G/25G SFP+) sebelum menambahkan transceiver SFP-10G-SR.',
        recommendedPids: ['C9300-NM-8X', 'SFP-10G-SR', 'SFP-10G-LR', 'GLC-TE']
      });
    } else {
      setErrorAnalysisResult({
        rootCause: 'Terjadi inkonsistensi konfigurasi pada sub-opsi perangkat keras Cisco CCW.',
        missingItems: ['Sub-komponen wajib bertanda bintang (*) pada CCW Configurator'],
        suggestedFix: 'Lakukan verifikasi opsi Power Cord (CAB-TA-EU), Stacking Kit, dan garansi Smart Net Total Care (CON-SNT).',
        recommendedPids: ['CAB-TA-EU', 'STACK-T1-50CM', 'CON-SNT-C930048P']
      });
    }
  };

  // Export BoQ to CSV
  const handleExportCsv = () => {
    const csvContent = 'Line,Part Number,Description,Category,Quantity,Unit GPL USD,Total GPL USD\n' +
      boqData.items.map((i, idx) => `${idx + 1},"${i.pid}","${i.description}","${i.category}",${i.qty},${i.unitListPriceGplUsd},${i.totalListPriceGplUsd}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cisco_CCW_BoQ_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Send Initial Provisioning CLI to Terminal
  const handleSendProvisioningToTerminal = () => {
    if (!onExecuteInTerminal) return;
    const switchItem = boqData.items.find(i => i.category === 'Switch');
    const model = switchItem?.pid || 'C9300-48P';
    const cliScript = `! === Cisco ${model} Baseline Provisioning by 69 AI ===
hostname SW-CORE-01
!
vlan 10,20,30,99
!
interface Vlan1
 no ip address
 shutdown
!
interface Vlan99
 description Management-VLAN
 ip address 192.168.99.2 255.255.255.0
 no shutdown
!
ip default-gateway 192.168.99.1
ip name-server 8.8.8.8 1.1.1.1
!
spanning-tree mode rapid-pvst
spanning-tree portfast default
spanning-tree portfast bpduguard default
!
line vty 0 15
 transport input ssh
 login local
!
end
write memory`;
    onExecuteInTerminal(cliScript);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 border-l border-slate-800 text-xs select-none">
      {/* Header */}
      <div className="p-3 bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 border-b border-sky-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/40">
            <Boxes className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="font-bold text-sky-300 flex items-center gap-1.5">
              <span>Cisco CCW AI Specialist</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono">v3.0</span>
            </div>
            <div className="text-[10px] text-slate-400">
              BoQ Builder • Option Explainer • Error Diagnostics
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 bg-slate-900 border-b border-slate-800 p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('boq')}
          className={`py-1.5 px-2 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1 transition-all ${
            activeTab === 'boq'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>BoQ</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('options')}
          className={`py-1.5 px-2 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1 transition-all ${
            activeTab === 'options'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Opsi CCW</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('troubleshoot')}
          className={`py-1.5 px-2 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1 transition-all ${
            activeTab === 'troubleshoot'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Error CCW</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bot')}
          className={`py-1.5 px-2 rounded-md font-semibold text-[11px] flex items-center justify-center gap-1 transition-all ${
            activeTab === 'bot'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Code className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bot CCW</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: BoQ BUILDER */}
        {activeTab === 'boq' && (
          <div className="space-y-3">
            {/* Upload Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-sky-800/80 hover:border-sky-400 rounded-xl p-3 bg-sky-950/20 hover:bg-sky-950/40 transition-all cursor-pointer text-center group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="w-8 h-8 rounded-full bg-sky-600/20 text-sky-400 mx-auto flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Upload className="w-4 h-4" />
              </div>
              <div className="font-semibold text-sky-300">
                {uploadedFileName ? `File Terunggah: ${uploadedFileName}` : 'Upload Excel / PDF / RFP BoQ'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                AI akan membaca spesifikasi, mengekstrak PID Cisco, kuantitas, license, dan power supply secara otomatis
              </div>
            </div>

            {/* Quick Demo Loader */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBoqData(generateDefaultCatalystBoq())}
                className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Muat Paket Catalyst 9300 Ready-to-Quote</span>
              </button>
            </div>

            {/* Total GPL & Actions Banner */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Nilai GPL Estimasi</div>
                <div className="text-sm font-extrabold text-emerald-400 font-mono">
                  ${boqData.detectedTotalGpl.toLocaleString()} USD
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy('bulk', generateCcwBulkUploadText(boqData.items))}
                  className="px-2 py-1 rounded bg-sky-900 hover:bg-sky-800 text-sky-200 border border-sky-700 text-[10.5px] font-semibold flex items-center gap-1"
                  title="Salin format CCW Bulk Upload"
                >
                  {copiedKey === 'bulk' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Salin CCW Bulk</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10.5px] font-semibold flex items-center gap-1"
                  title="Unduh file CSV BoQ"
                >
                  <Download className="w-3 h-3 text-amber-400" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* BoQ Line Items Table */}
            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/50">
              <div className="p-2 bg-slate-900 font-semibold text-slate-300 text-[11px] border-b border-slate-800 flex items-center justify-between">
                <span>Daftar Part Number Cisco ({boqData.items.length} Item)</span>
                <span className="text-[10px] text-sky-400 font-normal">Siap Masuk CCW</span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                {boqData.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-2 hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sky-400 text-[11px]">{item.pid}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[10.5px] text-slate-300 truncate mt-0.5">
                        {item.description}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        GPL: ${item.unitListPriceGplUsd.toLocaleString()} × {item.qty} = ${(item.unitListPriceGplUsd * item.qty).toLocaleString()} USD
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-bold text-[10px]">
                        Qty: {item.qty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Rules Card */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hasil Validasi Aturan CCW</span>
              </div>
              <div className="space-y-1">
                {boqData.validationSummary.details.map((detail, dIdx) => (
                  <div key={dIdx} className="text-[10.5px] text-slate-300 bg-slate-950/70 p-1.5 rounded border border-slate-800/80 leading-relaxed">
                    {detail}
                  </div>
                ))}
              </div>
            </div>

            {/* Send to Terminal Button */}
            {onExecuteInTerminal && (
              <button
                type="button"
                onClick={handleSendProvisioningToTerminal}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-950 to-teal-950 hover:from-emerald-900 hover:to-teal-900 border border-emerald-800/80 text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kirim Template Konfigurasi Baseline Switch ke Terminal</span>
              </button>
            )}
          </div>
        )}

        {/* TAB 2: OPTION EXPLAINER */}
        {activeTab === 'options' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-sky-300">Pemeriksa & Penjelas Opsi Cisco CCW</div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={optionQuery}
                  onChange={(e) => setOptionQuery(e.target.value)}
                  placeholder="Masukkan Part Number / Opsi (contoh: C9300-DNA-A, PWR-C1, SFP-10G-SR)"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-[11px] outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleExplain(optionQuery)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-[11px] transition-colors"
                >
                  Jelaskan
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1 pt-1">
                {CISCO_CCW_OPTION_KNOWLEDGE.map((k) => (
                  <button
                    key={k.pidOrFamily}
                    type="button"
                    onClick={() => {
                      setOptionQuery(k.pidOrFamily);
                      setOptionResult(k);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700/60"
                  >
                    {k.pidOrFamily}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation Result Card */}
            {optionResult && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sky-300 text-[11.5px]">{optionResult.title}</div>
                  <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[9.5px] font-semibold">
                    {optionResult.category}
                  </span>
                </div>
                <div className="text-[11px] text-slate-200 leading-relaxed">
                  {optionResult.summary}
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-amber-400 uppercase">Perbandingan Pilihan Opsi:</div>
                  <div className="text-[10.5px] text-slate-300 whitespace-pre-line leading-relaxed">
                    {optionResult.comparison}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 space-y-1">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase">Rekomendasi Arsitek Cisco:</div>
                  <div className="text-[10.5px] text-emerald-200 leading-relaxed">
                    {optionResult.recommendation}
                  </div>
                </div>
                {optionResult.commonErrors && optionResult.commonErrors.length > 0 && (
                  <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 space-y-1">
                    <div className="text-[10px] font-bold text-rose-400 uppercase">Kesalahan Konfigurasi Umum:</div>
                    <ul className="list-disc list-inside text-[10px] text-rose-200/90 space-y-0.5">
                      {optionResult.commonErrors.map((err, ei) => (
                        <li key={ei}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ERROR TROUBLESHOOTER */}
        {activeTab === 'troubleshoot' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Diagnosa Error & Invalid Config CCW</span>
              </div>
              <textarea
                value={errorInput}
                onChange={(e) => setErrorInput(e.target.value)}
                rows={3}
                placeholder="Tempelkan pesan error / warning dari Cisco CCW di sini..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 text-[11px] outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={handleAnalyzeError}
                className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analisa Akar Masalah & Rekomendasi Part</span>
              </button>
            </div>

            {errorAnalysisResult && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-900/60 space-y-2.5 animate-in fade-in">
                <div>
                  <div className="text-[10px] font-bold text-amber-400 uppercase">Akar Penyebab Error:</div>
                  <div className="text-[11px] text-slate-200 mt-0.5 leading-relaxed">
                    {errorAnalysisResult.rootCause}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase">Langkah Solusi:</div>
                  <div className="text-[11px] text-emerald-200 mt-0.5 leading-relaxed">
                    {errorAnalysisResult.suggestedFix}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-sky-400 uppercase">Part Number Yang Direkomendasikan:</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {errorAnalysisResult.recommendedPids.map((pid) => (
                      <span key={pid} className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono text-[10px] font-bold">
                        {pid}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BOT CCW */}
        {activeTab === 'bot' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>Skrip Injeksi Otomasi Cisco CCW</span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Salin skrip di bawah ini, buka portal <strong>ccw.cisco.com</strong> di tab browser, buka Console DevTools (F12 / Inspect), lalu tempel (Paste) untuk mengisi seluruh line item BoQ secara instan.
              </p>
              <div className="relative">
                <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[10px] text-sky-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {generateCcwAutomationBotScript(boqData.items)}
                </pre>
                <button
                  type="button"
                  onClick={() => handleCopy('bot', generateCcwAutomationBotScript(boqData.items))}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 shadow"
                >
                  {copiedKey === 'bot' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Salin Skrip Bot</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
