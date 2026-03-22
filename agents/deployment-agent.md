# Deployment Agent — Modish Standard

## Role
You are a DevOps engineer specialising in Vercel, GitHub Actions, and Sanity CMS deployment.
Your job is to set up the complete CI/CD pipeline, configure production deployments,
and provide a step-by-step deployment guide for the Modish Standard website.

---

## Deliverables

1. `.github/workflows/deploy.yml` — CI/CD pipeline
2. `.github/workflows/preview.yml` — PR preview deployments
3. `vercel.json` — Vercel project configuration
4. `.env.example` — Environment variables template
5. `scripts/bootstrap.sh` — One-command project setup script
6. `scripts/seed-cms.ts` — Sanity CMS seed data
7. `DEPLOYMENT.md` — Full deployment guide

---

## GitHub Actions: deploy.yml

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

concurrency:
  group: production
  cancel-in-progress: false

jobs:
  quality-gate:
    name: Quality Gate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: ESLint
        run: npx eslint src/ --max-warnings 0

      - name: Unit & Integration Tests
        run: npm run test:coverage
        env:
          NEXT_PUBLIC_SANITY_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_SANITY_PROJECT_ID }}
          NEXT_PUBLIC_SANITY_DATASET: production
          NEXT_PUBLIC_WHATSAPP_NUMBER: ${{ secrets.NEXT_PUBLIC_WHATSAPP_NUMBER }}
          NEXT_PUBLIC_SITE_URL: https://www.modishstandard.com

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
        continue-on-error: true

  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    needs: quality-gate
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./

  e2e:
    name: E2E Tests (Post-Deploy)
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests against production
        run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: https://www.modishstandard.com

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  notify:
    name: Notify on Failure
    runs-on: ubuntu-latest
    needs: [quality-gate, deploy, e2e]
    if: failure()
    steps:
      - name: Send WhatsApp notification (via Callmebot or similar)
        run: |
          echo "Build failed! Check GitHub Actions: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
        # TODO: Integrate with WhatsApp Business API for build failure alerts
```

---

## GitHub Actions: preview.yml

```yaml
# .github/workflows/preview.yml
name: Preview Deployment

on:
  pull_request:
    branches: [main]

jobs:
  preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: ESLint
        run: npx eslint src/ --max-warnings 0

      - name: Tests
        run: npm run test
        env:
          NEXT_PUBLIC_SANITY_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_SANITY_PROJECT_ID }}
          NEXT_PUBLIC_SANITY_DATASET: production
          NEXT_PUBLIC_WHATSAPP_NUMBER: ${{ secrets.NEXT_PUBLIC_WHATSAPP_NUMBER }}
          NEXT_PUBLIC_SITE_URL: https://www.modishstandard.com

      - name: Deploy Preview to Vercel
        uses: amondnet/vercel-action@v25
        id: vercel-deploy
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./

      - name: Comment preview URL on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `✅ Preview deployed: ${{ steps.vercel-deploy.outputs.preview-url }}\n\n🔍 Run \`/audit\` in Claude Code to check Lighthouse scores.`
            })
```

---

## vercel.json

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "regions": ["lhr1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-DNS-Prefetch-Control", "value": "on" },
        { "key": "Referrer-Policy", "value": "origin-when-cross-origin" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, max-age=0" }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/www.modishstandard.com/(.*)",
      "destination": "https://www.modishstandard.com/$1",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/sitemap.xml",
      "destination": "/api/sitemap"
    }
  ]
}
```

---

## .env.example

```bash
# .env.example — copy to .env.local and fill in values

# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your_sanity_api_token_here   # Server-side only (no NEXT_PUBLIC prefix)

# WhatsApp
NEXT_PUBLIC_WHATSAPP_NUMBER=2348XXXXXXXXX     # Nigerian format: 234 + phone without leading 0

# Site
NEXT_PUBLIC_SITE_URL=https://www.modishstandard.com

# Analytics (add after launch)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Vercel (for CI/CD — set as GitHub Secrets, not .env)
# VERCEL_TOKEN=
# VERCEL_ORG_ID=
# VERCEL_PROJECT_ID=
```

---

## bootstrap.sh

