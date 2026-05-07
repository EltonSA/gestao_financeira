export function usagePercent(used: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function cardAlertLevel(percent: number) {
  if (percent >= 95) return "critical" as const;
  if (percent >= 85) return "high" as const;
  if (percent >= 70) return "watch" as const;
  return "ok" as const;
}
