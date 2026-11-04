import { AlertTriangle, MapPinOff } from 'lucide-react'
import { RouteMap } from './RouteMap'
import type { RoutePlan, VehicleLoad } from '../types/logistics'

interface RoutePlanPanelProps {
  plan: RoutePlan
  load: VehicleLoad
}

const kg = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`

// Carga contra a capacidade do veículo + paradas na ordem sugerida + mapa. É
// apoio à decisão: a ordem vem de uma heurística (vizinho mais próximo) e a
// distância é em linha reta, não por ruas.
export function RoutePlanPanel({ plan, load }: RoutePlanPanelProps) {
  const percent = load.capacityKg ? Math.min(100, (load.totalKg / load.capacityKg) * 100) : 0

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-base font-semibold text-slate-900">Carga e percurso</h2>

      <div className="mb-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-700">
            Carga estimada: <strong>{kg(load.totalKg)}</strong>
            {load.capacityKg !== null ? ` de ${kg(load.capacityKg)}` : ' (veículo sem capacidade cadastrada)'}
          </span>
          {load.capacityKg !== null && !load.exceeds && load.remainingKg !== null && (
            <span className="text-slate-500">cabem mais {kg(load.remainingKg)}</span>
          )}
        </div>
        {load.capacityKg !== null && (
          <div
            role="progressbar"
            aria-label="Carga do veículo"
            aria-valuemin={0}
            aria-valuemax={load.capacityKg}
            aria-valuenow={load.totalKg}
            className="h-2 overflow-hidden rounded-full bg-slate-100"
          >
            <div className={`h-full ${load.exceeds ? 'bg-red-500' : 'bg-emerald-600'}`} style={{ width: `${percent}%` }} />
          </div>
        )}
        {load.exceeds && load.capacityKg !== null && (
          <p role="alert" className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            O peso estimado passa da capacidade do veículo em {kg(load.totalKg - load.capacityKg)}. A rota não poderá ser
            iniciada: retire doações ou troque o veículo.
          </p>
        )}
      </div>

      {plan.stops.length > 0 ? (
        <>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Ordem sugerida das paradas</h3>
            <p className="text-xs text-slate-500">
              ≈ {plan.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km em linha reta (estimativa, não considera ruas)
            </p>
          </div>
          <ol className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {plan.stops.map((stop) => (
              <li key={stop.donorId} className="flex gap-3 px-3 py-2.5 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
                  {stop.sequence}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{stop.donorName}</p>
                  <p className="text-slate-500">{[stop.address, stop.city].filter(Boolean).join(' · ') || 'Sem endereço'}</p>
                  <p className="text-slate-600">
                    {stop.donations.map((d) => `${d.description} (${kg(d.estimatedKg)})`).join(', ')}
                  </p>
                </div>
                {stop.sequence > 1 && <span className="shrink-0 text-xs text-slate-400">+{stop.legKm.toLocaleString('pt-BR')} km</span>}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="mb-4 text-sm text-slate-500">
          {plan.unlocated.length > 0
            ? 'Nenhuma parada tem coordenadas, então não há mapa nem ordem sugerida.'
            : 'Anexe doações para ver as paradas e o mapa.'}
        </p>
      )}

      {plan.unlocated.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <MapPinOff size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Sem coordenadas ({plan.unlocated.length}): fora do mapa e da distância</p>
            <p>
              {plan.unlocated.map((s) => `${s.donorName}${s.address ? ` — ${s.address}` : ''}`).join('; ')}. Confira se o
              endereço do doador está completo (rua, número e cidade).
            </p>
          </div>
        </div>
      )}

      {(plan.stops.length > 0 || plan.recipients.length > 0) && <RouteMap plan={plan} />}
      {plan.recipients.length > 0 && (
        <p className="mt-2 text-xs text-slate-500">Marcadores azuis “R” indicam onde ficam os receptores (destino das entregas).</p>
      )}
    </div>
  )
}
