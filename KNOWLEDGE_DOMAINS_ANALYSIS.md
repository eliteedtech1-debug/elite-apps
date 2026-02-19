# Knowledge Domains Tables - Detailed Analysis

> **Purpose:** Assessment criteria for non-academic evaluation (character, behavior, skills)  
> **Database:** elite_content (educational assessment framework)  
> **Status:** All tables empty (0 rows) - prepared for use

---

## 📊 The 4 Knowledge Domain Tables

### 1. `knowledge_domains` (Base Table)
**Purpose:** Core domain definitions

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Primary key |
| `domain_name` | VARCHAR(100) | Domain name (e.g., "Critical Thinking") |
| `domain_type` | ENUM | cognitive, affective, psychomotor, social, spiritual |
| `description` | TEXT | What this domain assesses |
| `is_active` | BOOLEAN | Active status |
| `school_id` | VARCHAR(50) | School identifier |
| `branch_id` | VARCHAR(50) | Branch identifier |
| `created_by` | VARCHAR(100) | Creator |
| `created_at` | DATETIME | Creation timestamp |

**Example Data:**
```
Domain: "Critical Thinking"
Type: cognitive
Description: "Ability to analyze and evaluate information"
```

---

### 2. `knowledge_domain_criteria` (Assessment Criteria)
**Purpose:** Specific criteria for each domain

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Primary key |
| `domain_id` | INT | FK to knowledge_domains |
| `criteria_name` | VARCHAR(100) | Criteria name |
| `description` | TEXT | Criteria description |
| `weight` | INT | Importance weight (1-10) |
| `school_id` | VARCHAR(50) | School identifier |
| `branch_id` | VARCHAR(50) | Branch identifier |

**Example Data:**
```
Domain: "Critical Thinking"
Criteria: "Problem Solving"
Description: "Ability to identify and solve problems"
Weight: 5
```

**Relationship:**
```
knowledge_domains (1) → (many) knowledge_domain_criteria
```

---

### 3. `knowledge_domains_simplified` (Simple Version)
**Purpose:** Simplified domain structure with built-in grading

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Primary key |
| `domain_name` | VARCHAR(100) | Domain name |
| `domain_type` | ENUM | cognitive, affective, psychomotor, social, spiritual |
| `description` | TEXT | Domain description |
| `grading_system` | ENUM | Grading scale type |
| `grading_values` | JSON | Grade values/labels |
| `is_active` | BOOLEAN | Active status |
| `school_id` | VARCHAR(50) | School identifier |

**Grading Systems:**
- `numeric_1_5` - Scale 1-5
- `numeric_1_10` - Scale 1-10
- `alpha_a_f` - A, B, C, D, F
- `alphanumeric_a1_f9` - A1, A2, B1, etc.
- `descriptive_excellent_poor` - Excellent, Good, Fair, Poor

**Example Data:**
```
Domain: "Emotional Intelligence"
Type: affective
Grading: numeric_1_5
Values: {"1": "Poor", "2": "Fair", "3": "Good", "4": "Very Good", "5": "Excellent"}
```

---

### 4. `knowledge_domains_enhanced` (Advanced Version)
**Purpose:** Enhanced domain with character trait integration

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Primary key |
| `domain_name` | VARCHAR(100) | Domain name |
| `domain_type` | ENUM | cognitive, affective, psychomotor, social, spiritual |
| `description` | TEXT | Domain description |
| `grading_system_id` | INT | FK to grading_systems table |
| `character_trait_category` | VARCHAR(50) | Maps to character_traits.category |
| `section` | VARCHAR(50) | School section (NURSERY, PRIMARY, etc.) |
| `weight` | DECIMAL(5,2) | Domain weight (default 1.00) |
| `is_active` | BOOLEAN | Active status |
| `school_id` | VARCHAR(50) | School identifier |

**Integration with character_traits:**
```
knowledge_domains_enhanced.character_trait_category 
  → character_traits.category (e.g., "AFFECTIVE TRAIT")
```

**Example Data:**
```
Domain: "Social Skills"
Type: social
Character Category: "AFFECTIVE TRAIT"
Section: "PRIMARY"
Weight: 1.5
```

