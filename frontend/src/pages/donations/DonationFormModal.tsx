import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/Modal'
import { useCreateDonation } from '../../hooks/useDonations'
import { useDonors } from '../../hooks/useDonors'
import { getStoredUser } from '../../services/auth'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'
import { FOOD_CATEGORY_LABELS } from '../../types/donations'

const schema = z.object({
  donorId: z.string().optional(),
  category: z.enum(['PERECIVEL', 'NAO_PERECIVEL', 'PREPARADO', 'HORTIFRUTI', 'PADARIA', 'OUTRO']),
  description: z.string().min(3, 'Descrição deve ter ao menos 3 caracteres'),
  estimatedQuantityKg: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  bestBeforeDate: z.string().optional(),
  pickupWindowStart: z.string().min(1, 'Informe o início da janela de coleta'),
  pickupWindowEnd: z.string().min(1, 'Informe o fim da janela de coleta'),
  notes: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

interface DonationFormModalProps {
  onClose: () => void
}

export function DonationFormModal({ onClose }: DonationFormModalProps) {
  const user = getStoredUser()
  const isAdmin = user?.role === 'ADMIN'
  const createDonation = useCreateDonation()
  const { data: donors } = useDonors(undefined, { enabled: isAdmin })

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'OUTRO' },
  })

  async function onSubmit(values: FormValues) {
    try {
      await createDonation.mutateAsync({
        donorId: values.donorId || undefined,
        category: values.category,
        description: values.description,
        estimatedQuantityKg: values.estimatedQuantityKg,
        bestBeforeDate: values.bestBeforeDate || undefined,
        pickupWindowStart: new Date(values.pickupWindowStart).toISOString(),
        pickupWindowEnd: new Date(values.pickupWindowEnd).toISOString(),
        notes: values.notes || undefined,
      })
      onClose()
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof FormValues, { message: messages[0] })
        })
      } else {
        setError('root', { message: getErrorMessage(error) })
      }
    }
  }

  return (
    <Modal title="Nova doação" onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {isAdmin && (
          <div>
            <label htmlFor="donation-donorId" className="mb-1 block text-sm font-medium text-slate-700">
              Doador
            </label>
            <select id="donation-donorId" className="input" {...register('donorId')}>
              <option value="">Selecione o doador</option>
              {donors?.map((donor) => (
                <option key={donor.id} value={donor.id}>
                  {donor.name}
                </option>
              ))}
            </select>
            {errors.donorId && <p className="mt-1 text-xs text-red-600">{errors.donorId.message}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="donation-category" className="mb-1 block text-sm font-medium text-slate-700">
              Categoria
            </label>
            <select id="donation-category" className="input" {...register('category')}>
              {Object.entries(FOOD_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="donation-estimatedQuantityKg" className="mb-1 block text-sm font-medium text-slate-700">
              Quantidade estimada (kg)
            </label>
            <input
              id="donation-estimatedQuantityKg"
              type="number"
              step="0.1"
              className="input"
              {...register('estimatedQuantityKg')}
            />
            {errors.estimatedQuantityKg && (
              <p className="mt-1 text-xs text-red-600">{errors.estimatedQuantityKg.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="donation-description" className="mb-1 block text-sm font-medium text-slate-700">
            Descrição
          </label>
          <input
            id="donation-description"
            className="input"
            placeholder="Ex: pães e frutas do dia, cesta de hortifruti..."
            {...register('description')}
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="donation-pickupWindowStart" className="mb-1 block text-sm font-medium text-slate-700">
              Coleta a partir de
            </label>
            <input
              id="donation-pickupWindowStart"
              type="datetime-local"
              className="input"
              {...register('pickupWindowStart')}
            />
            {errors.pickupWindowStart && <p className="mt-1 text-xs text-red-600">{errors.pickupWindowStart.message}</p>}
          </div>
          <div>
            <label htmlFor="donation-pickupWindowEnd" className="mb-1 block text-sm font-medium text-slate-700">
              Coleta até
            </label>
            <input
              id="donation-pickupWindowEnd"
              type="datetime-local"
              className="input"
              {...register('pickupWindowEnd')}
            />
            {errors.pickupWindowEnd && <p className="mt-1 text-xs text-red-600">{errors.pickupWindowEnd.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="donation-bestBeforeDate" className="mb-1 block text-sm font-medium text-slate-700">
            Validade <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input id="donation-bestBeforeDate" type="date" className="input" {...register('bestBeforeDate')} />
        </div>

        <div>
          <label htmlFor="donation-notes" className="mb-1 block text-sm font-medium text-slate-700">
            Observações <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea id="donation-notes" className="input" rows={2} {...register('notes')} />
        </div>

        {errors.root && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
