# Documentação acadêmica (UPX2)

- `DOCUMENTACAO_CONECTFOME.docx` / `.pdf` — documentação escrita completa (16 seções).
- `ARTIGO_CONECTFOME.docx` / `.pdf` — artigo científico.
- `PLANO_DE_FECHAMENTO.docx` / `.pdf` — o que falta construir e validar para os documentos ficarem verdadeiros. **Leia antes de entregar.**
- `figuras/` — figuras usadas nos documentos.
- `gerador/` — scripts que geram tudo. Os números (testes, rotas, linhas) vêm de `gerador/metricas.js`, não são digitados.

Regenerar: `node docs/gerador/metricas.js && python3 docs/gerador/figs.py && docs/gerador/build_doc.sh && node docs/gerador/artigo.js && node docs/gerador/plano.js`
(requer `npm ci` no backend, `docx` e Python com matplotlib/Pillow, LibreOffice).
