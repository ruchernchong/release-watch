import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db, sessions, users } from "@release-watch/database";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const activityLogs = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        impersonatedBy: sessions.impersonatedBy,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.userId, users.id))
      .orderBy(desc(sessions.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      activity: activityLogs,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 },
    );
  }
}
