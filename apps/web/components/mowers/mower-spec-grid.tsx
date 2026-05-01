import type { Mower } from "@roboticlawnz/shared-types";

interface Props {
  mower: Mower;
}

export function MowerSpecGrid({ mower }: Props) {
  const rows: { label: string; value: string }[] = [
    { label: "Max area", value: `${mower.max_area_sqft.toLocaleString()} sq ft` },
    { label: "Max slope", value: `${mower.max_slope_pct}%` },
    { label: "Min passage", value: `${mower.min_passage_inches.toFixed(1)}"` },
    { label: "Cutting width", value: `${mower.cutting_width_inches.toFixed(1)}"` },
    {
      label: "Cutting height",
      value: `${mower.cutting_height_min.toFixed(1)}–${mower.cutting_height_max.toFixed(1)}"`,
    },
    { label: "Battery", value: `${mower.battery_minutes} min runtime` },
    { label: "Drive", value: mower.drive_type.toUpperCase() },
    { label: "Navigation", value: mower.navigation_type.toUpperCase() },
    { label: "Noise", value: mower.noise_db != null ? `${mower.noise_db} dB` : "—" },
    { label: "Rain handling", value: mower.rain_handling ? "Yes" : "No" },
    { label: "GPS theft protection", value: mower.has_gps_theft_protection ? "Yes" : "No" },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((r) => (
        <div key={r.label} className="rounded-xl bg-stone-50 p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            {r.label}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-stone-900">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
