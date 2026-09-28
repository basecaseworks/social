import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getAuthenticatedUser } from "@/server/auth";
import { getUserProfile, UserNotFoundError } from "@/server/services/social";
import { userIdSchema } from "@/server/validation/social";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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

    const profile = await getUserProfile(db, parsedId.data);
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("Could not load profile.", error);
    return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  }
}
