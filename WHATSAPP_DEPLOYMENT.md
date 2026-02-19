# WhatsApp Integration Deployment Guide

## Overview
Queue-based WhatsApp messaging system using Baileys library (no Chromium dependency).

## Architecture

```
[UI] → [API] → [Redis Queue] → [Worker] → [Baileys] → [WhatsApp]
```

### Components
- **API**: Queues messages via `/api/whatsapp/send-with-pdf`
- **Worker**: Background process that sends queued messages
- **Baileys**: WhatsApp Web API library
- **Redis**: Message queue (Bull)

## Prerequisites

### Required
- Node.js 18+
- MySQL 8.0+
- Redis 6.0+

### Optional
- PM2 (for production process management)

## Installation

### 1. Install Dependencies
```bash
cd elscholar-api
npm install @whiskeysockets/baileys@^7.0.0-rc.9 bullmq redis
```

### 2. Database Setup
```bash
mysql -u root full_skcooly << EOF
ALTER TABLE messaging_usage 
MODIFY created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;
EOF
```

### 3. Start Redis
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis

# Verify
redis-cli ping  # Should return PONG
```

## Configuration

### Environment Variables (.env)
```bash
# Redis
REDIS_URL=redis://localhost:6379

# WhatsApp
WHATSAPP_SESSION_PATH=.baileys_auth
```

### Session Storage
Sessions are stored in `.baileys_auth/session-{school_id}_{short_name}/`

**Important**: Add to `.gitignore`:
```
.baileys_auth/
```

## Deployment

### Development

#### Start API Server
```bash
cd elscholar-api
npm run dev
```

#### Start Worker
```bash
cd elscholar-api
node src/queues/whatsappWorker.js > logs/whatsapp-worker.log 2>&1 &
```

### Production

#### Using PM2

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [
    {
      name: 'elscholar-api',
      script: 'src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 34567
      }
    },
    {
      name: 'whatsapp-worker',
      script: 'src/queues/whatsappWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

**Start services**:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enable auto-start on reboot
```

#### Using systemd

**API Service** (`/etc/systemd/system/elscholar-api.service`):
```ini
[Unit]
Description=ElScholar API Server
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/elscholar-api
ExecStart=/usr/bin/node src/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Worker Service** (`/etc/systemd/system/whatsapp-worker.service`):
```ini
[Unit]
Description=WhatsApp Worker
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/elscholar-api
ExecStart=/usr/bin/node src/queues/whatsappWorker.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Enable and start**:
```bash
sudo systemctl enable elscholar-api whatsapp-worker
sudo systemctl start elscholar-api whatsapp-worker
```

## Usage

### 1. Connect WhatsApp

**API Request**:
```bash
curl -X POST http://localhost:34567/api/whatsapp/connect \
  -H 'Content-Type: application/json' \
  -d '{
    "school_id": "SCH/23",
    "short_name": "DKG"
  }'
```

**Response**:
```json
{
  "success": true,
  "qr_code": "data:image/png;base64,...",
  "message": "Scan QR code with WhatsApp"
}
```

**Action**: Scan QR code with WhatsApp mobile app (Settings → Linked Devices → Link a Device)

### 2. Check Status

```bash
curl http://localhost:34567/api/whatsapp/status?school_id=SCH/23
```

**Response**:
```json
{
  "connected": true,
  "phone": "2349124611644",
  "school_id": "SCH/23"
}
```

### 3. Send Message with PDF

```bash
curl -X POST http://localhost:34567/api/whatsapp/send-with-pdf \
  -H 'Content-Type: application/json' \
  -d '{
    "school_id": "SCH/23",
    "phone": "07035384184",
    "message": "Payment receipt",
    "pdfBase64": "JVBERi0xLjQK...",
    "filename": "receipt.pdf"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "WhatsApp message with PDF queued for sending",
  "job_id": "31",
  "data": {
    "queued_at": "2026-02-08T18:28:55.411Z",
    "phone": "2347035384184"
  }
}
```

**Note**: Phone numbers are automatically normalized:
- `07035384184` → `2347035384184`
- `08012345678` → `2348012345678`
- `09087654321` → `2349087654321`

## Monitoring

### Check Worker Status
```bash
# PM2
pm2 status whatsapp-worker
pm2 logs whatsapp-worker

# systemd
sudo systemctl status whatsapp-worker
sudo journalctl -u whatsapp-worker -f

# Manual
tail -f logs/whatsapp-worker.log
```

### Check Queue Status
```bash
redis-cli
> KEYS bull:whatsapp:*
> LLEN bull:whatsapp:wait
> LLEN bull:whatsapp:active
> LLEN bull:whatsapp:failed
```

### Database Monitoring
```sql
-- Check subscription usage
SELECT * FROM messaging_usage 
WHERE service_type = 'whatsapp' 
ORDER BY created_at DESC LIMIT 10;

-- Check message history
SELECT * FROM whatsapp_messages 
ORDER BY created_at DESC LIMIT 10;

-- Check connection status
SELECT * FROM whatsapp_connections 
WHERE school_id = 'SCH/23';
```

