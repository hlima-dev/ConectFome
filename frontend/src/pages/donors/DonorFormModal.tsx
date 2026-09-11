import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/Modal'
import { useCreateDonor, useUpdateDonor } from '../../hooks/useDonors'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'
import { DONOR_TYPE_LABELS } from '../../types/auth'
import type { Donor } from '../../types/donors'

const schema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  type: z.enum(['MERCADO', 'RESTAURANTE', 'FEIRA', 'OUTRO'], { message: 'Tipo é obrigatório' }),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface DonorFormModalProps {
  donor?: Donor
  onClose: () => void
}

export function DonorFormModal({ donor, onClose }: DonorFormModalProps) {
  const isEditing = !!donor
  const createDonor = useCreateDonor()
  const updateDonor = useUpdateDonor(donor?.id ?? '')
  const mutation = isEditing ? updateDonor : createDonor

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: donor
      ? {
          name: donor.name,
          type: donor.type,
          contactName: donor.contactName ?? '',
          phone: donor.phone ?? '',
          city: donor.city ?? '',
          state: donor.state ?? '',
        }
      : { type: 'OUTRO' },
  })

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync({
        name: values.name,
        type: values.type,
        contactName: values.contactName || undefined,
        phone: values.phone || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
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
    <Modal title={isEditing ? 'Editar doador' : 'Novo doador'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="donor-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nome
            </label>
            <input id="donor-name" className="input" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="donor-type" className="mb-1 block text-sm font-medium text-slate-700">
              Tipo
            </label>
            <select id="donor-type" className="input" {...register('type')}>
              {Object.entries(DONOR_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="donor-contactName" className="mb-1 block text-sm font-medium text-slate-700">
            Pessoa de contato <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <input id="donor-contactName" className="input" {...register('contactName')} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="donor-phone" className="mb-1 block text-sm font-medium text-slate-700">
              Telefone <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input id="donor-phone" className="input" {...register('phone')} />
          </div>
          <div>
            <label htmlFor="donor-city" className="mb-1 block text-sm font-medium text-slate-700">
              Cidade
            </label>
            <input id="donor-city" className="input" {...register('city')} />
          </div>
          <div>
            <label htmlFor="donor-state" className="mb-1 block text-sm font-medium text-slate-700">
              UF
            </label>
            <input id="donor-state" className="input" maxLength={2} {...register('state')} />
          </div>
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
