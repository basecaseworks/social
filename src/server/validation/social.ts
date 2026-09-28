import { z } from "zod";

export const postIdSchema = z.string().uuid();
export const userIdSchema = z.string().min(1).max(255);

export const postCreateSchema = z.object({
  body: z.string().trim().min(1, "Post cannot be empty.").max(500, "Post must be 500 characters or fewer."),
});

export type PostCreateInput = z.infer<typeof postCreateSchema>;
