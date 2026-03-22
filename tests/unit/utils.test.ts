import { formatNGN } from '@/lib/utils'

describe('formatNGN', () => {
  it('formats number as NGN currency', () => {
    const result = formatNGN(45000)
    expect(result).toContain('45,000')
  })

  it('returns "Request Price" when price is undefined', () => {
    expect(formatNGN(undefined)).toBe('Request Price')
  })

  it('returns "Request Price" when price is 0', () => {
    expect(formatNGN(0)).toBe('Request Price')
  })

  it('formats large numbers with commas', () => {
    const result = formatNGN(1250000)
    expect(result).toContain('1,250,000')
  })

  it('returns "Request Price" for negative numbers', () => {
    expect(formatNGN(-100)).toBe('Request Price')
  })
})
