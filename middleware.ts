import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const url = request.nextUrl.clone();

  const isColorDomain =
    host === "color.event-clocks.com" ||
    host === "www.color.event-clocks.com";

  if (isColorDomain) {
    url.pathname = "/color-match-app";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
