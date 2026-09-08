/**
 * Starting points for common geriatric dog conditions — deliberately limited
 * to the condition name and general, non-prescriptive monitoring guidance.
 * No specific drugs or dosages are suggested here: what to give and how
 * much is always the vet's call, entered manually in the Medications form.
 */
export interface ConditionTemplate {
  key: string;
  name: string;
  notes: string;
}

export const CONDITION_TEMPLATES: ConditionTemplate[] = [
  {
    key: 'osteoarthritis',
    name: 'Osteoarthritis',
    notes:
      'Commonly monitored via mobility, stiffness after rest, and reluctance to jump or climb stairs. Track medications and dosages exactly as prescribed by your vet.',
  },
  {
    key: 'ccd',
    name: 'Canine Cognitive Dysfunction (CCD)',
    notes:
      'Often monitored via disorientation, changed sleep-wake patterns, house-soiling, and reduced interest in family or toys.',
  },
  {
    key: 'ckd',
    name: 'Chronic Kidney Disease (CKD)',
    notes:
      'Typically monitored via water intake, appetite, weight, and energy level. Follow your vet\'s diet and medication guidance closely.',
  },
  {
    key: 'chf',
    name: 'Congestive Heart Failure (CHF)',
    notes: 'Often monitored via resting respiratory rate, coughing, exercise tolerance, and appetite.',
  },
  {
    key: 'epilepsy',
    name: 'Epilepsy / Seizure disorder',
    notes:
      'Track seizure frequency, duration, and triggers. Consistent medication timing is often especially important — ask your vet before changing a dose or schedule.',
  },
  {
    key: 'cancer',
    name: 'Cancer',
    notes:
      "Monitoring varies widely by type and treatment plan — follow your oncologist's specific guidance for what to track.",
  },
];
