# Phase 5: Deployment & Infrastructure - DevOps Expert Tasks

> **Agent:** DevOps Expert (Dr. Kenji Tanaka)
> **Estimated Duration:** 2-3 days
> **Dependencies:** Phase 4 (Testing Complete)

---

## Task 5.1: Redis Cache Setup

```yaml
# docker-compose.yml addition
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
```

**Environment Variables:**
```bash
REDIS_URL=redis://localhost:6379
RBAC_CACHE_TTL=300  # 5 minutes
```

---

## Task 5.2: Database Migration Script

**File:** `elscholar-api/migrations/rbac_migration.js`

```javascript
// Migration steps:
// 1. Create new tables (if not exist)
// 2. Seed staff_roles
// 3. Populate features from sidebarData mapping
// 4. Run migrate_legacy_permissions procedure
// 5. Verify migration success
// 6. Create rollback checkpoint
```

**Rollback Script:**
```javascript
// Restore from checkpoint if migration fails
// Keep legacy fields populated during transition
```

---

## Task 5.3: CI/CD Pipeline Updates

**File:** `.github/workflows/deploy.yml`

```yaml
# Add RBAC-specific steps:
- name: Run RBAC migrations
  run: npm run migrate:rbac
  
- name: Run RBAC tests
  run: npm run test:rbac
  
- name: Verify permission cache
  run: npm run verify:rbac-cache
```

---

## Task 5.4: Monitoring & Alerts

**Prometheus Metrics:**
```javascript
// Add to backend:
rbac_permission_checks_total
rbac_cache_hits_total
rbac_cache_misses_total
rbac_permission_check_duration_seconds
rbac_cache_invalidations_total
```

**Grafana Dashboard:**
- Permission check latency (p50, p95, p99)
- Cache hit rate
- Permission denials by feature
- Role assignments per day

**Alerts:**
```yaml
- alert: RBACCacheHitRateLow
  expr: rbac_cache_hits_total / (rbac_cache_hits_total + rbac_cache_misses_total) < 0.9
  for: 5m
  
- alert: RBACPermissionCheckSlow
  expr: rbac_permission_check_duration_seconds > 0.1
  for: 5m
```

---

## Task 5.5: Deployment Checklist

### Pre-Deployment
- [ ] Database backup completed
- [ ] Redis instance running
- [ ] Migration script tested on staging
- [ ] Rollback procedure documented
- [ ] All tests passing

### Deployment Steps
1. [ ] Deploy database migrations
2. [ ] Deploy backend with new RBAC service
3. [ ] Verify API endpoints responding
4. [ ] Deploy frontend with new permission system
5. [ ] Verify sidebar loading dynamically
6. [ ] Run smoke tests
7. [ ] Monitor error rates

### Post-Deployment
- [ ] Verify permission cache working
- [ ] Check audit logs recording
- [ ] Monitor performance metrics
- [ ] Validate user access unchanged

---

## Task 5.6: Feature Flags

```javascript
// Gradual rollout configuration
const RBAC_FLAGS = {
  USE_NEW_RBAC: process.env.USE_NEW_RBAC === 'true',
  RBAC_CACHE_ENABLED: process.env.RBAC_CACHE_ENABLED !== 'false',
  RBAC_AUDIT_ENABLED: process.env.RBAC_AUDIT_ENABLED !== 'false',
};
```

---

## Deliverables Checklist

- [ ] Redis configured and running
- [ ] Migration script created and tested
- [ ] Rollback procedure documented
- [ ] CI/CD pipeline updated
- [ ] Monitoring dashboards created
- [ ] Alerts configured
- [ ] Feature flags implemented
- [ ] Deployment runbook created
