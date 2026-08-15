import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, YarnSupplier, YarnEntry, YarnDispatch, Weaver, Warper } from '../types';
import { ArrowLeft, Layers, Scissors, Plus, Calendar, FileText, Weight, Palette, Hash, Building2, Send, PieChart, Users, Sparkles, FileDown } from 'lucide-react';
import { YARN_TYPES, YARN_COLORS } from '../constants';
import { saveDataAndSync, deleteDataAndSync } from '../lib/supabaseSync';
import DeliverySlipForm from './DeliverySlipForm';
import html2pdf from 'html2pdf.js';

interface AllYarnsAccountsProps {
  user: User;
  language: 'ta' | 'en';
  onBack: () => void;
}

const AllYarnsAccounts: React.FC<AllYarnsAccountsProps> = ({ user, language, onBack }) => {
  const [suppliers, setSuppliers] = useState<YarnSupplier[]>([]);
  const [entries, setEntries] = useState<YarnEntry[]>([]);
  const [dispatches, setDispatches] = useState<YarnDispatch[]>([]);
  const [weavers, setWeavers] = useState<Weaver[]>([]);
  const [warpers, setWarpers] = useState<Warper[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<'warp' | 'weft' | 'zari' | null>(null);
  const [viewType, setViewType] = useState<'entries' | 'balance' | 'dispatch'>('entries');
  
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [entrySupplierId, setEntrySupplierId] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryYarnType, setEntryYarnType] = useState('');
  const [entryWeight, setEntryWeight] = useState('');
  const [entryColor, setEntryColor] = useState('');
  const [entryReceipt, setEntryReceipt] = useState('');

  const [dispatchSlipType, setDispatchSlipType] = useState<'warper' | 'weaver' | null>(null);

  // Sync sub-views with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (dispatchSlipType) { setDispatchSlipType(null); return; }
      if (isAddingEntry) { setIsAddingEntry(false); return; }
      if (selectedCategory) { 
        setSelectedCategory(null); 
        setViewType('entries');
        return; 
      }
    };

    const anySubViewOpen = dispatchSlipType || isAddingEntry || selectedCategory;
    if (anySubViewOpen) {
      window.history.pushState({ subview: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [dispatchSlipType, isAddingEntry, selectedCategory]);

  const loadData = useCallback(() => {
    const savedSuppliers = localStorage.getItem(`viyabaari_yarn_suppliers_${user.uid || 'guest'}`);
    if (savedSuppliers) setSuppliers(JSON.parse(savedSuppliers));
    
    const savedEntries = localStorage.getItem(`viyabaari_yarn_entries_${user.uid || 'guest'}`);
    if (savedEntries) setEntries(JSON.parse(savedEntries));

    const savedDispatches = localStorage.getItem(`viyabaari_yarn_dispatches_${user.uid || 'guest'}`);
    if (savedDispatches) setDispatches(JSON.parse(savedDispatches));

    const savedWeavers = localStorage.getItem(`viyabaari_weavers_${user.uid || 'guest'}`);
    if (savedWeavers) setWeavers(JSON.parse(savedWeavers));

    const savedWarpers = localStorage.getItem(`viyabaari_warpers_${user.uid || 'guest'}`);
    if (savedWarpers) setWarpers(JSON.parse(savedWarpers));
  }, [user.uid]);

  useEffect(() => {
    loadData();
    window.addEventListener('local-storage-update', loadData);
    return () => window.removeEventListener('local-storage-update', loadData);
  }, [loadData]);

  const saveEntries = (newEntries: YarnEntry[]) => {
    setEntries(newEntries);
    saveDataAndSync(user.uid, `viyabaari_yarn_entries_${user.uid || 'guest'}`, newEntries, 'yarn_entries');
  };

  const saveDispatches = (newDispatches: YarnDispatch[]) => {
    setDispatches(newDispatches);
    saveDataAndSync(user.uid, `viyabaari_yarn_dispatches_${user.uid || 'guest'}`, newDispatches, 'yarn_dispatches');
  };

  const handleAddEntry = () => {
    if (!entryDate || !entryYarnType || !entryWeight || !entrySupplierId || !selectedCategory || !entryColor) return;
    
    const weight = parseFloat(entryWeight);
    if (isNaN(weight)) {
      alert(language === 'ta' ? 'சரியான எடையை உள்ளிடவும்' : 'Please enter a valid weight');
      return;
    }
    
    const newEntry: YarnEntry = {
      id: Date.now().toString(),
      supplierId: entrySupplierId,
      yarnCategory: selectedCategory,
      date: entryDate,
      yarnType: entryYarnType,
      weightKg: weight,
      color: entryColor,
      receiptNumber: entryReceipt,
      createdAt: Date.now()
    };
    
    saveEntries([...entries, newEntry]);
    setEntryYarnType('');
    setEntryWeight('');
    setEntryColor('');
    setEntryReceipt('');
    setEntrySupplierId('');
    setIsAddingEntry(false);
  };

  const statementRef = useRef<HTMLDivElement>(null);

  const downloadStatement = async () => {
    if (!statementRef.current) return;
    
    const element = statementRef.current;
    const filename = `yarn_${selectedCategory}_statement_${new Date().toISOString().split('T')[0]}.pdf`;
    
    const opt = {
      margin: [10, 10] as [number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: { 
        scale: 1.5, 
        useCORS: true, 
        letterRendering: true,
        width: 800,
        windowWidth: 800,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById('pdf-statement-yarns');
          if (el) {
            el.style.display = 'block';
            el.style.width = '800px';
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      const worker = html2pdf().set(opt).from(element);
      const blob = await worker.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: language === 'ta' ? 'அறிக்கை' : 'Statement',
          text: language === 'ta' ? 'நூல் இருப்பு அறிக்கை' : 'Yarn Stock Statement'
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      html2pdf().set(opt).from(element).save();
    }
  };

  const getSupplierName = (id: string) => {
    const supplier = suppliers.find(s => s.id === id);
    if (supplier) return supplier.name;
    
    const savedSuppliers = localStorage.getItem(`viyabaari_suppliers_${user.uid || 'guest'}`);
    if (savedSuppliers) {
      try {
        const regSuppliers = JSON.parse(savedSuppliers);
        const regSupplier = regSuppliers.find((s: any) => s.id === id);
        if (regSupplier) return regSupplier.name;
      } catch (e) {}
    }
    
    return language === 'ta' ? 'தெரியாத சப்ளையர்' : 'Unknown Supplier';
  };

  const getRecipientName = (type: 'warper' | 'weaver', id: string) => {
    if (type === 'warper') {
      const warper = warpers.find(w => w.id === id);
      return warper ? warper.name : 'Unknown Warper';
    } else {
      const weaver = weavers.find(w => w.id === id);
      return weaver ? weaver.name : 'Unknown Weaver';
    }
  };

  const colorBalances = useMemo(() => {
    if (!selectedCategory) return [];
    
    const balances: Record<string, { received: number, dispatched: number }> = {};
    
    entries.filter(e => e.yarnCategory === selectedCategory).forEach(entry => {
      const color = entry.color || 'Unknown';
      if (!balances[color]) balances[color] = { received: 0, dispatched: 0 };
      balances[color].received += entry.weightKg;
    });
    
    dispatches.filter(d => d.yarnCategory === selectedCategory).forEach(dispatch => {
      const color = dispatch.color || 'Unknown';
      if (!balances[color]) balances[color] = { received: 0, dispatched: 0 };
      balances[color].dispatched += dispatch.weightKg;
    });
    
    return Object.entries(balances).map(([color, data]) => ({
      color,
      received: data.received,
      dispatched: data.dispatched,
      balance: data.received - data.dispatched
    })).sort((a, b) => b.balance - a.balance);
  }, [entries, dispatches, selectedCategory]);

  if (dispatchSlipType) {
    return (
      <DeliverySlipForm
        user={user}
        language={language}
        type={dispatchSlipType}
        initialCategory={selectedCategory || undefined}
        onBack={() => {
          setDispatchSlipType(null);
          const savedDispatches = localStorage.getItem(`viyabaari_yarn_dispatches_${user.uid || 'guest'}`);
          if (savedDispatches) setDispatches(JSON.parse(savedDispatches));
        }}
      />
    );
  }

  // Render Category View (Warp/Weft/Zari Entries)
  if (selectedCategory) {
    const categoryEntries = entries.filter(e => e.yarnCategory === selectedCategory);
    const categoryDispatches = dispatches.filter(d => d.yarnCategory === selectedCategory);
    const categoryName = selectedCategory === 'warp' 
      ? (language === 'ta' ? 'வார்ப்பு நூல் கணக்கு' : 'Warp Yarn Account')
      : selectedCategory === 'weft'
      ? (language === 'ta' ? 'ஊடை நூல் கணக்கு' : 'Weft Yarn Account')
      : (language === 'ta' ? 'ஜரிகை கணக்கு' : 'Zari Account');

    const groupedCategoryDispatches = Object.values(categoryDispatches.reduce((acc, d) => {
      const key = d.createdAt || d.id;
      if (!acc[key]) {
        acc[key] = { ...d, items: [] };
      }
      acc[key].items.push({ id: d.id, yarnType: d.yarnType, color: d.color, weightKg: d.weightKg });
      acc[key].weightKg = acc[key].items.reduce((sum: number, item: any) => sum + item.weightKg, 0);
      return acc;
    }, {} as Record<string, any>));

    return (
      <>
        <div className="p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => { setSelectedCategory(null); setViewType('entries'); }} className="p-2 bg-white rounded-full shadow-sm hover:bg-zinc-50 transition">
                <ArrowLeft size={20} className="text-zinc-600" />
              </button>
              <h2 className="text-xl font-black tamil-font text-zinc-900">{categoryName}</h2>
            </div>
            <button 
              onClick={downloadStatement}
              className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm flex items-center gap-2"
              title={language === 'ta' ? 'அறிக்கை டவுன்லோட்' : 'Download Statement'}
            >
              <FileDown size={20} />
              <span className="text-xs font-bold hidden sm:inline">{language === 'ta' ? 'ஸ்டேட்மென்ட்' : 'Statement'}</span>
            </button>
          </div>

          <div className="flex bg-zinc-100 p-1 rounded-2xl mb-6">
            <button 
              onClick={() => setViewType('entries')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${viewType === 'entries' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {language === 'ta' ? 'வரவுகள்' : 'Received'}
            </button>
            <button 
              onClick={() => setViewType('dispatch')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${viewType === 'dispatch' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {language === 'ta' ? 'கொடுத்தது' : 'Dispatched'}
            </button>
            <button 
              onClick={() => setViewType('balance')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${viewType === 'balance' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {language === 'ta' ? 'இருப்பு' : 'Balance'}
            </button>
          </div>

          {viewType === 'entries' && (
            <>
              <div className="flex justify-end mb-4">
                <button 
                  onClick={() => setIsAddingEntry(true)}
                  className="bg-zinc-900 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-md hover:bg-zinc-800 transition"
                >
                  <Plus size={14} /> {language === 'ta' ? 'புதிய வரவு+' : 'Add Entry+'}
                </button>
              </div>

              {isAddingEntry && (
                <div className="bg-white p-5 rounded-3xl shadow-lg border border-zinc-200 mb-6 animate-in fade-in slide-in-from-top-4">
                  <h3 className="font-black text-zinc-800 mb-4 tamil-font text-lg">{language === 'ta' ? 'புதிய வரவு' : 'New Entry'}</h3>
                  
                  <div className="space-y-3 mb-5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Building2 size={18} />
                      </div>
                      <select 
                        value={entrySupplierId}
                        onChange={e => setEntrySupplierId(e.target.value)}
                        className="w-full pl-11 p-4 bg-zinc-50 rounded-2xl outline-none border border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition font-medium appearance-none"
                      >
                        <option value="">{language === 'ta' ? 'சப்ளையரை தேர்ந்தெடுக்கவும்' : 'Select Supplier'}</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.companyName})</option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Calendar size={18} />
                      </div>
                      <input 
                        type="date" 
                        value={entryDate}
                        onChange={e => setEntryDate(e.target.value)}
                        className="w-full pl-11 p-4 bg-zinc-50 rounded-2xl outline-none border border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition font-medium"
                      />
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <FileText size={18} />
                      </div>
                      <select 
                        value={entryYarnType}
                        onChange={e => setEntryYarnType(e.target.value)}
                        className="w-full pl-11 p-4 bg-zinc-50 rounded-2xl outline-none border border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition font-medium appearance-none"
                      >
                        <option value="">{language === 'ta' ? 'என்ன நூல்' : 'Yarn Type'}</option>
                        {YARN_TYPES.map(yt => (
                          <option key={yt} value={yt}>{yt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Weight size={18} />
                      </div>
                      <input 
                        type="number" 
                        placeholder={language === 'ta' ? 'எத்தனை கிலோ' : 'Weight (Kg)'}
                        value={entryWeight}
                        onChange={e => setEntryWeight(e.target.value)}
                        className="w-full pl-11 p-4 bg-zinc-50 rounded-2xl outline-none border border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition font-medium"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Palette size={18} />
                      </div>
                      <select 
                        value={entryColor}
                        onChange={e => setEntryColor(e.target.value)}
                        className="w-full pl-11 p-4 bg-zinc-50 rounded-2xl outline-none border border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition font-medium appearance-none"
                      >
                        <option value="">{language === 'ta' ? 'என்ன கலர்' : 'Color'}</option>
                        {YARN_COLORS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Hash size={18} />
                      </div>
                      <input 
                        type="text" 
                        placeholder={language === 'ta' ? 'ரசீது எண்' : 'Receipt Number'}
                        value={entryReceipt}
                        onChange={e => setEntryReceipt(e.target.value)}
                        className="w-full pl-11 p-4 bg-zinc-50 rounded-2xl outline-none border border-zinc-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={handleAddEntry} 
                      disabled={!entrySupplierId}
                      className={`flex-1 text-white py-3.5 rounded-2xl font-black shadow-md transition ${!entrySupplierId ? 'bg-zinc-300 cursor-not-allowed' : 'bg-zinc-900 shadow-zinc-200 hover:bg-zinc-800 hover:shadow-lg'}`}
                    >
                      {language === 'ta' ? 'சேமி' : 'Save'}
                    </button>
                    <button onClick={() => setIsAddingEntry(false)} className="flex-1 bg-zinc-100 text-zinc-600 py-3.5 rounded-2xl font-black hover:bg-zinc-200 transition">
                      {language === 'ta' ? 'ரத்து' : 'Cancel'}
                    </button>
                  </div>
                  {!entrySupplierId && (
                    <p className="text-xs text-rose-500 mt-2 text-center font-medium">
                      {language === 'ta' ? 'சப்ளையரை தேர்ந்தெடுக்கவும்' : 'Please select a supplier'}
                    </p>
                  )}
                </div>
              )}

              {categoryEntries.length === 0 && !isAddingEntry ? (
                <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-zinc-200 shadow-sm">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} className="text-zinc-300" />
                  </div>
                  <p className="text-zinc-500 font-bold tamil-font text-lg">
                    {language === 'ta' ? 'வரவுகள் எதுவும் இல்லை' : 'No entries yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                    <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-zinc-100 text-zinc-800 text-xs font-bold px-2 py-1 rounded-lg">
                            {new Date(entry.date).toLocaleDateString()}
                          </div>
                          <div className="bg-zinc-100 text-zinc-700 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            <Building2 size={12} /> {getSupplierName(entry.supplierId)}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3">
                        <div>
                          <p className="text-xs text-zinc-500 font-medium">{language === 'ta' ? 'நூல்' : 'Yarn'}</p>
                          <p className="font-bold text-zinc-800">{entry.yarnType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-zinc-500 font-medium">{language === 'ta' ? 'கிலோ' : 'Weight'}</p>
                          <p className="font-bold text-zinc-800">{entry.weightKg} kg</p>
                        </div>
                        {entry.color && (
                          <div>
                            <p className="text-xs text-zinc-500 font-medium">{language === 'ta' ? 'கலர்' : 'Color'}</p>
                            <p className="font-bold text-zinc-800">{entry.color}</p>
                          </div>
                        )}
                        {entry.receiptNumber && (
                          <div>
                            <p className="text-xs text-zinc-500 font-medium">{language === 'ta' ? 'ரசீது எண்' : 'Receipt'}</p>
                            <p className="font-bold text-zinc-800">{entry.receiptNumber}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          {viewType === 'dispatch' && (
            <>
              <div className="flex justify-end gap-2 mb-4">
                <button 
                  onClick={() => setDispatchSlipType('warper')}
                  className="bg-slate-800 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-md hover:bg-slate-700 transition"
                >
                  <Send size={14} /> {language === 'ta' ? 'வார்ப்புக்கு அனுப்பு' : 'To Warper'}
                </button>
                <button 
                  onClick={() => setDispatchSlipType('weaver')}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-md hover:bg-zinc-700 transition"
                >
                  <Send size={14} /> {language === 'ta' ? 'தறிக்கு அனுப்பு' : 'To Weaver'}
                </button>
              </div>

              {groupedCategoryDispatches.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-zinc-200 shadow-sm">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send size={32} className="text-zinc-300" />
                  </div>
                  <p className="text-zinc-500 font-bold tamil-font text-lg">
                    {language === 'ta' ? 'யாருக்கும் நூல் கொடுக்கவில்லை' : 'No yarn dispatched yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedCategoryDispatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(dispatch => (
                    <div key={dispatch.id} className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-rose-100 text-rose-800 text-xs font-bold px-2 py-1 rounded-lg">
                            {new Date(dispatch.date).toLocaleDateString()}
                          </div>
                          <div className="bg-zinc-100 text-zinc-700 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            <Users size={12} /> {getRecipientName(dispatch.recipientType, dispatch.recipientId)}
                          </div>
                        </div>
                      </div>
                      
                      {dispatch.items && dispatch.items.length > 1 ? (
                        <div className="mt-3">
                          <p className="text-xs text-zinc-500 font-medium mb-2">{language === 'ta' ? 'பகுதிகள்' : 'Items'}</p>
                          <div className="bg-zinc-50 rounded-xl p-3 space-y-2">
                            {dispatch.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="font-medium text-zinc-700">{item.yarnType} ({item.color})</span>
                                <span className="font-bold text-zinc-800">{item.weightKg} kg</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-100">
                            <span className="text-xs text-zinc-500 font-medium">{language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}</span>
                            <span className="font-bold text-zinc-800">{dispatch.weightKg} kg</span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3">
                          <div>
                            <p className="text-xs text-zinc-500 font-medium">{language === 'ta' ? 'நூல்' : 'Yarn'}</p>
                            <p className="font-bold text-zinc-800">{dispatch.yarnType}</p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 font-medium">{language === 'ta' ? 'கிலோ' : 'Weight'}</p>
                            <p className="font-bold text-zinc-800">{dispatch.weightKg} kg</p>
                          </div>
                          {dispatch.color && (
                            <div>
                              <p className="text-xs text-zinc-500 font-medium">{language === 'ta' ? 'கலர்' : 'Color'}</p>
                              <p className="font-bold text-zinc-800">{dispatch.color}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {viewType === 'balance' && (
            <div className="space-y-4">
              {colorBalances.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-zinc-200 shadow-sm">
                  <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PieChart size={32} className="text-zinc-300" />
                  </div>
                  <p className="text-zinc-500 font-bold tamil-font text-lg">
                    {language === 'ta' ? 'கணக்குகள் எதுவும் இல்லை' : 'No balances available'}
                  </p>
                </div>
              ) : (
                colorBalances.map((item, index) => (
                  <div key={index} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-100">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-zinc-800"></div>
                        <h4 className="font-black text-zinc-800 text-lg">{item.color}</h4>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${item.balance > 0 ? 'bg-emerald-100 text-emerald-700' : item.balance < 0 ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-700'}`}>
                        {language === 'ta' ? 'மீதம்: ' : 'Bal: '}{item.balance.toFixed(2)} kg
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 p-3 rounded-xl">
                        <p className="text-xs text-zinc-600 font-bold mb-1">{language === 'ta' ? 'வந்தது' : 'Received'}</p>
                        <p className="font-black text-zinc-900 text-lg">{item.received.toFixed(2)} kg</p>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-xl">
                        <p className="text-xs text-rose-600 font-bold mb-1">{language === 'ta' ? 'கொடுத்தது' : 'Dispatched'}</p>
                        <p className="font-black text-rose-900 text-lg">{item.dispatched.toFixed(2)} kg</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Hidden Statement for PDF Generation */}
        <div className="hidden">
          <div ref={statementRef} id="pdf-statement-yarns" style={{ width: '800px' }} className="p-8 bg-white text-black font-sans">
            <div className="mb-6 border-b-4 border-black pb-4 flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-black mb-1 uppercase tracking-tight">
                  {language === 'ta' ? 'நூல் இருப்பு அறிக்கை' : 'Yarn Stock Statement'}
                </h1>
                <div className="text-lg font-black text-zinc-800">
                  {language === 'ta' ? 'வகை' : 'Category'}: {
                    selectedCategory === 'warp' ? (language === 'ta' ? 'வார்ப்பு' : 'Warp') : 
                    selectedCategory === 'weft' ? (language === 'ta' ? 'ஊடை' : 'Weft') : 
                    (language === 'ta' ? 'ஜரிகை' : 'Zari')
                  }
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-zinc-500 uppercase">{language === 'ta' ? 'தேதி' : 'Date'}</p>
                <p className="text-lg font-black">{new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse border border-zinc-300">
              <thead>
                <tr className="bg-zinc-100 text-black uppercase text-[10px] font-black border-b-2 border-black">
                  <th className="p-2 border border-zinc-300">{language === 'ta' ? 'நூல் வகை' : 'Yarn Type'}</th>
                  <th className="p-2 border border-zinc-300">{language === 'ta' ? 'நிறம்' : 'Color'}</th>
                  <th className="p-3 border border-zinc-300 text-right">{language === 'ta' ? 'வந்த அளவு (kg)' : 'Received (kg)'}</th>
                  <th className="p-3 border border-zinc-300 text-right">{language === 'ta' ? 'கொடுத்த அளவு (kg)' : 'Dispatched (kg)'}</th>
                  <th className="p-3 border border-zinc-300 text-right">{language === 'ta' ? 'மீதம் (kg)' : 'Balance (kg)'}</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {(() => {
                  const categoryEntries = entries.filter(e => e.yarnCategory === selectedCategory);
                  const categoryDispatches = dispatches.filter(d => d.yarnCategory === selectedCategory);
                  const yarnKeys = Array.from(new Set([
                    ...categoryEntries.map(e => `${e.yarnType}|${e.color}`),
                    ...categoryDispatches.map(d => `${d.yarnType}|${d.color}`)
                  ])).sort();

                  return yarnKeys.map((key, idx) => {
                    const [type, color] = key.split('|');
                    const received = categoryEntries.filter(e => e.yarnType === type && e.color === color).reduce((sum, e) => sum + e.weightKg, 0);
                    const dispatched = categoryDispatches.filter(d => d.yarnType === type && d.color === color).reduce((sum, d) => sum + d.weightKg, 0);
                    const balance = received - dispatched;
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-zinc-50/50' : 'bg-white'}>
                        <td className="p-2 border border-zinc-200 font-bold">{type}</td>
                        <td className="p-2 border border-zinc-200">{color}</td>
                        <td className="p-2 border border-zinc-200 text-right">{received.toFixed(2)}</td>
                        <td className="p-2 border border-zinc-200 text-right">{dispatched.toFixed(2)}</td>
                        <td className="p-2 border border-zinc-200 text-right font-black">{(received - dispatched).toFixed(2)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  // Render Category Selection View
  return (
    <div className="p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-zinc-50 transition">
          <ArrowLeft size={20} className="text-zinc-600" />
        </button>
        <h2 className="text-xl font-black tamil-font text-zinc-800">
          {language === 'ta' ? 'அனைத்து நூல் கணக்குகள்' : 'All Yarns Accounts'}
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div 
          onClick={() => setSelectedCategory('warp')}
          className="bg-white p-6 rounded-3xl shadow-sm flex items-center gap-5 cursor-pointer hover:bg-zinc-50 hover:shadow-md transition border border-zinc-100 group"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition">
            <Layers size={32} />
          </div>
          <div>
            <h3 className="font-black text-zinc-800 text-xl tamil-font">{language === 'ta' ? 'வார்ப்பு நூல் கணக்கு' : 'Warp Yarn Account'}</h3>
            <p className="text-zinc-500 text-sm font-medium mt-1">{language === 'ta' ? 'அனைத்து வார்ப்பு நூல் வரவுகள்' : 'All warp yarn entries'}</p>
          </div>
        </div>

        <div 
          onClick={() => setSelectedCategory('weft')}
          className="bg-white p-6 rounded-3xl shadow-sm flex items-center gap-5 cursor-pointer hover:bg-zinc-50 hover:shadow-md transition border border-zinc-100 group"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition">
            <Scissors size={32} />
          </div>
          <div>
            <h3 className="font-black text-zinc-800 text-xl tamil-font">{language === 'ta' ? 'ஊடை நூல் கணக்கு' : 'Weft Yarn Account'}</h3>
            <p className="text-zinc-500 text-sm font-medium mt-1">{language === 'ta' ? 'அனைத்து ஊடை நூல் வரவுகள்' : 'All weft yarn entries'}</p>
          </div>
        </div>

        <div 
          onClick={() => setSelectedCategory('zari')}
          className="bg-white p-6 rounded-3xl shadow-sm flex items-center gap-5 cursor-pointer hover:bg-zinc-50 hover:shadow-md transition border border-zinc-100 group"
        >
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition">
            <Sparkles size={32} />
          </div>
          <div>
            <h3 className="font-black text-zinc-800 text-xl tamil-font">{language === 'ta' ? 'ஜரிகை கணக்கு' : 'Zari Account'}</h3>
            <p className="text-zinc-500 text-sm font-medium mt-1">{language === 'ta' ? 'அனைத்து ஜரிகை வரவுகள்' : 'All zari entries'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllYarnsAccounts;
