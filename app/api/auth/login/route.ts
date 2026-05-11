import { NextRequest, NextResponse } from "next/server";

const USERNAME = process.env.AUTH_USERNAME ?? "arsh";
const PASSWORD = process.env.AUTH_PASSWORD ?? "pbb2026";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = (await req.json()) as {
      username?: string;
      password?: string;
    };

    if (username === USERNAME && password === PASSWORD) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("pbb-auth", "ok", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return res;
    }

    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
