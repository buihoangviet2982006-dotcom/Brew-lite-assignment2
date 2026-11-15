import { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types/auth';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const TOKEN_STORAGE_KEYS = [
  'accessToken',
  'token',
  'jwt',
  'brewlite_token',
  'auth-storage',
  'brewlite-auth',
];

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of TOKEN_STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    if (!raw.startsWith('{')) {
      const cleaned = raw.replace(/^"|"$/g, '').trim();
      if (cleaned) return cleaned;
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const state = (parsed.state as Record<string, unknown>) ?? parsed;
      const token =
        state.accessToken ?? state.token ?? parsed.accessToken ?? parsed.token;
      if (typeof token === 'string' && token.trim()) {
        return token.trim();
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('accessToken', token);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  for (const key of TOKEN_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export async function registerApi(
  credentials: RegisterCredentials,
): Promise<AuthResponse> {
  const normalizedPayload = {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  };

  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizedPayload),
  });

  const data = await res.json();

  if (!res.ok) {
    const message =
      data.message ||
      (res.status === 409 ? 'Email đã tồn tại trong hệ thống' : 'Đăng ký thất bại');
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  // Không tự động lưu token khi đăng ký để người dùng chuyển sang bước Đăng nhập đúng luồng nghiệp vụ
  return data;
}

export async function loginApi(
  credentials: LoginCredentials,
): Promise<AuthResponse> {
  const normalizedPayload = {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  };

  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(normalizedPayload),
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
