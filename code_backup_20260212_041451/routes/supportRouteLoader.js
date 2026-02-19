'use strict';

module.exports = (app) => {
  try {
    const supportRoutes = require('../routes/supportRoutes');
    
    // Mount support routes
    app.use('/api/support', supportRoutes);
    
  } catch (error) {
    console.error('❌ Error loading support routes:', error);
  }
};