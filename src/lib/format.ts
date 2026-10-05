const DAY = 24 * 60 * 60 * 1000;

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const shortDateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const relFmt = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Parses either an ISO timestamp or a plain YYYY-MM-DD date (as a local date). */
export function parseDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number) as [number, number, number];
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

function dayDiff(date: Date, now = new Date()) {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY);
}

export function formatTime(iso: string) {
  return timeFmt.format(new Date(iso));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return dateFmt.format(parseDate(value));
}

/** "Today, 10:31 AM" · "Yesterday, 4:02 PM" · "Oct 3, 2026" */
export function formatDateSmart(iso: string) {
  const date = new Date(iso);
  const diff = dayDiff(date);
  if (diff === 0) return `Today, ${timeFmt.format(date)}`;
  if (diff === -1) return `Yesterday, ${timeFmt.format(date)}`;
  if (date.getFullYear() === new Date().getFullYear()) return `${shortDateFmt.format(date)}, ${timeFmt.format(date)}`;
  return dateFmt.format(date);
}

/** Short stamp for list rows: time if today, otherwise a short date. */
export function formatStamp(iso: string) {
  const date = new Date(iso);
  const diff = dayDiff(date);
  if (diff === 0) return timeFmt.format(date);
  if (diff === -1) return `Yesterday ${timeFmt.format(date)}`;
  return date.getFullYear() === new Date().getFullYear() ? shortDateFmt.format(date) : dateFmt.format(date);
}

export function dayLabel(iso: string) {
  const date = new Date(iso);
  const diff = dayDiff(date);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  return date.getFullYear() === new Date().getFullYear() ? weekdayFmt.format(date) : dateFmt.format(date);
}

export function relativeTime(iso: string) {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relFmt.format(Math.round(seconds / 60), 'minute');
  if (abs < DAY / 1000) return relFmt.format(Math.round(seconds / 3600), 'hour');
  if (abs < (30 * DAY) / 1000) return relFmt.format(Math.round(seconds / 86400), 'day');
  if (abs < (365 * DAY) / 1000) return relFmt.format(Math.round(seconds / (30 * 86400)), 'month');
  return relFmt.format(Math.round(seconds / (365 * 86400)), 'year');
}

export type DueInfo = { label: string; tone: 'muted' | 'ok' | 'warn' | 'late' };

export function dueInfo(dueDate: string | null, completed = false): DueInfo {
  if (!dueDate) return { label: 'No due date', tone: 'muted' };
  if (completed) return { label: `Due ${formatDate(dueDate)}`, tone: 'muted' };
  const diff = dayDiff(parseDate(dueDate));
  if (diff === 0) return { label: 'Due today', tone: 'warn' };
  if (diff === 1) return { label: 'Due tomorrow', tone: 'warn' };
  if (diff < 0) return { label: `Overdue by ${-diff} day${diff === -1 ? '' : 's'}`, tone: 'late' };
  if (diff <= 7) return { label: `${diff} days left`, tone: 'warn' };
  if (diff < 60) return { label: `${diff} days left`, tone: 'ok' };
  return { label: `~${Math.round(diff / 30)} months left`, tone: 'ok' };
}


/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join('') || '?'
  );
}

