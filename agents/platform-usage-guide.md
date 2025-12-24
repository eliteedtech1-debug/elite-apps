# Multi-Platform Agent Usage Guide

> **Execution Strategy:** Claude (Primary) → OpenCode (Secondary) → Gemini (Fallback)
> 
> **Last Updated:** 2025-12-13

---

## 🎯 EXECUTION STRATEGY

### Phase 1: Claude AI (Primary - Until Credits Exhaust)
**Best For:** Complex analysis, planning, and initial implementation

### Phase 2: OpenCode (Secondary - When Claude Credits Low)
**Best For:** Focused code changes, debugging, file operations

### Phase 3: Gemini (Fallback - When OpenCode Struggles)
**Best For:** Broad context analysis, alternative approaches, documentation

---

## 🤖 PLATFORM-SPECIFIC INVOCATION SYNTAX

### 1️⃣ Claude AI (Anthropic)

**Invocation Format:**
```
[Agent Name]: [Task Description]

Example:
"DBA Expert: Analyze the school_applicants table and create a normalization plan that preserves all existing data"

"Backend Expert: Create admission APIs that map directly to school_applicants table with multi-tenant isolation"

"Frontend Expert: Build mobile-first admission application form using Ant Design components"
```

**Best Practices for Claude:**
- Use natural language with clear context
- Provide detailed requirements in conversational tone
- Ask for step-by-step explanations when needed
- Request code reviews and security audits
- Use for complex multi-step reasoning

**Example Session:**
```
You: "DBA Expert: I need you to analyze our existing school_applicants table. 
We want to normalize it without losing data. Please:
1. List all columns and their current usage
2. Identify which columns should be kept, renamed, or extracted
3. Propose a normalization plan with justification
4. Create migration scripts with rollback procedures"

Claude: [Provides detailed analysis with reasoning]

You: "Backend Expert: Based on the DBA's normalization plan, create the 
admission application APIs. Ensure multi-tenant isolation and audit trails."

Claude: [Implements APIs with explanations]
```

---

### 2️⃣ OpenCode (When Claude Credits Low)

**Invocation Format:**
```
@agent-name task description

Example:
@dba-expert add index to school_applicants table on school_id and branch_id

@backend-expert fix the slow query in AdmissionApplicationController

@frontend-expert update AdmissionApplicationForm validation logic
```

**Best Practices for OpenCode:**
- Use concise, action-oriented commands
- Focus on specific file operations
- Great for debugging and quick fixes
- Excellent for file navigation and search
- Use when you know exactly what needs to be done

**Example Session:**
```
You: @dba-expert create migration script to add admission_status_history table

OpenCode: [Creates migration file]

You: @backend-expert implement status transition logic in AdmissionWorkflowController

OpenCode: [Implements the specific function]

You: @frontend-expert add tooltip to legacy field in AdmissionApplicationForm.tsx line 145

OpenCode: [Adds tooltip to specific line]
```

**When to Switch to OpenCode:**
- Claude credits running low
- Need quick file edits
- Debugging specific issues
- Adding small features
- Refactoring existing code

**When OpenCode Struggles (Switch to Gemini):**
- Complex architectural decisions
- Needs broader context understanding
- Requires analysis across many files
- Needs alternative problem-solving approach
- Documentation generation

---

### 3️⃣ Google Gemini (Fallback)

**Invocation Format:**
```
[Agent Name]: [Task Description with Context]

Example:
"DBA Expert: Review the database normalization approach for school_applicants. 
Context: We've tried approach X but encountered issue Y. 
Suggest alternative normalization strategies."

"Backend Expert: Analyze the admission workflow implementation across 
AdmissionApplicationController, AdmissionExamController, and 
AdmissionWorkflowController. Identify potential bottlenecks."

"Project Manager: Create a comprehensive project plan for the admission 
module based on the work completed so far. Include risk assessment."
```

**Best Practices for Gemini:**
- Provide comprehensive context
- Use for broad analysis and pattern recognition
- Great for documentation generation
- Excellent for alternative approaches
- Use when OpenCode can't solve the problem

**Example Session:**
```
You: "Backend Expert: OpenCode struggled to optimize the admission query 
that joins school_applicants with multiple tables. The query is timing out 
with 10,000+ records. Here's the current implementation: [paste code]. 
Suggest optimization strategies."

Gemini: [Provides multiple optimization approaches with analysis]

You: "Project Manager: Based on all the work done so far on the admission 
module, create a comprehensive documentation covering architecture, 
workflows, and deployment procedures."

Gemini: [Generates comprehensive documentation]
```

