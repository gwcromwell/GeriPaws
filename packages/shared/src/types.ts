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
