import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Login } from '../src/pages/Login'

const loginMock = vi.hoisted(() => vi.fn())
const saveSessionMock = vi.hoisted(() => vi.fn())
vi.mock('../src/services/auth', () => ({ login: loginMock, saveSession: saveSessionMock }))

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
}

describe('Login', () => {
  it('renderiza os campos de e-mail e senha', () => {
    renderLogin()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
  })

  it('mostra erros de validação ao submeter vazio, sem chamar login', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(await screen.findByText('E-mail é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Senha é obrigatória')).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('chama login e salva a sessão ao submeter um form válido', async () => {
    loginMock.mockResolvedValueOnce({
      csrfToken: 'csrf-123',
      user: { id: '1', name: 'Doador', email: 'doador@teste.com', role: 'DOADOR' },
    })
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('E-mail'), 'doador@teste.com')
    await user.type(screen.getByLabelText('Senha'), 'Senha@123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({ email: 'doador@teste.com', password: 'Senha@123' }),
    )
    expect(saveSessionMock).toHaveBeenCalled()
  })
})
