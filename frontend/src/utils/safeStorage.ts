// Safe storage abstraction to prevent SecurityError / DOMException in sandboxed iframes or private modes
import { SECRET_STORAGE_KEYS, isVaultPlaceholder, maskSecret, vaultAvailable, vaultSet, vaultDelete } from './secretVault';

class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryStore = new MemoryStorage();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Access denied or sandboxed iframe
    }
    return memoryStore.getItem(key);
  },

  setItem(key: string, value: string): void {
    // [SEC-06] API key di desktop: nilai asli → Keychain, localStorage hanya placeholder
    const secretName = SECRET_STORAGE_KEYS[key];
    if (secretName && vaultAvailable() && value && value.trim() && !isVaultPlaceholder(value)) {
      void vaultSet(secretName, value.trim());
      value = maskSecret(value);
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Access denied or quota exceeded
    }
    memoryStore.setItem(key, value);
  },

  removeItem(key: string): void {
    const secretName = SECRET_STORAGE_KEYS[key];
    if (secretName && vaultAvailable()) {
      void vaultDelete(secretName);
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
    memoryStore.removeItem(key);
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {}
    memoryStore.clear();
  },
};

// Pindahkan API key plaintext lama (dari versi ≤ 1.0) ke Keychain saat aplikasi desktop dibuka
export function migrateLegacySecretsToVault(): void {
  if (!vaultAvailable()) return;
  for (const key of Object.keys(SECRET_STORAGE_KEYS)) {
    const value = safeStorage.getItem(key);
    if (value && value.trim() && !isVaultPlaceholder(value)) {
      safeStorage.setItem(key, value);
    }
  }
}
