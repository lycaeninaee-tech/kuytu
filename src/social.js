// Kitap yorumları ve sosyal akış (K6).
// reviews/{kitapAnahtarı__uid}: bir okurun bir kitap için tek yorumu ve puanı. Giriş yapmış herkes okur, yalnızca sahibi yazar.
// Kitap anahtarı ad ve yazarın soyadından üretilir; böylece farklı baskılardaki aynı kitabın yorumları bir arada durur.
import { collection, doc, getDocs, setDoc, addDoc, deleteDoc, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { fs } from './auth.js';
import { esc } from './util.js';
import { TR as T } from './strings.js';
import { flat } from './parts.js';
import { getPublic } from './people.js';

const fold = s => (s || '').toLocaleLowerCase('tr').replace(/\(.*?\)|\[.*?\]/g, '').split(':')[0]
  .replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c])).replace(/[^a-z0-9]/g, '');
export const bookKey = b => (fold(b.title).slice(0, 60) + '_' + fold((b.author || '').split(',')[0].trim().split(' ').pop()).slice(0, 30)).replace(/^_|_$/g, '') || 'kitap';
const when = iso => { if (!iso) return ''; const d = (Date.now() - new Date(iso)) / 864e5; return d < 1 ? T.today : d < 2 ? T.yesterday : d < 30 ? Math.floor(d) + ' ' + T.daysAgo : new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); };
const stars = n => `<span class="stars" aria-label="${n} / 5">${'★'.repeat(n || 0)}<span class="o">${'★'.repeat(5 - (n || 0))}</span></span>`;
const av = name => `<span class="rd-av sm" aria-hidden="true">${esc((name || '?').trim().charAt(0).toLocaleUpperCase('tr'))}</span>`;

export async function bookReviews(b) {
  const s = await getDocs(query(collection(fs, 'reviews'), where('bookKey', '==', bookKey(b)), limit(40)));
  return s.docs.map(d => ({ ...d.data(), id: d.id })).sort((x, y) => (y.at || '').localeCompare(x.at || ''));
}
export async function latestReviews(n = 30) {
  const s = await getDocs(query(collection(fs, 'reviews'), orderBy('at', 'desc'), limit(n)));
  return s.docs.map(d => ({ ...d.data(), id: d.id }));
}
export async function saveReview(S, b, { rating, text, spoiler }) {
  const key = bookKey(b), p = S.profile;
  await setDoc(doc(fs, 'reviews', key + '__' + S.user.uid), { uid: S.user.uid, name: p.name || p.username, username: p.username, bookKey: key, title: b.title, author: b.author || '', cover: b.cover && !b.cover.startsWith('data:') && b.cover.length < 600 ? b.cover : '', rating: Math.max(0, Math.min(5, Math.round(rating) || 0)), text: (text || '').slice(0, 2000), spoiler: !!spoiler, at: new Date().toISOString() });
}
// Arkadaş hareketleri: bir kitaba başlamak ve bitirmek. Bulunmamayı seçen okur için yazılmaz
export async function logActivity(S, type, b) {
  if (!S.profile || S.profile.findable === false || !b) return;
  await addDoc(collection(fs, 'activity'), { uid: S.user.uid, name: S.profile.name || S.profile.username, username: S.profile.username || '', type, bookKey: bookKey(b), title: b.title || '', author: b.author || '', cover: b.cover && !b.cover.startsWith('data:') && b.cover.length < 600 ? b.cover : '', at: new Date().toISOString() });
}
export async function latestActivity(n = 60) {
  const s = await getDocs(query(collection(fs, 'activity'), orderBy('at', 'desc'), limit(n)));
  return s.docs.map(d => ({ ...d.data(), id: d.id, kind: 'act' }));
}
export const removeReview =(S, b) => deleteDoc(doc(fs, 'reviews', bookKey(b) + '__' + S.user.uid));
// Arkadaşların vitrinleri: şu an ne okuduklarını göstermek için
export async function friendCards(S) {
  const list = await Promise.all((S.friends || []).slice(0, 24).map(f => getPublic(f.id).catch(() => null)));
  return list.filter(Boolean);
}

const isFriend = (S, uid) => (S.friends || []).some(f => f.id === uid);
// Bir yorum satırı; sürprizbozan yorum dokununca açılır
function reviewRow(S, r, withBook) {
  const mine = r.uid === S.user.uid, hide = r.spoiler && !mine && !(S.reveal && S.reveal.has(r.id));
  const who = `<a class="rv-who" href="#okur/${encodeURIComponent(r.uid)}">${av(r.name)}<b>${esc(r.name || r.username)}</b></a>`;
  const tag = mine ? `<em class="rv-tag">${T.you}</em>` : isFriend(S, r.uid) ? `<em class="rv-tag">${T.friend}</em>` : '';
  const book = withBook ? `<span class="rv-book"> · <i>${esc(r.title)}</i></span>` : '';
  const body = !r.text ? '' : hide ? `<button type="button" class="rv-spoil" data-act="rvreveal" data-id="${esc(r.id)}">${T.spoilerShow}</button>` : `<p>${esc(r.text)}</p>`;
  return `<li class="rv"><div class="rv-top">${who}${tag}${book}${r.rating ? stars(r.rating) : ''}<span class="rv-at">${when(r.at)}</span></div>${body}</li>`;
}

