const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('DesktopNative', {
  isDesktopNative: true,
  platform: process.platform,
  
  // Hardware Serial COM Ports
  listSerialPorts: () => ipcRenderer.invoke('serial:list'),
  openSerialPort: (options) => ipcRenderer.invoke('serial:open', options),
  connectSerial: (path, baudRate) => ipcRenderer.invoke('serial:connect', path, baudRate),
  writeSerial: (path, text) => ipcRenderer.invoke('serial:write', { path, text }),
  closeSerial: (path) => ipcRenderer.invoke('serial:close', { path }),
  
  // Bluetooth Device Discovery & Selection
  selectBluetoothDevice: (deviceId) => ipcRenderer.invoke('bluetooth:select', deviceId),
  cancelBluetoothScan: () => ipcRenderer.invoke('bluetooth:cancel-scan'),

  // System Network Interfaces for Traffic Analyzer, Capacity Testing & TCP Replay
  listNetworkInterfaces: () => ipcRenderer.invoke('network:interfaces'),
  getNetworkInterfaces: () => ipcRenderer.invoke('network:interfaces'),
  probeNetwork: (options) => ipcRenderer.invoke('network:probe', options),
  pingHost: (options) => ipcRenderer.invoke('network:probe', options),
  openInNativeBrowser: (url, brand) => ipcRenderer.invoke('browser:open', { url, brand }),
  openBrowser: (url, brand) => ipcRenderer.invoke('browser:open', { url, brand }),
  onBluetoothDiscovered: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('bluetooth:discovered-list', listener);
    return () => ipcRenderer.removeListener('bluetooth:discovered-list', listener);
  },

  // Listen for hardware serial data
  onSerialData: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('serial:data', listener);
    return () => ipcRenderer.removeListener('serial:data', listener);
  },

  // Native SSH Client (Direct TCP Handshake, PTY stream & Exec)
  testSsh: (options) => ipcRenderer.invoke('ssh:test', options),
  connectSsh: (options) => ipcRenderer.invoke('ssh:connect', options),
  writeSsh: (deviceId, text) => ipcRenderer.invoke('ssh:write', { deviceId, text }),
  closeSsh: (deviceId) => ipcRenderer.invoke('ssh:close', { deviceId }),
  execSsh: (options) => ipcRenderer.invoke('ssh:exec', options),

  // Listen for native SSH streaming data
  onSshData: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ssh:data', listener);
    return () => ipcRenderer.removeListener('ssh:data', listener);
  },
  onSshClose: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ssh:close', listener);
    return () => ipcRenderer.removeListener('ssh:close', listener);
  },

  // AI Key & AI Chat Execution
  sendAiChat: (payload) => ipcRenderer.invoke('ai:chat', payload),
  testAiKey: (provider, apiKey) => ipcRenderer.invoke('ai:test-key', { provider, apiKey }),

  // Secret terenkripsi (Keychain / DPAPI). Renderer hanya bisa set/cek/hapus, tidak bisa membaca.
  setSecret: (name, value) => ipcRenderer.invoke('secrets:set', { name, value }),
  hasSecret: (name) => ipcRenderer.invoke('secrets:has', { name }),
  deleteSecret: (name) => ipcRenderer.invoke('secrets:delete', { name })
});
