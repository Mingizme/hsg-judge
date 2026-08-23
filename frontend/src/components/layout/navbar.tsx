'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2, Menu, X, User, LogOut, ShieldCheck, GraduationCap, LogIn, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { useAuth } from '@/contexts/auth-context';

export function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, profile, isTeacher, logout } = useAuth();

  const navLinks = [
    { href: '/', label: 'Trang chủ' },
    { href: '/problems', label: 'Bài tập' },
    { href: '/leaderboard', label: 'Bảng xếp hạng' },
    // Only show Teacher link in navbar if user is Teacher
    ...(isTeacher ? [{ href: '/teacher', label: 'Quản trị bài (Giáo viên)' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-full items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            <span className="bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-xl font-bold text-transparent hidden sm:inline-block">
              HSG Judge
            </span>
          </Link>
        </div>

        {/* Center: Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === link.href ? 'text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <ThemeToggle />

          {/* User Auth Section */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border bg-card hover:bg-muted transition text-xs font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
                  {profile?.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
                <span className="max-w-[120px] truncate hidden sm:inline font-semibold">
                  {profile?.displayName || user.email?.split('@')[0]}
                </span>
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-bold border hidden sm:inline-flex items-center gap-0.5',
                    isTeacher
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                  )}
                >
                  {isTeacher ? <ShieldCheck className="w-2.5 h-2.5" /> : <GraduationCap className="w-2.5 h-2.5" />}
                  {isTeacher ? 'Giáo viên' : 'Học sinh'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl border bg-card p-1.5 shadow-xl space-y-1 text-xs animate-in fade-in zoom-in-95 z-50">
                  <div className="p-2 border-b border-border/50">
                    <div className="font-semibold text-foreground">{profile?.displayName || 'Tài khoản'}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
                    <div className="mt-1">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-0.5',
                          isTeacher
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                        )}
                      >
                        {isTeacher ? 'Vai trò: Giáo viên' : 'Vai trò: Học sinh'}
                      </span>
                    </div>
                  </div>

                  {isTeacher ? (
                    <Link
                      href="/teacher"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted text-foreground transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                      <span>Bảng quản trị giáo viên</span>
                    </Link>
                  ) : null}

                  <Link
                    href="/problems"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-muted text-foreground transition"
                  >
                    <Code2 className="w-3.5 h-3.5 text-primary" />
                    <span>Luyện tập bài tập</span>
                  </Link>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90 transition hidden sm:inline-block"
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-b bg-background p-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                'text-sm font-medium transition-colors p-2 rounded-md hover:bg-accent',
                pathname === link.href ? 'bg-accent text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-center py-2 border rounded-lg text-xs font-medium"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-center py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
