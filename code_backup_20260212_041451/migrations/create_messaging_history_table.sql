-- Create messaging_history table to track all sent messages
CREATE TABLE IF NOT EXISTS messaging_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    branch_id VARCHAR(50) NOT NULL,
    sender_id VARCHAR(50) NOT NULL COMMENT 'ID of the user who sent the message',
    sender_type ENUM('admin', 'teacher', 'parent', 'student', 'system') DEFAULT 'admin',
    recipient_type ENUM('parent', 'teacher', 'student') NOT NULL,
    recipient_id VARCHAR(50) NOT NULL COMMENT 'ID of the recipient',
    recipient_name VARCHAR(255) NOT NULL COMMENT 'Name of the recipient',
    recipient_identifier VARCHAR(255) NOT NULL COMMENT 'Email, phone number, or WhatsApp number',
    channel ENUM('sms', 'whatsapp', 'email') NOT NULL COMMENT 'Channel used to send the message',
    message_text TEXT NOT NULL COMMENT 'The actual message content',
    message_subject VARCHAR(500) COMMENT 'Subject for email messages',
    status ENUM('sent', 'failed', 'delivered', 'read') DEFAULT 'sent' COMMENT 'Delivery status',
    cost DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Cost of the message if applicable',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_school_id (school_id),
    INDEX idx_branch_id (branch_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_recipient_id (recipient_id),
    INDEX idx_channel (channel),
    INDEX idx_created_at (created_at)
);

-- Insert sample data to test the table
INSERT INTO messaging_history (school_id, branch_id, sender_id, sender_type, recipient_type, recipient_id, recipient_name, recipient_identifier, channel, message_text, cost) VALUES
('SCH/1', 'BRCH00001', 'USR001', 'admin', 'parent', 'PARENT001', 'John Doe', '2348012345678', 'sms', 'Welcome to our school. This is a test message.', 4.00),
('SCH/1', 'BRCH00001', 'USR001', 'admin', 'teacher', 'TEACHER001', 'Jane Smith', '2348087654321', 'whatsapp', 'Your schedule has been updated for the week.', 0.00);