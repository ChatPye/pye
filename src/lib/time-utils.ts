export function safeSeconds(value: number | undefined | null): number {
  if (value == null || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

export function formatMediaTime(seconds: number): string {
  const s = safeSeconds(seconds);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
