const L = require('./lib')
const M = require('./metrics.json')
const {
  fs, path, Document, Packer, Paragraph, TextRun, AlignmentType,
  P, PN, H1, H2, bullet, caption, table, img, spacer, styles, numbering, footer, PAGE, FONT, GREEN, DARK, GRAY,
} = L

function size(file, w) {
  const b = fs.readFileSync(path.join(__dirname, '..', 'figuras', file))
  return [w, Math.round((w * b.readUInt32BE(20)) / b.readUInt32BE(16))]
}
const fig = (file, w) => img(file, ...size(file, w))
const center = (t, o = {}) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: o.after ?? 80, before: o.before ?? 0, line: 300 },
    children: L.runs(t, { size: o.size ?? 22, bold: o.bold, color: o.color }),
  })
const ref = (t) => new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 140, line: 276 }, children: L.runs(t, { size: 22 }) })
const abs = (t) => P(t, { indent: false, size: 22, line: 300 })

const head = [
  center('ConectFome: uma plataforma web para rastrear a redistribuição de alimentos excedentes a instituições sociais', { bold: true, size: 30, color: GREEN, after: 200 }),
  center('João Albuquerque de Meneses, Lucas Lima Santos, Vitor Gimenez', { bold: true }),
  center('Centro Universitário Facens – Análise e Desenvolvimento de Sistemas', { size: 20, color: GRAY }),
  center('Orientadora: Brenda Medina de Oliveira · UPX2 – Usina de Projetos Experimentais II · Sorocaba/SP, 2026', { size: 20, color: GRAY, after: 280 }),

  new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: 'Resumo', bold: true, size: 24, font: FONT, color: GREEN })] }),
  abs(`Mercados, restaurantes e feiras descartam alimentos próprios para consumo, enquanto 24,2% dos domicílios brasileiros convivem com algum grau de insegurança alimentar. A ligação entre os dois lados costuma depender de contatos informais, sem registro do que foi doado. Este trabalho apresenta o ConectFome, uma plataforma web que registra doações com validade e condição de armazenamento, oferece ao receptor um painel de oportunidades ordenado por urgência, organiza a coleta em rotas com mapa, verificação de capacidade do veículo e histórico de cada ação, e mede o alimento efetivamente resgatado. A pesquisa seguiu a abordagem de Design Science: o problema foi caracterizado com dados secundários, o artefato foi construído em fases incrementais (Node/Express, PostgreSQL/Prisma e React) e avaliado por testes automatizados (${M.backendTests} no backend, ${M.backendTestsPassed} aprovados) e por demonstração com dados sintéticos. O artefato implementa um ciclo de vida de doação com sete estados e 21 requisitos funcionais. A avaliação não envolveu usuários reais; a validação em campo com doadores e ONGs é o passo seguinte. Conclui-se que o artefato viabiliza o rastreio e a medição do resgate e atende às necessidades levantadas para os três perfis de usuário, restando demonstrar sua utilidade em operação real.`),
  new Paragraph({ spacing: { before: 80, after: 160 }, children: L.runs('**Palavras-chave:** desperdício de alimentos; doação de alimentos; rastreabilidade; sistema web; ODS 2 e 12.', { size: 22 }) }),
  new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: 'Abstract', bold: true, size: 24, font: FONT, color: GREEN })] }),
  abs('Supermarkets, restaurants and street markets discard food that is still fit for consumption, while 24.2% of Brazilian households face some degree of food insecurity. Connecting both sides usually relies on informal contacts, with no record of what was donated. This paper presents ConectFome, a web platform that records donations, gives recipients an urgency-sorted opportunities board, organizes pickup routes with a map and keeps an audit trail of every action, measuring the food actually rescued. Following a Design Science approach, the artifact was built incrementally and evaluated through automated tests and a demonstration with synthetic data. No real users took part in the evaluation, so its usefulness for donors and NGOs remains to be validated in the field.'),
  new Paragraph({ spacing: { before: 40, after: 200 }, children: L.runs('**Keywords:** food waste; food donation; traceability; web system; SDG 2 and 12.', { size: 22 }) }),
]