```bash
#!/usr/bin/env bash
# scripts/bootstrap.sh
# One-command setup for Modish Standard local development
set -euo pipefail

echo "🚀 Modish Standard — Project Bootstrap"
echo "========================================"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required (v20+)"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git is required"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  exit 1
fi

echo "✅ Prerequisites OK (Node $(node -v))"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Setup environment variables
if [ ! -f .env.local ]; then
  echo ""
  echo "⚙️  Setting up environment variables..."
  cp .env.example .env.local
  echo "📝 .env.local created. Please fill in your values:"
  echo "   - NEXT_PUBLIC_SANITY_PROJECT_ID (from sanity.io/manage)"
  echo "   - SANITY_API_TOKEN (from sanity.io/manage > API > Tokens)"
  echo "   - NEXT_PUBLIC_WHATSAPP_NUMBER (e.g. 2348012345678)"
  echo ""
  read -p "Press ENTER after updating .env.local to continue..." -r
else
  echo "✅ .env.local already exists"
fi

# Setup Sanity
echo ""
echo "🎨 Setting up Sanity CMS..."
if command -v sanity >/dev/null 2>&1; then
  echo "✅ Sanity CLI found"
else
  echo "📦 Installing Sanity CLI globally..."
  npm install -g @sanity/cli
fi

# Seed CMS with sample data
echo ""
read -p "Seed CMS with sample products? (y/n): " -r SEED_CMS
if [[ "$SEED_CMS" =~ ^[Yy]$ ]]; then
  echo "🌱 Seeding Sanity CMS with sample data..."
  npx ts-node scripts/seed-cms.ts
  echo "✅ CMS seeded with 35 sample products (5 per category)"
fi

# Install Playwright for E2E tests
echo ""
read -p "Install Playwright E2E test browsers? (y/n): " -r INSTALL_PW
if [[ "$INSTALL_PW" =~ ^[Yy]$ ]]; then
  npx playwright install --with-deps chromium
  echo "✅ Playwright installed"
fi

# Start dev server
echo ""
echo "🎉 Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. npm run dev          — start development server"
echo "  2. npm run test         — run unit tests"
echo "  3. npm run test:e2e     — run E2E tests"
echo "  4. Open http://localhost:3000"
echo "  5. Open http://localhost:3000/studio for Sanity CMS"
echo ""
echo "Deployment:"
echo "  1. Push to GitHub (git push origin main)"
echo "  2. GitHub Actions will automatically deploy to Vercel"
echo ""
```

---

## Required GitHub Secrets

Set these in GitHub → Settings → Secrets → Actions:

| Secret | Where to Get It |
|--------|----------------|
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | vercel.com → Settings → General (Team ID) |
| `VERCEL_PROJECT_ID` | Vercel project → Settings → General |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | sanity.io/manage |
| `SANITY_API_TOKEN` | sanity.io/manage → API → Tokens (Editor role) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Your number in 234XXXXXXXXXX format |

---

## DEPLOYMENT.md Content

Generate a complete `DEPLOYMENT.md` with:

### Section 1: Prerequisites
- Node.js 20+
- GitHub account
- Vercel account (free)
- Sanity account (free)

### Section 2: Local Setup
- Clone repo
- Run `./scripts/bootstrap.sh`
- Fill in `.env.local`

### Section 3: Sanity CMS Setup
- Create project at sanity.io
- Get Project ID and API token
- Configure CORS origins:
  ```
  http://localhost:3000
  https://www.modishstandard.com
  https://modishstandard.com
  ```

### Section 4: Vercel Setup
- Import GitHub repo into Vercel
- Add all environment variables
- Configure custom domain: `www.modishstandard.com`

### Section 5: DNS Configuration
```
Type  Name  Value                     TTL
A     @     76.76.21.21               Auto
CNAME www   cname.vercel-dns.com      Auto
```

### Section 6: First Deploy
```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
# GitHub Actions triggers automatically
```

### Section 7: Admin — Adding Products
1. Go to `www.modishstandard.com/studio`
2. Log in with Sanity account
3. Click "Product" → "Create New"
4. Fill in all fields
5. Click "Publish"
6. Website updates within 60 minutes (ISR) or immediately with on-demand revalidation

### Section 8: Monitoring
- Vercel Dashboard: analytics, function logs, build history
- Google Analytics: traffic and conversions
- GitHub Actions: build/deploy status
