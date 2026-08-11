import React, { useState, useEffect, useRef } from 'react';
import { User, Loom, LoomTransaction, WarpType, WarpSection, Warper, WarpOrder, DenierFormula } from '../types';
import { Plus, ArrowLeft, Calendar, ChevronDown, ChevronUp, X, Send, CheckCircle, Share2, ArrowRightCircle, Trash2, Edit2 } from 'lucide-react';
import { YARN_COLORS, YARN_TYPES } from '../constants';
import { shareText } from '../lib/utils';
import { useLongPress } from '../lib/hooks';
import { useConfirm } from '../context/ConfirmContext';
import html2pdf from 'html2pdf.js';

// --- Transaction Row Component ---
const SareeTransactionRow: React.FC<{
  txn: LoomTransaction;
  loom: Loom;
  language: 'ta' | 'en';
  columnWidths: Record<string, number>;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ txn, loom, language, columnWidths, onEdit, onDelete }) => {
  const getW = (id: string, def = 100) => ({ width: columnWidths[id] || def, minWidth: columnWidths[id] || def });
  
  if (txn.type === 'YARN_GIVEN') {
    return (
      <tr className="bg-zinc-50/50 hover:bg-zinc-100 transition-colors cursor-pointer select-none active:bg-zinc-200/50">
        <td className="p-3 font-medium text-zinc-600 whitespace-nowrap overflow-hidden text-ellipsis" style={getW('date', 80)}>{new Date(txn.date).toLocaleDateString()}</td>
        <td className="p-3 font-bold text-zinc-900" colSpan={5}>
          <div className="flex flex-col gap-1">
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">{language === 'ta' ? 'ஊடை நூல் கொடுக்கப்பட்டது' : 'Weft Yarn Given'}</span>
            {txn.yarnItems && txn.yarnItems.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {txn.yarnItems.map((item, i) => (
                    <span key={i} className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                    {item.color}: {item.weight}kg
                    </span>
                ))}
              </div>
            )}
          </div>
        </td>
        <td className="p-3 font-bold text-zinc-900 whitespace-nowrap" style={getW('wagePaid', 100)}>+{txn.yarnGivenWeight}kg</td>
        <td className="p-3 text-right" style={getW('balance', 100)}>
          <div className="flex items-center justify-end gap-1">
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" title={language === 'ta' ? 'திருத்து' : 'Edit'}>
                <Edit2 size={14} />
              </button>
            )}
            {onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded" title={language === 'ta' ? 'நீக்கு' : 'Delete'}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  const totalWage = (txn.sareesDelivered || 0) * (loom.sareeWage || 0);
  const paid = txn.wagePaid || 0;
  const balance = totalWage - paid;

  return (
    <tr className="bg-white hover:bg-zinc-50 transition-colors cursor-pointer select-none active:bg-zinc-100/50">
      <td className="p-3 font-medium text-zinc-600 whitespace-nowrap overflow-hidden text-ellipsis" style={getW('date', 80)}>{new Date(txn.date).toLocaleDateString()}</td>
      <td className="p-3 font-bold text-zinc-900 whitespace-nowrap overflow-hidden text-ellipsis" style={getW('sarees', 80)}>{txn.sareesDelivered}</td>
      <td className="p-3 font-bold text-zinc-900 whitespace-nowrap overflow-hidden text-ellipsis" style={getW('yarn', 80)}>{txn.yarnConsumed}kg</td>
      <td className="p-3 font-bold text-zinc-900 whitespace-nowrap overflow-hidden text-ellipsis" style={getW('zari', 80)}>{txn.zariKattaGiven || '-'}</td>
      <td className="p-3 font-bold text-zinc-900 whitespace-nowrap overflow-hidden text-ellipsis" style={getW('totalWage', 100)}>₹{totalWage}</td>
      <td className="p-3 font-bold text-emerald-600 whitespace-nowrap overflow-hidden text-ellipsis" style={getW('wagePaid', 100)}>₹{paid}</td>
      <td className={`p-3 font-bold whitespace-nowrap overflow-hidden text-ellipsis ${balance > 0 ? 'text-rose-500' : 'text-zinc-900'}`} style={getW('balance', 100)}>₹{balance}</td>
      <td className="p-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" title={language === 'ta' ? 'திருத்து' : 'Edit'}>
              <Edit2 size={14} />
            </button>
          )}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded" title={language === 'ta' ? 'நீக்கு' : 'Delete'}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

interface SareeAccountsProps {
  user: User;
  weaverId: string;
  weaverName?: string;
  language: 'ta' | 'en';
  onAddTransaction?: (txn: any) => void;
  onNavigateToStock?: () => void;
}

