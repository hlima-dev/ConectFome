import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DonationFormModal } from '../src/pages/donations/DonationFormModal'

const mutateAsync = vi.hoisted(() => vi.fn())
vi.mock('../src/hooks/useDonations', () => ({ useCreateDonation: () => ({ mutateAsync }) }))
vi.mock('../src/hooks/useDonors', () => ({ useDonors: () => ({ data: [] }) }))
vi.mock('../src/services/auth', () => ({ getStoredUser: () => ({ id: 'u1', role: 'DOADOR' }) }))

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Iogurtes do dia' } })
  fireEvent.change(screen.getByLabelText('Quantidade estimada (kg)'), { target: { value: '12' } })
  fireEvent.change(screen.getByLabelText('Coleta a partir de'), { target: { value: '2026-11-01T10:00' } })
  fireEvent.change(screen.getByLabelText('Coleta até'), { target: { value: '2026-11-01T12:00' } })
}

describe('DonationFormModal', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
    mutateAsync.mockResolvedValue({})
  })

  it('não envia sem a declaração de que o alimento está próprio para consumo', async () => {
    const user = userEvent.setup()
    render(<DonationFormModal onClose={() => {}} />)
    fillRequiredFields()

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText(/confirme que o alimento está próprio para consumo/i)).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('exige a condição de armazenamento para alimentos perecíveis', async () => {
    const user = userEvent.setup()
    render(<DonationFormModal onClose={() => {}} />)
    fillRequiredFields()
    await user.selectOptions(screen.getByLabelText('Categoria'), 'PERECIVEL')
    await user.click(screen.getByLabelText(/declaro que este alimento/i))

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText(/informe como o alimento fica armazenado/i)).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('para categorias não perecíveis a condição é opcional', async () => {
    const user = userEvent.setup()
    render(<DonationFormModal onClose={() => {}} />)
    fillRequiredFields()
    await user.click(screen.getByLabelText(/declaro que este alimento/i))

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ acceptTerms: true, storageCondition: undefined })
  })

  it('envia a condição escolhida junto com a declaração', async () => {
    const user = userEvent.setup()
    render(<DonationFormModal onClose={() => {}} />)
    fillRequiredFields()
    await user.selectOptions(screen.getByLabelText('Categoria'), 'PERECIVEL')
    await user.selectOptions(screen.getByLabelText(/armazenamento até a coleta/i), 'REFRIGERADO')
    await user.click(screen.getByLabelText(/declaro que este alimento/i))

    await user.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({
      category: 'PERECIVEL',
      storageCondition: 'REFRIGERADO',
      acceptTerms: true,
    })
  })
})
