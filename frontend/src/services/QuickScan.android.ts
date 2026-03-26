import { NativeModules, Platform } from "react-native";

const { QuickScanModule } = NativeModules;

/**
 * Check if the app has SYSTEM_ALERT_WINDOW permission (draw over other apps).
 */
export async function canDrawOverlays(): Promise<boolean> {
  if (!QuickScanModule) return false;
  return QuickScanModule.canDrawOverlays();
}

/**
 * Open system settings so the user can grant overlay permission.
 */
export async function requestOverlayPermission(): Promise<void> {
  if (!QuickScanModule) return;
  await QuickScanModule.requestOverlayPermission();
}

/**
 * Start the floating bubble overlay service.
 * Requires overlay permission — call canDrawOverlays() first.
 */
export async function startOverlay(): Promise<boolean> {
  if (!QuickScanModule) return false;
  try {
    await QuickScanModule.startOverlay();
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop the floating bubble overlay service.
 */
export async function stopOverlay(): Promise<void> {
  if (!QuickScanModule) return;
  await QuickScanModule.stopOverlay();
}

/**
 * Check if the overlay service is currently active.
 */
export async function isOverlayActive(): Promise<boolean> {
  if (!QuickScanModule) return false;
  return QuickScanModule.isOverlayActive();
}

/**
 * Check if there's a pending screenshot from the overlay capture.
 * Returns the file path and clears it, or null if none.
 */
export async function consumePendingScreenshot(): Promise<string | null> {
  if (!QuickScanModule) return null;
  return QuickScanModule.consumePendingScreenshot();
}

/**
 * Platform identifier for conditional UI.
 */
export const quickScanPlatform = "android" as const;
