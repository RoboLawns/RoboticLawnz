import { z } from "zod";

import { Mower } from "./mower";

export const FitStatus = z.enum(["green", "yellow", "red"]);
export type FitStatus = z.infer<typeof FitStatus>;

export const ReasonSeverity = FitStatus;
export type ReasonSeverity = FitStatus;

/**
 * Reason `type` slugs are stable identifiers used by the frontend to render
 * icons / copy. Backend writes them; frontend maps them to display strings.
 */
export const ReasonType = z.enum([
  "area_too_large",
  "slope_too_steep",
  "gate_too_narrow",
  "area_near_limit",
  "slope_near_limit",
  "awd_advantage",
  "ideal_match",
  "rtk_required_clear_sky",
  "wire_install_required",
  "narrow_passage_match",
]);
export type ReasonType = z.infer<typeof ReasonType>;

export const Reason = z.object({
  type: ReasonType,
  severity: ReasonSeverity,
  message: z.string(),
});
export type Reason = z.infer<typeof Reason>;

export const Recommendation = z.object({
  id: z.string().uuid(),
  assessment_id: z.string().uuid(),
  mower_id: z.string().uuid(),
  fit_score: z.number().int().min(0).max(100),
  fit_status: FitStatus,
  reasons: z.array(Reason),
  rank: z.number().int(),
  created_at: z.string().datetime(),
});
export type Recommendation = z.infer<typeof Recommendation>;

export const RecommendationWithMower = Recommendation.extend({ mower: Mower });
export type RecommendationWithMower = z.infer<typeof RecommendationWithMower>;
