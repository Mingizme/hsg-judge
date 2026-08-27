import Link from 'next/link'
import { DifficultyBadge } from './difficulty-badge'
import { Clock, Database, FlaskConical, TrendingUp, ArrowUpRight } from 'lucide-react'
import type { ProblemSummary } from '@/lib/problems-api'

/** Giữ tên cũ để các trang đang `import { type Problem }` không phải sửa */
export type Problem = ProblemSummary

interface ProblemCardProps {
  problem: Problem
}

export function ProblemCard({ problem }: ProblemCardProps) {
  const hasAcRate = typeof problem.acRate === 'number'

  return (
    <Link
      href={`/problems/${problem.code}`}
      className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-subtle transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card">
        {/* Vệt sáng gradient rất nhẹ ở góc trên, chỉ hiện khi hover */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-brand opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20"
          aria-hidden
        />

        <div className="mb-3 flex items-start justify-between gap-2">
          <DifficultyBadge difficulty={problem.difficulty} />
          <div className="flex flex-wrap justify-end gap-1">
            {problem.category.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="rounded-full border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-1 flex items-center gap-1.5 font-mono text-xs font-semibold text-primary">
            {problem.code}
            <ArrowUpRight
              className="h-3 w-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              aria-hidden
            />
          </div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {problem.title}
          </h3>
        </div>

        <dl className="mt-4 flex flex-col gap-3 border-t pt-4 text-xs text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                <dt className="sr-only">Giới hạn thời gian</dt>
                <dd className="font-mono tabular-nums">{problem.timeLimit}s</dd>
              </div>
              <div className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5" aria-hidden />
                <dt className="sr-only">Giới hạn bộ nhớ</dt>
                <dd className="font-mono tabular-nums">{problem.memoryLimit}MB</dd>
              </div>
            </div>

            {/* Số test lấy thật từ DB; 0 test nghĩa là chưa nhập bộ test */}
            <div className="flex items-center gap-1">
              <FlaskConical className="h-3.5 w-3.5 text-info" aria-hidden />
              <dt className="sr-only">Số bộ test</dt>
              <dd className="font-mono tabular-nums">
                {problem.totalTests > 0
                  ? `${problem.totalTests} test`
                  : 'chưa có test'}
              </dd>
            </div>
          </div>

          {/* Tỉ lệ AC thật — chưa ai nộp thì nói thẳng là chưa có dữ liệu */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <dt className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" aria-hidden /> Tỉ lệ AC
              </dt>
              <dd className="font-mono font-semibold tabular-nums">
                {hasAcRate
                  ? `${problem.acRate}% · ${problem.totalSubmissions} lượt nộp`
                  : 'chưa có lượt nộp'}
              </dd>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={`Tỉ lệ giải đúng bài ${problem.code}`}
              aria-valuenow={hasAcRate ? (problem.acRate as number) : undefined}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-success transition-all duration-500 ease-smooth"
                style={{ width: hasAcRate ? `${problem.acRate}%` : '0%' }}
              />
            </div>
          </div>
        </dl>
      </article>
    </Link>
  )
}
