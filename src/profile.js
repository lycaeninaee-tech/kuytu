// Profil: ex libris okuyucu kartı, dört kitap, damgalar ve yılın künyesi
import { esc, sessDay } from './util.js';
import { TP as T, TN as N, TF, TI } from './strings.js';
import { saveProfile } from './sessions.js';
import { streaks, viewHistory } from './takip.js';
import { flat } from './parts.js';
import { freshLogin } from './account.js';

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
// Hesabın ve verin: indir, takvime hatırlatıcı ekle, gizlilik, hesabı sil. Silme iki adımlı ve kullanıcı adıyla onaylanır
function account(S) {
  const del = S.delAsk ? (freshLogin(S.user)
    ? `<form id="del-form" class="delbox"><p><b>${N.delTitle}</b></p><p class="lbl small">${N.delWhat}</p><label>${N.delType}<input name="u" autocomplete="off" autocapitalize="none" spellcheck="false" required></label><button class="pl red" type="submit">${S.deleting ? N.delBusy : N.delGo}</button><button class="linkbtn small" type="button" data-act="delask">${N.cancel}</button></form>`
    : `<div class="delbox"><p><b>${N.delTitle}</b></p><p class="lbl small">${N.delFresh}</p><button class="pl" type="button" data-act="logout">${T.logout}</button><button class="linkbtn small" type="button" data-act="delask">${N.cancel}</button></div>`) : '';
  let theme = 'acik';
  try { theme = localStorage.getItem('kuytu-tema') || 'acik'; } catch (e) {}
  const find = S.profile.findable !== false;
  return `<div class="acct"><p class="cap">${N.account}</p>
    <div class="acct-row"><label class="check-row findme"><input type="checkbox" data-act="findme"${find ? ' checked' : ''}>${TF.findMe}</label></div>
    <p class="lbl small">${find ? TF.findOn : TF.findOff}</p>
    <div class="acct-row" role="group" aria-label="${N.look}"><span class="lbl small">${N.look}</span>${[['acik', N.lookLight], ['koyu', N.lookDark], ['sistem', N.lookAuto]].map(([k, l]) => `<button type="button" class="pl sm ${theme === k ? 'ink' : ''}" data-act="theme" data-v="${k}" aria-pressed="${theme === k}">${l}</button>`).join('')}</div>
    <div class="acct-row"><button class="pl" type="button" data-act="export">${N.export}</button><a class="pl" href="#gizlilik">${N.privacy}</a></div>
    <form id="ics-form" class="pagebar"><label>${N.remindAt}<input name="t" type="time" value="21:30" required></label><button class="pl" type="submit">${N.remind}</button></form>
    <p class="lbl small">${N.remindHint}</p>
    ${S.delAsk ? del : `<button class="linkbtn small danger" type="button" data-act="delask">${N.delAcc}</button>`}</div>`;
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
  // Sol taraf kişinin kimliği: ad, kullanıcı adı, tek cümle. Başkalarının ileride göreceği kart da yalnızca bunlar ve dört kitaptır
  const left = `<div class="lp-top"><a class="brand" href="#bugun">Kuytu</a>${colorBook ? `<span class="cap">${esc(colorBook.title.toLocaleUpperCase('tr'))}</span>` : ''}</div>
    <div class="exl"><p class="cap">${N.exlibris}</p><span class="exl-av">${esc((p.name || '?').charAt(0).toLocaleUpperCase('tr'))}</span><h1 class="kt light sm">${esc(p.name)}</h1><p class="small">@${esc(p.username)}${joined ? ' · ' + esc(joined) + ' ' + N.since : ''}</p>${p.bio ? `<p class="lbl">${esc(p.bio)}</p>` : ''}</div>
    <div class="lp-foot col"><a class="pl" href="#okurlar">${TF.myFriendsLink}${(S.friends || []).length ? ' · ' + S.friends.length : ''}</a><button class="pl" type="button" data-act="pedit">${T.edit}</button>${installBox(S)}<button class="pl" type="button" data-act="logout">${T.logout}</button></div>`;
  const right = `${editing ? `<form class="pagebar" id="profile-form"><label>${N.bioHint}<input name="bio" maxlength="160" value="${esc(p.bio || '')}" autofocus></label><button class="pl ink" type="submit">${T.save}</button></form>` : ''}
    <form id="about-form" class="about">
      <p class="cap">${TI.more}</p>
      <div class="about-row"><label>${TI.city}<input name="city" maxlength="60" value="${esc(p.city || '')}" autocomplete="address-level2"></label><label class="check-row"><input type="checkbox" name="showCity"${p.showCity ? ' checked' : ''}>${TI.show}</label></div>
      <div class="about-row"><label>${TI.birth}<input name="birthYear" type="number" min="1900" max="${new Date().getFullYear()}" inputmode="numeric" value="${esc(p.birthYear || '')}"></label><label class="check-row"><input type="checkbox" name="showAge"${p.showAge ? ' checked' : ''}>${TI.show}</label></div>
      <p class="lbl small">${TI.hint}</p><button class="pl" type="submit">${TI.save}</button>
    </form>
    <p class="cap">${N.four.toLocaleUpperCase('tr')}</p>
    <div class="four-row">${[0, 1, 2, 3].map(i => four[i] ? `<button type="button" data-act="openbook" data-id="${esc(four[i].id)}" aria-label="${esc(four[i].title)}">${flat(four[i], 132)}</button>` : `<a class="fc-add" href="#raf" aria-label="${N.addHeart}">+</a>`).join('')}</div>
    ${four.length < 4 ? `<p class="lbl small">${N.heartHint}</p>` : ''}
    <p class="cap onlyyou">${N.history}</p>
    ${viewHistory(S)}
    <div class="two">
      <div><p class="cap">${N.stamps.toLocaleUpperCase('tr')}</p><div class="stamps">${BADGES.map(([t, d, ok], i) => `<span class="stamp ${ok(data) ? 'won' : ''}" style="--r:${(i * 37) % 17 - 8}deg" title="${esc(d)}">${esc(t)}</span>`).join('')}</div><p class="lbl small">${N.stampHint}</p></div>
      <div><p class="cap">${N.kunye} · ${year}</p><div class="toc">
        <div><span>${N.doneBooks}</span><span class="dots"></span><span class="r">${yearBooks.length}${p.yearGoal ? ' / ' + p.yearGoal : ''}</span></div>
        <div><span>${N.pagesRead}</span><span class="dots"></span><span class="r">${yearPages}</span></div>
        ${longest ? `<div><span>${N.longest}</span><span class="dots"></span><span class="r">${esc(longest.title)}</span></div>` : ''}
        ${top && top.rating ? `<div><span>${N.bestLoved}</span><span class="dots"></span><span class="r">${esc(top.title)}</span></div>` : ''}
      </div><button class="pl ink" type="button" data-act="recapshare">${N.share}</button></div>
    </div>
    ${account(S)}`;
  return { left, right, book: colorBook, ribbon: 'EX LIBRIS', folio: 5 };
}
export async function profileSubmit(S, f) {
  await saveProfile(S.user.uid, { bio: f.bio.value.trim() });
  S.editProfile = false;
}
