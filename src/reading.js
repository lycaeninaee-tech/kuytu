// Okuma köşesi: zamanlayıcı, tam ekran oda, ışık, ortam sesi ve müzik
import { $, esc, dayKey, sessDay } from './util.js';
import { TK as T } from './strings.js';
import { book3d, MOON, star, CAT } from './parts.js';

export const MODES = [['serbest', '∞', 'Serbest okuma', 0, 0], ['k15', '15', 'Kısa tur · 15 / 3', 15, 3], ['p25', '25', 'Pomodoro · 25 / 5', 25, 5], ['p50', '50', 'Derin odak · 50 / 10', 50, 10], ['ozel', '+', 'Özel döngü', 0, 0], ['sayac', '↓', 'Geri sayım', 0, 0]];
let timer = null, pref = 'p25', roomLight = 'alaca', sound = 'off', acx = null, src = null, onFinish = () => {}, custom = { f: 30, b: 5, c: 30 };
export const setOnFinish = fn => { onFinish = fn; };
export const timerOn = () => !!timer;
try {
  timer = JSON.parse(localStorage.getItem('kuytu-timer') || 'null');
  pref = localStorage.getItem('kuytu-mode') || 'p25';
  roomLight = localStorage.getItem('kuytu-light') || 'alaca';
  custom = { ...custom, ...JSON.parse(localStorage.getItem('kuytu-custom') || '{}') };
} catch (e) {}
const save = () => { try { if (timer) localStorage.setItem('kuytu-timer', JSON.stringify(timer)); else localStorage.removeItem('kuytu-timer'); } catch (e) {} };
const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
const elapsed = () => Math.floor((Date.now() - timer.start) / 1000);
// Odak ve mola sırayla döner; geçen süreden hangi fazda olunduğu hesaplanır, böylece sayfa yenilense de bozulmaz
function advance() {
  if (!timer || !timer.focus) return false;
  let changed = false;
  while (true) {
    const len = timer.phase === 'focus' ? timer.focus : timer.brk;
    if ((Date.now() - timer.phaseStart) / 1000 < len) break;
    if (timer.phase === 'focus') { timer.done += timer.focus; timer.cycles += 1; timer.phase = 'break'; } else timer.phase = 'focus';
    timer.phaseStart += len * 1000;
    changed = true;
  }
  if (changed) save();
  return changed;
}
const focusSecs = () => (!timer ? 0 : timer.target ? Math.min(elapsed(), timer.target) : !timer.focus ? elapsed() : timer.done + (timer.phase === 'focus' ? Math.floor((Date.now() - timer.phaseStart) / 1000) : 0));
const pct = () => (timer.target ? Math.min(1, elapsed() / timer.target) : !timer.focus ? (elapsed() % 3600) / 3600 : Math.min(1, (Date.now() - timer.phaseStart) / 1000 / (timer.phase === 'focus' ? timer.focus : timer.brk)));
const label = () => (timer.target ? mmss(Math.max(0, timer.target - elapsed())) : !timer.focus ? mmss(elapsed()) : mmss(Math.max(0, (timer.phase === 'focus' ? timer.focus : timer.brk) - Math.floor((Date.now() - timer.phaseStart) / 1000))));
const sub = () => (timer.target ? T.countdown + ' · ' + Math.round(timer.target / 60) + ' dk' : !timer.focus ? T.free : (timer.phase === 'focus' ? T.focus : T.rest) + ' · ' + timer.cycles + ' ' + T.rounds);
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
  if (!timer) return;
  if (timer.target && elapsed() >= timer.target) { chime(); onFinish(); return; }
  if (advance()) { chime(); refreshTimer(); return; }
  const el = $('#digits'); if (el) el.textContent = label();
  const line = $('#tline'); if (line) line.style.setProperty('--pct', pct().toFixed(4));
}, 1000);

// Ortam sesi dosya indirmez, tarayıcıda gürültüden üretilir
export function setSound(k) {
  sound = k;
  if (src) { try { src.stop(); } catch (e) {} src = null; }
  if (k === 'off') return;
  try {
    acx = acx || new (window.AudioContext || window.webkitAudioContext)();
    acx.resume();
    const buf = acx.createBuffer(1, acx.sampleRate * 4, acx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3.2; }
    const s = acx.createBufferSource(), f = acx.createBiquadFilter(), g = acx.createGain();
    s.buffer = buf; s.loop = true;
    f.type = k === 'rain' ? 'highpass' : 'lowpass';
    f.frequency.value = k === 'rain' ? 400 : 700;
    g.gain.value = k === 'rain' ? 0.5 : 0.9;
    s.connect(f).connect(g).connect(acx.destination);
    s.start();
    src = s;
  } catch (e) {}
}
export function setOption(kind, v) {
  if (kind === 'light') {
    roomLight = v;
    try { localStorage.setItem('kuytu-light', v); } catch (e) {}
    const r = $('.room'); if (r) r.dataset.light = v;
  } else setSound(v);
  document.querySelectorAll(`[data-act="roomopt"][data-kind="${kind}"]`).forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
}
// Sınıf değişir, sayfa yeniden çizilmez; böylece çalan müzik kesilmez
export function setRoom(on) {
  document.body.classList.toggle('in-room', on);
  try {
    if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch (e) {}
  if (on) placeMusic();
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('in-room'); });

