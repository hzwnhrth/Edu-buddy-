"use client";

import { FormEvent, type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword, type User } from "firebase/auth";
import { motion } from "framer-motion";
import {
  HiOutlineArrowRight,
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineLockClosed,
  HiOutlineUser,
} from "react-icons/hi2";
import { getFirebaseAuth } from "@/lib/firebase-client";

const homeForRole = {
  student: "/dashboard",
  teacher: "/teacher-dashboard",
  admin: "/admin-dashboard",
};

export async function homeForUser(user: User) {
  const token = await user.getIdTokenResult();
  const role = token.claims.role === "teacher" || token.claims.role === "admin" ? token.claims.role : "student";
  return homeForRole[role];
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), (user) => {
        if (user) void homeForUser(user).then((path) => router.replace(path));
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Firebase Authentication is not configured.");
    }
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim().toLowerCase(), password);
      router.replace(await homeForUser(credential.user));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <AuthForm title="Welcome back" subtitle="Log in to continue your study journey" submitLabel="Log In" error={error} loading={loading} onSubmit={onSubmit} email={email} password={password} setEmail={setEmail} setPassword={setPassword} footer={<><span>New to EduBuddy? </span><Link href="/signup">Create an account</Link></>} />;
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score += 1;
  return [
    { label: "Weak", color: "#EF4444" },
    { label: "Okay", color: "#F59E0B" },
    { label: "Good", color: "#22C55E" },
    { label: "Strong", color: "#16A34A" },
  ][score] as { label: string; color: string } & { score?: number };
}

interface AuthFormProps {
  title: string;
  subtitle: string;
  submitLabel: string;
  error: string | null;
  loading: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  footer: ReactNode;
  name?: string;
  setName?: (value: string) => void;
}

export function AuthForm({ title, subtitle, submitLabel, error, loading, onSubmit, email, password, setEmail, setPassword, footer, name, setName }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const strength = passwordStrength(password);
  const inputStyle = { width: "100%", padding: "0.85rem 2.75rem", borderRadius: "14px", border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: "0.95rem", fontFamily: "inherit", color: "#111827", outline: "none" };
  const iconStyle = { position: "absolute" as const, left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: "1.05rem" };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFBFC", padding: "1.5rem", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, #E5E7EB 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.5 }} />
      <motion.form initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} onSubmit={onSubmit} style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "440px", background: "#FFFFFF", borderRadius: "28px", padding: "2.75rem 2.5rem", boxShadow: "0 24px 48px rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.03)" }}>
        <Link href="/" aria-label="Back to EduBuddy landing page" style={{ display: "block", width: "fit-content", margin: "0 auto 1.5rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img src="/edubuddy_full_logo.svg" alt="EduBuddy" style={{ display: "block", maxWidth: "150px", width: "100%", height: "auto" }} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} />
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, textAlign: "center", color: "#111827", marginBottom: "0.35rem" }}>{title}</h1>
        <p style={{ textAlign: "center", color: "#6B7280", fontSize: "0.9rem", marginBottom: "1.75rem" }}>{subtitle}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {setName ? <div style={{ position: "relative" }}><HiOutlineUser style={iconStyle} /><input required minLength={2} style={inputStyle} type="text" placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></div> : null}
          <div style={{ position: "relative" }}><HiOutlineEnvelope style={iconStyle} /><input required style={inputStyle} type="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus /></div>
          <div style={{ position: "relative" }}>
            <HiOutlineLockClosed style={iconStyle} />
            <input required minLength={6} style={{ ...inputStyle, paddingRight: "2.75rem" }} type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={setName ? "new-password" : "current-password"} />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} style={{ position: "absolute", right: "0.9rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", padding: "0.2rem", display: "flex" }}>{showPassword ? <HiOutlineEyeSlash style={{ fontSize: "1.05rem" }} /> : <HiOutlineEye style={{ fontSize: "1.05rem" }} />}</button>
          </div>
          {setName && password.length > 0 ? <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}><div style={{ flex: 1, display: "flex", gap: "0.3rem" }}>{[0, 1, 2, 3].map((index) => <div key={index} style={{ flex: 1, height: "4px", borderRadius: 2, background: index < (strength.label === "Weak" ? 1 : strength.label === "Okay" ? 2 : strength.label === "Good" ? 3 : 4) ? strength.color : "#E5E7EB" }} />)}</div><span style={{ fontSize: "0.72rem", fontWeight: 800, color: strength.color, minWidth: "44px", textAlign: "right" }}>{strength.label}</span></div> : null}
          {error ? <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" style={{ color: "#DC2626", background: "#FEE2E2", padding: "0.7rem 1rem", borderRadius: "10px", fontSize: "0.85rem", fontWeight: 600 }}>{error}</motion.div> : null}
          <motion.button type="submit" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="btn btn-primary" style={{ width: "100%", padding: "0.9rem", fontSize: "1rem", borderRadius: "14px", marginTop: "0.35rem" }} disabled={loading}>{loading ? "Please wait..." : submitLabel} <HiOutlineArrowRight /></motion.button>
        </div>
        <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.88rem", color: "#6B7280" }}>{footer}</p>
      </motion.form>
    </main>
  );
}
