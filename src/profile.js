// Profil: okuyucu kartı, dört kitap, damgalar ve yıl özeti
import { esc, sessDay } from './util.js';
import { TP as T, TN as N } from './strings.js';
import { saveProfile } from './sessions.js';
import { streaks } from './takip.js';
import { coverHTML, CAT, setAmbient } from './parts.js';

const BADGES = [
  ['İlk adım', 'İlk okuma kaydın', d => d.sessions >= 1],
  ['Kitap kurdu', '5 kitap bitir', d => d.done >= 5],
  ['Raf dolusu', '20 kitabı rafına ekle', d => d.shelf >= 20],
  ['Bir hafta', '7 günlük seri', d => d.best >= 7],
  ['Bir ay', '30 günlük seri', d => d.best >= 30],
  ['Bin sayfa', '1000 sayfa oku', d => d.pages >= 1000],
  ['Eleştirmen', '10 kitaba puan ver', d => d.rated >= 10],
];
export function viewProfile(S) {
  const p = S.profile, editing = S.editProfile, year = String(new Date().getFullYear());
  const done = S.shelf.filter(b => b.status === 'okudum'), yearBooks = done.filter(b => (b.finishedAt || '').startsWith(year));
  const [, best] = streaks(new Set(S.sessions.map(sessDay).filter(Boolean)));
  const data = { sessions: S.sessions.length, done: done.length, shelf: S.shelf.length, best, pages: S.sessions.reduce((a, s) => a + (s.pages || 0), 0), rated: S.shelf.filter(b => b.rating).length };
  const yearPages = S.sessions.filter(s => sessDay(s).startsWith(year)).reduce((a, s) => a + (s.pages || 0), 0);
  const longest = yearBooks.slice().sort((a, b) => (b.pages || 0) - (a.pages || 0))[0], top = yearBooks.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
  const reading = S.shelf.find(b => b.status === 'okuyorum'), four = S.shelf.filter(b => b.fav).slice(0, 4);
  setAmbient(reading && reading.title);
  const field = (name, label, val, wide) => `<label class="${wide ? 'wide' : ''}">${label}<input name="${name}" maxlength="200" value="${esc(val || '')}"></label>`;
  return `<div class="prof">
    <div class="prof-side">
      <div class="kart"><span class="deco kart-cat">${CAT}</span><p class="lbl">${N.readerCard}</p>
        <div class="kart-top"><span class="kart-av">${esc((p.name || '?').charAt(0).toLocaleUpperCase('tr'))}</span><div><h1>${esc(p.name)}</h1><p>@${esc(p.username)}</p></div></div>
        ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}${reading ? `<p class="kart-now">${T.now}: ${esc(reading.title)}</p>` : ''}</div>
      ${p.moods && p.moods.length ? `<div><p class="lbl">${N.style}</p><p class="style-line">${esc(p.moods.join(', '))}</p></div>` : ''}
      ${editing ? `<form class="surface" id="profile-form"><div class="form-grid">
        <label class="wide">${T.bio}<textarea name="bio" rows="3" maxlength="500">${esc(p.bio || '')}</textarea></label>
        ${field('genres', T.genres, p.genres)}${field('favBook', T.favBook, p.favBook)}${field('favAuthor', T.favAuthor, p.favAuthor)}
        <label>${T.yearGoal}<input name="yearGoal" type="number" min="0" max="500" value="${p.yearGoal || ''}"></label>
        ${field('quote', T.quote, p.quote, true)}</div><button class="btn" type="submit">${T.save}</button></form>`
    : `<div class="actions"><button class="btn ghost" type="button" data-act="pedit">${T.edit}</button><button class="btn ghost" type="button" data-act="logout">${T.logout}</button></div>`}
    </div>
    <div class="prof-main">
      <section><p class="lbl">${N.four}</p><div class="four">${[0, 1, 2, 3].map(i => `<a class="four-arch" href="${four[i] ? '#kitap/' + encodeURIComponent(four[i].id) : '#raf'}">${four[i] ? coverHTML(four[i]) : `<span class="four-add">${N.addHeart}</span>`}</a>`).join('')}</div></section>
      <div class="prof-low">
        <section><p class="lbl">${N.stamps}</p><div class="stamps">${BADGES.map(([t, d, ok], i) => `<span class="stamp ${ok(data) ? 'won' : ''}" style="--r:${(i * 37) % 17 - 8}deg" title="${esc(d)}">${esc(t)}</span>`).join('')}</div><p class="small muted">${N.stampHint}</p></section>
        <section class="glass"><p class="lbl">${year} ${N.summary}</p>
          <div class="row"><span>${N.doneBooks}</span><b>${yearBooks.length}${p.yearGoal ? ' / ' + p.yearGoal : ''}</b></div>
          <div class="row"><span>${N.pagesRead}</span><b>${yearPages}</b></div>
          ${longest ? `<div class="row"><span>${N.longest}</span><b>${esc(longest.title)}</b></div>` : ''}
          ${top && top.rating ? `<div class="row"><span>${N.bestLoved}</span><b>${esc(top.title)}</b></div>` : ''}
          <button class="btn" type="button" data-act="recapshare">${N.share}</button></section>
      </div>
    </div></div>`;
}
export async function profileSubmit(S, f) {
  await saveProfile(S.user.uid, { bio: f.bio.value.trim(), genres: f.genres.value.trim(), favBook: f.favBook.value.trim(), favAuthor: f.favAuthor.value.trim(), quote: f.quote.value.trim(), yearGoal: Number(f.yearGoal.value) || 0 });
  S.editProfile = false;
}
