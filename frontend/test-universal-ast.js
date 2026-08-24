function parseCppAst(cppCode, problemCode) {
  const cleanLines = cppCode
    .split('\n')
    .map(l => l.trim())
    .filter(l => 
      l.length > 0 &&
      !l.startsWith('//') &&
      !l.startsWith('#') &&
      !l.startsWith('using namespace') &&
      !l.startsWith('ios_base') &&
      !l.startsWith('cin.tie') &&
      !l.startsWith('freopen') &&
      !l.startsWith('if (fopen') &&
      !l.startsWith('return 0') &&
      l !== '{' &&
      l !== '}'
    );

  const fullClean = cleanLines.join('\n');

  // 1. Phân tích Khởi tạo & Nhập liệu (Declarations & Inputs)
  const initStatements = [];
  const loopStatements = [];
  const conditionBlocks = [];
  const outputStatements = [];

  // Tìm tất cả các câu lệnh
  let inLoop = false;
  let inIf = false;
  let currentIfCond = '';
  let currentIfActions = [];

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];

    if (line.includes('cin >>') || line.includes('getline(') || line.includes('scanf(') || /^(int|long long|string|char|float|double|bool|vector|stack|queue)\s+/.test(line)) {
      if (!inLoop && !inIf) {
        initStatements.push(line.replace(/\{.*$/, '').trim());
      }
    }
    
    if (/^(for|while)\s*\(/.test(line)) {
      const loopHeader = line.replace(/\{.*$/, '').trim();
      loopStatements.push(loopHeader);
      inLoop = true;
    } else if (/^if\s*\(/.test(line)) {
      // Có thể là single-line if: if (cond) action;
      const match = line.match(/^if\s*\((.*?)\)\s*(?:\{)?\s*(.*)$/);
      if (match) {
        currentIfCond = `if (${match[1]})`;
        const rest = match[2].trim();
        if (rest && rest !== '{') {
          conditionBlocks.push({
            condition: currentIfCond,
            actions: [rest.replace(/\}.*$/, '').trim()],
          });
          currentIfCond = '';
        } else {
          inIf = true;
          currentIfActions = [];
        }
      }
    } else if (inIf) {
      if (line.includes('}')) {
        const action = line.replace(/\}.*$/, '').trim();
        if (action) currentIfActions.push(action);
        conditionBlocks.push({
          condition: currentIfCond,
          actions: [...currentIfActions],
        });
        inIf = false;
        currentIfCond = '';
        currentIfActions = [];
      } else {
        currentIfActions.push(line);
      }
    } else if (line.includes('cout <<') || line.includes('printf(')) {
      outputStatements.push(line.replace(/\{.*$/, '').replace(/;.*$/, ';').trim());
    }
  }

  if (inIf && currentIfCond) {
    conditionBlocks.push({
      condition: currentIfCond,
      actions: [...currentIfActions],
    });
  }

  console.log('=== Parsed AST for', problemCode, '===');
  console.log('Inits:', initStatements);
  console.log('Loops:', loopStatements);
  console.log('Conditions & Actions:', JSON.stringify(conditionBlocks, null, 2));
  console.log('Outputs:', outputStatements);
}

const thaytheCode = `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    freopen("thaythe.inp", "r", stdin);
    freopen("thaythe.out", "w", stdout);
    string n;
    getline(cin, n);
    for (int i = 0; i < n.size() - 2; i++) {
        if (n[i] == 'a' && n[i+1] == 'n' && n[i+2] == 'h') {
            n[i] = 'e';
            n[i+1] = 'm';
            n.erase(i + 2, 1);
        }
    }
    cout << n;
    return 0;
}`;

parseCppAst(thaytheCode, 'THAYTHE');

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

parseCppAst(demktsoCode, 'DEMKTSO');
