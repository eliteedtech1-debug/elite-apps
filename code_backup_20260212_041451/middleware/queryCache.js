const { redisConnection } = require('../utils/redisConnection');

const queryCacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const userId = req.user?.id || 'anonymous';
    const schoolId = req.headers['x-school-id'] || req.user?.school_id || '';
    const branchId = req.headers['x-branch-id'] || req.user?.branch_id || '';
    
    const cacheKey = `qcache:${req.originalUrl}:${userId}:${schoolId}:${branchId}`;
    
    try {
      const cached = await redisConnection.executeCommand('GET', cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        res.setHeader('X-Cache', 'HIT');
        return res.json(data);
      }

      const originalJson = res.json.bind(res);
      
      res.json = (data) => {
        redisConnection.executeCommand('SETEX', cacheKey, duration, JSON.stringify(data))
          .catch(err => console.error('Cache set error:', err));
        
        res.setHeader('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Query cache error:', error);
      next();
    }
  };
};

const invalidateQueryCache = async (pattern) => {
  try {
    const keys = await redisConnection.executeCommand('KEYS', `qcache:${pattern}*`);
    if (keys && keys.length > 0) {
      await redisConnection.executeCommand('DEL', ...keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

module.exports = { queryCacheMiddleware, invalidateQueryCache };
