const fs = require('fs');
const path = require('path');

function removeDarkClasses(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      removeDarkClasses(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const newContent = content.replace(/dark:[a-zA-Z0-9/\[\]#-]*\s?/g, '');
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

removeDarkClasses('./src');
console.log('Done removing dark classes.');
