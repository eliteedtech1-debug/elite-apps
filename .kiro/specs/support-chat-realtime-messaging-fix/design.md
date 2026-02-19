# Design Document: Support Chat Real-Time Messaging Fix

## Overview

This design addresses the critical issue where real-time socket communication in the support chat system is not functioning properly. The system currently has Socket.IO infrastructure in place, but messages sent by agents are not being received by users in real-time, requiring page refreshes to see new messages.

The root cause analysis reveals that while the backend Socket.IO server is configured and the `sendToSupportTicket` method is being called, the frontend components may not be properly listening for socket events, or there may be issues with room management and event propagation.

This design provides a comprehensive solution to ensure bidirectional real-time messaging between users and agents through proper socket connection management, event handling, and room-based message isolation.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐         ┌──────────────────────┐     │
│  │  SupportChat.tsx     │         │ AgentSupportChat.tsx │     │
│  │  (User Interface)    │         │ (Agent Interface)    │     │
│  │                      │         │                      │     │
│  │  - Socket.IO Client  │         │  - Socket.IO Client  │     │
│  │  - Event Listeners   │         │  - Event Listeners   │     │
│  │  - Room Management   │         │  - Room Management   │     │
│  └──────────┬───────────┘         └──────────┬───────────┘     │
│             │                                 │                  │
│             └─────────────┬───────────────────┘                  │
│                           │                                      │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            │ Socket.IO Connection
                            │ (WebSocket/HTTP Long Polling)
                            │
┌───────────────────────────┼──────────────────────────────────────┐
│                           │         Backend Layer                 │
├───────────────────────────┼──────────────────────────────────────┤
│                           ▼                                       │
│              ┌────────────────────────┐                          │
│              │   socketService.js     │                          │
│              │                        │                          │
│              │  - Connection Manager  │                          │
│              │  - JWT Authentication  │                          │
│              │  - Room Management     │                          │
│              │  - Event Broadcasting  │                          │
│              └────────┬───────────────┘                          │
│                       │                                           │
│                       │ Calls                                     │
│                       ▼                                           │
│              ┌────────────────────────┐                          │
│              │  supportController.js  │                          │
│              │                        │                          │
│              │  - Message Persistence │                          │
│              │  - Socket Emission     │                          │
│              │  - Business Logic      │                          │
│              └────────┬───────────────┘                          │
│                       │                                           │
│                       │ Queries/Updates                           │
│                       ▼                                           │
│              ┌────────────────────────┐                          │
│              │   Database (MySQL)     │                          │
│              │                        │                          │
│              │  - support_tickets     │                          │
│              │  - ticket_messages     │                          │
│              │  - users               │                          │
│              └────────────────────────┘                          │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Socket.IO Room Structure

```
Socket.IO Server
│
├── school_{schoolId} (School-wide room)
│   └── All users from the same school
│
├── user_{userId} (User-specific room)
│   └── Individual user for direct notifications
│
└── support_ticket_{ticketId} (Ticket-specific room)
    ├── User who created the ticket
    └── Agent(s) assigned to or viewing the ticket
```

## Components and Interfaces

### Frontend Components

#### SupportChat.tsx (User Interface)

**Responsibilities:**
- Initialize Socket.IO client connection with JWT authentication
- Join/leave ticket rooms based on selected ticket
- Listen for `support_message` events and update UI
- Send messages through HTTP API (not directly via socket)
- Manage socket connection lifecycle

**Key Methods:**
```typescript
// Initialize socket connection
useEffect(() => {
  const token = localStorage.getItem('@@auth_token');
  const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:34567';
  
  socketRef.current = io(serverUrl, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socketRef.current.on('connect', handleConnect);
  socketRef.current.on('support_message', handleSupportMessage);
  socketRef.current.on('connect_error', handleConnectError);
  socketRef.current.on('disconnect', handleDisconnect);

  return () => {
    socketRef.current?.disconnect();
  };
}, []);

// Join ticket room when ticket is selected
useEffect(() => {
  if (!socketRef.current || !selectedTicket) return;

  socketRef.current.emit('join_support_ticket', selectedTicket.id);
  
  return () => {
    socketRef.current?.emit('leave_support_ticket', selectedTicket.id);
  };
}, [selectedTicket]);

// Handle incoming messages
const handleSupportMessage = (message: Message) => {
  // Only process messages for the currently selected ticket
  if (message.ticketId === selectedTicket?.id) {
    setMessages(prev => [...prev, message]);
    scrollToBottom();
  }
};
```

#### AgentSupportChat.tsx (Agent Interface)

