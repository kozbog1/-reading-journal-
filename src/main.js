import { supabase } from './lib/supabaseClient.js';
import * as authService from './services/authService.js';
import * as bookService from './services/bookService.js';
import * as logService from './services/readingLogService.js';
import * as coverService from './services/coverService.js';
import { importFromJson } from './services/importService.js';

/* ============================================================
   TOAST (egyszeru visszajelzes sikeres/sikertelen mentesekhez)
   ============================================================ */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' toast-error' : type === 'success' ? ' toast-success' : '');
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/* ============ STATE & CONSTANTS ============ */
let books = [];
let readingLog = {}; // { 'YYYY-MM-DD': pagesInt }
let currentUser = null;
let currentFilter = 'mind';
let currentYearFilter = 'mind';
let currentGenreFilter = 'mind';
let currentActivityMonth = new Date().getMonth() + 1;
let currentActivityYear = new Date().getFullYear();
let pendingImageBlob = null;
let pendingImagePreviewUrl = null;
let tbrLastIndex = -1;

const statusLabels = { olvasom: 'Olvasom', elolvasva: 'Elolvasva', tervezem: 'Tervezem', eves_terv: 'Éves terv', kivansaglista: 'Kívánságlista' };
const GENRES = ['Romantikus', 'Thriller', 'Krimi', 'Horror', 'Fantasy', 'Erotikus', 'Sci-fi', 'Ifjúsági', 'Ismeretterjesztő', 'Önfejlesztő', 'Pszichológia', 'Szépirodalom', 'Történelmi', 'Misztikus', 'Regény', 'Novella', 'Vers', 'Memoár', 'Mese'];
const MONTH_NAMES = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];

const TBR_CARDS = [
"Egyszavas cím", "Két szóból álló cím", "Három szóból álló cím", "Négy vagy több szóból álló cím",
"Kék borító", "Piros borító", "Fekete borító", "Fehér borító", "Zöld borító", "Lila borító",
"Virág van a borítón", "Állat van a borítón", "Ember van a borítón", "Korona van a borítón",
"Fegyver van a borítón", "Hold vagy csillag a borítón", "Arany részletek a borítón", "Élfestett könyv",
"Fantasy", "Romantasy", "Sci-fi", "Dystopia", "Horror", "Gótikus regény", "Thriller", "Pszichothriller",
"Krimi", "Cozy mystery", "Történelmi regény", "Kortárs regény", "Klasszikus", "Young Adult", "New Adult",
"Dark Romance", "Paranormális romantika", "Mitológiai", "Kalandregény", "Enemies to Lovers", "Friends to Lovers",
"Slow Burn", "Fake Dating", "Forced Proximity", "Second Chance Romance", "Found Family", "Chosen One", "Villain",
"Morally Grey főszereplő", "Erős női főszereplő", "Antihero főszereplő", "Több nézőpont", "Megbízhatatlan narrátor",
"Egyetlen nézőpont", "Első személyű elbeszélés", "Harmadik személyű elbeszélés", "Debütáló szerző", "Magyar szerző",
"Európai szerző", "Ázsiai szerző", "Amerikai szerző", "Női szerző", "Férfi szerző", "Több szerző írta",
"2026-ban megjelent könyv", "2020 előtti megjelenés", "300 oldal alatt", "300–500 oldal között", "500 oldal felett",
"BookTok ajánlás", "Barát ajánlotta", "Véletlenszerűen választott könyv", "Már legalább egy éve a polcodon van",
"Frissen vásárolt könyv", "4 csillag feletti Goodreads-értékelésű", "Kevesebb mint 10 000 Goodreads-értékelés",
"Film vagy sorozat készült belőle", "Sárkány szerepel benne", "Mágia szerepel benne", "Egy évszak szerepel a címben",
"A főszereplő nem ember", "Titkos társaság szerepel benne", "Levelek vagy naplóbejegyzések is vannak benne",
"Egy nap alatt játszódik a történet"
];

const ICON_PATHS = {
  book: '<path d="M8 10c4-3 10-3 14 0v26c-4-3-10-3-14 0z"/><path d="M40 10c-4-3-10-3-14 0v26c4-3 10-3 14 0z"/>',
  heart: '<path d="M24 40S8 29 8 18a8 8 0 0 1 16-2 8 8 0 0 1 16 2c0 11-16 22-16 22z"/>',
  skull: '<circle cx="24" cy="20" r="14"/><circle cx="18" cy="20" r="2.3" fill="currentColor"/><circle cx="30" cy="20" r="2.3" fill="currentColor"/><path d="M18 30l2 6M30 30l-2 6M24 30v6"/>',
  crown: '<path d="M8 34V18l8 8 8-14 8 14 8-8v16z"/>',
  sword: '<path d="M14 34L34 14M30 10l4 4M10 30l4 4M14 34l-4 4M34 14l4-4"/>',
  moon: '<path d="M30 8a16 16 0 1 0 10 26 12 12 0 0 1-10-26z"/><path d="M36 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
  sparkle: '<path d="M24 6l3 12 12 3-12 3-3 12-3-12-12-3 12-3z"/>',
  flower: '<circle cx="24" cy="24" r="4"/><circle cx="24" cy="12" r="6"/><circle cx="24" cy="36" r="6"/><circle cx="12" cy="24" r="6"/><circle cx="36" cy="24" r="6"/>',
  paw: '<circle cx="24" cy="28" r="8"/><circle cx="12" cy="16" r="4"/><circle cx="20" cy="9" r="4"/><circle cx="28" cy="9" r="4"/><circle cx="36" cy="16" r="4"/>',
  person: '<circle cx="24" cy="14" r="6"/><path d="M12 40c0-8 6-14 12-14s12 6 12 14"/>',
  dragon: '<path d="M6 30c4-10 12-18 22-18 6 0 10 4 10 8 0 6-6 8-10 6 4 6 2 12-4 14 2-4 0-8-4-8-6 0-8 6-14 4 4-2 4-6 0-6z"/>',
  rocket: '<path d="M24 6c6 4 8 12 8 20l-8 8-8-8c0-8 2-16 8-20z"/><circle cx="24" cy="18" r="3"/><path d="M16 28l-4 10M32 28l4 10M20 34h8"/>',
  ghost: '<path d="M12 40V22a12 12 0 0 1 24 0v18l-4-4-4 4-4-4-4 4-4-4z"/><circle cx="19" cy="22" r="2" fill="currentColor"/><circle cx="29" cy="22" r="2" fill="currentColor"/>',
  magnifier: '<circle cx="20" cy="20" r="10"/><path d="M27 27l10 10"/>',
  castle: '<path d="M8 40V18h6v-6h4v6h4v-8h4v8h4v-6h4v6h6v22z"/><path d="M8 26h32"/>',
  compass: '<circle cx="24" cy="24" r="16"/><path d="M30 18l-4 10-10 4 4-10z"/>',
  feather: '<path d="M36 8C20 12 10 24 8 40c16-2 28-12 32-28z"/><path d="M14 34L30 18"/>',
  letter: '<rect x="8" y="12" width="32" height="24" rx="2"/><path d="M8 14l16 12 16-12"/>',
  clock: '<circle cx="24" cy="24" r="16"/><path d="M24 14v10l8 4"/>',
  star: '<path d="M24 6l5 13 14 1-11 9 4 14-12-8-12 8 4-14-11-9 14-1z"/>',
  clapper: '<path d="M8 20h32v18H8z"/><path d="M8 20l6-8h6l-6 8zm12 0l6-8h6l-6 8zm12 0l6-8h4l-6 8z"/>',
  mask: '<path d="M8 16c6-4 12-4 16 0 4-4 10-4 16 0-2 12-8 20-16 20S10 28 8 16z"/><circle cx="16" cy="18" r="2" fill="currentColor"/><circle cx="32" cy="18" r="2" fill="currentColor"/>'
};

