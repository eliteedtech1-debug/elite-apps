# Requirements Document

## Introduction

The End of Term Report configuration system has visibility controls that are not working correctly across all report templates. The API provides configuration settings for showing/hiding different report sections, but the implementation is inconsistent between React-PDF and jsPDF templates, leading to sections appearing when they should be hidden and vice versa.

## Glossary

- **Report_Template**: A component that generates PDF reports (React-PDF or jsPDF based)
- **Visibility_Configuration**: API settings that control which sections appear in reports
- **Report_Section**: A distinct part of the report (attendance, character assessment, remarks)
- **Configuration_API**: The endpoint that provides report visibility settings
- **Template_Consistency**: Uniform handling of visibility settings across all templates

## Requirements

### Requirement 1: Attendance Section Visibility Control

**User Story:** As a school administrator, I want to control whether the attendance section appears in reports, so that I can customize reports based on assessment type and school policy.

#### Acceptance Criteria

1. WHEN the Configuration_API returns `"showAttendancePerformance": false`, THE Report_Template SHALL hide the attendance section completely
2. WHEN the Configuration_API returns `"showAttendancePerformance": true`, THE Report_Template SHALL display the attendance section if attendance data exists
3. WHEN the Configuration_API is unavailable or missing this field, THE Report_Template SHALL default to showing the attendance section
4. THE React_PDF_Template SHALL use the same field mapping as the jsPDF_Template for attendance visibility
5. FOR ALL report templates, the attendance section visibility SHALL be controlled by the `showAttendancePerformance` configuration field

### Requirement 2: Character Assessment Section Visibility Control

**User Story:** As a school administrator, I want to control whether the personal development/character assessment section appears in reports, so that I can align reports with our assessment framework.

#### Acceptance Criteria

1. WHEN the Configuration_API returns `"showCharacterAssessment": false`, THE Report_Template SHALL hide the character assessment section completely
2. WHEN the Configuration_API returns `"showCharacterAssessment": true`, THE Report_Template SHALL display the character assessment section if character data exists
3. WHEN the Configuration_API is unavailable or missing this field, THE Report_Template SHALL default to showing the character assessment section
4. FOR ALL report templates, the character assessment section visibility SHALL be controlled consistently by the `showCharacterAssessment` field

### Requirement 3: Teacher Remarks Visibility Control

**User Story:** As a school administrator, I want to control whether form master/teacher comments appear in reports, so that I can manage the level of detail in student reports.

#### Acceptance Criteria

1. WHEN the Configuration_API returns `"showTeacherRemarks": false`, THE Report_Template SHALL hide the teacher remarks section completely
2. WHEN the Configuration_API returns `"showTeacherRemarks": true`, THE Report_Template SHALL display the teacher remarks section if teacher comment data exists
3. WHEN the Configuration_API is unavailable or missing this field, THE Report_Template SHALL default to showing the teacher remarks section
4. FOR ALL report templates, the teacher remarks section visibility SHALL be controlled by the `showTeacherRemarks` configuration field

### Requirement 4: Principal Remarks Visibility Control

**User Story:** As a school administrator, I want to control whether principal comments appear in reports, so that I can manage administrative oversight visibility in reports.

#### Acceptance Criteria

1. WHEN the Configuration_API returns `"showPrincipalRemarks": false`, THE Report_Template SHALL hide the principal remarks section completely
2. WHEN the Configuration_API returns `"showPrincipalRemarks": true`, THE Report_Template SHALL display the principal remarks section if principal comment data exists
3. WHEN the Configuration_API is unavailable or missing this field, THE Report_Template SHALL default to showing the principal remarks section
4. FOR ALL report templates, the principal remarks section visibility SHALL be controlled by the `showPrincipalRemarks` configuration field

### Requirement 5: Template Consistency Standardization

**User Story:** As a developer, I want all report templates to handle visibility configuration identically, so that the system behavior is predictable and maintainable.

#### Acceptance Criteria

1. WHEN processing visibility configuration, THE React_PDF_Template SHALL use the same field names as the jsPDF_Template
2. WHEN configuration is missing or undefined, THE Report_Template SHALL apply consistent default behavior across all templates
3. WHEN mapping API fields to template properties, THE Main_Component SHALL use consistent field mapping for all templates
4. THE EndOfTermReportTemplate SHALL use direct API field names instead of mapped field names for consistency
5. FOR ALL templates, the visibility logic SHALL follow the pattern: `config?.visibility?.fieldName !== false`

### Requirement 6: Configuration Validation and Error Handling

**User Story:** As a system user, I want the report system to handle missing or invalid configuration gracefully, so that reports still generate when configuration issues occur.

#### Acceptance Criteria

1. WHEN the Configuration_API is unavailable, THE Report_Template SHALL use safe default values for all visibility settings
2. WHEN the visibility configuration contains invalid data types, THE Report_Template SHALL treat invalid values as `true` (show section)
3. WHEN individual visibility fields are missing from the configuration, THE Report_Template SHALL default those specific fields to `true`
4. THE Report_Template SHALL log configuration errors without preventing report generation
5. IF configuration loading fails completely, THEN THE Report_Template SHALL generate reports with all sections visible

### Requirement 7: API Integration Testing

**User Story:** As a quality assurance tester, I want to verify that configuration changes are properly reflected in generated reports, so that I can ensure the visibility controls work as intended.

#### Acceptance Criteria

1. WHEN testing with the SCH/20 configuration endpoint, THE Report_Template SHALL respect all four visibility settings correctly
2. WHEN the API returns `"showAttendancePerformance": false`, THE generated report SHALL not contain attendance sections
3. WHEN the API returns `"showCharacterAssessment": true`, THE generated report SHALL contain character assessment sections if data exists
4. WHEN the API returns `"showTeacherRemarks": false`, THE generated report SHALL not contain teacher remarks sections
5. WHEN the API returns `"showPrincipalRemarks": false`, THE generated report SHALL not contain principal remarks sections