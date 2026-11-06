import { T, TK, TP, TN } from './strings.js';
import { viewProfile, profileSubmit } from './profile.js';
import { viewToday, searchLeft, readingBook, exploreRight } from './home.js';
import { viewLibrary, cardHTML, finishHTML, playPanel, scanBarcode, viewBook, editHTML } from './library.js';
import { exportData, reminderICS, freshLogin, deleteAccount, privacyHTML } from './account.js';
import { coverHTML, flat, backdrop, colorOf, learnColor } from './parts.js';
import { configured, USERNAME_RE, onUser, logout, remember, loginGoogle, loginEmail, signupEmail, resetPassword, resendVerify, watchProfile, claimUsername } from './auth.js';
import { searchBooks, fillInfo, coverChoices, fetchGenre, recommend, GENRE_NAMES, fetchKunye } from './books.js';
import { STATUS, watchShelf, addToShelf, updateShelf, removeShelf } from './shelf.js';
import { $, esc, dayKey } from './util.js';
import { watchSessions, addSession, patchSession, removeSession, saveProfile } from './sessions.js';
import { refreshTimer, setCurrent, startTimer, stopTimer, resetTimer, setRoom, setOption, setOnFinish, timerOn, togglePause, holdTimer, releaseTimer, setHooks, clearNow, viewTimer, viewMusic, timerBookId } from './reading.js';
import { shareRecap, logForm, sessionsList } from './takip.js';
import { sharePublic, searchPeople, getPublic, watchPeople, sendRequest, accept, dropRequest, unfriend, viewReaders, viewReader } from './people.js';
import { TF, TR as TRV } from './strings.js';
import { bookKey, bookReviews, latestReviews, saveReview, removeReview, friendCards, reviewsSection, socialBlock, logActivity, latestActivity } from './social.js';
import { publishClub, unpublishClub, refreshDirectory, searchClubs, watchRequests, requestJoin, dropRequest as dropClubReq, approveRequest, joinApproved, viewClubsExplore } from './clubpublic.js';
import { TJ } from './strings.js';
import { bell, markSeen, announce, primeFriends } from './notify.js';
import { watchCol, add, remove } from './clubs.js';
import { pageChange, enhance } from './motion.js';
import { initClubs, openClub, closeClub, openNotes, loadInvite, viewClubs, viewInvite, viewClub, viewClubBook, clubClick, clubSubmit, clubNow, clubMissing, importClubBooks, clubLeft, clubShownBook, shareCard } from './clubview.js';


const S = { user: null, profile: undefined, shelf: [], sessions: [], quotes: [], reveal: new Set(), mode: 'login', view: 'bugun', bookId: null, results: null, searching: false, armed: false, moods: new Set() };
try { S.libGroup = localStorage.getItem('kuytu-duzen') || 'durum'; } catch (e) {}

// Görünüm tercihi yalnızca bu cihazda tutulur; "cihaza göre" seçiliyken telefonun gece ayarını izler
const themeOf = () => { try { return localStorage.getItem('kuytu-tema') || 'sistem'; } catch (e) { return 'sistem'; } };
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = themeOf(), dark = t === 'koyu' || (t === 'sistem' && darkMQ.matches);
  document.documentElement.toggleAttribute('data-dark', dark);
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = dark ? '#1b1916' : '#fbf6ec';
}
darkMQ.addEventListener('change', applyTheme);
applyTheme();

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 3500);
}
const fail = err => toast(T.authErrors[err.code] || T.error);
const shelfBook = id => S.shelf.find(b => b.id === id);
function viewLanding() {
  const signup = S.mode === 'signup';
  return `<div class="shell landing2" style="--book:#2c5a47"><aside class="lp">
      <span class="cap">${TN.firstPage}</span><div class="lp-center"><h1 class="kt light xl">Kuytu</h1><span class="rule-s"></span><p class="pq light">${T.tagline.replace(' farklı', '<br>farklı')}</p></div><span class="cap">${TN.lpFoot}</span></aside>
    <section class="pp"><div class="pp-in narrow">
      <p class="cap">İÇİNDEKİLER</p>
      <div class="toc"><div><span>${TN.tocI}</span><span class="dots"></span><span class="r">I</span></div><div><span>${TN.tocII}</span><span class="dots"></span><span class="r">II</span></div><div><span>${TN.tocIII}</span><span class="dots"></span><span class="r">III</span></div></div>
      ${configured ? `<form class="panel auth" id="auth-form">
        <div class="seg" role="tablist"><button type="button" role="tab" aria-selected="${!signup}" class="${signup ? '' : 'on'}" data-act="mode" data-v="login">${T.login}</button><button type="button" role="tab" aria-selected="${signup}" class="${signup ? 'on' : ''}" data-act="mode" data-v="signup">${T.signup}</button></div>
        <h2 class="kt sm">${signup ? T.joinTitle : T.welcomeBack}</h2>
        ${signup ? `<label>${T.name}<input name="name" required autocomplete="name" maxlength="60" value="${esc(S.authName || '')}"></label>` : ''}
        <label>${T.email}<input name="email" type="email" required autocomplete="email" inputmode="email" value="${esc(S.authEmail || '')}"></label>
        <label>${T.password}<span class="pw"><input name="pass" type="password" required minlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}"><button type="button" class="pw-eye" data-act="pweye" aria-label="${T.showPwLabel}" aria-pressed="false">${T.showPw}</button></span>${signup ? `<small class="lbl small">${T.pwHint}</small>` : ''}</label>
        ${signup ? `<label>${T.pass2}<input name="pass2" type="password" required minlength="6" autocomplete="new-password"></label>` : ''}
        <div class="auth-row"><label class="check-row" title="${T.rememberHint}"><input type="checkbox" name="remember" checked>${T.remember}</label>${signup ? '' : `<button class="linkbtn small" type="button" data-act="reset">${T.forgot}</button>`}</div>
        ${signup ? `<p class="lbl small">${T.consent}</p>` : ''}
        <button class="pl on" type="submit">${signup ? T.signup : T.login}</button>
        <p class="or"><span>${T.or}</span></p>
        <button class="pl" type="button" data-act="google">${T.google}</button>
      </form>` : `<p class="notice">${T.setup}</p>`}
      <a class="linkbtn small" href="#gizlilik">${TN.privacy}</a>
    </div></section></div>`;
}
// İlk adımlar giriş ekranıyla aynı çerçevede: solda Kuytu ve adım sırtları, sağda tek bir soru
const frame = (step, right) => `<div class="shell landing2 v-onb" style="--book:#2c5a47"><aside class="lp">
    <span class="cap">${TN.firstPage}</span>
    <div class="lp-center"><h1 class="kt light xl">Kuytu</h1><span class="rule-s"></span>
      <div class="onb-steps" aria-label="${TN.step} ${Math.min(step + 1, 4)} / 4">${[0, 1, 2, 3].map(i => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div></div>
    <span class="cap">${TN.lpFoot}</span></aside>
  <section class="pp"><div class="pp-in narrow onb-r">${right}</div></section></div>`;
