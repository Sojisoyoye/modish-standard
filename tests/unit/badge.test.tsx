import { render, screen } from '@testing-library/react'
import Badge from '@/components/ui/Badge'

describe('Badge', () => {
  it('renders "In Stock" for status "in_stock"', () => {
    render(<Badge status="in_stock" />)
    expect(screen.getByText('In Stock')).toBeInTheDocument()
  })

  it('renders "Out of Stock" for status "out_of_stock"', () => {
    render(<Badge status="out_of_stock" />)
    expect(screen.getByText('Out of Stock')).toBeInTheDocument()
  })

  it('renders "On Request" for status "on_request"', () => {
    render(<Badge status="on_request" />)
    expect(screen.getByText('On Request')).toBeInTheDocument()
  })

  it('renders custom label when provided', () => {
    render(<Badge status="in_stock" label="Available Now" />)
    expect(screen.getByText('Available Now')).toBeInTheDocument()
    expect(screen.queryByText('In Stock')).not.toBeInTheDocument()
  })

  it('renders with correct green color class for in_stock', () => {
    const { container } = render(<Badge status="in_stock" />)
    const badge = container.firstChild as HTMLElement
    expect(badge.className).toContain('bg-green-500/20')
    expect(badge.className).toContain('text-green-400')
  })

  it('renders with default config for unknown status', () => {
    render(<Badge status="something_else" />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})
