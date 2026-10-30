# Kuytu — proje notları

Kitap Kulübü'nün herkese açık sürümü (çalışma adı Kuytu). Arayüz metinleri Türkçe ve `src/strings.js` içinde.

- Derleme adımı yok: yerel ES modülleri, Firebase Web SDK gstatic'ten yüklenir. Bu bilgisayarda Node yok.
- `src/auth.js`: Firebase başlatma, üyelik, kullanıcı adı. `src/app.js`: ekranlar ve olaylar.
- Tasarım dili kullanıcının paylaştığı Kuytu rehberinden: orman yeşili `#1F3D33`, zeytin `#6B7D63`, krem `#F5EFE7`, kahve `#A8865A`, koyu gri `#2F2E2E`; Playfair Display ve Inter; yumuşak köşeler, hap düğmeler. Slogan: "Aynı sayfalarda farklı hayatlar."
- `users/{uid}` e-posta tutmaz; e-posta yalnızca Firebase Auth'ta kalır.
- Aşamalar: temel, kişisel raf, kulüpler, veri taşıma, arkadaşlar, yayın hazırlığı. Taşıma bitmeden arkadaşlık ve akış eklenmez.
