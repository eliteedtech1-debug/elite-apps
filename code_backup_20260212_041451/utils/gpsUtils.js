/**
 * GPS Utility Functions for Staff Attendance
 * 
 * This module provides GPS-related utility functions for calculating distances
 * and validating staff location during login for attendance marking.
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * 
 * @param {number} lat1 - Latitude of first point (school)
 * @param {number} lon1 - Longitude of first point (school)
 * @param {number} lat2 - Latitude of second point (staff)
 * @param {number} lon2 - Longitude of second point (staff)
 * @returns {number} Distance in meters
 * 
 * Formula explanation:
 * The Haversine formula determines the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 * 
 * a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
 * c = 2 ⋅ atan2( √a, √(1−a) )
 * d = R ⋅ c
 * 
 * where φ is latitude, λ is longitude, R is earth's radius (6371km)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  // Validate inputs
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error('Invalid GPS coordinates provided');
  }

  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180; // Convert latitude 1 to radians
  const φ2 = (lat2 * Math.PI) / 180; // Convert latitude 2 to radians
  const Δφ = ((lat2 - lat1) * Math.PI) / 180; // Difference in latitude
  const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Difference in longitude

  // Haversine formula
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in meters

  return Math.round(distance); // Return rounded distance
}

/**
 * Validate GPS coordinates
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {boolean} True if coordinates are valid
 */
function isValidCoordinate(lat, lon) {
  // Latitude must be between -90 and 90
  // Longitude must be between -180 and 180
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Check if staff is within allowed radius of school
 * 
 * @param {number} schoolLat - School latitude
 * @param {number} schoolLon - School longitude
 * @param {number} staffLat - Staff latitude
 * @param {number} staffLon - Staff longitude
 * @param {number} allowedRadius - Allowed radius in meters (default: 80)
 * @returns {object} Object with isWithinRadius boolean and distance number
 */
function isWithinRadius(schoolLat, schoolLon, staffLat, staffLon, allowedRadius = 80) {
  try {
    const distance = calculateDistance(schoolLat, schoolLon, staffLat, staffLon);
    
    return {
      isWithinRadius: distance <= allowedRadius,
      distance: distance,
      allowedRadius: allowedRadius
    };
  } catch (error) {
    console.error('Error calculating distance:', error);
    throw error;
  }
}

/**
 * Format distance for display
 * 
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string
 */
function formatDistance(meters) {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

/**
 * Get GPS validation error message
 * 
 * @param {number} distance - Actual distance in meters
 * @param {number} allowedRadius - Allowed radius in meters
 * @returns {string} User-friendly error message
 */
function getGPSErrorMessage(distance, allowedRadius) {
  return `You are ${formatDistance(distance)} away from school premises. ` +
         `You must be within ${formatDistance(allowedRadius)} to log in and mark attendance.`;
}

module.exports = {
  calculateDistance,
  isValidCoordinate,
  isWithinRadius,
  formatDistance,
  getGPSErrorMessage
};
