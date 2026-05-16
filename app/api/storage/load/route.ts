import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  getBucket,
  getS3Client,
  isNotFoundError,
  isS3Configured,
  latestKey,
} from "@/lib/server/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "S3 not configured" },
      { status: 503 }
    );
  }
  try {
    const out = await getS3Client().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: latestKey() })
    );
    const text = await out.Body?.transformToString("utf8");
    if (!text) {
      return NextResponse.json({ snapshot: null }, { status: 404 });
    }
    let snapshot: unknown;
    try {
      snapshot = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "latest.json parse failed" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      snapshot,
      etag: out.ETag ?? null,
    });
  } catch (e: any) {
    if (isNotFoundError(e)) {
      return NextResponse.json({ snapshot: null }, { status: 404 });
    }
    return NextResponse.json(
      { error: e?.message ?? "load failed" },
      { status: 500 }
    );
  }
}
