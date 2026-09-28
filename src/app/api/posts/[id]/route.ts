import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getAuthenticatedUser } from "@/server/auth";
import { deleteOwnPost } from "@/server/services/social";
import { postIdSchema } from "@/server/validation/social";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getAuthenticatedUser(request.headers);
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { id } = await context.params;
    const parsedId = postIdSchema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid post ID." }, { status: 400 });
    }

    const deleted = await deleteOwnPost(db, user.id, parsedId.data);
    if (!deleted) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Could not delete post.", error);
    return NextResponse.json({ error: "Could not delete post." }, { status: 500 });
  }
}
