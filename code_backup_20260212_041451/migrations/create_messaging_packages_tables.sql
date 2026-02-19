-- Create messaging_packages table to store different service packages
DROP TABLE IF EXISTS messaging_packages;
CREATE TABLE IF NOT EXISTS messaging_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_name VARCHAR(100) NOT NULL COMMENT 'Package name (e.g., Standard, Premium, Elite)',
    service_type ENUM('sms', 'whatsapp', 'email') NOT NULL COMMENT 'Type of messaging service',
    package_type ENUM('payg', 'termly', 'annual') NOT NULL COMMENT 'Pay-as-you-go, termly subscription, or annual subscription',
    messages_per_term INT NOT NULL DEFAULT 0 COMMENT 'Number of messages included per term for termly packages',
    unit_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT 'Cost per unit message for pay-as-you-go packages',
    package_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT 'Total cost of the package for termly packages',
    currency VARCHAR(10) NOT NULL DEFAULT 'NGN' COMMENT 'Currency code',
    description TEXT COMMENT 'Package description and features',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Whether package is currently available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_service_type (service_type),
    INDEX idx_package_type (package_type),
    INDEX idx_is_active (is_active)
);
ALTER TABLE messaging_packages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default packages
INSERT INTO messaging_packages (package_name, service_type, package_type, messages_per_term, unit_cost, package_cost, description) VALUES
-- SMS Pay-as-you-go (0% discount - Base rate ₦5.00)
('Unit', 'sms', 'payg', 0, 5.0000, 0.0000, 'Pay per message at standard rate of ₦5.00 per SMS - No discount'),

-- SMS Termly packages
('Standard', 'sms', 'termly', 500, 5.0000, 2500.0000, 'Standard: 500 SMS per term at ₦5.00/msg (0% discount) - Total: ₦2,500'),
('Premium', 'sms', 'termly', 1500, 4.7500, 7125.0000, 'Premium: 1,500 SMS per term at ₦4.75/msg (5% discount) - Total: ₦7,125'),
('Elite', 'sms', 'termly', 3000, 4.7500, 14250.0000, 'Elite: 3,000 SMS per term at ₦4.75/msg (5% discount) - Total: ₦14,250'),

-- SMS Annual packages (15% discount for all tiers)
('Standard', 'sms', 'annual', 1500, 4.2500, 6375.0000, 'Standard: 1,500 SMS per year at ₦4.25/msg (15% discount) - Total: ₦6,375'),
('Premium', 'sms', 'annual', 4500, 4.2500, 19125.0000, 'Premium: 4,500 SMS per year at ₦4.25/msg (15% discount) - Total: ₦19,125'),
('Elite', 'sms', 'annual', 9000, 4.2500, 38250.0000, 'Elite: 9,000 SMS per year at ₦4.25/msg (15% discount) - Total: ₦38,250'),

-- WhatsApp Pay-as-you-go (0% discount - Base rate ₦2.00)
('Unit', 'whatsapp', 'payg', 0, 2.0000, 0.0000, 'Pay per message at standard rate of ₦2.00 per WhatsApp message - No discount'),

-- WhatsApp Termly packages
('Standard', 'whatsapp', 'termly', 500, 2.0000, 1000.0000, 'Standard: 500 WhatsApp per term at ₦2.00/msg (0% discount) - Total: ₦1,000'),
('Premium', 'whatsapp', 'termly', 1500, 1.9000, 2850.0000, 'Premium: 1,500 WhatsApp per term at ₦1.90/msg (5% discount) - Total: ₦2,850'),
('Elite', 'whatsapp', 'termly', 3000, 1.9000, 5700.0000, 'Elite: 3,000 WhatsApp per term at ₦1.90/msg (5% discount) - Total: ₦5,700'),

-- WhatsApp Annual packages (15% discount for all tiers)
('Standard', 'whatsapp', 'annual', 1500, 1.7000, 2550.0000, 'Standard: 1,500 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦2,550'),
('Premium', 'whatsapp', 'annual', 4500, 1.7000, 7650.0000, 'Premium: 4,500 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦7,650'),
('Elite', 'whatsapp', 'annual', 9000, 1.7000, 15300.0000, 'Elite: 9,000 WhatsApp per year at ₦1.70/msg (15% discount) - Total: ₦15,300');

-- Create messaging_subscriptions table to track school subscriptions
CREATE TABLE IF NOT EXISTS messaging_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id VARCHAR(20) NOT NULL,
    package_id INT NOT NULL,
    start_date DATE NOT NULL COMMENT 'Start date of the subscription',
    end_date DATE NOT NULL COMMENT 'End date of the subscription (term end)',
    total_messages INT NOT NULL DEFAULT 0 COMMENT 'Total messages included in package',
    messages_used INT NOT NULL DEFAULT 0 COMMENT 'Number of messages already used',
    status ENUM('active', 'inactive', 'expired') DEFAULT 'active' COMMENT 'Subscription status',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES messaging_packages(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
    INDEX idx_school_id (school_id),
    INDEX idx_package_id (package_id),
    INDEX idx_status (status),
    INDEX idx_end_date (end_date)
);

-- Create messaging_usage table to track individual message usage
CREATE TABLE IF NOT EXISTS messaging_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id VARCHAR(20) NOT NULL,
    subscription_id INT,
    service_type ENUM('sms', 'whatsapp', 'email') NOT NULL,
    message_count INT NOT NULL DEFAULT 1,
    cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000 COMMENT 'Cost of this message or batch',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES school_setup(school_id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES messaging_subscriptions(id) ON DELETE SET NULL,
    INDEX idx_school_id (school_id),
    INDEX idx_subscription_id (subscription_id),
    INDEX idx_service_type (service_type),
    INDEX idx_created_at (created_at)
);