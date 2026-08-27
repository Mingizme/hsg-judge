'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Trophy,
  Medal,
  Flame,
  Search,
  RefreshCw,
  ShieldCheck,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE } from '@/lib/api-config';
import { useAuth } from '@/contexts/auth-context';

export interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  email: string;
  role: 'TEACHER' | 'STUDENT';
  isTeacher: boolean;
  school: string;
  solvedCount: number;
  totalScore: number;
  totalSubmissions: number;
  tier: string;
  tierColor: string;
}

/** Chỉ nhận mã màu hex — `tierColor` từ API được nhúng thẳng vào `style` */
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function safeTierColor(value: unknown): string | null {
  return typeof value === 'string' && HEX_COLOR.test(value.trim())
    ? value.trim()
    : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * Chuẩn hoá một dòng xếp hạng.
 *
 * Trước đây trang này tin tuyệt đối vào API: `s.name.toLowerCase()` trong bộ lọc
 * và `s.name.charAt(0)` cho avatar đều nổ TypeError nếu một tài khoản thiếu tên
 * hoặc thiếu trường `school` — cả bảng xếp hạng trắng xoá vì một hàng lỗi.
 */
function mapRow(raw: Record<string, any>, index: number): LeaderboardUser {
  const role = raw?.role === 'TEACHER' ? 'TEACHER' : 'STUDENT';
  const email = text(raw?.email);
  return {
    rank: num(raw?.rank) || index + 1,
    id: text(raw?.id) || email || `row-${index}`,
    name: text(raw?.name) || text(raw?.displayName) || email.split('@')[0] || 'Ẩn danh',
    email,
    role,
    isTeacher: raw?.isTeacher === true || role === 'TEACHER',
    school: text(raw?.school),
    solvedCount: num(raw?.solvedCount),
    totalScore: num(raw?.totalScore),
    totalSubmissions: num(raw?.totalSubmissions),
    tier: text(raw?.tier) || 'Specialist',
    tierColor: text(raw?.tierColor),
  };
}

/** Huy hiệu bục vinh danh: hạng 1 vàng, 2 bạc, 3 đồng — dùng token màu của theme */
const PODIUM = [
  {
    label: 'Quán quân',
    ring: 'border-warning/60',
    bg: 'bg-warning/5',
    chip: 'bg-warning text-background',
    icon: Crown,
    iconClass: 'text-warning',
  },
  {
    label: 'Á quân',
    ring: 'border-border',
    bg: 'bg-surface/60',
    chip: 'bg-muted-foreground text-background',
    icon: Medal,
    iconClass: 'text-muted-foreground',
  },
  {
    label: 'Hạng ba',
    ring: 'border-info/40',
    bg: 'bg-info/5',
    chip: 'bg-info text-background',
    icon: Medal,
    iconClass: 'text-info',
  },
] as const;

function PodiumCard({
  user,
  place,
  isSelf,
}: {
  user?: LeaderboardUser;
  place: 0 | 1 | 2;
  isSelf: boolean;
}) {
  const meta = PODIUM[place];
  const Icon = meta.icon;
  const isChampion = place === 0;

  if (!user) {
    return (
      <div
        className={cn(
          'hidden items-center justify-center rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground md:flex',
          isChampion ? 'order-1 md:order-2' : place === 1 ? 'order-2 md:order-1' : 'order-3',
        )}
      >
        Chưa có ai giữ {meta.label.toLowerCase()}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center overflow-hidden rounded-2xl border p-6 text-center',
        'transition-all duration-300 ease-smooth hover:-translate-y-0.5',
        meta.ring,
        meta.bg,
        isChampion
          ? 'order-1 shadow-elevated md:order-2 md:scale-[1.04] md:hover:shadow-glow'
          : place === 1
            ? 'order-2 shadow-card md:order-1'
            : 'order-3 shadow-card',
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute right-3 top-2 text-4xl font-black text-foreground/5"
      >
        #{user.rank}
      </span>

      <div
        className={cn(
          'relative mb-4 flex items-center justify-center rounded-full border-4 bg-background',
          meta.ring,
          isChampion ? 'h-20 w-20' : 'h-16 w-16',
        )}
      >
        <Icon className={cn(isChampion ? 'h-9 w-9' : 'h-7 w-7', meta.iconClass)} aria-hidden />
        <span
          className={cn(
            'absolute -bottom-2.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-subtle',
            meta.chip,
          )}
        >
          {meta.label}
        </span>
      </div>

      <h3
        className={cn(
          'flex items-center justify-center gap-1.5 font-bold text-foreground',
          isChampion ? 'text-lg' : 'text-base',
        )}
      >
        <span className="line-clamp-1">{user.name}</span>
        {user.isTeacher && <ShieldCheck className="h-4 w-4 shrink-0 text-warning" aria-label="Giáo viên" />}
        {isSelf && (
          <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            Tôi
          </span>
        )}
      </h3>
      {user.school && (
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{user.school}</p>
      )}

      <div className="mt-4 flex items-center gap-3 font-mono text-xs">
        <span className="font-bold text-success">{user.solvedCount} bài AC</span>
        <span className="text-border">|</span>
        <span className={cn('font-bold', isChampion ? 'text-warning' : 'text-primary')}>
          {user.totalScore} điểm
        </span>
      </div>

      {isChampion && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-[11px] font-medium text-warning">
          <Flame className="h-3.5 w-3.5" aria-hidden /> {user.totalSubmissions} lần nộp
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 p-3.5 shadow-subtle">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className={cn('h-3.5 w-3.5', tone)} aria-hidden />
        {label}
      </div>
      <div className={cn('mt-1 font-mono text-xl font-bold', tone)}>{value}</div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLeaderboard = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/leaderboard`, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : [];
      setRows(list.map(mapRow));
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Trước đây lỗi mạng chỉ được `console.error`: người dùng thấy bảng trống
      // và tưởng chưa ai nộp bài, thay vì biết là máy chấm đang ngủ.
      setError(
        'Không tải được bảng xếp hạng. Máy chủ trên Render free tier có thể đang khởi động lại (mất ~30 giây).',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchLeaderboard(controller.signal);
    return () => controller.abort();
  }, [fetchLeaderboard]);

  /** API có thể trả id Supabase hoặc email → so khớp cả hai để gắn nhãn "Tôi" */
  const selfId = (user?.id || '').toLowerCase();
  const selfEmail = (user?.email || '').toLowerCase();
  const isSelf = useCallback(
    (row: LeaderboardUser) =>
      (!!selfId && row.id.toLowerCase() === selfId) ||
      (!!selfEmail && row.email.toLowerCase() === selfEmail),
    [selfId, selfEmail],
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.school.toLowerCase().includes(q),
    );
  }, [rows, searchTerm]);

  const totals = useMemo(
    () => ({
      players: rows.length,
      solved: rows.reduce((sum, s) => sum + s.solvedCount, 0),
      submissions: rows.reduce((sum, s) => sum + s.totalSubmissions, 0),
    }),
    [rows],
  );

  return (
    <div className="container mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
            <Trophy className="h-4 w-4 text-warning" aria-hidden />
            Bảng vinh danh tuyển thủ
          </div>
          <h1 className="bg-gradient-brand bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Bảng xếp hạng
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Xếp hạng thời gian thực theo số bài AC và tổng điểm máy chấm cộng tự động.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchLeaderboard()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 text-xs font-semibold shadow-subtle transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
          <span>Làm mới bảng điểm</span>
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={Users} label="Thí sinh" value={totals.players} tone="text-primary" />
        <StatTile icon={CheckCircle2} label="Lượt AC" value={totals.solved} tone="text-success" />
        <StatTile icon={Flame} label="Lượt nộp" value={totals.submissions} tone="text-warning" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl border bg-muted/40"
              aria-hidden
            />
          ))}
        </div>
      ) : rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <PodiumCard user={rows[1]} place={1} isSelf={!!rows[1] && isSelf(rows[1])} />
          <PodiumCard user={rows[0]} place={0} isSelf={!!rows[0] && isSelf(rows[0])} />
          <PodiumCard user={rows[2]} place={2} isSelf={!!rows[2] && isSelf(rows[2])} />
        </div>
      ) : null}

      <section className="space-y-4 rounded-2xl border bg-card/60 p-6 shadow-card">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-lg font-bold">
            Danh sách xếp hạng
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {filtered.length}/{rows.length} thí sinh
            </span>
          </h2>
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              aria-label="Tìm thí sinh theo tên, email hoặc trường"
              placeholder="Tìm theo tên, email, trường…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border bg-background py-1.5 pl-9 pr-3 text-xs transition focus:outline-none focus:ring-2 focus:ring-ring/70"
            />
          </div>
        </div>

        <div className="scrollbar-thin-muted overflow-x-auto">
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-muted/40" aria-hidden />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-xs text-muted-foreground">
              <Trophy className="h-8 w-8 text-muted-foreground/40" aria-hidden />
              <span>
                {rows.length === 0
                  ? 'Chưa có lượt nộp nào được ghi nhận. Hãy giải bài đầu tiên để mở bảng xếp hạng!'
                  : `Không có thí sinh nào khớp với “${searchTerm.trim()}”.`}
              </span>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Bảng xếp hạng thí sinh theo số bài AC và tổng điểm
              </caption>
              <thead className="border-b bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="w-16 px-4 py-3 text-center">Hạng</th>
                  <th scope="col" className="px-4 py-3">Thí sinh</th>
                  <th scope="col" className="hidden px-4 py-3 md:table-cell">Vai trò</th>
                  <th scope="col" className="px-4 py-3 text-center">Cấp bậc</th>
                  <th scope="col" className="px-4 py-3 text-center">Bài AC</th>
                  <th scope="col" className="px-4 py-3 text-center">Lượt nộp</th>
                  <th scope="col" className="px-4 py-3 text-right">Tổng điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-xs">
                {filtered.map((s) => (
                  <LeaderboardRow key={s.id} row={s} isSelf={isSelf(s)} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

const RANK_MEDAL: Record<number, string> = {
  1: 'bg-warning text-background',
  2: 'bg-muted-foreground text-background',
  3: 'bg-info text-background',
};

function LeaderboardRow({ row, isSelf }: { row: LeaderboardUser; isSelf: boolean }) {
  const tierColor = safeTierColor(row.tierColor);

  return (
    <tr
      className={cn(
        'transition-colors hover:bg-muted/30',
        isSelf && 'bg-primary/5 hover:bg-primary/10',
      )}
    >
      <td className="px-4 py-3.5 text-center font-bold">
        {RANK_MEDAL[row.rank] ? (
          <span
            className={cn(
              'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black shadow-subtle',
              RANK_MEDAL[row.rank],
            )}
          >
            {row.rank}
          </span>
        ) : (
          <span className="font-mono text-muted-foreground">#{row.rank}</span>
        )}
      </td>

      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
            aria-hidden
          >
            {row.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <span className="truncate">{row.name}</span>
              {isSelf && (
                <span className="shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  Tôi
                </span>
              )}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {row.email}
              {row.school ? ` · ${row.school}` : ''}
            </div>
          </div>
        </div>
      </td>

      <td className="hidden px-4 py-3.5 md:table-cell">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold',
            row.isTeacher
              ? 'border-warning/30 bg-warning/10 text-warning'
              : 'border-info/30 bg-info/10 text-info',
          )}
        >
          {row.isTeacher ? (
            <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
          ) : (
            <GraduationCap className="h-2.5 w-2.5" aria-hidden />
          )}
          {row.isTeacher ? 'Giáo viên' : 'Học sinh'}
        </span>
      </td>

      <td className="px-4 py-3.5 text-center">
        {/* `tierColor` là hex do API trả về — chỉ nhúng khi đúng định dạng,
            còn lại rơi về token của theme để không vỡ giao diện Sáng/Tối. */}
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
            !tierColor && 'border-border bg-muted/50 text-muted-foreground',
          )}
          style={
            tierColor
              ? {
                  backgroundColor: `${tierColor}1a`,
                  borderColor: `${tierColor}55`,
                  color: tierColor,
                }
              : undefined
          }
        >
          {row.tier}
        </span>
      </td>

      <td className="px-4 py-3.5 text-center font-mono font-bold text-success">
        {row.solvedCount}
      </td>
      <td className="px-4 py-3.5 text-center font-mono text-muted-foreground">
        {row.totalSubmissions}
      </td>
      <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-foreground">
        {row.totalScore}
      </td>
    </tr>
  );
}

