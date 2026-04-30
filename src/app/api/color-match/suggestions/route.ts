import { NextResponse } from "next/server";
import {
  getColorSuggestions,
  type ColorSuggestionsRequest,
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

    const input = body as ColorSuggestionsRequest;

    if (input.mode === "color") {
      if (typeof input.color !== "string") {
        return NextResponse.json(
          { error: "A base hex color is required." },
          { status: 400 },
        );
      }
    } else if (input.mode === "image") {
      if (typeof input.image !== "string") {
        return NextResponse.json(
          { error: "An image payload is required." },
          { status: 400 },
        );
      }

      if (
        "selectedColor" in input &&
        typeof input.selectedColor !== "undefined" &&
        typeof input.selectedColor !== "string"
      ) {
        return NextResponse.json(
          { error: "selectedColor must be a hex string when provided." },
          { status: 400 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Unsupported mode." },
        { status: 400 },
      );
    }

    const result = await getColorSuggestions(input);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not build color suggestions.";

    const isValidationError =
      /invalid|required|unsupported|too large|must be|could not extract|could not read|could not find enough usable colors|base64 data url/i.test(message);

    return NextResponse.json(
      {
        error: isValidationError
          ? message
          : "Could not build suggestions right now.",
      },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
