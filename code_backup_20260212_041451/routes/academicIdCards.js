const express = require('express');
const router = express.Router();
const IdCardGenerationController = require('../controllers/IdCardGenerationController');
const auth = require('../middleware/auth');

// Academic Integration Routes
router.post('/generate/enrolled-students', 
  auth, 
  IdCardGenerationController.generateForEnrolledStudents
);

router.post('/generate/student', 
  auth, 
  IdCardGenerationController.generateForStudent
);

router.get('/status/class-wise', 
  auth, 
  IdCardGenerationController.getClassWiseStatus
);

router.post('/academic-year/transition', 
  auth, 
  IdCardGenerationController.manageAcademicYearTransition
);

router.get('/student/:student_id/enrollment-data', 
  auth, 
  IdCardGenerationController.getStudentEnrollmentData
);

router.get('/stats', 
  auth, 
  IdCardGenerationController.getGenerationStats
);

// Legacy Routes (backward compatibility)
router.post('/generate/single', 
  auth, 
  IdCardGenerationController.generateSingleCard
);

router.post('/generate/batch', 
  auth, 
  IdCardGenerationController.generateBatchCards
);

router.get('/batch/:batch_id/status', 
  auth, 
  IdCardGenerationController.getBatchStatus
);

router.get('/download/:id', 
  auth, 
  IdCardGenerationController.downloadCard
);

router.get('/student/:student_id/cards', 
  auth, 
  IdCardGenerationController.getStudentCards
);

module.exports = router;