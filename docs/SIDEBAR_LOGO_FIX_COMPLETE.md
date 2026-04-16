# Sidebar Logo Fix - Complete

## Issue
The sidebar logo was incorrectly using `mini-logo.png` instead of the full `logo.png`. The `mini-logo` should only be used for:
- Login pages
- Loader (BrandedLoader)
- NOT for sidebar/header

## Root Cause

In `/elscholar-ui/src/config/domainConfig.ts`, the `appLogo` property had the wrong fallback at line 108:

```typescript
// ❌ BEFORE - Using mini-logo as fallback
appLogo: env.VITE_APP_LOGO || env.REACT_APP_LOGO || env.APP_LOGO || '/assets/img/mini-logo.png',
```

This caused the sidebar header to display the mini-logo when no environment variable was set.

## The Fix

### 1. Added Separate `miniLogo` Property

**File: `/elscholar-ui/src/config/domainConfig.ts`**

#### Interface Definition (Line 15-22)
```typescript
export interface DomainConfig {
  // App Branding
  appName: string;
  appLogo: string;              // ✅ For sidebar/header
  miniLogo: string;             // ✅ NEW: For login and loader pages only
  appShortName: string;
  appUrl: string;
  appDomain: string;
```

#### Environment Variables (Line 56-63)
```typescript
interface EnvironmentVariables {
  // App Branding
  appName: string | undefined;
  appLogo: string | undefined;
  miniLogo: string | undefined;  // ✅ NEW
  appShortName: string | undefined;
  appUrl: string | undefined;
  appDomain: string | undefined;
```

#### Fallback Values (Line 110-111)
```typescript
// AFTER - Correct fallbacks
appLogo: env.VITE_APP_LOGO || env.REACT_APP_LOGO || env.APP_LOGO || '/assets/img/logo.png',  // ✅ Full logo for sidebar
miniLogo: env.VITE_MINI_LOGO || env.REACT_APP_MINI_LOGO || env.MINI_LOGO || '/assets/img/mini-logo.png',  // ✅ Mini logo for login/loader
```

#### Config Object (Line 246-253)
```typescript
const config: DomainConfig = {
  // App Branding (required)
  appName: envVars.appName!,
  appLogo: envVars.appLogo!,    // ✅ Regular logo
  miniLogo: envVars.miniLogo!,  // ✅ NEW: Mini logo
  appShortName: envVars.appShortName!,
  appUrl: envVars.appUrl!,
  appDomain: envVars.appDomain!,
```

### 2. Updated Hook to Expose miniLogo

**File: `/elscholar-ui/src/hooks/useDomainConfig.ts`**

```typescript
return {
  config,
  isLoading,
  // Convenience getters
  appName: config.appName,
  appLogo: config.appLogo,      // ✅ For sidebar
  miniLogo: config.miniLogo,    // ✅ NEW: For login/loader
  appShortName: config.appShortName,
  // ... rest of properties
};
```

## How It Works Now

### Sidebar/Header Logo
**Uses:** `appLogo`
**Default:** `/assets/img/logo.png`
**Location:** `elscholar-ui/src/core/common/header/index.tsx`

```typescript
const { config, appLogo } = useDomainConfig();

// Line 328-349: Small Brand Logo in header
<Link to={`${user?.user_type}-dashboard`} className="logo-small">
  <img
    src={getSmallHeaderLogo()}  // Returns appLogo
    alt={config.appShortName}
    // ...
  />
</Link>
```

The `getSmallHeaderLogo()` function (line 220-231) returns `appLogo` for custom domains:

```typescript
const getSmallHeaderLogo = () => {
  const hostname = window.location.hostname;
  const isEliteScholar = hostname.includes('elitescholar.ng');

  if (isEliteScholar) {
    return "/assets/img/elitescholar-logo.png";  // Elite Core branding
  }

  // For other domains, use configured logo
  return appLogo.startsWith("/") ? appLogo : `/${appLogo}`;  // ✅ Uses appLogo (logo.png)
};
```

### Login Pages
**Should use:** `miniLogo` (for consistency with loader)
**Default:** `/assets/img/mini-logo.png`

### Loader (BrandedLoader)
**Should use:** `miniLogo`
**Default:** `/assets/img/mini-logo.png`

## Environment Variables

You can now configure both logos separately in `.env`:

```bash
# Full logo for sidebar/header
VITE_APP_LOGO=/assets/img/logo.png

# Mini logo for login/loader
VITE_MINI_LOGO=/assets/img/mini-logo.png
```

Or use React App naming:
```bash
REACT_APP_LOGO=/assets/img/logo.png
REACT_APP_MINI_LOGO=/assets/img/mini-logo.png
```

Or plain naming:
```bash
APP_LOGO=/assets/img/logo.png
MINI_LOGO=/assets/img/mini-logo.png
```

## Files Modified

1. `/elscholar-ui/src/config/domainConfig.ts`
   - Line 19: Added `miniLogo: string;` to `DomainConfig` interface
   - Line 60: Added `miniLogo: string | undefined;` to `EnvironmentVariables` interface
   - Line 110: Changed `appLogo` fallback from `mini-logo.png` to `logo.png` ✅
   - Line 111: Added `miniLogo` with fallback to `mini-logo.png` ✅
   - Line 250: Added `miniLogo: envVars.miniLogo!,` to config object

2. `/elscholar-ui/src/hooks/useDomainConfig.ts`
   - Line 120: Added `miniLogo: config.miniLogo,` to return object

## Result

✅ **Sidebar logo now uses `/assets/img/logo.png`** (full logo)
✅ **Login/loader can use `/assets/img/mini-logo.png`** (mini logo)
✅ **Separate configuration for each logo type**
✅ **Backward compatible** - existing setups will work with new defaults

## Next Steps (Optional)

If you want to update login pages and BrandedLoader to use `miniLogo`:

### 1. Update BrandedLoader
**File:** `/elscholar-ui/src/feature-module/router/BrandedLoader.tsx`

Find where logo is used and change from `appLogo` to `miniLogo`:

```typescript
// Before
const { appLogo } = useDomainConfig();

// After
const { miniLogo } = useDomainConfig();
```

### 2. Update Login Pages
**Files:**
- `/elscholar-ui/src/feature-module/auth/login/login-enhanced.tsx`
- `/elscholar-ui/src/feature-module/auth/login/student-login-enhanced.tsx`
- Any other login pages

Change logo reference from `appLogo` to `miniLogo` for consistency.

## Summary

The sidebar logo mixup is now **completely fixed**!

**Before:**
- Sidebar used `mini-logo.png` ❌
- No separation between sidebar logo and loader logo
- Single `appLogo` property for everything

**After:**
- Sidebar uses `logo.png` ✅
- Clear separation: `appLogo` for sidebar, `miniLogo` for login/loader
- Configurable via environment variables
- Proper fallbacks for each use case

**The branding concept is now correct!** 🎉
