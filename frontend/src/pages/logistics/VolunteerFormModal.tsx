import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/Modal'
import { useCreateVolunteer, useUpdateVolunteer } from '../../hooks/useVolunteers'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'
import type { Volunteer } from '../../types/logistics'

const schema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  document: z.string().min(1, 'Documento é obrigatório'),
  phone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface VolunteerFormModalProps {
  volunteer?: Volunteer
  onClose: () => void
}

export function VolunteerFormModal({ volunteer, onClose }: VolunteerFormModalProps) {
  const isEditing = !!volunteer
  const createVolunteer = useCreateVolunteer()
  const updateVolunteer = useUpdateVolunteer(volunteer?.id ?? '')
  const mutation = isEditing ? updateVolunteer : createVolunteer

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: volunteer
      ? { name: volunteer.name, document: volunteer.document, phone: volunteer.phone ?? '' }
      : undefined,
  })

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync({ ...values, phone: values.phone || undefined })
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
    <Modal title={isEditing ? 'Editar voluntário' : 'Novo voluntário'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="volunteer-name" className="mb-1 block text-sm font-medium text-slate-700">
            Nome
          </label>
          <input id="volunteer-name" className="input" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="volunteer-document" className="mb-1 block text-sm font-medium text-slate-700">
              Documento (CPF)
            </label>
            <input id="volunteer-document" className="input" {...register('document')} />
            {errors.document && <p className="mt-1 text-xs text-red-600">{errors.document.message}</p>}
          </div>
          <div>
            <label htmlFor="volunteer-phone" className="mb-1 block text-sm font-medium text-slate-700">
              Telefone <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input id="volunteer-phone" className="input" {...register('phone')} />
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
