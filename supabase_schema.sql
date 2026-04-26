-- Supabase Schema for Viyabaari App
-- Run this in your Supabase SQL Editor

-- 1. Company Profiles
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  tamil_name TEXT,
  gstin TEXT,
  phone TEXT,
  address TEXT,
  UNIQUE(user_id)
);

-- 2. Weavers
CREATE TABLE IF NOT EXISTS weavers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at BIGINT
);

-- 3. Warpers
CREATE TABLE IF NOT EXISTS warpers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at BIGINT
);

-- 4. Delivery Books
CREATE TABLE IF NOT EXISTS delivery_books (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at BIGINT
);

-- 5. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  company_name TEXT,
  phone TEXT,
  gst TEXT,
  address TEXT,
  created_at BIGINT
);

-- 6. Customers
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at BIGINT
);

-- 7. Denier Formulas
CREATE TABLE IF NOT EXISTS denier_formulas (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  denier TEXT NOT NULL,
  multiplier DECIMAL
);

-- 8. Stock Items
CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  price DECIMAL,
  last_updated BIGINT
);

-- 9. Stock Variants
CREATE TABLE IF NOT EXISTS stock_variants (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_item_id TEXT REFERENCES stock_items(id) ON DELETE CASCADE,
  image_url TEXT
);

-- 10. Size Stocks
CREATE TABLE IF NOT EXISTS size_stocks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES stock_variants(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  color TEXT,
  sleeve TEXT
);

-- 11. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  category TEXT,
  party_name TEXT,
  description TEXT,
  date BIGINT
);

-- 12. Yarn Entries
CREATE TABLE IF NOT EXISTS yarn_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  yarn_category TEXT,
  date TEXT,
  yarn_type TEXT,
  weight_kg DECIMAL,
  color TEXT,
  receipt_number TEXT,
  created_at BIGINT
);

-- 13. Yarn Dispatches
CREATE TABLE IF NOT EXISTS yarn_dispatches (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT,
  recipient_type TEXT,
  recipient_id TEXT,
  yarn_category TEXT,
  yarn_type TEXT,
  color TEXT,
  weight_kg DECIMAL,
  supplier_id TEXT,
  supplier_name TEXT,
  bill_number TEXT,
  created_at BIGINT
);

-- 14. Warp Orders
CREATE TABLE IF NOT EXISTS warp_orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  loom_id TEXT,
  weaver_id TEXT REFERENCES weavers(id) ON DELETE SET NULL,
  weaver_name TEXT,
  loom_number TEXT,
  warper_id TEXT REFERENCES warpers(id) ON DELETE SET NULL,
  design_name TEXT,
  warp_yarn_type TEXT,
  weft_yarn_type TEXT,
  total_sarees_expected INTEGER,
  warp_length_meters DECIMAL,
  total_yarn_weight DECIMAL,
  status TEXT,
  order_number TEXT,
  order_type TEXT,
  wage DECIMAL,
  wage_paid DECIMAL,
  saree_wage DECIMAL,
  zari_bobbins INTEGER,
  zari_ends_per_bobbin INTEGER,
  zari_meters DECIMAL,
  zari_total_yarn_weight DECIMAL,
  zari_yarn_type TEXT,
  zari_color TEXT,
  top_warp_yarn_type TEXT,
  top_warp_length_meters DECIMAL,
  top_warp_total_yarn_weight DECIMAL,
  created_at BIGINT
);

-- 15. Warp Order Sections
CREATE TABLE IF NOT EXISTS warp_order_sections (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  warp_order_id TEXT REFERENCES warp_orders(id) ON DELETE CASCADE,
  name TEXT,
  ends INTEGER,
  color TEXT,
  weight_kg DECIMAL
);

-- 16. Warper Returns
CREATE TABLE IF NOT EXISTS warper_returns (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  warper_id TEXT REFERENCES warpers(id) ON DELETE SET NULL,
  date TEXT,
  color TEXT,
  weight_kg DECIMAL,
  yarn_type TEXT,
  weaver_id TEXT,
  weaver_name TEXT,
  ends INTEGER,
  meters DECIMAL,
  zari_bobbins INTEGER,
  zari_ends_per_bobbin INTEGER,
  zari_meters DECIMAL,
  order_id TEXT,
  order_number TEXT,
  created_at BIGINT
);

-- 17. Warper Return Sections
CREATE TABLE IF NOT EXISTS warper_return_sections (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  warper_return_id TEXT REFERENCES warper_returns(id) ON DELETE CASCADE,
  name TEXT,
  color TEXT,
  ends INTEGER,
  weight_kg DECIMAL
);

