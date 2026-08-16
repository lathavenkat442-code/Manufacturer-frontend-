import React, { useState } from 'react';
import { Printer, Share2 } from 'lucide-react';
import { shareText } from '../lib/utils';
import { Warper, YarnDispatch, WarperReturn } from '../types';

export type { Warper, YarnDispatch, WarperReturn };

// கலர் மற்றும் இழை விவரங்களை பிரித்தெடுக்கும் Helper Function
export const getColorEndsBreakdown = (txn: any, order: any, language: string = 'ta') => {
  if (!txn || txn.isDispatch) {
    return [];
  }

  const map = new Map<string, number>();

  if (order && order.sections && Array.isArray(order.sections) && order.sections.length > 0) {
    order.sections.forEach((sec: any) => {
      if (sec.color) {
        const c = sec.color.trim();
        if (c) {
          map.set(c, (map.get(c) || 0) + (parseFloat(sec.ends) || 0));
        }
      }
    });
  } else if (txn.returnsList && Array.isArray(txn.returnsList) && txn.returnsList.length > 0) {
    txn.returnsList.forEach((r: any) => {
      if (r.color) {
        const c = r.color.trim();
        if (c) {
          map.set(c, (map.get(c) || 0) + (parseFloat(r.ends) || 0));
        }
      }
    });
  } else if (txn.color) {
    const c = txn.color.trim();
    if (c) {
      map.set(c, parseFloat(txn.endsTotal || txn.ends || 0));
    }
  }

  const endsLabel = language === 'ta' ? 'இழை' : 'Ends';
  const result: { color: string; ends: number; label: string }[] = [];

  map.forEach((ends, color) => {
    result.push({
      color,
      ends,
      label: ends > 0 ? `${color}: ${ends} ${endsLabel}` : color
    });
  });

  return result;
};

interface StatementProps {
  warper: Warper;
  dispatches: YarnDispatch[];
  returns: WarperReturn[];
  warpOrders?: any[];
  language?: 'ta' | 'en';
  onClose?: () => void;
}

