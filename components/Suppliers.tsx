import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Supplier, Purchase, PurchaseItem, YarnEntry } from '../types';
import { YARN_TYPES, YARN_COLORS } from '../constants';
import { Plus, User as UserIcon, ArrowLeft, Calendar, FileText, IndianRupee, ShoppingCart, ChevronDown, ChevronUp, X, Printer, PieChart, ShoppingBag } from 'lucide-react';
import { useLongPress } from '../lib/hooks';
import html2pdf from 'html2pdf.js';

interface SupplierItemProps {
    supplier: Supplier;
    balance: number;
    language: 'ta' | 'en';
    onClick: () => void;
}

const SupplierItem: React.FC<SupplierItemProps> = ({ supplier, balance, language, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:shadow-md transition group"
        >
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-600 font-black text-lg group-hover:scale-110 transition-transform">
                    {supplier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-black text-gray-800 text-lg">{supplier.name}</h3>
                    {supplier.phone && <p className="text-xs font-bold text-gray-500">{supplier.phone}</p>}
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                    {language === 'ta' ? 'பேலன்ஸ்' : 'Balance'}
                </p>
                <p className={`font-black ${balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    ₹{Math.abs(balance).toFixed(2)}
                </p>
            </div>
        </div>
    );
};

interface SuppliersProps {
  user: User;
  language: 'ta' | 'en';
  onBack: () => void;
}

const Suppliers: React.FC<SuppliersProps> = ({ user, language, onBack }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [viewType, setViewType] = useState<'purchases' | 'balance' | 'overview'>('overview');

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newGst, setNewGst] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const isPopping = useRef(false);
  const statementRef = useRef<HTMLDivElement>(null);

  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [billNumber, setBillNumber] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([
    { type: 'YARN', name: '', weightKg: 0, quantity: 0, rate: 0, amount: 0 }
  ]);
  const [paidAmount, setPaidAmount] = useState('');
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);

  // Statement filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewStatement, setViewStatement] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 100);
    return () => clearTimeout(timer);
  }, [viewType, selectedSupplier, viewStatement, isAdding, isAddingPurchase]);

  // Sync sub-views with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isPopping.current = true;
      if (isAdding) { setIsAdding(false); }
      else if (isAddingPurchase) { setIsAddingPurchase(false); }
      else if (viewStatement) { setViewStatement(null); }
      else if (selectedSupplier) { 
        if (viewType !== 'overview') {
          setViewType('overview');
        } else {
          setSelectedSupplier(null); 
        }
      }
      
      setTimeout(() => {
        isPopping.current = false;
      }, 100);
    };

    const anySubViewOpen = isAdding || isAddingPurchase || viewStatement || selectedSupplier;
    if (anySubViewOpen && !window.history.state?.subview && !isPopping.current) {
      window.history.pushState({ subview: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdding, isAddingPurchase, viewStatement, selectedSupplier, viewType]);

  useEffect(() => {
    if (!selectedSupplier) {
      setViewType('overview');
    }
  }, [selectedSupplier]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewStatement, startDate, endDate]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [selectedSupplier, viewType, viewStatement, isAdding, isAddingPurchase]);

  const loadData = useCallback(() => {
    const savedSuppliers = localStorage.getItem(`viyabaari_suppliers_${user.uid || 'guest'}`);
    if (savedSuppliers) setSuppliers(JSON.parse(savedSuppliers));

    const savedPurchases = localStorage.getItem(`viyabaari_purchases_${user.uid || 'guest'}`);
    if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
  }, [user.uid]);

  useEffect(() => {
    loadData();
    window.addEventListener('local-storage-update', loadData);
    return () => window.removeEventListener('local-storage-update', loadData);
  }, [loadData]);

  const saveSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    localStorage.setItem(`viyabaari_suppliers_${user.uid || 'guest'}`, JSON.stringify(newSuppliers));
  };

  const savePurchases = (newPurchases: Purchase[]) => {
    setPurchases(newPurchases);
    localStorage.setItem(`viyabaari_purchases_${user.uid || 'guest'}`, JSON.stringify(newPurchases));
  };

  const handleAddSupplier = () => {
    if (!newName.trim()) {
      alert(language === 'ta' ? 'பெயரை உள்ளிடவும்' : 'Please enter a name');
      return;
    }
    const newSupplier: Supplier = {
        id: Date.now().toString(),
        name: newName,
        phone: newPhone,
        gst: newGst,
        address: newAddress,
        createdAt: Date.now()
    };
    saveSuppliers([...suppliers, newSupplier]);
    setNewName('');
    setNewPhone('');
    setNewGst('');
    setNewAddress('');
    setIsAdding(false);
  };

  const updatePurchaseItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...purchaseItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate amount
    if (field === 'weightKg' || field === 'quantity' || field === 'rate') {
      const item = newItems[index];
      const qty = item.type === 'YARN' ? (item.weightKg || 0) : (item.quantity || 0);
      item.amount = qty * (item.rate || 0);
    }
    
    setPurchaseItems(newItems);
  };

  const addPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, { type: 'YARN', name: '', weightKg: 0, quantity: 0, rate: 0, amount: 0 }]);
  };

  const handleAddPurchase = () => {
    if (!selectedSupplier || purchaseItems.length === 0) {
      alert(language === 'ta' ? 'அனைத்து விவரங்களையும் பூர்த்தி செய்யவும்' : 'Please fill all details');
      return;
    }
    
    // Validate purchase items
    const hasInvalidItems = purchaseItems.some(item => 
      (item.type === 'YARN' && isNaN(item.weightKg || 0)) ||
      (item.type !== 'YARN' && isNaN(item.quantity || 0)) ||
      isNaN(item.rate || 0)
    );

    const parsedPaid = paidAmount ? parseFloat(paidAmount) : 0;

    if (hasInvalidItems || (paidAmount && isNaN(parsedPaid))) {
      alert(language === 'ta' ? 'சரியான எண்களை உள்ளிடவும்' : 'Please enter valid numbers');
      return;
    }

    const totalAmount = purchaseItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const newPurchase: Purchase = {
      id: Date.now().toString(),
      supplierId: selectedSupplier.id,
      date: purchaseDate,
      billNumber,
      items: purchaseItems,
      totalAmount,
      paidAmount: parsedPaid,
      createdAt: Date.now()
    };
    
    savePurchases([...purchases, newPurchase]);
    
    // Add to Yarn Entries
    const savedEntries = localStorage.getItem(`viyabaari_yarn_entries_${user.uid || 'guest'}`);
    let currentEntries: YarnEntry[] = savedEntries ? JSON.parse(savedEntries) : [];
    
    const newYarnEntries: YarnEntry[] = [];
    purchaseItems.forEach((item, index) => {
      if (item.type === 'YARN' || item.type === 'ZARI' || item.type === 'OTHER') {
        const category = item.type === 'ZARI' ? 'zari' : item.type === 'OTHER' ? 'other' : (item.yarnCategory || 'warp');
        
        newYarnEntries.push({
          id: `${newPurchase.id}_${index}`,
          supplierId: selectedSupplier.id,
          yarnCategory: category as any,
          date: purchaseDate,
          yarnType: item.name,
          weightKg: item.type === 'YARN' ? (item.weightKg || 0) : (item.quantity || 0),
          color: item.color || '',
          receiptNumber: billNumber,
          createdAt: Date.now()
        });
      }
    });

    if (newYarnEntries.length > 0) {
      const updatedEntries = [...currentEntries, ...newYarnEntries];
      localStorage.setItem(`viyabaari_yarn_entries_${user.uid || 'guest'}`, JSON.stringify(updatedEntries));
    }

    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setBillNumber('');
    setPurchaseItems([{ type: 'YARN', name: '', weightKg: 0, quantity: 0, rate: 0, amount: 0 }]);
    setPaidAmount('');
    setIsAddingPurchase(false);
  };

  const downloadPDF = async () => {
    const supplier = suppliers.find(s => s.id === viewStatement);
    if (!supplier || !statementRef.current) return;

    let statementPurchases = purchases.filter(p => p.supplierId === supplier.id);
    if (startDate) statementPurchases = statementPurchases.filter(p => p.date >= startDate);
    if (endDate) statementPurchases = statementPurchases.filter(p => p.date <= endDate);

    const filename = `${supplier.name}_statement_${new Date().toISOString().split('T')[0]}.pdf`;
    const element = statementRef.current;

    const opt = {
      margin: [10, 10] as [number, number],
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
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF Error:', error);
      window.print();
    }
  };

  if (viewStatement) {
    const supplier = suppliers.find(s => s.id === viewStatement);
    if (!supplier) return null;

    let statementPurchases = purchases.filter(p => p.supplierId === supplier.id).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (startDate) {
      statementPurchases = statementPurchases.filter(p => p.date >= startDate);
    }
    if (endDate) {
      statementPurchases = statementPurchases.filter(p => p.date <= endDate);
    }

    const totalBilled = statementPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPaid = statementPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
    const balance = totalBilled - totalPaid;

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
            <button onClick={downloadPDF} className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-zinc-800 transition">
              <Printer size={18} /> {language === 'ta' ? 'டவுன்லோட் (PDF)' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm bg-white print:border-none print:p-0">
          <div ref={statementRef}>
            <div className="text-center mb-10 border-b-2 border-zinc-900 pb-8">
              <h1 className="text-3xl font-black text-zinc-900 mb-2 uppercase tracking-tight">{language === 'ta' ? 'சப்ளையர் கணக்கு அறிக்கை' : 'Supplier Account Statement'}</h1>
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-2xl font-black text-zinc-800">{supplier.name}</h2>
                {supplier.phone && <p className="text-zinc-500 font-bold flex items-center gap-1"><span className="opacity-50">#</span> {supplier.phone}</p>}
                {supplier.gst && <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-1">GST: {supplier.gst}</p>}
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
                    <th className="py-4 px-4 font-black text-[13px] text-right border border-zinc-900 uppercase tracking-wider">{language === 'ta' ? 'மொத்தம்' : 'Total'}</th>
                    <th className="py-4 px-4 font-black text-[13px] text-right border border-zinc-900 uppercase tracking-wider text-emerald-400 font-bold">{language === 'ta' ? 'வரவு' : 'Paid'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {statementPurchases.map((p, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/30'}>
                      <td className="py-4 px-4 text-zinc-800 font-black text-[13px] border border-zinc-100">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="py-4 px-4 border border-zinc-100">
                        <div className="space-y-1">
                          {p.items.map((item, i) => (
                            <div key={i} className="text-[13px] text-zinc-700 font-bold flex items-center gap-2">
                              {item.type === 'YARN' ? (
                                <>
                                  <span className="text-zinc-400 font-black">#</span>
                                  <span>{item.yarnType} {item.color} - {item.weightKg}kg @ ₹{item.rate}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-zinc-400 font-black">#</span>
                                  <span>{item.name} - {item.quantity} qty @ ₹{item.rate}</span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-black text-[15px] border border-zinc-100 italic">₹{p.totalAmount.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-black text-[15px] border border-zinc-100 text-emerald-600 font-bold">₹{p.paidAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {statementPurchases.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-400 font-black tracking-tight text-lg italic uppercase">
                        {language === 'ta' ? 'பதிவுகள் இல்லை' : 'No records found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pr-4">
              <div className="w-80 space-y-4 bg-zinc-900 p-8 rounded-[2rem] shadow-xl text-white">
                <div className="flex justify-between items-center text-zinc-400 font-black text-sm uppercase tracking-widest">
                  <span>{language === 'ta' ? 'மொத்தம்' : 'Purchases'}</span>
                  <span className="text-xl">₹{statementPurchases.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400 font-black text-sm uppercase tracking-widest">
                  <span>{language === 'ta' ? 'வழங்கியது' : 'Paid'}</span>
                  <span className="text-xl">₹{statementPurchases.reduce((sum, p) => sum + p.paidAmount, 0).toLocaleString()}</span>
                </div>
                <div className="h-px bg-white/10 my-2" />
                <div className="flex justify-between items-center text-2xl font-black italic tracking-tighter">
                  <span className="uppercase">{language === 'ta' ? 'பாக்கி' : 'Balance'}</span>
                  <span className={balance > 0 ? 'text-rose-400' : 'text-emerald-400'}>₹{balance.toLocaleString()}</span>
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

  if (selectedSupplier) {
    const supplierPurchases = purchases.filter(p => p.supplierId === selectedSupplier.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalBilled = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalPaid = supplierPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
    const balance = totalBilled - totalPaid;

    return (
      <div className={`p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-right-4 duration-300`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (viewType === 'overview') {
                    setSelectedSupplier(null);
                } else {
                    setViewType('overview');
                }
              }} 
              className="p-2 bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition print:hidden"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-black text-gray-800">{selectedSupplier.name}</h2>
              {selectedSupplier.phone && <p className="text-xs font-bold text-gray-500">{selectedSupplier.phone}</p>}
            </div>
          </div>
          <button 
            onClick={() => setViewStatement(selectedSupplier.id)}
            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 flex items-center gap-1 print:hidden"
          >
            <FileText size={14} /> {language === 'ta' ? 'அறிக்கை' : 'Statement'}
          </button>
        </div>

        {viewType === 'overview' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setViewType('balance')}
                className="p-6 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center gap-4 transition-all border border-sky-200 hover:shadow-md group bg-sky-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <PieChart size={32} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'கணக்கு' : 'Balance'}</span>
              </button>
              
              <button 
                onClick={() => setViewType('purchases')}
                className="p-6 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center gap-4 transition-all border border-indigo-200 hover:shadow-md group bg-indigo-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <ShoppingBag size={32} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'கொள்முதல்' : 'Purchases'}</span>
              </button>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm text-center">
                <p className="text-zinc-400 text-sm font-bold tamil-font mb-4">
                    {language === 'ta' ? 'விரைவான செயல்கள்' : 'Quick Actions'}
                </p>
                <div className="flex gap-3 justify-center">
                    <button 
                        onClick={() => setIsAddingPurchase(true)}
                        className="flex items-center gap-2 bg-sky-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-sky-700 shadow-lg shadow-sky-100"
                    >
                        <Plus size={18} /> {language === 'ta' ? 'புதிய கொள்முதல்' : 'New Purchase'}
                    </button>
                </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {viewType === 'balance' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500 font-bold mb-1">{language === 'ta' ? 'கொடுக்க வேண்டியது' : 'To Pay'}</p>
                <h3 className={`text-4xl font-black ${balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  ₹{Math.abs(balance).toFixed(2)}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-xs text-gray-500 font-bold mb-1">{language === 'ta' ? 'மொத்த பில்' : 'Total Billed'}</p>
                  <p className="font-black text-gray-800 text-xl">₹{totalBilled.toFixed(2)}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl">
                  <p className="text-xs text-emerald-600 font-bold mb-1">{language === 'ta' ? 'கொடுத்தது' : 'Paid'}</p>
                  <p className="font-black text-emerald-900 text-xl">₹{totalPaid.toFixed(2)}</p>
                </div>
              </div>
            </div>
            
            {selectedSupplier.gst && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-bold mb-1">GST Number</p>
                <p className="font-bold text-gray-800">{selectedSupplier.gst}</p>
              </div>
            )}
            {selectedSupplier.address && (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-bold mb-1">{language === 'ta' ? 'முகவரி' : 'Address'}</p>
                <p className="font-bold text-gray-800">{selectedSupplier.address}</p>
              </div>
            )}
          </div>
        )}

        {viewType === 'purchases' && (
          <>
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setIsAddingPurchase(true)}
                className="bg-zinc-600 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-md primary-btn"
              >
                <Plus size={14} /> {language === 'ta' ? 'புதிய கொள்முதல்' : 'New Purchase'}
              </button>
            </div>

            {isAddingPurchase && (
              <div className="bg-white p-5 rounded-3xl shadow-lg border border-zinc-100 mb-6 animate-in fade-in slide-in-from-top-4">
                <h3 className="font-black text-gray-800 mb-4">{language === 'ta' ? 'கொள்முதல் விவரம்' : 'Purchase Details'}</h3>
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="date" 
                      value={purchaseDate}
                      onChange={e => setPurchaseDate(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400"
                    />
                    <input 
                      type="text" 
                      placeholder={language === 'ta' ? 'பில் எண்' : 'Bill Number'}
                      value={billNumber}
                      onChange={e => setBillNumber(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400"
                    />
                  </div>
                  
                  <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-bold text-gray-500">{language === 'ta' ? 'பொருட்கள்' : 'Items'}</h4>
                    </div>
                    
                    {purchaseItems.map((item, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-gray-200 mb-2 relative">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <select 
                            value={item.type}
                            onChange={e => updatePurchaseItem(index, 'type', e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400"
                          >
                            <option value="YARN">{language === 'ta' ? 'நூல்' : 'Yarn'}</option>
                            <option value="ZARI">{language === 'ta' ? 'ஜரிகை' : 'Zari'}</option>
                            <option value="OTHER">{language === 'ta' ? 'மற்றவை' : 'Other'}</option>
                          </select>
                          
                          {item.type === 'YARN' ? (
                            <select 
                              value={item.yarnCategory || ''}
                              onChange={e => updatePurchaseItem(index, 'yarnCategory', e.target.value)}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400"
                            >
                              <option value="">{language === 'ta' ? 'நூல் வகை' : 'Category'}</option>
                              <option value="warp">{language === 'ta' ? 'பாவு நூல்' : 'Warp'}</option>
                              <option value="weft">{language === 'ta' ? 'ஊடை நூல்' : 'Weft'}</option>
                            </select>
                          ) : item.type === 'OTHER' ? (
                            <input 
                              type="text" 
                              placeholder={language === 'ta' ? 'பொருள் பெயர்' : 'Item Name'}
                              value={item.name}
                              onChange={e => updatePurchaseItem(index, 'name', e.target.value)}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400"
                            />
                          ) : (
                            <div className="hidden"></div>
                          )}
                        </div>
                        
                        {(item.type === 'YARN' || item.type === 'ZARI') && (
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <select 
                              value={item.name}
                              onChange={e => updatePurchaseItem(index, 'name', e.target.value)}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400"
                            >
                              <option value="">{language === 'ta' ? 'என்ன நூல்' : 'Yarn Type'}</option>
                              {YARN_TYPES.map(yt => (
                                <option key={yt} value={yt}>{yt}</option>
                              ))}
                            </select>
                            <select 
                              value={item.color || ''}
                              onChange={e => updatePurchaseItem(index, 'color', e.target.value)}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400"
                            >
                              <option value="">{language === 'ta' ? 'என்ன கலர்' : 'Color'}</option>
                              {YARN_COLORS.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-3 gap-2">
                          {item.type === 'YARN' ? (
                            <input 
                              type="number" 
                              placeholder="Kg"
                              value={item.weightKg || ''}
                              onChange={e => updatePurchaseItem(index, 'weightKg', parseFloat(e.target.value))}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400"
                            />
                          ) : (
                            <input 
                              type="number" 
                              placeholder="Qty"
                              value={item.quantity || ''}
                              onChange={e => updatePurchaseItem(index, 'quantity', parseFloat(e.target.value))}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400"
                            />
                          )}
                          <input 
                            type="number" 
                            placeholder={language === 'ta' ? 'விலை' : 'Rate'}
                            value={item.rate || ''}
                            onChange={e => updatePurchaseItem(index, 'rate', parseFloat(e.target.value))}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400"
                          />
                          <div className="flex items-center justify-end bg-gray-100 rounded-lg px-2 text-xs font-bold text-gray-700">
                            ₹{item.amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={addPurchaseItem} className="w-full py-2 border border-dashed border-zinc-300 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-50">
                      + {language === 'ta' ? 'பொருள் சேர்' : 'Add Item'}
                    </button>
                  </div>

                  <input 
                    type="number" 
                    placeholder={language === 'ta' ? 'கொடுத்த பணம் (₹)' : 'Paid Amount (₹)'}
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400"
                  />
                  
                  <div className="flex justify-between items-center bg-zinc-50 p-3 rounded-xl">
                    <span className="text-sm font-bold text-zinc-900">{language === 'ta' ? 'மொத்த தொகை:' : 'Total Amount:'}</span>
                    <span className="text-lg font-black text-zinc-700">₹{purchaseItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsAddingPurchase(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">
                    {language === 'ta' ? 'ரத்து' : 'Cancel'}
                  </button>
                  <button onClick={handleAddPurchase} className="flex-1 py-3 bg-zinc-600 text-white rounded-xl font-bold text-sm shadow-md primary-btn">
                    {language === 'ta' ? 'சேமி' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {supplierPurchases.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart size={32} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-bold tamil-font text-lg">
                    {language === 'ta' ? 'கொள்முதல் எதுவும் இல்லை' : 'No purchases yet'}
                  </p>
                </div>
              ) : (
                supplierPurchases.map(purchase => {
                  const isExpanded = expandedPurchaseId === purchase.id;
                  return (
                    <div key={purchase.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-50 transition"
                        onClick={() => setExpandedPurchaseId(isExpanded ? null : purchase.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-zinc-100 text-zinc-800 text-xs font-bold px-2 py-1 rounded-lg">
                              {new Date(purchase.date).toLocaleDateString()}
                            </span>
                            {purchase.billNumber && (
                              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                Bill: {purchase.billNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-end mt-3">
                          <div>
                            <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'பொருட்கள்' : 'Items'}: {purchase.items.length}</p>
                            <p className="font-bold text-gray-800 mt-1">₹{purchase.totalAmount.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'கொடுத்தது' : 'Paid'}</p>
                            <p className="font-bold text-emerald-600 mt-1">₹{purchase.paidAmount.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                          <h5 className="text-xs font-bold text-gray-500 mb-2">{language === 'ta' ? 'பொருள் விவரம்' : 'Item Details'}</h5>
                          <div className="space-y-2">
                            {purchase.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                                <div>
                                  <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {item.type === 'YARN' ? `${item.weightKg}kg` : `${item.quantity} qty`} @ ₹{item.rate}
                                  </p>
                                </div>
                                <p className="font-bold text-gray-800 text-sm">₹{item.amount.toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    )}
      </div>
    );
  }

  return (
    <div className={`p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition">
          <ArrowLeft size={20} className="text-zinc-600" />
        </button>
        <h2 className="text-2xl font-black text-gray-800 tracking-tight tamil-font">
          {language === 'ta' ? 'சப்ளையர்கள்' : 'Suppliers'}
        </h2>
      </div>

      <div className="flex justify-end mb-4">
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-sky-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-md hover:bg-sky-700 transition"
        >
          <Plus size={18} /> {language === 'ta' ? 'புதிய சப்ளையர்' : 'Add Supplier'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-3xl shadow-lg border border-zinc-200 mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-black text-gray-800 mb-4">{language === 'ta' ? 'புதிய சப்ளையர்' : 'New Supplier'}</h3>
          <div className="space-y-3 mb-4">
            <input 
              type="text" 
              placeholder={language === 'ta' ? 'பெயர்' : 'Name'}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400"
            />
            <input 
              type="tel" 
              placeholder={language === 'ta' ? 'போன் நம்பர் (விருப்பமானால்)' : 'Phone (Optional)'}
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400"
            />
            <input 
              type="text" 
              placeholder={language === 'ta' ? 'GST எண் (விருப்பமானால்)' : 'GST Number (Optional)'}
              value={newGst}
              onChange={e => setNewGst(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400"
            />
            <textarea 
              placeholder={language === 'ta' ? 'முகவரி (விருப்பமானால்)' : 'Address (Optional)'}
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400 resize-none h-20"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setIsAdding(false); setNewName(''); setNewPhone(''); setNewGst(''); setNewAddress(''); }} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">
              {language === 'ta' ? 'ரத்து' : 'Cancel'}
            </button>
            <button onClick={handleAddSupplier} className="flex-1 py-3 bg-sky-600 text-white rounded-xl font-bold text-sm shadow-md">
              {language === 'ta' ? 'சேமி' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {suppliers.length === 0 && !isAdding ? (
          <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold tamil-font text-lg">
              {language === 'ta' ? 'சப்ளையர்கள் யாரும் இல்லை' : 'No suppliers added yet'}
            </p>
          </div>
        ) : (
          suppliers.map(supplier => {
            const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id);
            const totalBilled = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
            const totalPaid = supplierPurchases.reduce((sum, p) => sum + p.paidAmount, 0);
            const balance = totalBilled - totalPaid;

            return (
              <SupplierItem 
                key={supplier.id}
                supplier={supplier}
                balance={balance}
                language={language}
                onClick={() => {
                    setSelectedSupplier(supplier);
                    setViewType('overview');
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default Suppliers;
