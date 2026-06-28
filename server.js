const WebSocket = require('ws');
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');
const cors = require('cors');
const { GAME_ID_UPDATE_FIELDS } = require('./shared-constants');

// Express Server
const app = express();
const PORT = 8083;

// Helper function to get user-writable data directory
function getDataDirectory() {
  if (process.pkg) {
    // When packaged, use user-writable directory to avoid admin requirements
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows: Use Local AppData (no admin required)
      return path.join(os.homedir(), 'AppData', 'Local', 'wsinterceptor');
    } else if (platform === 'darwin') {
      // macOS: Use Application Support
      return path.join(os.homedir(), 'Library', 'Application Support', 'wsinterceptor');
    } else {
      // Linux and others: Use .config in home directory
      return path.join(os.homedir(), '.config', 'wsinterceptor');
    }
  } else {
    // Development mode: use project directory
    return __dirname;
  }
}

// Ensure data directory exists
const dataDir = getDataDirectory();
if (process.pkg && !fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.error('❌ Error creating data directory:', err);
  }
}

// Detect if running in packaged mode (pkg)
// If packaged, store data.json in user-writable directory (no admin required)
// If not packaged, store it in __dirname (development mode)
const DATA_FILE = path.join(dataDir, 'data.json');

// If running in packaged mode and data.json doesn't exist in writable location,
// copy it from the bundled version
if (process.pkg && !fs.existsSync(DATA_FILE)) {
  const bundledDataFile = path.join(__dirname, 'data.json');
  try {
    if (fs.existsSync(bundledDataFile)) {
      const bundledData = fs.readFileSync(bundledDataFile, 'utf8');
      fs.writeFileSync(DATA_FILE, bundledData);
    } else {
      // If bundled file doesn't exist, create default
      const initialData = {
        savedData: {
          savedAt: new Date().toISOString(),
          messageCount: 0
        },
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    }
  } catch (err) {
    console.error('❌ Error setting up data.json:', err);
  }
} else if (!process.pkg && !fs.existsSync(DATA_FILE)) {
  // Development mode - create default if doesn't exist
  const initialData = {
    savedData: {
      savedAt: new Date().toISOString(),
      messageCount: 0
    },
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// ---------------------------------------------------------------------------
// Configuration management (data file registry, active file, initial keys)
// ---------------------------------------------------------------------------
const CONFIG_FILE = path.join(dataDir, 'config.json');
const DEFAULT_DATA_FILE = 'data.json';
// Keys that are auto-sent to every newly connected client (configurable from UI)
const DEFAULT_INITIAL_KEYS = ['table', 'dealer', 'game', 'disablesidebets', 'ShoeSummary', 'statistic', 'subscribe'];

function getDefaultDataStructure() {
  return {
    savedData: {
      savedAt: new Date().toISOString(),
      messageCount: 0
    },
    lastUpdated: new Date().toISOString()
  };
}

// Validate and normalize a user supplied data file name (prevents path traversal)
function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') return null;
  let safe = name.trim();
  if (!safe) return null;
  if (!safe.toLowerCase().endsWith('.json')) safe += '.json';
  // Disallow path separators and any unexpected characters
  if (!/^[\w\-. ]+\.json$/i.test(safe)) return null;
  if (safe.toLowerCase() === 'config.json') return null; // reserved
  return safe;
}

function loadConfig() {
  const config = {
    activeFile: DEFAULT_DATA_FILE,
    initialKeys: [...DEFAULT_INITIAL_KEYS],
    files: [DEFAULT_DATA_FILE]
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.files)) {
          config.files = parsed.files.map(sanitizeFileName).filter(Boolean);
        }
        if (typeof parsed.activeFile === 'string') {
          config.activeFile = sanitizeFileName(parsed.activeFile) || DEFAULT_DATA_FILE;
        }
        if (Array.isArray(parsed.initialKeys)) {
          config.initialKeys = parsed.initialKeys.filter((k) => typeof k === 'string');
        }
      }
    }
  } catch (err) {
    console.error('❌ Error loading config, using defaults:', err);
  }

  // The base data file must always be available
  if (!config.files.includes(DEFAULT_DATA_FILE)) {
    config.files.unshift(DEFAULT_DATA_FILE);
  }
  // Active file must be part of the registry
  if (!config.files.includes(config.activeFile)) {
    config.activeFile = config.files[0] || DEFAULT_DATA_FILE;
  }

  return config;
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('❌ Error saving config:', err);
    return false;
  }
}

