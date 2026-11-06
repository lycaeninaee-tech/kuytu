// Kitap arama: önce Google Books (Türkçe kapsamı daha iyi), sonuç gelmezse ya da kota dolarsa Open Library
import { BOOKS_KEY } from './config.js';

const https = u => (u ? u.replace(/^http:/, 'https:') : '');
async function googleBooks(q, extra = '') {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=16&printType=books${extra}&key=${BOOKS_KEY}`);
  if (!res.ok) throw new Error('google');
  const j = await res.json();
  return (j.items || []).map(it => {
    const v = it.volumeInfo || {};
    const cats = (v.categories || []).join(' / ');
    return { id: 'gb_' + it.id, title: v.title || '', author: (v.authors || []).join(', '), cover: https((v.imageLinks || {}).thumbnail), pages: v.pageCount || 0, year: String(v.publishedDate || '').slice(0, 4), publisher: v.publisher || '', lang: v.language || '', ...(cats ? { cats, genre: genreOf(cats) } : {}) };
  });
}
// Kitap kaynaklarının İngilizce kategorileri Türkçe türlere çevrilir; özel türler genelden önce bakılır
const GENRES = [
  ['Bilimkurgu', /science fiction|sci-fi|dystopi/], ['Fantastik', /fantasy|magic/], ['Polisiye ve gerilim', /mystery|detective|crime|thriller|suspense/], ['Korku', /horror/],
  ['Aşk', /romance|love stor/], ['Çocuk ve gençlik', /juvenile|young adult|children/], ['Çizgi roman', /comic|graphic novel|manga/], ['Şiir', /poetry|poems/],
  ['Tiyatro', /drama|plays/], ['Deneme ve eleştiri', /essays|literary criticism|literary collections/], ['Biyografi ve anı', /biography|autobiography|memoir/],
  ['Tarih', /history/], ['Felsefe', /philosoph/], ['Psikoloji ve kişisel gelişim', /psycholog|self-help|self help|personal growth/], ['Din ve inanç', /religion|spiritual|theolog/],
  ['Bilim ve doğa', /science|nature|mathemat|medical|technology/], ['İş ve ekonomi', /business|economic|finance/], ['Sanat', /\bart\b|\barts\b|music|photograph|architecture/],
  ['Roman', /fiction|novel|literary|literature/],
];
export const GENRE_NAMES = GENRES.map(g => g[0]).concat(['Diğer']);
export function genreOf(cats) {
  const c = (cats || '').toLowerCase();
  if (!c) return '';
  return (GENRES.find(([, re]) => re.test(c)) || ['Diğer'])[0];
}
// Kitabın türü: aynı kitabın baskılarının kategorilerinden
// Baskıların kategorileri tek tek yanlış olabilir (ör. "Gulls"); en çok baskıda geçen anlamlı tür seçilir
export async function fetchGenre(b) {
  const eds = (await editions(b)).filter(r => r.cats), votes = {};
  eds.forEach(r => { if (r.genre && r.genre !== 'Diğer') votes[r.genre] = (votes[r.genre] || 0) + 1; });
  const best = Object.entries(votes).sort((x, y) => y[1] - x[1])[0];
  if (best) return { genre: best[0], cats: (eds.find(r => r.genre === best[0]) || {}).cats || '' };
  return eds.length ? { genre: 'Diğer', cats: eds[0].cats } : {};
}
// Öneri: okuduğun ve sevdiğin kitapların yazarları ve türleri. Rafındakiler çıkarılır
const QUERY = { 'Bilimkurgu': 'science fiction', 'Fantastik': 'fantasy', 'Polisiye ve gerilim': 'mystery', 'Korku': 'horror', 'Aşk': 'romance', 'Çocuk ve gençlik': 'juvenile fiction', 'Çizgi roman': 'comics', 'Şiir': 'poetry', 'Tiyatro': 'drama', 'Deneme ve eleştiri': 'essays', 'Biyografi ve anı': 'biography', 'Tarih': 'history', 'Felsefe': 'philosophy', 'Psikoloji ve kişisel gelişim': 'psychology', 'Din ve inanç': 'religion', 'Bilim ve doğa': 'science', 'İş ve ekonomi': 'business', 'Sanat': 'art', 'Roman': 'fiction' };
export async function recommend(shelf) {
  // Aynı kitabın başka baskıları da elenir: parantezler atılır, ad birbirinin içinde geçiyorsa aynı sayılır
  const norm = s => (s || '').toLocaleLowerCase('tr').replace(/\(.*?\)|\[.*?\]/g, '').split(':')[0].replace(/[^a-zçğıöşü0-9]/g, '');
  const owned = shelf.map(b => norm(b.title)).filter(Boolean);
  const have = { has: t => owned.some(o => o === t || (o.length > 5 && t.includes(o)) || (t.length > 5 && o.includes(t))) };
  const liked = shelf.filter(b => b.status === 'okudum' || b.fav || (b.rating || 0) >= 4 || b.status === 'okuyorum');
  const count = key => { const m = {}; liked.forEach(b => { const v = key(b); if (v) m[v] = (m[v] || 0) + 1 + (b.fav ? 1 : 0) + ((b.rating || 0) >= 4 ? 1 : 0); }); return Object.entries(m).sort((a, b) => b[1] - a[1]).map(e => e[0]); };
  const authors = count(b => (b.author || '').split(',')[0].trim()).slice(0, 3), genres = count(b => b.genre && b.genre !== 'Diğer' ? b.genre : '').slice(0, 2);
  const asks = [...authors.map(a => ({ q: `inauthor:"${a}"`, why: a, lang: '&langRestrict=tr' })), ...genres.map(g => ({ q: `subject:"${QUERY[g] || g}"`, why: g, lang: '&langRestrict=tr' }))];
  const out = [], seen = new Set();
  for (const a of asks) {
    let list = [];
    try { list = await googleBooks(a.q, a.lang || ''); } catch (e) {}
    list.filter(b => b.title && b.cover && (!b.lang || b.lang === 'tr') && !have.has(norm(b.title)) && !seen.has(norm(b.title))).slice(0, 4).forEach(b => { seen.add(norm(b.title)); out.push({ ...b, why: a.why }); });
  }
  return out.slice(0, 12);
}
async function openLibrary(q) {
  const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=16&fields=key,title,author_name,first_publish_year,number_of_pages_median,cover_i`);
  if (!res.ok) throw new Error('openlibrary');
  const j = await res.json();
  return (j.docs || []).map(d => ({ id: 'ol_' + String(d.key).replace('/works/', ''), title: d.title || '', author: (d.author_name || []).join(', '), cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '', pages: d.number_of_pages_median || 0, year: String(d.first_publish_year || ''), publisher: '' }));
}
export async function searchBooks(q) {
  // Google bazen sorguyla ilgisiz kitaplar döndürür; ad ya da yazarda aranan kelime geçmeyenler elenir
  const norm = s => s.toLocaleLowerCase('tr');
  const words = norm(q).split(/\s+/).filter(w => w.length > 2);
  const related = b => words.some(w => norm(b.title + ' ' + b.author).includes(w));
  let list = [];
  try { list = (await googleBooks(q)).filter(related); } catch (e) {}
  if (!list.length) list = await openLibrary(q);
  // Türkçe adı kayıtlı olmayan kitaplar için en uzun kelimeyle (çoğu zaman özel ad) bir kez daha denenir
  if (!list.length && words.length > 1) list = await openLibrary(words.slice().sort((a, b) => b.length - a.length)[0]);
  return list.filter(b => b.title);
}
async function olCovers(b) {
  const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(b.title)}${b.author ? '&author=' + encodeURIComponent(b.author) : ''}&limit=8&fields=cover_i`);
  return ((await res.json()).docs || []).filter(x => x.cover_i).map(x => `https://covers.openlibrary.org/b/id/${x.cover_i}-L.jpg`);
}
const olCover = async b => (await olCovers(b))[0] || '';
// Kapak seçici için iki kaynaktaki bütün kapaklar
export async function coverChoices(b) {
  const [g, o] = await Promise.all([editions(b).catch(() => []), olCovers(b).catch(() => [])]);
  return [...new Set([...g.map(r => r.cover), ...o].filter(Boolean))].slice(0, 16);
}
// Aynı kitabın baskıları: adın en az yarısı tutmalı, yazar biliniyorsa soyadı da
export async function editions(b) {
  const norm = s => (s || '').toLocaleLowerCase('tr');
  const words = norm(b.title).split(/\s+/).filter(w => w.length > 2), surname = norm(b.author).split(/\s+/).pop();
  const list = await searchBooks([b.title, b.author].filter(Boolean).join(' '));
  const hits = r => words.filter(w => norm(r.title).includes(w)).length;
  return list.filter(r => hits(r) >= Math.ceil(words.length / 2) && (!surname || norm(r.author).includes(surname)));
}
// Kapağı ya da sayfa sayısı eksik kitap için en uygun baskıyı seçer, yalnızca eksik alanları döndürür
export async function fillInfo(b) {
  const best = (await editions(b)).sort((x, y) => (y.cover ? 2 : 0) + (y.pages ? 1 : 0) - (x.cover ? 2 : 0) - (x.pages ? 1 : 0))[0] || {};
  const out = {};
  for (const k of ['cover', 'pages', 'year', 'publisher']) if (!b[k] && best[k]) out[k] = best[k];
  // Google'da kapak yoksa Open Library'de ad ve yazarla ayrıca aranır
  if (!b.cover && !out.cover) out.cover = await olCover(b).catch(() => '') || undefined;
  if (!out.cover) delete out.cover;
  return out;
}
