// Decide o que o seed pode criar. Em produção o padrão é só o administrador,
// com e-mail e senha vindos do ambiente: o seed de demonstração usa uma senha
// pública (está no README), então só roda em produção por opt-in explícito.
export type SeedPlan =
  | { mode: 'demo' }
  | { mode: 'admin-only'; name: string; email: string; password: string }

const PUBLIC_DEMO_PASSWORD = 'Conect@123'
const MIN_ADMIN_PASSWORD_LENGTH = 12

export function resolveSeedPlan(env: NodeJS.ProcessEnv): SeedPlan {
  if (env.NODE_ENV !== 'production' || env.SEED_DEMO === 'true') {
    return { mode: 'demo' }
  }

  const email = env.ADMIN_EMAIL?.trim()
  const password = env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('Em produção, defina ADMIN_EMAIL e ADMIN_PASSWORD para criar o administrador (ou SEED_DEMO=true só para demonstração).')
  }
  if (password === PUBLIC_DEMO_PASSWORD) {
    throw new Error('ADMIN_PASSWORD não pode ser a senha pública de demonstração.')
  }
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_PASSWORD deve ter ao menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.`)
  }

  return { mode: 'admin-only', name: env.ADMIN_NAME?.trim() || 'Administrador ConectFome', email, password }
}
