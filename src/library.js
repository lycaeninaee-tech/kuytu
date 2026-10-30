// Kitaplığım: evdeki kitaplık. Kemerin içinde raflar, kitap sırtları ve öne gelen kitap kartı
import { esc } from './util.js';
import { TN as N, T } from './strings.js';
import { STATUS } from './shelf.js';
import { book3d, arch, MOON, star, CAT, PLANT, hueOf } from './parts.js';

const SPINE = [['#f2b84b', '#1b1b1b'], ['#e0cdaa', '#2f2e2e'], ['#8f4a32', '#f5efe7'], ['#f5efe7', '#2f2e2e'], ['#6b7d63', '#f5efe7'], ['#a8865a', '#1b1b1b'], ['#d9c7b0', '#2f2e2e']];
const homeBooks = S => S.shelf.filter(b => !b.wish && !b.lentTo);
const sections = {
  okudum: l => l.filter(b => b.status === 'okudum'),
  sirada: l => l.filter(b => b.status !== 'okudum'),
  kalp: l => l.filter(b => b.fav),
};
const spine = b => {
  const h = hueOf(b.title), [bg, fg] = SPINE[h % SPINE.length];
  const w = Math.max(26, Math.min(44, 24 + Math.round((b.pages || 240) / 30)));
  return `<button type="button" class="s sp" data-act="openbook" data-id="${esc(b.id)}" style="--sw:${w}px;--sh:${118 + h % 28}px;background-color:${bg};color:${fg}">${esc(b.title)}</button>`;
};
export function panel(list) {
  const per = innerWidth < 560 ? 7 : innerWidth < 900 ? 12 : 18;
  const rows = [];
  for (let i = 0; i < list.length; i += per) rows.push(list.slice(i, i + per));
  while (rows.length < 3) rows.push([]);
  return rows.map((r, i) => `<div class="raf">${r.map(spine).join('')}${i === rows.length - 1 ? `<span class="deco">${PLANT}</span>` : i === 0 ? `<span class="deco cream">${CAT}</span>` : ''}</div>`).join('');
}
// Seçim yapılmadıysa kitaplık ilk dolu rafla açılır
const secNow = S => S.rafSec || ['okudum', 'sirada', 'kalp'].find(k => sections[k](homeBooks(S)).length) || 'okudum';
const listNow = S => {
  if (S.libTab === 'odunc') return S.shelf.filter(b => b.lentTo);
  if (S.libTab === 'istek') return S.shelf.filter(b => b.wish);
  return sections[secNow(S)](homeBooks(S));
};
// Raf değişince raflar derinden öne gelir; yalnızca seçimde oynar, her yenilemede değil
export const playPanel = () => { const p = document.getElementById('raf-panel'); if (p) p.classList.add('go'); };
export function viewLibrary(S, enter, clubMissing = 0) {
  const tab = S.libTab || 'evde', sec = secNow(S), home = homeBooks(S), lent = S.shelf.filter(b => b.lentTo), now = listNow(S);
  const tabs = [['evde', N.tabHome], ['odunc', N.tabLent], ['istek', N.tabWish]].map(([k, l]) => `<button type="button" class="${tab === k ? 'on' : ''}" data-act="libtab" data-v="${k}">${l}</button>`).join('');
  const secs = [['okudum', N.secRead], ['sirada', N.secNext], ['kalp', N.secHeart]].map(([k, l]) => `<button type="button" class="tab ${sec === k ? 'on' : ''}" data-act="rafsec" data-v="${k}">${l}<span>${sections[k](home).length}</span></button>`).join('');
  const side = tab === 'evde' ? `<div class="tabs">${secs}</div><p class="lbl">${N.enterHint}</p>`
    : tab === 'odunc' ? (lent.length ? `<ul class="lendlist">${lent.map(b => `<li><button type="button" data-act="openbook" data-id="${esc(b.id)}"><b>${esc(b.title)}</b><span>${esc(b.lentTo)}</span></button></li>`).join('')}</ul>` : `<p class="muted">${N.noLent}</p>`)
    : `<p class="muted">${N.wishHint}</p>`;
  return `<div class="lib">
    <div class="lib-side"><h1>${N.lib}</h1><div class="seg" role="group">${tabs}</div>${side}
      ${clubMissing ? `<button type="button" class="btn ghost" data-act="importclub">${N.importClub} (${clubMissing})</button>` : ''}
      <div class="lib-btn"><button type="button" class="btn" data-act="scan">${N.scan}</button><a class="btn ghost" href="#ara">${T.navSearch}</a></div></div>
    ${arch(`<div class="glow"></div><div class="lamba"><svg viewBox="0 0 80 172" aria-hidden="true"><path d="M40 0V112" stroke="#a8865a" stroke-width="2"/><path fill="#a8865a" d="M14 150C16 124 28 112 40 112S64 124 66 150Z"/><ellipse cx="40" cy="151" rx="26" ry="5" fill="#f2b84b"/></svg></div>
      <div class="cam">${S.shelf.length} ${N.bookWord} · ${lent.length} ${N.lentWord}</div>${MOON}${star('24%', '16%', 16)}${star('66%', '12%', 12, 1.3)}
      <span class="mote" style="left:18%"></span><span class="mote" style="left:38%;animation-delay:2s"></span><span class="mote" style="left:56%;animation-delay:4s"></span><span class="mote" style="left:78%;animation-delay:6s"></span>
      <div class="pn" id="raf-panel">${panel(now)}</div>
      ${S.shelf.length ? '' : `<a class="arch-empty" href="#ara">${N.emptyShelf}</a>`}`, `lib-arch${enter ? ' enter' : ''}`)}
  </div>`;
}
export function cardHTML(S, b, first) {
  const st = STATUS.map(([k, label]) => `<button type="button" class="${b.status === k ? 'on' : ''}" data-act="status" data-v="${k}">${label}</button>`).join('');
  const stars = [1, 2, 3, 4, 5].map(n => `<button type="button" class="${(b.rating || 0) >= n ? 'on' : ''}" data-act="rate" data-v="${n}" aria-label="${n}">★</button>`).join('');
  return `<div class="card-scrim" data-act="bookclose"></div><div class="card-in ${first ? 'first' : ''}" role="dialog" aria-label="${esc(b.title)}">
    <div class="card-book">${book3d(b, 250)}</div>
    <div class="fis"><p class="lbl">${N.card}</p><h2>${esc(b.title)}</h2><p class="muted">${esc([b.author || T.unknownAuthor, b.year].filter(Boolean).join(' · '))}</p>
      <div class="seg wrap" role="group">${st}</div>
      <div class="rate" role="group" aria-label="${T.rating}">${stars}</div>
      <form id="page-form" class="pagebar"><label>${T.currentPage}<input name="page" type="number" min="0" max="20000" value="${b.page || ''}"></label><label>${T.pages}<input name="pages" type="number" min="1" max="20000" value="${b.pages || ''}"></label><button class="btn ghost" type="submit">${T.save}</button></form>
      <div class="actions"><button type="button" class="btn ghost" data-act="fav" aria-pressed="${!!b.fav}">${b.fav ? N.unheart : N.heart}</button><button type="button" class="btn ghost" data-act="wish" aria-pressed="${!!b.wish}">${b.wish ? N.gotIt : N.toWish}</button></div>
      ${b.lentTo ? `<p class="lent">${esc(b.lentTo)} ${N.has}${b.lentAt ? ' · ' + esc(new Date(b.lentAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })) : ''}</p><button type="button" class="btn" data-act="lendback">${N.back}</button>`
    : `<form id="lend-form" class="pagebar"><label>${N.lendTo}<input name="who" maxlength="60" required></label><button class="btn" type="submit">${N.lend}</button></form>`}
      <div class="card-foot"><a class="linkbtn" href="#okuma">${N.startRead}</a><button class="linkbtn small" type="button" data-act="remove">${S.armed ? T.removeSure : T.remove}</button><button class="linkbtn" type="button" data-act="bookclose">${N.close}</button></div>
    </div></div>`;
}
// Barkod okuyucu telefon kamerasını kullanır; desteklemeyen tarayıcıda ISBN elle aranır
export async function scanBarcode() {
  if (!('BarcodeDetector' in window)) return null;
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  const box = document.createElement('div');
  box.className = 'scanner';
  box.innerHTML = `<video playsinline muted></video><p>${N.scanHint}</p><button type="button" class="btn light">${N.close}</button>`;
  document.body.appendChild(box);
  const video = box.querySelector('video');
  video.srcObject = stream;
  await video.play();
  const det = new window.BarcodeDetector({ formats: ['ean_13'] });
  let live = true;
  const stop = () => { live = false; stream.getTracks().forEach(t => t.stop()); box.remove(); };
  return new Promise(res => {
    box.querySelector('button').addEventListener('click', () => { stop(); res(''); });
    const tick = async () => {
      if (!live) return;
      try { const c = await det.detect(video); if (c[0]) { stop(); return res(c[0].rawValue); } } catch (e) {}
      setTimeout(tick, 300);
    };
    tick();
  });
}
