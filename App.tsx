
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StockItem, Transaction, User, TransactionType, SizeStock, StockVariant } from './types';
import { TRANSLATIONS, CATEGORIES, PREDEFINED_COLORS, SHIRT_SIZES } from './constants';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Accounting from './components/Accounting';
import Profile from './components/Profile';
import Weavers from './components/Weavers';
import Warpers from './components/Warpers';
import DeliveryBooks from './components/DeliveryBooks';
import YarnsAccounts from './components/YarnsAccounts';
import AllYarnsAccounts from './components/AllYarnsAccounts';
import Suppliers from './components/Suppliers';
import Customers from './components/Customers';
import Billing from './components/Billing';
import { supabase, isSupabaseConfigured, saveSupabaseConfig } from './supabaseClient';
import { syncToSupabase, fetchFromSupabase, getSyncQueue, clearSyncQueue, addToSyncQueue, SyncAction, deleteFromSupabase, saveDataAndSync, deleteDataAndSync } from './lib/supabaseSync';
import { getContrastColor } from './lib/utils';
import { useConfirm } from './context/ConfirmContext';
import { 
  LayoutDashboard, Package, ArrowLeftRight, User as UserIcon, PlusCircle, X, Camera, Trash2, Palette, ChevronDown, RefreshCw, Database, Loader2, WifiOff, CheckCircle2, AlertTriangle, BookOpen, Users, Sun, Moon, FileText, FileDown
} from 'lucide-react';

// Global override to detect localStorage changes and trigger sync
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  const oldValue = localStorage.getItem(key);
  originalSetItem.apply(this, arguments as any);
  if (key.startsWith('viyabaari_') && oldValue !== value) {
    window.dispatchEvent(new CustomEvent('local-storage-update'));
  }
};

const EXPENSE_CATEGORIES = ['Salary', 'Rent', 'Tea/Snacks', 'Transport', 'Purchase', 'Sales', 'Electricity', 'Maintenance', 'Others'];