const intro = [
  H1('1. Introdução'),
  P('O desperdício de alimentos mobiliza dimensões sociais, econômicas e ambientais. O Food Waste Index 2024 estimou em 1,05 bilhão de toneladas o alimento desperdiçado no mundo em 2022, sendo 631 milhões de toneladas nos domicílios, o equivalente a 79 kg por pessoa por ano nesse nível de consumo (UNEP, 2024). Para o Brasil não há, nessa publicação, uma estimativa nacional consolidada: a Embrapa reporta cerca de 94 kg por habitante a partir de um estudo-piloto em cinco regiões da cidade do Rio de Janeiro (EMBRAPA, 2024), e as estimativas de volume anual encontradas em veículos de imprensa variam de 27 a 46 milhões de toneladas, o que mostra falta de consenso metodológico.'),
  P('Do outro lado da cadeia, a PNAD Contínua de 2024 identificou 18,9 milhões de domicílios (24,2% de 78,3 milhões) com algum grau de insegurança alimentar (IBGE, 2025). A Agenda 2030 trata os dois fenômenos nos Objetivos de Desenvolvimento Sustentável 2 (Fome Zero) e 12 (Consumo e Produção Responsáveis) (ONU, 2015).'),
  P('No plano legal, a Lei nº 14.016/2020, que autorizava a doação de excedentes, foi revogada pela Lei nº 15.224/2025, que institui a Política Nacional de Combate à Perda e ao Desperdício de Alimentos e o Selo Doador de Alimentos (BRASIL, 2025). Há, portanto, um ambiente normativo que incentiva a doação formalizada. Na prática, entretanto, a doação depende de iniciativas como o Mesa Brasil Sesc, que em Sorocaba distribuiu 88.762 kg a 36 instituições entre janeiro e setembro de 2018 (SESC SÃO PAULO, 2018), e de arranjos informais por mensagens e planilhas, que não deixam rastro do que foi doado, coletado e entregue.'),
  P('Este artigo apresenta o ConectFome, desenvolvido na disciplina UPX2 do curso de Análise e Desenvolvimento de Sistemas da Facens, e tem como objetivo descrever o artefato, mostrar o que foi verificado e delimitar com franqueza o que ainda não foi.'),
]

const problema = [
  H1('2. Problema de Pesquisa'),
  P('**Pergunta central:** é possível, com um sistema web de baixo custo, organizar o fluxo entre estabelecimentos que geram excedentes e instituições que os recebem, de modo que cada doação seja rastreável da oferta à entrega e que o alimento efetivamente resgatado possa ser medido?'),
  P('Desdobram-se duas perguntas: (a) que modelo de estados da doação permite separar o que foi resgatado, entregue, cancelado e perdido? (b) em que medida o sistema atende às necessidades levantadas para os perfis de doador, receptor e administrador?'),
]

const metodo = [
  H1('3. Metodologia'),
  P('A pesquisa é de natureza aplicada e segue a Design Science Research (HEVNER et al., 2004), cujo produto é um artefato avaliado quanto à sua utilidade. Foram percorridas as atividades do processo de Peffers et al. (2007), descritas a seguir.'),
  table(
    ['Atividade', 'O que foi feito'],
    [
      ['Identificação do problema', 'Revisão de dados secundários (UNEP, IBGE, ONU, legislação, Mesa Brasil Sesc) e mapa mental da solução'],
      ['Objetivos da solução', 'Três personas (doador, receptor e administrador), canvas de proposta de valor e Lean Canvas; 21 requisitos funcionais'],
      ['Projeto e desenvolvimento', 'Modelo relacional; API REST em Node.js/Express/TypeScript com Prisma e PostgreSQL; interface em React, Vite e Tailwind; mapa com Leaflet e OpenStreetMap; fases incrementais, uma por módulo'],
      ['Demonstração', 'Dados de exemplo (seed) com contas dos três papéis e doações em estados distintos, e leitura do relatório produzido'],
      ['Avaliação', 'Testes automatizados unitários, de integração e de componentes; análise da cobertura por área; confronto do que foi entregue com as necessidades das personas'],
      ['Comunicação', 'Este artigo e a documentação do projeto'],
    ],
    [2400, 6671],
  ),
  spacer(),
  P('A organização do trabalho em equipe usou um quadro Kanban no Trello e versionamento em Git. A integração contínua executa instalação, auditoria de dependências, testes e compilação. Os testes de serviço usam o acesso ao banco simulado, e há testes de integração contra um PostgreSQL real para a consulta SQL dos relatórios e para as transações de rota.'),
  P('**Escopo da avaliação:** a avaliação é técnica (testes e demonstração). Entrevistas, teste de usabilidade e piloto com usuários não fazem parte deste artigo e constam como trabalho futuro.'),
]

