import { describe, it, expect } from 'vitest'
import { computeLoad, groupByDonor, haversineKm, planRoute, type StopInput } from '../src/utils/routePlanner'

const stop = (donorId: string, latitude: number | null, longitude: number | null, deadlineHours: number | null = null, kg = 5): StopInput => ({
  donorId,
  donorName: donorId,
  address: `Rua ${donorId}`,
  city: 'Sorocaba',
  latitude,
  longitude,
  donations: [{ id: `don-${donorId}`, description: 'x', estimatedKg: kg, deadline: deadlineHours === null ? null : new Date(Date.UTC(2026, 10, 1, deadlineHours)) }],
})

describe('routePlanner — haversineKm', () => {
  it('mesmo ponto: 0', () => {
    expect(haversineKm({ latitude: -23.5, longitude: -47.4 }, { latitude: -23.5, longitude: -47.4 })).toBe(0)
  })
  it('1 grau de latitude ≈ 111,2 km', () => {
    expect(haversineKm({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(111.19, 1)
  })
  it('Sorocaba → São Paulo ≈ 85 km em linha reta', () => {
    const sorocaba = { latitude: -23.5015, longitude: -47.4526 }
    const saoPaulo = { latitude: -23.5505, longitude: -46.6333 }
    expect(haversineKm(sorocaba, saoPaulo)).toBeGreaterThan(80)
    expect(haversineKm(sorocaba, saoPaulo)).toBeLessThan(90)
  })
  it('é simétrica', () => {
    const a = { latitude: -23.5, longitude: -47.4 }
    const b = { latitude: -23.4, longitude: -47.1 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10)
  })
})

describe('routePlanner — planRoute', () => {
  it('sem paradas ou sem nenhuma coordenada: plano vazio', () => {
    expect(planRoute([])).toEqual({ stops: [], totalKm: 0, unlocated: [] })
    const plan = planRoute([stop('a', null, null)])
    expect(plan.stops).toEqual([])
    expect(plan.unlocated).toHaveLength(1)
  })

  it('uma parada: sequência 1, distância 0', () => {
    const plan = planRoute([stop('a', -23.5, -47.4)])
    expect(plan.stops).toHaveLength(1)
    expect(plan.stops[0]).toMatchObject({ sequence: 1, legKm: 0 })
    expect(plan.totalKm).toBe(0)
  })

  it('começa pela parada de prazo mais próximo e segue pelo vizinho mais próximo', () => {
    // pontos numa linha (longitude crescente): a(0) b(0.1) c(0.5) d(0.2)
    const plan = planRoute([
      stop('c', 0, 0.5, 30),
      stop('a', 0, 0, 5), // mais urgente: começa aqui
      stop('d', 0, 0.2, 40),
      stop('b', 0, 0.1, 50),
    ])
    expect(plan.stops.map((s) => s.donorId)).toEqual(['a', 'b', 'd', 'c'])
    expect(plan.stops.map((s) => s.sequence)).toEqual([1, 2, 3, 4])
    expect(plan.stops[0].legKm).toBe(0)
    // a→b ≈ 11,1 km; b→d ≈ 11,1 km; d→c ≈ 33,4 km
    expect(plan.stops[1].legKm).toBeCloseTo(11.1, 1)
    expect(plan.stops[3].legKm).toBeCloseTo(33.4, 1)
    expect(plan.totalKm).toBeCloseTo(55.6, 1)
  })

  it('sem prazos, começa pela primeira parada informada', () => {
    const plan = planRoute([stop('x', 0, 0), stop('y', 0, 1)])
    expect(plan.stops.map((s) => s.donorId)).toEqual(['x', 'y'])
  })

  it('paradas sem coordenadas ficam fora do mapa e da distância, mas são listadas', () => {
    const plan = planRoute([stop('a', 0, 0, 1), stop('sem', null, null), stop('b', 0, 0.1, 2)])
    expect(plan.stops.map((s) => s.donorId)).toEqual(['a', 'b'])
    expect(plan.unlocated.map((s) => s.donorId)).toEqual(['sem'])
  })

  it('não altera a lista recebida', () => {
    const input = [stop('b', 0, 1, 9), stop('a', 0, 0, 1)]
    const copy = [...input]
    planRoute(input)
    expect(input).toEqual(copy)
  })

  it('o total é a soma dos trechos', () => {
    const plan = planRoute([stop('a', 0, 0, 1), stop('b', 0, 0.1, 2), stop('c', 0, 0.3, 3)])
    expect(plan.totalKm).toBeCloseTo(plan.stops.reduce((s, p) => s + p.legKm, 0), 1)
  })
})

describe('routePlanner — groupByDonor', () => {
  it('várias doações do mesmo doador viram uma parada só', () => {
    const base = { donorId: 'd1', donorName: 'Padaria', address: 'Rua A', city: 'X', latitude: 1, longitude: 2 }
    const groups = groupByDonor([
      { donor: base, donation: { id: '1', description: 'pão', estimatedKg: 2, deadline: null } },
      { donor: { ...base, donorId: 'd2' }, donation: { id: '2', description: 'bolo', estimatedKg: 3, deadline: null } },
      { donor: base, donation: { id: '3', description: 'leite', estimatedKg: 4, deadline: null } },
    ])
    expect(groups).toHaveLength(2)
    expect(groups.find((g) => g.donorId === 'd1')?.donations.map((d) => d.id)).toEqual(['1', '3'])
  })
})

describe('routePlanner — computeLoad', () => {
  it('soma o peso e calcula o que sobra', () => {
    expect(computeLoad([10, 20.5], 100)).toEqual({ totalKg: 30.5, capacityKg: 100, exceeds: false, remainingKg: 69.5 })
  })
  it('excede quando passa da capacidade (igual não excede)', () => {
    expect(computeLoad([60, 50], 100)).toMatchObject({ exceeds: true, remainingKg: -10 })
    expect(computeLoad([100], 100).exceeds).toBe(false)
  })
  it('veículo sem capacidade cadastrada: nunca excede', () => {
    expect(computeLoad([9999], null)).toEqual({ totalKg: 9999, capacityKg: null, exceeds: false, remainingKg: null })
    expect(computeLoad([5], undefined).exceeds).toBe(false)
  })
  it('rota vazia pesa zero', () => {
    expect(computeLoad([], 50)).toMatchObject({ totalKg: 0, exceeds: false })
  })
  it('evita erro de ponto flutuante na soma', () => {
    expect(computeLoad([0.1, 0.2], 10).totalKg).toBe(0.3)
  })
})