// Ensure a data file physically exists, creating an empty structure if needed
function ensureDataFile(fileName) {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(getDefaultDataStructure(), null, 2));
    } catch (err) {
      console.error(`❌ Error creating data file ${fileName}:`, err);
    }
  }
  return filePath;
}

// Resolve the full path of the currently active data file (used by all data ops)
function getActiveDataFilePath() {
  const config = loadConfig();
  return ensureDataFile(config.activeFile);
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route to serve the React app for any other requests
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const wss = new WebSocket.Server({ port: 8084 });
const clients = new Map();
let globalSeqCounter = 1000;
let bridgeMode = false;
let interceptorClient = null;

function getNextSeqId() {
  return ++globalSeqCounter;
}

function broadcastBridgeModeStatus() {
  const statusMessage = {
    type: 'bridge_mode_status',
    bridgeMode: bridgeMode,
    timestamp: new Date().toISOString()
  };
  
  clients.forEach((clientInfo, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(statusMessage));
    }
  });
  
}

wss.on('connection', function connection(ws) {
  
  clients.set(ws, { type: 'regular', id: Date.now().toString() });

  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'bridge_mode_status',
        bridgeMode: bridgeMode,
        timestamp: new Date().toISOString()
      }));
    }
  }, 100);

  // Send initial messages to the newly connected client (only if not interceptor)
  // In bridge mode, send initial messages first, then bridge mode takes over for subsequent messages
  setTimeout(() => {
    const clientInfo = clients.get(ws);
    if (clientInfo && clientInfo.type !== 'interceptor') {

      const activeDataFile = getActiveDataFilePath();
      const initialKeys = loadConfig().initialKeys;

      fs.readFile(activeDataFile, 'utf8', (err, data) => {
        if (!err && data) {
          try {
            const jsonData = JSON.parse(data);
            
            if (jsonData.savedData) {
              const { savedAt, messageCount, ...gameData } = jsonData.savedData;

              // Send ONLY the configured initial keys (not all data)
              initialKeys.forEach((key, index) => {
                setTimeout(() => {
                  if (gameData[key] && ws.readyState === WebSocket.OPEN) {
                    const message = JSON.stringify({ [key]: gameData[key] });
                    ws.send(message);
                  }
                }, index * 200);
              });
            }
          } catch (parseErr) {
            console.error('❌ Could not parse saved data for initial messages:', parseErr);
          }
        } else {
          console.error('❌ Could not read data file for initial messages:', err);
        }
      });
    }
  }, 500);

  ws.on('message', function message(data) {
    const messageStr = data.toString();
    
    try {
      const messageData = JSON.parse(messageStr);
      
      if (messageData.type === 'client_identification') {
        const clientInfo = clients.get(ws);
        if (clientInfo) {
          clientInfo.type = messageData.clientType;
          clients.set(ws, clientInfo);
          
          if (messageData.clientType === 'interceptor') {
            interceptorClient = ws;
          }
          
          ws.send(JSON.stringify({
            type: 'identification_confirmed',
            clientType: messageData.clientType,
            bridgeMode: bridgeMode,
            timestamp: new Date().toISOString()
          }));
          
          return;
        }
      }
      
      if (messageData.type === 'bridge_mode_toggle') {
        const oldBridgeMode = bridgeMode;
        bridgeMode = messageData.enabled;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'bridge_mode_confirmed',
            bridgeMode: bridgeMode,
            previousMode: oldBridgeMode,
            message: `Bridge mode ${bridgeMode ? 'enabled' : 'disabled'} successfully`,
            timestamp: new Date().toISOString()
          }));
        }
        
        broadcastBridgeModeStatus();
        
        return;
      }
      
      // Skip other control messages in bridge mode (except from interceptor)
      if (bridgeMode && messageData.type && clients.get(ws)?.type !== 'interceptor') {
        return;
      }
      
    } catch (parseErr) {
      // Ignore parse errors, message is not JSON control message
    }
    
    // Bridge Mode Logic - Handle ALL messages (JSON and non-JSON)
    if (bridgeMode) {
      const senderInfo = clients.get(ws);
      
      if (senderInfo && senderInfo.type === 'interceptor') {
        let forwardedCount = 0;
        clients.forEach((clientInfo, client) => {
          if (client !== ws && clientInfo.type === 'regular' && client.readyState === WebSocket.OPEN) {
            try {
              client.send(messageStr);
              forwardedCount++;
            } catch (error) {
              // Ignore send errors, client might have disconnected
            }
          }
        });
        return;
      } else if (senderInfo && senderInfo.type === 'regular') {
        if (interceptorClient && interceptorClient.readyState === WebSocket.OPEN) {
          try {
            interceptorClient.send(messageStr);
          } catch (error) {
            // Ignore send errors, interceptor might have disconnected
          }
        }
        return;
      }
    }
    
    if (!bridgeMode) {
      try {
        if (messageStr.includes('<command channel="') && messageStr.includes('<lpbet')) {
          
          const channelMatch = messageStr.match(/channel="([^"]+)"/);
          
          if (channelMatch) {
            const channel = channelMatch[1];
            const seq = getNextSeqId();
            const commandResponse = {
              "command": {
                "channel": channel,
                "status": "success",
                "seq": seq
              }
            };
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(commandResponse));
            }
            
            return;
          }
        }
        
        if (messageStr.includes('<ping channel="') && messageStr.includes('time="') && messageStr.includes('"/>')) {
          const channelMatch = messageStr.match(/channel="([^"]+)"/);
          const timeMatch = messageStr.match(/time="([^"]+)"/);
          
          if (channelMatch && timeMatch) {
            const channel = channelMatch[1];
            const time = timeMatch[1];
            const seq = getNextSeqId();
            const pongResponse = {
              "pong": {
                "channel": channel,
                "time": time,
                "seq": seq
              }
            };
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(pongResponse));
            }
            
            return;
          }
        }
        
        JSON.parse(messageStr);
        clients.forEach((clientInfo, client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
          }
        });
        
        ws.send(`Server received: ${messageStr.substring(0, 100)}${messageStr.length > 100 ? '...' : ''}`);
        
      } catch (parseErr) {
        if (messageStr.includes('<command channel="') && messageStr.includes('<lpbet')) {
          
          const channelMatch = messageStr.match(/channel="([^"]+)"/);
          
          if (channelMatch) {
            const channel = channelMatch[1];
            const seq = getNextSeqId();
            
            const commandResponse = {
              "command": {
                "channel": channel,
                "status": "success",
                "seq": seq
              }
            };
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(commandResponse));
            }
            
            return;
          }
        }
        
        if (messageStr.includes('<ping channel="') && messageStr.includes('time="') && messageStr.includes('"/>')) {
          
          const channelMatch = messageStr.match(/channel="([^"]+)"/);
          const timeMatch = messageStr.match(/time="([^"]+)"/);
          
          if (channelMatch && timeMatch) {
            const channel = channelMatch[1];
            const time = timeMatch[1];
            const seq = getNextSeqId();
            
            const pongResponse = {
              "pong": {
                "channel": channel,
                "time": time,
                "seq": seq
              }
            };
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(pongResponse));
            }
            
            return;
          }
        }
        clients.forEach((clientInfo, client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
          }
        });
        
        ws.send(`Server received: ${messageStr.substring(0, 100)}${messageStr.length > 100 ? '...' : ''}`);
      }
    }
  });

  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    if (clientInfo && clientInfo.type === 'interceptor') {
      interceptorClient = null;
      const wasBridgeMode = bridgeMode;
      bridgeMode = false;
      
      if (wasBridgeMode) {
        broadcastBridgeModeStatus();
      }
    }
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    const clientInfo = clients.get(ws);
    if (clientInfo && clientInfo.type === 'interceptor') {
      interceptorClient = null;
      const wasBridgeMode = bridgeMode;
      bridgeMode = false;
      
      if (wasBridgeMode) {
        broadcastBridgeModeStatus();
      }
    }
    clients.delete(ws);
  });
});

