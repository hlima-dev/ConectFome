import { describe, expect, it } from 'vitest'
import { formatTimeLeft } from '../src/utils/time'

describe('formatTimeLeft', () => {
  it.each([
    [0.2, 'menos de 1 h'],
    [1, '1 h'],
    [5.9, '5 h'],
    [23.9, '23 h'],
    [24, '1 dia'],
    [47, '1 dia'],
    [72, '3 dias'],
  ])('%s h → %s', (hours, expected) => {
    expect(formatTimeLeft(hours)).toBe(expected)
  })
})
