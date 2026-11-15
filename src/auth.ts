import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import {
  clientIp,
  isLimited,
  LOGIN_MAX_PER_ACCOUNT,
  LOGIN_MAX_PER_IP,
  LOGIN_MAX_PER_IP_ACCOUNT,
  LOGIN_WINDOW_MS,
  recordFailure,
  resetLimit,
} from "@/lib/rate-limit";
import { verifySecondFactor } from "@/lib/two-factor";

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}
/** Password was right; the account has 2FA on and no code was sent yet. */
class CodeRequired extends CredentialsSignin {
  code = "code_required";
}
class CodeInvalid extends CredentialsSignin {
  code = "code_invalid";
}

// Compared against when the email does not exist, so response time does not reveal valid accounts.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("no-such-user-password", 12));

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // one working day
  // Auth.js redirects GET /api/auth/signin (and errors) to these pages. They point to the
  // home page on purpose: pointing them at the staff login would reveal the secret ADMIN_PATH.
  pages: { signIn: "/", error: "/" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {}, code: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, code } = parsed.data;

        // Only FAILED attempts count, so staff sharing the library network don't lock each other out.
        const ip = clientIp(request.headers);
        const ipKey = `login:ip:${ip}`;
        const ipAcctKey = `login:ipacct:${ip}:${email}`;
        const acctKey = `login:acct:${email}`;
        const limited = await Promise.all([
          isLimited(ipAcctKey, LOGIN_MAX_PER_IP_ACCOUNT),
          isLimited(acctKey, LOGIN_MAX_PER_ACCOUNT),
          isLimited(ipKey, LOGIN_MAX_PER_IP),
        ]);
        if (limited.some(Boolean)) throw new RateLimited();

        const user = await db.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
        if (!user || !valid) {
          await Promise.all([ipKey, ipAcctKey, acctKey].map((k) => recordFailure(k, LOGIN_WINDOW_MS)));
          return null;
        }

        await Promise.all([resetLimit(ipAcctKey), resetLimit(acctKey)]);

        // Second step: accounts with 2FA on also need a code from the authenticator app
        // (or a backup code). Wrong codes have their own rate limit (src/lib/two-factor.ts).
        if (user.totpEnabledAt) {
          if (!code) throw new CodeRequired();
          const result = await verifySecondFactor(user.id, code, ip);
          if (result === "rate_limited") throw new RateLimited();
          if (result !== "ok") throw new CodeInvalid();
        }
        // ADMIN accounts without 2FA yet get a session that can ONLY open the setup page
        // (requireStaff / getStaffUser / assertStaff refuse everything else until it is on).
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as "ADMIN" | "STAFF";
      return session;
    },
  },
});
