# Elite Core - Jitsi Integration Analysis Report

## Executive Summary

The Elite Core system uses Jitsi Meet for virtual classroom functionality. The implementation includes comprehensive moderator/participant role handling, though the current approach relies heavily on configuration overrides to bypass lobby behavior. The system has attempted to implement multiple layers of moderator privilege assignment through both JWT tokens and Jitsi configuration parameters.

---

## 1. Files Structure & Organization

### Virtual Classroom Files Location
**Path:** `/Users/apple/Downloads/apps/elite/elscholar-ui/src/feature-module/virtualClassroom/`

| File | Purpose | Key Function |
|------|---------|--------------|
| **VirtualClassroomPage.tsx** | Main user interface | Jitsi Meet integration, room joining, pre-join modal |
| **TeacherVirtualClassroom.tsx** | Teacher dashboard | Classroom creation, scheduling, management |
| **VirtualClassroomWidget.tsx** | Student widget | Upcoming classes, notifications, quick join |

### Backend Controller & Routes
| Location | Purpose |
|----------|---------|
| `/elscholar-api/src/controllers/virtualClassroom.js` | Core API logic for classrooms |
| `/elscholar-api/src/routes/virtualClassroom.js` | Route definitions |
| `/elscholar-ui/src/feature-module/videocall/Jitsimeet.jsx` | Legacy Jitsi component |

### Jitsi Configuration
| File | Purpose |
|------|---------|
| `/jitsi/.env` | Jitsi server environment variables |
| `/jitsi/docker-compose.yml` | Container orchestration |
| `/jitsi/config/web/interface_config.json` | UI configuration |

---

## 2. Current Jitsi Configuration Approach

### 2.1 Jitsi Server Setup

**Server Details:**
- **Domain:** `server.brainstorm.ng`
- **HTTP Port:** 8080
- **HTTPS Port:** 8443
- **Protocol Endpoints:**
  - BOSH (Bidirectional-streams Over Synchronous HTTP): `http://server.brainstorm.ng:8080/http-bind`
  - WebSocket: `ws://server.brainstorm.ng:8080/xmpp-websocket`

**Server Configuration (.env):**
```env
# Lobby disabled at server level
ENABLE_LOBBY=0
ENABLE_AUTH=0
ENABLE_GUESTS=1

# Core XMPP domain configuration
XMPP_DOMAIN=meet.jitsi
XMPP_AUTH_DOMAIN=auth.meet.jitsi
XMPP_MUC_DOMAIN=muc.meet.jitsi

# Focus & Jicofo (Jitsi Focus server)
XMPP_FOCUS_DOMAIN=focus.meet.jitsi
```

### 2.2 Role Assignment Strategy

The system uses **multiple overlapping approaches** to assign moderator roles:

#### Approach 1: Backend Participant Type Detection (Lines 650-654 in virtualClassroom.js)

```javascript
// Determine participant type based on authenticated user
participant_type = (req.user.user_type && req.user.user_type.toLowerCase() === 'teacher') ? 'teacher' : 'student';

// Check if participant is the classroom creator (moderator)
const isClassroomTeacher = participant_type === 'teacher' && 
                           (classroomData.teacher_id === teacherIdForComparison);
```

**Key Points:**
- User type checked from `req.user.user_type` (from JWT auth middleware)
- For teachers: Uses `req.user.user_id` (the actual user ID) for comparison
- For students: Uses `req.user.id` (admission number)
- Boolean flag `isClassroomTeacher` tracks if user created the room

#### Approach 2: Jitsi Configuration Conditional Settings (Lines 848, 1010 in virtualClassroom.js)

```javascript
// CONDITIONAL: Only classroom creators get moderator privileges
startAsModerator: isClassroomTeacher, // Line 848 - First occurrence
startAsModerator: true,               // Line 1010 - UNCONDITIONAL (potential bug!)
```

**Critical Issue Found:**
- **Line 848:** Correctly sets `startAsModerator: isClassroomTeacher` (conditional)
- **Line 1010:** Sets `startAsModerator: true` UNCONDITIONALLY (overwrites previous!)

This means **ALL users** get started as moderator regardless of role.

