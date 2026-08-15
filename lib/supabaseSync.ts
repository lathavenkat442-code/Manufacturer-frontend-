import { supabase } from '../supabaseClient';
import { 
  StockItem, Transaction, Weaver, Warper, DeliveryBook, YarnSupplier, 
  YarnEntry, YarnDispatch, WarperReturn, DenierFormula, WeaverProduction, 
  Loom, LoomTransaction, WarpOrder, Purchase, Customer, Invoice, DeliverySlip, WarpDesign 
} from '../types';

// Sync Queue Types
export interface SyncAction {
  type: string;
  payload: {
    table: string;
    id: string;
    [key: string]: any;
  };
  timestamp: number;
}

// Helper to safely parse JSON
const safeParse = (data: string | null) => {
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
};

// Sync Queue Helpers
export const getSyncQueue = (uid: string | undefined): SyncAction[] => {
  if (!uid || uid === 'guest') return [];
  try {
    const q = localStorage.getItem(`viyabaari_sync_queue_${uid}`);
    return q ? JSON.parse(q) : [];
  } catch {
    return [];
  }
};

export const addToSyncQueue = (uid: string | undefined, action: SyncAction) => {
  if (!uid || uid === 'guest') return;
  const q = getSyncQueue(uid);
  // Avoid duplicate delete actions for the same table & id
  if (!q.some(a => a.type === action.type && a.payload.table === action.payload.table && a.payload.id === action.payload.id)) {
    q.push(action);
    localStorage.setItem(`viyabaari_sync_queue_${uid}`, JSON.stringify(q));
  }
};

export const removeFromSyncQueue = (uid: string | undefined, table: string, id: string) => {
  if (!uid || uid === 'guest') return;
  const q = getSyncQueue(uid);
  const filtered = q.filter(a => !(a.payload.table === table && a.payload.id === id));
  localStorage.setItem(`viyabaari_sync_queue_${uid}`, JSON.stringify(filtered));
};

export const clearSyncQueue = (uid: string | undefined) => {
  if (!uid || uid === 'guest') return;
  localStorage.removeItem(`viyabaari_sync_queue_${uid}`);
};

// Tracking Deleted IDs (so fetchFromSupabase never resurrects deleted records)
export const getDeletedIds = (uid: string | undefined): Record<string, string[]> => {
  if (!uid || uid === 'guest') return {};
  try {
    const d = localStorage.getItem(`viyabaari_deleted_ids_${uid}`);
    return d ? JSON.parse(d) : {};
  } catch {
    return {};
  }
};

export const markIdDeleted = (uid: string | undefined, table: string, id: string) => {
  if (!uid || uid === 'guest') return;
  const map = getDeletedIds(uid);
  if (!map[table]) map[table] = [];
  if (!map[table].includes(id)) {
    map[table].push(id);
    localStorage.setItem(`viyabaari_deleted_ids_${uid}`, JSON.stringify(map));
  }
};

export const unmarkIdDeleted = (uid: string | undefined, table: string, id: string) => {
  if (!uid || uid === 'guest') return;
  const map = getDeletedIds(uid);
  if (map[table]) {
    map[table] = map[table].filter(item => item !== id);
    localStorage.setItem(`viyabaari_deleted_ids_${uid}`, JSON.stringify(map));
  }
};

export const isIdDeleted = (uid: string | undefined, table: string, id: string): boolean => {
  if (!uid || uid === 'guest') return false;
  const map = getDeletedIds(uid);
  return !!map[table]?.includes(id);
};

// Debounce helper for syncing
let syncTimer: any = null;
export const triggerBackgroundSync = (uid: string | undefined) => {
  if (!uid || uid === 'guest' || !navigator.onLine) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncToSupabase(uid).catch(err => console.error("Background sync error:", err));
  }, 400);
};

// Unified Save Helper
export const saveDataAndSync = async (uid: string | undefined, key: string, data: any, table?: string) => {
  const userKey = uid || 'guest';
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage save error:", e);
  }
  
  // Dispatch local update so all components re-render immediately
  window.dispatchEvent(new Event('local-storage-update'));

  // Trigger background sync to Supabase
  if (userKey !== 'guest') {
    triggerBackgroundSync(userKey);
  }
};

// Delete Helper with Cascade Handling
export const deleteFromSupabase = async (uid: string | undefined, table: string, id: string, isOnline: boolean) => {
  if (!uid || uid === 'guest') return true;

  markIdDeleted(uid, table, id);

  if (isOnline) {
    try {
      // 1. Delete child table rows first to prevent FK violation
      if (table === 'stock_items') {
        const { data: variants } = await supabase.from('stock_variants').select('id').eq('stock_item_id', id);
        if (variants && variants.length > 0) {
          const varIds = variants.map(v => v.id);
          await supabase.from('size_stocks').delete().in('variant_id', varIds);
          await supabase.from('stock_variants').delete().eq('stock_item_id', id);
        }
        await supabase.from('stock_history').delete().eq('stock_item_id', id);
      } else if (table === 'warp_orders') {
        await supabase.from('warp_order_sections').delete().eq('warp_order_id', id);
      } else if (table === 'looms') {
        await supabase.from('loom_warp_sections').delete().eq('loom_id', id);
        await supabase.from('loom_transactions').delete().eq('loom_id', id);
      } else if (table === 'warper_returns') {
        await supabase.from('warper_return_sections').delete().eq('warper_return_id', id);
      } else if (table === 'warp_designs') {
        await supabase.from('warp_design_sections').delete().eq('warp_design_id', id);
      } else if (table === 'purchases') {
        await supabase.from('purchase_items').delete().eq('purchase_id', id);
      } else if (table === 'invoices') {
        await supabase.from('invoice_items').delete().eq('invoice_id', id);
      } else if (table === 'delivery_slips') {
        await supabase.from('delivery_slip_items').delete().eq('delivery_slip_id', id);
      }

      // 2. Delete main row
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      
      removeFromSyncQueue(uid, table, id);
      return true;
    } catch (e) {
      console.error(`Error deleting from ${table}:`, e);
      addToSyncQueue(uid, { type: 'GENERIC_DELETE', payload: { table, id }, timestamp: Date.now() });
      return false;
    }
  } else {
    addToSyncQueue(uid, { type: 'GENERIC_DELETE', payload: { table, id }, timestamp: Date.now() });
    return false;
  }
};

