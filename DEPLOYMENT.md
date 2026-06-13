# Deployment Guide — Modish Standard

## Prerequisites

- Node.js 20+
- GitHub account
- Vercel account (free tier)
- Sanity account (free tier)

## 1. Local Setup

```bash
git clone https://github.com/Sojisoyoye/modish-standard.git
cd modish-standard
./scripts/bootstrap.sh
```

Fill in `.env.local` with your actual values (see `.env.example`).

## 2. Sanity CMS Setup

1. Create a project at [sanity.io/manage](https://sanity.io/manage)
2. Note your **Project ID**
3. Create an API token with **Editor** role
4. Configure CORS origins:
   - `http://localhost:3000`
   - `https://www.modishstandard.com`
   - `https://modishstandard.com`

### Seed sample data

```bash
SANITY_API_TOKEN=your_token npx ts-node scripts/seed-cms.ts
```

## 3. Vercel Setup

1. Import the GitHub repo into [Vercel](https://vercel.com/new)
2. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SANITY_PROJECT_ID`
   - `NEXT_PUBLIC_SANITY_DATASET` = `production`
   - `SANITY_API_TOKEN`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`
   - `NEXT_PUBLIC_SITE_URL` = `https://www.modishstandard.com`
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` = `dkporys8h`
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID` (after GA setup)
3. Deploy

## 4. DNS Configuration

Add these DNS records at your domain registrar:

| Type  | Name | Value                | TTL  |
|-------|------|----------------------|------|
| A     | @    | 76.76.21.21          | Auto |
| CNAME | www  | cname.vercel-dns.com | Auto |

## 5. First Deploy

```bash
git add .
git commit -m "feat: initial deployment"
git push origin main
```

GitHub Actions will run quality checks and deploy to Vercel automatically.

## 6. Adding Products

### Via the Telegram bot (recommended)

The bot syncs products from POS to Sanity automatically:

```
/sync              — push all products from POS to Sanity
/image <slug>      — send a photo to upload it to Cloudinary and attach to the product
/matchimages       — auto-match existing Cloudinary images to products by slug
```

See [DEPLOY-BOT.md](./DEPLOY-BOT.md) for full bot setup.

### Via Sanity Studio

1. Go to `/studio` on any running instance (local or production)
2. Click "Product" → "Create New"
3. Fill in all fields — for images, paste a Cloudinary Public ID (e.g. `modish/products/wenge-bb-board`)
4. Click "Publish"
5. Website updates within 5 minutes (ISR revalidation) or immediately on next deploy

## 7. GitHub Secrets

Go to **GitHub → Settings → Secrets and variables → Actions → New repository secret** and add each of the following:

| Secret | Where to get it |
|--------|----------------|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | vercel.com → Settings → General → "Your ID" (personal) or Team ID |
| `VERCEL_PROJECT_ID` | Vercel project → Settings → General → Project ID |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | sanity.io/manage → your project → Project ID field |
| `SANITY_API_TOKEN` | sanity.io/manage → API → Tokens → Add API token (Editor role) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Your number in international format: `234XXXXXXXXXX` |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | cloudinary.com → Dashboard (top of page) |

### Getting VERCEL_ORG_ID and VERCEL_PROJECT_ID via CLI

```bash
npm i -g vercel
vercel login
vercel link        # links this project, creates .vercel/project.json
cat .vercel/project.json
# { "orgId": "...", "projectId": "..." }
```

Use `orgId` → `VERCEL_ORG_ID` and `projectId` → `VERCEL_PROJECT_ID`.

## 8. Monitoring

- **Vercel Dashboard**: analytics, function logs, build history
- **Google Analytics**: traffic and conversions
- **GitHub Actions**: build/deploy status
- **Sanity**: content management at sanity.io/manage
