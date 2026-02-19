const cacheService = require('../services/cacheService');

const cacheMiddleware = (ttl, keyGenerator) => {
  return async (req, res, next) => {
    if (!cacheService.isConnected) {
      return next();
    }

    try {
      const cacheKey = keyGenerator(req);
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        console.log(`✅ Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`❌ Cache MISS: ${cacheKey}`);
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        cacheService.set(cacheKey, data, ttl);
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

const dashboardCache = cacheMiddleware(
  300,
  (req) => cacheService.getDashboardKey(req.user.school_id, req.user.branch_id, req.user.id)
);

const schoolSettingsCache = cacheMiddleware(
  3600,
  (req) => cacheService.getSchoolSettingsKey(req.user.school_id)
);

const userPermissionsCache = cacheMiddleware(
  1800,
  (req) => cacheService.getUserPermissionsKey(req.user.id)
);

const studentListCache = cacheMiddleware(
  600,
  (req) => cacheService.getStudentListKey(req.user.school_id, req.user.branch_id, req.query.class_name)
);

module.exports = {
  cacheMiddleware,
  dashboardCache,
  schoolSettingsCache,
  userPermissionsCache,
  studentListCache
};
