const fs = require('fs');
const path = require('path');

function fixLeftovers(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixLeftovers(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      // Fix leftovers like " :bg-white/5" or "':bg-white/5" or "` :bg-white/5"
      // The leftover starts with a colon and is preceded by a space, quote, or backtick.
      // Actually, it's just a colon followed by some characters, but not part of a valid class.
      // Let's just remove any class that starts with a colon.
      // A class in className="... :bg-white/5 ..."
      
      // We can split by space, quote, backtick, and if a token starts with ':', remove it.
      // But wait, what about 'peer-checked:after:translate-x-full'? That doesn't start with a colon.
      // It's only tokens that START with a colon.
      
      const newContent = content.replace(/(['"\s]):([a-zA-Z0-9/\[\]#-]+)/g, '$1');
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

fixLeftovers('./src');
console.log('Done fixing leftovers.');
