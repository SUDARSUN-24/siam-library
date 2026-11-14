"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dict } from "@/lib/dict";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ t }: { t: Dict }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate={false}>
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive" data-testid="login-error">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.error === "rate_limited" ? t.loginRateLimited : t.loginError}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">{t.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required maxLength={200} defaultValue={state.email} className="h-11 bg-card" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required maxLength={200} className="h-11 bg-card" />
      </div>
      <Button type="submit" disabled={pending} className="mt-2 h-11 text-base">
        {pending ? t.signingIn : t.signIn}
      </Button>
    </form>
  );
}
