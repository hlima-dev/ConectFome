// Pill de status genérico — cada módulo mapeia seu enum de status pra um
// "tone" aqui (ex: RASCUNHO -> neutral, CONCLUIDA -> green), mantendo a
// paleta consistente em todas as telas: cinza=inicial, azul=em andamento,
// verde=concluído, vermelho=cancelado/erro, âmbar=atenção.
export type BadgeTone = 'neutral' | 'blue' | 'green' | 'red' | 'amber'

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-800',
}

interface StatusBadgeProps {
  label: string
  tone?: BadgeTone
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>
      {label}
    </span>
  )
}
