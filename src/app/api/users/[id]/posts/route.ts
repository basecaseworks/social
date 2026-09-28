import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getAuthenticatedUser } from "@/server/auth";
import {
  getUserProfile,
  listUserPosts,
  UserNotFoundError,
} from "@/server/services/social";
import { userIdSchema } from "@/server/validation/social";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function publicPost(post: Awaited<ReturnType<typeof listUserPosts>>[number]) {
  return {
    ...post,
    likeCount: Number(post.likeCount),
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const viewer = await getAuthenticatedUser(request.headers);
    if (!viewer) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { id } = await context.params;
    const parsedId = userIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await getUserProfile(db, parsedId.data);
    const posts = await listUserPosts(db, parsedId.data, viewer.id);
    return NextResponse.json({ posts: posts.map(publicPost) });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("Could not load user posts.", error);
    return NextResponse.json({ error: "Could not load user posts." }, { status: 500 });
  }
}
