---
name: extrair-pdfs-capitulos
description: "Como usar pdftotext para detectar páginas de capítulos e o script extrair-capitulos.js para gerar PDFs por capítulo."
---

# Skill — Extração de PDFs por Capítulo

## Detectar páginas com pdftotext

Use `pdftotext -layout` para extrair o texto do PDF e identificar em qual página cada capítulo começa.

```bash
pdftotext -layout .pdfs/figueiredo/<livro>.pdf - | grep -n "CAP\.\|CAPÍTULO\|Cap\." | head -60
```

Para a edição original (figueiredo-original):
```bash
pdftotext -layout .pdfs/figueiredo-original/<livro>.pdf - | grep -n "CAP\.\|CAPÍTULO\|Cap\." | head -60
```

O número antes dos dois pontos é o **número da linha**, não da página. Para obter o número da página, use:

```bash
pdftotext -layout -f 1 -l 1 .pdfs/figueiredo/<livro>.pdf /dev/null && \
pdftotext -layout .pdfs/figueiredo/<livro>.pdf - | awk '/CAP\./{print NR": "$0}'
```

Ou, para identificar páginas com separador de página (form feed `\f`):

```bash
pdftotext -layout .pdfs/figueiredo/<livro>.pdf output.txt
# Cada quebra de página no output.txt corresponde a uma página do PDF.
# Conte os form feeds (\f) antes de cada ocorrência de "CAP." para determinar o número da página.
```

**Método recomendado:** extraia página por página e verifique o conteúdo:

```bash
pdftotext -layout -f <N> -l <N> .pdfs/figueiredo/<livro>.pdf -
```

---

## Regra especial — `.pdfs/figueiredo/proverbios.pdf`

O `pdftotext -layout` para `.pdfs/figueiredo/proverbios.pdf` reporta as páginas com **offset de −1** em relação às páginas reais do PDF.

**Sempre aplicar +1** nos números detectados pelo grep/awk para este livro.

---

## Regra de fim de capítulo

Antes de definir o `fim` de um capítulo, **verifique visualmente** se a página de início do próximo capítulo compartilha ou não conteúdo com o capítulo anterior:

```bash
pdftotext -layout -f <pag_inicio_prox_cap> -l <pag_inicio_prox_cap> .pdfs/figueiredo/<livro>.pdf -
```

- Se a página contém **o final do cap. N e o início do cap. N+1**:
  → `fim_cap_N = pag_inicio_cap_(N+1)` (inclui a página compartilhada nos dois)
- Se o cap. N+1 começa em **página própria** (sem conteúdo do cap. anterior):
  → `fim_cap_N = pag_inicio_cap_(N+1) - 1`

**Nunca assuma que há página compartilhada.** Verifique sempre.

---

## Script `extrair-capitulos.js`

### Sintaxe

```bash
# Edição Figueiredo (.pdfs/figueiredo + edicoes/figueiredo) → N.pdf:
node extrair-capitulos.js <livro-id> <cap:inicio:fim> [<cap:inicio:fim>...]

# Edição original (.pdfs/figueiredo-original + edicoes/figueiredo-original) → N.pdf:
node extrair-capitulos.js <livro-id> --old <cap:inicio:fim> [<cap:inicio:fim>...]
```

### Exemplos

```bash
# Gerar PDFs dos capítulos 1 e 2 de Mateus (edição recente)
node extrair-capitulos.js mateus 1:3:7 2:7:12

# Gerar PDFs dos capítulos 8 e 9 de Provérbios (edição antiga)
node extrair-capitulos.js proverbios --old 8:25:29 9:29:31
```

### Parâmetros

| Parâmetro     | Descrição                                                           |
|---------------|---------------------------------------------------------------------|
| `<livro-id>`  | Slug do livro em minúsculas (ex: `mateus`, `salmos`, `proverbios`) |
| `--old`       | Opcional. Se presente, usa `.pdfs/figueiredo-original` em vez de `.pdfs/figueiredo` |
| `cap:ini:fim` | Número do capítulo, página inicial e final (1-based, inclusivos)   |

### Arquivos gerados

| Modo       | Fonte                                                | Saída                                                |
|------------|------------------------------------------------------|------------------------------------------------------|
| sem `--old`| `.pdfs/figueiredo/<livro>.pdf`                        | `edicoes/figueiredo/<livro>/<N>.pdf`                 |
| com `--old`| `.pdfs/figueiredo-original/<livro>.pdf`               | `edicoes/figueiredo-original/<livro>/<N>.pdf`        |

### Verificação

Após executar, confirme que cada arquivo foi criado:

```bash
ls edicoes/figueiredo/<livro>/*.pdf
ls edicoes/figueiredo-original/<livro>/*.pdf
```

Se o script reportar `!` (aviso), registre os capítulos afetados no relatório de revisão.

---

## Fluxo completo para um livro (exemplo: Mateus caps. 1–2)

```bash
# 1. Detectar páginas no PDF-base
pdftotext -layout -f 3 -l 3 .pdfs/figueiredo/mateus.pdf -  # verificar pág. 3
pdftotext -layout -f 7 -l 7 .pdfs/figueiredo/mateus.pdf -  # verificar pág. 7 (transição)

# 2. Gerar PDFs da edição recente
node extrair-capitulos.js mateus 1:3:6 2:7:12

# 3. Detectar páginas no PDF-base da edição original (páginas podem ser diferentes)
pdftotext -layout -f 5 -l 5 .pdfs/figueiredo-original/mateus.pdf -

# 4. Gerar PDFs da edição original
node extrair-capitulos.js mateus --old 1:5:9 2:10:15
```