**Responsibilities:**
- Initialize Socket.IO client connection with JWT authentication
- Join/leave ticket rooms based on selected ticket
- Listen for `support_message` events and update UI
- Send messages through HTTP API (not directly via socket)
- Display user online status indicators

**Key Methods:**
```typescript
// Same socket initialization pattern as SupportChat.tsx
// Same room management pattern
// Same message handling pattern
```

### Backend Components

#### socketService.js

**Responsibilities:**
- Initialize Socket.IO server with CORS configuration
- Authenticate socket connections using JWT
- Manage user connections in a Map (userId -> socketId)
- Handle join/leave ticket room events
- Broadcast messages to ticket rooms
- Track online/offline status

**Key Methods:**
```javascript
class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        socket.userId = `guest_${Date.now()}`;
        socket.userType = 'guest';
        return next();
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.user_type === 'Student') {
          socket.userId = `student_${decoded.admission_no}`;
          socket.admissionNo = decoded.admission_no;
        } else {
          socket.userId = decoded.id;
        }
        
        socket.schoolId = decoded.school_id;
        socket.userType = decoded.user_type;
        next();
      } catch (err) {
        socket.userId = `unauth_${Date.now()}`;
        socket.userType = 'unauthenticated';
        next();
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    console.log(`✅ User ${socket.userId} (${socket.userType}) connected`);
    
    // Store connection
    this.connectedUsers.set(socket.userId, socket.id);
    
    // Join default rooms
    socket.join(`school_${socket.schoolId}`);
    socket.join(`user_${socket.userId}`);
    
    // Handle ticket room events
    socket.on('join_support_ticket', (ticketId) => {
      socket.join(`support_ticket_${ticketId}`);
      console.log(`💬 User ${socket.userId} joined ticket ${ticketId}`);
    });

    socket.on('leave_support_ticket', (ticketId) => {
      socket.leave(`support_ticket_${ticketId}`);
      console.log(`👋 User ${socket.userId} left ticket ${ticketId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.userId} disconnected`);
      this.connectedUsers.delete(socket.userId);
    });
  }

  sendToSupportTicket(ticketId, message) {
    console.log(`📨 Broadcasting to ticket ${ticketId}:`, message);
    this.io.to(`support_ticket_${ticketId}`).emit('support_message', message);
  }

  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}
```

#### supportController.js

**Responsibilities:**
- Handle HTTP requests for creating messages
- Persist messages to database
- Call socketService to broadcast messages
- Ensure message delivery even if socket broadcast fails

**Key Method:**
```javascript
async addMessageToTicket(req, res) {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id || null;

    // Validate ticket exists
    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    // Determine if sender is agent
    const isAgent = ['superadmin', 'developer', 'SuperAdmin', 'Developer']
      .includes(req.user?.user_type);

    // Persist message to database
    const ticketMessage = await TicketMessage.create({
      ticketId,
      senderId: userId,
      message,
      isFromUser: !isAgent
    });

    // Fetch sender information
    const messageWithSender = await TicketMessage.findByPk(ticketMessage.id, {
      include: [{
        model: User,
        as: 'sender',
        attributes: ['id', 'name', 'email', 'user_type']
      }]
    });

    // Update ticket status if needed
    if (ticket.status === 'open' && isAgent) {
      await ticket.update({
        status: 'in-progress',
        assigned_to: userId
      });
    }

    // Broadcast via socket (non-blocking)
    try {
      const socketService = require('../services/socketService');
      socketService.sendToSupportTicket(ticketId, messageWithSender);
    } catch (socketError) {
      console.error('Socket broadcast failed:', socketError);
      // Continue - message is already saved in DB
    }

    return res.status(201).json({
      success: true,
      message: 'Message added successfully',
      data: messageWithSender
    });
  } catch (error) {
    console.error('Error adding message:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
}
```

## Data Models

### Message Data Structure

```typescript
interface Message {
  id: number;
  ticketId: number;
  senderId: number;
  message: string;
  isFromUser: boolean;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: number;
    name: string;
    email: string;
    user_type: string;
  };
}
```

### Socket Event Payloads

**Client to Server Events:**

```typescript
// Join a ticket room
socket.emit('join_support_ticket', ticketId: number);

// Leave a ticket room
socket.emit('leave_support_ticket', ticketId: number);
```

**Server to Client Events:**

