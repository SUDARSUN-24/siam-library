"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dict } from "@/lib/dict";
import { confirmSetupAction, disableAction, newQrAction, regenerateCodesAction, type SecurityState } from "./actions";

function ErrorLine({ t, state }: { t: Dict; state: SecurityState }) {
  if (!state.error) return null;
  const msg = state.error === "rate_limited" ? t.loginRateLimited : state.error === "not_allowed" ? t.twoFactorNotAllowed : t.loginCodeError;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive" data-testid="twofa-error">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {msg}
    </p>
  );
}

function CodeInput({ t, id, backup }: { t: Dict; id: string; backup?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t.loginCode}</Label>
      <Input
        id={id}
        name="code"
        inputMode={backup ? "text" : "numeric"}
        autoComplete="one-time-code"
        required
        maxLength={backup ? 20 : 6}
        placeholder="123456"
        className="h-11 bg-card text-center font-mono text-lg tracking-[0.3em]"
      />
    </div>
  );
}

/** Shown ONCE after setup / regenerating. */
function BackupCodes({ t, codes, done, continueHref }: { t: Dict; codes: string[]; done?: SecurityState["done"]; continueHref: string }) {
  return (
    <div className="mt-6 flex flex-col gap-3" data-testid="backup-codes">
      <p className="rounded-lg bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary">{done === "enabled" ? t.twoFactorEnabledNow : t.twoFactorRegenerated}</p>
      <p className="text-sm">{t.twoFactorBackupIntro}</p>
      <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-3 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} data-testid="backup-code" className="text-center">
            {c}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t.twoFactorBackupWarn}</p>
      <Button asChild className="mt-2 h-11" data-testid="twofa-continue">
        <Link href={continueHref}>
          {t.twoFactorContinue}
        </Link>
      </Button>
    </div>
  );
}

export function SetupTwoFactor({ t, qrSvg, secret, continueHref }: { t: Dict; qrSvg: string; secret: string; continueHref: string }) {
  const [state, action, pending] = useActionState<SecurityState, FormData>(confirmSetupAction, {});
  if (state.codes) return <BackupCodes t={t} codes={state.codes} done={state.done} continueHref={continueHref} />;

  return (
    <div className="mt-6 flex flex-col gap-5">
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>{t.twoFactorStep1}</li>
        <li>{t.twoFactorStep2}</li>
        <li>{t.twoFactorStep3}</li>
      </ol>
      {/* qrcode library output (our own data, no user HTML) */}
      <div className="mx-auto w-56 rounded-xl border border-border bg-white p-2" data-testid="totp-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <div className="text-center text-sm">
        <p className="text-muted-foreground">{t.twoFactorManual}</p>
        <code className="mt-1 inline-block rounded bg-muted px-2 py-1 font-mono text-[13px] break-all select-all" data-testid="totp-secret">
          {secret}
        </code>
      </div>
      <form action={action} className="flex flex-col gap-3" noValidate>
        <ErrorLine t={t} state={state} />
        <CodeInput t={t} id="setup-code" />
        <Button type="submit" disabled={pending} className="h-11" data-testid="twofa-confirm">
          {t.twoFactorConfirm}
        </Button>
      </form>
      <form action={newQrAction}>
        <button type="submit" className="w-full text-sm text-muted-foreground hover:text-primary">
          {t.twoFactorNewQr}
        </button>
      </form>
    </div>
  );
}

export function ManageTwoFactor({ t, canDisable, continueHref }: { t: Dict; canDisable: boolean; continueHref: string }) {
  const [regen, regenAction, regenPending] = useActionState<SecurityState, FormData>(regenerateCodesAction, {});
  const [off, offAction, offPending] = useActionState<SecurityState, FormData>(disableAction, {});

  if (off.done === "disabled") return <p className="mt-6 rounded-lg bg-muted px-3 py-2.5 text-sm" data-testid="twofa-disabled">{t.twoFactorDisabledNow}</p>;

  return (
    <div className="mt-6 flex flex-col gap-8">
      {regen.codes ? (
        <BackupCodes t={t} codes={regen.codes} done={regen.done} continueHref={continueHref} />
      ) : (
        <form action={regenAction} className="flex flex-col gap-3" noValidate>
          <h2 className="font-semibold">{t.twoFactorRegenTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.twoFactorRegenHint}</p>
          <ErrorLine t={t} state={regen} />
          <CodeInput t={t} id="regen-code" backup />
          <Button type="submit" variant="outline" disabled={regenPending} className="h-11" data-testid="twofa-regenerate">
            {t.twoFactorRegenButton}
          </Button>
        </form>
      )}
      {canDisable && (
        <form action={offAction} className="flex flex-col gap-3 border-t border-border pt-6" noValidate>
          <h2 className="font-semibold">{t.twoFactorOffTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.twoFactorOffHint}</p>
          <ErrorLine t={t} state={off} />
          <CodeInput t={t} id="off-code" backup />
          <Button type="submit" variant="destructive" disabled={offPending} className="h-11" data-testid="twofa-disable">
            {t.twoFactorOffButton}
          </Button>
        </form>
      )}
    </div>
  );
}
