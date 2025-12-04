# ReportGenerator Routing Example

## How to Add to Your Router

### Option 1: Using React Router (Recommended)

```typescript
// In your router file (e.g., router/index.tsx or App.tsx)

import ReportGenerator from './feature-module/academic/examinations/exam-results/ReportGenerator';

// Add this route
<Route path="/reports/:assessmentType?" element={<ReportGenerator />} />

// Usage:
// /reports → Defaults to Exam (End of Term Report)
// /reports/Exam → End of Term Report
// /reports/CA1 → CA1 Progress Report
// /reports/CA2 → CA2 Progress Report
// /reports/CA3 → CA3 Progress Report
// /reports/CA4 → CA4 Progress Report
```

### Option 2: Direct Component Usage

```typescript
// Import the component
import ReportGenerator from './feature-module/academic/examinations/exam-results/ReportGenerator';

// Use with specific assessment type
<ReportGenerator assessmentType="Exam" />
<ReportGenerator assessmentType="CA1" />
<ReportGenerator assessmentType="CA2" />
```

## Menu Integration Example

### Ant Design Menu

```tsx
import { Menu } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

<Menu.SubMenu 
  key="reports" 
  icon={<FileTextOutlined />} 
  title="Reports"
>
  <Menu.Item key="exam-report">
    <Link to="/reports/Exam">
      📊 End of Term Report
    </Link>
  </Menu.Item>
  
  <Menu.Divider />
  
  <Menu.ItemGroup title="Continuous Assessment">
    <Menu.Item key="ca1-report">
      <Link to="/reports/CA1">
        📝 CA1 Progress Report
      </Link>
    </Menu.Item>
    
    <Menu.Item key="ca2-report">
      <Link to="/reports/CA2">
        📝 CA2 Progress Report
      </Link>
    </Menu.Item>
    
    <Menu.Item key="ca3-report">
      <Link to="/reports/CA3">
        📝 CA3 Progress Report
      </Link>
    </Menu.Item>
    
    <Menu.Item key="ca4-report">
      <Link to="/reports/CA4">
        📝 CA4 Progress Report
      </Link>
    </Menu.Item>
  </Menu.ItemGroup>
</Menu.SubMenu>
```

## How It Works

### URL-Based Routing

1. **User navigates to `/reports/CA1`**
2. **ReportGenerator** reads `CA1` from URL params
3. **Validates** assessment type using `isValidAssessmentType()`
4. **Loads config** using `getReportConfig('CA1')`
5. **Routes to ClassCAReport** with `selectedCAType="CA1"`

### Component Flow

```
User clicks "CA1 Progress Report"
  ↓
Navigate to /reports/CA1
  ↓
ReportGenerator component loads
  ↓
Reads assessmentType from URL: "CA1"
  ↓
Gets config: { title: "CA1 Progress Report", isExam: false, ... }
  ↓
Renders: <ClassCAReport selectedCAType="CA1" />
  ↓
ClassCAReport displays CA1 report
```

## Migration from Old Routes

### Before (Separate Routes)

```typescript
// Old routing
<Route path="/reports/end-of-term" element={<EndOfTermReport />} />
<Route path="/reports/ca-report" element={<ClassCAReport />} />
```

### After (Unified Route)

```typescript
// New unified routing
<Route path="/reports/:assessmentType?" element={<ReportGenerator />} />

// Backward compatibility (optional)
<Route path="/reports/end-of-term" element={<Navigate to="/reports/Exam" replace />} />
<Route path="/reports/ca-report" element={<Navigate to="/reports/CA1" replace />} />
```

## Testing the Routes

### Manual Testing

1. **Test Exam Report**
   - Navigate to: `http://localhost:3000/reports/Exam`
   - Should show: End of Term Report

2. **Test CA1 Report**
   - Navigate to: `http://localhost:3000/reports/CA1`
   - Should show: CA1 Progress Report

3. **Test Default**
   - Navigate to: `http://localhost:3000/reports`
   - Should show: End of Term Report (default)

4. **Test Invalid Type**
   - Navigate to: `http://localhost:3000/reports/InvalidType`
   - Should show: Error message and redirect to Exam

### Programmatic Navigation

```typescript
import { useNavigate } from 'react-router-dom';

const MyComponent = () => {
  const navigate = useNavigate();
  
  const goToExamReport = () => {
    navigate('/reports/Exam');
  };
  
  const goToCA1Report = () => {
    navigate('/reports/CA1');
  };
  
  return (
    <div>
      <Button onClick={goToExamReport}>View Exam Report</Button>
      <Button onClick={goToCA1Report}>View CA1 Report</Button>
    </div>
  );
};
```

## Benefits of This Approach

1. ✅ **Single Route** - One route handles all assessment types
2. ✅ **Clean URLs** - `/reports/CA1` is cleaner than `/reports/ca-report?type=CA1`
3. ✅ **Type Safety** - Validates assessment types automatically
4. ✅ **Easy to Extend** - Add CA5, CA6, etc. by just adding config
5. ✅ **Backward Compatible** - Can redirect old routes to new ones

## Next Steps

1. Add the route to your router configuration
2. Update your menu to use the new routes
3. Test all assessment types
4. (Optional) Add redirects for old routes
5. Update documentation

---

**The routing is now ready to use!** 🚀
