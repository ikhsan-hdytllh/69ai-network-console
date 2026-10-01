const { app, BrowserWindow, ipcMain: rawIpcMain, Menu, shell, dialog, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const dns = require('dns');
const net = require('net');
const { execSync, execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// [SEC-09] Semua handler IPC hanya melayani jendela utama yang memuat file lokal aplikasi
function isTrustedSender(event) {
  const frameUrl = (event.senderFrame && event.senderFrame.url) || '';
  return Boolean(mainWindow && !mainWindow.isDestroyed() &&
    event.sender === mainWindow.webContents && frameUrl.startsWith('file://'));
}
const ipcMain = {
  handle(channel, fn) {
    rawIpcMain.handle(channel, (event, ...args) => {
      if (!isTrustedSender(event)) {
        console.warn(`[IPC] Panggilan ${channel} ditolak dari pengirim tidak dikenal`);
        return { success: false, error: 'UNTRUSTED_SENDER' };
      }
      return fn(event, ...args);
    });
  }
};

// [SEC-01] Hostname / IPv4 / IPv6 yang aman untuk diteruskan ke utilitas OS
const HOSTNAME_RE = /^(?=.{1,253}$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
function isValidHost(host) {
  return typeof host === 'string' && (net.isIP(host) !== 0 || HOSTNAME_RE.test(host));
}

// Enable Web Bluetooth & Experimental Web Platform features
app.commandLine.appendSwitch('enable-web-bluetooth', 'true');
app.commandLine.appendSwitch('enable-web-bluetooth-new-permissions-backend', 'true');
app.commandLine.appendSwitch('enable-experimental-web-platform-features', 'true');

// [NFR-05] Error tak tertangani dicatat ke file log, tidak ditelan diam-diam
function logError(kind, err) {
  const line = `[${new Date().toISOString()}] ${kind}: ${(err && err.stack) || err}\n`;
  console.error(line.trim());
  try {
    const logDir = app.getPath('logs');
    fs.mkdirSync(logDir, { recursive: true });
    fs.appendFileSync(path.join(logDir, 'main.log'), line);
  } catch (_) {}
}
process.on('uncaughtException', (err) => logError('uncaughtException', err));
process.on('unhandledRejection', (reason) => logError('unhandledRejection', reason));

let SerialPort;
try {
  SerialPort = require('serialport').SerialPort;
} catch (e) {
  console.warn('Native SerialPort module optional notice:', e);
}

// [F-23] BoringSSL di Electron tidak kenal grup 'modp2', jadi diffie-hellman-group1-sha1 gagal
// dengan "Unknown DH group". Sediakan prime Oakley Group 2 (RFC 2409) secara eksplisit.
// Harus dipasang SEBELUM require('ssh2') karena ssh2 mengambil fungsi crypto saat di-load.
(function patchModp2() {
  const crypto = require('crypto');
  const original = crypto.createDiffieHellmanGroup;
  const MODP2_PRIME = Buffer.from(
    'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74' +
    '020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437' +
    '4FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED' +
    'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381FFFFFFFFFFFFFFFF',
    'hex'
  );
  const patched = function createDiffieHellmanGroup(name) {
    try {
      return original.call(crypto, name);
    } catch (err) {
      if (name === 'modp2') return crypto.createDiffieHellman(MODP2_PRIME, Buffer.from([2]));
      throw err;
    }
  };
  crypto.createDiffieHellmanGroup = patched;
  crypto.getDiffieHellman = patched;
})();

let Client;
try {
  Client = require('ssh2').Client;
} catch (e) {
  console.warn('Native ssh2 module optional notice:', e);
}

const ALLOWED_PERMISSIONS = new Set(['serial', 'bluetooth', 'hid', 'clipboard-sanitized-write']);
const ALLOWED_DEVICE_TYPES = new Set(['serial', 'bluetooth', 'hid']);

let openPorts = new Map();
let activeSshSessions = new Map(); // deviceId -> { client, stream }
let mainWindow = null;
let selectBluetoothCallback = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    title: '69 AI • Universal Network Console (Native Edition)',
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true, // [SEC-03] Akses hardware tetap lewat IPC di main process
      webSecurity: true
    }
  });

  // [SEC-03] Jendela utama tidak boleh berpindah ke / membuka halaman eksternal.
  // Link http(s) dibuka di browser bawaan OS.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  // Enable Web Serial API automatically for USB-to-Serial Console cables on Mac
  // [FR-05] User memilih sendiri port Web Serial; tidak ada pemilihan otomatis diam-diam
  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    if (!portList || portList.length === 0) {
      callback('');
      return;
    }
    const choices = portList.slice(0, 10);
    const labels = choices.map((p) => p.displayName || p.portName || p.portId);
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: [...labels, 'Batal'],
      cancelId: labels.length,
      title: 'Pilih port serial',
      message: 'Pilih port serial yang akan dihubungkan:'
    }).then(({ response }) => {
      callback(response < choices.length ? choices[response].portId : '');
    }).catch(() => callback(''));
  });

  // Enable Web Bluetooth device pairing on Desktop with continuous discovery broadcast
  mainWindow.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    selectBluetoothCallback = callback;

    if (deviceList && deviceList.length > 0) {
      // Send the live discovered devices list to the React UI popup
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('bluetooth:discovered-list', deviceList);
      }
    }
    // Keep callback open so user sees the interactive Bluetooth popup modal
  });

  // [SEC-03] Hanya izin yang benar-benar dipakai aplikasi
  const ses = mainWindow.webContents.session;
  ses.setPermissionCheckHandler((webContents, permission) => ALLOWED_PERMISSIONS.has(permission));
  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  ses.setDevicePermissionHandler((details) => ALLOWED_DEVICE_TYPES.has(details.deviceType));

  mainWindow.loadFile(path.join(__dirname, '../app-dist/index.html'));
  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

// ==========================================
// 1. SERIAL COM / HARDWARE BRIDGES & BLUETOOTH
// ==========================================

