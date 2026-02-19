/**
 * Simple Accounting Transactions API
 * For EditBillModals custom items functionality
 */

const express = require('express');
const router = express.Router();
const models = require('../models');

// Create student charges endpoint (simplified for EditBillModals)
router.post('/create-student-charges', async (req, res) => {
  try {
    console.log('🔧 Creating student charges:', {
      student: req.body.student_info?.admission_no,
      itemCount: req.body.bill_items?.length || 0,
      journalEntries: req.body.journal_entries?.length || 0
    });

    const {
      student_info,
      bill_items,
      journal_entries,
      accounting_summary,
      metadata
    } = req.body;

    // Validate required fields
    if (!student_info?.admission_no) {
      return res.status(400).json({
        success: false,
        message: 'Student admission number is required'
      });
    }

    if (!bill_items || !Array.isArray(bill_items) || bill_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bill items are required'
      });
    }

    const createdItems = [];
    const createdJournalEntries = [];

    // Use database transaction for atomicity
    await models.sequelize.transaction(async (transaction) => {
      // Create custom items
      for (const item of bill_items) {
        try {
          // Check if CustomItem model exists
          if (!models.CustomItem) {
            console.log('⚠️ CustomItem model not found, creating payment entry instead');
            
            // Fallback: Create a payment entry
            const paymentEntry = await models.Payment.create({
              admission_no: student_info.admission_no,
              description: item.description,
              amount: parseFloat(item.baseAmount || item.netAmount),
              quantity: parseInt(item.quantity || 1),
              cr: parseFloat(item.netAmount),
              dr: 0,
              term: student_info.term,
              academic_year: student_info.academic_year,
              item_category: item.item_category || 'FEES',
              status: 'Pending',
              is_optional: 'No',
              ref_no: `CUSTOM-${Date.now()}`,
              created_at: new Date(),
              updated_at: new Date()
            }, { transaction });
            
            createdItems.push({
              id: paymentEntry.id,
              type: 'payment',
              description: item.description,
              amount: parseFloat(item.netAmount)
            });
          } else {
            // Create custom item using CustomItem model
            const customItem = await models.CustomItem.create({
              description: item.description,
              unit_price: parseFloat(item.baseAmount),
              quantity: parseInt(item.quantity),
              item_category: item.item_category,
              account_type: item.account_type,
              debit_account: item.debit_account,
              credit_account: item.credit_account,
              net_amount: parseFloat(item.netAmount),
              discount: parseFloat(item.discount || 0),
              fines: parseFloat(item.fines || 0),
              admission_no: student_info.admission_no,
              class_code: student_info.class_name,
              term: student_info.term,
              academic_year: student_info.academic_year,
              status: 'APPLIED',
              created_at: new Date(),
              updated_at: new Date()
            }, { transaction });

            createdItems.push({
              id: customItem.id,
              type: 'custom_item',
              description: item.description,
              amount: parseFloat(item.netAmount)
            });
          }
        } catch (itemError) {
          console.error('Error creating item:', itemError);
          throw new Error(`Failed to create item: ${item.description}`);
        }
      }

      // Create journal entries if model exists
      if (journal_entries && Array.isArray(journal_entries) && journal_entries.length > 0) {
        for (const entry of journal_entries) {
          try {
            if (models.JournalEntry) {
              const journalEntry = await models.JournalEntry.create({
                account: entry.account,
                account_code: entry.account_code,
                account_type: entry.account_type,
                debit: parseFloat(entry.debit || 0),
                credit: parseFloat(entry.credit || 0),
                description: entry.description,
                reference: entry.reference,
                transaction_date: entry.transaction_date || new Date(),
                student_id: student_info.admission_no,
                status: 'POSTED',
                created_at: new Date(),
                updated_at: new Date()
              }, { transaction });

              createdJournalEntries.push({
                id: journalEntry.id,
                account: entry.account,
                debit: parseFloat(entry.debit || 0),
                credit: parseFloat(entry.credit || 0)
              });
            } else {
              console.log('⚠️ JournalEntry model not found, skipping journal entries');
            }
          } catch (journalError) {
            console.error('Error creating journal entry:', journalError);
            // Don't fail the entire transaction for journal entry errors
            console.log('Continuing without journal entry...');
          }
        }
      }

      // Validate journal entries balance (if any were created)
      if (createdJournalEntries.length > 0) {
        const totalDebits = createdJournalEntries.reduce((sum, entry) => sum + entry.debit, 0);
        const totalCredits = createdJournalEntries.reduce((sum, entry) => sum + entry.credit, 0);
        
        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          console.warn(`⚠️ Journal entries not balanced: Debits: ₦${totalDebits}, Credits: ₦${totalCredits}`);
          // Don't fail the transaction, just log the warning
        }
      }
    });

    console.log('✅ Student charges created successfully:', {
      itemsCreated: createdItems.length,
      journalEntriesCreated: createdJournalEntries.length
    });

    res.status(201).json({
      success: true,
      message: 'Student charges created successfully',
      data: {
        custom_items: createdItems,
        journal_entries: createdJournalEntries,
        accounting_summary: accounting_summary || {
          total_items: createdItems.length,
          total_amount: createdItems.reduce((sum, item) => sum + item.amount, 0)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error creating student charges:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to create student charges',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Health check for this specific API
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Accounting transactions API is healthy',
    endpoints: {
      'POST /create-student-charges': 'Create student charges with accounting entries'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;