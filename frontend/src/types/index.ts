export type Verdict = 'PENDING' | 'AC' | 'WA' | 'TLE' | 'MLE' | 'RTE' | 'CE' | 'SE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type SubmissionStatus = 'PENDING' | 'JUDGING' | 'COMPLETED' | 'ERROR';

export interface Category {
  id: string;
  name: string;
  nameVi: string;
  slug: string;
  color: string;
  icon: string;
}

export interface Problem {
  id: string;
  code: string;
  title: string;
  difficulty: Difficulty;
  ioType: string;
  pdfUrl?: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  totalTests: number;
  maxScore: number;
  isPublished: boolean;
  tags: Category[];
}

export interface TestCaseResult {
  testNumber: number;
  verdict: Verdict;
  executionTimeMs: number;
  errorMessage?: string;
  diff?: string;
}

export interface Submission {
  id: string;
  problemCode: string;
  status: SubmissionStatus;
  verdict?: Verdict;
  score?: number;
  maxScore: number;
  totalTests: number;
  passedTests?: number;
  executionTimeMs?: number;
  submittedAt: string;
  results?: TestCaseResult[];
}

export interface SSEEvent {
  type: 'compile' | 'test-result' | 'complete' | 'error';
  data: Record<string, any>;
}
