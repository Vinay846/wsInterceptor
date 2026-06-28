#!/bin/bash

echo ""
echo "===================================="
echo "  Starting WS Interceptor"
echo "===================================="
echo ""
echo "This application does NOT require root/sudo."
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    EXECUTABLE="./build/wsinterceptor-macos"
    BROWSER_CMD="open"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    EXECUTABLE="./build/wsinterceptor-linux"
    BROWSER_CMD="xdg-open"
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

# Check if executable exists
if [ ! -f "$EXECUTABLE" ]; then
    echo "ERROR: $EXECUTABLE not found!"
    echo "Please run: npm run build:executables"
    exit 1
fi

# Make executable if not already
if [ ! -x "$EXECUTABLE" ]; then
    echo "Making executable..."
    chmod +x "$EXECUTABLE"
fi

# Remove quarantine on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Removing macOS quarantine flag (if present)..."
    xattr -d com.apple.quarantine "$EXECUTABLE" 2>/dev/null || true
fi

echo "Starting server..."
echo ""

# Start the server in background
$EXECUTABLE &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 5

# Check if server is still running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo ""
    echo "✅ Server started successfully!"
    echo "   PID: $SERVER_PID"
    echo ""
    echo "Opening browser..."
    $BROWSER_CMD http://localhost:8083 2>/dev/null || echo "Please open: http://localhost:8083"
    echo ""
    echo "Press Ctrl+C to stop the server"
    
    # Wait for the server process
    wait $SERVER_PID
else
    echo ""
    echo "❌ Server failed to start. Check the error messages above."
    exit 1
fi

