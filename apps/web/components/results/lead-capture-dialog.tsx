"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { track } from "@/lib/analytics";
import { ApiError, apiFetch } from "@/lib/api";
import { useApiAuth } from "@/lib/use-api-auth";
import type { Lead, PreferredContact } from "@roboticlawnz/shared-types";

interface Props {
  assessmentId: string;
  trigger?: React.ReactNode;
}

export function LeadCaptureDialog({ assessmentId, trigger }: Props) {
  const getToken = useApiAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pref, setPref] = useState<PreferredContact>("email");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch<Lead>("/leads", {
        method: "POST",
        body: {
          assessment_id: assessmentId,
          email,
          phone: phone || undefined,
          preferred_contact: pref,
          notes: notes || undefined,
        },
        getToken,
      });
      track("lead_captured", { assessment_id: assessmentId });
      setSuccess(true);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Couldn't submit. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) track("lead_dialog_opened", { assessment_id: assessmentId });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="lg">Get a free consultation</Button>
        </DialogTrigger>
      )}
      <DialogContent>
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Thanks — we&apos;re on it.</DialogTitle>
              <DialogDescription>
                A ZippyLawnz advisor will reach out within one business day. You can keep this tab
                open if you&apos;d like to keep browsing your matches.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setOpen(false)} variant="primary">
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Get expert help with purchase &amp; install</DialogTitle>
              <DialogDescription>
                Share a few details and a ZippyLawnz advisor will reach out — no obligation.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="pref">Preferred contact</Label>
                  <Select
                    id="pref"
                    value={pref}
                    onChange={(e) => setPref(e.target.value as PreferredContact)}
                    className="mt-1.5"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="either">Either</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Anything we should know? (optional)</Label>
                <textarea
                  id="notes"
                  rows={3}
                  maxLength={1000}
                  className="mt-1.5 block w-full rounded-xl border border-stone-300 bg-white p-3 text-sm shadow-sm focus:border-leaf-500 focus:outline-none focus:ring-2 focus:ring-leaf-500/30"
                  placeholder="Timeline, budget concerns, preferred brand…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {error && (
                <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting || !email}>
                {submitting ? "Sending…" : "Request consultation"}
              </Button>
            </DialogFooter>
            <p className="mt-2 text-center text-[11px] text-stone-500">
              By submitting, you agree to be contacted by ZippyLawnz about your assessment. We never
              sell your data.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
