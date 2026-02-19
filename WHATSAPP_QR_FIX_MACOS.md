# WhatsApp QR Code Generation Fix

## Issue Summary
WhatsApp connection was not generating QR codes on macOS systems.

## Root Cause
The `whatsappService.js` had a hardcoded Chromium path for Linux systems:
```javascript
executablePath: '/usr/bin/chromium-browser'
```

On macOS, Chromium is installed via Homebrew at:
```
/opt/homebrew/bin/chromium
```

This caused the WhatsApp client initialization to fail silently, preventing QR code generation.

## Fix Applied

### 1. Platform-Specific Chromium Path
Updated `elscholar-api/src/services/whatsappService.js` to detect the platform and use the correct path:

```javascript
const chromiumPath = process.platform === 'darwin' 
  ? '/opt/homebrew/bin/chromium' 
  : '/usr/bin/chromium-browser';
```

### 2. Added Chromium Existence Check
Added validation to provide helpful error messages if Chromium is not installed:

```javascript
if (!fs.existsSync(chromiumPath)) {
  const errorMsg = `Chromium not found at ${chromiumPath}. Please install Chromium: ${
    process.platform === 'darwin' 
      ? 'brew install chromium' 
      : 'apt-get install chromium-browser'
  }`;
  throw new Error(errorMsg);
}
```

## Testing Steps

1. **Restart API Server:**
   ```bash
   cd elscholar-api
   npm run dev
   ```

2. **Test WhatsApp Connection:**
   - Navigate to Communication Setup or Parent page
   - Click "Connect WhatsApp" button
   - QR code should now generate within 8 seconds

3. **Verify in Browser Console:**
   ```javascript
   // Should see QR code data URL
   console.log('QR Code received:', res.qrCode);
   ```

4. **Check API Logs:**
   ```bash
   tail -f logs/api-server.log | grep -i "whatsapp\|qr"
   ```

   Expected output:
   ```
   🔄 Initializing WhatsApp client for school: SCH/20
   📱 QR Code generated for school: SCH/20 (attempt 1)
   ✅ New QR code stored for school: SCH/20
   ```

## Installation Requirements

### macOS:
```bash
brew install chromium
```

### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install chromium-browser
```

### Linux (CentOS/RHEL):
```bash
sudo yum install chromium
```

## Files Modified
- `elscholar-api/src/services/whatsappService.js`
  - Line ~150: Added Chromium path detection
  - Line ~206: Updated executablePath to use platform-specific path

## Related Components
- **UI:** `elscholar-ui/src/feature-module/peoples/parent/WhatsAppConnection.tsx`
- **API Route:** `elscholar-api/src/routes/whatsapp_service.js`
- **Context:** `elscholar-ui/src/contexts/WhatsAppContext.tsx`

## Additional Notes

### Why This Happened
The code was originally developed/tested on Linux servers where Chromium is typically at `/usr/bin/chromium-browser`. When running on macOS for development, the hardcoded path caused silent failures.

### Future Improvements
Consider using Puppeteer's bundled Chromium instead of system Chromium:
```javascript
// Remove executablePath to use bundled Chromium
puppeteer: {
  headless: true,
  args: [...],
  // executablePath: chromiumPath, // Remove this line
}
```

This would eliminate platform-specific path issues entirely.

## Troubleshooting

### QR Code Still Not Generating?

1. **Check Chromium Installation:**
   ```bash
   which chromium || which chromium-browser
   ```

2. **Check API Server Logs:**
   ```bash
   cd elscholar-api
   tail -100 logs/api-server.log | grep -i error
   ```

3. **Test Chromium Manually:**
   ```bash
   /opt/homebrew/bin/chromium --version
   ```

4. **Clear WhatsApp Session:**
   ```bash
   cd elscholar-api
   rm -rf .wwebjs_auth/session-school_*
   ```

5. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for network errors on `/api/whatsapp/connect`
   - Check for timeout errors (should resolve within 8 seconds)

### Common Errors

**Error: "Chromium not found"**
- Solution: Install Chromium using the commands above

**Error: "Initialization timed out"**
- Solution: Increase timeout in `whatsappService.js` or check system resources

**Error: "Browser is not properly connected"**
- Solution: Restart API server and try again

---

**Fixed:** 2026-02-08
**Tested:** macOS (Apple Silicon)
**Status:** ✅ Resolved
