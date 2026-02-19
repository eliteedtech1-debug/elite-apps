const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const auditLog = (action, userId, resourceId, status, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    userId,
    resourceId,
    status,
    details
  };

  const logFile = path.join(logsDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

const auditMiddleware = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (req.method !== 'GET' && req.path.includes('/lesson-plans')) {
      auditLog(
        `${req.method} ${req.path}`,
        req.user?.id,
        req.params.id,
        data.success ? 'success' : 'failed',
        { body: req.body, message: data.message }
      );
    }
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = { auditLog, auditMiddleware };
