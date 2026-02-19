const db = require('../models');

/**
 * SQL HELPER UTILITY
 * 
 * This utility provides pure SQL alternatives to Sequelize ORM methods
 * to avoid version compatibility issues with .tap() and other method chaining problems.
 * 
 * All methods use raw SQL queries with proper parameter binding for security.
 */

class SQLHelper {
  
  /**
   * Get a raw database connection
   */
  static async getConnection() {
    return await db.sequelize.connectionManager.getConnection();
  }
  
  /**
   * Release a database connection
   */
  static async releaseConnection(connection) {
    if (connection) {
      await db.sequelize.connectionManager.releaseConnection(connection);
    }
  }
  
  /**
   * Start a transaction
   */
  static async startTransaction(connection) {
    await connection.promise().query('START TRANSACTION');
  }
  
  /**
   * Commit a transaction
   */
  static async commit(connection) {
    await connection.promise().query('COMMIT');
  }
  
  /**
   * Rollback a transaction
   */
  static async rollback(connection) {
    await connection.promise().query('ROLLBACK');
  }
  
  /**
   * CREATE operation - Insert a new record
   * @param {string} tableName - Name of the table
   * @param {object} data - Data to insert
   * @param {object} connection - Database connection (optional)
   * @returns {object} - Created record with insertId
   */
  static async create(tableName, data, connection = null) {
    const useConnection = connection || await this.getConnection();
    const shouldReleaseConnection = !connection;
    
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = columns.map(() => '?').join(', ');
      
      const sql = `
        INSERT INTO ${tableName} (${columns.join(', ')}) 
        VALUES (${placeholders})
      `;
      
      const [result] = await useConnection.promise().query(sql, values);
      
      // Get the created record
      if (result.insertId) {
        const [selectResult] = await useConnection.promise().query(
          `SELECT * FROM ${tableName} WHERE id = ? OR item_id = ? OR code = ?`,
          [result.insertId, result.insertId, result.insertId]
        );
        
        if (selectResult.length > 0) {
          return {
            ...selectResult[0],
            insertId: result.insertId
          };
        }
      }
      
      return { insertId: result.insertId, affectedRows: result.affectedRows };
      
    } finally {
      if (shouldReleaseConnection) {
        await this.releaseConnection(useConnection);
      }
    }
  }
  
  /**
   * FIND ONE operation - Get a single record
   * @param {string} tableName - Name of the table
   * @param {object} where - Where conditions
   * @param {object} connection - Database connection (optional)
   * @returns {object|null} - Found record or null
   */
  static async findOne(tableName, where, connection = null) {
    const useConnection = connection || await this.getConnection();
    const shouldReleaseConnection = !connection;
    
    try {
      const conditions = Object.keys(where);
      const values = Object.values(where);
      const whereClause = conditions.map(col => `${col} = ?`).join(' AND ');
      
      const sql = `SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`;
      
      const [result] = await useConnection.promise().query(sql, values);
      
      return result.length > 0 ? result[0] : null;
      
    } finally {
      if (shouldReleaseConnection) {
        await this.releaseConnection(useConnection);
      }
    }
  }
  
  /**
   * FIND ALL operation - Get multiple records
   * @param {string} tableName - Name of the table
   * @param {object} options - Query options (where, limit, offset, orderBy)
   * @param {object} connection - Database connection (optional)
   * @returns {array} - Array of found records
   */
  static async findAll(tableName, options = {}, connection = null) {
    const useConnection = connection || await this.getConnection();
    const shouldReleaseConnection = !connection;
    
    try {
      let sql = `SELECT * FROM ${tableName}`;
      let values = [];
      
      // WHERE clause
      if (options.where && Object.keys(options.where).length > 0) {
        const conditions = Object.keys(options.where);
        const whereValues = Object.values(options.where);
        const whereClause = conditions.map(col => {
          const value = options.where[col];
          if (typeof value === 'object' && value.ne !== undefined) {
            return `${col} != ?`;
          }
          return `${col} = ?`;
        }).join(' AND ');
        
        sql += ` WHERE ${whereClause}`;
        values = whereValues.map(val => typeof val === 'object' && val.ne !== undefined ? val.ne : val);
      }
      
      // ORDER BY clause
      if (options.orderBy) {
        sql += ` ORDER BY ${options.orderBy}`;
      }
      
      // LIMIT clause
      if (options.limit) {
        sql += ` LIMIT ${parseInt(options.limit)}`;
      }
      
      // OFFSET clause
      if (options.offset) {
        sql += ` OFFSET ${parseInt(options.offset)}`;
      }
      
      const [result] = await useConnection.promise().query(sql, values);
      
      return result;
      
    } finally {
      if (shouldReleaseConnection) {
        await this.releaseConnection(useConnection);
      }
    }
  }
  
  /**
   * UPDATE operation - Update records
   * @param {string} tableName - Name of the table
   * @param {object} data - Data to update
   * @param {object} where - Where conditions
   * @param {object} connection - Database connection (optional)
   * @returns {object} - Update result with affectedRows
   */
  static async update(tableName, data, where, connection = null) {
    const useConnection = connection || await this.getConnection();
    const shouldReleaseConnection = !connection;
    
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
      const [result] = await useConnection.promise().query(sql, allValues);
      
      return { affectedRows: result.affectedRows };
      
    } finally {
      if (shouldReleaseConnection) {
        await this.releaseConnection(useConnection);
      }
    }
  }
  
  /**
   * DELETE operation - Delete records (hard delete)
   * @param {string} tableName - Name of the table
   * @param {object} where - Where conditions
   * @param {object} connection - Database connection (optional)
   * @returns {object} - Delete result with affectedRows
   */
  static async destroy(tableName, where, connection = null) {
    const useConnection = connection || await this.getConnection();
    const shouldReleaseConnection = !connection;
    
    try {
      const conditions = Object.keys(where);
      const values = Object.values(where);
      const whereClause = conditions.map(col => `${col} = ?`).join(' AND ');
      
      const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
      
      const [result] = await useConnection.promise().query(sql, values);
      
      return { affectedRows: result.affectedRows };
      
    } finally {
      if (shouldReleaseConnection) {
        await this.releaseConnection(useConnection);
      }
    }
  }
  
  /**
   * SOFT DELETE operation - Update status to deleted
   * @param {string} tableName - Name of the table
   * @param {object} where - Where conditions
   * @param {string} statusColumn - Column name for status (default: 'status')
   * @param {string} deletedValue - Value for deleted status (default: 'Deleted')
   * @param {object} connection - Database connection (optional)
   * @returns {object} - Update result with affectedRows
   */
  static async softDelete(tableName, where, statusColumn = 'status', deletedValue = 'Deleted', connection = null) {
    const updateData = {};
    updateData[statusColumn] = deletedValue;
    
    return await this.update(tableName, updateData, where, connection);
  }
  
  /**
   * COUNT operation - Count records
   * @param {string} tableName - Name of the table
   * @param {object} where - Where conditions (optional)
   * @param {object} connection - Database connection (optional)
   * @returns {number} - Count of records
   */
  static async count(tableName, where = {}, connection = null) {
    const useConnection = connection || await this.getConnection();
    const shouldReleaseConnection = !connection;
    
    try {
      let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
      let values = [];
      
      if (Object.keys(where).length > 0) {
        const conditions = Object.keys(where);
        const whereValues = Object.values(where);
        const whereClause = conditions.map(col => `${col} = ?`).join(' AND ');
        
        sql += ` WHERE ${whereClause}`;
        values = whereValues;
      }
      
      const [result] = await useConnection.promise().query(sql, values);
      
      return result[0].count;
      
    } finally {
      if (shouldReleaseConnection) {
        await this.releaseConnection(useConnection);
      }
    }
  }
  
  /**
   * Execute raw SQL query
   * @param {string} sql - SQL query
   * @param {array} values - Parameter values
   * @param {object} connection - Database connection (optional)
   * @returns {array} - Query result
   */
  static async query(sql, values = [], connection = null) {
    const useConnection = connection || await this.getConnection();
    const shouldReleaseConnection = !connection;
    
    try {
      const [result] = await useConnection.promise().query(sql, values);
      return result;
      
    } finally {
      if (shouldReleaseConnection) {
        await this.releaseConnection(useConnection);
      }
    }
  }
  
  /**
   * Execute a transaction with multiple operations
   * @param {function} operations - Function containing operations to execute
   * @returns {any} - Result of operations function
   */
  static async transaction(operations) {
    const connection = await this.getConnection();
    
    try {
      await this.startTransaction(connection);
      
      const result = await operations(connection);
      
      await this.commit(connection);
      
      return result;
      
    } catch (error) {
      await this.rollback(connection);
      throw error;
      
    } finally {
      await this.releaseConnection(connection);
    }
  }
}

module.exports = SQLHelper;