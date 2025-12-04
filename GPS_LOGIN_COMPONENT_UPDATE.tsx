/**
 * GPS-ENHANCED LOGIN COMPONENT UPDATE
 *
 * This file shows the modifications needed to your existing login.tsx to support
 * GPS-based staff attendance.
 *
 * INSTRUCTIONS:
 * 1. Import the GPS utility at the top of your login.tsx file
 * 2. Add the GPS state and logic shown below
 * 3. Update the handleSubmit function as shown
 * 4. Add the GPS error handling in the onError callback
 */

// ========================================
// STEP 1: ADD IMPORTS AT THE TOP
// ========================================
import { getCurrentLocation, getGPSErrorMessage, getLocationEnableInstructions } from "../../../utils/gpsUtils";

// ========================================
// STEP 2: ADD STATE VARIABLES (after existing useState declarations)
// ========================================
const [gpsLoading, setGpsLoading] = useState(false);
const [gpsCoordinates, setGpsCoordinates] = useState<{lat: number, lon: number} | null>(null);

// ========================================
// STEP 3: ADD GPS FETCH FUNCTION (before handleSubmit)
// ========================================
/**
 * Fetch GPS coordinates for staff login
 * This is called during login to support GPS-based attendance
 */
const fetchGPSLocation = async (): Promise<{lat: number, lon: number} | null> => {
  try {
    setGpsLoading(true);
    const location = await getCurrentLocation();
    const coords = {
      lat: location.lat,
      lon: location.lon
    };
    setGpsCoordinates(coords);
    console.log('✅ GPS location obtained:', coords);
    return coords;
  } catch (gpsError: any) {
    console.warn('⚠️ GPS error:', gpsError);

    // Show user-friendly error message
    const errorMsg = getGPSErrorMessage(gpsError);

    if (gpsError.code === 'GPS_PERMISSION_DENIED') {
      toast.warning(
        <div>
          <div className="fw-bold mb-1">Location Access Required</div>
          <div className="small">{errorMsg}</div>
          <div className="small mt-2 text-muted">{getLocationEnableInstructions()}</div>
        </div>,
        { autoClose: 10000 }
      );
    } else {
      toast.info(errorMsg, { autoClose: 5000 });
    }

    return null;
  } finally {
    setGpsLoading(false);
  }
};

// ========================================
// STEP 4: UPDATE handleSubmit FUNCTION
// ========================================
/**
 * Enhanced login handler with GPS support
 */
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Prevent multiple submissions
  if (loading || gpsLoading) return;

  setLoading(true);

  // Reset session timeout immediately on login attempt
  localStorage.setItem('lastUserActivity', Date.now().toString());

  // ============================================
  // GPS LOCATION FETCH (NEW CODE)
  // ============================================
  // Try to get GPS location before login
  // This is non-blocking - backend will determine if GPS is required
  let gps_lat: number | undefined;
  let gps_lon: number | undefined;

  try {
    const coords = await fetchGPSLocation();
    if (coords) {
      gps_lat = coords.lat;
      gps_lon = coords.lon;
    }
  } catch (err) {
    console.warn('GPS fetch failed, continuing with login:', err);
    // Continue with login - backend will reject if GPS is required
  }

  // Define success and error callback functions for the login action creator
  const onSuccess = (data: any) => {
    setLoading(false);

    // Reset session timeout again on successful login
    localStorage.setItem('lastUserActivity', Date.now().toString());

    // ============================================
    // CHECK FOR ATTENDANCE DATA (NEW CODE)
    // ============================================
    if (data.attendance) {
      console.log('✅ Attendance marked:', data.attendance);

      // Show attendance confirmation toast
      const statusIcon = data.attendance.status === 'Present' ? '✅' : '⏰';
      const checkInTime = new Date(data.attendance.checkInTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      toast.success(
        <div>
          <div className="fw-bold">{statusIcon} Attendance Marked</div>
          <div className="small mt-1">
            Status: {data.attendance.status} at {checkInTime}
          </div>
          {data.attendance.distance && (
            <div className="small text-muted">
              Distance: {data.attendance.distance}m from school
            </div>
          )}
        </div>,
        { autoClose: 5000 }
      );
    }

    toast.success("Login successfully!");

    const user = data.user;
    switch (user.user_type?.toLowerCase()) {
      case "teacher":
        window.location.href = routes.teacherDashboard;
        break;
      case "staff":
        window.location.href = routes.staffDashboard || routes.teacherDashboard;
        break;
      case "admin":
        window.location.href = routes.adminDashboard;
        break;
      case "branchadmin":
        window.location.href = routes.adminDashboard;
        break;
      case "superadmin":
        window.location.href = routes.superAdminDashboard;
        break;
      case "parent":
        window.location.href = routes.parentDashboard;
        break;
    }
  };

  const onError = (err: any) => {
    console.error("Login error:", err);
    setLoading(false);

    // ============================================
    // GPS-SPECIFIC ERROR HANDLING (NEW CODE)
    // ============================================

    // Handle GPS required error
    if (err && err.error === 'GPS_REQUIRED') {
      toast.error(
        <div>
          <div className="fw-bold mb-1">📍 GPS Location Required</div>
          <div className="small">{err.message || 'GPS location is required for staff login.'}</div>
          <div className="small mt-2 text-muted">{getLocationEnableInstructions()}</div>
        </div>,
        { autoClose: 15000 }
      );
      return;
    }

    // Handle outside radius error
    if (err && err.error === 'OUTSIDE_RADIUS') {
      const data = err.data || {};
      toast.error(
        <div>
          <div className="fw-bold mb-1">⛔ Outside Permitted Area</div>
          <div className="small mb-2">{err.message}</div>
          {data.distance && data.allowedRadius && (
            <div className="small text-muted">
              <div>Your Distance: {data.distance}m</div>
              <div>Allowed: {data.allowedRadius}m</div>
              {data.branchName && <div>Branch: {data.branchName}</div>}
            </div>
          )}
        </div>,
        { autoClose: 15000 }
      );
      return;
    }

    // Handle GPS not configured error
    if (err && err.error === 'GPS_NOT_CONFIGURED') {
      toast.warning(
        <div>
          <div className="fw-bold mb-1">⚙️ GPS Not Configured</div>
          <div className="small">{err.message || 'GPS coordinates not configured for your branch.'}</div>
          <div className="small mt-2 text-muted">Please contact your administrator to set up GPS attendance.</div>
        </div>,
        { autoClose: 10000 }
      );
      return;
    }

    // ============================================
    // EXISTING ERROR HANDLING (keep as is)
    // ============================================

    // Handle account activation errors specially
    if (err && err.error === 'ACCOUNT_NOT_ACTIVATED') {
      toast.error(err.message || 'Your account is not activated. Please check your phone/email for the activation OTP.');
      return;
    }

    // Handle password change required
    if (err && err.error === 'PASSWORD_CHANGE_REQUIRED') {
      toast.warning(err.message || 'You must change your password before logging in.');
      return;
    }

    // Check if the error has a message property (standard API error format)
    if (err && err.message) {
      toast.error(err.message);
    } else if (err && err?.password) {
      toast.error(err?.password);
    } else if (err && err?.username) {
      toast.error(err?.username);
    } else if (err && err?.status) {
      toast.error(err?.status);
    } else if (err && err?.school) {
      toast.error(err?.school);
    } else if (err && typeof err === 'string') {
      toast.error(err);
    } else if (err && typeof err === 'object') {
      const values = Object.values(err).filter(v => typeof v === 'string' && v !== 'false' && v !== 'true');
      const errorMessage = values.length > 0 ? values.join(', ') : "An error occurred. Please check your connection and try again.";
      toast.error(errorMessage);
    } else {
      toast.warning("An error occurred. Please check your connection and try again.");
    }
  };

  // Dispatch the login action with form data and the success/error callbacks
  dispatch(
    login(
      {
        username: form.username,
        password: form.password,
        school_id: form.school_id,
        history: navigate,
        type: "users",
        gps_lat,  // NEW: Include GPS coordinates
        gps_lon,  // NEW: Include GPS coordinates
      },
      onSuccess,
      onError
    )
  );
};

