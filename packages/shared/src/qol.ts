import type { QolCadence, QolFullScores, QolQuickScores, QolScores } from "./types";

export const QOL_FULL_MAX = 70;
export const QOL_QUICK_RAW_MAX = 50;

export const QOL_FULL_DIMENSIONS: { key: keyof Omit<QolFullScores, "scale">; label: string }[] = [
  { key: "hurt", label: "Hurt" },
  { key: "hunger", label: "Hunger" },
  { key: "hydration", label: "Hydration" },
  { key: "hygiene", label: "Hygiene" },
  { key: "happiness", label: "Happiness" },
  { key: "mobility", label: "Mobility" },
  { key: "moreGoodDaysThanBad", label: "More good days than bad" },
];

export const QOL_QUICK_DIMENSIONS: { key: keyof Omit<QolQuickScores, "scale">; label: string }[] = [
  { key: "comfort", label: "Comfort" },
  { key: "appetite", label: "Appetite" },
  { key: "happiness", label: "Happiness" },
  { key: "mobility", label: "Mobility" },
  { key: "overall", label: "Overall" },
];

/** Always normalized to a 0-70 scale so full and quick check-ins plot on the same trend line. */
export function computeQolTotal(scores: QolScores): number {
  if (scores.scale === "full") {
    const raw = QOL_FULL_DIMENSIONS.reduce((sum, { key }) => sum + scores[key], 0);
    return raw;
  }
  const raw = QOL_QUICK_DIMENSIONS.reduce((sum, { key }) => sum + scores[key], 0);
  return (raw / QOL_QUICK_RAW_MAX) * QOL_FULL_MAX;
}

export type QolTrendDirection = "up" | "down" | "same" | "none";

export interface QolTrend {
  direction: QolTrendDirection;
  delta: number;
}

export function computeQolTrend(current: number, previous: number | null): QolTrend {
  if (previous === null) return { direction: "none", delta: 0 };
  const delta = current - previous;
  if (Math.abs(delta) < 0.5) return { direction: "same", delta };
  return { direction: delta > 0 ? "up" : "down", delta };
}

const CADENCE_DAYS: Record<QolCadence, number> = { daily: 1, weekly: 7, monthly: 30 };

export type QolDueStatus = "never" | "due" | "overdue" | "not-due";

export function computeQolDueStatus(
  lastSurveyDate: string | null,
  cadence: QolCadence,
  now: Date = new Date()
): { status: QolDueStatus; dueDate: Date | null } {
  if (!lastSurveyDate) return { status: "never", dueDate: null };

  const last = new Date(lastSurveyDate);
  const dueDate = new Date(last.getTime() + CADENCE_DAYS[cadence] * 86_400_000);
  const overdueDate = new Date(dueDate.getTime() + 86_400_000);

  if (now >= overdueDate) return { status: "overdue", dueDate };
  if (now >= dueDate) return { status: "due", dueDate };
  return { status: "not-due", dueDate };
}
