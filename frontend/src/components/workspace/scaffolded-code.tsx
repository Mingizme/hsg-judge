'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Lightbulb, Copy, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScaffoldLevel {
  id: number;
  title: string;
  difficulty: 'Dễ' | 'Trung bình' | 'Khó';
  description: string;
  blanks: {
    id: string;
    label: string;
    correctAnswer: string[]; // Allowed equivalent variants
    hint: string;
    placeholder: string;
  }[];
  codeTemplate: string; // [BLANK_1], [BLANK_2]
}

const SCAFFOLD_LEVELS: ScaffoldLevel[] = [
  {
    id: 1,
    title: 'Mức độ 1: Điều kiện duy trì Stack đơn điệu',
    difficulty: 'Dễ',
    description: 'Điền điều kiện vào vòng lặp while để xóa các số nhỏ hơn khi gặp số lớn hơn.',
    blanks: [
      {
        id: 'BLANK_1',
        label: 'Điều kiện k',
        correctAnswer: ['k > 0', 'k>0', 'k >= 1', 'k>=1'],
        hint: 'Ta chỉ được xóa tối đa k lần, nên điều kiện là k phải lớn hơn 0.',
        placeholder: 'k > 0',
      },
      {
        id: 'BLANK_2',
        label: 'Kiểm tra Stack rỗng',
        correctAnswer: ['!st.empty()', '!st.empty ()', 'st.size() > 0', 'st.size()>0', '!st.empty() == true'],
        hint: 'Trước khi lấy st.top(), ta bắt buộc phải kiểm tra xem Stack có đang rỗng không.',
        placeholder: '!st.empty()',
      },
      {
        id: 'BLANK_3',
        label: 'So sánh phần tử',
        correctAnswer: ['s[i] > st.top()', 's[i]>st.top()', 'st.top() < s[i]', 'st.top()<s[i]'],
        hint: 'Nếu chữ số hiện tại s[i] lớn hơn chữ số ở đỉnh Stack st.top(), ta cần pop đỉnh.',
        placeholder: 's[i] > st.top()',
      },
    ],
    codeTemplate: `#include <bits/stdc++.h>
using namespace std;

int n, k;
string s;
stack<char> st;

int main() {
    ios_base::sync_with_stdio(0); cin.tie(0);
    cin >> n >> k >> s;

    for (int i = 0; i < n; i++) {
        // [1] Duy trì Stack đơn điệu giảm
        while ([BLANK_1] && [BLANK_2] && [BLANK_3]) {
            st.pop();
            k--;
        }
        st.push(s[i]);
    }

    // Xóa nốt các phần tử cuối nếu k vẫn còn > 0
    while (k > 0) {
        st.pop();
        k--;
    }

    vector<char> ans;
    while (!st.empty()) {
        ans.push_back(st.top());
        st.pop();
    }
    for (int i = ans.size() - 1; i >= 0; i--) cout << ans[i];

    return 0;
}`,
  },
  {
    id: 2,
    title: 'Mức độ 2: Xử lý phần tử còn dư & Trích xuất kết quả',
    difficulty: 'Trung bình',
    description: 'Hoàn thiện logic khi chuỗi s đã là dãy không tăng nhưng k vẫn còn dương.',
    blanks: [
      {
        id: 'BLANK_1',
        label: 'Điều kiện xóa đuôi',
        correctAnswer: ['k > 0', 'k>0', 'k != 0', 'k!=0'],
        hint: 'Nếu sau khi duyệt hết chuỗi mà k vẫn còn, ta tiếp tục pop từ đỉnh stack.',
        placeholder: 'k > 0',
      },
      {
        id: 'BLANK_2',
        label: 'Giảm số lần xóa',
        correctAnswer: ['k--', '--k', 'k = k - 1', 'k-=1'],
        hint: 'Mỗi lần st.pop() tương đương một lần xóa.',
        placeholder: 'k--',
      },
    ],
    codeTemplate: `#include <bits/stdc++.h>
using namespace std;

int n, k;
string s;
stack<char> st;

int main() {
    ios_base::sync_with_stdio(0); cin.tie(0);
    cin >> n >> k >> s;

    for (int i = 0; i < n; i++) {
        while (k > 0 && !st.empty() && s[i] > st.top()) {
            st.pop();
            k--;
        }
        st.push(s[i]);
    }

    // [2] Xử lý trường hợp chuỗi đã giảm dần nhưng k vẫn còn
    while ([BLANK_1]) {
        st.pop();
        [BLANK_2];
    }

    vector<char> ans;
    while (!st.empty()) {
        ans.push_back(st.top());
        st.pop();
    }
    for (int i = ans.size() - 1; i >= 0; i--) cout << ans[i];

    return 0;
}`,
  },
];

