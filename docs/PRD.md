# Modish Standard — Product Requirements Document (PRD)

**Version**: 1.0  
**Status**: Approved for Development  
**Target Launch**: 4 weeks from kickoff  

---

## 1. Executive Summary

Modish Standard is a Lagos-based supplier of premium furnishing board materials targeting
Nigerian carpenters, interior designers, contractors, and commercial buyers.

This document defines requirements for the v1 website: a product catalog + enquiry site
with WhatsApp as the primary conversion channel.

**No checkout in v1.** Revenue happens via WhatsApp or showroom visit.

---

## 2. Business Goals

| Goal | Metric |
|------|--------|
| Drive product enquiries | ≥ 50 WhatsApp clicks/day |
| Establish brand online | Google rank for "MDF boards Lagos" |
| Reduce repetitive questions | Clear specs on all product pages |
| Showcase full catalog | All 7 categories live at launch |

---

## 3. User Personas

### Persona 1: Carpenter / Craftsman
- Age: 28–45, Lagos/Abuja
- Device: Android phone (4G)
- Goal: Compare board sizes, check thickness, get price quickly
- Pain: Calls multiple suppliers, wastes time

### Persona 2: Interior Designer
- Age: 25–40, Lagos
- Device: Phone + laptop
- Goal: Find premium finishes, UV gloss colours, get trade pricing
- Pain: Can't see material quality online

### Persona 3: Building Contractor
- Age: 35–55
- Device: Phone
- Goal: Bulk order quote for estate project
- Pain: Suppliers don't show specs or have professional website

---

## 4. Product Categories

All 7 categories must be live at launch with minimum 5 products each:

| Category | Description |
|----------|-------------|
| MDF Boards | Medium-density fiberboard, various thicknesses |
| HDF Boards | High-density fiberboard, premium finish |
| UV Gloss Boards | High-gloss UV-coated boards for cabinets/wardrobes |
| Marine Boards | Moisture-resistant boards for wet areas |
| Edge Tapes | Matching edge banding in various colours |
| Doors | Interior doors, flush and panel designs |
| PU Stone Panels | Lightweight polyurethane stone-effect wall panels |

---

## 5. Core Features

### 5.1 Homepage
- Hero banner with brand message and dual CTA
- Featured products (8 products)
- Category grid (7 cards)
- Trust indicators (quality, delivery, pricing, support)
- Showroom teaser
- Floating WhatsApp button (always visible)

### 5.2 Product Catalog
- Grid layout (2 columns mobile, 3–4 desktop)
- Category sidebar filter
- Additional filters: thickness, material type, finish
- Sort: newest, price low-high, price high-low
- Pagination or infinite scroll

### 5.3 Product Detail
- Image gallery with lightbox (max 8 images)
- Product specifications table
- Price display (or "Request Price" if unset)
- Stock status badge
- WhatsApp Order CTA (pre-filled message with product name)
- Related products (4 items from same category)
- Breadcrumb navigation
- Social share buttons

### 5.4 Search
- Full-text search across product names, descriptions, categories
- Search results page with filter options
- Zero-results state with suggested categories

### 5.5 Contact Page
- Contact form (Name, Phone, Message)
- Direct WhatsApp button
- Business hours
- Google Maps embed

### 5.6 Showroom Page
- Address and directions
- Embedded Google Map
- Opening hours
- Photo gallery
- Phone numbers

---

## 6. Technical Architecture

### Stack
- **Frontend**: Next.js 14, App Router, TypeScript, Tailwind CSS
- **CMS**: Sanity v3 (Studio embedded at /studio)
- **Hosting**: Vercel (free tier, Frankfurt region)
- **Repo**: GitHub
- **Domain**: www.modishstandard.com

### Performance Targets
- LCP < 2.5s on 4G mobile
- Lighthouse Performance ≥ 90
- Lighthouse SEO ≥ 95
- Lighthouse Accessibility ≥ 90
- Lighthouse Best Practices ≥ 90

### SEO Keywords (priority)
- "MDF boards Lagos"
- "HDF boards Nigeria"
- "UV gloss boards Lagos"
- "Marine boards Nigeria"
- "Edge tape supplier Lagos"
- "PU stone panels Lagos"
- "board materials Lagos"

---

## 7. WhatsApp Integration Spec

WhatsApp number format: `234XXXXXXXXXX` (replace with actual number)

| Context | Pre-filled Message |
|---------|-------------------|
| Homepage CTA | "Hello, please send me your product price list." |
| Product page | "Hello, I am interested in: [Product Name]. Please send pricing and availability." |
| Contact page | "Hello, I have an enquiry about [free text from form]." |
| Float button | "Hello, I would like to make an enquiry." |

URL format: `https://wa.me/234XXXXXXXXXX?text=<encoded_message>`

---

## 8. CMS Admin Requirements

The Modish Standard team must be able to (without developer):
- Add/edit/delete products
- Upload product images (auto-compressed by Sanity)
- Change prices
- Update stock status
- Add/edit categories
- Update showroom info
- Reorder featured products

---

## 9. Analytics Requirements

- Google Analytics 4 (pageviews, sessions, bounce rate)
- Custom events: `whatsapp_click`, `contact_form_submit`, `product_view`
- Google Search Console: index coverage, keyword rankings

---

## 10. Future Features (v2+)
- Online checkout with Paystack
- Inventory management
- Dealer/trade account portal
- Bulk order request form
- PDF catalog export
- Order history for repeat buyers
