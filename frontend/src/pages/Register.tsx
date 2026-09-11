import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { register as registerRequest, saveSession } from '../services/auth'
import { getErrorMessage, getFieldErrors } from '../utils/errors'
import { DONOR_TYPE_LABELS, RECIPIENT_TYPE_LABELS } from '../types/auth'

const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter ao menos 8 caracteres')
  .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula')
  .regex(/[0-9]/, 'Senha deve conter ao menos um número')

// Campos de doador/receptor ficam "soltos" no mesmo schema (em vez de um
// z.discriminatedUnion aninhado) pra manter o formulário simples com RHF —
// só os do papel escolhido são exigidos, via .refine abaixo.
const schema = z
  .object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: passwordSchema,
    phone: z.string().optional(),
    role: z.enum(['DOADOR', 'RECEPTOR'], { message: 'Selecione um papel' }),

    donorName: z.string().optional(),
    donorType: z.enum(['MERCADO', 'RESTAURANTE', 'FEIRA', 'OUTRO']).optional(),
    donorCity: z.string().optional(),
    donorState: z.string().optional(),

    recipientName: z.string().optional(),
    recipientType: z.enum(['ONG', 'FAMILIA']).optional(),
    recipientCity: z.string().optional(),
    recipientState: z.string().optional(),
    recipientPeopleServed: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => data.role !== 'DOADOR' || (data.donorName?.length ?? 0) >= 2, {
    message: 'Nome do doador é obrigatório',
    path: ['donorName'],
  })
  .refine((data) => data.role !== 'RECEPTOR' || (data.recipientName?.length ?? 0) >= 2, {
    message: 'Nome do receptor é obrigatório',
    path: ['recipientName'],
  })

// Generics triplo por causa do z.coerce.number() em recipientPeopleServed —
// o tipo "de entrada" do campo (antes da coerção) difere do "de saída"
// (depois, o que chega no onSubmit).
type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

export function Register() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'DOADOR', donorType: 'OUTRO', recipientType: 'ONG' },
  })

  const role = watch('role')

  async function onSubmit(values: FormValues) {
    setFormError(null)
    try {
      const result = await registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
        role: values.role,
        donor:
          values.role === 'DOADOR'
            ? {
                name: values.donorName!,
                type: values.donorType ?? 'OUTRO',
                city: values.donorCity || undefined,
                state: values.donorState || undefined,
              }
            : undefined,
        recipient:
          values.role === 'RECEPTOR'
            ? {
                name: values.recipientName!,
                type: values.recipientType ?? 'ONG',
                city: values.recipientCity || undefined,
                state: values.recipientState || undefined,
                peopleServed: values.recipientPeopleServed,
              }
            : undefined,
      })
      saveSession(result)
      navigate('/', { replace: true })
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      if (fieldErrors) {
        Object.entries(fieldErrors).forEach(([field, messages]) => {
          setError(field as keyof FormValues, { message: messages[0] })
        })
      } else {
        setFormError(getErrorMessage(error))
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">🍎 ConectFome</h1>
          <p className="mt-1 text-sm text-slate-500">Cadastre-se como doador ou receptor</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Eu sou</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                  role === 'DOADOR' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'
                }`}
              >
                <input type="radio" value="DOADOR" className="sr-only" {...register('role')} />
                Doador (mercado, restaurante, feira)
              </label>
              <label
                className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                  role === 'RECEPTOR' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-600'
                }`}
              >
                <input type="radio" value="RECEPTOR" className="sr-only" {...register('role')} />
                Receptor (ONG, família)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Nome
              </label>
              <input id="name" className="input" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
                Telefone <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <input id="phone" className="input" {...register('phone')} />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input id="email" type="email" autoComplete="username" className="input" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Senha
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="input"
              {...register('password')}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {role === 'DOADOR' && (
            <div className="rounded-lg border border-slate-200 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Dados do doador</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="donorName" className="mb-1 block text-sm font-medium text-slate-700">
                    Nome do estabelecimento
                  </label>
                  <input id="donorName" className="input" {...register('donorName')} />
                  {errors.donorName && <p className="mt-1 text-xs text-red-600">{errors.donorName.message}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="donorType" className="mb-1 block text-sm font-medium text-slate-700">
                      Tipo
                    </label>
                    <select id="donorType" className="input" {...register('donorType')}>
                      {Object.entries(DONOR_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="donorCity" className="mb-1 block text-sm font-medium text-slate-700">
                      Cidade
                    </label>
                    <input id="donorCity" className="input" {...register('donorCity')} />
                  </div>
                  <div>
                    <label htmlFor="donorState" className="mb-1 block text-sm font-medium text-slate-700">
                      UF
                    </label>
                    <input id="donorState" className="input" maxLength={2} {...register('donorState')} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {role === 'RECEPTOR' && (
            <div className="rounded-lg border border-slate-200 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Dados do receptor</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label htmlFor="recipientName" className="mb-1 block text-sm font-medium text-slate-700">
                    Nome da ONG/família
                  </label>
                  <input id="recipientName" className="input" {...register('recipientName')} />
                  {errors.recipientName && (
                    <p className="mt-1 text-xs text-red-600">{errors.recipientName.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="recipientType" className="mb-1 block text-sm font-medium text-slate-700">
                      Tipo
                    </label>
                    <select id="recipientType" className="input" {...register('recipientType')}>
                      {Object.entries(RECIPIENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="recipientPeopleServed" className="mb-1 block text-sm font-medium text-slate-700">
                      Pessoas atendidas <span className="font-normal text-slate-400">(opcional)</span>
                    </label>
                    <input
                      id="recipientPeopleServed"
                      type="number"
                      className="input"
                      {...register('recipientPeopleServed')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label htmlFor="recipientCity" className="mb-1 block text-sm font-medium text-slate-700">
                      Cidade
                    </label>
                    <input id="recipientCity" className="input" {...register('recipientCity')} />
                  </div>
                  <div>
                    <label htmlFor="recipientState" className="mb-1 block text-sm font-medium text-slate-700">
                      UF
                    </label>
                    <input id="recipientState" className="input" maxLength={2} {...register('recipientState')} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
          >
            <UserPlus size={16} />
            {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          Já tem conta?{' '}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
