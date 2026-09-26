import assert from 'node:assert/strict';

// Integration checks against a running local preview with its migration applied.
const origin = process.argv[2] || 'http://localhost:5173';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) throw new Error('Use a local test server.');
async function request(path, { status = 200, host, body, method = 'GET', requestOrigin = origin } = {}) {
  const response = await fetch(origin + path, {
    method,
    headers: { Origin: requestOrigin, 'Content-Type': 'application/json', ...(host ? { Authorization: `Bearer ${host}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal(response.status, status, `${method} ${path}`);
  if (requestOrigin === origin) assert.match(response.headers.get('Cache-Control'), /no-store/);
  return response.headers.get('Content-Type')?.includes('application/json') ? response.json() : response.text();
}
const circle = await request('/api/circles', { method: 'POST', body: {} });
const path = `/api/circles/${circle.id}`;
assert.equal(circle.links.length, 6);
assert.match(circle.host, /^[a-f0-9]{64}$/);
const initial = await request(path);
assert.deepEqual(Object.keys(initial).sort(), ['id', 'lastSeal', 'mask', 'revision']);
assert.equal(initial.mask, 0);
await request(`${path}/host`, { status: 403 });
await request(`${path}/reset`, { method: 'POST', body: {}, status: 403 });
await request(`${path}/unlock`, { method: 'POST', body: { ...circle.links[0], key: 'wrong' }, status: 403 });
await request(`${path}/unlock`, { method: 'POST', body: { seal: 'other', key: 'wrong' }, status: 400 });
await request(`${path}/unlock`, { method: 'POST', body: null, status: 400 });
await request(`${path}/unlock`, { method: 'POST', body: circle.links[0], requestOrigin: 'https://unrelated.example', status: 403 });
const other = await request('/api/circles', { method: 'POST', body: {} });
await request(`/api/circles/${other.id}/unlock`, { method: 'POST', body: circle.links[0], status: 403 });
await Promise.all(circle.links.map(body => request(`${path}/unlock`, { method: 'POST', body })));
const complete = await request(path);
assert.equal(complete.mask, 63);
assert.equal(complete.revision, 6);
await Promise.all(circle.links.map(body => request(`${path}/unlock`, { method: 'POST', body })));
assert.equal((await request(path)).revision, 6);
const reset = await request(`${path}/reset`, { method: 'POST', host: circle.host, body: {} });
assert.equal(reset.mask, 0);
assert.equal(reset.revision, 7);
assert.equal(reset.lastSeal, null);
assert.deepEqual((await request(`${path}/host`, { host: circle.host })).links, circle.links);
const reused = await request(`${path}/unlock`, { method: 'POST', body: circle.links[0] });
assert.equal(reused.mask, 1);
assert.equal(reused.revision, 8);
assert.equal((await request(`/api/circles/${other.id}`)).mask, 0);
console.log('PASS: public state, host authorization, invalid links, origin check, concurrent scans, duplicate scans, reset, sticker reuse, room isolation.');
