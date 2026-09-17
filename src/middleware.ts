import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Apex-host preference for SEO: www.burgerprice.com → https://burgerprice.com
 * Only redirects when Host is exactly www.burgerprice.com so Cloud Run canary
 * hosts (*.run.app), localhost, and other preview hosts are untouched.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  if (host === "www.burgerprice.com") {
    const { pathname, search } = request.nextUrl;
    const destination = `https://burgerprice.com${pathname}${search}`;
    return NextResponse.redirect(destination, 308);
  }

  const response = NextResponse.next();
  // Reinforce HTML rel=canonical (trailing-slash on homepage matches metadataBase).
  const pathname = request.nextUrl.pathname;
  const linkCanonical: Record<string, string> = {
    "/": "https://burgerprice.com/",
    "/about": "https://burgerprice.com/about",
    "/cities": "https://burgerprice.com/cities",
    "/rankings": "https://burgerprice.com/rankings",
  };
  const canonicalHref = linkCanonical[pathname];
  if (canonicalHref) {
    response.headers.set("Link", `<${canonicalHref}>; rel="canonical"`);
  }
  return response;
}

export const config = {
  // Run on all paths except Next static assets; host check above gates the redirect.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
