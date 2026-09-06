"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), (user) => {
        if (user) router.replace("/dashboard");
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Firebase Authentication is not configured.");
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      router.replace("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return <AuthForm title="Welcome back" submitLabel="Sign in" error={error} loading={loading} onSubmit={onSubmit} email={email} password={password} setEmail={setEmail} setPassword={setPassword} footer={<><span>New to EduBuddy? </span><Link href="/signup">Create an account</Link></>} />;
}

export function AuthForm({ title, submitLabel, error, loading, onSubmit, email, password, setEmail, setPassword, footer, name, setName }: { title: string; submitLabel: string; error: string | null; loading: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; email: string; password: string; setEmail: (value: string) => void; setPassword: (value: string) => void; footer: ReactNode; name?: string; setName?: (value: string) => void }) {
  const inputStyle = { padding: "0.8rem", border: "1px solid #D1D5DB", borderRadius: "10px" };
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem", background: "#FAFBFC" }}>
      <form onSubmit={onSubmit} style={{ width: "100%", maxWidth: "420px", padding: "2.5rem", borderRadius: "24px", background: "white", boxShadow: "0 24px 48px rgba(0,0,0,0.08)" }}>
        <h1 style={{ margin: 0, color: "#111827" }}>{title}</h1>
        <p style={{ color: "#6B7280", marginBottom: "1.5rem" }}>Continue your study journey with EduBuddy.</p>
        {setName ? <label style={{ display: "grid", gap: "0.4rem", marginBottom: "1rem" }}>Full name<input required minLength={2} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} /></label> : null}
        <label style={{ display: "grid", gap: "0.4rem", marginBottom: "1rem" }}>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} /></label>
        <label style={{ display: "grid", gap: "0.4rem", marginBottom: "1rem" }}>Password<input required minLength={6} type="password" autoComplete={setName ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} style={inputStyle} /></label>
        {error ? <p role="alert" style={{ color: "#B91C1C" }}>{error}</p> : null}
        <button disabled={loading} className="btn btn-primary" type="submit" style={{ width: "100%", borderRadius: "10px", padding: "0.85rem" }}>{loading ? "Please wait..." : submitLabel}</button>
        <p style={{ textAlign: "center", color: "#6B7280" }}>{footer}</p>
      </form>
    </main>
  );
}
