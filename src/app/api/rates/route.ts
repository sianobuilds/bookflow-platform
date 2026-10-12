import { NextRequest, NextResponse } from "next/server";

const BASE = "http://127.0.0.1:6051/rates";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.toString();

    const response = await fetch(`${BASE}?${query}`, {
      cache: "no-store"
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return NextResponse.json(
      { detail: "Backend unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    const response = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return NextResponse.json(
      { detail: "Backend unavailable" },
      { status: 503 }
    );
  }
}
