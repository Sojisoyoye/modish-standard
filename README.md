# Modish Standard

E-commerce website for **Modish Standard** — a Lagos-based supplier of MDF/HDF boards, UV gloss panels, marine boards, edge tapes, doors, and PU stone panels.

> Catalog + inquiry site (no checkout). WhatsApp is the primary CTA.

**Live site:** https://www.modishstandard.com
**GitHub:** https://github.com/Sojisoyoye/modish-standard

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| CMS | Sanity v3 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Hosting | Vercel |
| CI/CD | GitHub Actions |
| Testing | Jest + React Testing Library |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — hero, featured products, category highlights |
| `/products` | Full product catalog with filtering |
| `/products/[slug]` | Product detail with WhatsApp order button |
| `/categories/[slug]` | Products filtered by category |
| `/search` | Search results |
| `/showroom` | Showroom gallery |
| `/contact` | Contact form |
| `/favourites` | Saved products (local storage) |
| `/studio` | Sanity CMS studio |

---

## Local Development

**Prerequisites:** Node.js 20+, npm

```bash
git clone https://github.com/Sojisoyoye/modish-standard.git
cd modish-standard
npm install
cp .env.example .env.local   # fill in your values
npm run dev                  # http://localhost:3000
npm run sanity:dev           # Sanity Studio at http://localhost:3333
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=   # from sanity.io/manage
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=                # Editor role token
NEXT_PUBLIC_WHATSAPP_NUMBER=     # e.g. 2348012345678
NEXT_PUBLIC_SITE_URL=https://www.modishstandard.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=   # optional, add after launch
```

---

## Scripts

```bash
npm run dev              # development server
npm run build            # production build
npm run lint             # ESLint
npm run test             # unit tests
npm run test:coverage    # tests with coverage report
npm run test:e2e         # Playwright E2E tests
npm run seed             # seed Sanity CMS with sample data
npm run docker:dev       # run via Docker (dev)
npm run docker:prod      # run via Docker (production)
```

---

## CMS — Sanity Setup

1. Create a project at [sanity.io/manage](https://sanity.io/manage)
2. Get your **Project ID** and create an **Editor** API token
3. Add CORS origins:
   - `http://localhost:3000`
   - `https://www.modishstandard.com`
4. Seed sample data: `npm run seed`
5. Access studio at `/studio` on any running instance

**Product categories:** MDF Boards · HDF Boards · UV Gloss Boards · Marine Boards · Edge Tapes · Doors · PU Stone Panels

---

## Deployment

CI/CD runs automatically on push to `main`:

1. TypeScript check + ESLint + Tests
2. Deploy to Vercel (production)

### Required GitHub Secrets

Set in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Source |
|--------|--------|
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `vercel link` → `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | `vercel link` → `.vercel/project.json` → `projectId` |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | sanity.io/manage |
| `SANITY_API_TOKEN` | sanity.io/manage → API → Tokens (Editor role) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | `234XXXXXXXXXX` format |

