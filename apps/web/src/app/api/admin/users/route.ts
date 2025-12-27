import { count, desc, ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

import { db, users, userRepos } from "@release-watch/database";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  try {
    const whereClause = search
      ? or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
        )
      : undefined;

    const [userList, totalCount] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          role: users.role,
          banned: users.banned,
          banReason: users.banReason,
          banExpires: users.banExpires,
          createdAt: users.createdAt,
          subscriptionCount: sql<number>`(
            SELECT COUNT(*) FROM ${userRepos} WHERE ${userRepos.userId} = ${users.id}
          )`,
        })
        .from(users)
        .where(whereClause)
        .orderBy(sortOrder === "asc" ? users.createdAt : desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(users)
        .where(whereClause)
        .then((res) => res[0]?.count ?? 0),
    ]);

    return NextResponse.json({
      users: userList,
      total: totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
