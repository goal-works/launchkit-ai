import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function login(page: Page, userId = "user-owner") {
  await page.goto("/login");
  await page.getByLabel("Demo identity").selectOption(userId);
  await page.getByRole("button", { name: "Enter demo workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: "Operational overview" })).toBeVisible();
}

test("unauthenticated product routes redirect to the signed demo login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Multi-tenant infrastructure you can inspect." })).toBeVisible();
});

test("owner dashboard exposes tenant-scoped operational evidence", async ({ page }) => {
  await login(page);
  await expect(page.getByLabel("Active organization")).toHaveValue("org-northstar");
  await expect(page.getByText("5 pending invitations")).toHaveCount(0);
  await expect(page.getByText("5", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("No live billing or AI calls")).toBeVisible();
});

test("organization switching changes tenant-owned resources", async ({ page }) => {
  await login(page);
  await page.getByLabel("Active organization").selectOption("org-signal");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Tenant: signal")).toBeVisible();
  await page.getByRole("link", { name: /Workspaces/ }).click();
  await expect(page.getByRole("heading", { name: "Signal workspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Production agents" })).toHaveCount(0);
});

test("viewer UI reflects server permission boundaries", async ({ page }) => {
  await login(page, "user-viewer");
  await page.goto("/members");
  await expect(page.getByText("Your role does not have members:invite.")).toBeVisible();
  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Audit evidence is restricted." })).toBeVisible();
  await page.goto("/workspaces");
  await expect(page.getByText("Your role cannot create workspaces.")).toBeVisible();
});

test("owner can record a synthetic invitation", async ({ page }) => {
  await login(page);
  const email = `review-${Date.now()}@launchkit.demo`;
  await page.goto("/members");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Role").selectOption("developer");
  await page.getByRole("button", { name: "Invite member" }).click();
  await expect(page.getByRole("status")).toHaveText("Invitation recorded in demo mode.");
  await expect(page.getByText(email, { exact: true })).toBeVisible();
});

test("developer can create and remove an organization-scoped workspace", async ({ page }) => {
  await login(page, "user-developer");
  const name = `Review workspace ${Date.now()}`;
  await page.goto("/workspaces");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Environment").selectOption("development");
  await page.getByRole("button", { name: "Create workspace" }).click();
  const card = page.locator(".workspace-card").filter({ hasText: name });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Delete" }).click();
  await expect(card).toHaveCount(0);
});

test("API key creation reveals plaintext once and supports revocation", async ({ page }) => {
  await login(page, "user-developer");
  const name = `Browser key ${Date.now()}`;
  await page.goto("/api-keys");
  await page.getByLabel("Key name").fill(name);
  await page.getByRole("button", { name: "Create API key" }).click();
  const reveal = page.locator(".secret-reveal");
  await expect(reveal).toContainText("Copy this key now");
  await expect(reveal.locator("code")).toContainText("lk_demo_");
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Revoke" }).click();
  await expect(row.getByText("revoked", { exact: true })).toBeVisible();
});

test("owner can update a budget warning threshold", async ({ page }) => {
  await login(page);
  await page.goto("/billing");
  await page.getByLabel("Monthly warning threshold").fill("725");
  await page.getByRole("button", { name: "Update threshold" }).click();
  await expect(page.getByRole("status")).toHaveText("Budget warning updated.");
  await expect(page.getByText(/of \$725 warning threshold/)).toBeVisible();
});

test("webhook creation and signed synthetic delivery are inspectable", async ({ page }) => {
  await login(page, "user-developer");
  const url = `https://hooks.example.invalid/${Date.now()}`;
  await page.goto("/webhooks");
  await page.getByLabel("HTTPS endpoint").fill(url);
  await page.getByRole("button", { name: "Register endpoint" }).click();
  await expect(page.locator(".secret-reveal code")).toContainText("whsec_demo_");
  const endpoint = page.locator(".endpoint-list li").filter({ hasText: url });
  await expect(endpoint).toBeVisible();
  await endpoint.getByRole("button", { name: "Send test" }).click();
  await expect(endpoint.getByRole("status")).toHaveText("Synthetic signed delivery completed.");
  await expect(page.getByRole("row").filter({ hasText: "launchkit.test" })).toBeVisible();
});

for (const width of [375, 768, 1440] as const) {
  test(`dashboard fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 900 });
    await login(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

for (const route of ["/dashboard", "/members", "/workspaces", "/api-keys", "/usage", "/billing", "/webhooks", "/audit"] as const) {
  test(`${route} has no serious or critical Axe violations`, async ({ page }) => {
    await login(page);
    await page.goto(route, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
    expect(serious).toEqual([]);
  });
}
