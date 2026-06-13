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

After pushing changes to GitHub:

### Option A (added to /opt/modish stack)

```bash
ssh root@178.104.122.53
cd /root/modish-standard
git pull origin main

cd /opt/modish
docker compose build product-bot
docker compose up -d product-bot
docker compose logs -f product-bot
```

### Option B (standalone)

```bash
ssh root@178.104.122.53
cd /root/modish-standard
git pull origin main

docker compose -f docker-compose.bot.yml build product-bot
docker compose -f docker-compose.bot.yml up -d product-bot
docker compose -f docker-compose.bot.yml logs -f product-bot
```

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
| `Insufficient permissions; permission 'create' required` | Sanity token has Write role but not Editor | Generate a new token with the **Editor** role at sanity.io → project → API → Tokens, update `SANITY_API_TOKEN` in `/opt/modish/.env.bot`, restart bot |
| Other Sanity errors | Wrong project ID, dataset, or token | Verify `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, and `SANITY_API_TOKEN` in `.env.bot` |

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

| Command | What it does |
|---|---|
| `/start` | Show welcome message + full command list |
| `/add` | Add products to POS — describe in plain text, or upload a CSV/Excel file. Bot checks POS, creates missing products, then offers to sync to the website. |
| `/find <name>` | Search POS by name (partial match). Returns SKU, price, stock, and a direct edit link. |
| `/sync` | Sync **all** POS products → Sanity website. New products are created; existing ones get price + stock updated. |
| `/sync <category>` | Sync one category only (faster, less noisy). |
| `/syncstock` | Trigger n8n Workflow J on demand: pulls POS stock → updates Airtable Product Catalog → kicks off content generation workflows (new products → promo content, restocked → back-in-stock content). |
| `/list` | List up to 30 active products from POS. |
| `/list <category>` | List products filtered to one category. |
| `/status` | Check POS login + Sanity connection, shows product counts. |
| `/cancel` | Cancel the current multi-step flow (add, etc.). |

**Valid category slugs** (used with `/sync` and `/list`):

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
| `accessories` | Everything else |

**CSV/Excel format for bulk `/add`:**

| Column | Required | Notes |
|---|---|---|
| Name | Yes | Full product name, e.g. `Wenge BB Board` |
| Category | Yes | Any of the slugs above, or a human-readable equivalent |
| Price | No | Selling price in Naira — omit for "Request Price" |
| Cost Price | No | Defaults to 65% of selling price if omitted |

---

## n8n integration

The bot exposes an internal HTTP API on port 3001 that n8n's Workflow J uses to pull live stock data from the POS.

- Endpoint: `http://product-bot:3001/api/products` (internal Docker network only)
- Auth: `Authorization: Bearer modish-pos-api-2024`
- Full pipeline documentation: [N8N-INTEGRATION.md](./N8N-INTEGRATION.md)

**Workflow J status: ACTIVE.** Runs every day at 8 AM Lagos time automatically. Trigger on demand with `/syncstock` in Telegram, or POST directly to `https://n8n.modishstandard.com/webhook/pos-stock-sync`.

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
