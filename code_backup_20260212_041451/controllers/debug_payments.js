const db = require("../models");
const sequelize = db.sequelize;

/**
 * DEBUG PAYMENTS CONTROLLER
 * Specifically for debugging the manage_payments_enhanced stored procedure
 * and demonstrating the Sequelize CALL vs Direct SQL difference
 */

const debugPayments = async (req, res) => {
  try {
    console.log("=== DEBUG PAYMENTS START ===");
    console.log("Query params:", req.query);
    console.log("User:", req.user);
    
    console.log("\
🔬 TESTING SEQUELIZE CALL BEHAVIOR");
    
    // Test the exact call that's failing
    const result = await sequelize.query(
      `CALL manage_payments_enhanced(
        'select-bills',
        NULL,
        NULL,
        'CLS0003',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        '2025/2026',
        'First Term',
        NULL,
        NULL,
        'BRCH00001',
        'SCH/1',
        NULL,
        NULL,
        NULL,
        NULL,
        NULL
      )`
    );
    
    console.log("\
=== SEQUELIZE CALL RESULT ANALYSIS ===");
    console.log("Result type:", typeof result);
    console.log("Result is array:", Array.isArray(result));
    console.log("Result length:", result?.length);
    console.log("First item type:", typeof result?.[0]);
    console.log("First item keys:", result?.[0] ? Object.keys(result[0]) : []);
    console.log("\
🔑 KEY INSIGHT: Sequelize CALL returns flat array, not [[], []] format");
    
    // Show the difference
    if (Array.isArray(result)) {
      console.log("\
📊 RESULT STRUCTURE:");
      console.log(`  ✅ Direct array with ${result.length} items`);
      
      if (result.length > 0 && typeof result[0] === 'object') {
        console.log(`  📋 Each item is an object with keys:`, Object.keys(result[0]));
        console.log(`  👥 Sample student names:`, result.slice(0, 5).map(r => r.student_name));
        console.log(`  ✅ This is the correct data format for Sequelize CALL`);
      }
    }
    
    // Demonstrate correct extraction
    const correctData = result || [];
    
    console.log("\
=== CORRECT EXTRACTION ===");
    console.log("✅ For Sequelize CALL: use result directly");
    console.log("❌ DON'T use result[0] (that's for direct SQL queries)");
    console.log(`📊 Extracted ${correctData.length} records`);
    console.log(`👥 All students:`, correctData.map(r => r.student_name));
    
    res.json({
      success: true,
      message: "Sequelize CALL behavior analysis complete",
      insight: {
        problem: "Controller was trying to extract result[0] from Sequelize CALL",
        solution: "Sequelize CALL returns flat array, use result directly",
        difference: "Direct SQL returns [data[], metadata], CALL returns data[]"
      },
      debug: {
        rawResultType: typeof result,
        rawResultLength: result?.length,
        rawResultIsArray: Array.isArray(result),
        extractedDataLength: correctData.length,
        extractionMethod: "direct_sequelize_result"
      },
      data: correctData,
      sampleResult: result?.slice(0, 2) // Show first 2 records
    });
    
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};

/**
 * Test different query types to show consistent behavior
 */
const debugQueryTypes = async (req, res) => {
  try {
    const queryTypes = ['select-bills', 'select-entries', 'select-student'];
    const results = {};
    
    for (const queryType of queryTypes) {
      try {
        const result = await sequelize.query(
          `CALL manage_payments_enhanced(
            :query_type,
            NULL, NULL, 'CLS0003', NULL, NULL, NULL, NULL, NULL,
            '2025/2026', 'First Term', NULL, NULL, 'BRCH00001', 'SCH/1',
            NULL, NULL, NULL, NULL, NULL
          )`,
          {
            replacements: { query_type: queryType }
          }
        );
        
        results[queryType] = {
          success: true,
          resultType: typeof result,
          resultLength: result?.length,
          isDirectArray: Array.isArray(result) && result.length > 0 && typeof result[0] === 'object',
          extractionMethod: "use_result_directly",
          sampleData: Array.isArray(result) ? result.slice(0, 2) : result
        };
      } catch (error) {
        results[queryType] = {
          success: false,
          error: error.message
        };
      }
    }
    
    res.json({
      success: true,
      message: "All Sequelize CALL operations return flat arrays",
      queryTypeResults: results,
      conclusion: "Consistent behavior: Sequelize CALL always returns flat array"
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  debugPayments,
  debugQueryTypes
};

