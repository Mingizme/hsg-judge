const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { PDFParse } = require('pdf-parse');

function formatPdfTextToHtml(rawText) {
  if (!rawText || !rawText.trim()) return '';

  const clean = rawText
    .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  let html = '';
  for (const line of lines) {
    if (/^(\*|\d+\.|\-)\s*(input|đầu vào|dữ liệu vào)/i.test(line)) {
      const content = line.replace(/^(\*|\d+\.|\-)\s*(input|đầu vào|dữ liệu vào)[:\s]*/i, '');
      html += `<h3>📥 Quy cách Dữ liệu vào (Input)</h3><p>${content}</p>`;
    } else if (/^(\*|\d+\.|\-)\s*(output|đầu ra|kết quả ra|kết quả)/i.test(line)) {
      const content = line.replace(/^(\*|\d+\.|\-)\s*(output|đầu ra|kết quả ra|kết quả)[:\s]*/i, '');
      html += `<h3>📤 Quy cách Kết quả ra (Output)</h3><p>${content}</p>`;
    } else if (/^(\*|\d+\.|\-)\s*(example|ví dụ|ví dụ mẫu)/i.test(line)) {
      html += `<h3>📊 Ví dụ mẫu (Example)</h3>`;
    } else if (/^(\*|\d+\.|\-)\s*(ràng buộc|subtasks|giới hạn|chú ý)/i.test(line)) {
      html += `<h3>🎯 Giới hạn & Ràng buộc</h3><p>${line}</p>`;
    } else if (line.startsWith('-')) {
      html += `<p class="pl-4"><strong>${line}</strong></p>`;
    } else {
      html += `<p>${line}</p>`;
    }
  }

  return html;
}

async function main() {
  console.log('Re-processing DEMKTSO with universal parser...');

  const problem = await prisma.problem.findUnique({
    where: { code: 'DEMKTSO' },
    include: { solutionCodes: true },
  });

  if (!problem) {
    console.error('DEMKTSO not found');
    return;
  }

  // 1. Extract text from PDF
  let statementHtml = '';
  if (problem.pdfUrl) {
    const res = await fetch(problem.pdfUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    const parser = new PDFParse({ data: buffer, verbosity: 0 });
    await parser.load();
    const textResult = await parser.getText();
    statementHtml = formatPdfTextToHtml(textResult?.text || '');
    console.log('Extracted Statement from PDF:\n', statementHtml);
  }

  // 2. Update problem
  await prisma.problem.update({
    where: { code: 'DEMKTSO' },
    data: {
      title: 'Đếm ký tự số và chữ cái',
      description: statementHtml || problem.description,
      ioType: 'FILE',
      ioFileName: 'DEMKTSO',
    },
  });

  // 3. Fix SolutionCode isPrimary = true and normalize source code
  const primaryCode = `#include <bits/stdc++.h>
using namespace std;

string s1;
int n, i, demso = 0, demkt = 0;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    if (fopen("DEMKTSO.INP", "r")) {
        freopen("DEMKTSO.INP", "r", stdin);
        freopen("DEMKTSO.OUT", "w", stdout);
    }

    if (getline(cin, s1)) {
        n = s1.length();
        for (i = 0; i < n; i++) {
            if ('0' <= s1[i] && s1[i] <= '9') demso++;
            if ('A' <= s1[i] && s1[i] <= 'Z') demkt++;
            if ('a' <= s1[i] && s1[i] <= 'z') demkt++;
        }
        cout << demso << "\\n" << demkt;
    }
    return 0;
}`;

  await prisma.solutionCode.deleteMany({ where: { problemId: problem.id } });
  await prisma.solutionCode.create({
    data: {
      problemId: problem.id,
      label: 'Lời giải chính (DEMKTSO.CPP)',
      fileName: 'DEMKTSO.CPP',
      sourceCode: primaryCode,
      language: 'cpp',
      isPrimary: true,
    },
  });

  console.log('✅ DEMKTSO re-processed successfully!');
}

main().finally(() => prisma.$disconnect());
