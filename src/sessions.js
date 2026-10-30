import { collection, doc, onSnapshot, addDoc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { fs } from './auth.js';

export const watchSessions = (uid, cb) => onSnapshot(collection(fs, 'users', uid, 'sessions'), s => cb(s.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => (b.at || '').localeCompare(a.at || ''))));
export const addSession = (uid, data) => addDoc(collection(fs, 'users', uid, 'sessions'), data);
export const patchSession = (uid, id, data) => setDoc(doc(fs, 'users', uid, 'sessions', id), data, { merge: true });
export const removeSession = (uid, id) => deleteDoc(doc(fs, 'users', uid, 'sessions', id));
export const saveProfile = (uid, data) => setDoc(doc(fs, 'users', uid), data, { merge: true });
