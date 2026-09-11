import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/Modal'
import { useCreateRecipient, useUpdateRecipient } from '../../hooks/useRecipients'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'
import { RECIPIENT_TYPE_LABELS } from '../../types/auth'
import type { Recipient } from '../../types/recipients'

const schema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  type: z.enum(['ONG', 'FAMILIA'], { message: 'Tipo é obrigatório' }),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  peopleServed: z.union([z.literal(''), z.coerce.number().int().positive()]).optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

interface RecipientFormModalProps {
  recipient?: Recipient
  onClose: () => void
}

export function RecipientFormModal({ recipient, onClose }: RecipientFormModalProps) {
  const isEditing = !!recipient
  const createRecipient = useCreateRecipient()
  const updateRecipient = useUpdateRecipient(recipient?.id ?? '')
  const mutation = isEditing ? updateRecipient : createRecipient

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: recipient
      ? {
          name: recipient.name,
          type: recipient.type,
          contactName: recipient.contactName ?? '',
          phone: recipient.phone ?? '',
          city: recipient.city ?? '',
          state: recipient.state ?? '',
          peopleServed: recipient.peopleServed ?? '',
        }
      : { type: 'ONG' },
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
        peopleServed: values.peopleServed === '' || values.peopleServed === undefined ? undefined : Number(values.peopleServed),
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
    <Modal title={isEditing ? 'Editar receptor' : 'Novo receptor'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="recipient-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nome
            </label>
            <input id="recipient-name" className="input" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="recipient-type" className="mb-1 block text-sm font-medium text-slate-700">
              Tipo
            </label>
            <select id="recipient-type" className="input" {...register('type')}>
              {Object.entries(RECIPIENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="recipient-contactName" className="mb-1 block text-sm font-medium text-slate-700">
              Pessoa de contato <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input id="recipient-contactName" className="input" {...register('contactName')} />
          </div>
          <div>
            <label htmlFor="recipient-peopleServed" className="mb-1 block text-sm font-medium text-slate-700">
              Pessoas atendidas <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input id="recipient-peopleServed" type="number" className="input" {...register('peopleServed')} />
            {errors.peopleServed && <p className="mt-1 text-xs text-red-600">{errors.peopleServed.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="recipient-phone" className="mb-1 block text-sm font-medium text-slate-700">
              Telefone <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input id="recipient-phone" className="input" {...register('phone')} />
          </div>
          <div>
            <label htmlFor="recipient-city" className="mb-1 block text-sm font-medium text-slate-700">
              Cidade
            </label>
            <input id="recipient-city" className="input" {...register('city')} />
          </div>
          <div>
            <label htmlFor="recipient-state" className="mb-1 block text-sm font-medium text-slate-700">
              UF
            </label>
            <input id="recipient-state" className="input" maxLength={2} {...register('state')} />
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
