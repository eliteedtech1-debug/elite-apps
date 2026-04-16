# Debug Guide: Online Staff Visibility Issue

## Current Status
The fix has been applied to `elscholar-ui/src/feature-module/application/support/SupportChat.tsx` with enhanced logging.

## What to Check

### 1. Hard Refresh Your Browser
Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+F5` (Windows) to clear cache and reload.

### 2. Open Browser Console
Open DevTools (F12) and go to the Console tab.

### 3. Open the Support Chat
Click the support chat button to open it.

### 4. Look for These Logs

You should see these logs in order:

```
🎬 SupportChat component mounted - Version 17:57
🚀 OnlineStaffContext: Provider mounted, auto-initializing...
🔄 OnlineStaffContext: Initializing online staff fetching...
📞 OnlineStaffContext: fetchOnlineStaff called
🌐 OnlineStaffContext: Making API call to api/support/online-staff
✅ OnlineStaffContext: SUCCESS CALLBACK TRIGGERED
✅ OnlineStaffContext: API response: {success: true, data: Array(1)}
👥 OnlineStaffContext: Set online staff: Array(1)
🔍 Auto-show check RUNNING: {onlineStaffLength: 1, isOpen: true, showOnlineStaff: false, userHidStaff: false, onlineStaffArray: Array(1)}
✅ Setting showOnlineStaff to TRUE
🎨 Rendering Online Staff Section: {showOnlineStaff: true, onlineStaffCount: 1, onlineStaff: Array(1)}
```

## What Each Log Means

### ✅ If you see "🔍 Auto-show check RUNNING"
The useEffect is working! Check the values:
- `onlineStaffLength` should be > 0
- `isOpen` should be `true`
- `userHidStaff` should be `false`
- If all three are correct but it still doesn't show, there's a rendering issue

### ❌ If you DON'T see "🔍 Auto-show check RUNNING"
The useEffect isn't running. This means:
1. The file hasn't been recompiled (restart dev server)
2. Browser cache issue (hard refresh)
3. Wrong file is being used (check if there are multiple SupportChat files)

### ⚠️ If you see "⚠️ Conditions not met"
Check the logged conditions to see which one is failing:
- `hasStaff`: Should be `true` if agents are online
- `chatIsOpen`: Should be `true` when chat widget is open
- `userDidNotHide`: Should be `true` (user hasn't manually hidden it)

## Quick Fix Steps

1. **Stop the dev server** (Ctrl+C in terminal)
2. **Clear node_modules/.cache** (if it exists):
   ```bash
   rm -rf elscholar-ui/node_modules/.cache
   ```
3. **Restart dev server**:
   ```bash
   cd elscholar-ui && npm start
   ```
4. **Hard refresh browser** (Cmd+Shift+R)
5. **Open chat and check console**

## If Still Not Working

Check these files to ensure they're using the correct path:

1. Is `SupportChat` imported from the right location?
   ```bash
   grep -r "import.*SupportChat" elscholar-ui/src/
   ```

2. Are there multiple `SupportChat.tsx` files?
   ```bash
   find elscholar-ui -name "SupportChat.tsx"
   ```

## Expected Behavior After Fix

When you open the chat:
1. API fetches online staff (you see this working ✅)
2. useEffect detects staff are online and chat is open
3. Sets `showOnlineStaff` to `true`
4. "Online Staff" section renders with agent list

## Current Issue

Based on your logs, the API is working (returning 1 agent), but the "🔍 Auto-show check" log isn't appearing. This means either:
- The file hasn't been recompiled
- Browser is using cached version
- The component isn't re-rendering when `onlineStaff` changes

Try the Quick Fix Steps above and report back what logs you see!
