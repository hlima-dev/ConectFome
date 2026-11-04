import { prisma } from '../config/prisma'
import { env } from '../config/env'

export interface GeocodeQuery {
  address?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
}

export interface Coordinates {
  latitude: number
  longitude: number
}

type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
}>

interface GeocodingOptions {
  enabled: boolean
  url: string
  userAgent: string
  fetchFn: FetchLike
  // Intervalo mínimo entre requisições (a política do Nominatim é 1 por segundo).
  minIntervalMs: number
  timeoutMs: number
  now: () => number
  sleep: (ms: number) => Promise<void>
}

const CACHE_MAX_ENTRIES = 1000
const NEGATIVE_TTL_MS = 60 * 60 * 1000

const defaultOptions = (): GeocodingOptions => ({
  enabled: env.GEOCODING_ENABLED,
  url: env.GEOCODING_URL,
  userAgent: env.GEOCODING_USER_AGENT,
  fetchFn: fetch as unknown as FetchLike,
  minIntervalMs: 1100,
  timeoutMs: 5000,
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
})

// Converte endereço em coordenadas. Tudo aqui é "melhor esforço": nunca lança
// para quem chamou — endereço incompleto, serviço fora do ar ou resposta
// estranha resultam em `null` e o cadastro segue sem coordenadas.
export class GeocodingService {
  private opts: GeocodingOptions
  private cache = new Map<string, { value: Coordinates | null; expiresAt: number }>()
  private lastRequestAt = 0
  // Fila: garante uma requisição por vez e o intervalo mínimo entre elas.
  private queue: Promise<unknown> = Promise.resolve()

  constructor(overrides: Partial<GeocodingOptions> = {}) {
    this.opts = { ...defaultOptions(), ...overrides }
  }

  // Precisa de logradouro e cidade (ou de um CEP) para não geocodificar "São Paulo" inteira.
  buildQuery(q: GeocodeQuery): string | null {
    const address = q.address?.trim()
    const city = q.city?.trim()
    const zip = q.zipCode?.trim()
    if (!(address && city) && !zip) return null
    return [address, city, q.state?.trim(), zip, 'Brasil'].filter(Boolean).join(', ')
  }

  async geocode(q: GeocodeQuery): Promise<Coordinates | null> {
    if (!this.opts.enabled) return null
    const query = this.buildQuery(q)
    if (!query) return null

    const key = query.toLowerCase()
    const cached = this.cache.get(key)
    if (cached && cached.expiresAt > this.opts.now()) return cached.value

    const value = await this.enqueue(() => this.request(query))
    this.remember(key, value)
    return value
  }

  private remember(key: string, value: Coordinates | null) {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value
      if (oldest !== undefined) this.cache.delete(oldest)
    }
    // Acertos valem até reiniciar o processo (endereço não muda de lugar);
    // falhas expiram, pois podem ser instabilidade do serviço.
    this.cache.set(key, { value, expiresAt: value ? Infinity : this.opts.now() + NEGATIVE_TTL_MS })
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const wait = this.lastRequestAt + this.opts.minIntervalMs - this.opts.now()
      if (wait > 0) await this.opts.sleep(wait)
      this.lastRequestAt = this.opts.now()
      return task()
    })
    this.queue = run.catch(() => undefined)
    return run
  }

  private async request(query: string): Promise<Coordinates | null> {
    const url = `${this.opts.url}?${new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', countrycodes: 'br' })}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.opts.timeoutMs)

    try {
      const response = await this.opts.fetchFn(url, {
        headers: { 'User-Agent': this.opts.userAgent, Accept: 'application/json' },
        signal: controller.signal,
      })
      if (!response.ok) {
        console.warn(`Geocodificação respondeu ${response.status}`)
        return null
      }
      return parseNominatim(await response.json())
    } catch (error) {
      console.warn('Falha na geocodificação:', error instanceof Error ? error.message : error)
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  // Geocodifica o cadastro e grava as coordenadas. Chamado SEM await depois de
  // salvar o cadastro, para a resposta ao usuário não esperar o serviço externo.
  async geocodeStoredProfile(kind: 'donor' | 'recipient', id: string): Promise<void> {
    try {
      const profile =
        kind === 'donor'
          ? await prisma.donor.findUnique({ where: { id } })
          : await prisma.recipient.findUnique({ where: { id } })
      if (!profile) return

      const coordinates = await this.geocode(profile)
      if (!coordinates) return

      const data = { latitude: coordinates.latitude, longitude: coordinates.longitude }
      if (kind === 'donor') await prisma.donor.update({ where: { id }, data })
      else await prisma.recipient.update({ where: { id }, data })
    } catch (error) {
      console.warn('Falha ao gravar coordenadas de', kind, id, error)
    }
  }
}

function parseNominatim(body: unknown): Coordinates | null {
  if (!Array.isArray(body) || body.length === 0) return null
  const first = body[0] as { lat?: unknown; lon?: unknown }
  const latitude = Number(first.lat)
  const longitude = Number(first.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  return { latitude, longitude }
}

// Instância compartilhada pelos services de cadastro.
export const geocoder = new GeocodingService()

const ADDRESS_FIELDS = ['address', 'city', 'state', 'zipCode'] as const

export function touchesAddress(input: Partial<Record<(typeof ADDRESS_FIELDS)[number], unknown>>): boolean {
  return ADDRESS_FIELDS.some((field) => input[field] !== undefined)
}
