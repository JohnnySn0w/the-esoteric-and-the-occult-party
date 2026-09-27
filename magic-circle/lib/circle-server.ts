import { env } from "cloudflare:workers";
import { SEALS, type CircleState } from "./circle";

type Row = { id: string; host_hash: string; seal_keys: string; mask: number; revision: number; last_seal: string | null };
class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
function db() { if (!env.DB) throw new Error("Circle database unavailable"); return env.DB; }
const visible = (row: Pick<Row, "id" | "mask" | "revision" | "last_seal">): CircleState => ({ id: row.id, mask: row.mask & 31, revision: row.revision, lastSeal: SEALS.find(s => s.id === row.last_seal || s.legacyId === row.last_seal)?.id ?? null });
const token = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), n => n.toString(16).padStart(2, "0")).join("");
async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), n => n.toString(16).padStart(2, "0")).join(""); }
async function row(id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(404, "This circle could not be found.");
  const result = await db().prepare("SELECT id, host_hash, seal_keys, mask, revision, last_seal FROM circles WHERE id = ?").bind(id).first<Row>();
  if (!result) throw new HttpError(404, "This circle could not be found.");
  return result;
}
function checkOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Open the original circle link to continue.");
}
async function authorize(request: Request, circle: Row) {
  const credential = request.headers.get("Authorization")?.replace(/^Bearer /, "") || "";
  if (!/^[a-f0-9]{64}$/.test(credential) || await hash(credential) !== circle.host_hash) throw new HttpError(403, "The private host link is required.");
}
export async function handle(work: () => Promise<unknown>) {
  try { return Response.json(await work(), { headers: { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer" } }); }
  catch (e) {
    if (!(e instanceof HttpError)) console.error("Circle request failed", e instanceof Error ? e.name : "Unknown error");
    return Response.json({ error: e instanceof HttpError ? e.message : "The circle is temporarily unavailable. Please try again." }, { status: e instanceof HttpError ? e.status : 503, headers: { "Cache-Control": "no-store" } });
  }
}
export async function create(request: Request) {
  checkOrigin(request);
  const id = token(12), host = token(32);
  const keys = Object.fromEntries(SEALS.map(s => [s.id, token(16)]));
  await db().prepare("INSERT INTO circles (id, host_hash, seal_keys, mask, revision, created_at) VALUES (?, ?, ?, 0, 0, ?)").bind(id, await hash(host), JSON.stringify(keys), new Date().toISOString()).run();
  return { id, host, links: SEALS.map(s => ({ seal: s.id, key: keys[s.id] })) };
}
export async function read(id: string) { return visible(await row(id)); }
export async function host(request: Request, id: string) {
  const circle = await row(id); await authorize(request, circle);
  const keys = JSON.parse(circle.seal_keys) as Record<string, string>;
  return { ...visible(circle), links: SEALS.map(s => ({ seal: s.id, key: keys[s.id] ?? keys[s.legacyId] })) };
}
export async function unlock(request: Request, id: string) {
  checkOrigin(request);
  const text = await request.text();
  if (text.length > 1024) throw new HttpError(413, "This seal link is invalid.");
  let body: { seal?: unknown; key?: unknown };
  try { body = JSON.parse(text); } catch { throw new HttpError(400, "This seal link is invalid."); }
  if (!body || typeof body !== "object" || typeof body.seal !== "string" || typeof body.key !== "string") throw new HttpError(400, "This seal link is invalid.");
  const index = SEALS.findIndex(s => s.id === body.seal || s.legacyId === body.seal);
  if (index < 0) throw new HttpError(400, "This seal is not part of the circle.");
  const circle = await row(id), keys = JSON.parse(circle.seal_keys) as Record<string, string>;
  const section = SEALS[index];
  if ((keys[section.id] ?? keys[section.legacyId]) !== body.key) throw new HttpError(403, "This seal link is incomplete or invalid.");
  const bit = 1 << index;
  // Atomic bitwise OR preserves concurrent scans. Duplicate scans don't advance revision.
  const updated = await db().prepare(`UPDATE circles SET
    revision = revision + CASE WHEN (mask & ?) = 0 THEN 1 ELSE 0 END,
    last_seal = CASE WHEN (mask & ?) = 0 THEN ? ELSE last_seal END,
    mask = mask | ? WHERE id = ? RETURNING id, mask, revision, last_seal`)
    .bind(bit, bit, section.id, bit, id).first<Row>();
  if (!updated) throw new HttpError(404, "This circle could not be found.");
  return visible(updated);
}
export async function reset(request: Request, id: string) {
  checkOrigin(request);
  const circle = await row(id); await authorize(request, circle);
  const updated = await db().prepare("UPDATE circles SET mask = 0, revision = revision + 1, last_seal = NULL WHERE id = ? RETURNING id, mask, revision, last_seal").bind(id).first<Row>();
  if (!updated) throw new HttpError(404, "This circle could not be found.");
  return visible(updated);
}
export function invalidAction() { throw new HttpError(404, "This action could not be found."); }