```typescript
// New message in ticket
socket.on('support_message', (message: Message) => {
  // Handle message
});

// Connection established
socket.on('connect', () => {
  // Handle connection
});

// Connection error
socket.on('connect_error', (error: Error) => {
  // Handle error
});

// Disconnection
socket.on('disconnect', (reason: string) => {
  // Handle disconnection
});
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Socket Connection Establishment

*For any* user or agent opening the support chat interface, the Socket.IO client should successfully establish a connection to the backend server and receive a 'connect' event.

**Validates: Requirements 1.1, 1.2**

### Property 2: JWT Authentication Success

*For any* valid JWT token provided in the socket handshake, the Socket.IO server should successfully authenticate the connection and assign the correct userId, schoolId, and userType to the socket.

**Validates: Requirements 1.3, 1.4, 10.2, 10.3**

### Property 3: Ticket Room Membership

*For any* ticket selected by a user or agent, the socket should be added to the corresponding ticket room (`support_ticket_{ticketId}`) and should be removed from the previous ticket room when switching tickets.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 4: Message Broadcast to Ticket Room

*For any* message saved to the database by the Support_Controller, the Socket_Service should emit a `support_message` event to all sockets in the corresponding ticket room.

**Validates: Requirements 3.2, 3.3, 4.2, 4.3**

### Property 5: Message Reception and UI Update

*For any* `support_message` event received by a client socket, if the message belongs to the currently selected ticket, the message should be appended to the messages array and the UI should scroll to the bottom.

**Validates: Requirements 3.4, 3.5, 4.4, 4.5**

### Property 6: Bidirectional Message Delivery

*For any* message sent by either a user or an agent, all participants in the ticket room (both the user and any agents viewing that ticket) should receive the message via the `support_message` event.

**Validates: Requirements 3.1-3.6, 4.1-4.6**

### Property 7: Event Listener Registration and Cleanup

*For any* component mount, socket event listeners should be registered, and for any component unmount, all socket event listeners should be removed to prevent memory leaks.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 8: Socket Reconnection and Room Rejoin

*For any* socket disconnection followed by reconnection, the client should automatically rejoin the previously selected ticket room.

**Validates: Requirements 6.3, 6.4**

### Property 9: Message Persistence Before Broadcast

*For any* message sent through the system, the message should be saved to the database first, and only after successful database save should the socket broadcast occur.

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 10: Database Persistence Regardless of Socket Failure

*For any* message where the socket broadcast fails, the message should still be successfully saved in the database and returned in the HTTP response.

**Validates: Requirements 9.4, 9.6**

### Property 11: CORS Origin Validation

*For any* socket connection attempt from an origin other than the configured FRONTEND_URL, the Socket.IO server should reject the connection.

**Validates: Requirements 8.1, 8.3**

### Property 12: Connected Users Tracking

*For any* socket connection, the Socket_Service should add the user to the connectedUsers Map, and for any disconnection, the user should be removed from the Map.

**Validates: Requirements 6.5, 6.6**

## Error Handling

### Socket Connection Errors

**Error Scenario:** Socket connection fails due to network issues or server unavailability

**Handling:**
- Log error to browser console with connection details
- Display user-friendly error message in chat interface
- Attempt automatic reconnection with exponential backoff
- Show "Connecting..." status indicator to user

### Authentication Errors

**Error Scenario:** JWT token is invalid or expired

**Handling:**
- Log authentication failure with user identification details
- Allow connection but mark as unauthenticated
- Prompt user to refresh their session/login again
- Disable message sending until authenticated

### Message Broadcast Errors

**Error Scenario:** Socket broadcast fails but message is saved in database

**Handling:**
- Log socket broadcast error with ticket ID and message details
- Continue with HTTP response (message is already saved)
- Client will receive message through database query on next refresh
- Socket broadcast is treated as optimization, not critical path

### Room Join/Leave Errors

**Error Scenario:** Socket fails to join or leave a ticket room

**Handling:**
- Log room management error with socket ID and ticket ID
- Retry room join operation
- If persistent failure, fall back to database polling for messages

### CORS Errors

**Error Scenario:** Connection attempt from unauthorized origin

**Handling:**
- Reject connection at Socket.IO server level
- Log CORS violation with origin details
- Return appropriate CORS error to client

## Testing Strategy

### Unit Tests

Unit tests should focus on specific examples, edge cases, and error conditions:

1. **Socket Connection Tests**
   - Test successful connection with valid JWT token
   - Test connection with invalid JWT token
   - Test connection without JWT token (guest mode)
   - Test connection from unauthorized origin (CORS)

2. **Room Management Tests**
   - Test joining a ticket room
   - Test leaving a ticket room
   - Test switching between ticket rooms
   - Test multiple users in same ticket room

3. **Message Handling Tests**
   - Test message persistence to database
   - Test message broadcast to ticket room
   - Test message reception by user
   - Test message reception by agent
   - Test message filtering by ticket ID

4. **Error Handling Tests**
   - Test socket connection failure
   - Test authentication failure
   - Test message broadcast failure (database save should still succeed)
   - Test room join failure

5. **Lifecycle Tests**
   - Test component mount (socket initialization)
   - Test component unmount (socket cleanup)
   - Test socket reconnection
   - Test room rejoin after reconnection

### Property-Based Tests

Property-based tests should verify universal properties across all inputs. Each test should run a minimum of 100 iterations.

1. **Property Test: Socket Connection Establishment**
   - Generate random valid JWT tokens
   - For each token, verify socket connects successfully
   - Tag: **Feature: support-chat-realtime-messaging-fix, Property 1: Socket Connection Establishment**

2. **Property Test: JWT Authentication Success**
   - Generate random valid JWT payloads (various user types, school IDs)
   - For each payload, verify correct userId, schoolId, userType assignment
   - Tag: **Feature: support-chat-realtime-messaging-fix, Property 2: JWT Authentication Success**

3. **Property Test: Ticket Room Membership**
   - Generate random ticket IDs
   - For each ticket, verify socket joins room and leaves previous room
   - Tag: **Feature: support-chat-realtime-messaging-fix, Property 3: Ticket Room Membership**

4. **Property Test: Message Broadcast to Ticket Room**
   - Generate random messages and ticket IDs
   - For each message, verify broadcast to all sockets in ticket room
   - Tag: **Feature: support-chat-realtime-messaging-fix, Property 4: Message Broadcast to Ticket Room**

5. **Property Test: Message Reception and UI Update**
   - Generate random messages for selected ticket
   - For each message, verify UI update and scroll behavior
   - Tag: **Feature: support-chat-realtime-messaging-fix, Property 5: Message Reception and UI Update**

6. **Property Test: Bidirectional Message Delivery**
   - Generate random messages from users and agents
   - For each message, verify all participants receive it
   - Tag: **Feature: support-chat-realtime-messaging-fix, Property 6: Bidirectional Message Delivery**

7. **Property Test: Event Listener Registration and Cleanup**
   - Generate random mount/unmount cycles
   - For each cycle, verify listeners are registered and cleaned up
   - Tag: **Feature: support-chat-realtime-messaging-fix, Property 7: Event Listener Registration and Cleanup**

8. **Property Test: Socket Reconnection and Room Rejoin**
   - Generate random disconnect/reconnect scenarios
   - For each scenario, verify room rejoin behavior
   - Tag: **Feature: support-chat-realtime-messaging-fix, Property 8: Socket Reconnection and Room Rejoin**

9. **Property Test: Message Persistence Before Broadcast**
   - Generate random messages
   - For each message, verify database save occurs before socket broadcast
   - Tag: **Feature: support-chat-realtime-messaging-fix, Property 9: Message Persistence Before Broadcast**

10. **Property Test: Database Persistence Regardless of Socket Failure**
    - Generate random messages with simulated socket failures
    - For each message, verify database save succeeds even when socket fails
    - Tag: **Feature: support-chat-realtime-messaging-fix, Property 10: Database Persistence Regardless of Socket Failure**

11. **Property Test: CORS Origin Validation**
    - Generate random origins (authorized and unauthorized)
    - For each origin, verify correct acceptance/rejection behavior
    - Tag: **Feature: support-chat-realtime-messaging-fix, Property 11: CORS Origin Validation**

12. **Property Test: Connected Users Tracking**
    - Generate random connect/disconnect events
    - For each event, verify connectedUsers Map is updated correctly
    - Tag: **Feature: support-chat-realtime-messaging-fix, Property 12: Connected Users Tracking**

### Integration Tests

1. **End-to-End Message Flow**
   - User sends message → Database save → Socket broadcast → Agent receives message
   - Agent sends message → Database save → Socket broadcast → User receives message

2. **Multi-User Ticket Room**
   - Multiple agents viewing same ticket
   - User sends message
   - Verify all agents receive message

3. **Ticket Switching**
   - User switches between multiple tickets
   - Verify messages only appear for selected ticket
   - Verify room membership changes correctly

4. **Reconnection Scenario**
   - User disconnects (network issue)
   - User reconnects
   - Verify room rejoin and message history load

### Manual Testing Checklist

1. Open user chat and agent chat in separate browser windows
2. Create a new support ticket from user chat
3. Send a message from user chat
4. Verify agent receives message instantly (no refresh)
5. Send a reply from agent chat
6. Verify user receives reply instantly (no refresh)
7. Open browser console and verify socket connection logs
8. Check for any CORS errors or connection errors
9. Test with multiple tickets (switch between tickets)
10. Test reconnection (disable network, re-enable, verify messages still work)
