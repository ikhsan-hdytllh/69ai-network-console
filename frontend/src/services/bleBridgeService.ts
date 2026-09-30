/**
 * 69 AI BLE Bridge Service
 * 
 * Manages the isolated Web Bluetooth WebView/iframe bridge for Irxon BT578 V3.
 * Bridges incoming UART stream to terminal emulator and window.bleTerminalBuffer.
 */

// Extend window interface
declare global {
  interface Window {
    bleTerminalBuffer?: string;
    BleWebViewBridge?: {
      connect: (options?: any) => Promise<any>;
      send: (data: string | Uint8Array) => Promise<any>;
      disconnect: () => Promise<any>;
      getBuffer: () => string;
      clearBuffer: () => void;
      isConnected: () => boolean;
    };
  }
}

export type BleBridgeListener = (data: string) => void;
export type BleStatusListener = (status: { type: string; message?: string; deviceName?: string; error?: string }) => void;

class BleBridgeService {
  private iframeElement: HTMLIFrameElement | null = null;
  private dataListeners: Set<BleBridgeListener> = new Set();
  private statusListeners: Set<BleStatusListener> = new Set();
  private isConnected = false;
  private currentDeviceName = '';
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.bleTerminalBuffer = window.bleTerminalBuffer || '';
      window.addEventListener('message', this.handleWindowMessage);
    }
  }

  /**
   * Initialize and mount the isolated BLE iframe container in DOM
   */
  public initialize(): void {
    if (this.isInitialized || typeof document === 'undefined') return;

    let existing = document.getElementById('69ai-ble-isolated-bridge') as HTMLIFrameElement;
    if (!existing) {
      existing = document.createElement('iframe');
      existing.id = '69ai-ble-isolated-bridge';
      existing.src = './ble-bridge.html';
      existing.style.position = 'fixed';
      existing.style.width = '0';
      existing.style.height = '0';
      existing.style.border = 'none';
      existing.style.opacity = '0';
      existing.style.pointerEvents = 'none';
      existing.style.zIndex = '-9999';
      // Crucial: allow bluetooth and bluetooth-scanning permissions for Web Bluetooth popup
      existing.setAttribute('allow', 'bluetooth *; bluetooth-scanning *; usb *');
      document.body.appendChild(existing);
    }

    this.iframeElement = existing;
    this.isInitialized = true;
  }

  /**
   * Handle incoming postMessages from the isolated BLE bridge
   */
  private handleWindowMessage = (event: MessageEvent): void => {
    const data = event.data;
    if (!data || data.source !== '69ai-ble-bridge') return;

    switch (data.type) {
      case 'BLE_RX_DATA':
        if (data.data) {
          // Keep window.bleTerminalBuffer updated for AI context ingestion
          window.bleTerminalBuffer = (window.bleTerminalBuffer || '') + data.data;
          if (window.bleTerminalBuffer.length > 100000) {
            window.bleTerminalBuffer = window.bleTerminalBuffer.slice(-80000);
          }
          // Notify active terminal listeners
          this.dataListeners.forEach((fn) => {
            try {
              fn(data.data);
            } catch (e) {
              console.warn('[BleBridgeService] Listener error:', e);
            }
          });
        }
        break;

      case 'BLE_CONNECTED':
        this.isConnected = true;
        this.currentDeviceName = data.deviceName || 'IRXON BT578 V3';
        this.emitStatus({
          type: 'CONNECTED',
          message: data.message,
          deviceName: this.currentDeviceName,
        });
        break;

      case 'BLE_DISCONNECTED':
        this.isConnected = false;
        this.emitStatus({
          type: 'DISCONNECTED',
          message: data.message,
          deviceName: this.currentDeviceName,
        });
        break;

      case 'BLE_ERROR':
        this.emitStatus({
          type: 'ERROR',
          error: data.error,
        });
        break;

      case 'BLE_CONNECTING':
      case 'BLE_SCAN_STARTED':
        this.emitStatus({
          type: data.type,
          message: data.message,
          deviceName: data.deviceName,
        });
        break;

      default:
        break;
    }
  };

  /**
   * Trigger the native browser Web Bluetooth device scan popup
   */
  public async requestConnect(options: any = {}): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    this.initialize();

    // Direct window.BleWebViewBridge if loaded on same window
    if (typeof window !== 'undefined' && window.BleWebViewBridge) {
      const res = await window.BleWebViewBridge.connect(options);
      if (res.success) {
        this.isConnected = true;
        this.currentDeviceName = res.deviceName || 'IRXON BT578 V3';
      }
      return res;
    }

    // Otherwise postMessage to isolated iframe
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve({ success: false, error: 'Waktu tunggu koneksi BLE habis (Timeout).' });
      }, 30000);

      const statusHandler = (status: any) => {
        if (status.type === 'CONNECTED') {
          cleanup();
          resolve({ success: true, deviceName: status.deviceName });
        } else if (status.type === 'ERROR') {
          cleanup();
          resolve({ success: false, error: status.error });
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        this.statusListeners.delete(statusHandler);
      };

      this.statusListeners.add(statusHandler);

      if (this.iframeElement && this.iframeElement.contentWindow) {
        this.iframeElement.contentWindow.postMessage(
          {
            target: '69ai-ble-bridge',
            action: 'CONNECT',
            options,
          },
          '*'
        );
      } else {
        // Direct fallback
        if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
          (navigator as any).bluetooth
            .requestDevice({
              filters: [
                { namePrefix: 'BT578' },
                { namePrefix: 'bt578' },
                { namePrefix: 'IRXON' },
                { namePrefix: 'irxon' },
                { services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] }
              ],
              optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb', '6e400001-b5a3-f393-e0a9-e50e24dcca9e'],
            })
            .then(async (dev: any) => {
              const server = await dev.gatt.connect();
              const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
              const char = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
              await char.startNotifications();
              char.addEventListener('characteristicvaluechanged', (e: any) => {
                const text = new TextDecoder().decode(e.target.value);
                if (text) {
                  window.bleTerminalBuffer = (window.bleTerminalBuffer || '') + text;
                  this.dataListeners.forEach((fn) => fn(text));
                }
              });
              this.isConnected = true;
              this.currentDeviceName = dev.name || 'IRXON BT578 V3';
              cleanup();
              resolve({ success: true, deviceName: this.currentDeviceName });
            })
            .catch((err: any) => {
              cleanup();
              resolve({ success: false, error: err.message });
            });
        } else {
          cleanup();
          resolve({ success: false, error: 'Web Bluetooth API tidak tersedia.' });
        }
      }
    });
  }

  /**
   * Send TX data to Irxon BT578 V3 Characteristic 0xFFE1
   */
  public async send(data: string): Promise<void> {
    if (typeof window !== 'undefined' && window.BleWebViewBridge) {
      await window.BleWebViewBridge.send(data);
      return;
    }

    if (this.iframeElement && this.iframeElement.contentWindow) {
      this.iframeElement.contentWindow.postMessage(
        {
          target: '69ai-ble-bridge',
          action: 'SEND',
          data,
        },
        '*'
      );
    }
  }

  /**
   * Disconnect BLE session
   */
  public async disconnect(): Promise<void> {
    if (typeof window !== 'undefined' && window.BleWebViewBridge) {
      await window.BleWebViewBridge.disconnect();
    }

    if (this.iframeElement && this.iframeElement.contentWindow) {
      this.iframeElement.contentWindow.postMessage(
        {
          target: '69ai-ble-bridge',
          action: 'DISCONNECT',
        },
        '*'
      );
    }
    this.isConnected = false;
  }

  /**
   * Subscribe to incoming BLE serial data stream
   */
  public onData(listener: BleBridgeListener): () => void {
    this.dataListeners.add(listener);
    return () => {
      this.dataListeners.delete(listener);
    };
  }

  /**
   * Subscribe to BLE connection status changes
   */
  public onStatus(listener: BleStatusListener): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private emitStatus(status: { type: string; message?: string; deviceName?: string; error?: string }): void {
    this.statusListeners.forEach((fn) => {
      try {
        fn(status);
      } catch (e) {
        console.warn('[BleBridgeService] Status listener error:', e);
      }
    });
  }

  /**
   * Get accumulated BLE terminal buffer
   */
  public getBuffer(): string {
    return window.bleTerminalBuffer || '';
  }

  /**
   * Clear BLE terminal buffer
   */
  public clearBuffer(): void {
    window.bleTerminalBuffer = '';
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getDeviceName(): string {
    return this.currentDeviceName;
  }
}

export const bleBridgeService = new BleBridgeService();
