"use client";
/* Session changes deliberately use document navigation to reset polling and the one-shot scan lifecycle. */
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-location-assign-relative-destination */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { SEALS, type CircleState } from "@/lib/circle";

type Session = { id: string; host: string; seal: string; key: string; projector: boolean };
type SealLink = { seal: string; key: string };
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 12000);
  try {
    const result = await fetch(url, { ...options, cache: "no-store", signal: timeout.signal, headers: { "Content-Type": "application/json", ...options?.headers } });
    const data = await result.json();
    if (!result.ok) throw new Error(typeof data === "object" && data !== null && "error" in data && typeof data.error === "string" ? data.error : "The circle is temporarily unavailable.");
    return data as T;
  } finally { clearTimeout(timer); }
}
function wedge(i: number) {
  const a = (i * 60 - 120) * Math.PI / 180, b = a + Math.PI / 3;
  return `M500 500 L${(500 + 720 * Math.cos(a)).toFixed(3)} ${(500 + 720 * Math.sin(a)).toFixed(3)} A720 720 0 0 1 ${(500 + 720 * Math.cos(b)).toFixed(3)} ${(500 + 720 * Math.sin(b)).toFixed(3)} Z`;
}
function Circle({ mask, revision }: { mask: number; revision: number }) {
  return <div className={`circle-art ${mask === 63 ? "complete" : ""}`}>
    <svg viewBox="0 0 1000 1000" role="img" aria-label={`Goetic Circle of Solomon, ${SEALS.filter((_, i) => mask & (1 << i)).length} of six sections revealed`}>
      <defs>{SEALS.map((s, i) => <clipPath id={`wedge-${s.id}`} key={s.id}><path d={wedge(i)} /></clipPath>)}
        {/* Keep the original plate intact; the viewport omits its external triangle.
            The two central notches remove the triangle's lower name and figure caption. */}
        <clipPath id="plate-crop"><path d="M0 0 H300 V20 H700 V0 H1000 V1000 H700 V985 H300 V1000 H0 Z" /></clipPath>
        <filter id="plate-ink" colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
          <feColorMatrix type="luminanceToAlpha" />
          <feComponentTransfer result="ink"><feFuncA type="linear" slope="-2.5" intercept="1.8" /></feComponentTransfer>
          <feFlood floodColor="#e8d49c" /><feComposite in2="ink" operator="in" />
        </filter>
        <g id="historical-circle" clipPath="url(#plate-crop)"><svg x="0" y="0" width="1000" height="1000" viewBox="50 636 1620 1620"><image href="/goetia-source.jpg" width="1728" height="2324" filter="url(#plate-ink)" /></svg></g>
      </defs>
      <circle className="starting-outline" cx="496" cy="501" r="452" fill="none" />
      {SEALS.map((s, i) => <g key={s.id} clipPath={`url(#wedge-${s.id})`} className={`seal-layer ${mask & (1 << i) ? "awakened" : ""}`}><use href="#historical-circle" /></g>)}
    </svg>{mask > 0 && <div key={revision} className="reveal-halo" aria-hidden="true" />}
  </div>;
}
export default function Home() {
  const [session, setSession] = useState<Session>({ id: "", host: "", seal: "", key: "", projector: false });
  const [state, setState] = useState<CircleState | null>(null);
  const [links, setLinks] = useState<SealLink[]>([]);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [casting, setCasting] = useState<"pending" | "success" | "error">("pending");
  const [panel, setPanel] = useState(false), [fullscreen, setFullscreen] = useState(false);
  const latest = useRef(-1), applied = useRef(false);
  const accept = useCallback((next: CircleState) => { if (next.revision >= latest.current) { latest.current = next.revision; setState(next); } }, []);
  useEffect(() => {
    const url = new URL(location.href), id = url.searchParams.get("circle") || "";
    let host = new URLSearchParams(url.hash.slice(1)).get("host") || "";
    try { if (host && id) localStorage.setItem(`circle-host:${id}`, host); else if (id) host = localStorage.getItem(`circle-host:${id}`) || ""; } catch { /* Fragment remains usable without storage. */ }
    const seal = url.searchParams.get("seal") || "", projector = url.searchParams.get("view") === "projector";
    // Browser-only URL fragments and storage must be read after hydration, once per document.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({ id, host: seal || projector ? "" : host, seal, key: url.searchParams.get("key") || "", projector }); setReady(true);
  }, []);
  useEffect(() => { const update = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener("fullscreenchange", update); return () => document.removeEventListener("fullscreenchange", update); }, []);
  useEffect(() => {
    if (!session.id) return;
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { const next = await api<CircleState>(`/api/circles/${session.id}`); if (!stopped) { accept(next); setError(""); } }
      catch (e) { if (!stopped) setError(e instanceof Error ? e.message : "Connection lost."); }
      if (!stopped) timer = setTimeout(poll, document.hidden ? 5000 : 1000);
    }
    void poll(); return () => { stopped = true; clearTimeout(timer); };
  }, [session.id, accept]);
  useEffect(() => {
    if (!session.id || !session.host) return;
    let stopped = false;
    api<{ links: SealLink[] }>(`/api/circles/${session.id}/host`, { headers: { Authorization: `Bearer ${session.host}` } }).then(d => { if (!stopped) setLinks(d.links); }).catch(e => { if (!stopped) setNotice(e.message); });
    return () => { stopped = true; };
  }, [session.id, session.host]);
  const unlock = useCallback(async (seal: string, key: string) => { const next = await api<CircleState>(`/api/circles/${session.id}/unlock`, { method: "POST", body: JSON.stringify({ seal, key }) }); accept(next); return next; }, [session.id, accept]);
  const cast = useCallback(async () => {
    setCasting("pending"); setNotice("");
    try { await unlock(session.seal, session.key); setCasting("success"); }
    catch (e) { setCasting("error"); setNotice(e instanceof Error ? e.message : "The seal could not awaken. Try again."); }
  }, [session.seal, session.key, unlock]);
  useEffect(() => { if (!ready || !session.id || !session.seal || applied.current) return; applied.current = true; void cast(); }, [ready, session.id, session.seal, cast]);
  async function createCircle() {
    setBusy(true); setNotice("");
    try { const data = await api<{ id: string; host: string }>("/api/circles", { method: "POST", body: "{}" }); location.assign(`/?circle=${data.id}#host=${data.host}`); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not prepare the circle."); setBusy(false); }
  }
  const tagUrl = (link: SealLink) => `${location.origin}/?circle=${session.id}&seal=${link.seal}&key=${link.key}`;
  async function copy(value: string) { try { await navigator.clipboard.writeText(value); setNotice("Link copied."); } catch { setNotice("Select the link in its field to copy it."); } }
  async function enterFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); else setNotice("Use your browser's fullscreen control."); } catch { setNotice("Use your browser's fullscreen control."); } }
  async function reset() {
    setBusy(true);
    try { accept(await api<CircleState>(`/api/circles/${session.id}/reset`, { method: "POST", headers: { Authorization: `Bearer ${session.host}` }, body: "{}" })); setNotice("The circle rests. The same stickers will awaken it again."); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Reset failed."); } finally { setBusy(false); }
  }
  const mask = state?.mask ?? 0, count = SEALS.filter((_, i) => mask & (1 << i)).length;
  const guestSeal = SEALS.find(s => s.id === session.seal || s.legacyId === session.seal), isGuest = Boolean(session.seal), initial = !session.id;
  const isHost = Boolean(session.host && !isGuest && !session.projector);
  if (!ready) return <main className="ritual"><section className="stage" aria-label="Loading the circle"><Circle mask={0} revision={0} /></section><p className="notice" role="status">Listening…</p></main>;
  return <main className={`ritual ${session.projector ? "projection" : ""} ${fullscreen ? "fullscreen" : ""}`}>
    <header className="masthead"><a href="/" className="wordmark"><span className="wordmark-symbol" aria-hidden="true">✧</span><span>THE GOETIC<br /><strong>CIRCLE</strong></span></a><div className="header-right">{!initial && <span className="count"><b>{String(count).padStart(2, "0")}</b><span>/ 06 awakened</span></span>}{!isGuest && <Button variant="outline" className="quiet-button fullscreen-button" onClick={enterFullscreen} aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>⛶ <span>{fullscreen ? "Exit fullscreen" : "Fullscreen"}</span></Button>}</div></header>
    <section className="stage" aria-label="Shared magic circle"><Circle mask={mask} revision={state?.revision ?? 0} />{initial && <div className="begin-panel"><p className="eyebrow">THE GATHERING</p><h1>Awaken the circle.</h1><p>The Circle of Solomon, revealed together.</p><Button className="gold-button" onClick={createCircle} disabled={!ready || busy}>{busy ? "Preparing…" : "Prepare a circle"}<span aria-hidden="true">✧</span></Button></div>}</section>
    {!initial && <section className="ritual-status" aria-live="polite" aria-atomic="true"><p className="eyebrow">{isGuest ? guestSeal?.name || "UNKNOWN SECTION" : count === 6 ? "THE CIRCLE IS REVEALED" : "THE CIRCLE IS LISTENING"}</p><h1>{isGuest ? casting === "success" ? `${guestSeal?.name || "The seal"} is awakened.` : casting === "error" ? "The seal is waiting." : "Awakening…" : count === 6 ? "The circle is complete." : count ? `${SEALS.find(s => s.id === state?.lastSeal)?.name || "A seal"} has awakened.` : "Awaiting the first touch."}</h1>{isGuest && <p>{casting === "success" ? "Your light has joined the circle. Look to the projection." : casting === "pending" ? "Sending your light to the shared circle." : notice}</p>}{isGuest && casting === "error" && <Button variant="outline" onClick={cast}>Try again</Button>}{!isGuest && <ol className="seal-progress">{SEALS.map((s, i) => <li key={s.id} className={mask & (1 << i) ? "lit" : ""}><span aria-hidden="true">{s.glyph}</span><span>{s.name}</span><span className="sr-only">{mask & (1 << i) ? "awakened" : "waiting"}</span></li>)}</ol>}</section>}
    {error && <p className="connection-warning" role="status">{error} Reconnecting…</p>}{notice && !(isGuest && casting === "error") && <p className="notice" role="status">{notice}</p>}
    {isHost && <footer className="host-footer"><Button variant="ghost" onClick={() => setPanel(!panel)} aria-expanded={panel} aria-controls="host-controls">{panel ? "Close host controls" : "Host controls"}<span aria-hidden="true">{panel ? "−" : "+"}</span></Button><span>Keep this host link private.</span></footer>}
    {isHost && panel && <section id="host-controls" className="host-panel"><div className="panel-heading"><div><p className="eyebrow">HOST CONTROLS</p><h2>Six sections. One circle.</h2></div><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={busy}>Reset circle</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Let the circle rest?</AlertDialogTitle><AlertDialogDescription>All details will disappear, leaving one plain circle on every screen. Your sticker links stay the same.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep the light</AlertDialogCancel><AlertDialogAction onClick={reset}>Reset circle</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div><div className="host-links"><Button className="gold-button" asChild><a target="_blank" rel="noreferrer" href={`/?circle=${session.id}&view=projector`}>Open projector ↗</a></Button><Button variant="outline" onClick={() => copy(`${location.origin}/?circle=${session.id}#host=${session.host}`)}>Copy host link</Button></div><p className="panel-note">Each sticker reveals one section automatically. “Test section” does the same thing. Reset before your guests arrive.</p><div className="tag-grid">{SEALS.map((s, i) => {
      const link = links.find(l => l.seal === s.id), url = link ? tagUrl(link) : "";
      return <article key={s.id} className="tag-card"><div className="tag-title"><span className="tag-glyph" aria-hidden="true">{s.glyph}</span><div><span className="eyebrow">SECTION {i + 1}</span><h3>{s.name}</h3></div><span className="tag-state">{mask & (1 << i) ? "Awakened" : "Waiting"}</span></div><input aria-label={`${s.name} sticker URL`} value={url} readOnly onFocus={e => e.target.select()} /><div className="tag-actions"><Button variant="outline" disabled={!link} onClick={() => copy(url)}>Copy sticker link</Button><Button variant="ghost" disabled={!link || busy} onClick={async () => { if (!link) return; setBusy(true); try { await unlock(link.seal, link.key); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not awaken seal."); } finally { setBusy(false); } }}>Test section</Button></div></article>;
    })}</div></section>}
    {initial && <footer className="initial-footer">A shared circle for your gathering<span>✦</span>Touch a tag. Reveal the circle.</footer>}
  </main>;
}
