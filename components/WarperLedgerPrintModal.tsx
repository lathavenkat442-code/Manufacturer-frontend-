import React, { useRef, useEffect, useState } from 'react';
import { Warper, YarnDispatch, WarperReturn, CompanyProfile } from '../types';
import { Printer, Download, Share2, ArrowLeft, X, LayoutTemplate } from 'lucide-react';
import { shareText } from '../lib/utils';
import html2pdf from 'html2pdf.js';

interface WarperLedgerPrintModalProps {
  warper: Warper;
  dispatches: YarnDispatch[];
  returns: WarperReturn[];
  warpOrders?: any[];
  looms?: any[];
  selectedDeniers?: string[];
  initialStartDate?: string;
  initialEndDate?: string;
  language?: 'ta' | 'en';
  onClose: () => void;
  autoPrint?: boolean;
}

export const WarperLedgerPrintModal: React.FC<WarperLedgerPrintModalProps> = ({
  warper,
  dispatches,
  returns,
  warpOrders = [],
  looms = [],
  selectedDeniers = ['ALL'],
  initialStartDate = '',
  initialEndDate = '',
  language = 'ta',
  onClose,
  autoPrint = false
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [currentDeniers, setCurrentDeniers] = useState<string[]>(selectedDeniers);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filter Dispatches & Returns for this Warper
  const isAll = currentDeniers.includes('ALL') || currentDeniers.length === 0;
  
  let warperDispatches = dispatches.filter(d => d.recipientType === 'warper' && d.recipientId === warper.id);
  let warperReturns = returns.filter(r => r.warperId === warper.id);

  if (!isAll) {
    warperDispatches = warperDispatches.filter(d => currentDeniers.includes(d.yarnType));
    warperReturns = warperReturns.filter(r => {
      if (r.sections) {
        return r.sections.some(s => currentDeniers.some(denier => s.name.startsWith(denier)));
      }
      return currentDeniers.some(denier => r.yarnType === denier || r.yarnType?.includes(denier));
    });
  }

  if (startDate) {
    warperDispatches = warperDispatches.filter(d => d.date >= startDate);
    warperReturns = warperReturns.filter(r => r.date >= startDate);
  }
  if (endDate) {
    warperDispatches = warperDispatches.filter(d => d.date <= endDate);
    warperReturns = warperReturns.filter(r => r.date <= endDate);
  }

  // Collect all unique denier|color pairs across ALL dispatches and returns
  const allDenierColors = Array.from(new Set([
    ...warperDispatches.filter(d => d.color).map(d => `${d.yarnType}|${d.color}`),
    ...warperReturns.flatMap(r => {
      if (r.sections) {
        return r.sections
          .filter(s => s.color && (isAll || currentDeniers.some(denier => s.name.startsWith(denier))))
          .map(s => {
            const denier = s.name.split(' - ')[0];
            return `${denier}|${s.color}`;
          });
      }
      return r.color ? [`${r.yarnType}|${r.color}`] : [];
    })
  ])).filter(Boolean).sort();

  // Determine optimal orientation: default landscape for wide tables
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(() => {
    return allDenierColors.length > 5 ? 'landscape' : 'landscape';
  });

  // Handle hardware / browser back button and ESC key
  useEffect(() => {
    window.history.pushState({ modal: 'warper_ledger_print', subview: true }, '');

    const handlePopState = () => {
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, autoPrint]);

  // Load company profile from localStorage
  const savedProfile = localStorage.getItem(`viyabaari_company_profile_guest`) || 
                       Object.keys(localStorage)
                         .filter(k => k.startsWith('viyabaari_company_profile_'))
                         .map(k => localStorage.getItem(k))
                         .find(v => !!v);
                         
  let companyProfile: CompanyProfile = {
    name: 'VIYABAARI TEXTILES',
    tamilName: 'வியாபாரி டெக்ஸ்டைல்ஸ்',
    gstin: '',
    phone: '',
    address: ''
  };

  if (savedProfile) {
    try {
      companyProfile = { ...companyProfile, ...JSON.parse(savedProfile) };
    } catch (e) {
      console.error('Failed to parse company profile', e);
    }
  }

  // Group dispatches by date and batch/id
  const groupedDispatches = Object.values(warperDispatches.reduce((acc, d) => {
    const key = d.createdAt || d.id;
    if (!acc[key]) {
      acc[key] = { ...d, isDispatch: true, timestamp: new Date(d.date).getTime(), items: [] };
    }
    acc[key].items.push({ yarnType: d.yarnType, color: d.color, weightKg: d.weightKg });
    acc[key].weightKg = acc[key].items.reduce((sum: number, item: any) => sum + item.weightKg, 0);
    return acc;
  }, {} as Record<string, any>));

  // Combine and sort chronologically
  const allTxns = [
    ...groupedDispatches,
    ...warperReturns.map(r => ({ ...r, isDispatch: false, timestamp: new Date(r.date).getTime() }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  // Map transactions to calculate color weights
  const processedTxns = allTxns.map(txn => {
    const colorWeights: Record<string, number> = {};
    let hasAnyWeight = false;
    
    allDenierColors.forEach(dc => {
      const [colDenier, colColor] = dc.split('|');
      let weight = 0;
      if (txn.isDispatch) {
        if (txn.items) {
          weight = txn.items
            .filter((i: any) => i.color === colColor && i.yarnType === colDenier)
            .reduce((sum: number, i: any) => sum + i.weightKg, 0);
        } else {
          if (txn.color === colColor && txn.yarnType === colDenier) weight = txn.weightKg;
        }
      } else {
        if (txn.sections) {
          weight = txn.sections
            .filter((s: any) => s.color === colColor && s.name.startsWith(colDenier))
            .reduce((sum: number, s: any) => sum + s.weightKg, 0);
        } else {
          if (txn.color === colColor && txn.yarnType === colDenier) weight = txn.weightKg;
        }
      }
      colorWeights[dc] = weight;
      if (weight > 0) hasAnyWeight = true;
    });
    
    return { ...txn, colorWeights, hasAnyWeight };
  }).filter(txn => txn.hasAnyWeight || isAll);

  // Calculate Running Totals for Balances
  const totalBalances: Record<string, number> = {};
  allDenierColors.forEach(dc => totalBalances[dc] = 0);

  processedTxns.forEach(txn => {
    allDenierColors.forEach(dc => {
      const w = txn.colorWeights[dc] || 0;
      if (txn.isDispatch) {
        totalBalances[dc] += w;
      } else {
        totalBalances[dc] -= w;
      }
    });
  });

  const formattedDate = new Date().toLocaleDateString('ta-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Calculate table layout sizing based on column count
  const numColorCols = allDenierColors.length;
  const isCompact = numColorCols > 5;
  const isHighDensity = numColorCols > 9;
  const isUltraDensity = numColorCols > 14;

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Download PDF Handler - Full capture width ensuring ALL columns & rows fit without horizontal cut-off
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);
    const cleanName = (warper.name || 'warper').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanName}_ledger_statement_${new Date().toISOString().split('T')[0]}.pdf`;

    // Measure table's actual scroll width to guarantee zero cut-off
    const tableEl = printRef.current.querySelector('table');
    const actualWidth = tableEl ? Math.max(tableEl.scrollWidth, tableEl.offsetWidth, 1100) : 1100;
    const captureWidth = actualWidth + 50;

    const opt = {
      margin: 8,
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        width: captureWidth,
        windowWidth: captureWidth + 40,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc: Document) => {
          clonedDoc.body.style.width = `${captureWidth}px`;
          clonedDoc.body.style.maxWidth = 'none';
          clonedDoc.body.style.overflow = 'visible';

          const el = clonedDoc.getElementById('pdf-warper-statement-container');
          if (el) {
            el.style.width = `${captureWidth}px`;
            el.style.minWidth = `${captureWidth}px`;
            el.style.maxWidth = 'none';
            el.style.overflow = 'visible';
            el.style.padding = '15px';
            el.style.boxShadow = 'none';
          }
          const wrappers = clonedDoc.querySelectorAll('.overflow-x-auto, .overflow-auto');
          wrappers.forEach(w => {
            if (w instanceof HTMLElement) {
              w.style.overflow = 'visible';
              w.style.width = '100%';
              w.style.maxWidth = 'none';
            }
          });
        }
      },
      jsPDF: {
        unit: 'pt',
        format: 'a4',
        orientation: 'landscape' as const
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        avoid: ['tr', 'thead', 'tfoot', '.avoid-break']
      }
    };

    try {
      await html2pdf().set(opt).from(printRef.current).save();
    } catch (e) {
      console.error('PDF generation failed:', e);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // WhatsApp Share Handler
  const handleShare = () => {
    let text = `*${companyProfile.tamilName || companyProfile.name || 'VIYABAARI TEXTILES'}*\n`;
    text += `*${language === 'ta' ? 'வார்ப்புகாரர் கணக்கு அறிக்கை' : 'Warper Ledger Statement'}*\n`;
    text += `--------------------------------\n`;
    text += `*${language === 'ta' ? 'வார்ப்புகாரர்' : 'Warper'}:* ${warper.name}\n`;
    if (warper.phone) text += `*${language === 'ta' ? 'போன்' : 'Phone'}:* ${warper.phone}\n`;
    text += `*${language === 'ta' ? 'தேதி' : 'Date'}:* ${formattedDate}\n`;
    if (startDate || endDate) {
      text += `*${language === 'ta' ? 'காலம்' : 'Period'}:* ${startDate || '—'} ${language === 'ta' ? 'முதல்' : 'to'} ${endDate || '—'}\n`;
    }
    text += `--------------------------------\n`;
    text += `*${language === 'ta' ? 'இருப்பு விவரம் (Balances)' : 'Balances'}:*\n`;
    
    allDenierColors.forEach(dc => {
      const [d, c] = dc.split('|');
      const bal = totalBalances[dc] || 0;
      text += `• ${c} (${d}): *${bal.toFixed(2)} Kg*\n`;
    });

    text += `--------------------------------\n`;
    text += `_Generated via ${companyProfile.tamilName || companyProfile.name || 'Viyabaari'}_`;

    shareText(text);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-zinc-950/85 backdrop-blur-sm overflow-y-auto p-2 sm:p-4 md:p-6 print:p-0 print:m-0 print:bg-white print:static print:overflow-visible print:block">
      {/* Dynamic Print Page Style for Browser Print Dialog */}
      <style>{`
        @media print {
          @page {
            size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
            margin: 5mm;
          }
          body, html {
            width: 100% !important;
            height: auto !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }
          #pdf-warper-statement-container {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          #pdf-warper-statement-container table {
            width: 100% !important;
            table-layout: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
        }
      `}</style>

      {/* Top Action Bar (Hidden in Print) */}
      <div className="max-w-7xl mx-auto mb-4 bg-zinc-900 text-white p-3 sm:p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-zinc-800 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer"
            title={language === 'ta' ? 'பின்னால் செல்ல' : 'Go Back'}
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{language === 'ta' ? 'பின்னால்' : 'Back'}</span>
          </button>

          <div>
            <h2 className="text-sm sm:text-base font-black text-white tamil-font truncate max-w-[200px] sm:max-w-xs">
              {warper.name} - {language === 'ta' ? 'கணக்கு அறிக்கை' : 'Statement'}
            </h2>
            <p className="text-[10px] text-zinc-400 font-medium">
              {processedTxns.length} {language === 'ta' ? 'பதிவுகள்' : 'entries'} • {allDenierColors.length} {language === 'ta' ? 'கலர்கள்/டீனியர்கள்' : 'colors/deniers'}
            </p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Orientation Toggle */}
          <button
            onClick={() => setOrientation(prev => prev === 'landscape' ? 'portrait' : 'landscape')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition active:scale-95 cursor-pointer border ${orientation === 'landscape' ? 'bg-zinc-800 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}
            title={language === 'ta' ? 'தாள் அமைப்பு (Orientation)' : 'Page Orientation'}
          >
            <LayoutTemplate size={14} className={orientation === 'landscape' ? 'rotate-90' : ''} />
            <span>{orientation === 'landscape' ? (language === 'ta' ? 'கிடைமட்டம்' : 'Landscape') : (language === 'ta' ? 'செங்குத்து' : 'Portrait')}</span>
          </button>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1 rounded-xl text-xs border border-zinc-700">
            <span className="text-[9px] text-zinc-400 uppercase font-black">{language === 'ta' ? 'முதல்' : 'From'}</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-zinc-100 text-xs font-bold outline-none cursor-pointer"
            />
            <span className="text-zinc-500">|</span>
            <span className="text-[9px] text-zinc-400 uppercase font-black">{language === 'ta' ? 'வரை' : 'To'}</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-zinc-100 text-xs font-bold outline-none cursor-pointer"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="p-0.5 text-rose-400 hover:text-rose-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition cursor-pointer"
          >
            <Printer size={15} />
            <span>{language === 'ta' ? 'பிரிண்ட் செய்' : 'Print'}</span>
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-blue-950/40 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <Download size={15} />
            <span>{isGeneratingPdf ? (language === 'ta' ? 'தயாராகிறது...' : 'Generating...') : (language === 'ta' ? 'PDF டவுன்லோட்' : 'Download PDF')}</span>
          </button>

          <button
            onClick={handleShare}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-black flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title={language === 'ta' ? 'வாட்ஸ்அப்பில் பகிர்க' : 'Share WhatsApp'}
          >
            <Share2 size={16} />
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 hover:bg-rose-900/60 text-zinc-400 hover:text-rose-300 rounded-xl transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div 
        ref={printRef}
        id="pdf-warper-statement-container"
        className="bg-white text-black p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl max-w-7xl mx-auto print:max-w-none print:w-full print:p-0 print:m-0 print:shadow-none print:rounded-none print:border-none font-sans"
        style={{ color: '#000000', backgroundColor: '#ffffff' }}
      >
        {/* Top Header matching user's layout specification:
            Left Corner: "வார்ப்புகாரர் கணக்கு அறிக்கை" & Shop Name
            Right Corner: Warper Name, Date, Denier */}
        <div className="border-b-2 border-black pb-3 mb-4">
          <div className="flex justify-between items-start">
            {/* Left Corner */}
            <div className="max-w-[55%]">
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase leading-tight font-sans">
                {language === 'ta' ? 'வார்ப்புகாரர் கணக்கு அறிக்கை' : 'WARPER LEDGER STATEMENT'}
              </h1>
              <p className="text-sm sm:text-base font-black text-zinc-900 mt-1 uppercase">
                {companyProfile.tamilName || companyProfile.name || 'வியாபாரி டெக்ஸ்டைல்ஸ்'}
              </p>
              {companyProfile.address && (
                <p className="text-[11px] font-bold text-zinc-700 mt-0.5 leading-snug">
                  {companyProfile.address}
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 text-[11px] font-bold text-zinc-700 mt-0.5">
                {companyProfile.phone && <span>போன்: {companyProfile.phone}</span>}
                {companyProfile.gstin && <span>GSTIN: {companyProfile.gstin}</span>}
              </div>
            </div>

            {/* Right Corner */}
            <div className="text-right min-w-[240px] max-w-[45%]">
              <div className="border border-black rounded-lg p-2.5 bg-zinc-50 print:bg-white text-left">
                <table className="w-full text-xs font-bold text-black border-collapse">
                  <tbody>
                    <tr>
                      <td className="text-[10px] font-black text-zinc-700 uppercase py-0.5 pr-2 whitespace-nowrap align-top">
                        {language === 'ta' ? 'வார்ப்புகாரர்:' : 'Warper:'}
                      </td>
                      <td className="text-sm font-black text-black text-right uppercase py-0.5">
                        {warper.name}
                      </td>
                    </tr>
                    {warper.phone && !warper.phone.toLowerCase().includes('august') && !warper.phone.toLowerCase().includes('month') && (
                      <tr>
                        <td className="text-[10px] font-bold text-zinc-600 uppercase py-0.5 pr-2 whitespace-nowrap align-top">
                          {language === 'ta' ? 'போன்:' : 'Phone:'}
                        </td>
                        <td className="text-xs font-bold text-black text-right py-0.5">
                          {warper.phone}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="text-[10px] font-bold text-zinc-600 uppercase py-0.5 pr-2 whitespace-nowrap align-top">
                        {language === 'ta' ? 'தேதி:' : 'Date:'}
                      </td>
                      <td className="text-xs font-black text-black text-right py-0.5">
                        {formattedDate}
                      </td>
                    </tr>
                    {(startDate || endDate) && (
                      <tr>
                        <td className="text-[10px] font-bold text-zinc-600 uppercase py-0.5 pr-2 whitespace-nowrap align-top">
                          {language === 'ta' ? 'காலம்:' : 'Period:'}
                        </td>
                        <td className="text-[11px] font-bold text-black text-right py-0.5">
                          {startDate ? new Date(startDate).toLocaleDateString('ta-IN') : '—'} முதல் {endDate ? new Date(endDate).toLocaleDateString('ta-IN') : '—'}
                        </td>
                      </tr>
                    )}
                    <tr className="border-t border-zinc-300">
                      <td className="text-[10px] font-black text-zinc-700 uppercase pt-1 pr-2 whitespace-nowrap align-top">
                        {language === 'ta' ? 'டீனியர்:' : 'Denier:'}
                      </td>
                      <td className="text-[11px] font-black text-black text-right pt-1">
                        {isAll ? (language === 'ta' ? 'அனைத்து டீனியர்கள்' : 'All Deniers') : currentDeniers.join(', ')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Statement Table with ALL rows and full column fitting */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className={`w-full border-collapse border-2 border-black ${isUltraDensity ? 'text-[8.5px]' : isHighDensity ? 'text-[9.5px]' : isCompact ? 'text-[10.5px]' : 'text-xs'}`}>
            <thead>
              <tr className="bg-zinc-100 print:bg-zinc-100 text-black font-black">
                <th className={`border border-black ${isUltraDensity ? 'px-1 py-1 text-[8.5px]' : isHighDensity ? 'px-1 py-1 text-[9px]' : 'px-1.5 py-1.5'} text-center whitespace-nowrap`}>
                  {language === 'ta' ? 'தேதி' : 'Date'}
                </th>
                <th className={`border border-black ${isUltraDensity ? 'px-0.5 py-1 text-[8.5px]' : isHighDensity ? 'px-1 py-1 text-[9px]' : 'px-1.5 py-1.5'} text-center whitespace-nowrap`}>
                  {language === 'ta' ? 'வ.எண்' : 'S.No'}
                </th>
                <th className={`border border-black ${isUltraDensity ? 'px-1 py-1 text-[8.5px]' : isHighDensity ? 'px-1.5 py-1 text-[9.5px]' : 'px-2 py-1.5'} text-left`}>
                  {language === 'ta' ? 'விவரம்' : 'Particulars'}
                </th>
                <th className={`border border-black ${isUltraDensity ? 'px-0.5 py-1 text-[8.5px]' : isHighDensity ? 'px-1 py-1 text-[9px]' : 'px-1.5 py-1.5'} text-center whitespace-nowrap`}>
                  {language === 'ta' ? 'இழை' : 'Ends'}
                </th>
                <th className={`border border-black ${isUltraDensity ? 'px-0.5 py-1 text-[8.5px]' : isHighDensity ? 'px-1 py-1 text-[9px]' : 'px-1.5 py-1.5'} text-center whitespace-nowrap`}>
                  {language === 'ta' ? 'மீட்டர்' : 'Meter'}
                </th>
                {allDenierColors.map(dc => {
                  const [denier, color] = dc.split('|');
                  return (
                    <th key={dc} className={`border border-black ${isUltraDensity ? 'px-0.5 py-0.5' : isHighDensity ? 'px-1 py-1' : 'px-1.5 py-1.5'} text-right`}>
                      <div className="leading-tight text-center sm:text-right">
                        <div className={`text-black font-black uppercase ${isUltraDensity ? 'text-[8px]' : isHighDensity ? 'text-[9px]' : 'text-[10px]'}`}>{color}</div>
                        <div className={`text-zinc-600 font-bold ${isUltraDensity ? 'text-[7px]' : isHighDensity ? 'text-[8px]' : 'text-[9px]'}`}>{denier}</div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {processedTxns.length === 0 ? (
                <tr>
                  <td colSpan={5 + allDenierColors.length} className="border border-black p-8 text-center text-zinc-500 font-bold">
                    {language === 'ta' ? 'எந்த பதிவுகளும் காணப்படவில்லை' : 'No transaction entries found'}
                  </td>
                </tr>
              ) : (
                processedTxns.map((txn, idx) => {
                  const isDispatch = txn.isDispatch;
                  const dateStr = new Date(txn.date).toLocaleDateString('ta-IN');
                  
                  return (
                    <tr 
                      key={txn.id || idx} 
                      className={`hover:bg-zinc-50 ${idx % 2 === 1 ? 'bg-zinc-50/70 print:bg-zinc-50' : 'bg-white'}`}
                      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                    >
                      <td className={`border border-black ${isUltraDensity ? 'px-0.5 py-0.5 text-[8px]' : isHighDensity ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-xs'} text-center font-bold text-black whitespace-nowrap`}>
                        {dateStr}
                      </td>
                      <td className={`border border-black ${isUltraDensity ? 'px-0.5 py-0.5 text-[8px]' : isHighDensity ? 'px-0.5 py-0.5 text-[9px]' : 'px-1 py-1 text-xs'} text-center font-black text-black`}>
                        {idx + 1}
                      </td>
                      <td className={`border border-black ${isUltraDensity ? 'px-1 py-0.5 text-[8.5px]' : isHighDensity ? 'px-1.5 py-0.5 text-[9.5px]' : 'px-2 py-1 text-xs'} text-left font-bold text-black leading-snug`}>
                        {isDispatch ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="font-black text-black">
                              {language === 'ta' ? 'நூல் வரவு' : 'Yarn Given'}
                              {txn.supplierName && ` - ${txn.supplierName}`}
                            </div>
                            {txn.billNumber && (
                              <div className="text-[10px] sm:text-xs font-bold text-zinc-600">
                                {language === 'ta' ? 'பில் எண்' : 'Bill'}: #{txn.billNumber}
                              </div>
                            )}
                            {txn.items && txn.items.length > 0 && (
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {txn.items.map((item: any, iIdx: number) => (
                                  <div key={iIdx} className="text-[10px] sm:text-xs text-zinc-700 font-semibold">
                                    {item.yarnType ? `${item.yarnType} ` : ''}{item.color} - {item.weightKg} kg
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (() => {
                          const order = warpOrders.find((o: any) => o.id === txn.orderId);
                          const weaverName = order?.weaverName || txn.weaverName || '';
                          const loomNumber = order?.loomNumber || txn.loomNumber || (looms.find((l: any) => l.id === txn.loomId || l.id === order?.loomId)?.loomNumber) || '';
                          const orderNo = order?.orderNumber || txn.orderNo || txn.orderNumber || (order?.id ? order.id.slice(-6) : '');
                          
                          // Section items breakdown
                          const sectionItems: { denier: string; color: string; ends: number | string }[] = [];
                          if (txn.sections && Array.isArray(txn.sections) && txn.sections.length > 0) {
                            txn.sections.forEach((s: any) => {
                              if (s.color) {
                                const denierPart = s.name ? s.name.split(' - ')[0] : '';
                                sectionItems.push({
                                  denier: denierPart,
                                  color: s.color,
                                  ends: s.ends || 0
                                });
                              }
                            });
                          } else if (order?.sections && Array.isArray(order.sections) && order.sections.length > 0) {
                            order.sections.forEach((s: any) => {
                              if (s.color) {
                                const denierPart = s.name ? s.name.split(' - ')[0] : '';
                                sectionItems.push({
                                  denier: denierPart,
                                  color: s.color,
                                  ends: s.ends || 0
                                });
                              }
                            });
                          } else if (txn.color) {
                            sectionItems.push({
                              denier: txn.yarnType || '',
                              color: txn.color,
                              ends: txn.ends || 0
                            });
                          }

                          return (
                            <div className="flex flex-col gap-0.5">
                              {/* 1st Line: தரிக்காரர் பெயர் அதன் அருகில் தறி எண் */}
                              <div className="font-black text-black">
                                {weaverName ? (
                                  <span>{weaverName} {loomNumber ? `(${language === 'ta' ? 'தறி' : 'Loom'} ${loomNumber})` : ''}</span>
                                ) : (
                                  <span>{language === 'ta' ? 'வார்ப்பு வரவு' : 'Warp Done'} {loomNumber ? `(${language === 'ta' ? 'தறி' : 'Loom'} ${loomNumber})` : ''}</span>
                                )}
                              </div>

                              {/* 2nd Line: ஆர்டர் ஐடி */}
                              {orderNo && (
                                <div className="text-[10px] sm:text-xs font-black text-zinc-700">
                                  {orderNo.startsWith('ORD-') ? orderNo : `ORD-${orderNo}`}
                                </div>
                              )}

                              {/* 3rd Line onwards: டீனியர் அதன் அருகே கலர் அதன் அருகே எத்தனை இழை */}
                              {sectionItems.length > 0 && (
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                  {sectionItems.map((item, sIdx) => (
                                    <div key={sIdx} className="text-[10px] sm:text-xs text-zinc-800 font-semibold">
                                      {item.denier ? `${item.denier} ` : ''}{item.color} - {item.ends} {language === 'ta' ? 'இழை' : 'ends'}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className={`border border-black ${isUltraDensity ? 'px-0.5 py-0.5 text-[8px]' : isHighDensity ? 'px-0.5 py-0.5 text-[9px]' : 'px-1 py-1 text-xs'} text-center font-bold text-black whitespace-nowrap`}>
                        {!isDispatch ? (
                          txn.totalEnds || txn.ends || (txn.sections ? txn.sections.reduce((sum: number, s: any) => sum + (Number(s.ends) || 0), 0) : '-')
                        ) : '-'}
                      </td>
                      <td className={`border border-black ${isUltraDensity ? 'px-0.5 py-0.5 text-[8px]' : isHighDensity ? 'px-0.5 py-0.5 text-[9px]' : 'px-1 py-1 text-xs'} text-center font-bold text-black whitespace-nowrap`}>
                        {!isDispatch ? (txn.meters || '-') : '-'}
                      </td>

                      {/* Denier Weights */}
                      {allDenierColors.map(dc => {
                        const weight = txn.colorWeights[dc] || 0;
                        return (
                          <td key={dc} className={`border border-black ${isUltraDensity ? 'px-0.5 py-0.5 text-[8px]' : isHighDensity ? 'px-0.5 py-0.5 text-[9px]' : 'px-1 py-1 text-xs'} text-right font-black whitespace-nowrap`}>
                            {weight > 0 ? (
                              <span className={isDispatch ? 'text-emerald-700 print:text-black font-black' : 'text-rose-700 print:text-black font-black'}>
                                {isDispatch ? '+' : '-'}{weight.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-zinc-300 print:text-zinc-400 font-normal">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Balances Footer */}
            <tfoot>
              <tr className="bg-zinc-200 print:bg-zinc-200 text-black font-black border-t-2 border-black" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <td colSpan={5} className="border border-black px-2 py-1.5 text-right uppercase tracking-wider font-black whitespace-nowrap">
                  {language === 'ta' ? 'தற்போதைய இருப்பு (TOTAL BALANCE):' : 'CURRENT BALANCE:'}
                </td>
                {allDenierColors.map(dc => {
                  const bal = totalBalances[dc] || 0;
                  return (
                    <td key={dc} className={`border border-black ${isUltraDensity ? 'px-0.5 py-1 text-[8.5px]' : isHighDensity ? 'px-0.5 py-1 text-[9.5px]' : 'px-1 py-1 text-xs'} text-right font-black text-black whitespace-nowrap`}>
                      {bal.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer / Signatures */}
        <div className="mt-8 pt-6 border-t border-zinc-300 flex justify-between items-end text-xs font-bold text-black print:mt-8 avoid-break" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className="text-center min-w-[160px]">
            <div className="h-10"></div>
            <div className="border-t border-black pt-1 uppercase">
              {language === 'ta' ? 'வார்ப்புகாரர் கையொப்பம்' : 'Warper Signature'}
            </div>
          </div>

          <div className="text-center min-w-[160px]">
            <div className="h-10"></div>
            <div className="border-t border-black pt-1 uppercase">
              {language === 'ta' ? 'உரிமையாளர் கையொப்பம்' : 'Authorized Signature'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Back / Print Action Row (Hidden in Print) */}
      <div className="max-w-7xl mx-auto mt-4 flex justify-between items-center print:hidden">
        <button
          onClick={onClose}
          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-sm font-black flex items-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>{language === 'ta' ? 'பின்னால் செல்ல' : 'Back to Warpers'}</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-blue-950/50 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <Download size={18} />
            <span>{isGeneratingPdf ? (language === 'ta' ? 'தயாராகிறது...' : 'Generating...') : (language === 'ta' ? 'PDF டவுன்லோட்' : 'Download PDF')}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95 transition cursor-pointer"
          >
            <Printer size={18} />
            <span>{language === 'ta' ? 'பிரிண்ட் செய்க' : 'Print Statement'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
