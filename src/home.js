// Bugün, Okuma ve Arama sayfaları. Her sayfa iki parça döndürür: sol (kitabın rengi) ve sağ (kitap sayfası)
import { esc, dayKey, sessDay } from './util.js';
import { TN as N, T } from './strings.js';
import { streaks, viewTakip } from './takip.js';
import { viewTimer, viewMusic } from './reading.js';
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
// Kitabın aşağı yukarı ne zaman biteceği: son iki haftanın sayfa kayıtlarından, yoksa başladığından beri gelinen sayfadan.
// Başlangıcı bilinmeyen ya da çok eski olan kitapta hiç söylenmez
const finishBy = (S, b, left) => {
  if (!left) return '';
  const from = Date.now() - 14 * 864e5, logged = S.sessions.filter(s => s.bookId === b.id && new Date(s.at) >= from).reduce((n, s) => n + (Number(s.pages) || 0), 0);
  let perDay = logged / 14;
  if (!perDay && b.page) {
    const since = (Date.now() - new Date(b.startedAt || b.addedAt || 0)) / 864e5;
    if (since > 0 && since <= 45) perDay = b.page / Math.max(1, since);
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
    ${mine && !saved ? `<a class="wk-q" href="#okuma">${N.keepLine}</a>` : ''}</div>`;
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
    <div class="lp-mid">${mine ? `<a href="#kitap/${encodeURIComponent(mine.id)}" aria-label="${esc(mine.title)}">${flat(mine, 250, 'big')}</a>` : `<a class="fc-empty" href="#ara">${N.findFirst}</a>`}</div>
    <div class="lp-foot"><span>${mine ? esc(mine.author || '') : ''}</span>${mine && mine.pages ? `<span>${mine.page || 0} / ${mine.pages}</span>` : ''}</div>`;
  const right = `${needsVerify ? `<p class="notice">${T.verify} <button class="linkbtn" type="button" data-act="resend">${T.resend}</button></p>` : ''}
    <p class="lbl">${greet()} ${name}. ${mine ? N.leftOff2 : ''}</p>
    ${mine ? `<h1 class="kt">${emLast(mine.title)}</h1>
      ${pct !== null ? `${edge(mine, pct)}<p class="lbl small prog-note">%${pct} · ${N.pagesLeft.replace('{n}', left)}${fin ? ' · ' + fin : ''}</p>` : ''}
      <div class="acts"><a class="pl on" href="#okuma">${N.cont}</a><button type="button" class="pl" data-act="quick">${N.addPage}</button></div>
      ${S.quick ? `<form id="quick-form" class="pagebar"><label>${N.whichPage}<input name="page" type="number" min="0" max="20000" value="${mine.page || ''}" autofocus></label><button class="pl ink" type="submit">${T.save}</button></form>` : ''}`
    : `<h1 class="kt">${N.emptyHero}</h1><div class="acts"><a class="pl on" href="#ara">${N.findFirst}</a></div>`}
    ${week(S, wk, wPages, wMin, now, mon, mine)}
    ${yearShelf(S, doneList, goal, year)}
    ${others.length ? `<div class="blk"><p class="cap">${N.alsoReading}</p><div class="mini">${others.map(x => `<button type="button" data-act="openbook" data-id="${esc(x.id)}" aria-label="${esc(x.title)}">${flat(x, 88)}</button>`).join('')}</div></div>` : ''}
    <div class="two bottom">
      <div class="blk"><p class="cap">${N.waiting}</p><div class="mini">${waiting.map(x => `<button type="button" data-act="openbook" data-id="${esc(x.id)}" aria-label="${esc(x.title)}">${flat(x, 88)}</button>`).join('') || `<a class="lbl" href="#ara">${N.placeBook}</a>`}</div></div>
      ${quote ? `<div class="blk"><p class="cap">${N.todayLine}</p><p class="pq">“${esc(quote.text)}”</p><p class="cap">${esc((quote.book || '').toLocaleUpperCase('tr'))}</p></div>` : ''}
    </div>
    <a class="clubline" href="${club ? `#k/${encodeURIComponent(club.id)}/ay` : '#kulup'}">${club && cb
      ? `<span class="cap">${esc(club.name).toLocaleUpperCase('tr')}</span><span>${esc(cb.title)}${cb.meetingDate ? ' · ' + N.meetOn + ' ' + esc(new Date(cb.meetingDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })) : ''}</span>`
      : `<span class="cap">${N.clubsCap}</span><span>${N.clubsInvite}</span>`}<span aria-hidden="true">→</span></a>`;
  return { left: lp, right, book: mine, ribbon: mine ? `S. ${mine.page || 0}` : '', folio: 1 };
}

function quotes(S, cur) {
  const list = S.quotes || [];
  return `<section class="surface"><h3>${N.quotes}</h3>
    ${list.slice(0, 6).map(q => `<figure class="quote"><blockquote>“${esc(q.text)}”</blockquote><figcaption>${esc(q.book || '')} · <button type="button" class="linkbtn small" data-act="qdel" data-id="${esc(q.id)}">${N.del}</button></figcaption></figure>`).join('') || `<p class="muted small">${N.noQuotes}</p>`}
    <form id="quote-form" class="panel"><label>${N.addQuote}<textarea name="text" rows="2" required maxlength="1000"></textarea></label><input type="hidden" name="book" value="${esc(cur ? cur.title : '')}"><input type="hidden" name="bookId" value="${esc(cur ? cur.id : '')}"><button class="pl" type="submit">${T.save}</button></form></section>`;
}
export function viewOkuma(S) {
  const cur = readingBook(S) || S.shelf.find(b => b.status === 'istiyorum');
  const [now] = streaks(new Set(S.sessions.map(sessDay).filter(Boolean)));
  const left = `${brand()}
    <div class="ok-head">${cur ? flat(cur, 104) : ''}<h1 class="kt light">${N.enterTitle.split(' ')[0]} <i>${N.enterTitle.split(' ').slice(1).join(' ')}</i></h1></div>
    <p class="lbl">${N.enterSub}</p>
    ${viewTimer(S)}`;
  const right = `${viewMusic(S)}${quotes(S, cur)}${viewTakip(S)}`;
  return { left, right, book: cur, ribbon: `${now} ${N.dayStreak.split(' ')[0].toLocaleUpperCase('tr')}`, folio: 4 };
}
export function searchLeft(S) {
  return `${brand()}<h1 class="kt light lp-title">Kitap <i>ara</i></h1><p class="lbl">${N.searchSmall}</p>
    <div class="lp-foot"><button type="button" class="pl on" data-act="scan">${N.scan}</button></div>`;
}
