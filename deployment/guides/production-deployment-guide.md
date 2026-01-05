# Student ID Card Generator - Production Deployment Guide

## 🎯 Overview
This guide provides comprehensive instructions for deploying the Student ID Card Generator Phase 1 to the production environment with high availability, security, and monitoring.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 LTS
- **MySQL**: Version 8.0 with replication setup
- **Redis**: Version 6.0+ (for caching and sessions)
- **Nginx**: Version 1.18+ (reverse proxy and load balancer)
- **PM2**: Process manager with cluster mode
- **SSL Certificate**: Valid SSL certificate for HTTPS

### Infrastructure Requirements
- **CPU**: Minimum 2 cores, Recommended 4+ cores
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 50GB SSD, Recommended 100GB+ SSD
- **Network**: Stable internet connection with adequate bandwidth
- **Backup Storage**: External backup solution (AWS S3, etc.)

## 🔒 Security Preparation

### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from 10.0.0.0/8 to any port 3306  # MySQL (internal network only)
sudo ufw allow from 10.0.0.0/8 to any port 6379  # Redis (internal network only)
sudo ufw enable
```

### SSL Certificate Setup

```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.elitescholar.ng

# Setup auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🚀 Production Deployment Steps

### Step 1: System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install system dependencies
sudo apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
    nginx \
    redis-server \
    mysql-client \
    htop \
    iotop \
    fail2ban

# Install PM2 globally
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash -G www-data elscholar
sudo mkdir -p /opt/elscholar-production
sudo chown elscholar:elscholar /opt/elscholar-production
```

### Step 2: Application Deployment

```bash
# Switch to application user
sudo su - elscholar

# Clone production repository
cd /opt
git clone <repository-url> elscholar-production
cd elscholar-production

# Checkout production branch
git checkout production

# Navigate to API directory
cd elscholar-api
```

### Step 3: Environment Configuration

```bash
# Copy production environment template
cp deployment/config/.env.production.template .env

# Configure production environment
nano .env
```

**Production Environment Variables:**
```bash
# Database Configuration
DB_USERNAME=prod_elscholar_user
DB_PASSWORD=STRONG_PRODUCTION_PASSWORD
DB_NAME=elscholar_production
DB_HOST=prod-db.internal.elitescholar.ng
DB_PORT=3306
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# Server Configuration
PORT=34567
NODE_ENV=production
TRUST_PROXY=1

# JWT Configuration
JWT_SECRET_KEY=VERY_STRONG_JWT_SECRET_KEY_HERE
JWT_EXPIRES_IN=24h

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=elitescholar-prod
CLOUDINARY_API_KEY=your_production_api_key
CLOUDINARY_API_SECRET=your_production_api_secret
CLOUDINARY_FOLDER=id-cards

# Redis Configuration
REDIS_HOST=prod-redis.internal.elitescholar.ng
REDIS_PORT=6379
REDIS_PASSWORD=REDIS_PRODUCTION_PASSWORD
REDIS_DB=1

# Security Configuration
HELMET_ENABLED=true
COMPRESSION_ENABLED=true
SECURITY_HEADERS=true

# Monitoring Configuration
MONITORING_ENABLED=true
METRICS_PORT=9090
PROMETHEUS_ENABLED=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400000
BACKUP_RETENTION_DAYS=30

# Frontend URL
FRONTEND_URL=https://elitescholar.ng
```

### Step 4: Database Setup

```bash
# Create production database backup point
mysqldump -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME > pre_id_card_backup.sql

# Run production migration
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME < deployment/migrations/id_card_production_migration.sql

# Verify migration success
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME -e "
SELECT 
  table_name, 
  table_rows, 
  create_time 
FROM information_schema.tables 
WHERE table_schema = '$DB_NAME' 
  AND table_name LIKE 'id_card_%';"
```

### Step 5: Dependencies and Build

```bash
# Install dependencies
./deployment/scripts/install-id-card-dependencies.sh

