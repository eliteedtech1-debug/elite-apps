-- Create the vendor_payment_configs table to fix the Paystack integration error
-- and add support for split payments
CREATE TABLE IF NOT EXISTS vendor_payment_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- The super admin/vendor ID
    paystack_secret_key VARCHAR(255),
    paystack_public_key VARCHAR(255),
    paystack_subaccount_code VARCHAR(255), -- For split payment functionality
    paystack_split_code VARCHAR(255),       -- For predefined split configuration
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_name VARCHAR(255),
    commission_percentage DECIMAL(5,2) DEFAULT 0.00, -- Vendor's commission percentage (e.g., 80.00 for 80%)
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_id (user_id)
);

-- Insert default configuration for the super admin (assuming user id 1 is super admin)
INSERT IGNORE INTO vendor_payment_configs (user_id, bank_name, account_number, account_name, commission_percentage)
VALUES (1, 'Keystone Bank', '1013842384', 'Elite Edutech system LTD', 80.00);