import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import {
  accounts,
  db,
  userChannels,
  userRepos,
  users,
} from "@release-watch/database";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.image,
        role: users.role,
        banned: users.banned,
        banReason: users.banReason,
        banExpires: users.banExpires,
        twoFactorEnabled: users.twoFactorEnabled,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [subscriptions, channels, connectedAccounts] = await Promise.all([
      db
        .select({
          id: userRepos.id,
          repoName: userRepos.repoName,
          lastNotifiedTag: userRepos.lastNotifiedTag,
          createdAt: userRepos.createdAt,
        })
        .from(userRepos)
        .where(eq(userRepos.userId, id)),
      db
        .select({
          id: userChannels.id,
          type: userChannels.type,
          enabled: userChannels.enabled,
          createdAt: userChannels.createdAt,
        })
        .from(userChannels)
        .where(eq(userChannels.userId, id)),
      db
        .select({
          id: accounts.id,
          providerId: accounts.providerId,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .where(eq(accounts.userId, id)),
    ]);

    return NextResponse.json({
      user,
      subscriptions,
      channels,
      connectedAccounts,
    });
  } catch (error) {
    console.error("Failed to fetch user details:", error);
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 },
    );
  }
}
