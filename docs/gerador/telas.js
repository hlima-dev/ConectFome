// Catálogo de telas: junta os prints de docs/telas/ (gerados por
// scripts/capturar-telas.cjs) em um documento, uma tela por página.
const L = require('./lib')
const {
  fs, path, Document, Packer, Paragraph, TextRun, AlignmentType, P, PN, H1, H2, table, styles, numbering, footer, PAGE, FONT, GREEN, GRAY, DARK,
} = L

const dir = path.join(__dirname, '..', 'telas')
const catalog = JSON.parse(fs.readFileSync(path.join(dir, 'catalogo.json'), 'utf8'))

function size(file) {
  const b = fs.readFileSync(path.join(dir, file))
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

// cabe em 560 x 780 px (área útil da página A4 com margens ABNT), sem ampliar
function fit(w, h, maxW = 560, maxH = 780) {
  const k = Math.min(1, maxW / w, maxH / h)
  return [Math.round(w * k), Math.round(h * k)]
}

const groups = [...new Set(catalog.map((c) => c.group))]
const groupLabel = {
  Publicas: 'Páginas públicas', Doador: 'Perfil do doador', Receptor: 'Perfil do receptor', Administrador: 'Perfil do administrador', Celular: 'Versão para celular',
}

const cover = [
  new Paragraph({ spacing: { before: 2400, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ConectaFome', font: FONT, size: 64, bold: true, color: GREEN })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: 'Catálogo de telas do sistema', font: FONT, size: 32, color: DARK })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: L.runs(`${catalog.length} telas capturadas com o sistema em funcionamento`, { size: 24, color: GRAY }) }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: L.runs('UPX2 · Centro Universitário Facens · 2026', { size: 22, color: GRAY }) }),
  P('Cada tela foi capturada por um roteiro automatizado que percorre o fluxo completo (cadastro, oferta, reserva, rota, coleta, confirmação, comprovante e relatórios) com os perfis de doador, receptor e administrador, e confere o resultado de cada passo. Os dados são de demonstração. No mapa da rota, o fundo cinza se deve ao ambiente de captura não ter acesso à internet: em uso normal o mapa exibe as ruas do OpenStreetMap.', { indent: false, size: 22 }),
]

const index = [
  new Paragraph({ pageBreakBefore: true, spacing: { after: 200 }, children: [new TextRun({ text: 'ÍNDICE', font: FONT, size: 28, bold: true, color: GREEN })] }),
  table(
    ['Nº', 'Perfil', 'Tela'],
    catalog.map((c) => [String(c.n), groupLabel[c.group] ?? c.group, c.title]),
    [700, 2900, 5471],
    { size: 18 },
  ),
]

const pages = []
for (const g of groups) {
  let first = true
  for (const c of catalog.filter((x) => x.group === g)) {
    const [w, h] = size(c.file)
    const [fw, fh] = fit(w, h, c.mobile ? 300 : 560, c.mobile ? 720 : 740)
    pages.push(
      new Paragraph({
        pageBreakBefore: true,
        spacing: { after: 60 },
        children: [new TextRun({ text: `${groupLabel[g] ?? g}`, font: FONT, size: 20, color: GRAY, allCaps: true })],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: `${c.n}. ${c.title}`, font: FONT, size: 28, bold: true, color: GREEN })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new L.ImageRun({
            type: 'png',
            data: fs.readFileSync(path.join(dir, c.file)),
            transformation: { width: fw, height: fh },
          }),
        ],
      }),
    )
    first = false
  }
}

const doc = new Document({
  creator: 'Equipe ConectaFome',
  title: 'ConectaFome – Catálogo de telas',
  styles,
  numbering,
  sections: [{ properties: { page: PAGE }, footers: { default: footer('ConectaFome · Catálogo de telas') }, children: [...cover, ...index, ...pages] }],
})

Packer.toBuffer(doc).then((b) => {
  const out = path.join(__dirname, '..', 'TELAS_CONECTAFOME.docx')
  fs.writeFileSync(out, b)
  console.log('ok', out, b.length)
})