// IPC Bluetooth controls
ipcMain.handle('bluetooth:select', (event, deviceId) => {
  if (selectBluetoothCallback) {
    selectBluetoothCallback(deviceId || '');
    selectBluetoothCallback = null;
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('bluetooth:cancel-scan', () => {
  if (selectBluetoothCallback) {
    selectBluetoothCallback('');
    selectBluetoothCallback = null;
    return { success: true };
  }
  return { success: false };
});

// IPC Handler: List native COM & Serial ports on Windows / macOS directly without browser dialog
ipcMain.handle('serial:list', async () => {
  try {
    const detectedPorts = [];
    const seenPaths = new Set();

    if (SerialPort && typeof SerialPort.list === 'function') {
      try {
        const ports = await SerialPort.list();
        if (Array.isArray(ports) && ports.length > 0) {
          for (const p of ports) {
            let pPath = p.path || p.pnpId || '';
            if (!pPath) continue;

            


            if (seenPaths.has(pPath)) continue;

            // Filter out system virtual ports on macOS
            const lower = pPath.toLowerCase();
            if (lower.includes('debug-console') || lower.includes('wlan-debug') || lower.includes('urt0') || lower.includes('soc') || lower.includes('bluetooth-incoming')) {
              continue;
            }

            seenPaths.add(pPath);
            let friendlyName = p.friendlyName || p.manufacturer ? `${pPath} (${p.manufacturer || 'Serial Adapter'})` : pPath;
            if (process.platform === 'darwin') {
              
            }
            detectedPorts.push({
              path: pPath,
              name: friendlyName,
              friendlyName,
              manufacturer: p.manufacturer || 'USB-to-Serial Console',
              vendorId: p.vendorId,
              productId: p.productId,
            });
          }
        }
      } catch (_) {}
    }

    if (process.platform === 'darwin' || process.platform === 'linux') {
      if (fs.existsSync('/dev')) {
        const files = fs.readdirSync('/dev');
        if (process.platform === 'darwin') {
          const macPortMap = new Map();
          files.forEach((f) => {
            const lower = f.toLowerCase();
            if (lower.includes('debug-console') || lower.includes('wlan-debug') || lower.includes('urt0') || lower.includes('soc') || lower.includes('bluetooth-incoming')) {
              return;
            }
            const isKnown = f.includes('usb') || f.includes('SLAB') || f.includes('wch') || f.includes('PL2303') || f.includes('FTDI') || f.includes('BT578') || f.includes('IRXON') || f.includes('irxon') || f.includes('serial');
            if (!isKnown) return;

            const isCu = f.startsWith('cu.');
            const isTty = f.startsWith('tty.');
            if (isCu || isTty) {
              const baseName = f.replace(/^(cu\.|tty\.)/, '');
              if (!macPortMap.has(baseName) || isCu) {
                macPortMap.set(baseName, isCu ? f : ('cu.' + baseName));
              }
            }
          });

          macPortMap.forEach((file) => {
            const fullPath = file.startsWith('/dev/') ? file : ('/dev/' + file);
            if (seenPaths.has(fullPath)) return;
            seenPaths.add(fullPath);

            let manufacturer = 'USB-Serial Console Adapter';
            if (file.includes('SLAB')) manufacturer = 'Silicon Labs CP2102';
            else if (file.includes('wch')) manufacturer = 'WCH CH340';
            else if (file.includes('usbserial')) manufacturer = 'FTDI / Prolific USB-Serial';
            else if (file.includes('BT578') || file.includes('IRXON') || file.includes('irxon')) manufacturer = 'IRXON BT578 Wireless SPP';

            detectedPorts.push({
              path: fullPath,
              name: `${fullPath} (${manufacturer})`,
              friendlyName: `${fullPath} (${manufacturer})`,
              manufacturer,
            });
          });
        } else {
          files.forEach((sf) => {
            if (sf.startsWith('ttyUSB') || sf.startsWith('ttyACM')) {
              const fullPath = `/dev/${sf}`;
              if (seenPaths.has(fullPath)) return;
              seenPaths.add(fullPath);
              let manufacturer = sf.startsWith('ttyUSB') ? 'USB-UART Serial' : 'CDC-ACM Serial';
              detectedPorts.push({
                path: fullPath,
                name: `${fullPath} (${manufacturer})`,
                friendlyName: `${fullPath} (${manufacturer})`,
                manufacturer,
              });
            }
          });
        }
      }
    }
    return { success: true, ports: detectedPorts };
  } catch (err) {
    return { success: false, ports: [], error: err.message };
  }
});

const activeNativeSerialPorts = new Map();

// Ambil path device murni dari label seperti "/dev/cu.usbserial-1 (FTDI)" atau "COM3 (CH340)"
function normalizeSerialPath(raw) {
  const text = String(raw || '').trim();
  const devMatch = text.match(/\/dev\/(?:cu|tty)\.[a-zA-Z0-9_.-]+/i) ||
                   text.match(/\/dev\/tty[a-zA-Z0-9_.-]+/i) ||
                   text.match(/\bCOM\d+\b/i);
  if (devMatch) return devMatch[0];
  if (text.startsWith('/dev/')) return text.split(/[\s()]/)[0];
  return text;
}

// [FR-04/FR-06] Sesi hanya dicari dengan kunci persis; tidak ada fallback ke sesi lain
function findSerialSession(rawPath) {
  const targetPath = normalizeSerialPath(rawPath);
  if (!targetPath || targetPath === 'default') return { targetPath, session: null };
  return { targetPath, session: activeNativeSerialPorts.get(targetPath) || null };
}

// IPC Handler: Open/Connect native hardware Serial COM port
async function performDesktopSerialConnect(arg1, arg2) {
  const portPath = typeof arg1 === 'object' && arg1 !== null ? (arg1.path || arg1.portPath) : arg1;
  const baudRate = typeof arg1 === 'object' && arg1 !== null ? (arg1.baudRate || 9600) : (arg2 || 9600);
  let targetPath = normalizeSerialPath(portPath);
  const targetBaud = Number(baudRate) || 9600;

  if (!targetPath) {
    targetPath = process.platform === 'darwin' ? '/dev/cu.usbserial' : 'COM3';
  }
  if (!/^\/dev\/[a-zA-Z0-9_.-]+$/.test(targetPath) && !/^COM\d+$/i.test(targetPath)) {
    return { success: false, error: `Path port serial tidak valid: ${targetPath}` };
  }

  try {
    if (activeNativeSerialPorts.has(targetPath)) {
      const existing = activeNativeSerialPorts.get(targetPath);
      if (existing) {
        if (existing.port && existing.port.isOpen) {
          try { existing.port.write('\r'); } catch (_) {}
          return { success: true, path: targetPath, baudRate: targetBaud, reused: true };
        }
      }
      try {
        if (existing?.port && typeof existing.port.close === 'function') {
          if (existing.port.isOpen) existing.port.close(() => {});
        }
      } catch (_) {}
      activeNativeSerialPorts.delete(targetPath);
    }

    if (SerialPort) {
      try {
        const port = new SerialPort({
          path: targetPath,
          baudRate: targetBaud,
          autoOpen: false,
        });

        await new Promise((resolve, reject) => {
          port.open((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        try {
          // Some BT modules hang on DTR/RTS set, so we wrap it safely or skip if BT578
          if (!targetPath.toLowerCase().includes('bt578')) {
            port.set({ dtr: true, rts: true }, () => {});
          }
        } catch (_) {}

        port.on('data', (chunk) => {
          const text = chunk.toString('utf8');
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('serial:data', { path: targetPath, text, chunk: text });
          }
        });

        port.on('error', (err) => {
          console.warn(`SerialPort event error on ${targetPath}:`, err?.message || err);
        });

        setTimeout(() => {
          try {
            if (port && port.isOpen) {
              port.write('\r');
            }
          } catch (_) {}
        }, 200);

        activeNativeSerialPorts.set(targetPath, { port });
        return { success: true, path: targetPath, baudRate: targetBaud };
      } catch (err) {
        return { success: false, error: `Gagal terhubung ke port via SerialPort: ${err.message}` };
      }
    }

    return { success: false, error: `Library SerialPort tidak tersedia.` };
  } catch (err) {
    return { success: false, error: `Gagal membuka ${targetPath}: ${err.message}` };
  }
}

ipcMain.handle('serial:connect', async (event, arg1, arg2) => {
  return performDesktopSerialConnect(arg1, arg2);
});

ipcMain.handle('serial:open', async (event, arg1, arg2) => {
  return performDesktopSerialConnect(arg1, arg2);
});

// IPC Handler: Write native data
ipcMain.handle('serial:write', async (event, arg1, arg2) => {
  const portPath = typeof arg1 === 'object' && arg1 !== null ? arg1.path : arg1;
  const text = typeof arg1 === 'object' && arg1 !== null ? arg1.text : arg2;

  const { targetPath, session } = findSerialSession(portPath);
  if (!session) {
    console.warn(`serial:write ditolak: tidak ada sesi aktif untuk "${targetPath || '(kosong)'}"`);
    return false;
  }

  try {
    if (session.port && typeof session.port.write === 'function') {
      if (!session.port.isOpen) return false;
      return new Promise((resolve) => {
        session.port.write(text, (err) => {
          if (err) resolve(false);
          else resolve(true);
        });
      });
    }
  } catch (err) {
    console.warn(`serial:write error on ${targetPath || 'active port'}:`, err.message);
    return false;
  }
  return false;
});

// IPC Handler: Close native serial port
ipcMain.handle('serial:close', async (event, arg1) => {
  const portPath = typeof arg1 === 'object' && arg1 !== null ? arg1.path : arg1;
  const { targetPath, session } = findSerialSession(portPath);

  if (session && targetPath) {
    try {
      if (session.port && typeof session.port.close === 'function') {
        if (session.port.isOpen) {
          // For bluetooth devices, avoid setting DTR/RTS to false if it causes hangs. Use destroy if available.
          if (targetPath.toLowerCase().includes('bt578') && typeof session.port.destroy === 'function') {
             session.port.destroy();
          } else {
             try {
               session.port.set({ dtr: false, rts: false }, () => {
                 session.port.close(() => {});
               });
             } catch (e) {
               session.port.close(() => {});
             }
          }
        }
      }
    } catch (_) {}
    activeNativeSerialPorts.delete(targetPath);
    return { success: true, path: targetPath };
  }
  return { success: true };
});

// ==========================================
// 2. NATIVE SSH CLIENT
// ==========================================

const SSH_ALGORITHMS = {
  kex: [
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'ecdh-sha2-nistp521',
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group14-sha256',
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group-exchange-sha1',
    'diffie-hellman-group1-sha1' // modp2 di-patch manual, lihat patchModp2 (F-23)
  ],
  cipher: [
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-gcm',
    'aes128-gcm@openssh.com',
    'aes256-gcm',
    'aes256-gcm@openssh.com',
    'aes256-cbc',
    'aes192-cbc',
    'aes128-cbc',
    '3des-cbc'
  ],
  serverHostKey: [
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
    'rsa-sha2-512',
    'rsa-sha2-256',
    'ssh-rsa',
    'ssh-dss'
  ],
  hmac: [
    'hmac-sha2-256-etm@openssh.com',
    'hmac-sha2-512-etm@openssh.com',
    'hmac-sha1-etm@openssh.com',
    'hmac-sha2-256',
    'hmac-sha2-512',
    'hmac-sha1',
    'hmac-md5',
    'hmac-sha1-96',
    'hmac-md5-96'
  ]
};

// [SEC-07] Algoritma lemah hanya dipakai kalau user mengaktifkan mode legacy untuk host tsb (CR-002)
const SSH_LEGACY_ONLY = {
  kex: ['diffie-hellman-group-exchange-sha1', 'diffie-hellman-group1-sha1'],
  cipher: ['aes256-cbc', 'aes192-cbc', 'aes128-cbc', '3des-cbc'],
  serverHostKey: ['ssh-dss'],
  hmac: ['hmac-md5', 'hmac-sha1-96', 'hmac-md5-96']
};

function sshAlgorithmsFor(legacy) {
  if (legacy) return SSH_ALGORITHMS;
  const modern = {};
  for (const [kind, list] of Object.entries(SSH_ALGORITHMS)) {
    modern[kind] = list.filter((algo) => !SSH_LEGACY_ONLY[kind].includes(algo));
  }
  return modern;
}

function knownHostsPath() {
  return path.join(app.getPath('userData'), 'ssh_known_hosts.json');
}

function readKnownHosts() {
  try {
    return JSON.parse(fs.readFileSync(knownHostsPath(), 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function updateKnownHost(hostKey, fields) {
  const db = readKnownHosts();
  db[hostKey] = { ...(db[hostKey] || {}), ...fields, updatedAt: new Date().toISOString() };
  fs.writeFileSync(knownHostsPath(), JSON.stringify(db, null, 2), { mode: 0o600 });
}

// Trust On First Use: simpan fingerprint pertama, minta konfirmasi kalau berubah
function createHostVerifier(hostKey) {
  return (fingerprint, verify) => {
    const entry = readKnownHosts()[hostKey];
    if (!entry || !entry.fingerprint) {
      updateKnownHost(hostKey, { fingerprint });
      return verify(true);
    }
    if (entry.fingerprint === fingerprint) return verify(true);
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Putuskan koneksi', 'Percayai host key baru'],
      defaultId: 0,
      cancelId: 0,
      title: 'Host key SSH berubah',
      message: `Host key ${hostKey} BERBEDA dari yang tersimpan.`,
      detail: `Tersimpan (SHA-256): ${entry.fingerprint}\nSekarang (SHA-256): ${fingerprint}\n\nIni bisa berarti perangkat di-reinstall/diganti, ATAU ada serangan man-in-the-middle. Lanjutkan hanya jika kamu yakin.`
    }).then(({ response }) => {
      if (response === 1) updateKnownHost(hostKey, { fingerprint });
      verify(response === 1);
    }).catch(() => verify(false));
  };
}

function isAlgorithmMismatch(err) {
  return /no matching/i.test((err && err.message) || '');
}

// Tanya user apakah host ini boleh memakai algoritma legacy; jawaban diingat per host
async function askEnableLegacy(hostKey, err) {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Batal', 'Aktifkan mode Legacy & coba lagi'],
    defaultId: 0,
    cancelId: 0,
    title: 'Perangkat memakai algoritma SSH lama',
    message: `${hostKey} hanya mendukung algoritma SSH lama yang lemah.`,
    detail: `${err.message}\n\nMode Legacy mengaktifkan diffie-hellman-group1-sha1, diffie-hellman-group-exchange-sha1, cipher CBC/3DES, ssh-dss, dan hmac-md5 khusus untuk host ini. Pakai hanya untuk perangkat lawas di jaringan yang kamu percaya.`
  });
  if (response === 1) updateKnownHost(hostKey, { legacy: true });
  return response === 1;
}

function sshSecurityOptions(host, port) {
  const hostKey = `${host}:${port}`;
  const legacy = Boolean((readKnownHosts()[hostKey] || {}).legacy);
  return { hostKey, legacy, algorithms: sshAlgorithmsFor(legacy), hostHash: 'sha256', hostVerifier: createHostVerifier(hostKey) };
}

// Helper: resolve hostname from output
function parseHostname(raw) {
  if (!raw) return null;
  const match = raw.match(/([a-zA-Z0-9_.-]{2,32})(?:\([a-zA-Z0-9_./-]+\))?\s*[#>]/);
  if (match && match[1]) return match[1];
  const linuxMatch = raw.match(/^[a-zA-Z0-9_.-]+@([a-zA-Z0-9_.-]{2,32})\s*:[^#$]*[#$]/m);
  if (linuxMatch && linuxMatch[1]) return linuxMatch[1];
  return null;
}

// IPC Handler: Test SSH connection with live socket diagnostics
async function sshTest(event, { host, port = 22, username = 'admin', password, timeoutMs = 8000 } = {}) {
  const cleanHost = (host || '127.0.0.1').trim();
  const cleanPort = Number(port) || 22;
  const cleanUser = (username || 'admin').trim();
  const cleanPass = password !== undefined ? resolveSshPassword(cleanUser, cleanHost, cleanPort, String(password)) : undefined;
  const now = () => new Date().toTimeString().split(' ')[0];

  const logs = [];
  logs.push({
    timestamp: now(),
    stage: 'init',
    message: `[Init] Membuka socket TCP ke ${cleanHost}:${cleanPort}...`,
    success: true,
  });

  if (!Client) {
    logs.push({
      timestamp: now(),
      stage: 'error',
      message: '[Error] Modul native ssh2 tidak tersedia di runtime.',
      success: false,
    });
    return {
      success: false,
      host: cleanHost,
      port: cleanPort,
      logs,
      error: 'ssh2 module not found in runtime.',
    };
  }

  const sec = sshSecurityOptions(cleanHost, cleanPort);

  return new Promise((resolve) => {
    const conn = new Client();
    let resolved = false;
    let serverBanner = '';

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { conn.end(); } catch (e) {}
        logs.push({
          timestamp: now(),
          stage: 'timeout',
          message: `[TCP Timeout] Batas waktu (${timeoutMs}ms) tercapai tanpa respon dari ${cleanHost}:${cleanPort}.`,
          success: false,
        });
        resolve({
          success: false,
          host: cleanHost,
          port: cleanPort,
          logs,
          error: `Koneksi timeout ke ${cleanHost}:${cleanPort}`,
          troubleshooting: [
            `Pastikan port ${cleanPort} terbuka di firewall server ${cleanHost}`,
            'Pastikan service sshd berjalan di server target',
            'Periksa koneksi internet / VPN Anda'
          ]
        });
      }
    }, timeoutMs);

    conn.on('banner', (msg) => {
      serverBanner = msg;
      logs.push({
        timestamp: now(),
        stage: 'banner',
        message: `[SSH Banner] Diterima: ${msg.trim()}`,
        success: true,
      });
    });

    conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
      if (prompts && prompts.length > 0) {
        finish([cleanPass || '']);
      } else {
        finish([]);
      }
    });

    conn.on('ready', () => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);

      logs.push({
        timestamp: now(),
        stage: 'auth',
        message: `[Auth OK] Autentikasi SSH untuk '${cleanUser}' berhasil!`,
        success: true,
      });

      const detectedHostname = parseHostname(serverBanner) || cleanHost;
      try { conn.end(); } catch (e) {}

      resolve({
        success: true,
        host: cleanHost,
        port: cleanPort,
        banner: serverBanner,
        detectedHostname,
        logs,
      });
    });

    conn.on('error', async (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      if (!sec.legacy && isAlgorithmMismatch(err) && await askEnableLegacy(sec.hostKey, err)) {
        return resolve(sshTest(event, { host, port, username, password, timeoutMs }));
      }
      logs.push({
        timestamp: now(),
        stage: 'error',
        message: `[SSH Error] ${err.message}`,
        success: false,
      });
      resolve({
        success: false,
        host: cleanHost,
        port: cleanPort,
        logs,
        error: err.message,
        troubleshooting: [
          `Periksa apakah username '${cleanUser}' dan password sudah tepat`,
          `Periksa konfigurasi SSH port ${cleanPort} pada host ${cleanHost}`,
          'Periksa apakah SSH server mengizinkan login dengan password (PasswordAuthentication yes)'
        ]
      });
    });

    try {
      conn.connect({
        host: cleanHost,
        port: cleanPort,
        username: cleanUser,
        password: cleanPass,
        tryKeyboard: true,
        algorithms: sec.algorithms,
        hostHash: sec.hostHash,
        hostVerifier: sec.hostVerifier,
        readyTimeout: timeoutMs,
        keepaliveInterval: 5000,
      });
    } catch (connectErr) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        logs.push({
          timestamp: now(),
          stage: 'error',
          message: `[Exception] ${connectErr.message}`,
          success: false,
        });
        resolve({
          success: false,
          host: cleanHost,
          port: cleanPort,
          logs,
          error: connectErr.message,
        });
      }
    }
  });
}
ipcMain.handle('ssh:test', sshTest);

// IPC Handler: Connect live interactive SSH session stream (PTY)
async function sshConnect(event, arg1, arg2) {
  let devId = 'default-device';
  let options = {};
  if (typeof arg1 === 'object' && arg1 !== null) {
    options = arg1;
    devId = arg1.deviceId || devId;
  } else if (typeof arg1 === 'string') {
    devId = arg1;
    options = arg2 || {};
  }

  let cleanHost = (options.host || '127.0.0.1').trim();
  let cleanPort = Number(options.port) || 22;
  if (cleanHost.includes(':') && !cleanHost.startsWith('http://') && !cleanHost.startsWith('https://') && !cleanHost.startsWith('[')) {
    const parts = cleanHost.split(':');
    cleanHost = parts[0].trim();
    const parsedPort = Number(parts[1]);
    if (!isNaN(parsedPort) && parsedPort >= 1 && parsedPort <= 65535) {
      cleanPort = parsedPort;
    }
  }

  const cleanUser = (options.username || 'admin').trim();
  const cleanPass = options.password !== undefined ? resolveSshPassword(cleanUser, cleanHost, cleanPort, String(options.password)) : undefined;
  const targetId = devId || options.deviceId || `${cleanHost}:${cleanPort}`;
  const rows = Number(options.rows) || 35;
  const cols = Number(options.cols) || 120;

  if (!Client) {
    return { success: false, error: 'ssh2 module not loaded in Desktop runtime' };
  }

  // Close existing session if any
  if (activeSshSessions.has(targetId)) {
    try {
      const existing = activeSshSessions.get(targetId);
      if (existing.stream) existing.stream.end();
      if (existing.client) existing.client.end();
    } catch (e) {}
    activeSshSessions.delete(targetId);
  }

  const sec = sshSecurityOptions(cleanHost, cleanPort);

  return new Promise((resolve) => {
    const conn = new Client();
    let resolved = false;

    conn.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
      if (prompts && prompts.length > 0) {
        finish([cleanPass || '']);
      } else {
        finish([]);
      }
    });

    conn.on('ready', () => {
      conn.shell({ term: 'vt100', rows, cols }, (err, stream) => {
        if (err) {
          if (!resolved) {
            resolved = true;
            try { conn.end(); } catch (e) {}
            resolve({ success: false, error: err.message });
          }
          return;
        }

        activeSshSessions.set(targetId, { client: conn, stream });

        stream.on('data', (data) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ssh:data', {
              deviceId: targetId,
              text: data.toString('utf-8'),
            });
          }
        });

        stream.on('close', () => {
          activeSshSessions.delete(targetId);
          try { conn.end(); } catch (e) {}
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ssh:closed', { deviceId: targetId });
            mainWindow.webContents.send('ssh:close', { deviceId: targetId });
          }
        });

        // Trigger prompt wake up pulse to remote device
        try {
          setTimeout(() => {
            if (stream && stream.writable) {
              stream.write('\r');
            }
          }, 350);
        } catch (e) {}

        if (!resolved) {
          resolved = true;
          resolve({ success: true, deviceId: targetId });
        }
      });
    });

    conn.on('error', async (err) => {
      activeSshSessions.delete(targetId);
      if (!resolved) {
        resolved = true;
        if (!sec.legacy && isAlgorithmMismatch(err) && await askEnableLegacy(sec.hostKey, err)) {
          return resolve(sshConnect(event, arg1, arg2));
        }
        resolve({ success: false, error: err.message });
      }
    });

    try {
      conn.connect({
        host: cleanHost,
        port: cleanPort,
        username: cleanUser,
        password: cleanPass,
        tryKeyboard: true,
        algorithms: sec.algorithms,
        hostHash: sec.hostHash,
        hostVerifier: sec.hostVerifier,
        readyTimeout: 12000,
        keepaliveInterval: 8000,
      });
    } catch (e) {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: e.message });
      }
    }
  });
}
ipcMain.handle('ssh:connect', sshConnect);

