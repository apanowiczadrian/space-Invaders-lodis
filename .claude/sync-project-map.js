// scripts/sync-project-map.js
const fs = require('fs');
const path = require('path');

function scanDirectory(dir, baseDir = dir) {
  let files = [];
  
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return;
    
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    
    if (entry.isDirectory()) {
      files.push(relativePath + '/');
      files = files.concat(scanDirectory(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  });
  
  return files;
}

function updateProjectMap() {
  const projectMap = JSON.parse(fs.readFileSync('projectMAP.json', 'utf8'));
  
  projectMap.fileTree = {
    root: ".",
    lastScanned: new Date().toISOString(),
    structure: scanDirectory('.')
  };
  
  fs.writeFileSync('projectMAP.json', JSON.stringify(projectMap, null, 2));
  console.log('✅ projectMAP.json updated');
}

updateProjectMap();