---

## 🔄 HANDOFF STRATEGY

### Claude → OpenCode Handoff

**When to Handoff:**
- Claude credits below 20%
- Moving from planning to implementation
- Need focused file operations

**Handoff Checklist:**
1. ✅ Save all Claude's analysis and plans to markdown files
2. ✅ Document decisions made with Claude
3. ✅ Create task list for OpenCode to execute
4. ✅ Note any complex logic that needs careful implementation

**Handoff Template:**
```markdown
## Claude Session Summary

### Completed:
- [x] Schema analysis of school_applicants
- [x] Normalization plan created
- [x] Migration scripts designed

### Decisions Made:
- Keep applicant_id as primary key
- Extract guardians to separate table (1-to-many)
- Rename status column to application_status

### For OpenCode:
- [ ] Create migration file: 001_normalize_school_applicants.sql
- [ ] Update Sequelize models
- [ ] Implement AdmissionApplicationController
- [ ] Add indexes to school_applicants table

### Complex Logic Notes:
- Status transition logic requires validation (see notes in section 3.2)
- Multi-tenant isolation must check both school_id AND branch_id
```

---

### OpenCode → Gemini Handoff

**When to Handoff:**
- OpenCode can't solve complex problem
- Need architectural guidance
- Require broad context analysis
- Need documentation generation

**Handoff Checklist:**
1. ✅ Document what OpenCode attempted
2. ✅ Describe the specific problem/blocker
3. ✅ Provide relevant code context
4. ✅ Explain what solutions were tried

**Handoff Template:**
```markdown
## OpenCode Session Summary

### Completed:
- [x] Created migration scripts
- [x] Updated Sequelize models
- [x] Implemented basic CRUD endpoints

### Blocker:
OpenCode struggled with optimizing the complex admission report query 
that aggregates data across 5 tables with 10,000+ records.

### Attempted Solutions:
1. Added indexes on foreign keys - minimal improvement
2. Tried query result caching - cache invalidation issues
3. Attempted to use stored procedure - syntax errors

### For Gemini:
Please analyze the query performance issue and suggest:
- Alternative query optimization strategies
- Whether to use stored procedures or ORM
- Caching strategies that work with real-time data
- Database architecture improvements

### Code Context:
[Paste relevant controller code, models, and current query]
```

---

## 📊 PLATFORM STRENGTHS MATRIX

| Task Type | Claude | OpenCode | Gemini |
|-----------|--------|----------|--------|
| **Planning & Analysis** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| **Architecture Design** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| **Code Generation** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Debugging** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **File Operations** | ⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Quick Fixes** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Complex Reasoning** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| **Documentation** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Security Review** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Performance Optimization** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Alternative Solutions** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |
| **Refactoring** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

**Legend:** ⭐ = Basic | ⭐⭐ = Good | ⭐⭐⭐ = Excellent

---

## 🎯 RECOMMENDED WORKFLOW

### Stage 1: Planning & Design (Claude)
**Duration:** Until credits at ~50%

**Tasks:**
1. DBA Expert: Schema analysis and normalization plan
2. Project Manager: Project plan and risk assessment
3. Backend Expert: API design and architecture
4. Frontend Expert: Component architecture
5. UI/UX Expert: Design specifications
6. Security Expert: Security architecture review

**Output:** Complete design documents and implementation plans

---

### Stage 2: Implementation (OpenCode)
**Duration:** Until task completion or blocker

**Tasks:**
1. DBA Expert: Execute migration scripts
2. Backend Expert: Implement controllers and routes
3. Frontend Expert: Build React components
4. Finance Expert: Integrate fee logic
5. QA Expert: Write test cases

**Output:** Working code implementation

---

### Stage 3: Optimization & Documentation (Gemini)
**Duration:** As needed for complex issues

**Tasks:**
1. Backend Expert: Optimize complex queries
2. DBA Expert: Review database performance
3. Project Manager: Generate comprehensive documentation
4. QA Expert: Analyze test coverage and suggest improvements
5. DevOps Expert: Deployment strategy and monitoring

**Output:** Optimized system with complete documentation

