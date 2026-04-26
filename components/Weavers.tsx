import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Weaver, YarnDispatch, WeaverProduction } from '../types';
import { Plus, User as UserIcon, Trash2, ArrowLeft, Calendar, Palette, Weight, PieChart, ArrowDownLeft, Shirt, Printer, FileText, Send, Share2, Edit2, LayoutGrid } from 'lucide-react';
import { YARN_COLORS } from '../constants';
import { SareeAccounts } from './SareeAccounts';
import html2pdf from 'html2pdf.js';
import { shareText } from '../lib/utils';
import { useLongPress } from '../lib/hooks';

const ITEM_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-fuchsia-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-rose-600',
  'bg-sky-600',
  'bg-teal-600',
  'bg-slate-600',
  'bg-purple-600',
  'bg-orange-600'
];

interface WeaverItemProps {
    weaver: Weaver;
    onClick: () => void;
    index: number;
}

const WeaverItem: React.FC<WeaverItemProps> = ({ weaver, onClick, index }) => {
    const bgColor = ITEM_COLORS[index % ITEM_COLORS.length];

    return (
        <div 
            onClick={onClick}
            className={`${bgColor} p-5 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-lg transition-all border border-white/20 group active:scale-95 text-white`}
        >
            <div className="bg-white/20 p-4 rounded-2xl transition-all shadow-inner border border-white/30 backdrop-blur-sm text-white">
                <UserIcon size={24} />
            </div>
            <div className="text-center">
                <h4 className="font-black text-white text-sm tracking-tight truncate max-w-[120px]">{weaver.name}</h4>
                {weaver.phone && <p className="text-[10px] font-bold mt-0.5 truncate max-w-[100px] text-white/70">{weaver.phone}</p>}
            </div>
        </div>
    );
};

interface WeaversProps {
  user: User;
  language: 'ta' | 'en';
  onBack: () => void;
  onAddTransaction?: (txn: any) => void;
  onNavigateToStock?: () => void;
}

