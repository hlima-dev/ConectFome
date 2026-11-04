# Calcula a página de cada título a partir do PDF renderizado -> toc.json
import json, subprocess, sys, re, unicodedata
pdf, base = sys.argv[1], sys.argv[2]
n = int(re.search(r'Pages:\s+(\d+)', subprocess.check_output(['pdfinfo', pdf]).decode()).group(1))
norm = lambda s: re.sub(r'\s+', ' ', unicodedata.normalize('NFC', s)).strip().lower()
pages = [norm(subprocess.check_output(['pdftotext', '-f', str(i), '-l', str(i), pdf, '-']).decode()) for i in range(1, n + 1)]
heads = json.load(open(base + '/headings.json'))
out = {}
for h in heads:
    t = norm(h['text'])
    for i in range(2, n):  # ignora capa e sumário (índices 0 e 1)
        if t in pages[i]:
            out[h['text']] = i + 1
            break
json.dump(out, open(base + '/toc.json', 'w'), ensure_ascii=False)
print(len(out), 'de', len(heads))
