// Hesap: verini indirme, Goodreads'ten aktarma, takvime okuma hatırlatıcısı, gizlilik sayfası ve hesabı silme
import { collection, doc, getDoc, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { fs, deleteMe } from './auth.js';
import { addToShelf, updateShelf } from './shelf.js';

const SUBS = ['shelf', 'sessions', 'quotes', 'notes', 'clubs', 'demoMeta'];
const save = (name, text, type) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};

export async function exportData(uid) {
  const out = { exportedAt: new Date().toISOString(), profile: (await getDoc(doc(fs, 'users', uid))).data() || {} };
  for (const s of SUBS.slice(0, 5)) out[s] = (await getDocs(collection(fs, 'users', uid, s))).docs.map(d => ({ id: d.id, ...d.data() }));
  save(`kuytu-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 2), 'application/json');
}

// Her gün tekrarlayan takvim etkinliği: sunucu gerektirmez, telefonun kendi takvimi hatırlatır
export function reminderICS(time) {
  const [h, m] = (time || '21:30').split(':').map(Number), d = new Date(), p = n => String(n).padStart(2, '0');
  const start = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(h)}${p(m)}00`;
  const url = location.origin + location.pathname;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kuytu//TR', 'BEGIN:VEVENT', `UID:kuytu-okuma-${Date.now()}@kuytu`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, `DTSTART:${start}`, 'DURATION:PT20M', 'RRULE:FREQ=DAILY',
    'SUMMARY:Kuytu: okuma vakti', `DESCRIPTION:Birkaç sayfa bile yeter. ${url}`, `URL:${url}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Okuma vakti', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  save('kuytu-okuma.ics', ics, 'text/calendar');
}

// Goodreads dışa aktarma dosyası (CSV). Rafta aynı adda kitap varsa atlanır; kapaklar sonradan arka planda tamamlanır
const parseCSV = text => {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.length > 1);
};
const grDay = s => (/^\d{4}\/\d{2}\/\d{2}$/.test(s) ? s.replace(/\//g, '-') + 'T12:00:00.000Z' : '');
export async function importGoodreads(uid, file, shelf, progress) {
  const [head = [], ...rows] = parseCSV((await file.text()).replace(/^﻿/, ''));
  const col = name => head.indexOf(name);
  if (['Title', 'Author', 'Exclusive Shelf'].some(n => col(n) < 0)) throw new Error('csv');
  const have = new Set(shelf.map(b => (b.title || '').toLocaleLowerCase('tr')));
  const STATUS = { read: 'okudum', 'currently-reading': 'okuyorum', 'to-read': 'istiyorum' };
  let n = 0;
  for (const r of rows) {
    const g = k => (col(k) >= 0 ? (r[col(k)] || '').trim() : '');
    const title = g('Title').replace(/\s*\([^()]*#[\d.]+\)\s*$/, '');
    if (!title || have.has(title.toLocaleLowerCase('tr'))) continue;
    const status = STATUS[g('Exclusive Shelf')] || 'istiyorum', id = 'gr_' + (g('Book Id') || crypto.randomUUID());
    await addToShelf(uid, { id, title, author: g('Author'), cover: '', pages: Number(g('Number of Pages')) || 0, year: g('Original Publication Year') || g('Year Published'), publisher: g('Publisher') }, status);
    const extra = { importedFrom: 'goodreads' }, isbn = g('ISBN13').replace(/[="]/g, '');
    if (Number(g('My Rating'))) extra.rating = Number(g('My Rating'));
    if (status === 'okudum' && grDay(g('Date Read'))) extra.finishedAt = grDay(g('Date Read'));
    if (grDay(g('Date Added'))) extra.addedAt = grDay(g('Date Added'));
    if (isbn) extra.isbn = isbn;
    await updateShelf(uid, id, extra);
    have.add(title.toLocaleLowerCase('tr'));
    progress(++n);
  }
  return n;
}

// Hesabı silme: kişisel her şey ve kulüp üyelikleri. Kulüplerin ortak defteri (kitaplar, notlar) hiçbir zaman silinmez
export const freshLogin = user => Date.now() - new Date(user.metadata.lastSignInTime).getTime() < 5 * 60 * 1000;
export async function deleteAccount(user, profile) {
  const uid = user.uid;
  for (const c of (await getDocs(collection(fs, 'users', uid, 'clubs'))).docs) await deleteDoc(doc(fs, 'clubs', c.id, 'members', uid)).catch(() => {});
  for (const s of SUBS) for (const d of (await getDocs(collection(fs, 'users', uid, s))).docs) await deleteDoc(d.ref);
  if (profile && profile.username) await deleteDoc(doc(fs, 'usernames', profile.username)).catch(() => {});
  await deleteDoc(doc(fs, 'users', uid));
  await deleteMe();
}

// Gizlilik: neyin saklandığı ve kimin neyi gördüğü, sade bir dille
export const privacyHTML = () => `<article class="privacy">
  <p class="cap">KUYTU · GİZLİLİK</p><h1 class="kt sm">Verin <i>senin</i></h1><p class="lbl small">Son güncelleme: 4 Kasım 2026</p>
  <h3>Ne saklıyoruz</h3>
  <p>Giriş için e-posta adresin ya da Google hesabın Google Firebase Authentication'da durur; profilinde saklanmaz, kimseye gösterilmez. Kuytu'da ayrıca adın, kullanıcı adın ve kendini anlattığın tek cümle; kitaplığın (kitaplar, durumları, kaldığın sayfa, puanların, ödünç bilgileri), okuma oturumların, alıntıların, kenar notların ve hedeflerin saklanır. Bunlar Google'ın Firebase (Cloud Firestore) hizmetinde tutulur.</p>
  <h3>Kim neyi görür</h3>
  <p>Kitaplığın, okuma kayıtların, alıntıların, kenar notların ve hedeflerin yalnızca sana açıktır. Bir kulübe katılırsan o kulübün üyeleri adını, kullanıcı adını ve kartını görür: tek cümlen, kalbindeki dört kitap ve şu an okuduğun kitap. Kulübe yazdığın notlar, verdiğin puanlar ve ilerlemen o kulübün üyelerine açıktır. Sayfa sayıların, okuma sürelerin, serilerin ve hedeflerin kimseye gösterilmez.</p>
  <h3>Başka nereye gidiyor</h3>
  <p>Kitap ararken yazdığın kelimeler kitap bilgisi ve kapak bulmak için Google Books ve Open Library'ye gönderilir. Yazı tipleri Google Fonts'tan yüklenir. Reklam yok, izleme ya da analiz aracı yok, verin satılmaz.</p>
  <h3>Cihazında</h3>
  <p>Son açtığın kulüp, kitap renkleri ve görünüm tercihleri gibi küçük ayarlar yalnızca tarayıcında tutulur.</p>
  <h3>Hakların</h3>
  <p>Profilim'den bütün verini bir dosya olarak indirebilir, hesabını ve kişisel verinin tamamını silebilirsin. Silince kulüplerden de çıkarsın; kulüplere yazdığın notlar kulübün ortak defterinde kalır, istersen önce onları silebilirsin.</p>
</article>`;
