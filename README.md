# Monitor PKL - Rekap Web Version

Aspirasi untuk mempermudah Bapak/Ibu Guru dalam memantau kehadiran siswa PKL melalui browser.

## Fitur Utama
- **Dashboard Ringkasan**: Statistik kehadiran harian secara real-time.
- **Presensi Harian**: Detail kehadiran per tanggal dengan foto bukti (jika tersedia).
- **Rekap Bulanan**: Laporan ringkasan kehadiran siswa dalam rentang satu bulan.
- **Data Master**: Melihat daftar seluruh siswa dan penempatan DUDI.
- **Live Search**: Mencari data secara instan di setiap tabel.

## Pengembangan Teknik
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript.
- **Backend**: Integrasi dengan Google Apps Script (GAS) API.
- **Desain**: Modern Premium Dashboard (Clean & Responsive).

## Cara Deploy ke GitHub Pages
1. Buat repository baru di GitHub (misal: `monitor-pkl-rekap`).
2. Upload file `index.html`, `style.css`, dan `script.js` ke repository tersebut.
3. Buka menu **Settings** > **Pages**.
4. Pada bagian **Build and deployment**, pilih branch `main` dan folder `/ (root)`.
5. Klik **Save**.
6. Web akan dapat diakses di `https://[username].github.io/monitor-pkl-rekap/`.

## Konfigurasi API
Pastikan URL Google Apps Script pada file `script.js` sudah sesuai dengan URL Deployment Anda:
```javascript
const API_URL = 'URL_DEPLOYMENT_GAS_ANDA';
```
