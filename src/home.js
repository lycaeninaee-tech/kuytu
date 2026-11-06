// Bugün, Okuma ve Arama sayfaları. Her sayfa iki parça döndürür: sol (kitabın rengi) ve sağ (kitap sayfası)
import { esc, dayKey, sessDay } from './util.js';
import { TN as N, T } from './strings.js';
import { streaks } from './takip.js';
import { flat, emLast, edge } from './parts.js';

const greet = () => { const h = new Date().getHours(); return h < 6 ? N.night : h < 12 ? N.morning : h < 18 ? N.noon : N.evening; };
const brand = (extra = '') => `<div class="lp-top"><a class="brand" href="#bugun">Kuytu</a>${extra ? `<span class="cap">${extra}</span>` : ''}</div>`;
// Bu haftanın günleri kitap sırtı gibi: okunan gün kitabın renginde, bugün altı çizili
const spines = S => {
  const days = new Set(S.sessions.map(sessDay)), mon = new Date(), today = dayKey(new Date());
  mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
  return `<div class="spines">${[0, 1, 2, 3, 4, 5, 6].map(i => { const d = new Date(mon); d.setDate(mon.getDate() + i); const k = dayKey(d); return `<span class="${days.has(k) ? 'on' : ''}${k === today ? ' now' : ''}" title="${esc(d.toLocaleDateString('tr-TR', { weekday: 'long' }))}"><small>${d.toLocaleDateString('tr-TR', { weekday: 'narrow' })}</small></span>`; }).join('')}</div>`;
};
export const readingBook = S => S.shelf.find(b => b.status === 'okuyorum');
// Kitabın aşağı yukarı ne zaman biteceği: başladığından beri gelinen sayfadan (son 45 gün içinde başladıysa),
// yoksa son iki haftanın sayfa kayıtlarından. İkisi de yoksa hiç söylenmez
const finishBy = (S, b, left) => {
  if (!left) return '';
  const since = (Date.now() - new Date(b.startedAt || b.addedAt || 0)) / 864e5;
  let perDay = b.page && since > 0 && since <= 45 ? b.page / Math.max(1, since) : 0;
  if (!perDay) {
    const from = Date.now() - 14 * 864e5;
    perDay = S.sessions.filter(s => s.bookId === b.id && new Date(s.at) >= from).reduce((n, s) => n + (Number(s.pages) || 0), 0) / 14;
  }
  if (!perDay) return '';
  const d = new Date(Date.now() + Math.ceil(left / perDay) * 864e5);
  return N.finishBy.replace('{d}', d.toLocaleDateString('tr-TR', d.getFullYear() === new Date().getFullYear() ? { day: 'numeric', month: 'long' } : { month: 'long', year: 'numeric' }));
};
// Bu hafta: günler, tek cümlelik özet ve kişinin kendi seçtiği gün hedefi
const week = (S, wk, wPages, wMin, streak, mon, mine) => {
  const days = new Set(wk.map(sessDay)).size, target = Number(S.profile.weekDays) || 3;
  const goal = days >= target ? N.wGoalDone : N.wGoalLeft.replace('{n}', target - days);
  const saved = (S.quotes || []).some(q => q.at && new Date(q.at) >= mon);
  return `<div class="blk wk rule"><p class="cap">${N.week}</p>
    <div class="wk-row">${spines(S)}<div class="wk-txt"><b>${N.weekLine.replace('{d}', days).replace('{p}', wPages).replace('{m}', wMin)}</b>
      <span>${N.wGoal.replace('{n}', target)} · ${goal} <button type="button" class="linkbtn" data-act="wdedit">${N.change}</button></span>
      ${streak > 1 ? `<span>${N.streakOn.replace('{n}', streak)}</span>` : ''}</div></div>
    ${S.wdEdit ? `<div class="wk-pick"><span>${N.wGoalSet}</span>${[1, 2, 3, 4, 5, 6, 7].map(n => `<button type="button" class="pl${n === target ? ' on' : ''}" data-act="wdays" data-v="${n}">${n}</button>`).join('')}</div>` : ''}
    ${mine && !saved ? `<a class="wk-q" href="#kitap/${encodeURIComponent(mine.id)}">${N.keepLine}</a>` : ''}</div>`;
};
// Yılın rafı: bu yıl biten kitaplar kapaklarıyla, hedefe kalanlar boş sırt. Altında yılın kalanını bilen, suçlamayan bir cümle
const yearShelf = (S, done, goal, year) => {
  const now = new Date(), start = new Date(now.getFullYear(), 0, 1), end = new Date(now.getFullYear() + 1, 0, 1);
  const weeks = Math.ceil((end - now) / (7 * 864e5)), more = Math.round(done.length / Math.max(1, (now - start) / 864e5) * ((end - now) / 864e5));
  const line = !goal ? (done.length ? N.yrNoGoal : N.yrEmpty)
    : done.length >= goal ? N.yrDone.replace('{n}', done.length)
    : done.length + more >= goal ? N.yrReach.replace('{w}', weeks)
    : more ? N.yrLeft.replace('{w}', weeks).replace('{p}', more) : N.yrWeeks.replace('{w}', weeks);
  const gaps = goal > done.length ? Math.min(goal - done.length, 40) : 0;
  return `<div class="blk ys"><p class="cap">${N.yearShelf.replace('{y}', year)}${goal ? ` · ${done.length} / ${goal}` : ''}</p>
    <div class="ys-row">${done.map(b => `<button type="button" data-act="openbook" data-id="${esc(b.id)}" aria-label="${esc(b.title)}" title="${esc(b.title)}">${flat(b, 50)}</button>`).join('')}${'<i class="ys-gap" aria-hidden="true"></i>'.repeat(gaps)}</div>
    <p class="lbl small">${line} <button type="button" class="linkbtn" data-act="ygedit">${goal ? N.goalEdit : N.goalSet}</button></p>
    ${S.ygEdit ? `<form id="yg-form" class="pagebar"><label>${N.goalAsk}<input name="goal" type="number" min="0" max="500" value="${goal || ''}" autofocus></label><button class="pl ink" type="submit">${T.save}</button></form>` : ''}</div>`;
};

