// Kulüp ekranları ve olayları
import { $, esc } from './util.js';
import { TC as T } from './strings.js';
import { searchBooks } from './books.js';
import { addToShelf } from './shelf.js';
import { book3d, setAmbient } from './parts.js';
import { watchCol, watchDoc, add, patch, remove, createClub, makeInvite, getInvite, joinClub, leaveClub } from './clubs.js';

const GENERIC_Q = ['Kitabın sonu sana tatmin edici geldi mi? Seni şaşırttı mı?', 'En çok hangi karakterle bağ kurdun, neden?', 'Karakterlerin kararları sana inandırıcı geldi mi?', 'Ana karakter kitabın başından sonuna nasıl değişti?', 'Olayların altında bu kitap sence aslında ne anlatıyor?', 'Hikâye bittikten sonra karakterlere ne olduğunu düşünüyorsun?', 'Sesli okumak istediğin bir bölüm var mı? Neden o bölüm?', 'Bu kitabı kime önerirdin?'];
const CLUB_STATUS = [['okunuyor', 'Okunuyor'], ['sirada', 'Sırada'], ['tamamlandi', 'Bitti'], ['birakildi', 'Bırakıldı']];
let S, toast, fail, render, coverHTML;
export function initClubs(ctx) { ({ S, toast, fail, render, coverHTML } = ctx); }
// Kişinin kitaplığında henüz olmayan kulüp kitapları; yalnızca kopyalanır, kulüp verisi değişmez
// Aynı kitap farklı yazılmış olabilir (Narsis, Narziss); yazar ve başlığın başı tutuyorsa yeniden eklenmez
const sameBook = (x, b) => x.id === b.id || x.title === b.title || (!!b.author && x.author === b.author && (x.title || '').slice(0, 3) === (b.title || '').slice(0, 3));
const missing = () => (S.club ? S.club.books.filter(b => b.status !== 'birakildi' && !S.shelf.some(x => sameBook(x, b))) : []);
export const clubMissing = () => missing().length;
export const importClubBooks = () => Promise.all(missing().map(b => addToShelf(S.user.uid, { id: b.id, title: b.title, author: b.author || '', cover: b.cover && b.cover.length < 2000 ? b.cover : '', pages: b.pages || 0, year: b.year || '', publisher: b.publisher || '' }, { okunuyor: 'okuyorum', tamamlandi: 'okudum' }[b.status] || 'istiyorum')));
// Bugün ekranı için etkin kulübün özeti
export function clubNow() {
  const c = S.club;
  if (!c || !c.doc) return null;
  const b = c.books.find(x => x.status === 'okunuyor') || c.books.find(x => x.status === 'sirada') || null;
  return { id: c.id, name: c.doc.name, book: b, rs: b ? readers().map(r => ({ name: r.name, pct: pctOf(b, r) })) : [] };
}

const C = () => S.club;
const me = () => (C().members || []).find(m => m.uid === S.user.uid);
const canWrite = () => !!me() && me().role !== 'izleyici';
const isOwner = () => C().doc && C().doc.ownerId === S.user.uid;
const dateTR = d => (d ? new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }) : '');
// Başka üye bir şey ekleyince, yazılan form silinmesin diye yazma sırasında sayfa yenilenmez
const soft = () => { const a = document.activeElement; if (a && a.matches('input,textarea,select') && $('#view').contains(a)) return; render(); };

let stops = [], noteStop = null, photoStop = null;
export function closeClub() { stops.forEach(s => s()); stops = []; if (noteStop) { noteStop(); noteStop = null; } if (photoStop) { photoStop(); photoStop = null; } S.club = null; }
export function openClub(id) {
  if (S.club && S.club.id === id) return;
  closeClub();
  S.club = { id, doc: undefined, members: [], books: [], sugg: [], notes: [], noteBook: null, results: null };
  const denied = () => { if (S.club && S.club.id === id) { S.club.doc = null; render(); } };
  stops.push(watchDoc('clubs/' + id, d => { if (S.club) { S.club.doc = d; soft(); } }, denied));
  stops.push(watchCol(`clubs/${id}/members`, l => { if (S.club) { S.club.members = l; soft(); } }, () => {}));
  stops.push(watchCol(`clubs/${id}/books`, l => { if (S.club) { S.club.books = l; soft(); } }, () => {}));
  stops.push(watchCol(`clubs/${id}/suggestions`, l => { if (S.club) { S.club.sugg = l; soft(); } }, () => {}));
}
export function openNotes(bid) {
  if (C().noteBook === bid) return;
  if (noteStop) noteStop();
  if (photoStop) { photoStop(); photoStop = null; }
  C().noteBook = bid;
  C().notes = [];
  C().photos = [];
  photoStop = watchCol(`clubs/${C().id}/books/${bid}/photos`, l => { if (S.club) { S.club.photos = l.sort((a, b) => (b.at || '').localeCompare(a.at || '')); soft(); } }, () => {});
  noteStop = watchCol(`clubs/${C().id}/books/${bid}/notes`, l => { if (S.club) { S.club.notes = l.sort((a, b) => (a.at || '').localeCompare(b.at || '')); soft(); } }, () => {});
}
export async function loadInvite(code) {
  S.invite = { code, loading: true };
  render();
  try { S.invite = { code, data: await getInvite(code) }; } catch (e) { S.invite = { code, data: null }; }
  render();
}

