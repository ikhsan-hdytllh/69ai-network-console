<div align="center">

<img src="docs/assets/logo.png" alt="69 AI Network Console" width="120" />

# 69 AI Network Console

**Console SSH, serial & Bluetooth untuk network engineer, lengkap dengan AI co-pilot yang paham sintaks Cisco, Juniper, MikroTik, Fortinet, Huawei, dan Linux.**

[![Release](https://img.shields.io/github/v/release/ikhsan-hdytllh/69ai-network-console?include_prereleases&label=release)](https://github.com/ikhsan-hdytllh/69ai-network-console/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20(segera)-lightgrey)](#download)

<p>
  <a href="https://github.com/ikhsan-hdytllh/69ai-network-console/releases/download/v1.1.0/69-AI-Network-Console-1.1.0-arm64.dmg"><img src="https://img.shields.io/badge/Download-macOS%20Apple%20Silicon-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download untuk macOS Apple Silicon" /></a>
  <a href="https://github.com/ikhsan-hdytllh/69ai-network-console/releases/download/v1.1.0/69-AI-Network-Console-1.1.0-x64.dmg"><img src="https://img.shields.io/badge/Download-macOS%20Intel-555555?style=for-the-badge&logo=apple&logoColor=white" alt="Download untuk macOS Intel" /></a>
</p>

[Download](#download) · [Fitur](#fitur) · [Keamanan](#keamanan--privasi) · [Build dari source](#build-dari-source) · [English](README.md)

<img src="docs/assets/screenshot-main.png" alt="69 AI Network Console: terminal SSH ke switch Cisco dengan panel AI co-pilot" width="900" />

</div>

---

## Kenapa?

Kerja di perangkat jaringan biasanya berarti bolak-balik antara aplikasi terminal, tool console serial, utilitas adapter Bluetooth, dokumentasi vendor di browser, dan tab chat AI. **69 AI Network Console menyatukan semuanya dalam satu jendela**: buka sesi ke switch, jalankan perintah, lalu tanya co-pilot arti output-nya atau perintah berikutnya, dengan sintaks yang sesuai vendor.

## Fitur

- 🖥️ **Terminal SSH multi-tab** dengan split view, tab per perangkat, dan output berwarna (`up`/`down`, IP, error).
- 🔌 **Console serial via USB** (CP210x, CH340, FTDI, PL2303) dengan pemilih port dan baud rate.
- 📶 **Console Bluetooth** lewat adapter BLE UART seperti IRXON BT578.
- 🤖 **AI co-pilot** (pakai API key sendiri): Google Gemini, OpenAI, Anthropic Claude, atau DeepSeek. Jawabannya memakai sintaks CLI vendor target, dan setiap perintah di jawaban punya tombol **Eksekusi**.
- 📚 **Knowledge base perintah offline**, jadi tetap ada panduan CLI tanpa internet atau tanpa API key.
- 🧰 **Toolbox:** ping & TCP port probe, traffic generator, server FTP/TFTP, snapshot konfigurasi dan diff.
- 🔐 **Aplikasi desktop yang mengutamakan keamanan:** secret disimpan di keychain OS, host key SSH diverifikasi, dan renderer berjalan di sandbox. Lihat [Keamanan & privasi](#keamanan--privasi).

**Vendor:** Cisco IOS / IOS-XE / NX-OS · Juniper Junos · MikroTik RouterOS · Fortinet FortiOS · Huawei VRP · Aruba · Allied Telesis · server Linux.

## Download

| Platform | File | Catatan |
| :--- | :--- | :--- |
| macOS Apple Silicon (M1–M4) | [**69-AI-Network-Console-1.1.0-arm64.dmg**](https://github.com/ikhsan-hdytllh/69ai-network-console/releases/download/v1.1.0/69-AI-Network-Console-1.1.0-arm64.dmg) | macOS 12+ · 124 MB |
| macOS Intel | [**69-AI-Network-Console-1.1.0-x64.dmg**](https://github.com/ikhsan-hdytllh/69ai-network-console/releases/download/v1.1.0/69-AI-Network-Console-1.1.0-x64.dmg) | macOS 12+ · 130 MB |
| Windows 10/11 | *segera* | |

Bingung pilih yang mana? Menu Apple → **About This Mac**: kalau tertulis "Chip: Apple M…" berarti Apple Silicon, kalau "Processor: Intel" berarti Intel.

Semua versi ada di **[halaman Releases](https://github.com/ikhsan-hdytllh/69ai-network-console/releases)**. Cocokkan download-mu dengan [`SHA256SUMS.txt`](https://github.com/ikhsan-hdytllh/69ai-network-console/releases/download/v1.1.0/SHA256SUMS.txt):

```bash
shasum -a 256 -c SHA256SUMS.txt --ignore-missing
```

### Pertama kali membuka di macOS

Ini proyek komunitas gratis, jadi aplikasinya **tidak di-notarize Apple**. macOS akan memblokirnya saat pertama dibuka:

1. Buka `.dmg`, lalu drag **69 AI Network Console** ke **Applications**.
2. Buka aplikasinya. Saat macOS bilang developer tidak dapat diverifikasi, klik **Done**.
3. Buka **System Settings → Privacy & Security**, gulir ke bawah, lalu klik **Open Anyway**. Cukup sekali.

<details>
<summary>Lebih suka lewat Terminal?</summary>

Lakukan ini hanya untuk file yang checksum-nya sudah kamu cocokkan:

```bash
xattr -dr com.apple.quarantine "/Applications/69 AI Network Console.app"
```
</details>

## Mulai cepat

1. **Tambah perangkat** dengan tombol ➕: SSH (host, port, user), serial USB, atau Bluetooth.
2. **Connect.** Saat pertama kali SSH ke sebuah host, fingerprint key-nya disimpan. Kalau nanti berubah, aplikasi memperingatkan sebelum tersambung.
3. **Tanya co-pilot**, misalnya *"cek interface yang down dan vlan tanpa ip address"*. Klik **Eksekusi** pada perintah yang disarankan untuk menjalankannya di tab aktif.
4. **Opsional:** masukkan API key AI di **⚙️ Settings → AI Provider**. Tanpa key, engine offline tetap menjawab.

## Keamanan & privasi

Proyek ini awalnya prototipe hasil generate AI, lalu melewati [audit keamanan](docs/00-baseline/AUDIT-2026-09-30.md) dan siklus perbaikan lengkap sebelum rilis publik pertama.

| | |
| :--- | :--- |
| 🔑 **Secret** | API key dan password perangkat dienkripsi dengan keychain OS (macOS Keychain / Windows DPAPI). UI tidak pernah bisa membacanya kembali dalam bentuk plaintext. |
| 🌐 **Ke mana data pergi** | Langsung ke provider AI yang kamu pilih. **Tanpa server relay, tanpa telemetry, tanpa analytics.** |
| 🖥️ **Output terminal → AI** | **Mati secara default.** Kalau kamu nyalakan, password, secret, community SNMP, dan PSK disamarkan sebelum dikirim. |
| 🛡️ **SSH** | Host key diverifikasi (trust on first use). Algoritma lama yang lemah hanya aktif per perangkat, setelah kamu setujui. |
| 🧱 **Hardening aplikasi** | Renderer sandbox, Content-Security-Policy ketat, IPC tervalidasi, dan tidak ada perintah shell yang dirangkai dari input user. |

Detail: [PRIVACY.md](PRIVACY.md) · Menemukan celah keamanan? Lihat [SECURITY.md](SECURITY.md). Tolong jangan buka issue publik.

## Build dari source

Kebutuhan: **Node.js 20+** dan macOS (untuk build DMG).

```bash
git clone https://github.com/ikhsan-hdytllh/69ai-network-console.git
cd 69ai-network-console
npm ci
npm run build:frontend   # UI React (frontend/) → app-dist/
npm start                # jalankan aplikasi
./build-macos.sh         # DMG arm64 + x64 beserta checksum → dist-desktop/
```

Struktur proyek:

```
frontend/          source UI (React + Vite)
app-dist/          UI hasil build yang dimuat Electron (dibuat oleh build:frontend)
desktop-main.js    main process Electron: SSH, serial, AI, secret, IPC
desktop-preload.js satu-satunya jembatan ke UI (window.DesktopNative)
docs/              requirement, design, test plan, proses rilis (Waterfall)
```

## Keterbatasan yang diketahui

- Perangkat yang **hanya** mendukung `diffie-hellman-group1-sha1` tidak bisa di-SSH, karena library kripto Electron tidak mendukungnya. Aktifkan `diffie-hellman-group14-sha1` atau yang lebih baru di perangkat.
- Algoritma lama lain (CBC/3DES, `hmac-md5`, `ssh-dss`) bisa dipakai lewat dialog **mode Legacy** per perangkat.
- Installer Windows belum dirilis.

## Roadmap

- [x] DMG macOS (Apple Silicon & Intel)
- [ ] Installer Windows
- [ ] Uji perangkat asli Cisco / MikroTik / BT578 ([test plan](docs/04-verification/TEST-PLAN.md))
- [ ] v1.2: browser Web GUI perangkat dan quick-connect bar

## Kontribusi

Laporan bug, perbaikan perintah vendor, dan PR sangat diterima. Mulai dari [CONTRIBUTING.md](CONTRIBUTING.md). Kalau tool ini menghemat waktumu, kasih ⭐ supaya network engineer lain bisa menemukannya.

## Lisensi

[MIT](LICENSE) © 2026 Yoga Romadiputra
