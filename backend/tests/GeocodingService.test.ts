import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { GeocodingService, touchesAddress } from '../src/services/GeocodingService'

const mockPrisma = vi.hoisted(() => ({
  donor: { findUnique: vi.fn(), update: vi.fn() },
  recipient: { findUnique: vi.fn(), update: vi.fn() },
}))
vi.mock('../src/config/prisma', () => ({ prisma: mockPrisma }))

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
const address = { address: 'Rua XV de Novembro, 100', city: 'Sorocaba', state: 'SP' }

// relógio falso: sleep apenas avança o tempo
function fakeClock() {
  let t = 1_000_000
  return { now: () => t, sleep: async (ms: number) => { t += ms }, advance: (ms: number) => { t += ms } }
}

describe('GeocodingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  describe('buildQuery', () => {
    const svc = new GeocodingService({ enabled: true })
    it('monta a consulta com logradouro, cidade, estado e país', () => {
      expect(svc.buildQuery(address)).toBe('Rua XV de Novembro, 100, Sorocaba, SP, Brasil')
    })
    it('exige logradouro e cidade, ou um CEP', () => {
      expect(svc.buildQuery({ city: 'Sorocaba' })).toBeNull()
      expect(svc.buildQuery({ address: 'Rua A' })).toBeNull()
      expect(svc.buildQuery({})).toBeNull()
      expect(svc.buildQuery({ zipCode: '18000-000' })).toBe('18000-000, Brasil')
    })
    it('ignora espaços em branco', () => {
      expect(svc.buildQuery({ address: '  ', city: ' ' })).toBeNull()
    })
  })

  describe('geocode', () => {
    it('devolve as coordenadas e envia User-Agent identificado, limit=1 e país', async () => {
      const fetchFn = vi.fn().mockResolvedValue(ok([{ lat: '-23.5015', lon: '-47.4526' }]))
      const svc = new GeocodingService({ enabled: true, fetchFn, minIntervalMs: 0, userAgent: 'App/1.0' })

      expect(await svc.geocode(address)).toEqual({ latitude: -23.5015, longitude: -47.4526 })

      const [url, init] = fetchFn.mock.calls[0]
      const params = new URL(url).searchParams
      expect(params.get('q')).toBe('Rua XV de Novembro, 100, Sorocaba, SP, Brasil')
      expect(params.get('limit')).toBe('1')
      expect(params.get('countrycodes')).toBe('br')
      expect(init.headers['User-Agent']).toBe('App/1.0')
    })

    it('desligada: não consulta nada', async () => {
      const fetchFn = vi.fn()
      const svc = new GeocodingService({ enabled: false, fetchFn })
      expect(await svc.geocode(address)).toBeNull()
      expect(fetchFn).not.toHaveBeenCalled()
    })

    it('endereço incompleto: não consulta', async () => {
      const fetchFn = vi.fn()
      const svc = new GeocodingService({ enabled: true, fetchFn })
      expect(await svc.geocode({ city: 'Sorocaba' })).toBeNull()
      expect(fetchFn).not.toHaveBeenCalled()
    })

    it('acerto fica em cache (sem diferenciar maiúsculas)', async () => {
      const fetchFn = vi.fn().mockResolvedValue(ok([{ lat: '-23.5', lon: '-47.4' }]))
      const svc = new GeocodingService({ enabled: true, fetchFn, minIntervalMs: 0 })
      await svc.geocode(address)
      await svc.geocode({ ...address, city: 'SOROCABA' })
      expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    it('falha é lembrada por um tempo e depois tenta de novo', async () => {
      const clock = fakeClock()
      const fetchFn = vi.fn().mockResolvedValue(ok([]))
      const svc = new GeocodingService({ enabled: true, fetchFn, minIntervalMs: 0, ...clock })

      expect(await svc.geocode(address)).toBeNull()
      expect(await svc.geocode(address)).toBeNull()
      expect(fetchFn).toHaveBeenCalledTimes(1)

      clock.advance(61 * 60 * 1000)
      await svc.geocode(address)
      expect(fetchFn).toHaveBeenCalledTimes(2)
    })

    it.each([
      ['resposta vazia', ok([])],
      ['coordenada não numérica', ok([{ lat: 'x', lon: '1' }])],
      ['latitude fora do intervalo', ok([{ lat: '95', lon: '1' }])],
      ['longitude fora do intervalo', ok([{ lat: '1', lon: '200' }])],
      ['corpo que não é lista', ok({ error: 'x' })],
      ['HTTP 429', { ok: false, status: 429, json: async () => ({}) }],
      ['HTTP 500', { ok: false, status: 500, json: async () => ({}) }],
    ])('%s resulta em null, sem lançar erro', async (_nome, response) => {
      const svc = new GeocodingService({ enabled: true, fetchFn: vi.fn().mockResolvedValue(response), minIntervalMs: 0 })
      expect(await svc.geocode(address)).toBeNull()
    })

    it('erro de rede resulta em null, sem lançar erro', async () => {
      const svc = new GeocodingService({ enabled: true, fetchFn: vi.fn().mockRejectedValue(new Error('ECONNRESET')), minIntervalMs: 0 })
      expect(await svc.geocode(address)).toBeNull()
    })

    it('estouro de tempo aborta a requisição e resulta em null', async () => {
      const fetchFn = vi.fn((_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
      )
      const svc = new GeocodingService({ enabled: true, fetchFn: fetchFn as never, minIntervalMs: 0, timeoutMs: 20 })
      expect(await svc.geocode(address)).toBeNull()
    })

    it('respeita 1 requisição por vez e o intervalo mínimo entre elas', async () => {
      const clock = fakeClock()
      const stamps: number[] = []
      const fetchFn = vi.fn(async () => {
        stamps.push(clock.now())
        return ok([{ lat: '-23', lon: '-47' }])
      })
      const svc = new GeocodingService({ enabled: true, fetchFn: fetchFn as never, minIntervalMs: 1100, ...clock })

      await Promise.all([
        svc.geocode({ address: 'Rua A', city: 'X' }),
        svc.geocode({ address: 'Rua B', city: 'X' }),
        svc.geocode({ address: 'Rua C', city: 'X' }),
      ])

      expect(stamps).toHaveLength(3)
      expect(stamps[1] - stamps[0]).toBeGreaterThanOrEqual(1100)
      expect(stamps[2] - stamps[1]).toBeGreaterThanOrEqual(1100)
    })

    it('uma requisição que falha não trava a fila', async () => {
      const fetchFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(ok([{ lat: '-23', lon: '-47' }]))
      const svc = new GeocodingService({ enabled: true, fetchFn, minIntervalMs: 0 })
      const [a, b] = await Promise.all([svc.geocode({ address: 'A', city: 'X' }), svc.geocode({ address: 'B', city: 'X' })])
      expect(a).toBeNull()
      expect(b).toEqual({ latitude: -23, longitude: -47 })
    })
  })

  describe('com um servidor HTTP de verdade (fetch real)', () => {
    let server: http.Server
    let seen: { url?: string; userAgent?: string }
    let respond: () => string

    beforeEach(async () => {
      seen = {}
      respond = () => JSON.stringify([{ lat: '-23.5015', lon: '-47.4526', display_name: 'Sorocaba' }])
      server = http.createServer((req, res) => {
        seen = { url: req.url, userAgent: req.headers['user-agent'] }
        res.setHeader('content-type', 'application/json')
        res.end(respond())
      })
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    })
    afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())))

    const url = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}/search`

    it('faz a chamada HTTP, envia o User-Agent e lê as coordenadas', async () => {
      const svc = new GeocodingService({ enabled: true, url: url(), minIntervalMs: 0, userAgent: 'ConectaFome-test/1.0' })
      expect(await svc.geocode(address)).toEqual({ latitude: -23.5015, longitude: -47.4526 })
      expect(seen.userAgent).toBe('ConectaFome-test/1.0')
      expect(seen.url).toContain('format=jsonv2')
      expect(new URL(seen.url!, 'http://x').searchParams.get('q')).toBe('Rua XV de Novembro, 100, Sorocaba, SP, Brasil')
    })

    it('JSON inválido do servidor resulta em null', async () => {
      respond = () => '<html>erro</html>'
      const svc = new GeocodingService({ enabled: true, url: url(), minIntervalMs: 0 })
      expect(await svc.geocode(address)).toBeNull()
    })
  })

  describe('geocodeStoredProfile', () => {
    const coords = { latitude: -23.5, longitude: -47.4 }

    it('grava as coordenadas do doador', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd1', ...address })
      const svc = new GeocodingService({ enabled: true, minIntervalMs: 0, fetchFn: vi.fn().mockResolvedValue(ok([{ lat: '-23.5', lon: '-47.4' }])) })
      await svc.geocodeStoredProfile('donor', 'd1')
      expect(mockPrisma.donor.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: coords })
    })

    it('grava as coordenadas do receptor', async () => {
      mockPrisma.recipient.findUnique.mockResolvedValue({ id: 'r1', ...address })
      const svc = new GeocodingService({ enabled: true, minIntervalMs: 0, fetchFn: vi.fn().mockResolvedValue(ok([{ lat: '-23.5', lon: '-47.4' }])) })
      await svc.geocodeStoredProfile('recipient', 'r1')
      expect(mockPrisma.recipient.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: coords })
    })

    it('sem resultado, não altera o cadastro', async () => {
      mockPrisma.donor.findUnique.mockResolvedValue({ id: 'd1', ...address })
      const svc = new GeocodingService({ enabled: true, minIntervalMs: 0, fetchFn: vi.fn().mockResolvedValue(ok([])) })
      await svc.geocodeStoredProfile('donor', 'd1')
      expect(mockPrisma.donor.update).not.toHaveBeenCalled()
    })

    it('cadastro que sumiu ou erro de banco não propagam exceção', async () => {
      const svc = new GeocodingService({ enabled: true, minIntervalMs: 0, fetchFn: vi.fn() })
      mockPrisma.donor.findUnique.mockResolvedValue(null)
      await expect(svc.geocodeStoredProfile('donor', 'x')).resolves.toBeUndefined()
      mockPrisma.donor.findUnique.mockRejectedValue(new Error('db'))
      await expect(svc.geocodeStoredProfile('donor', 'x')).resolves.toBeUndefined()
    })
  })

  describe('touchesAddress', () => {
    it('detecta alteração de qualquer campo de endereço', () => {
      expect(touchesAddress({ address: 'x' })).toBe(true)
      expect(touchesAddress({ city: 'x' })).toBe(true)
      expect(touchesAddress({ state: 'x' })).toBe(true)
      expect(touchesAddress({ zipCode: 'x' })).toBe(true)
      expect(touchesAddress({})).toBe(false)
      expect(touchesAddress({ address: undefined })).toBe(false)
    })
  })
})
