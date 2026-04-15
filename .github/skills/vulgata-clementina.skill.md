---
name: vulgata-clementina
description: "Regras para extração do texto da Vulgata Clementina do Wikisource e geração de JSON estruturado."
---

# Skill — Vulgata Clementina

## Fonte obrigatória

O texto deve ser sempre extraído de:

> **https://la.wikisource.org/wiki/Vulgata_Clementina**

**Nunca usar vulgate.org** (Nova Vulgata/Stuttgartiensis).

---

## URLs por livro

| Livro       | URL                                                                          |
|-------------|------------------------------------------------------------------------------|
| Mateus      | `https://la.wikisource.org/wiki/Vulgata_Clementina/Evangelium_Secundum_Matthaeum` |
| Marcos      | `https://la.wikisource.org/wiki/Vulgata_Clementina/Evangelium_Secundum_Marcum`    |
| Lucas       | `https://la.wikisource.org/wiki/Vulgata_Clementina/Evangelium_Secundum_Lucam`     |
| João        | `https://la.wikisource.org/wiki/Vulgata_Clementina/Evangelium_Secundum_Ioannem`   |
| Gênesis     | `https://la.wikisource.org/wiki/Vulgata_Clementina/Genesis`                       |
| Salmos      | `https://la.wikisource.org/wiki/Vulgata_Clementina/Liber_Psalmorum`               |
| Deuteronômio| `https://la.wikisource.org/wiki/Vulgata_Clementina/Liber_Deuteronomii`            |
| Outros      | Consultar o índice: `https://la.wikisource.org/wiki/Vulgata_Clementina`            |

Para livros não listados: acesse o índice, localize o nome exato do subartigo e construa a URL.

Nunca adivinhe slug de URL. Sempre copie exatamente o subartigo do índice (ex.: `Liber_Psalmorum`, `Liber_Deuteronomii`).

### Se a URL retornar 404 ou outro erro

1. Acesse o índice do Wikisource pelo âncora do testamento correto:
   - Antigo Testamento: `https://la.wikisource.org/wiki/Vulgata_Clementina#Vetus_Testamentum`
   - Novo Testamento: `https://la.wikisource.org/wiki/Vulgata_Clementina#Novum_Testamentum`
2. Extraia os links reais com:
   ```bash
   curl -sL 'https://la.wikisource.org/wiki/Vulgata_Clementina' | grep -oP 'href="/wiki/Vulgata_Clementina/[^"]*"'
   ```
3. Identifique o link correto para o livro e use-o.

**Nunca inferir ou construir slugs de URL a partir do nome do livro.** Sempre usar a URL confirmada via HTTP 200.

---

## Grafia obrigatória — Clementina

| Clementina              | Nova Vulgata (proibido) |
|-------------------------|-------------------------|
| `Jesu / Jesus`          | `Iesu / Iesus`          |
| `Jacob`                 | `Iacob`                 |
| `Joseph`                | `Ioseph`                |
| `Rahab`                 | `Rachab`                |
| `Emmanuel`              | `Emmanuhel`             |
| `Jerosolyma`            | `Hierosolyma`           |
| `Ægyptum / Ægypto`      | `Aegyptum / Aegypto`    |
| `Israël`                | `Israhel`               |
| `Judæus / Judæa`        | `Iudaeus / Iudaea`      |
| espaço antes de `:` `?` | sem espaço antes        |

Se o texto extraído usar a grafia da Nova Vulgata em algum ponto, corrija para a Clementina.

---

## Alerta de arquivo existente

Antes de salvar qualquer capítulo, verifique se `edicoes/vulgata/<livro>/<N>.json` já existe.

- Se existir → alerte: *"Cap. N da Vulgata já foi extraído. Deseja prosseguir e substituir?"*
- Aguarde confirmação antes de sobrescrever.

---

## Estrutura JSON obrigatória

### `index.json` do livro (`edicoes/vulgata/<livro>/index.json`)

```json
{
  "id": "mateus",
  "titulo": "Evangelium secundum Matthæum",
  "abreviacao": "Mt",
  "testamento": "Novum Testamentum",
  "grupo": "Evangelia",
  "capitulos": [1, 2, 3]
}
```

- Títulos e campos em latim.
- Grupos em latim (ex: `"Evangelia"`, `"Libri Poetici"`, `"Prophetæ Maiores"`, `"Pentateuchos"`).

### `<N>.json` — capítulo individual (`edicoes/vulgata/<livro>/<N>.json`)

```json
{
  "num": 1,
  "link": "https://la.wikisource.org/wiki/Vulgata_Clementina/Evangelium_Secundum_Matthaeum#Caput_1",
  "sumario": "Genealogia Iesu Christi. Conceptio et Nativitas.",
  "versiculos": [],
  "notas": {}
}
```

**O campo `"link"` é obrigatório** — contém a URL exata do capítulo no Wikisource, sempre com âncora `#Caput_<N>`.

### Versículo zero (inscrição/epígrafe dos Salmos)

Nos Salmos, cada salmo frequentemente começa com uma inscrição sem número de versículo (título, indicação musical ou dedicatória). Regras:

1. **Se há texto sem número antes do versículo 1** → salve como `{ "n": 0, "tipo": "epigrafe", "texto": "..." }`.
2. **Se o primeiro item já tem número 1** → não crie versículo zero. O primeiro versículo numerado é o v. 1.
3. **Nunca renumere versículos** por causa do versículo zero. O v. 1 permanece como v. 1, v. 2 como v. 2, etc. Se a Vulgata não tem inscrição, o salmo começa em v. 1.
4. **Nunca salte versículos.** Se o texto do Wikisource mostra v. 1 como primeira linha numerada (mesmo que haja inscrição antes), o v. 1 deve estar no JSON com `"n": 1`.

> ⚠️ Erro comum a evitar: salvar a inscrição como `n: 0` **e** começar os versículos em `n: 2`, pulando o `n: 1`. Isso está errado. O `n: 0` é somente para a inscrição; o corpo do salmo começa em `n: 1`.

### Tipos de versículo

**Simples:**
```json
{ "n": 1, "texto": "Liber generationis Jesu Christi, filii David, filii Abraham." }
```

**Com citação profética:**
```json
{ "n": 23, "texto": "<span class='prophetic'>Ecce virgo in utero habebit, et pariet filium.</span>" }
```

**Inscrição/epígrafe (versículo zero — Salmos):**
```json
{ "n": 0, "tipo": "epigrafe", "texto": "In finem, Psalmus David." }
```

Não há itens `"bio"` na Vulgata. Não há notas de rodapé a menos que o Wikisource as forneça explicitamente.

---

## Salvamento

Para cada capítulo N extraído:

1. Salve `edicoes/vulgata/<livro>/<N>.json`.
2. Adicione N ao array `capitulos` do `index.json` (em ordem crescente, sem duplicar).
3. Se o livro for novo, crie `edicoes/vulgata/<livro>/index.json` antes.

---

## Relatório de revisão (`<N>.md`)

Salve em `edicoes/vulgata/<livro>/<N>.md`. Se o arquivo já existir, **acrescente** ao final.

```markdown
---

## Revisão — <Título do Livro em Latim> Cap. N | DD/MM/AAAA

### Fonte

[Wikisource — <Título>](<URL>)

### Estatísticas

| Versículos | Notas |
|------------|-------|
| 25         | 0     |

### Pontos para revisão manual

- [ ] **v. 5** — Grafia verificada e corrigida de Nova Vulgata para Clementina.
```

Se não houver pontos, escreva: *"Nenhum ponto identificado para revisão manual."*
