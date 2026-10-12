import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  industries,
  readAccounts,
  writeAccounts,
  hashPassword,
  createSession,
  publicAccount,
  type Industry
} from "@/lib/bookflow-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const businessName = String(body.businessName || "").trim();
    const industry = String(body.industry || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 10 || password.length > 128) {
      return NextResponse.json(
        { error: "Password must contain 10–128 characters." },
        { status: 400 }
      );
    }

    if (!businessName || businessName.length > 100) {
      return NextResponse.json(
        { error: "Enter a business name (up to 100 characters)." },
        { status: 400 }
      );
    }

    if (!industries.includes(industry as Industry)) {
      return NextResponse.json(
        { error: "Select a valid business type." },
        { status: 400 }
      );
    }

    const accounts = readAccounts();

    if (accounts.some(a => a.email === email)) {
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 409 }
      );
    }

    const account = {
      id: crypto.randomUUID(),
      email,
      passwordHash: hashPassword(password),
      businessName,
      industry: industry as Industry,
      createdAt: new Date().toISOString()
    };

    accounts.push(account);
    writeAccounts(accounts);

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
      { error: "Unable to create account." },
      { status: 500 }
    );
  }
}
