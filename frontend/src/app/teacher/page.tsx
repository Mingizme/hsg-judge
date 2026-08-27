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
  BarChart3,
  Settings2,
  UserCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DifficultyBadge } from '@/components/problems/difficulty-badge';
import { API_BASE } from '@/lib/api-config';

interface IngestedProblem {
  code: string;
  title: string;
  difficulty?: string;
  category?: string[];
  createdBy?: string | null;
  totalTests: number;
  ioType: 'FILE' | 'STANDARD';
  ioFileName: string;
  hasPdf: boolean;
  hasSolution: boolean;
  /** Đã có hướng dẫn trích từ .docx chưa */
  hasGuide: boolean;
  /** Bài nháp chưa publish sẽ không hiện với học sinh */
  isPublished: boolean;
  totalSubtasks: number;
  maxScore: number;
  subtasks: {
    id: string;
    label: string;
    score: number;
    testRange: string;
  }[];
}

const CATEGORY_PRESETS = [
  'Xâu ký tự',
  'Tham lam',
  'Quy hoạch động',
  'Đồ thị & Cây',
  'Cấu trúc dữ liệu (Stack/Queue/Segment Tree)',
  'Tìm kiếm & Sắp xếp',
  'Số học & Toán rời rạc',
  'Hình học tính toán',
  'Cơ bản / Nhập môn',
];

