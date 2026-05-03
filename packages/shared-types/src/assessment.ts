import { z } from "zod";

export const AssessmentStatus = z.enum(["draft", "completed", "abandoned"]);
export type AssessmentStatus = z.infer<typeof AssessmentStatus>;

export const ObstacleType = z.enum([
  "tree",
  "flower_bed",
  "pool",
  "sprinkler_head",
  "slope_too_steep",
  "other",
]);
export type ObstacleType = z.infer<typeof ObstacleType>;

export const Obstacle = z.object({
  type: ObstacleType,
  lat: z.number(),
  lng: z.number(),
  notes: z.string().optional(),
});
export type Obstacle = z.infer<typeof Obstacle>;

export const Gate = z.object({
  width_inches: z.number().positive(),
  lat: z.number(),
  lng: z.number(),
  label: z.string().optional(),
});
export type Gate = z.infer<typeof Gate>;

export const SlopeSample = z.object({
  lat: z.number(),
  lng: z.number(),
  angle_deg: z.number(),
  accuracy: z.number().optional(),
  recorded_at: z.string().datetime(),
});
export type SlopeSample = z.infer<typeof SlopeSample>;

export const GrassGuess = z.object({
  species: z.string(),
  confidence: z.number().min(0).max(1),
});
export type GrassGuess = z.infer<typeof GrassGuess>;

export const PolygonGeoJSON = z.object({
  type: z.literal("Polygon"),
  // GeoJSON: array of linear rings; each ring is an array of [lng, lat] tuples.
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});
export type PolygonGeoJSON = z.infer<typeof PolygonGeoJSON>;

export const Assessment = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  session_id: z.string(),
  status: AssessmentStatus,
  address: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  lawn_polygon: PolygonGeoJSON.nullable(),
  lawn_area_sqft: z.number().nullable(),
  max_slope_pct: z.number().nullable(),
  avg_slope_pct: z.number().nullable(),
  slope_samples: z.array(SlopeSample),
  grass_type_guesses: z.array(GrassGuess),
  grass_photo_url: z.string().url().nullable(),
  obstacles: z.array(Obstacle),
  gates: z.array(Gate),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
});
export type Assessment = z.infer<typeof Assessment>;

export const MapView = z.object({
  center_lat: z.number(),
  center_lng: z.number(),
  zoom: z.number(),
  bearing: z.number().default(0),
  width_px: z.number().int().positive(),
  height_px: z.number().int().positive(),
});
export type MapView = z.infer<typeof MapView>;

export const LawnSegmentRequest = z.object({
  map_image_url: z.string().url(),
  click_points: z.array(z.tuple([z.number(), z.number()])).min(1).max(10),
  map_view: MapView,
});
export type LawnSegmentRequest = z.infer<typeof LawnSegmentRequest>;

export const LawnSegmentResponse = z.object({
  polygon: PolygonGeoJSON,
  area_sqft: z.number(),
  fallback_to_manual: z.boolean(),
});
export type LawnSegmentResponse = z.infer<typeof LawnSegmentResponse>;
