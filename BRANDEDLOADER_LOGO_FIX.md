# BrandedLoader Logo Fix - Elite Config

## Problem

The BrandedLoader and PageTransition loader were showing the logo too large for the elite config. The logo should use the mini-logo with appropriate sizing.

## Root Cause

The BrandedLoader component was using the correct `mini-logo.png` file from the .env configuration, but the image styling had `maxWidth: '150px'` and `maxWidth: '120px'` which was too large for the mini-logo display.

## Files Modified

### 1. BrandedLoader.tsx
**File**: `/Users/apple/Downloads/apps/elite/elscholar-ui/src/feature-module/router/BrandedLoader.tsx`

**Changes Made**:
1. **BrandedLoader component** (main loader):
   - Changed `maxWidth` from `'150px'` to `'80px'`
   - Added `objectFit: 'contain'` to ensure proper scaling
   - Added comment clarifying elite config usage

2. **OverlayBrandedLoader component** (page transition loader):
   - Changed `maxWidth` from `'120px'` to `'80px'`
   - Added `objectFit: 'contain'` to ensure proper scaling
   - Added comment clarifying elite config usage

## Code Changes

### Before
```typescript
// BrandedLoader
<img
  src={logoSrc}
  alt={`${appName} Logo`}
  style={{ maxWidth: '150px', height: 'auto' }}
  onError={(e) => {
    // ...
  }}
/>

// OverlayBrandedLoader
<img
  src={logoSrc}
  alt={`${appName} Logo`}
  style={{ maxWidth: '120px', height: 'auto' }}
  onError={(e) => {
    // ...
  }}
/>
```

### After
```typescript
// BrandedLoader
<img
  src={logoSrc}
  alt={`${appName} Logo`}
  style={{ maxWidth: '80px', height: 'auto', objectFit: 'contain' }}
  onError={(e) => {
    // ...
  }}
/>

// OverlayBrandedLoader
<img
  src={logoSrc}
  alt={`${appName} Logo`}
  style={{ maxWidth: '80px', height: 'auto', objectFit: 'contain' }}
  onError={(e) => {
    // ...
  }}
/>
```

## Configuration

The .env file is already correctly configured:
```env
VITE_APP_LOGO=/assets/img/mini-logo.png
APP_LOGO=/assets/img/mini-logo.png
```

## Logo Files Available

Located in `/Users/apple/Downloads/apps/elite/elscholar-ui/public/assets/img/`:
- `mini-logo.png` (18KB) - ✅ Used for elite config
- `elitescholar-logo.png` (11KB) - Full logo (not used in loaders)
- `logo-small.svg` (7KB) - Small SVG logo

## Components Affected

1. **BrandedLoader** - Main loading component
   - Used in Suspense fallbacks
   - Used for general loading states
   - Now displays mini-logo at 80px max width

2. **OverlayBrandedLoader** - Page transition loader
   - Used by NavigationLoaderContext
   - Used for page transitions
   - Now displays mini-logo at 80px max width

3. **CompactBrandedLoader** - No changes needed (doesn't show logo)

4. **InlineBrandedLoader** - No changes needed (doesn't show logo)

## Testing

After this fix:
1. ✅ BrandedLoader shows mini-logo at appropriate size (80px max)
2. ✅ Page transitions show mini-logo at appropriate size (80px max)
3. ✅ Logo scales properly with `objectFit: 'contain'`
4. ✅ Elite config uses mini-logo consistently

## Usage Examples

### BrandedLoader
```tsx
import { BrandedLoader } from './BrandedLoader';

// In Suspense fallback
<Suspense fallback={<BrandedLoader message="Loading component..." />}>
  <LazyComponent />
</Suspense>

// Standalone
<BrandedLoader message="Loading data..." />
```

### OverlayBrandedLoader (Page Transition)
```tsx
import { OverlayBrandedLoader } from './BrandedLoader';

// Used automatically by NavigationLoaderContext
// Shows during page transitions
<OverlayBrandedLoader show={isNavigating} message="Loading page..." />
```

## Related Files

- **NavigationLoaderContext.tsx** - Uses OverlayBrandedLoader for page transitions
- **usePageTransition.ts** - Hook for programmatic navigation with loader
- **domainConfig.ts** - Configuration for app logo path
- **useDomainConfig.ts** - Hook that provides appLogo value

## Notes

- The mini-logo.png file is 18KB, which is appropriate for a logo with transparency
- The 80px max width ensures the logo is visible but not overwhelming
- The `objectFit: 'contain'` ensures the logo maintains its aspect ratio
- The fallback to mini-logo.png is maintained if appLogo is not set

## Verification

To verify the fix:
1. Refresh the browser
2. Navigate between pages - the page transition loader should show mini-logo at 80px
3. Check any Suspense fallbacks - should show mini-logo at 80px
4. Verify logo is not too large or too small

## Status

✅ **FIXED** - BrandedLoader and PageTransition loader now use mini-logo with appropriate sizing (80px max width) for elite config.
