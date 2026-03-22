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


FROM gcr.io/distroless/nodejs22-debian12:nonroot AS prod

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build --chown=nonroot:nonroot /app/frontend/.next/standalone ./
COPY --from=build --chown=nonroot:nonroot /app/frontend/.next/static ./.next/static
COPY --from=build --chown=nonroot:nonroot /app/frontend/public ./public

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

USER nonroot:nonroot

CMD ["server.js"]