function renderIcon(name) {
  const path = ICON_PATHS[name] || ICON_PATHS.book;
  return '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
}

function pickIcon(text) {
  const t = text.toLowerCase();
  const colorMap = { 'kék': '#2E5FA3', 'piros': '#B3231C', 'fekete': '#1a1a1a', 'fehér': '#f5f5f5', 'zöld': '#2f6e3f', 'lila': '#6a3f9e' };
  if (t.includes('borító')) {
    for (const key in colorMap) { if (t.includes(key)) return { kind: 'color', color: colorMap[key] }; }
  }
  if (t.includes('virág') || t.includes('évszak')) return { kind: 'icon', name: 'flower' };
  if (t.includes('nem ember') || t.includes('állat')) return { kind: 'icon', name: 'paw' };
  if (t.includes('ember van')) return { kind: 'icon', name: 'person' };
  if (t.includes('korona')) return { kind: 'icon', name: 'crown' };
  if (t.includes('fegyver')) return { kind: 'icon', name: 'sword' };
  if (t.includes('hold') || (t.includes('csillag') && !t.includes('goodreads'))) return { kind: 'icon', name: 'moon' };
  if (t.includes('arany')) return { kind: 'icon', name: 'sparkle' };
  if (t.includes('sárkány') || t.includes('mitológ') || t.includes('mágia') || t.includes('fantasy')) return { kind: 'icon', name: 'dragon' };
  if (t.includes('romantasy') || t.includes('romance') || t.includes('lovers') || t.includes('dating') || t.includes('proximity') || t.includes('burn')) return { kind: 'icon', name: 'heart' };
  if (t.includes('sci-fi') || t.includes('dystopia')) return { kind: 'icon', name: 'rocket' };
  if (t.includes('horror') || t.includes('gótikus') || t.includes('titkos társaság')) return { kind: 'icon', name: 'ghost' };
  if (t.includes('pszichothriller') || t.includes('thriller') || t.includes('villain') || t.includes('morally grey') || t.includes('antihero')) return { kind: 'icon', name: 'skull' };
  if (t.includes('krimi') || t.includes('mystery')) return { kind: 'icon', name: 'magnifier' };
  if (t.includes('történelmi')) return { kind: 'icon', name: 'castle' };
  if (t.includes('kalandregény')) return { kind: 'icon', name: 'compass' };
  if (t.includes('szerző')) return { kind: 'icon', name: 'feather' };
  if (t.includes('narrátor') || t.includes('nézőpont') || t.includes('elbeszélés') || t.includes('levelek') || t.includes('napló')) return { kind: 'icon', name: 'letter' };
  if (t.includes('egy nap alatt')) return { kind: 'icon', name: 'clock' };
  if (t.includes('goodreads') || t.includes('booktok') || t.includes('ajánl') || t.includes('young adult') || t.includes('new adult')) return { kind: 'icon', name: 'star' };
  if (t.includes('film') || t.includes('sorozat')) return { kind: 'icon', name: 'clapper' };
  if (t.includes('chosen one') || t.includes('found family') || t.includes('erős női') || t.includes('főszereplő')) return { kind: 'icon', name: 'mask' };
  return { kind: 'icon', name: 'book' };
}

/* ============ THEME ============ */
const themes = [
  { id: 't1', text: '#660626', base: '#b9d696' },
  { id: 't2', text: '#00737d', base: '#ffbacf' },
  { id: 't3', text: '#ffb3d9', base: '#404e9c' },
  { id: 't4', text: '#333333', base: '#f7f7f7' },
  { id: 't5', text: '#f5e9d0', base: '#bf2c56' },
  { id: 't6', text: '#fa6a39', base: '#fcdcf1' },
  { id: 't7', text: '#bde895', base: '#430e4a' },
  { id: 't8', text: '#e87305', base: '#06081c' }
];
let currentTheme = 't4';

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function mix(hexA, hexB, amt) {
  const a = hexToRgb(hexA), b = hexToRgb(hexB);
  return rgbToHex(a.r + (b.r - a.r) * amt, a.g + (b.g - a.g) * amt, a.b + (b.b - a.b) * amt);
}

