"use client";

import type { Assessment, Lead, LeadStatus, RecommendationWithMower } from "@roboticlawnz/shared-types";

import { apiFetch } from "./api";

type GetToken = () => Promise<string | null>;

interface PageMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export async function listLeads(
  params: { status?: LeadStatus; limit?: number; offset?: number },
  getToken: GetToken,
): Promise<Page<Lead>> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Page<Lead>>(`/sales/leads${suffix}`, { getToken });
}

export async function updateLead(
  leadId: string,
  body: { zippylawnz_status?: LeadStatus; notes?: string },
  getToken: GetToken,
): Promise<Lead> {
  return apiFetch<Lead>(`/sales/leads/${leadId}`, { method: "PATCH", body, getToken });
}

export async function getSalesAssessment(
  assessmentId: string,
  getToken: GetToken,
): Promise<Assessment> {
  return apiFetch<Assessment>(`/sales/assessments/${assessmentId}`, { getToken });
}

export async function getSalesRecommendations(
  assessmentId: string,
  getToken: GetToken,
): Promise<RecommendationWithMower[]> {
  return apiFetch<RecommendationWithMower[]>(
    `/sales/assessments/${assessmentId}/recommendations`,
    { getToken },
  );
}
