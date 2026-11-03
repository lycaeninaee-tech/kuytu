// Bugün, Okuma ve Arama sayfaları. Her sayfa iki parça döndürür: sol (kitabın rengi) ve sağ (kitap sayfası)
import { esc, dayKey, sessDay } from './util.js';
import { TN as N, T } from './strings.js';
import { streaks, viewTakip } from './takip.js';
import { viewTimer, viewMusic } from './reading.js';
import { flat, emLast } from './parts.js';

const greet = () => { const h = new Date().getHours(); return h < 6 ? N.night : h < 12 ? N.morning : h < 18 ? N.noon : N.evening; };
const brand = (extra = '') => `<div class="lp-top"><a class="brand" href="#bugun">Kuytu</a>${extra ? `<span class="cap">${extra}</span>` : ''}</div>`;
// Bu haftanın günleri kitap sırtı gibi: okunan gün kitabın renginde
const spines = S => {
  const days = new Set(S.sessions.map(sessDay)), mon = new Date();
  mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
  return `<div class="spines">${[0, 1, 2, 3, 4, 5, 6].map(i => { const d = new Date(mon); d.setDate(mon.getDate() + i); return `<span class="${days.has(dayKey(d)) ? 'on' : ''}" title="${esc(d.toLocaleDateString('tr-TR', { weekday: 'long' }))}"></span>`; }).join('')}</div>`;
};
export const readingBook = S => S.shelf.find(b => b.status === 'okuyorum');

export function viewToday(S, club) {
  const name = esc((S.profile.name || '').split(' ')[0]);
  const needsVerify = S.user.providerData.some(p => p.providerId === 'password') && !S.user.emailVerified;
  const mine = readingBook(S), cb = club && club.book, b = mine || cb;
  const [now] = streaks(new Set(S.sessions.map(sessDay).filter(Boolean)));
  const clubLink = club ? `#k/${encodeURIComponent(club.id)}/ay` : '#kulup';
  const pct = mine && mine.pages ? Math.min(100, Math.round((mine.page || 0) / mine.pages * 100)) : null;
  const waiting = S.shelf.filter(x => x.status === 'istiyorum' && !x.lentTo && x !== mine).slice(0, 4);
  const quote = S.quotes.length ? S.quotes[new Date().getDate() % S.quotes.length] : null;
  const clubText = club && cb ? `${cb.meetingDate ? `${N.meetOn}: ${esc(new Date(cb.meetingDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }))}.` : N.meetNone} ${club.rs.map(r => `${esc(r.name)} %${r.pct}`).join(', ')}.${club.next ? ' ' + esc(N.nextPick.replace('{n}', club.next)) : ''}` : N.noClub;
  const left = `${brand(b ? N.colorOf : '')}
    <div class="lp-mid">${b ? `<a href="${mine ? '#kitap/' + encodeURIComponent(mine.id) : clubLink}" aria-label="${esc(b.title)}">${flat(b, 250, 'big')}</a>` : `<a class="fc-empty" href="#ara">${N.findFirst}</a>`}</div>
    <div class="lp-foot"><span>${N.colorHint}</span>${mine && mine.pages ? `<span>${mine.page || 0} / ${mine.pages}</span>` : ''}</div>`;
  const right = `${needsVerify ? `<p class="notice">${T.verify} <button class="linkbtn" type="button" data-act="resend">${T.resend}</button></p>` : ''}
    <p class="lbl">${greet()} ${name}. ${b ? (mine ? N.leftOff2 : N.clubReads2) : ''}</p>
    ${b ? `<h1 class="kt">${emLast(b.title)}</h1>
      <div class="acts">${mine ? `<a class="pl on" href="#okuma">${N.cont}</a><button type="button" class="pl" data-act="quick">${N.addPage}</button>` : `<a class="pl on" href="${clubLink}">${N.toClub}</a>`}</div>
      ${S.quick && mine ? `<form id="quick-form" class="pagebar"><label>${N.whichPage}<input name="page" type="number" min="0" max="20000" value="${mine.page || ''}" autofocus></label><button class="pl ink" type="submit">${T.save}</button></form>` : ''}
      ${pct !== null ? `<div class="prog"><span style="width:${pct}%"></span></div>` : ''}`
    : `<h1 class="kt">${N.emptyHero}</h1><div class="acts"><a class="pl on" href="#ara">${N.findFirst}</a></div>`}
    <div class="two rule">
      <a class="blk" href="${clubLink}"><p class="cap">${club ? esc(club.name).toLocaleUpperCase('tr') : N.clubMonth}</p><p class="dropp"><span class="drop">${esc(clubText.charAt(0))}</span>${clubText.slice(1)}</p></a>
      <div class="blk"><p class="cap">${N.week} · ${now} ${N.dayStreak.toLocaleUpperCase('tr')}</p>${spines(S)}<p class="lbl small">${N.spineNote}</p></div>
    </div>
    ${club && club.note ? `<aside class="marg"><p>“${esc(club.note.text)}”</p><span class="cap">${esc(club.note.byName || '')}${club.note.chapter ? ' · ' + N.chapter.toLocaleUpperCase('tr') + ' ' + club.note.chapter : ''}</span></aside>` : ''}
    <div class="two bottom">
      <div class="blk"><p class="cap">${N.waiting}</p><div class="mini">${waiting.map(x => `<button type="button" data-act="openbook" data-id="${esc(x.id)}" aria-label="${esc(x.title)}">${flat(x, 88)}</button>`).join('') || `<a class="lbl" href="#raf">${N.placeBook}</a>`}</div></div>
      ${quote ? `<div class="blk"><p class="cap">❦ ${N.todayLine}</p><p class="pq">“${esc(quote.text)}”</p><p class="cap">${esc((quote.book || '').toLocaleUpperCase('tr'))}</p></div>` : ''}
    </div>`;
  return { left, right, book: b, ribbon: mine ? `S. ${mine.page || 0}` : '', folio: 1 };
}

function quotes(S, cur) {
  const list = S.quotes || [];
  return `<section class="surface"><h3>${N.quotes}</h3>
    ${list.slice(0, 6).map(q => `<figure class="quote"><blockquote>“${esc(q.text)}”</blockquote><figcaption>${esc(q.book || '')} · <button type="button" class="linkbtn small" data-act="qdel" data-id="${esc(q.id)}">${N.del}</button></figcaption></figure>`).join('') || `<p class="muted small">${N.noQuotes}</p>`}
    <form id="quote-form" class="panel"><label>${N.addQuote}<textarea name="text" rows="2" required maxlength="1000"></textarea></label><input type="hidden" name="book" value="${esc(cur ? cur.title : '')}"><button class="pl" type="submit">${T.save}</button></form></section>`;
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
