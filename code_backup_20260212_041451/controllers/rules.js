const db = require("../models");

// Controller for managing rules using the procedure
const RuleController = {
  // Insert a new rule
  async createRule(req, res) {
    const { ruleName, startTime, endTime, locationIsBoolean } = req.body;

    try {
      await db.sequelize.query(
        "CALL ManageRules('insert', NULL, :ruleName, :startTime, :endTime, :locationIsBoolean)",
        {
          replacements: { ruleName, startTime, endTime, locationIsBoolean }
        }
      );
      return res.status(201).json({ message: "Rule created successfully" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Get one rule by ID
  async getRule(req, res) {
    const { id } = req.params;

    try {
      const [rule] = await db.sequelize.query(
        "CALL ManageRules('get_one', :ruleID, NULL, NULL, NULL, NULL)",
        {
          replacements: { ruleID: id }
        }
      );
      if (!rule) {
        return res.status(404).json({ message: "Rule not found" });
      }
      return res.status(200).json(rule);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Get all rules
  async getAllRules(req, res) {
    try {
      const rules = await db.sequelize.query(
        "CALL ManageRules('get_all', NULL, NULL, NULL, NULL, NULL)"
      );
      return res.status(200).json(rules);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Edit a rule
  async updateRule(req, res) {
    const { id } = req.params;
    const { ruleName, startTime, endTime, locationIsBoolean } = req.body;

    try {
      await db.sequelize.query(
        "CALL ManageRules('edit', :ruleID, :ruleName, :startTime, :endTime, :locationIsBoolean)",
        {
          replacements: {
            ruleID: id,
            ruleName,
            startTime,
            endTime,
            locationIsBoolean
          }
        }
      );
      return res.status(200).json({ message: "Rule updated successfully" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Delete a rule
  async deleteRule(req, res) {
    const { id } = req.params;

    try {
      await db.sequelize.query(
        "CALL ManageRules('delete', :ruleID, NULL, NULL, NULL, NULL)",
        {
          replacements: { ruleID: id }
        }
      );
      return res.status(200).json({ message: "Rule deleted successfully" });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};

// const qrCodeController = {
//   manageQRCode: async (req, res) => {
//     const {
//       query_type,
//       qrcode_id,
//       qr_code,
//       user_type,
//       expiry_datetime,
//       location_is_boolean,
//       longitude,
//       latitude,
//       status
//     } = req.body;

//     try {
//       const [rows] = await db.query(
//         `CALL manage_qr_code(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//         [
//           query_type,
//           qrcode_id,
//           qr_code,
//           user_type,
//           expiry_datetime,
//           location_is_boolean,
//           longitude,
//           latitude,
//           status
//         ]
//       );

//       if (query_type === "get_one" || query_type === "get_all") {
//         res.json(rows);
//       } else {
//         res.json({ message: "Operation completed successfully!" });
//       }
//     } catch (error) {
//       console.error("Error managing QR code:", error);
//       res
//         .status(500)
//         .json({ error: "An error occurred while managing the QR code." });
//     }
//   }
// };

module.exports = RuleController;
