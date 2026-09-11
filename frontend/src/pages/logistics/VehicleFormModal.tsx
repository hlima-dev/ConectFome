import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/Modal'
import { useCreateVehicle, useUpdateVehicle } from '../../hooks/useVehicles'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'
import type { Vehicle } from '../../types/logistics'

const schema = z.object({
  plate: z.string().min(1, 'Placa é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  capacityKg: z.union([z.literal(''), z.coerce.number().positive()]).optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

interface VehicleFormModalProps {
  vehicle?: Vehicle
  onClose: () => void
}

export function VehicleFormModal({ vehicle, onClose }: VehicleFormModalProps) {
  const isEditing = !!vehicle
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle(vehicle?.id ?? '')
  const mutation = isEditing ? updateVehicle : createVehicle

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: vehicle
      ? { plate: vehicle.plate, model: vehicle.model, capacityKg: vehicle.capacityKg ?? '' }
      : undefined,
  })

  async function onSubmit(values: FormValues) {
    try {
      await mutation.mutateAsync({
        plate: values.plate,
        model: values.model,
        capacityKg: values.capacityKg === '' || values.capacityKg === undefined ? undefined : Number(values.capacityKg),
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
    <Modal title={isEditing ? 'Editar veículo' : 'Novo veículo'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="vehicle-plate" className="mb-1 block text-sm font-medium text-slate-700">
              Placa
            </label>
            <input id="vehicle-plate" className="input" {...register('plate')} />
            {errors.plate && <p className="mt-1 text-xs text-red-600">{errors.plate.message}</p>}
          </div>
          <div>
            <label htmlFor="vehicle-model" className="mb-1 block text-sm font-medium text-slate-700">
              Modelo
            </label>
            <input id="vehicle-model" className="input" {...register('model')} />
            {errors.model && <p className="mt-1 text-xs text-red-600">{errors.model.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="vehicle-capacityKg" className="mb-1 block text-sm font-medium text-slate-700">
            Capacidade (kg) <span className="font-normal text-slate-400">(opcional, apenas informativo)</span>
          </label>
          <input id="vehicle-capacityKg" type="number" step="0.1" className="input" {...register('capacityKg')} />
          {errors.capacityKg && <p className="mt-1 text-xs text-red-600">{errors.capacityKg.message}</p>}
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
