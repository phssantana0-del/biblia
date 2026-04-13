// ══════════════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ══════════════════════════════════════════════════════════════

const BASE_URL = 'edicoes/index.json';

let state = {
  editions: [],
  currentEditionId: null,
  currentBookId: null,
  currentBookDir: null,
  currentChapter: 1,
  currentBookIntroducao: null,
  loadedBookIndexes: {},
  loadedChapters: {},
  compareMode: false,
  compareEditionId: null,
  compareBookData: null,
  activePdfType: null,
};

let activePopup = null;

// ══════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ══════════════════════════════════════════════════════════════

async function init() {
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`Não foi possível carregar edicoes/index.json (HTTP ${res.status})`);
    state.editions = await res.json();
  } catch (e) {
    document.getElementById('content').innerHTML = `<p class="error-msg">Erro ao carregar edicoes/index.json: ${e.message}</p>`;
    return;
  }

  buildEditionSelector();

  const firstEdition = state.editions.find(e => e.livros && e.livros.length > 0);
  if (!firstEdition) {
    document.getElementById('content').innerHTML = `<p class="error-msg">Nenhum livro disponível ainda. Adicione entradas em edicoes/index.json.</p>`;
    return;
  }

  state.currentEditionId = firstEdition.id;
  document.getElementById('sel-edition').value = firstEdition.id;
  document.getElementById('topbar-edition-label').textContent = firstEdition.edicao;

  await loadBook(firstEdition.id, firstEdition.livros[0]);
}

// ══════════════════════════════════════════════════════════════
//  SELETOR DE EDIÇÃO
// ══════════════════════════════════════════════════════════════

function buildEditionSelector() {
  const sel = document.getElementById('sel-edition');
  sel.innerHTML = '';
  state.editions.forEach(ed => {
    const opt = document.createElement('option');
    opt.value = ed.id;
    opt.textContent = ed.edicao;
    if (ed.livros.length === 0) opt.disabled = true;
    sel.appendChild(opt);
  });
}

function onEditionChange(editionId) {
  const ed = state.editions.find(e => e.id === editionId);
  if (!ed || !ed.livros.length) return;
  state.currentEditionId = editionId;
  document.getElementById('topbar-edition-label').textContent = ed.edicao;

  const sameBook = ed.livros.find(f => f.includes(state.currentBookId));
  const bookFile = sameBook || ed.livros[0];
  loadBook(editionId, bookFile);
}

// ══════════════════════════════════════════════════════════════
//  CARREGAMENTO DE LIVRO
// ══════════════════════════════════════════════════════════════

async function fetchBookIndex(editionId, bookFile) {
  const cacheKey = editionId + '/' + bookFile;
  if (state.loadedBookIndexes[cacheKey]) return state.loadedBookIndexes[cacheKey];
  const res = await fetch(bookFile);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar ${bookFile}`);
  const data = await res.json();
  state.loadedBookIndexes[cacheKey] = data;
  return data;
}

async function fetchChapter(bookDir, num) {
  const cacheKey = bookDir + '/' + num;
  if (state.loadedChapters[cacheKey]) return state.loadedChapters[cacheKey];
  const url = bookDir + '/' + num + '.json';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar ${url}`);
  const data = await res.json();
  state.loadedChapters[cacheKey] = data;
  return data;
}

function bookDirFromFile(bookFile) {
  return bookFile.substring(0, bookFile.lastIndexOf('/'));
}

async function loadBook(editionId, bookFile, chapter = 1) {
  document.getElementById('content').innerHTML = '<p class="loading-msg">Carregando…</p>';
  try {
    const bookIndex = await fetchBookIndex(editionId, bookFile);
    const bookDir = bookDirFromFile(bookFile);

    state.currentBookId = bookIndex.id;
    state.currentBookDir = bookDir;
    state.currentChapter = chapter;
    state.currentBookIntroducao = bookIndex.introducao || null;

    const chData = await fetchChapter(bookDir, chapter);

    renderChapter(chData, bookDir, 'content');
    updateNav(bookIndex);
    document.getElementById('nav-book-title').textContent = bookIndex.titulo;
    document.getElementById('bot-book-title').textContent = bookIndex.titulo;
    buildBookSelector();

    if (state.compareMode && state.compareEditionId) {
      await loadCompareChapter();
    }
  } catch (e) {
    document.getElementById('content').innerHTML = `<p class="error-msg">Erro ao carregar livro: ${e.message}</p>`;
  }
}

