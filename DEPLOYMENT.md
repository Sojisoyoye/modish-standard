# Deployment Guide — Modish Standard

## Prerequisites

- Node.js 20+
- GitHub account
- Vercel account (free tier)
- Sanity account (free tier)

## 1. Local Setup

```bash
git clone <your-repo-url>
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

## 6. Adding Products via Sanity Studio

1. Go to your Sanity Studio (configure at sanity.io/manage)
2. Click "Product" > "Create New"
3. Fill in all fields
4. Click "Publish"
5. Website updates within 60 minutes (ISR) or on next deploy

## 7. GitHub Secrets

Set these in GitHub > Settings > Secrets > Actions:

| Secret | Source |
|--------|--------|
| `VERCEL_TOKEN` | vercel.com > Settings > Tokens |
| `VERCEL_ORG_ID` | vercel.com > Settings > General |
| `VERCEL_PROJECT_ID` | Vercel project > Settings > General |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | sanity.io/manage |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Your number (234XXXXXXXXXX) |

## 8. Monitoring

- **Vercel Dashboard**: analytics, function logs, build history
- **Google Analytics**: traffic and conversions
- **GitHub Actions**: build/deploy status
- **Sanity**: content management at sanity.io/manage
