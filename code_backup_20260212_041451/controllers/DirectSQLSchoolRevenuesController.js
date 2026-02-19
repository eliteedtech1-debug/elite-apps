const db = require('../models');
const sequelize = db.sequelize;
const { QueryTypes } = require('sequelize');

/**
 * DIRECT SQL SCHOOL REVENUES CONTROLLER
 * 
 * This controller replaces the school_revenues stored procedure with direct SQL queries
 * while maintaining 100% backward compatibility with existing API parameters and response formats.
 * 
 * Key Features:
 * - Uses direct SQL queries (no complex ORM relations)
 * - Maintains exact same API parameters as legacy system
 * - Returns identical response formats
 * - AI-friendly with transparent SQL queries
 * - Easy to understand and modify
 */

class DirectSQLSchoolRevenuesController {

  /**
   * SCHOOL REVENUES - DIRECT SQL VERSION
   * Maintains exact same parameters as legacy schoolRevenues function
   * Replaces: CALL school_revenues(...)
   */
  async schoolRevenues(req, res) {
    try {
      const operations = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];

      // Helper: Normalize term/class to array of { value, label } (same as legacy)
      const normalizeField = (field) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') return [{ value: field, label: field }];
        if (typeof field === 'object' && field.value != null && field.label != null) {
          return [field];
        }
        console.warn("Unexpected field format:", field);
        return [];
      };

      for (const operation of operations) {
        const {
          query_type = null,
          id = null,
          description = null,
          amount = null,
          revenue_type = null,
          section = null,
          is_optional = null,
          status = null,
          account_type = null,
          branch_id = null,
          academic_year = null,
          quantity = null,
        } = operation;

        // Normalize term and class_name (same as legacy)
        const terms = normalizeField(operation.term);
        const classes = normalizeField(operation.class_name);

        // Generate cross-product: each class × each term (same as legacy)
        const processedOperations =
          classes.length > 0 && terms.length > 0
            ? classes.flatMap((cls) =>
                terms.map((termItem) => ({
                  ...operation,
                  class_code: cls.value,
                  class_name: cls.label,
                  term: termItem.value,
                  term_label: termItem.label,
                }))
              )
            : [
                {
                  ...operation,
                  class_code: null,
                  class_name: null,
                  term: null,
                },
              ];

        // Execute each processed operation with direct SQL
        for (const processedOperation of processedOperations) {
          const params = {
            query_type,
            id: processedOperation.id ?? null,
            description,
            amount,
            term: processedOperation.term ?? null,
            section,
            class_name: processedOperation.class_name ?? null,
            class_code: processedOperation.class_code ?? null,
            revenue_type,
            is_optional,
            status: status ?? 'Active',
            account_type,
            branch_id: processedOperation.branch_id ?? branch_id ?? req.user.branch_id,
            school_id: req.user.school_id,
            academic_year,
            quantity,
          };

          const result = await this.executeDirectSQLRevenueQuery(params);
          results.push(result);
        }
      }

