import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  if (kind !== "logo" && kind !== "favicon") {
    return NextResponse.json({ error: "Imagem inválida" }, { status: 400 });
  }
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }
  const token = request.cookies.get("quali_session")?.value;
  if (!token) return NextResponse.json({ error: "Sessão necessária" }, { status: 401 });
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Envie um arquivo de imagem" }, { status: 415 });
  }
  try {
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0 || file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Imagem deve ter até 2 MB" }, { status: 400 });
    }
    const upload = new FormData();
    upload.append("file", file, file.name);
    const api = process.env.INTERNAL_API_URL || "http://127.0.0.1:4002/v1";
    const result = await fetch(`${api}/dev/branding/upload/${kind}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: upload,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    return NextResponse.json(await result.json(), { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Falha no envio do arquivo" }, { status: 503 });
  }
}
