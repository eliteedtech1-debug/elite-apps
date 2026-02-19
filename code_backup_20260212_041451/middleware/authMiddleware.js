// Unified authentication middleware for the supply management system
const jwt = require('jsonwebtoken');
const db = require('../models');

// Authenticate token middleware
const authenticateToken = async (req, res, next) => {
  try {
    // For development purposes, we'll use a simple mock
    // In production, this would verify a JWT token

    // Check for token in header, query, or body
    let token = req.headers['x-access-token'] || req.headers['authorization'];

    // If token starts with 'Bearer ', remove it
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7, token.length);
    }

    if (!token) {
      // For development, create a mock user if no token is provided
      req.user = {
        id: 1,
        user_type: 'Admin',
        school_id: 'SCH/1',
        branch_id: null,
        name: 'Admin User'
      };
      return next();
    }

    // In a real implementation, verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || 'dev_secret_key');
    console.log('🔍 Decoded JWT token:', decoded);

    // Check if token expires within 15 minutes (auto-refresh threshold)
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    const shouldRefresh = timeUntilExpiry < 900; // 15 minutes = 900 seconds

    // Find the user in the database
    const users = await db.sequelize.query(
      `SELECT id, name, email, user_type, school_id, branch_id FROM users WHERE id = ?`,
      {
        replacements: [decoded.id],
        type: db.sequelize.QueryTypes.SELECT
      }
    );

    console.log('🔍 User query result:', users);

    if (!users || users.length === 0) {
      console.log('❌ User not found for ID:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = users[0];

    // Auto-refresh token if needed
    if (shouldRefresh) {
      const { generateSessionToken } = require('./sessionAuth');
      const newToken = generateSessionToken(req.user);
      res.setHeader('X-New-Token', newToken);
      console.log('🔄 Token auto-refreshed for user:', req.user.id);
    }
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        message: 'Token is invalid'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while validating user'
    });
  }
};

// Authorize roles middleware
const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.user_type || req.user.role;
    
    // Convert allowedRoles to array if it's a string
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    
    // Check if user role is in allowed roles
    const hasPermission = roles.some(role => 
      role.toLowerCase() === userRole.toLowerCase() ||
      role.toLowerCase() === 'all' ||  // Special case: 'all' allows all roles
      role.toLowerCase() === req.user.user_type?.toLowerCase() // Match exact user type
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${userRole}`
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};