// ══════════════════════════════════════════════════════════════
//  RENDERIZAÇÃO
// ══════════════════════════════════════════════════════════════

function renderChapter(ch, bookDir, targetId) {
  if (!ch) {
    document.getElementById(targetId).innerHTML = '<p class="error-msg">Capítulo não encontrado.</p>';
    return;
  }

  const notaKeys = ch.notas ? Object.keys(ch.notas) : [];

  const verses = ch.versiculos.filter(i => i.tipo !== 'bio');
  const bios   = ch.versiculos.filter(i => i.tipo === 'bio');
  const ordered = [...verses, ...bios];

  const lines = ordered.map(item => {
    if (item.tipo === 'bio') {
      return `<div class="bio"><div class="bio-title">${item.titulo}</div><p>${item.texto}</p></div>`;
    }
    let fnHtml = '';
    if (item.nota && ch.notas && ch.notas[item.nota]) {
      const nota = ch.notas[item.nota];
      const fnNum = notaKeys.indexOf(item.nota) + 1;
      const popupId = `popup_${targetId}_${item.nota}`;
      fnHtml = `<sup class="fnref" onclick="togglePopup(event,'${popupId}')">[${fnNum}]<span class="fn-popup" id="${popupId}"><button class="fn-close" onclick="closePopup(event)">✕</button><span class="fn-label">${nota.rotulo}</span> — <span>${nota.texto}</span></span></sup>`;
    }
    return `<p class="verse" data-v="${item.n}"><span class="vnum"><a name="v${item.n}">${item.n}</a></span>${item.texto}${fnHtml}</p>`;
  }).join('\n');

  const pdfUrl = bookDir + '/' + ch.num + '.pdf';
  const pdfOldUrl = bookDir.replace('/figueiredo/', '/figueiredo-original/') + '/' + ch.num + '.pdf';
  const compareLabel = state.compareMode ? '⇄ Descomparar' : '⇄ Comparar';
  const compareBtn = `<button class="ver-original-btn btn-compare" onclick="toggleCompare()">${compareLabel}</button>`;
  const pdfBtn = `<button class="ver-original-btn" onclick="openPdfPanel('${pdfUrl}', 'PDF recente')" style="margin-left:12px;">&#128196; PDF recente</button>`;
  const pdfOldBtn = `<button class="ver-original-btn" onclick="openPdfPanel('${pdfOldUrl}', 'PDF original')" style="margin-left:12px;">&#128196; PDF original</button>`;

  document.getElementById(targetId).innerHTML = `
    <div class="chapter-header">
      <h1>Capítulo ${ch.num}</h1>
      <div class="summary">${ch.sumario}</div>
      ${compareBtn}${pdfBtn}${pdfOldBtn}
    </div>
    <hr class="section-rule">
    ${lines}
  `;

  if (targetId === 'content' && state.activePdfType &&
      document.getElementById('pdf-panel').classList.contains('open')) {
    const reloadUrl = state.activePdfType === 'recent'
      ? pdfUrl
      : pdfOldUrl;
    const reloadLabel = state.activePdfType === 'recent' ? 'PDF recente' : 'PDF original';
    document.getElementById('pdf-panel-title').textContent = '\u{1F4C4} ' + reloadLabel;
    document.getElementById('pdf-frame').src = reloadUrl;
  }
}

function renderVerseHtml(item, notas, notaKeys, prefix) {
  if (item.tipo === 'bio') {
    return `<div class="bio"><div class="bio-title">${item.titulo}</div><p>${item.texto}</p></div>`;
  }
  let fnHtml = '';
  if (item.nota && notas && notas[item.nota]) {
    const nota = notas[item.nota];
    const fnNum = notaKeys.indexOf(item.nota) + 1;
    const popupId = `popup_${prefix}_${item.nota}`;
    fnHtml = `<sup class="fnref" onclick="togglePopup(event,'${popupId}')">[${fnNum}]<span class="fn-popup" id="${popupId}"><button class="fn-close" onclick="closePopup(event)">✕</button><span class="fn-label">${nota.rotulo}</span> — <span>${nota.texto}</span></span></sup>`;
  }
  return `<span class="vnum"><a name="v${item.n}_${prefix}">${item.n}</a></span>${item.texto}${fnHtml}`;
}

