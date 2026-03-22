#!/usr/bin/env bash
# scripts/bootstrap.sh
# One-command setup for Modish Standard local development
set -euo pipefail

echo "Modish Standard — Project Bootstrap"
echo "========================================"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required (v20+)"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Node.js 18+ required. Current: $(node -v)"
  exit 1
fi

echo "Prerequisites OK (Node $(node -v))"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm ci

# Setup environment variables
if [ ! -f .env.local ]; then
  echo ""
  echo "Setting up environment variables..."
  cp .env.example .env.local
  echo ".env.local created. Please fill in your values:"
  echo "  - NEXT_PUBLIC_SANITY_PROJECT_ID (from sanity.io/manage)"
  echo "  - SANITY_API_TOKEN (from sanity.io/manage > API > Tokens)"
  echo "  - NEXT_PUBLIC_WHATSAPP_NUMBER (e.g. 2348012345678)"
else
  echo ".env.local already exists"
fi

echo ""
echo "Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. Fill in .env.local with your values"
echo "  2. npm run dev          — start development server"
echo "  3. Open http://localhost:3000"
echo ""