// Unified Delete & Sync Helper
export const deleteDataAndSync = async (uid: string | undefined, table: string, id: string, key?: string, updatedList?: any[]) => {
  const userKey = uid || 'guest';
  if (key && updatedList !== undefined) {
    try {
      localStorage.setItem(key, JSON.stringify(updatedList));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }
  }

  // Mark as deleted immediately
  markIdDeleted(userKey, table, id);

  // Dispatch local update event
  window.dispatchEvent(new Event('local-storage-update'));

  // Delete from Supabase in background
  if (userKey !== 'guest') {
    deleteFromSupabase(userKey, table, id, navigator.onLine).catch(err => {
      console.error("Delete sync error:", err);
    });
  }
};

// Sync local data to Supabase
export const syncToSupabase = async (uid: string | undefined) => {
  if (!uid || uid === 'guest') return;

  console.log("Starting Supabase Sync for UID:", uid);

  try {
    // Process Sync Queue (e.g. pending deletes)
    const queue = getSyncQueue(uid);
    if (queue.length > 0) {
      console.log(`Processing ${queue.length} queued actions...`);
      for (const action of queue) {
        if (action.type === 'GENERIC_DELETE' || action.type === 'STOCK_DELETE' || action.type === 'TXN_DELETE') {
          const table = action.payload.table || (action.type === 'STOCK_DELETE' ? 'stock_items' : 'transactions');
          const id = action.payload.id;
          try {
            await deleteFromSupabase(uid, table, id, true);
          } catch (e) {
            console.error(`Error processing queued delete for ${table}:`, e);
          }
        }
      }
    }

    // 1. Profiles
    const profileStr = localStorage.getItem(`viyabaari_company_profile_${uid}`);
    if (profileStr) {
      const profile = JSON.parse(profileStr);
      await supabase.from('company_profiles').upsert({
        id: profile.id || uid,
        user_id: uid,
        name: profile.name,
        tamil_name: profile.tamilName,
        gstin: profile.gstin,
        phone: profile.phone,
        address: profile.address
      });
    }

    // 2. Weavers
    const weavers: Weaver[] = safeParse(localStorage.getItem(`viyabaari_weavers_${uid}`));
    if (weavers.length > 0) {
      await supabase.from('weavers').upsert(weavers.map(w => ({
        id: w.id,
        user_id: uid,
        name: w.name,
        phone: w.phone,
        created_at: w.createdAt
      })));
    }

    // 3. Warpers
    const warpers: Warper[] = safeParse(localStorage.getItem(`viyabaari_warpers_${uid}`));
    if (warpers.length > 0) {
      await supabase.from('warpers').upsert(warpers.map(w => ({
        id: w.id,
        user_id: uid,
        name: w.name,
        phone: w.phone,
        created_at: w.createdAt
      })));
    }

    // 4. Delivery Books
    const books: DeliveryBook[] = safeParse(localStorage.getItem(`viyabaari_delivery_books_${uid}`));
    if (books.length > 0) {
      await supabase.from('delivery_books').upsert(books.map(b => ({
        id: b.id,
        user_id: uid,
        name: b.name,
        created_at: b.createdAt
      })));
    }

    // 5. Suppliers
    const suppliers: YarnSupplier[] = safeParse(localStorage.getItem(`viyabaari_suppliers_${uid}`));
    if (suppliers.length > 0) {
      await supabase.from('suppliers').upsert(suppliers.map(s => ({
        id: s.id,
        user_id: uid,
        name: s.name,
        company_name: s.companyName,
        phone: s.phone,
        gst: s.gst,
        address: s.address,
        created_at: s.createdAt
      })));
    }

    // 6. Customers
    const customers: Customer[] = safeParse(localStorage.getItem(`viyabaari_customers_${uid}`));
    if (customers.length > 0) {
      await supabase.from('customers').upsert(customers.map(c => ({
        id: c.id,
        user_id: uid,
        name: c.name,
        phone: c.phone,
        address: c.address,
        notes: c.notes,
        created_at: c.createdAt
      })));
    }

    // 7. Denier Formulas
    const formulas: DenierFormula[] = safeParse(localStorage.getItem(`viyabaari_denier_formulas_${uid}`));
    if (formulas.length > 0) {
      await supabase.from('denier_formulas').upsert(formulas.map(f => ({
        id: f.id,
        user_id: uid,
        denier: f.denier,
        multiplier: f.multiplier
      })));
    }

    // 8. Stock Items & Variants & Sizes
    const stocks: StockItem[] = safeParse(localStorage.getItem(`viyabaari_stocks_${uid}`));
    if (stocks.length > 0) {
      await supabase.from('stock_items').upsert(stocks.map(stock => ({
        id: stock.id,
        user_id: uid,
        name: stock.name,
        category: stock.category,
        price: stock.price,
        last_updated: stock.lastUpdated
      })));

      const allVariants: any[] = [];
      const allSizes: any[] = [];
      const allHistories: any[] = [];

      stocks.forEach(stock => {
        if (stock.variants) {
          stock.variants.forEach(variant => {
            allVariants.push({
              id: variant.id,
              user_id: uid,
              stock_item_id: stock.id,
              image_url: variant.imageUrl
            });

            if (variant.sizeStocks) {
              variant.sizeStocks.forEach(size => {
                allSizes.push({
                  id: `${variant.id}_${size.size}_${size.color || 'none'}_${size.sleeve || 'none'}`,
                  user_id: uid,
                  variant_id: variant.id,
                  size: size.size,
                  quantity: size.quantity,
                  color: size.color,
                  sleeve: size.sleeve
                });
              });
            }
          });
        }
        if (stock.history) {
          stock.history.forEach((h, idx) => {
            allHistories.push({
              id: `${stock.id}_h_${h.date}_${idx}`,
              user_id: uid,
              stock_item_id: stock.id,
              date: h.date,
              action: h.action,
              description: h.description,
              change: h.change
            });
          });
        }
      });

      if (allVariants.length > 0) await supabase.from('stock_variants').upsert(allVariants);
      if (allSizes.length > 0) await supabase.from('size_stocks').upsert(allSizes);
      if (allHistories.length > 0) await supabase.from('stock_history').upsert(allHistories);
    }

    // 9. Transactions
    const txns: Transaction[] = safeParse(localStorage.getItem(`viyabaari_txns_${uid}`));
    if (txns.length > 0) {
      await supabase.from('transactions').upsert(txns.map(t => ({
        id: t.id,
        user_id: uid,
        type: t.type,
        amount: t.amount,
        category: t.category,
        party_name: t.partyName,
        description: t.description,
        date: t.date
      })));
    }

    // 10. Yarn Entries
    const yarnEntries: YarnEntry[] = safeParse(localStorage.getItem(`viyabaari_yarn_entries_${uid}`));
    if (yarnEntries.length > 0) {
      await supabase.from('yarn_entries').upsert(yarnEntries.map(y => ({
        id: y.id, user_id: uid, supplier_id: y.supplierId, yarn_category: y.yarnCategory, date: y.date, yarn_type: y.yarnType, weight_kg: y.weightKg, color: y.color, receipt_number: y.receiptNumber, created_at: y.createdAt
      })));
    }

    // 11. Yarn Dispatches
    const yarnDispatches: YarnDispatch[] = safeParse(localStorage.getItem(`viyabaari_yarn_dispatches_${uid}`));
    if (yarnDispatches.length > 0) {
      await supabase.from('yarn_dispatches').upsert(yarnDispatches.map(y => ({
        id: y.id, user_id: uid, date: y.date, recipient_type: y.recipientType, recipient_id: y.recipientId, yarn_category: y.yarnCategory, yarn_type: y.yarnType, color: y.color, weight_kg: y.weightKg, supplier_id: y.supplierId, supplier_name: y.supplierName, bill_number: y.billNumber, created_at: y.createdAt
      })));
    }

    // 12. Warp Orders & Sections
    const warpOrders: WarpOrder[] = safeParse(localStorage.getItem(`viyabaari_warp_orders_${uid}`));
    if (warpOrders.length > 0) {
      await supabase.from('warp_orders').upsert(warpOrders.map(order => ({
        id: order.id, user_id: uid, loom_id: (order.loomId === 'STOCK' || order.loomId === 'UNASSIGNED') ? null : order.loomId, weaver_id: (order.weaverId === 'STOCK' || order.weaverId === 'UNASSIGNED') ? null : order.weaverId, weaver_name: order.weaverName, loom_number: order.loomNumber, warper_id: order.warperId, design_name: order.designName, warp_yarn_type: order.warpYarnType, weft_yarn_type: order.weftYarnType, total_sarees_expected: order.totalSareesExpected, warp_length_meters: order.warpLengthMeters, total_yarn_weight: order.totalYarnWeight, status: order.status, order_number: order.orderNumber, order_type: order.orderType, wage: order.wage, wage_paid: order.wagePaid, saree_wage: order.sareeWage, zari_bobbins: order.zariBobbins, zari_ends_per_bobbin: order.zariEndsPerBobbin, zari_meters: order.zariMeters, zari_total_yarn_weight: order.zariTotalYarnWeight, zari_yarn_type: order.zariYarnType, zari_color: order.zariColor, top_warp_yarn_type: order.topWarpYarnType, top_warp_length_meters: order.topWarpLengthMeters, top_warp_total_yarn_weight: order.topWarpTotalYarnWeight, created_at: order.createdAt
      })));

      const allWarpSections: any[] = [];
      warpOrders.forEach(order => {
        if (order.sections) {
          order.sections.forEach((section, idx) => {
            allWarpSections.push({
              id: `${order.id}_sec_${idx.toString().padStart(3, '0')}`,
              user_id: uid,
              warp_order_id: order.id,
              name: section.name,
              ends: section.ends,
              color: section.color,
              weight_kg: section.weightKg
            });
          });
        }
        if (order.topWarpSections) {
          order.topWarpSections.forEach((section, idx) => {
            allWarpSections.push({
              id: `${order.id}_top_sec_${idx.toString().padStart(3, '0')}`,
              user_id: uid,
              warp_order_id: order.id,
              name: section.name,
              ends: section.ends,
              color: section.color,
              weight_kg: section.weightKg,
              section_type: 'TOP'
            });
          });
        }
      });
      if (allWarpSections.length > 0) await supabase.from('warp_order_sections').upsert(allWarpSections);
    }

    // 13. Warper Returns & Sections
    const warperReturns: WarperReturn[] = safeParse(localStorage.getItem(`viyabaari_warper_returns_${uid}`));
    if (warperReturns.length > 0) {
      await supabase.from('warper_returns').upsert(warperReturns.map(ret => ({
        id: ret.id, user_id: uid, warper_id: ret.warperId, date: ret.date, color: ret.color, weight_kg: ret.weightKg, yarn_type: ret.yarnType, weaver_id: (ret.weaverId === 'STOCK' || ret.weaverId === 'UNASSIGNED') ? null : ret.weaverId, weaver_name: ret.weaverName, ends: ret.ends, meters: ret.meters, zari_bobbins: ret.zariBobbins, zari_ends_per_bobbin: ret.zariEndsPerBobbin, zari_meters: ret.zariMeters, order_id: (ret.orderId === 'STOCK' || ret.orderId === 'UNASSIGNED') ? null : ret.orderId, order_number: ret.orderNumber, created_at: ret.createdAt
      })));

      const allReturnSections: any[] = [];
      warperReturns.forEach(ret => {
        if (ret.sections) {
          ret.sections.forEach((section, idx) => {
            allReturnSections.push({
              id: `${ret.id}_sec_${idx.toString().padStart(3, '0')}`,
              user_id: uid,
              warper_return_id: ret.id,
              name: section.name,
              color: section.color,
              ends: section.ends,
              weight_kg: section.weightKg
            });
          });
        }
      });
      if (allReturnSections.length > 0) await supabase.from('warper_return_sections').upsert(allReturnSections);
    }

    // 14. Looms & Sections
    const looms: Loom[] = safeParse(localStorage.getItem(`viyabaari_looms_${uid}`));
    if (looms.length > 0) {
      await supabase.from('looms').upsert(looms.map(loom => ({
        id: loom.id, user_id: uid, weaver_id: loom.weaverId, loom_number: loom.loomNumber, design_name: loom.designName, warp_yarn_type: loom.warpYarnType, weft_yarn_type: loom.weftYarnType, warp_type: loom.warpType, total_sarees_expected: loom.totalSareesExpected, warp_length_meters: loom.warpLengthMeters, total_yarn_weight: loom.totalYarnWeight, saree_wage: loom.sareeWage, zari_bobbins: loom.zariBobbins, zari_ends_per_bobbin: loom.zariEndsPerBobbin, zari_meters: loom.zariMeters, zari_total_yarn_weight: loom.zariTotalYarnWeight, zari_yarn_type: loom.zariYarnType, zari_color: loom.zariColor, top_warp_yarn_type: loom.topWarpYarnType, top_warp_length_meters: loom.topWarpLengthMeters, top_warp_total_yarn_weight: loom.topWarpTotalYarnWeight, created_at: loom.createdAt
      })));

      const allLoomSections: any[] = [];
      looms.forEach(loom => {
        if (loom.warpSections) {
          loom.warpSections.forEach((section, idx) => {
            allLoomSections.push({
              id: `${loom.id}_main_${idx.toString().padStart(3, '0')}`,
              user_id: uid,
              loom_id: loom.id,
              name: section.name,
              ends: section.ends,
              color: section.color,
              weight_kg: section.weightKg,
              section_type: 'MAIN'
            });
          });
        }
        if (loom.topWarpSections) {
          loom.topWarpSections.forEach((section, idx) => {
            allLoomSections.push({
              id: `${loom.id}_top_${idx.toString().padStart(3, '0')}`,
              user_id: uid,
              loom_id: loom.id,
              name: section.name,
              ends: section.ends,
              color: section.color,
              weight_kg: section.weightKg,
              section_type: 'TOP'
            });
          });
        }
      });
      if (allLoomSections.length > 0) await supabase.from('loom_warp_sections').upsert(allLoomSections);
    }

    // 15. Loom Transactions
    const loomTxns: LoomTransaction[] = safeParse(localStorage.getItem(`viyabaari_loom_txns_${uid}`));
    if (loomTxns.length > 0) {
      await supabase.from('loom_transactions').upsert(loomTxns.map(t => ({
        id: t.id,
        user_id: uid,
        loom_id: t.loomId,
        date: t.date,
        type: t.type,
        sarees_delivered: t.sareesDelivered,
        yarn_consumed: t.yarnConsumed,
        wage_paid: t.wagePaid,
        yarn_type: t.yarnType,
        yarn_color: t.yarnColor,
        yarn_given_weight: t.yarnGivenWeight,
        zari_katta_given: t.zariKattaGiven,
        created_at: t.createdAt
      })));
    }

    // 16. Purchases & Items
    const purchases: Purchase[] = safeParse(localStorage.getItem(`viyabaari_purchases_${uid}`));
    if (purchases.length > 0) {
      await supabase.from('purchases').upsert(purchases.map(p => ({
        id: p.id, user_id: uid, supplier_id: p.supplierId, date: p.date, bill_number: p.billNumber, total_amount: p.totalAmount, paid_amount: p.paidAmount, status: p.status, notes: p.notes, created_at: p.createdAt
      })));

      const allPurchaseItems: any[] = [];
      purchases.forEach(p => {
        if (p.items) {
          p.items.forEach((item, idx) => {
            allPurchaseItems.push({
              id: `${p.id}_item_${idx.toString().padStart(3, '0')}`,
              user_id: uid,
              purchase_id: p.id,
              yarn_type: item.yarnType,
              color: item.color,
              weight_kg: item.weightKg,
              rate_per_kg: item.ratePerKg,
              amount: item.amount,
              type: item.type,
              yarn_category: item.yarnCategory,
              name: item.name,
              quantity: item.quantity,
              rate: item.rate
            });
          });
        }
      });
      if (allPurchaseItems.length > 0) await supabase.from('purchase_items').upsert(allPurchaseItems);
    }

    // 17. Invoices & Items
    const invoices: Invoice[] = safeParse(localStorage.getItem(`viyabaari_invoices_${uid}`));
    if (invoices.length > 0) {
      await supabase.from('invoices').upsert(invoices.map(inv => ({
        id: inv.id, user_id: uid, customer_id: inv.customerId, date: inv.date, invoice_number: inv.invoiceNumber, total_amount: inv.totalAmount, paid_amount: inv.paidAmount, status: inv.status, notes: inv.notes, created_at: inv.createdAt
      })));

      const allInvoiceItems: any[] = [];
      invoices.forEach(inv => {
        if (inv.items) {
          inv.items.forEach(item => {
            allInvoiceItems.push({
              id: item.id || `${inv.id}_item_${Math.random().toString(36).substr(2, 9)}`,
              user_id: uid,
              invoice_id: inv.id,
              stock_id: item.stockId,
              variant_id: item.variantId,
              name: item.name,
              description: item.description,
              size: item.size,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount
            });
          });
        }
      });
      if (allInvoiceItems.length > 0) await supabase.from('invoice_items').upsert(allInvoiceItems);
    }

    // 18. Weaver Productions
    const productions: WeaverProduction[] = safeParse(localStorage.getItem(`viyabaari_weaver_productions_${uid}`));
    if (productions.length > 0) {
      await supabase.from('weaver_productions').upsert(productions.map(p => ({
        id: p.id,
        user_id: uid,
        weaver_id: p.weaverId,
        date: p.date,
        color: p.color,
        weight_kg: p.weightKg,
        saree_count: p.sareeCount,
        created_at: p.createdAt
      })));
    }

    // 19. Delivery Slips & Items
    const slips: DeliverySlip[] = safeParse(localStorage.getItem(`viyabaari_delivery_slips_${uid}`));
    if (slips.length > 0) {
      await supabase.from('delivery_slips').upsert(slips.map(s => ({
        id: s.id, user_id: uid, slip_number: s.slipNumber, date: s.date, recipient_type: s.recipientType, recipient_id: s.recipientId, created_at: s.createdAt
      })));

      const allSlipItems: any[] = [];
      slips.forEach(s => {
        if (s.items) {
          s.items.forEach(item => {
            allSlipItems.push({
              id: item.id || `${s.id}_item_${Math.random().toString(36).substr(2, 9)}`,
              user_id: uid,
              delivery_slip_id: s.id,
              yarn_type: item.yarnType,
              color: item.color,
              weight_kg: item.weightKg,
              count: item.count,
              amount: item.amount,
              yarn_category: item.yarnCategory
            });
          });
        }
      });
      if (allSlipItems.length > 0) await supabase.from('delivery_slip_items').upsert(allSlipItems);
    }

    // 20. Warp Designs & Sections
    const warpDesigns: WarpDesign[] = safeParse(localStorage.getItem(`viyabaari_warp_designs_${uid}`));
    if (warpDesigns.length > 0) {
      await supabase.from('warp_designs').upsert(warpDesigns.map(design => ({
        id: design.id, user_id: uid, name: design.name, warp_yarn_type: design.warpYarnType, weft_yarn_type: design.weftYarnType, warp_type: design.warpType, total_sarees_expected: design.totalSareesExpected, warp_length_meters: design.warpLengthMeters, total_yarn_weight: design.totalYarnWeight, zari_bobbins: design.zariBobbins, zari_ends_per_bobbin: design.zariEndsPerBobbin, zari_meters: design.zariMeters, zari_total_yarn_weight: design.zariTotalYarnWeight, zari_yarn_type: design.zariYarnType, zari_color: design.zariColor, warper_id: design.warperId, top_warp_yarn_type: design.topWarpYarnType, top_warp_length_meters: design.topWarpLengthMeters, top_warp_total_yarn_weight: design.topWarpTotalYarnWeight, created_at: design.createdAt
      })));

      const allDesignSections: any[] = [];
      warpDesigns.forEach(design => {
        if (design.sections) {
          design.sections.forEach((section, idx) => {
            allDesignSections.push({
              id: `${design.id}_main_${idx.toString().padStart(3, '0')}`,
              user_id: uid,
              warp_design_id: design.id,
              name: section.name,
              ends: section.ends,
              color: section.color,
              weight_kg: section.weightKg,
              section_type: 'MAIN'
            });
          });
        }
        if (design.topWarpSections) {
          design.topWarpSections.forEach((section, idx) => {
            allDesignSections.push({
              id: `${design.id}_top_${idx.toString().padStart(3, '0')}`,
              user_id: uid,
              warp_design_id: design.id,
              name: section.name,
              ends: section.ends,
              color: section.color,
              weight_kg: section.weightKg,
              section_type: 'TOP'
            });
          });
        }
      });
      if (allDesignSections.length > 0) await supabase.from('warp_design_sections').upsert(allDesignSections);
    }

    console.log("Supabase Sync Completed Successfully!");
  } catch (error) {
    console.error("Error syncing to Supabase:", error);
  }
};

