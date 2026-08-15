import React, { useRef, useEffect } from 'react';
import { WarpOrder, Warper, YarnDispatch, WarperReturn, CompanyProfile } from '../types';
import { Printer, Download, Share2, X, FileText, ArrowLeft } from 'lucide-react';
import { shareText } from '../lib/utils';
import html2pdf from 'html2pdf.js';

interface WarpOrderPrintModalProps {
  order: WarpOrder;
  warper?: Warper | null;
  dispatches: YarnDispatch[];
  returns: WarperReturn[];
  language?: 'ta' | 'en';
  onClose: () => void;
}

export const WarpOrderPrintModal: React.FC<WarpOrderPrintModalProps> = ({
  order,
  warper,
  dispatches,
  returns,
  language = 'ta',
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Handle hardware / browser back button and ESC key
  useEffect(() => {
    // Push a state for this modal so mobile back button pops it
    window.history.pushState({ modal: 'warp_order_print', subview: true }, '');

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

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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

  // 1. Structure Sections
  interface PrintableSection {
    name: string;
    denier: string;
    color: string;
    ends: number;
    weightKg: number;
  }

  let sectionsList: PrintableSection[] = [];

  if (order.orderType === 'TOP_WARP') {
    const rawSections = order.topWarpSections || [];
    sectionsList = rawSections.map(sec => {
      const denier = sec.name.includes(' - ') ? sec.name.split(' - ')[0] : (order.topWarpYarnType || order.warpYarnType || '-');
      const cleanName = sec.name.includes(' - ') ? sec.name.split(' - ').slice(1).join(' - ') : sec.name;
      return {
        name: cleanName || sec.name || (language === 'ta' ? 'மேல் வார்ப்பு' : 'Top Warp'),
        denier: denier || '-',
        color: sec.color || '-',
        ends: sec.ends || 0,
        weightKg: sec.weightKg || 0
      };
    });
  } else if (order.orderType === 'ZARI_BOBBIN') {
    const totalEnds = (order.zariBobbins || 0) * (order.zariEndsPerBobbin || 0);
    sectionsList = [{
      name: language === 'ta' ? `ஜரிகை பாபின் (${order.zariBobbins || 1} பாபின் × ${order.zariEndsPerBobbin || 0} இழை)` : `Zari Bobbin (${order.zariBobbins || 1} Bobbins × ${order.zariEndsPerBobbin || 0} Ends)`,
      denier: order.zariYarnType || order.warpYarnType || 'Zari',
      color: order.zariColor || 'Zari',
      ends: totalEnds,
      weightKg: order.totalYarnWeight || 0
    }];
  } else {
    // MAIN_WARP or default
    const rawSections = order.sections || [];
    sectionsList = rawSections.map(sec => {
      const denier = sec.name.includes(' - ') ? sec.name.split(' - ')[0] : (order.warpYarnType || '-');
      const cleanName = sec.name.includes(' - ') ? sec.name.split(' - ').slice(1).join(' - ') : sec.name;
      return {
        name: cleanName || sec.name || (language === 'ta' ? 'வார்ப்பு பகுதி' : 'Warp Section'),
        denier: denier || '-',
        color: sec.color || '-',
        ends: sec.ends || 0,
        weightKg: sec.weightKg || 0
      };
    });
  }

  const totalStructureEnds = sectionsList.reduce((sum, s) => sum + s.ends, 0);
  const totalStructureWeight = sectionsList.reduce((sum, s) => sum + s.weightKg, 0);

  // 2. Warper Color Stocks Calculation
  const warperId = order.warperId || warper?.id;

  const warperDispatches = dispatches.filter(d => d.recipientType === 'warper' && d.recipientId === warperId);
  const warperReturns = returns.filter(r => r.warperId === warperId);

  // Color-wise dispatches & returns
  const colorDispatched: Record<string, number> = {};
  const colorReturned: Record<string, number> = {};

  warperDispatches.forEach((d: any) => {
    if (d.items && Array.isArray(d.items) && d.items.length > 0) {
      d.items.forEach((it: any) => {
        const c = (it.color || 'Unknown').trim();
        colorDispatched[c] = (colorDispatched[c] || 0) + (it.weightKg || 0);
      });
    } else {
      const c = (d.color || 'Unknown').trim();
      colorDispatched[c] = (colorDispatched[c] || 0) + (d.weightKg || 0);
    }
  });

  warperReturns.forEach((r: any) => {
    if (r.sections && Array.isArray(r.sections) && r.sections.length > 0) {
      r.sections.forEach((sec: any) => {
        const c = (sec.color || 'Unknown').trim();
        colorReturned[c] = (colorReturned[c] || 0) + (sec.weightKg || 0);
      });
    } else {
      const c = (r.color || 'Unknown').trim();
      colorReturned[c] = (colorReturned[c] || 0) + (r.weightKg || 0);
    }
  });

  // Unique colors in this order
  interface ColorSummaryItem {
    color: string;
    deniers: string;
    totalEnds: number;
    warpWeightKg: number;
    currentStockKg: number;
    stockAfterWarpKg: number;
  }

  const colorMap = new Map<string, { ends: number; weight: number; deniers: Set<string> }>();

  sectionsList.forEach(sec => {
    const c = sec.color.trim();
    if (!colorMap.has(c)) {
      colorMap.set(c, { ends: 0, weight: 0, deniers: new Set() });
    }
    const data = colorMap.get(c)!;
    data.ends += sec.ends;
    data.weight += sec.weightKg;
    if (sec.denier && sec.denier !== '-') {
      data.deniers.add(sec.denier);
    }
  });

  const colorSummaryList: ColorSummaryItem[] = Array.from(colorMap.entries()).map(([color, data]) => {
    const dispatched = colorDispatched[color] || 0;
    const returned = colorReturned[color] || 0;
    const currentStock = dispatched - returned;
    const stockAfter = currentStock - data.weight;

    return {
      color,
      deniers: Array.from(data.deniers).join(', ') || order.warpYarnType || '-',
      totalEnds: data.ends,
      warpWeightKg: parseFloat(data.weight.toFixed(3)),
      currentStockKg: parseFloat(currentStock.toFixed(3)),
      stockAfterWarpKg: parseFloat(stockAfter.toFixed(3))
    };
  });

  const totalSummaryEnds = colorSummaryList.reduce((sum, c) => sum + c.totalEnds, 0);
  const totalSummaryOrderWeight = colorSummaryList.reduce((sum, c) => sum + c.warpWeightKg, 0);
  const totalSummaryCurrentStock = colorSummaryList.reduce((sum, c) => sum + c.currentStockKg, 0);
  const totalSummaryAfterStock = colorSummaryList.reduce((sum, c) => sum + c.stockAfterWarpKg, 0);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    const orderNo = order.orderNumber || order.id.slice(-4);
    const filename = `Warp_Order_${orderNo}_${new Date().toISOString().split('T')[0]}.pdf`;

    const opt = {
      margin: [8, 8, 8, 8] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(printRef.current).save();
    } catch (e) {
      console.error('PDF generation failed:', e);
      window.print();
    }
  };

  // Share via WhatsApp / Native Share
  const handleShare = () => {
    const orderNo = order.orderNumber || order.id.slice(-4);
    let text = `*${companyProfile.tamilName || companyProfile.name || 'VIYABAARAM'}*\n`;
    if (companyProfile.gstin) text += `GST: ${companyProfile.gstin} | `;
    if (companyProfile.phone) text += `Phone: ${companyProfile.phone}\n`;
    text += `--------------------------------\n`;
    text += `*${language === 'ta' ? 'வார்ப்பு ஆர்டர் சீட்டு' : 'WARP ORDER SLIP'}*\n`;
    text += `*${language === 'ta' ? 'ஆர்டர் எண்' : 'Order No'}:* ${orderNo}\n`;
    text += `*${language === 'ta' ? 'தறிக்காரர்' : 'Weaver'}:* ${order.weaverName || '-'}\n`;
    text += `*${language === 'ta' ? 'தறி எண்' : 'Loom No'}:* ${order.loomNumber || '-'}\n`;
    text += `*${language === 'ta' ? 'வார்ப்பாளர்' : 'Warper'}:* ${warper?.name || '-'}\n`;
    text += `*${language === 'ta' ? 'டிசைன்' : 'Design'}:* ${order.designName || '-'}\n`;
    text += `*${language === 'ta' ? 'தேதி' : 'Date'}:* ${new Date(order.createdAt).toLocaleDateString('ta-IN')}\n`;
    text += `--------------------------------\n`;
    text += `*${language === 'ta' ? 'வார்ப்பு அமைப்புகள்' : 'Warp Structure'}:*\n`;
    sectionsList.forEach((s, idx) => {
      text += `${idx + 1}. ${s.name} (${s.color}) - ${s.ends} ${language === 'ta' ? 'இழை' : 'ends'} | ${s.weightKg} kg\n`;
    });
    text += `--------------------------------\n`;
    text += `*${language === 'ta' ? 'கலர் வாரியாக சுருக்கம் & இருப்பு' : 'Color Summary & Stock'}:*\n`;
    colorSummaryList.forEach((c, idx) => {
      text += `${idx + 1}. *${c.color}*: ${c.totalEnds} ${language === 'ta' ? 'இழை' : 'ends'} | ${language === 'ta' ? 'எடை' : 'Wt'}: ${c.warpWeightKg}kg | ${language === 'ta' ? 'தற்போதைய இருப்பு' : 'Cur Bal'}: ${c.currentStockKg}kg | ${language === 'ta' ? 'பின் இருப்பு' : 'After'}: ${c.stockAfterWarpKg}kg\n`;
    });
    text += `--------------------------------\n`;
    text += `*${language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}:* ${order.totalYarnWeight || totalStructureWeight} kg\n`;
    shareText(text);
  };

  const orderNo = order.orderNumber || order.id.slice(-4);
  const formattedDate = new Date(order.createdAt).toLocaleDateString('ta-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white animate-in fade-in duration-200">
      
      {/* Main Container */}
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh] print:max-h-none print:shadow-none print:rounded-none print:w-full border border-zinc-200">
        
        {/* Sticky Top Header Bar (Hidden on print) */}
        <div className="sticky top-0 z-20 bg-zinc-900 text-white px-4 sm:px-5 py-3.5 flex items-center justify-between shadow-md print:hidden">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer border border-zinc-700"
              title={language === 'ta' ? 'பின்னால் செல்ல' : 'Go Back'}
            >
              <ArrowLeft size={16} />
              <span>{language === 'ta' ? 'பின்னால்' : 'Back'}</span>
            </button>

            <div className="flex items-center gap-1.5 hidden sm:flex">
              <FileText size={18} className="text-indigo-400" />
              <h3 className="font-bold text-sm tracking-tight text-zinc-100 truncate max-w-[200px]">
                {language === 'ta' ? 'வார்ப்பு ஆர்டர் சீட்டு' : 'Warp Order Slip'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow transition active:scale-95 cursor-pointer"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">{language === 'ta' ? 'பிரிண்ட்' : 'Print'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow transition active:scale-95 cursor-pointer"
            >
              <Download size={15} />
              <span>{language === 'ta' ? 'PDF' : 'PDF'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs transition active:scale-95 cursor-pointer border border-zinc-700"
            >
              <Share2 size={15} />
              <span className="hidden sm:inline">{language === 'ta' ? 'பகிர்' : 'Share'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition ml-1 cursor-pointer"
              title={language === 'ta' ? 'மூடு' : 'Close'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="overflow-y-auto p-4 sm:p-6 custom-scrollbar print:p-0 print:overflow-visible flex-1">
          <div 
            ref={printRef} 
            id="warp-order-print-document"
            className="bg-white border border-zinc-200 p-5 sm:p-7 rounded-2xl print:border-none print:p-2 text-zinc-900 text-xs sm:text-sm font-sans"
          >
            {/* 1. Header (கடையின் பெயர் நடுவில், GST இடது, Phone வலது) */}
            <div className="border-b-2 border-zinc-900 pb-4 mb-4">
              <div className="flex justify-between items-start text-xs font-black text-zinc-800 mb-1">
                <div className="text-left">
                  <span className="font-extrabold uppercase text-zinc-600">GSTIN: </span>
                  <span className="font-black text-zinc-900">{companyProfile.gstin || '-'}</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold uppercase text-zinc-600">Cell / Phone: </span>
                  <span className="font-black text-zinc-900">{companyProfile.phone || '-'}</span>
                </div>
              </div>

              <div className="text-center mt-1">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 uppercase tracking-tight font-serif">
                  {companyProfile.tamilName || companyProfile.name || 'வியாபாரி டெக்ஸ்டைல்ஸ்'}
                </h1>
                {companyProfile.name && companyProfile.tamilName && (
                  <h2 className="text-sm font-bold text-zinc-700 tracking-wider">
                    {companyProfile.name}
                  </h2>
                )}
                {companyProfile.address && (
                  <p className="text-xs text-zinc-600 font-semibold mt-0.5 max-w-lg mx-auto">
                    {companyProfile.address}
                  </p>
                )}
                
                <div className="mt-3 inline-block">
                  <span className="bg-zinc-900 text-white font-black text-xs px-4 py-1 rounded-full uppercase tracking-wider">
                    {language === 'ta' ? 'வார்ப்பு ஆர்டர் சீட்டு' : 'WARP ORDER SLIP'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Order & Weaver Details (ஆர்டர் எண், தறிக்காரர் பெயர், தறி எண், வார்ப்பாளர் பெயர்) */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'வார்ப்பு ஆர்டர் எண்:' : 'Warp Order No:'}</span>
                <span className="font-black text-zinc-900 text-sm">{orderNo}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'ஆர்டர் தேதி:' : 'Order Date:'}</span>
                <span className="font-bold text-zinc-900">{formattedDate}</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'தறிக்காரர் பெயர்:' : 'Weaver Name:'}</span>
                <span className="font-black text-zinc-900">{order.weaverName || '-'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'தறி எண்:' : 'Loom No:'}</span>
                <span className="font-black text-zinc-900">{order.loomNumber || '-'}</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'வார்ப்பாளர் பெயர்:' : 'Warper Name:'}</span>
                <span className="font-black text-zinc-900">{warper?.name || '-'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'டிசைன் பெயர்:' : 'Design Name:'}</span>
                <span className="font-bold text-zinc-900">{order.designName || '-'}</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'வார்ப்பு வகை:' : 'Warp Type:'}</span>
                <span className="font-bold text-zinc-800">
                  {order.orderType === 'TOP_WARP' 
                    ? (language === 'ta' ? 'மேல் வார்ப்பு' : 'Top Warp')
                    : order.orderType === 'ZARI_BOBBIN'
                    ? (language === 'ta' ? 'ஜரிகை பாபின்' : 'Zari Bobbin')
                    : (language === 'ta' ? 'முக்கிய வார்ப்பு' : 'Main Warp')}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'மொத்த சேலைகள்:' : 'Total Sarees:'}</span>
                <span className="font-bold text-zinc-900">{order.totalSareesExpected || '-'}</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'வார்ப்பு நீளம்:' : 'Warp Length:'}</span>
                <span className="font-bold text-zinc-900">
                  {order.orderType === 'TOP_WARP' 
                    ? `${order.topWarpLengthMeters || '-'} m` 
                    : order.orderType === 'ZARI_BOBBIN'
                    ? `${order.zariMeters || '-'} m`
                    : `${order.warpLengthMeters || '-'} m`}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-500 font-bold text-xs shrink-0">{language === 'ta' ? 'மொத்த எடை:' : 'Total Weight:'}</span>
                <span className="font-black text-zinc-900 text-sm">
                  {order.totalYarnWeight || totalStructureWeight || 0} kg
                </span>
              </div>
            </div>

            {/* 3. Warp Structure (வார்ப்பு அமைப்புகள் - ஆர்டர் உருவாக்கும் வரிசையில்) */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-xs uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-zinc-900 rounded-xs"></span>
                  {language === 'ta' ? '1. வார்ப்பு அமைப்புகள் (Warp Structure)' : '1. Warp Structure (Sections in Order)'}
                </h3>
                <span className="text-[11px] font-bold text-zinc-500">
                  {sectionsList.length} {language === 'ta' ? 'அமைப்புகள்' : 'sections'}
                </span>
              </div>

              <div className="overflow-x-auto border border-zinc-300 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-800 font-black">
                      <th className="py-2 px-2.5 text-center w-10 border-r border-zinc-200">{language === 'ta' ? 'வ.எண்' : 'S.No'}</th>
                      <th className="py-2 px-3 border-r border-zinc-200">{language === 'ta' ? 'அமைப்பு / பகுதி பெயர்' : 'Section Name'}</th>
                      <th className="py-2 px-2.5 border-r border-zinc-200">{language === 'ta' ? 'டீனியர்' : 'Denier'}</th>
                      <th className="py-2 px-2.5 border-r border-zinc-200">{language === 'ta' ? 'நிறம்' : 'Color'}</th>
                      <th className="py-2 px-2.5 text-right border-r border-zinc-200">{language === 'ta' ? 'இழை' : 'Ends'}</th>
                      <th className="py-2 px-2.5 text-right">{language === 'ta' ? 'எடை (kg)' : 'Weight (kg)'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionsList.map((sec, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50 font-medium">
                        <td className="py-2 px-2.5 text-center font-bold text-zinc-600 border-r border-zinc-200">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-zinc-900 border-r border-zinc-200">{sec.name}</td>
                        <td className="py-2 px-2.5 font-semibold text-zinc-700 border-r border-zinc-200">{sec.denier}</td>
                        <td className="py-2 px-2.5 font-bold text-zinc-800 border-r border-zinc-200">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full border border-zinc-300 inline-block bg-zinc-400"></span>
                            {sec.color}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-zinc-900 border-r border-zinc-200">{sec.ends}</td>
                        <td className="py-2 px-2.5 text-right font-black text-zinc-900">{sec.weightKg > 0 ? sec.weightKg.toFixed(3) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-100/80 border-t-2 border-zinc-400 font-black text-zinc-900">
                      <td colSpan={4} className="py-2 px-3 text-right uppercase border-r border-zinc-200">
                        {language === 'ta' ? 'மொத்தம் (Total)' : 'Total'}:
                      </td>
                      <td className="py-2 px-2.5 text-right border-r border-zinc-200">
                        {totalStructureEnds}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        {totalStructureWeight > 0 ? totalStructureWeight.toFixed(3) : (order.totalYarnWeight || 0)} kg
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 4. Color-wise Summary & Stock Balances (கலர்கள் வாரியாக சுருக்கம் & இருப்பு விவரங்கள்) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-xs uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-zinc-900 rounded-xs"></span>
                  {language === 'ta' ? '2. கலர்கள் வாரியாக சுருக்கம் & நூல் இருப்பு விவரங்கள்' : '2. Color-wise Summary & Warper Stock Balances'}
                </h3>
                <span className="text-[11px] font-bold text-zinc-500">
                  {colorSummaryList.length} {language === 'ta' ? 'கலர்கள்' : 'colors'}
                </span>
              </div>

              <div className="overflow-x-auto border border-zinc-300 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-800 font-black">
                      <th className="py-2 px-2 text-center w-8 border-r border-zinc-200">{language === 'ta' ? 'வ.எண்' : 'S.No'}</th>
                      <th className="py-2 px-2.5 border-r border-zinc-200">{language === 'ta' ? 'நிறம் (Color)' : 'Color'}</th>
                      <th className="py-2 px-2 border-r border-zinc-200">{language === 'ta' ? 'டீனியர்' : 'Denier'}</th>
                      <th className="py-2 px-2.5 text-right border-r border-zinc-200">{language === 'ta' ? 'மொத்த இழை' : 'Total Ends'}</th>
                      <th className="py-2 px-2.5 text-right border-r border-zinc-200">{language === 'ta' ? 'வார்ப்பு எடை (kg)' : 'Order Wt (kg)'}</th>
                      <th className="py-2 px-2.5 text-right border-r border-zinc-200 bg-amber-50/50">{language === 'ta' ? 'தற்போதைய இருப்பு' : 'Current Stock'}</th>
                      <th className="py-2 px-2.5 text-right bg-emerald-50/50">{language === 'ta' ? 'வார்ப்பிற்கு பின் இருப்பு' : 'Stock After Warp'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colorSummaryList.map((item, idx) => (
                      <tr key={idx} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50 font-medium">
                        <td className="py-2 px-2 text-center font-bold text-zinc-600 border-r border-zinc-200">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-bold text-zinc-900 border-r border-zinc-200">
                          {item.color}
                        </td>
                        <td className="py-2 px-2 font-semibold text-zinc-700 border-r border-zinc-200">{item.deniers}</td>
                        <td className="py-2 px-2.5 text-right font-black text-zinc-900 border-r border-zinc-200">{item.totalEnds}</td>
                        <td className="py-2 px-2.5 text-right font-black text-zinc-900 border-r border-zinc-200">{item.warpWeightKg.toFixed(3)} kg</td>
                        <td className="py-2 px-2.5 text-right font-black text-zinc-800 border-r border-zinc-200 bg-amber-50/30">
                          {item.currentStockKg.toFixed(3)} kg
                        </td>
                        <td className={`py-2 px-2.5 text-right font-black bg-emerald-50/30 ${item.stockAfterWarpKg < 0 ? 'text-rose-600' : 'text-emerald-800'}`}>
                          {item.stockAfterWarpKg.toFixed(3)} kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-100/80 border-t-2 border-zinc-400 font-black text-zinc-900">
                      <td colSpan={3} className="py-2 px-3 text-right uppercase border-r border-zinc-200">
                        {language === 'ta' ? 'மொத்தம் (Total)' : 'Total'}:
                      </td>
                      <td className="py-2 px-2.5 text-right border-r border-zinc-200">
                        {totalSummaryEnds}
                      </td>
                      <td className="py-2 px-2.5 text-right border-r border-zinc-200">
                        {totalSummaryOrderWeight.toFixed(3)} kg
                      </td>
                      <td className="py-2 px-2.5 text-right border-r border-zinc-200 bg-amber-50/60">
                        {totalSummaryCurrentStock.toFixed(3)} kg
                      </td>
                      <td className={`py-2 px-2.5 text-right bg-emerald-50/60 ${totalSummaryAfterStock < 0 ? 'text-rose-600' : 'text-emerald-900'}`}>
                        {totalSummaryAfterStock.toFixed(3)} kg
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 5. Footer Signatures & Date Stamp (கையொப்பங்கள்) */}
            <div className="mt-10 pt-4 border-t border-zinc-300 grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="h-10"></div>
                <div className="border-t border-dashed border-zinc-400 pt-1.5 font-black text-xs text-zinc-700">
                  {language === 'ta' ? 'வார்ப்பாளர் கையொப்பம்' : 'Warper Signature'}
                </div>
              </div>

              <div>
                <div className="h-10"></div>
                <div className="border-t border-dashed border-zinc-400 pt-1.5 font-black text-xs text-zinc-700">
                  {language === 'ta' ? 'சரிபார்த்தவர் / உரிமையாளர் கையொப்பம்' : 'Authorized Signature'}
                </div>
              </div>
            </div>

            <div className="mt-4 text-[10px] text-zinc-400 text-center">
              Generated on {new Date().toLocaleString('ta-IN')} | Viyabaaram Textiles System
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action & Back Bar (Always accessible even after scrolling to bottom) */}
        <div className="sticky bottom-0 z-20 bg-zinc-100 border-t border-zinc-200 px-4 py-3 flex items-center justify-between gap-2 print:hidden shadow-lg">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{language === 'ta' ? 'பின்னால் செல்ல' : 'Back / Close'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow transition active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              <span>{language === 'ta' ? 'பிரிண்ட்' : 'Print'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow transition active:scale-95 cursor-pointer"
            >
              <Download size={16} />
              <span>{language === 'ta' ? 'PDF' : 'PDF'}</span>
            </button>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 px-3.5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition active:scale-95 cursor-pointer"
            >
              <Share2 size={16} />
              <span>{language === 'ta' ? 'பகிர்' : 'Share'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
