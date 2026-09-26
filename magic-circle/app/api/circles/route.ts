import { create, handle } from "@/lib/circle-server";
export const dynamic = "force-dynamic";
export function POST(request: Request) { return handle(() => create(request)); }
