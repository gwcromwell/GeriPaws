import { z } from "zod";

export const petRoleSchema = z.enum(["owner", "caregiver", "viewer"]);

export const createPetSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  breed: z.string().trim().max(80).optional(),
  dob: z.string().date().optional(),
  sex: z.string().trim().max(20).optional(),
  weightUnit: z.enum(["lb", "kg"]).default("lb"),
  dayBoundaryHour: z.number().int().min(0).max(23).default(0),
});
export type CreatePetInput = z.infer<typeof createPetSchema>;

export const createInviteSchema = z.object({
  petId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
  role: petRoleSchema.exclude(["owner"]),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().uuid(),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = signUpSchema;
export type SignInInput = z.infer<typeof signInSchema>;

const notes = z.string().trim().max(500).optional();

export const walkDetailsSchema = z.object({
  durationMin: z.number().int().positive().max(600).optional(),
  elimination: z.enum(["pee", "poop", "both", "none"]).optional(),
  stoolQuality: z.enum(["normal", "soft", "diarrhea", "hard", "bloody"]).optional(),
  diaperNeeded: z.boolean().optional(),
  diaperChanged: z.boolean().optional(),
  notes,
});

export const waterDetailsSchema = z.object({
  amount: z.string().trim().max(50).optional(),
  notes,
});

export const foodDetailsSchema = z.object({
  amount: z.string().trim().max(50).optional(),
  appetite: z.enum(["normal", "reduced", "refused", "increased"]).optional(),
  notes,
});

export const incidentDetailsSchema = z.object({
  category: z.enum(["urine", "stool", "vomit", "fall", "seizure", "disorientation", "other"]),
  location: z.string().trim().max(100).optional(),
  severity: z.enum(["mild", "moderate", "severe"]).optional(),
  durationMin: z.number().int().positive().max(600).optional(),
  notes,
});

export const habitLogInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("walk"),
    petId: z.string().uuid(),
    occurredAt: z.string().datetime({ offset: true }),
    details: walkDetailsSchema,
  }),
  z.object({
    type: z.literal("water"),
    petId: z.string().uuid(),
    occurredAt: z.string().datetime({ offset: true }),
    details: waterDetailsSchema,
  }),
  z.object({
    type: z.literal("food"),
    petId: z.string().uuid(),
    occurredAt: z.string().datetime({ offset: true }),
    details: foodDetailsSchema,
  }),
  z.object({
    type: z.literal("incident"),
    petId: z.string().uuid(),
    occurredAt: z.string().datetime({ offset: true }),
    details: incidentDetailsSchema,
  }),
]);
export type HabitLogInput = z.infer<typeof habitLogInputSchema>;
