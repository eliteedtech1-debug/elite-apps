const db = require('../models');
const { QueryTypes } = require('sequelize');

class IdCardTemplateController {
  static async createTemplate(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { template_name, template_type = 'student', layout_config, school_logo_url, background_image_url } = req.body;

      const template = await db.IdCardTemplate.create({
        school_id,
        branch_id,
        template_name,
        template_type,
        layout_config,
        school_logo_url,
        background_image_url,
        created_by: req.user.id
      });

      res.status(201).json({ 
        success: true, 
        message: 'Template created successfully',
        data: template 
      });
    } catch (error) {
      console.error('Create template error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getTemplates(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { template_type } = req.query;

      let whereClause = { school_id, branch_id, is_active: true };
      if (template_type) {
        whereClause.template_type = template_type;
      }

      const templates = await db.IdCardTemplate.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']]
      });

      res.json({ 
        success: true, 
        data: templates,
        count: templates.length 
      });
    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getTemplate(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { id } = req.params;

      const template = await db.IdCardTemplate.findOne({
        where: { id, school_id, branch_id, is_active: true }
      });

      if (!template) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      res.json({ success: true, data: template });
    } catch (error) {
      console.error('Get template error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateTemplate(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { id } = req.params;

      const [updated] = await db.IdCardTemplate.update(req.body, {
        where: { id, school_id, branch_id, is_active: true }
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      const template = await db.IdCardTemplate.findByPk(id);
      res.json({ 
        success: true, 
        message: 'Template updated successfully',
        data: template 
      });
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async deleteTemplate(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { id } = req.params;

      const [updated] = await db.IdCardTemplate.update(
        { is_active: false },
        { where: { id, school_id, branch_id } }
      );

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Template not found' });
      }

      res.json({ 
        success: true, 
        message: 'Template deleted successfully' 
      });
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getDefaultTemplate(req, res) {
    try {
      const { school_id, branch_id } = req.user;
      const { template_type = 'student' } = req.query;

      const template = await db.sequelize.query(`
        SELECT * FROM id_card_templates 
        WHERE school_id = :school_id 
          AND branch_id = :branch_id 
          AND template_type = :template_type 
          AND is_active = true 
        ORDER BY is_default DESC, created_at DESC 
        LIMIT 1
      `, {
        replacements: { school_id, branch_id, template_type },
        type: QueryTypes.SELECT
      });

      if (!template.length) {
        return res.status(404).json({ success: false, error: 'No default template found' });
      }

      res.json({ success: true, data: template[0] });
    } catch (error) {
      console.error('Get default template error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = IdCardTemplateController;