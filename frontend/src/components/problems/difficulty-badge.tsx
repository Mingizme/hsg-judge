import { cn } from '@/lib/utils'

interface DifficultyBadgeProps {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | string
  className?: string
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const getBadgeStyle = () => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'HARD':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getLabel = () => {
    switch (difficulty) {
      case 'EASY': return 'Dễ'
      case 'MEDIUM': return 'Trung bình'
      case 'HARD': return 'Khó'
      default: return difficulty
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        getBadgeStyle(),
        className
      )}
    >
      {getLabel()}
    </span>
  )
}
