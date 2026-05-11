-- ============================================================
-- Supabase PostgreSQL Schema for eCommerce Platform
-- Migrated from MongoDB (Mongoose) schemas
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Collections ─────────────────────────────────────────────
CREATE TABLE collections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  url_name TEXT UNIQUE,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_collections_sort ON collections(sort_order, created_at DESC);

-- ── Products ────────────────────────────────────────────────
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT DEFAULT '',
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(10,2),
  image_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft')),
  quantity INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_products_active_status ON products(active, status);
CREATE INDEX idx_products_handle ON products(handle);
CREATE INDEX idx_products_sort ON products(sort_order, created_at DESC);

-- ── Product Images ──────────────────────────────────────────
CREATE TABLE product_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INT DEFAULT 0
);

CREATE INDEX idx_product_images_product ON product_images(product_id);

-- ── Product ↔ Collection (Many-to-Many) ─────────────────────
CREATE TABLE product_collections (
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, collection_id)
);

CREATE INDEX idx_product_collections_collection ON product_collections(collection_id);
CREATE INDEX idx_product_collections_product ON product_collections(product_id);

-- ── Collection Product Order ────────────────────────────────
CREATE TABLE collection_product_order (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

-- ── Product Options (Option Groups) ─────────────────────────
CREATE TABLE product_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required BOOLEAN DEFAULT false,
  position INT DEFAULT 0
);

CREATE INDEX idx_product_options_product ON product_options(product_id);

-- ── Option Values ───────────────────────────────────────────
CREATE TABLE option_values (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2),
  position INT DEFAULT 0
);

CREATE INDEX idx_option_values_option ON option_values(option_id);

-- ── Product Variants ────────────────────────────────────────
CREATE TABLE product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  combination JSONB DEFAULT '{}',
  price NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2),
  cost NUMERIC(10,2),
  quantity INT,
  image_url TEXT DEFAULT '',
  active BOOLEAN DEFAULT true
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);

-- ── Orders ──────────────────────────────────────────────────
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_second_phone TEXT DEFAULT '',
  customer_address TEXT NOT NULL,
  customer_government TEXT NOT NULL,
  customer_notes TEXT DEFAULT '',
  discount NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  archived BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'ready')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_archived ON orders(archived);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ── Order Items ─────────────────────────────────────────────
CREATE TABLE order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  base_price NUMERIC(10,2) NOT NULL,
  final_price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  discount NUMERIC(10,2) DEFAULT 0
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ── Order Item Options ──────────────────────────────────────
CREATE TABLE order_item_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  label TEXT NOT NULL,
  price NUMERIC(10,2) DEFAULT 0
);

CREATE INDEX idx_order_item_options_item ON order_item_options(order_item_id);

-- ── Shipping Fees ───────────────────────────────────────────
CREATE TABLE shipping_fees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  governorate TEXT NOT NULL UNIQUE,
  fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Settings (Key-Value with JSONB) ─────────────────────────
