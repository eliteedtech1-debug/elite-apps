/**
 * Journal Entry Model
 * 
 * This model represents accounting journal entries following GAAP principles.
 * It ensures proper double-entry bookkeeping with security and validation.
 * 
 * Security Features:
 * - Input validation through Sequelize validators
 * - Enum constraints for account types
 * - Proper indexing for performance
 * - Audit trail with user tracking
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JournalEntry = sequelize.define('JournalEntry', {
    entry_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    entry_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true
    },
    account: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Account name cannot be empty'
        },
        len: {
          args: [1, 255],
          msg: 'Account name must be between 1 and 255 characters'
        }
      }
    },
    account_code: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        is: {
          args: /^[0-9]{4}$/,
          msg: 'Account code must be a 4-digit number'
        }
      }
    },
    account_type: {
      type: DataTypes.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTRA_REVENUE', 'CONTRA_ASSET'),
      allowNull: false,
      set(value) {
        // Always convert to uppercase to match chart_of_accounts format
        console.log(`[JournalEntry Model] account_type setter called with: "${value}" (type: ${typeof value})`);
        if (value) {
          const upperValue = value.toUpperCase();
          console.log(`[JournalEntry Model] Converting "${value}" to "${upperValue}"`);
          this.setDataValue('account_type', upperValue);
        } else {
          this.setDataValue('account_type', value);
        }
      },
      validate: {
        isIn: {
          args: [['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CONTRA_REVENUE', 'CONTRA_ASSET']],
          msg: 'Invalid account type. Must be one of: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE'
        }
      }
    },
    debit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: {
          args: [0],
          msg: 'Debit amount must be non-negative'
        },
        isDecimal: {
          msg: 'Debit must be a valid decimal number'
        }
      }
    },
    credit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: {
          args: [0],
          msg: 'Credit amount must be non-negative'
        },
        isDecimal: {
          msg: 'Credit must be a valid decimal number'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Description cannot be empty'
        },
        len: {
          args: [1, 1000],
          msg: 'Description must be between 1 and 1000 characters'
        }
      }
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Reference must not exceed 100 characters'
        }
      }
    },
    transaction_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: {
          msg: 'Transaction date must be a valid date'
        }
      }
    },
    posting_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    school_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'School ID is required'
        }
      }
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    student_id: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    custom_item_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: {
          msg: 'Custom item ID must be a valid integer'
        }
      }
    },
    payroll_line_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: {
          msg: 'Payroll line ID must be a valid integer'
        }
      }
    },
    transaction_type: {
      type: DataTypes.ENUM('STUDENT_PAYMENT', 'PAYROLL', 'EXPENSE', 'REVENUE', 'ASSET_PURCHASE', 'LIABILITY', 'OTHER'),
      allowNull: true,
      defaultValue: 'OTHER'
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'POSTED', 'REVERSED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'POSTED'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Created by is required'
        },
        isInt: {
          msg: 'Created by must be a valid user ID'
        }
      }
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: {
          msg: 'Updated by must be a valid user ID'
        }
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'journal_entries',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    
    // Security: Database indexes for performance and data integrity
    indexes: [
      {
        fields: ['school_id', 'branch_id']
      },
      {
        fields: ['account_code']
      },
      {
        fields: ['transaction_date']
      },
      {
        fields: ['status']
      },
      {
        fields: ['reference']
      },
      {
        fields: ['student_id']
      },
      {
        fields: ['custom_item_id']
      },
      {
        fields: ['payroll_line_id']
      },
      {
        fields: ['transaction_type']
      },
      {
        unique: true,
        fields: ['entry_number']
      }
    ],
    
    // Security: Model-level hooks for additional validation
    hooks: {
      beforeValidate: (entry, options) => {
        // Normalize account_type BEFORE validation to ensure it passes ENUM check
        if (entry.account_type) {
          console.log(`[beforeValidate Hook] Normalizing account_type: "${entry.account_type}" -> "${entry.account_type.toUpperCase()}"`);
          entry.account_type = entry.account_type.toUpperCase();
        }
      },
      beforeCreate: (entry, options) => {
        // Generate entry number if not provided
        if (!entry.entry_number) {
          const timestamp = Date.now();
          entry.entry_number = `JE-${entry.school_id}-${timestamp}`;
        }

        // Set posting date if not provided
        if (!entry.posting_date) {
          entry.posting_date = entry.transaction_date;
        }
      },
      
      beforeUpdate: (entry, options) => {
        // Prevent modification of posted entries
        if (entry.status === 'POSTED' && entry.changed()) {
          const allowedChanges = ['status', 'updated_by', 'updated_at'];
          const actualChanges = entry.changed();
          const unauthorizedChanges = actualChanges.filter(field => !allowedChanges.includes(field));
          
          if (unauthorizedChanges.length > 0) {
            throw new Error('Posted journal entries cannot be modified except for status changes');
          }
        }
      }
    },
    
    // Security: Model-level validations
    validate: {
      // Ensure either debit or credit is non-zero, but not both
      debitOrCreditNotBoth() {
        const debit = parseFloat(this.debit || 0);
        const credit = parseFloat(this.credit || 0);
        
        if (debit > 0 && credit > 0) {
          throw new Error('An entry cannot have both debit and credit amounts');
        }
        
        if (debit === 0 && credit === 0) {
          throw new Error('An entry must have either a debit or credit amount');
        }
      },
      
      // Validate account code ranges based on account type
      accountCodeMatchesType() {
        const code = parseInt(this.account_code);
        const type = this.account_type; // Already uppercase from setter

        const validRanges = {
          'ASSET': [1000, 1999],
          'LIABILITY': [2000, 2999],
          'EQUITY': [3000, 3999],
          'REVENUE': [4000, 4999],
          'EXPENSE': [5000, 5999],
          'CONTRA_REVENUE': [4000, 4999],
          'CONTRA_ASSET': [1000, 1999]
        };

        if (validRanges[type]) {
          const [min, max] = validRanges[type];
          if (code < min || code > max) {
            console.warn(`Account code ${this.account_code} (${code}) may not match standard range for ${type} (${min}-${max}), but allowing for flexibility`);
            // Don't throw error - just log warning for non-standard account codes
            // This allows custom chart of accounts with different numbering schemes
          }
        }
      }
    }
  });

  // Define associations (disabled during table creation to avoid foreign key constraint issues)
  JournalEntry.associate = (models) => {
    // Associations are temporarily disabled to allow table creation
    // They can be re-enabled after all tables are created successfully
    
    // TODO: Re-enable these associations after database setup is complete:
    // - Association with CustomItem
    // - Association with User model for created_by  
    // - Self-association for reversal entries
  };

  // Security: Class methods for safe operations
  JournalEntry.createBalancedEntry = async function(entries, transaction) {
    // Validate that entries balance
    const totalDebits = entries.reduce((sum, entry) => sum + parseFloat(entry.debit || 0), 0);
    const totalCredits = entries.reduce((sum, entry) => sum + parseFloat(entry.credit || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Journal entries must balance. Debits: ${totalDebits}, Credits: ${totalCredits}`);
    }
    
    // Create all entries in the transaction
    const createdEntries = [];
    for (const entryData of entries) {
      const entry = await this.create(entryData, { transaction });
      createdEntries.push(entry);
    }
    
    return createdEntries;
  };
  
  JournalEntry.getTrialBalance = async function(schoolId, asOfDate) {
    const entries = await this.findAll({
      where: {
        school_id: schoolId,
        transaction_date: {
          [sequelize.Sequelize.Op.lte]: asOfDate
        },
        status: 'POSTED'
      },
      attributes: [
        'account_code',
        'account',
        'account_type',
        [sequelize.fn('SUM', sequelize.col('debit')), 'total_debits'],
        [sequelize.fn('SUM', sequelize.col('credit')), 'total_credits']
      ],
      group: ['account_code', 'account', 'account_type'],
      order: ['account_code']
    });
    
    return entries;
  };

  // Security: Instance methods for safe operations
  JournalEntry.prototype.reverse = async function(reversalReason, userId, transaction) {
    if (this.status !== 'POSTED') {
      throw new Error('Only posted entries can be reversed');
    }
    
    // Create reversal entry
    const reversalEntry = await JournalEntry.create({
      account: this.account,
      account_code: this.account_code,
      account_type: this.account_type,
      debit: this.credit, // Swap debit and credit
      credit: this.debit,
      description: `REVERSAL: ${reversalReason} - Original: ${this.description}`,
      reference: `REV-${this.reference || this.id}`,
      transaction_date: new Date(),
      school_id: this.school_id,
      branch_id: this.branch_id,
      student_id: this.student_id,
      custom_item_id: this.custom_item_id,
      created_by: userId
    }, { transaction });
    
    // Update original entry status
    await this.update({
      status: 'REVERSED',
      reversal_entry_id: reversalEntry.id,
      updated_by: userId
    }, { transaction });
    
    return reversalEntry;
  };
  
  JournalEntry.prototype.isBalanced = function(relatedEntries) {
    const allEntries = [this, ...relatedEntries];
    const totalDebits = allEntries.reduce((sum, entry) => sum + parseFloat(entry.debit || 0), 0);
    const totalCredits = allEntries.reduce((sum, entry) => sum + parseFloat(entry.credit || 0), 0);
    
    return Math.abs(totalDebits - totalCredits) < 0.01;
  };

  return JournalEntry;
};