const L = require('./lib')
const M = require('./metrics.json')
const { fs, path, Document, Packer, Paragraph, TextRun, AlignmentType, P, PN, H1, H2, bullet, table, spacer, styles, numbering, footer, PAGE, FONT, GREEN, GRAY, DARK } = L

const center = (t, o = {}) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: o.after ?? 80, line: 300 }, children: L.runs(t, { size: o.size ?? 22, bold: o.bold, color: o.color }) })

// [id, entrega e critério de aceite, onde aparece nos documentos, responsável, horas]
const codigo = [
  ['C0', '**Segurança do deploy.** O `render.yaml` roda o seed a cada início em produção, o que cria o administrador `admin@conectfome.org` com a senha pública `Conect@123` (que está no README). Trocar: seed de demonstração só quando `SEED_DEMO=true`; em produção, administrador criado por variável de ambiente com senha forte. Aceite: nenhuma credencial do README funciona no ambiente público.', 'Seção 6.3', 'Lucas', 3],
  ['C1', '**Histórico de eventos (RF18).** Modelo `DonationEvent` (doação, ação, de, para, usuário, data) gravado em toda transição (doação e conclusão/cancelamento de rota), campo `expiredAt`, endpoint de consulta e linha do tempo na tela da doação. Aceite: após o ciclo completo, o histórico mostra cada passo com o usuário.', 'Seções 8.2, 8.4, 8.6; artigo 4.4', 'Lucas (API) + Vitor (tela)', 14],
  ['C2', '**Condição de armazenamento e aceite (RF05).** Enum `StorageCondition` (ambiente, refrigerado, congelado), obrigatório para perecível e preparado; checkbox de declaração gravado com data (`termsAcceptedAt`). Aceite: o formulário bloqueia o envio sem esses campos.', 'Seções 8.2, 8.4, 8.11', 'Lucas + Vitor', 6],
  ['C3', '**Urgência (RF10).** Função que calcula o que vence primeiro entre validade e fim da janela; “urgente” abaixo de 24 h; selo nas listagens e ordenação. Aceite: teste unitário com casos de borda (sem validade, janela já encerrada).', 'Seção 8.7', 'Lucas + Vitor', 5],
  ['C4', '**Painel de oportunidades e reserva pelo receptor (RF07, RF08).** `GET /donations/opportunities` (disponíveis, filtro por cidade e categoria, ordenado por urgência) e `PATCH /donations/:id/reserve` (só receptor, para si, de forma atômica para impedir reserva dupla). Admin continua podendo casar e reatribuir. Aceite: dois receptores reservando a mesma doação ao mesmo tempo resultam em um sucesso e um erro claro (teste de integração).', 'Seções 8.2, 8.5; artigo 4.4 e 5', 'Lucas + Vitor', 12],
  ['C5', '**Notificações internas (RF11).** Modelo `Notification`, criação nos eventos (nova doação para receptores da cidade, reserva, rota, coleta, entrega, cancelamento), endpoints de listar e marcar como lida, sino na interface. Aceite: cada evento da lista gera notificação para o destinatário correto.', 'Seções 8.2, 8.7', 'Lucas + Vitor', 10],
  ['C6', '**Geocodificação (RF14).** Latitude e longitude em doador e receptor, preenchidas pelo Nominatim ao salvar o endereço (User-Agent identificado, no máximo 1 requisição por segundo, cache, tolerante a falha) e script para preencher cadastros existentes. Aceite: endereço inválido não impede o cadastro e fica marcado como “sem coordenadas”.', 'Seções 6.2, 8.3, 8.4', 'Lucas', 8],
  ['C7', '**Mapa da rota, ordem e distância (RF14).** Leaflet na tela da rota com paradas numeradas; ordem sugerida por vizinho mais próximo e distância total por fórmula de haversine (funções puras com teste). Aceite: rota com 3 ou mais paradas mostra mapa, ordem e km.', 'Seção 8.8', 'Vitor + Lucas', 10],
  ['C8', '**Capacidade do veículo (RF15).** Soma do peso estimado contra `capacityKg`: aviso ao anexar e bloqueio ao iniciar se exceder. Aceite: teste cobrindo veículo sem capacidade cadastrada.', 'Seção 8.8', 'Lucas', 4],
  ['C9', '**Comprovante de doação (RF19).** Página imprimível por doação coletada ou entregue (doador, receptor, kg coletado, datas), acessível só a administrador e ao doador dono. Aceite: outro doador recebe 403.', 'Seções 8.2, 8.9', 'Lucas + Vitor', 6],
  ['C10', '**Relatórios ampliados (RF20).** Taxas de resgate, perda e entrega, tempo médio até a coleta (a partir do histórico), pessoas atendidas, filtro por período e exportação CSV. Aceite: números conferem com um conjunto conhecido de doações.', 'Seções 8.9 e 9.2', 'Lucas + Vitor', 8],
  ['C11a', '**Testes que faltam nos services.** Voluntários e veículos hoje não têm arquivo de teste; todos os novos services entram com testes.', 'Seção 8.10; artigo 4.2', 'Lucas', 4],
  ['C11b', '**Testes de integração com PostgreSQL real no CI.** Serviço `postgres` no GitHub Actions; cobrir a consulta SQL de `monthlyKg`, a transação de conclusão de rota e a reserva concorrente. Hoje a consulta do relatório só foi conferida à mão.', 'Seção 8.10; artigo 3 e 5', 'Lucas', 10],
  ['C11c', '**Testes de componente do frontend.** Hoje só existem Login e Register (' + M.frontendTests + ' testes). Adicionar formulário de doação, painel de oportunidades e tela da rota.', 'Seção 8.10', 'Vitor', 8],
  ['C12', '**Seed coerente com os documentos.** Dados de exemplo com endereços geocodificados, uma doação urgente e eventos de histórico; manter a Tabela 3 do artigo igual ao que o seed produz (ou atualizar a tabela).', 'Artigo 4.3', 'Lucas', 3],
  ['C13', '**Aplicação no ar.** Deploy do backend (Render), frontend (Vercel) e banco (Supabase); `CORS_ORIGINS` e `APP_URL` corretos; verificação de saúde; conta de demonstração com senha própria. Colocar o endereço na Seção 1 e no README.', 'Seção 1', 'Lucas', 6],
  ['C14', '**README alinhado.** Corrigir “8 modelos” (hoje são ' + M.models + ' no schema atual), a afirmação de que cada estado registra “quem fez” (só passa a valer após C1) e a lista de decisões de escopo.', 'Consistência com a Seção 8', 'Lucas', 2],
]

