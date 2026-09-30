# Fase 5 — Release Checklist (v1.1.0 publik)

## A. Pra-build
- [ ] Gate Fase 4 ditutup (traceability 100% ✅)
- [ ] Versi di `package.json` dinaikkan ke `1.1.0`, `CHANGELOG.md` diperbarui
- [ ] `PACKAGE-INFO.json` diperbarui atau dihapus
- [x] Nama pemegang hak cipta di `LICENSE` dan `package.json` (`author`, `copyright`) sudah final: Yoga Romadiputra
- [ ] `package-lock.json` (root & `frontend/`) di-commit; build memakai `npm ci`
- [ ] `npm run build:frontend` sukses (tsc 0 error) dan `git status` bersih setelahnya (app-dist sesuai source)
- [ ] Sekali per mesin build: `npm install-scripts approve electron esbuild @serialport/bindings-cpp` (npm 11 memblokir install script)
- [ ] `npm audit --omit=dev` bersih (TC-23)

## B. macOS (CR-009: ad-hoc, tanpa notarization)
- [x] `package.json`: `mac.identity: "-"`, `hardenedRuntime: false`, target DMG `arm64` + `x64`, `npmRebuild: false`
- [x] Paket tidak membawa `cpu-features` (binary host) dan prebuild serialport non-Mac
- [x] `./build-macos.sh` menghasilkan 2 DMG + `SHA256SUMS.txt`; `codesign --verify --deep --strict` OK (2026-09-30, rc.1)
- [x] Paket arm64 memuat `serialport` & `ssh2` dari `app.asar`
- [ ] Paket x64 diuji di Mac Intel atau Mac dengan Rosetta
- [ ] Uji instal di Mac lain: *Open Anyway* berhasil, serial/BLE/SSH berfungsi (TC-21)
- [ ] *(Nanti, bila ada Developer ID)* identity Developer ID, `hardenedRuntime: true`, notarization via env var
- [ ] TC-21 lulus pada `.dmg` final

## C. Windows
- [ ] Code signing certificate (OV/EV) atau catatan SmartScreen di README
- [ ] Installer NSIS dan portable diuji di VM Windows yang bersih

## D. Artefak rilis
- [ ] `shasum -a 256 dist-desktop/*` → `SHA256SUMS.txt`
- [ ] Nama file: `69-AI-Network-Console-1.1.0-{arm64|x64|universal}.dmg`, `...-Setup-1.1.0.exe`
- [ ] Release notes diambil dari `CHANGELOG.md`
- [ ] Tag git `v1.1.0`

## E. Dokumen publik
- [x] `README.md` (EN, showcase) + `README.id.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, template issue/PR, CI
- [x] `PRIVACY.md` sesuai dengan koneksi eksternal di [SDD §5](../02-design/SDD.md#5-koneksi-eksternal)
- [x] `SECURITY.md` punya kontak pelaporan yang aktif (yoga.romadiputra@vstecsindo.com, 2026-09-30)
- [x] `LICENSE` (MIT)
- [x] Screenshot UI tanpa data sensitif (perangkat demo di 127.0.0.1, tanpa API key)

## F. Pasca-rilis (48 jam pertama)
- [ ] Download dan install dari halaman rilis di Mac yang bersih; pastikan tidak muncul peringatan Gatekeeper
- [ ] Pantau issue / laporan pengguna
- [ ] Update status proyek ke Fase 6
