'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, UserRole } from '@/contexts/auth-context';
import { Code2, UserPlus, AlertCircle, ArrowRight, ShieldCheck, GraduationCap, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [secretCode, setSecretCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await signup(email, password, displayName, role, secretCode);
    setSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      if (role === 'TEACHER') {
        router.push('/teacher');
      } else {
        router.push('/problems');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md p-8 rounded-2xl border bg-card shadow-xl space-y-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <Code2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Tạo tài khoản mới</h1>
          <p className="text-xs text-muted-foreground">
            Tham gia cộng đồng luyện thi HSG Tin học THPT cùng C++.
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Bạn là:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('STUDENT')}
              className={cn(
                'p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all',
                role === 'STUDENT'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-blue-500'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              )}
            >
              <GraduationCap className="w-5 h-5" />
              <span>Học sinh tuyển</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('TEACHER')}
              className={cn(
                'p-3 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all',
                role === 'TEACHER'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-500'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              )}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Giáo viên bồi dưỡng</span>
            </button>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="p-3 rounded-xl border bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Họ và tên / Biệt danh</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-3.5 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@email.com"
              className="w-full px-3.5 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Mật khẩu</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-3.5 py-2 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Teacher Secret Code (Optional / Configurable) */}
          {role === 'TEACHER' && (
            <div className="space-y-1 p-3 rounded-xl border bg-amber-500/5 border-amber-500/20">
              <label className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" /> Mã xác thực Giáo viên (Tùy chọn)
              </label>
              <input
                type="text"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="HSG_TEACHER_2026"
                className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <p className="text-[10px] text-muted-foreground">
                Để trống nếu hệ thống mở cho giáo viên tự đăng ký.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-sm hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-border/50 text-xs text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
            Đăng nhập <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
