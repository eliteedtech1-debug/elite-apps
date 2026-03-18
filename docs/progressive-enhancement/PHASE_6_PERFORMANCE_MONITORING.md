# Phase 6: Performance Monitoring (Day 6 - 2 hours)

## Goal: Track performance and identify bottlenecks

---

## 6.1 Add Performance Metrics

**File:** `elscholar-ui/src/utils/performanceMonitoring.ts`

```typescript
interface PerformanceMetrics {
  ttfb: number; // Time to First Byte
  fcp: number;  // First Contentful Paint
  lcp: number;  // Largest Contentful Paint
  fid: number;  // First Input Delay
  cls: number;  // Cumulative Layout Shift
}

export function measurePerformance(): PerformanceMetrics | null {
  if (!window.performance) return null;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');

  const fcp = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

  return {
    ttfb: navigation?.responseStart - navigation?.requestStart || 0,
    fcp,
    lcp: 0, // Will be measured by observer
    fid: 0, // Will be measured by observer
    cls: 0  // Will be measured by observer
  };
}

export function observeWebVitals(callback: (metrics: Partial<PerformanceMetrics>) => void) {
  // Largest Contentful Paint
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        callback({ lcp: lastEntry.renderTime || lastEntry.loadTime });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          callback({ fid: entry.processingStart - entry.startTime });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            callback({ cls: clsValue });
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.error('Performance observer error:', e);
    }
  }
}

export function logPerformance() {
  const metrics = measurePerformance();
  if (metrics) {
    console.log('Performance Metrics:', {
      'TTFB': `${metrics.ttfb.toFixed(2)}ms`,
      'FCP': `${metrics.fcp.toFixed(2)}ms`,
    });
  }

  observeWebVitals((vitals) => {
    console.log('Web Vitals:', vitals);
  });
}
```

---

## 6.2 Track Page Load Time

**File:** `elscholar-ui/src/utils/pageLoadTracker.ts`

```typescript
export function trackPageLoad(pageName: string) {
  const startTime = performance.now();

  return () => {
    const endTime = performance.now();
    const loadTime = endTime - startTime;

    console.log(`${pageName} loaded in ${loadTime.toFixed(2)}ms`);

    // Send to analytics (optional)
    if (window.gtag) {
      window.gtag('event', 'page_load', {
        page_name: pageName,
        load_time: loadTime
      });
    }
  };
}
```

**Usage in components:**
```typescript
import { trackPageLoad } from '@/utils/pageLoadTracker';

function AdminDashboard() {
  useEffect(() => {
    const endTracking = trackPageLoad('Admin Dashboard');
    return endTracking;
  }, []);

  return <div>Dashboard</div>;
}
```

---

## 6.3 Add Bundle Size Reporter

**File:** `elscholar-ui/vite.config.js`

```javascript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ]
});
```

Install:
```bash
npm install -D rollup-plugin-visualizer
```

Run:
```bash
npm run build
# Opens stats.html showing bundle composition
```

---

## 6.4 Add Performance Budget

**File:** `elscholar-ui/performance-budget.json`

```json
{
  "budgets": [
    {
      "resourceSizes": [
        {
          "resourceType": "script",
          "budget": 500
        },
        {
          "resourceType": "total",
          "budget": 1000
        }
      ],
      "resourceCounts": [
        {
          "resourceType": "third-party",
          "budget": 10
        }
      ]
    }
  ]
}
```

---

## 6.5 Monitor in Production

**File:** `elscholar-ui/src/main.tsx`

```typescript
import { logPerformance } from './utils/performanceMonitoring';

// Log performance after app loads
window.addEventListener('load', () => {
  setTimeout(() => {
    logPerformance();
  }, 0);
});
```

---

## 6.6 Create Performance Dashboard

**File:** `elscholar-ui/src/components/PerformanceDebugger.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import { measurePerformance } from '../utils/performanceMonitoring';

const PerformanceDebugger: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const m = measurePerformance();
    setMetrics(m);
  }, []);

  if (!metrics || process.env.NODE_ENV !== 'development') return null;

  return (
    <Card title="Performance Metrics" style={{ margin: 20 }}>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic title="TTFB" value={metrics.ttfb.toFixed(2)} suffix="ms" />
        </Col>
        <Col span={8}>
          <Statistic title="FCP" value={metrics.fcp.toFixed(2)} suffix="ms" />
        </Col>
        <Col span={8}>
          <Statistic 
            title="Status" 
            value={metrics.ttfb < 200 ? 'Good' : 'Needs Work'} 
            valueStyle={{ color: metrics.ttfb < 200 ? '#3f8600' : '#cf1322' }}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default PerformanceDebugger;
```

---

## ✅ Phase 6 Checklist

- [ ] Added performance monitoring utilities
- [ ] Implemented page load tracking
- [ ] Configured bundle size reporter
- [ ] Created performance budget
- [ ] Added production monitoring
- [ ] Created performance debugger component
- [ ] Ran build and checked stats.html

**Time:** 2 hours
**Impact:** Visibility into performance issues

---

**Next:** Phase 7 - Testing & Deployment
