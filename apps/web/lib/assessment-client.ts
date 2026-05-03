"use client";

import type {
  Assessment,
  Gate,
  GrassGuess,
  LawnSegmentRequest,
  LawnSegmentResponse,
  Obstacle,
  PolygonGeoJSON,
  RecommendationWithMower,
  SlopeSample,
} from "@roboticlawnz/shared-types";

import { apiFetch } from "./api";

/** Optional Clerk token resolver — pass `useAuth().getToken` when signed in. */
type GetToken = () => Promise<string | null>;

/** API client functions used by the assessment flow pages. */

export async function getAssessment(id: string, getToken?: GetToken): Promise<Assessment> {
  return apiFetch<Assessment>(`/assessments/${id}`, { getToken });
}

export interface UpdatePayload {
  address?: string;
  lat?: number | null;
  lng?: number | null;
  lawn_polygon?: PolygonGeoJSON | null;
  lawn_area_sqft?: number;
  max_slope_pct?: number;
  avg_slope_pct?: number;
  slope_samples?: SlopeSample[];
  grass_type_guesses?: GrassGuess[];
  grass_photo_url?: string | null;
  obstacles?: Obstacle[];
  gates?: Gate[];
}

export async function patchAssessment(
  id: string,
  body: UpdatePayload,
  getToken?: GetToken,
): Promise<Assessment> {
  return apiFetch<Assessment>(`/assessments/${id}`, { method: "PATCH", body, getToken });
}

export async function appendSlopeSample(
  id: string,
  sample: { lat: number; lng: number; angle_deg: number; accuracy?: number | null },
  getToken?: GetToken,
): Promise<Assessment> {
  return apiFetch<Assessment>(`/assessments/${id}/slope-sample`, {
    method: "POST",
    body: sample,
    getToken,
  });
}

export async function completeAssessment(
  id: string,
  getToken?: GetToken,
): Promise<RecommendationWithMower[]> {
  return apiFetch<RecommendationWithMower[]>(`/assessments/${id}/complete`, {
    method: "POST",
    getToken,
  });
}

export async function getRecommendations(
  id: string,
  getToken?: GetToken,
): Promise<RecommendationWithMower[]> {
  return apiFetch<RecommendationWithMower[]>(`/assessments/${id}/recommendations`, { getToken });
}

export async function lawnSegment(
  id: string,
  payload: LawnSegmentRequest,
  getToken?: GetToken,
): Promise<LawnSegmentResponse> {
  return apiFetch<LawnSegmentResponse>(`/assessments/${id}/lawn-segment`, {
    method: "POST",
    body: payload,
    getToken,
  });
}
