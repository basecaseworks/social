"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PostItem, type PublicPost } from "@/components/PostItem";

type Profile = {
  id: string;
  name: string;
  createdAt: string;
};

export function ProfileScreen() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setError(null);
    try {
      const [profileResponse, postsResponse] = await Promise.all([
        fetch(`/api/users/${params.id}`, { cache: "no-store" }),
        fetch(`/api/users/${params.id}/posts`, { cache: "no-store" }),
      ]);

      if (profileResponse.status === 401 || postsResponse.status === 401) {
        router.replace("/login");
        return;
      }
      if (profileResponse.status === 404 || postsResponse.status === 404) {
        setNotFound(true);
        return;
      }

      const [profilePayload, postsPayload] = await Promise.all([
        profileResponse.json().catch(() => null),
        postsResponse.json().catch(() => null),
      ]);
      if (!profileResponse.ok || !postsResponse.ok) {
        throw new Error(profilePayload?.error ?? postsPayload?.error ?? "Could not load profile.");
      }

      setProfile(profilePayload.profile);
      setPosts(postsPayload.posts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load profile.");
    } finally {
      setIsLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    // The first request synchronizes the profile with the authenticated server state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  if (isLoading) {
    return <main><p className="loading-state">Loading...</p></main>;
  }

  if (notFound) {
    return (
      <main>
        <h1>User not found</h1>
        <p>The user may have been deleted.</p>
        <Link href="/">Back to feed</Link>
      </main>
    );
  }

  if (!profile) {
    return (
      <main>
        <h1>Could not load profile</h1>
        <p className="error-message" role="alert">{error ?? "Please try again."}</p>
        <Link href="/">Back to feed</Link>
      </main>
    );
  }

  return (
    <main>
      <Link className="back-link" href="/">Back to feed</Link>
      <header className="profile-header">
        <h1>{profile.name}</h1>
        <p className="subtle">Posts</p>
      </header>
      {posts.length === 0 ? (
        <div className="empty-state"><p>No posts yet.</p></div>
      ) : (
        <div className="profile-posts">
          {posts.map((post) => <PostItem key={post.id} post={post} onChanged={() => void loadProfile()} />)}
        </div>
      )}
    </main>
  );
}
