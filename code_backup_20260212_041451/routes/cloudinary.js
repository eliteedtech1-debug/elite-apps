const cloudinaryServices = require("../services/cloudinaryServices");


module.exports = (app) => {
    app.post("/upload-file", cloudinaryServices.uploadFile);

    // Route to upload text to Cloudinary
    app.post("/upload-text", cloudinaryServices.uploadText);
  };
  