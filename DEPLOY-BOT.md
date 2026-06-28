# Deploying the Modish Standard Telegram Bot to Hetzner

The bot lives in `scripts/telegram-bot.ts` and is a long-running Node.js process managed by Docker. It talks to your POS system and Sanity CMS. Deploy it once; it stays up via Docker restart policies.

---

## Prerequisites

- [ ] Created a new Telegram bot via [@BotFather](https://t.me/BotFather) — you need the bot token (looks like `123456789:ABCdef...`)
- [ ] Got your Telegram numeric user ID from [@userinfobot](https://t.me/userinfobot)
- [ ] SSH access to the Hetzner server (`ssh root@178.104.122.53`)
- [ ] The repo is already checked out on the server (or you can `git pull` it there)

---

## Step 1: Create the bot env file on the server

SSH in and create `/opt/modish/.env.bot` with the required variables.

```bash
ssh root@178.104.122.53
```

Then on the server:

```bash
cat > /opt/modish/.env.bot << 'EOF'
# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdef-your-token-here
TELEGRAM_AUTHORIZED_USER_IDS=987654321

# POS (Inventory app)
INVENTORY_APP_URL=https://your-pos-url.com
INVENTORY_APP_USERNAME=your-pos-username
INVENTORY_APP_PASSWORD=your-pos-password

# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your-sanity-write-token

# WhatsApp (used in product inquiry links)
NEXT_PUBLIC_WHATSAPP_NUMBER=2348012345678

# Cloudinary (used by /image, /setimage, /matchimages)
CLOUDINARY_CLOUD_NAME=dkporys8h
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# n8n integration
N8N_STOCKSYNC_WEBHOOK_URL=https://n8n.modishstandard.com/webhook/pos-stock-sync
POS_API_KEY=modish-pos-api-2024
EOF
```

Lock down the file so only root can read it:

```bash
chmod 600 /opt/modish/.env.bot
```

To authorize multiple Telegram users, comma-separate their IDs:

```
TELEGRAM_AUTHORIZED_USER_IDS=987654321,111222333
```

---

## Step 2A: Add to existing docker-compose stack (Recommended)

This option runs the bot alongside n8n and Caddy on the shared `modish` Docker network. It is the recommended approach — it reuses the existing network, restart policies, and deployment workflow.

### 1. SSH to server and go to the stack directory

```bash
ssh root@178.104.122.53
cd /opt/modish
```

### 2. Pull the latest code from GitHub

If the modish-standard repo is already cloned on the server:

```bash
cd /root/modish-standard   # or wherever it is cloned
git pull origin main
```

If it is not cloned yet:

```bash
git clone https://github.com/YOUR_ORG/modish-standard.git /root/modish-standard
```

### 3. Create Dockerfile.bot

The main `Dockerfile` builds the Next.js app. The bot needs its own lighter image. Create it:

```bash
cat > /root/modish-standard/Dockerfile.bot << 'EOF'
FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install --no-save tsx

# Copy only what the bot needs
COPY scripts/ ./scripts/
COPY tsconfig.json ./

CMD ["node_modules/.bin/tsx", "scripts/telegram-bot.ts"]
EOF
```

### 4. Add the product-bot service to docker-compose.yml

Open `/opt/modish/docker-compose.yml` and append this service block inside the `services:` section (before the closing of the file). Keep the same indentation as the other services.

```yaml
  product-bot:
    build:
      context: /root/modish-standard
      dockerfile: Dockerfile.bot
    container_name: product-bot
    restart: unless-stopped
    env_file:
      - /opt/modish/.env.bot
    networks:
      - modish
```

Make sure the `modish` network is declared at the bottom of the file (it should already be there):

```yaml
networks:
  modish:
    external: true
```

### 5. Build and start the bot

```bash
cd /opt/modish
docker compose build product-bot
docker compose up -d product-bot
```

### 6. Verify it started

```bash
docker compose logs -f product-bot
```

You should see:

```
product-bot  | 🤖 Modish Standard Bot is running…
```

Press `Ctrl+C` to stop tailing logs. The container keeps running in the background.

Open Telegram, find your bot, and send `/start`. It should reply immediately.

---

## Step 2B: Standalone (simpler, does not touch the existing n8n stack)

Use this if you want to keep the bot completely separate from `/opt/modish/`.

### 1. Clone the repo and create the env file

```bash
ssh root@178.104.122.53

git clone https://github.com/YOUR_ORG/modish-standard.git /root/modish-standard
cd /root/modish-standard

cp /opt/modish/.env.bot .env.bot   # reuse the env file you created in Step 1
```

### 2. Create Dockerfile.bot (same as above)

```bash
cat > /root/modish-standard/Dockerfile.bot << 'EOF'
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install tsx

COPY scripts/ ./scripts/
COPY tsconfig.json ./

CMD ["npx", "tsx", "scripts/telegram-bot.ts"]
EOF
```

### 3. Create a standalone docker-compose file

```bash
cat > /root/modish-standard/docker-compose.bot.yml << 'EOF'
version: '3.8'

services:
  product-bot:
    build:
      context: .
      dockerfile: Dockerfile.bot
    container_name: product-bot
    restart: unless-stopped
    env_file:
      - .env.bot

networks: {}
EOF
```

### 4. Build and run

```bash
cd /root/modish-standard
docker compose -f docker-compose.bot.yml build
docker compose -f docker-compose.bot.yml up -d
docker compose -f docker-compose.bot.yml logs -f product-bot
```

---

## Updating the bot after code changes

The bot scripts live in `/opt/modish/scripts/` on the server. The fastest way to deploy is to SCP the changed files directly, then rebuild:

```bash
# From your local modish-standard repo root:

# 1. Copy changed scripts
scp -i ~/.ssh/hetzner_modish \
  scripts/telegram-bot.ts \
  scripts/pos-client.ts \
  scripts/parse-product-doc.ts \
  root@178.104.122.53:/opt/modish/scripts/

# 2. If you added/updated npm dependencies, copy package files too
scp -i ~/.ssh/hetzner_modish \
  package.json package-lock.json \
  root@178.104.122.53:/opt/modish/

# 3. Rebuild and restart (use docker-compose, not docker compose, on this server)
ssh -i ~/.ssh/hetzner_modish root@178.104.122.53 \
  "cd /opt/modish && docker-compose build product-bot && docker-compose up -d product-bot"

# 4. Verify
ssh -i ~/.ssh/hetzner_modish root@178.104.122.53 \
  "docker logs product-bot --tail 15"
```

> **Note:** This server uses `docker-compose` (hyphenated v2), not `docker compose`.

The `up -d` command recreates the container only if the image changed, so it is safe to run every time.

---

## Troubleshooting

### Bot does not respond to messages

Check the logs first:

```bash
# Option A
docker compose -f /opt/modish/docker-compose.yml logs --tail=50 product-bot

# Option B
docker compose -f /root/modish-standard/docker-compose.bot.yml logs --tail=50 product-bot
```

Common causes:

| Symptom | Likely cause | Fix |
|---|---|---|
| `TELEGRAM_BOT_TOKEN is not set` | Env file not loaded or path wrong | Check `env_file:` path in compose file |
| `Unauthorized` reply in Telegram | Your user ID is not in `TELEGRAM_AUTHORIZED_USER_IDS` | Add your numeric ID to `.env.bot` and restart |
| Container exits immediately | Script crash on startup | Check logs for stack trace — usually a missing env var |
| `401 Unauthorized` from Telegram API | Bot token is wrong or revoked | Get a fresh token from @BotFather |
| POS login failed | Wrong credentials or POS URL | Verify `INVENTORY_APP_*` vars in `.env.bot` |
| `/purchase` → "Something went wrong, please try again later" | UltimatePOS V5.40 requires `payment[0][amount/paid_on/method]` in the POST body even for `status='ordered'`. Missing payment fields cause the controller's catch block to fire silently. Ensure you are running the latest `pos-client.ts`. |
| `Insufficient permissions; permission 'create' required` | Sanity token has Write role but not Editor | Generate a new token with the **Editor** role at sanity.io → project → API → Tokens, update `SANITY_API_TOKEN` in `/opt/modish/.env.bot`, restart bot |
| Other Sanity errors | Wrong project ID, dataset, or token | Verify `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, and `SANITY_API_TOKEN` in `.env.bot` |
| `/image` — `Cloudinary upload failed` | Wrong API key or secret | Check `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env.bot` against cloudinary.com → Settings → API Keys |
| `/matchimages` — `Cloudinary API error` | Admin API disabled or wrong credentials | Same as above; ensure the API key has Admin API access enabled |

### Container keeps restarting

```bash
docker inspect product-bot --format='{{.RestartCount}}'
docker logs product-bot --tail=20
```

A restart count above 3 with immediate exits means the process is crashing on startup. Fix the underlying error in the logs before it will stay up.

### Check the container is actually running

```bash
docker ps | grep product-bot
```

If it is not listed, it either never started or has been stopped:

```bash
docker ps -a | grep product-bot   # shows stopped containers too
```

### Rebuild from scratch (clears image cache)

```bash
docker compose build --no-cache product-bot
docker compose up -d product-bot
```

### Test env vars are loading correctly

```bash
docker exec product-bot env | grep TELEGRAM
```

### Updating env vars

Edit `/opt/modish/.env.bot`, then restart the container to pick up the new values:

```bash
docker compose up -d product-bot   # recreates the container with fresh env
```

---

## Bot commands reference

### Add to POS (tracked inventory)

| Command | What it does |
|---|---|
| `/add` | Add products to POS — describe in plain text, or upload a CSV/Excel/PDF file. Bot checks POS, shows missing products, asks **which location** (BL0001 928 or BL0002 952), optionally asks **which Sanity category** (when names are ambiguous), creates missing products, then offers to sync to the website. |
| `/sync` | Sync **all** POS products → Sanity website. New products are created; existing ones get price + stock updated. |
| `/sync <category>` | Sync one category only (faster, less noisy). |
| `/syncstock` | Trigger n8n Workflow J: pulls POS stock → updates Airtable Product Catalog → kicks off content generation workflows. |
| `/find <name>` | Search POS by name (partial match). Returns SKU, price, stock, and a direct edit link. |
| `/list` | List up to 30 active products from POS. |
| `/list <category>` | List products filtered to one category. |

### PDF invoice flow (auto-triggered when a supplier PDF is sent)

Send a supplier proforma invoice PDF to the bot at any time (no command needed). The bot:

1. Detects numbered invoice rows (tab-separated: row number · product name · quantities · US$ prices)
2. Checks all products against POS globally (searches across all locations)
3. Shows existing (skipped) vs new products with proposed POS names
4. Asks **which location** to create new products at (BL0001 928 · BL0002 952)
5. Asks exchange rate (NGN/USD)
6. Shows price breakdown: cost = USD × rate, selling = ₦14,000 non-glossy / ₦15,000 glossy
7. User confirms → creates in POS at chosen location → offers Sanity sync

Edge tape invoices are identified automatically by the `0.9×48MM` dimension marker. Product names follow the convention `{Color} 48MM` (non-glossy) or `{Color} 48MM Gloss`.

### Purchase orders

| Command | What it does |
|---|---|
| `/purchase` | Create a POS purchase order from a supplier invoice PDF. Full multi-step flow — see details below. |

**`/purchase` flow — all products already in POS:**
1. Send the invoice PDF
2. Select **location** (BL0001 928 · BL0002 952) — location is chosen before the POS lookup so near-match variation IDs are resolved correctly
3. Bot looks up all products at that location → confirms all found
4. If any product name is ambiguous (near-match), bot asks you to confirm the correct POS entry one at a time
5. Select supplier (Mr Adward Shouguang · Miss Susan Sunstar · Mr Soji Soyoye)
6. Enter exchange rate (NGN/USD)
7. Select status (Ordered / Received / Pending)
8. Enter shipping charges (₦, or 0 to skip)
9. Confirm summary → purchase order created in POS

**`/purchase` flow — some products missing from POS:**
1. Send the invoice PDF
2. Select **location** (BL0001 928 · BL0002 952)
3. Bot shows found vs missing products, offers "Create N & continue"
4. Enter exchange rate → missing products created at chosen location
5. Continue to supplier → status → shipping → confirm
6. Purchase order created at the same location the products were created at

> **Tip:** Use `/purchase` (not the raw PDF drop) when you want to record a purchase order with supplier, cost prices, and shipping. Use the raw PDF drop when you just want to add new products to POS.

### Add to Sanity directly (no POS)

Use these for products you want on the website catalog but don't track in inventory.

| Command | What it does |
|---|---|
| `/addcategory <name>` | Create a new product category in Sanity. Bot derives the slug automatically and asks for a short description. The category is immediately available in Sanity Studio and the website. |
| `/addsanity <name>` | Add a product directly to the Sanity website catalog. Guided flow: pick category from list → enter price (or skip for "Request Price") → enter description (or skip to auto-generate). Also creates an Airtable row with `Ready for Promo = false`. |

### Images

Products created via `/addsanity` or `/add`+`/sync` start with no image. Use these to add them.

| Command | What it does |
|---|---|
| `/slug <name>` | Look up a product's slug by partial name. Example: `/slug marble` returns all matching product names and their slugs. Use this before `/image` if you're not sure of the exact slug. |
| `/image <slug>` | Two-step upload: bot looks up the product, asks you to send a photo (from phone camera, gallery, or desktop — any source works). Uploads to Cloudinary as `modish/products/{slug}`, patches Sanity, and updates Airtable `Image URL`. |
| `/setimage <slug> <public-id>` | Directly link an existing Cloudinary image to a product by its public ID. Example: `/setimage wenge-bb-board modish/products/wenge-bb`. Also updates Airtable `Image URL`. |
| `/matchimages` | Auto-match: fetches all assets under `modish/products/` in Cloudinary, matches by slug, patches Sanity and Airtable for each match, and reports any products still without images. |

### Content & promo

Control when Airtable picks up products for n8n content generation. Products start with `Ready for Promo = false` — nothing fires until you trigger it here.

| Command | What it does |
|---|---|
| `/promote <slug>` | Mark one product ready for content generation. Sets `Ready for Promo = true` + `Content Type = New Product` in Airtable. Workflow A picks it up within 30 minutes and generates 4 platform posts (Instagram, Facebook, WhatsApp Status, WhatsApp Broadcast). |
| `/promotecategory <category-slug>` | Mark all products in a category ready for content. Defaults to `Promo` content type. |
| `/promotecategory <category-slug> <type>` | Same, with explicit content type. Valid types: `New Product` · `Promo` · `Restock Alert`. |
| `/campaign <tag> <category-slug>` | Multi-product campaign via Workflow H. Sets `Campaign Tag` on all products in the category, resets `Campaign Generated`, then triggers Workflow H via webhook. Workflow H groups all products under the tag into a single campaign post. You receive a Telegram notification when drafts are ready. Example: `/campaign Marble Sheets Launch marble-sheets`. |

**How the two content paths differ:**

| Path | Command | Workflow | Output |
|---|---|---|---|
| Single-product promo | `/promote` or `/promotecategory` | Workflow A | One set of 4 posts per product |
| Multi-product campaign | `/campaign` | Workflow H | One grouped campaign post for all products |

### Other

| Command | What it does |
|---|---|
| `/status` | Check POS login + Sanity connection, shows product counts. |
| `/start` | Show welcome message + full command list. |
| `/cancel` | Cancel the current multi-step flow (add, image, addsanity, etc.). |

**Valid category slugs** (used with `/sync`, `/list`, `/promotecategory`, `/campaign`):

| Slug | Products |
|---|---|
| `mdf-boards` | Plain MDF boards |
| `hdf-boards` | HDF boards |
| `uv-gloss-boards` | MDF/HDF UV gloss boards |
| `marine-boards` | Marine boards |
| `block-boards` | BB (block boards) |
| `edge-tapes` | Edge banding tapes |
| `doors` | Doors |
| `pu-stone-panels` | PU stone panels |
| `marble-sheets` | Marble sheets |
| `accessories` | Everything else |

Custom categories created via `/addcategory` are available immediately for `/addsanity`, `/promote`, `/promotecategory`, and `/campaign`. They are **not** auto-detected by `/sync` (which maps POS products by name patterns) — POS products must be assigned to custom categories manually in Sanity Studio.

**CSV/Excel format for bulk `/add`:**

| Column | Required | Notes |
|---|---|---|
| Name | Yes | Full product name, e.g. `Wenge BB Board` |
| Category | Yes | Any of the slugs above, or a human-readable equivalent |
| Price | No | Selling price in Naira — omit for "Request Price" |
| Cost Price | No | Defaults to 65% of selling price if omitted |

---

## n8n integration

The bot integrates with 3 n8n workflows:

| Workflow | Trigger | What it does |
|---|---|---|
| **J — POS Stock Sync** | Daily 8 AM / `/syncstock` / webhook | Pulls POS stock → upserts Airtable Product Catalog → triggers A/E for new/restocked products |
| **A — Product Content Generation** | Every 30 min (polls Airtable) | Reads products where `Ready for Promo = true` → generates 4 platform posts per product via Claude |
| **H — Multi-Product Campaign** | `/campaign` bot command / n8n manual | Reads products where `Campaign Tag != ''` → generates one grouped campaign post for the whole tag |

**Bot → n8n HTTP API** (used by Workflow J):

- Endpoint: `http://product-bot:3001/api/products` (internal Docker network only)
- Auth: `Authorization: Bearer modish-pos-api-2024`

**Webhook URLs** (all unauthenticated POST):

| Webhook | URL |
|---|---|
| Workflow J (stock sync) | `https://n8n.modishstandard.com/webhook/pos-stock-sync` |
| Workflow A (content gen) | `https://n8n.modishstandard.com/webhook/trigger-workflow-a` |
| Workflow H (campaign) | `https://n8n.modishstandard.com/webhook/campaign` |

Full pipeline documentation: [N8N-INTEGRATION.md](./N8N-INTEGRATION.md)

---

## Quick reference

| Action | Command (Option A — main stack) |
|---|---|
| Start bot | `cd /opt/modish && docker-compose up -d product-bot` |
| Stop bot | `cd /opt/modish && docker-compose stop product-bot` |
| View logs | `cd /opt/modish && docker-compose logs -f product-bot` |
| Restart | `cd /opt/modish && docker-compose restart product-bot` |
| Rebuild after code change | `cd /opt/modish && docker-compose build product-bot && docker-compose up -d product-bot` |
| Shell into container | `docker exec -it product-bot sh` |
