# Fase 1 — Software Requirements Specification (SRS)

| Versi dokumen | Tanggal | Status |
| :--- | :--- | :--- |
| 1.0 | 2026-09-30 | ✅ Disetujui pemilik produk |

## 1. Tujuan produk
69 AI Network Console adalah aplikasi desktop (macOS & Windows) untuk network engineer. Aplikasi ini menggabungkan terminal SSH, console serial (USB dan Bluetooth), knowledge base CLI offline multi-vendor, dan asisten AI dalam satu jendela.

## 2. Pengguna sasaran
- Network engineer / NOC yang mengakses router, switch, dan firewall (Cisco, Juniper, MikroTik, Fortinet, Huawei, Aruba, Allied Telesis) serta server Linux.
- Pengguna memasukkan API key AI milik sendiri (Gemini / OpenAI).

## 3. Ruang lingkup rilis 1.1.0
**Masuk scope:** semua fitur yang sudah ada di baseline 1.0.0, ditambah perbaikan keamanan dan bug dari [audit](../00-baseline/AUDIT-2026-09-30.md).
**Di luar scope:** fitur baru, build Tauri (ditunda, lihat REL-03), build Linux, dan ekstensi browser yang bisa digenerate dari aplikasi.

## 4. Functional requirements

| ID | Requirement | Prioritas | Kriteria penerimaan |
| :--- | :--- | :--- | :--- |
| FR-01 | Menyimpan daftar perangkat (nama, brand, host, port, protokol) | Must | Perangkat tetap ada setelah aplikasi di-restart |
| FR-02 | Membuka sesi SSH interaktif (PTY) ke perangkat | Must | Login berhasil ke IOS-XE, RouterOS, dan OpenSSH Linux |
| FR-03 | Beberapa sesi terbuka bersamaan dalam tab terpisah | Must | ≥ 5 tab aktif tanpa output tercampur |
| FR-04 | Input di sebuah tab **hanya** terkirim ke sesi milik tab itu | Must | Kalau sesi tab sudah tertutup, input ditolak dengan pesan error dan tidak dialihkan ke sesi lain |
| FR-05 | Membuka console serial USB (CP210x, CH340, FTDI, PL2303) dengan baud rate pilihan user | Must | User memilih port dari daftar; tidak ada pemilihan otomatis diam-diam |
| FR-06 | Aturan isolasi sesi FR-04 juga berlaku untuk serial | Must | Sama seperti FR-04 |
| FR-07 | Console lewat adapter BLE (IRXON BT578 dan profil UART umum) | Should | Pairing lewat modal picker, data dua arah |
| FR-08 | Tool ping dan TCP port probe | Should | Hostname ter-resolve; probe port terbuka/tertutup/timeout dilaporkan dengan benar |
| FR-09 | Asisten AI multi-vendor memakai API key milik user (Gemini / OpenAI) | Must | Jawaban memakai sintaks vendor yang sesuai |
| FR-10 | Fallback offline (knowledge base bawaan, 72 entri) saat AI tidak tersedia | Must | Tetap ada jawaban tanpa internet |
| FR-11 | Browser internal untuk Web GUI perangkat (termasuk sertifikat self-signed) | Should | Bisa membuka GUI dengan sertifikat self-signed **setelah user mengonfirmasi** dan hanya untuk host itu |
| FR-12 | Traffic generator, FTP/TFTP, config snapshot diff, export on-prem | Could | Berfungsi seperti di baseline (regresi tidak boleh terjadi) |

## 5. Security requirements

