"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validation";

export type LoginState = { error?: "invalid" | "rate_limited"; email?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "").slice(0, 200);
  if (!parsed.success) return { error: "invalid", email };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/admin" });
    return {};
  } catch (err) {
    // signIn throws a redirect on success — let Next.js handle it.
    if (err instanceof AuthError) {
      const rate = err instanceof CredentialsSignin && err.code === "rate_limited";
      return { error: rate ? "rate_limited" : "invalid", email };
    }
    throw err;
  }
}
