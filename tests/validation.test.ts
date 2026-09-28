import { describe, expect, it } from "vitest";
import { postCreateSchema, postIdSchema, userIdSchema } from "@/server/validation/social";

describe("social validation", () => {
  it("accepts a trimmed post body", () => {
    expect(postCreateSchema.parse({ body: "  Hello feed  " })).toEqual({ body: "Hello feed" });
  });

  it("rejects empty, whitespace-only, and oversized posts", () => {
    expect(postCreateSchema.safeParse({ body: "" }).success).toBe(false);
    expect(postCreateSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(postCreateSchema.safeParse({ body: "a".repeat(501) }).success).toBe(false);
  });

  it("validates post and user identifiers", () => {
    expect(postIdSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(postIdSchema.safeParse("123e4567-e89b-42d3-a456-426614174000").success).toBe(true);
    expect(userIdSchema.safeParse("").success).toBe(false);
  });
});
