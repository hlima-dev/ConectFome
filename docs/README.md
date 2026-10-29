# Documentação acadêmica (UPX2)

- `DOCUMENTACAO_CONECTFOME.docx` — documentação escrita completa (16 seções, 24 páginas).
- `ARTIGO_CONECTFOME.docx` — artigo científico (9 páginas).
- `figuras/` — figuras usadas nos dois documentos.
- `gerador/` — scripts que geram os `.docx` (`node gerador/artigo.js`; `gerador/build_doc.sh` para a documentação, que calcula as páginas do sumário em duas passadas). Requer `docx` (npm), `python3` com matplotlib/Pillow para as figuras (`gerador/figs.py`) e LibreOffice.
