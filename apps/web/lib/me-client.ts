"use client";

import type { Assessment } from "@roboticlawnz/shared-types";

import { apiFetch } from "./api";

type GetToken = () => Promise<string | null>;

export async function listMyAssessments(getToken: GetToken): Promise<Assessment[]> {
  return apiFetch<Assessment[]>("/me/assessments", { getToken });
}

export async function deleteMyAssessment(id: string, getToken: GetToken): Promise<void> {
  return apiFetch<void>(`/me/assessments/${id}`, { method: "DELETE", getToken });
}
