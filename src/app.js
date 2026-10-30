import { T, TK, TP, TN } from './strings.js';
import { viewProfile, profileSubmit } from './profile.js';
import { viewToday, viewOkuma } from './home.js';
import { viewLibrary, cardHTML, playPanel, scanBarcode } from './library.js';
import { coverHTML, MOON, star, CAT } from './parts.js';
import { configured, USERNAME_RE, onUser, logout, loginGoogle, loginEmail, signupEmail, resetPassword, resendVerify, watchProfile, claimUsername } from './auth.js';
import { searchBooks } from './books.js';
import { STATUS, watchShelf, addToShelf, updateShelf, removeShelf } from './shelf.js';
import { $, esc, dayKey } from './util.js';
import { watchSessions, addSession, patchSession, removeSession, saveProfile } from './sessions.js';
import { refreshTimer, setCurrent, startTimer, stopTimer, resetTimer, setRoom, setOption, setOnFinish, timerOn } from './reading.js';
import { shareRecap } from './takip.js';
import { watchCol, add, remove } from './clubs.js';
import { pageChange, enhance } from './motion.js';
import { initClubs, openClub, closeClub, openNotes, loadInvite, viewClubs, viewInvite, viewClub, viewClubBook, clubClick, clubSubmit, clubNow, clubMissing, importClubBooks } from './clubview.js';


const S = { user: null, profile: undefined, shelf: [], sessions: [], quotes: [], reveal: new Set(), mode: 'login', view: 'bugun', bookId: null, results: null, searching: false, armed: false, moods: new Set() };

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 3500);
}
const fail = err => toast(T.authErrors[err.code] || T.error);
const shelfBook = id => S.shelf.find(b => b.id === id);
// Kuytu işareti: kemer içinde yıldız ve açık kitap
const LOGO = '<svg class="logo" viewBox="0 0 60 72" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M6 68V30a24 24 0 0 1 48 0v38"/><path d="M30 14l2.4 7.6L40 24l-7.6 2.4L30 34l-2.4-7.6L20 24l7.6-2.4z" fill="currentColor" stroke="none"/><path d="M30 48c-5-4-12-5-18-3v17c6-2 13-1 18 3 5-4 12-5 18-3V45c-6-2-13-1-18 3zM30 48v17"/></svg>';
const ICON = { ay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/></svg>', kalp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.5 4.5 4.5 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z"/></svg>', raf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 5.5c2.5-1.2 6-1.2 9 1 3-2.2 6.5-2.2 9-1V19c-2.5-1.2-6-1.2-9 1-3-2.2-6.5-2.2-9-1zM12 6.5V20"/></svg>', kulup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M16 5a3.5 3.5 0 0 1 0 6.5M18 14.5c1.9.8 3 2.7 3 5.5"/></svg>', oda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>', takip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>', ara: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>' };