function renderCompareGrid(ch1, ch2, bookDir1, bookDir2) {
  const grid = document.getElementById('compare-grid');
  grid.innerHTML = '';

  if (!ch1) {
    grid.innerHTML = '<p class="error-msg" style="grid-column:1/-1">Capítulo não encontrado.</p>';
    return;
  }

  const ed1 = state.editions.find(e => e.id === state.currentEditionId);
  const ed2 = ch2 ? state.editions.find(e => e.id === state.compareEditionId) : null;

  const makeHeaderCell = (ed, ch, bookDir, showButtons) => {
    const div = document.createElement('div');
    div.className = 'cg-cell cg-header-cell';
    let buttonsHtml = '';
    if (showButtons) {
      const pdfUrl = bookDir + '/' + ch.num + '.pdf';
      const pdfOldUrl = bookDir.replace('/figueiredo/', '/figueiredo-original/') + '/' + ch.num + '.pdf';
      const compareLabel = state.compareMode ? '⇄ Descomparar' : '⇄ Comparar';
      buttonsHtml = `<button class="ver-original-btn btn-compare" onclick="toggleCompare()">${compareLabel}</button>`
        + `<button class="ver-original-btn" onclick="openPdfPanel('${pdfUrl}', 'PDF recente')" style="margin-left:12px;">&#128196; PDF recente</button>`
        + `<button class="ver-original-btn" onclick="openPdfPanel('${pdfOldUrl}', 'PDF original')" style="margin-left:12px;">&#128196; PDF original</button>`;
    }
    div.innerHTML = `<div class="cg-edition-label">${ed ? ed.edicao : ''}</div>`
      + `<div class="cg-chapter-title">Capítulo ${ch.num}</div>`
      + `<div class="cg-summary-text">${ch.sumario}</div>`
      + buttonsHtml;
    return div;
  };

  grid.appendChild(makeHeaderCell(ed1, ch1, bookDir1, true));
  if (ch2) {
    grid.appendChild(makeHeaderCell(ed2, ch2, bookDir2, false));
  } else {
    grid.appendChild(document.createElement('div'));
  }

  const rule = document.createElement('div');
  rule.className = 'cg-rule';
  grid.appendChild(rule);

  const verses1  = ch1.versiculos.filter(i => i.tipo !== 'bio');
  const bios1    = ch1.versiculos.filter(i => i.tipo === 'bio');
  const verses2  = ch2 ? ch2.versiculos.filter(i => i.tipo !== 'bio') : [];
  const bios2    = ch2 ? ch2.versiculos.filter(i => i.tipo === 'bio') : [];
  const notaKeys1 = ch1.notas ? Object.keys(ch1.notas) : [];
  const notaKeys2 = ch2 && ch2.notas ? Object.keys(ch2.notas) : [];
  const maxLen   = Math.max(verses1.length, verses2.length);
  const maxBios  = Math.max(bios1.length, bios2.length);

  for (let i = 0; i < maxLen; i++) {
    const item1 = verses1[i];
    const item2 = verses2[i];

    const cell1 = document.createElement('div');
    cell1.className = 'cg-cell';
    if (item1) cell1.innerHTML = renderVerseHtml(item1, ch1.notas || {}, notaKeys1, 'cg1');
    grid.appendChild(cell1);

    const cell2 = document.createElement('div');
    cell2.className = 'cg-cell';
    if (item2) cell2.innerHTML = renderVerseHtml(item2, (ch2 && ch2.notas) || {}, notaKeys2, 'cg2');
    grid.appendChild(cell2);

    const divider = document.createElement('div');
    divider.className = 'cg-divider';
    grid.appendChild(divider);
  }

  for (let i = 0; i < maxBios; i++) {
    const b1 = bios1[i];
    const b2 = bios2[i];

    const bcell1 = document.createElement('div');
    bcell1.className = 'cg-cell';
    if (b1) bcell1.innerHTML = `<div class="bio"><div class="bio-title">${b1.titulo}</div><p>${b1.texto}</p></div>`;
    grid.appendChild(bcell1);

    const bcell2 = document.createElement('div');
    bcell2.className = 'cg-cell';
    if (b2) bcell2.innerHTML = `<div class="bio"><div class="bio-title">${b2.titulo}</div><p>${b2.texto}</p></div>`;
    grid.appendChild(bcell2);

    const bdivider = document.createElement('div');
    bdivider.className = 'cg-divider';
    grid.appendChild(bdivider);
  }
}

