// ============================================
// CAReport.tsx - Quick Fix for "No CA Setup Found" Error
// ============================================
// 
// PROBLEM: API returns data with CA setup embedded, but frontend expects separate fetch
// SOLUTION: Extract CA setup from the score data itself
//
// INSTRUCTIONS:
// 1. Find the fetchReportData function in CAReport.tsx (around line 450)
// 2. Replace it with the code below
// ============================================

const fetchReportData = () => {
  if (!selectedClass || !selectedCAType) return;
  console.log("Fetching report data for:", selectedClass, "CA Type:", selectedCAType);
  setDataLoading(true);
  
  const scoreData = {
    query_type: "View Student CA Report",
    admission_no: selectedClass,
    ca_type: selectedCAType,
    academic_year: academicYear,
    term: term,
  };
  
  _post(
    "reports/class-ca",
    scoreData,
    (response) => {
      console.log("Report data response:", response);
      
      if (response.success && response.data) {
        // ✅ FIX 1: Ensure data is an array (handle both single object and array responses)
        const dataArray = Array.isArray(response.data) 
          ? response.data 
          : [response.data];
        
        console.log("Data array:", dataArray);
        
        setReportData(dataArray);
        processScoreData(dataArray);
        
        // ✅ FIX 2: Extract CA setup configuration from the score data itself
        // The score data already contains week_number, max_score, ca_type, etc.
        const weekSetupMap = new Map();
        
        dataArray.forEach(item => {
          if (item.week_number && !weekSetupMap.has(item.week_number)) {
            weekSetupMap.set(item.week_number, {
              week_number: parseInt(item.week_number),
              max_score: parseFloat(item.max_score || 0),
              ca_type: item.ca_type || selectedCAType,
              assessment_type: item.assessment_type || selectedCAType,
              overall_contribution_percent: parseFloat(item.overall_contribution_percent || 0),
              academic_year: academicYear,
              term: term,
              is_active: 1
            });
          }
        });
        
        // Convert map to array and sort by week number
        const caSetup = Array.from(weekSetupMap.values())
          .sort((a, b) => a.week_number - b.week_number);
        
        console.log("Extracted CA setup from data:", caSetup);
        
        if (caSetup.length > 0) {
          setCaSetupData(caSetup);
          console.log("CA setup data set successfully:", caSetup);
        } else {
          console.warn("No CA setup could be extracted from data");
          setCaSetupData([]);
          // Fallback: try to fetch CA setup separately
          if (studentSection) {
            console.log("Attempting fallback CA setup fetch...");
            fetchCASetup();
          }
        }
      } else {
        console.warn("No report data found");
        setReportData([]);
        setScores({});
      }
      
      setDataLoading(false);
    },
    (err) => {
      console.error("Failed to fetch report data:", err);
      setReportData([]);
      setScores({});
      setSaveStatus({ message: "Failed to load report data", type: "error" });
      setDataLoading(false);
    }
  );
};

// ============================================
// OPTIONAL: Also update the useEffect (around line 360)
// ============================================
// 
// FIND this useEffect:
/*
useEffect(() => {
  if (studentSection && selectedCAType && academicYear && term) {
    fetchCASetup();
    fetchGradeBoundaries(selectedCAType, academicYear, term);
  }
}, [studentSection, selectedCAType, academicYear, term]);
*/

// REPLACE with:
useEffect(() => {
  if (selectedCAType && academicYear && term) {
    fetchGradeBoundaries(selectedCAType, academicYear, term);
  }
  // Note: fetchCASetup is now called from fetchReportData as fallback only
}, [selectedCAType, academicYear, term]);

// ============================================
// TESTING
// ============================================
// After applying this fix:
// 1. Select a student
// 2. Check browser console - should see "Extracted CA setup from data"
// 3. Table should display with weeks and scores
// 4. No more "No CA Setup Found" error
// ============================================
