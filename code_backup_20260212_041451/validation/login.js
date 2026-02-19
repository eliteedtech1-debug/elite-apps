const isEmpty = require("./isEmpty");

module.exports = function validateLoginForm(data) {
  let errors = {};

  // Ensure values are strings if they exist
  data.username = !isEmpty(data.username) ? data.username.toString() : '';
  data.password = !isEmpty(data.password) ? data.password.toString() : '';
  data.school_id = !isEmpty(data.school_id) ? data.school_id.toString() : '';

  // Email/Username checks
  if (isEmpty(data.username)) {
    errors.username = "Email/Username field is required";
  }

  // Password checks
  if (isEmpty(data.password)) {
    errors.password = "Password field is required";
  }

  // School ID checks
  if (isEmpty(data.school_id)) {
    errors.school_id = "School ID field is required";
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};