// ══════════════════════════════════════════════════════════════
//  NAVEGAÇÃO
// ══════════════════════════════════════════════════════════════

function updateNav(bookIndex) {
  const caps = bookIndex.capitulos;
  const ch = state.currentChapter;

  document.getElementById('nav-ch-num').textContent = ch;

  const prevEl  = document.getElementById('nav-prev-ch');
  const botPrev = document.getElementById('bot-prev');
  const prevCap = caps[caps.indexOf(ch) - 1];
  if (prevCap !== undefined) {
    prevEl.outerHTML  = `<a href="#" id="nav-prev-ch" onclick="goChapter(${prevCap}); return false;">&lt; cap. ant.</a>`;
    botPrev.outerHTML = `<a href="#" id="bot-prev" onclick="goChapter(${prevCap}); return false;">&lt; cap. ant.</a>`;
  } else {
    prevEl.outerHTML  = `<span class="dimmed" id="nav-prev-ch">&lt; cap. ant.</span>`;
    botPrev.outerHTML = `<span class="dimmed" id="bot-prev">&lt; cap. ant.</span>`;
  }

  const nextEl  = document.getElementById('nav-next-ch');
  const botNext = document.getElementById('bot-next');
  const nextCap = caps[caps.indexOf(ch) + 1];
  if (nextCap !== undefined) {
    nextEl.outerHTML  = `<a href="#" id="nav-next-ch" onclick="goChapter(${nextCap}); return false;">próx. cap. &gt;</a>`;
    botNext.outerHTML = `<a href="#" id="bot-next" onclick="goChapter(${nextCap}); return false;">próx. cap. &gt;</a>`;
  } else {
    nextEl.outerHTML  = `<span class="dimmed" id="nav-next-ch">próx. cap. &gt;</span>`;
    botNext.outerHTML = `<span class="dimmed" id="bot-next">próx. cap. &gt;</span>`;
  }

  const introLink = state.currentBookIntroducao
    ? `<a href="#" onclick="openIntro(); return false;">Introdução</a> `
    : '';
  let links = '<span class="label">Capítulos:</span> ' + introLink;
  caps.forEach(n => {
    if (n === ch) links += `<a class="current" href="#">${n}</a> `;
    else links += `<a href="#" onclick="goChapter(${n}); return false;">${n}</a> `;
  });
  document.getElementById('chapter-links').innerHTML = links;
}

function goChapter(n) {
  if (activePopup) { activePopup.classList.remove('active'); activePopup = null; }
  const ed = state.editions.find(e => e.id === state.currentEditionId);
  const bookFile = ed.livros.find(f => f.includes('/' + state.currentBookId + '/'));
  loadBook(state.currentEditionId, bookFile, n);
  window.scrollTo(0, 0);
}

async function prevBook() {
  const ed = state.editions.find(e => e.id === state.currentEditionId);
  const idx = ed.livros.findIndex(f => f.includes('/' + state.currentBookId + '/'));
  if (idx <= 0) return;
  await loadBook(state.currentEditionId, ed.livros[idx - 1], 1);
}

async function nextBook() {
  const ed = state.editions.find(e => e.id === state.currentEditionId);
  const idx = ed.livros.findIndex(f => f.includes('/' + state.currentBookId + '/'));
  if (idx < 0 || idx >= ed.livros.length - 1) return;
  await loadBook(state.currentEditionId, ed.livros[idx + 1], 1);
}

// ══════════════════════════════════════════════════════════════
//  MODO COMPARAÇÃO
// ══════════════════════════════════════════════════════════════

