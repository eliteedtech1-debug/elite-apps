# Production .env Update Guide

**Current production .env is missing new database variables.**

---

## Add These Lines to Production .env

```bash
# New database credentials (same user for all DBs)
DB_USER_NEW=kirmaskngov_skcooly
DB_PASSWORD_NEW="Skoooly2025"

# Audit database
AUDIT_DB_NAME=elite_logs
AUDIT_DB_HOST=62.72.0.209
AUDIT_DB_USERNAME=kirmaskngov_skcooly
AUDIT_DB_PASSWORD="Skoooly2025"
AUDIT_DB_PORT=3306

# AI/Bot database
AI_DB_NAME=elite_bot
AI_DB_HOST=62.72.0.209
AI_DB_USERNAME=kirmaskngov_skcooly
AI_DB_PASSWORD="Skoooly2025"
AI_DB_PORT=3306
```

---

## Complete Production .env

```bash
# Main Database
DB_USERNAME=kirmaskngov_skcooly
DB_PASSWORD="Skoooly2025"
DB_NAME=kirmaskngov_skcooly_db
DB_HOST=62.72.0.209
DB_DIALECT=mysql
DB_PORT=3306

# New database credentials (same user for all DBs)
DB_USER_NEW=kirmaskngov_skcooly
DB_PASSWORD_NEW="Skoooly2025"

# Audit Database
AUDIT_DB_NAME=elite_logs
AUDIT_DB_HOST=62.72.0.209
AUDIT_DB_USERNAME=kirmaskngov_skcooly
AUDIT_DB_PASSWORD="Skoooly2025"
AUDIT_DB_PORT=3306

# AI/Bot Database
AI_DB_NAME=elite_bot
AI_DB_HOST=62.72.0.209
AI_DB_USERNAME=kirmaskngov_skcooly
AI_DB_PASSWORD="Skoooly2025"
AI_DB_PORT=3306

# Application
PORT=8383
JWT_SECRET_KEY=bad8u328430932930
SCHOOL_ID=1

# Cloudinary
CLOUDINARY_CLOUD_NAME=dp0qdgbih
CLOUDINARY_API_KEY=369833789917447
CLOUDINARY_API_SECRET=DIC5MumC6X0wpWb0H7gdL1z5ymQ
```

---

## Quick Add Command

```bash
# SSH to production server
ssh root@62.72.0.209

# Navigate to project
cd /root/elite-apiv2

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Add new variables
cat >> .env << 'EOF'

# New database credentials (same user for all DBs)
DB_USER_NEW=kirmaskngov_skcooly
DB_PASSWORD_NEW="Skoooly2025"

# Audit Database
AUDIT_DB_NAME=elite_logs
AUDIT_DB_HOST=62.72.0.209
AUDIT_DB_USERNAME=kirmaskngov_skcooly
AUDIT_DB_PASSWORD="Skoooly2025"
AUDIT_DB_PORT=3306

# AI/Bot Database
AI_DB_NAME=elite_bot
AI_DB_HOST=62.72.0.209
AI_DB_USERNAME=kirmaskngov_skcooly
AI_DB_PASSWORD="Skoooly2025"
AI_DB_PORT=3306
EOF

# Verify
cat .env | grep -E "AUDIT_DB|AI_DB|DB_USER_NEW"
```

---

## After Adding Variables

### 1. Test Scripts
```bash
cd /root/elite-apiv2
./scripts/pre-flight-check.sh
```

Expected output:
```
✅ kirmaskngov_skcooly_db exists
✅ elite_logs exists
✅ elite_bot exists
✅ All tables already migrated!
```

### 2. Restart Backend
```bash
pm2 restart elite-api
# or
npm run dev
```

### 3. Verify Backend Logs
```bash
pm2 logs elite-api

# Should see:
# ✅ Main DB connected: kirmaskngov_skcooly_db
# ✅ Audit DB connected: elite_logs
# ✅ AI DB connected: elite_bot
```

---

## Notes

- Same user (`kirmaskngov_skcooly`) for all databases
- Same password (`Skoooly2025`) for all databases
- Same host (`62.72.0.209`) for all databases
- Main DB name: `kirmaskngov_skcooly_db` (not `full_skcooly`)

---

*Production .env update guide - 2026-02-11*
