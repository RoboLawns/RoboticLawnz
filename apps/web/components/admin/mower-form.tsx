"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { createMower, updateMower, type MowerInput } from "@/lib/admin-client";
import { useApiAuth } from "@/lib/use-api-auth";
import type { DriveType, Mower, NavigationType } from "@zippylawnz/shared-types";

interface Props {
  mode: "create" | "edit";
  initial?: Mower;
}

const DRIVE_TYPES: DriveType[] = ["2wd", "awd", "tracks"];
const NAV_TYPES: NavigationType[] = ["wire", "rtk", "vision", "lidar", "hybrid"];

const blank: MowerInput = {
  brand: "",
  model: "",
  slug: "",
  price_usd: 0,
  max_area_sqft: 1,
  max_slope_pct: 0,
  min_passage_inches: 24,
  navigation_type: "rtk",
  drive_type: "2wd",
  cutting_width_inches: 8,
  cutting_height_min: 1,
  cutting_height_max: 3,
  battery_minutes: 60,
  noise_db: null,
  rain_handling: false,
  has_gps_theft_protection: false,
  product_url: "https://",
  affiliate_url: null,
  image_url: "https://",
  manufacturer_specs_url: "https://",
  is_active: true,
};

export function MowerForm({ mode, initial }: Props) {
  const router = useRouter();
  const getToken = useApiAuth();

  const seed: MowerInput = initial
    ? {
        brand: initial.brand,
        model: initial.model,
        slug: initial.slug,
        price_usd: initial.price_usd,
        max_area_sqft: initial.max_area_sqft,
        max_slope_pct: initial.max_slope_pct,
        min_passage_inches: initial.min_passage_inches,
        navigation_type: initial.navigation_type,
        drive_type: initial.drive_type,
        cutting_width_inches: initial.cutting_width_inches,
        cutting_height_min: initial.cutting_height_min,
        cutting_height_max: initial.cutting_height_max,
        battery_minutes: initial.battery_minutes,
        noise_db: initial.noise_db,
        rain_handling: initial.rain_handling,
        has_gps_theft_protection: initial.has_gps_theft_protection,
        product_url: initial.product_url,
        affiliate_url: initial.affiliate_url,
        image_url: initial.image_url,
        manufacturer_specs_url: initial.manufacturer_specs_url,
        is_active: initial.is_active,
      }
    : blank;

  const [form, setForm] = useState<MowerInput>(seed);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof MowerInput>(key: K, value: MowerInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "create") {
        const created = await createMower(form, getToken);
        router.push(`/admin/mowers/${created.id}`);
      } else if (initial) {
        await updateMower(initial.id, form, getToken);
        router.push("/admin/mowers");
      }
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? typeof e.body === "object" && e.body && "detail" in e.body
            ? JSON.stringify((e.body as { detail: unknown }).detail)
            : e.message
          : "Couldn't save.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/mowers" className="text-sm text-leaf-700 hover:underline">
          ← Back to catalog
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">
        {mode === "create" ? "New mower" : `Edit ${initial?.brand} ${initial?.model}`}
      </h1>

      <div className="mt-6 grid gap-6 rounded-[var(--radius-card)] border border-stone-200 bg-white p-6">
        <Section title="Identity">
          <Field label="Brand">
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} required />
          </Field>
          <Field label="Model">
            <Input value={form.model} onChange={(e) => set("model", e.target.value)} required />
          </Field>
          <Field label="Slug (kebab-case)">
            <Input
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="brand-model-x"
              required
            />
          </Field>
          <Field label="Price (USD)">
            <Input
              type="number"
              min={0}
              value={form.price_usd}
              onChange={(e) => set("price_usd", Number(e.target.value))}
            />
          </Field>
        </Section>

        <Section title="Capability">
          <Field label="Max area (sq ft)">
            <Input
              type="number"
              min={1}
              value={form.max_area_sqft}
              onChange={(e) => set("max_area_sqft", Number(e.target.value))}
            />
          </Field>
          <Field label="Max slope (%)">
            <Input
              type="number"
              min={0}
              value={form.max_slope_pct}
              onChange={(e) => set("max_slope_pct", Number(e.target.value))}
            />
          </Field>
          <Field label="Min passage (in)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.min_passage_inches}
              onChange={(e) => set("min_passage_inches", Number(e.target.value))}
            />
          </Field>
          <Field label="Drive type">
            <Select
              value={form.drive_type}
              onChange={(e) => set("drive_type", e.target.value as DriveType)}
            >
              {DRIVE_TYPES.map((d) => (
                <option key={d} value={d}>
                  {d.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Navigation">
            <Select
              value={form.navigation_type}
              onChange={(e) => set("navigation_type", e.target.value as NavigationType)}
            >
              {NAV_TYPES.map((n) => (
                <option key={n} value={n}>
                  {n.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
        </Section>

        <Section title="Cutting + battery">
          <Field label="Cutting width (in)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.cutting_width_inches}
              onChange={(e) => set("cutting_width_inches", Number(e.target.value))}
            />
          </Field>
          <Field label="Cutting height min (in)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.cutting_height_min}
              onChange={(e) => set("cutting_height_min", Number(e.target.value))}
            />
          </Field>
          <Field label="Cutting height max (in)">
            <Input
              type="number"
              min={0}
              step="0.1"
              value={form.cutting_height_max}
              onChange={(e) => set("cutting_height_max", Number(e.target.value))}
            />
          </Field>
          <Field label="Battery (minutes)">
            <Input
              type="number"
              min={0}
              value={form.battery_minutes}
              onChange={(e) => set("battery_minutes", Number(e.target.value))}
            />
          </Field>
          <Field label="Noise (dB) — optional">
            <Input
              type="number"
              min={0}
              max={200}
              value={form.noise_db ?? ""}
              onChange={(e) => set("noise_db", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
        </Section>

        <Section title="Features">
          <Toggle
            label="Rain handling"
            checked={form.rain_handling}
            onChange={(v) => set("rain_handling", v)}
          />
          <Toggle
            label="GPS theft protection"
            checked={form.has_gps_theft_protection}
            onChange={(v) => set("has_gps_theft_protection", v)}
          />
          <Toggle label="Active" checked={form.is_active} onChange={(v) => set("is_active", v)} />
        </Section>

        <Section title="Links">
          <Field label="Product URL">
            <Input
              type="url"
              value={form.product_url}
              onChange={(e) => set("product_url", e.target.value)}
            />
          </Field>
          <Field label="Manufacturer specs URL">
            <Input
              type="url"
              value={form.manufacturer_specs_url}
              onChange={(e) => set("manufacturer_specs_url", e.target.value)}
            />
          </Field>
          <Field label="Image URL">
            <Input
              type="url"
              value={form.image_url}
              onChange={(e) => set("image_url", e.target.value)}
            />
          </Field>
          <Field label="Affiliate URL — optional">
            <Input
              type="url"
              value={form.affiliate_url ?? ""}
              onChange={(e) => set("affiliate_url", e.target.value || null)}
            />
          </Field>
        </Section>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="ghost">
            <Link href="/admin/mowers">Cancel</Link>
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : mode === "create" ? "Create mower" : "Save changes"}
          </Button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600">{title}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-stone-300"
      />
      <span className="font-medium">{label}</span>
    </label>
  );
}
