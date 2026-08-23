'use client';

import * as React from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { EditorToolbar } from './editor-toolbar';

const DEFAULT_TEMPLATE = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Đọc ghi file theo chuẩn HSG nếu cần
    // if (fopen("PROBLEM_CODE.inp", "r")) {
    //     freopen("PROBLEM_CODE.inp", "r", stdin);
    //     freopen("PROBLEM_CODE.out", "w", stdout);
    // }
    
    // Code here
    
    return 0;
}`;

interface CodeEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  problemCode: string;
}

export function CodeEditor({ value, onChange, problemCode }: CodeEditorProps) {
  const { resolvedTheme } = useTheme();
  const monaco = useMonaco();
  const [fontSize, setFontSize] = React.useState(14);
  
  const initialValue = React.useMemo(() => {
    return DEFAULT_TEMPLATE.replace(/PROBLEM_CODE/g, problemCode);
  }, [problemCode]);


  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn khôi phục code về mẫu mặc định? Code hiện tại sẽ bị xóa.')) {
      onChange(initialValue);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <EditorToolbar 
        problemCode={problemCode} 
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        onReset={handleReset}
      />
      <div className="flex-1 w-full bg-[#1e1e1e]">
        <Editor
          height="100%"
          language="cpp"
          theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
          value={value || initialValue}
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
              Đang tải trình chỉnh sửa...
            </div>
          }
        />
      </div>
    </div>
  );
}
