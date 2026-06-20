#!/bin/bash

# Define Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE} 🌟 PULSE FEEDS LOCAL DEV ENVIRONMENT & SYNCER     ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Gracefully stop existing server processes
echo -e "${YELLOW}🧹 Cleaning up previous server processes...${NC}"

# Stop any running node and vite instances cleanly
pkill -f "node server.js" 2>/dev/null
pkill -f "node server.ts" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo -e "${GREEN}✓ Cleaned up previous running instances!${NC}"

# 2. Synchronize Frontend Repository (pulse-feed-app-)
echo -e "${YELLOW}🎰 Synchronizing Frontend (pulse-feed-app-)...${NC}"
if [ -d "$HOME/pulse-feed-app-" ]; then
    cd "$HOME/pulse-feed-app-" || exit
    # Set safe CRLF configurations for Termux
    git config core.autocrlf input
    
    echo -e "${YELLOW}🔄 Pulling changes using autostash rebase...${NC}"
    # --autostash dynamically stashes local modifications, rebases, and pops them cleanly
    if git pull origin main --rebase --autostash; then
        echo -e "${GREEN}✓ Frontend synchronized successfully!${NC}"
    else
        echo -e "${RED}✗ Frontend sync failed. Please review terminal output above.${NC}"
    fi
else
    echo -e "${RED}✗ Directory ~/pulse-feed-app- not found! Redownloading...${NC}"
    cd "$HOME" || exit
    git clone https://github.com/ed551/pulse-feed-app-.git
fi

# 3. Synchronize Backend Repository (pulse-feeds-server)
echo -e "${YELLOW}🎰 Synchronizing Backend (pulse-feeds-server)...${NC}"
if [ -d "$HOME/pulse-feeds-server" ]; then
    cd "$HOME/pulse-feeds-server" || exit
    # Set safe CRLF configurations
    git config core.autocrlf input
    
    echo -e "${YELLOW}🔄 Pulling backend changes using autostash rebase...${NC}"
    if git pull origin main --rebase --autostash; then
        echo -e "${GREEN}✓ Backend synchronized successfully!${NC}"
    else
        echo -e "${RED}✗ Backend sync failed. Please review terminal output above.${NC}"
    fi
else
    echo -e "${RED}✗ Directory ~/pulse-feeds-server not found!${NC}"
fi

# 4. Starting Express Server
echo -e "${YELLOW}⚡ Starting Express Backend Server...${NC}"
if [ -d "$HOME/pulse-feeds-server" ]; then
    cd "$HOME/pulse-feeds-server" || exit
    # Run in background redirecting output to backend.log
    node server.js > "$HOME/pulse-feeds-server/backend.log" 2>&1 &
    sleep 2 # Let it boot up slightly
    echo -e "${GREEN}✓ Express Backend is running (Logs: ~/pulse-feeds-server/backend.log)${NC}"
else
    echo -e "${RED}✗ Cannot start backend: Directory ~/pulse-feeds-server missing!${NC}"
fi

# 5. Starting Frontend Dev Server
echo -e "${YELLOW}🖥️ Starting Frontend Dev Server...${NC}"
if [ -d "$HOME/pulse-feed-app-" ]; then
    cd "$HOME/pulse-feed-app-" || exit
    # Run vite process in background redirecting to frontend.log
    npx vite > "$HOME/pulse-feed-app-/frontend.log" 2>&1 &
    sleep 2
    echo -e "${GREEN}✓ Vite local dev server is running! (Logs: ~/pulse-feed-app-/frontend.log)${NC}"
else
     echo -e "${RED}✗ Cannot start frontend: Directory ~/pulse-feed-app- missing!${NC}"
fi

echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}🚀 Pulse Feeds Local Environment is Live!${NC}"
echo -e "${YELLOW}To manually stop running servers, run: ${RED}pkill -f \"node server.js\" && pkill -f \"vite\"${NC}"
echo -e "${BLUE}====================================================${NC}"
