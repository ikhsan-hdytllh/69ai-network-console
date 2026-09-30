# Fase 4 — Test Plan & Traceability

## Lingkungan uji
| Env | Detail |
| :--- | :--- |
| macOS | Apple Silicon (macOS 14+) dan Intel (macOS 12) |
| Windows | Windows 11 x64 |
| Perangkat | 1 router Cisco IOS-XE (atau CML/GNS3), 1 MikroTik CHR, 1 server Ubuntu, 1 kabel USB-serial, 1 adapter IRXON BT578 |

## Test case

| TC | Requirement | Langkah | Hasil yang diharapkan |
| :--- | :--- | :--- | :--- |
| TC-01 | SEC-01 | Ping dengan host `x";touch /tmp/pwned;"` dan `$(id)` | Ditolak `INVALID_ARGS`; `/tmp/pwned` tidak dibuat |
| TC-02 | FR-08 | Ping `google.com`, `8.8.8.8`, `::1` | Resolve dan RTT tampil |
| TC-03 | FR-08 | Probe TCP ke port terbuka, tertutup, dan host mati | Status: open / closed / timeout, tanpa exception |
| TC-04 | FR-04 | Buka SSH ke A dan B, tutup sesi A, lalu ketik di tab A | Error "sesi tertutup"; **tidak ada** input yang sampai ke B (cek log B) |
| TC-05 | FR-06 | Sama seperti TC-04 untuk 2 port serial | Sama |
| TC-06 | FR-05 | Colok 2 adapter USB-serial lalu klik connect | Picker muncul, user memilih |
| TC-07 | SEC-02 | Buka Web GUI self-signed, tolak dialog; lalu dari jendela utama fetch `https://self-signed.badssl.com` | Halaman tidak dimuat; fetch dari jendela utama **gagal** TLS |
| TC-08 | SEC-03 | Dari DevTools jendela utama: `window.open('https://example.com')`, `location='https://example.com'` | Diblokir |
| TC-09 | SEC-03 | Dari DevTools: `typeof require`, `typeof process` | `undefined` |
| TC-10 | SEC-04 | Proxy semua trafik (mitmproxy / Little Snitch), lalu chat AI dengan key tidak valid | Tidak ada request ke `*.run.app` atau `localhost:3000` |
| TC-11 | SEC-05 | `show run` berisi `enable secret` dan `snmp-server community`, lalu kirim ke AI dengan opt-in aktif | Payload berisi `***`, bukan secret aslinya |
| TC-12 | SEC-06 | Simpan API key, lalu cek `localStorage` dan `userData` | Key tidak ada dalam bentuk plaintext |
| TC-13 | SEC-07 | Connect SSH, ganti host key server, lalu connect lagi | Muncul peringatan dan koneksi diblokir sampai user menyetujui |
| TC-14 | SEC-07 | Connect ke perangkat yang hanya mendukung cipher CBC / `hmac-md5` | Dialog Legacy muncul; ditolak → gagal; disetujui → berhasil dan diingat. Catatan: perangkat yang **hanya** mendukung `group1-sha1` tidak didukung (F-23) |
| TC-15 | SEC-08 | Cari email/nama default pihak ketiga (daftar di catatan audit lokal) pada hasil build | 0 hasil |
| TC-16 | FR-09/10 | Chat AI dengan key valid, lalu matikan internet dan chat lagi | Jawaban Gemini; lalu jawaban KB offline |
| TC-17 | FR-07 | Pair BT578 dan kirim `show version` | Output diterima |
| TC-18 | FR-12 | Smoke test traffic generator, FTP/TFTP, snapshot diff | Tidak ada regresi dibanding baseline |
| TC-19 | NFR-02 | Ukur waktu start dan cek `jsxDEV` di bundle | < 3 detik; 0 hasil `jsxDEV` |
| TC-20 | NFR-05 | Picu error di main process | Tercatat di file log |
| TC-21 | REL-01 (CR-009) | `codesign --verify --deep --strict` pada `.app` di dalam DMG; install di Mac lain lewat *Open Anyway* | Signature ad-hoc valid; app terbuka setelah *Open Anyway*; serial/BLE/SSH berfungsi |
| TC-22 | REL-04 | `npx asar list app.asar \| grep electron-files` | 0 hasil |
| TC-23 | – | `npm audit --omit=dev` (root & `frontend/`) | Tidak ada vulnerability high/critical |
| TC-24 | SEC-06 | Instal di atas data versi lama (key & password plaintext di localStorage), buka aplikasi | Data dipindah ke Keychain; localStorage hanya placeholder; SSH dengan password tersimpan tetap berhasil |
| TC-25 | FR-07 | Buka aplikasi, periksa iframe BLE bridge | `ble-bridge.html` termuat (tidak ada `ERR_FILE_NOT_FOUND`) |
| TC-26 | SEC-05 | Toggle "Sertakan output terminal" mati → chat AI; nyalakan → chat lagi | Payload pertama tanpa output terminal; kedua berisi output dengan secret disamarkan |

## Traceability matrix

| Requirement | Test case | Status |
| :--- | :--- | :--- |
| SEC-01 | TC-01 | ⚪ |
| SEC-02 | TC-07 | ⚪ |
| SEC-03 | TC-08, TC-09 | ⚪ |
| SEC-04 | TC-10 | ⚪ |
| SEC-05 | TC-11, TC-26 | ⚪ |
| SEC-06 | TC-12, TC-24 | ⚪ |
| SEC-07 | TC-13, TC-14 | ⚪ |
| SEC-08 | TC-15 | ⚪ |
| SEC-09 | TC-01, TC-08 | ⚪ |
| FR-01…03 | TC-18 (+ uji manual tab) | ⚪ |
| FR-04 | TC-04 | ⚪ |
| FR-05 | TC-06 | ⚪ |
| FR-06 | TC-05 | ⚪ |
| FR-07 | TC-17, TC-25 | ⚪ |
| FR-08 | TC-02, TC-03 | ⚪ |
| FR-09, FR-10 | TC-16 | ⚪ |
| FR-11 | TC-07 | ⚪ |
| FR-12 | TC-18 | ⚪ |
| NFR-02 | TC-19 | ⚪ |
| NFR-05 | TC-20 | ⚪ |
| REL-01 | TC-21 | ⚪ |
| REL-04 | TC-22 | ⚪ |

Legenda: ⚪ belum diuji · ✅ lulus · ❌ gagal (buat bug report, kembali ke Fase 3)

## Exit criteria Fase 4
- [ ] Semua TC berstatus ✅
- [ ] Tidak ada bug severity high yang masih terbuka
- [ ] Hasil uji (screenshot / log) disimpan di `docs/04-verification/evidence/`
