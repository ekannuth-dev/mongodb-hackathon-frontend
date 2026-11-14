export const money = (n: number) => "$" + Number(n || 0).toLocaleString();
export const label = (s: string) => s.replaceAll("_", " ");

export function ago(date: string) {
  const s = (Date.now() - new Date(date).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export function until(date: string) {
  const d = (new Date(date).getTime() - Date.now()) / 86_400_000;
  if (d < 0) return "expiring";
  return d < 1 ? "<1 day" : `${Math.round(d)} days`;
}
