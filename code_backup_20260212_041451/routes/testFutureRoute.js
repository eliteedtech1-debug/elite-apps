/**
 * Test Future Route
 * This route demonstrates that new routes are automatically protected
 */

module.exports = (app) => {
  // Test route that should work without any configuration
  app.get('/test-future-route', (req, res) => {
    res.json({
      success: true,
      message: 'Future route protection is working!',
      timestamp: new Date().toISOString(),
      note: 'This route was added to test the future route protection system',
      features: [
        'Automatically protected from middleware interception',
        'No manual configuration required',
        'Works immediately upon creation',
        'Comprehensive logging and monitoring'
      ]
    });
  });

  // Test route with parameters
  app.get('/test-future-route/:id', (req, res) => {
    res.json({
      success: true,
      message: 'Future route with parameters is working!',
      id: req.params.id,
      timestamp: new Date().toISOString(),
      note: 'This demonstrates that parameterized routes are also protected'
    });
  });

  // Test POST route
  app.post('/test-future-route', (req, res) => {
    res.json({
      success: true,
      message: 'Future POST route is working!',
      body: req.body,
      timestamp: new Date().toISOString(),
      note: 'This demonstrates that POST routes are also protected'
    });
  });

  // Test route that might need authentication (but won't be blocked)
  app.get('/test-future-route/protected', (req, res) => {
    res.json({
      success: true,
      message: 'Protected future route is working!',
      user: req.user || null,
      timestamp: new Date().toISOString(),
      note: 'This route tries authentication but never gets blocked',
      authStatus: req.user ? 'Authenticated' : 'Not authenticated (but still allowed)'
    });
  });

  console.log('✅ Test future routes registered successfully');
};