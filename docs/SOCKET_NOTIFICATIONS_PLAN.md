# 🔔 Real-Time Notifications with Socket.IO - Implementation Plan

## Overview
Add real-time internal communication and notifications without disrupting existing functionality.

---

## Phase 1: Backend Socket.IO Setup (2 hours)

### 1.1 Install Dependencies
```bash
cd elscholar-api
npm install socket.io socket.io-redis --legacy-peer-deps
```

### 1.2 Create Socket Service
**File:** `elscholar-api/src/services/socketService.js`
```javascript
const socketIO = require('socket.io');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> socketId
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    // Redis adapter for multi-server support
    const pubClient = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    });
    const subClient = pubClient.duplicate();
    this.io.adapter(createAdapter(pubClient, subClient));

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;
      const schoolId = socket.handshake.auth.schoolId;
      const branchId = socket.handshake.auth.branchId;

      if (!token || !userId) {
        return next(new Error('Authentication required'));
      }

      socket.userId = userId;
      socket.schoolId = schoolId;
      socket.branchId = branchId;
      next();
    });
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`);
      
      this.userSockets.set(socket.userId, socket.id);
      socket.join(`school:${socket.schoolId}`);
      socket.join(`branch:${socket.branchId}`);
      socket.join(`user:${socket.userId}`);

      socket.on('disconnect', () => {
        this.userSockets.delete(socket.userId);
        console.log(`User ${socket.userId} disconnected`);
      });
    });
  }

  // Send to specific user
  notifyUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Send to all users in a school
  notifySchool(schoolId, event, data) {
    this.io.to(`school:${schoolId}`).emit(event, data);
  }

  // Send to all users in a branch
  notifyBranch(branchId, event, data) {
    this.io.to(`branch:${branchId}`).emit(event, data);
  }

  // Send to multiple users
  notifyUsers(userIds, event, data) {
    userIds.forEach(userId => this.notifyUser(userId, event, data));
  }
}

module.exports = new SocketService();
```

### 1.3 Initialize in Server
**File:** `elscholar-api/src/index.js`
```javascript
const socketService = require('./services/socketService');

// After creating HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Initialize Socket.IO
socketService.initialize(server);
```

---

## Phase 2: Notification System (3 hours)

### 2.1 Create Notification Model
**File:** `elscholar-api/src/models/Notification.js`
```javascript
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true
    },
    school_id: {
      type: DataTypes.STRING(10),
      allowNull: false,
      index: true
    },
    branch_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      index: true
    },
    type: {
      type: DataTypes.ENUM(
        'payment', 'admission', 'attendance', 'grade', 
        'announcement', 'message', 'system', 'alert'
      ),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true
    },
    link: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'notifications',
    timestamps: true,
    indexes: [
      { fields: ['user_id', 'is_read'] },
      { fields: ['school_id', 'created_at'] }
    ]
  });

  return Notification;
};
```

### 2.2 Create Notification Service
**File:** `elscholar-api/src/services/notificationService.js`
```javascript
const db = require('../models');
const socketService = require('./socketService');

class NotificationService {
  async create({ userId, schoolId, branchId, type, title, message, data, link }) {
    const notification = await db.Notification.create({
      user_id: userId,
      school_id: schoolId,
      branch_id: branchId,
      type,
      title,
      message,
      data,
      link
    });

    // Send real-time notification
    socketService.notifyUser(userId, 'notification', {
      id: notification.id,
      type,
      title,
      message,
      data,
      link,
      created_at: notification.createdAt
    });

    return notification;
  }

  async createBulk(notifications) {
    const created = await db.Notification.bulkCreate(notifications);
    
    // Group by user and send
    const byUser = {};
    created.forEach(n => {
      if (!byUser[n.user_id]) byUser[n.user_id] = [];
      byUser[n.user_id].push(n);
    });

    Object.entries(byUser).forEach(([userId, notifs]) => {
      socketService.notifyUser(parseInt(userId), 'notifications', notifs);
    });

    return created;
  }

  async markAsRead(notificationId, userId) {
    await db.Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { id: notificationId, user_id: userId } }
    );
  }

  async markAllAsRead(userId) {
    await db.Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: userId, is_read: false } }
    );
  }

  async getUnreadCount(userId) {
    return await db.Notification.count({
      where: { user_id: userId, is_read: false }
    });
  }

  async getUserNotifications(userId, { limit = 20, offset = 0, unreadOnly = false }) {
    const where = { user_id: userId };
    if (unreadOnly) where.is_read = false;

    return await db.Notification.findAll({
      where,
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });
  }
}

module.exports = new NotificationService();
```

### 2.3 Create Notification Routes
**File:** `elscholar-api/src/routes/notifications.js`
```javascript
const router = require('express').Router();
const notificationService = require('../services/notificationService');

