const L = require('./lib')
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
  abs('Mercados, restaurantes e feiras descartam alimentos próprios para consumo, enquanto 24,2% dos domicílios brasileiros convivem com algum grau de insegurança alimentar. A ligação entre os dois lados costuma depender de contatos informais, sem registro do que foi doado. Este trabalho apresenta o ConectFome, uma plataforma web que registra doações, reserva cada uma para um receptor, organiza a coleta em rotas com veículo e voluntário e mede o alimento efetivamente resgatado. A pesquisa seguiu a abordagem de Design Science: o problema foi caracterizado com dados secundários, o artefato foi construído em fases incrementais (Node/Express, PostgreSQL/Prisma e React) e avaliado por testes automatizados e por demonstração com dados sintéticos. O artefato implementa 14 requisitos funcionais em 48 rotas de API e um ciclo de vida de doação com sete estados; seus 81 testes automatizados passaram na execução feita para este artigo. A avaliação não envolveu usuários reais, e parte do que as personas pedem (painel de oportunidades para o receptor, alertas de validade, mapa de rotas e registro de quem executa cada ação) não foi entregue. Conclui-se que o artefato viabiliza o rastreio e a medição do resgate, mas que sua utilidade para doadores e ONGs ainda precisa ser validada em campo.'),
  new Paragraph({ spacing: { before: 80, after: 160 }, children: L.runs('**Palavras-chave:** desperdício de alimentos; doação de alimentos; rastreabilidade; sistema web; ODS 2 e 12.', { size: 22 }) }),
  new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun({ text: 'Abstract', bold: true, size: 24, font: FONT, color: GREEN })] }),
  abs('Supermarkets, restaurants and street markets discard food that is still fit for consumption, while 24.2% of Brazilian households face some degree of food insecurity. Connecting both sides usually relies on informal contacts, with no record of what was donated. This paper presents ConectFome, a web platform that records donations, reserves each one for a recipient, organizes pickup routes and measures the food actually rescued. Following a Design Science approach, the artifact was built incrementally and evaluated through automated tests and a demonstration with synthetic data. It implements 14 functional requirements and its 81 automated tests passed. No real users took part in the evaluation, so its usefulness for donors and NGOs remains to be validated in the field.'),
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
  P('Desdobram-se duas perguntas: (a) que modelo de estados da doação permite separar o que foi resgatado, entregue, cancelado e perdido? (b) que parte das necessidades de dois perfis de usuário (doador e receptor) o primeiro incremento do sistema consegue atender?'),
]

const metodo = [
  H1('3. Metodologia'),
  P('A pesquisa é de natureza aplicada e segue a Design Science Research (HEVNER et al., 2004), cujo produto é um artefato avaliado quanto à sua utilidade. Foram percorridas as atividades do processo de Peffers et al. (2007), descritas a seguir.'),
  table(
    ['Atividade', 'O que foi feito'],
    [
      ['Identificação do problema', 'Revisão de dados secundários (UNEP, IBGE, ONU, legislação, Mesa Brasil Sesc) e mapa mental da solução'],
      ['Objetivos da solução', 'Duas personas (doador e receptor), canvas de proposta de valor e Lean Canvas; 14 requisitos funcionais'],
      ['Projeto e desenvolvimento', 'Modelo relacional com 8 entidades; API REST em Node.js/Express/TypeScript com Prisma e PostgreSQL; interface em React, Vite e Tailwind; fases incrementais, uma por módulo'],
      ['Demonstração', 'Dados de exemplo (seed) com cinco contas e doações em quatro estados distintos, e leitura do relatório produzido'],
      ['Avaliação', '81 testes automatizados dos serviços e middlewares do backend; análise da cobertura de requisitos por testes; comparação do que foi entregue com o que as personas necessitam'],
      ['Comunicação', 'Este artigo e a documentação do projeto'],
    ],
    [2400, 6671],
  ),
  spacer(),
  P('A organização do trabalho em equipe usou um quadro Kanban no Trello e versionamento em Git. A integração contínua executa instalação, auditoria de dependências, testes e compilação. Os testes são unitários, com o acesso ao banco simulado; a consulta SQL do relatório mensal foi conferida manualmente contra um PostgreSQL real durante o desenvolvimento e não é coberta por teste automatizado.'),
  P('**Limitação deliberada de escopo:** não houve entrevistas, teste de usabilidade nem piloto com usuários. As personas foram elaboradas pela equipe e são, por isso, hipóteses sobre os usuários e não achados empíricos.'),
]

