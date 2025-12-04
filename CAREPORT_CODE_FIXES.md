# CAReport.tsx Code Fixes

## Changes to Implement

### 1. Add CA Setup Error State

Add this near the other state declarations (around line 200):

```typescript
const [caSetupError, setCaSetupError] = useState("");
```

### 2. Replace fetchCASetup Function

Replace the existing `fetchCASetup` function (around line 400) with this improved version:

```typescript
const fetchCASetup = useCallback(() => {
  if (!studentSection) {
    console.warn("No section available for CA setup fetch");
    setCaSetupError("No section available. Please ensure student/class has a section assigned.");
    return;
  }

  console.log("Fetching CA setup for section:", studentSection, "CA Type:", selectedCAType);
  setCaSetupError(""); // Clear previous errors
  
  _get(
    `ca-setups/list-by-section?section=${studentSection}`,
    (response) => {
      console.log("CA setup response:", response);
      
      if (!response.success || !Array.isArray(response.data)) {
        console.warn("Invalid CA setup response");
        setCaSetupData([]);
        setCaSetupError("Invalid CA setup response from server");
        return;
      }

      // Find the specific CA type setup from the section's setups
      const caTypeSetups = response.data.filter(
        (item) => item.ca_type === selectedCAType && item.is_active === 1
      );

      if (caTypeSetups.length === 0) {
        console.warn(`No active CA setup found for ${selectedCAType} in section ${studentSection}`);
        setCaSetupData([]);
        setCaSetupError(`No active CA setup found for ${selectedCAType} in section ${studentSection}. Please configure CA setup first.`);
        return;
      }

      // Get the first matching setup
      const setup = caTypeSetups[0];
      
      if (!setup.week_breakdown) {
        console.warn("No week_breakdown found in CA setup");
        setCaSetupData([]);
        setCaSetupError("CA setup is missing week breakdown configuration");
        return;
      }

      try {
        // Parse week_breakdown which contains the actual CA setup data
        const weekBreakdown = JSON.parse(setup.week_breakdown);
        
        if (!Array.isArray(weekBreakdown)) {
          console.warn("week_breakdown is not an array");
          setCaSetupData([]);
          setCaSetupError("Invalid week breakdown format in CA setup");
          return;
        }

        // Sort by week number
        const sortedData = weekBreakdown.sort(
          (a, b) => (a.week_number || 0) - (b.week_number || 0)
        );
        
        setCaSetupData(sortedData);
        setCaSetupError(""); // Clear error on success
        console.log("CA setup data loaded successfully:", sortedData);
      } catch (error) {
        console.error("Error parsing week_breakdown:", error);
        setCaSetupData([]);
        setCaSetupError(`Error parsing CA setup configuration: ${error.message}`);
      }
    },
    (err) => {
      console.error("Failed to fetch CA setup:", err);
      setCaSetupData([]);
      setCaSetupError(`Failed to load CA setup: ${err.message || "Network error"}`);
      setSaveStatus({
        message: "Failed to load CA setup data",
        type: "error",
      });
    }
  );
}, [studentSection, selectedCAType]);
```

### 3. Update fetchReportData Function

Replace the existing `fetchReportData` function (around line 450) with this version that handles configuration from response:

```typescript
const fetchReportData = useCallback(() => {
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
        setReportData(response.data);
        processScoreData(response.data);
        
        // Check if backend returns CA configuration (similar to EndOfTermReport)
        if (response.caConfiguration && Array.isArray(response.caConfiguration)) {
          console.log("CA configuration from backend:", response.caConfiguration);
          setCaSetupData(response.caConfiguration);
          setCaSetupError(""); // Clear any previous errors
        } else {
          // Fallback: fetch CA setup separately if not in response
          console.log("No CA configuration in response, fetching separately...");
          // Only fetch if we have a section
          if (studentSection) {
            fetchCASetup();
          } else {
            setCaSetupError("Cannot load CA setup: No section information available");
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
}, [selectedClass, selectedCAType, academicYear, term, studentSection, fetchCASetup]);
```

### 4. Update useEffect for CA Setup

Replace the existing useEffect that calls fetchCASetup (around line 350) with this:

```typescript
// Fetch grade boundaries when CA type changes
useEffect(() => {
  if (selectedCAType && academicYear && term) {
    fetchGradeBoundaries(selectedCAType, academicYear, term);
  }
}, [selectedCAType, academicYear, term]);

// Note: fetchCASetup is now called from fetchReportData as a fallback
// This prevents duplicate calls and ensures data and config are in sync
```

### 5. Update useEffect for Report Data

Replace the existing useEffect that calls fetchReportData (around line 360) with this:

```typescript
// Fetch report data when student and CA type are selected
useEffect(() => {
  if (selectedClass && selectedCAType) {
    fetchReportData(); // This will handle CA setup internally
  }
}, [selectedClass, selectedCAType, fetchReportData]);
```

### 6. Add Error Display in UI

Add this error display in the render section, after the status message (around line 1450):

```typescript
{/* CA Setup Error Message */}
{caSetupError && (
  <div className="alert alert-danger rounded-3 mb-4" role="alert">
    <div className="d-flex align-items-center">
      <i className="fas fa-exclamation-triangle me-2"></i>
      <div>
        <strong>CA Setup Error:</strong>
        <div className="mt-1">{caSetupError}</div>
        {!studentSection && (
          <div className="mt-2 small">
            <strong>Tip:</strong> Make sure the student/class has a section assigned in the system.
          </div>
        )}
      </div>
    </div>
  </div>
)}
```

### 7. Improve Section Detection

Add this function before the useEffects (around line 300):

```typescript
// Helper function to get section from available data
const getStudentSection = useCallback(() => {
  // Priority 1: From student data (if viewing single student)
  if (studentAdmission_no.length > 0) {
    const student = studentAdmission_no.find(s => s.admission_no === selectedClass);
    if (student?.section) {
      console.log("Section from student data:", student.section);
      return student.section;
    }
  }
  
  // Priority 2: From class data (if viewing class)
  const classData = availableClasses.find(c => c.class_code === selectedClass);
  if (classData?.section) {
    console.log("Section from class data:", classData.section);
    return classData.section;
  }
  
  // Priority 3: From studentSection state (already set)
  if (studentSection) {
    console.log("Section from state:", studentSection);
    return studentSection;
  }
  
  console.warn("No section found, defaulting to 'General'");
  return "General"; // Default fallback
}, [selectedClass, studentAdmission_no, availableClasses, studentSection]);
```

### 8. Update Auto-load Student Data useEffect

Update the useEffect that loads student data from URL (around line 250) to properly set section:

```typescript
useEffect(() => {
  if (urlAdmissionNo && selected_branch?.branch_id) {
    console.log('Loading student data for admission_no:', urlAdmissionNo);
    _get(
      `students?query_type=select&admission_no=${urlAdmissionNo}&location=Sidebar`,
      (resp) => {
        if (resp.data && resp.data.length > 0) {
          const studentData = resp.data[0];
          const classCode = studentData.current_class || studentData.class_code;
          const section = studentData.section || "General"; // Add fallback

          console.log('Student found:', studentData.student_name, 'Class:', classCode, 'Section:', section);

          // Set student admission number as "selectedClass" for compatibility
          setSelectedClass(urlAdmissionNo);
          setStudentClassCode(classCode);
          setStudentSection(section); // Ensure section is set

          // Add student to the list
          setStudentAdmission_no([{
            admission_no: urlAdmissionNo,
            student_name: studentData.student_name,
            class_code: classCode,
            class_name: studentData.class_name,
            section: section
          }]);

          setSaveStatus({
            message: `Viewing report for ${studentData.student_name} (${urlAdmissionNo})`,
            type: 'info'
          });
        } else {
          message.error('Student not found');
        }
      },
      (err) => {
        console.error('Error fetching student:', err);
        message.error('Failed to load student data');
      }
    );
  }
}, [urlAdmissionNo, selected_branch?.branch_id]);
```

## Summary of Changes

1. ✅ **Added error state** for CA setup issues
2. ✅ **Improved fetchCASetup** with better error handling and validation
3. ✅ **Updated fetchReportData** to handle configuration from API response (like EndOfTermReport)
4. ✅ **Simplified useEffect dependencies** - removed dependency on caSetupData.length
5. ✅ **Added error display** in UI for better user feedback
6. ✅ **Improved section detection** with multiple fallback mechanisms
7. ✅ **Better logging** for debugging

## Testing After Changes

1. Test with student view (URL parameter with admission_no)
2. Test with class view (selecting from dropdown)
3. Test with different CA types (CA1, CA2, CA3, EXAM)
4. Verify CA setup loads correctly
5. Verify error messages display when CA setup is missing
6. Check console logs for proper data flow
7. Verify data and configuration are in sync

## Expected Behavior

- **When CA config is in API response**: Uses it directly (like EndOfTermReport)
- **When CA config is NOT in API response**: Falls back to separate fetch
- **When section is missing**: Shows clear error message
- **When CA setup is not configured**: Shows helpful error with instructions
- **When data loads successfully**: Clears any previous errors

This fix makes CAReport.tsx more robust and aligns it with the proven pattern from EndOfTermReport.tsx while maintaining backward compatibility with the current backend API.
