"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { AuthForm } from "@/app/login/page";
import { getFirebaseAuth } from "@/lib/firebase-client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      router.replace("/dashboard");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create your account."); } finally { setLoading(false); }
  }
  return <AuthForm title="Create your account" submitLabel="Create account" error={error} loading={loading} onSubmit={onSubmit} name={name} setName={setName} email={email} password={password} setEmail={setEmail} setPassword={setPassword} footer={<><span>Already have an account? </span><Link href="/login">Sign in</Link></>} />;
}
