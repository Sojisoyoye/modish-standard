# n8n Integration — Modish Standard

The n8n instance at **https://n8n.modishstandard.com** runs the automated content generation pipeline. It sits on the same Hetzner VPS as the Telegram bot, on the internal `modish` Docker network.

---

## Full data flow

```
POS (inventory app)
  │
  │  every 2 hours, or triggered by /stocksync in Telegram
  ▼
Workflow J — "POS Stock Sync"
  │  fetches stock via http://product-bot:3001/api/products
  │  fetches product images from Sanity CMS
  │  upserts Airtable "Product Catalog" base
  │
  ├─ New product    → Ready for Promo = true, Date Added = now
  │                   → triggers Workflow A (promo content generation)
  │
  ├─ Restocked      → Stock Status = In Stock, Date Added = now
  │                   → triggers Workflow E (back-in-stock content)
  │
  └─ Out of stock   → Stock Status = Out of Stock (no content trigger)
        │
        ▼
Workflow A (runs every 30 min)
  Products where Ready for Promo = true → generates promotional content
        │
Workflow E (runs every 1 hr)
  Products restocked within last 2 hrs → generates restock content
        │
        ▼
Content Calendar
  → Workflow B publishes to Instagram / Facebook / WhatsApp
```

---

## Workflow J — current status

| Field | Value |
|---|---|
| Name | J — POS Stock Sync |
| n8n workflow ID | `Li25nKx9yh881Clj` |
| **Status** | **ACTIVE** |
| Schedule trigger | Every day at 8:00 AM Lagos time (cron: `0 7 * * *` UTC) |
| Webhook trigger | `POST https://n8n.modishstandard.com/webhook/pos-stock-sync` |
| Telegram command | `/syncstock` in the product-bot |

---

## HTTP API (product-bot → n8n)

Workflow J pulls live stock data from the Telegram bot's internal HTTP server.

| Property | Value |
|---|---|
| Endpoint | `http://product-bot:3001/api/products` |
| Method | `GET` |
| Auth | `Authorization: Bearer modish-pos-api-2024` |
| Network | Internal Docker `modish` bridge — not publicly reachable |

Response shape (array of objects):
```json
[
  {
    "sku": "MS-001",
    "name": "Wenge BB Board",
    "category": "Block Boards",
    "stockQty": 36,
    "sellingPrice": 26000,
    "isInStock": true
  }
]
```

The `POS_API_KEY` env var in n8n must match `modish-pos-api-2024`. It is set in `/opt/modish/.env.bot` and passed to the product-bot container.

---

## Airtable base

| Field | Value |
|---|---|
| Base ID | `appFae9SCFcGV98BO` |
| Table | Product Catalog |

Key columns Workflow J writes:

| Column | Set when |
|---|---|
| `Stock Status` | Every sync — `In Stock` / `Out of Stock` |
| `Stock Qty` | Every sync |
| `Selling Price` | Every sync |
| `Ready for Promo` | New product → `true` |
| `Date Added` | New product or restock → current timestamp |
| `Sanity Image URL` | New product → fetched from Sanity |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Workflow J never runs | Workflow is inactive | Activate at n8n.modishstandard.com |
| `401 Unauthorized` fetching `/api/products` | Wrong API key in n8n | Set `POS_API_KEY` credential in n8n to `modish-pos-api-2024` |
| `Connection refused` on `product-bot:3001` | product-bot container is down | `cd /opt/modish && docker-compose up -d product-bot` |
| Airtable write fails | API key expired or wrong base ID | Re-authenticate Airtable in n8n credentials |
| Content not generating after sync | Workflow A/E not active, or field mismatch | Check Workflow A and E are active; verify `Ready for Promo` and `Date Added` column names match |

---

## Manually triggering a sync

### From the Telegram product-bot (`/syncstock`)

The product-bot has a `/syncstock` command that POSTs to Workflow J's webhook and triggers the sync immediately.

Send `/syncstock` in Telegram to trigger a sync on demand. The webhook URL is already configured in `.env.bot`.

### From n8n UI

Open Workflow J → click "Execute workflow"

### From the server (test the POS API directly)

```bash
ssh -i ~/.ssh/hetzner_modish root@178.104.122.53 \
  "curl -s -H 'Authorization: Bearer modish-pos-api-2024' http://product-bot:3001/api/products | python3 -m json.tool | head -30"
```
