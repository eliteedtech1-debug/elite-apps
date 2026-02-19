const db = require("../models");

/**
 * Cultural Schedule Service for Nigerian Schools
 * Handles Islamic prayer times, cultural events, and religious considerations
 */
class CulturalScheduleService {
  
  constructor() {
    // Default Nigerian prayer times (can be customized per school)
    this.defaultPrayerTimes = {
      fajr: '05:30',
      dhuhr: '12:30',
      asr: '15:30',
      maghrib: '18:00',
      isha: '19:30',
      jummah: '12:00' // Friday special prayer
    };
    
    // Nigerian cultural events and holidays
    this.nigerianHolidays = [
      { name: 'New Year Day', date: '01-01', type: 'national' },
      { name: 'Independence Day', date: '10-01', type: 'national' },
      { name: 'Democracy Day', date: '06-12', type: 'national' },
      { name: 'Workers Day', date: '05-01', type: 'national' },
      { name: 'Christmas Day', date: '12-25', type: 'christian' },
      { name: 'Boxing Day', date: '12-26', type: 'christian' },
      { name: 'Good Friday', date: 'variable', type: 'christian' },
      { name: 'Easter Monday', date: 'variable', type: 'christian' },
      { name: 'Eid al-Fitr', date: 'variable', type: 'islamic' },
      { name: 'Eid al-Adha', date: 'variable', type: 'islamic' },
      { name: 'Maulud Nabiyy', date: 'variable', type: 'islamic' }
    ];
  }
  
