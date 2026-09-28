"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await authClient.signUp.email({ name, email, password });
    if (result.error) {
      setError(result.error.message ?? "Could not register.");
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="auth-main">
      <h1>Register</h1>
      <form className="stack" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required disabled={isSubmitting} />
        </div>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isSubmitting} />
        </div>
        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isSubmitting} />
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registering..." : "Register"}
        </button>
      </form>
      <p className="auth-links">
        <span className="subtle">Already registered?</span> <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
