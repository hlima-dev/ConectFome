// Peso em quilogramas no padrão brasileiro: vírgula decimal, no máximo 2 casas,
// sem zeros sobrando ("80,5 kg", "20 kg"). Aceita número ou o texto decimal
// que a API devolve para colunas numéricas do banco ("18.50").
export function formatKg(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
}