const resultados = [
  H1('4. Resultados'),
  H2('4.1 O artefato'),
  P('O ConectFome é um monorepo com backend e frontend. A Tabela 1 resume suas dimensões. As contagens de linhas consideram apenas os diretórios de código-fonte (src).'),
  table(
    ['Característica', 'Valor'],
    [
      ['Requisitos funcionais implementados', '14 (cadastros, doações, rotas, confirmação de recebimento e relatórios)'],
      ['Entidades e enumerações do banco', '8 modelos e 6 enumerações'],
      ['Rotas REST registradas', '48'],
      ['Papéis de acesso', '3 (administrador, doador, receptor)'],
      ['Páginas do frontend', '13 telas organizadas por módulo (doadores, receptores, doações, rotas, voluntários, veículos, relatórios, painel, login e cadastro)'],
      ['Código-fonte', 'cerca de 2.460 linhas no backend e 4.280 no frontend (arquivos .ts e .tsx em src)'],
    ],
    [3400, 5671],
  ),
  caption('Tabela 1 – Dimensões do artefato.'),
  P('O resultado de maior peso para a pergunta (a) é o ciclo de vida da doação (Figura 1). Cada estado exige uma ação distinta de um ator específico e as saídas de cancelamento e vencimento só partem de disponível ou reservada. O relatório considera “resgatado” o alimento das doações coletadas e entregues, somando a quantidade efetivamente coletada, que pode diferir da estimada pelo doador.'),
  fig('ciclo_doacao.png', 540),
  caption('Figura 1 – Ciclo de vida da doação implementado.'),
  H2('4.2 Testes automatizados'),
  P('Na execução feita para este artigo, os 9 arquivos de teste do backend somaram 81 testes, todos aprovados (Figura 2). As regras mais exercitadas são as de transição de estado e de permissão: por exemplo, rejeitar o casamento de uma doação que não esteja disponível, impedir que outro doador cancele a doação alheia, impedir a confirmação de recebimento antes da coleta, rejeitar o início de uma rota sem doações e devolver as doações ao estado reservada quando a rota é cancelada.'),
  fig('testes_por_modulo.png', 420),
  caption('Figura 2 – Testes automatizados do backend por arquivo (81 no total).'),
  P('A Tabela 2 relaciona os requisitos aos testes. Dois pontos merecem destaque: os cadastros de voluntários e veículos (RF09) não têm teste automatizado próprio, e o frontend tem testes apenas nas telas de login e cadastro.'),
  table(
    ['Requisitos', 'Arquivo de teste', 'Testes'],
    [
      ['RF01, RF02 (cadastro e login)', 'AuthService, jwt, auth-middleware, verifyCsrf', '29'],
      ['RF03 (doadores)', 'DonorService', '8'],
      ['RF04 (receptores)', 'RecipientService', '5'],
      ['RF05 a RF08, RF12, RF14 (doações)', 'DonationService', '18'],
      ['RF10, RF11 (rotas de coleta)', 'PickupRouteService', '16'],
      ['RF13 (relatórios)', 'ReportService', '5'],
      ['RF09 (voluntários e veículos)', 'sem teste automatizado', '0'],
    ],
    [3300, 4371, 1400],
  ),
  caption('Tabela 2 – Cobertura dos requisitos por testes automatizados.'),
  H2('4.3 Demonstração com dados sintéticos'),
  P('O seed do projeto cria cinco contas (administrador, dois doadores e dois receptores), dois voluntários, dois veículos e quatro doações, uma em cada estado: disponível, reservada, vencida e entregue (esta, no mês anterior). A Tabela 3 mostra como o relatório trata esse conjunto. Os valores são fictícios e servem apenas para demonstrar a separação entre resgatado e perdido; **não representam resultado de campo**.'),
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
    ['Necessidade apontada', 'Persona', 'Situação'],
    [
      ['Cadastro rápido do lote com validade e janela', 'Doadora', 'Atendida'],
      ['Histórico e relatório mensal do volume doado', 'Doadora', 'Atendida (relatório por mês e por doador)'],
      ['Confirmação de data/hora e de quem retira', 'Doadora', 'Parcial: janela e voluntário existem na rota; sem notificação'],
      ['Comprovante formal das doações', 'Doadora', 'Parcial: registro de datas, sem registrar quem executou cada ação'],
      ['Painel de oportunidades por proximidade', 'Receptor', 'Não atendida'],
      ['Alertas de validade e prioridade', 'Receptor', 'Não atendida'],
      ['Agrupamento de coletas para otimizar o veículo', 'Receptor', 'Parcial: a rota agrupa doações, sem mapa nem otimização'],
    ],
    [3700, 1300, 4071],
  ),
  caption('Tabela 4 – Necessidades das personas e situação no MVP.'),
]

