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
