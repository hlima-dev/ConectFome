# 🍎 ConectFome

Plataforma de doação e resgate de alimentos que conecta **doadores**
(mercados, restaurantes, feiras) a **receptores** (ONGs e famílias em
situação de vulnerabilidade), redistribuindo alimentos que seriam
descartados. Projeto de faculdade baseado nos Objetivos de
Desenvolvimento Sustentável da ONU.

## Sobre o projeto e os ODS

Todos os dias, mercados, restaurantes e feiras descartam alimentos em
condições de consumo — só não vendáveis pelo padrão estético ou pelo
prazo comercial, não pela segurança alimentar. Do outro lado, ONGs e
famílias em vulnerabilidade enfrentam insegurança alimentar diária. O
ConectFome existe para fechar essa distância: cadastro de doadores e
receptores, agendamento de coleta com rotas e voluntários, e um
relatório de quanto alimento foi efetivamente resgatado por mês.

- **ODS 2 — Fome Zero**: cada doação que chega a `ENTREGUE` é comida que
  chegou a quem precisava, em vez de ser descartada. O ciclo de status
  da doação (abaixo) existe justamente para que essa entrega seja um
  evento registrado e mensurável, não uma promessa.
- **ODS 12 — Consumo e Produção Responsáveis**: o alimento resgatado é
  produção que já aconteceu — energia, água e trabalho já gastos — que
  o ConectFome evita jogar fora. O relatório de kg resgatado por mês
  (`/relatorios`) é o indicador direto desse impacto, e o estado
  `VENCIDA` existe para tornar visível, e não esconder, o que ainda se
  perde antes da coleta.

## Arquitetura

Monorepo com backend e frontend separados, mesma fundação de auth/
estrutura do projeto ATHLO (Node/Express/Prisma) e o mesmo raciocínio de
modelagem de logística do PRODUCTION ERP (veículo/motorista/romaneio →
aqui veículo/voluntário/rota de coleta), reimplementados em Prisma —
não código copiado, já que os stacks de origem são diferentes.

```
conectfome/
├── backend/                  # Node + Express + TypeScript + Prisma + PostgreSQL
│   ├── prisma/
│   │   ├── schema.prisma     # 8 modelos, 6 enums
│   │   └── seed.ts           # dados de exemplo (idempotente)
│   ├── src/
│   │   ├── config/           # env (Zod) e cliente Prisma
│   │   ├── controllers/      # validação (Zod) + chamada ao service
│   │   ├── services/         # regra de negócio
│   │   ├── middlewares/      # auth, CSRF, rate limit, erro
│   │   ├── routes/           # mapeamento REST
│   │   └── utils/            # AppError, JWT, cookies, paginação
│   └── tests/                # Vitest — services e middlewares
└── frontend/                 # React + Vite + TypeScript + Tailwind
    └── src/
        ├── components/       # DataTable, Modal, ConfirmDialog, StatusBadge
        ├── layouts/          # AppLayout (nav por papel)
        ├── routes/           # PrivateRoute, RoleRoute
        ├── services/         # chamadas à API (axios)
        ├── hooks/            # TanStack Query
        ├── pages/            # telas, organizadas por módulo
        └── types/            # tipos e labels de cada domínio
```

## Papéis e autenticação

Três papéis: **ADMIN** (nasce só via seed, nunca por cadastro público),
**DOADOR** e **RECEPTOR**. Login em cookies httpOnly (access + refresh),
proteção CSRF por dupla submissão, bloqueio de conta após 5 tentativas
de senha erradas em 15 minutos, e mensagens de erro genéricas no login
pra não vazar quais e-mails existem.

O cadastro público (`/cadastro`) cria o `User` e, na mesma transação, o
perfil `Donor` ou `Recipient` vinculado, conforme o papel escolhido.

## O ciclo da doação (o hub do projeto)

```
DISPONÍVEL → RESERVADA → AGENDADA → COLETADA → ENTREGUE
    │             │
    └── CANCELADA ┘
    └── VENCIDA ───┘
```

- **DISPONÍVEL**: o doador cadastrou, ainda sem receptor.
- **RESERVADA**: o admin casou a doação com um receptor.
- **AGENDADA**: entrou numa rota de coleta planejada.
- **COLETADA**: a rota foi concluída — o voluntário coletou de fato.
  **Esse é o evento que conta como "resgatado" no relatório.**
- **ENTREGUE**: o receptor confirmou o recebimento — ação própria dele,
  independente da rota.
