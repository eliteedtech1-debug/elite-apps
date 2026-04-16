# Jitsi Reverse Proxy Configuration Fix

## Issue
The current Apache proxy strips the `/jitsi` prefix, causing Jitsi to not work properly. We need to fix the proxy to properly forward requests.

## Required Apache Configuration

Replace the current `/jitsi` location block with this corrected version:

```apache
<Location /jitsi>
    # Preserve the /jitsi path when proxying
    ProxyPass http://localhost:8000/
    ProxyPassReverse http://localhost:8000/

    # WebSocket support for Jitsi
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/jitsi/?(.*) ws://localhost:8000/$1 [P,L]

    # Standard proxy headers
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}s"
</Location>

# Specific endpoints that need special handling
<LocationMatch "^/jitsi/(http-bind|xmpp-websocket)">
    ProxyPass http://localhost:8000/
    ProxyPassReverse http://localhost:8000/
    ProxyPreserveHost On
</LocationMatch>
```

## Alternative: Use ProxyPass without LocationMatch

If the above doesn't work, use this simpler approach:

```apache
# Main Jitsi proxy - NO path stripping!
ProxyPass /jitsi/ http://localhost:8000/ nocanon
ProxyPassReverse /jitsi/ http://localhost:8000/

# BOSH endpoint
ProxyPass /jitsi/http-bind http://localhost:8000/http-bind nocanon
ProxyPassReverse /jitsi/http-bind http://localhost:8000/http-bind

# WebSocket endpoint
ProxyPass /jitsi/xmpp-websocket ws://localhost:8000/xmpp-websocket nocanon
ProxyPassReverse /jitsi/xmpp-websocket ws://localhost:8000/xmpp-websocket

# External API
ProxyPass /jitsi/external_api.js http://localhost:8000/external_api.js
ProxyPassReverse /jitsi/external_api.js http://localhost:8000/external_api.js
```

## Required Apache Modules

Make sure these modules are enabled:

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod headers
sudo a2enmod rewrite
sudo systemctl restart apache2
```

## Verification

After applying the fix, test these URLs:

```bash
# 1. External API should load
curl -I https://server.brainstorm.ng/jitsi/external_api.js
# Expected: HTTP/1.1 200 OK, Content-Type: application/javascript

# 2. Main page should load
curl -I https://server.brainstorm.ng/jitsi/
# Expected: HTTP/1.1 200 OK, Content-Type: text/html

# 3. BOSH endpoint
curl -I https://server.brainstorm.ng/jitsi/http-bind
# Expected: HTTP/1.1 200 OK or 404 (but should connect)

# 4. Check from browser
# Visit: https://server.brainstorm.ng/jitsi/
# Should see Jitsi Meet interface
```

## What the Frontend Expects

The Elite Core frontend is now configured to use:

- **External API**: `https://server.brainstorm.ng/jitsi/external_api.js`
- **BOSH**: `https://server.brainstorm.ng/jitsi/http-bind`
- **WebSocket**: `wss://server.brainstorm.ng/jitsi/xmpp-websocket`
- **Domain**: `server.brainstorm.ng`

## Troubleshooting

### If external_api.js returns 404:
- Check if Jitsi container is running: `docker ps | grep jitsi`
- Check if port 8000 is accessible locally: `curl http://localhost:8000/external_api.js`
- Check Apache error logs: `sudo tail -f /var/log/apache2/error.log`

### If getting CORS errors:
Add these headers to the Apache config:
```apache
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type"
```

### If WebSocket connection fails:
- Ensure `mod_proxy_wstunnel` is enabled
- Check WebSocket is properly proxied
- Verify firewall allows WebSocket connections

## Success Criteria

✅ `https://server.brainstorm.ng/jitsi/external_api.js` returns JavaScript file
✅ `https://server.brainstorm.ng/jitsi/` shows Jitsi Meet interface
✅ Can create and join a test meeting at `https://server.brainstorm.ng/jitsi/testroom123`
✅ No CORS errors in browser console
✅ WebSocket connection works (check browser network tab)

## Next Steps After Fix

Once the proxy is working:
1. Verify Jitsi loads in browser at `https://server.brainstorm.ng/jitsi/`
2. Test creating a room manually
3. Elite Core frontend will automatically work
4. Teachers will join as moderators
5. Students will join as participants
6. No lobby waiting!