const pesquisa = [
  ['R1', '**Entrevistas.** Pelo menos 3 doadores (mercado, restaurante ou feira) e 3 instituições receptoras de Sorocaba ou Votorantim, com roteiro e consentimento; registrar respostas. Comparar com as personas e **ajustar o texto das personas ao que for encontrado**. Fazer primeiro: se o resultado contrariar as personas, muda o que vale construir.', 'Seção 10; artigo 3, 5 e 7', 'João (com todos)', 12],
  ['R2', '**Teste de usabilidade.** Com no mínimo 5 pessoas, 4 tarefas (registrar doação, reservar, montar rota, ver relatório), medindo tempo, erros e nota SUS. Corrigir os 3 problemas mais graves. Só depois do código estável. Os resultados entram em uma seção nova do artigo (4.5) e na discussão.', 'Artigo 4 e 5; Seção 8.10', 'Vitor + João', 10],
  ['R3', '**Contagem real de estabelecimentos.** Consulta ao CEMPRE no SIDRA (município 3552205, CNAE divisão 47 grupo 47.2 e divisão 56). Substituir o SAM proporcional (≈ 6.300) pelo número real e refazer a Figura 6.', 'Seção 13', 'João', 2],
  ['R4', '**Conferir fontes primárias.** ABRAS (424.120 lojas), Abrasel (1,35 milhão de empresas), IBGE PNAD 2024, Censo 2022, UNEP e Embrapa; trocar citações de imprensa por links oficiais e datas de acesso.', 'Seções 4, 13 e 16; artigo, referências', 'João', 4],
  ['R5', '**Base legal e sanitária.** Ler o texto da Lei 15.224/2025 (responsabilidade do doador, Selo Doador, exigências) e consultar a orientação sanitária local. Ajustar as menções na Seção 4 e na discussão do artigo ao que o texto realmente diz.', 'Seção 4; artigo 5', 'João + Lucas', 3],
  ['R6', '**Evidências de gestão.** Anexar o protótipo do Figma (link ou PDF) e um print atualizado do Trello com o andamento.', 'Seções 5 e 6.1', 'Vitor + João', 3],
  ['R7', '**Consistência de equipe e nome.** Escolher um nome (ConectFome, DOA+ ou ConectaFome) e usar em tudo; confirmar integrantes (o Trello mostra 4 membros, os documentos listam 3) e funções (o Trello lista 8 cargos, os documentos descrevem 6).', 'Capa, Seções 1 e 7', 'João', 1],
  ['R8', '**Validar com a orientadora** a estrutura exigida, o formato ABNT e o tamanho do artigo.', 'Todos', 'João', 1],
]

