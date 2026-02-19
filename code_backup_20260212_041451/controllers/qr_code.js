const db = require("../models");

const qrCodeController = {
  async manageQRCode(req, res) {
    const {
      query_type,
      qrcode_id,
      user_type,
      expiry_datetime,
      location_is_boolean,
      longitude,
      latitude,
      status,
    } = req.body;

    try {
      let result;

      if (query_type === "create") {
        // Create logic remains unchanged
        if (!req.file) {
          return res.status(400).json({ error: "QR code file is required" });
        }
        const qrCodeUrl = req.file.path;

        result = await db.sequelize.query(
          "CALL manage_qr_code(:query_type, NULL, :qr_code, :user_type, :expiry_datetime, :location_is_boolean, :longitude, :latitude, NULL)",
          {
            replacements: {
              query_type,
              qr_code: qrCodeUrl,
              user_type,
              expiry_datetime,
              location_is_boolean,
              longitude,
              latitude,
            },
          }
        );
        return res.status(201).json({ message: "QR code created successfully" });
      } else if (query_type === "edit" || query_type === "regenerate") {
        // Regeneration logic
        let qrCodeUrl = null;
        if (req.file) {
          qrCodeUrl = req.file.path; // Use the new uploaded QR code if available
        }

        const newExpiry = expiry_datetime || new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(); // Add 1 day if expiry_datetime not provided

        result = await db.sequelize.query(
          "CALL manage_qr_code(:query_type, :qrcode_id, :qr_code, :user_type, :expiry_datetime, :location_is_boolean, :longitude, :latitude, NULL)",
          {
            replacements: {
              query_type,
              qrcode_id,
              qr_code: qrCodeUrl,
              user_type,
              expiry_datetime: newExpiry,
              location_is_boolean,
              longitude,
              latitude,
            },
          }
        );

        return res.status(200).json({ message: "QR code regenerated successfully" });
      } else if (query_type === "delete_one") {
        // Delete one logic remains unchanged
        result = await db.sequelize.query(
          "CALL manage_qr_code(:query_type, :qrcode_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL)",
          {
            replacements: {
              query_type,
              qrcode_id,
            },
          }
        );
        return res.status(200).json({ message: "QR code deleted successfully" });
      } else if (query_type === "delete_all") {
        // Delete all logic remains unchanged
        result = await db.sequelize.query(
          "CALL manage_qr_code(:query_type, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)",
          {
            replacements: { query_type },
          }
        );
        return res.status(200).json({ message: "All QR codes deleted successfully" });
      } else if (query_type === "change_status") {
        // Change status logic remains unchanged
        result = await db.sequelize.query(
          "CALL manage_qr_code(:query_type, :qrcode_id, NULL, NULL, NULL, NULL, NULL, NULL, :status)",
          {
            replacements: { query_type, qrcode_id, status },
          }
        );
        return res.status(200).json({ message: "QR code status updated successfully" });
      } else if (query_type === "get_one") {
        // Get one logic remains unchanged
        result = await db.sequelize.query(
          "CALL manage_qr_code(:query_type, :qrcode_id, NULL, NULL, NULL, NULL, NULL, NULL, NULL)",
          {
            replacements: { query_type, qrcode_id },
          }
        );
        return res.status(200).json(result[0]);
      } else if (query_type === "get_all") {
        // Get all logic remains unchanged
        result = await db.sequelize.query(
          "CALL manage_qr_code(:query_type, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)",
          {
            replacements: { query_type },
          }
        );
        return res.status(200).json(result[0]);
      } else {
        return res.status(400).json({ error: "Invalid query_type provided." });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },
};

module.exports = qrCodeController;
