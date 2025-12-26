import { db, userRepos } from "@release-watch/database";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// TODO: Add auth session check later
const MOCK_USER_ID = "mock-user-id";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(userRepos)
      .where(and(eq(userRepos.id, id), eq(userRepos.userId, MOCK_USER_ID)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 },
    );
  }
}
