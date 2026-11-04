import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { RoutePlanPanel } from '../src/components/RoutePlanPanel'
import type { RoutePlan, VehicleLoad } from '../src/types/logistics'

// O mapa usa Leaflet (precisa de layout real de navegador); aqui só interessa o painel.
vi.mock('../src/components/RouteMap', () => ({ RouteMap: () => <div data-testid="route-map" /> }))

const stop = (over: Record<string, unknown> = {}) => ({
  donorId: 'd1',
  donorName: 'Padaria Central',
  address: 'Rua XV, 100',
  city: 'Sorocaba',
  latitude: -23.5,
  longitude: -47.45,
  sequence: 1,
  legKm: 0,
  donations: [{ id: 'x', description: 'Pães', estimatedKg: 10, deadline: null }],
  ...over,
})

const plan = (over: Partial<RoutePlan> = {}): RoutePlan => ({
  stops: [stop(), stop({ donorId: 'd2', donorName: 'Mercado Sul', sequence: 2, legKm: 12.34, donations: [{ id: 'y', description: 'Frutas', estimatedKg: 5.5, deadline: null }] })],
  totalKm: 12.3,
  unlocated: [],
  recipients: [{ id: 'r1', name: 'ONG Mesa', address: 'Rua O', latitude: -23.4, longitude: -47.3 }],
  ...over,
})
const load = (over: Partial<VehicleLoad> = {}): VehicleLoad => ({ totalKg: 15.5, capacityKg: 100, exceeds: false, remainingKg: 84.5, ...over })

describe('RoutePlanPanel', () => {
  it('lista as paradas na ordem, com doações, trecho em km e o total', () => {
    render(<RoutePlanPanel plan={plan()} load={load()} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('Padaria Central')).toBeInTheDocument()
    expect(within(items[0]).getByText(/Rua XV, 100 · Sorocaba/)).toBeInTheDocument()
    expect(within(items[0]).queryByText(/km$/)).not.toBeInTheDocument() // primeira parada não tem trecho
    expect(within(items[1]).getByText('+12,34 km')).toBeInTheDocument()
    expect(within(items[1]).getByText(/Frutas \(5,5 kg\)/)).toBeInTheDocument()
    expect(screen.getByText(/≈ 12,3 km em linha reta/)).toBeInTheDocument()
    expect(screen.getByTestId('route-map')).toBeInTheDocument()
  })

  it('mostra a carga contra a capacidade e quanto ainda cabe', () => {
    render(<RoutePlanPanel plan={plan()} load={load()} />)
    expect(screen.getByText(/Carga estimada:/)).toHaveTextContent('15,5 kg de 100 kg')
    expect(screen.getByText(/cabem mais 84,5 kg/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Carga do veículo' })).toHaveAttribute('aria-valuenow', '15.5')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('avisa quando o peso passa da capacidade e diz quanto', () => {
    render(<RoutePlanPanel plan={plan()} load={load({ totalKg: 130, exceeds: true, remainingKg: -30 })} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/passa da capacidade do veículo em 30 kg/i)
    expect(screen.getByRole('alert')).toHaveTextContent(/não poderá ser iniciada/i)
  })

  it('veículo sem capacidade cadastrada: não há barra nem alerta', () => {
    render(<RoutePlanPanel plan={plan()} load={load({ capacityKg: null, remainingKg: null })} />)
    expect(screen.getByText(/veículo sem capacidade cadastrada/i)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('doadores sem coordenadas são listados à parte com a explicação', () => {
    render(
      <RoutePlanPanel
        plan={plan({
          unlocated: [{ donorId: 'd9', donorName: 'Feira Livre', address: 'Rua sem número', city: null, latitude: null, longitude: null, donations: [] }],
        })}
        load={load()}
      />,
    )
    expect(screen.getByText(/Sem coordenadas \(1\)/)).toBeInTheDocument()
    expect(screen.getByText(/Feira Livre — Rua sem número/)).toBeInTheDocument()
  })

  it('sem nenhuma parada com coordenadas, explica que não há mapa', () => {
    render(
      <RoutePlanPanel
        plan={{ stops: [], totalKm: 0, recipients: [], unlocated: [{ donorId: 'd9', donorName: 'X', address: null, city: null, latitude: null, longitude: null, donations: [] }] }}
        load={load()}
      />,
    )
    expect(screen.getByText(/nenhuma parada tem coordenadas/i)).toBeInTheDocument()
    expect(screen.queryByTestId('route-map')).not.toBeInTheDocument()
  })

  it('rota vazia convida a anexar doações', () => {
    render(<RoutePlanPanel plan={{ stops: [], totalKm: 0, unlocated: [], recipients: [] }} load={load({ totalKg: 0, remainingKg: 100 })} />)
    expect(screen.getByText(/anexe doações para ver as paradas/i)).toBeInTheDocument()
  })
})
