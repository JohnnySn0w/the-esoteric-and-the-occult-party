"use client";
import { useEffect } from "react";
export function WebMcp() {
  useEffect(() => {
    const id = new URL(location.href).searchParams.get("circle");
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, opts: { signal: AbortSignal }) => unknown } }).modelContext;
    if (!id || !context?.registerTool) return;
    const lifecycle = new AbortController();
    try { Promise.resolve(context.registerTool({ name: "get_circle_progress", description: "Read the shared circle's awakened seals without changing it.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: async (input: unknown) => {
      if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) throw new Error("Expected an empty object.");
      const response = await fetch(`/api/circles/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Circle unavailable.");
      return response.json();
    } }, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser API. */ }
    return () => lifecycle.abort();
  }, []);
  return null;
}
