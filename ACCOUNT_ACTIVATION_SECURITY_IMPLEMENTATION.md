# Account Activation Security - Implementation Plan

## Security Requirement

**Critical Security Enhancement**: All new staff and parent accounts must be activated with OTP before they can login, and must change their password to a secure one on first login.

## Problem Statement

Currently, when staff or parent accounts are created:
- They can login immediately with the default password
- No verification that the account belongs to the rightful person
- Security risk: Anyone with the default credentials can access the system
- No enforcement of secure password policies

## Solution Overview

Implement a 3-step security process for new accounts:

```
1. Account Created
   ↓
2. OTP Sent (via SMS/Email)
   ↓
3. User Activates Account with OTP
   ↓
4. Forced Password Change
   ↓
5. Login Allowed
```

---

## Database Schema Changes

### 1. Add Columns to `users` Table

```sql
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_activated TINYINT(1) DEFAULT 0 COMMENT 'Account activation status',
ADD COLUMN IF NOT EXISTS activation_otp VARCHAR(6) DEFAULT NULL COMMENT 'OTP for account activation',
ADD COLUMN IF NOT EXISTS activation_otp_expires_at DATETIME DEFAULT NULL COMMENT 'OTP expiry time',
ADD COLUMN IF NOT EXISTS activation_otp_attempts INT DEFAULT 0 COMMENT 'Number of failed OTP attempts',
ADD COLUMN IF NOT EXISTS must_change_password TINYINT(1) DEFAULT 0 COMMENT 'Force password change on next login',
ADD COLUMN IF NOT EXISTS first_login_completed TINYINT(1) DEFAULT 0 COMMENT 'Whether user completed first login setup',
ADD COLUMN IF NOT EXISTS password_changed_at DATETIME DEFAULT NULL COMMENT 'Last password change timestamp',
ADD COLUMN IF NOT EXISTS activated_at DATETIME DEFAULT NULL COMMENT 'Account activation timestamp',
ADD COLUMN IF NOT EXISTS activation_method ENUM('otp_sms', 'otp_email', 'manual_admin') DEFAULT NULL COMMENT 'How account was activated';
```

### 2. Create `account_activation_logs` Table

```sql
CREATE TABLE IF NOT EXISTS account_activation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_type ENUM('Staff', 'Parent', 'Teacher', 'Admin', 'Student') NOT NULL,
  action ENUM('otp_sent', 'otp_verified', 'otp_failed', 'password_changed', 'account_activated', 'manual_activation') NOT NULL,
  otp_code VARCHAR(6) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  status ENUM('success', 'failed', 'pending') NOT NULL,
  failure_reason VARCHAR(255) DEFAULT NULL,
  metadata JSON DEFAULT NULL COMMENT 'Additional context data',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  school_id VARCHAR(50) DEFAULT NULL,
  branch_id VARCHAR(50) DEFAULT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_user_type (user_type),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  INDEX idx_school_id (school_id),
  FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Log all account activation activities';
```

### 3. Create `secure_passwords_history` Table

```sql
CREATE TABLE IF NOT EXISTS secure_passwords_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_type ENUM('Staff', 'Parent', 'Teacher', 'Admin', 'Student') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) DEFAULT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Password history to prevent reuse';
```

---

## Backend Implementation

### 1. OTP Generation Service (`/src/services/otpService.js`)

```javascript
/**
 * Generate and send OTP for account activation
 */
class OTPService {
  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send OTP via SMS
  async sendOTPviaSMS(phone, otp, userName) {
    // Integration with SMS service
  }

  // Send OTP via Email
  async sendOTPviaEmail(email, otp, userName) {
    // Integration with Email service
  }

  // Verify OTP
  async verifyOTP(userId, userType, otp) {
    // Check OTP validity, expiry, attempts
  }

  // Invalidate OTP after successful verification
  async invalidateOTP(userId, userType) {
    // Clear OTP fields
  }
}
```

### 2. Account Activation Controller (`/src/controllers/accountActivation.js`)

