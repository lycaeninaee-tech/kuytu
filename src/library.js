// Kitaplığım: evdeki kitaplık. Kapaklar önden durur; her kapakta kart, düzenle, ödünç ve sil menüsü
import { esc } from './util.js';
import { TN as N, T } from './strings.js';
import { STATUS } from './shelf.js';
import { flat, emLast, backdrop, colorOf, JEWELS, edge } from './parts.js';
import { GENRE_NAMES } from './books.js';

const homeBooks = S => S.shelf.filter(b => !b.wish && !b.lentTo);
const statusOf = k => (STATUS.find(s => s[0] === k) || ['', ''])[1];
const daysSince = iso => Math.max(0, Math.floor((Date.now() - new Date(iso)) / 86400000));
const brand = extra => `<div class="lp-top"><a class="brand" href="#bugun">Kuytu</a>${extra ? `<span class="cap">${extra}</span>` : ''}</div>`;
const listNow = S => {
  if (S.libTab === 'odunc') return S.shelf.filter(b => b.lentTo);
  if (S.libTab === 'istek') return S.shelf.filter(b => b.wish);
  return homeBooks(S);
};
const item = (S, b) => `<div class="bk">
  <div class="bk-cv"><button type="button" class="bk-open" data-act="openbook" data-id="${esc(b.id)}" aria-label="${esc(b.title)}">${flat(b, 112)}</button>
    ${b.lentTo ? `<span class="bk-tag">${esc(b.lentTo.toLocaleUpperCase('tr'))}'DA</span>` : ''}${b.fav ? '<span class="bk-fav" aria-label="Kalbimde">♥</span>' : ''}
    <button type="button" class="bk-dots" data-act="bmenu" data-id="${esc(b.id)}" aria-label="${N.edit}, ${N.del2}">⋯</button>
    ${S.menuFor === b.id ? `<div class="bmenu" role="menu"><button type="button" data-act="openbook" data-id="${esc(b.id)}">${N.openCard}</button><button type="button" data-act="bedit" data-id="${esc(b.id)}">✎ ${N.edit}</button><button type="button" data-act="openbook" data-id="${esc(b.id)}">${N.lend}</button><button type="button" class="del" data-act="bdel" data-id="${esc(b.id)}">${S.armed === b.id ? N.sure : N.del2}</button></div>` : ''}
  </div>
  <button type="button" class="bk-t" data-act="openbook" data-id="${esc(b.id)}">${esc(b.title)}</button><span class="bk-s">${esc(b.lentTo ? b.lentTo + "'da" : statusOf(b.status))}</span>
