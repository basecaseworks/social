import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("posts_body_not_blank_check", sql`char_length(btrim(${table.body})) > 0`),
    check("posts_body_length_check", sql`char_length(${table.body}) <= 500`),
    index("posts_author_id_idx").on(table.authorId),
    index("posts_feed_idx").on(table.createdAt, table.id),
  ],
);

export const likes = pgTable(
  "likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index("likes_post_id_idx").on(table.postId),
    index("likes_user_id_idx").on(table.userId),
  ],
);

export const postsRelations = relations(posts, ({ many, one }) => ({
  author: one(user, {
    fields: [posts.authorId],
    references: [user.id],
  }),
  likes: many(likes),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
  user: one(user, {
    fields: [likes.userId],
    references: [user.id],
  }),
}));
