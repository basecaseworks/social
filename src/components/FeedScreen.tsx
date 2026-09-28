"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PostItem, type PublicPost } from "@/components/PostItem";

export function FeedScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  const loadPosts = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/posts", { cache: "no-store" });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not load feed.");
      }
      setPosts(payload.posts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load feed.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // The first request synchronizes the feed with the authenticated server state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPosts();
  }, [loadPosts]);

  async function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPostError(null);
    setIsPosting(true);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const payload = await response.json().catch(() => null);
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not create post.");
      }
      setBody("");
      await loadPosts();
    } catch (createError) {
      setPostError(createError instanceof Error ? createError.message : "Could not create post.");
    } finally {
      setIsPosting(false);
    }
  }

  async function logOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main>
      <header className="page-header">
        <h1>Social</h1>
        <button className="button secondary" type="button" onClick={logOut}>Log out</button>
      </header>

      <section className="compose" aria-labelledby="compose-heading">
        <div className="compose-meta">
          <label id="compose-heading" htmlFor="post-body">Write a post</label>
          <span className="subtle small">{body.length}/500</span>
        </div>
        <form className="stack" onSubmit={submitPost}>
          <textarea
            id="post-body"
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={500}
            disabled={isPosting}
          />
          {postError ? <p className="error-message" role="alert">{postError}</p> : null}
          <div>
            <button className="button" type="submit" disabled={isPosting}>
              {isPosting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </section>

      <section aria-labelledby="feed-heading">
        <h2 id="feed-heading">Feed</h2>
        {isLoading ? (
          <div className="loading-state"><p>Loading...</p></div>
        ) : error ? (
          <div className="empty-state">
            <p className="error-message" role="alert">{error}</p>
            <button className="button secondary" type="button" onClick={() => void loadPosts()}>Try again</button>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state"><p>No posts yet.</p></div>
        ) : (
          <div className="feed">
            {posts.map((post) => <PostItem key={post.id} post={post} onChanged={() => void loadPosts()} />)}
          </div>
        )}
      </section>
    </main>
  );
}