```javascript
/**
 * Account Activation Endpoints
 */

// POST /api/auth/send-activation-otp
exports.sendActivationOTP = async (req, res) => {
  // 1. Validate user exists and not activated
  // 2. Generate OTP
  // 3. Save OTP to database with expiry (5 minutes)
  // 4. Send OTP via SMS/Email
  // 5. Log activity
};

// POST /api/auth/verify-activation-otp
exports.verifyActivationOTP = async (req, res) => {
  // 1. Validate OTP
  // 2. Check expiry
  // 3. Check attempts (max 3)
  // 4. Mark account as activated
  // 5. Generate temporary token for password change
  // 6. Log activity
};

// POST /api/auth/complete-activation
exports.completeActivation = async (req, res) => {
  // 1. Validate temporary token
  // 2. Validate new password strength
  // 3. Check password history (prevent reuse)
  // 4. Update password
  // 5. Mark must_change_password = 0
  // 6. Mark first_login_completed = 1
  // 7. Log activity
  // 8. Return login token
};

// POST /api/auth/resend-activation-otp
exports.resendActivationOTP = async (req, res) => {
  // 1. Check if too many requests (rate limiting)
  // 2. Generate new OTP
  // 3. Send OTP
  // 4. Log activity
};
```

### 3. Enhanced Login Flow (`/src/controllers/user.js`)

```javascript
/**
 * Modified login function
 */
exports.login = async (req, res) => {
  // ... existing authentication logic ...

  // NEW: Check if account is activated
  if (user.is_activated === 0) {
    return res.status(403).json({
      success: false,
      message: 'Account not activated',
      error: 'ACCOUNT_NOT_ACTIVATED',
      data: {
        userId: user.id,
        userType: user.user_type,
        email: user.email,
        phone: user.phone,
        requiresActivation: true
      }
    });
  }

  // NEW: Check if password change is required
  if (user.must_change_password === 1 || user.first_login_completed === 0) {
    // Generate temporary token for password change
    const tempToken = generateTemporaryToken(user.id, user.user_type);

    return res.status(403).json({
      success: false,
      message: 'Password change required',
      error: 'PASSWORD_CHANGE_REQUIRED',
      data: {
        tempToken,
        userId: user.id,
        userType: user.user_type,
        requiresPasswordChange: true
      }
    });
  }

  // ... existing successful login logic ...
};
```

### 4. Password Strength Validator

```javascript
/**
 * Password Strength Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (@, #, $, %, etc.)
 * - Not a common password (check against list)
 * - Not same as previous 3 passwords
 */
exports.validatePasswordStrength = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  const passed = Object.values(requirements).every(req => req === true);

  return {
    passed,
    requirements,
    message: passed ? 'Password is strong' : 'Password does not meet security requirements'
  };
};
```

### 5. Update User Creation (Staff/Parent)

```javascript
/**
 * When creating staff or parent accounts
 */
exports.createStaff = async (req, res) => {
  // ... existing staff creation logic ...

  // NEW: Set activation flags
  const newStaff = {
    ...staffData,
    is_activated: 0, // Not activated
    must_change_password: 1, // Force password change
    first_login_completed: 0 // First login not done
  };

  // ... insert into database ...

  // NEW: Send activation OTP
  const otp = OTPService.generateOTP();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Update user with OTP
  await updateUserOTP(newStaff.id, otp, otpExpiry);

  // Send OTP via SMS/Email
  await OTPService.sendOTPviaSMS(newStaff.phone, otp, newStaff.full_name);

  // Log activity
  await logActivationActivity({
    userId: newStaff.id,
    userType: 'Staff',
    action: 'otp_sent',
    status: 'success'
  });

  res.status(201).json({
    success: true,
    message: 'Staff account created successfully. Activation OTP sent.',
    data: {
      userId: newStaff.id,
      requiresActivation: true,
      otpSentTo: maskPhone(newStaff.phone)
    }
  });
};
```

---

## Frontend Implementation

### 1. Account Activation Page

**Location:** `/elscholar-ui/src/feature-module/auth/account-activation/AccountActivation.tsx`

```typescript
/**
 * Account Activation Flow
 */
interface AccountActivationProps {
  userId: number;
  userType: string;
  phone?: string;
  email?: string;
}

const AccountActivation: React.FC<AccountActivationProps> = () => {
  const [step, setStep] = useState<'verify_otp' | 'change_password'>('verify_otp');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [tempToken, setTempToken] = useState('');

  // Step 1: Verify OTP
  const handleVerifyOTP = async () => {
    const response = await api.post('/auth/verify-activation-otp', {
      userId,
      userType,
      otp
    });

    if (response.success) {
      setTempToken(response.data.tempToken);
      setStep('change_password');
    }
  };

  // Step 2: Change Password
  const handleChangePassword = async (newPassword: string) => {
    const response = await api.post('/auth/complete-activation', {
      tempToken,
      newPassword
    });

    if (response.success) {
      // Redirect to login
      navigate('/login');
    }
  };

  return (
    <div className="activation-container">
      {step === 'verify_otp' ? (
        <OTPVerification
          onVerify={handleVerifyOTP}
          onResend={handleResendOTP}
        />
      ) : (
        <PasswordChange
          onSubmit={handleChangePassword}
          showStrengthIndicator
        />
      )}
    </div>
  );
};
```

