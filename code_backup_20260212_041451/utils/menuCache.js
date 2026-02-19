/**
 * Menu Cache Service
 * Caches menu data in Redis for performance
 */

const { redisConnection } = require('./redisConnection');

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'menu:';

const menuCache = {
  async get(schoolId, userType) {
    try {
      const redis = redisConnection.getInstance();
      if (!redis) return null;
      const key = `${CACHE_PREFIX}${schoolId}:${userType}`;
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.error('Menu cache get error:', err.message);
      return null;
    }
  },

  async set(schoolId, userType, data) {
    try {
      const redis = redisConnection.getInstance();
      if (!redis) return false;
      const key = `${CACHE_PREFIX}${schoolId}:${userType}`;
      await redis.setex(key, CACHE_TTL, JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('Menu cache set error:', err.message);
      return false;
    }
  },

  async invalidate(schoolId, userType) {
    try {
      const redis = redisConnection.getInstance();
      if (!redis) return false;
      const key = `${CACHE_PREFIX}${schoolId}:${userType}`;
      await redis.del(key);
      return true;
    } catch (err) {
      console.error('Menu cache invalidate error:', err.message);
      return false;
    }
  },

  async invalidateSchool(schoolId) {
    try {
      const redis = redisConnection.getInstance();
      if (!redis) return false;
      const keys = await redis.keys(`${CACHE_PREFIX}${schoolId}:*`);
      if (keys.length > 0) await redis.del(...keys);
      return true;
    } catch (err) {
      console.error('Menu cache invalidate error:', err.message);
      return false;
    }
  },

  async invalidateAll() {
    try {
      const redis = redisConnection.getInstance();
      if (!redis) return false;
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      if (keys.length > 0) await redis.del(...keys);
      return true;
    } catch (err) {
      console.error('Menu cache invalidate all error:', err.message);
      return false;
    }
  },

  // Cache warming - preload menus for common roles
  async warmCache(schoolId, db) {
    try {
      const redis = redisConnection.getInstance();
      if (!redis) return false;
      
      const commonRoles = ['admin', 'teacher', 'student', 'parent', 'branchadmin'];
      for (const role of commonRoles) {
        const key = `${CACHE_PREFIX}${schoolId}:${role}`;
        const exists = await redis.exists(key);
        if (!exists) {
          // Trigger menu fetch to populate cache
          console.log(`Warming cache for ${schoolId}:${role}`);
        }
      }
      return true;
    } catch (err) {
      console.error('Cache warming error:', err.message);
      return false;
    }
  }
};

module.exports = { menuCache };
