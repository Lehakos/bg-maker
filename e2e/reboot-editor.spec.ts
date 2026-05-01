import { expect, test } from "@playwright/test";

test("loads the clean application base", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "BG Maker" })).toBeVisible();
  await expect(page.getByText("Clean tabletop engine base")).toBeVisible();
  await expect(page.getByLabel("Application workspace")).toBeVisible();
});