// Fetch from Supabase while strictly honoring deleted items
export const fetchFromSupabase = async (uid: string | undefined) => {
  if (!uid || uid === 'guest') return;
  
  console.log("Fetching from Supabase for UID:", uid);
  try {
    const deletedMap = getDeletedIds(uid);
    const filterOutDeleted = (items: any[] | null, table: string) => {
      if (!items) return [];
      const deletedList = deletedMap[table] || [];
      return items.filter(item => !deletedList.includes(item.id));
    };

    // Profiles
    const { data: profiles } = await supabase.from('company_profiles').select('*').eq('user_id', uid).maybeSingle();
    if (profiles) {
      localStorage.setItem(`viyabaari_company_profile_${uid}`, JSON.stringify({
        id: profiles.id, name: profiles.name, tamilName: profiles.tamil_name, gstin: profiles.gstin, phone: profiles.phone, address: profiles.address
      }));
    }

    // Weavers
    const { data: rawWeavers } = await supabase.from('weavers').select('*').eq('user_id', uid);
    if (rawWeavers) {
      const weavers = filterOutDeleted(rawWeavers, 'weavers');
      localStorage.setItem(`viyabaari_weavers_${uid}`, JSON.stringify(weavers.map(w => ({
        id: w.id, name: w.name, phone: w.phone, createdAt: w.created_at
      }))));
    }

    // Warpers
    const { data: rawWarpers } = await supabase.from('warpers').select('*').eq('user_id', uid);
    if (rawWarpers) {
      const warpers = filterOutDeleted(rawWarpers, 'warpers');
      localStorage.setItem(`viyabaari_warpers_${uid}`, JSON.stringify(warpers.map(w => ({
        id: w.id, name: w.name, phone: w.phone, createdAt: w.created_at
      }))));
    }

    // Delivery Books
    const { data: rawBooks } = await supabase.from('delivery_books').select('*').eq('user_id', uid);
    if (rawBooks) {
      const books = filterOutDeleted(rawBooks, 'delivery_books');
      localStorage.setItem(`viyabaari_delivery_books_${uid}`, JSON.stringify(books.map(b => ({
        id: b.id, name: b.name, createdAt: b.created_at
      }))));
    }

    // Suppliers
    const { data: rawSuppliers } = await supabase.from('suppliers').select('*').eq('user_id', uid);
    if (rawSuppliers) {
      const suppliers = filterOutDeleted(rawSuppliers, 'suppliers');
      localStorage.setItem(`viyabaari_suppliers_${uid}`, JSON.stringify(suppliers.map(s => ({
        id: s.id, name: s.name, companyName: s.company_name, phone: s.phone, gst: s.gst, address: s.address, createdAt: s.created_at
      }))));
    }

    // Customers
    const { data: rawCustomers } = await supabase.from('customers').select('*').eq('user_id', uid);
    if (rawCustomers) {
      const customers = filterOutDeleted(rawCustomers, 'customers');
      localStorage.setItem(`viyabaari_customers_${uid}`, JSON.stringify(customers.map(c => ({
        id: c.id, name: c.name, phone: c.phone, address: c.address, notes: c.notes, createdAt: c.created_at
      }))));
    }

    // Denier Formulas
    const { data: rawFormulas } = await supabase.from('denier_formulas').select('*').eq('user_id', uid);
    if (rawFormulas) {
      const formulas = filterOutDeleted(rawFormulas, 'denier_formulas');
      localStorage.setItem(`viyabaari_denier_formulas_${uid}`, JSON.stringify(formulas.map(f => ({
        id: f.id, denier: f.denier, multiplier: f.multiplier
      }))));
    }

    // Stock Items, Variants, and Sizes
    const { data: rawStocks } = await supabase.from('stock_items').select('*').eq('user_id', uid);
    const { data: variants } = await supabase.from('stock_variants').select('*').eq('user_id', uid);
    const { data: sizeStocks } = await supabase.from('size_stocks').select('*').eq('user_id', uid);
    const { data: allHistories } = await supabase.from('stock_history').select('*').eq('user_id', uid);

    if (rawStocks) {
      const stocks = filterOutDeleted(rawStocks, 'stock_items');
      const reconstructedStocks = stocks.map(s => {
        const stockVariants = (variants || []).filter(v => v.stock_item_id === s.id).map(v => {
          const vSizes = (sizeStocks || []).filter(sz => sz.variant_id === v.id).map(sz => ({
            size: sz.size,
            quantity: sz.quantity,
            color: sz.color,
            sleeve: sz.sleeve
          }));
          return {
            id: v.id,
            imageUrl: v.image_url,
            sizeStocks: vSizes
          };
        });

        return {
          id: s.id,
          name: s.name,
          category: s.category,
          price: s.price,
          lastUpdated: s.last_updated,
          variants: stockVariants,
          history: (allHistories || [])
            .filter(h => h.stock_item_id === s.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(h => ({
              date: h.date,
              action: h.action,
              description: h.description,
              change: h.change
            }))
        };
      });
      localStorage.setItem(`viyabaari_stocks_${uid}`, JSON.stringify(reconstructedStocks));
    }

    // Transactions
    const { data: rawTxns } = await supabase.from('transactions').select('*').eq('user_id', uid);
    if (rawTxns) {
      const txns = filterOutDeleted(rawTxns, 'transactions');
      localStorage.setItem(`viyabaari_txns_${uid}`, JSON.stringify(txns.map(t => ({
        id: t.id, type: t.type, amount: t.amount, category: t.category, partyName: t.party_name, description: t.description, date: t.date
      }))));
    }

    // Yarn Entries
    const { data: rawYarnEntries } = await supabase.from('yarn_entries').select('*').eq('user_id', uid);
    if (rawYarnEntries) {
      const yarnEntries = filterOutDeleted(rawYarnEntries, 'yarn_entries');
      localStorage.setItem(`viyabaari_yarn_entries_${uid}`, JSON.stringify(yarnEntries.map(y => ({
        id: y.id, supplierId: y.supplier_id, yarnCategory: y.yarn_category, date: y.date, yarnType: y.yarn_type, weightKg: y.weight_kg, color: y.color, receiptNumber: y.receipt_number, createdAt: y.created_at
      }))));
    }

    // Yarn Dispatches
    const { data: rawYarnDispatches } = await supabase.from('yarn_dispatches').select('*').eq('user_id', uid);
    if (rawYarnDispatches) {
      const yarnDispatches = filterOutDeleted(rawYarnDispatches, 'yarn_dispatches');
      localStorage.setItem(`viyabaari_yarn_dispatches_${uid}`, JSON.stringify(yarnDispatches.map(y => ({
        id: y.id, date: y.date, recipientType: y.recipient_type, recipientId: y.recipient_id, yarnCategory: y.yarn_category, yarnType: y.yarn_type, color: y.color, weightKg: y.weight_kg, supplierId: y.supplier_id, supplierName: y.supplier_name, billNumber: y.bill_number, createdAt: y.created_at
      }))));
    }
    
    // Looms
    const { data: rawLooms } = await supabase.from('looms').select('*').eq('user_id', uid);
    const { data: loomSections } = await supabase.from('loom_warp_sections').select('*').eq('user_id', uid);
    if (rawLooms) {
      const looms = filterOutDeleted(rawLooms, 'looms');
      localStorage.setItem(`viyabaari_looms_${uid}`, JSON.stringify(looms.map(l => {
        const sections = (loomSections || [])
          .filter(s => s.loom_id === l.id && s.section_type !== 'TOP')
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(s => ({
            name: s.name, ends: s.ends, color: s.color, weightKg: s.weight_kg
          }));
        const topSections = (loomSections || [])
          .filter(s => s.loom_id === l.id && s.section_type === 'TOP')
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(s => ({
            name: s.name, ends: s.ends, color: s.color, weightKg: s.weight_kg
          }));
        return {
          id: l.id, weaverId: l.weaver_id, loomNumber: l.loom_number, designName: l.design_name, warpYarnType: l.warp_yarn_type, weftYarnType: l.weft_yarn_type, warpType: l.warp_type, totalSareesExpected: l.total_sarees_expected, warpLengthMeters: l.warp_length_meters, totalYarnWeight: l.total_yarn_weight, sareeWage: l.saree_wage, zariBobbins: l.zari_bobbins, zariEndsPerBobbin: l.zari_ends_per_bobbin, zariMeters: l.zari_meters, zariTotalYarnWeight: l.zari_total_yarn_weight, zariYarnType: l.zari_yarn_type, zariColor: l.zari_color, topWarpYarnType: l.top_warp_yarn_type, topWarpLengthMeters: l.top_warp_length_meters, topWarpTotalYarnWeight: l.top_warp_total_yarn_weight, createdAt: l.created_at, warpSections: sections, topWarpSections: topSections
        };
      })));
    }

    // Loom Transactions
    const { data: rawLoomTxns } = await supabase.from('loom_transactions').select('*').eq('user_id', uid);
    if (rawLoomTxns) {
      const loomTxns = filterOutDeleted(rawLoomTxns, 'loom_transactions');
      localStorage.setItem(`viyabaari_loom_txns_${uid}`, JSON.stringify(loomTxns.map(t => ({
        id: t.id, loomId: t.loom_id, date: t.date, type: t.type, sareesDelivered: t.sarees_delivered, yarnConsumed: t.yarn_consumed, wagePaid: t.wage_paid, yarnType: t.yarn_type, yarnColor: t.yarn_color, yarnGivenWeight: t.yarn_given_weight, zariKattaGiven: t.zari_katta_given, createdAt: t.created_at
      }))));
    }

    // Warp Orders
    const { data: rawWarpOrders } = await supabase.from('warp_orders').select('*').eq('user_id', uid);
    const { data: warpOrderSections } = await supabase.from('warp_order_sections').select('*').eq('user_id', uid);
    if (rawWarpOrders) {
      const warpOrders = filterOutDeleted(rawWarpOrders, 'warp_orders');
      localStorage.setItem(`viyabaari_warp_orders_${uid}`, JSON.stringify(warpOrders.map(o => {
        const sections = (warpOrderSections || [])
          .filter(s => s.warp_order_id === o.id && s.section_type !== 'TOP')
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(s => ({
            name: s.name, ends: s.ends, color: s.color, weightKg: s.weight_kg
          }));
        const topSections = (warpOrderSections || [])
          .filter(s => s.warp_order_id === o.id && s.section_type === 'TOP')
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(s => ({
            name: s.name, ends: s.ends, color: s.color, weightKg: s.weight_kg
          }));
        return {
          id: o.id, loomId: o.loom_id, weaverId: o.weaver_id, weaverName: o.weaver_name, loomNumber: o.loom_number, warperId: o.warper_id, designName: o.design_name, warpYarnType: o.warp_yarn_type, weftYarnType: o.weft_yarn_type, totalSareesExpected: o.total_sarees_expected, warpLengthMeters: o.warp_length_meters, totalYarnWeight: o.total_yarn_weight, status: o.status, orderNumber: o.order_number, orderType: o.order_type, wage: o.wage, wagePaid: o.wage_paid, sareeWage: o.saree_wage, zariBobbins: o.zari_bobbins, zariEndsPerBobbin: o.zari_ends_per_bobbin, zariMeters: o.zari_meters, zariTotalYarnWeight: o.zari_total_yarn_weight, zariYarnType: o.zari_yarn_type, zariColor: o.zari_color, topWarpYarnType: o.top_warp_yarn_type, topWarpLengthMeters: o.top_warp_length_meters, topWarpTotalYarnWeight: o.top_warp_total_yarn_weight, createdAt: o.created_at, sections: sections, topWarpSections: topSections
        };
      })));
    }

    // Warper Returns
    const { data: rawWarperReturns } = await supabase.from('warper_returns').select('*').eq('user_id', uid);
    const { data: warperReturnSections } = await supabase.from('warper_return_sections').select('*').eq('user_id', uid);
    if (rawWarperReturns) {
      const warperReturns = filterOutDeleted(rawWarperReturns, 'warper_returns');
      localStorage.setItem(`viyabaari_warper_returns_${uid}`, JSON.stringify(warperReturns.map(r => {
        const sections = (warperReturnSections || [])
          .filter(s => s.warper_return_id === r.id)
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(s => ({
            name: s.name, color: s.color, ends: s.ends, weightKg: s.weight_kg
          }));
        return {
          id: r.id, warperId: r.warper_id, date: r.date, color: r.color, weightKg: r.weight_kg, yarnType: r.yarn_type, weaverId: r.weaver_id, weaverName: r.weaver_name, ends: r.ends, meters: r.meters, zariBobbins: r.zari_bobbins, zariEndsPerBobbin: r.zari_ends_per_bobbin, zariMeters: r.zari_meters, orderId: r.order_id, orderNumber: r.order_number, createdAt: r.created_at, sections: sections
        };
      })));
    }

    // Purchases
    const { data: rawPurchases } = await supabase.from('purchases').select('*').eq('user_id', uid);
    const { data: purchaseItems } = await supabase.from('purchase_items').select('*').eq('user_id', uid);
    if (rawPurchases) {
      const purchases = filterOutDeleted(rawPurchases, 'purchases');
      localStorage.setItem(`viyabaari_purchases_${uid}`, JSON.stringify(purchases.map(p => {
        const items = (purchaseItems || []).filter(i => i.purchase_id === p.id).map(i => ({
          type: i.type,
          yarnCategory: i.yarn_category,
          yarnType: i.yarn_type,
          name: i.name,
          color: i.color,
          weightKg: i.weight_kg,
          quantity: i.quantity,
          rate: i.rate,
          ratePerKg: i.rate_per_kg,
          amount: i.amount
        }));
        return {
          id: p.id, supplierId: p.supplier_id, date: p.date, billNumber: p.bill_number, totalAmount: p.total_amount, paidAmount: p.paid_amount, status: p.status, notes: p.notes, createdAt: p.created_at, items: items
        };
      })));
    }

    // Invoices
    const { data: rawInvoices } = await supabase.from('invoices').select('*').eq('user_id', uid);
    const { data: invoiceItems } = await supabase.from('invoice_items').select('*').eq('user_id', uid);
    if (rawInvoices) {
      const invoices = filterOutDeleted(rawInvoices, 'invoices');
      localStorage.setItem(`viyabaari_invoices_${uid}`, JSON.stringify(invoices.map(inv => {
        const items = (invoiceItems || []).filter(i => i.invoice_id === inv.id).map(i => ({
          id: i.id, stockId: i.stock_id, variantId: i.variant_id, name: i.name, description: i.description, size: i.size, quantity: i.quantity, rate: i.rate, amount: i.amount
        }));
        return {
          id: inv.id, customerId: inv.customer_id, date: inv.date, invoiceNumber: inv.invoice_number, totalAmount: inv.total_amount, paidAmount: inv.paid_amount, status: inv.status, notes: inv.notes, createdAt: inv.createdAt, items: items
        };
      })));
    }

    // Weaver Productions
    const { data: rawProductions } = await supabase.from('weaver_productions').select('*').eq('user_id', uid);
    if (rawProductions) {
      const productions = filterOutDeleted(rawProductions, 'weaver_productions');
      localStorage.setItem(`viyabaari_weaver_productions_${uid}`, JSON.stringify(productions.map(p => ({
        id: p.id, weaverId: p.weaver_id, date: p.date, color: p.color, weightKg: p.weight_kg, sareeCount: p.saree_count, createdAt: p.created_at
      }))));
    }

    // Delivery Slips
    const { data: rawSlips } = await supabase.from('delivery_slips').select('*').eq('user_id', uid);
    const { data: slipItems } = await supabase.from('delivery_slip_items').select('*').eq('user_id', uid);
    if (rawSlips) {
      const slips = filterOutDeleted(rawSlips, 'delivery_slips');
      localStorage.setItem(`viyabaari_delivery_slips_${uid}`, JSON.stringify(slips.map(s => {
        const items = (slipItems || []).filter(i => i.delivery_slip_id === s.id).map(i => ({
          id: i.id, yarnType: i.yarn_type, color: i.color, weightKg: i.weight_kg, count: i.count, amount: i.amount, yarnCategory: i.yarn_category
        }));
        return {
          id: s.id, slipNumber: s.slip_number, date: s.date, recipientType: s.recipient_type, recipientId: s.recipient_id, createdAt: s.created_at, items: items
        };
      })));
    }

    // Warp Designs
    const { data: rawWarpDesigns } = await supabase.from('warp_designs').select('*').eq('user_id', uid);
    const { data: designSections } = await supabase.from('warp_design_sections').select('*').eq('user_id', uid);
    if (rawWarpDesigns) {
      const warpDesigns = filterOutDeleted(rawWarpDesigns, 'warp_designs');
      localStorage.setItem(`viyabaari_warp_designs_${uid}`, JSON.stringify(warpDesigns.map(d => {
        const sections = (designSections || [])
          .filter(s => s.warp_design_id === d.id && s.section_type !== 'TOP')
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(s => ({
            name: s.name, ends: s.ends, color: s.color, weightKg: s.weight_kg
          }));
        const topSections = (designSections || [])
          .filter(s => s.warp_design_id === d.id && s.section_type === 'TOP')
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(s => ({
            name: s.name, ends: s.ends, color: s.color, weightKg: s.weight_kg
          }));
        return {
          id: d.id, warperId: d.warper_id, name: d.name, warpYarnType: d.warp_yarn_type, weftYarnType: d.weft_yarn_type, warpType: d.warp_type, totalSareesExpected: d.total_sarees_expected, warpLengthMeters: d.warp_length_meters, totalYarnWeight: d.total_yarn_weight, zariBobbins: d.zari_bobbins, zariEndsPerBobbin: d.zari_ends_per_bobbin, zariMeters: d.zari_meters, zariTotalYarnWeight: d.zari_total_yarn_weight, zariYarnType: d.zari_yarn_type, zariColor: d.zari_color, topWarpYarnType: d.top_warp_yarn_type, topWarpLengthMeters: d.top_warp_length_meters, topWarpTotalYarnWeight: d.top_warp_total_yarn_weight, createdAt: d.created_at, sections: sections, topWarpSections: topSections
        };
      })));
    }

    console.log("Fetched from Supabase Successfully!");
    window.dispatchEvent(new Event('local-storage-update'));
  } catch (error) {
    console.error("Error fetching from Supabase:", error);
  }
};