// ========================================
// STEP 5: UPDATE SUBMIT BUTTON TO SHOW GPS LOADING
// ========================================
/**
 * Update the submit button to show GPS loading state
 * Replace the existing button code with this:
 */
<button
  type="submit"
  className="btn w-100 mb-3 fw-semibold"
  disabled={loading || gpsLoading}
  style={{
    height: '44px',
    backgroundColor: primaryColor,
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: `0 3px 8px ${primaryColor}30`
  }}
>
  {loading ? (
    <div className="d-flex align-items-center justify-content-center">
      <Spinner size="sm" className="me-2" />
      <span>Signing In...</span>
    </div>
  ) : gpsLoading ? (
    <div className="d-flex align-items-center justify-content-center">
      <Spinner size="sm" className="me-2" />
      <span>Getting Location...</span>
    </div>
  ) : (
    <div className="d-flex align-items-center justify-content-center">
      <i className="ti ti-login me-2"></i>
      <span>Sign In</span>
    </div>
  )}
</button>

// ========================================
// STEP 6: OPTIONAL - ADD GPS STATUS INDICATOR
// ========================================
/**
 * Add this below the password field (before Remember Me section)
 * to show GPS status to users
 */
{gpsCoordinates && (
  <div className="mb-3">
    <div
      className="p-2 rounded-2 d-flex align-items-center"
      style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac'
      }}
    >
      <i className="ti ti-map-pin text-success me-2"></i>
      <span className="small text-success fw-semibold">
        Location Detected
      </span>
    </div>
  </div>
)}

// ========================================
// SUMMARY OF CHANGES
// ========================================
/**
 * FILES TO UPDATE:
 *
 * 1. frontend/src/feature-module/auth/login/login.tsx
 *    - Add GPS imports
 *    - Add GPS state variables
 *    - Add fetchGPSLocation function
 *    - Update handleSubmit to get GPS coordinates
 *    - Update onError to handle GPS errors
 *    - Update submit button to show GPS loading
 *    - Optional: Add GPS status indicator
 *
 * 2. frontend/src/redux/actions/auth.ts
 *    ✅ Already updated (gps_lat, gps_lon parameters added)
 *
 * 3. frontend/src/utils/gpsUtils.ts
 *    ✅ Already created
 *
 * TESTING CHECKLIST:
 *
 * □ Test with GPS disabled school (normal login)
 * □ Test with GPS enabled, location allowed
 * □ Test with GPS enabled, location denied
 * □ Test with GPS enabled, outside radius
 * □ Test with GPS enabled, inside radius
 * □ Verify attendance record created in database
 * □ Verify attendance toast notification shows
 * □ Test on different browsers (Chrome, Firefox, Safari)
 * □ Test on mobile devices
 */