</div>`;
export function viewLibrary(S, enter, clubMissing = 0) {
  const tab = S.libTab || 'evde', home = homeBooks(S), lent = S.shelf.filter(b => b.lentTo), wish = S.shelf.filter(b => b.wish), list = listNow(S);
  const year = String(new Date().getFullYear()), added = S.shelf.filter(b => (b.addedAt || '').startsWith(year)).sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  const authors = {};
  S.shelf.forEach(b => { if (b.author) authors[b.author] = (authors[b.author] || 0) + 1; });
  const topAuthor = Object.entries(authors).sort((a, b) => b[1] - a[1])[0];
  const left = `${brand()}<h1 class="kt light lp-title">Kitap<i>larım</i></h1><p class="lbl">${home.length} ${N.evdeN}, ${lent.length} ${N.lentN}</p>
    ${clubMissing ? `<button type="button" class="pl" data-act="importclub">${N.importClub} (${clubMissing})</button>` : ''}
    <div class="lp-foot col"><button type="button" class="pl on" data-act="scan">${N.scan}</button><a class="pl" href="#ara">${N.addManual}</a></div>`;
  // Raflar örnek uygulamadaki gibi: her bölüm bir sıra, kapakların önünden renkli cam raf geçer
  // Türe göre: her tür bir sıra, en kalabalık tür üstte; türü bulunamayanlar en altta
  const TINTS = ['#4f8fd6', '#e9a64a', '#d9655b', '#7aa38e', '#9b7fd1', '#c98a3c', '#5aa9a3', '#b8432d'];
  const byGenre = () => {
    const m = {};
    home.forEach(b => { const g = b.genre || N.noGenre; (m[g] = m[g] || []).push(b); });
    return Object.entries(m).sort((a, b) => (a[0] === N.noGenre) - (b[0] === N.noGenre) || b[1].length - a[1].length).map(([g, l], i) => ['g' + i, g, l, TINTS[i % TINTS.length]]);
  };
  const ROWS = tab === 'evde' && S.libGroup === 'tur' ? byGenre() : tab === 'evde'
    ? [['okuyorum', N.nowReading, home.filter(b => b.status === 'okuyorum'), 'var(--book)'], ['sirada', N.secNext, home.filter(b => b.status === 'istiyorum' || b.status === 'biraktim'), '#e9a64a'], ['okudum', N.secRead, home.filter(b => b.status === 'okudum'), '#4f8fd6'], ['kalp', N.secHeart, home.filter(b => b.fav), '#d9655b']]
    : [[tab, tab === 'odunc' ? N.tabLent : N.tabWish, list, tab === 'odunc' ? '#d9655b' : '#e9a64a']];
  const sec = S.rafSec || 'hepsi', shown = ROWS.filter(r => r[2].length && (tab !== 'evde' || S.libGroup === 'tur' || sec === 'hepsi' || r[0] === sec));
  const group = tab === 'evde' ? `<div class="lib-group" role="group" aria-label="${N.groupBy}"><span class="lbl small">${N.groupBy}</span><div class="seg">${[['durum', N.byStatus], ['tur', N.byGenre]].map(([k, l]) => `<button type="button" class="${(S.libGroup || 'durum') === k ? 'on' : ''}" aria-pressed="${(S.libGroup || 'durum') === k}" data-act="libgroup" data-v="${k}">${l}</button>`).join('')}</div></div>` : '';
  // Tek sıra filtre: ödünç ve istek listesi de burada, ayrı sekme yok
  const chips = `<div class="chips-row">${[['hepsi', N.all, 'evde'], ['okuyorum', N.nowReading, 'evde'], ['sirada', N.secNext, 'evde'], ['okudum', N.secRead, 'evde'], ['kalp', N.secHeart, 'evde'], ['odunc', `${N.lentShelf}${lent.length ? ' ' + lent.length : ''}`, 'odunc'], ['istek', `${N.wishShelf}${wish.length ? ' ' + wish.length : ''}`, 'istek']]
    .map(([k, l, t]) => { const on = t === 'evde' ? tab === 'evde' && sec === k : tab === t; return `<button type="button" class="pl sm ${on ? 'ink' : ''}" aria-pressed="${on}" data-act="rafsec" data-v="${k}">${l}</button>`; }).join('')}</div>`;
  const row = ([k, title, books, tint]) => `<section class="srow" style="--tint:${tint}"><div class="sr-head"><h3>${title}</h3><span class="cap">${books.length} ${N.booksN}</span><button type="button" class="arw" data-act="rowscroll" data-v="-1" aria-label="Geri">‹</button><button type="button" class="arw" data-act="rowscroll" data-v="1" aria-label="İleri">›</button></div>
    <div class="sr-track">${books.map(b => item(S, b)).join('')}${k === 'sirada' || tab !== 'evde' ? `<a class="bk bk-add" href="#ara"><span>${N.placeBook}</span></a>` : ''}</div><div class="acryl"><i></i><i></i></div></section>`;
  const right = `${S.libGroup === 'tur' && tab === 'evde' ? '' : chips}${group}
    <div class="shelves${enter ? ' enter' : ''}" id="raf-panel">${shown.map(row).join('') || `<a class="bk bk-add solo" href="#ara"><span>${N.placeBook}</span></a>`}</div>
    <div class="strip">
      <div><p class="cap red">${N.lentRemind}</p>${lent.length ? lent.slice(0, 2).map(b => `<p class="sf">${esc(b.title)}, ${esc(b.lentTo)}'da ${b.lentAt ? daysSince(b.lentAt) + ' ' + N.daysAgo : ''}</p>`).join('') : `<p class="sf muted">${N.noLent}</p>`}</div>
      <div><p class="cap">${N.yearIn}</p><p class="sf">${added.length} ${N.bookWord}${added[0] ? ' · ' + N.last + ': ' + esc(added[0].title) : ''}</p></div>
      <div><p class="cap">${N.mostAuthor}</p><p class="sf">${topAuthor ? esc(topAuthor[0]) + ' · ' + topAuthor[1] + ' ' + N.bookWord : '–'}</p></div>
    </div>`;
  return { left, right, ribbon: `${S.shelf.length} ${N.bookWord.toLocaleUpperCase('tr')}`, folio: 2 };
}
export const playPanel = () => { const p = document.getElementById('raf-panel'); if (p) { p.classList.remove('go'); void p.offsetWidth; p.classList.add('go'); } };

// Bu kitabın alıntıları: yenilerde kitabın kaydına, eskilerde adına bağlı
export const bookQuotes = (S, b) => S.quotes.filter(q => q.bookId === b.id || (!q.bookId && q.book === b.title));
const bookSessions = (S, b) => S.sessions.filter(s => s.bookId === b.id);
// Başlangıç: kayıtlıysa o gün; değilse ilk oturum, ama kitap rafa girmeden önceye düşmez
const startOf = (S, b) => b.startedAt || [bookSessions(S, b).map(s => s.at).sort()[0], b.addedAt].filter(Boolean).sort().pop();
const minsOf = list => Math.round(list.reduce((n, s) => n + (Number(s.seconds) || 0), 0) / 60);

// Kenar notları ve alıntılar sayfa sırasıyla bir arada; not alanı kaldığın sayfayla açılır
function margin(S, b) {
  const items = [...bookQuotes(S, b).map(q => ({ ...q, quote: true, coll: 'quotes' })), ...(S.notes || []).filter(n => n.bookId === b.id).map(n => ({ ...n, coll: 'notes' }))]
    .sort((x, y) => (Number(x.page) || 0) - (Number(y.page) || 0) || (x.at || '').localeCompare(y.at || ''));
  return `<div class="margin"><p class="cap">${N.margin}</p>
    <ul class="mnotes">${items.map(n => `<li class="${n.quote ? 'q' : ''}">${n.page ? `<span class="pg">${N.pageShort} ${esc(n.page)}</span>` : '<span class="pg"></span>'}<p>${n.quote ? `“${esc(n.text)}”` : esc(n.text)}</p><button type="button" class="linkbtn small" data-act="mndel" data-coll="${n.coll}" data-id="${esc(n.id)}">${N.del}</button></li>`).join('') || `<li class="empty lbl small">${N.noMargin}</li>`}</ul>
    <form id="mnote-form" class="mnote-f"><textarea name="text" rows="2" maxlength="1000" required placeholder="${N.marginPh}" aria-label="${N.margin}"></textarea>
      <div class="pagebar"><label>${N.pageAt}<input name="page" type="number" min="0" max="20000" value="${b.page || ''}"></label><label class="check-row"><input type="checkbox" name="quote">${N.isQuote}</label><button class="pl" type="submit">${T.save}</button></div></form></div>`;
}

// Kitabı bitirme anı: kaç günde ve kaç oturumda bittiği, puan, tek cümle ve sıradaki kitap
export function finishHTML(S, b) {
  const sess = bookSessions(S, b), mins = minsOf(sess), from = startOf(S, b);
  const days = from ? Math.max(1, Math.round((Date.now() - new Date(from)) / 864e5)) : 0;
  const facts = [days ? N.inDays.replace('{n}', days) : '', sess.length ? N.inSessions.replace('{n}', sess.length) : '', mins ? `${mins} ${N.minutes}` : ''].filter(Boolean).join(' · ');
  const next = S.shelf.filter(x => x.status === 'istiyorum' && !x.lentTo && !x.wish && x.id !== b.id).slice(0, 4);
  return `<div class="finish" style="--book:${colorOf(b)}" role="dialog" aria-label="${N.finished2}"><div class="fin-in">
    <div class="fin-cv">${flat(b, 170, 'big')}</div>
    <div class="fin-tx"><p class="cap">${N.finished2}</p><h2 class="kt sm">${emLast(b.title)}</h2>${facts ? `<p class="lbl">${facts}</p>` : ''}
      <div class="rate" role="group" aria-label="${T.rating}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${(b.rating || 0) >= n ? 'on' : ''}" data-act="frate" data-v="${n}" aria-label="${n}">★</button>`).join('')}</div>
      <form id="finish-form" class="pagebar"><label>${N.thoughtAsk}<input name="thought" maxlength="200" value="${esc(b.thought || '')}"></label><button class="pl" type="submit">${T.save}</button></form>
      ${next.length ? `<p class="cap">${N.nextUp}</p><div class="mini">${next.map(x => `<button type="button" data-act="fnext" data-id="${esc(x.id)}" aria-label="${esc(x.title)}" title="${esc(x.title)}">${flat(x, 70)}</button>`).join('')}</div><p class="lbl small">${N.nextHint}</p>` : ''}
      <button type="button" class="pl ink" data-act="fclose">${N.fin}</button></div></div></div>`;
}

