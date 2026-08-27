'use client';

import * as React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { EditorToolbar } from './editor-toolbar';
import { studentStarterTemplate } from '@/lib/cpp-template';

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  problemCode: string;
  isTeacher?: boolean;
  /**
   * Khôi phục khung code. Do khung ban đầu và bản nháp đã lưu đều thuộc
   * `workspace-layout`, việc reset phải để nơi đó xử lý — nếu tự dựng lại khung
   * ở đây thì bản nháp trong localStorage sẽ ngay lập tức ghi đè lần sau mở bài.
   */
  onReset?: () => void;
}

export function CodeEditor({
  value,
  onChange,
  problemCode,
  isTeacher,
  onReset,
}: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const [fontSize, setFontSize] = React.useState(14);

  const handleReset = () => {
    if (!window.confirm('Bạn có chắc muốn khôi phục khung code về mặc định?')) {
      return;
    }
    if (onReset) onReset();
    else onChange(studentStarterTemplate(problemCode));
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <EditorToolbar
        problemCode={problemCode}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onReset={handleReset}
        isTeacher={isTeacher}
      />
      {/* Nền chờ theo theme: `#1e1e1e` cố định làm loé một khung đen ở chế độ Sáng. */}
      <div className="w-full flex-1 bg-background">
        <Editor
          height="100%"
          language="cpp"
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
          value={value}
          onChange={onChange}
          options={{
            minimap: { enabled: false },
            fontSize,
            lineNumbers: 'on',
            wordWrap: 'off',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            padding: { top: 16 },
            renderWhitespace: 'selection',
            tabSize: 4,
          }}
          loading={
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Đang tải trình chỉnh sửa C++...
            </div>
          }
        />
      </div>
    </div>
  );
}
