# Page Transition Loader Implementation

## Overview

A page transition loader has been implemented to provide visual feedback when users navigate between pages. This prevents user confusion about whether their click was registered, especially on mobile devices where page loads may take a few seconds.

## How It Works

### Automatic Detection
The system automatically detects when a user navigates to a different page using:
- URL changes via React Router's `useLocation` hook
- Minimum display time of **300ms** (prevents flash for fast loads)
- Maximum display time of **3 seconds** (safety timeout)

### Visual Feedback
- Shows a branded overlay loader with app logo
- Displays **specific page name** being loaded (e.g., "Loading Student List...", "Loading Teacher Dashboard...")
- Uses semi-transparent backdrop to indicate transition state
- Prevents interaction with the page during transition
- Over 100+ page names mapped for clear user feedback

## Implementation Details

### Files Created/Modified

1. **NavigationLoaderContext.tsx** (`src/contexts/NavigationLoaderContext.tsx`)
   - Context provider that manages loading state
   - Tracks route changes automatically
   - Controls loader visibility with timing logic
   - Displays specific page names dynamically

2. **routeNames.ts** (`src/utils/routeNames.ts`)
   - Maps 100+ routes to user-friendly page names
   - Provides `getPageName()` function to get readable names
   - Handles dynamic routes and partial path matching
   - Falls back to auto-generated names for unmapped routes

3. **usePageTransition.ts** (`src/hooks/usePageTransition.ts`)
   - Hook for programmatic navigation with loader
   - Provides `navigateWithLoader` function
   - Can be used for custom navigation scenarios

4. **main-router.tsx** (`src/feature-module/router/main-router.tsx`)
   - Integrated NavigationLoaderProvider
   - Wraps all routes for automatic detection

## Usage

### Automatic (No Code Changes Needed)

The loader works automatically for all navigation:
```tsx
// Any Link component will trigger the loader automatically
<Link to="/student/student-list">View Students</Link>

// Any useNavigate() call will trigger the loader automatically
const navigate = useNavigate();
navigate('/teacher-dashboard');
```

### Programmatic Usage (Optional)

For custom scenarios where you want explicit control:

```tsx
import { usePageTransition } from '../hooks/usePageTransition';

function MyComponent() {
  const { navigateWithLoader } = usePageTransition();

  const handleCustomNavigation = () => {
    // Do some async work
    await someAsyncOperation();

    // Navigate with loader
    navigateWithLoader('/destination-page');
  };

  return (
    <button onClick={handleCustomNavigation}>
      Go to Page
    </button>
  );
}
```

### Manual Loader Control (Advanced)

For complete control over the loader:

```tsx
import { useNavigationLoader } from '../contexts/NavigationLoaderContext';

function MyComponent() {
  const { setNavigating } = useNavigationLoader();

  const handleCustomAction = async () => {
    // Show loader
    setNavigating(true);

    try {
      // Do some work
      await someHeavyOperation();
    } finally {
      // Hide loader
      setNavigating(false);
    }
  };

  return <button onClick={handleCustomAction}>Process</button>;
}
```

## Configuration

You can adjust timing in `main-router.tsx`:

```tsx
<NavigationLoaderProvider
  minLoadingTime={300}  // Minimum time in ms (prevents flash)
  maxLoadingTime={3000} // Maximum time in ms (safety timeout)
>
  {/* routes */}
</NavigationLoaderProvider>
```

### Recommended Settings

- **Fast connections**: `minLoadingTime: 200, maxLoadingTime: 2000`
- **Slow connections**: `minLoadingTime: 400, maxLoadingTime: 5000`
- **Current (balanced)**: `minLoadingTime: 300, maxLoadingTime: 3000`

## Testing

### Desktop Testing
1. Open browser developer tools
2. Go to Network tab
3. Throttle network to "Slow 3G"
4. Navigate between pages
5. Observe loader appears and transitions smoothly

### Mobile Testing
1. Open app on mobile device
2. Navigate between different pages
3. Verify loader appears immediately after clicking
4. Check that loader disappears when page is ready
5. Test with slow and fast network conditions

### Test Checklist
- [ ] Loader appears immediately on click
- [ ] Loader shows app logo and message
- [ ] Loader doesn't flash on fast loads
- [ ] Loader disappears when page is ready
- [ ] No multiple loaders stacking up
- [ ] Works with back/forward browser buttons
- [ ] Works with programmatic navigation
- [ ] Works on slow network connections

## Troubleshooting

### Loader appears too briefly
**Solution**: Increase `minLoadingTime` in configuration

### Loader stays too long
**Solution**: Decrease `maxLoadingTime` or check for route loading issues

### Loader appears on every click
**Solution**: This is expected - ensure page loads are completing properly

### No loader appears
**Solution**:
1. Check that NavigationLoaderProvider is wrapping your routes
2. Verify no error in browser console
3. Check that OverlayBrandedLoader component is working

## Performance Impact

- **Minimal overhead**: Only tracks location changes
- **No impact on load time**: Pure visual feedback
- **Lazy loaded**: Loader components are only rendered when needed
- **Optimized**: Uses React.memo and useCallback for efficiency

## Browser Compatibility

- ✅ Chrome (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Edge (Desktop)
- ✅ Samsung Internet
- ✅ Opera

## Future Enhancements

Potential improvements that can be added:
- Progress bar instead of spinner
- Estimated time remaining
- Per-route custom loader messages
- Skeleton screens for specific pages
- Preload heavy pages in background
- Cache-aware loading (skip loader if cached)

## Adding New Page Names

If you add a new route and want a custom loader message, update `/src/utils/routeNames.ts`:

```typescript
export const routeNames: Record<string, string> = {
  // ... existing routes ...

  // Add your new route
  '/your-new-route': 'Your Page Name',
  '/student/new-feature': 'Student New Feature',
  // ...
};
```

The loader will automatically show "Loading Your Page Name..." when navigating to that route.

**Note:** If you don't add the route, the system will auto-generate a readable name from the URL path.

## Examples of Page Names

Here are some examples of what users will see:

- Navigate to `/student/student-list` → **"Loading Student List..."**
- Navigate to `/teacher-dashboard` → **"Loading Teacher Dashboard..."**
- Navigate to `/management/fees-group` → **"Loading Fees Groups..."**
- Navigate to `/academic/exam-result` → **"Loading Exam Results..."**
- Navigate to `/application/chat` → **"Loading Chat..."**
- Navigate to `/unmapped-route` → **"Loading Unmapped Route..."** (auto-generated)

## Related Files

- `src/contexts/NavigationLoaderContext.tsx` - Main context
- `src/utils/routeNames.ts` - Route to page name mapping
- `src/hooks/usePageTransition.ts` - Navigation hook
- `src/feature-module/router/main-router.tsx` - Router integration
- `src/feature-module/router/BrandedLoader.tsx` - Loader component

## Questions?

For issues or questions about the page transition loader:
1. Check browser console for errors
2. Verify NavigationLoaderProvider is in router
3. Test with network throttling
4. Check timing configuration
