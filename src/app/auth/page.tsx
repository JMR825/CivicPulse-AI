"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import { ShieldAlert, Mail, Lock, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AuthPage() {
  const t = useTranslations("auth");
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoadingState(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || t("authFailed"));
    } finally {
      setLoadingState(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoadingState(true);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || t("googleFailed"));
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg text-white">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4 py-12 relative">
        <div className="absolute top-1/3 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-primary/5 blur-[80px]" />

        <div className="w-full max-w-md">
          {/* Glass Card */}
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden shadow-2xl">
            <div className="text-center mb-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-lg shadow-brand-primary/20 mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {isSignUp ? t("createAccount") : t("signInTitle")}
              </h2>
              <p className="text-sm text-gray-400 mt-2 font-light">
                {isSignUp ? t("joinNetwork") : t("signInSubtitle")}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-brand-danger/10 border border-brand-danger/25 text-xs text-brand-danger/90">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {t("emailAddress")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                    suppressHydrationWarning={true}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {t("password")}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                    suppressHydrationWarning={true}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingState}
                className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary/95 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-brand-primary/25 hover:scale-[1.01] transition-all disabled:opacity-50"
                suppressHydrationWarning={true}
              >
                <LogIn className="h-4 w-4" />
                <span>{loadingState ? t("authenticating") : isSignUp ? t("signUp") : t("signIn")}</span>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0e1422] px-2 text-gray-500 uppercase tracking-wider">{t("orContinueWith")}</span>
              </div>
            </div>

            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loadingState}
              className="w-full flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-300 font-semibold py-3 px-4 rounded-xl transition-all"
              suppressHydrationWarning={true}
            >
              <img
                src="/google.svg"
                alt="Google Logo"
                className="h-5 w-5"
              />
              <span>{t("googleSignIn")}</span>
            </button>

            {/* Toggle Sign Up / Sign In */}
            <div className="mt-6 text-center text-xs text-gray-400">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="hover:text-brand-primary underline transition-all"
                suppressHydrationWarning={true}
              >
                {isSignUp ? t("alreadyHaveAccount") : t("noAccount")}
              </button>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
