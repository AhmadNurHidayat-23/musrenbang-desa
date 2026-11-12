# Musrenbang Desa

Pengelolaan usulan pembangunan desa. Prototipe portofolio independen, bukan aplikasi resmi pemerintah.

## Fitur utama

- CRUD usulan dan wilayah, kategori, lokasi, estimasi rupiah bulat, pencarian dan filter.
- Skor prioritas 20–100: urgensi × 8 + manfaat × 7 + kesiapan × 5; tiap kriteria 1–5.
- Keputusan musyawarah dengan riwayat dan ekspor CSV, arsip/pemulihan, publikasi terpilih tanpa catatan internal.
- Admin mengelola wilayah, keputusan dan publikasi; Petugas membuat serta mengubah usulan sendiri yang masih Diajukan.

## Teknologi

Node.js 22.13+, Express, SQLite, HTML, CSS, JavaScript.

## Cara instalasi

~~~powershell
cd C:\laragon\www\musrenbang-desa
npm install
npm run user
~~~

Buat akun Admin, lalu ulangi untuk Petugas. Kata sandi minimal 12 karakter dimasukkan melalui prompt dan disimpan sebagai hash. Tidak ada akun bawaan.

## Cara menjalankan

~~~powershell
npm start
~~~

Halaman publik: http://127.0.0.1:5411. Pengelola: /kelola. SQLite dibuat otomatis di data/app.sqlite; inisialisasi aman dijalankan ulang. Variabel opsional tercantum di .env.example; untuk file .env gunakan node --env-file=.env src/server.js. Set SECURE_COOKIE=1 saat memakai HTTPS.

Pengujian: npm test.
