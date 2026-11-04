# Documentação acadêmica (UPX2)

- `DOCUMENTACAO_CONECTFOME.docx` / `.pdf` — documentação escrita completa (16 seções).
- `ARTIGO_CONECTFOME.docx` / `.pdf` — artigo científico.
- `PLANO_DE_FECHAMENTO.docx` / `.pdf` — o que falta construir e validar para os documentos ficarem verdadeiros. **Leia antes de entregar.**
- `figuras/` — figuras usadas nos documentos.
- `gerador/` — scripts que geram tudo. Os números (testes, rotas, linhas) vêm de `gerador/metricas.js`, não são digitados.

Regenerar: `node docs/gerador/metricas.js && python3 docs/gerador/figs.py && docs/gerador/build_doc.sh && node docs/gerador/artigo.js && node docs/gerador/plano.js`
(requer `npm ci` no backend, `docx` e Python com matplotlib/Pillow, LibreOffice).

## Telas

- `telas/` — 50 prints (PNG), um por tela, gerados por `scripts/capturar-telas.cjs`, que percorre o fluxo completo com doador, receptor e administrador (e no celular) e confere o resultado de cada passo.
- `TELAS_CONECTFOME.docx` / `.pdf` — catálogo com todas as telas, uma por página, e `TELAS_PNG_CONECTFOME.zip` com os PNGs.
- Para refazer: backend com `GEOCODING_ENABLED=false RATE_LIMIT_MAX=100000 AUTH_RATE_LIMIT_MAX=1000`, banco recriado (`npx prisma migrate reset --force`), frontend em :5173 e `NODE_PATH=$(npm root -g) node scripts/capturar-telas.cjs`; depois `node docs/gerador/telas.js`.
