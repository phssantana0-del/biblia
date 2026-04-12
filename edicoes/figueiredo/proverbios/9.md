---

## Revisão — Livro dos Provérbios | 11/04/2026 | Entrada: `.pdfs/proverbios.pdf` | Capítulos: 1–5

### Capítulos extraídos

| Capítulo | Versículos | Notas | Itens biográficos |
|----------|------------|-------|-------------------|
| 1        | 33         | 8     | 0                 |
| 2        | 22         | 6     | 0                 |
| 3        | 35         | 5     | 0                 |
| 4        | 27         | 5     | 0                 |
| 5        | 23         | 7     | 0                 |
| **Total**| **140**    | **31**| **0**             |

### Pontos para revisão manual

- [ ] **Cap. 1, nota `fn1_1`** — Nota sobre a palavra "PROVÉRBIOS" referencia o cabeçalho/título do livro na página (não um versículo específico). Incluída em `notas` sem vínculo a versículo. Verificar se convém associá-la ao v. 1.
- [ ] **Cap. 4, nota `fn4_2`** — O OCR leu "tenrinlio" como tradução do latim *tenellus* (P. Pereira). A grafia original provavelmente é "tenrinho". Verificar no PDF original.
- [ ] **Cap. 5, v. 2** — A frase "Não te iludas com os artifícios da mulher" aparece fundida ao v. 2 no OCR (possível nota inline do tradutor ou segunda cláusula do versículo). Confirmar no PDF se é parte do versículo ou nota marginal.

---

## Revisão — Livro dos Provérbios | 11/04/2026 | Entrada: `.pdfs/proverbios.pdf` | Capítulos: 6–7

### Capítulos extraídos

| Capítulo | Versículos | Notas | Itens biográficos |
|----------|------------|-------|-------------------|
| 6        | 35         | 5     | 0                 |
| 7        | 27         | 3     | 0                 |
| **Total**| **62**     | **8** | **0**             |

### Pontos para revisão manual

- [ ] **Cap. 6, nota `fn6_2`** — Nota extensa sobre a formiga (v. 8) contém nomes de obras em francês. A transcrição do OCR pode ter introduzido erros tipográficos nessas citações. Verificar no PDF original as referências a Réaumur, Latreille e Huber.
- [ ] **Cap. 7, v. 1** — A palavra "Filho," aparece isolada ao final do versículo 1 no OCR (parece ser título da rubrica do v. 2 ou erro de diagramação). Verificar no PDF original se pertence ao v. 1 ou é cabeçalho separado.

---

## Revisão — Livro dos Provérbios | 12/04/2026 | Entrada: `.pdfs/proverbios.pdf` | Capítulos: 8–9

### Capítulos extraídos

| Capítulo | Versículos | Notas | Itens biográficos |
|----------|------------|-------|-------------------|
| 8        | 36         | 8     | 0                 |
| 9        | 18         | 7     | 0                 |
| **Total**| **54**     | **15**| **0**             |

### Pontos para revisão manual

- [ ] **Cap. 8, nota `fn8_s`** — Nota teológica sobre "Sabedoria" (marcada com •, sem número de referência no texto). Não está associada a nenhum versículo no JSON; verificar no PDF original a que item do texto pertence (provavelmente ao sumário/título do capítulo).
- [ ] **Cap. 8, nota `fn8_3`** — No texto do PDF, a nota (3) sobre "Justos são todos os meus discursos" aparece precedida da nota de rodapé arrastada do cap. 7 ("E OS MAIS FORTES"). Confirmar que a numeração sequencial das notas do cap. 8 está correta.
- [ ] **Cap. 8, nota `fn8_6`** — Nota longa sobre "O Senhor me possuiu" está dividida entre duas páginas no scan (página 407–408). O texto do elo entre as duas partes apresentou caracteres corrompidos (`álçcussão` → `discussão`; `dç çltár` → `de citar`; `<le Aria` → `de Ária`). As correções foram aplicadas; verificar no PDF original.
- [ ] **Cap. 9, nota `fn9_2`** — A nota (2) aparece dividida entre páginas. A parte inicial ("IMOLOU AS SUAS VÍTIMAS") e a parte continuada ("PREPAROU O VINHO") foram unidas com `<br><br>`. O texto intercalado (se houver) pode estar faltando. Verificar no PDF original.
- [ ] **Cap. 9, v. 11** — O número do versículo aparece como ",  11" no OCR (vírgula antes do número). Corrigido para "11". Confirmar no PDF original.
- [ ] **Cap. 9, nota `fn9_5`** — O nome do comentarista aparece como "Monpchio" no OCR; corrigido para "Menochio". Confirmar no PDF original.

> **Nota técnica:** a numeração de páginas retornada pelo `pdftotext --layout` apresenta offset de −1 em relação às páginas reais do PDF fonte (`.pdfs/proverbios.pdf`). Os PDFs de capítulo foram re-gerados com páginas corrigidas (+1): cap-8 → pág. 25–28; cap-9 → pág. 29–30. Considerar este padrão ao extrair capítulos futuros deste mesmo PDF.
