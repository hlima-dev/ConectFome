import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCreatePickupRoute } from '../../hooks/usePickupRoutes'
import { useVehicles } from '../../hooks/useVehicles'
import { useVolunteers } from '../../hooks/useVolunteers'
import { getErrorMessage, getFieldErrors } from '../../utils/errors'

const schema = z.object({
  vehicleId: z.string().min(1, 'Selecione o veículo'),
  volunteerId: z.string().min(1, 'Selecione o voluntário'),
  scheduledFor: z.string().min(1, 'Informe a data e hora'),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function PickupRouteFormPage() {
  const navigate = useNavigate()
  const createRoute = useCreatePickupRoute()
  const { data: vehicles } = useVehicles()
  const { data: volunteers } = useVolunteers()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      const route = await createRoute.mutateAsync({
        vehicleId: values.vehicleId,
        volunteerId: values.volunteerId,
        scheduledFor: new Date(values.scheduledFor).toISOString(),
        notes: values.notes || undefined,
      })
      navigate(`/rotas/${route.id}`)
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
    <div className="mx-auto max-w-xl">
      <button
        type="button"
        onClick={() => navigate('/rotas')}
        className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={16} />
        Voltar para rotas
      </button>

      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nova rota de coleta</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label htmlFor="route-vehicleId" className="mb-1 block text-sm font-medium text-slate-700">
            Veículo
          </label>
          <select id="route-vehicleId" className="input" {...register('vehicleId')}>
            <option value="">Selecione o veículo</option>
            {vehicles?.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} — {vehicle.model}
              </option>
            ))}
          </select>
          {errors.vehicleId && <p className="mt-1 text-xs text-red-600">{errors.vehicleId.message}</p>}
        </div>

        <div>
          <label htmlFor="route-volunteerId" className="mb-1 block text-sm font-medium text-slate-700">
            Voluntário
          </label>
          <select id="route-volunteerId" className="input" {...register('volunteerId')}>
            <option value="">Selecione o voluntário</option>
            {volunteers?.map((volunteer) => (
              <option key={volunteer.id} value={volunteer.id}>
                {volunteer.name}
              </option>
            ))}
          </select>
          {errors.volunteerId && <p className="mt-1 text-xs text-red-600">{errors.volunteerId.message}</p>}
        </div>

        <div>
          <label htmlFor="route-scheduledFor" className="mb-1 block text-sm font-medium text-slate-700">
            Agendada para
          </label>
          <input id="route-scheduledFor" type="datetime-local" className="input" {...register('scheduledFor')} />
          {errors.scheduledFor && <p className="mt-1 text-xs text-red-600">{errors.scheduledFor.message}</p>}
        </div>

        <div>
          <label htmlFor="route-notes" className="mb-1 block text-sm font-medium text-slate-700">
            Observações <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea id="route-notes" className="input" rows={2} {...register('notes')} />
        </div>

        {errors.root && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/rotas')}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Criando...' : 'Criar rota'}
          </button>
        </div>
      </form>
    </div>
  )
}