const APP_VERSION = '1.0.3'; // Increment this to force cache refresh/data check

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Crash:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle size={64} className="text-rose-500 mb-6 animate-bounce" />
          <h1 className="text-2xl font-black text-white mb-4 tamil-font">மன்னிக்கவும், ஒரு பிழை ஏற்பட்டுள்ளது.</h1>
          <p className="text-zinc-400 mb-8 max-w-sm">பழைய டேட்டா அல்லது புதிய அப்டேட் காரணமாக இந்த பிரச்சனை இருக்கலாம். கீழே உள்ள பட்டனை அழுத்தி ஆப்பை ரீசெட் செய்யவும்.</p>
          <div className="space-y-4 w-full max-w-xs">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-800 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-zinc-700 transition flex items-center justify-center gap-2"
            >
              <RefreshCw size={20} /> மீண்டும் முயற்சிக்கவும் (Retry)
            </button>
            <button 
              onClick={() => {
                if (window.confirm('அனைத்து லோக்கல் டேட்டாவும் அழிக்கப்படும். தொடரவா?')) {
                  const theme = localStorage.getItem('viyabaari_theme');
                  const lang = localStorage.getItem('viyabaari_lang');
                  localStorage.clear();
                  if (theme) localStorage.setItem('viyabaari_theme', theme);
                  if (lang) localStorage.setItem('viyabaari_lang', lang);
                  window.location.reload();
                }
              }}
              className="w-full bg-rose-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-rose-700 transition"
            >
              ஆப்பை ரீசெட் செய்க (Reset App)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Toast: React.FC<{ message: string; show: boolean; onClose: () => void; isError?: boolean }> = ({ message, show, onClose, isError }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);
    if (!show) return null;
    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-500">
            <div className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border backdrop-blur-md ${isError ? 'bg-red-600 border-red-500 text-white' : 'bg-green-600 border-green-500 text-white'}`}>
                {isError ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                <span className="font-bold text-sm tamil-font whitespace-nowrap">{message}</span>
            </div>
        </div>
    );
};

const DatabaseConfigModal: React.FC<{ onClose: () => void; language: 'ta' | 'en' }> = ({ onClose, language }) => {
    const [setupUrl, setSetupUrl] = useState(localStorage.getItem('viyabaari_supabase_url') || '');
    const [setupKey, setSetupKey] = useState(localStorage.getItem('viyabaari_supabase_key') || '');
    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        saveSupabaseConfig(setupUrl, setupKey);
    };
    return (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
                <div className="text-center mb-6">
                    <Database size={48} className="mx-auto text-zinc-600 mb-2"/>
                    <h2 className="text-xl font-black text-gray-800 tamil-font">{language === 'ta' ? 'கிளவுட் டேட்டாபேஸ் செட்டிங்ஸ்' : 'Setup Cloud Database'}</h2>
                </div>
                <form onSubmit={handleSaveConfig} className="space-y-4">
                    <input value={setupUrl} onChange={e => setSetupUrl(e.target.value)} className="w-full bg-gray-100 p-3 rounded-xl font-mono text-sm border outline-none" placeholder="Supabase URL" required />
                    <input value={setupKey} onChange={e => setSetupKey(e.target.value)} className="w-full bg-gray-100 p-3 rounded-xl font-mono text-sm border outline-none" placeholder="Anon Key" required />
                    <button type="submit" className="w-full bg-zinc-600 text-white p-3 rounded-xl font-bold shadow-lg">Save & Connect</button>
                </form>
             </div>
        </div>
    );
};

const AddTransactionModal: React.FC<{ onSave: (txn: any, id?: string, date?: number) => void; onClose: () => void; initialData?: Transaction; language: 'ta' | 'en'; t: any; }> = ({ onSave, onClose, initialData, language, t }) => {
  const confirm = useConfirm();
  const [type, setType] = useState<TransactionType>(initialData?.type || 'EXPENSE');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [partyName, setPartyName] = useState(initialData?.partyName || '');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      confirm.showError(language === 'ta' ? 'தயவுசெய்து சரியான தொகையை எண்களாக உள்ளிடவும்' : 'Please enter valid numbers');
      return;
    }

    const isConfirmed = await confirm.confirmSave(
      language === 'ta' ? 'இந்த பரிவர்த்தனை கணக்கை சேமிக்க விரும்புகிறீர்களா?' : 'Do you want to save this transaction?',
      language === 'ta' ? 'பரிவர்த்தனை சேமிப்பு' : 'Confirm Save'
    );
    if (!isConfirmed) return;

    onSave({ type, amount: parsedAmount, category, description, partyName }, initialData?.id, initialData?.date);
    confirm.showSuccess(language === 'ta' ? 'பரிவர்த்தனை வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Transaction saved successfully!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-800 tamil-font">{initialData ? t.editTransaction : t.addTransaction}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button type="button" onClick={() => setType('INCOME')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${type === 'INCOME' ? 'bg-green-500 text-white shadow-md' : 'text-gray-500'}`}>{t.income}</button>
            <button type="button" onClick={() => setType('EXPENSE')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${type === 'EXPENSE' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}>{t.expense}</button>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">{t.price}</label>
            <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className="w-full text-3xl font-black p-4 bg-gray-50 rounded-2xl border-none outline-none text-gray-900" placeholder="₹ 0" autoFocus required />
          </div>
          <div className="relative">
             <label className="text-xs font-bold text-gray-400 uppercase ml-2 mb-1 block">{t.category}</label>
             <div onClick={() => setShowCategoryDropdown(!showCategoryDropdown)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold border border-gray-100 flex justify-between items-center cursor-pointer">
                <span className={category ? 'text-gray-800' : 'text-gray-400'}>{category || 'Select'}</span>
                <ChevronDown size={18} className="text-gray-400" />
             </div>
             {showCategoryDropdown && (
                <div className="absolute z-50 bottom-full mb-2 left-0 w-full bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-2">
                    {EXPENSE_CATEGORIES.map(c => <div key={c} onClick={() => { setCategory(c); setShowCategoryDropdown(false); }} className="p-3 hover:bg-zinc-50 rounded-xl cursor-pointer font-bold text-gray-700 text-sm">{c}</div>)}
                </div>
             )}
          </div>
          <input value={partyName} onChange={e => setPartyName(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-gray-100" placeholder={t.partyName} />
          <input value={description} onChange={e => setDescription(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none border border-gray-100" placeholder="..." />
          <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-lg active:scale-[0.98] transition mt-2">{initialData ? t.update : t.save}</button>
        </form>
      </div>
    </div>
  );
};

const AddStockModal: React.FC<{ onSave: (item: any, id?: string) => void; onClose: () => void; initialData?: StockItem; language: 'ta' | 'en'; t: any; }> = ({ onSave, onClose, initialData, language, t }) => {
  const confirm = useConfirm();
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price?.toString() || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [variants, setVariants] = useState<StockVariant[]>(initialData?.variants || [{ id: Date.now().toString(), imageUrl: '', sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }] }]);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<{ vIdx: number, sIdx: number, field: 'color' | 'size' | 'sleeve' } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length > 12) {
        alert(language === 'ta' ? 'அதிகபட்சம் 12 படங்கள் மட்டுமே' : 'Maximum 12 images allowed');
        return;
      }

      const readFile = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
      };

      const processFiles = async () => {
        const newVariants = [...variants];
        const currentTemplate = newVariants[variantIndex];
        
        // Process first file -> Updates CURRENT variant
        if (files[0].size <= 2 * 1024 * 1024) {
            newVariants[variantIndex].imageUrl = await readFile(files[0]);
        } else {
            alert(language === 'ta' ? 'படம் 2MB-க்கு குறைவாக இருக்க வேண்டும்' : 'Image must be less than 2MB');
        }

        // Process remaining files -> Create NEW variants
        for (let i = 1; i < files.length; i++) {
            if (files[i].size <= 2 * 1024 * 1024) {
                const imgUrl = await readFile(files[i]);
                newVariants.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    imageUrl: imgUrl,
                    sizeStocks: currentTemplate.sizeStocks.map(s => ({ ...s })) // Clone sizes
                });
            }
        }
        setVariants(newVariants);
      };

      processFiles();
    }
  };

  const updateSizeStock = (vIdx: number, sIdx: number, field: keyof SizeStock, value: any) => {
    const newVariants = [...variants];
    newVariants[vIdx].sizeStocks[sIdx] = { ...newVariants[vIdx].sizeStocks[sIdx], [field]: value };
    setVariants(newVariants);
    setActiveDropdown(null);
  };

  const currentVariant = variants[activeVariantIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      confirm.showError(language === 'ta' ? 'தயவுசெய்து சரியான விலையை எண்களாக உள்ளிடவும்' : 'Please enter valid numbers');
      return;
    }

    const isConfirmed = await confirm.confirmSave(
      language === 'ta' ? `${name} - ஸ்டாக் விவரங்களை சேமிக்க விரும்புகிறீர்களா?` : 'Do you want to save stock details?',
      language === 'ta' ? 'ஸ்டாக் சேமிப்பு' : 'Confirm Save'
    );
    if (!isConfirmed) return;

    onSave({ name, price: parsedPrice, category, variants }, initialData?.id);
    confirm.showSuccess(language === 'ta' ? 'ஸ்டாக் விவரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன!' : 'Stock saved successfully!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-800 tamil-font">{initialData ? t.update : t.addStock}</h2>
          <button type="button" onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-400 ml-2 mb-2 block">{t.itemName}</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full p-5 bg-gray-50 rounded-[1.5rem] font-bold outline-none border border-gray-100 focus:border-zinc-200" placeholder={t.itemName} required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-400 ml-2 mb-2 block">{t.price}</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-gray-400">₹</span>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-5 pl-10 bg-gray-50 rounded-[1.5rem] font-bold outline-none border border-gray-100 focus:border-zinc-200" placeholder="0" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-400 ml-2 mb-2 block">{t.category}</label>
              <div className="relative">
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-5 bg-gray-50 rounded-[1.5rem] font-bold outline-none border border-gray-100 appearance-none focus:border-zinc-200" required>
                  <option value="">Select</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg text-gray-800 flex items-center gap-2">
                   <Palette size={20} className="text-gray-700" />
                   {language === 'ta' ? 'வகைகள்' : 'Variants'}
                   <span className="text-sm font-medium text-gray-400">(Variants)</span>
                </h3>
                <button type="button" onClick={() => setVariants([...variants, { id: Date.now().toString(), imageUrl: '', sizeStocks: [{ size: 'General', quantity: 0, color: '', sleeve: '' }] }])} className="text-zinc-600 text-xs font-black bg-zinc-50 px-4 py-2 rounded-xl hover:bg-zinc-100 transition shadow-sm">+ {language === 'ta' ? 'புதிய வகை' : 'Add New'}</button>
             </div>
             
             <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                 {variants.map((v, idx) => (
                     <button key={v.id || idx} type="button" onClick={() => setActiveVariantIndex(idx)} className={`flex-shrink-0 w-14 h-14 rounded-2xl border-2 transition-all flex items-center justify-center ${activeVariantIndex === idx ? 'border-zinc-500 bg-white ring-4 ring-zinc-50 shadow-md scale-105' : 'border-gray-200 bg-gray-100'}`}>
                         {v.imageUrl ? <img src={v.imageUrl} className="w-full h-full object-cover rounded-xl" alt="" /> : <span className="text-xs font-black text-gray-400">#{idx + 1}</span>}
                     </button>
                 ))}
             </div>
             
             {currentVariant && (
                <div className="space-y-6 mt-4">
                   {variants.length > 1 && (
                       <div className="flex justify-end">
                           <button type="button" onClick={() => {
                               const newVariants = variants.filter((_, i) => i !== activeVariantIndex);
                               setVariants(newVariants);
                               setActiveVariantIndex(Math.max(0, activeVariantIndex - 1));
                           }} className="text-red-500 text-xs font-bold flex items-center gap-1 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition">
                               <Trash2 size={14} /> {language === 'ta' ? 'இந்த வகையை நீக்கு' : 'Delete Variant'}
                           </button>
                       </div>
                   )}
                   <div className="relative aspect-video bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden group">
                      {currentVariant.imageUrl ? (
                        <><img src={currentVariant.imageUrl} className="w-full h-full object-contain" alt="" />
                        <button type="button" onClick={() => { const v = [...variants]; v[activeVariantIndex].imageUrl = ''; setVariants(v); }} className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition"><Trash2 size={18} /></button></>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-50 transition">
                           <Camera size={32} className="text-gray-300 mb-2" />
                           <span className="text-sm font-bold text-gray-400">{t.photo}</span>
                           <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, activeVariantIndex)} className="hidden" />
                        </label>
                      )}
                   </div>
                   
                   <div className="space-y-4">
                      {currentVariant.sizeStocks.map((stock, sIdx) => (
                        <div key={sIdx} className="bg-white p-6 rounded-[1.8rem] border border-gray-100 shadow-sm relative space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="relative">
                                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{t.color}</label>
                                 <div onClick={() => setActiveDropdown({ vIdx: activeVariantIndex, sIdx, field: 'color' })} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold flex justify-between items-center cursor-pointer text-gray-700">
                                    {stock.color || 'Select'}
                                    <ChevronDown size={14} className="text-gray-400" />
                                 </div>
                                 {activeDropdown?.vIdx === activeVariantIndex && activeDropdown?.sIdx === sIdx && activeDropdown?.field === 'color' && (
                                    <div className="absolute z-[60] bottom-full left-0 w-full mb-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-40 overflow-y-auto p-2">
                                       {PREDEFINED_COLORS.map(c => <div key={c.name} onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'color', c.name)} className="p-3 hover:bg-zinc-50 rounded-xl text-xs font-black text-gray-700 border-b last:border-0">{c.name}</div>)}
                                    </div>
                                 )}
                              </div>
                              <div className="relative">
                                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{language === 'ta' ? 'கை வகை' : 'Sleeve'}</label>
                                 <div onClick={() => setActiveDropdown({ vIdx: activeVariantIndex, sIdx, field: 'sleeve' })} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold flex justify-between items-center cursor-pointer text-gray-700">
                                    {stock.sleeve || 'None'}
                                    <ChevronDown size={14} className="text-gray-400" />
                                 </div>
                                 {activeDropdown?.vIdx === activeVariantIndex && activeDropdown?.sIdx === sIdx && activeDropdown?.field === 'sleeve' && (
                                    <div className="absolute z-[60] bottom-full left-0 w-full mb-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2">
                                       <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'sleeve', 'Full Hand')} className="p-3 hover:bg-zinc-50 rounded-xl text-xs font-black text-gray-700 border-b">Full Hand</div>
                                       <div onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'sleeve', 'Half Hand')} className="p-3 hover:bg-zinc-50 rounded-xl text-xs font-black text-gray-700">Half Hand</div>
                                    </div>
                                 )}
                              </div>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4">
                              <div className="relative">
                                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{t.size}</label>
                                 <div onClick={() => setActiveDropdown({ vIdx: activeVariantIndex, sIdx, field: 'size' })} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold flex justify-between items-center cursor-pointer text-gray-700">
                                    {stock.size || 'Select'}
                                    <ChevronDown size={14} className="text-gray-400" />
                                 </div>
                                 {activeDropdown?.vIdx === activeVariantIndex && activeDropdown?.sIdx === sIdx && activeDropdown?.field === 'size' && (
                                    <div className="absolute z-[60] bottom-full left-0 w-full mb-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-40 overflow-y-auto p-2">
                                       {SHIRT_SIZES.map(s => <div key={s} onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'size', s)} className="p-3 hover:bg-zinc-50 rounded-xl text-xs font-black text-gray-700 border-b last:border-0">{s}</div>)}
                                    </div>
                                 )}
                              </div>
                              <div>
                                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">{language === 'ta' ? 'அளவு' : 'Quantity'}</label>
                                 <div className="flex items-center bg-gray-100 rounded-xl p-1 h-[42px]">
                                    <button type="button" onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'quantity', Math.max(0, stock.quantity - 1))} className="w-10 h-10 flex items-center justify-center font-black text-gray-400 hover:text-zinc-600 transition">-</button>
                                    <input type="number" value={stock.quantity} onChange={e => updateSizeStock(activeVariantIndex, sIdx, 'quantity', parseInt(e.target.value) || 0)} className="w-full text-center text-sm font-black bg-transparent outline-none" />
                                    <button type="button" onClick={() => updateSizeStock(activeVariantIndex, sIdx, 'quantity', stock.quantity + 1)} className="w-10 h-10 flex items-center justify-center font-black text-gray-400 hover:text-zinc-600 transition">+</button>
                                 </div>
                              </div>
                           </div>
                           
                           <button type="button" onClick={() => { const v = [...variants]; v[activeVariantIndex].sizeStocks = v[activeVariantIndex].sizeStocks.filter((_, i) => i !== sIdx); setVariants(v); }} className="absolute -top-2 -right-2 p-1.5 bg-white border border-gray-100 text-gray-300 hover:text-red-500 rounded-full shadow-sm transition"><X size={14}/></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => { const v = [...variants]; v[activeVariantIndex].sizeStocks.push({ size: 'General', quantity: 0, color: '', sleeve: '' }); setVariants(v); }} className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-500 font-black text-xs hover:bg-zinc-50 transition">+ {language === 'ta' ? 'புதிய ஆப்ஷன் சேர்க்க' : 'Add Stock Option'}</button>
                   </div>
                </div>
             )}
          </div>
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-[1.5rem] shadow-xl shadow-zinc-100 active:scale-[0.98] transition text-lg">{initialData ? t.update : t.save}</button>
        </form>
      </div>
    </div>
  );
};

