---
name: figueiredo-transcricao
description: "Regras de transcrição, estrutura JSON e geração de relatório para a edição Pe. Figueiredo a partir de PDF digitalizado."
---

# Skill — Transcrição Figueiredo

## Idioma e fidelidade

Esta é uma edição **portuguesa antiga** (séc. XVIII–XIX). O texto usa ortografia arcaica: "êle", "tôda", "sôbre", "fêz", "pôsto", "bôca", "filhos d' Israel", etc. **Transcreva exatamente como está no PDF**, sem modernizar grafia, pontuação ou capitalização.

---

## Alerta de arquivo existente

Antes de salvar qualquer capítulo, verifique se `edicoes/figueiredo/<livro>/<N>.json` já existe.

- Se existir → alerte o usuário: *"O cap. N já foi extraído. Deseja prosseguir e substituir?"*
- Aguarde confirmação antes de sobrescrever.

---

## Detecção automática de introdução

Quando o intervalo de capítulos inclui o capítulo 1:

1. Leia as páginas antes do marcador do Capítulo 1 (ex: "CAP. I", "CAPÍTULO I", "CAP. 1").
2. Se houver texto antes desse marcador, é a introdução do livro — extraia-a.
3. Salve como campo `"introducao"` no `edicoes/figueiredo/<livro>/index.json`.
4. Se o campo já existir no `index.json`, confirme com o usuário antes de sobrescrever.
5. O marcador do Capítulo 1 não faz parte da introdução — não o inclua.

### Formatação HTML da introdução

- Parágrafo → `<p>Texto.</p>`
- Título/cabeçalho → `<h3>Título</h3>`
- Citação recuada/itálico → `<span class='prophetic'>...</span>` dentro do `<p>`
- Nota de rodapé → `<em class='footnote'>Texto da nota.</em>` inline
- Itálico simples → `<em>...</em>`

---

## Leitura sequencial do PDF

Use `pdftotext -layout` para extrair o texto. Leia **página por página**, classificando cada bloco antes de avançar:

1. **Número de capítulo** → inicia novo objeto `{ "num": N, ... }`
2. **Sumário** → texto em itálico logo após o número do capítulo → campo `"sumario"`
3. **Versículo numerado** → número + texto → objeto no array `versiculos`
4. **Citação profética/poética** → trecho recuado ou em itálico diferenciado → `<span class='prophetic'>...</span>`
5. **Nota de rodapé** → rodapé numerado ou com asterisco → associe ao versículo correto
6. **Item biográfico/temático** → caixa com título em negrito → `{ "tipo": "bio" }`

### Rastreamento de páginas

Mantenha internamente uma tabela:

| Capítulo | Pág. início | Pág. fim |
|----------|-------------|----------|
| 1        | 3           | 5        |
| 2        | 6           | 8        |

- Ao detectar início de cap. N+1, registre a página atual como `inicio` de N+1 e feche `fim` de N.
- Para o último capítulo do intervalo, `fim` = última página lida.
- Esta tabela é usada para gerar os PDFs por capítulo.

### Regras críticas

- **Nunca invente conteúdo.** Trecho ilegível → `null` no campo texto + item na lista de revisão.
- Versículo sem número próprio (continuação de citação) → mantido no campo `"texto"` do versículo anterior.
- Notas do mesmo capítulo ficam em `"notas"` com chaves `fn<cap>_<seq>` (ex: `fn3_1`, `fn3_2`).
- Revisão interna antes de salvar: toda chave `"nota"` em versículos deve ter correspondente em `"notas"`; nenhum versículo pode estar omitido.

---

## Estrutura JSON obrigatória

### `index.json` do livro

```json
{
  "id": "marcos",
  "titulo": "Evangelho de S. Marcos",
  "abreviacao": "Mc",
  "testamento": "Novo Testamento",
  "grupo": "Evangelhos",
  "introducao": "<h3>Título</h3><p>Parágrafo.</p>",
  "capitulos": [1, 2, 3]
}
```

O campo `"introducao"` é opcional — só inclua se houver texto antes do Cap. 1.

### `<N>.json` — capítulo individual

```json
{
  "num": 1,
  "sumario": "Frase descritiva em itálico.",
  "versiculos": [],
  "notas": {}
}
```

Sem campo `"pdf"` — o visualizador deriva o caminho automaticamente.

### Tipos de versículo

**Simples:**
```json
{ "n": 1, "texto": "Texto do versículo." }
```

**Com nota:**
```json
{ "n": 3, "texto": "Texto.", "nota": "fn2_1" }
```

**Com citação profética:**
```json
{ "n": 6, "texto": "<span class='prophetic'>Eu te proclamei meu filho.</span>" }
```

**Item biográfico/temático** (inserido na posição exata em que aparece no PDF):
```json
{ "tipo": "bio", "titulo": "Nome da pessoa ou tema", "texto": "Texto completo." }
```

### Notas de rodapé

```json
"notas": {
  "fn1_1": {
    "rotulo": "Trecho do versículo que originou a nota",
    "texto": "Texto da nota. Pode conter <em>latim</em> e <br><br> entre parágrafos."
  }
}
```

HTML inline permitido nas notas: `<em>`, `<br><br>`, `<span class='prophetic'>`. Nunca use `<p>`, `<div>`, `<strong>`.

---

## Salvamento

Para cada capítulo N extraído:

1. Salve `edicoes/figueiredo/<livro>/<N>.json`.
2. Adicione N ao array `capitulos` do `index.json` (em ordem crescente, sem duplicar).
3. Se cap. 1 gerou introdução, salve/atualize o campo `"introducao"` no `index.json`.

---

## Relatório de revisão (`<N>.md`)

Salve em `edicoes/figueiredo/<livro>/<N>.md`. Se o arquivo já existir, **acrescente** ao final.

```markdown
---

## Revisão — <Nome do Livro> Cap. N | DD/MM/AAAA

### Estatísticas

| Versículos | Notas | Itens biográficos |
|------------|-------|-------------------|
| 25         | 7     | 1                 |

### Pontos para revisão manual

- [ ] **v. 3** — Texto ilegível; nota `fn1_1` incompleta.
- [ ] **sumário** — Itálico ambíguo.
```

Se não houver pontos de revisão, escreva: *"Nenhum ponto identificado para revisão manual."*

Para a introdução, salve em `edicoes/figueiredo/<livro>/introducao.md`:

```markdown
---

## Revisão — <Nome do Livro> Introdução | DD/MM/AAAA

### Estatísticas

| Parágrafos |
|------------|
| 5          |

### Pontos para revisão manual

- [ ] **§ 2** — Trecho ilegível; marcado como `<mark>ILEGÍVEL</mark>`.
```