export const WarperStatementView: React.FC<StatementProps> = ({
  warper,
  dispatches,
  returns,
  warpOrders = [],
  language = 'ta',
  onClose
}) => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // தேதிக்கு ஏற்ப பில் / ரிட்டர்ன்களை ஃபில்டர் செய்தல்
  let statementDispatches = dispatches.filter(
    d => d.recipientType === 'warper' && d.recipientId === warper.id
  );
  let statementReturns = returns.filter(r => r.warperId === warper.id);

  if (startDate) {
    statementDispatches = statementDispatches.filter(d => d.date >= startDate);
    statementReturns = statementReturns.filter(r => r.date >= startDate);
  }
  if (endDate) {
    statementDispatches = statementDispatches.filter(d => d.date <= endDate);
    statementReturns = statementReturns.filter(r => r.date <= endDate);
  }

  // பில் அடிப்படையில் நூல்களை குரூப் செய்தல்
  const groupedStatementDispatches = Object.values(
    statementDispatches.reduce((acc, d) => {
      const key = d.billNumber ? `${d.date}-${d.billNumber}-${d.supplierId}` : d.id;
      if (!acc[key]) {
        acc[key] = {
          ...d,
          isDispatch: true,
          timestamp: new Date(d.date).getTime(),
          colors: { [d.color || 'Unknown']: [d.weightKg || 0] },
          weightKg: d.weightKg
        };
      } else {
        if (acc[key].colors[d.color || 'Unknown']) {
          acc[key].colors[d.color || 'Unknown'].push(d.weightKg || 0);
        } else {
          acc[key].colors[d.color || 'Unknown'] = [d.weightKg || 0];
        }
        acc[key].weightKg += d.weightKg;
      }
      return acc;
    }, {} as Record<string, any>)
  );

  // அனைத்து பரிவர்த்தனைகளையும் ஒரே வரிசையில் சேர்க்கிறது
  const allTxns = [
    ...groupedStatementDispatches,
    ...statementReturns.map(r => ({
      ...r,
      isDispatch: false,
      timestamp: new Date(r.date).getTime()
    }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  // மொத்தது மற்றும் மீதி கணக்கீடு
  const totalReceived = statementDispatches.reduce((sum, d) => sum + d.weightKg, 0);
  const totalReturned = statementReturns.reduce((sum, r) => sum + (r.weightKg || 0), 0);
  const balance = totalReceived - totalReturned;

  // PDF / பிரிண்ட் டவுன்லோட் செயலி
  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    let text = `*${language === 'ta' ? 'வார்ப்புகாரர் அறிக்கை' : 'Warper Statement'}*\n\n`;
    text += `*${language === 'ta' ? 'பெயர்' : 'Name'}:* ${warper.name}\n`;
    if (warper.phone) text += `*${language === 'ta' ? 'போன்' : 'Phone'}:* ${warper.phone}\n`;
    if (startDate || endDate) {
      text += `*${language === 'ta' ? 'காலம்' : 'Period'}:* ${startDate || 'Start'} - ${endDate || 'End'}\n`;
    }
    text += `-------------------------------\n`;
    text += `*${language === 'ta' ? 'மொத்த வரவு' : 'Total Received'}:* ${totalReceived.toFixed(2)} kg\n`;
    text += `*${language === 'ta' ? 'மொத்த திரும்பியது' : 'Total Returned'}:* ${totalReturned.toFixed(2)} kg\n`;
    text += `*${language === 'ta' ? 'இருப்பு' : 'Balance'}:* ${balance.toFixed(2)} kg\n\n`;
    text += `*${language === 'ta' ? 'விவரங்கள்' : 'Details'}:*\n`;
    
    allTxns.forEach((txn: any) => {
      const dateStr = new Date(txn.date).toLocaleDateString();
      if (txn.isDispatch) {
        text += `\n📥 ${dateStr} - ${language === 'ta' ? 'வரவு' : 'Received'}: ${txn.weightKg.toFixed(2)} kg\n`;
        const colorParts = Object.entries(txn.colors || {}).map(
          ([c, weights]: [string, any]) => {
            const sum = weights.reduce((a: number, b: number) => a + b, 0);
            return `${c}: ${sum.toFixed(2)}kg`;
          }
        );
        if (txn.supplierName) text += `   • ${txn.supplierName}${txn.billNumber ? ` (Bill: ${txn.billNumber})` : ''}\n`;
        if (colorParts.length > 0) text += `   • [${colorParts.join(', ')}]\n`;
      } else {
        const order = warpOrders.find(o => o.id === txn.orderId || o.orderNumber === txn.orderId);
        const colorBreakdown = getColorEndsBreakdown(txn, order, language);
        text += `\n📤 ${dateStr} - ${language === 'ta' ? 'திரும்பியது' : 'Returned'}: ${(txn.weightKg || 0).toFixed(2)} kg\n`;
        if (txn.weaverName) text += `   • ${language === 'ta' ? 'நெசவாளர்' : 'Weaver'}: ${txn.weaverName}\n`;
        if (colorBreakdown.length > 0) {
          text += `   • ${colorBreakdown.map(cb => cb.label).join(' | ')}\n`;
        }
      }
    });

    shareText(text);
  };

  // Load company profile from localStorage
  const savedProfile = localStorage.getItem(`viyabaari_company_profile_guest`) || 
                       Object.keys(localStorage)
                         .filter(k => k.startsWith('viyabaari_company_profile_'))
                         .map(k => localStorage.getItem(k))
                         .find(v => !!v);
                         
  let companyProfile = {
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

  return (
    <div className="bg-white min-h-screen p-4 md:p-8 print:p-0 print:bg-white">
      {/* மேல் பகுதி கன்ட்ரோல்கள் (பிரிண்ட் ஆகும்போது மறையும்) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
            >
              {language === 'ta' ? 'மூடு' : 'Close'}
            </button>
          )}
          <h2 className="text-xl font-black text-gray-800">{warper.name}</h2>
        </div>
        <div className="flex gap-3 items-center">
          {/* தேதி தேர்வு */}
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-500">
              {language === 'ta' ? 'முதல்:' : 'From:'}
            </span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent text-sm font-bold outline-none"
            />
            <span className="text-xs font-bold text-gray-500 ml-2">
              {language === 'ta' ? 'வரை:' : 'To:'}
            </span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent text-sm font-bold outline-none"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="ml-2 text-red-500 hover:text-red-700 text-xs font-bold"
              >
                {language === 'ta' ? 'அழி' : 'Clear'}
              </button>
            )}
          </div>

          {/* பிரிண்ட் / டவுன்லோட் பட்டன் */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition shadow-sm"
          >
            <Printer size={18} /> {language === 'ta' ? 'பிரிண்ட் / PDF டவுன்லோட்' : 'Print / Download PDF'}
          </button>

          {/* பகிர் பட்டன் */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold transition shadow-sm"
          >
            <Share2 size={18} /> {language === 'ta' ? 'பகிர்' : 'Share'}
          </button>
        </div>
      </div>

      {/* அறிக்கை அச்சிடும் பகுதி */}
      <div className="max-w-4xl mx-auto border border-gray-200 rounded-2xl p-6 print:border-none print:p-0 print:max-w-none">
        <div className="border-b-2 border-black pb-3 mb-4">
          <div className="flex justify-between items-start">
            {/* Left Corner: Title and Shop Name */}
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase leading-tight font-sans">
                {language === 'ta' ? 'வார்ப்புகாரர் கணக்கு அறிக்கை' : 'WARPER LEDGER STATEMENT'}
              </h1>
              <p className="text-sm sm:text-base font-black text-zinc-900 mt-1 uppercase">
                {companyProfile.tamilName || companyProfile.name || 'வியாபாரி டெக்ஸ்டைல்ஸ்'}
              </p>
              {companyProfile.address && (
                <p className="text-[11px] font-bold text-zinc-700 mt-0.5">
                  {companyProfile.address}
                </p>
              )}
            </div>

            {/* Right Corner: Warper Name and Date */}
            <div className="text-right">
              <p className="text-base sm:text-lg font-black text-black uppercase">
                {warper.name}
              </p>
              {warper.phone && <p className="text-xs font-bold text-zinc-700 mt-0.5">போன்: {warper.phone}</p>}
              <p className="text-xs font-black text-black mt-1">
                {language === 'ta' ? 'தேதி:' : 'Date:'} {new Date().toLocaleDateString('ta-IN')}
              </p>
              {(startDate || endDate) && (
                <p className="text-[11px] font-bold text-zinc-700 mt-0.5">
                  {startDate ? new Date(startDate).toLocaleDateString('ta-IN') : '—'} முதல் {endDate ? new Date(endDate).toLocaleDateString('ta-IN') : '—'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* அட்டவணை (Table) */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden print:border-none">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-gray-600 bg-gray-50">
                <th className="py-3 px-4 font-bold">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                <th className="py-3 px-4 font-bold">{language === 'ta' ? 'விவரம்' : 'Details'}</th>
                <th className="py-3 px-4 font-bold text-center">{language === 'ta' ? 'மீட்டர்' : 'Meter'}</th>
                <th className="py-3 px-4 font-bold text-right">{language === 'ta' ? 'வரவு (kg)' : 'Received'}</th>
                <th className="py-3 px-4 font-bold text-right text-green-600">{language === 'ta' ? 'திரும்பியது (kg)' : 'Returned'}</th>
              </tr>
            </thead>
            <tbody>
              {allTxns.map((txn: any, idx) => {
                const order = warpOrders.find(
                  o => o.id === txn.orderId || o.orderNumber === txn.orderId
                );
                let particularsText = '';

                if (txn.isDispatch) {
                  const defaultText = language === 'ta' ? 'நூல் வரவு' : 'Yarn Given';
                  const supplierName = txn.supplierName || defaultText;
                  const billStr = txn.billNumber ? ` (Bill: ${txn.billNumber})` : '';

                  const colorParts = Object.entries(txn.colors || {}).map(
                    ([c, weights]: [string, any]) => {
                      const sum = weights.reduce((a: number, b: number) => a + b, 0);
                      return `${c}: ${sum.toFixed(2)}kg`;
                    }
                  );

                  particularsText = `${supplierName}${billStr} - ${
                    txn.yarnType || ''
                  } [${colorParts.join(', ')}]`;
                } else {
                  const weaverName =
                    txn.weaverName || (language === 'ta' ? 'நெசவாளர்' : 'Weaver');
                  let colorsStr = txn.color || '';

                  if (
                    order &&
                    order.sections &&
                    Array.isArray(order.sections) &&
                    order.sections.length > 0
                  ) {
                    colorsStr = Array.from(
                      new Set(order.sections.map((s: any) => s.color).filter(Boolean))
                    ).join(', ');
                  }

                  const colorBreakdown = getColorEndsBreakdown(txn, order, language);
                  const endsCount =
                    txn.endsTotal || txn.ends || (order ? order.totalEnds : null);
                  const endsLabel = language === 'ta' ? 'இழை' : 'Ends';
                  const endsStr = endsCount ? `${endsCount} ${endsLabel}` : '';

                  let detailsParts = [weaverName];
                  if (colorBreakdown.length > 0) {
                    detailsParts.push(colorBreakdown.map(cb => cb.label).join(' | '));
                  } else {
                    if (colorsStr)
                      detailsParts.push(
                        `${language === 'ta' ? 'கலர்:' : 'Color:'} ${colorsStr}`
                      );
                    if (endsStr) detailsParts.push(endsStr);
                  }

                  particularsText = detailsParts.filter(Boolean).join(' | ');
                }

                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {new Date(txn.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">{particularsText}</td>
                    <td className="py-3 px-4 text-center font-bold text-gray-700">
                      {txn.length ? `${txn.length}m` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {txn.isDispatch ? `${txn.weightKg.toFixed(2)} kg` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-600">
                      {!txn.isDispatch ? `${(txn.weightKg || 0).toFixed(2)} kg` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* கணக்கு இருப்பு (Total Balance Summary) */}
        <div className="mt-6 border-t pt-4 flex justify-between items-center bg-gray-50 p-4 rounded-xl">
          <div>
            <p className="text-xs text-gray-500 font-bold">{language === 'ta' ? 'மொத்த வரவு' : 'Total Received'}: <span className="text-gray-900">{totalReceived.toFixed(2)} kg</span></p>
            <p className="text-xs text-gray-500 font-bold">{language === 'ta' ? 'மொத்த திரும்பியது' : 'Total Returned'}: <span className="text-green-600">{totalReturned.toFixed(2)} kg</span></p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-gray-500 uppercase">{language === 'ta' ? 'இருப்பு (Balance)' : 'Balance'}</span>
            <p className={`text-xl font-black ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {balance.toFixed(2)} kg
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
