import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PrivateRoute } from '../src/routes/PrivateRoute'

const hasStoredSession = vi.hoisted(() => vi.fn())
vi.mock('../src/services/auth', () => ({ hasStoredSession }))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/inicio" element={<p>página inicial</p>} />
        <Route path="/segredo" element={<PrivateRoute><p>área logada</p></PrivateRoute>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PrivateRoute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('visitante sem sessão vai para a página inicial pública', () => {
    hasStoredSession.mockReturnValue(false)
    renderAt('/segredo')
    expect(screen.getByText('página inicial')).toBeInTheDocument()
    expect(screen.queryByText('área logada')).not.toBeInTheDocument()
  })

  it('com sessão, mostra o conteúdo', () => {
    hasStoredSession.mockReturnValue(true)
    renderAt('/segredo')
    expect(screen.getByText('área logada')).toBeInTheDocument()
  })
})
