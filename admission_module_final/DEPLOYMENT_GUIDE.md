# Admission Module - Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the admission module to production with zero downtime and complete rollback capability.

## Pre-Deployment Checklist

### 1. Environment Preparation
- [ ] Production database backup completed
- [ ] Staging environment tested successfully
- [ ] All dependencies installed and verified
- [ ] Environment variables configured
- [ ] SSL certificates valid and configured
- [ ] Monitoring and alerting systems ready

### 2. Code Deployment Readiness
- [ ] All code merged to production branch
- [ ] Frontend build optimized and tested
- [ ] Backend API endpoints tested
- [ ] Database migration scripts validated
- [ ] Rollback procedures tested

### 3. Team Coordination
- [ ] Deployment team assembled
- [ ] Stakeholders notified of deployment window
- [ ] Support team on standby
- [ ] Communication channels established

## Deployment Steps

### Phase 1: Database Migration (5-10 minutes)

#### Step 1.1: Pre-Migration Backup
```bash
# Create full database backup
mysqldump -u [username] -p[password] [database_name] > admission_pre_migration_backup.sql

# Verify backup integrity
mysql -u [username] -p[password] -e "SELECT COUNT(*) FROM school_applicants;" [database_name]
```

#### Step 1.2: Execute Migration
```bash
# Run production migration script
mysql -u [username] -p[password] [database_name] < PRODUCTION_MIGRATION.sql

# Verify migration success
mysql -u [username] -p[password] [database_name] -e "
SELECT 'Migration Status' as check_type, 
CASE WHEN COUNT(*) = 4 THEN 'SUCCESS' ELSE 'FAILED' END as result
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = '[database_name]' 
AND TABLE_NAME IN ('admission_tokens', 'admission_audit_log', 'school_admission_settings', 'admission_workflow_history');
"
```

#### Step 1.3: Validate Data Integrity
```bash
# Check existing data preservation
mysql -u [username] -p[password] [database_name] -e "
SELECT 
  'Data Integrity' as check_type,
  COUNT(*) as total_applications,
  COUNT(DISTINCT school_id) as schools,
  COUNT(DISTINCT branch_id) as branches
FROM school_applicants;
"
```

### Phase 2: Backend Deployment (10-15 minutes)

#### Step 2.1: Deploy API Code
```bash
# Navigate to API directory
cd elscholar-api

# Install dependencies
npm install --production

# Run database sync (if using Sequelize auto-sync)
npm run db:sync

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
```

#### Step 2.2: Verify API Endpoints
```bash
# Test core endpoints
curl -X GET "https://your-domain.com/api/health" -H "accept: application/json"

# Test admission endpoints (with proper authentication)
curl -X POST "https://your-domain.com/api/admission-tokens/validate" \
  -H "Content-Type: application/json" \
  -H "x-school-id: TEST_SCHOOL" \
  -H "x-branch-id: TEST_BRANCH" \
  -d '{"token_code": "INVALID_TOKEN"}'
```

### Phase 3: Frontend Deployment (5-10 minutes)

#### Step 3.1: Build and Deploy Frontend
```bash
# Navigate to UI directory
cd elscholar-ui

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to web server (example with nginx)
sudo cp -r build/* /var/www/html/
sudo systemctl reload nginx
```

#### Step 3.2: Verify Frontend Access
```bash
# Test main application
curl -I "https://your-domain.com/"

# Test admission module routes
curl -I "https://your-domain.com/admissions"
```

### Phase 4: Configuration and Testing (10-15 minutes)

#### Step 4.1: Configure School Settings
```sql
-- Set default admission settings for existing schools
INSERT INTO school_admission_settings 
  (school_id, branch_id, access_mode, academic_year)
SELECT DISTINCT 
  school_id, 
  branch_id, 
  'FREE',
  '2024'
FROM school_applicants 
WHERE school_id IS NOT NULL AND branch_id IS NOT NULL
ON DUPLICATE KEY UPDATE access_mode = VALUES(access_mode);
```

#### Step 4.2: Generate Test Tokens
```bash
# Use API to generate test tokens
curl -X POST "https://your-domain.com/api/admission-tokens/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [admin_token]" \
  -H "x-school-id: [test_school_id]" \
  -H "x-branch-id: [test_branch_id]" \
  -d '{
    "count": 5,
    "usage_limit": 1,
    "expires_at": null
  }'
```

#### Step 4.3: End-to-End Testing
- [ ] Admin can generate tokens
- [ ] Parent can access admission form
- [ ] Token validation works correctly
- [ ] Application submission successful
- [ ] Workflow management functional
- [ ] Reporting and analytics working