#### Approach 3: JWT Token Generation (Lines 385-452)

```javascript
const generateJitsiToken = (roomName, displayName, userId, userEmail, schoolId, isOwner = false) => {
  const payload = {
    iss: "elite-scholar",
    sub: "server.brainstorm.ng:8080",
    aud: "jitsi",
    room: roomName,
    context: {
      user: {
        id: userId,
        name: displayName,
        email: userEmail,
        moderator: isOwner ? "true" : "false"  // String value
      }
    },
    "moderator": isOwner ? true : false,  // Boolean value
    // ... other claims
  };
  
  // Uses HS256 with JITSI_JWT_SECRET
  const token = jwt.sign(payload, secret, { 
    algorithm: 'HS256',
    expiresIn: '24h'
  });
};
```

**Token Status:**
- Generated but NOT SENT to frontend (set to `jwt: null` at line 824)
- Server uses public/no-auth Jitsi, so JWT not needed/recognized

### 2.3 Configuration Parameter Flooding

The response includes **EXCESSIVE configuration overrides** (lines 825-1031):

```javascript
configOverwrite: {
  // Disabled waiting/lobby behaviors
  disableWaitingForModerator: true,
  disableWaitingForOwner: true,
  enableLobby: false,
  enableLobbyChat: false,
  
  // Moderator settings (duplicated multiple times!)
  startAsModerator: isClassroomTeacher,      // Line 848
  startAsModerator: true,                     // Line 926
  startAsModerator: true,                     // Line 1010
  
  // Aggressive bypass settings
  openRoom: true,
  publicRoom: true,
  enableGuestAccess: true,
  enablePublicRoomListing: true,
  bypassDomainVerification: true,
  allowAnyDomainAccess: true,
  
  // And 100+ more parameters...
}
```

**Analysis:**
- Some parameters appear 2-3 times in the same object
- Many parameters are likely unsupported by public Jitsi servers
- Configuration designed to force access regardless of Jitsi server settings

---

## 3. User Role Assignment Flow

### 3.1 Classroom Creation Flow

```
Teacher creates classroom
    ↓
API: POST /api/virtual-classroom/create
    ↓
Backend stores:
  - teacher_id = req.user.user_id (or req.user.id)
  - status = 'scheduled'
    ↓
Notifications sent to students in class
    ↓
Teacher receives confirmation
```

### 3.2 Join/Authorization Flow

```
User clicks "Join Classroom" → VirtualClassroomPage loads
    ↓
Calls: GET /api/virtual-classroom/room/{roomId}
    ├─ Validates user is authenticated
    ├─ Checks classroom exists
    └─ Returns classroom data
    ↓
Pre-join modal shown (device check)
    ↓
User clicks "Start Meeting"
    ├─ Calls: POST /api/virtual-classroom/join/{roomId}
    │   ├─ Validates participant_type (teacher vs student)
    │   ├─ Compares participant_id with classroom.teacher_id
    │   ├─ Determines: isClassroomTeacher = boolean
    │   └─ Stores in virtual_classroom_participants table
    │
    └─ API Response includes jitsi_config:
        {
          roomName: room_id,
          displayName: participant_name,
          userInfo: { displayName, email, avatarURL },
          jwt: null,  // NOT SENT
          configOverwrite: {
            startAsModerator: isClassroomTeacher,  // SHOULD BE conditional
            // ... 100+ more params
          }
        }
    ↓
Frontend creates Jitsi instance via external_api.js
    ↓
User joins Jitsi room with assigned role
```

### 3.3 Authentication Mechanism

**JWT Token Processing:**
```javascript
// In VirtualClassroomPage.tsx, line 357
...(classroomData.jitsi_config.jwt && { jwt: classroomData.jitsi_config.jwt })

// In virtualClassroom.js, line 824
jwt: null, // Disable JWT for remote Jitsi server
```

**Issue:** JWT token is intentionally disabled. Backend CAN generate tokens but chooses not to send them.

---

## 4. Root Cause of "Wait for Moderator" Issue

### 4.1 Original Problem (Based on VIRTUAL_CLASSROOM_ACCESS_FIX.md)