function svgDataUrl(svgString) {
  return `url("data:image/svg+xml,${encodeURIComponent(svgString)}")`;
}
function dotPattern(hex, opacity, radius, spacing) {
  const { r, g, b } = hexToRgb(hex);
  const c = `${r},${g},${b}`;
  return {
    image: `radial-gradient(circle, rgba(${c},${opacity}) ${radius}px, transparent ${radius}px)`,
    size: `${spacing}px ${spacing}px`
  };
}
function leafPattern(hex) { return dotPattern(hex, 0.16, 1.6, 26); }
function cloudPattern(hex) { return dotPattern(hex, 0.13, 2.2, 40); }
function starsPattern(hex) {
  const { r, g, b } = hexToRgb(hex);
  const c = `${r},${g},${b}`;
  const image = `radial-gradient(circle at 15% 25%, rgba(${c},0.55) 1px, transparent 1px), radial-gradient(circle at 70% 15%, rgba(${c},0.4) 1.3px, transparent 1.3px), radial-gradient(circle at 45% 65%, rgba(${c},0.45) 1px, transparent 1px), radial-gradient(circle at 85% 75%, rgba(${c},0.35) 1.2px, transparent 1.2px), radial-gradient(circle at 25% 85%, rgba(${c},0.4) 1px, transparent 1px)`;
  const size = '150px 150px, 150px 150px, 150px 150px, 150px 150px, 150px 150px';
  return { image, size };
}
function papyrusPattern(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rf = (r / 255).toFixed(3), gf = (g / 255).toFixed(3), bf = (b / 255).toFixed(3);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 ${rf}  0 0 0 0 ${gf}  0 0 0 0 ${bf}  0 0 0 0.12 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
  return { image: svgDataUrl(svg), size: '200px 200px' };
}
function crosshatchPattern(hex) {
  const { r, g, b } = hexToRgb(hex);
  const c = `${r},${g},${b}`;
  const image = `repeating-linear-gradient(45deg, rgba(${c},0.07) 0, rgba(${c},0.07) 1px, transparent 1px, transparent 13px), repeating-linear-gradient(-45deg, rgba(${c},0.07) 0, rgba(${c},0.07) 1px, transparent 1px, transparent 13px)`;
  return { image, size: 'auto, auto' };
}
function flowerPattern(hex) {
  const orange = '#FF7A1A';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><g fill="${orange}" fill-opacity="0.4" transform="translate(22,22)"><circle cx="0" cy="-9" r="6"/><circle cx="8.6" cy="-2.8" r="6"/><circle cx="5.3" cy="7.3" r="6"/><circle cx="-5.3" cy="7.3" r="6"/><circle cx="-8.6" cy="-2.8" r="6"/><circle cx="0" cy="0" r="4" fill-opacity="0.6"/></g></svg>`;
  return { image: svgDataUrl(svg), size: '44px 44px' };
}
function spellPattern(hex) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><g fill="${hex}" fill-opacity="0.3"><path d="M22 8l3.4 13.6L39 25l-13.6 3.4L22 42l-3.4-13.6L5 25l13.6-3.4z"/><path d="M60 40l2.4 9.6L72 52l-9.6 2.4L60 64l-2.4-9.6L48 52l9.6-2.4z"/></g></svg>`;
  return { image: svgDataUrl(svg), size: '80px 80px' };
}
function halloweenPattern() { return dotPattern('#FFA85C', 0.4, 2.4, 34); }

const THEME_PATTERNS = {
  t1: (hex) => leafPattern(hex),
  t2: (hex) => cloudPattern(hex),
  t3: (hex) => starsPattern(hex),
  t4: (hex) => papyrusPattern(hex),
  t5: (hex) => crosshatchPattern(hex),
  t6: (hex) => flowerPattern(hex),
  t7: (hex) => spellPattern(hex),
  t8: (hex) => halloweenPattern(hex)
};

function applyTheme(themeId) {
  const theme = themes.find(t => t.id === themeId) || themes[0];
  currentTheme = theme.id;
  const root = document.documentElement.style;

  root.setProperty('--paper', theme.base);
  root.setProperty('--paper-dark', mix(theme.base, theme.text, 0.12));
  root.setProperty('--ink', theme.text);
  root.setProperty('--ink-soft', theme.text);
  root.setProperty('--burgundy', theme.text);
  root.setProperty('--burgundy-deep', theme.text);
  root.setProperty('--gold', theme.text);
  root.setProperty('--gold-bright', theme.text);
  root.setProperty('--forest', theme.text);

  const inkRgb = hexToRgb(theme.text);
  const c = `${inkRgb.r},${inkRgb.g},${inkRgb.b}`;
  root.setProperty('--shelf-shadow-soft', `rgba(${c}, 0.12)`);
  root.setProperty('--shelf-shadow-strong', `rgba(${c}, 0.35)`);
  root.setProperty('--activity-empty', mix(theme.base, theme.text, 0.08));
  root.setProperty('--activity-light', mix(theme.text, theme.base, 0.5));
  root.setProperty('--activity-mid', theme.text);
  root.setProperty('--activity-dark', mix(theme.text, '#000000', 0.4));
  root.setProperty('--vignette-color', `rgba(${c}, 0.045)`);

  const patternFn = THEME_PATTERNS[theme.id];
  if (patternFn) {
    const pattern = patternFn(theme.text);
    root.setProperty('--pattern-image', pattern.image);
    root.setProperty('--pattern-size', pattern.size);
  } else {
    root.setProperty('--pattern-image', 'none');
    root.setProperty('--pattern-size', 'auto');
  }

  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === theme.id);
  });
  render();
}

function renderThemePicker() {
  const picker = document.getElementById('themePicker');
  picker.innerHTML = themes.map(t =>
    `<button class="swatch ${t.id === currentTheme ? 'active' : ''}" data-theme="${t.id}" style="background:${t.base}; --sw-text:${t.text};" aria-label="Szín: ${t.id}"></button>`
  ).join('');
  picker.querySelectorAll('.swatch').forEach(btn => {
    btn.addEventListener('click', async () => {
      applyTheme(btn.dataset.theme);
      if (!currentUser) return;
      try {
        await supabase.from('profiles').update({ theme_id: currentTheme }).eq('id', currentUser.id);
      } catch (e) {
        console.error(e);
        showToast('Nem sikerült elmenteni a szín beállítást.', 'error');
      }
    });
  });
}

async function loadThemeFromProfile() {
  if (currentUser) {
    try {
      const { data, error } = await supabase.from('profiles').select('theme_id').eq('id', currentUser.id).single();
      if (!error && data && data.theme_id) currentTheme = data.theme_id;
    } catch (e) { /* marad az alapertelmezett */ }
  }
  renderThemePicker();
  applyTheme(currentTheme);
}

