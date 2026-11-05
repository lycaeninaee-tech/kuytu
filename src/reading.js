// Okuma köşesi: zamanlayıcı, tam ekran oda, ışık, ortam sesi ve müzik
import { $, esc, dayKey, sessDay } from './util.js';
import { TK as T } from './strings.js';
import { book3d, colorOf } from './parts.js';
import { LAYERS, PRESETS, getLevels, presetOf, anyOn, setLevel, applyMix, playMix, stopMix, fadeOn, setFade } from './ambience.js';

export const MODES = [['serbest', '∞', 'Serbest okuma', 0, 0], ['k15', '15', 'Kısa tur · 15 / 3', 15, 3], ['p25', '25', 'Pomodoro · 25 / 5', 25, 5], ['p50', '50', 'Derin odak · 50 / 10', 50, 10], ['ozel', '+', 'Özel döngü', 0, 0], ['sayac', '↓', 'Geri sayım', 0, 0]];
// Kuytu seçkisi: gömülmeye izin veren, uzun ve yıllardır yayında olan YouTube videoları
export const SECKI = [
  ['Klasik · piyano', 'mIYzp5rcTvU', 'HALIDONMUSIC', '#2f4f86,#55438a'],
  ['Caz · gece', '8w5ELqXNlvk', 'Coffee Jazz Melody', '#7a2f6b,#8a2f45'],
  ['Lo-fi', 'lTRiuFIWV54', 'Lofi Girl', '#1f6b52,#3f6b3a'],
  ['Sakin ambient', 'HPyu0PGqGkU', 'Sacred Symphony', '#a8492a,#8a2f45'],
];
let timer = null, pref = 'p25', roomLight = 'alaca', onFinish = () => {}, custom = { f: 30, b: 5, c: 30 };
let panelOpen = false, panelTab = 'ortam', saving = false, nowUrl = '', nowName = '', musicOff = false;
const hooks = { saveBook: () => Promise.resolve(), toast: () => {} };
export const setHooks = h => Object.assign(hooks, h);
export const setOnFinish = fn => { onFinish = fn; };
export const timerOn = () => !!timer;
try {
  timer = JSON.parse(localStorage.getItem('kuytu-timer') || 'null');
  pref = localStorage.getItem('kuytu-mode') || 'p25';
  roomLight = localStorage.getItem('kuytu-light') || 'alaca';
  custom = { ...custom, ...JSON.parse(localStorage.getItem('kuytu-custom') || '{}') };
  const m = JSON.parse(localStorage.getItem('kuytu-mnow') || 'null');
  if (m && m.url) { nowUrl = m.url; nowName = m.name || ''; }
} catch (e) {}
const save = () => { try { if (timer) localStorage.setItem('kuytu-timer', JSON.stringify(timer)); else localStorage.removeItem('kuytu-timer'); } catch (e) {} };
const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
// Duraklatılınca saat o anda donar; devam edince başlangıçlar duraklama kadar ileri kayar
const now = () => (timer && timer.pausedAt) || Date.now();
const elapsed = () => Math.floor((now() - timer.start) / 1000);
// Odak ve mola sırayla döner; geçen süreden hangi fazda olunduğu hesaplanır, böylece sayfa yenilense de bozulmaz
function advance() {
  if (!timer || !timer.focus) return false;
  let changed = false;
  while (true) {
    const len = timer.phase === 'focus' ? timer.focus : timer.brk;
    if ((now() - timer.phaseStart) / 1000 < len) break;
    if (timer.phase === 'focus') { timer.done += timer.focus; timer.cycles += 1; timer.phase = 'break'; } else timer.phase = 'focus';
    timer.phaseStart += len * 1000;
    changed = true;
  }
  if (changed) save();
  return changed;
}
const focusSecs = () => (!timer ? 0 : timer.target ? Math.min(elapsed(), timer.target) : !timer.focus ? elapsed() : timer.done + (timer.phase === 'focus' ? Math.floor((now() - timer.phaseStart) / 1000) : 0));
const pct = () => (timer.target ? Math.min(1, elapsed() / timer.target) : !timer.focus ? (elapsed() % 3600) / 3600 : Math.min(1, (now() - timer.phaseStart) / 1000 / (timer.phase === 'focus' ? timer.focus : timer.brk)));
const label = () => (timer.target ? mmss(Math.max(0, timer.target - elapsed())) : !timer.focus ? mmss(elapsed()) : mmss(Math.max(0, (timer.phase === 'focus' ? timer.focus : timer.brk) - Math.floor((now() - timer.phaseStart) / 1000))));
const sub = () => (timer.target ? T.countdown + ' · ' + Math.round(timer.target / 60) + ' dk' : !timer.focus ? T.free : Math.round(timer.focus / 60) + ' dk ' + T.focus.toLocaleLowerCase('tr') + ' · ' + (timer.cycles + 1) + '. tur');
const stateLbl = () => (timer.pausedAt ? T.paused : timer.target ? T.countdown + ' · ' + T.leftLbl : !timer.focus ? T.goneLbl : (timer.phase === 'focus' ? T.focus : T.rest) + ' · ' + T.leftLbl);
export function togglePause() {
  if (!timer) return;
  if (timer.pausedAt) { const d = Date.now() - timer.pausedAt; timer.start += d; timer.phaseStart += d; timer.pausedAt = 0; } else timer.pausedAt = Date.now();
  save();
  refreshTimer();
}
// Bitirirken saat durur; "Odaya dön" denirse önceki haline döner
export function holdTimer() {
  if (!timer) return null;
  const was = !!timer.pausedAt;
  if (!was) timer.pausedAt = Date.now();
  save();
  refreshTimer();
  return { seconds: focusSecs(), bookId: timer.bookId, title: timer.title, startPage: timer.startPage || 0, note: timer.note || '', was };
}
export function releaseTimer(was) {
  if (timer && !was && timer.pausedAt) togglePause();
  if (timer && !(timer.target && elapsed() >= timer.target)) playMix();
}
export function setNote(v) { if (timer) { timer.note = v; save(); } }
function chime() {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ac.currentTime + i * 0.25);
      g.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + i * 0.25 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + i * 0.25 + 0.6);
      o.connect(g).connect(ac.destination);
      o.start(ac.currentTime + i * 0.25);
      o.stop(ac.currentTime + i * 0.25 + 0.65);
    });
  } catch (e) {}
}
setInterval(() => {
  if (!timer || timer.pausedAt) return;
  if (timer.target && elapsed() >= timer.target) { chime(); if (fadeOn()) stopMix(8); onFinish(); return; }
  if (advance()) { chime(); refreshTimer(); return; }
  const el = $('#digits'); if (el) el.textContent = label();
  const line = $('#tline'); if (line) line.style.setProperty('--pct', pct().toFixed(4));
}, 1000);

