export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  try {
    if (Notification.permission === "default") {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  } catch {
    return "denied";
  }
}

export function showNotification(title: string, body: string): void {
  if (!isNotificationSupported()) return;
  try {
    if (Notification.permission !== "granted") return;
    new Notification(title, { body });
  } catch {
    // ignore
  }
}
