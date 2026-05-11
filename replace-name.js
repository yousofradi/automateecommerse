const fs = require('fs');
const path = require('path');

const directoriesToScan = ['backend', 'frontend', 'storefront-react', 'admin-react'];
const extensionsToReplace = ['.js', '.jsx', '.html', '.json', '.md'];

function scanAndReplace(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanAndReplace(fullPath);
    } else if (stat.isFile() && extensionsToReplace.includes(path.extname(fullPath))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let newContent = content
        .replace(/Sundura/g, 'AutoEcommerce')
        .replace(/sundura/g, 'autoecommerce');
        
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

for (const dir of directoriesToScan) {
  scanAndReplace(path.join(__dirname, dir));
}
console.log('Replacement complete.');
