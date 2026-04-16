#!/usr/bin/env node

/**
 * RBAC Menu Debug Script
 * Analyzes the getUserMenu function issues for User 1212
 * 
 * Issue: User 1212 has roles teacher+exam_officer+librarian but menu API only shows basic teacher items.
 * Database shows 76 items should be available.
 */

const fs = require('fs');
const path = require('path');

// Mock database query results based on the RBAC data
const mockMenuItems = [
  // Sample menu items from the database
  { id: 1, parent_id: null, label: 'Personal Data Mngr', icon: 'ti ti-users', link: '', sort_order: 1, is_active: 1 },
  { id: 2, parent_id: 1, label: 'Students', icon: 'ti ti-school', link: null, sort_order: 1, is_active: 1 },
  { id: 3, parent_id: 2, label: 'Student List', icon: 'ti ti-list', link: '/student/student-list', sort_order: 1, is_active: 1 },
  { id: 11, parent_id: 1, label: 'Student Attendance', icon: 'ti ti-calendar-check', link: null, sort_order: 5, is_active: 1 },
  { id: 12, parent_id: 11, label: 'Reports 📊', icon: 'ti ti-chart-bar', link: '/attendance/dashboard', sort_order: 1, is_active: 1 },
  { id: 13, parent_id: 11, label: 'Mark Attendance', icon: 'ti ti-school', link: '/academic/attendance-register', sort_order: 2, is_active: 1 },
  { id: 1090, parent_id: 11, label: 'Scanner', icon: 'fas fa-qrcode', link: '/attendance/quick-scanner', sort_order: 0, is_active: 1 },
  { id: 16, parent_id: null, label: 'Class Management', icon: '', link: '', sort_order: 2, is_active: 1 },
  { id: 17, parent_id: 16, label: 'Daily Routine', icon: 'fa fa-gears', link: null, sort_order: 1, is_active: 1 },
  { id: 18, parent_id: 17, label: 'Class Time Table', icon: 'ti ti-table', link: '/academic/class-time-table', sort_order: 1, is_active: 1 },
  { id: 50, parent_id: null, label: 'Exams & Records', icon: null, link: null, sort_order: 7, is_active: 1 },
  { id: 51, parent_id: 50, label: 'Examinations', icon: 'ti ti-certificate', link: null, sort_order: 1, is_active: 1 },
  { id: 52, parent_id: 51, label: 'Assessment Form', icon: 'fa fa-clipboard-list', link: '/academic/assessments', sort_order: 1, is_active: 1 },
  { id: 59, parent_id: 51, label: 'Submit Questions', icon: 'fa fa-upload', link: '/examinations/submit-questions', sort_order: 8, is_active: 1 }
];

const mockMenuAccess = [
  // Teacher access
  { menu_item_id: 16, user_type: 'teacher', access_type: 'default' },
  { menu_item_id: 50, user_type: 'teacher', access_type: 'default' },
  { menu_item_id: 11, user_type: 'teacher', access_type: 'default' },
  { menu_item_id: 3, user_type: 'teacher', access_type: 'additional' },
  { menu_item_id: 12, user_type: 'teacher', access_type: 'additional' },
  { menu_item_id: 13, user_type: 'teacher', access_type: 'additional' },
  { menu_item_id: 18, user_type: 'teacher', access_type: 'additional' },
  { menu_item_id: 51, user_type: 'teacher', access_type: 'additional' },
  { menu_item_id: 52, user_type: 'teacher', access_type: 'additional' },
  { menu_item_id: 1090, user_type: 'teacher', access_type: 'additional' },
  
  // Exam Officer access
  { menu_item_id: 1, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 2, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 3, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 16, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 17, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 18, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 50, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 51, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 52, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 59, user_type: 'exam_officer', access_type: 'additional' },
  { menu_item_id: 1090, user_type: 'exam_officer', access_type: 'additional' },
  
  // Librarian access
  { menu_item_id: 12, user_type: 'librarian', access_type: 'additional' },
  { menu_item_id: 1090, user_type: 'librarian', access_type: 'additional' }
];

// Mock user roles for User 1212
const mockUserRoles = [
  { user_type: 'teacher' },
  { user_type: 'exam_officer' },
  { user_type: 'librarian' }
];

