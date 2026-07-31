async function testVercelLivePost() {
  console.log('--- Testing Live Vercel API POST (https://olinwa.vercel.app/api/orders/draft) ---');

  const payload = {
    customer_name: 'Live Vercel Test Customer Fix',
    customer_phone: '+2348122334455',
    customer_email: 'olisapaul1@gmail.com',
    delivery_address: '100 Vercel Live St',
    country: 'Nigeria',
    state: 'Lagos',
    form_step_reached: 3,
    is_final_submit: true,
    delivery_fee: 0,
    notification_email: 'olisapaul1@gmail.com',
    items: [
      {
        product_id: '22000000-0000-0000-0000-784714673902',
        name: 'POT KNOB Live Test',
        quantity: 1,
        unit_price_at_time_of_order: 18500
      }
    ]
  };

  try {
    const res = await fetch('https://olinwa.vercel.app/api/orders/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log('Vercel Live Status Code:', res.status);
    console.log('Vercel Live Response Body:', text);
  } catch (err) {
    console.error('Error contacting Vercel live:', err);
  }
}

testVercelLivePost();
