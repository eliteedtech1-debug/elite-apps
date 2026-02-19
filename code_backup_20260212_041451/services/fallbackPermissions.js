const db = require('../models');

// Default permissions by subscription tier and user type
const DEFAULT_PERMISSIONS = {
  // Standard tier permissions
  standard: {
    admin: {
      STUDENT_MANAGEMENT: { view: true, create: true, edit: true, delete: false },
      COLLECT_FEES: { view: true, create: true, edit: false, delete: false },
      BASIC_REPORTS: { view: true, create: false, edit: false, delete: false },
      CLASS_MANAGEMENT: { view: true, create: true, edit: true, delete: false }
    },
    teacher: {
      STUDENT_MANAGEMENT: { view: true, create: false, edit: false, delete: false },
      CLASS_MANAGEMENT: { view: true, create: false, edit: false, delete: false },
      ATTENDANCE: { view: true, create: true, edit: true, delete: false }
    },
    student: {
      VIEW_PROFILE: { view: true, create: false, edit: false, delete: false },
      VIEW_RESULTS: { view: true, create: false, edit: false, delete: false }
    }
  },
  
  // Premium tier permissions (extends standard)
  premium: {
    admin: {
      STUDENT_MANAGEMENT: { view: true, create: true, edit: true, delete: true },
      COLLECT_FEES: { view: true, create: true, edit: true, delete: false },
      BASIC_REPORTS: { view: true, create: true, edit: false, delete: false },
      ADVANCED_REPORTS: { view: true, create: false, edit: false, delete: false },
      CLASS_MANAGEMENT: { view: true, create: true, edit: true, delete: true },
      PAYROLL: { view: true, create: true, edit: true, delete: false }
    },
    teacher: {
      STUDENT_MANAGEMENT: { view: true, create: false, edit: true, delete: false },
      CLASS_MANAGEMENT: { view: true, create: true, edit: true, delete: false },
      ATTENDANCE: { view: true, create: true, edit: true, delete: false },
      GRADEBOOK: { view: true, create: true, edit: true, delete: false }
    },
    student: {
      VIEW_PROFILE: { view: true, create: false, edit: true, delete: false },
      VIEW_RESULTS: { view: true, create: false, edit: false, delete: false },
      VIRTUAL_CLASSROOM: { view: true, create: false, edit: false, delete: false }
    }
  },
  
  // Elite tier permissions (full access)
  elite: {
    admin: {
      STUDENT_MANAGEMENT: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
      COLLECT_FEES: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
      BASIC_REPORTS: { view: true, create: true, edit: true, delete: false, export: true },
      ADVANCED_REPORTS: { view: true, create: true, edit: true, delete: false, export: true },
      CLASS_MANAGEMENT: { view: true, create: true, edit: true, delete: true, export: true },
      PAYROLL: { view: true, create: true, edit: true, delete: true, export: true, approve: true },
      ANALYTICS: { view: true, create: true, edit: true, delete: false, export: true }
    },
    teacher: {
      STUDENT_MANAGEMENT: { view: true, create: true, edit: true, delete: false, export: true },
      CLASS_MANAGEMENT: { view: true, create: true, edit: true, delete: true },
      ATTENDANCE: { view: true, create: true, edit: true, delete: true, export: true },
      GRADEBOOK: { view: true, create: true, edit: true, delete: false, export: true },
      LESSON_PLANS: { view: true, create: true, edit: true, delete: true }
    },
    student: {
      VIEW_PROFILE: { view: true, create: false, edit: true, delete: false },
      VIEW_RESULTS: { view: true, create: false, edit: false, delete: false, export: true },
      VIRTUAL_CLASSROOM: { view: true, create: true, edit: false, delete: false },
      ASSIGNMENTS: { view: true, create: true, edit: true, delete: false }
    }
  }
};

const getSchoolSubscriptionTier = async (schoolId) => {
  try {
    const result = await db.sequelize.query(
      `SELECT sp.pricing_name 
       FROM school_subscriptions ss
       JOIN subscription_pricing sp ON ss.pricing_plan_id = sp.id
       WHERE ss.school_id = :school_id 
       AND ss.status = 'active'
       ORDER BY ss.created_at DESC
       LIMIT 1`,
      {
        replacements: { school_id: schoolId },
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    if (result.length > 0) {
      const planName = result[0].pricing_name.toLowerCase();
      if (planName.includes('standard')) return 'standard';
      if (planName.includes('premium')) return 'premium';
      if (planName.includes('elite')) return 'elite';
    }
    
    // Default to standard if no subscription found
    return 'standard';
  } catch (error) {
    console.error('Error getting subscription tier:', error);
    return 'standard'; // Fail-safe default
  }
};

const getFallbackPermissions = async (userType, schoolId) => {
  const tier = await getSchoolSubscriptionTier(schoolId);
  const normalizedUserType = userType?.toLowerCase();
  
  // For admin types, use admin permissions
  if (['admin', 'branchadmin', 'superadmin', 'developer'].includes(normalizedUserType)) {
    return DEFAULT_PERMISSIONS[tier]?.admin || DEFAULT_PERMISSIONS.standard.admin;
  }
  
  // For other user types, use their specific permissions
  return DEFAULT_PERMISSIONS[tier]?.[normalizedUserType] || DEFAULT_PERMISSIONS.standard[normalizedUserType] || {};
};

module.exports = {
  DEFAULT_PERMISSIONS,
  getSchoolSubscriptionTier,
  getFallbackPermissions
};
