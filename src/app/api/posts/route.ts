import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getAuthenticatedUser } from "@/server/auth";
import { createPost, listFeed } from "@/server/services/social";
import { postCreateSchema } from "@/server/validation/social";

export const runtime = "nodejs";

function publicPost(post: Awaited<ReturnType<typeof listFeed>>[number]) {
  return {
    ...post,
    likeCount: Number(post.likeCount),
  };
}

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const feed = await listFeed(db, user.id);
    return NextResponse.json({ posts: feed.map(publicPost) });
  } catch (error) {
    console.error("Could not load feed.", error);
    return NextResponse.json({ error: "Could not load feed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = postCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid post." },
        { status: 400 },
      );
    }

    const post = await createPost(db, user.id, parsed.data);
    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Could not create post.", error);
    return NextResponse.json({ error: "Could not create post." }, { status: 500 });
  }
}
