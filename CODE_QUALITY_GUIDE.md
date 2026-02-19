# Code Quality & Documentation Guide

## 📚 Lazy Loading Pattern Documentation

### **Standard Pattern**

```typescript
// 1. Import React
import React from 'react';

// 2. Lazy load component
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// 3. Use with Suspense
function MyPage() {
  return (
    <React.Suspense fallback={<Spin size="large" />}>
      <HeavyComponent />
    </React.Suspense>
  );
}
```

### **For Named Exports**

```typescript
// Component with named exports
const { SafeApexChart } = React.lazy(() => 
  import('./Utils').then(m => ({ default: m.SafeApexChart }))
);
```

### **For Chart Libraries**

```typescript
// Recharts example
const BarChart = React.lazy(() => 
  import('recharts').then(m => ({ default: m.BarChart }))
);
const Bar = React.lazy(() => 
  import('recharts').then(m => ({ default: m.Bar }))
);
```

### **Multiple Components**

```typescript
// Wrap each in separate Suspense for better UX
<React.Suspense fallback={<Spin />}>
  <Modal1 />
</React.Suspense>

<React.Suspense fallback={<Spin />}>
  <Modal2 />
</React.Suspense>
```

---

## 🧪 Unit Testing Guide

### **Testing Lazy Loaded Components**

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import StudentParentModal from './StudentParentModal';

