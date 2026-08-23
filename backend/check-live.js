async function checkLive() {
  console.log('Testing live API: https://hsg-judge.onrender.com/api/problems');
  try {
    const res = await fetch('https://hsg-judge.onrender.com/api/problems');
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('Response keys:', Object.keys(json));
    console.log('Problems count:', json.problems?.length);
    console.log('Problems list:');
    console.log(json.problems?.map(p => ({ code: p.code, title: p.title, totalTests: p.totalTests })));
  } catch (err) {
    console.error('API call failed:', err);
  }
}

checkLive();
