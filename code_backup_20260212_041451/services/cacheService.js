const { redisConnection } = require('../utils/redisConnection');

class CacheService {
  async get(key) {
    try {
      const data = await redisConnection.executeCommand('GET', key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 300) {
    try {
      await redisConnection.executeCommand('SETEX', key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await redisConnection.executeCommand('DEL', key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await redisConnection.executeCommand('KEYS', pattern);
      if (keys && keys.length > 0) {
        await redisConnection.executeCommand('DEL', ...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache invalidate error:', error);
      return false;
    }
  }

  async getSchoolSettings(schoolId) {
    const key = `school:${schoolId}:settings`;
    let settings = await this.get(key);
    
    if (!settings) {
      const db = require('../models');
      settings = await db.School.findByPk(schoolId);
      if (settings) {
        await this.set(key, settings, 3600);
      }
    }
    return settings;
  }

  async getFeeStructure(classId) {
    const key = `fee:${classId}`;
    let fees = await this.get(key);
    
    if (!fees) {
      const db = require('../models');
      fees = await db.FeeStructure.findAll({ 
        where: { class_id: classId } 
      });
      if (fees) {
        await this.set(key, fees, 7200);
      }
    }
    return fees;
  }

  async getClassList(schoolId, branchId) {
    const key = `classes:${schoolId}:${branchId}`;
    let classes = await this.get(key);
    
    if (!classes) {
      const db = require('../models');
      classes = await db.Class.findAll({
        where: { school_id: schoolId, branch_id: branchId }
      });
      if (classes) {
        await this.set(key, classes, 600);
      }
    }
    return classes;
  }

  async getStaffList(schoolId, branchId) {
    const key = `staff:${schoolId}:${branchId}`;
    let staff = await this.get(key);
    
    if (!staff) {
      const db = require('../models');
      staff = await db.Staff.findAll({
        where: { school_id: schoolId, branch_id: branchId, status: 'active' }
      });
      if (staff) {
        await this.set(key, staff, 300);
      }
    }
    return staff;
  }

  invalidateSchool(schoolId) {
    return this.invalidatePattern(`*:${schoolId}:*`);
  }

  invalidateFees(classId) {
    return this.del(`fee:${classId}`);
  }

  invalidateClasses(schoolId, branchId) {
    return this.del(`classes:${schoolId}:${branchId}`);
  }

  invalidateStaff(schoolId, branchId) {
    return this.del(`staff:${schoolId}:${branchId}`);
  }
}

module.exports = new CacheService();
