/**
  * Custom Item Model
  * 
  * This model represents individual custom items that can be applied to students.
  * It follows the secure ORM pattern with proper validation and constraints.
  * 
  * Security Features:
  * - Input validation through Sequelize validators
  * - Enum constraints for categorical data
  * - Proper indexing for performance and security
  * - Audit trail with created_by and updated_by
  */
 
 const { DataTypes } = require('sequelize');
 
 module.exports = (sequelize) => {
   const CustomItem = sequelize.define('CustomItem', {
     id: {
       type: DataTypes.INTEGER,
       primaryKey: true,
       autoIncrement: true
     },
     description: {
       type: DataTypes.STRING(255),
       allowNull: false,
       validate: {
         notEmpty: {
           msg: 'Description cannot be empty'
         },
         len: {
           args: [1, 255],
           msg: 'Description must be between 1 and 255 characters'
         }
       }
     },
     unit_price: {
       type: DataTypes.DECIMAL(10, 2),
       allowNull: false,
       validate: {
         min: {
           args: [0],
           msg: 'Unit price must be non-negative'
         },
         isDecimal: {
           msg: 'Unit price must be a valid decimal number'
         }
       }
     },
     quantity: {
       type: DataTypes.INTEGER,
       allowNull: false,
       defaultValue: 1,
       validate: {
         min: {
           args: [1],
           msg: 'Quantity must be at least 1'
         },
         max: {
           args: [999],
           msg: 'Quantity cannot exceed 999'
         },
         isInt: {
           msg: 'Quantity must be an integer'
         }
       }
     },
     item_category: {
       type: DataTypes.ENUM('FEES', 'ITEMS', 'DISCOUNT', 'FINES', 'PENALTY', 'REFUND', 'OTHER'),
       allowNull: false,
       validate: {
         isIn: {
           args: [['FEES', 'ITEMS', 'DISCOUNT', 'FINES', 'PENALTY', 'REFUND', 'OTHER']],
           msg: 'Invalid item category'
         }
       }
     },
     account_type: {
       type: DataTypes.ENUM('ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'CONTRA_REVENUE'),
       allowNull: true,
       validate: {
         isIn: {
           args: [['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'CONTRA_REVENUE']],
           msg: 'Invalid account type'
         }
       }
     },
     debit_account: {
       type: DataTypes.STRING(10),
       allowNull: true,
       validate: {
         is: {
           args: /^[0-9]{4}$/,
           msg: 'Debit account must be a 4-digit code'
         }
       }
     },
     credit_account: {
       type: DataTypes.STRING(10),
       allowNull: true,
       validate: {
         is: {
           args: /^[0-9]{4}$/,
           msg: 'Credit account must be a 4-digit code'
         }
       }
     },
     net_amount: {
       type: DataTypes.DECIMAL(10, 2),
       allowNull: false,
       defaultValue: 0.00,
       validate: {
         isDecimal: {
           msg: 'Net amount must be a valid decimal number'
         }
       }
     },
     discount: {
       type: DataTypes.DECIMAL(10, 2),
       allowNull: true,
       defaultValue: 0.00,
       validate: {
         min: {
           args: [0],
           msg: 'Discount must be non-negative'
         }
       }
     },
     discount_type: {
       type: DataTypes.ENUM('amount', 'percentage'),
       allowNull: true,
       defaultValue: 'amount'
     },
     fines: {
       type: DataTypes.DECIMAL(10, 2),
       allowNull: true,
       defaultValue: 0.00,
       validate: {
         min: {
           args: [0],
           msg: 'Fines must be non-negative'
         }
       }
     },
     admission_no: {
       type: DataTypes.STRING(50),
       allowNull: true,
       validate: {
         len: {
           args: [1, 50],
           msg: 'Admission number must be between 1 and 50 characters'
         }
       }
     },
     class_code: {
       type: DataTypes.STRING(20),
       allowNull: true
     },
     term: {
       type: DataTypes.STRING(20),
       allowNull: true
     },
     academic_year: {
       type: DataTypes.STRING(20),
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
     status: {
       type: DataTypes.ENUM('ACTIVE', 'APPLIED', 'CANCELLED', 'DRAFT'),
       allowNull: false,
       defaultValue: 'ACTIVE'
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
     tableName: 'custom_items',
     timestamps: true,
     createdAt: 'created_at',
     updatedAt: 'updated_at',
     
     // Security: Database indexes for performance and data integrity
     indexes: [
       {
         fields: ['school_id', 'branch_id']
       },
       {
         fields: ['admission_no', 'school_id']
       },
       {
         fields: ['item_category']
       },
       {
         fields: ['status']
       },
       {
         fields: ['term', 'academic_year']
       },
       {
         fields: ['created_at']
       }
     ],
     
     // Security: Model-level hooks for additional validation
     hooks: {
       beforeCreate: (item, options) => {
         // Calculate net amount before creation
         const baseAmount = parseFloat(item.unit_price) * parseInt(item.quantity);
         let netAmount = baseAmount;
         
         // Apply discount if present
         if (item.discount && item.discount > 0) {
           if (item.discount_type === 'percentage') {
             netAmount -= (baseAmount * parseFloat(item.discount) / 100);
           } else {
             netAmount -= parseFloat(item.discount);
           }
         }
         
         // Add fines if present
         if (item.fines && item.fines > 0) {
           netAmount += parseFloat(item.fines);
         }
         
         item.net_amount = Math.max(0, netAmount);
       },
       
       beforeUpdate: (item, options) => {
         // Recalculate net amount before update
         if (item.changed('unit_price') || item.changed('quantity') || 
             item.changed('discount') || item.changed('fines')) {
           const baseAmount = parseFloat(item.unit_price) * parseInt(item.quantity);
           let netAmount = baseAmount;
           
           if (item.discount && item.discount > 0) {
             if (item.discount_type === 'percentage') {
               netAmount -= (baseAmount * parseFloat(item.discount) / 100);
             } else {
               netAmount -= parseFloat(item.discount);
             }
           }
           
           if (item.fines && item.fines > 0) {
             netAmount += parseFloat(item.fines);
           }
           
           item.net_amount = Math.max(0, netAmount);
         }
       }
     },
     
     // Security: Model-level validations
     validate: {
       // Ensure discount doesn't exceed base amount for fixed discounts
       discountNotExceedingBase() {
         if (this.discount && this.discount_type === 'amount') {
           const baseAmount = parseFloat(this.unit_price) * parseInt(this.quantity);
           if (parseFloat(this.discount) > baseAmount) {
             throw new Error('Discount amount cannot exceed base amount');
           }
         }
       },
       
       // Ensure percentage discount is within valid range
       validPercentageDiscount() {
         if (this.discount && this.discount_type === 'percentage') {
           if (parseFloat(this.discount) < 0 || parseFloat(this.discount) > 100) {
             throw new Error('Percentage discount must be between 0 and 100');
           }
         }
       }
     }
   });
 
   // Define associations (DISABLED to prevent foreign key constraint errors)
   CustomItem.associate = (models) => {
     // All associations are disabled to prevent foreign key constraint creation issues
     // The relationships can be handled at the application level instead of database level
     
     // TODO: Re-enable associations after database schema is stable:
     // - Student association via admission_no
     // - User associations for created_by and updated_by
     
     // For now, relationships will be managed through application logic
   };
 
   // Security: Instance methods for safe operations
   CustomItem.prototype.calculateTotal = function() {
     const baseAmount = parseFloat(this.unit_price) * parseInt(this.quantity);
     let total = baseAmount;
     
     if (this.discount && this.discount > 0) {
       if (this.discount_type === 'percentage') {
         total -= (baseAmount * parseFloat(this.discount) / 100);
       } else {
         total -= parseFloat(this.discount);
       }
     }
     
     if (this.fines && this.fines > 0) {
       total += parseFloat(this.fines);
     }
     
     return Math.max(0, total);
   };
   
   CustomItem.prototype.isDiscountItem = function() {
     return this.item_category === 'DISCOUNT';
   };
   
   CustomItem.prototype.isFineItem = function() {
     return ['FINES', 'PENALTY'].includes(this.item_category);
   };
   
   CustomItem.prototype.isRevenueItem = function() {
     return ['FEES', 'ITEMS', 'FINES', 'PENALTY', 'OTHER'].includes(this.item_category);
   };
 
   return CustomItem;
 };