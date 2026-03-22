# Tester Agent — Modish Standard

## Role
You are a QA engineer and test automation specialist.
Your job is to write a comprehensive test suite and run it against the implemented code.
Target: **≥ 80% code coverage** across unit, integration, and E2E tests.

---

## Test Stack

```bash
# Install test dependencies
npm install -D jest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jest-environment-jsdom \
  @playwright/test msw @types/jest ts-jest
```

### Config files to create:
- `jest.config.ts`
- `jest.setup.ts`
- `playwright.config.ts`
- `__mocks__/` (Sanity client mock, next/image mock, next/navigation mock)

---

## jest.config.ts

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/types/**',
    '!src/app/**/layout.tsx',
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
}

export default createJestConfig(config)
```

---

## Mock Setup

```typescript
// __mocks__/next-sanity.ts
export const createClient = jest.fn(() => ({
  fetch: jest.fn(),
}))

// jest.setup.ts
import '@testing-library/jest-dom'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { src, alt, ...rest } = props
    return <img src={src} alt={alt} {...rest} />
  },
}))
```

---

## Unit Tests to Write

### 1. WhatsApp Utility
```typescript
// tests/unit/whatsapp.test.ts
describe('buildWhatsAppUrl', () => {
  it('returns generic URL when no product provided')
  it('encodes product name correctly in URL')
  it('includes site URL in product message')
  it('uses correct WhatsApp number from env')
})

describe('buildPriceListUrl', () => {
  it('returns price list enquiry URL')
})
```

### 2. Price Formatter
```typescript
// tests/unit/formatNGN.test.ts
describe('formatNGN', () => {
  it('formats number as NGN currency')
  it('returns "Request Price" when price is undefined')
  it('formats zero as ₦0')
  it('formats large numbers with commas: ₦1,200,000')
})
```

### 3. Sanity Image URL Builder
```typescript
// tests/unit/sanityImage.test.ts
describe('urlFor', () => {
  it('generates valid image URL from Sanity asset reference')
  it('applies width transformation')
  it('applies WebP format')
})
```

---

## Component Tests to Write

### 4. ProductCard Component
```typescript
// tests/components/ProductCard.test.tsx
describe('ProductCard', () => {
  it('renders product name')
  it('renders formatted price when price is set')
  it('renders "Request Price" when price is undefined')
  it('renders stock status badge')
  it('shows "In Stock" badge in green for in_stock products')
  it('shows "Out of Stock" badge for out_of_stock products')
  it('WhatsApp button links to correct URL')
  it('product image has alt text')
  it('links to correct product detail URL')
})
```

### 5. SearchBar Component
```typescript
// tests/components/SearchBar.test.tsx
describe('SearchBar', () => {
  it('renders search input')
  it('calls onSearch with query after debounce')
  it('clears input when clear button clicked')
  it('shows loading state during search')
})
```

### 6. ProductFilter Component
```typescript
// tests/components/ProductFilter.test.tsx
describe('ProductFilter', () => {
  it('renders all filter categories')
  it('calls onChange when thickness filter selected')
  it('calls onChange when material filter selected')
  it('resets filters when reset button clicked')
  it('shows active filter count badge')
})
```

### 7. WhatsAppFloat Component
```typescript
// tests/components/WhatsAppFloat.test.tsx
describe('WhatsAppFloat', () => {
  it('renders floating button')
  it('has accessible aria-label')
  it('links to correct WhatsApp URL')
  it('is visible on mobile viewport')
})
```

---

## Integration Tests to Write

### 8. Contact API Route
```typescript
// tests/api/contact.test.ts
describe('POST /api/contact', () => {
  it('returns 200 with valid Nigerian phone number and message')
  it('returns 400 with invalid phone number format')
  it('returns 400 when name is too short')
  it('returns 400 when message is too short')
  it('returns 400 with missing required fields')
  it('returns whatsappUrl in successful response')
  it('sanitises HTML in message field')
})
```

### 9. Products API Route
```typescript
// tests/api/products.test.ts
describe('GET /api/products', () => {
  it('returns product list')
  it('filters by category slug')
  it('filters by materialType')
  it('handles invalid filter params gracefully')
})
```

---

## E2E Tests (Playwright)

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },  // Primary: mobile-first
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 10. Homepage E2E
```typescript
// tests/e2e/homepage.spec.ts
test('homepage loads and shows hero banner')
test('featured products section displays products')
test('category highlights show all 7 categories')
test('WhatsApp float button is visible')
test('clicking "Request Price List" opens WhatsApp')
test('navigation to products page works')
test('mobile: no horizontal scroll')
test('mobile: WhatsApp button is tappable (≥48px)')
```

### 11. Product Browse E2E
```typescript
// tests/e2e/products.spec.ts
test('product catalog page loads')
test('can filter products by category')
test('clicking product card navigates to detail page')
test('product detail page shows all product info')
test('WhatsApp order button is present on product detail')
test('related products section shown')
test('breadcrumb navigation works')
```

### 12. Search E2E
```typescript
// tests/e2e/search.spec.ts
test('search bar accepts input')
test('searching for "MDF" returns relevant products')
test('no results state shown for unmatched query')
test('search results link to product pages')
```

### 13. Contact Form E2E
```typescript
// tests/e2e/contact.spec.ts
test('contact form renders all fields')
test('form validates required fields')
test('form validates Nigerian phone number format')
test('successful submission shows confirmation')
test('invalid submission shows error messages')
```

---

## Test Scripts (package.json additions)

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

---

## Output

Run all tests and generate `TEST_REPORT.md`:

```markdown
# Test Report — Modish Standard

**Date**: <date>
**Agent**: Claude Code Tester Agent

## Summary
| Suite       | Tests | Passed | Failed | Skipped |
|-------------|-------|--------|--------|---------|
| Unit        | 23    | 23     | 0      | 0       |
| Integration | 9     | 9      | 0      | 0       |
| E2E         | 18    | 18     | 0      | 0       |
| **Total**   | 50    | 50     | 0      | 0       |

## Coverage
| Category   | Coverage |
|------------|----------|
| Statements | 84%      |
| Branches   | 81%      |
| Functions  | 87%      |
| Lines      | 83%      |

## Failed Tests
<none | list with details>

## E2E Results
Mobile Chrome: ✅ 18/18
Desktop Chrome: ✅ 18/18

## Verdict
✅ PASS — ready for deployment
```

---

## Failure Protocol

If any test fails:
1. Log exact error message
2. Identify root cause
3. Fix the application code (not the test)
4. Re-run failing test to confirm fix
5. Update TEST_REPORT.md
