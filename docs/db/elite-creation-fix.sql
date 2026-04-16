-- Elite Core System - Complete Database Fix
-- Includes foreign key constraint fixes and collation standardization
-- Addresses: "Illegal mix of collations (utf8mb4_general_ci,IMPLICIT) and (utf8mb4_unicode_ci,IMPLICIT) for operation '='"
-- Fixes errors with dashboard_query and manage_branches stored procedures

-- Disable foreign key checks temporarily to allow table modifications
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Asset Categories
CREATE TABLE IF NOT EXISTS asset_categories (
  category_id VARCHAR(20) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  parent_category_id VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  school_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  INDEX idx_school_category (school_id, category_id),
  INDEX idx_active_assets (is_active),
  CONSTRAINT fk_asset_categories_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_categories_parent_id FOREIGN KEY (parent_category_id) REFERENCES asset_categories(category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Rooms/Classrooms
CREATE TABLE IF NOT EXISTS facility_rooms (
  room_id VARCHAR(20) NOT NULL,
  room_name VARCHAR(100) NOT NULL,
  room_type ENUM('Classroom', 'Laboratory', 'Library', 'Office', 'Storage', 'Hall', 'Sports', 'Other') DEFAULT 'Classroom',
  room_code VARCHAR(20),
  floor_number INT,
  capacity INT,
  branch_id VARCHAR(20) NOT NULL,
  school_id VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id),
  UNIQUE KEY unique_room_per_branch (branch_id, room_code),
  INDEX idx_school_branch_room (school_id, branch_id, room_id),
  INDEX idx_room_type (room_type),
  CONSTRAINT fk_facility_rooms_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id) ON DELETE CASCADE,
  CONSTRAINT fk_facility_rooms_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Assets/Inventory Items (Fixed Assets)
CREATE TABLE IF NOT EXISTS assets (
  asset_id VARCHAR(20) NOT NULL,
  asset_tag VARCHAR(50) UNIQUE,
  asset_name VARCHAR(200) NOT NULL,
  category_id VARCHAR(20) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  description TEXT,
  purchase_date DATE,
  purchase_cost DECIMAL(12, 2),
  current_value DECIMAL(12, 2),
  depreciation_rate DECIMAL(5, 2),
  warranty_expiry_date DATE,
  supplier_name VARCHAR(200),
  supplier_contact VARCHAR(100),
  room_id VARCHAR(20),
  branch_id VARCHAR(20) NOT NULL,
  school_id VARCHAR(20) NOT NULL,
  status ENUM('Operational', 'Damaged', 'Under Maintenance', 'Decommissioned', 'Lost', 'In Storage') DEFAULT 'Operational',
  condition_rating ENUM('Excellent', 'Good', 'Fair', 'Poor') DEFAULT 'Good',
  qr_code_url VARCHAR(500),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (asset_id),
  INDEX idx_school_assets (school_id, asset_id),
  INDEX idx_branch_assets (branch_id, asset_id),
  INDEX idx_room_assets (room_id, asset_id),
  INDEX idx_asset_status (status),
  INDEX idx_asset_category (category_id),
  CONSTRAINT fk_assets_category_id FOREIGN KEY (category_id) REFERENCES asset_categories(category_id),
  CONSTRAINT fk_assets_room_id FOREIGN KEY (room_id) REFERENCES facility_rooms(room_id) ON DELETE SET NULL,
  CONSTRAINT fk_assets_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  CONSTRAINT fk_assets_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_assets_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Asset Inspections
CREATE TABLE IF NOT EXISTS asset_inspections (
  inspection_id VARCHAR(20) NOT NULL,
  asset_id VARCHAR(20) NOT NULL,
  inspection_date DATE NOT NULL,
  inspector_id INT NOT NULL,
  condition_rating ENUM('Excellent', 'Good', 'Fair', 'Poor') NOT NULL,
  status_after_inspection ENUM('Operational', 'Needs Repair', 'Damaged', 'Decommissioned') DEFAULT 'Operational',
  findings TEXT,
  recommendations TEXT,
  photos_url TEXT,
  next_inspection_date DATE,
  school_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (inspection_id),
  INDEX idx_asset_inspections (asset_id, inspection_date),
  INDEX idx_inspector_inspections (inspector_id, inspection_date),
  INDEX idx_next_inspection (next_inspection_date),
  CONSTRAINT fk_asset_inspections_asset_id FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_inspections_inspector_id FOREIGN KEY (inspector_id) REFERENCES users(id),
  CONSTRAINT fk_asset_inspections_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Maintenance Requests
CREATE TABLE IF NOT EXISTS maintenance_requests (
  request_id VARCHAR(20) NOT NULL,
  asset_id VARCHAR(20) NOT NULL,
  request_date DATE NOT NULL,
  requested_by INT NOT NULL,
  priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  issue_description TEXT NOT NULL,
  status ENUM('Pending', 'Approved', 'In Progress', 'Completed', 'Rejected', 'Cancelled') DEFAULT 'Pending',
  assigned_to INT,
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  start_date DATE,
  completion_date DATE,
  work_performed TEXT,
  vendor_name VARCHAR(200),
  vendor_contact VARCHAR(100),
  school_id VARCHAR(20) NOT NULL,
  branch_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  INDEX idx_asset_maintenance (asset_id, request_date),
  INDEX idx_maintenance_status (status, priority),
  INDEX idx_assigned_maintenance (assigned_to, status),
  CONSTRAINT fk_maintenance_requests_asset_id FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
  CONSTRAINT fk_maintenance_requests_requested_by FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_maintenance_requests_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_maintenance_requests_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_maintenance_requests_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Asset Transfers
CREATE TABLE IF NOT EXISTS asset_transfers (
  transfer_id VARCHAR(20) NOT NULL,
  asset_id VARCHAR(20) NOT NULL,
  from_room_id VARCHAR(20),
  to_room_id VARCHAR(20),
  from_branch_id VARCHAR(20) NOT NULL,
  to_branch_id VARCHAR(20) NOT NULL,
  transfer_date DATE NOT NULL,
  transferred_by INT NOT NULL,
  received_by INT,
  reason TEXT,
  status ENUM('Pending', 'In Transit', 'Completed', 'Cancelled') DEFAULT 'Pending',
  notes TEXT,
  school_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (transfer_id),
  INDEX idx_asset_transfers (asset_id, transfer_date),
  INDEX idx_transfer_status (status),
  CONSTRAINT fk_asset_transfers_asset_id FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
  CONSTRAINT fk_asset_transfers_from_room_id FOREIGN KEY (from_room_id) REFERENCES facility_rooms(room_id) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfers_to_room_id FOREIGN KEY (to_room_id) REFERENCES facility_rooms(room_id) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfers_from_branch_id FOREIGN KEY (from_branch_id) REFERENCES school_locations(branch_id),
  CONSTRAINT fk_asset_transfers_to_branch_id FOREIGN KEY (to_branch_id) REFERENCES school_locations(branch_id),
  CONSTRAINT fk_asset_transfers_transferred_by FOREIGN KEY (transferred_by) REFERENCES users(id),
  CONSTRAINT fk_asset_transfers_received_by FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_asset_transfers_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  category_id VARCHAR(20) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(10) NOT NULL UNIQUE,
  description TEXT,
  parent_category_id VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  school_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id),
  INDEX idx_school_product_category (school_id, category_id),
  CONSTRAINT fk_product_categories_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_product_categories_parent_id FOREIGN KEY (parent_category_id) REFERENCES product_categories(category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Products (Sellable Items)
CREATE TABLE IF NOT EXISTS products (
  product_id VARCHAR(20) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  category_id VARCHAR(20) NOT NULL,
  description TEXT,
  unit_of_measure VARCHAR(50) DEFAULT 'piece',
  has_variants BOOLEAN DEFAULT FALSE,
  brand VARCHAR(100),
  supplier_id VARCHAR(20),
  reorder_level INT DEFAULT 10,
  school_id VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  image_url VARCHAR(500),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id),
  INDEX idx_school_products (school_id, product_id),
  INDEX idx_product_category (category_id),
  INDEX idx_sku (sku),
  INDEX idx_active_products (is_active),
  CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES product_categories(category_id),
  CONSTRAINT fk_products_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_products_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Product Variants (sizes, colors, editions)
CREATE TABLE IF NOT EXISTS product_variants (
  variant_id VARCHAR(20) NOT NULL,
  product_id VARCHAR(20) NOT NULL,
  variant_name VARCHAR(100) NOT NULL,
  variant_sku VARCHAR(50) UNIQUE NOT NULL,
  attribute_type VARCHAR(50) NOT NULL, -- e.g., Size, Color, Edition
  attribute_value VARCHAR(100) NOT NULL, -- e.g., Small, Blue, 2024 Edition
  additional_cost DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (variant_id),
  UNIQUE KEY unique_product_variant (product_id, attribute_type, attribute_value),
  INDEX idx_product_variants (product_id, variant_id),
  INDEX idx_variant_sku (variant_sku),
  CONSTRAINT fk_product_variants_product_id FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Product Stock (Inventory by Branch)
CREATE TABLE IF NOT EXISTS product_stock (
  stock_id VARCHAR(20) NOT NULL,
  product_id VARCHAR(20),
  variant_id VARCHAR(20),
  branch_id VARCHAR(20) NOT NULL,
  quantity_on_hand INT DEFAULT 0,
  quantity_reserved INT DEFAULT 0,
  quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  cost_price DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  school_id VARCHAR(20) NOT NULL,
  last_stock_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (stock_id),
  UNIQUE KEY unique_branch_product_variant (branch_id, product_id, variant_id),
  INDEX idx_branch_stock (branch_id, product_id),
  INDEX idx_low_stock (quantity_available),
  CHECK (quantity_on_hand >= 0),
  CHECK (quantity_reserved >= 0),
  CONSTRAINT fk_product_stock_product_id FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  CONSTRAINT fk_product_stock_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE,
  CONSTRAINT fk_product_stock_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  CONSTRAINT fk_product_stock_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id VARCHAR(20) NOT NULL,
  supplier_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  payment_terms VARCHAR(100),
  rating ENUM('Excellent', 'Good', 'Fair', 'Poor'),
  is_active BOOLEAN DEFAULT TRUE,
  school_id VARCHAR(20) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id),
  INDEX idx_school_suppliers (school_id, supplier_id),
  INDEX idx_active_suppliers (is_active),
  CONSTRAINT fk_suppliers_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  po_id VARCHAR(20) NOT NULL,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id VARCHAR(20) NOT NULL,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status ENUM('Draft', 'Pending Approval', 'Approved', 'Ordered', 'Partially Received', 'Received', 'Cancelled') DEFAULT 'Draft',
  total_amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  shipping_cost DECIMAL(10, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  grand_total DECIMAL(12, 2) NOT NULL,
  branch_id VARCHAR(20) NOT NULL,
  school_id VARCHAR(20) NOT NULL,
  created_by INT NOT NULL,
  approved_by INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (po_id),
  INDEX idx_school_po (school_id, po_id),
  INDEX idx_supplier_po (supplier_id, order_date),
  INDEX idx_po_status (status),
  CONSTRAINT fk_po_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
  CONSTRAINT fk_po_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  CONSTRAINT fk_po_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_po_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Purchase Order Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  po_item_id VARCHAR(20) NOT NULL,
  po_id VARCHAR(20) NOT NULL,
  product_id VARCHAR(20) NOT NULL,
  variant_id VARCHAR(20),
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(12, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (po_item_id),
  INDEX idx_po_items (po_id, po_item_id),
  INDEX idx_product_orders (product_id),
  CONSTRAINT fk_poi_po_id FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
  CONSTRAINT fk_poi_product_id FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_poi_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE SET NULL,
  CHECK (quantity_ordered > 0),
  CHECK (quantity_received >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Stock Transactions (Audit Trail)
CREATE TABLE IF NOT EXISTS stock_transactions (
  transaction_id VARCHAR(20) NOT NULL,
  transaction_type ENUM('Purchase', 'Sale', 'Adjustment', 'Transfer', 'Return', 'Damage') NOT NULL,
  product_id VARCHAR(20) NOT NULL,
  variant_id VARCHAR(20),
  branch_id VARCHAR(20) NOT NULL,
  quantity INT NOT NULL, -- Positive for additions, negative for deductions
  unit_cost DECIMAL(10, 2),
  reference_type VARCHAR(50), -- e.g., 'PO', 'Sale', 'Adjustment'
  reference_id VARCHAR(20), -- ID of related record
  notes TEXT,
  transaction_date DATE NOT NULL,
  school_id VARCHAR(20) NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (transaction_id),
  INDEX idx_product_transactions (product_id, transaction_date),
  INDEX idx_branch_transactions (branch_id, transaction_date),
  INDEX idx_transaction_type (transaction_type),
  CONSTRAINT fk_st_product_id FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_st_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE SET NULL,
  CONSTRAINT fk_st_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  CONSTRAINT fk_st_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_st_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Sales Transactions
CREATE TABLE IF NOT EXISTS sales_transactions (
  sale_id VARCHAR(20) NOT NULL,
  sale_number VARCHAR(50) UNIQUE NOT NULL,
  sale_date DATE NOT NULL,
  customer_type ENUM('Student', 'Parent', 'Staff', 'External') DEFAULT 'Student',
  customer_id INT, -- References users table or students table
  customer_name VARCHAR(200),
  payment_method ENUM('Cash', 'Bank Transfer', 'Card', 'Cheque', 'Mobile Money', 'Credit') DEFAULT 'Cash',
  payment_status ENUM('Pending', 'Partial', 'Paid', 'Refunded') DEFAULT 'Pending',
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0.00,
  branch_id VARCHAR(20) NOT NULL,
  school_id VARCHAR(20) NOT NULL,
  sold_by INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sale_id),
  INDEX idx_school_sales (school_id, sale_date),
  INDEX idx_branch_sales (branch_id, sale_date),
  INDEX idx_customer_sales (customer_id),
  INDEX idx_payment_status (payment_status),
  CONSTRAINT fk_sales_customer_id FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sales_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  CONSTRAINT fk_sales_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_sales_sold_by FOREIGN KEY (sold_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Sales Transaction Items
CREATE TABLE IF NOT EXISTS sales_transaction_items (
  sale_item_id VARCHAR(20) NOT NULL,
  sale_id VARCHAR(20) NOT NULL,
  product_id VARCHAR(20) NOT NULL,
  variant_id VARCHAR(20),
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_price DECIMAL(10, 2) NOT NULL,
  cost_price DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sale_item_id),
  INDEX idx_sale_items (sale_id, sale_item_id),
  INDEX idx_product_sales (product_id),
  CONSTRAINT fk_sti_sale_id FOREIGN KEY (sale_id) REFERENCES sales_transactions(sale_id) ON DELETE CASCADE,
  CONSTRAINT fk_sti_product_id FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_sti_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE SET NULL,
  CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Stock Adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  adjustment_id VARCHAR(20) NOT NULL,
  adjustment_date DATE NOT NULL,
  adjustment_type ENUM('Physical Count', 'Damage', 'Theft', 'Expiry', 'Correction', 'Other') NOT NULL,
  product_id VARCHAR(20) NOT NULL,
  variant_id VARCHAR(20),
  branch_id VARCHAR(20) NOT NULL,
  old_quantity INT NOT NULL,
  new_quantity INT NOT NULL,
  quantity_difference INT NOT NULL,
  reason TEXT NOT NULL,
  approved_by INT,
  school_id VARCHAR(20) NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (adjustment_id),
  INDEX idx_branch_adjustments (branch_id, adjustment_date),
  INDEX idx_product_adjustments (product_id, adjustment_date),
  CONSTRAINT fk_sa_product_id FOREIGN KEY (product_id) REFERENCES products(product_id),
  CONSTRAINT fk_sa_variant_id FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE SET NULL,
  CONSTRAINT fk_sa_branch_id FOREIGN KEY (branch_id) REFERENCES school_locations(branch_id),
  CONSTRAINT fk_sa_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_sa_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_sa_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Asset Documents
CREATE TABLE IF NOT EXISTS asset_documents (
  document_id VARCHAR(20) NOT NULL,
  asset_id VARCHAR(20) NOT NULL,
  document_type ENUM('Purchase Invoice', 'Warranty', 'Manual', 'Service Record', 'Photo', 'Other') NOT NULL,
  document_name VARCHAR(200) NOT NULL,
  document_url VARCHAR(500) NOT NULL,
  file_size INT,
  uploaded_by INT NOT NULL,
  school_id VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (document_id),
  INDEX idx_asset_documents (asset_id, document_type),
  CONSTRAINT fk_ad_asset_id FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
  CONSTRAINT fk_ad_school_id FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
  CONSTRAINT fk_ad_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Collation fix section to standardize character sets across all tables
-- This resolves the "Illegal mix of collations" error by ensuring consistent collations

-- Standardize collation for core tables to utf8mb4_unicode_ci
ALTER TABLE `school_setup` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `school_locations` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE students CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `staff` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `classes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `subjects` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `examinations` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `grades` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Standardize collation for retail/inventory tables
ALTER TABLE `products` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `suppliers` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `product_categories` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `purchase_orders` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `sales_transactions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `stock_adjustments` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `product_stock` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `stock_transactions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `sales_transaction_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `purchase_order_items` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `assets` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `asset_categories` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `facility_rooms` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `asset_inspections` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `maintenance_requests` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `asset_transfers` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `asset_documents` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `product_variants` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Standardize collation for accounting/financial tables
ALTER TABLE `chart_of_accounts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `journal_entries` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `payments` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `billing` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Standardize collation for messaging and communication tables
ALTER TABLE `messaging_subscriptions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `messaging_usage` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Standardize collation for academic-related tables that may be involved in academic_year procedure
ALTER TABLE `academic_calendar` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `sessions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `terms` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `academic_years` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `grading_systems` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `grade_boundaries` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ca_setup` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ca_templates` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `assessment_criteria` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `knowledge_domains` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `knowledge_domain_criteria` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ca_assessment_v2` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ca_week_v2` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ca_section_config` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ca_knowledge_domain_link` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Also fix tables that are likely joined in the academic_year procedure based on parameters (BRCH00001 and SCH/1)
ALTER TABLE `class_setup` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `classes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `class_groups` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `class_sections` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `students` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `student_classes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `subjects` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `subject_assignments` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `staff` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `timetable` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `lesson_notes` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `examinations` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `exam_results` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `reports` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `attendance_records` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `behavioural_grades` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `psychomotor_grades` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `affective_grades` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verification queries to confirm table creation and collation fixes
SELECT 'Tables created successfully with standardized collations' AS Status;

-- List all created tables
SELECT
    TABLE_NAME,
    COLUMN_NAME,
    IS_NULLABLE,
    DATA_TYPE,
    COLUMN_KEY
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN (
    'asset_categories', 'facility_rooms', 'assets', 'asset_inspections',
    'maintenance_requests', 'asset_transfers', 'product_categories',
    'products', 'product_variants', 'product_stock', 'suppliers',
    'purchase_orders', 'purchase_order_items', 'stock_transactions',
    'sales_transactions', 'sales_transaction_items',
    'stock_adjustments', 'asset_documents'
)
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- Query to verify that critical tables now have consistent collations
SELECT 'Verifying critical tables have consistent UTF8MB4 collation...' AS verification_note;

SELECT 
    TABLE_NAME,
    COUNT(*) AS columns_count,
    COUNT(DISTINCT COLLATION_NAME) AS unique_collations,
    GROUP_CONCAT(DISTINCT COLLATION_NAME SEPARATOR ', ') AS collations_found
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('school_setup', 'school_locations', 'users')
AND COLLATION_NAME IS NOT NULL
GROUP BY TABLE_NAME;

SELECT 'Migration and collation fixes completed successfully!' AS status;