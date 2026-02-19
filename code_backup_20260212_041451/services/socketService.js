const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    // Authentication middleware
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      // Allow connection without token for now (will validate on specific events)
      if (!token) {
        console.log('⚠️ Socket connection without token - allowing for students');
        socket.userId = `guest_${Date.now()}`;
        socket.schoolId = 'unknown';
        socket.userType = 'guest';
        return next();
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('🔐 Socket auth decoded:', { user_type: decoded.user_type, admission_no: decoded.admission_no, id: decoded.id });
        
        // Handle both regular users and students
        if (decoded.user_type === 'Student') {
          socket.userId = `student_${decoded.admission_no}`;
          socket.admissionNo = decoded.admission_no;
          console.log('👨‍🎓 Student socket userId:', socket.userId);
        } else {
          socket.userId = decoded.id;
          console.log('👤 User socket userId:', socket.userId);
        }
        
        socket.schoolId = decoded.school_id;
        socket.userType = decoded.user_type;
        next();
      } catch (err) {
        console.error('❌ Socket authentication error:', err.message);
        // Allow connection but mark as unauthenticated
        socket.userId = `unauth_${Date.now()}`;
        socket.schoolId = 'unknown';
        socket.userType = 'unauthenticated';
        next();
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`✅ User ${socket.userId} (${socket.userType}) connected`);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, socket.id);
      socket.join(`school_${socket.schoolId}`);
      socket.join(`user_${socket.userId}`);
      
      console.log(`📍 User ${socket.userId} joined rooms: school_${socket.schoolId}, user_${socket.userId}`);

      socket.on('disconnect', () => {
        console.log(`❌ User ${socket.userId} disconnected`);
        this.connectedUsers.delete(socket.userId);
      });

      // Handle join events from client
      socket.on('join', (data) => {
        console.log(`🔗 Join event received:`, data);
      });

      // Mark notifications as read
      socket.on('mark_read', async (notificationIds) => {
        await this.markNotificationsRead(socket.userId, notificationIds);
      });
    });
  }

  // Send notification to specific user
  sendToUser(userId, notification) {
    console.log(`📤 Sending notification to user: ${userId}`, notification);
    console.log(`🔍 Connected users:`, Array.from(this.connectedUsers.keys()));
    this.io.to(`user_${userId}`).emit('notification', notification);
  }

  // Send to all users in school
  sendToSchool(schoolId, notification) {
    this.io.to(`school_${schoolId}`).emit('notification', notification);
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  async markNotificationsRead(userId, notificationIds) {
    const auditDB = require('../models/audit');
    await auditDB.sequelize.query(
      'UPDATE elite_logs SET is_read = 1 WHERE id IN (:ids) AND user_id = :userId',
      { replacements: { ids: notificationIds, userId } }
    );
  }
}

module.exports = new SocketService();