interface ScaffoldedCodeProps {
  problemCode?: string;
  onApplyCode?: (code: string) => void;
}

export function ScaffoldedCode({ problemCode = 'STRNUM', onApplyCode }: ScaffoldedCodeProps) {
  const [selectedLevelId, setSelectedLevelId] = useState(1);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentLevel = SCAFFOLD_LEVELS.find((l) => l.id === selectedLevelId) || SCAFFOLD_LEVELS[0];

  const handleInputChange = (blankId: string, value: string) => {
    setInputs((prev) => ({ ...prev, [blankId]: value }));
    setChecked(false);
  };

  const isBlankCorrect = (blankId: string) => {
    const blank = currentLevel.blanks.find((b) => b.id === blankId);
    if (!blank) return false;
    const val = (inputs[blankId] || '').trim();
    return blank.correctAnswer.some((ans) => ans.toLowerCase().replace(/\s+/g, '') === val.toLowerCase().replace(/\s+/g, ''));
  };

  const allCorrect = currentLevel.blanks.every((b) => isBlankCorrect(b.id));

  // Generate full code with blanks replaced
  const generatedCode = React.useMemo(() => {
    let code = currentLevel.codeTemplate;
    currentLevel.blanks.forEach((b) => {
      const val = inputs[b.id]?.trim() || b.placeholder;
      code = code.replace(`[${b.id}]`, val);
    });
    return code;
  }, [currentLevel, inputs]);

  const handleCheck = () => {
    setChecked(true);
  };

  const handleReset = () => {
    setInputs({});
    setChecked(false);
  };

  const handleCopyOrApply = () => {
    if (onApplyCode) {
      onApplyCode(generatedCode);
    } else {
      navigator.clipboard.writeText(generatedCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-y-auto p-4 gap-4">
      {/* Top Level Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Mức độ hỗ trợ:</span>
          <div className="flex gap-1.5">
            {SCAFFOLD_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => {
                  setSelectedLevelId(level.id);
                  setInputs({});
                  setChecked(false);
                }}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-lg transition-all',
                  selectedLevelId === level.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-background hover:bg-muted text-muted-foreground'
                )}
              >
                Mức {level.id} ({level.difficulty})
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm lại
          </button>
          <button
            onClick={handleCopyOrApply}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition shadow-sm"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Đã chuyển vào IDE!' : 'Chuyển vào IDE'}
          </button>
        </div>
      </div>

      {/* Level Description & Pedagogical Note */}
      <div className="p-3.5 rounded-xl border bg-card/60 space-y-1.5">
        <div className="text-sm font-bold text-foreground flex items-center gap-2">
          <span>{currentLevel.title}</span>
        </div>
        <p className="text-xs text-muted-foreground">{currentLevel.description}</p>
      </div>

      {/* Interactive Blank Inputs Form */}
      <div className="p-4 rounded-xl border bg-card/60 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>Điền logic vào các chỗ trống:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentLevel.blanks.map((b, idx) => {
            const isCorrect = checked && isBlankCorrect(b.id);
            const isWrong = checked && !isBlankCorrect(b.id);

            return (
              <div key={b.id} className="space-y-1.5 p-3 rounded-lg bg-background border">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-muted-foreground">
                    Vị trí [{idx + 1}]: <strong className="text-foreground">{b.label}</strong>
                  </span>
                  {checked && (
                    <span>
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  value={inputs[b.id] || ''}
                  onChange={(e) => handleInputChange(b.id, e.target.value)}
                  placeholder={b.placeholder}
                  className={cn(
                    'w-full px-3 py-1.5 rounded-md border font-mono text-xs bg-muted/20 focus:outline-none focus:ring-1 focus:ring-primary',
                    isCorrect && 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    isWrong && 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  )}
                />

                {isWrong && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                    Gợi ý: {b.hint}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            onClick={handleCheck}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 transition shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> Kiểm tra đáp án
          </button>

          {checked && allCorrect && (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Xuất sắc! Bạn đã điền chính xác toàn bộ logic.
            </div>
          )}
        </div>
      </div>

      {/* Code Preview Box */}
      <div className="p-4 rounded-xl border bg-zinc-950 text-zinc-100 font-mono text-xs leading-relaxed overflow-x-auto space-y-2">
        <div className="text-[11px] text-zinc-400 border-b border-zinc-800 pb-2 flex items-center justify-between">
          <span>Xem trước mã nguồn C++ hoàn chỉnh</span>
          <span className="text-[10px] text-zinc-500">Auto-updated</span>
        </div>
        <pre className="text-zinc-200">{generatedCode}</pre>
      </div>
    </div>
  );
}