## Troubleshooting

### Worker Not Processing Jobs

**Check worker is running**:
```bash
ps aux | grep whatsappWorker
```

**Check Redis connection**:
```bash
redis-cli ping
```

**Restart worker**:
```bash
# PM2
pm2 restart whatsapp-worker

# systemd
sudo systemctl restart whatsapp-worker

# Manual
pkill -f whatsappWorker
node src/queues/whatsappWorker.js > logs/whatsapp-worker.log 2>&1 &
```

### Connection Issues

**Clear stale session**:
```bash
rm -rf .baileys_auth/session-SCH_23_*
```

**Reconnect**:
```bash
curl -X POST http://localhost:34567/api/whatsapp/connect \
  -H 'Content-Type: application/json' \
  -d '{"school_id": "SCH/23", "short_name": "DKG"}'
```

### Messages Not Sending

**Check worker logs**:
```bash
tail -50 logs/whatsapp-worker.log | grep -E "job|error|failed"
```

**Check subscription**:
```sql
SELECT ms.*, mp.* 
FROM messaging_subscriptions ms
JOIN messaging_packages mp ON ms.package_id = mp.id
WHERE ms.school_id = 'SCH/23' 
  AND mp.service_type = 'whatsapp'
  AND ms.status = 'active';
```

**Retry failed jobs**:
```bash
redis-cli
> LRANGE bull:whatsapp:failed 0 -1
> # Note job IDs, then in Node.js:
```

```javascript
const { Queue } = require('bullmq');
const queue = new Queue('whatsapp', { connection: { host: 'localhost', port: 6379 } });
await queue.retryJobs({ count: 10 });
```

### High Memory Usage

**Check queue size**:
```bash
redis-cli
> LLEN bull:whatsapp:wait
```

**Clear old jobs**:
```bash
redis-cli
> DEL bull:whatsapp:completed
> DEL bull:whatsapp:failed
```

**Configure job retention** (in `whatsappQueue.js`):
```javascript
removeOnComplete: { count: 100 },
removeOnFail: { count: 50 }
```

## Security

### Session Files
- Store `.baileys_auth/` outside web root
- Set proper permissions: `chmod 700 .baileys_auth`
- Never commit to git

### API Access
- Require authentication for all endpoints
- Validate `school_id` matches authenticated user
- Rate limit WhatsApp endpoints

### Phone Numbers
- Validate format before queuing
- Sanitize input (remove special characters)
- Log all sends for audit trail

## Performance

### Optimization Tips
1. **Batch Processing**: Queue multiple messages, worker processes sequentially
2. **Connection Pooling**: One connection per school, reused for all messages
3. **Rate Limiting**: Add delays between sends to avoid WhatsApp blocks
4. **Caching**: Cache subscription data to reduce DB queries

### Scaling
- **Horizontal**: Run multiple workers (one per school recommended)
- **Vertical**: Increase worker memory if handling large PDFs
- **Redis**: Use Redis Cluster for high-volume deployments

## Maintenance

### Daily
- Monitor worker logs for errors
- Check queue depth
- Verify connection status

### Weekly
- Review failed jobs
- Clean up old completed jobs
- Check disk space for session files

### Monthly
- Audit subscription usage
- Review performance metrics
- Update Baileys library if needed

## Backup & Recovery

### Backup Session Files
```bash
tar -czf baileys-sessions-$(date +%Y%m%d).tar.gz .baileys_auth/
```

### Restore Session
```bash
tar -xzf baileys-sessions-20260208.tar.gz
```

### Database Backup
```bash
mysqldump -u root full_skcooly \
  messaging_subscriptions \
  messaging_usage \
  whatsapp_connections \
  whatsapp_messages \
  > whatsapp-backup-$(date +%Y%m%d).sql
```

## Migration from Chromium-based System

### 1. Stop Old Service
```bash
pm2 stop whatsapp-service  # or equivalent
```

### 2. Archive Old Sessions
```bash
mv .wwebjs_auth .wwebjs_auth.OLD
mv .wwebjs_cache .wwebjs_cache.OLD
```

### 3. Deploy New System
Follow installation steps above

### 4. Reconnect WhatsApp
Each school must scan QR code again

### 5. Update Frontend
Deploy updated UI with queue-based messaging

## Support

### Logs Location
- API: `logs/api.log`
- Worker: `logs/whatsapp-worker.log`
- Redis: `/var/log/redis/redis-server.log`

### Key Files
- Service: `src/services/baileysWhatsappService.js`
- Routes: `src/routes/whatsapp_service.js`
- Worker: `src/queues/whatsappWorker.js`
- Queue: `src/queues/whatsappQueue.js`

### Common Issues
1. **QR code not generating**: Clear stale sessions
2. **Worker not starting**: Check Redis connection
3. **Messages queued but not sent**: Restart worker
4. **Connection drops frequently**: Check network stability

---

**Version**: 1.0  
**Last Updated**: 2026-02-08  
**Maintainer**: Development Team
