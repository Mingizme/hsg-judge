/**
 * Lớp truy cập API bài tập dùng chung cho trang chủ và trang danh sách.
 *
 * Trước đây hai trang tự fetch rồi tự map, mỗi nơi một kiểu, và cùng bịa dữ
 * liệu: `acRate: 50` cố định, `totalTests: p.totalTests || 24`, số bài tập lấy
 * từ một lần fetch `?limit=6` rồi hiển thị như tổng số bài. Nay chỉ còn một
 * nguồn duy nhất, và mọi con số đều lấy thật từ backend.
 */

import { API_BASE } from './api-config';

export { API_BASE };

export interface ProblemSummary {
  id: string;
  code: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | string;
  /** giây */
  timeLimit: number;
  /** MB */
  memoryLimit: number;
  category: string[];
  /** `null` khi chưa có lượt nộp nào — KHÔNG hiển thị phần trăm bịa */
  acRate: number | null;
  totalTests: number;
  totalSubmissions: number;
}

export interface ProblemListResult {
  problems: ProblemSummary[];
  page: number;
  totalPages: number;
  /** Tổng số bài khớp điều kiện lọc, không phụ thuộc `limit` */
  total: number;
}

export interface ProblemListQuery {
  page?: number;
  limit?: number;
  difficulty?: string;
  search?: string;
}

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  return Number.isFinite(n) ? (n as number) : fallback;
}

export function mapProblemSummary(raw: Record<string, any>): ProblemSummary {
  const categories = Array.isArray(raw.categories)
    ? raw.categories
    : Array.isArray(raw.tags)
      ? raw.tags
      : [];

  return {
    id: String(raw.id ?? raw.code ?? ''),
    code: String(raw.code ?? ''),
    title: raw.title || `Bài tập ${raw.code ?? ''}`,
    difficulty: raw.difficulty || 'MEDIUM',
    timeLimit: toNumber(raw.timeLimitMs, 1000) / 1000,
    memoryLimit: toNumber(raw.memoryLimitMb, 256),
    category: categories
      .map((c: any) => c?.nameVi || c?.name)
      .filter((name: unknown): name is string => typeof name === 'string'),
    acRate: typeof raw.acRate === 'number' ? raw.acRate : null,
    totalTests: toNumber(raw.totalTests, 0),
    totalSubmissions: toNumber(raw.totalSubmissions, 0),
  };
}

/**
 * Lọc và phân trang Ở PHÍA SERVER. Trang danh sách trước đây tải toàn bộ bài
 * rồi filter bằng JavaScript — vừa tải thừa, vừa sai khi số bài vượt trang đầu.
 */
export async function fetchProblemList(
  query: ProblemListQuery = {},
  signal?: AbortSignal,
): Promise<ProblemListResult> {
  const params = new URLSearchParams();
  params.set('page', String(Math.max(1, query.page ?? 1)));
  params.set('limit', String(Math.min(100, Math.max(1, query.limit ?? 20))));
  if (query.difficulty) params.set('difficulty', query.difficulty);
  if (query.search?.trim()) params.set('search', query.search.trim());

  const res = await fetch(`${API_BASE}/problems?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Không tải được danh sách bài tập (HTTP ${res.status})`);
  }

  const json = await res.json();
  const body = json?.data ?? json;
  const rawList = Array.isArray(body?.problems)
    ? body.problems
    : Array.isArray(body)
      ? body
      : [];
  const pagination = body?.pagination ?? {};

  return {
    problems: rawList.map(mapProblemSummary),
    page: toNumber(pagination.page, 1),
    totalPages: toNumber(pagination.totalPages, 1),
    total: toNumber(pagination.total, rawList.length),
  };
}

export interface JudgeHealth {
  engine: string;
  engineLabel: string;
  timeAccuracy: string;
}

/** Tên máy chấm THẬT — trang chủ trước đây ghi cứng "Judge0 CE". */
export async function fetchJudgeHealth(
  signal?: AbortSignal,
): Promise<JudgeHealth | null> {
  try {
    const res = await fetch(`${API_BASE}/judge/health`, { signal });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? json;
    if (!data?.engineLabel) return null;
    return {
      engine: String(data.engine ?? ''),
      engineLabel: String(data.engineLabel),
      timeAccuracy: String(data.timeAccuracy ?? ''),
    };
  } catch {
    return null;
  }
}