function toggleCompare() {
  state.compareMode = !state.compareMode;

  // Atualiza texto de todos os botões Comparar visiveis
  const label = state.compareMode ? '⇄ Descomparar' : '⇄ Comparar';
  document.querySelectorAll('.btn-compare').forEach(b => b.textContent = label);

  const area = document.getElementById('main-area');
  if (state.compareMode) {
    area.classList.replace('single', 'compare');
    const other = state.editions.find(e => e.id !== state.currentEditionId && e.livros.length > 0);
    if (other) {
      state.compareEditionId = other.id;
      loadCompareChapter();
    }
  } else {
    area.classList.replace('compare', 'single');
    state.compareEditionId = null;
    document.getElementById('compare-grid').innerHTML = '';
    document.getElementById('content-compare').innerHTML = '';
  }
}

function buildCompareEditionSelector() {
  const sel = document.getElementById('sel-compare-edition');
  sel.innerHTML = '<option value="">— selecionar edição —</option>';
  state.editions.forEach(ed => {
    if (ed.id === state.currentEditionId) return;
    const opt = document.createElement('option');
    opt.value = ed.id;
    opt.textContent = ed.edicao;
    if (ed.livros.length === 0) opt.disabled = true;
    sel.appendChild(opt);
  });
}

function onCompareEditionChange(editionId) {
  if (!editionId) return;
  state.compareEditionId = editionId;
  loadCompareChapter();
}

async function loadCompareChapter() {
  if (!state.compareEditionId) return;
  const ed = state.editions.find(e => e.id === state.compareEditionId);
  const grid = document.getElementById('compare-grid');
  document.getElementById('compare-status').textContent = '';

  if (!ed || !ed.livros.length) {
    grid.innerHTML = '<p class="error-msg" style="grid-column:1/-1">Esta edição ainda não possui livros disponíveis.</p>';
    return;
  }

  const bookFile2 = ed.livros.find(f => f.includes('/' + state.currentBookId + '/'));
  if (!bookFile2) {
    grid.innerHTML = '<p class="error-msg" style="grid-column:1/-1">O livro atual ainda não está disponível nesta edição.</p>';
    document.getElementById('compare-status').textContent = 'livro não disponível nesta edição';
    return;
  }

  grid.innerHTML = '<p class="loading-msg" style="grid-column:1/-1">Carregando…</p>';

  try {
    const bookDir2 = bookDirFromFile(bookFile2);
    const ch2 = await fetchChapter(bookDir2, state.currentChapter);
    const ch1 = state.loadedChapters[state.currentBookDir + '/' + state.currentChapter];
    renderCompareGrid(ch1, ch2, state.currentBookDir, bookDir2);
  } catch (e) {
    grid.innerHTML = `<p class="error-msg" style="grid-column:1/-1">Erro: ${e.message}</p>`;
  }
}

// ══════════════════════════════════════════════════════════════
//  SELETOR DE LIVROS (OVERLAY)
// ══════════════════════════════════════════════════════════════