### 2. Enhanced Login Flow

```typescript
/**
 * Handle login response with activation checks
 */
const handleLogin = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);

    if (response.success) {
      // Normal login success
      dispatch(loginSuccess(response.data));
      navigate('/dashboard');
    }
  } catch (error) {
    if (error.error === 'ACCOUNT_NOT_ACTIVATED') {
      // Redirect to activation page
      navigate('/auth/activate', {
        state: {
          userId: error.data.userId,
          userType: error.data.userType,
          phone: error.data.phone,
          email: error.data.email
        }
      });
    } else if (error.error === 'PASSWORD_CHANGE_REQUIRED') {
      // Redirect to password change page
      navigate('/auth/change-password', {
        state: {
          tempToken: error.data.tempToken,
          userId: error.data.userId
        }
      });
    }
  }
};
```

### 3. Password Strength Indicator

```typescript
/**
 * Visual password strength indicator
 */
const PasswordStrengthIndicator: React.FC<{password: string}> = ({ password }) => {
  const strength = calculatePasswordStrength(password);

  return (
    <div className="password-strength">
      <div className="strength-bar">
        <div
          className={`bar ${strength.level}`}
          style={{ width: `${strength.percentage}%` }}
        />
      </div>
      <ul className="requirements">
        <li className={password.length >= 8 ? 'met' : ''}>
          Minimum 8 characters
        </li>
        <li className={/[A-Z]/.test(password) ? 'met' : ''}>
          At least 1 uppercase letter
        </li>
        <li className={/[a-z]/.test(password) ? 'met' : ''}>
          At least 1 lowercase letter
        </li>
        <li className={/[0-9]/.test(password) ? 'met' : ''}>
          At least 1 number
        </li>
        <li className={/[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'met' : ''}>
          At least 1 special character
        </li>
      </ul>
    </div>
  );
};
```

---

## User Experience Flow

### For Staff/Parent Accounts

#### Step 1: Account Created by Admin
```
Admin creates staff/parent account
↓
System generates default credentials
↓
System sends OTP via SMS/Email
↓
Staff/Parent receives:
- Username/Email
- Default password (to be changed)
- OTP code (valid for 5 minutes)
```

#### Step 2: First Login Attempt
```
Staff/Parent tries to login
↓
System checks: is_activated = 0
↓
Redirect to Activation Page
↓
Enter OTP (6 digits)
↓
OTP verified? → Continue : Show error
```

#### Step 3: Password Change
```
OTP verified successfully
↓
Redirect to Password Change Page
↓
Enter new secure password
↓
System validates:
  - Minimum 8 characters
  - Contains uppercase, lowercase, number, special char
  - Not in previous passwords
↓
Password updated → Account fully activated
↓
Redirect to Dashboard
```

### For Admin Users

Admin users can:
- **Manually activate** accounts (bypass OTP)
- **Resend OTP** to staff/parents
- **View activation status** in user management
- **Reset activation** if OTP expired

---

## Security Features

### 1. OTP Security
- **Expiry**: 5 minutes
- **Max Attempts**: 3 failed attempts → OTP invalidated
- **Rate Limiting**: Max 3 OTP requests per 15 minutes
- **One-time Use**: OTP invalidated after successful verification

### 2. Password Security
- **Strength Requirements**: Enforced on frontend and backend
- **History Check**: Prevent reuse of last 3 passwords
- **Secure Storage**: Bcrypt hashing with salt rounds = 10
- **Password Expiry**: Optional feature for future (force change every 90 days)

### 3. Audit Trail
- **All Activities Logged**:
  - OTP sent
  - OTP verified/failed
  - Password changed
  - Account activated
  - Manual activation by admin

### 4. Browser Reopen Security (Already Implemented)
- If browser closed > 30 minutes → Force logout
- Prevents unauthorized access after closing browser

---

## API Endpoints

### Account Activation

