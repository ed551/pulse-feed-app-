#!/bin/bash

# Configuration
git config core.autocrlf input

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}  🚀 PULSE FEEDS DEPLOY PIPELINE (ROBUST)     ${NC}"
echo -e "${BLUE}==============================================${NC}"

# Check for any active git modifications
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo -e "${YELLOW}Detected local modifications to sync.${NC}"
else
  echo -e "${GREEN}No changes to deploy. Code is clean!${NC}"
fi

# Ask for dynamic commit message
echo -e "${YELLOW}Enter your commit message:${NC}"
read -r commit_message

if [ -z "$commit_message" ]; then
  commit_message="Update codebase dependencies and scripts"
fi

echo -e "${YELLOW}🚀 Staging all project changes...${NC}"
git add .

echo -e "${YELLOW}💼 Committing changes locally...${NC}"
if git commit -m "$commit_message"; then
  echo -e "${GREEN}✓ Local commit created!${NC}"
else
  echo -e "${YELLOW}No changes to commit or commit skipped.${NC}"
fi

echo -e "${YELLOW}👑 Pulling latest updates from original branch (Rebase with Autostash)...${NC}"
# --autostash dynamically stashes modifications, pulls changes, rebases, and automatically restores them
if git pull origin main --rebase --autostash; then
  echo -e "${GREEN}✓ successfully synchronized from GitHub!${NC}"
else
  echo -e "${RED}✗ Sync failure: Merge conflicts or pull block detected. Please review logs or merge manually.${NC}"
  exit 1
fi

echo -e "${YELLOW}📦 Pushing code safely to GitHub...${NC}"
if git push origin main; then
  echo -e "${GREEN}✓ Push completed successfully!${NC}"
  echo -e "${GREEN}✓ GitHub Actions is now auto-building and deploying to Surge.${NC}"
else
  echo -e "${RED}✗ Push failure: Could not send changes to GitHub. Verify internet or access token permissions.${NC}"
  exit 1
fi

echo -e "${BLUE}==============================================${NC}"
