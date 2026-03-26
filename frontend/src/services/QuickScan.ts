// Default stub for iOS / Web — overlay is Android-only.
// iOS uses Share Extension which is handled via deep linking, not a JS service.

export async function canDrawOverlays(): Promise<boolean> {
  return false;
}

export async function requestOverlayPermission(): Promise<void> {}

export async function startOverlay(): Promise<boolean> {
  return false;
}

export async function stopOverlay(): Promise<void> {}

export async function isOverlayActive(): Promise<boolean> {
  return false;
}

export async function consumePendingScreenshot(): Promise<string | null> {
  return null;
}

export const quickScanPlatform = "ios" as const;
