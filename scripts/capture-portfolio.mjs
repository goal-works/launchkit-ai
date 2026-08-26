import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const baseURL = process.env.LAUNCHKIT_CAPTURE_URL ?? "http://127.0.0.1:3003";
const output = path.resolve(process.cwd(), "../public/projects/launchkit-ai");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

await page.goto(`${baseURL}/login`, { waitUntil: "networkidle" });
await page.getByLabel("Demo identity").selectOption("user-owner");
await page.getByRole("button", { name: "Enter demo workspace" }).click();
await page.waitForURL("**/dashboard");

for (const [route, filename] of [
  ["/dashboard", "dashboard.png"],
  ["/members", "members.png"],
  ["/api-keys", "api-keys.png"],
  ["/webhooks", "webhooks.png"],
]) {
  await page.goto(`${baseURL}${route}`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(output, filename), fullPage: true });
}

await browser.close();
console.log(`Captured LaunchKit portfolio evidence in ${output}`);