const labels = {
  AuthService: 'Cadastro e login (RF01, RF02)', jwt: 'Tokens de sessão (RF02)', 'auth-middleware': 'Autorização por papel (RF02, RF21)', verifyCsrf: 'Proteção CSRF (RF02)',
  DonorService: 'Doadores (RF03)', RecipientService: 'Receptores (RF04)', DonationService: 'Doações: oferta, reserva, cancelamento, entrega (RF05 a RF11, RF17)',
  PickupRouteService: 'Rotas de coleta (RF13, RF16)', ReportService: 'Relatórios (RF20)',
}
const testRows = Object.entries(M.perFile).sort((a, b) => b[1] - a[1]).map(([f, n]) => [labels[f] ?? '—', f, String(n)])
const semVoluntarios = !('VolunteerService' in M.perFile && 'VehicleService' in M.perFile)

const resultados = [
  H1('4. Resultados'),
  H2('4.1 O artefato'),
  P('O ConectFome é um monorepo com backend e frontend. A Tabela 1 resume suas dimensões. As contagens consideram os arquivos versionados no repositório na data da medição e são geradas por script, não digitadas.'),
  table(
    ['Característica', 'Valor'],
    [
      ['Requisitos funcionais', '21 (cadastros, oferta e reserva de doações, urgência e notificações, rotas com mapa, comprovante e relatórios)'],
      ['Entidades e enumerações do banco', `${M.models} modelos e ${M.enums} enumerações (medido em ${M.generatedAt})`],
      ['Rotas REST registradas', String(M.routes)],
      ['Papéis de acesso', '3 (administrador, doador, receptor)'],
      ['Páginas do frontend', String(M.frontendPages)],
      ['Código-fonte', `cerca de ${M.backendLoc.toLocaleString('pt-BR')} linhas no backend e ${M.frontendLoc.toLocaleString('pt-BR')} no frontend (arquivos .ts e .tsx em src)`],
    ],
    [3400, 5671],
  ),
  caption('Tabela 1 – Dimensões do artefato.'),
  P('O resultado de maior peso para a pergunta (a) é o ciclo de vida da doação (Figura 1). Cada estado exige uma ação distinta de um ator específico, as saídas de cancelamento e vencimento só partem de disponível ou reservada, e cada transição grava um evento com o usuário e a data. O relatório considera “resgatado” o alimento das doações coletadas e entregues, somando a quantidade efetivamente coletada, que pode diferir da estimada pelo doador.'),
  fig('ciclo_doacao.png', 540),
  caption('Figura 1 – Ciclo de vida da doação implementado.'),
  H2('4.2 Testes automatizados'),
  P(`Na medição de ${M.generatedAt}, os ${M.backendTestFiles} arquivos de teste do backend somaram ${M.backendTests} testes, dos quais ${M.backendTestsPassed} foram aprovados (Figura 2), além de ${M.frontendTests} testes de componente em ${M.frontendTestFiles} arquivos do frontend. As regras mais exercitadas são as de transição de estado e de permissão: por exemplo, rejeitar a reserva de uma doação que não esteja disponível, impedir que outro doador cancele a doação alheia, impedir a confirmação de recebimento antes da coleta, rejeitar o início de uma rota sem doações e devolver as doações ao estado reservada quando a rota é cancelada.`),
  fig('testes_por_modulo.png', 420),
  caption(`Figura 2 – Testes automatizados do backend por arquivo (${M.backendTests} no total).`),
  P('A Tabela 2 mostra a distribuição dos testes por área do sistema.' + (semVoluntarios ? ' Os cadastros de voluntários e veículos ainda não têm arquivo de teste próprio.' : '')),
  table(['Área', 'Arquivo de teste', 'Testes'], testRows, [4500, 3171, 1400]),
  caption('Tabela 2 – Testes automatizados do backend por área (gerada a partir da medição).'),
  H2('4.3 Demonstração com dados sintéticos'),
  P('Os dados de exemplo do projeto (seed) incluem doações em estados distintos. A Tabela 3 mostra como o relatório trata um conjunto de quatro doações, uma em cada estado: disponível, reservada, vencida e entregue (esta, no mês anterior). Os valores são fictícios e servem apenas para demonstrar a separação entre resgatado e perdido; **não representam resultado de campo**.'),
  table(
    ['Doação (dados de exemplo)', 'Estado', 'Estimado (kg)', 'Coletado (kg)', 'Conta como resgatado?'],
    [
      ['Marmitas do almoço executivo', 'Entregue', '35', '32', 'Sim, 32 kg'],
      ['Caixas de verduras e legumes', 'Disponível', '18', '–', 'Não'],
      ['Pães e bolos do dia anterior', 'Reservada', '12', '–', 'Não'],
      ['Iogurtes perto do vencimento', 'Vencida', '8', '–', 'Não (perda)'],
      ['**Total**', '', '**73**', '**32**', '**32 kg de 73 kg (43,8%)**'],
    ],
    [3000, 1250, 1300, 1300, 2221],
  ),
  caption('Tabela 3 – Tratamento de um conjunto de exemplo pelo relatório de kg resgatado.'),
  P('O exemplo ilustra duas propriedades do modelo: a diferença entre a quantidade estimada pelo doador (35 kg) e a coletada na rota (32 kg) fica registrada, e o que se perdeu antes da coleta (8 kg de iogurte) aparece como estado próprio, em vez de desaparecer do relatório.'),
  H2('4.4 Atendimento às personas'),
  table(
    ['Necessidade apontada', 'Persona', 'Como o sistema atende'],
    [
      ['Cadastro rápido do lote com validade e janela', 'Doadora', 'Formulário de doação com validade, janela e condição de armazenamento (RF05)'],
      ['Histórico e relatório mensal do volume doado', 'Doadora', 'Relatórios por mês e por doador (RF20)'],
      ['Confirmação de data/hora e de quem retira', 'Doadora', 'Janela de coleta, rota com voluntário e notificações (RF11, RF13)'],
      ['Comprovante formal das doações', 'Doadora', 'Comprovante imprimível e histórico de ações com usuário e data (RF18, RF19)'],
      ['Painel de oportunidades por proximidade', 'Receptor', 'Painel com filtro por cidade e categoria e reserva direta (RF07, RF08)'],
      ['Alertas de validade e prioridade', 'Receptor', 'Indicador de urgência e ordenação por prazo (RF10)'],
      ['Agrupamento de coletas para otimizar o veículo', 'Receptor', 'Rota com mapa, ordem sugerida das paradas e verificação de capacidade (RF13 a RF15)'],
      ['Visão operacional e relatórios prontos', 'Administradora', 'Reatribuição de doações, rotas e relatórios com exportação (RF08, RF13, RF20)'],
    ],
    [3300, 1500, 4271],
  ),
  caption('Tabela 4 – Necessidades das personas e funcionalidades correspondentes.'),
]

