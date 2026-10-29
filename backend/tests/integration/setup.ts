// Usa o banco real indicado em INTEGRATION_DATABASE_URL (nunca o DATABASE_URL de
// desenvolvimento, para não apagar dados por engano).
const url = process.env.INTEGRATION_DATABASE_URL
if (!url) {
  throw new Error('Defina INTEGRATION_DATABASE_URL (um banco descartável, já migrado) para rodar os testes de integração.')
}
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = url
process.env.JWT_SECRET = 'test_jwt_secret_de_pelo_menos_32_caracteres'
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_de_pelo_menos_32_caracteres'
process.env.APP_URL = 'http://localhost:5173'
