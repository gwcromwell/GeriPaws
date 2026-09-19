import type { QolCadence, QolFullScores, QolQuickScores, QolScores } from "./types";

export const QOL_FULL_MAX = 70;
export const QOL_QUICK_RAW_MAX = 50;

export const QOL_FULL_DIMENSIONS: { key: keyof Omit<QolFullScores, "scale">; label: string; description: string }[] = [
  { key: "hurt", label: "Hurt", description: "Is pain well controlled, and can they breathe easily?" },
  { key: "hunger", label: "Hunger", description: "Are they eating enough on their own?" },
  { key: "hydration", label: "Hydration", description: "Are they drinking enough, with no signs of dehydration?" },
  { key: "hygiene", label: "Hygiene", description: "Can they be kept clean and dry, especially after accidents?" },
  { key: "happiness", label: "Happiness", description: "Do they still show interest, joy, and respond to you?" },
  { key: "mobility", label: "Mobility", description: "Can they get up, walk, eat, and drink without help?" },
  {
    key: "moreGoodDaysThanBad",
    label: "More good days than bad",
    description: "Looking at the past week or two as a whole, are good days winning?",
  },
];

export const QOL_QUICK_DIMENSIONS: { key: keyof Omit<QolQuickScores, "scale">; label: string; description: string }[] = [
  { key: "comfort", label: "Comfort", description: "Overall physical comfort — pain, breathing, general ease" },
  { key: "appetite", label: "Appetite", description: "Eating and drinking normally" },
  { key: "happiness", label: "Happiness", description: "Still showing interest and joy" },
  { key: "mobility", label: "Mobility", description: "Getting around without help" },
  { key: "overall", label: "Overall", description: "Your gut sense of their quality of life today" },
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