// Kitap kartı: sol tarafta kapak kitabın renginde, sağda künye, hikâye, kenar notları ve düzenleme
export function cardHTML(S, b, first) {
  const fmt = iso => (iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const firstSession = startOf(S, b), sess = bookSessions(S, b), mins = minsOf(sess);
  const story = [[N.shelfIn, b.addedAt], [N.started, firstSession], [N.finished, b.status === 'okudum' && b.finishedAt], [b.lentTo ? b.lentTo + "'a " + N.gave : '', b.lentAt]].filter(e => e[0] && e[1]);
  const took = b.status === 'okudum' && b.finishedAt && firstSession ? Math.max(1, Math.round((new Date(b.finishedAt) - new Date(firstSession)) / 864e5)) : 0;
  const storyLine = [sess.length ? N.sessLine.replace('{s}', sess.length).replace('{m}', mins) : '', took ? N.tookDays.replace('{n}', took) : ''].filter(Boolean).join(' · ');
  const quotesN = bookQuotes(S, b).length;
  const st = STATUS.map(([k, label]) => `<button type="button" class="${b.status === k ? 'on' : ''}" aria-pressed="${b.status === k}" data-act="status" data-v="${k}">${label}</button>`).join('');
  const tab = S.cardTab || 'okuma', notesN = (S.notes || []).filter(n => n.bookId === b.id).length + quotesN;
  const tabs = [['okuma', N.tabRead, 0], ['notlar', N.tabNotes, notesN], ['kunye', N.tabInfo, 0]].map(([k, l, n]) => `<button type="button" role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-act="btab" data-v="${k}">${l}${n ? `<em>${n}</em>` : ''}</button>`).join('');
  const stars = [1, 2, 3, 4, 5].map(n => `<button type="button" class="${(b.rating || 0) >= n ? 'on' : ''}" data-act="rate" data-v="${n}" aria-label="${n}">★</button>`).join('');
  const editForm = `<form id="edit-form" class="editf">
      <label>${T.bookTitle}<input name="title" required maxlength="200" value="${esc(b.title)}"></label>
      <label>${T.author}<input name="author" maxlength="200" value="${esc(b.author || '')}"></label>
      <label>${T.pages}<input name="pages" type="number" min="0" max="20000" value="${b.pages || ''}"></label>
      <label>${N.source}<input name="source" maxlength="120" value="${esc(b.source || '')}"></label>
      <label>${N.kPublisher}<input name="publisher" maxlength="120" value="${esc(b.publisher || '')}"></label>
      <label>${N.kYear}<input name="year" maxlength="4" inputmode="numeric" value="${esc(b.year || '')}"></label>
      <label>${N.kTranslator}<input name="translator" maxlength="120" value="${esc(b.translator || '')}"></label>
      <label>${N.kOrig}<input name="origTitle" maxlength="200" value="${esc(b.origTitle || '')}"></label>
      <label>${N.kIsbn}<input name="isbn" maxlength="17" inputmode="numeric" value="${esc(b.isbn || '')}"></label>
      <label>${N.genreLbl}<select name="genre"><option value="">${N.noGenre}</option>${GENRE_NAMES.map(g => `<option${b.genre === g ? ' selected' : ''}>${g}</option>`).join('')}</select></label>
      <div class="wide covpick"><p class="cap">${N.otherCover}</p>${S.covers === 'loading' ? `<p class="lbl small">${T.searching}</p>` : Array.isArray(S.covers)
        ? (S.covers.length ? `<div class="covs">${S.covers.map(u => `<button type="button" data-act="pickcover" data-u="${esc(u)}" class="${u === b.cover ? 'on' : ''}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>` : `<p class="lbl small">${N.noCovers}</p>`)
        : `<button type="button" class="pl sm" data-act="findcovers">${N.findCovers}</button>`}
        <label class="pl sm">${N.shootCover}<input id="cover-photo" type="file" accept="image/*" capture="environment" hidden></label></div>
      <label class="wide">${N.coverUrl}<input name="cover" maxlength="2000" value="${esc(b.cover && !b.cover.startsWith('data:') ? b.cover : '')}" placeholder="https://..."></label>
      <div class="acts wide"><button class="pl on" type="submit">${T.save}</button><button class="pl" type="button" data-act="bnoedit">${N.cancel}</button></div></form>`;
  return `<div class="card-scrim" data-act="bookclose"></div>
  <div class="cardk ${first ? 'first' : ''}" role="dialog" aria-label="${esc(b.title)}">
    <div class="cardk-l">${backdrop(b)}<div class="cardk-cv">${flat(b, 240, 'big')}</div></div>
    <div class="cardk-r">
      <div class="cardk-head"><span class="cap">${N.card.toLocaleUpperCase('tr')}</span><button type="button" class="pl sm" data-act="bedit" data-id="${esc(b.id)}">✎ ${N.edit}</button><button type="button" class="pl sm red" data-act="remove">${S.armed ? N.sure : N.del2}</button><button type="button" class="x" data-act="bookclose" aria-label="${N.close}">×</button></div>
      <h2 class="kt sm">${emLast(b.title)}</h2>
      <p class="lbl">${esc([b.author || T.unknownAuthor, b.pages ? b.pages + ' sayfa' : ''].filter(Boolean).join(' · '))}</p>
      ${b.thought && !S.editing ? `<p class="pq thought">“${esc(b.thought)}”</p>` : ''}
      ${S.editing ? editForm : `
      <div class="btabs" role="tablist">${tabs}</div>
      ${tab === 'okuma' ? `
      <div class="seg" role="group" aria-label="${T.status || N.story}">${st}</div>
      <div class="cread">
        <form id="page-form" class="pagebar"><label>${T.currentPage}<input name="page" type="number" min="0" max="20000" value="${b.page || ''}"></label><label>${T.pages}<input name="pages" type="number" min="1" max="20000" value="${b.pages || ''}"></label><button class="pl" type="submit">${T.save}</button></form>
        <div class="rate" role="group" aria-label="${T.rating}">${stars}</div>
      </div>
      ${story.length ? `<div class="story"><p class="cap">${N.story}</p><ol>${story.map(([k, d]) => `<li><b>${esc(k)}</b><span>${fmt(d)}</span></li>`).join('')}</ol>${storyLine ? `<p class="lbl small">${storyLine}</p>` : ''}</div>` : ''}
      <div class="acts"><a class="pl on" href="#okuma">${N.startRead}</a><button type="button" class="pl ${b.fav ? 'ink' : ''}" data-act="fav">♥ ${b.fav ? N.unheart : N.heart}</button></div>`
      : tab === 'notlar' ? margin(S, b) : `
      <div class="kunye">
        <div><p class="cap">${N.who}</p><p class="sf">${b.lentTo ? esc(b.lentTo) + (b.lentAt ? ', ' + fmt(b.lentAt) : '') : N.mine}</p></div>
        <div><p class="cap">${N.inClub}</p><p class="sf">${b.status === 'okudum' && S.club && S.club.books.some(x => x.title === b.title) ? N.readTogether : '–'}</p></div>
        <div><p class="cap">${N.from}</p><p class="sf">${b.source ? esc(b.source) : `<span class="muted">–</span>`}</p></div>
        <div><p class="cap">${N.quoteN}</p><p class="sf">${quotesN}</p></div>
      </div>
      <div class="bcolor"><p class="cap">${N.bookColor}</p><div class="swatches" role="group" aria-label="${N.bookColor}">
        <button type="button" class="auto${b.color ? '' : ' on'}" data-act="bcolor" data-v="" aria-pressed="${!b.color}">${N.fromCover}</button>
        ${JEWELS.map(([name, hex]) => `<button type="button" class="${b.color === hex ? 'on' : ''}" style="--c:${hex}" data-act="bcolor" data-v="${hex}" aria-pressed="${b.color === hex}" aria-label="${name}" title="${name}"></button>`).join('')}</div></div>
      ${b.lentTo ? `<div class="acts"><button type="button" class="pl on" data-act="lendback">${N.back}</button></div>` : `<form id="lend-form" class="pagebar"><label>${N.lendTo}<input name="who" maxlength="60" required></label><button class="pl" type="submit">${N.lend}</button></form>`}
      <div class="acts"><button type="button" class="pl" data-act="wish">${b.wish ? N.gotIt : N.toWish}</button></div>`}`}
    </div>
  </div>`;
}
// Kitap sayfası (#kitap/{id}): solda kapak ve oda, sağda okuman, okuduğunu ekle, notlar, oturumlar ve künye.
// Eski kitap kartının ve Oku sayfasının yerini alır; sekme yok, bölümler alt alta, üstte atlama bağlantıları
export function viewBook(S, b, p = {}) {
  if (!b) return { right: `<h1 class="kt sm">${N.bpGone}</h1><a class="pl" href="#raf">${N.bpBack}</a>` };
  const fmt = iso => (iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const firstSession = startOf(S, b), sess = bookSessions(S, b), mins = minsOf(sess), quotesN = bookQuotes(S, b).length;
  const story = [[N.shelfIn, b.addedAt], [N.started, firstSession], [N.finished, b.status === 'okudum' && b.finishedAt], [b.lentTo ? b.lentTo + "'a " + N.gave : '', b.lentAt]].filter(e => e[0] && e[1]);
  const took = b.status === 'okudum' && b.finishedAt && firstSession ? Math.max(1, Math.round((new Date(b.finishedAt) - new Date(firstSession)) / 864e5)) : 0;
  const storyLine = [sess.length ? N.sessLine.replace('{s}', sess.length).replace('{m}', mins) : '', took ? N.tookDays.replace('{n}', took) : ''].filter(Boolean).join(' · ');
  const st = STATUS.map(([k, label]) => `<button type="button" class="${b.status === k ? 'on' : ''}" aria-pressed="${b.status === k}" data-act="status" data-v="${k}">${label}</button>`).join('');
  const stars = [1, 2, 3, 4, 5].map(n => `<button type="button" class="${(b.rating || 0) >= n ? 'on' : ''}" data-act="rate" data-v="${n}" aria-label="${n}">★</button>`).join('');
  const pct = b.pages ? Math.min(100, Math.round((b.page || 0) / b.pages * 100)) : null;
  const notesN = (S.notes || []).filter(n => n.bookId === b.id).length + quotesN;
  const jump = [['bp-okuma', N.bpRead], ['bp-yorum', N.bpReviews], ['bp-ekle', N.bpLog], ['bp-not', N.bpNotes + (notesN ? ` <em>${notesN}</em>` : '')], ['bp-oturum', N.bpSess + (sess.length ? ` <em>${sess.length}</em>` : '')], ['bp-kunye', N.bpInfo]]
    .map(([id, l]) => `<button type="button" data-act="bpjump" data-v="${id}">${l}</button>`).join('');
  const left = `${brand(statusOf(b.status).toLocaleUpperCase('tr'))}
    <div class="bp-cv">${flat(b, 220, 'big')}<button type="button" class="pl sm ${b.fav ? 'on' : ''}" data-act="fav" aria-pressed="${!!b.fav}">♥ ${b.fav ? N.unheart : N.heart}</button></div>
    <div class="bp-timer${S.bpMode ? ' open' : ''}"><button type="button" class="bp-mode-t" data-act="bpmode" aria-expanded="${!!S.bpMode}">${N.readMode}</button>${p.timer || ''}</div>`;
  const right = `<h1 class="kt sm">${emLast(b.title)}</h1>
    <p class="lbl">${esc([b.author || T.unknownAuthor, b.pages ? b.pages + ' sayfa' : ''].filter(Boolean).join(' · '))}</p>
    ${b.thought ? `<p class="pq thought">“${esc(b.thought)}”</p>` : ''}
    ${S.editing ? p.edit : `<nav class="bp-jump" aria-label="${esc(b.title)}">${jump}</nav>
    <section class="bp-sec" id="bp-okuma"><p class="cap">${N.bpRead.toLocaleUpperCase('tr')}</p>
      <div class="seg" role="group" aria-label="${N.bpStatus}">${st}</div>
      ${pct !== null ? `${edge(b, pct)}<p class="lbl small">%${pct}${b.page ? ' · s. ' + b.page : ''}</p>` : ''}
      <div class="cread"><form id="page-form" class="pagebar"><label>${T.currentPage}<input name="page" type="number" min="0" max="20000" value="${b.page || ''}"></label><label>${T.pages}<input name="pages" type="number" min="1" max="20000" value="${b.pages || ''}"></label><button class="pl" type="submit">${T.save}</button></form>
        <div class="rate" role="group" aria-label="${T.rating}">${stars}</div></div>
      ${story.length ? `<div class="story"><ol>${story.map(([k, d]) => `<li><b>${esc(k)}</b><span>${fmt(d)}</span></li>`).join('')}</ol>${storyLine ? `<p class="lbl small">${storyLine}</p>` : ''}</div>` : ''}
    </section>
    <section class="bp-sec" id="bp-yorum">${p.reviews || ''}</section>
    <section class="bp-sec" id="bp-ekle"><p class="cap">${N.bpLog.toLocaleUpperCase('tr')}</p><p class="lbl small">${N.bpLogHint}</p>${p.log || ''}</section>
    <section class="bp-sec" id="bp-not">${margin(S, b)}</section>
    <section class="bp-sec" id="bp-oturum"><p class="cap">${N.bpSess.toLocaleUpperCase('tr')}</p>${p.sess || ''}</section>
    <section class="bp-sec" id="bp-kunye"><p class="cap">${N.bpInfo.toLocaleUpperCase('tr')}</p>
      ${b.desc ? `<p class="bp-desc">${esc(b.desc)}</p>` : ''}
      <dl class="kunye-dl">${[[N.kPublisher, b.publisher], [N.kYear, b.year], [N.kPages, b.pages], [N.kIsbn, b.isbn], [N.kTranslator, b.translator], [N.kOrig, b.origTitle], [N.genreLbl, b.genre]]
        .map(([k, v]) => `<div><dt>${k}</dt><dd>${v ? esc(String(v)) : '<span class="muted">–</span>'}</dd></div>`).join('')}</dl>
      ${!b.publisher || !b.year || !b.translator ? `<p class="lbl small">${N.kHint} <button type="button" class="linkbtn small" data-act="bedit" data-id="${esc(b.id)}">✎ ${N.edit}</button></p>` : ''}
      <div class="kunye">
        <div><p class="cap">${N.who}</p><p class="sf">${b.lentTo ? esc(b.lentTo) + (b.lentAt ? ', ' + fmt(b.lentAt) : '') : N.mine}</p></div>
        <div><p class="cap">${N.inClub}</p><p class="sf">${b.status === 'okudum' && S.club && S.club.books.some(x => x.title === b.title) ? N.readTogether : '–'}</p></div>
        <div><p class="cap">${N.from}</p><p class="sf">${b.source ? esc(b.source) : `<span class="muted">–</span>`}</p></div>
        <div><p class="cap">${N.quoteN}</p><p class="sf">${quotesN}</p></div>
      </div>
      <div class="bcolor"><p class="cap">${N.bookColor}</p><div class="swatches" role="group" aria-label="${N.bookColor}">
        <button type="button" class="auto${b.color ? '' : ' on'}" data-act="bcolor" data-v="" aria-pressed="${!b.color}">${N.fromCover}</button>
        ${JEWELS.map(([name, hex]) => `<button type="button" class="${b.color === hex ? 'on' : ''}" style="--c:${hex}" data-act="bcolor" data-v="${hex}" aria-pressed="${b.color === hex}" aria-label="${name}" title="${name}"></button>`).join('')}</div></div>
      ${b.lentTo ? `<div class="acts"><button type="button" class="pl on" data-act="lendback">${N.back}</button></div>` : `<form id="lend-form" class="pagebar"><label>${N.lendTo}<input name="who" maxlength="60" required></label><button class="pl" type="submit">${N.lend}</button></form>`}
      <div class="acts"><button type="button" class="pl" data-act="wish">${b.wish ? N.gotIt : N.toWish}</button><button type="button" class="pl" data-act="bedit" data-id="${esc(b.id)}">✎ ${N.edit}</button><button type="button" class="pl red" data-act="remove">${S.armed ? N.sure : N.del2}</button></div>
    </section>`}
    <div class="bp-music">${p.music || ''}</div>`;
  return { left, right, book: b, folio: 2 };
}
// Düzenleme formu kitap sayfasında da kullanılır
export function editHTML(S, b) {
  return cardHTML({ ...S, editing: true }, b, false).match(/<form id="edit-form"[\s\S]*?<\/form>/)[0];
}
// Barkod okuyucu telefon kamerasını kullanır; desteklemeyen tarayıcıda ISBN elle aranır
export async function scanBarcode() {
  if (!('BarcodeDetector' in window)) return null;
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  const box = document.createElement('div');
  box.className = 'scanner';
  box.innerHTML = `<video playsinline muted></video><p>${N.scanHint}</p><button type="button" class="pl">${N.close}</button>`;
  document.body.appendChild(box);
  const video = box.querySelector('video');
  video.srcObject = stream;
  await video.play();
  const det = new window.BarcodeDetector({ formats: ['ean_13'] });
  let live = true;
  const stop = () => { live = false; stream.getTracks().forEach(t => t.stop()); box.remove(); };
  return new Promise(res => {
    box.querySelector('button').addEventListener('click', () => { stop(); res(''); });
    const tick = async () => {
      if (!live) return;
      try { const c = await det.detect(video); if (c[0]) { stop(); return res(c[0].rawValue); } } catch (e) {}
      setTimeout(tick, 300);
    };
    tick();
  });
}
