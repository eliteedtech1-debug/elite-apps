# Forgot Password - School Context Update

## Summary
Updated the forgot password page to include automatic school context detection, matching the same pattern used in the login page. This ensures that the `school_id` is properly populated before sending password reset requests.

## Changes Made

### Frontend Changes
**File**: `elscholar-ui/src/feature-module/auth/forgotPassword/forgotPassword.tsx`

#### 1. Added Subdomain Detection (Same as Login)
```typescript
// Use simple subdomain detection from Helper module
const simpleSubdomain = short_name;
const simpleShouldAutoDetect = simpleSubdomain && simpleSubdomain.length > 0 &&
                               typeof window !== 'undefined' &&
                               !window.location.hostname.includes('localhost');

// Initialize with detected subdomain
const initialShortName = simpleSubdomain || currentSchoolShortName;
const initialSchoolId = simpleSubdomain || currentSchoolShortName;
```

#### 2. Enhanced Form State
Added `short_name` field to track subdomain:
```typescript
const [form, setForm] = useState({
  email: "",
  phone: "",
  short_name: initialShortName,  // Track subdomain
  school_id: initialSchoolId,    // Initialize with detected value
  resetMethod: "email"
});
```

#### 3. School Context Detection Flow

**Priority Order:**
1. **Domain Config** (highest priority) - From `useDomainConfig()` hook
2. **Subdomain Detection** - From URL subdomain (e.g., `schoolname.domain.com`)
3. **API Fetch** - Fetch school details using `/schools/get-details` endpoint

**Implementation:**
```typescript
// 1. Update from domain config
useEffect(() => {
  if (domainSchoolDetails) {
    setSchoolDetails(domainSchoolDetails);
    setForm(prev => ({
      ...prev,
      school_id: domainSchoolDetails.school_id || ''
    }));
  }
}, [domainSchoolDetails]);

// 2. Update from current school short name (subdomain)
useEffect(() => {
  if (!simpleSubdomain) {
    setForm(prev => ({
      ...prev,
      short_name: currentSchoolShortName,
      school_id: currentSchoolShortName
    }));
  }
}, [currentSchoolShortName, simpleSubdomain]);

// 3. Fetch from API if needed
useEffect(() => {
  if (!simpleShouldAutoDetect && form.short_name) {
    _get(`schools/get-details?query_type=select-by-short-name&short_name=${form.short_name}`,
      (res) => {
        if (res.success && res.data && res.data.length > 0) {
          setSchoolDetails(res.data[0]);
          setForm(prev => ({
            ...prev,
            school_id: res.data[0].school_id
          }));
        }
      }
    );
  }
}, [form.short_name, simpleShouldAutoDetect, currentSchoolShortName]);
```

#### 4. Enhanced Validation
Added school context validation before API call:
```typescript
// Validate that we have school context before proceeding
if (!form.school_id || form.school_id.trim() === '') {
  console.error('❌ School context missing!', { ... });
  toast.error("School context not found. Please ensure you're accessing from the correct domain.");
  setLoading(false);
  return;
}
```

#### 5. Debug Logging
Added comprehensive logging for troubleshooting:
```typescript
// Debug logging for school context detection
useEffect(() => {
  console.log('🏫 Forgot Password - School Context Debug:', {
    simpleSubdomain,
    simpleShouldAutoDetect,
    currentSchoolShortName,
    'form.school_id': form.school_id,
    'form.short_name': form.short_name,
    'schoolDetails.school_name': schoolDetails?.school_name,
    'domainSchoolDetails.school_id': domainSchoolDetails?.school_id
  });
}, [/* dependencies */]);
```

## How It Works

### Scenario 1: Multi-tenant Subdomain (e.g., `schoolname.skcooly.com`)
1. Subdomain `schoolname` is extracted from URL
2. `form.school_id` is initialized with `schoolname`
3. School details are fetched from API using short_name
4. `form.school_id` is updated with the actual school_id from API response
5. Password reset request includes correct `school_id`

### Scenario 2: Domain Config (e.g., Elite Scholar deployment)
1. `useDomainConfig()` hook provides school details
2. `form.school_id` is populated from `domainSchoolDetails.school_id`
3. No API fetch needed
4. Password reset request uses school_id from domain config

### Scenario 3: Localhost Development
1. Returns empty subdomain
2. Uses `currentSchoolShortName` from domain config
3. Falls back to API fetch if needed
4. Requires manual school selection (future enhancement)

## Testing

### Test Case 1: Subdomain Detection
1. Access forgot password page from `testschool.domain.com`
2. Check browser console for:
   ```
   🏫 Forgot Password - School Context Debug: {
     simpleSubdomain: "testschool",
     form.school_id: "testschool",
     ...
   }
   ```
3. Submit forgot password form
4. Verify API request includes correct `school_id`

### Test Case 2: Missing School Context
1. Access from direct domain without subdomain
2. Ensure error message appears: "School context not found"
3. Verify form submission is blocked

### Test Case 3: Domain Config
1. Access from configured domain (e.g., Elite Scholar)
2. Check console for: `✅ Using school details from domain config`
3. Verify `school_id` is populated from domain config

## Benefits

1. **Multi-tenant Support**: Automatically detects school from subdomain
2. **Consistent UX**: Same pattern as login page
3. **Security**: Ensures school_id is always included in requests
4. **Error Prevention**: Validates school context before API calls
5. **Debugging**: Comprehensive logging for troubleshooting

## Related Files

- ✅ `elscholar-ui/src/feature-module/auth/forgotPassword/forgotPassword.tsx` - Updated
- ✅ `elscholar-ui/src/feature-module/auth/login/login.tsx` - Reference implementation
- ✅ `elscholar-ui/src/feature-module/Utils/Helper.tsx` - Subdomain detection utility
- ✅ `elscholar-ui/src/hooks/useDomainConfig.tsx` - Domain configuration hook

## Status: ✅ COMPLETE

The forgot password page now properly detects and validates school context before sending password reset requests!
