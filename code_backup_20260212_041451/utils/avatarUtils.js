/**
 * Avatar Utility Functions
 * Provides static avatar generation for users when no avatar is available
 */

/**
 * Generate a static avatar URL using UI Avatars service
 * @param {string} participantType - 'teacher' or 'student'
 * @param {string} participantName - Name to generate avatar for
 * @param {Object} options - Additional options for avatar generation
 * @returns {string} Avatar URL
 */
function generateStaticAvatar(participantType, participantName, options = {}) {
  const {
    size = 128,
    format = 'png',
    bold = true,
    rounded = false
  } = options;

  // Define color schemes for different user types
  const colorSchemes = {
    teacher: {
      background: '4f46e5', // Indigo
      color: 'ffffff'       // White
    },
    student: {
      background: '06b6d4', // Cyan
      color: 'ffffff'       // White
    },
    admin: {
      background: 'dc2626', // Red
      color: 'ffffff'       // White
    },
    parent: {
      background: '059669', // Emerald
      color: 'ffffff'       // White
    },
    default: {
      background: '6b7280', // Gray
      color: 'ffffff'       // White
    }
  };

  // Get color scheme for participant type
  const scheme = colorSchemes[participantType] || colorSchemes.default;

  // Build avatar URL parameters
  const params = new URLSearchParams({
    name: participantName,
    background: scheme.background,
    color: scheme.color,
    size: size.toString(),
    format: format,
    bold: bold.toString(),
    rounded: rounded.toString()
  });

  return `https://ui-avatars.com/api/?${params.toString()}`;
}

/**
 * Get avatar URL with fallback to static generation
 * @param {string|null} userAvatar - User's existing avatar URL (could be passport_url or user_avatar)
 * @param {string} participantType - 'teacher' or 'student'
 * @param {string} participantName - Name to generate avatar for
 * @param {Object} options - Additional options for avatar generation
 * @returns {string} Avatar URL (existing or generated)
 */
function getAvatarWithFallback(userAvatar, participantType, participantName, options = {}) {
  // Return existing avatar if provided and valid (not empty string)
  if (userAvatar && typeof userAvatar === 'string' && userAvatar.trim() !== '' && userAvatar.trim() !== '""') {
    const trimmedAvatar = userAvatar.trim();
    // Remove quotes if present (in case of JSON string values)
    const cleanAvatar = trimmedAvatar.replace(/^"|"$/g, '');
    if (cleanAvatar !== '') {
      return cleanAvatar;
    }
  }

  // Generate static avatar as fallback
  return generateStaticAvatar(participantType, participantName, options);
}

/**
 * Generate avatar for virtual classroom participants
 * @param {string} participantType - 'teacher' or 'student'
 * @param {string} participantName - Name to generate avatar for
 * @param {string|null} userAvatar - User's existing avatar URL
 * @returns {string} Avatar URL
 */
function getVirtualClassroomAvatar(participantType, participantName, userAvatar = null) {
  return getAvatarWithFallback(userAvatar, participantType, participantName, {
    size: 128,
    format: 'png',
    bold: participantType === 'teacher', // Bold for teachers
    rounded: false
  });
}

/**
 * Generate avatar for profile display
 * @param {string} userType - User type
 * @param {string} userName - User name
 * @param {string|null} userAvatar - User's existing avatar URL
 * @param {number} size - Avatar size in pixels
 * @returns {string} Avatar URL
 */
function getProfileAvatar(userType, userName, userAvatar = null, size = 64) {
  return getAvatarWithFallback(userAvatar, userType, userName, {
    size: size,
    format: 'png',
    bold: false,
    rounded: true
  });
}

/**
 * Validate avatar URL
 * @param {string} avatarUrl - Avatar URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidAvatarUrl(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') {
    return false;
  }

  try {
    const url = new URL(avatarUrl);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Get initials from name for avatar generation
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') {
    return 'U';
  }

  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

module.exports = {
  generateStaticAvatar,
  getAvatarWithFallback,
  getVirtualClassroomAvatar,
  getProfileAvatar,
  isValidAvatarUrl,
  getInitials
};