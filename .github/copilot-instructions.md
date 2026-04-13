# Instruções para o Agente — Projeto Bíblia Pe. Figueiredo

## Fonte da edição Vulgata Clementina

Para a edição **Vulgata Clementina**, o texto deve ser sempre extraído de:

> **https://la.wikisource.org/wiki/Vulgata_Clementina**

### Padrão de URLs por livro
- Mateus: `https://la.wikisource.org/wiki/Vulgata_Clementina/Evangelium_Secundum_Matthaeum`
- Marcos: `https://la.wikisource.org/wiki/Vulgata_Clementina/Evangelium_Secundum_Marcum`
- Lucas: `https://la.wikisource.org/wiki/Vulgata_Clementina/Evangelium_Secundum_Lucam`
- João: `https://la.wikisource.org/wiki/Vulgata_Clementina/Evangelium_Secundum_Ioannem`
- Gênesis: `https://la.wikisource.org/wiki/Vulgata_Clementina/Genesis`
- Salmos: `https://la.wikisource.org/wiki/Vulgata_Clementina/Psalmi`
- Para outros livros: consultar o índice em `https://la.wikisource.org/wiki/Vulgata_Clementina` para obter o nome exato.

### Grafia característica da Clementina (diferente da Nova Vulgata)
| Clementina | Nova Vulgata |
|------------|--------------|
| `Jesu / Jesus` | `Iesu / Iesus` |
| `Jacob` | `Iacob` |
| `Joseph` | `Ioseph` |
| `Rahab` | `Rachab` |
| `Emmanuel` | `Emmanuhel` |
| `Jerosolyma` | `Hierosolyma` |
| `Ægyptum / Ægypto` | `Aegyptum / Aegypto` |
| `Israël` | `Israhel` |
| `Judæus / Judæa` | `Iudaeus / Iudaea` |
| pontuação antes de `:` e `?` | sem espaço antes |

**Nunca usar o site vulgate.org** (Nova Vulgata/Stuttgartiensis). Usar sempre o Wikisource para a Vulgata Clementina.

---

## Extração de PDFs por capítulo (`extrair-capitulos.js`)

### Nova assinatura do script
```
node extrair-capitulos.js <livro-id> <cap:inicio:fim>...
```
- O PDF fonte é sempre `edicoes/figueiredo/<livro-id>/index.pdf`
- Os PDFs gerados vão para `edicoes/figueiredo/<livro-id>/<N>.pdf`

### Regra de páginas para `edicoes/figueiredo/proverbios/index.pdf`
O `pdftotext --layout` reporta as páginas com **offset de −1** em relação às páginas reais deste PDF.
Sempre aplicar **+1** nos números detectados pelo grep/awk.

### Regra geral de fim de capítulo (válida para todos os PDFs do projeto)
Antes de definir o `fim` de um capítulo, **verificar visualmente** se a página de início do próximo capítulo compartilha ou não conteúdo com o capítulo anterior.

- Se a página de transição **contém o final do cap. N e o início do cap. N+1** na mesma página física:
  → `fim_cap_N = página_de_início_cap_(N+1)` (inclui a página compartilhada nos dois)
- Se o cap. N+1 **começa em página própria** (página limpa, sem conteúdo do cap. anterior):
  → `fim_cap_N = página_de_início_cap_(N+1) - 1` (não inclui a página do próximo cap.)

**Nunca assumir automaticamente que há página compartilhada.** Verificar sempre o conteúdo real da página.

Exemplo com página compartilhada:
- Cap. 8 começa na pág. 25, cap. 9 começa na pág. 29, e a pág. 29 tem conteúdo dos dois → `8:25:29`

Exemplo sem página compartilhada:
- Cap. 1 começa na pág. 25, cap. 2 começa na pág. 34, e a pág. 34 é limpa → `1:25:33`
