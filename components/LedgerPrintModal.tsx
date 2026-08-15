import React, { useRef, useEffect } from 'react';
import { Transaction, CompanyProfile } from '../types';
import { Printer, Download, Share2, X, FileText, ArrowLeft, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { shareText } from '../lib/utils';
import html2pdf from 'html2pdf.js';

export interface PartySummaryItem {
  name: string;
  income: number;
  expense: number;
  balance: number;
  count: number;
}

interface LedgerPrintModalProps {
  mode: 'PARTY' | 'ALL_TRANSACTIONS' | 'LEDGER_SUMMARY';
  partyName?: string;
  transactions?: Transaction[];
  partiesSummary?: PartySummaryItem[];
  language?: 'ta' | 'en';
  onClose: () => void;
}

export const LedgerPrintModal: React.FC<LedgerPrintModalProps> = ({
  mode,
  partyName,
  transactions = [],
  partiesSummary = [],
  language = 'ta',
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Handle hardware / browser back button and ESC key
  useEffect(() => {
    window.history.pushState({ modal: 'ledger_print', subview: true }, '');

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

  // Calculate Running Balances for transactions mode
  // Sort oldest first for chronological running balance calculation
  const sortedAsc = [...transactions].sort((a, b) => a.date - b.date);
  let runningBalance = 0;
  const transactionsWithBalance = sortedAsc.map(txn => {
    if (txn.type === 'INCOME') runningBalance += txn.amount;
    else runningBalance -= txn.amount;
    return { ...txn, runningBalance };
  });

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((a, b) => a + b.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Summary for all parties mode
  const allPartiesTotalIncome = partiesSummary.reduce((a, b) => a + b.income, 0);
  const allPartiesTotalExpense = partiesSummary.reduce((a, b) => a + b.expense, 0);
  const allPartiesNetBalance = allPartiesTotalIncome - allPartiesTotalExpense;

  const formattedDate = new Date().toLocaleDateString('ta-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const titleText = mode === 'PARTY' 
    ? (language === 'ta' ? `${partyName} - லெட்ஜர் அறிக்கை` : `${partyName} - Ledger Statement`)
    : mode === 'LEDGER_SUMMARY'
    ? (language === 'ta' ? 'முழு லெட்ஜர் சுருக்க அறிக்கை' : 'All Parties Ledger Summary')
    : (language === 'ta' ? 'கணக்கு அறிக்கை' : 'Account Statement');

  const badgeText = mode === 'PARTY'
    ? (language === 'ta' ? 'லெட்ஜர் பேரேடு அறிக்கை' : 'PARTY LEDGER STATEMENT')
    : mode === 'LEDGER_SUMMARY'
    ? (language === 'ta' ? 'லெட்ஜர் சுருக்கம்' : 'LEDGER SUMMARY')
    : (language === 'ta' ? 'பரிவர்த்தனை அறிக்கை' : 'TRANSACTION STATEMENT');

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    const cleanName = (partyName || 'ledger').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanName}_statement_${new Date().toISOString().split('T')[0]}.pdf`;

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

  // Share text handler
  const handleShare = () => {
    let text = `*${companyProfile.tamilName || companyProfile.name || 'VIYABAARAM'}*\n`;
    if (companyProfile.gstin) text += `GST: ${companyProfile.gstin} | `;
    if (companyProfile.phone) text += `Phone: ${companyProfile.phone}\n`;
    text += `--------------------------------\n`;
    text += `*${titleText}*\n`;
    text += `*${language === 'ta' ? 'தேதி' : 'Date'}:* ${formattedDate}\n`;

    if (mode === 'PARTY') {
      text += `*${language === 'ta' ? 'நபர் / நிறுவனம்' : 'Party'}:* ${partyName}\n`;
      text += `*${language === 'ta' ? 'மொத்த வரவு' : 'Total Income'}:* ₹${totalIncome.toLocaleString()}\n`;
      text += `*${language === 'ta' ? 'மொத்த செலவு' : 'Total Expense'}:* ₹${totalExpense.toLocaleString()}\n`;
      text += `*${language === 'ta' ? 'நிகர மீதம்' : 'Net Balance'}:* ₹${netBalance.toLocaleString()}\n`;
      text += `--------------------------------\n`;
      transactionsWithBalance.forEach((t, idx) => {
        const d = new Date(t.date).toLocaleDateString('ta-IN');
        const typ = t.type === 'INCOME' ? `+₹${t.amount}` : `-₹${t.amount}`;
        text += `${idx + 1}. ${d} | ${t.category} | ${typ} | Bal: ₹${t.runningBalance.toLocaleString()}\n`;
      });
    } else if (mode === 'LEDGER_SUMMARY') {
      text += `*${language === 'ta' ? 'மொத்த நபர்கள்' : 'Total Parties'}:* ${partiesSummary.length}\n`;
      text += `*${language === 'ta' ? 'மொத்த வரவு' : 'Total Income'}:* ₹${allPartiesTotalIncome.toLocaleString()}\n`;
      text += `*${language === 'ta' ? 'மொத்த செலவு' : 'Total Expense'}:* ₹${allPartiesTotalExpense.toLocaleString()}\n`;
      text += `*${language === 'ta' ? 'நிகர மீதம்' : 'Net Balance'}:* ₹${allPartiesNetBalance.toLocaleString()}\n`;
      text += `--------------------------------\n`;
      partiesSummary.forEach((p, idx) => {
        text += `${idx + 1}. *${p.name}*: வரவு ₹${p.income.toLocaleString()} | செலவு ₹${p.expense.toLocaleString()} | மீதம்: ₹${p.balance.toLocaleString()}\n`;
      });
    } else {
      text += `*${language === 'ta' ? 'மொத்த வரவு' : 'Total Income'}:* ₹${totalIncome.toLocaleString()}\n`;
      text += `*${language === 'ta' ? 'மொத்த செலவு' : 'Total Expense'}:* ₹${totalExpense.toLocaleString()}\n`;
      text += `*${language === 'ta' ? 'நிகர மீதம்' : 'Net Balance'}:* ₹${netBalance.toLocaleString()}\n`;
    }
    
    shareText(text);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 print:p-0 print:bg-white animate-in fade-in duration-200">
      
      {/* Main Container */}
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none print:w-full border border-zinc-200">
        
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
              <FileText size={18} className="text-emerald-400" />
              <h3 className="font-bold text-sm tracking-tight text-zinc-100 truncate max-w-[260px]">
                {titleText}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow transition active:scale-95 cursor-pointer"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">{language === 'ta' ? 'பிரிண்ட்' : 'Print'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow transition active:scale-95 cursor-pointer"
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
            id="ledger-print-document"
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
                    {badgeText}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Key Details & Financial Summary Card */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 mb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {mode === 'PARTY' && (
                  <div className="col-span-2 bg-white p-2.5 rounded-lg border border-zinc-200">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{language === 'ta' ? 'நபர் / வாடிக்கையாளர் பெயர்' : 'Party / Customer Name'}</p>
                    <p className="text-base font-black text-zinc-900 truncate mt-0.5">{partyName}</p>
                  </div>
                )}
                <div className={`${mode === 'PARTY' ? 'col-span-2' : 'col-span-2 sm:col-span-4'} bg-white p-2.5 rounded-lg border border-zinc-200 flex justify-between items-center`}>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{language === 'ta' ? 'அறிக்கை தேதி' : 'Statement Date'}</p>
                    <p className="text-sm font-black text-zinc-900 mt-0.5">{formattedDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{language === 'ta' ? 'மொத்த பதிவுகள்' : 'Total Entries'}</p>
                    <p className="text-sm font-black text-zinc-900 mt-0.5">
                      {mode === 'LEDGER_SUMMARY' ? partiesSummary.length : transactions.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Totals Row */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3">
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">{language === 'ta' ? 'மொத்த வரவு' : 'Total Income'}</p>
                  <p className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
                    ₹{(mode === 'LEDGER_SUMMARY' ? allPartiesTotalIncome : totalIncome).toLocaleString()}
                  </p>
                </div>

                <div className="bg-rose-50/80 border border-rose-200 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">{language === 'ta' ? 'மொத்த செலவு' : 'Total Expense'}</p>
                  <p className="text-sm sm:text-base font-black text-rose-700 mt-0.5">
                    ₹{(mode === 'LEDGER_SUMMARY' ? allPartiesTotalExpense : totalExpense).toLocaleString()}
                  </p>
                </div>

                <div className={`border rounded-lg p-2.5 text-center ${
                  (mode === 'LEDGER_SUMMARY' ? allPartiesNetBalance : netBalance) >= 0 
                    ? 'bg-zinc-100 border-zinc-300' 
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">{language === 'ta' ? 'நிகர மீதம்' : 'Net Balance'}</p>
                  <p className={`text-sm sm:text-base font-black mt-0.5 ${
                    (mode === 'LEDGER_SUMMARY' ? allPartiesNetBalance : netBalance) > 0 
                      ? 'text-emerald-700' 
                      : (mode === 'LEDGER_SUMMARY' ? allPartiesNetBalance : netBalance) < 0 
                      ? 'text-rose-700' 
                      : 'text-zinc-800'
                  }`}>
                    {(mode === 'LEDGER_SUMMARY' ? allPartiesNetBalance : netBalance) > 0 ? '+' : ''}
                    ₹{(mode === 'LEDGER_SUMMARY' ? allPartiesNetBalance : netBalance).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Detailed Data Table */}
            {mode === 'LEDGER_SUMMARY' ? (
              /* All Parties Summary Table */
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-xs uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-zinc-900 rounded-xs"></span>
                    {language === 'ta' ? 'நபர்கள் வாரியான லெட்ஜர் பட்டியல்' : 'Party-wise Ledger List'}
                  </h3>
                  <span className="text-[11px] font-bold text-zinc-500">
                    {partiesSummary.length} {language === 'ta' ? 'நபர்கள்' : 'parties'}
                  </span>
                </div>

                <div className="overflow-x-auto border border-zinc-300 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-800 font-black">
                        <th className="py-2 px-2.5 text-center w-10 border-r border-zinc-200">{language === 'ta' ? 'வ.எண்' : 'S.No'}</th>
                        <th className="py-2 px-3 border-r border-zinc-200">{language === 'ta' ? 'நபர் / நிறுவனம்' : 'Party Name'}</th>
                        <th className="py-2 px-2.5 text-center border-r border-zinc-200">{language === 'ta' ? 'பதிவுகள்' : 'Entries'}</th>
                        <th className="py-2 px-2.5 text-right border-r border-zinc-200 bg-emerald-50/40 text-emerald-900">{language === 'ta' ? 'வரவு (₹)' : 'Income (₹)'}</th>
                        <th className="py-2 px-2.5 text-right border-r border-zinc-200 bg-rose-50/40 text-rose-900">{language === 'ta' ? 'செலவு (₹)' : 'Expense (₹)'}</th>
                        <th className="py-2 px-2.5 text-right">{language === 'ta' ? 'நிகர மீதம் (₹)' : 'Balance (₹)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partiesSummary.map((party, idx) => (
                        <tr key={idx} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50 font-medium">
                          <td className="py-2 px-2.5 text-center font-bold text-zinc-600 border-r border-zinc-200">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-zinc-900 border-r border-zinc-200">{party.name}</td>
                          <td className="py-2 px-2.5 text-center font-semibold text-zinc-600 border-r border-zinc-200">{party.count}</td>
                          <td className="py-2 px-2.5 text-right font-black text-emerald-700 border-r border-zinc-200 bg-emerald-50/20">
                            {party.income > 0 ? `₹${party.income.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-black text-rose-700 border-r border-zinc-200 bg-rose-50/20">
                            {party.expense > 0 ? `₹${party.expense.toLocaleString()}` : '-'}
                          </td>
                          <td className={`py-2 px-2.5 text-right font-black ${
                            party.balance > 0 ? 'text-emerald-700' : party.balance < 0 ? 'text-rose-700' : 'text-zinc-500'
                          }`}>
                            {party.balance > 0 ? '+' : ''} ₹{party.balance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-100 border-t-2 border-zinc-400 font-black text-zinc-900">
                        <td colSpan={2} className="py-2.5 px-3 text-right uppercase border-r border-zinc-200">
                          {language === 'ta' ? 'மொத்தம் (Total)' : 'Total'}:
                        </td>
                        <td className="py-2.5 px-2.5 text-center border-r border-zinc-200">
                          {partiesSummary.reduce((a, b) => a + b.count, 0)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right border-r border-zinc-200 text-emerald-800 bg-emerald-50/60">
                          ₹{allPartiesTotalIncome.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2.5 text-right border-r border-zinc-200 text-rose-800 bg-rose-50/60">
                          ₹{allPartiesTotalExpense.toLocaleString()}
                        </td>
                        <td className={`py-2.5 px-2.5 text-right font-black ${
                          allPartiesNetBalance > 0 ? 'text-emerald-800' : allPartiesNetBalance < 0 ? 'text-rose-800' : 'text-zinc-900'
                        }`}>
                          {allPartiesNetBalance > 0 ? '+' : ''} ₹{allPartiesNetBalance.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* Transaction Entries Table (Party or All Transactions) */
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-xs uppercase tracking-wider text-zinc-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-zinc-900 rounded-xs"></span>
                    {language === 'ta' ? 'பரிவர்த்தனை விவரங்கள் (Entries)' : 'Transaction Entries'}
                  </h3>
                  <span className="text-[11px] font-bold text-zinc-500">
                    {transactionsWithBalance.length} {language === 'ta' ? 'பதிவுகள்' : 'entries'}
                  </span>
                </div>

                <div className="overflow-x-auto border border-zinc-300 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-800 font-black">
                        <th className="py-2 px-2 text-center w-8 border-r border-zinc-200">{language === 'ta' ? 'வ.எண்' : 'S.No'}</th>
                        <th className="py-2 px-2.5 border-r border-zinc-200">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                        {mode !== 'PARTY' && (
                          <th className="py-2 px-2.5 border-r border-zinc-200">{language === 'ta' ? 'பெயர்' : 'Party'}</th>
                        )}
                        <th className="py-2 px-2.5 border-r border-zinc-200">{language === 'ta' ? 'வகை' : 'Category'}</th>
                        <th className="py-2 px-3 border-r border-zinc-200">{language === 'ta' ? 'குறிப்பு' : 'Description'}</th>
                        <th className="py-2 px-2.5 text-right border-r border-zinc-200 bg-emerald-50/40 text-emerald-900">{language === 'ta' ? 'வரவு (₹)' : 'Income (₹)'}</th>
                        <th className="py-2 px-2.5 text-right border-r border-zinc-200 bg-rose-50/40 text-rose-900">{language === 'ta' ? 'செலவு (₹)' : 'Expense (₹)'}</th>
                        <th className="py-2 px-2.5 text-right">{language === 'ta' ? 'மீதம் (₹)' : 'Balance (₹)'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionsWithBalance.map((txn, idx) => (
                        <tr key={idx} className="border-b border-zinc-200 last:border-0 hover:bg-zinc-50 font-medium">
                          <td className="py-2 px-2 text-center font-bold text-zinc-600 border-r border-zinc-200">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-bold text-zinc-800 border-r border-zinc-200 whitespace-nowrap">
                            {new Date(txn.date).toLocaleDateString('ta-IN')}
                          </td>
                          {mode !== 'PARTY' && (
                            <td className="py-2 px-2.5 font-bold text-zinc-900 border-r border-zinc-200">
                              {txn.partyName || '-'}
                            </td>
                          )}
                          <td className="py-2 px-2.5 font-semibold text-zinc-800 border-r border-zinc-200">
                            {txn.category}
                          </td>
                          <td className="py-2 px-3 text-zinc-600 italic border-r border-zinc-200">
                            {txn.description || '-'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-black text-emerald-700 border-r border-zinc-200 bg-emerald-50/20">
                            {txn.type === 'INCOME' ? `₹${txn.amount.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-black text-rose-700 border-r border-zinc-200 bg-rose-50/20">
                            {txn.type === 'EXPENSE' ? `₹${txn.amount.toLocaleString()}` : '-'}
                          </td>
                          <td className={`py-2 px-2.5 text-right font-black ${
                            txn.runningBalance > 0 ? 'text-emerald-700' : txn.runningBalance < 0 ? 'text-rose-700' : 'text-zinc-800'
                          }`}>
                            ₹{txn.runningBalance.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-100 border-t-2 border-zinc-400 font-black text-zinc-900">
                        <td colSpan={mode !== 'PARTY' ? 4 : 3} className="py-2.5 px-3 text-right uppercase border-r border-zinc-200">
                          {language === 'ta' ? 'மொத்தம் (Total)' : 'Total'}:
                        </td>
                        <td className="py-2.5 px-3 border-r border-zinc-200 text-zinc-500 font-bold text-[11px]">
                          {transactionsWithBalance.length} {language === 'ta' ? 'பதிவுகள்' : 'entries'}
                        </td>
                        <td className="py-2.5 px-2.5 text-right border-r border-zinc-200 text-emerald-800 bg-emerald-50/60">
                          ₹{totalIncome.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2.5 text-right border-r border-zinc-200 text-rose-800 bg-rose-50/60">
                          ₹{totalExpense.toLocaleString()}
                        </td>
                        <td className={`py-2.5 px-2.5 text-right font-black ${
                          netBalance > 0 ? 'text-emerald-800' : netBalance < 0 ? 'text-rose-800' : 'text-zinc-900'
                        }`}>
                          {netBalance > 0 ? '+' : ''} ₹{netBalance.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Footer Signatures & Stamp */}
            <div className="mt-10 pt-4 border-t border-zinc-300 grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="h-10"></div>
                <div className="border-t border-dashed border-zinc-400 pt-1.5 font-black text-xs text-zinc-700">
                  {mode === 'PARTY' ? (language === 'ta' ? 'வாடிக்கையாளர் / நபர் கையொப்பம்' : 'Party Signature') : (language === 'ta' ? 'கணக்காளர் கையொப்பம்' : 'Accountant Signature')}
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
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow transition active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              <span>{language === 'ta' ? 'பிரிண்ட்' : 'Print'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm shadow transition active:scale-95 cursor-pointer"
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
