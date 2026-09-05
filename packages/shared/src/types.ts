export type PetRole = "owner" | "caregiver" | "viewer";
export type PetStatus = "active" | "passed";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";

export interface Pet {
  id: string;
  name: string;
  species: "dog";
  breed: string | null;
  dob: string | null;
  sex: string | null;
  weight_unit: "lb" | "kg";
  photo_url: string | null;
  status: PetStatus;
  day_boundary_hour: number;
  /** IANA timezone (e.g. "America/New_York") — what medication schedule times are relative to. */
  timezone: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PetMember {
  pet_id: string;
  user_id: string;
  role: PetRole;
  invited_by: string | null;
  joined_at: string;
}

export interface PetInvite {
  id: string;
  pet_id: string;
  email: string;
  role: PetRole;
  token: string;
  status: InviteStatus;
  invited_by: string;
  created_at: string;
  expires_at: string;
}

export type HabitType = "walk" | "water" | "food" | "incident";

export type EliminationResult = "pee" | "poop" | "both" | "none";
export type StoolQuality = "normal" | "soft" | "diarrhea" | "hard" | "bloody";
export type AppetiteLevel = "normal" | "reduced" | "refused" | "increased";
export type IncidentCategory =
  | "urine"
  | "stool"
  | "vomit"
  | "fall"
  | "seizure"
  | "disorientation"
  | "other";
export type IncidentSeverity = "mild" | "moderate" | "severe";

export interface WalkDetails {
  durationMin?: number;
  elimination?: EliminationResult;
  stoolQuality?: StoolQuality;
  diaperNeeded?: boolean;
  diaperChanged?: boolean;
  notes?: string;
}

export interface WaterDetails {
  amount?: string;
  notes?: string;
}

export interface FoodDetails {
  amount?: string;
  appetite?: AppetiteLevel;
  notes?: string;
}

export interface IncidentDetails {
  category: IncidentCategory;
  location?: string;
  severity?: IncidentSeverity;
  durationMin?: number;
  notes?: string;
}

export type HabitDetails = WalkDetails | WaterDetails | FoodDetails | IncidentDetails;

export interface HabitLog {
  id: string;
  pet_id: string;
  type: HabitType;
  occurred_at: string;
  created_at: string;
  logged_by: string;
  details: HabitDetails;
  photo_url: string | null;
}

export type AilmentStatus = "active" | "monitoring" | "resolved";

export interface Ailment {
  id: string;
  pet_id: string;
  name: string;
  diagnosed_at: string | null;
  diagnosing_vet: string | null;
  status: AilmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AilmentNote {
  id: string;
  pet_id: string;
  ailment_id: string;
  occurred_at: string;
  created_at: string;
  note: string;
  created_by: string;
}

export type VetQuestionStatus = "open" | "answered";

export interface VetQuestion {
  id: string;
  pet_id: string;
  ailment_id: string;
  question: string;
  status: VetQuestionStatus;
  answer: string | null;
  asked_at: string | null;
  answered_at: string | null;
  created_at: string;
}

/**
 * times_per_day: fixed clock times every day, e.g. Keppra at 08:00 and 20:00.
 * interval_hours: every N hours starting from a given time, e.g. every 8 hours from 06:00.
 * specific_days: fixed clock times on selected weekdays only (0=Sunday..6=Saturday).
 * as_needed: PRN — no schedule to compute due times or a refill burn rate from.
 */
export type MedicationSchedule =
  | { kind: "times_per_day"; times: string[] }
  | { kind: "interval_hours"; intervalHours: number; startTime: string }
  | { kind: "specific_days"; daysOfWeek: number[]; times: string[] }
  | { kind: "as_needed" };

export interface Medication {
  id: string;
  pet_id: string;
  ailment_id: string | null;
  name: string;
  dosage: string;
  unit: string;
  route: string | null;
  schedule: MedicationSchedule;
  active_from: string;
  active_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicationDose {
  id: string;
  pet_id: string;
  medication_id: string;
  scheduled_at: string;
  given_at: string | null;
  created_at: string;
  given_by: string | null;
  skipped: boolean;
  notes: string | null;
}

export interface MedicationRefill {
  medication_id: string;
  pet_id: string;
  count_on_hand: number;
  unit_per_dose: number;
  low_stock_threshold: number;
  last_updated_at: string;
}

export type QolCadence = "daily" | "weekly" | "monthly";
export type QolScaleType = "full" | "quick";

export interface QolSettings {
  pet_id: string;
  enabled: boolean;
  cadence: QolCadence;
  updated_at: string;
}

/** The established veterinary end-of-life scale — 7 dimensions, 0-10 each, out of 70. */
export interface QolFullScores {
  scale: "full";
  hurt: number;
  hunger: number;
  hydration: number;
  hygiene: number;
  happiness: number;
  mobility: number;
  moreGoodDaysThanBad: number;
}

/** A shorter check-in for busy days — 5 dimensions, 0-10 each, normalized onto the same 0-70 scale as "full". */
export interface QolQuickScores {
  scale: "quick";
  comfort: number;
  appetite: number;
  happiness: number;
  mobility: number;
  overall: number;
}

export type QolScores = QolFullScores | QolQuickScores;

export interface QolResponse {
  id: string;
  pet_id: string;
  survey_date: string;
  occurred_at: string;
  created_at: string;
  answered_by: string;
  scores: QolScores;
  /** Always normalized to a 0-70 scale so full and quick check-ins plot on one trend line. */
  total_score: number;
  notes: string | null;
}