const discussao = [
  H1('5. Discussão'),
  P('**O ciclo de estados responde à pergunta (a), e a evidência é de projeto, não de uso.** Modelar a doação como uma sequência de estados com ações próprias e histórico é uma decisão defensável do ponto de vista do rastreio, e os testes confirmam que as regras de transição são aplicadas. Isso mostra que o sistema é consistente, mas não demonstra que doadores e ONGs conseguirão ou desejarão operar o fluxo. Em Design Science, a avaliação com usuários fecha o ciclo (HEVNER et al., 2004); aqui ela é a principal lacuna e o principal trabalho futuro.'),
  P('**A reserva pelo receptor reduz, mas não elimina, o gargalo do administrador.** Quando o administrador era o único a casar doações, o volume de operação ficava limitado a uma pessoa, o que é crítico para alimento perecível, de janela curta. Com o painel de oportunidades e a reserva direta, o receptor passa a agir por conta própria, e o administrador atua por exceção. Permanece em aberto o comportamento do sistema com muitos receptores disputando as mesmas doações; a regra atual é a de quem reserva primeiro. A referência do Mesa Brasil em Sorocaba (21 doadores e 36 instituições em 2018) indica a escala que uma operação realista pode alcançar, e o comportamento nessa escala precisa ser testado.'),
  P('**A rastreabilidade registra quem, quando e o quê.** O histórico de eventos e o comprovante atendem à necessidade de formalização da persona doadora e podem apoiar o doador na obtenção do Selo Doador de Alimentos. O comprovante é um documento do sistema e não substitui eventuais exigências fiscais ou legais, que devem ser confirmadas no texto da Lei nº 15.224/2025 e na regulamentação aplicável.'),
  P('**A segurança sanitária é declaratória.** O doador informa a condição de armazenamento (ambiente, refrigerado ou congelado) e aceita uma declaração de que o alimento está próprio para consumo, mas o sistema não mede temperatura nem verifica a cadeia de frio. Materiais do Mesa Brasil Sesc São Paulo, por exemplo, orientam manter produtos de origem animal a 4 °C (resfriados) ou –18 °C (congelados). O uso real com perecíveis exige orientação sanitária à parte.'),
  P('**A roteirização é uma heurística.** A ordem sugerida das paradas usa o vizinho mais próximo e a distância em linha reta, sem considerar ruas, trânsito ou janelas de tempo. É suficiente para rotas curtas e serve como apoio à decisão do administrador, mas não deve ser lida como rota ótima.'),
  P('**Relação com o que já existe.** Programas consolidados como o Mesa Brasil já fazem a ponte entre doadores e instituições. O diferencial possível do ConectFome é o rastreio por doação, o painel aberto ao receptor e o relatório por doador e receptor, em uma ferramenta aberta e de baixo custo; essa vantagem permanece hipotética até que doadores e instituições reais confirmem que o registro compensa o esforço.'),
  P('**Ameaças à validade.** (i) Os dados de demonstração são sintéticos e não há avaliação com usuários. (ii) Os testes unitários usam o banco simulado, e os de integração cobrem apenas parte do sistema. (iii) A geocodificação depende de um serviço público e de endereços bem preenchidos. (iv) As estimativas de mercado dependem de dados secundários consultados por meio de publicações da imprensa e de páginas institucionais, e o cálculo por proporção populacional pode superestimar o público de Sorocaba, cuja renda per capita é superior à média nacional.'),
]

