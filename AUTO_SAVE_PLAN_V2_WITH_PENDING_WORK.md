# Auto-Save & Offline Plan - With Pending Work Detection

## Overview
Enhanced auto-save system with intelligent pending work detection to help teachers resume incomplete score entry sessions.

---

## Phase 1: Auto-Save (30 mins)

### 1.1 Auto-Save Timer
**Location:** `CAAssessmentSystem.tsx`

**Implementation:**
```typescript
// Add state
const [lastSaved, setLastSaved] = useState<Date | null>(null);
const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
const AUTO_SAVE_INTERVAL = 2 * 60 * 1000; // 2 minutes

// Auto-save effect
useEffect(() => {
  if (!autoSaveEnabled || Object.keys(scores).length === 0) return;
  
  const timer = setInterval(() => {
    const hasChanges = /* check if scores differ from last saved */;
    if (hasChanges) {
      bulkSaveScores(true); // Pass silent=true flag
    }
  }, AUTO_SAVE_INTERVAL);
  
  return () => clearInterval(timer);
}, [scores, autoSaveEnabled]);
```

**UI Indicator:**
- Show "Last saved: 2 minutes ago" below save button
- Show "Auto-saving..." spinner when saving
- Toggle switch to enable/disable auto-save

**Estimated Time:** 30 minutes

---

## Phase 2: LocalStorage Backup + Pending Work Detection (2 hours)

### 2.1 Save to LocalStorage on Every Change
**Purpose:** Backup scores locally + track incomplete work

**Storage Key Format:**
```typescript
`pending_scores_${classCode}_${subjectCode}_${caType}_${academicYear}_${term}`
```

**Data Structure:**
```typescript
{
  classCode: 'CLS0373',
  className: 'JSS2A',
  subjectCode: 'ENG',
  subjectName: 'English Language',
  caType: 'MOCK',
  academicYear: '2024/2025',
  term: 'Second Term',
  scores: { 'STU001|ENG': 85, 'STU002|ENG': 72 },
  lastModified: '2026-03-03T15:30:00Z',
  totalStudents: 30,
  completedCount: 2  // How many students have scores > 0
}
```

### 2.2 Pending Work Detection on Page Load
**When:** Component mounts (useEffect on initial load)

**Logic:**
1. Scan localStorage for all keys starting with `pending_scores_`
2. Parse each entry and check:
   - Has non-zero scores (completedCount > 0)
   - Not older than 24 hours
   - Not fully completed (completedCount < totalStudents)
3. Show modal with list of pending work

**UI - Pending Work Modal:**
```tsx
<Modal 
  title="📋 You have unfinished work"
  visible={pendingWork.length > 0}
  footer={null}
  closable={false}
>
  <Alert 
    message="You have unsaved scores from previous sessions" 
    type="warning" 
    showIcon 
  />
  
  <List
    dataSource={pendingWork}
    renderItem={(item) => (
      <List.Item
        actions={[
          <Button type="primary" onClick={() => restoreWork(item)}>
            Continue
          </Button>,
          <Button danger onClick={() => discardWork(item)}>
            Discard
          </Button>
        ]}
      >
        <List.Item.Meta
          avatar={<BookOutlined style={{ fontSize: 24 }} />}
          title={`${item.subjectName} - ${item.className}`}
          description={
            <>
              <div>{item.caType} | {item.term}</div>
              <div className="text-muted">
                {item.completedCount} of {item.totalStudents} students • 
                Last edited: {formatDistanceToNow(new Date(item.lastModified))} ago
              </div>
            </>
          }
        />
      </List.Item>
    )}
  />
  
  <Button block onClick={dismissAll}>
    I'll do this later
  </Button>
</Modal>
```

### 2.3 Restore Work Flow
**When user clicks "Continue":**
```typescript
const restoreWork = (pendingItem) => {
  // 1. Set form selections
  setSelectedClass(pendingItem.classCode);
  setSelectedSubject(pendingItem.subjectCode);
  setSelectedCAType(pendingItem.caType);
  
  // 2. Load scores
  setScores(pendingItem.scores);
  
  // 3. Close modal
  setPendingWorkModal(false);
  
  // 4. Show success message
  message.success(`Restored ${pendingItem.completedCount} scores for ${pendingItem.subjectName}`);
  
  // 5. Scroll to score entry table
  setTimeout(() => {
    document.getElementById('score-entry-table')?.scrollIntoView({ behavior: 'smooth' });
  }, 500);
};
```

