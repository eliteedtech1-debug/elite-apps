/**
 * QUERY HELPER UTILITY
 * 
 * Provides standardized db.sequelize.query() wrappers for all class-based controllers
 * to eliminate Sequelize ORM .tap compatibility issues.
 * 
 * This replaces all .create(), .findOne(), .findAll(), .update(), .destroy() operations
 * with reliable db.sequelize.query() calls.
 */

const db = require('../models');

class QueryHelper {
  
  /**
   * INSERT operation - Create new records
   * @param {string} tableName - Name of the table
   * @param {object|array} data - Data to insert (single object or array of objects)
   * @returns {object} - Insert result with insertId(s)
   */
  static async insert(tableName, data) {
    try {
      if (Array.isArray(data)) {
        // Bulk insert
        const results = [];
        for (const item of data) {
          const result = await this.insert(tableName, item);
          results.push(result);
        }
        return results;
      }
      
      // Single insert
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => '?').join(', ');
      
      const sql = `
        INSERT INTO ${tableName} (${columns.join(', ')}) 
        VALUES (${placeholders})
      `;
      
      const [result] = await db.sequelize.query(sql, {
        replacements: values,
        type: db.sequelize.QueryTypes.INSERT
      });
      
      return {
        insertId: result,
        affectedRows: 1,
        ...data
      };
      
    } catch (error) {
      console.error(`❌ QueryHelper.insert error for ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * SELECT operation - Find records
   * @param {string} tableName - Name of the table
   * @param {object} options - Query options
   * @returns {array} - Array of found records
   */
  static async select(tableName, options = {}) {
    try {
      let sql = `SELECT * FROM ${tableName}`;
      let replacements = [];
      
      // WHERE clause
      if (options.where && Object.keys(options.where).length > 0) {
        const conditions = [];
        Object.entries(options.where).forEach(([key, value]) => {
          if (value && typeof value === 'object' && value.ne !== undefined) {
            conditions.push(`${key} != ?`);
            replacements.push(value.ne);
          } else if (value && typeof value === 'object' && value.in !== undefined) {
            const placeholders = value.in.map(() => '?').join(', ');
            conditions.push(`${key} IN (${placeholders})`);
            replacements.push(...value.in);
          } else if (value && typeof value === 'object' && value.like !== undefined) {
            conditions.push(`${key} LIKE ?`);
            replacements.push(value.like);
          } else {
            conditions.push(`${key} = ?`);
            replacements.push(value);
          }
        });
        
        if (conditions.length > 0) {
          sql += ` WHERE ${conditions.join(' AND ')}`;
        }
      }
      
      // ORDER BY clause
      if (options.order) {
        if (Array.isArray(options.order)) {
          const orderClauses = options.order.map(([column, direction]) => `${column} ${direction || 'ASC'}`);
          sql += ` ORDER BY ${orderClauses.join(', ')}`;
        } else {
          sql += ` ORDER BY ${options.order}`;
        }
      }
      
      // LIMIT clause
      if (options.limit) {
        sql += ` LIMIT ${parseInt(options.limit)}`;
      }
      
      // OFFSET clause
      if (options.offset) {
        sql += ` OFFSET ${parseInt(options.offset)}`;
      }
      
      const [results] = await db.sequelize.query(sql, {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      });
      
      return results;
      
    } catch (error) {
      console.error(`❌ QueryHelper.select error for ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * SELECT ONE operation - Find single record
   * @param {string} tableName - Name of the table
   * @param {object} where - Where conditions
   * @returns {object|null} - Found record or null
   */
  static async selectOne(tableName, where) {
    try {
      const results = await this.select(tableName, { where, limit: 1 });
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error(`❌ QueryHelper.selectOne error for ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * UPDATE operation - Update records
   * @param {string} tableName - Name of the table
   * @param {object} data - Data to update
   * @param {object} where - Where conditions
   * @returns {object} - Update result with affectedRows
   */
  static async update(tableName, data, where) {
    try {
      const setColumns = Object.keys(data);
      const setValues = Object.values(data);
      const setClause = setColumns.map(col => `${col} = ?`).join(', ');
      
      const whereColumns = Object.keys(where);
      const whereValues = Object.values(where);
      const whereClause = whereColumns.map(col => `${col} = ?`).join(' AND ');
      
      const sql = `
        UPDATE ${tableName} 
        SET ${setClause}, updated_at = NOW() 
        WHERE ${whereClause}
      `;
      
      const allValues = [...setValues, ...whereValues];
      const [result] = await db.sequelize.query(sql, {
        replacements: allValues,
        type: db.sequelize.QueryTypes.UPDATE
      });
      
      return { affectedRows: result };
      
    } catch (error) {
      console.error(`❌ QueryHelper.update error for ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * DELETE operation - Delete records
   * @param {string} tableName - Name of the table
   * @param {object} where - Where conditions
   * @returns {object} - Delete result with affectedRows
   */
  static async delete(tableName, where) {
    try {
      const conditions = Object.keys(where);
      const values = Object.values(where);
      const whereClause = conditions.map(col => `${col} = ?`).join(' AND ');
      
      const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
      
      const [result] = await db.sequelize.query(sql, {
        replacements: values,
        type: db.sequelize.QueryTypes.DELETE
      });
      
      return { affectedRows: result };
      
    } catch (error) {
      console.error(`❌ QueryHelper.delete error for ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * COUNT operation - Count records
   * @param {string} tableName - Name of the table
   * @param {object} where - Where conditions (optional)
   * @returns {number} - Count of records
   */
  static async count(tableName, where = {}) {
    try {
      let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
      let replacements = [];
      
      if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where);
        const whereValues = Object.values(where);
        const whereClause = conditions.map(col => `${col} = ?`).join(' AND ');
        
        sql += ` WHERE ${whereClause}`;
        replacements = whereValues;
      }
      
      const [result] = await db.sequelize.query(sql, {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      });
      
      return result[0].count;
      
    } catch (error) {
      console.error(`❌ QueryHelper.count error for ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * AGGREGATE operation - Perform aggregations (SUM, AVG, etc.)
   * @param {string} tableName - Name of the table
   * @param {object} options - Aggregation options
   * @returns {object} - Aggregation results
   */
  static async aggregate(tableName, options = {}) {
    try {
      const { 
        select = ['*'], 
        where = {}, 
        groupBy = [], 
        having = {},
        orderBy = []
      } = options;
      
      let sql = `SELECT ${select.join(', ')} FROM ${tableName}`;
      let replacements = [];
      
      // WHERE clause
      if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where);
        const whereValues = Object.values(where);
        const whereClause = conditions.map(col => `${col} = ?`).join(' AND ');
        
        sql += ` WHERE ${whereClause}`;
        replacements = whereValues;
      }
      
      // GROUP BY clause
      if (groupBy.length > 0) {
        sql += ` GROUP BY ${groupBy.join(', ')}`;
      }
      
      // HAVING clause
      if (Object.keys(having).length > 0) {
        const havingConditions = Object.keys(having);
        const havingValues = Object.values(having);
        const havingClause = havingConditions.map(col => `${col} = ?`).join(' AND ');
        
        sql += ` HAVING ${havingClause}`;
        replacements.push(...havingValues);
      }
      
      // ORDER BY clause
      if (orderBy.length > 0) {
        const orderClauses = orderBy.map(([column, direction]) => `${column} ${direction || 'ASC'}`);
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }
      
      const [results] = await db.sequelize.query(sql, {
        replacements,
        type: db.sequelize.QueryTypes.SELECT
      });
      
      return results;
      
    } catch (error) {
      console.error(`❌ QueryHelper.aggregate error for ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * RAW QUERY operation - Execute custom SQL
   * @param {string} sql - Raw SQL query
   * @param {array} replacements - Parameter replacements
   * @param {string} type - Query type (SELECT, INSERT, UPDATE, DELETE)
   * @returns {any} - Query results
   */
  static async raw(sql, replacements = [], type = 'SELECT') {
    try {
      const queryType = db.sequelize.QueryTypes[type.toUpperCase()] || db.sequelize.QueryTypes.SELECT;
      
      const [results] = await db.sequelize.query(sql, {
        replacements,
        type: queryType
      });
      
      return results;
      
    } catch (error) {
      console.error(`❌ QueryHelper.raw error:`, error.message);
      throw error;
    }
  }
  
  /**
   * BULK OPERATIONS - Efficient bulk insert/update/delete
   */
  static async bulkInsert(tableName, dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return { affectedRows: 0 };
    }
    
    try {
      const columns = Object.keys(dataArray[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const valueRows = dataArray.map(() => `(${placeholders})`).join(', ');
      
      const sql = `
        INSERT INTO ${tableName} (${columns.join(', ')}) 
        VALUES ${valueRows}
      `;
      
      const allValues = dataArray.flatMap(item => Object.values(item));
      
      const [result] = await db.sequelize.query(sql, {
        replacements: allValues,
        type: db.sequelize.QueryTypes.INSERT
      });
      
      return { affectedRows: dataArray.length, insertId: result };
      
    } catch (error) {
      console.error(`❌ QueryHelper.bulkInsert error for ${tableName}:`, error.message);
      throw error;
    }
  }
}

module.exports = QueryHelper;