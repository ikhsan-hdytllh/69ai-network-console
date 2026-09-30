/**
 * 69 AI BLE Serial Bridge (Irxon BT578 V3 BLE Module Handler)
 * 
 * Hardware Target:
 * - Device: Irxon BT578 V3 (Mode BLE)
 * - Service UUID UART: 0xFFE0 (0000ffe0-0000-1000-8000-00805f9b34fb)
 * - Characteristic RX/TX: 0xFFE1 (0000ffe1-0000-1000-8000-00805f9b34fb)
 *   Permissions: Read, WriteWithoutResponse, Notify
 */

(function () {
  'use strict';

  // Constants for Irxon BT578 V3 BLE UART
  const IRXON_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
  const IRXON_CHAR_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

  const BLE_SERVICES = [
    '0000ffe0-0000-1000-8000-00805f9b34fb', // IRXON / HM-10 UART
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic NUS
    '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
    '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / IRXON
    '0000fff0-0000-1000-8000-00805f9b34fb'  // Realtek UART
  ];

  // State
  let activeBleDevice = null;
  let activeGattServer = null;
  let activeRxTxChar = null;
  let textDecoder = new TextDecoder('utf-8', { fatal: false });
  let textEncoder = new TextEncoder();

  // Internal buffer
  window.bleTerminalBuffer = window.bleTerminalBuffer || '';

  // Helper to post messages to parent window
  function notifyParent(type, payload = {}) {
    try {
      const message = {
        source: '69ai-ble-bridge',
        type,
        timestamp: Date.now(),
        ...payload
      };
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(message, '*');
      }
      // Also dispatch local custom event for same-window consumers
      window.dispatchEvent(new CustomEvent('ble-bridge-event', { detail: message }));
    } catch (e) {
      console.warn('[BLE Bridge] notifyParent error:', e);
    }
  }

  // Characteristic Value Change Listener (Stream Reader)
  function handleCharacteristicValueChanged(event) {
    try {
      const value = event.target.value;
      if (!value) return;
      const text = textDecoder.decode(value);
      if (text) {
        // Append incoming stream to bleTerminalBuffer & activeTerminalLogs
        window.bleTerminalBuffer = (window.bleTerminalBuffer || '') + text;
        window.activeTerminalLogs = (window.activeTerminalLogs || '') + text;
        if (window.activeTerminalLogs.length > 10000) {
          window.activeTerminalLogs = window.activeTerminalLogs.slice(-10000);
        }
        // Keep buffer bounded to recent 100,000 characters
        if (window.bleTerminalBuffer.length > 100000) {
          window.bleTerminalBuffer = window.bleTerminalBuffer.slice(-80000);
        }

        notifyParent('BLE_RX_DATA', {
          data: text,
          fullBuffer: window.bleTerminalBuffer,
          deviceName: activeBleDevice?.name || 'IRXON BT578 V3'
        });
      }
    } catch (err) {
      console.warn('[BLE Bridge] Decode error:', err);
    }
  }

  // Disconnect handler
  function handleDeviceDisconnected() {
    console.log('[BLE Bridge] Perangkat BLE terputus. LED kembali berkedip.');
    const devName = activeBleDevice?.name || 'IRXON BT578 V3';
    activeBleDevice = null;
    activeGattServer = null;
    activeRxTxChar = null;

    notifyParent('BLE_DISCONNECTED', {
      deviceName: devName,
      message: `Koneksi BLE ke ${devName} terputus. LED Biru berkedip.`
    });
  }

  /**
   * Request Device Scan & Establish GATT Connection
   */
  async function connectBleDevice(options = {}) {
    if (!navigator.bluetooth) {
      const err = 'Web Bluetooth API tidak didukung pada platform / browser ini.';
      notifyParent('BLE_ERROR', { error: err });
      return { success: false, error: err };
    }

    try {
      notifyParent('BLE_SCAN_STARTED', {
        message: 'Membuka dialog scan Bluetooth BLE Irxon BT578...'
      });

      let device = null;
      try {
        // Primary explicit filter for Irxon BT578 V3 (0xFFE0 / BT578 / IRXON)
        device = await navigator.bluetooth.requestDevice({
          filters: [
            { services: [IRXON_SERVICE_UUID] },
            { namePrefix: 'BT578' },
            { namePrefix: 'bt578' },
            { namePrefix: 'BT580' },
            { namePrefix: 'IRXON' },
            { namePrefix: 'irxon' },
            { namePrefix: 'HC-' },
            { namePrefix: 'JDY-' },
            { namePrefix: 'ESP32' }
          ],
          optionalServices: BLE_SERVICES
        });
      } catch (filterErr) {
        // Fallback to acceptAllDevices if filtered scan was cancelled or unsupported
        if (filterErr.name === 'NotFoundError' || filterErr.message?.includes('User cancelled')) {
          throw filterErr;
        }
        console.warn('[BLE Bridge] Filter scan fallback to acceptAllDevices:', filterErr);
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: BLE_SERVICES
        });
      }

      if (!device) {
        throw new Error('Tidak ada perangkat BLE yang dipilih.');
      }

      activeBleDevice = device;
      const deviceName = device.name || 'IRXON BT578 V3';

      notifyParent('BLE_CONNECTING', {
        deviceName,
        deviceId: device.id,
        message: `Menghubungkan GATT Server ke ${deviceName}...`
      });

      // Bind disconnect event
      device.addEventListener('gattserverdisconnected', handleDeviceDisconnected);

      // Connect GATT Server (Turns LED solid blue on Irxon BT578)
      const server = await device.gatt.connect();
      activeGattServer = server;

      // Discover UART Service 0xFFE0
      let service = null;
      for (const sUuid of BLE_SERVICES) {
        try {
          service = await server.getPrimaryService(sUuid);
          if (service) break;
        } catch (_) {}
      }

      if (!service) {
        throw new Error(`Service UART 0xFFE0 tidak ditemukan pada ${deviceName}.`);
      }

      // Discover Characteristic 0xFFE1
      const characteristic = await service.getCharacteristic(IRXON_CHAR_UUID);
      if (!characteristic) {
        throw new Error(`Characteristic RX/TX 0xFFE1 tidak ditemukan pada ${deviceName}.`);
      }

      activeRxTxChar = characteristic;

      // Start notifications for incoming stream
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

      console.log(`[BLE Bridge] Berhasil terhubung ke ${deviceName} (0xFFE0 / 0xFFE1). LED Biru SOLID.`);

      notifyParent('BLE_CONNECTED', {
        success: true,
        deviceName,
        deviceId: device.id,
        serviceUuid: IRXON_SERVICE_UUID,
        characteristicUuid: IRXON_CHAR_UUID,
        message: `Terhubung via BLE (${deviceName}). LED Biru Solid.`
      });

      return {
        success: true,
        deviceName,
        deviceId: device.id
      };
    } catch (err) {
      console.warn('[BLE Bridge] Connection error:', err);
      const isCancelled = err.name === 'NotFoundError' || err.message?.includes('User cancelled');
      notifyParent('BLE_ERROR', {
        error: isCancelled ? 'Pencarian perangkat Bluetooth BLE dibatalkan.' : (err.message || 'Gagal menghubungkan BLE.'),
        isCancelled
      });
      return { success: false, error: err.message, isCancelled };
    }
  }

  /**
   * Send TX data to Irxon BT578 V3 via Characteristic 0xFFE1
   */
  async function sendBleData(data) {
    if (!activeRxTxChar) {
      throw new Error('BLE belum terhubung ke perangkat serial Irxon.');
    }
    try {
      const buffer = typeof data === 'string' ? textEncoder.encode(data) : data;
      // Irxon BT578 V3 supports WriteWithoutResponse and Write
      if (activeRxTxChar.writeValueWithoutResponse) {
        await activeRxTxChar.writeValueWithoutResponse(buffer);
      } else {
        await activeRxTxChar.writeValue(buffer);
      }
      return { success: true, bytesWritten: buffer.length };
    } catch (err) {
      console.warn('[BLE Bridge] TX error:', err);
      throw err;
    }
  }

  /**
   * Disconnect BLE
   */
  async function disconnectBle() {
    try {
      if (activeGattServer && activeGattServer.connected) {
        activeGattServer.disconnect();
      }
      handleDeviceDisconnected();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // Listen for commands from parent window
  window.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data || data.target !== '69ai-ble-bridge') return;

    switch (data.action) {
      case 'CONNECT':
        await connectBleDevice(data.options);
        break;
      case 'SEND':
        try {
          await sendBleData(data.data);
        } catch (err) {
          notifyParent('BLE_TX_ERROR', { error: err.message });
        }
        break;
      case 'DISCONNECT':
        await disconnectBle();
        break;
      case 'GET_BUFFER':
        notifyParent('BLE_BUFFER_RESPONSE', { buffer: window.bleTerminalBuffer || '' });
        break;
      case 'CLEAR_BUFFER':
        window.bleTerminalBuffer = '';
        notifyParent('BLE_BUFFER_CLEARED');
        break;
      default:
        break;
    }
  });

  // Expose bridge globally on window for direct access
  window.BleWebViewBridge = {
    connect: connectBleDevice,
    send: sendBleData,
    disconnect: disconnectBle,
    getBuffer: () => window.bleTerminalBuffer || '',
    clearBuffer: () => { window.bleTerminalBuffer = ''; },
    isConnected: () => Boolean(activeGattServer && activeGattServer.connected)
  };

  notifyParent('BLE_BRIDGE_READY');
})();
