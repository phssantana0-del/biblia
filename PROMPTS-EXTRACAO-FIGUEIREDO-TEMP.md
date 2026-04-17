# Prompts para destrinchar PDFs conjuntos em livros individuais (Figueiredo)

Objetivo: transformar os arquivos de [/.pdfs/figueiredo-temp](.pdfs/figueiredo-temp) em PDFs por livro em [/.pdfs/figueiredo](.pdfs/figueiredo), com nomes normalizados por slug do projeto.

Regras gerais para todos os prompts:
- Ler o PDF com `pdftotext -layout` para detectar inícios dos livros.
- Confirmar visualmente páginas de transição (`p-1`, `p`, `p+1`) antes de fechar intervalos.
- Extrair por intervalo de páginas com script auxiliar em Node (pdf-lib) ou reaproveitando utilitário existente.
- Nomear arquivos no padrão slug de [edicoes/figueiredo](edicoes/figueiredo), por exemplo:
  - Paralipômenos -> `1-cronicas` / `2-cronicas`
  - Cântico dos Cânticos -> `cantico-dos-canticos`
  - I/II Reis -> `1-reis` / `2-reis`
  - I/II Samuel -> `1-samuel` / `2-samuel`
  - I/II Macabeus -> `1-macabeus` / `2-macabeus`
- Não sobrescrever PDFs já existentes sem checar tamanho/diferença.
- Ao final de cada prompt: listar tabela `Livro | Páginas | Arquivo`.

---

## Prompt 1 — numeros-a-rute.pdf

Use o agent para processar [/.pdfs/figueiredo-temp/numeros-a-rute.pdf](.pdfs/figueiredo-temp/numeros-a-rute.pdf) e gerar livros individuais em [/.pdfs/figueiredo](.pdfs/figueiredo):
- `numeros`
- `deuteronomio`
- `josue`
- `juizes`
- `rute`

Passos obrigatórios:
1. Detectar inícios reais dos livros com `pdftotext -layout`.
2. Conferir transições visualmente.
3. Extrair cada livro para `./.pdfs/figueiredo/<slug>.pdf`.
4. Validar que os 5 arquivos existem.
5. Retornar tabela final com páginas usadas.

---

## Prompt 2 — reis-a-1cronicas.pdf

Use o agent para processar [/.pdfs/figueiredo-temp/reis-a-1cronicas.pdf](.pdfs/figueiredo-temp/reis-a-1cronicas.pdf) e gerar:
- `1-samuel`
- `2-samuel`
- `1-reis`
- `2-reis`
- `1-cronicas`

Observações:
- Ignorar ruído de cabeçalho que pode parecer título de outro livro.
- Aceitar numeração romana e arábica (I/1, II/2).

Passos obrigatórios:
1. Marcar páginas de início confirmadas.
2. Definir fim por página anterior ao próximo início (ou compartilhada, se houver conteúdo dos dois livros).
3. Extrair e validar os 5 PDFs.
4. Retornar tabela final.

---

## Prompt 3 — 2cronicas-a-jo.pdf

Use o agent para processar [/.pdfs/figueiredo-temp/2cronicas-a-jo.pdf](.pdfs/figueiredo-temp/2cronicas-a-jo.pdf) e gerar:
- `2-cronicas`
- `esdras`
- `neemias`
- `tobias`
- `judite`
- `ester`
- `jo`

Passos obrigatórios:
1. Confirmar cada início por inspeção de `p-1`, `p`, `p+1`.
2. Corrigir falsos positivos de OCR/cabeçalho.
3. Extrair para [/.pdfs/figueiredo](.pdfs/figueiredo).
4. Validar existência dos 7 arquivos.
5. Retornar tabela final.

---

## Prompt 4 — eclesiastes-a-isaias.pdf (parte 1 de Isaías)

Use o agent para processar [/.pdfs/figueiredo-temp/eclesiastes-a-isaias.pdf](.pdfs/figueiredo-temp/eclesiastes-a-isaias.pdf) e gerar:
- `proverbios`
- `eclesiastes`
- `cantico-dos-canticos`
- `sabedoria`
- `eclesiastico`
- `isaias` (salvar como parcial: `isaias.parte1.pdf` em [/.pdfs/figueiredo-temp](.pdfs/figueiredo-temp))

