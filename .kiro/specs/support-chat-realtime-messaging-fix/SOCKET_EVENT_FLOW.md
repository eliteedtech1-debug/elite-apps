# Socket Event Flow Documentation

## Overview

This document describes the Socket.IO event flow for the support chat real-time messaging system. The system enables bidirectional communication between users and support agents through WebSocket connections.

## Architecture

```
[User Browser] <--Socket.IO--> [Backend Server] <--Socket.IO--> [Agent Browser]
     |                               |                               |
     v                               v                               v
SupportChat.tsx              socketService.js            AgentSupportChat.tsx
                                     |
                                     v
                            supportController.js
```

## Connection Flow

### 1. Client Connection Initialization

Both `SupportChat.tsx` (user) and `AgentSupportChat.tsx` (agent) initialize socket connections on component mount:

```javascript
const token = localStorage.getItem('@@auth_token');
const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:34567';

socketRef.current = io(serverUrl, {
  auth: { token },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

### 2. Server-Side Authentication

When a client connects, `socketService.js` authenticates the connection:

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    // Allow guest connections
    socket.userId = null;
    return next();
  }
  
  // Verify JWT token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      socket.userId = null;
      return next();
    }
    
    socket.userId = decoded.id;
    socket.userType = decoded.user_type;
    next();
  });
});
```

### 3. Connection Established

On successful connection:
- Client receives `connect` event
- Server stores user in `connectedUsers` Map
- User joins school room: `school_{schoolId}`
- User joins personal room: `user_{userId}`

## Event Types

### Client-to-Server Events

#### 1. `join_support_ticket`
Emitted when user/agent opens a ticket.

**Payload:**
```javascript
socket.emit('join_support_ticket', ticketId);
```

**Server Action:**
- Joins socket to room: `support_ticket_{ticketId}`
- Logs room join

#### 2. `leave_support_ticket`
Emitted when user/agent closes a ticket.

**Payload:**
```javascript
socket.emit('leave_support_ticket', ticketId);
```

**Server Action:**
- Removes socket from room: `support_ticket_{ticketId}`
- Logs room leave

### Server-to-Client Events

#### 1. `support_message`
Broadcast when a new message is added to a ticket.

**Payload:**
```javascript
{
  id: number,
  ticket_id: number,
  sender_id: number,
  message: string,
  isFromUser: boolean,
  created_at: string,
  sender: {
    id: number,
    name: string,
    email: string,
    user_type: string
  }
}
```

**Client Action:**
- Validates message structure
- Checks if message belongs to currently selected ticket
- Appends message to messages array
- Scrolls to bottom

#### 2. `connect`
Emitted when socket connection is established.

**Client Action:**
- Sets connection status to 'connected'
- Clears connection error
- Rejoins ticket room if previously viewing a ticket (reconnection)

#### 3. `connect_error`
Emitted when socket connection fails.

**Client Action:**
- Sets connection status to 'error'
- Displays user-friendly error message
- Logs error details

#### 4. `disconnect`
Emitted when socket connection is lost.

**Client Action:**
- Sets connection status to 'disconnected'
- Shows 'connecting' status if disconnect was unexpected

## Message Flow

### User Sends Message

1. User types message in `SupportChat.tsx`
2. User clicks send button
3. Frontend calls API: `POST /api/support/tickets/{ticketId}/messages`
4. Backend (`supportController.js`):
   - Saves message to database
   - Calls `socketService.sendToSupportTicket(ticketId, message)`
5. Socket service broadcasts `support_message` event to room `support_ticket_{ticketId}`
6. All clients in that room receive the message
7. Clients validate and display the message

### Agent Sends Message

Same flow as user, but `isFromUser` flag is set to `false` based on user_type.

## Room Management

### Room Types

1. **School Rooms**: `school_{schoolId}`
   - All users from same school
   - Used for school-wide broadcasts

2. **User Rooms**: `user_{userId}`
   - Individual user's personal room
   - Used for direct notifications

3. **Ticket Rooms**: `support_ticket_{ticketId}`
   - All users/agents viewing a specific ticket
   - Used for real-time message delivery

