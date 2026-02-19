# Design Document

## Overview

This design document outlines the solution for fixing the online staff visibility issue in the Elite Scholar support chat system. The bug prevents regular users from seeing the "Online Staff" section automatically when agents are online, even though the data is correctly populated from the API.

The root cause is a React useEffect dependency array issue at lines 370-377 in `SupportChat.tsx`. The dependency array includes `showOnlineStaff`, which creates a logical contradiction: the effect can only run when `showOnlineStaff` changes, but it needs to run to SET `showOnlineStaff` to true. This prevents the auto-show logic from executing when the component mounts or when online staff data becomes available.

## Architecture

### Component Structure

```
SupportChat (Main Component)
├── OnlineStaffContext (Data Provider)
│   ├── fetchOnlineStaff() - API call to get online staff
│   ├── initializeOnlineStaff() - Start polling
│   └── onlineStaff[] - Array of online staff members
├── Auto-Show Logic (useEffect)
│   ├── Monitors onlineStaff array changes
│   ├── Monitors isOpen state
│   └── Sets showOnlineStaff visibility
└── Online Staff Section (UI)
    ├── Staff list rendering
    ├── Profile images
    └── Online indicators
```

### Data Flow

```
OnlineStaffContext
    ↓ (provides)
onlineStaff array
    ↓ (triggers)
useEffect hook
    ↓ (evaluates)
Auto-show logic
    ↓ (sets)
showOnlineStaff state
    ↓ (controls)
Online Staff Section visibility
```

## Components and Interfaces

### Modified Component: SupportChat.tsx

**Location:** `frontend/src/feature-module/application/support/SupportChat.tsx`

**Changes Required:**

1. **Fix useEffect Dependency Array (Lines 370-377)**
   - Remove `showOnlineStaff` from dependency array
   - Keep only `onlineStaff` and `isOpen`
   - Add logic to prevent toggling off when user manually hides section

2. **Remove Debug JSON Output (Line 758)**
   - Remove the entire JSON.stringify debug line
   - Clean up any related debug code

3. **Add User Preference Tracking**
   - Track when user manually hides the section
   - Respect user preference until chat is reopened

### Interface Definitions

```typescript
interface StaffMember {
  id: string;
  name: string;
  user_type: string;
  email: string;
  profile_image?: string;
  status: 'online' | 'away' | 'offline';
  last_activity?: string;
}

interface OnlineStaffContextType {
  onlineStaff: StaffMember[];
  fetchOnlineStaff: () => void;
  isLoading: boolean;
  isInitialized: boolean;
  initializeOnlineStaff: () => void;
}
```

## Data Models

### State Variables

```typescript
// Existing state
const [showOnlineStaff, setShowOnlineStaff] = useState<boolean>(false);
const [isOpen, setIsOpen] = useState<boolean>(false);

// New state to track user preference
const [userHidStaff, setUserHidStaff] = useState<boolean>(false);
```

### Context Data

