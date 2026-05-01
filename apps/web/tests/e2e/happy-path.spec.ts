/**
 * Happy-path E2E for the assessment flow.
 *
 * Drives the full user-visible journey end-to-end:
 *   landing → start → address → map (manual area)
 *   → slope (manual entry) → grass → obstacles (skip)
 *   → review → results → lead capture
 *
 * Mapbox + Clerk are intentionally disabled by playwright.config.ts so this
 * test exercises the always-available fallback paths. Once those services
 * are mocked we can add a parallel "interactive" suite covering the
 * polygon-draw + signed-in flows.
 */

import { expect, test } from "@playwright/test";

const ADDRESS = "1600 Pennsylvania Ave NW, Washington, DC";

test("homeowner walks the assessment and lands on results", async ({ page }) => {
  // ── Landing ──────────────────────────────────────────────────────────
  await page.goto("/");
  await expect(page).toHaveTitle(/Robotic Lawnz/i);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/robotic mower/i);

  // Pick the hero CTA — the header has the same label.
  const heroStart = page
    .getByRole("link", { name: /start your assessment/i })
    .first();
  await heroStart.click();

  // ── Address ──────────────────────────────────────────────────────────
  await expect(page).toHaveURL(/\/assessment\/[0-9a-f-]{8,}\/address/);
  await page.getByLabel(/home address/i).fill(ADDRESS);
  await page.getByRole("button", { name: /continue/i }).click();

  // ── Map (manual area fallback) ───────────────────────────────────────
  await expect(page).toHaveURL(/\/assessment\/[0-9a-f-]{8,}\/map/);
  // No NEXT_PUBLIC_MAPBOX_TOKEN → manual area input is the only path.
  const areaInput = page.getByLabel(/lawn area/i);
  await areaInput.fill("8500");
  await page.getByRole("button", { name: /continue/i }).click();

  // ── Slope (manual entry fallback) ────────────────────────────────────
  await expect(page).toHaveURL(/\/assessment\/[0-9a-f-]{8,}\/slope/);
  // Open the manual-entry details, fill in a value.
  await page.getByText(/enter slope manually/i).click();
  await page.getByLabel(/steepest slope/i).fill("18");
  await page.getByRole("button", { name: /continue/i }).click();

  // ── Grass ────────────────────────────────────────────────────────────
  await expect(page).toHaveURL(/\/assessment\/[0-9a-f-]{8,}\/grass/);
  await page.getByLabel(/grass species/i).selectOption({ label: "Tall Fescue" });
  await page.getByRole("button", { name: /continue/i }).click();

  // ── Obstacles (skip — no required fields) ────────────────────────────
  await expect(page).toHaveURL(/\/assessment\/[0-9a-f-]{8,}\/obstacles/);
  await page.getByRole("button", { name: /continue/i }).click();

  // ── Review ───────────────────────────────────────────────────────────
  await expect(page).toHaveURL(/\/assessment\/[0-9a-f-]{8,}\/review/);
  await expect(page.getByText("8,500 sq ft")).toBeVisible();
  await expect(page.getByText("18%")).toBeVisible();
  await expect(page.getByText("Tall Fescue")).toBeVisible();
  await page.getByRole("button", { name: /see my recommendations/i }).click();

  // ── Results ──────────────────────────────────────────────────────────
  await expect(page).toHaveURL(/\/assessment\/[0-9a-f-]{8,}\/results/);
  // The seed catalog has 15 mowers; with this yard a non-zero subset must
  // land in the "Will work" group.
  const willWorkTab = page.getByRole("tab", { name: /will work/i });
  await expect(willWorkTab).toBeVisible();
  await willWorkTab.click();
  await expect(page.getByRole("heading", { level: 3 })).not.toHaveCount(0);

  // ── Lead capture ─────────────────────────────────────────────────────
  await page.getByRole("button", { name: /get a free consultation/i }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel(/^email$/i).fill("happy@example.com");
  await page.getByRole("button", { name: /request consultation/i }).click();
  await expect(page.getByText(/we'?re on it/i)).toBeVisible();
});

test("entry redirects to a fresh assessment id", async ({ page }) => {
  await page.goto("/assessment");
  await page.waitForURL(/\/assessment\/[0-9a-f-]{8,}\/address/, { timeout: 15_000 });
  expect(page.url()).toMatch(/\/assessment\/[0-9a-f-]{36}\/address/);
});
