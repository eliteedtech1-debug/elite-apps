// vite.config.js - MINIMAL CONFIG (Use if circular deps persist)
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(), // Use Vite's built-in vendor splitting
    visualizer({
      open: false,
      gzipSize: true,
      filename: 'dist/stats.html'
    })
  ],
  
  build: {
    chunkSizeWarningLimit: 1500, // Increase threshold temporarily
    sourcemap: false,
    
    // Minimal config - let Vite handle chunking automatically
    rollupOptions: {
      output: {
        // Simple size-based chunking
        manualChunks(id) {
          // Only split the absolutely largest libraries
          if (id.includes('node_modules')) {
            // Big libraries that MUST be separate
            if (id.includes('react-pdf') || id.includes('pdfjs-dist')) {
              return 'pdf-viewer';
            }
            
            if (id.includes('jspdf')) {
              return 'pdf-generator';
            }
            
            if (id.includes('html2canvas')) {
              return 'html2canvas';
            }
            
            if (id.includes('apexcharts')) {
              return 'apexcharts';
            }
            
            if (id.includes('echarts')) {
              return 'echarts';
            }
            
            if (id.includes('antd')) {
              return 'antd';
            }
            
            // Everything else stays in vendor
            return 'vendor';
          }
        },
        
        // Optimize chunk size - split large chunks automatically
        experimentalMinChunkSize: 20000, // 20kb minimum chunk size
      },
    },
    
    // Increase build performance
    minify: 'esbuild', // Faster than terser
    
    // CommonJS handling
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      // Optimize during dev
      target: 'es2020',
    },
  },
});

# Fix Circular Chunk Dependencies - Complete Guide

## 🔴 Your Current Errors Explained

```
Circular chunk: vendor-antd -> vendor-misc -> vendor-antd
```
**Meaning:** Ant Design depends on something in vendor-misc, which depends back on Ant Design.

```
Circular chunk: vendor-misc -> vendor-pdf -> vendor-misc
```
**Meaning:** PDF library shares dependencies with other misc packages.

---

## ✅ Solution Hierarchy (Try in Order)

### **Level 1: Use Minimal Config (EASIEST - Try First)**

Use the **"Minimal Vite Config"** artifact I just created.

**Why it works:**
- Splits only the absolutely largest libraries
- Lets Vite's automatic chunking handle the rest
- Avoids complex dependency trees

**Action:**
```bash
# Replace your vite.config.js with the minimal config
npm run build
```

**Expected result:** No circular chunk warnings, slightly larger vendor.js but working build.

---

### **Level 2: Use Simplified Config (If Level 1 still has issues)**

Use the first **"SIMPLIFIED Chunking"** config.

**Why it works:**
- Chunks by package, not by category
- Keeps related dependencies together

---

### **Level 3: Remove ALL Manual Chunking (Nuclear Option)**

If both above fail, use completely automatic chunking:

```javascript
// vite.config.js
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
  ],
  
  build: {
    chunkSizeWarningLimit: 2000, // Just suppress the warning
    rollupOptions: {
      output: {
        // NO manual chunks at all - let Vite decide everything
      },
    },
  },
});
```

**Trade-off:** Larger initial bundle, but zero circular dependency errors.

---

## 🔍 Understanding the Problem

### Why Circular Chunks Happen

```
Package A imports from Package B
    ↓
Package B imports from Package C  
    ↓
Package C imports from Package A
    ↓
CIRCULAR!
```

**Your case:**
- Ant Design (UI library) imports from utility packages
- Those utility packages import from PDF libraries
- PDF libraries import from Ant Design (for UI components)

**Solution:** Don't try to separate them - keep them together.

---

## 📊 Recommended Strategy By App Size

### Small/Medium Apps (<500 components)
**Use:** Minimal config with automatic chunking
**Result:** 2-3 large chunks, fast builds, no circular deps

### Large Apps (500-1000 components)
**Use:** Simplified config splitting only React, Ant Design, and PDF
**Result:** 5-7 chunks, good performance, manageable

### Enterprise Apps (1000+ components)
**Use:** Route-based code splitting + simplified vendor chunking
**Result:** Many small chunks, best performance, complex setup

---

## 🎯 Quick Decision Tree

