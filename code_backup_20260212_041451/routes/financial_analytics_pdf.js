/**
 * Financial Analytics PDF Generation Route
 * Endpoint: POST /api/generate-financial-pdf
 * Generates comprehensive PDF reports for financial analytics data
 */

const express = require('express');
const router = express.Router();
let FinancialAnalyticsPDFGenerator;
try {
  const pdfService = require('../services/financialAnalyticsPdfService');
  // Try named export first
  FinancialAnalyticsPDFGenerator = pdfService.FinancialAnalyticsPDFGenerator;
  // If not found, try default export
  if (!FinancialAnalyticsPDFGenerator) {
    FinancialAnalyticsPDFGenerator = pdfService.default || pdfService;
  }
} catch (error) {
  console.error('❌ Failed to import FinancialAnalyticsPDFGenerator:', error.message);
  // Create a mock function that returns an error
  FinancialAnalyticsPDFGenerator = class {
    constructor() {}
    async generate() {
      throw new Error('FinancialAnalyticsPDFGenerator service is not available');
    }
  };
}
const models = require('../models');

// Export as a router middleware
const FinancialAnalyticsPDFRoutes = (app) => {
  /**
   * POST /api/generate-financial-pdf
   * Generate a comprehensive financial analytics PDF report
   *
   * Request Body:
   * {
   *   analyticsData: {
   *     totalIncome, totalExpenses, netIncome, profitMargin,
   *     incomeByCategory, expensesByCategory, monthlyTrends,
   *     topIncomeClasses, topExpenseVendors, paymentMethodDistribution,
   *     recentTransactions, etc.
   *   },
   *   dateRange: {
   *     start: 'YYYY-MM-DD',
   *     end: 'YYYY-MM-DD',
   *     startFormatted: 'MMM DD, YYYY',
   *     endFormatted: 'MMM DD, YYYY'
   *   },
   *   companyInfo: {
   *     name, address, phone, email
   *   },
   *   generatedAt: 'YYYY-MM-DD HH:mm:ss'
   * }
   *
   * Request Headers:
   * - x-school-id: School ID to fetch school details
   *
   * Response: PDF file (application/pdf)
   */
  app.post('/api/generate-financial-pdf', async (req, res) => {
    try {
      console.log('📄 Generating financial analytics PDF...');

      // Validate request body
      if (!req.body || !req.body.analyticsData) {
        return res.status(400).json({
          success: false,
          error: 'Missing required analyticsData in request body',
        });
      }

      const {
        analyticsData,
        dateRange,
        companyInfo,
        generatedAt,
      } = req.body;

      // Get school_id from headers
      const schoolId = req.headers['x-school-id'] ||
                       req.headers['X-School-Id'] ||
                       req.headers['X-School-ID'] ||
                       req.user?.school_id ||
                       req.body?.school_id;

      let finalCompanyInfo = companyInfo || {};

      // Fetch school details from database if school_id is provided
      if (schoolId) {
        try {
          console.log('🏫 Fetching school details for school_id:', schoolId);

          const schoolSetup = await models.SchoolSetup.findOne({
            where: { school_id: schoolId }
          });

          if (schoolSetup) {
            // Use school details from database, but allow override from request
            finalCompanyInfo = {
              name: companyInfo?.name || schoolSetup.school_name || 'School Name',
              address: companyInfo?.address || schoolSetup.address || '',
              phone: companyInfo?.phone || schoolSetup.primary_contact_number || '',
              email: companyInfo?.email || schoolSetup.email_address || '',
              motto: schoolSetup.school_motto || '',
              logo: companyInfo?.logo || schoolSetup.badge_url || '',
              shortName: schoolSetup.short_name || '',
              state: schoolSetup.state || '',
              lga: schoolSetup.lga || '',
            };

            console.log('✅ School details fetched:', finalCompanyInfo.name);
          } else {
            console.log('⚠️ School not found with ID:', schoolId);
          }
        } catch (dbError) {
          console.error('⚠️ Error fetching school details:', dbError.message);
          // Continue with provided companyInfo or defaults
        }
      }

      // Create PDF generator instance
      const generator = new FinancialAnalyticsPDFGenerator({
        analyticsData: req.body.analyticsData,
        dateRange: dateRange || {},
        companyInfo: finalCompanyInfo,
        generatedAt: generatedAt || new Date().toISOString(),
      });

      // Generate PDF buffer
      const pdfBuffer = await generator.generate();

      // Create filename
      const schoolName = finalCompanyInfo.shortName || finalCompanyInfo.name || 'School';
      const startDate = dateRange?.start || 'unknown';
      const endDate = dateRange?.end || 'unknown';
      const filename = `${schoolName.replace(/\s+/g, '-')}-Financial-Report-${startDate}-to-${endDate}.pdf`;

      console.log('✅ PDF generated successfully:', filename);

      // Send PDF as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generating financial PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate PDF report',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/test-financial-pdf
   * Test endpoint to verify PDF generation with sample data
   */
  app.get('/api/test-financial-pdf', async (req, res) => {
    try {
      // Sample test data
      const sampleData = {
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

      const generator = new FinancialAnalyticsPDFGenerator(sampleData);
      const pdfBuffer = await generator.generate();

      const filename = 'Test-Financial-Analytics-Report.pdf';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Error generating test PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate test PDF',
        message: error.message,
      });
    }
  });

  console.log('✅ Financial Analytics PDF routes registered');
};

module.exports = FinancialAnalyticsPDFRoutes;
