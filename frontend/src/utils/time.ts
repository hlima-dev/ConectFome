// "3 h", "menos de 1 h", "2 dias" — leitura rápida, sem falsa precisão.
export function formatTimeLeft(hoursLeft: number): string {
  if (hoursLeft < 1) return 'menos de 1 h'
  if (hoursLeft < 24) return `${Math.floor(hoursLeft)} h`
  const days = Math.floor(hoursLeft / 24)
  return days === 1 ? '1 dia' : `${days} dias`
}
