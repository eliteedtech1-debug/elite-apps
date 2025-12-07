USE elite_yazid;

-- Add depreciation_rate column if it doesn't exist
ALTER TABLE asset_categories 
ADD COLUMN IF NOT EXISTS depreciation_rate DECIMAL(5,2) DEFAULT NULL 
COMMENT 'Annual depreciation rate as percentage (e.g., 20.00 for 20%)';

-- Update existing categories with standard depreciation rates
UPDATE asset_categories 
SET depreciation_rate = CASE 
    WHEN LOWER(category_name) LIKE '%furniture%' OR LOWER(category_code) LIKE '%fur%' THEN 10.00
    WHEN LOWER(category_name) LIKE '%electronic%' OR LOWER(category_code) LIKE '%elec%' THEN 25.00
    WHEN LOWER(category_name) LIKE '%computer%' OR LOWER(category_code) LIKE '%comp%' THEN 33.33
    WHEN LOWER(category_name) LIKE '%vehicle%' OR LOWER(category_code) LIKE '%veh%' THEN 20.00
    WHEN LOWER(category_name) LIKE '%equipment%' OR LOWER(category_code) LIKE '%equip%' THEN 15.00
    WHEN LOWER(category_name) LIKE '%lab%' THEN 12.50
    WHEN LOWER(category_name) LIKE '%sport%' THEN 20.00
    WHEN LOWER(category_name) LIKE '%book%' OR LOWER(category_name) LIKE '%library%' THEN 0.00
    WHEN LOWER(category_name) LIKE '%tool%' OR LOWER(category_name) LIKE '%machinery%' THEN 15.00
    WHEN LOWER(category_name) LIKE '%medical%' THEN 10.00
    WHEN LOWER(category_name) LIKE '%musical%' THEN 8.00
    WHEN LOWER(category_name) LIKE '%security%' THEN 20.00
    WHEN LOWER(category_name) LIKE '%playground%' THEN 5.00
    WHEN LOWER(category_name) LIKE '%kitchen%' THEN 12.00
    WHEN LOWER(category_name) LIKE '%hvac%' THEN 10.00
    WHEN LOWER(category_name) LIKE '%art%' THEN 15.00
    ELSE 10.00
END
WHERE depreciation_rate IS NULL;

-- Create function to calculate average depreciation rate for auto-fill
DELIMITER //
DROP FUNCTION IF EXISTS get_average_depreciation_rate //
CREATE FUNCTION get_average_depreciation_rate() 
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE avg_rate DECIMAL(5,2);
    
    SELECT ROUND(AVG(depreciation_rate), 2) INTO avg_rate
    FROM asset_categories 
    WHERE depreciation_rate IS NOT NULL 
    AND depreciation_rate > 0
    ORDER BY createdAt DESC 
    LIMIT 10;
    
    -- Return default if no data found
    IF avg_rate IS NULL THEN
        SET avg_rate = 15.00;
    END IF;
    
    RETURN avg_rate;
END //
DELIMITER ;
