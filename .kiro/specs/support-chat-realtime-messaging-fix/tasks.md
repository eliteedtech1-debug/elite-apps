# Implementation Plan: Support Chat Real-Time Messaging Fix

## Overview

This implementation plan addresses the critical issue where real-time socket communication in the support chat system is not functioning properly. The plan focuses on ensuring proper socket event handling, room management, and message broadcasting between users and agents.

The implementation follows a systematic approach: first fixing the backend socket service and controller, then updating the frontend components to properly listen for and handle socket events, and finally adding comprehensive tests to verify the fix.

## Tasks

- [x] 1. Verify and enhance backend Socket.IO server configuration
  - Review socketService.js initialization in server.js or app.js
  - Ensure Socket.IO server is properly attached to HTTP server
  - Verify CORS configuration allows frontend origin
  - Add reconnection configuration (reconnectionDelay, reconnectionAttempts)
  - Add transport configuration (websocket, polling)
  - Test socket server starts without errors
  - _Requirements: 1.3, 1.4, 8.1, 8.2, 8.3, 8.4_

- [ ] 2. Fix socket authentication and connection handling
  - [x] 2.1 Update socketService.js authentication middleware
    - Verify JWT token extraction from socket.handshake.auth.token
    - Handle missing token gracefully (allow guest connections)
    - Handle invalid token gracefully (mark as unauthenticated)
    - Correctly assign userId for both regular users and students
    - Log authentication success/failure with user details
    - _Requirements: 1.3, 1.4, 1.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 2.2 Write property test for JWT authentication
    - **Property 2: JWT Authentication Success**
    - **Validates: Requirements 1.3, 1.4, 10.2, 10.3**

  - [x] 2.3 Update connection handler in socketService.js
    - Store connected users in Map (userId -> socketId)
    - Join user to school room (school_{schoolId})
    - Join user to user room (user_{userId})
    - Log connection with user identification details
    - _Requirements: 1.4, 1.6, 6.5_

  - [ ]* 2.4 Write property test for connected users tracking
    - **Property 12: Connected Users Tracking**
    - **Validates: Requirements 6.5, 6.6**

- [ ] 3. Implement ticket room management
  - [x] 3.1 Add join_support_ticket event handler in socketService.js
    - Listen for 'join_support_ticket' event from client
    - Join socket to ticket room (support_ticket_{ticketId})
    - Log room join with user and ticket details
    - _Requirements: 2.2, 2.6_

  - [x] 3.2 Add leave_support_ticket event handler in socketService.js
    - Listen for 'leave_support_ticket' event from client
    - Remove socket from ticket room (support_ticket_{ticketId})
    - Log room leave with user and ticket details
    - _Requirements: 2.4_

  - [ ]* 3.3 Write property test for ticket room membership
    - **Property 3: Ticket Room Membership**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

  - [x] 3.4 Add disconnect handler in socketService.js
    - Remove user from connectedUsers Map on disconnect
    - Log disconnection with user details
    - _Requirements: 6.6_

- [ ] 4. Fix message broadcasting in supportController.js
  - [x] 4.1 Review addMessageToTicket method
    - Verify message is saved to database first
    - Verify socketService.sendToSupportTicket is called after save
    - Ensure message includes sender information (id, name, email, user_type)
    - Wrap socket broadcast in try-catch (non-blocking)
    - Log socket broadcast success/failure
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 9.1, 9.2, 9.3, 9.4_

  - [ ]* 4.2 Write property test for message persistence before broadcast
    - **Property 9: Message Persistence Before Broadcast**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [ ]* 4.3 Write property test for database persistence regardless of socket failure
    - **Property 10: Database Persistence Regardless of Socket Failure**
    - **Validates: Requirements 9.4, 9.6**

  - [x] 4.2 Verify sendToSupportTicket method in socketService.js
    - Ensure method emits 'support_message' event to ticket room
    - Log broadcast with ticket ID and message summary
    - Handle case where io is not initialized
    - _Requirements: 3.3, 4.3_

  - [ ]* 4.5 Write property test for message broadcast to ticket room
    - **Property 4: Message Broadcast to Ticket Room**
    - **Validates: Requirements 3.2, 3.3, 4.2, 4.3**

