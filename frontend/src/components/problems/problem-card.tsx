import Link from 'next/link'
import { DifficultyBadge } from './difficulty-badge'
import { Clock, Database, CheckCircle2 } from 'lucide-react'

// Define local minimal Problem interface to avoid missing imports in case types aren't complete
export interface Problem {
  id: string
  code: string
  title: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | string
  timeLimit: number
  memoryLimit: number
  category?: string[]
  acRate?: number
  totalTests?: number
}

interface ProblemCardProps {
  problem: Problem
}

export function ProblemCard({ problem }: ProblemCardProps) {
  return (
    <Link href={`/problems/${problem.code}`}>
      <div className="group relative flex flex-col h-full rounded-xl border bg-card p-5 hover:shadow-lg transition-all duration-300 hover:border-primary/50">
        <div className="flex items-center justify-between mb-3">
          <DifficultyBadge difficulty={problem.difficulty} />
          <div className="flex gap-1">
            {problem.category?.slice(0, 2).map((cat) => (
              <span key={cat} className="text-[10px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                {cat}
              </span>
            ))}
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-lg line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            <span className="text-muted-foreground font-mono text-sm mr-2">{problem.code}</span>
            {problem.title}
          </h3>
        </div>

        <div className="mt-4 pt-4 border-t flex flex-col gap-3 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {problem.timeLimit}s
              </span>
              <span className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5" />
                {problem.memoryLimit}MB
              </span>
            </div>
            {problem.totalTests !== undefined && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {problem.totalTests} tests
              </span>
            )}
          </div>
          
          {problem.acRate !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span>Tỉ lệ AC</span>
                <span>{problem.acRate}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all" 
                  style={{ width: `${problem.acRate}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
