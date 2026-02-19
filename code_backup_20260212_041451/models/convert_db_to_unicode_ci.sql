DELIMITER $$
DROP PROCEDURE convert_db_to_unicode_ci$$

CREATE PROCEDURE convert_db_to_unicode_ci(IN db_name VARCHAR(255))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE t_name VARCHAR(255);
    DECLARE cur CURSOR FOR 
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = db_name
          AND TABLE_TYPE = 'BASE TABLE';  -- ✅ Skip views
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO t_name;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET @s = CONCAT(
            'ALTER TABLE `', db_name, '`.`', t_name, 
            '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;'
        );
        PREPARE stmt FROM @s;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    CLOSE cur;
END$$




-- Execute it for your DB
CALL convert_db_to_unicode_ci('kirmaskngov_skcooly_db')$$

CREATE PROCEDURE convert_columns_to_unicode_ci(IN db_name VARCHAR(255))
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE t_name VARCHAR(255);
    DECLARE c_name VARCHAR(255);
    DECLARE c_type VARCHAR(255);
    DECLARE c_nullable VARCHAR(3);
    DECLARE c_default TEXT;

    DECLARE cur CURSOR FOR 
        SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = db_name 
          AND COLLATION_NAME LIKE '%general_ci%';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO t_name, c_name, c_type, c_nullable, c_default;
        IF done THEN
            LEAVE read_loop;
        END IF;
        SET @stmt = CONCAT(
            'ALTER TABLE `', db_name, '`.`', t_name, 
            '` MODIFY `', c_name, '` ', c_type,
            ' CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci',
            IF(c_nullable = 'NO', ' NOT NULL', ''),
            IF(c_default IS NOT NULL, CONCAT(' DEFAULT ''', c_default, ''''), ''),
            ';'
        );
        PREPARE s FROM @stmt;
        EXECUTE s;
        DEALLOCATE PREPARE s;
    END LOOP;
    CLOSE cur;
END$$

DELIMITER ;

-- Run it:
CALL convert_columns_to_unicode_ci('kirmaskngov_skcooly_db');

ALTER TABLE `class_role` DROP PRIMARY KEY; ALTER TABLE `class_role` ADD `id` INT(11) NOT NULL AUTO_INCREMENT FIRST, ADD PRIMARY KEY (`id`); 
