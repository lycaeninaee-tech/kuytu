# Kuytu — proje notları

Kitap Kulübü'nün herkese açık sürümü (çalışma adı Kuytu). Arayüz metinleri Türkçe ve `src/strings.js` içinde.

- Derleme adımı yok: yerel ES modülleri, Firebase Web SDK gstatic'ten yüklenir. Bu bilgisayarda Node yok.
- `src/auth.js`: Firebase başlatma, üyelik, kullanıcı adı. `src/app.js`: ekranlar ve olaylar.
- Tema, eski sitedeki kinetik editoryal: bulut zemin `#f0eee9`, domates `#e8341c`, Bodoni Moda ve Instrument Sans.
- `users/{uid}` e-posta tutmaz; e-posta yalnızca Firebase Auth'ta kalır.
- Aşamalar: temel, kişisel raf, kulüpler, veri taşıma, arkadaşlar, yayın hazırlığı. Taşıma bitmeden arkadaşlık ve akış eklenmez.
