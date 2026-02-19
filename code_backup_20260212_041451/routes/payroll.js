const PayrollController = require('../controllers/PayrollController');
const LoanController = require('../controllers/LoanController');
const { authenticate, authorize } = require('../middleware/auth');

module.exports = (app) => {
    app.get('/payroll/periods', authenticate, PayrollController.getPeriods);
    app.get('/payroll/periods/:periodId', authenticate, PayrollController.getPeriodDetails);
    app.post('/payroll/periods/initiate', authenticate, authorize(['admin','branchadmin', 'accountant']), PayrollController.initiatePeriod);
    app.post('/payroll/periods/:periodId/approve', authenticate, authorize(['admin','branchadmin']), PayrollController.approvePeriod);
    app.post('/payroll/periods/:periodId/staff/:staffId/add-item', authenticate, authorize(['admin','branchadmin']), PayrollController.addOneTimeItem);
    app.delete('/payroll/periods/:periodId', authenticate, authorize(['admin','branchadmin']), PayrollController.deletePeriod);

    // Staff Payroll Management
    app.get('/payroll/staff/all', authenticate, PayrollController.getAllStaff);
    app.get('/payroll/staff/enrolled', authenticate, PayrollController.getEnrolledStaff);
    app.get('/payroll/staff/:staffId/history', authenticate, PayrollController.getStaffPayrollHistory);
    
    // Payslip Routes
    app.get('/payroll/payslip/:staffId/:periodId', authenticate, PayrollController.getPayslip);
    app.get('/payroll/payslips/:periodId', authenticate, PayrollController.getAllPayslips);
    
    app.put('/payroll/staff/:staffId/enroll', authenticate, authorize(['admin','branchadmin']), PayrollController.enrollStaff);
    app.put('/payroll/staff/:staffId/suspend', authenticate, authorize(['admin','branchadmin']), PayrollController.suspendStaff);

    // Admin Teacher Sync
    app.post('/payroll/sync-admin-users', authenticate, authorize(['admin','branchadmin']), PayrollController.syncAdminUsers);
    app.get('/payroll/admin-users-to-sync', authenticate, authorize(['admin','branchadmin']), PayrollController.getAdminUsersToSync);
    app.post('/payroll/add-admin-users', authenticate, authorize(['admin','branchadmin']), PayrollController.addAdminUsersToTeachers);
    app.put('/payroll/staff/:staffId/promote', authenticate, authorize(['admin','branchadmin']), PayrollController.promoteStaff);
    app.put('/payroll/staff/:staffId/unenroll', authenticate, authorize(['admin','branchadmin']), PayrollController.unenrollStaff);
    app.put('/payroll/staff/:staffId/terminate', authenticate, authorize(['admin','branchadmin']), PayrollController.terminateStaff);
    app.get('/payroll/staff/enrolled', authenticate, authorize(['admin','branchadmin']), PayrollController.getEnrolledStaff);
    app.get('/payroll/staff/all', authenticate, authorize(['admin','branchadmin']), PayrollController.getAllStaff);

    // Allowances & Deductions
    app.get('/payroll/allowances', authenticate, PayrollController.getAllowanceTypes);
    app.post('/payroll/allowances', authenticate, authorize(['admin','branchadmin']), PayrollController.createAllowanceType);
    app.put('/payroll/allowances/:allowanceId', authenticate, authorize(['admin','branchadmin']), PayrollController.updateAllowanceType);
    app.delete('/payroll/allowances/:allowanceId', authenticate, authorize(['admin','branchadmin']), PayrollController.deleteAllowanceType);
    app.get('/payroll/deductions', authenticate, PayrollController.getDeductionTypes);
    app.post('/payroll/deductions', authenticate, authorize(['admin','branchadmin']), PayrollController.createDeductionType);
    app.put('/payroll/deductions/:deductionId', authenticate, authorize(['admin','branchadmin']), PayrollController.updateDeductionType);
    app.delete('/payroll/deductions/:deductionId', authenticate, authorize(['admin','branchadmin']), PayrollController.deleteDeductionType);

    // Allowance Packages
    app.get('/payroll/allowance-packages', authenticate, PayrollController.getAllowancePackages);
    app.post('/payroll/allowance-packages', authenticate, authorize(['admin','branchadmin']), PayrollController.createAllowancePackage);
    app.put('/payroll/allowance-packages/:packageId', authenticate, authorize(['admin','branchadmin']), PayrollController.updateAllowancePackage);
    app.delete('/payroll/allowance-packages/:packageId', authenticate, authorize(['admin','branchadmin']), PayrollController.deleteAllowancePackage);
    app.post('/payroll/staff/:staffId/assign-package', authenticate, authorize(['admin','branchadmin']), PayrollController.assignPackageToStaff);
    app.post('/payroll/staff/:staffId/add-package', authenticate, authorize(['admin','branchadmin']), PayrollController.assignPackageToStaff);

    // Grade-Package Relationships
    app.get('/payroll/grade-packages', authenticate, PayrollController.getGradePackages);
    app.post('/payroll/grade-packages', authenticate, authorize(['admin','branchadmin']), PayrollController.assignPackageToGrade);
    app.delete('/payroll/grade-packages/:assignmentId', authenticate, authorize(['admin','branchadmin']), PayrollController.removePackageFromGrade);

    // Staff Allowances & Deductions Assignment
    app.get('/payroll/staff-allowances', authenticate, authorize(['admin','branchadmin']), PayrollController.getAllStaffAllowances);
    app.get('/payroll/staff-deductions', authenticate, authorize(['admin','branchadmin']), PayrollController.getAllStaffDeductions);
    app.get('/payroll/staff-deductions', authenticate, authorize(['admin','branchadmin']), PayrollController.getAllStaffDeductions);
    app.get('/payroll/staff/:staffId/allowances', authenticate, PayrollController.getStaffAllowances);
    app.post('/payroll/staff/:staffId/allowances', authenticate, authorize(['admin','branchadmin']), PayrollController.assignAllowance);
    app.delete('/payroll/staff/:staffId/allowances/:allowanceId', authenticate, authorize(['admin','branchadmin']), PayrollController.removeAllowance);

    app.get('/payroll/staff/:staffId/deductions', authenticate, PayrollController.getStaffDeductions);
    app.post('/payroll/staff/:staffId/deductions', authenticate, authorize(['admin','branchadmin']), PayrollController.assignDeduction);
    app.delete('/payroll/staff/:staffId/deductions/:deductionId', authenticate, authorize(['admin','branchadmin']), PayrollController.removeDeduction);

    app.get('/payroll/staff/:staffId/loans', authenticate, PayrollController.getStaffLoans);

    // One-Time Item Templates
    app.get('/payroll/onetime-templates', authenticate, PayrollController.getOneTimeTemplates);
    app.post('/payroll/onetime-templates', authenticate, authorize(['admin','branchadmin']), PayrollController.createOneTimeTemplate);
    app.put('/payroll/onetime-templates/:templateId', authenticate, authorize(['admin','branchadmin']), PayrollController.updateOneTimeTemplate);
    app.delete('/payroll/onetime-templates/:templateId', authenticate, authorize(['admin','branchadmin']), PayrollController.deleteOneTimeTemplate);

    // Loan Types
    app.get('/payroll/loan-types', authenticate, LoanController.getLoanTypes);
    app.post('/payroll/loan-types', authenticate, authorize(['admin','branchadmin']), LoanController.createLoanType);
    app.put('/payroll/loan-types/:loanTypeId', authenticate, authorize(['admin','branchadmin']), LoanController.updateLoanType);
    app.delete('/payroll/loan-types/:loanTypeId', authenticate, authorize(['admin','branchadmin']), LoanController.deleteLoanType);

    // Loans
    app.get('/payroll/loans', authenticate, PayrollController.getLoans);
    app.get('/loans/statistics', authenticate, LoanController.getLoanStatistics);
    app.post('/payroll/loans', authenticate, authorize(['admin','branchadmin']), PayrollController.createLoan);
    app.put('/payroll/loans/:loanId/approve', authenticate, authorize(['admin','branchadmin']), PayrollController.approveLoan);
    app.put('/payroll/loans/:loanId', authenticate, authorize(['admin','branchadmin']), PayrollController.updateLoan);
    app.post('/payroll/loans/:loanId/close', authenticate, authorize(['admin','branchadmin']), PayrollController.closeLoan);
    app.delete('/payroll/loans/:loanId', authenticate, authorize(['admin','branchadmin']), PayrollController.deleteLoan);

    // Reports & Exports
    app.get('/payroll/reports/summary/:periodMonth', authenticate, PayrollController.getPayrollSummary);
    app.get('/payroll/reports/bank-schedule/:periodMonth', authenticate, PayrollController.getBankSchedule);
    app.get('/payroll/reports/deductions/:periodMonth', authenticate, PayrollController.getDeductionReport);
    app.get('/payroll/reports/loans/:periodMonth', authenticate, PayrollController.getLoanReport);
    app.get('/payroll/reports/net-salary/:periodMonth', authenticate, PayrollController.getNetSalaryReport);
    
    // Salary Reports (Grade-Level Based) - More specific routes first
    app.get('/payroll/reports/salary/analytics', authenticate, PayrollController.getSalaryAnalytics);
    app.get('/payroll/reports/salary-analytics', authenticate, PayrollController.getSalaryAnalytics);
    app.get('/payroll/reports/salary/comparison', authenticate, PayrollController.getSalaryComparison);
    app.get('/payroll/reports/salary/export', authenticate, PayrollController.exportSalaryReport);
    app.get('/payroll/reports/salary', authenticate, PayrollController.getSalaryReport);
    app.get('/payroll/exports/payslips/:periodMonth', authenticate, PayrollController.exportPayslips);
    app.get('/payroll/exports/excel/:periodMonth', authenticate, PayrollController.exportExcel);

    // Dashboard Data
    app.get('/payroll/dashboard/kpis', authenticate, PayrollController.getDashboardKPIs);
    app.get('/payroll/dashboard/charts', authenticate, PayrollController.getDashboardCharts);

    app.post('/payroll/staff/:staffId/disburse', authenticate, authorize(['admin','branchadmin']), PayrollController.disburseSalary);
    app.post('/payroll/disburse-all', authenticate, authorize(['admin','branchadmin']), PayrollController.disburseAll);
    app.post('/payroll/periods/:periodId/return', authenticate, authorize(['admin','branchadmin']), PayrollController.returnForCorrection);

    // Payment Gateway Routes
    app.get('/payroll/payment-gateway/config', authenticate, PayrollController.getPaymentGatewayConfig);
    app.get('/payroll/payment-integration-type', authenticate, PayrollController.getPaymentIntegrationType);
    app.post('/payroll/staff/:staffId/pay-via-gateway', authenticate, authorize(['admin','branchadmin']), PayrollController.disburseSalaryViaGateway);
    app.get('/payroll/payment-status/:reference', authenticate, PayrollController.checkPaymentStatus);
}