- **CANCELADA** / **VENCIDA**: saídas a partir dos estados iniciais,
  registrando o que não virou resgate — o contraste com o que foi
  resgatado é, em si, parte do indicador de ODS 12.

Cada estado é uma ação distinta e rastreável (quem fez, quando), em vez
de um único campo "concluído" — é isso que permite ao relatório separar
"resgatado" de "entregue" de "perdido".

## Módulos

| Módulo | O que faz | Quem acessa |
|---|---|---|
| Doadores / Receptores | Cadastro, edição e desativação (soft delete) | ADMIN (CRUD completo); o próprio dono vê/edita seu cadastro |
| Doações | Criar, casar com receptor, cancelar, marcar vencida, confirmar recebimento | DOADOR (as próprias), RECEPTOR (as suas), ADMIN (todas) |
| Voluntários / Veículos | Cadastro simples, com edição | ADMIN |
| Rotas de coleta | Criar, anexar/desanexar doação, iniciar, concluir, cancelar | ADMIN |
| Relatórios | Kg resgatado por mês, por doador, por receptor, resumo de KPIs | ADMIN |

## Setup local

Pré-requisitos: Node 20+, PostgreSQL 16+.

```bash
git clone https://github.com/hlima-dev/ConectFome.git
cd ConectFome

# banco de dados
sudo -u postgres psql -c "CREATE ROLE conectfome LOGIN PASSWORD 'conectfome';"
sudo -u postgres psql -c "CREATE DATABASE conectfome_db OWNER conectfome;"

# backend
cd backend
cp .env.example .env      # ajuste DATABASE_URL/JWT_SECRET se preciso
npm install
npx prisma migrate dev
npm run db:seed
npm run dev                # http://localhost:3333

# frontend (em outro terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

### Credenciais de exemplo (seed)

Senha de todas as contas: `Conect@123`

| Papel | E-mail | Perfil |
|---|---|---|
| ADMIN | admin@conectfome.org | — |
| DOADOR | mercado@conectfome.org | Mercado Bom Preço |
| DOADOR | restaurante@conectfome.org | Restaurante Sabor Caseiro |
| RECEPTOR | ong@conectfome.org | ONG Mesa Solidária |
| RECEPTOR | familia@conectfome.org | Lar da Vovó Joana (família) |

O seed também cria 2 voluntários, 2 veículos e doações de exemplo em
`DISPONÍVEL`, `RESERVADA`, `VENCIDA` e uma já `ENTREGUE` no mês
anterior (pra o gráfico de relatório mostrar mais de um mês).

## Testes

```bash
cd backend  && npm run test   # 81 testes — services e middlewares
cd frontend && npm run test   # testes de componente (Login/Register)
```

Escopo deliberado: testes unitários com Prisma mockado (`vi.mock`),
sem integração com banco real — a mesma escolha do projeto ATHLO. A
consulta SQL crua do relatório mensal (`ReportService.monthlyKg`) foi
validada manualmente contra PostgreSQL real durante o desenvolvimento;
o teste unitário cobre o mapeamento da resposta, não a query em si.

## Decisões conscientes (fora do escopo por opção, não por esquecimento)

- **Sem verificação de e-mail nem recuperação de senha por e-mail** —
  reduz a superfície de configuração (sem provedor de e-mail) sem
  comprometer a demonstração do fluxo principal.
- **Sem upload de foto da doação** — o texto da descrição já é
  suficiente pro fluxo de casar/coletar; foto é uma melhoria de UX, não
  uma dependência funcional.
- **Sem cron de vencimento automático** — `VENCIDA` é uma ação manual
  (do doador ou do admin), não um job agendado. Evita a complexidade
  operacional de um scheduler pra uma decisão que, na prática, alguém
  vai querer confirmar de qualquer forma.
- **Voluntários não têm login** — são geridos pelo admin, como no
  `Driver` do projeto de referência (PRODUCTION ERP); no mundo real,
  esse público tende a operar por telefone/WhatsApp, não por painel web.
- **Plataforma única, sem multi-tenant** — ConectFome é uma rede só de
  doadores/receptores, não um SaaS com múltiplas organizações isoladas
  (diferente do ATHLO, de onde vem a fundação de auth).

## Créditos de arquitetura

Fundação de autenticação, estrutura de camadas e padrão de testes
adaptados do projeto **ATHLO**. Raciocínio de modelagem de logística
(veículo/motorista/romaneio) adaptado do **PRODUCTION ERP** — em ambos
os casos, o padrão foi reimplementado em Prisma/Express, não copiado
(os projetos de origem usam Java/Spring).
