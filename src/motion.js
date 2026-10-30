// Hareket: sayfa geçişi, sırayla beliren bölümler, sayarak artan rakamlar, eğilen kapaklar. "Hareketi azalt" açıksa çalışmaz.
const reduce = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let next = false, io = null;
export function pageChange(run) {
  next = true;
  if (!document.startViewTransition || reduce() || document.hidden) return run();
  try { document.startViewTransition(run).updateCallbackDone.catch(() => run()); } catch (e) { run(); }
}
const SEL = '.stage-text > *, .spot-body > *, .stage-cover, .box, .rail-section, .numbers > div, .timeline li, .marquee, .pagehead, .polaroid, .badge, .surface';
export function enhance(root) {
  if (!next || reduce()) { next = false; return; }
  next = false;
  const counts = new Map(), els = [...root.querySelectorAll(SEL)];
  els.forEach(el => {
    const i = counts.get(el.parentElement) || 0;
    counts.set(el.parentElement, i + 1);
    el.classList.add('rv');
    el.style.setProperty('--i', Math.min(i, 8));
  });
  if (!io && 'IntersectionObserver' in window) io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  els.forEach(el => (io ? io.observe(el) : el.classList.add('in')));
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = parseFloat(el.dataset.count);
    if (!isFinite(to)) return;
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 1100);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  });
}
if (window.matchMedia && matchMedia('(hover: hover)').matches) {
  let last = null;
  document.addEventListener('pointermove', e => {
    const el = e.target.closest ? e.target.closest('.tilt') : null;
    if (last && last !== el) { last.style.removeProperty('--rx'); last.style.removeProperty('--ry'); }
    last = el;
    if (!el || reduce()) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(1) + 'deg');
    el.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * 10).toFixed(1) + 'deg');
  });
}
