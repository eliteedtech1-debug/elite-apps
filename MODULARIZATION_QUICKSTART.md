# 🚀 Modularization Quick Start

**Goal:** Organize codebase by domain to match 8-database architecture

---

## 📁 New Structure

```
src/
├── models/
│   ├── core/        → full_skcooly (users, schools)
│   ├── audit/       → skcooly_audit (logs)
│   ├── bot/         → elite_bot (AI)
│   ├── hr/          → elite_hr (staff, payroll)
│   ├── finance/     → elite_finance (payments)
│   ├── academic/    → elite_academic (students)
│   ├── content/     → elite_content (CMS)
│   └── cbt/         → elite_cbt (exams)
│
├── controllers/
│   ├── core/, audit/, bot/
│   ├── hr/, finance/, academic/
│   └── content/, cbt/
│
├── routes/
│   └── (same structure)
│
└── services/
    └── (same structure)
```

---

## 🎯 Quick Commands

### Setup
```bash
# Create directory structure
./scripts/setup-modularization.sh

# Verify structure
tree elscholar-api/src -L 2
```

### Migration (per module)
```bash
# 1. Move models
mv src/models/Staff.js src/models/hr/

# 2. Update model
# Change: const { mainDB } = require('../config/database');
# To: module.exports = (sequelize) => { ... };

# 3. Update index
# Add to src/models/hr/index.js:
# const Staff = require('./Staff')(hrDB);

# 4. Update imports everywhere
# Change: const { Staff } = require('../models');
# To: const { Staff } = require('../models/hr');

# 5. Test
npm test
```

---

## 📝 Code Patterns

### Model Definition
```javascript
// src/models/hr/Staff.js
module.exports = (sequelize) => {
  return sequelize.define('staff', {
    id: { type: DataTypes.INTEGER, primaryKey: true },
    name: DataTypes.STRING
  });
};
```

### Model Index
```javascript
// src/models/hr/index.js
const { hrDB } = require('../../config/databases');

const Staff = require('./Staff')(hrDB);
const PayrollLine = require('./PayrollLine')(hrDB);

module.exports = { Staff, PayrollLine };
```

### Controller
```javascript
// src/controllers/hr/staffController.js
const { Staff } = require('../../models/hr');

exports.getAll = async (req, res) => {
  const staff = await Staff.findAll();
  res.json({ data: staff });
};
```

### Route
```javascript
// src/routes/hr/staff.js
const router = require('express').Router();
const controller = require('../../controllers/hr/staffController');

router.get('/', controller.getAll);
module.exports = router;
```

### Route Registration
```javascript
// src/routes/index.js
const hrStaff = require('./hr/staff');
app.use('/api/hr/staff', hrStaff);
```

---

## 🔄 Migration Order

1. **Week 1:** Setup + Preparation
2. **Week 2:** HR (staff, payroll)
3. **Week 3:** Finance (payments, accounting)
4. **Week 4:** Academic (students, classes)
5. **Week 5:** Content (lesson plans, CMS)
6. **Week 6:** CBT (exams, grades)
7. **Week 7:** Testing + Cleanup

---

## ✅ Checklist (per module)

- [ ] Move models to domain folder
- [ ] Create domain index.js
- [ ] Move controllers
- [ ] Move routes
- [ ] Move services
- [ ] Update all imports
- [ ] Test endpoints
- [ ] Update docs

---

## 🚨 Common Issues

### Import errors
```javascript
// ❌ Wrong
const { Staff } = require('../models');

// ✅ Correct
const { Staff } = require('../models/hr');
```

### Cross-DB queries
```javascript
// ✅ Separate queries
const { Staff } = require('../models/hr');
const { User } = require('../models');

const staff = await Staff.findByPk(id);
const user = await User.findByPk(staff.user_id);
```

### Route conflicts
```javascript
// Add backward compatibility
app.use('/api/staff', hrStaff); // Old (deprecated)
app.use('/api/hr/staff', hrStaff); // New
```

---

## 📊 Track Progress

Update `MODULARIZATION_PROGRESS.md` after each task:
```markdown
### Week 2: HR Module
- [✅] Models moved
- [🔄] Controllers moved (in progress)
- [⏳] Routes moved
```

---

## 🔗 Related Docs

- `MODULARIZATION_PLAN.md` - Full detailed plan
- `DATABASE_SEPARATION_PLAN.md` - Database migration
- `DATABASE_ARCHITECTURE_FINAL.md` - Architecture overview

---

## 🔔 Tracking Setup

### One Command Setup
```bash
./scripts/setup-tracking.sh
```

Creates:
- `feature/modularization` branch
- `IMPLEMENTATION_TRACKER.md` (7-week checklist)
- Reminder script
- Commits plans to git

### Daily Reminder
```bash
./scripts/modularization-reminder.sh
```

Shows:
- Current week
- Next 5 tasks
- Progress %
- Quick commands

### Update Progress
```bash
git checkout feature/modularization
vim IMPLEMENTATION_TRACKER.md  # Mark [x]
git add . && git commit -m "progress: [task]"
```

---

*Quick start guide - 2026-02-11*  
*Tracking added - 2026-02-11 03:40*
