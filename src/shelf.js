import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { fs } from './auth.js';

export const STATUS = [['okuyorum', 'Okuyorum'], ['istiyorum', 'Okumak istiyorum'], ['okudum', 'Okudum'], ['biraktim', 'Bıraktım']];
export const watchShelf = (uid, cb) => onSnapshot(collection(fs, 'users', uid, 'shelf'), s => cb(s.docs.map(d => ({ ...d.data(), id: d.id }))));
// Raf hızlı açılsın diye kitabın temel bilgileri raf belgesinde de tutulur; katalog belgesi bir kez oluşur, varsa hata yok sayılır
export async function addToShelf(uid, b, status) {
  const { id, title, author, cover, pages, year, publisher } = b;
  const info = { title, author, cover, pages, year, publisher };
  setDoc(doc(fs, 'catalog', id), info).catch(() => {});
  await setDoc(doc(fs, 'users', uid, 'shelf', id), { ...info, status, addedAt: new Date().toISOString() });
}
export const updateShelf = (uid, id, data) => setDoc(doc(fs, 'users', uid, 'shelf', id), data, { merge: true });
export const removeShelf = (uid, id) => deleteDoc(doc(fs, 'users', uid, 'shelf', id));
