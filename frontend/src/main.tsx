import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { migrateLegacySecretsToVault } from './utils/safeStorage';
import { migrateDevicePasswordsToVault } from './services/dbStorage';

// [SEC-06] Pindahkan API key & password perangkat lama dari localStorage ke Keychain (desktop)
migrateLegacySecretsToVault();
migrateDevicePasswordsToVault();

// Global error handlers to prevent uncaught cross-origin or script errors from breaking the page/iframe
window.onerror = function (message, source, lineno, colno, error) {
  const msgStr = String(message || '');
  if (
    msgStr.includes('Script error') ||
    msgStr.includes('cross-origin') ||
    msgStr.includes('ResizeObserver') ||
    msgStr.includes('scrollIntoView') ||
    msgStr.includes('SecurityError') ||
    !source ||
    lineno === 0
  ) {
    console.warn('[69 AI] Suppressed cross-origin/iframe script notice:', { message, source, lineno, colno });
    return true; // Prevents default browser error bubbling to host environment
  }
  console.error('[69 AI] Global error caught by onerror:', { message, source, lineno, colno, error });
  return true;
};

window.addEventListener('error', (event) => {
  const msg = String(event.message || '');
  if (
    msg.includes('Script error') ||
    msg.includes('ResizeObserver') ||
    msg.includes('scrollIntoView') ||
    msg.includes('SecurityError') ||
    !event.filename ||
    event.lineno === 0
  ) {
    event.preventDefault();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }
    return true;
  }
  console.error('[69 AI] Global error event:', event.error || event.message);
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const reasonStr = String(reason?.message || reason || '');
  if (
    reasonStr.includes('Script error') ||
    reasonStr.includes('ResizeObserver') ||
    reasonStr.includes('scrollIntoView') ||
    reasonStr.includes('SecurityError') ||
    reasonStr.includes('canceled') ||
    reasonStr.includes('aborted')
  ) {
    event.preventDefault();
    return;
  }
  console.warn('[69 AI] Unhandled Promise Rejection:', event.reason);
  event.preventDefault();
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

