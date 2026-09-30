# Change Request Log

Semua perubahan terhadap requirement atau design yang sudah disetujui dicatat di sini **sebelum** dikerjakan.

| CR | Tanggal | Diajukan oleh | Deskripsi | Dampak (fase/dokumen) | Keputusan | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| CR-001 | 2026-09-30 | Claude (implementasi) | CSP `connect-src` juga mengizinkan `api.anthropic.com` dan `api.deepseek.com`, karena renderer memanggil keduanya langsung sebagai provider resmi (SEC-04 tetap terpenuhi). Probe `HEAD http://<host>` dari renderer akan diblokir CSP; pengecekan reachability tetap lewat `network:probe` di main process | SDD §4–5, TC-10, TC-16 | Approved (bagian dari design yang disetujui) | Done |
| CR-002 | 2026-09-30 | Claude (implementasi) | SEC-07 "toggle Legacy device per perangkat" butuh UI (D-01). Sementara diganti dengan dialog native: kalau handshake gagal karena algoritma, user ditanya apakah mau mencoba ulang dengan algoritma legacy, dan pilihannya diingat per host | SRS SEC-07, SDD §3, TC-14 | Approved | Done |
| CR-004 | 2026-09-30 | Claude (implementasi) | Upgrade Electron ^30 (EOL) ke ^44.5.0 dan electron-builder ^24 ke ^26.15.3 (temuan F-18) | SRS NFR-01/REL-05, TC-19, TC-23; semua TC perlu diuji ulang di Electron 44 | Approved (wajib untuk rilis publik) | Done |
| CR-005 | 2026-09-30 | Pemilik produk | Source frontend yang tersedia adalah **v19** (bundle yang diaudit v16). v19 dipakai sebagai basis, tapi fitur baru v19 (browser internal `DeviceBrowserScreen`, `GoogleSearchView`, `CiscoCcwPanel`, `TransitAiQuickConnectBar`, dan fitur lain di luar baseline) **disembunyikan** lewat feature flag untuk 1.1.0 dan dijadwalkan ke siklus 1.2.0 | SRS §3 (scope tetap), TC-18 regresi terhadap fitur v16 | Approved | Done (`dc5c1bc`); ternyata komponen baru v19 tidak dirender di UI, jadi tidak ada fitur baru yang tampil |
| CR-006 | 2026-09-30 | Pemilik produk | Repo ini menjadi sumber utama. Source frontend di `frontend/` (build → `app-dist/`), `desktop-main.js` dipelihara langsung. AI Studio tidak dipakai lagi untuk export, karena generator `exportPackager.ts` akan menimpa perbaikan. Arsip export ada di `GITHUB 69/` (di-.gitignore) | SDD §2, §6; README build; RELEASE-CHECKLIST | Approved | Done (`f157dc0`, build:frontend) |
| CR-007 | 2026-09-30 | Pemilik produk | Fitur generator di dalam app (On-Prem Export / generator desktop-main, generator ekstensi browser, packager APK & mac browser) **dinonaktifkan** di rilis publik, karena templatenya masih memuat celah lama, URL relay, dan email pihak lain | SRS FR-12 (export on-prem dikeluarkan dari scope 1.1.0), TC-15, TC-18 | Approved | Done (`dc5c1bc`; kode generator terbuang dari bundle) |
| CR-008 | 2026-09-30 | Claude (implementasi) | Karena key tidak lagi ada di renderer (SEC-06), `ai:chat`/`ai:test-key` di main process ditambah provider Anthropic & DeepSeek (endpoint resmi), prompt sistem dipakai bersama semua provider. Password perangkat disimpan sebagai secret `ssh:<user>@<host>:<port>`; renderer mengirim placeholder, main me-resolve-nya | SDD §3, TC-12, TC-16, TC-24 | Approved (implementasi SEC-06) | Done (`e3ad1ea`) |
| CR-009 | 2026-09-30 | Pemilik produk | Tidak ada Apple Developer ID. Rilis 1.1.0 didistribusikan sebagai **open source untuk pemakaian pribadi** (GitHub Releases), bukan rilis resmi ber-notarization. macOS: **ad-hoc signing** (`identity: "-"`), `hardenedRuntime: false`, tanpa notarization; DMG terpisah arm64 & x64. Pengguna membuka app lewat *System Settings → Privacy & Security → Open Anyway* | SRS REL-01 (direvisi), REL-02, TC-21 (diganti), RELEASE-CHECKLIST §B, README | Approved | Done (DMG arm64 & x64 ad-hoc, `./build-macos.sh`) |
| CR-010 | 2026-09-30 | Pemilik produk | Publikasi open source di GitHub (`ikhsan-hdytllh/69ai-network-console`) dengan **history bersih** (1 commit awal). Source generator yang sudah dimatikan (CR-007) **dihapus** dari `frontend/` karena memuat URL relay Cloud Run AI Studio pemilik. Email pihak ketiga di dokumen disamarkan. History lengkap tetap di repo lokal (privat). Rilis v1.1.0 sebagai *pre-release* (Fase 4 belum lulus) | SDD §2, TC-15, RELEASE-CHECKLIST §D–E, README | Approved | Done |
| CR-003 | 2026-09-30 | Claude (implementasi) | SEC-05 opt-in terminal context butuh UI (D-01). Sementara redaksi secret di main process diterapkan pada semua `terminalContext`; opt-in dikerjakan di WP-7 | SRS SEC-05, TC-11 | Approved | Done. Toggle opt-in (default mati) di panel AI. Interpretasi: tombol **Analisa** mengirim output terminal karena merupakan permintaan eksplisit user; secret tetap disamarkan |

## Template
```
### CR-XXX: <judul>
- Alasan:
- Requirement terdampak: FR-/SEC-/NFR-/REL-
- Dokumen yang harus diperbarui:
- Estimasi effort:
- Keputusan & oleh siapa:
```