const conclusao = [
  H1('6. Conclusões'),
  bullet('O ConectFome implementa um fluxo completo de redistribuição, do cadastro e da oferta à confirmação de recebimento, com ciclo de sete estados, histórico de cada ação, comprovante e relatórios de alimento resgatado por mês, por doador e por receptor.'),
  bullet(`As regras de transição e de permissão são verificadas por testes automatizados (${M.backendTestsPassed} de ${M.backendTests} aprovados no backend na última medição).`),
  bullet('O artefato atende às necessidades levantadas para a doadora, o receptor e a administradora: painel de oportunidades com urgência, rotas com mapa e capacidade do veículo, comprovante e histórico.'),
  bullet('Os limites assumidos são a roteirização heurística, a segurança sanitária declaratória e a ausência de notificações externas.'),
  bullet('Sem avaliação com usuários, não se pode afirmar que a plataforma reduz desperdício ou aumenta a doação; afirma-se que ela torna o fluxo registrável, rastreável e mensurável.'),
]

const futuros = [
  H1('7. Estudos Futuros'),
  bullet('Entrevistas, teste de usabilidade e piloto com doadores e ONGs de Sorocaba e Votorantim, medindo o tempo entre o registro e a coleta, a taxa de vencimento e o esforço de registro.'),
  bullet('Comportamento do sistema com muitos receptores disputando as mesmas doações e regras alternativas de reserva.'),
  bullet('Roteirização otimizada com janelas de tempo e serviço de rotas em tempo real.'),
  bullet('Registro de temperatura e integração com a vigilância sanitária local.'),
  bullet('Notificações externas (e-mail, push, WhatsApp) e aplicativo móvel para voluntários.'),
  bullet('Levantamento do número real de estabelecimentos de Sorocaba no Cadastro Central de Empresas (IBGE) para substituir a estimativa proporcional de mercado.'),
]

