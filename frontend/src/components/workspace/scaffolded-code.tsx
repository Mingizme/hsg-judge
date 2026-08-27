'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  RefreshCw,
  Sparkles,
  PencilRuler,
  ArrowRightCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateScaffoldLevels,
  normalizeAnswer,
  type ScaffoldDifficulty,
} from '@/lib/scaffold-generator';

const DIFFICULTY_STYLES: Record<ScaffoldDifficulty, string> = {
  Dễ: 'border-success/30 bg-success/10 text-success',
  'Trung bình': 'border-warning/30 bg-warning/10 text-warning',
  Khó: 'border-destructive/30 bg-destructive/10 text-destructive',
};

/** Tô sáng các chỗ chưa điền trong khung xem trước */
const PENDING_MARKER = /(\/\* \[Chỗ trống\][^*]*\*\/)/g;
/** Bản không có cờ `g` — `RegExp.test` trên regex global có trạng thái lastIndex */
const IS_PENDING = /^\/\* \[Chỗ trống\]/;

function PreviewCode({ code }: { code: string }) {
  const parts = code.split(PENDING_MARKER);
  return (
    <code>
      {parts.map((part, i) =>
        IS_PENDING.test(part) ? (
          <span
            key={i}
            className="rounded bg-warning/20 px-1 font-bold text-warning ring-1 ring-warning/40"
          >
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </code>
  );
}

interface ScaffoldedCodeProps {
  problemCode: string;
  initialCode?: string;
  onApplyCode?: (code: string) => void;
}

export function ScaffoldedCode({
  problemCode,
  initialCode,
  onApplyCode,
}: ScaffoldedCodeProps) {
  /**
   * Chỗ trống được khoét TRỰC TIẾP từ lời giải mẫu của giáo viên. Trước đây chỉ
   * TAOXAU và STRNUM có đề viết cứng, mọi bài khác nhận một chỗ trống bịa với
   * đáp án ['true', '1', 'i < n', 'k > 0'] và mẫu code không hề bị khoét — học
   * sinh không có gì để điền mà vẫn bị báo sai.
   */
  const levels = useMemo(
    () => generateScaffoldLevels(initialCode || ''),
    [initialCode],
  );

  const [activeLevelId, setActiveLevelId] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<Record<string, boolean | null>>({});
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState(false);

  const resetProgress = () => {
    setAnswers({});
    setValidation({});
    setShowHints({});
    setApplied(false);
  };

  // Đổi bài (hoặc giáo viên cập nhật lời giải) → về mức 1 và xoá bài làm cũ
  useEffect(() => {
    setActiveLevelId(levels[0]?.id ?? 1);
    resetProgress();
  }, [levels]);

  const activeLevel = levels.find((l) => l.id === activeLevelId) ?? levels[0];

  const handleAnswerChange = (blankId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [blankId]: val }));
    setValidation((prev) => ({ ...prev, [blankId]: null }));
    setApplied(false);
  };

  const handleCheck = () => {
    if (!activeLevel) return;
    const next: Record<string, boolean> = {};
    activeLevel.blanks.forEach((b) => {
      const userAns = normalizeAnswer(answers[b.id] || '');
      next[b.id] =
        userAns.length > 0 &&
        b.correctAnswer.some((ans) => normalizeAnswer(ans) === userAns);
    });
    setValidation(next);
  };

  const toggleHint = (blankId: string) => {
    setShowHints((prev) => ({ ...prev, [blankId]: !prev[blankId] }));
  };

  const generatedCode = useMemo(() => {
    if (!activeLevel) return '';
    let result = activeLevel.codeTemplate;
    activeLevel.blanks.forEach((b) => {
      const val = answers[b.id]?.trim()
        ? answers[b.id]
        : `/* [Chỗ trống]: ${b.label} */`;
      result = result.split(`[${b.id}]`).join(val);
    });
    return result;
  }, [activeLevel, answers]);

  const correctCount = activeLevel
    ? activeLevel.blanks.filter((b) => validation[b.id] === true).length
    : 0;
  const allCorrect =
    !!activeLevel &&
    activeLevel.blanks.length > 0 &&
    correctCount === activeLevel.blanks.length;

  const handleApplyToEditor = () => {
    if (!onApplyCode || !activeLevel) return;
    let codeToApply = activeLevel.codeTemplate;
    activeLevel.blanks.forEach((b) => {
      const val = answers[b.id]?.trim() ? answers[b.id] : b.correctAnswer[0];
      codeToApply = codeToApply.split(`[${b.id}]`).join(val);
    });
    onApplyCode(codeToApply);
    setApplied(true);
  };

  if (!activeLevel) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background p-8 text-center">
        <PencilRuler
          className="h-10 w-10 stroke-1 text-muted-foreground/40"
          aria-hidden
        />
        <p className="text-sm font-semibold text-foreground">
          Chưa tạo được bài tập điền khuyết
        </p>
        <p className="max-w-[340px] text-xs leading-relaxed text-muted-foreground">
          Các chỗ trống được khoét tự động từ lời giải mẫu (.cpp) mà giáo viên
          tải lên cho bài <span className="font-mono font-semibold">{problemCode}</span>.
          Khi chưa có tệp đó, hệ thống không hiển thị bài tập của bài khác để
          tránh dạy sai thuật toán.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-xs">
      {/* Thanh chọn mức độ */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="hidden font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
            Mức độ hỗ trợ
          </span>
          <div
            role="group"
            aria-label="Chọn mức độ bài tập điền khuyết"
            className="flex items-center gap-1 rounded-xl border bg-muted/70 p-0.5 shadow-inner"
          >
            {levels.map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                aria-pressed={activeLevelId === lvl.id}
                onClick={() => {
                  setActiveLevelId(lvl.id);
                  resetProgress();
                }}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-semibold transition-all duration-200 ease-smooth',
                  activeLevelId === lvl.id
                    ? 'bg-primary text-primary-foreground shadow-subtle'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Mức {lvl.id}{' '}
                <span className="opacity-80">({lvl.difficulty})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={resetProgress}
            className="flex items-center gap-1 rounded-lg border bg-background px-2.5 py-1 font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Xoá hết đáp án đã điền"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            <span>Làm lại</span>
          </button>

          <button
            type="button"
            onClick={handleApplyToEditor}
            disabled={!onApplyCode}
            className={cn(
              'flex items-center gap-1 rounded-lg px-3 py-1 font-semibold text-white shadow-subtle transition-all duration-200 ease-smooth disabled:opacity-50',
              applied
                ? 'bg-success hover:bg-success/90'
                : 'bg-gradient-brand hover:shadow-glow',
            )}
            title="Đưa mã nguồn đang xem sang trình soạn thảo bên phải"
          >
            {applied ? (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ArrowRightCircle className="h-3.5 w-3.5" aria-hidden />
            )}
            <span>{applied ? 'Đã chuyển vào IDE' : 'Chuyển vào IDE'}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin-muted">
        {/* Giới thiệu mức độ + tiến độ */}
        <div className="space-y-2 rounded-2xl border bg-card/70 p-4 shadow-subtle">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              {activeLevel.title}
            </h3>
            <span
              className={cn(
                'rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                DIFFICULTY_STYLES[activeLevel.difficulty],
              )}
            >
              {activeLevel.difficulty}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {activeLevel.description}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={correctCount}
              aria-valuemin={0}
              aria-valuemax={activeLevel.blanks.length}
              aria-label="Số chỗ trống đã điền đúng"
            >
              <div
                className="h-full rounded-full bg-gradient-brand transition-all duration-500 ease-smooth"
                style={{
                  width: `${(correctCount / activeLevel.blanks.length) * 100}%`,
                }}
              />
            </div>
            <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
              {correctCount}/{activeLevel.blanks.length}
            </span>
          </div>
        </div>

        {/* Ô điền đáp án */}
        <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-subtle">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-warning" aria-hidden />
            <span>Điền logic vào các chỗ trống</span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeLevel.blanks.map((blank, idx) => {
              const status = validation[blank.id];
              return (
                <div
                  key={blank.id}
                  className={cn(
                    'space-y-2 rounded-xl border bg-muted/20 p-3 transition-all duration-200 ease-smooth',
                    status === true && 'border-success/50 bg-success/10',
                    status === false && 'border-destructive/50 bg-destructive/10',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label
                      htmlFor={`blank-${blank.id}`}
                      className="text-[11px] font-semibold leading-tight text-foreground"
                    >
                      <span className="font-mono text-primary">[{idx + 1}]</span>{' '}
                      {blank.label}
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleHint(blank.id)}
                      aria-expanded={!!showHints[blank.id]}
                      className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-warning transition hover:text-warning/80"
                    >
                      <Lightbulb className="h-3 w-3" aria-hidden /> Gợi ý
                    </button>
                  </div>

                  <input
                    id={`blank-${blank.id}`}
                    type="text"
                    value={answers[blank.id] || ''}
                    onChange={(e) => handleAnswerChange(blank.id, e.target.value)}
                    placeholder={blank.placeholder}
                    spellCheck={false}
                    autoComplete="off"
                    className="w-full rounded-lg border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  />

                  {showHints[blank.id] && (
                    <p className="rounded-lg border border-warning/30 bg-warning/10 p-2 text-[11px] leading-snug text-warning">
                      {blank.hint}
                    </p>
                  )}

                  {status === true && (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Chính
                      xác!
                    </p>
                  )}

                  {status === false && (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden /> Chưa
                      đúng, hãy thử lại!
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleCheck}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-subtle transition hover:bg-primary/90"
            >
              Kiểm tra đáp án
            </button>

            {allCorrect && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-success animate-fade-in">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Tất cả chỗ trống đã đúng — bấm &quot;Chuyển vào IDE&quot; để nộp
                bài.
              </span>
            )}
          </div>
        </div>

        {/* Xem trước mã nguồn */}
        <div className="space-y-2 rounded-2xl border bg-card p-4 shadow-subtle">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-semibold">
              Xem trước mã nguồn C++ hoàn chỉnh
            </span>
            <span className="font-mono text-[10px] opacity-70">
              Tự động cập nhật
            </span>
          </div>
          <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-3 font-mono text-xs leading-relaxed text-foreground scrollbar-thin-muted">
            <PreviewCode code={generatedCode} />
          </pre>
        </div>
      </div>
    </div>
  );
}
