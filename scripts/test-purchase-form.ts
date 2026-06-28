import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createPOSClientFromEnv } from './pos-client'

async function main() {
  const pos = createPOSClientFromEnv() as any
  await pos.login()

  const res = await fetch('https://pos.virtualrx.com.ng/purchases/create', {
    headers: { Cookie: pos.cookieHeader() }
  })
  const html = await res.text()

  const inputs = [...html.matchAll(/<input[^>]+name=[\"']([^\"']+)[\"'][^>]*/gi)].map(m => m[1])
  const selects = [...html.matchAll(/<select[^>]+name=[\"']([^\"']+)[\"'][^>]*/gi)].map(m => m[1])

  console.log('INPUT fields:', [...new Set(inputs)].join('\n  '))
  console.log('\nSELECT fields:', [...new Set(selects)].join('\n  '))

  // Also look for any Vue/JS data that might indicate required fields
  const metaMatch = html.match(/currencies\s*[:=]\s*(\[.+?\])/s)
  if (metaMatch) console.log('\ncurrencies found in page data')

  const currencyMatch = html.match(/currency_id['":\s]+(\d+)/)
  if (currencyMatch) console.log('currency_id default:', currencyMatch[1])

  // Check for any business settings
  const taxMatch = html.match(/tax_id['":\s]+"?(\d+)"?/)
  if (taxMatch) console.log('tax_id default:', taxMatch[1])
}

main().catch(err => { console.error(err.message); process.exit(1) })
