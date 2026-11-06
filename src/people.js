// Okurlar ve arkadaşlık (K5, 2. aşama).
// profiles/{uid}: herkese (giriş yapmış okurlara) açık vitrin. Yalnızca ad, kullanıcı adı, tek cümle, kalbindeki dört kitap ve şu an okuduğu kitap.
// Sayfa, süre, seri ve hedefler buraya hiçbir zaman yazılmaz. Kişi "Okurlar beni bulabilsin"i kapatırsa belge silinir.
// friendRequests/{gönderen_alan}: arkadaşlık isteği. Kabul edilince iki tarafın users/{uid}/friends listesine yazılır, istek silinir.
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, query, where, orderBy, startAt, endAt, limit } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { fs } from './auth.js';
import { esc } from './util.js';
import { TF as T } from './strings.js';
import { flat } from './parts.js';

const now = () => new Date().toISOString();
const slim = b => b && { title: b.title || '', author: b.author || '', cover: b.cover && !b.cover.startsWith('data:') && b.cover.length < 600 ? b.cover : '' };
const low = s => (s || '').toLocaleLowerCase('tr');
export const findable = p => !!p && p.findable !== false;

// Vitrin: profil ya da raf değişince, içerik değiştiyse yazılır
let pubTimer = 0;
export function sharePublic(S) {
  clearTimeout(pubTimer);
  pubTimer = setTimeout(() => {
    if (!S.user || !S.profile || !S.shelfReady || !S.profile.username) return;
    const uid = S.user.uid, k = 'kuytu-vitrin-' + uid;
    let last = '';
    try { last = localStorage.getItem(k) || ''; } catch (e) {}
    if (!findable(S.profile)) {
      if (last !== 'gizli') deleteDoc(doc(fs, 'profiles', uid)).then(() => { try { localStorage.setItem(k, 'gizli'); } catch (e) {} }).catch(() => {});
      return;
    }
    const p = S.profile, card = { uid, name: p.name || p.username, username: p.username, nameLower: low(p.name || p.username), bio: p.bio || '', four: S.shelf.filter(b => b.fav).slice(0, 4).map(slim), reading: slim(S.shelf.find(b => b.status === 'okuyorum')) || null };
    // Şehir ve yaş yalnızca kişi "görünsün" dediyse vitrine yazılır
    if (p.showCity && p.city) card.city = String(p.city).slice(0, 60);
    const by = Number(p.birthYear);
    if (p.showAge && by > 1900) card.age = new Date().getFullYear() - by;
    const key = JSON.stringify(card);
    if (last === key) return;
    setDoc(doc(fs, 'profiles', uid), { ...card, updatedAt: now() }).then(() => { try { localStorage.setItem(k, key); } catch (e) {} }).catch(() => {});
  }, 1500);
}

// Okur arama: kullanıcı adının ya da adın başı. Kendini göstermez
export async function searchPeople(q, me) {
  const s = low(q.trim().replace(/^@/, ''));
  if (s.length < 2) return [];
  const col = collection(fs, 'profiles'), run = field => getDocs(query(col, orderBy(field), startAt(s), endAt(s + ''), limit(12)));
  const [a, b] = await Promise.all([run('username'), run('nameLower')]);
  const seen = new Map();
  [...a.docs, ...b.docs].forEach(d => { if (d.id !== me) seen.set(d.id, { ...d.data(), uid: d.id }); });
  return [...seen.values()];
}
export const getPublic = async uid => { const s = await getDoc(doc(fs, 'profiles', uid)); return s.exists() ? { ...s.data(), uid } : null; };

