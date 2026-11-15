"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "../../store/auth.store";
import styles from "./register.module.css";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const redirectUrl = rawRedirect || "/menu";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const register = useAuthStore((state) => state.register);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      router.push(redirectUrl);
    }
  }, [isAuthenticated, isSubmitting, redirectUrl, router]);

  const validate = () => {
    const errors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!email.trim()) {
      errors.email = "Vui lòng nhập địa chỉ email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Email không đúng định dạng";
    }

    if (!password) {
      errors.password = "Vui lòng nhập mật khẩu";
    } else if (password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    try {
      await register({
        email: normalizedEmail,
        password,
      });

      const params = new URLSearchParams();
      params.set("registered", "1");
      params.set("email", normalizedEmail);
      if (rawRedirect) {
        params.set("redirect", rawRedirect);
      }

      router.push(`/login?${params.toString()}`);
    } catch (err: any) {
      setServerError(err.message || "Đăng ký không thành công, vui lòng thử lại");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.brand}>BREWLITE</span>
        <h1 className={styles.title}>Đăng ký tài khoản</h1>
        <p className={styles.subtitle}>
          Tạo tài khoản thành viên để nhận ưu đãi và tích điểm thưởng
        </p>
      </div>

      {serverError && (
        <div data-testid="auth-error-alert" className={styles.alertError} role="alert">
          {serverError}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={styles.input}
            placeholder="ban@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
          {fieldErrors.email && (
            <span className={styles.errorText}>{fieldErrors.email}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="password">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={styles.input}
            placeholder="Tối thiểu 6 ký tự"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />
          {fieldErrors.password && (
            <span className={styles.errorText}>{fieldErrors.password}</span>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="confirmPassword">
            Xác nhận mật khẩu
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={styles.input}
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword)
                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
          />
          {fieldErrors.confirmPassword && (
            <span className={styles.errorText}>{fieldErrors.confirmPassword}</span>
          )}
        </div>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký thành viên"}
        </button>
      </form>

      <div className={styles.footer}>
        Đã có tài khoản?
        <Link
          href={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
          className={styles.link}
        >
          Đăng nhập ngay
        </Link>
      </div>

      <Link href="/menu" className={styles.backMenu}>
        ← Quay lại thực đơn
      </Link>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className={styles.container}>
      <Suspense fallback={<div className={styles.card}>Đang tải trang đăng ký...</div>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
