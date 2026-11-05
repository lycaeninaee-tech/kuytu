// Tasarım dilinin ortak parçaları: önden görünen kapak, kitabın rengi, kapaktan zemin
import { esc } from './util.js';

export const hueOf = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
// Kapaklar her zaman büyük boy istenir: Google'ın 128 piksellik küçük resmi 800x1200'e, Open Library'nin küçük ve orta boyu büyüğe çevrilir; köşe kıvrımı efekti kaldırılır
export const hiRes = u => {
  if (!u || u.startsWith('data:')) return u || '';
  if (u.includes('books.google')) return u.replace(/&edge=curl/g, '').replace(/&fife=[^&]*/g, '') + '&fife=w800-h1200';
  return u.replace(/-[SM]\.jpg$/, '-L.jpg');
};
export const coverHTML = b => (b.cover
  ? `<img class="cover" src="${esc(hiRes(b.cover))}" alt="" loading="lazy">`
  : `<span class="cover ph" style="--h:${hueOf(b.title)}"><b>${esc(b.title)}</b></span>`);
// Son kelime italik ve kitabın renginde
export const emLast = s => { const w = esc(s || '').split(' '); return w.length > 1 ? w.slice(0, -1).join(' ') + ' <i>' + w[w.length - 1] + '</i>' : w[0]; };

// Kitabın rengi: kişi seçtiyse o; yoksa kapağın baskın renginin en yakını sekiz mücevher tonundan biri.
// Kapak okunamazsa ya da rengi yoksa (siyah, beyaz, gri) adından biri seçilir. Hepsi aynı derinlikte; krem sayfa ve kurdeleyle uyumlu, hiçbiri kahveye dönmez
export const JEWELS = [['yakut', '#8a2f45', 0], ['kiremit', '#a8492a', 30], ['çimen', '#3f6b3a', 75], ['zümrüt', '#1f6b52', 140], ['deniz', '#1f6470', 185], ['safir', '#2f4f86', 220], ['lavanta', '#55438a', 265], ['mürdüm', '#7a2f6b', 310]];
const nearest = h => JEWELS.reduce((best, j) => { const d = Math.min(Math.abs(h - j[2]), 360 - Math.abs(h - j[2])); return d < best[0] ? [d, j[1]] : best; }, [999, JEWELS[0][1]])[1];
let cache = {};
try { cache = JSON.parse(localStorage.getItem('kuytu-renk3') || '{}'); } catch (e) {}
export const colorOf = b => (b && (b.color || cache[b.id] || JEWELS[hueOf(b.title || '') % JEWELS.length][1])) || JEWELS[0][1];
export function learnColor(b, apply) {
  if (!b || b.color || !b.cover || b.id in cache) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 24;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, 24, 24);
      const d = g.getImageData(0, 0, 24, 24).data;
      // Ortalama değil baskın renk: renkli noktalar 30 derecelik dilimlere doygunluklarıyla oy verir
      const votes = new Array(12).fill(0), sum = new Array(12).fill(0);
      let n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, gr = d[i + 1] / 255, bl = d[i + 2] / 255, hi = Math.max(r, gr, bl), lo = Math.min(r, gr, bl), c = hi - lo;
        if (c < .16 || hi < .16 || lo > .86) continue;
        let h = hi === r ? ((gr - bl) / c) % 6 : hi === gr ? (bl - r) / c + 2 : (r - gr) / c + 4;
        h = (h * 60 + 360) % 360;
        const k = Math.floor(h / 30) % 12;
        votes[k] += c; sum[k] += h * c; n++;
      }
      if (n < 12) { cache[b.id] = ''; return; }
      const k = votes.indexOf(Math.max(...votes)), hex = nearest(sum[k] / votes[k]);
      cache[b.id] = hex;
      try { localStorage.setItem('kuytu-renk3', JSON.stringify(cache)); } catch (e) {}
      apply(hex);
    } catch (e) { cache[b.id] = ''; }
  };
  img.src = b.cover;
}

// Önden görünen ciltli kapak: altında sayfa katmanı, arasından sarkan kurdele. Resmi yoksa kitabın renginde adı ve yazarıyla çizilir
export const flat = (b, w, cls = '') => `<span class="fcw ${cls}" style="--fw:${w}px;--c:${colorOf(b)}"><span class="fc">${b.cover
  ? `<img src="${esc(hiRes(b.cover))}" alt="${esc(b.title)}" loading="lazy">`
  : `<b>${esc(b.title)}</b><small>${esc((b.author || '').toLocaleUpperCase('tr'))}</small>`}</span><i class="pgs"></i><i class="bm"></i></span>`;
export const book3d = (b, w) => flat(b, w, 'big');

// Sol bölümün zemini kitabın kendi kapağıdır: büyütülüp yumuşakça bulanıklaştırılır, üstüne kitabın rengi biner. Kapak yoksa düz renk kalır
export const backdrop = b => (b && b.cover ? `<div class="bd" aria-hidden="true" style="background-image:url('${esc(hiRes(b.cover))}')"></div>` : '');

// Kitabın sayfa kenarı: okunan sayfalar kitabın renginde, kurdele kaldığın yerde.
// Son bakıştan bu yana okunanlar kısa bir animasyonla dolar; araya giren yeniden çizimlerde animasyon kaldığı yerden sürer
let seen = {}, anim = null;
try { seen = JSON.parse(localStorage.getItem('kuytu-kenar') || '{}'); } catch (e) {}
export function edge(b, pct) {
  const last = b.id in seen ? seen[b.id] : 0, running = anim && anim.id === b.id && anim.p === pct && Date.now() < anim.at + 2000;
  if (!running) anim = last < pct ? { id: b.id, from: last, p: pct, at: Date.now() } : null;
  if (seen[b.id] !== pct) { seen[b.id] = pct; try { localStorage.setItem('kuytu-kenar', JSON.stringify(seen)); } catch (e) {} }
  const a = anim && anim.id === b.id ? anim : null;
  return `<div class="pedge${a ? ' grow' : ''}" style="--p:${pct}%;--from:${a ? a.from : pct}%;--dl:${a ? a.at - Date.now() : 0}ms" role="img" aria-label="%${pct}"><i class="ed-read"></i><i class="ed-mark"></i></div>`;
}

// Okuma odasında kullanılan küçük süsler
export const MOON = '<svg class="moon" viewBox="0 0 32 32" aria-hidden="true"><path fill="#e1b56c" d="M20 3A13 13 0 1 0 29 22A10.5 10.5 0 0 1 20 3Z"/></svg>';
export const star = (x, y, size, delay = 0) => `<svg class="tw" style="left:${x};top:${y};width:${size}px;height:${size}px;animation-delay:${delay}s" viewBox="0 0 24 24" aria-hidden="true"><path fill="#e0cdaa" d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>`;
export const CAT = '';
export const setAmbient = () => {};
