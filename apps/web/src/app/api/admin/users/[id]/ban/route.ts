import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db, users } from "@release-watch/database";
import { getSession } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Prevent self-ban
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Cannot ban yourself" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const { action, banReason, banExpiresIn } = body;

    if (action !== "ban" && action !== "unban") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'ban' or 'unban'" },
        { status: 400 },
      );
    }

    // Check if target user exists and is not an admin
    const [targetUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "admin") {
      return NextResponse.json(
        { error: "Cannot ban admin users" },
        { status: 400 },
      );
    }

    if (action === "ban") {
      const banExpires = banExpiresIn
        ? new Date(Date.now() + banExpiresIn * 1000)
        : null;

      await db
        .update(users)
        .set({
          banned: true,
          banReason: banReason || null,
          banExpires,
        })
        .where(eq(users.id, id));

      return NextResponse.json({ success: true, action: "banned" });
    }

    // Unban
    await db
      .update(users)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
      })
      .where(eq(users.id, id));

    return NextResponse.json({ success: true, action: "unbanned" });
  } catch (error) {
    console.error("Failed to update user ban status:", error);
    return NextResponse.json(
      { error: "Failed to update user ban status" },
      { status: 500 },
    );
  }
}
