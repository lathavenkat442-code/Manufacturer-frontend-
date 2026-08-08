
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface SizeStock {
  size: string;
  quantity: number;
  color?: string; // New: For Saree/Dhoti Combo
  sleeve?: string; // New: For Dhoti Combo (Full/Half)
}

export interface StockVariant {
  id: string;
  imageUrl: string;
  sizeStocks: SizeStock[];
}

export interface StockHistory {
  date: number;
  action: 'CREATED' | 'UPDATED' | 'PRICE_CHANGE' | 'STOCK_CHANGE';
  description: string;
  change?: string;
}

export interface StockItem {
  id: string;
  name: string;
  // Deprecated fields kept for migration safety, but UI will use variants
  imageUrl?: string; 
  moreImages?: string[]; 
  
  category: string;
  variants: StockVariant[]; // New: Each image has its own stock
  price: number;
  lastUpdated: number;
  history?: StockHistory[]; // New: Track price and stock changes
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  partyName?: string; // New: Customer or Dealer Name for Ledger
  description: string;
  date: number;
}

export type BackupFrequency = 'daily' | 'weekly' | 'monthly' | 'never';

export interface Weaver {
  id: string;
  name: string;
  phone?: string;
  createdAt: number;
}

export interface Warper {
  id: string;
  name: string;
  phone?: string;
  createdAt: number;
}

export interface DeliveryBook {
  id: string;
  name: string;
  createdAt: number;
}

export interface YarnSupplier {
  id: string;
  name: string;
  companyName: string;
  phone?: string;
  gst?: string;
  address?: string;
  createdAt: number;
}

export interface YarnEntry {
  id: string;
  supplierId: string;
  yarnCategory: 'warp' | 'weft' | 'zari' | 'other';
  date: string;
  yarnType: string;
  weightKg: number;
  color: string;
  receiptNumber: string;
  createdAt: number;
}

export interface YarnDispatch {
  id: string;
  date: string;
  recipientType: 'warper' | 'weaver';
  recipientId: string;
  yarnCategory: 'warp' | 'weft' | 'zari' | 'other';
  yarnType: string;
  color: string;
  weightKg: number;
  supplierId?: string;
  supplierName?: string;
  billNumber?: string;
  items?: { yarnType: string; color: string; weightKg: number }[];
  createdAt: number;
}

export interface WarperReturn {
  id: string;
  warperId: string;
  date: string;
  color: string;
  weightKg: number;
  yarnType?: string; // Denier
  weaverId?: string;
  weaverName?: string;
  ends?: number;
  meters?: number;
  length?: number;
  zariBobbins?: number; // New: Number of Zari Bobbins
  zariEndsPerBobbin?: number; // New: Ends per Zari Bobbin
  zariMeters?: number; // New: Meters per Zari Bobbin
  createdAt: number;
  orderId?: string;
  orderNumber?: string;
  sections?: {
    name: string;
    color: string;
    ends: number;
    weightKg: number;
  }[];
}

export interface DenierFormula {
  id: string;
  denier: string;
  multiplier: number; // kg per end
}

export interface WeaverProduction {
  id: string;
  weaverId: string;
  date: string;
  color: string;
  weightKg: number;
  sareeCount?: number;
  createdAt: number;
}

export type WarpType = 'plain' | 'border' | 'design' | 'MAIN_WARP' | 'TOP_WARP' | 'ZARI_BOBBIN';

export interface WarpSection {
  name: string;
  ends: number;
  color: string;
  weightKg?: number;
}

export interface Loom {
  id: string;
  weaverId: string;
  loomNumber: string;
  designName: string;
  warpYarnType?: string;
  weftYarnType?: string;
  warpType?: WarpType;
  warpSections?: WarpSection[];
  topWarpYarnType?: string;
  topWarpLengthMeters?: number;
  topWarpTotalYarnWeight?: number;
  topWarpSections?: WarpSection[];
  borderEnds?: number; // Deprecated
  bodyEnds?: number; // Deprecated
  totalSareesExpected?: number;
  warpLengthMeters?: number;
  totalYarnWeight?: number;
  sareeWage?: number;
  zariBobbins?: number; // New: Number of Zari Bobbins
  zariEndsPerBobbin?: number; // New: Ends per Zari Bobbin
  zariMeters?: number; // New: Meters per Zari Bobbin
  zariTotalYarnWeight?: number; // New: Total weight of Zari
  zariYarnType?: string; // New: Zari Denier
  zariColor?: string; // New: Zari Color
  createdAt: number;
}