function viewLanding() {
  const signup = S.mode === 'signup';
  return `<section class="landing">
    <div class="landing-hero">${MOON}${star('16%', '18%', 18)}${star('78%', '30%', 13, 1.3)}<span class="deco cream hero-cat">${CAT}</span><div class="brandmark">${LOGO}<b>KUYTU</b><span>${T.brandSub}</span></div><p class="slogan">${T.tagline}</p><p class="sub">${T.sub}</p></div>
    <div class="landing-form">${configured ? `<form class="panel" id="auth-form">
      <div class="seg" role="group"><button type="button" class="${signup ? '' : 'on'}" data-act="mode" data-v="login">${T.login}</button><button type="button" class="${signup ? 'on' : ''}" data-act="mode" data-v="signup">${T.signup}</button></div>
      ${signup ? `<label>${T.name}<input name="name" required autocomplete="name"></label>` : ''}
      <label>${T.email}<input name="email" type="email" required autocomplete="email"></label>
      <label>${T.password}<input name="pass" type="password" required minlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}"></label>
      <button class="btn" type="submit">${signup ? T.signup : T.login}</button>
      <button class="btn ghost" type="button" data-act="google">${T.google}</button>
      ${signup ? '' : `<button class="linkbtn small" type="button" data-act="reset">${T.forgot}</button>`}
    </form>` : `<p class="notice">${T.setup}</p>`}</div>
  </section>`;
}
function viewUsername() {
  return `<section class="landing solo"><h2>${T.chooseTitle}</h2>
    <form class="panel" id="name-form"><label>${T.username}<input name="username" required autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="ornek_okur"></label>
    <p class="muted small">${T.chooseHelp}</p><button class="btn" type="submit">${T.save}</button></form></section>`;
}
// Etkin kulüp: son açılan; yoksa ilk kulüp. Menü ve açılış sayfası buna göre çalışır
const activeClub = () => {
  const list = S.myClubs || [];
  let saved = null;
  try { saved = localStorage.getItem('kuytu-club'); } catch (e) {}
  return (list.find(c => c.id === saved) || list.find(c => c.name === 'Kitap Kulübü') || list[0] || {}).id || '';
};
// Yüzen menü: dört yer ve profil. Kulübün kendi sayfaları kulübün içindeki alt menüde durur
const header = () => {
  const a = activeClub(), club = ['k', 'kb', 'kulup', 'davet'].includes(S.view);
  const link = (href, on, icon, text) => `<a href="${href}" class="${on ? 'on' : ''}">${icon}<span>${text}</span></a>`;
  return `<header class="dock"><a class="brand" href="#bugun">${LOGO}<span>Kuytu</span></a>
  <nav class="dk">${link('#bugun', S.view === 'bugun', ICON.ay, TN.today)}${link('#raf', S.view === 'raf', ICON.raf, TN.lib)}${link(a ? '#k/' + encodeURIComponent(a) + '/ay' : '#kulup', club, ICON.kulup, TN.club)}${link('#okuma', S.view === 'okuma', ICON.oda, TN.read)}${link('#profil', S.view === 'profil', ICON.kalp, TN.profile)}</nav>
  <a class="dock-search" href="#ara" aria-label="${T.navSearch}">${ICON.ara}<span>${T.navSearch}</span></a></header>`;
};
const clubTabs = () => {
  if (!S.club) return '';
  const k = '#k/' + encodeURIComponent(S.club.id), on = t => (S.view === 'k' && S.clubTab === t) || (t === 'kitaplar' && S.view === 'kb');
  const link = (t, text) => `<a href="${k}/${t}" class="${on(t) ? 'on' : ''}">${text}</a>`;
  return `<nav class="subnav">${link('ay', TK.navHome)}${link('kitaplar', TK.navLibrary)}${link('oneriler', TK.navSugg)}${link('uyeler', TK.navMembers)}${(S.myClubs || []).length > 1 ? `<a href="#kulup">${TK.navClubs}</a>` : ''}</nav>`;
};
function resultsHTML() {
  if (S.searching) return `<p class="muted">${T.searching}</p>`;
  if (S.results === null) return '';
  if (S.results === 'fail') return `<p class="muted">${T.searchFail}</p>`;
  if (!S.results.length) return `<p class="muted">${T.noResults}</p>`;
  return `<ul class="results">${S.results.map((b, i) => `<li>${coverHTML(b)}<div><b>${esc(b.title)}</b><p class="muted small">${esc([b.author, b.year, b.pages ? b.pages + ' sayfa' : ''].filter(Boolean).join(' · '))}</p></div>
    ${shelfBook(b.id) ? `<span class="muted small">${T.inShelf}</span>` : `<button class="btn ghost" type="button" data-act="add" data-i="${i}">${T.add}</button>`}</li>`).join('')}</ul>`;
}
function viewSearch() {
  return `<h2>${T.searchTitle}</h2>
    <form class="searchbar" id="search-form"><input name="q" type="search" required placeholder="${T.searchHint}" aria-label="${T.searchHint}"><button class="btn" type="submit">${T.search}</button><button class="btn ghost" type="button" data-act="scan">${TN.scan}</button></form>
    <div id="results">${resultsHTML()}</div>
    <details class="manual"><summary>${T.manual}</summary>
      <form class="panel" id="manual-form"><label>${T.bookTitle}<input name="title" required maxlength="200"></label><label>${T.author}<input name="author" maxlength="200"></label><label>${T.pages}<input name="pages" type="number" min="1" max="20000"></label><button class="btn" type="submit">${T.add}</button></form>
    </details>`;
}
// Yeni üye karşılaması: kullanıcı adından hemen sonra, üç kısa adım
function viewOnb() {
  const n = S.onb, head = `<p class="lbl">${TN.step} ${Math.min(n, 3)} / 3</p>`, skip = `<button type="button" class="linkbtn" data-act="onbnext">${TN.skip}</button>`;
  if (n === 1) return `<section class="onb">${head}<h2>${TN.mood}</h2><div class="tags">${TN.moods.map(m => `<button type="button" class="${S.moods.has(m) ? 'on' : ''}" data-act="onbmood" data-v="${m}">${m}</button>`).join('')}</div><button class="btn" type="button" data-act="onbnext">${TN.next}</button>${skip}</section>`;
  if (n === 2) return `<section class="onb">${head}<h2>${TN.bring}</h2><p class="muted">${TN.bringSub}</p>
    <form class="searchbar" id="search-form"><input name="q" type="search" required placeholder="${T.searchHint}" aria-label="${T.searchHint}"><button class="btn" type="submit">${T.search}</button><button class="btn ghost" type="button" data-act="scan">${TN.scan}</button></form>
    <div id="results">${resultsHTML()}</div><p class="muted small">${S.shelf.length} ${TN.bookWord}</p><button class="btn" type="button" data-act="onbnext">${TN.next}</button>${skip}</section>`;
  if (n === 3) return `<section class="onb">${head}<h2>${TN.together}</h2>
    <form class="panel" id="onb-invite"><label>${TN.invite}<input name="code" required autocomplete="off"></label><button class="btn" type="submit">${TN.joinClub}</button></form>
    <a class="btn ghost" href="#kulup" data-act="onbdone">${TN.newClub}</a><p class="muted small">${TN.soloOk}</p>${skip}</section>`;
  return `<section class="onb center"><span class="stamp won big">${TN.member}</span><h2>${TN.ready}</h2><p class="muted">${TN.readyNext}</p><a class="btn" href="#bugun" data-act="onbdone">${TN.goIn}</a></section>`;
}
function updateCard() {
  const c = $('#card'), b = S.user && S.view === 'raf' && S.bookId ? shelfBook(S.bookId) : null;
  if (!b) { c.hidden = true; c.innerHTML = ''; S.cardOpen = null; return; }
  const a = document.activeElement, first = S.cardOpen !== b.id;
  if (!first && a && c.contains(a) && a.matches('input')) return;
  c.innerHTML = cardHTML(S, b, first);
  c.hidden = false;
  S.cardOpen = b.id;
  const f = S.from || { x: 0, y: 200 };
  c.style.setProperty('--fx', f.x + 'px');
  c.style.setProperty('--fy', f.y + 'px');
}
function render() {
  const v = $('#view');
  if (!S.user) v.innerHTML = viewLanding();
  else if (S.profile === undefined) v.innerHTML = '';
  else if (!S.profile) v.innerHTML = viewUsername();
  else if (S.onb && S.view !== 'davet') v.innerHTML = viewOnb();
  else {
    const enter = S.enter, inClub = S.view === 'k' || S.view === 'kb';
    S.enter = false;
    v.innerHTML = header() + (inClub ? clubTabs() : '') + ({ bugun: () => viewToday(S, clubNow()), raf: () => viewLibrary(S, enter, clubMissing()), ara: viewSearch, okuma: () => viewOkuma(S), profil: () => viewProfile(S), kulup: viewClubs, davet: viewInvite, k: () => viewClub(S.clubTab), kb: () => viewClubBook(S.bookId) }[S.view])();
  }
  updateCard();
  enhance(v);
}
function route() {
  const [raw, id, sub, bid] = location.hash.slice(1).split('/');
  // Eski bağlantılar yeni yerlerine gider
  const view = { oda: 'okuma', takip: 'okuma', kitap: 'raf' }[raw] || raw;
  if (view !== 'okuma') setRoom(false);
  S.view = ['raf', 'ara', 'okuma', 'kulup', 'davet', 'k', 'profil'].includes(view) ? view : 'bugun';
  S.bookId = id ? decodeURIComponent(id) : null;
  S.quick = false;
  if (view === 'k' && id) {
    if (S.user) { openClub(decodeURIComponent(id)); try { localStorage.setItem('kuytu-club', decodeURIComponent(id)); } catch (e) {} }
    S.clubTab = ['ay', 'kitaplar', 'oneriler', 'uyeler'].includes(sub) ? sub : 'ay';
    if (sub === 'b' && bid && S.club) { S.view = 'kb'; S.bookId = decodeURIComponent(bid); openNotes(S.bookId); }
  } else if ((S.view === 'bugun' || S.view === 'raf') && S.user && activeClub()) openClub(activeClub());
  else if (S.club) closeClub();
  if (view === 'davet' && id && S.user && S.profile) { loadInvite(decodeURIComponent(id)); return; }
  S.armed = false;
  // Kitap kartı açılıp kapanırken sayfa olduğu yerde kalır
  if (raw === 'kitap' || (S.view === 'raf' && S.cardOpen)) { render(); return; }
  S.enter = S.view === 'raf';
  pageChange(() => { render(); scrollTo(0, 0); });
}
window.addEventListener('hashchange', route);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.cardOpen) location.hash = '#raf'; });
async function runSearch(q) {
  const show = () => { const el = $('#results'); if (el) el.innerHTML = resultsHTML(); };
  S.searching = true;
  if (!S.onb && S.view !== 'ara') location.hash = '#ara';
  show();
  try { S.results = await searchBooks(q); } catch (err) { S.results = 'fail'; }
  S.searching = false;
  show();
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, uid = S.user && S.user.uid;
  if (S.user && clubClick(a, el)) return;
  if (a === 'mode') { S.mode = el.dataset.v; render(); }
  if (a === 'google') loginGoogle().catch(fail);
  if (a === 'logout') logout().catch(fail);
  if (a === 'resend') resendVerify().then(() => toast(T.sent)).catch(fail);
  if (a === 'reset') {
    const email = $('#auth-form').elements.email.value.trim();
    if (!email) return toast(T.needEmail);
    resetPassword(email).then(() => toast(T.resetSent)).catch(fail);
  }
  if (a === 'add') addToShelf(uid, S.results[Number(el.dataset.i)], 'istiyorum').then(() => toast(T.added)).catch(fail);
  if (a === 'status') updateShelf(uid, S.bookId, { status: el.dataset.v, ...(el.dataset.v === 'okudum' ? { finishedAt: new Date().toISOString() } : {}) }).catch(fail);
  if (a === 'rate') updateShelf(uid, S.bookId, { rating: Number(el.dataset.v) }).catch(fail);
  if (a === 'openbook') {
    const r = el.getBoundingClientRect();
    S.from = { x: Math.round(r.left + r.width / 2 - innerWidth / 2), y: Math.round(r.top + r.height / 2 - innerHeight / 2) };
    location.hash = '#kitap/' + encodeURIComponent(el.dataset.id);
  }
  if (a === 'bookclose') location.hash = '#raf';
  if (a === 'libtab') { S.libTab = el.dataset.v; render(); playPanel(); }
  if (a === 'rafsec') { S.rafSec = el.dataset.v; render(); playPanel(); }
  if (a === 'fav') { const b = shelfBook(S.bookId); updateShelf(uid, b.id, { fav: !b.fav }).catch(fail); }
  if (a === 'wish') { const b = shelfBook(S.bookId); updateShelf(uid, b.id, { wish: !b.wish }).catch(fail); }
  if (a === 'lendback') updateShelf(uid, S.bookId, { lentTo: '', lentAt: '' }).catch(fail);
  if (a === 'scan') scanBarcode().then(code => { if (code === null) toast(TN.scanNo); else if (code) runSearch(code); }).catch(fail);
  if (a === 'importclub') importClubBooks().then(() => toast(TN.imported)).catch(fail);
  if (a === 'quick') { S.quick = !S.quick; render(); }
  if (a === 'qdel') remove(`users/${uid}/quotes/${el.dataset.id}`).catch(fail);
  if (a === 'onbmood') { const m = el.dataset.v; if (S.moods.has(m)) S.moods.delete(m); else S.moods.add(m); render(); }
  if (a === 'onbnext') {
    if (S.onb === 1 && S.moods.size) saveProfile(uid, { moods: [...S.moods] }).catch(fail);
    S.onb += 1; S.results = null; render();
  }
  if (a === 'onbdone') { S.onb = 0; render(); }
  if (a === 'pedit') { S.editProfile = true; render(); }
  if (a === 'tstart') startTimer(S.shelf);
  if (a === 'treset') resetTimer();
  if (a === 'roomtoggle') setRoom(!document.body.classList.contains('in-room'));
  if (a === 'roomopt') setOption(el.dataset.kind, el.dataset.v);
  if (a === 'tstop') finishSession();
  if (a === 'recapshare') shareRecap(S).catch(fail);
  if (a === 'msave') {
    let v = $('#music-url').value.trim();
    if (v && !/^https?:/.test(v)) v = 'https://' + v;
    saveProfile(uid, { music: v }).then(() => { toast(TK.saved); render(); }).catch(fail);
  }
  if (a === 'metric') { try { localStorage.setItem('kuytu-metric', el.dataset.v); } catch (err) {} render(); }
  if (a === 'logpg') $('#log-form [name="pages"]').value = el.dataset.v;
  if (a === 'logall') { S.logAll = true; render(); }
  if (a === 'heatday') { const f = $('#log-form'); if (f) { f.closest('details').open = true; f.elements.day.value = el.dataset.v; f.scrollIntoView({ behavior: 'smooth', block: 'center' }); f.elements.pages.focus({ preventScroll: true }); } }
  if (a === 'gsave') saveProfile(uid, { [S.metricNow === 'pages' ? 'goalPages' : 'goalMin']: Math.max(0, Number($('#goal').value) || 0) }).then(() => toast(TK.saved)).catch(fail);
  if (a === 'delsess') {
    if (S.armed !== el.dataset.id) { S.armed = el.dataset.id; render(); return; }
    S.armed = false;
    removeSession(uid, el.dataset.id).catch(fail);
  }
  if (a === 'remove') {
    if (!S.armed) { S.armed = true; render(); return; }
    removeShelf(uid, S.bookId).then(() => { location.hash = '#raf'; }).catch(fail);
  }
});
// Sayfa eklenince raftaki kaldığın sayfa da ileri gider
const bumpPage = (bookId, pages) => {
  const b = shelfBook(bookId);
  if (b && pages) updateShelf(S.user.uid, bookId, { page: (b.page || 0) + pages }).catch(fail);
};
function finishSession() {
  const r = stopTimer();
  if (!r || r.seconds < 5) return;
  const added = addSession(S.user.uid, { bookId: r.bookId, title: r.title, seconds: r.seconds, at: new Date().toISOString() });
  added.catch(fail);
  if (r.seconds < 60) return;
  const el = document.createElement('div');
  el.className = 'done-moment';
  el.innerHTML = `<p class="label">${TK.done}</p><p class="dm-n">${Math.round(r.seconds / 60)}<small> ${TK.minutesWord}</small></p><p>${esc(r.title)}</p>
    <form class="dm-form"><label>${TK.howMany}<input name="pages" type="number" min="1" max="5000" inputmode="numeric"></label><button class="btn" type="submit">${T.save}</button><button class="btn ghost" type="button" data-skip>${TK.skip}</button></form>`;
  const close = () => { el.classList.add('off'); setTimeout(() => el.remove(), 400); };
  el.querySelector('[data-skip]').addEventListener('click', close);
  el.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    e.stopPropagation();
    const pages = Math.round(Number(e.target.elements.pages.value)) || 0;
    if (pages > 0 && pages <= 5000) { bumpPage(r.bookId, pages); added.then(d => patchSession(S.user.uid, d.id, { pages })).catch(fail); }
    close();
  });
  document.body.appendChild(el);
  el.querySelector('input').focus();
}
// Kullanıcı adı yazılırken düzeltilir: Türkçe harf, büyük harf ve boşluk hata vermesin
const TR = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
const cleanUsername = s => s.toLocaleLowerCase('tr').replace(/[çğıöşü]/g, c => TR[c]).replace(/[\s.-]+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 20);
document.addEventListener('input', e => {
  if (e.target.name === 'username') e.target.value = cleanUsername(e.target.value);
});
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target.elements, id = e.target.id;
  try {
    if (id === 'auth-form') {
      if (S.mode === 'signup') await signupEmail(f.name.value.trim(), f.email.value.trim(), f.pass.value);
      else await loginEmail(f.email.value.trim(), f.pass.value);
    }
    if (id === 'name-form') {
      const username = cleanUsername(f.username.value);
      if (!USERNAME_RE.test(username)) return toast(T.badUsername);
      if (S.claiming) return;
      S.claiming = true;
      S.onb = 1;
      await claimUsername(S.user, username).catch(err => { S.onb = 0; throw err; }).finally(() => { S.claiming = false; });
    }
    if (id === 'search-form') await runSearch(f.q.value.trim());
    if (id === 'onb-invite') { S.onb = 0; location.hash = '#davet/' + encodeURIComponent(f.code.value.trim().split('/').pop()); }
    if (id === 'lend-form') await updateShelf(S.user.uid, S.bookId, { lentTo: f.who.value.trim(), lentAt: new Date().toISOString() });
    if (id === 'quote-form') { await add(`users/${S.user.uid}/quotes`, { text: f.text.value.trim(), book: f.book.value, at: new Date().toISOString() }); f.text.value = ''; }
    if (id === 'quick-form') {
      const b = S.shelf.find(x => x.status === 'okuyorum'), page = Math.max(0, Number(f.page.value) || 0), diff = page - (b.page || 0);
      await updateShelf(S.user.uid, b.id, { page });
      if (diff > 0) await addSession(S.user.uid, { bookId: b.id, title: b.title, seconds: 0, pages: diff, at: new Date().toISOString(), manual: true });
      S.quick = false;
      render();
      toast(TK.saved);
    }
    if (id === 'manual-form') {
      const book = { id: 'm_' + crypto.randomUUID(), title: f.title.value.trim(), author: f.author.value.trim(), cover: '', pages: Number(f.pages.value) || 0, year: '', publisher: '' };
      await addToShelf(S.user.uid, book, 'istiyorum');
      location.hash = '#kitap/' + encodeURIComponent(book.id);
      toast(T.added);
    }
    if (S.user && await clubSubmit(id, f)) return;
    if (id === 'profile-form') { await profileSubmit(S, f); toast(TK.saved); }
    if (id === 'log-form') {
      const min = Math.round(Number(f.min.value)) || 0, pages = Math.round(Number(f.pages.value)) || 0;
      if (!min && !pages) return toast(TK.needAmount);
      if (min < 0 || min > 1440 || pages < 0 || pages > 5000) return toast(TK.tooBig);
      const at = new Date(`${f.day.value}T${f.time.value || '12:00'}:00`), now = new Date();
      if (isNaN(at)) return toast(TK.badDate);
      if (dayKey(at) > dayKey(now)) return toast(TK.future);
      if (at > now) at.setTime(now.getTime());
      const b = shelfBook(f.book.value);
      const entry = { bookId: f.book.value, title: b ? b.title : '', seconds: min * 60, at: at.toISOString(), manual: true };
      if (pages) entry.pages = pages;
      await addSession(S.user.uid, entry);
      bumpPage(f.book.value, pages);
      toast((pages ? pages + ' sayfa' : min + ' dk') + ' ' + TK.added);
    }
    if (id === 'page-form') {
      await updateShelf(S.user.uid, S.bookId, { page: Number(f.page.value) || 0, pages: Number(f.pages.value) || 0 });
      toast(T.sent);
    }
  } catch (err) {
    if (err.message === 'taken') toast(T.taken);
    else fail(err);
  }
});

