import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from '../src/components/Logo'

describe('Logo', () => {
  it('traz a marca acessível e o nome', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'ConectaFome' })).toBeInTheDocument()
    expect(screen.getByText('ConectaFome')).toBeInTheDocument()
  })
  it('sem texto, só o símbolo', () => {
    render(<Logo withText={false} />)
    expect(screen.getByRole('img', { name: 'ConectaFome' })).toBeInTheDocument()
    expect(screen.queryByText('ConectaFome')).not.toBeInTheDocument()
  })
})
