import { NextResponse } from "next/server";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  getBucket,
  getS3Client,
  isNotFoundError,
  isS3Configured,
  photoKey,
} from "@/lib/server/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Params {
  params: { photoId: string };
}

function sanitizeId(id: string): string | null {
  if (!id || id.length > 200) return null;
  // crypto.randomUUID() and the fallback both yield only [A-Za-z0-9_-]
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return id;
}

export async function GET(_req: Request, { params }: Params) {
  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "S3 not configured" },
      { status: 503 }
    );
  }
  const id = sanitizeId(params.photoId);
  if (!id) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  try {
    const out = await getS3Client().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: photoKey(id) })
    );
    const text = await out.Body?.transformToString("utf8");
    if (!text) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "photo parse failed" },
        { status: 500 }
      );
    }
    return NextResponse.json(json);
  } catch (e: any) {
    if (isNotFoundError(e)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: e?.message ?? "load failed" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Params) {
  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "S3 not configured" },
      { status: 503 }
    );
  }
  const id = sanitizeId(params.photoId);
  if (!id) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    typeof (body as { dataUrl?: unknown }).dataUrl !== "string" ||
    !((body as { dataUrl: string }).dataUrl.startsWith("data:"))
  ) {
    return NextResponse.json(
      { error: "invalid dataUrl" },
      { status: 400 }
    );
  }
  const dataUrl = (body as { dataUrl: string }).dataUrl;
  const text = JSON.stringify({ dataUrl });
  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: photoKey(id),
        Body: text,
        ContentType: "application/json",
      })
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "save failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "S3 not configured" },
      { status: 503 }
    );
  }
  const id = sanitizeId(params.photoId);
  if (!id) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: photoKey(id),
      })
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "delete failed" },
      { status: 500 }
    );
  }
}