export const SareeAccounts: React.FC<SareeAccountsProps> = ({ 
  user, weaverId, weaverName, language, onAddTransaction, onNavigateToStock
}) => {
  const confirm = useConfirm();
  const [looms, setLooms] = useState<Loom[]>([]);
  const [transactions, setTransactions] = useState<LoomTransaction[]>([]);
  
  const [isAddingLoom, setIsAddingLoom] = useState(false);
  const [loomNumber, setLoomNumber] = useState('');
  const [designName, setDesignName] = useState('');
  
  const [warpType, setWarpType] = useState<WarpType>('plain');
  const [warpYarnType, setWarpYarnType] = useState('');
  const [weftYarnType, setWeftYarnType] = useState('');
  const [warpSections, setWarpSections] = useState<WarpSection[]>([
    { name: language === 'ta' ? 'உடல்' : 'Body', ends: 0, color: '' }
  ]);
  
  const [totalSareesExpected, setTotalSareesExpected] = useState('');
  const [warpLengthMeters, setWarpLengthMeters] = useState('');
  const [totalYarnWeight, setTotalYarnWeight] = useState('');
  const [sareeWage, setSareeWage] = useState('');
  
  const [topWarpYarnType, setTopWarpYarnType] = useState('');
  const [topWarpLengthMeters, setTopWarpLengthMeters] = useState('');
  const [topWarpTotalYarnWeight, setTopWarpTotalYarnWeight] = useState('');
  const [topWarpSections, setTopWarpSections] = useState<WarpSection[]>([]);

  const [zariBobbins, setZariBobbins] = useState('');
  const [zariEndsPerBobbin, setZariEndsPerBobbin] = useState('');
  const [zariMeters, setZariMeters] = useState('');
  const [zariTotalYarnWeight, setZariTotalYarnWeight] = useState('');
  const [zariYarnType, setZariYarnType] = useState('');

  const [expandedLoomId, setExpandedLoomId] = useState<string | null>(null);
  const [activeLoomTabs, setActiveLoomTabs] = useState<Record<string, 'bottom' | 'top' | 'zari'>>({});
  const [completingWarpId, setCompletingWarpId] = useState<string | null>(null);
  const [expandedCompletedOrderId, setExpandedCompletedOrderId] = useState<string | null>(null);
  const [editingWarpLoomId, setEditingWarpLoomId] = useState<string | null>(null);
  const [showStockPrompt, setShowStockPrompt] = useState(false);

  const [warpers, setWarpers] = useState<Warper[]>([]);
  const [warpOrders, setWarpOrders] = useState<WarpOrder[]>([]);
  const [isCreatingWarpOrder, setIsCreatingWarpOrder] = useState<string | null>(null); // loomId
  const [selectedWarperId, setSelectedWarperId] = useState('');

  const [isAddingTxn, setIsAddingTxn] = useState<string | null>(null); // loomId
  const [isAddingYarnLoomId, setIsAddingYarnLoomId] = useState<string | null>(null); // loomId
  const [yarnGivenItems, setYarnGivenItems] = useState<{ color: string; weight: string }[]>([{ color: '', weight: '' }]);
  const [yarnGivenDate, setYarnGivenDate] = useState(new Date().toISOString().split('T')[0]);
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split('T')[0]);
  const [sareesDelivered, setSareesDelivered] = useState('');
  const [yarnConsumed, setYarnConsumed] = useState('');
  const [wagePaid, setWagePaid] = useState('');
  const [zariKattaGiven, setZariKattaGiven] = useState('');
  const [denierFormulas, setDenierFormulas] = useState<DenierFormula[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingCol, setResizingCol] = useState<{ id: string, startX: number, startWidth: number } | null>(null);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [baseColumnWidth, setBaseColumnWidth] = useState(100);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartWidth = useRef<number>(100);
  const [selectedColForPinch, setSelectedColForPinch] = useState<string | null>(null);

  useEffect(() => {
    const totalEnds = warpSections.reduce((sum, section) => sum + (section.ends || 0), 0);
    const meters = parseFloat(warpLengthMeters) || 0;
    
    if (warpYarnType) {
      const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === warpYarnType.trim().toLowerCase());
      const multiplier = formula ? formula.multiplier : 0;
      
      if (totalEnds > 0 && meters > 0 && multiplier > 0) {
        const weight = totalEnds * multiplier * meters;
        setTotalYarnWeight(parseFloat(weight.toFixed(3)).toString());
      }
    }
  }, [warpSections, warpLengthMeters, warpYarnType, denierFormulas]);

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
        setZariTotalYarnWeight(weight.toFixed(3));
      }
    }
  }, [zariBobbins, zariEndsPerBobbin, zariMeters, zariYarnType, denierFormulas]);

  useEffect(() => {
    const totalEnds = topWarpSections.reduce((sum, section) => sum + (section.ends || 0), 0);
    const meters = parseFloat(topWarpLengthMeters) || 0;
    
    if (topWarpYarnType) {
      const formula = denierFormulas.find(f => f.denier?.trim().toLowerCase() === topWarpYarnType.trim().toLowerCase());
      const multiplier = formula ? formula.multiplier : 0;
      
      if (totalEnds > 0 && meters > 0 && multiplier > 0) {
        const weight = totalEnds * multiplier * meters;
        setTopWarpTotalYarnWeight(parseFloat(weight.toFixed(3)).toString());
      }
    }
  }, [topWarpSections, topWarpLengthMeters, topWarpYarnType, denierFormulas]);

  useEffect(() => {
    const savedLooms = localStorage.getItem(`viyabaari_looms_${user.uid || 'guest'}`);
    if (savedLooms) setLooms(JSON.parse(savedLooms));

    const savedTxns = localStorage.getItem(`viyabaari_loom_txns_${user.uid || 'guest'}`);
    if (savedTxns) setTransactions(JSON.parse(savedTxns));

    const savedWarpers = localStorage.getItem(`viyabaari_warpers_${user.uid || 'guest'}`);
    if (savedWarpers) setWarpers(JSON.parse(savedWarpers));

    const savedWarpOrders = localStorage.getItem(`viyabaari_warp_orders_${user.uid || 'guest'}`);
    if (savedWarpOrders) setWarpOrders(JSON.parse(savedWarpOrders));

    const savedFormulas = localStorage.getItem(`viyabaari_denier_formulas_${user.uid || 'guest'}`);
    if (savedFormulas) setDenierFormulas(JSON.parse(savedFormulas));

    const savedColumnWidths = localStorage.getItem(`viyabaari_saree_column_widths_${user.uid || 'guest'}`);
    if (savedColumnWidths) setColumnWidths(JSON.parse(savedColumnWidths));

    const savedBaseWidth = localStorage.getItem(`viyabaari_saree_base_column_width_${user.uid || 'guest'}`);
    if (savedBaseWidth) setBaseColumnWidth(parseFloat(savedBaseWidth));
  }, [user.uid]);

  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) {
      localStorage.setItem(`viyabaari_saree_column_widths_${user.uid || 'guest'}`, JSON.stringify(columnWidths));
    }
  }, [columnWidths, user.uid]);

  useEffect(() => {
    localStorage.setItem(`viyabaari_saree_base_column_width_${user.uid || 'guest'}`, baseColumnWidth.toString());
  }, [baseColumnWidth, user.uid]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isEditingColumns || e.touches.length !== 2) return;
      e.preventDefault();
      
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      if (pinchStartDist.current === null) {
        pinchStartDist.current = dist;
        if (selectedColForPinch) {
          pinchStartWidth.current = columnWidths[selectedColForPinch] || (['date', 'sarees', 'yarn', 'zari'].includes(selectedColForPinch) ? 80 : 100);
        } else {
          pinchStartWidth.current = baseColumnWidth;
        }
        return;
      }

      const scale = dist / pinchStartDist.current;
      const newWidth = Math.max(20, Math.min(500, pinchStartWidth.current * scale));
      
      if (selectedColForPinch) {
        setColumnWidths(prev => ({ ...prev, [selectedColForPinch]: newWidth }));
      } else {
        setBaseColumnWidth(newWidth);
        setColumnWidths(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(key => {
            next[key] = Math.max(20, next[key] * (newWidth / baseColumnWidth));
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
  }, [isEditingColumns, baseColumnWidth, selectedColForPinch, columnWidths]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!resizingCol) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - resizingCol.startX;
      const newWidth = Math.max(20, resizingCol.startWidth + deltaX);
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
    const currentWidth = columnWidths[id] || (['date', 'sarees', 'yarn', 'zari'].includes(id) ? 80 : 100);
    setResizingCol({ id, startX: clientX, startWidth: currentWidth });
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

  const saveLooms = (newLooms: Loom[]) => {
    setLooms(newLooms);
    localStorage.setItem(`viyabaari_looms_${user.uid || 'guest'}`, JSON.stringify(newLooms));
  };

  const saveTransactions = (newTxns: LoomTransaction[]) => {
    setTransactions(newTxns);
    localStorage.setItem(`viyabaari_loom_txns_${user.uid || 'guest'}`, JSON.stringify(newTxns));
  };

  const saveWarpOrders = (newOrders: WarpOrder[]) => {
    setWarpOrders(newOrders);
    localStorage.setItem(`viyabaari_warp_orders_${user.uid || 'guest'}`, JSON.stringify(newOrders));
  };

  const handleEditLoom = (loom: Loom) => {
    const newLoomNum = prompt(language === 'ta' ? 'புதிய தறி எண்:' : 'New Loom Number:', loom.loomNumber);
    if (newLoomNum === null) return;
    const newDesign = prompt(language === 'ta' ? 'புதிய டிசைன் பெயர்:' : 'New Design Name:', loom.designName || '');
    const newSareeWage = prompt(language === 'ta' ? 'சேலை கூலி (₹):' : 'Saree Wage (₹):', (loom.sareeWage || 0).toString());
    
    saveLooms(looms.map(l => l.id === loom.id ? { 
      ...l, 
      loomNumber: newLoomNum.trim() || l.loomNumber, 
      designName: newDesign !== null ? newDesign.trim() : l.designName,
      sareeWage: newSareeWage ? parseFloat(newSareeWage) || 0 : l.sareeWage
    } : l));
  };

  const handleDeleteLoom = async (loomId: string) => {
    const isConfirmed = await confirm.confirmDelete(
      language === 'ta' ? 'நிச்சயமாக இந்த தறியை நீக்க வேண்டுமா? இதனுடன் தொடர்புடைய அனைத்து பதிவுகளும் நீக்கப்படும்!' : 'Are you sure you want to delete this loom? All associated transactions will be deleted!'
    );
    if (isConfirmed) {
      saveLooms(looms.filter(l => l.id !== loomId));
      saveTransactions(transactions.filter(t => t.loomId !== loomId));
      confirm.showSuccess(language === 'ta' ? 'தறி வெற்றிகரமாக நீக்கப்பட்டது!' : 'Loom deleted successfully!');
    }
  };

  const handleDeleteTransaction = async (txnId: string) => {
    const isConfirmed = await confirm.confirmDelete(
      language === 'ta' ? 'நிச்சயமாக இந்த பதிவை நீக்க வேண்டுமா?' : 'Are you sure you want to delete this transaction?'
    );
    if (isConfirmed) {
      saveTransactions(transactions.filter(t => t.id !== txnId));
      confirm.showSuccess(language === 'ta' ? 'பதிவு வெற்றிகரமாக நீக்கப்பட்டது!' : 'Transaction deleted successfully!');
    }
  };

  const handleEditTransaction = (txn: LoomTransaction) => {
    if (txn.type === 'YARN_GIVEN') {
      const newWeight = prompt(language === 'ta' ? 'புதிய எடை (kg):' : 'New Weight (kg):', (txn.yarnGivenWeight || 0).toString());
      if (newWeight === null) return;
      saveTransactions(transactions.map(t => t.id === txn.id ? { ...t, yarnGivenWeight: parseFloat(newWeight) || 0 } : t));
    } else {
      const newSarees = prompt(language === 'ta' ? 'கொடுத்த சேலைகள்:' : 'Sarees Delivered:', (txn.sareesDelivered || 0).toString());
      if (newSarees === null) return;
      const newYarn = prompt(language === 'ta' ? 'செலவான நூல் (kg):' : 'Yarn Consumed (kg):', (txn.yarnConsumed || 0).toString());
      const newWagePaid = prompt(language === 'ta' ? 'கொடுத்த கூலி (₹):' : 'Wage Paid (₹):', (txn.wagePaid || 0).toString());
      const newZari = prompt(language === 'ta' ? 'ஜரிகை கட்டா:' : 'Zari Katta Given:', (txn.zariKattaGiven || '').toString());

      saveTransactions(transactions.map(t => t.id === txn.id ? {
        ...t,
        sareesDelivered: parseInt(newSarees) || 0,
        yarnConsumed: parseFloat(newYarn || '0') || 0,
        wagePaid: parseFloat(newWagePaid || '0') || 0,
        zariKattaGiven: newZari !== null ? parseInt(newZari) || 0 : t.zariKattaGiven
      } : t));
    }
  };

  const handleCreateWarpOrder = async (loom: Loom) => {
    if (!loom.totalSareesExpected || !loom.warpLengthMeters || !loom.totalYarnWeight || !loom.sareeWage) {
      confirm.showError(language === 'ta' ? 'தயவுசெய்து முதலில் வார்ப்பு விவரங்களை நிரப்பவும்' : 'Please fill warp details first');
      return;
    }

    if (!selectedWarperId) {
      confirm.showError(language === 'ta' ? 'தயவுசெய்து வார்ப்புகாரரை தேர்ந்தெடுக்கவும்' : 'Please select a warper');
      return;
    }
    
    // Check for existing pending order
    const existingPendingOrder = warpOrders.find(o => o.loomId === loom.id && o.status !== 'COMPLETED');
    if (existingPendingOrder) {
      confirm.showError(language === 'ta' ? 'இந்த தறிக்கு ஏற்கனவே வார்ப்பு ஆர்டர் நிலுவையில் உள்ளது!' : 'A warp order is already pending for this loom!');
      return;
    }

    // Check if it's a running loom and if 75% sarees are delivered
    const loomTxns = transactions.filter(t => t.loomId === loom.id);
    const hasStarted = loomTxns.some(t => t.type === 'YARN_GIVEN' || t.type === 'SAREE_RECEIVED' || (t.sareesDelivered && t.sareesDelivered > 0));
    
    if (hasStarted) {
      const sareesReceived = loomTxns.reduce((sum, t) => sum + (t.sareesDelivered || 0), 0);
      const expected = loom.totalSareesExpected || 0;
      const percentage = expected > 0 ? (sareesReceived / expected) * 100 : 0;
      
      if (percentage < 75) {
        const confirmMsg = language === 'ta' 
          ? `இன்னும் 75% சேலைகள் வரவில்லை (${sareesReceived}/${expected} மட்டுமே வந்துள்ளது). பரவாயில்லையா, புதிய வார்ப்பு ஆர்டர் கொடுக்க வேண்டுமா?` 
          : `Less than 75% sarees received (${sareesReceived}/${expected}). Are you sure you want to create a new warp order?`;
        
        const ok = await confirm.confirmSave(confirmMsg, language === 'ta' ? 'உறுதிப்படுத்தல்' : 'Confirmation');
        if (!ok) return;
      }
    }

    const okOrder = await confirm.confirmSave(
      language === 'ta' ? 'புதிய வார்ப்பு ஆர்டரை உருவாக்க விரும்புகிறீர்களா?' : 'Do you want to create a new warp order?',
      language === 'ta' ? 'வார்ப்பு ஆர்டர் உருவாக்கம்' : 'Create Warp Order'
    );
    if (!okOrder) return;
    
    const newOrder: WarpOrder = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      orderNumber: 'ORD ' + getNextSeqNumber(),
      loomId: loom.id,
      weaverId: weaverId,
      weaverName: weaverName || 'Unknown',
      loomNumber: loom.loomNumber,
      warperId: selectedWarperId,
      designName: loom.designName,
      warpYarnType: loom.warpYarnType || '',
      weftYarnType: loom.weftYarnType || '',
      sections: loom.warpSections || [],
      totalSareesExpected: loom.totalSareesExpected || 0,
      warpLengthMeters: loom.warpLengthMeters,
      totalYarnWeight: loom.totalYarnWeight || 0,
      status: 'PENDING',
      createdAt: Date.now()
    };

    const newOrders = [...warpOrders, newOrder];
    saveWarpOrders(newOrders);
    
    setIsCreatingWarpOrder(null);
    setSelectedWarperId('');
    confirm.showSuccess(language === 'ta' ? 'புதிய வார்ப்பு ஆர்டர் வெற்றிகரமாக உருவாக்கப்பட்டது!' : 'New Warp Order created successfully!');
  };

  const handleWarpTypeChange = (type: WarpType) => {
    setWarpType(type);
    if (type === 'plain') {
      setWarpSections([{ name: language === 'ta' ? 'உடல்' : 'Body', ends: 0, color: '' }]);
    } else if (type === 'border') {
      setWarpSections([
        { name: language === 'ta' ? 'வலது பார்டர்' : 'Right Border', ends: 0, color: '' },
        { name: language === 'ta' ? 'உடல்' : 'Body', ends: 0, color: '' },
        { name: language === 'ta' ? 'இடது பார்டர்' : 'Left Border', ends: 0, color: '' }
      ]);
    } else if (type === 'design') {
      setWarpSections([
        { name: language === 'ta' ? 'பகுதி 1' : 'Section 1', ends: 0, color: '' }
      ]);
    }
  };

  const updateWarpSection = (index: number, field: keyof WarpSection, value: string | number) => {
    const newSections = [...warpSections];
    newSections[index] = { ...newSections[index], [field]: value };
    setWarpSections(newSections);
  };

  const addWarpSection = () => {
    setWarpSections([
      ...warpSections,
      { name: language === 'ta' ? `பகுதி ${warpSections.length + 1}` : `Section ${warpSections.length + 1}`, ends: 0, color: '' }
    ]);
  };

  const removeWarpSection = (index: number) => {
    setWarpSections(warpSections.filter((_, i) => i !== index));
  };

  const updateTopWarpSection = (index: number, field: keyof WarpSection, value: string | number) => {
    const newSections = [...topWarpSections];
    newSections[index] = { ...newSections[index], [field]: value };
    setTopWarpSections(newSections);
  };

  const addTopWarpSection = () => {
    setTopWarpSections([
      ...topWarpSections,
      { name: language === 'ta' ? `பகுதி ${topWarpSections.length + 1}` : `Section ${topWarpSections.length + 1}`, ends: 0, color: '' }
    ]);
  };

  const removeTopWarpSection = (index: number) => {
    setTopWarpSections(topWarpSections.filter((_, i) => i !== index));
  };

  const confirmCompleteWarp = (loom: Loom) => {
    const pendingOrders = warpOrders.filter(o => o.loomId === loom.id && o.status !== 'COMPLETED');
    if (pendingOrders.length === 0) {
      setCompletingWarpId(null);
      return;
    }

    const mainOrder = pendingOrders.find(o => !o.orderType || o.orderType === 'MAIN_WARP') || pendingOrders[0];

    const updatedOrders = warpOrders.map(o => {
      if (o.loomId === loom.id && o.status !== 'COMPLETED') {
        const baseUpdates = {
          ...o,
          status: 'COMPLETED',
          completedAt: Date.now(),
          sareeWage: loom.sareeWage,
          zariBobbins: loom.zariBobbins,
          zariEndsPerBobbin: loom.zariEndsPerBobbin,
          zariMeters: loom.zariMeters,
          zariTotalYarnWeight: loom.zariTotalYarnWeight,
          zariYarnType: loom.zariYarnType,
          topWarpYarnType: loom.topWarpYarnType,
          topWarpLengthMeters: loom.topWarpLengthMeters,
          topWarpTotalYarnWeight: loom.topWarpTotalYarnWeight,
          topWarpSections: loom.topWarpSections
        } as WarpOrder;
        
        if (o.orderType === 'ZARI_BOBBIN' && loom.zariTotalYarnWeight !== undefined) {
          baseUpdates.totalYarnWeight = loom.zariTotalYarnWeight;
        } else if (o.orderType === 'TOP_WARP' && loom.topWarpTotalYarnWeight !== undefined) {
          baseUpdates.totalYarnWeight = loom.topWarpTotalYarnWeight;
        } else if ((!o.orderType || o.orderType === 'MAIN_WARP') && loom.totalYarnWeight !== undefined) {
          baseUpdates.totalYarnWeight = loom.totalYarnWeight;
        }
        
        return baseUpdates;
      }
      return o;
    });
    
    saveWarpOrders(updatedOrders);

    const updatedTxns = transactions.map(t => {
      if (t.loomId === loom.id && !t.warpOrderId) {
        return { ...t, warpOrderId: mainOrder.id };
      }
      return t;
    });
    saveTransactions(updatedTxns);

    const updatedLoom: Loom = {
      ...loom,
      designName: '',
      warpYarnType: undefined,
      weftYarnType: undefined,
      warpType: undefined,
      warpSections: undefined,
      topWarpYarnType: undefined,
      topWarpLengthMeters: undefined,
      topWarpTotalYarnWeight: undefined,
      topWarpSections: undefined,
      totalSareesExpected: undefined,
      warpLengthMeters: undefined,
      totalYarnWeight: undefined,
      sareeWage: undefined,
      zariBobbins: undefined,
      zariEndsPerBobbin: undefined,
      zariMeters: undefined,
      zariTotalYarnWeight: undefined,
      zariYarnType: undefined
    };
    saveLooms(looms.map(l => l.id === loom.id ? updatedLoom : l));
    
    setCompletingWarpId(null);
  };

  const handleAddLoom = () => {
    if (!loomNumber) {
      alert(language === 'ta' ? 'தறி எண்ணை நிரப்பவும்' : 'Please fill loom number');
      return;
    }
    
    // Check if loom number already exists for this weaver
    const duplicateLoom = looms.find(l => l.weaverId === weaverId && l.loomNumber.trim() === loomNumber.trim());
    if (duplicateLoom) {
      alert(language === 'ta' ? 'இந்த தறி எண் ஏற்கனவே உள்ளது' : 'This loom number already exists');
      return;
    }
    
    const loomId = Date.now().toString() + Math.random().toString(36).substring(2, 9);

    const newLoom: Loom = {
      id: loomId,
      weaverId,
      loomNumber,
      designName: '',
      createdAt: Date.now()
    };
    
    saveLooms([...looms, newLoom]);

    setLoomNumber('');
    setDesignName('');
    setIsAddingLoom(false);
    
    alert(language === 'ta' ? 'தறி வெற்றிகரமாக உருவாக்கப்பட்டது!' : 'Loom created successfully!');
  };

  const handleExpandLoom = (loom: Loom) => {
    if (expandedLoomId === loom.id) {
      setExpandedLoomId(null);
    } else {
      setExpandedLoomId(loom.id);
      if (!activeLoomTabs[loom.id]) {
        setActiveLoomTabs(prev => ({ ...prev, [loom.id]: 'bottom' }));
      }
    }
  };

  const downloadPDF = async (loom: Loom, totalSareesDelivered: number, remainingSarees: number, totalYarnGiven: number, totalYarnConsumed: number, remainingYarn: number, balance: number) => {
    const element = document.getElementById(`pdf-loom-statement-${loom.id}`);
    if (!element) return;

    const opt = {
      margin: [10, 10] as [number, number],
      filename: `${loom.loomNumber}_Statement_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.95 },
      html2canvas: { 
        scale: 1.5, 
        useCORS: true, 
        logging: false,
        width: 800,
        windowWidth: 800,
        onclone: (clonedDoc: Document) => {
          const el = clonedDoc.getElementById(`pdf-loom-statement-${loom.id}`);
          if (el) {
            el.style.display = 'block';
            el.style.width = '800px';
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
      const pdfBlob = await html2pdf().from(element).set(opt).output('blob');
      const file = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: language === 'ta' ? 'தறி கணக்கு அறிக்கை' : 'Loom Account Statement',
          text: `${loom.loomNumber} - ${loom.designName}`
        });
      } else {
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = opt.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      html2pdf().from(element).set(opt).save();
    }
  };

  const handleRepeatWarpOrder = (order: WarpOrder) => {
    const loom = looms.find(l => l.id === order.loomId) || { id: order.loomId, loomNumber: order.loomNumber } as Loom;
    
    // Set warp details
    setWarpYarnType(order.warpYarnType || '');
    setWeftYarnType(order.weftYarnType || '');
    setWarpSections(order.sections || [{ name: language === 'ta' ? 'உடல்' : 'Body', ends: 0, color: '' }]);
    setTotalSareesExpected(order.totalSareesExpected?.toString() || '');
    setWarpLengthMeters(order.warpLengthMeters?.toString() || '');
    setTotalYarnWeight(order.totalYarnWeight?.toString() || '');
    setSareeWage(''); // Wage might change
    
    setTopWarpYarnType(order.topWarpYarnType || '');
    setTopWarpLengthMeters(order.topWarpLengthMeters?.toString() || '');
    setTopWarpTotalYarnWeight(order.topWarpTotalYarnWeight?.toString() || '');
    setTopWarpSections(order.topWarpSections || []);

    setZariBobbins(order.zariBobbins?.toString() || '');
    setZariEndsPerBobbin(order.zariEndsPerBobbin?.toString() || '');
    setZariMeters(order.zariMeters?.toString() || '');
    setZariTotalYarnWeight(order.totalYarnWeight?.toString() || '');
    setZariYarnType(order.zariYarnType || '');
    
    setSelectedWarperId(order.warperId);
    setEditingWarpLoomId(loom.id);
  };

  const handleShareStatement = (loom: Loom, totalSareesDelivered: number, remainingSarees: number, totalYarnGiven: number, totalYarnConsumed: number, remainingYarn: number, balance: number) => {
    let text = `*${language === 'ta' ? 'தறி கணக்கு அறிக்கை' : 'Loom Account Statement'}*\n\n`;
    text += `*${language === 'ta' ? 'தறி எண்' : 'Loom No'}:* ${loom.loomNumber}\n`;
    text += `*${language === 'ta' ? 'டிசைன்' : 'Design'}:* ${loom.designName}\n`;
    text += `*${language === 'ta' ? 'தறிகாரர்' : 'Weaver'}:* ${weaverName || '-'}\n\n`;
    
    text += `*${language === 'ta' ? 'சேலைகள்' : 'Sarees'}:*\n`;
    text += `- ${language === 'ta' ? 'கொடுத்தது' : 'Delivered'}: ${totalSareesDelivered}\n`;
    text += `- ${language === 'ta' ? 'மீதம்' : 'Remaining'}: ${remainingSarees}\n\n`;
    
    text += `*${language === 'ta' ? 'நூல் (kg)' : 'Yarn (kg)'}:*\n`;
    text += `- ${language === 'ta' ? 'கொடுத்தது' : 'Given'}: ${totalYarnGiven.toFixed(2)}\n`;
    text += `- ${language === 'ta' ? 'செலவு' : 'Consumed'}: ${totalYarnConsumed.toFixed(2)}\n`;
    text += `- ${language === 'ta' ? 'மீதம்' : 'Remaining'}: ${remainingYarn.toFixed(2)}\n\n`;
    
    text += `*${language === 'ta' ? 'கூலி நிலுவை' : 'Wage Balance'}:* ₹${balance}\n`;
    
    shareText(text);
  };

  const handleShareCompletedOrder = (order: WarpOrder) => {
    let text = `*${language === 'ta' ? 'முடிந்த வார்ப்பு விவரங்கள்' : 'Completed Warp Details'}*\n\n`;
    text += `*ID:* ${order.orderNumber || order.id.slice(-4)}\n`;
    text += `*${language === 'ta' ? 'தறி எண்' : 'Loom No'}:* ${order.loomNumber}\n`;
    text += `*${language === 'ta' ? 'டிசைன்' : 'Design'}:* ${order.designName}\n`;
    text += `*${language === 'ta' ? 'முடிந்த தேதி' : 'Completed At'}:* ${new Date(order.completedAt || order.createdAt).toLocaleDateString()}\n\n`;
    
    if (order.orderType === 'ZARI_BOBBIN') {
      text += `*${language === 'ta' ? 'ஜரிகை டீனியர்' : 'Zari Denier'}:* ${order.zariYarnType || order.warpYarnType || '-'}\n`;
      text += `*${language === 'ta' ? 'பாபின்கள்' : 'Bobbins'}:* ${order.zariBobbins || '-'}\n`;
      text += `*${language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}:* ${order.totalYarnWeight}kg\n`;
    } else if (order.orderType === 'TOP_WARP') {
      text += `*${language === 'ta' ? 'வார்ப்பு நூல்' : 'Warp Yarn'}:* ${order.topWarpYarnType || '-'}\n`;
      text += `*${language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}:* ${order.topWarpTotalYarnWeight}kg\n`;
    } else {
      text += `*${language === 'ta' ? 'வார்ப்பு நூல்' : 'Warp Yarn'}:* ${order.warpYarnType || '-'}\n`;
      text += `*${language === 'ta' ? 'ஊடை நூல்' : 'Weft Yarn'}:* ${order.weftYarnType || '-'}\n`;
      text += `*${language === 'ta' ? 'மொத்த எடை' : 'Total Weight'}:* ${order.totalYarnWeight}kg\n`;
    }
    
    shareText(text);
  };

  const handleAddWarpDetails = (loomId: string) => {
    if (!warpYarnType || !weftYarnType || !totalSareesExpected || !totalYarnWeight || !warpLengthMeters || !sareeWage) {
      alert(language === 'ta' ? 'அனைத்து விவரங்களையும் நிரப்பவும்' : 'Please fill all details');
      return;
    }
    
    if (!selectedWarperId) {
      alert(language === 'ta' ? 'வார்ப்புகாரரை தேர்ந்தெடுக்கவும்' : 'Please select a warper');
      return;
    }

    // Validate sections
    if (warpSections.some(s => !s.color || s.ends <= 0)) {
      alert(language === 'ta' ? 'அனைத்து இழைகளும் மற்றும் கலர்களும் சரியாக உள்ளிடவும்' : 'Please fill all ends and colors correctly');
      return;
    }

    if (topWarpSections.length > 0 && topWarpSections.some(s => !s.color || s.ends <= 0)) {
      alert(language === 'ta' ? 'மேல் வார்ப்பு இழைகளும் மற்றும் கலர்களும் சரியாக உள்ளிடவும்' : 'Please fill all top warp ends and colors correctly');
      return;
    }

    const loom = looms.find(l => l.id === loomId);
    if (!loom) return;

    const parsedSarees = parseInt(totalSareesExpected);
    const parsedLength = parseFloat(warpLengthMeters);
    const parsedWeight = parseFloat(totalYarnWeight);
    const parsedWage = parseFloat(sareeWage);
    const parsedZariBobbins = zariBobbins ? parseInt(zariBobbins) : undefined;
    const parsedZariEnds = zariEndsPerBobbin ? parseInt(zariEndsPerBobbin) : undefined;
    const parsedZariMeters = zariMeters ? parseFloat(zariMeters) : undefined;
    const parsedZariTotalWeight = zariTotalYarnWeight ? parseFloat(zariTotalYarnWeight) : undefined;
    
    const parsedTopLength = topWarpLengthMeters ? parseFloat(topWarpLengthMeters) : undefined;
    const parsedTopWeight = topWarpTotalYarnWeight ? parseFloat(topWarpTotalYarnWeight) : undefined;

    if (isNaN(parsedSarees) || isNaN(parsedLength) || isNaN(parsedWeight) || isNaN(parsedWage) || 
        (zariBobbins && isNaN(parsedZariBobbins as number)) || 
        (zariEndsPerBobbin && isNaN(parsedZariEnds as number)) || 
        (zariMeters && isNaN(parsedZariMeters as number)) ||
        (zariTotalYarnWeight && isNaN(parsedZariTotalWeight as number)) ||
        (topWarpLengthMeters && isNaN(parsedTopLength as number)) ||
        (topWarpTotalYarnWeight && isNaN(parsedTopWeight as number))) {
      alert(language === 'ta' ? 'சரியான எண்களை உள்ளிடவும்' : 'Please enter valid numbers');
      return;
    }

    const updatedLoom: Loom = {
      ...loom,
      warpYarnType,
      weftYarnType,
      warpType,
      warpSections,
      totalSareesExpected: parsedSarees,
      warpLengthMeters: parsedLength,
      totalYarnWeight: parsedWeight,
      sareeWage: parsedWage,
      topWarpYarnType: topWarpYarnType || undefined,
      topWarpLengthMeters: parsedTopLength,
      topWarpTotalYarnWeight: parsedTopWeight,
      topWarpSections: topWarpSections.length > 0 ? topWarpSections : undefined,
      zariBobbins: parsedZariBobbins,
      zariEndsPerBobbin: parsedZariEnds,
      zariMeters: parsedZariMeters,
      zariTotalYarnWeight: parsedZariTotalWeight,
      zariYarnType: zariYarnType || undefined,
    };

    saveLooms(looms.map(l => l.id === loomId ? updatedLoom : l));

    // Create or Update Warp Orders automatically
    const pendingOrders = warpOrders.filter(o => o.loomId === loomId && o.status !== 'COMPLETED');
    
    let newOrders = [...warpOrders];
    
    if (pendingOrders.length > 0) {
      newOrders = newOrders.map(o => {
        if (o.loomId === loomId && o.status !== 'COMPLETED') {
          if (o.orderType === 'ZARI_BOBBIN') {
            return {
              ...o,
              warperId: selectedWarperId,
              zariBobbins: parsedZariBobbins,
              zariEndsPerBobbin: parsedZariEnds,
              zariMeters: parsedZariMeters,
              totalYarnWeight: parsedZariTotalWeight || 0,
              warpYarnType: zariYarnType || '-',
              zariYarnType: zariYarnType || undefined
            };
          } else if (o.orderType === 'TOP_WARP') {
            return {
              ...o,
              warperId: selectedWarperId,
              topWarpYarnType: topWarpYarnType || undefined,
              topWarpLengthMeters: parsedTopLength,
              topWarpTotalYarnWeight: parsedTopWeight,
              totalYarnWeight: parsedTopWeight || 0,
              topWarpSections: topWarpSections.length > 0 ? topWarpSections : undefined
            };
          } else {
            return {
              ...o,
              warperId: selectedWarperId,
              warpYarnType,
              weftYarnType,
              sections: warpSections,
              totalSareesExpected: parsedSarees,
              warpLengthMeters: parsedLength,
              totalYarnWeight: parsedWeight,
            };
          }
        }
        return o;
      });
    } else {
      const newOrder: WarpOrder = {
        id: Date.now().toString() + '_order',
        orderNumber: 'ORD ' + getNextSeqNumber(),
        loomId: loomId,
        weaverId: weaverId,
        weaverName: weaverName || 'Unknown',
        loomNumber: loom.loomNumber,
        warperId: selectedWarperId,
        designName: loom.designName,
        warpYarnType: warpYarnType,
        weftYarnType: weftYarnType,
        sections: warpSections,
        totalSareesExpected: parsedSarees,
        warpLengthMeters: parsedLength,
        totalYarnWeight: parsedWeight,
        status: 'PENDING',
        createdAt: Date.now()
      };
      newOrders.push(newOrder);
    }

    saveWarpOrders(newOrders);

    setEditingWarpLoomId(null);
    setWarpYarnType('');
    setWeftYarnType('');
    handleWarpTypeChange('plain');
    setTotalSareesExpected('');
    setWarpLengthMeters('');
    setTotalYarnWeight('');
    setSareeWage('');
    setZariBobbins('');
    setZariEndsPerBobbin('');
    setZariMeters('');
    setZariTotalYarnWeight('');
    setZariYarnType('');
    setSelectedWarperId('');

    alert(language === 'ta' ? 'வார்ப்பு விபரங்கள் வெற்றிகரமாக சேமிக்கப்பட்டன!' : 'Warp details saved successfully!');
  };

  const handleAddYarn = (loomId: string) => {
    if (!yarnGivenDate || yarnGivenItems.some(item => !item.color || !item.weight)) {
      alert(language === 'ta' ? 'அனைத்து விவரங்களையும் நிரப்பவும்' : 'Please fill all details');
      return;
    }
    
    const items = yarnGivenItems.map(item => ({
      color: item.color,
      weight: parseFloat(item.weight)
    }));

    if (items.some(item => isNaN(item.weight))) {
      alert(language === 'ta' ? 'சரியான எடையை உள்ளிடவும்' : 'Please enter valid weight');
      return;
    }
    
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    
    const currentWarpOrder = warpOrders.find(o => o.loomId === loomId && o.status !== 'COMPLETED' && (!o.orderType || o.orderType === 'MAIN_WARP')) || warpOrders.find(o => o.loomId === loomId && o.status !== 'COMPLETED');
    
    const newTxn: LoomTransaction = {
      id: Date.now().toString(),
      loomId,
      warpOrderId: currentWarpOrder?.id,
      date: yarnGivenDate,
      type: 'YARN_GIVEN',
      yarnGivenWeight: totalWeight,
      yarnItems: items,
      createdAt: Date.now()
    };
    
    saveTransactions([...transactions, newTxn]);
    
    setYarnGivenItems([{ color: '', weight: '' }]);
    setYarnGivenDate(new Date().toISOString().split('T')[0]);
    setIsAddingYarnLoomId(null);
  };

  const handleAddTxn = (loomId: string) => {
    if (!txnDate || !sareesDelivered || !yarnConsumed) return;
    
    const delivered = parseInt(sareesDelivered);
    const consumed = parseFloat(yarnConsumed);
    const wage = parseFloat(wagePaid) || 0;
    const zari = zariKattaGiven ? parseFloat(zariKattaGiven) : undefined;
    
    if (isNaN(delivered) || isNaN(consumed) || (zariKattaGiven && isNaN(zari as number))) {
      alert(language === 'ta' ? 'சரியான எண்களை உள்ளிடவும்' : 'Please enter valid numbers');
      return;
    }
    
    const currentWarpOrder = warpOrders.find(o => o.loomId === loomId && o.status !== 'COMPLETED' && (!o.orderType || o.orderType === 'MAIN_WARP')) || warpOrders.find(o => o.loomId === loomId && o.status !== 'COMPLETED');
    
    const newTxn: LoomTransaction = {
      id: Date.now().toString(),
      loomId,
      warpOrderId: currentWarpOrder?.id,
      date: txnDate,
      sareesDelivered: delivered,
      yarnConsumed: consumed,
      wagePaid: wage,
      zariKattaGiven: zari,
      createdAt: Date.now()
    };
    
    saveTransactions([...transactions, newTxn]);
    
    setTxnDate(new Date().toISOString().split('T')[0]);
    setSareesDelivered('');
    setYarnConsumed('');
    setWagePaid('');
    setZariKattaGiven('');
    setIsAddingTxn(null);

    // Auto-add wage to transactions if paid
    if (wage > 0 && onAddTransaction) {
      const loom = looms.find(l => l.id === loomId);
      onAddTransaction({
        type: 'EXPENSE',
        amount: wage,
        category: 'Weaver Wage',
        partyName: weaverName || 'Weaver',
        description: `Wage for ${delivered} sarees (Loom ${loom?.loomNumber || ''})`,
        date: new Date(txnDate).getTime()
      });
    }

    // Prompt to add to stock
    if (delivered > 0 && onNavigateToStock) {
      setShowStockPrompt(true);
    }
  };

  const weaverLooms = looms.filter(l => l.weaverId === weaverId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-black text-zinc-900 text-lg tamil-font tracking-tight">{language === 'ta' ? 'தறிகள்' : 'Looms'}</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setIsEditingColumns(!isEditingColumns);
              if (isEditingColumns) setSelectedColForPinch(null);
            }}
            className={`px-3 py-2 rounded-full text-[10px] font-bold transition-all border ${isEditingColumns ? 'bg-zinc-900 text-white border-zinc-900 shadow-inner' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
          >
            {isEditingColumns ? (language === 'ta' ? 'அளவு சேமி' : 'Save Sizes') : (language === 'ta' ? 'அளவு மாற்று' : 'Edit Columns')}
          </button>
          <button 
            onClick={() => setIsAddingLoom(true)}
            className="bg-zinc-900 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-zinc-800 transition-colors border border-zinc-800"
          >
            <Plus size={14} /> {language === 'ta' ? 'தறியை சேர்' : 'Add Loom'}
          </button>
        </div>
      </div>

      {showStockPrompt && (
        <div className="fixed inset-0 bg-zinc-900/40 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 border border-zinc-200">
            <h3 className="text-xl font-black text-zinc-900 mb-2 tamil-font tracking-tight">
              {language === 'ta' ? 'ஸ்டாக்கில் சேர்க்க வேண்டுமா?' : 'Add to Stock?'}
            </h3>
            <p className="text-zinc-500 text-sm mb-6 font-medium">
              {language === 'ta' 
                ? 'வரவு வைக்கப்பட்ட சேலைகளை இப்போது ஸ்டாக்கில் சேர்க்க விரும்புகிறீர்களா?' 
                : 'Do you want to add the delivered sarees to your inventory now?'}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowStockPrompt(false)} 
                className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold hover:bg-zinc-50 transition-colors"
              >
                {language === 'ta' ? 'இல்லை' : 'No'}
              </button>
              <button 
                onClick={() => {
                  setShowStockPrompt(false);
                  if (onNavigateToStock) onNavigateToStock();
                }} 
                className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold shadow-md hover:bg-zinc-800 transition-colors"
              >
                {language === 'ta' ? 'ஆம், சேர்க்க' : 'Yes, Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddingLoom && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 mb-4 animate-in fade-in slide-in-from-top-2">
          <h4 className="font-black text-zinc-900 mb-4 tamil-font tracking-tight text-lg">{language === 'ta' ? 'புதிய தறி' : 'New Loom'}</h4>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder={language === 'ta' ? 'தறி எண் (உம்: 1)' : 'Loom Number (e.g. 1)'}
              value={loomNumber}
              onChange={e => setLoomNumber(e.target.value)}
              className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
            />
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsAddingLoom(false)}
                className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
              >
                {language === 'ta' ? 'ரத்து செய்' : 'Cancel'}
              </button>
              <button 
                onClick={handleAddLoom}
                className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-md"
              >
                {language === 'ta' ? 'சேமி' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {weaverLooms.length === 0 && !isAddingLoom && (
        <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-zinc-200">
          <p className="text-zinc-500 font-bold tamil-font">
            {language === 'ta' ? 'தறிகள் எதுவும் இல்லை' : 'No looms added yet'}
          </p>
        </div>
      )}

      {weaverLooms.map(loom => {
        const pendingOrdersForLoom = warpOrders.filter(o => o.loomId === loom.id && o.designName === loom.designName);
        const currentWarpOrder = pendingOrdersForLoom.find(o => !o.orderType || o.orderType === 'MAIN_WARP') || 
                                 pendingOrdersForLoom.sort((a, b) => b.createdAt - a.createdAt)[0];

        const loomTxns = transactions
          .filter(t => t.loomId === loom.id && (!t.warpOrderId || (currentWarpOrder && t.warpOrderId === currentWarpOrder.id)))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const sareeTxns = loomTxns.filter(t => t.type !== 'YARN_GIVEN');
        const yarnGivenTxns = loomTxns.filter(t => t.type === 'YARN_GIVEN');

        const totalSareesDelivered = sareeTxns.reduce((sum, t) => sum + (t.sareesDelivered || 0), 0);
        const totalYarnConsumed = sareeTxns.reduce((sum, t) => sum + (t.yarnConsumed || 0), 0);
        const totalYarnGiven = yarnGivenTxns.reduce((sum, t) => sum + (t.yarnGivenWeight || 0), 0);
        const totalZariKattaGiven = loomTxns.reduce((sum, t) => sum + (t.zariKattaGiven || 0), 0);
        
        const totalWagePaid = sareeTxns.reduce((sum, t) => sum + (t.wagePaid || 0), 0);
        const totalWage = totalSareesDelivered * (loom.sareeWage || 0);
        const balance = totalWage - totalWagePaid;
        
        const remainingSarees = (loom.totalSareesExpected || 0) - totalSareesDelivered;
        const remainingYarn = totalYarnGiven - totalYarnConsumed;
        
        const isExpanded = expandedLoomId === loom.id;

        return (
          <div key={loom.id} className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden hover:border-zinc-300 transition-colors">
            <div 
              className="p-4 cursor-pointer hover:bg-zinc-50 transition-colors"
              onClick={() => setExpandedLoomId(isExpanded ? null : loom.id)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-zinc-100 text-zinc-800 font-black px-3 py-1.5 rounded-xl text-sm border border-zinc-200">
                    {language === 'ta' ? 'தறி' : 'Loom'} {loom.loomNumber}
                  </div>
                  {loom.designName && (
                    <div className="flex flex-col">
                      <h4 className="font-black text-zinc-900 tracking-tight">{loom.designName}</h4>
                      {currentWarpOrder?.orderNumber && (
                        <span className="text-xs text-zinc-500 font-medium">{language === 'ta' ? 'வார்ப்பு எண்:' : 'Warp ID:'} {currentWarpOrder.orderNumber}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEditLoom(loom); }}
                    className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title={language === 'ta' ? 'தறி திருத்து' : 'Edit Loom'}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteLoom(loom.id); }}
                    className="p-1.5 text-zinc-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title={language === 'ta' ? 'தறி நீக்கு' : 'Delete Loom'}
                  >
                    <Trash2 size={16} />
                  </button>
                  {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="p-5 border-t border-zinc-100 bg-zinc-50/50" id={`loom-statement-${loom.id}`}>
                {/* Hidden PDF Statement Section */}
                <div className="hidden">
                  <div id={`pdf-loom-statement-${loom.id}`} style={{ width: '800px' }} className="p-8 bg-white text-black font-sans">
                    <div className="mb-6 border-b-4 border-black pb-4 flex justify-between items-end">
                      <div>
                        <h1 className="text-2xl font-black mb-1 uppercase tracking-tight">
                          {language === 'ta' ? 'தறி கணக்கு அறிக்கை' : 'Loom Account Statement'}
                        </h1>
                        <div className="flex gap-4 text-lg font-black">
                          <span>{language === 'ta' ? 'தறி எண்' : 'Loom No'}: {loom.loomNumber}</span>
                          <span className="text-zinc-500">|</span>
                          <span>{language === 'ta' ? 'டிசைன்' : 'Design'}: {loom.designName}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-zinc-500 uppercase">{language === 'ta' ? 'தேதி' : 'Date'}</p>
                        <p className="text-lg font-black">{new Date().toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                       <div className="space-y-2">
                         <h3 className="text-xs font-black uppercase text-zinc-500 border-b border-zinc-200 pb-1">{language === 'ta' ? 'விபரங்கள்' : 'Details'}</h3>
                         <div className="flex justify-between text-sm font-bold">
                           <span>{language === 'ta' ? 'மொத்த சேலை' : 'Total Sarees'}:</span>
                           <span>{totalSareesDelivered} / {loom.totalSareesExpected}</span>
                         </div>
                         <div className="flex justify-between text-sm font-bold">
                           <span>{language === 'ta' ? 'மீதமுள்ள சேலை' : 'Remaining Sarees'}:</span>
                           <span>{remainingSarees}</span>
                         </div>
                       </div>
                       <div className="space-y-2">
                         <h3 className="text-xs font-black uppercase text-zinc-500 border-b border-zinc-200 pb-1">{language === 'ta' ? 'கூலி விபரம்' : 'Wage Details'}</h3>
                         <div className="flex justify-between text-sm font-bold">
                           <span>{language === 'ta' ? 'மொத்த கூலி' : 'Total Wage'}:</span>
                           <span>₹{(totalSareesDelivered * (loom.sareeWage || 0)).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between text-sm font-bold">
                           <span>{language === 'ta' ? 'வழங்கிய கூலி' : 'Paid Wage'}:</span>
                           <span className="text-emerald-700">₹{(totalSareesDelivered * (loom.sareeWage || 0) - balance).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between text-sm font-bold pt-1 border-t border-black">
                           <span>{language === 'ta' ? 'மீதமுள்ள கூலி' : 'Remaining Balance'}:</span>
                           <span className="text-rose-700">₹{balance.toLocaleString()}</span>
                         </div>
                       </div>
                    </div>

                    <table className="w-full text-left border-collapse border border-zinc-300">
                      <thead>
                        <tr className="bg-zinc-900 text-white uppercase text-[12px] font-black border-b-2 border-black">
                          <th className="p-3 border border-zinc-900">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                          <th className="p-3 border border-zinc-900">{language === 'ta' ? 'சேலைகள்' : 'Sarees'}</th>
                          <th className="p-3 border border-zinc-900">{language === 'ta' ? 'நூல்' : 'Yarn'}</th>
                          <th className="p-3 border border-zinc-900">{language === 'ta' ? 'ஜரிகை' : 'Zari'}</th>
                          <th className="p-3 border border-zinc-900 text-right">{language === 'ta' ? 'மொத்த கூலி' : 'Total Wage'}</th>
                          <th className="p-3 border border-zinc-900 text-right">{language === 'ta' ? 'கூலி வழங்கியது' : 'Wage Paid'}</th>
                          <th className="p-3 border border-zinc-900 text-right">{language === 'ta' ? 'மீதம்' : 'Balance'}</th>
                        </tr>
                      </thead>
                      <tbody className="text-[13px]">
                        {transactions.filter(t => t.loomId === loom.id).map((txn, idx) => {
                          const sd = txn.sareesDelivered || 0;
                          const tw = sd * (loom.sareeWage || 0);
                          const b = tw - (txn.wagePaid || 0);
                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}>
                              <td className="p-3 border border-zinc-200">{new Date(txn.date).toLocaleDateString()}</td>
                              <td className="p-3 border border-zinc-200 font-bold">{sd}</td>
                              <td className="p-3 border border-zinc-200">{txn.yarnConsumed}kg</td>
                              <td className="p-3 border border-zinc-200">{txn.zariKattaGiven || '-'}</td>
                              <td className="p-3 border border-zinc-200 text-right">₹{tw.toLocaleString()}</td>
                              <td className="p-3 border border-zinc-200 text-right text-emerald-700 font-bold">₹{(txn.wagePaid || 0).toLocaleString()}</td>
                              <td className="p-3 border border-zinc-200 text-right font-black">₹{b.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                  <button
                    onClick={() => setActiveLoomTabs(prev => ({ ...prev, [loom.id]: 'bottom' }))}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${(!activeLoomTabs[loom.id] || activeLoomTabs[loom.id] === 'bottom') ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
                  >
                    {language === 'ta' ? 'கீழ் வார்ப்பு' : 'Bottom Warp'}
                  </button>
                  <button
                    onClick={() => setActiveLoomTabs(prev => ({ ...prev, [loom.id]: 'top' }))}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${activeLoomTabs[loom.id] === 'top' ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
                  >
                    {language === 'ta' ? 'மேல் வார்ப்பு' : 'Top Warp'}
                  </button>
                  <button
                    onClick={() => setActiveLoomTabs(prev => ({ ...prev, [loom.id]: 'zari' }))}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${activeLoomTabs[loom.id] === 'zari' ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
                  >
                    {language === 'ta' ? 'ஜரிகை பாபின்' : 'Zari Bobbin'}
                  </button>
                </div>

                {loom.designName ? (
                  <>
                    {(!activeLoomTabs[loom.id] || activeLoomTabs[loom.id] === 'bottom') && (
                      <div className="grid grid-cols-2 gap-3 mb-6 text-sm animate-in fade-in">
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'வார்ப்பு நூல் (டீனியர்)' : 'Warp Yarn (Denier)'}</p>
                          <p className="font-bold text-zinc-900">{loom.warpYarnType || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'ஊடை நூல்' : 'Weft Yarn'}</p>
                          <p className="font-bold text-zinc-900">{loom.weftYarnType || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm col-span-2">
                          <p className="text-xs text-zinc-500 font-medium mb-2">{language === 'ta' ? 'அமைப்பு (இழை)' : 'Structure (Ends)'}</p>
                          {loom.warpSections && loom.warpSections.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {loom.warpSections.map((sec, idx) => (
                                <div key={idx} className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                                  <span className="text-zinc-500 font-medium">{sec.name}:</span>
                                  <span className="font-bold text-zinc-900">{sec.ends}</span>
                                  {sec.color && (
                                    <span className="text-[10px] font-bold text-zinc-600 bg-white px-1.5 py-0.5 rounded-md ml-1 border border-zinc-200">{sec.color}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="font-bold text-zinc-900">{loom.borderEnds} + {loom.bodyEnds} + {loom.borderEnds}</p>
                          )}
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'மொத்த சேலை' : 'Total Sarees'}</p>
                          <p className="font-bold text-zinc-900">{loom.totalSareesExpected || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'வார்ப்பு (மீட்டர்)' : 'Warp (Meters)'}</p>
                          <p className="font-bold text-zinc-900">{loom.warpLengthMeters || '-'}</p>
                        </div>
                        <button 
                          onClick={() => setIsAddingYarnLoomId(loom.id)}
                          className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm hover:border-emerald-300 transition-colors text-left group"
                        >
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'ஊடை நூல் கொடு' : 'Give Weft Yarn'}</p>
                          <p className="font-bold text-emerald-600 flex items-center gap-1 group-hover:text-emerald-700 transition-colors">
                            <Plus size={14} /> {language === 'ta' ? 'சேர்க்க' : 'Add'}
                          </p>
                        </button>
                        <div 
                          className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm transition-colors group"
                        >
                          <p className="text-xs text-zinc-500 font-medium mb-1 flex items-center gap-1">
                            {language === 'ta' ? 'கூலி (1 சேலை)' : 'Wage (1 Saree)'}
                          </p>
                          <p className="font-bold text-emerald-600">₹{loom.sareeWage || 0}</p>
                        </div>
                      </div>
                    )}

                    {activeLoomTabs[loom.id] === 'top' && (
                      <div className="grid grid-cols-2 gap-3 mb-6 text-sm animate-in fade-in">
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'மேல் வார்ப்பு நூல் (டீனியர்)' : 'Top Warp Yarn (Denier)'}</p>
                          <p className="font-bold text-zinc-900">{loom.topWarpYarnType || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'வார்ப்பு (மீட்டர்)' : 'Warp (Meters)'}</p>
                          <p className="font-bold text-zinc-900">{loom.topWarpLengthMeters || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm col-span-2">
                          <p className="text-xs text-zinc-500 font-medium mb-2">{language === 'ta' ? 'அமைப்பு (இழை)' : 'Structure (Ends)'}</p>
                          {loom.topWarpSections && loom.topWarpSections.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {loom.topWarpSections.map((sec, idx) => (
                                <div key={idx} className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                                  <span className="text-zinc-500 font-medium">{sec.name}:</span>
                                  <span className="font-bold text-zinc-900">{sec.ends}</span>
                                  {sec.color && (
                                    <span className="text-[10px] font-bold text-zinc-600 bg-white px-1.5 py-0.5 rounded-md ml-1 border border-zinc-200">{sec.color}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-zinc-400 text-xs italic">{language === 'ta' ? 'விவரங்கள் இல்லை' : 'No details'}</p>
                          )}
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'மொத்த நூல்' : 'Total Yarn'}</p>
                          <p className="font-bold text-zinc-900">{loom.topWarpTotalYarnWeight || '-'} kg</p>
                        </div>
                        <div className="flex items-end justify-end">
                        </div>
                      </div>
                    )}

                    {activeLoomTabs[loom.id] === 'zari' && (
                      <div className="grid grid-cols-2 gap-3 mb-6 text-sm animate-in fade-in">
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm col-span-2">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'ஜரிகை டீனியர்' : 'Zari Denier'}</p>
                          <p className="font-bold text-zinc-900">{loom.zariYarnType || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'பாபின்கள்' : 'Bobbins'}</p>
                          <p className="font-bold text-zinc-900">{loom.zariBobbins || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'இழை/பாபின்' : 'Ends/Bobbin'}</p>
                          <p className="font-bold text-zinc-900">{loom.zariEndsPerBobbin || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'மீட்டர்' : 'Meters'}</p>
                          <p className="font-bold text-zinc-900">{loom.zariMeters || '-'}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                          <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'மொத்த எடை (kg)' : 'Total Weight (kg)'}</p>
                          <p className="font-bold text-zinc-900">{loom.zariTotalYarnWeight || '-'}</p>
                        </div>
                        <div className="flex items-end justify-end col-span-2">
                        </div>
                      </div>
                    )}
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                    <p className="text-xs text-zinc-500 font-bold mb-2 uppercase tracking-wider">{language === 'ta' ? 'சேலை இருப்பு' : 'Saree Balance'}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{language === 'ta' ? 'கொடுத்தது' : 'Delivered'}</p>
                        <p className="font-black text-zinc-900 text-lg">{totalSareesDelivered}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                          {remainingSarees < 0 
                            ? (language === 'ta' ? 'அதிகம்' : 'Excess') 
                            : (language === 'ta' ? 'மீதம்' : 'Remaining')}
                        </p>
                        <p className={`font-black text-lg ${remainingSarees < 0 ? 'text-rose-500' : 'text-zinc-900'}`}>
                          {Math.abs(remainingSarees)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                    <p className="text-xs text-zinc-500 font-bold mb-2 uppercase tracking-wider">{language === 'ta' ? 'நூல் இருப்பு (kg)' : 'Yarn Balance'}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{language === 'ta' ? 'கொடுத்தது' : 'Given'}</p>
                        <p className="font-black text-zinc-900 text-lg">{totalYarnGiven.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{language === 'ta' ? 'செலவு' : 'Consumed'}</p>
                        <p className="font-black text-zinc-900 text-lg">{totalYarnConsumed.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                          {remainingYarn < 0 
                            ? (language === 'ta' ? 'அதிகம்' : 'Excess') 
                            : (language === 'ta' ? 'மீதம்' : 'Remaining')}
                        </p>
                        <p className={`font-black text-lg ${remainingYarn < 0 ? 'text-rose-500' : 'text-zinc-900'}`}>
                          {Math.abs(remainingYarn).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                    <p className="text-xs text-zinc-500 font-bold mb-2 uppercase tracking-wider">{language === 'ta' ? 'ஜரிகை கட்டா' : 'Zari Katta'}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{language === 'ta' ? 'கொடுத்தது' : 'Given'}</p>
                        <p className="font-black text-zinc-900 text-lg">{totalZariKattaGiven.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <h5 className="font-black text-zinc-900 text-sm tamil-font tracking-tight">{language === 'ta' ? 'பதிவுகள்' : 'Records'}</h5>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <button 
                      onClick={() => downloadPDF(loom, totalSareesDelivered, remainingSarees, totalYarnGiven, totalYarnConsumed, remainingYarn, balance)}
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Share2 size={14} /> {language === 'ta' ? 'அறிக்கையை பகிர (PDF)' : 'Share Statement (PDF)'}
                    </button>
                    <button 
                      onClick={() => handleShareStatement(loom, totalSareesDelivered, remainingSarees, totalYarnGiven, totalYarnConsumed, remainingYarn, balance)}
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Send size={14} /> {language === 'ta' ? 'வாட்ஸ்அப்' : 'WhatsApp'}
                    </button>
                    <button 
                      onClick={() => setCompletingWarpId(loom.id)}
                      className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full hover:bg-emerald-100 flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <CheckCircle size={14} /> {language === 'ta' ? 'கணக்கு முடிந்தது' : 'Complete Account'}
                    </button>
                    {transactions.filter(t => t.loomId === loom.id).length > 0 && (
                      <button 
                        onClick={() => {
                          const order = warpOrders.find(o => o.loomId === loom.id && o.status !== 'COMPLETED');
                          if (order) handleRepeatWarpOrder(order);
                        }}
                        className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Plus size={14} /> {language === 'ta' ? 'மீண்டும் ஆர்டர்' : 'Repeat Order'}
                      </button>
                    )}
                    <button 
                      onClick={() => setIsCreatingWarpOrder(loom.id)}
                      className="text-xs font-bold text-zinc-700 bg-white border border-zinc-200 px-3 py-1.5 rounded-full hover:bg-zinc-50 hover:text-zinc-900 flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Send size={14} /> {language === 'ta' ? 'வார்ப்பு ஆர்டர்' : 'Warp Order'}
                    </button>
                    <button 
                      onClick={() => setIsAddingTxn(loom.id)}
                      className="text-xs font-bold text-white bg-zinc-900 px-3 py-1.5 rounded-full hover:bg-zinc-800 transition-colors shadow-sm"
                    >
                      + {language === 'ta' ? 'பதிவு சேர்' : 'Add Record'}
                    </button>
                  </div>
                </div>

                {completingWarpId === loom.id && currentWarpOrder && (
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 mb-4 shadow-sm animate-in fade-in">
                    <p className="text-sm font-bold text-emerald-800 mb-3">
                      {language === 'ta' ? 'இந்த வார்ப்பு கணக்கை முடித்துவிட்டீர்களா? முடித்த பின் இது "முடிந்த கணக்குகள்" பட்டியலுக்கு சென்றுவிடும்.' : 'Are you sure you want to complete this warp account? It will be moved to Completed Accounts.'}
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setCompletingWarpId(null)} className="flex-1 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg font-bold text-xs hover:bg-emerald-50 transition-colors">
                        {language === 'ta' ? 'இல்லை' : 'No'}
                      </button>
                      <button onClick={() => confirmCompleteWarp(loom)} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 shadow-sm transition-colors">
                        {language === 'ta' ? 'ஆம், முடிந்தது' : 'Yes, Complete'}
                      </button>
                    </div>
                  </div>
                )}

                {editingWarpLoomId === loom.id && (
                  <div className="bg-white p-5 rounded-xl border border-zinc-200 mb-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <h6 className="font-black text-zinc-900 mb-4 text-sm tracking-tight">{language === 'ta' ? 'வார்ப்பு விவரங்கள்' : 'Warp Details'}</h6>
                    <div className="space-y-3">
                      <select 
                        value={selectedWarperId}
                        onChange={e => setSelectedWarperId(e.target.value)}
                        className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900"
                      >
                        <option value="">{language === 'ta' ? '-- வார்ப்புகாரரை தேர்ந்தெடுக்கவும் --' : '-- Select Warper --'}</option>
                        {warpers.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={warpYarnType}
                          onChange={e => setWarpYarnType(e.target.value)}
                          className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                        >
                          <option value="">{language === 'ta' ? 'வார்ப்பு நூல் வகை' : 'Warp Yarn Type'}</option>
                          {YARN_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <select
                          value={weftYarnType}
                          onChange={e => setWeftYarnType(e.target.value)}
                          className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                        >
                          <option value="">{language === 'ta' ? 'ஊடை நூல் வகை' : 'Weft Yarn Type'}</option>
                          {YARN_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>

                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-bold text-zinc-700">{language === 'ta' ? 'அமைப்பு' : 'Structure'}</p>
                          <select
                            value={warpType}
                            onChange={e => handleWarpTypeChange(e.target.value as WarpType)}
                            className="p-1.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-bold text-zinc-900"
                          >
                            <option value="plain">{language === 'ta' ? 'சாதா' : 'Plain'}</option>
                            <option value="border">{language === 'ta' ? 'பார்டர்' : 'Border'}</option>
                            <option value="design">{language === 'ta' ? 'மல்டி' : 'Multi'}</option>
                          </select>
                        </div>

                        {warpSections.map((section, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              placeholder={language === 'ta' ? 'பெயர்' : 'Name'}
                              value={section.name}
                              onChange={e => updateWarpSection(idx, 'name', e.target.value)}
                              className="w-1/3 p-2.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-medium"
                              readOnly={warpType !== 'design'}
                            />
                            <input
                              type="number"
                              placeholder={language === 'ta' ? 'இழைகள்' : 'Ends'}
                              value={section.ends || ''}
                              onChange={e => updateWarpSection(idx, 'ends', parseInt(e.target.value) || 0)}
                              className="w-1/3 p-2.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-bold"
                            />
                            <select
                              value={section.color}
                              onChange={e => updateWarpSection(idx, 'color', e.target.value)}
                              className="w-1/3 p-2.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-medium"
                            >
                              <option value="">{language === 'ta' ? 'கலர்' : 'Color'}</option>
                              {YARN_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {warpType === 'design' && (
                              <button onClick={() => removeWarpSection(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        {warpType === 'design' && (
                          <button onClick={addWarpSection} className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2">
                            <Plus size={14} /> {language === 'ta' ? 'பிரிவை சேர்' : 'Add Section'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="number" 
                          placeholder={language === 'ta' ? 'மொத்த சேலைகள்' : 'Total Sarees'}
                          value={totalSareesExpected}
                          onChange={e => setTotalSareesExpected(e.target.value)}
                          className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900"
                        />
                        <input 
                          type="number" 
                          placeholder={language === 'ta' ? 'வார்ப்பு நீளம் (மீட்டர்)' : 'Warp Length (m)'}
                          value={warpLengthMeters}
                          onChange={e => setWarpLengthMeters(e.target.value)}
                          className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900"
                        />
                        <input 
                          type="number" 
                          placeholder={language === 'ta' ? 'மொத்த நூல் எடை (kg)' : 'Total Yarn Weight (kg)'}
                          value={totalYarnWeight}
                          onChange={e => setTotalYarnWeight(e.target.value)}
                          className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900"
                        />
                        <input 
                          type="number" 
                          placeholder={language === 'ta' ? 'சேலை கூலி (₹)' : 'Saree Wage (₹)'}
                          value={sareeWage}
                          onChange={e => setSareeWage(e.target.value)}
                          className="w-full p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900"
                        />
                      </div>

                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
                        <p className="text-sm font-bold text-zinc-700">{language === 'ta' ? 'மேல் வார்ப்பு விவரங்கள் (விரும்பினால்)' : 'Top Warp Details (Optional)'}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={topWarpYarnType}
                            onChange={e => setTopWarpYarnType(e.target.value)}
                            className="w-full p-3.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                          >
                            <option value="">{language === 'ta' ? 'நூல் வகை (டீனியர்)' : 'Yarn Type (Denier)'}</option>
                            {YARN_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <input 
                            type="number" 
                            placeholder={language === 'ta' ? 'நீளம் (மீட்டர்)' : 'Length (m)'}
                            value={topWarpLengthMeters}
                            onChange={e => setTopWarpLengthMeters(e.target.value)}
                            className="w-full p-3.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900"
                          />
                          <input 
                            type="number" 
                            placeholder={language === 'ta' ? 'மொத்த எடை (kg)' : 'Total Weight (kg)'}
                            value={topWarpTotalYarnWeight}
                            onChange={e => setTopWarpTotalYarnWeight(e.target.value)}
                            className="w-full p-3.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-bold text-zinc-900 col-span-2"
                          />
                        </div>
                        
                        <div className="mt-4">
                          <p className="text-xs font-bold text-zinc-700 mb-2">{language === 'ta' ? 'மேல் வார்ப்பு அமைப்பு' : 'Top Warp Structure'}</p>
                          {topWarpSections.map((section, idx) => (
                            <div key={idx} className="flex gap-2 items-center mb-2">
                              <input
                                type="text"
                                placeholder={language === 'ta' ? 'பெயர்' : 'Name'}
                                value={section.name}
                                onChange={e => updateTopWarpSection(idx, 'name', e.target.value)}
                                className="w-1/3 p-2.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-medium"
                              />
                              <input
                                type="number"
                                placeholder={language === 'ta' ? 'இழைகள்' : 'Ends'}
                                value={section.ends || ''}
                                onChange={e => updateTopWarpSection(idx, 'ends', parseInt(e.target.value) || 0)}
                                className="w-1/3 p-2.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-bold"
                              />
                              <select
                                value={section.color}
                                onChange={e => updateTopWarpSection(idx, 'color', e.target.value)}
                                className="w-1/3 p-2.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-medium"
                              >
                                <option value="">{language === 'ta' ? 'கலர்' : 'Color'}</option>
                                {YARN_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <button onClick={() => removeTopWarpSection(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          <button onClick={addTopWarpSection} className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-2">
                            <Plus size={14} /> {language === 'ta' ? 'பிரிவை சேர்' : 'Add Section'}
                          </button>
                        </div>
                      </div>

                      <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-3">
                        <p className="text-sm font-bold text-zinc-700">{language === 'ta' ? 'ஜரிகை விவரங்கள் (விரும்பினால்)' : 'Zari Details (Optional)'}</p>
                        <div className="mb-2">
                          <select 
                            value={zariYarnType}
                            onChange={e => setZariYarnType(e.target.value)}
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-bold"
                          >
                            <option value="">{language === 'ta' ? 'ஜரிகை டீனியர்' : 'Zari Denier'}</option>
                            {denierFormulas.map(f => (
                              <option key={`zari-${f.id}`} value={f.denier}>{f.denier}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input 
                            type="number" 
                            placeholder={language === 'ta' ? 'பாபின்கள்' : 'Bobbins'}
                            value={zariBobbins}
                            onChange={e => setZariBobbins(e.target.value)}
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-bold"
                          />
                          <input 
                            type="number" 
                            placeholder={language === 'ta' ? 'இழை/பாபின்' : 'Ends/Bobbin'}
                            value={zariEndsPerBobbin}
                            onChange={e => setZariEndsPerBobbin(e.target.value)}
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-bold"
                          />
                          <input 
                            type="number" 
                            placeholder={language === 'ta' ? 'மீட்டர்' : 'Meters'}
                            value={zariMeters}
                            onChange={e => setZariMeters(e.target.value)}
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-bold"
                          />
                          <input 
                            type="number" 
                            placeholder={language === 'ta' ? 'மொத்த எடை (kg)' : 'Total Weight (kg)'}
                            value={zariTotalYarnWeight}
                            onChange={e => setZariTotalYarnWeight(e.target.value)}
                            className="w-full p-2.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => setEditingWarpLoomId(null)}
                          className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
                        >
                          {language === 'ta' ? 'ரத்து செய்' : 'Cancel'}
                        </button>
                        <button 
                          onClick={() => handleAddWarpDetails(loom.id)}
                          className="flex-1 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors shadow-md"
                        >
                          {language === 'ta' ? 'சேமி' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isCreatingWarpOrder === loom.id && (
                  <div className="bg-white p-5 rounded-xl border border-zinc-200 mb-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <h6 className="font-black text-zinc-900 mb-4 text-sm tracking-tight">{language === 'ta' ? 'புதிய வார்ப்பு ஆர்டர்' : 'New Warp Order'}</h6>
                    <div className="mb-5">
                      <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wider">{language === 'ta' ? 'வார்ப்புகாரர்' : 'Warper'}</label>
                      <select 
                        value={selectedWarperId}
                        onChange={e => setSelectedWarperId(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                      >
                        <option value="">{language === 'ta' ? '-- தேர்ந்தெடுக்கவும் --' : '-- Select --'}</option>
                        {warpers.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setIsCreatingWarpOrder(null)} className="flex-1 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold text-xs hover:bg-zinc-50 transition-colors">
                        {language === 'ta' ? 'ரத்து' : 'Cancel'}
                      </button>
                      <button onClick={() => handleCreateWarpOrder(loom)} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-zinc-800 transition-colors">
                        {language === 'ta' ? 'ஆர்டர் கொடு' : 'Create Order'}
                      </button>
                    </div>
                  </div>
                )}

                {isAddingYarnLoomId === loom.id && (
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <h6 className="font-black text-zinc-900 mb-4 text-sm tracking-tight">{language === 'ta' ? 'ஊடை நூல் கொடு' : 'Give Weft Yarn'}</h6>
                    <div className="space-y-4 mb-4">
                      <input 
                        type="date" 
                        value={yarnGivenDate}
                        onChange={e => setYarnGivenDate(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                      />
                      
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest">{language === 'ta' ? 'நூல் விவரங்கள்' : 'Yarn Details'}</label>
                        {yarnGivenItems.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <select
                              value={item.color}
                              onChange={e => {
                                const newItems = [...yarnGivenItems];
                                newItems[idx].color = e.target.value;
                                setYarnGivenItems(newItems);
                              }}
                              className="flex-1 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                            >
                              <option value="">{language === 'ta' ? 'நிறம்' : 'Color'}</option>
                              {YARN_COLORS.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder={language === 'ta' ? 'எடை (kg)' : 'Weight (kg)'}
                              value={item.weight}
                              onChange={e => {
                                const newItems = [...yarnGivenItems];
                                newItems[idx].weight = e.target.value;
                                setYarnGivenItems(newItems);
                              }}
                              className="w-24 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                            />
                            {yarnGivenItems.length > 1 && (
                              <button 
                                onClick={() => setYarnGivenItems(yarnGivenItems.filter((_, i) => i !== idx))}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button 
                          onClick={() => setYarnGivenItems([...yarnGivenItems, { color: '', weight: '' }])}
                          className="w-full py-2 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs font-bold hover:border-zinc-300 hover:text-zinc-500 transition-all flex items-center justify-center gap-1"
                        >
                          <Plus size={14} /> {language === 'ta' ? 'நிறம் சேர்' : 'Add Color'}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setIsAddingYarnLoomId(null)} className="flex-1 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold text-xs hover:bg-zinc-50 transition-colors">
                        {language === 'ta' ? 'ரத்து' : 'Cancel'}
                      </button>
                      <button onClick={() => handleAddYarn(loom.id)} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-zinc-800 transition-colors">
                        {language === 'ta' ? 'சேமி' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                {isAddingTxn === loom.id && (
                  <div className="bg-white p-4 rounded-xl border border-zinc-200 mb-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <input 
                        type="date" 
                        value={txnDate}
                        onChange={e => setTxnDate(e.target.value)}
                        className="col-span-2 w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                      />
                      <input 
                        type="number" 
                        placeholder={language === 'ta' ? 'கொடுத்த சேலை' : 'Sarees Delivered'}
                        value={sareesDelivered}
                        onChange={e => setSareesDelivered(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                      />
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder={language === 'ta' ? 'செலவு நூல் (kg)' : 'Yarn Consumed (kg)'}
                        value={yarnConsumed}
                        onChange={e => setYarnConsumed(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                      />
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder={language === 'ta' ? 'கொடுத்த கூலி (₹)' : 'Wage Paid (₹)'}
                        value={wagePaid}
                        onChange={e => setWagePaid(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                      />
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder={language === 'ta' ? 'ஜரிகை கட்டா' : 'Zari Katta Given'}
                        value={zariKattaGiven}
                        onChange={e => setZariKattaGiven(e.target.value)}
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 transition-all font-medium text-zinc-900"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setIsAddingTxn(null)} className="flex-1 py-2.5 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-bold text-xs hover:bg-zinc-50 transition-colors">
                        {language === 'ta' ? 'ரத்து' : 'Cancel'}
                      </button>
                      <button onClick={() => handleAddTxn(loom.id)} className="flex-1 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-zinc-800 transition-colors">
                        {language === 'ta' ? 'சேமி' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {loomTxns.length === 0 ? (
                    <p className="text-center text-xs text-zinc-400 py-4 font-medium">{language === 'ta' ? 'பதிவுகள் இல்லை' : 'No records'}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-zinc-200">
                      <table className="w-full text-left text-xs">
                        <thead className="text-zinc-500 bg-zinc-50 border-b border-zinc-200">
                          <tr>
                            {[
                              { id: 'date', label: language === 'ta' ? 'தேதி' : 'Date', def: 80 },
                              { id: 'sarees', label: language === 'ta' ? 'சேலை' : 'Sarees', def: 80 },
                              { id: 'yarn', label: language === 'ta' ? 'நூல்' : 'Yarn', def: 80 },
                              { id: 'zari', label: language === 'ta' ? 'ஜரிகை' : 'Zari', def: 80 },
                              { id: 'totalWage', label: language === 'ta' ? 'மொத்த கூலி' : 'Total Wage', def: 100 },
                              { id: 'wagePaid', label: language === 'ta' ? 'கொடுத்த கூலி' : 'Wage Paid', def: 100 },
                              { id: 'balance', label: language === 'ta' ? 'மீதம்' : 'Balance', def: 100 },
                            ].map(col => (
                              <th 
                                key={col.id} 
                                className={`p-3 font-bold uppercase tracking-wider relative group cursor-pointer select-none transition-colors ${selectedColForPinch === col.id ? 'bg-zinc-100 text-zinc-900' : ''}`}
                                style={{ width: columnWidths[col.id] || col.def, minWidth: columnWidths[col.id] || col.def }}
                                onClick={() => isEditingColumns && setSelectedColForPinch(selectedColForPinch === col.id ? null : col.id)}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="truncate">{col.label}</span>
                                  {isEditingColumns && (
                                    <div 
                                      className="w-4 h-full absolute right-0 top-0 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 bg-zinc-200/50"
                                      onMouseDown={(e) => startResizing(col.id, e)}
                                      onTouchStart={(e) => startResizing(col.id, e)}
                                    >
                                      <div className="w-0.5 h-4 bg-zinc-400 rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {loomTxns.map(txn => (
                            <SareeTransactionRow 
                                key={txn.id}
                                txn={txn}
                                loom={loom}
                                language={language}
                                columnWidths={columnWidths}
                                onEdit={() => handleEditTransaction(txn)}
                                onDelete={() => handleDeleteTransaction(txn.id)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                </>
                ) : (
                  <div className="text-center py-6 bg-white rounded-xl border border-dashed border-zinc-200 shadow-sm">
                    <p className="text-zinc-500 font-medium text-sm">
                      {language === 'ta' ? 'இந்த தறிக்கு இன்னும் வார்ப்பு கொடுக்கப்படவில்லை' : 'No warp assigned to this loom yet'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {(() => {
        const completedWarpOrders = warpOrders
          .filter(o => o.weaverId === weaverId && o.status === 'COMPLETED')
          .sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt));

        if (completedWarpOrders.length === 0) return null;

        return (
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="font-black text-zinc-900 mb-6 tamil-font text-xl flex items-center gap-2 tracking-tight">
              <CheckCircle className="text-emerald-500" size={24} />
              {language === 'ta' ? 'முடிந்த கணக்குகள்' : 'Completed Accounts'}
            </h3>
            <div className="space-y-4">
              {completedWarpOrders.map(order => {
                const orderTxns = transactions.filter(t => t.warpOrderId === order.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const sareeTxns = orderTxns.filter(t => t.type !== 'YARN_GIVEN');
                const yarnGivenTxns = orderTxns.filter(t => t.type === 'YARN_GIVEN');

                const totalSareesDelivered = sareeTxns.reduce((sum, t) => sum + (t.sareesDelivered || 0), 0);
                const totalYarnConsumed = sareeTxns.reduce((sum, t) => sum + (t.yarnConsumed || 0), 0);
                const totalYarnGiven = yarnGivenTxns.reduce((sum, t) => sum + (t.yarnGivenWeight || 0), 0);
                const totalZariKattaGiven = orderTxns.reduce((sum, t) => sum + (t.zariKattaGiven || 0), 0);
                
                const remainingSarees = (order.totalSareesExpected || 0) - totalSareesDelivered;
                const remainingYarn = totalYarnGiven - totalYarnConsumed;

                const totalWagePaid = sareeTxns.reduce((sum, t) => sum + (t.wagePaid || 0), 0);
                const totalWage = totalSareesDelivered * (order.sareeWage || 0);
                const balance = totalWage - totalWagePaid;
                
                const isExpanded = expandedCompletedOrderId === order.id;

                return (
                  <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden opacity-80 hover:opacity-100 transition-all hover:border-emerald-200">
                    <div 
                      className="p-4 cursor-pointer hover:bg-zinc-50 transition-colors flex justify-between items-center"
                      onClick={() => setExpandedCompletedOrderId(isExpanded ? null : order.id)}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-zinc-200">{order.orderNumber}</span>
                          <span className="text-xs text-zinc-500 font-medium">{new Date(order.completedAt || order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-black text-zinc-900 tracking-tight">
                          {language === 'ta' ? 'தறி' : 'Loom'} {order.loomNumber} {order.designName ? `- ${order.designName}` : ''}
                        </h4>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div className="hidden sm:block">
                          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{language === 'ta' ? 'சேலைகள்' : 'Sarees'}</p>
                          <p className="font-bold text-zinc-900">{totalSareesDelivered} / {order.totalSareesExpected}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{language === 'ta' ? 'மீதத் தொகை' : 'Balance'}</p>
                          <p className={`font-bold ${balance > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>₹{balance}</p>
                        </div>
                        <div className="bg-zinc-100 p-1.5 rounded-lg flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRepeatWarpOrder(order);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={language === 'ta' ? 'மீண்டும் ஆர்டர்' : 'Repeat Order'}
                          >
                            <Plus size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareCompletedOrder(order);
                            }}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title={language === 'ta' ? 'பகிர்' : 'Share'}
                          >
                            <Share2 size={16} />
                          </button>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              const isConfirmed = await confirm.confirmDelete(
                                language === 'ta' ? 'நிச்சயமாக இந்த கணக்கை நீக்க வேண்டுமா?' : 'Are you sure you want to delete this completed record?'
                              );
                              if (isConfirmed) {
                                saveWarpOrders(warpOrders.filter(o => o.id !== order.id));
                                confirm.showSuccess(language === 'ta' ? 'கணக்கு வெற்றிகரமாக நீக்கப்பட்டது!' : 'Record deleted successfully!');
                              }
                            }}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title={language === 'ta' ? 'நீக்கு' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                          {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                        </div>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-5 border-t border-zinc-100 bg-zinc-50/50">
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                          {(!order.orderType || order.orderType === 'MAIN_WARP') && (
                            <button
                              onClick={() => setActiveLoomTabs(prev => ({ ...prev, [order.id]: 'bottom' }))}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${(!activeLoomTabs[order.id] || activeLoomTabs[order.id] === 'bottom') ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
                            >
                              {language === 'ta' ? 'கீழ் வார்ப்பு' : 'Bottom Warp'}
                            </button>
                          )}
                          {(!order.orderType || order.orderType === 'MAIN_WARP' || order.orderType === 'TOP_WARP') && (order.orderType === 'TOP_WARP' || order.topWarpYarnType) && (
                            <button
                              onClick={() => setActiveLoomTabs(prev => ({ ...prev, [order.id]: 'top' }))}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${activeLoomTabs[order.id] === 'top' || (order.orderType === 'TOP_WARP' && !activeLoomTabs[order.id]) ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
                            >
                              {language === 'ta' ? 'மேல் வார்ப்பு' : 'Top Warp'}
                            </button>
                          )}
                          {(!order.orderType || order.orderType === 'MAIN_WARP' || order.orderType === 'ZARI_BOBBIN') && (order.orderType === 'ZARI_BOBBIN' || order.zariBobbins) && (
                            <button
                              onClick={() => setActiveLoomTabs(prev => ({ ...prev, [order.id]: 'zari' }))}
                              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${activeLoomTabs[order.id] === 'zari' || (order.orderType === 'ZARI_BOBBIN' && !activeLoomTabs[order.id]) ? 'bg-zinc-900 text-white shadow-sm' : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'}`}
                            >
                              {language === 'ta' ? 'ஜரிகை பாபின்' : 'Zari Bobbin'}
                            </button>
                          )}
                        </div>

                        {(!activeLoomTabs[order.id] || activeLoomTabs[order.id] === 'bottom') && (!order.orderType || order.orderType === 'MAIN_WARP') && (
                          <div className="grid grid-cols-2 gap-3 mb-6 text-sm animate-in fade-in">
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'வார்ப்பு நூல் (டீனியர்)' : 'Warp Yarn (Denier)'}</p>
                              <p className="font-bold text-zinc-900">{order.warpYarnType || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'ஊடை நூல்' : 'Weft Yarn'}</p>
                              <p className="font-bold text-zinc-900">{order.weftYarnType || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm col-span-2">
                              <p className="text-xs text-zinc-500 font-medium mb-2">{language === 'ta' ? 'அமைப்பு (இழை)' : 'Structure (Ends)'}</p>
                              {order.sections && order.sections.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {order.sections.map((sec, idx) => (
                                    <div key={idx} className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                                      <span className="text-zinc-500 font-medium">{sec.name}:</span>
                                      <span className="font-bold text-zinc-900">{sec.ends}</span>
                                      {sec.color && (
                                        <span className="text-[10px] font-bold text-zinc-600 bg-white px-1.5 py-0.5 rounded-md ml-1 border border-zinc-200">{sec.color}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="font-bold text-zinc-900">-</p>
                              )}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'மொத்த சேலை' : 'Total Sarees'}</p>
                              <p className="font-bold text-zinc-900">{order.totalSareesExpected || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'வார்ப்பு (மீட்டர்)' : 'Warp (Meters)'}</p>
                              <p className="font-bold text-zinc-900">{order.warpLengthMeters || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1 flex items-center gap-1">
                                {language === 'ta' ? 'கூலி (1 சேலை)' : 'Wage (1 Saree)'}
                              </p>
                              <p className="font-bold text-zinc-900">₹{order.sareeWage || 0}</p>
                            </div>
                          </div>
                        )}

                        {(activeLoomTabs[order.id] === 'top' || (order.orderType === 'TOP_WARP' && !activeLoomTabs[order.id])) && (!order.orderType || order.orderType === 'MAIN_WARP' || order.orderType === 'TOP_WARP') && (
                          <div className="grid grid-cols-2 gap-3 mb-6 text-sm animate-in fade-in">
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'வார்ப்பு நூல்' : 'Warp Yarn'}</p>
                              <p className="font-bold text-zinc-900">{order.topWarpYarnType || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'வார்ப்பு (மீட்டர்)' : 'Warp (Meters)'}</p>
                              <p className="font-bold text-zinc-900">{order.topWarpLengthMeters || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm col-span-2">
                              <p className="text-xs text-zinc-500 font-medium mb-2">{language === 'ta' ? 'அமைப்பு (இழை)' : 'Structure (Ends)'}</p>
                              {order.topWarpSections && order.topWarpSections.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {order.topWarpSections.map((sec, idx) => (
                                    <div key={idx} className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5">
                                      <span className="text-zinc-500 font-medium">{sec.name}:</span>
                                      <span className="font-bold text-zinc-900">{sec.ends}</span>
                                      {sec.color && (
                                        <span className="text-[10px] font-bold text-zinc-600 bg-white px-1.5 py-0.5 rounded-md ml-1 border border-zinc-200">{sec.color}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="font-bold text-zinc-900">-</p>
                              )}
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'மொத்த எடை (kg)' : 'Total Weight (kg)'}</p>
                              <p className="font-bold text-zinc-900">{(order.orderType === 'TOP_WARP' ? order.totalYarnWeight : order.topWarpTotalYarnWeight) || '-'}</p>
                            </div>
                          </div>
                        )}

                        {(activeLoomTabs[order.id] === 'zari' || (order.orderType === 'ZARI_BOBBIN' && !activeLoomTabs[order.id])) && (!order.orderType || order.orderType === 'MAIN_WARP' || order.orderType === 'ZARI_BOBBIN') && (
                          <div className="grid grid-cols-2 gap-3 mb-6 text-sm animate-in fade-in">
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm col-span-2">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'ஜரிகை டீனியர்' : 'Zari Denier'}</p>
                              <p className="font-bold text-zinc-900">{order.zariYarnType || order.warpYarnType || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'பாபின்கள்' : 'Bobbins'}</p>
                              <p className="font-bold text-zinc-900">{order.zariBobbins || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'இழை/பாபின்' : 'Ends/Bobbin'}</p>
                              <p className="font-bold text-zinc-900">{order.zariEndsPerBobbin || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'மீட்டர்' : 'Meters'}</p>
                              <p className="font-bold text-zinc-900">{order.zariMeters || '-'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
                              <p className="text-xs text-zinc-500 font-medium mb-1">{language === 'ta' ? 'மொத்த எடை (kg)' : 'Total Weight (kg)'}</p>
                              <p className="font-bold text-zinc-900">{(order.orderType === 'ZARI_BOBBIN' ? order.totalYarnWeight : order.zariTotalYarnWeight) || '-'}</p>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                            <p className="text-xs text-zinc-500 font-bold mb-2 uppercase tracking-wider">{language === 'ta' ? 'சேலை இருப்பு' : 'Saree Balance'}</p>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{language === 'ta' ? 'கொடுத்தது' : 'Delivered'}</p>
                                <p className="font-black text-zinc-900 text-lg">{totalSareesDelivered}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                                  {remainingSarees < 0 
                                    ? (language === 'ta' ? 'அதிகம்' : 'Excess') 
                                    : (language === 'ta' ? 'மீதம்' : 'Remaining')}
                                </p>
                                <p className={`font-black text-lg ${remainingSarees < 0 ? 'text-rose-500' : 'text-zinc-900'}`}>
                                  {Math.abs(remainingSarees)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                            <p className="text-xs text-zinc-500 font-bold mb-2 uppercase tracking-wider">{language === 'ta' ? 'நூல் இருப்பு (kg)' : 'Yarn Balance'}</p>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{language === 'ta' ? 'கொடுத்தது' : 'Given'}</p>
                                <p className="font-black text-zinc-900 text-lg">{totalYarnGiven.toFixed(2)}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{language === 'ta' ? 'செலவு' : 'Consumed'}</p>
                                <p className="font-black text-zinc-900 text-lg">{totalYarnConsumed.toFixed(2)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">
                                  {remainingYarn < 0 
                                    ? (language === 'ta' ? 'அதிகம்' : 'Excess') 
                                    : (language === 'ta' ? 'மீதம்' : 'Remaining')}
                                </p>
                                <p className={`font-black text-lg ${remainingYarn < 0 ? 'text-rose-500' : 'text-zinc-900'}`}>
                                  {Math.abs(remainingYarn).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                            <p className="text-xs text-zinc-500 font-bold mb-2 uppercase tracking-wider">{language === 'ta' ? 'ஜரிகை கட்டா' : 'Zari Katta'}</p>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{language === 'ta' ? 'கொடுத்தது' : 'Given'}</p>
                                <p className="font-black text-zinc-900 text-lg">{totalZariKattaGiven.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <h5 className="font-bold text-zinc-900 mb-3 text-sm">{language === 'ta' ? 'பதிவுகள்' : 'Transactions'}</h5>
                        {orderTxns.length === 0 ? (
                          <p className="text-center text-xs text-zinc-400 py-4 font-medium">{language === 'ta' ? 'பதிவுகள் இல்லை' : 'No records'}</p>
                        ) : (
                          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
                            <table className="w-full text-left text-xs">
                              <thead className="text-zinc-500 bg-zinc-50 border-b border-zinc-200">
                                <tr>
                                  <th className="p-3 font-bold uppercase tracking-wider">{language === 'ta' ? 'தேதி' : 'Date'}</th>
                                  <th className="p-3 font-bold uppercase tracking-wider">{language === 'ta' ? 'சேலை' : 'Sarees'}</th>
                                  <th className="p-3 font-bold uppercase tracking-wider">{language === 'ta' ? 'நூல்' : 'Yarn'}</th>
                                  <th className="p-3 font-bold uppercase tracking-wider">{language === 'ta' ? 'மொத்த கூலி' : 'Total Wage'}</th>
                                  <th className="p-3 font-bold uppercase tracking-wider">{language === 'ta' ? 'கொடுத்த கூலி' : 'Wage Paid'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100">
                                {orderTxns.map(txn => {
                                  if (txn.type === 'YARN_GIVEN') return null;
                                  const tWage = (txn.sareesDelivered || 0) * (order.sareeWage || 0);
                                  return (
                                    <tr key={txn.id} className="hover:bg-zinc-50 transition-colors">
                                      <td className="p-3 font-medium text-zinc-600">{new Date(txn.date).toLocaleDateString()}</td>
                                      <td className="p-3 font-bold text-zinc-900">{txn.sareesDelivered}</td>
                                      <td className="p-3 font-bold text-zinc-900">{txn.yarnConsumed}kg</td>
                                      <td className="p-3 font-bold text-zinc-900">₹{tWage}</td>
                                      <td className="p-3 font-bold text-emerald-600">₹{txn.wagePaid || 0}</td>
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
          </div>
        );
      })()}
    </div>
  );
};

export default SareeAccounts;
