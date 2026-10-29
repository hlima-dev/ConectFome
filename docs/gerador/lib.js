// Helpers compartilhados pelos geradores de DOCX (documentação e artigo).
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, ImageRun, PageBreak, Footer, Header, PageNumber,
  LevelFormat, TableOfContents, VerticalAlign,
} = require('docx')

const FONT = 'Arial'
const GREEN = '1B7F5C'
const DARK = '1F2933'
const GRAY = '6B7280'
const LIGHT = 'E7F4EE'
const FIG = path.join(__dirname, '..', 'figuras')

// A4, margens ABNT (esq/sup 3 cm, dir/inf 2 cm)
const PAGE = {
  size: { width: 11906, height: 16838 },
  margin: { top: 1701, left: 1701, right: 1134, bottom: 1134 },
}
const CONTENT_W = 11906 - 1701 - 1134 // 9071

// **negrito** e _itálico_ inline
function runs(text, base = {}) {
  const out = []
  const re = /(\*\*[^*]+\*\*|__[^_]+__)/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ font: FONT, ...base, text: text.slice(last, m.index) }))
    const tok = m[0]
    if (tok.startsWith('**')) out.push(new TextRun({ font: FONT, ...base, text: tok.slice(2, -2), bold: true }))
    else out.push(new TextRun({ font: FONT, ...base, text: tok.slice(2, -2), italics: true }))
    last = m.index + tok.length
  }
  if (last < text.length) out.push(new TextRun({ font: FONT, ...base, text: text.slice(last) }))
  return out
}

const P = (text, o = {}) =>
  new Paragraph({
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    spacing: { line: o.line ?? 360, after: o.after ?? 120, before: o.before ?? 0 },
    indent: o.indent === false ? undefined : o.indent ?? { firstLine: 709 },
    keepNext: o.keepNext,
    children: runs(text, { size: o.size ?? 24, color: o.color, bold: o.bold }),
  })

// parágrafo sem recuo de primeira linha (usado após títulos de tabela, notas)
const PN = (text, o = {}) => P(text, { indent: false, ...o })

const headings = []
const H1 = (text) => (headings.push({ level: 1, text }), new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text, font: FONT })] }))
const H2 = (text) => (headings.push({ level: 2, text }), new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text, font: FONT })] }))
const H3 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: FONT })] })

const bullet = (text, o = {}) =>
  new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: o.line ?? 320, after: 60 },
    children: runs(text, { size: o.size ?? 24 }),
  })

const pageBreak = () => new Paragraph({ children: [new PageBreak()] })

const caption = (text) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 240 },
    children: runs(text, { size: 20, color: GRAY }),
  })

const border = { style: BorderStyle.SINGLE, size: 4, color: 'C9D1D9' }
const borders = { top: border, bottom: border, left: border, right: border }

function cell(text, width, o = {}) {
  const paras = (Array.isArray(text) ? text : [text]).map(
    (t) =>
      new Paragraph({
        alignment: o.align ?? AlignmentType.LEFT,
        spacing: { line: 276, after: 40 },
        children: runs(String(t), { size: o.size ?? 20, bold: o.bold, color: o.color }),
      }),
  )
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    verticalAlign: o.valign ?? VerticalAlign.TOP,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    columnSpan: o.span,
    children: paras,
  })
}

// tabela com cabeçalho verde. widths somam CONTENT_W (9071).
function table(headers, rows, widths, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0)
  const head = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) => cell(h, widths[i], { fill: GREEN, bold: true, color: 'FFFFFF', size: o.size })),
  })
  const body = rows.map(
    (r, ri) =>
      new TableRow({
        cantSplit: true,
        children: r.map((c, i) =>
          cell(c, widths[i], { fill: o.firstColFill && i === 0 ? LIGHT : ri % 2 ? 'F7F9FA' : undefined, bold: o.firstColFill && i === 0, size: o.size }),
        ),
      }),
  )
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] })
}

// tabela chave/valor (sem cabeçalho)
function kv(rows, widths = [2400, 6671]) {
  return new Table({
    width: { size: widths[0] + widths[1], type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(
      ([k, v]) =>
        new TableRow({ cantSplit: true, children: [cell(k, widths[0], { fill: LIGHT, bold: true }), cell(v, widths[1])] }),
    ),
  })
}

function img(file, widthPx, heightPx) {
  const data = fs.readFileSync(path.join(FIG, file))
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 60 },
    keepNext: true,
    children: [new ImageRun({ type: 'png', data, transformation: { width: widthPx, height: heightPx } })],
  })
}

const spacer = (after = 120) => new Paragraph({ spacing: { after }, children: [] })

const styles = {
  default: { document: { run: { font: FONT, size: 24 } } },
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 30, bold: true, font: FONT, color: GREEN, allCaps: true },
      paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0, keepNext: true } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 26, bold: true, font: FONT, color: DARK },
      paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1, keepNext: true } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { size: 24, bold: true, italics: true, font: FONT, color: DARK },
      paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2, keepNext: true } },
  ],
}

const numbering = {
  config: [
    { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ],
}

function footer(label) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `${label}  ·  `, size: 18, color: GRAY, font: FONT }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GRAY, font: FONT }),
        ],
      }),
    ],
  })
}

module.exports = {
  headings,
  fs, path, Document, Packer, Paragraph, TextRun, AlignmentType, TableOfContents, Footer, Header,
  P, PN, H1, H2, H3, bullet, pageBreak, caption, table, kv, img, spacer, runs, cell,
  styles, numbering, footer, PAGE, CONTENT_W, FONT, GREEN, DARK, GRAY, LIGHT, WidthType, Table, TableRow, TableCell,
}
