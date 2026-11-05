// Ortam sesleri: hiçbiri kayıt değil, hepsi tarayıcıda Web Audio ile üretilir. Dosya indirilmez, telif yoktur.
// Her ses bir katman; katmanın kendi ses düzeyi var. Kısa olaylar (damla, çıtırtı, kuş) ileriye doğru planlanır.
export const LAYERS = ['rain', 'fire', 'clock', 'cafe', 'forest', 'night', 'waves', 'train', 'wind', 'thunder'];
export const PRESETS = [
  ['yagmur', { rain: 60, fire: 30, clock: 12 }],
  ['somine', { fire: 65, clock: 15, wind: 10 }],
  ['kafe', { cafe: 55, rain: 12 }],
  ['orman', { forest: 55, wind: 18 }],
  ['kutuphane', { clock: 22, cafe: 10, rain: 8 }],
];
let ac = null, master = null, buffers = {}, live = {}, loopId = 0, playing = false;
let levels = {}, fade = true;
try {
  levels = JSON.parse(localStorage.getItem('kuytu-mix') || '{}') || {};
  fade = localStorage.getItem('kuytu-fade') !== '0';
} catch (e) {}
const keep = () => { try { localStorage.setItem('kuytu-mix', JSON.stringify(levels)); } catch (e) {} };
export const getLevels = () => ({ ...levels });
export const fadeOn = () => fade;
export const anyOn = () => LAYERS.some(k => levels[k] > 0);
export function setFade(v) { fade = !!v; try { localStorage.setItem('kuytu-fade', fade ? '1' : '0'); } catch (e) {} }
// Şu anki karışım hazır olanlardan biriyle aynıysa onun adı
export function presetOf(m = levels) {
  const same = p => LAYERS.every(k => (p[k] || 0) === (m[k] || 0));
  const hit = PRESETS.find(([, p]) => same(p));
  return hit ? hit[0] : '';
}

