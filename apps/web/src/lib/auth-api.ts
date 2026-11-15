import { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types/auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('accessToken');
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('accessToken', token);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('accessToken');
}

export async function registerApi(
  credentials: RegisterCredentials,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();

  if (!res.ok) {
    const message =
      data.message || (res.status === 409 ? 'Email đã tồn tại' : 'Đăng ký thất bại');
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  setStoredToken(data.accessToken);
  return data;
}

export async function loginApi(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();

  if (!res.ok) {
    const message =
      data.message ||
      (res.status === 401
        ? 'Email hoặc mật khẩu không chính xác'
        : 'Đăng nhập thất bại');
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  setStoredToken(data.accessToken);
  return data;
}

export async function getMeApi(token: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Phiên làm việc đã hết hạn hoặc token không hợp lệ');
  }

  return res.json();
}