// REST API endpoints
app.get('/data', (req, res) => {
  fs.readFile(getActiveDataFilePath(), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading data file:', err);
      return res.status(500).json({ error: 'Error reading data file' });
    }

    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (parseErr) {
      console.error('Invalid JSON format:', parseErr);
      res.status(500).json({ error: 'Corrupted JSON file' });
    }
  });
});

app.post('/update-game-ids', (req, res) => {
  const { newGameId } = req.body;

  if (!newGameId) {
    return res.status(400).json({ error: 'newGameId is required' });
  }

  const activeDataFile = getActiveDataFilePath();
  fs.readFile(activeDataFile, 'utf8', (err, existingData) => {
    if (err) {
      console.error('Error reading data file:', err);
      return res.status(500).json({ error: 'Error reading data file' });
    }

    try {
      const dataToUpdate = JSON.parse(existingData);
      
      if (!dataToUpdate.savedData) {
        return res.status(400).json({ error: 'No savedData found in file' });
      }

      // Update all game ID related fields using shared constants
      let updatedCount = 0;
      
      GAME_ID_UPDATE_FIELDS.forEach(({ key, field }) => {
        if (dataToUpdate.savedData[key] && dataToUpdate.savedData[key][field] !== undefined) {
            dataToUpdate.savedData[key][field] = newGameId;
          updatedCount++;
        }
      });

      dataToUpdate.lastUpdated = new Date().toISOString();
      
      fs.writeFile(activeDataFile, JSON.stringify(dataToUpdate, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error updating game IDs:', writeErr);
          return res.status(500).json({ error: 'Error updating game IDs' });
        }

        
        res.json({ 
          message: 'Game IDs updated successfully',
          newGameId: newGameId,
          updatedCount: updatedCount,
          data: dataToUpdate 
        });
      });

    } catch (parseErr) {
      console.error('Invalid JSON format:', parseErr);
      res.status(500).json({ error: 'Corrupted JSON file' });
    }
  });
});

