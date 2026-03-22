# Modish Standard — Task Board

**Total Tasks**: 35 | **Estimated Hours**: ~48 | **Critical Path**: T001 → T003 → T005 → T020/T021/T022 → T050

---

## ⚪ Not Started

### Phase 0: Foundation
| ID | Title | Priority | Depends On | Hours |
|----|-------|----------|------------|-------|
| T001 | Initialise Next.js 14 project | critical | — | 1 |
| T002 | Configure ESLint and Prettier | critical | T001 | 0.5 |
| T003 | Set up Sanity + Next.js connection | critical | T001 | 1 |
| T004 | Configure environment variables | critical | T001 | 0.5 |
| T005 | Base layout (Header, Footer, WhatsApp) | critical | T001, T003 | 2 |

### Phase 1: Sanity CMS Schemas
| ID | Title | Priority | Depends On | Hours |
|----|-------|----------|------------|-------|
| T010 | Product schema | critical | T003 | 1 |
| T011 | Category schema | critical | T003 | 0.5 |
| T012 | Showroom schema | high | T003 | 0.5 |
| T013 | siteSettings schema | medium | T003 | 0.5 |
| T014 | Seed CMS with sample products | high | T010, T011 | 2 |

### Phase 2: Pages
| ID | Title | Priority | Depends On | Hours |
|----|-------|----------|------------|-------|
| T020 | Homepage | critical | T005, T010, T011 | 3 |
| T021 | Product catalog page | critical | T010, T005 | 3 |
| T022 | Product detail page | critical | T010, T005 | 3 |
| T023 | Category landing pages | high | T011, T021 | 1.5 |
| T024 | Showroom page | high | T012, T005 | 1.5 |
| T025 | Contact page | high | T005 | 1.5 |
| T026 | Search results page | high | T021 | 1.5 |

### Phase 3: API Routes
| ID | Title | Priority | Depends On | Hours |
|----|-------|----------|------------|-------|
| T030 | GET /api/products | high | T010 | 1 |
| T031 | POST /api/contact | high | T001 | 1 |

### Phase 4: Features
| ID | Title | Priority | Depends On | Hours |
|----|-------|----------|------------|-------|
| T040 | Product search | high | T026 | 2 |
| T041 | Product filter system | high | T021 | 2 |
| T042 | WhatsApp deep-link generator | critical | T001 | 0.5 |
| T043 | Image gallery with lightbox | high | T022 | 2 |
| T044 | Related products component | medium | T022 | 1 |

### Phase 5: SEO & Performance
| ID | Title | Priority | Depends On | Hours |
|----|-------|----------|------------|-------|
| T050 | Dynamic metadata for all pages | high | All pages | 2 |
| T051 | JSON-LD structured data | high | T022, T025 | 1.5 |
| T052 | Sitemap.xml generation | high | T020 | 1 |
| T053 | robots.txt | medium | T052 | 0.5 |
| T054 | Image optimization | high | T020, T022 | 1 |
| T055 | Google Analytics integration | medium | T005 | 1 |

### Phase 6: Testing & QA
| ID | Title | Priority | Depends On | Hours |
|----|-------|----------|------------|-------|
| T060 | Unit tests for utilities | high | T042 | 1.5 |
| T061 | Component tests | high | T021, T022 | 2 |
| T062 | Integration tests (API) | high | T030, T031 | 1.5 |
| T063 | E2E tests (Playwright) | medium | T020, T021, T025 | 3 |

### Phase 7: Deployment
| ID | Title | Priority | Depends On | Hours |
|----|-------|----------|------------|-------|
| T070 | GitHub Actions CI/CD | high | T060 | 1.5 |
| T071 | Vercel configuration | high | T001 | 0.5 |
| T072 | Environment variables setup | high | T004 | 0.5 |
| T073 | Custom domain setup docs | medium | T071 | 0.5 |
| T074 | Bootstrap and seed scripts | medium | T014 | 1 |

---

## 🟡 In Progress
_None_

## 🟢 Done
_None_

## 🔴 Blocked
_None_