---

## 💡 TIPS FOR SMOOTH TRANSITIONS

### Maintaining Context Across Platforms

**1. Document Everything:**
```bash
# Create session logs
agents/session-logs/
├── claude-session-1-schema-analysis.md
├── claude-session-2-api-design.md
├── opencode-session-1-implementation.md
├── opencode-session-2-debugging.md
└── gemini-session-1-optimization.md
```

**2. Use Consistent File Structure:**
```bash
# All platforms can reference these
agents/admission-module/
├── design/
│   ├── schema-analysis.md (from Claude)
│   ├── api-design.md (from Claude)
│   └── ui-ux-spec.md (from Claude)
├── implementation/
│   ├── migration-scripts/ (from OpenCode)
│   ├── controllers/ (from OpenCode)
│   └── components/ (from OpenCode)
└── documentation/
    ├── architecture.md (from Gemini)
    └── deployment-guide.md (from Gemini)
```

**3. Create Handoff Checklists:**
- Save all decisions to markdown files
- Document blockers and attempted solutions
- Provide code context for next platform
- Note any complex logic or edge cases

**4. Use Git Commits Strategically:**
```bash
# After each major Claude session
git add .
git commit -m "feat(admission): schema analysis and normalization plan [Claude]"

# After OpenCode implementation
git add .
git commit -m "feat(admission): implement admission APIs [OpenCode]"

# After Gemini optimization
git add .
git commit -m "perf(admission): optimize admission queries [Gemini]"
```

---

## 🚨 COMMON PITFALLS & SOLUTIONS

### Pitfall 1: Losing Context Between Platforms
**Solution:** Always save Claude's analysis to markdown files before switching

### Pitfall 2: OpenCode Can't Handle Complex Logic
**Solution:** Break down into smaller, specific tasks or switch to Gemini

### Pitfall 3: Gemini Suggests Different Approach Than Claude
**Solution:** Document both approaches, evaluate pros/cons, choose best fit

### Pitfall 4: Inconsistent Code Style Across Platforms
**Solution:** Reference AGENTS.md coding standards in every prompt

### Pitfall 5: Duplicate Work Across Platforms
**Solution:** Maintain clear task tracking (use todolist or project board)

---

## 📋 QUICK REFERENCE COMMANDS

### Claude Commands
```
"DBA Expert: [detailed task with context]"
"Backend Expert: [task] ensuring [constraints]"
"Frontend Expert: [task] following [patterns]"
```

### OpenCode Commands
```
@dba-expert [specific action on specific file]
@backend-expert [fix/add/update] [specific function]
@frontend-expert [modify] [component] at [location]
```

### Gemini Commands
```
"[Agent]: Analyze [broad topic] considering [context]"
"[Agent]: Suggest alternatives for [problem] given [constraints]"
"[Agent]: Generate documentation for [feature] covering [aspects]"
```

---

## 🎓 LEARNING FROM EACH PLATFORM

### What Claude Teaches You:
- Architectural thinking
- Security considerations
- Best practices and patterns
- Comprehensive planning

### What OpenCode Teaches You:
- Efficient file operations
- Debugging techniques
- Quick problem-solving
- Code navigation

### What Gemini Teaches You:
- Alternative approaches
- Broad context analysis
- Pattern recognition
- Documentation best practices

---

## ✅ SUCCESS CHECKLIST

### Before Starting:
- [ ] Read admission-module-prompt.md
- [ ] Understand existing school_applicants table
- [ ] Review AGENTS.md for coding standards
- [ ] Set up session logging structure

### During Claude Phase:
- [ ] Save all analysis to markdown files
- [ ] Document all architectural decisions
- [ ] Create detailed implementation plans
- [ ] Prepare handoff checklist for OpenCode

### During OpenCode Phase:
- [ ] Reference Claude's design documents
- [ ] Implement one feature at a time
- [ ] Test each implementation
- [ ] Document any blockers for Gemini

### During Gemini Phase:
- [ ] Provide comprehensive context
- [ ] Reference previous work from Claude/OpenCode
- [ ] Request alternative approaches
- [ ] Generate final documentation

### After Completion:
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Deployed to production

---

**Version:** 1.0  
**Last Updated:** 2025-12-13  
**Strategy:** Claude → OpenCode → Gemini  
**Project:** Elite Scholar - Admission Application Module
