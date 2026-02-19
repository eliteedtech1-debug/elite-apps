/**
 * Session Management Routes
 * Handles token refresh and session validation
 */

const { authenticateWithSession, generateRefreshedToken, SESSION_CONFIG } = require('../middleware/sessionAuth');

module.exports = (app) => {
  /**
   * Refresh JWT token and update lastActivity timestamp
   * POST /auth/refresh-token
   */
  app.post('/auth/refresh-token', authenticateWithSession, (req, res) => {
    try {
      // Generate new token with updated lastActivity
      const refreshedToken = generateRefreshedToken(req.user);
      
      const now = Date.now();
      const lastActivity = new Date(req.user.lastActivity).getTime();
      const timeSinceLastActivity = now - lastActivity;
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: refreshedToken,
          lastActivity: new Date().toISOString(),
          timeRemaining: SESSION_CONFIG.INACTIVITY_TIMEOUT - timeSinceLastActivity,
          user: {
            id: req.user.id,
            user_type: req.user.user_type,
            school_id: req.user.school_id,
            branch_id: req.user.branch_id
          }
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        code: 'REFRESH_ERROR'
      });
    }
  });

  /**
   * Check session status without refreshing
   * GET /auth/session-status
   */
  app.get('/auth/session-status', authenticateWithSession, (req, res) => {
    try {
      const now = Date.now();
      const lastActivity = new Date(req.user.lastActivity).getTime();
      const timeSinceLastActivity = now - lastActivity;
      const timeRemaining = SESSION_CONFIG.INACTIVITY_TIMEOUT - timeSinceLastActivity;
      
      res.json({
        success: true,
        data: {
          isValid: timeRemaining > 0,
          timeRemaining: Math.max(0, timeRemaining),
          lastActivity: req.user.lastActivity,
          shouldWarn: timeSinceLastActivity > SESSION_CONFIG.WARNING_THRESHOLD,
          warningThreshold: SESSION_CONFIG.WARNING_THRESHOLD,
          timeoutDuration: SESSION_CONFIG.INACTIVITY_TIMEOUT,
          user: {
            id: req.user.id,
            user_type: req.user.user_type,
            school_id: req.user.school_id,
            branch_id: req.user.branch_id
          }
        }
      });
    } catch (error) {
      console.error('Session status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session status',
        code: 'SESSION_STATUS_ERROR'
      });
    }
  });

  /**
   * Logout and invalidate session
   * POST /auth/logout
   */
  app.post('/auth/logout', (req, res) => {
    // Since we're using stateless JWT, we just return success
    // In a production environment, you might want to maintain a blacklist of tokens
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });

  /**
   * Extend session by updating lastActivity
   * POST /auth/extend-session
   */
  app.post('/auth/extend-session', authenticateWithSession, (req, res) => {
    try {
      // Generate new token with updated lastActivity
      const refreshedToken = generateRefreshedToken(req.user);
      
      res.json({
        success: true,
        message: 'Session extended successfully',
        data: {
          token: refreshedToken,
          lastActivity: new Date().toISOString(),
          timeRemaining: SESSION_CONFIG.INACTIVITY_TIMEOUT,
          expiresAt: new Date(Date.now() + SESSION_CONFIG.INACTIVITY_TIMEOUT).toISOString()
        }
      });
    } catch (error) {
      console.error('Session extension error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to extend session',
        code: 'EXTEND_SESSION_ERROR'
      });
    }
  });
};