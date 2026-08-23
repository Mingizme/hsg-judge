'use client';

import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Lightbulb, Copy, RefreshCw, Sparkles } from 'lucide-react';
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

const TAOXAU_LEVELS: ScaffoldLevel[] = [
  {
    id: 1,
    title: 'Mức độ 1: Kiểm tra ký tự là chữ số',
    difficulty: 'Dễ',
    description: 'Điền điều kiện kiểm tra ký tự c có phải là chữ số từ 0 đến 9 hay không.',
    blanks: [
      {
        id: 'BLANK_1',
        label: 'Điều kiện ký tự số',
        correctAnswer: [
          "c >= '0' && c <= '9'",
          "c>='0' && c<='9'",
          "c >= '0' && c <= '9'",
          "isdigit(c)",
          "isdigit(c) != 0",
          "'0' <= c && c <= '9'",
        ],
        hint: "Ký tự chữ số nằm trong đoạn từ '0' đến '9' hoặc dùng hàm isdigit(c).",
        placeholder: "c >= '0' && c <= '9'",
      },
      {
        id: 'BLANK_2',
        label: 'Thêm ký tự vào xâu kết quả',
        correctAnswer: ['res += c', 'res += c;', 'res.push_back(c)', 'res.push_back(c);', 'res = res + c'],
        hint: 'Nối ký tự c vào cuối xâu kết quả res.',
        placeholder: 'res += c',
      },
    ],
    codeTemplate: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string s, res = "";
    if (getline(cin, s)) {
        for (char c : s) {
            // [1] Kiểm tra ký tự là chữ số
            if ([BLANK_1]) {
                // [2] Nối vào xâu kết quả
                [BLANK_2];
            }
        }
        cout << res;
    }
    return 0;
}`,
  },
  {
    id: 2,
    title: 'Mức độ 2: Xử lý tệp & Đọc cả dòng',
    difficulty: 'Trung bình',
    description: 'Hoàn thiện hàm đọc xâu chứa khoảng trắng và xuất kết quả.',
    blanks: [
      {
        id: 'BLANK_1',
        label: 'Đọc cả dòng xâu s',
        correctAnswer: ['getline(cin, s)', 'getline(cin,s)', 'cin >> s'],
        hint: 'Sử dụng hàm getline(cin, s) để đọc cả khoảng trắng.',
        placeholder: 'getline(cin, s)',
      },
      {
        id: 'BLANK_2',
        label: 'In xâu kết quả',
        correctAnswer: ['cout << res', 'cout<<res', 'cout << res << endl', 'printf("%s", res.c_str())'],
        hint: 'In biến kết quả res ra màn hình.',
        placeholder: 'cout << res',
      },
    ],
    codeTemplate: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    string s, res = "";
    if ([BLANK_1]) {
        for (char c : s) {
            if (c >= '0' && c <= '9') {
                res += c;
            }
        }
        [BLANK_2];
    }
    return 0;
}`,
  },
];

