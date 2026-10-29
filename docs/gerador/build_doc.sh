#!/bin/bash
# build em duas passadas: 1) gera, 2) mede páginas, 3) gera de novo com o sumário preenchido
set -e
cd "$(dirname "$0")"
SK=$(ls -d /root/.claude/skills/synced/*/docx)
R=${RENDER_DIR:-/tmp/render_doc}; mkdir -p $R
rm -f toc.json
DUMP=1 node documentacao.js >/dev/null
python3 $SK/scripts/office/soffice.py --headless --convert-to pdf --outdir $R ../DOCUMENTACAO_CONECTFOME.docx >/dev/null 2>&1
python3 paginas.py $R/DOCUMENTACAO_CONECTFOME.pdf .
node documentacao.js
python3 $SK/scripts/office/soffice.py --headless --convert-to pdf --outdir $R ../DOCUMENTACAO_CONECTFOME.docx >/dev/null 2>&1
python3 paginas.py $R/DOCUMENTACAO_CONECTFOME.pdf . 
