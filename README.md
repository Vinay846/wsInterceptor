# WebSocket Interceptor

A powerful WebSocket interceptor and proxy tool with a React-based UI for testing and debugging WebSocket connections.

## Features

- 🔄 WebSocket message interception and forwarding
- 🌉 Bridge mode for connecting real game clients
- 📊 Real-time message monitoring
- 💾 Data persistence and replay
- 🎮 Game ID synchronization
- 📱 Modern React UI with Redux state management
- ✅ **No admin/root permissions required**

## Development

### Installation
```bash
npm install
```

### Running Locally
```bash
# Start both client dev server and WebSocket server
npm start
# Access at http://localhost:5173
```

### Building
```bash
# Build React client
npm run build
```

## Creating Standalone Executables

Build standalone executables for Windows, macOS, and Linux:

```bash
# Single command for all platforms (Recommended)
npm run build:executables
```

**Individual platforms:**
```bash
npm run pkg:build-win      # Windows only
npm run pkg:build-linux    # Linux only
npm run pkg:build-macos    # macOS only
```

**Output:** Executables are created in the `build/` directory:
- `wsinterceptor-win.exe` (Windows)
- `wsinterceptor-linux` (Linux)
- `wsinterceptor-macos` (macOS)

## Running the Application (No Admin Required!)

### ✅ Key Features
- **NO administrator or root access required**
- **NO installation needed** - just run the executable
- Data stored in user directories (no system modifications)
- Uses standard ports: 8083 (HTTP/UI), 8084 (WebSocket)

### Data Storage Locations
The application stores data in OS-specific user directories:
- **Windows**: `%LOCALAPPDATA%\wsinterceptor\` (e.g., `C:\Users\YourName\AppData\Local\wsinterceptor\`)
- **macOS**: `~/Library/Application Support/wsinterceptor/`
- **Linux**: `~/.config/wsinterceptor/`

---

## Platform-Specific Instructions

### Windows

**Running:**
1. Double-click `wsinterceptor-win.exe` (or run from command line)
2. **If Windows SmartScreen warning appears:**
   - Click **"More info"**
   - Click **"Run anyway"**
   - ⚠️ This is NOT an admin request - just a security warning for unsigned apps
3. Browser will automatically open to `http://localhost:8083`

**Important:**
- ✅ No UAC (User Account Control) prompt should appear
- ✅ No admin password required
- ⚠️ If you see UAC prompt, you may be running from a protected directory (e.g., Program Files)

**Firewall:**
- Windows may ask to allow network access - click **"Allow"**
- This is normal for apps using network ports

---

### macOS

**Running:**
```bash
# Make executable (first time only)
chmod +x wsinterceptor-macos

# Remove quarantine flag to bypass Gatekeeper
xattr -d com.apple.quarantine wsinterceptor-macos

# Run it
./wsinterceptor-macos
```

**If macOS blocks it:**
- Go to: **System Preferences** → **Security & Privacy**
- Click **"Open Anyway"** for wsinterceptor-macos

**Important:**
- ✅ No admin password required
- ✅ Do NOT use `sudo`
- ⚠️ Gatekeeper warnings are normal for unsigned apps

**Access the UI:**
Open browser to `http://localhost:8083`

---

### Linux

**Running:**
```bash
# Make executable (first time only)
chmod +x wsinterceptor-linux

# Run it
./wsinterceptor-linux
```

**Important:**
- ✅ No sudo required
- ✅ No root access needed
- ✅ Just needs execute permission

**Access the UI:**
Open browser to `http://localhost:8083`

---

## Quick Start Guide

1. **Download** the executable for your OS
2. **Run** it (see platform-specific instructions above)
3. **Open browser** to `http://localhost:8083`
4. **Start testing** WebSocket connections!

## Server Information

### Ports
- **8083**: HTTP Server (API + Web UI)
- **8084**: WebSocket Server

### API Endpoints
- `GET /` - Web UI
- `GET /data` - Get saved data
- `POST /save-collected-data` - Save collected messages
- `POST /update-game-ids` - Update game IDs

### Bridge Mode
Connect real game clients through the interceptor:
1. Enable bridge mode in the UI
2. Connect interceptor client to real game server
3. Connect game clients to the interceptor
4. Messages flow: **Game Client ↔ Interceptor ↔ Real Server**

## Troubleshooting

### Security Warnings

**Windows SmartScreen / macOS Gatekeeper:**
- These warnings appear because the executables are not digitally signed
- **These are NOT admin permission requests**
- Safe to bypass using the instructions above
- Signing requires expensive certificates ($100-500/year for Windows, Apple Developer account for macOS)

### "Port already in use"
If you see port conflict errors:
```bash
# Find and kill process using port 8083 or 8084
# Windows:
netstat -ano | findstr :8083
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:8083 | xargs kill -9
```

Or modify ports in `server.js` and rebuild.

### Firewall Issues
- Allow the application through your firewall when prompted
- The app needs network access for WebSocket and HTTP servers

### Antivirus False Positives
Some antivirus software may flag pkg executables:
- This is common for self-contained Node.js executables
- Add an exception for wsinterceptor
- Source code is fully available for inspection

### Application Won't Start
- Ensure ports 8083 and 8084 are not in use
- Run from a user-writable directory (not Program Files or /usr/bin)
- Check that you have network permissions

## Why No Admin Permissions?

This application is specifically designed to run without elevated privileges:

✅ **User-writable data locations** - All data stored in OS user directories  
✅ **Non-privileged ports** - Uses ports 8083 and 8084 (above 1024)  
✅ **No system modifications** - Doesn't install or modify system files  
✅ **Portable** - Can run from any user-accessible folder  

**If the app requests admin/root:**
- You may be running from a protected directory
- Check file permissions
- Ensure you're using the latest build

## License

ISC
