// Apoio à decisão do administrador ao montar uma rota de coleta. É uma
// heurística: ordena as paradas pelo vizinho mais próximo e mede distância em
// LINHA RETA (haversine). Não considera ruas, trânsito nem janelas de tempo, e
// não garante a rota mais curta.

export interface LatLng {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_KM = 6371

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLng = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export interface StopDonation {
  id: string
  description: string
  estimatedKg: number
  deadline: Date | null
}

export interface StopInput {
  donorId: string
  donorName: string
  address: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  donations: StopDonation[]
}

export interface PlannedStop extends StopInput {
  latitude: number
  longitude: number
  sequence: number
  // Distância em linha reta desde a parada anterior (0 na primeira).
  legKm: number
}

export interface RoutePlan {
  stops: PlannedStop[]
  totalKm: number
  // Paradas sem coordenadas: aparecem na lista, mas ficam fora do mapa e da distância.
  unlocated: StopInput[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

function earliestDeadline(stop: StopInput): number {
  const times = stop.donations.map((d) => d.deadline?.getTime()).filter((t): t is number => t !== undefined)
  return times.length > 0 ? Math.min(...times) : Infinity
}

const hasCoordinates = (s: StopInput): s is StopInput & { latitude: number; longitude: number } =>
  s.latitude !== null && s.longitude !== null

// Agrupa as doações por doador: um doador com várias doações na rota é uma parada só.
export function groupByDonor(items: { donor: Omit<StopInput, 'donations'>; donation: StopDonation }[]): StopInput[] {
  const byDonor = new Map<string, StopInput>()
  for (const { donor, donation } of items) {
    const stop = byDonor.get(donor.donorId) ?? { ...donor, donations: [] }
    stop.donations.push(donation)
    byDonor.set(donor.donorId, stop)
  }
  return [...byDonor.values()]
}

// Começa pela parada com o prazo mais próximo (a mais urgente) e, a cada passo,
// vai para a parada ainda não visitada mais próxima da atual.
export function planRoute(stops: StopInput[]): RoutePlan {
  const located = stops.filter(hasCoordinates)
  const unlocated = stops.filter((s) => !hasCoordinates(s))
  if (located.length === 0) return { stops: [], totalKm: 0, unlocated }

  const remaining = [...located]
  const startIndex = remaining.reduce((best, stop, i) => (earliestDeadline(stop) < earliestDeadline(remaining[best]) ? i : best), 0)
  const ordered: PlannedStop[] = []
  let current = remaining.splice(startIndex, 1)[0]
  ordered.push({ ...current, sequence: 1, legKm: 0 })

  while (remaining.length > 0) {
    let nearest = 0
    let nearestKm = haversineKm(current, remaining[0])
    for (let i = 1; i < remaining.length; i++) {
      const km = haversineKm(current, remaining[i])
      if (km < nearestKm) {
        nearest = i
        nearestKm = km
      }
    }
    current = remaining.splice(nearest, 1)[0]
    ordered.push({ ...current, sequence: ordered.length + 1, legKm: round1(nearestKm) })
  }

  const totalKm = round1(ordered.reduce((sum, s) => sum + s.legKm, 0))
  return { stops: ordered, totalKm, unlocated }
}

export interface VehicleLoad {
  totalKg: number
  capacityKg: number | null
  exceeds: boolean
  remainingKg: number | null
}

export function computeLoad(estimatedKgs: number[], capacityKg: number | null | undefined): VehicleLoad {
  const totalKg = Math.round(estimatedKgs.reduce((sum, kg) => sum + kg, 0) * 100) / 100
  // Veículo sem capacidade cadastrada: não há o que verificar.
  if (capacityKg === null || capacityKg === undefined) {
    return { totalKg, capacityKg: null, exceeds: false, remainingKg: null }
  }
  return { totalKg, capacityKg, exceeds: totalKg > capacityKg, remainingKg: Math.round((capacityKg - totalKg) * 100) / 100 }
}
