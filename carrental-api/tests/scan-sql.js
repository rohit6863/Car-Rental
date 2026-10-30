'use strict';
const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.js') && !file.includes('.test.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = walk(path.join(__dirname, '..', 'src'));
const suspicious = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check if line contains SQL keyword and string interpolation or concatenation
    const hasSql = /\b(SELECT|INSERT|UPDATE|DELETE)\b/i.test(line);
    const hasInterpolation = /\$\{.*?\}/.test(line);
    const hasConcatenation = /['"`]\s*\+\s*[a-zA-Z0-9_]/.test(line);
    if (hasSql && (hasInterpolation || hasConcatenation)) {
      suspicious.push({ file: path.relative(path.join(__dirname, '..'), file), line: idx + 1, code: line.trim() });
    }
  });
}

console.log(JSON.stringify(suspicious, null, 2));
