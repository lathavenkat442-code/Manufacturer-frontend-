import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, UserPlus, Phone, MapPin, Search, ShoppingBag, Plus, Printer, FileText, PieChart, X } from 'lucide-react';
import { User } from '../types';
import { useLongPress } from '../lib/hooks';
import html2pdf from 'html2pdf.js';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: number;
}

interface Purchase {
  id: string;
  customerId: string;
  date: string;
  items: string;
  amount: number;
  paid: number;
  createdAt: number;
}

interface CustomersProps {
  user: User;
  language: 'en' | 'ta';
  onBack: () => void;
}

interface CustomerItemProps {
    customer: Customer;
    balance: number;
    totalPurchases: number;
    totalPaid: number;
    language: 'ta' | 'en';
    onClick: () => void;
}

const CustomerItem: React.FC<CustomerItemProps> = ({ customer, balance, totalPurchases, totalPaid, language, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition"
        >
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{customer.name}</h3>
                        {customer.phone && (
                            <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                                <Phone size={14} />
                                <span>{customer.phone}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                        <p className="text-[10px] text-gray-500">{language === 'ta' ? 'மொத்தம்' : 'Total'}</p>
                        <p className="font-bold text-gray-700">₹{totalPurchases}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                        <p className="text-[10px] text-gray-500">{language === 'ta' ? 'வரவு' : 'Paid'}</p>
                        <p className="font-bold text-green-600">₹{totalPaid}</p>
                    </div>
                    <div className={`p-2 rounded-lg text-center ${balance > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                        <p className={`text-[10px] ${balance > 0 ? 'text-red-500' : 'text-gray-500'}`}>{language === 'ta' ? 'பாக்கி' : 'Balance'}</p>
                        <p className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-700'}`}>₹{balance}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Customers({ user, language, onBack }: CustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'purchases' | 'balance' | 'overview'>('overview');
  const [isAddingPurchase, setIsAddingPurchase] = useState(false);
  const isPopping = useRef(false);
  const statementRef = useRef<HTMLDivElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Purchase form state
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseItems, setPurchaseItems] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchasePaid, setPurchasePaid] = useState('');

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
  }, [viewType, selectedCustomer, viewStatement, isAdding, isAddingPurchase]);

  // Sync sub-views with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isPopping.current = true;
      if (isAdding) { setIsAdding(false); }
      else if (isAddingPurchase) { setIsAddingPurchase(false); }
      else if (viewStatement) { setViewStatement(null); }
      else if (selectedCustomer) { 
        if (viewType !== 'overview') {
          setViewType('overview');
        } else {
          setSelectedCustomer(null); 
        }
      }
      
      setTimeout(() => {
        isPopping.current = false;
      }, 100);
    };

    const anySubViewOpen = isAdding || isAddingPurchase || viewStatement || selectedCustomer;
    if (anySubViewOpen && !window.history.state?.subview && !isPopping.current) {
      window.history.pushState({ subview: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdding, isAddingPurchase, viewStatement, selectedCustomer, viewType]);

  useEffect(() => {
    if (!selectedCustomer) {
      setViewType('overview');
    }
  }, [selectedCustomer]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewStatement, startDate, endDate]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [selectedCustomer, viewType, viewStatement, isAdding, isAddingPurchase]);

  const loadData = useCallback(() => {
    const savedCustomers = localStorage.getItem(`viyabaari_customers_${user.uid || 'guest'}`);
    if (savedCustomers) setCustomers(JSON.parse(savedCustomers));

    const savedPurchases = localStorage.getItem(`viyabaari_invoices_${user.uid || 'guest'}`);
    if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
  }, [user.uid]);

  useEffect(() => {
    loadData();
    window.addEventListener('local-storage-update', loadData);
    return () => window.removeEventListener('local-storage-update', loadData);
  }, [loadData]);

  const saveCustomers = (newCustomers: Customer[]) => {
    setCustomers(newCustomers);
    localStorage.setItem(`viyabaari_customers_${user.uid || 'guest'}`, JSON.stringify(newCustomers));
  };

  const savePurchases = (newPurchases: Purchase[]) => {
    setPurchases(newPurchases);
    localStorage.setItem(`viyabaari_invoices_${user.uid || 'guest'}`, JSON.stringify(newPurchases));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert(language === 'ta' ? 'பெயரை உள்ளிடவும்' : 'Please enter a name');
      return;
    }

    const newCustomer: Customer = {
      id: Date.now().toString(),
      name,
      phone,
      address,
      notes,
      createdAt: Date.now()
    };
    saveCustomers([...customers, newCustomer]);

    resetForm();
  };

  const handleSavePurchase = () => {
    if (!selectedCustomer || !purchaseItems || !purchaseAmount) {
      alert(language === 'ta' ? 'அனைத்து விவரங்களையும் நிரப்பவும்' : 'Please fill all details');
      return;
    }

    const amount = parseFloat(purchaseAmount);
    const paid = purchasePaid ? parseFloat(purchasePaid) : 0;

    if (isNaN(amount) || isNaN(paid)) {
      alert(language === 'ta' ? 'சரியான தொகையை உள்ளிடவும்' : 'Please enter valid amounts');
      return;
    }

    const newPurchase: Purchase = {
      id: Date.now().toString(),
      customerId: selectedCustomer,
      date: purchaseDate,
      items: purchaseItems,
      amount: amount,
      paid: paid,
      createdAt: Date.now()
    };

    savePurchases([...purchases, newPurchase]);
    setIsAddingPurchase(false);
    setPurchaseItems('');
    setPurchaseAmount('');
    setPurchasePaid('');
  };

  const downloadPDF = async () => {
    const customer = customers.find(c => c.id === viewStatement);
    if (!customer || !statementRef.current) return;

    let statementPurchases = purchases.filter(p => p.customerId === customer.id);
    if (startDate) statementPurchases = statementPurchases.filter(p => p.date >= startDate);
    if (endDate) statementPurchases = statementPurchases.filter(p => p.date <= endDate);

    const filename = `${customer.name}_statement_${new Date().toISOString().split('T')[0]}.pdf`;
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

  const resetForm = () => {
    setIsAdding(false);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const activeCustomer = customers.find(c => c.id === selectedCustomer);

  if (activeCustomer) {
    const customerPurchases = purchases.filter(p => p.customerId === activeCustomer.id);
    const totalPurchases = customerPurchases.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = customerPurchases.reduce((sum, p) => sum + p.paid, 0);
    const balance = totalPurchases - totalPaid;

    return (
      <div className={`p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-right-4 duration-300`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (viewType === 'overview') {
                    setSelectedCustomer(null);
                } else {
                    setViewType('overview');
                }
              }} 
              className="p-2 bg-white rounded-full shadow-sm border border-zinc-200 hover:bg-zinc-50 transition-colors"
            >
              <ArrowLeft size={20} className="text-zinc-600" />
            </button>
            <div>
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{activeCustomer.name}</h2>
              {activeCustomer.phone && <p className="text-xs font-bold text-zinc-500 mt-0.5">{activeCustomer.phone}</p>}
            </div>
          </div>
          <button 
            onClick={() => setViewStatement(activeCustomer.id)}
            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 flex items-center gap-1"
          >
            <FileText size={14} /> {language === 'ta' ? 'அறிக்கை' : 'Statement'}
          </button>
        </div>

        {viewType === 'overview' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setViewType('balance')}
                className="p-6 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center gap-4 transition-all border border-teal-200 hover:shadow-md group bg-teal-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <PieChart size={32} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'இருப்பு' : 'Balance'}</span>
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
                        className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-teal-700 shadow-lg"
                    >
                        <Plus size={18} /> {language === 'ta' ? 'புதிய பதிவு' : 'Add Recording'}
                    </button>
                </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {viewType === 'balance' && (
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-zinc-100">
                  <div className="text-center mb-6">
                    <p className="text-sm text-zinc-500 font-bold mb-1">{language === 'ta' ? 'பாக்கி தொகை' : 'Balance Amount'}</p>
                    <h3 className={`text-4xl font-black ${balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      ₹{Math.abs(balance).toFixed(2)}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 p-4 rounded-2xl">
                      <p className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-wider">{language === 'ta' ? 'மொத்தம்' : 'Total'}</p>
                      <p className="font-black text-zinc-900 text-xl tracking-tight">₹{totalPurchases.toFixed(2)}</p>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-2xl">
                      <p className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-wider">{language === 'ta' ? 'வரவு' : 'Paid'}</p>
                      <p className="font-black text-emerald-600 text-xl tracking-tight">₹{totalPaid.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {viewType === 'purchases' && (
              <div className="space-y-4">
                {customerPurchases.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-zinc-200 shadow-sm">
                    <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
                      <ShoppingBag size={32} className="text-zinc-300" />
                    </div>
                    <p className="text-zinc-500 font-bold tamil-font text-lg">
                      {language === 'ta' ? 'கொள்முதல் விவரங்கள் இல்லை' : 'No purchases found'}
                    </p>
                  </div>
                ) : (
                  customerPurchases.map(purchase => (
                    <div key={purchase.id} className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs font-bold text-zinc-400 mb-1">{new Date(purchase.date).toLocaleDateString()}</p>
                          <p className="font-black text-zinc-800 tracking-tight">{purchase.items}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-zinc-900 text-lg">₹{purchase.amount}</p>
                          <p className="text-xs font-bold text-emerald-600 mt-1">{language === 'ta' ? 'வரவு: ' : 'Paid: '} ₹{purchase.paid}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {isAddingPurchase && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight tamil-font">{language === 'ta' ? 'புதிய பதிவு' : 'Add Recording'}</h3>
                  <button onClick={() => setIsAddingPurchase(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{language === 'ta' ? 'தேதி' : 'Date'}</label>
                      <input 
                        type="date" 
                        value={purchaseDate}
                        onChange={e => setPurchaseDate(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-zinc-100 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{language === 'ta' ? 'தொகை' : 'Amount'}</label>
                      <input 
                        type="number" 
                        value={purchaseAmount}
                        onChange={e => setPurchaseAmount(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-zinc-100 transition"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{language === 'ta' ? 'விவரம்' : 'Details'}</label>
                    <input 
                      type="text" 
                      value={purchaseItems}
                      onChange={e => setPurchaseItems(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-zinc-100 transition"
                      placeholder={language === 'ta' ? 'என்ன பொருள்?' : 'What items?'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{language === 'ta' ? 'வரவு (கொடுத்தது)' : 'Paid'}</label>
                    <input 
                      type="number" 
                      value={purchasePaid}
                      onChange={e => setPurchasePaid(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-50 transition font-black"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <button 
                    onClick={handleSavePurchase}
                    className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-zinc-800 transition primary-btn"
                  >
                    {language === 'ta' ? 'சேமி' : 'Save'}
                  </button>
                  <button onClick={() => setIsAddingPurchase(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black hover:bg-gray-200 transition">
                    {language === 'ta' ? 'ரத்து' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewStatement) {
    const customer = customers.find(c => c.id === viewStatement);
    if (!customer) return null;

    let statementPurchases = purchases.filter(p => p.customerId === customer.id);
    
    if (startDate) {
      statementPurchases = statementPurchases.filter(p => p.date >= startDate);
    }
    if (endDate) {
      statementPurchases = statementPurchases.filter(p => p.date <= endDate);
    }

    const totalPurchases = statementPurchases.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = statementPurchases.reduce((sum, p) => sum + p.paid, 0);
    const balance = totalPurchases - totalPaid;

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

        <div className="max-w-4xl mx-auto border border-zinc-100 rounded-[2.5rem] p-8 shadow-sm print:border-none print:p-0 bg-white">
          <div ref={statementRef} id="pdf-statement-content">
            <div className="text-center mb-10 border-b-2 border-zinc-900 pb-8">
              <h1 className="text-3xl font-black text-zinc-900 mb-2 uppercase tracking-tight">{language === 'ta' ? 'வாடிக்கையாளர் அறிக்கை' : 'Customer Account Statement'}</h1>
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-2xl font-black text-zinc-800">{customer.name}</h2>
                {customer.phone && <p className="text-zinc-500 font-bold flex items-center gap-1"><span className="opacity-50">#</span> {customer.phone}</p>}
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
                      <td className="py-4 px-4 text-zinc-800 font-black text-[14px] border border-zinc-100">{new Date(p.date).toLocaleDateString()}</td>
                      <td className="py-4 px-4 text-zinc-800 font-black text-[14px] border border-zinc-100">{p.items}</td>
                      <td className="py-4 px-4 text-right font-black text-[15px] border border-zinc-100 italic">₹{p.amount.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right font-black text-[15px] border border-zinc-100 text-emerald-600 font-bold">₹{p.paid.toLocaleString()}</td>
                    </tr>
                  ))}
                  {statementPurchases.length === 0 && (
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
                <div className="flex justify-between items-center text-zinc-400 font-black text-sm uppercase tracking-widest">
                  <span>{language === 'ta' ? 'மொத்தம்' : 'Purchases'}</span>
                  <span className="text-xl">₹{totalPurchases.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400 font-black text-sm uppercase tracking-widest">
                  <span>{language === 'ta' ? 'வழங்கியது' : 'Paid'}</span>
                  <span className="text-xl">₹{totalPaid.toLocaleString()}</span>
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

  return (
    <div className={`bg-gray-50 min-h-screen`}>
      <div className="bg-zinc-600 p-4 sticky top-0 z-10 shadow-md primary-btn">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-full transition text-white">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold tamil-font text-white">{language === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Customers'}</h1>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition text-white"
          >
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {isAdding ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 tamil-font">
              {language === 'ta' ? 'புதிய வாடிக்கையாளர்' : 'New Customer'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{language === 'ta' ? 'பெயர்' : 'Name'} *</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400"
                  placeholder={language === 'ta' ? 'வாடிக்கையாளர் பெயர்' : 'Customer Name'}
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{language === 'ta' ? 'போன் நம்பர்' : 'Phone Number'}</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400"
                  placeholder="9876543210"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{language === 'ta' ? 'முகவரி' : 'Address'}</label>
                <textarea 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400 min-h-[80px]"
                  placeholder={language === 'ta' ? 'முழு முகவரி' : 'Full Address'}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{language === 'ta' ? 'குறிப்புகள்' : 'Notes'}</label>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400 min-h-[80px]"
                  placeholder={language === 'ta' ? 'கூடுதல் விவரங்கள்' : 'Additional details'}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={resetForm}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50"
                >
                  {language === 'ta' ? 'ரத்து செய்' : 'Cancel'}
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-sm"
                >
                  {language === 'ta' ? 'சேமி' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mb-6">
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={language === 'ta' ? 'பெயர் அல்லது போன் நம்பர் தேட...' : 'Search by name or phone...'}
                className="w-full p-3 pl-10 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400 shadow-sm"
              />
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            </div>

            {customers.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserPlus className="text-gray-400" size={24} />
                </div>
                <p className="text-gray-500 font-medium tamil-font">
                  {language === 'ta' ? 'வாடிக்கையாளர்கள் இல்லை' : 'No customers found'}
                </p>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="mt-4 text-zinc-600 font-bold text-sm hover:underline"
                >
                  {language === 'ta' ? '+ புதிய வாடிக்கையாளர்' : '+ Add New Customer'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCustomers.map(customer => {
                  const customerPurchases = purchases.filter(p => p.customerId === customer.id);
                  const totalPurchases = customerPurchases.reduce((sum, p) => sum + p.amount, 0);
                  const totalPaid = customerPurchases.reduce((sum, p) => sum + p.paid, 0);
                  const balance = totalPurchases - totalPaid;
                  const isExpanded = selectedCustomer === customer.id;

                  return (
                    <div key={customer.id}>
                        <CustomerItem 
                            customer={customer}
                            balance={balance}
                            totalPurchases={totalPurchases}
                            totalPaid={totalPaid}
                            language={language}
                            onClick={() => {
                                setSelectedCustomer(customer.id);
                                setViewType('overview');
                            }}
                        />

                        {isExpanded && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl -mt-2 mb-4">
                            {customer.address && (
                                <div className="flex items-start gap-2 text-sm text-gray-600 mb-3 bg-white p-3 rounded-xl border border-gray-100">
                                <MapPin size={16} className="mt-0.5 text-gray-400 shrink-0" />
                                <p>{customer.address}</p>
                                </div>
                            )}
                            
                            {customer.notes && (
                                <div className="text-sm text-gray-600 mb-4 bg-white p-3 rounded-xl border border-gray-100">
                                <p className="font-bold text-xs text-gray-400 mb-1">{language === 'ta' ? 'குறிப்புகள்' : 'Notes'}</p>
                                <p>{customer.notes}</p>
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-1">
                                <ShoppingBag size={16} className="text-zinc-500" />
                                {language === 'ta' ? 'கொள்முதல் வரலாறு' : 'Purchase History'}
                                </h4>
                                <div className="flex gap-2">
                                <button 
                                    onClick={() => setViewStatement(customer.id)}
                                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 flex items-center gap-1"
                                >
                                    <FileText size={14} /> {language === 'ta' ? 'அறிக்கை' : 'Statement'}
                                </button>
                                <button 
                                    onClick={() => setIsAddingPurchase(true)}
                                    className="text-xs font-bold text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-full hover:bg-zinc-100 flex items-center gap-1"
                                >
                                    <Plus size={14} /> {language === 'ta' ? 'புதிய பதிவு' : 'Add Record'}
                                </button>
                                </div>
                            </div>

                            {isAddingPurchase && (
                                <div className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm mb-4">
                                <h5 className="text-sm font-bold text-gray-700 mb-3">{language === 'ta' ? 'புதிய கொள்முதல்' : 'New Purchase'}</h5>
                                <div className="space-y-3">
                                    <input 
                                    type="date" 
                                    value={purchaseDate}
                                    onChange={e => setPurchaseDate(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                                    />
                                    <input 
                                    type="text" 
                                    placeholder={language === 'ta' ? 'பொருட்கள் விவரம்' : 'Items Description'}
                                    value={purchaseItems}
                                    onChange={e => setPurchaseItems(e.target.value)}
                                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                    <input 
                                        type="number" 
                                        placeholder={language === 'ta' ? 'மொத்த தொகை' : 'Total Amount'}
                                        value={purchaseAmount}
                                        onChange={e => setPurchaseAmount(e.target.value)}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                                    />
                                    <input 
                                        type="number" 
                                        placeholder={language === 'ta' ? 'வரவு' : 'Paid Amount'}
                                        value={purchasePaid}
                                        onChange={e => setPurchasePaid(e.target.value)}
                                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                                    />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                    <button 
                                        onClick={() => setIsAddingPurchase(false)}
                                        className="flex-1 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg text-sm hover:bg-gray-50"
                                    >
                                        {language === 'ta' ? 'ரத்து' : 'Cancel'}
                                    </button>
                                    <button 
                                        onClick={handleSavePurchase}
                                        className="flex-1 py-2 bg-zinc-600 text-white font-bold rounded-lg text-sm hover:bg-zinc-700"
                                    >
                                        {language === 'ta' ? 'சேமி' : 'Save'}
                                    </button>
                                    </div>
                                </div>
                                </div>
                            )}

                            {customerPurchases.length === 0 ? (
                                <p className="text-center text-xs text-gray-400 py-4 bg-white rounded-xl border border-gray-100">
                                {language === 'ta' ? 'பதிவுகள் இல்லை' : 'No records'}
                                </p>
                            ) : (
                                <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
                                <table className="w-full text-left text-xs">
                                    <thead className="text-gray-500 bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-2 font-bold">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                                        <th className="p-2 font-bold">{language === 'ta' ? 'பொருட்கள்' : 'Items'}</th>
                                        <th className="p-2 font-bold">{language === 'ta' ? 'மொத்தம்' : 'Amount'}</th>
                                        <th className="p-2 font-bold">{language === 'ta' ? 'வரவு' : 'Paid'}</th>
                                        <th className="p-2 font-bold">{language === 'ta' ? 'பாக்கி' : 'Bal'}</th>
                                        <th className="p-2"></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {customerPurchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(purchase => {
                                        const bal = purchase.amount - purchase.paid;
                                        return (
                                        <tr key={purchase.id} className="border-b border-gray-50 last:border-0">
                                            <td className="p-2 text-gray-600">{new Date(purchase.date).toLocaleDateString()}</td>
                                            <td className="p-2 font-medium text-gray-800">{purchase.items}</td>
                                            <td className="p-2 font-bold text-gray-800">₹{purchase.amount}</td>
                                            <td className="p-2 font-bold text-green-600">₹{purchase.paid}</td>
                                            <td className={`p-2 font-bold ${bal > 0 ? 'text-red-500' : 'text-gray-800'}`}>₹{bal}</td>
                                            <td className="p-2"></td>
                                        </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                                </div>
                            )}
                            </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
