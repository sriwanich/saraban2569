async function test() {
  console.log('Sending GET to /api/settings/auto-reserve...');
  try {
    const resGet = await fetch('http://localhost:3000/api/settings/auto-reserve');
    console.log('GET response:', resGet.status, await resGet.json());
  } catch (err: any) {
    console.error('GET request failed:', err.message);
  }

  console.log('Sending PUT to /api/settings/auto-reserve...');
  try {
    const resPut = await fetch('http://localhost:3000/api/settings/auto-reserve', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoReserveEnabled: true,
        autoReserveTime: '18:00',
        autoReserveQty: 5
      })
    });
    console.log('PUT response:', resPut.status, await resPut.json());
  } catch (err: any) {
    console.error('PUT request failed:', err.message);
  }
}

test();
