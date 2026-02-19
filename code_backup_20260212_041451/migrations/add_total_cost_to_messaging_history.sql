-- Add total_cost column to messaging_history table for tracking total costs
-- This will be used in addition to the existing cost column which tracks per-message cost

ALTER TABLE messaging_history 
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Total cost for the message including all recipients' AFTER cost;

-- Update the cost column comment to clarify it's per-message cost
ALTER TABLE messaging_history 
MODIFY COLUMN cost DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Cost per message';



-- Update messaging_history table to support bulk messages efficiently
-- This allows storing 1 record for bulk messages with a list of recipients

-- Add new columns for bulk message support
ALTER TABLE messaging_history
ADD COLUMN IF NOT EXISTS message_type ENUM('single', 'bulk') DEFAULT 'single' COMMENT 'Type of message - single or bulk' AFTER channel,
ADD COLUMN IF NOT EXISTS recipients_count INT DEFAULT 1 COMMENT 'Number of recipients for this message' AFTER message_type,
ADD COLUMN IF NOT EXISTS recipients_list JSON COMMENT 'List of recipients for bulk messages (stores array of {name, phone, id})' AFTER recipients_count;

-- Make recipient fields nullable for bulk messages (since we store in recipients_list)
ALTER TABLE messaging_history
MODIFY COLUMN recipient_type ENUM('parent', 'teacher', 'student', 'mixed') DEFAULT 'mixed' COMMENT 'Type of recipient or mixed for bulk',
MODIFY COLUMN recipient_id VARCHAR(50) NULL COMMENT 'ID of the recipient (NULL for bulk)',
MODIFY COLUMN recipient_name VARCHAR(255) NULL COMMENT 'Name of the recipient (NULL for bulk)',
MODIFY COLUMN recipient_identifier VARCHAR(255) NULL COMMENT 'Phone/email (NULL for bulk)';

-- Add index for bulk message queries
ALTER TABLE messaging_history ADD INDEX IF NOT EXISTS idx_message_type (message_type);
ALTER TABLE messaging_history ADD INDEX IF NOT EXISTS idx_recipients_count (recipients_count);

-- Comments for documentation
ALTER TABLE messaging_history COMMENT = 'Stores all messaging history. For bulk messages (message_type=bulk), recipients are stored in recipients_list JSON field. For single messages, individual recipient fields are used.';