// IPC Handler: Write to live interactive SSH stream
ipcMain.handle('ssh:write', async (event, arg1, arg2) => {
  try {
    let devId = 'default-device';
    let text = '';
    if (typeof arg1 === 'object' && arg1 !== null) {
      devId = arg1.deviceId || devId;
      text = String(arg1.text || '');
    } else if (typeof arg1 === 'string' && arg2 !== undefined) {
      devId = arg1;
      text = String(arg2);
    } else if (typeof arg1 === 'string') {
      text = arg1;
    }
    // [FR-04] Hanya kirim ke sesi milik deviceId ini; jangan pernah dialihkan ke sesi lain
    const session = activeSshSessions.get(devId);
    if (!session || !session.stream) {
      throw new Error('Sesi SSH untuk perangkat ini sudah tertutup atau belum terhubung.');
    }
    session.stream.write(text);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Close SSH session
ipcMain.handle('ssh:close', async (event, arg1) => {
  try {
    const devId = (typeof arg1 === 'object' && arg1 !== null ? arg1.deviceId : arg1) || 'default-device';
    const session = activeSshSessions.get(devId);
    if (session) {
      if (session.stream) session.stream.end();
      if (session.client) session.client.end();
      activeSshSessions.delete(devId);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC Handler: Execute single SSH command
async function sshExec(event, { host, port = 22, username = 'admin', password, command } = {}) {
  if (!Client) return { success: false, error: 'ssh2 not loaded' };
  const cleanHost = String(host || '').trim();
  const cleanPort = Number(port) || 22;
  if (!cleanHost || typeof command !== 'string') return { success: false, error: 'INVALID_ARGS' };
  const sec = sshSecurityOptions(cleanHost, cleanPort);
  return new Promise((resolve) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          try { conn.end(); } catch (e) {}
          return resolve({ success: false, error: err.message });
        }
        let output = '';
        stream.on('data', (data) => { output += data.toString('utf-8'); });
        stream.stderr.on('data', (data) => { output += data.toString('utf-8'); });
        stream.on('close', () => {
          try { conn.end(); } catch (e) {}
          resolve({ success: true, output });
        });
      });
    });
    conn.on('error', async (err) => {
      if (!sec.legacy && isAlgorithmMismatch(err) && await askEnableLegacy(sec.hostKey, err)) {
        return resolve(sshExec(event, { host, port, username, password, command }));
      }
      resolve({ success: false, error: err.message });
    });
    try {
      conn.connect({
        host: cleanHost,
        port: cleanPort,
        username: String(username || 'admin').trim(),
        password: password ? resolveSshPassword(username, cleanHost, cleanPort, String(password)) : undefined,
        tryKeyboard: true,
        algorithms: sec.algorithms,
        hostHash: sec.hostHash,
        hostVerifier: sec.hostVerifier,
        readyTimeout: 8000,
      });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}
ipcMain.handle('ssh:exec', sshExec);

// ==========================================
// 3. SECRET STORAGE (Keychain / DPAPI via safeStorage) [SEC-06]
// ==========================================
const SECRET_NAMES = new Set(['gemini', 'openai', 'anthropic', 'deepseek']);
const SSH_SECRET_RE = /^ssh:[^\s@]{1,64}@[a-zA-Z0-9.:\[\]_-]{1,255}:\d{1,5}$/;
const SECRET_PLACEHOLDER_MARK = '••••••••';
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-5-5';

function isAllowedSecretName(name) {
  return typeof name === 'string' && (SECRET_NAMES.has(name) || SSH_SECRET_RE.test(name));
}

// Renderer menyimpan placeholder bertopeng; nilai asli hanya ada di Keychain
function isSecretPlaceholder(value) {
  return typeof value === 'string' && value.includes(SECRET_PLACEHOLDER_MARK);
}

// [SEC-06] Password perangkat: placeholder dari renderer → ambil dari Keychain
function resolveSshPassword(username, host, port, password) {
  if (!isSecretPlaceholder(password)) return password;
  return getSecret(`ssh:${String(username || 'admin').trim()}@${String(host).trim()}:${Number(port) || 22}`) || '';
}

function secretsFilePath() {
  return path.join(app.getPath('userData'), 'secrets.json');
}

function readSecretsFile() {
  try {
    return JSON.parse(fs.readFileSync(secretsFilePath(), 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function writeSecretsFile(data) {
  fs.writeFileSync(secretsFilePath(), JSON.stringify(data, null, 2), { mode: 0o600 });
}

function setSecret(name, value) {
  if (!isAllowedSecretName(name)) throw new Error('Nama secret tidak dikenal.');
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Enkripsi OS (Keychain/DPAPI) tidak tersedia; secret tidak disimpan.');
  const data = readSecretsFile();
  data[name] = safeStorage.encryptString(String(value)).toString('base64');
  writeSecretsFile(data);
}

function getSecret(name) {
  const data = readSecretsFile();
  if (!data[name] || !safeStorage.isEncryptionAvailable()) return '';
  try {
    return safeStorage.decryptString(Buffer.from(data[name], 'base64'));
  } catch (_) {
    return '';
  }
}

function deleteSecret(name) {
  const data = readSecretsFile();
  delete data[name];
  writeSecretsFile(data);
}

ipcMain.handle('secrets:set', async (event, { name, value } = {}) => {
  try {
    if (typeof value !== 'string' || !value.trim() || value.length > 4096) throw new Error('Nilai secret tidak valid.');
    setSecret(name, value.trim());
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('secrets:has', async (event, { name } = {}) => {
  return { success: true, exists: isAllowedSecretName(name) && Boolean(getSecret(name)) };
});

ipcMain.handle('secrets:delete', async (event, { name } = {}) => {
  if (!isAllowedSecretName(name)) return { success: false, error: 'Nama secret tidak dikenal.' };
  deleteSecret(name);
  return { success: true };
});

// [SEC-05] Samarkan password / secret / community / PSK sebelum output terminal dikirim ke AI
function redactSecrets(text) {
  if (!text) return text;
  return String(text)
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '-----PRIVATE KEY DISAMARKAN-----')
    .replace(/\b(password|passwd|passphrase|secret|key-string|pre-shared-key|psk|community|authentication-key|auth-key|encrypted-password|api[-_]?key|token)(\s*=\s*|\s+(?:ENC\s+)?(?:(?:ascii|hex)\s+)?(?:\d{1,2}\s+)?)("[^"]*"|\S+)/gi, '$1$2***')
    .replace(/\b(isakmp\s+key)(\s+(?:\d{1,2}\s+)?)(\S+)/gi, '$1$2***')
    .replace(/\b(key)(\s+\d{1,2}\s+)(\S+)/gi, '$1$2***');
}

// ==========================================
// 4. DESKTOP NATIVE AI CHAT & KEY VALIDATOR
// ==========================================
ipcMain.handle('ai:chat', async (event, payload) => {
  const { message, brand, model, selectedModel, userModel, history, userApiKey, apiKey: payloadApiKey, userProvider, provider: payloadProvider } = payload || {};
  const terminalContext = redactSecrets(payload && payload.terminalContext);
  const rawProvider = (payloadProvider || userProvider || 'gemini').toLowerCase();
  const provider = rawProvider === 'claude' ? 'anthropic' : rawProvider;
  // Key dari penyimpanan terenkripsi; key dari renderer hanya dipakai bila bukan placeholder
  const rendererKey = String(payloadApiKey || userApiKey || '').trim();
  const apiKey = ((rendererKey && !isSecretPlaceholder(rendererKey) ? rendererKey : '') || getSecret(provider) || '').trim();

  // Prompt bersama untuk semua provider
  const currentText = terminalContext ? `[Buffer Terminal Perangkat Terkini]\n${terminalContext}\n\nPertanyaan Engineer: ${message}` : message;
  const brandUpper = (brand || 'cisco').toUpperCase();
  let syntaxGuidance = '';
  if (brandUpper.includes('LINUX') || brandUpper.includes('UBUNTU') || brandUpper.includes('DEBIAN') || brandUpper.includes('CENTOS') || brandUpper.includes('REDHAT') || brandUpper.includes('SERVER')) {
    syntaxGuidance = '\nATURAN SINTAKS PERINTAH (LINUX / UNIX SERVER):\n- Gunakan perintah Linux standar seperti: `ip a`, `ip route`, `systemctl status <service>`, `cat /etc/netplan/*.yaml`, `df -h`, `free -m`, `uname -a`, `ss -tulpn`, `journalctl -u <service> -n 50`.\n- JANGAN gunakan sintaks Cisco atau RouterOS pada perangkat Linux.';
  } else if (brandUpper.includes('MIKROTIK') || brandUpper.includes('ROUTEROS')) {
    syntaxGuidance = '\nATURAN SINTAKS PERINTAH (MIKROTIK ROUTEROS):\n- Gunakan perintah RouterOS berawalan garis miring seperti: `/ip address print`, `/ip route print`, `/interface print`, `/system resource print`, `/ip firewall nat print`, `/tool ping address=8.8.8.8 count=4`.\n- JANGAN gunakan sintaks Cisco atau Linux.';
  } else if (brandUpper.includes('FORTINET') || brandUpper.includes('FORTIGATE') || brandUpper.includes('FORTIOS')) {
    syntaxGuidance = '\nATURAN SINTAKS PERINTAH (FORTINET FORTIOS):\n- Gunakan perintah FortiOS seperti: `get system status`, `get system interface`, `get router info routing-table all`, `diagnose ip address list`, `diagnose sys top`, `execute ping 8.8.8.8`.';
  } else if (brandUpper.includes('JUNIPER') || brandUpper.includes('JUNOS')) {
    syntaxGuidance = '\nATURAN SINTAKS PERINTAH (JUNIPER JUNOS):\n- Gunakan perintah Junos seperti: `show interfaces terse`, `show route`, `show chassis hardware`, `show configuration`, `ping 8.8.8.8 count 4`.';
  } else if (brandUpper.includes('HUAWEI') || brandUpper.includes('VRP')) {
    syntaxGuidance = '\nATURAN SINTAKS PERINTAH (HUAWEI VRP):\n- Gunakan perintah VRP seperti: `display ip interface brief`, `display current-configuration`, `display ip routing-table`, `display version`.';
  } else {
    syntaxGuidance = '\nATURAN SINTAKS PERINTAH (CISCO IOS / IOS-XE / NX-OS):\n- Gunakan perintah Cisco IOS seperti: `show ip interface brief`, `show running-config`, `show ip route`, `show version`, `show vlan brief`, `ping 8.8.8.8`.';
  }

  const systemInstructionText = `Anda adalah "69 AI Co-Pilot", asisten ahli teknis Jaringan Komputer, Cisco CCNP/CCIE, Fortinet NSE 7, MikroTik MTCINE, Juniper JNCIP, dan Senior Linux System Administrator.
Target Perangkat: ${brandUpper} (${model || 'Universal Device'}).${syntaxGuidance}
Berikan jawaban teknis to-the-point dengan tabel markdown dan blok kode CLI markdown mandiri per perintah agar langsung dapat dieksekusi di terminal.`;

  const chatMessages = [];
  if (history && Array.isArray(history)) {
    for (const h of history) chatMessages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content || '') });
  }
  chatMessages.push({ role: 'user', content: currentText });

  // Tier 1: Direct Provider API with User-provided API Key
  if (provider === 'gemini' && apiKey) {
    const candidateModels = [
      userModel || 'gemini-3.8-flash',
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite'
    ].filter((v, i, a) => a.indexOf(v) === i);
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        contents.push({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: currentText }] });


    for (const m of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemInstructionText }]
            }
          })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return { success: true, text, source: `Google Gemini (${m}) [Desktop Direct]` };
          }
        }
      } catch (e) {}
    }
  }

  if ((provider === 'openai' || provider === 'deepseek') && apiKey) {
    const isDeepSeek = provider === 'deepseek';
    try {
      const messages = [{ role: 'system', content: systemInstructionText }, ...chatMessages];
      const res = await fetch(isDeepSeek ? 'https://api.deepseek.com/chat/completions' : 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini', messages, temperature: 0.3 })
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, text: data.choices?.[0]?.message?.content || '', source: isDeepSeek ? 'DeepSeek (deepseek-chat) [Desktop Direct]' : 'OpenAI ChatGPT (gpt-4o-mini) [Desktop Direct]' };
      }
    } catch (e) {}
  }

  if (provider === 'anthropic' && apiKey) {
    // Model pilihan user dulu; kalau sudah tidak tersedia, pakai model default terbaru
    const anthropicModels = [/^claude-/.test(String(userModel || '')) ? userModel : null, ANTHROPIC_DEFAULT_MODEL]
      .filter((v, i, a) => v && a.indexOf(v) === i);
    for (const anthropicModel of anthropicModels) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: anthropicModel, max_tokens: 2500, system: systemInstructionText, messages: chatMessages })
        });
        if (res.ok) {
          const data = await res.json();
          return { success: true, text: data.content?.[0]?.text || '', source: `Anthropic Claude (${anthropicModel}) [Desktop Direct]` };
        }
      } catch (e) {}
    }
  }

  // [SEC-04] Relay cloud (Cloud Run pihak ketiga / localhost:3000) dihapus: API key dan isi terminal
  // hanya boleh dikirim ke endpoint resmi provider di atas.

  // Tier 2: Built-in Multi-Vendor Network Intelligence & Diagnostic Engine
  const targetBrand = (brand || 'cisco').toUpperCase();
  const targetModel = model || 'Universal';
  const targetBrandLower = (brand || 'cisco').toLowerCase();
  const msgLower = (message || '').toLowerCase();
  const rawTerminal = (terminalContext || '').trim();
  const cb = String.fromCharCode(96, 96, 96);
  const cliLang = targetBrandLower.includes('forti') ? 'fortios' : targetBrandLower.includes('mikrotik') ? 'routeros' : targetBrandLower.includes('juniper') ? 'junos' : targetBrandLower.includes('linux') || targetBrandLower.includes('ubuntu') || targetBrandLower.includes('debian') || targetBrandLower.includes('server') ? 'bash' : 'cisco';

  // 0. VLAN & Switching Intent
  if (/\b(?:vlan|trunk|access\s*port|switchport|802\.1q|bridge\s*vlan)\b/i.test(msgLower)) {
    let vlanCmds = [];
    if (targetBrandLower.includes('mikrotik')) {
      vlanCmds = [
        '##### Langkah 1: Buat VLAN Interface\n' + cb + 'routeros\n/interface vlan add name=vlan10 vlan-id=10 interface=ether1\n/interface vlan add name=vlan20 vlan-id=20 interface=ether1\n' + cb,
        '##### Langkah 2: Berikan IP Address pada VLAN\n' + cb + 'routeros\n/ip address add address=192.168.10.1/24 interface=vlan10\n/ip address add address=192.168.20.1/24 interface=vlan20\n' + cb,
        '##### Langkah 3: Verifikasi status VLAN\n' + cb + 'routeros\n/interface vlan print\n/interface bridge vlan print\n' + cb
      ];
    } else if (targetBrandLower.includes('linux')) {
      vlanCmds = [
        '##### Langkah 1: Buat Sub-interface VLAN 802.1Q\n' + cb + 'bash\nsudo ip link add link eth0 name eth0.10 type vlan id 10\nsudo ip link set dev eth0.10 up\n' + cb,
        '##### Langkah 2: Berikan IP Address\n' + cb + 'bash\nsudo ip addr add 192.168.10.1/24 dev eth0.10\n' + cb,
        '##### Langkah 3: Verifikasi antarmuka VLAN\n' + cb + 'bash\nip -d link show eth0.10\n' + cb
      ];
    } else if (targetBrandLower.includes('forti')) {
      vlanCmds = [
        '##### Langkah 1: Konfigurasi Interface VLAN FortiOS\n' + cb + 'fortios\nconfig system interface\n    edit "VLAN_10"\n        set vdom "root"\n        set ip 192.168.10.1 255.255.255.0\n        set allowaccess ping https ssh\n        set interface "port1"\n        set vlanid 10\n    next\nend\n' + cb,
        '##### Langkah 2: Verifikasi status VLAN\n' + cb + 'fortios\nget system interface | grep -A 8 "VLAN_10"\n' + cb
      ];
    } else {
      vlanCmds = [
        '##### Langkah 1: Buat Database VLAN\n' + cb + 'cisco\nconfigure terminal\nvlan 10\n name SALES\nvlan 20\n name ENGINEERING\nexit\n' + cb,
        '##### Langkah 2: Set Mode Access Port ke Host\n' + cb + 'cisco\ninterface GigabitEthernet0/1\n switchport mode access\n switchport access vlan 10\n no shutdown\nexit\n' + cb,
        '##### Langkah 3: Set Mode Trunk Uplink ke Switch/Router Lain\n' + cb + 'cisco\ninterface GigabitEthernet0/24\n switchport trunk encapsulation dot1q\n switchport mode trunk\n switchport trunk allowed vlan 10,20\n no shutdown\nexit\n' + cb,
        '##### Langkah 4: Verifikasi status VLAN & Trunk\n' + cb + 'cisco\nshow vlan brief\nshow interfaces trunk\n' + cb
      ];
    }

    return {
      success: true,
      text: [
        '### 🏷️ Panduan Konfigurasi & Verifikasi VLAN — ' + targetBrand + ' (' + targetModel + ')',
        '',
        'Berikut adalah langkah-langkah konfigurasi VLAN standar untuk **' + targetBrand + '**:',
        '',
        vlanCmds.join('\n\n'),
        '',
        '💡 *Klik tombol **"Eksekusi ke Terminal"** di atas untuk menerapkan perintah secara interaktif.*'
      ].join('\n'),
      source: '69 AI Desktop Intelligence Engine'
    };
  }

  // 1. NAT & Port Forwarding Intent
  if (/\b(?:nat|pat|masquerade|port\s*forward|port\s*forwarding|overload)\b/i.test(msgLower)) {
    let natCmds = [];
    if (targetBrandLower.includes('mikrotik')) {
      natCmds = [
        '##### Langkah 1: Konfigurasi NAT Masquerade (Internet Sharing)\n' + cb + 'routeros\n/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="NAT Internet"\n' + cb,
        '##### Langkah 2: Konfigurasi Port Forwarding (Dst-NAT)\n' + cb + 'routeros\n/ip firewall nat add chain=dstnat protocol=tcp dst-port=8080 action=dst-nat to-addresses=192.168.1.100 to-ports=80 in-interface=ether1 comment="Port Forward Web"\n' + cb,
        '##### Langkah 3: Verifikasi aturan NAT\n' + cb + 'routeros\n/ip firewall nat print detail\n' + cb
      ];
    } else if (targetBrandLower.includes('linux')) {
      natCmds = [
        '##### Langkah 1: Aktifkan IP Forwarding di Kernel\n' + cb + 'bash\nsudo sysctl -w net.ipv4.ip_forward=1\n' + cb,
        '##### Langkah 2: Buat Aturan NAT Masquerade IPTables\n' + cb + 'bash\nsudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE\n' + cb,
        '##### Langkah 3: Verifikasi aturan NAT\n' + cb + 'bash\nsudo iptables -t nat -L -n -v\n' + cb
      ];
    } else {
      natCmds = [
        '##### Langkah 1: Tentukan Interface Inside dan Outside\n' + cb + 'cisco\nconfigure terminal\ninterface GigabitEthernet0/0\n ip nat outside\nexit\ninterface GigabitEthernet0/1\n ip nat inside\nexit\n' + cb,
        '##### Langkah 2: Buat Access-List & Dynamic NAT Overload (PAT)\n' + cb + 'cisco\naccess-list 1 permit 192.168.1.0 0.0.0.255\nip nat inside source list 1 interface GigabitEthernet0/0 overload\nexit\n' + cb,
        '##### Langkah 3: Verifikasi translasi NAT aktif\n' + cb + 'cisco\nshow ip nat translations\nshow ip nat statistics\n' + cb
      ];
    }

    return {
      success: true,
      text: [
        '### 🔄 Panduan Konfigurasi NAT & Port Forwarding — ' + targetBrand + ' (' + targetModel + ')',
        '',
        'Berikut adalah panduan konfigurasi NAT pada **' + targetBrand + '**:',
        '',
        natCmds.join('\n\n')
      ].join('\n'),
      source: '69 AI Desktop Intelligence Engine'
    };
  }

  // 2. Check if user asks about IP addresses or interfaces (Strict boundary check)
  const isIpQuery = /\b(?:ip|alamat\s*ip|ip\s*address|ipv4|ipv6|subnet|netmask|interface|antarmuka|status\s*port|port\s*aktif|nic)\b/i.test(msgLower) &&
    !/\b(?:tips|tipe|skrip|script|prinsip|arsip|mirip|partisipasi|equipment|tulisan|deskripsi)\b/i.test(msgLower);
  if (isIpQuery) {
    // Check if terminal buffer contains genuine Linux/Cisco/MikroTik interface output
    const lines = rawTerminal.split('\n');
    const genuineInterfaces = [];
    
    // Linux 'ip -br a' / 'ip a' detection
    for (const l of lines) {
      const brMatch = l.match(/^([a-zA-Z0-9_\-\.\@]+)\s+(UP|DOWN|UNKNOWN)\s+([0-9\.\/]+)?/i);
      if (brMatch && !l.includes('Protocol') && !l.includes('Interface') && !l.includes('show')) {
        genuineInterfaces.push({ name: brMatch[1], state: brMatch[2].toUpperCase(), ip: brMatch[3] || 'Belum Terpasang' });
      }
      const ciscoMatch = l.match(/^([A-Za-z0-9\/\.\-]+)\s+([0-9\.]+|unassigned)\s+(?:YES|NO)\s+(?:manual|NVRAM|DHCP|unset)\s+(up|down|administratively down)\s+(up|down)/i);
      if (ciscoMatch) {
        genuineInterfaces.push({ name: ciscoMatch[1], state: (ciscoMatch[3].toLowerCase() === 'up' && ciscoMatch[4].toLowerCase() === 'up') ? 'UP' : 'DOWN', ip: ciscoMatch[2] !== 'unassigned' ? ciscoMatch[2] : 'Unassigned' });
      }
    }

    if (genuineInterfaces.length > 0) {
      const assigned = genuineInterfaces.filter(i => i.ip !== 'Belum Terpasang' && i.ip !== 'Unassigned');
      const tableRows = genuineInterfaces.map(i => '| `' + i.name + '` | **' + i.ip + '** | ' + (i.state === 'UP' ? '🟢 UP' : '🔴 DOWN') + ' | Antarmuka Jaringan |');
      const tableMd = ['| Interface | Alamat IP | Status Link | Tipe |', '| :--- | :--- | :--- | :--- |', ...tableRows].join('\n');

      return {
        success: true,
        text: [
          '### 🌐 Ringkasan IP Address & Interface — ' + targetBrand + ' (' + targetModel + ')',
          '',
          '**Status:** 🟢 **' + assigned.length + ' IP Terpasang** pada **' + genuineInterfaces.length + ' Interface**',
          '',
          tableMd,
          '',
          '#### 📌 Temuan Kunci:',
          '• **Total Antarmuka:** ' + genuineInterfaces.length + ' port (' + genuineInterfaces.filter(i => i.state === 'UP').length + ' UP, ' + genuineInterfaces.filter(i => i.state !== 'UP').length + ' DOWN)',
          assigned.length > 0 ? '• **IP Aktif:** ' + assigned.map(i => '`' + i.name + '` (' + i.ip + ')').join(', ') : '• Belum ada IP Layer 3 terpasang pada port fisik.',
          '',
          '#### 🛠️ Perintah Verifikasi Tambahan:',
          cb + cliLang,
          targetBrandLower.includes('linux') || targetBrandLower.includes('server') ? 'ip route show' : targetBrandLower.includes('mikrotik') ? '/ip route print' : targetBrandLower.includes('forti') ? 'get router info routing-table all' : 'show ip route',
          cb
        ].join('\n'),
        source: '69 AI Desktop Intelligence Engine'
      };
    }

    // No IP data in terminal yet -> Provide exact CLI command blocks
    let discoveryCmds = [];
    if (targetBrandLower.includes('linux') || targetBrandLower.includes('ubuntu') || targetBrandLower.includes('debian') || targetBrandLower.includes('server')) {
      discoveryCmds = [
        '##### Langkah 1: Periksa ringkasan seluruh IP address & status port\n' + cb + 'bash\nip -br a\n' + cb,
        '##### Langkah 2: Periksa detail MAC address dan subnet\n' + cb + 'bash\nip a\n' + cb,
        '##### Langkah 3: Periksa default gateway keluar\n' + cb + 'bash\nip route show\n' + cb
      ];
    } else if (targetBrandLower.includes('mikrotik') || targetBrandLower.includes('routeros')) {
      discoveryCmds = [
        '##### Langkah 1: Periksa daftar IP address MikroTik\n' + cb + 'routeros\n/ip address print\n' + cb,
        '##### Langkah 2: Periksa status fisik interface\n' + cb + 'routeros\n/interface print\n' + cb,
        '##### Langkah 3: Periksa tabel rute dan gateway\n' + cb + 'routeros\n/ip route print\n' + cb
      ];
    } else if (targetBrandLower.includes('fortinet') || targetBrandLower.includes('fortigate') || targetBrandLower.includes('fortios')) {
      discoveryCmds = [
        '##### Langkah 1: Periksa daftar seluruh IP address\n' + cb + 'fortios\ndiagnose ip address list\n' + cb,
        '##### Langkah 2: Periksa status fisik port dan hardware link\n' + cb + 'fortios\nget system interface\n' + cb
      ];
    } else if (targetBrandLower.includes('juniper') || targetBrandLower.includes('junos')) {
      discoveryCmds = [
        '##### Langkah 1: Periksa status ringkas interface Junos\n' + cb + 'junos\nshow interfaces terse\n' + cb,
        '##### Langkah 2: Periksa tabel routing\n' + cb + 'junos\nshow route\n' + cb
      ];
    } else if (targetBrandLower.includes('huawei') || targetBrandLower.includes('vrp')) {
      discoveryCmds = [
        '##### Langkah 1: Periksa ringkasan IP interface\n' + cb + 'cisco\ndisplay ip interface brief\n' + cb,
        '##### Langkah 2: Periksa tabel routing\n' + cb + 'cisco\ndisplay ip routing-table\n' + cb
      ];
    } else {
      discoveryCmds = [
        '##### Langkah 1: Periksa daftar IP dan status antarmuka\n' + cb + 'cisco\nshow ip interface brief\n' + cb,
        '##### Langkah 2: Periksa status fisik kecepatan dan duplex port\n' + cb + 'cisco\nshow interfaces status\n' + cb,
        '##### Langkah 3: Periksa tabel routing subnet langsung\n' + cb + 'cisco\nshow ip route connected\n' + cb
      ];
    }

    return {
      success: true,
      text: [
        '### 🔍 Panduan Pemeriksaan IP Address — ' + targetBrand + ' (' + targetModel + ')',
        '',
        'Gunakan perintah CLI standar **' + targetBrand + '** berikut untuk menampilkan alamat IP dan status antarmuka:',
        '',
        discoveryCmds.join('\n\n'),
        '',
        '💡 *Klik tombol **"Eksekusi ke Terminal"** atau **"Exec & Analisa"** pada setiap blok perintah di atas untuk menjalankannya langsung ke terminal.*'
      ].join('\n'),
      source: '69 AI Desktop Intelligence Engine'
    };
  }

  // 2. Check if user asks about routing, gateway, bgp, ospf
  const isRouteQuery = msgLower.includes('rout') || msgLower.includes('gateway') || msgLower.includes('jalur') || msgLower.includes('bgp') || msgLower.includes('ospf');
  if (isRouteQuery) {
    let routeCmds = [];
    if (targetBrandLower.includes('linux') || targetBrandLower.includes('server')) {
      routeCmds = [
        '##### Langkah 1: Periksa tabel routing kernel lengkap\n' + cb + 'bash\nip route show\n' + cb,
        '##### Langkah 2: Periksa default gateway aktif\n' + cb + 'bash\nip route show default\n' + cb,
        '##### Langkah 3: Uji konektivitas gateway keluar\n' + cb + 'bash\nping -c 4 8.8.8.8\n' + cb
      ];
    } else if (targetBrandLower.includes('mikrotik')) {
      routeCmds = [
        '##### Langkah 1: Periksa tabel routing MikroTik\n' + cb + 'routeros\n/ip route print detail\n' + cb,
        '##### Langkah 2: Cek sesi BGP\n' + cb + 'routeros\n/routing bgp session print\n' + cb
      ];
    } else if (targetBrandLower.includes('forti')) {
      routeCmds = [
        '##### Langkah 1: Tampilkan tabel routing FortiOS\n' + cb + 'fortios\nget router info routing-table all\n' + cb,
        '##### Langkah 2: Uji gateway internet\n' + cb + 'fortios\nexecute ping 8.8.8.8\n' + cb
      ];
    } else {
      routeCmds = [
        '##### Langkah 1: Tampilkan tabel routing IPv4 (RIB)\n' + cb + 'cisco\nshow ip route\n' + cb,
        '##### Langkah 2: Cek peering BGP atau tetangga OSPF\n' + cb + 'cisco\nshow ip bgp summary\nshow ip ospf neighbor\n' + cb
      ];
    }

    return {
      success: true,
      text: [
        '### 🛣️ Panduan Pemeriksaan Tabel Routing & Gateway — ' + targetBrand + ' (' + targetModel + ')',
        '',
        'Gunakan perintah berikut untuk memverifikasi jalur routing:',
        '',
        routeCmds.join('\n\n')
      ].join('\n'),
      source: '69 AI Desktop Intelligence Engine'
    };
  }

  // 3. General Multi-Vendor CLI Discovery
  let vendorCmds = [];
  if (targetBrandLower.includes('linux') || targetBrandLower.includes('ubuntu') || targetBrandLower.includes('debian') || targetBrandLower.includes('server')) {
    vendorCmds = [
      '##### Langkah 1: Pengecekan IP address dan antarmuka\n' + cb + 'bash\nip -br a\n' + cb,
      '##### Langkah 2: Verifikasi routing table dan gateway\n' + cb + 'bash\nip route\n' + cb,
      '##### Langkah 3: Periksa beban CPU & RAM sistem\n' + cb + 'bash\ntop -b -n 1 | head -n 20\nfree -h\n' + cb,
      '##### Langkah 4: Periksa socket port yang sedang listening\n' + cb + 'bash\nss -tulpn\n' + cb
    ];
  } else if (targetBrandLower.includes('mikrotik') || targetBrandLower.includes('routeros')) {
    vendorCmds = [
      '##### Langkah 1: Pengecekan IP address\n' + cb + 'routeros\n/ip address print\n' + cb,
      '##### Langkah 2: Verifikasi status interface\n' + cb + 'routeros\n/interface print\n' + cb,
      '##### Langkah 3: Verifikasi routing table\n' + cb + 'routeros\n/ip route print\n' + cb,
      '##### Langkah 4: Periksa resource CPU dan RAM\n' + cb + 'routeros\n/system resource print\n' + cb
    ];
  } else if (targetBrandLower.includes('fortinet') || targetBrandLower.includes('fortigate') || targetBrandLower.includes('fortios')) {
    vendorCmds = [
      '##### Langkah 1: Status sistem dan resource\n' + cb + 'fortios\nget system status\n' + cb,
      '##### Langkah 2: Status interface dan IP address\n' + cb + 'fortios\nget system interface\n' + cb,
      '##### Langkah 3: Routing table\n' + cb + 'fortios\nget router info routing-table all\n' + cb
    ];
  } else if (targetBrandLower.includes('juniper') || targetBrandLower.includes('junos')) {
    vendorCmds = [
      '##### Langkah 1: Status ringkas interface\n' + cb + 'junos\nshow interfaces terse\n' + cb,
      '##### Langkah 2: Routing table\n' + cb + 'junos\nshow route\n' + cb,
      '##### Langkah 3: Status hardware chassis\n' + cb + 'junos\nshow chassis hardware\n' + cb
    ];
  } else if (targetBrandLower.includes('huawei') || targetBrandLower.includes('vrp')) {
    vendorCmds = [
      '##### Langkah 1: Status ringkas interface IP\n' + cb + 'cisco\ndisplay ip interface brief\n' + cb,
      '##### Langkah 2: Routing table\n' + cb + 'cisco\ndisplay ip routing-table\n' + cb,
      '##### Langkah 3: Konfigurasi aktif saat ini\n' + cb + 'cisco\ndisplay current-configuration\n' + cb
    ];
  } else {
    vendorCmds = [
      '##### Langkah 1: Pengecekan status dan alokasi IP interface\n' + cb + 'cisco\nshow ip interface brief\n' + cb,
      '##### Langkah 2: Verifikasi routing table dan gateway\n' + cb + 'cisco\nshow ip route\n' + cb,
      '##### Langkah 3: Verifikasi status port fisik\n' + cb + 'cisco\nshow interfaces status\n' + cb
    ];
  }

  return {
    success: true,
    text: [
      '### 💡 Panduan Diagnosa Jaringan — ' + targetBrand + ' (' + targetModel + ')',
      '',
      'Berikut adalah perintah diagnosa CLI operasional yang disesuaikan untuk perangkat **' + targetBrand + '**:',
      '',
      vendorCmds.join('\n\n'),
      '',
      '💡 *Klik tombol **"Eksekusi ke Terminal"** atau **"Exec & Analisa"** pada setiap blok perintah di atas untuk menjalankannya langsung ke terminal.*'
    ].join('\n'),
    source: '69 AI Built-in Intelligence Engine'
  };
});

