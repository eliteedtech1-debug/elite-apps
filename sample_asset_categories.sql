USE skcooly_db;

-- Insert sample asset categories with depreciation rates
INSERT INTO asset_categories (
    category_id, category_name, category_code, description, 
    parent_category_id, is_active, school_id, branch_id, 
    depreciation_rate, createdAt, updatedAt
) VALUES 
('CAT-FUR-001', 'Furniture', 'FUR', 'Desks, chairs, tables, and office furniture', NULL, 1, 'SCH/1', NULL, 10.00, NOW(), NOW()),
('CAT-ELEC-001', 'Electronics', 'ELEC', 'Projectors, computers, sound systems', NULL, 1, 'SCH/1', NULL, 25.00, NOW(), NOW()),
('CAT-LAB-001', 'Laboratory Equipment', 'LAB', 'Scientific instruments and apparatus', NULL, 1, 'SCH/1', NULL, 12.50, NOW(), NOW()),
('CAT-SPORT-001', 'Sports Equipment', 'SPORT', 'Gymnasium and field equipment', NULL, 1, 'SCH/1', NULL, 20.00, NOW(), NOW()),
('CAT-LIB-001', 'Library Materials', 'LIB', 'Books and reading materials', NULL, 1, 'SCH/1', NULL, 0.00, NOW(), NOW()),
('CAT-COMP-001', 'Computers & IT', 'COMP', 'Computers, laptops, and IT equipment', NULL, 1, 'SCH/1', NULL, 33.33, NOW(), NOW()),
('CAT-VEH-001', 'Vehicles', 'VEH', 'School vehicles and transportation', NULL, 1, 'SCH/1', NULL, 20.00, NOW(), NOW()),
('CAT-TOOL-001', 'Tools & Machinery', 'TOOL', 'Maintenance tools and machinery', NULL, 1, 'SCH/1', NULL, 15.00, NOW(), NOW()),
('CAT-MED-001', 'Medical Equipment', 'MED', 'First aid and medical supplies', NULL, 1, 'SCH/1', NULL, 10.00, NOW(), NOW()),
('CAT-MUS-001', 'Musical Instruments', 'MUS', 'Musical instruments and audio equipment', NULL, 1, 'SCH/1', NULL, 8.00, NOW(), NOW()),
('CAT-SEC-001', 'Security Systems', 'SEC', 'Security cameras, alarms, and access control', NULL, 1, 'SCH/1', NULL, 20.00, NOW(), NOW()),
('CAT-PLAY-001', 'Playground Equipment', 'PLAY', 'Outdoor playground and recreational equipment', NULL, 1, 'SCH/1', NULL, 5.00, NOW(), NOW()),
('CAT-KTCH-001', 'Kitchen Equipment', 'KTCH', 'Kitchen and cafeteria equipment', NULL, 1, 'SCH/1', NULL, 12.00, NOW(), NOW()),
('CAT-HVAC-001', 'HVAC Systems', 'HVAC', 'Heating, ventilation, and air conditioning', NULL, 1, 'SCH/1', NULL, 10.00, NOW(), NOW()),
('CAT-ART-001', 'Art Supplies', 'ART', 'Art and craft supplies and equipment', NULL, 1, 'SCH/1', NULL, 15.00, NOW(), NOW());
