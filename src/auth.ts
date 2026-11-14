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

class RateLimited extends CredentialsSignin {
  code = "rate_limited";
}

// Compared against when the email does not exist, so response time does not reveal valid accounts.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("no-such-user-password", 12));

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // one working day
  pages: { signIn: "/admin/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

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
