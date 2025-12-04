# WhatsApp Global State - Quick Reference

## 🚀 Quick Start (30 seconds)

### Use WhatsApp Status in Any Component:

```typescript
import { useWhatsApp } from '../contexts/WhatsAppContext';

const MyComponent = () => {
  const { isConnected, phoneNumber } = useWhatsApp();

  return (
    <div>
      {isConnected ? `Connected: ${phoneNumber}` : 'Not Connected'}
    </div>
  );
};
```

---

## 📊 Common Use Cases

### 1. Check Before Sending Message

```typescript
const { isConnected } = useWhatsApp();

const handleSend = () => {
  if (!isConnected) {
    toast.error("WhatsApp not connected");
    return;
  }
  // Send message...
};
```

### 2. Show Status Indicator

```typescript
import WhatsAppStatusIndicator from '../components/WhatsAppStatusIndicator';

<WhatsAppStatusIndicator />
```

### 3. Manual Status Refresh

```typescript
const { checkStatus, isChecking } = useWhatsApp();

<Button onClick={checkStatus} loading={isChecking}>
  Refresh
</Button>
```

### 4. Update After Connect

```typescript
const { checkStatus } = useWhatsApp();

<WhatsAppConnection
  onConnected={() => checkStatus()}
/>
```

### 5. Update After Disconnect

```typescript
const { setConnectionStatus } = useWhatsApp();

const disconnect = () => {
  _post('api/whatsapp/disconnect', {}, () => {
    setConnectionStatus(false, null);
  });
};
```

---

## 🎯 Hook API

```typescript
const {
  isConnected,      // boolean - Connection status
  phoneNumber,      // string | null - Connected number
  isChecking,       // boolean - Loading state
  lastChecked,      // Date | null - Last check time
  checkStatus,      // () => Promise<void> - Manual check
  setConnectionStatus // (connected, phone?) => void - Update
} = useWhatsApp();
```

---

## 🔧 Component Props

```typescript
<WhatsAppStatusIndicator
  showIcon={true}          // Show WhatsApp icon
  showPhoneNumber={true}   // Show phone number
  size="default"           // 'small' | 'default'
  style={{}}               // Custom styles
/>
```

---

## ✅ Do's and Don'ts

### ✅ DO:
- Use `useWhatsApp()` hook
- Check `isConnected` before sending
- Use `<WhatsAppStatusIndicator />` for status display
- Call `checkStatus()` after connecting

### ❌ DON'T:
- Create local state for WhatsApp status
- Make direct API calls to `/api/whatsapp/status`
- Forget to check connection before sending

---

## 📁 Files

| File | Purpose |
|------|---------|
| `contexts/WhatsAppContext.tsx` | Global state manager |
| `components/WhatsAppStatusIndicator.tsx` | Reusable status component |
| `index.tsx` | App wrapped with provider |

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Hook error | Ensure app wrapped with `<WhatsAppProvider>` |
| Status not updating | Call `checkStatus()` after connect/disconnect |
| Different status on pages | All components must use `useWhatsApp()` |

---

## 📚 Full Documentation

See `WHATSAPP_GLOBAL_STATE_DOCUMENTATION.md` for complete guide.

---

**Status:** ✅ Production Ready
**Last Updated:** 2025-01-08