const refs = [
  H1('Referências'),
  ref('BRASIL. **Lei nº 15.224, de 30 de setembro de 2025**. Institui a Política Nacional de Combate à Perda e ao Desperdício de Alimentos e o Selo Doador de Alimentos, e revoga a Lei nº 14.016/2020. Brasília, DF: Presidência da República, 2025.'),
  ref('EMPRESA BRASILEIRA DE PESQUISA AGROPECUÁRIA (EMBRAPA). **Mundo desperdiça mais de 1 bilhão de refeições por dia, segundo a ONU**. Brasília, DF: Embrapa, 27 mar. 2024. Disponível em: embrapa.br. Acesso em: 29 out. 2026.'),
  ref('HEVNER, Alan R. et al. Design science in information systems research. **MIS Quarterly**, v. 28, n. 1, p. 75-105, 2004.'),
  ref('INSTITUTO BRASILEIRO DE GEOGRAFIA E ESTATÍSTICA (IBGE). **Pesquisa Nacional por Amostra de Domicílios Contínua: Segurança Alimentar 2024**. Rio de Janeiro: IBGE, 2025. Disponível em: agenciadenoticias.ibge.gov.br. Acesso em: 29 out. 2026.'),
  ref('ORGANIZAÇÃO DAS NAÇÕES UNIDAS (ONU). **Transformando nosso mundo**: a Agenda 2030 para o Desenvolvimento Sustentável. 2015.'),
  ref('PEFFERS, Ken et al. A design science research methodology for information systems research. **Journal of Management Information Systems**, v. 24, n. 3, p. 45-77, 2007.'),
  ref('SERVIÇO SOCIAL DO COMÉRCIO – SESC SÃO PAULO. **Mesa Brasil comemora resultados de 2018 no Sesc Sorocaba**. São Paulo: Sesc SP, 9 nov. 2018. Disponível em: portal.sescsp.org.br. Acesso em: 29 out. 2026.'),
  ref('UNITED NATIONS ENVIRONMENT PROGRAMME (UNEP). **Food Waste Index Report 2024**: think eat save – tracking progress to halve global food waste. Nairobi: UNEP, 2024. Disponível em: unep.org. Acesso em: 29 out. 2026.'),
]

const doc = new Document({
  creator: 'Equipe ConectFome',
  title: 'ConectFome – Artigo',
  styles,
  numbering,
  sections: [
    {
      properties: { page: PAGE },
      footers: { default: footer('ConectFome · Artigo') },
      children: [...head, ...intro, ...problema, ...metodo, ...resultados, ...discussao, ...conclusao, ...futuros, ...refs],
    },
  ],
})

Packer.toBuffer(doc).then((b) => {
  const out = path.join(__dirname, '..', 'ARTIGO_CONECTFOME.docx')
  fs.writeFileSync(out, b)
  console.log('ok', out, b.length)
})
