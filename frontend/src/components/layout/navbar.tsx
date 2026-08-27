'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Code2,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  GraduationCap,
  ChevronDown,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '@/contexts/auth-context';

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, profile, isTeacher, logout } = useAuth();

  const userMenuRef = useRef<HTMLDivElement>(null);

  /**
   * Trước đây menu tài khoản chỉ đóng khi bấm lại đúng cái nút mở nó: click ra
   * ngoài, bấm Esc hay chuyển trang đều để nó treo trên màn hình.
   */
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isUserMenuOpen]);

  // Đổi trang → đóng cả hai menu
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = useCallback(async () => {
    setIsUserMenuOpen(false);
    await logout();
  }, [logout]);

  const navLinks = [
    { href: '/', label: 'Trang chủ' },
    { href: '/problems', label: 'Bài tập' },
    { href: '/leaderboard', label: 'Bảng xếp hạng' },
    ...(isTeacher ? [{ href: '/teacher', label: 'Quản trị (Giáo viên)' }] : []),
  ];

  const roleBadgeClass = isTeacher
    ? 'border-warning/30 bg-warning/10 text-warning'
    : 'border-info/30 bg-info/10 text-info';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Code2 className="h-6 w-6 text-primary" aria-hidden />
          <span className="hidden bg-gradient-brand bg-clip-text text-xl font-bold text-transparent sm:inline-block">
            HSG Judge
          </span>
        </Link>

        {/* Điều hướng desktop */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Điều hướng chính">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={cn(
                'relative text-sm font-medium transition-colors hover:text-primary',
                isActive(link.href)
                  ? 'font-semibold text-primary after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:rounded-full after:bg-primary'
                  : 'text-muted-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-xl border bg-card px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary"
                  aria-hidden
                >
                  {profile?.displayName?.charAt(0).toUpperCase() ||
                    user.email?.charAt(0).toUpperCase() ||
                    'U'}
                </span>
                <span className="hidden max-w-[120px] truncate font-semibold sm:inline">
                  {profile?.displayName || user.email?.split('@')[0]}
                </span>
                <span
                  className={cn(
                    'hidden items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold sm:inline-flex',
                    roleBadgeClass,
                  )}
                >
                  {isTeacher ? (
                    <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
                  ) : (
                    <GraduationCap className="h-2.5 w-2.5" aria-hidden />
                  )}
                  {isTeacher ? 'Giáo viên' : 'Học sinh'}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                    isUserMenuOpen && 'rotate-180',
                  )}
                  aria-hidden
                />
              </button>

              {isUserMenuOpen && (
                <div
                  role="menu"
                  aria-label="Tài khoản"
                  className="absolute right-0 z-50 mt-1.5 w-56 animate-fade-in space-y-1 rounded-xl border bg-card p-1.5 text-xs shadow-elevated"
                >
                  <div className="border-b border-border/50 p-2">
                    <div className="font-semibold text-foreground">
                      {profile?.displayName || 'Tài khoản'}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {user.email}
                    </div>
                    <span
                      className={cn(
                        'mt-1 inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold',
                        roleBadgeClass,
                      )}
                    >
                      {isTeacher ? 'Vai trò: Giáo viên' : 'Vai trò: Học sinh'}
                    </span>
                  </div>

                  {isTeacher && (
                    <Link
                      href="/teacher"
                      role="menuitem"
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-foreground transition hover:bg-muted"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 text-warning" aria-hidden />
                      <span>Bảng quản trị giáo viên</span>
                    </Link>
                  )}

                  <Link
                    href="/problems"
                    role="menuitem"
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-foreground transition hover:bg-muted"
                  >
                    <Code2 className="h-3.5 w-3.5 text-primary" aria-hidden />
                    <span>Luyện tập bài tập</span>
                  </Link>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-destructive transition hover:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="hidden rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-subtle transition hover:bg-primary/90 sm:inline-block"
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Nút menu di động */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
            aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Điều hướng di động */}
      {isMobileMenuOpen && (
        <nav
          id="mobile-nav"
          aria-label="Điều hướng di động"
          className="flex animate-fade-in flex-col gap-3 border-b bg-background p-4 md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={cn(
                'rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent',
                isActive(link.href)
                  ? 'bg-accent font-semibold text-primary'
                  : 'text-muted-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}

          {!user && (
            <div className="grid grid-cols-2 gap-2 border-t pt-2">
              <Link
                href="/login"
                className="rounded-lg border py-2 text-center text-xs font-medium"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-primary py-2 text-center text-xs font-semibold text-primary-foreground"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
