import { describe, expect, it } from 'vitest';
import type { HabitLog, HabitScheduleRow } from '@geripaws/shared';
import { computeHabitDueStatus } from './habit-due-status';

const TZ = 'America/New_York';
const DAY_START = new Date('2026-01-15T05:00:00Z'); // midnight EST

function walkSchedule(times: string[]): HabitScheduleRow[] {
  return [{ pet_id: 'pet-1', type: 'walk', schedule: { kind: 'times_per_day', times }, updated_at: DAY_START.toISOString() }];
}

function walkLog(occurredAt: string): HabitLog {
  return {
    id: 'log-1',
    pet_id: 'pet-1',
    type: 'walk',
    occurred_at: occurredAt,
    created_at: occurredAt,
    logged_by: null,
    details: {},
    photo_url: null,
  };
}

describe('computeHabitDueStatus', () => {
  it('is not overdue when logged at or after the due time, within grace', () => {
    // Due 17:45 EST (22:45 UTC); logged right at the due time; now 15 min later.
    const schedules = walkSchedule(['17:45']);
    const logs = [walkLog('2026-01-15T22:45:00Z')];
    const now = new Date('2026-01-15T23:00:00Z');
    expect(computeHabitDueStatus('walk', schedules, logs, DAY_START, TZ, 10, now)).toBe('none');
  });

  it('is NOT overdue when logged within the grace window before the due time (regression)', () => {
    // Due 17:45 EST, grace 10 min; walked 5 minutes early at 17:40 (within the
    // grace window); now is 18:00, 15 minutes past the due time — well past
    // grace, which is exactly the state that used to incorrectly flip to
    // 'overdue' despite the walk already having happened.
    const schedules = walkSchedule(['17:45']);
    const logs = [walkLog('2026-01-15T22:40:00Z')]; // 17:40 EST
    const now = new Date('2026-01-15T23:00:00Z'); // 18:00 EST
    expect(computeHabitDueStatus('walk', schedules, logs, DAY_START, TZ, 10, now)).toBe('none');
  });

  it('is overdue when logged more than the grace window before the due time and nothing since', () => {
    // Walked at 17:00 (45 min before the 17:45 due time — outside a 10-min grace); now is 18:00 (15 min past due).
    const schedules = walkSchedule(['17:45']);
    const logs = [walkLog('2026-01-15T22:00:00Z')]; // 17:00 EST
    const now = new Date('2026-01-15T23:00:00Z'); // 18:00 EST
    expect(computeHabitDueStatus('walk', schedules, logs, DAY_START, TZ, 10, now)).toBe('overdue');
  });

  it('is overdue when nothing was logged at all and the grace window has passed', () => {
    const schedules = walkSchedule(['17:45']);
    const now = new Date('2026-01-15T23:00:00Z'); // 18:00 EST, 15 min past due
    expect(computeHabitDueStatus('walk', schedules, [], DAY_START, TZ, 10, now)).toBe('overdue');
  });
});