// Key yang sudah terbukti valid disimpan terenkripsi agar tidak perlu disimpan di localStorage [SEC-06]
function storeValidatedKey(provider, key) {
  try {
    setSecret(provider, key);
    return true;
  } catch (err) {
    console.warn('Gagal menyimpan API key terenkripsi:', err.message);
    return false;
  }
}

ipcMain.handle('ai:test-key', async (event, { provider = 'gemini', apiKey }) => {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'API key kosong' };
  }
  const cleanKey = apiKey.trim();

  if (provider === 'gemini') {
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    for (const m of candidateModels) {
      try {
        const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + encodeURIComponent(cleanKey);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping. Reply OK' }] }] })
        });
        if (res.ok) {
          const data = await res.json();
          const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (txt) {
            return { success: true, message: 'Google Gemini (' + m + ') siap digunakan!', model: m, stored: storeValidatedKey('gemini', cleanKey) };
          }
        }
      } catch (e) {}
    }
    return { success: false, error: 'Gagal memvalidasi Gemini API Key.' };
  }

  if (provider === 'openai') {
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: 'Bearer ' + cleanKey }
      });
      if (res.ok) return { success: true, message: 'OpenAI API terhubung!', stored: storeValidatedKey('openai', cleanKey) };
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error?.message || 'OpenAI Key tidak valid' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  if (provider === 'deepseek') {
    try {
      const res = await fetch('https://api.deepseek.com/models', { headers: { Authorization: 'Bearer ' + cleanKey } });
      if (res.ok) return { success: true, message: 'DeepSeek API terhubung!', stored: storeValidatedKey('deepseek', cleanKey) };
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error?.message || 'DeepSeek Key tidak valid' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  if (provider === 'anthropic' || provider === 'claude') {
    try {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': cleanKey, 'anthropic-version': '2023-06-01' }
      });
      if (res.ok) return { success: true, message: 'Anthropic Claude API terhubung!', stored: storeValidatedKey('anthropic', cleanKey) };
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error?.message || 'Anthropic Key tidak valid' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  return { success: false, error: 'Provider tidak dikenal.' };
});