const discussao = [
  H1('5. Discussão'),
  P('**O ciclo de estados responde à pergunta (a), e a evidência é de projeto, não de uso.** Modelar a doação como uma sequência de estados com ações próprias é uma decisão defensável do ponto de vista do rastreio e o conjunto de testes confirma que as regras de transição são aplicadas. Isso mostra que o sistema é consistente, mas não demonstra que doadores e ONGs conseguirão ou desejarão operar o fluxo. Em Design Science, a avaliação com usuários é o que fecha o ciclo (HEVNER et al., 2004); aqui ela é a principal lacuna.'),
  P('**O sistema atende mais ao doador e ao administrador do que ao receptor.** A Tabela 4 mostra que as necessidades de previsibilidade do receptor (oportunidades, alertas) não foram atendidas. A causa é uma escolha de arquitetura: quem casa a doação com o receptor é o administrador. Isso simplifica o MVP, mas cria um gargalo humano. Se o volume crescer para dezenas de doadores e instituições, uma única pessoa decidindo cada casamento e cada rota tende a limitar a velocidade, justamente onde o tempo é crítico, pois o alimento perecível tem janela curta. A referência do Mesa Brasil em Sorocaba (21 doadores e 36 instituições em 2018) sugere que a escala de uma operação realista já é maior do que a que um único coordenador consegue casar manualmente com agilidade, hipótese que precisa ser testada.'),
  P('**Rastreabilidade é parcial.** O sistema grava as datas de reserva, coleta, confirmação e cancelamento, mas não o usuário responsável por cada ação, e o vencimento não gera data. Para um doador que deseja comprovar a doação (por exemplo, para o Selo Doador de Alimentos), a informação de quem fez o quê é relevante, e sua ausência enfraquece a promessa de comprovante.'),
  P('**Segurança sanitária não está modelada.** Há categoria de alimento e um campo livre de observações, mas não há registro de temperatura, cadeia de frio ou condições de transporte. Materiais do Mesa Brasil Sesc São Paulo, por exemplo, orientam manter produtos de origem animal a 4 °C (resfriados) ou –18 °C (congelados). Um sistema que organiza coletas de perecíveis precisa, no mínimo, não induzir o uso inadequado; essa lacuna deve ser resolvida antes de qualquer uso real.'),
  P('**Relação com o que já existe.** Programas consolidados como o Mesa Brasil já fazem a ponte entre doadores e instituições. O diferencial possível do ConectFome é o rastreio por doação e o relatório por doador e receptor, em uma ferramenta aberta e de baixo custo; contudo, essa vantagem é hipotética até que doadores e instituições reais confirmem que o registro adicional compensa o esforço.'),
  P('**Ameaças à validade.** (i) As personas não vêm de entrevistas. (ii) Os dados de demonstração são sintéticos. (iii) Os testes usam o banco simulado e, portanto, não detectam falhas de integração com o PostgreSQL, como erros na consulta SQL do relatório. (iv) As estimativas de mercado dependem de dados secundários consultados por meio de publicações da imprensa e de páginas institucionais, e o cálculo por proporção populacional pode superestimar o público de Sorocaba, cuja renda per capita é superior à média nacional.'),
]

const conclusao = [
  H1('6. Conclusões'),
  bullet('O ConectFome implementa um fluxo completo de redistribuição, do cadastro à confirmação de recebimento, com ciclo de sete estados e relatório de alimento resgatado por mês, por doador e por receptor.'),
  bullet('As regras de transição e de permissão são verificadas por 81 testes automatizados aprovados; os cadastros de voluntários e veículos e a consulta SQL do relatório não têm teste automatizado.'),
  bullet('O artefato atende bem à doadora e ao administrador e atende parcialmente ao receptor: não há painel de oportunidades, alertas de validade nem mapa de rotas, e a decisão de casar doações depende de uma pessoa.'),
  bullet('A rastreabilidade registra quando, mas não quem, e a segurança sanitária das coletas não é modelada.'),
  bullet('Sem avaliação com usuários, não se pode afirmar que a plataforma reduz desperdício ou aumenta a doação; afirma-se apenas que ela torna o fluxo registrável e mensurável.'),
]

const futuros = [
  H1('7. Estudos Futuros'),
  bullet('Entrevistas e piloto com doadores e ONGs de Sorocaba e Votorantim, medindo o tempo entre o registro e a coleta, a taxa de vencimento e o esforço de registro.'),
  bullet('Painel de oportunidades e alertas de validade para o receptor, que reduzem a dependência do administrador no casamento.'),
  bullet('Registro do usuário e da data em cada transição, incluindo o vencimento.'),
  bullet('Geocodificação, mapa e verificação de capacidade do veículo nas rotas.'),
  bullet('Campos de segurança sanitária (temperatura, tipo de embalagem, prazo máximo de retirada) e validação com o órgão sanitário local.'),
  bullet('Testes de integração com banco real e testes de usabilidade.'),
  bullet('Levantamento do número real de estabelecimentos de Sorocaba no Cadastro Central de Empresas (IBGE) para substituir a estimativa proporcional.'),
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
