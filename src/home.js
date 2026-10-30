// Bugün ve Okuma ekranları
import { esc, dayKey, sessDay } from './util.js';
import { TN as N, T } from './strings.js';
import { streaks, viewTakip } from './takip.js';
import { viewOda } from './reading.js';
import { book3d, arch, MOON, star, WAVE, CAT, setAmbient } from './parts.js';

const greet = () => { const h = new Date().getHours(); return h < 6 ? N.night : h < 12 ? N.morning : h < 18 ? N.noon : N.evening; };
const emLast = s => { const w = esc(s || '').split(' '); return w.length > 1 ? w.slice(0, -1).join(' ') + ' <i>' + w[w.length - 1] + '</i>' : w[0]; };
const weekDots = S => {
  const days = new Set(S.sessions.map(sessDay)), mon = new Date();
  mon.setDate(mon.getDate() - (mon.getDay() + 6) % 7);
  return `<div class="dots">${[0, 1, 2, 3, 4, 5, 6].map(i => { const d = new Date(mon); d.setDate(mon.getDate() + i); return `<span class="${days.has(dayKey(d)) ? 'on' : ''}" title="${esc(d.toLocaleDateString('tr-TR', { weekday: 'long' }))}"></span>`; }).join('')}</div>`;
};
const heroArch = (b, w) => arch(`<div class="glow"></div>${MOON}${star('20%', '26%', 18)}${star('74%', '20%', 13, 1.4)}<div class="arch-book">${book3d(b, w)}</div>`, 'hero-arch');

export function viewToday(S, club) {
  const name = esc((S.profile.name || '').split(' ')[0]);
  const needsVerify = S.user.providerData.some(p => p.providerId === 'password') && !S.user.emailVerified;
  const mine = S.shelf.find(b => b.status === 'okuyorum'), cb = club && club.book, b = mine || cb;
  const [now] = streaks(new Set(S.sessions.map(sessDay).filter(Boolean)));
  const month = dayKey(new Date()).slice(0, 7), mPages = S.sessions.filter(s => sessDay(s).startsWith(month)).reduce((a, s) => a + (s.pages || 0), 0);
  setAmbient(b && b.title);
  const clubLink = club ? `#k/${encodeURIComponent(club.id)}/ay` : '#kulup';
  const pct = mine && mine.pages ? Math.min(100, Math.round((mine.page || 0) / mine.pages * 100)) : null;
  const clubBox = club ? `<a class="glass club-box" href="${clubLink}"><p class="lbl">${esc(club.name)}</p>
      ${cb ? `<div class="row"><span>${esc(cb.title)}</span></div><div class="row"><span>${N.meeting}</span><b>${cb.meetingDate ? esc(new Date(cb.meetingDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })) : N.noDate}</b></div>${club.rs.map(r => `<div class="row"><span>${esc(r.name)}</span><b>%${r.pct}</b></div>`).join('')}` : `<p class="muted">${N.noClubBook}</p>`}</a>`
    : `<a class="glass club-box" href="#kulup"><p class="lbl">${N.club}</p><p class="muted">${N.noClub}</p></a>`;
  return `${needsVerify ? `<p class="notice">${T.verify} <button class="linkbtn" type="button" data-act="resend">${T.resend}</button></p>` : ''}
  ${b ? `<div class="mq" aria-hidden="true"><span>${esc(b.title)} · ${esc(b.title)} · </span><span>${esc(b.title)} · ${esc(b.title)} · </span></div>` : ''}
  <div class="today">
    ${b ? heroArch(b, 200) : arch(`<div class="glow"></div>${MOON}${star('20%', '26%', 18)}${star('74%', '20%', 13, 1.4)}<span class="deco cream solo-cat">${CAT}</span>`, 'hero-arch')}
    <div class="today-main">
      <p class="lbl">${greet()} ${name}${b ? ', ' + (mine ? N.leftOff : N.clubReads) : ''}</p>
      ${b ? `<h1 class="huge">${emLast(b.title)}</h1>${WAVE}
      ${mine ? `<div class="actions"><a class="btn big" href="#okuma">${N.enter}</a><button type="button" class="btn big ghost" data-act="quick">${N.addPage}</button></div>
      ${S.quick ? `<form id="quick-form" class="pagebar"><label>${N.whichPage}<input name="page" type="number" min="0" max="20000" value="${mine.page || ''}" autofocus></label><button class="btn" type="submit">${T.save}</button></form>` : ''}`
    : `<div class="actions"><a class="btn big" href="${clubLink}">${N.toClub}</a></div>`}`
    : `<h1 class="huge">${N.emptyHero}</h1>${WAVE}<div class="actions"><a class="btn big" href="#ara">${N.findFirst}</a></div>`}
    </div>
    <div class="today-side">
      ${pct !== null ? `<div class="glass ring-box"><div class="pring" style="--p:${pct}"><b>%${pct}</b></div><div><p class="lbl">${N.yourBook}</p><p class="small">${N.page} ${mine.page || 0} / ${mine.pages}</p></div></div>` : ''}
      ${clubBox}
      <div class="glass"><p class="lbl">${N.thisWeek}, ${now} ${N.dayStreak}</p>${weekDots(S)}<p class="small muted">${N.thisMonth}: ${mPages} ${N.pageWord}</p></div>
    </div>
  </div>`;
}
function quotes(S, cur) {
  const list = S.quotes || [];
  return `<section class="surface"><h3>${N.quotes}</h3>
    ${list.slice(0, 6).map(q => `<figure class="quote"><blockquote>${esc(q.text)}</blockquote><figcaption>${esc(q.book || '')} · <button type="button" class="linkbtn small" data-act="qdel" data-id="${esc(q.id)}">${N.del}</button></figcaption></figure>`).join('') || `<p class="muted small">${N.noQuotes}</p>`}
    <form id="quote-form" class="panel"><label>${N.addQuote}<textarea name="text" rows="2" required maxlength="1000"></textarea></label><input type="hidden" name="book" value="${esc(cur ? cur.title : '')}"><button class="btn ghost" type="submit">${T.save}</button></form></section>`;
}
export function viewOkuma(S) {
  const cur = S.shelf.find(b => b.status === 'okuyorum') || S.shelf.find(b => b.status === 'istiyorum');
  setAmbient(cur && cur.title);
  return `<div class="okuma"><div class="ok-arch">${cur ? heroArch(cur, 150) : arch(`<div class="glow"></div>${MOON}`, 'hero-arch')}<h1>${N.enterTitle}</h1><p class="muted">${N.enterSub}</p></div>
    <div class="ok-main">${viewOda(S)}</div></div>
    <div class="ok-rest">${quotes(S, cur)}</div>
    ${viewTakip(S)}`;
}