// Kitap sayfasındaki bölüm: senin yorumun ve okurların yorumları (arkadaşların önce)
export function reviewsSection(S, b) {
  const list = S.bookRevs && S.bookRevs.key === bookKey(b) ? S.bookRevs.list : null;
  const mine = list && list.find(r => r.uid === S.user.uid);
  const others = list ? list.filter(r => r.uid !== S.user.uid).sort((x, y) => isFriend(S, y.uid) - isFriend(S, x.uid)) : [];
  const rated = list ? list.filter(r => r.rating) : [];
  const avgN = rated.length ? (rated.reduce((a, r) => a + r.rating, 0) / rated.length) : 0;
  const rating = S.rvRating !== undefined ? S.rvRating : (mine ? mine.rating : b.rating || 0);
  const form = `<form id="review-form" class="rv-form">
      <div class="rate" role="group" aria-label="${T.yourRating}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${rating >= n ? 'on' : ''}" data-act="rvrate" data-v="${n}" aria-label="${n}">★</button>`).join('')}</div>
      <textarea name="text" rows="3" maxlength="2000" placeholder="${T.reviewPh}" aria-label="${T.reviewPh}">${esc(mine ? mine.text : '')}</textarea>
      <div class="rv-foot"><label class="check-row"><input type="checkbox" name="spoiler"${mine && mine.spoiler ? ' checked' : ''}>${T.spoiler}</label>${mine ? `<button type="button" class="linkbtn small" data-act="rvdel">${T.delete}</button>` : ''}<button class="pl on" type="submit">${mine ? T.update : T.share}</button></div>
    </form>`;
  const head = rated.length ? `<span class="lbl small">${stars(Math.round(avgN))} ${avgN.toFixed(1)} · ${rated.length} ${T.ratings}</span>` : '';
  return `<div class="rv-head"><p class="cap">${T.title}</p>${head}</div>${form}
    ${list === null ? `<p class="lbl small">${S.bookRevsErr ? T.offline : T.loading}</p>` : others.length ? `<ul class="rv-list">${others.map(r => reviewRow(S, r, false)).join('')}</ul>` : `<p class="lbl small">${T.none}</p>`}`;
}

// Bugün'deki sosyal bölüm: arkadaşların şu an ne okuyor, son yorumlar
export function socialBlock(S) {
  const fr = Array.isArray(S.friendCards) ? S.friendCards.filter(p => p.reading) : [];
  const feed = Array.isArray(S.feed) ? S.feed.slice().sort((x, y) => (isFriend(S, y.uid) - isFriend(S, x.uid)) || (y.at || '').localeCompare(x.at || '')).slice(0, 6) : null;
  // Arkadaşlarının son hareketleri: başladı, bitirdi
  const acts = Array.isArray(S.acts) ? S.acts.filter(a => isFriend(S, a.uid)).slice(0, 6) : [];
  const actRow = a => `<li class="act"><a class="rv-who" href="#okur/${encodeURIComponent(a.uid)}">${av(a.name)}<b>${esc((a.name || '').split(' ')[0])}</b></a><span>${a.type === 'finished' ? T.finished : T.started}</span><i>${esc(a.title)}</i><span class="rv-at">${when(a.at)}</span></li>`;
  const friendsRow = fr.length ? `<div class="soc-friends">${fr.map(p => `<a class="soc-fr" href="#okur/${encodeURIComponent(p.uid)}">${flat({ ...p.reading, id: '' }, 64)}<b>${esc((p.name || p.username).split(' ')[0])}</b><small>${esc(p.reading.title)}</small></a>`).join('')}</div>`
    : `<p class="lbl small">${(S.friends || []).length ? T.friendsQuiet : T.noFriends} <a href="#okurlar">${T.findReaders}</a></p>`;
  return `<section class="soc">
    <div class="soc-head"><p class="cap">${T.friendsNow}</p><a class="linkbtn small" href="#okurlar">${T.readers}</a></div>
    ${friendsRow}
    ${acts.length ? `<div class="soc-head"><p class="cap">${T.moves}</p></div><ul class="act-list">${acts.map(actRow).join('')}</ul>` : ''}
    <div class="soc-head"><p class="cap">${T.latest}</p></div>
    ${feed === null || S.feedErr ? `<p class="lbl small">${S.feedErr ? T.offline : T.loading}</p>` : feed.length ? `<ul class="rv-list">${feed.map(r => reviewRow(S, r, true)).join('')}</ul>` : `<p class="lbl small">${T.feedEmpty}</p>`}
  </section>`;
}
