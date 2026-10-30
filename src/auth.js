import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { FIREBASE } from './config.js';

export const configured = !!FIREBASE.apiKey;
const app = configured ? initializeApp(FIREBASE) : null;
const auth = app ? getAuth(app) : null;
export const fs = app ? getFirestore(app) : null;

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export const onUser = cb => onAuthStateChanged(auth, cb);
export const logout = () => signOut(auth);
export const loginGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const loginEmail = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
export const resetPassword = email => sendPasswordResetEmail(auth, email);
export const resendVerify = () => sendEmailVerification(auth.currentUser);
export async function signupEmail(name, email, pass) {
  const { user } = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(user, { displayName: name });
  await sendEmailVerification(user);
}
export const watchProfile = (uid, cb) => onSnapshot(doc(fs, 'users', uid), s => cb(s.exists() ? s.data() : null));
// Kullanıcı adı ayrı bir belgede tutulur; işlem aynı adı iki kişinin almasını engeller.
// Ad zaten kişinin kendisindeyse (işlem yeniden denendiyse ya da düğmeye iki kez basıldıysa) hata sayılmaz, var olan profil de ezilmez
export function claimUsername(user, username) {
  return runTransaction(fs, async tx => {
    const ref = doc(fs, 'usernames', username), me = doc(fs, 'users', user.uid);
    const [name, profile] = [await tx.get(ref), await tx.get(me)];
    if (name.exists() && name.data().uid !== user.uid) throw new Error('taken');
    if (!name.exists()) tx.set(ref, { uid: user.uid });
    if (!profile.exists()) tx.set(me, { name: user.displayName || username, username, privacy: 'friends', createdAt: new Date().toISOString() });
  });
}
