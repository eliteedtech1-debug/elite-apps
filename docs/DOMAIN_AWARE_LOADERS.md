# ✅ Domain-Aware Loaders - Complete Guide

## 🎯 Overview

Both loaders (`BrandedLoader` and `OverlayBrandedLoader`) are **fully domain-aware** and automatically use the correct logo based on the active `.env` configuration.

## 🏗️ How It Works

### 1. **Domain Configuration System**

The loaders use `useDomainConfig()` hook which reads from environment variables:

```typescript
const { appName, appLogo } = useDomainConfig();
```

### 2. **Environment-Based Logo Selection**

The `appLogo` value comes from the active `.env` file:

| Configuration | .env File | Logo Path | Logo File |
|---------------|-----------|-----------|-----------|
| **Elite Core** | `.env` or `.env.elitescholar` | `/assets/img/mini-logo.png` | 18KB |
| **Skcooly Plus** | `.env.skcoolyplus` | `/assets/img/skcooly-logo.png` | 126KB |

### 3. **Automatic Logo Loading**

```typescript
// Both BrandedLoader and OverlayBrandedLoader use this logic:
const logoSrc = appLogo ? normalizePath(appLogo) : '/assets/img/mini-logo.png';
```

**Result**:
- ✅ Elite Core build → Uses `mini-logo.png`
- ✅ Skcooly Plus build → Uses `skcooly-logo.png`
- ✅ Automatic switching based on active .env file

## 📁 Configuration Files

### Elite Core (.env)
```env
VITE_APP_NAME=ELITE CORE
VITE_APP_LOGO=/assets/img/mini-logo.png
VITE_APP_DOMAIN=elitescholar.ng
VITE_PRIMARY_COLOR=#059669
# ... other config
```

### Skcooly Plus (.env.skcoolyplus)
```env
VITE_APP_NAME=SKCOOLY PLUS
VITE_APP_LOGO=/assets/img/skcooly-logo.png
VITE_APP_DOMAIN=skcoolyplus.org.ng
VITE_PRIMARY_COLOR=#2563eb
# ... other config
```

## 🎨 Logo Specifications

### Elite Core Logo
- **File**: `public/assets/img/mini-logo.png`
- **Size**: 18KB
- **Display**: 80px max width
- **Style**: `objectFit: 'contain'`

### Skcooly Plus Logo
- **File**: `public/assets/img/skcooly-logo.png`
- **Size**: 126KB
- **Display**: 80px max width
- **Style**: `objectFit: 'contain'`

## 🔄 How to Switch Between Configurations

### Method 1: Copy .env File (Recommended)

```bash
# For Elite Core
cp .env.elitescholar .env

# For Skcooly Plus
cp .env.skcoolyplus .env

# Restart dev server
npm start
```

### Method 2: Set Environment Variable

```bash
# For Elite Core
VITE_APP_LOGO=/assets/img/mini-logo.png npm start

# For Skcooly Plus
VITE_APP_LOGO=/assets/img/skcooly-logo.png npm start
```

### Method 3: Build-Time Configuration

```bash
# Build for Elite Core
npm run build

# Build for Skcooly Plus
cp .env.skcoolyplus .env
npm run build
```

## 🧪 Verification

### Check Active Configuration

Open browser console and run:

```javascript
// Check which logo is configured
console.log('Logo:', import.meta.env.VITE_APP_LOGO);
console.log('App Name:', import.meta.env.VITE_APP_NAME);
console.log('Domain:', import.meta.env.VITE_APP_DOMAIN);
```

**Expected Output for Elite Core**:
```
Logo: /assets/img/mini-logo.png
App Name: ELITE CORE
Domain: elitescholar.ng
```

**Expected Output for Skcooly Plus**:
```
Logo: /assets/img/skcooly-logo.png
App Name: SKCOOLY PLUS
Domain: skcoolyplus.org.ng
```

### Check Logo in DOM

1. Open DevTools (F12)
2. Trigger a loader (navigate to a new page)
3. Inspect the loader image

**Expected for Elite Core**:
```html
<img 
  src="/assets/img/mini-logo.png" 
  alt="ELITE CORE Logo"
  style="max-width: 80px; height: auto; object-fit: contain;"
>
```

**Expected for Skcooly Plus**:
```html
<img 
  src="/assets/img/skcooly-logo.png" 
  alt="SKCOOLY PLUS Logo"
  style="max-width: 80px; height: auto; object-fit: contain;"
>
```

## 📊 Loader Components

### 1. BrandedLoader (Suspense Fallback)

**File**: `frontend/src/feature-module/router/BrandedLoader.tsx`
**Line**: 63

