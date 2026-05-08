import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/broker", "/mga", "/insurer"];
const AUTH_PATHS = ["/login", "/signup"];
const VALID_ROLES = ["broker", "mga", "insurer"] as const;
type Role = (typeof VALID_ROLES)[number];

function pickRole(meta: Record<string, unknown> | null | undefined): Role {
  const raw = (meta?.role as string | undefined) ?? "broker";
  return (VALID_ROLES as readonly string[]).includes(raw) ? (raw as Role) : "broker";
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPath = AUTH_PATHS.some((p) => pathname === p);

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user) {
    const role = pickRole(user.user_metadata);
    const myPrefix = `/${role}`;

    if (isAuthPath) {
      const url = request.nextUrl.clone();
      url.pathname = `${myPrefix}/dashboard`;
      return NextResponse.redirect(url);
    }

    // Cross-role access: a user inside /<other-role>/* gets bumped back to their own.
    if (isProtected && !pathname.startsWith(myPrefix)) {
      const url = request.nextUrl.clone();
      url.pathname = `${myPrefix}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
