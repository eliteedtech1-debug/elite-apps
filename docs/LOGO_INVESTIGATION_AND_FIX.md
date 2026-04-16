# 🔍 Logo Investigation & Fix Guide

## 🚨 The Real Problem

You're seeing the **full logo with text** (wide, 354x131px) scaled down to 80px width, instead of the **mini icon logo** (square, 225x215px).

This means the transition loader is loading the **WRONG IMAGE FILE**, not just scaling it wrong.

## 📊 Logo Files Analysis

| File | Dimensions | Size | Type |
|------|------------|------|------|
| **mini-logo.png** | 225 x 215 | 18KB | Square icon (CORRECT for loader) |
| **elitescholar-logo.png** | 354 x 131 | 11KB | Wide with text (WRONG for loader) |

## 🔍 Debug Steps Added

I've added debug logging to `OverlayBrandedLoader` (the page transition loader).

### What to Do:

1. **Restart your dev server**
   ```bash
   cd frontend
   npm start
   ```

2. **Open browser console** (F12)

3. **Navigate to a new page** (trigger the transition loader)

4. **Check the console output**

You should see:
```javascript
🔍 OverlayBrandedLoader Logo Debug: {
  appLogo: "/assets/img/mini-logo.png",  // ← What useDomainConfig returns
  logoSrc: "/assets/img/mini-logo.png",  // ← What will be used in <img src>
  appName: "ELITE CORE",
  envLogo: "/assets/img/mini-logo.png"   // ← What's in .env file
}
```

## 🎯 What to Look For

### Scenario 1: Debug shows mini-logo.png ✅

**Console shows**:
```javascript
logoSrc: "/assets/img/mini-logo.png"
```

**But you still see full logo** → **Browser Cache Issue**

**Solution**:
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache completely
3. Disable cache in DevTools (Network tab → "Disable cache")
4. Try incognito mode
5. Unregister service workers (DevTools → Application → Service Workers)

### Scenario 2: Debug shows different logo ❌

**Console shows**:
```javascript
logoSrc: "/assets/img/elitescholar-logo.png"  // ← WRONG!
```

**Problem**: Environment variable is wrong or not being read

**Solution**:
1. Check .env file: `cat frontend/.env | grep VITE_APP_LOGO`
2. Restart dev server (environment variables only load on start)
3. Clear Vite cache: `rm -rf frontend/node_modules/.vite`

### Scenario 3: Debug shows undefined/null ❌

**Console shows**:
```javascript
appLogo: undefined
logoSrc: "/assets/img/mini-logo.png"  // ← Fallback
```

**Problem**: useDomainConfig() not reading environment variable

**Solution**:
1. Check if .env file exists: `ls -la frontend/.env`
2. Verify .env format (no spaces around =)
3. Restart dev server

## 🧪 Network Tab Verification

1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by **Img**
4. Navigate to trigger loader
5. Look for the logo request

**What you should see**:
- Request URL: `http://localhost:3000/assets/img/mini-logo.png`
- Status: 200
- Size: 18KB
- Type: image/png

**If you see**:
- Request URL: `http://localhost:3000/assets/img/elitescholar-logo.png` ← **WRONG!**
- Then the code is using the wrong logo path

## 🔧 Immediate Fix Options

### Option 1: Force Mini Logo (Quick Fix)

Edit `BrandedLoader.tsx` line 142:

**Change from**:
```typescript
const logoSrc = appLogo ? normalizePath(appLogo) : '/assets/img/mini-logo.png';
```

**To**:
```typescript
const logoSrc = '/assets/img/mini-logo.png'; // Force mini logo
```

This bypasses the domain config and forces the mini logo.

### Option 2: Check .env File

```bash
# View current .env
cat frontend/.env

# Should contain:
VITE_APP_LOGO=/assets/img/mini-logo.png

# If not, add it:
echo "VITE_APP_LOGO=/assets/img/mini-logo.png" >> frontend/.env

# Restart dev server
cd frontend
npm start
```

### Option 3: Clear All Caches

```bash
# Stop dev server (Ctrl+C)

# Clear Vite cache
rm -rf frontend/node_modules/.vite

# Clear dist
rm -rf frontend/dist

# Restart
cd frontend
npm start
```

Then in browser:
1. Open DevTools (F12)
2. Network tab → Check "Disable cache"
3. Application tab → Clear storage
4. Hard refresh (Ctrl+Shift+R)

## 📋 Verification Checklist

After applying fix:

- [ ] Console shows: `logoSrc: "/assets/img/mini-logo.png"`
- [ ] Network tab shows request to `mini-logo.png` (not `elitescholar-logo.png`)
- [ ] Logo appears **square-ish** (not wide with text)
- [ ] Logo is the **icon only** (not full logo with text)
- [ ] File size in Network tab is **~18KB** (not 11KB)

## 🎯 Expected Result

### Before (Wrong - Full Logo)
```
┌─────────────────────────────┐
│                             │
│  [ELITE CORE LOGO TEXT]  │  ← Wide logo with text
│                             │
└─────────────────────────────┘
```

### After (Correct - Mini Logo)
```
┌──────────┐
│          │
│  [ICON]  │  ← Square icon only
│          │
└──────────┘
```

## 🚀 Next Steps

1. **Restart dev server** to load the debug logging
2. **Open browser console** and navigate to a page
3. **Check the debug output** - what does it show?
4. **Report back** with the console output

Then we can identify exactly what's wrong and fix it!

---

## 📝 Summary

**I've added debug logging** to show exactly what logo is being loaded.

**The issue is one of these**:
1. ❌ Environment variable not being read correctly
2. ❌ Browser cache showing old logo
3. ❌ Service worker cache
4. ❌ Vite build cache

**Let's find out which one!** Check the console output after restarting the dev server.
