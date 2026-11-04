// Percorre o sistema como cada perfil e salva um print de cada tela em
// docs/telas/. Também funciona como teste ponta a ponta do fluxo completo:
// cada passo confere o resultado e o roteiro falha se algo não acontecer.
//
// Pré-requisitos: backend em :3333 e frontend em :5173, com o banco recém
// criado e semeado (cd backend && npx prisma migrate reset --force),
// GEOCODING_ENABLED=false, RATE_LIMIT_MAX=100000 e AUTH_RATE_LIMIT_MAX=1000 no ambiente do backend (os limites
// padrão de requisições por IP estouram durante a captura) e Playwright instalado
// (NODE_PATH=$(npm root -g) node scripts/capturar-telas.cjs).
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const OUT = path.join(__dirname, '..', 'docs', 'telas')
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

const catalog = []
let n = 0
const pad = (v) => String(v).padStart(2, '0')
const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

async function shot(page, group, title, opts = {}) {
  await page.waitForTimeout(opts.wait ?? 700)
  n += 1
  const file = `${pad(n)}-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`
  await page.screenshot({ path: path.join(OUT, file), fullPage: opts.full ?? false })
  catalog.push({ n, file, group, title, mobile: !!opts.mobile })
  console.log(`  ${pad(n)} ${group} · ${title}`)
}

async function expectText(page, text, timeout = 8000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout })
}

async function login(page, email, password = 'Conect@123') {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', password)
  await page.click('button[type=submit]')
  await page.waitForURL(`${BASE}/`)
}

async function logout(page) {
  await page.getByRole('button', { name: /sair/i }).click()
  await page.waitForURL(/\/(login|inicio)/)
}

