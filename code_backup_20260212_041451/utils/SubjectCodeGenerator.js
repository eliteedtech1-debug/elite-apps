/**
 * Resilient Subject Code Generator
 * Multi-tier fallback system that ensures subject operations never halt
 * due to code generation failures.
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class SubjectCodeGenerator {
  constructor(db) {
    this.db = db;
    this.config = {
      enableCustomGenerator: true,
      enableTimestampFallback: true,
      enableHashFallback: true,
      enableUUIDFallback: true,
      maxRetries: 3,
      logFallbacks: true
    };
  }

  /**
   * Generate a unique subject code with multiple fallback strategies
   * @param {string} school_id - School identifier
   * @param {string} branch_id - Branch identifier
   * @param {string} subject_name - Subject name (optional, for hash-based generation)
   * @param {string} section - Section (optional)
   * @returns {Promise<string>} - Unique subject code
   */
  async generateSubjectCode(school_id, branch_id, subject_name = '', section = '') {
    const strategies = [
      // Strategy 1: Custom number generator (existing logic)
      () => this.tryCustomGenerator(school_id, branch_id),
      
      // Strategy 2: Timestamp-based with collision handling
      () => this.generateTimestampBased(school_id, branch_id),
      
      // Strategy 3: Hash-based deterministic generation
      () => this.generateHashBased(school_id, branch_id, subject_name, section),
      
      // Strategy 4: UUID-based (never fails)
      () => this.generateUUIDBased(school_id, branch_id)
    ];

    let lastError = null;
    
    for (let i = 0; i < strategies.length; i++) {
      const strategyName = this.getStrategyName(i);
      
      try {
        console.log(`🔄 Attempting subject code generation with strategy: ${strategyName}`);
        
        const code = await strategies[i]();
        
        if (code && await this.isCodeUnique(code, school_id, branch_id)) {
          if (i > 0 && this.config.logFallbacks) {
            console.warn(`⚠️ Subject code generated using fallback strategy: ${strategyName}`);
            // Log to monitoring system
            this.logFallbackUsage(strategyName, school_id, branch_id, i);
          }
          
          console.log(`✅ Subject code generated successfully: ${code} (strategy: ${strategyName})`);
          return code;
        }
        
        // Code generated but not unique, try next strategy
        console.warn(`⚠️ Generated code not unique with ${strategyName}, trying next strategy`);
        
      } catch (error) {
        lastError = error;
        console.warn(`❌ Strategy ${strategyName} failed:`, error.message);
        
        // If this is the custom generator, don't treat it as critical
        if (i === 0) {
          console.log(`📝 Custom generator unavailable, proceeding with fallback strategies`);
        }
        
        continue; // Try next strategy
      }
    }
    
    // All strategies failed - this should never happen with UUID fallback
    const errorMessage = `All subject code generation strategies failed. Last error: ${lastError?.message}`;
    console.error(`🚨 CRITICAL: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  /**
   * Strategy 1: Try existing custom number generator
   */
  async tryCustomGenerator(school_id, branch_id) {
    if (!this.config.enableCustomGenerator) {
      throw new Error('Custom generator disabled');
    }

    try {
      // Call your existing custom generator logic
      // This is where your current db.Subject.generateSubjectCode logic would go
      const result = await this.db.sequelize.query(
        "CALL generate_subject_code(?, ?)",
        {
          replacements: [school_id, branch_id],
          type: this.db.sequelize.QueryTypes.SELECT
        }
      );
      
      if (result && result[0] && result[0].subject_code) {
        return result[0].subject_code;
      }
      
      throw new Error('Custom generator returned no code');
      
    } catch (error) {
      // Don't let custom generator failures halt operations
      console.warn('Custom subject code generator failed:', error.message);
      throw error;
    }
  }

  /**
   * Strategy 2: Timestamp-based generation with collision handling
   */
  async generateTimestampBased(school_id, branch_id) {
    if (!this.config.enableTimestampFallback) {
      throw new Error('Timestamp fallback disabled');
    }

    const timestamp = Date.now();
    const schoolCode = this.getSchoolCode(school_id);
    const branchCode = this.getBranchCode(branch_id);
    
    // Format: SUB_SCH1_BR1_1640995200000
    let baseCode = `SUB_${schoolCode}_${branchCode}_${timestamp}`;
    
    // Handle potential collisions with counter
    for (let counter = 0; counter < this.config.maxRetries; counter++) {
      const code = counter === 0 ? baseCode : `${baseCode}_${counter}`;
      
      if (await this.isCodeUnique(code, school_id, branch_id)) {
        return code;
      }
    }
    
    throw new Error('Could not generate unique timestamp-based code');
  }

  /**
   * Strategy 3: Hash-based deterministic generation
   */
  async generateHashBased(school_id, branch_id, subject_name = '', section = '') {
    if (!this.config.enableHashFallback) {
      throw new Error('Hash fallback disabled');
    }

    const input = `${school_id}_${branch_id}_${subject_name}_${section}_${Date.now()}`;
    const hash = crypto.createHash('md5').update(input).digest('hex');
    const shortHash = hash.substring(0, 8).toUpperCase();
    
    const schoolCode = this.getSchoolCode(school_id);
    const branchCode = this.getBranchCode(branch_id);
    
    // Format: SUB_SCH1_BR1_A1B2C3D4
    const code = `SUB_${schoolCode}_${branchCode}_${shortHash}`;
    
    return code;
  }

  /**
   * Strategy 4: UUID-based generation (never fails)
   */
  async generateUUIDBased(school_id, branch_id) {
    if (!this.config.enableUUIDFallback) {
      throw new Error('UUID fallback disabled');
    }

    const uuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const schoolCode = this.getSchoolCode(school_id);
    const branchCode = this.getBranchCode(branch_id);
    
    // Format: SUB_SCH1_BR1_A1B2C3D4
    const code = `SUB_${schoolCode}_${branchCode}_${uuid}`;
    
    return code;
  }

  /**
   * Check if a subject code is unique within the school/branch
   */
  async isCodeUnique(code, school_id, branch_id) {
    try {
      const existing = await this.db.Subject.findOne({
        where: {
          subject_code: code,
          school_id: school_id,
          branch_id: branch_id
        }
      });
      
      return !existing;
    } catch (error) {
      console.error('Error checking code uniqueness:', error);
      // If we can't check uniqueness, assume it's not unique to be safe
      return false;
    }
  }

  /**
   * Get abbreviated school code from school_id
   */
  getSchoolCode(school_id) {
    if (!school_id) return 'SCH';
    
    // Extract meaningful part from school_id
    // e.g., "SCH/1" -> "SCH1", "SCHOOL_001" -> "SCH001"
    return school_id.replace(/[^A-Z0-9]/gi, '').substring(0, 6).toUpperCase() || 'SCH';
  }

  /**
   * Get abbreviated branch code from branch_id
   */
  getBranchCode(branch_id) {
    if (!branch_id) return 'BR';
    
    // Extract meaningful part from branch_id
    // e.g., "BRCH00001" -> "BR001", "BRANCH_A" -> "BRA"
    return branch_id.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase() || 'BR';
  }

  /**
   * Get strategy name for logging
   */
  getStrategyName(index) {
    const names = ['Custom Generator', 'Timestamp-based', 'Hash-based', 'UUID-based'];
    return names[index] || `Strategy ${index}`;
  }

  /**
   * Log fallback usage for monitoring
   */
  logFallbackUsage(strategyName, school_id, branch_id, strategyIndex) {
    // Log to your monitoring system
    console.log(`📊 FALLBACK USAGE: ${strategyName} used for school ${school_id}, branch ${branch_id}`);
    
    // You can integrate with your logging system here
    // e.g., send to monitoring dashboard, alert if custom generator fails frequently
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }
}

module.exports = SubjectCodeGenerator;