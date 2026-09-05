import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ error: "Revalidate is not configured" }, { status: 501 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { paths?: string[] };
  const paths = body.paths?.length ? body.paths : ["/properties", "/"];
  for (const path of paths) {
    revalidatePath(path);
  }
  return NextResponse.json({ revalidated: paths });
}