      res.status(200).json({ 
        success: true, 
        data: results.flat(),
        system: "direct_sql" // Indicate we're using direct SQL
      });
    } catch (error) {
      console.error("Error executing school_revenues operation (Direct SQL):", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * EXECUTE DIRECT SQL REVENUE QUERY
   * Replaces stored procedure calls with direct SQL queries
   */
  async executeDirectSQLRevenueQuery(params) {
    const { query_type } = params;

    switch (query_type) {
      case 'SELECT':
      case 'select':
      case 'select-revenues':
        return await this.selectRevenues(params);
      
      case 'INSERT':
      case 'insert':
      case 'create':
        return await this.insertRevenue(params);
      
      case 'UPDATE':
      case 'update':
        return await this.updateRevenue(params);
      
      case 'DELETE':
      case 'delete':
        return await this.deleteRevenue(params);
      
      default:
        // Default to select if no specific query_type
        return await this.selectRevenues(params);
    }
  }

  /**
   * SELECT REVENUES - DIRECT SQL
   * Replaces: CALL school_revenues('SELECT', ...)
   */
  async selectRevenues(params) {
    const {
      id,
      class_code,
      class_name,
      term,
      section,
      revenue_type,
      status,
      academic_year,
      is_optional,
      school_id,
      branch_id
    } = params;

    let whereClause = 'WHERE school_id = :school_id';
    const replacements = { school_id };

    // Build dynamic WHERE clause based on parameters
    if (id) {
      whereClause += ' AND id = :id';
      replacements.id = id;
    }

    if (class_code) {
      whereClause += ' AND class_code = :class_code';
      replacements.class_code = class_code;
    }

    if (class_name) {
      whereClause += ' AND class_name = :class_name';
      replacements.class_name = class_name;
    }

    if (term) {
      whereClause += ' AND term = :term';
      replacements.term = term;
    }

    if (section) {
      whereClause += ' AND section = :section';
      replacements.section = section;
    }

    if (revenue_type) {
      whereClause += ' AND revenue_type = :revenue_type';
      replacements.revenue_type = revenue_type;
    }

    if (status) {
      whereClause += ' AND status = :status';
      replacements.status = status;
    }

    if (academic_year) {
      whereClause += ' AND academic_year = :academic_year';
      replacements.academic_year = academic_year;
    }

    if (is_optional !== null && is_optional !== undefined) {
      whereClause += ' AND is_optional = :is_optional';
      replacements.is_optional = is_optional;
    }

    if (branch_id) {
      whereClause += ' AND branch_id = :branch_id';
      replacements.branch_id = branch_id;
    }

    const sql = `
      SELECT 
        id,
        code,
        description,
        amount,
        quantity,
        (amount * quantity) as total_amount,
        term,
        section,
        class_name,
        class_code,
        revenue_type,
        is_optional,
        status,
        account_type,
        academic_year,
        school_id,
        branch_id,
        created_by,
        created_at,
        updated_at
      FROM school_revenues 
      ${whereClause}
      ORDER BY revenue_type ASC, class_code ASC, description ASC
    `;

    return await sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT
    });
  }

  /**
   * INSERT REVENUE - DIRECT SQL
   * Replaces: CALL school_revenues('INSERT', ...)
   */
  async insertRevenue(params) {
    const {
      description,
      amount,
      term,
      section,
      class_name,
      class_code,
      revenue_type,
      is_optional,
      status,
      account_type,
      academic_year,
      quantity,
      school_id,
      branch_id
    } = params;

    // Generate unique code
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const code = `REV-${timestamp}-${random}`;

    const sql = `
      INSERT INTO school_revenues 
      (code, description, amount, term, section, class_name, class_code, 
       revenue_type, is_optional, status, account_type, academic_year, 
       quantity, school_id, branch_id, created_at)
      VALUES 
      (:code, :description, :amount, :term, :section, :class_name, :class_code,
       :revenue_type, :is_optional, :status, :account_type, :academic_year,
       :quantity, :school_id, :branch_id, NOW())
    `;

    const result = await sequelize.query(sql, {
      replacements: {
        code,
        description,
        amount: parseFloat(amount) || 0,
        term,
        section,
        class_name,
        class_code,
        revenue_type: revenue_type || 'OTHER',
        is_optional: is_optional || false,
        status: status || 'Active',
        account_type: account_type || 'REVENUE',
        academic_year,
        quantity: parseInt(quantity) || 1,
        school_id,
        branch_id
      },
      type: QueryTypes.INSERT
    });

    return [{
      success: true,
      message: 'Revenue created successfully',
      id: result[0],
      code,
      description,
      amount: parseFloat(amount) || 0
    }];
  }

  /**
   * UPDATE REVENUE - DIRECT SQL
   * Replaces: CALL school_revenues('UPDATE', ...)
   */
  async updateRevenue(params) {
    const {
      id,
      description,
      amount,
      term,
      section,
      class_name,
      class_code,
      revenue_type,
      is_optional,
      status,
      account_type,
      academic_year,
      quantity,
      school_id
    } = params;

    let updateFields = [];
    let replacements = { id, school_id };

    // Build dynamic UPDATE clause
    if (description) {
      updateFields.push('description = :description');
      replacements.description = description;
    }

    if (amount !== null && amount !== undefined) {
      updateFields.push('amount = :amount');
      replacements.amount = parseFloat(amount);
    }

    if (term) {
      updateFields.push('term = :term');
      replacements.term = term;
    }

    if (section) {
      updateFields.push('section = :section');
      replacements.section = section;
    }

    if (class_name) {
      updateFields.push('class_name = :class_name');
      replacements.class_name = class_name;
    }

    if (class_code) {
      updateFields.push('class_code = :class_code');
      replacements.class_code = class_code;
    }

    if (revenue_type) {
      updateFields.push('revenue_type = :revenue_type');
      replacements.revenue_type = revenue_type;
    }

    if (is_optional !== null && is_optional !== undefined) {
      updateFields.push('is_optional = :is_optional');
      replacements.is_optional = is_optional;
    }

    if (status) {
      updateFields.push('status = :status');
      replacements.status = status;
    }

    if (account_type) {
      updateFields.push('account_type = :account_type');
      replacements.account_type = account_type;
    }

    if (academic_year) {
      updateFields.push('academic_year = :academic_year');
      replacements.academic_year = academic_year;
    }

    if (quantity !== null && quantity !== undefined) {
      updateFields.push('quantity = :quantity');
      replacements.quantity = parseInt(quantity);
    }

    updateFields.push('updated_at = NOW()');

    const sql = `
      UPDATE school_revenues 
      SET ${updateFields.join(', ')}
      WHERE id = :id AND school_id = :school_id
    `;

    await sequelize.query(sql, {
      replacements,
      type: QueryTypes.UPDATE
    });

    return [{
      success: true,
      message: 'Revenue updated successfully',
      id
    }];
  }

  /**
   * DELETE REVENUE - DIRECT SQL (Soft Delete)
   * Replaces: CALL school_revenues('DELETE', ...)
   */
  async deleteRevenue(params) {
    const { id, school_id } = params;

    const sql = `
      UPDATE school_revenues 
      SET status = 'Archived', updated_at = NOW()
      WHERE id = :id AND school_id = :school_id
    `;

    await sequelize.query(sql, {
      replacements: { id, school_id },
      type: QueryTypes.UPDATE
    });

    return [{
      success: true,
      message: 'Revenue deleted successfully',
      id
    }];
  }

  /**
   * GET SCHOOL REVENUES - LEGACY COMPATIBLE
   * Maintains exact same parameters as legacy getSchoolRevenues
   */
  async getSchoolRevenues(req, res) {
    try {
      const {
        query_type = null,
        id = null,
        description = null,
        amount = null,
        revenue_type = null,
        section = null,
        is_optional = null,
        status = null,
        class_code = null,
        class_name = null,
        account_type = null,
        branch_id = null,
        academic_year = null,
        term = null,
        quantity = null,
      } = req.query;

      const params = {
        query_type: query_type || 'SELECT',
        id: id ?? null,
        description,
        amount,
        term: term ?? null,
        section,
        class_name: class_name ?? null,
        class_code: class_code ?? null,
        revenue_type,
        is_optional,
        status: status ?? 'Active',
        account_type,
        branch_id: branch_id ?? req.user.branch_id,
        school_id: req.user.school_id,
        academic_year,
        quantity,
      };

      const result = await this.executeDirectSQLRevenueQuery(params);

      res.status(200).json({ 
        success: true, 
        data: result,
        system: "direct_sql"
      });
    } catch (error) {
      console.error("Error executing school_revenues operation (Direct SQL):", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * SINGLE SCHOOL REVENUES - LEGACY COMPATIBLE
   * Alias for backward compatibility
   */
  async singleschoolRevenues(req, res) {
    return await this.schoolRevenues(req, res);
  }

  /**
   * GET REVENUES BY CLASS - DIRECT SQL
   * Enhanced method for class-specific revenue queries
   */
  async getRevenuesByClass(req, res) {
    try {
      const {
        class_code,
        term,
        academic_year,
        status = 'Active',
        include_optional = true
      } = req.query;

      if (!class_code) {
        return res.status(400).json({
          success: false,
          message: 'class_code is required'
        });
      }

      let whereClause = 'WHERE class_code = :class_code AND school_id = :school_id AND status = :status';
      const replacements = { class_code, school_id: req.user.school_id, status };

      if (term) {
        whereClause += ' AND term = :term';
        replacements.term = term;
      }

      if (academic_year) {
        whereClause += ' AND academic_year = :academic_year';
        replacements.academic_year = academic_year;
      }

      if (include_optional === 'false') {
        whereClause += ' AND is_optional = false';
      }

      const sql = `
        SELECT 
          id,
          code,
          description,
          amount,
          quantity,
          (amount * quantity) as total_amount,
          term,
          section,
          class_name,
          class_code,
          revenue_type,
          is_optional,
          status,
          account_type,
          academic_year,
          created_at
        FROM school_revenues 
        ${whereClause}
        ORDER BY revenue_type ASC, description ASC
      `;

      const revenues = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT
      });

      // Group by revenue type (same logic as ORM version)
      const groupedRevenues = revenues.reduce((acc, revenue) => {
        if (!acc[revenue.revenue_type]) {
          acc[revenue.revenue_type] = {
            type: revenue.revenue_type,
            items: [],
            total_amount: 0,
            count: 0
          };
        }
        acc[revenue.revenue_type].items.push(revenue);
        acc[revenue.revenue_type].total_amount += parseFloat(revenue.total_amount || 0);
        acc[revenue.revenue_type].count += 1;
        return acc;
      }, {});

      // Calculate grand total
      const grandTotal = revenues.reduce((sum, revenue) => sum + parseFloat(revenue.total_amount || 0), 0);

      res.json({
        success: true,
        message: 'Class revenues retrieved successfully',
        data: {
          class_code,
          term,
          academic_year,
          grouped_revenues: Object.values(groupedRevenues),
          grand_total: grandTotal,
          total_items: revenues.length
        },
        system: "direct_sql"
      });

    } catch (error) {
      console.error('Error getting class revenues (Direct SQL):', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get class revenues',
        error: error.message
      });
    }
  }

  /**
   * REVENUE ANALYTICS - DIRECT SQL
   * Enhanced analytics with direct SQL queries
   */
  async getRevenueAnalytics(req, res) {
    try {
      const {
        analytics_type = 'summary',
        academic_year,
        term,
        class_code,
        revenue_type
      } = req.query;

      let whereClause = 'WHERE school_id = :school_id AND status = "Active"';
      const replacements = { school_id: req.user.school_id };

      if (academic_year) {
        whereClause += ' AND academic_year = :academic_year';
        replacements.academic_year = academic_year;
      }

      if (term) {
        whereClause += ' AND term = :term';
        replacements.term = term;
      }

      if (class_code) {
        whereClause += ' AND class_code = :class_code';
        replacements.class_code = class_code;
      }

      if (revenue_type) {
        whereClause += ' AND revenue_type = :revenue_type';
        replacements.revenue_type = revenue_type;
      }

      let sql;
      let groupBy;
      let orderBy;

      switch (analytics_type) {
        case 'summary':
          sql = `
            SELECT 
              academic_year,
              term,
              SUM(amount * quantity) as total_amount,
              COUNT(id) as total_items,
              AVG(amount * quantity) as average_amount
            FROM school_revenues 
            ${whereClause}
            GROUP BY academic_year, term
            ORDER BY academic_year DESC, term ASC
          `;
          break;

        case 'by_class':
          sql = `
            SELECT 
              class_code,
              revenue_type,
              SUM(amount * quantity) as total_amount,
              COUNT(id) as total_items
            FROM school_revenues 
            ${whereClause}
            GROUP BY class_code, revenue_type
            ORDER BY class_code ASC, revenue_type ASC
          `;
          break;

        case 'by_type':
          sql = `
            SELECT 
              revenue_type,
              SUM(amount * quantity) as total_amount,
              COUNT(id) as total_items,
              AVG(amount * quantity) as average_amount
            FROM school_revenues 
            ${whereClause}
            GROUP BY revenue_type
            ORDER BY revenue_type ASC
          `;
          break;

        case 'optional_vs_mandatory':
          sql = `
            SELECT 
              is_optional,
              SUM(amount * quantity) as total_amount,
              COUNT(id) as total_items
            FROM school_revenues 
            ${whereClause}
            GROUP BY is_optional
            ORDER BY is_optional ASC
          `;
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid analytics_type. Use: summary, by_class, by_type, optional_vs_mandatory'
          });
      }

      const analyticsData = await sequelize.query(sql, {
        replacements,
        type: QueryTypes.SELECT
      });

      res.json({
        success: true,
        message: 'Revenue analytics generated successfully',
        data: {
          analytics_type,
          filters: { academic_year, term, class_code, revenue_type },
          results: analyticsData
        },
        system: "direct_sql"
      });

    } catch (error) {
      console.error('Error generating revenue analytics (Direct SQL):', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate revenue analytics',
        error: error.message
      });
    }
  }
}

module.exports = new DirectSQLSchoolRevenuesController();