// System Network Interface Discovery (Real-time detection for Traffic Generator & Packet Replay)
ipcMain.handle('network:interfaces', async () => {
  try {
    const rawInterfaces = os.networkInterfaces();
    const result = [];
    const hwMap = {};
    let defaultGatewayDev = null;

    if (process.platform === 'darwin') {
      try {
        const hwOut = execSync('networksetup -listallhardwareports', { timeout: 1500, encoding: 'utf8' });
        const lines = hwOut.split('\n');
        let curPort = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('Hardware Port:')) {
            curPort = trimmed.replace('Hardware Port:', '').trim();
          } else if (trimmed.startsWith('Device:') && curPort) {
            const curDev = trimmed.replace('Device:', '').trim();
            if (curDev) {
              hwMap[curDev] = curPort;
            }
            curPort = '';
          }
        }
      } catch (_) {}

      try {
        const routeOut = execSync('route -n get default', { timeout: 1000, encoding: 'utf8' });
        const rLines = routeOut.split('\n');
        for (const rLine of rLines) {
          const rt = rLine.trim();
          if (rt.startsWith('interface:')) {
            defaultGatewayDev = rt.replace('interface:', '').trim();
            break;
          }
        }
      } catch (_) {}
    } else if (process.platform === 'linux') {
      try {
        const routeOut = execSync('ip route show default', { timeout: 1000, encoding: 'utf8' });
        const parts = routeOut.trim().split(/\s+/);
        const devIdx = parts.indexOf('dev');
        if (devIdx !== -1 && parts[devIdx + 1]) {
          defaultGatewayDev = parts[devIdx + 1];
        }
      } catch (_) {}
    }

    for (const [name, addrs] of Object.entries(rawInterfaces)) {
      if (!addrs || addrs.length === 0) continue;
      const ipv4 = addrs.find(a => a.family === 'IPv4' || a.family === 4);
      const ipv6 = addrs.find(a => a.family === 'IPv6' || a.family === 6);
      const macAddr = (addrs.find(a => a.mac && a.mac !== '00:00:00:00:00:00')?.mac || '00:00:00:00:00:00').toUpperCase();
      const isInternal = Boolean(ipv4 ? ipv4.internal : addrs[0]?.internal || name === 'lo' || name === 'lo0');
      const hwPort = hwMap[name] || '';

      let type = 'ethernet';
      let typeLabel = 'Physical Ethernet / LAN';
      const lower = name.toLowerCase();
      const hwLower = (hwPort || '').toLowerCase();

      if (isInternal) {
        type = 'loopback';
        typeLabel = 'Loopback Lokal (Host)';
      } else if (hwLower.includes('wi-fi') || hwLower.includes('airport') || lower.includes('wi-fi') || lower.includes('wlan') || lower.includes('wifi')) {
        type = 'wifi';
        typeLabel = 'Wi-Fi Wireless';
      } else if (hwLower.includes('usb') || lower.includes('usb')) {
        type = 'ethernet';
        typeLabel = 'USB-C Ethernet Dongle / LAN';
      } else if (hwLower.includes('thunderbolt') || lower.includes('thunderbolt')) {
        type = 'ethernet';
        typeLabel = 'Thunderbolt LAN';
      }

      const ip = ipv4 ? ipv4.address : null;
      const cidr = (ipv4 && ipv4.cidr) ? ipv4.cidr : (ip ? ip + '/24' : null);
      const netmask = (ipv4 && ipv4.netmask) ? ipv4.netmask : (ip ? '255.255.255.0' : null);
      const prefix = ip && ip.includes('.') ? ip.split('.').slice(0, 3).join('.') + '.' : '192.168.1.';

      let speedHint = '1 Gbps Wire Speed';
      if (type === 'wifi') speedHint = 'Wi-Fi Link (Auto-Negotiated)';
      else if (type === 'loopback') speedHint = '10 Gbps (Host Virtual)';
      else if (hwLower.includes('thunderbolt') || lower.includes('10g')) speedHint = '10 Gbps High Speed';
      else if (hwLower.includes('2.5g')) speedHint = '2.5 Gbps Multi-Gig';

      const isDefaultRoute = Boolean(defaultGatewayDev && name === defaultGatewayDev);
      const isDefault = isDefaultRoute || (!isInternal && ip !== null && (type === 'ethernet' || type === 'wifi'));

      const displayName = hwPort
        ? name + ' — ' + hwPort + (ip ? ' (' + ip + ')' : '') + (isDefaultRoute ? ' 🌟 [Default Gateway Route]' : '')
        : name + (ip ? ' (' + ip + ')' : '') + ' [' + typeLabel + ']' + (isDefaultRoute ? ' 🌟 [Default Gateway Route]' : '');

      result.push({
        name,
        hardwarePort: hwPort || undefined,
        displayName,
        type,
        typeLabel,
        mac: macAddr,
        ipv4: ip,
        ipv6: ipv6 ? ipv6.address : null,
        netmask,
        cidr,
        subnetPrefix: prefix,
        isInternal,
        status: ip ? 'UP' : 'DOWN',
        speedHint,
        isDefault,
        isDefaultRoute,
        isRealTime: true
      });
    }

    result.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (a.isDefaultRoute) scoreA += 500;
      if (b.isDefaultRoute) scoreB += 500;
      if (a.status === 'UP' && !a.isInternal) scoreA += 100;
      if (b.status === 'UP' && !b.isInternal) scoreB += 100;
      if (a.type === 'ethernet') scoreA += 50;
      if (b.type === 'ethernet') scoreB += 50;
      if (a.hardwarePort && a.hardwarePort.toLowerCase().includes('usb')) scoreA += 25;
      if (b.hardwarePort && b.hardwarePort.toLowerCase().includes('usb')) scoreB += 25;
      if (a.type === 'wifi') scoreA += 20;
      if (b.type === 'wifi') scoreB += 20;
      if (a.isInternal) scoreA -= 50;
      if (b.isInternal) scoreB -= 50;
      return scoreB - scoreA;
    });

    return result;
  } catch (err) {
    console.error('IPC network:interfaces error:', err);
    return [];
  }
});