setOnFinish(() => finishSession());
initClubs({ S, toast, fail, render: () => render(), coverHTML });
route();
if (configured) {
  let stops = [];
  onUser(user => {
    stops.forEach(s => s());
    stops = [];
    S.user = user;
    S.profile = undefined;
    S.shelf = [];
    S.sessions = [];
    render();
    if (user) {
      // Okuma köşesinde sayfa yeniden çizilmez; müzik kesilmesin diye yalnızca zamanlayıcı yenilenir
      const redraw = () => { setCurrent(S); if (S.view === 'okuma' && $('#timer-card') && timerOn()) refreshTimer(); else render(); };
      stops.push(watchCol(`users/${user.uid}/quotes`, l => { S.quotes = l.sort((a, b) => (b.at || '').localeCompare(a.at || '')); redraw(); }, () => {}));
      stops.push(watchCol('users/' + user.uid + '/clubs', l => { const first = !S.myClubs; S.myClubs = l; if (first) route(); else if (S.view === 'kulup' || S.view === 'davet') render(); }));
      stops.push(watchSessions(user.uid, list => { S.sessions = list; redraw(); }));
      stops.push(watchProfile(user.uid, p => { const first = S.profile === undefined; S.profile = p; if (first) { route(); } else redraw(); }));
      stops.push(watchShelf(user.uid, list => {
        S.shelf = list;
        // Aramada yazılan metin kaybolmasın: arama sayfasında yalnızca sonuçlar yenilenir
        if ((S.view === 'ara' || S.onb) && $('#results')) $('#results').innerHTML = resultsHTML();
        else redraw();
      }));
    }
  });
}
