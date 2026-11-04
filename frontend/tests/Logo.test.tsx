import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from '../src/components/Logo'

describe('Logo', () => {
  it('traz a marca acessível e o nome', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'ConectFome' })).toBeInTheDocument()
    expect(screen.getByText('ConectFome')).toBeInTheDocument()
  })
  it('sem texto, só o símbolo', () => {
    render(<Logo withText={false} />)
    expect(screen.getByRole('img', { name: 'ConectFome' })).toBeInTheDocument()
    expect(screen.queryByText('ConectFome')).not.toBeInTheDocument()
  })
})
