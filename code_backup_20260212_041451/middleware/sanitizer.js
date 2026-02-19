const sanitizeHtml = require('sanitize-html');

const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove HTML tags from text fields
        req.body[key] = sanitizeHtml(req.body[key], {
          allowedTags: [],
          allowedAttributes: {}
        }).trim();
      }
    });
  }
  next();
};

const validateRemarkLength = (req, res, next) => {
  if (req.body?.remarks && req.body.remarks.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Remarks must be 500 characters or less'
    });
  }
  next();
};

module.exports = { sanitizeInput, validateRemarkLength };
