/**
 * CA/Exam Date Calculation Utilities
 *
 * Provides functions for:
 * - Computing scheduled dates based on week numbers
 * - Computing submission deadlines
 * - Validating week numbers
 * - Checking for scheduling conflicts
 */

/**
 * Compute scheduled date based on academic year start and week number
 * @param {Date|string} academicYearStart - Academic year start date
 * @param {number} weekNumber - Week number (1-52)
 * @returns {Date} Scheduled date
 */
function computeScheduledDate(academicYearStart, weekNumber) {
  const startDate = new Date(academicYearStart);
  const scheduledDate = new Date(startDate);

  // Add weeks to start date
  scheduledDate.setDate(startDate.getDate() + (weekNumber * 7));

  return scheduledDate;
}

/**
 * Compute submission deadline based on scheduled date and CA type
 * @param {Date|string} scheduledDate - The scheduled CA/Exam date
 * @param {string} caType - CA1, CA2, CA3, CA4, or EXAM
 * @returns {Date} Deadline date for question submission
 */
function computeDeadlineDate(scheduledDate, caType) {
  const scheduled = new Date(scheduledDate);
  const deadline = new Date(scheduled);

  // CA: 3 weeks before scheduled date
  // EXAM: 4 weeks before scheduled date
  const weeksBeforeCA = 3;
  const weeksBeforeExam = 4;

  const weeksBefore = caType === 'EXAM' ? weeksBeforeExam : weeksBeforeCA;

  // Subtract weeks from scheduled date
  deadline.setDate(scheduled.getDate() - (weeksBefore * 7));

  return deadline;
}

/**
 * Validate if week number falls within academic year
 * @param {number} weekNumber - Week number to validate
 * @param {Date|string} academicYearStart - Academic year start date
 * @param {Date|string} academicYearEnd - Academic year end date
 * @returns {Object} { valid: boolean, message: string }
 */
function validateWeekNumber(weekNumber, academicYearStart, academicYearEnd) {
  if (weekNumber < 1 || weekNumber > 52) {
    return {
      valid: false,
      message: 'Week number must be between 1 and 52'
    };
  }

  const scheduledDate = computeScheduledDate(academicYearStart, weekNumber);
  const endDate = new Date(academicYearEnd);
  const startDate = new Date(academicYearStart);

  if (scheduledDate > endDate) {
    return {
      valid: false,
      message: `Week ${weekNumber} falls after academic year end (${endDate.toDateString()})`
    };
  }

  if (scheduledDate < startDate) {
    return {
      valid: false,
      message: `Week ${weekNumber} falls before academic year start (${startDate.toDateString()})`
    };
  }

  return {
    valid: true,
    message: 'Week number is valid'
  };
}

/**
 * Check for overlapping CA schedules
 * @param {Array} existingSetups - Array of existing CA setup objects with week_number
 * @param {number} newWeekNumber - New week number to check
 * @param {number} excludeId - ID to exclude from check (for updates)
 * @returns {Object} { hasConflict: boolean, conflictingSetup: object|null }
 */
function checkOverlappingSchedules(existingSetups, newWeekNumber, excludeId = null) {
  // Allow same week for different CA types (CA1, CA2, CA3, EXAM)
  // But warn if they're too close (within 1 week)

  const conflicts = existingSetups.filter(setup => {
    if (excludeId && setup.id === excludeId) {
      return false; // Exclude current setup from conflict check
    }

    const weekDiff = Math.abs(setup.week_number - newWeekNumber);
    return weekDiff === 0; // Exact same week
  });

  if (conflicts.length > 0) {
    return {
      hasConflict: true,
      conflictingSetup: conflicts[0],
      message: `Week ${newWeekNumber} is already scheduled for ${conflicts[0].ca_type}`
    };
  }

  // Check for near conflicts (within 1 week)
  const nearConflicts = existingSetups.filter(setup => {
    if (excludeId && setup.id === excludeId) {
      return false;
    }

    const weekDiff = Math.abs(setup.week_number - newWeekNumber);
    return weekDiff === 1;
  });

  if (nearConflicts.length > 0) {
    return {
      hasConflict: false,
      hasWarning: true,
      warningSetup: nearConflicts[0],
      message: `Warning: Week ${newWeekNumber} is only 1 week away from ${nearConflicts[0].ca_type} (Week ${nearConflicts[0].week_number})`
    };
  }

  return {
    hasConflict: false,
    message: 'No scheduling conflicts'
  };
}

/**
 * Get days remaining until deadline
 * @param {Date|string} deadline - Deadline date
 * @returns {number} Days remaining (negative if past deadline)
 */
function getDaysRemaining(deadline) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if deadline has passed
 * @param {Date|string} deadline - Deadline date
 * @returns {boolean} True if deadline has passed
 */
function isDeadlinePassed(deadline) {
  return getDaysRemaining(deadline) < 0;
}

/**
 * Calculate both scheduled date and deadline at once
 * @param {Date|string} academicYearStart - Academic year start date
 * @param {number} weekNumber - Week number
 * @param {string} caType - CA type
 * @returns {Object} { scheduledDate: Date, deadlineDate: Date, daysUntilDeadline: number }
 */
function calculateCADates(academicYearStart, weekNumber, caType) {
  const scheduledDate = computeScheduledDate(academicYearStart, weekNumber);
  const deadlineDate = computeDeadlineDate(scheduledDate, caType);
  const daysUntilDeadline = getDaysRemaining(deadlineDate);

  return {
    scheduledDate,
    deadlineDate,
    daysUntilDeadline,
    isPastDeadline: daysUntilDeadline < 0
  };
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date (DD MMM YYYY)
 */
function formatDate(date) {
  const d = new Date(date);
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-GB', options);
}

/**
 * Get urgency level based on days remaining
 * @param {number} daysRemaining - Days until deadline
 * @returns {string} 'urgent' | 'warning' | 'normal'
 */
function getUrgencyLevel(daysRemaining) {
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 3) return 'urgent';
  if (daysRemaining <= 7) return 'warning';
  if (daysRemaining <= 14) return 'approaching';
  return 'normal';
}

module.exports = {
  computeScheduledDate,
  computeDeadlineDate,
  validateWeekNumber,
  checkOverlappingSchedules,
  getDaysRemaining,
  isDeadlinePassed,
  calculateCADates,
  formatDate,
  getUrgencyLevel
};
