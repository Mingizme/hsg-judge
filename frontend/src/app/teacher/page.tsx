'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import {
  UploadCloud,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  FolderSync,
  Sliders,
  FileText,
  Code2,
  Layers,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngestedProblem {
  code: string;
  title: string;
  totalTests: number;
  ioType: 'FILE' | 'STANDARD';
  ioFileName: string;
  hasPdf: boolean;
  hasSolution: boolean;
  maxScore: number;
  subtasks: {
    id: string;
    label: string;
    score: number;
    testRange: string;
  }[];
}

const INITIAL_PROBLEMS: IngestedProblem[] = [
  {
    code: 'STRNUM',
    title: 'Xóa chữ số tạo số lớn nhất',
    totalTests: 24,
    ioType: 'FILE',
    ioFileName: 'strnum',
    hasPdf: true,
    hasSolution: true,
    maxScore: 100,
    subtasks: [
      { id: 'sub-1', label: 'Subtask 1: N ≤ 100, K ≤ 10', score: 30, testRange: 'Test 01 - Test 08' },
      { id: 'sub-2', label: 'Subtask 2: N ≤ 10^5, K < N', score: 70, testRange: 'Test 09 - Test 24' },
    ],
  },
];

export default function TeacherPortalPage() {
  const { user, profile, isTeacher, isLoading, upgradeToTeacher } = useAuth();

  const [problems, setProblems] = useState<IngestedProblem[]>(INITIAL_PROBLEMS);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<IngestedProblem | null>(null);
  const [editSubtasks, setEditSubtasks] = useState(INITIAL_PROBLEMS[0].subtasks);

  // Upgrade form state
  const [teacherSecretCode, setTeacherSecretCode] = useState('');
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'https://hsg-judge.onrender.com/api';

  const fetchProblems = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/problems`);
      if (res.ok) {
        const json = await res.json();
        const rawList = json.data?.items || json.data || json;
        if (Array.isArray(rawList) && rawList.length > 0) {
          setProblems(rawList.map((p: any) => ({
            code: p.code,
            title: p.title,
            totalTests: p.totalTests || 24,
            ioType: p.ioType || 'FILE',
            ioFileName: p.code.toLowerCase(),
            hasPdf: Boolean(p.pdfUrl || true),
            hasSolution: true,
            maxScore: p.maxScore || 100,
            subtasks: p.subtasks && p.subtasks.length > 0 ? p.subtasks : INITIAL_PROBLEMS[0].subtasks,
          })));
        }
      }
    } catch (err) {
      console.warn('Teacher problems fetch notice:', err);
    }
  }, [API_URL]);

  React.useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // Handle Scan Data Directory
  const handleScanDirectory = async () => {
    setIsScanning(true);
    setUploadMessage(null);
    try {
      const res = await fetch(`${API_URL}/ingestion/scan-directory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataDir: '../Data' }),
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage({
          type: 'success',
          text: `Đã quét và nạp thành công: ${data.data?.successful || 1} bài tập từ thư mục Data/!`,
        });
        await fetchProblems();
      } else {
        throw new Error(data.message || 'Quét thư mục thất bại');
      }
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || 'Không thể kết nối đến máy chủ để quét thư mục Data.',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Handle ZIP File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_URL}/ingestion/upload-zip`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.data?.results) {
        const results = data.data.results;
        const successItem = results.find((r: any) => r.success);
        const failedItem = results.find((r: any) => !r.success);

        if (successItem) {
          setUploadMessage({
            type: 'success',
            text: `🎉 Nạp thành công bài "${successItem.problemCode}" (${successItem.details?.testCasesCount || 0} Testcases, ${successItem.details?.pdfUploaded ? 'Đề PDF, ' : ''}Lời giải C++)!`,
          });
          await fetchProblems();
        } else if (failedItem) {
          setUploadMessage({
            type: 'error',
            text: `❌ ${failedItem.message}`,
          });
        }
      } else {
        throw new Error(data.message || 'Lỗi nạp file ZIP');
      }
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || 'Lỗi tải lên file ZIP. Vui lòng kiểm tra lại kết nối mạng.',
      });
    } finally {
      setIsUploading(false);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleOpenSubtaskModal = (prob: IngestedProblem) => {
    setSelectedProblem(prob);
    setEditSubtasks([...prob.subtasks]);
  };

  const handleAddSubtask = () => {
    setEditSubtasks([
      ...editSubtasks,
      {
        id: `sub-${Date.now()}`,
        label: `Subtask ${editSubtasks.length + 1}`,
        score: 0,
        testRange: 'Test ? - Test ?',
      },
    ]);
  };

  const handleRemoveSubtask = (idx: number) => {
    setEditSubtasks(editSubtasks.filter((_, i) => i !== idx));
  };

  const handleSaveSubtasks = () => {
    if (!selectedProblem) return;
    setProblems(
      problems.map((p) =>
        p.code === selectedProblem.code ? { ...p, subtasks: editSubtasks } : p
      )
    );
    setSelectedProblem(null);
    setUploadMessage({
      type: 'success',
      text: `Đã lưu cấu hình thang điểm Subtask cho bài ${selectedProblem.code}!`,
    });
  };

  const handleUpgradeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError(null);
    setIsUpgrading(true);

    const res = await upgradeToTeacher(teacherSecretCode);
    setIsUpgrading(false);

    if (!res.success) {
      setUpgradeError(res.message);
    }
  };

  // ── Role Guard: Not Logged In ───────────────────
  if (!isLoading && !user) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-muted/20">
        <div className="w-full max-w-md p-8 rounded-2xl border bg-card shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold">Yêu cầu tài khoản Giáo viên</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Trang Quản trị & Upload bài tập chỉ dành riêng cho Giáo viên bồi dưỡng HSG Tin học.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:bg-primary/90 transition flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" /> Đăng nhập tài khoản Giáo viên
            </Link>
            <Link
              href="/register"
              className="py-2.5 rounded-xl border text-xs font-semibold hover:bg-muted transition"
            >
              Đăng ký tài khoản mới
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Role Guard: Logged in as Student (Restricted) ─
  if (!isLoading && user && !isTeacher) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-muted/20">
        <div className="w-full max-w-lg p-8 rounded-2xl border bg-card shadow-xl space-y-6 animate-in fade-in zoom-in-95">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-2">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold">Không có quyền truy cập</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tài khoản của bạn hiện có vai trò là <strong>Học sinh tuyển</strong>. Chỉ có tài khoản <strong>Giáo viên</strong> mới có quyền tải lên bài tập và cấu hình bộ test thi đấu.
            </p>
          </div>

          {/* Quick Upgrade to Teacher Form */}
          <div className="p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" /> Bạn là Giáo viên? Nâng cấp quyền tại đây:
            </div>

            {upgradeError && (
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{upgradeError}</span>
              </div>
            )}

            <form onSubmit={handleUpgradeRole} className="flex gap-2">
              <input
                type="text"
                value={teacherSecretCode}
                onChange={(e) => setTeacherSecretCode(e.target.value)}
                placeholder="Nhập mã xác thực (HSG_TEACHER_2026)"
                className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={isUpgrading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition shrink-0"
              >
                {isUpgrading ? 'Đang xác thực...' : 'Kích hoạt'}
              </button>
            </form>
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/problems"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Quay lại danh sách bài tập học sinh <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Authorized Teacher Portal ────────────────────
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <ShieldCheck className="w-4 h-4 text-amber-500" /> Bảng Quản Trị Giáo Viên
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Ingestion & Cấu Hình Bài Tập</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tự động trích xuất gói dữ liệu đề thi (.ZIP / Folder Data), quản lý bộ test và cấu hình thang điểm subtask.
          </p>
        </div>

        <button
          onClick={handleScanDirectory}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition shadow-sm"
        >
          <FolderSync className={cn('w-4 h-4', isScanning && 'animate-spin')} />
          {isScanning ? 'Đang quét...' : 'Quét thư mục Data/'}
        </button>
      </div>

      {/* Notification Toast */}
      {uploadMessage && (
        <div
          className={cn(
            'p-4 rounded-xl border flex items-center gap-3 text-sm transition-all',
            uploadMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
          )}
        >
          {uploadMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{uploadMessage.text}</span>
        </div>
      )}

      {/* Ingestion Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload ZIP Drag-and-Drop Box */}
        <div className="lg:col-span-1 p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-primary transition cursor-pointer">
          <input
            type="file"
            accept=".zip"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition">
            {isUploading ? (
              <RefreshCw className="w-8 h-8 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>
          <h3 className="font-bold text-base text-foreground">Nạp bài từ file ZIP</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
            Kéo thả file <strong>.ZIP</strong> chuẩn cấu trúc (Doc/ + Test/) vào đây để nạp tự động.
          </p>
          <span className="mt-4 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm">
            {isUploading ? 'Đang giải nén...' : 'Chọn file .ZIP'}
          </span>
        </div>

        {/* Ingestion Rules & Standard Format Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl border bg-card/60 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <FileArchive className="w-4 h-4 text-primary" />
            <span>Quy Chuẩn Cấu Trúc Gói Bài Tập (Ingestion Pipeline)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border bg-background space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" /> Thư mục Doc/
              </div>
              <ul className="text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>*.pdf</strong>: Đề bài chính thức (nhúng web).</li>
                <li><strong>*.cpp</strong>: Lời giải chính & các cách giải khác.</li>
                <li>Hệ thống tự nhận diện File I/O (`freopen`).</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl border bg-background space-y-1.5">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" /> Thư mục Test/
              </div>
              <ul className="text-muted-foreground list-disc list-inside space-y-1">
                <li>Chứa các thư mục con <strong>Test01</strong> ... <strong>TestN</strong>.</li>
                <li>Mỗi thư mục gồm cặp file <strong>.INP</strong> và <strong>.OUT</strong>.</li>
                <li>Tự động chuẩn hóa dấu xuống dòng Windows/Linux.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Problem Management Table */}
      <div className="p-6 rounded-2xl border bg-card/60 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Danh Sách Bài Tập Đã Nạp ({problems.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b bg-muted/20">
              <tr>
                <th className="py-3 px-4">Mã bài</th>
                <th className="py-3 px-4">Tiêu đề bài</th>
                <th className="py-3 px-4 text-center">Số Test Cases</th>
                <th className="py-3 px-4 text-center">Chuẩn I/O</th>
                <th className="py-3 px-4 text-center">Đề PDF</th>
                <th className="py-3 px-4 text-center">Lời giải mẫu</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {problems.map((p) => (
                <tr key={p.code} className="hover:bg-muted/30 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-primary">{p.code}</td>
                  <td className="py-3.5 px-4 font-medium text-foreground">{p.title}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-500">
                    {p.totalTests} tests
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-muted text-muted-foreground">
                      {p.ioType === 'FILE' ? `freopen("${p.ioFileName}.inp")` : 'cin/cout'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {p.hasPdf ? (
                      <span className="text-emerald-500 font-bold text-xs">✓ Đã nạp</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Chưa có</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {p.hasSolution ? (
                      <span className="text-emerald-500 font-bold text-xs">✓ 2 cách giải</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Chưa có</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenSubtaskModal(p)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition"
                    >
                      <Sliders className="w-3.5 h-3.5" /> Cấu hình Subtask
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subtask Configuration Modal / Dialog */}
      {selectedProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl p-6 rounded-2xl border bg-background shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Cấu Hình Thang Điểm Subtask: {selectedProblem.code}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tổng điểm tối đa: {selectedProblem.maxScore} điểm ({selectedProblem.totalTests} test cases).
                </p>
              </div>
              <button
                onClick={() => setSelectedProblem(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {editSubtasks.map((sub, idx) => (
                <div key={sub.id} className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={sub.label}
                      onChange={(e) => {
                        const updated = [...editSubtasks];
                        updated[idx].label = e.target.value;
                        setEditSubtasks(updated);
                      }}
                      className="px-2 py-1 bg-background border rounded text-xs font-semibold w-2/3"
                    />
                    <button
                      onClick={() => handleRemoveSubtask(idx)}
                      className="text-rose-500 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Phạm vi test:</span>
                      <input
                        type="text"
                        value={sub.testRange}
                        onChange={(e) => {
                          const updated = [...editSubtasks];
                          updated[idx].testRange = e.target.value;
                          setEditSubtasks(updated);
                        }}
                        className="mt-1 w-full px-2 py-1 bg-background border rounded text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground">Số điểm:</span>
                      <input
                        type="number"
                        value={sub.score}
                        onChange={(e) => {
                          const updated = [...editSubtasks];
                          updated[idx].score = Number(e.target.value);
                          setEditSubtasks(updated);
                        }}
                        className="mt-1 w-full px-2 py-1 bg-background border rounded text-xs font-mono font-bold text-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <button
                onClick={handleAddSubtask}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Plus className="w-4 h-4" /> Thêm Subtask
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedProblem(null)}
                  className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveSubtasks}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary/90"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
