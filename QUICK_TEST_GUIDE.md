# Quick Test Guide - Week 3 Features

## 🔍 Test Global Search (2 minutes)

### Step 1: Start Servers
```bash
# Terminal 1 - Backend
cd elscholar-api
npm run dev

# Terminal 2 - Frontend
cd elscholar-ui
npm start
```

### Step 2: Open App
- Go to `http://localhost:3000`
- Login to your account

### Step 3: Find Search Bar
- Look at the header (top of page)
- You should see a search input box
- It says "Search (Ctrl+K)"

### Step 4: Test Search
**Method 1 - Click:**
- Click the search bar
- Modal opens

**Method 2 - Keyboard:**
- Press `Ctrl+K` (Windows/Linux)
- Press `Cmd+K` (Mac)
- Modal opens

### Step 5: Search Something
- Type: "john" (or any student name)
- Wait 300ms
- See results appear
- Results grouped by: Students, Staff, Payments, Classes

### Step 6: Navigate
- Click any result
- You navigate to that page
- Search modal closes

### Step 7: Recent Searches
- Open search again (Ctrl+K)
- Don't type anything
- See "Recent Searches" section
- Your previous search is saved

### Step 8: Close
- Press `ESC` key
- Or click outside modal
- Modal closes

---

## 📱 Test Mobile Responsiveness (3 minutes)

### Step 1: Open DevTools
- Press `F12` in Chrome
- Click device toolbar icon (top-left)
- Or press `Ctrl+Shift+M`

### Step 2: Select Device
- Choose "iPhone SE" from dropdown
- Screen width: 375px
- This is the smallest common phone

### Step 3: Test Dashboard
- Navigate to dashboard
- Check:
  - [ ] Stats cards stack vertically
  - [ ] Charts are visible (may scroll)
  - [ ] No horizontal scroll on page
  - [ ] Buttons are easy to tap

### Step 4: Test Student List
- Go to Students → Student List
- Check:
  - [ ] Table scrolls horizontally
  - [ ] Or shows card view
  - [ ] Filters are accessible
  - [ ] Actions buttons work

### Step 5: Test Forms
- Try to add a student
- Check:
  - [ ] Form fields stack vertically
  - [ ] Inputs are full width
  - [ ] Date picker works
  - [ ] Submit button is visible

### Step 6: Test Navigation
- Open sidebar menu
- Check:
  - [ ] Menu opens smoothly
  - [ ] Items are readable
  - [ ] Can close menu
  - [ ] Can navigate

### Step 7: Test Different Sizes
- Try these devices:
  - iPhone SE (375px) - Smallest
  - iPhone 12 (390px) - Common
  - iPad (768px) - Tablet
  - Desktop (1920px) - Large

---

## ✅ Expected Results

### Global Search:
- ✅ Search bar visible in header (desktop only)
- ✅ Ctrl+K opens modal
- ✅ Search returns results in < 1 second
- ✅ Results are grouped by type
- ✅ Click navigates correctly
- ✅ Recent searches saved
- ✅ ESC closes modal

### Mobile:
- ✅ No horizontal scroll (except tables)
- ✅ All content readable
- ✅ Buttons easy to tap (44px minimum)
- ✅ Forms work on mobile
- ✅ Navigation accessible
- ✅ Images scale properly

---

## 🐛 If Something Doesn't Work

### Search Not Showing:
1. Check browser console (F12)
2. Look for errors
3. Verify backend is running
4. Check network tab for API calls

### Search Returns No Results:
1. Check database has data
2. Verify school_id and branch_id in localStorage
3. Check backend logs
4. Test API directly: `POST /api/search/global`

### Mobile Issues:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check if mobile.css is loaded
4. Inspect element to see applied styles

### Backend Errors:
1. Check `elscholar-api/logs/` folder
2. Look for error messages
3. Verify database connection
4. Check search_routes.js is registered

---

## 📸 What You Should See

### Global Search Modal:
```
┌─────────────────────────────────────┐
│  🔍 Search students, staff...       │
│  Ctrl+K to open • ESC to close      │
├─────────────────────────────────────┤
│                                     │
│  👤 Students (3)                    │
│  • John Doe - ADM001 - JSS 1A       │
│  • Jane Smith - ADM002 - JSS 2B     │
│                                     │
│  👥 Staff (1)                       │
│  • Mr. Johnson - STF001 - Teacher   │
│                                     │
└─────────────────────────────────────┘
```

### Mobile Dashboard (375px):
```
┌─────────────────┐
│  ☰  Dashboard   │
├─────────────────┤
│ Total Students  │
│      150        │
├─────────────────┤
│ Total Staff     │
│       25        │
├─────────────────┤
│ Revenue         │
│   ₦500,000      │
├─────────────────┤
│ [Chart Scroll→] │
└─────────────────┘
```

---

## 🎯 Success Checklist

### Global Search:
- [ ] Search bar visible
- [ ] Keyboard shortcut works
- [ ] Search is fast (< 1s)
- [ ] Results appear
- [ ] Navigation works
- [ ] Recent searches saved

### Mobile:
- [ ] Works on 375px width
- [ ] No horizontal scroll
- [ ] Touch-friendly buttons
- [ ] Forms are usable
- [ ] Navigation works
- [ ] Content readable

---

## 💡 Tips

1. **Search works best with:**
   - Student names
   - Admission numbers
   - Staff names
   - Receipt numbers

2. **Mobile testing:**
   - Test on real device if possible
   - Try both portrait and landscape
   - Test with touch (not mouse)

3. **Performance:**
   - Search is debounced (300ms)
   - Results are limited (10 per type)
   - Recent searches stored locally

---

**Testing Time:** ~5 minutes  
**Difficulty:** Easy  
**Required:** Chrome browser, running servers
