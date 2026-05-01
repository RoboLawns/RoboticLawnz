import { z } from "zod";

export const NavigationType = z.enum(["wire", "rtk", "vision", "lidar", "hybrid"]);
export type NavigationType = z.infer<typeof NavigationType>;

export const DriveType = z.enum(["2wd", "awd", "tracks"]);
export type DriveType = z.infer<typeof DriveType>;

export const Mower = z.object({
  id: z.string().uuid(),
  brand: z.string(),
  model: z.string(),
  slug: z.string(),
  price_usd: z.number().nonnegative(),
  max_area_sqft: z.number().int().positive(),
  max_slope_pct: z.number().int().min(0),
  min_passage_inches: z.number().positive(),
  navigation_type: NavigationType,
  drive_type: DriveType,
  cutting_width_inches: z.number().positive(),
  cutting_height_min: z.number(),
  cutting_height_max: z.number(),
  battery_minutes: z.number().int().positive(),
  noise_db: z.number().int().nullable(),
  rain_handling: z.boolean(),
  has_gps_theft_protection: z.boolean(),
  product_url: z.string().url(),
  affiliate_url: z.string().url().nullable(),
  image_url: z.string().url(),
  manufacturer_specs_url: z.string().url(),
  is_active: z.boolean(),
  data_updated_at: z.string().datetime(),
});
export type Mower = z.infer<typeof Mower>;
