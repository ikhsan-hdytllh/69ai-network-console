import React, { useEffect, useRef } from 'react';
import { bleBridgeService } from '../services/bleBridgeService';

/**
 * BleWebViewBridge Component
 * Embeds the isolated iframe with Web Bluetooth permissions (allow="bluetooth *; bluetooth-scanning *")
 * to guarantee that the native browser/webview popup scan dialog appears smoothly.
 */
export const BleWebViewBridge: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    try {
      bleBridgeService.initialize();
    } catch {}
  }, []);

  return (
    <iframe
      ref={iframeRef}
      id="69ai-ble-isolated-bridge"
      src="./ble-bridge.html"
      title="69 AI BLE Serial Bridge"
      allow="bluetooth *; bluetooth-scanning *; usb *"
      className="hidden w-0 h-0 border-0 pointer-events-none fixed -top-9999 -left-9999 opacity-0"
      aria-hidden="true"
      onError={() => {
        // Silently handle sandbox or permissions policy restrictions
      }}
    />
  );
};
