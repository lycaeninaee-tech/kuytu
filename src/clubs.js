// Kulüp verisi. Üyelik clubs/{id}/members altında; kişinin kulüp listesi users/{uid}/clubs altında kopyalanır
import { collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, getDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { fs } from './auth.js';

const nowISO = () => new Date().toISOString();
export const watchCol = (path, cb, onErr) => onSnapshot(collection(fs, path), s => cb(s.docs.map(d => ({ ...d.data(), id: d.id }))), onErr);
export const watchDoc = (path, cb, onErr) => onSnapshot(doc(fs, path), s => cb(s.exists() ? { ...s.data(), id: s.id } : null), onErr);
export const add = (path, data) => addDoc(collection(fs, path), data);
export const patch = (path, data) => setDoc(doc(fs, path), data, { merge: true });
export const remove = path => deleteDoc(doc(fs, path));

const memberData = (user, profile, role, extra = {}) => ({ uid: user.uid, role, name: profile.name, username: profile.username, joinedAt: nowISO(), ...extra });
export async function createClub(user, profile, name) {
  const ref = doc(collection(fs, 'clubs'));
  const b = writeBatch(fs);
  b.set(ref, { name, ownerId: user.uid, createdAt: nowISO() });
  b.set(doc(fs, 'clubs', ref.id, 'members', user.uid), memberData(user, profile, 'kurucu'));
  b.set(doc(fs, 'users', user.uid, 'clubs', ref.id), { name, role: 'kurucu' });
  await b.commit();
  return ref.id;
}
// Davet kodu tahmin edilemeyecek uzunlukta rastgele üretilir
export async function makeInvite(user, club) {
  const code = [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 16);
  await setDoc(doc(fs, 'invites', code), { clubId: club.id, clubName: club.name, createdBy: user.uid, at: nowISO() });
  if (club.inviteCode) await deleteDoc(doc(fs, 'invites', club.inviteCode)).catch(() => {});
  await patch('clubs/' + club.id, { inviteCode: code });
  return code;
}
export const getInvite = async code => { const s = await getDoc(doc(fs, 'invites', code)); return s.exists() ? s.data() : null; };
export async function joinClub(user, profile, code, inv) {
  const b = writeBatch(fs);
  b.set(doc(fs, 'clubs', inv.clubId, 'members', user.uid), memberData(user, profile, 'uye', { inviteCode: code }));
  b.set(doc(fs, 'users', user.uid, 'clubs', inv.clubId), { name: inv.clubName, role: 'uye' });
  await b.commit();
}
export async function leaveClub(uid, clubId) {
  const b = writeBatch(fs);
  b.delete(doc(fs, 'clubs', clubId, 'members', uid));
  b.delete(doc(fs, 'users', uid, 'clubs', clubId));
  await b.commit();
}
