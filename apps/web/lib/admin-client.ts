"use client";

import type { Mower } from "@zippylawnz/shared-types";

import { apiFetch } from "./api";
import type { Page } from "./sales-client";

type GetToken = () => Promise<string | null>;

export type MowerInput = Omit<Mower, "id" | "data_updated_at">;

export async function listAdminMowers(
  params: { q?: string; include_inactive?: boolean; limit?: number; offset?: number },
  getToken: GetToken,
): Promise<Page<Mower>> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.include_inactive != null) qs.set("include_inactive", String(params.include_inactive));
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Page<Mower>>(`/admin/mowers${suffix}`, { getToken });
}

export async function getAdminMower(id: string, getToken: GetToken): Promise<Mower> {
  return apiFetch<Mower>(`/admin/mowers/${id}`, { getToken });
}

export async function createMower(payload: MowerInput, getToken: GetToken): Promise<Mower> {
  return apiFetch<Mower>(`/admin/mowers`, { method: "POST", body: payload, getToken });
}

export async function updateMower(
  id: string,
  payload: Partial<MowerInput>,
  getToken: GetToken,
): Promise<Mower> {
  return apiFetch<Mower>(`/admin/mowers/${id}`, { method: "PUT", body: payload, getToken });
}

export async function deleteMower(id: string, getToken: GetToken): Promise<void> {
  return apiFetch<void>(`/admin/mowers/${id}`, { method: "DELETE", getToken });
}
