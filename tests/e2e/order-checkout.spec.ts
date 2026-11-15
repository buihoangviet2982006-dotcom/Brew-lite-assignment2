import { expect, test } from '@playwright/test';

const CUSTOMER_EMAIL =
  process.env.E2E_CUSTOMER_EMAIL || 'customer@brewlite.vn';
const CUSTOMER_PASSWORD =
  process.env.E2E_CUSTOMER_PASSWORD || 'Password123!';

test.describe('BrewLite Core E2E Flow: Menu -> Xác nhận đơn hàng', () => {
  test('Khách hàng xem menu, chọn size/topping, giỏ hàng, đăng nhập, đặt đơn, thanh toán và xem xác nhận đơn PAID', async ({
    page,
  }) => {
    // 1. Xem Menu (/menu)
    await page.goto('/menu');
    await expect(page.locator('h1')).toContainText(/Menu/i);

    const firstSelectLink = page
      .locator('[data-testid^="select-product-"]')
      .first();
    await expect(firstSelectLink).toBeVisible();
    await firstSelectLink.click();

    // 2. Chi tiết sản phẩm & chọn Size/Topping (/menu/[id])
    await expect(page).toHaveURL(/\/menu\/.+/);
    await expect(page.getByTestId('product-option-selector')).toBeVisible();

    const sizeMButton = page.getByTestId('size-option-M');
    await sizeMButton.click();
    await expect(sizeMButton).toHaveAttribute('aria-pressed', 'true');

    const firstTopping = page
      .locator('[data-testid^="topping-option-"]')
      .first();
    if (await firstTopping.isVisible()) {
      await firstTopping.click();
    }

    await page.getByTestId('btn-add-to-cart').click();
    await expect(page.getByTestId('add-to-cart-feedback')).toBeVisible();

    await page.getByTestId('go-to-cart-link').click();

    // 3. Giỏ hàng (/cart)
    await expect(page).toHaveURL(/\/cart/);
    await expect(page.getByTestId('cart-item-row').first()).toBeVisible();
    await expect(page.getByTestId('cart-subtotal')).toBeVisible();

    await page.getByTestId('proceed-to-checkout-btn').click();

    // 4. Chưa đăng nhập -> Chuyển sang Đăng nhập (/checkout -> /login)
    await expect(page).toHaveURL(/\/checkout/);
    const loginLink = page.getByTestId('checkout-login-link');
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    await expect(page).toHaveURL(/\/login/);
    await page.locator('#email').fill(CUSTOMER_EMAIL);
    await page.locator('#password').fill(CUSTOMER_PASSWORD);
    await page.getByRole('button', { name: /Đăng nhập ngay/i }).click();

    // 5. Quay lại Checkout, Đặt đơn & Thanh toán WALLET (VietQR Modal)
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId('checkout-payment-section')).toBeVisible();

    await page.getByTestId('method-wallet-btn').click();
    await page.getByTestId('submit-order-btn').click();

    const qrModal = page.getByTestId('vietqr-payment-modal');
    await expect(qrModal).toBeVisible();
    await expect(page.getByTestId('vietqr-payment-ref')).toBeVisible();

    // Mô phỏng xác nhận giao dịch thành công từ SePay Sandbox
    await page.getByTestId('simulate-webhook-success-btn').click();

    // 6. Xác nhận đơn hàng thành công (PAID) & Kiểm tra trang Chi tiết đơn
    const successBanner = page.getByTestId('payment-success-banner');
    await expect(successBanner).toBeVisible();
    await expect(page.getByTestId('paid-order-status')).toHaveText('PAID');

    await page.getByRole('link', { name: /Xem chi tiết đơn hàng/i }).click();
    await expect(page).toHaveURL(/\/orders\/.+/);
    await expect(page.getByText(/Đã thanh toán/i).first()).toBeVisible();
  });
});
