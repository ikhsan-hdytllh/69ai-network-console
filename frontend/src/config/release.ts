// Konfigurasi rilis desktop publik 69 AI Network Console.

export const APP_VERSION = '1.1.0';

// [CR-007, CR-010] Generator (On-Prem Export, ekstensi browser, packager APK/mac) dihapus dari source publik.

// [CR-005] Fitur baru v19 ditahan ke siklus 1.2.0.
export const FEATURES = {
  transitQuickConnect: false,
} as const;

// Pengaturan: sertakan output terminal otomatis di setiap pertanyaan ke AI online [SEC-05]
export const SHARE_TERMINAL_WITH_AI_KEY = '69ai_share_terminal_with_ai';

export function isDesktopNative(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).DesktopNative?.isDesktopNative);
}
