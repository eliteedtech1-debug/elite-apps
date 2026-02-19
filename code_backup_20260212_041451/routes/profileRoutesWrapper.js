const passport = require('passport');
const profileRoutes = require('./profileRoutes');

module.exports = (app) => {
  // Mount the profile routes under /api/profile with authentication
  app.use('/api/profile', passport.authenticate('jwt', { session: false }), profileRoutes);
};