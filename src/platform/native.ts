/**
 * Capacitor adapters. Every API degrades gracefully in a plain browser so the
 * same code path runs on web, Android and iOS.
 */

export function isNative(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

export function platformName(): 'android' | 'ios' | 'web' {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (window as any).Capacitor?.getPlatform?.();
    return p === 'android' || p === 'ios' ? p : 'web';
  } catch {
    return 'web';
  }
}

export type HapticKind = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning';

type HapticsModule = typeof import('@capacitor/haptics');
let hapticsMod: HapticsModule | null = null;
let hapticsLoading: Promise<void> | null = null;

/**
 * Load the Capacitor haptics bridge once, ahead of gameplay, so the first
 * pulse is never delayed by a dynamic import. No-op on the web.
 */
export function preloadHaptics(): Promise<void> {
  if (!isNative()) return Promise.resolve();
  hapticsLoading ??= import('@capacitor/haptics')
    .then((m) => {
      hapticsMod = m;
    })
    .catch(() => undefined);
  return hapticsLoading;
}

/**
 * Fire-and-forget haptic pulse. Never awaited by gameplay; silently ignored
 * when disabled, on the web, or before the bridge has loaded.
 */
export function fireHaptic(kind: HapticKind, enabled = true): void {
  if (!enabled || !hapticsMod) return;
  const { Haptics, ImpactStyle, NotificationType } = hapticsMod;
  const swallow = (p: Promise<unknown>) => void p.catch(() => undefined);
  try {
    switch (kind) {
      case 'selection':
        if (platformName() === 'ios') {
          swallow(Haptics.selectionStart().then(() => Haptics.selectionChanged()).then(() => Haptics.selectionEnd()));
        } else swallow(Haptics.vibrate({ duration: 8 }));
        break;
      case 'light': swallow(Haptics.impact({ style: ImpactStyle.Light })); break;
      case 'medium': swallow(Haptics.impact({ style: ImpactStyle.Medium })); break;
      case 'heavy': swallow(Haptics.impact({ style: ImpactStyle.Heavy })); break;
      case 'success': swallow(Haptics.notification({ type: NotificationType.Success })); break;
      case 'warning': swallow(Haptics.notification({ type: NotificationType.Warning })); break;
    }
  } catch {
    /* haptics unavailable */
  }
}

/** @deprecated use the FeedbackManager; kept for legacy call sites. */
export async function haptic(kind: HapticKind, enabled: boolean): Promise<void> {
  if (!enabled) return;
  await preloadHaptics();
  fireHaptic(kind, enabled);
}

/** Share a generated PNG card + caption via the native sheet or Web Share L2. */
export async function shareCard(pngDataUrl: string, text: string, filename = 'oops-floor.png'): Promise<'shared' | 'copied' | 'failed'> {
  if (isNative()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const base64 = pngDataUrl.split(',')[1];
      const path = `share-${Date.now()}.png`;
      const res = await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
      await Share.share({ title: 'Oops! That Floor!', text, files: [res.uri] });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    const blob = await (await fetch(pngDataUrl)).blob();
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share?: (d: { files?: File[]; text?: string; title?: string }) => Promise<void> };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share!({ files: [file], text, title: 'Oops! That Floor!' });
      return 'shared';
    }
    // Fallback: download the card + copy text.
    const a = document.createElement('a');
    a.href = pngDataUrl;
    a.download = filename;
    a.click();
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    return 'copied';
  } catch {
    return 'failed';
  }
}

export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: 'Oops! That Floor!', text });
      return 'shared';
    } catch {
      return 'failed';
    }
  }
  try {
    const nav = navigator as Navigator & { share?: (d: { text?: string; title?: string }) => Promise<void> };
    if (nav.share) {
      await nav.share({ text, title: 'Oops! That Floor!' });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Android hardware back button → callback. Returns a remover. */
export function onBackButton(cb: () => void): () => void {
  if (!isNative()) return () => undefined;
  let remove: () => void = () => undefined;
  let cancelled = false;
  void import('@capacitor/app')
    .then(({ App }) => {
      if (cancelled) return; // scene destroyed before the import resolved
      const h = App.addListener('backButton', cb);
      remove = () => void h.then((x) => x.remove());
    })
    .catch(() => undefined);
  return () => {
    cancelled = true;
    remove();
  };
}

export async function minimizeApp(): Promise<void> {
  if (!isNative()) return;
  try {
    const { App } = await import('@capacitor/app');
    await App.minimizeApp();
  } catch {
    /* noop */
  }
}

/** Safe-area insets in CSS px (notch / gesture bar). */
export function safeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);' +
    'padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return out;
}
