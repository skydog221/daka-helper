const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, '..', 'src', 'renderer', 'preload.js');
const targetFile = path.join(__dirname, '..', 'dist', 'electron', 'preload.js');
const targetDir = path.dirname(targetFile);

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 复制文件
fs.copyFileSync(sourceFile, targetFile);
console.log('[Copy Script] preload.js 已复制到 dist/electron/preload.js');