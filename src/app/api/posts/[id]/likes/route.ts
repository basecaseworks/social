import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getAuthenticatedUser } from "@/server/auth";
import {
  likePost,
  LikeConflictError,
  PostNotFoundError,
  unlikePost,
} from "@/server/services/social";
import { postIdSchema } from "@/server/validation/social";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function getPostId(context: RouteContext) {
  const { id } = await context.params;
  return postIdSchema.safeParse(id);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const parsedId = await getPostId(context);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid post ID." }, { status: 400 });
    }

    const like = await likePost(db, user.id, parsedId.data);
    return NextResponse.json({ like }, { status: 201 });
  } catch (error) {
    if (error instanceof PostNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof LikeConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Could not like post.", error);
    return NextResponse.json({ error: "Could not like post." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const parsedId = await getPostId(context);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid post ID." }, { status: 400 });
    }

    await unlikePost(db, user.id, parsedId.data);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof PostNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("Could not unlike post.", error);
    return NextResponse.json({ error: "Could not unlike post." }, { status: 500 });
  }
}
