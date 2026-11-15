"use client";

import { useActionState, useState } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dict } from "@/lib/dict";
import { loginAction, type LoginState } from "./actions";

/**
 * Step 1: email + password. Step 2 (accounts with two-step login on): the 6-digit code
 * from the authenticator app, or a backup code. The password is kept in React state and
 * re-sent with the code, so the server checks both together (src/auth.ts).
 */
export function LoginForm({ t }: { t: Dict }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const codeStep = Boolean(state.needCode);

  const message =
    state.error === "rate_limited" ? t.loginRateLimited : state.error === "code_invalid" ? t.loginCodeError : state.error ? t.loginError : null;

  return (
    // noValidate: invalid input gets the translated server message, not a browser-language bubble
    <form action={action} className="flex flex-col gap-4" noValidate>
      {message && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive" data-testid="login-error">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {message}
        </p>
      )}

      {codeStep ? (
        <>
          <input type="hidden" name="step" value="code" />
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {t.loginCodeHint}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">{t.loginCode}</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={20}
              placeholder="123456"
              className="h-11 bg-card text-center font-mono text-lg tracking-[0.3em]"
            />
            <p className="text-xs text-muted-foreground">{t.loginCodeBackupHint}</p>
          </div>
          <Button type="submit" disabled={pending} className="mt-2 h-11 text-base">
            {pending ? t.signingIn : t.loginVerify}
          </Button>
          <button type="button" onClick={() => window.location.reload()} className="text-sm text-muted-foreground hover:text-primary">
            {t.loginStartOver}
          </button>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={200}
              value={email || (state.email ?? "")}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-card"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 bg-card"
            />
          </div>
          <Button type="submit" disabled={pending} className="mt-2 h-11 text-base">
            {pending ? t.signingIn : t.signIn}
          </Button>
        </>
      )}
    </form>
  );
}
