// Mede o estado REAL do código e grava metrics.json. Os documentos leem daqui,
// então nenhum número (testes, rotas, linhas) é digitado à mão.
// Uso: node docs/gerador/metricas.js   (requer `npm ci` no backend)
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..', '..')
const sh = (cmd, cwd) => execSync(cmd, { cwd, encoding: 'utf8', maxBuffer: 1 << 26 })
const files = (dir, re) =>
  sh(`git ls-files ${dir}`, root).split('\n').filter((f) => re.test(f))
const lines = (list) => list.reduce((n, f) => n + fs.readFileSync(path.join(root, f), 'utf8').split('\n').length, 0)

const out = {}
const report = JSON.parse(
  sh('npx vitest run --reporter=json 2>/dev/null', path.join(root, 'backend')).replace(/^[^{]*/, ''),
)
out.backendTests = report.numTotalTests
out.backendTestsPassed = report.numPassedTests
out.backendTestFiles = report.numTotalTestSuites ? report.testResults.length : 0
out.perFile = {}
for (const t of report.testResults) {
  out.perFile[path.basename(t.name).replace(/\.test\.ts$/, '')] = t.assertionResults.length
}
out.routes = files('backend/src/routes', /\.ts$/).reduce(
  (n, f) => n + (fs.readFileSync(path.join(root, f), 'utf8').match(/router\.(get|post|put|patch|delete)\(/g) || []).length, 0)
out.models = (fs.readFileSync(path.join(root, 'backend/prisma/schema.prisma'), 'utf8').match(/^model /gm) || []).length
out.enums = (fs.readFileSync(path.join(root, 'backend/prisma/schema.prisma'), 'utf8').match(/^enum /gm) || []).length
out.backendLoc = lines(files('backend/src', /\.ts$/))
out.frontendLoc = lines(files('frontend/src', /\.tsx?$/))
out.frontendPages = files('frontend/src/pages', /Page\.tsx$|Dashboard\.tsx$|Login\.tsx$|Register\.tsx$/).length
const feTests = files('frontend/tests', /\.test\.tsx?$/)
out.frontendTestFiles = feTests.length
out.frontendTests = feTests.reduce((n, f) => n + (fs.readFileSync(path.join(root, f), 'utf8').match(/^\s*(it|test)\(/gm) || []).length, 0)
out.generatedAt = new Date().toISOString().slice(0, 10)
fs.writeFileSync(path.join(__dirname, 'metrics.json'), JSON.stringify(out, null, 2))
console.log(out)