-- 18. Looms
CREATE TABLE IF NOT EXISTS looms (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  weaver_id TEXT REFERENCES weavers(id) ON DELETE CASCADE,
  loom_number TEXT,
  design_name TEXT,
  warp_yarn_type TEXT,
  weft_yarn_type TEXT,
  warp_type TEXT,
  total_sarees_expected INTEGER,
  warp_length_meters DECIMAL,
  total_yarn_weight DECIMAL,
  saree_wage DECIMAL,
  zari_bobbins INTEGER,
  zari_ends_per_bobbin INTEGER,
  zari_meters DECIMAL,
  zari_total_yarn_weight DECIMAL,
  zari_yarn_type TEXT,
  zari_color TEXT,
  warper_id TEXT REFERENCES warpers(id) ON DELETE SET NULL,
  top_warp_yarn_type TEXT,
  top_warp_length_meters DECIMAL,
  top_warp_total_yarn_weight DECIMAL,
  created_at BIGINT
);

-- 19. Loom Warp Sections
CREATE TABLE IF NOT EXISTS loom_warp_sections (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  loom_id TEXT REFERENCES looms(id) ON DELETE CASCADE,
  name TEXT,
  ends INTEGER,
  color TEXT,
  weight_kg DECIMAL,
  section_type TEXT -- 'MAIN' or 'TOP'
);

-- 20. Loom Transactions
CREATE TABLE IF NOT EXISTS loom_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  loom_id TEXT REFERENCES looms(id) ON DELETE CASCADE,
  date TEXT,
  type TEXT,
  sarees_delivered INTEGER,
  yarn_consumed DECIMAL,
  wage_paid DECIMAL,
  yarn_type TEXT,
  yarn_color TEXT,
  yarn_given_weight DECIMAL,
  zari_katta_given INTEGER,
  created_at BIGINT
);

-- 21. Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  date TEXT,
  bill_number TEXT,
  total_amount DECIMAL,
  paid_amount DECIMAL,
  status TEXT,
  notes TEXT,
  created_at BIGINT
);

-- 22. Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id TEXT REFERENCES purchases(id) ON DELETE CASCADE,
  yarn_type TEXT,
  color TEXT,
  weight_kg DECIMAL,
  rate_per_kg DECIMAL,
  amount DECIMAL
);

-- 23. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  date TEXT,
  invoice_number TEXT,
  total_amount DECIMAL,
  paid_amount DECIMAL,
  status TEXT,
  notes TEXT,
  created_at BIGINT
);

-- 24. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT,
  quantity INTEGER,
  rate DECIMAL,
  amount DECIMAL
);

-- 25. Weaver Productions
CREATE TABLE IF NOT EXISTS weaver_productions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  weaver_id TEXT REFERENCES weavers(id) ON DELETE CASCADE,
  date TEXT,
  color TEXT,
  weight_kg DECIMAL,
  saree_count INTEGER,
  created_at BIGINT
);

-- 26. Delivery Slips
CREATE TABLE IF NOT EXISTS delivery_slips (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slip_number INTEGER,
  date TEXT,
  recipient_type TEXT,
  recipient_id TEXT,
  created_at BIGINT
);

-- 27. Delivery Slip Items
CREATE TABLE IF NOT EXISTS delivery_slip_items (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  delivery_slip_id TEXT REFERENCES delivery_slips(id) ON DELETE CASCADE,
  yarn_type TEXT,
  color TEXT,
  weight_kg DECIMAL,
  count INTEGER,
  amount DECIMAL,
  yarn_category TEXT
);

-- 28. Warp Designs (NEW)
CREATE TABLE IF NOT EXISTS warp_designs (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  warp_yarn_type TEXT,
  weft_yarn_type TEXT,
  warp_type TEXT,
  total_sarees_expected INTEGER,
  warp_length_meters DECIMAL,
  total_yarn_weight DECIMAL,
  zari_bobbins INTEGER,
  zari_ends_per_bobbin INTEGER,
  zari_meters DECIMAL,
  zari_total_yarn_weight DECIMAL,
  zari_yarn_type TEXT,
  zari_color TEXT,
  warper_id TEXT REFERENCES warpers(id) ON DELETE SET NULL,
  top_warp_yarn_type TEXT,
  top_warp_length_meters DECIMAL,
  top_warp_total_yarn_weight DECIMAL,
  created_at BIGINT
);

-- 29. Warp Design Sections (NEW)
CREATE TABLE IF NOT EXISTS warp_design_sections (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  warp_design_id TEXT REFERENCES warp_designs(id) ON DELETE CASCADE,
  name TEXT,
  ends INTEGER,
  color TEXT,
  weight_kg DECIMAL,
  section_type TEXT -- 'MAIN' or 'TOP'
);

-- Enable Row Level Security (RLS) on all tables
DO $$
DECLARE
    row RECORD;
BEGIN
    FOR row IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(row.tablename) || ' ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS "User can access their own data" ON public.' || quote_ident(row.tablename) || ';';
        EXECUTE 'CREATE POLICY "User can access their own data" ON public.' || quote_ident(row.tablename) || 
                ' FOR ALL USING (auth.uid() = user_id);';
    END LOOP;
END $$;
