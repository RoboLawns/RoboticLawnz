"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { FitBadge } from "@/components/results/fit-badge";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, StatusPill } from "@/components/sales/status-pill";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getSalesAssessment, getSalesRecommendations, listLeads, updateLead } from "@/lib/sales-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Assessment, Lead, LeadStatus, RecommendationWithMower } from "@roboticlawnz/shared-types";

export default function SalesLeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const getToken = useApiAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [recs, setRecs] = useState<RecommendationWithMower[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [statusBusy, setStatusBusy] = useState(false);

  // Pull lead via the listLeads endpoint (no per-id sales endpoint exists yet —
  // status filter handles it). For MVP this is fine; if we hit perf issues we
  // can add GET /sales/leads/{id}.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      // Fetch the lead by paging through statuses until we find it.
      // For typical inboxes (<200 leads) this resolves in 1 request.
      (async () => {
        for (const s of [...LEAD_STATUSES, undefined]) {
          const page = await listLeads({ status: s as LeadStatus | undefined, limit: 200 }, getToken);
          const found = page.items.find((l) => l.id === id);
          if (found) return found;
        }
        return null;
      })(),
    ])
      .then(async ([foundLead]) => {
        if (cancelled) return;
        if (!foundLead) {
          setError("Lead not found.");
          return;
        }
        setLead(foundLead);
        setNotesDraft(foundLead.notes ?? "");
        const [a, r] = await Promise.all([
          getSalesAssessment(foundLead.assessment_id, getToken),
          getSalesRecommendations(foundLead.assessment_id, getToken).catch(() => []),
        ]);
        if (cancelled) return;
        setAssessment(a);
        setRecs(r);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.status === 403
            ? "Your account doesn't have sales-rep access."
            : e instanceof ApiError
              ? e.message
              : "Couldn't load lead.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, getToken]);

  const updateStatus = async (status: LeadStatus) => {
    if (!lead) return;
    setStatusBusy(true);
    try {
      const next = await updateLead(lead.id, { zippylawnz_status: status }, getToken);
      setLead(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't update status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const saveNotes = async () => {
    if (!lead) return;
    setSavingNotes(true);
    try {
      const next = await updateLead(lead.id, { notes: notesDraft }, getToken);
      setLead(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save notes.");
    } finally {
      setSavingNotes(false);
    }
  };

  if (error) {
    return (
      <div>
        <Link href="/sales/leads" className="text-sm text-leaf-700 hover:underline">
          ← Back to leads
        </Link>
        <p role="alert" className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-stone-200" />
        <div className="h-8 w-72 animate-pulse rounded bg-stone-200" />
        <div className="h-32 animate-pulse rounded-xl bg-stone-200" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/sales/leads" className="text-sm text-leaf-700 hover:underline">
          ← Back to leads
        </Link>
        <StatusPill status={lead.zippylawnz_status} />
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{lead.email}</h1>
          <p className="text-sm text-stone-600">
            {lead.phone ?? "no phone"} · prefers {lead.preferred_contact} ·
            captured {new Date(lead.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="status" className="text-sm font-medium">
            Move to
          </label>
          <Select
            id="status"
            value={lead.zippylawnz_status}
            disabled={statusBusy}
            onChange={(e) => updateStatus(e.target.value as LeadStatus)}
            className="h-10 w-44"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Yard summary */}
      {assessment && (
        <section className="mt-8 rounded-[var(--radius-card)] border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Yard summary</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Stat label="Address" value={assessment.address ?? "—"} />
            <Stat
              label="Area"
              value={
                assessment.lawn_area_sqft
                  ? `${Math.round(assessment.lawn_area_sqft).toLocaleString()} sf`
                  : "—"
              }
            />
            <Stat
              label="Max slope"
              value={
                assessment.max_slope_pct != null ? `${Math.round(assessment.max_slope_pct)}%` : "—"
              }
            />
            <Stat label="Grass" value={assessment.grass_type_guesses?.[0]?.species ?? "—"} />
            <Stat
              label="Gates"
              value={
                assessment.gates?.length
                  ? `${assessment.gates.length} (${Math.min(
                      ...assessment.gates.map((g) => g.width_inches),
                    )}\")`
                  : "None"
              }
            />
          </dl>
          <p className="mt-3 text-xs text-stone-500">
            Assessment ID: <code>{lead.assessment_id}</code>
          </p>
        </section>
      )}

      {/* Top recommendations */}
      {recs && recs.length > 0 && (
        <section className="mt-8 rounded-[var(--radius-card)] border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Top recommendations</h2>
          <ul className="mt-3 divide-y divide-stone-200">
            {recs.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium">
                    {r.mower.brand} {r.mower.model}
                  </p>
                  <p className="text-stone-600">${r.mower.price_usd.toLocaleString()}</p>
                </div>
                <FitBadge status={r.fit_status} score={r.fit_score} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Notes */}
      <section className="mt-8 rounded-[var(--radius-card)] border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Button onClick={saveNotes} size="sm" disabled={savingNotes}>
            {savingNotes ? "Saving…" : "Save"}
          </Button>
        </div>
        <textarea
          rows={6}
          maxLength={1000}
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          className="mt-3 block w-full rounded-xl border border-stone-300 bg-white p-3 text-sm focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/30"
          placeholder="Call notes, scheduling, follow-up reminders…"
        />
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-stone-900">{value}</dd>
    </div>
  );
}
