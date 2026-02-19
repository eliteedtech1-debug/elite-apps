# Support Chat Troubleshooting Guide

## Common Issues and Solutions

### 1. Socket Connection Fails

#### Symptoms
- Connection status shows "Connection Error" or "Disconnected"
- Console shows `connect_error` events
- Messages not delivered in real-time

#### Possible Causes

**A. CORS Configuration**

Check if CORS is properly configured in `socketService.js`:

```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

**Solution:**
- Verify `CORS_ORIGIN` environment variable matches frontend URL
- Check browser console for CORS errors
- Ensure credentials are enabled

**B. Invalid JWT Token**

Check browser console for authentication errors:

```
❌ Socket connection error: Invalid token
```

**Solution:**
- Verify token exists in localStorage: `localStorage.getItem('@@auth_token')`
- Check token expiration
- Re-login to get fresh token

**C. Server Not Running**

**Solution:**
- Verify backend server is running on correct port
- Check `REACT_APP_SERVER_URL` environment variable
- Test API endpoint: `curl http://localhost:34567/api/health`

**D. Network Issues**

**Solution:**
- Check internet connection
- Verify firewall settings
- Test WebSocket connectivity: `wscat -c ws://localhost:34567`

### 2. Messages Not Appearing in Real-Time

#### Symptoms
- Messages saved to database but not appearing instantly
- Need to refresh to see new messages
- Socket connected but no `support_message` events

#### Possible Causes

**A. Not Joined to Ticket Room**

Check console logs for room join confirmation:

```
🔌 Joining ticket room: 123
```

**Solution:**
- Verify `join_support_ticket` event is emitted when ticket is selected
- Check server logs for room join confirmation
- Ensure `selectedTicket` state is set correctly

**B. Message Validation Failing**

Check console for validation errors:

```
Invalid message structure received
```

**Solution:**
- Verify message payload includes: `id`, `ticket_id`, `message`, `sender`
- Check backend `addMessageToTicket` method returns complete message object
- Ensure `socketService.sendToSupportTicket` is called after database save

**C. Wrong Ticket Selected**

Messages only appear for currently selected ticket.

**Solution:**
- Verify `message.ticket_id === selectedTicket.id`
- Check if user is viewing correct ticket
- Refresh ticket list to see updated tickets

### 3. Online Staff Always Shows Empty

#### Symptoms
- `/api/support/online-staff` returns empty array `[]`
- No agents appear in online staff list
- Agents are logged in but not showing as online

#### Possible Causes

**A. No Heartbeat Being Sent**

Check if heartbeat is being sent from `AgentSupportChat.tsx`:

```javascript
// Should see this in backend logs
💓 Heartbeat received from user: 1208 ( branchadmin )
```

**Solution:**
- Verify heartbeat useEffect is running when chat is open
- Check network tab for `/api/support/heartbeat` POST requests
- Ensure heartbeat interval is not cleared prematurely

**B. User Type Case Mismatch**

The `getOnlineStaff` method uses case-insensitive matching:

```sql
WHERE LOWER(user_type) IN ('superadmin', 'developer')
```

**Solution:**
- Verify user_type in database is 'superadmin' or 'developer' (any case)
- Check JWT token contains correct user_type
- Test query directly in database:
  ```sql
  SELECT id, name, user_type, last_activity 
  FROM users 
  WHERE LOWER(user_type) IN ('superadmin', 'developer');
  ```

**C. Last Activity Not Updated**

Check if `last_activity` field is being updated:

```sql
SELECT id, name, user_type, last_activity 
FROM users 
WHERE id = YOUR_USER_ID;
```

**Solution:**
- Verify `updateUserActivity` method is updating `last_activity`
- Check if user table has `last_activity` column
- Ensure heartbeat API is not failing silently

**D. Time Threshold Too Strict**

Agents are considered online if active within last 60 minutes.

**Solution:**
- Check server time vs database time (timezone issues)
- Verify `last_activity` timestamp format
- Test with longer threshold for debugging:
  ```javascript
  const sixtyMinutesAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
  ```

### 4. Reconnection Not Working

#### Symptoms
- After network disconnect, socket doesn't reconnect
- Need to refresh page to restore connection
- Reconnection attempts exhausted

