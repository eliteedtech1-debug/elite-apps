# Logo Debug Verification Guide

## What Was Fixed

I've added comprehensive debugging to help you identify and fix the logo issue. The system will now automatically log detailed information about which logo is being loaded.

## Changes Made

### 1. Enhanced BrandedLoader Debug Logging
**File:** `elscholar-ui/src/feature-module/router/BrandedLoader.tsx:68-75`

Added comprehensive debug logging that shows:
- The `appName` value
- The `appLogo` value from domain config
- The actual `logoSrc` being used
- The environment variable `VITE_APP_LOGO`
- A warning if the wrong logo is detected

### 2. Enhanced Domain Config Debug Logging
**File:** `elscholar-ui/src/config/domainConfig.ts:231-241`

Added logo verification in environment variable logging:
- Shows the exact `appLogo` value loaded
- Verifies if logo is correct
- Warns if `elitescholar-logo` (wrong logo) is detected

## How to Verify the Logo Issue

### Step 1: Open the Application
1. **Frontend is running on:** `http://localhost:3001`
2. Open this URL in your browser

### Step 2: Open Browser Console
1. Press `F12` (or `Cmd+Option+I` on Mac)
2. Click on the **Console** tab

### Step 3: Look for Debug Logs

You should see logs like this:

#### ✅ If Logo is CORRECT:
```javascript
🔍 Environment variables loaded: {
  appName: "ELITE CORE",
  appLogo: "/assets/img/mini-logo.png",  // ✅ CORRECT
  appDomain: "elitescholar.ng",
  serverUrl: "http://localhost:34567",
  logoIsCorrect: true,
  logoWarning: "✅ Logo OK"
}

🔍 BrandedLoader Debug: {
  appName: "ELITE CORE",
  appLogo: "/assets/img/mini-logo.png",  // ✅ CORRECT
  logoSrc: "/assets/img/mini-logo.png",
  envLogo: "/assets/img/mini-logo.png",
  expectedForElite: "/assets/img/mini-logo.png",
  warning: "✅ Correct logo"
}
```

#### ❌ If Logo is WRONG:
```javascript
🔍 Environment variables loaded: {
  appName: "ELITE CORE",
  appLogo: "/assets/img/elitescholar-logo.png",  // ❌ WRONG!
  appDomain: "elitescholar.ng",
  serverUrl: "http://localhost:34567",
  logoIsCorrect: false,
  logoWarning: "⚠️ WRONG LOGO IN ENV!"  // ⚠️ WARNING
}

🔍 BrandedLoader Debug: {
  appName: "ELITE CORE",
  appLogo: "/assets/img/elitescholar-logo.png",  // ❌ WRONG!
  logoSrc: "/assets/img/elitescholar-logo.png",
  envLogo: "/assets/img/elitescholar-logo.png",
  expectedForElite: "/assets/img/mini-logo.png",
  warning: "⚠️ WRONG LOGO! Should use mini-logo.png"  // ⚠️ WARNING
}
```

## Step 4: Check Network Tab for Logo Request

1. Click on the **Network** tab in developer tools
2. Filter by "logo"
3. Look for the logo request
4. Check which logo file is being requested

#### ✅ If CORRECT:
```
GET http://localhost:3001/assets/img/mini-logo.png
Status: 200 OK
```

#### ❌ If WRONG:
```
GET http://localhost:3001/assets/img/elitescholar-logo.png
Status: 200 OK (or 404 Not Found)
```

## Step 5: Visual Verification

### What the Logo Should Look Like:
- **Shape:** Square (not wide/rectangular)
- **File:** mini-logo.png (18KB)
- **Location:** In the center of loading screens

### What it Should NOT Look Like:
- **Shape:** Wide/rectangular
- **File:** elitescholar-logo.png (this is the sidebar logo)

## Common Issues and Fixes

### Issue 1: Browser Cache
**Symptom:** Logo doesn't update even after changes
**Fix:**
```bash
# Hard refresh browser
- Windows: Ctrl + Shift + R
- Mac: Cmd + Shift + R

# Or clear browser cache completely
```

### Issue 2: Vite Dev Server Cache
**Symptom:** Changes not reflected
**Fix:**
```bash
# Stop dev server (Ctrl+C)
# Delete Vite cache
rm -rf src/node_modules/.vite

# Restart
cd src
npm run dev
```

