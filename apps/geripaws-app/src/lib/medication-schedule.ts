import { computeDueTimesForDay, getDayStart, type Medication, type MedicationDose } from '@geripaws/shared';

export { getDayStart };

export type DueDoseStatus = 'due' | 'overdue' | 'given' | 'skipped';

export interface DueDose {
  medication: Medication;
  scheduledAt: Date;
  status: DueDoseStatus;
  dose?: MedicationDose;
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
  pet: { day_boundary_hour: number; timezone: string },
  medications: Medication[],
  dosesToday: MedicationDose[],
  now: Date = new Date()
): DueDose[] {
  const dayStart = getDayStart(now, pet.day_boundary_hour, pet.timezone);
  const result: DueDose[] = [];

  for (const medication of medications) {
    if (medication.schedule.kind === 'as_needed') continue;
    if (!isMedicationActive(medication, now)) continue;

    for (const scheduledAt of computeDueTimesForDay(medication.schedule, dayStart, pet.timezone)) {
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

export interface GroupedDueDoses {
  /** Past due, nothing logged — the thing a caregiver needs to see first. */
  overdue: DueDose[];
  /** Not yet due — the normal, low-urgency list. */
  upcoming: DueDose[];
  /** Given or skipped — already handled, no longer actionable. */
  settled: DueDose[];
}

/** Buckets an already-time-sorted `DueDose[]` by urgency, preserving that order within each bucket. */
export function groupDueDoses(dueDoses: DueDose[]): GroupedDueDoses {
  const overdue: DueDose[] = [];
  const upcoming: DueDose[] = [];
  const settled: DueDose[] = [];

  for (const due of dueDoses) {
    if (due.status === 'overdue') overdue.push(due);
    else if (due.status === 'given' || due.status === 'skipped') settled.push(due);
    else upcoming.push(due);
  }

  return { overdue, upcoming, settled };
}
