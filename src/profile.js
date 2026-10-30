// Profil: kişisel bilgiler, yıllık hedef ve rozetler
import { esc } from './util.js';
import { TP as T } from './strings.js';
import { saveProfile } from './sessions.js';
import { streaks } from './takip.js';
import { sessDay } from './util.js';

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
  const done = S.shelf.filter(b => b.status === 'okudum');
  const yearDone = done.filter(b => (b.finishedAt || '').startsWith(year)).length;
  const [, best] = streaks(new Set(S.sessions.map(sessDay).filter(Boolean)));
  const data = { sessions: S.sessions.length, done: done.length, shelf: S.shelf.length, best, pages: S.sessions.reduce((a, s) => a + (s.pages || 0), 0), rated: S.shelf.filter(b => b.rating).length };
  const reading = S.shelf.filter(b => b.status === 'okuyorum');
  const favs = [[T.favBook, p.favBook], [T.favAuthor, p.favAuthor], [T.genres, p.genres], [T.quote, p.quote]].filter(x => x[1]);
  const field = (name, label, val, wide) => `<label class="${wide ? 'wide' : ''}">${label}<input name="${name}" maxlength="200" value="${esc(val || '')}"></label>`;
  return `<section class="profile-head"><p class="label">${T.title}</p><h2>${esc(p.name)}</h2><p class="muted">@${esc(p.username)}</p>${p.bio ? `<p>${esc(p.bio)}</p>` : ''}</section>
    <div class="habit" style="margin-top:18px">
    ${editing ? `<form class="surface" id="profile-form"><div class="form-grid">
      <label class="wide">${T.bio}<textarea name="bio" rows="3" maxlength="500">${esc(p.bio || '')}</textarea></label>
      ${field('genres', T.genres, p.genres)}${field('favBook', T.favBook, p.favBook)}${field('favAuthor', T.favAuthor, p.favAuthor)}
      <label>${T.yearGoal}<input name="yearGoal" type="number" min="0" max="500" value="${p.yearGoal || ''}"></label>
      ${field('quote', T.quote, p.quote, true)}</div><button class="btn" type="submit">${T.save}</button></form>`
    : `<section class="surface"><h3>${T.about}</h3>${favs.length ? `<div class="favs">${favs.map(([k, v]) => `<p>${k}: <b>${esc(v)}</b></p>`).join('')}</div>` : `<p class="muted">${T.empty}</p>`}<button class="btn ghost share" type="button" data-act="pedit">${T.edit}</button></section>`}
    <div class="statrow three"><div><b>${yearDone}${p.yearGoal ? ' / ' + p.yearGoal : ''}</b><span>${T.yearDone}</span></div>${reading.length ? `<div><b>${esc(reading[0].title)}</b><span>${T.now}</span></div>` : ''}</div>
    <section class="surface"><h3>${T.badges}</h3><div class="badges">${BADGES.map(([t, d, ok]) => `<div class="badge ${ok(data) ? 'won' : ''}"><b>${t}</b><span>${d}</span></div>`).join('')}</div></section>
    <div class="ractions left"><a class="btn ghost" href="#raf">${T.myShelf}</a><a class="btn ghost" href="#kulup">${T.myClubs}</a><button class="btn ghost" type="button" data-act="logout">${T.logout}</button></div>
    </div>`;
}
export async function profileSubmit(S, f) {
  await saveProfile(S.user.uid, { bio: f.bio.value.trim(), genres: f.genres.value.trim(), favBook: f.favBook.value.trim(), favAuthor: f.favAuthor.value.trim(), quote: f.quote.value.trim(), yearGoal: Number(f.yearGoal.value) || 0 });
  S.editProfile = false;
}
