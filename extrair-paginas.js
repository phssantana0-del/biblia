import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIBLIAS_DIR = path.join(__dirname, '.pdfs');
const OUTPUT_DIR = BIBLIAS_DIR;
const DEFAULT_PDF = 'biblia-completa.pdf';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

function listPdfs() {
  if (!fs.existsSync(BIBLIAS_DIR)) {
    console.error(`Pasta .pdfs não encontrada em: ${BIBLIAS_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(BIBLIAS_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  return files;
}

async function choosePdf(pdfs) {
  const defaultIndex = pdfs.findIndex((f) => f === DEFAULT_PDF);

  console.log('\nPDFs disponíveis em .pdfs/:\n');
  pdfs.forEach((f, i) => {
    const marker = i === defaultIndex ? ' (padrão)' : '';
    console.log(`  ${i + 1}. ${f}${marker}`);
  });
  console.log();

  const defaultPrompt = defaultIndex >= 0 ? ` [Enter para "${DEFAULT_PDF}"]` : '';
  const answer = await ask(`Escolha o número do PDF${defaultPrompt}: `);

  if (answer.trim() === '') {
    if (defaultIndex >= 0) return pdfs[defaultIndex];
    console.error('Nenhum PDF padrão disponível. Digite o número correspondente.');
    return choosePdf(pdfs);
  }

  const num = parseInt(answer, 10);
  if (isNaN(num) || num < 1 || num > pdfs.length) {
    console.error(`Opção inválida. Escolha entre 1 e ${pdfs.length}.`);
    return choosePdf(pdfs);
  }

  return pdfs[num - 1];
}

async function askPageNumber(label, fallback) {
  const fallbackHint = fallback != null ? ` [Enter para ${fallback}]` : '';
  const answer = await ask(`${label}${fallbackHint}: `);
  if (answer.trim() === '' && fallback != null) return fallback;
  const num = parseInt(answer, 10);
  if (isNaN(num) || num < 1) {
    console.error('Número de página inválido. Digite um inteiro maior que zero.');
    return askPageNumber(label, fallback);
  }
  return num;
}

async function askOutputName(defaultName) {
  const answer = await ask(`Nome do arquivo de saída (sem extensão) [Enter para "${defaultName}"]: `);
  const name = answer.trim() || defaultName;
  // Remover caracteres inválidos em nomes de arquivo
  const safe = name.replace(/[<>:"/\\|?*]/g, '_');
  if (safe !== name) {
    console.log(`Nome ajustado para: ${safe}`);
  }
  return safe;
}

async function main() {
  const pdfs = listPdfs();

  if (pdfs.length === 0) {
    console.log('Nenhum PDF encontrado na pasta .pdfs/. Adicione um arquivo PDF lá e tente novamente.');
    rl.close();
    return;
  }

  const pdfName = await choosePdf(pdfs);
  const pdfPath = path.join(BIBLIAS_DIR, pdfName);

  console.log();
  const startPage = await askPageNumber('Página inicial', null);
  const endPage = await askPageNumber('Página final', startPage);

  if (endPage < startPage) {
    console.error(`Página final (${endPage}) não pode ser menor que a inicial (${startPage}).`);
    rl.close();
    process.exit(1);
  }

  const baseName = path.basename(pdfName, '.pdf');
  const defaultName = `${baseName}-pag-${startPage}-a-${endPage}`;

  console.log();
  const outputName = await askOutputName(defaultName);

  rl.close();

  // Lê e processa o PDF
  console.log(`\nLendo "${pdfName}"...`);
  const srcBytes = fs.readFileSync(pdfPath);
  const srcDoc = await PDFDocument.load(srcBytes);
  const totalPages = srcDoc.getPageCount();

  const clampedStart = Math.max(1, startPage);
  const clampedEnd = Math.min(totalPages, endPage);

  if (startPage > totalPages) {
    console.error(`Página inicial (${startPage}) excede o total de páginas do PDF (${totalPages}).`);
    process.exit(1);
  }

  if (startPage !== clampedStart || endPage !== clampedEnd) {
    console.log(`Intervalo ajustado para páginas ${clampedStart}–${clampedEnd} (total: ${totalPages} páginas).`);
  }

  const destDoc = await PDFDocument.create();
  // pdf-lib usa índice 0-based
  const indices = [];
  for (let i = clampedStart - 1; i <= clampedEnd - 1; i++) {
    indices.push(i);
  }

  const copiedPages = await destDoc.copyPages(srcDoc, indices);
  copiedPages.forEach((page) => destDoc.addPage(page));

  const outputPath = path.join(OUTPUT_DIR, `${outputName}.pdf`);
  const destBytes = await destDoc.save();
  fs.writeFileSync(outputPath, destBytes);

  const pageCount = clampedEnd - clampedStart + 1;
  console.log(`\nConcluído! ${pageCount} página(s) extraída(s).`);
  console.log(`Arquivo gerado: ${outputPath}`);
}

main().catch((err) => {
  console.error('Erro:', err.message);
  rl.close();
  process.exit(1);
});