function buildBookSelector() {
  const ed = state.editions.find(e => e.id === state.currentEditionId);
  if (!ed) return;

  const testamentoMap = new Map();
  const unloaded = [];

  ed.livros.forEach(file => {
    const cacheKey = ed.id + '/' + file;
    const bookIdx = state.loadedBookIndexes[cacheKey];
    if (!bookIdx) { unloaded.push(file); return; }
    const testamento = bookIdx.testamento || 'Outros';
    const grupo = bookIdx.grupo || 'Outros';
    if (!testamentoMap.has(testamento)) testamentoMap.set(testamento, new Map());
    const grupoMap = testamentoMap.get(testamento);
    if (!grupoMap.has(grupo)) grupoMap.set(grupo, []);
    grupoMap.get(grupo).push({ file, book: bookIdx });
  });

  const TESTAMENTO_ORDER = ['Antigo Testamento', 'Novo Testamento'];
  const sortedTestamentos = [...testamentoMap.entries()].sort(([a], [b]) => {
    const ia = TESTAMENTO_ORDER.indexOf(a), ib = TESTAMENTO_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, 'pt');
  });

  let html = '';
  for (const [testamento, grupoMap] of sortedTestamentos) {
    html += `<div class="testament-section"><div class="testament-title">${testamento}</div>`;
    for (const [grupo, items] of grupoMap.entries()) {
      html += `<div class="book-group"><div class="group-label">${grupo}</div>`;
      items.forEach(({ file, book }) => {
        const cls = book.id === state.currentBookId ? ' class="current-book"' : '';
        html += `<a${cls} href="#" onclick="selectBook('${file}'); return false;">${book.titulo}</a>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  }

  if (unloaded.length > 0) {
    html += `<div class="testament-section"><div class="book-group"><div class="group-label">Carregando…</div>`;
    unloaded.forEach(file => {
      const label = file.split('/').slice(-2, -1)[0] || file.split('/').pop().replace('.json', '');
      html += `<a href="#" onclick="selectBook('${file}'); return false;">${label}</a>`;
    });
    html += `</div></div>`;
  }

  if (!html) html = '<p style="color:#888;font-size:13px;">Nenhum livro disponível ainda.</p>';
  document.getElementById('book-list-content').innerHTML = html;
}

async function selectBook(file) {
  closeBooks();
  await loadBook(state.currentEditionId, file, 1);
}

async function openBooks() {
  document.getElementById('book-selector').classList.add('open');
  buildBookSelector();

  const ed = state.editions.find(e => e.id === state.currentEditionId);
  if (!ed) return;
  const pending = ed.livros.filter(f => !state.loadedBookIndexes[ed.id + '/' + f]);
  if (pending.length > 0) {
    await Promise.all(pending.map(f => fetchBookIndex(ed.id, f).catch(() => null)));
    buildBookSelector();
  }
}

function closeBooks() { document.getElementById('book-selector').classList.remove('open'); }
function closeBooksOverlay(e) {
  if (e.target === document.getElementById('book-selector')) closeBooks();
}

// ══════════════════════════════════════════════════════════════
//  POPUPS DE NOTAS
// ══════════════════════════════════════════════════════════════

function togglePopup(e, popupId) {
  e.stopPropagation();
  const popup = document.getElementById(popupId);
  if (!popup) return;
  if (activePopup && activePopup !== popup) activePopup.classList.remove('active');
  popup.classList.toggle('active');
  activePopup = popup.classList.contains('active') ? popup : null;
}

function closePopup(e) {
  e.stopPropagation();
  if (activePopup) { activePopup.classList.remove('active'); activePopup = null; }
}

document.addEventListener('click', () => {
  if (activePopup) { activePopup.classList.remove('active'); activePopup = null; }
});

// ══════════════════════════════════════════════════════════════
//  DRAWER / VISUALIZAÇÃO DE PDF
//  — Em celular (< 768 px): abre em nova aba (compatível com Safari iOS)
//  — Em desktop: abre no drawer lateral
// ══════════════════════════════════════════════════════════════

function openPdfPanel(url, label) {
  if (window.innerWidth < 768) {
    window.open(url, '_blank');
    return;
  }
  state.activePdfType = label === 'PDF recente' ? 'recent' : 'original';
  const frame = document.getElementById('pdf-frame');
  const panel = document.getElementById('pdf-panel');
  if (label) document.getElementById('pdf-panel-title').textContent = '\u{1F4C4} ' + label;
  frame.src = url;
  panel.classList.add('open');
}

function closePdfPanel() {
  const panel = document.getElementById('pdf-panel');
  panel.classList.remove('open');
  state.activePdfType = null;
  setTimeout(() => { document.getElementById('pdf-frame').src = ''; }, 300);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closePdfPanel(); closeIntro(); }
});

// ══════════════════════════════════════════════════════════════
//  MODAL DE INTRODUÇÃO
// ══════════════════════════════════════════════════════════════

function openIntro() {
  document.getElementById('intro-content').innerHTML =
    state.currentBookIntroducao || '<p>Introdução não disponível.</p>';
  document.getElementById('intro-modal').classList.add('open');
}

function closeIntro() {
  document.getElementById('intro-modal').classList.remove('open');
}

function closeIntroOverlay(e) {
  if (e.target === document.getElementById('intro-modal')) closeIntro();
}

// ══════════════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════════════

init();
