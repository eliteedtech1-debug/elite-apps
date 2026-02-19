const jwt = require('jsonwebtoken');

const setupRecitationSocket = (io) => {
  // Socket authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id} (${socket.user.user_type})`);

    // Join user to appropriate rooms based on role
    const joinRooms = () => {
      const { user_type, id, class_code, branch_id } = socket.user;

      // Join user-specific room
      if (user_type === 'Teacher') {
        socket.join(`teacher:${id}`);
        console.log(`Teacher ${id} joined teacher room`);
      } else if (user_type === 'Student') {
        socket.join(`student:${id}`);
        
        // Join class room if student has class
        if (class_code) {
          socket.join(`class:${class_code}`);
          console.log(`Student ${id} joined class room: ${class_code}`);
        }
      }

      // Join branch room if applicable
      if (branch_id) {
        socket.join(`branch:${branch_id}`);
      }
    };

    joinRooms();

    // Handle joining specific class rooms (for teachers)
    socket.on('join:class', (classId) => {
      if (socket.user.user_type === 'Teacher') {
        socket.join(`class:${classId}`);
        console.log(`Teacher ${socket.user.id} joined class room: ${classId}`);
        socket.emit('joined:class', { classId });
      }
    });

    // Handle leaving class rooms
    socket.on('leave:class', (classId) => {
      socket.leave(`class:${classId}`);
      console.log(`User ${socket.user.id} left class room: ${classId}`);
      socket.emit('left:class', { classId });
    });

    // Handle recitation status updates
    socket.on('recitation:status', (data) => {
      const { recitation_id, status } = data;
      
      // Broadcast status update to relevant users
      if (socket.user.user_type === 'Teacher') {
        socket.to(`class:${data.class_id}`).emit('recitation:status_update', {
          recitation_id,
          status,
          updated_by: socket.user.id
        });
      }
    });

    // Handle typing indicators for comments
    socket.on('feedback:typing', (data) => {
      const { reply_id, is_typing } = data;
      
      if (socket.user.user_type === 'Teacher') {
        socket.to(`student:${data.admission_no}`).emit('feedback:typing_update', {
          reply_id,
          is_typing,
          teacher_id: socket.user.id
        });
      }
    });

    // Handle real-time audio playback status
    socket.on('audio:playing', (data) => {
      const { recitation_id, audio_type, position } = data; // audio_type: 'recitation' | 'reply'
      
      // Broadcast to other users in the same context
      socket.broadcast.emit('audio:status', {
        recitation_id,
        audio_type,
        position,
        user_id: socket.user.id,
        user_type: socket.user.user_type
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.user.id} (${reason})`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.id}:`, error);
    });
  });

  // Helper function to emit to specific user types in a class
  const emitToClass = (classId, event, data, userType = null) => {
    const room = `class:${classId}`;
    
    if (userType) {
      // Filter by user type if specified
      const sockets = io.sockets.adapter.rooms.get(room);
      if (sockets) {
        sockets.forEach(socketId => {
          const socket = io.sockets.sockets.get(socketId);
          if (socket && socket.user.user_type === userType) {
            socket.emit(event, data);
          }
        });
      }
    } else {
      io.to(room).emit(event, data);
    }
  };

  // Helper function to emit to specific teacher
  const emitToTeacher = (teacherId, event, data) => {
    io.to(`teacher:${teacherId}`).emit(event, data);
  };

  // Helper function to emit to specific student
  const emitToStudent = (studentId, event, data) => {
    io.to(`student:${studentId}`).emit(event, data);
  };

  // Export helper functions for use in controllers
  return {
    emitToClass,
    emitToTeacher,
    emitToStudent
  };
};

module.exports = setupRecitationSocket;