// Simulate the getUserMenu function logic
function simulateGetUserMenu(userRoles, schoolId = 'SCH/1', effectivePkgId = 4) {
  console.log('=== RBAC Menu Debug Analysis ===\n');
  console.log('User 1212 Roles:', userRoles.map(r => r.user_type));
  console.log('School ID:', schoolId);
  console.log('Effective Package ID:', effectivePkgId);
  console.log('');

  // Step 1: Get all user roles (including inheritance)
  const allUserRoles = userRoles.map(r => r.user_type.toLowerCase());
  console.log('All User Roles (normalized):', allUserRoles);

  // Step 2: Build the query conditions
  console.log('\n=== Query Analysis ===');
  console.log('Role placeholders needed:', allUserRoles.length);
  console.log('Roles for IN clause:', allUserRoles);

  // Step 3: Filter menu items based on access
  const accessibleItems = [];
  const roleAccessMap = {};

  // Group access by role
  allUserRoles.forEach(role => {
    roleAccessMap[role] = mockMenuAccess.filter(access => 
      access.user_type === role && 
      ['default', 'additional'].includes(access.access_type)
    );
  });

  console.log('\n=== Role Access Mapping ===');
  Object.keys(roleAccessMap).forEach(role => {
    console.log(`${role}:`, roleAccessMap[role].map(a => `${a.menu_item_id}(${a.access_type})`));
  });

  // Step 4: Get unique menu item IDs
  const allAccessibleItemIds = new Set();
  Object.values(roleAccessMap).forEach(accesses => {
    accesses.forEach(access => {
      allAccessibleItemIds.add(access.menu_item_id);
    });
  });

  console.log('\n=== Accessible Menu Item IDs ===');
  console.log('Total unique items:', allAccessibleItemIds.size);
  console.log('Item IDs:', Array.from(allAccessibleItemIds).sort((a, b) => a - b));

  // Step 5: Get actual menu items
  const accessibleMenuItems = mockMenuItems.filter(item => 
    allAccessibleItemIds.has(item.id) && item.is_active === 1
  );

  console.log('\n=== Accessible Menu Items ===');
  accessibleMenuItems.forEach(item => {
    console.log(`ID: ${item.id}, Label: "${item.label}", Parent: ${item.parent_id}, Link: ${item.link || 'null'}`);
  });

  // Step 6: Build tree structure
  const buildTree = (items, parentId = null) => {
    return items
      .filter(i => i.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(i => {
        const children = buildTree(items, i.id);
        const item = { 
          id: i.id,
          label: i.label, 
          link: i.link,
          icon: i.icon 
        };
        if (children.length > 0) { 
          item.submenu = true; 
          item.submenuItems = children; 
        }
        return item;
      });
  };

  const rootItems = accessibleMenuItems.filter(i => i.parent_id === null);
  console.log('\n=== Root Items ===');
  rootItems.forEach(item => {
    console.log(`ID: ${item.id}, Label: "${item.label}"`);
  });

  const menuData = rootItems.map(section => {
    const sectionItems = buildTree(accessibleMenuItems, section.id);
    return {
      name: section.label,
      items: sectionItems
    };
  });

  console.log('\n=== Final Menu Structure ===');
  menuData.forEach((section, index) => {
    console.log(`${index + 1}. ${section.name} (${section.items.length} items)`);
    section.items.forEach((item, itemIndex) => {
      console.log(`   ${itemIndex + 1}. ${item.label} ${item.link ? `-> ${item.link}` : ''}`);
      if (item.submenuItems) {
        item.submenuItems.forEach((subItem, subIndex) => {
          console.log(`      ${subIndex + 1}. ${subItem.label} ${subItem.link ? `-> ${subItem.link}` : ''}`);
        });
      }
    });
  });

  return {
    success: true,
    data: menuData,
    totalItems: accessibleMenuItems.length,
    totalRootSections: rootItems.length
  };
}

// Identify potential issues in the getUserMenu function
function identifyIssues() {
  console.log('\n\n=== POTENTIAL ISSUES IDENTIFIED ===\n');

  const issues = [
    {
      issue: "Role Resolution Logic",
      description: "The function gets user roles but may not be properly handling multiple roles",
      location: "Lines 25-35 in getUserMenu",
      problem: "Only uses the first role (highest privilege) as effectiveUserType, but should use ALL roles for menu access",
      solution: "Use allUserRoles array for menu item filtering, not just effectiveUserType"
    },
    {
      issue: "Query Parameter Mismatch",
      description: "The IN clause placeholders may not match the actual roles array length",
      location: "Lines 217-235 in getUserMenu", 
      problem: "rolePlaceholders generation and replacements array may be misaligned",
      solution: "Ensure rolePlaceholders count matches allRoles.length exactly"
    },
    {
      issue: "Role Inheritance Not Applied",
      description: "Role inheritance logic exists but may not be working correctly",
      location: "Lines 200-210 in getUserMenu",
      problem: "Inherited roles are added to allRolesWithInheritance but may not be used in final query",
      solution: "Verify that inherited roles are included in the final query parameters"
    },
    {
      issue: "Package Restrictions Override",
      description: "Package-level restrictions may be filtering out items the user should see",
      location: "Lines 140-180 in getUserMenu",
      problem: "effectivePkgId restrictions may be too strict for multi-role users",
      solution: "Consider role-specific package overrides or union of package permissions"
    },
    {
      issue: "School-Specific Access Logic",
      description: "School-specific menu access may not be properly handled",
      location: "Lines 225-230 in getUserMenu",
      problem: "School ID filtering in query may exclude items that should be available",
      solution: "Review school_id IS NULL OR school_id = ? logic"
    },
    {
      issue: "Cache Invalidation",
      description: "Menu cache may be serving stale data",
      location: "Lines 60-65 in getUserMenu",
      problem: "Cache key may not account for multiple roles properly",
      solution: "Include all user roles in cache key generation"
    }
  ];

  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.issue}`);
    console.log(`   Description: ${issue.description}`);
    console.log(`   Location: ${issue.location}`);
    console.log(`   Problem: ${issue.problem}`);
    console.log(`   Solution: ${issue.solution}`);
    console.log('');
  });
}

// Run the simulation
const result = simulateGetUserMenu(mockUserRoles);
console.log('\n=== SIMULATION RESULTS ===');
console.log(`Total accessible items: ${result.totalItems}`);
console.log(`Total root sections: ${result.totalRootSections}`);
console.log(`Expected items from database: 76`);
console.log(`Gap: ${76 - result.totalItems} items missing`);

// Identify issues
identifyIssues();

// Generate fix recommendations
console.log('\n=== RECOMMENDED FIXES ===\n');

const fixes = [
  {
    priority: "HIGH",
    fix: "Fix Role Array Usage",
    code: `// Replace line ~235 in getUserMenu
// FROM: const replacements = [...allRoles, schoolId, effectiveUserType, effectivePkgId];
// TO: const replacements = [...allUserRoles, schoolId, effectiveUserType, effectivePkgId];`
  },
  {
    priority: "HIGH", 
    fix: "Ensure Role Inheritance is Applied",
    code: `// After line ~210, ensure allRoles includes inherited roles:
const finalRoles = allUserRoles.length > 0 ? 
  [...new Set([...allUserRoles, ...inheritedRoles])] : 
  [effectiveUserType];`
  },
  {
    priority: "MEDIUM",
    fix: "Debug Query Parameters",
    code: `// Add debug logging before query execution:
console.log('RBAC Debug - Query params:', {
  allRoles: allRoles,
  schoolId: schoolId,
  effectiveUserType: effectiveUserType,
  effectivePkgId: effectivePkgId,
  replacements: replacements
});`
  },
  {
    priority: "MEDIUM",
    fix: "Fix Cache Key for Multiple Roles",
    code: `// Update cache key generation to include all roles:
const cacheKey = \`\${schoolId}_\${allUserRoles.sort().join('_')}\`;
const cached = await menuCache.get(cacheKey);`
  },
  {
    priority: "LOW",
    fix: "Add Role-Specific Package Logic",
    code: `// Consider different package restrictions per role:
const rolePackageMap = {
  teacher: Math.max(effectivePkgId, 2),
  exam_officer: Math.max(effectivePkgId, 3), 
  librarian: Math.max(effectivePkgId, 2)
};`
  }
];

fixes.forEach((fix, index) => {
  console.log(`${index + 1}. [${fix.priority}] ${fix.fix}`);
  console.log(fix.code);
  console.log('');
});

console.log('=== END OF ANALYSIS ===');