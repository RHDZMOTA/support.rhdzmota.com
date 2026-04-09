/**
 * Custom Resend OTP provider for @convex-dev/auth.
 *
 * Uses `Resend` from `@auth/core/providers/resend` as the base provider
 * (as per the official convex-auth-example / docs pattern for Password verify),
 * overriding sendVerificationRequest with native fetch to avoid the ESM
 * bundling issues of the `resend` npm SDK inside the Convex runtime.
 *
 * Environment variables (set in the Convex dashboard or via CLI):
 *   AUTH_RESEND_KEY  — Resend API key (starts with re_...)
 *   AUTH_EMAIL_FROM  — Verified sender, e.g. "RHDZMOTA Support <hello@yourdomain.com>"
 */
import Resend from "@auth/core/providers/resend";

export const ResendOTP = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 60, // 1 hour

  async generateVerificationToken() {
    // 8-digit numeric OTP — uses native Web Crypto (available in Convex runtime)
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    // Mod by 100_000_000 to get 8 digits, then zero-pad
    return String(buf[0] % 100_000_000).padStart(8, "0");
  },

  async sendVerificationRequest({ identifier: email, provider, token }) {
    const from =
      process.env.AUTH_EMAIL_FROM ??
      "RHDZMOTA Support <onboarding@resend.dev>";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your verification code — RHDZMOTA Support",
        text: [
          "Welcome to RHDZMOTA Support!",
          "",
          `Your verification code is: ${token}`,
          "",
          "This code expires in 1 hour.",
          "If you didn't request this, you can safely ignore this email.",
        ].join("\n"),
        html: `<!DOCTYPE html>
<html>
  <body style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#F5F3EF;color:#1C1F24;">
    <div style="margin-bottom:24px;">
      <span style="font-size:14px;font-weight:600;letter-spacing:0.05em;">RHDZMOTA</span>
      <span style="color:#B8A97A;font-size:11px;font-family:monospace;margin-left:8px;text-transform:uppercase;letter-spacing:0.15em;">Support</span>
    </div>
    <h2 style="font-size:20px;font-weight:600;margin:0 0 8px;">Verify your email</h2>
    <p style="color:#6B7280;font-size:14px;margin-bottom:28px;">
      Use the code below to complete your sign-in or sign-up.
    </p>
    <div style="background:#ffffff;border:1px solid #D1CFC9;border-radius:8px;padding:28px;text-align:center;margin-bottom:28px;">
      <p style="color:#9CA3AF;font-size:11px;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">
        Verification code
      </p>
      <p style="font-size:40px;font-weight:700;letter-spacing:10px;margin:0;color:#1C1F24;font-family:monospace;">
        ${token}
      </p>
    </div>
    <p style="color:#9CA3AF;font-size:12px;line-height:1.5;">
      This code expires in <strong>1 hour</strong>.<br/>
      If you didn't request this, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #D1CFC9;margin:24px 0;" />
    <p style="color:#C4C0B8;font-size:11px;font-family:monospace;">support.rhdzmota.com</p>
  </body>
</html>`,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Resend API error:", error);
      throw new Error("Could not send verification email. Please try again.");
    }
  },
});
