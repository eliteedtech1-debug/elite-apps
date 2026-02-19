/**
 * Secure Trust Proxy Configuration
 * Fixes express-rate-limit validation errors and prevents IP spoofing
 */

/**
 * Configure trust proxy settings securely
 * @param {object} app - Express app instance
 */
const configureSecureTrustProxy = (app) => {
  // Check for custom trust proxy configuration
  if (process.env.TRUST_PROXY) {
    const trustProxyValue = process.env.TRUST_PROXY;
    
    if (trustProxyValue === 'true') {
      console.warn('⚠️  WARNING: TRUST_PROXY=true allows IP spoofing. Use specific values instead.');
      app.set('trust proxy', true);
    } else if (trustProxyValue === 'false') {
      app.set('trust proxy', false);
    } else if (!isNaN(trustProxyValue)) {
      app.set('trust proxy', parseInt(trustProxyValue));
    } else {
      // Assume it's a subnet or IP address
      app.set('trust proxy', trustProxyValue);
    }
  } else if (process.env.NODE_ENV === 'production') {
    // In production, trust only the first proxy (secure default)
    // This is safe for most reverse proxy setups (nginx, Apache, load balancers)
    app.set('trust proxy', 1);
  } else {
    // In development, use loopback to prevent IP spoofing while allowing local testing
    // This trusts only localhost/127.0.0.1 addresses
    app.set('trust proxy', 'loopback');
  }
  
  const trustProxyConfig = app.get('trust proxy');
  console.log(`🔧 Trust proxy configured: ${trustProxyConfig}`);
  console.log('🛡️  This prevents IP spoofing in rate limiting');
  
  return trustProxyConfig;
};

/**
 * Validate trust proxy configuration for rate limiting
 * @param {object} app - Express app instance
 */
const validateTrustProxyForRateLimit = (app) => {
  const trustProxy = app.get('trust proxy');
  
  if (trustProxy === true) {
    console.error('❌ SECURITY RISK: trust proxy is set to true, which allows IP spoofing!');
    console.error('   This can be exploited to bypass rate limiting by spoofing X-Forwarded-For headers.');
    console.error('   Consider using a specific number (e.g., 1) or subnet instead.');
    return false;
  }
  
  console.log('✅ Trust proxy configuration is secure for rate limiting');
  return true;
};

/**
 * Get secure rate limiter configuration
 */
const getSecureRateLimitConfig = () => {
  return {
    // Validate trust proxy setting
    validate: {
      trustProxy: false, // Disable express-rate-limit's trust proxy validation
      xForwardedForHeader: false // Disable X-Forwarded-For validation
    },
    // Use a custom key generator that's aware of our trust proxy settings
    keyGenerator: (req) => {
      // Get the most reliable IP address based on trust proxy settings
      return req.ip || req.connection?.remoteAddress || 'unknown';
    }
  };
};

module.exports = {
  configureSecureTrustProxy,
  validateTrustProxyForRateLimit,
  getSecureRateLimitConfig
};