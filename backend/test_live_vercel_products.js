async function testLiveVercelProducts() {
  console.log('--- Querying https://crm.olistores.com.ng/api/products ---');

  try {
    const res = await fetch('https://crm.olistores.com.ng/api/products');
    console.log('HTTP Response Status:', res.status);
    const data = await res.json();
    console.log(`Live Vercel Products returned: ${Array.isArray(data) ? data.length : 0}`);
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Fetch Error:', err);
  }
}

testLiveVercelProducts();
