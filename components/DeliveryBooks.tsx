import React, { useState, useEffect, useCallback } from 'react';
import { User, DeliveryBook } from '../types';
import { Plus, Trash2, ArrowLeft, BookOpen, Users, Box } from 'lucide-react';
import DeliverySlipForm from './DeliverySlipForm';

interface DeliveryBooksProps {
  user: User;
  language: 'ta' | 'en';
  onBack: () => void;
  onNavigate: (tab: any) => void;
}

const DeliveryBooks: React.FC<DeliveryBooksProps> = ({ user, language, onBack, onNavigate }) => {
  const [customBooks, setCustomBooks] = useState<DeliveryBook[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [activeSlipConfig, setActiveSlipConfig] = useState<{ type: 'warper' | 'weaver', category?: 'warp' | 'weft' | 'zari' } | null>(null);

  // Sync sub-views with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (activeSlipConfig) { setActiveSlipConfig(null); return; }
      if (isAdding) { setIsAdding(false); return; }
    };

    const anySubViewOpen = activeSlipConfig || isAdding;
    if (anySubViewOpen && !window.history.state?.subview) {
      window.history.pushState({ subview: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeSlipConfig, isAdding]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [activeSlipConfig, isAdding]);

  const loadData = useCallback(() => {
    const saved = localStorage.getItem(`viyabaari_delivery_books_${user.uid || 'guest'}`);
    if (saved) {
      try {
        setCustomBooks(JSON.parse(saved));
      } catch (e) {}
    }
  }, [user.uid]);

  useEffect(() => {
    loadData();
    window.addEventListener('local-storage-update', loadData);
    return () => window.removeEventListener('local-storage-update', loadData);
  }, [loadData]);

  const saveBooks = (newBooks: DeliveryBook[]) => {
    setCustomBooks(newBooks);
    localStorage.setItem(`viyabaari_delivery_books_${user.uid || 'guest'}`, JSON.stringify(newBooks));
  };

  const handleAdd = () => {
    if (!newBookName.trim()) return;
    const newBook: DeliveryBook = {
      id: Date.now().toString(),
      name: newBookName,
      createdAt: Date.now()
    };
    saveBooks([...customBooks, newBook]);
    setNewBookName('');
    setIsAdding(false);
  };


  if (activeSlipConfig) {
    return (
      <DeliverySlipForm 
        user={user} 
        language={language} 
        type={activeSlipConfig.type} 
        initialCategory={activeSlipConfig.category}
        onBack={() => setActiveSlipConfig(null)} 
      />
    );
  }

  return (
    <div className="p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-black tamil-font text-gray-800">
            {language === 'ta' ? 'டெலிவரி புத்தகம்' : 'Delivery Books'}
          </h2>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-rose-600 text-white px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-md hover:bg-rose-700 transition"
        >
          <Plus size={14} /> {language === 'ta' ? 'புதிய புத்தகம் சேர்+' : 'Add New Book+'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div 
          onClick={() => setActiveSlipConfig({ type: 'weaver' })}
          className="bg-white p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition border border-zinc-200 group"
        >
          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner border border-indigo-100">
            <Users size={32} />
          </div>
          <div>
            <h4 className="font-black text-zinc-900 text-sm tamil-font tracking-tight leading-tight">{language === 'ta' ? 'தறிக்காரர் டெலிவரி' : 'Weaver Delivery'}</h4>
            <p className="text-[10px] text-zinc-400 font-bold mt-1 leading-tight">{language === 'ta' ? 'நூல் கொடுக்க' : 'Yarn given'}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveSlipConfig({ type: 'warper' })}
          className="bg-white p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:border-purple-300 hover:shadow-md transition border border-zinc-200 group"
        >
          <div className="bg-purple-50 p-4 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-inner border border-purple-100">
            <Users size={32} />
          </div>
          <div>
            <h4 className="font-black text-zinc-900 text-sm tamil-font tracking-tight leading-tight">{language === 'ta' ? 'வார்ப்பு காரர் டெலிவரி' : 'Warper Delivery'}</h4>
            <p className="text-[10px] text-zinc-400 font-bold mt-1 leading-tight">{language === 'ta' ? 'நூல் கொடுக்க' : 'Yarn given'}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveSlipConfig({ type: 'weaver', category: 'zari' })}
          className="bg-white p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition border border-zinc-200 group"
        >
          <div className="bg-amber-50 p-4 rounded-2xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors shadow-inner border border-amber-100">
            <Box size={32} />
          </div>
          <div>
            <h4 className="font-black text-zinc-900 text-sm tamil-font tracking-tight leading-tight">{language === 'ta' ? 'ஜரிகை தறி டெலிவரி' : 'Zari Weaver Delivery'}</h4>
            <p className="text-[10px] text-zinc-400 font-bold mt-1 leading-tight">{language === 'ta' ? 'ஜரிகை கொடுக்க' : 'Zari given'}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveSlipConfig({ type: 'warper', category: 'zari' })}
          className="bg-white p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:border-orange-300 hover:shadow-md transition border border-zinc-200 group"
        >
          <div className="bg-orange-50 p-4 rounded-2xl text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors shadow-inner border border-orange-100">
            <Box size={32} />
          </div>
          <div>
            <h4 className="font-black text-zinc-900 text-sm tamil-font tracking-tight leading-tight">{language === 'ta' ? 'ஜரிகை வார்ப்பு டெலிவரி' : 'Zari Warper Delivery'}</h4>
            <p className="text-[10px] text-zinc-400 font-bold mt-1 leading-tight">{language === 'ta' ? 'ஜரிகை கொடுக்க' : 'Zari given'}</p>
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-3xl shadow-lg border border-zinc-200 mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-black text-gray-800 mb-4 tamil-font text-lg">{language === 'ta' ? 'புதிய டெலிவரி புத்தகம்' : 'New Delivery Book'}</h3>
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'புத்தகத்தின் பெயர்' : 'Book Name'}
            value={newBookName}
            onChange={e => setNewBookName(e.target.value)}
            className="w-full p-4 bg-gray-50 rounded-2xl mb-5 outline-none border border-gray-200 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition font-medium"
          />
          <div className="flex gap-3">
            <button onClick={handleAdd} className="flex-1 bg-rose-600 text-white py-3.5 rounded-2xl font-black shadow-md hover:bg-rose-700 transition">
              {language === 'ta' ? 'சேமி' : 'Save'}
            </button>
            <button onClick={() => setIsAdding(false)} className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-2xl font-black hover:bg-gray-200 transition">
              {language === 'ta' ? 'ரத்து' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {customBooks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-500 text-sm mb-3 tamil-font uppercase tracking-wider">{language === 'ta' ? 'மற்ற புத்தகங்கள்' : 'Other Books'}</h3>
          {customBooks.map(book => (
            <div key={book.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-rose-200 text-rose-700 rounded-full flex items-center justify-center font-black text-xl shadow-inner">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h4 className="font-black text-gray-800 text-lg">{book.name}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryBooks;
