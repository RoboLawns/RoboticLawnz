import { z } from "zod";

export const PreferredContact = z.enum(["email", "phone", "either"]);
export type PreferredContact = z.infer<typeof PreferredContact>;

export const LeadStatus = z.enum(["new", "contacted", "qualified", "sold", "lost"]);
export type LeadStatus = z.infer<typeof LeadStatus>;

export const LeadCreate = z.object({
  assessment_id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().optional(),
  preferred_contact: PreferredContact.default("email"),
  notes: z.string().max(1000).optional(),
});
export type LeadCreate = z.infer<typeof LeadCreate>;

export const Lead = z.object({
  id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().nullable(),
  preferred_contact: PreferredContact,
  notes: z.string().nullable(),
  zippylawnz_status: LeadStatus,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type Lead = z.infer<typeof Lead>;