### 2.4 Auto-Save to LocalStorage
**Trigger:** Every time `scores` state changes

```typescript
useEffect(() => {
  if (!selectedClass || !selectedSubject || !selectedCAType) return;
  
  const nonZeroScores = Object.values(scores).filter(s => s > 0).length;
  
  // Only save if there are actual scores
  if (nonZeroScores > 0) {
    const storageKey = `pending_scores_${selectedClass}_${selectedSubject}_${selectedCAType}_${academicYear}_${term}`;
    
    const data = {
      classCode: selectedClass,
      className: allAvailableClasses.find(c => c.class_code === selectedClass)?.class_name,
      subjectCode: selectedSubject,
      subjectName: subjects.find(s => s.subject_code === selectedSubject)?.subject,
      caType: selectedCAType,
      academicYear,
      term,
      scores,
      lastModified: new Date().toISOString(),
      totalStudents: studentSubjectData.length,
      completedCount: nonZeroScores
    };
    
    localStorage.setItem(storageKey, JSON.stringify(data));
  }
}, [scores, selectedClass, selectedSubject, selectedCAType]);
```

### 2.5 Clear LocalStorage After Successful Save
```typescript
const bulkSaveScores = () => {
  // ... existing save logic ...
  
  _post('api/mock-exams/submit-scores', payload, (response) => {
    if (response.success) {
      // Clear from localStorage
      const storageKey = `pending_scores_${selectedClass}_${selectedSubject}_${selectedCAType}_${academicYear}_${term}`;
      localStorage.removeItem(storageKey);
      
      message.success('Scores saved successfully!');
    }
  });
};
```

### 2.6 Cleanup Stale Data
**When:** On component mount

```typescript
useEffect(() => {
  // Remove entries older than 24 hours
  const now = new Date();
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('pending_scores_')) continue;
    
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      const age = now.getTime() - new Date(data.lastModified).getTime();
      
      if (age > MAX_AGE_MS) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      localStorage.removeItem(key);
    }
  }
}, []);
```

**Estimated Time:** 2 hours

---

## Phase 3: Smart Notifications (30 mins)

### 3.1 Badge on Navigation Menu
**Show pending count on sidebar:**
```tsx
<Menu.Item icon={<FileTextOutlined />}>
  Assessment Form
  {pendingCount > 0 && (
    <Badge count={pendingCount} style={{ marginLeft: 8 }} />
  )}
</Menu.Item>
```

### 3.2 Dashboard Widget
**On teacher dashboard:**
```tsx
<Card title="⚠️ Pending Work" extra={<Link to="/academic/assessments">View All</Link>}>
  {pendingWork.slice(0, 3).map(item => (
    <div key={item.storageKey} className="pending-item">
      <strong>{item.subjectName} - {item.className}</strong>
      <div className="text-muted">
        {item.completedCount}/{item.totalStudents} students • {item.caType}
      </div>
    </div>
  ))}
</Card>
```

**Estimated Time:** 30 mins

---

## Phase 4: Offline Queue (2-3 hours)

### 4.1 IndexedDB for Offline Storage
**Purpose:** Store scores when offline, sync when back online

**Technology:** Use `idb` library (lightweight IndexedDB wrapper)

**Database Schema:**
```typescript
{
  storeName: 'pending_scores',
  keyPath: 'id',
  indexes: [
    { name: 'timestamp', keyPath: 'timestamp' },
    { name: 'status', keyPath: 'status' }
  ]
}
```

### 4.2 Offline Detection
```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### 4.3 Save Logic
```typescript
const saveScores = async (scores, metadata) => {
  if (isOnline) {
    try {
      await _post('api/mock-exams/submit-scores', { scores, ...metadata });
      await clearPendingScores(metadata);
    } catch (error) {
      await savePendingScores(scores, metadata);
      message.warning('Saved offline. Will sync when connection restored.');
    }
  } else {
    await savePendingScores(scores, metadata);
    message.info('Offline mode: Scores saved locally');
  }
};
```

### 4.4 Background Sync
```typescript
useEffect(() => {
  if (isOnline) {
    syncPendingScores();
  }
}, [isOnline]);

