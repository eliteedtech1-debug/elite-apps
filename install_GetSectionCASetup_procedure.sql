DELIMITER ;

-- Install the GetSectionCASetup stored procedure
DELIMITER $$
DROP PROCEDURE IF EXISTS `GetSectionCASetup`$$
CREATE PROCEDURE `GetSectionCASetup`(IN `in_branch_id` VARCHAR(20), IN `in_section` VARCHAR(20))
BEGIN
    DECLARE v_section VARCHAR(50);
    DECLARE v_default_section VARCHAR(50);
    DECLARE v_has_section_records INT DEFAULT 0;

    -- Normalize input
    SET v_section = NULLIF(in_section, '');

    -- Determine what the table's default section is (e.g., 'All')
    SELECT DISTINCT section
    INTO v_default_section
    FROM ca_setup
    WHERE branch_id = in_branch_id
    ORDER BY CASE WHEN section IS NULL THEN 1 ELSE 0 END
    LIMIT 1;

    -- If no default found, fallback to NULL
    SET v_default_section = IFNULL(v_default_section, 'All');

    -- Check if this section has specific active records
    IF v_section IS NOT NULL THEN
        SELECT COUNT(*) INTO v_has_section_records
        FROM ca_setup
        WHERE branch_id = in_branch_id
          AND section = v_section
          AND status = 'Active';
    END IF;

    -- Main query: prefer section rows, else fallback to default
    SELECT
        COALESCE(ca.section, v_default_section) AS section,
        ca.ca_type,
        ca.status,
        ca.week_number,
        COUNT(ca.week_number) AS week_count,
        SUM(ca.max_score) AS total_max_score,
        AVG(ca.overall_contribution_percent) AS contribution_percent,
        MIN(ca.created_at) AS created_at,
        GROUP_CONCAT(
            CONCAT('W', ca.week_number, ':', ca.max_score)
            ORDER BY ca.week_number SEPARATOR ', '
        ) AS week_breakdown
    FROM ca_setup ca
    WHERE ca.status = 'Active'
      AND ca.branch_id = in_branch_id
      AND (
            (v_has_section_records > 0 AND ca.section = v_section)
            OR (v_has_section_records = 0 AND ca.section = v_default_section)
          )
    GROUP BY ca.section, ca.ca_type, ca.status
    ORDER BY ca.ca_type;

END$$
DELIMITER ;