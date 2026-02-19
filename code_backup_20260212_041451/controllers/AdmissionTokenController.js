const db = require('../models');
const crypto = require('crypto');

class AdmissionTokenController {
  static generateTokenCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  static async getTokens(req, res) {
    try {
      const school_id = req.user.school_id;
      const branch_id = req.user.branch_id || null;

      const [tokens] = await db.sequelize.query(
        `SELECT *, 
         DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at_formatted,
         DATE_FORMAT(expires_at, '%Y-%m-%d %H:%i:%s') as expires_at_formatted
         FROM admission_tokens 
         WHERE school_id = :school_id 
         AND (:branch_id IS NULL OR :branch_id = '' OR branch_id = :branch_id)
         ORDER BY created_at DESC`,
        { replacements: { school_id, branch_id: branch_id || '' } }
      );

      // Format dates for frontend
      const formattedTokens = tokens.map(token => ({
        ...token,
        created_at: token.created_at_formatted || token.created_at,
        expires_at: token.expires_at_formatted || token.expires_at
      }));

      res.json({ success: true, data: { tokens: formattedTokens } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async generateTokens(req, res) {
    try {
      const { count = 1, usage_limit = 1, expires_at, branch_id } = req.body;
      const school_id = req.user.school_id;
      const created_by = req.user.id;
      const targetBranch = branch_id || req.user.branch_id;
      
      const expiresFormatted = expires_at ? new Date(expires_at).toISOString().slice(0, 19).replace('T', ' ') : null;

      const tokens = [];
      for (let i = 0; i < Math.min(count, 100); i++) {
        const token_code = AdmissionTokenController.generateTokenCode();
        await db.sequelize.query(
          `INSERT INTO admission_tokens (token_code, school_id, branch_id, usage_limit, expires_at, created_by)
           VALUES (:token_code, :school_id, :branch_id, :usage_limit, :expires_at, :created_by)`,
          { replacements: { token_code, school_id, branch_id: targetBranch, usage_limit, expires_at: expiresFormatted, created_by } }
        );
        tokens.push(token_code);
      }

      res.json({ success: true, message: `${tokens.length} token(s) generated`, data: { tokens } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateToken(req, res) {
    try {
      const { id } = req.params;
      const { usage_limit, expires_at } = req.body;
      const school_id = req.user.school_id;
      
      const expiresFormatted = expires_at ? new Date(expires_at).toISOString().slice(0, 19).replace('T', ' ') : null;

      await db.sequelize.query(
        `UPDATE admission_tokens 
         SET usage_limit = :usage_limit, expires_at = :expires_at
         WHERE id = :id AND school_id = :school_id AND used_count = 0 AND status = 'active'`,
        { replacements: { id, usage_limit, expires_at: expiresFormatted, school_id } }
      );

      res.json({ success: true, message: 'Token updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async disableToken(req, res) {
    try {
      const { id } = req.params;
      const school_id = req.user.school_id;

      await db.sequelize.query(
        `UPDATE admission_tokens SET status = 'disabled' WHERE id = :id AND school_id = :school_id`,
        { replacements: { id, school_id } }
      );

      res.json({ success: true, message: 'Token disabled' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async bulkExpireTokens(req, res) {
    try {
      const { token_ids } = req.body;
      const school_id = req.user.school_id;

      if (!token_ids || !Array.isArray(token_ids) || token_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid token IDs' });
      }

      const placeholders = token_ids.map(() => '?').join(',');
      await db.sequelize.query(
        `UPDATE admission_tokens SET status = 'expired' WHERE id IN (${placeholders}) AND school_id = ? AND status = 'active'`,
        { replacements: [...token_ids, school_id] }
      );

      res.json({ success: true, message: `${token_ids.length} tokens expired successfully` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async bulkDisableTokens(req, res) {
    try {
      const { token_ids } = req.body;
      const school_id = req.user.school_id;

      if (!token_ids || !Array.isArray(token_ids) || token_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid token IDs' });
      }

      const placeholders = token_ids.map(() => '?').join(',');
      await db.sequelize.query(
        `UPDATE admission_tokens SET status = 'disabled' WHERE id IN (${placeholders}) AND school_id = ?`,
        { replacements: [...token_ids, school_id] }
      );

      res.json({ success: true, message: `${token_ids.length} tokens disabled successfully` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async bulkEnableTokens(req, res) {
    try {
      const { token_ids } = req.body;
      const school_id = req.user.school_id;

      if (!token_ids || !Array.isArray(token_ids) || token_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid token IDs' });
      }

      const placeholders = token_ids.map(() => '?').join(',');
      await db.sequelize.query(
        `UPDATE admission_tokens SET status = 'active' WHERE id IN (${placeholders}) AND school_id = ?`,
        { replacements: [...token_ids, school_id] }
      );

      res.json({ success: true, message: `${token_ids.length} tokens enabled successfully` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async bulkExtendTokens(req, res) {
    try {
      const { token_ids, expires_at } = req.body;
      const school_id = req.user.school_id;

      if (!token_ids || !Array.isArray(token_ids) || token_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid token IDs' });
      }

      if (!expires_at) {
        return res.status(400).json({ success: false, message: 'Expiry date is required' });
      }

      const expiresFormatted = new Date(expires_at).toISOString().slice(0, 19).replace('T', ' ');
      const placeholders = token_ids.map(() => '?').join(',');
      
      await db.sequelize.query(
        `UPDATE admission_tokens SET expires_at = ? WHERE id IN (${placeholders}) AND school_id = ?`,
        { 
          replacements: [expiresFormatted, ...token_ids, school_id],
          type: db.Sequelize.QueryTypes.UPDATE
        }
      );

      res.json({ success: true, message: `${token_ids.length} tokens extended successfully` });
    } catch (error) {
      console.error('Bulk extend error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async testExtendTokens(req, res) {
    console.log('🧪 testExtendTokens method called');
    
    // Test without any database operations
    try {
      console.log('📝 Request body:', req.body);
      console.log('👤 User:', req.user);
      
      res.json({ 
        success: true, 
        message: 'Test method working',
        body: req.body,
        user: req.user
      });
    } catch (error) {
      console.error('❌ Test error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async extendTokensExpiry(req, res) {
    try {
      const { token_ids, expires_at } = req.body;
      const school_id = req.user.school_id;

      if (!token_ids || !Array.isArray(token_ids) || token_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid token IDs' });
      }

      if (!expires_at) {
        return res.status(400).json({ success: false, message: 'Expiry date is required' });
      }

      const expiresFormatted = new Date(expires_at).toISOString().slice(0, 19).replace('T', ' ');
      let updatedCount = 0;

      for (const tokenId of token_ids) {
        try {
          await db.sequelize.query(
            'UPDATE admission_tokens SET expires_at = :new_expires WHERE id = :token_id AND school_id = :user_school',
            { 
              replacements: { new_expires: expiresFormatted, token_id: tokenId, user_school: school_id }
            }
          );
          updatedCount++;
        } catch (err) {
          console.error(`Failed to update token ${tokenId}:`, err);
        }
      }

      res.json({ success: true, message: `${updatedCount} tokens extended successfully` });
    } catch (error) {
      console.error('Extend tokens error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async validateToken(req, res) {
    try {
      const { token_code, branch_id } = req.body;

      const [tokens] = await db.sequelize.query(
        `SELECT * FROM admission_tokens 
         WHERE token_code = :token_code 
         AND branch_id = :branch_id
         AND status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())`,
        { replacements: { token_code, branch_id } }
      );

      if (tokens.length === 0) {
        return res.json({ success: false, valid: false, message: 'Invalid or expired token' });
      }

      res.json({ success: true, valid: true, token: tokens[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async useToken(req, res) {
    try {
      const { token_code, branch_id } = req.body;

      const [result] = await db.sequelize.query(
        `UPDATE admission_tokens 
         SET used_count = used_count + 1,
             status = CASE WHEN used_count + 1 >= usage_limit THEN 'used' ELSE status END
         WHERE token_code = :token_code 
         AND branch_id = :branch_id
         AND status = 'active'
         AND (expires_at IS NULL OR expires_at > NOW())
         AND used_count < usage_limit`,
        { replacements: { token_code, branch_id } }
      );

      res.json({ success: true, message: 'Token used' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const school_id = req.user.school_id;
      const branch_id = req.user.branch_id || '';

      const [stats] = await db.sequelize.query(
        `SELECT 
          COUNT(*) as total,
          SUM(status = 'active') as active,
          SUM(status = 'used') as used,
          SUM(status = 'expired') as expired,
          SUM(status = 'disabled') as disabled
         FROM admission_tokens 
         WHERE school_id = :school_id 
         AND (:branch_id = '' OR branch_id = :branch_id)`,
        { replacements: { school_id, branch_id } }
      );

      res.json({ success: true, data: stats[0] });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = AdmissionTokenController;
