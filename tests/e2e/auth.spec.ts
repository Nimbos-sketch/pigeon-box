import { test, expect } from "@playwright/test";

test("shows Google SSO sign in screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pigeon Box" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
});
