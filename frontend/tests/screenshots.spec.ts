import { expect, test, type APIRequestContext } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:8010/api/v1";

async function getFixtureActivityId(request: APIRequestContext): Promise<number> {
  const response = await request.get(`${apiBaseUrl}/activities`, {
    params: {
      page: 1,
      page_size: 100,
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    items: Array<{ id: number; source_activity_id: string }>;
  };

  const activity = payload.items.find((item) => item.source_activity_id === "fixture-run-001");
  expect(activity).toBeTruthy();
  return activity!.id;
}

test("dashboard screenshot", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator("main")).toHaveScreenshot("dashboard-home.png", {
    animations: "disabled",
    caret: "hide",
  });
});

test("activities list screenshot", async ({ page }) => {
  await page.goto("/activities?sport=running", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Activity Results" })).toBeVisible();
  await expect(page.locator("main")).toHaveScreenshot("activities-list.png", {
    animations: "disabled",
    caret: "hide",
  });
});

test("activity detail screenshot", async ({ page, request }) => {
  const activityId = await getFixtureActivityId(request);
  await page.goto(`/activities/${activityId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Session Summary" })).toBeVisible();
  await expect(page.locator("main")).toHaveScreenshot("activity-detail.png", {
    animations: "disabled",
    caret: "hide",
    mask: [page.locator(".leaflet-tile-container")],
  });
});

test("sync status screenshot", async ({ page }) => {
  await page.goto("/status/sync", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Sync Status" })).toBeVisible();
  await expect(page.locator("main")).toHaveScreenshot("sync-status.png", {
    animations: "disabled",
    caret: "hide",
  });
});