export function viewClubs() {
  const list = S.myClubs || [];
  return `<div class="pagehead"><div><p class="label">${T.clubs}</p><h2>${T.myClubs}</h2></div></div>
    ${list.length ? `<ul class="clublist">${list.map(c => `<li><a href="#k/${encodeURIComponent(c.id)}"><b>${esc(c.name)}</b><span>${esc(c.role === 'kurucu' ? T.owner : T.member)}</span></a></li>`).join('')}</ul>` : `<p class="empty-note">${T.noClubs}</p>`}
    <form class="surface club-new" id="club-form"><h3>${T.newClub}</h3><label>${T.clubName}<input name="name" required maxlength="60"></label><button class="btn" type="submit">${T.create}</button></form>`;
}
export function viewInvite() {
  const i = S.invite || {};
  if (i.loading) return `<p class="muted">${T.loading}</p>`;
  if (!i.data) return `<section class="surface"><h2>${T.badInvite}</h2><a href="#kulup">${T.backClubs}</a></section>`;
  const already = (S.myClubs || []).some(c => c.id === i.data.clubId);
  return `<section class="surface invite"><p class="label">${T.invited}</p><h2>${esc(i.data.clubName)}</h2>
    ${already ? `<a class="btn" href="#k/${encodeURIComponent(i.data.clubId)}">${T.goClub}</a>` : `<button class="btn" type="button" data-act="cjoin">${T.join}</button>`}</section>`;
}
const bookLink = (b, tab) => `#k/${encodeURIComponent(C().id)}/b/${encodeURIComponent(b.id)}`;
// Çok kelimeli başlıklarda son kelime italik ve vurgu renginde
const emLast = s => { const w = esc(s || '').split(' '); return w.length > 1 ? w.slice(0, -1).join(' ') + ' <em>' + w[w.length - 1] + '</em>' : w[0]; };
const monthTR = m => { if (!m) return ''; const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }); };
const lslug = n => n.toLocaleLowerCase('tr').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u');
// Okuyucular: üyeler ve taşınan verideki henüz katılmamış kişiler
function readers() {
  const ms = C().members.slice().sort((a, b) => (a.joinedAt || '').localeCompare(b.joinedAt || '')).map(m => ({ name: m.name.split(' ')[0], key: m.uid }));
  const legacy = ((C().doc || {}).legacyMembers || []).filter(n => !ms.some(m => m.name === n)).map(n => ({ name: n, key: lslug(n) }));
  return ms.concat(legacy);
}
const color = i => `var(--m${(i % 3) + 1})`;
const ringAvatar = (r, pct, i) => `<span class="ravatar" style="--p:${pct};--c:${color(i)}" title="${esc(r.name)}: %${pct}"><span class="av">${esc(r.name.charAt(0).toLocaleUpperCase('tr'))}</span></span>`;
const pctOf = (b, r) => (b.progress || {})[r.key] || 0;
function bigRing(pct, label) {
  return `<div class="bigring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" class="br-track"/><circle cx="60" cy="60" r="50" class="br-fill" pathLength="100" style="stroke-dashoffset:${100 - pct}"/></svg><div class="br-t"><b><span data-count="${pct}">${pct}</span>%</b><span>${esc(label)}</span></div></div>`;
}
const avg = b => { const v = Object.values(b.ratings || {}); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : 0; };
const stars = n => (n ? `<span class="stars">${'★'.repeat(Math.round(n))}</span>` : '');
const bg = b => (b.cover ? `background-image:url('${esc(b.cover)}')` : 'background:var(--forest)');
const railItem = b => `<a class="rail-item tilt" href="${bookLink(b)}"><span class="rail-cover">${coverHTML(b)}</span><span class="t">${esc(b.title)}</span><span class="a">${esc(b.author || '—')}</span>${stars(avg(b))}</a>`;
function nextPicker() {
  const rs = readers();
  if (!rs.length) return { name: '', order: [] };
  const last = C().books.filter(b => b.pickedBy).sort((a, b) => (b.month || b.at || '').localeCompare(a.month || a.at || ''))[0];
  const i = last ? rs.findIndex(r => r.name === last.pickedBy.split(' ')[0]) : -1;
  return { name: rs[(i + 1) % rs.length].name, order: rs.map(r => r.name) };
}
const daysLeft = d => Math.round((new Date(d + 'T00:00:00') - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000);
const calendarLink = b => `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(C().doc.name + ': ' + b.title)}&dates=${b.meetingDate.replace(/-/g, '')}/${b.meetingDate.replace(/-/g, '')}&location=${encodeURIComponent(b.meetingPlace || '')}`;
function rsvpBlock(b) {
  const mine = (b.rsvp || {})[S.user.uid];
  const yes = readers().filter(r => (b.rsvp || {})[r.key] === 'y');
  return `<div class="seg"><button type="button" class="${mine === 'y' ? 'on' : ''}" data-act="crsvp" data-v="y" data-id="${esc(b.id)}">${T.yes}</button><button type="button" class="${mine === 'n' ? 'on' : ''}" data-act="crsvp" data-v="n" data-id="${esc(b.id)}">${T.no}</button></div><p class="muted small">${T.coming}: ${yes.map(r => esc(r.name)).join(', ') || '–'}</p>`;
}
function viewHome() {
  const c = C(), b = c.books.find(x => x.status === 'okunuyor') || c.books.find(x => x.status === 'sirada');
  if (!b) return `<div class="pagehead"><div><p class="label">${esc(c.doc.name)}</p><h1>${T.tabNow}</h1></div></div><p class="empty-note">${T.noCurrent}</p>`;
  openNotes(b.id);
  setAmbient(b.title);
  const rs = readers(), id = encodeURIComponent(b.id);
  const notes = c.notes.filter(n => !n.spoiler && n.kind !== 'info' && !n.auto), quotes = c.notes.filter(n => n.kind === 'quote' && !n.spoiler);
  const left = b.meetingDate ? daysLeft(b.meetingDate) : null, avgP = rs.length ? Math.round(rs.reduce((a, r) => a + pctOf(b, r), 0) / rs.length) : 0;
  const np = nextPicker(), others = c.books.filter(x => x.id !== b.id);
  const top = c.sugg.slice().sort((x, y) => Object.keys(y.votes || {}).length - Object.keys(x.votes || {}).length)[0];
  const meta = [b.pickedBy ? b.pickedBy + ' ' + T.picked : '', b.year, b.pages ? b.pages + ' sayfa' : '', b.genre].filter(Boolean).map(esc).join(' · ');
  return `<section class="stage">
      <div class="stage-bg" style="${bg(b)}"></div>
      <div class="stage-cover">${book3d(b, 170)}</div>
      <div class="stage-text"><p class="eyebrow">${esc(monthTR(b.month) || T.tabNow)} · ${T.nowReading}</p>
        <h1 class="display">${emLast(b.title)}</h1><p class="stage-author">${esc(b.author || '')}</p><p class="stage-meta">${meta}</p>
        <div class="stage-readers">${rs.map((r, i) => `<span class="sr-one">${ringAvatar(r, pctOf(b, r), i)}<span><b>${esc(r.name)}</b><small>%${pctOf(b, r)}</small></span></span>`).join('')}</div>
        <div class="actions"><a class="btn light" href="${bookLink(b)}">${T.openBook}</a><a class="btn glass" href="${bookLink(b)}" data-act="ckind" data-v="question">${T.questions}</a></div></div>
    </section>
    <div class="bento">
      <section class="box box-meet"><p class="eyebrow-dark">${T.meeting}</p>
        ${b.meetingDate ? `<p class="mega">${left > 0 ? `<span data-count="${left}">${left}</span><small>${T.days}</small>` : left === 0 ? T.meetToday : T.meetDone}</p><p class="line">${esc(dateTR(b.meetingDate))}${b.meetingTime ? ' · ' + esc(b.meetingTime) : ''}${b.meetingPlace ? ' · ' + esc(b.meetingPlace) : ''}</p>${left >= 0 ? rsvpBlock(b) : ''}<div class="actions"><a class="btn ghost" href="${esc(calendarLink(b))}" target="_blank" rel="noopener">${T.toCal}</a></div>` : `<p class="mega soft">${T.noDate}</p><p class="line">${T.noMeeting}</p><div class="actions"><a class="btn ghost" href="${bookLink(b)}">${T.addDate}</a></div>`}
      </section>
      <section class="box"><p class="eyebrow-dark">${T.clubProgress}</p>${bigRing(avgP, T.average)}
        <ul class="hbars">${rs.map(r => `<li><span>${esc(r.name)}</span><span class="bar"><i style="width:${pctOf(b, r)}%"></i></span><span class="v">%${pctOf(b, r)}</span></li>`).join('')}</ul></section>
      <section class="box"><p class="eyebrow-dark">${T.nextPicker}</p><p class="next-name">${esc(np.name)}</p><p class="muted small">${T.willPick}</p>
        <p class="order">${np.order.map(n => `<span class="${n === np.name ? 'on' : ''}">${esc(n)}</span>`).join('<span>→</span>')}</p>
        ${top ? `<a class="toppick" href="#k/${encodeURIComponent(c.id)}/oneriler"><span class="label">${T.topSugg}</span><b>${esc(top.title)}</b><span class="muted small">${esc(top.author || '')}</span></a>` : ''}</section>
    </div>
    ${quotes.length ? `<section class="marquee" aria-label="${T.quotes}"><div class="mq-track">${quotes.concat(quotes, quotes, quotes).map(n => `<figure><blockquote>“${esc(n.text)}”</blockquote><figcaption>${esc(n.byName || '')}</figcaption></figure>`).join('')}</div></section>` : ''}
    ${others.length ? `<section class="rail-section"><div class="rail-head"><h2 class="sec-title">${T.onShelf}</h2><a class="linkbtn" href="#k/${encodeURIComponent(c.id)}/kitaplar">${T.allBooks} →</a></div><div class="rail">${others.map(railItem).join('')}</div></section>` : ''}
    <section class="rail-section"><h2 class="sec-title">${T.recent}</h2>${notes.length ? `<ol class="timeline">${notes.slice(-5).reverse().map(n => `<li><b>${esc(n.byName || '')}</b><p>${esc(n.text)}</p></li>`).join('')}</ol>` : `<p class="muted">${T.noNotes}</p>`}</section>`;
}
function spotlight(b) {
  const rs = readers(), left = b.meetingDate ? daysLeft(b.meetingDate) : null;
  return `<section class="spotlight"><div class="stage-bg" style="${bg(b)}"></div><div class="stage-cover tilt">${coverHTML(b)}</div>
    <div class="spot-body"><p class="eyebrow">${T.nowReading}${b.month ? ' · ' + esc(monthTR(b.month)) : ''}${left !== null && left >= 0 ? ' · ' + left + ' ' + T.days : ''}</p><h2 class="spot-title">${emLast(b.title)}</h2><p class="stage-author">${esc(b.author || '')}</p>
    <ul class="spot-readers">${rs.map((r, i) => `<li style="--c:${color(i)}"><span>${esc(r.name)}</span><span class="sp-bar"><i style="width:${pctOf(b, r)}%"></i></span><b>%${pctOf(b, r)}</b></li>`).join('')}</ul>
    <div class="actions"><a class="btn light" href="${bookLink(b)}">${T.openBook}</a></div></div></section>`;
}
const polaroid = b => { const h = [...String(b.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); return `<a class="polaroid" href="${bookLink(b)}" style="--rot:${(h % 9) - 4}deg"><span class="pol-img">${coverHTML(b)}</span><span class="pol-cap">${esc(b.title)}</span>${stars(avg(b))}</a>`; };
const searchBox = to => (canWrite() ? `<form class="searchbar" id="cb-search" data-to="${to}"><input name="q" type="search" required placeholder="${T.searchHint}" aria-label="${T.searchHint}"><button class="btn" type="submit">${T.search}</button></form>
  ${C().results === 'fail' ? `<p class="muted">${T.searchFail}</p>` : C().results ? `<ul class="results">${C().results.map((b, i) => `<li>${coverHTML(b)}<div><b>${esc(b.title)}</b><p class="muted small">${esc([b.author, b.year].filter(Boolean).join(' · '))}</p></div><button class="btn ghost" type="button" data-act="cadd" data-to="${to}" data-i="${i}">${T.add}</button></li>`).join('')}</ul>` : ''}` : '');
function viewLibrary() {
  const c = C(), done = c.books.filter(b => b.status === 'tamamlandi'), cur = c.books.find(b => b.status === 'okunuyor');
  const rated = c.books.filter(b => avg(b)), best = rated.slice().sort((a, b) => avg(b) - avg(a))[0];
  const score = rated.length ? (rated.reduce((a, b) => a + avg(b), 0) / rated.length).toFixed(1).replace('.', ',') : '–';
  const pagesRead = done.reduce((a, b) => a + (Number(b.pages) || 0), 0);
  const rail = (k, title, cls = '') => { const list = c.books.filter(b => b.status === k); return list.length ? `<section class="rail-section"><h2 class="sec-title">${title} <span class="count">${list.length}</span></h2><div class="rail ledge ${cls}">${list.map(railItem).join('')}</div></section>` : ''; };
  return `<div class="pagehead"><div><p class="label">${c.books.length} ${T.bookWord}</p><h1>${T.library}</h1></div><a class="btn ghost" href="#k/${encodeURIComponent(c.id)}/uyeler">${T.tabMembers}</a></div>
    <details class="more add-book"><summary class="btn">${T.addBook}</summary>${searchBox('books')}</details>
    <div class="numbers"><div><b data-count="${done.length}">${done.length}</b><span>${T.statDone}</span></div><div><b data-count="${pagesRead}">${pagesRead}</b><span>${T.statPages}</span></div><div><b>${score}</b><span>${T.avg}</span></div><div><b class="t">${esc(best ? best.title : '–')}</b><span>${T.favorite}</span></div></div>
    ${cur ? spotlight(cur) : ''}
    ${rail('sirada', T.waiting)}
    ${done.length ? `<section class="rail-section"><h2 class="sec-title">${T.readBooks} <span class="count">${done.length}</span></h2><div class="collage">${done.map(polaroid).join('')}</div></section>` : ''}
    ${rail('birakildi', T.dropped)}`;
}
function tabSugg() {
  const rows = C().sugg.slice().sort((a, b) => Object.keys(b.votes || {}).length - Object.keys(a.votes || {}).length), np = nextPicker();
  return `<div class="pagehead"><div><p class="label">${esc(np.name)} ${T.pickNext}</p><h1>${T.tabSugg}</h1></div></div>${searchBox('sugg')}<ul class="results">${rows.map(s => { const v = Object.keys(s.votes || {}).length, mine = (s.votes || {})[S.user.uid]; return `<li>${coverHTML(s)}<div><b>${esc(s.title)}</b><p class="muted small">${esc([s.author, s.byName].filter(Boolean).join(' · '))}</p></div>
    <div class="ractions">${canWrite() ? `<button class="btn ${mine ? '' : 'ghost'}" type="button" data-act="cvote" data-id="${esc(s.id)}">♥ ${v}</button><button class="btn ghost" type="button" data-act="cadopt" data-id="${esc(s.id)}">${T.adopt}</button>` : `<span class="muted">♥ ${v}</span>`}</div></li>`; }).join('') || `<li class="muted">${T.noSugg}</li>`}</ul>`;
}
function tabMembers() {
  const link = C().doc.inviteCode ? `${location.origin}${location.pathname}#davet/${C().doc.inviteCode}` : '';
  return `<div class="pagehead"><div><p class="label">${esc(C().doc.name)}</p><h1>${T.tabMembers}</h1></div></div>
    ${isOwner() ? `<section class="surface"><h3>${T.inviteTitle}</h3><p class="muted small">${T.inviteHint}</p>${link ? `<input id="inv-link" readonly value="${esc(link)}" aria-label="${T.inviteTitle}"><div class="ractions left"><button class="btn" type="button" data-act="ccopy">${T.copy}</button><button class="btn ghost" type="button" data-act="cinvite">${T.newLink}</button></div>` : `<button class="btn" type="button" data-act="cinvite">${T.makeLink}</button>`}</section>` : ''}
    <ul class="memberlist">${C().members.map(m => `<li><b>${esc(m.name)}</b><span class="muted">@${esc(m.username)}</span><span class="pill">${esc({ kurucu: T.owner, uye: T.member, izleyici: T.viewer }[m.role] || '')}</span>
      ${isOwner() && m.role !== 'kurucu' ? `<button class="linkbtn small" type="button" data-act="crole" data-id="${esc(m.uid)}" data-v="${m.role === 'izleyici' ? 'uye' : 'izleyici'}">${m.role === 'izleyici' ? T.makeMember : T.makeViewer}</button><button class="linkbtn small" type="button" data-act="ckick" data-id="${esc(m.uid)}">${T.kick}</button>` : ''}</li>`).join('')}</ul>
    ${!isOwner() ? `<button class="linkbtn small" type="button" data-act="cleave">${T.leave}</button>` : ''}`;
}
export function viewClub(tab) {
  const c = C();
  if (!c || c.doc === undefined) return `<p class="muted">${T.loading}</p>`;
  if (!c.doc) return `<section class="surface"><h2>${T.noAccess}</h2><a href="#kulup">${T.backClubs}</a></section>`;
  return { ay: viewHome, kitaplar: viewLibrary, oneriler: tabSugg, uyeler: tabMembers }[tab]();
}
const BOOK_TABS = [['genel', 'Genel'], ['own', 'Notlar'], ['quote', 'Alıntılar'], ['question', 'Sorular'], ['meeting', 'Toplantı'], ['info', 'Yazar ve bilgi']];
function bookGeneral(b, w) {
  const rs = readers();
  return `<section class="surface"><h3>${T.status}</h3>${S.shelf.some(x => x.id === b.id || x.title === b.title) ? `<p class="muted small">${T.onMyShelf}</p>` : `<button class="btn ghost share" type="button" data-act="cshelf">${T.toShelf}</button>`}${w ? `<div class="seg wrap">${CLUB_STATUS.map(([k, l]) => `<button type="button" class="${b.status === k ? 'on' : ''}" data-act="cstatus" data-v="${k}">${l}</button>`).join('')}</div>` : ''}
      <h3>${T.rate}</h3><div class="rate" role="group" aria-label="${T.rate}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${((b.ratings || {})[S.user.uid] || 0) >= n ? 'on' : ''}" data-act="crate" data-v="${n}" aria-label="${n}">★</button>`).join('')}</div>${avg(b) ? `<p class="muted small">${T.avg}: ${avg(b).toFixed(1)}</p>` : ''}</section>
    <section class="surface"><h3>${T.clubProgress}</h3><ul class="hbars">${rs.map(r => `<li><span>${esc(r.name)}</span><span class="bar"><i style="width:${pctOf(b, r)}%"></i></span><span class="v">%${pctOf(b, r)}</span></li>`).join('')}</ul>
      ${w ? `<form id="cb-prog" class="pagebar"><label>${T.myProgress}<input name="p" type="number" min="0" max="100" value="${(b.progress || {})[S.user.uid] || 0}"></label><button class="btn ghost" type="submit">${T.save}</button></form>` : ''}</section>
    <section class="surface"><h3>${T.meeting}</h3>${w ? `<form id="cb-meet" class="pagebar"><label>${T.date}<input name="d" type="date" value="${esc(b.meetingDate || '')}"></label><label>${T.time}<input name="t" type="time" value="${esc(b.meetingTime || '')}"></label><label>${T.place}<input name="pl" maxlength="80" value="${esc(b.meetingPlace || '')}"></label><button class="btn ghost" type="submit">${T.save}</button></form>` : ''}${b.meetingDate ? rsvpBlock(b) : `<p class="muted">${T.noMeeting}</p>`}</section>`;
}
function bookInfo(b) {
  const x = b.bilgi || {}, list = x.notlar || [], notes = C().notes.filter(n => n.kind === 'info');
  const rows = [[T.original, x.orijinal], [T.publisher, b.publisher], [T.year, b.year], [T.pagesWord, b.pages], [T.genre, b.genre]].filter(r => r[1]);
  return `${x.yazarNot ? `<section class="surface"><h3>${esc(b.author || '')}</h3><p>${esc(x.yazarNot)}</p></section>` : ''}
    ${rows.length ? `<section class="surface"><h3>${T.imprint}</h3><dl class="facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>` : ''}
    ${list.length ? `<section class="surface"><h3>${T.facts}</h3><ul class="timeline">${list.map(t => `<li><p>${esc(t)}</p></li>`).join('')}</ul></section>` : ''}
    ${notes.length ? `<section class="surface"><h3>${T.intro}</h3><ul class="timeline">${notes.map(n => `<li><p>${esc(n.text)}</p></li>`).join('')}</ul></section>` : ''}
    ${!x.yazarNot && !rows.length && !list.length && !notes.length ? `<p class="muted">${T.noInfo}</p>` : ''}`;
}
export function viewClubBook(bid) {
  const c = C();
  if (!c || c.doc === undefined) return `<p class="muted">${T.loading}</p>`;
  const b = c.books.find(x => x.id === bid);
  if (!c.doc || !b) return `<section class="surface"><h2>${T.noAccess}</h2><a href="#kulup">${T.backClubs}</a></section>`;
  const photosOn = !!c.doc.photosEnabled, w = canWrite();
  const tabsAll = BOOK_TABS.concat(photosOn ? [['photo', T.photos]] : []);
  const kind = tabsAll.some(t => t[0] === S.noteKind) ? S.noteKind : 'genel';
  const list = c.notes.filter(n => n.kind === kind), count = k => c.notes.filter(n => n.kind === k).length;
  const qGeneric = kind === 'question' && w && !b.genericAdded;
  let body;
  if (kind === 'genel') body = bookGeneral(b, w);
  else if (kind === 'info') body = bookInfo(b);
  else if (kind === 'photo') body = photoTab(w);
  else body = `<ul class="notes">${list.map(n => `<li>${kind === 'question' && w ? `<button type="button" class="check ${n.done ? 'on' : ''}" data-act="cdone" data-id="${esc(n.id)}" aria-pressed="${!!n.done}" aria-label="${T.discussed}">✓</button>` : ''}<div>${n.spoiler && n.by !== S.user.uid && !S.reveal.has(n.id) ? `<button class="linkbtn" type="button" data-act="creveal" data-id="${esc(n.id)}">${T.spoiler}</button>` : `<p>${esc(n.text)}</p>`}<p class="muted small">${n.spoiler ? `<span class="pill">${T.spoilerTag}</span> ` : ''}${esc(n.byName || '')}${n.by === S.user.uid ? ` · <button class="linkbtn small" type="button" data-act="cdelnote" data-id="${esc(n.id)}">${T.del}</button>` : ''}</p></div></li>`).join('') || `<li class="muted">${T.noNotes}</li>`}</ul>
    ${w ? `<form class="surface" id="cb-note"><label>${T.write}<textarea name="text" rows="3" required maxlength="2000"></textarea></label><label class="check-row"><input type="checkbox" name="spoiler">${T.hasSpoiler}</label><button class="btn" type="submit">${T.add}</button></form>` : ''}
    ${qGeneric ? `<button class="btn ghost" type="button" data-act="cgeneric">${T.generic}</button>` : ''}`;
  return `<a class="small crumb" href="#k/${encodeURIComponent(c.id)}/kitaplar">← ${T.library}</a>
    <section class="stage book-stage"><div class="stage-bg" style="${bg(b)}"></div><div class="stage-cover">${book3d(b, 150)}</div>
      <div class="stage-text"><p class="eyebrow">${esc((CLUB_STATUS.find(s => s[0] === b.status) || ['', ''])[1])}${b.month ? ' · ' + esc(monthTR(b.month)) : ''}</p><h1 class="display">${emLast(b.title)}</h1><p class="stage-author">${esc(b.author || '')}</p><p class="stage-meta">${esc([b.pickedBy ? b.pickedBy + ' ' + T.picked : '', b.pages ? b.pages + ' sayfa' : ''].filter(Boolean).join(' · '))}${avg(b) ? ' ' + stars(avg(b)) : ''}</p></div></section>
    <nav class="subtabs">${tabsAll.map(([k, l]) => `<button type="button" class="${kind === k ? 'on' : ''}" data-act="ckind" data-v="${k}">${l}${count(k) ? `<span class="n">${count(k)}</span>` : ''}</button>`).join('')}</nav>
    <div class="book-grid">${body}</div>`;
}
function photoTab(w) {
  return `${w ? `<label class="btn ghost photo-add">${T.addPhoto}<input id="cb-photo" type="file" accept="image/*" hidden></label>` : ''}
    <div class="album">${C().photos.map(p => `<figure><img src="${esc(p.data)}" alt="" loading="lazy"><figcaption class="muted small">${esc(p.byName || '')}${p.by === S.user.uid ? ` · <button class="linkbtn small" type="button" data-act="cdelphoto" data-id="${esc(p.id)}">${T.del}</button>` : ''}</figcaption></figure>`).join('') || `<p class="muted">${T.noPhotos}</p>`}</div>`;
}
// Fotoğraf küçültülüp veritabanına yazılır; Storage gerektirmez, ücretsiz kotada kalır
function shrink(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = rej;
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let side = 1200, q = 0.8, data = '';
      do {
        const k = Math.min(1, side / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        data = c.toDataURL('image/jpeg', q);
        side -= 200; q -= 0.1;
      } while (data.length > 900000 && side >= 400);
      res(data);
    };
    img.src = URL.createObjectURL(file);
  });
}
document.addEventListener('change', async e => {
  if (e.target.id !== 'cb-photo' || !e.target.files[0]) return;
  try {
    const data = await shrink(e.target.files[0]);
    await add(`clubs/${C().id}/books/${S.bookId}/photos`, { by: S.user.uid, byName: S.profile.name, data, at: new Date().toISOString() });
    toast(T.photoAdded);
  } catch (err) { toast(T.photoFail); }
});
export function clubClick(a, el) {
  const u = S.user;
  if (a === 'cjoin') { const i = S.invite; joinClub(u, S.profile, i.code, i.data).then(() => { location.hash = '#k/' + i.data.clubId; }).catch(fail); return true; }
  if (!a.startsWith('c') || !S.club) return false;
  const base = 'clubs/' + C().id, bid = S.bookId;
  const name = S.profile.name;
  if (a === 'cadd') {
    const b = C().results[Number(el.dataset.i)], { title, author, cover, pages, year } = b;
    const info = { title, author, cover, pages, year };
    (el.dataset.to === 'sugg' ? add(base + '/suggestions', { ...info, by: u.uid, byName: name, votes: {}, at: new Date().toISOString() }) : add(base + '/books', { ...info, status: 'sirada', progress: {}, addedBy: u.uid, at: new Date().toISOString() })).then(() => { C().results = null; render(); toast(T.addedOk); }).catch(fail);
  }
  if (a === 'cvote') { const s = C().sugg.find(x => x.id === el.dataset.id), v = { ...(s.votes || {}) }; if (v[u.uid]) delete v[u.uid]; else v[u.uid] = true; patchVotes(base, s.id, v); }
  if (a === 'cadopt') { const s = C().sugg.find(x => x.id === el.dataset.id), { title, author, cover, pages, year } = s; add(base + '/books', { title, author, cover, pages, year, status: 'sirada', progress: {}, addedBy: u.uid, at: new Date().toISOString() }).then(() => remove(`${base}/suggestions/${s.id}`)).then(() => toast(T.addedOk)).catch(fail); }
  if (a === 'cinvite') makeInvite(u, C().doc).then(() => toast(T.linkReady)).catch(fail);
  if (a === 'ccopy') { const i = $('#inv-link'); navigator.clipboard.writeText(i.value).then(() => toast(T.copied)).catch(() => { i.select(); }); }
  if (a === 'crole') patch(`${base}/members/${el.dataset.id}`, { role: el.dataset.v }).catch(fail);
  if (a === 'ckick') remove(`${base}/members/${el.dataset.id}`).catch(fail);
  if (a === 'cleave') leaveClub(u.uid, C().id).then(() => { location.hash = '#kulup'; }).catch(fail);
  if (a === 'cshelf') { const b = C().books.find(x => x.id === bid); addToShelf(u.uid, { id: b.id, title: b.title, author: b.author || '', cover: b.cover && b.cover.length < 2000 ? b.cover : '', pages: b.pages || 0, year: b.year || '', publisher: b.publisher || '' }, b.status === 'okunuyor' ? 'okuyorum' : 'istiyorum').then(() => { toast(T.addedOk); render(); }).catch(fail); }
  if (a === 'cstatus') patch(`${base}/books/${bid}`, { status: el.dataset.v }).catch(fail);
  if (a === 'crate') patch(`${base}/books/${bid}`, { ratings: { [u.uid]: Number(el.dataset.v) } }).catch(fail);
  if (a === 'crsvp') patch(`${base}/books/${el.dataset.id || bid}`, { rsvp: { [u.uid]: el.dataset.v } }).catch(fail);
  if (a === 'creveal') { S.reveal.add(el.dataset.id); render(); }
  if (a === 'ckind') { S.noteKind = el.dataset.v; if (el.tagName !== 'A') render(); }
  if (a === 'cdone') { const n = C().notes.find(x => x.id === el.dataset.id); patch(`${base}/books/${bid}/notes/${n.id}`, { done: !n.done }).catch(fail); }
  if (a === 'cdelphoto') remove(`${base}/books/${bid}/photos/${el.dataset.id}`).catch(fail);
  if (a === 'cdelnote') remove(`${base}/books/${bid}/notes/${el.dataset.id}`).catch(fail);
  if (a === 'cgeneric') {
    const at = Date.now();
    Promise.all(GENERIC_Q.map((text, i) => add(`${base}/books/${bid}/notes`, { kind: 'question', text, by: u.uid, byName: T.genericBy, done: false, at: new Date(at + i).toISOString() }))).then(() => patch(`${base}/books/${bid}`, { genericAdded: true })).catch(fail);
  }
  return true;
}
// Oy haritası birleştirilmez, tamamen yazılır; aksi halde geri alınan oy silinmez
function patchVotes(base, id, votes) {
  const s = C().sugg.find(x => x.id === id);
  add(`${base}/suggestions`, { ...stripId(s), votes }).then(() => remove(`${base}/suggestions/${id}`)).catch(fail);
}
const stripId = ({ id, ...rest }) => rest;

export async function clubSubmit(id, f, target) {
  const u = S.user, base = S.club ? 'clubs/' + C().id : '', bid = S.bookId;
  if (id === 'club-form') { const cid = await createClub(u, S.profile, f.name.value.trim()); location.hash = '#k/' + cid + '/uyeler'; return true; }
  if (id === 'cb-search') {
    try { C().results = await searchBooks(f.q.value.trim()); } catch (e) { C().results = 'fail'; }
    render();
    return true;
  }
  if (id === 'cb-prog') { await patch(`${base}/books/${bid}`, { progress: { [u.uid]: Math.min(100, Math.max(0, Number(f.p.value) || 0)) } }); toast(T.saved); return true; }
  if (id === 'cb-meet') { await patch(`${base}/books/${bid}`, { meetingDate: f.d.value, meetingTime: f.t.value, meetingPlace: f.pl.value.trim() }); toast(T.saved); return true; }
  if (id === 'cb-note') {
    await add(`${base}/books/${bid}/notes`, { kind: S.noteKind || 'own', text: f.text.value.trim(), spoiler: f.spoiler.checked, by: u.uid, byName: S.profile.name, done: false, at: new Date().toISOString() });
    f.text.value = '';
    return true;
  }
  return false;
}
