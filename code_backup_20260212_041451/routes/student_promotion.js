const passport = require('passport');
const { promoteStudents, getPromotionHistory } = require('../controllers/student_promotion_controller');

module.exports = (app) => {
  /**
   * POST /students/promote
   * Promote or graduate students
   */
  app.post(
    '/students/promote',
    passport.authenticate('jwt', { session: false }),
    promoteStudents
  );

  /**
   * GET /students/promotion-history
   * Get promotion history for a school/branch
   */
  app.get(
    '/students/promotion-history',
    passport.authenticate('jwt', { session: false }),
    getPromotionHistory
  );
};
