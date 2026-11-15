import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import LoginPage from '../app/login/page';
import RegisterPage from '../app/register/page';
import * as authApi from '../lib/auth-api';
import { useAuthStore } from '../store/auth.store';

// Mock Next.js router & searchParams
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'redirect' ? '/checkout' : null),
  }),
}));

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Frontend Authentication Flow (FR-04)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPush.mockClear();
    window.localStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
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

  describe('LoginPage', () => {
    it('1. Renders login form with header, input fields and buttons', async () => {
      await act(async () => {
        root.render(<LoginPage />);
      });

      expect(container.textContent).toContain('Đăng nhập');
      expect(container.textContent).toContain('BREWLITE');
      expect(container.querySelector('#email')).not.toBeNull();
      expect(container.querySelector('#password')).not.toBeNull();
      expect(container.querySelector('button[type="submit"]')).not.toBeNull();
    });

    it('2. Shows validation error when submitting empty fields', async () => {
      await act(async () => {
        root.render(<LoginPage />);
      });

      const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      await act(async () => {
        submitBtn.click();
      });

      expect(container.textContent).toContain('Vui lòng nhập địa chỉ email');
    });

    it('3. Successfully logs in, saves token to store, and redirects to checkout', async () => {
      const mockResponse = {
        accessToken: 'valid.jwt.token',
        user: {
          id: 'user-1',
          email: 'test@brewlite.vn',
          loyaltyPoints: 10,
        },
      };

      vi.spyOn(authApi, 'loginApi').mockResolvedValueOnce(mockResponse);

      await act(async () => {
        root.render(<LoginPage />);
      });

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;

      act(() => {
        setInputValue(emailInput, 'test@brewlite.vn');
        setInputValue(passwordInput, 'password123');
      });

      await act(async () => {
        submitBtn.click();
      });

      expect(authApi.loginApi).toHaveBeenCalledWith({
        email: 'test@brewlite.vn',
        password: 'password123',
      });
      expect(mockPush).toHaveBeenCalledWith('/checkout');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().token).toBe('valid.jwt.token');
    });

    it('4. Displays alert message when login fails with 401 Unauthorized', async () => {
      vi.spyOn(authApi, 'loginApi').mockRejectedValueOnce(
        new Error('Email hoặc mật khẩu không chính xác'),
      );

      await act(async () => {
        root.render(<LoginPage />);
      });

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;

      act(() => {
        setInputValue(emailInput, 'test@brewlite.vn');
        setInputValue(passwordInput, 'wrongpassword');
      });

      await act(async () => {
        submitBtn.click();
      });

      expect(container.textContent).toContain('Email hoặc mật khẩu không chính xác');
    });
  });

  describe('RegisterPage', () => {
    it('1. Renders register form with email, password, confirmPassword', async () => {
      await act(async () => {
        root.render(<RegisterPage />);
      });

      expect(container.textContent).toContain('Đăng ký tài khoản');
      expect(container.querySelector('#email')).not.toBeNull();
      expect(container.querySelector('#password')).not.toBeNull();
      expect(container.querySelector('#confirmPassword')).not.toBeNull();
    });

    it('2. Shows error when passwords do not match', async () => {
      await act(async () => {
        root.render(<RegisterPage />);
      });

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      const confirmInput = container.querySelector('#confirmPassword') as HTMLInputElement;
      const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;

      act(() => {
        setInputValue(emailInput, 'new@brewlite.vn');
        setInputValue(passwordInput, 'password123');
        setInputValue(confirmInput, 'differentpassword');
      });

      await act(async () => {
        submitBtn.click();
      });

      expect(container.textContent).toContain('Mật khẩu xác nhận không khớp');
    });

    it('3. Successfully registers new user, saves token, and redirects', async () => {
      const mockResponse = {
        accessToken: 'new.registered.token',
        user: {
          id: 'user-new',
          email: 'new@brewlite.vn',
          loyaltyPoints: 0,
        },
      };

      vi.spyOn(authApi, 'registerApi').mockResolvedValueOnce(mockResponse);

      await act(async () => {
        root.render(<RegisterPage />);
      });

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      const confirmInput = container.querySelector('#confirmPassword') as HTMLInputElement;
      const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;

      act(() => {
        setInputValue(emailInput, 'new@brewlite.vn');
        setInputValue(passwordInput, 'securepassword123');
        setInputValue(confirmInput, 'securepassword123');
      });

      await act(async () => {
        submitBtn.click();
      });

      expect(authApi.registerApi).toHaveBeenCalledWith({
        email: 'new@brewlite.vn',
        password: 'securepassword123',
      });
      expect(mockPush).toHaveBeenCalledWith('/checkout');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('4. Displays alert message when email already exists (409 Conflict)', async () => {
      vi.spyOn(authApi, 'registerApi').mockRejectedValueOnce(
        new Error('Email đã tồn tại trong hệ thống'),
      );

      await act(async () => {
        root.render(<RegisterPage />);
      });

      const emailInput = container.querySelector('#email') as HTMLInputElement;
      const passwordInput = container.querySelector('#password') as HTMLInputElement;
      const confirmInput = container.querySelector('#confirmPassword') as HTMLInputElement;
      const submitBtn = container.querySelector('button[type="submit"]') as HTMLButtonElement;

      act(() => {
        setInputValue(emailInput, 'existing@brewlite.vn');
        setInputValue(passwordInput, 'password123');
        setInputValue(confirmInput, 'password123');
      });

      await act(async () => {
        submitBtn.click();
      });

      expect(container.textContent).toContain('Email đã tồn tại trong hệ thống');
    });
  });
});
