function analyzeCppCode(cppCode, problemCode) {
  const lines = cppCode
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('#') && !l.startsWith('using') && !l.startsWith('ios_base') && !l.startsWith('cin.tie') && !l.startsWith('if (fopen') && !l.startsWith('freopen') && !l.startsWith('return 0'));

  const fullCleanCode = lines.join('\n');

  // 1. Tìm lệnh nhập và khai báo
  const inputs = [];
  const decls = [];
  const loops = [];
  const conditions = [];
  const outputs = [];

  for (const line of lines) {
    if (line.includes('cin >>') || line.includes('getline(') || line.includes('scanf(')) {
      inputs.push(line.replace(/;.*$/, ';'));
    } else if (/^(int|long long|string|char|float|double|bool|vector|stack|queue)\s+[a-zA-Z0-9_, =<>{}\(\)]+;/.test(line)) {
      if (!line.includes('main(')) {
        decls.push(line);
      }
    } else if (/^for\s*\(/.test(line) || /^while\s*\(/.test(line)) {
      loops.push(line.replace(/\{.*$/, '').trim());
    } else if (/^if\s*\(/.test(line)) {
      conditions.push(line);
    } else if (line.includes('cout <<') || line.includes('printf(')) {
      outputs.push(line.replace(/;.*$/, ';'));
    }
  }

  console.log('Inputs:', inputs);
  console.log('Decls:', decls);
  console.log('Loops:', loops);
  console.log('Conditions:', conditions);
  console.log('Outputs:', outputs);
}

const demktsoCode = `#include <bits/stdc++.h>
using namespace std;
string s1;
int n, i, demso = 0, demkt = 0;
int main() {
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

analyzeCppCode(demktsoCode, 'DEMKTSO');
