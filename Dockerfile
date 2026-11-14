# Siam University Library — Book Preview
# Build:  docker compose build      Run:  docker compose up -d
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- dependencies (prisma files first: postinstall runs `prisma generate`)
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ---- build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ---- runtime
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system app && useradd --system --gid app --home /app app
COPY --from=build --chown=app:app /app ./
RUN mkdir -p /app/uploads && chown app:app /app/uploads
USER app
EXPOSE 3000
# Apply pending migrations, then start the server.
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start"]