| ID | Requirement | Mengatasi |
| :--- | :--- | :--- |
| SEC-01 | Tidak ada input renderer yang dirangkai ke perintah shell. Proses eksternal dijalankan dengan `execFile`/`spawn` memakai array argumen, dan input divalidasi (hostname/IP whitelist regex) | F-01 |
| SEC-02 | Validasi TLS default tetap aktif. Pengecualian sertifikat hanya berlaku di session terisolasi (`partition`) milik browser internal, per host, dan setelah konfirmasi user | F-02 |
| SEC-03 | Jendela utama: `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true`, `webSecurity:true`. Permission handler hanya mengizinkan `serial`, `bluetooth`, dan `hid` yang memang dipakai. Navigasi dan `window.open` ke URL eksternal diblokir. Content-Security-Policy dipasang | F-03 |
| SEC-04 | API key user hanya dikirim ke endpoint resmi provider (`generativelanguage.googleapis.com`, `api.openai.com`). Tidak ada relay pihak ketiga atau `localhost` default | F-04 |
| SEC-05 | Buffer terminal hanya dikirim ke AI kalau user mengaktifkannya (opt-in, default mati), dan password/secret di-redact dulu (`password`, `secret`, `key`, `community`) | F-04, F-05 |
| SEC-06 | API key disimpan lewat `safeStorage` Electron (Keychain di macOS, DPAPI di Windows), bukan `localStorage`. Password perangkat juga | F-06 |
| SEC-07 | Host key SSH diverifikasi dengan model TOFU (known_hosts milik aplikasi, peringatan kalau berubah). Algoritma legacy hanya aktif lewat toggle "Legacy device" per perangkat | F-07 |
| SEC-08 | Tidak ada data identitas pengguna lain yang di-hardcode | F-05 |
| SEC-09 | Semua handler IPC memvalidasi tipe dan panjang argumen, dan hanya menerima pesan dari `webContents` jendela utama | F-03 |

## 6. Non-functional requirements

| ID | Requirement |
| :--- | :--- |
| NFR-01 | Platform: macOS 12+ (Apple Silicon & Intel), Windows 10/11 x64 |
| NFR-02 | Frontend dibundel dalam mode production; waktu start < 3 detik di Mac M1 |
| NFR-03 | Tanpa internet, semua fitur non-AI tetap berfungsi |
| NFR-04 | UI berbahasa Indonesia (sesuai baseline) |
| NFR-05 | Error tak tertangani ditulis ke file log (`app.getPath('logs')`) dan tidak ditelan diam-diam |
| NFR-06 | Tidak ada telemetry atau analytics |

## 7. Release requirements

| ID | Requirement |
| :--- | :--- |
| REL-01 | ~~Build macOS di-sign dengan Developer ID, `hardenedRuntime:true`, dan di-notarize~~ **Direvisi CR-009:** build macOS di-sign ad-hoc (tanpa Developer ID/notarization), DMG arm64 & x64, instruksi membuka app tanpa notarization tersedia di README. Notarization menjadi target rilis berikutnya bila Developer ID tersedia |
| REL-02 | Build Windows di-sign (disarankan) atau diberi catatan SmartScreen di README |
| REL-03 | Konfigurasi Tauri dihapus dari rilis atau diberi label eksperimental |
| REL-04 | Folder `app-dist/electron-files/` dan file tak terpakai dikeluarkan dari paket |
| REL-05 | File `LICENSE`, `SECURITY.md`, `PRIVACY.md`, `CHANGELOG.md` tersedia; versi dependency dikunci (`package-lock.json`) |
| REL-06 | Checksum SHA-256 setiap installer dipublikasikan |

## 8. Asumsi & batasan
- Source frontend tersedia dari Google AI Studio (D-01). Kalau tidak tersedia, SEC-04 dan SEC-05 hanya bisa ditegakkan dari sisi main process, dan SEC-06 serta SEC-08 tidak bisa dipenuhi.
- Model Gemini yang dipakai (`gemini-3.8-flash` dst.) harus dicek ulang ketersediaannya saat Fase 4.

## 9. Exit criteria Fase 1
- [x] Pemilik produk menyetujui daftar FR/SEC/NFR/REL beserta prioritasnya (2026-09-30)
- [x] FR-11 dan FR-12 dipertahankan sesuai draft
- [x] D-01 **belum** selesai; diterima dengan risiko: Fase 3 jalan untuk semua WP sisi main process, WP-7 ditunda sampai source frontend tersedia
