# Student ID Card Generator - Staging Deployment Guide

## 🎯 Overview
This guide provides step-by-step instructions for deploying the Student ID Card Generator Phase 1 to the staging environment.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **MySQL**: Version 8.0 or higher
- **PM2**: Process manager for Node.js applications
- **Git**: Version control system
- **System Dependencies**: Cairo, pkg-config (for Canvas)

### Environment Setup
- Staging server with SSH access
- Database credentials and connection details
- Cloudinary account for file storage
- SSL certificate (recommended)

## 🚀 Deployment Steps

### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install system dependencies for Canvas
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev pkg-config

# Install PM2 globally
sudo npm install -g pm2

# Create application user (optional but recommended)
sudo useradd -m -s /bin/bash elscholar
sudo usermod -aG sudo elscholar
```

### Step 2: Code Deployment

```bash
# Clone or update repository
cd /opt
sudo git clone <repository-url> elscholar-staging
cd elscholar-staging

# Switch to staging branch
git checkout staging

# Set proper ownership
sudo chown -R elscholar:elscholar /opt/elscholar-staging
```

### Step 3: Environment Configuration

```bash
# Copy staging environment template
cp deployment/config/.env.staging.template .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```bash
# Database Configuration
DB_USERNAME=staging_user
DB_PASSWORD=your_staging_password
DB_NAME=elscholar_staging
DB_HOST=staging-db.example.com
DB_PORT=3306

# Server Configuration
PORT=34567
NODE_ENV=staging

# JWT Configuration
JWT_SECRET_KEY=your_staging_jwt_secret

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL
FRONTEND_URL=https://staging.elitescholar.ng
```

### Step 4: Database Setup

```bash
# Navigate to API directory
cd elscholar-api

# Run database migration
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME < deployment/migrations/id_card_production_migration.sql

# Verify migration
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME -e "SHOW TABLES LIKE 'id_card_%';"
```

### Step 5: Dependencies Installation

```bash
# Run dependency installation script
./deployment/scripts/install-id-card-dependencies.sh

# Verify installation
npm list @react-pdf/renderer canvas jsbarcode qrcode
```

### Step 6: Application Build and Start

```bash
# Install application dependencies
npm install

# Build application (if required)
npm run build

# Create necessary directories
mkdir -p uploads/id-cards logs tmp/id-card-uploads

# Set proper permissions
chmod 755 uploads/id-cards logs tmp/id-card-uploads

# Start application with PM2
pm2 start ecosystem.config.js --env staging

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
sudo pm2 startup
```

### Step 7: Health Check Verification

```bash
# Check application status
pm2 status

# Test health endpoints
curl -X GET http://localhost:34567/api/id-cards/health
curl -X GET http://localhost:34567/api/id-cards/ready

# Check logs
pm2 logs elscholar-api --lines 50
```

### Step 8: Nginx Configuration (Optional)

```nginx
# /etc/nginx/sites-available/elscholar-staging
server {
    listen 80;
    server_name staging-api.elitescholar.ng;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging-api.elitescholar.ng;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:34567;
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
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:34567/api/id-cards/health;
        access_log off;
    }
    
    # File upload size limit
    client_max_body_size 10M;
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/elscholar-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🧪 Testing Procedures

### Automated Testing

```bash
# Run health checks
curl -f http://localhost:34567/api/id-cards/health || exit 1

# Test template endpoints
curl -X POST http://localhost:34567/api/id-cards/templates \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "Test Template",
    "template_type": "student",
    "dimensions": {"width": 336, "height": 212}
  }'

# Test file upload
curl -X POST http://localhost:34567/api/id-cards/templates/upload-logo \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "logo=@test-logo.png"
```

### Manual Testing Checklist

- [ ] Application starts successfully
- [ ] Health endpoints respond correctly
- [ ] Database connection established
- [ ] File upload functionality works
- [ ] Template CRUD operations functional
- [ ] PDF generation dependencies available
- [ ] Logging system operational
- [ ] Error handling working properly

## 📊 Monitoring Setup

### Log Monitoring

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/elscholar-staging

# Add configuration
/opt/elscholar-staging/elscholar-api/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 elscholar elscholar
    postrotate
        pm2 reload elscholar-api
    endscript
}
```

### Process Monitoring

```bash
# Setup PM2 monitoring
pm2 install pm2-server-monit

# Configure alerts (optional)
pm2 set pm2-server-monit:conf '{"email": "admin@elitescholar.ng"}'
```

## 🔧 Troubleshooting

### Common Issues

**1. Canvas Installation Fails**
```bash
# Install missing system dependencies
sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**2. Database Connection Issues**
```bash
# Test database connection
mysql -h $DB_HOST -u $DB_USERNAME -p$DB_PASSWORD $DB_NAME -e "SELECT 1;"

# Check firewall rules
sudo ufw status
```

**3. File Upload Permissions**
```bash
# Fix directory permissions
sudo chown -R elscholar:elscholar uploads/
chmod -R 755 uploads/
```

**4. Memory Issues**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Update PM2 configuration
pm2 restart elscholar-api --update-env
```

### Log Analysis

```bash
# Application logs
pm2 logs elscholar-api

# System logs
sudo journalctl -u nginx -f
sudo tail -f /var/log/mysql/error.log

# Custom application logs
tail -f logs/id-card-generator.log
```

## 🔄 Rollback Procedures

### Quick Rollback

```bash
# Stop current application
pm2 stop elscholar-api

# Rollback to previous version
git checkout previous-stable-tag
npm install
pm2 restart elscholar-api

# Rollback database if needed
./deployment/scripts/rollback-id-card-generator.sh
```

### Emergency Rollback

```bash
# Use automated rollback script
./deployment/scripts/rollback-id-card-generator.sh rollback

# Verify rollback status
./deployment/scripts/rollback-id-card-generator.sh status
```

## 📝 Post-Deployment Checklist

- [ ] Application running and accessible
- [ ] Health checks passing
- [ ] Database migration completed
- [ ] File uploads working
- [ ] SSL certificate valid
- [ ] Monitoring configured
- [ ] Backup system operational
- [ ] Documentation updated
- [ ] Team notified of deployment

## 🔗 Useful Commands

```bash
# Check application status
pm2 status
pm2 logs elscholar-api --lines 100

# Monitor system resources
htop
df -h
free -h

# Test API endpoints
curl -X GET https://staging-api.elitescholar.ng/api/id-cards/health

# Backup system
./deployment/scripts/backup-id-card-system.sh backup

# View backup list
./deployment/scripts/backup-id-card-system.sh list
```

## 📞 Support

For deployment issues or questions:
- Check logs: `pm2 logs elscholar-api`
- Review health status: `/api/id-cards/health/detailed`
- Contact DevOps team with error details and logs