function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  return ac;
}
// Altı saniyelik gürültü; sonu başına yumuşakça bağlanır, döngüde tık sesi olmaz
function noise(kind) {
  if (buffers[kind]) return buffers[kind];
  const sr = ac.sampleRate, len = sr * 6, n = Math.floor(sr * 0.2), x = new Float32Array(len + n);
  let l = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < x.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') x[i] = w * 0.5;
    else if (kind === 'pink') {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    } else { l = (l + 0.02 * w) / 1.02; x[i] = l * 3.5; }
  }
  const buf = ac.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = i < n ? x[i] * (i / n) + x[len + i] * (1 - i / n) : x[i];
  return (buffers[kind] = buf);
}
const filt = (type, f, q = 0.7) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
const amp = v => { const g = ac.createGain(); g.gain.value = v; return g; };
const rnd = (a, b) => a + Math.random() * (b - a);
// Sürekli çalan gürültü: kaynak > süzgeç > kazanç > çıkış
function bed(L, kind, chain, v) {
  const s = ac.createBufferSource(), g = amp(v);
  s.buffer = noise(kind); s.loop = true;
  let node = s;
  chain.forEach(c => { node.connect(c); node = c; });
  node.connect(g).connect(L.out);
  s.start(0, rnd(0, 5));
  L.srcs.push(s);
  return g;
}
// Kısa gürültü patlaması: damla, çıtırtı, tık
function burst(L, when, { kind = 'white', type = 'bandpass', f = 2000, q = 1, peak = 0.1, a = 0.002, d = 0.03 }) {
  const s = ac.createBufferSource(), x = filt(type, f, q), g = ac.createGain();
  s.buffer = noise(kind);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(peak, when + a);
  g.gain.exponentialRampToValueAtTime(0.0001, when + a + d);
  s.connect(x).connect(g).connect(L.out);
  s.start(when, rnd(0, 5), a + d + 0.05);
}
function tone(L, when, f, f2, dur, peak, type = 'sine') {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, when);
  o.frequency.exponentialRampToValueAtTime(f2, when + dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(peak, when + Math.min(0.02, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(L.out);
  o.start(when); o.stop(when + dur + 0.05);
}
// Rastgele aralıklarla tekrarlanan olay
const every = (L, key, min, max, fn) => (t, end) => {
  if (L[key] == null) L[key] = t + rnd(min, max) * 0.3;
  while (L[key] < end) { const w = Math.max(L[key], t); fn(w); L[key] = w + rnd(min, max); }
};
// Bir parametreyi yavaşça rastgele değerlere götürür (rüzgârın, uğultunun dalgalanması)
const drift = (L, key, param, min, max, lo, hi) => every(L, key, min, max, w => { param.setTargetAtTime(rnd(lo, hi), w, (min + max) / 4); });

const BUILD = {
  rain(L) {
    bed(L, 'pink', [filt('highpass', 700), filt('lowpass', 7000)], 0.5);
    bed(L, 'brown', [filt('lowpass', 900)], 0.35);
    L.ticks.push(every(L, 'drop', 0.015, 0.11, w => burst(L, w, { f: rnd(1800, 5200), q: rnd(4, 9), peak: rnd(0.04, 0.14), d: rnd(0.01, 0.04) })));
  },
  fire(L) {
    const roar = bed(L, 'brown', [filt('lowpass', 420)], 0.7);
    L.ticks.push(drift(L, 'roar', roar.gain, 0.4, 1.4, 0.45, 0.95));
    L.ticks.push(every(L, 'crk', 0.03, 0.35, w => {
      const n = Math.random() < 0.25 ? 3 : 1;
      for (let i = 0; i < n; i++) burst(L, w + i * rnd(0.01, 0.04), { type: 'highpass', f: rnd(1200, 4000), q: 0.7, peak: rnd(0.08, 0.45), a: 0.001, d: rnd(0.004, 0.02) });
    }));
    L.ticks.push(every(L, 'pop', 1.5, 6, w => burst(L, w, { kind: 'brown', f: rnd(250, 600), q: 2, peak: 0.5, d: 0.08 })));
  },
  clock(L) {
    L.ticks.push((t, end) => {
      if (L.tk == null || L.tk < t) L.tk = Math.ceil(t);
      while (L.tk < end) {
        const hi = (L.n = (L.n || 0) + 1) % 2;
        burst(L, L.tk, { f: hi ? 3300 : 2700, q: 9, peak: 2.2, a: 0.001, d: 0.025 });
        burst(L, L.tk, { kind: 'brown', f: hi ? 1000 : 850, q: 3, peak: 1, a: 0.001, d: 0.04 });
        L.tk += 1;
      }
    });
  },
  cafe(L) {
    bed(L, 'brown', [filt('lowpass', 220)], 0.35);
    [[330, 1.2], [700, 1.6], [1400, 2]].forEach(([f, q], i) => {
      const g = bed(L, 'pink', [filt('bandpass', f, q)], 0.3);
      L.ticks.push(drift(L, 'm' + i, g.gain, 0.12, 0.45, 0.08, 0.7));
    });
    L.ticks.push(every(L, 'clink', 2.5, 9, w => {
      const f = rnd(2200, 3600), p = rnd(0.02, 0.05);
      tone(L, w, f, f, rnd(0.3, 0.6), p); tone(L, w, f * 2.76, f * 2.76, 0.25, p * 0.5);
    }));
  },
  forest(L) {
    const leaves = bed(L, 'pink', [filt('bandpass', 1100, 0.5)], 0.12);
    L.ticks.push(drift(L, 'lv', leaves.gain, 1.5, 4, 0.05, 0.2));
    L.ticks.push(every(L, 'bird', 1.2, 6, w => {
      const base = rnd(2400, 5200), n = Math.floor(rnd(2, 7)), up = Math.random() < 0.5;
      let at = w;
      for (let i = 0; i < n; i++) {
        const d = rnd(0.05, 0.16), f = base * rnd(0.92, 1.08);
        tone(L, at, f, f * (up ? rnd(1.1, 1.4) : rnd(0.65, 0.9)), d, rnd(0.06, 0.16));
        at += d + rnd(0.03, 0.12);
      }
    }));
  },
  night(L) {
    bed(L, 'brown', [filt('lowpass', 300)], 0.12);
    [0, 1, 2].forEach(i => {
      const o = ac.createOscillator(), g = amp(0), per = rnd(0.5, 0.9), f = rnd(4200, 5300);
      o.frequency.value = f; o.connect(g).connect(L.out); o.start(); L.srcs.push(o);
      L.ticks.push(every(L, 'cr' + i, per * 0.9, per * 1.1, w => {
        const pk = rnd(0.015, 0.04) * (i === 2 ? 0.5 : 1);
        for (let k = 0; k < 4; k++) { const s = w + k * 0.04; g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(pk, s + 0.008); g.gain.linearRampToValueAtTime(0, s + 0.028); }
      }));
    });
  },
  waves(L) {
    bed(L, 'brown', [filt('lowpass', 300)], 0.3);
    const lp = filt('lowpass', 500), g = bed(L, 'pink', [lp], 0.15);
    L.ticks.push(every(L, 'wave', 6, 11, w => {
      const up = rnd(2, 3.5), peak = rnd(0.55, 0.95);
      g.gain.setTargetAtTime(peak, w, up / 3); lp.frequency.setTargetAtTime(rnd(1600, 2600), w, up / 3);
      g.gain.setTargetAtTime(0.12, w + up, 1.4); lp.frequency.setTargetAtTime(450, w + up, 1.6);
    }));
  },
  train(L) {
    bed(L, 'brown', [filt('lowpass', 180)], 0.9);
    bed(L, 'pink', [filt('bandpass', 600, 0.7)], 0.08);
    L.ticks.push(every(L, 'clack', 1.55, 1.65, w => {
      [0, 0.12, 0.56, 0.68].forEach(o => {
        burst(L, w + o, { kind: 'brown', type: 'lowpass', f: 600, q: 1, peak: 0.7, d: 0.07 });
        burst(L, w + o, { f: 2400, q: 2, peak: 0.06, a: 0.001, d: 0.015 });
      });
    }));
  },
  wind(L) {
    const bp = filt('bandpass', 500, 1.4), g = bed(L, 'pink', [bp], 0.9);
    L.ticks.push(every(L, 'gust', 2, 5, w => { bp.frequency.setTargetAtTime(rnd(280, 950), w, 1.2); g.gain.setTargetAtTime(rnd(0.45, 1.6), w, 1); }));
    const wh = filt('bandpass', 2400, 6), g2 = bed(L, 'white', [wh], 0.02);
    L.ticks.push(every(L, 'whis', 3, 7, w => { wh.frequency.setTargetAtTime(rnd(1800, 3200), w, 1.5); g2.gain.setTargetAtTime(rnd(0, 0.05), w, 1.5); }));
  },
  thunder(L) {
    L.ticks.push(every(L, 'boom', 18, 45, w => {
      const s = ac.createBufferSource(), lp = filt('lowpass', rnd(140, 300)), g = ac.createGain(), up = rnd(0.3, 1), len = rnd(4, 8), pk = rnd(0.8, 1.4);
      s.buffer = noise('brown');
      g.gain.setValueAtTime(0.0001, w);
      g.gain.linearRampToValueAtTime(pk, w + up);
      g.gain.setTargetAtTime(pk * 0.35, w + up, 0.6);
      g.gain.linearRampToValueAtTime(pk * 0.7, w + up + rnd(0.8, 1.6));
      g.gain.setTargetAtTime(0.0001, w + up + 1.8, len / 4);
      s.connect(lp).connect(g).connect(L.out);
      s.start(w, rnd(0, 5), up + len + 2);
      if (Math.random() < 0.4) burst(L, w, { type: 'lowpass', f: 2200, q: 0.5, peak: 0.35, a: 0.005, d: 0.4 });
    }));
  },
};
// Kaydırıcı 0-100; kulak yüksekliği doğrusal duymadığı için kare alınır
const gainOf = v => Math.pow(v / 100, 1.7) * 0.9;

function build(k) {
  const L = { out: amp(0), srcs: [], ticks: [] };
  L.out.connect(master);
  BUILD[k](L);
  L.out.gain.setTargetAtTime(gainOf(levels[k]), ac.currentTime, 0.3);
  live[k] = L;
}
function tear(k) {
  const L = live[k]; if (!L) return;
  delete live[k];
  L.out.gain.setTargetAtTime(0, ac.currentTime, 0.1);
  setTimeout(() => { L.srcs.forEach(s => { try { s.stop(); } catch (e) {} }); try { L.out.disconnect(); } catch (e) {} }, 600);
}
function pump() {
  if (!ac) return;
  const t = ac.currentTime, end = t + 1.6; // arka planda sekme saniyede bir uyanır; 1,6 sn ileriye planlamak boşluk bırakmaz
  Object.values(live).forEach(L => L.ticks.forEach(fn => fn(t, end)));
}
function sync() {
  LAYERS.forEach(k => {
    const v = levels[k] || 0;
    if (v > 0 && !live[k]) build(k);
    else if (v <= 0 && live[k]) tear(k);
    else if (live[k]) live[k].out.gain.setTargetAtTime(gainOf(v), ac.currentTime, 0.15);
  });
  pump();
}
// Kullanıcı bir yere dokunduğunda çağrılmalı; tarayıcılar sesi ancak öyle başlatır
export function playMix() {
  if (!anyOn()) return;
  try {
    ctx();
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setTargetAtTime(1, ac.currentTime, playing ? 0.05 : 0.6);
    playing = true;
    sync();
    if (!loopId) loopId = setInterval(pump, 250);
  } catch (e) {}
}
export function setLevel(k, v) {
  levels[k] = Math.max(0, Math.min(100, Math.round(v)));
  keep();
  if (anyOn()) playMix(); else if (ac) sync();
}
export function applyMix(m) {
  levels = {};
  LAYERS.forEach(k => { if (m[k] > 0) levels[k] = m[k]; });
  keep();
  if (anyOn()) playMix(); else stopMix(0);
}
// Sesi keser; saniye verilirse o sürede yavaşça kısılır. Düzeyler unutulmaz.
export function stopMix(sec = 0) {
  if (!ac || !playing) return;
  playing = false;
  const t = ac.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0.0001, t + Math.max(0.15, sec));
  setTimeout(() => {
    if (playing) return;
    Object.keys(live).forEach(tear);
    clearInterval(loopId); loopId = 0;
  }, Math.max(0.15, sec) * 1000 + 100);
}
export const isPlaying = () => playing;