```typescript
const logoSrc = appLogo ? normalizePath(appLogo) : '/assets/img/mini-logo.png';
```

**Used for**:
- Component lazy loading
- Suspense fallbacks
- Initial app loading

### 2. OverlayBrandedLoader (Page Transitions)

**File**: `frontend/src/feature-module/router/BrandedLoader.tsx`
**Line**: 142

```typescript
const logoSrc = appLogo ? normalizePath(appLogo) : '/assets/img/mini-logo.png';
```

**Used for**:
- Page navigation transitions
- Route changes
- Called by `NavigationLoaderContext`

## 🔍 Domain Config Flow

```
.env file
  ↓
import.meta.env.VITE_APP_LOGO
  ↓
domainConfig.ts → getEnvironmentVariables()
  ↓
getCurrentDomainConfig() → appLogo
  ↓
useDomainConfig() hook
  ↓
BrandedLoader / OverlayBrandedLoader
  ↓
<img src={logoSrc} />
```

## 🎯 Key Features

### ✅ Automatic Logo Selection
- No manual configuration needed
- Reads from active .env file
- Works in development and production

### ✅ Multi-Domain Support
- Elite Core configuration
- Skcooly Plus configuration
- Easy to add more domains

### ✅ Consistent Sizing
- Both loaders use 80px max width
- `objectFit: 'contain'` maintains aspect ratio
- Responsive design

### ✅ Fallback Handling
- If logo fails to load, shows app name
- Graceful degradation
- Error handling built-in

## 🚀 Deployment

### Elite Core Deployment

```bash
# 1. Ensure Elite Core .env is active
cp .env.elitescholar .env

# 2. Build
npm run build

# 3. Deploy dist folder
# Logo will be: /assets/img/mini-logo.png
```

### Skcooly Plus Deployment

```bash
# 1. Switch to Skcooly Plus .env
cp .env.skcoolyplus .env

# 2. Build
npm run build

# 3. Deploy dist folder
# Logo will be: /assets/img/skcooly-logo.png
```

## 📝 Adding a New Domain

### Step 1: Create .env File

```bash
# Create .env.newdomain
cat > .env.newdomain << EOF
VITE_APP_NAME=NEW DOMAIN
VITE_APP_LOGO=/assets/img/newdomain-logo.png
VITE_APP_DOMAIN=newdomain.com
VITE_PRIMARY_COLOR=#ff0000
# ... other config
EOF
```

### Step 2: Add Logo File

```bash
# Add logo to public/assets/img/
cp /path/to/logo.png public/assets/img/newdomain-logo.png
```

### Step 3: Activate Configuration

```bash
# Copy to .env
cp .env.newdomain .env

# Restart dev server
npm start
```

**That's it!** The loaders will automatically use the new logo.

## 🔧 Troubleshooting

### Issue: Wrong Logo Showing

**Cause**: Wrong .env file is active or browser cache

**Solution**:
1. Check active .env file: `cat .env | grep VITE_APP_LOGO`
2. Clear browser cache (Ctrl+Shift+R)
3. Restart dev server

### Issue: Logo Not Loading

**Cause**: Logo file doesn't exist

**Solution**:
1. Check if logo file exists: `ls -lh public/assets/img/`
2. Verify path in .env matches actual file
3. Check file permissions

### Issue: Logo Too Large/Small

**Cause**: Logo file is very large or very small

**Solution**:
- Loaders use `maxWidth: 80px` with `objectFit: 'contain'`
- Logo will scale proportionally
- For best results, use logos around 80-120px width

## 📊 Summary

| Feature | Status | Details |
|---------|--------|---------|
| **Domain Awareness** | ✅ Complete | Reads from .env files |
| **Elite Core** | ✅ Supported | Uses mini-logo.png |
| **Skcooly Plus** | ✅ Supported | Uses skcooly-logo.png |
| **Auto-Switching** | ✅ Working | Based on active .env |
| **Both Loaders** | ✅ Updated | BrandedLoader + OverlayBrandedLoader |
| **Logo Sizing** | ✅ Consistent | 80px max width |
| **Fallback** | ✅ Implemented | Shows app name if logo fails |

## ✅ Conclusion

**Both loaders are fully domain-aware!**

They automatically use the correct logo based on the active `.env` configuration:
- ✅ Elite Core → `mini-logo.png`
- ✅ Skcooly Plus → `skcooly-logo.png`
- ✅ Easy to add more domains

**No code changes needed to switch between configurations** - just copy the appropriate `.env` file and restart the dev server!

---

**Last Updated**: December 2, 2024
**Status**: ✅ Both loaders are domain-aware and working correctly
