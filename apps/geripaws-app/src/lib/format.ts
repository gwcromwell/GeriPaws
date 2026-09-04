import type {
  HabitLog,
  IncidentDetails,
  HabitType,
  WalkDetails,
  WaterDetails,
  FoodDetails,
} from '@geripaws/shared';

export const OVERDUE_HOURS: Record<Extract<HabitType, 'walk' | 'water' | 'food'>, number> = {
  walk: 8,
  water: 6,
  food: 8,
};

export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.round(diffMs / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function isOverdue(isoDate: string, type: HabitType): boolean {
  if (type === 'incident') return false;
  const hoursSince = (Date.now() - new Date(isoDate).getTime()) / 3_600_000;
  return hoursSince >= OVERDUE_HOURS[type];
}

export function formatDateTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const ELIMINATION_LABEL: Record<string, string> = { pee: 'Pee', poop: 'Poop', both: 'Pee & poop', none: 'Nothing' };
const APPETITE_LABEL: Record<string, string> = {
  normal: 'Normal appetite',
  reduced: 'Reduced appetite',
  refused: 'Refused food',
  increased: 'Increased appetite',
};
const SEVERITY_LABEL: Record<string, string> = { mild: 'Mild', moderate: 'Moderate', severe: 'Severe' };

export function summarizeHabitLog(log: HabitLog): string {
  const parts: string[] = [];

  if (log.type === 'walk') {
    const details = log.details as WalkDetails;
    if (details.durationMin) parts.push(`${details.durationMin} min`);
    if (details.elimination) parts.push(ELIMINATION_LABEL[details.elimination]);
    if (details.diaperChanged) parts.push('Diaper changed');
    else if (details.diaperNeeded) parts.push('Diaper needed');
  } else if (log.type === 'water') {
    const details = log.details as WaterDetails;
    if (details.amount) parts.push(details.amount);
  } else if (log.type === 'food') {
    const details = log.details as FoodDetails;
    if (details.amount) parts.push(details.amount);
    if (details.appetite) parts.push(APPETITE_LABEL[details.appetite]);
  } else if (log.type === 'incident') {
    const details = log.details as IncidentDetails;
    parts.push(details.category);
    if (details.severity) parts.push(SEVERITY_LABEL[details.severity]);
    if (details.durationMin) parts.push(`${details.durationMin} min`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'No details';
}

export const QUICK_TIME_OFFSETS = [
  { label: 'Now', minutesAgo: 0 },
  { label: '15m ago', minutesAgo: 15 },
  { label: '30m ago', minutesAgo: 30 },
  { label: '1h ago', minutesAgo: 60 },
  { label: '2h ago', minutesAgo: 120 },
  { label: '4h ago', minutesAgo: 240 },
] as const;
