# Requirements Document

## Introduction

This document specifies the requirements for fixing the real-time socket communication issue in the support chat system. Currently, users can create tickets and send messages, but agent responses are not received by users in real-time via Socket.IO. Users must refresh the page to see agent responses, which defeats the purpose of real-time communication.

## Glossary

- **Socket.IO**: Real-time bidirectional event-based communication library
- **Support_Chat_Widget**: The user-facing chat interface component (SupportChat.tsx)
- **Agent_Chat_Interface**: The agent-facing support dashboard component (AgentSupportChat.tsx or SuperAdminSupportDashboard.tsx)
- **Socket_Service**: Backend service managing Socket.IO connections and message broadcasting (socketService.js)
- **Support_Controller**: Backend controller handling ticket and message operations (supportController.js)
- **Ticket_Room**: A Socket.IO room identified by `support_ticket_{ticketId}` for isolating messages to specific tickets
- **User_Room**: A Socket.IO room identified by `user_{userId}` for user-specific notifications
- **Message_Broadcast**: The act of emitting a socket event to all clients in a room
- **JWT_Token**: JSON Web Token used for authenticating socket connections

## Requirements

### Requirement 1: Socket Connection Establishment

**User Story:** As a user or agent, I want my socket connection to establish successfully when I open the support chat, so that I can receive real-time messages.

#### Acceptance Criteria

1. WHEN a user opens the Support_Chat_Widget, THE Socket.IO client SHALL establish a connection to the backend server
2. WHEN an agent opens the Agent_Chat_Interface, THE Socket.IO client SHALL establish a connection to the backend server
3. WHEN a socket connection is established, THE Socket_Service SHALL authenticate the connection using the JWT_Token from localStorage
4. WHEN authentication succeeds, THE Socket_Service SHALL assign the socket to appropriate rooms (User_Room and school room)
5. IF authentication fails, THEN THE Socket_Service SHALL allow the connection but mark it as unauthenticated
6. WHEN a socket connects, THE Socket_Service SHALL log the connection with user identification details

### Requirement 2: Ticket Room Management

**User Story:** As a system, I want to manage ticket-specific socket rooms, so that messages are only delivered to participants of that ticket.

#### Acceptance Criteria

1. WHEN a user selects a ticket in the Support_Chat_Widget, THE client SHALL emit a `join_support_ticket` event with the ticket ID
2. WHEN the Socket_Service receives a `join_support_ticket` event, THE Socket_Service SHALL add the socket to the Ticket_Room for that ticket
3. WHEN a user closes a ticket or selects a different ticket, THE client SHALL emit a `leave_support_ticket` event for the previous ticket
4. WHEN the Socket_Service receives a `leave_support_ticket` event, THE Socket_Service SHALL remove the socket from the Ticket_Room
5. WHEN an agent opens a ticket in the Agent_Chat_Interface, THE client SHALL emit a `join_support_ticket` event with the ticket ID
6. THE Socket_Service SHALL maintain separate Ticket_Rooms for each active support ticket

### Requirement 3: Real-Time Message Broadcasting

**User Story:** As a user, I want to receive agent messages instantly without refreshing, so that I can have a real-time conversation.

#### Acceptance Criteria

1. WHEN an agent sends a message via the Support_Controller, THE Support_Controller SHALL save the message to the database
2. WHEN the message is saved successfully, THE Support_Controller SHALL call Socket_Service.sendToSupportTicket with the ticket ID and message data
3. WHEN Socket_Service.sendToSupportTicket is called, THE Socket_Service SHALL emit a `support_message` event to all sockets in the Ticket_Room
4. WHEN a user's socket receives a `support_message` event, THE Support_Chat_Widget SHALL append the message to the messages array
5. WHEN a message is appended, THE Support_Chat_Widget SHALL scroll to the bottom of the message list
6. THE message data SHALL include sender information (id, name, email, user_type) and message metadata (id, ticketId, message, isFromUser, createdAt)

### Requirement 4: Bidirectional Message Delivery

**User Story:** As an agent, I want to receive user messages instantly without refreshing, so that I can respond promptly to support requests.

#### Acceptance Criteria

1. WHEN a user sends a message via the Support_Controller, THE Support_Controller SHALL save the message to the database
2. WHEN the message is saved successfully, THE Support_Controller SHALL call Socket_Service.sendToSupportTicket with the ticket ID and message data
3. WHEN Socket_Service.sendToSupportTicket is called, THE Socket_Service SHALL emit a `support_message` event to all sockets in the Ticket_Room
4. WHEN an agent's socket receives a `support_message` event, THE Agent_Chat_Interface SHALL append the message to the messages array
5. WHEN a message is appended, THE Agent_Chat_Interface SHALL scroll to the bottom of the message list
6. THE message SHALL be visually distinguished based on the isFromUser flag (user messages vs agent messages)