// Açılışta, hesap ve profil gelene kadar: giriş ekranı bir an bile görünmez
const loader = () => `<div class="loading" role="status"><span class="kt light">Kuytu</span><span class="ld" aria-hidden="true"><i></i><i></i><i></i></span><span class="sr-only">${TN.loading}</span></div>`;
function viewUsername() {
  return `<p class="cap">${TN.begin}</p><h1 class="kt sm">${T.chooseTitle}</h1>
    <form class="panel" id="name-form"><label>${T.username}<input name="username" required autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="ornek_okur"></label>
    <p class="lbl small">${T.chooseHelp}</p><button class="pl on" type="submit">${T.save}</button></form>`;
}
// Etkin kulüp: son açılan; yoksa ilk kulüp. Menü ve açılış sayfası buna göre çalışır
const activeClub = () => {
  const list = S.myClubs || [];
  let saved = null;
  try { saved = localStorage.getItem('kuytu-club'); } catch (e) {}
  return (list.find(c => c.id === saved) || list.find(c => c.name === 'Kitap Kulübü') || list[0] || {}).id || '';
};
// Menü kitap sayfasının üstünde durur; telefonda ekranın altına iner
const nav = () => {
  const a = activeClub(), club = ['k', 'kb', 'kulup', 'davet'].includes(S.view);
  const link = (href, on, text, ic) => `<a href="${href}" class="${on ? 'on' : ''}"><i class="ni ni-${ic}" aria-hidden="true"></i><span>${text}</span></a>`;
  // Dört sekme; profil sağ üstte baş harfli simge, telefonda beşinci simge
  const ini = esc(((S.profile && (S.profile.name || S.profile.username)) || '?').trim().charAt(0).toLocaleUpperCase('tr'));
  // Kuytuna gir: uygulamanın asıl işi; telefonda alt çubuğun ortasında büyük düğme, bilgisayarda menünün sonunda
  const go = `<button type="button" class="kgo${timerOn() ? ' live' : ''}" data-act="kuytugo" aria-label="${TK.kuytuGo}${timerOn() ? ' · ' + TK.liveNow : ''}"><i class="kgo-ic" aria-hidden="true"></i><span>${TK.kuytuGo}</span></button>`;
  // Arama ve profil menüsü: her sayfanın üstünde
  const search = `<form class="topsearch" id="top-search" role="search"><input name="q" type="search" placeholder="${TN.topSearch}" aria-label="${TN.topSearch}" autocomplete="off"></form><a class="srch-ic" href="#ara" aria-label="${TN.topSearch}"></a>`;
  return `<nav class="pnav">${link('#bugun', S.view === 'bugun', TN.today, 'b')}${link('#raf', S.view === 'raf' || S.view === 'kitap', TN.lib, 'k')}${go}${link('#ara', S.view === 'ara' || S.view === 'okur', TN.explore + ((S.reqIn || []).length ? ` <em class="badge" aria-label="${(S.reqIn || []).length} ${TF.incoming.toLocaleLowerCase('tr')}">${(S.reqIn || []).length}</em>` : ''), 'e')}${link(a ? '#k/' + encodeURIComponent(a) + '/ay' : '#kulup', club, TN.club + ((S.clubReqs || []).filter(r => !r.approved).length ? ` <em class="badge">${S.clubReqs.filter(r => !r.approved).length}</em>` : ''), 'u')}${search}${S.user ? bell(S) : ''}<span class="mewrap"><button type="button" class="me ${S.view === 'profil' ? 'on' : ''}" data-act="memenu" aria-haspopup="menu" aria-expanded="${!!S.meMenu}" aria-label="${TN.profile}"><b class="av" aria-hidden="true">${ini}</b></button>
    ${S.meMenu ? `<span class="memenu" role="menu"><a role="menuitem" href="#profil">${TN.profile}</a><a role="menuitem" href="#okurlar">${TF.myFriendsLink}${(S.reqIn || []).length ? ` <em class="badge">${S.reqIn.length}</em>` : ''}</a><a role="menuitem" href="#profil/gecmis">${TN.menuHistory}</a><a role="menuitem" href="#profil/ayarlar">${TN.menuSettings}</a><button type="button" role="menuitem" data-act="logout">${TP.logout}</button></span>` : ''}</span></nav>`;
};
// Kitap sayfası: sağdaki bölümler, soldaki oda; müzik çalar odada kullanılmak üzere sayfada gizli durur
function bookPage() {
  const b = shelfBook(S.bookId);
  if (!b) return viewBook(S, null);
  loadReviews(b);
  const parts = { timer: viewTimer(S, b.id), music: viewMusic(S), log: logForm(S, b.id), sess: sessionsList(S, S.sessions.filter(s => s.bookId === b.id)), edit: S.editing ? editHTML(S, b) : '', reviews: friendsOnBook(b) + reviewsSection(S, b) };
  return viewBook(S, b, parts);
}
// Kitabın yorumları bir kez okunur; odadayken sayfa yeniden çizilmez (müzik kesilmesin)
const quietRender = () => { if (!document.body.classList.contains('in-room')) render(); };
function loadReviews(b, force) {
  const key = bookKey(b);
  if (!force && S.bookRevs && S.bookRevs.key === key) return;
  S.bookRevs = { key, list: null }; S.bookRevsErr = false; S.rvRating = undefined;
  bookReviews(b).then(list => { if (S.bookRevs.key === key) { S.bookRevs = { key, list }; if (S.view === 'kitap') quietRender(); } })
    .catch(() => { S.bookRevsErr = true; if (S.view === 'kitap') quietRender(); });
}
// Bugün'ün sosyal bölümü: son yorumlar ve arkadaşların vitrinleri, oturumda bir kez (arkadaş listesi değişince yeniden)
function loadSocial() {
  if (S.acts === undefined) { S.acts = null; latestActivity().then(l => { S.acts = l; if (S.view === 'bugun') render(); }).catch(() => { S.acts = []; }); }
  if (S.feed === undefined) { S.feed = null; latestReviews().then(l => { S.feed = l; if (S.view === 'bugun') render(); }).catch(() => { S.feedErr = true; S.feed = []; if (S.view === 'bugun') render(); }); }
  loadFriendCards();
}
function loadFriendCards() {
  const sig = (S.friends || []).map(f => f.id).sort().join(',');
  if (S.friendSig !== sig) { S.friendSig = sig; friendCards(S).then(l => { S.friendCards = l; if (S.view === 'bugun' || S.view === 'kitap') quietRender(); }).catch(() => {}); }
}
// Kitap sayfasında: bu kitabı şu an okuyan ya da yorumlayan arkadaşlar
function friendsOnBook(b) {
  loadFriendCards();
  const key = bookKey(b), seen = new Map();
  (Array.isArray(S.friendCards) ? S.friendCards : []).filter(p => p.reading && bookKey(p.reading) === key).forEach(p => seen.set(p.uid, { uid: p.uid, name: p.name || p.username, what: TN.friendsRead }));
  const revs = S.bookRevs && S.bookRevs.key === key && Array.isArray(S.bookRevs.list) ? S.bookRevs.list : [];
  revs.filter(r => (S.friends || []).some(f => f.id === r.uid) && !seen.has(r.uid)).forEach(r => seen.set(r.uid, { uid: r.uid, name: r.name, what: TN.friendsDone }));
  if (!seen.size) return '';
  return `<div class="bp-friends"><p class="cap">${TN.friendsHere}</p><div class="bp-fr">${[...seen.values()].map(f => `<a href="#okur/${encodeURIComponent(f.uid)}"><span class="rd-av sm">${esc((f.name || '?').charAt(0).toLocaleUpperCase('tr'))}</span><b>${esc((f.name || '').split(' ')[0])}</b><small>${f.what}</small></a>`).join('')}</div></div>`;
}
const clubTabs = () => {
  if (!S.club) return '';
  const k = '#k/' + encodeURIComponent(S.club.id), on = t => (S.view === 'k' && S.clubTab === t) || (t === 'kitaplar' && S.view === 'kb');
  const link = (t, text) => `<a href="${k}/${t}" class="${on(t) ? 'on' : ''}">${text}</a>`;
  // Üç alt sekme; üyeler ve kulüp değiştirme sağda, ikincil
  return `<nav class="subnav">${link('ay', TK.navHome)}${link('kitaplar', TK.navLibrary)}${link('oneriler', TK.navSugg)}<span class="sn-end">${link('uyeler', TN.clubMembers)}${(S.myClubs || []).length > 1 ? `<a href="#kulup">${TN.clubSwitch}</a>` : ''}</span></nav>`;
};
function resultsHTML() {
  if (S.searching) return `<p class="muted">${T.searching}</p>`;
  if (S.results === null) return S.onb ? '' : `<p class="lbl search-empty">${TN.searchEmpty}</p>`;
  if (S.results === 'fail') return `<p class="muted">${T.searchFail}</p>`;
  if (!S.results.length) return `<p class="muted">${T.noResults}</p>`;
  return `<ul class="results">${S.results.map((b, i) => `<li>${coverHTML(b)}<div><b>${esc(b.title)}</b><p class="muted small">${esc([b.author, b.year, b.pages ? b.pages + ' sayfa' : ''].filter(Boolean).join(' · '))}</p></div>
    ${shelfBook(b.id) ? `<span class="lbl small">${T.inShelf}</span>` : `<button class="pl sm" type="button" data-act="add" data-i="${i}">${T.add}</button>`}</li>`).join('')}</ul>`;
}
// Keşfet > Kulüpler: herkese açık kulüpler bir kez yüklenir, aramayla yenilenir
function loadClubs(force) {
  if (!force && S.clubsFound !== undefined) return;
  S.clubsFound = 'loading'; S.clubsErr = false;
  searchClubs(S.clubsQ || '').then(l => { S.clubsFound = l; if (S.view === 'ara') render(); }).catch(() => { S.clubsFound = null; S.clubsErr = true; if (S.view === 'ara') render(); });
}
// Keşfet'te öneriler: okuduğun ve sevdiğin kitapların yazarları ve türlerinden. Oturumda bir kez hazırlanır
function recsHTML() {
  if (S.recs === undefined && S.shelfReady) {
    S.recs = 'loading';
    recommend(S.shelf).then(l => { S.recs = l; if (S.view === 'ara') render(); }).catch(() => { S.recs = []; });
  }
  const r = S.recs;
  const body = r === 'loading' || r === undefined ? `<p class="lbl small">${TN.recLoading}</p>`
    : !r.length ? `<p class="lbl small">${TN.recEmpty}</p>`
    : `<div class="recs">${r.map((b, i) => `<div class="rec">${coverHTML(b)}<b>${esc(b.title)}</b><small>${esc(b.author || '')}</small><span class="rec-why">${esc(b.why)} ${GENRE_NAMES.includes(b.why) ? TN.recWhyG : TN.recWhy}</span>${shelfBook(b.id) ? `<span class="lbl small">${T.inShelf}</span>` : `<button class="pl sm" type="button" data-act="recadd" data-i="${i}">${T.add}</button>`}</div>`).join('')}</div>`;
  return `<div class="blk rec-blk"><div class="rec-head"><p class="cap">${TN.recTitle}</p>${Array.isArray(r) && r.length ? `<button type="button" class="linkbtn small" data-act="recmore">${TN.recMore}</button>` : ''}</div>${body}</div>`;
}
function viewSearch() {
  return `<div class="search-page">
    <form class="searchbar" id="search-form"><input name="q" type="search" required placeholder="${T.searchHint}" aria-label="${T.searchHint}"><button class="pl ink" type="submit">${T.search}</button></form>
    <div id="results">${resultsHTML()}</div>
    <details class="manual"><summary>${T.manual}</summary>
      <form class="panel" id="manual-form"><label>${T.bookTitle}<input name="title" required maxlength="200"></label><label>${T.author}<input name="author" maxlength="200"></label><label>${T.pages}<input name="pages" type="number" min="1" max="20000"></label><button class="btn" type="submit">${T.add}</button></form>
    </details></div>`;
}
// Yeni üye karşılaması: kullanıcı adından hemen sonra, üç kısa adım
function viewOnb() {
  const n = S.onb, head = `<p class="cap">${TN.step.toLocaleUpperCase('tr')} ${Math.min(n, 3)} / 3</p>`, skip = `<button type="button" class="linkbtn" data-act="onbnext">${TN.skip}</button>`;
  if (n === 1) return `${head}<h1 class="kt sm">${TN.mood}</h1><div class="tags">${TN.moods.map(m => `<button type="button" class="${S.moods.has(m) ? 'on' : ''}" aria-pressed="${S.moods.has(m)}" data-act="onbmood" data-v="${m}">${m}</button>`).join('')}</div><div class="acts"><button class="pl on" type="button" data-act="onbnext">${TN.next}</button>${skip}</div>`;
  if (n === 2) return `${head}<h1 class="kt sm">${TN.bring}</h1><p class="lbl">${TN.bringSub}</p>
    <form class="searchbar" id="search-form"><input name="q" type="search" required placeholder="${T.searchHint}" aria-label="${T.searchHint}"><button class="pl ink" type="submit">${T.search}</button></form>
    <div class="acts"><button class="pl sm" type="button" data-act="scan">${TN.scan}</button></div>
    <div id="results">${resultsHTML()}</div><p class="lbl small">${S.shelf.length} ${TN.bookWord}</p><div class="acts"><button class="pl on" type="button" data-act="onbnext">${TN.next}</button>${skip}</div>`;
  if (n === 3) return `${head}<h1 class="kt sm">${TN.together}</h1>
    <form class="panel" id="onb-invite"><label>${TN.invite}<input name="code" required autocomplete="off"></label><button class="pl on" type="submit">${TN.joinClub}</button></form>
    <a class="pl" href="#kulup" data-act="onbdone">${TN.newClub}</a><p class="lbl small">${TN.soloOk}</p>${skip}`;
  return `<span class="stamp won big">${TN.member}</span><h1 class="kt sm">${TN.ready}</h1><p class="lbl">${TN.readyNext}</p><div class="acts"><a class="pl on" href="#bugun" data-act="onbdone">${TN.goIn}</a></div>`;
}
function updateCard() {
  const c = $('#card'), b = S.user && S.view === 'raf' && S.bookId ? shelfBook(S.bookId) : null;
  if (!b) { c.hidden = true; c.innerHTML = ''; S.cardOpen = null; S.editing = false; S.covers = null; return; }
  const a = document.activeElement, first = S.cardOpen !== b.id;
  if (!first && a && c.contains(a) && a.matches('input,textarea')) return;
  if (first) S.cardTab = 'okuma';
  c.innerHTML = cardHTML(S, b, first);
  c.style.setProperty('--book', colorOf(b));
  if (first) learnColor(b, hex => c.style.setProperty('--book', hex));
  c.hidden = false;
  S.cardOpen = b.id;
  const f = S.from || { x: 0, y: 200 };
  c.style.setProperty('--fx', f.x + 'px');
  c.style.setProperty('--fy', f.y + 'px');
}
// Her sayfa iki parça: solda kitabın kapağından bulanık zemin, sağda kitap sayfası. Kurdele yalnızca sayfaya girerken iner
const defaultLeft = () => { const b = readingBook(S); return `<div class="lp-top"><a class="brand" href="#bugun">Kuytu</a></div><div class="lp-mid">${b ? flat(b, 220, 'big') : ''}</div>`; };
function shell(o) {
  const fresh = S.fresh;
  S.fresh = false;
  const book = o.book || readingBook(S);
  const html = `<div class="shell v-${S.view}" style="--book:${colorOf(book)}"><aside class="lp">${backdrop(book)}${o.left || defaultLeft()}</aside>
    <section class="pp">${o.ribbon && S.view === 'bugun' ? `<div class="rbn${fresh ? ' drop' : ''}">${esc(o.ribbon)}</div>` : ''}${nav()}${S.view === 'k' || S.view === 'kb' ? clubTabs() : ''}<div class="pp-in">${o.right}</div></section></div>`;
  if (book) setTimeout(() => learnColor(book, hex => { const s = $('.shell'); if (s) s.style.setProperty('--book', hex); }));
  return html;
}
function render() {
  const v = $('#view'), focus = document.activeElement;
  // Bitirme anında cümle yazılırken arka plandaki kayıtlar sayfayı yeniden çizmez
  if (focus && focus.closest && focus.closest('.finish') && focus.matches('input')) return;
  if (S.view === 'gizlilik' && !S.user) v.innerHTML = `<div class="solo-page">${privacyHTML()}<a class="pl" href="#">${TN.close}</a></div>`;
  else if (configured && !S.authReady) v.innerHTML = loader();
  else if (!S.user) v.innerHTML = viewLanding();
  else if (S.profile === undefined) v.innerHTML = loader();
  else if (!S.profile) v.innerHTML = frame(0, viewUsername());
  else if (S.onb && S.view !== 'davet') v.innerHTML = frame(S.onb, viewOnb());
  else {
    const enter = S.enter;
    S.enter = false;
    const club = S.view === 'k' || S.view === 'kb';
    const views = {
      bugun: () => { loadSocial(); S.socialHTML = socialBlock(S); return viewToday(S, clubNow()); },
      raf: () => viewLibrary(S, enter, clubMissing()),
      ara: () => { if (S.exTab === 'kulup') loadClubs(); return { left: searchLeft(S), right: exploreRight(S, recsHTML() + viewSearch(), viewReaders(S), viewClubsExplore(S)), ribbon: TN.explore.toLocaleUpperCase('tr') }; },
      okur: () => viewReader(S),
      kitap: () => bookPage(),
      profil: () => viewProfile(S),
      gizlilik: () => ({ right: privacyHTML(), ribbon: TN.privacy.toLocaleUpperCase('tr') }),
      kulup: () => ({ right: viewClubs() }),
      davet: () => ({ right: viewInvite() }),
      k: () => ({ right: viewClub(S.clubTab) }),
      kb: () => ({ right: viewClubBook(S.bookId) }),
    };
    const o = views[S.view]();
    if (club) refreshDirectory(S, S.club);
    if (club) Object.assign(o, { left: clubLeft(), book: clubShownBook(), ribbon: S.view === 'kb' && S.chapter ? TN.chapter.toLocaleUpperCase('tr') + ' ' + S.chapter : TN.club.toLocaleUpperCase('tr'), folio: 3 });
    v.innerHTML = shell(o);
    const fb = S.finish && shelfBook(S.finish);
    if (fb) v.insertAdjacentHTML('beforeend', finishHTML(S, fb));
  }
  updateCard();
  enhance(v);
  if (S.view === 'kitap' && S.kuytu) afterBook();
  if (S.view === 'profil' && S.profileJump) { const t = $(S.profileJump === 'gecmis' ? '.history' : '.acct'); S.profileJump = ''; if (t) setTimeout(() => t.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }
}
// Kuytuna gir düğmesinden gelindiyse kitap sayfası çizilince oda açılır
function afterBook() {
  const k = S.kuytu;
  S.kuytu = null;
  if (k === 'enter' && timerOn()) setRoom(true);
  else if (k === 'start' && !timerOn() && $('#timer-book')) startTimer(S.shelf);
}function route() {
  const [raw, id, sub, bid] = location.hash.slice(1).split('/');
  // Eski bağlantılar yeni yerlerine gider
  // Oku sayfası kitap sayfasına taşındı: eski adresler okunan kitaba, eski kart adresi kitap sayfasına gider
  // Raf henüz gelmediyse okunan kitap bilinmez; raf gelince yönlendirilir
  if (['okuma', 'oda', 'takip'].includes(raw)) {
    if (!S.shelfReady) { S.pendingRead = true; S.view = 'bugun'; render(); return; }
    const rb = readingBook(S); location.replace(rb ? '#kitap/' + encodeURIComponent(rb.id) : '#raf'); return;
  }
  if (raw === 'raf' && id) { location.replace('#kitap/' + id); return; }
  if (raw === 'okurlar') S.exTab = 'okur';
  S.meMenu = false; S.bellOpen = false;
  // Profil menüsünden: geçmiş ya da ayarlar bölümüne iner
  S.profileJump = raw === 'profil' && id ? id : '';
  const view = { kesfet: 'ara', okurlar: 'ara' }[raw] || raw;
  if (view !== 'kitap') setRoom(false);
  S.view = ['raf', 'ara', 'kitap', 'kulup', 'davet', 'k', 'profil', 'gizlilik', 'okur'].includes(view) ? view : 'bugun';
  // Okur sayfası: vitrin belgesi okunur
  if (S.view === 'okur' && id) {
    const uid = decodeURIComponent(id);
    if (!S.reader || S.reader === 'loading' || S.reader.uid !== uid) { S.reader = 'loading'; if (S.user) getPublic(uid).then(p => { S.reader = p; if (S.view === 'okur') render(); }).catch(() => { S.reader = null; render(); }); }
  }
  S.bookId = id ? decodeURIComponent(id) : null;
  S.quick = false;
  S.fresh = true;
  S.menuFor = null;
  if (S.keepChapter) S.keepChapter = false; else S.chapter = 0;
  if (view === 'k' && id) {
    if (S.user) { openClub(decodeURIComponent(id)); try { localStorage.setItem('kuytu-club', decodeURIComponent(id)); } catch (e) {} }
    S.clubTab = ['ay', 'kitaplar', 'oneriler', 'uyeler'].includes(sub) ? sub : 'ay';
    if (sub === 'b' && bid && S.club) { S.view = 'kb'; S.bookId = decodeURIComponent(bid); openNotes(S.bookId); }
  } else if ((S.view === 'bugun' || S.view === 'raf') && S.user && activeClub()) openClub(activeClub());
  else if (S.club) closeClub();
  if (view === 'davet' && id && S.user && S.profile) { loadInvite(decodeURIComponent(id)); return; }
  S.armed = false;
  // Kitap kartı açılıp kapanırken sayfa olduğu yerde kalır
  if (S.view === 'kitap' && S.bookId !== S.lastBook) S.editing = false;
  S.lastBook = S.bookId;
  S.enter = S.view === 'raf';
  pageChange(() => { render(); scrollTo(0, 0); });
}
window.addEventListener('hashchange', route);
// Tarayıcı uygulama kurmayı önerince saklanır; Profil'deki düğme bunu kullanır
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; if (S.view === 'profil') render(); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (S.menuFor) { S.menuFor = null; S.armed = false; render(); } else if (S.cardOpen) location.hash = '#raf';
});
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
  if (S.meMenu && !e.target.closest('.mewrap')) { S.meMenu = false; render(); }
  if (el && el.dataset.act === 'memenu') { S.meMenu = !S.meMenu; S.bellOpen = false; render(); return; }
  // Bildirim zili: açınca yeniler vurgulu görünür, sonra görüldü sayılır
  if (S.bellOpen && !e.target.closest('.bellwrap')) { S.bellOpen = false; render(); }
  if (el && el.dataset.act === 'bell') { S.bellOpen = !S.bellOpen; S.meMenu = false; render(); if (S.bellOpen) markSeen(S); return; }
  if (S.menuFor &&(!el || !['bmenu', 'bdel', 'bedit', 'openbook'].includes(el.dataset.act))) { S.menuFor = null; S.armed = false; render(); }
  if (!el) return;
  const a = el.dataset.act, uid = S.user && S.user.uid;
  if (S.user && clubClick(a, el)) return;
  if (a === 'mode') {
    const f = $('#auth-form');
    if (f) { S.authEmail = f.elements.email.value; if (f.elements.name) S.authName = f.elements.name.value; }
    S.mode = el.dataset.v; render();
  }
  if (a === 'pweye') {
    const i = el.previousElementSibling, show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    el.textContent = show ? T.hidePw : T.showPw;
    el.setAttribute('aria-pressed', String(show));
  }
  // Açılır pencere tıklamanın hemen ardından açılmalı; hatırlama ayarı beklenmeden sıraya konur
  if (a === 'google') { const f = $('#auth-form'); remember(!f || f.elements.remember.checked).catch(() => {}); loginGoogle().catch(fail); }
  if (a === 'logout') logout().catch(fail);
  if (a === 'resend') resendVerify().then(() => toast(T.sent)).catch(fail);
  if (a === 'reset') {
    const email = $('#auth-form').elements.email.value.trim();
    if (!email) return toast(T.needEmail);
    resetPassword(email).then(() => toast(T.resetSent)).catch(fail);
  }
  if (a === 'add') addToShelf(uid, S.results[Number(el.dataset.i)], 'istiyorum').then(() => toast(T.added)).catch(fail);
  if (a === 'status') {
    if (el.dataset.v === 'okudum' && (shelfBook(S.bookId) || {}).status !== 'okudum') finishBook(shelfBook(S.bookId));
    else {
      const was = shelfBook(S.bookId) || {};
      updateShelf(uid, S.bookId, { status: el.dataset.v, ...(el.dataset.v === 'okuyorum' && !was.startedAt ? { startedAt: new Date().toISOString() } : {}) }).catch(fail);
      if (el.dataset.v === 'okuyorum' && was.status !== 'okuyorum') logActivity(S, 'started', was).catch(() => {});
    }
  }
  if (a === 'btab') { S.cardTab = el.dataset.v; render(); }
  if (a === 'startbook') { updateShelf(uid, el.dataset.id, { status: 'okuyorum', startedAt: new Date().toISOString() }).catch(fail); logActivity(S, 'started', shelfBook(el.dataset.id)).catch(() => {}); }
  if (a === 'bcolor') updateShelf(uid, S.bookId, { color: el.dataset.v }).catch(fail);
  if (a === 'frate')updateShelf(uid, S.finish, { rating: Number(el.dataset.v) }).catch(fail);
  if (a === 'fclose') { S.finish = null; render(); }
  if (a === 'fnext') { S.finish = null; logActivity(S, 'started', shelfBook(el.dataset.id)).catch(() => {}); updateShelf(uid, el.dataset.id, { status: 'okuyorum', startedAt: new Date().toISOString() }).then(() => { location.hash = '#bugun'; }).catch(fail); }
  if (a === 'mndel') remove(`users/${uid}/${el.dataset.coll === 'quotes' ? 'quotes' : 'notes'}/${el.dataset.id}`).catch(fail);
  if (a === 'export') exportData(uid).then(() => toast(TN.exported)).catch(fail);
  if (a === 'delask') { S.delAsk = !S.delAsk; render(); }
  if (a === 'theme') { try { localStorage.setItem('kuytu-tema', el.dataset.v); } catch (err) {} applyTheme(); render(); }
  if (a === 'rate') updateShelf(uid, S.bookId, { rating: Number(el.dataset.v) }).catch(fail);
  if (a === 'openbook') {
    const r = el.getBoundingClientRect();
    S.from = { x: Math.round(r.left + r.width / 2 - innerWidth / 2), y: Math.round(r.top + r.height / 2 - innerHeight / 2) };
    location.hash = '#kitap/' + encodeURIComponent(el.dataset.id);
  }
  if (a === 'bookclose') location.hash = '#raf';
  // Kuytuna gir: oturum sürüyorsa odaya döner; yoksa okunan kitapla, son seçilen düzende hemen başlar
  if (a === 'kuytugo') {
    const live = timerBookId(), b = live ? null : readingBook(S) || S.shelf.find(x => x.status === 'istiyorum');
    if (!live && !b) { location.hash = '#ara'; return; }
    const id = live || b.id, target = '#kitap/' + encodeURIComponent(id);
    S.kuytu = live ? 'enter' : 'start';
    if (location.hash === target) afterBook(); else location.hash = target;
  }
  // Yorumlar: yıldızlar sayfa yeniden çizilmeden değişir, yazılan metin kaybolmasın
  if (a === 'rvrate') { S.rvRating = Number(el.dataset.v); el.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', Number(x.dataset.v) <= S.rvRating)); }
  if (a === 'rvreveal') { S.reveal.add(el.dataset.id); render(); }
  if (a === 'rvdel') { const b = shelfBook(S.bookId); if (b) removeReview(S, b).then(() => { toast(TRV.removed); loadReviews(b, true); S.feed = undefined; }).catch(fail); }
  if (a === 'libgroup') { S.libGroup = el.dataset.v; try { localStorage.setItem('kuytu-duzen', S.libGroup); } catch (err) {} render(); playPanel(); }
  if (a === 'recadd') { const b = Array.isArray(S.recs) && S.recs[Number(el.dataset.i)]; if (b) addToShelf(uid, b, 'istiyorum').then(() => toast(T.added)).catch(fail); }
  if (a === 'recmore') { S.recs = undefined; render(); }
  // Kulübe katılma istekleri
  if (a === 'jask') { const c = Array.isArray(S.clubsFound) && S.clubsFound.find(x => x.id === el.dataset.id); if (c) requestJoin(S, c).then(() => toast(TJ.reqSent)).catch(fail); }
  if (a === 'jcancel') { const r = (S.myReqs || []).find(x => x.clubId === el.dataset.id); if (r) dropClubReq(r).catch(fail); }
  if (a === 'japprove') { const r = (S.clubReqs || []).find(x => x.id === el.dataset.id); if (r) approveRequest(r).then(() => toast(TJ.approved)).catch(fail); }
  if (a === 'jdecline') { const r = (S.clubReqs || []).find(x => x.id === el.dataset.id); if (r) dropClubReq(r).catch(fail); }
  // Okurlar ve arkadaşlık
  if (a === 'extab') { S.exTab = el.dataset.v; render(); }
  if (a === 'fadd') {
    const id = el.dataset.id, p = (Array.isArray(S.people) && S.people.find(x => x.uid === id)) || (S.reader && S.reader.uid === id ? S.reader : { uid: id });
    sendRequest(S, p).then(() => toast(TF.reqSent)).catch(fail);
  }
  if (a === 'fcancel') { const r = (S.reqOut || []).find(x => x.to === el.dataset.id); if (r) dropRequest(r).catch(fail); }
  if (a === 'faccept') { const r = (S.reqIn || []).find(x => x.from === el.dataset.id); if (r) accept(S, r).then(() => toast(TF.nowFriends)).catch(fail); }
  if (a === 'fdecline') { const r = (S.reqIn || []).find(x => x.from === el.dataset.id); if (r) dropRequest(r).catch(fail); }
  if (a === 'funfriend') {
    if (S.armed !== 'uf_' + el.dataset.id) { S.armed = 'uf_' + el.dataset.id; render(); return; }
    S.armed = false;
    unfriend(S, el.dataset.id).then(() => toast(TF.removed)).catch(fail);
  }
  if (a === 'findme') saveProfile(uid, { findable: S.profile.findable === false }).catch(fail);
  if (a === 'bpmode') { S.bpMode = !S.bpMode; const w = el.closest('.bp-timer'); if (w) w.classList.toggle('open', S.bpMode); el.setAttribute('aria-expanded', String(S.bpMode)); }
  if (a === 'bpjump') { const t = document.getElementById(el.dataset.v); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  if (a === 'bmenu') { S.menuFor = S.menuFor === el.dataset.id ? null : el.dataset.id; S.armed = false; render(); }
  // Düzenle: kitap sayfasındaysan form hemen açılır; başka yerdeysen önce kitabın sayfasına gidilir
  if (a === 'bedit') {
    const id = el.dataset.id;
    S.covers = null; S.menuFor = null;
    if (S.view === 'kitap' && S.bookId === id) { S.editing = true; render(); scrollTo({ top: 0, behavior: 'smooth' }); }
    else { S.lastBook = id; S.editing = true; location.hash = '#kitap/' + encodeURIComponent(id); }
  }
  if (a === 'bnoedit') { S.editing = false; S.covers = null; render(); }
  // Otomatik gelen kapak yanlışsa aynı kitabın başka baskılarının kapaklarından biri seçilir
  if (a === 'findcovers') {
    const b = shelfBook(S.bookId);
    S.covers = 'loading'; render();
    coverChoices(b).then(l => { S.covers = l; }).catch(() => { S.covers = []; }).then(() => render());
  }
  if (a === 'pickcover') { const f = $('#edit-form'); if (f) f.cover.value = el.dataset.u; document.querySelectorAll('.covs button').forEach(x => x.classList.toggle('on', x === el)); }
  if (a === 'bdel') {
    if (S.armed !== el.dataset.id) { S.armed = el.dataset.id; render(); return; }
    S.armed = false; S.menuFor = null;
    removeShelf(uid, el.dataset.id).then(() => toast(TN.deleted)).catch(fail);
  }
  if (a === 'rowscroll') { const tr = el.closest('.srow').querySelector('.sr-track'); tr.scrollBy({ left: Number(el.dataset.v) * tr.clientWidth * 0.8, behavior: 'smooth' }); }
  if (a === 'libtab') { S.libTab = el.dataset.v; S.rafSec = 'hepsi'; render(); playPanel(); }
  if (a === 'rafsec') { const v = el.dataset.v; if (v === 'odunc' || v === 'istek') S.libTab = v; else { S.libTab = 'evde'; S.rafSec = v; } render(); playPanel(); }
  if (a === 'fav') { const b = shelfBook(S.bookId); updateShelf(uid, b.id, { fav: !b.fav }).catch(fail); }
  if (a === 'wish') { const b = shelfBook(S.bookId); updateShelf(uid, b.id, { wish: !b.wish }).catch(fail); }
  if (a === 'lendback') updateShelf(uid, S.bookId, { lentTo: '', lentAt: '' }).catch(fail);
  if (a === 'scan') scanBarcode().then(code => { if (code === null) toast(TN.scanNo); else if (code) runSearch(code); }).catch(fail);
  if (a === 'install' && S.installEvt) S.installEvt.prompt().finally(() => { S.installEvt = null; render(); });
  if (a === 'importclub') importClubBooks().then(() => toast(TN.imported)).catch(fail);
  if (a === 'quick') { S.quick = !S.quick; render(); }
  if (a === 'wdedit') { S.wdEdit = !S.wdEdit; render(); }
  if (a === 'ygedit') { S.ygEdit = !S.ygEdit; render(); }
  if (a === 'wdays') { S.wdEdit = false; S.profile.weekDays = Number(el.dataset.v); render(); saveProfile(uid, { weekDays: S.profile.weekDays }).catch(fail); }
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
  if (a === 'tpause') togglePause();
  if (a === 'rnote') { const on = document.body.classList.toggle('note-open'); el.setAttribute('aria-expanded', String(on)); if (on) { const n = $('#room-note'); if (n) n.focus(); } }
  if (a === 'recapshare') shareRecap(S).catch(fail);
  if (a === 'msave') {
    let v = $('#music-url').value.trim();
    if (v && !/^https?:/.test(v)) v = 'https://' + v;
    saveProfile(uid, { music: v }).then(() => { clearNow(); toast(TK.saved); render(); }).catch(fail);
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
// Son sayfaya gelince kitap biter: rafta "okudum" olur ve bitirme anı açılır
function finishBook(b) {
  if (!b) return;
  S.finish = b.id;
  updateShelf(S.user.uid, b.id, { status: 'okudum', finishedAt: new Date().toISOString(), ...(b.pages ? { page: b.pages } : {}) }).catch(fail);
  logActivity(S, 'finished', b).catch(() => {});
  render();
}
const reachedEnd = (b, page) => b && b.pages && page >= b.pages && b.status !== 'okudum';
// Sayfa eklenince raftaki kaldığın sayfa da ileri gider
const bumpPage = (bookId, pages) => {
  const b = shelfBook(bookId);
  if (!b || !pages) return;
  if (reachedEnd(b, (b.page || 0) + pages)) finishBook(b);
  else updateShelf(S.user.uid, bookId, { page: (b.page || 0) + pages }).catch(fail);
};
// Bitir: saat durur ve kâğıt renginde bir kart "Kaçıncı sayfadasın?" diye sorar. Kaydedince oturum yazılır,
// kaldığın sayfa güncellenir, odada yazılan kenar notu kitabın notlarına eklenir. "Odaya dön" hiçbir şey yazmaz
function finishSession() {
  if ($('.rsheet-wrap')) return;
  const r = holdTimer();
  if (!r) return;
  if (r.seconds < 60 && !r.note.trim()) { stopTimer(); if (r.seconds >= 5) addSession(S.user.uid, { bookId: r.bookId, title: r.title, seconds: r.seconds, at: new Date().toISOString() }).catch(fail); return; }
  const b = shelfBook(r.bookId) || { title: r.title }, total = b.pages || 0, start = r.startPage || b.page || 0;
  const el = document.createElement('div');
  el.className = 'rsheet-wrap';
  el.style.setProperty('--rc', colorOf(b));
  el.innerHTML = `<form class="rsheet" role="dialog" aria-modal="true" aria-labelledby="rs-h">
    <div class="rs-head">${b.cover ? `<img src="${esc(b.cover)}" alt="">` : ''}<div><span class="rs-cap">${TK.done}</span><h2 id="rs-h">${TK.whichPage}</h2></div></div>
    <div class="rs-sum"><div><span class="rs-cap">${TK.dur}</span><b>${Math.max(1, Math.round(r.seconds / 60))} dk</b></div>${start ? `<div><span class="rs-cap">${TK.startedAt}</span><b>s. ${start}</b></div>` : ''}</div>
    <div class="rs-page"><input name="page" type="number" min="0" max="${total || 20000}" inputmode="numeric" placeholder="${start || ''}" aria-label="${TK.whichPage.replace(/<[^>]+>/g, '')}">${total ? `<span>/ ${total} ${TK.ofPages}</span>` : ''}</div>
    <div class="rs-quick">${[10, 20, 30].map(n => `<button type="button" data-q="${n}">+${n}</button>`).join('')}${total ? `<button type="button" data-q="end">${TK.finishedIt}</button>` : ''}</div>
    <label class="rs-note">${TK.noteTitle}<input name="note" maxlength="600" value="${esc(r.note)}"></label>
    <div class="rs-acts"><button type="button" class="q" data-nopage>${TK.saveNoPage}</button><span><button type="button" class="pl" data-back>${TK.enter2}</button><button type="submit" class="pl on">${T.save}</button></span></div>
  </form>`;
  const f = el.querySelector('form');
  const close = () => { el.remove(); };
  el.querySelectorAll('[data-q]').forEach(q => q.addEventListener('click', () => { f.page.value = q.dataset.q === 'end' ? total : Math.min(total || 20000, start + Number(q.dataset.q)); }));
  el.querySelector('[data-back]').addEventListener('click', () => { close(); releaseTimer(r.was); });
  const commit = withPage => {
    const page = withPage ? Math.round(Number(f.page.value)) || 0 : 0;
    if (withPage && page && page < start) return toast(TK.pageLow);
    const fin = stopTimer() || r, note = f.note.value.trim(), uid = S.user.uid, diff = page ? page - start : 0;
    addSession(uid, { bookId: r.bookId, title: r.title, seconds: r.seconds, at: new Date().toISOString(), ...(diff > 0 ? { pages: diff } : {}) }).catch(fail);
    if (note && shelfBook(r.bookId)) add(`users/${uid}/notes`, { bookId: r.bookId, text: note, ...(page ? { page } : {}), at: new Date().toISOString() }).catch(fail);
    if (page && shelfBook(r.bookId)) { if (reachedEnd(shelfBook(r.bookId), page)) finishBook(shelfBook(r.bookId)); else updateShelf(uid, r.bookId, { page }).catch(fail); }
    close();
    toast(TK.saved);
    return fin;
  };
  el.querySelector('[data-nopage]').addEventListener('click', () => commit(false));
  f.addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); commit(true); });
  el.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); releaseTimer(r.was); } });
  document.body.appendChild(el);
  f.page.focus();
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
      const email = f.email.value.trim();
      if (!email) return toast(T.authErrors['auth/missing-email']);
      if (!f.pass.value) return toast(T.authErrors['auth/missing-password']);
      if (S.mode === 'signup') {
        if (!f.name.value.trim()) return toast(T.needName);
        if (f.pass.value.length < 6) return toast(T.authErrors['auth/weak-password']);
        if (f.pass.value !== f.pass2.value) return toast(T.pwMismatch);
      }
      await remember(f.remember.checked);
      if (S.mode === 'signup') { await signupEmail(f.name.value.trim(), email, f.pass.value); toast(T.verifySent); }
      else await loginEmail(email, f.pass.value);
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
    // Üstteki arama: kitap ve okur birlikte aranır; kitap çıkmazsa okurlar gösterilir
    if (id === 'top-search') {
      const q = f.q.value.trim(); if (!q) return;
      S.exTab = q.startsWith('@') ? 'okur' : 'kitap'; S.peopleQ = q.replace(/^@/, ''); S.people = 'loading';
      searchPeople(S.peopleQ, S.user.uid).then(l => { S.people = l; if (S.exTab === 'kitap' && Array.isArray(S.results) && !S.results.length && l.length) S.exTab = 'okur'; if (S.view === 'ara') render(); }).catch(() => { S.people = null; });
      if (S.exTab === 'kitap') await runSearch(q); else location.hash = '#ara';
      const box = $('#search-form'); if (box) box.q.value = q;
    }
    if (id === 'club-search') { S.clubsQ = f.q.value.trim(); loadClubs(true); render(); }
    if (id === 'club-public' && S.club && S.club.doc) {
      if (f.pub.checked) await publishClub(S, S.club, f.desc.value.trim()); else await unpublishClub(S.club);
      toast(TJ.saved);
    }
    if (id === 'review-form') {
      const b = shelfBook(S.bookId); if (!b) return;
      const mine = S.bookRevs && Array.isArray(S.bookRevs.list) && S.bookRevs.list.find(r => r.uid === S.user.uid);
      const rating = S.rvRating !== undefined ? S.rvRating : (mine ? mine.rating : b.rating || 0), text = f.text.value.trim();
      if (!rating && !text) return toast(TRV.needText);
      await saveReview(S, b, { rating, text, spoiler: f.spoiler.checked });
      if (rating && rating !== b.rating) updateShelf(S.user.uid, b.id, { rating }).catch(() => {});
      toast(TRV.saved); S.feed = undefined; loadReviews(b, true);
    }
    if (id === 'about-form') {
      const by = Math.round(Number(f.birthYear.value)) || 0;
      await saveProfile(S.user.uid, { city: f.city.value.trim().slice(0, 60), birthYear: by >= 1900 && by <= new Date().getFullYear() ? by : '', showCity: f.showCity.checked, showAge: f.showAge.checked });
      toast(TK.saved);
    }
    if (id === 'people-form') {
      S.peopleQ = f.q.value.trim(); S.people = 'loading'; render();
      try { S.people = await searchPeople(S.peopleQ, S.user.uid); } catch (err) { S.people = null; render(); throw err; }
      render();
    }
    if (id === 'onb-invite') { S.onb = 0; location.hash = '#davet/' + encodeURIComponent(f.code.value.trim().split('/').pop()); }
    if (id === 'edit-form') {
      const cover = f.cover.value.trim(), b = shelfBook(S.bookId), data = { title: f.title.value.trim() || b.title, author: f.author.value.trim(), pages: Number(f.pages.value) || 0, source: f.source.value.trim(), ...(f.genre ? { genre: f.genre.value } : {}),
        ...Object.fromEntries(['publisher', 'year', 'translator', 'origTitle', 'isbn'].filter(k => f[k]).map(k => [k, f[k].value.trim()])) };
      if (cover || !(b.cover || '').startsWith('data:')) data.cover = cover;
      await updateShelf(S.user.uid, S.bookId, data);
      S.editing = false; S.covers = null;
      render();
      toast(TK.saved);
    }
    if (id === 'lend-form') await updateShelf(S.user.uid, S.bookId, { lentTo: f.who.value.trim(), lentAt: new Date().toISOString() });
    if (id === 'quote-form') { await add(`users/${S.user.uid}/quotes`, { text: f.text.value.trim(), book: f.book.value, ...(f.bookId && f.bookId.value ? { bookId: f.bookId.value } : {}), at: new Date().toISOString() }); f.text.value = ''; }
    if (id === 'mnote-form') {
      const b = shelfBook(S.bookId), text = f.text.value.trim(), page = Math.max(0, Math.round(Number(f.page.value)) || 0), at = new Date().toISOString();
      if (!b || !text) return;
      if (f.quote.checked) await add(`users/${S.user.uid}/quotes`, { text, book: b.title, bookId: b.id, ...(page ? { page } : {}), at });
      else await add(`users/${S.user.uid}/notes`, { bookId: b.id, text, ...(page ? { page } : {}), at });
      f.text.value = '';
      f.text.blur();
      toast(TN.noteSaved);
    }
    if (id === 'finish-form') { await updateShelf(S.user.uid, S.finish, { thought: f.thought.value.trim() }); f.thought.blur(); toast(TK.saved); }
    if (id === 'ics-form') reminderICS(f.t.value);
    if (id === 'del-form') {
      if (f.u.value.trim().toLocaleLowerCase('tr') !== (S.profile.username || '').toLocaleLowerCase('tr')) return toast(TN.delWrong);
      if (!freshLogin(S.user)) { render(); return; }
      S.deleting = true; render();
      await deleteAccount(S.user, S.profile).finally(() => { S.deleting = false; });
      S.delAsk = false;
      toast(TN.delDone);
    }
    if (id === 'quick-form') {
      const b = S.shelf.find(x => x.status === 'okuyorum'), page = Math.max(0, Number(f.page.value) || 0), diff = page - (b.page || 0);
      if (reachedEnd(b, page)) finishBook(b);
      else await updateShelf(S.user.uid, b.id, { page });
      if (diff > 0) await addSession(S.user.uid, { bookId: b.id, title: b.title, seconds: 0, pages: diff, at: new Date().toISOString(), manual: true });
      S.quick = false;
  S.fresh = true;
  S.menuFor = null;
  if (S.keepChapter) S.keepChapter = false; else S.chapter = 0;
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
    if (id === 'yg-form') { S.ygEdit = false; await saveProfile(S.user.uid, { yearGoal: Math.min(500, Math.max(0, Math.round(Number(f.goal.value)) || 0)) }); toast(TK.saved); }
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
      const page = Number(f.page.value) || 0, pages = Number(f.pages.value) || 0, b = shelfBook(S.bookId);
      await updateShelf(S.user.uid, S.bookId, { page, pages });
      if (reachedEnd({ ...b, pages }, page)) finishBook({ ...b, pages });
      else toast(T.sent);
    }
  } catch (err) {
    if (err.message === 'taken') toast(T.taken);
    else fail(err);
  }
});

