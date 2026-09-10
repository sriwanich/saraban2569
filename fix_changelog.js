async function fix() {
  const req1 = await fetch('http://localhost:3000/api/changelogs');
  const logs = await req1.json();
  const v240 = logs.find(c => c.version === 'v2.4.0');
  if (v240) {
    v240.isLatest = false;
    await fetch('http://localhost:3000/api/changelogs/' + v240.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v240)
    });
    console.log('Fixed v2.4.0');
  }
}
fix();
