import type {
  Ailment,
  HabitLog,
  IncidentDetails,
  Medication,
  Pet,
  QolResponse,
  VetQuestion,
  WeightDetails,
} from '@geripaws/shared';

import { fetchAilments, fetchVetQuestions } from './ailments';
import { fetchHabitLogs } from './habits';
import { fetchMedications } from './medications';
import { fetchPet } from './pets';
import { fetchQolResponses } from './qol';
import { formatDate, formatDateTime, summarizeSchedule } from './format';

export interface VetSummaryData {
  pet: Pet;
  ailments: Ailment[];
  medications: Medication[];
  openQuestions: (VetQuestion & { ailmentName: string })[];
  answeredQuestions: (VetQuestion & { ailmentName: string })[];
  recentIncidents: HabitLog[];
  qolResponses: QolResponse[];
  weightLogs: HabitLog[];
}

const RECENT_DAYS = 30;

export async function fetchVetSummaryData(petId: string): Promise<VetSummaryData> {
  const pet = await fetchPet(petId);
  const [allAilments, medications, allLogs, qolResponses] = await Promise.all([
    fetchAilments(petId),
    fetchMedications(petId),
    fetchHabitLogs(petId, 200),
    fetchQolResponses(petId, 12),
  ]);

  const ailments = allAilments.filter((a) => a.status !== 'resolved');
  const activeMedications = medications.filter((m) => !m.active_until || new Date(m.active_until) >= new Date());

  const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);
  const recentIncidents = allLogs.filter((l) => l.type === 'incident' && new Date(l.occurred_at) >= since);
  const weightLogs = allLogs.filter((l) => l.type === 'weight').slice(0, 12);

  const questionsByAilment = await Promise.all(
    ailments.map(async (ailment) => {
      const questions = await fetchVetQuestions(ailment.id);
      return questions.map((q) => ({ ...q, ailmentName: ailment.name }));
    })
  );
  const allQuestions = questionsByAilment.flat();

  return {
    pet,
    ailments,
    medications: activeMedications,
    openQuestions: allQuestions.filter((q) => q.status === 'open'),
    answeredQuestions: allQuestions.filter((q) => q.status === 'answered'),
    recentIncidents,
    qolResponses,
    weightLogs,
  };
}

function ageFromDob(dob: string | null): string | null {
  if (!dob) return null;
  const years = (Date.now() - new Date(dob).getTime()) / (365.25 * 86_400_000);
  return years < 1 ? `${Math.round(years * 12)} months` : `${years.toFixed(1)} years`;
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildVetSummaryHtml(data: VetSummaryData): string {
  const age = ageFromDob(data.pet.dob);
  const generatedAt = formatDateTime(new Date().toISOString());

  const ailmentsHtml =
    data.ailments.length === 0
      ? '<p class="muted">None recorded.</p>'
      : data.ailments
          .map(
            (a) => `
        <div class="item">
          <div class="item-title">${esc(a.name)} <span class="tag">${esc(a.status)}</span></div>
          ${a.diagnosed_at ? `<div class="muted">Diagnosed ${esc(formatDate(a.diagnosed_at))}${a.diagnosing_vet ? ` by ${esc(a.diagnosing_vet)}` : ''}</div>` : ''}
          ${a.notes ? `<div>${esc(a.notes)}</div>` : ''}
        </div>`
          )
          .join('');

  const medsHtml =
    data.medications.length === 0
      ? '<p class="muted">None recorded.</p>'
      : data.medications
          .map(
            (m) => `
        <div class="item">
          <div class="item-title">${esc(m.name)} — ${esc(m.dosage)} ${esc(m.unit)}${m.route ? ` (${esc(m.route)})` : ''}</div>
          <div class="muted">${esc(summarizeSchedule(m.schedule))}</div>
        </div>`
          )
          .join('');

  const incidentsHtml =
    data.recentIncidents.length === 0
      ? `<p class="muted">None in the last ${RECENT_DAYS} days.</p>`
      : data.recentIncidents
          .map((log) => {
            const details = log.details as IncidentDetails;
            return `
        <div class="item">
          <div class="item-title">${esc(details.category)}${details.severity ? ` — ${esc(details.severity)}` : ''}</div>
          <div class="muted">${esc(formatDateTime(log.occurred_at))}</div>
          ${details.notes ? `<div>${esc(details.notes)}</div>` : ''}
        </div>`;
          })
          .join('');

  const qolHtml =
    data.qolResponses.length === 0
      ? '<p class="muted">Not tracked.</p>'
      : `<table>
          <tr><th>Date</th><th>Score</th></tr>
          ${data.qolResponses
            .map((r) => `<tr><td>${esc(formatDate(r.survey_date))}</td><td>${Math.round(r.total_score)} / 70</td></tr>`)
            .join('')}
        </table>`;

  const weightHtml =
    data.weightLogs.length === 0
      ? '<p class="muted">Not tracked.</p>'
      : `<table>
          <tr><th>Date</th><th>Weight</th></tr>
          ${data.weightLogs
            .map((log) => {
              const details = log.details as WeightDetails;
              return `<tr><td>${esc(formatDate(log.occurred_at))}</td><td>${details.value} ${esc(details.unit)}</td></tr>`;
            })
            .join('')}
        </table>`;

  const questionsHtml = (questions: (VetQuestion & { ailmentName: string })[], answered: boolean) =>
    questions.length === 0
      ? '<p class="muted">None.</p>'
      : questions
          .map(
            (q) => `
        <div class="item">
          <div class="item-title">${esc(q.question)}</div>
          <div class="muted">Re: ${esc(q.ailmentName)}</div>
          ${answered && q.answer ? `<div><strong>Answer:</strong> ${esc(q.answer)}</div>` : ''}
        </div>`
          )
          .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 24px; max-width: 700px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .muted { color: #666; font-size: 13px; }
  .item { margin-bottom: 10px; }
  .item-title { font-weight: 600; }
  .tag { font-size: 11px; font-weight: normal; color: #666; border: 1px solid #ccc; border-radius: 4px; padding: 1px 6px; margin-left: 6px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #eee; }
  .footer { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
</style>
</head>
<body>
  <h1>${esc(data.pet.name)}</h1>
  <div class="muted">${esc([data.pet.breed, age, data.pet.sex].filter(Boolean).join(' · '))}</div>
  <div class="muted">Generated ${esc(generatedAt)}</div>

  <h2>Active conditions</h2>
  ${ailmentsHtml}

  <h2>Current medications</h2>
  ${medsHtml}

  <h2>Incidents — last ${RECENT_DAYS} days</h2>
  ${incidentsHtml}

  <h2>Quality of Life trend</h2>
  ${qolHtml}

  <h2>Weight trend</h2>
  ${weightHtml}

  <h2>Open questions for the vet</h2>
  ${questionsHtml(data.openQuestions, false)}

  <h2>Previously answered questions</h2>
  ${questionsHtml(data.answeredQuestions, true)}

  <div class="footer">Generated by GeriPaws — a caregiver-maintained log, not a substitute for veterinary records or advice.</div>
</body>
</html>`;
}
