// Kitap arama: önce Google Books (Türkçe kapsamı daha iyi), sonuç gelmezse ya da kota dolarsa Open Library
const https = u => (u ? u.replace(/^http:/, 'https:') : '');
async function googleBooks(q) {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=16&printType=books`);
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
  let list = [];
  try { list = await googleBooks(q); } catch (e) {}
  if (!list.length) list = await openLibrary(q);
  return list.filter(b => b.title);
}
