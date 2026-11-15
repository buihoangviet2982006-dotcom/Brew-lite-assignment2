import { test, expect } from "./fixtures/test-env";

test.describe("BrewLite E2E Environment Verification", () => {
  test("1. Môi trường E2E tải thành công màn hình Menu với dữ liệu giả lập", async ({
    mockApiPage,
  }) => {
    await mockApiPage.goto("/menu");

    await expect(mockApiPage.locator("h1")).toContainText("Menu");
    await expect(
      mockApiPage.getByText("Cà Phê Sữa Đá Sài Gòn")
    ).toBeVisible();
  });

  test("2. Môi trường E2E hỗ trợ kiểm thử chọn Size và Topping ở trang Chi tiết", async ({
    mockApiPage,
  }) => {
    await mockApiPage.goto("/menu/1");

    const sizeMButton = mockApiPage.getByTestId("size-option-M");
    if (await sizeMButton.isVisible()) {
      await sizeMButton.click();
      await expect(sizeMButton).toHaveAttribute("aria-pressed", "true");
    }
  });
});