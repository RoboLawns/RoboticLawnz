"use client";

import type { Mower } from "@roboticlawnz/shared-types";

import { apiFetch } from "./api";
import type { Page } from "./sales-client";

type GetToken = () => Promise<string | null>;

export interface MowerListParams {
  brand?: string;
  nav?: string;
  drive?: string;
  min_area?: number;
  max_price?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listPublicMowers(
  params: MowerListParams = {},
  getToken?: GetToken,
): Promise<Page<Mower>> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === "") continue;
    qs.set(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiFetch<Page<Mower>>(`/mowers${suffix}`, { getToken });
}

export async function getPublicMower(slug: string, getToken?: GetToken): Promise<Mower> {
  return apiFetch<Mower>(`/mowers/${encodeURIComponent(slug)}`, { getToken });
}
