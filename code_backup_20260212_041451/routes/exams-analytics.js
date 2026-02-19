const passport = require('passport');
const {
  getAverageScoresBySubject,
  getAverageScoresByClass,
  getSchoolPerformance,
  getGradeDistributionBySubject,
  getClassSubjectPerformance,
  getStudentPerformanceSummary,
  getTopPerformingStudents,
  getSubjectFailureRate,
  getComparativeTermPerformance,
  getGradeDistributionByClass,
  getPerformanceHeatmap,
  getStudentProgress,
  getBranchRankings,
  getSectionAnalytics,
  getGenderAnalytics,
  getTeacherClassAnalytics,
  getClassAnalytics,
  getAllBranches
} = require('../controllers/exams-analytics');

module.exports = (app) => {
  app.get('/average-scores-by-subject', getAverageScoresBySubject);
  app.get('/average-scores-by-class', getAverageScoresByClass);
  app.get('/school-performance', getSchoolPerformance);
  app.get('/grade-distribution-by-subject', getGradeDistributionBySubject);
  app.get('/class-subject-performance', getClassSubjectPerformance);

  // Recently added routes
  app.get('/student-performance-summary', getStudentPerformanceSummary);
  app.get('/top-performing-students', getTopPerformingStudents);
  app.get('/subject-failure-rate', getSubjectFailureRate);
  app.get('/comparative-term-performance', getComparativeTermPerformance);
  app.get('/grade-distribution-by-class', getGradeDistributionByClass);
  app.get('/performance-heatmap', getPerformanceHeatmap);
  app.get('/student-progress', getStudentProgress);
  app.get('/branch-rankings', getBranchRankings);

  // New routes for the enhanced ExamAnalytics.jsx
  app.post('/reports/branch_analytics', getSectionAnalytics);
  app.post('/reports/gender_analytics', getGenderAnalytics);
  app.post('/reports/teacher_class_analytics', getTeacherClassAnalytics);
  app.post('/reports/class_analytics', getClassAnalytics);

  // Additional analytics endpoints
  app.get('/analytics-branches', passport.authenticate('jwt', { session: false }), getAllBranches);
};
