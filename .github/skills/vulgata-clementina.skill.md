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

Os subartigos **não seguem uma regra uniforme**. Alguns usam `Liber_`, outros usam `Prophetia_`, outros não usam prefixo algum, e vários livros do Novo Testamento usam títulos compostos.

**Nunca adivinhe slug de URL.** Primeiro escolha o **subartigo canônico exato** abaixo; só depois forme a URL substituindo espaços por `_`.

Formato permitido:

```text
https://la.wikisource.org/wiki/Vulgata_Clementina/<subartigo-exato-com-espacos-substituidos-por-_>
```

Exemplos válidos:

- `Liber Exodus` → `https://la.wikisource.org/wiki/Vulgata_Clementina/Liber_Exodus`
- `Prophetia Isaiæ` → `https://la.wikisource.org/wiki/Vulgata_Clementina/Prophetia_Isaiæ`
- `Pauli Epistola ad Timotheum II` → `https://la.wikisource.org/wiki/Vulgata_Clementina/Pauli_Epistola_ad_Timotheum_II`

### Subartigos canônicos do Wikisource

| Livro | Subartigo exato |
|------|------------------|
| Gênesis | `Liber Genesis` |
| Êxodo | `Liber Exodus` |
| Levítico | `Liber Leviticus` |
| Números | `Liber Numeri` |
| Deuteronômio | `Liber Deuteronomii` |
| Josué | `Liber Josue` |
| Juízes | `Liber Judicum` |
| Rute | `Liber Ruth` |
| 1 Samuel | `Liber I Regum (sive I Samuelis)` |
| 2 Samuel | `Liber II Regum (sive II Samuelis)` |
| 1 Reis | `Liber III Regum (sive I Regum nunc)` |
| 2 Reis | `Liber IV Regum (sive II Regum nunc)` |
| 1 Crônicas | `Liber I Paralipomenon` |
| 2 Crônicas | `Liber II Paralipomenon` |
| Esdras | `Liber I Esdræ` |
| Neemias | `Liber II Esdræ (sive Nehemiæ)` |
| Tobias | `Liber Tobiæ` |
| Judite | `Liber Judith` |
| Ester | `Liber Esther` |
| Jó | `Liber Job` |
| Salmos | `Liber Psalmorum` |
| Provérbios | `Liber Proverbiorum` |
| Eclesiastes | `Liber Ecclesiastes` |
| Cântico dos Cânticos | `Canticum Canticorum` |
| Sabedoria | `Liber Sapientiæ` |
| Eclesiástico | `Liber Ecclesiasticus` |
| Isaías | `Prophetia Isaiæ` |
| Jeremias | `Prophetia Jeremiæ` |
| Lamentações | `Lamentationes` |
| Baruc | `Prophetia Baruch` |
| Ezequiel | `Prophetia Ezechielis` |
| Daniel | `Prophetia Danielis` |
| Oséias | `Prophetia Osee` |
| Joel | `Prophetia Joel` |
| Amós | `Prophetia Amos` |
| Abdias | `Prophetia Abdiæ` |
| Jonas | `Prophetia Jona` |
| Miquéias | `Prophetia Michææ` |
| Naum | `Prophetia Nahum` |
| Habacuc | `Prophetia Habacuc` |
| Sofonias | `Prophetia Sophoniæ` |
| Ageu | `Prophetia Aggæi` |
| Zacarias | `Prophetia Zachariæ` |
| Malaquias | `Prophetia Malachiæ` |
| 1 Macabeus | `Liber I Machabæorum` |
| 2 Macabeus | `Liber II Machabæorum` |
| Mateus | `Evangelium Secundum Matthæum` |
| Marcos | `Evangelium Secundum Marcum` |
| Lucas | `Evangelium Secundum Lucam` |
| João | `Evangelium Secundum Joannem` |
| Atos dos Apóstolos | `Acta Apostolorum` |
| Romanos | `Pauli Epistola ad Romanos` |
| 1 Coríntios | `Pauli Epistola ad Corinthios I` |
| 2 Coríntios | `Pauli Epistola ad Corinthios II` |
| Gálatas | `Pauli Epistola ad Galatas` |
| Efésios | `Pauli Epistola ad Ephesios` |
| Filipenses | `Pauli Epistola ad Philippenses` |
| Colossenses | `Pauli Epistola ad Colossenses` |
| 1 Tessalonicenses | `Pauli Epistola ad Thessalonicenses I` |
| 2 Tessalonicenses | `Pauli Epistola ad Thessalonicenses II` |
| 1 Timóteo | `Pauli Epistola ad Timotheum I` |
| 2 Timóteo | `Pauli Epistola ad Timotheum II` |
| Tito | `Pauli Epistola ad Titum` |
| Filêmon | `Pauli Epistola ad Philemonem` |
| Hebreus | `Pauli Epistola ad Hebræos` |
| Tiago | `Jacobi Epistola` |
| 1 Pedro | `Petri Epistola I` |
| 2 Pedro | `Petri Epistola II` |
| 1 João | `Joannis Epistola I` |
| 2 João | `Joannis Epistola II` |
| 3 João | `Joannis Epistola III` |
| Judas | `Juda Epistola` |
| Apocalipse | `Apocalypsis` |

Se o livro não estiver na tabela ou se houver dúvida, acesse o índice e copie o `href` real em vez de montar o slug manualmente.

### Se a URL retornar 404 ou outro erro

1. Acesse o índice do Wikisource pelo âncora do testamento correto:
   - Antigo Testamento: `https://la.wikisource.org/wiki/Vulgata_Clementina#Vetus_Testamentum`
   - Novo Testamento: `https://la.wikisource.org/wiki/Vulgata_Clementina#Novum_Testamentum`
2. Extraia os links reais com:
   ```bash
   curl -sL 'https://la.wikisource.org/wiki/Vulgata_Clementina' | grep -oP 'href="/wiki/Vulgata_Clementina/[^"]*"'
   ```
3. Identifique o link correto para o livro e use-o.

**Nunca inferir ou construir slugs de URL a partir do nome do livro, do `id`, da abreviação ou do `titulo` do `index.json`.** Sempre usar a URL confirmada via HTTP 200.

**O campo `"link"` do capítulo deve reaproveitar exatamente a mesma base URL validada.** Depois de validar `https://.../Liber_Exodus`, o `link` salvo deve ser `https://.../Liber_Exodus#Caput_<N>`, nunca uma reconstrução paralela como `https://.../Exodus#Caput_<N>`.

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