#### Possible Causes

**A. Reconnection Disabled**

Check socket initialization:

```javascript
socketRef.current = io(serverUrl, {
  reconnection: true,  // Must be true
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

**Solution:**
- Verify `reconnection: true` is set
- Increase `reconnectionAttempts` if needed
- Check browser console for reconnection logs

**B. Room Not Rejoined**

After reconnection, must rejoin ticket room.

**Solution:**
- Verify `connect` event handler rejoins room:
  ```javascript
  if (selectedTicketRef.current) {
    socketRef.current?.emit('join_support_ticket', selectedTicketRef.current.id);
  }
  ```
- Use ref to access latest `selectedTicket` value
- Check server logs for room rejoin confirmation

### 5. Multiple Messages Appearing

#### Symptoms
- Same message appears multiple times
- Duplicate messages in chat
- Message count increases unexpectedly

#### Possible Causes

**A. Multiple Event Listeners**

Check if event listeners are being registered multiple times.

**Solution:**
- Ensure event listeners are cleaned up in useEffect return:
  ```javascript
  return () => {
    socketRef.current?.off('support_message', handleSupportMessage);
  };
  ```
- Verify socket is disconnected on unmount
- Check for multiple socket connections

**B. Multiple Socket Connections**

**Solution:**
- Ensure only one socket instance per component
- Use `socketRef` to store socket instance
- Disconnect old socket before creating new one

### 6. Agent Chat Not Opening

#### Symptoms
- Agent chat button not visible
- Chat widget doesn't open when clicked
- Component not rendering

#### Possible Causes

**A. User Not Recognized as Agent**

Check user type:

```javascript
const isAgent = user?.user_type?.toLowerCase() === 'superadmin' || 
                user?.user_type?.toLowerCase() === 'developer';
```

**Solution:**
- Verify user_type in JWT token
- Check Redux auth state: `state.auth.user`
- Ensure user_type is 'superadmin' or 'developer' (case-insensitive)

**B. Component Not Mounted**

**Solution:**
- Check if `AgentSupportChat` is imported in parent component
- Verify component is not conditionally hidden
- Check browser console for React errors

## Debugging Tools

### 1. Browser Console

Enable verbose logging:

```javascript
localStorage.setItem('debug', 'socket.io-client:*');
```

### 2. Network Tab

Monitor WebSocket connections:
- Filter by "WS" to see WebSocket traffic
- Check for upgrade from HTTP to WebSocket
- Verify messages are being sent/received

### 3. Backend Logs

Check server console for:
- Socket connection logs
- Room join/leave logs
- Message broadcast logs
- Heartbeat logs

### 4. Database Queries

Test queries directly:

```sql
-- Check online agents
SELECT id, name, user_type, last_activity 
FROM users 
WHERE LOWER(user_type) IN ('superadmin', 'developer')
  AND last_activity >= DATE_SUB(NOW(), INTERVAL 60 MINUTE);

-- Check recent messages
SELECT * FROM ticket_messages 
WHERE ticket_id = YOUR_TICKET_ID 
ORDER BY created_at DESC 
LIMIT 10;

-- Check ticket details
SELECT * FROM support_tickets 
WHERE id = YOUR_TICKET_ID;
```

## Performance Issues

### 1. Slow Message Delivery

**Causes:**
- Database query slow
- Too many connected clients
- Network latency

**Solutions:**
- Add database indexes on `ticket_id`, `created_at`
- Implement message pagination
- Use Redis for caching
- Monitor server CPU/memory usage

### 2. High Memory Usage

**Causes:**
- Memory leaks from event listeners
- Too many socket connections
- Large message history

**Solutions:**
- Clean up event listeners properly
- Disconnect sockets on unmount
- Implement message pagination
- Clear old messages from state

## Getting Help

If issues persist:

1. **Check Logs:**
   - Browser console (frontend)
   - Server console (backend)
   - Database logs

2. **Collect Information:**
   - Error messages
   - Steps to reproduce
   - Environment details (OS, browser, Node version)
   - Network conditions

3. **Test Isolation:**
   - Test with single user/agent
   - Test on different network
   - Test with fresh database

4. **Contact Support:**
   - Provide collected information
   - Include relevant logs
   - Describe expected vs actual behavior
