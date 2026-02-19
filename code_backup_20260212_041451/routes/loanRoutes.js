  
const LoanController = require('../controllers/LoanController');
const { authenticate, authorize } = require('../middleware/auth');
module.exports = (app) => {
    // Loan Types
    app.post('/loan-types', authenticate, authorize(['admin']), LoanController.createLoanType);
    app.get('/loan-types', authenticate, authorize(['admin']), LoanController.getLoanTypes);
    app.put('/loan-types/:loanTypeId', authenticate, authorize(['admin']), LoanController.updateLoanType);
    app.delete('/loan-types/:loanTypeId', authenticate, authorize(['admin']), LoanController.deleteLoanType);

    // Loans
    app.get('/loans', authenticate, LoanController.getLoans);
    app.get('/loans/type/:loanTypeId', authenticate, LoanController.getLoansByType);
    app.post('/loans/enroll', authenticate, authorize(['admin', 'hr']), LoanController.enrollStaffInLoan);
    app.put('/loans/:loanId/status', authenticate, authorize(['admin', 'hr']), LoanController.updateLoanStatus);
    app.post('/loans/bulk-update', authenticate, authorize(['admin']), LoanController.bulkUpdateLoans);

    // Statistics & Calculations
    app.get('/loans/statistics', authenticate, LoanController.getLoanStatistics);
    app.post('/loans/calculate-schedule', authenticate, LoanController.calculatePaymentSchedule);
}
