"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  ChartNoAxesCombined,
  ArrowRight,
} from "lucide-react";
import { post } from "@/lib/api";
import { Button } from "./ui/button";
const schema = z.object({
  name: z.string(),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(12, "Use at least 12 characters, letters and numbers")
    .max(72)
    .regex(/[0-9]/, "Include a number")
    .regex(/[A-Za-z]/, "Include a letter"),
});
type Fields = z.infer<typeof schema>;
export function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<
    "login" | "register" | "forgot" | "reset" | "verify"
  >(() => {
    if (typeof window === "undefined") return "login";
    const action = new URLSearchParams(window.location.search).get("action");
    return action === "reset" || action === "verify" ? action : "login";
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "" },
  });
  async function submit(fields: Fields) {
    setBusy(true);
    setError("");
    try {
      const result = await post<{ verificationLink?: string }>(
        `/auth/${mode}`,
        mode === "register"
          ? fields
          : { email: fields.email, password: fields.password },
      );
      if (result.verificationLink)
        sessionStorage.setItem(
          "finovaiq-verification",
          result.verificationLink,
        );
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }
  async function recover(form: HTMLFormElement) {
    setBusy(true);
    setError("");
    try {
      const values = new FormData(form);
      const token = new URLSearchParams(window.location.search).get("token");
      if (mode === "forgot") {
        const result = await post<{ message: string; resetLink?: string }>(
          "/auth/forgot-password",
          { email: values.get("email") },
        );
        setNotice(result.message);
        setLink(result.resetLink ?? "");
      } else {
        await post(`/auth/${mode === "verify" ? "verify" : "reset-password"}`, {
          token,
          ...(mode === "reset" ? { password: values.get("password") } : {}),
        });
        setNotice(
          mode === "verify"
            ? "Email verified. You can now sign in."
            : "Password reset. Sign in with your new password.",
        );
        window.history.replaceState({}, "", "/");
        setMode("login");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" className="auth-shell">
      <section className="auth-story">
        <a className="brand" href="/">
          <span className="brand-mark">
            <ChartNoAxesCombined size={23} />
          </span>
          Finova<span>IQ</span>
        </a>
        <div className="story-content">
          <span className="eyebrow">
            <span className="live-dot" /> CLARITY. CONFIDENCE. CONTROL.
          </span>
          <h1>
            A clearer picture.
            <br />
            <span>A smarter future.</span>
          </h1>
          <p>
            Your money has a story.
            <br />
            Understand it, shape it, and move forward.
          </p>
          <div className="story-visual" aria-hidden="true">
            <div className="visual-line" />
            <div className="visual-card">
              <span>YOUR FINANCIAL COMMAND CENTER</span>
              <strong>Everything, connected.</strong>
              <div>
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <small>Accounts · Spending · Investments · Goals</small>
            </div>
            <div className="float-chip">
              <Sparkles size={16} /> Insight starts here{" "}
              <ArrowUpRight size={16} />
            </div>
          </div>
        </div>
        <footer>
          <ShieldCheck size={16} /> Your records. Your private workspace.
        </footer>
      </section>
      <section className="auth-panel">
        <div className="auth-form">
          <span className="eyebrow">WELCOME TO FINOVAIQ</span>
          <h2>
            {mode === "register"
              ? "Build your financial future."
              : mode === "forgot"
                ? "Let’s get you back in."
                : mode === "reset"
                  ? "Choose a new password."
                  : mode === "verify"
                    ? "Verify your email."
                    : "Good to have you back."}
          </h2>
          <p>
            {mode === "register"
              ? "Create your personal financial command center."
              : "Your intelligent financial command center awaits."}
          </p>
          <div className="demo-notice">
            <Sparkles size={17} />
            <span>
              Demo workspace · synthetic data available
              <br />
              <small>No bank connection or paid API required.</small>
            </span>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="success">
              {notice}
            </p>
          )}
          {link && (
            <a className="text-link" href={link}>
              Open local development reset link
            </a>
          )}
          {mode === "login" || mode === "register" ? (
            <form onSubmit={handleSubmit(submit)}>
              {mode === "register" && (
                <label>
                  Full name
                  <input autoComplete="name" required {...register("name")} />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <small className="error">{errors.email.message}</small>
                )}
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  placeholder="At least 12 characters"
                  {...register("password")}
                />
                {errors.password && (
                  <small className="error">{errors.password.message}</small>
                )}
              </label>
              {mode === "login" && (
                <button
                  type="button"
                  className="text-link forgot"
                  onClick={() => setMode("forgot")}
                >
                  Forgot password?
                </button>
              )}
              <Button disabled={busy} type="submit">
                {busy
                  ? "Please wait…"
                  : mode === "register"
                    ? "Create account"
                    : "Sign in to FinovaIQ"}
                <ArrowRight size={17} />
              </Button>
              <p className="switch-auth">
                {mode === "login"
                  ? "New to FinovaIQ?"
                  : "Already have an account?"}{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError("");
                  }}
                >
                  {mode === "login" ? "Create an account" : "Sign in"}
                </button>
              </p>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void recover(e.currentTarget);
              }}
            >
              {mode === "forgot" && (
                <label>
                  Email address
                  <input name="email" type="email" required />
                </label>
              )}
              {mode === "reset" && (
                <label>
                  New password
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    maxLength={72}
                  />
                </label>
              )}
              <Button disabled={busy}>
                {busy
                  ? "Please wait…"
                  : mode === "verify"
                    ? "Verify email"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Reset password"}
              </Button>
              <button
                type="button"
                className="text-link"
                onClick={() => setMode("login")}
              >
                Back to sign in
              </button>
            </form>
          )}
          <p className="auth-fine">
            Financial clarity begins with good records.
            <br />
            FinovaIQ never asks for your bank password.
          </p>
        </div>
      </section>
    </main>
  );
}
