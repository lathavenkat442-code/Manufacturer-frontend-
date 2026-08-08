import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Warper, YarnDispatch, WarperReturn, WarpOrder, DenierFormula, Weaver, Supplier, WarpSection, Loom, LoomTransaction, WarpDesign, WarpType } from '../types';
import { Plus, User as UserIcon, Trash2, ArrowLeft, Calendar, Palette, Weight, PieChart, ArrowDownLeft, ArrowUpRight, CheckCircle, Clock, Settings, FileText, ChevronDown, ChevronUp, Search, Filter, Printer, X, Send, Share2, Edit2, FileDown, RefreshCw, BookOpen, Layers, LayoutGrid, ShoppingBag, Check } from 'lucide-react';
import { YARN_COLORS, YARN_TYPES } from '../constants';
import { shareText } from '../lib/utils';
import { useLongPress } from '../lib/hooks';
import { WarperStatementView } from './WarperStatementView';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2pdf from 'html2pdf.js';

interface WarpersProps {
  user: User;
  language: 'ta' | 'en';
  onBack: () => void;
  onAddTransaction?: (txn: any) => void;
}

// --- Item Background Colors ---
const ITEM_COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-violet-600',
  'bg-fuchsia-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-rose-600',
  'bg-sky-600',
  'bg-teal-600',
  'bg-slate-600',
  'bg-purple-600',
  'bg-orange-600'
];

interface WarperItemProps {
    warper: Warper;
    language: 'ta' | 'en';
    onClick: () => void;
    index: number;
}

const WarperItem: React.FC<WarperItemProps> = ({ warper, language, onClick, index }) => {
    const bgColor = ITEM_COLORS[index % ITEM_COLORS.length];

    return (
        <div 
            onClick={onClick}
            className={`${bgColor} p-5 rounded-[2rem] shadow-sm flex flex-col items-center justify-center gap-3 cursor-pointer hover:shadow-lg transition-all border border-white/20 group text-center active:scale-95 text-white`}
        >
            <div className="bg-white/20 p-4 rounded-2xl text-white group-hover:bg-white group-hover:text-indigo-600 transition-all shadow-inner border border-white/30 backdrop-blur-sm">
                <UserIcon size={24} />
            </div>
            <div>
                <h4 className="font-black text-white text-sm tracking-tight truncate max-w-[120px]">{warper.name}</h4>
                {warper.phone && <p className="text-[10px] font-bold text-white/70 mt-0.5 truncate max-w-[100px]">{warper.phone}</p>}
            </div>
        </div>
    );
};

const DispatchItem: React.FC<{
    dispatch: YarnDispatch;
    language: 'ta' | 'en';
}> = ({ dispatch, language }) => {
    return (
        <div 
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">{new Date(dispatch.date).toLocaleDateString()}</span>
                </div>
                <div className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                    {dispatch.yarnType}
                </div>
            </div>
            <div className="flex justify-between items-end">
                <div>
                    <p className="text-sm font-black text-gray-800">{dispatch.color}</p>
                    {dispatch.supplierName && (
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                            {language === 'ta' ? 'சப்ளையர்:' : 'Supplier:'} {dispatch.supplierName}
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-indigo-600">{dispatch.weightKg} kg</p>
                </div>
            </div>
        </div>
    );
};

const ReturnItem: React.FC<{
    ret: WarperReturn;
    language: 'ta' | 'en';
}> = ({ ret, language }) => {
    return (
        <div 
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-500">{new Date(ret.date).toLocaleDateString()}</span>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                    {language === 'ta' ? 'வரவு' : 'Return'}
                </div>
            </div>

            {ret.sections && ret.sections.length > 0 ? (
                <div className="space-y-3">
                    {ret.sections.map((sec, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                            <div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">{language === 'ta' ? 'கலர்' : 'Color'}</p>
                                <p className="font-bold text-gray-800 truncate">{sec.color}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">{language === 'ta' ? 'இழை' : 'Ends'}</p>
                                <p className="font-bold text-gray-800">{sec.ends}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 font-bold uppercase">{language === 'ta' ? 'கிலோ' : 'Weight'}</p>
                                <p className="font-bold text-gray-800">{sec.weightKg} kg</p>
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                        <p className="text-xs font-bold text-gray-500">{language === 'ta' ? 'மொத்த எடை:' : 'Total Weight:'}</p>
                        <p className="font-black text-indigo-600">{ret.weightKg} kg</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-3">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'கலர்' : 'Color'}</p>
                        <p className="font-bold text-gray-800">{ret.color}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'கிலோ' : 'Weight'}</p>
                        <p className="font-bold text-gray-800">{ret.weightKg} kg</p>
                    </div>
                    {ret.yarnType && (
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'டீனியர்' : 'Denier'}</p>
                            <p className="font-bold text-gray-800">{ret.yarnType}</p>
                        </div>
                    )}
                    {ret.ends && (
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'இழை' : 'Ends'}</p>
                            <p className="font-bold text-gray-800">{ret.ends}</p>
                        </div>
                    )}
                </div>
            )}

            {ret.weaverName && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'தறிகாரர்' : 'Weaver'}</p>
                    <p className="font-bold text-gray-800">{ret.weaverName}</p>
                </div>
            )}
        </div>
    );
};

