'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  Code2,
  LogIn,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import {
  AuthCard,
  Field,
  inputClass,
  primaryButtonClass,
} from '@/components/ui/form-field';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting || isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSubmitting(true);

    const res = await login(email.trim(), password);

    if (res.error) {
      // KHÔNG tắt cờ `submitting` ở nhánh thành công: điều hướng cần một
      // nhịp nữa, tắt sớm khiến nút sáng lại và học sinh bấm lần hai.
      setSubmitting(false);
      setError(res.error);
      return;
    }
    router.push('/problems');
  };

  return (
    <AuthCard>
      <div className="space-y-2 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Code2 className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Đăng nhập HSG Judge</h1>
        <p className="text-xs text-muted-foreground">
          Đăng nhập để lưu tiến độ làm bài, xếp hạng và nộp code C++ lên máy chấm.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field id="login-email" label="Email đăng nhập">
          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            disabled={busy}
            aria-invalid={!!error}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hocsinh@hsg.edu.vn"
            className={inputClass}
          />
        </Field>

        <Field id="login-password" label="Mật khẩu">
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              disabled={busy}
              aria-invalid={!!error}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
        </Field>

        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <LogIn className="h-4 w-4" aria-hidden />
          )}
          {busy ? 'Đang xác thực…' : 'Đăng nhập'}
        </button>
      </form>

      <div className="border-t border-border/50 pt-3 text-center text-xs text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link
          href="/register"
          className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
        >
          Đăng ký ngay <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </AuthCard>
  );
}
