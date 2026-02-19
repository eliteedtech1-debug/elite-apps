const enhancedFeesController = require('../controllers/enhanced_fees_controller');

module.exports = function(app) {
  // Family billing route that matches the UI expectation
  app.get('/school/families/billing',
    (req, res, next) => {
      // Add default values for testing
      req.query.school_id = req.query.school_id;
      req.query.branch_id = req.query.branch_id;
      next();
    },
    enhancedFeesController.getFamilyBills
  );

  // Family discount application route
  app.post('/school/families/apply-discount',
    enhancedFeesController.applyFamilyDiscount
  );

  // Family payment processing route
  app.post('/school/families/process-payment',
    enhancedFeesController.processPayment
  );

  // Bill adjustment route
  app.post('/school/bills/apply-adjustment',
    enhancedFeesController.adjustBill
  );
};