// Native ICMP Ping & TCP/UDP Probe handler (follows default OS gateway/route)
ipcMain.handle('network:probe', async (_event, options = {}) => {
  const { host = '', port = 80, mode = 'ping', seq = 1 } = options;
  const timeoutMs = Math.min(10000, Math.max(200, Number(options.timeoutMs) || 1500));
  const rawHost = String(host || '').trim().replace(/^https?:\/\//, '').split('/')[0];
  // IPv6 literal (mis. "::1" atau "[fe80::1]:22") jangan dipotong di ':'
  const bracketed = rawHost.match(/^\[([0-9a-fA-F:.]+)\](?::\d+)?$/);
  const hostClean = bracketed ? bracketed[1] : (net.isIPv6(rawHost) ? rawHost : rawHost.split(':')[0]);
  if (!hostClean) {
    return { success: false, reachable: false, rtt: 1000, resolvedIp: '', statusMsg: 'Host tujuan kosong.', error: 'EMPTY_HOST' };
  }
  if (!isValidHost(hostClean)) {
    return { success: false, reachable: false, rtt: 1000, resolvedIp: '', statusMsg: 'Format host tidak valid.', error: 'INVALID_ARGS' };
  }

  let resolvedIp = hostClean;
  const isIp = net.isIP(hostClean) !== 0;
  if (!isIp) {
    try {
      // 1. Resolve using laptop OS DNS settings (getaddrinfo IPv4)
      const lookupRes = await dns.promises.lookup(hostClean, { family: 4 });
      resolvedIp = lookupRes.address;
    } catch (dnsErr1) {
      try {
        // 2. Try general OS DNS lookup
        const lookupAny = await dns.promises.lookup(hostClean);
        resolvedIp = lookupAny.address;
      } catch (dnsErr2) {
        try {
          // 3. Try resolve4 directly
          const addrs = await dns.promises.resolve4(hostClean);
          if (addrs && addrs.length > 0) {
            resolvedIp = addrs[0];
          } else {
            resolvedIp = hostClean;
          }
        } catch (dnsErr3) {
          // 4. If DNS lookup fails, keep domain name for OS ping utility to resolve
          resolvedIp = hostClean;
        }
      }
    }
  }

  if (mode === 'ping') {
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const waitMs = Math.max(1000, timeoutMs);
    // [SEC-01] Argumen dikirim sebagai array (tanpa shell); resolvedIp sudah lolos isValidHost
    const pingArgs = isWindows
      ? ['-n', '1', '-w', String(waitMs), resolvedIp]
      : isMac
        ? ['-c', '1', '-W', String(waitMs), resolvedIp]
        : ['-c', '1', '-W', '2', resolvedIp];

    try {
      if (!isValidHost(resolvedIp)) throw new Error('INVALID_RESOLVED_HOST');
      const start = Date.now();
      const { stdout } = await execFileAsync('ping', pingArgs, { timeout: timeoutMs + 1000, encoding: 'utf8', windowsHide: true });
      const duration = Date.now() - start;

      let rtt = duration;
      const timeMatch = stdout.match(/time[=<]([0-9.]+)\s*ms/i);
      if (timeMatch && timeMatch[1]) {
        rtt = parseFloat(timeMatch[1]);
      } else {
        const avgMatch = stdout.match(/(?:avg|min\/avg\/max\/stddev)\s*=\s*[0-9.]+\/([0-9.]+)\//i);
        if (avgMatch && avgMatch[1]) {
          rtt = parseFloat(avgMatch[1]);
        }
      }

      let ttl = 60;
      const ttlMatch = stdout.match(/ttl[=]([0-9]+)/i);
      if (ttlMatch && ttlMatch[1]) {
        ttl = parseInt(ttlMatch[1], 10);
      }

      return {
        success: true,
        reachable: true,
        rtt: Number(rtt.toFixed(2)),
        ttl,
        resolvedIp,
        host: hostClean,
        statusMsg: `Echo reply from ${resolvedIp}: bytes=64 time=${rtt.toFixed(2)}ms TTL=${ttl}`
      };
    } catch (pingErr) {
      // If ICMP ping is blocked or requires root privileges, perform fast TCP fallback probe
      const fallbackPorts = [Number(port) || 80, 443, 22, 53, 8080];
      for (const testPort of fallbackPorts) {
        try {
          const tcpRes = await new Promise((resolveTcp) => {
            const s = new net.Socket();
            const tcpStart = Date.now();
            let done = false;
            const timer = setTimeout(() => {
              if (!done) {
                done = true;
                s.destroy();
                resolveTcp({ reachable: false, rtt: 1000, statusMsg: 'TIMEOUT' });
              }
            }, 800);

            s.connect(testPort, resolvedIp, () => {
              if (!done) {
                done = true;
                clearTimeout(timer);
                const tcpRtt = Date.now() - tcpStart;
                s.destroy();
                resolveTcp({
                  reachable: true,
                  rtt: tcpRtt,
                  statusMsg: `[TCP-SYN/ACK] Host ${hostClean} (${resolvedIp}:${testPort}) Active: time=${tcpRtt}ms`
                });
              }
            });

            s.on('error', (err) => {
              if (!done) {
                done = true;
                clearTimeout(timer);
                const tcpRtt = Date.now() - tcpStart;
                s.destroy();
                if (err && (err.code === 'ECONNREFUSED' || err.code === 'ENETUNREACH')) {
                  resolveTcp({
                    reachable: true,
                    rtt: tcpRtt,
                    statusMsg: `[TCP-RST] Host ${hostClean} (${resolvedIp}) Active (Port ${testPort} Refused, time=${tcpRtt}ms)`
                  });
                } else {
                  resolveTcp({ reachable: false, rtt: 1000, statusMsg: err.message });
                }
              }
            });
          });

          if (tcpRes.reachable) {
            return {
              success: true,
              reachable: true,
              rtt: tcpRes.rtt,
              ttl: 58,
              resolvedIp,
              host: hostClean,
              statusMsg: tcpRes.statusMsg
            };
          }
        } catch (_) {}
      }

      return {
        success: true,
        reachable: false,
        rtt: 1000,
        resolvedIp,
        host: hostClean,
        statusMsg: `Request timed out (seq=${seq}) -> Destination Host ${hostClean} (${resolvedIp}) Unreachable / TIMEOUT`,
        error: 'TIMEOUT'
      };
    }
  }

  // TCP / UDP Port Probe
  return new Promise((resolve) => {
    const targetPort = Number(port) || 80;
    const socket = new net.Socket();
    let finished = false;
    const start = Date.now();

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        socket.destroy();
        resolve({
          success: true,
          reachable: false,
          rtt: timeoutMs,
          resolvedIp,
          host: hostClean,
          statusMsg: `Request timed out (seq=${seq}) -> Host ${hostClean}:${targetPort} No Response / TIMEOUT`,
          error: 'TIMEOUT'
        });
      }
    }, timeoutMs);

    socket.connect(targetPort, resolvedIp, () => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        const rtt = Date.now() - start;
        socket.destroy();
        resolve({
          success: true,
          reachable: true,
          rtt,
          resolvedIp,
          host: hostClean,
          statusMsg: `TCP Handshake [SYN, ACK] Host ${hostClean} (${resolvedIp}:${targetPort}) Connected (RTT=${rtt}ms)`
        });
      }
    });

    socket.on('error', (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        const rtt = Date.now() - start;
        socket.destroy();
        if (err && (err.code === 'ECONNREFUSED' || err.code === 'ENETUNREACH')) {
          resolve({
            success: true,
            reachable: true,
            portClosed: true,
            rtt,
            resolvedIp,
            host: hostClean,
            statusMsg: `[RST, ACK] Host ${hostClean} (${resolvedIp}) Responded (Port ${targetPort} Closed, RTT=${rtt}ms)`
          });
        } else {
          resolve({
            success: true,
            reachable: false,
            rtt: 1000,
            resolvedIp,
            host: hostClean,
            statusMsg: `Connection error to ${hostClean}:${targetPort} (${err.message})`,
            error: err.code || 'ERROR'
          });
        }
      }
    });
  });
});

