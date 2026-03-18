# Auto-Save & Offline Score Entry - Implementation Plan

## Overview
Implement auto-save functionality with offline support for CA/Mock exam score entry to prevent data loss due to network issues or user forgetfulness.

---

## Phase 1: Auto-Save (Simple - 30 mins)

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
    // Only save if there are unsaved changes
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

## Phase 2: Local Storage Backup (Medium - 1 hour)

### 2.1 Save to LocalStorage on Every Change
**Purpose:** Backup scores locally to survive page refresh/browser crash

**Implementation:**
```typescript
// Save to localStorage on score change
useEffect(() => {
  if (selectedClass && selectedSubject && selectedCAType) {
    const storageKey = `scores_${selectedClass}_${selectedSubject}_${selectedCAType}_${academicYear}_${term}`;
    localStorage.setItem(storageKey, JSON.stringify({
      scores,
      timestamp: new Date().toISOString(),
      metadata: { selectedClass, selectedSubject, selectedCAType, academicYear, term }
    }));
  }
}, [scores]);

// Load from localStorage on mount
useEffect(() => {
  const storageKey = `scores_${selectedClass}_${selectedSubject}_${selectedCAType}_${academicYear}_${term}`;
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    const { scores: savedScores, timestamp } = JSON.parse(saved);
    // Show prompt: "Found unsaved work from [timestamp]. Restore?"
    // If yes, setScores(savedScores)
  }
}, [selectedClass, selectedSubject, selectedCAType]);
```

**UI:**
- Toast notification: "Found unsaved scores from 10 minutes ago. [Restore] [Discard]"
- Clear localStorage after successful save

**Estimated Time:** 1 hour

---

## Phase 3: Offline Queue (Advanced - 2-3 hours)

### 3.1 IndexedDB for Offline Storage
**Purpose:** Store scores when offline, sync when back online

**Technology:** Use `idb` library (lightweight IndexedDB wrapper)

**Database Schema:**
```typescript
// IndexedDB structure
{
  storeName: 'pending_scores',
  keyPath: 'id',
  indexes: [
    { name: 'timestamp', keyPath: 'timestamp' },
    { name: 'status', keyPath: 'status' } // 'pending', 'syncing', 'synced', 'failed'
  ]
}

// Record structure
{
  id: 'uuid',
  class_code: 'CLS0373',
  subject_code: 'MATH',
  ca_type: 'MOCK',
  academic_year: '2024/2025',
  term: 'First Term',
  scores: [...],
  timestamp: '2026-03-03T15:00:00Z',
  status: 'pending',
  retryCount: 0
}
```

### 3.2 Offline Detection
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

### 3.3 Save Logic
```typescript
const saveScores = async (scores, metadata) => {
  if (isOnline) {
    // Try to save to server
    try {
      await _post('api/mock-exams/submit-scores', { scores, ...metadata });
      // Success - clear from IndexedDB if exists
      await clearPendingScores(metadata);
    } catch (error) {
      // Failed - save to IndexedDB
      await savePendingScores(scores, metadata);
      message.warning('Saved offline. Will sync when connection restored.');
    }
  } else {
    // Offline - save to IndexedDB
    await savePendingScores(scores, metadata);
    message.info('Offline mode: Scores saved locally');
  }
};
```

### 3.4 Background Sync
```typescript
// Sync pending scores when back online
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
        message.error(`Failed to sync scores for ${record.class_code}. Please try manually.`);
      }
    }
  }
};
```

**Estimated Time:** 2-3 hours

---

## Phase 4: UI Enhancements (1 hour)

### 4.1 Status Indicators
```tsx
<div className="d-flex align-items-center gap-2">
  {/* Online/Offline indicator */}
  <Badge color={isOnline ? 'success' : 'warning'}>
    {isOnline ? '🟢 Online' : '🟡 Offline'}
  </Badge>
  
  {/* Auto-save status */}
  {autoSaving && <Spin size="small" />}
  {lastSaved && (
    <small className="text-muted">
      Last saved: {formatDistanceToNow(lastSaved)} ago
    </small>
  )}
  
  {/* Pending sync count */}
  {pendingCount > 0 && (
    <Badge count={pendingCount} title="Pending sync">
      <CloudUploadOutlined />
    </Badge>
  )}
</div>
```

### 4.2 Settings Panel
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

## Phase 5: Testing & Edge Cases (1 hour)

### 5.1 Test Scenarios
1. ✅ Enter scores → Wait 2 mins → Verify auto-save
2. ✅ Enter scores → Go offline → Verify saved to IndexedDB
3. ✅ Offline scores → Go online → Verify auto-sync
4. ✅ Refresh page → Verify localStorage restore prompt
5. ✅ Multiple tabs → Verify no conflicts
6. ✅ Network timeout → Verify fallback to offline
7. ✅ Partial save failure → Verify retry logic

### 5.2 Edge Cases
- **Conflict resolution:** Server has newer data than local
- **Storage limits:** IndexedDB quota exceeded
- **Multiple devices:** Same teacher on 2 devices
- **Tab sync:** BroadcastChannel for cross-tab communication

**Estimated Time:** 1 hour

---

## Implementation Priority

### Must Have (Phase 1 + 2)
- ✅ Auto-save every 2 minutes
- ✅ LocalStorage backup
- ✅ Restore prompt on page load
- **Total Time:** 1.5 hours

### Should Have (Phase 3)
- ✅ Offline detection
- ✅ IndexedDB queue
- ✅ Background sync
- **Total Time:** 2-3 hours

### Nice to Have (Phase 4 + 5)
- ✅ UI indicators
- ✅ Manual sync button
- ✅ Comprehensive testing
- **Total Time:** 2 hours

---

## Total Estimated Time
- **Minimum (Phase 1-2):** 1.5 hours
- **Full Implementation:** 5-7 hours

---

## Dependencies
```json
{
  "idb": "^7.1.1",  // IndexedDB wrapper
  "date-fns": "^2.30.0"  // For "2 minutes ago" formatting
}
```

---

## Files to Modify
1. `CAAssessmentSystem.tsx` - Main implementation
2. `package.json` - Add dependencies
3. Create `utils/offlineStorage.ts` - IndexedDB helpers
4. Create `utils/syncManager.ts` - Sync logic

---

## Next Steps
1. **Start with Phase 1** (auto-save) - Quick win, immediate value
2. **Add Phase 2** (localStorage) - Prevents data loss on refresh
3. **Evaluate need for Phase 3** - Only if offline usage is common
