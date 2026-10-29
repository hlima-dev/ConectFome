import { defineConfig } from 'vitest/config'

// Testes de integração: rodam contra um PostgreSQL real (INTEGRATION_DATABASE_URL),
// com o schema já migrado (`npx prisma migrate deploy`). Ficam fora do `npm test`
// padrão, que usa Prisma simulado.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    setupFiles: ['./tests/integration/setup.ts'],
    fileParallelism: false,
  },
})
