
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { TRANSLATIONS } from '../constants';
import { TrendingUp, TrendingDown, Eraser, Calendar, Search, ArrowUpCircle, ArrowDownCircle, XCircle, Users, ChevronRight, ChevronLeft, User, Plus, FileDown } from 'lucide-react';
import { useLongPress } from '../lib/hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2pdf from 'html2pdf.js';

interface AccountingProps {
  transactions: Transaction[];
  language: 'ta' | 'en';
  onAdd: () => void;
  onBack: () => void;
  onClear: () => void;
}

const TransactionItem: React.FC<{ 
    txn: any; 
    language: 'ta' | 'en'; 
    onClick: () => void; 
}> = ({ txn, language, onClick }) => {
    return (
        <div onClick={onClick} className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200 flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer hover:border-zinc-300 relative overflow-hidden group">
            {txn.partyName && <div className="absolute top-0 right-0 px-2.5 py-1 bg-zinc-100 text-[9px] font-bold text-zinc-500 rounded-bl-xl border-b border-l border-zinc-200">{txn.partyName}</div>}
            <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${txn.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                    {txn.type === 'INCOME' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                </div>
                <div>
                    <p className="font-bold text-zinc-900 text-sm leading-tight tracking-tight">{txn.category}</p>
                    <p className="text-[11px] text-zinc-500 font-medium mt-1">
                        {new Date(txn.date).toLocaleDateString(language, {day: '2-digit', month: 'short'})}
                    </p>
                    {txn.description && <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1 italic">{txn.description}</p>}
                </div>
            </div>
            <div className="text-right pt-3">
                <p className={`font-black text-base tracking-tight ${txn.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {txn.type === 'INCOME' ? '+' : '-'} ₹{txn.amount}
                </p>
                <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-wider">
                    Bal: ₹{txn.runningBalance.toLocaleString()}
                </p>
            </div>
        </div>
    );
};

const Accounting: React.FC<AccountingProps> = ({ transactions, language, onAdd, onBack, onClear }) => {
  const t = TRANSLATIONS[language];
  const [viewMode, setViewMode] = useState<'LIST' | 'LEDGER'>('LIST');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate Summary (Based on ALL transactions to show true status)
  const summary = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
    const exp = transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
    return { income: inc, expense: exp, balance: inc - exp };
  }, [transactions]);

  // Filter Transactions for List View
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
        const matchesType = filterType === 'ALL' || txn.type === filterType;
        const query = searchQuery.toLowerCase();
        const matchesSearch = txn.category.toLowerCase().includes(query) || 
                              txn.description?.toLowerCase().includes(query) ||
                              txn.partyName?.toLowerCase().includes(query) ||
                              txn.amount.toString().includes(query);
        return matchesType && matchesSearch;
    }).sort((a, b) => b.date - a.date); // Newest first
  }, [transactions, filterType, searchQuery]);

  // Calculate Running Balance
  const transactionsWithBalance = useMemo(() => {
    // 1. Sort by Date Ascending (Oldest First) to calculate balance
    const sortedAsc = [...filteredTransactions].sort((a, b) => a.date - b.date);
    
    let runningBalance = 0;
    const withBalance = sortedAsc.map(txn => {
        if (txn.type === 'INCOME') runningBalance += txn.amount;
        else runningBalance -= txn.amount;
        return { ...txn, runningBalance };
    });
    
    // 2. Sort back to Descending (Newest First) for display
    return withBalance.sort((a, b) => b.date - a.date);
  }, [filteredTransactions]);

  // Group by Month (For List View)
  const groupedByMonth = useMemo(() => {
    return transactionsWithBalance.reduce((acc: any, txn) => {
        const month = new Date(txn.date).toLocaleString(language, { month: 'long', year: 'numeric' });
        if (!acc[month]) acc[month] = [];
        acc[month].push(txn);
        return acc;
    }, {});
  }, [transactionsWithBalance, language]);

  // Group by Party (For Ledger View)
  const groupedByParty = useMemo(() => {
      // Get all unique party names
      const partyMap: Record<string, { income: number, expense: number, txns: Transaction[] }> = {};
      
      transactions.forEach(txn => {
          if (!txn.partyName) return;
          const name = txn.partyName.trim();
          if (!partyMap[name]) partyMap[name] = { income: 0, expense: 0, txns: [] };
          
          if (txn.type === 'INCOME') partyMap[name].income += txn.amount;
          else partyMap[name].expense += txn.amount;
          
          partyMap[name].txns.push(txn);
      });

      // Convert to array and filter by search
      return Object.entries(partyMap)
        .map(([name, data]) => ({
            name,
            income: data.income,
            expense: data.expense,
            balance: data.income - data.expense,
            txns: data.txns
        }))
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => b.txns[b.txns.length-1].date - a.txns[a.txns.length-1].date); // Sort by recent activity
  }, [transactions, searchQuery]);

  const handlePartyClick = (partyName: string) => {
      setSearchQuery(partyName);
      setViewMode('LIST');
      setFilterType('ALL');
  };

  const statementRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!statementRef.current) return;
    
    const element = statementRef.current;
    const filename = `${searchQuery || 'accounts'}_statement_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Width for A4 at 96 DPI is ~794px. Using 800px for a clean layout.
    const pdfWidth = 800;

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: { 
        scale: 1.5, 
        useCORS: true, 
        letterRendering: true,
        width: pdfWidth,
        windowWidth: pdfWidth,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById('pdf-statement-accounting');
          if (el) {
            el.style.display = 'block';
            el.style.width = `${pdfWidth}px`;
            el.style.padding = '30px';
            el.style.fontFamily = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
            
            // Aggressive font smoothing for clarity
            el.style.setProperty('-webkit-font-smoothing', 'antialiased');
            el.style.setProperty('text-rendering', 'optimizeLegibility');

            // Find parts and restyle them for professional look
            const header = el.querySelector('h1');
            if (header) {
              header.style.fontSize = '24px';
              header.style.marginBottom = '4px';
              header.style.color = '#000';
              header.style.fontWeight = '900';
            }

            const grid = el.querySelector('.grid');
            if (grid instanceof HTMLElement) {
              grid.style.display = 'grid';
              grid.style.gridTemplateColumns = '1fr 1fr';
              grid.style.gap = '10px';
              grid.style.fontSize = '14px';
              grid.style.color = '#000';
              grid.style.fontWeight = '700';
              grid.style.borderTop = '2px solid #000';
              grid.style.paddingTop = '10px';
            }

            const table = el.querySelector('table');
            if (table) {
              table.style.marginTop = '20px';
              table.style.borderCollapse = 'collapse';
              table.style.width = '1000%'; // Ensure it takes full width of container
              table.style.width = '100%';
              
              const ths = table.querySelectorAll('th');
              ths.forEach(th => {
                th.style.backgroundColor = '#f4f4f5';
                th.style.color = '#000';
                th.style.border = '1px solid #d4d4d8';
                th.style.padding = '8px';
                th.style.fontSize = '12px';
                th.style.fontWeight = '900';
                th.style.textTransform = 'uppercase';
              });

              const tds = table.querySelectorAll('td');
              tds.forEach(td => {
                td.style.border = '1px solid #e4e4e7';
                td.style.padding = '8px';
                td.style.fontSize = '12px';
                td.style.color = '#000';
                td.style.fontWeight = '600';
              });

              // Header borders
              const trs = table.querySelectorAll('tr');
              trs.forEach((tr, idx) => {
                if (idx % 2 === 0 && idx > 0) {
                  tr.style.backgroundColor = '#fafafa';
                }
              });
            }
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
          title: language === 'ta' ? 'கணக்கு அறிக்கை' : 'Account Statement',
          text: filename
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

  return (
    <div className="p-4 space-y-4 pb-28 md:pb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm border border-zinc-200 hover:bg-zinc-50 transition-colors">
          <ChevronLeft size={20} className="text-zinc-600" />
        </button>
        <h2 className="text-2xl font-black tamil-font text-zinc-900 tracking-tight">
          {language === 'ta' ? 'கணக்கு' : 'Accounts'}
        </h2>
      </div>

      {/* Summary Header */}
      <div className="bg-zinc-950 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-800 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"></div>
         <div className="relative z-10">
             <div className="flex justify-between items-start mb-6">
                 <div>
                     <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest mb-1">{t.totalBalance}</p>
                     <h2 className="text-4xl font-black tracking-tight">₹{summary.balance.toLocaleString()}</h2>
                 </div>
                 <div className="bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-700/50 backdrop-blur-sm">
                     <Calendar size={20} className="text-zinc-300" />
                 </div>
             </div>
             <div className="flex gap-4">
                 <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 backdrop-blur-md flex items-center gap-3">
                     <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400 border border-emerald-500/20">
                         <TrendingUp size={16} />
                     </div>
                     <div>
                         <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{t.income}</p>
                         <p className="font-bold text-sm tracking-tight">₹{summary.income.toLocaleString()}</p>
                     </div>
                 </div>
                 <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 backdrop-blur-md flex items-center gap-3">
                     <div className="bg-rose-500/10 p-2 rounded-xl text-rose-400 border border-rose-500/20">
                         <TrendingDown size={16} />
                     </div>
                     <div>
                         <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{t.expense}</p>
                         <p className="font-bold text-sm tracking-tight">₹{summary.expense.toLocaleString()}</p>
                     </div>
                 </div>
             </div>
         </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-zinc-200 flex gap-1">
          <button 
             onClick={() => setViewMode('LIST')}
             className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${viewMode === 'LIST' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'}`}
          >
              <Calendar size={16} /> {t.transactions}
          </button>
          <button 
             onClick={() => setViewMode('LEDGER')}
             className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all ${viewMode === 'LEDGER' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'}`}
          >
              <Users size={16} /> {t.ledger}
          </button>
      </div>

      {/* Controls */}
      <div className="space-y-3 sticky top-0 bg-zinc-50/95 backdrop-blur-sm z-10 py-2">
          {/* Search */}
          <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={viewMode === 'LIST' ? (language === 'ta' ? 'தேடவும் (வகை, குறிப்பு, பெயர்...)' : 'Search...') : (language === 'ta' ? 'பெயர் தேடவும்...' : 'Search Name...')}
                  className="w-full pl-11 pr-10 py-3.5 bg-white border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all shadow-sm"
              />
              {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1">
                      <XCircle size={18} />
                  </button>
              )}
          </div>

          {/* Filters (Only for List View) */}
          {viewMode === 'LIST' && (
            <div className="flex items-center gap-2">
                <div className="flex-1 flex bg-zinc-200/50 p-1 rounded-xl border border-zinc-200/50">
                    <button 
                        onClick={() => setFilterType('ALL')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        {language === 'ta' ? 'எல்லாம்' : 'All'}
                    </button>
                    <button 
                        onClick={() => setFilterType('INCOME')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        {t.income}
                    </button>
                    <button 
                        onClick={() => setFilterType('EXPENSE')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm border border-zinc-200/50' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        {t.expense}
                    </button>
                </div>
                <button 
                    onClick={downloadPDF}
                    className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm"
                    title={language === 'ta' ? 'அறிக்கை டவுன்லோட்' : 'Download Statement'}
                >
                    <FileDown size={20} />
                </button>
            </div>
          )}
      </div>

      {/* Content */}
      {viewMode === 'LIST' ? (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            {Object.keys(groupedByMonth).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200 border-dashed">
                    <Calendar size={48} className="mx-auto mb-3 text-zinc-300"/>
                    <p className="text-sm font-bold text-zinc-500 tamil-font">{t.noData}</p>
                </div>
            ) : (
                Object.keys(groupedByMonth).map(month => (
                    <div key={month} className="space-y-3">
                        <div className="flex items-center gap-3 px-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-200/50 px-2.5 py-1 rounded-md border border-zinc-200/50">{month}</span>
                            <div className="h-px bg-zinc-200 flex-1"></div>
                        </div>
                        
                        <div className="space-y-2.5">
                            {groupedByMonth[month].map((txn: any) => (
                                <TransactionItem 
                                    key={txn.id} 
                                    txn={txn} 
                                    language={language} 
                                    onClick={() => {}}
                                />
                            ))}
                        </div>
                    </div>
                ))
            )}
            
          </div>
      ) : (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             {groupedByParty.length === 0 ? (
                 <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200 border-dashed">
                    <Users size={48} className="mx-auto mb-3 text-zinc-300"/>
                    <p className="text-sm font-bold text-zinc-500 tamil-font">{language === 'ta' ? 'பெயர்கள் இல்லை' : 'No parties found'}</p>
                 </div>
             ) : (
                 groupedByParty.map((party, idx) => (
                    <div key={idx} onClick={() => handlePartyClick(party.name)} className="bg-white p-4.5 rounded-2xl shadow-sm border border-zinc-200 active:scale-[0.98] transition-all cursor-pointer hover:border-zinc-300 flex items-center justify-between group">
                         <div className="flex items-center gap-4">
                             <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border ${party.balance > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : party.balance < 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}>
                                 {party.name.charAt(0).toUpperCase()}
                             </div>
                             <div>
                                 <h3 className="font-bold text-zinc-900 text-base tracking-tight">{party.name}</h3>
                                 <p className="text-[11px] text-zinc-500 font-medium mt-0.5">{party.txns.length} {language === 'ta' ? 'பரிவர்த்தனைகள்' : 'Entries'}</p>
                             </div>
                         </div>
                         <div className="text-right flex items-center gap-3">
                             <div>
                                 <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                                     {party.balance > 0 ? t.netBalance : party.balance < 0 ? t.netBalance : 'Settled'}
                                 </p>
                                 <p className={`text-lg font-black tracking-tight ${party.balance > 0 ? 'text-emerald-600' : party.balance < 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                                     {party.balance > 0 ? '+' : ''} ₹{party.balance.toLocaleString()}
                                 </p>
                             </div>
                             <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                         </div>
                    </div>
                 ))
             )}
             <p className="text-xs text-center text-zinc-400 p-4 tamil-font font-medium">
                 {language === 'ta' 
                    ? 'பெயரை கிளிக் செய்து விவரங்களை பார்க்கலாம்.' 
                    : 'Tap a name to see transaction history.'}
             </p>
          </div>
      )}

      {/* Add Transaction Floating Button */}
      <button 
        onClick={onAdd}
        className="fixed bottom-20 right-6 text-white p-4.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-30 border-none group bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
      >
        <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Hidden Statement for PDF Generation */}
      <div className="hidden">
        <div ref={statementRef} id="pdf-statement-accounting" style={{ width: '800px' }} className="p-8 bg-white text-black font-sans">
          <div className="mb-6 border-b-4 border-black pb-4">
            <h1 className="text-2xl font-black mb-1 uppercase tracking-tight">
              {searchQuery ? `${searchQuery} - ${language === 'ta' ? 'கணக்கு அறிக்கை' : 'Account Statement'}` : (language === 'ta' ? 'அனைத்து கணக்கு அறிக்கை' : 'All Transactions Statement')}
            </h1>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm font-bold">
              <div className="flex justify-between border-b border-zinc-100 py-1">
                <span>{language === 'ta' ? 'தேதி' : 'Date'}:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 py-1">
                <span>{language === 'ta' ? 'மீதம்' : 'Balance'}:</span>
                <span>₹{summary.balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 py-1">
                <span>{language === 'ta' ? 'மொத்த வரவு' : 'Total Income'}:</span>
                <span className="text-emerald-700">₹{summary.income.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-100 py-1">
                <span>{language === 'ta' ? 'மொத்த செலவு' : 'Total Expense'}:</span>
                <span className="text-rose-700">₹{summary.expense.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse border border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 text-black uppercase text-[10px] font-black border-b-2 border-black">
                <th className="p-2 border border-zinc-300">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                <th className="p-2 border border-zinc-300">{language === 'ta' ? 'வகை' : 'Category'}</th>
                <th className="p-2 border border-zinc-300">{language === 'ta' ? 'பெயர்' : 'Party'}</th>
                <th className="p-2 border border-zinc-300">{language === 'ta' ? 'குறிப்பு' : 'Description'}</th>
                <th className="p-2 border border-zinc-300 text-right">{language === 'ta' ? 'வரவு' : 'Income'}</th>
                <th className="p-2 border border-zinc-300 text-right">{language === 'ta' ? 'செலவு' : 'Expense'}</th>
                <th className="p-2 border border-zinc-300 text-right">{language === 'ta' ? 'மீதம்' : 'Balance'}</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {transactionsWithBalance.map((txn, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                  <td className="p-2 border border-zinc-200">{new Date(txn.date).toLocaleDateString()}</td>
                  <td className="p-2 border border-zinc-200 font-bold">{txn.category}</td>
                  <td className="p-2 border border-zinc-200">{txn.partyName || '-'}</td>
                  <td className="p-2 border border-zinc-200 italic text-zinc-600">{txn.description || '-'}</td>
                  <td className="p-2 border border-zinc-200 text-right text-emerald-700 font-bold">{txn.type === 'INCOME' ? `₹${txn.amount}` : '-'}</td>
                  <td className="p-2 border border-zinc-200 text-right text-rose-700 font-bold">{txn.type === 'EXPENSE' ? `₹${txn.amount}` : '-'}</td>
                  <td className="p-2 border border-zinc-200 text-right font-black">₹{txn.runningBalance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Accounting;
