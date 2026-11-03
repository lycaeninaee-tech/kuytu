// Tasarım dilinin ortak parçaları: önden görünen kapak, kitabın rengi, ebru iç kapak
import { esc } from './util.js';

export const hueOf = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
export const coverHTML = b => (b.cover
  ? `<img class="cover" src="${esc(b.cover)}" alt="" loading="lazy">`
  : `<span class="cover ph" style="--h:${hueOf(b.title)}"><b>${esc(b.title)}</b></span>`);
// Son kelime italik ve kitabın renginde
export const emLast = s => { const w = esc(s || '').split(' '); return w.length > 1 ? w.slice(0, -1).join(' ') + ' <i>' + w[w.length - 1] + '</i>' : w[0]; };

// Kitabın rengi: kapaktan okunabiliyorsa ondan, okunamıyorsa adından seçilen koyu bir tondan gelir
const PAL = ['#2c5a47', '#4f5fb5', '#b8432d', '#2f6f76', '#7d5226', '#62457f', '#a5561b', '#2a5573'];
let cache = {};
try { cache = JSON.parse(localStorage.getItem('kuytu-renk') || '{}'); } catch (e) {}
export const colorOf = b => (b && (cache[b.id] || PAL[hueOf(b.title || '') % PAL.length])) || PAL[0];
export function learnColor(b, apply) {
  if (!b || !b.cover || b.id in cache) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 24;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, 24, 24);
      const d = g.getImageData(0, 0, 24, 24).data;
      let r = 0, gr = 0, bl = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const hi = Math.max(d[i], d[i + 1], d[i + 2]), lo = Math.min(d[i], d[i + 1], d[i + 2]);
        if (hi - lo < 40 || hi < 40 || lo > 220) continue;
        r += d[i]; gr += d[i + 1]; bl += d[i + 2]; n++;
      }
      if (n < 12) { cache[b.id] = ''; return; }
      // Krem yazı okunsun diye renk koyulaştırılır
      const rgb = [r / n, gr / n, bl / n], light = (Math.max(...rgb) + Math.min(...rgb)) / 510, k = light > 0.36 ? 0.36 / light : 1;
      const hex = '#' + rgb.map(v => Math.round(v * k).toString(16).padStart(2, '0')).join('');
      cache[b.id] = hex;
      try { localStorage.setItem('kuytu-renk', JSON.stringify(cache)); } catch (e) {}
      apply(hex);
    } catch (e) { cache[b.id] = ''; }
  };
  img.src = b.cover;
}

// Önden görünen ciltli kapak: altında sayfa katmanı, arasından sarkan kurdele. Resmi yoksa kitabın renginde adı ve yazarıyla çizilir
export const flat = (b, w, cls = '') => `<span class="fcw ${cls}" style="--fw:${w}px;--c:${colorOf(b)}"><span class="fc">${b.cover
  ? `<img src="${esc(b.cover)}" alt="${esc(b.title)}" loading="lazy">`
  : `<b>${esc(b.title)}</b><small>${esc((b.author || '').toLocaleUpperCase('tr'))}</small>`}</span><i class="pgs"></i><i class="bm"></i></span>`;
export const book3d = (b, w) => flat(b, w, 'big');

// Ebru: eski kitapların iç kapak kâğıdı. Kitabın rengiyle çizilir, çok yavaş akar
export const ebru = p => `<svg class="ebru" viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="${p}s" width="84" height="900" patternUnits="userSpaceOnUse"><rect width="84" height="900" style="fill:var(--book)"/><rect width="20" height="900" style="fill:#efe4cc"/><rect x="30" width="7" height="900" style="fill:#c8462f"/><rect x="48" width="24" height="900" style="fill:rgba(0,0,0,.28)"/></pattern><filter id="${p}m" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.007 0.004" numOctaves="2" seed="7" result="t"><animate attributeName="baseFrequency" dur="40s" values="0.007 0.004;0.009 0.005;0.007 0.004" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="t" scale="170" xChannelSelector="R" yChannelSelector="G"/></filter></defs><rect x="-100" y="-100" width="600" height="1100" fill="url(#${p}s)" filter="url(#${p}m)" transform="rotate(14 200 450)"/></svg>`;

// Okuma odasında kullanılan küçük süsler
export const MOON = '<svg class="moon" viewBox="0 0 32 32" aria-hidden="true"><path fill="#e1b56c" d="M20 3A13 13 0 1 0 29 22A10.5 10.5 0 0 1 20 3Z"/></svg>';
export const star = (x, y, size, delay = 0) => `<svg class="tw" style="left:${x};top:${y};width:${size}px;height:${size}px;animation-delay:${delay}s" viewBox="0 0 24 24" aria-hidden="true"><path fill="#e0cdaa" d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>`;
export const CAT = '';
export const setAmbient = () => {};
