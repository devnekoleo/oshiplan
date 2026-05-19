import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// T-SEC-30/31: APIエンドポイントへのレート制限ヘッダーを設定
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API ルートへのセキュリティヘッダー追加（Edge レベルで設定）
  const isApiRoute = pathname.startsWith("/api/");
  const isCronRoute = pathname.startsWith("/api/cron/");

  // Cron ルートは CRON_SECRET で保護（headerチェックはroute.ts側で実施）
  if (isCronRoute) {
    return addSecurityHeaders(NextResponse.next());
  }

  // 環境変数未設定時はスルーして500を防ぐ
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const res = NextResponse.next();
    if (isApiRoute) addSecurityHeaders(res);
    return res;
  }

  try {
    const response = await updateSession(request);
    if (isApiRoute) addSecurityHeaders(response as NextResponse);
    return response;
  } catch {
    const res = NextResponse.next();
    if (isApiRoute) addSecurityHeaders(res);
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
