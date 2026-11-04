interface LogoProps {
  size?: number
  // "light": coração branco (sobre fundo verde). "dark": coração verde (sobre fundo claro).
  tone?: 'light' | 'dark'
  withText?: boolean
  className?: string
}

// Marca do ConectaFome: um coração (quem doa e quem recebe) com uma folha
// brotando no centro (alimento e sustentabilidade). Desenhada aqui em SVG, sem
// imagem externa, para funcionar em qualquer tamanho e fundo.
export function Logo({ size = 32, tone = 'dark', withText = true, className = '' }: LogoProps) {
  const heart = tone === 'light' ? '#ffffff' : '#047857'
  const leaf = tone === 'light' ? '#047857' : '#ffffff'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="ConectaFome" fill="none">
        <path
          d="M12 21.2s-8.2-5-9.9-10.3C1 7.4 2.9 4 6.4 4c2.1 0 3.8 1.1 5.6 3.1C13.8 5.1 15.5 4 17.6 4c3.5 0 5.4 3.4 4.3 6.9C20.2 16.2 12 21.2 12 21.2z"
          fill={heart}
        />
        <path d="M12 17.2v-4.1" stroke={leaf} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M12 13.4c0-2.4 1.4-4 3.7-4.2 0 2.5-1.3 4.1-3.7 4.2z" fill={leaf} />
        <path d="M12 14.4c0-2-1.2-3.4-3.3-3.6 0 2.2 1.2 3.6 3.3 3.6z" fill={leaf} opacity="0.85" />
      </svg>
      {withText && (
        <span className={`text-lg font-semibold tracking-tight ${tone === 'light' ? 'text-white' : 'text-emerald-900'}`}>
          ConectaFome
        </span>
      )}
    </span>
  )
}
