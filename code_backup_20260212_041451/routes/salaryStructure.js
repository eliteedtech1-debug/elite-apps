// routes/salaryRoutes.js
const controller = require("../controllers/salaryStructure");

const { authenticate, authorize } = require('../middleware/auth');
module.exports = (app) => {
  // CRUD for Grade Levels
  app.post("/salary-structures/grades", authenticate, authorize(['admin','branchadmin']), controller.createGradeLevel);
  app.get("/salary-structures/grades", authenticate, authorize(['admin','branchadmin','Admin','BranchAdmin']), controller.getGradeLevels);
  app.put("/salary-structures/grades/:id", authenticate, authorize(['admin','branchadmin']), controller.updateGradeLevel);
  app.delete("/salary-structures/grades/:id", authenticate, authorize(['admin','branchadmin']), controller.deleteGradeLevel);

  

  // Analytics
  app.get("/salary-structures/analytics", authenticate, authorize(['admin','branchadmin']), controller.getAnalytics);
};
