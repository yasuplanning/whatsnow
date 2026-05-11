export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function buildDateAtTime(baseDate: Date, hhmm: string, previousDay: boolean): Date {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, m, 0, 0);
  if (previousDay) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export function nowHHMM(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return "--:--:--";
  const sign = ms < 0 ? "-" : "";
  const abs = Math.abs(Math.floor(ms / 1000));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return `${sign}${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function buildHalfHourOptions(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    out.push(`${pad2(h)}:00`);
    out.push(`${pad2(h)}:30`);
  }
  return out;
}

export function toDatetimeLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fromDatetimeLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const day = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const d = new Date(y, mo - 1, day, h, mi, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function formatClock(iso: string | null): string {
  if (!iso) return "未定";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "未定";
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
