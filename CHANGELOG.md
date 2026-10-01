# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Fixed
- Perangkat yang hanya mendukung `diffie-hellman-group1-sha1` kini bisa di-SSH lewat mode Legacy; prime Oakley Group 2 (RFC 2409) disediakan manual karena BoringSSL di Electron tidak mengenal grup `modp2` [F-23]

## [1.1.0] — 2026-09-30
### Security
- Perbaikan command injection pada tool ping [SEC-01]
- Validasi TLS tidak lagi dimatikan untuk seluruh aplikasi; sertifikat self-signed di browser Web GUI butuh konfirmasi per host [SEC-02]
- Hardening jendela utama: sandbox, CSP, whitelist izin, validasi pengirim IPC [SEC-03, SEC-09]
- API key hanya dikirim ke provider resmi; relay AI Studio dan `localhost:3000` diblokir [SEC-04]
- Password, secret, community, dan PSK disamarkan sebelum output terminal dikirim ke AI [SEC-05]
- API key yang tervalidasi disimpan terenkripsi (Keychain/DPAPI) [SEC-06]
- Verifikasi host key SSH (TOFU); algoritma lama hanya lewat mode Legacy per host [SEC-07]
- Upgrade Electron 30 (EOL) ke 44.5.0

### Fixed
- Input terminal tidak lagi bisa terkirim ke sesi perangkat lain [FR-04, FR-06]
- Pemilihan port Web Serial lewat dialog, bukan otomatis [FR-05]
- Resolusi DNS dan TCP probe pada tool ping/probe [FR-08]
- Error main process dicatat ke file log [NFR-05]

### Removed
- Relay chat Cloud Run AI Studio dan `localhost:3000`
- File main process lama `app-dist/electron-files/` dan konfigurasi Tauri yang tidak berfungsi

### Changed
- Frontend dibangun dari source v19 dalam mode production (bundle 3,75 MB → 1,91 MB)
- API key (Gemini, OpenAI, Claude, DeepSeek) dan password perangkat tersimpan terenkripsi di Keychain/DPAPI; data lama dipindahkan otomatis [SEC-06]
- Toggle baru "Sertakan output terminal ke AI online" (default mati) [SEC-05]

### Fixed (frontend)
- Bridge Bluetooth (BLE) kini termuat di aplikasi desktop
- Label versi di header sesuai versi aplikasi
- Validasi API key Gemini tidak lagi menganggap key apa pun ≥ 20 karakter sebagai valid

### Removed (frontend)
- Email & nama default milik pihak lain
- Fitur On-Prem Export dan generator paket (ditunda)

### Distribusi
- Installer macOS terpisah untuk Apple Silicon (arm64) dan Intel (x64), ad-hoc signed tanpa notarization. Lihat README untuk langkah *Open Anyway*.

### Known issues
- Perangkat yang hanya mendukung `diffie-hellman-group1-sha1` tidak bisa di-SSH (keterbatasan runtime Electron)

## [1.0.0] — 2026-09-30 (baseline, tidak dirilis publik)
- Export awal dari Google AI Studio. Lihat [audit baseline](docs/00-baseline/AUDIT-2026-09-30.md).
