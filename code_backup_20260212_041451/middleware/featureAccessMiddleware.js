const { errorResponse } = require('../utils/responseHandler');

// Feature access control middleware
const checkFeatureAccess = (featureName) => {
  return (req, res, next) => {
    // In a real implementation, this would check if the school has access to the feature
    // For now, I'll implement a basic check based on user role and a system config
    const user = req.user;
    
    // Check if the user's school has access to this feature
    // This would typically check a features table or configuration that indicates
    // which features are enabled for the specific school
    const schoolId = user.school_id;
    
    // Placeholder implementation - in reality, this would query a features table
    // to check if the feature is enabled for this school
    const enabledFeatures = getEnabledFeaturesForSchool(schoolId);
    
    if (!enabledFeatures.includes(featureName)) {
      return errorResponse(res, `Feature '${featureName}' is not enabled for your school`, 403);
    }
    
    next();
  };
};

// Placeholder function to get enabled features for a school
// In reality, this would query the database
function getEnabledFeaturesForSchool(schoolId) {
  // This is a simplified implementation
  // In a real system, this would query a features table
  // that maps school_id to enabled features
  return [
    'AssetManagement',
    'InventoryManagement',
    'Finance', 
    'Academic',
    'HRM',
    'Library',
    'Transport',
    'Hostel',
    'Examinations'
  ]; // Return all features as enabled by default
}

module.exports = {
  checkFeatureAccess
};