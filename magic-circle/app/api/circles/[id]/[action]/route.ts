import { handle, host, unlock, reset, invalidAction } from "@/lib/circle-server";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; action: string }> };
export async function GET(request: Request, { params }: Context) {
  const { id, action } = await params;
  return handle(async () => action === "host" ? host(request, id) : invalidAction());
}
export async function POST(request: Request, { params }: Context) {
  const { id, action } = await params;
  return handle(async () => action === "unlock" ? unlock(request, id) : action === "reset" ? reset(request, id) : invalidAction());
}
