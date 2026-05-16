import { NextResponse } from "next/server";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  activeKey,
  getBucket,
  getS3Client,
  isNotFoundError,
  isPreconditionFailed,
  isS3Configured,
} from "@/lib/server/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// active.json holds a small singleton "currently running log" pointer. The
// full LogEntry still lives in latest.json (or, in later phases, individual
// logs/{id}.json files). This file is intentionally a tiny payload so the
// hot path of "start / renew lease / end" is decoupled from the rest of the
// dataset.

export async function GET() {
  if (!isS3Configured()) {
    return NextResponse.json({ error: "S3 not configured" }, { status: 503 });
  }
  try {
    const out = await getS3Client().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: activeKey() })
    );
    const text = await out.Body?.transformToString("utf8");
    if (!text) {
      return NextResponse.json({ pointer: null }, { status: 404 });
    }
    let pointer: unknown;
    try {
      pointer = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "active.json parse failed" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      pointer,
      etag: out.ETag ?? null,
    });
  } catch (e: any) {
    if (isNotFoundError(e)) {
      return NextResponse.json({ pointer: null }, { status: 404 });
    }
    return NextResponse.json(
      { error: e?.message ?? "load failed" },
      { status: 500 }
    );
  }
}

interface PutBody {
  pointer: unknown;
  // Caller's view of what is currently on S3. When the caller has just read
  // the pointer, `etag` should be its ETag. When the caller asserts the
  // pointer is absent (first write or after end), `etag` must be null.
  etag: string | null;
}

export async function PUT(req: Request) {
  if (!isS3Configured()) {
    return NextResponse.json({ error: "S3 not configured" }, { status: 503 });
  }
  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !body.pointer) {
    return NextResponse.json({ error: "invalid body shape" }, { status: 400 });
  }

  const client = getS3Client();
  const bucket = getBucket();
  const key = activeKey();
  const text = JSON.stringify(body.pointer);
  const baseCmd = {
    Bucket: bucket,
    Key: key,
    Body: text,
    ContentType: "application/json",
  };

  // If the caller passed an etag, require it to still match. If not, require
  // the object to be absent. Either way, this gives us a per-entity CAS that
  // is independent of latest.json.
  try {
    const putCmd = new PutObjectCommand({
      ...baseCmd,
      ...(body.etag ? { IfMatch: body.etag } : { IfNoneMatch: "*" }),
    });
    const result = await client.send(putCmd);
    return NextResponse.json({ ok: true, etag: result.ETag ?? null });
  } catch (e: any) {
    if (isPreconditionFailed(e)) {
      return NextResponse.json({ error: "etag conflict" }, { status: 409 });
    }
    if (e?.$metadata?.httpStatusCode === 501 || e?.Code === "NotImplemented") {
      // Backend without conditional writes: fall back to plain PUT. The
      // GET-then-PUT race is the only remaining guard.
      try {
        const result = await client.send(new PutObjectCommand(baseCmd));
        return NextResponse.json({ ok: true, etag: result.ETag ?? null });
      } catch (e2: any) {
        return NextResponse.json(
          { error: e2?.message ?? "save failed" },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { error: e?.message ?? "save failed" },
      { status: 500 }
    );
  }
}

interface DeleteBody {
  etag?: string | null;
}

export async function DELETE(req: Request) {
  if (!isS3Configured()) {
    return NextResponse.json({ error: "S3 not configured" }, { status: 503 });
  }
  // Caller may pass { etag } to detect a race; if omitted we just unconditionally
  // delete (used for forced cleanup paths). The body is optional.
  let body: DeleteBody | null = null;
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    body = null;
  }
  const expectedEtag = body?.etag ?? null;
  try {
    if (expectedEtag) {
      const out = await getS3Client().send(
        new GetObjectCommand({ Bucket: getBucket(), Key: activeKey() })
      );
      if (out.ETag !== expectedEtag) {
        return NextResponse.json(
          { error: "etag conflict" },
          { status: 409 }
        );
      }
    }
    await getS3Client().send(
      new DeleteObjectCommand({ Bucket: getBucket(), Key: activeKey() })
    );
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (isNotFoundError(e)) {
      return NextResponse.json({ ok: true, alreadyAbsent: true });
    }
    return NextResponse.json(
      { error: e?.message ?? "delete failed" },
      { status: 500 }
    );
  }
}