```
POST /api/auth/send-activation-otp
Body: { userId, userType }
Response: { success, message, data: { otpSentTo, expiresIn } }

POST /api/auth/verify-activation-otp
Body: { userId, userType, otp }
Response: { success, message, data: { tempToken } }

POST /api/auth/resend-activation-otp
Body: { userId, userType }
Response: { success, message, data: { otpSentTo, expiresIn } }

POST /api/auth/complete-activation
Body: { tempToken, newPassword }
Response: { success, message, data: { token, user } }

GET /api/auth/activation-status/:userId/:userType
Response: { success, data: { isActivated, mustChangePassword, firstLoginCompleted } }
```

### Admin Management

```
POST /api/admin/manually-activate-account
Body: { userId, userType, reason }
Response: { success, message }

POST /api/admin/reset-activation
Body: { userId, userType }
Response: { success, message }

GET /api/admin/activation-logs
Query: { userId?, userType?, startDate?, endDate?, page, limit }
Response: { success, data: { logs, total, page, limit } }
```

---

## Testing Checklist

### Backend Tests
- [ ] OTP generation works
- [ ] OTP sent via SMS successfully
- [ ] OTP expires after 5 minutes
- [ ] OTP fails after 3 wrong attempts
- [ ] Password strength validation works
- [ ] Password history prevents reuse
- [ ] Account activation flow completes
- [ ] Logging works for all activities

### Frontend Tests
- [ ] Login redirects to activation if not activated
- [ ] OTP input accepts 6 digits
- [ ] Resend OTP works
- [ ] Password strength indicator updates
- [ ] Password change validates requirements
- [ ] Activation completes and redirects to dashboard

### Integration Tests
- [ ] Complete flow: Account created → OTP sent → OTP verified → Password changed → Login successful
- [ ] Failed OTP attempts handled correctly
- [ ] Expired OTP handled correctly
- [ ] Weak password rejected
- [ ] Password reuse prevented

---

## Rollout Strategy

### Phase 1: Database Migration
1. Add new columns to `users` table
2. Create `account_activation_logs` table
3. Create `secure_passwords_history` table
4. **Existing users**: Set `is_activated = 1`, `first_login_completed = 1`

### Phase 2: Backend Implementation
1. Create OTP service
2. Create account activation controller
3. Update login flow
4. Add password strength validator
5. Update user creation functions

### Phase 3: Frontend Implementation
1. Create activation page
2. Create password change page
3. Update login flow
4. Add password strength indicator

### Phase 4: Testing
1. Test complete activation flow
2. Test edge cases
3. Security testing
4. User acceptance testing

### Phase 5: Deployment
1. Deploy backend changes
2. Run database migrations
3. Deploy frontend changes
4. Monitor activation logs
5. Provide user support

---

## Configuration

### Environment Variables

```env
# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
OTP_RESEND_COOLDOWN_MINUTES=1

# Password Configuration
PASSWORD_MIN_LENGTH=8
PASSWORD_HISTORY_COUNT=3
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true

# Security Configuration
ACTIVATION_TOKEN_EXPIRY_MINUTES=15
MAX_OTP_REQUESTS_PER_WINDOW=3
OTP_REQUEST_WINDOW_MINUTES=15
```

---

## Monitoring & Alerts

### Key Metrics to Monitor
- Failed OTP attempts
- Expired OTPs
- Password change failures
- Time to activate account
- Activation completion rate

### Alerts
- Alert if >10 failed OTP attempts in 1 hour (possible attack)
- Alert if activation completion rate <80%
- Alert if >5 password changes rejected in 1 hour

---

## Future Enhancements

1. **Biometric Authentication**: Fingerprint/Face ID for mobile app
2. **Two-Factor Authentication**: Optional 2FA for all users
3. **Password Expiry**: Force password change every 90 days
4. **Device Management**: Track and manage logged-in devices
5. **Suspicious Activity Detection**: Alert on unusual login patterns

---

## 🎉 Benefits

### Security
✅ Prevents unauthorized access to newly created accounts
✅ Ensures only rightful owners can activate accounts
✅ Enforces strong password policies
✅ Provides complete audit trail
✅ Prevents password reuse

### Compliance
✅ Meets data protection regulations (GDPR, NDPR)
✅ Demonstrates security best practices
✅ Provides audit logs for compliance

### User Trust
✅ Users feel more secure
✅ Professional account setup process
✅ Clear communication of security measures

---

**Implementation Status**: 📋 **Planning Complete** - Ready for implementation
**Estimated Time**: 3-5 days for complete implementation and testing
**Priority**: 🔴 **HIGH** - Critical security enhancement