```
Teacher creates classroom → Joins → Sees "The conference has not yet started 
because no moderators have yet arrived"
```

### 4.2 Why This Happened

1. **No Moderator Designation:** Initial implementation didn't set `startAsModerator: true`
2. **Lobby Enabled:** Jitsi's default lobby behavior was active
3. **No Role Verification:** User's role wasn't properly communicated to Jitsi

### 4.3 Current "Solution" (Problematic)

**File:** `/Users/apple/Downloads/apps/elite/VIRTUAL_CLASSROOM_ACCESS_FIX.md`

The fix uses aggressive parameter flooding:

```javascript
// Disable all lobby/waiting behaviors
disableWaitingForModerator: true,
disableWaitingForOwner: true,
enableLobby: false,
enableLobbyChat: false,

// Force moderator status for ALL users
startAsModerator: true,  // BUG: Should be conditional!
```

**Problem:** This sets ALL users (teachers AND students) as moderators, which:
- Violates educational access control principles
- Gives students unintended moderator privileges
- Doesn't properly distinguish roles

---

## 5. Current Implementation Issues

### Issue 1: Duplicate/Conflicting Configuration (CRITICAL)

**Lines 848 and 1010 in virtualClassroom.js:**

```javascript
// Line 848 - CORRECT (conditional)
startAsModerator: isClassroomTeacher,

// Lines 926 & 1010 - WRONG (unconditional)
startAsModerator: true,
startAsModerator: true,
```

**Impact:** JavaScript object overwrite means the LAST value wins → Line 1010 wins → ALL users are moderators

### Issue 2: Excessive Configuration Parameters

The response includes 100+ configuration parameters, many with contradictory purposes:

```javascript
// Contradictory settings present simultaneously:
startAsModerator: true,           // Line 1010
disableModeratorPassword: true,   // Suggests moderators exist

openRoom: true,                   // Allow anyone
requireTokenVerification: false,   // Don't verify tokens
allowAnyDomainAccess: true,       // Allow any domain

enableRoomAuthentication: false,   // No auth
disableRoomAuthentication: true,   // Definitely no auth (redundant)
```

### Issue 3: JWT Token Not Utilized

**Lines 824:**
```javascript
jwt: null, // Disable JWT for remote Jitsi server
```

**Why:** Public Jitsi servers (like `server.brainstorm.ng`) don't verify JWT tokens. They operate in "open" mode without authentication.

**Consequence:** Cannot use JWT-based role assignment. Must rely on client-side configuration.

### Issue 4: User Type Detection Issues

**Lines 243-244 in VirtualClassroomPage.tsx:**

```javascript
const isTeacher = user?.user_type && (user.user_type.toLowerCase() === 'teacher' || user.user_type.toLowerCase() === 'admin');
const participantName = user.name || user.full_name || user.username || user.first_name || user.last_name || `${user.id}`;
```

**Problems:**
- Multiple fallback chains for participant identification
- Inconsistent field names across user objects
- No validation that fields actually exist

### Issue 5: ID Mismatch Issues (Partially Fixed)

**Teachers have dual ID system:**
- `req.user.id` - Teacher record ID in `teachers` table
- `req.user.user_id` - Actual user ID in `users` table

**Current Comparison (Lines 650-654):**

```javascript
const teacherIdForComparison = (req.user.user_type === 'Teacher') ? (req.user.user_id || req.user.id) : req.user.id;

const isClassroomTeacher = participant_type === 'teacher' && 
                           (classroomData.teacher_id === teacherIdForComparison ||
                            classroomData.teacher_id == teacherIdForComparison ||
                            classroomData.teacher_id === String(teacherIdForComparison) ||
                            String(classroomData.teacher_id) === String(teacherIdForComparison));
```

**Status:** Partially fixed with multiple comparison types, but still fragile.

---

## 6. Frontend Jitsi Integration

### 6.1 VirtualClassroomPage.tsx Flow

**Script Loading (Lines 117-198):**
```typescript
// Tries HTTP first, HTTPS as fallback
const loadJitsiScript = async () => {
  try {
    const script = document.createElement('script');
    script.src = 'http://server.brainstorm.ng:8080/external_api.js';
    // Fallback to HTTPS on failure
  }
};
```

