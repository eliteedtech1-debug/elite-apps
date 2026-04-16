-- Consolidated Database Migration for Elite Core System
-- This file contains all the schema changes needed for the system
-- Excluding collation changes as requested

-- Note: This migration assumes that the following changes are NOT applied:
-- 1. Charset/collation changes in Sequelize configuration (these are code changes, not DB changes)
-- 2. The API query change (using current_class instead of class_code) is a code change, not DB schema change

-- The main structural changes that DO need to be applied are:

-- 1. Foreign Key Constraints and Primary Key Adjustments for Supply Management Tables
-- This migration applies the changes made in create_supply_management_tables.sql

-- Adjust Purchase Orders table
ALTER TABLE purchase_orders MODIFY COLUMN po_id VARCHAR(20) NOT NULL;
ALTER TABLE purchase_orders DROP PRIMARY KEY; -- If exists
ALTER TABLE purchase_orders ADD PRIMARY KEY (po_id);
ALTER TABLE purchase_orders DROP FOREIGN KEY IF EXISTS fk_po_supplier_id;
ALTER TABLE purchase_orders DROP FOREIGN KEY IF EXISTS fk_po_branch_id;
ALTER TABLE purchase_orders DROP FOREIGN KEY IF EXISTS fk_po_school_id;
ALTER TABLE purchase_orders DROP FOREIGN KEY IF EXISTS fk_po_created_by;
ALTER TABLE purchase_orders DROP FOREIGN KEY IF EXISTS fk_po_approved_by;
ALTER TABLE purchase_orders
  ADD CONSTRAINT fk_po_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
  ADD CONSTRAINT fk_po_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  ADD CONSTRAINT fk_po_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_po_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for purchase orders if they don't exist
CREATE INDEX IF NOT EXISTS idx_school_po ON purchase_orders (school_id, po_id);
CREATE INDEX IF NOT EXISTS idx_supplier_po ON purchase_orders (supplier_id, order_date);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders (status);

-- Adjust Purchase Order Items table
ALTER TABLE purchase_order_items MODIFY COLUMN po_item_id VARCHAR(20) NOT NULL;
ALTER TABLE purchase_order_items DROP PRIMARY KEY; -- If exists
ALTER TABLE purchase_order_items ADD PRIMARY KEY (po_item_id);
ALTER TABLE purchase_order_items DROP FOREIGN KEY IF EXISTS fk_poi_po_id;
ALTER TABLE purchase_order_items DROP FOREIGN KEY IF EXISTS fk_poi_product_id;
ALTER TABLE purchase_order_items DROP FOREIGN KEY IF EXISTS fk_poi_variant_id;
ALTER TABLE purchase_order_items
  ADD CONSTRAINT fk_poi_po_id FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_poi_product_id FOREIGN KEY (product_id) REFERENCES products(product_id),
  ADD CONSTRAINT fk_poi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE SET NULL;

-- Add indexes for purchase order items if they don't exist
CREATE INDEX IF NOT EXISTS idx_po_items ON purchase_order_items (po_id, po_item_id);
CREATE INDEX IF NOT EXISTS idx_product_orders ON purchase_order_items (product_id);
ALTER TABLE purchase_order_items ADD CONSTRAINT chk_quantity_ordered CHECK (quantity_ordered > 0);
ALTER TABLE purchase_order_items ADD CONSTRAINT chk_quantity_received CHECK (quantity_received >= 0);

-- Adjust Stock Transactions table
ALTER TABLE stock_transactions MODIFY COLUMN transaction_id VARCHAR(20) NOT NULL;
ALTER TABLE stock_transactions DROP PRIMARY KEY; -- If exists
ALTER TABLE stock_transactions ADD PRIMARY KEY (transaction_id);
ALTER TABLE stock_transactions DROP FOREIGN KEY IF EXISTS fk_st_product_id;
ALTER TABLE stock_transactions DROP FOREIGN KEY IF EXISTS fk_st_variant_id;
ALTER TABLE stock_transactions DROP FOREIGN KEY IF EXISTS fk_st_branch_id;
ALTER TABLE stock_transactions DROP FOREIGN KEY IF EXISTS fk_st_school_id;
ALTER TABLE stock_transactions DROP FOREIGN KEY IF EXISTS fk_st_created_by;
ALTER TABLE stock_transactions
  ADD CONSTRAINT fk_st_product_id FOREIGN KEY (product_id) REFERENCES products(product_id),
  ADD CONSTRAINT fk_st_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_st_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  ADD CONSTRAINT fk_st_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_st_created_by FOREIGN KEY (created_by) REFERENCES users(id);