export function setOption(kind, v) {
  if (kind !== 'light') return;
  roomLight = v;
  try { localStorage.setItem('kuytu-light', v); } catch (e) {}
  const r = $('.room'); if (r) r.dataset.light = v;
  document.querySelectorAll(`[data-act="roomopt"][data-kind="${kind}"]`).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
}
// Sınıf değişir, sayfa yeniden çizilmez; böylece çalan müzik kesilmez
export function setRoom(on) {
  document.body.classList.toggle('in-room', on);
  try {
    if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch (e) {}
  if (on) { placeMusic(); playMix(); }
  document.body.classList.toggle('show-music', on && !!playerUrl());
}

// Müzik: kitabın listesi, Kuytu seçkisi ya da kişinin yapıştırdığı bağlantı. Çalar odanın dışında durur, oda yeniden çizilince kesilmez.
const profMusic = () => ((current && current.profile) || {}).music || '';
const playerUrl = () => (musicOff ? '' : nowUrl || profMusic());
const service = u => (/open\.spotify\.com\//.test(u) ? 'sp' : /music\.youtube\.com/.test(u) ? 'ytm' : /youtube\.com|youtu\.be/.test(u) ? 'yt' : '');
const svcName = u => T.svc[service(u)] || '';
const playerName = () => (musicOff ? '' : nowUrl ? nowName || svcName(nowUrl) : profMusic() ? T.myList : '');
function playMusic(url, name) {
  if (!musicEmbed(url)) { hooks.toast(T.badLink); return false; }
  const p = $('#mplayer'), same = !musicOff && playerUrl() === url && p && p.querySelector('iframe');
  musicOff = false; nowUrl = url; nowName = name || '';
  try { localStorage.setItem('kuytu-mnow', JSON.stringify({ url, name: nowName })); } catch (e) {}
  if (p && !same) p.innerHTML = musicEmbed(url, true);
  const d = $('#music-drag'); if (d) d.textContent = '⠿ ' + T.music + ' · ' + playerName();
  document.body.classList.toggle('show-music', document.body.classList.contains('in-room'));
  return true;
}
// Profildeki "Listem" değişince çalar ona döner
export function clearNow() {
  nowUrl = ''; nowName = ''; musicOff = false;
  try { localStorage.removeItem('kuytu-mnow'); } catch (e) {}
}
function stopMusic() {
  musicOff = true;
  const p = $('#mplayer'); if (p) p.innerHTML = '';
  document.body.classList.remove('show-music');
}
// Şu an çalanlar: karışımın adı ve müziğin adı
function nowLabel() {
  const parts = [];
  if (anyOn()) { const p = presetOf(); parts.push(p ? T.presets[p] : T.myMix); }
  if (playerName()) parts.push(playerName());
  return parts.length ? `<i aria-hidden="true"></i>${esc(parts.join(' · '))}` : '';
}
const savedMixes = () => { try { return JSON.parse(localStorage.getItem('kuytu-mixes') || '[]') || []; } catch (e) { return []; } };
const keepMixes = l => { try { localStorage.setItem('kuytu-mixes', JSON.stringify(l.slice(0, 8))); } catch (e) {} };
const sameMix = (a, b) => LAYERS.every(k => (a[k] || 0) === (b[k] || 0));
function ambientTab() {
  const lv = getLevels(), pre = presetOf(lv), saved = savedMixes();
  const pb = (v, name, on) => `<button type="button" data-act="mixpreset" data-v="${v}" aria-pressed="${on}">${esc(name)}</button>`;
  return `<span class="sp-cap">${T.presetsCap}</span>
    <div class="sp-presets">${PRESETS.map(([id]) => pb(id, T.presets[id], pre === id)).join('')}${saved.map((s, i) => `<span class="sp-saved">${pb('s' + i, s.n, !pre && anyOn() && sameMix(s.m, lv))}<button type="button" class="sp-del" data-act="mixdel" data-v="${i}" aria-label="${T.del}: ${esc(s.n)}">×</button></span>`).join('')}${saving ? `<form class="sp-saveform"><input name="n" maxlength="24" placeholder="${T.mixName}" required><button>${T.save}</button></form>` : anyOn() ? `<button type="button" class="sp-add" data-act="mixsaveopen">${T.saveMix}</button>` : ''}</div>
    <span class="sp-cap">${T.mixCap}</span>
    <div class="sp-mix">${LAYERS.map(k => { const v = lv[k] || 0; return `<label class="sp-row${v ? '' : ' off'}"><span>${T.layers[k]}</span><input type="range" min="0" max="100" step="1" value="${v}" data-mix="${k}" style="--v:${v}%"><em>${v || '—'}</em></label>`; }).join('')}</div>
    <div class="sp-foot"><label class="sp-tog"><input type="checkbox" data-mixfade${fadeOn() ? ' checked' : ''}><i aria-hidden="true"></i>${T.fadeEnd}</label><span>${T.royaltyFree}</span></div>`;
}
function musicTab() {
  const b = ((current && current.shelf) || []).find(x => x.id === timer.bookId) || {}, bm = b.music && b.music.url ? b.music : null, now = playerUrl(), prof = profMusic();
  const on = u => now === u;
  const tile = (name, url, by, bg) => `<button type="button" class="sp-li" data-act="musplay" data-url="${esc(url)}" data-name="${esc(name)}" aria-pressed="${on(url)}"><i style="background:linear-gradient(135deg,${bg})"></i><b>${esc(name)}</b><small>${esc(by)}</small></button>`;
  const bookActs = bm
    ? (on(bm.url) ? '' : `<button type="button" class="q" data-act="musplay" data-url="${esc(bm.url)}" data-name="${esc(bm.name || '')}">${T.play}</button>`) + `<button type="button" class="q" data-act="musbind" data-v="0">${T.unbind}</button>`
    : now && b.id ? `<button type="button" class="q" data-act="musbind" data-v="1">${T.bindNow}</button>` : '';
  return `<span class="sp-cap">${T.bookMusic}</span>
    <div class="sp-book"><span class="sp-cv" style="--bc:${colorOf(b.id ? b : { title: timer.title || '' })}"></span><div><b>${esc(b.title || timer.title || '')}</b><small>${bm ? esc(bm.name || svcName(bm.url)) + (on(bm.url) ? ' · ' + T.playingNow : '') : T.noBookMusic}</small></div><span class="sp-bacts">${bookActs}</span></div>
    <span class="sp-cap">${T.secki}</span>
    <div class="sp-lists">${SECKI.map(([n, id, by, bg]) => tile(n, 'https://www.youtube.com/watch?v=' + id, by, bg)).join('')}</div>
    <span class="sp-cap">${T.ownList}</span>
    ${prof ? `<div class="sp-lists one">${tile(T.myList, prof, svcName(prof), '#55524b,#1b1b1b')}</div>` : ''}
    <form class="sp-paste"><input id="sp-url" name="u" inputmode="url" autocomplete="off" placeholder="${T.pastePh}" aria-label="${T.link}"><button type="button" class="q" data-act="muspaste">${T.paste}</button><button class="sp-go">${T.play}</button></form>
    <span class="sp-svc" id="sp-svc" aria-live="polite"></span>
    <p class="sp-note">${T.spotifyNote}</p>
    ${now ? `<button type="button" class="q sp-stop" data-act="musstop">${T.stopMusic}</button>` : ''}`;
}
const panel = () => (!panelOpen ? '' : `<aside class="spanel room-only" id="spanel" aria-label="${T.soundMusic}">
    <div class="sp-head"><div class="sp-tabs" role="tablist">${['ortam', 'muzik'].map(t => `<button type="button" role="tab" data-act="sptab" data-v="${t}" aria-selected="${panelTab === t}">${t === 'ortam' ? T.ambient : T.music}</button>`).join('')}</div><button type="button" class="sp-x" data-act="sptoggle" aria-label="${T.closePanel}">×</button></div>
    <div class="sp-body">${panelTab === 'ortam' ? ambientTab() : musicTab()}</div></aside>`);
const repaintNow = () => { const n = $('#rnow'); if (n) n.innerHTML = nowLabel(); };
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('[data-act]');
  if (!el || !timer) return;
  const a = el.dataset.act, v = el.dataset.v;
  if (a === 'sptoggle') { panelOpen = !panelOpen; saving = false; refreshTimer(); }
  else if (a === 'sptab') { panelTab = v; saving = false; refreshTimer(); }
  else if (a === 'mixpreset') {
    const p = v[0] === 's' ? (savedMixes()[Number(v.slice(1))] || {}).m : (PRESETS.find(x => x[0] === v) || [])[1];
    // Seçili olana yeniden basınca susar
    if (p) applyMix(el.getAttribute('aria-pressed') === 'true' ? {} : p);
    refreshTimer();
  } else if (a === 'mixdel') { const l = savedMixes(); l.splice(Number(v), 1); keepMixes(l); refreshTimer(); }
  else if (a === 'mixsaveopen') { saving = true; refreshTimer(); const i = $('.sp-saveform input'); if (i) i.focus(); }
  else if (a === 'musplay') { if (playMusic(el.dataset.url, el.dataset.name)) refreshTimer(); }
  else if (a === 'musstop') { stopMusic(); refreshTimer(); }
  else if (a === 'musbind') {
    const id = timer.bookId, music = v === '1' ? { url: playerUrl(), name: playerName() } : null;
    hooks.saveBook(id, { music }).then(ok => { if (ok) hooks.toast(music ? T.bound : T.removedMusic); });
    const b = ((current && current.shelf) || []).find(x => x.id === id); if (b) b.music = music;
    refreshTimer();
  } else if (a === 'muspaste') {
    const i = $('#sp-url');
    if (!navigator.clipboard || !navigator.clipboard.readText) { hooks.toast(T.pasteFail); if (i) i.focus(); return; }
    navigator.clipboard.readText().then(t => { if (i) { i.value = t.trim(); detect(i.value); } }).catch(() => { hooks.toast(T.pasteFail); if (i) i.focus(); });
  }
});
function detect(u) {
  const s = $('#sp-svc'); if (!s) return;
  s.textContent = !u ? '' : service(u) && musicEmbed(u) ? T.svc[service(u)] + ' ' + T.svcFound : T.badLink;
}
document.addEventListener('submit', e => {
  const f = e.target;
  if (f.classList.contains('sp-saveform')) {
    const n = f.elements.n.value.trim(); if (!n) return;
    keepMixes([{ n, m: getLevels() }, ...savedMixes()]);
    saving = false; refreshTimer();
  } else if (f.classList.contains('sp-paste')) {
    const u = f.elements.u.value.trim(); if (!u) return;
    if (playMusic(/^https?:/.test(u) ? u : 'https://' + u, '')) refreshTimer();
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && panelOpen && document.body.classList.contains('in-room')) { panelOpen = false; refreshTimer(); } });
document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-mixfade]')) setFade(e.target.checked); });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'room-note') setNote(t.value);
  if (t.id === 'sp-url') detect(t.value.trim());
  if (t.dataset && t.dataset.mix) {
    const v = Number(t.value), row = t.closest('.sp-row');
    setLevel(t.dataset.mix, v);
    t.style.setProperty('--v', v + '%');
    if (row) { row.classList.toggle('off', !v); row.querySelector('em').textContent = v || '—'; }
    // Hazır karışım düğmeleri ve alttaki "şu an çalan" yazısı kaydırırken güncellenir
    const pre = presetOf();
    document.querySelectorAll('.sp-presets [data-act="mixpreset"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === pre)));
    repaintNow();
  }
});
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('in-room'); });

