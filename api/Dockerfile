# Ehitatakse repo juurest, sest sama image serveerib nii API-t kui
# desktop-liidest (`mobile/` build). Vt deploy/docker-compose.*.yml.

# --- Desktop-liides ---------------------------------------------------
FROM node:22-alpine AS web
WORKDIR /web
COPY mobile/package.json mobile/package-lock.json* ./
RUN npm install
COPY mobile/ ./
# Brauserist avatuna käib API sama päritolu alt, seega suhteline tee.
# Repos olev .env.production sisaldab natiivse äpi absoluutset aadressi ja
# see kirjutatakse siin üle — kumb Vite'i puhul võidaks, .env-fail või
# keskkonnamuutuja, ei ole ilmne, ja arvamise peale seda jätta ei tohi.
RUN printf 'VITE_API_BASE_URL="/api"\n' > .env.production
RUN npm run build

# --- API --------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY api/package.json api/package-lock.json* ./
RUN npm install
COPY api/ ./
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY api/package.json api/package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/assets ./assets
COPY --from=web /web/dist ./web
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/server.js"]
