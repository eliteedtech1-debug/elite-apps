const { testing } = require("../controllers/testing");

module.exports = (app) => {
  app.post("/testing", testing);
};
