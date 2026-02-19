  const RuleController = require("../controllers/rules");

  module.exports = (app) => {
    app.post("/rules", RuleController.createRule); // Create a rule
    app.get("/rules/:id", RuleController.getRule); // Get one rule
    app.get("/rules", RuleController.getAllRules); // Get all rules
    app.put("/rules/:id", RuleController.updateRule); // Edit a rule
    app.delete("/rules/:id", RuleController.deleteRule); // Delete a rule
  };
