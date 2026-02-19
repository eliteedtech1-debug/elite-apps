# Requirements Document

## Introduction

This document specifies the requirements for fixing the online staff visibility issue in the Elite Scholar support chat system. The issue prevents regular users from seeing the "Online Staff" section when agents (superadmins) are online, even though the data is correctly populated from the API. This bugfix ensures that all users can see which support staff members are available to assist them.

## Glossary

- **Support_Chat**: The chat interface component that allows users to communicate with support staff
- **Online_Staff_Section**: The UI panel that displays currently available support agents
- **Agent**: A superadmin user who provides support through the chat system
- **Regular_User**: Any non-superadmin user (teachers, students, parents) who uses the support chat
- **Auto_Show_Logic**: The mechanism that automatically displays the Online Staff section when agents are available
- **OnlineStaff_Context**: The React context provider that manages online staff state across components

## Requirements

### Requirement 1: Automatic Online Staff Display

**User Story:** As a regular user, I want to automatically see which support staff members are online when I open the chat, so that I know help is available without having to manually toggle the visibility.

#### Acceptance Criteria

1. WHEN a regular user opens the support chat AND there are online staff members, THE Support_Chat SHALL automatically display the Online_Staff_Section
2. WHEN the onlineStaff array contains one or more agents, THE Support_Chat SHALL set the visibility state to show the Online_Staff_Section
3. WHEN the Support_Chat component mounts AND online staff data is loaded, THE Auto_Show_Logic SHALL execute without dependency conflicts
4. WHEN no staff members are online, THE Support_Chat SHALL keep the Online_Staff_Section hidden by default

### Requirement 2: Dependency Array Fix

**User Story:** As a developer, I want the useEffect hook to execute correctly when online staff data changes, so that the auto-show logic works reliably.

#### Acceptance Criteria

1. WHEN the onlineStaff array changes from empty to populated, THE Support_Chat SHALL trigger the Auto_Show_Logic
2. THE useEffect hook dependency array SHALL NOT include showOnlineStaff state
3. THE useEffect hook SHALL only depend on onlineStaff and userRole data
4. WHEN the component re-renders, THE Auto_Show_Logic SHALL not create infinite loops or unnecessary re-executions

### Requirement 3: Debug Output Removal

**User Story:** As a user, I want a clean chat interface without technical debug information, so that the UI remains professional and user-friendly.

#### Acceptance Criteria

1. THE Support_Chat SHALL NOT display raw JSON debug output in the user interface
2. WHEN the Online_Staff_Section is rendered, THE Support_Chat SHALL only show formatted staff information
3. THE Support_Chat SHALL remove all debug JSON elements from lines 758-770

### Requirement 4: Manual Toggle Functionality

**User Story:** As a user, I want to manually show or hide the online staff section using the button in the header, so that I can control my chat interface layout.

#### Acceptance Criteria

1. WHEN a user clicks the online staff toggle button, THE Support_Chat SHALL toggle the visibility of the Online_Staff_Section
2. WHEN the Online_Staff_Section is manually hidden, THE Support_Chat SHALL respect the user's preference until they toggle it again
3. THE manual toggle SHALL work independently of the Auto_Show_Logic
4. WHEN a user manually shows the section, THE Support_Chat SHALL maintain that state across component re-renders

### Requirement 5: Staff Information Display

**User Story:** As a user, I want to see complete information about online staff members, so that I can identify who is available to help me.

#### Acceptance Criteria

1. WHEN displaying online staff, THE Support_Chat SHALL show each agent's name
2. WHEN displaying online staff, THE Support_Chat SHALL show each agent's email address
3. WHEN displaying online staff, THE Support_Chat SHALL show each agent's user type
4. WHEN displaying online staff, THE Support_Chat SHALL show an online status indicator for each agent
5. WHERE an agent has a profile image, THE Support_Chat SHALL display the profile image

### Requirement 6: Role-Based Behavior

**User Story:** As a system administrator, I want the online staff visibility to work correctly for all user roles, so that both agents and regular users have appropriate access to the feature.

#### Acceptance Criteria

1. WHEN an agent opens the support chat, THE Support_Chat SHALL display the Online_Staff_Section with the same auto-show behavior as regular users
2. WHEN a regular user opens the support chat, THE Support_Chat SHALL display the Online_Staff_Section with auto-show behavior
3. THE Support_Chat SHALL use the same visibility logic for all authenticated user roles
4. THE Support_Chat SHALL retrieve online staff data from the OnlineStaff_Context regardless of user role
