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
  
  // Real backend PDF path or fallback
  const pdfUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/problems/${upperCode}/pdf`;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <WorkspaceLayout problemCode={upperCode} pdfUrl={pdfUrl} />
    </div>
  );
}
