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

export function showNotification(
  title: string,
  body: string,
  onClick?: () => void
): void {
  if (!isNotificationSupported()) return;
  try {
    if (Notification.permission !== "granted") return;
    const n = new Notification(title, { body });
    if (onClick) {
      n.onclick = (ev) => {
        try {
          ev.preventDefault();
        } catch {
          // ignore
        }
        try {
          window.focus();
        } catch {
          // ignore
        }
        try {
          onClick();
        } catch {
          // ignore
        }
        try {
          n.close();
        } catch {
          // ignore
        }
      };
    }
  } catch {
    // ignore
  }
}
