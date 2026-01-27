const fs = require('fs');

// Read the file
const filePath = '/Users/apple/Downloads/apps/elite/elscholar-api/src/controllers/caAssessmentController.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find the second getEndOfTermReport function (starts at line 2314)
const lines = content.split('\n');

// Find the start of the second function
let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const getEndOfTermReport = async (req, res) => {') && i > 2000) {
    startIndex = i;
    console.log(`Found second function at line ${i + 1}`);
    break;
  }
}

if (startIndex === -1) {
  console.log('Second function not found');
  process.exit(1);
}

// Find the end of the function by counting braces
let braceCount = 0;
let inFunction = false;

for (let i = startIndex; i < lines.length; i++) {
  const line = lines[i];
  
  // Count opening and closing braces
  for (let char of line) {
    if (char === '{') {
      braceCount++;
      inFunction = true;
    } else if (char === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        endIndex = i;
        console.log(`Found function end at line ${i + 1}`);
        break;
      }
    }
  }
  
  if (endIndex !== -1) break;
}

if (endIndex === -1) {
  console.log('Function end not found');
  process.exit(1);
}

// Remove the function
const newLines = [
  ...lines.slice(0, startIndex),
  ...lines.slice(endIndex + 1)
];

// Write back to file
fs.writeFileSync(filePath, newLines.join('\n'));
console.log(`Removed second getEndOfTermReport function (lines ${startIndex + 1} to ${endIndex + 1})`);
