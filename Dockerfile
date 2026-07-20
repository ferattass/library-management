# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:24-alpine AS base
WORKDIR /app
# Prisma engine'leri Alpine üzerinde OpenSSL'e ihtiyaç duyar.
RUN apk add --no-cache openssl

# ---------- dependencies ----------
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# ---------- development ----------
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

# ---------- production ----------
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