app.post('/save-collected-data', (req, res) => {
  const collectedData = req.body;

  const activeDataFile = getActiveDataFilePath();
  fs.readFile(activeDataFile, 'utf8', (err, existingData) => {
    let dataToSave = {
      savedData: {
        savedAt: new Date().toISOString(),
        messageCount: 0
      },
      lastUpdated: new Date().toISOString()
    };

    if (!err && existingData) {
      try {
        dataToSave = JSON.parse(existingData);
      } catch (parseErr) {
        // Use default dataToSave if parse fails
      }
    }

    // Extract game.id to synchronize across all related keys
    let gameId = null;
    if (collectedData.game && collectedData.game.id) {
      gameId = collectedData.game.id;
    }

    Object.keys(collectedData).forEach(key => {
      let dataToUpdate = { ...collectedData[key] };
      
      // Synchronize IDs based on shared constants
      if (gameId) {
        const fieldsForKey = GAME_ID_UPDATE_FIELDS.filter(item => item.key === key);
        
        fieldsForKey.forEach(({ field }) => {
          if (dataToUpdate[field] !== undefined) {
            dataToUpdate[field] = gameId;
          }
        });
      }
      
      dataToSave.savedData[key] = dataToUpdate;
    });

    // Also update existing keys in savedData that weren't in the new collected data
    if (gameId && dataToSave.savedData) {
      GAME_ID_UPDATE_FIELDS.forEach(({ key, field }) => {
        if (dataToSave.savedData[key] && dataToSave.savedData[key][field] !== undefined) {
          dataToSave.savedData[key][field] = gameId;
        }
      });
    }
    
    // Update metadata
    dataToSave.savedData.savedAt = new Date().toISOString();
    dataToSave.savedData.messageCount = Object.keys(collectedData).length;
    dataToSave.lastUpdated = new Date().toISOString();

    fs.writeFile(activeDataFile, JSON.stringify(dataToSave, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Error saving collected data:', writeErr);
        return res.status(500).json({ error: 'Error saving collected data' });
      }

      
      res.json({ 
        message: 'Round data updated successfully with complete ID synchronization', 
        gameId: gameId,
        updatedKeys: Object.keys(collectedData),
        totalKeys: Object.keys(dataToSave.savedData).length - 2, // Subtract metadata keys
        data: dataToSave
      });
    });
  });
});