// Bugün kişinin kendi okumasıdır: kitabı, haftası, yıl hedefi. Kulüp en altta tek satırlık bir köşe
export function viewToday(S, club) {
  const name = esc((S.profile.name || '').split(' ')[0]);
  const needsVerify = S.user.providerData.some(p => p.providerId === 'password') && !S.user.emailVerified;
  const reading = S.shelf.filter(x => x.status === 'okuyorum'), mine = reading[0], others = reading.slice(1, 4);
  const [now] = streaks(new Set(S.sessions.map(sessDay).filter(Boolean)));
  const pct = mine && mine.pages ? Math.min(100, Math.round((mine.page || 0) / mine.pages * 100)) : null;
  const left = mine && mine.pages ? Math.max(0, mine.pages - (mine.page || 0)) : 0;
  const waiting = S.shelf.filter(x => x.status === 'istiyorum' && !x.lentTo).slice(0, 4);
  const quote = S.quotes.length ? S.quotes[new Date().getDate() % S.quotes.length] : null;
  // Haftanın sayfası ve dakikası, yılın bitirilen kitapları
  const mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
  const wk = S.sessions.filter(s => new Date(s.at) >= mon);
  const wPages = wk.reduce((n, s) => n + (Number(s.pages) || 0), 0), wMin = Math.round(wk.reduce((n, s) => n + (Number(s.seconds) || 0), 0) / 60);
  const year = String(new Date().getFullYear()), doneList = S.shelf.filter(x => x.status === 'okudum' && String(x.finishedAt || '').startsWith(year)).sort((a, b) => String(a.finishedAt).localeCompare(String(b.finishedAt)));
  const goal = Number(S.profile.yearGoal) || 0, fin = mine && mine.pages ? finishBy(S, mine, left) : '';
  const cb = club && club.book;
  const lp = `${brand(mine ? N.colorOf : '')}
    <div class="lp-mid">${mine ? `<a href="#kitap/${encodeURIComponent(mine.id)}" aria-label="${esc(mine.title)}">${flat(mine, 250, 'big')}</a>` : `<a class="fc-empty" href="#ara"><span aria-hidden="true">+</span>${N.findFirst}</a>`}</div>
    <div class="lp-foot"><span>${mine ? esc(mine.author || '') : ''}</span>${mine && mine.pages ? `<span>${mine.page || 0} / ${mine.pages}</span>` : ''}</div>`;
  const right = `${needsVerify ? `<p class="notice">${T.verify} <button class="linkbtn" type="button" data-act="resend">${T.resend}</button></p>` : ''}
    <p class="lbl">${greet()} ${name}. ${mine ? N.leftOff2 : ''}</p>
    ${mine ? `<h1 class="kt">${emLast(mine.title)}</h1>
      ${pct !== null ? `${edge(mine, pct)}<p class="lbl small prog-note">%${pct} · ${N.pagesLeft.replace('{n}', left)}${fin ? ' · ' + fin : ''}</p>` : ''}
      <div class="acts"><button type="button" class="pl on kgo-big" data-act="kuytugo">${N.goRoom}</button><a class="pl" href="#kitap/${encodeURIComponent(mine.id)}">${N.bookPage}</a><button type="button" class="pl" data-act="quick">${N.addPage}</button></div>
      ${S.quick ? `<form id="quick-form" class="pagebar"><label>${N.whichPage}<input name="page" type="number" min="0" max="20000" value="${mine.page || ''}" autofocus></label><button class="pl ink" type="submit">${T.save}</button></form>` : ''}`
    : `<h1 class="kt">${N.emptyHero}</h1><p class="lbl">${N.emptySub}</p>
      <div class="acts"><a class="pl on" href="#ara">${N.findFirst}</a><button type="button" class="pl" data-act="scan">${N.scan}</button></div>
      ${waiting.length ? `<div class="blk rule"><p class="cap">${N.startOne}</p><div class="mini">${waiting.map(x => `<button type="button" data-act="startbook" data-id="${esc(x.id)}" aria-label="${esc(x.title)}" title="${esc(x.title)}">${flat(x, 88)}</button>`).join('')}</div><p class="lbl small">${N.startHint}</p></div>` : ''}`}
    ${S.socialHTML || ''}
    ${S.sessions.length ? week(S, wk, wPages, wMin, now, mon, mine) : ''}
    ${doneList.length || (goal && mine) ? yearShelf(S, doneList, goal, year) : ''}
    ${others.length ? `<div class="blk"><p class="cap">${N.alsoReading}</p><div class="mini">${others.map(x => `<button type="button" data-act="openbook" data-id="${esc(x.id)}" aria-label="${esc(x.title)}">${flat(x, 88)}</button>`).join('')}</div></div>` : ''}
    ${mine ? `<div class="two bottom">
      <div class="blk"><p class="cap">${N.waiting}</p><div class="mini">${waiting.map(x => `<button type="button" data-act="openbook" data-id="${esc(x.id)}" aria-label="${esc(x.title)}">${flat(x, 88)}</button>`).join('') || `<a class="lbl" href="#ara">${N.placeBook}</a>`}</div></div>
      ${quote ? `<div class="blk"><p class="cap">${N.todayLine}</p><p class="pq">“${esc(quote.text)}”</p><p class="cap">${esc((quote.book || '').toLocaleUpperCase('tr'))}</p></div>` : ''}
    </div>` : ''}
    <a class="clubline" href="${club ? `#k/${encodeURIComponent(club.id)}/ay` : '#kulup'}">${club && cb
      ? `<span class="cap">${esc(club.name).toLocaleUpperCase('tr')}</span><span>${esc(cb.title)}${cb.meetingDate ? ' · ' + N.meetOn + ' ' + esc(new Date(cb.meetingDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })) : ''}</span>`
      : `<span class="cap">${N.clubsCap}</span><span>${N.clubsInvite}</span>`}<span aria-hidden="true">→</span></a>`;
  return { left: lp, right, book: mine, ribbon: mine ? `S. ${mine.page || 0}` : '', folio: 1 };
}

// Oku sayfası kalktı (2026-11): oda, başka yerde okudum ve oturumlar kitap sayfasında
export function searchLeft(S) {
  return `${brand()}<h1 class="kt light lp-title">${N.exTitle}</h1><p class="lbl">${N.searchSmall}</p>
    <div class="lp-foot"><button type="button" class="pl on" data-act="scan">${N.scan}</button></div>`;
}
// Keşfet: kitap ve okur arama. Kulüp araması sonraki adımda; o zamana kadar düğmesi kapalı
export function exploreRight(S, books, readers) {
  const tab = S.exTab === 'okur' ? 'okur' : 'kitap', n = (S.reqIn || []).length;
  const b = (k, l) => `<button type="button" class="${tab === k ? 'on' : ''}" aria-pressed="${tab === k}" data-act="extab" data-v="${k}">${l}</button>`;
  return `<div class="seg ex-seg" role="group" aria-label="${N.exTitle}">${b('kitap', N.exBooks)}${b('okur', N.exReaders + (n ? ` <em class="badge">${n}</em>` : ''))}<button type="button" disabled title="${N.exSoonClubs}">${N.exClubs}</button></div>
    ${tab === 'okur' ? readers : books}`;
}
