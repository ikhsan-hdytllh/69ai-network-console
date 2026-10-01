# Fase 2 — Software Design Document (SDD)

| Versi dokumen | Tanggal | Status |
| :--- | :--- | :--- |
| 1.0 | 2026-09-30 | ✅ Disetujui |

## 1. Arsitektur

```
┌──────────────────────────── Renderer (sandboxed) ─────────────────────────────┐
│ React app (app-dist/index.html)                                               │
│  TerminalScreen · AiAssistantPanel · OfflineKbModal · TrafficGenerator · ...  │
│            │  window.DesktopNative.*  (hanya API ini yang terekspos)          │
└────────────┼──────────────────────────────────────────────────────────────────┘
             │ contextBridge (electron/preload.js)  
             ▼ ipcRenderer.invoke / on
┌──────────────────────────── Main process (electron/main.js) ────────────────────┐
│ IPC validator (SEC-09)                                                        │
│  ├─ serial:*   → serialport  ── USB/BT serial ──► Router/Switch console       │
│  ├─ ssh:*      → ssh2 + known_hosts (SEC-07) ───► Perangkat via TCP/22        │
│  ├─ network:*  → os / dns / net / execFile(ping) (SEC-01)                     │
│  ├─ ai:*       → fetch HTTPS ──────────────────► Gemini / OpenAI (SEC-04)     │
│  ├─ secrets:*  → safeStorage (SEC-06)                                         │
│  └─ browser:open → BrowserWindow, partition "persist:webgui" (SEC-02)         │
└───────────────────────────────────────────────────────────────────────────────┘
```

## 2. Komponen

| Komponen | File | Tanggung jawab |
| :--- | :--- | :--- |
| Main process | `electron/main.js` | Lifecycle jendela, handler IPC, akses hardware dan jaringan |
| Preload | `electron/preload.js` | Mengekspos `window.DesktopNative` (API minimal) |
| Renderer | source `frontend/src/` → build `app-dist/` (`npm run build:frontend`) | UI, state perangkat, rendering markdown AI. Secret hanya berupa placeholder (`utils/secretVault.ts`) |
| KB offline | `app-dist/offline-commands-db.json` | 72 entri perintah multi-vendor |
| BLE bridge | `app-dist/BleWebViewBridge.js` | Web Bluetooth UART (FFE0/FFE1, NUS, ISSC) |

## 3. Kontrak IPC (target 1.1.0)

Semua handler: cek `event.senderFrame` berasal dari jendela utama, lalu validasi skema argumen. Kalau tidak valid, kembalikan `{ success:false, error:'INVALID_ARGS' }`.

| Channel | Argumen | Validasi | Perubahan dari baseline |
| :--- | :--- | :--- | :--- |
| `serial:list` | – | – | tetap |
| `serial:connect` / `serial:open` | `{path, baudRate}` | path cocok `^/dev/(cu\|tty)\.[\w.-]+$` atau `^COM\d+$`; baud ∈ daftar standar | tetap, plus validasi |
| `serial:write` | `{path, text}` | path **wajib** dan harus ada di map | **hapus fallback ke port lain** (F-08) |
| `serial:close` | `{path}` | path wajib, exact match | hapus pencocokan `includes()` |
| `ssh:test` / `ssh:connect` | `{deviceId, host, port, username, password?, legacy?}` | host: hostname/IPv4/IPv6 valid; port 1–65535 | tambah `hostVerifier` (SEC-07), algoritma legacy hanya kalau `legacy:true` |
| `ssh:write` | `{deviceId, text}` | deviceId wajib, exact match | **hapus fallback** (F-08) |
| `ssh:exec` | `{deviceId-less opts, command}` | sama dengan connect | tambah hostVerifier |
| `network:interfaces` | – | – | tetap |
| `network:probe` | `{host, port, mode, timeoutMs}` | host lolos regex hostname/IP; timeout 200–10000 | `execFile('ping', args)`; `require('dns')` dan `require('net')` dari Node (F-01, F-09, F-10) |
| `ai:chat` | `{message, brand, model, history, terminalContext?, provider}` | panjang dibatasi | **API key diambil di main dari safeStorage**, tidak dikirim dari renderer; relay Tier 2 dihapus (F-04); provider: Gemini, OpenAI, Anthropic, DeepSeek (CR-008) |
| `ai:test-key` | `{provider, apiKey}` | – | kalau valid, simpan via safeStorage |
| `secrets:set` / `secrets:has` / `secrets:delete` | `{name, value?}` | name ∈ {gemini, openai, anthropic, deepseek} atau `ssh:<user>@<host>:<port>` | **baru** (SEC-06); tidak ada `secrets:get` ke renderer; password SSH berupa placeholder di-resolve di `ssh:*` |
| `browser:open` | `{url, brand}` | hanya `http:`/`https:` | partition terpisah; bypass sertifikat per host setelah dialog konfirmasi (SEC-02) |
| `bluetooth:select` / `bluetooth:cancel-scan` | deviceId | string | tetap |

## 4. Desain keamanan
- **Jendela utama:** `sandbox:true`, `webSecurity:true`, `contextIsolation:true`. Tambahkan `setWindowOpenHandler(() => ({action:'deny'}))` dan blokir `will-navigate` keluar dari `file://`.
- **CSP** di `index.html`: `default-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com https://dns.google https://cloudflare-dns.com https://raw.githubusercontent.com https://api.github.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'`. Daftar ini final setelah D-01, dan harus dicek terhadap fitur yang benar-benar dipakai.
- **Permission:** `setPermissionCheckHandler` dan `setDevicePermissionHandler` hanya mengembalikan `true` untuk `serial`, `bluetooth`, dan `hid`.
- **Rahasia:** disimpan terenkripsi via `safeStorage` di `userData/secrets.json`. Renderer hanya tahu "key sudah diset / belum".
- **Redaksi:** sebelum `terminalContext` dikirim ke AI, baris yang cocok `/(password|secret|key|community|pre-shared)\s+\S+/i` diganti `***`.
- **Logging:** handler `uncaughtException` menulis ke file log lalu menampilkan dialog error.

## 5. Koneksi eksternal

| Tujuan | Dipakai untuk | Status 1.1.0 |
| :--- | :--- | :--- |
| `generativelanguage.googleapis.com` | Gemini API | ✅ dipertahankan |
| `api.openai.com` | OpenAI API | ✅ dipertahankan |
| `dns.google`, `cloudflare-dns.com` | DoH lookup di renderer | ✅ dipertahankan (didokumentasikan di PRIVACY) |
| `raw.githubusercontent.com`, `api.github.com` | Sinkronisasi katalog CLI vendor | ✅ dipertahankan |
| `*.run.app` (Cloud Run pihak ketiga) | Relay chat cadangan | ❌ **dihapus** |
| `localhost:3000`, `127.0.0.1:3000`, `10.0.2.2:3000` | Relay dev server | ❌ **dihapus** |
| `api.deepseek.com`, `api.anthropic.com` | Direferensikan di bundle | ⚠️ dicek setelah D-01 |

## 6. Struktur paket rilis
```
69 AI Network Console.app
└─ Contents/Resources/app.asar
   ├─ electron/main.js
   ├─ electron/preload.js
   ├─ package.json
   ├─ app-dist/            (tanpa electron-files/)
   └─ node_modules/        (production only: serialport, ssh2)
```

## 7. Exit criteria Fase 2
- [x] Kontrak IPC §3 disetujui (termasuk channel `secrets:*` yang baru)
- [x] Daftar koneksi eksternal §5 disetujui (dengan CR-001)
- [x] Desain browser internal (SEC-02) disetujui
