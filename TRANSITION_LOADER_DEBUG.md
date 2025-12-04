# Transition Loader Debug Guide

## Issue Description

You mentioned: "transition loader still showing full logo with minimized size"

This means:
- The BrandedLoader is being silenced (not showing)
- A different loader (transition/navigation loader) is showing
- That loader is displaying the **full/wide logo** (`elitescholar-logo.png`) at a small size
- Instead of showing the **square mini-logo** (`mini-logo.png`)

## Which Loader Is Showing?

Based on the code, you're likely seeing the **OverlayBrandedLoader** which shows during page transitions.

**File:** `elscholar-ui/src/feature-module/router/BrandedLoader.tsx:131-194`

This component is used by:
- `NavigationLoaderContext` (line 160) - Shows during page navigation

## Debug Steps

### 1. Check Browser Console

When you see the transition loader, open the browser console and look for:

```javascript
🔍 OverlayBrandedLoader Logo Debug: {
  appLogo: "/assets/img/????",  // What logo path?
  logoSrc: "/assets/img/????",   // What's actually being used?
  appName: "ELITE SCHOLAR",
  envLogo: "/assets/img/????",   // What does env say?
  expectedForElite: "/assets/img/mini-logo.png",
  warning: "⚠️ WRONG LOGO!" or "✅ Correct logo"
}
```

### 2. What To Look For

#### ✅ If CORRECT (mini-logo):
```javascript
{
  appLogo: "/assets/img/mini-logo.png",
  logoSrc: "/assets/img/mini-logo.png",
  warning: "✅ Correct logo"
}
```

#### ❌ If WRONG (full elitescholar-logo):
```javascript
{
  appLogo: "/assets/img/elitescholar-logo.png",
  logoSrc: "/assets/img/elitescholar-logo.png",
  warning: "⚠️ WRONG LOGO! Should use mini-logo.png"
}
```

## The OverlayBrandedLoader Code

The transition loader code (lines 148-158):

```typescript
const logoSrc = appLogo ? normalizePath(appLogo) : '/assets/img/mini-logo.png';

// 🐛 DEBUG: Log what logo is being used
console.log('🔍 OverlayBrandedLoader Logo Debug:', {
  appLogo,
  logoSrc,
  appName,
  envLogo: import.meta.env.VITE_APP_LOGO,
  expectedForElite: '/assets/img/mini-logo.png',
  warning: logoSrc.includes('elitescholar-logo') ? '⚠️ WRONG LOGO! Should use mini-logo.png' : '✅ Correct logo'
});
```

This means:
1. It gets `appLogo` from `useDomainConfig()`
2. It should use `/assets/img/mini-logo.png` from your .env file
3. It logs exactly which logo it's using
4. It warns if the wrong logo is detected

## How To Trigger The Transition Loader

1. **Open** `http://localhost:3001` in browser
2. **Login** to the application
3. **Navigate** between pages (click any menu item)
4. **Watch** for the loading screen that appears
5. **Check** browser console immediately

## Image In Network Tab

When the transition loader shows:

1. Open **Network tab** in browser dev tools
2. Filter by **"Img"** or type **"logo"**
3. Look for the logo request

#### ✅ CORRECT:
```
GET http://localhost:3001/assets/img/mini-logo.png
Status: 200 OK
Size: ~18KB
```

#### ❌ WRONG:
```
GET http://localhost:3001/assets/img/elitescholar-logo.png
Status: 200 OK
Size: ~11KB (wider logo)
```

## Why BrandedLoader Is "Silenced"

The **LoaderCoordinator** system prevents multiple loaders from showing at once.

Priority order:
1. Navigation loader (highest priority)
2. Suspense fallback loader (lower priority)

If a navigation is happening, the BrandedLoader (Suspense fallback) won't show because the OverlayBrandedLoader (Navigation) is active.

## The Real Question

**Does the OverlayBrandedLoader console log show the correct or wrong logo?**

Please check the browser console when you see the transition loader and tell me:

1. What does `appLogo` value show?
2. What does `logoSrc` value show?
3. What does the `warning` field say?
4. What logo file does Network tab show being requested?

## If It's Wrong

If the console shows:
```javascript
warning: "⚠️ WRONG LOGO! Should use mini-logo.png"
```

Then the problem is that `useDomainConfig()` is returning the wrong value for `appLogo`.

### Possible Causes:

1. **.env file is wrong**
   ```bash
   cat .env | grep VITE_APP_LOGO
   # Should be: VITE_APP_LOGO=/assets/img/mini-logo.png
   ```

2. **Vite cache**
   ```bash
   rm -rf src/node_modules/.vite
   cd src && npm run dev
   ```

3. **Browser cache**
   ```
   Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   ```

4. **Wrong .env file loaded**
   - Check if `.env.skcoolyplus` is being loaded instead of `.env`

## Visual Comparison

### mini-logo.png (CORRECT for loaders):
- **Shape:** Square (like an icon)
- **Size:** 18KB
- **Usage:** Loaders, loading screens
- **Appearance:** Compact, fits well in small spaces

### elitescholar-logo.png (WRONG for loaders):
- **Shape:** Wide/Rectangular (like a banner)
- **Size:** 11KB
- **Usage:** Sidebar, header (NOT loaders)
- **Appearance:** Wide, looks squished when made small

## Quick Fix If Wrong

If the console confirms wrong logo:

1. **Stop dev server** (Ctrl+C)
2. **Edit .env**:
   ```bash
   cd elscholar-ui
   # Make sure this line exists and is correct:
   VITE_APP_LOGO=/assets/img/mini-logo.png
   ```
3. **Clear cache**:
   ```bash
   rm -rf src/node_modules/.vite
   ```
4. **Restart**:
   ```bash
   cd src
   npm run dev
   ```
5. **Hard refresh browser** (Cmd+Shift+R)

## Expected Console Output

When everything is working correctly, you should see:

```javascript
// From domainConfig.ts
🔍 Environment variables loaded: {
  appName: "ELITE SCHOLAR",
  appLogo: "/assets/img/mini-logo.png",
  logoIsCorrect: true,
  logoWarning: "✅ Logo OK"
}

// From OverlayBrandedLoader
🔍 OverlayBrandedLoader Logo Debug: {
  appLogo: "/assets/img/mini-logo.png",
  logoSrc: "/assets/img/mini-logo.png",
  appName: "ELITE SCHOLAR",
  envLogo: "/assets/img/mini-logo.png",
  expectedForElite: "/assets/img/mini-logo.png",
  warning: "✅ Correct logo"
}
```

---

**Next Step:** Please navigate between pages in the app, trigger the transition loader, and check what the browser console says!
