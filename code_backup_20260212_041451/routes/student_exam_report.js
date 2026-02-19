const passport = require("passport");
const {
  getStudentResult,getStudentResults,
  getStudentResultsWithExamType,
  getClassResultsByClassName,
  getClassResults,
  getCharacterScores,
  postCharacterScores,
  examRemarks,
} = require("../controllers/student_exams_details");

module.exports = (app) => {
    app.get('/get_student_results_by/admission_no', getStudentResults);
    
    app.get('/get_student_results', getStudentResults);

    app.post('/get_student_results_with_exam_type', getStudentResultsWithExamType);

      app.post(
        "/get_student_results",
        getStudentResult
      );

    app.get('/class-results/:class_name', getClassResultsByClassName);
    app.post('/get_class_results', getClassResults);
    app.post('/character-scores',
      passport.authenticate('jwt', { session: false }),
      getCharacterScores);
      app.post('/new-character-scores',
        passport.authenticate('jwt', { session: false }),
        postCharacterScores);
    
    // Character Traits endpoints (for managing trait definitions)
    const { getCharacterTraits, manageCharacterTraits } = require('../controllers/characterTraitsController');
    app.post('/character-traits',
      passport.authenticate('jwt', { session: false }),
      getCharacterTraits);
    app.post('/manage-character-traits',
      passport.authenticate('jwt', { session: false }),
      manageCharacterTraits);
    
    app.post('/exams/remark',
      passport.authenticate('jwt', { session: false }),
      examRemarks
    )
};
