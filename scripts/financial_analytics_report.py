"""
Financial Analytics PDF Report Generator
Backend service for generating comprehensive PDF reports using reportlab
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, 
    PageBreak, Image, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.pdfgen import canvas
from datetime import datetime
from io import BytesIO
import json


class FinancialAnalyticsPDFGenerator:
    """Generate professional financial analytics PDF reports"""
    
    def __init__(self, data_dict):
        """
        Initialize PDF generator with analytics data
        
        Args:
            data_dict: Dictionary containing:
                - analyticsData: Financial analytics data
                - dateRange: Report date range
                - companyInfo: Company information
                - generatedAt: Generation timestamp
        """
        self.data = data_dict
        self.analytics = data_dict.get('analyticsData', {})
        self.date_range = data_dict.get('dateRange', {})
        self.company = data_dict.get('companyInfo', {})
        self.generated_at = data_dict.get('generatedAt', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        # Setup styles
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
        
    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#2980b9'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#2980b9'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))
        
        # Subsection header style
        self.styles.add(ParagraphStyle(
            name='SubsectionHeader',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#34495e'),
            spaceAfter=8,
            spaceBefore=8,
            fontName='Helvetica-Bold'
        ))
        
        # Info text style
        self.styles.add(ParagraphStyle(
            name='InfoText',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.grey,
            alignment=TA_RIGHT
        ))
        
    def _format_currency(self, amount):
        """Format number as currency"""
        try:
            return f"${amount:,.2f}"
        except (ValueError, TypeError):
            return "$0.00"
    
    def _format_percentage(self, value):
        """Format number as percentage"""
        try:
            return f"{value:.2f}%"
        except (ValueError, TypeError):
            return "0.00%"
    
    def _create_header_footer(self, canvas_obj, doc):
        """Create header and footer for each page"""
        canvas_obj.saveState()
        
        # Footer
        canvas_obj.setFont('Helvetica', 8)
        canvas_obj.setFillColor(colors.grey)
        
        # Page number
        page_num = canvas_obj.getPageNumber()
        text = f"Page {page_num}"
        canvas_obj.drawRightString(doc.width + doc.leftMargin, 0.5 * inch, text)
        
        # Generation info
        canvas_obj.drawString(
            doc.leftMargin, 
            0.5 * inch,
            f"Generated: {self.generated_at}"
        )
        
        canvas_obj.restoreState()
    
    def _create_cover_page(self):
        """Create the cover page with executive summary"""
        elements = []
        
        # Main title
        title = Paragraph(
            f"<b>Financial Analytics Report</b>",
            self.styles['CustomTitle']
        )
        elements.append(title)
        elements.append(Spacer(1, 0.2 * inch))
        
        # Company name
        if self.company.get('name'):
            company_name = Paragraph(
                f"<b>{self.company['name']}</b>",
                self.styles['Heading2']
            )
            elements.append(company_name)
            elements.append(Spacer(1, 0.1 * inch))
        
        # Report period
        period_text = f"""
        <b>Report Period:</b> {self.date_range.get('startFormatted', 'N/A')} 
        to {self.date_range.get('endFormatted', 'N/A')}
        """
        period = Paragraph(period_text, self.styles['Normal'])
        elements.append(period)
        elements.append(Spacer(1, 0.5 * inch))
        
        # Executive Summary Box
        elements.append(Paragraph("<b>Executive Summary</b>", self.styles['SectionHeader']))
        elements.append(Spacer(1, 0.1 * inch))
        
        # Key metrics table
        key_metrics_data = [
            ['Metric', 'Value', 'Status'],
            [
                'Total Income',
                self._format_currency(self.analytics.get('totalIncome', 0)),
                '✓'
            ],
            [
                'Total Expenses',
                self._format_currency(self.analytics.get('totalExpenses', 0)),
                '✓'
            ],
            [
                'Net Income',
                self._format_currency(self.analytics.get('netIncome', 0)),
                '✓' if self.analytics.get('netIncome', 0) >= 0 else '✗'
            ],
            [
                'Profit Margin',
                self._format_percentage(self.analytics.get('profitMargin', 0)),
                '✓' if self.analytics.get('profitMargin', 0) >= 10 else '!'
            ],
        ]
        
        key_metrics_table = Table(key_metrics_data, colWidths=[2.5*inch, 2*inch, 1*inch])
        key_metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2980b9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        
        elements.append(key_metrics_table)
        elements.append(Spacer(1, 0.3 * inch))
        
        # Financial Ratios
        elements.append(Paragraph("<b>Financial Ratios & Indicators</b>", self.styles['SubsectionHeader']))
        
        ratios_data = [
            ['Ratio', 'Value'],
            ['Expense Ratio', self._format_percentage(self.analytics.get('expenseRatio', 0))],
            ['Growth Rate', self._format_percentage(self.analytics.get('growthRate', 0))],
            ['Cash Balance', self._format_currency(self.analytics.get('cashBalance', 0))],
            ['Accounts Receivable', self._format_currency(self.analytics.get('accountsReceivable', 0))],
            ['Payroll Expenses', self._format_currency(self.analytics.get('payrollExpenses', 0))],
        ]
        
        ratios_table = Table(ratios_data, colWidths=[3*inch, 2.5*inch])
        ratios_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        
        elements.append(ratios_table)
        elements.append(PageBreak())
        
        return elements
    
    def _create_income_analysis(self):
        """Create income analysis section"""
        elements = []
        
        elements.append(Paragraph("<b>Income Analysis</b>", self.styles['SectionHeader']))
        elements.append(Spacer(1, 0.1 * inch))
        
        # Income by Category
        income_by_category = self.analytics.get('incomeByCategory', [])
        if income_by_category:
            elements.append(Paragraph("<b>Income by Category</b>", self.styles['SubsectionHeader']))
            
            table_data = [['Category', 'Amount', 'Percentage']]
            for item in income_by_category:
                table_data.append([
                    item.get('category', 'N/A'),
                    self._format_currency(item.get('amount', 0)),
                    self._format_percentage(item.get('percentage', 0))
                ])
            
            table = Table(table_data, colWidths=[2.5*inch, 2*inch, 1.5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#27ae60')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            
            elements.append(table)
            elements.append(Spacer(1, 0.2 * inch))
        
        # Top Income Sources
        top_income = self.analytics.get('topIncomeClasses', [])
        if top_income:
            elements.append(Paragraph("<b>Top Income Sources</b>", self.styles['SubsectionHeader']))
            
            table_data = [['Source', 'Amount']]
            for item in top_income:
                table_data.append([
                    item.get('class', 'N/A'),
                    self._format_currency(item.get('amount', 0))
                ])
            
            table = Table(table_data, colWidths=[3.5*inch, 2.5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2ecc71')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            
            elements.append(table)
        
        elements.append(PageBreak())
        return elements
    
    def _create_expense_analysis(self):
        """Create expense analysis section"""
        elements = []
        
        elements.append(Paragraph("<b>Expense Analysis</b>", self.styles['SectionHeader']))
        elements.append(Spacer(1, 0.1 * inch))
        
        # Expenses by Category
        expenses_by_category = self.analytics.get('expensesByCategory', [])
        if expenses_by_category:
            elements.append(Paragraph("<b>Expenses by Category</b>", self.styles['SubsectionHeader']))
            
            table_data = [['Category', 'Amount', 'Percentage']]
            for item in expenses_by_category:
                table_data.append([
                    item.get('category', 'N/A'),
                    self._format_currency(item.get('amount', 0)),
                    self._format_percentage(item.get('percentage', 0))
                ])
            
            table = Table(table_data, colWidths=[2.5*inch, 2*inch, 1.5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e74c3c')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            
            elements.append(table)
            elements.append(Spacer(1, 0.2 * inch))
        
        # Top Expense Categories
        top_expenses = self.analytics.get('topExpenseVendors', [])
        if top_expenses:
            elements.append(Paragraph("<b>Top Expense Categories</b>", self.styles['SubsectionHeader']))
            
            table_data = [['Category/Vendor', 'Amount']]
            for item in top_expenses:
                table_data.append([
                    item.get('vendor', 'N/A'),
                    self._format_currency(item.get('amount', 0))
                ])
            
            table = Table(table_data, colWidths=[3.5*inch, 2.5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#c0392b')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            
            elements.append(table)
        
        elements.append(PageBreak())
        return elements
    
    def _create_trends_analysis(self):
        """Create trends and payment method analysis"""
        elements = []
        
        elements.append(Paragraph("<b>Trends & Payment Analysis</b>", self.styles['SectionHeader']))
        elements.append(Spacer(1, 0.1 * inch))
        
        # Monthly Trends
        monthly_trends = self.analytics.get('monthlyTrends', [])
        if monthly_trends:
            elements.append(Paragraph("<b>Monthly Trends</b>", self.styles['SubsectionHeader']))
            
            table_data = [['Month', 'Income', 'Expenses', 'Net Income', 'Profit Margin']]
            for item in monthly_trends:
                income = item.get('income', 0)
                expenses = item.get('expenses', 0)
                net = income - expenses
                margin = (net / income * 100) if income > 0 else 0
                
                table_data.append([
                    item.get('month', 'N/A'),
                    self._format_currency(income),
                    self._format_currency(expenses),
                    self._format_currency(net),
                    self._format_percentage(margin)
                ])
            
            table = Table(table_data, colWidths=[1*inch, 1.5*inch, 1.5*inch, 1.5*inch, 1*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9b59b6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 8),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            
            elements.append(table)
            elements.append(Spacer(1, 0.2 * inch))
        
        # Payment Method Distribution
        payment_methods = self.analytics.get('paymentMethodDistribution', [])
        if payment_methods:
            elements.append(Paragraph("<b>Payment Method Distribution</b>", self.styles['SubsectionHeader']))
            
            table_data = [['Payment Method', 'Amount', 'Percentage']]
            for item in payment_methods:
                table_data.append([
                    item.get('method', 'N/A'),
                    self._format_currency(item.get('amount', 0)),
                    self._format_percentage(item.get('percentage', 0))
                ])
            
            table = Table(table_data, colWidths=[2.5*inch, 2*inch, 1.5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3498db')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 1), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ]))
            
            elements.append(table)
        
        elements.append(PageBreak())
        return elements
    
    def _create_transactions_section(self):
        """Create recent transactions section"""
        elements = []
        
        recent_transactions = self.analytics.get('recentTransactions', [])
        if not recent_transactions:
            return elements
        
        elements.append(Paragraph("<b>Recent Transactions</b>", self.styles['SectionHeader']))
        elements.append(Spacer(1, 0.1 * inch))
        
        # Limit to 20 transactions for readability
        transactions = recent_transactions[:20]
        
        table_data = [['Date', 'Description', 'Account', 'Type', 'Amount']]
        for txn in transactions:
            date_str = txn.get('entry_date', 'N/A')
            if date_str != 'N/A':
                try:
                    date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    date_str = date_obj.strftime('%b %d, %Y')
                except:
                    pass
            
            table_data.append([
                date_str,
                txn.get('description', 'N/A')[:30],  # Truncate long descriptions
                txn.get('account_name', 'N/A')[:20],
                txn.get('reference_type', 'N/A'),
                self._format_currency(txn.get('total_amount', 0))
            ])
        
        table = Table(table_data, colWidths=[1*inch, 2*inch, 1.5*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2980b9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (4, 0), (4, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('TOPPADDING', (0, 1), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
        ]))
        
        elements.append(table)
        
        return elements
    
    def generate(self, output_path=None):
        """
        Generate the complete PDF report
        
        Args:
            output_path: Path to save PDF. If None, returns BytesIO buffer
            
        Returns:
            BytesIO buffer if output_path is None, else None
        """
        # Create buffer or file
        if output_path:
            buffer = output_path
        else:
            buffer = BytesIO()
        
        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=0.75*inch,
            leftMargin=0.75*inch,
            topMargin=inch,
            bottomMargin=inch,
            title="Financial Analytics Report"
        )
        
        # Build content
        story = []
        
        # Add all sections
        story.extend(self._create_cover_page())
        story.extend(self._create_income_analysis())
        story.extend(self._create_expense_analysis())
        story.extend(self._create_trends_analysis())
        story.extend(self._create_transactions_section())
        
        # Build PDF
        doc.build(story, onFirstPage=self._create_header_footer, 
                  onLaterPages=self._create_header_footer)
        
        if not output_path:
            buffer.seek(0)
            return buffer
        
        return None


# Flask/FastAPI endpoint example
"""
from flask import Flask, request, send_file

