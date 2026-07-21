-- ==========================================================
-- Supabase PostgreSQL Schema & Seed Data
-- E-Commerce CRM for Nigerian & Pan-African Merchants
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('Draft', 'Pending', 'Awaiting', 'Scheduled', 'Delivered', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('Unpaid', 'Paid', 'Refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('COD', 'Paid Online');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE stock_movement_type AS ENUM ('restock', 'sale', 'order_cancelled_release', 'manual_adjustment', 'return');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE upsell_source AS ENUM ('form_bump', 'confirmation_call', 'post_delivery_sms', 'post_delivery_email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'confirmation_staff', 'logistics');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 2. TABLES & MIGRATION ALTERS

-- Stores / Merchants
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) DEFAULT 'Nigeria',
    currency VARCHAR(10) DEFAULT 'NGN',
    default_delivery_fee NUMERIC(12, 2) DEFAULT 2000.00,
    category VARCHAR(100) DEFAULT 'Kitchen Wares & Gadgets',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users & Staff
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT 'password123',
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'owner',
    store_name VARCHAR(255) DEFAULT 'OliStores Nigeria',
    country VARCHAR(100) DEFAULT 'Nigeria',
    currency VARCHAR(10) DEFAULT 'NGN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alter users table in case it existed before
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT 'password123';
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_name VARCHAR(255) DEFAULT 'OliStores Nigeria';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Nigeria';
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'NGN';

-- Categories
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alter product_categories table in case it existed before
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Products (with Olistores cost price, bundles, country, variations)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    category_name VARCHAR(255) DEFAULT 'kitchen wares',
    country VARCHAR(100) DEFAULT 'Nigeria',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sku VARCHAR(100) UNIQUE NOT NULL,
    variation_1 VARCHAR(100) DEFAULT '',
    variation_2 VARCHAR(100) DEFAULT '',
    price_bundles JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    available_stock INT DEFAULT 100,
    has_variants BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alter products table in case it existed before
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_name VARCHAR(255) DEFAULT 'kitchen wares';
ALTER TABLE products ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Nigeria';
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS variation_1 VARCHAR(100) DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS variation_2 VARCHAR(100) DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_bundles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS available_stock INT DEFAULT 100;

-- Stock Movements (Append-Only Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    movement_type stock_movement_type NOT NULL,
    quantity_delta INT NOT NULL,
    related_order_id UUID,
    note TEXT,
    created_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Embeddable Forms (with Olistores customization settings)
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    linked_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    embed_key VARCHAR(100) UNIQUE NOT NULL,
    header_text VARCHAR(255) DEFAULT 'Please Fill The Form Below To Place Your Order',
    subheader_text VARCHAR(255) DEFAULT 'Only Serious Buyers Should Fill The Form Below',
    button_text VARCHAR(100) DEFAULT 'ORDER NOW',
    button_bg_color VARCHAR(50) DEFAULT '#4f46e5',
    button_text_color VARCHAR(50) DEFAULT '#ffffff',
    form_bg_color VARCHAR(50) DEFAULT '#0f172a',
    show_country_code VARCHAR(10) DEFAULT 'Yes',
    payment_cod_enabled BOOLEAN DEFAULT TRUE,
    payment_paystack_enabled BOOLEAN DEFAULT FALSE,
    payment_flutterwave_enabled BOOLEAN DEFAULT FALSE,
    payment_bank_enabled BOOLEAN DEFAULT FALSE,
    notification_email VARCHAR(255) DEFAULT 'merchant@gmail.com',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE forms ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS header_text VARCHAR(255) DEFAULT 'Please Fill The Form Below To Place Your Order';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS subheader_text VARCHAR(255) DEFAULT 'Only Serious Buyers Should Fill The Form Below';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS button_text VARCHAR(100) DEFAULT 'ORDER NOW';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS button_bg_color VARCHAR(50) DEFAULT '#4f46e5';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS button_text_color VARCHAR(50) DEFAULT '#ffffff';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS form_bg_color VARCHAR(50) DEFAULT '#0f172a';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS show_country_code VARCHAR(10) DEFAULT 'Yes';
ALTER TABLE forms ADD COLUMN IF NOT EXISTS payment_cod_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS payment_paystack_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS payment_flutterwave_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS payment_bank_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE forms ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255) DEFAULT 'merchant@gmail.com';

-- Orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    delivery_address TEXT NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Nigeria',
    state VARCHAR(100) NOT NULL DEFAULT 'Lagos',
    city VARCHAR(100),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status order_status NOT NULL DEFAULT 'Draft',
    payment_method payment_method NOT NULL DEFAULT 'COD',
    payment_status payment_status NOT NULL DEFAULT 'Unpaid',
    source VARCHAR(255),
    assigned_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmation_call_notes TEXT,
    upsell_source upsell_source,
    resume_token VARCHAR(255),
    is_duplicate_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price_at_time_of_order NUMERIC(12, 2) NOT NULL,
    is_upsell BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Expenses & Accounting
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Advertising',
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- State Delivery Fees
CREATE TABLE IF NOT EXISTS delivery_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    fee NUMERIC(12, 2) NOT NULL DEFAULT 2000.00,
    UNIQUE(country, state)
);


-- 3. VIEWS FOR DASHBOARD & REVENUE ANALYTICS

DROP VIEW IF EXISTS view_stock_summary CASCADE;
DROP VIEW IF EXISTS view_dashboard_summary CASCADE;

-- Stock Summary View
CREATE VIEW view_stock_summary AS
SELECT 
    p.id AS product_id,
    p.name AS product_name,
    p.sku,
    p.available_stock
FROM products p;

-- Revenue vs Order Summary View
CREATE VIEW view_dashboard_summary AS
SELECT 
    COUNT(CASE WHEN status != 'Draft' AND status != 'Cancelled' THEN 1 END) AS total_orders_count,
    COALESCE(SUM(CASE WHEN status != 'Draft' AND status != 'Cancelled' THEN total_amount ELSE 0 END), 0) AS total_order_amount,
    COALESCE(SUM(CASE WHEN status = 'Delivered' THEN total_amount ELSE 0 END), 0) AS delivered_revenue,
    COALESCE(SUM(CASE WHEN status IN ('Awaiting', 'Scheduled') THEN total_amount ELSE 0 END), 0) AS expected_revenue,
    COUNT(CASE WHEN status = 'Delivered' THEN 1 END) AS delivered_orders_count,
    COUNT(CASE WHEN status = 'Pending' THEN 1 END) AS pending_orders_count,
    COUNT(CASE WHEN status = 'Awaiting' THEN 1 END) AS awaiting_orders_count,
    COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) AS scheduled_orders_count,
    COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) AS cancelled_orders_count,
    COUNT(CASE WHEN status = 'Draft' THEN 1 END) AS draft_orders_count
FROM orders;


-- 4. SEED DATA (Demo Accounts & Olistores Sample Data)

-- Seed Demo Merchant Store
INSERT INTO stores (id, name, country, currency, default_delivery_fee, category) VALUES
('00000000-0000-0000-0000-000000000001', 'OliStores Nigeria', 'Nigeria', 'NGN', 2000.00, 'Kitchen Wares & Gadgets')
ON CONFLICT (id) DO NOTHING;

-- Seed Demo Users & Accounts
INSERT INTO users (id, store_id, full_name, email, password_hash, phone, role, store_name, country, currency) VALUES
('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Amina Bello', 'owner@merchant.ng', 'password123', '+2348031234567', 'owner', 'OliStores Nigeria', 'Nigeria', 'NGN'),
('a2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Chidi Okafor', 'chidi@merchant.ng', 'password123', '+2348029876543', 'confirmation_staff', 'OliStores Nigeria', 'Nigeria', 'NGN'),
('a3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Babajide Adeleke', 'logistics@merchant.ng', 'password123', '+2348051112223', 'logistics', 'OliStores Nigeria', 'Nigeria', 'NGN')
ON CONFLICT (email) DO NOTHING;

-- Seed Categories
INSERT INTO product_categories (id, store_id, name) VALUES
('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Kitchen Wares & Dining'),
('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Household Gadgets & Cleaning'),
('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Health & Personal Care')
ON CONFLICT (id) DO NOTHING;

