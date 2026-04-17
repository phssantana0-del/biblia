import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Uso: node extrair-capitulos.js <livro-id> [--old] <cap:inicio:fim>...
// Exemplo: node extrair-capitulos.js salmos 1:3:5 2:6:8 3:9:12
//          node extrair-capitulos.js salmos --old 1:3:5 2:6:8
//
// <livro-id>       — slug do livro (ex: salmos, proverbios)
//                    Sem --old: PDF fonte = .pdfs/figueiredo/<livro-id>.pdf
//                               PDFs gerados = edicoes/figueiredo/<livro-id>/<N>.pdf
//                    Com --old: PDF fonte = .pdfs/figueiredo-original/<livro-id>.pdf
//                               PDFs gerados = edicoes/figueiredo-original/<livro-id>/<N>.pdf
// cap:inicio:fim   — número do capítulo, página inicial e página final no PDF fonte (1-based, inclusive)
//
// Introdução automática (apenas figueiredo):
// Se o capítulo 1 começar depois da página 1 em figueiredo, o script também gera:
// edicoes/figueiredo/<livro-id>/introducao.pdf com as páginas 1 até inicio_cap_1 - 1.

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Uso: node extrair-capitulos.js <livro-id> [--old] <cap:inicio:fim>...');
    console.error('Exemplo: node extrair-capitulos.js salmos 1:3:5 2:6:8');
    console.error('         node extrair-capitulos.js salmos --old 1:3:5 2:6:8');
    process.exit(1);
  }

  const [livroId, ...rest] = args;

  const oldMode = rest[0] === '--old';
  const tokens = oldMode ? rest.slice(1) : rest;

  const edicaoDir = oldMode ? 'figueiredo-original' : 'figueiredo';
  const livroDir = path.join(__dirname, 'edicoes', edicaoDir, livroId);
  const fontePath = path.join(__dirname, '.pdfs', edicaoDir, `${livroId}.pdf`);

  if (!fs.existsSync(fontePath)) {
    console.error(`PDF fonte não encontrado: ${fontePath}`);
    console.error(`Certifique-se de que o arquivo ${livroId}.pdf existe em .pdfs/${edicaoDir}/`);
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

  // Garante que a pasta do livro existe
  fs.mkdirSync(livroDir, { recursive: true });

  // Carrega o PDF fonte
  console.log(`\nLendo "${fontePath}"...`);
  const srcBytes = fs.readFileSync(fontePath);
  const srcDoc = await PDFDocument.load(srcBytes);
  const totalPages = srcDoc.getPageCount();
  const suffix = '.pdf';
  console.log(`Total de páginas no PDF fonte: ${totalPages}\n`);

  const generated = [];

  const capitulo1 = capitulos.find(({ cap }) => cap === 1);
  if (!oldMode && capitulo1 && capitulo1.inicio > 1) {
    const introStart = 1;
    const introEnd = Math.min(totalPages, capitulo1.inicio - 1);

    if (introEnd >= introStart) {
      const introIndices = [];
      for (let p = introStart; p <= introEnd; p++) {
        introIndices.push(p - 1);
      }

      const introDoc = await PDFDocument.create();
      const introPages = await introDoc.copyPages(srcDoc, introIndices);
      introPages.forEach((page) => introDoc.addPage(page));

      const introBytes = await introDoc.save();
      const introOutputFile = path.join(livroDir, `introducao${suffix}`);
      fs.writeFileSync(introOutputFile, introBytes);

      const introRelativePath = `edicoes/${edicaoDir}/${livroId}/introducao${suffix}`;
      console.log(`  ✓ Introdução (pág. ${introStart}–${introEnd}) → ${introRelativePath}`);
      generated.push({ cap: 'introducao', path: introRelativePath });
    }
  }

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
    const outputFile = path.join(livroDir, `${cap}${suffix}`);
    fs.writeFileSync(outputFile, pdfBytes);

    const relativePath = `edicoes/${edicaoDir}/${livroId}/${cap}${suffix}`;
    console.log(`  ✓ Capítulo ${cap} (pág. ${clampedStart}–${clampedEnd}) → ${relativePath}`);
    generated.push({ cap, path: relativePath });
  }

  console.log(`\nConcluído. ${generated.length} arquivo(s) gerado(s) em edicoes/${edicaoDir}/${livroId}/`);
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
