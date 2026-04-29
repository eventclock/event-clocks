import { NextResponse } from "next/server";
import {
  analyzeColorMatch,
  type ColorMatchRequest,
} from "@/lib/colorMatch";

export const runtime = "nodejs";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isObject(body) || typeof body.mode !== "string") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const input = body as ColorMatchRequest;
    if (input.mode === "colors") {
      if (typeof input.colorA !== "string" || typeof input.colorB !== "string") {
        return NextResponse.json(
          { error: "Two hex colors are required." },
          { status: 400 },
        );
      }
    } else if (input.mode === "images") {
      if (typeof input.imageA !== "string" || typeof input.imageB !== "string") {
        return NextResponse.json(
          { error: "Two image payloads are required." },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported mode." },
        { status: 400 },
      );
    }

    const result = await analyzeColorMatch(input);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Color match analysis failed.";

    const isValidationError =
      /invalid|required|unsupported|too large|must be|could not extract|could not read|could not find enough usable colors|base64 data url/i.test(message);

    return NextResponse.json(
      {
        error: isValidationError
          ? message
          : "Could not analyze this comparison right now.",
      },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
