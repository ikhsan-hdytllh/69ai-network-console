# Privasi

> Dokumen ini menjelaskan perilaku **versi 1.1.0**. Versi 1.0.0 (baseline) masih mengirim data ke relay pihak ketiga; lihat [audit](00-baseline/AUDIT-2026-09-30.md) temuan F-04.

69 AI Network Console **tidak memiliki server sendiri**, tidak memakai telemetry, dan tidak mengumpulkan analytics.

## Data yang disimpan di perangkatmu
| Data | Lokasi | Enkripsi |
| :--- | :--- | :--- |
| Daftar perangkat (nama, host, port, username) | folder data aplikasi | – |
| Password perangkat & API key AI | Keychain (macOS) / DPAPI (Windows) | ✅ |
| Known hosts SSH | folder data aplikasi | – |
| Log error | folder log aplikasi | – |

## Data yang keluar dari perangkatmu
| Tujuan | Kapan | Data yang dikirim |
| :--- | :--- | :--- |
| Perangkat jaringanmu | Saat kamu connect | Kredensial dan perintah yang kamu ketik |
| `generativelanguage.googleapis.com` (Google Gemini) | Saat kamu bertanya ke AI dengan provider Gemini | Pertanyaan, riwayat chat, brand/model perangkat, **dan output terminal kalau opsi "Sertakan output terminal" aktif** (default **mati**; secret disamarkan otomatis). Tombol **Analisa** selalu mengirim output terminal karena kamu memintanya secara eksplisit |
| `api.openai.com`, `api.anthropic.com`, `api.deepseek.com` | Sama seperti di atas, dengan provider OpenAI / Claude / DeepSeek | Sama |
| `dns.google`, `cloudflare-dns.com` | Saat tool ping me-resolve hostname | Hostname tujuan |
| `raw.githubusercontent.com`, `api.github.com` | Saat sinkronisasi katalog CLI vendor | Tidak ada data pribadi |

Data yang dikirim ke provider AI tunduk pada kebijakan privasi provider tersebut. Jangan kirim konfigurasi yang bersifat rahasia ke AI kalau kebijakan perusahaanmu melarangnya.
