import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UrgencyBadge } from '../src/components/UrgencyBadge'

const urgency = (level: 'EXPIRED' | 'URGENT' | 'NORMAL', hoursLeft: number) => ({
  level,
  hoursLeft,
  deadline: '2026-11-01T12:00:00Z',
})

describe('UrgencyBadge', () => {
  it('urgente mostra o tempo restante', () => {
    render(<UrgencyBadge urgency={urgency('URGENT', 5.5)} />)
    expect(screen.getByText('Urgente · 5 h')).toBeInTheDocument()
  })

  it('prazo encerrado', () => {
    render(<UrgencyBadge urgency={urgency('EXPIRED', -3)} />)
    expect(screen.getByText('Prazo encerrado')).toBeInTheDocument()
  })

  it.each([urgency('NORMAL', 80), null, undefined])('não mostra nada para prazo normal ou sem urgência (%j)', (value) => {
    const { container } = render(<UrgencyBadge urgency={value} />)
    expect(container).toBeEmptyDOMElement()
  })
})