@app.route('/api/generate-financial-pdf', methods=['POST'])
def generate_financial_pdf():
    try:
        data = request.json
        
        generator = FinancialAnalyticsPDFGenerator(data)
        pdf_buffer = generator.generate()
        
        filename = f"Financial-Analytics-Report-{data['dateRange']['start']}-to-{data['dateRange']['end']}.pdf"
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return {'error': str(e)}, 500
"""


if __name__ == "__main__":
    # Example usage
    sample_data = {
        "analyticsData": {
            "totalIncome": 150000,
            "totalExpenses": 95000,
            "netIncome": 55000,
            "profitMargin": 36.67,
            "expenseRatio": 63.33,
            "growthRate": 15.5,
            "cashBalance": 125000,
            "accountsReceivable": 22500,
            "payrollExpenses": 57000,
            "incomeByCategory": [
                {"category": "Product Sales", "amount": 100000, "percentage": 66.67},
                {"category": "Services", "amount": 50000, "percentage": 33.33}
            ],
            "expensesByCategory": [
                {"category": "Salaries", "amount": 57000, "percentage": 60},
                {"category": "Operations", "amount": 38000, "percentage": 40}
            ],
            "monthlyTrends": [
                {"month": "Jan", "income": 45000, "expenses": 28500},
                {"month": "Feb", "income": 52000, "expenses": 31350},
                {"month": "Mar", "income": 53000, "expenses": 35150}
            ],
            "topIncomeClasses": [
                {"class": "Enterprise", "amount": 80000},
                {"class": "SMB", "amount": 70000}
            ],
            "topExpenseVendors": [
                {"vendor": "Supplier A", "amount": 25000},
                {"vendor": "Supplier B", "amount": 20000}
            ],
            "paymentMethodDistribution": [
                {"method": "Bank Transfer", "amount": 90000, "percentage": 60},
                {"method": "Credit Card", "amount": 60000, "percentage": 40}
            ],
            "recentTransactions": []
        },
        "dateRange": {
            "start": "2025-01-01",
            "end": "2025-03-31",
            "startFormatted": "Jan 01, 2025",
            "endFormatted": "Mar 31, 2025"
        },
        "companyInfo": {
            "name": "ACME Corporation",
            "address": "123 Business St, City, State 12345",
            "phone": "(555) 123-4567",
            "email": "info@acme.com"
        },
        "generatedAt": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    generator = FinancialAnalyticsPDFGenerator(sample_data)
    generator.generate("financial_analytics_report.pdf")
    print("PDF generated successfully!")   