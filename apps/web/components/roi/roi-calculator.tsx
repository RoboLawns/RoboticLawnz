"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";

interface RoiInputs {
  monthlySpend: number;
  hoursPerWeek: number;
  mowerPrice: number;
  batteryReplacementCost: number;
  batteryLifeYears: number;
}

interface RoiResults {
  annualSavings: number;
  paybackMonths: number;
  fiveYearSavings: number;
  hoursReclaimed5yr: number;
  hoursReclaimedAnnual: number;
  totalCost5yr: number;
  traditionalCost5yr: number;
}

const MOWING_WEEKS_PER_YEAR = 35; // typical U.S. mowing season

export function calculateRoi(inputs: RoiInputs): RoiResults {
  const { monthlySpend, hoursPerWeek, mowerPrice, batteryReplacementCost, batteryLifeYears } =
    inputs;

  const annualSavings = monthlySpend * 12;
  const hoursReclaimedAnnual = hoursPerWeek * MOWING_WEEKS_PER_YEAR;
  const paybackMonths = monthlySpend > 0 ? mowerPrice / monthlySpend : 0;
  const batteryReplacements5yr = batteryLifeYears > 0 ? Math.floor(5 / batteryLifeYears) : 0;
  const fiveYearSavings =
    annualSavings * 5 - mowerPrice - batteryReplacementCost * batteryReplacements5yr;
  const hoursReclaimed5yr = hoursReclaimedAnnual * 5;
  const totalCost5yr = mowerPrice + batteryReplacementCost * batteryReplacements5yr;
  const traditionalCost5yr = annualSavings * 5;

  return {
    annualSavings: Math.max(0, annualSavings),
    paybackMonths: Math.max(0, Math.round(paybackMonths * 10) / 10),
    fiveYearSavings: Math.max(0, Math.round(fiveYearSavings)),
    hoursReclaimed5yr: Math.round(hoursReclaimed5yr),
    hoursReclaimedAnnual: Math.round(hoursReclaimedAnnual),
    totalCost5yr: Math.round(totalCost5yr),
    traditionalCost5yr: Math.round(traditionalCost5yr),
  };
}

interface RoiCalculatorProps {
  defaultMonthlySpend?: number;
  defaultHoursPerWeek?: number;
  mowerPrice?: number;
  mowerName?: string;
  assessmentId?: string;
  compact?: boolean;
}

