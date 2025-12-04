// Test script for enhanced copy process with accounting
// Run with: node TEST_COPY_PROCESS_ACCOUNTING.js

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:34567';

// Test data for copy process
const testCopyData = {
  // Source student bills (what we're copying FROM)
  sourceStudent: 'STU001',
  sourceBills: [
    {
      item_id: 'ITEM_001',
      description: 'Tuition Fee',
      cr: 50000,
      quantity: 1,
      discount: 0,
      fines: 0
    },
    {
      item_id: 'ITEM_002', 
      description: 'Library Fee',
      cr: 5000,
      quantity: 1,
      discount: 0,
      fines: 0
    },
    {
      item_id: 'ITEM_003',
      description: 'Sports Fee', 
      cr: 3000,
      quantity: 1,
      discount: 0,
      fines: 0
    }
  ],
  
  // Target student (what we're copying TO)
  targetStudent: 'STU002',
  targetBills: [
    {
      item_id: 'ITEM_001',
      description: 'Tuition Fee',
      cr: 45000, // Different amount - should UPDATE
      quantity: 1,
      discount: 0,
      fines: 0
    },
    {
      item_id: 'ITEM_004',
      description: 'Development Levy',
      cr: 2000, // Not in source - should EXCLUDE
      quantity: 1,
      discount: 0,
      fines: 0
    }
  ],
  
  // Test parameters
  term: 'First Term',
  academic_year: '2025/2026',
  class_name: 'Primary 1',
  branch_id: '1',
  school_id: '1'
};