## Post-Deployment Verification

### 1. Functional Testing (15-20 minutes)
```bash
# Test admission application flow
# 1. Generate admission token (admin)
# 2. Access admission form (parent)
# 3. Submit application with token
# 4. Verify application in admin panel
# 5. Test workflow status updates
```

### 2. Performance Monitoring
```bash
# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.com/api/admissions/applications"

# Check database performance
mysql -u [username] -p[password] [database_name] -e "SHOW PROCESSLIST;"

# Monitor server resources
htop
iostat -x 1 5
```

### 3. Error Monitoring
```bash
# Check application logs
tail -f /var/log/elscholar-api/error.log
tail -f /var/log/nginx/error.log

# Monitor PM2 processes
pm2 monit
pm2 logs
```

## Rollback Procedures

### Emergency Rollback (If Critical Issues Occur)

#### Step 1: Stop New Deployments
```bash
# Stop API processes
pm2 stop all

# Revert frontend to previous version
sudo cp -r /backup/elscholar-ui-previous/* /var/www/html/
```

#### Step 2: Database Rollback
```bash
# Execute rollback script
mysql -u [username] -p[password] [database_name] < ROLLBACK_SCRIPT.sql

# Restore from backup if needed
mysql -u [username] -p[password] [database_name] < admission_pre_migration_backup.sql
```

#### Step 3: Restart Services
```bash
# Start previous API version
pm2 start previous_ecosystem.config.js
pm2 save

# Reload web server
sudo systemctl reload nginx
```

## Monitoring and Maintenance

### 1. Daily Monitoring
- [ ] Check application error logs
- [ ] Monitor API response times
- [ ] Verify database performance
- [ ] Review token usage statistics
- [ ] Check admission application volumes

### 2. Weekly Maintenance
- [ ] Clean up expired tokens
- [ ] Review audit logs
- [ ] Update security patches
- [ ] Backup database
- [ ] Performance optimization review

### 3. Monthly Reviews
- [ ] Analyze admission statistics
- [ ] Review security logs
- [ ] Update documentation
- [ ] Plan feature enhancements
- [ ] Conduct security audit

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: Token Validation Failing
```bash
# Check token table
mysql -u [username] -p[password] [database_name] -e "
SELECT * FROM admission_tokens 
WHERE school_id = '[school_id]' 
AND branch_id = '[branch_id]' 
LIMIT 5;
"

# Verify API endpoint
curl -X POST "https://your-domain.com/api/admission-tokens/validate" \
  -H "Content-Type: application/json" \
  -d '{"token_code": "[test_token]"}'
```

#### Issue: Application Submission Errors
```bash
# Check API logs
tail -f /var/log/elscholar-api/error.log | grep admission

# Verify database connection
mysql -u [username] -p[password] [database_name] -e "SELECT 1;"

# Test stored procedure
mysql -u [username] -p[password] [database_name] -e "
CALL school_admission_form('test', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');
"
```

#### Issue: Frontend Not Loading
```bash
# Check nginx configuration
sudo nginx -t

# Verify file permissions
ls -la /var/www/html/

# Check browser console for errors
# Open browser developer tools and check console/network tabs
```

## Security Considerations

### 1. Access Control
- [ ] Verify JWT token validation
- [ ] Check multi-tenant isolation
- [ ] Validate input sanitization
- [ ] Review API rate limiting

### 2. Data Protection
- [ ] Ensure HTTPS enforcement
- [ ] Verify database encryption
- [ ] Check audit log integrity
- [ ] Validate backup security

### 3. Monitoring
- [ ] Set up security alerts
- [ ] Monitor failed login attempts
- [ ] Track suspicious activities
- [ ] Review access patterns

## Support Contacts

### Technical Team
- **Backend Lead:** [Contact Information]
- **Frontend Lead:** [Contact Information]
- **Database Admin:** [Contact Information]
- **DevOps Engineer:** [Contact Information]

### Business Team
- **Product Manager:** [Contact Information]
- **QA Lead:** [Contact Information]
- **Support Manager:** [Contact Information]

## Documentation Links

- [API Documentation](./API_DOCUMENTATION.md)
- [User Guide](./USER_GUIDE.md)
- [Admin Manual](./ADMIN_MANUAL.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**Deployment Status:** Ready for Production  
**Last Updated:** 2025-12-13  
**Version:** 1.0  
**Approved By:** All Expert Teams