- [x] 5. Checkpoint - Test backend socket functionality
  - Start backend server and verify Socket.IO initializes
  - Use socket.io-client or Postman to test socket connection
  - Test JWT authentication with valid and invalid tokens
  - Test join_support_ticket and leave_support_ticket events
  - Test message broadcast to ticket room
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Fix frontend socket connection in SupportChat.tsx
  - [x] 6.1 Update socket initialization useEffect
    - Get token from localStorage
    - Get server URL from environment variable
    - Initialize socket with auth token in handshake
    - Add reconnection configuration (reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 5)
    - Store socket in socketRef
    - _Requirements: 1.1, 6.1, 10.1_

  - [ ]* 6.2 Write property test for socket connection establishment
    - **Property 1: Socket Connection Establishment**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 6.3 Add socket event listeners in initialization useEffect
    - Register 'connect' event listener (log connection success)
    - Register 'support_message' event listener (handle incoming messages)
    - Register 'connect_error' event listener (log and display error)
    - Register 'disconnect' event listener (log disconnection)
    - _Requirements: 5.1, 7.1, 7.5_

  - [x] 6.4 Add cleanup function in initialization useEffect
    - Disconnect socket on component unmount
    - Remove all event listeners
    - _Requirements: 5.3, 6.2_

  - [ ]* 6.5 Write property test for event listener registration and cleanup
    - **Property 7: Event Listener Registration and Cleanup**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 7. Implement ticket room joining in SupportChat.tsx
  - [x] 7.1 Add useEffect for selectedTicket changes
    - Check if socket and selectedTicket exist
    - Emit 'join_support_ticket' event with ticket ID
    - Log room join
    - _Requirements: 2.1_

  - [x] 7.2 Add cleanup function for ticket room leaving
    - Emit 'leave_support_ticket' event for previous ticket
    - Log room leave
    - _Requirements: 2.3_

- [ ] 8. Implement message reception handler in SupportChat.tsx
  - [x] 8.1 Create handleSupportMessage function
    - Validate message structure (id, ticketId, message, sender)
    - Check if message belongs to currently selected ticket
    - If yes, append message to messages array using setMessages
    - Call scrollToBottom to scroll to new message
    - _Requirements: 3.4, 3.5, 5.4, 5.5_

  - [ ]* 8.2 Write property test for message reception and UI update
    - **Property 5: Message Reception and UI Update**
    - **Validates: Requirements 3.4, 3.5, 4.4, 4.5**

  - [x] 8.3 Add error handling in message handler
    - Wrap message processing in try-catch
    - Log any errors with message details
    - Display user-friendly error if message processing fails
    - _Requirements: 7.6_

- [ ] 9. Fix frontend socket connection in AgentSupportChat.tsx
  - [x] 9.1 Update socket initialization useEffect (same as SupportChat.tsx)
    - Get token from localStorage
    - Get server URL from environment variable
    - Initialize socket with auth token in handshake
    - Add reconnection configuration
    - Store socket in socketRef
    - _Requirements: 1.2, 6.1, 10.1_

  - [x] 9.2 Add socket event listeners (same as SupportChat.tsx)
    - Register 'connect', 'support_message', 'connect_error', 'disconnect' listeners
    - _Requirements: 5.2, 7.5_

  - [x] 9.3 Add cleanup function (same as SupportChat.tsx)
    - Disconnect socket on component unmount
    - Remove all event listeners
    - _Requirements: 5.3, 6.2_

- [ ] 10. Implement ticket room joining in AgentSupportChat.tsx
  - [x] 10.1 Add useEffect for selectedTicket changes (same as SupportChat.tsx)
    - Emit 'join_support_ticket' event with ticket ID
    - Log room join
    - _Requirements: 2.5_

  - [x] 10.2 Add cleanup function for ticket room leaving (same as SupportChat.tsx)
    - Emit 'leave_support_ticket' event for previous ticket
    - Log room leave
    - _Requirements: 2.4_

- [ ] 11. Implement message reception handler in AgentSupportChat.tsx
  - [x] 11.1 Create handleSupportMessage function (same as SupportChat.tsx)
    - Validate message structure
    - Check if message belongs to currently selected ticket
    - Append message to messages array
    - Call scrollToBottom
    - _Requirements: 4.4, 4.5, 5.4, 5.5_

  - [ ]* 11.2 Write property test for bidirectional message delivery
    - **Property 6: Bidirectional Message Delivery**
    - **Validates: Requirements 3.1-3.6, 4.1-4.6**

  - [x] 11.3 Add visual distinction for user vs agent messages
    - Use isFromUser flag to apply different styling
    - Show sender name and user type
    - _Requirements: 4.6_

