// [SEC-06] Di aplikasi desktop, API key dan password perangkat disimpan terenkripsi di
// Keychain/DPAPI lewat main process. localStorage hanya menyimpan placeholder bertopeng,
// dan renderer tidak pernah bisa membaca nilai aslinya kembali.
import { isDesktopNative } from '../config/release';

const MASK = '••••••••';

// Kunci localStorage lama → nama secret di main process
export const SECRET_STORAGE_KEYS: Record<string, string> = {
  '69ai_api_key_gemini': 'gemini',
  '69ai_user_api_key': 'gemini',
  '69ai_api_key_openai': 'openai',
  '69ai_api_key_claude': 'anthropic',
  '69ai_api_key_deepseek': 'deepseek',
};

export const DEVICE_PASSWORD_PLACEHOLDER = MASK;

export function maskSecret(value: string): string {
  const v = (value || '').trim();
  if (v.length <= 10) return MASK;
  return `${v.slice(0, 6)}${MASK}${v.slice(-4)}`;
}

// true bila nilai ini placeholder (nilai asli ada di Keychain)
export function isVaultPlaceholder(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.includes(MASK);
}

function desktop(): any {
  return isDesktopNative() ? (window as any).DesktopNative : null;
}

export function vaultAvailable(): boolean {
  const d = desktop();
  return Boolean(d && typeof d.setSecret === 'function');
}

export async function vaultSet(name: string, value: string): Promise<boolean> {
  const d = desktop();
  if (!d?.setSecret) return false;
  try {
    const res = await d.setSecret(name, value);
    if (!res?.success) console.warn('[Vault] Gagal menyimpan secret:', res?.error);
    return Boolean(res?.success);
  } catch (err) {
    console.warn('[Vault] Gagal menyimpan secret:', err);
    return false;
  }
}

export async function vaultDelete(name: string): Promise<void> {
  const d = desktop();
  if (!d?.deleteSecret) return;
  try {
    await d.deleteSecret(name);
  } catch (_) {}
}

// Nama secret untuk password SSH/Telnet sebuah perangkat
export function deviceSecretName(dev: { username?: string; host?: string; port?: number | string }): string | null {
  if (!dev?.host) return null;
  const port = Number(dev.port) || 22;
  return `ssh:${(dev.username || 'admin').trim()}@${String(dev.host).trim()}:${port}`;
}
