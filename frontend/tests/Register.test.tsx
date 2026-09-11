import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Register } from '../src/pages/Register'

const registerMock = vi.hoisted(() => vi.fn())
const saveSessionMock = vi.hoisted(() => vi.fn())
vi.mock('../src/services/auth', () => ({ register: registerMock, saveSession: saveSessionMock }))

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
}

describe('Register', () => {
  it('mostra os campos de doador por padrão (papel inicial)', () => {
    renderRegister()
    expect(screen.getByText('Dados do doador')).toBeInTheDocument()
    expect(screen.queryByText('Dados do receptor')).not.toBeInTheDocument()
  })

  it('troca pros campos de receptor ao selecionar esse papel', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.click(screen.getByText('Receptor (ONG, família)'))

    expect(screen.getByText('Dados do receptor')).toBeInTheDocument()
    expect(screen.queryByText('Dados do doador')).not.toBeInTheDocument()
  })

  it('exige o nome do doador antes de submeter', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.click(screen.getByRole('button', { name: /cadastrar/i }))

    expect(await screen.findByText('Nome do doador é obrigatório')).toBeInTheDocument()
    expect(registerMock).not.toHaveBeenCalled()
  })
})
