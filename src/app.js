import { T } from './strings.js';
import { configured, USERNAME_RE, onUser, logout, loginGoogle, loginEmail, signupEmail, resetPassword, resendVerify, watchProfile, claimUsername } from './auth.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const S = { user: null, profile: undefined, mode: 'login', busy: false };

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 3500);
}
const fail = err => toast(T.authErrors[err.code] || T.error);

function viewLanding() {
  const signup = S.mode === 'signup';
  return `<section class="landing">
    <h1>Kuy<em>tu</em></h1>
    <p class="lead">${T.tagline}</p>
    ${configured ? `<form class="panel" id="auth-form">
      <div class="seg" role="group"><button type="button" class="${signup ? '' : 'on'}" data-act="mode" data-v="login">${T.login}</button><button type="button" class="${signup ? 'on' : ''}" data-act="mode" data-v="signup">${T.signup}</button></div>
      ${signup ? `<label>${T.name}<input name="name" required autocomplete="name"></label>` : ''}
      <label>${T.email}<input name="email" type="email" required autocomplete="email"></label>
      <label>${T.password}<input name="pass" type="password" required minlength="6" autocomplete="${signup ? 'new-password' : 'current-password'}"></label>
      <button class="btn" type="submit">${signup ? T.signup : T.login}</button>
      <button class="btn ghost" type="button" data-act="google">${T.google}</button>
      ${signup ? '' : `<button class="linkbtn small" type="button" data-act="reset">${T.forgot}</button>`}
    </form>` : `<p class="notice">${T.setup}</p>`}
  </section>`;
}
function viewUsername() {
  return `<section class="landing"><h2>${T.chooseTitle}</h2>
    <form class="panel" id="name-form"><label>${T.username}<input name="username" required autocomplete="username" maxlength="20" pattern="[a-z0-9_]{3,20}"></label>
    <p class="muted small">${T.chooseHelp}</p><button class="btn" type="submit">${T.save}</button></form></section>`;
}
function viewHome() {
  const needsVerify = S.user.providerData.some(p => p.providerId === 'password') && !S.user.emailVerified;
  return `<header class="top"><span class="brand">Kuytu</span><button class="btn ghost" type="button" data-act="logout">${T.logout}</button></header>
    <section class="profile">
      ${needsVerify ? `<p class="notice">${T.verify} <button class="linkbtn" type="button" data-act="resend">${T.resend}</button></p>` : ''}
      <h2>${esc(S.profile.name)}</h2>
      <p class="muted">@${esc(S.profile.username)}</p>
      <p>${T.empty}</p>
    </section>`;
}
function render() {
  const v = $('#view');
  if (!S.user) v.innerHTML = viewLanding();
  else if (S.profile === undefined) v.innerHTML = '';
  else v.innerHTML = S.profile ? viewHome() : viewUsername();
}

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const a = el.dataset.act;
  if (a === 'mode') { S.mode = el.dataset.v; render(); }
  if (a === 'google') loginGoogle().catch(fail);
  if (a === 'logout') logout().catch(fail);
  if (a === 'resend') resendVerify().then(() => toast(T.sent)).catch(fail);
  if (a === 'reset') {
    const email = $('#auth-form').elements.email.value.trim();
    if (!email) return toast(T.needEmail);
    resetPassword(email).then(() => toast(T.resetSent)).catch(fail);
  }
});
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target.elements;
  try {
    if (e.target.id === 'auth-form') {
      if (S.mode === 'signup') await signupEmail(f.name.value.trim(), f.email.value.trim(), f.pass.value);
      else await loginEmail(f.email.value.trim(), f.pass.value);
    }
    if (e.target.id === 'name-form') {
      const username = f.username.value.trim().toLowerCase();
      if (!USERNAME_RE.test(username)) return toast(T.badUsername);
      await claimUsername(S.user, username);
    }
  } catch (err) {
    if (err.message === 'taken') toast(T.taken);
    else fail(err);
  }
});

render();
if (configured) {
  let stop = null;
  onUser(user => {
    if (stop) { stop(); stop = null; }
    S.user = user;
    S.profile = undefined;
    render();
    if (user) stop = watchProfile(user.uid, p => { S.profile = p; render(); });
  });
}
