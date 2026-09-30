/**
 * Safe cross-environment clipboard utility for web and sandboxed iframes.
 * Prevents unhandled DOMException errors when document is not focused.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern Async Clipboard API first if permitted
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Async clipboard failed (e.g. document not focused or iframe permission blocked)
      // Fallback to execCommand below
    }
  }

  // 2. Fallback using temporary textarea + execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (fallbackErr) {
      console.warn('Clipboard copy failed:', fallbackErr);
      return false;
    }
  }

  return false;
}

export async function readFromClipboard(): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
    try {
      return await navigator.clipboard.readText();
    } catch (err) {
      console.warn('Clipboard read failed:', err);
      return null;
    }
  }
  return null;
}
