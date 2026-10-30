// Tasarım dilinin ortak parçaları: üç boyutlu kitap, kemer, ay, yıldız, kedi, saksı
import { esc } from './util.js';

export const hueOf = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
export const coverHTML = b => (b.cover
  ? `<img class="cover" src="${esc(b.cover)}" alt="" loading="lazy">`
  : `<span class="cover ph" style="--h:${hueOf(b.title)}"><b>${esc(b.title)}</b></span>`);
export const book3d = (b, w) => `<div class="p3"><div class="b3" style="--w:min(${w}px,42vw)"><div class="k"></div><div class="p"></div><div class="f">${coverHTML(b)}</div></div></div>`;

export const MOON = '<svg class="moon" viewBox="0 0 32 32" aria-hidden="true"><path fill="#f2b84b" d="M20 3A13 13 0 1 0 29 22A10.5 10.5 0 0 1 20 3Z"/></svg>';
export const star = (x, y, size, delay = 0) => `<svg class="tw" style="left:${x};top:${y};width:${size}px;height:${size}px;animation-delay:${delay}s" viewBox="0 0 24 24" aria-hidden="true"><path fill="#e0cdaa" d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>`;
export const CAT = '<svg class="cat" viewBox="0 0 84 64" aria-hidden="true"><path class="tail" d="M58 56C74 58 80 46 72 38" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path fill="currentColor" d="M8 64C6 38 16 22 30 20L33 8L43 18L53 8L55 22C64 28 66 44 62 64Z"/><path class="eye" d="M31 34q4 4 8 0M47 34q4 4 8 0" fill="none" stroke-width="2" stroke-linecap="round"/></svg>';
export const PLANT = '<svg class="plant" viewBox="0 0 70 104" aria-hidden="true"><path fill="#a8865a" d="M18 72H52L47 104H23Z"/><path d="M35 72C35 50 28 36 12 28M35 72C35 46 38 28 34 6M35 72C37 52 46 38 60 32" fill="none" stroke="#6b7d63" stroke-width="3"/><path fill="#6b7d63" d="M12 28C22 22 30 30 28 40C18 42 12 36 12 28ZM34 6C44 14 44 26 37 32C28 26 28 14 34 6ZM60 32C60 44 52 50 43 48C42 38 50 30 60 32Z"/></svg>';
export const WAVE = '<svg class="wave" viewBox="0 0 220 12" aria-hidden="true"><path d="M2 8C30 1 52 12 82 7S136 2 164 8S204 9 218 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
// İç içe halkalar kemerin derinliğini verir; en içteki katman içeriği taşır
export const arch = (inner, cls = '') => `<div class="ring r1 ${cls}"><div class="ring r2"><div class="ring r3"><div class="ring r4">${inner}</div></div></div></div>`;
// Sayfanın arkasındaki ışık kitaba göre değişir, ama hep Kuytu'nun sıcak tonlarında kalır
const WARM = ['#f2b84b', '#e0a35f', '#d98a5b', '#c9a27a', '#a9b58f'];
export const setAmbient = title => document.documentElement.style.setProperty('--amb', title ? WARM[hueOf(title) % WARM.length] : WARM[0]);
