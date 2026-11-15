import { test as base, expect, type Page } from "@playwright/test";

export const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Cà Phê Sữa Đá Sài Gòn",
    description: "Cà phê Robusta pha phin truyền thống kết hợp sữa đặc.",
    basePrice: 29000,
    category: "Cà phê",
    isAvailable: true,
    stockQuantity: 25,
  },
  {
    id: "2",
    name: "Trà Sữa Oolong Nướng",
    description: "Trà Oolong rang đậm vị cùng sữa tươi thanh mát.",
    basePrice: 39000,
    category: "Trà sữa",
    isAvailable: true,
    stockQuantity: 18,
  },
];

export async function setupMockApiEnv(page: Page) {
  await page.route("**/products", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PRODUCTS),
    });
  });

  await page.route("**/products/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PRODUCTS[0]),
    });
  });
}

export const test = base.extend<{ mockApiPage: Page }>({
  mockApiPage: async ({ page }, use) => {
    await setupMockApiEnv(page);
    await use(page);
  },
});

export { expect };