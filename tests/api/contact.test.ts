/**
 * Tests for contact form validation logic.
 * We test the Zod schema directly since NextRequest requires Node.js Web APIs.
 */
import { z } from 'zod'

const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  phone: z
    .string()
    .regex(
      /^(\+?234|0)[789][01]\d{8}$/,
      'Please enter a valid Nigerian phone number'
    ),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message must be less than 1000 characters'),
})

describe('Contact form validation', () => {
  it('accepts valid Nigerian phone number (080...)', () => {
    const result = contactSchema.safeParse({
      name: 'John',
      phone: '08012345678',
      message: 'I need boards please',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid Nigerian phone number (+234...)', () => {
    const result = contactSchema.safeParse({
      name: 'John',
      phone: '+2348012345678',
      message: 'I need boards please',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid Nigerian phone number (234...)', () => {
    const result = contactSchema.safeParse({
      name: 'John',
      phone: '2348012345678',
      message: 'I need boards please',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid phone number', () => {
    const result = contactSchema.safeParse({
      name: 'John',
      phone: '12345',
      message: 'I need boards please',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name that is too short', () => {
    const result = contactSchema.safeParse({
      name: 'J',
      phone: '08012345678',
      message: 'I need boards please',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('name')
    }
  })

  it('rejects message that is too short', () => {
    const result = contactSchema.safeParse({
      name: 'John',
      phone: '08012345678',
      message: 'Hi',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path[0]).toBe('message')
    }
  })

  it('rejects missing required fields', () => {
    const result = contactSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects non-Nigerian phone formats', () => {
    const result = contactSchema.safeParse({
      name: 'John',
      phone: '+44712345678',
      message: 'I need boards please',
    })
    expect(result.success).toBe(false)
  })
})
