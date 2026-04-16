/**
 * Test script for PDF generation endpoint
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:34567';

async function testPdfGeneration() {
  try {
    console.log('🧪 Testing Financial Analytics PDF Generation...\n');

    // Test data
    const testData = {
      analyticsData: {
        totalIncome: 150000,
        totalExpenses: 95000,
        netIncome: 55000,
        profitMargin: 36.67,
        expenseRatio: 63.33,
        growthRate: 15.5,
        cashBalance: 125000,
        accountsReceivable: 22500,
        payrollExpenses: 57000,
        incomeByCategory: [
          { category: 'Tuition Fees', amount: 100000, percentage: 66.67 },
          { category: 'Extra Classes', amount: 50000, percentage: 33.33 }
        ],
        expensesByCategory: [
          { category: 'Salaries', amount: 57000, percentage: 60 },
          { category: 'Operations', amount: 38000, percentage: 40 }
        ],
        monthlyTrends: [
          { month: 'Jan', income: 45000, expenses: 28500 },
          { month: 'Feb', income: 52000, expenses: 31350 },
          { month: 'Mar', income: 53000, expenses: 35150 }
        ],
        topIncomeClasses: [
          { class: 'Grade 12', amount: 80000 },
          { class: 'Grade 11', amount: 70000 }
        ],
        topExpenseVendors: [
          { vendor: 'Supplier A', amount: 25000 },
          { vendor: 'Supplier B', amount: 20000 }
        ],
        paymentMethodDistribution: [
          { method: 'Bank Transfer', amount: 90000, percentage: 60 },
          { method: 'Cash', amount: 60000, percentage: 40 }
        ],
        recentTransactions: [
          {
            entry_date: '2025-01-15',
            description: 'Tuition Payment',
            account_name: 'Student Fees',
            reference_type: 'INCOME',
            total_amount: 5000
          },
          {
            entry_date: '2025-01-16',
            description: 'Salary Payment',
            account_name: 'Staff Salaries',
            reference_type: 'EXPENSE',
            total_amount: 3000
          }
        ]
      },
      dateRange: {
        start: '2025-01-01',
        end: '2025-03-31',
        startFormatted: 'Jan 01, 2025',
        endFormatted: 'Mar 31, 2025'
      },
      companyInfo: {
        name: 'Elite School Management System',
        address: '123 Education St, City, State 12345',
        phone: '(555) 123-4567',
        email: 'info@eliteschool.com'
      },
      generatedAt: new Date().toISOString()
    };

    console.log('📤 Sending request to /api/generate-financial-pdf...');

    const response = await axios.post(
      `${BASE_URL}/api/generate-financial-pdf`,
      testData,
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200) {
      const outputPath = path.join(__dirname, 'test-financial-report.pdf');
      fs.writeFileSync(outputPath, response.data);

      console.log('✅ PDF generated successfully!');
      console.log(`📁 Saved to: ${outputPath}`);
      console.log(`📊 File size: ${(response.data.length / 1024).toFixed(2)} KB`);
    } else {
      console.error('❌ Unexpected response status:', response.status);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server is not running. Please start the server first.');
      console.error('   Run: cd elscholar-api && npm run dev');
    } else if (error.response) {
      console.error('❌ Server error:', error.response.status);
      console.error('   Message:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

// Run the test
testPdfGeneration();