const docs = [
  ['D1', 'Rodar node docs/gerador/metricas.js, `python3 docs/gerador/figs.py`, `docs/gerador/build_doc.sh` e `node docs/gerador/artigo.js`. Os números de testes, rotas, linhas e a Figura 5 saem do código.', 'Todos os números', 'Lucas', 1],
  ['D2', 'Revisar as Seções 8.2 a 8.11 e a Tabela 4 do artigo contra o sistema rodando: para cada RF, demonstrar a tela ou rota e anotar. **Qualquer RF que não entrar deve ser removido do texto**, junto com as menções nas Seções 3, 5, 8, 9, 10, 11, 12 e no artigo.', 'Seção 8 e artigo', 'João', 6],
  ['D3', 'Incorporar os resultados reais de R1, R2 e R3 (citações das entrevistas, notas SUS, SAM real), sem inventar nada além do que foi coletado.', 'Seções 10 e 13; artigo 4 e 5', 'João', 4],
  ['D4', 'Exportar PDF final de ambos, conferir sumário, figuras e referências e entregar.', 'Entrega', 'João', 1],
]
const sum = (a) => a.reduce((n, r) => n + r[4], 0)
const nb = (t) => t.replace(/`/g, '')
const rows = (a) => a.map((r) => [r[0], nb(r[1]), r[2], r[3], String(r[4])])
const W = [650, 4650, 1650, 1250, 871]

const head = [
  center('PLANO DE FECHAMENTO DO PROJETO', { bold: true, size: 32, color: GREEN, after: 60 }),
  center('ConectFome · UPX2 · Facens', { size: 22, color: GRAY, after: 240 }),
]

const intro = [
  H1('1. Objetivo e regra de uso'),
  P('A documentação e o artigo descrevem o ConectFome como um produto finalizado, com três personas, painel de oportunidades, notificações, histórico de ações, mapa de rotas, comprovantes e relatórios ampliados. **Hoje, parte disso ainda não existe no código.** Este plano lista tudo o que precisa ser feito para que cada frase dos documentos seja verdadeira.'),
  P('**Regra:** os documentos só devem ser entregues depois de cumprir a “definição de pronto” da Seção 7. Se algum item ficar de fora, o texto correspondente deve ser removido (coluna “Onde aparece”), em vez de entregar uma funcionalidade descrita e inexistente. Um avaliador que abrir o sistema e não encontrar o que o documento promete vai tratar isso como erro de integridade, e não como atraso.'),
  P('As horas são **estimativas minhas**, para dimensionar e ordenar; ajustem com a realidade da equipe. Os responsáveis seguem as funções descritas na Seção 7 da documentação de projeto (João: requisitos e gestão; Lucas: back-end e banco; Vitor: front-end e testes).'),
  H1('2. Estado atual medido'),
  table(
    ['Item', `Valor em ${M.generatedAt}`],
    [
      ['Testes do backend', `${M.backendTestsPassed} aprovados de ${M.backendTests}, em ${M.backendTestFiles} arquivos`],
      ['Testes do frontend', `${M.frontendTests} testes em ${M.frontendTestFiles} arquivos (Login e Register)`],
      ['Modelos / enumerações no schema', `${M.models} / ${M.enums}`],
      ['Rotas REST', String(M.routes)],
      ['Linhas de código (src)', `${M.backendLoc} no backend, ${M.frontendLoc} no frontend`],
    ],
    [3600, 5471],
  ),
  spacer(),
]

const sec = (titulo, arr) => [
  H1(titulo),
  table(['ID', 'Entrega e critério de aceite', 'Onde aparece', 'Quem', 'Horas'], rows(arr), W, { size: 18 }),
  PN(`Subtotal: **${sum(arr)} h**`, { before: 100, size: 22 }),
]

const total = sum(codigo) + sum(pesquisa) + sum(docs)
const ordem = [
  H1('7. Ordem de execução e definição de pronto'),
  H2('Ordem sugerida'),
  bullet('**Desde o primeiro dia, em paralelo:** R1 (entrevistas), R3, R4, R5, R7 e R8, que não dependem de código. As entrevistas vêm antes do resto do desenvolvimento porque podem mudar prioridades.'),
  bullet('**Bloco 1 – base:** C0, C1, C2, C14.'),
  bullet('**Bloco 2 – fluxo do receptor:** C3, C4, C5.'),
  bullet('**Bloco 3 – logística:** C6, C7, C8.'),
  bullet('**Bloco 4 – entregáveis do doador e do admin:** C9, C10, C12.'),
  bullet('**Bloco 5 – qualidade e publicação:** C11a, C11b, C11c, C13.'),
  bullet('**Bloco 6 – validação e fechamento:** R2 (teste de usabilidade com o sistema estável), R6, D1 a D4.'),
  H2('Definição de pronto'),
  bullet('Os 21 requisitos funcionais da Seção 8.2 podem ser demonstrados no sistema em execução.'),
  bullet('npm test passa no backend e no frontend, o CI está verde e npm run build compila.'),
  bullet('A aplicação está no ar e nenhuma credencial pública do README funciona nela.'),
  bullet('Todos os números dos documentos foram regenerados a partir do código (D1).'),
  bullet('Nenhuma frase dos documentos descreve algo que não foi demonstrado (D2).'),
  bullet('As seções de personas e mercado refletem o que foi realmente coletado (D3).'),
  H2('Riscos'),
  bullet(`**Escopo:** são ${total} h a mais sobre o que a equipe já gastou dos 220 h do orçamento original. Se o prazo for curto, cortem na ordem inversa de valor: C7 e C10 (mapa e relatórios extras), depois C5 (notificações), mantendo C1, C2, C4 e C11 que sustentam as promessas centrais.`),
  bullet('**Nominatim** tem política de uso restrita (1 requisição por segundo e identificação); não usar em carga. Falha de geocodificação não pode bloquear o cadastro.'),
  bullet('**Reserva concorrente** é o ponto mais fácil de errar em C4; exige teste de integração.'),
  bullet('**Entrevistas** são o item mais sujeito a atraso, pois dependem de terceiros. Comecem agora.'),
]

const resumo = [
  H1('6. Resumo de esforço'),
  table(
    ['Bloco', 'Horas estimadas'],
    [['Código (C0 a C14)', String(sum(codigo))], ['Pesquisa e validação (R1 a R8)', String(sum(pesquisa))], ['Fechamento dos documentos (D1 a D4)', String(sum(docs))], ['**Total**', `**${total}**`]],
    [6000, 3071],
  ),
  PN('Para comparação, o orçamento original do projeto prevê 220 h de esforço técnico no total, já em parte consumidas pelo que existe hoje.', { before: 100, size: 22 }),
]

const doc = new Document({
  creator: 'Equipe ConectFome',
  title: 'ConectFome – Plano de fechamento',
  styles,
  numbering,
  sections: [{ properties: { page: PAGE }, footers: { default: footer('ConectFome · Plano de fechamento') },
    children: [...head, ...intro, ...sec('3. Código: o que construir', codigo), ...sec('4. Pesquisa e validação: o que só a equipe pode fazer', pesquisa), ...sec('5. Fechamento dos documentos', docs), ...resumo, ...ordem] }],
})
Packer.toBuffer(doc).then((b) => {
  const out = path.join(__dirname, '..', 'PLANO_DE_FECHAMENTO.docx')
  fs.writeFileSync(out, b)
  console.log('ok', out, 'total h', total)
})
