const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.main = 'electron/main.cjs';

pkg.scripts['electron:dev'] = 'concurrently -k "npm run dev" "wait-on tcp:5173 && electron ."';
pkg.scripts['electron:build'] = 'npm run build && electron-builder';

pkg.build = {
  appId: 'com.rgukt.connect',
  productName: 'RGUKT Connect',
  directories: {
    output: 'dist_electron'
  },
  files: [
    'dist/**/*',
    'electron/**/*'
  ],
  win: {
    target: 'nsis'
  }
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('package.json updated for electron!');
