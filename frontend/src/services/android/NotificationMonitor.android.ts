import { NativeModules, PermissionsAndroid, Platform } from "react-native";

const { SmsInterceptor } = NativeModules;

// Default keywords — also synced from store.blacklistKeywords
const DEFAULT_KEYWORDS = [
  "ATM",
  "解除分期",
  "輔助認證",
  "飆股",
  "強勢股",
  "領取飆股",
  "帳戶凍結",
  "安全帳戶",
  "LINE Pay",
  "驗證碼",
  "點數卡",
  "投資",
  "帳號異常",
  "轉帳",
  "警察",
  "監管帳戶",
  "假冒",
  "中獎",
  "匯款",
  "http",
  "bit.ly",
];

/**
 * Request the SMS and notification permissions needed for interception.
 * Returns true if ALL required permissions were granted.
 */
export async function requestSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return false;

  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      ...(Platform.Version >= 33
        ? [PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS]
        : []),
    ]);

    const smsGranted =
      results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === "granted" &&
      results[PermissionsAndroid.PERMISSIONS.READ_SMS] === "granted";

    return smsGranted;
  } catch {
    return false;
  }
}

/**
 * Sync risk keywords to the native SharedPreferences so
 * the BroadcastReceiver can use them even when the JS bridge is down.
 */
export async function updateRiskKeywords(
  keywords?: string[],
): Promise<void> {
  if (!SmsInterceptor) return;
  const kw = keywords && keywords.length > 0 ? keywords : DEFAULT_KEYWORDS;
  await SmsInterceptor.updateKeywords(kw);
}

/**
 * Start the SMS interception foreground service.
 * Requests permissions → syncs keywords → starts native service.
 */
export async function initScamProtection(
  keywords?: string[],
): Promise<boolean> {
  if (Platform.OS !== "android" || !SmsInterceptor) return false;

  const granted = await requestSmsPermissions();
  if (!granted) return false;

  await updateRiskKeywords(keywords);
  await SmsInterceptor.startProtection();
  return true;
}

/**
 * Stop the SMS interception foreground service.
 */
export async function stopScamProtection(): Promise<void> {
  if (!SmsInterceptor) return;
  await SmsInterceptor.stopProtection();
}

/**
 * Check whether the protection service is currently active.
 */
export async function isProtectionRunning(): Promise<boolean> {
  if (!SmsInterceptor) return false;
  return SmsInterceptor.isProtectionRunning();
}

/* ------------------------------------------------------------------ */
/*  Phase 2 — Notification interception (all apps)                     */
/* ------------------------------------------------------------------ */

/**
 * Check if the user has granted Notification Access permission
 * (system-level, must be enabled manually in Settings).
 */
export async function isNotificationAccessEnabled(): Promise<boolean> {
  if (!SmsInterceptor) return false;
  return SmsInterceptor.isNotificationAccessEnabled();
}

/**
 * Open the system Notification Access settings page so the user
 * can grant permission to GuardCircle.
 */
export async function openNotificationAccessSettings(): Promise<void> {
  if (!SmsInterceptor) return;
  await SmsInterceptor.openNotificationAccessSettings();
}

/**
 * Enable/disable the notification interception feature.
 * The NotificationListenerService checks this flag before processing.
 */
export async function setNotificationInterceptionEnabled(
  enabled: boolean,
  keywords?: string[],
): Promise<void> {
  if (!SmsInterceptor) return;
  if (enabled) {
    await updateRiskKeywords(keywords);
  }
  await SmsInterceptor.setNotificationInterceptionEnabled(enabled);
}

/**
 * Check if notification interception is currently enabled.
 */
export async function isNotificationInterceptionEnabled(): Promise<boolean> {
  if (!SmsInterceptor) return false;
  return SmsInterceptor.isNotificationInterceptionEnabled();
}