### Issue 3: Wrong Environment File Loaded
**Symptom:** Console shows wrong `appLogo` value
**Fix:**
```bash
# Check your .env file
cd elscholar-ui
cat .env | grep VITE_APP_LOGO

# Should output:
# VITE_APP_LOGO=/assets/img/mini-logo.png

# If wrong, edit .env and change it back
```

### Issue 4: Build Artifacts Cached
**Symptom:** Production build shows wrong logo
**Fix:**
```bash
cd src
rm -rf dist
npm run build
```

## Verification Checklist

After making any changes, verify all of these:

- [ ] **Console log shows:**
  - `logoIsCorrect: true`
  - `logoWarning: "✅ Logo OK"`
  - `warning: "✅ Correct logo"`

- [ ] **Network tab shows:**
  - Request to `/assets/img/mini-logo.png`
  - Status: 200 OK
  - Size: ~18KB

- [ ] **Visual check:**
  - Logo is SQUARE (not wide)
  - Logo appears in loaders
  - Logo is clear and recognizable

- [ ] **.env file contains:**
  ```bash
  VITE_APP_LOGO=/assets/img/mini-logo.png
  ```

- [ ] **Verification script passes:**
  ```bash
  cd elscholar-ui
  ./scripts/verify-brand-identity.sh
  # Should output: ✅ All brand identity checks passed!
  ```

## If Logo Is Still Wrong

### Diagnostic Steps:

1. **Check what console says:**
   - Copy the entire debug log output
   - Share it to identify the exact issue

2. **Check .env file:**
   ```bash
   cat .env | grep VITE_APP_LOGO
   ```

3. **Check if file exists:**
   ```bash
   ls -lh public/assets/img/mini-logo.png
   # Should show: -rw-r--r--  18K mini-logo.png
   ```

4. **Try restarting EVERYTHING:**
   ```bash
   # Kill all processes
   pkill -f "vite"
   pkill -f "node"

   # Clear all caches
   rm -rf src/node_modules/.vite
   rm -rf src/dist

   # Restart dev server
   cd src
   npm run dev

   # Clear browser cache (Cmd+Shift+R)
   ```

5. **Check for multiple .env files:**
   ```bash
   ls -la | grep env
   # Make sure you're editing the right one
   ```

## Understanding the Debug Output

### Key Fields to Check:

| Field | Correct Value | Wrong Value | Meaning |
|-------|---------------|-------------|---------|
| `appLogo` | `/assets/img/mini-logo.png` | `/assets/img/elitescholar-logo.png` | Logo from domain config |
| `envLogo` | `/assets/img/mini-logo.png` | `/assets/img/elitescholar-logo.png` | Logo from .env file |
| `logoSrc` | `/assets/img/mini-logo.png` | `/assets/img/elitescholar-logo.png` | Actual logo being rendered |
| `logoIsCorrect` | `true` | `false` | Validation result |
| `logoWarning` | `"✅ Logo OK"` | `"⚠️ WRONG LOGO IN ENV!"` | Warning message |

## Quick Test

Run this in browser console after page loads:

```javascript
// Check current logo
console.log('Current logo:', import.meta.env.VITE_APP_LOGO);

// Check what's in DOM
document.querySelectorAll('img').forEach(img => {
  if (img.src.includes('logo')) {
    console.log('Logo found:', img.src);
  }
});
```

Expected output:
```
Current logo: /assets/img/mini-logo.png
Logo found: http://localhost:3001/assets/img/mini-logo.png
```

## Next Steps

1. **Open** `http://localhost:3001` in your browser
2. **Open** browser developer tools (F12)
3. **Check** the Console tab for debug logs
4. **Report** what you see:
   - ✅ If logo is correct: "Logo is showing correctly!"
   - ⚠️ If logo is wrong: Share the console debug output

## Files You Can Reference

- ✅ `.env` - Environment configuration (line 22-26)
- ✅ `BRAND_IDENTITY_PRESERVATION_GUIDE.md` - Full brand guide
- ✅ `BRAND_PROTECTION_SUMMARY.md` - Protection summary
- ✅ `scripts/verify-brand-identity.sh` - Verification script
- ✅ `src/feature-module/router/BrandedLoader.tsx` - Loader component
- ✅ `src/config/domainConfig.ts` - Domain configuration

---

**Created:** 2025-12-03
**Purpose:** Help you verify and debug the logo loading issue
**Status:** Frontend dev server running on http://localhost:3001
