// Profil: ex libris okuyucu kartı, dört kitap, damgalar ve yılın künyesi
import { esc, sessDay } from './util.js';
import { TP as T, TN as N } from './strings.js';
import { saveProfile } from './sessions.js';
import { streaks } from './takip.js';
import { flat } from './parts.js';

const BADGES = [
  ['İlk adım', 'İlk okuma kaydın', d => d.sessions >= 1],
  ['Kitap kurdu', '5 kitap bitir', d => d.done >= 5],
  ['Raf dolusu', '20 kitabı rafına ekle', d => d.shelf >= 20],
  ['Bir hafta', '7 günlük seri', d => d.best >= 7],
  ['Bir ay', '30 günlük seri', d => d.best >= 30],
  ['Bin sayfa', '1000 sayfa oku', d => d.pages >= 1000],
  ['Eleştirmen', '10 kitaba puan ver', d => d.rated >= 10],
];
// Uygulama olarak kurma: Android ve bilgisayarda tarayıcının kendi penceresi, iPhone'da Safari'nin Ana Ekrana Ekle adımı
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
function installBox(S) {
  if (standalone()) return `<p class="lbl small">${N.installed}</p>`;
  if (S.installEvt) return `<button class="pl on" type="button" data-act="install">${N.install}</button>`;
  return isIos() ? `<p class="lbl small">${N.installIos}</p>` : '';
}
export function viewProfile(S) {
  const p = S.profile, editing = S.editProfile, year = String(new Date().getFullYear());
  const done = S.shelf.filter(b => b.status === 'okudum'), yearBooks = done.filter(b => (b.finishedAt || '').startsWith(year));
  const [, best] = streaks(new Set(S.sessions.map(sessDay).filter(Boolean)));
  const data = { sessions: S.sessions.length, done: done.length, shelf: S.shelf.length, best, pages: S.sessions.reduce((a, s) => a + (s.pages || 0), 0), rated: S.shelf.filter(b => b.rating).length };
  const yearPages = S.sessions.filter(s => sessDay(s).startsWith(year)).reduce((a, s) => a + (s.pages || 0), 0);
  const longest = yearBooks.slice().sort((a, b) => (b.pages || 0) - (a.pages || 0))[0], top = yearBooks.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  const four = S.shelf.filter(b => b.fav).slice(0, 4), colorBook = four[0] || S.shelf.find(b => b.status === 'okuyorum');
  const joined = p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }) : '';
  const field = (name, label, val, wide) => `<label class="${wide ? 'wide' : ''}">${label}<input name="${name}" maxlength="200" value="${esc(val || '')}"></label>`;
  const left = `<div class="lp-top"><a class="brand" href="#bugun">Kuytu</a>${colorBook ? `<span class="cap">${esc(colorBook.title.toLocaleUpperCase('tr'))}</span>` : ''}</div>
    <div class="exl"><p class="cap">${N.exlibris}</p><span class="exl-av">${esc((p.name || '?').charAt(0).toLocaleUpperCase('tr'))}</span><h1 class="kt light sm">${esc(p.name)}</h1><p class="small">@${esc(p.username)}${joined ? ' · ' + esc(joined) + ' ' + N.since : ''}</p>${p.bio ? `<p class="lbl">${esc(p.bio)}</p>` : ''}</div>
    ${p.moods && p.moods.length ? `<div><p class="cap">${N.style.toLocaleUpperCase('tr')}</p><p class="pq light">${esc(p.moods.join(', '))}.</p></div>` : ''}
    ${(S.myClubs || []).length ? `<div class="ix"><p class="cap">${N.clubsMine}</p>${S.myClubs.map(c => `<a href="#k/${encodeURIComponent(c.id)}/ay"><span>${esc(c.name)}</span><span class="cap">${c.role === 'kurucu' ? N.owner : N.memberW}</span></a>`).join('')}</div>` : ''}
    <div class="lp-foot col"><button class="pl" type="button" data-act="pedit">${T.edit}</button>${installBox(S)}<button class="pl" type="button" data-act="logout">${T.logout}</button></div>`;
  const right = `${editing ? `<form class="surface" id="profile-form"><div class="form-grid">
      <label class="wide">${T.bio}<textarea name="bio" rows="3" maxlength="500">${esc(p.bio || '')}</textarea></label>
      ${field('genres', T.genres, p.genres)}${field('favBook', T.favBook, p.favBook)}${field('favAuthor', T.favAuthor, p.favAuthor)}
      <label>${T.yearGoal}<input name="yearGoal" type="number" min="0" max="500" value="${p.yearGoal || ''}"></label>
      ${field('quote', T.quote, p.quote, true)}</div><button class="pl on" type="submit">${T.save}</button></form>` : ''}
    <p class="cap">${N.four.toLocaleUpperCase('tr')}</p>
    <div class="four-row">${[0, 1, 2, 3].map(i => four[i] ? `<button type="button" data-act="openbook" data-id="${esc(four[i].id)}" aria-label="${esc(four[i].title)}">${flat(four[i], 132)}</button>` : `<a class="fc-add" href="#raf" aria-label="${N.addHeart}">+</a>`).join('')}</div>
    ${four.length < 4 ? `<p class="lbl small">${N.heartHint}</p>` : ''}
    <div class="two">
      <div><p class="cap">${N.stamps.toLocaleUpperCase('tr')}</p><div class="stamps">${BADGES.map(([t, d, ok], i) => `<span class="stamp ${ok(data) ? 'won' : ''}" style="--r:${(i * 37) % 17 - 8}deg" title="${esc(d)}">${esc(t)}</span>`).join('')}</div><p class="lbl small">${N.stampHint}</p></div>
      <div><p class="cap">${N.kunye} · ${year}</p><div class="toc">
        <div><span>${N.doneBooks}</span><span class="dots"></span><span class="r">${yearBooks.length}${p.yearGoal ? ' / ' + p.yearGoal : ''}</span></div>
        <div><span>${N.pagesRead}</span><span class="dots"></span><span class="r">${yearPages}</span></div>
        ${longest ? `<div><span>${N.longest}</span><span class="dots"></span><span class="r">${esc(longest.title)}</span></div>` : ''}
        ${top && top.rating ? `<div><span>${N.bestLoved}</span><span class="dots"></span><span class="r">${esc(top.title)}</span></div>` : ''}
      </div><button class="pl ink" type="button" data-act="recapshare">${N.share}</button></div>
    </div>`;
  return { left, right, book: colorBook, ribbon: 'EX LIBRIS', folio: 5 };
}
export async function profileSubmit(S, f) {
  await saveProfile(S.user.uid, { bio: f.bio.value.trim(), genres: f.genres.value.trim(), favBook: f.favBook.value.trim(), favAuthor: f.favAuthor.value.trim(), quote: f.quote.value.trim(), yearGoal: Number(f.yearGoal.value) || 0 });
  S.editProfile = false;
}
