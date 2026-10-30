// Kitap arama: önce Google Books (Türkçe kapsamı daha iyi), sonuç gelmezse ya da kota dolarsa Open Library
import { BOOKS_KEY } from './config.js';

const https = u => (u ? u.replace(/^http:/, 'https:') : '');
async function googleBooks(q) {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=16&printType=books&key=${BOOKS_KEY}`);
  if (!res.ok) throw new Error('google');
  const j = await res.json();
  return (j.items || []).map(it => {
    const v = it.volumeInfo || {};
    return { id: 'gb_' + it.id, title: v.title || '', author: (v.authors || []).join(', '), cover: https((v.imageLinks || {}).thumbnail), pages: v.pageCount || 0, year: String(v.publishedDate || '').slice(0, 4), publisher: v.publisher || '' };
  });
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