```
Do you have circular chunk errors?
├─ YES → Try Minimal Config (Level 1)
│   ├─ Still errors? → Try NO manual chunks (Level 3)
│   └─ Works? → Great! Now add lazy loading for routes
│
└─ NO → Keep current config, add lazy loading
```

---

## 🛠️ Additional Optimizations (After Fixing Chunks)

### 1. Remove Duplicate Dependencies

Check for duplicate packages:

```bash
npm ls react
npm ls antd
npm ls lodash
```

If you see multiple versions, update package.json:

```json
{
  "overrides": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

### 2. Analyze Bundle Composition

```bash
npm run build
# Open dist/stats.html to see what's actually large
```

Look for:
- ❌ Duplicate libraries (same package multiple times)
- ❌ Unused dependencies (imported but never used)
- ❌ Dev dependencies in production bundle

### 3. Tree Shaking Check

Ensure your imports support tree shaking:

```javascript
// ❌ BAD - imports entire library
import _ from 'lodash';
import * as AntdIcons from '@ant-design/icons';

// ✅ GOOD - only imports what you need
import { debounce } from 'lodash-es';
import { UserOutlined, HomeOutlined } from '@ant-design/icons';
```

### 4. Remove Unused Fonts

You're loading multiple font formats. Keep only woff2:

```bash
# Find all font files
find src -name "*.ttf" -o -name "*.eot" -o -name "*.woff"

# Remove them (keep only .woff2)
```

Update CSS:

```css
/* BEFORE - multiple formats */
@font-face {
  font-family: 'Inter';
  src: url('font.eot');
  src: url('font.woff2') format('woff2'),
       url('font.woff') format('woff'),
       url('font.ttf') format('truetype');
}

/* AFTER - woff2 only */
@font-face {
  font-family: 'Inter';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* Improve loading performance */
}
```

---

## 🚀 Expected Results

### Before Optimization
```
Build time: 5 minutes
Chunks: 300+ files
Initial bundle: 2+ MB
Circular warnings: Yes
Blank screens: Possible
```

### After Level 1 (Minimal Config)
```
Build time: 3-4 minutes
Chunks: 50-100 files
Initial bundle: 1.5 MB
Circular warnings: None
Blank screens: No (if auth fixed)
```

### After Level 1 + Lazy Loading
```
Build time: 3-4 minutes  
Chunks: 100-150 files
Initial bundle: 400-600 KB ✅
Circular warnings: None
Blank screens: No
```

---

## 📝 Step-by-Step Implementation

### Phase 1: Fix Circular Chunks (Today)

1. **Backup current config**
   ```bash
   cp vite.config.js vite.config.js.backup
   ```

2. **Replace with minimal config**
   ```bash
   # Use the "Minimal Vite Config" artifact
   ```

3. **Clean build**
   ```bash
   rm -rf node_modules/.vite dist
   npm run build
   ```

4. **Verify**
   ```bash
   # Should see NO circular chunk warnings
   # Build should complete successfully
   ```

### Phase 2: Add Lazy Loading (Tomorrow)

1. **Create LazyLoadWrapper** (from earlier artifact)

2. **Lazy load ONE heavy route**
   ```javascript
   const Reports = lazy(() => import('./pages/Reports'));
   ```

3. **Test thoroughly**
   ```bash
   npm run build
   npm run preview
   # Navigate to the lazy-loaded route
   ```

4. **Gradually add more lazy routes**

### Phase 3: Optimize Assets (Day 3)

1. **Remove unused font formats**
2. **Optimize images** (use WebP format)
3. **Remove unused dependencies**
4. **Check for duplicate packages**

---

## 🆘 Emergency Rollback

If build completely breaks:

```bash
# Restore backup
cp vite.config.js.backup vite.config.js

# Clean everything
rm -rf node_modules/.vite
rm -rf dist
rm -rf node_modules