setOnFinish(() => finishSession());
setHooks({
  toast,
  saveBook: (id, data) => updateShelf(S.user.uid, id, data).then(() => true, e => { fail(e); return false; }),
  // Odada yazılan not ya da alıntı kitabın kenar notlarına / alıntılarına düşer
  saveNote: ({ bookId, title, text, page, quote }) => {
    const at = new Date().toISOString(), uid = S.user.uid;
    const p = quote ? add(`users/${uid}/quotes`, { text, book: title || '', bookId, ...(page ? { page } : {}), at }) : add(`users/${uid}/notes`, { bookId, text, ...(page ? { page } : {}), at });
    return p.then(() => { toast(quote ? TK.quoteSaved : TK.noteSaved); return true; }, e => { fail(e); return false; });
  },
});
// Kapağı ya da sayfa sayısı eksik kitaplar arka planda sırayla tamamlanır; her kitap bir kez denenir (kuytu-doldu2)
const tried = new Set((() => { try { return JSON.parse(localStorage.getItem('kuytu-doldu2')) || []; } catch (e) { return []; } })());
const triedKunye = new Set((() => { try { return JSON.parse(localStorage.getItem('kuytu-kunye1')) || []; } catch (e) { return []; } })());
const triedGenre = new Set((() => { try { return JSON.parse(localStorage.getItem('kuytu-tur1')) || []; } catch (e) { return []; } })());
let filling = false;
async function fillMissing(uid, list) {
  if (filling) return;
  filling = true;
  for (const b of list.filter(x => (!x.cover || !x.pages) && x.title && !tried.has(x.id)).slice(0, 8)) {
    tried.add(b.id);
    try { localStorage.setItem('kuytu-doldu2', JSON.stringify([...tried])); } catch (e) {}
    try { const data = await fillInfo(b); if (Object.keys(data).length) await updateShelf(uid, b.id, data); } catch (e) {}
  }
  // Künyesi eksik kitaplar (yayınevi, yıl, ISBN, özet) Türkçe baskıdan tamamlanır; her kitap bir kez denenir (kuytu-kunye1)
  for (const b of list.filter(x => x.title && (!x.publisher || !x.year || !x.isbn) && !triedKunye.has(x.id)).slice(0, 6)) {
    triedKunye.add(b.id);
    try { localStorage.setItem('kuytu-kunye1', JSON.stringify([...triedKunye])); } catch (e) {}
    try { const k = await fetchKunye(b); if (Object.keys(k).length) await updateShelf(uid, b.id, k); } catch (e) {}
  }
  // Türü olmayan kitapların türü kitap kaynaklarından bulunur; her kitap bir kez denenir (kuytu-tur1)
  for (const b of list.filter(x => !x.genre && x.title && !triedGenre.has(x.id)).slice(0, 8)) {
    triedGenre.add(b.id);
    try { localStorage.setItem('kuytu-tur1', JSON.stringify([...triedGenre])); } catch (e) {}
    try { const g = await fetchGenre(b); if (g.genre) await updateShelf(uid, b.id, g); } catch (e) {}
  }
  filling = false;
}

