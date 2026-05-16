const DEVICE_ID_KEY = "whatsnow.deviceId.v1";

let cached: string | null = null;

export function getDeviceId(): string {
  if (cached) return cached;
  if (typeof window === "undefined") return "server";
  try {
    let id = window.localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        id = crypto.randomUUID();
      } else {
        id = `${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 12)}`;
      }
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    }
    cached = id;
    return id;
  } catch {
    return "unknown";
  }
}
