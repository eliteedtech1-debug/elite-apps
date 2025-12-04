# 🔍 Debug: Logo Issue Investigation

## The Problem

You're seeing the **full logo** (elitescholar-logo.png) being displayed at reduced size (80px), instead of the **mini-logo** (mini-logo.png) which is designed for small display.

## Why This Happens

The transition loader is using the **correct path** (`/assets/img/mini-logo.png`) but the **file itself** might be the wrong image, OR there's a caching issue showing the old full logo.

## Investigation Steps

### Step 1: Verify Logo Files

Check what's actually in the logo files:

```bash
# Check file sizes
ls -lh /Users/apple/Downloads/apps/elite/frontend/public/assets/img/*.png

# Expected:
# mini-logo.png: 18KB (small, simple logo)
# elitescholar-logo.png: 11KB (full logo with text)
```

### Step 2: Check What's Being Loaded

Open browser DevTools:

1. **Network Tab**
   - Filter by "Img"
   - Navigate to trigger the loader
   - Look for which logo file is requested
   - Check the actual file being loaded

2. **Elements Tab**
   - Inspect the loader image
   - Check the `src` attribute
   - Right-click image → "Open in new tab"
   - See which actual file is displayed

### Step 3: Verify Environment Variable

```bash
# Check what's in .env
grep VITE_APP_LOGO /Users/apple/Downloads/apps/elite/frontend/.env

# Should show:
# VITE_APP_LOGO=/assets/img/mini-logo.png
```

### Step 4: Check Runtime Value

In browser console:

```javascript
// Check what the app thinks the logo is
console.log('Logo from env:', import.meta.env.VITE_APP_LOGO);

// Check what useDomainConfig returns
// (You'll need to add a console.log in BrandedLoader.tsx temporarily)
```

## Possible Causes

### Cause 1: Wrong File Content ❌

**Problem**: The `mini-logo.png` file actually contains the full logo image

**Solution**: Replace mini-logo.png with the correct small logo file

```bash
# Backup current file
cp frontend/public/assets/img/mini-logo.png frontend/public/assets/img/mini-logo.png.backup

# Copy the correct mini logo
# (You need to provide the correct mini logo file)
```

### Cause 2: Browser Cache ❌

**Problem**: Browser cached the old full logo

**Solution**: 
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache completely
3. Try incognito mode

### Cause 3: Service Worker Cache ❌

**Problem**: Service worker cached the old logo

**Solution**:
1. Open DevTools (F12)
2. Application tab → Service Workers
3. Unregister all service workers
4. Application tab → Clear storage
5. Refresh page

### Cause 4: Build Cache ❌

**Problem**: Vite cached the old logo

**Solution**:
```bash
cd frontend
rm -rf node_modules/.vite
rm -rf dist
npm start
```

## The Real Issue

Based on your description ("full logo but with reduced width and height"), the loader is:
- ✅ Using the correct SIZE (80px max width)
- ❌ Using the WRONG IMAGE FILE (full logo instead of mini logo)

This means either:
1. The `mini-logo.png` file contains the wrong image
2. The browser is loading a cached version of the full logo
3. There's a redirect or alias pointing mini-logo.png to the full logo

## Quick Test

Add this temporary debug code to `BrandedLoader.tsx`:

```typescript
// In BrandedLoader component, after const logoSrc = ...
console.log('🔍 DEBUG Logo Info:', {
  appLogo,
  logoSrc,
  normalizedPath: normalizePath(appLogo),
  envLogo: import.meta.env.VITE_APP_LOGO
});
```

Then check browser console to see what's actually being used.

## Solution

### Option 1: Verify mini-logo.png File

The `mini-logo.png` file should be a **small, simple version** of the logo, not the full logo.

**Check**:
```bash
# View the file
open /Users/apple/Downloads/apps/elite/frontend/public/assets/img/mini-logo.png
```

**If it's the wrong image**, replace it with the correct mini logo.

### Option 2: Use a Different Logo File

If you have a different small logo file, update the .env:

```env
# Use a different small logo
VITE_APP_LOGO=/assets/img/logo-small.svg
```

### Option 3: Create a Proper Mini Logo

If you don't have a mini logo, create one:
1. Take the full logo
2. Remove text/details
3. Keep only the icon/symbol
4. Save as mini-logo.png (around 80x80px)

## Verification

After fixing, verify:

1. **File Check**
   ```bash
   ls -lh frontend/public/assets/img/mini-logo.png
   # Should be small (< 20KB)
   ```

2. **Visual Check**
   - Open the file directly
   - Should show a simple icon, not full logo with text

3. **Browser Check**
   - Clear all caches
   - Hard refresh
   - Inspect loader image
   - Should show simple mini logo

## Next Steps

1. **Check the actual mini-logo.png file** - Is it the right image?
2. **Clear all caches** - Browser, service worker, Vite
3. **Add debug logging** - See what's actually being loaded
4. **Report back** - What did you find?

---

**The code is correct. The issue is either:**
- ❌ Wrong image in mini-logo.png file
- ❌ Browser/service worker cache
- ❌ Build cache

**Let's identify which one it is!**