# Install production dependencies only
npm ci --only=production

# Build application
npm run build

# Create necessary directories with proper permissions
mkdir -p uploads/id-cards logs tmp/id-card-uploads backups
chmod 755 uploads/id-cards logs tmp/id-card-uploads backups
```

### Step 6: PM2 Production Configuration

```bash
# Create production PM2 ecosystem
cat > ecosystem.production.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "elscholar-api-prod",
      script: "./src/index.js",
      instances: "max",
      exec_mode: "cluster",
      env_file: "./.env",
      env: {
        NODE_ENV: "production",
        PORT: "34567"
      },
      watch: false,
      max_memory_restart: "1G",
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_file: "./logs/pm2-combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      kill_timeout: 5000,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: "10s",
      autorestart: true,
      cron_restart: "0 2 * * *",  // Daily restart at 2 AM
      ignore_watch: ["node_modules", "logs", "uploads", "tmp"],
      source_map_support: false,
      instance_var: "INSTANCE_ID"
    }
  ]
};
EOF

# Start application in cluster mode
pm2 start ecosystem.production.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
sudo pm2 startup systemd -u elscholar --hp /home/elscholar
```

### Step 7: Nginx Production Configuration

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/elscholar-production
```

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

# Upstream configuration
upstream elscholar_backend {
    least_conn;
    server 127.0.0.1:34567 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api.elitescholar.ng;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name api.elitescholar.ng;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.elitescholar.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.elitescholar.ng/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # File upload limits
    client_max_body_size 10M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Main API routes
    location / {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://elscholar_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
    
    # File upload endpoints (higher limits)
    location ~ ^/api/id-cards/.*/upload {
        limit_req zone=upload burst=5 nodelay;
        
        client_max_body_size 50M;
        client_body_timeout 300s;
        
        proxy_pass http://elscholar_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # Health check endpoint (no rate limiting)
    location /api/id-cards/health {
        access_log off;
        proxy_pass http://elscholar_backend;
        proxy_set_header Host $host;
    }
    
    # Metrics endpoint (restricted access)
    location /api/id-cards/metrics {
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        
        proxy_pass http://elscholar_backend;
        proxy_set_header Host $host;
    }
    
    # Static files (if any)
    location /static/ {
        alias /opt/elscholar-production/elscholar-api/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site and test configuration
sudo ln -s /etc/nginx/sites-available/elscholar-production /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 8: Monitoring and Logging Setup

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/elscholar-production
```

```
/opt/elscholar-production/elscholar-api/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 elscholar elscholar
    postrotate
        /usr/bin/pm2 reload elscholar-api-prod
    endscript
}
```

```bash
# Setup system monitoring
sudo apt install prometheus-node-exporter

# Configure PM2 monitoring
pm2 install pm2-server-monit
pm2 set pm2-server-monit:conf '{
  "email": "alerts@elitescholar.ng",
  "webhook": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
}'
```

### Step 9: Backup Automation

```bash
# Setup automated backups
crontab -e

# Add backup schedule
0 2 * * * /opt/elscholar-production/elscholar-api/deployment/scripts/backup-id-card-system.sh backup
0 6 * * 0 /opt/elscholar-production/elscholar-api/deployment/scripts/backup-id-card-system.sh cleanup
```

### Step 10: Health Checks and Verification

```bash
# Comprehensive health check
curl -f https://api.elitescholar.ng/api/id-cards/health/detailed

# Test all endpoints
./deployment/scripts/production-health-check.sh

# Load testing (optional)
npm install -g artillery
artillery quick --count 10 --num 100 https://api.elitescholar.ng/api/id-cards/health
```

## 📊 Production Monitoring

### Application Monitoring

```bash
# PM2 monitoring dashboard
pm2 monit

# Real-time logs
pm2 logs elscholar-api-prod --lines 100 -f

# System resources
htop
iotop -o
```

### Performance Metrics

```bash
# Check application metrics
curl https://api.elitescholar.ng/api/id-cards/metrics

# Database performance
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD -e "SHOW PROCESSLIST;"
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD -e "SHOW ENGINE INNODB STATUS\G"

# Redis performance
redis-cli -h $REDIS_HOST -p $REDIS_PORT info stats
```

## 🔧 Production Maintenance

### Regular Maintenance Tasks

```bash
# Weekly tasks (run every Sunday)
#!/bin/bash
# /opt/elscholar-production/maintenance/weekly.sh

# Update system packages
sudo apt update && sudo apt list --upgradable

# Clean up old logs
find /opt/elscholar-production/elscholar-api/logs -name "*.log" -mtime +30 -delete

# Optimize database
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME -e "OPTIMIZE TABLE id_card_templates, template_elements, generated_id_cards;"

# Clear Redis cache (if needed)
redis-cli -h $REDIS_HOST -p $REDIS_PORT FLUSHDB

# Restart application (during low traffic)
pm2 reload elscholar-api-prod
```

### Security Updates

```bash
# Monthly security updates
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

# Update Node.js dependencies
npm audit
npm audit fix

# Renew SSL certificates (automated via certbot)
sudo certbot renew --dry-run
```

## 🚨 Emergency Procedures

### Quick Rollback

```bash
# Emergency rollback script
#!/bin/bash
# /opt/elscholar-production/emergency-rollback.sh

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# Stop current application
pm2 stop elscholar-api-prod

# Rollback to previous stable version
git checkout production-stable
npm ci --only=production

# Rollback database if needed
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME < backups/latest/database/full_backup.sql

# Restart application
pm2 start ecosystem.production.js

echo "✅ Emergency rollback completed"
```

### Disaster Recovery

```bash
# Full system recovery
./deployment/scripts/backup-id-card-system.sh restore YYYYMMDD_HHMMSS
./deployment/scripts/rollback-id-card-generator.sh rollback
```

## 📈 Performance Optimization

### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX idx_generated_cards_student_active ON generated_id_cards(student_id, is_active);
CREATE INDEX idx_template_elements_template_order ON template_elements(template_id, display_order);
CREATE INDEX idx_audit_log_template_date ON template_audit_log(template_id, created_at);

-- Optimize tables
OPTIMIZE TABLE id_card_templates, template_elements, generated_id_cards, template_audit_log;
```

### Application Optimization

```bash
# Enable Node.js performance optimizations
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"

# Update PM2 configuration for better performance
pm2 set pm2-server-monit:conf '{"cpu_threshold": 80, "memory_threshold": 80}'
```

## 📝 Production Checklist

### Pre-Deployment
- [ ] Code reviewed and approved
- [ ] Security scan completed
- [ ] Load testing performed
- [ ] Database migration tested
- [ ] Backup strategy verified
- [ ] Rollback plan prepared

### Deployment
- [ ] Maintenance window scheduled
- [ ] Team notified
- [ ] Backup created
- [ ] Application deployed
- [ ] Health checks passing
- [ ] Performance metrics normal

### Post-Deployment
- [ ] Functionality verified
- [ ] Performance monitoring active
- [ ] Error rates normal
- [ ] User acceptance testing
- [ ] Documentation updated
- [ ] Stakeholders notified

## 📞 Production Support

### Escalation Contacts
- **Level 1**: DevOps Team - devops@elitescholar.ng
- **Level 2**: Backend Team - backend@elitescholar.ng
- **Level 3**: CTO - cto@elitescholar.ng

### Critical Alerts
- Application down: Immediate response required
- High error rate (>5%): Response within 15 minutes
- Performance degradation: Response within 30 minutes
- Security incident: Immediate response required

### Monitoring Dashboards
- Application Health: https://monitoring.elitescholar.ng/health
- Performance Metrics: https://monitoring.elitescholar.ng/metrics
- Error Tracking: https://monitoring.elitescholar.ng/errors