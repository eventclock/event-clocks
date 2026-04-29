import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const url = request.nextUrl.clone();
  const requestHeaders = new Headers(request.headers);

  const isColorDomain =
    host === "color.event-clocks.com" ||
    host === "www.color.event-clocks.com";

  if (isColorDomain) {
    requestHeaders.set("x-event-clocks-subdomain", "color");
    url.pathname = "/color-match-app";
    return NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
