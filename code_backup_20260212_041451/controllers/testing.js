const db = require("../models");

const testing = async (req, res) => {
  const { age = null, name = null, email = null } = req.body;
  db.sequelize
    .query(
      `insert into testing (age, name, email) 
        values (:age, :name, :email)`,
      {
        replacements: {
          age,
          name,
          email,
        },
      }
    )
    .then((results) => {
      res.json({ success: true, message: "testing data created successfully" });
    })
    .catch((err) => {
      console.log(err);
      res
        .status(500)
        .json({ success: false, message: "error creating testing data" });
    });
};
module.exports = { testing };