const syncPendingScores = async () => {
  const pending = await getPendingScores();
  
  for (const record of pending) {
    try {
      await _post('api/mock-exams/submit-scores', record);
      await markAsSynced(record.id);
      message.success(`Synced ${record.scores.length} scores`);
    } catch (error) {
      await incrementRetryCount(record.id);
      if (record.retryCount > 3) {
        message.error(`Failed to sync scores. Please try manually.`);
      }
    }
  }
};
```

**Estimated Time:** 2-3 hours

---

## Phase 5: UI Enhancements (1 hour)

### 5.1 Status Indicators
```tsx
<div className="d-flex align-items-center gap-2">
  <Badge color={isOnline ? 'success' : 'warning'}>
    {isOnline ? '🟢 Online' : '🟡 Offline'}
  </Badge>
  
  {autoSaving && <Spin size="small" />}
  {lastSaved && (
    <small className="text-muted">
      Last saved: {formatDistanceToNow(lastSaved)} ago
    </small>
  )}
  
  {pendingCount > 0 && (
    <Badge count={pendingCount} title="Pending sync">
      <CloudUploadOutlined />
    </Badge>
  )}
</div>
```

### 5.2 Settings Panel
```tsx
<div className="auto-save-settings">
  <Switch 
    checked={autoSaveEnabled} 
    onChange={setAutoSaveEnabled}
  />
  <span>Auto-save every 2 minutes</span>
  
  <Button onClick={syncPendingScores} disabled={!isOnline || pendingCount === 0}>
    Sync Now ({pendingCount})
  </Button>
</div>
```

**Estimated Time:** 1 hour

---

## Phase 6: Testing (1 hour)

### Test Scenarios for Pending Work:
1. ✅ Enter 5 scores → Close tab → Reopen → Verify modal shows
2. ✅ Click "Continue" → Verify form pre-filled with correct class/subject
3. ✅ Click "Continue" → Verify scores restored in table
4. ✅ Click "Discard" → Verify localStorage cleared
5. ✅ Multiple pending items → Verify all shown in modal
6. ✅ 25-hour old data → Verify auto-cleaned
7. ✅ Save scores → Verify localStorage cleared
8. ✅ Enter 0 scores → Verify NOT saved to localStorage

### Additional Scenarios:
9. ✅ Enter scores → Wait 2 mins → Verify auto-save
10. ✅ Enter scores → Go offline → Verify saved to IndexedDB
11. ✅ Offline scores → Go online → Verify auto-sync
12. ✅ Multiple tabs → Verify no conflicts
13. ✅ Network timeout → Verify fallback to offline

**Estimated Time:** 1 hour

---

## Updated Implementation Priority

### Phase 1: Must Have (3 hours)
- ✅ Auto-save every 2 minutes
- ✅ LocalStorage backup on every change
- ✅ **Pending work detection on page load**
- ✅ **Restore modal with "Continue" button**
- ✅ **Auto-populate form when restoring**
- ✅ Clear localStorage after successful save
- ✅ Cleanup stale data (>24 hours)

### Phase 2: Should Have (2-3 hours)
- ✅ Offline detection
- ✅ IndexedDB queue
- ✅ Background sync

### Phase 3: Nice to Have (1.5 hours)
- ✅ Badge on menu
- ✅ Dashboard widget
- ✅ UI indicators

---

## Updated Total Time
- **Phase 1 (Must Have):** 3 hours
- **Phase 2 (Should Have):** 2-3 hours
- **Phase 3 (Nice to Have):** 1.5 hours
- **Total:** 6.5-7.5 hours

---

## Key Features Summary

### Teacher Experience:
1. **Enters scores** → Auto-saved to localStorage every keystroke
2. **Closes browser** → Data safe in localStorage
3. **Returns next day** → Modal shows: "Continue with English JSS2? (5 of 30 students)"
4. **Clicks Continue** → Form pre-filled, scores restored, ready to continue
5. **Completes & saves** → localStorage cleared automatically

### Safety Features:
- ✅ Never lose work (localStorage backup)
- ✅ Clear reminder of incomplete work
- ✅ One-click restore
- ✅ Auto-cleanup of old data
- ✅ Works offline

---

## Dependencies
```json
{
  "idb": "^7.1.1",
  "date-fns": "^2.30.0"
}
```

---

## Files to Create/Modify
1. `CAAssessmentSystem.tsx` - Main implementation
2. `utils/pendingWorkManager.ts` - Pending work detection
3. `utils/offlineStorage.ts` - IndexedDB helpers
4. `utils/syncManager.ts` - Sync logic
5. `package.json` - Add dependencies

---

## Next Steps
Start with **Phase 1 (Must Have)** - 3 hours of work that delivers:
- Auto-save functionality
- Pending work detection
- One-click restore
- Never lose work again
