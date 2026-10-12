import { NextRequest, NextResponse } from "next/server";

const BASE = "http://127.0.0.1:6051/inventory";

type Context = {
  params: Promise<{ path: string[] }>;
};

async function forward(
  request: NextRequest,
  context: Context,
  method: "GET" | "POST"
) {
  const { path } = await context.params;
  const query = request.nextUrl.search;

  try {
    const response = await fetch(
      `${BASE}/${path.map(encodeURIComponent).join("/")}${query}`,
      {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: method === "POST" ? await request.text() : undefined,
        cache: "no-store"
      }
    );

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status
    });
  } catch {
    return NextResponse.json(
      { detail: "Backend unavailable on port 6051" },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: Context) {
  return forward(request, context, "GET");
}

export async function POST(request: NextRequest, context: Context) {
  return forward(request, context, "POST");
}
