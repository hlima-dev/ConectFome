import { describe, expect, it } from 'vitest'
import { formatKg } from '../src/utils/format'

describe('formatKg', () => {
  it.each([
    [80.5, '80,5 kg'],
    ['18.50', '18,5 kg'],
    [20, '20 kg'],
    ['20.00', '20 kg'],
    [1234.567, '1.234,57 kg'],
    [0, '0 kg'],
  ])('%j → %s', (input, expected) => {
    expect(formatKg(input as number | string)).toBe(expected)
  })
  it.each([null, undefined, '', 'abc'])('valor ausente ou inválido (%j) vira traço', (input) => {
    expect(formatKg(input as never)).toBe('—')
  })
})
