#!/bin/bash

# Chrome DevTools MCP Server Wrapper
# This script launches the Chrome DevTools MCP server via npx

# Set Node.js path (update this path to match your Node.js installation)
# You can find your Node.js path with: which node
export PATH=$HOME/.nvm/versions/node/v22.20.0/bin:$PATH

# On Linux without DISPLAY, start Xvfb if available
if [[ "$OSTYPE" == "linux-gnu"* ]] && [ -z "$DISPLAY" ]; then
    if command -v Xvfb >/dev/null 2>&1; then
        export DISPLAY=:99
        if ! pgrep -x Xvfb > /dev/null; then
            Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
            sleep 1
        fi
    fi
fi

# Add Chrome flags for running as root or in restricted environments
export PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"

# Launch Chrome DevTools MCP Server
# The --isolated flag runs Chrome in isolated mode for better stability
exec npx chrome-devtools-mcp@latest --isolated
