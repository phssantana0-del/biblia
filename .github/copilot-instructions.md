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
Nestes PDFs, a página de transição entre capítulos **contém o final do capítulo anterior E o início do próximo** numa mesma página física.

**Regra obrigatória:**
> `fim_cap_N = página_de_início_cap_(N+1)` — nunca `início_cap_(N+1) - 1`

Exemplo correto:
- Cap. 8 começa na pág. 25, cap. 9 começa na pág. 29 → `8:25:29`
- Cap. 9 começa na pág. 29, cap. 10 começa na pág. 31 → `9:29:31`

Usar sempre `início_cap_N : início_cap_(N+1)` ao montar os tokens para o script.
