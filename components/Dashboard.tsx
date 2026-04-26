
import React, { useState, useEffect } from 'react';
import { StockItem, Transaction, User } from '../types';
import { TRANSLATIONS } from '../constants';
import { TrendingUp, TrendingDown, Package, Sparkles, Lightbulb, Database, ChevronRight, Users, Box, BookOpen, ArrowLeftRight, User as UserIcon } from 'lucide-react';
import { getBusinessInsights } from '../services/geminiService';
import { isSupabaseConfigured } from '../supabaseClient';

const Dashboard: React.FC<{ stocks: StockItem[]; transactions: Transaction[]; language: 'ta' | 'en'; user: User; onSetupServer: () => void; onNavigate: (tab: any) => void }> = ({ stocks, transactions, language, user, onSetupServer, onNavigate }) => {
  const [tips, setTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  
  const hasApiKey = (() => {
    try { return typeof process !== 'undefined' && process.env && !!process.env.API_KEY; } catch { return false; }
  })();

  const t = TRANSLATIONS[language];

  useEffect(() => {
    const fetchTips = async () => {
      setLoadingTips(true);
      const newTips = await getBusinessInsights(stocks, transactions);
      setTips(newTips || []);
      setLoadingTips(false);
    };
    const timer = setTimeout(fetchTips, 500);
    return () => clearTimeout(timer);
  }, [stocks.length, transactions.length]); 

  const isGuestOrOffline = !isSupabaseConfigured || user?.email?.includes('guest') || !user?.uid;

  return (
    <div className="p-4 md:p-0 space-y-6">
      {isGuestOrOffline && (
        <div onClick={onSetupServer} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between cursor-pointer shadow-sm hover:bg-amber-100 transition-colors">
            <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Database size={20} /></div>
                <div>
                    <h3 className="font-bold text-amber-900 text-sm tamil-font tracking-tight">{language === 'ta' ? 'ஆன்லைன் அக்கவுண்ட் இணைக்க' : 'Connect Cloud Database'}</h3>
                    <p className="text-xs text-amber-700 font-medium">{language === 'ta' ? 'தரவுகளை ஆன்லைனில் சேமிக்க கிளிக் செய்யவும்' : 'Sync data online'}</p>
                </div>
            </div>
            <ChevronRight size={18} className="text-amber-500" />
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div onClick={() => onNavigate('stock')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-indigo-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <Package size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'சரக்கு' : 'Stock'}
          </p>
        </div>
        <div onClick={() => onNavigate('accounts')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-emerald-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <ArrowLeftRight size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'கணக்கு' : 'Accounts'}
          </p>
        </div>
        <div onClick={() => onNavigate('weavers')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-violet-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <Users size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'நெசவாளர் கணக்குகள்' : 'Weaver Accounts'}
          </p>
        </div>
        <div onClick={() => onNavigate('warpers')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-fuchsia-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <Users size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'வார்ப்பர் கணக்குகள்' : 'Warper Accounts'}
          </p>
        </div>
        <div onClick={() => onNavigate('yarns')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-amber-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <Box size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'நூல் கணக்குகள்' : 'Yarns Accounts'}
          </p>
        </div>
        <div onClick={() => onNavigate('delivery-books')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-cyan-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <BookOpen size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'டெலிவரி புத்தகம்' : 'Delivery Book'}
          </p>
        </div>
        <div onClick={() => onNavigate('all-yarns')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-rose-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <Box size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'அனைத்து நூல் கணக்குகள்' : 'All Yarns Accounts'}
          </p>
        </div>
        <div onClick={() => onNavigate('suppliers')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-sky-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <UserIcon size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'சப்ளையர்கள்' : 'Suppliers'}
          </p>
        </div>
        <div onClick={() => onNavigate('customers')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-teal-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <UserIcon size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Customers'}
          </p>
        </div>
        <div onClick={() => onNavigate('profile')} className="p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-md transition-all border border-zinc-200 group text-white bg-slate-600">
          <div className="bg-white/20 p-3.5 rounded-full text-white transition-colors border border-white/30 backdrop-blur-sm">
            <UserIcon size={24} />
          </div>
          <p className="font-bold text-sm text-center tamil-font tracking-tight">
            {language === 'ta' ? 'சுயவிவரம்' : 'Profile'}
          </p>
        </div>
      </div>

      {hasApiKey && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-200 pb-24 md:pb-6">
          <div className="flex items-center gap-3 mb-6 border-b border-zinc-100 pb-4">
            <div className="bg-zinc-100 p-2.5 rounded-xl border border-zinc-200"><Sparkles className="text-zinc-700" size={22} /></div>
            <h3 className="font-black text-lg text-zinc-900 tamil-font tracking-tight">{language === 'ta' ? 'வியாபார ஆலோசனைகள் (AI)' : 'Business Insights (AI)'}</h3>
          </div>
          {loadingTips ? (
            <div className="space-y-4">
              <div className="h-20 bg-zinc-100 rounded-xl animate-pulse"></div>
              <div className="h-20 bg-zinc-100 rounded-xl animate-pulse"></div>
            </div>
          ) : tips.length > 0 ? (
            <div className="space-y-4">
              {tips.map((tip, i) => (
                <div key={i} className="flex gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors">
                  <Lightbulb className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-zinc-700 leading-relaxed font-medium">{tip}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 bg-zinc-50 rounded-xl border border-zinc-100">
              <p className="text-zinc-500 text-sm font-medium">{language === 'ta' ? 'போதுமான தரவுகள் இல்லை' : 'Not enough data for insights'}</p>
            </div>
          )}
        </div>
      )}

      <div className="pb-24 md:pb-6">
        <h3 className="font-bold text-zinc-800 mb-4 tamil-font tracking-tight">{language === 'ta' ? 'சமீபத்திய வரவு செலவு' : 'Recent Transactions'}</h3>
        <div className="space-y-3">
          {transactions.slice(0, 5).map(txn => (
            <div key={txn?.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-zinc-200 hover:border-zinc-300 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-full ${txn?.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {txn?.type === 'INCOME' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </div>
                <div>
                    <p className="font-bold text-zinc-800 tracking-tight">{txn?.description || txn?.category}</p>
                    <p className="text-xs text-zinc-500 font-medium mt-0.5">{txn?.date ? new Date(txn.date).toLocaleDateString(language) : ''}</p>
                </div>
              </div>
              <p className={`font-black text-lg tracking-tight ${txn?.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {txn?.type === 'INCOME' ? '+' : '-'} ₹{txn?.amount || 0}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
