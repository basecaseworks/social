import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, sql } from "@/db/client";
import { account, likes, posts, session, user } from "@/db/schema";
import { POST as createPostEndpoint } from "@/app/api/posts/route";
import { auth } from "@/server/auth";
import {
  createPost,
  deleteOwnPost,
  getUserProfile,
  LikeConflictError,
  likePost,
  listFeed,
  listUserPosts,
  unlikePost,
  UserNotFoundError,
} from "@/server/services/social";

const databaseAvailable = Boolean(process.env.DATABASE_URL || process.env.TEST_DATABASE_URL);

describe.skipIf(!databaseAvailable)("social integration", () => {
  const timestamp = Date.now();
  const userA = {
    name: "Social User A",
    email: `social-a-${timestamp}@example.com`,
    password: "correct-horse-battery-staple",
  };
  const userB = {
    name: "Social User B",
    email: `social-b-${timestamp}@example.com`,
    password: "correct-horse-battery-staple",
  };
  let userAId = "";
  let userBId = "";

  beforeAll(async () => {
    const signupA = await auth.api.signUpEmail({ body: userA });
    const signupB = await auth.api.signUpEmail({ body: userB });
    userAId = signupA.user.id;
    userBId = signupB.user.id;
  });

  beforeEach(async () => {
    await db.delete(posts).where(inArray(posts.authorId, [userAId, userBId]));
  });

  it("registers, logs in, and protects mutations", async () => {
    const login = await auth.api.signInEmail({
      body: { email: userA.email, password: userA.password },
    });
    expect(login.user.id).toBe(userAId);
    expect(login.token).toBeTruthy();

    const response = await createPostEndpoint(
      new Request("http://localhost/api/posts", {
        method: "POST",
        body: JSON.stringify({ body: "Unauthenticated" }),
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("creates posts and returns a deterministic newest-first feed", async () => {
    const older = await createPost(db, userAId, { body: "Older post" });
    const newer = await createPost(db, userBId, { body: "Newer post" });

    await db.update(posts).set({
      createdAt: new Date("2026-01-01T10:00:00Z"),
      updatedAt: new Date("2026-01-01T10:00:00Z"),
    }).where(eq(posts.id, older.id));
    await db.update(posts).set({
      createdAt: new Date("2026-01-01T11:00:00Z"),
      updatedAt: new Date("2026-01-01T11:00:00Z"),
    }).where(eq(posts.id, newer.id));

    const feed = await listFeed(db, userAId);
    expect(feed.slice(0, 2).map((post) => post.id)).toEqual([newer.id, older.id]);
  });

  it("allows only the post owner to delete", async () => {
    const post = await createPost(db, userAId, { body: "Private ownership test" });

    expect(await deleteOwnPost(db, userBId, post.id)).toBeNull();
    expect(await deleteOwnPost(db, userAId, post.id)).toEqual({ id: post.id });
  });

  it("likes, rejects duplicate likes, unlikes, and updates counts", async () => {
    const post = await createPost(db, userAId, { body: "Like this" });

    await likePost(db, userBId, post.id);
    await expect(likePost(db, userBId, post.id)).rejects.toBeInstanceOf(LikeConflictError);

    const likedFeed = await listFeed(db, userBId);
    expect(Number(likedFeed[0]?.likeCount)).toBe(1);
    expect(likedFeed[0]?.likedByViewer).toBe(true);

    await unlikePost(db, userBId, post.id);
    const unlikedFeed = await listFeed(db, userBId);
    expect(Number(unlikedFeed[0]?.likeCount)).toBe(0);
    expect(unlikedFeed[0]?.likedByViewer).toBe(false);
  });

  it("enforces the like key and cascades likes when a post is deleted", async () => {
    const post = await createPost(db, userAId, { body: "Cascade test" });
    await db.insert(likes).values({ postId: post.id, userId: userBId });
    await expect(db.insert(likes).values({ postId: post.id, userId: userBId })).rejects.toThrow();

    await deleteOwnPost(db, userAId, post.id);
    expect(await db.select().from(likes).where(eq(likes.postId, post.id))).toHaveLength(0);
  });

  it("returns a user's profile and posts and rejects unknown users", async () => {
    const post = await createPost(db, userAId, { body: "Profile post" });
    const profile = await getUserProfile(db, userAId);
    const profilePosts = await listUserPosts(db, userAId, userBId);

    expect(profile.name).toBe(userA.name);
    expect(profilePosts[0]?.id).toBe(post.id);
    expect(profilePosts[0]?.canDelete).toBe(false);
    await expect(getUserProfile(db, "missing-user")).rejects.toBeInstanceOf(UserNotFoundError);
  });

  afterAll(async () => {
    await db.delete(posts).where(inArray(posts.authorId, [userAId, userBId]));
    await db.delete(session).where(inArray(session.userId, [userAId, userBId]));
    await db.delete(account).where(inArray(account.userId, [userAId, userBId]));
    await db.delete(user).where(inArray(user.id, [userAId, userBId]));
    await sql.end();
  });
});
