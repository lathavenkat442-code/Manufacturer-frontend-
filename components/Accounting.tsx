
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { TRANSLATIONS } from '../constants';
import { TrendingUp, TrendingDown, Eraser, Calendar, Search, ArrowUpCircle, ArrowDownCircle, XCircle, Users, ChevronRight, ChevronLeft, User, Plus, FileDown, Printer, Share2, FileText } from 'lucide-react';
import { useLongPress } from '../lib/hooks';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2pdf from 'html2pdf.js';
import { LedgerPrintModal, PartySummaryItem } from './LedgerPrintModal';

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
  const [selectedParty, setSelectedParty] = useState<string | null>(null);

  // Print modal state
  const [printConfig, setPrintConfig] = useState<{
    isOpen: boolean;
    mode: 'PARTY' | 'ALL_TRANSACTIONS' | 'LEDGER_SUMMARY';
    partyName?: string;
    transactions?: Transaction[];
    partiesSummary?: PartySummaryItem[];
  } | null>(null);

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
        const matchesSearch = !query || 
                              txn.category.toLowerCase().includes(query) || 
                              txn.description?.toLowerCase().includes(query) ||
                              txn.partyName?.toLowerCase().includes(query) ||
                              txn.amount.toString().includes(query);
        const matchesParty = !selectedParty || txn.partyName?.trim().toLowerCase() === selectedParty.trim().toLowerCase();
        return matchesType && matchesSearch && matchesParty;
    }).sort((a, b) => b.date - a.date); // Newest first
  }, [transactions, filterType, searchQuery, selectedParty]);

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
  const groupedByParty: PartySummaryItem[] = useMemo(() => {
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
            count: data.txns.length
        }))
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)); // Sort by largest balance first
  }, [transactions, searchQuery]);

  const handlePartyClick = (partyName: string) => {
      setSelectedParty(partyName);
      setSearchQuery('');
      setViewMode('LIST');
      setFilterType('ALL');
  };

  // Open Print for a specific party
  const handlePrintPartyLedger = (partyName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const partyTxns = transactions.filter(t => t.partyName?.trim().toLowerCase() === partyName.trim().toLowerCase());
    setPrintConfig({
      isOpen: true,
      mode: 'PARTY',
      partyName,
      transactions: partyTxns
    });
  };

  // Open Print for all parties summary
  const handlePrintLedgerSummary = () => {
    setPrintConfig({
      isOpen: true,
      mode: 'LEDGER_SUMMARY',
      partiesSummary: groupedByParty
    });
  };

  // Open Print for current transaction list
  const handlePrintCurrentList = () => {
    if (selectedParty) {
      handlePrintPartyLedger(selectedParty);
    } else {
      setPrintConfig({
        isOpen: true,
        mode: 'ALL_TRANSACTIONS',
        transactions: filteredTransactions
      });
    }
  };

  return (
    <div className="p-4 space-y-4 pb-28 md:pb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm border border-zinc-200 hover:bg-zinc-50 transition-colors">
            <ChevronLeft size={20} className="text-zinc-600" />
          </button>
          <h2 className="text-2xl font-black tamil-font text-zinc-900 tracking-tight">
            {language === 'ta' ? 'கணக்கு & லெட்ஜர்' : 'Accounts & Ledger'}
          </h2>
        </div>

        {/* Global Top Print Button */}
        <button
          onClick={viewMode === 'LEDGER' ? handlePrintLedgerSummary : handlePrintCurrentList}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          title={language === 'ta' ? 'அறிக்கையை பிரிண்ட் செய்க' : 'Print Statement'}
        >
          <Printer size={16} />
          <span>{language === 'ta' ? 'பிரிண்ட்' : 'Print'}</span>
        </button>
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

      {/* Party Filter Banner (when a party is selected in List View) */}
      {viewMode === 'LIST' && selectedParty && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-xs">
              {selectedParty.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                {language === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட நபர் லெட்ஜர்' : 'Selected Party Ledger'}
              </p>
              <p className="font-black text-zinc-900 text-base">{selectedParty}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePrintPartyLedger(selectedParty)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Printer size={15} />
              <span>{language === 'ta' ? 'பிரிண்ட் லெட்ஜர்' : 'Print Ledger'}</span>
            </button>

            <button
              onClick={() => setSelectedParty(null)}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 bg-white hover:bg-zinc-100 rounded-lg transition border border-zinc-200 cursor-pointer"
              title={language === 'ta' ? 'அனைத்தும் காட்டு' : 'Clear filter'}
            >
              <XCircle size={18} />
            </button>
          </div>
        </div>
      )}

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

          {/* Filters & Action Bar */}
          <div className="flex items-center gap-2">
              {viewMode === 'LIST' ? (
                <>
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
                      onClick={handlePrintCurrentList}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer"
                      title={language === 'ta' ? 'அறிக்கையை பிரிண்ட் செய்க' : 'Print Statement'}
                  >
                      <Printer size={16} />
                      <span className="hidden sm:inline">{language === 'ta' ? 'பிரிண்ட்' : 'Print'}</span>
                  </button>
                </>
              ) : (
                <div className="flex-1 flex justify-between items-center bg-white p-2.5 rounded-xl border border-zinc-200 shadow-xs">
                  <div className="text-xs font-bold text-zinc-600 pl-1">
                    {groupedByParty.length} {language === 'ta' ? 'நபர்களின் லெட்ஜர் கணக்குகள்' : 'Party Ledger Accounts'}
                  </div>

                  <button
                    onClick={handlePrintLedgerSummary}
                    className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Printer size={15} />
                    <span>{language === 'ta' ? 'முழு லெட்ஜர் பிரிண்ட்' : 'Print All Ledger'}</span>
                  </button>
                </div>
              )}
          </div>
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
                                    onClick={() => {
                                      if (txn.partyName) {
                                        handlePrintPartyLedger(txn.partyName);
                                      }
                                    }}
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
                                 <p className="text-[11px] text-zinc-500 font-medium mt-0.5">{party.count} {language === 'ta' ? 'பரிவர்த்தனைகள்' : 'Entries'}</p>
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

                             {/* Dedicated Print Button on Party Card */}
                             <button
                               onClick={(e) => handlePrintPartyLedger(party.name, e)}
                               className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition active:scale-95 cursor-pointer shadow-xs"
                               title={language === 'ta' ? `${party.name} லெட்ஜர் பிரிண்ட்` : `Print ${party.name} Ledger`}
                             >
                               <Printer size={17} />
                             </button>

                             <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                         </div>
                    </div>
                 ))
             )}
             <p className="text-xs text-center text-zinc-400 p-4 tamil-font font-medium">
                 {language === 'ta' 
                    ? 'பெயரை கிளிக் செய்து விவரங்களை பார்க்கலாம் அல்லது பிரிண்ட் ஐகானை அழுத்தி லெட்ஜர் சீட்டை பிரிண்ட் செய்யலாம்.' 
                    : 'Tap a name to see transaction history or click the printer icon to print the ledger.'}
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

      {/* Ledger Print Preview Modal */}
      {printConfig?.isOpen && (
        <LedgerPrintModal
          mode={printConfig.mode}
          partyName={printConfig.partyName}
          transactions={printConfig.transactions}
          partiesSummary={printConfig.partiesSummary}
          language={language}
          onClose={() => setPrintConfig(null)}
        />
      )}
    </div>
  );
};

export default Accounting;