describe('StudentParentModal', () => {
  it('should render after loading', async () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <StudentParentModal 
          visible={true}
          student={{ admission_no: '001' }}
          onClose={() => {}}
        />
      </Suspense>
    );

    // Wait for lazy component to load
    await waitFor(() => {
      expect(screen.getByText('Attach Parent')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <StudentParentModal visible={true} />
      </Suspense>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### **Testing StudentParentModal**

```typescript
// Test file: StudentParentModal.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudentParentModal from './StudentParentModal';

const mockStudent = {
  admission_no: 'STU001',
  student_name: 'John Doe',
  parent_phone: '1234567890'
};

const mockParents = [
  { id: 1, parent_name: 'Jane Doe', phone: '1234567890' }
];

describe('StudentParentModal', () => {
  it('renders modal when visible', () => {
    render(
      <StudentParentModal
        visible={true}
        student={mockStudent}
        allParents={mockParents}
        onClose={() => {}}
        onSuccess={() => {}}
        onRefreshParents={() => {}}
      />
    );

    expect(screen.getByText('Manage Parent Information')).toBeInTheDocument();
  });

  it('switches between tabs', () => {
    render(
      <StudentParentModal
        visible={true}
        student={mockStudent}
        allParents={mockParents}
        onClose={() => {}}
        onSuccess={() => {}}
        onRefreshParents={() => {}}
      />
    );

    const createTab = screen.getByText('Create New Parent');
    fireEvent.click(createTab);

    expect(screen.getByText('Parent Name')).toBeInTheDocument();
  });

  it('calls onSuccess after attaching parent', async () => {
    const onSuccess = jest.fn();
    
    render(
      <StudentParentModal
        visible={true}
        student={mockStudent}
        allParents={mockParents}
        onClose={() => {}}
        onSuccess={onSuccess}
        onRefreshParents={() => {}}
      />
    );

    // Simulate attaching parent
    const attachButton = screen.getByText('Attach Parent');
    fireEvent.click(attachButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

---

## 📊 Performance Monitoring

### **Bundle Analysis**

```bash
# Install bundle analyzer
npm install --save-dev webpack-bundle-analyzer

# Add to vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ]
}

# Build and analyze
npm run build
```

### **Performance Metrics Collection**

```typescript
// utils/performanceMonitor.ts

export const measurePageLoad = (pageName: string) => {
  if (typeof window === 'undefined') return;

  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  const connectTime = perfData.responseEnd - perfData.requestStart;
  const renderTime = perfData.domComplete - perfData.domLoading;

  console.log(`📊 Performance Metrics for ${pageName}:`, {
    pageLoadTime: `${pageLoadTime}ms`,
    connectTime: `${connectTime}ms`,
    renderTime: `${renderTime}ms`
  });

  // Send to analytics
  if (window.gtag) {
    window.gtag('event', 'page_load', {
      page_name: pageName,
      load_time: pageLoadTime
    });
  }
};

// Usage in component
useEffect(() => {
  measurePageLoad('ClassPayments');
}, []);
```

---

## 🎨 Code Style Guide

### **Component Structure**

```typescript
// 1. Imports (grouped)
import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'antd';
import { _get, _post } from '@/utils/Helper';

// 2. Lazy imports
const HeavyComponent = React.lazy(() => import('./Heavy'));

// 3. Types/Interfaces
interface Props {
  visible: boolean;
  onClose: () => void;
}

// 4. Component
const MyComponent: React.FC<Props> = ({ visible, onClose }) => {
  // 5. State
  const [loading, setLoading] = useState(false);

  // 6. Effects
  useEffect(() => {
    // ...
  }, []);

  // 7. Handlers
  const handleSubmit = () => {
    // ...
  };

  // 8. Render
  return (
    <React.Suspense fallback={<Spin />}>
      <Modal visible={visible} onCancel={onClose}>
        {/* ... */}
      </Modal>
    </React.Suspense>
  );
};

// 9. Export
export default MyComponent;
```

### **Naming Conventions**

- **Components**: PascalCase (`StudentParentModal`)
- **Files**: PascalCase for components (`StudentParentModal.tsx`)
- **Hooks**: camelCase with `use` prefix (`useWhatsApp`)
- **Utilities**: camelCase (`formatCurrency`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)

---

## 📝 Documentation Standards

### **Component Documentation**

```typescript
/**
 * StudentParentModal - Reusable modal for managing student-parent relationships
 * 
 * Features:
 * - Attach existing parent to student
 * - Create new parent
 * - Update parent phone number
 * 
 * @param visible - Controls modal visibility
 * @param student - Student object with admission_no and student_name
 * @param allParents - Array of all available parents
 * @param onClose - Callback when modal is closed
 * @param onSuccess - Callback when operation succeeds
 * @param onRefreshParents - Callback to refresh parent list
 * 
 * @example
 * ```tsx
 * <StudentParentModal
 *   visible={isOpen}
 *   student={selectedStudent}
 *   allParents={parents}
 *   onClose={() => setIsOpen(false)}
 *   onSuccess={handleSuccess}
 *   onRefreshParents={fetchParents}
 * />
 * ```
 */
```

### **Function Documentation**

```typescript
/**
 * Generates a PDF receipt for a student payment
 * 
 * @param transaction - Payment transaction object
 * @param printType - Receipt format ('a4' | 'pos')
 * @returns Promise<Blob> - PDF blob
 * 
 * @throws {Error} If template fails to load
 * 
 * @example
 * ```ts
 * const pdf = await generateReceipt(transaction, 'a4');
 * downloadBlob(pdf, 'receipt.pdf');
 * ```
 */
async function generateReceipt(
  transaction: Transaction,
  printType: 'a4' | 'pos'
): Promise<Blob> {
  // ...
}
```

---

## 🔍 Code Review Checklist

### **Before Committing**

- [ ] No console.logs (except intentional debugging)
- [ ] No commented-out code
- [ ] Proper error handling
- [ ] Loading states for async operations
- [ ] Responsive design tested
- [ ] Accessibility attributes added
- [ ] TypeScript types defined
- [ ] No `any` types (unless necessary)
- [ ] Lazy loading for heavy components
- [ ] Suspense wrappers in place

### **Performance**

- [ ] Images optimized
- [ ] Large libraries lazy loaded
- [ ] Unnecessary re-renders prevented
- [ ] Memoization used where appropriate
- [ ] API calls debounced/throttled

### **Security**

- [ ] User input sanitized
- [ ] XSS prevention
- [ ] CSRF tokens used
- [ ] Sensitive data not logged
- [ ] API keys not exposed

---

## 🚀 Deployment Checklist

### **Pre-Deployment**

- [ ] All tests passing
- [ ] Build succeeds without warnings
- [ ] Bundle size acceptable
- [ ] Performance metrics meet targets
- [ ] Browser compatibility tested
- [ ] Mobile responsiveness verified

### **Post-Deployment**

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all features work
- [ ] Monitor user feedback
- [ ] Check analytics

---

## 📈 Continuous Improvement

### **Weekly Tasks**

- Review performance metrics
- Check error logs
- Update dependencies
- Review user feedback
- Plan improvements

### **Monthly Tasks**

- Security audit
- Performance audit
- Code quality review
- Documentation update
- Dependency updates

---

**Last Updated**: 2026-02-08
**Maintained By**: Development Team
