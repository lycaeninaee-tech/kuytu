// Bildirimler: ayrı bir veri tutulmaz, canlı izlenen isteklerden ve arkadaş listesinden üretilir.
// Gelen arkadaşlık isteği, kabul edilen isteğin (yeni arkadaş) ve kurucusu olduğun kulübe gelen katılma isteği.
// Görülenler bu cihazda hatırlanır (kuytu-bildirim-<uid>); uygulama açıkken yeni gelen için kısa uyarı çıkar.
import { esc } from './util.js';
import { TNo as T } from './strings.js';

const key = S => 'kuytu-bildirim-' + (S.user ? S.user.uid : '');
const load = S => { try { return new Set(JSON.parse(localStorage.getItem(key(S)) || '[]')); } catch (e) { return new Set(); } };
const store = (S, set) => { try { localStorage.setItem(key(S), JSON.stringify([...set].slice(-300))); } catch (e) {} };

// Bildirim listesi: en yeni üstte
export function items(S) {
  const out = [];
  (S.reqIn || []).forEach(r => out.push({ id: 'fr_' + r.from, at: r.at, kind: 'friendReq', uid: r.from, name: r.fromName || r.fromUsername }));
  // Benim gönderdiğim istek kabul edilmişse karşı taraf arkadaş listeme yazılır; listede olup daha önce görmediklerim "kabul etti" olur
  (S.friends || []).forEach(f => out.push({ id: 'fa_' + f.id, at: f.since, kind: 'friendNew', uid: f.id, name: f.name || f.username }));
  (S.clubReqs || []).filter(r => !r.approved).forEach(r => out.push({ id: 'cr_' + r.id, at: r.at, kind: 'clubReq', uid: r.uid, name: r.name, club: r.clubName, clubId: r.clubId }));
  return out.sort((a, b) => (b.at || '').localeCompare(a.at || ''));
}
export const unseen = S => { const seen = load(S); return items(S).filter(i => !seen.has(i.id)); };
export function markSeen(S) { const seen = load(S); items(S).forEach(i => seen.add(i.id)); store(S, seen); }

// İlk açılışta mevcut arkadaşlar "yeni" sayılmasın: liste ilk kez yüklenince görüldü işaretlenir
export function primeFriends(S) {
  const k = key(S) + '-ilk';
  let done = false;
  try { done = localStorage.getItem(k) === '1'; } catch (e) {}
  if (done) return;
  const seen = load(S); (S.friends || []).forEach(f => seen.add('fa_' + f.id)); store(S, seen);
  try { localStorage.setItem(k, '1'); } catch (e) {}
}

// Uygulama açıkken yeni gelen bildirim için kısa uyarı; aynı bildirim bir kez
const toasted = new Set();
export function announce(S, toast) {
  unseen(S).forEach(i => {
    if (toasted.has(i.id)) return;
    toasted.add(i.id);
    toast(line(i, true));
  });
}
const line = (i, plain) => {
  const n = plain ? i.name : `<b>${esc(i.name || '')}</b>`;
  if (i.kind === 'friendReq') return `${n} ${T.friendReq}`;
  if (i.kind === 'friendNew') return `${n} ${T.friendNew}`;
  return `${n} ${T.clubReq.replace('{c}', plain ? i.club : esc(i.club || ''))}`;
};
export function bell(S) {
  const n = unseen(S).length;
  return `<span class="bellwrap"><button type="button" class="bell" data-act="bell" aria-haspopup="true" aria-expanded="${!!S.bellOpen}" aria-label="${T.title}${n ? ', ' + n + ' ' + T.newWord : ''}">${n ? `<em class="badge">${n}</em>` : ''}</button>
    ${S.bellOpen ? panel(S) : ''}</span>`;
}
function panel(S) {
  const list = items(S).slice(0, 20), seen = load(S);
  const acts = i => i.kind === 'friendReq' ? `<span class="nt-acts"><button type="button" class="pl sm on" data-act="faccept" data-id="${esc(i.uid)}">${T.accept}</button><button type="button" class="pl sm" data-act="fdecline" data-id="${esc(i.uid)}">${T.decline}</button></span>`
    : i.kind === 'clubReq' ? `<a class="pl sm" href="#k/${encodeURIComponent(i.clubId)}/uyeler">${T.see}</a>` : '';
  return `<span class="ntpanel" role="dialog" aria-label="${T.title}"><b class="nt-h">${T.title}</b>
    ${list.length ? `<ul class="nt-list">${list.map(i => `<li class="${seen.has(i.id) ? '' : 'new'}"><a href="#okur/${encodeURIComponent(i.uid)}">${line(i)}</a>${acts(i)}</li>`).join('')}</ul>` : `<p class="lbl small">${T.none}</p>`}</span>`;
}