export function RoiCalculator({
  defaultMonthlySpend = 150,
  defaultHoursPerWeek = 2,
  mowerPrice = 2000,
  mowerName,
  assessmentId,
  compact = false,
}: RoiCalculatorProps) {
  const [monthlySpend, setMonthlySpend] = useState(String(defaultMonthlySpend));
  const [hoursPerWeek, setHoursPerWeek] = useState(String(defaultHoursPerWeek));
  const [batteryLife, setBatteryLife] = useState("3");
  const [touched, setTouched] = useState(false);

  const inputs = useMemo<RoiInputs>(
    () => ({
      monthlySpend: Number(monthlySpend) || 0,
      hoursPerWeek: Number(hoursPerWeek) || 0,
      mowerPrice,
      batteryReplacementCost: 200,
      batteryLifeYears: Number(batteryLife) || 3,
    }),
    [monthlySpend, hoursPerWeek, mowerPrice, batteryLife],
  );

  const results = useMemo(() => calculateRoi(inputs), [inputs]);

  const handleSpendChange = useCallback((v: string) => {
    setMonthlySpend(v.replace(/[^0-9.]/g, ""));
    setTouched(true);
  }, []);

  const handleHoursChange = useCallback((v: string) => {
    setHoursPerWeek(v.replace(/[^0-9.]/g, ""));
    setTouched(true);
  }, []);

  useEffect(() => {
    if (touched && assessmentId) {
      track("roi_calculated", {
        assessment_id: assessmentId,
        lawn_area_sqft: undefined,
      });
    }
  }, [touched, assessmentId]);

  if (compact) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-stone-900">Is it worth it?</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-stone-500">Monthly lawn spend</Label>
            <div className="mt-1 flex items-center rounded-lg border border-stone-200 px-3 py-2">
              <span className="text-sm text-stone-400">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={monthlySpend}
                onChange={(e) => handleSpendChange(e.target.value)}
                className="ml-1 w-full bg-transparent text-sm font-medium text-stone-900 outline-none"
                placeholder="150"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-stone-500">Hours/week mowing</Label>
            <div className="mt-1 flex items-center rounded-lg border border-stone-200 px-3 py-2">
              <input
                type="text"
                inputMode="decimal"
                value={hoursPerWeek}
                onChange={(e) => handleHoursChange(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-stone-900 outline-none"
                placeholder="2"
              />
              <span className="text-sm text-stone-400">hrs</span>
            </div>
          </div>
        </div>
        {touched && inputs.monthlySpend > 0 && (
          <div className="mt-4 space-y-2 rounded-lg bg-leaf-50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Payback</span>
              <span className="font-semibold text-stone-900">
                {results.paybackMonths < 1
                  ? "< 1 month"
                  : `~${Math.round(results.paybackMonths)} months`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">5-year savings</span>
              <span className="font-semibold text-leaf-700">
                ${results.fiveYearSavings.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-600">Time reclaimed</span>
              <span className="font-semibold text-stone-900">
                {results.hoursReclaimed5yr.toLocaleString()} hrs
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
      <h2 className="text-xl font-bold text-stone-900">ROI Calculator</h2>
      <p className="mt-1 text-sm text-stone-500">
        See how quickly a robotic mower pays for itself{mowerName ? ` compared to your current costs` : ""}.
      </p>

      {/* Inputs */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <Label className="text-sm text-stone-600">Monthly lawn care spend</Label>
          <p className="mb-1 text-xs text-stone-400">Service, gas, maintenance</p>
          <div className="flex items-center rounded-lg border border-stone-200 px-3 py-2.5 focus-within:border-leaf-400 focus-within:ring-1 focus-within:ring-leaf-200">
            <span className="text-stone-400">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={monthlySpend}
              onChange={(e) => handleSpendChange(e.target.value)}
              className="ml-1 w-full bg-transparent text-base font-medium text-stone-900 outline-none"
              placeholder="150"
            />
          </div>
        </div>
        <div>
          <Label className="text-sm text-stone-600">Hours/week mowing</Label>
          <p className="mb-1 text-xs text-stone-400">Including trimming, edging</p>
          <div className="flex items-center rounded-lg border border-stone-200 px-3 py-2.5 focus-within:border-leaf-400 focus-within:ring-1 focus-within:ring-leaf-200">
            <input
              type="text"
              inputMode="decimal"
              value={hoursPerWeek}
              onChange={(e) => handleHoursChange(e.target.value)}
              className="w-full bg-transparent text-base font-medium text-stone-900 outline-none"
              placeholder="2"
            />
            <span className="text-sm text-stone-400">hrs</span>
          </div>
        </div>
        <div>
          <Label className="text-sm text-stone-600">Mower price</Label>
          <p className="mb-1 text-xs text-stone-400">One-time investment</p>
          <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
            <span className="text-stone-400">$</span>
            <span className="ml-1 text-base font-semibold text-stone-900">
              {mowerPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Battery */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() =>
            setBatteryLife((prev) => (prev === "3" ? "5" : prev === "5" ? "2" : "3"))
          }
          className="text-xs text-stone-400 underline underline-offset-2 hover:text-stone-600"
        >
          Battery replacement every {batteryLife} years (~$200) — tap to change
        </button>
      </div>

      {/* Results */}
      {touched && inputs.monthlySpend > 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-leaf-200 bg-leaf-50 p-4 text-center">
            <p className="text-xs font-medium text-leaf-600 uppercase tracking-wide">Payback</p>
            <p className="mt-1 text-2xl font-bold text-leaf-800">
              {results.paybackMonths < 1
                ? "< 1 mo"
                : `${Math.round(results.paybackMonths)} mo`}
            </p>
            <p className="mt-0.5 text-xs text-leaf-600">
              {results.paybackMonths < 12
                ? "Less than a year"
                : `~${(results.paybackMonths / 12).toFixed(1)} years`}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
              5-Year Savings
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-800">
              ${results.fiveYearSavings.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-emerald-600">
              vs ${results.traditionalCost5yr.toLocaleString()} traditional
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
              Time Reclaimed
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-800">
              {results.hoursReclaimed5yr.toLocaleString()} hrs
            </p>
            <p className="mt-0.5 text-xs text-amber-600">
              ~{(results.hoursReclaimed5yr / 24).toFixed(0)} full days over 5 years
            </p>
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-center">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              Annual Savings
            </p>
            <p className="mt-1 text-2xl font-bold text-stone-800">
              ${results.annualSavings.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              {results.hoursReclaimedAnnual} hrs/year freed up
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!touched || inputs.monthlySpend <= 0) && (
        <div className="mt-8 rounded-xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-sm text-stone-500">
            Enter your monthly lawn care spend to see your savings
          </p>
        </div>
      )}
    </div>
  );
}
