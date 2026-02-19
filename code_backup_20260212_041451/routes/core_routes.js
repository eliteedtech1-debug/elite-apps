/** 
 * Core Application Routes
 * Basic system routes like health check and default route
 * NOTE: /verify-token is handled in user routes for proper authentication
 */

module.exports = (app) => {
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: require('../../package.json').version
    });
  });

  // Default route
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Elite Scholar API - School Management System',
      version: require('../../package.json').version,
      endpoints: {
        health: '/health',
        verifyToken: '/verify-token',
        api: '/api/*',
        docs: '/docs',
        support: '/api/support/*'
      }
    });
  });

};