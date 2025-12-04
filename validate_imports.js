#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function validateImports() {
  console.log('🔍 Validating all_routes imports...
');
  
  const srcDir = 'elscholar-ui/src';
  if (!fs.existsSync(srcDir)) {
    console.error('❌ Source directory not found:', srcDir);
    return false;
  }
  
  // Check if the target file exists
  const routesFile = 'elscholar-ui/src/feature-module/router/all_routes.tsx';
  if (!fs.existsSync(routesFile)) {
    console.error('❌ Routes file not found:', routesFile);
    return false;
  }
  
  console.log('✅ Routes file exists:', routesFile);
  
  // Find all files with problematic import patterns
  const problematicPatterns = [
    /import\s*{\s*all_routes\s*}\s*from\s*["'].*?src\/feature-module\/router\/all_routes/g,
    /import\s*{\s*all_routes\s*}\s*from\s*["']@\/feature-module\/router\/all_routes/g,
  ];
  
  function findAllTsxFiles(dir) {
    const files = [];
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dir);
    return files;
  }
  
  const allFiles = findAllTsxFiles(srcDir);
  const filesWithImports = allFiles.filter(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.includes('all_routes');
    } catch (error) {
      return false;
    }
  });
  
  console.log(`📁 Found ${filesWithImports.length} files with all_routes imports
`);
  
  let issuesFound = 0;
  
  for (const filePath of filesWithImports) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for problematic patterns
      let hasIssues = false;
      for (const pattern of problematicPatterns) {
        if (pattern.test(content)) {
          hasIssues = true;
          break;
        }
      }
      
      if (hasIssues) {
        console.log(`❌ Issues found in: ${filePath}`);
        issuesFound++;
      }
    } catch (error) {
      console.log(`⚠️  Could not read: ${filePath}`);
    }
  }
  
  if (issuesFound === 0) {
    console.log('🎉 All import paths look correct!');
    console.log('✅ No problematic import patterns found');
    return true;
  } else {
    console.log(`
❌ Found ${issuesFound} files with import issues`);
    console.log('💡 Run "node fix_all_imports.js" to fix these issues');
    return false;
  }
}

if (require.main === module) {
  const success = validateImports();
  process.exit(success ? 0 : 1);
}

module.exports = { validateImports };