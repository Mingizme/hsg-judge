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

console.log('Testing parsing on THAYTHE code...');

// Let's see what cpp-to-flowchart does on thaytheCode
const { generateFlowchartFromCpp } = require('./src/lib/cpp-to-flowchart');
const result = generateFlowchartFromCpp(thaytheCode, 'THAYTHE');
console.log('Generated Nodes:');
console.log(result.nodes.map(n => ({ id: n.id, cat: n.data.category, label: n.data.label })));