  /**
   * Get prayer times for Islamic schools
   */
  async getPrayerTimes(schoolId, date = null) {
    try {
      // Check if school has custom prayer times
      const [customTimes] = await db.sequelize.query(
        `SELECT configuration_data FROM school_time_configurations 
         WHERE school_id = :schoolId AND configuration_type = 'prayer_times' AND is_active = TRUE 
         ORDER BY created_at DESC LIMIT 1`,
        {
          replacements: { schoolId },
          type: db.sequelize.QueryTypes.SELECT
        }
      );
      
      let prayerTimes = this.defaultPrayerTimes;
      
      if (customTimes && customTimes.configuration_data) {
        const configData = typeof customTimes.configuration_data === 'string' 
          ? JSON.parse(customTimes.configuration_data) 
          : customTimes.configuration_data;
        prayerTimes = { ...prayerTimes, ...configData };
      }
      
      // Adjust for specific date if provided (for seasonal variations)
      if (date) {
        prayerTimes = this.adjustPrayerTimesForDate(prayerTimes, date);
      }
      
      return { success: true, data: prayerTimes };
    } catch (error) {
      console.error('Error fetching prayer times:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Integrate prayer times into school schedule
   */
  async integratePrayerTimes(timeSlots, schoolId) {
    try {
      const prayerTimesResult = await this.getPrayerTimes(schoolId);
      if (!prayerTimesResult.success) {
        return { success: false, error: 'Failed to get prayer times' };
      }
      
      const prayerTimes = prayerTimesResult.data;
      const integratedSlots = [...timeSlots];
      
      // Add prayer slots for school hours
      const schoolHours = this.getSchoolHours(timeSlots);
      
      // Add Dhuhr prayer if it falls during school hours
      if (this.isTimeInRange(prayerTimes.dhuhr, schoolHours.start, schoolHours.end)) {
        const dhuhrSlot = this.createPrayerSlot('Dhuhr Prayer', prayerTimes.dhuhr, schoolId);
        integratedSlots.push(dhuhrSlot);
      }
      
      // Add Asr prayer if it falls during school hours
      if (this.isTimeInRange(prayerTimes.asr, schoolHours.start, schoolHours.end)) {
        const asrSlot = this.createPrayerSlot('Asr Prayer', prayerTimes.asr, schoolId);
        integratedSlots.push(asrSlot);
      }
      
      // Special handling for Friday Jummah prayer
      const jummahSlot = this.createJummahSlot(prayerTimes.jummah, schoolId);
      integratedSlots.push(jummahSlot);
      
      return { success: true, data: integratedSlots };
    } catch (error) {
      console.error('Error integrating prayer times:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get Ramadan schedule adjustments
   */
  getRamadanAdjustments() {
    return {
      schoolStartTime: '08:30', // Later start during Ramadan
      schoolEndTime: '13:30',   // Earlier end for fasting
      reducedPeriods: true,
      shorterBreaks: true,
      noLunchBreak: true,       // No lunch during fasting
      extendedPrayerTime: true,
      adjustments: {
        periodDuration: 35,     // Shorter periods
        breakDuration: 10,      // Shorter breaks
        prayerDuration: 20      // Longer prayer time
      }
    };
  }
  
  /**
   * Apply cultural event adjustments
   */
  async applyCulturalEventAdjustments(timeSlots, schoolId, date) {
    try {
      const culturalEvents = await this.getCulturalEventsForDate(schoolId, date);
      let adjustedSlots = [...timeSlots];
      
      for (const event of culturalEvents) {
        switch (event.type) {
          case 'national_holiday':
            // No school on national holidays
            adjustedSlots = [];
            break;
            
          case 'islamic_celebration':
            // Shorter day with extended prayer time
            adjustedSlots = this.adjustForIslamicCelebration(adjustedSlots);
            break;
            
          case 'christian_celebration':
            // Assembly time extended for special prayers
            adjustedSlots = this.adjustForChristianCelebration(adjustedSlots);
            break;
            
          case 'cultural_festival':
            // Include cultural activities
            adjustedSlots = this.addCulturalActivities(adjustedSlots, event);
            break;
        }
      }
      
      return { success: true, data: adjustedSlots };
    } catch (error) {
      console.error('Error applying cultural adjustments:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Helper methods
   */
  createPrayerSlot(name, time, schoolId) {
    const endTime = this.addMinutes(time, 20); // 20 minutes for prayer
    
    return {
      slot_id: `PRAYER_${name.replace(/\s+/g, '_')}_${schoolId}`,
      school_id: schoolId,
      slot_name: name,
      start_time: time,
      end_time: endTime,
      duration_minutes: 20,
      slot_type: 'Prayer',
      cultural_significance: 'prayer',
      is_flexible: false,
      priority: 10, // Highest priority
      activities: 'Prayer'
    };
  }
  
  createJummahSlot(time, schoolId) {
    const endTime = this.addMinutes(time, 45); // 45 minutes for Jummah
    
    return {
      slot_id: `JUMMAH_PRAYER_${schoolId}`,
      school_id: schoolId,
      slot_name: 'Jummah Prayer',
      start_time: time,
      end_time: endTime,
      duration_minutes: 45,
      slot_type: 'Prayer',
      cultural_significance: 'prayer',
      is_flexible: false,
      priority: 10,
      day_of_week: 'Friday',
      activities: 'Jummah Prayer'
    };
  }
  
  getSchoolHours(timeSlots) {
    const times = timeSlots.map(slot => this.timeToMinutes(slot.start_time));
    const startTimes = timeSlots.map(slot => this.timeToMinutes(slot.end_time));
    
    return {
      start: this.minutesToTime(Math.min(...times)),
      end: this.minutesToTime(Math.max(...startTimes))
    };
  }
  
  isTimeInRange(time, startTime, endTime) {
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }
  
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  addMinutes(timeStr, minutesToAdd) {
    const totalMinutes = this.timeToMinutes(timeStr) + minutesToAdd;
    return this.minutesToTime(totalMinutes);
  }
  
  adjustPrayerTimesForDate(prayerTimes, date) {
    // Seasonal adjustments for prayer times
    // This is a simplified version - in production, use proper Islamic calendar calculations
    const month = new Date(date).getMonth() + 1;
    
    // Harmattan season adjustments (November - February)
    if (month >= 11 || month <= 2) {
      return {
        ...prayerTimes,
        fajr: this.addMinutes(prayerTimes.fajr, 15), // Later Fajr in cold season
        dhuhr: this.addMinutes(prayerTimes.dhuhr, -10) // Earlier Dhuhr
      };
    }
    
    return prayerTimes;
  }
  
  async getCulturalEventsForDate(schoolId, date) {
    // This would typically query a cultural events database
    // For now, return Nigerian holidays that match the date
    const dateStr = new Date(date).toISOString().slice(5, 10); // MM-DD format
    
    return this.nigerianHolidays.filter(holiday => 
      holiday.date === dateStr || holiday.date === 'variable'
    );
  }
  
  adjustForIslamicCelebration(timeSlots) {
    return timeSlots.map(slot => {
      if (slot.slot_type === 'Academic') {
        return { ...slot, duration_minutes: Math.max(30, slot.duration_minutes - 10) };
      }
      if (slot.slot_type === 'Prayer') {
        return { ...slot, duration_minutes: slot.duration_minutes + 15 };
      }
      return slot;
    });
  }
  
  adjustForChristianCelebration(timeSlots) {
    return timeSlots.map(slot => {
      if (slot.slot_name.includes('Assembly')) {
        return { ...slot, duration_minutes: slot.duration_minutes + 20 };
      }
      return slot;
    });
  }
  
  addCulturalActivities(timeSlots, event) {
    // Add cultural activity slot
    const culturalSlot = {
      slot_id: `CULTURAL_${event.name.replace(/\s+/g, '_')}`,
      slot_name: `Cultural Activity: ${event.name}`,
      start_time: '14:00',
      end_time: '14:45',
      duration_minutes: 45,
      slot_type: 'Activity',
      cultural_significance: 'cultural',
      activities: 'Cultural Activity'
    };
    
    return [...timeSlots, culturalSlot];
  }
}

module.exports = new CulturalScheduleService();