;(async () => {
  const browser = await chromium.launch()
  const errors = []
  const newPage = async (width = 1280, height = 800, storageState) => {
    const ctx = await browser.newContext({ viewport: { width, height }, locale: 'pt-BR', storageState })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
    page.on('console', (m) => {
      // os mosaicos do mapa vêm do OpenStreetMap; sem internet falham e não são erro do sistema
      if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|Failed to load resource/.test(m.text())) errors.push(m.text())
    })
    return page
  }

  // ───────────── páginas públicas ─────────────
  console.log('Públicas')
  const anon = await newPage()
  await anon.goto(`${BASE}/inicio`)
  await shot(anon, 'Publicas', 'Pagina inicial', { full: true })
  await anon.goto(`${BASE}/login`)
  await shot(anon, 'Publicas', 'Login')
  await anon.fill('input[type=email]', 'mercado@conectfome.org')
  await anon.fill('input[type=password]', 'senha-errada')
  await anon.click('button[type=submit]')
  await expectText(anon, 'inválid')
  await shot(anon, 'Publicas', 'Login com credenciais invalidas')
  await anon.goto(`${BASE}/cadastro`)
  await shot(anon, 'Publicas', 'Cadastro de doador', { full: true })
  await anon.getByText('Receptor (ONG, família)').click()
  await shot(anon, 'Publicas', 'Cadastro de receptor', { full: true })

  // ───────────── cadastro real de um doador novo (RF01) ─────────────
  console.log('Cadastro')
  await anon.getByText('Doador (mercado, restaurante, feira)').click()
  await anon.fill('#name', 'Carla Nunes')
  await anon.fill('#email', 'padaria.nova@teste.org')
  await anon.fill('#password', 'Senha1234')
  await anon.fill('#donorName', 'Padaria Nova Esperança')
  await anon.fill('#donorAddress', 'Rua XV de Novembro, 250')
  await anon.fill('#donorCity', 'Sorocaba')
  await anon.fill('#donorState', 'SP')
  await shot(anon, 'Publicas', 'Cadastro de doador preenchido', { full: true })
  await anon.getByRole('button', { name: /cadastrar/i }).click()
  await anon.waitForURL(`${BASE}/`)
  await expectText(anon, 'Painel')
  await shot(anon, 'Doador', 'Painel do doador recem cadastrado')
  await logout(anon)

  // ───────────── doador ─────────────
  console.log('Doador')
  const donor = await newPage()
  await login(donor, 'mercado@conectfome.org')
  await shot(donor, 'Doador', 'Painel')
  await donor.goto(`${BASE}/doacoes`)
  await shot(donor, 'Doador', 'Minhas doacoes')
  await donor.getByRole('button', { name: /nova doação/i }).click()
  await donor.getByLabel('Descrição').fill('Leite integral (lote urgente)')
  await donor.getByLabel('Quantidade estimada (kg)').fill('20')
  await donor.getByLabel('Categoria').selectOption('PERECIVEL')
  await donor.getByLabel('Coleta a partir de').fill(local(new Date()))
  await donor.getByLabel('Coleta até').fill(local(new Date(Date.now() + 5 * 3600e3)))
  await donor.getByRole('button', { name: /salvar/i }).click()
  await expectText(donor, 'Informe como o alimento fica armazenado')
  await shot(donor, 'Doador', 'Nova doacao com validacoes')
  await donor.getByLabel(/armazenamento até a coleta/i).selectOption('REFRIGERADO')
  await donor.getByLabel(/declaro que este alimento/i).check()
  await shot(donor, 'Doador', 'Nova doacao preenchida')
  await donor.getByRole('button', { name: /salvar/i }).click()
  await expectText(donor, 'Leite integral (lote urgente)')
  await shot(donor, 'Doador', 'Lista apos cadastrar a doacao')
  await donor.getByText('Leite integral (lote urgente)').first().click()
  await expectText(donor, 'Histórico')
  await shot(donor, 'Doador', 'Detalhe da doacao com historico', { full: true })

  // ───────────── receptor ─────────────
  console.log('Receptor')
  const ong = await newPage()
  await login(ong, 'ong@conectfome.org')
  await shot(ong, 'Receptor', 'Painel')
  await ong.getByRole('button', { name: /notificações/i }).click()
  await expectText(ong, 'Nova doação disponível')
  await shot(ong, 'Receptor', 'Notificacoes (sino)')
  await ong.keyboard.press('Escape')
  await ong.goto(`${BASE}/oportunidades`)
  await expectText(ong, 'Urgente')
  await shot(ong, 'Receptor', 'Painel de oportunidades', { full: true })
  await ong.locator('li', { hasText: 'Leite integral (lote urgente)' }).getByRole('button', { name: 'Reservar' }).click()
  await shot(ong, 'Receptor', 'Confirmar reserva')
  await ong.getByRole('dialog').getByRole('button', { name: 'Reservar' }).click()
  await expectText(ong, 'foi reservada para você')
  await shot(ong, 'Receptor', 'Reserva concluida')
  await ong.goto(`${BASE}/doacoes`)
  await shot(ong, 'Receptor', 'Minhas doacoes')
  await ong.getByText('Leite integral (lote urgente)').first().click()
  await expectText(ong, 'Liberar reserva')
  await shot(ong, 'Receptor', 'Detalhe da doacao reservada', { full: true })

  // ───────────── administrador ─────────────
  console.log('Administrador')
  const admin = await newPage(1280, 800)
  await login(admin, 'admin@conectfome.org')
  await shot(admin, 'Administrador', 'Dashboard', { full: true, wait: 1500 })
  await admin.goto(`${BASE}/doadores`)
  await shot(admin, 'Administrador', 'Doadores')
  await admin.getByRole('button', { name: /editar/i }).first().click().catch(() => {})
  if (await admin.getByRole('dialog').count()) await shot(admin, 'Administrador', 'Cadastro de doador (edicao com endereco)')
  await admin.keyboard.press('Escape')
  await admin.goto(`${BASE}/receptores`)
  await shot(admin, 'Administrador', 'Receptores')
  await admin.goto(`${BASE}/voluntarios`)
  await shot(admin, 'Administrador', 'Voluntarios')
  await admin.goto(`${BASE}/veiculos`)
  await shot(admin, 'Administrador', 'Veiculos')
  await admin.goto(`${BASE}/doacoes`)
  await shot(admin, 'Administrador', 'Doacoes (todas, com urgencia)', { full: true })

  // casa a doação disponível (verduras) com a ONG, para a rota ter mais de uma parada
  await admin.getByText('Caixas de verduras').first().click()
  await expectText(admin, 'Casar com receptor')
  await admin.getByRole('button', { name: /casar com receptor/i }).click()
  await admin.locator('#match-recipientId').selectOption({ label: 'ONG Mesa Solidária' })
  await shot(admin, 'Administrador', 'Casar doacao com receptor')
  await admin.getByRole('button', { name: 'Confirmar' }).click()
  await expectText(admin, 'Reatribuir a outro receptor')
  await shot(admin, 'Administrador', 'Detalhe da doacao reservada pela administracao', { full: true })

  // rota
  await admin.goto(`${BASE}/rotas`)
  await shot(admin, 'Administrador', 'Rotas de coleta')
  await admin.goto(`${BASE}/rotas/nova`)
  await admin.locator('#route-vehicleId').selectOption({ index: 1 })
  await admin.locator('#route-volunteerId').selectOption({ index: 1 })
  await admin.locator('#route-scheduledFor').fill(local(new Date(Date.now() + 3600e3)))
  await shot(admin, 'Administrador', 'Nova rota')
  await admin.getByRole('button', { name: /salvar|criar/i }).click()
  await admin.waitForURL(/\/rotas\/[^/]+$/)
  await shot(admin, 'Administrador', 'Rota nova, sem doacoes', { full: true })
  for (let i = 0; i < 3; i++) {
    const options = await admin.locator('#attach-donation option').count()
    if (options <= 1) break
    await admin.locator('#attach-donation').selectOption({ index: 1 })
    await admin.getByRole('button', { name: 'Anexar', exact: true }).click()
    await admin.waitForTimeout(900)
  }
  await expectText(admin, 'Ordem sugerida das paradas')
  await shot(admin, 'Administrador', 'Rota com mapa, ordem das paradas e carga', { full: true, wait: 1500 })
  await admin.getByRole('button', { name: /iniciar rota/i }).click()
  await expectText(admin, 'Em andamento')
  const kgInput = admin.getByLabel(/Kg coletado de Leite integral/)
  await kgInput.fill('18.5')
  await shot(admin, 'Administrador', 'Rota em andamento, kg coletado', { full: true, wait: 1200 })
  await admin.getByRole('button', { name: /concluir rota/i }).click()
  await expectText(admin, 'Concluída')
  await shot(admin, 'Administrador', 'Rota concluida', { full: true, wait: 1200 })
  await admin.goto(`${BASE}/rotas`)
  await shot(admin, 'Administrador', 'Rotas de coleta apos concluir')

  // ───────────── receptor confirma o recebimento ─────────────
  console.log('Receptor (confirmação)')
  await ong.goto(`${BASE}/doacoes`)
  await ong.getByText('Leite integral (lote urgente)').first().click()
  await expectText(ong, 'Confirmar recebimento')
  await shot(ong, 'Receptor', 'Doacao coletada aguardando confirmacao', { full: true })
  await ong.getByRole('button', { name: /confirmar recebimento/i }).click()
  await expectText(ong, 'Recebimento confirmado')
  await shot(ong, 'Receptor', 'Doacao entregue com historico completo', { full: true })

  // ───────────── doador: comprovante e avisos ─────────────
  console.log('Doador (comprovante)')
  await donor.goto(`${BASE}/doacoes`)
  await donor.getByText('Leite integral (lote urgente)').first().click()
  await expectText(donor, 'Ver comprovante')
  await shot(donor, 'Doador', 'Doacao entregue com link do comprovante', { full: true })
  await donor.getByRole('link', { name: /ver comprovante/i }).click()
  await expectText(donor, 'Comprovante de doação de alimentos')
  await expectText(donor, '18,5 kg')
  await shot(donor, 'Doador', 'Comprovante de doacao', { full: true })
  await donor.goto(`${BASE}/`)
  await donor.getByRole('button', { name: /notificações/i }).click()
  await expectText(donor, 'confirmou o recebimento')
  await shot(donor, 'Doador', 'Notificacoes (sino)')

  // ───────────── administrador: relatórios ─────────────
  console.log('Administrador (relatórios)')
  await admin.goto(`${BASE}/relatorios`)
  await expectText(admin, 'Indicadores do período')
  await shot(admin, 'Administrador', 'Relatorios e indicadores', { full: true, wait: 1500 })
  await admin.goto(`${BASE}/`)
  await shot(admin, 'Administrador', 'Dashboard apos o fluxo completo', { full: true, wait: 1500 })

  // ───────────── celular ─────────────
  console.log('Celular')
  // Reaproveita as sessões já abertas (o backend limita logins por IP: 10 a cada 15 min).
  const m = await newPage(390, 844, await admin.context().storageState())
  await m.goto(`${BASE}/inicio`)
  await shot(m, 'Celular', 'Pagina inicial', { mobile: true, full: true })
  const mAnon = await newPage(390, 844)
  await mAnon.goto(`${BASE}/login`)
  await shot(mAnon, 'Celular', 'Login', { mobile: true })
  await m.goto(`${BASE}/`)
  await shot(m, 'Celular', 'Dashboard do administrador', { mobile: true, full: true, wait: 1500 })
  await m.locator('header button').first().click()
  await shot(m, 'Celular', 'Menu lateral', { mobile: true })
  await m.goto(`${BASE}/doacoes`)
  await shot(m, 'Celular', 'Doacoes', { mobile: true })
  await m.goto(`${BASE}/rotas`)
  await m.locator('a[href^="/rotas/"]:not([href="/rotas/nova"])').first().click()
  await expectText(m, 'Carga e percurso')
  await shot(m, 'Celular', 'Detalhe da rota', { mobile: true, full: true, wait: 1500 })
  const mOng = await newPage(390, 844, await ong.context().storageState())
  await mOng.goto(`${BASE}/oportunidades`)
  await shot(mOng, 'Celular', 'Oportunidades do receptor (sem doacoes disponiveis no momento)', { mobile: true, full: true })

  fs.writeFileSync(path.join(OUT, 'catalogo.json'), JSON.stringify(catalog, null, 2))
  console.log(`\n${catalog.length} telas em ${OUT}`)
  console.log('Erros de console/JS:', errors.length ? errors : 'nenhum')
  await browser.close()
  if (errors.length) process.exit(2)
})().catch((e) => {
  console.error('FALHOU:', e.message)
  process.exit(1)
})
