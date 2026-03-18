# Phase 2: Bundle Optimization (Day 2 - 4 hours)

## Goal: Reduce bundle size from 2.5MB to <500KB

---

## 2.1 Analyze Current Bundle

```bash
cd elscholar-ui
npm run build

# Check bundle size
ls -lh dist/assets/*.js
```

**Expected output:**
```
main.js - 2.5MB (TOO LARGE!)
vendor.js - 1.2MB
```

---

## 2.2 Configure Code Splitting

**File:** `elscholar-ui/vite.config.js`

Add this configuration:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'antd-vendor': ['antd', '@ant-design/icons'],
          'chart-vendor': ['recharts', 'chart.js'],
          
          // Feature chunks
          'dashboard': [
            './src/feature-module/mainMenu/adminDashboard',
            './src/feature-module/academic/teacher/teacherDashboard',
            './src/feature-module/academic/student/StudentDashboard',
            './src/feature-module/mainMenu/parentDashboard'
          ],
          'student-management': [
            './src/feature-module/peoples/students'
          ],
          'teacher-management': [
            './src/feature-module/peoples/teacher'
          ],
          'payroll': [
            './src/feature-module/payroll'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      }
    }
  }
});
```

---

## 2.3 Lazy Load Routes

**File:** `elscholar-ui/src/feature-module/router/optimized-router.tsx`

Find dashboard imports and make them lazy:

**Before:**
```typescript
import AdminDashboard from '../mainMenu/adminDashboard';
```

**After:**
```typescript
const AdminDashboard = lazy(() => import('../mainMenu/adminDashboard'));
const TeacherDashboard = lazy(() => import('../academic/teacher/teacherDashboard'));
const StudentDashboard = lazy(() => import('../academic/student/StudentDashboard'));
const ParentDashboard = lazy(() => import('../mainMenu/parentDashboard'));
```

Wrap routes in Suspense:

```typescript
<Suspense fallback={<BrandedLoader message="Loading dashboard..." />}>
  <Route path="/admin-dashboard" element={<AdminDashboard />} />
  <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
  <Route path="/student-dashboard" element={<StudentDashboard />} />
  <Route path="/parent-dashboard" element={<ParentDashboard />} />
</Suspense>
```

---

## 2.4 Remove Unused Dependencies

Check package.json for unused packages:

```bash
npm install -g depcheck
depcheck
```

Remove unused packages:
```bash
npm uninstall [unused-package]
```

---

## 2.5 Optimize Images

```bash
# Install image optimizer
npm install -D vite-plugin-imagemin

# Add to vite.config.js
import viteImagemin from 'vite-plugin-imagemin';

plugins: [
  react(),
  viteImagemin({
    gifsicle: { optimizationLevel: 7 },
    optipng: { optimizationLevel: 7 },
    mozjpeg: { quality: 80 },
    pngquant: { quality: [0.8, 0.9] },
    svgo: {
      plugins: [{ name: 'removeViewBox' }, { name: 'removeEmptyAttrs', active: false }]
    }
  })
]
```

---

## 2.6 Build and Verify

```bash
npm run build

# Check new bundle sizes
ls -lh dist/assets/*.js
```

**Target sizes:**
```
main.js - 300KB ✅
react-vendor.js - 150KB ✅
antd-vendor.js - 200KB ✅
dashboard.js - 150KB ✅
```

---

## ✅ Phase 2 Checklist

- [ ] Analyzed current bundle size
- [ ] Configured code splitting in vite.config.js
- [ ] Made all routes lazy-loaded
- [ ] Removed unused dependencies
- [ ] Optimized images
- [ ] Verified bundle size reduced to <500KB per chunk

**Time:** 4 hours
**Impact:** 80% faster load time on slow connections

---

**Next:** Phase 3 - Device Detection & Lite Mode
