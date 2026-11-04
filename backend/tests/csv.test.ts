import { describe, it, expect } from 'vitest'
import { csvCell, toCsv } from '../src/utils/csv'

describe('utils/csv — csvCell', () => {
  it('texto simples passa como está', () => {
    expect(csvCell('Pães do dia')).toBe('Pães do dia')
  })
  it('nulo e indefinido viram vazio', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(undefined)).toBe('')
  })
  it('número usa vírgula decimal', () => {
    expect(csvCell(12.5)).toBe('12,5')
    expect(csvCell(0)).toBe('0')
    expect(csvCell(-3)).toBe('-3') // número negativo não é fórmula
  })
  it('aspas, ponto e vírgula e quebras de linha são protegidos', () => {
    expect(csvCell('a;b')).toBe('"a;b"')
    expect(csvCell('disse "oi"')).toBe('"disse ""oi"""')
    expect(csvCell('linha1\nlinha2')).toBe('"linha1\nlinha2"')
  })
  it.each(['=SOMA(A1:A9)', '+55 15 9999', '-cmd', '@usuario', '\tTab'])('neutraliza fórmula em texto: %j', (text) => {
    expect(csvCell(text).startsWith("'") || csvCell(text).startsWith('"\'')).toBe(true)
  })
  it('datas saem no fuso de Brasília', () => {
    expect(csvCell(new Date('2026-11-01T15:30:00Z'))).toBe('01/11/2026 12:30')
    // 02:00 UTC ainda é o dia anterior em Brasília
    expect(csvCell(new Date('2026-11-02T02:00:00Z'))).toBe('01/11/2026 23:00')
  })
})

describe('utils/csv — toCsv', () => {
  it('começa com BOM, usa ; e CRLF', () => {
    const csv = toCsv(['Nome', 'Kg'], [['Pão', 1.5], ['Leite', 2]])
    expect(csv).toBe('﻿Nome;Kg\r\nPão;1,5\r\nLeite;2\r\n')
  })
  it('sem linhas: só o cabeçalho', () => {
    expect(toCsv(['A'], [])).toBe('﻿A\r\n')
  })
})
