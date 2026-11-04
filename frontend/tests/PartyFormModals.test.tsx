import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DonorFormModal } from '../src/pages/donors/DonorFormModal'
import { RecipientFormModal } from '../src/pages/recipients/RecipientFormModal'

const createDonor = vi.hoisted(() => vi.fn())
const updateDonor = vi.hoisted(() => vi.fn())
const createRecipient = vi.hoisted(() => vi.fn())
const updateRecipient = vi.hoisted(() => vi.fn())

vi.mock('../src/hooks/useDonors', () => ({
  useCreateDonor: () => ({ mutateAsync: createDonor }),
  useUpdateDonor: () => ({ mutateAsync: updateDonor }),
}))
vi.mock('../src/hooks/useRecipients', () => ({
  useCreateRecipient: () => ({ mutateAsync: createRecipient }),
  useUpdateRecipient: () => ({ mutateAsync: updateRecipient }),
}))

describe('formulário do doador (administração) — endereço para o mapa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createDonor.mockResolvedValue({})
    updateDonor.mockResolvedValue({})
  })

  it('envia o endereço ao cadastrar', async () => {
    const user = userEvent.setup()
    render(<DonorFormModal onClose={() => {}} />)
    await user.type(screen.getByLabelText('Nome'), 'Padaria Central')
    await user.type(screen.getByLabelText(/^Endereço/), 'Rua XV, 100')
    await user.type(screen.getByLabelText('Cidade'), 'Sorocaba')
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(createDonor).toHaveBeenCalled())
    expect(createDonor.mock.calls[0][0]).toMatchObject({ name: 'Padaria Central', address: 'Rua XV, 100', city: 'Sorocaba' })
  })

  it('ao editar, vem preenchido com o endereço atual e envia a alteração', async () => {
    const user = userEvent.setup()
    const donor = { id: 'd1', name: 'Padaria', type: 'OUTRO', contactName: null, phone: null, address: 'Rua Velha, 1', city: 'Sorocaba', state: 'SP' }
    render(<DonorFormModal donor={donor as never} onClose={() => {}} />)
    const field = screen.getByLabelText(/^Endereço/)
    expect(field).toHaveValue('Rua Velha, 1')
    await user.clear(field)
    await user.type(field, 'Rua Nova, 2')
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(updateDonor).toHaveBeenCalled())
    expect(updateDonor.mock.calls[0][0]).toMatchObject({ address: 'Rua Nova, 2' })
  })

  it('o endereço é opcional', async () => {
    const user = userEvent.setup()
    render(<DonorFormModal onClose={() => {}} />)
    await user.type(screen.getByLabelText('Nome'), 'Feira Livre')
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(createDonor).toHaveBeenCalled())
    expect(createDonor.mock.calls[0][0].address).toBeUndefined()
  })
})

describe('formulário do receptor (administração) — endereço para o mapa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createRecipient.mockResolvedValue({})
  })

  it('envia o endereço ao cadastrar', async () => {
    const user = userEvent.setup()
    render(<RecipientFormModal onClose={() => {}} />)
    await user.type(screen.getByLabelText('Nome'), 'ONG Mesa Solidária')
    await user.type(screen.getByLabelText(/^Endereço/), 'Av. Central, 500')
    await user.click(screen.getByRole('button', { name: /salvar/i }))
    await waitFor(() => expect(createRecipient).toHaveBeenCalled())
    expect(createRecipient.mock.calls[0][0]).toMatchObject({ name: 'ONG Mesa Solidária', address: 'Av. Central, 500' })
  })
})
