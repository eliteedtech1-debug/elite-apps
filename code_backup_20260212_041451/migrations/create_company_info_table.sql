-- Create table for company information
DROP TABLE IF EXISTS company_info;
CREATE TABLE IF NOT EXISTS company_info (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    website VARCHAR(100),
    logo_url VARCHAR(500),
    tax_id VARCHAR(100), -- Tax identification number
    business_reg_number VARCHAR(100), -- Business registration number
    default_currency VARCHAR(10) DEFAULT 'NGN',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default company information
INSERT IGNORE INTO company_info (
    company_name, 
    address, 
    business_reg_number,
    tax_id,
    phone, 
    email, 
    website, 
    logo_url
) VALUES (
    'Elite Edutech LTD', 
    'F1 African Alliance building, Sani Abacha way, Airport road, Kano', 
    'RC1234567',
    '0887654321',
    '+234-912-4611-644', 
    'info@elitescholar.ng', 
    'https://elitescholar.ng', 
    'assets/img/elitescholar-logo.png'
);