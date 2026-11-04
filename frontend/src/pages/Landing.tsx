import { Link } from 'react-router-dom'
import { Boxes, HandHeart, MapPinned, ReceiptText, Recycle, Soup, Sprout, Truck, Warehouse } from 'lucide-react'
import { Logo } from '../components/Logo'

const steps = [
  { icon: Warehouse, title: 'O doador registra', text: 'Mercados, restaurantes e feiras cadastram o excedente com validade, janela de coleta e condição de armazenamento.' },
  { icon: HandHeart, title: 'A instituição reserva', text: 'ONGs e famílias veem as oportunidades, das mais urgentes para as menos, e reservam o que conseguem aproveitar.' },
  { icon: Truck, title: 'O voluntário coleta', text: 'A administração monta a rota com veículo e voluntário, com mapa, ordem das paradas e controle de carga.' },
  { icon: ReceiptText, title: 'Tudo fica registrado', text: 'O receptor confirma o recebimento, o doador emite o comprovante e o relatório mede o que foi resgatado.' },
]

const audiences = [
  { icon: Boxes, title: 'Doadores', text: 'Reduzem o descarte, ganham histórico e comprovante de cada doação e relatórios para prestação de contas.' },
  { icon: Soup, title: 'Receptores', text: 'Sabem o que está disponível e quando vence, reservam pelo painel e planejam a coleta.' },
  { icon: MapPinned, title: 'Administração', text: 'Coordena reservas, rotas e voluntários e acompanha os indicadores de impacto.' },
]

const indicators = [
  'Quilogramas resgatados por mês',
  'Taxa de resgate e perda antes da coleta',
  'Tempo entre o registro e a coleta',
  'Pessoas atendidas pelas instituições',
]

export function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Principal">
          <Link to="/inicio" aria-label="ConectaFome, página inicial">
            <Logo />
          </Link>
          <div className="flex items-center gap-4 text-sm sm:gap-6">
            <a href="#sobre" className="hidden text-slate-600 hover:text-emerald-800 sm:inline">Sobre</a>
            <a href="#como-funciona" className="hidden text-slate-600 hover:text-emerald-800 sm:inline">Como funciona</a>
            <a href="#impacto" className="hidden text-slate-600 hover:text-emerald-800 sm:inline">Impacto</a>
            <Link to="/login" className="font-medium text-slate-700 hover:text-emerald-800">Entrar</Link>
            <Link to="/cadastro" className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white hover:bg-emerald-900">
              Cadastrar-se
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="bg-gradient-to-b from-emerald-50 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
            <div>
              <h1 className="text-4xl font-bold leading-tight text-emerald-950 sm:text-5xl">Conectando quem doa a quem precisa</h1>
              <p className="mt-4 max-w-md text-lg text-slate-600">
                Reduza o desperdício, combata a fome. Juntos por um mundo mais solidário.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/cadastro" className="rounded-lg bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900">
                  Começar agora
                </Link>
                <a href="#como-funciona" className="rounded-lg border border-emerald-800 px-6 py-3 font-semibold text-emerald-900 hover:bg-emerald-50">
                  Saiba mais
                </a>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-700">
                <li className="flex items-center gap-2"><Sprout size={20} className="text-emerald-700" aria-hidden="true" /> <span><strong>ODS 2</strong> · Fome Zero</span></li>
                <li className="flex items-center gap-2"><Recycle size={20} className="text-emerald-700" aria-hidden="true" /> <span><strong>ODS 12</strong> · Consumo e Produção Responsáveis</span></li>
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-emerald-100" />
              <div className="relative flex aspect-square items-center justify-center rounded-[2rem] bg-emerald-800 p-10">
                <svg viewBox="0 0 220 200" className="h-full w-full">
                  <rect x="40" y="80" width="140" height="100" rx="10" fill="#d6a96b" />
                  <rect x="40" y="80" width="140" height="22" rx="8" fill="#c0905a" />
                  <path d="M110 168s-26-16-31-32c-3-10 3-20 13-20 7 0 13 4 18 10 5-6 11-10 18-10 10 0 16 10 13 20-5 16-31 32-31 32z" fill="#047857" />
                  <path d="M110 150v-12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  <path d="M110 140c0-8 5-13 13-14 0 8-5 13-13 14z" fill="#fff" />
                  <circle cx="70" cy="62" r="26" fill="#ef4444" />
                  <circle cx="112" cy="50" r="24" fill="#f59e0b" />
                  <circle cx="152" cy="64" r="22" fill="#84cc16" />
                  <path d="M70 38c4-8 10-10 14-10" stroke="#166534" strokeWidth="4" strokeLinecap="round" fill="none" />
                  <path d="M112 28c-2-8 2-14 8-16" stroke="#166534" strokeWidth="4" strokeLinecap="round" fill="none" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section id="sobre" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-14 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-emerald-950">Excedente de um lado, fome do outro</h2>
          <p className="mt-4 text-slate-600">
            Alimentos próprios para consumo são descartados todos os dias, enquanto 24,2% dos domicílios brasileiros convivem com algum
            grau de insegurança alimentar (IBGE, PNAD Contínua 2024). O ConectaFome organiza a ligação entre os dois lados: cadastro,
            reserva, coleta, entrega e registro de tudo o que foi resgatado.
          </p>
        </section>

        <section id="como-funciona" className="scroll-mt-20 bg-emerald-50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold text-emerald-950">Como funciona</h2>
            <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li key={step.title} className="rounded-2xl bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-800 text-white">
                      <step.icon size={20} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold text-emerald-700">Passo {index + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-emerald-950">Para quem é</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {audiences.map((a) => (
              <div key={a.title} className="rounded-2xl border border-emerald-100 p-6">
                <a.icon size={28} className="text-emerald-700" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{a.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{a.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="impacto" className="scroll-mt-20 bg-emerald-900 py-14 text-emerald-50">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-bold text-white">Impacto que dá para medir</h2>
            <p className="mt-3 text-emerald-100">Cada doação percorre estados registrados, e o relatório mostra o que foi resgatado e o que se perdeu.</p>
            <ul className="mt-8 grid gap-3 text-left sm:grid-cols-2">
              {indicators.map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-xl bg-emerald-800 px-4 py-3">
                  <Sprout size={18} className="shrink-0 text-emerald-300" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/cadastro" className="mt-10 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-emerald-900 hover:bg-emerald-50">
              Faça parte dessa corrente do bem
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-100 py-8 text-center text-sm text-slate-500">
        <Logo size={24} className="mb-2" />
        <p>Tecnologia a favor de um mundo sem fome.</p>
        <p className="mt-1">Projeto acadêmico · UPX2 · Centro Universitário Facens</p>
      </footer>
    </div>
  )
}
