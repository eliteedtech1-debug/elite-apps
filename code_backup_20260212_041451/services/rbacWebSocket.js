const WebSocket = require('ws');

class RBACWebSocketService {
  constructor() {
    this.clients = new Map();
  }

  init(server) {
    this.wss = new WebSocket.Server({ server, path: '/rbac-ws' });
    
    this.wss.on('connection', (ws, req) => {
      const schoolId = new URL(req.url, 'http://localhost').searchParams.get('school_id');
      
      if (!this.clients.has(schoolId)) {
        this.clients.set(schoolId, new Set());
      }
      this.clients.get(schoolId).add(ws);

      ws.on('close', () => {
        if (this.clients.has(schoolId)) {
          this.clients.get(schoolId).delete(ws);
          if (this.clients.get(schoolId).size === 0) {
            this.clients.delete(schoolId);
          }
        }
      });
    });
  }

  broadcast(schoolId, message) {
    if (this.clients.has(schoolId)) {
      this.clients.get(schoolId).forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  notifyPermissionChange(schoolId, userId, changeType, data) {
    this.broadcast(schoolId, {
      type: 'permission_change',
      changeType,
      userId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  notifySubscriptionChange(schoolId, status) {
    this.broadcast(schoolId, {
      type: 'subscription_change',
      status,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new RBACWebSocketService();
