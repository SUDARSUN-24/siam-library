"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validation";

export type LoginState = {
  error?: "invalid" | "rate_limited" | "code_invalid";
  /** true → the password was right; show the authenticator-code step. */
  needCode?: boolean;
  email?: string;
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    code: formData.get("code") ?? undefined,
  });
  const email = String(formData.get("email") ?? "").slice(0, 200);
  const hadCode = Boolean(formData.get("code"));
  // Pressing Verify with an empty code field: say so, instead of silently showing step 2 again.
  if (formData.get("step") === "code" && !hadCode) return { error: "code_invalid", needCode: true, email };
  if (!parsed.success) return hadCode ? { error: "code_invalid", needCode: true, email } : { error: "invalid", email };

  // Auth.js sends credentials as form fields: an `undefined` value would arrive as the
  // string "undefined" (and count as a wrong code). Only include `code` when there is one.
  const { code, ...rest } = parsed.data;
  try {
    await signIn("credentials", { ...rest, ...(code ? { code } : {}), redirectTo: "/admin" });
    return {};
  } catch (err) {
    // signIn throws a redirect on success — let Next.js handle it.
    if (err instanceof AuthError) {
      const code = err instanceof CredentialsSignin ? err.code : undefined;
      if (code === "code_required") return { needCode: true, email };
      if (code === "code_invalid") return { error: "code_invalid", needCode: true, email };
      if (code === "rate_limited") return { error: "rate_limited", needCode: hadCode, email };
      // wrong password (or the account changed between steps) → back to step 1
      return { error: "invalid", email };
    }
    throw err;
  }
}