// ---------------------------------------------------------------------------
// Configuration & data-file management endpoints
// ---------------------------------------------------------------------------

// List all registered data files plus the active file and initial-keys config
app.get('/files', (req, res) => {
  const config = loadConfig();
  res.json({
    files: config.files,
    activeFile: config.activeFile,
    initialKeys: config.initialKeys
  });
});

// Create a new (empty) data file
app.post('/files', (req, res) => {
  const fileName = sanitizeFileName(req.body && req.body.fileName);
  if (!fileName) {
    return res.status(400).json({ error: 'Invalid file name. Use letters, numbers, spaces, - . _ only.' });
  }

  const config = loadConfig();
  if (config.files.includes(fileName)) {
    return res.status(409).json({ error: 'A file with this name already exists' });
  }

  ensureDataFile(fileName);
  config.files.push(fileName);
  if (!saveConfig(config)) {
    return res.status(500).json({ error: 'Failed to persist configuration' });
  }

  res.json({ message: 'File created', files: config.files, activeFile: config.activeFile });
});

// Delete a data file
app.delete('/files/:fileName', (req, res) => {
  const fileName = sanitizeFileName(req.params.fileName);
  if (!fileName) {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  const config = loadConfig();
  if (!config.files.includes(fileName)) {
    return res.status(404).json({ error: 'File not found' });
  }
  if (config.files.length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only remaining data file' });
  }

  config.files = config.files.filter((f) => f !== fileName);
  // If the deleted file was active, fall back to the first remaining file
  if (config.activeFile === fileName) {
    config.activeFile = config.files[0];
  }

  try {
    const filePath = path.join(dataDir, fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Error deleting data file:', err);
    return res.status(500).json({ error: 'Failed to delete file' });
  }

  if (!saveConfig(config)) {
    return res.status(500).json({ error: 'Failed to persist configuration' });
  }

  res.json({ message: 'File deleted', files: config.files, activeFile: config.activeFile });
});

// Set the active data file
app.post('/active-file', (req, res) => {
  const fileName = sanitizeFileName(req.body && req.body.fileName);
  if (!fileName) {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  const config = loadConfig();
  if (!config.files.includes(fileName)) {
    return res.status(404).json({ error: 'File not found in registry' });
  }

  config.activeFile = fileName;
  ensureDataFile(fileName);
  if (!saveConfig(config)) {
    return res.status(500).json({ error: 'Failed to persist configuration' });
  }

  res.json({ message: 'Active file updated', activeFile: config.activeFile, files: config.files });
});

// Update the list of keys auto-sent to newly connected clients
app.post('/config/initial-keys', (req, res) => {
  const keys = req.body && req.body.keys;
  if (!Array.isArray(keys) || keys.some((k) => typeof k !== 'string')) {
    return res.status(400).json({ error: 'keys must be an array of strings' });
  }

  const config = loadConfig();
  config.initialKeys = keys;
  if (!saveConfig(config)) {
    return res.status(500).json({ error: 'Failed to persist configuration' });
  }

  res.json({ message: 'Initial keys updated', initialKeys: config.initialKeys });
});

// Add or update a single message key in the active data file
app.post('/update-message', (req, res) => {
  const { key, data } = req.body || {};

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'key is required' });
  }
  if (data === undefined || data === null || typeof data !== 'object') {
    return res.status(400).json({ error: 'data must be an object' });
  }

  const activeDataFile = getActiveDataFilePath();
  fs.readFile(activeDataFile, 'utf8', (err, existingData) => {
    let dataToSave = getDefaultDataStructure();
    if (!err && existingData) {
      try {
        dataToSave = JSON.parse(existingData);
      } catch (parseErr) {
        // Fall back to a fresh structure if the file is corrupted
      }
    }

    if (!dataToSave.savedData) {
      dataToSave.savedData = { savedAt: new Date().toISOString(), messageCount: 0 };
    }

    dataToSave.savedData[key] = data;
    dataToSave.lastUpdated = new Date().toISOString();

    fs.writeFile(activeDataFile, JSON.stringify(dataToSave, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Error updating message:', writeErr);
        return res.status(500).json({ error: 'Error updating message' });
      }

      res.json({ message: 'Message saved', key, data: dataToSave });
    });
  });
});

