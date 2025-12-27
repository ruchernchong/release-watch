import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "5";

  try {
    const res = await fetch(
      `${apiUrl}/api/dashboard/releases?userId=${encodeURIComponent(session.user.id)}&limit=${limit}`,
      {
        headers: { "X-API-Key": apiKey },
      },
    );

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch releases" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch recent releases:", error);
    return NextResponse.json(
      { error: "Failed to fetch releases" },
      { status: 500 },
    );
  }
}