export interface LoomTransaction {
  id: string;
  loomId: string;
  warpOrderId?: string;
  date: string;
  type?: 'YARN_GIVEN' | 'SAREE_RECEIVED';
  sareesDelivered?: number;
  yarnConsumed?: number;
  wagePaid?: number;
  yarnType?: string;
  yarnColor?: string;
  yarnGivenWeight?: number;
  yarnItems?: { color: string; weight: number }[];
  zariKattaGiven?: number; // New: Zari Katta Given
  createdAt: number;
}

export interface WarpOrder {
  id: string;
  loomId: string;
  weaverId: string;
  weaverName: string;
  loomNumber: string;
  warperId: string;
  designName: string;
  warpYarnType: string;
  weftYarnType: string;
  sections: WarpSection[];
  totalSareesExpected: number;
  warpLengthMeters?: number;
  totalYarnWeight: number;
  status: 'PENDING' | 'WARP_COMPLETED' | 'COMPLETED';
  completedAt?: number;
  createdAt: number;
  orderNumber?: string;
  wage?: number;
  wagePaid?: number;
  sareeWage?: number;
  zariBobbins?: number;
  zariEndsPerBobbin?: number;
  zariMeters?: number;
  zariTotalYarnWeight?: number;
  zariYarnType?: string;
  zariColor?: string;
  topWarpYarnType?: string;
  topWarpLengthMeters?: number;
  topWarpTotalYarnWeight?: number;
  topWarpSections?: WarpSection[];
  orderType?: 'MAIN_WARP' | 'TOP_WARP' | 'ZARI_BOBBIN';
}

export interface WarpDesign {
  id: string;
  warperId?: string; // Add this
  name: string;
  warpYarnType: string;
  weftYarnType: string;
  warpType?: WarpType;
  sections: WarpSection[];
  totalSareesExpected: number;
  warpLengthMeters?: number;
  totalYarnWeight: number;
  zariBobbins?: number;
  zariEndsPerBobbin?: number;
  zariMeters?: number;
  zariTotalYarnWeight?: number;
  zariYarnType?: string;
  zariColor?: string;
  topWarpYarnType?: string;
  topWarpLengthMeters?: number;
  topWarpTotalYarnWeight?: number;
  topWarpSections?: WarpSection[];
  createdAt: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  gst?: string;
  address?: string;
  createdAt: number;
}

export interface PurchaseItem {
  type: 'YARN' | 'ZARI' | 'OTHER';
  yarnCategory?: 'warp' | 'weft' | 'zari' | 'other';
  yarnType?: string;
  name: string;
  color?: string;
  weightKg?: number;
  quantity?: number;
  rate: number;
  ratePerKg?: number;
  amount: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  date: string;
  billNumber?: string;
  items: PurchaseItem[];
  totalAmount: number;
  paidAmount: number;
  status?: string;
  notes?: string;
  createdAt: number;
}

export interface User {
  uid?: string; // Added for Supabase Auth ID
  email: string;
  name: string;
  avatar?: string; // Base64 or URL
  mobile?: string; // Added mobile number
  address?: string; // Added address
  isLoggedIn: boolean;
  // Removed password field for security. Passwords should never be stored in frontend state/types.
  lastBackupDate?: number;
  backupFrequency?: BackupFrequency;
  backupEmail?: string;
  includePhotosInBackup?: boolean;
}

export interface CompanyProfile {
  name: string;
  tamilName: string;
  gstin: string;
  phone: string;
  address: string;
}

export interface DeliverySlipItem {
  id: string;
  yarnType: string;
  color: string;
  weightKg: number;
  count?: number;
  amount?: number;
  yarnCategory: 'warp' | 'weft' | 'zari';
}

export interface DeliverySlip {
  id: string;
  slipNumber: number;
  date: string;
  recipientType: 'warper' | 'weaver';
  recipientId: string;
  items: DeliverySlipItem[];
  createdAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: number;
}

export interface CustomerPurchase {
  id: string;
  customerId: string;
  date: string;
  items: string;
  amount: number;
  paid: number;
  createdAt: number;
}

export interface InvoiceItem {
  id: string;
  stockId: string;
  variantId: string;
  name: string;
  description?: string;
  size: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  totalAmount?: number;
  paidAmount: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  notes?: string;
  createdAt: number;
}

export interface AppState {
  stocks: StockItem[];
  transactions: Transaction[];
  user: User | null;
}
