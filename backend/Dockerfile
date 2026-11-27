# MediCore Production Backend Dockerfile (Multi-Stage)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json tsconfig.json ./
COPY prisma ./prisma/
RUN npm install

COPY src ./src/
COPY data ./data/
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S medicore && adduser -S medicore -G medicore

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/data ./data

USER medicore
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health/live || exit 1

CMD ["node", "dist/server.js"]
