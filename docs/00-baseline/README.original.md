> Rekonstruksi isi README baseline (file aslinya sudah diganti README publik). Teksnya sama, tapi **tidak byte-identik**; hash asli ada di MANIFEST: `a61d2647…fda4`.

# 69 AI - Desktop Native Installer (Windows & macOS)

Proyek ini telah dikonfigurasi lengkap untuk menghasilkan:
1. **Windows Installer**: `.exe` (NSIS Installer) & `.msi` Standalone
2. **macOS Installer**: `.dmg` (Apple Silicon M1/M2/M3 & Intel x64) & `.app` Bundle

## 💻 Cara Build Installer:

### 🌟 Pilihan 1: Build Cepat dengan Electron Builder (Paling Mudah)
1. Buka Terminal / CMD di folder ini.
2. Jalankan perintah instalasi:
   ```bash
   npm install
   ```
3. Untuk membuat **Installer Windows (.exe)**:
   ```bash
   npm run dist:win
   ```
4. Untuk membuat **Installer macOS (.dmg)**:
   ```bash
   npm run dist:mac
   ```
5. Untuk membuat **Installer Semua Platform**:
   ```bash
   npm run dist
   ```
*Hasil installer otomatis tersimpan di folder `/dist-desktop/`.*

### ⚡ Pilihan 2: Build Native dengan Tauri (Ultra Cepat & Ringan < 15MB)
```bash
npm run tauri:build
```
*Hasil output tersimpan di `/src-tauri/target/release/bundle/`.*