let current = null; // son çizilen raf ve oturumlar
function timerBody() {
  const { shelf, sessions } = current;
  if (timer) {
    const b = shelf.find(x => x.id === timer.bookId) || {};
    const key = dayKey(new Date());
    const today = Math.round(sessions.filter(s => sessDay(s) === key).reduce((a, s) => a + (s.seconds || 0), 0) / 60);
    const chip = (kind, now, v, t) => `<button type="button" data-act="roomopt" data-kind="${kind}" data-v="${v}" aria-pressed="${now === v}">${t}</button>`;
    return `<div class="room${timer.focus && timer.phase === 'break' ? ' is-break' : ''}" data-light="${esc(roomLight)}">
      <span class="lamp" aria-hidden="true"></span>
      <span class="room-sky room-only" aria-hidden="true">${MOON}${star('22%', '16%', 18)}${star('74%', '12%', 13, 1.2)}${star('84%', '30%', 15, 2.3)}</span><span class="room-cat room-only" aria-hidden="true">${CAT}</span>
      <div class="rtop"><span>${esc(sub())}</span><span>${T.today} ${today} dk</span></div>
      <div class="rmid"><div class="room-book room-only">${book3d({ title: b.title || timer.title || '', cover: b.cover }, 130)}</div><div class="digits" id="digits">${label()}</div><p class="rtitle">${esc(b.title || timer.title || '')}</p><p class="rauthor">${esc(b.author || '')}</p></div>
      <div class="rfoot"><div class="rline"><i id="tline" style="--pct:${pct().toFixed(4)}"></i></div>
      <div class="rbot">
        <div class="chips room-only"><span>${T.light}</span>${chip('light', roomLight, 'gun', T.day)}${chip('light', roomLight, 'alaca', T.dusk)}${chip('light', roomLight, 'gece', T.night)}</div>
        <div class="chips room-only"><span>${T.sound}</span>${chip('sound', sound, 'off', T.quiet)}${chip('sound', sound, 'rain', T.rain)}${chip('sound', sound, 'fire', T.fire)}</div>
        <div class="ractions"><button type="button" class="btn ghost room-only" data-act="roomtoggle">${T.shrink}</button><button type="button" class="btn room-off" data-act="roomtoggle">${T.enter2}</button><button type="button" class="btn" data-act="tstop">${T.finish}</button><button type="button" class="btn ghost" data-act="treset">${T.reset}</button></div>
      </div></div></div>`;
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
  timer = { bookId, title: b.title, start: now, phase: 'focus', phaseStart: now, done: 0, cycles: 0, focus: m[3] * 60, brk: m[4] * 60 };
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
  setSound('off');
  refreshTimer();
}
// Oturumu kapatır ve kaydedilecek bilgiyi döndürür
export function stopTimer() {
  if (!timer) return null;
  const t = timer, seconds = focusSecs();
  timer = null;
  save();
  setRoom(false);
  setSound('off');
  refreshTimer();
  return { seconds, bookId: t.bookId, title: t.title };
}
function musicEmbed(url) {
  if (!url) return '';
  const sp = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/);
  if (sp) return `<iframe src="https://open.spotify.com/embed/${sp[1]}/${sp[2]}" width="100%" height="80" frameborder="0" allow="autoplay; encrypted-media" loading="lazy"></iframe>`;
  const vid = (url.match(/[?&]v=([\w-]{11})|youtu\.be\/([\w-]{11})/) || []).slice(1).find(Boolean);
  const list = (url.match(/list=([\w-]+)/) || [])[1];
  if (!vid && !list) return '';
  // YouTube kuralları gereği oynatıcı görünür kalır
  return `<iframe src="https://www.youtube.com/embed/${vid || 'videoseries'}?playsinline=1${list ? '&list=' + list : ''}" width="100%" height="170" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
}
export function viewOda(state) {
  current = state;
  const music = (state.profile || {}).music || '';
  const embed = musicEmbed(music);
  return `<div class="oda">
    <section class="surface" id="timer-card">${timerBody()}</section>
    <section class="surface" id="music-card">${embed ? `<button type="button" class="mdrag" id="music-drag" aria-label="${T.moveMusic}">⠿ ${T.music}</button>` : ''}<h3>${T.music}</h3>${embed || `<p class="muted small">${T.musicHint}</p>`}
      <label>${T.link}<input id="music-url" value="${esc(music)}" placeholder="open.spotify.com/... ya da youtube.com/..."></label><button type="button" class="btn ghost" data-act="msave">${T.save}</button></section>
  </div>`;
}
export const setCurrent = state => { current = state; };

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
