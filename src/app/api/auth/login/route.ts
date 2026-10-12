import { NextRequest, NextResponse } from "next/server";
import {
  readAccounts,
  verifyPassword,
  createSession,
  publicAccount
} from "@/lib/bookflow-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const industry = String(body.industry || "");

    const account = readAccounts().find(a => a.email === email);

    if (
      !account ||
      !verifyPassword(password, account.passwordHash) ||
      account.industry !== industry
    ) {
      return NextResponse.json(
        { error: "Email, password or business type is incorrect." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      account: publicAccount(account)
    });

    response.cookies.set("bookflow_session", createSession(account.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Login failed." },
      { status: 500 }
    );
  }
}