# Fresh install
npm install
npm run build
```

---

## 💡 Pro Tips

1. **Don't over-chunk** - Having 3-5 large chunks is better than 50 small chunks with circular deps

2. **Test after each change** - Don't make 10 changes at once

3. **Use build analyzer** - Visual feedback helps understand what's large
   ```bash
   npm run build
   open dist/stats.html
   ```

4. **Monitor build time** - If it increases significantly, you've gone too far

5. **Check bundle on slow network** - Test on 3G throttling in DevTools

---

## ✅ Success Checklist

- [ ] Build completes without circular chunk warnings
- [ ] No blank screens in production build
- [ ] Initial load <5 seconds on 3G
- [ ] All features work correctly
- [ ] Bundle analyzer shows reasonable distribution
- [ ] No duplicate dependencies

---

## 🎯 Your Next Steps

1. **RIGHT NOW:** Use Minimal Vite Config
2. **VERIFY:** Build succeeds without circular warnings
3. **TOMORROW:** Add lazy loading to one heavy route
4. **NEXT WEEK:** Gradually optimize further

Focus on **working builds** first, **optimization** second!

---

Need help with a specific error? Share it and I'll debug it!
# Fix Circular Chunk Dependencies - Complete Guide

## 🔴 Your Current Errors Explained

```
Circular chunk: vendor-antd -> vendor-misc -> vendor-antd
```
**Meaning:** Ant Design depends on something in vendor-misc, which depends back on Ant Design.

```
Circular chunk: vendor-misc -> vendor-pdf -> vendor-misc
```
**Meaning:** PDF library shares dependencies with other misc packages.

---

## ✅ Solution Hierarchy (Try in Order)

### **Level 1: Use Minimal Config (EASIEST - Try First)**

Use the **"Minimal Vite Config"** artifact I just created.

**Why it works:**
- Splits only the absolutely largest libraries
- Lets Vite's automatic chunking handle the rest
- Avoids complex dependency trees

**Action:**
```bash
# Replace your vite.config.js with the minimal config
npm run build
```

**Expected result:** No circular chunk warnings, slightly larger vendor.js but working build.

---

### **Level 2: Use Simplified Config (If Level 1 still has issues)**

Use the first **"SIMPLIFIED Chunking"** config.

**Why it works:**
- Chunks by package, not by category
- Keeps related dependencies together

---

### **Level 3: Remove ALL Manual Chunking (Nuclear Option)**

If both above fail, use completely automatic chunking:

```javascript
// vite.config.js
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
  ],
  
  build: {
    chunkSizeWarningLimit: 2000, // Just suppress the warning
    rollupOptions: {
      output: {
        // NO manual chunks at all - let Vite decide everything
      },
    },
  },
});
```

**Trade-off:** Larger initial bundle, but zero circular dependency errors.

---

## 🔍 Understanding the Problem

### Why Circular Chunks Happen

```
Package A imports from Package B
    ↓
Package B imports from Package C  
    ↓
Package C imports from Package A
    ↓