// Kaynaklarda kapağı olmayan kitap için elindeki kitabın fotoğrafı: 900 piksel boya küçültülür, raf belgesine yazılır
document.addEventListener('change', e => {
  if (e.target.id !== 'cover-photo' || !e.target.files[0]) return;
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(img.src);
    const k = Math.min(1, 900 / img.height), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    updateShelf(S.user.uid, S.bookId, { cover: c.toDataURL('image/jpeg', 0.82) }).then(() => { S.editing = false; S.covers = null; toast(TN.coverSaved); render(); }).catch(fail);
  };
  img.onerror = () => fail(new Error('image'));
  img.src = URL.createObjectURL(e.target.files[0]);
});

initClubs({ S, toast, fail, render: () => render(), coverHTML });
route();
if (configured) {
  let stops = [];
  onUser(user => {
    stops.forEach(s => s());
    stops = [];
    S.authReady = true;
    S.user = user;
    S.profile = undefined;
    S.shelf = [];
    S.shelfReady = false;
    S.sessions = [];
    S.notes = [];
    S.finish = null;
    S.delAsk = false;
    S.reqIn = []; S.reqOut = []; S.friends = []; S.people = null; S.peopleQ = ''; S.reader = null;
    S.friendsPrimed = false; S.bellOpen = false;
    S.acts = undefined; S.myReqs = []; S.clubReqs = []; S.clubsFound = undefined; S.clubsQ = '';
    S.feed = undefined; S.feedErr = false; S.friendCards = null; S.friendSig = undefined; S.bookRevs = null;
    render();
    if (user) {
      // Okuma köşesinde sayfa yeniden çizilmez; müzik kesilmesin diye yalnızca zamanlayıcı yenilenir
      // Odadayken sayfa yeniden çizilmez, müzik kesilmesin diye yalnızca zamanlayıcı yenilenir
      const redraw = () => { setCurrent(S); if (S.view === 'kitap' && $('#timer-card') && timerOn() && document.body.classList.contains('in-room')) refreshTimer(); else render(); };
      stops.push(watchCol(`users/${user.uid}/quotes`, l => { S.quotes = l.sort((a, b) => (b.at || '').localeCompare(a.at || '')); redraw(); }, () => {}));
      stops.push(watchCol(`users/${user.uid}/notes`, l => { S.notes = l; redraw(); }, () => {}));
      stops.push(watchCol('users/' + user.uid + '/clubs', l => { const first = !S.myClubs; S.myClubs = l; shareCard(); if (first) route(); else if (S.view === 'kulup' || S.view === 'davet') render(); }));
      stops.push(watchSessions(user.uid, list => { S.sessions = list; redraw(); }));
      stops.push(watchProfile(user.uid, p => { const first = S.profile === undefined; S.profile = p; shareCard(); sharePublic(S); if (first) { route(); } else redraw(); }));
      // Arkadaşlık istekleri ve arkadaşlar canlı izlenir; Keşfet'te sayı rozeti olarak görünür
      // Kulüp istekleri: onaylanan isteğimle kulübe kendim katılırım; kurucusu olduğum kulüplere gelenler Üyeler sayfasında
      stops.push(watchRequests(user.uid, (k, v) => {
        S[k] = v;
        if (k === 'clubReqs' && S.friendsPrimed) announce(S, toast);
        if (k === 'myReqs') v.filter(r => r.approved && !S.joining).forEach(r => { S.joining = true; joinApproved(S, r).then(() => toast(TJ.joined + r.clubName)).catch(fail).finally(() => { S.joining = false; }); });
        if (S.profile && (S.view === 'ara' || S.view === 'k')) redraw();
      }));
      stops.push(watchPeople(user.uid, (k, v) => { S[k] = v;
        // Var olan arkadaşlar ilk açılışta "yeni" sayılmaz; sonra gelen istek ve kabuller kısa uyarıyla duyurulur
        if (k === 'friends' && !S.friendsPrimed) { S.friendsPrimed = true; primeFriends(S); }
        if (S.friendsPrimed) announce(S, toast); if (S.profile && !(S.view === 'ara' && document.activeElement && document.activeElement.closest('#people-form'))) redraw(); }));
      stops.push(watchShelf(user.uid, list => {
        S.shelf = list;
        S.shelfReady = true;
        if (S.pendingRead) { S.pendingRead = false; const rb = readingBook(S); location.replace(rb ? '#kitap/' + encodeURIComponent(rb.id) : '#raf'); }
        shareCard();
        sharePublic(S);
        fillMissing(user.uid, list);
        // Aramada yazılan metin kaybolmasın: arama sayfasında yalnızca sonuçlar yenilenir
        if ((S.view === 'ara' || S.onb) && $('#results')) $('#results').innerHTML = resultsHTML();
        else redraw();
      }));
    }
  });
}
