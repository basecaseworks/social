"use client";

import Link from "next/link";
import { useState } from "react";

export type PublicPost = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  likedByViewer: boolean;
  canDelete: boolean;
};

type PostItemProps = {
  post: PublicPost;
  onChanged: () => void;
};

function formatPostDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function PostItem({ post, onChanged }: PostItemProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleLike() {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${post.id}/likes`, {
        method: post.likedByViewer ? "DELETE" : "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not update like.");
      }
      onChanged();
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : "Could not update like.");
    } finally {
      setIsBusy(false);
    }
  }

  async function deletePost() {
    if (!window.confirm("Delete this post?")) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not delete post.");
      }
      onChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete post.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article className="post">
      <header className="post-header">
        <Link className="post-author" href={`/users/${post.authorId}`}>{post.authorName}</Link>
        <time className="post-time" dateTime={post.createdAt}>{formatPostDate(post.createdAt)}</time>
      </header>
      <p className="post-body">{post.body}</p>
      <div className="post-actions">
        <button
          className="action-button"
          type="button"
          aria-pressed={post.likedByViewer}
          onClick={() => void toggleLike()}
          disabled={isBusy}
        >
          {post.likedByViewer ? "Unlike" : "Like"} <span className="like-count">{post.likeCount}</span>
        </button>
        {post.canDelete ? (
          <button className="action-button danger" type="button" onClick={() => void deletePost()} disabled={isBusy}>
            {isBusy ? "Deleting..." : "Delete"}
          </button>
        ) : null}
      </div>
      {error ? <p className="post-error" role="alert">{error}</p> : null}
    </article>
  );
}
