// Herkese açık kulüpler ve katılma istekleri (K6, 2. adım).
// clubDirectory/{kulüp}: kurucu "herkese açık" deyince yazılan vitrin (ad, kısa tanıtım, üye sayısı, okunan kitap). Giriş yapmış herkes okur.
// clubRequests/{kulüp_uid}: katılma isteği. Kurucu onaylar (approved: true); isteyen kişi onayı görünce kendini üye yazar, istek silinir.
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, startAt, endAt, limit, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { fs } from './auth.js';
import { esc } from './util.js';
import { TJ as T } from './strings.js';
import { flat } from './parts.js';

const now = () => new Date().toISOString();
const low = s => (s || '').toLocaleLowerCase('tr');
const slim = b => b && { title: b.title || '', author: b.author || '', cover: b.cover && !b.cover.startsWith('data:') && b.cover.length < 600 ? b.cover : '' };

// Kurucu: vitrini yazar ya da kaldırır
export async function publishClub(S, club, desc) {
  const book = (club.books || []).find(x => x.status === 'okunuyor') || null;
  await updateDoc(doc(fs, 'clubs', club.id), { public: true, desc: (desc || '').slice(0, 200) });
  await setDoc(doc(fs, 'clubDirectory', club.id), { name: club.doc.name, nameLower: low(club.doc.name), desc: (desc || '').slice(0, 200), ownerId: S.user.uid, ownerName: S.profile.name || S.profile.username, count: (club.members || []).length, book: slim(book), updatedAt: now() });
}
export async function unpublishClub(club) {
  await updateDoc(doc(fs, 'clubs', club.id), { public: false });
  await deleteDoc(doc(fs, 'clubDirectory', club.id)).catch(() => {});
}
// Kurucu kulübü açınca vitrin güncel tutulur (üye sayısı, okunan kitap)
export function refreshDirectory(S, club) {
  if (!club || !club.doc || !club.doc.public || club.doc.ownerId !== S.user.uid) return;
  const book = (club.books || []).find(x => x.status === 'okunuyor') || null, key = 'kuytu-vitrinkulup-' + club.id;
  const sig = JSON.stringify([club.doc.name, club.doc.desc || '', (club.members || []).length, book && book.title]);
  let last = '';
  try { last = localStorage.getItem(key) || ''; } catch (e) {}
  if (last === sig) return;
  setDoc(doc(fs, 'clubDirectory', club.id), { name: club.doc.name, nameLower: low(club.doc.name), desc: club.doc.desc || '', ownerId: S.user.uid, ownerName: S.profile.name || S.profile.username, count: (club.members || []).length, book: slim(book), updatedAt: now() })
    .then(() => { try { localStorage.setItem(key, sig); } catch (e) {} }).catch(() => {});
}

export async function searchClubs(q) {
  const col = collection(fs, 'clubDirectory'), s = low(q.trim());
  const snap = s.length >= 2 ? await getDocs(query(col, orderBy('nameLower'), startAt(s), endAt(s + ''), limit(20))) : await getDocs(query(col, orderBy('updatedAt', 'desc'), limit(20)));
  return snap.docs.map(d => ({ ...d.data(), id: d.id }));
}

// İstekler: benim gönderdiklerim ve kurucusu olduğum kulüplere gelenler canlı izlenir
export function watchRequests(uid, cb) {
  const col = collection(fs, 'clubRequests'), map = s => s.docs.map(d => ({ ...d.data(), id: d.id }));
  const offs = [
    onSnapshot(query(col, where('uid', '==', uid)), s => cb('myReqs', map(s)), () => cb('myReqs', [])),
    onSnapshot(query(col, where('ownerId', '==', uid)), s => cb('clubReqs', map(s)), () => cb('clubReqs', [])),
  ];
  return () => offs.forEach(f => f());
}
export async function requestJoin(S, c) {
  await setDoc(doc(fs, 'clubRequests', c.id + '_' + S.user.uid), { clubId: c.id, clubName: c.name, ownerId: c.ownerId, uid: S.user.uid, name: S.profile.name || S.profile.username, username: S.profile.username, approved: false, at: now() });
}
export const dropRequest = r => deleteDoc(doc(fs, 'clubRequests', r.id));
export const approveRequest = r => updateDoc(doc(fs, 'clubRequests', r.id), { approved: true });
// Onaylanan istek: kişi kendini kulübe üye yazar ve kulübü kendi listesine ekler
export async function joinApproved(S, r) {
  const b = writeBatch(fs);
  b.set(doc(fs, 'clubs', r.clubId, 'members', S.user.uid), { uid: S.user.uid, role: 'uye', name: S.profile.name, username: S.profile.username, joinedAt: now(), viaRequest: true });
  b.set(doc(fs, 'users', S.user.uid, 'clubs', r.clubId), { name: r.clubName, role: 'uye' });
  await b.commit();
  await deleteDoc(doc(fs, 'clubRequests', r.id)).catch(() => {});
}

