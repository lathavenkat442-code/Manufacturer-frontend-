
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StockItem, StockVariant } from '../types';
import { Search, Filter, Package, AlertTriangle, Share2, X, ChevronLeft, ChevronRight, Info, History, LayoutGrid, List, Plus, MoreVertical } from 'lucide-react';
import { TRANSLATIONS, CATEGORIES } from '../constants';
import { useLongPress } from '../lib/hooks';

const getTamilHistoryDescription = (desc: string) => {
    if (desc.includes('Created')) return 'உருவாக்கப்பட்டது';
    if (desc.includes('Stock changed')) return 'இருப்பு மாற்றப்பட்டது';
    if (desc.includes('Price changed')) return 'விலை மாற்றப்பட்டது';
    if (desc.includes('Initial stock')) return 'தொடக்க இருப்பு';
    return desc;
};

// --- Stock Detail Full Screen Modal ---
const StockDetailView: React.FC<{ item: StockItem; onClose: () => void; onShare: () => void; language: 'ta' | 'en' }> = ({ item, onClose, onShare, language }) => {
    const [activeSlide, setActiveSlide] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Sync scroll with active slide state
    const handleScroll = () => {
        if (scrollRef.current) {
            const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.clientWidth);
            setActiveSlide(index);
        }
    };

    const variants = item.variants || [];
    const totalQty = variants.reduce((acc, v) => acc + v.sizeStocks.reduce((sum, s) => sum + s.quantity, 0), 0);
    const history = item.history || [];

    const getSleeveLabel = (sleeve: string) => {
        if (sleeve === 'Full Hand') return language === 'ta' ? 'முழுக்கை' : 'Full Hand';
        if (sleeve === 'Half Hand') return language === 'ta' ? 'அரைக்கை' : 'Half Hand';
        return sleeve;
    };

    const currentVariant = variants[activeSlide];

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-20 border-b border-zinc-100">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 transition-colors">
                    <ChevronLeft size={28} className="text-zinc-700" />
                </button>
                <h2 className="font-black text-lg text-zinc-900 truncate max-w-[60%] text-center tracking-tight">{item.name}</h2>
                <div className="flex gap-2">
                    <button onClick={onShare} className="p-2 rounded-full bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors"><Share2 size={20} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-24 md:pb-4">
                {/* Large Image Carousel */}
                <div className="relative w-full aspect-square bg-slate-50">
                    <div 
                        ref={scrollRef}
                        onScroll={handleScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full h-full"
                    >
                        {variants.length > 0 ? (
                            variants.map((v, idx) => (
                                <div key={idx} className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center p-4">
                                    {v.imageUrl ? (
                                        <img src={v.imageUrl} alt="" className="w-full h-full object-contain drop-shadow-sm" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={64} /></div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Package size={64} />
                            </div>
                        )}
                    </div>
                    {/* Pagination Dots */}
                    {variants.length > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                            {variants.map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === activeSlide ? 'bg-white scale-125' : 'bg-white/50'}`} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block px-3 py-1 bg-zinc-100 text-zinc-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-2 border border-zinc-200">
                                    {item.category}
                                </span>
                                <h1 className="text-2xl font-black text-zinc-900 leading-tight tracking-tight">{item.name}</h1>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-black text-zinc-900 tracking-tight">₹{item.price}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                             <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{language === 'ta' ? 'மொத்த இருப்பு' : 'Total Stock'}</p>
                             <p className="text-2xl font-black text-zinc-900 tracking-tight">{totalQty}</p>
                        </div>
                        <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                             <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{language === 'ta' ? 'கடைசியாக அப்டேட்' : 'Last Updated'}</p>
                             <p className="text-sm font-bold text-zinc-800 mt-1">
                                {new Date(item.lastUpdated).toLocaleDateString()}
                             </p>
                        </div>
                    </div>

                    {/* Detailed Stock Breakdown - Only for Active Slide */}
                    <div>
                        <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2 tracking-tight">
                            <Package size={18} className="text-zinc-500"/> 
                            {language === 'ta' ? 'ஸ்டாக் விவரங்கள்' : 'Stock Details'}
                            <span className="text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                                #{activeSlide + 1}
                            </span>
                        </h3>
                        
                        <div className="space-y-4">
                            {currentVariant && (
                                <div className="border border-zinc-300 bg-zinc-50/50 rounded-2xl p-4 flex gap-4 transition-all animate-in fade-in slide-in-from-bottom-2 shadow-sm">
                                    <div className="w-20 h-20 bg-white rounded-xl border border-zinc-200 flex-shrink-0 overflow-hidden shadow-sm">
                                        {currentVariant.imageUrl ? (
                                            <img src={currentVariant.imageUrl} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-zinc-300"/></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-col gap-2">
                                            {currentVariant.sizeStocks.length > 0 ? currentVariant.sizeStocks.map((ss, sIdx) => (
                                                <div key={sIdx} className="bg-white border border-zinc-200 px-3 py-3 rounded-xl text-sm font-bold text-zinc-800 shadow-sm flex items-center justify-between">
                                                    <div className="flex gap-2 items-center flex-wrap">
                                                        {ss.color && (
                                                            <span className="text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded text-xs border border-zinc-200">{ss.color}</span>
                                                        )}
                                                        
                                                        {ss.sleeve && (
                                                            <>
                                                                <span className="text-zinc-300">•</span>
                                                                <span className="text-zinc-700 font-black">{getSleeveLabel(ss.sleeve)}</span>
                                                            </>
                                                        )}
                                                        
                                                        {(ss.size && ss.size !== 'General') && (
                                                            <>
                                                                <span className="text-zinc-300">•</span>
                                                                <span className="text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded text-xs border border-zinc-200">{ss.size}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="bg-zinc-900 text-white px-3 py-1 rounded-lg text-xs tracking-wide">
                                                        Qty: {ss.quantity}
                                                    </div>
                                                </div>
                                            )) : (
                                                <span className="text-xs text-rose-500 font-bold italic">Out of Stock</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* History Section */}
                    {history.length > 0 && (
                       <div className="mt-6 border-t border-gray-100 pt-6">
                           <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                               <History size={18} className="text-gray-400"/>
                               {language === 'ta' ? 'வரலாறு (History)' : 'History'}
                           </h3>
                           <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 pl-1">
                               {history.map((h, i) => (
                                   <div key={i} className="relative pl-8 animate-in slide-in-from-bottom-2 fade-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                       <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${
                                           h.action === 'CREATED' ? 'bg-green-500' : 
                                           h.action === 'PRICE_CHANGE' ? 'bg-orange-500' :
                                           h.action === 'STOCK_CHANGE' ? 'bg-blue-500' : 'bg-gray-400'
                                       }`}></div>
                                       
                                       <p className="text-xs font-bold text-gray-800">
                                           {language === 'ta' ? getTamilHistoryDescription(h.description) : h.description}
                                       </p>
                                       {h.change && (
                                           <p className="text-[10px] font-mono text-gray-500 mt-1 bg-gray-50 inline-block px-2 py-0.5 rounded border border-gray-100">
                                               {h.change}
                                           </p>
                                       )}
                                       <p className="text-[9px] text-gray-400 mt-1 font-medium">
                                           {new Date(h.date).toLocaleString(language)}
                                       </p>
                                   </div>
                               ))}
                           </div>
                       </div>
                    )}
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 w-full p-4 bg-white border-t border-zinc-200 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                 <button onClick={onClose} className="flex-1 py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-colors">
                    {language === 'ta' ? 'மூடுக' : 'Close'}
                 </button>
            </div>
        </div>
    );
};