export default function TeacherPortalPage() {
  const { user, profile, isTeacher, isLoading, upgradeToTeacher } = useAuth();

  const [problems, setProblems] = useState<IngestedProblem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<IngestedProblem | null>(null);
  const [editSubtasks, setEditSubtasks] = useState<IngestedProblem['subtasks']>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Pre-Upload Settings Modal State
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingCode, setSettingCode] = useState('');
  const [settingTitle, setSettingTitle] = useState('');
  const [settingDifficulty, setSettingDifficulty] = useState('MEDIUM');
  const [settingCategory, setSettingCategory] = useState('Xâu ký tự');
  const [settingTimeLimit, setSettingTimeLimit] = useState('1000');
  const [settingMemoryLimit, setSettingMemoryLimit] = useState('256');
  const [settingCreatedBy, setSettingCreatedBy] = useState('');

  // Upgrade form state
  const [teacherSecretCode, setTeacherSecretCode] = useState('');
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const fetchAnalytics = async (code: string) => {
    try {
      const res = await fetch(`${API_BASE}/problems/${code}/analytics`);
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data || json);
      } else {
        setAnalytics(null);
      }
    } catch (err) {
      console.warn('Analytics fetch failed:', err);
      setAnalytics(null);
    }
  };

  const handleOpenSubtaskModal = (prob: IngestedProblem) => {
    setSelectedProblem(prob);
    setEditSubtasks([...prob.subtasks]);
    fetchAnalytics(prob.code);
  };

  /**
   * Danh sách cho Teacher Portal.
   *
   * Hai lỗi cũ: gọi `/problems` trần nên (1) chỉ nhận 20 bài đầu do phân trang
   * mặc định — kho 40 bài thì một nửa biến mất khỏi bảng quản trị, và (2) thiếu
   * `includeUnpublished` nên chính bài nháp giáo viên vừa nạp lại không hiện ra.
   */
  const fetchProblems = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/problems?includeUnpublished=true&limit=100`);
      if (res.ok) {
        const json = await res.json();
        const rawList = json.problems || json.data?.problems || json.data?.items || json.data || json;
        if (Array.isArray(rawList)) {
          setProblems(
            rawList.map((p: any) => ({
              code: p.code,
              title: p.title || p.code,
              difficulty: p.difficulty || 'MEDIUM',
              category: p.categories?.map((c: any) => c.nameVi || c.name).filter(Boolean) || [],
              createdBy: p.createdBy || null,
              totalTests: p.totalTests || 0,
              ioType: p.ioType || 'STANDARD',
              ioFileName: p.ioFileName || p.code?.toLowerCase() || '',
              hasPdf: Boolean(p.pdfUrl),
              // Số thật từ backend (`_count.solutionCodes`) — trước đây ghi cứng `true`
              hasSolution: Number(p.totalSolutions ?? 0) > 0,
              hasGuide: Boolean(p.hasGuide),
              isPublished: p.isPublished !== false,
              totalSubtasks: Number(p.totalSubtasks ?? 0),
              maxScore: p.maxScore || 100,
              subtasks: Array.isArray(p.subtasks) ? p.subtasks : [],
            }))
          );
        }
      }
    } catch (err) {
      console.warn('Teacher problems fetch notice:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // When a file is selected -> Open Settings Modal first
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const baseName = file.name.replace(/\.zip$/i, '').toUpperCase();
    setPendingFile(file);
    setSettingCode(baseName);
    setSettingTitle(`Bài tập ${baseName}`);
    setSettingDifficulty('MEDIUM');
    setSettingCategory('Xâu ký tự');
    setSettingTimeLimit('1000');
    setSettingMemoryLimit('256');
    setSettingCreatedBy(profile?.displayName || user?.email || 'Ban Chuyên Môn');
    setIsSettingsOpen(true);

    // Reset input value so same file can be re-triggered if canceled
    e.target.value = '';
  };

  // Submit Upload with Settings
  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    setIsUploading(true);
    setUploadMessage(null);
    setIsSettingsOpen(false);

    const formData = new FormData();
    formData.append('file', pendingFile);
    formData.append('title', settingTitle);
    formData.append('difficulty', settingDifficulty);
    formData.append('category', settingCategory);
    formData.append('createdBy', settingCreatedBy);
    formData.append('timeLimitMs', settingTimeLimit);
    formData.append('memoryLimitMb', settingMemoryLimit);

    try {
      const res = await fetch(`${API_BASE}/ingestion/upload-zip`, {
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
            text: `🎉 Nạp thành công bài "${settingCode}" do "${settingCreatedBy}" tải lên (${successItem.details?.testCasesCount || 0} Testcases, ${successItem.details?.pdfUploaded ? 'Đề PDF, ' : ''}Lời giải C++)!`,
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
      setPendingFile(null);
    }
  };

  // Handle Scan Data Directory
  const handleScanDirectory = async () => {
    setIsScanning(true);
    setUploadMessage(null);
    try {
      const res = await fetch(`${API_BASE}/ingestion/scan-directory`, {
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
      setUpgradeError(res.message || 'Mã xác thực không hợp lệ. Thử lại với "HSG_TEACHER_2026"');
    }
  };

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-5xl flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Đang xác thực quyền Giáo viên...</p>
      </div>
    );
  }

  // 2. Not logged in
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md">
        <div className="bg-card border rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/30 text-warning flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Khu Vực Dành Cho Giáo Viên</h1>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Bạn cần đăng nhập bằng tài khoản Giáo viên để quản trị bộ đề thi, nạp file ZIP bài tập và cấu hình thang điểm.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition shadow-md"
            >
              <LogIn className="w-4 h-4" /> Đăng nhập ngay
            </Link>
            <Link
              href="/register"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border bg-background hover:bg-muted font-medium text-xs text-foreground transition"
            >
              Đăng ký tài khoản Giáo viên mới <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Logged in as Student -> Show Upgrade Panel
  if (!isTeacher) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <div className="bg-card border rounded-2xl p-8 shadow-xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/30 text-warning flex items-center justify-center shrink-0">
              <KeyRound className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Kích Hoạt Quyền Giáo Viên</h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Tài khoản <span className="font-semibold text-foreground">{user.email}</span> hiện có vai trò Học sinh.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpgradeRole} className="space-y-4 pt-2">
            <div>
              <label
                htmlFor="teacher-secret"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
              >
                Mã bí mật xác thực Giáo viên (Invite Code)
              </label>
              <input
                id="teacher-secret"
                name="teacher-secret"
                type="password"
                autoComplete="off"
                placeholder="Nhập mã bí mật..."
                value={teacherSecretCode}
                onChange={(e) => setTeacherSecretCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/70"
              />
            </div>

            {upgradeError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{upgradeError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpgrading}
              className="w-full py-3 rounded-xl bg-gradient-brand text-white font-semibold text-sm hover:opacity-95 transition shadow-elevated flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isUpgrading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Đang nâng cấp...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Kích hoạt quyền Giáo viên
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 4. Authenticated Teacher -> Render Full Ingestion & Problem Management UI
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs mb-1">
            <ShieldCheck className="w-4 h-4" /> Bảng Quản Trị Giáo Viên
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Ingestion & Cấu Hình Bài Tập</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tự động trích xuất gói dữ liệu đề thi (.ZIP), phân loại dạng bài, cấu hình thang điểm và quản trị toàn diện.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleScanDirectory}
            disabled={isScanning || isUploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border bg-card hover:bg-muted text-xs font-semibold transition shadow-sm disabled:opacity-50"
          >
            <FolderSync className={cn('w-4 h-4', isScanning && 'animate-spin text-primary')} />
            <span>{isScanning ? 'Đang quét Data/...' : 'Quét thư mục Data/'}</span>
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {uploadMessage && (
        <div
          role="alert"
          className={cn(
            'p-4 rounded-2xl border text-sm flex items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2',
            uploadMessage.type === 'success'
              ? 'bg-success/10 border-success/40 text-success'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          )}
        >
          <div className="flex items-center gap-2.5">
            {uploadMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            )}
            <span className="font-medium">{uploadMessage.text}</span>
          </div>
          <button
            onClick={() => setUploadMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 px-2 py-1 rounded-lg border bg-background/50"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Ingestion Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ZIP Upload Card */}
        <div className="lg:col-span-1 border rounded-2xl bg-card p-6 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">Nạp bài từ file ZIP</h3>
              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                Kéo thả file .ZIP chuẩn cấu trúc (Doc/ + Test/). Bảng thiết lập sẽ hiện lên để bạn tùy chỉnh độ khó & thể loại trước khi nạp.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted-foreground/30 rounded-xl hover:border-primary cursor-pointer transition bg-muted/20 hover:bg-muted/40">
              <FileArchive className="w-8 h-8 text-muted-foreground mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-foreground">
                {isUploading ? 'Đang giải nén & nạp bài...' : 'Chọn file .ZIP để thiết lập'}
              </span>
              <span className="text-[11px] text-muted-foreground mt-0.5">Tối đa 50MB</span>
              <input
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Pipeline Guide Card */}
        <div className="lg:col-span-2 border rounded-2xl bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-foreground font-bold text-base">
            <Layers className="w-5 h-5 text-primary" />
            <span>Quy Chuẩn Cấu Trúc Gói Bài Tập (Ingestion Pipeline)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="font-semibold text-primary flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Thư mục Doc/
              </div>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside leading-relaxed">
                <li><strong className="text-foreground">*.pdf</strong>: Đề bài chính thức (nhúng web).</li>
                <li><strong className="text-foreground">*.docx</strong>: Hướng dẫn thuật toán chi tiết.</li>
                <li><strong className="text-foreground">*.cpp</strong>: Lời giải mẫu chính & các cách giải khác.</li>
                <li>Hệ thống tự nhận diện File I/O (&apos;freopen&apos;).</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <div className="font-semibold text-warning flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> Thư mục Test/
              </div>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside leading-relaxed">
                <li>Chứa các thư mục con <strong className="text-foreground">Test01 ... TestN</strong>.</li>
                <li>Mỗi thư mục gồm cặp file <strong className="text-foreground">.INP</strong> và <strong className="text-foreground">.OUT</strong>.</li>
                <li>Tự động chuẩn hóa dấu xuống dòng Windows/Linux.</li>
                <li>Hỗ trợ bộ test từ 5 đến 100 testcases.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Problems Management Table */}
      <div className="border rounded-2xl bg-card shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-lg text-foreground">
              Danh Sách Bài Tập Đã Nạp ({problems.length})
            </h3>
            <p className="text-muted-foreground text-xs">
              Các bài toán đang hoạt động trên hệ thống chấm bài trực tuyến.
            </p>
          </div>

          <button
            onClick={fetchProblems}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-background hover:bg-muted text-xs font-semibold text-foreground transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Làm mới
          </button>
        </div>

        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Mã Bài</th>
                <th className="px-4 py-3">Tiêu Đề Bài</th>
                <th className="px-4 py-3">Độ Khó & Thể Loại</th>
                <th className="px-4 py-3">Giáo Viên Nạp</th>
                <th className="px-4 py-3">Số Test</th>
                <th className="px-4 py-3">Chuẩn I/O</th>
                <th className="px-4 py-3">Đề PDF</th>
                <th className="px-4 py-3">Lời Giải</th>
                <th className="px-4 py-3">Hướng Dẫn</th>
                <th className="px-4 py-3">Trạng Thái</th>
                <th className="px-4 py-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono">
              {problems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground font-sans text-xs">
                    Chưa có bài tập nào. Hãy chọn file .ZIP để tải bài lên hệ thống!
                  </td>
                </tr>
              ) : (
                problems.map((p) => (
                  <tr key={p.code} className="hover:bg-muted/20 transition">
                    <td className="px-4 py-3.5 font-bold text-primary">{p.code}</td>
                    <td className="px-4 py-3.5 font-sans font-medium text-foreground">{p.title}</td>
                    <td className="px-4 py-3.5 font-sans">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <DifficultyBadge difficulty={p.difficulty || 'MEDIUM'} />
                        {p.category?.slice(0, 1).map((cat) => (
                          <span key={cat} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-info/30 bg-info/10 px-2 py-0.5 text-[11px] font-semibold text-info">
                        <UserCheck className="w-3 h-3" /> {p.createdBy || 'Ban Chuyên Môn'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      {/* Bài chưa có test thì KHÔNG được khoe dấu tích xanh */}
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 font-semibold',
                          p.totalTests > 0 ? 'text-success' : 'text-warning',
                        )}
                      >
                        {p.totalTests > 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        {p.totalTests} tests
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-[11px] bg-muted px-2 py-0.5 rounded border">
                        {p.ioType === 'FILE' ? `freopen("${p.ioFileName}.inp")` : 'cin / cout'}
                      </code>
                    </td>
                    {/* Ba cột dưới đây trước đây ghi cứng "✓ Đã nạp" / "✓ Đã có
                        code C++" cho MỌI bài, kể cả bài thiếu hẳn file — giáo
                        viên không thể biết gói đề nào nạp lỗi. */}
                    <td className="px-4 py-3.5 font-sans">
                      <AssetFlag ok={p.hasPdf} okText="Đã nạp" missText="Thiếu PDF" />
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <AssetFlag ok={p.hasSolution} okText="Có code C++" missText="Thiếu .cpp" />
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <AssetFlag ok={p.hasGuide} okText="Có .docx" missText="Chưa có" />
                    </td>
                    <td className="px-4 py-3.5 font-sans">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold',
                          p.isPublished
                            ? 'border-success/30 bg-success/10 text-success'
                            : 'border-warning/30 bg-warning/10 text-warning',
                        )}
                      >
                        {p.isPublished ? 'Đã phát hành' : 'Bản nháp'}
                      </span>
                      {p.totalSubtasks > 0 && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">
                          {p.totalSubtasks} subtask
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-sans space-x-2">
                      <Link
                        href={`/problems/${p.code}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-xs font-semibold text-foreground transition"
                      >
                        Mở bài
                      </Link>
                      <button
                        onClick={() => handleOpenSubtaskModal(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-xs font-semibold transition"
                      >
                        <Sliders className="w-3 h-3" /> Cấu hình
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRE-UPLOAD PROBLEM SETTINGS MODAL */}
      {isSettingsOpen && pendingFile && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Settings2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Cấu Hình Thông Tin Bài Tập</h3>
                  <p className="text-muted-foreground text-xs">Tùy chỉnh thông tin trước khi nạp file ZIP lên hệ thống</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  setPendingFile(null);
                }}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Mã bài tập (Code)
                  </label>
                  <input
                    type="text"
                    value={settingCode}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl border bg-muted/50 font-mono font-bold text-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Giáo viên phụ trách
                  </label>
                  <input
                    type="text"
                    value={settingCreatedBy}
                    onChange={(e) => setSettingCreatedBy(e.target.value)}
                    placeholder="Tên giáo viên..."
                    className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Tiêu đề bài tập
                </label>
                <input
                  type="text"
                  value={settingTitle}
                  onChange={(e) => setSettingTitle(e.target.value)}
                  placeholder="Ví dụ: Xóa chữ số tạo số lớn nhất..."
                  className="w-full px-3 py-2 rounded-xl border bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Độ khó
                  </label>
                  <select
                    value={settingDifficulty}
                    onChange={(e) => setSettingDifficulty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="EASY">Dễ (EASY)</option>
                    <option value="MEDIUM">Trung bình (MEDIUM)</option>
                    <option value="HARD">Khó (HARD)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Thể loại / Chủ đề
                  </label>
                  <select
                    value={settingCategory}
                    onChange={(e) => setSettingCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Giới hạn thời gian (ms)
                  </label>
                  <select
                    value={settingTimeLimit}
                    onChange={(e) => setSettingTimeLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="500">0.5 giây (500ms)</option>
                    <option value="1000">1.0 giây (1000ms)</option>
                    <option value="2000">2.0 giây (2000ms)</option>
                    <option value="3000">3.0 giây (3000ms)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Giới hạn bộ nhớ (MB)
                  </label>
                  <select
                    value={settingMemoryLimit}
                    onChange={(e) => setSettingMemoryLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="128">128 MB</option>
                    <option value="256">256 MB (Chuẩn HSG)</option>
                    <option value="512">512 MB</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-muted/20 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  setPendingFile(null);
                }}
                className="px-4 py-2 rounded-xl border bg-background hover:bg-muted text-xs font-semibold text-foreground transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={isUploading}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-md flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Xác nhận & Nạp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtask & Analytics Configuration Modal */}
      {selectedProblem && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" /> Cấu hình Subtask & Thống kê
                </h3>
                <p className="text-muted-foreground text-xs mt-0.5 font-mono">
                  Mã bài: <strong className="text-primary">{selectedProblem.code}</strong> — {selectedProblem.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedProblem(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Analytics Section */}
              {analytics && (
                <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                  <h4 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <BarChart3 className="w-4 h-4 text-primary" /> Thống kê bài nộp học sinh
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-card border">
                      <div className="text-muted-foreground text-[10px]">Tổng lượt nộp</div>
                      <div className="text-lg font-bold text-foreground mt-0.5">{analytics.totalSubmissions || 0}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border">
                      <div className="text-muted-foreground text-[10px]">Số học sinh</div>
                      <div className="text-lg font-bold text-foreground mt-0.5">{analytics.totalStudents || 0}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border">
                      <div className="text-muted-foreground text-[10px]">Điểm trung bình</div>
                      {/* `avgScore`/`passRate` là số thực từ Postgres (VD 63.33333…).
                          Trước đây in thẳng nên ô thống kê tràn chữ số. */}
                      <div className="text-lg font-bold text-warning mt-0.5">
                        {Math.round(Number(analytics.avgScore) || 0)}đ
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border">
                      <div className="text-muted-foreground text-[10px]">Tỷ lệ AC</div>
                      <div className="text-lg font-bold text-success mt-0.5">
                        {Math.round(Number(analytics.passRate) || 0)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Subtask Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Phân chia các Subtasks chấm điểm</span>
                  <button
                    onClick={handleAddSubtask}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background hover:bg-muted text-xs font-semibold text-foreground transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-primary" /> Thêm Subtask
                  </button>
                </div>

                <div className="space-y-3">
                  {editSubtasks.map((sub, idx) => (
                    <div key={sub.id || idx} className="p-3.5 rounded-xl border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex-1 w-full space-y-1">
                        <input
                          type="text"
                          value={sub.label}
                          onChange={(e) => {
                            const updated = [...editSubtasks];
                            updated[idx].label = e.target.value;
                            setEditSubtasks(updated);
                          }}
                          placeholder="Tên Subtask..."
                          className="w-full px-2.5 py-1.5 rounded-lg border bg-background font-medium text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          value={sub.testRange}
                          onChange={(e) => {
                            const updated = [...editSubtasks];
                            updated[idx].testRange = e.target.value;
                            setEditSubtasks(updated);
                          }}
                          placeholder="Phạm vi test (VD: Test 01 - Test 10)..."
                          className="w-full px-2.5 py-1 rounded-lg border bg-background/60 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary font-mono text-muted-foreground"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={sub.score}
                            onChange={(e) => {
                              const updated = [...editSubtasks];
                              updated[idx].score = parseInt(e.target.value, 10) || 0;
                              setEditSubtasks(updated);
                            }}
                            className="w-16 px-2 py-1.5 rounded-lg border bg-background text-center font-bold text-primary text-xs"
                          />
                          <span className="text-muted-foreground text-xs">điểm</span>
                        </div>

                        <button
                          onClick={() => handleRemoveSubtask(idx)}
                          className="p-1.5 rounded-lg border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-muted/20 flex items-center justify-between shrink-0">
              <div className="text-xs text-muted-foreground">
                Tổng điểm Subtasks:{' '}
                <strong className="text-primary font-mono">
                  {editSubtasks.reduce((a, b) => a + (b.score || 0), 0)} / 100đ
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedProblem(null)}
                  className="px-4 py-2 rounded-xl border bg-background hover:bg-muted text-xs font-semibold text-foreground transition"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveSubtasks}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition shadow-md flex items-center gap-1.5"
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

/** Cờ trạng thái tài nguyên của một bài (PDF / lời giải / hướng dẫn) */
function AssetFlag({
  ok,
  okText,
  missText,
}: {
  ok: boolean;
  okText: string;
  missText: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium',
        ok ? 'text-success' : 'text-muted-foreground',
      )}
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <X className="h-3.5 w-3.5" aria-hidden />
      )}
      {ok ? okText : missText}
    </span>
  );
}