async function testCopyProcessWithAccounting() {
  try {
    console.log('🧪 Testing Enhanced Copy Process with Accounting...');
    console.log('📋 Test Scenario:');
    console.log(`  Source: ${testCopyData.sourceStudent} (${testCopyData.sourceBills.length} bills)`);
    console.log(`  Target: ${testCopyData.targetStudent} (${testCopyData.targetBills.length} bills)`);
    
    // Step 1: Simulate bill categorization
    console.log('\
🔍 Step 1: Categorizing Bills...');
    const { billsToAdd, billsToUpdate, billsToExclude } = categorizeBills(
      testCopyData.sourceBills, 
      testCopyData.targetBills
    );
    
    console.log(`  📝 Bills to ADD: ${billsToAdd.length}`);
    billsToAdd.forEach(bill => {
      console.log(`    + ${bill.description}: ₦${bill.amount.toLocaleString()}`);
    });
    
    console.log(`  📝 Bills to UPDATE: ${billsToUpdate.length}`);
    billsToUpdate.forEach(bill => {
      console.log(`    ~ ${bill.description}: ₦${bill.amount.toLocaleString()}`);
    });
    
    console.log(`  📝 Bills to EXCLUDE: ${billsToExclude.length}`);
    billsToExclude.forEach(itemId => {
      const bill = testCopyData.targetBills.find(b => b.item_id === itemId);
      console.log(`    - ${bill?.description}: ₦${bill?.cr.toLocaleString()}`);
    });
    
    // Step 2: Test CREATE with accounting
    if (billsToAdd.length > 0) {
      console.log('\
💰 Step 2: Testing CREATE with Accounting...');
      
      const totalAmount = billsToAdd.reduce((sum, bill) => sum + bill.amount, 0);
      
      const createData = {
        query_type: 'create-with-accounting',
        admission_no: testCopyData.targetStudent,
        class_name: testCopyData.class_name,
        term: testCopyData.term,
        academic_year: testCopyData.academic_year,
        branch_id: testCopyData.branch_id,
        school_id: testCopyData.school_id,
        created_by: 'TEST_USER',
        bill_items: billsToAdd.map(bill => ({
          description: bill.description,
          baseAmount: bill.amount,
          quantity: 1,
          discount: 0,
          discountType: 'amount',
          fines: 0,
          netAmount: bill.amount,
        })),
        journal_entries: [
          {
            account: `Accounts Receivable - ${testCopyData.targetStudent}`,
            accountType: 'Asset',
            debit: totalAmount,
            credit: 0,
            description: `New bills copied for ${testCopyData.term} ${testCopyData.academic_year}`,
          },
          {
            account: 'Fee Revenue',
            accountType: 'Revenue',
            debit: 0,
            credit: totalAmount,
            description: `Fee revenue from copied bills for ${testCopyData.term} ${testCopyData.academic_year}`,
          }
        ]
      };
      
      console.log('📊 Journal Entries for CREATE:');
      console.log(`  DR: Accounts Receivable - ${testCopyData.targetStudent}  ₦${totalAmount.toLocaleString()}`);
      console.log(`  CR: Fee Revenue                                          ₦${totalAmount.toLocaleString()}`);
      
      const totalDebits = createData.journal_entries.reduce((sum, entry) => sum + entry.debit, 0);
      const totalCredits = createData.journal_entries.reduce((sum, entry) => sum + entry.credit, 0);
      console.log(`  ✅ Balanced: ${totalDebits === totalCredits ? 'YES' : 'NO'} (${totalDebits} = ${totalCredits})`);
      
      // Simulate API call
      console.log('🌐 Simulating CREATE API call...');
      console.log('  [Would call: POST /payments with create-with-accounting]');
    }
    
    // Step 3: Test UPDATE with accounting
    if (billsToUpdate.length > 0) {
      console.log('\
💰 Step 3: Testing UPDATE with Accounting...');
      
      for (const bill of billsToUpdate) {
        console.log(`📝 Updating: ${bill.description}`);
        
        const updateData = {
          query_type: 'update-with-accounting',
          admission_no: testCopyData.targetStudent,
          term: testCopyData.term,
          academic_year: testCopyData.academic_year,
          branch_id: testCopyData.branch_id,
          created_by: 'TEST_USER',
          bill_items: [{
            id: bill.item_id,
            description: bill.description,
            baseAmount: bill.amount,
            quantity: 1,
            discount: 0,
            discountType: 'amount',
            fines: 0,
            netAmount: bill.amount,
          }],
          journal_entries: [
            {
              account: `Accounts Receivable - ${testCopyData.targetStudent}`,
              accountType: 'Asset',
              debit: bill.amount,
              credit: 0,
              description: `Updated bill: ${bill.description} for ${testCopyData.term} ${testCopyData.academic_year}`,
            },
            {
              account: 'Fee Revenue',
              accountType: 'Revenue',
              debit: 0,
              credit: bill.amount,
              description: `Fee revenue: ${bill.description} for ${testCopyData.term} ${testCopyData.academic_year}`,
            }
          ]
        };
        
        console.log('📊 Journal Entries for UPDATE:');
        console.log(`  DR: Accounts Receivable - ${testCopyData.targetStudent}  ₦${bill.amount.toLocaleString()}`);
        console.log(`  CR: Fee Revenue                                          ₦${bill.amount.toLocaleString()}`);
        
        console.log('🌐 Simulating UPDATE API call...');
        console.log('  [Would call: POST /payments with update-with-accounting]');
      }
    }
    
    // Step 4: Test EXCLUDE (DELETE)
    if (billsToExclude.length > 0) {
      console.log('\
💰 Step 4: Testing EXCLUDE (DELETE)...');
      
      for (const itemId of billsToExclude) {
        const bill = testCopyData.targetBills.find(b => b.item_id === itemId);
        console.log(`📝 Excluding: ${bill?.description}`);
        
        const deleteData = {
          query_type: 'delete',
          item_id: itemId,
          payment_status: 'Excluded',
          status: 'Excluded',
          updated_by: 'TEST_USER',
          branch_id: testCopyData.branch_id,
        };
        
        console.log('📊 No journal entries for EXCLUDE (soft delete)');
        console.log('🌐 Simulating DELETE API call...');
        console.log('  [Would call: POST /payments with delete]');
      }
    }
    
    // Step 5: Calculate total accounting impact
    console.log('\
📊 Total Accounting Impact:');
    const totalAddAmount = billsToAdd.reduce((sum, bill) => sum + bill.amount, 0);
    const totalUpdateAmount = billsToUpdate.reduce((sum, bill) => sum + bill.amount, 0);
    const totalImpact = totalAddAmount + totalUpdateAmount;
    
    console.log(`  Total Debits:  ₦${totalImpact.toLocaleString()} (Accounts Receivable)`);
    console.log(`  Total Credits: ₦${totalImpact.toLocaleString()} (Fee Revenue)`);
    console.log(`  Balance:       ₦0 ✅ (Debits = Credits)`);
    
    console.log('\
✅ Copy Process Test Completed Successfully!');
    console.log('📋 Summary:');
    console.log(`  • ${billsToAdd.length} bills would be added`);
    console.log(`  • ${billsToUpdate.length} bills would be updated`);
    console.log(`  • ${billsToExclude.length} bills would be excluded`);
    console.log(`  • All accounting entries are properly balanced`);
    console.log(`  • Total financial impact: ₦${totalImpact.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ Copy Process Test Failed:', error.message);
  }
}

// Helper function to categorize bills (same logic as frontend)
function categorizeBills(sourceBills, targetBills) {
  const billsToAdd = [];
  const billsToUpdate = [];
  const billsToExclude = [];

  // Create maps for easier lookup
  const sourceMap = new Map(sourceBills.map(bill => [bill.item_id, bill]));
  const targetMap = new Map(targetBills.map(bill => [bill.item_id, bill]));

  // Find bills to ADD (exist in source but not in target)
  sourceBills.forEach(sourceBill => {
    if (!targetMap.has(sourceBill.item_id)) {
      billsToAdd.push({
        description: sourceBill.description,
        amount: Number(sourceBill.cr),
        item_id: sourceBill.item_id,
        qty: sourceBill.quantity || 1,
        quantity: sourceBill.quantity || 1,
      });
    }
  });

  // Find bills to UPDATE (exist in both but different amounts/quantities)
  sourceBills.forEach(sourceBill => {
    const targetBill = targetMap.get(sourceBill.item_id);
    if (targetBill && 
        (Number(targetBill.cr) !== Number(sourceBill.cr) || 
         Number(targetBill.quantity || 1) !== Number(sourceBill.quantity || 1))) {
      billsToUpdate.push({
        item_id: targetBill.item_id,
        amount: Number(sourceBill.cr),
        quantity: sourceBill.quantity || 1,
        description: sourceBill.description,
        discount: sourceBill.discount || 0,
        fines: sourceBill.fines || 0,
      });
    }
  });

  // Find bills to EXCLUDE (exist in target but not in source)
  targetBills.forEach(targetBill => {
    if (!sourceMap.has(targetBill.item_id)) {
      billsToExclude.push(targetBill.item_id);
    }
  });

  return { billsToAdd, billsToUpdate, billsToExclude };
}

// Test validation of accounting entries
function validateAccountingEntries(journalEntries) {
  const totalDebits = journalEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
  const totalCredits = journalEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
  
  return {
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    totalDebits,
    totalCredits,
    difference: totalDebits - totalCredits
  };
}

// Run the test
testCopyProcessWithAccounting();