// Delete a single message key from the active data file
app.delete('/message/:key', (req, res) => {
  const key = req.params.key;

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ error: 'key is required' });
  }

  const activeDataFile = getActiveDataFilePath();
  fs.readFile(activeDataFile, 'utf8', (err, existingData) => {
    if (err) {
      console.error('Error reading data file:', err);
      return res.status(500).json({ error: 'Error reading data file' });
    }

    let dataToSave;
    try {
      dataToSave = JSON.parse(existingData);
    } catch (parseErr) {
      return res.status(500).json({ error: 'Corrupted JSON file' });
    }

    if (!dataToSave.savedData || dataToSave.savedData[key] === undefined) {
      return res.status(404).json({ error: `Message "${key}" not found` });
    }

    delete dataToSave.savedData[key];
    dataToSave.lastUpdated = new Date().toISOString();

    fs.writeFile(activeDataFile, JSON.stringify(dataToSave, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Error deleting message:', writeErr);
        return res.status(500).json({ error: 'Error deleting message' });
      }

      res.json({ message: 'Message deleted', key, data: dataToSave });
    });
  });
});


app.listen(PORT, () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║        🌐  WS INTERCEPTOR  🌐                           ║');
  console.log('║                                                          ║');
  console.log('║        WebSocket Testing & Debugging Tool                ║');
  console.log('║                                                          ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║                                                          ║');
  console.log(`║  📡 API Server     : http://localhost:${PORT}              ║`);
  console.log('║  🔌 WebSocket      : ws://localhost:8084                 ║');
  console.log('║                                                          ║');
  if (process.pkg) {
    console.log(`║  🌍 Web Interface  : http://localhost:${PORT}              ║`);
  } else {
    console.log('║  🌍 Web Interface  : http://localhost:8083               ║');
    console.log('║                     (Vite dev server)                    ║');
  }
  console.log('║                                                          ║');
  if (process.pkg) {
    const dataFilePath = DATA_FILE.length > 52 ? '...' + DATA_FILE.slice(-49) : DATA_FILE;
    console.log(`║  📁 Data file      : ${dataFilePath.padEnd(52)} ║`);
  }
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║                                                          ║');
  console.log('║  Features:                                               ║');
  console.log('║  ✓ Real-time message monitoring                          ║');
  console.log('║  ✓ Bridge mode for live connections                      ║');
  console.log('║  ✓ Data persistence & replay                             ║');
  console.log('║  ✓ Game ID synchronization                               ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n✨ Server is ready! Press Ctrl+C to stop.\n');
  if (!process.pkg) {
    console.log('💡 Running in development mode. Use npm run build:executables to create standalone executables.\n');
  }
});