// ══════════════════════════════════════════════════════════════
//  ESTADO GLOBAL
// ══════════════════════════════════════════════════════════════

const BASE_URL = 'edicoes/index.json';
const NAV_STORAGE_KEY = 'biblia:last-navigation';
const THEME_STORAGE_KEY = 'biblia:theme';
const ROUTING_MODE = 'hash';
const MOBILE_PDF_INITIAL_SCALE = 1;

function createPdfViewerState() {
  return {
    pdfDoc: null,
    loadingTask: null,
    scale: 1,
    url: null,
    token: 0,
  };
}

let state = {
  editions: [],
  currentEditionId: null,
  currentBookId: null,
  currentBookDir: null,
  currentChapter: 1,
  currentVerse: null,
  appBasePath: '',
  urlSyncEnabled: false,
  currentBookIntroducao: null,
  loadedBookIndexes: {},
  loadedChapters: {},
  compareMode: false,
  compareEditionId: null,
  compareBookData: null,
  activePdfType: null,
  chapterViewMode: 'text',
  inlinePdfType: 'recent',
  pdfViewers: {
    inline: createPdfViewerState(),
    modal: createPdfViewerState(),
  },
  darkMode: false,
};

let activePopup = null;
let pdfModalHistoryActive = false;
let ignoreNextModalPopstate = false;
let pdfModalGesturesBound = false;
let pdfPinchGesturesBound = false;
let pdfPinchState = null;

function isIOSMobile() {
  const ua = navigator.userAgent || '';
  const iDevice = /iP(hone|ad|od)/.test(ua);
  const iPadLike = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iDevice || iPadLike;
}

function isPdfModalOpen() {
  const modal = document.getElementById('pdf-modal');
  return Boolean(modal && modal.classList.contains('open'));
}

function initPdfModalGestures() {
  if (pdfModalGesturesBound || !isIOSMobile()) return;

  const modal = document.getElementById('pdf-modal');
  const panel = document.getElementById('pdf-modal-panel');
  if (!modal || !panel) return;

  let touchState = null;

  panel.addEventListener('touchstart', (e) => {
    if (!isPdfModalOpen()) return;
    if (!e.touches || e.touches.length !== 1) return;

    const t = e.touches[0];
    touchState = {
      startX: t.clientX,
      startY: t.clientY,
      lastX: t.clientX,
      lastY: t.clientY,
      fromLeftEdge: t.clientX <= 24,
    };
  }, { passive: true });

  panel.addEventListener('touchmove', (e) => {
    if (!touchState || !e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchState.lastX = t.clientX;
    touchState.lastY = t.clientY;
  }, { passive: true });

  panel.addEventListener('touchend', () => {
    if (!touchState || !isPdfModalOpen()) {
      touchState = null;
      return;
    }

    const dx = touchState.lastX - touchState.startX;
    const dy = Math.abs(touchState.lastY - touchState.startY);
    const shouldClose = touchState.fromLeftEdge && dx > 72 && dx > (dy * 1.25);

    touchState = null;
    if (shouldClose) {
      closePdfModal();
    }
  }, { passive: true });

  panel.addEventListener('touchcancel', () => {
    touchState = null;
  }, { passive: true });

  pdfModalGesturesBound = true;
}

function getTouchDistance(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt((dx * dx) + (dy * dy));
}

function getViewerKeyFromPdfWrap(wrap) {
  if (!wrap) return null;
  return wrap.classList.contains('pdfjs-canvas-wrap-modal') ? 'modal' : 'inline';
}

function resetPinchPreview(stateForPinch) {
  if (!stateForPinch || !stateForPinch.pages) return;
  stateForPinch.pages.style.transform = '';
  stateForPinch.pages.style.transformOrigin = '';
  stateForPinch.pages.style.willChange = '';
}

function initPdfPinchGestures() {
  if (pdfPinchGesturesBound) return;

  document.addEventListener('touchstart', (e) => {
    if (window.innerWidth >= 768) return;
    if (!e.touches || e.touches.length !== 2) return;

    const wrap = e.target && e.target.closest ? e.target.closest('.pdfjs-canvas-wrap') : null;
    if (!wrap) return;

    const viewerKey = getViewerKeyFromPdfWrap(wrap);
    const viewer = viewerKey ? state.pdfViewers[viewerKey] : null;
    const dom = viewerKey ? getPdfViewerDom(viewerKey) : null;
    if (!viewer || !viewer.pdfDoc || !dom || !dom.pages) return;

    const startDistance = getTouchDistance(e.touches[0], e.touches[1]);
    if (!Number.isFinite(startDistance) || startDistance <= 0) return;

    pdfPinchState = {
      viewerKey,
      pages: dom.pages,
      startDistance,
      startScale: viewer.scale || MOBILE_PDF_INITIAL_SCALE,
      nextScale: viewer.scale || MOBILE_PDF_INITIAL_SCALE,
    };

    dom.pages.style.transformOrigin = 'center top';
    dom.pages.style.willChange = 'transform';

    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!pdfPinchState) return;
    if (!e.touches || e.touches.length < 2) return;

    const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
    if (!Number.isFinite(currentDistance) || currentDistance <= 0) return;

    const ratio = currentDistance / pdfPinchState.startDistance;
    const nextScale = Math.max(0.7, Math.min(3, pdfPinchState.startScale * ratio));
    pdfPinchState.nextScale = nextScale;

    const previewFactor = nextScale / pdfPinchState.startScale;
    pdfPinchState.pages.style.transform = `scale(${previewFactor})`;

    const dom = getPdfViewerDom(pdfPinchState.viewerKey);
    if (dom && dom.zoomLabel) {
      dom.zoomLabel.textContent = `${Math.round(nextScale * 100)}%`;
    }

    e.preventDefault();
  }, { passive: false });

  const finishPinch = () => {
    if (!pdfPinchState) return;

    const { viewerKey, nextScale } = pdfPinchState;
    const dom = getPdfViewerDom(viewerKey);
    resetPinchPreview(pdfPinchState);
    pdfPinchState = null;

    if (!dom || !dom.pages) return;
    setPdfViewerScale(viewerKey, nextScale);
  };

  document.addEventListener('touchend', (e) => {
    if (!pdfPinchState) return;
    if (e.touches && e.touches.length >= 2) return;
    finishPinch();
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    finishPinch();
  }, { passive: true });

  pdfPinchGesturesBound = true;
}

function handlePdfModalPopstate() {
  if (ignoreNextModalPopstate) {
    ignoreNextModalPopstate = false;
    return true;
  }

  if (isPdfModalOpen()) {
    closePdfModal({ fromPopstate: true });
    return true;
  }

  return false;
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.classList.toggle('dark-mode', isDark);
  state.darkMode = isDark;

  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;

  btn.textContent = isDark ? '☀️ Claro' : '🌙 Noturno';
  btn.setAttribute('aria-pressed', String(isDark));
  btn.title = isDark ? 'Ativar modo claro' : 'Ativar modo noturno';
}

