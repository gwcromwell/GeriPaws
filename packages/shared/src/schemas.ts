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
