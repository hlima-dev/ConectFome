import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  // Os tokens de autenticação vivem em cookies httpOnly do backend — o
  // navegador precisa ser instruído a enviá-los (e recebê-los) em toda
  // chamada, já que o JS não consegue lê-los diretamente (por design).
  withCredentials: true,
})

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete'])

api.interceptors.request.use((config) => {
  // Proteção CSRF por dupla submissão: o backend valida que este header
  // bate com o valor do cookie conectfome_csrf. Só importa em métodos que
  // alteram estado — GET não precisa.
  if (config.method && MUTATING_METHODS.has(config.method)) {
    const csrfToken = localStorage.getItem('@conectfome:csrf')
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

function clearClientSession() {
  localStorage.removeItem('@conectfome:csrf')
  localStorage.removeItem('@conectfome:user')
}

function redirectToLogin() {
  clearClientSession()
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

let refreshInFlight: Promise<boolean> | null = null

// Chamado quando um 401 chega — tenta renovar a sessão via o cookie de
// refresh (também httpOnly) antes de desistir e mandar pro login. Evita
// derrubar o usuário só porque o access token de curta duração expirou.
async function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post('/auth/refresh')
      .then((response) => {
        const csrfToken = response.data?.data?.csrfToken
        if (csrfToken) localStorage.setItem('@conectfome:csrf', csrfToken)
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

// Endpoints "pré-sessão": um 401 aqui é um resultado normal (senha errada),
// não um sinal de sessão expirada — não deve tentar renovar nem
// redirecionar, só devolver o erro pro formulário mostrar a mensagem.
const AUTH_ENTRY_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh']

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const isAuthEntryCall = config?.url && AUTH_ENTRY_ENDPOINTS.includes(config.url)

    if (response?.status === 401 && config && !config._retry && !isAuthEntryCall) {
      config._retry = true
      const refreshed = await tryRefresh()
      if (refreshed) return api(config)
      redirectToLogin()
      return Promise.reject(error)
    }

    if (response?.status === 401 && !isAuthEntryCall) {
      redirectToLogin()
    }

    return Promise.reject(error)
  },
)

export default api
