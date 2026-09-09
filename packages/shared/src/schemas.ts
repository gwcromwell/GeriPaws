import { z } from "zod";

export const petRoleSchema = z.enum(["owner", "caregiver", "viewer"]);

export const createPetSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  breed: z.string().trim().max(80).optional(),
  dob: z.string().date().optional(),
  sex: z.string().trim().max(20).optional(),
  neutered: z.boolean().optional(),
  weightUnit: z.enum(["lb", "kg"]).default("lb"),
  dayBoundaryHour: z.number().int().min(0).max(23).default(0),
});
export type CreatePetInput = z.infer<typeof createPetSchema>;

export const updatePetSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80).optional(),
  breed: z.string().trim().max(80).nullable().optional(),
  dob: z.string().date().nullable().optional(),
  sex: z.string().trim().max(20).nullable().optional(),
  neutered: z.boolean().nullable().optional(),
  photoUrl: z.string().url().nullable().optional(),
  weightUnit: z.enum(["lb", "kg"]).optional(),
  microchipNumber: z.string().trim().max(40).nullable().optional(),
  vetName: z.string().trim().max(120).nullable().optional(),
  vetPhone: z.string().trim().max(30).nullable().optional(),
  allergies: z.string().trim().max(500).nullable().optional(),
  insuranceProvider: z.string().trim().max(120).nullable().optional(),
  insurancePolicyNumber: z.string().trim().max(60).nullable().optional(),
});
export type UpdatePetInput = z.infer<typeof updatePetSchema>;

export const createInviteSchema = z.object({
  petId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
  role: petRoleSchema.exclude(["owner"]),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().uuid(),
});

export const memberPreferencesSchema = z.object({
  showWalkTile: z.boolean().optional(),
  showWaterTile: z.boolean().optional(),
  showFoodTile: z.boolean().optional(),
  showWeightTile: z.boolean().optional(),
  hideGivenDoses: z.boolean().optional(),
});
export type MemberPreferencesInput = z.infer<typeof memberPreferencesSchema>;
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

export const weightDetailsSchema = z.object({
  value: z.number().positive().max(500),
  unit: z.enum(["lb", "kg"]),
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
  z.object({
    type: z.literal("weight"),
    petId: z.string().uuid(),
    occurredAt: z.string().datetime({ offset: true }),
    details: weightDetailsSchema,
  }),
]);
export type HabitLogInput = z.infer<typeof habitLogInputSchema>;

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");

export const ailmentStatusSchema = z.enum(["active", "monitoring", "resolved"]);

export const createAilmentSchema = z.object({
  petId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(120),
  diagnosedAt: z.string().date().optional(),
  diagnosingVet: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreateAilmentInput = z.infer<typeof createAilmentSchema>;

export const updateAilmentSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  status: ailmentStatusSchema.optional(),
  diagnosedAt: z.string().date().optional(),
  diagnosingVet: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type UpdateAilmentInput = z.infer<typeof updateAilmentSchema>;

export const createAilmentNoteSchema = z.object({
  ailmentId: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }),
  note: z.string().trim().min(1, "Note can't be empty").max(1000),
});
export type CreateAilmentNoteInput = z.infer<typeof createAilmentNoteSchema>;

export const createVetQuestionSchema = z.object({
  ailmentId: z.string().uuid(),
  question: z.string().trim().min(1, "Question can't be empty").max(500),
});
export type CreateVetQuestionInput = z.infer<typeof createVetQuestionSchema>;

export const answerVetQuestionSchema = z.object({
  answer: z.string().trim().min(1, "Answer can't be empty").max(1000),
});
export type AnswerVetQuestionInput = z.infer<typeof answerVetQuestionSchema>;

export const medicationScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("times_per_day"), times: z.array(timeString).min(1).max(6) }),
  z.object({ kind: z.literal("interval_hours"), intervalHours: z.number().int().min(1).max(48), startTime: timeString }),
  z.object({
    kind: z.literal("specific_days"),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    times: z.array(timeString).min(1).max(6),
  }),
  z.object({ kind: z.literal("as_needed") }),
]);
export type MedicationScheduleInput = z.infer<typeof medicationScheduleSchema>;

export const createMedicationSchema = z.object({
  petId: z.string().uuid(),
  ailmentId: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Name is required").max(120),
  dosage: z.string().trim().min(1, "Dosage is required").max(50),
  unit: z.string().trim().min(1, "Unit is required").max(30),
  route: z.string().trim().max(50).optional(),
  schedule: medicationScheduleSchema,
  activeFrom: z.string().date().optional(),
  activeUntil: z.string().date().optional(),
});
export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;

export const updateMedicationSchema = createMedicationSchema.omit({ petId: true }).partial();
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;

export const refillSetupSchema = z.object({
  countOnHand: z.number().nonnegative(),
  unitPerDose: z.number().positive().default(1),
  lowStockThreshold: z.number().nonnegative().default(7),
});
export type RefillSetupInput = z.infer<typeof refillSetupSchema>;

const qolDimension = z.number().int().min(0).max(10);

export const qolCadenceSchema = z.enum(["daily", "weekly", "monthly"]);

export const qolSettingsSchema = z.object({
  enabled: z.boolean(),
  cadence: qolCadenceSchema,
  showOnToday: z.boolean().default(false),
});
export type QolSettingsInput = z.infer<typeof qolSettingsSchema>;

export const qolFullScoresSchema = z.object({
  scale: z.literal("full"),
  hurt: qolDimension,
  hunger: qolDimension,
  hydration: qolDimension,
  hygiene: qolDimension,
  happiness: qolDimension,
  mobility: qolDimension,
  moreGoodDaysThanBad: qolDimension,
});

export const qolQuickScoresSchema = z.object({
  scale: z.literal("quick"),
  comfort: qolDimension,
  appetite: qolDimension,
  happiness: qolDimension,
  mobility: qolDimension,
  overall: qolDimension,
});

export const qolScoresSchema = z.discriminatedUnion("scale", [qolFullScoresSchema, qolQuickScoresSchema]);

export const createQolResponseSchema = z.object({
  petId: z.string().uuid(),
  scores: qolScoresSchema,
  notes: z.string().trim().max(1000).optional(),
});
export type CreateQolResponseInput = z.infer<typeof createQolResponseSchema>;