const Weavers: React.FC<WeaversProps> = ({ 
  user, language, onBack, onAddTransaction, onNavigateToStock
}) => {
  const [weavers, setWeavers] = useState<Weaver[]>([]);
  const [dispatches, setDispatches] = useState<YarnDispatch[]>([]);
  const [productions, setProductions] = useState<WeaverProduction[]>([]);
  
  const [selectedWeaver, setSelectedWeaver] = useState<Weaver | null>(null);
  const [viewType, setViewType] = useState<'looms' | 'balance' | 'overview'>('overview');

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedWeaver, viewType]);

  const [isAddingProduction, setIsAddingProduction] = useState(false);
  const [prodDate, setProdDate] = useState(new Date().toISOString().split('T')[0]);
  const [prodColor, setProdColor] = useState('');
  const [prodWeight, setProdWeight] = useState('');
  const [prodCount, setProdCount] = useState('');

  // Statement filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewStatement, setViewStatement] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const isPopping = useRef(false);
  const statementRef = useRef<HTMLDivElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 100);
    return () => clearTimeout(timer);
  }, [viewType, selectedWeaver, viewStatement, isAdding, isAddingProduction]);

  // Sync sub-views with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isPopping.current = true;
      // When popping, we update state but DON'T push again
      if (isAdding) { setIsAdding(false); }
      else if (isAddingProduction) { setIsAddingProduction(false); }
      else if (viewStatement) { setViewStatement(null); }
      else if (selectedWeaver) { 
        if (viewType !== 'overview') {
          setViewType('overview');
        } else {
          setSelectedWeaver(null); 
        }
      }

      // Use a small timeout to reset isPopping to ensure all renders triggered by state updates above are finished
      setTimeout(() => {
        isPopping.current = false;
      }, 100);
    };

    const anySubViewOpen = isAdding || isAddingProduction || viewStatement || selectedWeaver;
    
    // Only push if we are entering a subview state and don't already have one
    if (anySubViewOpen && !window.history.state?.subview && !isPopping.current) {
      window.history.pushState({ subview: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdding, isAddingProduction, viewStatement, selectedWeaver, viewType]);

  useEffect(() => {
    if (!selectedWeaver) {
      setViewType('overview');
    }
  }, [selectedWeaver]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewStatement, startDate, endDate]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [selectedWeaver, viewType, viewStatement, isAdding, isAddingProduction]);

  const loadData = useCallback(() => {
    const savedWeavers = localStorage.getItem(`viyabaari_weavers_${user.uid || 'guest'}`);
    if (savedWeavers) setWeavers(JSON.parse(savedWeavers));

    const savedDispatches = localStorage.getItem(`viyabaari_yarn_dispatches_${user.uid || 'guest'}`);
    if (savedDispatches) setDispatches(JSON.parse(savedDispatches));

    const savedProductions = localStorage.getItem(`viyabaari_weaver_productions_${user.uid || 'guest'}`);
    if (savedProductions) setProductions(JSON.parse(savedProductions));
  }, [user.uid]);

  useEffect(() => {
    loadData();
    window.addEventListener('local-storage-update', loadData);
    return () => window.removeEventListener('local-storage-update', loadData);
  }, [loadData]);

  const saveWeavers = (newWeavers: Weaver[]) => {
    setWeavers(newWeavers);
    localStorage.setItem(`viyabaari_weavers_${user.uid || 'guest'}`, JSON.stringify(newWeavers));
  };

  const saveProductions = (newProductions: WeaverProduction[]) => {
    setProductions(newProductions);
    localStorage.setItem(`viyabaari_weaver_productions_${user.uid || 'guest'}`, JSON.stringify(newProductions));
  };

  const handleAdd = () => {
    if (!newName.trim()) {
      alert(language === 'ta' ? 'பெயரை உள்ளிடவும்' : 'Please enter a name');
      return;
    }
    const newWeaver: Weaver = {
        id: Date.now().toString(),
        name: newName,
        phone: newPhone,
        createdAt: Date.now()
    };
    saveWeavers([...weavers, newWeaver]);
    setNewName('');
    setNewPhone('');
    setIsAdding(false);
  };

  const handleShareStatement = (weaver: Weaver, txns: any[], totalReceived: number, totalConsumed: number, balance: number) => {
    let text = `*${language === 'ta' ? 'தறிகாரர் கணக்கு அறிக்கை' : 'Weaver Account Statement'}*\n\n`;
    text += `*${language === 'ta' ? 'பெயர்' : 'Name'}:* ${weaver.name}\n`;
    if (weaver.phone) text += `*${language === 'ta' ? 'போன்' : 'Phone'}:* ${weaver.phone}\n`;
    if (startDate || endDate) {
      text += `*${language === 'ta' ? 'காலம்' : 'Period'}:* ${startDate || 'Start'} - ${endDate || 'End'}\n`;
    }
    text += `\n*${language === 'ta' ? 'சுருக்கம்' : 'Summary'}:*\n`;
    text += `- ${language === 'ta' ? 'மொத்த வரவு' : 'Total Received'}: ${totalReceived.toFixed(2)} kg\n`;
    text += `- ${language === 'ta' ? 'மொத்த செலவு' : 'Total Consumed'}: ${totalConsumed.toFixed(2)} kg\n`;
    text += `- ${language === 'ta' ? 'பாக்கி' : 'Balance'}: ${balance.toFixed(2)} kg\n\n`;
    
    text += `*${language === 'ta' ? 'சமீபத்திய பரிமாற்றங்கள்' : 'Recent Transactions'}:*\n`;
    txns.slice(0, 10).forEach(txn => {
      const date = new Date(txn.date).toLocaleDateString();
      if (txn.isDispatch) {
        text += `• ${date}: ${txn.yarnType} ${txn.color} (+${txn.weightKg.toFixed(2)} kg)\n`;
      } else {
        text += `• ${date}: ${txn.color} (-${txn.weightKg.toFixed(2)} kg) ${txn.sareeCount ? `[${txn.sareeCount} Sarees]` : ''}\n`;
      }
    });
    
    if (txns.length > 10) {
      text += `... ${language === 'ta' ? 'மேலும் பல' : 'and more'}\n`;
    }
    
    shareText(text);
  };

  const downloadPDF = async () => {
    const weaver = weavers.find(w => w.id === viewStatement);
    if (!weaver || !statementRef.current) return;

    let statementDispatches = dispatches.filter(d => d.recipientType === 'weaver' && d.recipientId === weaver.id);
    let statementProductions = productions.filter(p => p.weaverId === weaver.id);
    
    if (startDate) {
      statementDispatches = statementDispatches.filter(d => d.date >= startDate);
      statementProductions = statementProductions.filter(p => p.date >= startDate);
    }
    if (endDate) {
      statementDispatches = statementDispatches.filter(d => d.date <= endDate);
      statementProductions = statementProductions.filter(p => p.date <= endDate);
    }

    const groupedDispatches = Object.values(statementDispatches.reduce((acc, d) => {
      const key = d.createdAt || d.id;
      if (!acc[key]) {
        acc[key] = { ...d, isDispatch: true, timestamp: new Date(d.date).getTime(), items: [] };
      }
      acc[key].items.push({ yarnType: d.yarnType, color: d.color, weightKg: d.weightKg });
      acc[key].weightKg = acc[key].items.reduce((sum: number, item: any) => sum + item.weightKg, 0);
      return acc;
    }, {} as Record<string, any>));

    const allTxns = [
      ...groupedDispatches,
      ...statementProductions.map(p => ({ ...p, isDispatch: false, timestamp: new Date(p.date).getTime() }))
    ].sort((a, b) => a.timestamp - b.timestamp);

    const totalReceived = statementDispatches.reduce((sum, d) => sum + d.weightKg, 0);
    const totalConsumed = statementProductions.reduce((sum, p) => sum + p.weightKg, 0);
    const balance = totalReceived - totalConsumed;

    const element = statementRef.current;
    const filename = `${weaver.name}_statement_${new Date().toISOString().split('T')[0]}.pdf`;
    
    const opt = {
      margin: [10, 10] as [number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Error:', error);
      window.print();
    }
  };

  const handleShareBalance = (weaver: Weaver, yarnType: string, color: string, balance: number) => {
    let text = `*${language === 'ta' ? 'நூல் இருப்பு விவரம்' : 'Yarn Balance Detail'}*\n\n`;
    text += `*${language === 'ta' ? 'தறிகாரர்' : 'Weaver'}:* ${weaver.name}\n`;
    text += `*${language === 'ta' ? 'நூல் வகை' : 'Yarn Type'}:* ${yarnType}\n`;
    text += `*${language === 'ta' ? 'நிறம்' : 'Color'}:* ${color}\n`;
    text += `*${language === 'ta' ? 'இருப்பு' : 'Balance'}:* ${balance.toFixed(2)} kg\n`;
    
    shareText(text);
  };

  const handleAddProduction = () => {
    if (!prodDate || !prodColor || !prodWeight || !selectedWeaver) {
      alert(language === 'ta' ? 'அனைத்து விவரங்களையும் உள்ளிடவும்' : 'Please fill all details');
      return;
    }
    
    const weight = parseFloat(prodWeight);
    const count = prodCount ? parseInt(prodCount) : undefined;
    
    if (isNaN(weight) || (prodCount && isNaN(count as number))) {
      alert(language === 'ta' ? 'சரியான எண்களை உள்ளிடவும்' : 'Please enter valid numbers');
      return;
    }
    
    const newProduction: WeaverProduction = {
      id: Date.now().toString(),
      weaverId: selectedWeaver.id,
      date: prodDate,
      color: prodColor,
      weightKg: weight,
      sareeCount: count,
      createdAt: Date.now()
    };
    
    saveProductions([...productions, newProduction]);
    setProdColor('');
    setProdWeight('');
    setProdCount('');
    setIsAddingProduction(false);
  };

  const handleDeleteProduction = (id: string) => {
    if (window.confirm(language === 'ta' ? 'நிச்சயமான நீக்க வேண்டுமா?' : 'Are you sure you want to delete?')) {
      saveProductions(productions.filter(p => p.id !== id));
    }
  };

  const weaverBalances = useMemo(() => {
    if (!selectedWeaver) return [];
    
    const balances: Record<string, { received: number, consumed: number }> = {};
    
    dispatches.filter(d => d.recipientType === 'weaver' && d.recipientId === selectedWeaver.id).forEach(dispatch => {
      const color = dispatch.color || 'Unknown';
      const yarnType = dispatch.yarnType || 'Unknown';
      const key = `${yarnType}|${color}`;
      if (!balances[key]) balances[key] = { received: 0, consumed: 0 };
      balances[key].received += dispatch.weightKg;
    });
    
    productions.filter(p => p.weaverId === selectedWeaver.id).forEach(prod => {
      const color = prod.color || 'Unknown';
      // Productions might not have yarnType directly, we might need to infer or it's just color based for now.
      // Assuming we want to keep it consistent, we'll use 'Unknown' if not present.
      const yarnType = 'Unknown'; // Weavers production currently doesn't track denier per color consumed directly in the same way.
      const key = `${yarnType}|${color}`;
      if (!balances[key]) balances[key] = { received: 0, consumed: 0 };
      balances[key].consumed += prod.weightKg;
    });
    
    return Object.entries(balances).map(([key, data]) => {
      const [yarnType, color] = key.split('|');
      return {
        yarnType,
        color,
        received: data.received,
        consumed: data.consumed,
        balance: data.received - data.consumed
      };
    }).sort((a, b) => {
      if (a.yarnType !== b.yarnType) return a.yarnType.localeCompare(b.yarnType);
      return b.balance - a.balance;
    });
  }, [dispatches, productions, selectedWeaver]);

  // Render Weaver Account View
  if (viewStatement) {
    const weaver = weavers.find(w => w.id === viewStatement);
    if (!weaver) return null;

    let statementDispatches = dispatches.filter(d => d.recipientType === 'weaver' && d.recipientId === weaver.id);
    let statementProductions = productions.filter(p => p.weaverId === weaver.id);
    
    if (startDate) {
      statementDispatches = statementDispatches.filter(d => d.date >= startDate);
      statementProductions = statementProductions.filter(p => p.date >= startDate);
    }
    if (endDate) {
      statementDispatches = statementDispatches.filter(d => d.date <= endDate);
      statementProductions = statementProductions.filter(p => p.date <= endDate);
    }

    const groupedDispatches = Object.values(statementDispatches.reduce((acc, d) => {
      const key = d.createdAt || d.id;
      if (!acc[key]) {
        acc[key] = { ...d, isDispatch: true, timestamp: new Date(d.date).getTime(), items: [] };
      }
      acc[key].items.push({ yarnType: d.yarnType, color: d.color, weightKg: d.weightKg });
      acc[key].weightKg = acc[key].items.reduce((sum: number, item: any) => sum + item.weightKg, 0);
      return acc;
    }, {} as Record<string, any>));

    const allTxns = [
      ...groupedDispatches,
      ...statementProductions.map(p => ({ ...p, isDispatch: false, timestamp: new Date(p.date).getTime() }))
    ].sort((a, b) => a.timestamp - b.timestamp);

    const totalReceived = statementDispatches.reduce((sum, d) => sum + d.weightKg, 0);
    const totalConsumed = statementProductions.reduce((sum, p) => sum + p.weightKg, 0);
    const balance = totalReceived - totalConsumed;

    return (
      <div className={`bg-white min-h-screen p-4 md:p-8`}>
        <div className="flex justify-between items-center mb-6 print:hidden">
          <button onClick={() => setViewStatement(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition">
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-xs font-bold text-gray-500">{language === 'ta' ? 'முதல்:' : 'From:'}</span>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none" />
              <span className="text-xs font-bold text-gray-500 ml-2">{language === 'ta' ? 'வரை:' : 'To:'}</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none" />
              {(startDate || endDate) && (
                <button onClick={() => {setStartDate(''); setEndDate('');}} className="ml-2 text-red-500 hover:text-red-700 text-xs font-bold">
                  {language === 'ta' ? 'அழி' : 'Clear'}
                </button>
              )}
            </div>
            <button 
              onClick={() => handleShareStatement(weaver, allTxns, totalReceived, totalConsumed, balance)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition"
            >
              <Share2 size={18} /> {language === 'ta' ? 'பகிர்' : 'Share'}
            </button>
            <button onClick={downloadPDF} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-zinc-800 transition">
              <Printer size={18} /> {language === 'ta' ? 'டவுன்லோட் (PDF)' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm print:border-none print:p-0 bg-white">
          <div ref={statementRef} id="pdf-statement-content">
            <div className="text-center mb-10 border-b-2 border-zinc-900 pb-8">
                <h1 className="text-3xl font-black text-zinc-900 mb-2 uppercase tracking-tight">{language === 'ta' ? 'தறிக்காரர் கணக்கு அறிக்கை' : 'Weaver Account Statement'}</h1>
                <div className="flex flex-col items-center gap-1">
                    <h2 className="text-2xl font-black text-zinc-800">{weaver.name}</h2>
                    {weaver.phone && <p className="text-zinc-500 font-bold flex items-center gap-1"><span className="opacity-50">#</span> {weaver.phone}</p>}
                </div>
                {(startDate || endDate) && (
                <div className="bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-100 inline-block mt-4">
                    <p className="text-xs font-black text-zinc-400 mb-0.5 uppercase tracking-widest">{language === 'ta' ? 'காலம்' : 'Period'}</p>
                    <p className="text-sm font-black text-zinc-800">
                    {startDate ? new Date(startDate).toLocaleDateString() : 'Start'} - {endDate ? new Date(endDate).toLocaleDateString() : 'End'}
                    </p>
                </div>
                )}
            </div>

            <div className="overflow-x-auto mb-10">
                <table className="w-full text-left border-collapse border border-zinc-200">
                <thead>
                    <tr className="bg-zinc-900 text-white">
                    <th className="py-4 px-4 font-black text-[13px] border border-zinc-900 uppercase tracking-wider">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                    <th className="py-4 px-4 font-black text-[13px] border border-zinc-900 uppercase tracking-wider">{language === 'ta' ? 'விவரம்' : 'Details'}</th>
                    <th className="py-4 px-4 font-black text-[13px] text-right border border-zinc-900 uppercase tracking-wider">{language === 'ta' ? 'வரவு (kg)' : 'Received'}</th>
                    <th className="py-4 px-4 font-black text-[13px] text-right border border-zinc-900 uppercase tracking-wider">{language === 'ta' ? 'செலவு (kg)' : 'Consumed'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {allTxns.map((txn: any, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}>
                      <td className="py-4 px-4 text-zinc-800 font-black text-[13px] border border-zinc-100">{new Date(txn.date).toLocaleDateString()}</td>
                      <td className="py-4 px-4 text-zinc-800 border border-zinc-100">
                        {txn.isDispatch ? (
                          <div className="flex flex-col gap-1">
                            {txn.items && txn.items.length > 1 ? (
                              <>
                                <span className="flex items-center gap-1 font-black text-[13px] text-blue-700 tracking-tight"><ArrowDownLeft size={16} /> {language === 'ta' ? 'பல நூல்கள்' : 'Multiple Yarns'}</span>
                                <div className="text-[11px] font-bold text-zinc-500 ml-6">
                                  {txn.items.map((item: any, i: number) => (
                                    <div key={i}>{item.yarnType} {item.color} ({item.weightKg} kg)</div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <span className="flex items-center gap-1 font-black text-[13px] text-blue-700 tracking-tight"><ArrowDownLeft size={16} /> {txn.yarnType} {txn.color}</span>
                            )}
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 font-black text-[13px] text-emerald-700 tracking-tight"><Shirt size={16} /> {txn.color} {txn.sareeCount ? `(${txn.sareeCount} Sarees)` : ''}</span>
                        )}
                      </td>
                        <td className="py-4 px-4 text-right font-black text-[15px] border border-zinc-100 text-blue-600">{txn.isDispatch ? txn.weightKg.toFixed(2) : '-'}</td>
                        <td className="py-4 px-4 text-right font-black text-[15px] border border-zinc-100 text-emerald-600 font-bold">{!txn.isDispatch ? txn.weightKg.toFixed(2) : '-'}</td>
                    </tr>
                    ))}
                    {allTxns.length === 0 && (
                    <tr>
                        <td colSpan={4} className="py-12 text-center text-zinc-400 font-black tracking-tight text-lg italic">
                        {language === 'ta' ? 'பதிவுகள் இல்லை' : 'No records found'}
                        </td>
                    </tr>
                    )}
                </tbody>
                </table>
            </div>

            <div className="flex justify-end pr-4">
                <div className="w-80 space-y-4 bg-zinc-900 p-8 rounded-[2rem] shadow-xl text-white">
                    <div className="flex justify-between items-center text-blue-300 font-black text-sm uppercase tracking-widest">
                        <span>{language === 'ta' ? 'மொத்த வரவு' : 'Received'}</span>
                        <span className="text-xl">{totalReceived.toFixed(2)} <span className="text-xs opacity-60">kg</span></span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-300 font-black text-sm uppercase tracking-widest">
                        <span>{language === 'ta' ? 'மொத்த செலவு' : 'Consumed'}</span>
                        <span className="text-xl">{totalConsumed.toFixed(2)} <span className="text-xs opacity-60">kg</span></span>
                    </div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between items-center text-2xl font-black italic">
                        <span className="uppercase tracking-tighter">{language === 'ta' ? 'பாக்கி' : 'Balance'}</span>
                        <span className={balance > 0 ? 'text-rose-400' : 'text-emerald-400'}>{balance.toFixed(2)} <span className="text-sm opacity-60 not-italic">kg</span></span>
                    </div>
                </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-zinc-100 text-center">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{language === 'ta' ? 'ஆப் மூலம் உருவாக்கப்பட்டது' : 'Generated via Weaver App'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedWeaver) {
    return (
      <div className={`p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-right-4 duration-300`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (viewType === 'overview') {
                    setSelectedWeaver(null);
                } else {
                    setViewType('overview');
                }
              }} 
              className="p-2 bg-white rounded-full shadow-sm border border-zinc-200 hover:bg-zinc-50 transition-colors"
            >
              <ArrowLeft size={20} className="text-zinc-600" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{selectedWeaver.name}</h2>
              {selectedWeaver.phone && <p className="text-xs font-bold text-zinc-500 mt-0.5">{selectedWeaver.phone}</p>}
            </div>
          </div>
          <button 
            onClick={() => setViewStatement(selectedWeaver.id)}
            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 flex items-center gap-1"
          >
            <FileText size={14} /> {language === 'ta' ? 'அறிக்கை' : 'Statement'}
          </button>
        </div>

        {viewType === 'overview' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setViewType('looms')}
                className="p-6 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center gap-4 transition-all border border-violet-200 hover:shadow-md group bg-violet-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <LayoutGrid size={32} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'தறிகள்' : 'Looms'}</span>
              </button>
              
              <button 
                onClick={() => setViewType('balance')}
                className="p-6 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center gap-4 transition-all border border-emerald-200 hover:shadow-md group bg-emerald-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <PieChart size={32} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'இருப்பு' : 'Balance'}</span>
              </button>
            </div>
            
            <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm text-center">
                <p className="text-zinc-400 text-sm font-bold tamil-font mb-4">
                    {language === 'ta' ? 'விரைவான செயல்கள்' : 'Quick Actions'}
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setIsAddingProduction(true)}
                        className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-violet-700 shadow-lg shadow-violet-100"
                    >
                        <Plus size={18} /> {language === 'ta' ? 'புதிய பதிவு' : 'Add Recording'}
                    </button>
                </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {viewType === 'looms' && (
          <SareeAccounts 
            user={user} 
            weaverId={selectedWeaver.id} 
            weaverName={selectedWeaver.name}
            language={language} 
            onAddTransaction={onAddTransaction}
            onNavigateToStock={onNavigateToStock}
          />
        )}

        {viewType === 'balance' && (
          <div className="space-y-4">
            {weaverBalances.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-zinc-200 shadow-sm">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
                  <PieChart size={32} className="text-zinc-300" />
                </div>
                <p className="text-zinc-500 font-bold tamil-font text-lg">
                  {language === 'ta' ? 'கணக்குகள் எதுவும் இல்லை' : 'No balances available'}
                </p>
              </div>
            ) : (
              Object.entries(
                weaverBalances.reduce((acc, item) => {
                  if (!acc[item.yarnType]) acc[item.yarnType] = [];
                  acc[item.yarnType].push(item);
                  return acc;
                }, {} as Record<string, typeof weaverBalances>)
              ).map(([yarnType, items]) => (
                <div key={yarnType} className="mb-8">
                  <h3 className="text-sm font-black text-zinc-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
                    {yarnType !== 'Unknown' ? yarnType : (language === 'ta' ? 'டீனியர் இல்லை' : 'No Denier')}
                  </h3>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 hover:border-zinc-300 transition-colors">
                        <div className="flex justify-between items-center mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200">
                                <Palette size={16} className="text-zinc-500" />
                            </div>
                            <h4 className="font-black text-zinc-900 text-lg tracking-tight">{item.color}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleShareBalance(selectedWeaver, yarnType, item.color, item.balance)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                              title={language === 'ta' ? 'பகிர்' : 'Share'}
                            >
                              <Share2 size={18} />
                            </button>
                            <div className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${item.balance > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : item.balance < 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-zinc-50 text-zinc-700 border-zinc-200'}`}>
                              {language === 'ta' ? 'மீதம்: ' : 'Bal: '}{item.balance.toFixed(2)} kg
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                            <p className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-wider">{language === 'ta' ? 'கொடுத்தது' : 'Received'}</p>
                            <p className="font-black text-zinc-900 text-xl tracking-tight">{item.received.toFixed(2)} <span className="text-sm text-zinc-500 font-medium">kg</span></p>
                          </div>
                          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                            <p className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-wider">{language === 'ta' ? 'செலவு' : 'Consumed'}</p>
                            <p className="font-black text-zinc-900 text-xl tracking-tight">{item.consumed.toFixed(2)} <span className="text-sm text-zinc-500 font-medium">kg</span></p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
          </div>
        )}
      </div>
    );
  }

  // Render Weavers List View
  return (
    <div className={`p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm border border-zinc-200 hover:bg-zinc-50 transition-colors">
            <ArrowLeft size={20} className="text-zinc-600" />
          </button>
          <h2 className="text-2xl font-black tamil-font text-zinc-900 tracking-tight">
            {language === 'ta' ? 'நெசவாளர் கணக்குகள்' : 'Weaver Accounts'}
          </h2>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-violet-600 text-white px-5 py-2.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg hover:shadow-xl transition-all active:scale-95 border-none primary-btn"
        >
          <Plus size={16} strokeWidth={3} /> {language === 'ta' ? 'புதிய தறிக்காரரை சேர்+' : 'Add Weaver+'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-zinc-200 mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-black text-zinc-900 mb-5 tamil-font text-xl tracking-tight">{language === 'ta' ? 'புதிய தறிக்காரர்' : 'New Weaver'}</h3>
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'பெயர்' : 'Name'}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full p-4 bg-zinc-50 rounded-2xl mb-4 outline-none border border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
          />
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'போன் நம்பர் (விருப்பப்பட்டால்)' : 'Phone (Optional)'}
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            className="w-full p-4 bg-zinc-50 rounded-2xl mb-6 outline-none border border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
          />
          <div className="flex gap-4">
            <button onClick={handleAdd} className="flex-1 bg-violet-600 text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all active:scale-[0.98] border-none primary-btn">
              {language === 'ta' ? 'சேமி' : 'Save'}
            </button>
            <button onClick={() => { setIsAdding(false); setNewName(''); setNewPhone(''); }} className="flex-1 bg-zinc-100 border border-zinc-200 text-zinc-700 py-4 rounded-2xl font-black hover:bg-zinc-200 transition-all">
              {language === 'ta' ? 'ரத்து' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {weavers.length === 0 && !isAdding ? (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-zinc-200 shadow-sm">
          <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
            <UserIcon size={32} className="text-zinc-300" />
          </div>
          <p className="text-zinc-500 font-bold tamil-font text-lg">
            {language === 'ta' ? 'தறிக்காரர்கள் யாரும் இல்லை' : 'No weavers added yet'}
          </p>
          <p className="text-zinc-400 text-sm mt-2 max-w-[200px] mx-auto font-medium">
            {language === 'ta' ? 'மேலே உள்ள பட்டனை தட்டி புதிய தறிக்காரரை சேர்க்கவும்' : 'Tap the button above to add a new weaver'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {weavers.map((weaver, idx) => (
            <WeaverItem 
                key={weaver.id} 
                weaver={weaver} 
                onClick={() => {
                    setSelectedWeaver(weaver);
                    setViewType('overview');
                }}
                index={idx}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Weavers;