/* ============ UTIL ============ */
function spineColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) { hash = id.charCodeAt(i) + ((hash << 5) - hash); }
  const palette = [mix('#333333', '#000000', 0.1), mix('#333333', '#ffffff', 0.15)];
  return palette[Math.abs(hash) % palette.length];
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function formatDate(d) {
  try { return new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch (e) { return d; }
}
function getYear(dateStr) {
  if (!dateStr) return null;
  const y = new Date(dateStr).getFullYear();
  return isNaN(y) ? null : y;
}
function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
function pad2(n) { return String(n).padStart(2, '0'); }

/* ============ DATA LOADING (Supabase) ============ */
async function loadBooksAndLog() {
  if (!currentUser) return;

  try {
    books = await bookService.listBooks(currentUser.id);
  } catch (e) {
    console.error(e);
    showToast('Nem sikerült betölteni a könyveket. Ellenőrizd az internetkapcsolatot.', 'error');
    books = [];
  }

  await Promise.all(books.map(async (b) => {
    b.coverUrl = b.coverPath ? await coverService.getCoverUrl(b.coverPath) : null;
  }));

  try {
    readingLog = await logService.loadReadingLog(currentUser.id);
  } catch (e) {
    console.error(e);
    showToast('Nem sikerült betölteni az olvasási naplót.', 'error');
    readingLog = {};
  }

  render();
}

async function deleteBook(id) {
  const book = books.find(b => b.id === id);
  books = books.filter(b => b.id !== id);
  render();
  try {
    if (book && book.coverPath) await coverService.deleteCover(book.coverPath);
    await bookService.deleteBookRow(id);
    showToast('A könyv törölve.', 'success');
  } catch (e) {
    console.error(e);
    showToast('Nem sikerült törölni a könyvet. Ellenőrizd az internetkapcsolatot.', 'error');
    await loadBooksAndLog();
  }
}

/* ============ IMAGE HANDLING ============ */
document.getElementById('f-image').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById('f-image-preview');
  if (!file) { pendingImageBlob = null; preview.style.display = 'none'; return; }
  try {
    pendingImageBlob = await coverService.resizeImageToBlob(file);
    if (pendingImagePreviewUrl) URL.revokeObjectURL(pendingImagePreviewUrl);
    pendingImagePreviewUrl = URL.createObjectURL(pendingImageBlob);
    preview.src = pendingImagePreviewUrl;
    preview.style.display = 'block';
  } catch (err) {
    console.error(err);
    showToast('Nem sikerült feldolgozni a képet.', 'error');
  }
});

/* ============ ADD BOOK FORM ============ */
document.getElementById('f-status').addEventListener('change', (e) => {
  const v = e.target.value;
  document.getElementById('olvasomFields').style.display = (v === 'olvasom') ? 'grid' : 'none';
  document.getElementById('planFields').style.display = (v === 'eves_terv') ? 'grid' : 'none';
});

function populatePlanMonthSelect() {
  const sel = document.getElementById('f-planmonth');
  sel.innerHTML = MONTH_NAMES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
}
function populateGenreChecks() {
  const wrap = document.getElementById('genreChecks');
  wrap.innerHTML = GENRES.map(g => `<label class="genre-check"><input type="checkbox" value="${g}"> ${g}</label>`).join('');
}

function renderSeriesTags() {
  const wrap = document.getElementById('seriesTags');
  wrap.innerHTML = pendingSeries.map((s, i) => `
    <span class="series-tag">${escapeHtml(s)}<button type="button" data-remove-series="${i}">×</button></span>
  `).join('');
  wrap.querySelectorAll('[data-remove-series]').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingSeries.splice(parseInt(btn.dataset.removeSeries), 1);
      renderSeriesTags();
    });
  });
}

document.getElementById('addSeriesBtn').addEventListener('click', () => {
  const input = document.getElementById('f-series-input');
  const val = input.value.trim();
  if (val && !pendingSeries.includes(val)) {
    pendingSeries.push(val);
    renderSeriesTags();
  }
  input.value = '';
  input.focus();
});
document.getElementById('f-series-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); document.getElementById('addSeriesBtn').click(); }
});

let editingId = null;
let editingCoverPath = null;
let pendingSeries = [];

function resetAddForm() {
  document.getElementById('f-title').value = '';
  document.getElementById('f-author').value = '';
  document.getElementById('f-pages').value = '';
  document.getElementById('f-rating').value = '0';
  document.getElementById('f-date').value = '';
  document.getElementById('f-note').value = '';
  document.getElementById('f-status').value = 'tervezem';
  document.getElementById('f-pagesread').value = '';
  document.getElementById('f-planyear').value = '';
  document.getElementById('f-image').value = '';
  document.getElementById('f-image-preview').style.display = 'none';
  document.querySelectorAll('#genreChecks input:checked').forEach(c => c.checked = false);
  document.getElementById('olvasomFields').style.display = 'none';
  document.getElementById('planFields').style.display = 'none';
  if (pendingImagePreviewUrl) { URL.revokeObjectURL(pendingImagePreviewUrl); pendingImagePreviewUrl = null; }
  pendingImageBlob = null;
  pendingSeries = [];
  renderSeriesTags();
  editingId = null;
  editingCoverPath = null;
  document.getElementById('addBtn').textContent = 'Hozzáadás a naplóhoz';
  document.getElementById('addSectionHeading').textContent = 'Új könyv hozzáadása';
  document.getElementById('cancelEditBtn').style.display = 'none';
}

