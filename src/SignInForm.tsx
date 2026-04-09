"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  // When non-null, we're in the OTP verification step for this email
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  // ── Step 2: OTP entry ──────────────────────────────────────────────────────
  if (pendingEmail !== null) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <p className="text-2xs font-mono text-graphite-muted tracking-widest uppercase mb-2">
            email.verification
          </p>
          <p className="text-sm text-graphite-muted">
            We sent an 8-digit code to{" "}
            <span className="text-graphite font-medium">{pendingEmail}</span>.
            Enter it below.
          </p>
        </div>
        <form
          className="flex flex-col gap-form-field"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            const formData = new FormData(e.currentTarget);
            formData.set("flow", "email-verification");
            formData.set("email", pendingEmail);
            void signIn("password", formData)
              .catch((error) => {
                console.error("OTP verification error:", error);
                toast.error(
                  "Invalid or expired code. Please check your email and try again."
                );
                setSubmitting(false);
              });
          }}
        >
          <input
            className="auth-input-field text-center tracking-widest text-lg font-mono"
            type="text"
            name="code"
            placeholder="00000000"
            maxLength={8}
            pattern="[0-9]{8}"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
          />
          <button className="auth-button" type="submit" disabled={submitting}>
            {submitting ? "Verifying…" : "Verify Email"}
          </button>
          <button
            type="button"
            className="text-center text-sm text-graphite-muted hover:text-graphite transition-colors cursor-pointer"
            onClick={() => {
              setPendingEmail(null);
              setSubmitting(false);
            }}
          >
            ← Back
          </button>
        </form>
      </div>
    );
  }

  // ── Step 1: Credentials ────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          const email = formData.get("email") as string;

          void signIn("password", formData)
            .then((result) => {
              // If not immediately signed in → OTP was sent, move to step 2
              if (!(result as { signingIn?: boolean })?.signingIn) {
                setPendingEmail(email);
              }
              setSubmitting(false);
            })
            .catch((error) => {
              let toastTitle = "";
              if (error.message.includes("Invalid password")) {
                toastTitle = "Invalid password. Please try again.";
              } else {
                toastTitle =
                  flow === "signIn"
                    ? "Could not sign in, did you mean to sign up?"
                    : "Could not sign up, did you mean to sign in?";
              }
              toast.error(toastTitle);
              setSubmitting(false);
            });
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Password"
          required
        />
        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting
            ? flow === "signIn"
              ? "Signing in…"
              : "Signing up…"
            : flow === "signIn"
              ? "Sign in"
              : "Sign up"}
        </button>
        <div className="text-center text-sm text-secondary">
          <span>
            {flow === "signIn"
              ? "Don't have an account? "
              : "Already have an account? "}
          </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
          >
            {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
          </button>
        </div>
      </form>
      <div className="flex items-center justify-center my-3">
        <hr className="my-4 grow border-gray-200" />
        <span className="mx-4 text-secondary">or</span>
        <hr className="my-4 grow border-gray-200" />
      </div>
      <button className="auth-button" onClick={() => void signIn("anonymous")}>
        Sign in anonymously
      </button>
    </div>
  );
}