CIRCULAR!
```

**Your case:**
- Ant Design (UI library) imports from utility packages
- Those utility packages import from PDF libraries
- PDF libraries import from Ant Design (for UI components)

**Solution:** Don't try to separate them - keep them together.

---

## 📊 Recommended Strategy By App Size

### Small/Medium Apps (<500 components)
**Use:** Minimal config with automatic chunking
**Result:** 2-3 large chunks, fast builds, no circular deps

### Large Apps (500-1000 components)
**Use:** Simplified config splitting only React, Ant Design, and PDF
**Result:** 5-7 chunks, good performance, manageable

### Enterprise Apps (1000+ components)
**Use:** Route-based code splitting + simplified vendor chunking
**Result:** Many small chunks, best performance, complex setup

---

## 🎯 Quick Decision Tree

```
Do you have circular chunk errors?
├─ YES → Try Minimal Config (Level 1)
│   ├─ Still errors? → Try NO manual chunks (Level 3)
│   └─ Works? → Great! Now add lazy loading for routes
│
└─ NO → Keep current config, add lazy loading
```

---

## 🛠️ Additional Optimizations (After Fixing Chunks)

### 1. Remove Duplicate Dependencies

Check for duplicate packages:

```bash
npm ls react
npm ls antd
npm ls lodash
```

If you see multiple versions, update package.json:

```json
{
  "overrides": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

### 2. Analyze Bundle Composition

```bash
npm run build
# Open dist/stats.html to see what's actually large
```

Look for:
- ❌ Duplicate libraries (same package multiple times)
- ❌ Unused dependencies (imported but never used)
- ❌ Dev dependencies in production bundle

### 3. Tree Shaking Check

Ensure your imports support tree shaking:

```javascript
// ❌ BAD - imports entire library
import _ from 'lodash';
import * as AntdIcons from '@ant-design/icons';

// ✅ GOOD - only imports what you need
import { debounce } from 'lodash-es';
import { UserOutlined, HomeOutlined } from '@ant-design/icons';
```

### 4. Remove Unused Fonts

You're loading multiple font formats. Keep only woff2:

```bash
# Find all font files
find src -name "*.ttf" -o -name "*.eot" -o -name "*.woff"

# Remove them (keep only .woff2)
```

Update CSS:

```css
/* BEFORE - multiple formats */
@font-face {
  font-family: 'Inter';
  src: url('font.eot');
  src: url('font.woff2') format('woff2'),
       url('font.woff') format('woff'),
       url('font.ttf') format('truetype');
}

/* AFTER - woff2 only */
@font-face {
  font-family: 'Inter';
  src: url('font.woff2') format('woff2');
  font-display: swap; /* Improve loading performance */
}
```

---

## 🚀 Expected Results

### Before Optimization
```
Build time: 5 minutes
Chunks: 300+ files
Initial bundle: 2+ MB
Circular warnings: Yes
Blank screens: Possible
```

### After Level 1 (Minimal Config)
```
Build time: 3-4 minutes
Chunks: 50-100 files
Initial bundle: 1.5 MB
Circular warnings: None
Blank screens: No (if auth fixed)
```

### After Level 1 + Lazy Loading
```
Build time: 3-4 minutes  
Chunks: 100-150 files
Initial bundle: 400-600 KB ✅
Circular warnings: None
Blank screens: No
```

---

## 📝 Step-by-Step Implementation

### Phase 1: Fix Circular Chunks (Today)

1. **Backup current config**
   ```bash
   cp vite.config.js vite.config.js.backup
   ```

2. **Replace with minimal config**
   ```bash
   # Use the "Minimal Vite Config" artifact
   ```

3. **Clean build**
   ```bash
   rm -rf node_modules/.vite dist
   npm run build
   ```

4. **Verify**
   ```bash
   # Should see NO circular chunk warnings
   # Build should complete successfully
   ```

### Phase 2: Add Lazy Loading (Tomorrow)

1. **Create LazyLoadWrapper** (from earlier artifact)

2. **Lazy load ONE heavy route**
   ```javascript
   const Reports = lazy(() => import('./pages/Reports'));
   ```

3. **Test thoroughly**
   ```bash
   npm run build
   npm run preview
   # Navigate to the lazy-loaded route
   ```

4. **Gradually add more lazy routes**

### Phase 3: Optimize Assets (Day 3)

1. **Remove unused font formats**
2. **Optimize images** (use WebP format)
3. **Remove unused dependencies**
4. **Check for duplicate packages**

---

## 🆘 Emergency Rollback

If build completely breaks:

```bash
# Restore backup
cp vite.config.js.backup vite.config.js

# Clean everything
rm -rf node_modules/.vite
rm -rf dist
rm -rf node_modules

# Fresh install
npm install
npm run build
```

---

## 💡 Pro Tips

1. **Don't over-chunk** - Having 3-5 large chunks is better than 50 small chunks with circular deps

2. **Test after each change** - Don't make 10 changes at once

3. **Use build analyzer** - Visual feedback helps understand what's large
   ```bash
   npm run build
   open dist/stats.html
   ```

4. **Monitor build time** - If it increases significantly, you've gone too far

5. **Check bundle on slow network** - Test on 3G throttling in DevTools

---

## ✅ Success Checklist

- [ ] Build completes without circular chunk warnings
- [ ] No blank screens in production build
- [ ] Initial load <5 seconds on 3G
- [ ] All features work correctly
- [ ] Bundle analyzer shows reasonable distribution
- [ ] No duplicate dependencies

---

## 🎯 Your Next Steps

1. **RIGHT NOW:** Use Minimal Vite Config
2. **VERIFY:** Build succeeds without circular warnings
3. **TOMORROW:** Add lazy loading to one heavy route
4. **NEXT WEEK:** Gradually optimize further

Focus on **working builds** first, **optimization** second!

---

Need help with a specific error? Share it and I'll debug it!