```typescript
// From OnlineStaffContext
const { 
  onlineStaff,           // StaffMember[]
  fetchOnlineStaff,      // () => void
  initializeOnlineStaff, // () => void
  isInitialized          // boolean
} = useOnlineStaff();
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Auto-show triggers when staff become available

*For any* state where the chat is open and the onlineStaff array transitions from empty to populated, the Online_Staff_Section visibility should automatically be set to true (unless the user has manually hidden it in the current session).

**Validates: Requirements 1.1, 1.2**

### Property 2: Dependency array correctness

*For any* change to the onlineStaff array or isOpen state, the auto-show useEffect hook should execute and evaluate the visibility logic.

**Validates: Requirements 2.1, 2.3**

### Property 3: Manual toggle independence

*For any* user action that toggles the Online_Staff_Section visibility, the manual toggle should work independently of the auto-show logic and should set a preference flag that prevents auto-show until the chat is reopened.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 4: UI cleanliness

*For any* rendering of the Support_Chat component, no debug JSON output should be visible in the DOM.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Staff information completeness

*For any* staff member in the onlineStaff array, when rendered in the Online_Staff_Section, all required fields (name, email, user_type, online indicator) should be displayed.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 6: Session-based preference reset

*For any* chat session, when the chat is closed and then reopened, the user preference for hiding staff should be reset, allowing auto-show logic to work again.

**Validates: Requirements 4.4**

## Error Handling

### API Failure Scenarios

**Scenario:** Online staff API call fails
- **Handling:** Context provider logs error, sets isLoading to false
- **User Impact:** Online staff section remains hidden, no error shown to user
- **Recovery:** Next polling interval will retry (30 seconds)

**Scenario:** Network timeout
- **Handling:** Request times out, error callback triggered
- **User Impact:** No visible error, graceful degradation
- **Recovery:** Automatic retry on next interval

### State Management Errors

**Scenario:** useEffect infinite loop
- **Prevention:** Carefully managed dependency array without circular dependencies
- **Detection:** Console logging for debugging
- **Recovery:** Component remount clears state

**Scenario:** Context provider not available
- **Prevention:** useOnlineStaff hook throws error if used outside provider
- **Detection:** React error boundary
- **Recovery:** Application-level error handling

### Edge Cases

**Edge Case 1:** User rapidly toggles online staff visibility
- **Handling:** State updates are batched by React
- **Result:** Final state reflects last user action

**Edge Case 2:** Staff goes offline while section is visible
- **Handling:** Section remains visible with empty list
- **Result:** User can see that no staff are currently online

**Edge Case 3:** Multiple staff members with same ID
- **Handling:** React key prop uses staff.id, may cause rendering issues
- **Prevention:** Backend ensures unique IDs
- **Mitigation:** Add index as fallback key if needed

## Testing Strategy

### Unit Tests

**Test Suite:** SupportChat Auto-Show Logic

1. **Test: Auto-show when staff become available**
   - Setup: Mount component with empty onlineStaff
   - Action: Update onlineStaff to contain 1 staff member
   - Assert: showOnlineStaff becomes true

2. **Test: No auto-show when user manually hides**
   - Setup: Mount component with staff visible
   - Action: User clicks hide button, then new staff member appears
   - Assert: showOnlineStaff remains false

3. **Test: Preference resets on chat reopen**
   - Setup: User hides staff section
   - Action: Close chat, reopen chat with staff online
   - Assert: showOnlineStaff becomes true again

4. **Test: No debug JSON in rendered output**
   - Setup: Mount component
   - Action: Render component
   - Assert: No JSON.stringify output in DOM

5. **Test: Manual toggle works independently**
   - Setup: Mount component with staff online
   - Action: Click toggle button multiple times
   - Assert: showOnlineStaff toggles correctly each time

### Property-Based Tests

**Property Test 1: Auto-show consistency**
- **Feature:** support-chat-online-staff-visibility-fix, Property 1
- **Generator:** Random onlineStaff arrays (0-10 staff members)
- **Property:** When chat is open and staff array is non-empty and user hasn't hidden section, showOnlineStaff should be true
- **Iterations:** 100

**Property Test 2: Dependency array behavior**
- **Feature:** support-chat-online-staff-visibility-fix, Property 2
- **Generator:** Random sequences of onlineStaff and isOpen state changes
- **Property:** useEffect should execute exactly once per unique combination of (onlineStaff.length, isOpen)
- **Iterations:** 100

**Property Test 3: Manual toggle independence**
- **Feature:** support-chat-online-staff-visibility-fix, Property 3
- **Generator:** Random sequences of user toggle actions and auto-show triggers
- **Property:** After manual hide, auto-show should not override until chat reopens
- **Iterations:** 100

### Integration Tests

1. **Test: Full user flow - open chat with staff online**
   - Open chat widget
   - Verify online staff section appears automatically
   - Verify staff information is displayed correctly

2. **Test: Full user flow - manual toggle**
   - Open chat with staff online
   - Click hide button
   - Verify section hides
   - Click show button
   - Verify section shows

3. **Test: Full user flow - session reset**
   - Open chat, hide staff section
   - Close chat
   - Reopen chat with staff online
   - Verify section appears automatically again

### Manual Testing Checklist

- [ ] Open chat as regular user with agents online - section appears
- [ ] Open chat as agent with other agents online - section appears
- [ ] Click hide button - section hides
- [ ] Click show button - section shows
- [ ] Close and reopen chat - auto-show works again
- [ ] Verify no debug JSON visible in UI
- [ ] Verify all staff information displays correctly
- [ ] Test with 0, 1, and multiple staff members online
- [ ] Test rapid toggling of visibility
- [ ] Test with slow network (API delay)

## Implementation Notes

### Code Changes Summary

**File:** `frontend/src/feature-module/application/support/SupportChat.tsx`

**Change 1: Fix useEffect dependency array (Lines 370-377)**

```typescript
// BEFORE (BROKEN)
useEffect(() => {
  console.log('🔍 Auto-show check:', { onlineStaffLength: onlineStaff.length, isOpen, showOnlineStaff, onlineStaff });
  if (onlineStaff.length > 0 && isOpen) {
    console.log('✅ Setting showOnlineStaff to TRUE');
    setShowOnlineStaff(true);
  }
}, [onlineStaff, isOpen, showOnlineStaff]); // ❌ showOnlineStaff in deps prevents execution

