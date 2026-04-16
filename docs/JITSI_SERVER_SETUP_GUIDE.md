# Jitsi Server Configuration Guide for server.brainstorm.ng

## Overview
This guide provides instructions for setting up and configuring Jitsi Meet on `server.brainstorm.ng` to work with the Elite Core virtual classroom system.

---

## Current Status

**Server**: `server.brainstorm.ng`
**Ports Required**:
- HTTP: `8000`
- HTTPS: `8443`
- JVB UDP: `10000`
- JVB TCP: `4443`

**Current Issue**: Jitsi containers not running, causing "Connection refused" on port 8000.

---

## Required Configuration

### 1. Environment Variables (.env file)

Create or update `/path/to/jitsi/.env` with these settings:

```bash
# Basic configuration
HTTP_PORT=8000
HTTPS_PORT=8443
XMPP_DOMAIN=meet.jitsi
XMPP_AUTH_DOMAIN=auth.meet.jitsi
XMPP_MUC_DOMAIN=muc.meet.jitsi
XMPP_INTERNAL_MUC_DOMAIN=internal-muc.meet.jitsi
XMPP_MUC_SUBDOMAIN=muc
XMPP_SERVER_SUBDOMAIN=xmpp
XMPP_RECORDER_DOMAIN=recorder.meet.jitsi
XMPP_CROSS_DOMAIN=recorder.meet.jitsi

# Authentication - IMPORTANT: No auth required!
AUTH_TYPE=internal
XMPP_GUEST_DOMAIN=guest.meet.jitsi

# Jicofo configuration
JICOFO_AUTH_USER=focus
JICOFO_AUTH_PASSWORD=focus1234567890

# JVB configuration
JVB_AUTH_USER=jvb
JVB_AUTH_PASSWORD=jvb1234567890
JVB_PORT=10000
JVB_TCP_PORT=4443
JVB_TCP_MAPPED_PORT=4443
JVB_BREWERY_MUC=jvbbrewery
JVB_STUN_SERVERS=stun.l.google.com:19302,stun1.l.google.com:19302
JVB_ENABLE_UDP_STUN=true
JVB_ENABLE_TCP_HARVESTER=true

# Jibri configuration (optional)
JIBRI_BREWERY_MUC=jibribrewery
JIBRI_PENDING_TIMEOUT=90

# Timezone
TZ=UTC

# Docker restart policy
RESTART_POLICY=unless-stopped

# Config directory - UPDATE THIS PATH!
CONFIG=/path/to/jitsi/config

# Web interface
ENABLE_LETSENCRYPT=0
ENABLE_HTTP_REDIRECT=0

# ⚠️ CRITICAL: Lobby and Security Settings
ENABLE_LOBBY=0          # MUST BE 0 - No lobby!
ENABLE_AUTH=0           # MUST BE 0 - No authentication!
ENABLE_GUESTS=1         # MUST BE 1 - Allow guests!
RESERVATION_ENABLED=0   # MUST BE 0 - No reservations!

# Moderator Settings
XMPP_RECORDER_DOMAIN=recorder.meet.jitsi
XMPP_FOCUS_DOMAIN=focus.meet.jitsi
XMPP_OCTO_DOMAIN=octo.meet.jitsi

# Interface configuration
JITSI_MEET_CONFIG_FILE=interface_config

# Public URL (UPDATE THIS!)
PUBLIC_URL=http://server.brainstorm.ng:8000
```

---

## 2. Docker Compose Setup

Use the standard Jitsi docker-compose.yml from the repository, ensuring it includes:

```yaml
version: '3.8'

services:
  web:
    image: jitsi/web:stable
    restart: ${RESTART_POLICY}
    ports:
      - '${HTTP_PORT}:80'
      - '${HTTPS_PORT}:443'
    environment:
      - ENABLE_LOBBY
      # ... other environment variables
    # ... rest of configuration

  prosody:
    image: jitsi/prosody:stable
    restart: ${RESTART_POLICY}
    environment:
      - ENABLE_LOBBY
      - ENABLE_AUTH
      - ENABLE_GUESTS
      # ... other environment variables

  jicofo:
    image: jitsi/jicofo:stable
    restart: ${RESTART_POLICY}
    # ... configuration

  jvb:
    image: jitsi/jvb:stable
    restart: ${RESTART_POLICY}
    ports:
      - '${JVB_PORT}:${JVB_PORT}/udp'
      - '${JVB_TCP_PORT}:${JVB_TCP_PORT}'
    # ... configuration

networks:
  meet.jitsi:
    driver: bridge
```

