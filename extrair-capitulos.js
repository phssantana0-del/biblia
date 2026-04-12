import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDFS_DIR = path.join(__dirname, '.pdfs');

// Uso: node extrair-capitulos.js <fonte.pdf> <livro-id> <cap:inicio:fim>...
// Exemplo: node extrair-capitulos.js .pdfs/salmos.pdf salmos 1:3:5 2:6:8 3:9:12
//
// <fonte.pdf>  — caminho relativo à raiz do projeto ou absoluto
// <livro-id>   — slug do livro (ex: salmos, mateus) — define a subpasta de saída
// cap:inicio:fim — número do capítulo, página inicial e final no PDF fonte (1-based, inclusive)
//
// Saída: .pdfs/<livro-id>/cap-N.pdf para cada capítulo
// Imprime o caminho relativo de cada arquivo gerado (útil para o agente capturar).

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Uso: node extrair-capitulos.js <fonte.pdf> <livro-id> <cap:inicio:fim>...');
    console.error('Exemplo: node extrair-capitulos.js .pdfs/salmos.pdf salmos 1:3:5 2:6:8');
    process.exit(1);
  }

  const [fontePdf, livroId, ...tokens] = args;

  // Aceita caminho absoluto ou relativo à raiz do projeto
  const fontePath = path.isAbsolute(fontePdf)
    ? fontePdf
    : path.join(__dirname, fontePdf);

  if (!fs.existsSync(fontePath)) {
    console.error(`PDF fonte não encontrado: ${fontePath}`);
    process.exit(1);
  }

  // Valida os tokens cap:inicio:fim
  const capitulos = tokens.map((token) => {
    const parts = token.split(':');
    if (parts.length !== 3) {
      console.error(`Token inválido: "${token}". Formato esperado: cap:inicio:fim`);
      process.exit(1);
    }
    const [cap, inicio, fim] = parts.map(Number);
    if ([cap, inicio, fim].some(isNaN) || cap < 1 || inicio < 1 || fim < inicio) {
      console.error(`Valores inválidos em "${token}". Requer: cap>=1, inicio>=1, fim>=inicio.`);
      process.exit(1);
    }
    return { cap, inicio, fim };
  });

  // Cria pasta de saída .pdfs/<livroId>/
  const outputDir = path.join(PDFS_DIR, livroId);
  fs.mkdirSync(outputDir, { recursive: true });

  // Carrega o PDF fonte
  console.log(`\nLendo "${path.basename(fontePath)}"...`);
  const srcBytes = fs.readFileSync(fontePath);
  const srcDoc = await PDFDocument.load(srcBytes);
  const totalPages = srcDoc.getPageCount();
  console.log(`Total de páginas no PDF fonte: ${totalPages}\n`);

  const generated = [];

  for (const { cap, inicio, fim } of capitulos) {
    if (inicio > totalPages) {
      console.warn(`  ! Capítulo ${cap}: página inicial (${inicio}) excede total (${totalPages}). Pulando.`);
      continue;
    }

    const clampedStart = Math.max(1, inicio);
    const clampedEnd = Math.min(totalPages, fim);

    if (inicio !== clampedStart || fim !== clampedEnd) {
      console.log(`  ! Capítulo ${cap}: intervalo ajustado para ${clampedStart}–${clampedEnd}.`);
    }

    // Extrai páginas (pdf-lib usa índices 0-based)
    const pageIndices = [];
    for (let p = clampedStart; p <= clampedEnd; p++) {
      pageIndices.push(p - 1);
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save();
    const outputFile = path.join(outputDir, `cap-${cap}.pdf`);
    fs.writeFileSync(outputFile, pdfBytes);

    const relativePath = `.pdfs/${livroId}/cap-${cap}.pdf`;
    console.log(`  ✓ Capítulo ${cap} (pág. ${clampedStart}–${clampedEnd}) → ${relativePath}`);
    generated.push({ cap, path: relativePath });
  }

  console.log(`\nConcluído. ${generated.length} arquivo(s) gerado(s) em .pdfs/${livroId}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
