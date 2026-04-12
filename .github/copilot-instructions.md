# Instruções para o Agente — Projeto Bíblia Pe. Figueiredo

## Extração de PDFs por capítulo (`extrair-capitulos.js`)

### Regra de páginas para `.pdfs/proverbios.pdf`
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
