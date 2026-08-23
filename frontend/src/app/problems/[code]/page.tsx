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
  
  // Direct public Supabase Storage URL for PDF and DOCX
  const supabaseStorageBase = 'https://ekjqhmosasziofldicwb.supabase.co/storage/v1/object/public/problem-pdfs';
  const pdfUrl = `${supabaseStorageBase}/problems/${upperCode}/${upperCode.toLowerCase()}.pdf`;
  const docxUrl = `${supabaseStorageBase}/problems/${upperCode}/${upperCode.toLowerCase()}.docx`;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <WorkspaceLayout problemCode={upperCode} pdfUrl={pdfUrl} docxUrl={docxUrl} />
    </div>
  );
}
