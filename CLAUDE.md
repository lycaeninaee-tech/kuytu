# Kuytu — proje notları

Kitap Kulübü'nün herkese açık sürümü (çalışma adı Kuytu). Arayüz metinleri Türkçe ve `src/strings.js` içinde.

- Derleme adımı yok: yerel ES modülleri, Firebase Web SDK gstatic'ten yüklenir. Bu bilgisayarda Node yok.
- `src/auth.js`: Firebase başlatma, üyelik, kullanıcı adı. `src/app.js`: ekranlar ve olaylar.
- Tasarım dili kullanıcının paylaştığı Kuytu rehberinden: orman yeşili `#1F3D33`, zeytin `#6B7D63`, krem `#F5EFE7`, kahve `#A8865A`, koyu gri `#2F2E2E`; Playfair Display ve Inter; yumuşak köşeler, hap düğmeler. Slogan: "Aynı sayfalarda farklı hayatlar."
- `users/{uid}` e-posta tutmaz; e-posta yalnızca Firebase Auth'ta kalır.
- Aşamalar: temel, kişisel raf, kulüpler, veri taşıma, arkadaşlar, yayın hazırlığı. Taşıma bitmeden arkadaşlık ve akış eklenmez.
- Modüller: `reading.js` (oda, zamanlayıcı, müzik), `takip.js`, `clubs.js` (veri), `clubview.js` (kulüp ekranları ve olayları), `sessions.js`, `books.js`, `shelf.js`, `util.js`.
- Kulüp üyeliği `clubs/{id}/members/{uid}` (rol: kurucu, uye, izleyici); kişinin listesi `users/{uid}/clubs`. Davet `invites/{kod}`, yalnızca kodla okunur. Kurallar `firestore.rules` içinde; Firebase konsolunda da yayımlanmalı.
- Henüz taşınmadı: fotoğraflar (Storage/Blaze ister), ses notları.
