import React, { useState, useEffect, useCallback } from 'react';
import { User, YarnSupplier, YarnEntry } from '../types';
import { YARN_TYPES, YARN_COLORS } from '../constants';
import { Plus, User as UserIcon, ArrowLeft, Building2, Layers, Scissors, Calendar, FileText, Hash, Palette, Weight } from 'lucide-react';
import { saveDataAndSync, deleteDataAndSync } from '../lib/supabaseSync';

interface YarnsAccountsProps {
  user: User;
  language: 'ta' | 'en';
  onBack: () => void;
}

const YarnsAccounts: React.FC<YarnsAccountsProps> = ({ user, language, onBack }) => {
  const [suppliers, setSuppliers] = useState<YarnSupplier[]>([]);
  const [entries, setEntries] = useState<YarnEntry[]>([]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [selectedSupplier, setSelectedSupplier] = useState<YarnSupplier | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'warp' | 'weft' | null>(null);
  
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [entryYarnType, setEntryYarnType] = useState('');
  const [entryWeight, setEntryWeight] = useState('');
  const [entryColor, setEntryColor] = useState('');
  const [entryReceipt, setEntryReceipt] = useState('');

  // Sync sub-views with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (isAdding) { setIsAdding(false); return; }
      if (isAddingEntry) { setIsAddingEntry(false); return; }
      if (selectedCategory) { setSelectedCategory(null); return; }
      if (selectedSupplier) { setSelectedSupplier(null); return; }
    };

    const anySubViewOpen = isAdding || isAddingEntry || selectedCategory || selectedSupplier;
    if (anySubViewOpen) {
      window.history.pushState({ subview: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdding, isAddingEntry, selectedCategory, selectedSupplier]);

  const loadData = useCallback(() => {
    const savedSuppliers = localStorage.getItem(`viyabaari_yarn_suppliers_${user.uid || 'guest'}`);
    if (savedSuppliers) {
      try {
        setSuppliers(JSON.parse(savedSuppliers));
      } catch (e) {}
    }
    
    const savedEntries = localStorage.getItem(`viyabaari_yarn_entries_${user.uid || 'guest'}`);
    if (savedEntries) {
      try {
        setEntries(JSON.parse(savedEntries));
      } catch (e) {}
    }
  }, [user.uid]);

  useEffect(() => {
    loadData();
    window.addEventListener('local-storage-update', loadData);
    return () => window.removeEventListener('local-storage-update', loadData);
  }, [loadData]);

  const saveSuppliers = (newSuppliers: YarnSupplier[]) => {
    setSuppliers(newSuppliers);
    saveDataAndSync(user.uid, `viyabaari_yarn_suppliers_${user.uid || 'guest'}`, newSuppliers, 'suppliers');
  };

  const saveEntries = (newEntries: YarnEntry[]) => {
    setEntries(newEntries);
    saveDataAndSync(user.uid, `viyabaari_yarn_entries_${user.uid || 'guest'}`, newEntries, 'yarn_entries');
  };

  const handleAdd = () => {
    if (!newName.trim() || !newCompanyName.trim()) return;
    const newSupplier: YarnSupplier = {
      id: Date.now().toString(),
      name: newName,
      companyName: newCompanyName,
      phone: newPhone,
      createdAt: Date.now()
    };
    saveSuppliers([...suppliers, newSupplier]);
    setNewName('');
    setNewCompanyName('');
    setNewPhone('');
    setIsAdding(false);
  };

  const handleAddEntry = () => {
    if (!entryDate || !entryYarnType || !entryWeight || !selectedSupplier || !selectedCategory) return;
    
    const weight = parseFloat(entryWeight);
    if (isNaN(weight)) {
      alert(language === 'ta' ? 'சரியான எடையை உள்ளிடவும்' : 'Please enter a valid weight');
      return;
    }
    
    const newEntry: YarnEntry = {
      id: Date.now().toString(),
      supplierId: selectedSupplier.id,
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
    setIsAddingEntry(false);
  };

  // Render Category View (Warp/Weft Entries)
  if (selectedSupplier && selectedCategory) {
    const categoryEntries = entries.filter(e => e.supplierId === selectedSupplier.id && e.yarnCategory === selectedCategory);
    const categoryName = selectedCategory === 'warp' 
      ? (language === 'ta' ? 'பாவு நூல்' : 'Warp Yarn')
      : (language === 'ta' ? 'ஊடை நூல்' : 'Weft Yarn');

    return (
      <div className="p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedCategory(null)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h2 className="text-xl font-black tamil-font text-gray-800">{categoryName}</h2>
              <p className="text-xs font-bold text-gray-500">{selectedSupplier.name}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAddingEntry(true)}
            className="bg-emerald-600 text-white px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-md hover:bg-emerald-700 transition"
          >
            <Plus size={14} /> {language === 'ta' ? 'புதிய வரவு+' : 'Add Entry+'}
          </button>
        </div>

        {isAddingEntry && (
          <div className="bg-white p-5 rounded-3xl shadow-lg border border-emerald-100 mb-6 animate-in fade-in slide-in-from-top-4">
            <h3 className="font-black text-gray-800 mb-4 tamil-font text-lg">{language === 'ta' ? 'புதிய வரவு' : 'New Entry'}</h3>
            
            <div className="space-y-3 mb-5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Calendar size={18} />
                </div>
                <input 
                  type="date" 
                  value={entryDate}
                  onChange={e => setEntryDate(e.target.value)}
                  className="w-full pl-11 p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition font-medium"
                />
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <FileText size={18} />
                </div>
                <select 
                  value={entryYarnType}
                  onChange={e => setEntryYarnType(e.target.value)}
                  className="w-full pl-11 p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition font-medium appearance-none"
                >
                  <option value="">{language === 'ta' ? 'என்ன நூல்' : 'Yarn Type'}</option>
                  {YARN_TYPES.map(yt => (
                    <option key={yt} value={yt}>{yt}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Weight size={18} />
                </div>
                <input 
                  type="number" 
                  placeholder={language === 'ta' ? 'எத்தனை கிலோ' : 'Weight (Kg)'}
                  value={entryWeight}
                  onChange={e => setEntryWeight(e.target.value)}
                  className="w-full pl-11 p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition font-medium"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Palette size={18} />
                </div>
                <select 
                  value={entryColor}
                  onChange={e => setEntryColor(e.target.value)}
                  className="w-full pl-11 p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition font-medium appearance-none"
                >
                  <option value="">{language === 'ta' ? 'என்ன கலர்' : 'Color'}</option>
                  {YARN_COLORS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Hash size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder={language === 'ta' ? 'ரசீது எண்' : 'Receipt Number'}
                  value={entryReceipt}
                  onChange={e => setEntryReceipt(e.target.value)}
                  className="w-full pl-11 p-4 bg-gray-50 rounded-2xl outline-none border border-gray-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition font-medium"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAddEntry} className="flex-1 bg-emerald-600 text-white py-3.5 rounded-2xl font-black shadow-md shadow-emerald-200 hover:bg-emerald-700 hover:shadow-lg transition">
                {language === 'ta' ? 'சேமி' : 'Save'}
              </button>
              <button onClick={() => setIsAddingEntry(false)} className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-black hover:bg-gray-200 transition">
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {categoryEntries.length === 0 && !isAddingEntry ? (
          <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold tamil-font text-lg">
              {language === 'ta' ? 'வரவுகள் எதுவும் இல்லை' : 'No entries yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {categoryEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
              <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-lg">
                    {new Date(entry.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'நூல்' : 'Yarn'}</p>
                    <p className="font-bold text-gray-800">{entry.yarnType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'கிலோ' : 'Weight'}</p>
                    <p className="font-bold text-gray-800">{entry.weightKg} kg</p>
                  </div>
                  {entry.color && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'கலர்' : 'Color'}</p>
                      <p className="font-bold text-gray-800">{entry.color}</p>
                    </div>
                  )}
                  {entry.receiptNumber && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'ரசீது எண்' : 'Receipt'}</p>
                      <p className="font-bold text-gray-800">{entry.receiptNumber}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render Category Selection View
  if (selectedSupplier) {
    return (
      <div className="p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => setSelectedSupplier(null)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h2 className="text-xl font-black text-gray-800">{selectedSupplier.name}</h2>
            <p className="text-sm font-bold text-gray-500">{selectedSupplier.companyName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => setSelectedCategory('warp')}
            className="bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition border border-zinc-200 group"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition shadow-inner border border-blue-100">
              <Layers size={32} />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 text-sm tamil-font tracking-tight">{language === 'ta' ? 'பாவு நூல்' : 'Warp Yarn'}</h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-wider">{language === 'ta' ? 'வரவுகளை பார்க்க' : 'View entries'}</p>
            </div>
          </div>

          <div 
            onClick={() => setSelectedCategory('weft')}
            className="bg-white p-6 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:border-purple-300 hover:shadow-md transition border border-zinc-200 group"
          >
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition shadow-inner border border-purple-100">
              <Scissors size={32} />
            </div>
            <div>
              <h3 className="font-black text-zinc-900 text-sm tamil-font tracking-tight">{language === 'ta' ? 'ஊடை நூல்' : 'Weft Yarn'}</h3>
              <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-wider">{language === 'ta' ? 'வரவுகளை பார்க்க' : 'View entries'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Suppliers List View
  return (
    <div className="p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-black tamil-font text-gray-800">
            {language === 'ta' ? 'நூல் கணக்குகள்' : 'Yarns Accounts'}
          </h2>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-amber-600 text-white px-5 py-2.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-100 hover:bg-amber-700 hover:shadow-xl transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> {language === 'ta' ? 'புதிய சப்ளையரை சேர்+' : 'Add Supplier+'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-3xl shadow-lg border border-zinc-100 mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-black text-gray-800 mb-4 tamil-font text-lg">{language === 'ta' ? 'புதிய சப்ளையர்' : 'New Supplier'}</h3>
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'சப்ளையர் பெயர்' : 'Supplier Name'}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full p-4 bg-gray-50 rounded-2xl mb-3 outline-none border border-gray-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition font-medium"
          />
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'கம்பெனி பெயர்' : 'Company Name'}
            value={newCompanyName}
            onChange={e => setNewCompanyName(e.target.value)}
            className="w-full p-4 bg-gray-50 rounded-2xl mb-3 outline-none border border-gray-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition font-medium"
          />
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'போன் நம்பர் (விருப்பப்பட்டால்)' : 'Phone (Optional)'}
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            className="w-full p-4 bg-gray-50 rounded-2xl mb-5 outline-none border border-gray-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition font-medium"
          />
          <div className="flex gap-4">
            <button onClick={handleAdd} className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-100 hover:bg-amber-700 hover:shadow-xl transition-all active:scale-[0.98]">
              {language === 'ta' ? 'சேமி' : 'Save'}
            </button>
            <button onClick={() => setIsAdding(false)} className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-2xl font-black hover:bg-zinc-200 transition-all">
              {language === 'ta' ? 'ரத்து' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {suppliers.length === 0 && !isAdding ? (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-emerald-300" />
          </div>
          <p className="text-gray-500 font-bold tamil-font text-lg">
            {language === 'ta' ? 'சப்ளையர்கள் யாரும் இல்லை' : 'No suppliers added yet'}
          </p>
          <p className="text-gray-400 text-sm mt-2 max-w-[200px] mx-auto">
            {language === 'ta' ? 'மேலே உள்ள பட்டனை தட்டி புதிய சப்ளையரை சேர்க்கவும்' : 'Tap the button above to add a new supplier'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map(supplier => (
            <div 
              key={supplier.id} 
              onClick={() => setSelectedSupplier(supplier)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 rounded-full flex items-center justify-center font-black text-xl shadow-inner">
                  {supplier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-black text-gray-800 text-lg">{supplier.name}</h4>
                  <p className="text-sm font-bold text-gray-500 mt-0.5">{supplier.companyName}</p>
                  {supplier.phone && <p className="text-xs font-bold text-gray-400 mt-0.5">{supplier.phone}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default YarnsAccounts;
