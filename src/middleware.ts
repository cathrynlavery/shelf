import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, validateBasicAuth } from "@/lib/auth";
import { publicConfig } from "@/lib/config";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const unauthorized = new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${publicConfig.appName}"`,
    },
  });

  if (pathname.startsWith("/api/")) {
    if (pathname === "/api/health") {
      return NextResponse.next();
    }

    if (validateApiKey(req) || validateBasicAuth(req)) {
      return NextResponse.next();
    }

    return unauthorized;
  }

  if (!validateBasicAuth(req)) {
    return unauthorized;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};
