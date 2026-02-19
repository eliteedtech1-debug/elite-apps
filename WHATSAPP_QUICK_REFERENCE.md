# WhatsApp Integration - Quick Reference

## 🚀 Start Services

```bash
# API Server
cd elscholar-api && npm run dev

# Worker
cd elscholar-api && node src/queues/whatsappWorker.js > logs/whatsapp-worker.log 2>&1 &
```

## 📱 Connect WhatsApp

```bash
curl -X POST http://localhost:34567/api/whatsapp/connect \
  -H 'Content-Type: application/json' \
  -d '{"school_id": "SCH/23", "short_name": "DKG"}'
```

Scan QR code with WhatsApp mobile app.

## 📤 Send Message

```bash
curl -X POST http://localhost:34567/api/whatsapp/send-with-pdf \
  -H 'Content-Type: application/json' \
  -d '{
    "school_id": "SCH/23",
    "phone": "07035384184",
    "message": "Your receipt",
    "pdfBase64": "BASE64_STRING",
    "filename": "receipt.pdf"
  }'
```

## 🔍 Check Status

```bash
# Connection status
curl http://localhost:34567/api/whatsapp/status?school_id=SCH/23

# Worker status
ps aux | grep whatsappWorker

# Queue status
redis-cli LLEN bull:whatsapp:wait

# Recent messages
mysql -u root full_skcooly -e "SELECT * FROM whatsapp_messages ORDER BY id DESC LIMIT 5;"
```

## 🔧 Troubleshooting

```bash
# Restart worker
pkill -f whatsappWorker
node src/queues/whatsappWorker.js > logs/whatsapp-worker.log 2>&1 &

# Clear session
rm -rf .baileys_auth/session-SCH_23_*

# Check logs
tail -f logs/whatsapp-worker.log
```

## 📊 Monitoring

```bash
# Worker logs
tail -f logs/whatsapp-worker.log

# Redis queue
redis-cli
> KEYS bull:whatsapp:*
> LLEN bull:whatsapp:wait

# Database stats
mysql -u root full_skcooly -e "
  SELECT COUNT(*) as total_sent 
  FROM whatsapp_messages;
"
```

## 📞 Phone Format

Nigerian numbers are auto-normalized:
- `07035384184` → `2347035384184`
- `08012345678` → `2348012345678`
- `09087654321` → `2349087654321`

## 🔐 Important Files

- **Service**: `src/services/baileysWhatsappService.js`
- **Routes**: `src/routes/whatsapp_service.js`
- **Worker**: `src/queues/whatsappWorker.js`
- **Sessions**: `.baileys_auth/`
- **Logs**: `logs/whatsapp-worker.log`

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Worker not processing | Restart worker |
| Connection drops | Clear session and reconnect |
| Messages not sending | Check subscription status |
| Queue stuck | Check Redis connection |

## 📚 Full Documentation

- **Deployment**: `WHATSAPP_DEPLOYMENT.md`
- **Summary**: `WHATSAPP_IMPLEMENTATION_SUMMARY.md`
