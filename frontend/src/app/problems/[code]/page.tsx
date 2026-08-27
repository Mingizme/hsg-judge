import { Metadata } from 'next';
import { WorkspaceLayout } from '@/components/workspace/workspace-layout';

interface ProblemPageProps {
  params: Promise<{
    code: string;
  }>;
}

export async function generateMetadata({ params }: ProblemPageProps): Promise<Metadata> {
  const { code } = await params;
  const upperCode = code.toUpperCase();
  return {
    title: `Luyện tập ${upperCode} | HSG Judge`,
    description: `Workspace làm bài tập C++ cho bài ${upperCode}`,
  };
}

export default async function ProblemPage({ params }: ProblemPageProps) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  /**
   * KHÔNG đoán đường dẫn Supabase Storage nữa. Ingestion lưu file theo TÊN GỐC
   * (`problems/STRNUM/Đề bài STRNUM.pdf`), nên URL đoán kiểu `strnum.pdf` luôn
   * trả 404 và trình xem PDF hiện ra một trang lỗi. `WorkspaceLayout` lấy
   * `pdfUrl` / `docxUrl` thật từ `GET /api/problems/:code`.
   */
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <WorkspaceLayout problemCode={upperCode} />
    </div>
  );
}
