# ==========================================
# Multi-stage Dockerfile para Next.js Standalone
# Otimizado para Produção & Coolify (< 150MB)
# ==========================================

# 1. Base Node Alpine
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 2. Instalação de Dependências
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Desabilita telemetria durante o build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# 4. Imagem Final de Execução (Runner)
FROM node:22-alpine AS runner
RUN apk add --no-cache curl libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Cria usuário não-root para segurança estrita
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia arquivos estáticos públicos
COPY --from=builder /app/public ./public

# Configura permissões de cache do Next.js
RUN mkdir .next && chown nextjs:nodejs .next

# Copia os artefatos standalone gerados pelo Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health check nativo para Traefik / Coolify
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