- [ ] 12. Implement socket reconnection handling
  - [x] 12.1 Add reconnection logic in SupportChat.tsx
    - On 'connect' event after disconnect, check if selectedTicket exists
    - If yes, rejoin ticket room by emitting 'join_support_ticket'
    - Log reconnection and room rejoin
    - _Requirements: 6.3, 6.4_

  - [x] 12.2 Add reconnection logic in AgentSupportChat.tsx (same as SupportChat.tsx)
    - On 'connect' event after disconnect, rejoin ticket room
    - _Requirements: 6.3, 6.4_

  - [ ]* 12.3 Write property test for socket reconnection and room rejoin
    - **Property 8: Socket Reconnection and Room Rejoin**
    - **Validates: Requirements 6.3, 6.4**

- [ ] 13. Add comprehensive error handling and logging
  - [x] 13.1 Add connection error handler in SupportChat.tsx
    - Log error to console with connection details
    - Display user-friendly error message in chat UI
    - Show "Connecting..." status indicator
    - _Requirements: 7.1, 7.6_

  - [x] 13.2 Add connection error handler in AgentSupportChat.tsx (same as SupportChat.tsx)
    - Log error and display user-friendly message
    - _Requirements: 7.1, 7.6_

  - [x] 13.3 Add socket event logging in socketService.js
    - Log all emitted events with event type, target room, and payload summary
    - Log all received events with event type and payload summary
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 13.4 Add CORS error logging in socketService.js
    - Log CORS-related connection rejections with origin details
    - _Requirements: 7.5, 8.5_

- [x] 14. Checkpoint - Test frontend socket functionality
  - Open user chat in browser and check console for socket connection logs
  - Open agent chat in separate browser window
  - Create a ticket and send a message from user chat
  - Verify agent receives message instantly (check console logs)
  - Send a reply from agent chat
  - Verify user receives reply instantly (check console logs)
  - Test ticket switching (verify room join/leave logs)
  - Test reconnection (disable network, re-enable, verify messages work)
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Write integration tests
  - [ ]* 15.1 Write end-to-end message flow test
    - Test user sends message → database save → socket broadcast → agent receives
    - Test agent sends message → database save → socket broadcast → user receives
    - _Requirements: All_

  - [ ]* 15.2 Write multi-user ticket room test
    - Test multiple agents viewing same ticket
    - Test user sends message
    - Verify all agents receive message
    - _Requirements: 2.6, 3.3, 4.3_

  - [ ]* 15.3 Write ticket switching test
    - Test user switches between multiple tickets
    - Verify messages only appear for selected ticket
    - Verify room membership changes correctly
    - _Requirements: 2.1, 2.3, 2.4, 5.5_

  - [ ]* 15.4 Write reconnection scenario test
    - Test user disconnects (simulate network issue)
    - Test user reconnects
    - Verify room rejoin and message history load
    - _Requirements: 6.3, 6.4_

- [ ] 16. Final verification and cleanup
  - [x] 16.1 Manual end-to-end testing
    - Open user chat and agent chat in separate browsers
    - Test complete message flow in both directions
    - Verify no console errors
    - Verify no CORS errors
    - Test with multiple tickets
    - Test reconnection scenarios
    - _Requirements: All_

  - [x] 16.2 Code review and cleanup
    - Remove any debug console.logs (keep essential logs)
    - Ensure consistent error handling across components
    - Verify all socket event listeners have cleanup functions
    - Check for memory leaks (event listeners, socket connections)
    - _Requirements: All_

  - [x] 16.3 Update documentation
    - Document socket event flow in code comments
    - Document troubleshooting steps for socket issues
    - Update README with socket configuration requirements
    - _Requirements: All_

- [x] 17. Final checkpoint - Complete verification
  - Run all unit tests and property tests
  - Run all integration tests
  - Perform manual testing with multiple users
  - Verify socket connection logs are clear and helpful
  - Verify error messages are user-friendly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The fix focuses on ensuring proper socket event handling and room management
- Message persistence to database is the primary delivery mechanism; socket is an optimization
- All socket operations should be non-blocking and have proper error handling
