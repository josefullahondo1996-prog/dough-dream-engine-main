export type ReportItem = {
  date: string;
  amount: number;
};

export function summarizeByDay(items: ReportItem[]) {
  const totals = new Map<string, number>();

  items.forEach((item) => {
    const normalized = String(item.date || "").trim();
    if (!normalized) return;

    totals.set(normalized, (totals.get(normalized) ?? 0) + Number(item.amount || 0));
  });

  return Array.from(totals.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((left, right) => left.date.localeCompare(right.date));
}