-- Seed Olistores Products
INSERT INTO products (id, store_id, category_id, category_name, country, name, description, cost_price, base_price, sku, price_bundles, available_stock) VALUES
('22000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'kitchen wares', 'Nigeria', 'POT LID HOLDER', 'Adjustable kitchen pot lid rack & organizer', 3000.00, 18500.00, 'POT-LID-HOLDER', '[{"qty":1,"label":"1 POT LID HOLDER + Free Delivery","price":18500},{"qty":2,"label":"2 POT LID HOLDER + Free Delivery","price":35500},{"qty":3,"label":"3 POT LID HOLDER + Free Delivery","price":52500}]'::jsonb, 0),
('22000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'household gadgets', 'Nigeria', 'ROD HOLDER', 'Wall mounted adhesive curtain rod bracket', 1000.00, 18500.00, 'ROD-HOLDER', '[{"qty":4,"label":"4 ROD HOLDER + Free Delivery","price":18500},{"qty":8,"label":"8 ROD HOLDER + Free Delivery","price":34500},{"qty":12,"label":"12 ROD HOLDER + Free Delivery","price":48500}]'::jsonb, 0),
('22000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'kitchen wares', 'Nigeria', 'Luxury Food Warmer', 'Stainless steel thermal serving dish container set', 310000.00, 525500.00, 'LUX-FOOD-WARMER', '[{"qty":1,"label":"1 set of Luxury Food Warmer","price":525500},{"qty":2,"label":"2 sets of Luxury Food Warmer","price":1025000}]'::jsonb, 0),
('22000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 'household gadgets', 'Nigeria', 'Luxe carry', 'Foldable shopping bag & storage tote cart', 15000.00, 48500.00, 'LUXE-CARRY', '[{"qty":1,"label":"1 Luxe carry + Free Delivery","price":48500},{"qty":2,"label":"2 Luxe carry + Free Delivery","price":97500}]'::jsonb, 50)
ON CONFLICT (id) DO NOTHING;

-- Seed Embeddable Forms
INSERT INTO forms (id, store_id, name, linked_product_id, embed_key, header_text, subheader_text, button_text, button_bg_color) VALUES
('33000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Lunchbox Landing Page Form', '22000000-0000-0000-0000-000000000001', 'EMBED-LUNCHBOX-2026', 'Please Fill The Form Below To Place Your Order', 'Only Serious Buyers Should Fill The Form Below', 'ORDER NOW', '#4f46e5'),
('33000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Spin Mop Promo Form', '22000000-0000-0000-0000-000000000002', 'EMBED-SPINMOP-2026', 'Order Your Rechargeable Spin Mop Today', 'Free Delivery & Pay On Delivery Nationwide', 'COMPLETE MY ORDER NOW', '#10b981')
ON CONFLICT (id) DO NOTHING;

-- Seed Orders Across Pipeline
INSERT INTO orders (id, store_id, order_number, customer_name, customer_phone, customer_email, delivery_address, country, state, subtotal, delivery_fee, total_amount, status, payment_method, payment_status, source, created_at) VALUES
('44000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'OLI-10001', 'Emeka Nwosu', '+2348039988776', 'emeka@gmail.com', '14 Admiralty Way, Lekki Phase 1', 'Nigeria', 'Lagos', 18500.00, 2000.00, 20500.00, 'Delivered', 'COD', 'Paid', 'form:EMBED-LUNCHBOX-2026', NOW() - INTERVAL '3 days'),
('44000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'OLI-10002', 'Fatima Abubakar', '+2348021122334', 'fatima@yahoo.com', 'Plot 402 Maitama District', 'Nigeria', 'Abuja (FCT)', 28000.00, 2500.00, 30500.00, 'Delivered', 'COD', 'Paid', 'form:EMBED-SPINMOP-2026', NOW() - INTERVAL '4 days'),
('44000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'OLI-10003', 'Kwame Mensah', '+233244123456', 'kwame@ghana.com', '22 Ring Road Central, Accra', 'Ghana', 'Greater Accra', 22500.00, 3000.00, 25500.00, 'Scheduled', 'COD', 'Unpaid', 'form:EMBED-LUNCHBOX-2026', NOW() - INTERVAL '1 day'),
('44000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'OLI-10004', 'Yetunde Sowande', '+2348056677889', 'yetunde@gmail.com', '5 Ring Road, Ibadan', 'Nigeria', 'Oyo', 18500.00, 2000.00, 20500.00, 'Awaiting', 'COD', 'Unpaid', 'form:EMBED-LUNCHBOX-2026', NOW() - INTERVAL '6 hours'),
('44000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'OLI-10005', 'Njabulo Dlamini', '+27821234567', 'njabulo@joburg.co.za', '88 Sandton Drive, Johannesburg', 'South Africa', 'Gauteng', 28000.00, 4000.00, 32000.00, 'Pending', 'COD', 'Unpaid', 'form:EMBED-SPINMOP-2026', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- Seed Order Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price_at_time_of_order) VALUES
('44000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 1, 18500.00),
('44000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 1, 28000.00),
('44000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-000000000003', 1, 22500.00),
('44000000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-000000000001', 1, 18500.00),
('44000000-0000-0000-0000-000000000005', '22000000-0000-0000-0000-000000000002', 1, 28000.00);

-- Seed Expenses
INSERT INTO expenses (id, store_id, title, category, amount, expense_date) VALUES
('55000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Facebook Ads - Lunchbox Campaign', 'Advertising', 45000.00, CURRENT_DATE - INTERVAL '1 day'),
('55000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Speedaf Logistics Dispatch Fees', 'Logistics', 18000.00, CURRENT_DATE),
('55000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Custom Printed Packaging Boxes', 'Packaging', 25000.00, CURRENT_DATE - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;
