import { and, count, desc, eq, sql } from "drizzle-orm";
import type { db } from "@/db/client";
import { likes, posts, user } from "@/db/schema";
import type { PostCreateInput } from "@/server/validation/social";

type Database = typeof db;

export class PostNotFoundError extends Error {
  constructor() {
    super("Post not found.");
    this.name = "PostNotFoundError";
  }
}

export class LikeConflictError extends Error {
  constructor() {
    super("You already liked this post.");
    this.name = "LikeConflictError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found.");
    this.name = "UserNotFoundError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("code" in error && error.code === "23505") {
    return true;
  }

  return "cause" in error && isUniqueViolation(error.cause);
}

function postSelection(viewerId: string) {
  return {
    id: posts.id,
    authorId: posts.authorId,
    authorName: user.name,
    body: posts.body,
    createdAt: posts.createdAt,
    updatedAt: posts.updatedAt,
    likeCount: count(likes.postId),
    likedByViewer: sql<boolean>`exists (
      select 1 from ${likes}
      where ${likes.postId} = ${posts.id}
        and ${likes.userId} = ${viewerId}
    )`,
    canDelete: sql<boolean>`${posts.authorId} = ${viewerId}`,
  };
}

function postQuery(database: Database, viewerId: string) {
  return database
    .select(postSelection(viewerId))
    .from(posts)
    .innerJoin(user, eq(posts.authorId, user.id))
    .leftJoin(likes, eq(likes.postId, posts.id));
}

export function listFeed(database: Database, viewerId: string) {
  return postQuery(database, viewerId)
    .groupBy(posts.id, user.id)
    .orderBy(desc(posts.createdAt), desc(posts.id));
}

export async function getUserProfile(database: Database, userId: string) {
  const profile = await database
    .select({ id: user.id, name: user.name, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!profile) {
    throw new UserNotFoundError();
  }

  return profile;
}

export function listUserPosts(database: Database, authorId: string, viewerId: string) {
  return postQuery(database, viewerId)
    .where(eq(posts.authorId, authorId))
    .groupBy(posts.id, user.id)
    .orderBy(desc(posts.createdAt), desc(posts.id));
}

export function createPost(database: Database, authorId: string, input: PostCreateInput) {
  return database
    .insert(posts)
    .values({ authorId, body: input.body })
    .returning()
    .then((rows) => rows[0]);
}

export async function deleteOwnPost(database: Database, authorId: string, postId: string) {
  const deleted = await database
    .delete(posts)
    .where(and(eq(posts.id, postId), eq(posts.authorId, authorId)))
    .returning({ id: posts.id });

  return deleted[0] ?? null;
}

export async function likePost(database: Database, userId: string, postId: string) {
  const existingPost = await database
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existingPost) {
    throw new PostNotFoundError();
  }

  try {
    const created = await database
      .insert(likes)
      .values({ postId, userId })
      .returning({ postId: likes.postId, userId: likes.userId });
    return created[0];
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new LikeConflictError();
    }
    throw error;
  }
}

export async function unlikePost(database: Database, userId: string, postId: string) {
  const existingPost = await database
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!existingPost) {
    throw new PostNotFoundError();
  }

  await database
    .delete(likes)
    .where(and(eq(likes.postId, postId), eq(likes.userId, userId)));
}
