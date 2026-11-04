// CSV para abrir direto no Excel em português: separador ";", decimal com
// vírgula e BOM UTF-8 (sem ele os acentos quebram). Escapa aspas e quebras de
// linha (RFC 4180) e neutraliza "injeção de fórmula": um texto que começa com
// = + - @ vira texto literal, para uma descrição maliciosa digitada por um
// doador não ser executada como fórmula na planilha de quem exporta.
const SEPARATOR = ';'
// Marca de ordem de bytes UTF-8: faz o Excel reconhecer os acentos.
const BOM = '\uFEFF'
const FORMULA_START = /^[=+\-@\t\r]/

export type CsvCell = string | number | Date | null | undefined

const TIME_ZONE = 'America/Sao_Paulo'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .replace(',', '')
}

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return ''

  let text: string
  if (value instanceof Date) text = formatDate(value)
  else if (typeof value === 'number') text = String(value).replace('.', ',')
  else text = value

  // Número negativo é número, não fórmula; só protege texto.
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`

  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: CsvCell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(SEPARATOR))
  return `${BOM}${lines.join('\r\n')}\r\n`
}