### Requirement 5: Socket Event Listeners

**User Story:** As a developer, I want proper socket event listeners configured, so that messages are received and processed correctly.

#### Acceptance Criteria

1. WHEN the Support_Chat_Widget mounts, THE component SHALL register a `support_message` event listener on the socket
2. WHEN the Agent_Chat_Interface mounts, THE component SHALL register a `support_message` event listener on the socket
3. WHEN a component unmounts, THE component SHALL remove all socket event listeners to prevent memory leaks
4. WHEN a `support_message` event is received, THE event handler SHALL validate the message structure before processing
5. IF a message is for a different ticket than currently selected, THEN THE component SHALL ignore the message
6. THE event listener SHALL handle both user-sent and agent-sent messages using the same handler logic

### Requirement 6: Socket Connection Lifecycle

**User Story:** As a system, I want to manage socket connection lifecycle properly, so that connections are established, maintained, and cleaned up correctly.

#### Acceptance Criteria

1. WHEN the Support_Chat_Widget is opened, THE component SHALL initialize a socket connection if one doesn't exist
2. WHEN the Support_Chat_Widget is closed, THE component SHALL disconnect the socket to free resources
3. WHEN a socket disconnects unexpectedly, THE client SHALL attempt to reconnect automatically
4. WHEN a socket reconnects, THE client SHALL rejoin the previously selected Ticket_Room
5. THE Socket_Service SHALL track connected users in a Map data structure (userId -> socketId)
6. WHEN a socket disconnects, THE Socket_Service SHALL remove the user from the connected users Map

### Requirement 7: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose socket communication issues.

#### Acceptance Criteria

1. WHEN a socket connection fails, THE client SHALL log the error to the browser console with connection details
2. WHEN a socket authentication fails, THE Socket_Service SHALL log the error with user identification details
3. WHEN a message broadcast fails, THE Socket_Service SHALL log the error with ticket ID and message details
4. WHEN a socket event is emitted, THE Socket_Service SHALL log the event type, target room, and payload summary
5. WHEN a socket event is received, THE client SHALL log the event type and payload summary
6. IF a socket error occurs, THEN THE system SHALL display a user-friendly error message in the chat interface

### Requirement 8: CORS Configuration

**User Story:** As a system administrator, I want proper CORS configuration for Socket.IO, so that frontend clients can connect from the correct origin.

#### Acceptance Criteria

1. THE Socket_Service SHALL configure CORS to allow connections from the frontend URL (process.env.FRONTEND_URL or http://localhost:3000)
2. THE Socket_Service SHALL allow GET and POST methods for socket connections
3. WHEN a connection attempt is made from an unauthorized origin, THE Socket_Service SHALL reject the connection
4. THE CORS configuration SHALL support both development (localhost) and production environments
5. THE Socket_Service SHALL log CORS-related connection rejections for debugging

### Requirement 9: Message Persistence and Socket Sync

**User Story:** As a user, I want messages to be saved to the database before being broadcast, so that message history is preserved even if socket delivery fails.

#### Acceptance Criteria

1. WHEN a message is sent, THE Support_Controller SHALL save the message to the database first
2. WHEN the database save succeeds, THE Support_Controller SHALL broadcast the message via Socket_Service
3. IF the database save fails, THEN THE Support_Controller SHALL return an error and NOT broadcast the message
4. IF the socket broadcast fails, THE message SHALL still be saved in the database
5. WHEN a user opens a ticket, THE Support_Chat_Widget SHALL load message history from the database
6. THE socket broadcast SHALL be treated as an optimization, not the primary message delivery mechanism

### Requirement 10: Socket Authentication with JWT

**User Story:** As a security-conscious system, I want socket connections authenticated with JWT tokens, so that only authorized users can participate in support chats.

#### Acceptance Criteria

1. WHEN a socket connection is initiated, THE client SHALL send the JWT_Token in the socket handshake auth object
2. WHEN the Socket_Service receives a connection, THE Socket_Service SHALL verify the JWT_Token using the JWT_SECRET
3. WHEN JWT verification succeeds, THE Socket_Service SHALL extract user information (id, user_type, school_id) from the token
4. WHEN JWT verification fails, THE Socket_Service SHALL allow the connection but mark it as unauthenticated
5. THE Socket_Service SHALL handle both regular users and students (using admission_no for student identification)
6. THE Socket_Service SHALL assign appropriate userId based on user_type (student_${admission_no} for students, id for others)
