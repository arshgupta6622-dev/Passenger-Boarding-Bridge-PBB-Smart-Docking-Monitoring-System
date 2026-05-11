"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane, LogIn, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass w-full max-w-[420px] rounded-2xl p-8 space-y-5 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="brand-gradient flex h-12 w-12 items-center justify-center rounded-xl shadow-lg">
            <Plane className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-brand-gradient text-xl font-bold leading-tight">
              PBB Smart Docking
            </h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Passenger Boarding Bridge · Monitoring System
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="username" className="text-xs">Username</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            autoComplete="username"
            autoFocus
            disabled={busy}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="password" className="text-xs">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={busy}
          />
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-500"
          >
            {error}
          </motion.p>
        )}

        <Button
          type="submit"
          disabled={busy || !username || !password}
          className="w-full brand-gradient text-white shadow-lg"
        >
          {busy ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          {busy ? "Signing in…" : "Sign in"}
        </Button>

        <p className="pt-2 text-[10px] text-center text-muted-foreground">
          Authorised personnel only · Swati Airport Services
        </p>
      </motion.form>
    </div>
  );
}
