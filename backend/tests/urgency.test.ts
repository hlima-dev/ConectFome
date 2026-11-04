import { describe, it, expect } from 'vitest'
import { DonationStatus } from '@prisma/client'
import { computeUrgency, withUrgency } from '../src/utils/urgency'

const now = new Date('2026-11-01T12:00:00Z')
const hours = (h: number) => new Date(now.getTime() + h * 3_600_000)
const base = { status: DonationStatus.DISPONIVEL, bestBeforeDate: null, pickupWindowEnd: hours(48) }

describe('utils/urgency — computeUrgency', () => {
  it('prazo distante é NORMAL', () => {
    expect(computeUrgency(base, now)).toMatchObject({ level: 'NORMAL', hoursLeft: 48 })
  })

  it('menos de 24 h até o fim da janela é URGENT', () => {
    expect(computeUrgency({ ...base, pickupWindowEnd: hours(5) }, now)).toMatchObject({ level: 'URGENT', hoursLeft: 5 })
  })

  it('exatamente 24 h ainda não é urgente; 23,9 h é', () => {
    expect(computeUrgency({ ...base, pickupWindowEnd: hours(24) }, now)?.level).toBe('NORMAL')
    expect(computeUrgency({ ...base, pickupWindowEnd: hours(23.9) }, now)?.level).toBe('URGENT')
  })

  it('janela já encerrada é EXPIRED', () => {
    expect(computeUrgency({ ...base, pickupWindowEnd: hours(-2) }, now)).toMatchObject({ level: 'EXPIRED', hoursLeft: -2 })
  })

  it('usa a validade quando ela vence antes da janela (validade vale até o fim do dia)', () => {
    const u = computeUrgency({ ...base, bestBeforeDate: new Date('2026-11-01T00:00:00Z') }, now)
    expect(u?.deadline.toISOString()).toBe('2026-11-01T23:59:59.999Z')
    expect(u?.level).toBe('URGENT')
  })

  it('usa a janela quando ela vence antes da validade', () => {
    const u = computeUrgency({ ...base, pickupWindowEnd: hours(3), bestBeforeDate: new Date('2026-12-31T00:00:00Z') }, now)
    expect(u?.deadline.toISOString()).toBe(hours(3).toISOString())
  })

  it('validade de ontem torna a doação EXPIRED mesmo com a janela aberta', () => {
    expect(computeUrgency({ ...base, bestBeforeDate: new Date('2026-10-30T00:00:00Z') }, now)?.level).toBe('EXPIRED')
  })

  it.each([DonationStatus.COLETADA, DonationStatus.ENTREGUE, DonationStatus.CANCELADA, DonationStatus.VENCIDA])(
    'estado final/coletado (%s) não tem urgência',
    (status) => {
      expect(computeUrgency({ ...base, status }, now)).toBeNull()
    },
  )

  it('RESERVADA e AGENDADA ainda têm urgência', () => {
    expect(computeUrgency({ ...base, status: DonationStatus.RESERVADA, pickupWindowEnd: hours(2) }, now)?.level).toBe('URGENT')
    expect(computeUrgency({ ...base, status: DonationStatus.AGENDADA, pickupWindowEnd: hours(2) }, now)?.level).toBe('URGENT')
  })

  it('withUrgency preserva os campos e acrescenta urgency', () => {
    const d = withUrgency({ ...base, id: 'x' }, now)
    expect(d.id).toBe('x')
    expect(d.urgency?.level).toBe('NORMAL')
  })
})