let current = null; // son çizilen raf ve oturumlar
function timerBody() {
  const { shelf, sessions } = current;
  if (timer) {
    const b = shelf.find(x => x.id === timer.bookId) || {};
    const key = dayKey(new Date());
    const today = Math.round(sessions.filter(s => sessDay(s) === key).reduce((a, s) => a + (s.seconds || 0), 0) / 60);
    const chip = (kind, cur, v, t) => `<button type="button" data-act="roomopt" data-kind="${kind}" data-v="${v}" aria-pressed="${cur === v}">${t}</button>`;
    const from = timer.startPage ? ` · ${T.startPage} ${timer.startPage}` : '';
    return `<div class="room${timer.focus && timer.phase === 'break' ? ' is-break' : ''}${timer.pausedAt ? ' is-paused' : ''}${panelOpen ? ' sp-open' : ''}" data-light="${esc(roomLight)}" style="--rc:${colorOf(b.id ? b : { title: timer.title || '' })}">
      <span class="lamp" aria-hidden="true"></span>
      <div class="rtop"><b class="rbrand room-only">Kuytu</b><span>${esc(sub())}</span><span>${T.today} ${today} dk</span><button type="button" class="rshrink room-only" data-act="roomtoggle">${T.shrink} ⌄</button></div>
      <div class="rmid"><div class="room-book room-only">${book3d({ title: b.title || timer.title || '', cover: b.cover }, 132)}</div><div class="digits" id="digits">${label()}</div><span class="rstate room-only">${esc(stateLbl())}</span><p class="rtitle">${esc(b.title || timer.title || '')}</p><p class="rauthor">${esc(b.author || '')}<span class="room-only">${esc(from)}</span></p><div class="rline"><i id="tline" style="--pct:${pct().toFixed(4)}"></i></div></div>
      <aside class="rnote room-only"><label for="room-note">${T.noteTitle}</label><textarea id="room-note" rows="3" maxlength="600" placeholder="${T.notePh}">${esc(timer.note || '')}</textarea><span>${T.noteHint}</span></aside>
      <div class="rbot">
        <div class="chips room-only" role="group" aria-label="${T.light}"><span>${T.light}</span><div class="rseg">${chip('light', roomLight, 'gun', T.day)}${chip('light', roomLight, 'alaca', T.dusk)}${chip('light', roomLight, 'gece', T.night)}</div></div>
        <button type="button" class="btn rsound room-only${panelOpen ? ' on' : ''}" data-act="sptoggle" aria-expanded="${panelOpen}">${T.soundMusic}</button><span class="rnow room-only" id="rnow">${nowLabel()}</span>
        <div class="ractions"><button type="button" class="btn ghost room-only rdesk" data-act="roomtoggle">${T.shrink}</button><button type="button" class="btn room-only rphone" data-act="rnote" aria-expanded="false">${T.noteBtn}</button><button type="button" class="btn room-off" data-act="roomtoggle">${T.enter2}</button><button type="button" class="btn" data-act="tpause">${timer.pausedAt ? T.resume : T.pause}</button><button type="button" class="btn rfin" data-act="tstop">${T.finish}</button><button type="button" class="btn ghost room-off" data-act="treset">${T.reset}</button></div>
      </div>${panel()}</div>`;
  }
  const opts = shelf.filter(b => b.status !== 'biraktim').sort((a, b) => (a.status === 'okuyorum' ? -1 : 0) - (b.status === 'okuyorum' ? -1 : 0)).map(b => `<option value="${esc(b.id)}">${esc(b.title)}</option>`).join('');
  if (!opts) return `<h2>${T.ask}</h2><p class="muted">${T.needBook} <a href="#ara">${T.findBook}</a></p>`;
  const modes = MODES.map(([v, big, d]) => `<label class="mode"><input type="radio" name="tmode" value="${v}"${pref === v ? ' checked' : ''}><b>${big}</b><span>${d}</span></label>`).join('');
  return `<h2>${T.ask}</h2>
    <label>${T.book}<select id="timer-book">${opts}</select></label>
    <div class="modes" role="radiogroup" aria-label="${T.ask}">${modes}</div>
    <div class="f-ozel"><label>${T.focusMin}<input id="t-focus" type="number" min="1" max="180" value="${custom.f}"></label><label>${T.breakMin}<input id="t-break" type="number" min="1" max="60" value="${custom.b}"></label></div>
    <label class="f-sayac">${T.countMin}<input id="t-count" type="number" min="1" max="300" value="${custom.c}"></label>
    <button type="button" class="btn" data-act="tstart">${T.enter}</button>`;
}
export function refreshTimer() {
  const c = $('#timer-card');
  if (c) c.innerHTML = timerBody();
}
export function startTimer(shelf) {
  const bookId = $('#timer-book') && $('#timer-book').value;
  const b = shelf.find(x => x.id === bookId);
  if (!b) return;
  const picked = document.querySelector('input[name="tmode"]:checked');
  const m = MODES.find(x => x[0] === (picked ? picked.value : 'p25'));
  pref = m[0];
  try { localStorage.setItem('kuytu-mode', pref); } catch (e) {}
  const now = Date.now();
  const num = (id, lo, hi, d) => Math.min(hi, Math.max(lo, Math.round(Number(($('#' + id) || {}).value)) || d));
  custom = { f: num('t-focus', 1, 180, custom.f), b: num('t-break', 1, 60, custom.b), c: num('t-count', 1, 300, custom.c) };
  try { localStorage.setItem('kuytu-custom', JSON.stringify(custom)); } catch (e) {}
  timer = { bookId, title: b.title, start: now, phase: 'focus', phaseStart: now, done: 0, cycles: 0, focus: m[3] * 60, brk: m[4] * 60, startPage: b.page || 0, note: '' };
  // Kitaba bağlı bir liste varsa oda onunla açılır
  if (b.music && b.music.url) playMusic(b.music.url, b.music.name);
  if (m[0] === 'ozel') { timer.focus = custom.f * 60; timer.brk = custom.b * 60; }
  if (m[0] === 'sayac') timer.target = custom.c * 60;
  save();
  refreshTimer();
  setRoom(true);
}
export function resetTimer() {
  timer = null;
  save();
  setRoom(false);
  stopMix(fadeOn() ? 6 : 0);
  panelOpen = false;
  refreshTimer();
}
// Oturumu kapatır ve kaydedilecek bilgiyi döndürür
export function stopTimer() {
  if (!timer) return null;
  const t = timer, seconds = focusSecs();
  timer = null;
  save();
  setRoom(false);
  stopMix(fadeOn() ? 6 : 0);
  panelOpen = false;
  refreshTimer();
  return { seconds, bookId: t.bookId, title: t.title };
}
// Spotify, YouTube ve YouTube Music bağlantılarını tanır; tanımazsa boş döner
function musicEmbed(url, auto) {
  if (!url) return '';
  const sp = url.match(/open\.spotify\.com\/(?:intl-[\w-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
  if (sp) return `<iframe src="https://open.spotify.com/embed/${sp[1]}/${sp[2]}" width="100%" height="80" frameborder="0" allow="autoplay; encrypted-media" loading="lazy" title="Spotify"></iframe>`;
  const vid = (url.match(/[?&]v=([\w-]{11})|youtu\.be\/([\w-]{11})|\/(?:live|shorts|embed)\/([\w-]{11})/) || []).slice(1).find(Boolean);
  const list = (url.match(/[?&]list=([\w-]+)/) || [])[1];
  if (!vid && !list) return '';
  // Tek video bitince başa döner; YouTube kuralları gereği oynatıcı görünür kalır
  const q = ['playsinline=1', list ? 'list=' + list : 'loop=1&playlist=' + vid, auto ? 'autoplay=1' : ''].filter(Boolean).join('&');
  return `<iframe src="https://www.youtube.com/embed/${vid || 'videoseries'}?${q}" width="100%" height="170" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen title="YouTube"></iframe>`;
}
export const setCurrent = state => { current = state; };
// Yeni düzende zamanlayıcı sol tarafta, müzik sağ sayfada durur
export function viewTimer(state) { current = state; return `<section class="surface" id="timer-card">${timerBody()}</section>`; }
export function viewMusic(state) {
  current = state;
  const music = (state.profile || {}).music || '', embed = musicEmbed(playerUrl()), name = playerName();
  return `<section class="surface" id="music-card"><button type="button" class="mdrag" id="music-drag" aria-label="${T.moveMusic}">⠿ ${T.music}${name ? ' · ' + esc(name) : ''}</button><h3>${T.music}</h3><div id="mplayer">${embed || `<p class="muted small">${T.musicHint}</p>`}</div>
    <label>${T.link}<input id="music-url" value="${esc(music)}" placeholder="open.spotify.com/... ya da youtube.com/..."></label><button type="button" class="pl" data-act="msave">${T.save}</button></section>`;
}
export function viewOda(state) { current = state; return `<div class="oda"><section class="surface" id="timer-card">${timerBody()}</section>${viewMusic(state)}</div>`; }

// Odada müzik sürüklenerek taşınır; yeri bu tarayıcıda hatırlanır
function moveMusic(x, y, keep) {
  const c = $('#music-card'); if (!c) return;
  const nx = Math.round(Math.max(8, Math.min(innerWidth - c.offsetWidth - 8, x))), ny = Math.round(Math.max(8, Math.min(innerHeight - c.offsetHeight - 8, y)));
  c.style.setProperty('--px', nx + 'px'); c.style.setProperty('--py', ny + 'px');
  if (keep) { try { localStorage.setItem('kuytu-mpos', JSON.stringify({ x: nx, y: ny })); } catch (e) {} }
}
function placeMusic() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem('kuytu-mpos') || 'null'); } catch (e) {}
  if (p) moveMusic(p.x, p.y, false);
}
document.addEventListener('pointerdown', e => {
  const h = e.target.closest ? e.target.closest('#music-drag') : null;
  if (!h || !document.body.classList.contains('in-room')) return;
  e.preventDefault();
  const c = $('#music-card'), r = c.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
  c.classList.add('dragging');
  const move = ev => moveMusic(ev.clientX - ox, ev.clientY - oy, false);
  const up = ev => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); c.classList.remove('dragging'); moveMusic(ev.clientX - ox, ev.clientY - oy, true); };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
});
