import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import MenuPage from '../app/menu/page';
import * as productApi from '../lib/product-api';
import type { Product } from '../types/product';

// Mock product-api module
vi.mock('../lib/product-api', () => ({
  getProducts: vi.fn(),
}));

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Cà phê Sữa Đá',
    description: 'Cà phê Robusta đậm đà kết hợp sữa đặc ngọt béo',
    basePrice: 29000,
    imageUrl: 'https://example.com/cf-sua.jpg',
    category: 'Cà phê',
    isAvailable: true,
    stockQuantity: 50,
  },
  {
    id: 'prod-2',
    name: 'Trà Đào Cam Sả',
    description: 'Trà thanh nhiệt với đào miếng giòn ngọt',
    basePrice: 35000,
    imageUrl: '',
    category: 'Trà',
    isAvailable: false,
    stockQuantity: 0,
  },
];

function setInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('MenuPage Component & Main Flow (Task 4.3 MVP Sprint 1)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('1. Trạng thái Loading: hiển thị skeleton khi đang chờ dữ liệu API', async () => {
    // Trả về promise chưa resolve ngay để bắt được trạng thái loading
    let resolvePromise: (value: Product[]) => void = () => {};
    const pendingPromise = new Promise<Product[]>((resolve) => {
      resolvePromise = resolve;
    });
    vi.mocked(productApi.getProducts).mockReturnValueOnce(pendingPromise);

    await act(async () => {
      root.render(<MenuPage />);
    });

    const loadingElement = container.querySelector('[data-testid="menu-loading"]');
    expect(loadingElement).not.toBeNull();
    expect(loadingElement?.getAttribute('aria-busy')).toBe('true');

    // Dọn dẹp promise
    await act(async () => {
      resolvePromise(mockProducts);
    });
  });

  it('2. Trạng thái Empty: hiển thị thông báo khi API trả về mảng rỗng []', async () => {
    vi.mocked(productApi.getProducts).mockResolvedValueOnce([]);

    await act(async () => {
      root.render(<MenuPage />);
    });

    const emptyElement = container.querySelector('[data-testid="menu-empty"]');
    expect(emptyElement).not.toBeNull();
    expect(container.textContent).toContain('Menu hiện chưa có sản phẩm');
    expect(container.textContent).toContain(
      'Hiện tại chưa có thức uống nào được thêm vào hệ thống.'
    );
  });

  it('3. Trạng thái Error: hiển thị thông báo lỗi khi gọi API thất bại và cho phép thử lại', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(productApi.getProducts).mockRejectedValueOnce(
      new Error('Lỗi kết nối máy chủ')
    );

    await act(async () => {
      root.render(<MenuPage />);
    });

    const errorElement = container.querySelector('[data-testid="menu-error"]');
    expect(errorElement).not.toBeNull();
    expect(container.textContent).toContain('Đã xảy ra lỗi tải dữ liệu');

    const retryButton = errorElement?.querySelector('button') as HTMLButtonElement;
    expect(retryButton).not.toBeNull();

    // Mock thành công cho lần thử lại
    vi.mocked(productApi.getProducts).mockResolvedValueOnce(mockProducts);

    await act(async () => {
      retryButton.click();
    });

    expect(container.querySelector('[data-testid="menu-error"]')).toBeNull();
    expect(container.textContent).toContain('Cà phê Sữa Đá');
    consoleSpy.mockRestore();
  });

  it('4. Trạng thái Thành công (luồng chính): render đúng danh sách tên, giá và tình trạng sản phẩm (FR-01)', async () => {
    vi.mocked(productApi.getProducts).mockResolvedValueOnce(mockProducts);

    await act(async () => {
      root.render(<MenuPage />);
    });

    // Kiểm tra số lượng món
    expect(container.textContent).toContain('2 món');

    // Kiểm tra tên các sản phẩm
    expect(container.textContent).toContain('Cà phê Sữa Đá');
    expect(container.textContent).toContain('Trà Đào Cam Sả');

    // Kiểm tra định dạng giá tiền Việt Nam
    expect(container.textContent).toContain('29.000đ');
    expect(container.textContent).toContain('35.000đ');

    // Kiểm tra trạng thái còn hàng và hết hàng
    expect(container.textContent).toContain('Chọn món');
    expect(container.textContent).toContain('Hết hàng');
  });

  it('5. Luồng Tìm kiếm: lọc danh sách sản phẩm theo từ khóa nhập vào', async () => {
    vi.mocked(productApi.getProducts).mockResolvedValueOnce(mockProducts);

    await act(async () => {
      root.render(<MenuPage />);
    });

    const searchInput = container.querySelector('#menu-search') as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    // Nhập từ khóa không tồn tại
    await act(async () => {
      setInputValue(searchInput, 'Bạc Xỉu Không Tồn Tại');
    });

    expect(container.querySelector('[data-testid="menu-empty"]')).not.toBeNull();
    expect(container.textContent).toContain('Không tìm thấy sản phẩm');

    // Bấm nút "Xóa bộ lọc"
    const resetButton = container.querySelector('[data-testid="menu-empty"] button') as HTMLButtonElement;
    expect(resetButton).not.toBeNull();

    await act(async () => {
      resetButton.click();
    });

    expect(container.textContent).toContain('Cà phê Sữa Đá');
    expect(container.textContent).toContain('Trà Đào Cam Sả');
  });

  it('6. Luồng Lọc danh mục: lọc món theo danh mục', async () => {
    vi.mocked(productApi.getProducts).mockResolvedValueOnce(mockProducts);

    await act(async () => {
      root.render(<MenuPage />);
    });

    // Tìm nút danh mục 'Cà phê'
    const categoryButtons = Array.from(container.querySelectorAll('section button'));
    const coffeeBtn = categoryButtons.find((btn) => btn.textContent === 'Cà phê') as HTMLButtonElement;
    expect(coffeeBtn).toBeDefined();

    await act(async () => {
      coffeeBtn.click();
    });

    expect(container.textContent).toContain('Cà phê Sữa Đá');
    expect(container.textContent).not.toContain('Trà Đào Cam Sả');
  });
});
