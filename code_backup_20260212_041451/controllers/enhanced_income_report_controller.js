const db = require("../models");
const dayjs = require('dayjs');

/**
 * Enhanced Income Report Controller with comprehensive filtering
 * Provides advanced income analysis with multiple filter options including date ranges, categories, academic periods
 */
const EnhancedIncomeReportController = {
  /**
   * Get comprehensive income report with advanced filtering
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with filtered income report data
   */
  async getEnhancedIncomeReport(req, res) {
    try {
      const {
        start_date,
        end_date,
        academic_year,
        term,
        category,
        subcategory,
        class_id,
        student_id,
        payment_method,
        source,
        fee_type,
        department,
        min_amount,
        max_amount,
        status,
        has_discount,
        has_tax,
        group_by = 'category',
        sort_by = 'amount',
        sort_order = 'desc',
        page = 1,
        limit = 50,
        include_summary = true,
        include_analytics = true,
        school_id,
        branch_id
      } = req.query;

      // Build dynamic WHERE clause based on filters
      let whereConditions = [];
      let replacements = {};

      // Date range filter
      if (start_date && end_date) {
        whereConditions.push("DATE(pe.created_at) BETWEEN :start_date AND :end_date");
        replacements.start_date = start_date;
        replacements.end_date = end_date;
      }

      // Academic year filter
      if (academic_year) {
        whereConditions.push("pe.academic_year = :academic_year");
        replacements.academic_year = academic_year;
      }

      // Term filter
      if (term) {
        whereConditions.push("pe.term = :term");
        replacements.term = term;
      }

      // Category filter
      if (category) {
        whereConditions.push("pe.description LIKE :category");
        replacements.category = `%${category}%`;
      }

      // Class filter
      if (class_id) {
        whereConditions.push("pe.class_code = :class_id");
        replacements.class_id = class_id;
      }

      // Student filter
      if (student_id) {
        whereConditions.push("pe.admission_no = :student_id");
        replacements.student_id = student_id;
      }

      // Payment method filter
      if (payment_method) {
        whereConditions.push("pe.payment_mode = :payment_method");
        replacements.payment_method = payment_method;
      }

      // Fee type filter
      if (fee_type) {
        whereConditions.push("pe.description LIKE :fee_type");
        replacements.fee_type = `%${fee_type}%`;
      }

      // Amount range filter
      if (min_amount) {
        whereConditions.push("pe.cr >= :min_amount");
        replacements.min_amount = parseFloat(min_amount);
      }

      if (max_amount) {
        whereConditions.push("pe.cr <= :max_amount");
        replacements.max_amount = parseFloat(max_amount);
      }

      // Status filter
      if (status) {
        whereConditions.push("pe.payment_status = :status");
        replacements.status = status;
      }

      // School and branch filters
      if (school_id) {
        whereConditions.push("pe.school_id = :school_id");
        replacements.school_id = school_id;
      }

      if (branch_id) {
        whereConditions.push("pe.branch_id = :branch_id");
        replacements.branch_id = branch_id;
      }

      // Only include income entries (cr > 0)
      whereConditions.push("pe.cr > 0");

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build the main query
      const mainQuery = `
        SELECT 
          pe.item_id,
          pe.ref_no,
          pe.admission_no,
          pe.class_code,
          pe.academic_year,
          pe.term,
          pe.cr as amount,
          pe.description,
          pe.payment_mode as payment_method,
          pe.school_id,
          pe.branch_id,
          pe.payment_status as status,
          pe.quantity,
          pe.is_optional,
          pe.created_at as date,
          
          -- Student information
          s.first_name,
          s.last_name,
          s.middle_name,
          CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
          
          -- Class information
          c.class_name,
          c.section,
          
          -- Parent information
          p.first_name as parent_first_name,
          p.last_name as parent_last_name,
          CONCAT(p.first_name, ' ', p.last_name) as parent_name,
          
          -- Additional categorization
          CASE 
            WHEN pe.description LIKE '%tuition%' OR pe.description LIKE '%school fee%' THEN 'Tuition Fees'
            WHEN pe.description LIKE '%transport%' OR pe.description LIKE '%bus%' THEN 'Transportation'
            WHEN pe.description LIKE '%uniform%' OR pe.description LIKE '%book%' THEN 'Materials'
            WHEN pe.description LIKE '%exam%' OR pe.description LIKE '%test%' THEN 'Examination'
            WHEN pe.description LIKE '%sport%' OR pe.description LIKE '%activity%' THEN 'Activities'
            WHEN pe.description LIKE '%lunch%' OR pe.description LIKE '%meal%' THEN 'Meals'
            ELSE 'Other Income'
          END as income_category,
          
          -- Calculate discount and tax (if applicable)
          CASE WHEN pe.is_optional = 'Yes' THEN pe.cr * 0.05 ELSE 0 END as discount_amount,
          CASE WHEN pe.cr > 10000 THEN pe.cr * 0.075 ELSE 0 END as tax_amount,
          pe.cr - CASE WHEN pe.is_optional = 'Yes' THEN pe.cr * 0.05 ELSE 0 END as net_amount
          
        FROM payment_entries pe
        LEFT JOIN students s ON pe.admission_no = s.admission_no
        LEFT JOIN classes c ON pe.class_code = c.class_code
        LEFT JOIN parents p ON s.parent_id = p.parent_id
        ${whereClause}
        ORDER BY pe.created_at DESC
        LIMIT :limit OFFSET :offset
      `;

      // Calculate offset for pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      replacements.limit = parseInt(limit);
      replacements.offset = offset;

      // Execute main query
      const [incomeData] = await db.sequelize.query(mainQuery, {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      });

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM payment_entries pe
        LEFT JOIN students s ON pe.admission_no = s.admission_no
        LEFT JOIN classes c ON pe.class_code = c.class_code
        LEFT JOIN parents p ON s.parent_id = p.parent_id
        ${whereClause}
      `;

      const [countResult] = await db.sequelize.query(countQuery, {
        replacements: Object.fromEntries(Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))),
        type: db.sequelize.QueryTypes.SELECT
      });

      const totalRecords = countResult[0]?.total || 0;

      // Generate summary statistics if requested
      let summary = {};
      if (include_summary) {
        const summaryQuery = `
          SELECT 
            COUNT(*) as total_records,
            SUM(pe.cr) as total_amount,
            AVG(pe.cr) as average_amount,
            MIN(pe.cr) as min_amount,
            MAX(pe.cr) as max_amount,
            SUM(CASE WHEN pe.is_optional = 'Yes' THEN pe.cr * 0.05 ELSE 0 END) as total_discount,
            SUM(CASE WHEN pe.cr > 10000 THEN pe.cr * 0.075 ELSE 0 END) as total_tax,
            COUNT(DISTINCT pe.admission_no) as unique_students,
            COUNT(DISTINCT pe.class_code) as unique_classes,
            COUNT(DISTINCT pe.academic_year) as unique_academic_years,
            COUNT(DISTINCT pe.term) as unique_terms,
            COUNT(DISTINCT pe.payment_mode) as unique_payment_methods
          FROM payment_entries pe
          LEFT JOIN students s ON pe.admission_no = s.admission_no
          LEFT JOIN classes c ON pe.class_code = c.class_code
          LEFT JOIN parents p ON s.parent_id = p.parent_id
          ${whereClause}
        `;

        const [summaryResult] = await db.sequelize.query(summaryQuery, {
          replacements: Object.fromEntries(Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))),
          type: db.sequelize.QueryTypes.SELECT
        });

        summary = summaryResult[0] || {};
        
        // Calculate additional metrics
        summary.net_total = (summary.total_amount || 0) - (summary.total_discount || 0);
        summary.profit_margin = summary.total_amount > 0 ? ((summary.net_total / summary.total_amount) * 100) : 0;
      }

      // Generate analytics data if requested
      let analytics = {};
      if (include_analytics) {
        // Group by analysis
        const groupByQuery = `
          SELECT 
            ${group_by === 'category' ? `CASE 
              WHEN pe.description LIKE '%tuition%' OR pe.description LIKE '%school fee%' THEN 'Tuition Fees'
              WHEN pe.description LIKE '%transport%' OR pe.description LIKE '%bus%' THEN 'Transportation'
              WHEN pe.description LIKE '%uniform%' OR pe.description LIKE '%book%' THEN 'Materials'
              WHEN pe.description LIKE '%exam%' OR pe.description LIKE '%test%' THEN 'Examination'
              WHEN pe.description LIKE '%sport%' OR pe.description LIKE '%activity%' THEN 'Activities'
              WHEN pe.description LIKE '%lunch%' OR pe.description LIKE '%meal%' THEN 'Meals'
              ELSE 'Other Income'
            END` : 
            group_by === 'class' ? 'c.class_name' :
            group_by === 'academic_year' ? 'pe.academic_year' :
            group_by === 'term' ? 'pe.term' :
            group_by === 'payment_method' ? 'pe.payment_mode' :
            group_by === 'student' ? 'CONCAT(s.first_name, " ", s.last_name)' :
            group_by === 'date' ? 'DATE(pe.created_at)' :
            'pe.description'} as group_key,
            COUNT(*) as record_count,
            SUM(pe.cr) as total_amount,
            AVG(pe.cr) as average_amount,
            MIN(pe.cr) as min_amount,
            MAX(pe.cr) as max_amount,
            SUM(CASE WHEN pe.is_optional = 'Yes' THEN pe.cr * 0.05 ELSE 0 END) as total_discount,
            SUM(CASE WHEN pe.cr > 10000 THEN pe.cr * 0.075 ELSE 0 END) as total_tax
          FROM payment_entries pe
          LEFT JOIN students s ON pe.admission_no = s.admission_no
          LEFT JOIN classes c ON pe.class_code = c.class_code
          LEFT JOIN parents p ON s.parent_id = p.parent_id
          ${whereClause}
          GROUP BY group_key
          ORDER BY ${sort_by === 'amount' ? 'total_amount' : 
                   sort_by === 'count' ? 'record_count' : 
                   sort_by === 'average' ? 'average_amount' : 'group_key'} ${sort_order.toUpperCase()}
          LIMIT 20
        `;

        const [groupedData] = await db.sequelize.query(groupByQuery, {
          replacements: Object.fromEntries(Object.entries(replacements).filter(([key]) => !['limit', 'offset'].includes(key))),
          type: db.sequelize.QueryTypes.SELECT
        });

        // Calculate percentages for grouped data
        const totalGroupAmount = groupedData.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
        const groupedWithPercentages = groupedData.map(item => ({
          ...item,
          percentage: totalGroupAmount > 0 ? ((parseFloat(item.total_amount) / totalGroupAmount) * 100) : 0,
          net_amount: parseFloat(item.total_amount) - parseFloat(item.total_discount || 0)
        }));

        analytics = {
          grouped_data: groupedWithPercentages,
          group_by: group_by,
          total_groups: groupedData.length
        };
      }

      // Format response data
      const formattedData = incomeData.map(item => ({
        ...item,
        amount: parseFloat(item.amount || 0),
        discount_amount: parseFloat(item.discount_amount || 0),
        tax_amount: parseFloat(item.tax_amount || 0),
        net_amount: parseFloat(item.net_amount || 0),
        date: dayjs(item.date).format('YYYY-MM-DD HH:mm:ss'),
        formatted_amount: `₦${parseFloat(item.amount || 0).toLocaleString()}`,
        formatted_net_amount: `₦${parseFloat(item.net_amount || 0).toLocaleString()}`
      }));

      // Prepare pagination info
      const pagination = {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_records: parseInt(totalRecords),
        total_pages: Math.ceil(totalRecords / parseInt(limit)),
        has_next_page: parseInt(page) < Math.ceil(totalRecords / parseInt(limit)),
        has_prev_page: parseInt(page) > 1
      };

      return res.status(200).json({
        success: true,
        message: "Enhanced income report generated successfully",
        data: {
          income_records: formattedData,
          summary: include_summary ? {
            ...summary,
            total_amount: parseFloat(summary.total_amount || 0),
            average_amount: parseFloat(summary.average_amount || 0),
            min_amount: parseFloat(summary.min_amount || 0),
            max_amount: parseFloat(summary.max_amount || 0),
            total_discount: parseFloat(summary.total_discount || 0),
            total_tax: parseFloat(summary.total_tax || 0),
            net_total: parseFloat(summary.net_total || 0),
            profit_margin: parseFloat(summary.profit_margin || 0),
            formatted_total: `₦${parseFloat(summary.total_amount || 0).toLocaleString()}`,
            formatted_net_total: `₦${parseFloat(summary.net_total || 0).toLocaleString()}`
          } : null,
          analytics: include_analytics ? analytics : null,
          pagination,
          filters_applied: {
            start_date,
            end_date,
            academic_year,
            term,
            category,
            class_id,
            student_id,
            payment_method,
            fee_type,
            min_amount,
            max_amount,
            status,
            group_by,
            sort_by,
            sort_order
          }
        },
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error generating enhanced income report:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate enhanced income report",
        error: error.message
      });
    }
  },

  /**
   * Get filter options for the income report
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with available filter options
   */
  async getFilterOptions(req, res) {
    try {
      const { school_id, branch_id } = req.query;

      let whereConditions = ["pe.cr > 0"];
      let replacements = {};

      if (school_id) {
        whereConditions.push("pe.school_id = :school_id");
        replacements.school_id = school_id;
      }

      if (branch_id) {
        whereConditions.push("pe.branch_id = :branch_id");
        replacements.branch_id = branch_id;
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Get all unique filter values
      const filterQuery = `
        SELECT DISTINCT
          pe.academic_year,
          pe.term,
          pe.payment_mode as payment_method,
          pe.class_code,
          c.class_name,
          pe.payment_status as status,
          CASE 
            WHEN pe.description LIKE '%tuition%' OR pe.description LIKE '%school fee%' THEN 'Tuition Fees'
            WHEN pe.description LIKE '%transport%' OR pe.description LIKE '%bus%' THEN 'Transportation'
            WHEN pe.description LIKE '%uniform%' OR pe.description LIKE '%book%' THEN 'Materials'
            WHEN pe.description LIKE '%exam%' OR pe.description LIKE '%test%' THEN 'Examination'
            WHEN pe.description LIKE '%sport%' OR pe.description LIKE '%activity%' THEN 'Activities'
            WHEN pe.description LIKE '%lunch%' OR pe.description LIKE '%meal%' THEN 'Meals'
            ELSE 'Other Income'
          END as income_category,
          CONCAT(s.first_name, ' ', COALESCE(s.middle_name, ''), ' ', s.last_name) as student_name,
          s.admission_no
        FROM payment_entries pe
        LEFT JOIN students s ON pe.admission_no = s.admission_no
        LEFT JOIN classes c ON pe.class_code = c.class_code
        ${whereClause}
        ORDER BY pe.academic_year DESC, pe.term, c.class_name, student_name
      `;

      const [filterData] = await db.sequelize.query(filterQuery, {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      });

      // Organize filter options
      const filterOptions = {
        academic_years: [...new Set(filterData.map(item => item.academic_year).filter(Boolean))],
        terms: [...new Set(filterData.map(item => item.term).filter(Boolean))],
        payment_methods: [...new Set(filterData.map(item => item.payment_method).filter(Boolean))],
        classes: [...new Set(filterData.map(item => ({ 
          class_code: item.class_code, 
          class_name: item.class_name 
        })).filter(item => item.class_code))],
        statuses: [...new Set(filterData.map(item => item.status).filter(Boolean))],
        income_categories: [...new Set(filterData.map(item => item.income_category).filter(Boolean))],
        students: [...new Set(filterData.map(item => ({
          admission_no: item.admission_no,
          student_name: item.student_name
        })).filter(item => item.admission_no))],
        group_by_options: [
          { value: 'category', label: 'Income Category' },
          { value: 'class', label: 'Class' },
          { value: 'student', label: 'Student' },
          { value: 'academic_year', label: 'Academic Year' },
          { value: 'term', label: 'Term' },
          { value: 'payment_method', label: 'Payment Method' },
          { value: 'date', label: 'Date' }
        ],
        sort_options: [
          { value: 'amount', label: 'Total Amount' },
          { value: 'count', label: 'Record Count' },
          { value: 'average', label: 'Average Amount' },
          { value: 'name', label: 'Name/Category' }
        ]
      };

      return res.status(200).json({
        success: true,
        message: "Filter options retrieved successfully",
        data: filterOptions
      });

    } catch (error) {
      console.error("Error getting filter options:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get filter options",
        error: error.message
      });
    }
  },

  /**
   * Export income report data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with export data
   */
  async exportIncomeReport(req, res) {
    try {
      const { format = 'json', ...filters } = req.query;

      // Get the full report data without pagination
      const reportRequest = {
        query: {
          ...filters,
          limit: 10000, // Large limit for export
          page: 1,
          include_summary: true,
          include_analytics: true
        }
      };

      // Reuse the main report function
      const reportResponse = await this.getEnhancedIncomeReport(reportRequest, {
        status: () => ({ json: (data) => data })
      });

      const reportData = reportResponse.data;

      if (format === 'csv') {
        // Convert to CSV format
        const csvHeaders = [
          'Date', 'Student Name', 'Class', 'Academic Year', 'Term',
          'Description', 'Category', 'Amount', 'Payment Method',
          'Discount', 'Tax', 'Net Amount', 'Status', 'Reference No'
        ];

        const csvRows = reportData.income_records.map(record => [
          record.date,
          record.student_name || '',
          record.class_name || '',
          record.academic_year || '',
          record.term || '',
          record.description || '',
          record.income_category || '',
          record.amount,
          record.payment_method || '',
          record.discount_amount,
          record.tax_amount,
          record.net_amount,
          record.status || '',
          record.ref_no || ''
        ]);

        const csvContent = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="income-report-${dayjs().format('YYYY-MM-DD')}.csv"`);
        return res.send(csvContent);
      }

      // Default JSON export
      return res.status(200).json({
        success: true,
        message: "Income report exported successfully",
        data: reportData,
        export_info: {
          format,
          exported_at: new Date().toISOString(),
          total_records: reportData.income_records.length
        }
      });

    } catch (error) {
      console.error("Error exporting income report:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to export income report",
        error: error.message
      });
    }
  }
};

module.exports = EnhancedIncomeReportController;