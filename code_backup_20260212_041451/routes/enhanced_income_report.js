const EnhancedIncomeReportController = require("../controllers/enhanced_income_report_controller");
const { authenticate } = require("../middleware/auth");

module.exports = (app) => {
  // ========================================
  // ENHANCED INCOME REPORT ROUTES
  // ========================================

  /**
   * Get enhanced income report with comprehensive filtering
   * GET /api/v2/reports/enhanced-income
   * 
   * Query Parameters:
   * - start_date: Start date for filtering (YYYY-MM-DD)
   * - end_date: End date for filtering (YYYY-MM-DD)
   * - academic_year: Filter by academic year
   * - term: Filter by term (First Term, Second Term, Third Term)
   * - category: Filter by income category
   * - subcategory: Filter by subcategory
   * - class_id: Filter by class code
   * - student_id: Filter by student admission number
   * - payment_method: Filter by payment method
   * - source: Filter by income source
   * - fee_type: Filter by fee type
   * - department: Filter by department
   * - min_amount: Minimum amount filter
   * - max_amount: Maximum amount filter
   * - status: Filter by payment status
   * - has_discount: Filter records with discount (true/false)
   * - has_tax: Filter records with tax (true/false)
   * - group_by: Group results by (category, class, student, academic_year, term, payment_method, date)
   * - sort_by: Sort by (amount, count, average, name)
   * - sort_order: Sort order (asc, desc)
   * - page: Page number for pagination (default: 1)
   * - limit: Records per page (default: 50)
   * - include_summary: Include summary statistics (true/false, default: true)
   * - include_analytics: Include analytics data (true/false, default: true)
   * - school_id: Filter by school ID
   * - branch_id: Filter by branch ID
   */
  app.get("/api/v2/reports/enhanced-income", authenticate, EnhancedIncomeReportController.getEnhancedIncomeReport);

  /**
   * Get filter options for income report
   * GET /api/v2/reports/enhanced-income/filters
   * 
   * Returns available options for:
   * - Academic years
   * - Terms
   * - Payment methods
   * - Classes
   * - Students
   * - Income categories
   * - Statuses
   * - Group by options
   * - Sort options
   */
  app.get("/api/v2/reports/enhanced-income/filters", authenticate, EnhancedIncomeReportController.getFilterOptions);

  /**
   * Export enhanced income report
   * GET /api/v2/reports/enhanced-income/export
   * 
   * Query Parameters:
   * - format: Export format (json, csv) - default: json
   * - All other parameters same as main report endpoint
   * 
   * Returns:
   * - JSON: Full report data in JSON format
   * - CSV: Report data as downloadable CSV file
   */
  app.get("/api/v2/reports/enhanced-income/export", authenticate, EnhancedIncomeReportController.exportIncomeReport);

  // ========================================
  // LEGACY COMPATIBILITY ROUTES
  // ========================================

  /**
   * Legacy income report route (redirects to enhanced version)
   * GET /reports/enhanced-income
   */
  app.get("/reports/enhanced-income", authenticate, (req, res) => {
    // Redirect to new API endpoint with query parameters
    const queryString = new URLSearchParams(req.query).toString();
    res.redirect(`/api/v2/reports/enhanced-income?${queryString}`);
  });

  // ========================================
  // API DOCUMENTATION ROUTE
  // ========================================
  app.get("/api/v2/reports/enhanced-income/docs", (req, res) => {
    res.json({
      title: "Enhanced Income Report API Documentation",
      version: "2.0.0",
      description: "Comprehensive income reporting with advanced filtering, analytics, and export capabilities",
      
      endpoints: {
        main_report: {
          method: "GET",
          path: "/api/v2/reports/enhanced-income",
          description: "Get enhanced income report with comprehensive filtering and analytics",
          authentication: "Required",
          
          query_parameters: {
            date_filters: {
              start_date: {
                type: "string",
                format: "YYYY-MM-DD",
                description: "Start date for filtering income records",
                example: "2024-01-01"
              },
              end_date: {
                type: "string", 
                format: "YYYY-MM-DD",
                description: "End date for filtering income records",
                example: "2024-12-31"
              }
            },
            
            academic_filters: {
              academic_year: {
                type: "string",
                description: "Filter by academic year",
                example: "2023/2024"
              },
              term: {
                type: "string",
                description: "Filter by academic term",
                options: ["First Term", "Second Term", "Third Term"],
                example: "First Term"
              }
            },
            
            categorization_filters: {
              category: {
                type: "string",
                description: "Filter by income category",
                options: ["Tuition Fees", "Transportation", "Materials", "Examination", "Activities", "Meals", "Other Income"],
                example: "Tuition Fees"
              },
              subcategory: {
                type: "string",
                description: "Filter by subcategory",
                example: "School Fees"
              },
              fee_type: {
                type: "string",
                description: "Filter by fee type",
                example: "Tuition"
              }
            },
            
            entity_filters: {
              class_id: {
                type: "string",
                description: "Filter by class code",
                example: "JSS1A"
              },
              student_id: {
                type: "string",
                description: "Filter by student admission number",
                example: "STU001"
              },
              department: {
                type: "string",
                description: "Filter by department",
                example: "Science"
              }
            },
            
            payment_filters: {
              payment_method: {
                type: "string",
                description: "Filter by payment method",
                options: ["Cash", "Bank Transfer", "Card", "Cheque", "Online"],
                example: "Cash"
              },
              source: {
                type: "string",
                description: "Filter by income source",
                example: "School Fees"
              },
              status: {
                type: "string",
                description: "Filter by payment status",
                options: ["completed", "pending", "failed", "cancelled"],
                example: "completed"
              }
            },
            
            amount_filters: {
              min_amount: {
                type: "number",
                description: "Minimum amount filter",
                example: 1000
              },
              max_amount: {
                type: "number", 
                description: "Maximum amount filter",
                example: 100000
              },
              has_discount: {
                type: "boolean",
                description: "Filter records with discount",
                example: true
              },
              has_tax: {
                type: "boolean",
                description: "Filter records with tax",
                example: false
              }
            },
            
            organization_filters: {
              group_by: {
                type: "string",
                description: "Group results by specified field",
                options: ["category", "class", "student", "academic_year", "term", "payment_method", "date"],
                default: "category",
                example: "category"
              },
              sort_by: {
                type: "string",
                description: "Sort results by specified field",
                options: ["amount", "count", "average", "name"],
                default: "amount",
                example: "amount"
              },
              sort_order: {
                type: "string",
                description: "Sort order",
                options: ["asc", "desc"],
                default: "desc",
                example: "desc"
              }
            },
            
            pagination_filters: {
              page: {
                type: "integer",
                description: "Page number for pagination",
                default: 1,
                example: 1
              },
              limit: {
                type: "integer",
                description: "Records per page",
                default: 50,
                max: 1000,
                example: 50
              }
            },
            
            output_filters: {
              include_summary: {
                type: "boolean",
                description: "Include summary statistics",
                default: true,
                example: true
              },
              include_analytics: {
                type: "boolean",
                description: "Include analytics data",
                default: true,
                example: true
              }
            },
            
            context_filters: {
              school_id: {
                type: "string",
                description: "Filter by school ID",
                example: "SCH/1"
              },
              branch_id: {
                type: "string",
                description: "Filter by branch ID", 
                example: "BRCH00001"
              }
            }
          },
          
          response_structure: {
            success: "boolean",
            message: "string",
            data: {
              income_records: "array of income record objects",
              summary: {
                total_records: "number",
                total_amount: "number",
                average_amount: "number",
                min_amount: "number",
                max_amount: "number",
                total_discount: "number",
                total_tax: "number",
                net_total: "number",
                profit_margin: "number",
                unique_students: "number",
                unique_classes: "number",
                unique_academic_years: "number",
                unique_terms: "number",
                unique_payment_methods: "number",
                formatted_total: "string",
                formatted_net_total: "string"
              },
              analytics: {
                grouped_data: "array of grouped analysis",
                group_by: "string",
                total_groups: "number"
              },
              pagination: {
                current_page: "number",
                per_page: "number", 
                total_records: "number",
                total_pages: "number",
                has_next_page: "boolean",
                has_prev_page: "boolean"
              },
              filters_applied: "object with applied filters"
            },
            generated_at: "ISO datetime string"
          }
        },
        
        filter_options: {
          method: "GET",
          path: "/api/v2/reports/enhanced-income/filters",
          description: "Get available filter options for the income report",
          authentication: "Required",
          
          response_structure: {
            success: "boolean",
            message: "string",
            data: {
              academic_years: "array of available academic years",
              terms: "array of available terms",
              payment_methods: "array of available payment methods",
              classes: "array of class objects with class_code and class_name",
              statuses: "array of available statuses",
              income_categories: "array of available income categories",
              students: "array of student objects with admission_no and student_name",
              group_by_options: "array of grouping options",
              sort_options: "array of sorting options"
            }
          }
        },
        
        export: {
          method: "GET",
          path: "/api/v2/reports/enhanced-income/export",
          description: "Export income report data in various formats",
          authentication: "Required",
          
          query_parameters: {
            format: {
              type: "string",
              description: "Export format",
              options: ["json", "csv"],
              default: "json",
              example: "csv"
            },
            "...other_filters": "All filters from main report endpoint are supported"
          },
          
          response: {
            json_format: "Same structure as main report endpoint",
            csv_format: "CSV file download with headers: Date, Student Name, Class, Academic Year, Term, Description, Category, Amount, Payment Method, Discount, Tax, Net Amount, Status, Reference No"
          }
        }
      },
      
      usage_examples: {
        basic_report: {
          description: "Get basic income report for current month",
          url: "/api/v2/reports/enhanced-income?start_date=2024-01-01&end_date=2024-01-31"
        },
        
        academic_period_report: {
          description: "Get income report for specific academic year and term",
          url: "/api/v2/reports/enhanced-income?academic_year=2023/2024&term=First Term"
        },
        
        class_based_analysis: {
          description: "Analyze income by class with summary statistics",
          url: "/api/v2/reports/enhanced-income?group_by=class&sort_by=amount&sort_order=desc&include_summary=true"
        },
        
        student_payment_tracking: {
          description: "Track payments for specific student",
          url: "/api/v2/reports/enhanced-income?student_id=STU001&include_analytics=true"
        },
        
        fee_category_analysis: {
          description: "Analyze income by fee categories",
          url: "/api/v2/reports/enhanced-income?group_by=category&category=Tuition Fees&min_amount=5000"
        },
        
        payment_method_breakdown: {
          description: "Breakdown by payment methods",
          url: "/api/v2/reports/enhanced-income?group_by=payment_method&include_analytics=true"
        },
        
        export_csv: {
          description: "Export full report as CSV",
          url: "/api/v2/reports/enhanced-income/export?format=csv&start_date=2024-01-01&end_date=2024-12-31"
        },
        
        filtered_export: {
          description: "Export filtered data for specific class and term",
          url: "/api/v2/reports/enhanced-income/export?format=csv&class_id=JSS1A&term=First Term&academic_year=2023/2024"
        }
      },
      
      best_practices: {
        performance: [
          "Use date ranges to limit data scope",
          "Use pagination for large datasets",
          "Consider using specific filters to reduce query complexity",
          "Use include_summary=false and include_analytics=false for faster responses when not needed"
        ],
        
        filtering: [
          "Combine multiple filters for precise results",
          "Use academic_year and term filters for academic period analysis",
          "Use amount filters (min_amount, max_amount) for financial threshold analysis",
          "Use group_by parameter for different analytical perspectives"
        ],
        
        analytics: [
          "Use group_by='category' for fee type analysis",
          "Use group_by='class' for class-wise performance",
          "Use group_by='student' for individual student tracking",
          "Use group_by='date' for time-series analysis",
          "Use group_by='payment_method' for payment preference analysis"
        ],
        
        export: [
          "Use CSV format for spreadsheet analysis",
          "Use JSON format for programmatic processing",
          "Apply filters before export to get relevant data",
          "Consider pagination limits for large exports"
        ]
      },
      
      error_handling: {
        common_errors: {
          "400": "Bad Request - Invalid query parameters",
          "401": "Unauthorized - Authentication required",
          "403": "Forbidden - Insufficient permissions",
          "500": "Internal Server Error - Database or server error"
        },
        
        validation_errors: [
          "Invalid date format (use YYYY-MM-DD)",
          "Invalid group_by option",
          "Invalid sort_by option",
          "Invalid sort_order option",
          "Page number must be positive integer",
          "Limit must be between 1 and 1000"
        ]
      }
    });
  });
};