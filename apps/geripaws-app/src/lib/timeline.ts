import type { HabitLog, QolResponse } from '@geripaws/shared';

import { fetchAllAilmentNotesForPet, type AilmentNoteWithAilment } from './ailments';
import { fetchHabitLogs } from './habits';
import { fetchAllDosesForPet, type MedicationDoseWithMedication } from './medications';
import { fetchQolResponses } from './qol';

export type TimelineEntry =
  | { kind: 'habit'; id: string; occurredAt: string; log: HabitLog }
  | { kind: 'dose'; id: string; occurredAt: string; dose: MedicationDoseWithMedication }
  | { kind: 'qol'; id: string; occurredAt: string; response: QolResponse }
  | { kind: 'ailment_note'; id: string; occurredAt: string; note: AilmentNoteWithAilment };

export async function fetchTimeline(petId: string, limit = 100): Promise<TimelineEntry[]> {
  const [habitLogs, doses, qolResponses, ailmentNotes] = await Promise.all([
    fetchHabitLogs(petId, limit),
    fetchAllDosesForPet(petId, limit),
    fetchQolResponses(petId, limit),
    fetchAllAilmentNotesForPet(petId, limit),
  ]);

  const entries: TimelineEntry[] = [
    ...habitLogs.map((log): TimelineEntry => ({ kind: 'habit', id: log.id, occurredAt: log.occurred_at, log })),
    ...doses.map(
      (dose): TimelineEntry => ({ kind: 'dose', id: dose.id, occurredAt: dose.given_at ?? dose.scheduled_at, dose })
    ),
    ...qolResponses.map(
      (response): TimelineEntry => ({ kind: 'qol', id: response.id, occurredAt: response.occurred_at, response })
    ),
    ...ailmentNotes.map(
      (note): TimelineEntry => ({ kind: 'ailment_note', id: note.id, occurredAt: note.occurred_at, note })
    ),
  ];

  entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return entries.slice(0, limit);
}
