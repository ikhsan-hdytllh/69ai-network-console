import { safeStorage } from './safeStorage';

/**
 * Obsolete or expired Cloud Run URLs to automatically purge from user storage
 */
const OBSOLETE_CLOUD_RUN_DOMAINS = [
  'lmdun5oue4wfncoh54ds2q',
  'g5in5orpjv3ntfzmskktgi',
  'yvhxfwurirei4ajyxt25iy',
];

export function cleanObsoleteServerUrl(): void {
  const custom = safeStorage.getItem('69ai_backend_server_url');
  if (custom && OBSOLETE_CLOUD_RUN_DOMAINS.some(domain => custom.includes(domain))) {
    safeStorage.removeItem('69ai_backend_server_url');
  }
}

/**
 * API Base URL Resolver for Web, Android APK, Electron macOS/Windows, and Local Development
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // Auto clean expired or dead domains from past builds
  cleanObsoleteServerUrl();

  // 1. Custom backend server URL configured by user (e.g. Cloud Run relay)
  const customServer = safeStorage.getItem('69ai_backend_server_url');
  if (customServer && customServer.startsWith('http')) {
    return customServer.replace(/\/+$/, '');
  }

  // 2. If running under file:// protocol (e.g. Android APK local asset or static build)
  if (window.location.protocol === 'file:' || !window.location.host) {
    return '';
  }

  // 3. If running on standard http or https (Web preview, Cloud Run, localhost)
  return window.location.origin;
}

export function getProxyUrl(targetUrl: string): string {
  const cleanTarget = targetUrl.startsWith('http://') || targetUrl.startsWith('https://') 
    ? targetUrl 
    : `https://${targetUrl}`;

  const base = getApiBaseUrl();
  // Only use server proxy if running on a real web server with matching origin
  if (base && base.startsWith('http') && typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    return `${base}/api/browser/proxy?url=${encodeURIComponent(cleanTarget)}`;
  }

  // Direct URL on Android APK, Electron, and Standalone mode
  return cleanTarget;
}

export function getSearchApiUrl(query: string): string {
  const base = getApiBaseUrl();
  if (base && base.startsWith('http') && typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    return `${base}/api/browser/search?q=${encodeURIComponent(query)}`;
  }
  return '';
}
