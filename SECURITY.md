# Security Policy

**Reporting a vulnerability:** please email **yoga.romadiputra@vstecsindo.com** with the app version, OS, steps to reproduce and the expected impact. Do **not** open a public issue. You'll get a reply within 3 working days, and high/critical issues are targeted for a fix within 14 days. Supported version: 1.1.x.

---

# Kebijakan Keamanan (Bahasa Indonesia)

## Versi yang didukung
| Versi | Didukung |
| :--- | :--- |
| 1.1.x | ✅ |
| 1.0.0 (baseline pra-rilis) | ❌ jangan dipakai |

## Melaporkan celah keamanan
**Jangan** laporkan celah keamanan lewat issue publik.

Kirim laporan ke: **yoga.romadiputra@vstecsindo.com** dengan isi:
- Versi aplikasi dan OS
- Langkah reproduksi
- Dampak yang kamu perkirakan

Kami akan mengonfirmasi dalam **3 hari kerja** dan menargetkan patch untuk severity high/critical dalam **14 hari**. Pelapor akan dicantumkan di CHANGELOG kecuali minta dirahasiakan.

## Model keamanan (ringkas)
- Renderer berjalan di sandbox tanpa akses Node.js; semua akses hardware dan jaringan lewat IPC yang divalidasi.
- API key dan password perangkat disimpan terenkripsi lewat Keychain (macOS) / DPAPI (Windows).
- Host key SSH diverifikasi (trust on first use). Algoritma kriptografi lama hanya aktif kalau kamu mengaktifkan mode "Legacy device" per perangkat.
- Validasi sertifikat TLS hanya dilonggarkan di jendela Web GUI, per host, dan setelah kamu mengonfirmasi.
