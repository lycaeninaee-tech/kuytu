// Takip: sayfa ve dakika üzerinden okuma alışkanlığı
import { esc, dayKey, sessDay, dk } from './util.js';
import { TK as T } from './strings.js';

const WEEK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const WEEK_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const PARTS = [['Sabah', 5, 12], ['Öğleden sonra', 12, 17], ['Akşam', 17, 22], ['Gece', 22, 29]];
const HEAT_WEEKS = 26;
// Açık bırakılan bölümler sayfa yenilenince kapanmasın
const opened = {};
document.addEventListener('toggle', e => { if (e.target.dataset && e.target.dataset.k) opened[e.target.dataset.k] = e.target.open; }, true);

const bars = (rows, fmt) => {
  const max = Math.max(1, ...rows.map(r => r[1]));
  return `<ul class="hbars">${rows.map(([k, v, text]) => `<li><span>${esc(k)}</span><span class="bar"><i style="width:${Math.round(v / max * 100)}%"></i></span><span class="v">${esc(text || fmt(v))}</span></li>`).join('')}</ul>`;
};
export function streaks(days) {
  const has = k => days.has(k);
  const d = new Date();
  if (!has(dayKey(d))) d.setDate(d.getDate() - 1);
  let now = 0;
  while (has(dayKey(d))) { now++; d.setDate(d.getDate() - 1); }
  let best = 0, run = 0, prev = null;
  [...days].sort().forEach(k => {
    const x = new Date(k + 'T12:00:00');
    run = prev && Math.round((x - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = x;
  });
  return [now, best];
}
function chart(byDay, pg) {
  const n = 30, W = 640, H = 170, P = 12;
  const days = [...Array(n)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return d; });
  const vals = days.map(d => Math.round((byDay[dayKey(d)] || 0) / (pg ? 1 : 60)));
  const max = Math.max(pg ? 20 : 30, ...vals), bw = (W - 2 * P) / n;
  const lbl = d => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return `<svg class="c30" viewBox="0 0 ${W} ${H}" role="img" aria-label="${T.last30}">${vals.map((v, i) => { const h = v / max * (H - 2 * P); return `<rect x="${(P + i * bw + 1).toFixed(1)}" y="${(H - P - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="2"><title>${esc(lbl(days[i]))}: ${v} ${pg ? 'sayfa' : 'dk'}</title></rect>`; }).join('')}</svg>
    <div class="axis"><span>${esc(lbl(days[0]))}</span><span>${T.todayLow}</span></div>`;
}
function pace(state, mine) {
  const b = state.shelf.find(x => x.status === 'okuyorum');
  if (!b) return '';
  if (!b.pages) return `<section class="surface pace"><p class="label">${T.reading}</p><h2>${esc(b.title)}</h2><p class="muted">${T.addPages} <a href="#kitap/${encodeURIComponent(b.id)}">${T.openBook}</a></p></section>`;
  const read = Math.min(b.pages, b.page || 0), left = b.pages - read;
  const week = [...Array(7)].map((_, i) => dayKey(new Date(Date.now() - i * 86400000)));
  const perDay = Math.round(mine.filter(s => week.includes(sessDay(s))).reduce((a, s) => a + (s.pages || 0), 0) / 7);
  const line = !left ? T.finished : perDay ? `${T.perDay} ${perDay} ${T.perDay2} <b>${Math.ceil(left / perDay)} ${T.perDay3}</b>` : T.noPace;
  return `<section class="surface pace"><p class="label">${T.reading}</p><h2>${esc(b.title)}</h2>
    <div class="pace-nums"><b>${read}<small> / ${b.pages}</small></b><b class="left">${left}<small> ${T.leftPages}</small></b></div>
    <div class="meter"><span style="width:${read / b.pages * 100}%"></span></div><p class="muted">${line}</p></section>`;
}
function logForm(state) {
  const list = state.shelf.filter(b => b.status !== 'biraktim');
  if (!list.length) return `<p class="empty-note">${T.needBook} <a href="#ara">${T.findBook}</a></p>`;
  const cur = list.find(b => b.status === 'okuyorum');
  const now = new Date(), time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  return `<form class="surface logform" id="log-form"><h3>${T.logTitle}</h3><p class="muted small">${T.logHint}</p>
    <div class="log-grid"><label>${T.book}<select name="book">${list.map(b => `<option value="${esc(b.id)}"${cur && b.id === cur.id ? ' selected' : ''}>${esc(b.title)}</option>`).join('')}</select></label>
    <label>${T.pagesRead}<input name="pages" type="number" min="1" max="5000" inputmode="numeric" placeholder="25"></label>
    <label>${T.minutes}<input name="min" type="number" min="1" max="1440" inputmode="numeric" placeholder="45"></label>
    <label>${T.date}<input name="day" type="date" max="${dayKey(now)}" value="${dayKey(now)}" required></label>
    <label>${T.time}<input name="time" type="time" value="${time}"></label></div>
    <div class="log-foot"><div class="qmins">${[10, 20, 30, 50].map(p => `<button type="button" data-act="logpg" data-v="${p}">${p}</button>`).join('')}<span class="muted small">${T.pageWord}</span></div><button class="btn" type="submit">${T.save}</button></form>`;
}
// Aylık özeti 1080x1350 bir resme çizer; telefonda paylaşım menüsü, bilgisayarda indirme
export async function shareRecap(state) {
  const key = dayKey(new Date()).slice(0, 7), list = state.sessions.filter(s => sessDay(s).startsWith(key));
  const pages = list.reduce((a, s) => a + (s.pages || 0), 0), secs = list.reduce((a, s) => a + (s.seconds || 0), 0), days = new Set(list.map(sessDay)).size;
  const per = {};
  list.forEach(s => { per[s.title || ''] = (per[s.title || ''] || 0) + (s.pages || s.seconds || 0); });
  const top = Object.entries(per).filter(e => e[0]).sort((a, b) => b[1] - a[1])[0];
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const g = c.getContext('2d');
  try { await document.fonts.load('500 150px "Playfair Display"'); await document.fonts.load('italic 500 44px "Playfair Display"'); await document.fonts.ready; } catch (e) {}
  g.fillStyle = '#1f3d33'; g.fillRect(0, 0, 1080, 1350);
  g.textAlign = 'center';
  const line = (text, font, color, y) => { g.font = font; g.fillStyle = color; g.fillText(text, 540, y); };
  line('KUYTU', '500 64px "Playfair Display", Georgia, serif', '#f5efe7', 190);
  line(new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }).toLocaleUpperCase('tr-TR'), '600 30px Inter, sans-serif', '#cfd6cb', 260);
  line(pages ? String(pages) : String(Math.round(secs / 60)), '500 230px "Playfair Display", Georgia, serif', '#f5efe7', 610);
  line(pages ? 'sayfa okudum' : 'dakika okudum', 'italic 500 56px "Playfair Display", Georgia, serif', '#d8c3a0', 700);
  line(`${days} gün · ${Math.round(secs / 60)} dakika`, '500 38px Inter, sans-serif', '#f5efe7', 830);
  if (top) line(top[0].slice(0, 42), 'italic 500 44px "Playfair Display", Georgia, serif', '#d8c3a0', 930);
  line('Aynı sayfalarda farklı hayatlar.', 'italic 500 38px "Playfair Display", Georgia, serif', '#cfd6cb', 1220);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  if (!blob) return;
  const file = new File([blob], `kuytu-${key}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export function viewTakip(state) {
  const mine = state.sessions, prof = state.profile || {};
  // Sayfa ve dakika tek ekranda: grafikler sayfa kaydı varsa sayfaya göre çizilir, yazılarda ikisi birlikte görünür
  const pg = mine.some(s => s.pages);
  state.metricNow = pg ? 'pages' : 'min';
  const both = list => { const p = list.reduce((a, s) => a + (s.pages || 0), 0), m = Math.round(list.reduce((a, s) => a + (s.seconds || 0), 0) / 60); return [p ? p + ' sayfa' : '', m ? m + ' dk' : ''].filter(Boolean).join(' · ') || '–'; };
  const val = s => (pg ? s.pages || 0 : s.seconds || 0), fmt = v => (pg ? v + ' sayfa' : dk(v));
  const days = new Set(), byDay = {};
  mine.forEach(s => { const k = sessDay(s); if (k) { days.add(k); byDay[k] = (byDay[k] || 0) + val(s); } });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const at = n => { const d = new Date(today); d.setDate(today.getDate() + n); return d; };
  const first = -((today.getDay() + 6) % 7) - 7 * (HEAT_WEEKS - 1), cuts = pg ? [10, 25, 50] : [600, 1200, 2400];
  const cells = [...Array(HEAT_WEEKS * 7)].map((_, i) => {
    const d = at(first + i);
    if (d > today) return '<i class="f"></i>';
    const v = byDay[dayKey(d)] || 0, lvl = !v ? 0 : v < cuts[0] ? 1 : v < cuts[1] ? 2 : v < cuts[2] ? 3 : 4;
    return `<button type="button" tabindex="-1" class="l${lvl}" data-act="heatday" data-v="${dayKey(d)}" title="${esc(d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }))}: ${esc(fmt(v))}"></button>`;
  }).join('');
  const row = (k, list) => [k, list.reduce((t, s) => t + val(s), 0), both(list)];
  const parts = PARTS.map(([k, a, b]) => row(k, mine.filter(s => { const h = new Date(s.at).getHours(), x = h < 5 ? h + 24 : h; return x >= a && x < b; })));
  const week = WEEK.map((k, i) => row(k, mine.filter(s => (new Date(s.at).getDay() + 6) % 7 === i)));
  const per = {};
  mine.forEach(s => { (per[s.title || '?'] = per[s.title || '?'] || []).push(s); });
  const books = Object.entries(per).map(([k, l]) => row(k, l)).filter(r => r[1]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const has = parts.some(p => p[1]);
  const topP = parts.slice().sort((a, b) => b[1] - a[1])[0], topD = WEEK_LONG[week.indexOf(week.slice().sort((a, b) => b[1] - a[1])[0])];
  const timed = mine.filter(s => s.pages && s.seconds);
  const speed = timed.length ? Math.round(timed.reduce((a, s) => a + s.pages, 0) / (timed.reduce((a, s) => a + s.seconds, 0) / 3600)) : 0;
  const [now, best] = streaks(days);
  const month = dayKey(today).slice(0, 7), mList = mine.filter(s => sessDay(s).startsWith(month));
  const monthV = mList.reduce((a, s) => a + val(s), 0);
  const wk = [...Array(7)].map((_, i) => dayKey(new Date(Date.now() - i * 86400000)));
  const wkV = mine.filter(s => wk.includes(sessDay(s))).reduce((a, s) => a + val(s), 0), wkN = pg ? wkV : Math.round(wkV / 60);
  const goal = (pg ? prof.goalPages : prof.goalMin) || 0, unit = pg ? 'sayfa' : 'dk';
  const shown = state.logAll ? mine : mine.slice(0, 8);
  const amount = s => [s.pages ? s.pages + ' sayfa' : '', s.seconds ? dk(s.seconds) : ''].filter(Boolean).join(' · ');
  const open = k => (opened[k] ? ' open' : '');
  return `<div class="pagehead"><div><p class="label">${T.track}</p><h2>${T.habit}</h2></div></div>
    <div class="habit">
    ${pace(state, mine)}
    <div class="statrow three">
      <div><b>${esc(both(mList))}</b><span>${T.thisMonth}</span></div>
      <div><b>${now} gün</b><span>${T.streak}</span></div>
      <div><b>${esc(both(mine.filter(s => wk.includes(sessDay(s)))))}</b><span>${T.thisWeek}${goal ? ' · ' + T.goal + ' ' + goal + ' ' + unit : ''}</span></div>
    </div>
    <details class="logbox" data-k="log"${open('log')}><summary class="btn">${T.logTitle}</summary>${logForm(state)}</details>
    <section class="surface"><h3>${T.last30}</h3>${chart(byDay, pg)}</section>
    ${has ? `<p class="insight">En çok <b>${esc(topP[0].toLocaleLowerCase('tr-TR'))}</b> saatlerinde ve <b>${esc(topD)}</b> günleri okuyorsun.</p>` : ''}
    <details class="more" data-k="more"${open('more')}><summary>${T.details}</summary><div class="habit">
      <section class="surface"><h3>${T.lastWeeks}</h3><div class="heat">${cells}</div><p class="muted small">${T.heatHint}</p></section>
      <div class="statrow"><div><b>${best} gün</b><span>${T.best}</span></div><div><b>${speed ? speed + ' s/sa' : '–'}</b><span>${T.speed}</span></div></div>
      <div class="grid2">
        <section class="surface"><h3>${T.weekGoal}</h3><div class="meter"><span style="width:${goal ? Math.min(100, wkN / goal * 100) : 0}%"></span></div><div class="goalrow"><input id="goal" type="number" min="0" value="${goal || ''}" placeholder="${unit}" aria-label="${T.weekGoal}"><button class="btn ghost" type="button" data-act="gsave">${T.save}</button></div></section>
        <section class="surface"><h3>${T.dayParts}</h3>${bars(parts, fmt)}</section>
        <section class="surface"><h3>${T.weekDays}</h3>${bars(week, fmt)}</section>
        <section class="surface"><h3>${T.byBook}</h3>${books.length ? bars(books, fmt) : `<p class="muted small">${T.noRecord}</p>`}</section>
      </div>
      ${mine.length ? `<section class="surface"><h3>${T.records}</h3><ul class="loglist">${shown.map(s => `<li><span class="d">${esc(new Date(s.at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }))}</span><span class="t">${esc(s.title || '')}${s.manual ? `<em>${T.manual}</em>` : ''}</span><b>${esc(amount(s))}</b><button type="button" class="linkbtn small" data-act="delsess" data-id="${esc(s.id)}">${state.armed === s.id ? T.sure : T.del}</button></li>`).join('')}</ul>${mine.length > shown.length ? `<button type="button" class="linkbtn" data-act="logall">${T.showAll} (${mine.length})</button>` : ''}</section>` : ''}
      ${mList.length ? `<button class="btn ghost share" type="button" data-act="recapshare">${T.shareRecap}</button>` : ''}
    </div></details>
    </div>`;
}