const STRNUM_LEVELS: ScaffoldLevel[] = [
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
        label: 'Lấy đỉnh Stack',
        correctAnswer: ['st.top()', 'st.top ()'],
        hint: 'Hàm lấy giá trị phần tử ở đỉnh của std::stack.',
        placeholder: 'st.top()',
      },
      {
        id: 'BLANK_3',
        label: 'Xóa đỉnh Stack',
        correctAnswer: ['st.pop()', 'st.pop ()', 'st.pop();'],
        hint: 'Hàm xóa phần tử ở đỉnh của std::stack.',
        placeholder: 'st.pop()',
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

    // [2] Xóa nốt các phần tử cuối nếu k vẫn còn > 0
    while ([BLANK_1]) {
        [BLANK_3];
        k--;
    }

    // [3] Trích xuất kết quả từ Stack
    vector<char> ans;
    while (!st.empty()) {
        ans.push_back([BLANK_2]);
        st.pop();
    }
    for (int i = ans.size() - 1; i >= 0; i--) cout << ans[i];

    return 0;
}`,
  },
];

interface ScaffoldedCodeProps {
  problemCode: string;
  initialCode?: string;
  onApplyCode?: (code: string) => void;
}

export function ScaffoldedCode({ problemCode, initialCode, onApplyCode }: ScaffoldedCodeProps) {
  const levels = useMemo(() => {
    const upper = problemCode.toUpperCase();
    if (upper === 'TAOXAU') {
      return TAOXAU_LEVELS;
    }
    if (upper === 'STRNUM') {
      return STRNUM_LEVELS;
    }

    // Tự động sinh bài tập điền khuyết động cho BẤT KỲ bài toán nào
    const baseCode = initialCode || `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    // Thuật toán giải bài ${problemCode}
    return 0;
}`;

    return [
      {
        id: 1,
        title: `Mức độ 1: Hoàn thiện logic thuật toán ${problemCode}`,
        difficulty: 'Dễ' as const,
        description: `Điền câu lệnh điều kiện rẽ nhánh và cập nhật kết quả cho bài toán ${problemCode}.`,
        blanks: [
          {
            id: 'BLANK_1',
            label: 'Điều kiện kiểm tra',
            correctAnswer: ['true', '1', 'i < n', 'k > 0'],
            hint: 'Điền biểu thức điều kiện xử lý bài toán.',
            placeholder: 'Điều kiện logic...',
          },
        ],
        codeTemplate: baseCode,
      },
    ];
  }, [problemCode, initialCode]);

  const [activeLevelId, setActiveLevelId] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<Record<string, boolean | null>>({});
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [applied, setApplied] = useState(false);

  const activeLevel = levels.find((l) => l.id === activeLevelId) || levels[0];

  const handleAnswerChange = (blankId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [blankId]: val }));
    setValidation((prev) => ({ ...prev, [blankId]: null }));
    setApplied(false);
  };

  const handleCheck = () => {
    const newValidation: Record<string, boolean> = {};
    activeLevel.blanks.forEach((b) => {
      const userAns = (answers[b.id] || '').trim().replace(/\s+/g, ' ');
      const isCorrect = b.correctAnswer.some(
        (ans) => ans.trim().replace(/\s+/g, ' ').toLowerCase() === userAns.toLowerCase()
      );
      newValidation[b.id] = isCorrect;
    });
    setValidation(newValidation);
  };

  const handleReset = () => {
    setAnswers({});
    setValidation({});
    setShowHints({});
    setApplied(false);
  };

  const toggleHint = (blankId: string) => {
    setShowHints((prev) => ({ ...prev, [blankId]: !prev[blankId] }));
  };

  const generatedCode = useMemo(() => {
    let result = activeLevel.codeTemplate;
    activeLevel.blanks.forEach((b) => {
      const val = answers[b.id] || `/* [Chỗ trống]: ${b.label} */`;
      result = result.split(`[${b.id}]`).join(val);
    });
    return result;
  }, [activeLevel, answers]);

  const allCorrect =
    activeLevel.blanks.length > 0 &&
    activeLevel.blanks.every((b) => validation[b.id] === true);

  const handleApplyToEditor = () => {
    if (onApplyCode) {
      let codeToApply = activeLevel.codeTemplate;
      activeLevel.blanks.forEach((b) => {
        const val = answers[b.id] || b.correctAnswer[0];
        codeToApply = codeToApply.split(`[${b.id}]`).join(val);
      });
      onApplyCode(codeToApply);
      setApplied(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden text-xs">
      {/* Top Header Bar */}
      <div className="border-b bg-muted/40 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-muted-foreground">MỨC ĐỘ HỖ TRỢ:</span>
          <div className="flex gap-1.5">
            {levels.map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => {
                  setActiveLevelId(lvl.id);
                  handleReset();
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-semibold transition shadow-sm',
                  activeLevelId === lvl.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border hover:bg-muted text-foreground'
                )}
              >
                Mức {lvl.id} ({lvl.difficulty})
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition"
            title="Làm lại từ đầu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm lại</span>
          </button>

          <button
            onClick={handleApplyToEditor}
            className={cn(
              'flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition shadow-sm',
              applied
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-90'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{applied ? '✓ Đã chuyển vào IDE' : 'Chuyển vào IDE'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Level Overview Box */}
        <div className="p-4 rounded-2xl border bg-card/60 shadow-sm space-y-1.5">
          <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            {activeLevel.title}
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {activeLevel.description}
          </p>
        </div>

        {/* Form Blanks Input */}
        <div className="p-4 rounded-2xl border bg-card shadow-sm space-y-4">
          <div className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Điền logic vào các chỗ trống:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeLevel.blanks.map((blank, idx) => {
              const status = validation[blank.id];
              return (
                <div
                  key={blank.id}
                  className={cn(
                    'p-3 rounded-xl border bg-muted/20 space-y-2 transition-all',
                    status === true && 'border-emerald-500 bg-emerald-950/20',
                    status === false && 'border-destructive bg-destructive/10'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-[11px]">
                      Vị trí [{idx + 1}]: {blank.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleHint(blank.id)}
                      className="text-amber-500 hover:text-amber-400 text-[10px] flex items-center gap-0.5"
                    >
                      <Lightbulb className="w-3 h-3" /> Gợi ý
                    </button>
                  </div>

                  <input
                    type="text"
                    value={answers[blank.id] || ''}
                    onChange={(e) => handleAnswerChange(blank.id, e.target.value)}
                    placeholder={blank.placeholder}
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-background font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />

                  {showHints[blank.id] && (
                    <p className="text-[11px] text-amber-400 bg-amber-950/30 p-2 rounded border border-amber-500/30 leading-tight">
                      💡 {blank.hint}
                    </p>
                  )}

                  {status === true && (
                    <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Chính xác!
                    </p>
                  )}

                  {status === false && (
                    <p className="text-[11px] text-destructive font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Chưa đúng, hãy thử lại!
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleCheck}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-sm"
            >
              Kiểm tra đáp án
            </button>

            {allCorrect && (
              <span className="text-emerald-500 font-semibold text-xs flex items-center gap-1.5 animate-in fade-in">
                🎉 Tuyệt vời! Tất cả các chỗ trống đã điền chính xác. Hãy bấm &quot;Chuyển vào IDE&quot; để làm bài.
              </span>
            )}
          </div>
        </div>

        {/* Code Preview Box */}
        <div className="p-4 rounded-2xl border bg-zinc-950 shadow-inner space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Xem trước mã nguồn C++ hoàn chỉnh</span>
            <span className="font-mono text-[10px] text-zinc-500">Auto-updated</span>
          </div>
          <pre className="p-3 bg-black/40 rounded-xl font-mono text-xs text-zinc-200 overflow-x-auto leading-relaxed">
            <code>{generatedCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
