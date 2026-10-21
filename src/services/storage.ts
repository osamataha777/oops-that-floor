/**
 * Key-value storage: localStorage in the browser, @capacitor/preferences
 * on native. Async-capable but keeps a synchronous memory mirror so gameplay
 * never blocks on IO.
 */

const memory = new Map<string, string>();
let nativePlugin: { get: (o: { key: string }) => Promise<{ value: string | null }>; set: (o: { key: string; value: string }) => Promise<void> } | null = null;
let nativeReady = false;

export async function initStorage(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const mod = await import('@capacitor/preferences');
      nativePlugin = mod.Preferences;
    }
  } catch {
    nativePlugin = null;
  }
  if (nativePlugin) {
    try {
      const keys = ['otf.save.v1', 'otf.settings.v1'];
      for (const k of keys) {
        const { value } = await nativePlugin.get({ key: k });
        if (value !== null) memory.set(k, value);
      }
      nativeReady = true;
    } catch {
      nativeReady = false;
    }
  }
}

export function kvGet(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function kvSet(key: string, value: string): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota/privacy mode — memory copy still works for the session */
  }
  if (nativePlugin && nativeReady) {
    void nativePlugin.set({ key, value }).catch(() => undefined);
  }
}

export function kvRemove(key: string): void {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
