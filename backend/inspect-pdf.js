async function testPdfFetch() {
  const url = 'https://ekjqhmosasziofldicwb.supabase.co/storage/v1/object/public/problem-pdfs/problems/TAOXAU/TAOXAU.pdf';
  console.log('Fetching:', url);
  const res = await fetch(url);
  console.log('Status:', res.status);
  console.log('Headers:');
  for (const [k, v] of res.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }
  const buffer = await res.arrayBuffer();
  console.log('Byte length:', buffer.byteLength);
  const headerBytes = Buffer.from(buffer.slice(0, 30)).toString('utf-8');
  console.log('Header string:', JSON.stringify(headerBytes));
}

testPdfFetch();
