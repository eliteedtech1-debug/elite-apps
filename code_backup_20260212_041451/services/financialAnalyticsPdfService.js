/**
 * Financial Analytics PDF Generator Service
 * Generates comprehensive PDF reports using PDFKit
 * This is the Express.js/Node.js equivalent of the Python financial_analytics_report.py
 */

const PDFDocument = require('pdfkit');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

class FinancialAnalyticsPDFGenerator {
  constructor(data) {
    this.data = data;
    this.analytics = data.analyticsData || {};
    this.dateRange = data.dateRange || {};
    this.company = data.companyInfo || {};
    this.generatedAt = data.generatedAt || new Date().toISOString();

    // PDF settings
    this.colors = {
      primary: '#2980b9',
      success: '#27ae60',
      danger: '#e74c3c',
      warning: '#f39c12',
      purple: '#9b59b6',
      darkGrey: '#34495e',
      lightGrey: '#ecf0f1',
      white: '#ffffff',
    };

    this.doc = null;
    this.pageWidth = 595.28; // A4 width in points
    this.pageHeight = 841.89; // A4 height in points
    this.margin = 50;
    this.yPosition = this.margin;
  }

  /**
   * Format number as currency (NGN - Nigerian Naira)
   * Returns number without currency symbol (symbol shown in table header)
   */
  formatCurrency(amount) {
    try {
      return Number(amount).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (e) {
      return '0.00';
    }
  }

  /**
   * Format number as currency for display in headers
   */
  formatCurrencyWithSymbol(amount) {
    try {
      return `₦${Number(amount).toLocaleString('en-NG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    } catch (e) {
      return '₦0.00';
    }
  }

  /**
   * Format number as percentage
   */
  formatPercentage(value) {
    try {
      return `${Number(value).toFixed(2)}%`;
    } catch (e) {
      return '0.00%';
    }
  }

  /**
   * Check if we need a new page
   */
  checkPageBreak(requiredSpace = 100) {
    if (this.yPosition + requiredSpace > this.pageHeight - this.margin - 40) {
      this.doc.addPage();
      this.yPosition = this.margin;
      return true;
    }
    return false;
  }

  /**
   * Download image from URL and save to temp file
   * Supports both URLs and local file paths
   */
  async downloadImage(imageUrl) {
    try {
      // If it's a local file path, return it directly
      if (fs.existsSync(imageUrl)) {
        return imageUrl;
      }

      // If it's a URL, download it
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const response = await axios({
          url: imageUrl,
          method: 'GET',
          responseType: 'arraybuffer',
          timeout: 5000, // 5 second timeout
        });

        // Create temp file
        const tempDir = os.tmpdir();
        const ext = path.extname(imageUrl) || '.png';
        const tempFile = path.join(tempDir, `school-logo-${Date.now()}${ext}`);

        // Write to temp file
        fs.writeFileSync(tempFile, response.data);

        return tempFile;
      }

      return null;
    } catch (error) {
      console.error('Error downloading image:', error.message);
      return null;
    }
  }

  /**
   * Create cover page with executive summary
   */
  async createCoverPage() {
    // Header background
    this.doc
      .rect(0, 0, this.pageWidth, 120)
      .fill(this.colors.primary);

    // Add school logo/badge if available
    let logoWidth = 0;
    if (this.company.logo) {
      try {
        const logoPath = await this.downloadImage(this.company.logo);
        if (logoPath) {
          const logoSize = 60; // Logo height in points
          const logoX = this.margin;
          const logoY = 30;

          this.doc.image(logoPath, logoX, logoY, {
            height: logoSize,
            align: 'left'
          });

          logoWidth = logoSize + 20; // Logo width plus spacing

          // Clean up temp file
          try {
            fs.unlinkSync(logoPath);
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      } catch (error) {
        console.error('Error loading school logo:', error.message);
        // Continue without logo
      }
    }

    // Title (adjusted for logo if present)
    const titleX = logoWidth > 0 ? this.margin + logoWidth : this.margin;
    const titleWidth = logoWidth > 0 ? this.pageWidth - 2 * this.margin - logoWidth : this.pageWidth - 2 * this.margin;

    this.doc
      .fontSize(24)
      .fillColor(this.colors.white)
      .font('Helvetica-Bold')
      .text('Financial Analytics Report', titleX, 35, {
        width: titleWidth,
        align: logoWidth > 0 ? 'left' : 'center',
      });

    // Company name
    if (this.company.name) {
      this.doc
        .fontSize(14)
        .text(this.company.name, titleX, 65, {
          width: titleWidth,
          align: logoWidth > 0 ? 'left' : 'center',
        });
    }

    // School motto (if available)
    if (this.company.motto) {
      this.doc
        .fontSize(10)
        .fillColor('#E8F4F8')
        .font('Helvetica-Oblique')
        .text(`"${this.company.motto}"`, titleX, 85, {
          width: titleWidth,
          align: logoWidth > 0 ? 'left' : 'center',
        });
    }

    this.yPosition = 140;

    // Report period
    this.doc
      .fontSize(11)
      .fillColor('#000000')
      .font('Helvetica')
      .text(
        `Report Period: ${this.dateRange.startFormatted || 'N/A'} to ${this.dateRange.endFormatted || 'N/A'}`,
        this.margin,
        this.yPosition,
        { align: 'center', width: this.pageWidth - 2 * this.margin }
      );

    this.yPosition += 30;

    // Company contact info (if available)
    if (this.company.address || this.company.phone || this.company.email) {
      this.doc.fontSize(9).fillColor('#666666');

      if (this.company.address) {
        this.doc.text(this.company.address, this.margin, this.yPosition, {
          align: 'center',
          width: this.pageWidth - 2 * this.margin
        });
        this.yPosition += 12;
      }

      if (this.company.phone || this.company.email) {
        const contact = [this.company.phone, this.company.email].filter(Boolean).join(' | ');
        this.doc.text(contact, this.margin, this.yPosition, {
          align: 'center',
          width: this.pageWidth - 2 * this.margin
        });
        this.yPosition += 20;
      } else {
        this.yPosition += 10;
      }
    }

    // Executive Summary
    this.doc
      .fontSize(18)
      .fillColor(this.colors.primary)
      .font('Helvetica-Bold')
      .text('Executive Summary', this.margin, this.yPosition);

    this.yPosition += 25;

    // Key metrics table
    const metricsData = [
      ['Metric', 'Value (NGN)', 'Status'],
      [
        'Total Income',
        this.formatCurrency(this.analytics.totalIncome || 0),
        '✓'
      ],
      [
        'Total Expenses',
        this.formatCurrency(this.analytics.totalExpenses || 0),
        '✓'
      ],
      [
        'Net Income',
        this.formatCurrency(this.analytics.netIncome || 0),
        (this.analytics.netIncome || 0) >= 0 ? '✓' : '✗'
      ],
      [
        'Profit Margin',
        this.formatPercentage(this.analytics.profitMargin || 0),
        (this.analytics.profitMargin || 0) >= 10 ? '✓' : '!'
      ],
    ];

    this.drawTable(metricsData, this.yPosition, {
      headerColor: this.colors.primary,
      alternateRows: true,
    });

    this.yPosition += (metricsData.length * 22) + 30;

    // Financial Ratios
    this.checkPageBreak(200);

    this.doc
      .fontSize(14)
      .fillColor(this.colors.darkGrey)
      .font('Helvetica-Bold')
      .text('Financial Ratios & Indicators', this.margin, this.yPosition);

    this.yPosition += 20;

    const ratiosData = [
      ['Ratio', 'Value (NGN)'],
      ['Expense Ratio', this.formatPercentage(this.analytics.expenseRatio || 0)],
      ['Growth Rate', this.formatPercentage(this.analytics.growthRate || 0)],
      ['Cash Balance', this.formatCurrency(this.analytics.cashBalance || 0)],
      ['Accounts Receivable', this.formatCurrency(this.analytics.accountsReceivable || 0)],
      ['Payroll Expenses', this.formatCurrency(this.analytics.payrollExpenses || 0)],
    ];

    this.drawTable(ratiosData, this.yPosition, {
      headerColor: this.colors.darkGrey,
      alternateRows: true,
    });

    this.yPosition += (ratiosData.length * 22);
  }

  /**
   * Create income analysis section
   */
  createIncomeAnalysis() {
    const incomeByCategory = this.analytics.incomeByCategory || [];
    const topIncome = this.analytics.topIncomeClasses || [];

    if (incomeByCategory.length === 0 && topIncome.length === 0) {
      return; // Skip if no income data
    }

    this.checkPageBreak(300);
    if (this.yPosition > this.margin + 50) {
      this.doc.addPage();
      this.yPosition = this.margin;
    }

    this.doc
      .fontSize(20)
      .fillColor(this.colors.success)
      .font('Helvetica-Bold')
      .text('Income Analysis', this.margin, this.yPosition);

    this.yPosition += 25;

    // Income by Category
    if (incomeByCategory.length > 0) {
      this.doc
        .fontSize(14)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Income by Category', this.margin, this.yPosition);

      this.yPosition += 18;

      const tableData = [['Category', 'Amount (NGN)', 'Percentage']];
      incomeByCategory.forEach(item => {
        tableData.push([
          item.category || 'N/A',
          this.formatCurrency(item.amount || 0),
          this.formatPercentage(item.percentage || 0)
        ]);
      });

      this.drawTable(tableData, this.yPosition, {
        headerColor: this.colors.success,
        alternateRows: true,
      });

      this.yPosition += (tableData.length * 22) + 25;
    }

    // Top Income Sources
    if (topIncome.length > 0) {
      this.checkPageBreak(150);

      this.doc
        .fontSize(14)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Top Income Sources', this.margin, this.yPosition);

      this.yPosition += 18;

      const tableData = [['Source', 'Amount (NGN)']];
      topIncome.forEach(item => {
        tableData.push([
          item.class || 'N/A',
          this.formatCurrency(item.amount || 0)
        ]);
      });

      this.drawTable(tableData, this.yPosition, {
        headerColor: '#2ecc71',
        alternateRows: true,
      });

      this.yPosition += (tableData.length * 22);
    }
  }

  /**
   * Create expense analysis section
   */
  createExpenseAnalysis() {
    const expensesByCategory = this.analytics.expensesByCategory || [];
    const topExpenses = this.analytics.topExpenseVendors || [];

    if (expensesByCategory.length === 0 && topExpenses.length === 0) {
      return; // Skip if no expense data
    }

    this.checkPageBreak(300);
    if (this.yPosition > this.margin + 50) {
      this.doc.addPage();
      this.yPosition = this.margin;
    }

    this.doc
      .fontSize(20)
      .fillColor(this.colors.danger)
      .font('Helvetica-Bold')
      .text('Expense Analysis', this.margin, this.yPosition);

    this.yPosition += 25;

    // Expenses by Category
    if (expensesByCategory.length > 0) {
      this.doc
        .fontSize(14)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Expenses by Category', this.margin, this.yPosition);

      this.yPosition += 18;

      const tableData = [['Category', 'Amount (NGN)', 'Percentage']];
      expensesByCategory.forEach(item => {
        tableData.push([
          item.category || 'N/A',
          this.formatCurrency(item.amount || 0),
          this.formatPercentage(item.percentage || 0)
        ]);
      });

      this.drawTable(tableData, this.yPosition, {
        headerColor: this.colors.danger,
        alternateRows: true,
      });

      this.yPosition += (tableData.length * 22) + 25;
    }

    // Top Expense Categories
    if (topExpenses.length > 0) {
      this.checkPageBreak(150);

      this.doc
        .fontSize(14)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Top Expense Categories', this.margin, this.yPosition);

      this.yPosition += 18;

      const tableData = [['Category/Vendor', 'Amount (NGN)']];
      topExpenses.forEach(item => {
        tableData.push([
          item.vendor || 'N/A',
          this.formatCurrency(item.amount || 0)
        ]);
      });

      this.drawTable(tableData, this.yPosition, {
        headerColor: '#c0392b',
        alternateRows: true,
      });

      this.yPosition += (tableData.length * 22);
    }
  }

  /**
   * Create trends analysis section
   */
  createTrendsAnalysis() {
    const monthlyTrends = this.analytics.monthlyTrends || [];
    const paymentMethods = this.analytics.paymentMethodDistribution || [];

    if (monthlyTrends.length === 0 && paymentMethods.length === 0) {
      return; // Skip if no trends data
    }

    this.checkPageBreak(300);
    if (this.yPosition > this.margin + 50) {
      this.doc.addPage();
      this.yPosition = this.margin;
    }

    this.doc
      .fontSize(20)
      .fillColor(this.colors.purple)
      .font('Helvetica-Bold')
      .text('Trends & Payment Analysis', this.margin, this.yPosition);

    this.yPosition += 25;

    // Monthly Trends
    if (monthlyTrends.length > 0) {
      this.doc
        .fontSize(14)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Monthly Trends', this.margin, this.yPosition);

      this.yPosition += 18;

      const tableData = [['Month', 'Income (NGN)', 'Expenses (NGN)', 'Net Income (NGN)', 'Margin']];
      monthlyTrends.forEach(item => {
        const income = item.income || 0;
        const expenses = item.expenses || 0;
        const net = income - expenses;
        const margin = income > 0 ? ((net / income) * 100).toFixed(1) : '0.0';

        tableData.push([
          item.month || 'N/A',
          this.formatCurrency(income),
          this.formatCurrency(expenses),
          this.formatCurrency(net),
          `${margin}%`
        ]);
      });

      this.drawTable(tableData, this.yPosition, {
        headerColor: this.colors.purple,
        alternateRows: true,
        columnWidths: [60, 100, 100, 100, 60],
      });

      this.yPosition += (tableData.length * 22) + 25;
    }

    // Payment Method Distribution
    if (paymentMethods.length > 0) {
      this.checkPageBreak(150);

      this.doc
        .fontSize(14)
        .fillColor('#000000')
        .font('Helvetica-Bold')
        .text('Payment Method Distribution', this.margin, this.yPosition);

      this.yPosition += 18;

      const tableData = [['Payment Method', 'Amount (NGN)', 'Percentage']];
      paymentMethods.forEach(item => {
        tableData.push([
          item.method || 'N/A',
          this.formatCurrency(item.amount || 0),
          this.formatPercentage(item.percentage || 0)
        ]);
      });

      this.drawTable(tableData, this.yPosition, {
        headerColor: '#3498db',
        alternateRows: true,
      });

      this.yPosition += (tableData.length * 22);
    }
  }

  /**
   * Create recent transactions section
   */
  createTransactionsSection() {
    const recentTransactions = this.analytics.recentTransactions || [];
    if (recentTransactions.length === 0) return;

    this.checkPageBreak(300);
    if (this.yPosition > this.margin + 50) {
      this.doc.addPage();
      this.yPosition = this.margin;
    }

    this.doc
      .fontSize(20)
      .fillColor(this.colors.primary)
      .font('Helvetica-Bold')
      .text('Recent Transactions', this.margin, this.yPosition);

    this.yPosition += 25;

    const transactions = recentTransactions.slice(0, 20);
    const tableData = [['Date', 'Description', 'Account', 'Type', 'Amount (NGN)']];

    transactions.forEach(txn => {
      const date = txn.entry_date ? new Date(txn.entry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
      const description = (txn.description || 'N/A').substring(0, 25);
      const account = (txn.account_name || 'N/A').substring(0, 18);
      const type = (txn.reference_type || 'N/A').substring(0, 10);
      const amount = this.formatCurrency(txn.total_amount || 0);

      tableData.push([date, description, account, type, amount]);
    });

    this.drawTable(tableData, this.yPosition, {
      headerColor: this.colors.primary,
      alternateRows: true,
      columnWidths: [70, 130, 95, 65, 80],
      fontSize: 8,
    });

    this.yPosition += (tableData.length * 18);
  }

  /**
   * Draw a table
   */
  drawTable(data, startY, options = {}) {
    const {
      headerColor = this.colors.primary,
      alternateRows = true,
      columnWidths = null,
      fontSize = 9,
    } = options;

    let y = startY;
    const cellHeight = 20;
    const cellPadding = 5;

    // Calculate column widths
    const numColumns = data[0].length;
    const tableWidth = this.pageWidth - 2 * this.margin;
    const defaultColumnWidth = tableWidth / numColumns;
    const widths = columnWidths || new Array(numColumns).fill(defaultColumnWidth);

    data.forEach((row, rowIndex) => {
      let x = this.margin;

      // Check for page break before drawing row
      if (y + cellHeight > this.pageHeight - this.margin - 40) {
        this.doc.addPage();
        y = this.margin;
        this.yPosition = this.margin;
      }

      row.forEach((cell, colIndex) => {
        const cellWidth = widths[colIndex];

        // Draw cell background
        if (rowIndex === 0) {
          this.doc
            .rect(x, y, cellWidth, cellHeight)
            .fill(headerColor);
        } else if (alternateRows && rowIndex % 2 === 0) {
          this.doc
            .rect(x, y, cellWidth, cellHeight)
            .fill('#f8f9fa');
        }

        // Draw cell border
        this.doc
          .rect(x, y, cellWidth, cellHeight)
          .stroke('#dddddd');

        // Draw cell text
        const textColor = rowIndex === 0 ? '#ffffff' : '#000000';
        const fontType = rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica';
        const textSize = rowIndex === 0 ? fontSize + 1 : fontSize;

        this.doc
          .fontSize(textSize)
          .fillColor(textColor)
          .font(fontType)
          .text(
            String(cell),
            x + cellPadding,
            y + (cellHeight - textSize) / 2,
            {
              width: cellWidth - 2 * cellPadding,
              ellipsis: true,
              lineBreak: false,
            }
          );

        x += cellWidth;
      });

      y += cellHeight;
    });

    this.yPosition = y;
  }

  /**
   * Add page numbers to all pages
   */
  addPageNumbers() {
    const pages = this.doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      this.doc.switchToPage(i);

      // Footer
      this.doc
        .fontSize(8)
        .fillColor('#888888')
        .text(
          `Page ${i + 1} of ${pages.count}`,
          this.margin,
          this.pageHeight - 30,
          { align: 'right', width: this.pageWidth - 2 * this.margin }
        );

      // Generation timestamp
      this.doc
        .fontSize(8)
        .fillColor('#888888')
        .text(
          `Generated: ${new Date(this.generatedAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          this.margin,
          this.pageHeight - 30,
          { align: 'left' }
        );
    }
  }

  /**
   * Generate the complete PDF
   */
  async generate() {
    return new Promise(async (resolve, reject) => {
      try {
        // Create PDF document
        this.doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: this.margin,
            bottom: this.margin,
            left: this.margin,
            right: this.margin,
          },
          bufferPages: true, // Enable page numbering
          info: {
            Title: 'Financial Analytics Report',
            Author: this.company.name || 'Financial Analytics System',
            Subject: `Financial Report - ${this.dateRange.startFormatted} to ${this.dateRange.endFormatted}`,
            Keywords: 'financial, analytics, report, income, expenses',
          },
        });

        const chunks = [];

        this.doc.on('data', chunk => chunks.push(chunk));
        this.doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        this.doc.on('error', reject);

        // Generate all sections (await cover page for logo download)
        await this.createCoverPage();
        this.createIncomeAnalysis();
        this.createExpenseAnalysis();
        this.createTrendsAnalysis();
        this.createTransactionsSection();

        // Add page numbers to all pages
        this.addPageNumbers();

        // Finalize the PDF
        this.doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = { FinancialAnalyticsPDFGenerator };
