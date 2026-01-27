const fs = require('fs');

// Read the file
const filePath = '/Users/apple/Downloads/apps/elite/elscholar-api/src/controllers/caAssessmentController.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the problematic class query section
const oldPattern = `            SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.score END) AS ca1_contribution,
            CASE 
              WHEN SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.max_score END) > 0 
              THEN ROUND((SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.score END) / SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.max_score END)) * 20, 2)
              ELSE SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.score END)
            END AS ca1_score,
            SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.score END) AS ca2_contribution,
            CASE 
              WHEN SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.max_score END) > 0 
              THEN ROUND((SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.score END) / SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.max_score END)) * 20, 2)
              ELSE SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.score END)
            END AS ca2_score,
            SUM(CASE WHEN ws.assessment_type = 'CA3' THEN ws.score END) AS ca3_contribution,
            SUM(CASE WHEN ws.assessment_type = 'CA3' THEN ws.score END) AS ca3_score,
            SUM(CASE WHEN ws.assessment_type = 'CA4' THEN ws.score END) AS ca4_contribution,
            SUM(CASE WHEN ws.assessment_type = 'CA4' THEN ws.score END) AS ca4_score,
            SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) AS exam_contribution,
            SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) AS exam_score,`;

const newPattern = `            -- CA1: Raw score and fixed contribution from ca_setup
            SUM(CASE WHEN ws.assessment_type = 'CA1' THEN ws.score END) AS ca1_score,
            COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA1' THEN cs.intended_contribution_percent END), 
                     MAX(CASE WHEN ws.assessment_type = 'CA1' THEN cs.overall_contribution_percent END), 10.00) AS ca1_contribution,
            -- CA2: Raw score and fixed contribution from ca_setup
            SUM(CASE WHEN ws.assessment_type = 'CA2' THEN ws.score END) AS ca2_score,
            COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA2' THEN cs.intended_contribution_percent END), 
                     MAX(CASE WHEN ws.assessment_type = 'CA2' THEN cs.overall_contribution_percent END), 20.00) AS ca2_contribution,
            -- CA3: Raw score and fixed contribution from ca_setup
            SUM(CASE WHEN ws.assessment_type = 'CA3' THEN ws.score END) AS ca3_score,
            COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA3' THEN cs.intended_contribution_percent END), 
                     MAX(CASE WHEN ws.assessment_type = 'CA3' THEN cs.overall_contribution_percent END), 0.00) AS ca3_contribution,
            -- CA4: Raw score and fixed contribution from ca_setup
            SUM(CASE WHEN ws.assessment_type = 'CA4' THEN ws.score END) AS ca4_score,
            COALESCE(MAX(CASE WHEN ws.assessment_type = 'CA4' THEN cs.intended_contribution_percent END), 
                     MAX(CASE WHEN ws.assessment_type = 'CA4' THEN cs.overall_contribution_percent END), 0.00) AS ca4_contribution,
            -- EXAM: Raw score and fixed contribution from ca_setup
            SUM(CASE WHEN ws.assessment_type = 'EXAM' THEN ws.score END) AS exam_score,
            COALESCE(MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.intended_contribution_percent END), 
                     MAX(CASE WHEN ws.assessment_type = 'EXAM' THEN cs.overall_contribution_percent END), 70.00) AS exam_contribution,`;

// Replace the content
content = content.replace(oldPattern, newPattern);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('Fixed CA query in caAssessmentController.js');