function initTheme() {
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  } catch (_) {
    savedTheme = null;
  }

  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme);
    return;
  }

  applyTheme('light');
}

function toggleDarkMode() {
  const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
  applyTheme(nextTheme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch (_) {
    // sem persistencia quando localStorage nao estiver disponivel
  }
}

function parsePositiveInt(value) {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function detectAppBasePath(editions) {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const editionIds = new Set(editions.map(e => e.id));
  const editionPos = segments.findIndex(s => editionIds.has(s));

  if (editionPos >= 0) {
    const prefix = segments.slice(0, editionPos);
    return prefix.length ? '/' + prefix.join('/') : '';
  }

  let path = window.location.pathname;
  if (path.endsWith('/index.html')) path = path.slice(0, -('/index.html'.length));
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path === '/' ? '' : path;
}

function parseNavigationFromUrl() {
  if (window.location.hash && window.location.hash.startsWith('#/')) {
    const hashSegments = window.location.hash.slice(2).split('/').filter(Boolean);
    const compareIndex = hashSegments.indexOf('compare');
    const baseSegments = compareIndex >= 0 ? hashSegments.slice(0, compareIndex) : hashSegments;
    const edicao = baseSegments[0] || null;
    const livro = baseSegments[1] || null;
    const capitulo = parsePositiveInt(baseSegments[2]);
    const versiculo = parsePositiveInt(baseSegments[3]);
    const compareEditionId = compareIndex >= 0 ? (hashSegments[compareIndex + 1] || null) : null;

    if (!edicao || !livro || !capitulo) return null;
    return {
      editionId: edicao,
      bookId: livro,
      chapter: capitulo,
      verse: versiculo,
      compareEditionId,
    };
  }

  const segments = window.location.pathname.split('/').filter(Boolean);
  const editionIds = new Set(state.editions.map(e => e.id));
  const editionPos = segments.findIndex(s => editionIds.has(s));
  if (editionPos < 0) return null;

  const edicao = segments[editionPos] || null;
  const livro = segments[editionPos + 1] || null;
  const capitulo = parsePositiveInt(segments[editionPos + 2]);
  const versiculo = parsePositiveInt(segments[editionPos + 3]);
  const comparePos = segments.indexOf('compare', editionPos + 3);
  const compareEditionId = comparePos >= 0 ? (segments[comparePos + 1] || null) : null;

  if (!edicao || !livro || !capitulo) return null;
  return {
    editionId: edicao || null,
    bookId: livro || null,
    chapter: capitulo,
    verse: versiculo,
    compareEditionId,
  };
}

function loadNavigationFromStorage() {
  try {
    const raw = localStorage.getItem(NAV_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      editionId: parsed.editionId || null,
      bookId: parsed.bookId || null,
      chapter: parsePositiveInt(parsed.chapter),
      verse: parsePositiveInt(parsed.verse),
    };
  } catch (_) {
    return null;
  }
}

function saveNavigationToStorage() {
  const payload = {
    editionId: state.currentEditionId,
    bookId: state.currentBookId,
    chapter: state.currentChapter,
    verse: state.currentVerse,
  };
  localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(payload));
}

function updateUrlFromState(historyMode = 'replace') {
  if (!state.currentEditionId || !state.currentBookId || !state.currentChapter) return;

  const route = `${state.currentEditionId}/${state.currentBookId}/${state.currentChapter}`;
  let nextPath = `${state.appBasePath}/${route}`;
  if (state.currentVerse) {
    nextPath += `/${state.currentVerse}`;
  }
  if (state.compareMode && state.compareEditionId) {
    nextPath += `/compare/${state.compareEditionId}`;
  }

  let hashRoute = route;
  if (state.currentVerse) hashRoute += `/${state.currentVerse}`;
  if (state.compareMode && state.compareEditionId) {
    hashRoute += `/compare/${state.compareEditionId}`;
  }

  const next = ROUTING_MODE === 'hash'
    ? `${window.location.pathname}${window.location.search}#/${hashRoute}`
    : `${nextPath}`;

  if (historyMode === 'push') {
    window.history.pushState(null, '', next);
  } else {
    window.history.replaceState(null, '', next);
  }
}

function findBookFileByBookId(editionId, bookId) {
  const ed = state.editions.find(e => e.id === editionId);
  if (!ed || !ed.livros || !bookId) return null;
  return ed.livros.find(f => f.includes('/' + bookId + '/')) || null;
}

function scrollToVerse(verseNumber) {
  if (!verseNumber) return false;
  const selector = `#content .verse[data-v="${verseNumber}"]`;
  const verseEl = document.querySelector(selector);
  if (!verseEl) return false;

  const absoluteTop = window.scrollY + verseEl.getBoundingClientRect().top;
  const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const targetTop = Math.min(absoluteTop, maxScrollTop);

  window.scrollTo({ top: targetTop, behavior: 'smooth' });
  highlightSelectedVerses(verseNumber);
  return true;
}

function highlightVerseElement(verseEl) {
  if (!verseEl) return;
  verseEl.classList.add('verse-marked');
}

function highlightSelectedVerses(verseNumber) {
  document.querySelectorAll('.verse.verse-marked').forEach(el => el.classList.remove('verse-marked'));
  if (!verseNumber) return;

  const mainVerse = document.querySelector(`#content .verse[data-v="${verseNumber}"]`);
  if (mainVerse) highlightVerseElement(mainVerse);

  document.querySelectorAll(`#compare-grid .compare-verse[data-v="${verseNumber}"]`).forEach(el => {
    highlightVerseElement(el);
  });
}

function buildShareUrl() {
  const route = `${state.currentEditionId}/${state.currentBookId}/${state.currentChapter}`
    + (state.currentVerse ? `/${state.currentVerse}` : '');
  const compareSegment = state.compareMode && state.compareEditionId
    ? `/compare/${state.compareEditionId}`
    : '';
  return `${window.location.origin}${window.location.pathname}${window.location.search}#/${route}${compareSegment}`;
}

function getCurrentVerseText() {
  const chapterKey = `${state.currentBookDir}/${state.currentChapter}`;
  const chapterData = state.loadedChapters[chapterKey];
  if (!chapterData || !chapterData.versiculos || !state.currentVerse) return null;

  const verse = chapterData.versiculos.find(v => v && v.tipo !== 'bio' && Number(v.n) === state.currentVerse);
  return verse && verse.texto ? verse.texto.trim() : null;
}

function getCompareVerseText() {
  if (!state.compareMode || !state.compareEditionId || !state.currentVerse) return null;
  const ed = state.editions.find(e => e.id === state.compareEditionId);
  if (!ed || !ed.livros) return null;
  const bookFile2 = ed.livros.find(f => f.includes('/' + state.currentBookId + '/'));
  if (!bookFile2) return null;
  const bookDir2 = bookDirFromFile(bookFile2);
  const chapterData = state.loadedChapters[bookDir2 + '/' + state.currentChapter];
  if (!chapterData || !chapterData.versiculos) return null;
  const verse = chapterData.versiculos.find(v => v && v.tipo !== 'bio' && Number(v.n) === state.currentVerse);
  return verse && verse.texto ? verse.texto.trim() : null;
}

function getShareLabel() {
  const bookTitleEl = document.getElementById('nav-book-title');
  const bookTitle = bookTitleEl && bookTitleEl.textContent
    ? bookTitleEl.textContent.trim()
    : state.currentBookId;

  const verseText = getCurrentVerseText();
  const ref = state.currentVerse
    ? `${bookTitle} ${state.currentChapter}, ${state.currentVerse}`
    : `${bookTitle} ${state.currentChapter}`;

  const primaryLine = verseText ? `${ref} — ${verseText}` : ref;

  if (state.compareMode && state.compareEditionId) {
    const compareEdition = state.editions.find(e => e.id === state.compareEditionId);
    const compareName = compareEdition ? compareEdition.edicao : state.compareEditionId;
    const compareVerseText = getCompareVerseText();
    const compareRef = state.currentVerse
      ? `${bookTitle} (${compareName}), ${state.currentChapter}, ${state.currentVerse}`
      : `${bookTitle} (${compareName}), ${state.currentChapter}`;
    const compareLine = compareVerseText ? `Vulgata: ${compareVerseText}` : compareRef;
    return `${primaryLine}\n\n${compareLine}`;
  }

  return primaryLine;
}

async function shareCurrentVerse() {
  const shareUrl = buildShareUrl();
  const shareLabel = getShareLabel();
  const fullMessage = `${shareLabel}\n\n${shareUrl}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Bíblia Sagrada',
        text: shareLabel,
        url: shareUrl,
      });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(fullMessage);
      return;
    } catch (_) {
      // cai no prompt
    }
  }

  window.prompt('Copie o versículo:', fullMessage);
}

function markUserNavigation() {
  state.urlSyncEnabled = true;
}

function setCurrentVerse(verseNumber) {
  const n = parsePositiveInt(verseNumber);
  if (!n) return;
  markUserNavigation();
  state.currentVerse = n;
  updateUrlFromState('replace');
  saveNavigationToStorage();
}

async function onVerseNumberClick(e, verseNumber) {
  if (e) e.preventDefault();
  const n = parsePositiveInt(verseNumber);
  if (!n) return;

  setCurrentVerse(n);
  highlightSelectedVerses(n);
  await shareCurrentVerse();
}

async function restoreNavigationFromState(nav, options = {}) {
  const firstEdition = state.editions.find(e => e.livros && e.livros.length > 0);
  if (!firstEdition) {
    document.getElementById('content').innerHTML = '<p class="error-msg">Nenhum livro disponível ainda. Adicione entradas em edicoes/index.json.</p>';
    return;
  }

  const editionId = nav && nav.editionId && state.editions.some(e => e.id === nav.editionId && e.livros.length > 0)
    ? nav.editionId
    : firstEdition.id;

  state.currentEditionId = editionId;
  document.getElementById('sel-edition').value = editionId;

  const selectedEdition = state.editions.find(e => e.id === editionId);
  document.getElementById('topbar-edition-label').textContent = selectedEdition.edicao;

  if (nav && nav.compareEditionId && nav.compareEditionId !== editionId) {
    const compareEdition = state.editions.find(e => e.id === nav.compareEditionId && e.livros && e.livros.length > 0);
    if (compareEdition) {
      state.compareMode = true;
      state.compareEditionId = compareEdition.id;
      const area = document.getElementById('main-area');
      area.classList.remove('single');
      area.classList.add('compare');
    }
  }

  const bookFile = nav && nav.bookId
    ? (findBookFileByBookId(editionId, nav.bookId) || selectedEdition.livros[0])
    : selectedEdition.livros[0];

  await loadBook(
    editionId,
    bookFile,
    nav && nav.chapter ? nav.chapter : 1,
    nav && nav.verse ? nav.verse : null,
    {
      scrollToTop: false,
      syncUrl: options.syncUrl,
      historyMode: options.historyMode || 'replace',
    }
  );
}

// ══════════════════════════════════════════════════════════════
//  BOOTSTRAP
// ══════════════════════════════════════════════════════════════

async function init() {
  initTheme();
  initPdfModalGestures();
  initPdfPinchGestures();

  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`Não foi possível carregar edicoes/index.json (HTTP ${res.status})`);
    state.editions = await res.json();
  } catch (e) {
    document.getElementById('content').innerHTML = `<p class="error-msg">Erro ao carregar edicoes/index.json: ${e.message}</p>`;
    return;
  }

  buildEditionSelector();
  state.appBasePath = detectAppBasePath(state.editions);

  const navFromUrl = parseNavigationFromUrl();
  const navFromStorage = loadNavigationFromStorage();
  state.urlSyncEnabled = Boolean(navFromUrl);
  await restoreNavigationFromState(navFromUrl || navFromStorage, {
    syncUrl: Boolean(navFromUrl),
    historyMode: 'replace',
  });

  window.addEventListener('popstate', async () => {
    if (handlePdfModalPopstate()) return;

    const nav = parseNavigationFromUrl();
    if (!nav) return;

    if (nav.compareEditionId && nav.compareEditionId !== (nav.editionId || state.currentEditionId)) {
      const compareEdition = state.editions.find(e => e.id === nav.compareEditionId && e.livros && e.livros.length > 0);
      if (compareEdition) {
        state.compareMode = true;
        state.compareEditionId = compareEdition.id;
        const areaOn = document.getElementById('main-area');
        areaOn.classList.remove('single');
        areaOn.classList.add('compare');
      }
    } else {
      state.compareMode = false;
      state.compareEditionId = null;
      const areaOff = document.getElementById('main-area');
      areaOff.classList.remove('compare');
      areaOff.classList.add('single');
      document.getElementById('compare-grid').innerHTML = '';
      document.getElementById('content-compare').innerHTML = '';
    }

    const editionId = nav.editionId && state.editions.some(e => e.id === nav.editionId)
      ? nav.editionId
      : state.currentEditionId;
    const bookFile = findBookFileByBookId(editionId, nav.bookId) || findBookFileByBookId(editionId, state.currentBookId);
    if (!bookFile) return;
    await loadBook(editionId, bookFile, nav.chapter || 1, nav.verse || null, { scrollToTop: false, syncUrl: false });
  });
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

function getVulgataEdition() {
  return state.editions.find(e => e.id === 'vulgata' && e.livros && e.livros.length > 0)
    || state.editions.find(e => /vulgata/i.test(`${e.edicao || ''} ${e.id || ''}`) && e.livros && e.livros.length > 0)
    || null;
}

function buildCompareButtonHtml(options = {}) {
  const isUndo = Boolean(options.isUndo);
  const extraClass = options.extraClass ? ` ${options.extraClass}` : '';
  const idAttr = options.withId === false ? '' : ' id="compare-toggle-btn"';
  const btnClass = `compare-toggle-btn${isUndo ? ' active compare-toggle-btn-undo' : ''}${extraClass}`;
  const label = isUndo ? 'Desfazer comparação' : 'Comparar à Vulgata';
  const title = isUndo ? 'Desfazer comparação com Vulgata' : 'Comparar à Vulgata';
  const icon = isUndo ? '✕' : '';
  return `<button${idAttr} class="${btnClass}" onclick="toggleCompare()" title="${title}"><span class="compare-toggle-label">${label}</span><span class="compare-toggle-icon" aria-hidden="true">${icon}</span></button>`;
}

function updateCompareButton() {
  const btn = document.getElementById('compare-toggle-btn');
  if (!btn) return;
  const label = btn.querySelector('.compare-toggle-label');
  const icon = btn.querySelector('.compare-toggle-icon');

  const vulgata = getVulgataEdition();
  const shouldHide = !vulgata || state.currentEditionId === vulgata.id;
  const shouldDisable = state.chapterViewMode === 'pdf';
  const isActive = state.compareMode && !shouldDisable;

  btn.style.display = shouldHide ? 'none' : 'inline-flex';
  btn.disabled = false;
  btn.title = isActive ? 'Desfazer comparação com Vulgata' : 'Comparar à Vulgata';
  if (label) {
    label.textContent = isActive ? 'Desfazer comparação' : 'Comparar à Vulgata';
  }
  if (icon) {
    icon.textContent = isActive ? '✕' : '';
  }
  btn.classList.toggle('active', isActive);
  btn.classList.toggle('compare-toggle-btn-undo', isActive);
  btn.classList.toggle('disabled', false);
}

function onEditionChange(editionId) {
  const ed = state.editions.find(e => e.id === editionId);
  if (!ed || !ed.livros.length) return;
  state.currentEditionId = editionId;
  document.getElementById('topbar-edition-label').textContent = ed.edicao;

  const vulgata = getVulgataEdition();
  if (!vulgata || editionId === vulgata.id) {
    state.compareMode = false;
    state.compareEditionId = null;
    const area = document.getElementById('main-area');
    area.classList.remove('compare');
    area.classList.add('single');
    document.getElementById('compare-grid').innerHTML = '';
    document.getElementById('content-compare').innerHTML = '';
  }

  const sameBook = ed.livros.find(f => f.includes(state.currentBookId));
  const bookFile = sameBook || ed.livros[0];
  markUserNavigation();
  loadBook(editionId, bookFile, 1, null, { historyMode: 'push' });
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
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status} ao carregar ${url}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }
  const data = await res.json();
  state.loadedChapters[cacheKey] = data;
  return data;
}

function bookDirFromFile(bookFile) {
  return bookFile.substring(0, bookFile.lastIndexOf('/'));
}

function getChapterAssets(bookDir, chapterNumber) {
  const pdfUrl = bookDir + '/' + chapterNumber + '.pdf';
  const pdfOldUrl = bookDir.replace('/figueiredo/', '/figueiredo-original/') + '/' + chapterNumber + '.pdf';
  const hasPdf = !bookDir.includes('/vulgata/');
  return { pdfUrl, pdfOldUrl, hasPdf };
}

function isMissingChapterError(error) {
  return Boolean(error && error.status === 404);
}

function disableCompareForPdfFallback() {
  state.compareMode = false;
  state.compareEditionId = null;

  const area = document.getElementById('main-area');
  area.classList.remove('compare');
  area.classList.add('single');

  document.getElementById('compare-grid').innerHTML = '';
  document.getElementById('content-compare').innerHTML = '';
  document.getElementById('compare-status').textContent = '';
}

async function loadBook(editionId, bookFile, chapter = 1, verse = null, options = {}) {
  document.getElementById('content').innerHTML = '<p class="loading-msg">Carregando…</p>';
  closePdfModal();
  try {
    const bookIndex = await fetchBookIndex(editionId, bookFile);
    const bookDir = bookDirFromFile(bookFile);
    const chapterNumber = bookIndex.capitulos.includes(chapter) ? chapter : (bookIndex.capitulos[0] || 1);
    const verseNumber = parsePositiveInt(verse);

    state.currentBookId = bookIndex.id;
    state.currentBookDir = bookDir;
    state.currentChapter = chapterNumber;
    state.currentVerse = verseNumber;
    state.currentBookIntroducao = bookIndex.introducao || null;
    state.chapterViewMode = 'text';
    document.getElementById('compare-status').textContent = '';

    const vulgata = getVulgataEdition();
    const area = document.getElementById('main-area');
    if (!vulgata || editionId === vulgata.id) {
      state.compareMode = false;
      state.compareEditionId = null;
      area.classList.remove('compare');
      area.classList.add('single');
    } else if (state.compareMode) {
      state.compareEditionId = vulgata.id;
      area.classList.remove('single');
      area.classList.add('compare');
    }

    let chData;
    try {
      chData = await fetchChapter(bookDir, chapterNumber);
    } catch (e) {
      if (isMissingChapterError(e) && !bookDir.includes('/vulgata/')) {
        state.currentVerse = null;
        state.chapterViewMode = 'pdf';
        disableCompareForPdfFallback();
        renderChapterPdfFallback(chapterNumber, bookDir, 'content');
        updateNav(bookIndex);
        updateCompareButton();
        document.getElementById('nav-book-title').textContent = bookIndex.tituloIndice || bookIndex.titulo;
        document.getElementById('bot-book-title').textContent = bookIndex.tituloIndice || bookIndex.titulo;
        buildBookSelector();

        const shouldSyncUrl = state.urlSyncEnabled && options.syncUrl !== false;
        if (shouldSyncUrl) {
          updateUrlFromState(options.historyMode || 'replace');
        }
        saveNavigationToStorage();

        requestAnimationFrame(() => {
          if (options.scrollToTop !== false) window.scrollTo(0, 0);
        });
        return;
      }
      throw e;
    }

    renderChapter(chData, bookDir, 'content');
    updateNav(bookIndex);
    updateCompareButton();
    document.getElementById('nav-book-title').textContent = bookIndex.tituloIndice || bookIndex.titulo;
    document.getElementById('bot-book-title').textContent = bookIndex.tituloIndice || bookIndex.titulo;
    buildBookSelector();

    const shouldSyncUrl = state.urlSyncEnabled && options.syncUrl !== false;
    if (shouldSyncUrl) {
      updateUrlFromState(options.historyMode || 'replace');
    }
    saveNavigationToStorage();

    requestAnimationFrame(() => {
      if (state.currentVerse) {
        scrollToVerse(state.currentVerse);
      } else if (options.scrollToTop) {
        window.scrollTo(0, 0);
      }
    });

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

  if (targetId === 'content') {
    state.chapterViewMode = 'text';
    destroyPdfViewerSession('inline');
  }

  const chapterSummary = typeof ch.sumario === 'string' ? ch.sumario : '';

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
    const vnumLabel = item.n === 0 ? '' : item.n;
    return `<p class="verse" id="v-${item.n}" data-v="${item.n}"><span class="vnum"><a href="#" onclick="onVerseNumberClick(event, ${item.n}); return false;" name="v${item.n}">${vnumLabel}</a></span>${item.texto}${fnHtml}</p>`;
  }).join('\n');

  const { pdfUrl, pdfOldUrl, hasPdf } = getChapterAssets(bookDir, ch.num);
  const originalLink = getOriginalLinkForChapter(ch);
  const pdfBtn = hasPdf ? `<button class="ver-original-btn" onclick="openPdfPanel('${pdfUrl}', 'Ver PDF 1950', 'recent')">Ver PDF 1950</button>` : '';
  const pdfOldBtn = hasPdf ? `<button class="ver-original-btn" onclick="openPdfPanel('${pdfOldUrl}', 'Ver PDF original', 'original')">Ver PDF original</button>` : '';
  const linkBtn = originalLink ? `<button class="ver-original-btn" onclick="openPdfPanel('${originalLink}', 'Ver no Wikisource', 'link')">Ver no Wikisource</button>` : '';
  const compareBtn = buildCompareButtonHtml();

  document.getElementById(targetId).innerHTML = `
    <div class="chapter-header">
      <h1>Capítulo ${ch.num}</h1>
      <div class="summary">${chapterSummary}</div>
      <div class="chapter-header-actions">${pdfOldBtn}${pdfBtn}${linkBtn}${compareBtn}</div>
    </div>
    <hr class="section-rule">
    ${lines}
  `;

  if (targetId === 'content' && state.activePdfType &&
      document.getElementById('pdf-panel').classList.contains('open')) {
    const reloadUrl = state.activePdfType === 'recent'
      ? pdfUrl
      : state.activePdfType === 'original'
        ? pdfOldUrl
        : originalLink;
    const reloadLabel = state.activePdfType === 'recent'
      ? 'Ver PDF 1950'
      : state.activePdfType === 'original'
        ? 'Ver PDF original'
        : 'Ver no Wikisource';
    if (!reloadUrl) {
      closePdfPanel();
      return;
    }
    document.getElementById('pdf-panel-title').textContent = getPanelIconByLabel(reloadLabel) + ' ' + reloadLabel;
    document.getElementById('pdf-frame').src = reloadUrl;
  }
}

function renderChapterPdfFallback(chapterNumber, bookDir, targetId) {
  const container = document.getElementById(targetId);
  const { pdfUrl, pdfOldUrl, hasPdf } = getChapterAssets(bookDir, chapterNumber);

  if (!hasPdf) {
    container.innerHTML = '<p class="error-msg">Texto do capítulo indisponível e não há PDF para fallback.</p>';
    return;
  }

  const activeType = state.inlinePdfType === 'original' ? 'original' : 'recent';
  const activeUrl = activeType === 'original' ? pdfOldUrl : pdfUrl;
  state.inlinePdfType = activeType;
  const useIframeFallback = window.innerWidth >= 768;

  if (useIframeFallback) {
    destroyPdfViewerSession('inline').catch(() => null);
  }

  container.innerHTML = `
    <div class="chapter-header pdf-fallback-header">
      <h1>Capítulo ${chapterNumber}</h1>
      <div class="summary">Texto deste capítulo ainda não foi transcrito. Exibindo o PDF do capítulo.</div>
      <div class="inline-pdf-toolbar chapter-header-actions">
        <button class="ver-original-btn inline-pdf-toggle${activeType === 'recent' ? ' active' : ''}" data-pdf-type="recent" onclick="switchInlinePdfFallback('recent')">Ver PDF 1950</button>
        <button class="ver-original-btn inline-pdf-toggle${activeType === 'original' ? ' active' : ''}" data-pdf-type="original" onclick="switchInlinePdfFallback('original')">Ver PDF original</button>
        ${buildCompareButtonHtml()}
      </div>
    </div>
    <hr class="section-rule">
    ${useIframeFallback
      ? `<iframe id="chapter-pdf-fallback-frame" class="chapter-pdf-fallback-frame" src="${activeUrl}" title="PDF do capítulo ${chapterNumber}"></iframe>`
      : `<div class="pdfjs-mobile-toolbar" id="chapter-pdf-toolbar" role="toolbar" aria-label="Controles de zoom do PDF">
           <button class="pdfjs-tool-btn" onclick="pdfViewerZoomOut('inline')" title="Diminuir zoom">&#8722;</button>
           <button class="pdfjs-tool-btn pdfjs-tool-btn-label" id="chapter-pdf-zoom-label" onclick="pdfViewerZoomReset('inline')" title="Resetar zoom">100%</button>
           <button class="pdfjs-tool-btn" onclick="pdfViewerZoomIn('inline')" title="Aumentar zoom">+</button>
           <button class="pdfjs-tool-btn" onclick="pdfViewerFitWidth('inline')" title="Ajustar à largura">Ajustar</button>
         </div>
         <div class="pdfjs-canvas-wrap">
           <div class="pdfjs-status" id="chapter-pdf-status"></div>
           <div id="chapter-pdf-pages" class="pdfjs-pages" aria-label="PDF do capítulo ${chapterNumber}"></div>
         </div>`}
  `;

  if (!useIframeFallback) {
    loadPdfInViewer('inline', activeUrl, {
      scale: MOBILE_PDF_INITIAL_SCALE,
    });
  }
}

function switchInlinePdfFallback(type) {
  if (!state.currentBookDir || !state.currentChapter) return;

  const nextType = type === 'original' ? 'original' : 'recent';
  const { pdfUrl, pdfOldUrl } = getChapterAssets(state.currentBookDir, state.currentChapter);
  state.inlinePdfType = nextType;
  const nextUrl = nextType === 'original' ? pdfOldUrl : pdfUrl;

  const frame = document.getElementById('chapter-pdf-fallback-frame');
  if (frame) {
    frame.src = nextUrl;
  } else {
    const pages = document.getElementById('chapter-pdf-pages');
    if (!pages) return;
    loadPdfInViewer('inline', nextUrl, {
      scale: MOBILE_PDF_INITIAL_SCALE,
    });
  }

  document.querySelectorAll('.inline-pdf-toggle').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pdfType === nextType);
  });
}

function getOriginalLinkForChapter(chapterData) {
  if (!chapterData) return null;
  if (typeof chapterData.link !== 'string') return null;

  const raw = chapterData.link.trim();
  return raw || null;
}

function getPanelIconByLabel(label) {
  return label === 'Ver no Wikisource' ? '\u{1F517}' : '\u{1F4C4}';
}

function getPdfJsLib() {
  if (!window.pdfjsLib) return null;
  if (!getPdfJsLib.workerConfigured) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    getPdfJsLib.workerConfigured = true;
  }
  return window.pdfjsLib;
}

function getPdfViewerDom(viewerKey) {
  if (viewerKey === 'inline') {
    return {
      pages: document.getElementById('chapter-pdf-pages'),
      status: document.getElementById('chapter-pdf-status'),
      zoomLabel: document.getElementById('chapter-pdf-zoom-label'),
    };
  }
  if (viewerKey === 'modal') {
    return {
      pages: document.getElementById('modal-pdf-pages'),
      status: document.getElementById('modal-pdf-status'),
      zoomLabel: document.getElementById('modal-pdf-zoom-label'),
    };
  }
  return null;
}

function updatePdfViewerToolbar(viewerKey) {
  const viewer = state.pdfViewers[viewerKey];
  const dom = getPdfViewerDom(viewerKey);
  if (!viewer || !dom || !dom.zoomLabel) return;
  const percent = Math.round((viewer.scale || 1) * 100);
  dom.zoomLabel.textContent = `${percent}%`;
}

function setPdfViewerStatus(viewerKey, text, isError = false) {
  const dom = getPdfViewerDom(viewerKey);
  if (!dom || !dom.status) return;
  dom.status.textContent = text || '';
  dom.status.classList.toggle('error-msg', Boolean(isError && text));
}

function clearPdfViewerPages(viewerKey) {
  const dom = getPdfViewerDom(viewerKey);
  if (!dom || !dom.pages) return;
  dom.pages.innerHTML = '';
}

function capturePdfViewerScrollCenter(viewerKey) {
  const dom = getPdfViewerDom(viewerKey);
  const scrollHost = dom && dom.pages ? dom.pages.parentElement : null;
  if (!scrollHost) return null;

  const width = Math.max(1, scrollHost.scrollWidth);
  const height = Math.max(1, scrollHost.scrollHeight);

  return {
    xRatio: (scrollHost.scrollLeft + (scrollHost.clientWidth / 2)) / width,
    yRatio: (scrollHost.scrollTop + (scrollHost.clientHeight / 2)) / height,
  };
}

function restorePdfViewerScrollCenter(viewerKey, center) {
  if (!center) return;
  const dom = getPdfViewerDom(viewerKey);
  const scrollHost = dom && dom.pages ? dom.pages.parentElement : null;
  if (!scrollHost) return;

  const targetLeft = (center.xRatio * scrollHost.scrollWidth) - (scrollHost.clientWidth / 2);
  const targetTop = (center.yRatio * scrollHost.scrollHeight) - (scrollHost.clientHeight / 2);

  const maxLeft = Math.max(0, scrollHost.scrollWidth - scrollHost.clientWidth);
  const maxTop = Math.max(0, scrollHost.scrollHeight - scrollHost.clientHeight);

  scrollHost.scrollLeft = Math.max(0, Math.min(maxLeft, Math.round(targetLeft)));
  scrollHost.scrollTop = Math.max(0, Math.min(maxTop, Math.round(targetTop)));
}

function centerPdfViewerHorizontallyAtTop(viewerKey) {
  const dom = getPdfViewerDom(viewerKey);
  const scrollHost = dom && dom.pages ? dom.pages.parentElement : null;
  if (!scrollHost) return;

  const maxLeft = Math.max(0, scrollHost.scrollWidth - scrollHost.clientWidth);
  scrollHost.scrollLeft = Math.round(maxLeft / 2);
  scrollHost.scrollTop = 0;
}

async function destroyPdfViewerSession(viewerKey) {
  const viewer = state.pdfViewers[viewerKey];
  if (!viewer) return;

  viewer.token += 1;
  if (viewer.loadingTask) {
    try { viewer.loadingTask.destroy(); } catch (_) { }
    viewer.loadingTask = null;
  }
  if (viewer.pdfDoc) {
    try { await viewer.pdfDoc.destroy(); } catch (_) { }
    viewer.pdfDoc = null;
  }

  viewer.url = null;
  clearPdfViewerPages(viewerKey);
  setPdfViewerStatus(viewerKey, '');
}

async function loadPdfInViewer(viewerKey, url, options = {}) {
  const viewer = state.pdfViewers[viewerKey];
  const lib = getPdfJsLib();

  if (!viewer) return;
  if (!lib) {
    setPdfViewerStatus(viewerKey, 'Visualização indisponível neste navegador. Abra o PDF em nova aba.', true);
    return;
  }
  if (!url) {
    setPdfViewerStatus(viewerKey, 'PDF indisponível para este capítulo.', true);
    return;
  }

  await destroyPdfViewerSession(viewerKey);

  viewer.url = url;
  viewer.scale = Number.isFinite(options.scale) ? options.scale : viewer.scale;
  updatePdfViewerToolbar(viewerKey);
  viewer.token += 1;
  const token = viewer.token;

  setPdfViewerStatus(viewerKey, 'Carregando PDF…');

  try {
    const loadingTask = lib.getDocument(url);
    viewer.loadingTask = loadingTask;
    const pdfDoc = await loadingTask.promise;
    if (viewer.token !== token) {
      try { await pdfDoc.destroy(); } catch (_) { }
      return;
    }

    viewer.pdfDoc = pdfDoc;
    await renderPdfViewerDocument(viewerKey);
  } catch (error) {
    if (viewer.token !== token) return;
    const msg = error && error.message ? error.message : 'falha ao abrir o PDF';
    setPdfViewerStatus(viewerKey, `Não foi possível abrir o PDF (${msg}).`, true);
  } finally {
    if (viewer.token === token) {
      viewer.loadingTask = null;
    }
  }
}

async function renderPdfViewerDocument(viewerKey, options = {}) {
  const viewer = state.pdfViewers[viewerKey];
  if (!viewer || !viewer.pdfDoc) return;

  const dom = getPdfViewerDom(viewerKey);
  if (!dom || !dom.pages) return;

  clearPdfViewerPages(viewerKey);
  const token = viewer.token;
  setPdfViewerStatus(viewerKey, `Renderizando ${viewer.pdfDoc.numPages} páginas…`);

  try {
    const firstPage = await viewer.pdfDoc.getPage(1);
    if (viewer.token !== token) return;

    const baseViewport = firstPage.getViewport({ scale: 1 });
    const measuredPagesWidth = Math.floor(dom.pages.getBoundingClientRect().width);
    const parentWidth = dom.pages.parentElement
      ? Math.floor(dom.pages.parentElement.getBoundingClientRect().width - 16)
      : 0;
    const pagesWidth = measuredPagesWidth || parentWidth || baseViewport.width;
    const fitScale = pagesWidth > 0 ? (pagesWidth / baseViewport.width) : 1;
    const zoomScale = Number.isFinite(viewer.scale) && viewer.scale > 0 ? viewer.scale : 1;
    const displayScale = Math.max(0.5, fitScale * zoomScale);
    const qualityBoost = window.innerWidth < 768 ? 1.35 : 1.65;
    const maxCanvasPixels = 16_000_000;
    const hasExplicitCenter = Boolean(options.preserveCenter);
    let centeredOnFirstPage = false;

    for (let n = 1; n <= viewer.pdfDoc.numPages; n += 1) {
      if (viewer.token !== token) return;
      const page = n === 1 ? firstPage : await viewer.pdfDoc.getPage(n);
      if (viewer.token !== token) return;

      const displayViewport = page.getViewport({ scale: displayScale });
      let renderScale = displayScale * qualityBoost;
      let renderViewport = page.getViewport({ scale: renderScale });

      let outputScale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      let targetPixels = renderViewport.width * outputScale * renderViewport.height * outputScale;
      if (targetPixels > maxCanvasPixels) {
        const reduction = Math.sqrt(maxCanvasPixels / targetPixels);
        renderScale *= reduction;
        renderViewport = page.getViewport({ scale: renderScale });
        targetPixels = renderViewport.width * outputScale * renderViewport.height * outputScale;
        if (targetPixels > maxCanvasPixels) {
          outputScale = 1;
        }
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });

      canvas.width = Math.floor(renderViewport.width * outputScale);
      canvas.height = Math.floor(renderViewport.height * outputScale);
      canvas.style.width = `${Math.floor(displayViewport.width)}px`;
      canvas.style.height = 'auto';

      dom.pages.appendChild(canvas);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport: renderViewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
      });
      await renderTask.promise;

      if (!hasExplicitCenter && !centeredOnFirstPage && n === 1) {
        centerPdfViewerHorizontallyAtTop(viewerKey);
        centeredOnFirstPage = true;
      }
    }

    setPdfViewerStatus(viewerKey, '');
    if (hasExplicitCenter) {
      requestAnimationFrame(() => restorePdfViewerScrollCenter(viewerKey, options.preserveCenter));
    }
  } catch (error) {
    if (viewer.token !== token) return;
    const msg = error && error.message ? error.message : 'falha de renderização';
    setPdfViewerStatus(viewerKey, `Erro ao renderizar PDF (${msg}).`, true);
  }
}

function setPdfViewerScale(viewerKey, scale) {
  const viewer = state.pdfViewers[viewerKey];
  if (!viewer) return;

  const nextScale = Math.max(0.7, Math.min(3, scale));
  if (!Number.isFinite(nextScale)) return;
  if (Math.abs(nextScale - (viewer.scale || 0)) < 0.01) {
    updatePdfViewerToolbar(viewerKey);
    return;
  }

  viewer.scale = nextScale;
  updatePdfViewerToolbar(viewerKey);

  if (viewer.pdfDoc) {
    const center = capturePdfViewerScrollCenter(viewerKey);
    viewer.token += 1;
    renderPdfViewerDocument(viewerKey, { preserveCenter: center });
  }
}

function pdfViewerZoomIn(viewerKey) {
  const viewer = state.pdfViewers[viewerKey];
  if (!viewer) return;
  setPdfViewerScale(viewerKey, (viewer.scale || 1) + 0.15);
}

function pdfViewerZoomOut(viewerKey) {
  const viewer = state.pdfViewers[viewerKey];
  if (!viewer) return;
  setPdfViewerScale(viewerKey, (viewer.scale || 1) - 0.15);
}

function pdfViewerZoomReset(viewerKey) {
  setPdfViewerScale(viewerKey, 1);
}

function pdfViewerFitWidth(viewerKey) {
  setPdfViewerScale(viewerKey, 1);
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
  const vnumLabel = item.n === 0 ? '' : item.n;
  return `<span class="vnum"><a href="#" onclick="onVerseNumberClick(event, ${item.n}); return false;" name="v${item.n}_${prefix}">${vnumLabel}</a></span>${item.texto}${fnHtml}`;
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

  const makeHeaderCell = (ed, ch, bookDir, showPdfButtons) => {
    const div = document.createElement('div');
    div.className = 'cg-cell cg-header-cell';
    const chapterSummary = typeof ch.sumario === 'string' ? ch.sumario : '';
    const originalLink = getOriginalLinkForChapter(ch);
    let buttonsHtml = '';
    const hasPdf = !bookDir.includes('/vulgata/');
    if (showPdfButtons && hasPdf) {
      const { pdfUrl, pdfOldUrl } = getChapterAssets(bookDir, ch.num);
      buttonsHtml = `<button class="ver-original-btn" onclick="openPdfPanel('${pdfUrl}', 'Ver PDF 1950', 'recent')">Ver PDF 1950</button>`
        + `<button class="ver-original-btn" onclick="openPdfPanel('${pdfOldUrl}', 'Ver PDF original', 'original')">Ver PDF original</button>`;
    }
    if (originalLink) {
      buttonsHtml += `<button class="ver-original-btn" onclick="openPdfPanel('${originalLink}', 'Ver no Wikisource', 'link')">Ver no Wikisource</button>`;
    }
    if (state.compareMode && ed && ed.id === state.compareEditionId) {
      buttonsHtml += buildCompareButtonHtml({ isUndo: true, extraClass: 'compare-toggle-btn-right', withId: false });
    }
    const actionsHtml = buttonsHtml ? `<div class="chapter-header-actions">${buttonsHtml}</div>` : '';
    div.innerHTML = `<div class="cg-edition-label">${ed ? ed.edicao : ''}</div>`
      + `<div class="cg-chapter-title">Capítulo ${ch.num}</div>`
      + `<div class="cg-summary-text">${chapterSummary}</div>`
      + actionsHtml;
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
  const maxBios  = Math.max(bios1.length, bios2.length);

  // Align by verse number (not by position) so verse 0 in one edition
  // doesn't misalign against verse 1 in the other
  const allNums = [...new Set([...verses1.map(v => v.n), ...verses2.map(v => v.n)])].sort((a, b) => a - b);

  for (const num of allNums) {
    const item1 = verses1.find(v => v.n === num);
    const item2 = verses2.find(v => v.n === num);

    const cell1 = document.createElement('div');
    cell1.className = 'cg-cell';
    if (item1) {
      cell1.innerHTML = `<p class="verse compare-verse" data-v="${item1.n}">${renderVerseHtml(item1, ch1.notas || {}, notaKeys1, 'cg1')}</p>`;
    }
    grid.appendChild(cell1);

    const cell2 = document.createElement('div');
    cell2.className = 'cg-cell';
    if (item2) {
      cell2.innerHTML = `<p class="verse compare-verse" data-v="${item2.n}">${renderVerseHtml(item2, (ch2 && ch2.notas) || {}, notaKeys2, 'cg2')}</p>`;
    }
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

  if (state.currentVerse) {
    highlightSelectedVerses(state.currentVerse);
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
  markUserNavigation();
  loadBook(state.currentEditionId, bookFile, n, null, { scrollToTop: true, historyMode: 'push' });
}

async function prevBook() {
  const ed = state.editions.find(e => e.id === state.currentEditionId);
  const idx = ed.livros.findIndex(f => f.includes('/' + state.currentBookId + '/'));
  if (idx <= 0) return;
  markUserNavigation();
  await loadBook(state.currentEditionId, ed.livros[idx - 1], 1, null, { scrollToTop: true, historyMode: 'push' });
}

async function nextBook() {
  const ed = state.editions.find(e => e.id === state.currentEditionId);
  const idx = ed.livros.findIndex(f => f.includes('/' + state.currentBookId + '/'));
  if (idx < 0 || idx >= ed.livros.length - 1) return;
  markUserNavigation();
  await loadBook(state.currentEditionId, ed.livros[idx + 1], 1, null, { scrollToTop: true, historyMode: 'push' });
}

// ══════════════════════════════════════════════════════════════
//  MODO COMPARAÇÃO
// ══════════════════════════════════════════════════════════════

function toggleCompare() {
  markUserNavigation();

  const area = document.getElementById('main-area');
  const vulgata = getVulgataEdition();

  if (state.chapterViewMode === 'pdf') {
    state.compareMode = false;
    state.compareEditionId = null;
    area.classList.remove('compare');
    area.classList.add('single');
    document.getElementById('compare-grid').innerHTML = '';
    document.getElementById('content-compare').innerHTML = '';
    document.getElementById('compare-status').textContent = '';
    alert('Comparação indisponível em capítulos sem transcrição.');
    updateCompareButton();
    return;
  }

  if (!vulgata || state.currentEditionId === vulgata.id) {
    state.compareMode = false;
    state.compareEditionId = null;
    area.classList.remove('compare');
    area.classList.add('single');
    updateCompareButton();
    return;
  }

  state.compareMode = !state.compareMode;

  if (state.compareMode) {
    area.classList.replace('single', 'compare');
    state.compareEditionId = vulgata.id;
    loadCompareChapter();
  } else {
    area.classList.replace('compare', 'single');
    state.compareEditionId = null;
    document.getElementById('compare-grid').innerHTML = '';
    document.getElementById('content-compare').innerHTML = '';
  }

  updateCompareButton();
  updateUrlFromState('push');
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
  markUserNavigation();
  state.compareEditionId = editionId;
  loadCompareChapter();
  updateUrlFromState('push');
}

async function loadCompareChapter() {
  if (!state.compareEditionId) return;
  const ed = state.editions.find(e => e.id === state.compareEditionId);
  const grid = document.getElementById('compare-grid');
  document.getElementById('compare-status').textContent = '';

  if (state.chapterViewMode === 'pdf') {
    grid.innerHTML = '';
    document.getElementById('compare-status').textContent = '';
    return;
  }

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
  const testamentoFirstIdx = new Map();
  const grupoFirstIdx = new Map();
  const unloaded = [];

  ed.livros.forEach((file, idx) => {
    const cacheKey = ed.id + '/' + file;
    const bookIdx = state.loadedBookIndexes[cacheKey];
    if (!bookIdx) { unloaded.push(file); return; }
    const testamento = bookIdx.testamento || 'Outros';
    const grupo = bookIdx.grupo || 'Outros';
    const grupoKey = testamento + '\0' + grupo;
    if (!testamentoMap.has(testamento)) {
      testamentoMap.set(testamento, new Map());
      testamentoFirstIdx.set(testamento, idx);
    }
    const grupoMap = testamentoMap.get(testamento);
    if (!grupoMap.has(grupo)) {
      grupoMap.set(grupo, []);
      grupoFirstIdx.set(grupoKey, idx);
    }
    grupoMap.get(grupo).push({ file, book: bookIdx });
  });

  const sortedTestamentos = [...testamentoMap.entries()]
    .sort(([a], [b]) => (testamentoFirstIdx.get(a) ?? 0) - (testamentoFirstIdx.get(b) ?? 0));

  let html = '';
  for (const [testamento, grupoMap] of sortedTestamentos) {
    html += `<div class="testament-section"><div class="testament-title">${testamento}</div>`;
    const sortedGrupos = [...grupoMap.entries()]
      .sort(([a], [b]) => {
        const ia = grupoFirstIdx.get(testamento + '\0' + a) ?? 0;
        const ib = grupoFirstIdx.get(testamento + '\0' + b) ?? 0;
        return ia - ib;
      });
    for (const [grupo, items] of sortedGrupos) {
      html += `<div class="book-group"><div class="group-label">${grupo}</div>`;
      items.forEach(({ file, book }) => {
        const cls = book.id === state.currentBookId ? ' class="current-book"' : '';
        html += `<a${cls} href="#" onclick="selectBook('${file}'); return false;">${book.tituloIndice || book.titulo}</a>`;
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
  markUserNavigation();
  await loadBook(state.currentEditionId, file, 1, null, { scrollToTop: true, historyMode: 'push' });
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
//  — Em celular (< 768 px): abre modal PDF.js (exceto links externos)
//  — Em desktop: abre no drawer lateral
// ══════════════════════════════════════════════════════════════

function openPdfPanel(url, label, panelType = 'pdf') {
  state.activePdfType = panelType === 'link'
    ? 'link'
    : (panelType === 'recent' || label === 'Ver PDF 1950' || label === 'PDF recente' ? 'recent' : 'original');

  if (window.innerWidth < 768) {
    if (panelType === 'link') {
      window.open(url, '_blank');
      return;
    }
    openPdfModal(url, label);
    return;
  }

  const frame = document.getElementById('pdf-frame');
  const panel = document.getElementById('pdf-panel');
  if (label) document.getElementById('pdf-panel-title').textContent = getPanelIconByLabel(label) + ' ' + label;
  frame.src = url;
  panel.classList.add('open');
}

function closePdfPanel() {
  const panel = document.getElementById('pdf-panel');
  panel.classList.remove('open');
  closePdfModal();
  if (!panel.classList.contains('open')) state.activePdfType = null;
  setTimeout(() => { document.getElementById('pdf-frame').src = ''; }, 300);
}

function openPdfModal(url, label) {
  const modal = document.getElementById('pdf-modal');
  if (!modal) return;

  if (label) {
    document.getElementById('pdf-modal-title').textContent = getPanelIconByLabel(label) + ' ' + label;
  }

  if (!modal.classList.contains('open') && !pdfModalHistoryActive) {
    window.history.pushState({ pdfModal: true }, '', window.location.href);
    pdfModalHistoryActive = true;
  }

  modal.classList.add('open');
  document.body.classList.add('pdf-modal-open');
  loadPdfInViewer('modal', url, { scale: MOBILE_PDF_INITIAL_SCALE });
}

function closePdfModal(options = {}) {
  const fromPopstate = Boolean(options.fromPopstate);
  const modal = document.getElementById('pdf-modal');
  if (!modal) return;

  if (!fromPopstate && pdfModalHistoryActive) {
    ignoreNextModalPopstate = true;
    window.history.back();
  }

  modal.classList.remove('open');
  document.body.classList.remove('pdf-modal-open');
  destroyPdfViewerSession('modal');
  pdfModalHistoryActive = false;
}

function closePdfModalOverlay(e) {
  if (e.target === document.getElementById('pdf-modal')) {
    closePdfModal();
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closePdfPanel(); closePdfModal(); closeIntro(); }
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
