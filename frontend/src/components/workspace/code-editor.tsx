'use client';

import * as React from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { EditorToolbar } from './editor-toolbar';

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  problemCode: string;
  isTeacher?: boolean;
}

export function CodeEditor({ value, onChange, problemCode, isTeacher }: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const [fontSize, setFontSize] = React.useState(14);

  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục khung code về mặc định?')) {
      const defaultTemplate = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Đọc ghi file theo chuẩn thi HSG nếu cần
    // if (fopen("${problemCode.toLowerCase()}.inp", "r")) {
    //     freopen("${problemCode.toLowerCase()}.inp", "r", stdin);
    //     freopen("${problemCode.toLowerCase()}.out", "w", stdout);
    // }
    
    // Viết thuật toán của bạn tại đây...
    
    return 0;
}`;
      onChange(defaultTemplate);
    }
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
      <div className="flex-1 w-full bg-[#1e1e1e]">
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
