# Panduan Build .DMG macOS & Mengganti Icon Aplikasi

## 1. Apakah Harus Generate Ulang .DMG?
**Ya**, karena kode deteksi port serial macOS (/dev/cu.*) dan native bridge yang baru telah diperbarui di paket ZIP ini.

## 2. Cara Agar Tidak Bentrok Dengan Aplikasi yang Sudah Terinstall / Dideploy
- **Opsi A (Update / Timpa yang Lama)**:
  Buka file `69 AI.dmg` hasil build di Mac, lalu drag icon aplikasi ke folder **/Applications**. Jika muncul pesan *"An older item already exists"*, klik **"Replace"**. Data history / koneksi lokal Anda tetap aman dan tersimpan.
- **Opsi B (Install Berdampingan / Versi Terpisah)**:
  Buka `package.json` di folder ini, lalu ubah:
  ```json
  "appId": "com.sixtynine.desktopconsole.v2",
  "productName": "69 AI Network Console v2"
  ```
  Dengan mengubah `appId` dan `productName`, macOS akan memperlakukannya sebagai aplikasi terpisah.

## 3. Cara Mengganti Icon Aplikasi (macOS & Windows)
### Di macOS (.dmg & .app):
1. Siapkan gambar icon Anda (format PNG 512x512 atau 1024x1024).
2. Konversi ke format `.icns` (bisa menggunakan web gratis seperti cloudconvert.com atau app Image2icon di Mac).
3. Simpan file tersebut dengan nama **`icon.icns`** dan letakkan di dalam folder:
   `build/icon.icns`.
4. Jalankan kembali script:
   ```bash
   ./scripts/build-macos.sh
   ```

### Trik Cepat Ganti Icon Langsung di Mac (Tanpa Rebuild):
1. Buka folder **/Applications** di Mac.
2. Klik kanan pada **69 AI.app** > pilih **Get Info** (Cmd + I).
3. Buka gambar icon baru Anda di Finder, lalu **Drag & Drop** gambar tersebut tepat ke kotak icon kecil di pojok kiri atas jendela Get Info.

### Di Windows (.exe):
1. Simpan icon format `.ico` (resolusi 256x256) di:
   `build/icon.ico`.
2. Jalankan `scripts\build-windows.bat`.