router.get('/notifications', async (req, res) => {
  const { limit, offset, unread_only } = req.query;
  const notifications = await notificationService.getUserNotifications(
    req.user.id,
    { limit, offset, unreadOnly: unread_only === 'true' }
  );
  res.json({ success: true, data: notifications });
});

router.get('/notifications/unread-count', async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  res.json({ success: true, count });
});

router.put('/notifications/:id/read', async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.id);
  res.json({ success: true });
});

router.put('/notifications/mark-all-read', async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.json({ success: true });
});

module.exports = router;
```

---

## Phase 3: Frontend Integration (2 hours)

### 3.1 Install Socket.IO Client
```bash
cd elscholar-ui
npm install socket.io-client
```

### 3.2 Create Socket Context
**File:** `elscholar-ui/src/contexts/SocketContext.tsx`
```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { server_url } from '../feature-module/Utils/Helper';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  notifications: any[];
  unreadCount: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  notifications: [],
  unreadCount: 0
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('@@auth_token');
    const userId = localStorage.getItem('user_id');
    const schoolId = localStorage.getItem('school_id');
    const branchId = localStorage.getItem('branch_id');

    if (!token || !userId) return;

    const newSocket = io(server_url, {
      auth: { token, userId, schoolId, branchId }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    newSocket.on('notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, notifications, unreadCount }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
```

### 3.3 Add Notification Bell Component
**File:** `elscholar-ui/src/core/common/NotificationBell.tsx`
```typescript
import React, { useState, useEffect } from 'react';
import { Badge, Dropdown, List, Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useSocket } from '../../contexts/SocketContext';
import { _getAsync, _putAsync } from '../../feature-module/Utils/Helper';

const NotificationBell = () => {
  const { notifications, unreadCount } = useSocket();
  const [allNotifications, setAllNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const data = await _getAsync('/notifications?limit=10');
    setAllNotifications(data);
  };

  const markAsRead = async (id: number) => {
    await _putAsync(`/notifications/${id}/read`);
    loadNotifications();
  };

  const markAllAsRead = async () => {
    await _putAsync('/notifications/mark-all-read');
    loadNotifications();
  };

  const menu = (
    <div style={{ width: 350, maxHeight: 400, overflow: 'auto' }}>
      <div style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
        <Button size="small" onClick={markAllAsRead}>Mark all as read</Button>
      </div>
      <List
        dataSource={allNotifications}
        renderItem={(item: any) => (
          <List.Item
            onClick={() => markAsRead(item.id)}
            style={{ 
              cursor: 'pointer',
              background: item.is_read ? 'white' : '#f0f7ff'
            }}
          >
            <List.Item.Meta
              title={item.title}
              description={item.message}
            />
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Dropdown overlay={menu} trigger={['click']}>
      <Badge count={unreadCount} offset={[-5, 5]}>
        <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
      </Badge>
    </Dropdown>
  );
};

export default NotificationBell;
```

---

## Phase 4: Integration Points (1 hour)

### 4.1 Trigger Notifications in Existing Code
**Example: Payment Created**
```javascript
// In PaymentsController.js
const notificationService = require('../services/notificationService');

// After payment creation
await notificationService.create({
  userId: payment.created_by,
  schoolId: payment.school_id,
  branchId: payment.branch_id,
  type: 'payment',
  title: 'Payment Received',
  message: `Payment of ₦${payment.amount} received from ${payment.student_name}`,
  data: { payment_id: payment.id },
  link: `/fees-collections/fees-view/${payment.item_id}`
});
```

### 4.2 Common Notification Triggers
```javascript
// Student admission
notificationService.create({
  type: 'admission',
  title: 'New Student Admitted',
  message: `${student.student_name} has been admitted`
});

// Grade published
notificationService.create({
  type: 'grade',
  title: 'Results Published',
  message: `${exam.name} results are now available`
});

// Attendance alert
notificationService.create({
  type: 'alert',
  title: 'Attendance Alert',
  message: `${student.student_name} is absent today`
});
```

---

## Phase 5: Testing (1 hour)

### 5.1 Test Checklist
- [ ] Socket connection established
- [ ] Real-time notification received
- [ ] Notification badge updates
- [ ] Mark as read works
- [ ] Multi-tab synchronization
- [ ] Reconnection after disconnect
- [ ] Multi-tenant isolation

---

## Benefits

✅ **Non-Disruptive:** Runs alongside existing system  
✅ **Scalable:** Redis adapter for multi-server  
✅ **Real-Time:** Instant notifications  
✅ **Persistent:** Stored in database  
✅ **Multi-Tenant:** School/branch isolation  
✅ **Flexible:** Easy to add new notification types  

---

## Timeline: 9 hours total
- Phase 1: 2 hours
- Phase 2: 3 hours
- Phase 3: 2 hours
- Phase 4: 1 hour
- Phase 5: 1 hour

---

**Status:** Ready for implementation  
**Risk:** Low (isolated feature)  
**Dependencies:** Redis (already installed)