const GUEST_USER: User = { uid: '', email: 'guest@viyabaari.local', name: 'Guest', isLoggedIn: false };

const App: React.FC = () => {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stock' | 'accounts' | 'profile' | 'weavers' | 'warpers' | 'delivery-books' | 'yarns' | 'all-yarns' | 'suppliers' | 'customers' | 'billing'>('dashboard');
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [user, setUser] = useState<User>(GUEST_USER);
  const [language, setLanguage] = useState<'ta' | 'en'>('ta');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showDatabaseConfig, setShowDatabaseConfig] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string, show: boolean, isError?: boolean }>({ msg: '', show: false });
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [hasShownInitialStatus, setHasShownInitialStatus] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setToast({
        msg: language === 'ta' ? 'ஆன்லைன் (Online)' : 'Online',
        show: true,
        isError: false
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      setToast({
        msg: language === 'ta' ? 'ஆஃப்லைன் (Offline)' : 'Offline',
        show: true,
        isError: true
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status notification
    if (!hasShownInitialStatus && !isAppLoading) {
      setToast({
        msg: navigator.onLine 
          ? (language === 'ta' ? 'ஆன்லைன் (Online)' : 'Online')
          : (language === 'ta' ? 'ஆஃப்லைன் (Offline)' : 'Offline'),
        show: true,
        isError: !navigator.onLine
      });
      setHasShownInitialStatus(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [language, isAppLoading, hasShownInitialStatus]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [customAppName, setCustomAppName] = useState('');
  const [themeColor, setThemeColor] = useState('bg-zinc-50');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('viyabaari_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Sync activeTab with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If it's a subview state, the child component will handle it
      if (event.state && event.state.subview) {
        return;
      }

      // Close modals first if they are open
      if (isAddingStock || isAddingTransaction || showDatabaseConfig || showAuthModal) {
        setIsAddingStock(false);
        setIsAddingTransaction(false);
        setShowDatabaseConfig(false);
        setShowAuthModal(false);
        return;
      }

      // Handle tab navigation
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        setActiveTab('dashboard');
      }
    };

    // Set initial state
    if (!window.history.state) {
      window.history.replaceState({ tab: 'dashboard' }, '');
    }
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAddingStock, isAddingTransaction, showDatabaseConfig, showAuthModal]);

  // Update history when tab changes
  const prevTab = useRef(activeTab);
  useEffect(() => {
    if (prevTab.current !== activeTab) {
      window.history.pushState({ tab: activeTab }, '');
      prevTab.current = activeTab;
      // Reset scroll position on tab change
      const main = document.querySelector('main');
      if (main) main.scrollTo(0, 0);
      window.scrollTo(0, 0);
    }
  }, [activeTab]);

  // Push state when modal opens so back button closes it
  useEffect(() => {
    const anyModalOpen = isAddingStock || isAddingTransaction || showDatabaseConfig || showAuthModal;
    if (anyModalOpen && !window.history.state?.modal) {
      window.history.pushState({ modal: true, tab: activeTab }, '');
    }
  }, [isAddingStock, isAddingTransaction, showDatabaseConfig, showAuthModal, activeTab]);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('viyabaari_theme', newTheme);
      return newTheme;
    });
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const getEmailKey = (email: string) => {
    const oldEmailKey = (email || 'guest').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const uidKey = user?.uid || oldEmailKey;
    
    if (oldEmailKey !== uidKey) {
      ['stocks', 'txns', 'sync_queue'].forEach(prefix => {
        const oldData = localStorage.getItem(`viyabaari_${prefix}_${oldEmailKey}`);
        if (oldData) {
          localStorage.setItem(`viyabaari_${prefix}_${uidKey}`, oldData);
          localStorage.removeItem(`viyabaari_${prefix}_${oldEmailKey}`);
        }
      });
    }
    return uidKey;
  };

  useEffect(() => {
    (window as any).isLoggedIn = user?.isLoggedIn;
  }, [user?.isLoggedIn]);

  useEffect(() => {
    const savedThemeColor = localStorage.getItem(`viyabaari_theme_color_${user?.uid || 'guest'}`);
    if (savedThemeColor) {
      setThemeColor(savedThemeColor);
    }
  }, [user?.uid]);

  useEffect(() => {
    // Standardizing some dynamic styles even without custom button color
    let styleTag = document.getElementById('dynamic-app-styles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'dynamic-app-styles';
      document.head.appendChild(styleTag);
    }
    
    styleTag.innerHTML = `
      .primary-btn {
        background-color: #18181b !important;
        color: white !important;
        border: none !important;
      }
      .primary-btn:hover {
        background-color: #27272a !important;
      }
      .theme-icon-bg {
        background-color: rgba(0,0,0,0.05) !important;
      }
    `;
  }, []);

  const handleThemeChange = (color: string) => {
    setThemeColor(color);
    localStorage.setItem(`viyabaari_theme_color_${user?.uid || 'guest'}`, color);
    setToast({
      msg: language === 'ta' ? 'பின்னணி நிறம் மாற்றப்பட்டது!' : 'Background color changed!',
      show: true,
      isError: false
    });
  };


  useEffect(() => {
    const handleTouchStart = (e: TouchEvent | MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('.cursor-pointer')) {
        if (navigator.vibrate) {
          // Provide a subtle haptic feedback on touch
          navigator.vibrate(15);
        }
      }
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const button = target.closest('button');
        if (button && !(window as any).isLoggedIn) {
            const text = button.innerText.toLowerCase();
            const isAction = 
                button.querySelector('svg.lucide-plus') || 
                button.querySelector('svg.lucide-trash-2') || 
                button.querySelector('svg.lucide-save') ||
                text.includes('save') || text.includes('add') || text.includes('delete') || 
                text.includes('update') || text.includes('clear') || 
                text.includes('சேமி') || text.includes('நீக்கு') || text.includes('புதிய') || text.includes('உருவாக்கு');
            
            if (isAction && !button.closest('.auth-modal') && !button.classList.contains('allow-guest')) {
                e.preventDefault();
                e.stopPropagation();
                setShowAuthModal(true);
            }
        }
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  useEffect(() => {
    let timeout: any;
    const handleUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (user?.uid && isOnline && isSupabaseConfigured) {
          syncToSupabase(user.uid);
        }
      }, 500); // Fast 500ms sync trigger instead of 5s delay
    };
    window.addEventListener('local-storage-update', handleUpdate);
    
    const handleFlushSync = () => {
      if (user?.uid && navigator.onLine && isSupabaseConfigured) {
        syncToSupabase(user.uid);
      }
    };
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleFlushSync();
      }
    });
    window.addEventListener('beforeunload', handleFlushSync);

    return () => {
      window.removeEventListener('local-storage-update', handleUpdate);
      window.removeEventListener('beforeunload', handleFlushSync);
      clearTimeout(timeout);
    };
  }, [user?.uid, isOnline]);

  const processSyncQueue = useCallback(async () => {
    if (!user || !user.uid || !isOnline || !isSupabaseConfigured) return;
    const q = getSyncQueue(user.uid);
    if (q.length === 0) return;

    const failedQueue: SyncAction[] = [];

    for (const action of q) {
      try {
        if (action.type === 'STOCK_DELETE') {
          const { error } = await supabase.from('stock_items').delete().eq('id', action.payload.id);
          if (error) throw error;
        } else if (action.type === 'TXN_DELETE') {
          const { error } = await supabase.from('transactions').delete().eq('id', action.payload.id);
          if (error) throw error;
        } else if (action.type === 'GENERIC_DELETE') {
          const { error } = await supabase.from(action.payload.table).delete().eq('id', action.payload.id);
          if (error) throw error;
        }
      } catch (e) {
        console.error("Sync action failed", action, e);
        failedQueue.push(action);
      }
    }

    if (failedQueue.length > 0) {
      localStorage.setItem(`viyabaari_sync_queue_${user.uid}`, JSON.stringify(failedQueue));
    } else {
      clearSyncQueue(user.uid);
    }
  }, [user, isOnline]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem('viyabaari_install_dismissed', 'true');
  };

  useEffect(() => {
    // Version Check & Auto-Update Logic
    const savedVersion = localStorage.getItem('viyabaari_app_version');
    if (savedVersion !== APP_VERSION) {
      console.log(`New version detected: ${APP_VERSION}. Previous: ${savedVersion}`);
      localStorage.setItem('viyabaari_app_version', APP_VERSION);
      
      // If it's a major update or we want to ensure fresh start, we could clear specific caches here
      // For now, just notifying the user or forcing a one-time reload if needed
      if (savedVersion) {
        setToast({
          msg: language === 'ta' ? 'புதிய அப்டேட் கிடைத்துள்ளது!' : 'New update applied!',
          show: true,
          isError: false
        });
      }
    }

    const savedLang = localStorage.getItem('viyabaari_lang');
    if (savedLang === 'ta' || savedLang === 'en') setLanguage(savedLang);
    
    const savedAppName = localStorage.getItem('viyabaari_custom_app_name');
    if (savedAppName) setCustomAppName(savedAppName);

    // PWA Install Logic
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if not already installed and not dismissed recently
      const dismissed = localStorage.getItem('viyabaari_install_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ 
          uid: session.user.id, 
          email: session.user.email || '', 
          name: session.user.user_metadata.full_name || session.user.user_metadata.name || 'User', 
          avatar: session.user.user_metadata.avatar_url,
          mobile: session.user.user_metadata.mobile,
          address: session.user.user_metadata.address,
          isLoggedIn: true 
        });
      } else {
        const savedUser = localStorage.getItem('viyabaari_active_user');
        if (savedUser) { 
            try { setUser(JSON.parse(savedUser)); } catch(e) { localStorage.removeItem('viyabaari_active_user'); setUser(GUEST_USER); } 
        } else {
            setUser(GUEST_USER);
        }
        setIsAppLoading(false); // Only set false here if not logged in, otherwise fetchData will set it
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleResetApp = () => {
    const keysToRemove = [
      'viyabaari_active_user',
      'viyabaari_stocks_',
      'viyabaari_txns_',
      'viyabaari_custom_app_name',
      'viyabaari_theme_color',
      'viyabaari_lang'
    ];
    
    // Remove specific keys and those starting with prefixes
    Object.keys(localStorage).forEach(key => {
      if (keysToRemove.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    });
    
    setUser(GUEST_USER);
    window.location.reload();
  };

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (!user) return;
    const emailKey = getEmailKey(user.email);
    
    // Immediate Local Load
    const loadLocal = () => {
      try {
          const localS = localStorage.getItem(`viyabaari_stocks_${emailKey}`);
          const localT = localStorage.getItem(`viyabaari_txns_${emailKey}`);
          if (localS) setStocks(JSON.parse(localS));
          if (localT) setTransactions(JSON.parse(localT));
      } catch (e) { console.error("Local load failed"); }
    };

    loadLocal();

    if (user.uid && isOnline && isSupabaseConfigured) {
      if (isManualRefresh) setIsSyncing(true);
      
      await processSyncQueue();

      try {
        await syncToSupabase(user.uid);
        await fetchFromSupabase(user.uid);
        // Reload from local storage after fetching from Supabase
        loadLocal();
      } catch (e) { console.error("Cloud fetch failed", e); }
      finally { 
        if (isManualRefresh) setIsSyncing(false); 
        setIsAppLoading(false);
      }
    } else {
      setIsAppLoading(false);
    }
  }, [user, isOnline, processSyncQueue]);

  useEffect(() => { if (user) fetchData(); }, [user?.uid, fetchData]);

  const saveStock = async (itemData: any, id?: string) => {
    if (!user) return;
    setIsLoading(true);
    const emailKey = getEmailKey(user.email);
    try {
        const newItem = { ...itemData, id: id || Date.now().toString(), lastUpdated: Date.now() };
        
        // Immediate Optimistic Update
        const updated = id ? stocks.map(s => s.id === id ? newItem : s) : [newItem, ...stocks];
        setStocks(updated);
        saveDataAndSync(user.uid, `viyabaari_stocks_${emailKey}`, updated, 'stock_items');
        
        setIsAddingStock(false); 
        setEditingStock(null);
        setToast({ msg: language === 'ta' ? 'சரக்கு சேமிக்கப்பட்டது!' : 'Stock Saved!', show: true });
    } catch (err) { 
        console.error("Save stock failed:", err);
        setToast({ msg: 'Error saving stock', show: true, isError: true }); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const saveTransaction = async (txnData: any, id?: string, date?: number) => {
    if (!user) return;
    setIsLoading(true);
    const emailKey = getEmailKey(user.email);
    try {
        const newTxn = { ...txnData, id: id || Date.now().toString(), date: date || Date.now() };
        
        // Immediate UI Update
        const updated = id ? transactions.map(t => t.id === id ? newTxn : t) : [newTxn, ...transactions];
        setTransactions(updated);
        saveDataAndSync(user.uid, `viyabaari_txns_${emailKey}`, updated, 'transactions');
        
        setIsAddingTransaction(false); 
        setEditingTransaction(null);
        setToast({ msg: language === 'ta' ? 'கணக்கு சேமிக்கப்பட்டது!' : 'Entry Saved!', show: true });
    } catch (err) { 
        console.error("Save transaction failed:", err);
        setToast({ msg: 'Error saving transaction', show: true, isError: true }); 
    } finally { 
        setIsLoading(false); 
    }
  };

  const handleDeleteStock = async (id: string) => {
    const isConfirmed = await confirm.confirmDelete(
      language === 'ta' ? 'நிச்சயமாக இந்த பொருளை நீக்க வேண்டுமா?' : 'Are you sure you want to delete this stock item?'
    );
    if (!isConfirmed) return false;
    
    if (!user) return false;
    setIsLoading(true);
    const emailKey = getEmailKey(user.email);
    try {
        const updated = stocks.filter(s => s.id !== id);
        setStocks(updated);
        deleteDataAndSync(user.uid, 'stock_items', id, `viyabaari_stocks_${emailKey}`, updated);
        
        confirm.showSuccess(language === 'ta' ? 'பொருள் வெற்றிகரமாக நீக்கப்பட்டது!' : 'Item Deleted Successfully!');
        return true;
    } catch (err) {
        console.error("Delete stock failed:", err);
        confirm.showError(language === 'ta' ? 'பொருளை நீக்குவதில் பிழை ஏற்பட்டது' : 'Error deleting stock');
        return false;
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const isConfirmed = await confirm.confirmDelete(
      language === 'ta' ? 'நிச்சயமாக இந்த பதிவை நீக்க வேண்டுமா?' : 'Are you sure you want to delete this entry?'
    );
    if (!isConfirmed) return;

    if (!user) return;
    const emailKey = getEmailKey(user.email);
    try {
        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        deleteDataAndSync(user.uid, 'transactions', id, `viyabaari_txns_${emailKey}`, updated);
        confirm.showSuccess(language === 'ta' ? 'பதிவு வெற்றிகரமாக நீக்கப்பட்டது!' : 'Deleted Successfully!');
    } catch (err) {
        console.error("Delete transaction failed:", err);
        confirm.showError(language === 'ta' ? 'பதிவை நீக்குவதில் பிழை ஏற்பட்டது' : 'Error deleting transaction');
    }
  };

  const handleDeleteWeaver = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'weavers', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteWarper = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'warpers', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteDispatch = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'yarn_dispatches', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteReturn = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'warper_returns', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'warp_orders', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteDesign = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'warp_designs', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteLoom = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'looms', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteProduction = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'weaver_productions', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'suppliers', id, isOnline && isSupabaseConfigured);
  };

  const handleDeletePurchase = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'purchases', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'customers', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'yarn_entries', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteLoomTransaction = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'loom_transactions', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteDeliverySlip = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'delivery_slips', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'invoices', id, isOnline && isSupabaseConfigured);
  };

  const handleDeleteDeliveryBook = async (id: string) => {
    if (!user) return;
    await deleteFromSupabase(user.uid || '', 'delivery_books', id, isOnline && isSupabaseConfigured);
  };

  const handleClearTransactions = async () => {
    if (!user) return;
    const emailKey = getEmailKey(user.email);
    
    // Read current transactions before clearing
    const currentTxnsString = localStorage.getItem(`viyabaari_txns_${emailKey}`);
    const txns = currentTxnsString ? JSON.parse(currentTxnsString) : [];
    
    setTransactions([]);
    try { localStorage.setItem(`viyabaari_txns_${emailKey}`, '[]'); } catch(e) {}
    
    if (isOnline && isSupabaseConfigured && txns.length > 0) {
       try {
           const ids = txns.map((t: any) => t.id);
           await supabase.from('transactions').delete().in('id', ids);
       } catch (error) {
           console.error('Error clearing transactions from Supabase:', error);
       }
    }
    setToast({ msg: language === 'ta' ? 'அனைத்தும் அழிக்கப்பட்டது' : 'Cleared all', show: true });
  };

  const t = TRANSLATIONS[language];
  
  if (isAppLoading) {
      return (
          <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
              <Loader2 size={48} className="animate-spin mb-4 text-zinc-400" />
              <h1 className="text-2xl font-black tamil-font animate-pulse tracking-tight">உற்பத்தியாளர்/manufacturer Loading...</h1>
          </div>
      );
  }

  return (
    <div className={`min-h-screen ${themeColor} flex flex-col md:flex-row font-sans text-zinc-900`}>
      <Toast message={toast.msg} show={toast.show} isError={toast.isError} onClose={() => setToast({ ...toast, show: false })} />
      
      {/* Desktop Sidebar */}
      <aside className="sidebar-container hidden md:flex flex-col w-64 bg-zinc-950 text-zinc-300 h-screen sticky top-0 z-50 border-r border-zinc-800">
        <div className="p-6 flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded-full bg-white p-0.5" onError={(e) => e.currentTarget.style.display = 'none'} />
          <h1 className="text-2xl font-black tamil-font truncate text-white tracking-tight">{customAppName || t.appName}</h1>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto hide-scrollbar">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <LayoutDashboard size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'முகப்பு' : 'Dashboard'}</span>
          </button>
          <button onClick={() => setActiveTab('stock')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'stock' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <Package size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'சரக்கு' : 'Stock'}</span>
          </button>
          <button onClick={() => setActiveTab('accounts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'accounts' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <ArrowLeftRight size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'கணக்கு' : 'Accounts'}</span>
          </button>
          <button onClick={() => setActiveTab('weavers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'weavers' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <UserIcon size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'தறிகாரர்கள்' : 'Weavers'}</span>
          </button>
          <button onClick={() => setActiveTab('warpers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'warpers' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <Package size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'வார்ப்புகள்' : 'Warpers'}</span>
          </button>
          <button onClick={() => setActiveTab('yarns')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'yarns' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <Palette size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'நூல் கணக்கு' : 'Yarn Accounts'}</span>
          </button>
          <button onClick={() => setActiveTab('all-yarns')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'all-yarns' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <Database size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'அனைத்து நூல்கள்' : 'All Yarns'}</span>
          </button>
          <button onClick={() => setActiveTab('delivery-books')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'delivery-books' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <BookOpen size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'டெலிவரி புக்' : 'Delivery Book'}</span>
          </button>
          <button onClick={() => setActiveTab('suppliers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'suppliers' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <Users size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'சப்ளையர்கள்' : 'Suppliers'}</span>
          </button>
          <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'customers' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <Users size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Customers'}</span>
          </button>
          <button onClick={() => setActiveTab('billing')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'billing' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <FileText size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'பில்லிங்' : 'Billing'}</span>
          </button>
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === 'profile' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'}`}>
            <UserIcon size={18} />
            <span className="text-sm tracking-wide">{language === 'ta' ? 'புரொஃபைல்' : 'Profile'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white text-zinc-900 p-4 sticky top-0 z-40 border-b border-zinc-200 flex flex-wrap gap-2 justify-between items-center theme-btn-white">
          <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain rounded-full bg-white p-0.5 shadow-sm" onError={(e) => e.currentTarget.style.display = 'none'} />
              <h1 className="text-xl font-black tamil-font truncate tracking-tight">{customAppName || t.appName}</h1>
              {user.uid ? (
                  <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-full cursor-pointer hover:bg-zinc-200 transition" onClick={() => setActiveTab('profile')}>
                      {user.avatar ? (
                          <img src={user.avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover border border-zinc-200" />
                      ) : (
                          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                          {user.name.charAt(0).toUpperCase()}
                          </div>
                      )}
                      <span className="text-sm font-semibold hidden sm:block truncate max-w-[80px]">{user.name}</span>
                  </div>
              ) : (
                  <button 
                      onClick={() => setShowAuthModal(true)} 
                      className="bg-zinc-900 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm hover:bg-zinc-800 transition"
                  >
                      {language === 'ta' ? 'லாகின் / பதிவு' : 'Login / Sign Up'}
                  </button>
              )}
          </div>
          <div className="flex gap-3 items-center">
              <button onClick={toggleTheme} className="p-2 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded-full transition">
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              {isOnline && user.uid && <button onClick={() => fetchData(true)} className={`p-2 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 rounded-full transition ${isSyncing ? 'animate-spin' : ''}`}><RefreshCw size={18} /></button>}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-zinc-200 p-5 sticky top-0 z-40 items-center justify-between theme-btn-white">
          <h2 className="text-2xl font-black text-zinc-900 tamil-font tracking-tight" style={{ color: 'inherit' }}>
            {activeTab === 'dashboard' && (language === 'ta' ? 'முகப்பு' : 'Dashboard')}
            {activeTab === 'stock' && (language === 'ta' ? 'சரக்கு' : 'Stock')}
            {activeTab === 'accounts' && (language === 'ta' ? 'கணக்கு' : 'Accounts')}
            {activeTab === 'weavers' && (language === 'ta' ? 'தறிகாரர்கள்' : 'Weavers')}
            {activeTab === 'warpers' && (language === 'ta' ? 'வார்ப்புகள்' : 'Warpers')}
            {activeTab === 'yarns' && (language === 'ta' ? 'நூல் கணக்கு' : 'Yarn Accounts')}
            {activeTab === 'all-yarns' && (language === 'ta' ? 'அனைத்து நூல்கள்' : 'All Yarns')}
            {activeTab === 'delivery-books' && (language === 'ta' ? 'டெலிவரி புக்' : 'Delivery Book')}
            {activeTab === 'suppliers' && (language === 'ta' ? 'சப்ளையர்கள்' : 'Suppliers')}
            {activeTab === 'customers' && (language === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Customers')}
            {activeTab === 'billing' && (language === 'ta' ? 'பில்லிங்' : 'Billing')}
            {activeTab === 'profile' && (language === 'ta' ? 'புரொஃபைல்' : 'Profile')}
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {isOnline && user.uid && (
              <button onClick={() => fetchData(true)} className={`p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition ${isSyncing ? 'animate-spin' : ''}`}>
                <RefreshCw size={18} />
              </button>
            )}
            {user.uid ? (
              <div className="flex items-center gap-2 bg-zinc-100 px-3 py-1.5 rounded-full cursor-pointer hover:bg-zinc-200 transition border border-zinc-200" onClick={() => setActiveTab('profile')}>
                {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                    {user.name.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className="text-sm font-semibold text-zinc-800 truncate max-w-[120px]">{user.name}</span>
              </div>
            ) : (
              <button 
                  onClick={() => setShowAuthModal(true)} 
                  className="bg-zinc-900 text-white px-5 py-2 rounded-full text-sm font-semibold shadow-sm hover:bg-zinc-800 transition"
              >
                  {language === 'ta' ? 'லாகின் / பதிவு' : 'Login / Sign Up'}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-0 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === 'dashboard' && <Dashboard stocks={stocks} transactions={transactions} language={language} user={user} onSetupServer={() => setShowDatabaseConfig(true)} onNavigate={setActiveTab} />}
            {activeTab === 'weavers' && (
              <Weavers 
                user={user} 
                language={language} 
                onBack={() => setActiveTab('dashboard')} 
                onAddTransaction={(txn) => saveTransaction(txn)} 
                onNavigateToStock={() => { setActiveTab('stock'); setEditingStock(null); setIsAddingStock(true); }} 
              />
            )}
            {activeTab === 'warpers' && (
              <Warpers 
                user={user} 
                language={language} 
                onBack={() => setActiveTab('dashboard')} 
                onAddTransaction={(txn) => saveTransaction(txn)} 
              />
            )}
            {activeTab === 'delivery-books' && (
              <DeliveryBooks 
                user={user} 
                language={language} 
                onBack={() => setActiveTab('dashboard')} 
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === 'yarns' && <YarnsAccounts user={user} language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'all-yarns' && (
              <AllYarnsAccounts 
                user={user} 
                language={language} 
                onBack={() => setActiveTab('dashboard')} 
              />
            )}
            {activeTab === 'suppliers' && <Suppliers user={user} language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'customers' && <Customers user={user} language={language} onBack={() => setActiveTab('dashboard')} />}
            {activeTab === 'billing' && <Billing user={user} language={language} stocks={stocks} onBack={() => setActiveTab('dashboard')} onAddTransaction={(txn) => saveTransaction(txn)} onUpdateStock={(stockId, variantId, size, quantityToReduce) => {
              const stockToUpdate = stocks.find(s => s.id === stockId);
              if (stockToUpdate) {
                const updatedVariants = stockToUpdate.variants.map(v => {
                  if (v.id === variantId) {
                    return {
                      ...v,
                      sizeStocks: v.sizeStocks.map(sz => sz.size === size ? { ...sz, quantity: Math.max(0, sz.quantity - quantityToReduce) } : sz)
                    };
                  }
                  return v;
                });
                saveStock({ ...stockToUpdate, variants: updatedVariants }, stockToUpdate.id);
              }
            }} />}
            {activeTab === 'stock' && <Inventory stocks={stocks} onAdd={() => { setEditingStock(null); setIsAddingStock(true); }} onBack={() => setActiveTab('dashboard')} language={language} />}
            {activeTab === 'accounts' && <Accounting transactions={transactions} language={language} onAdd={() => { setEditingTransaction(null); setIsAddingTransaction(true); }} onBack={() => setActiveTab('dashboard')} onClear={handleClearTransactions} />}
            {activeTab === 'profile' && <Profile 
              user={user} 
              updateUser={(u) => { setUser(u); localStorage.setItem('viyabaari_active_user', JSON.stringify(u)); }} 
              stocks={stocks} 
              transactions={transactions} 
              onLogout={async () => { 
                await supabase.auth.signOut(); 
                setUser(GUEST_USER); 
                localStorage.removeItem('viyabaari_active_user'); 
                sessionStorage.clear();
                window.location.reload(); 
              }} 
              onRestore={d => {}} 
              language={language} 
              onLanguageChange={(l) => { setLanguage(l); localStorage.setItem('viyabaari_lang', l); }} 
              onClearTransactions={handleClearTransactions} 
              onResetApp={handleResetApp} 
              customAppName={customAppName} 
              setCustomAppName={(name) => {
                setCustomAppName(name);
                localStorage.setItem('viyabaari_custom_app_name', name);
              }} 
              themeColor={themeColor} 
              onThemeChange={handleThemeChange} 
              onBack={() => setActiveTab('dashboard')} 
              deferredPrompt={deferredPrompt} 
              onInstall={handleInstallClick} 
            />}
          </div>
        </main>
      </div>
      {showDatabaseConfig && <DatabaseConfigModal onClose={() => setShowDatabaseConfig(false)} language={language} />}
      {isAddingStock && <AddStockModal onSave={saveStock} onClose={() => setIsAddingStock(false)} initialData={editingStock || undefined} language={language} t={t} />}
      {isAddingTransaction && <AddTransactionModal onSave={saveTransaction} onClose={() => setIsAddingTransaction(false)} initialData={editingTransaction || undefined} language={language} t={t} />}
      {isLoading && <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[110] backdrop-blur-[1px]"><div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300"><Loader2 className="animate-spin text-zinc-600" size={40}/><p className="font-black text-gray-800 tamil-font">சேமிக்கப்படுகிறது...</p></div></div>}
      {showAuthModal && (
          <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm auth-modal">
              <div className="relative w-full max-w-sm">
                  <button onClick={() => setShowAuthModal(false)} className="absolute -top-12 right-0 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition z-10">
                      <X size={24} />
                  </button>
                  <AuthScreen onLogin={u => { setUser(u); localStorage.setItem('viyabaari_active_user', JSON.stringify(u)); setShowAuthModal(false); window.location.reload(); }} language={language} t={t} isOnline={isOnline} isModal={true} />
              </div>
          </div>
      )}
      {showInstallBanner && (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-80 bg-zinc-900 text-white p-5 rounded-3xl shadow-2xl z-[100] animate-in slide-in-from-bottom duration-500 flex flex-col gap-4 border border-zinc-800">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-2 shadow-inner">
                <img src="/logo.png" alt="App Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-black text-sm tamil-font">ஆப்பை இன்ஸ்டால் செய்க</h3>
                <p className="text-[10px] text-zinc-400 font-bold">Install உற்பத்தியாளர்/manufacturer for better experience</p>
              </div>
            </div>
            <button onClick={handleDismissInstall} className="p-1 text-zinc-500 hover:text-white transition">
              <X size={18} />
            </button>
          </div>
          <button 
            onClick={handleInstallClick}
            className="w-full bg-white text-zinc-900 py-3 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition flex items-center justify-center gap-2 primary-btn"
          >
            <FileDown size={18} /> {language === 'ta' ? 'இன்ஸ்டால் (Install)' : 'Install Now'}
          </button>
        </div>
      )}
    </div>
  );
};

const AuthScreen: React.FC<{ onLogin: (u: User) => void; language: 'ta' | 'en'; t: any; isOnline: boolean; isModal?: boolean }> = ({ onLogin, language, t, isOnline, isModal }) => {
    const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
    const [loginId, setLoginId] = useState(''); // Email or Mobile for Login
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isSupabaseConfigured) {
          alert(language === 'ta' ? 'டேட்டாபேஸ் இணைக்கப்படவில்லை! தயவுசெய்து .env ஃபைலில் Supabase URL மற்றும் Key-ஐ சேர்த்து ஆப்பை மீண்டும் பில்ட் செய்யவும். அல்லது Guest Mode-ல் சென்று Profile -> Setup Server மூலம் இணைக்கவும்.' : 'Database not configured! Please add Supabase URL and Key in .env file and rebuild the app. Or go to Guest Mode -> Profile -> Setup Server to configure.');
          return;
      }
      setIsLoading(true);
      try {
        if (mode === 'REGISTER') {
           // We store mobile in user_metadata. Note: Native phone login requires Supabase Phone Provider to be enabled.
           // To avoid signup failure if phone provider is disabled, we don't pass `phone` to root, but we can try.
           // Actually, the safest way without breaking existing setups is to store it in metadata.
           // But to allow login, we will use a trick: if user logs in with mobile, we can't easily find the email without a DB query.
           // For now, we will try native phone auth. If it fails, we will alert the user.
           const signUpData: any = { 
               email, 
               password, 
               options: { data: { name, mobile } } 
           };
           // We will not pass `phone: mobile` directly to signUp because it requires SMS provider setup and might fail the whole signup.
           // Wait, if we don't pass it, they can't log in with it.
           // Let's pass it and catch the error, or just use a pseudo email if they only provide mobile.
           // The user requested: Sign up needs mobile. Login needs email OR mobile.
           // Let's use a custom mapping in local storage for offline/guest, but for Supabase we need a real solution.
           // We will use native phone if provided.
           if (mobile) {
               signUpData.phone = mobile;
           }
           const { error } = await supabase.auth.signUp(signUpData);
           if (error) {
               // If phone provider is not enabled, Supabase throws an error. We can fallback to just email signup.
               if (error.message.toLowerCase().includes('phone') || error.message.toLowerCase().includes('provider')) {
                   const fallback = await supabase.auth.signUp({ email, password, options: { data: { name, mobile } } });
                   if (fallback.error) throw fallback.error;
                   alert(language === 'ta' ? 'பதிவு வெற்றி! (குறிப்பு: மொபைல் லாகின் வேலை செய்ய Supabase-ல் Phone Provider-ஐ ஆன் செய்யவும்)' : 'Success! (Note: Enable Phone Provider in Supabase for mobile login)');
               } else {
                   throw error;
               }
           } else {
               alert(language === 'ta' ? 'பதிவு வெற்றி! இப்போது லாகின் செய்யவும்.' : 'Success! Please login.');
           }
           setMode('LOGIN');
        } else if (mode === 'LOGIN') {
           const isMobile = /^\+?[0-9]{10,15}$/.test(loginId.trim());
           let authPromise;
           if (isMobile) {
               authPromise = supabase.auth.signInWithPassword({ phone: loginId.trim(), password });
           } else {
               authPromise = supabase.auth.signInWithPassword({ email: loginId.trim(), password });
           }
           
           const { data, error } = await authPromise;
           if (error) throw error;
           if (data.user) {
               if (data.user.user_metadata?.is_deleted) {
                   await supabase.auth.signOut();
                   throw new Error(language === 'ta' ? 'இந்த கணக்கு நீக்கப்பட்டுள்ளது. புதிய கணக்கை உருவாக்கவும்.' : 'This account has been deleted. Please create a new account.');
               }
               onLogin({ uid: data.user.id, email: data.user.email || '', name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'User', avatar: data.user.user_metadata?.avatar_url, mobile: data.user.user_metadata?.mobile, address: data.user.user_metadata?.address, isLoggedIn: true });
           }
        } else {
           const { error } = await supabase.auth.resetPasswordForEmail(loginId);
           if (error) throw error;
           alert(t.resetLinkSent);
           setMode('LOGIN');
        }
      } catch (err: any) { 
          if (err.message.includes('Invalid login credentials')) {
              alert(language === 'ta' ? 'தவறான இமெயில்/மொபைல் அல்லது கடவுச்சொல்' : 'Invalid email/mobile or password');
          } else {
              alert(err.message); 
          }
      }
      finally { setIsLoading(false); }
    };
    
    const content = (
         <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-gray-800 shadow-2xl theme-btn-white">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-black text-zinc-600 tamil-font mb-2">{language === 'ta' ? 'உள்நுழைய' : 'Login Required'}</h2>
                    <p className="text-sm text-gray-500 font-bold">{language === 'ta' ? 'தொடர உங்கள் கணக்கில் நுழையவும்' : 'Please login to continue'}</p>
                </div>
                <div className="flex gap-4 mb-6 bg-gray-100 p-1 rounded-2xl">
                    <button onClick={() => setMode('LOGIN')} className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${mode === 'LOGIN' ? 'bg-white text-zinc-600 shadow-sm' : 'text-gray-400'}`}>{language === 'ta' ? 'லாகின்' : 'Login'}</button>
                    <button onClick={() => setMode('REGISTER')} className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${mode === 'REGISTER' ? 'bg-white text-zinc-600 shadow-sm' : 'text-gray-400'}`}>{language === 'ta' ? 'புதிய கணக்கு' : 'Sign Up'}</button>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                  {mode === 'REGISTER' && (
                      <>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border focus:border-zinc-200" placeholder={language === 'ta' ? 'உங்கள் பெயர்' : 'Name'} required />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border focus:border-zinc-200" placeholder={language === 'ta' ? 'இமெயில்' : 'Email'} required />
                        <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border focus:border-zinc-200" placeholder={language === 'ta' ? 'மொபைல் எண் (உ-ம்: 9876543210)' : 'Mobile Number'} required />
                      </>
                  )}
                  {mode === 'LOGIN' && (
                      <input type="text" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border focus:border-zinc-200" placeholder={language === 'ta' ? 'இமெயில் அல்லது மொபைல் எண்' : 'Email or Mobile Number'} required />
                  )}
                  {mode === 'FORGOT' && (
                      <input type="email" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border focus:border-zinc-200" placeholder={language === 'ta' ? 'இமெயில்' : 'Email'} required />
                  )}
                  {mode !== 'FORGOT' && <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none border focus:border-zinc-200" placeholder={language === 'ta' ? 'கடவுச்சொல்' : 'Password'} required />}
                  
                  <button disabled={isLoading} className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition">
                      {isLoading ? <Loader2 className="animate-spin mx-auto"/> : mode === 'LOGIN' ? (language === 'ta' ? 'உள்நுழைய' : 'Login') : mode === 'REGISTER' ? (language === 'ta' ? 'கணக்கை உருவாக்கு' : 'Sign Up') : (language === 'ta' ? 'லிங்க் அனுப்பு' : 'Send Reset Link')}
                  </button>
                </form>
                
                {mode === 'LOGIN' && (
                   <div className="mt-4 text-center">
                       <button type="button" onClick={() => setMode('FORGOT')} className="text-sm font-bold text-gray-400 hover:text-zinc-600 transition">{language === 'ta' ? 'கடவுச்சொல் மறந்துவிட்டதா?' : 'Forgot Password?'}</button>
                   </div>
                )}
                
                {mode === 'FORGOT' && (
                   <div className="mt-4 text-center">
                       <button type="button" onClick={() => setMode('LOGIN')} className="text-sm font-bold text-gray-400 hover:text-zinc-600 transition">{language === 'ta' ? 'மீண்டும் லாகின் செய்ய' : 'Back to Login'}</button>
                   </div>
                )}

                {!isModal && (
                    <div className="mt-6 text-center border-t pt-4">
                        <button type="button" onClick={() => onLogin({ uid: '', email: 'guest@viyabaari.local', name: 'Guest', isLoggedIn: false })} className="text-zinc-600 font-bold text-sm hover:underline w-full">{language === 'ta' ? 'கணக்கு இல்லாமல் தொடர (Offline)' : 'Guest Mode (Offline)'}</button>
                    </div>
                )}
         </div>
    );

    if (isModal) {
        return content;
    }

    return (
      <div className="min-h-screen bg-zinc-600 flex flex-col items-center justify-center p-6 text-white">
         <h1 className="text-4xl font-black tamil-font mb-8">உற்பத்தியாளர்/manufacturer</h1>
         {content}
      </div>
    );
};

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
