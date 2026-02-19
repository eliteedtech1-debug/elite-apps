-- Create table for subscription payments
CREATE TABLE IF NOT EXISTS subscription_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    invoice_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- cash, bank_transfer, online, etc.
    reference_number VARCHAR(100), -- transaction ID or reference
    payment_status ENUM('completed', 'pending', 'failed', 'refunded') DEFAULT 'completed',
    notes TEXT,
    created_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES school_subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES subscription_invoices(id) ON DELETE CASCADE,
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_payment_date (payment_date)
);

-- Add payment tracking fields to subscription_invoices table
ALTER TABLE subscription_invoices
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_payment_due DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

-- Add payment tracking fields to school_subscriptions table
ALTER TABLE school_subscriptions
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_payment_due DATE,
ADD COLUMN IF NOT EXISTS last_payment_date DATE;

ALTER TABLE `subscription_payments` ADD UNIQUE(`subscription_id`);