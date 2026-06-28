const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Post-processing script for pkg builds
console.log('🔧 Running post-build processing...');

const buildDir = path.join(__dirname, 'build');
const winExe = path.join(buildDir, 'wsinterceptor-win.exe');
const macExe = path.join(buildDir, 'wsinterceptor-macos');
const linuxExe = path.join(buildDir, 'wsinterceptor-linux');

// Make macOS and Linux executables properly executable
if (fs.existsSync(macExe)) {
  try {
    fs.chmodSync(macExe, 0o755);
    console.log('✅ macOS executable permissions set');
  } catch (err) {
    console.warn('⚠️  Could not set macOS permissions:', err.message);
  }
}

if (fs.existsSync(linuxExe)) {
  try {
    fs.chmodSync(linuxExe, 0o755);
    console.log('✅ Linux executable permissions set');
  } catch (err) {
    console.warn('⚠️  Could not set Linux permissions:', err.message);
  }
}

// For Windows, we'll add a resource tool check (optional)
if (fs.existsSync(winExe)) {
  console.log('✅ Windows executable created');
  console.log('ℹ️  Note: Windows users may need to allow the app in Windows Defender');
}

console.log('✅ Post-build processing complete!');