**Configuration Usage (Lines 346-402):**
```typescript
useEffect(() => {
  if (meetingStarted && jitsiLoaded && classroomData?.jitsi_config && jitsiContainerRef.current) {
    const domain = 'server.brainstorm.ng';
    const options = {
      roomName: classroomData.jitsi_config.roomName,
      parentNode: jitsiContainerRef.current,
      userInfo: classroomData.jitsi_config.userInfo,
      ...(classroomData.jitsi_config.jwt && { jwt: classroomData.jitsi_config.jwt }),
      configOverwrite: classroomData.jitsi_config.configOverwrite,
      interfaceConfigOverwrite: classroomData.jitsi_config.interfaceConfigOverwrite
    };
    
    jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
  }
}, [meetingStarted, jitsiLoaded, classroomData, navigate]);
```

### 6.2 Interface Configuration Overrides

**Lines 1033-1113 in virtualClassroom.js:**

Notable interface settings:
```javascript
interfaceConfigOverwrite: {
  // Hide moderator-related UI
  TOOLBAR_BUTTONS: [ /* 20+ buttons */ ],
  DISABLE_WAITING_FOR_MODERATOR: true,
  DISABLE_WAITING_FOR_OWNER: true,
  DISABLE_LOBBY: true,
  HIDE_LOBBY: true,
  
  // Moderator indicators
  DISABLE_MODERATOR_INDICATOR: false,
  ENABLE_MODERATOR_INDICATOR: true,
  
  // Display settings
  DEFAULT_LOCAL_DISPLAY_NAME: participant_name,
  DISABLE_PRESENCE_STATUS: true,
  DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
}
```

---

## 7. Access Control Implementation

### 7.1 Time-Based Access (Lines 601-710)

**Students can join if:**
```javascript
// Either:
1. Within 15 minutes of scheduled time (timeDiff <= 15)
2. OR classroom is already active (classroomData.status === 'active')

const canStudentJoin = participant_type === 'student' && 
                       (timeDiff <= 15 || classroomData.status === 'active');
```

**Teachers can join:**
```javascript
// Immediately (no time restriction)
const isClassroomTeacher = participant_type === 'teacher' && 
                           (classroomData.teacher_id === teacherIdForComparison);
```

### 7.2 Database Participant Tracking

**Query (Lines 749-781):**
```javascript
const participantQuery = `
  INSERT INTO virtual_classroom_participants (
    room_id, participant_id, participant_name, participant_type,
    user_avatar, joined_at, school_id, branch_id
  ) VALUES (...)
  ON DUPLICATE KEY UPDATE
    joined_at = NOW(),
    left_at = NULL,
    user_avatar = VALUES(user_avatar)
`;
```

**Tracked Information:**
- `participant_id` - Student admission_no or teacher user_id
- `participant_type` - 'teacher' or 'student'
- `joined_at` - Timestamp of join
- `left_at` - Timestamp of leaving (NULL if active)

---

## 8. Key Configuration Parameters

### 8.1 Critical Parameters for Moderator Role

| Parameter | Current Value | Purpose | Issue |
|-----------|----------------|---------|-------|
| `startAsModerator` | `true` (Line 1010) | Start as moderator | OVERRIDES conditional value (Line 848) |
| `disableWaitingForModerator` | `true` | Skip waiting screen | Forces bypass |
| `enableLobby` | `false` | Disable lobby | Server-level too |
| `startWithAudioMuted` | `false` | Audio enabled | Different for students (should be true) |
| `startWithVideoMuted` | `false` | Video enabled | Different for students (should be true) |

### 8.2 Access Control Parameters

| Parameter | Current Value | Purpose |
|-----------|----------------|---------|
| `openRoom` | `true` | Open access |
| `publicRoom` | `true` | Public room |
| `enableGuestAccess` | `true` | Allow guests |
| `enableRoomAuthentication` | `false` | No authentication |
| `disableRoomAuthentication` | `true` | Explicitly no auth |

---

## 9. Authentication Mechanism Summary

### Current Approach:

