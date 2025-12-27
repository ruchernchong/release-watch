import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
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
    const res = await fetch(
      `${apiUrl}/api/dashboard/stats?userId=${encodeURIComponent(session.user.id)}`,
      {
        headers: { "X-API-Key": apiKey },
      },
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch stats" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
