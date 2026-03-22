# Modish Standard — Claude Code Orchestration Guide

## Project Overview
E-commerce catalog website for Modish Standard (Lagos, Nigeria) selling MDF/HDF boards,
UV gloss panels, marine boards, edge tapes, doors, and PU stone panels.

**Stack**: Next.js 14 (App Router) · Sanity CMS · Vercel · GitHub Actions · TypeScript · Tailwind CSS

---

## 🤖 Agent Architecture

This project uses 5 specialised agents executed in sequence via `/pipeline`.

| Agent              | Role                                         | Trigger           |
|--------------------|----------------------------------------------|-------------------|
| `pm`               | Breaks PRD into tasks, writes TaskMaster JSON | `/pm`             |
| `coder`            | Scaffolds + implements all features           | `/coder`          |
| `reviewer`         | Audits code quality, security, performance    | `/reviewer`       |
| `tester`           | Writes + runs tests, validates coverage       | `/tester`         |
| `deployment`       | CI/CD setup, Vercel deploy, DNS config        | `/deployment`     |
| **`pipeline`**     | Runs all 5 agents end-to-end automatically    | `/pipeline`       |

---

## 🚀 Slash Commands

### `/pipeline`
**Run the full automated build pipeline end-to-end.**

```
You are the Modish Standard pipeline orchestrator.
Execute each agent below IN ORDER. Do not skip any step. 
After each agent completes, output a ✅ status summary before proceeding.

EXECUTION ORDER:
1. Run /pm         → generates .taskmaster/tasks.json
2. Run /coder      → implements all code from tasks
3. Run /reviewer   → audits and fixes all issues  
4. Run /tester     → writes and runs all tests
5. Run /deployment → sets up CI/CD and deploys

Read agent definitions from ./agents/ directory before starting each phase.
After all phases complete, output a DEPLOYMENT REPORT with:
- Live URL
- Sanity Studio URL  
- GitHub repo URL
- Lighthouse score targets
- Admin credentials setup instructions
```

---

### `/pm`
**Project Manager Agent — Task decomposition and planning.**

```
You are a senior product manager. Read @agents/pm-agent.md for your full instructions.

Your job:
1. Read the PRD in @docs/PRD.md
2. Break it into atomic development tasks
3. Write output to .taskmaster/tasks.json
4. Create a TASKS.md kanban board
5. Identify blockers and dependencies

Output: .taskmaster/tasks.json + TASKS.md
```

---

### `/coder`
**Coder Agent — Full-stack implementation.**

```
You are a senior Next.js / TypeScript / Tailwind engineer.
Read @agents/coder-agent.md for your full instructions.
Read @.taskmaster/tasks.json to know what to build.

Build ALL features listed in the tasks.
Follow the coding standards in @.claude/standards.md
Do not leave TODO comments — implement everything.

Output: Complete working Next.js application
```

---

### `/reviewer`
**Code Reviewer Agent — Quality, security, performance audit.**

```
You are a senior code reviewer and security engineer.
Read @agents/reviewer-agent.md for your full instructions.

Review ALL files in the /src directory.
Fix all issues in-place (do not just report — fix them).
Output a REVIEW_REPORT.md with what was changed.

Output: Fixed code + REVIEW_REPORT.md
```

---

### `/tester`
**Tester Agent — Test suite implementation and execution.**

```
You are a QA engineer and test automation specialist.
Read @agents/tester-agent.md for your full instructions.

Write and run tests for all components, pages, and API routes.
Achieve minimum 80% code coverage.
Output TEST_REPORT.md with results.

Output: /tests directory + TEST_REPORT.md
```

---

### `/deployment`
**Deployment Agent — CI/CD and production setup.**

```
You are a DevOps engineer specialising in Vercel + GitHub Actions.
Read @agents/deployment-agent.md for your full instructions.

Set up:
1. GitHub Actions workflow (.github/workflows/deploy.yml)
2. Vercel project configuration (vercel.json)  
3. Environment variables template (.env.example)
4. Sanity project bootstrap script
5. DNS configuration instructions

Output: All deployment config files + DEPLOYMENT.md guide
```

