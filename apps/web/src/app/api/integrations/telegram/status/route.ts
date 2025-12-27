import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = process.env.RELEASEWATCH_API_URL;
  const apiKey = process.env.RELEASEWATCH_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("Missing RELEASEWATCH_API_URL or RELEASEWATCH_API_KEY");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `${apiUrl}/api/link/telegram/status?userId=${encodeURIComponent(session.user.id)}`,
      {
        headers: { "X-API-Key": apiKey },
      },
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch status" },
        { status: res.status },
      );
    }

    return NextResponse.json({ linked: data.linked });
  } catch (error) {
    console.error("Failed to fetch Telegram link status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 },
    );
  }
}
