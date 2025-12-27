import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = process.env.RELEASE_WATCH_API_URL;
  const apiKey = process.env.RELEASE_WATCH_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("Missing RELEASE_WATCH_API_URL or RELEASE_WATCH_API_KEY");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${apiUrl}/api/link/telegram/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ userId: session.user.id }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to generate code" },
        { status: res.status },
      );
    }

    return NextResponse.json({ code: data.code });
  } catch (error) {
    console.error("Failed to generate Telegram link code:", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 },
    );
  }
}
