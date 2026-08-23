#include<bits/stdc++.h>
using namespace std;
int n,k;
string s;
int main(){
	freopen("strnum.inp","r",stdin);
	freopen("strnum.out","w",stdout);
	cin>>n>>k>>s;
	int h=k;
	string m;
	m=s[0]+m;
	for(int i=1;i<n;i++){
			while (m[0]<s[i]&&k>0&&m!=""){
				m.erase(0,1);
				k--;
			}
			m=s[i]+m;
	}
	while(m.size()!=n-h){
		m.erase(0,1);
	}
	for(int i=m.size()-1;i>=0;i--)cout<<m[i];
}
