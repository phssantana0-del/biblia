import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Raiz onde ficam as edições: edicoes/figueiredo/<livro>/
const EDICOES_DIR = path.join(__dirname, 'edicoes', 'figueiredo');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

/**
 * Lista subpastas de edicoes/figueiredo/ que contenham um index.json.
 * Retorna array de nomes de pasta (ex: ['proverbios', 'salmos']).
 */
function listLivros() {
  if (!fs.existsSync(EDICOES_DIR)) {
    console.error(`Pasta não encontrada: ${EDICOES_DIR}`);
    process.exit(1);
  }
  return fs.readdirSync(EDICOES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(EDICOES_DIR, d.name, 'index.json')))
    .map((d) => d.name);
}

async function chooseLivro(livros) {
  console.log('\nLivros disponíveis em edicoes/figueiredo/:\n');
  livros.forEach((nome, i) => {
    const temPdf = fs.existsSync(path.join(EDICOES_DIR, nome, 'index.pdf'));
    const hint = temPdf ? '' : ' (sem index.pdf)';
    console.log(`  ${i + 1}. ${nome}${hint}`);
  });
  console.log();

  const answer = await ask('Escolha o número do livro: ');
  const num = parseInt(answer, 10);
  if (isNaN(num) || num < 1 || num > livros.length) {
    console.error(`Opção inválida. Escolha entre 1 e ${livros.length}.`);
    return chooseLivro(livros);
  }
  return livros[num - 1];
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
  const livros = listLivros();

  if (livros.length === 0) {
    console.log('Nenhum livro encontrado em edicoes/figueiredo/. Crie a pasta do livro com um index.json primeiro.');
    rl.close();
    return;
  }

  const livroNome = await chooseLivro(livros);
  const livroDir = path.join(EDICOES_DIR, livroNome);
  const pdfFonte = path.join(livroDir, 'index.pdf');

  if (!fs.existsSync(pdfFonte)) {
    console.error(`\nindex.pdf não encontrado em edicoes/figueiredo/${livroNome}/`);
    console.error('Coloque o PDF completo do livro nesse caminho e tente novamente.');
    rl.close();
    process.exit(1);
  }

  console.log();
  const startPage = await askPageNumber('Página inicial', null);
  const endPage = await askPageNumber('Página final', startPage);

  if (endPage < startPage) {
    console.error(`Página final (${endPage}) não pode ser menor que a inicial (${startPage}).`);
    rl.close();
    process.exit(1);
  }

  const defaultName = `${livroNome}-pag-${startPage}-a-${endPage}`;

  console.log();
  const outputName = await askOutputName(defaultName);

  rl.close();

  // Lê e processa o PDF
  console.log(`\nLendo "edicoes/figueiredo/${livroNome}/index.pdf"...`);
  const srcBytes = fs.readFileSync(pdfFonte);
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
  const indices = [];
  for (let i = clampedStart - 1; i <= clampedEnd - 1; i++) {
    indices.push(i);
  }

  const copiedPages = await destDoc.copyPages(srcDoc, indices);
  copiedPages.forEach((page) => destDoc.addPage(page));

  const outputPath = path.join(livroDir, `${outputName}.pdf`);
  const destBytes = await destDoc.save();
  fs.writeFileSync(outputPath, destBytes);

  const pageCount = clampedEnd - clampedStart + 1;
  console.log(`\nConcluído! ${pageCount} página(s) extraída(s).`);
  console.log(`Arquivo gerado: edicoes/figueiredo/${livroNome}/${outputName}.pdf`);
}

main().catch((err) => {
  console.error('Erro:', err.message);
  rl.close();
  process.exit(1);
});
