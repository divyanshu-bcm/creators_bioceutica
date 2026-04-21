"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";
  const message = searchParams.get("message");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (authError) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {(message === "password_set" || message === "account_created") && (
        <p className="text-sm text-[#1B6B3D] bg-[#E8F5EE] border border-[#C8E6D2] rounded-xl px-4 py-3">
          {message === "account_created"
            ? "Account created. Sign in with your new password."
            : "Password set. Sign in with your new password."}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
      </div>
      {error && (
        <p className="text-sm text-[#A82E22] bg-[#FEF0EE] border border-[#F8D2CE] rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="bc-aurora min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#003D45] shadow-[0_10px_30px_-10px_rgba(0,61,69,0.6)]">
            <Image
              src="/Small_logo.svg"
              alt="Bioceutica"
              width={24}
              height={24}
              style={{ filter: "invert(1) brightness(2)" }}
              priority
            />
          </div>
          <div>
            <p className="font-display text-lg leading-none text-[#002A30] tracking-tight">
              Bioceutica
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#4A4740] mt-1">
              Creators
            </p>
          </div>
        </div>

        <div className="glass-strong rounded-3xl p-8">
          <div className="mb-7">
            <h1 className="font-display text-3xl text-[#002A30] tracking-tight leading-tight">
              Welcome <em className="not-italic font-display italic text-[#F77646]">back</em>
            </h1>
            <p className="text-sm text-[#4A4740] mt-2">
              Sign in to manage your forms and creator campaigns.
            </p>
          </div>
          <Suspense
            fallback={
              <div className="h-32 animate-pulse bg-white/40 rounded-xl" />
            }
          >
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-xs text-[#706C63] mt-6">
          © {new Date().getFullYear()} Bioceutica · All rights reserved
        </p>
      </div>
    </div>
  );
}
