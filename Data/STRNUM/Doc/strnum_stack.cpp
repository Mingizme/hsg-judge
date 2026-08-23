#include <bits/stdc++.h>
using namespace std;
int n,k;
string s;
stack<char> st;
vector<char> v;
int main(){
	freopen("strnum.inp","r",stdin);
	freopen("strnum.out","w",stdout);
	ios_base::sync_with_stdio(0);cin.tie(0);cout.tie(0);
	cin>> n>>k;
	cin >> s;
	for(int i=0;i<n;i++){
		while(k>0 && !st.empty() && s[i]>st.top()){
			st.pop();
			k--;
		}
		st.push(s[i]);
	}
	while(k>0){
		k--;
		st.pop();
	}
	while(!st.empty()){
		v.push_back(st.top());
		st.pop();
	}
	for(int i=v.size()-1;i>=0;i--){
		cout <<v[i];
	}
	return 0;
}