// AFTER (FIXED)
useEffect(() => {
  console.log('🔍 Auto-show check:', { 
    onlineStaffLength: onlineStaff.length, 
    isOpen, 
    showOnlineStaff,
    userHidStaff 
  });
  
  // Only auto-show if user hasn't manually hidden the section
  if (onlineStaff.length > 0 && isOpen && !userHidStaff) {
    console.log('✅ Setting showOnlineStaff to TRUE');
    setShowOnlineStaff(true);
  } else if (onlineStaff.length === 0) {
    // Auto-hide if no staff online
    setShowOnlineStaff(false);
  }
}, [onlineStaff, isOpen, userHidStaff]); // ✅ Correct dependencies
```

**Change 2: Add user preference state**

```typescript
// Add new state variable near other state declarations (around line 75)
const [userHidStaff, setUserHidStaff] = useState<boolean>(false);
```

**Change 3: Update toggle button handler**

```typescript
// Update the toggle button onClick handler (multiple locations)
onClick={() => {
  const newState = !showOnlineStaff;
  setShowOnlineStaff(newState);
  // Track when user manually hides the section
  if (!newState) {
    setUserHidStaff(true);
  }
}}
```

**Change 4: Reset preference on chat reopen**

```typescript
// In the toggleChat function, add preference reset
const toggleChat = () => {
  const newOpenState = !isOpen;
  setIsOpen(newOpenState);
  if (newOpenState) {
    // Reset user preference when reopening chat
    setUserHidStaff(false);
    // ... existing code ...
  }
  // ... rest of existing code ...
};
```

**Change 5: Remove debug JSON output (Line 758)**

```typescript
// BEFORE (Line 758)
{JSON.stringify({onlineStaff, fetchOnlineStaff, initializeOnlineStaff, isInitialized })}

// AFTER
// Remove this entire line
```

### Backward Compatibility

- No breaking changes to OnlineStaffContext API
- No changes to component props or external interfaces
- Existing functionality preserved
- Only internal state management improved

### Performance Considerations

- No additional API calls introduced
- State updates are minimal and efficient
- useEffect runs only when necessary dependencies change
- No performance degradation expected

### Browser Compatibility

- Uses standard React hooks (useState, useEffect)
- No browser-specific APIs introduced
- Compatible with all browsers supported by React 18

## Deployment Considerations

### Pre-Deployment Checklist

- [ ] All unit tests pass
- [ ] All property tests pass (100 iterations each)
- [ ] Manual testing completed
- [ ] Code review approved
- [ ] No console errors in browser
- [ ] Performance profiling shows no regressions

### Rollback Plan

If issues are discovered after deployment:

1. **Immediate:** Revert the commit containing these changes
2. **Verification:** Confirm old behavior is restored
3. **Investigation:** Analyze logs and user reports
4. **Fix:** Address root cause in development environment
5. **Redeploy:** After thorough testing

### Monitoring

Post-deployment monitoring:

- Watch for console errors related to SupportChat
- Monitor API call patterns to `/api/support/online-staff`
- Track user engagement with online staff section
- Monitor support ticket creation rates (should not change)

## Future Enhancements

### Potential Improvements

1. **Persistent User Preference**
   - Store user preference in localStorage
   - Remember across sessions
   - Add settings panel for customization

2. **Animation**
   - Smooth slide-in animation when section appears
   - Fade transition for staff list updates
   - Visual feedback for toggle actions

3. **Smart Auto-Hide**
   - Auto-hide section after user views it for X seconds
   - Collapse to compact view instead of full hide
   - Show notification badge when new staff come online

4. **Enhanced Staff Information**
   - Show staff availability status (available, busy, away)
   - Display estimated response time
   - Show staff specializations or departments

5. **Accessibility Improvements**
   - Screen reader announcements when staff come online
   - Keyboard navigation for staff list
   - ARIA labels for all interactive elements

### Technical Debt

None introduced by this fix. The changes actually reduce technical debt by:
- Fixing a React anti-pattern (incorrect dependency array)
- Removing debug code from production
- Improving state management clarity