---

### `/cms`
**Seed the Sanity CMS with product data.**

```
You are a Sanity CMS specialist.
Read @agents/coder-agent.md (Sanity section) for schema definitions.

Tasks:
1. Define all Sanity schemas (product, category, showroom)
2. Create seed script with 5 sample products per category  
3. Write sanity.config.ts
4. Configure CORS for production domain

Output: /sanity directory + seed script
```

---

### `/audit`
**Run a full performance and SEO audit.**

```
You are a performance and SEO engineer.

Audit the built application for:
- Lighthouse scores (target: 90+ all categories)
- Core Web Vitals (LCP < 2.5s, CLS < 0.1, FID < 100ms)
- SEO meta tags on all pages
- Structured data (JSON-LD)
- Image optimization (WebP, lazy loading)
- Mobile responsiveness

Fix all issues found. Output AUDIT_REPORT.md.
```

---

## 📁 Project Structure

```
modish-standard/
├── CLAUDE.md                    ← This file (orchestration hub)
├── .claude/
│   └── standards.md             ← Coding standards
├── .taskmaster/
│   └── tasks.json               ← Generated by /pm agent
├── .github/
│   └── workflows/
│       └── deploy.yml           ← CI/CD pipeline
├── agents/
│   ├── pm-agent.md
│   ├── coder-agent.md
│   ├── reviewer-agent.md
│   ├── tester-agent.md
│   └── deployment-agent.md
├── docs/
│   └── PRD.md                   ← Full product requirements
├── scripts/
│   ├── bootstrap.sh             ← One-command project setup
│   ├── seed-cms.ts              ← Sanity seed data
│   └── run-pipeline.sh          ← Local pipeline runner
├── src/
│   ├── app/                     ← Next.js App Router pages
│   │   ├── page.tsx             ← Homepage
│   │   ├── products/
│   │   │   ├── page.tsx         ← Product catalog
│   │   │   └── [slug]/
│   │   │       └── page.tsx     ← Product detail
│   │   ├── categories/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── showroom/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── products/
│   │       │   └── route.ts
│   │       └── contact/
│   │           └── route.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── WhatsAppFloat.tsx
│   │   ├── products/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductFilter.tsx
│   │   │   └── ProductGallery.tsx
│   │   ├── home/
│   │   │   ├── HeroBanner.tsx
│   │   │   ├── FeaturedProducts.tsx
│   │   │   ├── CategoryHighlights.tsx
│   │   │   └── TrustIndicators.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       └── SearchBar.tsx
│   ├── lib/
│   │   ├── sanity/
│   │   │   ├── client.ts
│   │   │   ├── queries.ts
│   │   │   └── image.ts
│   │   ├── whatsapp.ts
│   │   └── analytics.ts
│   └── types/
│       └── index.ts
├── sanity/
│   ├── sanity.config.ts
│   ├── schemaTypes/
│   │   ├── product.ts
│   │   ├── category.ts
│   │   └── showroom.ts
│   └── lib/
│       └── queries.ts
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 🔑 Environment Variables

```bash
# .env.local (never commit)
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=
NEXT_PUBLIC_WHATSAPP_NUMBER=2348XXXXXXXXX
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SITE_URL=https://www.modishstandard.com
```

---

## 📋 Key Business Rules

1. **WhatsApp is primary CTA** — every product page must have a WhatsApp order button
2. **Mobile-first** — 90% of Nigerian buyers use phones (target 4G performance)
3. **No checkout** — this is a catalog + inquiry site (v1)
4. **Pricing** — show prices where set, otherwise show "Request Price"
5. **Categories**: MDF Boards, HDF Boards, UV Gloss Boards, Marine Boards, Edge Tapes, Doors, PU Stone Panels
6. **SEO keywords**: include Lagos/Nigeria geo-targeting on all product pages