// Gelen ve giden istekler, arkadaş listesi: canlı izlenir
export function watchPeople(uid, cb) {
  const map = s => s.docs.map(d => ({ ...d.data(), id: d.id }));
  const reqs = collection(fs, 'friendRequests');
  const offs = [
    onSnapshot(query(reqs, where('to', '==', uid)), s => cb('reqIn', map(s)), () => cb('reqIn', [])),
    onSnapshot(query(reqs, where('from', '==', uid)), s => cb('reqOut', map(s)), () => cb('reqOut', [])),
    onSnapshot(collection(fs, 'users', uid, 'friends'), s => cb('friends', map(s)), () => cb('friends', [])),
  ];
  return () => offs.forEach(f => f());
}
const meOf = S => ({ uid: S.user.uid, name: S.profile.name || S.profile.username, username: S.profile.username });
export async function sendRequest(S, p) {
  // Karşı taraf zaten istek gönderdiyse doğrudan kabul edilir
  const back = (S.reqIn || []).find(r => r.from === p.uid);
  if (back) return accept(S, back);
  const me = meOf(S);
  await setDoc(doc(fs, 'friendRequests', me.uid + '_' + p.uid), { from: me.uid, to: p.uid, fromName: me.name, fromUsername: me.username, toName: p.name || '', toUsername: p.username || '', at: now() });
}
export async function accept(S, r) {
  const me = meOf(S), since = now();
  await setDoc(doc(fs, 'users', me.uid, 'friends', r.from), { uid: r.from, name: r.fromName || '', username: r.fromUsername || '', since });
  await setDoc(doc(fs, 'users', r.from, 'friends', me.uid), { uid: me.uid, name: me.name, username: me.username, since });
  await deleteDoc(doc(fs, 'friendRequests', r.id));
}
export const dropRequest = r => deleteDoc(doc(fs, 'friendRequests', r.id));
export async function unfriend(S, uid) {
  await deleteDoc(doc(fs, 'users', S.user.uid, 'friends', uid));
  await deleteDoc(doc(fs, 'users', uid, 'friends', S.user.uid)).catch(() => {});
}
// Hesap silinirken: vitrin, istekler ve iki taraflı arkadaşlıklar
export async function forgetMe(uid) {
  await deleteDoc(doc(fs, 'profiles', uid)).catch(() => {});
  const reqs = collection(fs, 'friendRequests');
  for (const f of ['from', 'to']) for (const d of (await getDocs(query(reqs, where(f, '==', uid))).catch(() => ({ docs: [] }))).docs) await deleteDoc(d.ref).catch(() => {});
  for (const d of (await getDocs(collection(fs, 'users', uid, 'friends'))).docs) await deleteDoc(doc(fs, 'users', d.id, 'friends', uid)).catch(() => {});
  for (const d of (await getDocs(query(collection(fs, 'reviews'), where('uid', '==', uid))).catch(() => ({ docs: [] }))).docs) await deleteDoc(d.ref).catch(() => {});
}

// Bir okurla aramızdaki durum ve ona göre düğme
export function relation(S, uid) {
  if (S.user && uid === S.user.uid) return 'me';
  if ((S.friends || []).some(f => f.id === uid)) return 'friend';
  if ((S.reqOut || []).some(r => r.to === uid)) return 'sent';
  if ((S.reqIn || []).some(r => r.from === uid)) return 'incoming';
  return 'none';
}
export function relButton(S, uid, small = true) {
  const sm = small ? ' sm' : '', rel = relation(S, uid);
  if (rel === 'me') return `<span class="lbl small">${T.thatsYou}</span>`;
  if (rel === 'friend') return S.armed === 'uf_' + uid
    ? `<button type="button" class="pl${sm} red" data-act="funfriend" data-id="${esc(uid)}">${T.sureUnfriend}</button>`
    : `<button type="button" class="pl${sm}" data-act="funfriend" data-id="${esc(uid)}">${T.friends} ✓</button>`;
  if (rel === 'sent') return `<button type="button" class="pl${sm}" data-act="fcancel" data-id="${esc(uid)}">${T.sent} · ${T.undo}</button>`;
  if (rel === 'incoming') return `<button type="button" class="pl${sm} on" data-act="faccept" data-id="${esc(uid)}">${T.accept}</button>`;
  return `<button type="button" class="pl${sm} on" data-act="fadd" data-id="${esc(uid)}">${T.add}</button>`;
}
const av = (name, big) => `<span class="rd-av${big ? ' big' : ''}" aria-hidden="true">${esc((name || '?').trim().charAt(0).toLocaleUpperCase('tr'))}</span>`;
const row = (S, p, sub) => `<li class="rd-row"><a class="rd-who" href="#okur/${encodeURIComponent(p.uid)}">${av(p.name)}<span><b>${esc(p.name || p.username)}</b><small>@${esc(p.username || '')}${sub ? ' · ' + esc(sub) : ''}</small></span></a>${relButton(S, p.uid)}</li>`;

