const { upload } = require("../config/multerConfig");
const qrCodeController = require("../controllers/qr_code");

// Route for managing QR codes
module.exports = (app) => {
  // Route for creating a QR code
  app.post(
    "/create-qrcode",
    upload.single("qr_code"), // Middleware to handle file upload
    (req, res) => {
      req.body.query_type = "create";
      req.body.qr_code = req.file ? req.file.path : null; // Uploaded file path
      req.body.user_type = req.body.user_type;
      req.body.expiry_datetime = req.body.expiry_datetime;
      req.body.location_is_boolean = req.body.location_is_boolean || false;
      req.body.longitude = req.body.longitude;
      req.body.latitude = req.body.latitude;
      req.body.status = req.body.status;

      qrCodeController.manageQRCode(req, res);
    }
  );

  // Route for editing an existing QR code
  app.put(
    "/edit-qrcode/:qrcode_id",
    upload.single("qr_code"), // Middleware to handle file upload
    (req, res) => {
      req.body.query_type = "edit";
      req.body.qrcode_id = req.params.qrcode_id;
      req.body.qr_code = req.file ? req.file.path : null; // Uploaded file path
      req.body.user_type = req.body.user_type;
      req.body.expiry_datetime = req.body.expiry_datetime;
      req.body.location_is_boolean = req.body.location_is_boolean || false;
      req.body.longitude = req.body.longitude;
      req.body.latitude = req.body.latitude;
      req.body.status = req.body.status;

      qrCodeController.manageQRCode(req, res);
    }
  );

  // Route for getting a single QR code
  app.get("/get-qrcode/:qrcode_id", (req, res) => {
    req.body.query_type = "get_one";
    req.body.qrcode_id = req.params.qrcode_id;
    qrCodeController.manageQRCode(req, res);
  });

  // Route for getting all QR codes
  app.get("/get-all-qrcodes", (req, res) => {
    req.body.query_type = "get_all";
    qrCodeController.manageQRCode(req, res);
  });

  // Route for deleting one QR code
  app.delete("/delete-qrcode/:qrcode_id", (req, res) => {
    req.body.query_type = "delete_one";
    req.body.qrcode_id = req.params.qrcode_id;
    qrCodeController.manageQRCode(req, res);
  });

  // Route for deleting all QR codes
  app.delete("/delete-all-qrcodes", (req, res) => {
    req.body.query_type = "delete_all";
    qrCodeController.manageQRCode(req, res);
  });

  // Route for changing the status of a QR code
  app.put("/change-status/:qrcode_id", (req, res) => {
    req.body.query_type = "change_status";
    req.body.qrcode_id = req.params.qrcode_id;
    req.body.status = req.body.status;
    qrCodeController.manageQRCode(req, res);
  });
  app.put(
    "/regenerate-qrcode/:qrcode_id",
    upload.single("qr_code"), // Middleware for optional file upload
    (req, res) => {
      req.body.query_type = "edit"; // Use "edit" logic for regeneration
      req.body.qrcode_id = req.params.qrcode_id; // Pass QR code ID
      req.body.expiry_datetime = req.body.expiry_datetime; // New expiry date, optional
      req.body.user_type = req.body.user_type; // User type, optional
      req.body.location_is_boolean = req.body.location_is_boolean || false;
      req.body.longitude = req.body.longitude;
      req.body.latitude = req.body.latitude;

      qrCodeController.manageQRCode(req, res);
    }
  );
};