---

## 🔄 Table Relationships

```
knowledge_domains (base)
  ↓
  └─→ knowledge_domain_criteria (1:many)

knowledge_domains_simplified (standalone)
  - Self-contained with grading

knowledge_domains_enhanced (advanced)
  ↓
  ├─→ grading_systems (FK)
  └─→ character_traits (integration)
```

---

## 🎯 Domain Types Explained

### 1. **Cognitive** (Thinking/Mental)
- Critical thinking
- Problem solving
- Memory and recall
- Analysis and evaluation

### 2. **Affective** (Emotional/Attitude)
- Emotional intelligence
- Attitude and values
- Motivation
- Self-awareness

### 3. **Psychomotor** (Physical/Skills)
- Motor skills
- Hand-eye coordination
- Physical dexterity
- Practical skills

### 4. **Social** (Interpersonal)
- Communication
- Teamwork
- Leadership
- Conflict resolution

### 5. **Spiritual** (Values/Ethics)
- Moral values
- Ethics
- Religious understanding
- Character development

---

## 📝 Usage in Controllers

### Controllers Using Knowledge Domains:

**1. caTemplateController.js**
```javascript
// CA template includes knowledge_domains field
{
  knowledge_domains: [
    { domain_id: 1, weight: 0.3 },
    { domain_id: 2, weight: 0.7 }
  ]
}
```

**2. GeneralQueryController.js**
```javascript
// Dynamic query support
'knowledge_domains': 'KnowledgeDomain'
```

**3. KnowledgeDomainsController.js** (if exists)
- CRUD operations for domains
- Criteria management
- Domain assignment to classes

---

## 🔗 Integration Points

### With Assessment System (elite_assessment):
```
knowledge_domains → ca_knowledge_domain_links
  - Links domains to CA assessments
  - Defines which domains to assess in CA

character_traits → knowledge_domains_enhanced
  - Character traits mapped to domains
  - Used in report cards
```

### With Report Cards (elite_core):
```
knowledge_domains → student assessment
  - Non-academic evaluation
  - Character/behavior grading
  - Skills assessment
```

---

## 🤔 Which Table to Use?

### Use `knowledge_domains` + `knowledge_domain_criteria` when:
- ✅ Need detailed criteria breakdown
- ✅ Multiple criteria per domain
- ✅ Weighted assessment
- ✅ Complex evaluation structure

### Use `knowledge_domains_simplified` when:
- ✅ Simple domain assessment
- ✅ Single grade per domain
- ✅ Built-in grading scale
- ✅ Quick setup

### Use `knowledge_domains_enhanced` when:
- ✅ Integration with character_traits
- ✅ Section-specific domains
- ✅ Custom grading systems
- ✅ Advanced reporting

---

## 📊 Current Status

| Table | Rows | Size | Status |
|-------|------|------|--------|
| `knowledge_domains` | 0 | 0.08 MB | 🔵 Ready |
| `knowledge_domain_criteria` | 0 | 0.06 MB | 🔵 Ready |
| `knowledge_domains_simplified` | 0 | 0.09 MB | 🔵 Ready |
| `knowledge_domains_enhanced` | 0 | 0.11 MB | 🔵 Ready |

**All tables are empty but schema is ready for use.**

---

## ✅ Database Assignment: elite_content

**Why elite_content?**
- ✅ Educational assessment framework
- ✅ Curriculum-related evaluation criteria
- ✅ Teaching/learning assessment structure
- ✅ Not system configuration
- ✅ Not financial data
- ✅ Not user authentication

**NOT elite_assessment because:**
- These define the assessment framework (content)
- Actual scores/grades go in elite_assessment
- Similar to how syllabus (content) vs exam_scores (assessment)

---

## 🚀 Migration Notes

**All 4 tables migrate together:**
```bash
mysqldump -u root -p full_skcooly \
  knowledge_domains \
  knowledge_domain_criteria \
  knowledge_domains_simplified \
  knowledge_domains_enhanced \
  | mysql -u root -p elite_content
```

**No data to migrate** - tables are empty (prepared for future use)

---

*Analysis Complete: 2026-02-12*
