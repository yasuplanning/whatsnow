import { NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  getBucket,
  getS3Client,
  isNotFoundError,
  isPreconditionFailed,
  isS3Configured,
  latestKey,
} from "@/lib/server/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SaveBody {
  baseVersion: number;
  etag: string | null;
  snapshot: {
    schemaVersion: number;
    version: number;
    updatedAt: string;
    updatedBy: string;
    data: unknown;
  };
}

export async function POST(req: Request) {
  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "S3 not configured" },
      { status: 503 }
    );
  }

  let body: SaveBody;
  try {
    body = (await req.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (
    !body ||
    typeof body.baseVersion !== "number" ||
    !body.snapshot ||
    typeof body.snapshot !== "object" ||
    typeof body.snapshot.version !== "number" ||
    typeof body.snapshot.updatedBy !== "string" ||
    typeof body.snapshot.updatedAt !== "string"
  ) {
    return NextResponse.json(
      { error: "invalid body shape" },
      { status: 400 }
    );
  }

  const client = getS3Client();
  const bucket = getBucket();
  const key = latestKey();

  // 1) Read current to compare versions (server-side conflict check).
  let currentVersion = 0;
  let currentEtag: string | null = null;
  let currentExists = false;
  try {
    const out = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const text = await out.Body?.transformToString("utf8");
    if (text) {
      try {
        const cur = JSON.parse(text) as { version?: number };
        currentVersion = typeof cur.version === "number" ? cur.version : 0;
        currentEtag = out.ETag ?? null;
        currentExists = true;
      } catch {
        // Treat unparseable existing object as conflict-free overwrite target
        // (admin-restored state). Caller's baseVersion must still be >= 0.
        currentExists = true;
        currentEtag = out.ETag ?? null;
      }
    }
  } catch (e: any) {
    if (isNotFoundError(e)) {
      currentExists = false;
    } else {
      return NextResponse.json(
        { error: e?.message ?? "load existing failed" },
        { status: 500 }
      );
    }
  }

  if (currentExists && currentVersion !== body.baseVersion) {
    return NextResponse.json(
      {
        error: "version conflict",
        currentVersion,
        attemptedBaseVersion: body.baseVersion,
      },
      { status: 409 }
    );
  }
  if (!currentExists && body.baseVersion !== 0) {
    return NextResponse.json(
      {
        error: "remote object missing but client expected one",
        currentVersion: 0,
        attemptedBaseVersion: body.baseVersion,
      },
      { status: 409 }
    );
  }

  const text = JSON.stringify(body.snapshot);

  // 2) PUT with If-Match (when we have an ETag) or If-None-Match: * (first write)
  // for a second-line defence against races between the GET above and the PUT.
  // Some S3-compatible backends ignore IfMatch on PutObject; we fall back below.
  const baseCmd = {
    Bucket: bucket,
    Key: key,
    Body: text,
    ContentType: "application/json",
  };
  try {
    const putCmd = new PutObjectCommand({
      ...baseCmd,
      ...(currentEtag
        ? { IfMatch: currentEtag }
        : currentExists
        ? {}
        : { IfNoneMatch: "*" }),
    });
    const result = await client.send(putCmd);
    return NextResponse.json({
      ok: true,
      version: body.snapshot.version,
      etag: result.ETag ?? null,
    });
  } catch (e: any) {
    if (isPreconditionFailed(e)) {
      return NextResponse.json(
        { error: "etag conflict", currentVersion },
        { status: 409 }
      );
    }
    if (
      e?.$metadata?.httpStatusCode === 501 ||
      e?.Code === "NotImplemented"
    ) {
      // Backend without conditional writes: retry plain PUT, accepting that
      // the GET-above check is the only conflict guard.
      try {
        const result = await client.send(new PutObjectCommand(baseCmd));
        return NextResponse.json({
          ok: true,
          version: body.snapshot.version,
          etag: result.ETag ?? null,
        });
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
