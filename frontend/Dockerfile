FROM node:22-bookworm-slim AS deps

WORKDIR /app/frontend

ENV NEXT_TELEMETRY_DISABLED=1

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci


FROM deps AS build

COPY frontend ./
RUN mkdir -p public
RUN npm run build


FROM node:22-bookworm-slim AS dev

WORKDIR /app/frontend

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend ./

RUN groupadd --system appgroup \
    && useradd --system --gid appgroup --home-dir /home/appuser --create-home appuser \
    && chown -R appuser:appgroup /app/frontend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

USER appuser

CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]


FROM node:22-bookworm-slim AS prod

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./frontend/.next/static
COPY --from=build /app/frontend/public ./frontend/public

RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn* \
    && groupadd --system appgroup \
    && useradd --system --gid appgroup --home-dir /home/appuser --create-home appuser \
    && chown -R appuser:appgroup /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

USER appuser

CMD ["node", "server.js"]
