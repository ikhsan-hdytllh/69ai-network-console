# Fase 3 — Implementation Plan

Dimulai **hanya setelah** gate Fase 1 dan 2 disetujui.

## Persiapan
1. `git init`, lalu commit baseline apa adanya dengan tag `v1.0.0-baseline` (D-03).
2. Ambil source frontend prototipe dan taruh di `src/` beserta `vite.config.ts` (D-01).
3. Pakai `npm ci` dengan `package-lock.json` yang di-commit.

## Paket pekerjaan

| WP | Isi | Requirement | File | Status |
| :--- | :--- | :--- | :--- | :-- |
| WP-1 | Ping memakai `execFile`, validasi hostname, `require('dns')` & `require('net')` dari Node | SEC-01, FR-08 | `desktop-main.js` | ✅ `11c13fe` |
| WP-2 | Hapus fallback sesi di `ssh:write`, `serial:write`, `serial:close` | FR-04, FR-06 | `desktop-main.js` | ✅ `5ca2ae3` |
| WP-3 | Hardening jendela: sandbox, webSecurity, permission whitelist, window-open/navigate guard, CSP | SEC-03, SEC-09 | `desktop-main.js`, `app-dist/index.html` | ✅ `d597cea` |
| WP-4 | Browser internal di partition terpisah + konfirmasi sertifikat per host | SEC-02, FR-11 | `desktop-main.js` | ✅ `41d74e0` |
| WP-5 | Hapus relay Tier 2; API key dari safeStorage; channel `secrets:*` | SEC-04, SEC-06 | `desktop-main.js`, `desktop-preload.js` | ✅ `420c4b9` |
| WP-6 | SSH known_hosts (TOFU) + toggle legacy | SEC-07 | `desktop-main.js` | ✅ `c5dc2d7` |
| WP-7 | Frontend: hapus email default, pakai `secrets:*`, opt-in + redaksi terminalContext, build production | SEC-05, SEC-06, SEC-08, NFR-02 | `frontend/src/*` | ✅ `dc5c1bc`, `01a17e8` (juga F-19, F-20) |
| WP-8 | Port picker serial (tanpa pemilihan otomatis) | FR-05 | `desktop-main.js` | ✅ `4f3f0c1` (dialog native) |
| WP-9 | Logging ke file | NFR-05 | `desktop-main.js` | ✅ `4f3f0c1` |
| WP-10 | Bersihkan paket: hapus `electron-files/`, Tauri, tambah `LICENSE`, `hardenedRuntime`, entitlements | REL-01, 03, 04, 05 | `package.json`, `build/entitlements.mac.plist` | ✅ `961700c`, LICENSE MIT © Yoga Romadiputra |
| WP-11 | Upgrade Electron 30 → 44 (CR-004) | REL-05, F-18 | `package.json`, `package-lock.json` | ✅ `961700c` |

Bukti smoke test: [SMOKE-TEST-2026-09-30.md](SMOKE-TEST-2026-09-30.md)

## Standar coding
- Ikuti gaya yang sudah ada: CommonJS, 2 spasi, pesan error berbahasa Indonesia.
- Setiap commit menyebut ID-nya, misalnya `fix(ipc): hapus fallback sesi ssh:write [FR-04]`.
- Perubahan di luar tabel ini wajib dicatat dulu sebagai CR di [CHANGE-REQUESTS.md](CHANGE-REQUESTS.md).

## Exit criteria Fase 3
- [x] WP-1 s.d. WP-11 selesai dan di-commit
- [x] `npm run build:frontend` (npm ci + tsc 0 error + vite build) reproducible: build ulang menghasilkan `app-dist` identik
- [x] `node --check desktop-main.js` lolos, dan aplikasi berjalan di Electron 44 (smoke test)
- [x] Tidak ada CR yang masih berstatus "Open"