---

## 3. Firewall Configuration

Ensure these ports are open on the server:

```bash
# HTTP/HTTPS for web interface
sudo ufw allow 8000/tcp
sudo ufw allow 8443/tcp

# JVB for media streaming
sudo ufw allow 10000/udp
sudo ufw allow 4443/tcp

# Verify
sudo ufw status
```

---

## 4. Nginx Reverse Proxy (Optional but Recommended)

If using Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name server.brainstorm.ng;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # BOSH endpoint
    location /http-bind {
        proxy_pass http://localhost:8000/http-bind;
        proxy_set_header Host $host;
    }

    # WebSocket endpoint
    location /xmpp-websocket {
        proxy_pass http://localhost:8000/xmpp-websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 5. Custom Configuration Files

### config/web/config.js

Add these settings to disable lobby and enable proper moderation:

```javascript
var config = {
    // ... other settings

    // Lobby settings - DISABLED
    lobby: {
        enabled: false
    },

    // No authentication required
    enableUserRolesBasedOnToken: false,
    enableFeaturesBasedOnToken: false,

    // Moderator detection
    startAsModerator: true,  // This will be overridden by our API

    // Disable waiting screens
    disableLobby: true,
    enableLobby: false,
    disableWaitingForModerator: true,
    disableWaitingForOwner: true,

    // Pre-join page
    prejoinPageEnabled: false,

    // Guest access
    enableGuestAccess: true,
    requireDisplayName: false,

    // ... rest of configuration
};
```

### config/web/interface_config.js

```javascript
var interfaceConfig = {
    // ... other settings

    // Hide lobby-related UI
    DISABLE_LOBBY: true,
    HIDE_LOBBY: true,
    DISABLE_LOBBY_BUTTON: true,

    // Moderator indicators
    DISABLE_MODERATOR_INDICATOR: false,
    ENABLE_MODERATOR_INDICATOR: true,

    // ... rest of configuration
};
```

---

## 6. Start Jitsi Server

```bash
cd /path/to/jitsi

# Pull latest images
docker-compose pull

# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Verify services are healthy
docker-compose ps | grep "Up"
```

Expected output:
```
jitsi_web       Up      80/tcp, 443/tcp
jitsi_prosody   Up      5222/tcp, 5347/tcp, 5269/tcp
jitsi_jicofo    Up
jitsi_jvb       Up      10000/udp, 4443/tcp
```

---

## 7. Verification Tests

### Test 1: Check if web interface is accessible
```bash
curl -I http://server.brainstorm.ng:8000/
# Expected: HTTP/1.1 200 OK
```

### Test 2: Check if external API is available
```bash
curl -I http://server.brainstorm.ng:8000/external_api.js
# Expected: HTTP/1.1 200 OK, Content-Type: application/javascript
```

### Test 3: Check BOSH endpoint
```bash
curl -I http://server.brainstorm.ng:8000/http-bind
# Expected: HTTP/1.1 200 OK
```

### Test 4: Check WebSocket endpoint
```bash
curl -I http://server.brainstorm.ng:8000/xmpp-websocket
# Expected: HTTP/1.1 101 Switching Protocols (or similar)
```

---

## 8. Integration with Elite Core Backend

The backend is already configured to send:

**For Teachers (Moderators)**:
```javascript
{
  jitsi_config: {
    roomName: "room_xyz123",
    userInfo: {
      displayName: "Teacher Name",
      moderator: "true"  // ← CRITICAL
    },
    configOverwrite: {
      startAsModerator: true,  // ← CRITICAL
      enableLobby: false,
      disableLobby: true,
      disableWaitingForModerator: true,
      // ... other settings
    }
  }
}
```

**For Students (Participants)**:
```javascript
{
  jitsi_config: {
    roomName: "room_xyz123",
    userInfo: {
      displayName: "Student Name",
      moderator: "false"
    },
    configOverwrite: {
      startAsModerator: false,
      // ... other settings
    }
  }
}
```

---

## 9. Troubleshooting

### Issue: "Connection refused" on port 8000
**Solution**:
```bash
docker-compose down
docker-compose up -d
docker-compose logs -f web
```

### Issue: Containers keep restarting
**Solution**: Check logs for each service
```bash
docker-compose logs prosody
docker-compose logs jicofo
docker-compose logs jvb
docker-compose logs web
```

### Issue: Lobby still appears
**Solution**:
1. Verify `ENABLE_LOBBY=0` in .env
2. Restart containers: `docker-compose restart`
3. Clear browser cache
4. Check config/web/config.js has `lobby.enabled: false`

### Issue: "Waiting for moderator" message
**Solution**:
1. Verify backend is sending `startAsModerator: true` for teachers
2. Check browser console for Jitsi config
3. Ensure `ENABLE_AUTH=0` and `ENABLE_GUESTS=1` in .env

### Issue: External API not loading
**Solution**:
```bash
# Check if file exists in container
docker-compose exec web ls -la /usr/share/jitsi-meet/external_api.js

# Verify web service is running
docker-compose ps web

# Check nginx/web logs
docker-compose logs web
```

---

## 10. Monitoring and Maintenance

### Check Jitsi Status
```bash
# Container status
docker-compose ps

# Resource usage
docker stats

# Check logs
docker-compose logs -f --tail=100
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart web
docker-compose restart prosody
```

### Update Jitsi
```bash
docker-compose down
docker-compose pull
docker-compose up -d
```

---

## 11. Security Considerations

1. **Firewall**: Only open necessary ports (8000, 8443, 10000, 4443)
2. **HTTPS**: Enable Let's Encrypt for production (`ENABLE_LETSENCRYPT=1`)
3. **Rate Limiting**: Configure Nginx rate limiting to prevent abuse
4. **Room Names**: Use unique, hard-to-guess room IDs (already done in backend)
5. **Monitoring**: Set up monitoring for container health

---

## 12. Expected Behavior After Setup

### Teacher Joins Classroom:
1. Frontend loads: `http://server.brainstorm.ng:8000/external_api.js`
2. Backend sends: `startAsModerator: true`
3. Jitsi receives config with moderator flag
4. Teacher joins **immediately** as moderator
5. No lobby screen appears
6. Teacher has full controls (mute all, kick, etc.)

### Student Joins Classroom:
1. Frontend loads same external API
2. Backend sends: `startAsModerator: false`
3. Student joins **immediately** as participant
4. No lobby screen (lobby disabled)
5. Student has basic controls only

---

## 13. Quick Start Commands

```bash
# Navigate to Jitsi directory
cd /path/to/jitsi

# Create config directory if needed
mkdir -p config/{web,prosody,jicofo,jvb}

# Start Jitsi
docker-compose up -d

# Wait 30 seconds for startup
sleep 30

# Verify
curl -I http://server.brainstorm.ng:8000/
curl -I http://server.brainstorm.ng:8000/external_api.js

# Check logs
docker-compose logs -f
```

---

## 14. Configuration Checklist

- [ ] `.env` file created with all required variables
- [ ] `ENABLE_LOBBY=0` in .env
- [ ] `ENABLE_AUTH=0` in .env
- [ ] `ENABLE_GUESTS=1` in .env
- [ ] Firewall ports opened (8000, 8443, 10000, 4443)
- [ ] Docker and docker-compose installed
- [ ] Config directory created
- [ ] Docker containers started
- [ ] Web interface accessible on port 8000
- [ ] external_api.js accessible
- [ ] BOSH endpoint working
- [ ] WebSocket endpoint working

---

## 15. Contact Points

**Frontend Application**:
- URL: `http://server.brainstorm.ng:8000/external_api.js`
- Domain: `server.brainstorm.ng`
- BOSH: `http://server.brainstorm.ng:8000/http-bind`
- WebSocket: `ws://server.brainstorm.ng:8000/xmpp-websocket`

**Backend API**:
- Already configured to use above endpoints
- Sends proper moderator flags
- Includes all necessary config overrides

---

## Success Criteria

✅ Jitsi web interface loads at `http://server.brainstorm.ng:8000`
✅ External API JS file is accessible
✅ Docker containers all show "Up" status
✅ Teachers can join as moderators without lobby
✅ Students can join as participants without lobby
✅ No "waiting for moderator" messages appear
✅ Video/audio streaming works correctly

---

## Additional Resources

- Jitsi Meet Documentation: https://jitsi.github.io/handbook/
- Docker Setup Guide: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-docker
- Configuration Options: https://github.com/jitsi/docker-jitsi-meet/blob/master/env.example

---

**Last Updated**: 2025-11-10
**Server**: server.brainstorm.ng
**Jitsi Version**: stable (latest)
**Docker Compose**: v3.8