// Dedicated Native Web GUI Browser Window (self-signed SSL untuk VMware ESXi / Router, dengan konfirmasi user)
const WEBGUI_PARTITION = 'webgui';
const trustedWebGuiCerts = new Set();

ipcMain.handle('browser:open', async (_event, options = {}) => {
  const targetUrl = typeof options === 'string' ? options : (options.url || 'https://www.google.com');
  const brand = typeof options === 'object' && options.brand ? String(options.brand) : 'Hardware Device Web GUI';

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (_) {
    return { success: false, error: 'URL tidak valid.' };
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { success: false, error: 'Hanya URL http:// atau https:// yang diizinkan.' };
  }

  try {
    // [SEC-02] Session terpisah (tidak berbagi cookie/cache/validasi TLS dengan jendela utama)
    const browserWin = new BrowserWindow({
      width: 1280,
      height: 800,
      title: `69 AI Native Browser - ${brand} (${parsedUrl.href})`,
      backgroundColor: '#0c0d12',
      webPreferences: {
        partition: WEBGUI_PARTITION,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      }
    });

    // [SEC-02] Sertifikat self-signed hanya diterima setelah user konfirmasi, per host:port + fingerprint
    browserWin.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
      event.preventDefault();
      let hostKey = url;
      try { hostKey = new URL(url).host; } catch (_) {}
      const trustKey = `${hostKey}|${certificate.fingerprint}`;
      if (trustedWebGuiCerts.has(trustKey)) return callback(true);
      dialog.showMessageBox(browserWin, {
        type: 'warning',
        buttons: ['Batal', 'Percayai sertifikat ini'],
        defaultId: 0,
        cancelId: 0,
        title: 'Sertifikat tidak terpercaya',
        message: `Sertifikat ${hostKey} tidak valid (${error}).`,
        detail: `Penerbit: ${certificate.issuerName}\nFingerprint: ${certificate.fingerprint}\n\nLanjutkan hanya jika ini perangkat milikmu (mis. router/ESXi dengan sertifikat self-signed).`
      }).then(({ response }) => {
        if (response === 1) trustedWebGuiCerts.add(trustKey);
        callback(response === 1);
      }).catch(() => callback(false));
    });

    browserWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

    browserWin.loadURL(parsedUrl.href).catch((err) => {
      console.warn('Native browser window load notice:', err.message);
    });

    return { success: true, url: targetUrl };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
