# Smoke Test Fase 3 — 2026-09-30

Lingkungan: macOS (Darwin 27), Electron 44.5.0, commit `961700c`. Harness memuat `desktop-main.js`, mengarahkan `userData` ke folder sementara, lalu menjalankan pemeriksaan dari renderer lewat `window.DesktopNative`. Ini **bukan** pengganti Fase 4; pengujian lengkap (perangkat nyata, SSH, serial, BLE) tetap mengikuti [TEST-PLAN](../04-verification/TEST-PLAN.md).

| Cek | TC terkait | Hasil |
| :--- | :--- | :--- |
| UI termuat, `require`/`process` tidak ada di renderer | TC-09 | ✅ |
| Host `x";touch /tmp/pwned_69ai;"` ditolak, file tidak dibuat | TC-01 | ✅ |
| Ping `127.0.0.1` & resolve `localhost` | TC-02 | ✅ |
| TCP probe port tertutup → `portClosed` | TC-03 | ✅ |
| `ssh:write` ke sesi yang tidak ada → ditolak | TC-04 | ✅ |
| `serial:write('default')` → ditolak | TC-05 | ✅ |
| `window.open` eksternal → `null` | TC-08 | ✅ |
| Fetch relay cloud pihak ketiga & `localhost:3000` → diblokir CSP | TC-10 | ✅ |
| Fetch Gemini API tetap diizinkan CSP (HTTP 403 tanpa key) | CR-001 | ✅ |
| KB offline termuat (72 entri); fallback AI offline jalan | TC-16 | ✅ |
| Secret tersimpan & terenkripsi; nama tak dikenal ditolak | TC-12 | ✅ |

Temuan baru selama smoke test: F-19 (`/ble-bridge.html` tidak ditemukan di `file://`, bug lama) dan F-20 (label versi UI).

## Log mentah
```
SMOKE RENDER {"title":"69 AI Network Console","rootChildren":1,"textLen":371,"native":true,"typeofRequire":"undefined","typeofProcess":"undefined"}
SMOKE TC-01 injection {"success":false,"reachable":false,"rtt":1000,"resolvedIp":"","statusMsg":"Format host tidak valid.","error":"INVALID_ARGS"}
SMOKE TC-01 pwned file exists false
SMOKE TC-02 ping 127.0.0.1 {"reachable":true,"msg":"Echo reply from 127.0.0.1: bytes=64 time=0.20ms TTL=64"}
SMOKE TC-02 dns localhost {"reachable":true,"ip":"127.0.0.1"}
SMOKE TC-03 tcp closed port {"reachable":true,"portClosed":true,"msg":"[RST, ACK] Host 127.0.0.1 (127.0.0.1) Responded (Port 1 Closed, RTT=1ms)"}
SMOKE TC-04 ssh write no session {"success":false,"error":"Sesi SSH untuk perangkat ini sudah tertutup atau belum terhubung."}
SMOKE TC-05 serial write no session false
SMOKE TC-08 window.open "null"
SMOKE TC-10 relay fetch "DIBLOKIR: Failed to fetch"
SMOKE TC-10 localhost fetch "DIBLOKIR: Failed to fetch"
SMOKE CSP allow gemini "HTTP 403"
SMOKE offline db 72
SMOKE TC-12 secrets {"a":{"success":true},"b":{"success":true,"exists":true},"c":{"success":false,"error":"Nama secret tidak dikenal."}}
SMOKE TC-12 plaintext in file false
SMOKE ai offline fallback {"ok":true,"src":"69 AI Desktop Intelligence Engine"}
```

---

# Smoke Test lanjutan (WP-7, frontend v19) — 2026-09-30

Commit `01a17e8` + `e3ad1ea`. Harness menjalankan **server SSH lokal sungguhan** (`ssh2.Server`) dan men-stub dialog konfirmasi.

| Cek | TC terkait | Hasil |
| :--- | :--- | :--- |
| UI v19 termuat; versi `v1.1.0`; tombol export tidak ada; toggle terminal ada | TC-19, CR-007 | ✅ |
| Bridge BLE termuat (`ble-bridge.html`) | TC-25 | ✅ |
| Migrasi data lama: key & password plaintext → Keychain, localStorage hanya placeholder, tidak ada plaintext di `secrets.json` | TC-24, TC-12 | ✅ |
| SSH login dengan password placeholder (di-resolve main dari Keychain) | TC-24 | ✅ |
| Password salah → ditolak server | – | ✅ |
| `writeSsh` ke sesi lain → ditolak; server hanya menerima input dari sesi yang benar | TC-04 | ✅ |
| TOFU: fingerprint tersimpan; host key berubah + user menolak → `Host denied` | TC-13 | ✅ |
| Server CBC/hmac-md5: tolak Legacy → gagal; setuju → sukses, diingat, tanpa dialog lagi; server modern tetap non-legacy | TC-14 | ✅ |
| Server group1-sha1 saja → `Unknown DH group` (keterbatasan BoringSSL, F-23) | TC-14 | ⚠️ known issue |
| API key palsu tidak tersimpan | TC-12 | ✅ |
| Fetch relay cloud pihak ketiga dari renderer → diblokir CSP | TC-10 | ✅ |
| `npm run build:frontend` reproducible (app-dist identik) | NFR-02 | ✅ |

## Log mentah
```
SMOKE UI {"title":"69 AI Network Console","version":"v1.1.0","bleFrame":true,"shareToggle":true,"exportBtn":false}
SMOKE BLE bridge doc "69 AI BLE Serial Bridge (Irxon BT578 V3)"
SMOKE MIGRASI localStorage {"gemini":"AIzaSy••••••••7890","devicePw":"••••••••"}
SMOKE MIGRASI secrets.json {"names":["gemini","ssh:admin@127.0.0.1:2201"],"plaintextLeak":false}
SMOKE SSH connect placeholder pw {"success":true,"deviceId":"dev-r1"}
SMOKE SSH connect salah pw {"success":false,"error":"All configured authentication methods failed"}
SMOKE SSH write ke sesi lain ditolak {"success":false,"error":"Sesi SSH untuk perangkat ini sudah tertutup atau belum terhubung."}
SMOKE SSH server menerima "show version\r\r"
SMOKE TOFU tersimpan ["127.0.0.1:2201"]
SMOKE Host key berubah (ditolak) {"success":false,"error":"Host denied (verification failed)"}
SMOKE Legacy (setuju) {"success":false,"error":"Unknown DH group"}
SMOKE Legacy tersimpan {"legacy":true,"updatedAt":"2026-09-30T04:58:53.344Z"}
SMOKE Dialog muncul ["Host key SSH berubah","Perangkat memakai algoritma SSH lama"]
SMOKE AI key palsu {"success":false}
SMOKE Relay fetch "DIBLOKIR"
SMOKE CBC-only, user menolak Legacy {"success":false,"error":"Handshake failed: no matching C->S cipher"}
SMOKE CBC-only, user setuju Legacy {"success":true}
SMOKE Koneksi berikutnya (tanpa dialog lagi) {"success":true}
SMOKE Dialog setelah diingat []
SMOKE Server modern tetap tanpa legacy {"success":true}
SMOKE known_hosts {"127.0.0.1:2203":{"legacy":true,"updatedAt":"2026-09-30T04:59:58.461Z","fingerprint":"bdcbc468def86ac498834c2944300497e0b21c929e92f38ceb9fa7e183b5232c"},"127.0.0.1:2204":{"fingerprint":"bdcbc468def86ac498834c2944300497e0b21c929e92f38ceb9fa7e183b5232c","updatedAt":"2026-09-30T04:59:58.469Z"}}
```
