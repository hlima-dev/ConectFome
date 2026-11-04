import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './Logo'

interface AuthShellProps {
  // Texto de apoio no painel verde (some em telas pequenas, onde o painel vira uma faixa).
  headline: string
  tagline: string
  title: string
  subtitle?: string
  children: ReactNode
}

// Moldura das telas de entrada: painel verde de marca à esquerda e o
// formulário à direita. No celular o painel vira uma faixa no topo.
export function AuthShell({ headline, tagline, title, subtitle, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative overflow-hidden bg-emerald-900 px-6 py-6 text-emerald-50 lg:flex lg:flex-col lg:justify-center lg:px-14 lg:py-12">
        <Link to="/inicio" aria-label="Ir para a página inicial" className="relative z-10 inline-block">
          <Logo tone="light" size={36} />
        </Link>
        <div className="relative z-10 hidden lg:mt-16 lg:block">
          <h2 className="max-w-xs text-3xl font-semibold leading-tight text-white">{headline}</h2>
          <p className="mt-3 max-w-xs text-emerald-100">{tagline}</p>
        </div>
        <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute -bottom-10 -left-8 hidden h-72 w-72 text-emerald-700/60 lg:block" fill="currentColor">
          <path d="M20 190c0-80 40-140 150-170-5 80-45 140-150 170z" />
          <path d="M60 190c0-55 28-95 100-115-3 55-30 95-100 115z" opacity="0.6" />
        </svg>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  )
}
