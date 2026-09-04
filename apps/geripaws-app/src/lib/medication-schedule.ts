import { computeDueTimesForDay, type Medication, type MedicationDose } from '@geripaws/shared';

export type DueDoseStatus = 'due' | 'overdue' | 'given' | 'skipped';

export interface DueDose {
  medication: Medication;
  scheduledAt: Date;
  status: DueDoseStatus;
  dose?: MedicationDose;
}

export function getDayStart(now: Date, dayBoundaryHour: number): Date {
  const start = new Date(now);
  start.setHours(dayBoundaryHour, 0, 0, 0);
  if (start > now) start.setDate(start.getDate() - 1);
  return start;
}

function isMedicationActive(medication: Medication, now: Date): boolean {
  if (new Date(medication.active_from) > now) return false;
  if (medication.active_until) {
    const until = new Date(medication.active_until);
    until.setHours(23, 59, 59, 999);
    if (until < now) return false;
  }
  return true;
}

export function computeTodayDueDoses(
  dayBoundaryHour: number,
  medications: Medication[],
  dosesToday: MedicationDose[],
  now: Date = new Date()
): DueDose[] {
  const dayStart = getDayStart(now, dayBoundaryHour);
  const result: DueDose[] = [];

  for (const medication of medications) {
    if (medication.schedule.kind === 'as_needed') continue;
    if (!isMedicationActive(medication, now)) continue;

    for (const scheduledAt of computeDueTimesForDay(medication.schedule, dayStart)) {
      // Compare by instant, not string equality — Postgres returns timestamptz as
      // "...+00:00" while JS's toISOString() produces "...Z", so a round-tripped
      // timestamp never matches its original string even for the same instant.
      const existing = dosesToday.find(
        (d) => d.medication_id === medication.id && new Date(d.scheduled_at).getTime() === scheduledAt.getTime()
      );

      let status: DueDoseStatus;
      if (existing?.skipped) status = 'skipped';
      else if (existing?.given_at) status = 'given';
      else if (scheduledAt < now) status = 'overdue';
      else status = 'due';

      result.push({ medication, scheduledAt, status, dose: existing });
    }
  }

  return result.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}