const WarpOrderItem: React.FC<{
    order: WarpOrder;
    language: 'ta' | 'en';
    onAssign: () => void;
    onShare: () => void;
    onToggleStatus: () => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onRepeat?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}> = ({ order, language, onAssign, onShare, onToggleStatus, isExpanded, onToggleExpand, onRepeat, onEdit, onDelete }) => {
    return (
        <div 
            onClick={onToggleExpand}
            className={`bg-white rounded-3xl shadow-sm border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-zinc-300 ring-1 ring-zinc-100' : 'border-gray-100 hover:border-zinc-200'}`}
        >
            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${order.orderType === 'ZARI_BOBBIN' ? 'bg-amber-50 text-amber-600' : (order.orderType === 'TOP_WARP' ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-50 text-zinc-600')}`}>
                            {order.orderType === 'ZARI_BOBBIN' ? <Palette size={20} /> : <FileText size={20} />}
                        </div>
                        <div>
                            <h4 className="font-black text-gray-800 tracking-tight">{order.designName}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.orderNumber || order.id.slice(-4)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="p-1.5 bg-zinc-100 text-zinc-700 rounded-full hover:bg-zinc-200 transition"
                                title={language === 'ta' ? 'திருத்து' : 'Edit'}
                            >
                                <Edit2 size={14} />
                            </button>
                        )}
                        {onDelete && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="p-1.5 bg-rose-50 text-rose-600 rounded-full hover:bg-rose-100 transition"
                                title={language === 'ta' ? 'நீக்கு' : 'Delete'}
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        {order.status === 'COMPLETED' && onRepeat && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRepeat(); }}
                                className="p-1.5 bg-zinc-100 text-zinc-600 rounded-full hover:bg-zinc-200 transition flex items-center gap-1"
                                title={language === 'ta' ? 'மீண்டும் ஆர்டர் செய்' : 'Repeat Order'}
                            >
                                <RefreshCw size={12} />
                                <span className="text-[10px] font-bold">{language === 'ta' ? 'மீண்டும்' : 'Repeat'}</span>
                            </button>
                        )}
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {order.status === 'COMPLETED' ? (language === 'ta' ? 'முடிந்தது' : 'Completed') : (language === 'ta' ? 'நிலுவையில்' : 'Pending')}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'தறிகாரர்' : 'Weaver'}</p>
                        <p className="font-black text-gray-700 text-sm truncate">{order.weaverName}</p>
                    </div>
                    <div className="bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'எடை' : 'Weight'}</p>
                        <p className="font-black text-indigo-600 text-sm">{order.totalYarnWeight} kg</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onShare(); }}
                        className="flex-1 py-3 bg-zinc-50 text-zinc-600 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-100 transition"
                    >
                        <Share2 size={14} />
                        {language === 'ta' ? 'பகிர்' : 'Share'}
                    </button>
                    
                    {order.status === 'PENDING' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
                            className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
                        >
                            <CheckCircle size={14} />
                            {language === 'ta' ? 'வார்ப்பு தயார்' : 'Warp Ready'}
                        </button>
                    )}

                    {order.status === 'WARP_COMPLETED' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onAssign(); }}
                            className="flex-1 py-3 bg-fuchsia-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-100 hover:bg-fuchsia-700 transition"
                        >
                            <Send size={14} />
                            {language === 'ta' ? 'தறிக்கு அனுப்பு' : 'Send to Loom'}
                        </button>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-zinc-50 bg-zinc-50/30 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                        {order.orderType === 'ZARI_BOBBIN' ? (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-white rounded-2xl border border-zinc-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'பாபின்கள்' : 'Bobbins'}</p>
                                    <p className="font-black text-gray-700">{order.zariBobbins}</p>
                                </div>
                                <div className="p-3 bg-white rounded-2xl border border-zinc-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'இழை/பாபின்' : 'Ends/Bobbin'}</p>
                                    <p className="font-black text-gray-700">{order.zariEndsPerBobbin}</p>
                                </div>
                                <div className="p-3 bg-white rounded-2xl border border-zinc-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'மீட்டர்' : 'Meters'}</p>
                                    <p className="font-black text-gray-700">{order.zariMeters}m</p>
                                </div>
                                <div className="p-3 bg-white rounded-2xl border border-zinc-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'டீனியர்' : 'Denier'}</p>
                                    <p className="font-black text-gray-700">{order.zariYarnType || order.warpYarnType}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white rounded-2xl border border-zinc-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'வார்ப்பு நூல்' : 'Warp Yarn'}</p>
                                        <p className="font-black text-gray-700 text-xs">{order.warpYarnType}</p>
                                    </div>
                                    {order.orderType === 'MAIN_WARP' && (
                                        <div className="p-3 bg-white rounded-2xl border border-zinc-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'ஊடை நூல்' : 'Weft Yarn'}</p>
                                            <p className="font-black text-gray-700 text-xs">{order.weftYarnType}</p>
                                        </div>
                                    )}
                                    <div className="p-3 bg-white rounded-2xl border border-zinc-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'வார்ப்பு (மீ)' : 'Warp (m)'}</p>
                                        <p className="font-black text-gray-700">{order.orderType === 'TOP_WARP' ? order.topWarpLengthMeters : order.warpLengthMeters}m</p>
                                    </div>
                                    {order.orderType === 'MAIN_WARP' && (
                                        <div className="p-3 bg-white rounded-2xl border border-zinc-100">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{language === 'ta' ? 'சேலைகள்' : 'Sarees'}</p>
                                            <p className="font-black text-gray-700">{order.totalSareesExpected}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{language === 'ta' ? 'பகுதிகள்' : 'Sections'}</p>
                                    {(order.orderType === 'TOP_WARP' ? order.topWarpSections : order.sections)?.map((sec, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-2xl border border-zinc-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-zinc-300" />
                                                <span className="text-xs font-bold text-gray-700">{sec.name}</span>
                                            </div>
                                            <div className="flex gap-4">
                                                <span className="text-[10px] font-black text-zinc-400 uppercase">{sec.color}</span>
                                                <span className="text-xs font-black text-zinc-600">{sec.ends} {language === 'ta' ? 'இழை' : 'Ends'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const WarpDesignItem: React.FC<{
    design: WarpDesign;
    language: 'ta' | 'en';
    onClick: () => void;
}> = ({ design, language, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="bg-white p-5 rounded-[2rem] shadow-sm border border-zinc-100 hover:border-zinc-300 hover:shadow-md transition cursor-pointer flex flex-col items-center justify-center gap-3 text-center"
        >
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-600 border border-zinc-100 shadow-inner">
                <LayoutGrid size={24} />
            </div>
            <div>
                <h4 className="font-black text-zinc-900 text-sm tracking-tight truncate max-w-[120px]">{design.name}</h4>
                <p className="text-[10px] font-bold text-zinc-400 mt-0.5">{design.totalSareesExpected} {language === 'ta' ? 'சேலைகள்' : 'Sarees'}</p>
            </div>
        </div>
    );
};

const Warpers: React.FC<WarpersProps> = ({ 
  user, 
  language, 
  onBack, 
  onAddTransaction, 
}) => {
  const [warpers, setWarpers] = useState<Warper[]>([]);
  const [dispatches, setDispatches] = useState<YarnDispatch[]>([]);
  const [returns, setReturns] = useState<WarperReturn[]>([]);
  const [warpOrders, setWarpOrders] = useState<WarpOrder[]>([]);
  const [warpDesigns, setWarpDesigns] = useState<WarpDesign[]>([]);
  const [weavers, setWeavers] = useState<Weaver[]>([]);
  const [denierFormulas, setDenierFormulas] = useState<DenierFormula[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [looms, setLooms] = useState<Loom[]>([]);
  
  const [selectedWarper, setSelectedWarper] = useState<Warper | null>(null);
  const [viewType, setViewType] = useState<'received' | 'returned' | 'balance' | 'orders' | 'zari-bobbin' | 'top-warp' | 'ledger' | 'all-warps' | 'overview' | 'warp-designs'>('overview');
  const [selectedDeniers, setSelectedDeniers] = useState<string[]>(['ALL']);

  const [isAdding, setIsAdding] = useState(false);
  const [editingWarper, setEditingWarper] = useState<Warper | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingDispatchId, setEditingDispatchId] = useState<string | null>(null);
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);

  const [isAddingReturn, setIsAddingReturn] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnMeters, setReturnMeters] = useState('');
  const [returnWeaverId, setReturnWeaverId] = useState('');
  const [returnWeaverName, setReturnWeaverName] = useState('');
  const [returnSections, setReturnSections] = useState<WarpSection[]>([{ name: '', ends: 0, color: '', weightKg: 0 }]);

  const [isAddingDispatch, setIsAddingDispatch] = useState(false);
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [dispatchItems, setDispatchItems] = useState<{denier: string, color: string, weight: string}[]>([{denier: '', color: '', weight: ''}]);
  const [dispatchSupplierId, setDispatchSupplierId] = useState('');
  const [dispatchBillNumber, setDispatchBillNumber] = useState('');

  const [isManagingFormulas, setIsManagingFormulas] = useState(false);
  const [newFormulaDenier, setNewFormulaDenier] = useState('');
  const [newFormulaMultiplier, setNewFormulaMultiplier] = useState('');
  const [isCustomDenier, setIsCustomDenier] = useState(false);

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCreatingDesign, setIsCreatingDesign] = useState(false);
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);
  const [viewingDesignId, setViewingDesignId] = useState<string | null>(null);
  const [creatingOrderType, setCreatingOrderType] = useState<WarpType>('MAIN_WARP');
  const [orderDesignName, setOrderDesignName] = useState('');
  const [orderWeftYarnType, setOrderWeftYarnType] = useState('');
  const [orderSections, setOrderSections] = useState<WarpSection[]>([{ name: 'உடல்', ends: 0, color: '' }]);
  const [orderTotalSarees, setOrderTotalSarees] = useState('');
  const [orderWarpLength, setOrderWarpLength] = useState('');
  const [orderWarpWeight, setOrderWarpWeight] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const [zariBobbins, setZariBobbins] = useState('');
  const [zariEndsPerBobbin, setZariEndsPerBobbin] = useState('');
  const [zariMeters, setZariMeters] = useState('');
  const [zariWeight, setZariWeight] = useState('');
  const [zariYarnType, setZariYarnType] = useState('');
  const [zariColor, setZariColor] = useState('');

  const [topWarpYarnType, setTopWarpYarnType] = useState('');
  const [topWarpLengthMeters, setTopWarpLengthMeters] = useState('');
  const [topWarpTotalYarnWeight, setTopWarpTotalYarnWeight] = useState('');
  const [topWarpSections, setTopWarpSections] = useState<WarpSection[]>([{ name: 'மேல் வார்ப்பு', ends: 0, color: '' }]);

  const [isAssigningOrder, setIsAssigningOrder] = useState<string | null>(null);
  const [assignWeaverId, setAssignWeaverId] = useState('');
  const [assignLoomId, setAssignLoomId] = useState('');
  const [isAddingNewWeaver, setIsAddingNewWeaver] = useState(false);
  const [newWeaverName, setNewWeaverName] = useState('');
  const [isAddingNewLoom, setIsAddingNewLoom] = useState(false);
  const [newLoomNumber, setNewLoomNumber] = useState('');
  const [editingWages, setEditingWages] = useState<Record<string, {wage: string, wagePaid: string}>>({});
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [warpSearchQuery, setWarpSearchQuery] = useState('');
  const [warpWageFilter, setWarpWageFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'PARTIAL'>('ALL');

  // Statement filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewStatement, setViewStatement] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [selectedTxnDetails, setSelectedTxnDetails] = useState<any | null>(null);
  const isPopping = useRef(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingCol, setResizingCol] = useState<{ id: string, startX: number, startWidth: number } | null>(null);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showStatementPreview, setShowStatementPreview] = useState(false);
  const [statementRowLimit, setStatementRowLimit] = useState<number | 'ALL'>(25);
  const [selectedColForPinch, setSelectedColForPinch] = useState<string | null>(null);
  const [baseColumnWidth, setBaseColumnWidth] = useState(100);
  const pinchStartDist = React.useRef<number | null>(null);
  const pinchStartWidth = React.useRef<number>(100);
  const statementRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isEditingColumns || e.touches.length !== 2) return;
      e.preventDefault(); // Prevent scrolling while pinching
      
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      if (pinchStartDist.current === null) {
        pinchStartDist.current = dist;
        if (selectedColForPinch) {
          pinchStartWidth.current = columnWidths[selectedColForPinch] || (['date', 'sno', 'ends', 'meters'].includes(selectedColForPinch) ? 60 : (selectedColForPinch === 'particulars' ? 150 : baseColumnWidth));
        } else {
          pinchStartWidth.current = baseColumnWidth;
        }
        return;
      }

      const scale = dist / pinchStartDist.current;
      const newWidth = Math.max(15, Math.min(500, pinchStartWidth.current * scale));
      
      if (selectedColForPinch) {
        setColumnWidths(prev => ({ ...prev, [selectedColForPinch]: newWidth }));
      } else {
        setBaseColumnWidth(newWidth);
        // Also update individual column widths to match the scale if they were customized
        setColumnWidths(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(key => {
            next[key] = Math.max(15, next[key] * (newWidth / baseColumnWidth));
          });
          return next;
        });
      }
    };

    const handleTouchEnd = () => {
      pinchStartDist.current = null;
    };

    if (isEditingColumns) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isEditingColumns, baseColumnWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!resizingCol) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - resizingCol.startX;
      const newWidth = Math.max(15, resizingCol.startWidth + deltaX);
      setColumnWidths(prev => ({ ...prev, [resizingCol.id]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingCol(null);
    };

    if (resizingCol) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [resizingCol]);

  const startResizing = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (!isEditingColumns) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const currentWidth = columnWidths[id] || (['date', 'sno', 'ends', 'meters'].includes(id) ? 60 : (id === 'particulars' ? 150 : baseColumnWidth));
    setResizingCol({ id, startX: clientX, startWidth: currentWidth });
  };

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 100);
    return () => clearTimeout(timer);
  }, [viewType, selectedWarper, viewStatement, isAdding, isAddingReturn, isAddingDispatch]);

  // Sync sub-views with browser history to handle hardware back button
  useEffect(() => {
    const handlePopState = () => {
      isPopping.current = true;
      
      // Order of precedence for closing sub-views
      if (isAdding) { setIsAdding(false); }
      else if (isAddingReturn) { setIsAddingReturn(false); }
      else if (isAddingDispatch) { setIsAddingDispatch(false); }
      else if (isManagingFormulas) { setIsManagingFormulas(false); }
      else if (isCreatingOrder) { setIsCreatingOrder(false); }
      else if (isCreatingDesign) { setIsCreatingDesign(false); setEditingDesignId(null); }
      else if (viewingDesignId) { setViewingDesignId(null); }
      else if (isAssigningOrder) { setIsAssigningOrder(null); }
      else if (viewStatement) { setViewStatement(null); }
      else if (selectedTxnDetails) { setSelectedTxnDetails(null); }
      else if (selectedWarper) { 
        if (viewType !== 'overview') {
          setViewType('overview');
        } else {
          setSelectedWarper(null); 
        }
      }
      
      // Use a small timeout to reset isPopping to ensure all renders triggered by state updates above are finished
      setTimeout(() => {
        isPopping.current = false;
      }, 100);
    };

    const anySubViewOpen = isAdding || isAddingReturn || isAddingDispatch || isManagingFormulas || isCreatingOrder || isCreatingDesign || viewingDesignId || isAssigningOrder || viewStatement || selectedWarper || selectedTxnDetails;
    
    // Only push if we are entering a subview state and don't already have one
    if (anySubViewOpen && !window.history.state?.subview && !isPopping.current) {
      window.history.pushState({ subview: true }, '');
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdding, isAddingReturn, isAddingDispatch, isManagingFormulas, isCreatingOrder, isCreatingDesign, viewingDesignId, isAssigningOrder, viewStatement, selectedWarper, selectedTxnDetails, viewType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewStatement, startDate, endDate]);

  useEffect(() => {
    if (!selectedWarper) {
      setViewType('overview');
    }
  }, [selectedWarper]);

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [selectedWarper, viewType, viewStatement, isAdding, isAddingReturn, isAddingDispatch, isCreatingOrder, isAssigningOrder]);

  useEffect(() => {
    const meters = parseFloat(orderWarpLength) || 0;
    let totalWeight = 0;
    
    orderSections.forEach(section => {
      if (section.weightKg && section.weightKg > 0) {
        totalWeight += section.weightKg;
      } else {
        const ends = section.ends || 0;
        if (ends > 0 && meters > 0 && section.name) {
          const denierMatch = section.name.split(' - ')[0];
          if (denierMatch) {
            const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch.trim().toLowerCase());
            const multiplier = formula ? formula.multiplier : 0;
            totalWeight += (ends * multiplier * meters);
          }
        }
      }
    });

    if (totalWeight > 0) {
      setOrderWarpWeight(parseFloat(totalWeight.toFixed(3)).toString());
    } else {
      setOrderWarpWeight('');
    }
  }, [orderSections, orderWarpLength, denierFormulas]);

  useEffect(() => {
    const meters = parseFloat(topWarpLengthMeters) || 0;
    let totalWeight = 0;
    
    topWarpSections.forEach(section => {
      if (section.weightKg && section.weightKg > 0) {
        totalWeight += section.weightKg;
      } else {
        const ends = section.ends || 0;
        if (ends > 0 && meters > 0 && topWarpYarnType) {
          const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === topWarpYarnType.trim().toLowerCase());
          const multiplier = formula ? formula.multiplier : 0;
          totalWeight += (ends * multiplier * meters);
        }
      }
    });

    if (totalWeight > 0) {
      setTopWarpTotalYarnWeight(parseFloat(totalWeight.toFixed(3)).toString());
    } else {
      setTopWarpTotalYarnWeight('');
    }
  }, [topWarpSections, topWarpLengthMeters, topWarpYarnType, denierFormulas]);

  useEffect(() => {
    const bobbins = parseInt(zariBobbins) || 0;
    const ends = parseInt(zariEndsPerBobbin) || 0;
    const meters = parseFloat(zariMeters) || 0;
    
    if (bobbins > 0 && ends > 0 && meters > 0 && zariYarnType) {
      const denierMatch = zariYarnType.split(' - ')[0];
      const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
      const multiplier = formula ? formula.multiplier : 0;
      
      if (multiplier > 0) {
        const totalEnds = bobbins * ends;
        const weight = totalEnds * meters * multiplier;
        setZariWeight(weight.toFixed(3));
      }
    }
  }, [zariBobbins, zariEndsPerBobbin, zariMeters, zariYarnType, denierFormulas]);

  useEffect(() => {
    const timer = setTimeout(() => window.scrollTo(0, 0), 0);
    return () => clearTimeout(timer);
  }, [selectedWarper, viewType]);

  const loadData = useCallback(() => {
    const savedWarpers = localStorage.getItem(`viyabaari_warpers_${user.uid || 'guest'}`);
    if (savedWarpers) setWarpers(JSON.parse(savedWarpers));

    const savedDispatches = localStorage.getItem(`viyabaari_yarn_dispatches_${user.uid || 'guest'}`);
    if (savedDispatches) setDispatches(JSON.parse(savedDispatches));

    const savedReturns = localStorage.getItem(`viyabaari_warper_returns_${user.uid || 'guest'}`);
    if (savedReturns) setReturns(JSON.parse(savedReturns));

    const savedWarpOrders = localStorage.getItem(`viyabaari_warp_orders_${user.uid || 'guest'}`);
    if (savedWarpOrders) setWarpOrders(JSON.parse(savedWarpOrders));

    const savedWarpDesigns = localStorage.getItem(`viyabaari_warp_designs_${user.uid || 'guest'}`);
    if (savedWarpDesigns) setWarpDesigns(JSON.parse(savedWarpDesigns));

    const savedWeavers = localStorage.getItem(`viyabaari_weavers_${user.uid || 'guest'}`);
    if (savedWeavers) setWeavers(JSON.parse(savedWeavers));

    const savedLooms = localStorage.getItem(`viyabaari_looms_${user.uid || 'guest'}`);
    if (savedLooms) setLooms(JSON.parse(savedLooms));

    const savedSuppliers = localStorage.getItem(`viyabaari_suppliers_${user.uid || 'guest'}`);
    if (savedSuppliers) setSuppliers(JSON.parse(savedSuppliers));

    const savedFormulas = localStorage.getItem(`viyabaari_denier_formulas_${user.uid || 'guest'}`);
    if (savedFormulas) {
      const parsed = JSON.parse(savedFormulas);
      setDenierFormulas(parsed);
      if (parsed.length > 0 && selectedDeniers.length === 0) setSelectedDeniers(['ALL']);
    }

    const savedColumnWidths = localStorage.getItem(`viyabaari_column_widths_${user.uid || 'guest'}`);
    if (savedColumnWidths) setColumnWidths(JSON.parse(savedColumnWidths));

    const savedBaseWidth = localStorage.getItem(`viyabaari_base_column_width_${user.uid || 'guest'}`);
    if (savedBaseWidth) setBaseColumnWidth(parseFloat(savedBaseWidth));
  }, [user.uid, selectedDeniers.length]);

  useEffect(() => {
    loadData();
    window.addEventListener('local-storage-update', loadData);
    return () => window.removeEventListener('local-storage-update', loadData);
  }, [loadData]);

  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) {
      const key = `viyabaari_column_widths_${user.uid || 'guest'}`;
      const saved = localStorage.getItem(key);
      const current = JSON.stringify(columnWidths);
      if (saved !== current) {
        localStorage.setItem(key, current);
      }
    }
  }, [columnWidths, user.uid]);

  useEffect(() => {
    const key = `viyabaari_base_column_width_${user.uid || 'guest'}`;
    const saved = localStorage.getItem(key);
    const current = baseColumnWidth.toString();
    if (saved !== current) {
      localStorage.setItem(key, current);
    }
  }, [baseColumnWidth, user.uid]);

  const saveWarpers = (newWarpers: Warper[]) => {
    setWarpers(newWarpers);
    localStorage.setItem(`viyabaari_warpers_${user.uid || 'guest'}`, JSON.stringify(newWarpers));
  };

  const saveReturns = (newReturns: WarperReturn[]) => {
    setReturns(newReturns);
    localStorage.setItem(`viyabaari_warper_returns_${user.uid || 'guest'}`, JSON.stringify(newReturns));
  };

  const saveDispatches = (newDispatches: YarnDispatch[]) => {
    setDispatches(newDispatches);
    localStorage.setItem(`viyabaari_yarn_dispatches_${user.uid || 'guest'}`, JSON.stringify(newDispatches));
  };

  const saveFormulas = (newFormulas: DenierFormula[]) => {
    setDenierFormulas(newFormulas);
    localStorage.setItem(`viyabaari_denier_formulas_${user.uid || 'guest'}`, JSON.stringify(newFormulas));
  };

  const saveDesigns = (newDesigns: WarpDesign[]) => {
    setWarpDesigns(newDesigns);
    localStorage.setItem(`viyabaari_warp_designs_${user.uid || 'guest'}`, JSON.stringify(newDesigns));
  };

  const saveWarpOrders = (newOrders: WarpOrder[]) => {
    setWarpOrders(newOrders);
    localStorage.setItem(`viyabaari_warp_orders_${user.uid || 'guest'}`, JSON.stringify(newOrders));
  };

  const saveLooms = (newLooms: Loom[]) => {
    setLooms(newLooms);
    localStorage.setItem(`viyabaari_looms_${user.uid || 'guest'}`, JSON.stringify(newLooms));
  };

  const saveWeavers = (newWeavers: Weaver[]) => {
    setWeavers(newWeavers);
    localStorage.setItem(`viyabaari_weavers_${user.uid || 'guest'}`, JSON.stringify(newWeavers));
  };

  const handleAdd = () => {
    if (!newName.trim()) {
      alert(language === 'ta' ? 'பெயரை உள்ளிடவும்' : 'Please enter a name');
      return;
    }
    if (editingWarper) {
      const updated = warpers.map(w => w.id === editingWarper.id ? { ...w, name: newName, phone: newPhone } : w);
      saveWarpers(updated);
      setEditingWarper(null);
      alert(language === 'ta' ? 'விவரங்கள் மாற்றப்பட்டது!' : 'Details updated!');
    } else {
      const newWarper: Warper = {
        id: Date.now().toString(),
        name: newName,
        phone: newPhone,
        createdAt: Date.now()
      };
      saveWarpers([...warpers, newWarper]);
      alert(language === 'ta' ? 'வார்ப்பர் வெற்றிகரமாக சேர்க்கப்பட்டார்!' : 'Warper added successfully!');
    }
    setNewName('');
    setNewPhone('');
    setIsAdding(false);
  };

  const handleEditWarper = (warper: Warper) => {
    setEditingWarper(warper);
    setNewName(warper.name);
    setNewPhone(warper.phone || '');
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(language === 'ta' ? 'நிச்சயமாக நீக்க வேண்டுமா?' : 'Are you sure you want to delete?')) {
      saveWarpers(warpers.filter(w => w.id !== id));
    }
  };

  const handleAddReturn = () => {
    if (!returnDate || !selectedWarper) {
      alert(language === 'ta' ? 'தேதியை உள்ளிடவும்' : 'Please enter date');
      return;
    }
    
    if (returnSections.some(s => !s.name || !s.color || (!s.weightKg && !s.ends))) {
      alert(language === 'ta' ? 'அனைத்து இழைகளும் மற்றும் கலர்களும் சரியாக உள்ளிடவும்' : 'Please fill all ends and colors correctly');
      return;
    }

    const meters = parseFloat(returnMeters) || 1;
    
    const finalSections = returnSections.map(sec => {
      let weight = sec.weightKg || 0;
      if (!weight && sec.ends) {
        const denierMatch = sec.name.split(' - ')[0];
        const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
        if (formula) {
          weight = parseFloat((sec.ends * formula.multiplier * meters).toFixed(3));
        }
      }
      return { ...sec, weightKg: weight };
    });

    const totalWeight = finalSections.reduce((sum, sec) => sum + (sec.weightKg || 0), 0);
    const totalEnds = finalSections.reduce((sum, sec) => sum + (sec.ends || 0), 0);
    const uniqueDeniers = Array.from(new Set(finalSections.map(s => s.name.split(' - ')[0]))).filter(Boolean).join(', ');
    const uniqueColors = Array.from(new Set(finalSections.map(s => s.color))).filter(Boolean).join(', ');

    if (totalWeight <= 0) {
      alert(language === 'ta' ? 'எடை அல்லது இழை அளவு தேவை' : 'Weight or Ends required');
      return;
    }

    const weaver = weavers.find(w => w.id === returnWeaverId);
    const existingReturn = editingReturnId ? returns.find(r => r.id === editingReturnId) : null;
    const finalWeaverName = returnWeaverName.trim() || weaver?.name || existingReturn?.weaverName;
    const finalWeaverId = returnWeaverId || weaver?.id || existingReturn?.weaverId;
    
    const newReturn: WarperReturn = {
      id: editingReturnId || Date.now().toString(),
      warperId: selectedWarper.id,
      date: returnDate,
      color: uniqueColors,
      weightKg: totalWeight,
      yarnType: uniqueDeniers,
      weaverId: finalWeaverId,
      weaverName: finalWeaverName,
      orderId: existingReturn?.orderId,
      orderNumber: existingReturn?.orderNumber,
      ends: totalEnds || undefined,
      meters: parseFloat(returnMeters) || undefined,
      sections: finalSections,
      createdAt: existingReturn?.createdAt || Date.now()
    };
    
    let updatedReturns;
    if (editingReturnId) {
      updatedReturns = returns.map(r => r.id === editingReturnId ? newReturn : r);
    } else {
      updatedReturns = [...returns, newReturn];
    }
    
    saveReturns(updatedReturns);
    setReturnSections([{ name: '', ends: 0, color: '', weightKg: 0 }]);
    setReturnMeters('');
    setReturnWeaverId('');
    setReturnWeaverName('');
    setIsAddingReturn(false);
    setEditingReturnId(null);
    alert(language === 'ta' ? 'வார்ப்பு வரவு வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Warp return saved successfully!');
  };

  const handleAddDispatch = () => {
    if (!dispatchDate || dispatchItems.length === 0 || !selectedWarper) {
      alert(language === 'ta' ? 'தேதியை உள்ளிடவும்' : 'Please enter date');
      return;
    }
    
    // Validate all items
    for (const item of dispatchItems) {
      if (!item.denier || !item.color || !item.weight) {
        alert(language === 'ta' ? 'அனைத்து விவரங்களையும் நிரப்பவும்' : 'Please fill all item details');
        return;
      }
      if (isNaN(parseFloat(item.weight))) {
        alert(language === 'ta' ? 'சரியான எடையை உள்ளிடவும்' : 'Please enter a valid weight');
        return;
      }
    }
    
    const selectedSupplier = suppliers.find(s => s.id === dispatchSupplierId);
    const now = Date.now();

    const newDispatches: YarnDispatch[] = dispatchItems.map((item, index) => ({
      id: editingDispatchId ? `${editingDispatchId}-${index}` : `${now}-${index}`,
      date: dispatchDate,
      recipientType: 'warper',
      recipientId: selectedWarper.id,
      yarnCategory: 'warp',
      yarnType: item.denier,
      color: item.color,
      weightKg: parseFloat(item.weight),
      supplierId: dispatchSupplierId || undefined,
      supplierName: selectedSupplier?.name || undefined,
      billNumber: dispatchBillNumber || undefined,
      createdAt: editingDispatchId ? parseInt(editingDispatchId.split('-')[0]) : now
    }));
    
    let updatedDispatches;
    if (editingDispatchId) {
      const groupKey = editingDispatchId.split('-')[0];
      updatedDispatches = dispatches.filter(d => (d.createdAt?.toString() || d.id).split('-')[0] !== groupKey);
      updatedDispatches = [...updatedDispatches, ...newDispatches];
    } else {
      updatedDispatches = [...dispatches, ...newDispatches];
    }
    
    saveDispatches(updatedDispatches);
    setDispatchItems([{denier: '', color: '', weight: ''}]);
    setDispatchSupplierId('');
    setDispatchBillNumber('');
    setIsAddingDispatch(false);
    setEditingDispatchId(null);
    alert(language === 'ta' ? 'நூல் வரவு வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Yarn dispatch saved successfully!');
  };

  const handleAddFormula = () => {
    if (!newFormulaDenier || !newFormulaMultiplier) return;
    const multiplierStr = newFormulaMultiplier.toString().replace(',', '.');
    const newFormula: DenierFormula = {
      id: Date.now().toString(),
      denier: newFormulaDenier,
      multiplier: parseFloat(multiplierStr) / 1000
    };
    const updated = [...denierFormulas, newFormula];
    saveFormulas(updated);
    if (selectedDeniers.length === 0) setSelectedDeniers([newFormulaDenier]);
    setNewFormulaDenier('');
    setNewFormulaMultiplier('');
    setIsCustomDenier(false);
  };

  const handleDeleteDispatch = (idOrTxn: string | any) => {
    if (window.confirm(language === 'ta' ? 'நிச்சயமாக நீக்க வேண்டுமா?' : 'Are you sure you want to delete?')) {
      if (typeof idOrTxn === 'string') {
        saveDispatches(dispatches.filter(d => d.id !== idOrTxn));
      } else {
        const groupKey = (idOrTxn.createdAt?.toString() || idOrTxn.id).split('-')[0];
        saveDispatches(dispatches.filter(d => (d.createdAt?.toString() || d.id).split('-')[0] !== groupKey));
        setSelectedTxnDetails(null);
      }
    }
  };

  const handleDeleteReturn = (idOrTxn: string | any) => {
    if (window.confirm(language === 'ta' ? 'நிச்சயமாக நீக்க வேண்டுமா?' : 'Are you sure you want to delete?')) {
      const id = typeof idOrTxn === 'string' ? idOrTxn : idOrTxn.id;
      saveReturns(returns.filter(r => r.id !== id));
      if (typeof idOrTxn !== 'string') setSelectedTxnDetails(null);
    }
  };

  const handleDeleteOrder = (id: string) => {
    if (window.confirm(language === 'ta' ? 'நிச்சயமாக நீக்க வேண்டுமா?' : 'Are you sure you want to delete?')) {
      saveWarpOrders(warpOrders.filter(o => o.id !== id));
    }
  };

  const handleEditDispatch = (txn: any) => {
    const groupKey = (txn.createdAt?.toString() || txn.id).split('-')[0];
    setEditingDispatchId(groupKey);
    setDispatchDate(txn.date);
    setDispatchSupplierId(txn.supplierId || '');
    setDispatchBillNumber(txn.billNumber || '');
    if (txn.items) {
      setDispatchItems(txn.items.map((i: any) => ({ denier: i.yarnType, color: i.color, weight: i.weightKg.toString() })));
    } else {
      setDispatchItems([{ denier: txn.yarnType, color: txn.color, weight: txn.weightKg.toString() }]);
    }
    setIsAddingDispatch(true);
    setSelectedTxnDetails(null);
  };

  const handleEditReturn = (ret: WarperReturn) => {
    setEditingReturnId(ret.id);
    setReturnDate(ret.date);
    setReturnWeaverId(ret.weaverId || '');
    setReturnWeaverName(ret.weaverName || '');
    setReturnMeters(ret.meters?.toString() || '');
    setReturnSections(ret.sections || [{ name: ret.yarnType || '', ends: ret.ends || 0, color: ret.color, weightKg: ret.weightKg }]);
    setIsAddingReturn(true);
    setSelectedTxnDetails(null);
  };

  const handleEditOrder = (order: WarpOrder) => {
    setEditingOrderId(order.id);
    if (order.orderType) setCreatingOrderType(order.orderType);
    setOrderDesignName(order.designName);
    setOrderNumber(order.orderNumber || '');
    if (order.orderType === 'MAIN_WARP') {
      setOrderWeftYarnType(order.weftYarnType);
      setOrderSections(order.sections);
      setOrderTotalSarees(order.totalSareesExpected.toString());
      setOrderWarpLength(order.warpLengthMeters?.toString() || '');
      setOrderWarpWeight(order.totalYarnWeight.toString());
    } else if (order.orderType === 'ZARI_BOBBIN') {
      setZariYarnType(order.zariYarnType || order.warpYarnType);
      setZariBobbins(order.zariBobbins?.toString() || '');
      setZariEndsPerBobbin(order.zariEndsPerBobbin?.toString() || '');
      setZariMeters(order.zariMeters?.toString() || '');
      setZariWeight(order.totalYarnWeight.toString());
    } else if (order.orderType === 'TOP_WARP') {
      setTopWarpYarnType(order.topWarpYarnType || '');
      setTopWarpLengthMeters(order.topWarpLengthMeters?.toString() || '');
      setTopWarpTotalYarnWeight(order.topWarpTotalYarnWeight?.toString() || '');
      setTopWarpSections(order.topWarpSections || []);
    }
    setIsCreatingOrder(true);
  };

  const handleRepeatOrder = (order: WarpOrder) => {
    setEditingOrderId(null);
    if (order.orderType) setCreatingOrderType(order.orderType);
    setOrderDesignName(order.designName);
    
    const prefix = order.orderType === 'ZARI_BOBBIN' ? 'ZB ' : (order.orderType === 'TOP_WARP' ? 'TW ' : 'ORD ');
    setOrderNumber(`${prefix}${getNextSeqNumber()}`);
    
    if (order.orderType === 'MAIN_WARP' || !order.orderType) {
      setOrderWeftYarnType(order.weftYarnType);
      setOrderSections(order.sections);
      setOrderTotalSarees(order.totalSareesExpected.toString());
      setOrderWarpLength(order.warpLengthMeters?.toString() || '');
      setOrderWarpWeight(order.totalYarnWeight.toString());
    } else if (order.orderType === 'ZARI_BOBBIN') {
      setZariYarnType(order.zariYarnType || order.warpYarnType);
      setZariBobbins(order.zariBobbins?.toString() || '');
      setZariEndsPerBobbin(order.zariEndsPerBobbin?.toString() || '');
      setZariMeters(order.zariMeters?.toString() || '');
      setZariWeight(order.totalYarnWeight.toString());
      setZariColor(order.zariColor || '');
    } else if (order.orderType === 'TOP_WARP') {
      setTopWarpYarnType(order.topWarpYarnType || '');
      setTopWarpLengthMeters(order.topWarpLengthMeters?.toString() || '');
      setTopWarpTotalYarnWeight(order.topWarpTotalYarnWeight?.toString() || '');
      setTopWarpSections(order.topWarpSections || []);
    }
    setIsCreatingOrder(true);
  };

  const handleReturnSectionChange = (index: number, field: keyof WarpSection, value: string | number) => {
    const newSections = [...returnSections];
    const section = { ...newSections[index], [field]: value };
    
    const meters = parseFloat(returnMeters) || 0;
    const denierMatch = section.name.split(' - ')[0];
    const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
    const multiplier = formula ? formula.multiplier : 0;

    if (field === 'ends' && meters > 0 && multiplier > 0) {
      section.weightKg = parseFloat(((value as number) * multiplier * meters).toFixed(3));
    } else if (field === 'weightKg' && meters > 0 && multiplier > 0) {
      section.ends = Math.round((value as number) / (multiplier * meters));
    } else if (field === 'name' && meters > 0 && multiplier > 0) {
      if (section.ends > 0) {
        section.weightKg = parseFloat((section.ends * multiplier * meters).toFixed(3));
      } else if (section.weightKg && section.weightKg > 0) {
        section.ends = Math.round(section.weightKg / (multiplier * meters));
      }
    }

    newSections[index] = section;
    setReturnSections(newSections);
  };

  const addReturnSection = () => {
    setReturnSections([
      ...returnSections,
      { name: '', ends: 0, color: '', weightKg: 0 }
    ]);
  };

  const removeReturnSection = (index: number) => {
    setReturnSections(returnSections.filter((_, i) => i !== index));
  };

  const handleOrderSectionChange = (index: number, field: keyof WarpSection, value: string | number) => {
    const newSections = [...orderSections];
    const section = { ...newSections[index], [field]: value };
    
    const meters = parseFloat(orderWarpLength) || 0;
    const denierMatch = section.name.split(' - ')[0];
    const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
    const multiplier = formula ? formula.multiplier : 0;

    if (field === 'ends' && meters > 0 && multiplier > 0) {
      section.weightKg = parseFloat(((value as number) * multiplier * meters).toFixed(3));
    } else if (field === 'weightKg' && meters > 0 && multiplier > 0) {
      section.ends = Math.round((value as number) / (multiplier * meters));
    } else if (field === 'name' && meters > 0 && multiplier > 0) {
      if (section.ends > 0) {
        section.weightKg = parseFloat((section.ends * multiplier * meters).toFixed(3));
      } else if (section.weightKg && section.weightKg > 0) {
        section.ends = Math.round(section.weightKg / (multiplier * meters));
      }
    }

    newSections[index] = section;
    setOrderSections(newSections);
  };

  const addOrderSection = () => {
    setOrderSections([
      ...orderSections,
      { name: language === 'ta' ? `பகுதி ${orderSections.length + 1}` : `Section ${orderSections.length + 1}`, ends: 0, color: '' }
    ]);
  };

  const removeOrderSection = (index: number) => {
    setOrderSections(orderSections.filter((_, i) => i !== index));
  };

  const getNextSeqNumber = () => {
    const allNumbers = warpOrders
      .map(o => {
        // Handle both "PREFIX-NUMBER" and "PREFIX NUMBER"
        const parts = (o.orderNumber || '').split(/[- ]/);
        const lastPart = parts[parts.length - 1];
        if (!lastPart) return 0;
        const num = parseInt(lastPart.replace(/\D/g, ''));
        return isNaN(num) ? 0 : num;
      });
    const max = allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
    return (max + 1).toString();
  };

  const handleCreateOrder = () => {
    if (!selectedWarper) {
      alert(language === 'ta' ? 'முதலில் வார்ப்பரை தேர்ந்தெடுக்கவும்' : 'Please select a warper first');
      return;
    }

    let newOrder: WarpOrder;
    
    if (creatingOrderType === 'MAIN_WARP') {
      if (!orderDesignName || !orderWeftYarnType || !orderTotalSarees || !orderWarpWeight || !orderWarpLength || !orderNumber) {
        alert(language === 'ta' ? 'அனைத்து விவரங்களையும் நிரப்பவும்' : 'Please fill all details');
        return;
      }

      if (orderSections.some(s => !s.color || s.ends <= 0)) {
        alert(language === 'ta' ? 'அனைத்து இழைகளும் மற்றும் கலர்களும் சரியாக உள்ளிடவும்' : 'Please fill all ends and colors correctly');
        return;
      }

      const uniqueDeniers = Array.from(new Set(orderSections.map(s => s.name.split(' - ')[0]))).filter(Boolean).join(', ');

      newOrder = {
        id: Date.now().toString() + '_stock_order',
        orderNumber: orderNumber,
        loomId: 'STOCK',
        weaverId: 'STOCK',
        weaverName: language === 'ta' ? 'ஸ்டாக் (Stock)' : 'Stock',
        loomNumber: '-',
        warperId: selectedWarper.id,
        designName: orderDesignName,
        warpYarnType: uniqueDeniers,
        weftYarnType: orderWeftYarnType,
        sections: orderSections,
        totalSareesExpected: parseInt(orderTotalSarees),
        warpLengthMeters: parseFloat(orderWarpLength),
        totalYarnWeight: parseFloat(orderWarpWeight),
        status: 'PENDING',
        createdAt: Date.now(),
        orderType: 'MAIN_WARP'
      };
    } else if (creatingOrderType === 'ZARI_BOBBIN') {
      if (!orderDesignName || !zariYarnType || !zariColor || !zariBobbins || !zariEndsPerBobbin || !zariMeters || !zariWeight || !orderNumber) {
        alert(language === 'ta' ? 'அனைத்து விவரங்களையும் நிரப்பவும்' : 'Please fill all details');
        return;
      }

      newOrder = {
        id: Date.now().toString() + '_stock_order',
        orderNumber: orderNumber,
        loomId: 'STOCK',
        weaverId: 'STOCK',
        weaverName: language === 'ta' ? 'ஸ்டாக் (Stock)' : 'Stock',
        loomNumber: '-',
        warperId: selectedWarper.id,
        designName: orderDesignName,
        warpYarnType: zariYarnType || '-',
        zariYarnType: zariYarnType,
        zariColor: zariColor,
        weftYarnType: '-',
        sections: [],
        totalSareesExpected: 0,
        totalYarnWeight: parseFloat(zariWeight),
        status: 'PENDING',
        createdAt: Date.now(),
        orderType: 'ZARI_BOBBIN',
        zariBobbins: parseInt(zariBobbins),
        zariEndsPerBobbin: parseInt(zariEndsPerBobbin),
        zariMeters: parseFloat(zariMeters)
      };
    } else {
      if (!orderDesignName || !topWarpYarnType || !topWarpLengthMeters || !topWarpTotalYarnWeight || !orderNumber) {
        alert(language === 'ta' ? 'அனைத்து விவரங்களையும் நிரப்பவும்' : 'Please fill all details');
        return;
      }

      if (topWarpSections.some(s => !s.color || s.ends <= 0)) {
        alert(language === 'ta' ? 'அனைத்து இழைகளும் மற்றும் கலர்களும் சரியாக உள்ளிடவும்' : 'Please fill all ends and colors correctly');
        return;
      }

      newOrder = {
        id: Date.now().toString() + '_stock_order',
        orderNumber: orderNumber,
        loomId: 'STOCK',
        weaverId: 'STOCK',
        weaverName: language === 'ta' ? 'ஸ்டாக் (Stock)' : 'Stock',
        loomNumber: '-',
        warperId: selectedWarper.id,
        designName: orderDesignName,
        warpYarnType: topWarpYarnType,
        weftYarnType: '-',
        sections: [],
        totalSareesExpected: 0,
        totalYarnWeight: parseFloat(topWarpTotalYarnWeight),
        status: 'PENDING',
        createdAt: Date.now(),
        orderType: 'TOP_WARP',
        topWarpYarnType: topWarpYarnType,
        topWarpLengthMeters: parseFloat(topWarpLengthMeters),
        topWarpTotalYarnWeight: parseFloat(topWarpTotalYarnWeight),
        topWarpSections: topWarpSections
      };
    }

    let updatedOrders;
    if (editingOrderId) {
      updatedOrders = warpOrders.map(o => o.id === editingOrderId ? { ...newOrder, id: editingOrderId, createdAt: o.createdAt, status: o.status, orderNumber: orderNumber } : o);
    } else {
      updatedOrders = [...warpOrders, newOrder];
    }
    saveWarpOrders(updatedOrders);

    setIsCreatingOrder(false);
    setEditingOrderId(null);
    setOrderDesignName('');
    setOrderNumber('');
    setOrderWeftYarnType('');
    setOrderSections([{ name: 'உடல்', ends: 0, color: '' }]);
    setOrderTotalSarees('');
    setOrderWarpLength('');
    setOrderWarpWeight('');
    setZariBobbins('');
    setZariEndsPerBobbin('');
    setZariMeters('');
    setZariWeight('');
    setZariYarnType('');
    setZariColor('');
    setTopWarpYarnType('');
    setTopWarpLengthMeters('');
    setTopWarpTotalYarnWeight('');
    setTopWarpSections([{ name: 'மேல் வார்ப்பு', ends: 0, color: '' }]);
    
    setSuccessMessage(language === 'ta' ? 'புதிய வார்ப்பு ஆர்டர் வெற்றிகரமாக உருவாக்கப்பட்டது!' : 'New Warp Order created successfully!');
  };

  const resetDesignFields = useCallback(() => {
    setOrderDesignName('');
    setOrderNumber('');
    setOrderWeftYarnType('');
    setOrderSections([{ name: language === 'ta' ? 'உடல்' : 'Body', ends: 0, color: '' }]);
    setOrderTotalSarees('');
    setOrderWarpLength('');
    setOrderWarpWeight('');
    setZariBobbins('');
    setZariEndsPerBobbin('');
    setZariMeters('');
    setZariWeight('');
    setZariYarnType('');
    setZariColor('');
    setTopWarpYarnType('');
    setTopWarpLengthMeters('');
    setTopWarpTotalYarnWeight('');
    setTopWarpSections([{ name: language === 'ta' ? 'உடல்' : 'Body', ends: 0, color: '' }]);
    setEditingOrderId(null);
    setEditingDesignId(null);
  }, [language]);

  const handleCreateDesign = () => {
    if (!selectedWarper) return;
    if (!orderDesignName) {
      alert(language === 'ta' ? 'டிசைன் பெயரை உள்ளிடவும்' : 'Please enter design name');
      return;
    }

    const uniqueDeniers = Array.from(new Set(orderSections.map(s => s.name.split(' - ')[0]))).filter(Boolean).join(', ');

    const existingDesign = editingDesignId ? warpDesigns.find(d => d.id === editingDesignId) : null;

    const newDesign: WarpDesign = {
      id: editingDesignId || Date.now().toString(),
      warperId: selectedWarper.id,
      name: orderDesignName,
      warpYarnType: creatingOrderType === 'MAIN_WARP' ? uniqueDeniers : (creatingOrderType === 'TOP_WARP' ? (topWarpYarnType || '') : (zariYarnType || '')),
      weftYarnType: orderWeftYarnType,
      sections: orderSections,
      totalSareesExpected: parseInt(orderTotalSarees) || 0,
      warpLengthMeters: parseFloat(orderWarpLength) || 0,
      totalYarnWeight: parseFloat(orderWarpWeight) || 0,
      zariBobbins: parseInt(zariBobbins) || 0,
      zariEndsPerBobbin: parseInt(zariEndsPerBobbin) || 0,
      zariMeters: parseFloat(zariMeters) || 0,
      zariTotalYarnWeight: parseFloat(zariWeight) || 0,
      zariYarnType: zariYarnType,
      zariColor: zariColor,
      topWarpYarnType: topWarpYarnType,
      topWarpLengthMeters: parseFloat(topWarpLengthMeters) || 0,
      topWarpTotalYarnWeight: parseFloat(topWarpTotalYarnWeight) || 0,
      topWarpSections: topWarpSections,
      warpType: creatingOrderType,
      createdAt: existingDesign ? existingDesign.createdAt : Date.now()
    };

    if (editingDesignId) {
      saveDesigns(warpDesigns.map(d => d.id === editingDesignId ? newDesign : d));
    } else {
      saveDesigns([...warpDesigns, newDesign]);
    }

    setIsCreatingDesign(false);
    resetDesignFields();
    
    setSuccessMessage(language === 'ta' ? 'டிசைன் வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Design saved successfully!');
  };

  const handleAssignOrder = () => {
    if (!isAssigningOrder) return;

    let finalWeaverId = assignWeaverId;
    let finalWeaverName = '';

    // Handle New Weaver Creation
    if (isAddingNewWeaver) {
      if (!newWeaverName.trim()) {
        alert(language === 'ta' ? 'தறிக்காரர் பெயரை உள்ளிடவும்' : 'Please enter weaver name');
        return;
      }
      const newWeaver: Weaver = {
        id: Date.now().toString() + '_weaver',
        name: newWeaverName.trim(),
        createdAt: Date.now()
      };
      // weavers state will be updated later with saveWeavers (assuming saveWeavers exists)
      // Wait, let me check if saveWeavers exists. I saw saveLooms.
      // I'll check saveWeavers.
      finalWeaverId = newWeaver.id;
      finalWeaverName = newWeaver.name;
    } else {
      if (!assignWeaverId) {
        alert(language === 'ta' ? 'தறிக்காரரை தேர்ந்தெடுக்கவும்' : 'Please select a weaver');
        return;
      }
      const w = weavers.find(v => v.id === assignWeaverId);
      finalWeaverName = w ? w.name : '';
    }

    const orderToAssign = warpOrders.find(o => o.id === isAssigningOrder);
    if (!orderToAssign) return;

    let loomUpdates: Partial<Loom> = {};

    if (orderToAssign.orderType === 'ZARI_BOBBIN') {
      loomUpdates = {
        zariBobbins: orderToAssign.zariBobbins,
        zariEndsPerBobbin: orderToAssign.zariEndsPerBobbin,
        zariMeters: orderToAssign.zariMeters,
        zariTotalYarnWeight: orderToAssign.totalYarnWeight
      };
    } else if (orderToAssign.orderType === 'TOP_WARP') {
      loomUpdates = {
        topWarpLengthMeters: orderToAssign.topWarpLengthMeters || 0,
        topWarpTotalYarnWeight: orderToAssign.topWarpTotalYarnWeight || 0,
        topWarpSections: orderToAssign.topWarpSections || []
      };
    } else {
      loomUpdates = {
        designName: orderToAssign.designName,
        warpYarnType: orderToAssign.warpYarnType,
        weftYarnType: orderToAssign.weftYarnType,
        warpType: (orderToAssign.sections.length > 3 ? 'design' : (orderToAssign.sections.length > 1 ? 'border' : 'plain')) as any,
        warpSections: orderToAssign.sections,
        totalSareesExpected: orderToAssign.totalSareesExpected,
        warpLengthMeters: orderToAssign.warpLengthMeters,
        totalYarnWeight: orderToAssign.totalYarnWeight
      };
    }

    let finalLoom: Loom | null = null;

    if (isAddingNewLoom) {
      if (!newLoomNumber.trim()) {
        alert(language === 'ta' ? 'தறி எண்ணை உள்ளிடவும்' : 'Please enter loom number');
        return;
      }
      finalLoom = {
        id: (Date.now() + 1).toString() + '_loom',
        weaverId: finalWeaverId,
        loomNumber: newLoomNumber.trim(),
        designName: orderToAssign.designName,
        ...loomUpdates,
        createdAt: Date.now()
      };
      saveLooms([...looms, finalLoom]);
    } else if (assignLoomId) {
      const loom = looms.find(l => l.id === assignLoomId);
      if (loom) {
        finalLoom = { ...loom, ...loomUpdates };
        saveLooms(looms.map(l => l.id === loom.id ? finalLoom! : l));
      }
    } else {
      // Auto-create loom if none selected
      finalLoom = {
        id: (Date.now() + 1).toString() + '_loom',
        weaverId: finalWeaverId,
        loomNumber: `Loom ${looms.filter(l => l.weaverId === finalWeaverId).length + 1}`,
        designName: orderToAssign.designName,
        ...loomUpdates,
        createdAt: Date.now()
      };
      saveLooms([...looms, finalLoom]);
    }

    // Save new weaver if created
    if (isAddingNewWeaver) {
      const newWeaver: Weaver = {
        id: finalWeaverId,
        name: finalWeaverName,
        createdAt: Date.now()
      };
      saveWeavers([...weavers, newWeaver]);
    }

    const updatedOrders = warpOrders.map(o => {
      if (o.id === isAssigningOrder) {
        return {
          ...o,
          weaverId: finalWeaverId,
          weaverName: finalWeaverName,
          loomId: finalLoom ? finalLoom.id : 'UNASSIGNED',
          loomNumber: finalLoom ? finalLoom.loomNumber : '-',
          status: 'COMPLETED' as const,
          completedAt: Date.now()
        } as WarpOrder;
      }
      return o;
    });

    saveWarpOrders(updatedOrders);
    
    setIsAssigningOrder(null);
    setAssignWeaverId('');
    setAssignLoomId('');
    setIsAddingNewWeaver(false);
    setNewWeaverName('');
    setIsAddingNewLoom(false);
    setNewLoomNumber('');
    alert(language === 'ta' ? 'வார்ப்பு வெற்றிகரமாக தறிக்காரருக்கு மாற்றப்பட்டது!' : 'Warp successfully assigned to weaver!');
  };

  const handleShareOrder = (order: WarpOrder) => {
    let text = `*${language === 'ta' ? 'வார்ப்பு ஆர்டர் விவரங்கள்' : 'Warp Order Details'}*\n\n`;
    text += `*ID:* ${order.orderNumber || order.id.slice(-4)}\n`;
    text += `*${language === 'ta' ? 'டிசைன்' : 'Design'}:* ${order.designName}\n`;
    text += `*${language === 'ta' ? 'தறிகாரர்' : 'Weaver'}:* ${order.weaverName}\n`;
    text += `*${language === 'ta' ? 'தறி எண்' : 'Loom No'}:* ${order.loomNumber || '-'}\n`;
    text += `*${language === 'ta' ? 'நிலை' : 'Status'}:* ${order.status === 'PENDING' ? (language === 'ta' ? 'நிலுவையில்' : 'Pending') : (language === 'ta' ? 'முடிந்தது' : 'Completed')}\n`;
    text += `*${language === 'ta' ? 'தேதி' : 'Date'}:* ${new Date(order.createdAt).toLocaleDateString()}\n\n`;
    
    if (order.orderType === 'ZARI_BOBBIN') {
      text += `*${language === 'ta' ? 'வகை' : 'Type'}:* ${language === 'ta' ? 'ஜரிகை பாபின்' : 'Zari Bobbin'}\n`;
      text += `*${language === 'ta' ? 'ஜரிகை டீனியர்' : 'Zari Denier'}:* ${order.zariYarnType || order.warpYarnType || '-'}\n`;
      text += `*${language === 'ta' ? 'பாபின்கள்' : 'Bobbins'}:* ${order.zariBobbins || '-'}\n`;
      text += `*${language === 'ta' ? 'இழை/பாபின்' : 'Ends/Bobbin'}:* ${order.zariEndsPerBobbin || '-'}\n`;
      text += `*${language === 'ta' ? 'மீட்டர்' : 'Meters'}:* ${order.zariMeters || '-'}\n`;
      text += `*${language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}:* ${order.totalYarnWeight}kg\n`;
    } else if (order.orderType === 'TOP_WARP') {
      text += `*${language === 'ta' ? 'வகை' : 'Type'}:* ${language === 'ta' ? 'மேல் வார்ப்பு' : 'Top Warp'}\n`;
      text += `*${language === 'ta' ? 'வார்ப்பு நூல்' : 'Warp Yarn'}:* ${order.topWarpYarnType || '-'}\n`;
      text += `*${language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}:* ${order.topWarpTotalYarnWeight}kg\n`;
      text += `*${language === 'ta' ? 'வார்ப்பு (மீட்டர்)' : 'Warp (Meters)'}:* ${order.topWarpLengthMeters || '-'}\n`;
      
      if (order.topWarpSections && order.topWarpSections.length > 0) {
        text += `\n*${language === 'ta' ? 'பகுதிகள்' : 'Sections'}:*\n`;
        order.topWarpSections.forEach(sec => {
          text += `- ${sec.name}: ${sec.ends} ${sec.color ? `(${sec.color})` : ''}\n`;
        });
      }
    } else {
      text += `*${language === 'ta' ? 'வகை' : 'Type'}:* ${language === 'ta' ? 'முக்கிய வார்ப்பு' : 'Main Warp'}\n`;
      text += `*${language === 'ta' ? 'வார்ப்பு நூல்' : 'Warp Yarn'}:* ${order.warpYarnType || '-'}\n`;
      text += `*${language === 'ta' ? 'ஊடை நூல்' : 'Weft Yarn'}:* ${order.weftYarnType || '-'}\n`;
      text += `*${language === 'ta' ? 'மொத்த சேலை' : 'Total Sarees'}:* ${order.totalSareesExpected}\n`;
      text += `*${language === 'ta' ? 'வார்ப்பு (மீட்டர்)' : 'Warp (Meters)'}:* ${order.warpLengthMeters || '-'}\n`;
      text += `*${language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}:* ${order.totalYarnWeight}kg\n\n`;
      
      if (order.sections && order.sections.length > 0) {
        text += `*${language === 'ta' ? 'பகுதிகள்' : 'Sections'}:*\n`;
        order.sections.forEach(s => {
          text += `- ${s.name}: ${s.ends} ends (${s.color})\n`;
        });
      }
    }
    
    shareText(text);
  };

  const handleEditDesign = (design: WarpDesign) => {
    setOrderDesignName(design.name);
    setOrderWeftYarnType(design.weftYarnType || '');
    setOrderSections(design.sections && design.sections.length > 0 ? design.sections : [{ name: language === 'ta' ? 'உடல்' : 'Body', ends: 0, color: '' }]);
    setOrderTotalSarees(design.totalSareesExpected.toString());
    setOrderWarpLength(design.warpLengthMeters?.toString() || '');
    setOrderWarpWeight(design.totalYarnWeight.toString());
    setZariBobbins(design.zariBobbins?.toString() || '');
    setZariEndsPerBobbin(design.zariEndsPerBobbin?.toString() || '');
    setZariMeters(design.zariMeters?.toString() || '');
    setZariWeight(design.zariTotalYarnWeight?.toString() || '');
    setZariYarnType(design.zariYarnType || '');
    setZariColor(design.zariColor || '');
    setTopWarpLengthMeters(design.topWarpLengthMeters?.toString() || '');
    setTopWarpTotalYarnWeight(design.topWarpTotalYarnWeight?.toString() || '');
    setTopWarpSections(design.topWarpSections && design.topWarpSections.length > 0 ? design.topWarpSections : [{ name: language === 'ta' ? 'உடல்' : 'Body', ends: 0, color: '' }]);
    setTopWarpYarnType(design.topWarpYarnType || '');

    // Determine type
    if (design.warpType) {
        setCreatingOrderType(design.warpType);
    } else if (design.sections && design.sections.length > 0 && design.sections.some(s => s.ends > 0)) {
        setCreatingOrderType('MAIN_WARP');
    } else if (design.topWarpSections && design.topWarpSections.length > 0 && design.topWarpSections.some(s => s.ends > 0)) {
        setCreatingOrderType('TOP_WARP');
    } else if (design.zariBobbins) {
        setCreatingOrderType('ZARI_BOBBIN');
    } else {
        setCreatingOrderType('MAIN_WARP');
    }

    setEditingDesignId(design.id);
    setIsCreatingDesign(true);
  };

  const handleShareStatement = (warper: Warper, txns: any[], balance: number) => {
    let text = `*${language === 'ta' ? 'வார்ப்புகாரர் அறிக்கை' : 'Warper Statement'}*\n`;
    text += `*${language === 'ta' ? 'பெயர்' : 'Name'}:* ${warper.name}\n`;
    if (warper.phone) text += `*${language === 'ta' ? 'மொபைல்' : 'Mobile'}:* ${warper.phone}\n`;
    if (startDate || endDate) {
      text += `*${language === 'ta' ? 'காலம்' : 'Period'}:* ${startDate || 'Start'} - ${endDate || 'End'}\n`;
    }
    text += `\n--------------------------\n`;
    
    txns.forEach(txn => {
      const date = new Date(txn.date).toLocaleDateString();
      if (txn.isDispatch) {
        const details = txn.items ? txn.items.map((i: any) => `${i.yarnType} ${i.color}`).join(', ') : `${txn.yarnType} ${txn.color}`;
        text += `${date}: ${language === 'ta' ? 'வரவு' : 'Recv'} - ${details} (${txn.weightKg.toFixed(2)}kg)\n`;
      } else {
        text += `${date}: ${language === 'ta' ? 'திரும்பியது' : 'Ret'} - ${txn.yarnType} ${txn.color} (${txn.weightKg.toFixed(2)}kg)\n`;
      }
    });
    
    text += `\n--------------------------\n`;
    text += `*${language === 'ta' ? 'மொத்த இருப்பு' : 'Total Balance'}:* ${balance.toFixed(2)}kg`;
    
    shareText(text);
  };

  const downloadPDF = async () => {
    const warper = warpers.find(w => w.id === viewStatement);
    if (!warper || !statementRef.current) return;

    let statementDispatches = dispatches.filter(d => d.recipientType === 'warper' && d.recipientId === warper.id);
    let statementReturns = returns.filter(r => r.warperId === warper.id);

    if (startDate) {
      statementDispatches = statementDispatches.filter(d => d.date >= startDate);
      statementReturns = statementReturns.filter(r => r.date >= startDate);
    }
    if (endDate) {
      statementDispatches = statementDispatches.filter(d => d.date <= endDate);
      statementReturns = statementReturns.filter(r => r.date <= endDate);
    }

    const groupedStatementDispatches = Object.values(statementDispatches.reduce((acc: any, d: any) => {
      const key = d.createdAt || d.id;
      if (!acc[key]) {
        acc[key] = { ...d, isDispatch: true, timestamp: new Date(d.date).getTime(), items: [] };
      }
      acc[key].items.push({ yarnType: d.yarnType, color: d.color, weightKg: d.weightKg });
      acc[key].weightKg = acc[key].items.reduce((sum: number, item: any) => sum + item.weightKg, 0);
      return acc;
    }, {} as Record<string, any>));

    const allTxnsForPdf = [
      ...groupedStatementDispatches,
      ...statementReturns.map(r => ({ ...r, isDispatch: false, timestamp: new Date(r.date).getTime() }))
    ].sort((a: any, b: any) => a.timestamp - b.timestamp);

    const filename = `${warper.name}_statement_${new Date().toISOString().split('T')[0]}.pdf`;
    const element = statementRef.current;

    const opt = {
      margin: [10, 10] as [number, number],
      filename: filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        width: 800,
        windowWidth: 800,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById('pdf-warper-statement');
          if (el) {
            el.style.display = 'block';
            el.style.width = '800px';
            el.style.padding = '24px';
            el.style.background = '#ffffff';
          }
        }
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

  const handleShareBalance = (yarnType: string, color: string, balance: number) => {
    let text = `*${language === 'ta' ? 'நூல் இருப்பு விவரம்' : 'Yarn Balance Detail'}*\n\n`;
    text += `*${language === 'ta' ? 'நூல் வகை' : 'Yarn Type'}:* ${yarnType}\n`;
    text += `*${language === 'ta' ? 'நிறம்' : 'Color'}:* ${color}\n`;
    text += `*${language === 'ta' ? 'இருப்பு' : 'Balance'}:* ${balance.toFixed(2)} kg\n`;
    
    shareText(text);
  };

  const handleToggleOrderStatus = (orderId: string) => {
    const order = warpOrders.find(o => o.id === orderId);
    if (!order) return;

    const isCompleting = order.status === 'PENDING';

    const updatedOrders = warpOrders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: isCompleting ? 'WARP_COMPLETED' : 'PENDING' } as WarpOrder;
      }
      return o;
    });
    saveWarpOrders(updatedOrders);

    if (isCompleting) {
      // Automatically record as Warp Return in Warpers module
      let totalEnds = 0;
      let meters = 0;
      let sectionsForReturn: any[] = [];

      if (order.orderType === 'ZARI_BOBBIN') {
        totalEnds = (order.zariBobbins || 0) * (order.zariEndsPerBobbin || 0);
        meters = order.zariMeters || 0;
        const denier = order.warpYarnType || 'Zari';
        sectionsForReturn = [{
          name: `${denier} - Zari Bobbins`,
          color: order.zariColor || order.zariYarnType || 'Zari',
          ends: totalEnds,
          weightKg: order.totalYarnWeight
        }];
      } else if (order.orderType === 'TOP_WARP') {
        const topSections = order.topWarpSections || [];
        totalEnds = topSections.reduce((sum, sec) => sum + (sec.ends || 0), 0);
        meters = order.topWarpLengthMeters || 0;
        const denier = order.topWarpYarnType || order.warpYarnType || 'Unknown';
        
        const totalFormulaWeight = topSections.reduce((sum, sec) => {
          if (sec.weightKg && sec.weightKg > 0) return sum + sec.weightKg;
          const denierMatch = sec.name.split(' - ')[0];
          const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
          const multiplier = formula ? formula.multiplier : 0;
          return sum + (sec.ends * multiplier * (order.topWarpLengthMeters || 0));
        }, 0);

        sectionsForReturn = topSections.map(sec => {
          let formulaWeight = 0;
          if (sec.weightKg && sec.weightKg > 0) {
            formulaWeight = sec.weightKg;
          } else {
            const denierMatch = sec.name.split(' - ')[0];
            const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
            const multiplier = formula ? formula.multiplier : 0;
            formulaWeight = sec.ends * multiplier * (order.topWarpLengthMeters || 0);
          }

          let weight = 0;
          if (totalFormulaWeight > 0) {
            weight = (formulaWeight / totalFormulaWeight) * order.totalYarnWeight;
          } else {
            weight = totalEnds > 0 ? (sec.ends / totalEnds) * order.totalYarnWeight : 0;
          }

          // Ensure name starts with denier for ledger columns
          let sectionName = sec.name;
          if (!sectionName.startsWith(denier)) {
            sectionName = `${denier} - ${sectionName}`;
          }

          return {
            name: sectionName,
            color: sec.color || 'Unknown',
            ends: sec.ends,
            weightKg: parseFloat(weight.toFixed(2))
          };
        });
      } else {
        // MAIN_WARP
        totalEnds = order.sections.reduce((sum: number, sec: WarpSection) => sum + (sec.ends || 0), 0);
        meters = order.warpLengthMeters || 0;

        const totalFormulaWeight = order.sections.reduce((sum: number, sec: WarpSection) => {
          if (sec.weightKg && sec.weightKg > 0) return sum + sec.weightKg;
          const denierMatch = sec.name.split(' - ')[0];
          const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
          const multiplier = formula ? formula.multiplier : 0;
          return sum + (sec.ends * multiplier * (order.warpLengthMeters || 0));
        }, 0);

        sectionsForReturn = order.sections.map((sec: WarpSection) => {
          let formulaWeight = 0;
          if (sec.weightKg && sec.weightKg > 0) {
            formulaWeight = sec.weightKg;
          } else {
            const denierMatch = sec.name.split(' - ')[0];
            const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
            const multiplier = formula ? formula.multiplier : 0;
            formulaWeight = sec.ends * multiplier * (order.warpLengthMeters || 0);
          }

          let weight = 0;
          if (totalFormulaWeight > 0) {
            weight = (formulaWeight / totalFormulaWeight) * order.totalYarnWeight;
          } else {
            weight = totalEnds > 0 ? (sec.ends / totalEnds) * order.totalYarnWeight : 0;
          }

          return {
            name: sec.name,
            color: sec.color || 'Unknown',
            ends: sec.ends,
            weightKg: parseFloat(weight.toFixed(2))
          };
        });
      }

      const newReturn: WarperReturn = {
        id: Date.now().toString(),
        warperId: order.warperId,
        date: new Date().toISOString().split('T')[0],
        color: sectionsForReturn.map(s => s.color).filter(Boolean).join(', ') || 'Unknown',
        weightKg: order.totalYarnWeight,
        yarnType: order.warpYarnType,
        weaverId: order.weaverId,
        weaverName: order.weaverName,
        ends: totalEnds,
        meters: meters,
        createdAt: Date.now(),
        orderId: order.id,
        orderNumber: order.orderNumber,
        sections: sectionsForReturn
      };
      saveReturns([...returns, newReturn]);
      setSuccessMessage(language === 'ta' ? 'வார்ப்பு வரவு வெற்றிகரமாக பதிவாகிவிட்டது!' : 'Warp return successfully recorded!');
    }
  };

  const handleUpdateWage = (orderId: string) => {
    const editState = editingWages[orderId];
    if (!editState) return;

    const parsedWagePaid = editState.wagePaid ? parseFloat(editState.wagePaid) : 0;
    const parsedWage = editState.wage ? parseFloat(editState.wage) : undefined;

    if ((editState.wagePaid && isNaN(parsedWagePaid)) || (editState.wage && isNaN(parsedWage as number))) {
      alert(language === 'ta' ? 'சரியான எண்களை உள்ளிடவும்' : 'Please enter valid numbers');
      return;
    }

    let addedTransaction = false;
    const updatedOrders = warpOrders.map(o => {
      if (o.id === orderId) {
        const newWagePaid = parsedWagePaid;
        const oldWagePaid = o.wagePaid || 0;
        const diff = newWagePaid - oldWagePaid;

        if (diff > 0 && onAddTransaction) {
          onAddTransaction({
            type: 'EXPENSE',
            amount: diff,
            category: 'Warping Wage',
            description: `Wage paid to ${selectedWarper?.name} for Warp Order ${o.orderNumber || o.designName}`,
            date: Date.now()
          });
          addedTransaction = true;
        }

        return {
          ...o,
          wage: parsedWage,
          wagePaid: newWagePaid > 0 ? newWagePaid : undefined
        };
      }
      return o;
    });
    saveWarpOrders(updatedOrders);
    alert(language === 'ta' ? `கூலி விவரங்கள் சேமிக்கப்பட்டன!${addedTransaction ? ' கணக்குகள் பக்கத்தில் வரவு வைக்கப்பட்டுள்ளது.' : ''}` : `Wage details saved!${addedTransaction ? ' Transaction added to accounts.' : ''}`);
  };

  const warperBalances = useMemo(() => {
    if (!selectedWarper) return [];
    
    const balances: Record<string, { received: number, returned: number }> = {};
    
    dispatches.filter(d => d.recipientType === 'warper' && d.recipientId === selectedWarper.id).forEach(dispatch => {
      const color = dispatch.color || 'Unknown';
      const yarnType = dispatch.yarnType || 'Unknown';
      const key = `${yarnType}|${color}`;
      if (!balances[key]) balances[key] = { received: 0, returned: 0 };
      balances[key].received += dispatch.weightKg;
    });
    
    returns.filter(r => r.warperId === selectedWarper.id).forEach(ret => {
      const color = ret.color || 'Unknown';
      const yarnType = ret.yarnType || 'Unknown';
      const key = `${yarnType}|${color}`;
      if (!balances[key]) balances[key] = { received: 0, returned: 0 };
      balances[key].returned += ret.weightKg;
    });
    
    return Object.entries(balances).map(([key, data]) => {
      const [yarnType, color] = key.split('|');
      return {
        yarnType,
        color,
        received: data.received,
        returned: data.returned,
        balance: data.received - data.returned
      };
    }).sort((a, b) => {
      if (a.yarnType !== b.yarnType) return a.yarnType.localeCompare(b.yarnType);
      return b.balance - a.balance;
    });
  }, [dispatches, returns, selectedWarper]);

  const transactionDetailsModal = selectedTxnDetails ? (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-gray-800 text-xl tamil-font">
            {language === 'ta' ? 'பரிவர்த்தனை விவரங்கள்' : 'Transaction Details'}
          </h3>
          <button onClick={() => setSelectedTxnDetails(null)} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-4">
            <div className="flex justify-between border-b border-gray-100 pb-3">
              <span className="text-gray-500 font-medium">{language === 'ta' ? 'தேதி' : 'Date'}</span>
              <span className="font-bold text-gray-800">{new Date(selectedTxnDetails.date).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-3">
              <span className="text-gray-500 font-medium">{language === 'ta' ? 'வகை' : 'Type'}</span>
              <span className={`font-bold ${selectedTxnDetails.isDispatch ? 'text-zinc-600' : 'text-emerald-600'}`}>
                {selectedTxnDetails.isDispatch ? (language === 'ta' ? 'நூல் வரவு' : 'Yarn Given') : (language === 'ta' ? 'வார்ப்பு வரவு' : 'Warp Done')}
              </span>
            </div>
            
            {selectedTxnDetails.isDispatch ? (
              <>
                {selectedTxnDetails.items ? (
                  <div className="mt-4">
                    <p className="text-gray-500 font-medium mb-2">{language === 'ta' ? 'பகுதிகள்' : 'Items'}</p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {selectedTxnDetails.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{item.yarnType} ({item.color})</span>
                          <span className="font-bold text-gray-800">{item.weightKg} kg</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-3 mt-4">
                      <span className="text-gray-500 font-medium">{language === 'ta' ? 'மொத்த எடை (கிலோ)' : 'Total Weight (Kg)'}</span>
                      <span className="font-bold text-gray-800">{selectedTxnDetails.weightKg}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-gray-100 pb-3">
                      <span className="text-gray-500 font-medium">{language === 'ta' ? 'டீனியர்' : 'Denier'}</span>
                      <span className="font-bold text-gray-800">{selectedTxnDetails.yarnType}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-3">
                      <span className="text-gray-500 font-medium">{language === 'ta' ? 'நிறம்' : 'Color'}</span>
                      <span className="font-bold text-gray-800">{selectedTxnDetails.color}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-3">
                      <span className="text-gray-500 font-medium">{language === 'ta' ? 'எடை (கிலோ)' : 'Weight (Kg)'}</span>
                      <span className="font-bold text-gray-800">{selectedTxnDetails.weightKg}</span>
                    </div>
                  </>
                )}
                {selectedTxnDetails.supplierName && (
                  <div className="flex justify-between border-b border-gray-100 pb-3 mt-4">
                    <span className="text-gray-500 font-medium">{language === 'ta' ? 'சப்ளையர்' : 'Supplier'}</span>
                    <span className="font-bold text-gray-800">{selectedTxnDetails.supplierName}</span>
                  </div>
                )}
                {selectedTxnDetails.billNumber && (
                  <div className="flex justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-500 font-medium">{language === 'ta' ? 'பில் எண்' : 'Bill No'}</span>
                    <span className="font-bold text-gray-800">{selectedTxnDetails.billNumber}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500 font-medium">{language === 'ta' ? 'வார்ப்பு ஐடி' : 'Order ID'}</span>
                  <span className="font-bold text-gray-800">{selectedTxnDetails.orderNumber || selectedTxnDetails.orderId?.slice(-4) || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500 font-medium">{language === 'ta' ? 'தறிகாரர்' : 'Weaver'}</span>
                  <span className="font-bold text-gray-800">{selectedTxnDetails.weaverName || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500 font-medium">{language === 'ta' ? 'மொத்த இழை' : 'Total Ends'}</span>
                  <span className="font-bold text-gray-800">{selectedTxnDetails.ends || '-'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-3">
                  <span className="text-gray-500 font-medium">{language === 'ta' ? 'மொத்த எடை (கிலோ)' : 'Total Weight (Kg)'}</span>
                  <span className="font-bold text-gray-800">{selectedTxnDetails.weightKg}</span>
                </div>
                {selectedTxnDetails.sections && selectedTxnDetails.sections.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-500 font-medium mb-2">{language === 'ta' ? 'பகுதிகள்' : 'Sections'}</p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {selectedTxnDetails.sections.map((sec: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{sec.name} ({sec.color})</span>
                          <span className="font-bold text-gray-800">{sec.weightKg} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mt-8">
          <button 
            onClick={() => {
              if (selectedTxnDetails.isDispatch) {
                handleEditDispatch(selectedTxnDetails);
              } else {
                handleEditReturn(selectedTxnDetails);
              }
            }}
            className="bg-zinc-100 text-zinc-700 py-3 rounded-2xl font-black hover:bg-zinc-200 transition flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            {language === 'ta' ? 'எடிட்' : 'Edit'}
          </button>
          <button 
            onClick={() => {
              if (selectedTxnDetails.isDispatch) {
                handleDeleteDispatch(selectedTxnDetails);
              } else {
                handleDeleteReturn(selectedTxnDetails);
              }
            }}
            className="bg-red-50 text-red-600 py-3 rounded-2xl font-black hover:bg-red-100 transition flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            {language === 'ta' ? 'நீக்கு' : 'Delete'}
          </button>
          <button 
            onClick={() => setSelectedTxnDetails(null)}
            className="bg-gray-100 text-gray-700 py-3 rounded-2xl font-black hover:bg-gray-200 transition"
          >
            {language === 'ta' ? 'மூடு' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Render Warper Account View
  if (viewStatement) {
    const warper = warpers.find(w => w.id === viewStatement);
    if (!warper) return null;

    return (
      <WarperStatementView 
        warper={warper}
        dispatches={dispatches}
        returns={returns}
        warpOrders={warpOrders}
        language={language}
        onClose={() => setViewStatement(null)}
      />
    );
  }

  if (selectedWarper) {
    const warperDispatches = dispatches.filter(d => d.recipientType === 'warper' && d.recipientId === selectedWarper.id);
    const warperReturns = returns.filter(r => r.warperId === selectedWarper.id);
    const warperOrders = warpOrders.filter(o => o.warperId === selectedWarper.id).sort((a, b) => b.createdAt - a.createdAt);

    const filteredWarperOrders = warperOrders.filter(order => {
      // Search
      const searchLower = warpSearchQuery.toLowerCase();
      const matchesSearch = 
        (order.orderNumber || '').toLowerCase().includes(searchLower) ||
        (order.weaverName || '').toLowerCase().includes(searchLower) ||
        (order.loomNumber || '').toLowerCase().includes(searchLower) ||
        (order.designName || '').toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Filter
      const wage = order.wage || 0;
      const wagePaid = order.wagePaid || 0;

      if (warpWageFilter === 'PAID') {
        return wage > 0 && wagePaid >= wage;
      } else if (warpWageFilter === 'UNPAID') {
        return wagePaid === 0;
      } else if (warpWageFilter === 'PARTIAL') {
        return wagePaid > 0 && wagePaid < wage;
      }

      return true;
    });

    return (
      <div className={`p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-right-4 duration-300`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (viewType === 'overview') {
                    setSelectedWarper(null);
                } else {
                    setViewType('overview');
                }
              }} 
              className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition print:hidden"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-800">{selectedWarper.name}</h2>
                <button 
                  onClick={() => handleEditWarper(selectedWarper)}
                  className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition print:hidden"
                  title={language === 'ta' ? 'வாரப்பரை திருத்து' : 'Edit Warper'}
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => {
                    handleDelete(selectedWarper.id);
                    setSelectedWarper(null);
                  }}
                  className="p-1 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition print:hidden"
                  title={language === 'ta' ? 'வாரப்பரை நீக்கு' : 'Delete Warper'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {selectedWarper.phone && <p className="text-xs font-bold text-gray-500">{selectedWarper.phone}</p>}
            </div>
          </div>
          {viewType === 'overview' && (
            <button 
              onClick={() => setViewType('all-warps')}
              className="text-xs font-bold text-zinc-600 bg-zinc-50 px-3 py-1.5 rounded-full hover:bg-zinc-100 flex items-center gap-1 print:hidden"
            >
              <RefreshCw size={14} /> {language === 'ta' ? 'அனைத்து வார்ப்புகள்' : 'All Warps'}
            </button>
          )}
          {viewType !== 'overview' && (
            <button 
              onClick={() => setViewStatement(selectedWarper.id)}
              className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 flex items-center gap-1 print:hidden"
            >
              <FileText size={14} /> {language === 'ta' ? 'அறிக்கை' : 'Statement'}
            </button>
          )}
        </div>

        {viewType === 'overview' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8 print:hidden">
              <button 
                onClick={() => setViewType('ledger')}
                className="p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 transition-all border border-indigo-200 hover:shadow-md group bg-indigo-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <BookOpen size={24} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'கணக்கு நோட்டு' : 'Ledger'}</span>
              </button>
              
              <button 
                onClick={() => setViewType('balance')}
                className="p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 transition-all border border-emerald-200 hover:shadow-md group bg-emerald-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <PieChart size={24} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'இருப்பு' : 'Balance'}</span>
              </button>

              <button 
                onClick={() => setViewType('received')}
                className="p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 transition-all border border-amber-200 hover:shadow-md group bg-amber-500 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <ArrowDownLeft size={24} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'கொடுத்தது' : 'Given'}</span>
              </button>

              <button 
                onClick={() => setViewType('returned')}
                className="p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 transition-all border border-violet-200 hover:shadow-md group bg-violet-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <ArrowUpRight size={24} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'வந்தது' : 'Returned'}</span>
              </button>

              <button 
                onClick={() => setViewType('orders')}
                className="p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 transition-all border border-rose-200 hover:shadow-md group bg-rose-500 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <FileText size={24} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'வார்ப்பு ஆர்டர்' : 'Warp Orders'}</span>
              </button>

              <button 
                onClick={() => setViewType('zari-bobbin')}
                className="p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 transition-all border border-teal-200 hover:shadow-md group bg-teal-500 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <Palette size={24} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'ஜரிகை பாபின்' : 'Zari Bobbin'}</span>
              </button>

              <button 
                onClick={() => setViewType('top-warp')}
                className="p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 transition-all border border-sky-200 hover:shadow-md group bg-sky-500 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <Layers size={24} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'மேல் வார்ப்பு ஆர்டர்' : 'Top Warp Order'}</span>
              </button>

              <button 
                onClick={() => setViewType('all-warps')}
                className="p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 transition-all border border-fuchsia-200 hover:shadow-md group bg-fuchsia-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <RefreshCw size={24} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'அனைத்து வார்ப்புகள்' : 'All Warps'}</span>
              </button>

              <button 
                onClick={() => setViewType('warp-designs')}
                className="p-5 rounded-3xl shadow-sm flex flex-col items-center justify-center gap-3 transition-all border border-blue-200 hover:shadow-md group bg-blue-600 text-white"
              >
                <div className="p-4 rounded-2xl transition-colors shadow-inner border border-white/20 bg-white/20 text-white">
                  <LayoutGrid size={24} />
                </div>
                <span className="font-bold text-sm tamil-font">{language === 'ta' ? 'வார்ப்பு டிசைன்ஸ்' : 'Warp Designs'}</span>
              </button>
            </div>
            
            <div className="bg-white p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm text-center">
              <p className="text-zinc-400 text-sm font-bold tamil-font mb-4">
                {language === 'ta' ? 'விரைவான செயல்கள்' : 'Quick Actions'}
              </p>
              <div className="flex gap-3 justify-center">
                <button 
                  onClick={() => setIsAddingDispatch(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                >
                  <ArrowDownLeft size={18} /> {language === 'ta' ? 'நூல் வரவு' : 'Yarn Given'}
                </button>
                <button 
                  onClick={() => {
                    setEditingReturnId(null);
                    setReturnDate(new Date().toISOString().split('T')[0]);
                    setReturnWeaverId('');
                    setReturnWeaverName('');
                    setReturnMeters('');
                    setReturnSections([{ name: '', ends: 0, color: '', weightKg: 0 }]);
                    setIsAddingReturn(true);
                  }}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
                >
                  <ArrowUpRight size={18} /> {language === 'ta' ? 'வார்ப்பு வரவு' : 'Warp Done'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {viewType === 'ledger' && (
              <div className="space-y-4">
                {/* Header Actions & Filters */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="text-indigo-600" size={20} />
                      <h3 className="font-black text-gray-800 text-base tamil-font">
                        {language === 'ta' ? 'கணக்கு நோட்டு (Ledger)' : 'Ledger Account'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button 
                        onClick={() => setViewStatement(selectedWarper.id)}
                        className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-100 transition"
                      >
                        <FileText size={14} />
                        {language === 'ta' ? 'PDF அறிக்கை' : 'PDF Statement'}
                      </button>
                      <button 
                        onClick={() => setIsAddingDispatch(true)}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-indigo-700 shadow-sm transition"
                      >
                        <ArrowDownLeft size={14} />
                        {language === 'ta' ? 'நூல் வரவு' : 'Yarn Given'}
                      </button>
                      <button 
                        onClick={() => {
                          setEditingReturnId(null);
                          setReturnDate(new Date().toISOString().split('T')[0]);
                          setReturnWeaverId('');
                          setReturnWeaverName('');
                          setReturnMeters('');
                          setReturnSections([{ name: '', ends: 0, color: '', weightKg: 0 }]);
                          setIsAddingReturn(true);
                        }}
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 shadow-sm transition"
                      >
                        <ArrowUpRight size={14} />
                        {language === 'ta' ? 'வார்ப்பு வரவு' : 'Warp Done'}
                      </button>
                    </div>
                  </div>

                  {/* Date Range & Row Limit Filters */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                      <span className="text-xs font-bold text-gray-500">{language === 'ta' ? 'முதல்:' : 'From:'}</span>
                      <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        className="bg-transparent text-xs font-bold outline-none" 
                      />
                      <span className="text-xs font-bold text-gray-500 ml-1">{language === 'ta' ? 'வரை:' : 'To:'}</span>
                      <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        className="bg-transparent text-xs font-bold outline-none" 
                      />
                      {(startDate || endDate) && (
                        <button 
                          onClick={() => { setStartDate(''); setEndDate(''); }} 
                          className="ml-1 text-rose-500 hover:text-rose-700 text-xs font-bold"
                        >
                          {language === 'ta' ? 'அழி' : 'Clear'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 ml-auto">
                      <span className="text-xs font-bold text-gray-500">{language === 'ta' ? 'வரிசைகள்:' : 'Rows:'}</span>
                      <select 
                        value={statementRowLimit} 
                        onChange={e => setStatementRowLimit(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                        className="bg-transparent text-xs font-bold outline-none"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value="ALL">{language === 'ta' ? 'அனைத்தும்' : 'ALL'}</option>
                      </select>
                    </div>

                    <button 
                      onClick={() => setIsEditingColumns(!isEditingColumns)} 
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${isEditingColumns ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      <Settings size={14} />
                      {isEditingColumns ? (language === 'ta' ? 'அளவை சேமி' : 'Save Column Sizes') : (language === 'ta' ? 'அளவை மாற்று' : 'Resize Columns')}
                    </button>
                  </div>
                </div>

                {/* Ledger Interactive Matrix Table */}
                {(() => {
                  const warperDispatches = dispatches.filter(d => d.recipientType === 'warper' && d.recipientId === selectedWarper.id);
                  const warperReturns = returns.filter(r => r.warperId === selectedWarper.id);

                  // Extract all unique Deniers / Colors
                  const denierColorSet = new Set<string>();

                  warperDispatches.forEach(d => {
                    if (d.items && Array.isArray(d.items)) {
                      d.items.forEach((item: any) => {
                        const key = `${item.yarnType || ''} ${item.color || ''}`.trim() || item.color || 'Default';
                        denierColorSet.add(key);
                      });
                    } else if (d.color) {
                      const key = `${d.yarnType || ''} ${d.color}`.trim();
                      denierColorSet.add(key);
                    }
                  });

                  warperReturns.forEach(r => {
                    if (r.sections && Array.isArray(r.sections)) {
                      r.sections.forEach((sec: any) => {
                        if (sec.color) {
                          const denierName = sec.name ? sec.name.split(' - ')[0] : (r.yarnType || '');
                          const key = `${denierName} ${sec.color}`.trim() || sec.color;
                          denierColorSet.add(key);
                        }
                      });
                    } else if (r.color) {
                      const key = `${r.yarnType || ''} ${r.color}`.trim();
                      denierColorSet.add(key);
                    }
                  });

                  const allDenierColors = Array.from(denierColorSet).sort();

                  // Map all transactions
                  const allTxnsFormatted = [
                    ...warperDispatches.map(d => {
                      const weights: Record<string, number> = {};
                      allDenierColors.forEach(dc => { weights[dc] = 0; });

                      if (d.items && Array.isArray(d.items)) {
                        d.items.forEach((item: any) => {
                          const key = `${item.yarnType || ''} ${item.color || ''}`.trim() || item.color || 'Default';
                          if (weights[key] !== undefined) weights[key] += item.weightKg || 0;
                        });
                      } else if (d.color) {
                        const key = `${d.yarnType || ''} ${d.color}`.trim();
                        if (weights[key] !== undefined) weights[key] += d.weightKg || 0;
                      }

                      return {
                        ...d,
                        isDispatch: true,
                        timestamp: new Date(d.date).getTime(),
                        colorWeights: weights
                      };
                    }),
                    ...warperReturns.map(r => {
                      const weights: Record<string, number> = {};
                      allDenierColors.forEach(dc => { weights[dc] = 0; });

                      let totalEnds = r.ends || 0;
                      let totalMeters = r.length || 0;

                      if (r.sections && Array.isArray(r.sections)) {
                        totalEnds = r.sections.reduce((sum, sec) => sum + (sec.ends || 0), 0);
                        r.sections.forEach((sec: any) => {
                          if (sec.color) {
                            const denierName = sec.name ? sec.name.split(' - ')[0] : (r.yarnType || '');
                            const key = `${denierName} ${sec.color}`.trim() || sec.color;
                            if (weights[key] !== undefined) weights[key] += sec.weightKg || 0;
                          }
                        });
                      } else if (r.color) {
                        const key = `${r.yarnType || ''} ${r.color}`.trim();
                        if (weights[key] !== undefined) weights[key] += r.weightKg || 0;
                      }

                      return {
                        ...r,
                        isDispatch: false,
                        ends: totalEnds,
                        meters: totalMeters,
                        timestamp: new Date(r.date).getTime(),
                        colorWeights: weights
                      };
                    })
                  ].sort((a, b) => a.timestamp - b.timestamp);

                  // Filter by date
                  let filteredTxns = allTxnsFormatted;
                  if (startDate) {
                    filteredTxns = filteredTxns.filter(t => t.date >= startDate);
                  }
                  if (endDate) {
                    filteredTxns = filteredTxns.filter(t => t.date <= endDate);
                  }

                  const displayTxns = statementRowLimit === 'ALL' ? filteredTxns : filteredTxns.slice(0, statementRowLimit);

                  if (allDenierColors.length === 0 && filteredTxns.length === 0) {
                    return (
                      <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                        <p className="text-gray-400 font-bold text-base tamil-font">
                          {language === 'ta' ? 'கணக்கு பதிவுகள் எதுவும் இல்லை' : 'No ledger records found'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="overflow-x-auto max-w-full">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-900 text-white font-black">
                              <th style={{ width: columnWidths['date'] || 90, minWidth: columnWidths['date'] || 90 }} className="p-2.5 border border-zinc-800">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                              <th style={{ width: columnWidths['sno'] || 45, minWidth: columnWidths['sno'] || 45 }} className="p-2.5 border border-zinc-800 text-center">{language === 'ta' ? 'வ.எண்' : 'S.No'}</th>
                              <th style={{ width: columnWidths['particulars'] || 180, minWidth: columnWidths['particulars'] || 180 }} className="p-2.5 border border-zinc-800">{language === 'ta' ? 'விவரம்' : 'Particulars'}</th>
                              <th style={{ width: columnWidths['ends'] || 55, minWidth: columnWidths['ends'] || 55 }} className="p-2.5 border border-zinc-800 text-center">{language === 'ta' ? 'இழை' : 'Ends'}</th>
                              <th style={{ width: columnWidths['meters'] || 55, minWidth: columnWidths['meters'] || 55 }} className="p-2.5 border border-zinc-800 text-center">{language === 'ta' ? 'மீட்டர்' : 'Meters'}</th>
                              {allDenierColors.map(dc => {
                                const width = columnWidths[dc] || (isEditingColumns ? baseColumnWidth : null);
                                return (
                                  <th key={dc} style={width ? { minWidth: `${width}px`, width: `${width}px` } : {}} className="p-2.5 border border-zinc-800 text-right whitespace-normal break-words leading-tight">
                                    {dc}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {displayTxns.length === 0 ? (
                              <tr>
                                <td colSpan={5 + allDenierColors.length} className="p-8 text-center text-gray-400 font-bold">
                                  {language === 'ta' ? 'பதிவுகள் எதுவும் இல்லை' : 'No records found'}
                                </td>
                              </tr>
                            ) : (
                              displayTxns.map((txn: any, idx: number) => {
                                let particularsText = '';
                                if (txn.isDispatch) {
                                  particularsText = language === 'ta' ? 'நூல் வரவு' : 'Yarn Given';
                                  if (txn.supplierName) particularsText += ` - ${txn.supplierName}`;
                                  if (txn.billNumber) particularsText += ` (Bill: ${txn.billNumber})`;
                                } else {
                                  const order = warpOrders.find(o => o.id === txn.orderId);
                                  const weaverName = order?.weaverName || txn.weaverName;
                                  const orderNumber = order?.orderNumber || txn.orderNumber;

                                  const baseText = weaverName && weaverName !== 'Unknown'
                                    ? `${weaverName} ${orderNumber ? `(${orderNumber})` : ''}`
                                    : `${language === 'ta' ? 'வார்ப்பு வரவு' : 'Warp Done'} ${orderNumber ? `(${orderNumber})` : ''}`;

                                  let details = '';
                                  if (txn.sections && txn.sections.length > 0) {
                                    details = txn.sections.map((s: any) => `${s.color || ''} (${s.ends || 0})`).filter((d: string) => d !== ' (0)').join(', ');
                                  } else if (txn.color) {
                                    details = `${txn.color} (${txn.ends || 0})`;
                                  }

                                  particularsText = details ? `${baseText} - ${details}` : baseText;
                                }

                                return (
                                  <tr key={txn.id || idx} className="hover:bg-gray-50/80 transition">
                                    <td className="p-2 border border-gray-200 text-gray-600 font-medium">
                                      {new Date(txn.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-2 border border-gray-200 text-center text-gray-500 font-bold">
                                      {idx + 1}
                                    </td>
                                    <td 
                                      className="p-2 border border-gray-200 font-black text-indigo-700 cursor-pointer hover:underline whitespace-normal break-words leading-tight"
                                      onClick={() => setSelectedTxnDetails(txn)}
                                    >
                                      {particularsText}
                                    </td>
                                    <td className="p-2 border border-gray-200 text-center font-bold text-gray-600">
                                      {!txn.isDispatch && (txn.ends !== undefined && txn.ends !== null) ? txn.ends : '-'}
                                    </td>
                                    <td className="p-2 border border-gray-200 text-center font-bold text-gray-600">
                                      {!txn.isDispatch && (txn.meters !== undefined && txn.meters !== null) ? txn.meters : '-'}
                                    </td>
                                    {allDenierColors.map(dc => {
                                      const val = txn.colorWeights[dc] || 0;
                                      return (
                                        <td key={dc} className={`p-2 border border-gray-200 text-right font-black ${val > 0 ? (txn.isDispatch ? 'text-indigo-700' : 'text-emerald-700') : 'text-gray-300'}`}>
                                          {val > 0 ? (txn.isDispatch ? `+${val.toFixed(2)}` : `-${val.toFixed(2)}`) : '-'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          <tfoot className="bg-zinc-900 text-white font-black border-t-2 border-gray-200">
                            <tr>
                              <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-[11px] bg-zinc-900 border-zinc-800">
                                {language === 'ta' ? 'தற்போதைய இருப்பு (Total Balance):' : 'Total Balance:'}
                              </td>
                              {allDenierColors.map(dc => {
                                const finalBal = filteredTxns.reduce((sum, t) => {
                                  if (t.isDispatch) return sum + (t.colorWeights[dc] || 0);
                                  return sum - (t.colorWeights[dc] || 0);
                                }, 0);
                                return (
                                  <td key={dc} className={`p-3 border border-zinc-800 text-right font-black ${finalBal < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {finalBal.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}










                



                    

















            {viewType === 'orders' && (
              <div className="space-y-4">
            <div className="flex justify-end mb-2">
              <button 
                onClick={() => {
                  setCreatingOrderType('MAIN_WARP');
                  setOrderNumber(`ORD-${getNextSeqNumber()}`);
                  setIsCreatingOrder(true);
                }}
                className="bg-zinc-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md hover:bg-zinc-700 transition"
              >
                <Plus size={16} /> {language === 'ta' ? 'புதிய வார்ப்பு ஆர்டர் உருவாக்கு' : 'Create New Warp Order'}
              </button>
            </div>
            
            {warperOrders.filter(o => !o.orderType || o.orderType === 'MAIN_WARP').length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                <p className="text-gray-500 font-bold tamil-font text-lg">
                  {language === 'ta' ? 'ஆர்டர்கள் எதுவும் இல்லை' : 'No orders available'}
                </p>
              </div>
            ) : (
              warperOrders.filter(o => !o.orderType || o.orderType === 'MAIN_WARP').map(order => (
                <WarpOrderItem 
                  key={order.id}
                  order={order}
                  language={language}
                  onAssign={() => {
                    setIsAssigningOrder(order.id);
                    setAssignWeaverId(order.weaverId === 'STOCK' ? '' : (order.weaverId || ''));
                    setAssignLoomId('');
                  }}
                  onToggleStatus={() => handleToggleOrderStatus(order.id)}
                  onRepeat={() => handleRepeatOrder(order)}
                  onShare={() => handleShareOrder(order)}
                  onEdit={() => handleEditOrder(order)}
                  onDelete={() => handleDeleteOrder(order.id)}
                  isExpanded={expandedOrderId === order.id}
                  onToggleExpand={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                />
              ))
            )}
          </div>
        )}

        {viewType === 'zari-bobbin' && (
          <div className="space-y-4">
            <div className="flex justify-end mb-2">
              <button 
                onClick={() => {
                  setCreatingOrderType('ZARI_BOBBIN');
                  setOrderNumber(`ZB-${getNextSeqNumber()}`);
                  setIsCreatingOrder(true);
                }}
                className="bg-zinc-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md hover:bg-zinc-700 transition"
              >
                <Plus size={16} /> {language === 'ta' ? 'புதிய ஜரிகை பாபின் உருவாக்கு' : 'Create New Zari Bobbin'}
              </button>
            </div>
            
            {warperOrders.filter(o => o.orderType === 'ZARI_BOBBIN').length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                <p className="text-gray-500 font-bold tamil-font text-lg">
                  {language === 'ta' ? 'ஆர்டர்கள் எதுவும் இல்லை' : 'No orders available'}
                </p>
              </div>
            ) : (
              warperOrders.filter(o => o.orderType === 'ZARI_BOBBIN').map(order => (
                <WarpOrderItem 
                  key={order.id}
                  order={order}
                  language={language}
                  onAssign={() => {
                    setIsAssigningOrder(order.id);
                    setAssignWeaverId(order.weaverId === 'STOCK' ? '' : (order.weaverId || ''));
                    setAssignLoomId('');
                  }}
                  onToggleStatus={() => handleToggleOrderStatus(order.id)}
                  onRepeat={() => handleRepeatOrder(order)}
                  onShare={() => handleShareOrder(order)}
                  onEdit={() => handleEditOrder(order)}
                  onDelete={() => handleDeleteOrder(order.id)}
                  isExpanded={expandedOrderId === order.id}
                  onToggleExpand={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                />
              ))
            )}
          </div>
        )}

        {viewType === 'top-warp' && (
          <div className="space-y-4">
            <div className="flex justify-end mb-2">
              <button 
                onClick={() => {
                  setCreatingOrderType('TOP_WARP');
                  setOrderNumber(`TW-${getNextSeqNumber()}`);
                  setIsCreatingOrder(true);
                }}
                className="bg-zinc-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md hover:bg-zinc-700 transition"
              >
                <Plus size={16} /> {language === 'ta' ? 'புதிய மேல் வார்ப்பு உருவாக்கு' : 'Create New Top Warp'}
              </button>
            </div>
            
            {warperOrders.filter(o => o.orderType === 'TOP_WARP').length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                <p className="text-gray-500 font-bold tamil-font text-lg">
                  {language === 'ta' ? 'ஆர்டர்கள் எதுவும் இல்லை' : 'No orders available'}
                </p>
              </div>
            ) : (
              warperOrders.filter(o => o.orderType === 'TOP_WARP').map(order => (
                <WarpOrderItem 
                  key={order.id}
                  order={order}
                  language={language}
                  onAssign={() => {
                    setIsAssigningOrder(order.id);
                    setAssignWeaverId(order.weaverId === 'STOCK' ? '' : (order.weaverId || ''));
                    setAssignLoomId('');
                  }}
                  onToggleStatus={() => handleToggleOrderStatus(order.id)}
                  onRepeat={() => handleRepeatOrder(order)}
                  onShare={() => handleShareOrder(order)}
                  onEdit={() => handleEditOrder(order)}
                  onDelete={() => handleDeleteOrder(order.id)}
                  isExpanded={expandedOrderId === order.id}
                  onToggleExpand={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                />
              ))
            )}
          </div>
        )}

        {viewType === 'all-warps' && (
          <div className="space-y-4">
            {warperOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                <p className="text-gray-500 font-bold tamil-font text-lg">
                  {language === 'ta' ? 'ஆர்டர்கள் எதுவும் இல்லை' : 'No orders available'}
                </p>
              </div>
            ) : (
              <>
                {/* Search and Filter */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder={language === 'ta' ? 'ஐடி, தறிகாரர் பெயர் தேட...' : 'Search ID, Weaver...'}
                      value={warpSearchQuery}
                      onChange={(e) => setWarpSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-zinc-400"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    <button
                      onClick={() => setWarpWageFilter('ALL')}
                      className={`flex-none px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${warpWageFilter === 'ALL' ? 'bg-zinc-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {language === 'ta' ? 'அனைத்தும்' : 'All'}
                    </button>
                    <button
                      onClick={() => setWarpWageFilter('PAID')}
                      className={`flex-none px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${warpWageFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                    >
                      {language === 'ta' ? 'கூலி கொடுத்தது' : 'Fully Paid'}
                    </button>
                    <button
                      onClick={() => setWarpWageFilter('UNPAID')}
                      className={`flex-none px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${warpWageFilter === 'UNPAID' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                    >
                      {language === 'ta' ? 'கூலி கொடுக்க வேண்டியது' : 'Unpaid'}
                    </button>
                    <button
                      onClick={() => setWarpWageFilter('PARTIAL')}
                      className={`flex-none px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${warpWageFilter === 'PARTIAL' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                    >
                      {language === 'ta' ? 'பாதி கூலி கொடுத்தது' : 'Partially Paid'}
                    </button>
                  </div>
                </div>

                {/* Summary Section - Moved to Top */}
                <div className="bg-zinc-900 text-white p-5 rounded-2xl shadow-lg mb-6">
                  <h4 className="font-bold mb-4 opacity-90">{language === 'ta' ? 'மொத்த கணக்குகள்' : 'Total Accounts'}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs opacity-70 mb-1">{language === 'ta' ? 'மொத்த கூலி' : 'Total Wage'}</p>
                      <p className="text-xl font-black">₹{filteredWarperOrders.reduce((sum, o) => sum + (o.wage || 0), 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70 mb-1">{language === 'ta' ? 'கொடுத்தது' : 'Total Paid'}</p>
                      <p className="text-xl font-black text-emerald-400">₹{filteredWarperOrders.reduce((sum, o) => sum + (o.wagePaid || 0), 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70 mb-1">{language === 'ta' ? 'மீதமுள்ள பாக்கி' : 'Total Balance'}</p>
                      <p className="text-xl font-black text-red-400">₹{filteredWarperOrders.reduce((sum, o) => sum + ((o.wage || 0) - (o.wagePaid || 0)), 0)}</p>
                    </div>
                  </div>
                </div>

                {filteredWarperOrders.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-500 font-bold text-sm">
                      {language === 'ta' ? 'தேடலுக்கு ஏற்ற முடிவுகள் இல்லை' : 'No results found'}
                    </p>
                  </div>
                ) : (
                  filteredWarperOrders.map(order => {
                  const isEditingWage = editingWages[order.id] !== undefined;
                  const wageState = editingWages[order.id] || { wage: order.wage?.toString() || '', wagePaid: order.wagePaid?.toString() || '' };
                  const balance = (order.wage || 0) - (order.wagePaid || 0);
                  const isExpanded = expandedOrderId === order.id;

                  return (
                    <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                      {/* Summary View */}
                      <div 
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-zinc-100 text-zinc-800 text-xs font-bold px-2 py-1 rounded-lg">
                              {language === 'ta' ? 'ஐடி:' : 'ID:'} {order.orderNumber || order.id.slice(-4)}
                            </span>
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${order.status !== 'PENDING' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {order.status !== 'PENDING' ? <CheckCircle size={12} /> : <Clock size={12} />}
                              {order.status !== 'PENDING' ? (language === 'ta' ? 'முடிந்தது' : 'Completed') : (language === 'ta' ? 'நிலுவையில்' : 'Pending')}
                            </span>
                            {order.status === 'COMPLETED' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRepeatOrder(order); }}
                                className="p-1.5 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-zinc-200 transition flex items-center gap-1"
                                title={language === 'ta' ? 'மீண்டும் ஆர்டர் செய்' : 'Repeat Order'}
                              >
                                <RefreshCw size={12} />
                                <span className="text-[10px] font-bold">{language === 'ta' ? 'மீண்டும்' : 'Repeat'}</span>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                              <p className="text-xs text-gray-500">{language === 'ta' ? 'தறிகாரர்' : 'Weaver'}</p>
                              <p className="font-bold text-gray-800 text-sm">{order.weaverName || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{language === 'ta' ? 'தறி எண்' : 'Loom No'}</p>
                              <p className="font-bold text-gray-800 text-sm">{order.loomNumber || '-'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 text-gray-400">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                          <div className="mb-4">
                            <h4 className="font-black text-gray-800 text-lg mb-1">{order.designName}</h4>
                            <span className="text-gray-500 text-xs">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-gray-50 p-2 rounded-xl">
                              <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'மொத்த சேலை' : 'Total Sarees'}</p>
                              <p className="font-bold text-gray-800">{order.totalSareesExpected}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-xl">
                              <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'வார்ப்பு (மீட்டர்)' : 'Warp (Meters)'}</p>
                              <p className="font-bold text-gray-800">{order.warpLengthMeters || '-'}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-xl">
                              <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'மொத்த இழைகள்' : 'Total Ends'}</p>
                              <p className="font-bold text-gray-800">{order.sections.reduce((sum, sec) => sum + (sec.ends || 0), 0)}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded-xl">
                              <p className="text-xs text-gray-500 font-medium">{language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}</p>
                              <p className="font-bold text-gray-800">{(order.totalYarnWeight || 0).toFixed(3)} kg</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{language === 'ta' ? 'நூல் விவரங்கள்' : 'Yarn Details'}</h5>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><span className="text-gray-500">{language === 'ta' ? 'பாவு:' : 'Warp:'}</span> <span className="font-bold">{order.warpYarnType}</span></div>
                              <div><span className="text-gray-500">{language === 'ta' ? 'ஊடை:' : 'Weft:'}</span> <span className="font-bold">{order.weftYarnType}</span></div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <h5 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{language === 'ta' ? 'பிரிவுகள்' : 'Sections'}</h5>
                            <div className="space-y-2">
                              {order.sections.map((section, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.color || '#ccc' }} />
                                    <span className="font-bold">{section.color}</span>
                                  </div>
                                  <div className="text-gray-600">
                                    {section.ends} {language === 'ta' ? 'இழைகள்' : 'Ends'} • {(section.weightKg || 0).toFixed(3)} kg
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-gray-100 pt-4 mt-2">
                            <h5 className="text-sm font-bold text-gray-700 mb-3">{language === 'ta' ? 'கூலி விவரங்கள்' : 'Wage Details'}</h5>
                            
                            {isEditingWage ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">{language === 'ta' ? 'மொத்த கூலி (₹)' : 'Total Wage (₹)'}</label>
                                    <input 
                                      type="number" 
                                      value={wageState.wage}
                                      onChange={e => setEditingWages({...editingWages, [order.id]: {...wageState, wage: e.target.value}})}
                                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">{language === 'ta' ? 'கொடுத்த கூலி (₹)' : 'Wage Paid (₹)'}</label>
                                    <input 
                                      type="number" 
                                      value={wageState.wagePaid}
                                      onChange={e => setEditingWages({...editingWages, [order.id]: {...wageState, wagePaid: e.target.value}})}
                                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-zinc-400"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => {
                                      const newEditing = {...editingWages};
                                      delete newEditing[order.id];
                                      setEditingWages(newEditing);
                                    }}
                                    className="flex-1 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg text-sm hover:bg-gray-50"
                                  >
                                    {language === 'ta' ? 'ரத்து' : 'Cancel'}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      handleUpdateWage(order.id);
                                      const newEditing = {...editingWages};
                                      delete newEditing[order.id];
                                      setEditingWages(newEditing);
                                    }}
                                    className="flex-1 py-2 bg-zinc-600 text-white font-bold rounded-lg text-sm hover:bg-zinc-700"
                                  >
                                    {language === 'ta' ? 'சேமி' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                                    <p className="text-[10px] text-gray-500">{language === 'ta' ? 'மொத்த கூலி' : 'Total Wage'}</p>
                                    <p className="font-bold text-gray-700">₹{order.wage || 0}</p>
                                  </div>
                                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                                    <p className="text-[10px] text-gray-500">{language === 'ta' ? 'கொடுத்தது' : 'Paid'}</p>
                                    <p className="font-bold text-green-600">₹{order.wagePaid || 0}</p>
                                  </div>
                                  <div className={`p-2 rounded-lg text-center ${balance > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                                    <p className={`text-[10px] ${balance > 0 ? 'text-red-500' : 'text-gray-500'}`}>{language === 'ta' ? 'பாக்கி' : 'Balance'}</p>
                                    <p className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-700'}`}>₹{balance}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 my-2">
                                  <button 
                                    onClick={() => setEditingWages({...editingWages, [order.id]: { wage: order.wage?.toString() || '', wagePaid: order.wagePaid?.toString() || '' }})}
                                    className="py-2 border border-zinc-200 text-zinc-600 font-bold rounded-lg text-sm hover:bg-zinc-50 transition"
                                  >
                                    {language === 'ta' ? 'கூலியை திருத்து' : 'Edit Wage'}
                                  </button>
                                  <button 
                                    onClick={() => handleEditOrder(order)}
                                    className="py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-sm hover:bg-indigo-100 transition flex items-center justify-center gap-1"
                                  >
                                    <Edit2 size={14} /> {language === 'ta' ? 'ஆர்டர் திருத்து' : 'Edit Order'}
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <button 
                                    onClick={() => handleShareOrder(order)}
                                    className="py-2 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-sm hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                                  >
                                    <Share2 size={16} /> {language === 'ta' ? 'பகிர்' : 'Share'}
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="py-2 bg-rose-50 text-rose-600 font-bold rounded-lg text-sm hover:bg-rose-100 transition flex items-center justify-center gap-2"
                                  >
                                    <Trash2 size={16} /> {language === 'ta' ? 'நீக்கு' : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }))}
              </>
            )}
          </div>
        )}

        {viewType === 'balance' && (
          <div className="space-y-4">
            {warperBalances.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PieChart size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold tamil-font text-lg">
                  {language === 'ta' ? 'கணக்குகள் எதுவும் இல்லை' : 'No balances available'}
                </p>
              </div>
            ) : (
              Object.entries(
                warperBalances.reduce((acc, item) => {
                  if (!acc[item.yarnType]) acc[item.yarnType] = [];
                  acc[item.yarnType].push(item);
                  return acc;
                }, {} as Record<string, typeof warperBalances>)
              ).map(([yarnType, items]) => (
                <div key={yarnType} className="mb-8">
                  <h3 className="text-sm font-black text-gray-500 mb-3 uppercase tracking-wider">
                    {yarnType !== 'Unknown' ? yarnType : (language === 'ta' ? 'டீனியர் இல்லை' : 'No Denier')}
                  </h3>
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-zinc-500"></div>
                            <h4 className="font-black text-gray-800 text-lg">{item.color}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleShareBalance(yarnType, item.color, item.balance)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                              title={language === 'ta' ? 'பகிர்' : 'Share'}
                            >
                              <Share2 size={18} />
                            </button>
                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${item.balance > 0 ? 'bg-emerald-100 text-emerald-700' : item.balance < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                              {language === 'ta' ? 'மீதம்: ' : 'Bal: '}{item.balance.toFixed(2)} kg
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-zinc-50 p-3 rounded-xl">
                            <p className="text-xs text-zinc-600 font-bold mb-1">{language === 'ta' ? 'கொடுத்தது' : 'Given'}</p>
                            <p className="font-black text-zinc-900 text-lg">{item.received.toFixed(2)} kg</p>
                          </div>
                          <div className="bg-emerald-50 p-3 rounded-xl">
                            <p className="text-xs text-emerald-600 font-bold mb-1">{language === 'ta' ? 'வந்தது' : 'Returned'}</p>
                            <p className="font-black text-emerald-900 text-lg">{item.returned.toFixed(2)} kg</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {viewType === 'received' && (
          <div className="space-y-3">
            {warperDispatches.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowDownLeft size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold tamil-font text-lg">
                  {language === 'ta' ? 'நூல் எதுவும் கொடுக்கவில்லை' : 'No yarn given yet'}
                </p>
              </div>
            ) : (
              warperDispatches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(dispatch => (
                <DispatchItem 
                  key={dispatch.id}
                  dispatch={dispatch}
                  language={language}
                />
              ))
            )}
          </div>
        )}

        {viewType === 'returned' && (
          <>
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setIsAddingReturn(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-md hover:bg-emerald-700 transition"
              >
                <Plus size={14} /> {language === 'ta' ? 'வார்ப்பு வரவு+' : 'Add Return+'}
              </button>
            </div>

            {warperReturns.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowUpRight size={32} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold tamil-font text-lg">
                  {language === 'ta' ? 'வரவுகள் எதுவும் இல்லை' : 'No returns yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {warperReturns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(ret => (
                  <ReturnItem 
                    key={ret.id}
                    ret={ret}
                    language={language}
                  />
                ))}
              </div>
            )}
          </>
        )}
        {viewType === 'warp-designs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-zinc-800 tamil-font">
                {language === 'ta' ? 'வார்ப்பு டிசைன்கள்' : 'Warp Designs'}
              </h3>
              <button 
                onClick={() => {
                  setOrderDesignName('');
                  setOrderNumber('');
                  setOrderWeftYarnType('');
                  setOrderSections([{ name: 'உடல்', ends: 0, color: '' }]);
                  setOrderTotalSarees('');
                  setOrderWarpLength('');
                  setOrderWarpWeight('');
                  setZariBobbins('');
                  setZariEndsPerBobbin('');
                  setZariMeters('');
                  setZariWeight('');
                  setZariYarnType('');
                  setZariColor('');
                  setTopWarpYarnType('');
                  setTopWarpLengthMeters('');
                  setTopWarpTotalYarnWeight('');
                  setTopWarpSections([{ name: 'உடல்', ends: 0, color: '' }]);
                  setCreatingOrderType('MAIN_WARP');
                  setEditingDesignId(null);
                  setIsCreatingDesign(true);
                }}
                className="bg-zinc-900 text-white p-3 rounded-2xl shadow-lg hover:bg-zinc-800 transition shadow-zinc-200"
              >
                <Plus size={24} />
              </button>
            </div>

            {warpDesigns.filter(d => d.warperId === selectedWarper.id).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-zinc-200 shadow-sm">
                <p className="text-zinc-500 font-bold tamil-font">
                  {language === 'ta' ? 'டிசைன்கள் எதுவும் இல்லை' : 'No designs created yet'}
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  {language === 'ta' ? '+ பட்டனை அழுத்தி உருவாக்கவும்' : 'Press + button to create a new design'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {warpDesigns
                  .filter(d => d.warperId === selectedWarper.id)
                  .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
                  .map(design => (
                  <WarpDesignItem 
                    key={design.id}
                    design={design}
                    language={language}
                    onClick={() => setViewingDesignId(design.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )}
      {isAssigningOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <h3 className="font-black text-gray-800 mb-6 text-xl tamil-font">{language === 'ta' ? 'தறிக்கு மாற்று' : 'Assign to Loom'}</h3>
            
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select 
                    value={isAddingNewWeaver ? 'NEW' : assignWeaverId}
                    onChange={e => {
                      if (e.target.value === 'NEW') {
                        setIsAddingNewWeaver(true);
                        setAssignWeaverId('');
                      } else {
                        setIsAddingNewWeaver(false);
                        setAssignWeaverId(e.target.value);
                      }
                      setAssignLoomId('');
                      setIsAddingNewLoom(false);
                    }}
                    className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                  >
                    <option value="">{language === 'ta' ? '-- தறிக்காரரை தேர்ந்தெடுக்கவும் --' : '-- Select Weaver --'}</option>
                    {weavers.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                    <option value="NEW" className="text-zinc-600 font-black">+ {language === 'ta' ? 'புதிய தறிக்காரர்' : 'New Weaver'}</option>
                  </select>
                </div>
                {isAddingNewWeaver && (
                  <input 
                    type="text"
                    placeholder={language === 'ta' ? 'தறிக்காரர் பெயர்' : 'Weaver Name'}
                    value={newWeaverName}
                    onChange={e => setNewWeaverName(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-zinc-200 rounded-2xl text-sm outline-none focus:border-zinc-500 font-bold animate-in slide-in-from-top-2"
                    autoFocus
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <select 
                    value={isAddingNewLoom ? 'NEW' : assignLoomId}
                    onChange={e => {
                      if (e.target.value === 'NEW') {
                        setIsAddingNewLoom(true);
                        setAssignLoomId('');
                      } else {
                        setIsAddingNewLoom(false);
                        setAssignLoomId(e.target.value);
                      }
                    }}
                    className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    disabled={!assignWeaverId && !isAddingNewWeaver}
                  >
                    <option value="">{language === 'ta' ? '-- தறியை தேர்ந்தெடுக்கவும் --' : '-- Select Loom --'}</option>
                    {looms.filter(l => l.weaverId === assignWeaverId).map(l => (
                      <option key={l.id} value={l.id}>{language === 'ta' ? 'தறி' : 'Loom'} {l.loomNumber} - {l.designName}</option>
                    ))}
                    <option value="NEW" className="text-zinc-600 font-black">+ {language === 'ta' ? 'புதிய தறி' : 'New Loom'}</option>
                  </select>
                </div>
                {isAddingNewLoom && (
                  <input 
                    type="text"
                    placeholder={language === 'ta' ? 'தறி எண்/பெயர்' : 'Loom Number/Name'}
                    value={newLoomNumber}
                    onChange={e => setNewLoomNumber(e.target.value)}
                    className="w-full p-4 bg-white border-2 border-zinc-200 rounded-2xl text-sm outline-none focus:border-zinc-500 font-bold animate-in slide-in-from-top-2"
                    autoFocus
                  />
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setIsAssigningOrder(null);
                  setAssignWeaverId('');
                  setAssignLoomId('');
                  setIsAddingNewWeaver(false);
                  setNewWeaverName('');
                  setIsAddingNewLoom(false);
                  setNewLoomNumber('');
                }} 
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm"
              >
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button 
                onClick={handleAssignOrder} 
                className="flex-1 py-4 bg-zinc-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-zinc-200 flex items-center justify-center gap-2"
              >
                <Check size={18} />
                {language === 'ta' ? 'மாற்று' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreatingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-gray-800 mb-6 text-xl tamil-font">
              {creatingOrderType === 'MAIN_WARP' && (language === 'ta' ? 'புதிய வார்ப்பு ஆர்டர்' : 'New Warp Order')}
              {creatingOrderType === 'ZARI_BOBBIN' && (language === 'ta' ? 'புதிய ஜரிகை பாபின்' : 'New Zari Bobbin')}
              {creatingOrderType === 'TOP_WARP' && (language === 'ta' ? 'புதிய மேல் வார்ப்பு' : 'New Top Warp')}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder={language === 'ta' ? 'ஐடி எண்' : 'ID Number'}
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                />
                <input 
                  type="text" 
                  placeholder={language === 'ta' ? 'டிசைன் பெயர்' : 'Design Name'}
                  value={orderDesignName}
                  onChange={e => setOrderDesignName(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                />
              </div>
              
              {creatingOrderType === 'MAIN_WARP' && (
                <>
                  <div className="mb-4">
                    <select 
                      value={orderWeftYarnType}
                      onChange={e => setOrderWeftYarnType(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    >
                      <option value="">{language === 'ta' ? 'ஊடை நூல்' : 'Weft Yarn'}</option>
                      {YARN_TYPES.map((type, idx) => (
                        <option key={`weft-${idx}`} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 mb-3">{language === 'ta' ? 'வார்ப்பு அமைப்பு' : 'Warp Structure'}</p>
                    <div className="space-y-2">
                      {orderSections.map((section, index) => (
                        <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-100">
                          <select
                            value={section.name.split(' - ')[0] || ''}
                            onChange={e => {
                              const part = section.name.split(' - ')[1] || '';
                              handleOrderSectionChange(index, 'name', `${e.target.value}${part ? ' - ' + part : ''}`);
                            }}
                            className="w-24 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          >
                            <option value="">{language === 'ta' ? 'டீனியர்' : 'Denier'}</option>
                            {denierFormulas.map(f => (
                              <option key={f.id} value={f.denier}>{f.denier}</option>
                            ))}
                          </select>
                          <select
                            value={section.name.split(' - ')[1] || ''}
                            onChange={e => {
                              const denier = section.name.split(' - ')[0] || '';
                              handleOrderSectionChange(index, 'name', `${denier ? denier + ' - ' : ''}${e.target.value}`);
                            }}
                            className="w-24 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          >
                            <option value="">{language === 'ta' ? 'பகுதி' : 'Part'}</option>
                            <option value={language === 'ta' ? 'ரைட் பார்டர்' : 'Right Border'}>{language === 'ta' ? 'ரைட் பார்டர்' : 'Right Border'}</option>
                            <option value={language === 'ta' ? 'லெஃப்ட் பார்டர்' : 'Left Border'}>{language === 'ta' ? 'லெஃப்ட் பார்டர்' : 'Left Border'}</option>
                            <option value={language === 'ta' ? 'உடல்' : 'Body'}>{language === 'ta' ? 'உடல்' : 'Body'}</option>
                            <option value={language === 'ta' ? 'பிளைன்' : 'Plain'}>{language === 'ta' ? 'பிளைன்' : 'Plain'}</option>
                          </select>
                          <input 
                            type="number" 
                            placeholder={language === 'ta' ? 'இழை' : 'Ends'}
                            value={section.ends || ''}
                            onChange={e => handleOrderSectionChange(index, 'ends', parseInt(e.target.value) || 0)}
                            className="w-16 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          />
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder={language === 'ta' ? 'எடை(kg)' : 'Wt(kg)'}
                            value={section.weightKg || ''}
                            onChange={e => handleOrderSectionChange(index, 'weightKg', parseFloat(e.target.value) || 0)}
                            className="w-16 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          />
                          <select 
                            value={section.color || ''}
                            onChange={e => handleOrderSectionChange(index, 'color', e.target.value)}
                            className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          >
                            <option value="">{language === 'ta' ? 'கலர்' : 'Color'}</option>
                            {YARN_COLORS.map((color, idx) => (
                              <option key={`color-${idx}`} value={color}>{color}</option>
                            ))}
                          </select>
                          {orderSections.length > 1 && (
                            <button onClick={() => removeOrderSection(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button 
                        onClick={addOrderSection}
                        className="w-full py-2 mt-2 border border-dashed border-zinc-300 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-50 transition"
                      >
                        + {language === 'ta' ? 'மேலும் சேர்க்க' : 'Add More'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'மொத்த சேலை' : 'Total Sarees'}
                      value={orderTotalSarees}
                      onChange={e => setOrderTotalSarees(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'வார்ப்பு (மீட்டர்)' : 'Warp Length (m)'}
                      value={orderWarpLength}
                      onChange={e => {
                        const newLength = e.target.value;
                        setOrderWarpLength(newLength);
                        const meters = parseFloat(newLength) || 0;
                        if (meters > 0) {
                          const updatedSections = orderSections.map(sec => {
                            const denierMatch = sec.name.split(' - ')[0];
                            const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
                            const multiplier = formula ? formula.multiplier : 0;
                            if (sec.ends > 0 && multiplier > 0) {
                              return { ...sec, weightKg: parseFloat((sec.ends * multiplier * meters).toFixed(3)) };
                            }
                            return sec;
                          });
                          setOrderSections(updatedSections);
                        }
                      }}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                  </div>
                  
                  <input 
                    type="number" 
                    placeholder={language === 'ta' ? 'மொத்த நூல் எடை (kg)' : 'Total Yarn Weight (kg)'}
                    value={orderWarpWeight}
                    onChange={e => setOrderWarpWeight(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                  />
                </>
              )}

              {creatingOrderType === 'ZARI_BOBBIN' && (
                <>
                  <div className="mb-4">
                    <select 
                      value={zariYarnType}
                      onChange={e => setZariYarnType(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    >
                      <option value="">{language === 'ta' ? 'ஜரிகை டீனியர்' : 'Zari Denier'}</option>
                      {denierFormulas.map(f => (
                        <option key={`zari-${f.id}`} value={f.denier}>{f.denier}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <select 
                      value={zariColor}
                      onChange={e => setZariColor(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    >
                      <option value="">{language === 'ta' ? 'நிறம்' : 'Color'}</option>
                      {YARN_COLORS.map((color, idx) => (
                        <option key={`zari-color-${idx}`} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'பாபின்கள் எண்ணிக்கை' : 'Number of Bobbins'}
                      value={zariBobbins}
                      onChange={e => setZariBobbins(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'இழைகள்/பாபின்' : 'Ends per Bobbin'}
                      value={zariEndsPerBobbin}
                      onChange={e => setZariEndsPerBobbin(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'மீட்டர்' : 'Meters'}
                      value={zariMeters}
                      onChange={e => setZariMeters(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'எடை (kg)' : 'Weight (kg)'}
                      value={zariWeight}
                      onChange={e => setZariWeight(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                  </div>
                </>
              )}

              {creatingOrderType === 'TOP_WARP' && (
                <>
                  <div className="mb-4">
                    <select 
                      value={topWarpYarnType}
                      onChange={e => {
                        const newType = e.target.value;
                        setTopWarpYarnType(newType);
                        
                        const meters = parseFloat(topWarpLengthMeters) || 0;
                        if (newType && meters > 0) {
                          const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === newType.trim().toLowerCase());
                          const multiplier = formula ? formula.multiplier : 0;
                          if (multiplier > 0) {
                            const updatedSections = topWarpSections.map(sec => {
                              if (sec.ends > 0) {
                                return { ...sec, weightKg: parseFloat((sec.ends * multiplier * meters).toFixed(3)) };
                              }
                              return sec;
                            });
                            setTopWarpSections(updatedSections);
                          }
                        }
                      }}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    >
                      <option value="">{language === 'ta' ? 'மேல் வார்ப்பு நூல்' : 'Top Warp Yarn'}</option>
                      {YARN_TYPES.map((type, idx) => (
                        <option key={`top-warp-${idx}`} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 mb-3">{language === 'ta' ? 'பகுதிகள்' : 'Sections'}</p>
                    <div className="space-y-2">
                      {topWarpSections.map((section, index) => (
                        <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-100">
                          <input 
                            type="text" 
                            placeholder={language === 'ta' ? 'பகுதி பெயர்' : 'Section Name'}
                            value={section.name || ''}
                            onChange={e => {
                              const newSections = [...topWarpSections];
                              newSections[index].name = e.target.value;
                              setTopWarpSections(newSections);
                            }}
                            className="w-24 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          />
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'இழை' : 'Ends'}
                      value={section.ends || ''}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        const newSections = [...topWarpSections];
                        newSections[index].ends = val;
                        
                        // Auto-calculate weight if possible
                        const meters = parseFloat(topWarpLengthMeters) || 0;
                        if (val > 0 && meters > 0 && topWarpYarnType) {
                          const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === topWarpYarnType.trim().toLowerCase());
                          const multiplier = formula ? formula.multiplier : 0;
                          if (multiplier > 0) {
                            newSections[index].weightKg = parseFloat((val * multiplier * meters).toFixed(3));
                          }
                        }
                        
                        setTopWarpSections(newSections);
                      }}
                      className="w-16 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                    />
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder={language === 'ta' ? 'எடை(kg)' : 'Wt(kg)'}
                            value={section.weightKg || ''}
                            onChange={e => {
                              const newSections = [...topWarpSections];
                              newSections[index].weightKg = parseFloat(e.target.value) || 0;
                              setTopWarpSections(newSections);
                            }}
                            className="w-16 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          />
                          <select 
                            value={section.color || ''}
                            onChange={e => {
                              const newSections = [...topWarpSections];
                              newSections[index].color = e.target.value;
                              setTopWarpSections(newSections);
                            }}
                            className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          >
                            <option value="">{language === 'ta' ? 'கலர்' : 'Color'}</option>
                            {YARN_COLORS.map((color, idx) => (
                              <option key={`color-${idx}`} value={color}>{color}</option>
                            ))}
                          </select>
                          {topWarpSections.length > 1 && (
                            <button onClick={() => {
                              setTopWarpSections(topWarpSections.filter((_, i) => i !== index));
                            }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button 
                        onClick={() => {
                          setTopWarpSections([...topWarpSections, { name: language === 'ta' ? `பகுதி ${topWarpSections.length + 1}` : `Section ${topWarpSections.length + 1}`, ends: 0, color: '' }]);
                        }}
                        className="w-full py-2 mt-2 border border-dashed border-zinc-300 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-50 transition"
                      >
                        + {language === 'ta' ? 'மேலும் சேர்க்க' : 'Add More'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'மேல் வார்ப்பு (மீட்டர்)' : 'Top Warp Length (m)'}
                      value={topWarpLengthMeters}
                      onChange={e => {
                        const newLength = e.target.value;
                        setTopWarpLengthMeters(newLength);
                        const meters = parseFloat(newLength) || 0;
                        if (meters > 0 && topWarpYarnType) {
                          const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === topWarpYarnType.trim().toLowerCase());
                          const multiplier = formula ? formula.multiplier : 0;
                          if (multiplier > 0) {
                            const updatedSections = topWarpSections.map(sec => {
                              if (sec.ends > 0) {
                                return { ...sec, weightKg: parseFloat((sec.ends * multiplier * meters).toFixed(3)) };
                              }
                              return sec;
                            });
                            setTopWarpSections(updatedSections);
                          }
                        }
                      }}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'மொத்த நூல் எடை (kg)' : 'Total Yarn Weight (kg)'}
                      value={topWarpTotalYarnWeight}
                      onChange={e => setTopWarpTotalYarnWeight(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                  </div>
                </>
              )}
            </div>
            
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => {
                    setIsCreatingOrder(false);
                    resetDesignFields();
                  }} 
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm active:scale-95 transition-all"
                >
                  {language === 'ta' ? 'ரத்து' : 'Cancel'}
                </button>
              <button 
                onClick={handleCreateOrder} 
                className="flex-1 py-4 bg-fuchsia-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-fuchsia-100 active:scale-95 transition-all hover:bg-fuchsia-700"
              >
                {language === 'ta' ? 'சேமி' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingReturn && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-gray-800 mb-6 text-xl tamil-font">
              {editingReturnId 
                ? (language === 'ta' ? 'வார்ப்பு வரவு திருத்து' : 'Edit Warp Done')
                : (language === 'ta' ? 'வார்ப்பு வரவு' : 'Warp Done')}
            </h3>
            <div className="space-y-4 mb-6">
              <input 
                type="date" 
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-emerald-400 font-bold"
              />
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 block">
                  {language === 'ta' ? 'தறிகாரர்' : 'Weaver'}
                </label>
                <select 
                  value={returnWeaverId}
                  onChange={e => {
                    const selId = e.target.value;
                    setReturnWeaverId(selId);
                    const w = weavers.find(item => item.id === selId);
                    if (w) {
                      setReturnWeaverName(w.name);
                    }
                  }}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-emerald-400 font-bold"
                >
                  <option value="">{language === 'ta' ? '-- தறிகாரரை தேர்ந்தெடுக்கவும் --' : '-- Select Weaver --'}</option>
                  {weavers.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>

                <input 
                  type="text" 
                  placeholder={language === 'ta' ? 'அல்லது தறிகாரர் பெயர் உள்ளிடவும் / எடிட் செய்யவும்' : 'Or enter / edit Weaver Name'}
                  value={returnWeaverName}
                  onChange={e => {
                    const val = e.target.value;
                    setReturnWeaverName(val);
                    const matched = weavers.find(w => w.name.toLowerCase() === val.trim().toLowerCase());
                    if (matched) setReturnWeaverId(matched.id);
                  }}
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-emerald-400 font-bold"
                />
              </div>

              <input 
                type="number" 
                step="0.01"
                placeholder={language === 'ta' ? 'மீட்டர் (Meters)' : 'Meters'}
                value={returnMeters}
                onChange={e => {
                  const newMeters = e.target.value;
                  setReturnMeters(newMeters);
                  const meters = parseFloat(newMeters) || 0;
                  if (meters > 0) {
                    const updatedSections = returnSections.map(sec => {
                      const denierMatch = sec.name.split(' - ')[0];
                      const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
                      const multiplier = formula ? formula.multiplier : 0;
                      if (sec.ends > 0 && multiplier > 0) {
                        return { ...sec, weightKg: parseFloat((sec.ends * multiplier * meters).toFixed(3)) };
                      }
                      return sec;
                    });
                    setReturnSections(updatedSections);
                  }
                }}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-emerald-400 font-bold"
              />

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-3">{language === 'ta' ? 'நூல் விவரங்கள்' : 'Yarn Details'}</p>
                <div className="space-y-2">
                  {returnSections.map((section, index) => (
                    <div key={index} className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-xl border border-gray-100">
                      <select
                        value={section.name.split(' - ')[0] || ''}
                        onChange={e => {
                          const part = section.name.split(' - ')[1] || '';
                          handleReturnSectionChange(index, 'name', `${e.target.value}${part ? ' - ' + part : ''}`);
                        }}
                        className="flex-1 min-w-[80px] p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-400 font-bold"
                      >
                        <option value="">{language === 'ta' ? 'டீனியர்' : 'Denier'}</option>
                        {denierFormulas.map(f => (
                          <option key={f.id} value={f.denier}>{f.denier}</option>
                        ))}
                      </select>
                      <select
                        value={section.name.split(' - ')[1] || ''}
                        onChange={e => {
                          const denier = section.name.split(' - ')[0] || '';
                          handleReturnSectionChange(index, 'name', `${denier ? denier + ' - ' : ''}${e.target.value}`);
                        }}
                        className="flex-1 min-w-[80px] p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-400 font-bold"
                      >
                        <option value="">{language === 'ta' ? 'பகுதி' : 'Part'}</option>
                        <option value={language === 'ta' ? 'ரைட் பார்டர்' : 'Right Border'}>{language === 'ta' ? 'ரைட் பார்டர்' : 'Right Border'}</option>
                        <option value={language === 'ta' ? 'லெஃப்ட் பார்டர்' : 'Left Border'}>{language === 'ta' ? 'லெஃப்ட் பார்டர்' : 'Left Border'}</option>
                        <option value={language === 'ta' ? 'உடல்' : 'Body'}>{language === 'ta' ? 'உடல்' : 'Body'}</option>
                        <option value={language === 'ta' ? 'பிளைன்' : 'Plain'}>{language === 'ta' ? 'பிளைன்' : 'Plain'}</option>
                      </select>
                      <select 
                        value={section.color || ''}
                        onChange={e => handleReturnSectionChange(index, 'color', e.target.value)}
                        className="flex-1 min-w-[80px] p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-400 font-bold"
                      >
                        <option value="">{language === 'ta' ? 'கலர்' : 'Color'}</option>
                        {YARN_COLORS.map((color, idx) => (
                          <option key={`color-${idx}`} value={color}>{color}</option>
                        ))}
                      </select>
                      <div className="w-full flex gap-2 mt-1">
                        <input 
                          type="number" 
                          placeholder={language === 'ta' ? 'இழை' : 'Ends'}
                          value={section.ends || ''}
                          onChange={e => handleReturnSectionChange(index, 'ends', parseInt(e.target.value) || 0)}
                          className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-400 font-bold"
                        />
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder={language === 'ta' ? 'எடை(kg)' : 'Wt(kg)'}
                          value={section.weightKg || ''}
                          onChange={e => handleReturnSectionChange(index, 'weightKg', parseFloat(e.target.value) || 0)}
                          className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-400 font-bold"
                        />
                        {returnSections.length > 1 && (
                          <button onClick={() => removeReturnSection(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-none">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={addReturnSection}
                    className="w-full py-2 mt-2 border border-dashed border-emerald-300 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-50 transition"
                  >
                    + {language === 'ta' ? 'மேலும் சேர்க்க' : 'Add More'}
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 text-center">
                {language === 'ta' ? 'இழை கொடுத்தால் எடை தானாக கணக்கிடப்படும் (ஃபார்முலா இருந்தால்)' : 'Weight auto-calculated from ends if formula exists'}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setIsAddingReturn(false); setEditingReturnId(null); setReturnWeaverName(''); }} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm">
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button onClick={handleAddReturn} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-200">
                {language === 'ta' ? 'சேமி' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingDispatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-gray-800 mb-6 text-xl tamil-font">
              {editingDispatchId 
                ? (language === 'ta' ? 'நூல் வரவு திருத்து' : 'Edit Yarn Given')
                : (language === 'ta' ? 'நூல் வரவு' : 'Yarn Given')}
            </h3>
            <div className="space-y-4 mb-6">
              <input 
                type="date" 
                value={dispatchDate}
                onChange={e => setDispatchDate(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
              />
              <select 
                value={dispatchSupplierId}
                onChange={e => setDispatchSupplierId(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
              >
                <option value="">{language === 'ta' ? '-- சப்ளையர் --' : '-- Supplier --'}</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder={language === 'ta' ? 'பில் நம்பர்' : 'Bill Number'}
                value={dispatchBillNumber}
                onChange={e => setDispatchBillNumber(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
              />
              
              <div className="space-y-3 mt-6">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-gray-700">{language === 'ta' ? 'நூல் விவரங்கள்' : 'Yarn Details'}</h4>
                  <button 
                    onClick={() => setDispatchItems([...dispatchItems, {denier: '', color: '', weight: ''}])}
                    className="text-xs font-bold text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-xl hover:bg-zinc-200 transition"
                  >
                    + {language === 'ta' ? 'சேர்' : 'Add'}
                  </button>
                </div>
                
                {dispatchItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div className="flex-1 space-y-2">
                      <select 
                        value={item.denier}
                        onChange={e => {
                          const newItems = [...dispatchItems];
                          newItems[idx].denier = e.target.value;
                          setDispatchItems(newItems);
                        }}
                        className="w-full p-3 bg-white border border-gray-100 rounded-xl text-sm outline-none focus:border-zinc-400 font-bold"
                      >
                        <option value="">{language === 'ta' ? 'டீனியர்' : 'Denier'}</option>
                        {denierFormulas.map(f => (
                          <option key={f.id} value={f.denier}>{f.denier}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <select 
                          value={item.color}
                          onChange={e => {
                            const newItems = [...dispatchItems];
                            newItems[idx].color = e.target.value;
                            setDispatchItems(newItems);
                          }}
                          className="flex-1 p-3 bg-white border border-gray-100 rounded-xl text-sm outline-none focus:border-zinc-400 font-bold"
                        >
                          <option value="">{language === 'ta' ? 'கலர்' : 'Color'}</option>
                          {YARN_COLORS.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Kg"
                          value={item.weight}
                          onChange={e => {
                            const newItems = [...dispatchItems];
                            newItems[idx].weight = e.target.value;
                            setDispatchItems(newItems);
                          }}
                          className="w-24 p-3 bg-white border border-gray-100 rounded-xl text-sm outline-none focus:border-zinc-400 font-bold"
                        />
                      </div>
                    </div>
                    {dispatchItems.length > 1 && (
                      <button 
                        onClick={() => {
                          const newItems = dispatchItems.filter((_, i) => i !== idx);
                          setDispatchItems(newItems);
                        }}
                        className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setIsAddingDispatch(false); setEditingDispatchId(null); }} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm">
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button onClick={handleAddDispatch} className="flex-1 py-4 bg-zinc-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-zinc-200">
                {language === 'ta' ? 'சேமி' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-xs shadow-2xl text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={32} />
            </div>
            <h3 className="font-black text-gray-800 text-lg mb-6 leading-tight">{successMessage}</h3>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
            >
              {language === 'ta' ? 'சரி' : 'OK'}
            </button>
          </div>
        </div>
      )}

      {isManagingFormulas && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-gray-800 mb-6 text-xl tamil-font">{language === 'ta' ? 'டீனியர் ஃபார்முலா' : 'Denier Formulas'}</h3>
            
            <div className="space-y-3 mb-6">
              {denierFormulas.map(f => (
                <div key={f.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-bold text-gray-800">{f.denier}</p>
                    <p className="text-xs text-gray-500">1 {language === 'ta' ? 'இழை' : 'End'} = {parseFloat((f.multiplier * 1000).toFixed(6))} {language === 'ta' ? 'கிராம்' : 'g'}</p>
                  </div>
                  <button 
                    onClick={() => saveFormulas(denierFormulas.filter(df => df.id !== f.id))}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {denierFormulas.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">{language === 'ta' ? 'ஃபார்முலா எதுவும் இல்லை' : 'No formulas added'}</p>
              )}
            </div>

            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 mb-6">
              <h4 className="text-xs font-bold text-zinc-800 mb-3">{language === 'ta' ? 'புதிய ஃபார்முலா சேர்' : 'Add New Formula'}</h4>
              <div className="space-y-3">
                <select
                  value={isCustomDenier ? 'other' : (YARN_TYPES.includes(newFormulaDenier) ? newFormulaDenier : (newFormulaDenier ? 'other' : ''))}
                  onChange={e => {
                    if (e.target.value === 'other') {
                      setIsCustomDenier(true);
                      setNewFormulaDenier('');
                    } else {
                      setIsCustomDenier(false);
                      setNewFormulaDenier(e.target.value);
                    }
                  }}
                  className="w-full p-3 bg-white border border-zinc-100 rounded-xl text-sm outline-none focus:border-zinc-400 font-medium"
                >
                  <option value="">{language === 'ta' ? '-- டீனியர் தேர்ந்தெடுக்கவும் --' : '-- Select Denier --'}</option>
                  {YARN_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                  <option value="other">{language === 'ta' ? 'மற்றவை (Type Custom)' : 'Other (Type Custom)'}</option>
                </select>
                
                {isCustomDenier && (
                  <input 
                    type="text" 
                    placeholder={language === 'ta' ? 'டீனியர் பெயர் (உ.ம்: 50 Denier)' : 'Denier Name (e.g., 50 Denier)'}
                    value={newFormulaDenier}
                    onChange={e => setNewFormulaDenier(e.target.value)}
                    className="w-full p-3 bg-white border border-zinc-100 rounded-xl text-sm outline-none focus:border-zinc-400 animate-in fade-in slide-in-from-top-2"
                  />
                )}
                <input 
                  type="number" 
                  step="0.000001"
                  placeholder={language === 'ta' ? '1 இழை எத்தனை கிராம்?' : 'Grams per 1 End?'}
                  value={newFormulaMultiplier}
                  onChange={e => setNewFormulaMultiplier(e.target.value)}
                  className="w-full p-3 bg-white border border-zinc-100 rounded-xl text-sm outline-none focus:border-zinc-400"
                />
                <button 
                  onClick={handleAddFormula}
                  className="w-full py-3 bg-zinc-600 text-white rounded-xl font-bold text-sm shadow-md"
                >
                  {language === 'ta' ? 'சேர்' : 'Add'}
                </button>
              </div>
            </div>

            <button onClick={() => setIsManagingFormulas(false)} className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm">
              {language === 'ta' ? 'மூடு' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {viewingDesignId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
          {(() => {
            const design = warpDesigns.find(d => d.id === viewingDesignId);
            if (!design) return null;
            return (
              <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-2xl text-zinc-900">{design.name}</h3>
                    <p className="text-sm font-bold text-zinc-400 mt-1 uppercase tracking-wider">{language === 'ta' ? 'டிசைன் விவரங்கள்' : 'Design Details'}</p>
                  </div>
                  <button onClick={() => setViewingDesignId(null)} className="p-2 bg-gray-100 rounded-full text-zinc-500">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{language === 'ta' ? 'மொத்த சேலை' : 'Total Sarees'}</p>
                      <p className="font-black text-zinc-800 text-lg">{design.totalSareesExpected}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{language === 'ta' ? 'வார்ப்பு (மீ)' : 'Warp (m)'}</p>
                      <p className="font-black text-zinc-800 text-lg">{design.warpLengthMeters}m</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">{language === 'ta' ? 'பகுதிகள்' : 'Sections'}</p>
                    {design.sections.map((sec, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-white border border-zinc-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-zinc-300" />
                          <span className="font-bold text-sm text-zinc-700">{sec.name}</span>
                        </div>
                        <div className="flex gap-4 items-center">
                          <span className="text-[10px] font-black text-zinc-400 uppercase">{sec.color}</span>
                          <span className="font-black text-sm text-zinc-900">{sec.ends} <span className="text-[10px] text-zinc-400">Ends</span></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-zinc-100 flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        setOrderDesignName(design.name);
                        setOrderWeftYarnType(design.weftYarnType || '');
                        setOrderSections(design.sections);
                        setOrderTotalSarees(design.totalSareesExpected.toString());
                        setOrderWarpLength(design.warpLengthMeters?.toString() || '');
                        setOrderWarpWeight(design.totalYarnWeight.toString());
                        setZariBobbins(design.zariBobbins?.toString() || '');
                        setZariEndsPerBobbin(design.zariEndsPerBobbin?.toString() || '');
                        setZariMeters(design.zariMeters?.toString() || '');
                        setZariWeight(design.zariTotalYarnWeight?.toString() || '');
                        setZariYarnType(design.zariYarnType || '');
                        setZariColor(design.zariColor || '');
                        setTopWarpYarnType(design.topWarpYarnType || '');
                        setTopWarpLengthMeters(design.topWarpLengthMeters?.toString() || '');
                        setTopWarpTotalYarnWeight(design.topWarpTotalYarnWeight?.toString() || '');
                        setTopWarpSections(design.topWarpSections || [{ name: 'உடல்', ends: 0, color: '' }]);
                        let dType: 'MAIN_WARP' | 'TOP_WARP' | 'ZARI_BOBBIN' = 'MAIN_WARP';
                        if (design.sections && design.sections.length > 0 && design.sections.some(s => s.ends > 0)) {
                          dType = 'MAIN_WARP';
                        } else if (design.topWarpSections && design.topWarpSections.length > 0 && design.topWarpSections.some(s => s.ends > 0)) {
                          dType = 'TOP_WARP';
                        } else if (design.zariBobbins && design.zariBobbins > 0) {
                          dType = 'ZARI_BOBBIN';
                        }
                        
                        const prefix = dType === 'ZARI_BOBBIN' ? 'ZB-' : (dType === 'TOP_WARP' ? 'TW-' : 'ORD-');
                        
                        setCreatingOrderType(dType);
                        setOrderNumber(`${prefix}${getNextSeqNumber()}`);
                        
                        setViewingDesignId(null);
                        setIsCreatingOrder(true);
                      }}
                      className="w-full py-4 bg-fuchsia-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-fuchsia-100 flex items-center justify-center gap-2 hover:bg-fuchsia-700 transition-all active:scale-95"
                    >
                      <Plus size={20} /> {language === 'ta' ? 'புதிய வார்ப்பு ஆர்டர்' : 'Create Warp Order'}
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => {
                          setEditingDesignId(design.id);
                          setOrderDesignName(design.name);
                          setOrderWeftYarnType(design.weftYarnType || '');
                          setOrderSections(design.sections);
                          setOrderTotalSarees(design.totalSareesExpected.toString());
                          setOrderWarpLength(design.warpLengthMeters?.toString() || '');
                          setOrderWarpWeight(design.totalYarnWeight.toString());
                          setZariBobbins(design.zariBobbins?.toString() || '');
                          setZariEndsPerBobbin(design.zariEndsPerBobbin?.toString() || '');
                          setZariMeters(design.zariMeters?.toString() || '');
                          setZariWeight(design.zariTotalYarnWeight?.toString() || '');
                          setZariYarnType(design.zariYarnType || '');
                          setZariColor(design.zariColor || '');
                          setTopWarpYarnType(design.topWarpYarnType || '');
                          setTopWarpLengthMeters(design.topWarpLengthMeters?.toString() || '');
                          setTopWarpTotalYarnWeight(design.topWarpTotalYarnWeight?.toString() || '');
                          setTopWarpSections(design.topWarpSections || [{ name: 'உடல்', ends: 0, color: '' }]);
                          
                          setViewingDesignId(null);
                          setIsCreatingDesign(true);
                        }}
                        className="py-4 bg-zinc-800 text-white rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 hover:bg-zinc-900 transition-all active:scale-95"
                      >
                        <Edit2 size={18} /> {language === 'ta' ? 'திருத்து' : 'Edit'}
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(language === 'ta' ? 'நிச்சயமாக இந்த டிசைனை நீக்க வேண்டுமா?' : 'Are you sure you want to delete this design?')) {
                            saveDesigns(warpDesigns.filter(d => d.id !== design.id));
                            setViewingDesignId(null);
                          }
                        }}
                        className="py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-sm border border-rose-100 hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2 px-2"
                      >
                        <Trash2 size={18} /> {language === 'ta' ? 'நீக்குக' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {isCreatingDesign && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-zinc-800 mb-6 text-xl tamil-font">
              {editingDesignId ? (language === 'ta' ? 'டிசைன் திருத்து' : 'Edit Design') : (language === 'ta' ? 'புதிய டிசைன்' : 'New Design')}
            </h3>
            
            <div className="space-y-4 mb-8">
              <input 
                type="text" 
                placeholder={language === 'ta' ? 'டிசைன் பெயர் / எண்' : 'Design Name / No'}
                value={orderDesignName}
                onChange={e => setOrderDesignName(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
              />

              <div className="flex gap-2 mb-4 bg-zinc-50 p-1 rounded-2xl border border-zinc-100">
                <button 
                  onClick={() => setCreatingOrderType('MAIN_WARP')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${creatingOrderType === 'MAIN_WARP' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  {language === 'ta' ? 'முக்கிய வார்ப்பு' : 'Main Warp'}
                </button>
                <button 
                  onClick={() => setCreatingOrderType('TOP_WARP')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${creatingOrderType === 'TOP_WARP' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  {language === 'ta' ? 'மேல் வார்ப்பு' : 'Top Warp'}
                </button>
                <button 
                  onClick={() => setCreatingOrderType('ZARI_BOBBIN')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${creatingOrderType === 'ZARI_BOBBIN' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-100' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  {language === 'ta' ? 'பாபின்' : 'Bobbin'}
                </button>
              </div>

              {creatingOrderType === 'MAIN_WARP' && (
                <>
                  <div className="mb-4">
                    <select 
                      value={orderWeftYarnType}
                      onChange={e => setOrderWeftYarnType(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    >
                      <option value="">{language === 'ta' ? 'ஊடை நூல்' : 'Weft Yarn'}</option>
                      {YARN_TYPES.map((type, idx) => (
                        <option key={`weft-${idx}`} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4">
                    <p className="text-xs font-bold text-gray-500 mb-3">{language === 'ta' ? 'வார்ப்பு அமைப்பு' : 'Warp Structure'}</p>
                    <div className="space-y-2">
                      {orderSections.map((section, index) => (
                        <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-100">
                          <select
                            value={section.name.split(' - ')[0] || ''}
                            onChange={e => {
                              const part = section.name.split(' - ')[1] || '';
                              handleOrderSectionChange(index, 'name', `${e.target.value}${part ? ' - ' + part : ''}`);
                            }}
                            className="w-24 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          >
                            <option value="">{language === 'ta' ? 'டீனியர்' : 'Denier'}</option>
                            {denierFormulas.map(f => (
                              <option key={f.id} value={f.denier}>{f.denier}</option>
                            ))}
                          </select>
                          <select
                            value={section.name.split(' - ')[1] || ''}
                            onChange={e => {
                              const denier = section.name.split(' - ')[0] || '';
                              handleOrderSectionChange(index, 'name', `${denier ? denier + ' - ' : ''}${e.target.value}`);
                            }}
                            className="w-24 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          >
                            <option value="">{language === 'ta' ? 'பகுதி' : 'Part'}</option>
                            <option value={language === 'ta' ? 'ரைட் பார்டர்' : 'Right Border'}>{language === 'ta' ? 'ரைட் பார்டர்' : 'Right Border'}</option>
                            <option value={language === 'ta' ? 'லெஃப்ட் பார்டர்' : 'Left Border'}>{language === 'ta' ? 'லெஃப்ட் பார்டர்' : 'Left Border'}</option>
                            <option value={language === 'ta' ? 'உடல்' : 'Body'}>{language === 'ta' ? 'உடல்' : 'Body'}</option>
                            <option value={language === 'ta' ? 'பிளைன்' : 'Plain'}>{language === 'ta' ? 'பிளைன்' : 'Plain'}</option>
                          </select>
                          <input 
                            type="number" 
                            placeholder={language === 'ta' ? 'இழை' : 'Ends'}
                            value={section.ends || ''}
                            onChange={e => handleOrderSectionChange(index, 'ends', parseInt(e.target.value) || 0)}
                            className="w-16 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          />
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder={language === 'ta' ? 'எடை(kg)' : 'Wt(kg)'}
                            value={section.weightKg || ''}
                            onChange={e => handleOrderSectionChange(index, 'weightKg', parseFloat(e.target.value) || 0)}
                            className="w-16 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          />
                          <select 
                            value={section.color || ''}
                            onChange={e => handleOrderSectionChange(index, 'color', e.target.value)}
                            className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                          >
                            <option value="">{language === 'ta' ? 'கலர்' : 'Color'}</option>
                            {YARN_COLORS.map((color, idx) => (
                              <option key={`color-${idx}`} value={color}>{color}</option>
                            ))}
                          </select>
                          {orderSections.length > 1 && (
                            <button onClick={() => removeOrderSection(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button 
                        onClick={addOrderSection}
                        className="w-full py-2 mt-2 border border-dashed border-zinc-300 text-zinc-600 rounded-lg text-xs font-bold hover:bg-zinc-50 transition"
                      >
                        + {language === 'ta' ? 'மேலும் சேர்க்க' : 'Add More'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'மொத்த சேலை' : 'Total Sarees'}
                      value={orderTotalSarees}
                      onChange={e => setOrderTotalSarees(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                    <input 
                      type="number" 
                      placeholder={language === 'ta' ? 'வார்ப்பு (மீட்டர்)' : 'Warp Length (m)'}
                      value={orderWarpLength}
                      onChange={e => {
                        const newLength = e.target.value;
                        setOrderWarpLength(newLength);
                        const meters = parseFloat(newLength) || 0;
                        if (meters > 0) {
                          const updatedSections = orderSections.map(sec => {
                            const denierMatch = sec.name.split(' - ')[0];
                            const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === denierMatch?.trim().toLowerCase());
                            const multiplier = formula ? formula.multiplier : 0;
                            if (sec.ends > 0 && multiplier > 0) {
                              return { ...sec, weightKg: parseFloat((sec.ends * multiplier * meters).toFixed(3)) };
                            }
                            return sec;
                          });
                          setOrderSections(updatedSections);
                        }
                      }}
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                    />
                  </div>
                  
                  <input 
                    type="number" 
                    placeholder={language === 'ta' ? 'மொத்த நூல் எடை (kg)' : 'Total Yarn Weight (kg)'}
                    value={orderWarpWeight}
                    onChange={e => setOrderWarpWeight(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold mt-3"
                  />
                </>
              )}
              {creatingOrderType === 'ZARI_BOBBIN' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <select 
                        value={zariYarnType || ''}
                        onChange={e => setZariYarnType(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                        >
                        <option value="">{language === 'ta' ? 'ஜரிகை டீனியர்' : 'Zari Denier'}</option>
                        {denierFormulas.map(f => (
                            <option key={`zari-${f.id}`} value={f.denier}>{f.denier}</option>
                        ))}
                        </select>
                        <select 
                        value={zariColor || ''}
                        onChange={e => setZariColor(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                        >
                        <option value="">{language === 'ta' ? 'நிறம்' : 'Color'}</option>
                        {YARN_COLORS.map(c => (
                            <option key={`zari-color-${c}`} value={c}>{c}</option>
                        ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder={language === 'ta' ? 'பாபின்கள்' : 'Bobbins'} value={zariBobbins} onChange={e => setZariBobbins(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold" />
                        <input type="number" placeholder={language === 'ta' ? 'இழை/பாபின்' : 'Ends/Bobbin'} value={zariEndsPerBobbin} onChange={e => setZariEndsPerBobbin(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder={language === 'ta' ? 'மீட்டர்' : 'Meters'} value={zariMeters} onChange={e => setZariMeters(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold" />
                        <input type="number" placeholder={language === 'ta' ? 'எடை (kg)' : 'Weight (kg)'} value={zariWeight} onChange={e => setZariWeight(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold" />
                    </div>
                  </div>
              )}
              {creatingOrderType === 'TOP_WARP' && (
                  <div className="space-y-4">
                      <select 
                        value={topWarpYarnType || ''}
                        onChange={e => {
                          const newType = e.target.value;
                          setTopWarpYarnType(newType);
                          
                          const meters = parseFloat(topWarpLengthMeters) || 0;
                          if (newType && meters > 0) {
                            const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === newType.trim().toLowerCase());
                            const multiplier = formula ? formula.multiplier : 0;
                            if (multiplier > 0) {
                              const updatedSections = topWarpSections.map(sec => {
                                if (sec.ends > 0) {
                                  return { ...sec, weightKg: parseFloat((sec.ends * multiplier * meters).toFixed(3)) };
                                }
                                return sec;
                              });
                              setTopWarpSections(updatedSections);
                            }
                          }
                        }}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold"
                      >
                        <option value="">{language === 'ta' ? 'மேல் வார்ப்பு நூல்' : 'Top Warp Yarn'}</option>
                        {YARN_TYPES.map((type, idx) => (
                           <option key={`top-warp-yarn-${idx}`} value={type}>{type}</option>
                        ))}
                      </select>
                      
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        <p className="text-xs font-bold text-gray-500 mb-3">{language === 'ta' ? 'பகுதிகள்' : 'Sections'}</p>
                        <div className="space-y-2">
                          {topWarpSections.map((section, index) => (
                            <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-xl border border-gray-100">
                              <input 
                                type="text" 
                                placeholder={language === 'ta' ? 'பகுதி பெயர்' : 'Section Name'}
                                value={section.name || ''}
                                onChange={e => {
                                  const newSections = [...topWarpSections];
                                  newSections[index].name = e.target.value;
                                  setTopWarpSections(newSections);
                                }}
                                className="w-24 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                              />
                              <input 
                                type="number" 
                                placeholder={language === 'ta' ? 'இழை' : 'Ends'}
                                value={section.ends || ''}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0;
                                  const newSections = [...topWarpSections];
                                  newSections[index].ends = val;
                                  
                                  const meters = parseFloat(topWarpLengthMeters) || 0;
                                  if (val > 0 && meters > 0 && topWarpYarnType) {
                                    const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === topWarpYarnType.trim().toLowerCase());
                                    const multiplier = formula ? formula.multiplier : 0;
                                    if (multiplier > 0) {
                                      newSections[index].weightKg = parseFloat((val * multiplier * meters).toFixed(3));
                                    }
                                  }
                                  setTopWarpSections(newSections);
                                }}
                                className="w-16 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                              />
                              <input 
                                type="number" 
                                step="0.01"
                                placeholder={language === 'ta' ? 'எடை(kg)' : 'Wt(kg)'}
                                value={section.weightKg || ''}
                                onChange={e => {
                                  const newSections = [...topWarpSections];
                                  newSections[index].weightKg = parseFloat(e.target.value) || 0;
                                  setTopWarpSections(newSections);
                                }}
                                className="w-16 flex-none p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                              />
                               <select 
                                value={section.color || ''}
                                onChange={e => {
                                  const newSections = [...topWarpSections];
                                  newSections[index].color = e.target.value;
                                  setTopWarpSections(newSections);
                                }}
                                className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-zinc-400 font-bold"
                              >
                                <option value="">{language === 'ta' ? 'கலர்' : 'Color'}</option>
                                {YARN_COLORS.map((color, idx) => (
                                  <option key={`top-color-${idx}`} value={color}>{color}</option>
                                ))}
                              </select>
                              {topWarpSections.length > 1 && (
                                <button onClick={() => setTopWarpSections(topWarpSections.filter((_, i) => i !== index))} className="p-1.5 text-red-500">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button onClick={() => setTopWarpSections([...topWarpSections, { name: language === 'ta' ? `பகுதி ${topWarpSections.length + 1}` : `Section ${topWarpSections.length + 1}`, ends: 0, color: '' }])} className="w-full py-2 border border-dashed border-zinc-300 text-zinc-500 text-xs font-bold rounded-lg hover:bg-zinc-50">+ {language === 'ta' ? 'மேலும் சேர்க்க' : 'Add More'}</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder={language === 'ta' ? 'மீட்டர்' : 'Meters'} value={topWarpLengthMeters} onChange={e => {
                            const newLength = e.target.value;
                            setTopWarpLengthMeters(newLength);
                            const meters = parseFloat(newLength) || 0;
                            if (meters > 0 && topWarpYarnType) {
                              const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === topWarpYarnType.trim().toLowerCase());
                              const multiplier = formula ? formula.multiplier : 0;
                              if (multiplier > 0) {
                                const updatedSections = topWarpSections.map(sec => {
                                  if (sec.ends > 0) {
                                    return { ...sec, weightKg: parseFloat((sec.ends * multiplier * meters).toFixed(3)) };
                                  }
                                  return sec;
                                });
                                setTopWarpSections(updatedSections);
                              }
                            }
                        }} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold" />
                        <input type="number" placeholder={language === 'ta' ? 'மொத்த எடை (kg)' : 'Total Weight (kg)'} value={topWarpTotalYarnWeight} onChange={e => setTopWarpTotalYarnWeight(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-zinc-400 font-bold" />
                      </div>
                  </div>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { 
                  setIsCreatingDesign(false); 
                  resetDesignFields();
                }} 
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm"
              >
                {language === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button 
                onClick={handleCreateDesign} 
                className="flex-1 py-4 bg-fuchsia-600 text-white rounded-2xl font-black text-sm shadow-xl primary-btn"
              >
                {language === 'ta' ? (editingDesignId ? 'சேமி' : 'உருவாக்கு') : (editingDesignId ? 'Save' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {transactionDetailsModal}
      </div>
    );
  }

  // Render Warpers List View
  return (
    <div className={`p-4 pb-24 md:pb-4 md:max-w-none mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h2 className="text-xl font-black tamil-font text-gray-800">
            {language === 'ta' ? 'வார்ப்பர் கணக்குகள்' : 'Warper Accounts'}
          </h2>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-fuchsia-600 text-white px-5 py-2.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <Plus size={16} strokeWidth={3} /> {language === 'ta' ? 'புதிய வார்ப்பரை சேர்+' : 'Add New Warper+'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-3xl shadow-lg border border-zinc-100 mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-black text-gray-800 mb-4 tamil-font text-lg">{language === 'ta' ? 'புதிய வார்ப்பர்' : 'New Warper'}</h3>
          <input 
            type="text" 
            placeholder={language === 'ta' ? 'பெயர்' : 'Name'}
            value={newName}
            onChange={e => setNewName(e.target.value)}
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
            <button onClick={handleAdd} className="flex-1 bg-fuchsia-600 text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all active:scale-[0.98]">
              {language === 'ta' ? 'சேமி' : 'Save'}
            </button>
            <button onClick={() => setIsAdding(false)} className="flex-1 bg-zinc-100 text-zinc-600 py-4 rounded-2xl font-black hover:bg-zinc-200 transition-all">
              {language === 'ta' ? 'ரத்து' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {warpers.length === 0 && !isAdding ? (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-200 shadow-sm">
          <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon size={32} className="text-zinc-300" />
          </div>
          <p className="text-gray-500 font-bold tamil-font text-lg">
            {language === 'ta' ? 'வார்ப்பர்கள் யாரும் இல்லை' : 'No warpers added yet'}
          </p>
          <p className="text-gray-400 text-sm mt-2 max-w-[200px] mx-auto">
            {language === 'ta' ? 'மேலே உள்ள பட்டனை தட்டி புதிய வார்ப்பரை சேர்க்கவும்' : 'Tap the button above to add a new warper'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {warpers.map((warper, idx) => (
            <WarperItem 
                key={warper.id}
                warper={warper}
                language={language}
                onClick={() => {
                    setSelectedWarper(warper);
                    setViewType('overview');
                }}
                index={idx}
            />
          ))}
        </div>
      )}
      {transactionDetailsModal}

    </div>
  );
};

export default Warpers;