### Room Lifecycle

```
User opens ticket → emit 'join_support_ticket' → join room
User views messages → receive 'support_message' events
User closes ticket → emit 'leave_support_ticket' → leave room
```

## Reconnection Handling

### Automatic Reconnection

Socket.IO automatically attempts to reconnect with these settings:
- `reconnection: true`
- `reconnectionDelay: 1000` (1 second)
- `reconnectionAttempts: 5`

### Rejoin Logic

When reconnection succeeds:
1. `connect` event fires
2. Client checks if `selectedTicket` exists
3. If yes, emits `join_support_ticket` to rejoin room
4. Continues receiving messages

## Heartbeat System

### Purpose
Keep agent online status updated for the "Online Staff" feature.

### Implementation

**Frontend (AgentSupportChat.tsx):**
```javascript
useEffect(() => {
  if (isOpen) {
    // Initial heartbeat
    _post('api/support/heartbeat', {}, 
      () => {},
      (err) => console.error('Heartbeat failed:', err)
    );
    
    // Periodic heartbeat every 60 seconds
    const heartbeat = setInterval(() => {
      _post('api/support/heartbeat', {}, 
        () => {},
        (err) => console.error('Heartbeat failed:', err)
      );
    }, 60000);
    
    return () => clearInterval(heartbeat);
  }
}, [isOpen]);
```

**Backend (supportController.js):**
```javascript
async updateUserActivity(req, res) {
  const userId = req.user.id;
  
  await db.User.update(
    { last_activity: new Date() },
    { where: { id: userId } }
  );
  
  return res.json({ success: true });
}
```

### Online Status Check

Agents are considered online if:
- `user_type` is 'superadmin' or 'developer' (case-insensitive)
- `last_activity` is within last 60 minutes

## Error Handling

### Connection Errors

**Symptoms:**
- `connect_error` event fires
- Connection status shows 'error'

**Causes:**
- Network issues
- Server down
- CORS misconfiguration
- Invalid JWT token

**User Experience:**
- Error message displayed in chat UI
- "Connecting..." status indicator shown
- Messages still saved to database (non-blocking)

### Message Delivery Failures

**Fallback:**
- Messages are always saved to database first
- Socket broadcast is wrapped in try-catch
- If socket fails, message is still persisted
- Users can refresh to see messages

## Logging

### Client-Side Logs

```javascript
console.log('✅ Socket connected');
console.log('🔌 Joining ticket room:', ticketId);
console.log('📨 Received support message:', message);
console.error('❌ Socket connection error:', error);
```

### Server-Side Logs

```javascript
console.log('✅ Socket authenticated:', userId);
console.log('🔌 User joined ticket room:', ticketId);
console.log('📤 Broadcasting message to ticket:', ticketId);
console.log('💓 Heartbeat received from user:', userId);
```

## Testing

### Manual Testing Checklist

1. **Connection:**
   - [ ] Open user chat → verify 'connect' log
   - [ ] Open agent chat → verify 'connect' log
   - [ ] Check connection status indicator

2. **Room Management:**
   - [ ] Select ticket → verify 'join_support_ticket' log
   - [ ] Switch tickets → verify 'leave_support_ticket' and 'join_support_ticket' logs
   - [ ] Close chat → verify 'leave_support_ticket' log

3. **Message Delivery:**
   - [ ] User sends message → agent receives instantly
   - [ ] Agent sends message → user receives instantly
   - [ ] Multiple agents viewing same ticket → all receive message

4. **Reconnection:**
   - [ ] Disable network → verify 'disconnect' log
   - [ ] Re-enable network → verify 'connect' log and room rejoin
   - [ ] Send message after reconnection → verify delivery

5. **Error Handling:**
   - [ ] Invalid token → verify graceful handling
   - [ ] Server down → verify error message displayed
   - [ ] Network issues → verify reconnection attempts

## Configuration

### Environment Variables

```bash
# Backend
REACT_APP_SERVER_URL=http://localhost:34567
JWT_SECRET=your_jwt_secret

# Socket.IO CORS
CORS_ORIGIN=http://localhost:3000
```

### CORS Configuration

```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.