// Keşfet > Okurlar: arama, gelen istekler, arkadaşlar, bekleyen istekler
export function viewReaders(S) {
  const inc = S.reqIn || [], out = S.reqOut || [], fr = S.friends || [];
  const res = S.people === 'loading' ? `<p class="lbl small">${T.searching}</p>` : Array.isArray(S.people)
    ? (S.people.length ? `<ul class="rd-list">${S.people.map(p => row(S, p)).join('')}</ul>` : `<p class="lbl small">${T.noOne}</p>`) : '';
  return `<form class="searchbar" id="people-form"><input name="q" type="search" required minlength="2" value="${esc(S.peopleQ || '')}" placeholder="${T.searchPh}" aria-label="${T.searchPh}" autocomplete="off" autocapitalize="none"><button class="pl ink" type="submit">${T.search}</button></form>
    <div id="people-res">${res}</div>
    ${inc.length ? `<div class="blk rule"><p class="cap">${T.incoming} · ${inc.length}</p><ul class="rd-list">${inc.map(r => `<li class="rd-row"><a class="rd-who" href="#okur/${encodeURIComponent(r.from)}">${av(r.fromName)}<span><b>${esc(r.fromName || r.fromUsername)}</b><small>@${esc(r.fromUsername || '')}</small></span></a><span class="rd-acts"><button type="button" class="pl sm on" data-act="faccept" data-id="${esc(r.from)}">${T.accept}</button><button type="button" class="pl sm" data-act="fdecline" data-id="${esc(r.from)}">${T.decline}</button></span></li>`).join('')}</ul></div>` : ''}
    <div class="blk rule"><p class="cap">${T.myFriends}${fr.length ? ' · ' + fr.length : ''}</p>${fr.length ? `<ul class="rd-list">${fr.map(f => row(S, { ...f, uid: f.id })).join('')}</ul>` : `<p class="lbl small">${T.noFriends}</p>`}</div>
    ${out.length ? `<div class="blk rule"><p class="cap">${T.waiting}</p><ul class="rd-list">${out.map(r => row(S, { uid: r.to, name: r.toName, username: r.toUsername })).join('')}</ul></div>` : ''}
    <p class="lbl small">${T.privacyLine}</p>`;
}

// Bir okurun sayfası (#okur/{uid}): yalnızca vitrindeki bilgiler
export function viewReader(S) {
  const p = S.reader;
  if (p === 'loading') return { right: `<p class="lbl">${T.searching}</p>` };
  if (!p) return { right: `<h1 class="kt sm">${T.hidden}</h1><p class="lbl">${T.hiddenSub}</p><a class="pl" href="#ara">${T.back}</a>` };
  const left = `<div class="lp-top"><a class="brand" href="#bugun">Kuytu</a><span class="cap">${T.reader}</span></div>
    <div class="exl">${av(p.name, true)}<h1 class="kt light sm">${esc(p.name || p.username)}</h1><p class="small">@${esc(p.username || '')}${p.city ? ' · ' + esc(p.city) : ''}${p.age ? ' · ' + esc(p.age) + ' ' + T.age : ''}</p>${p.bio ? `<p class="lbl">${esc(p.bio)}</p>` : ''}</div>
    <div class="lp-foot col">${relButton(S, p.uid, false)}</div>`;
  const book = b => `<div class="rd-book">${flat({ ...b, id: '' }, 110)}<b>${esc(b.title)}</b><small>${esc(b.author || '')}</small></div>`;
  const right = `${p.reading ? `<p class="cap">${T.nowReads}</p><div class="rd-now">${book(p.reading)}</div>` : ''}
    <p class="cap">${T.four}</p>
    ${(p.four || []).length ? `<div class="rd-four">${p.four.map(book).join('')}</div>` : `<p class="lbl small">${T.noFour}</p>`}
    <p class="lbl small">${T.onlyThis}</p>`;
  return { left, right, ribbon: T.reader.toLocaleUpperCase('tr'), book: p.reading ? { ...p.reading, id: 'okur-' + p.uid } : null };
}
