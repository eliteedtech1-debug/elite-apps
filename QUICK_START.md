# 🚀 Quick Start - Unified ReportGenerator

## ⚡ 3 Steps to Get Started

### Step 1: Add the Route (2 minutes)

Find your router file (usually `router/index.tsx` or `App.tsx`) and add:

```typescript
import ReportGenerator from './feature-module/academic/examinations/exam-results/ReportGenerator';

// Add this route
<Route path="/reports/:assessmentType?" element={<ReportGenerator />} />
```

### Step 2: Update Your Menu (3 minutes)

Replace your old report menu items with:

```tsx
<Menu.SubMenu title="Reports" icon={<FileTextOutlined />}>
  <Menu.Item key="exam">
    <Link to="/reports/Exam">📊 End of Term Report</Link>
  </Menu.Item>
  <Menu.Divider />
  <Menu.ItemGroup title="Continuous Assessment">
    <Menu.Item key="ca1">
      <Link to="/reports/CA1">📝 CA1 Progress Report</Link>
    </Menu.Item>
    <Menu.Item key="ca2">
      <Link to="/reports/CA2">📝 CA2 Progress Report</Link>
    </Menu.Item>
    <Menu.Item key="ca3">
      <Link to="/reports/CA3">📝 CA3 Progress Report</Link>
    </Menu.Item>
  </Menu.ItemGroup>
</Menu.SubMenu>
```

### Step 3: Test (5 minutes)

1. Start your dev server
2. Navigate to `/reports/Exam` → Should show End of Term Report
3. Navigate to `/reports/CA1` → Should show CA1 Report with CA1 pre-selected
4. Navigate to `/reports/CA2` → Should show CA2 Report with CA2 pre-selected

**That's it! You're done!** ✅

## 🎯 What You Get

- ✅ Single route for all reports: `/reports/:type`
- ✅ Clean URLs: `/reports/CA1` instead of `/reports/ca-report?type=CA1`
- ✅ Type validation: Invalid types redirect to Exam with error
- ✅ Pre-selection: CA type is automatically selected when coming from menu
- ✅ Backward compatible: Old components still work
- ✅ Easy to extend: Add CA4, CA5, etc. by just adding config

## 📊 URL Examples

| URL | Result |
|-----|--------|
| `/reports` | End of Term Report (default) |
| `/reports/Exam` | End of Term Report |
| `/reports/CA1` | CA1 Report (CA1 pre-selected) |
| `/reports/CA2` | CA2 Report (CA2 pre-selected) |
| `/reports/CA3` | CA3 Report (CA3 pre-selected) |
| `/reports/InvalidType` | Error → Redirect to Exam |

## 🔧 Adding New Assessment Types

Want to add CA4? Just edit `config/reportConfig.ts`:

```typescript
'CA4': {
  type: 'CA4',
  title: 'CA4 Progress Report',
  apiEndpoint: 'reports/class-ca',
  queryType: 'View Class CA Report',
  columnType: 'weeks',
  releaseText: 'Release CA4 Assessment',
  releaseModalTitle: 'Release CA4 Assessment',
  releaseModalMessage: 'Are you sure you want to release CA4 assessment results?',
  icon: '📝',
  isExam: false
}
```

Then add to menu:

```tsx
<Menu.Item key="ca4">
  <Link to="/reports/CA4">📝 CA4 Progress Report</Link>
</Menu.Item>
```

**No code changes needed!** 🎉

## 🐛 Troubleshooting

### Issue: "Cannot find module './ReportGenerator'"

**Solution**: Make sure the import path is correct:
```typescript
import ReportGenerator from './feature-module/academic/examinations/exam-results/ReportGenerator';
```

### Issue: CA type not pre-selected

**Solution**: Check the URL - it should be `/reports/CA1` not `/reports/ca1` (case-sensitive)

### Issue: Error "Invalid assessment type"

**Solution**: Make sure the assessment type exists in `config/reportConfig.ts`

## 📚 More Information

- **Full Documentation**: See `REPORT_GENERATOR_COMPLETE.md`
- **Routing Examples**: See `ROUTING_EXAMPLE.md`
- **Implementation Guide**: See `IMPLEMENTATION_GUIDE.md`

## ✅ Checklist

- [ ] Added route to router
- [ ] Updated menu items
- [ ] Tested `/reports/Exam`
- [ ] Tested `/reports/CA1`
- [ ] Tested `/reports/CA2`
- [ ] Verified WhatsApp sharing works
- [ ] Verified PDF generation works
- [ ] Deployed to production

---

**Ready to go!** 🚀 The unified ReportGenerator is now active!