// Keşfet > Kulüpler
export function viewClubsExplore(S) {
  const mine = id => (S.myClubs || []).some(c => c.id === id), sent = id => (S.myReqs || []).find(r => r.clubId === id);
  const btn = c => mine(c.id) ? `<a class="pl sm" href="#k/${encodeURIComponent(c.id)}/ay">${T.open}</a>`
    : sent(c.id) ? `<button type="button" class="pl sm" data-act="jcancel" data-id="${esc(c.id)}">${T.sent} · ${T.undo}</button>`
    : `<button type="button" class="pl sm on" data-act="jask" data-id="${esc(c.id)}">${T.ask}</button>`;
  const list = S.clubsFound === 'loading' ? `<p class="lbl small">${T.searching}</p>` : Array.isArray(S.clubsFound)
    ? (S.clubsFound.length ? `<ul class="cl-list">${S.clubsFound.map(c => `<li class="cl-row">${c.book && c.book.title ? flat({ ...c.book, id: '' }, 46) : `<span class="cl-ph" aria-hidden="true">${esc((c.name || '?').charAt(0))}</span>`}<div><b>${esc(c.name)}</b><small>${c.count || 1} ${T.members}${c.book && c.book.title ? ' · ' + T.reading + ' ' + esc(c.book.title) : ''}</small>${c.desc ? `<p>${esc(c.desc)}</p>` : ''}</div>${btn(c)}</li>`).join('')}</ul>` : `<p class="lbl small">${S.clubsQ ? T.noneFound : T.noneYet}</p>`)
    : `<p class="lbl small">${S.clubsErr ? T.offline : T.searching}</p>`;
  return `<form class="searchbar" id="club-search"><input name="q" type="search" value="${esc(S.clubsQ || '')}" placeholder="${T.searchPh}" aria-label="${T.searchPh}" autocomplete="off"><button class="pl ink" type="submit">${T.search}</button></form>
    <p class="cap">${S.clubsQ ? T.results : T.latest}</p>${list}
    <p class="lbl small">${T.hint}</p>`;
}
// Kurucunun Üyeler sayfasında: herkese açık ayarı ve gelen istekler
export function ownerPanel(S, club) {
  const pub = !!(club.doc && club.doc.public), reqs = (S.clubReqs || []).filter(r => r.clubId === club.id && !r.approved);
  return `<section class="surface cl-owner">
    <h3>${T.publicTitle}</h3>
    <form id="club-public" class="cl-pub"><label class="check-row"><input type="checkbox" name="pub"${pub ? ' checked' : ''}>${T.publicLbl}</label>
      <label>${T.descLbl}<input name="desc" maxlength="200" value="${esc((club.doc && club.doc.desc) || '')}" placeholder="${T.descPh}"></label>
      <button class="pl" type="submit">${T.save}</button></form>
    <p class="muted small">${pub ? T.publicOn : T.publicOff}</p>
    ${reqs.length ? `<h3>${T.requests} · ${reqs.length}</h3><ul class="rd-list">${reqs.map(r => `<li class="rd-row"><a class="rd-who" href="#okur/${encodeURIComponent(r.uid)}"><span class="rd-av" aria-hidden="true">${esc((r.name || '?').charAt(0).toLocaleUpperCase('tr'))}</span><span><b>${esc(r.name)}</b><small>@${esc(r.username || '')}</small></span></a><span class="rd-acts"><button type="button" class="pl sm on" data-act="japprove" data-id="${esc(r.id)}">${T.approve}</button><button type="button" class="pl sm" data-act="jdecline" data-id="${esc(r.id)}">${T.decline}</button></span></li>`).join('')}</ul>` : ''}
  </section>`;
}