1. **User Authentication:** Passport JWT middleware
   - User logs in → JWT token issued
   - Token includes `user_type`, `school_id`, `user_id` or `admission_no`

2. **Room Authorization:** Backend validation
   - User must be authenticated
   - Students: Must be within 15 min of scheduled time OR class must be active
   - Teachers: No time restriction if they're the creator

3. **Jitsi Room Access:** Configuration-based
   - NO JWT token sent to Jitsi (set to `null`)
   - NO token verification on public Jitsi server
   - Relies on client-side configuration parameters

4. **Role Assignment:** Client-side only
   - Backend determines `isClassroomTeacher`
   - Sends `startAsModerator: true` for ALL users (BUG)
   - Jitsi has no way to verify actual role

---

## 10. Recommended Fixes

### Fix 1: Correct Moderator Configuration (CRITICAL)

**File:** `elscholar-api/src/controllers/virtualClassroom.js`

**Current (Lines 825-1032):**
```javascript
configOverwrite: {
  // ... incorrect duplication ...
  startAsModerator: isClassroomTeacher,  // Line 848 - correct
  // ... many lines ...
  startAsModerator: true,                 // Line 926 - wrong
  // ... many lines ...
  startAsModerator: true,                 // Line 1010 - wrong (wins!)
}
```

**Should be:**
```javascript
configOverwrite: {
  // ... other settings ...
  
  // ONLY correct moderator setting
  startAsModerator: isClassroomTeacher,
  startWithAudioMuted: participant_type === 'student',
  startWithVideoMuted: participant_type === 'student',
  
  // Remove all duplicates and contradictions
  // Keep only essential overrides
}
```

### Fix 2: Consolidate Configuration

Reduce the 100+ parameters to only those actually needed:

```javascript
configOverwrite: {
  // Essential moderator settings
  startAsModerator: isClassroomTeacher,
  disableWaitingForModerator: true,
  enableLobby: false,
  
  // User-specific settings
  startWithAudioMuted: participant_type === 'student',
  startWithVideoMuted: participant_type === 'student',
  
  // Connection settings
  bosh: `http://server.brainstorm.ng:8080/http-bind`,
  websocket: `ws://server.brainstorm.ng:8080/xmpp-websocket`,
  
  // Remove unsupported parameters
  // (server.brainstorm.ng is public, doesn't support many settings)
}
```

### Fix 3: Proper JWT Implementation (If Using Private Jitsi)

If switching to a private Jitsi server with JWT support:

```javascript
// Generate proper JWT token
const token = generateJitsiToken(
  roomName,
  participant_name,
  participant_id,
  user_email,
  req.user.school_id,
  isClassroomTeacher  // Properly set moderator claim
);

// Send to frontend
jitsi_config: {
  jwt: token,  // Not null!
  roomName,
  // ... other config
}
```

### Fix 4: Improve User Type Detection

**File:** `elscholar-ui/src/feature-module/virtualClassroom/VirtualClassroomPage.tsx`

```typescript
// Current (fragile)
const isTeacher = user?.user_type && 
  (user.user_type.toLowerCase() === 'teacher' || 
   user.user_type.toLowerCase() === 'admin');

// Better
const normalizeUserType = (type: string | undefined): string => {
  return (type || '').toLowerCase().trim();
};

const isTeacher = ['teacher', 'admin'].includes(normalizeUserType(user?.user_type));
const isStudent = normalizeUserType(user?.user_type) === 'student';
```

---

## 11. Conclusions

### Current State:
1. **Jitsi Integration:** Functional but over-configured
2. **Moderator Role:** Broken - ALL users get moderator privileges
3. **Access Control:** Time-based for students, unrestricted for teachers
4. **Authentication:** Relies on backend validation, not Jitsi-level
5. **Configuration:** Bloated with 100+ parameters, many unsupported

### Key Finding:
The "wait for moderator" issue was "fixed" by setting everyone as moderators, not by proper role management.

### Recommendations:
1. Fix duplicate `startAsModerator` configuration
2. Consolidate configuration to only necessary parameters
3. Properly use `isClassroomTeacher` boolean throughout
4. Consider switching to private Jitsi with JWT if security needed
5. Add logging for role assignment verification

