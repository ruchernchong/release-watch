import { db, userRepos } from "@release-watch/database";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await db
      .select()
      .from(userRepos)
      .where(eq(userRepos.userId, session.user.id));

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { repoName } = body;

    if (!repoName || typeof repoName !== "string") {
      return NextResponse.json(
        { error: "repoName is required" },
        { status: 400 },
      );
    }

    // Normalize repo name (owner/repo format)
    const normalizedRepo = repoName.trim().toLowerCase();
    const repoPattern = /^[a-z0-9_.-]+\/[a-z0-9_.-]+$/i;

    if (!repoPattern.test(normalizedRepo)) {
      return NextResponse.json(
        { error: "Invalid repository format. Use owner/repo" },
        { status: 400 },
      );
    }

    // Validate repo exists on GitHub
    const githubRes = await fetch(
      `https://api.github.com/repos/${normalizedRepo}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ReleaseWatch",
        },
      },
    );

    if (!githubRes.ok) {
      if (githubRes.status === 404) {
        return NextResponse.json(
          { error: "Repository not found on GitHub" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Failed to validate repository" },
        { status: 502 },
      );
    }

    // Insert subscription (onConflictDoNothing handles duplicates)
    const [subscription] = await db
      .insert(userRepos)
      .values({
        userId: session.user.id,
        repoName: normalizedRepo,
      })
      .onConflictDoNothing()
      .returning();

    if (!subscription) {
      // Already exists
      return NextResponse.json(
        { error: "Already subscribed to this repository" },
        { status: 409 },
      );
    }

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error("Failed to add subscription:", error);
    return NextResponse.json(
      { error: "Failed to add subscription" },
      { status: 500 },
    );
  }
}