const InventoryCard: React.FC<{ item: StockItem; onClick: () => void; onShare: () => void; language: 'ta' | 'en'; viewMode: 'grid' | 'list' }> = ({ item, onClick, onShare, language, viewMode }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Use IntersectionObserver for robust active slide detection on mobile
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = Number(entry.target.getAttribute('data-index'));
                        if (!isNaN(index)) {
                            setCurrentImageIndex(index);
                        }
                    }
                });
            },
            {
                root: container,
                threshold: 0.6 // Trigger when 60% of the item is visible
            }
        );

        const children = container.querySelectorAll('[data-index]');
        children.forEach(child => observer.observe(child));

        return () => observer.disconnect();
    }, [item.variants]);

    const variants = item.variants || [];
    const activeVariant: StockVariant | undefined = variants[currentImageIndex] || variants[0];
    
    // Total calculation
    const totalQty = variants.reduce((acc, v) => acc + v.sizeStocks.reduce((sum, s) => sum + s.quantity, 0), 0);
    const isLow = variants.some(v => v.sizeStocks.some(ss => ss.quantity < 5));

    const getSleeveShort = (sleeve: string) => {
        if (sleeve === 'Full Hand') return language === 'ta' ? 'முழு' : 'Full';
        if (sleeve === 'Half Hand') return language === 'ta' ? 'அரை' : 'Half';
        return '';
    };

    if (viewMode === 'list') {
        return (
            <div 
                onClick={onClick}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border flex items-center p-3 gap-4 transition-transform active:scale-[0.98] cursor-pointer ${isLow ? 'border-red-100 ring-1 ring-red-50' : 'border-gray-100'}`}
            >
                <div className="w-20 h-20 bg-slate-50 rounded-xl flex-shrink-0 relative overflow-hidden">
                    {activeVariant?.imageUrl ? (
                        <img src={activeVariant.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={24} /></div>
                    )}
                    {isLow && <div className="absolute top-1 left-1 bg-red-500 w-2 h-2 rounded-full shadow-sm animate-pulse" />}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <div>
                            <h4 className="font-bold text-gray-800 text-sm truncate">{item.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.category}</p>
                        </div>
                        <p className="text-sm font-black text-gray-900 bg-gray-50 px-2 py-0.5 rounded-lg">₹{item.price}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex gap-2 text-[10px] text-gray-500">
                             <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                {variants.length} {language === 'ta' ? 'வகைகள்' : 'Variants'}
                             </span>
                        </div>
                        <div className="flex flex-col items-end">
                             <span className="text-[8px] text-gray-400 font-black uppercase">{language === 'ta' ? 'மொத்தம்' : 'Total'}</span>
                             <span className={`font-black text-sm leading-none ${isLow ? 'text-red-500' : 'text-zinc-600'}`}>{totalQty}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            onClick={onClick}
            className={`bg-white rounded-[2rem] shadow-sm overflow-hidden border flex flex-col transition-transform active:scale-[0.98] cursor-pointer ${isLow ? 'border-rose-200 ring-1 ring-rose-100' : 'border-zinc-200 hover:border-zinc-300'}`}
        >
            {/* Image Box - Horizontal Scroll like Flipkart */}
            <div className="relative h-48 bg-zinc-50 group">
                <div 
                    ref={scrollRef}
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide h-full w-full"
                    onClick={(e) => e.stopPropagation()} 
                >
                    {variants.length > 0 ? (
                        variants.map((v, idx) => (
                            <div 
                                key={v.id || idx} 
                                data-index={idx}
                                className="flex-shrink-0 w-full h-full snap-center flex items-center justify-center p-2 relative"
                                onClick={onClick} 
                            >
                                {v.imageUrl ? (
                                    <img src={v.imageUrl} alt={`${item.name} ${idx}`} className="w-full h-full object-contain rounded-xl" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Package size={32} />
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package size={32} />
                        </div>
                    )}
                </div>
                
                {variants.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10 bg-black/10 px-2 py-1 rounded-full backdrop-blur-[2px]">
                        {variants.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50'}`}></div>
                        ))}
                    </div>
                )}
                
                {isLow && (
                    <div className="absolute top-3 left-3 bg-rose-500 text-white p-1.5 rounded-full shadow-lg z-10 animate-pulse">
                        <AlertTriangle size={14} />
                    </div>
                )}
                
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                    <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="bg-white/90 backdrop-blur-sm p-2 rounded-xl text-zinc-600 shadow-sm border border-zinc-200 hover:bg-zinc-50 transition-colors"><Share2 size={16} /></button>
                </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col">
                <div className="mb-2">
                    <h4 className="font-black text-zinc-900 text-sm leading-tight truncate tracking-tight">{item.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">{item.category}</p>
                </div>

                {/* Size-wise stock breakdown for ACTIVE VARIANT */}
                <div className="bg-zinc-50 p-2 rounded-xl mb-3 min-h-[60px] flex flex-col justify-center transition-all duration-300 border border-zinc-100">
                    <p className="text-[9px] text-zinc-500 font-bold mb-1.5 uppercase text-center flex items-center justify-center gap-1">
                        {language === 'ta' ? 'ஸ்டாக் விவரம்' : 'Stock info'}
                        <span className="bg-zinc-200 text-zinc-700 px-1.5 rounded text-[8px]">#{currentImageIndex + 1}</span>
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center">
                        {activeVariant && activeVariant.sizeStocks.length > 0 ? (
                            activeVariant.sizeStocks.map((ss, i) => (
                                <div key={i} className={`text-[9px] font-black px-2 py-1 rounded-lg flex gap-1 border shadow-sm ${ss.quantity < 5 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-white text-zinc-700 border-zinc-200'}`}>
                                    {/* Show color if exists, else size */}
                                    {ss.color ? (
                                        <>
                                            <span>{ss.color}</span>
                                            
                                            {/* Sleeve Info (Shortened) */}
                                            {ss.sleeve && (
                                                <span className="text-zinc-500 text-[8px] mx-0.5">
                                                    ({getSleeveShort(ss.sleeve)})
                                                </span>
                                            )}

                                            {ss.size && ss.size !== 'General' && <span className="text-zinc-400 text-[8px]"> {ss.size}</span>}
                                            <span className="text-zinc-300">|</span>
                                        </>
                                    ) : (
                                        <span>{ss.size}:</span>
                                    )}
                                    <span>{ss.quantity}</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-[10px] text-zinc-400 italic font-medium py-1">-- No Stock --</span>
                        )}
                    </div>
                </div>
                
                <div className="mt-auto pt-3 border-t border-zinc-100 flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">{language === 'ta' ? 'மொத்தம்' : 'Total'}</span>
                        <span className={`font-black text-lg leading-none mt-0.5 ${isLow ? 'text-rose-500' : 'text-zinc-900'}`}>{totalQty}</span>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200 tracking-tight">₹{item.price}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const Inventory: React.FC<{ stocks: StockItem[]; onAdd: () => void; onBack: () => void; language: 'ta' | 'en' }> = ({ stocks, onAdd, onBack, language }) => {
  const [search, setSearch] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewingItem, setViewingItem] = useState<StockItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Sync sub-views with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = () => {
      if (viewingItem) { setViewingItem(null); return; }
    };

    if (viewingItem) {
      window.history.pushState({ subview: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewingItem]);

  const t = TRANSLATIONS[language];

  const filtered = useMemo(() => {
    let result = stocks.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    if (filterLowStock) {
      result = result.filter(s => s.variants.some(v => v.sizeStocks.some(ss => ss.quantity < 5)));
    }
    if (selectedCategory !== 'All') {
      result = result.filter(s => s.category === selectedCategory);
    }
    return result;
  }, [stocks, search, filterLowStock, selectedCategory]);

  const handleShare = async (item: StockItem) => {
    try {
      const totalQty = item.variants.reduce((acc, v) => acc + v.sizeStocks.reduce((s, ss) => s + ss.quantity, 0), 0);
      
      // Construct detailed text with ALL variants
      let detailsText = "";
      item.variants.forEach((v, idx) => {
          // Enhaced text for sharing colors/sleeves
          const stocksText = v.sizeStocks.map(ss => {
              if (ss.color) return `${ss.color} ${ss.sleeve ? '('+ss.sleeve+')' : ''} ${ss.size && ss.size !== 'General' ? '['+ss.size+']' : ''}: ${ss.quantity}`;
              return `${ss.size}: ${ss.quantity}`;
          }).join(', ');
          detailsText += `\n📸 Model ${idx + 1}: ${stocksText || 'No Stock'}`;
      });

      const text = language === 'ta' 
        ? `🛍️ *${item.name}*\n💰 விலை: ₹${item.price}\n📦 வகை: ${item.category}\n\n📊 *ஸ்டாக் விவரம்:*${detailsText}\n\n🔢 மொத்த இருப்பு: ${totalQty}`
        : `🛍️ *${item.name}*\n💰 Price: ₹${item.price}\n📦 Category: ${item.category}\n\n📊 *Stock Details:*${detailsText}\n\n🔢 Total Stock: ${totalQty}`;

      const shareData: any = {
        title: item.name,
        text: text,
      };

      // Collect ALL images
      const files: File[] = [];
      const validVariants = item.variants.filter(v => v.imageUrl && v.imageUrl.startsWith('data:'));

      // Process images (Limit to 10 to avoid browser crash/limit issues)
      const maxImages = Math.min(validVariants.length, 10);
      
      for (let i = 0; i < maxImages; i++) {
          try {
              const res = await fetch(validVariants[i].imageUrl);
              const blob = await res.blob();
              // Clean filename
              const filename = `${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${i+1}.png`;
              files.push(new File([blob], filename, { type: blob.type }));
          } catch (e) {
              console.error(`Failed to process image ${i}`, e);
          }
      }

      if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
        shareData.files = files;
      }

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert(language === 'ta' ? 'ஷேர் செய்யும் வசதி உங்கள் மொபைலில் இல்லை.' : 'Sharing not supported on this device.');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Share canceled by user');
        return;
      }
      console.error('Error sharing:', err);
      alert(language === 'ta' ? 'ஷேர் செய்ய முடியவில்லை. குறைவான படங்களை முயற்சிக்கவும்.' : 'Could not share. Try with fewer images.');
    }
  };

  return (
    <div className="p-4 space-y-4 pb-24 md:pb-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm border border-zinc-200 hover:bg-zinc-50 transition-colors">
          <ChevronLeft size={20} className="text-zinc-600" />
        </button>
        <h2 className="text-2xl font-black tamil-font text-zinc-900 tracking-tight">
          {language === 'ta' ? 'சரக்கு' : 'Stock'}
        </h2>
      </div>

      <div className="flex gap-2 sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-md pb-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={language === 'ta' ? 'சரக்கு தேடவும்...' : 'Search items...'} className="w-full pl-11 p-3.5 bg-white border border-zinc-200 rounded-2xl outline-none shadow-sm focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 text-zinc-900 font-medium transition-all" />
        </div>
        <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-3.5 rounded-2xl border bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm">
          {viewMode === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
        </button>
        <button onClick={() => setFilterLowStock(!filterLowStock)} className={`p-3.5 rounded-2xl border transition-all shadow-sm ${filterLowStock ? 'bg-rose-500 text-white border-rose-500 shadow-rose-500/20' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}>
          <Filter size={20} />
        </button>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        <button 
          onClick={() => setSelectedCategory('All')} 
          className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${selectedCategory === 'All' ? 'bg-zinc-900 text-white shadow-md' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
        >
          {language === 'ta' ? 'அனைத்தும்' : 'All'}
        </button>
        {CATEGORIES.map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)} 
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-zinc-900 text-white shadow-md' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" : "flex flex-col gap-3"}>
        {filtered.map(item => (
            <InventoryCard 
                key={item.id} 
                item={item} 
                onClick={() => setViewingItem(item)}
                onShare={() => handleShare(item)}
                language={language}
                viewMode={viewMode}
            />
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[2.5rem] border-2 border-dashed border-zinc-200 mx-2">
           <Package size={60} className="mx-auto mb-4 text-zinc-300" />
           <p className="tamil-font text-zinc-500 font-bold">{language === 'ta' ? 'சரக்கு ஏதும் இல்லை' : 'No items matching your search'}</p>
        </div>
      )}

      {/* Full Screen Detail Modal */}
      {viewingItem && (
          <StockDetailView 
             item={viewingItem} 
             onClose={() => setViewingItem(null)}
             onShare={() => handleShare(viewingItem)}
             language={language}
          />
      )}

      {/* Add Stock Floating Button */}
      <button 
        onClick={onAdd}
        className="fixed bottom-20 right-6 text-white p-4.5 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-30 border-none group bg-indigo-600 hover:bg-indigo-700"
      >
        <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default Inventory;