-- Add indexes for stock transactions if they don't exist
CREATE INDEX IF NOT EXISTS idx_product_transactions ON stock_transactions (product_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_branch_transactions ON stock_transactions (branch_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_type ON stock_transactions (transaction_type);

-- Adjust Sales Transactions table
ALTER TABLE sales_transactions MODIFY COLUMN sale_id VARCHAR(20) NOT NULL;
ALTER TABLE sales_transactions DROP PRIMARY KEY; -- If exists
ALTER TABLE sales_transactions ADD PRIMARY KEY (sale_id);
ALTER TABLE sales_transactions DROP FOREIGN KEY IF EXISTS fk_sales_customer_id;
ALTER TABLE sales_transactions DROP FOREIGN KEY IF EXISTS fk_sales_branch_id;
ALTER TABLE sales_transactions DROP FOREIGN KEY IF EXISTS fk_sales_school_id;
ALTER TABLE sales_transactions DROP FOREIGN KEY IF EXISTS fk_sales_sold_by;
ALTER TABLE sales_transactions
  ADD CONSTRAINT fk_sales_customer_id FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_sales_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  ADD CONSTRAINT fk_sales_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_sales_sold_by FOREIGN KEY (sold_by) REFERENCES users(id);

-- Add indexes for sales transactions if they don't exist
CREATE INDEX IF NOT EXISTS idx_school_sales ON sales_transactions (school_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_branch_sales ON sales_transactions (branch_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_customer_sales ON sales_transactions (customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON sales_transactions (payment_status);

-- Adjust Sales Transaction Items table
ALTER TABLE sales_transaction_items MODIFY COLUMN sale_item_id VARCHAR(20) NOT NULL;
ALTER TABLE sales_transaction_items DROP PRIMARY KEY; -- If exists
ALTER TABLE sales_transaction_items ADD PRIMARY KEY (sale_item_id);
ALTER TABLE sales_transaction_items DROP FOREIGN KEY IF EXISTS fk_sti_sale_id;
ALTER TABLE sales_transaction_items DROP FOREIGN KEY IF EXISTS fk_sti_product_id;
ALTER TABLE sales_transaction_items DROP FOREIGN KEY IF EXISTS fk_sti_variant_id;
ALTER TABLE sales_transaction_items
  ADD CONSTRAINT fk_sti_sale_id FOREIGN KEY (sale_id) REFERENCES sales_transactions(sale_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_sti_product_id FOREIGN KEY (product_id) REFERENCES products(product_id),
  ADD CONSTRAINT fk_sti_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE SET NULL;

-- Add indexes for sales transaction items if they don't exist
CREATE INDEX IF NOT EXISTS idx_sale_items ON sales_transaction_items (sale_id, sale_item_id);
CREATE INDEX IF NOT EXISTS idx_product_sales ON sales_transaction_items (product_id);
ALTER TABLE sales_transaction_items ADD CONSTRAINT chk_quantity CHECK (quantity > 0);

-- Adjust Stock Adjustments table
ALTER TABLE stock_adjustments MODIFY COLUMN adjustment_id VARCHAR(20) NOT NULL;
ALTER TABLE stock_adjustments DROP PRIMARY KEY; -- If exists
ALTER TABLE stock_adjustments ADD PRIMARY KEY (adjustment_id);
ALTER TABLE stock_adjustments DROP FOREIGN KEY IF EXISTS fk_sa_product_id;
ALTER TABLE stock_adjustments DROP FOREIGN KEY IF EXISTS fk_sa_variant_id;
ALTER TABLE stock_adjustments DROP FOREIGN KEY IF EXISTS fk_sa_branch_id;
ALTER TABLE stock_adjustments DROP FOREIGN KEY IF EXISTS fk_sa_school_id;
ALTER TABLE stock_adjustments DROP FOREIGN KEY IF EXISTS fk_sa_created_by;
ALTER TABLE stock_adjustments DROP FOREIGN KEY IF EXISTS fk_sa_approved_by;
ALTER TABLE stock_adjustments
  ADD CONSTRAINT fk_sa_product_id FOREIGN KEY (product_id) REFERENCES products(product_id),
  ADD CONSTRAINT fk_sa_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_sa_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  ADD CONSTRAINT fk_sa_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_sa_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  ADD CONSTRAINT fk_sa_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add indexes for stock adjustments if they don't exist
CREATE INDEX IF NOT EXISTS idx_branch_adjustments ON stock_adjustments (branch_id, adjustment_date);
CREATE INDEX IF NOT EXISTS idx_product_adjustments ON stock_adjustments (product_id, adjustment_date);

-- Adjust Asset Documents table
ALTER TABLE asset_documents MODIFY COLUMN document_id VARCHAR(20) NOT NULL;
ALTER TABLE asset_documents DROP PRIMARY KEY; -- If exists
ALTER TABLE asset_documents ADD PRIMARY KEY (document_id);
ALTER TABLE asset_documents DROP FOREIGN KEY IF EXISTS fk_ad_asset_id;
ALTER TABLE asset_documents DROP FOREIGN KEY IF EXISTS fk_ad_school_id;
ALTER TABLE asset_documents DROP FOREIGN KEY IF EXISTS fk_ad_uploaded_by;
ALTER TABLE asset_documents
  ADD CONSTRAINT fk_ad_asset_id FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_ad_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_ad_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id);

-- Add indexes for asset documents if they don't exist
CREATE INDEX IF NOT EXISTS idx_asset_documents ON asset_documents (asset_id, document_type);

-- IMPORTANT NOTE:
-- The API changes to use current_class instead of class_code are code changes,
-- not database schema changes, so they are not included in this migration file.
-- These changes are in src/routes/studentDetails.js and need to be deployed separately.

-- Also note that charset/collation changes that were requested to be discarded
-- are not included in this migration file as they are configuration changes.