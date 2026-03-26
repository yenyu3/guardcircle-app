// Stub for iOS / Web — SMS interception is Android-only

export async function requestSmsPermissions(): Promise<boolean> {
  return false;
}

export async function updateRiskKeywords(_keywords?: string[]): Promise<void> {}

export async function initScamProtection(_keywords?: string[]): Promise<boolean> {
  return false;
}

export async function stopScamProtection(): Promise<void> {}

export async function isProtectionRunning(): Promise<boolean> {
  return false;
}

export async function isNotificationAccessEnabled(): Promise<boolean> {
  return false;
}

export async function openNotificationAccessSettings(): Promise<void> {}

export async function setNotificationInterceptionEnabled(
  _enabled: boolean,
  _keywords?: string[],
): Promise<void> {}

export async function isNotificationInterceptionEnabled(): Promise<boolean> {
  return false;
}
