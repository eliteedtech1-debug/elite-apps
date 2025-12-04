# WhatsApp Global State Management - Documentation

## Overview

This documentation explains the global WhatsApp connection state management system implemented in the ElScholar application. The system ensures consistent WhatsApp connection status across all pages and components.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Architecture](#solution-architecture)
3. [Implementation Details](#implementation-details)
4. [Usage Guide](#usage-guide)
5. [API Reference](#api-reference)
6. [Components](#components)
7. [Examples](#examples)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Problem Statement

### Before Global State:

**Issues:**
- WhatsApp connection status was managed locally in each component
- Inconsistent status across different pages
- Users had to re-connect on each page
- No centralized way to check connection status
- Duplicate code for status checking in multiple components

**Example Problems:**
1. User connects WhatsApp in Communication Setup
2. Navigates to Bill Classes page
3. WhatsApp shows as "Not Connected" even though it's actually connected
4. User has to check status manually or gets error when trying to send messages

---

## Solution Architecture

### Global State Management with React Context

We implemented a **WhatsApp Context Provider** that:

1. ✅ Maintains single source of truth for WhatsApp connection status
2. ✅ Automatically checks connection status on app load
3. ✅ Provides hooks for any component to access status
4. ✅ Auto-refreshes status every 5 minutes
5. ✅ Persists connection (WhatsApp Web.js handles session storage)
6. ✅ Updates status globally when user connects/disconnects

### Architecture Diagram:

```
┌─────────────────────────────────────────────────────┐
│  React App (index.tsx)                              │
│  ┌───────────────────────────────────────────────┐  │
│  │  WhatsAppProvider (Global Context)            │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │  State:                                  │  │  │
│  │  │  - isConnected: boolean                  │  │  │
│  │  │  - phoneNumber: string | null            │  │  │
│  │  │  - isChecking: boolean                   │  │  │
│  │  │  - lastChecked: Date | null              │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  │                                                 │  │
│  │  Methods:                                       │  │
│  │  - checkStatus()                                │  │
│  │  - setConnectionStatus()                        │  │
│  └───────────────────────────────────────────────┘  │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │Communication │  │ BillClasses  │  │ Any Page  │  │
│  │    Setup     │  │              │  │           │  │
│  │              │  │              │  │           │  │
│  │ useWhatsApp()│  │ useWhatsApp()│  │useWhatsApp│  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Details

### File Structure:

```
elscholar-ui/src/
├── contexts/
│   └── WhatsAppContext.tsx         # Global WhatsApp context and provider
├── components/
│   └── WhatsAppStatusIndicator.tsx # Reusable status indicator component
└── index.tsx                        # Wrap app with WhatsAppProvider
```

### Key Files:

#### 1. **WhatsAppContext.tsx** - Global State Manager

**Location:** `/src/contexts/WhatsAppContext.tsx`

**Purpose:** Manages global WhatsApp connection state

**Features:**
- Checks WhatsApp status on mount
- Auto-refreshes every 5 minutes
- Provides `useWhatsApp()` hook
- Handles connection/disconnection
- Persists across page navigation

**State:**
```typescript
interface WhatsAppContextType {
  isConnected: boolean;           // Connection status
  phoneNumber: string | null;     // Connected phone number
  isChecking: boolean;            // Loading state during check
  checkStatus: () => Promise<void>; // Manual status check
  setConnectionStatus: (connected: boolean, phone?: string | null) => void;
  lastChecked: Date | null;       // Last check timestamp
}
```

**Auto-Refresh Logic:**
```typescript
// Auto-refresh status every 5 minutes if subscription is active
useEffect(() => {
  if (!school?.whatsapp_subscription) return;

  const interval = setInterval(() => {
    checkStatus();
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(interval);
}, [school?.whatsapp_subscription, checkStatus]);
```

---

#### 2. **index.tsx** - App Wrapper

**Changes Made:**

```typescript
import { WhatsAppProvider } from "./contexts/WhatsAppContext";

root.render(
  <Provider store={store}>
    <BrowserRouter>
      <SessionProvider>
        <WhatsAppProvider>  {/* ✅ Added here */}
          <ToastContainer />
          <Suspense fallback={<BrandedLoader />}>
            <OnlineStaffProvider>
              <ALLRoutes />
              <SupportChatIntegration />
            </OnlineStaffProvider>
          </Suspense>
        </WhatsAppProvider>
      </SessionProvider>
    </BrowserRouter>
  </Provider>
);
```

**Provider Order:**
1. Redux Provider
2. Router
3. Session Provider
4. **WhatsAppProvider** ← New addition
5. Other providers

---

#### 3. **WhatsAppStatusIndicator.tsx** - Reusable Component

**Location:** `/src/components/WhatsAppStatusIndicator.tsx`

**Purpose:** Reusable component to display WhatsApp status anywhere in the app

**Features:**
- Shows connection status with color-coded tags
- Optional phone number display
- Loading state indicator
- Tooltips with last checked time
- Customizable size and style

---

## Usage Guide

### Basic Usage in Any Component:

```typescript
import { useWhatsApp } from '../../contexts/WhatsAppContext';

const MyComponent = () => {
  const {
    isConnected,
    phoneNumber,
    isChecking,
    checkStatus
  } = useWhatsApp();

  return (
    <div>
      {isConnected ? (
        <p>WhatsApp Connected: {phoneNumber}</p>
      ) : (
        <p>WhatsApp Not Connected</p>
      )}
    </div>
  );
};
```

---

### Using the Status Indicator Component:

```typescript
import WhatsAppStatusIndicator from '../../components/WhatsAppStatusIndicator';

const MyPage = () => {
  return (
    <div>
      <h1>My Page</h1>

      {/* Default usage */}
      <WhatsAppStatusIndicator />

      {/* Without phone number */}
      <WhatsAppStatusIndicator showPhoneNumber={false} />

      {/* Small size */}
      <WhatsAppStatusIndicator size="small" />

      {/* Without icon */}
      <WhatsAppStatusIndicator showIcon={false} />
    </div>
  );
};
```

---

### Checking Connection Before Sending Messages:

**Example from BillClasses.tsx:**

```typescript
import { useWhatsApp } from '../../../contexts/WhatsAppContext';

const BillClasses = () => {
  const { isConnected: whatsappConnected } = useWhatsApp();

  const handleSendWhatsAppDirect = async (student: Student) => {
    // ✅ Check if WhatsApp is connected
    if (!whatsappConnected) {
      toast.error("WhatsApp is not connected. Please go to Communication Setup to connect your WhatsApp account.");
      return;
    }

    // Proceed with sending...
  };

  return (
    <Button onClick={() => handleSendWhatsAppDirect(student)}>
      Send WhatsApp
    </Button>
  );
};
```

---

### Updating Connection Status After Connect/Disconnect:

**Example from CommunicationSetup.tsx:**

```typescript
import { useWhatsApp } from '../../contexts/WhatsAppContext';

const CommunicationSetup = () => {
  const {
    isConnected,
    phoneNumber,
    checkStatus,
    setConnectionStatus
  } = useWhatsApp();

  const handleDisconnect = () => {
    _post("api/whatsapp/disconnect", { school_id }, (res) => {
      if (res.success) {
        // ✅ Update global context
        setConnectionStatus(false, null);
        message.success("Disconnected successfully");
      }
    });
  };

  const handleConnected = () => {
    // ✅ Refresh status to get connected phone number
    checkStatus();
  };

  return (
    <div>
      <WhatsAppConnection
        visible={modalVisible}
        onConnected={handleConnected}
      />
    </div>
  );
};
```

---

## API Reference

### `useWhatsApp()` Hook

Returns the WhatsApp context with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | Current connection status |
| `phoneNumber` | `string \| null` | Connected phone number (e.g., "2348012345678") |
| `isChecking` | `boolean` | True when checking status (loading state) |
| `lastChecked` | `Date \| null` | Timestamp of last status check |
| `checkStatus` | `() => Promise<void>` | Manually trigger status check |
| `setConnectionStatus` | `(connected: boolean, phone?: string \| null) => void` | Manually update status |

---

### `WhatsAppStatusIndicator` Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showIcon` | `boolean` | `true` | Show WhatsApp icon before status |
| `showPhoneNumber` | `boolean` | `true` | Show connected phone number |
| `size` | `'small' \| 'default'` | `'default'` | Tag size |
| `style` | `React.CSSProperties` | `undefined` | Custom inline styles |

---

## Components

### Components Updated to Use Global State:

1. **CommunicationSetup.tsx**
   - Removed local state (`whatsappConnected`, `whatsappPhoneNumber`, `checkingWhatsappStatus`)
   - Now uses `useWhatsApp()` hook
   - Updates global context on connect/disconnect

2. **BillClasses.tsx**
   - Added `useWhatsApp()` hook
   - Checks `isConnected` before sending WhatsApp messages
   - Shows error message with guidance if not connected

3. **Any Future Component**
   - Can import and use `useWhatsApp()` hook immediately
   - No need to manage local state or API calls

---

## Examples

### Example 1: Simple Status Display

```typescript
import { useWhatsApp } from '../contexts/WhatsAppContext';

const Header = () => {
  const { isConnected, phoneNumber } = useWhatsApp();

  return (
    <div className="header">
      <h1>Dashboard</h1>
      {isConnected && (
        <span className="whatsapp-status">
          WhatsApp: {phoneNumber}
        </span>
      )}
    </div>
  );
};
```

---

### Example 2: Conditional Rendering Based on Connection

```typescript
const MessagingFeature = () => {
  const { isConnected } = useWhatsApp();

  if (!isConnected) {
    return (
      <Alert
        type="warning"
        message="WhatsApp Not Connected"
        description="Please connect WhatsApp in Communication Setup to use this feature."
        action={
          <Link to="/settings/communication">
            <Button type="primary">Connect Now</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      {/* Messaging UI */}
    </div>
  );
};
```

---

### Example 3: Manual Status Check with Loading State

```typescript
const WhatsAppSettings = () => {
  const { isChecking, checkStatus } = useWhatsApp();

  return (
    <Button
      onClick={checkStatus}
      loading={isChecking}
      icon={<ReloadOutlined />}
    >
      Refresh Status
    </Button>
  );
};
```

---

### Example 4: Using Status Indicator in Different Places

```typescript
// In a header
<Header>
  <WhatsAppStatusIndicator size="small" />
</Header>

// In a settings panel
<Card title="WhatsApp Status">
  <WhatsAppStatusIndicator showPhoneNumber={true} />
</Card>

// In a messaging page
<Alert
  message={<WhatsAppStatusIndicator showIcon={false} />}
  type="info"
/>
```

---

## Best Practices

### ✅ DO:

1. **Use the Global Hook**
   ```typescript
   const { isConnected } = useWhatsApp();
   ```

2. **Check Connection Before Sending**
   ```typescript
   if (!isConnected) {
     toast.error("Please connect WhatsApp first");
     return;
   }
   ```

3. **Update Global State After Connect/Disconnect**
   ```typescript
   setConnectionStatus(true, phoneNumber);
   ```

4. **Use Status Indicator Component**
   ```typescript
   <WhatsAppStatusIndicator />
   ```

5. **Trust the Auto-Refresh**
   - Status automatically refreshes every 5 minutes
   - No need to manually check on every page

---

### ❌ DON'T:

1. **Don't Create Local State**
   ```typescript
   // ❌ Bad
   const [whatsappConnected, setWhatsappConnected] = useState(false);

   // ✅ Good
   const { isConnected } = useWhatsApp();
   ```

2. **Don't Make Direct API Calls for Status**
   ```typescript
   // ❌ Bad
   _get('api/whatsapp/status', (res) => { ... });

   // ✅ Good
   const { checkStatus } = useWhatsApp();
   checkStatus();
   ```

3. **Don't Forget to Check Connection**
   ```typescript
   // ❌ Bad - sends without checking
   sendWhatsAppMessage(phone, message);

   // ✅ Good - checks first
   if (!isConnected) {
     toast.error("WhatsApp not connected");
     return;
   }
   sendWhatsAppMessage(phone, message);
   ```

---

## Troubleshooting

### Issue 1: Status Not Updating Across Pages

**Symptom:** Connection status shows differently on different pages

**Cause:** Component not using global context

**Solution:**
```typescript
// Make sure you're using the hook
import { useWhatsApp } from '../contexts/WhatsAppContext';

const { isConnected } = useWhatsApp();
```

---

### Issue 2: Status Shows "Not Connected" After Connecting

**Symptom:** User connects WhatsApp but status doesn't update

**Cause:** Global context not updated after connection

**Solution:**
```typescript
// In WhatsAppConnection modal's onConnected callback
const { checkStatus } = useWhatsApp();

onConnected={() => {
  checkStatus(); // ✅ Refresh global status
}}
```

---

### Issue 3: "useWhatsApp must be used within WhatsAppProvider"

**Symptom:** Error thrown when using `useWhatsApp()`

**Cause:** Component is outside the WhatsAppProvider

**Solution:** Ensure WhatsAppProvider wraps your app in `index.tsx`:
```typescript
<WhatsAppProvider>
  <App />
</WhatsAppProvider>
```

---

### Issue 4: Connection Status Keeps Resetting

**Symptom:** User has to reconnect frequently

**Cause:** WhatsApp session not persisting (backend issue)

**Solution:**
1. Check backend WhatsApp service is using LocalAuth
2. Ensure `.wwebjs_auth` folder has correct permissions
3. Verify Chrome/Puppeteer is installed correctly

**Backend Check:**
```javascript
// In whatsappService.js
new Client({
  authStrategy: new LocalAuth({
    clientId: `school_${sanitizedId}`,
    dataPath: this.sessionPath // ✅ Must persist
  })
})
```

---

## Migration Guide

### Migrating Existing Components:

**Before:**
```typescript
const MyComponent = () => {
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkStatus = () => {
    setChecking(true);
    _get('api/whatsapp/status', (res) => {
      setWhatsappConnected(res.connected);
      setWhatsappPhone(res.phoneNumber);
      setChecking(false);
    });
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return <div>{whatsappConnected ? 'Connected' : 'Not Connected'}</div>;
};
```

**After:**
```typescript
import { useWhatsApp } from '../contexts/WhatsAppContext';

const MyComponent = () => {
  const {
    isConnected: whatsappConnected,
    phoneNumber: whatsappPhone,
    isChecking: checking
  } = useWhatsApp();

  // No need for useEffect, checkStatus, or local state!

  return <div>{whatsappConnected ? 'Connected' : 'Not Connected'}</div>;
};
```

---

## Performance Considerations

### Auto-Refresh Interval:

- **Current:** 5 minutes
- **Reason:** Balance between fresh status and API load
- **Customization:** Edit `WhatsAppContext.tsx` line ~75

```typescript
// Adjust interval as needed
const interval = setInterval(() => {
  checkStatus();
}, 5 * 60 * 1000); // 5 minutes
```

### API Call Optimization:

- Status is checked once on app load
- Subsequent checks only on:
  - Auto-refresh interval (5 min)
  - Manual checkStatus() calls
  - After connect/disconnect actions

**No redundant API calls** - status is shared globally!

---

## Summary

### What Was Achieved:

✅ **Single Source of Truth** - One global state for WhatsApp connection
✅ **Automatic Status Checks** - On app load and every 5 minutes
✅ **Persistent Connection** - Session saved by WhatsApp Web.js
✅ **Consistent UI** - Status synchronized across all pages
✅ **Easy Integration** - One-line hook: `useWhatsApp()`
✅ **Reusable Components** - WhatsAppStatusIndicator
✅ **Better UX** - Users don't need to reconnect on every page

### Benefits:

1. **For Developers:**
   - Less code duplication
   - Easier to maintain
   - Consistent API usage
   - Type-safe with TypeScript

2. **For Users:**
   - Connect once, use everywhere
   - Consistent experience
   - Clear error messages
   - Real-time status updates

---

## Next Steps

### Recommended Enhancements:

1. **Add to More Pages:**
   - Parent List page
   - Student Details page
   - Messaging pages

2. **Status Notifications:**
   - Show toast when connection drops
   - Alert user to reconnect

3. **Connection Analytics:**
   - Track connection uptime
   - Log disconnection events
   - Monitor connection reliability

4. **Reconnection Automation:**
   - Auto-reconnect on session restore
   - Retry connection on failure

---

**Last Updated:** 2025-01-08
**Version:** 1.0
**Author:** ElScholar Development Team
**Status:** ✅ Complete and Production-Ready
