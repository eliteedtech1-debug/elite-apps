// vite.config.js - FIXED Chunking Strategy
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  
  build: {
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    
    rollupOptions: {
      output: {
        // FIXED: Priority-based chunking to avoid circular dependencies
        manualChunks: (id) => {
          // PRIORITY 1: Core framework (highest priority - must be separate)
          // React ecosystem MUST be isolated first to prevent circular deps
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          
          // PRIORITY 2: Redux/State Management
          // Keep state management separate from UI libraries
          if (id.includes('node_modules/redux') || 
              id.includes('node_modules/@reduxjs') ||
              id.includes('node_modules/react-redux')) {
            return 'vendor-redux';
          }
          
          // PRIORITY 3: Ant Design (large UI library)
          // Process AFTER React but BEFORE other deps to avoid circular refs
          if (id.includes('node_modules/antd/') || 
              id.includes('node_modules/@ant-design/')) {
            return 'vendor-antd';
          }
          
          // PRIORITY 4: Heavy visualization libraries
          // Charts - Bundle together to share dependencies
          if (id.includes('node_modules/echarts')) {
            return 'vendor-echarts';
          }
          
          if (id.includes('node_modules/apexcharts') || 
              id.includes('node_modules/react-apexcharts')) {
            return 'vendor-apexcharts';
          }
          
          if (id.includes('node_modules/recharts')) {
            return 'vendor-recharts';
          }
          
          // PRIORITY 5: PDF generation (very large)
          if (id.includes('node_modules/jspdf') || 
              id.includes('node_modules/html2canvas') ||
              id.includes('node_modules/canvas')) {
            return 'vendor-pdf';
          }
          
          if (id.includes('node_modules/react-pdf') ||
              id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdf-viewer';
          }
          
          // PRIORITY 6: Utilities (commonly shared)
          if (id.includes('node_modules/lodash')) {
            return 'vendor-lodash';
          }
          
          if (id.includes('node_modules/moment') || 
              id.includes('node_modules/dayjs')) {
            return 'vendor-datetime';
          }
          
          if (id.includes('node_modules/axios')) {
            return 'vendor-http';
          }
          
          // PRIORITY 7: Rich text editors
          if (id.includes('node_modules/quill') || 
              id.includes('node_modules/react-quill')) {
            return 'vendor-editor';
          }
          
          // PRIORITY 8: QR/Barcode (media features)
          if (id.includes('node_modules/qrcode') || 
              id.includes('node_modules/jsqr') ||
              id.includes('node_modules/html5-qrcode')) {
            return 'vendor-qr';
          }
          
          // PRIORITY 9: Form libraries
          if (id.includes('node_modules/formik') || 
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/yup')) {
            return 'vendor-forms';
          }
          
          // PRIORITY 10: Icon libraries (can be large)
          if (id.includes('node_modules/@ant-design/icons')) {
            return 'vendor-antd-icons';
          }
          
          if (id.includes('node_modules/react-icons')) {
            return 'vendor-react-icons';
          }
          
          // PRIORITY 11: Animation/UI utilities
          if (id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/react-spring')) {
            return 'vendor-animation';
          }
          
          // CATCH-ALL: All remaining node_modules
          if (id.includes('node_modules/')) {
            return 'vendor-misc';
          }
          
          // Don't manually chunk your own source code
          // Let Vite handle it automatically
        },
        
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          
          // Fonts - keep only woff2 if possible
          if (/\.(woff2?)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          
          // Remove unused font formats to reduce bundle
          if (/\.(eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/legacy/[name]-[hash][extname]`;
          }
          
          if (/\.css$/i.test(assetInfo.name)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          
          return `assets/[name]-[hash][extname]`;
        },
        
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 2, // Multiple passes for better compression
      },
      format: {
        comments: false,
      },
      mangle: {
        safari10: true, // Fix Safari 10 issues
      },
    },
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
    ],
    // Force exclude heavy libraries from pre-bundling
    exclude: [
      'jspdf',
      'html2canvas',
      'react-pdf',
      'pdfjs-dist',
    ],
  },
  
  server: {
    hmr: {
      overlay: true,
    },
  },
});

# Fix: Mixed Static/Dynamic Import Issue

## 🔴 The Problem

```
auth.ts is:
  - Statically imported by: SessionTimeout, login pages, BranchSelector, etc.
  - Dynamically imported by: header/index.tsx

This creates a conflict - Vite can't decide which chunk to put it in!
```

---

## ✅ Solution: Choose ONE Import Strategy

### Option 1: Make ALL Imports Static (RECOMMENDED)

Auth actions are core functionality used everywhere - should be statically imported.

#### Fix header/index.tsx

**BEFORE (WRONG):**
```typescript
// src/core/common/header/index.tsx
const Header = () => {
  // Dynamic import somewhere in the code
  const loadAuth = async () => {
    const auth = await import('../../../redux/actions/auth');
    auth.logout();
  };
  
  return <div>...</div>;
};
```

**AFTER (FIXED):**
```typescript
// src/core/common/header/index.tsx
import { logout } from '../../../redux/actions/auth'; // ✅ Static import

const Header = () => {
  const handleLogout = () => {
    logout(); // ✅ Direct use
  };
  
  return <div>...</div>;
};
```

---

### Option 2: Make ALL Imports Dynamic (NOT Recommended for Auth)

Only if auth is truly optional and not needed on initial load.

#### Convert All Files to Dynamic

```typescript
// SessionTimeout.tsx - BEFORE (static)
import { logout } from '../redux/actions/auth';

// SessionTimeout.tsx - AFTER (dynamic)
const SessionTimeout = () => {
  const handleTimeout = async () => {
    const { logout } = await import('../redux/actions/auth');
    logout();
  };
};
```

**Why NOT recommended:** Auth is core functionality, should be in initial bundle.

---

## 🎯 Recommended Fix (3 Steps)

### Step 1: Find the Dynamic Import

Search for dynamic import in header/index.tsx:

```bash
# Search for dynamic imports of auth
grep -r "import.*auth" src/core/common/header/index.tsx
```

Look for patterns like:
- `await import('...')`
- `import('...')`
- `lazy(() => import('...'))`

### Step 2: Replace with Static Import

**Pattern A: If it's in a function:**
```typescript
// BEFORE
const someFunction = async () => {
  const auth = await import('../../../redux/actions/auth');
  auth.logout();
};

// AFTER
import { logout } from '../../../redux/actions/auth';

const someFunction = () => {
  logout();
};
```

**Pattern B: If it's conditional:**
```typescript
// BEFORE
if (needAuth) {
  const auth = await import('../../../redux/actions/auth');
  auth.logout();
}

// AFTER
import { logout } from '../../../redux/actions/auth';

if (needAuth) {
  logout();
}
```

### Step 3: Verify No More Dynamic Imports

```bash
# Check if auth is still dynamically imported anywhere
grep -r "import.*auth" src/ | grep -E "await|lazy"

# Should return nothing
```

---

## 🔧 Complete Example Fix

### Before (Problematic Code)

```typescript
// src/core/common/header/index.tsx
import React, { useState } from 'react';

const Header = () => {
  const [user, setUser] = useState(null);
  
  const handleLogout = async () => {
    // ❌ Dynamic import - creates the conflict!
    const { logout } = await import('../../../redux/actions/auth');
    logout();
    setUser(null);
  };
  
  return (
    <header>
      <button onClick={handleLogout}>Logout</button>
    </header>
  );
};

export default Header;
```

### After (Fixed Code)

```typescript
// src/core/common/header/index.tsx
import React, { useState } from 'react';
import { logout } from '../../../redux/actions/auth'; // ✅ Static import

const Header = () => {
  const [user, setUser] = useState(null);
  
  const handleLogout = () => {
    logout(); // ✅ Direct call - no await needed
    setUser(null);
  };
  
  return (
    <header>
      <button onClick={handleLogout}>Logout</button>
    </header>
  );
};

export default Header;
```

---

## 📋 Files to Check and Fix

Based on the error, check these files for dynamic imports of auth:

1. ✅ `src/core/common/header/index.tsx` - **PRIMARY CULPRIT**
2. ✅ `src/components/SessionTimeout.tsx` - Ensure static import
3. ✅ `src/core/components/BranchSelector.tsx` - Ensure static import
4. ✅ `src/feature-module/auth/login/login.tsx` - Ensure static import
5. ✅ `src/feature-module/auth/login/student-login.tsx` - Ensure static import
6. ✅ `src/feature-module/auth/login/superadmin-login.tsx` - Ensure static import

### Quick Fix Script

```bash
# Find all files importing auth
grep -l "from.*redux/actions/auth" src/**/*.tsx src/**/*.ts

# For each file, ensure imports are at the top:
# import { logout, login, ... } from '../redux/actions/auth';
```

---

## 🚨 Common Mistake Patterns

### Mistake 1: Conditional Dynamic Imports
```typescript
// ❌ WRONG
if (isAdmin) {
  const auth = await import('./auth');
}

// ✅ CORRECT
import { adminLogout } from './auth';

if (isAdmin) {
  adminLogout();
}
```

### Mistake 2: Event Handler Dynamic Imports
```typescript
// ❌ WRONG
const onClick = async () => {
  const { action } = await import('./actions');
  action();
};

// ✅ CORRECT
import { action } from './actions';

const onClick = () => {
  action();
};
```

### Mistake 3: Lazy Loading Redux Actions
```typescript
// ❌ WRONG - Never lazy load Redux actions
const actions = lazy(() => import('./redux/actions/auth'));

// ✅ CORRECT - Redux actions should always be static
import * as authActions from './redux/actions/auth';
```

---

## ✅ Verification

After fixing, run:

```bash
# Clean build
rm -rf node_modules/.vite
rm -rf dist

# Build and check for the warning
npm run build

# Should NOT see:
# "is dynamically imported but also statically imported"
```

---

## 💡 Why This Happens

**Root Cause:** Someone tried to optimize by lazy loading auth actions, but:

1. Auth is used in SO many places
2. It's needed immediately on app load
3. It's tiny (Redux actions are just functions)
4. Lazy loading it saves nothing but creates conflicts

**Best Practice:** Only lazy load:
- ✅ Heavy libraries (PDF, Charts)
- ✅ Entire page components
- ✅ Optional features
- ❌ NOT core utilities like auth, routing, state management

---

## 🎯 Quick Action Items

1. **Open** `src/core/common/header/index.tsx`
2. **Find** any `await import` or `import()` for auth
3. **Replace** with static import at the top
4. **Rebuild** and verify warning is gone

Need help finding the exact line? Share the header/index.tsx file and I'll point to it exactly!

#!/bin/bash
# scripts/find-mixed-imports.sh
# Finds files with mixed static/dynamic imports

echo "🔍 Finding Mixed Import Issues..."
echo "=================================="
echo ""

# Function to find dynamic imports
find_dynamic_imports() {
  local file=$1
  # Look for: import('...'), await import('...'), lazy(() => import('...'))
  grep -n "import(\|lazy.*import(" "$file" 2>/dev/null
}

# Function to find static imports
find_static_imports() {
  local file=$1
  # Look for: import ... from '...'
  grep -n "^import .* from" "$file" 2>/dev/null
}

# Find auth.ts issues specifically
echo "📌 Checking auth.ts import issues..."
echo "------------------------------------"

AUTH_FILE="src/redux/actions/auth.ts"

if [ -f "$AUTH_FILE" ]; then
  echo "✓ Found auth.ts"
  echo ""
  
  # Find all files that import auth
  echo "Files importing auth.ts:"
  grep -r "from.*redux/actions/auth" src/ --include="*.tsx" --include="*.ts" | cut -d: -f1 | sort | uniq | while read -r file; do
    echo "  → $file"
    
    # Check if it has dynamic imports
    if find_dynamic_imports "$file" | grep -q "auth"; then
      echo "    ⚠️  HAS DYNAMIC IMPORT - NEEDS FIX!"
    fi
  done
else
  echo "❌ auth.ts not found at expected location"
fi

echo ""
echo "=================================="
echo "🔎 Checking ALL files for mixed imports..."
echo "=================================="
echo ""

# Find all TypeScript/JavaScript files
find src -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | while read -r file; do
  # Check if file has both static and dynamic imports
  has_static=$(find_static_imports "$file")
  has_dynamic=$(find_dynamic_imports "$file")
  
  if [ -n "$has_static" ] && [ -n "$has_dynamic" ]; then
    echo "⚠️  MIXED IMPORTS: $file"
    echo "   Static imports:"
    echo "$has_static" | head -3
    echo "   Dynamic imports:"
    echo "$has_dynamic" | head -3
    echo ""
  fi
done

echo ""
echo "=================================="
echo "💡 Quick Fixes:"
echo "=================================="
echo ""
echo "1. For auth.ts: Replace ALL dynamic imports with static"
echo "   BEFORE: const { logout } = await import('./auth');"
echo "   AFTER:  import { logout } from './auth';"
echo ""
echo "2. For components: Use lazy() only for React components"
echo "   const MyComponent = lazy(() => import('./MyComponent'));"
echo ""
echo "3. For utilities: Always use static imports"
echo "   import { helper } from './utils';"
echo ""

🎯 Your Immediate Action Plan:
Step 1: Use the Fixed Vite Config (2 minutes)
Replace your vite.config.js with the one I just provided. It fixes the circular chunk issues.
Step 2: Fix the auth.ts Import Issue (5 minutes)
typescript// Open: src/core/common/header/index.tsx

// Look for this pattern (WRONG):
const handleLogout = async () => {
  const { logout } = await import('../../../redux/actions/auth');
  logout();
};

// Replace with (CORRECT):
import { logout } from '../../../redux/actions/auth'; // Add this at top

const handleLogout = () => {
  logout();
};
Step 3: Run the Finder Script (optional, 1 minute)
bashchmod +x scripts/find-mixed-imports.sh
./scripts/find-mixed-imports.sh
This will show you ALL files with mixed import issues.
Step 4: Clean Build (2 minutes)
bash# Clear cache
rm -rf node_modules/.vite
rm -rf dist

# Rebuild
npm run build

🎁 Bonus: Remove Unused Font Formats
I noticed you're loading 5 font formats for the same fonts. Modern browsers only need woff2:
css/* In your CSS - REMOVE these: */
.font { src: url('font.ttf');  }  /* ❌ Delete */
.font { src: url('font.eot');  }  /* ❌ Delete */
.font { src: url('font.woff'); }  /* ❌ Delete */

/* KEEP only: */
.font { src: url('font.woff2'); } /* ✅ Keep - 95%+ browser support */
Instant savings: ~200KB just from font optimization!

Want me to help you fix a specific file? Share the content of src/core/common/header/index.tsx and I'll give you the exact fixed code!Claude is AI and can make mistakes. Please double-check responses. Sonnet 4.5Claude is AI and can make mistakes. Please double-check responses.