Observação:
- Este arquivo contém a primeira parte de Isaías, não o livro completo.

Passos obrigatórios:
1. Detectar e validar inícios dos 6 blocos.
2. Gerar os 5 livros completos em [/.pdfs/figueiredo](.pdfs/figueiredo).
3. Gerar parte 1 de Isaías em [/.pdfs/figueiredo-temp/isaias.parte1.pdf](.pdfs/figueiredo-temp/isaias.parte1.pdf).
4. Retornar tabela final.

---

## Prompt 5 — continuacao-isaias-a-oracao-jeremias.pdf (parte 2 de Isaías + Jeremias + Lamentações)

Use o agent para processar [/.pdfs/figueiredo-temp/continuacao-isaias-a-oracao-jeremias.pdf](.pdfs/figueiredo-temp/continuacao-isaias-a-oracao-jeremias.pdf) e gerar:
- `isaias` (parte final como `isaias.parte2.pdf` em [/.pdfs/figueiredo-temp](.pdfs/figueiredo-temp))
- `jeremias`
- `lamentacoes`

Passos obrigatórios:
1. Detectar início da continuação de Isaías e início de Jeremias/Lamentações.
2. Extrair `isaias.parte2.pdf`, `jeremias.pdf`, `lamentacoes.pdf`.
3. Unir `isaias.parte1.pdf` + `isaias.parte2.pdf` em [/.pdfs/figueiredo/isaias.pdf](.pdfs/figueiredo/isaias.pdf), preservando ordem.
4. Validar integridade do PDF final de Isaías (contagem de páginas > cada parte isolada).
5. Retornar tabela final.

---

## Prompt 6 — baruc-a-oseias.pdf

Use o agent para processar [/.pdfs/figueiredo-temp/baruc-a-oseias.pdf](.pdfs/figueiredo-temp/baruc-a-oseias.pdf) e gerar:
- `baruc`
- `ezequiel`
- `daniel`
- `oseias`

Passos obrigatórios:
1. Confirmar inícios reais com inspeção visual.
2. Extrair 4 livros para [/.pdfs/figueiredo](.pdfs/figueiredo).
3. Validar arquivos e retornar tabela.

---

## Prompt 7 — josue-a-ii-macabeus.pdf (Profetas menores + Macabeus)

Use o agent para processar [/.pdfs/figueiredo-temp/josue-a-ii-macabeus.pdf](.pdfs/figueiredo-temp/josue-a-ii-macabeus.pdf) e gerar:
- `joel`
- `amos`
- `abdias`
- `jonas`
- `miqueias`
- `naum`
- `habacuc`
- `sofonias`
- `ageu`
- `zacarias`
- `malaquias`
- `1-macabeus`
- `2-macabeus`

Passos obrigatórios:
1. Validar sequência de livros no PDF (pode haver páginas de transição com título corrido).
2. Extrair cada livro com intervalo conferido.
3. Gravar em [/.pdfs/figueiredo](.pdfs/figueiredo).
4. Retornar tabela final.

---

## Prompt 8 — validação final do Antigo Testamento em .pdfs/figueiredo

Após executar os prompts 1 a 7, use o agent para:
1. Listar PDFs em [/.pdfs/figueiredo](.pdfs/figueiredo).
2. Verificar presença dos livros do AT faltantes:
`1-cronicas, 1-macabeus, 1-reis, 1-samuel, 2-cronicas, 2-macabeus, 2-reis, 2-samuel, abdias, ageu, amos, baruc, cantico-dos-canticos, daniel, deuteronomio, eclesiastes, eclesiastico, esdras, ester, ezequiel, habacuc, isaias, jeremias, jo, joel, jonas, josue, judite, juizes, lamentacoes, malaquias, miqueias, naum, neemias, numeros, oseias, proverbios, rute, sabedoria, sofonias, tobias, zacarias`.
3. Reportar ausentes/remanescentes.

