// Kulüp ekranları ve olayları
import { $, esc } from './util.js';
import { TC as T } from './strings.js';
import { searchBooks } from './books.js';
import { watchCol, watchDoc, add, patch, remove, createClub, makeInvite, getInvite, joinClub, leaveClub } from './clubs.js';

const GENERIC_Q = ['Kitabın sonu sana tatmin edici geldi mi? Seni şaşırttı mı?', 'En çok hangi karakterle bağ kurdun, neden?', 'Karakterlerin kararları sana inandırıcı geldi mi?', 'Ana karakter kitabın başından sonuna nasıl değişti?', 'Olayların altında bu kitap sence aslında ne anlatıyor?', 'Hikâye bittikten sonra karakterlere ne olduğunu düşünüyorsun?', 'Sesli okumak istediğin bir bölüm var mı? Neden o bölüm?', 'Bu kitabı kime önerirdin?'];
const CLUB_STATUS = [['okunuyor', 'Okunuyor'], ['sirada', 'Sırada'], ['tamamlandi', 'Bitti']];
const NOTE_KINDS = [['own', 'Notlar'], ['quote', 'Alıntılar'], ['question', 'Sorular'], ['meeting', 'Toplantı'], ['info', 'Bilgiler']];
let S, toast, fail, render, coverHTML;
export function initClubs(ctx) { ({ S, toast, fail, render, coverHTML } = ctx); }

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
const tabs = active => `<nav class="ctabs">${[['ay', T.tabNow], ['kitaplar', T.tabBooks], ['oneriler', T.tabSugg], ['uyeler', T.tabMembers]].map(([k, l]) => `<a href="#k/${encodeURIComponent(C().id)}/${k}" class="${active === k ? 'on' : ''}">${l}</a>`).join('')}</nav>`;
const bookLink = b => `#k/${encodeURIComponent(C().id)}/b/${encodeURIComponent(b.id)}`;
// Taşınan kitaplarda yazar notu ve ilginç bilgiler
const bookInfo = b => {
  const x = b.bilgi || {}, list = x.notlar || [];
  if (!x.yazarNot && !list.length && !x.orijinal) return '';
  return `<details class="more"><summary>${T.aboutBook}</summary><div class="surface">${x.orijinal ? `<p class="muted small">${T.original}: ${esc(x.orijinal)}</p>` : ''}${x.yazarNot ? `<p>${esc(x.yazarNot)}</p>` : ''}${list.length ? `<ul class="timeline">${list.map(t => `<li><p>${esc(t)}</p></li>`).join('')}</ul>` : ''}</div></details>`;
};
const avgRate = b => { const v = Object.values(b.ratings || {}); return v.length ? `<p class="muted small">${T.avg}: ${(v.reduce((a, x) => a + x, 0) / v.length).toFixed(1)}</p>` : ''; };
const bookTile = b => `<a class="tile" href="${bookLink(b)}">${coverHTML(b)}<span class="t">${esc(b.title)}</span><span class="a">${esc(b.author || '')}</span></a>`;
// Sıra, üyelerin katılım sırasıyla döner: son kitabı ekleyenden sonraki üye seçer
function nextPicker() {
  const ms = C().members.slice().sort((a, b) => (a.joinedAt || '').localeCompare(b.joinedAt || ''));
  if (!ms.length) return '';
  const last = C().books.slice().sort((a, b) => (b.at || '').localeCompare(a.at || ''))[0];
  const i = last ? ms.findIndex(m => m.uid === last.addedBy) : -1;
  return ms[(i + 1) % ms.length].name;
}
const daysLeft = d => Math.round((new Date(d + 'T00:00:00') - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000);
function tabNow() {
  const b = C().books.find(x => x.status === 'okunuyor');
  if (!b) return `<p class="empty-note">${T.noCurrent}</p><p class="muted">${T.nextPicker}: <b>${esc(nextPicker())}</b></p>`;
  openNotes(b.id);
  const notes = C().notes.filter(n => !n.spoiler), quotes = notes.filter(n => n.kind === 'quote');
  const left = b.meetingDate ? daysLeft(b.meetingDate) : null;
  const extra = `<div class="statrow three">
      ${left !== null && left >= 0 ? `<div><b>${left === 0 ? T.meetToday : left + ' ' + T.days}</b><span>${T.meeting}</span></div>` : ''}
      <div><b>${esc(nextPicker())}</b><span>${T.nextPicker}</span></div>
    </div>
    ${quotes.length ? `<div class="quotes" aria-label="${T.quotes}"><div>${quotes.concat(quotes).map(n => `<span>“${esc(n.text)}”</span>`).join('')}</div></div>` : ''}
    ${notes.length ? `<section class="surface"><h3>${T.recent}</h3><ul class="timeline">${notes.slice(-5).reverse().map(n => `<li><b>${esc(n.byName || '')}</b><p>${esc(n.text)}</p></li>`).join('')}</ul></section>` : ''}`;
  const yes = C().members.filter(m => (b.rsvp || {})[m.uid] === 'y');
  return `<section class="surface now">${coverHTML(b)}<div class="now-body"><p class="label">${esc(b.month || T.nowReading)}</p><h2>${esc(b.title)}</h2><p class="muted">${esc(b.author || '')}</p>
      <ul class="hbars">${C().members.map(m => { const p = (b.progress || {})[m.uid] || 0; return `<li><span>${esc(m.name)}</span><span class="bar"><i style="width:${p}%"></i></span><span class="v">%${p}</span></li>`; }).join('')}</ul>
      ${b.meetingDate ? `<p><b>${T.meeting}:</b> ${esc(dateTR(b.meetingDate))}${b.meetingTime ? ' · ' + esc(b.meetingTime) : ''}${b.meetingPlace ? ' · ' + esc(b.meetingPlace) : ''}</p><p class="muted small">${T.coming}: ${yes.map(m => esc(m.name)).join(', ') || '–'}</p>` : `<p class="muted">${T.noMeeting}</p>`}
      <a class="btn" href="${bookLink(b)}">${T.openBook}</a></div></section>${extra}`;
}
const searchBox = to => (canWrite() ? `<form class="searchbar" id="cb-search" data-to="${to}"><input name="q" type="search" required placeholder="${T.searchHint}" aria-label="${T.searchHint}"><button class="btn" type="submit">${T.search}</button></form>
  ${C().results === 'fail' ? `<p class="muted">${T.searchFail}</p>` : C().results ? `<ul class="results">${C().results.map((b, i) => `<li>${coverHTML(b)}<div><b>${esc(b.title)}</b><p class="muted small">${esc([b.author, b.year].filter(Boolean).join(' · '))}</p></div><button class="btn ghost" type="button" data-act="cadd" data-to="${to}" data-i="${i}">${T.add}</button></li>`).join('')}</ul>` : ''}` : '');
function tabBooks() {
  const done = C().books.filter(b => b.status === 'tamamlandi');
  return `<div class="statrow three"><div><b>${done.length}</b><span>${T.statDone}</span></div><div><b>${done.reduce((a, b) => a + (Number(b.pages) || 0), 0)}</b><span>${T.statPages}</span></div></div>${searchBox('books')}${CLUB_STATUS.map(([k, l]) => { const list = C().books.filter(b => b.status === k); return list.length ? `<section class="row"><h3>${l} <span>${list.length}</span></h3><div class="grid">${list.map(bookTile).join('')}</div></section>` : ''; }).join('')}`;
}
function tabSugg() {
  const rows = C().sugg.slice().sort((a, b) => Object.keys(b.votes || {}).length - Object.keys(a.votes || {}).length);
  return `${searchBox('sugg')}<ul class="results">${rows.map(s => { const v = Object.keys(s.votes || {}).length, mine = (s.votes || {})[S.user.uid]; return `<li>${coverHTML(s)}<div><b>${esc(s.title)}</b><p class="muted small">${esc([s.author, s.byName].filter(Boolean).join(' · '))}</p></div>
    <div class="ractions">${canWrite() ? `<button class="btn ${mine ? '' : 'ghost'}" type="button" data-act="cvote" data-id="${esc(s.id)}">♥ ${v}</button><button class="btn ghost" type="button" data-act="cadopt" data-id="${esc(s.id)}">${T.adopt}</button>` : `<span class="muted">♥ ${v}</span>`}</div></li>`; }).join('') || `<li class="muted">${T.noSugg}</li>`}</ul>`;
}
function tabMembers() {
  const link = C().doc.inviteCode ? `${location.origin}${location.pathname}#davet/${C().doc.inviteCode}` : '';
  return `${isOwner() ? `<section class="surface"><h3>${T.inviteTitle}</h3><p class="muted small">${T.inviteHint}</p>${link ? `<input id="inv-link" readonly value="${esc(link)}" aria-label="${T.inviteTitle}"><div class="ractions left"><button class="btn" type="button" data-act="ccopy">${T.copy}</button><button class="btn ghost" type="button" data-act="cinvite">${T.newLink}</button></div>` : `<button class="btn" type="button" data-act="cinvite">${T.makeLink}</button>`}</section>` : ''}
    <ul class="memberlist">${C().members.map(m => `<li><b>${esc(m.name)}</b><span class="muted">@${esc(m.username)}</span><span class="pill">${esc({ kurucu: T.owner, uye: T.member, izleyici: T.viewer }[m.role] || '')}</span>
      ${isOwner() && m.role !== 'kurucu' ? `<button class="linkbtn small" type="button" data-act="crole" data-id="${esc(m.uid)}" data-v="${m.role === 'izleyici' ? 'uye' : 'izleyici'}">${m.role === 'izleyici' ? T.makeMember : T.makeViewer}</button><button class="linkbtn small" type="button" data-act="ckick" data-id="${esc(m.uid)}">${T.kick}</button>` : ''}</li>`).join('')}</ul>
    ${!isOwner() ? `<button class="linkbtn small" type="button" data-act="cleave">${T.leave}</button>` : ''}`;
}
export function viewClub(tab) {
  const c = C();
  if (!c || c.doc === undefined) return `<p class="muted">${T.loading}</p>`;
  if (!c.doc) return `<section class="surface"><h2>${T.noAccess}</h2><a href="#kulup">${T.backClubs}</a></section>`;
  return `<div class="pagehead"><div><p class="label">${T.club}</p><h2>${esc(c.doc.name)}</h2></div></div>${tabs(tab)}${{ ay: tabNow, kitaplar: tabBooks, oneriler: tabSugg, uyeler: tabMembers }[tab]()}`;
}
export function viewClubBook(bid) {
  const c = C();
  if (!c || c.doc === undefined) return `<p class="muted">${T.loading}</p>`;
  const b = c.books.find(x => x.id === bid);
  if (!c.doc || !b) return `<section class="surface"><h2>${T.noAccess}</h2><a href="#kulup">${T.backClubs}</a></section>`;
  const photosOn = !!c.doc.photosEnabled;
  const kind = S.noteKind === 'photo' && !photosOn ? 'own' : S.noteKind || 'own', list = c.notes.filter(n => n.kind === kind), w = canWrite();
  const qGeneric = kind === 'question' && w && !b.genericAdded;
  return `<a class="small" href="#k/${encodeURIComponent(c.id)}/kitaplar">← ${esc(c.doc.name)}</a>
    <section class="book">${coverHTML(b)}<div class="book-body"><h2>${esc(b.title)}</h2><p class="muted">${esc([b.author, b.year, b.pages ? b.pages + ' sayfa' : ''].filter(Boolean).join(' · '))}</p>
      <div class="rate" role="group" aria-label="${T.rate}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${((b.ratings || {})[S.user.uid] || 0) >= n ? 'on' : ''}" data-act="crate" data-v="${n}" aria-label="${n}">★</button>`).join('')}</div>${avgRate(b)}
      ${w ? `<div class="seg wrap">${CLUB_STATUS.map(([k, l]) => `<button type="button" class="${b.status === k ? 'on' : ''}" data-act="cstatus" data-v="${k}">${l}</button>`).join('')}</div>
      <form id="cb-prog" class="pagebar"><label>${T.myProgress}<input name="p" type="number" min="0" max="100" value="${(b.progress || {})[S.user.uid] || 0}"></label><button class="btn ghost" type="submit">${T.save}</button></form>
      <form id="cb-meet" class="pagebar"><label>${T.date}<input name="d" type="date" value="${esc(b.meetingDate || '')}"></label><label>${T.time}<input name="t" type="time" value="${esc(b.meetingTime || '')}"></label><label>${T.place}<input name="pl" maxlength="80" value="${esc(b.meetingPlace || '')}"></label><button class="btn ghost" type="submit">${T.save}</button></form>
      ${b.meetingDate ? `<div class="seg"><button type="button" class="${(b.rsvp || {})[S.user.uid] === 'y' ? 'on' : ''}" data-act="crsvp" data-v="y">${T.yes}</button><button type="button" class="${(b.rsvp || {})[S.user.uid] === 'n' ? 'on' : ''}" data-act="crsvp" data-v="n">${T.no}</button></div>` : ''}` : ''}
    </div></section>
    ${bookInfo(b)}
    <nav class="ctabs">${NOTE_KINDS.concat(photosOn ? [['photo', T.photos]] : []).map(([k, l]) => `<button type="button" class="${kind === k ? 'on' : ''}" data-act="ckind" data-v="${k}">${l}</button>`).join('')}</nav>
    ${kind === 'photo' ? photoTab(w) : `<ul class="notes">${list.map(n => `<li>${kind === 'question' && w ? `<button type="button" class="check ${n.done ? 'on' : ''}" data-act="cdone" data-id="${esc(n.id)}" aria-pressed="${!!n.done}" aria-label="${T.discussed}">✓</button>` : ''}<div>${n.spoiler && n.by !== S.user.uid && !S.reveal.has(n.id) ? `<button class="linkbtn" type="button" data-act="creveal" data-id="${esc(n.id)}">${T.spoiler}</button>` : `<p>${esc(n.text)}</p>`}<p class="muted small">${n.spoiler ? `<span class="pill">${T.spoilerTag}</span> ` : ''}${esc(n.byName || '')}${n.by === S.user.uid ? ` · <button class="linkbtn small" type="button" data-act="cdelnote" data-id="${esc(n.id)}">${T.del}</button>` : ''}</p></div></li>`).join('') || `<li class="muted">${T.noNotes}</li>`}</ul>
    ${w ? `<form class="surface" id="cb-note"><label>${T.write}<textarea name="text" rows="3" required maxlength="2000"></textarea></label><label class="check-row"><input type="checkbox" name="spoiler">${T.hasSpoiler}</label><button class="btn" type="submit">${T.add}</button></form>` : ''}`}
    ${qGeneric ? `<button class="btn ghost" type="button" data-act="cgeneric">${T.generic}</button>` : ''}`;
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
  if (a === 'cstatus') patch(`${base}/books/${bid}`, { status: el.dataset.v }).catch(fail);
  if (a === 'crate') patch(`${base}/books/${bid}`, { ratings: { [u.uid]: Number(el.dataset.v) } }).catch(fail);
  if (a === 'crsvp') patch(`${base}/books/${bid}`, { rsvp: { [u.uid]: el.dataset.v } }).catch(fail);
  if (a === 'creveal') { S.reveal.add(el.dataset.id); render(); }
  if (a === 'ckind') { S.noteKind = el.dataset.v; render(); }
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
