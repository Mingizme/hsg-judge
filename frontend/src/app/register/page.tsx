'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/contexts/auth-context';
import {
  Code2,
  UserPlus,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AuthCard,
  Field,
  inputClass,
  primaryButtonClass,
} from '@/components/ui/form-field';

const MIN_PASSWORD = 6;

export default function RegisterPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting || isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    // Kiểm tra tại client trước khi gọi Supabase: thông báo tiếng Việt rõ ràng
    // thay cho chuỗi lỗi tiếng Anh mặc định của dịch vụ.
    if (displayName.trim().length < 2) {
      setError('Hãy nhập họ tên hoặc biệt danh (ít nhất 2 ký tự).');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(`Mật khẩu phải có ít nhất ${MIN_PASSWORD} ký tự.`);
      return;
    }

    setSubmitting(true);
    const res = await signup(
      email.trim(),
      password,
      displayName.trim(),
      role,
      secretCode.trim() || undefined,
    );

    if (res.error) {
      setSubmitting(false);
      setError(res.error);
      return;
    }
    router.push(role === 'TEACHER' ? '/teacher' : '/problems');
  };

  const roleOptions = [
    {
      value: 'STUDENT' as UserRole,
      label: 'Học sinh tuyển',
      icon: GraduationCap,
      active: 'border-info bg-info/10 text-info ring-1 ring-info',
    },
    {
      value: 'TEACHER' as UserRole,
      label: 'Giáo viên bồi dưỡng',
      icon: ShieldCheck,
      active: 'border-warning bg-warning/10 text-warning ring-1 ring-warning',
    },
  ];

  return (
    <AuthCard>
      <div className="space-y-2 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Code2 className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Tạo tài khoản mới</h1>
        <p className="text-xs text-muted-foreground">
          Tham gia lớp luyện thi HSG Tin học THPT với C++.
        </p>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="mb-1.5 block text-xs font-semibold text-muted-foreground">
          Bạn là:
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {roleOptions.map(({ value, label, icon: Icon, active }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRole(value)}
              aria-pressed={role === value}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold',
                'transition-all duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                role === value
                  ? `${active} shadow-subtle`
                  : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
        <Field id="reg-name" label="Họ và tên / Biệt danh">
          <input
            id="reg-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            disabled={busy}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Nguyễn Văn A"
            className={inputClass}
          />
        </Field>

        <Field id="reg-email" label="Email">
          <input
            id="reg-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ten@email.com"
            className={inputClass}
          />
        </Field>

        <Field
          id="reg-password"
          label="Mật khẩu"
          hint={`Tối thiểu ${MIN_PASSWORD} ký tự.`}
        >
          <div className="relative">
            <input
              id="reg-password"
              name="new-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              disabled={busy}
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

        {role === 'TEACHER' && (
          <div className="space-y-1.5 rounded-xl border border-warning/20 bg-warning/5 p-3">
            <label
              htmlFor="reg-secret"
              className="flex items-center gap-1 text-xs font-semibold text-warning"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden />
              Mã xác thực giáo viên (tùy chọn)
            </label>
            <input
              id="reg-secret"
              name="teacher-code"
              type="text"
              autoComplete="off"
              disabled={busy}
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="HSG_TEACHER_2026"
              className="w-full rounded-lg border bg-background px-3 py-1.5 font-mono text-xs transition focus:outline-none focus:ring-2 focus:ring-warning/50"
            />
            <p className="text-[10px] leading-snug text-muted-foreground">
              Để trống nếu hệ thống cho giáo viên tự đăng ký. Sai mã thì tài khoản vẫn
              được tạo nhưng ở quyền Học sinh.
            </p>
          </div>
        )}

        <button type="submit" disabled={busy} className={`${primaryButtonClass} mt-2`}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden />
          )}
          {busy ? 'Đang tạo tài khoản…' : 'Đăng ký tài khoản'}
        </button>
      </form>

      <div className="border-t border-border/50 pt-3 text-center text-xs text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link
          href="/login"
          className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
        >
          Đăng nhập <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </AuthCard>
  );
}
