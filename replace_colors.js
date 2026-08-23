const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

const replaceRules = [
  // Text colors
  { regex: /color:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.[4-8]\)['"]/g, replacement: "color: 'var(--foreground-muted)'" },
  { regex: /color:\s*['"]#fff['"]/gi, replacement: "color: 'var(--foreground)'" },
  { regex: /color:\s*['"]white['"]/gi, replacement: "color: 'var(--foreground)'" },
  // Backgrounds
  { regex: /background:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.1\)['"]/g, replacement: "background: 'var(--glass-border)'" },
  { regex: /background:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.05\)['"]/g, replacement: "background: 'var(--glass)'" },
  { regex: /background:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.02\)['"]/g, replacement: "background: 'var(--glass)'" },
  { regex: /background:\s*['"]rgba\(0,\s*0,\s*0,\s*0\.2\)['"]/g, replacement: "background: 'var(--glass-border)'" },
  { regex: /background:\s*['"]rgba\(0,\s*0,\s*0,\s*0\.3\)['"]/g, replacement: "background: 'var(--glass-border)'" },
  { regex: /background:\s*['"]rgba\(15,\s*23,\s*42,\s*0\.8\)['"]/g, replacement: "background: 'var(--glass)'" },
  { regex: /background:\s*['"]rgba\(0,\s*0,\s*0,\s*0\.8\)['"]/g, replacement: "background: 'var(--glass)'" },
  // Border colors
  { regex: /border:\s*['"]1px solid rgba\(255,255,255,0\.1\)['"]/g, replacement: "border: '1px solid var(--glass-border)'" }
];

walk('e:/buildai/src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;
    
    replaceRules.forEach(rule => {
      content = content.replace(rule.regex, rule.replacement);
    });

    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated colors in ${filePath}`);
    }
  }
});
