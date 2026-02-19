# Implementation Plan: Support Chat Online Staff Visibility Fix

## Overview

This implementation plan addresses the online staff visibility bug in the Elite Scholar support chat system. The fix involves correcting a React useEffect dependency array issue, removing debug output, and adding user preference tracking to ensure the "Online Staff" section displays automatically when agents are available.

## Tasks

- [x] 1. Add user preference state variable
  - Add `userHidStaff` state variable to track when user manually hides the online staff section
  - Initialize to `false` (user has not hidden the section)
  - Place near other state declarations around line 75 in SupportChat.tsx
  - _Requirements: 4.2, 4.3_

- [x] 2. Fix useEffect dependency array for auto-show logic
  - [x] 2.1 Remove `showOnlineStaff` from dependency array at lines 370-377
    - Remove `showOnlineStaff` from the dependency array
    - Add `userHidStaff` to the dependency array
    - Update logic to check `!userHidStaff` before auto-showing
    - Add logic to auto-hide when `onlineStaff.length === 0`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 2.2 Write property test for dependency array behavior
    - **Property 2: Dependency array correctness**
    - **Validates: Requirements 2.1, 2.3**
    - Generate random sequences of onlineStaff and isOpen state changes
    - Verify useEffect executes when dependencies change
    - Verify no infinite loops occur

- [x] 3. Update toggle button handlers
  - [x] 3.1 Update all toggle button onClick handlers
    - Find all instances where `setShowOnlineStaff` is called from toggle buttons
    - Add logic to set `setUserHidStaff(true)` when user hides the section
    - Maintain existing toggle functionality
    - Update handlers in header, ticket list, and chat messages sections
    - _Requirements: 4.1, 4.2_

  - [ ]* 3.2 Write unit tests for manual toggle functionality
    - Test toggle button shows/hides section correctly
    - Test that hiding sets userHidStaff preference
    - Test rapid toggling behavior
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Reset user preference on chat reopen
  - [x] 4.1 Update toggleChat function
    - Add `setUserHidStaff(false)` when chat is opened
    - Place reset logic at the start of the `if (newOpenState)` block
    - Ensure preference resets before auto-show logic runs
    - _Requirements: 4.4, 6.1, 6.2_

  - [ ]* 4.2 Write property test for session-based preference reset
    - **Property 6: Session-based preference reset**
    - **Validates: Requirements 4.4**
    - Generate random sequences of hide actions and chat close/open cycles
    - Verify preference resets on each chat reopen
    - Verify auto-show works after reset

- [x] 5. Remove debug JSON output
  - Remove the JSON.stringify debug line at line 758
  - Verify no other debug output exists in the component
  - Clean up any related debug console.log statements if they're excessive
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Checkpoint - Test auto-show functionality
  - Manually test that online staff section appears when chat opens with staff online
  - Manually test that section doesn't appear when no staff are online
  - Manually test that manual hide prevents auto-show
  - Manually test that closing and reopening chat resets preference
  - Ensure all tests pass, ask the user if questions arise

- [ ] 7. Write property test for auto-show consistency
  - **Property 1: Auto-show triggers when staff become available**
  - **Validates: Requirements 1.1, 1.2**
  - Generate random onlineStaff arrays (0-10 staff members)
  - Verify showOnlineStaff is true when staff array is non-empty, chat is open, and user hasn't hidden section
  - Verify showOnlineStaff is false when conditions aren't met

- [ ]* 8. Write unit tests for edge cases
  - Test behavior when staff array transitions from empty to populated
  - Test behavior when staff array transitions from populated to empty
  - Test behavior with multiple staff members
  - Test behavior when user rapidly opens/closes chat
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 9. Write integration tests for full user flows
  - Test full flow: open chat with staff online → section appears
  - Test full flow: manual hide → close chat → reopen → section appears
  - Test full flow: toggle visibility multiple times
  - Test staff information display completeness
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Final checkpoint - Verify all functionality
  - Run all unit tests and property tests
  - Perform manual testing with different user roles (regular user, agent)
  - Verify no console errors
  - Verify UI is clean (no debug output)
  - Test with 0, 1, and multiple staff members online
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster deployment
- Each task references specific requirements for traceability
- The fix is minimal and focused on the root cause (dependency array issue)
- No changes to OnlineStaffContext or API endpoints required
- All changes are contained within SupportChat.tsx component
- Property tests should run minimum 100 iterations each
- Manual testing is critical for this UI-focused bugfix
