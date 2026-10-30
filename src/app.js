import { T } from './strings.js';
import { configured, USERNAME_RE, onUser, logout, loginGoogle, loginEmail, signupEmail, resetPassword, resendVerify, watchProfile, claimUsername } from './auth.js';
import { searchBooks } from './books.js';
import { STATUS, watchShelf, addToShelf, updateShelf, removeShelf } from './shelf.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const S = { user: null, profile: undefined, shelf: [], mode: 'login', view: 'raf', bookId: null, results: null, searching: false, armed: false };

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 3500);
}
const fail = err => toast(T.authErrors[err.code] || T.error);
const shelfBook = id => S.shelf.find(b => b.id === id);
const hueOf = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
// Kuytu işareti: kemer içinde yıldız ve açık kitap
const LOGO = '<svg class="logo" viewBox="0 0 60 72" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M6 68V30a24 24 0 0 1 48 0v38"/><path d="M30 14l2.4 7.6L40 24l-7.6 2.4L30 34l-2.4-7.6L20 24l7.6-2.4z" fill="currentColor" stroke="none"/><path d="M30 48c-5-4-12-5-18-3v17c6-2 13-1 18 3 5-4 12-5 18-3V45c-6-2-13-1-18 3zM30 48v17"/></svg>';
const ICON = { raf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 5.5c2.5-1.2 6-1.2 9 1 3-2.2 6.5-2.2 9-1V19c-2.5-1.2-6-1.2-9 1-3-2.2-6.5-2.2-9-1zM12 6.5V20"/></svg>', ara: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>' };
const coverHTML = b => (b.cover
  ? `<img class="cover" src="${esc(b.cover)}" alt="" loading="lazy">`
  : `<span class="cover ph" style="--h:${hueOf(b.title)}"><b>${esc(b.title)}</b></span>`);

function viewLanding() {
  const signup = S.mode === 'signup';
  return `<section class="landing">
    <div class="landing-hero"><div class="brandmark">${LOGO}<b>KUYTU</b><span>${T.brandSub}</span></div><p class="slogan">${T.tagline}</p><p class="sub">${T.sub}</p></div>
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
const header = () => `<header class="top"><a class="brand" href="#raf">${LOGO}KUYTU</a>
  <nav class="nav"><a href="#raf" class="${S.view === 'raf' ? 'on' : ''}">${ICON.raf}${T.navShelf}</a><a href="#ara" class="${S.view === 'ara' ? 'on' : ''}">${ICON.ara}${T.navSearch}</a></nav>
  <button class="btn ghost logout" type="button" data-act="logout">${T.logout}</button></header>`;
const tile = b => `<a class="tile" href="#kitap/${encodeURIComponent(b.id)}">${coverHTML(b)}<span class="t">${esc(b.title)}</span><span class="a">${esc(b.author || T.unknownAuthor)}</span>${b.rating ? `<span class="stars">${'★'.repeat(b.rating)}</span>` : ''}</a>`;
function viewShelf() {
  const needsVerify = S.user.providerData.some(p => p.providerId === 'password') && !S.user.emailVerified;
  const rows = STATUS.map(([k, label]) => {
    const list = S.shelf.filter(b => b.status === k).sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
    return list.length ? `<section class="row"><h3>${label} <span>${list.length}</span></h3><div class="grid">${list.map(tile).join('')}</div></section>` : '';
  }).join('');
  return `${needsVerify ? `<p class="notice">${T.verify} <button class="linkbtn" type="button" data-act="resend">${T.resend}</button></p>` : ''}
    <section class="hello"><h2>${T.hello} ${esc(S.profile.name.split(' ')[0])}</h2><p class="muted">@${esc(S.profile.username)} · ${T.helloSub}</p>
      <div class="stats"><div><b>${S.shelf.length}</b><span>${T.statBooks}</span></div><div><b>${S.shelf.filter(b => b.status === 'okuyorum').length}</b><span>${T.statReading}</span></div><div><b>${S.shelf.filter(b => b.status === 'okudum').length}</b><span>${T.statDone}</span></div></div></section>
    ${rows || `<p class="empty-note">${T.empty} <a href="#ara">${T.navSearch}</a></p>`}`;
}
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
    <form class="searchbar" id="search-form"><input name="q" type="search" required placeholder="${T.searchHint}" aria-label="${T.searchHint}"><button class="btn" type="submit">${T.search}</button></form>
    <div id="results">${resultsHTML()}</div>
    <details class="manual"><summary>${T.manual}</summary>
      <form class="panel" id="manual-form"><label>${T.bookTitle}<input name="title" required maxlength="200"></label><label>${T.author}<input name="author" maxlength="200"></label><label>${T.pages}<input name="pages" type="number" min="1" max="20000"></label><button class="btn" type="submit">${T.add}</button></form>
    </details>`;
}
function viewBook() {
  const b = shelfBook(S.bookId);
  if (!b) return `<p><a href="#raf">${T.back}</a></p>`;
  const st = STATUS.map(([k, label]) => `<button type="button" class="${b.status === k ? 'on' : ''}" data-act="status" data-v="${k}">${label}</button>`).join('');
  const stars = [1, 2, 3, 4, 5].map(n => `<button type="button" class="${(b.rating || 0) >= n ? 'on' : ''}" data-act="rate" data-v="${n}" aria-label="${n}">★</button>`).join('');
  return `<a class="small" href="#raf">← ${T.back}</a>
    <section class="book">${coverHTML(b)}<div class="book-body">
      <h2>${esc(b.title)}</h2><p class="muted">${esc([b.author || T.unknownAuthor, b.year, b.publisher].filter(Boolean).join(' · '))}</p>
      <div class="seg wrap" role="group">${st}</div>
      <div class="rate" role="group" aria-label="${T.rating}">${stars}</div>
      <form id="page-form" class="pagebar"><label>${T.currentPage}<input name="page" type="number" min="0" max="20000" value="${b.page || ''}"></label><label>${T.pages}<input name="pages" type="number" min="1" max="20000" value="${b.pages || ''}"></label><button class="btn ghost" type="submit">${T.save}</button></form>
      ${b.pages ? `<div class="meter"><span style="width:${Math.min(100, Math.round((b.page || 0) / b.pages * 100))}%"></span></div>` : ''}
      <button class="linkbtn small" type="button" data-act="remove">${S.armed ? T.removeSure : T.remove}</button>
    </div></section>`;
}
function render() {
  const v = $('#view');
  if (!S.user) v.innerHTML = viewLanding();
  else if (S.profile === undefined) v.innerHTML = '';
  else if (!S.profile) v.innerHTML = viewUsername();
  else v.innerHTML = header() + ({ raf: viewShelf, ara: viewSearch, kitap: viewBook }[S.view] || viewShelf)();
}
function route() {
  const [view, id] = location.hash.slice(1).split('/');
  S.view = ['ara', 'kitap'].includes(view) ? view : 'raf';
  S.bookId = id ? decodeURIComponent(id) : null;
  S.armed = false;
  render();
  scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act, uid = S.user && S.user.uid;
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
  if (a === 'remove') {
    if (!S.armed) { S.armed = true; render(); return; }
    removeShelf(uid, S.bookId).then(() => { location.hash = '#raf'; }).catch(fail);
  }
});
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
      await claimUsername(S.user, username);
    }
    if (id === 'search-form') {
      S.searching = true;
      $('#results').innerHTML = resultsHTML();
      try { S.results = await searchBooks(f.q.value.trim()); } catch (err) { S.results = 'fail'; }
      S.searching = false;
      $('#results').innerHTML = resultsHTML();
    }
    if (id === 'manual-form') {
      const book = { id: 'm_' + crypto.randomUUID(), title: f.title.value.trim(), author: f.author.value.trim(), cover: '', pages: Number(f.pages.value) || 0, year: '', publisher: '' };
      await addToShelf(S.user.uid, book, 'istiyorum');
      location.hash = '#kitap/' + encodeURIComponent(book.id);
      toast(T.added);
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

route();
if (configured) {
  let stops = [];
  onUser(user => {
    stops.forEach(s => s());
    stops = [];
    S.user = user;
    S.profile = undefined;
    S.shelf = [];
    render();
    if (user) {
      stops.push(watchProfile(user.uid, p => { S.profile = p; render(); }));
      stops.push(watchShelf(user.uid, list => {
        S.shelf = list;
        // Aramada yazılan metin kaybolmasın: arama sayfasında yalnızca sonuçlar yenilenir
        if (S.view === 'ara' && $('#results')) $('#results').innerHTML = resultsHTML();
        else render();
      }));
    }
  });
}
