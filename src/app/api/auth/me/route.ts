import { NextRequest, NextResponse } from "next/server";
import {
  sessionAccount,
  publicAccount
} from "@/lib/bookflow-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const account = sessionAccount(
    request.cookies.get("bookflow_session")?.value
  );

  if (!account) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    account: publicAccount(account)
  });
}
