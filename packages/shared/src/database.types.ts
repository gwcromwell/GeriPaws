// GENERATED from a live introspection of the production schema
// (information_schema.columns / pg_enum) — see supabase/migrations for the
// authoritative source. Regenerate whenever a migration changes the schema;
// there is no automated codegen step for this yet (would need either a
// Supabase personal access token for `supabase gen types typescript
// --project-id`, or Docker for the local-introspection path — neither is
// available in this dev environment, so this was generated via a one-off
// direct-connection introspection script instead).
/* eslint-disable */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type AilmentStatus = 'active' | 'monitoring' | 'resolved';
type HabitType = 'walk' | 'water' | 'food' | 'incident' | 'weight';
type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
type NotificationKind = 'medication_overdue' | 'refill_low' | 'qol_overdue';
type PetRole = 'owner' | 'caregiver' | 'viewer';
type PetStatus = 'active' | 'passed';
type QolCadence = 'daily' | 'weekly' | 'monthly';
type VetQuestionStatus = 'open' | 'answered';

export interface Database {
  public: {
    Tables: {
      ailment_notes: {
        Row: {
          id: string;
          pet_id: string;
          ailment_id: string;
          occurred_at: string;
          created_at: string;
          note: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          pet_id: string;
          ailment_id: string;
          occurred_at?: string;
          created_at?: string;
          note: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          pet_id?: string;
          ailment_id?: string;
          occurred_at?: string;
          created_at?: string;
          note?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      ailments: {
        Row: {
          id: string;
          pet_id: string;
          name: string;
          diagnosed_at: string | null;
          diagnosing_vet: string | null;
          status: AilmentStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          name: string;
          diagnosed_at?: string | null;
          diagnosing_vet?: string | null;
          status?: AilmentStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          name?: string;
          diagnosed_at?: string | null;
          diagnosing_vet?: string | null;
          status?: AilmentStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          pet_id: string;
          entity_type: string;
          entity_id: string;
          storage_path: string;
          media_type: string;
          mime_type: string;
          size_bytes: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          entity_type: string;
          entity_id: string;
          storage_path: string;
          media_type: string;
          mime_type: string;
          size_bytes: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          entity_type?: string;
          entity_id?: string;
          storage_path?: string;
          media_type?: string;
          mime_type?: string;
          size_bytes?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      habit_logs: {
        Row: {
          id: string;
          pet_id: string;
          type: HabitType;
          occurred_at: string;
          created_at: string;
          logged_by: string | null;
          details: Json;
          photo_url: string | null;
        };
        Insert: {
          id?: string;
          pet_id: string;
          type: HabitType;
          occurred_at?: string;
          created_at?: string;
          logged_by?: string | null;
          details?: Json;
          photo_url?: string | null;
        };
        Update: {
          id?: string;
          pet_id?: string;
          type?: HabitType;
          occurred_at?: string;
          created_at?: string;
          logged_by?: string | null;
          details?: Json;
          photo_url?: string | null;
        };
        Relationships: [];
      };
      medication_doses: {
        Row: {
          id: string;
          pet_id: string;
          medication_id: string;
          scheduled_at: string;
          given_at: string | null;
          created_at: string;
          given_by: string | null;
          skipped: boolean;
          notes: string | null;
        };
        Insert: {
          id?: string;
          pet_id: string;
          medication_id: string;
          scheduled_at: string;
          given_at?: string | null;
          created_at?: string;
          given_by?: string | null;
          skipped?: boolean;
          notes?: string | null;
        };
        Update: {
          id?: string;
          pet_id?: string;
          medication_id?: string;
          scheduled_at?: string;
          given_at?: string | null;
          created_at?: string;
          given_by?: string | null;
          skipped?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      medication_refills: {
        Row: {
          medication_id: string;
          pet_id: string;
          count_on_hand: number;
          unit_per_dose: number;
          low_stock_threshold: number;
          last_updated_at: string;
        };
        Insert: {
          medication_id: string;
          pet_id: string;
          count_on_hand?: number;
          unit_per_dose?: number;
          low_stock_threshold?: number;
          last_updated_at?: string;
        };
        Update: {
          medication_id?: string;
          pet_id?: string;
          count_on_hand?: number;
          unit_per_dose?: number;
          low_stock_threshold?: number;
          last_updated_at?: string;
        };
        Relationships: [];
      };
      medications: {
        Row: {
          id: string;
          pet_id: string;
          ailment_id: string | null;
          name: string;
          dosage: string;
          unit: string;
          route: string | null;
          schedule: Json;
          active_from: string;
          active_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          ailment_id?: string | null;
          name: string;
          dosage: string;
          unit: string;
          route?: string | null;
          schedule?: Json;
          active_from?: string;
          active_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          ailment_id?: string | null;
          name?: string;
          dosage?: string;
          unit?: string;
          route?: string | null;
          schedule?: Json;
          active_from?: string;
          active_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_log: {
        Row: {
          id: string;
          pet_id: string;
          kind: NotificationKind;
          reference_id: string;
          notif_date: string;
          sent_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          kind: NotificationKind;
          reference_id: string;
          notif_date?: string;
          sent_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          kind?: NotificationKind;
          reference_id?: string;
          notif_date?: string;
          sent_at?: string;
        };
        Relationships: [];
      };
      pet_invites: {
        Row: {
          id: string;
          pet_id: string;
          email: string;
          role: PetRole;
          token: string;
          status: InviteStatus;
          invited_by: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          email: string;
          role: PetRole;
          token?: string;
          status?: InviteStatus;
          invited_by?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          email?: string;
          role?: PetRole;
          token?: string;
          status?: InviteStatus;
          invited_by?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [];
      };
      pet_members: {
        Row: {
          pet_id: string;
          user_id: string;
          role: PetRole;
          invited_by: string | null;
          joined_at: string;
          show_walk_tile: boolean;
          show_water_tile: boolean;
          show_food_tile: boolean;
          show_weight_tile: boolean;
          hide_given_doses: boolean;
        };
        Insert: {
          pet_id: string;
          user_id: string;
          role: PetRole;
          invited_by?: string | null;
          joined_at?: string;
          show_walk_tile?: boolean;
          show_water_tile?: boolean;
          show_food_tile?: boolean;
          show_weight_tile?: boolean;
          hide_given_doses?: boolean;
        };
        Update: {
          pet_id?: string;
          user_id?: string;
          role?: PetRole;
          invited_by?: string | null;
          joined_at?: string;
          show_walk_tile?: boolean;
          show_water_tile?: boolean;
          show_food_tile?: boolean;
          show_weight_tile?: boolean;
          hide_given_doses?: boolean;
        };
        Relationships: [];
      };
      pet_share_links: {
        Row: {
          id: string;
          pet_id: string;
          token: string;
          created_by: string | null;
          created_at: string;
          expires_at: string;
          revoked: boolean;
        };
        Insert: {
          id?: string;
          pet_id: string;
          token?: string;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string;
          revoked?: boolean;
        };
        Update: {
          id?: string;
          pet_id?: string;
          token?: string;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string;
          revoked?: boolean;
        };
        Relationships: [];
      };
      pets: {
        Row: {
          id: string;
          name: string;
          species: string;
          breed: string | null;
          dob: string | null;
          sex: string | null;
          weight_unit: string;
          photo_url: string | null;
          status: PetStatus;
          day_boundary_hour: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          timezone: string;
          neutered: boolean | null;
          microchip_number: string | null;
          vet_name: string | null;
          vet_phone: string | null;
          allergies: string | null;
          insurance_provider: string | null;
          insurance_policy_number: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          species?: string;
          breed?: string | null;
          dob?: string | null;
          sex?: string | null;
          weight_unit?: string;
          photo_url?: string | null;
          status?: PetStatus;
          day_boundary_hour?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          timezone?: string;
          neutered?: boolean | null;
          microchip_number?: string | null;
          vet_name?: string | null;
          vet_phone?: string | null;
          allergies?: string | null;
          insurance_provider?: string | null;
          insurance_policy_number?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          species?: string;
          breed?: string | null;
          dob?: string | null;
          sex?: string | null;
          weight_unit?: string;
          photo_url?: string | null;
          status?: PetStatus;
          day_boundary_hour?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          timezone?: string;
          neutered?: boolean | null;
          microchip_number?: string | null;
          vet_name?: string | null;
          vet_phone?: string | null;
          allergies?: string | null;
          insurance_provider?: string | null;
          insurance_policy_number?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          platform?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      qol_responses: {
        Row: {
          id: string;
          pet_id: string;
          survey_date: string;
          occurred_at: string;
          created_at: string;
          answered_by: string | null;
          scores: Json;
          total_score: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          pet_id: string;
          survey_date?: string;
          occurred_at?: string;
          created_at?: string;
          answered_by?: string | null;
          scores: Json;
          total_score: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          pet_id?: string;
          survey_date?: string;
          occurred_at?: string;
          created_at?: string;
          answered_by?: string | null;
          scores?: Json;
          total_score?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      qol_settings: {
        Row: {
          pet_id: string;
          enabled: boolean;
          cadence: QolCadence;
          updated_at: string;
          show_on_today: boolean;
        };
        Insert: {
          pet_id: string;
          enabled?: boolean;
          cadence?: QolCadence;
          updated_at?: string;
          show_on_today?: boolean;
        };
        Update: {
          pet_id?: string;
          enabled?: boolean;
          cadence?: QolCadence;
          updated_at?: string;
          show_on_today?: boolean;
        };
        Relationships: [];
      };
      vet_questions: {
        Row: {
          id: string;
          pet_id: string;
          ailment_id: string;
          question: string;
          status: VetQuestionStatus;
          answer: string | null;
          asked_at: string | null;
          answered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pet_id: string;
          ailment_id: string;
          question: string;
          status?: VetQuestionStatus;
          answer?: string | null;
          asked_at?: string | null;
          answered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          pet_id?: string;
          ailment_id?: string;
          question?: string;
          status?: VetQuestionStatus;
          answer?: string | null;
          asked_at?: string | null;
          answered_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      is_pet_member: {
        Args: { target_pet_id: string; min_role?: PetRole };
        Returns: boolean;
      };
      accept_pet_invite: {
        Args: { invite_token: string };
        Returns: string;
      };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      ailment_status: AilmentStatus;
      habit_type: HabitType;
      invite_status: InviteStatus;
      notification_kind: NotificationKind;
      pet_role: PetRole;
      pet_status: PetStatus;
      qol_cadence: QolCadence;
      vet_question_status: VetQuestionStatus;
    };
  };
}