CREATE TABLE settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Webhooks ────────────────────────────────────────────────
CREATE TABLE webhooks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  events TEXT[] DEFAULT ARRAY['order.created'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Push Subscriptions ──────────────────────────────────────
CREATE TABLE push_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subscription JSONB NOT NULL,
  admin_id TEXT DEFAULT 'primary_admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_push_sub_endpoint ON push_subscriptions((subscription->>'endpoint'));

-- ── Order Counter (Sequence) ────────────────────────────────
CREATE SEQUENCE order_seq START WITH 1;

-- Helper function to get next order ID
CREATE OR REPLACE FUNCTION next_order_id()
RETURNS TEXT AS $$
DECLARE
  next_val INT;
BEGIN
  SELECT nextval('order_seq') INTO next_val;
  RETURN 'Order-' || next_val;
END;
$$ LANGUAGE plpgsql;

-- ── Updated At Trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_collections_updated BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_shipping_updated BEFORE UPDATE ON shipping_fees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_webhooks_updated BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RPC: Customer Aggregation (replaces MongoDB aggregation) ─
CREATE OR REPLACE FUNCTION get_customers()
RETURNS TABLE (
  phone TEXT,
  name TEXT,
  second_phone TEXT,
  government TEXT,
  address TEXT,
  total_spent NUMERIC,
  order_count BIGINT,
  last_order_date TIMESTAMPTZ,
  first_order_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.customer_phone AS phone,
    (array_agg(o.customer_name ORDER BY o.created_at DESC))[1] AS name,
    (array_agg(o.customer_second_phone ORDER BY o.created_at DESC))[1] AS second_phone,
    (array_agg(o.customer_government ORDER BY o.created_at DESC))[1] AS government,
    (array_agg(o.customer_address ORDER BY o.created_at DESC))[1] AS address,
    COALESCE(SUM(o.paid_amount), 0) AS total_spent,
    COUNT(*) AS order_count,
    MAX(o.created_at) AS last_order_date,
    MIN(o.created_at) AS first_order_date
  FROM orders o
  GROUP BY o.customer_phone
  ORDER BY MAX(o.created_at) DESC;
END;
$$ LANGUAGE plpgsql;

-- ── RPC: Customer Detail ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_customer_by_phone(p_phone TEXT)
RETURNS TABLE (
  phone TEXT,
  name TEXT,
  second_phone TEXT,
  government TEXT,
  address TEXT,
  notes TEXT,
  total_spent NUMERIC,
  order_count BIGINT,
  last_order_date TIMESTAMPTZ,
  first_order_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.customer_phone AS phone,
    (array_agg(o.customer_name ORDER BY o.created_at DESC))[1] AS name,
    (array_agg(o.customer_second_phone ORDER BY o.created_at DESC))[1] AS second_phone,
    (array_agg(o.customer_government ORDER BY o.created_at DESC))[1] AS government,
    (array_agg(o.customer_address ORDER BY o.created_at DESC))[1] AS address,
    (array_agg(o.customer_notes ORDER BY o.created_at DESC))[1] AS notes,
    COALESCE(SUM(o.paid_amount), 0) AS total_spent,
    COUNT(*) AS order_count,
    MAX(o.created_at) AS last_order_date,
    MIN(o.created_at) AS first_order_date
  FROM orders o
  WHERE o.customer_phone = p_phone
  GROUP BY o.customer_phone;
END;
$$ LANGUAGE plpgsql;

-- ── View: Full Product (with images, options, collections) ──
CREATE OR REPLACE VIEW product_full AS
SELECT
  p.*,
  COALESCE(
    (SELECT json_agg(pi.url ORDER BY pi.position)
     FROM product_images pi WHERE pi.product_id = p.id),
    '[]'::json
  ) AS images,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', po.id,
      'name', po.name,
      'required', po.required,
      'values', (
        SELECT COALESCE(json_agg(json_build_object(
          'id', ov.id,
          'label', ov.label,
          'price', ov.price,
          'salePrice', ov.sale_price
        ) ORDER BY ov.position), '[]'::json)
        FROM option_values ov WHERE ov.option_id = po.id
      )
    ) ORDER BY po.position)
     FROM product_options po WHERE po.product_id = p.id),
    '[]'::json
  ) AS options,
  COALESCE(
    (SELECT json_agg(pc.collection_id)
     FROM product_collections pc WHERE pc.product_id = p.id),
    '[]'::json
  ) AS collection_ids,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', pv.id,
      'combination', pv.combination,
      'price', pv.price,
      'salePrice', pv.sale_price,
      'cost', pv.cost,
      'quantity', pv.quantity,
      'imageUrl', pv.image_url,
      'active', pv.active
    ))
     FROM product_variants pv WHERE pv.product_id = p.id),
    '[]'::json
  ) AS variants
FROM products p;

-- ── View: Full Order (with items and their options) ─────────
CREATE OR REPLACE VIEW order_full AS
SELECT
  o.*,
  COALESCE(
    (SELECT json_agg(json_build_object(
      'id', oi.id,
      'productId', oi.product_id,
      'name', oi.name,
      'imageUrl', oi.image_url,
      'basePrice', oi.base_price,
      'finalPrice', oi.final_price,
      'quantity', oi.quantity,
      'discount', oi.discount,
      'selectedOptions', (
        SELECT COALESCE(json_agg(json_build_object(
          'groupName', oio.group_name,
          'label', oio.label,
          'price', oio.price
        )), '[]'::json)
        FROM order_item_options oio WHERE oio.order_item_id = oi.id
      )
    ) ORDER BY oi.id)
     FROM order_items oi WHERE oi.order_id = o.id),
    '[]'::json
  ) AS items
FROM orders o;