function startEditBook(id) {
  const b = books.find(x => x.id === id);
  if (!b) return;
  editingId = id;
  editingCoverPath = b.coverPath || null;
  document.getElementById('f-title').value = b.title || '';
  document.getElementById('f-author').value = b.author || '';
  document.getElementById('f-pages').value = b.pages || '';
  document.getElementById('f-status').value = b.status || 'tervezem';
  document.getElementById('f-rating').value = b.rating || 0;
  document.getElementById('f-date').value = b.date || '';
  document.getElementById('f-note').value = b.note || '';
  document.getElementById('f-pagesread').value = b.pagesRead || '';
  document.getElementById('f-planmonth').value = b.plannedMonth || 1;
  document.getElementById('f-planyear').value = b.plannedYear || '';
  document.querySelectorAll('#genreChecks input').forEach(c => { c.checked = Array.isArray(b.genres) && b.genres.includes(c.value); });
  pendingImageBlob = null;
  pendingSeries = Array.isArray(b.series) ? b.series.slice() : [];
  renderSeriesTags();
  const preview = document.getElementById('f-image-preview');
  if (b.coverUrl) { preview.src = b.coverUrl; preview.style.display = 'block'; }
  else { preview.style.display = 'none'; }
  document.getElementById('olvasomFields').style.display = (b.status === 'olvasom') ? 'grid' : 'none';
  document.getElementById('planFields').style.display = (b.status === 'eves_terv') ? 'grid' : 'none';
  document.getElementById('addBtn').textContent = 'Módosítások mentése';
  document.getElementById('addSectionHeading').textContent = 'Könyv szerkesztése';
  document.getElementById('cancelEditBtn').style.display = 'inline-block';
  document.querySelector('.add-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.getElementById('cancelEditBtn').addEventListener('click', resetAddForm);

async function addBook() {
  const title = document.getElementById('f-title').value.trim();
  const author = document.getElementById('f-author').value.trim();
  const pages = parseInt(document.getElementById('f-pages').value) || 0;
  const status = document.getElementById('f-status').value;
  const rating = parseInt(document.getElementById('f-rating').value) || 0;
  const date = document.getElementById('f-date').value;
  const note = document.getElementById('f-note').value.trim();
  const pagesRead = parseInt(document.getElementById('f-pagesread').value) || 0;
  const plannedMonth = parseInt(document.getElementById('f-planmonth').value) || null;
  const plannedYear = parseInt(document.getElementById('f-planyear').value) || new Date().getFullYear();
  const genres = Array.from(document.querySelectorAll('#genreChecks input:checked')).map(c => c.value);
  const series = pendingSeries.slice();

  if (!title) { showToast('Add meg legalább a könyv címét.', 'error'); return; }
  if (!currentUser) { showToast('Nincs bejelentkezve felhasználó.', 'error'); return; }

  const fields = {
    title, author, pages, status, rating, date, note, genres,series,
    pagesRead: status === 'olvasom' ? pagesRead : 0,
    plannedMonth: status === 'eves_terv' ? plannedMonth : null,
    plannedYear: status === 'eves_terv' ? plannedYear : null
  };

  const addBtn = document.getElementById('addBtn');
  const originalLabel = addBtn.textContent;
  addBtn.disabled = true;
  addBtn.textContent = 'Mentés...';

  try {
    if (editingId) {
      let coverPath = editingCoverPath;
      if (pendingImageBlob) coverPath = await coverService.uploadCover(currentUser.id, editingId, pendingImageBlob);
      const updated = await bookService.updateBook(editingId, { ...fields, coverPath }, currentUser.id);
      updated.coverUrl = coverPath ? await coverService.getCoverUrl(coverPath) : null;
      const idx = books.findIndex(b => b.id === editingId);
      if (idx > -1) books[idx] = updated;
      showToast('A könyv módosításai elmentve.', 'success');
    } else {
      const inserted = await bookService.insertBook({ ...fields, coverPath: null }, currentUser.id);
      if (pendingImageBlob) {
        const path = await coverService.uploadCover(currentUser.id, inserted.id, pendingImageBlob);
        const updated = await bookService.updateBook(inserted.id, { ...fields, coverPath: path }, currentUser.id);
        updated.coverUrl = await coverService.getCoverUrl(path);
        books.unshift(updated);
      } else {
        inserted.coverUrl = null;
        books.unshift(inserted);
      }
      showToast('A könyv mentése sikerült.', 'success');
    }
    resetAddForm();
    render();
  } catch (e) {
    console.error(e);
    showToast('Nem sikerült menteni a könyvet. Ellenőrizd az internetkapcsolatot.', 'error');
  } finally {
    addBtn.disabled = false;
    if (addBtn.textContent === 'Mentés...') addBtn.textContent = originalLabel;
  }
}
document.getElementById('addBtn').addEventListener('click', addBook);

/* ============ RENDER: STATS ============ */
function renderStats() {
  const remaining = books.filter(b => b.status === 'tervezem' || b.status === 'olvasom').length;
  const read = books.filter(b => b.status === 'elolvasva');
  const totalPages = read.reduce((s, b) => s + (b.pages || 0), 0);
  document.getElementById('statTotal').textContent = remaining;
  document.getElementById('statRead').textContent = read.length;
  document.getElementById('statPages').textContent = totalPages.toLocaleString('hu-HU');
}

let currentStatsYear = new Date().getFullYear();

function populateStatsYearFilter() {
  const sel = document.getElementById('statsYearFilter');
  const now = new Date().getFullYear();
  const bookYears = books.map(b => getYear(b.date)).filter(y => y !== null);
  const rangeYears = [];
  for (let y = now - 5; y <= now + 1; y++) rangeYears.push(y);
  const years = [...new Set([...rangeYears, ...bookYears])].sort((a, b) => b - a);
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  sel.value = currentStatsYear;
}

function renderStatsYear() {
  const read = books.filter(b => b.status === 'elolvasva' && getYear(b.date) === currentStatsYear);
  const totalPages = read.reduce((s, b) => s + (b.pages || 0), 0);
  document.getElementById('statYearRead').textContent = read.length;
  document.getElementById('statYearPages').textContent = totalPages.toLocaleString('hu-HU');
}

document.getElementById('statsYearFilter').addEventListener('change', (e) => {
  currentStatsYear = parseInt(e.target.value);
  renderStatsYear();
});

/* ============ RENDER: ACTIVITY (havi olvasáskövető) ============ */
function populateMonthFilter() {
  const sel = document.getElementById('monthFilter');
  if (sel.options.length === 0) {
    sel.innerHTML = MONTH_NAMES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
    sel.value = currentActivityMonth;
  }
}
function populateActivityYearFilter() {
  const sel = document.getElementById('activityYearFilter');
  const now = new Date().getFullYear();
  const bookYears = books.map(b => getYear(b.date)).filter(y => y !== null);
  const logYears = Object.keys(readingLog).map(d => parseInt(d.slice(0, 4)));
  const rangeYears = [];
  for (let y = now - 5; y <= now + 1; y++) rangeYears.push(y);
  const years = [...new Set([...rangeYears, ...bookYears, ...logYears])].sort((a, b) => b - a);
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  sel.value = currentActivityYear;
}
function activityYear() { return currentActivityYear; }
function classifyPages(p) {
  if (p >= 71) return 'dark';
  if (p >= 36) return 'mid';
  return 'light';
}
function renderActivity() {
  const grid = document.getElementById('activityGrid');
  const year = activityYear();
  const month = currentActivityMonth;
  const numDays = daysInMonth(year, month);
  let html = '';
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
    const pages = readingLog[dateStr];
    let cls = '';
    if (pages !== undefined && pages !== null) cls = classifyPages(pages);
    html += `<div class="activity-day ${cls}" data-date="${dateStr}" title="${d}. nap${pages !== undefined ? ' — ' + pages + ' oldal' : ''}"></div>`;
  }
  grid.innerHTML = html;
}
function closeActivityPopover() {
  const existing = document.getElementById('activityPopover');
  if (existing) existing.remove();
}
function openActivityPopover(dayEl) {
  closeActivityPopover();
  const date = dayEl.dataset.date;
  const existingPages = readingLog[date];
  const rect = dayEl.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.className = 'activity-popover';
  pop.id = 'activityPopover';
  pop.innerHTML = `
    <div class="pop-date">${date}</div>
    <input type="number" min="0" id="popPagesInput" placeholder="Hány oldalt olvastál?" value="${existingPages !== undefined ? existingPages : ''}">
    <div class="pop-row">
      <button class="primary" id="popSaveBtn">Mentés</button>
      <button id="popDeleteBtn">Törlés</button>
    </div>
  `;
  document.body.appendChild(pop);
  const top = Math.min(window.innerHeight - 140, rect.bottom + 8);
  const left = Math.min(window.innerWidth - 200, rect.left);
  pop.style.top = top + 'px';
  pop.style.left = left + 'px';

  document.getElementById('popSaveBtn').addEventListener('click', async () => {
    const val = parseInt(document.getElementById('popPagesInput').value);
    if (!isNaN(val) && val >= 0) {
      readingLog[date] = val;
      renderActivity();
      try { await logService.upsertReadingLogEntry(currentUser.id, date, val); }
      catch (e) { console.error(e); showToast('Nem sikerült menteni az olvasott oldalszámot.', 'error'); }
    }
    closeActivityPopover();
  });
  document.getElementById('popDeleteBtn').addEventListener('click', async () => {
    delete readingLog[date];
    renderActivity();
    try { await logService.deleteReadingLogEntry(currentUser.id, date); }
    catch (e) { console.error(e); showToast('Nem sikerült törölni a bejegyzést.', 'error'); }
    closeActivityPopover();
  });
  setTimeout(() => {
    document.addEventListener('click', function outsideClick(e) {
      if (!pop.contains(e.target) && e.target !== dayEl) {
        closeActivityPopover();
        document.removeEventListener('click', outsideClick);
      }
    });
  }, 0);
}
document.getElementById('activityGrid').addEventListener('click', (e) => {
  const day = e.target.closest('.activity-day');
  if (day) openActivityPopover(day);
});
document.getElementById('activityYearFilter').addEventListener('change', (e) => {
  currentActivityYear = parseInt(e.target.value);
  renderActivity();
});
document.getElementById('monthFilter').addEventListener('change', (e) => {
  currentActivityMonth = parseInt(e.target.value);
  renderActivity();
});

/* ============ RENDER: ÉV / MŰFAJ SZŰRŐK ============ */
function populateYearFilter() {
  const select = document.getElementById('yearFilter');
  const years = [...new Set(books.map(b => getYear(b.date)).filter(y => y !== null))].sort((a, b) => b - a);
  const prevValue = currentYearFilter;
  select.innerHTML = '<option value="mind">Minden év</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  if (years.includes(parseInt(prevValue))) select.value = prevValue;
  else { currentYearFilter = 'mind'; select.value = 'mind'; }
}
document.getElementById('yearFilter').addEventListener('change', (e) => {
  currentYearFilter = e.target.value;
  renderActivity();
  renderList();
  renderShelf();
  renderPlanView();
});
function populateGenreFilter() {
  const select = document.getElementById('genreFilter');
  if (select.options.length <= 1) {
    select.innerHTML = '<option value="mind">Minden műfaj</option>' + GENRES.map(g => `<option value="${g}">${g}</option>`).join('');
  }
}
document.getElementById('genreFilter').addEventListener('change', (e) => {
  currentGenreFilter = e.target.value;
  renderList();
});

/* ============ RENDER: POLC ============ */
function renderShelf() {
  let read = books.filter(b =>
    b.status === 'tervezem' ||
    b.status === 'olvasom' ||
    b.status === 'elolvasva' ||
    b.status === 'eves_terv'
  );
  if (currentYearFilter !== 'mind') {
    read = read.filter(b => b.status !== 'elolvasva' || getYear(b.date) === parseInt(currentYearFilter));
  }
  const shelfOrder = { olvasom: 0, tervezem: 1, eves_terv: 1, elolvasva: 2 };
  read = read.slice().sort((a, b) => (shelfOrder[a.status] ?? 1) - (shelfOrder[b.status] ?? 1));

  const shelf = document.getElementById('shelf');
  
  shelf.innerHTML = read.map(b => {
    const cover = b.coverUrl
      ? `<img src="${b.coverUrl}" alt="${escapeHtml(b.title)} borító">`
      : `<span class="shelf-cover-fallback">${escapeHtml((b.title || '?').trim().charAt(0).toUpperCase())}</span>`;
    const stars = [1, 2, 3, 4, 5].map(i =>
      `<span class="shelf-star ${i <= b.rating ? 'filled' : ''}" data-book-id="${b.id}" data-rate="${i}">★</span>`
    ).join('');
    return `
    <div class="shelf-book">
      <div class="shelf-stars">${stars}</div>
      <div class="shelf-cover" style="${!b.coverUrl ? `background:${spineColor(b.id)};` : ''}">${cover}</div>
      <div class="shelf-book-title">${escapeHtml(b.title)}</div>
      ${b.author ? `<div class="shelf-book-author">${escapeHtml(b.author)}</div>` : ''}
    </div>`;
  }).join('');
}

async function setRating(id, value) {
  const book = books.find(b => b.id === id);
  if (!book) return;
  const newRating = (book.rating === value) ? 0 : value;
  book.rating = newRating;
  renderShelf();
  renderList();
  try { await bookService.updateBook(id, book, currentUser.id); }
  catch (e) { console.error(e); showToast('Nem sikerült menteni az értékelést.', 'error'); }
}
document.getElementById('shelf').addEventListener('click', (e) => {
  const star = e.target.closest('.shelf-star');
  if (star) setRating(star.dataset.bookId, parseInt(star.dataset.rate));
});

/* ============ RENDER: KÖNYVLISTA ============ */
function renderList() {
  let filtered = currentFilter === 'mind' ? books.slice() : books.filter(b => b.status === currentFilter);
  if (currentYearFilter !== 'mind') {
    filtered = filtered.filter(b => getYear(b.date) === parseInt(currentYearFilter) || (b.status === 'eves_terv' && b.plannedYear === parseInt(currentYearFilter)));
  }
  if (currentGenreFilter !== 'mind') {
    filtered = filtered.filter(b => Array.isArray(b.genres) && b.genres.includes(currentGenreFilter));
  }

  const listEl = document.getElementById('bookList');
  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="empty-msg">Nincs ide tartozó könyv.</div>';
    return;
  }
  listEl.innerHTML = filtered.map(b => {
    const stars = b.rating > 0 ? '<span class="stars">' + '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) + '</span>' : '';
    const noteHtml = b.note ? `<div class="book-note quote">${escapeHtml(b.note)}</div>` : '';
    const dateHtml = b.date ? `<span>${formatDate(b.date)}</span>` : '';
    const genreTags = (b.genres || []).map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join(' ');
    const seriesTags = (b.series || []).map(s => `<span class="genre-tag">📚 ${escapeHtml(s)}</span>`).join(' ');
    const progressHtml = b.status === 'olvasom' ? `
      <div class="progress-row">
        <input type="number" min="0" data-progress-id="${b.id}" value="${b.pagesRead || 0}">
        <span>/ ${b.pages || '?'} oldal olvasva</span>
      </div>` : '';
    const planHtml = b.status === 'eves_terv' ? `<span>${MONTH_NAMES[(b.plannedMonth || 1) - 1]} ${b.plannedYear || ''}</span>` : '';
    return `
    <div class="book-card">
      <div class="book-color-tag"></div>
      <div class="book-main">
        <div class="book-top">
          <div>
            <span class="book-title" data-edit-id="${b.id}">${escapeHtml(b.title)}</span>
            ${b.author ? `<span class="book-author"> — ${escapeHtml(b.author)}</span>` : ''}
          </div>
          <span class="status-pill">${statusLabels[b.status] || b.status}</span>
        </div>
        <div class="book-meta">
          ${b.pages ? `<span>${b.pages} oldal</span>` : ''}
          ${stars}
          ${dateHtml}
          ${planHtml}
          ${genreTags}
          ${seriesTags}
        </div>
        ${progressHtml}
        ${noteHtml}
        <div class="book-actions">
          <button class="link-btn danger" data-del="${b.id}">Törlés</button>
        </div>
      </div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Biztosan törlöd ezt a könyvet a naplóból?')) deleteBook(btn.dataset.del);
    });
  });
  listEl.querySelectorAll('[data-progress-id]').forEach(inp => {
    inp.addEventListener('change', async () => {
      const book = books.find(b => b.id === inp.dataset.progressId);
      if (!book) return;
      book.pagesRead = parseInt(inp.value) || 0;
      try {
        await bookService.updateBook(book.id, book, currentUser.id);
        showToast('Előrehaladás elmentve.', 'success');
      } catch (e) {
        console.error(e);
        showToast('Nem sikerült menteni az előrehaladást.', 'error');
      }
    });
  });
  listEl.querySelectorAll('[data-edit-id]').forEach(el => {
    el.addEventListener('click', () => startEditBook(el.dataset.editId));
  });
}

/* ============ RENDER: ÉVES TERV ============ */
function renderPlanView() {
  const el = document.getElementById('planView');
  let planBooks = books.filter(b => b.status === 'eves_terv');
  if (currentYearFilter !== 'mind') {
    planBooks = planBooks.filter(b => b.plannedYear === parseInt(currentYearFilter));
  }
  el.innerHTML = MONTH_NAMES.map((name, idx) => {
    const monthNum = idx + 1;
    const monthBooks = planBooks.filter(b => b.plannedMonth === monthNum);
    const totalPages = monthBooks.reduce((s, b) => s + (b.pages || 0), 0);
    const bookItems = monthBooks.length
      ? monthBooks.map(b => `<div class="plan-book-item">${escapeHtml(b.title)}${b.author ? ` <span class="pb-author">— ${escapeHtml(b.author)}</span>` : ''}</div>`).join('')
      : '<div class="plan-empty">Nincs tervezett könyv.</div>';
    return `
    <div class="plan-month">
      <div class="plan-month-header">
        <span class="plan-month-name">${name}</span>
        <span class="plan-month-pages">${totalPages} oldal</span>
      </div>
      ${bookItems}
    </div>`;
  }).join('');
}

/* ============ RENDER: KERESÉS ============ */
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const resultsEl = document.getElementById('searchResults');
  if (!q) { resultsEl.classList.remove('visible'); resultsEl.innerHTML = ''; return; }
  const matches = books.filter(b => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));
  resultsEl.classList.add('visible');
  if (matches.length === 0) { resultsEl.innerHTML = '<div class="search-empty">Nincs találat.</div>'; return; }
  resultsEl.innerHTML = matches.map(b => `
    <div class="search-result">
      <div class="sr-title" data-edit-id="${b.id}">${escapeHtml(b.title)}</div>
      ${b.author ? `<div class="sr-author">${escapeHtml(b.author)}</div>` : ''}
    </div>
  `).join('');
  resultsEl.querySelectorAll('[data-edit-id]').forEach(el => {
    el.addEventListener('click', () => startEditBook(el.dataset.editId));
  });
});

document.getElementById('tabSearchInput').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const resultsEl = document.getElementById('tabSearchResults');
  if (!q) { resultsEl.innerHTML = '<div class="search-empty">Írj be egy keresőszót.</div>'; return; }
  const matches = books.filter(b => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q));
  if (matches.length === 0) { resultsEl.innerHTML = '<div class="search-empty">Nincs találat.</div>'; return; }
  resultsEl.innerHTML = matches.map(b => `
    <div class="search-result">
      <div class="sr-title" data-edit-id="${b.id}">${escapeHtml(b.title)}</div>
      ${b.author ? `<div class="sr-author">${escapeHtml(b.author)}</div>` : ''}
    </div>
  `).join('');
  resultsEl.querySelectorAll('[data-edit-id]').forEach(el => {
    el.addEventListener('click', () => startEditBook(el.dataset.editId));
  });
});

document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.search-wrap');
  const resultsEl = document.getElementById('searchResults');
  if (wrap && !wrap.contains(e.target)) resultsEl.classList.remove('visible');
});

/* ============ TBR ============ */
function setTbrCardContent() {
  let idx;
  do { idx = Math.floor(Math.random() * TBR_CARDS.length); } while (idx === tbrLastIndex && TBR_CARDS.length > 1);
  tbrLastIndex = idx;
  const text = TBR_CARDS[idx];
  const icon = pickIcon(text);
  const iconEl = document.getElementById('tbrCardIcon');
  if (icon.kind === 'color') {
    iconEl.innerHTML = `<svg viewBox="0 0 48 48"><rect x="6" y="6" width="36" height="36" rx="6" fill="${icon.color}" stroke="var(--ink)" stroke-width="2"/></svg>`;
  } else {
    iconEl.innerHTML = renderIcon(icon.name);
  }
  document.getElementById('tbrCardText').textContent = text;
}
function drawTbrCard() {
  const card = document.getElementById('tbrCard');
  document.getElementById('tbrCardWrap').style.display = 'flex';
  if (card.classList.contains('flipped')) {
    card.classList.remove('flipped');
    setTimeout(setTbrCardContent, 650);
  } else {
    card.classList.remove('flipped');
    setTbrCardContent();
  }
}
document.getElementById('tbrDrawTile').addEventListener('click', () => {
  document.getElementById('tbrDrawWrap').style.display = 'none';
  drawTbrCard();
  document.getElementById('tbrRedrawWrap').style.display = 'flex';
});
document.getElementById('drawAgainBtn').addEventListener('click', drawTbrCard);
document.getElementById('tbrCard').addEventListener('click', (e) => {
  e.target.closest('.tbr-card').classList.toggle('flipped');
});

/* ============ FÜLEK ============ */
function updateTabViews() {
  const isList = ['mind', 'olvasom', 'elolvasva', 'tervezem', 'kivansaglista'].includes(currentFilter);
  const isPlan = currentFilter === 'eves_terv';
  const isTbr = currentFilter === 'tbr';
  const isSearch = currentFilter === 'kereso';
  document.getElementById('bookList').style.display = isList ? 'block' : 'none';
  document.getElementById('genreFilterWrap').style.display = isList ? 'flex' : 'none';
  document.getElementById('planView').style.display = isPlan ? 'block' : 'none';
  document.getElementById('tbrView').style.display = isTbr ? 'block' : 'none';
  document.getElementById('searchView').style.display = isSearch ? 'block' : 'none';
  if (isList) renderList();
  if (isPlan) renderPlanView();
}
document.getElementById('tabs').addEventListener('click', (e) => {
  if (e.target.classList.contains('tab')) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    updateTabViews();
  }
});

function render() {
  populateYearFilter();
  populateActivityYearFilter();
  populateStatsYearFilter();
  renderStats();
  renderStatsYear();
  renderActivity();
  renderShelf();
  updateTabViews();
}

/* ============================================================
   AUTHENTIKÁCIÓ (bejelentkezés / regisztráció / jelszó-visszaállítás)
   ============================================================ */
function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
}
function showAppScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
}
function setAuthMessage(msg, type) {
  const el = document.getElementById('authMessage');
  el.textContent = msg;
  el.className = 'auth-message' + (type ? ' ' + type : '');
}
function translateAuthError(err) {
  const msg = (err && err.message) || '';
  if (msg.includes('Invalid login credentials')) return 'Hibás e-mail cím vagy jelszó.';
  if (msg.includes('User already registered')) return 'Ezzel az e-mail címmel már van fiók.';
  if (msg.includes('Password should be at least')) return 'A jelszónak legalább 6 karakter hosszúnak kell lennie.';
  if (msg.includes('Email not confirmed')) return 'Még nem erősítetted meg az e-mail címed. Nézd meg a postaládád.';
  return msg || 'Ismeretlen hiba történt. Próbáld újra.';
}

document.getElementById('authTabs').addEventListener('click', (e) => {
  if (!e.target.classList.contains('auth-tab')) return;
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');
  const tab = e.target.dataset.authTab;
  document.getElementById('loginForm').style.display = tab === 'login' ? 'flex' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'flex' : 'none';
  document.getElementById('forgotForm').style.display = 'none';
  setAuthMessage('');
});
document.getElementById('forgotPasswordLink').addEventListener('click', () => {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('forgotForm').style.display = 'flex';
  setAuthMessage('');
});
document.getElementById('backToLoginLink').addEventListener('click', () => {
  document.getElementById('forgotForm').style.display = 'none';
  document.getElementById('loginForm').style.display = 'flex';
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-auth-tab="login"]').classList.add('active');
  setAuthMessage('');
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAuthMessage('Bejelentkezés...', '');
  try {
    await authService.signIn(document.getElementById('login-email').value, document.getElementById('login-password').value);
  } catch (err) {
    setAuthMessage(translateAuthError(err), 'error');
  }
});
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAuthMessage('Regisztráció...', '');
  try {
    const data = await authService.signUp(document.getElementById('register-email').value, document.getElementById('register-password').value);
    if (!data.session) {
      setAuthMessage('Sikeres regisztráció! Nézd meg az e-mailjeidet a megerősítéshez, majd jelentkezz be.', 'success');
      document.querySelector('[data-auth-tab="login"]').click();
    }
  } catch (err) {
    setAuthMessage(translateAuthError(err), 'error');
  }
});
document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAuthMessage('Küldés...', '');
  try {
    await authService.sendPasswordReset(document.getElementById('forgot-email').value);
    setAuthMessage('Elküldtük a visszaállító linket, ha létezik ilyen fiók.', 'success');
  } catch (err) {
    setAuthMessage(translateAuthError(err), 'error');
  }
});
document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  setAuthMessage('Mentés...', '');
  try {
    await authService.updatePassword(document.getElementById('reset-password').value);
    setAuthMessage('Új jelszó elmentve! Átirányítunk...', 'success');
    setTimeout(() => { window.location.hash = ''; window.location.reload(); }, 1500);
  } catch (err) {
    setAuthMessage(translateAuthError(err), 'error');
  }
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try { await authService.signOut(); } catch (e) { console.error(e); }
});

/* ============ IMPORT (migráció a régi verzióból) ============ */
document.getElementById('importDataBtn').addEventListener('click', () => {
  document.getElementById('importModal').style.display = 'flex';
});
document.getElementById('importCloseBtn').addEventListener('click', () => {
  document.getElementById('importModal').style.display = 'none';
});
document.getElementById('importFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || !currentUser) return;
  const statusEl = document.getElementById('importStatus');
  statusEl.textContent = 'Importálás folyamatban...';
  statusEl.className = 'auth-message';
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const result = await importFromJson(json, currentUser.id, (done, total) => {
      statusEl.textContent = `Importálás: ${done}/${total} könyv...`;
    });
    statusEl.textContent = `Kész! ${result.booksImported} könyv és ${result.logEntriesImported} naplóbejegyzés importálva.` +
      (result.errors.length ? ` (${result.errors.length} hiba - lásd a böngésző konzolját.)` : '');
    statusEl.className = 'auth-message success';
    if (result.errors.length) console.warn('Import hibák:', result.errors);
    await loadBooksAndLog();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Nem sikerült beolvasni a fájlt. Ellenőrizd, hogy érvényes JSON export-e.';
    statusEl.className = 'auth-message error';
  }
});

document.getElementById('toggleListBtn').addEventListener('click', () => {
  const body = document.getElementById('listSectionBody');
  const label = document.getElementById('toggleListLabel');
  const arrow = document.getElementById('toggleListArrow');
  const isCollapsed = body.classList.toggle('collapsed');
  label.textContent = isCollapsed ? 'Könyveim megjelenítése' : 'Könyveim elrejtése';
  arrow.textContent = isCollapsed ? '▼' : '▲';
});

/* ============ APP INIT ============ */
let appInitialized = false;
async function initApp() {
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  if (!appInitialized) {
    populatePlanMonthSelect();
    populateGenreChecks();
    populateMonthFilter();
    populateGenreFilter();
    appInitialized = true;
  }
  await loadThemeFromProfile();
  await loadBooksAndLog();
}

if (window.location.hash.includes('type=recovery')) {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('forgotForm').style.display = 'none';
  document.getElementById('resetPasswordForm').style.display = 'flex';
  document.getElementById('authTabs').style.display = 'none';
}

authService.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    currentUser = session.user;
    document.getElementById('accountEmail').textContent = currentUser.email;
    showAppScreen();
    coverService.clearCoverUrlCache();
    await initApp();
  } else {
    currentUser = null;
    showAuthScreen();
  }
});
