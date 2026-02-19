const db = require('../models');
const logger = require('../logging/Logger');

class PaymentGatewayConfigController {
  static async getAllConfigs(req, res) {
    try {
      const configs = await db.sequelize.query(
        `SELECT 
          config_id as id, school_id, gateway_name,
          is_active, is_test_mode, school_payment_integration,
          created_at, updated_at
        FROM payment_gateway_config
        ORDER BY school_id, created_at DESC`,
        { type: db.Sequelize.QueryTypes.SELECT }
      );

      res.json({ success: true, data: configs });
    } catch (error) {
      logger.error('Error fetching payment gateway configs', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getConfigBySchool(req, res) {
    try {
      const { schoolId } = req.params;

      const [config] = await db.sequelize.query(
        `SELECT * FROM payment_gateway_config WHERE school_id = ? LIMIT 1`,
        { replacements: [schoolId], type: db.Sequelize.QueryTypes.SELECT }
      );

      res.json({ success: true, data: config || null });
    } catch (error) {
      logger.error('Error fetching school gateway config', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateConfig(req, res) {
    try {
      const { id } = req.params;
      const { school_payment_integration, is_active, is_test_mode } = req.body;

      await db.sequelize.query(
        `UPDATE payment_gateway_config 
         SET school_payment_integration = ?, is_active = ?, is_test_mode = ?
         WHERE config_id = ?`,
        { replacements: [school_payment_integration, is_active, is_test_mode, id] }
      );

      res.json({ success: true, message: 'Configuration updated successfully' });
    } catch (error) {
      logger.error('Error updating gateway config', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createConfig(req, res) {
    try {
      const { school_id, gateway_name, school_payment_integration, is_active, is_test_mode } = req.body;

      const [result] = await db.sequelize.query(
        `INSERT INTO payment_gateway_config 
         (school_id, gateway_name, config_data, school_payment_integration, is_active, is_test_mode)
         VALUES (?, ?, '{}', ?, ?, ?)`,
        { replacements: [school_id, gateway_name || 'remita', school_payment_integration, is_active, is_test_mode] }
      );

      res.json({ success: true, message: 'Configuration created successfully', id: result.insertId });
    } catch (error) {
      logger.error('Error creating gateway config', { error: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = PaymentGatewayConfigController;
