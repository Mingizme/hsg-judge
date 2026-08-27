import { cn } from '@/lib/utils'

interface DifficultyBadgeProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | string
  className?: string
}

/**
 * Dùng token semantic (`success`/`warning`/`destructive`) thay cho bảng màu
 * emerald/amber/rose viết cứng — nhờ đó badge tự khớp với cả chế độ Sáng và Tối
 * của design system, không cần hai bộ class `dark:`.
 */
const STYLES: Record<string, string> = {
  EASY: 'border-success/30 bg-success/10 text-success',
  MEDIUM: 'border-warning/30 bg-warning/10 text-warning',
  HARD: 'border-destructive/30 bg-destructive/10 text-destructive',
}

const LABELS: Record<string, string> = {
  EASY: 'Dễ',
  MEDIUM: 'Trung bình',
  HARD: 'Khó',
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        STYLES[difficulty] ?? 'border-border bg-muted text-muted-foreground',
        className
      )}
    >
      {LABELS[difficulty] ?? difficulty}
    </span>
  )
}
