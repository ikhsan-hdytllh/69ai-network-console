# Fase 6 — Maintenance

## Klasifikasi perubahan
| Jenis | Contoh | Jalur |
| :--- | :--- | :--- |
| Hotfix keamanan | CVE di Electron / ssh2 / serialport | Langsung Fase 3 → 4 (TC terkait + TC-23) → 5, rilis patch `1.1.x` |
| Bug fix | Fitur tidak sesuai SRS | CR → Fase 3 → 4 → 5, rilis patch |
| Fitur baru | Vendor baru, protokol baru | Siklus Waterfall baru dari Fase 1, rilis minor `1.x.0` |

## Rutinitas
| Frekuensi | Tugas |
| :--- | :--- |
| Bulanan | `npm outdated`, `npm audit`; cek rilis keamanan Electron (versi Electron yang sudah tidak disupport harus di-upgrade) |
| Per rilis Gemini/OpenAI | Cek nama model di `ai:chat` dan `ai:test-key` masih valid |
| Per kuartal | Review ulang `offline-commands-db.json` dan daftar koneksi eksternal di PRIVACY.md |

## Versioning
Semantic Versioning: `MAJOR.MINOR.PATCH`. Setiap rilis wajib punya entri di `CHANGELOG.md`.

## Penanganan laporan keamanan
Ikuti [SECURITY.md](../../SECURITY.md). Target: konfirmasi ≤ 3 hari kerja, patch untuk severity high ≤ 14 hari.
